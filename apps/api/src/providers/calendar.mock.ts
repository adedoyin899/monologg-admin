import { CalendarAuthRevokedError, type CalendarProvider } from "./calendar.interface.js";

// Mock CalendarProvider — for dev and test environments.
// Returns deterministic URLs/events; no real OAuth or Google API calls.
//
// Revocation is simulated via a well-known sentinel refresh token rather than
// any real Google state, so services/calendar.ts's revoke-handling path is
// fully testable in mock mode: pass "mock_revoked_token" as the refreshToken
// to pushAvailability/getBusyTimes/createMeet and they throw CalendarAuthRevokedError.
export const MOCK_REVOKED_REFRESH_TOKEN = "mock_revoked_token";

function assertNotRevoked(refreshToken: string): void {
  if (refreshToken === MOCK_REVOKED_REFRESH_TOKEN) {
    throw new CalendarAuthRevokedError("[calendar.mock] refresh token is revoked (simulated)");
  }
}

export const mockCalendarProvider: CalendarProvider = {
  async connect(state) {
    return {
      authUrl: `https://mock.accounts.google.com/o/oauth2/auth?state=${state}&scope=calendar.events+calendar.freebusy`,
    };
  },

  async completeConnect(code) {
    return {
      refreshToken: `mock_refresh_${code}`,
      scopes: ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.freebusy"],
    };
  },

  async pushAvailability(block, refreshToken) {
    assertNotRevoked(refreshToken);
    return { calendarEventId: `mock_cal_event_${block.id}` };
  },

  async getBusyTimes(date, refreshToken) {
    assertNotRevoked(refreshToken);
    const day = date.toISOString().slice(0, 10);
    // Deterministic fake busy period so tests/dev can assert on a stable shape.
    return [{ start: `${day}T09:00:00.000Z`, end: `${day}T09:30:00.000Z` }];
  },

  async createMeet(bookingId, refreshToken) {
    assertNotRevoked(refreshToken);
    return { meetUrl: `https://meet.google.com/mock-${bookingId.slice(0, 8)}` };
  },
};
