import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { realCalendarProvider } from "./calendar.real.js";
import { CalendarAuthRevokedError } from "./calendar.interface.js";
import { env } from "../config/env.js";

// Unit tests for the actual Google OAuth/Calendar API logic — separate from
// routes/calendar.test.ts and services/calendar.test.ts, which only exercise
// the mock provider (NODE_ENV=test never selects the real one at runtime).
// This file proves the real HTTP logic itself is correct, with global fetch
// stubbed (no real network / no real Google credentials).
describe("realCalendarProvider (Google OAuth + Calendar API)", () => {
  const original = {
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: env.GOOGLE_REDIRECT_URI,
  };

  beforeEach(() => {
    (env as any).GOOGLE_CLIENT_ID = "client-id-123";
    (env as any).GOOGLE_CLIENT_SECRET = "client-secret-abc";
    (env as any).GOOGLE_REDIRECT_URI = "https://api.monologg.dev/api/v1/calendar/callback";
  });

  afterEach(() => {
    Object.assign(env, original);
    vi.unstubAllGlobals();
  });

  describe("connect", () => {
    it("builds a consent URL with minimal scopes, offline access, and the caller's state", async () => {
      const { authUrl } = await realCalendarProvider.connect("state-token-xyz");
      const url = new URL(authUrl);

      expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
      expect(url.searchParams.get("client_id")).toBe("client-id-123");
      expect(url.searchParams.get("redirect_uri")).toBe("https://api.monologg.dev/api/v1/calendar/callback");
      expect(url.searchParams.get("state")).toBe("state-token-xyz");
      expect(url.searchParams.get("access_type")).toBe("offline");
      expect(url.searchParams.get("prompt")).toBe("consent");
      const scopes = url.searchParams.get("scope")!.split(" ");
      expect(scopes).toEqual([
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.freebusy",
      ]);
    });

    it("throws a clear error when Google credentials aren't configured", async () => {
      (env as any).GOOGLE_CLIENT_ID = undefined;
      await expect(realCalendarProvider.connect("state")).rejects.toThrow(/GOOGLE_CLIENT_ID/);
    });
  });

  describe("completeConnect", () => {
    it("exchanges the code for a refresh token + scopes", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ refresh_token: "rt-abc", scope: "cal.events cal.freebusy" }), { status: 200 }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const result = await realCalendarProvider.completeConnect("auth-code-1");

      expect(result).toEqual({ refreshToken: "rt-abc", scopes: ["cal.events", "cal.freebusy"] });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://oauth2.googleapis.com/token");
      expect((init.body as URLSearchParams).get("grant_type")).toBe("authorization_code");
      expect((init.body as URLSearchParams).get("code")).toBe("auth-code-1");
    });

    it("throws if Google doesn't return a refresh_token", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response(JSON.stringify({ access_token: "at-only" }), { status: 200 })),
      );
      await expect(realCalendarProvider.completeConnect("auth-code-1")).rejects.toThrow(/refresh_token/);
    });
  });

  describe("token refresh -> revocation detection", () => {
    it("throws CalendarAuthRevokedError when Google returns invalid_grant", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ error: "invalid_grant", error_description: "Token has been revoked" }), {
            status: 400,
          }),
        ),
      );

      await expect(
        realCalendarProvider.pushAvailability(
          { id: "block-1", date: new Date("2026-08-01"), slots: [{ start: "09:00", end: "10:00", booked: false }] },
          "rt-revoked",
        ),
      ).rejects.toThrow(CalendarAuthRevokedError);
    });

    it("throws a plain error for a non-invalid_grant refresh failure (not treated as revoked)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "server_error" }), { status: 500 })),
      );

      await expect(
        realCalendarProvider.getBusyTimes(new Date("2026-08-01"), "rt-1"),
      ).rejects.toThrow(/Failed to refresh Google access token/);
    });
  });

  describe("pushAvailability", () => {
    function stubTokenThenCalendar(calendarResponse: unknown, calendarStatus = 200) {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "at-1" }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(calendarResponse), { status: calendarStatus }));
      vi.stubGlobal("fetch", fetchMock);
      return fetchMock;
    }

    it("POSTs a new event when the block has no calendarEventId yet", async () => {
      const fetchMock = stubTokenThenCalendar({ id: "gcal-event-1" });

      const result = await realCalendarProvider.pushAvailability(
        {
          id: "block-1",
          date: new Date("2026-08-01"),
          slots: [{ start: "09:00", end: "13:00", booked: false }],
          calendarEventId: null,
        },
        "rt-1",
      );

      expect(result).toEqual({ calendarEventId: "gcal-event-1" });
      const [url, init] = fetchMock.mock.calls[1];
      expect(url).toBe("https://www.googleapis.com/calendar/v3/calendars/primary/events");
      expect(init.method).toBe("POST");
    });

    it("PATCHes the existing event when calendarEventId is already set", async () => {
      const fetchMock = stubTokenThenCalendar({ id: "gcal-event-1" });

      await realCalendarProvider.pushAvailability(
        {
          id: "block-1",
          date: new Date("2026-08-01"),
          slots: [{ start: "09:00", end: "13:00", booked: false }],
          calendarEventId: "gcal-event-1",
        },
        "rt-1",
      );

      const [url, init] = fetchMock.mock.calls[1];
      expect(url).toBe("https://www.googleapis.com/calendar/v3/calendars/primary/events/gcal-event-1");
      expect(init.method).toBe("PATCH");
    });
  });

  describe("getBusyTimes", () => {
    it("queries freeBusy for the given day and returns the primary calendar's busy periods", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "at-1" }), { status: 200 }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ calendars: { primary: { busy: [{ start: "2026-08-01T09:00:00Z", end: "2026-08-01T09:30:00Z" }] } } }),
            { status: 200 },
          ),
        );
      vi.stubGlobal("fetch", fetchMock);

      const busy = await realCalendarProvider.getBusyTimes(new Date("2026-08-01"), "rt-1");

      expect(busy).toEqual([{ start: "2026-08-01T09:00:00Z", end: "2026-08-01T09:30:00Z" }]);
      const [url, init] = fetchMock.mock.calls[1];
      expect(url).toBe("https://www.googleapis.com/calendar/v3/freeBusy");
      const body = JSON.parse(init.body as string);
      expect(body.items).toEqual([{ id: "primary" }]);
    });

    it("returns an empty array when Google reports no busy periods", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "at-1" }), { status: 200 }))
          .mockResolvedValueOnce(new Response(JSON.stringify({ calendars: { primary: { busy: [] } } }), { status: 200 })),
      );

      const busy = await realCalendarProvider.getBusyTimes(new Date("2026-08-01"), "rt-1");
      expect(busy).toEqual([]);
    });
  });

  describe("createMeet", () => {
    it("creates an event with conferenceData and returns the video entry point's URI", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "at-1" }), { status: 200 }))
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify({
                hangoutLink: "https://meet.google.com/fallback-link",
                conferenceData: {
                  entryPoints: [{ entryPointType: "video", uri: "https://meet.google.com/abc-defg-hij" }],
                },
              }),
              { status: 200 },
            ),
          ),
      );

      const { meetUrl } = await realCalendarProvider.createMeet("booking-1", "rt-1");
      expect(meetUrl).toBe("https://meet.google.com/abc-defg-hij");
    });

    it("falls back to hangoutLink when no video entry point is present", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "at-1" }), { status: 200 }))
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ hangoutLink: "https://meet.google.com/fallback-link" }), { status: 200 }),
          ),
      );

      const { meetUrl } = await realCalendarProvider.createMeet("booking-1", "rt-1");
      expect(meetUrl).toBe("https://meet.google.com/fallback-link");
    });

    it("throws if Google returns neither a video entry point nor a hangoutLink", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "at-1" }), { status: 200 }))
          .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 })),
      );

      await expect(realCalendarProvider.createMeet("booking-1", "rt-1")).rejects.toThrow(/did not return a Meet link/);
    });
  });
});
