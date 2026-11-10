// CalendarProvider — interface for Google Calendar sync and Meet link generation.
// Real implementation: Phase 8 (Google OAuth 2.0, Calendar API, Meet API).
// Mock: deterministic URLs, no real network calls.
//
// This is the provider layer only — a thin, stateless wrapper around Google's
// APIs. It never touches the database or encryption; services/calendar.ts owns
// CalendarConnection rows and the encrypt/decrypt boundary. The rich, server-
// authoritative availability UX (getOpenSlots, slot-level UI) is Phase 13 —
// this phase only has to make the provider real and degrade gracefully.

export interface AvailabilityBlock {
  id: string;
  date: Date;
  /** JSON array of time slots: [{start: "09:00", end: "10:00", booked: false}, ...] */
  slots: Array<{ start: string; end: string; booked: boolean }>;
  calendarEventId?: string | null;
}

export interface BusyPeriod {
  /** ISO 8601 datetime. */
  start: string;
  /** ISO 8601 datetime. */
  end: string;
}

/**
 * Thrown by pushAvailability/getBusyTimes/createMeet when the stored refresh
 * token no longer works — either Google-side revocation, or (for the mock
 * provider, to make this testable without real Google state) the well-known
 * sentinel refresh token "mock_revoked_token". Callers (services/calendar.ts)
 * catch this to flip the CalendarConnection to REVOKED and surface a
 * reconnect prompt, rather than letting a raw provider error propagate.
 */
export class CalendarAuthRevokedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarAuthRevokedError";
  }
}

export interface CalendarProvider {
  /**
   * Generate a Google OAuth 2.0 consent URL. `state` is an opaque, single-use
   * token the caller has already minted and mapped to a userId (never the raw
   * userId itself — that would let anyone complete another user's OAuth flow
   * by guessing/observing their id in the callback URL).
   */
  connect(state: string): Promise<{ authUrl: string }>;

  /**
   * Exchange the authorization code Google's callback redirect carried for a
   * refresh token. The caller (services/calendar.ts) encrypts the result
   * before it ever touches the database.
   */
  completeConnect(code: string): Promise<{ refreshToken: string; scopes: string[] }>;

  /**
   * Push an availability block to the user's Google Calendar.
   * Creates/updates a calendar event and writes back `calendarEventId`.
   * One-way (Monologg → Google) at minimum; two-way sync is via getBusyTimes.
   */
  pushAvailability(
    block: AvailabilityBlock,
    refreshToken: string,
  ): Promise<{ calendarEventId: string }>;

  /**
   * Read the user's real Google busy periods for the given day (freebusy
   * query) — this is what makes AvailabilityBlock reflect the real calendar,
   * and what Phase 13's getOpenSlots will call.
   */
  getBusyTimes(date: Date, refreshToken: string): Promise<BusyPeriod[]>;

  /**
   * Create a Google Meet link for a confirmed booking.
   * The URL is stored on Booking.meetUrl and surfaced in the Order Room's call button.
   */
  createMeet(bookingId: string, refreshToken: string): Promise<{ meetUrl: string }>;
}
