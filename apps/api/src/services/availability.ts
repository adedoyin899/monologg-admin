import type { Prisma } from "@prisma/client";
import { prisma } from "../db/client.js";
import { getGoogleBusyTimes, CalendarNotConnectedError, CalendarReconnectRequiredError } from "./calendar.js";

// Rich availability & slot-resolution service (features.md Phase 13, FA-1).
// getOpenSlots is THE server-authoritative source of truth for what's
// bookable — the client never computes availability itself, it only renders
// what this returns. bookSlot is the only place a slot is ever marked
// "booked", and it does so inside a Postgres advisory-locked transaction so
// two concurrent bookings for the same day can never both succeed.

export type SlotState = "free" | "unavailable" | "booked";

export interface Slot {
  start: string; // "HH:MM", 24h
  end: string;
  state: SlotState;
  bookingId?: string;
}

export interface OpenInterval {
  start: string;
  end: string;
}

type PrismaOrTx = typeof prisma | Prisma.TransactionClient;

export class SlotUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SlotUnavailableError";
  }
}

const DAY_START_MIN = 0; // 00:00
const DAY_END_MIN = 23 * 60 + 59; // 23:59 — a whole day free

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Normalizes any Date to that calendar day's UTC midnight — the only way
 * AvailabilityBlock.date is ever stored/queried, so "the same day" always
 * compares by exact Date equality. */
export function startOfDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function subtractInterval(
  base: { start: number; end: number }[],
  remove: { start: number; end: number },
): { start: number; end: number }[] {
  const result: { start: number; end: number }[] = [];
  for (const b of base) {
    if (remove.end <= b.start || remove.start >= b.end) {
      result.push(b);
      continue;
    }
    if (remove.start > b.start) result.push({ start: b.start, end: Math.min(remove.start, b.end) });
    if (remove.end < b.end) result.push({ start: Math.max(remove.end, b.start), end: b.end });
  }
  return result.filter((r) => r.end > r.start);
}

const WEEKDAY_TOKENS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

function recurRuleAppliesToDay(recurRule: string | null, day: Date): boolean {
  if (!recurRule) return false;
  if (recurRule === "WEEKDAYS") {
    const dow = day.getUTCDay();
    return dow >= 1 && dow <= 5;
  }
  const weeklyMatch = /^WEEKLY:([A-Z]{3})$/.exec(recurRule);
  if (weeklyMatch) return WEEKDAY_TOKENS[day.getUTCDay()] === weeklyMatch[1];
  return false;
}

/** features.md Phase 16 (FA-5, X5): abandoned external checkouts (PENDING_PAYMENT,
 * slotHoldExpiresAt in the past — only ever set for PUBLIC_LINK bookings) no longer
 * block their slot. There's no cron/job-scheduler in this codebase for "expire this
 * row later" (BullMQ is only wired for notification delivery), so this is lazy: run
 * right here, the one place that already re-verifies availability server-side,
 * rather than adding new scheduling infrastructure. Best-effort — same "never block
 * the read" idiom as getGoogleBusyTimes below: a plain GET open-slots call passes
 * tx=prisma (no lock), while bookSlot's advisory-locked transaction gets a fully
 * race-safe re-verification for free. */
async function releaseExpiredHolds(tx: PrismaOrTx, slots: Slot[]): Promise<Slot[]> {
  const bookingIds = slots
    .filter((s): s is Slot & { bookingId: string } => s.state === "booked" && !!s.bookingId)
    .map((s) => s.bookingId);
  if (bookingIds.length === 0) return slots;

  const bookings = await tx.booking.findMany({
    where: { id: { in: bookingIds } },
    select: { id: true, state: true, slotHoldExpiresAt: true },
  });
  const now = new Date();
  const expiredIds = bookings
    .filter((b) => b.state === "PENDING_PAYMENT" && b.slotHoldExpiresAt && b.slotHoldExpiresAt < now)
    .map((b) => b.id);
  if (expiredIds.length === 0) return slots;

  await tx.booking.updateMany({
    where: { id: { in: expiredIds }, state: "PENDING_PAYMENT" },
    data: { state: "CANCELLED" },
  });

  const expired = new Set(expiredIds);
  return slots.filter((s) => !(s.state === "booked" && s.bookingId && expired.has(s.bookingId)));
}

/** Resolves which slots (if any) apply to `day`: an exact-date override block
 * always wins; otherwise the first matching recurring template; otherwise
 * none (an unconfigured day — the default-free rule handles the rest). */
async function resolveDaySlots(tx: PrismaOrTx, creatorId: string, day: Date): Promise<Slot[]> {
  const override = await tx.availabilityBlock.findFirst({
    where: { creatorId, date: day, isRecurring: false },
  });
  if (override) return releaseExpiredHolds(tx, (override.slots as unknown as Slot[]) ?? []);

  const recurring = await tx.availabilityBlock.findMany({
    where: { creatorId, isRecurring: true },
  });
  const applicable = recurring.find((block) => recurRuleAppliesToDay(block.recurRule, day));
  return releaseExpiredHolds(tx, applicable ? ((applicable.slots as unknown as Slot[]) ?? []) : []);
}

/**
 * getOpenSlots(creatorId, date) — features.md Phase 13's slot-resolution
 * formula: whole-day-free → minus explicit unavailable → minus booked →
 * minus Google busy (best-effort; a disconnected/revoked calendar degrades
 * to "no busy times", never an error) → the remainder.
 */
export async function getOpenSlots(
  creatorId: string,
  date: Date,
  opts: { tx?: PrismaOrTx } = {},
): Promise<OpenInterval[]> {
  const tx = opts.tx ?? prisma;
  const day = startOfDayUTC(date);

  const slots = await resolveDaySlots(tx, creatorId, day);

  let free: { start: number; end: number }[] = [{ start: DAY_START_MIN, end: DAY_END_MIN }];
  for (const slot of slots) {
    if (slot.state === "unavailable" || slot.state === "booked") {
      free = subtractInterval(free, { start: toMinutes(slot.start), end: toMinutes(slot.end) });
    }
  }

  const creator = await tx.creator.findUnique({ where: { id: creatorId }, select: { userId: true } });
  if (creator) {
    try {
      const busyPeriods = await getGoogleBusyTimes(creator.userId, day);
      for (const period of busyPeriods) {
        const start = new Date(period.start);
        const end = new Date(period.end);
        // Clip to this calendar day — a busy period straddling midnight only
        // blocks the portion that actually falls on `day`.
        const dayEnd = new Date(day.getTime() + 24 * 60 * 60 * 1000);
        const clippedStart = start < day ? day : start;
        const clippedEnd = end > dayEnd ? dayEnd : end;
        if (clippedEnd <= clippedStart) continue;
        const startMin = Math.round((clippedStart.getTime() - day.getTime()) / 60000);
        const endMin = Math.round((clippedEnd.getTime() - day.getTime()) / 60000);
        free = subtractInterval(free, { start: startMin, end: endMin });
      }
    } catch (err) {
      if (!(err instanceof CalendarNotConnectedError) && !(err instanceof CalendarReconnectRequiredError)) {
        throw err;
      }
      // No connection / revoked — degrade gracefully, no busy times to subtract.
    }
  }

  return free.map((f) => ({ start: toTimeStr(f.start), end: toTimeStr(f.end) }));
}

function intervalContains(open: OpenInterval, start: string, end: string): boolean {
  return toMinutes(open.start) <= toMinutes(start) && toMinutes(open.end) >= toMinutes(end);
}

/**
 * Books [slotStart, slotEnd) on `date` for `bookingId`, inside a caller-owned
 * transaction. Race-safe: takes a Postgres advisory transaction lock keyed on
 * (creatorId, day) BEFORE re-checking open slots, so two concurrent callers
 * for the same creator+day are fully serialized — the second one re-reads
 * the first one's write and correctly sees the slot as taken.
 *
 * Throws SlotUnavailableError if the requested range isn't fully contained
 * in an open interval (server-authority guardrail: the client's claim is
 * always re-verified here, never trusted).
 */
export async function bookSlot(
  tx: Prisma.TransactionClient,
  params: { creatorId: string; date: Date; slotStart: string; slotEnd: string; bookingId: string },
): Promise<void> {
  const { creatorId, slotStart, slotEnd, bookingId } = params;
  const day = startOfDayUTC(params.date);

  // Advisory lock scoped to this creator+day, released automatically at
  // transaction end — serializes concurrent booking attempts for the same day.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${creatorId} || ${day.toISOString()}))`;

  const openSlots = await getOpenSlots(creatorId, day, { tx });
  const fits = openSlots.some((open) => intervalContains(open, slotStart, slotEnd));
  if (!fits) {
    throw new SlotUnavailableError(
      `Slot ${slotStart}-${slotEnd} on ${day.toISOString().slice(0, 10)} for creator "${creatorId}" is not available`,
    );
  }

  const newSlot: Slot = { start: slotStart, end: slotEnd, state: "booked", bookingId };
  const existing = await tx.availabilityBlock.findFirst({ where: { creatorId, date: day, isRecurring: false } });
  if (existing) {
    const slots = [...((existing.slots as unknown as Slot[]) ?? []), newSlot];
    await tx.availabilityBlock.update({ where: { id: existing.id }, data: { slots: slots as unknown as Prisma.InputJsonValue } });
  } else {
    await tx.availabilityBlock.create({
      data: { creatorId, date: day, slots: [newSlot] as unknown as Prisma.InputJsonValue },
    });
  }
}
