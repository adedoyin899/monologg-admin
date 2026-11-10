import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/client.js", () => ({
  prisma: {
    creator: { findUnique: vi.fn() },
    availabilityBlock: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    // features.md Phase 16 (FA-5): releaseExpiredHolds looks up the bookings behind
    // any "booked" slot to lazily expire abandoned PENDING_PAYMENT holds.
    booking: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    $executeRaw: vi.fn(),
  },
}));

vi.mock("./calendar.js", async () => {
  const actual = await vi.importActual<typeof import("./calendar.js")>("./calendar.js");
  return {
    ...actual,
    getGoogleBusyTimes: vi.fn(),
  };
});

import { prisma } from "../db/client.js";
import { getGoogleBusyTimes, CalendarNotConnectedError, CalendarReconnectRequiredError } from "./calendar.js";
import { getOpenSlots, bookSlot, SlotUnavailableError } from "./availability.js";

const prismaMock = prisma as any;
const getGoogleBusyTimesMock = getGoogleBusyTimes as any;

const DAY = new Date("2026-08-05T00:00:00.000Z");

describe("Availability service — getOpenSlots (features.md Phase 13, FA-1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.creator.findUnique.mockResolvedValue(null); // no calendar connection by default
    getGoogleBusyTimesMock.mockRejectedValue(new CalendarNotConnectedError("not connected"));
    // No expired holds by default — individual tests override this to exercise
    // releaseExpiredHolds (features.md Phase 16, FA-5, X5).
    prismaMock.booking.findMany.mockResolvedValue([]);
  });

  it("default-free rule: an unconfigured day (no block at all) is free across normal hours", async () => {
    prismaMock.availabilityBlock.findFirst.mockResolvedValue(null);
    prismaMock.availabilityBlock.findMany.mockResolvedValue([]);

    const open = await getOpenSlots("creator-1", DAY);

    expect(open).toEqual([{ start: "00:00", end: "23:59" }]);
  });

  it("evening-unavailable day: only the evening is blocked, morning stays free", async () => {
    prismaMock.availabilityBlock.findFirst.mockResolvedValue({
      slots: [
        { start: "09:00", end: "13:00", state: "free" },
        { start: "18:00", end: "22:00", state: "unavailable" },
      ],
    });

    const open = await getOpenSlots("creator-1", DAY);

    expect(open).toEqual([
      { start: "00:00", end: "18:00" },
      { start: "22:00", end: "23:59" },
    ]);
  });

  it("a booked slot is excluded from the open intervals", async () => {
    prismaMock.availabilityBlock.findFirst.mockResolvedValue({
      slots: [{ start: "10:00", end: "11:00", state: "booked", bookingId: "booking-1" }],
    });

    const open = await getOpenSlots("creator-1", DAY);

    expect(open).toEqual([
      { start: "00:00", end: "10:00" },
      { start: "11:00", end: "23:59" },
    ]);
  });

  // features.md Phase 16 (FA-5, X5): abandoned external checkouts release their
  // slot hold — lazily, right here in getOpenSlots (no cron/job-scheduler exists
  // for "expire this row later" in this codebase).
  it("an expired PENDING_PAYMENT hold (slotHoldExpiresAt in the past) is treated as free again", async () => {
    prismaMock.availabilityBlock.findFirst.mockResolvedValue({
      slots: [{ start: "10:00", end: "11:00", state: "booked", bookingId: "booking-expired" }],
    });
    prismaMock.booking.findMany.mockResolvedValue([
      { id: "booking-expired", state: "PENDING_PAYMENT", slotHoldExpiresAt: new Date(Date.now() - 60_000) },
    ]);

    const open = await getOpenSlots("creator-1", DAY);

    expect(open).toEqual([{ start: "00:00", end: "23:59" }]);
    expect(prismaMock.booking.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["booking-expired"] }, state: "PENDING_PAYMENT" },
      data: { state: "CANCELLED" },
    });
  });

  it("a not-yet-expired PENDING_PAYMENT hold still blocks the slot", async () => {
    prismaMock.availabilityBlock.findFirst.mockResolvedValue({
      slots: [{ start: "10:00", end: "11:00", state: "booked", bookingId: "booking-fresh" }],
    });
    prismaMock.booking.findMany.mockResolvedValue([
      { id: "booking-fresh", state: "PENDING_PAYMENT", slotHoldExpiresAt: new Date(Date.now() + 30 * 60_000) },
    ]);

    const open = await getOpenSlots("creator-1", DAY);

    expect(open).toEqual([
      { start: "00:00", end: "10:00" },
      { start: "11:00", end: "23:59" },
    ]);
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
  });

  it("an internal booking (slotHoldExpiresAt: null) is never auto-expired, however old", async () => {
    prismaMock.availabilityBlock.findFirst.mockResolvedValue({
      slots: [{ start: "10:00", end: "11:00", state: "booked", bookingId: "booking-internal" }],
    });
    prismaMock.booking.findMany.mockResolvedValue([
      { id: "booking-internal", state: "PENDING_PAYMENT", slotHoldExpiresAt: null },
    ]);

    const open = await getOpenSlots("creator-1", DAY);

    expect(open).toEqual([
      { start: "00:00", end: "10:00" },
      { start: "11:00", end: "23:59" },
    ]);
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
  });

  it("a booking already past PENDING_PAYMENT (e.g. ESCROW_LOCKED) is never touched even if slotHoldExpiresAt is in the past", async () => {
    prismaMock.availabilityBlock.findFirst.mockResolvedValue({
      slots: [{ start: "10:00", end: "11:00", state: "booked", bookingId: "booking-locked" }],
    });
    prismaMock.booking.findMany.mockResolvedValue([
      { id: "booking-locked", state: "ESCROW_LOCKED", slotHoldExpiresAt: new Date(Date.now() - 60_000) },
    ]);

    const open = await getOpenSlots("creator-1", DAY);

    expect(open).toEqual([
      { start: "00:00", end: "10:00" },
      { start: "11:00", end: "23:59" },
    ]);
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
  });

  it("recurring rule applies per matching weekday when no exact-date override exists", async () => {
    // 2026-08-05 is a Wednesday — falls inside "WEEKDAYS".
    prismaMock.availabilityBlock.findFirst.mockResolvedValue(null);
    prismaMock.availabilityBlock.findMany.mockResolvedValue([
      { recurRule: "WEEKDAYS", slots: [{ start: "12:00", end: "13:00", state: "unavailable" }] },
    ]);

    const open = await getOpenSlots("creator-1", DAY);

    expect(open).toEqual([
      { start: "00:00", end: "12:00" },
      { start: "13:00", end: "23:59" },
    ]);
  });

  it("a recurring rule that doesn't match this weekday has no effect", async () => {
    // "WEEKLY:MON" never matches a Wednesday.
    prismaMock.availabilityBlock.findFirst.mockResolvedValue(null);
    prismaMock.availabilityBlock.findMany.mockResolvedValue([
      { recurRule: "WEEKLY:MON", slots: [{ start: "12:00", end: "13:00", state: "unavailable" }] },
    ]);

    const open = await getOpenSlots("creator-1", DAY);

    expect(open).toEqual([{ start: "00:00", end: "23:59" }]);
  });

  it("an exact-date override always wins over a recurring template", async () => {
    prismaMock.availabilityBlock.findFirst.mockResolvedValue({
      slots: [{ start: "08:00", end: "09:00", state: "unavailable" }],
    });
    prismaMock.availabilityBlock.findMany.mockResolvedValue([
      { recurRule: "WEEKDAYS", slots: [{ start: "12:00", end: "13:00", state: "unavailable" }] },
    ]);

    const open = await getOpenSlots("creator-1", DAY);

    // Only the override's 08:00-09:00 is subtracted — the recurring template's
    // 12:00-13:00 never applies once an exact-date row exists for this day.
    expect(open).toEqual([
      { start: "00:00", end: "08:00" },
      { start: "09:00", end: "23:59" },
    ]);
  });

  it("subtracts real Google busy times when the creator has a connected calendar", async () => {
    prismaMock.availabilityBlock.findFirst.mockResolvedValue(null);
    prismaMock.availabilityBlock.findMany.mockResolvedValue([]);
    prismaMock.creator.findUnique.mockResolvedValue({ userId: "user-1" });
    getGoogleBusyTimesMock.mockResolvedValue([
      { start: "2026-08-05T09:00:00.000Z", end: "2026-08-05T09:30:00.000Z" },
    ]);

    const open = await getOpenSlots("creator-1", DAY);

    expect(open).toEqual([
      { start: "00:00", end: "09:00" },
      { start: "09:30", end: "23:59" },
    ]);
  });

  it("degrades gracefully (no subtraction) when the calendar isn't connected", async () => {
    prismaMock.availabilityBlock.findFirst.mockResolvedValue(null);
    prismaMock.availabilityBlock.findMany.mockResolvedValue([]);
    prismaMock.creator.findUnique.mockResolvedValue({ userId: "user-1" });
    getGoogleBusyTimesMock.mockRejectedValue(new CalendarNotConnectedError("not connected"));

    const open = await getOpenSlots("creator-1", DAY);

    expect(open).toEqual([{ start: "00:00", end: "23:59" }]);
  });

  it("degrades gracefully when the connection was revoked", async () => {
    prismaMock.availabilityBlock.findFirst.mockResolvedValue(null);
    prismaMock.availabilityBlock.findMany.mockResolvedValue([]);
    prismaMock.creator.findUnique.mockResolvedValue({ userId: "user-1" });
    getGoogleBusyTimesMock.mockRejectedValue(new CalendarReconnectRequiredError("revoked"));

    const open = await getOpenSlots("creator-1", DAY);

    expect(open).toEqual([{ start: "00:00", end: "23:59" }]);
  });

  it("propagates an unexpected error instead of silently swallowing it", async () => {
    prismaMock.availabilityBlock.findFirst.mockResolvedValue(null);
    prismaMock.availabilityBlock.findMany.mockResolvedValue([]);
    prismaMock.creator.findUnique.mockResolvedValue({ userId: "user-1" });
    getGoogleBusyTimesMock.mockRejectedValue(new Error("boom"));

    await expect(getOpenSlots("creator-1", DAY)).rejects.toThrow("boom");
  });
});

// ---------------------------------------------------------------------------
// bookSlot — race safety and server authority.
//
// A stateful, in-memory fake `tx` stands in for a real Postgres transaction
// client here: this is a unit-level proof that bookSlot's own logic (re-check
// then write) correctly rejects a second claim on an already-booked slot when
// its writes are read back — the same "no live-DB CI gate" tradeoff this
// codebase already makes elsewhere (see routes/talent.ts's own comment on
// this). The actual pg_advisory_xact_lock serialization under real concurrent
// connections is a Postgres guarantee, not application logic, and is exactly
// why bookSlot re-reads getOpenSlots AFTER taking the lock rather than trusting
// a value read before it.
// ---------------------------------------------------------------------------
function makeStatefulTx() {
  const rows: Array<{ id: string; creatorId: string; date: Date; slots: unknown[]; isRecurring: boolean }> = [];
  let nextId = 1;

  return {
    $executeRaw: vi.fn().mockResolvedValue(undefined),
    creator: { findUnique: vi.fn().mockResolvedValue(null) },
    availabilityBlock: {
      findFirst: vi.fn(async ({ where }: any) => {
        return (
          rows.find(
            (r) =>
              r.creatorId === where.creatorId &&
              r.date.getTime() === where.date.getTime() &&
              r.isRecurring === where.isRecurring,
          ) ?? null
        );
      }),
      findMany: vi.fn(async ({ where }: any) =>
        rows.filter((r) => r.creatorId === where.creatorId && r.isRecurring === where.isRecurring),
      ),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `row-${nextId++}`, ...data, isRecurring: data.isRecurring ?? false };
        rows.push(row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const row = rows.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return row;
      }),
    },
    // features.md Phase 16 (FA-5): no bookings registered in this in-memory tx, so
    // releaseExpiredHolds always finds nothing to expire — matches prior behavior
    // for every test that doesn't opt into a PENDING_PAYMENT hold.
    booking: {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

describe("Availability service — bookSlot (race safety + server authority)", () => {
  it("books an open slot, marking it as booked with the given bookingId", async () => {
    const tx = makeStatefulTx();
    await bookSlot(tx as any, { creatorId: "creator-1", date: DAY, slotStart: "10:00", slotEnd: "11:00", bookingId: "booking-1" });

    const open = await getOpenSlots("creator-1", DAY, { tx: tx as any });
    expect(open).toEqual([
      { start: "00:00", end: "10:00" },
      { start: "11:00", end: "23:59" },
    ]);
  });

  it("double-booking race: the second claim on the same slot is rejected once the first has committed", async () => {
    const tx = makeStatefulTx();

    await bookSlot(tx as any, { creatorId: "creator-1", date: DAY, slotStart: "10:00", slotEnd: "11:00", bookingId: "booking-1" });

    await expect(
      bookSlot(tx as any, { creatorId: "creator-1", date: DAY, slotStart: "10:00", slotEnd: "11:00", bookingId: "booking-2" }),
    ).rejects.toThrow(SlotUnavailableError);

    // The slot stays excluded — only ever booked once.
    const open = await getOpenSlots("creator-1", DAY, { tx: tx as any });
    expect(open).toEqual([
      { start: "00:00", end: "10:00" },
      { start: "11:00", end: "23:59" },
    ]);
  });

  it("takes the advisory lock before re-checking availability (server-authority ordering)", async () => {
    const tx = makeStatefulTx();
    await bookSlot(tx as any, { creatorId: "creator-1", date: DAY, slotStart: "10:00", slotEnd: "11:00", bookingId: "booking-1" });

    expect(tx.$executeRaw).toHaveBeenCalled();
  });

  it("server authority: rejects a client-claimed slot that overlaps an unavailable range, even though the caller asked for it", async () => {
    const tx = makeStatefulTx();
    // Seed an explicit unavailable evening the client "didn't know about".
    await tx.availabilityBlock.create({
      data: { creatorId: "creator-1", date: DAY, slots: [{ start: "18:00", end: "22:00", state: "unavailable" }], isRecurring: false },
    });

    await expect(
      bookSlot(tx as any, { creatorId: "creator-1", date: DAY, slotStart: "19:00", slotEnd: "20:00", bookingId: "booking-1" }),
    ).rejects.toThrow(SlotUnavailableError);
  });

  it("rejects a range that only partially fits an open interval", async () => {
    const tx = makeStatefulTx();
    await tx.availabilityBlock.create({
      data: { creatorId: "creator-1", date: DAY, slots: [{ start: "12:00", end: "23:59", state: "unavailable" }], isRecurring: false },
    });

    await expect(
      bookSlot(tx as any, { creatorId: "creator-1", date: DAY, slotStart: "11:00", slotEnd: "13:00", bookingId: "booking-1" }),
    ).rejects.toThrow(SlotUnavailableError);
  });
});
