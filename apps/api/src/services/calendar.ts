import { randomUUID } from "node:crypto";
import type { AvailabilityBlock as ProviderAvailabilityBlock } from "../providers/calendar.interface.js";
import { CalendarAuthRevokedError } from "../providers/calendar.interface.js";
import { prisma } from "../db/client.js";
import { calendarProvider, notifyProvider } from "../providers/index.js";
import { cacheProvider } from "../providers/cache.js";
import { encrypt, decrypt } from "../lib/encryption.js";

// Google Calendar sync service (features.md Phase 8). Owns the boundary the
// provider layer deliberately doesn't touch: CalendarConnection rows and the
// encrypt/decrypt of refresh tokens. Nothing outside this file should read or
// write CalendarConnection.encryptedRefreshToken directly.
//
// This is the provider layer, not the rich availability UX (that's Phase 13) —
// pushAvailabilityToGoogle/getGoogleBusyTimes exist so Phase 13's
// getOpenSlots has a real thing to call; no slot-merging UI logic lives here.

const OAUTH_STATE_CACHE_PREFIX = "calendar:oauth:";
const OAUTH_STATE_TTL_SECONDS = 10 * 60;

export class CalendarNotConnectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarNotConnectedError";
  }
}

/** Surfaced when a previously-working connection just failed with Google-side
 * revocation — the graceful-degradation path the Phase 8 acceptance criteria
 * asks for ("revoking access degrades gracefully with a reconnect prompt"). */
export class CalendarReconnectRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarReconnectRequiredError";
  }
}

export class InvalidOAuthStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidOAuthStateError";
  }
}

// ── Connect flow ─────────────────────────────────────────────────────────────

/** GET/POST /calendar/connect. `state` is a random, single-use, short-lived
 * token mapped to the caller's userId in cache — never the raw userId itself,
 * which a browser query string can't be trusted to keep confidential/unforged. */
export async function startGoogleConnect(userId: string): Promise<{ authUrl: string }> {
  const state = randomUUID();
  await cacheProvider.set(`${OAUTH_STATE_CACHE_PREFIX}${state}`, userId, OAUTH_STATE_TTL_SECONDS);
  return calendarProvider.connect(state);
}

/** GET /calendar/callback — Google redirects the browser here with `code` +
 * `state`. Stores the refresh token encrypted; never logs it (callers must not
 * log the raw `code` or the resolved token either). */
export async function completeGoogleConnect(state: string, code: string): Promise<{ userId: string }> {
  const userId = await cacheProvider.get(`${OAUTH_STATE_CACHE_PREFIX}${state}`);
  if (!userId) {
    throw new InvalidOAuthStateError("OAuth state is invalid, expired, or already used");
  }
  await cacheProvider.del(`${OAUTH_STATE_CACHE_PREFIX}${state}`);

  const { refreshToken, scopes } = await calendarProvider.completeConnect(code);
  const encryptedRefreshToken = encrypt(refreshToken);

  await prisma.calendarConnection.upsert({
    where: { userId },
    create: { userId, provider: "google", encryptedRefreshToken, scopes, status: "CONNECTED" },
    update: { encryptedRefreshToken, scopes, status: "CONNECTED", revokedAt: null, connectedAt: new Date() },
  });

  return { userId };
}

/** User-initiated disconnect — distinct from markRevoked() below (system-
 * detected revocation): no notification needed, the user already knows. */
export async function disconnectGoogleCalendar(userId: string): Promise<void> {
  await prisma.calendarConnection.updateMany({
    where: { userId },
    data: { status: "REVOKED", revokedAt: new Date() },
  });
}

export async function getCalendarConnectionStatus(userId: string) {
  const connection = await prisma.calendarConnection.findUnique({ where: { userId } });
  if (!connection) return { connected: false as const };
  return {
    connected: connection.status === "CONNECTED",
    status: connection.status,
    connectedAt: connection.connectedAt,
    revokedAt: connection.revokedAt,
  };
}

// ── Internal: resolve a usable, decrypted refresh token ─────────────────────

async function getDecryptedRefreshToken(userId: string): Promise<string> {
  const connection = await prisma.calendarConnection.findUnique({ where: { userId } });
  if (!connection || connection.status !== "CONNECTED") {
    throw new CalendarNotConnectedError(`User "${userId}" has no active Google Calendar connection`);
  }
  return decrypt(connection.encryptedRefreshToken);
}

async function markRevoked(userId: string): Promise<void> {
  await prisma.calendarConnection.updateMany({
    where: { userId },
    data: { status: "REVOKED", revokedAt: new Date() },
  });
  await notifyProvider.inApp(userId, { kind: "calendar_disconnected", reason: "revoked" }).catch(() => {});
}

// ── Availability push + busy times (Phase 13 will call getGoogleBusyTimes) ──

export async function pushAvailabilityToGoogle(userId: string, availabilityBlockId: string) {
  const refreshToken = await getDecryptedRefreshToken(userId);
  const block = await prisma.availabilityBlock.findUniqueOrThrow({ where: { id: availabilityBlockId } });

  try {
    const { calendarEventId } = await calendarProvider.pushAvailability(
      {
        id: block.id,
        date: block.date,
        slots: block.slots as ProviderAvailabilityBlock["slots"],
        calendarEventId: block.calendarEventId,
      },
      refreshToken,
    );
    await prisma.availabilityBlock.update({ where: { id: block.id }, data: { calendarEventId } });
    return { calendarEventId };
  } catch (err) {
    if (err instanceof CalendarAuthRevokedError) {
      await markRevoked(userId);
      throw new CalendarReconnectRequiredError(
        `Google Calendar access was revoked for user "${userId}" — reconnect required`,
      );
    }
    throw err;
  }
}

export async function getGoogleBusyTimes(userId: string, date: Date) {
  const refreshToken = await getDecryptedRefreshToken(userId);
  try {
    return await calendarProvider.getBusyTimes(date, refreshToken);
  } catch (err) {
    if (err instanceof CalendarAuthRevokedError) {
      await markRevoked(userId);
      throw new CalendarReconnectRequiredError(
        `Google Calendar access was revoked for user "${userId}" — reconnect required`,
      );
    }
    throw err;
  }
}

// ── Meet link generation ─────────────────────────────────────────────────────

/** Best-effort — called from the payment webhook once escrow locks (see
 * services/payment.ts). A missing or revoked calendar connection is NOT a
 * booking failure: the booking proceeds with no meetUrl, exactly like the
 * revoke-degrades-gracefully acceptance criterion asks for. */
export async function createMeetForBooking(bookingId: string): Promise<{ meetUrl: string } | null> {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { creator: true },
  });

  let refreshToken: string;
  try {
    refreshToken = await getDecryptedRefreshToken(booking.creator.userId);
  } catch (err) {
    if (err instanceof CalendarNotConnectedError) return null;
    throw err;
  }

  try {
    const { meetUrl } = await calendarProvider.createMeet(bookingId, refreshToken);
    await prisma.booking.update({ where: { id: bookingId }, data: { meetUrl } });
    return { meetUrl };
  } catch (err) {
    if (err instanceof CalendarAuthRevokedError) {
      await markRevoked(booking.creator.userId);
      return null;
    }
    throw err;
  }
}
