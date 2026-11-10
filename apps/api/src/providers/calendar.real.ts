import { env } from "../config/env.js";
import { CalendarAuthRevokedError, type AvailabilityBlock, type BusyPeriod, type CalendarProvider } from "./calendar.interface.js";

// ---------------------------------------------------------------------------
// REAL CalendarProvider — Google OAuth 2.0 + Calendar API (features.md Phase 8).
// No googleapis SDK dependency — raw fetch against Google's REST endpoints,
// matching this codebase's existing provider style (see payment.real.ts).
//
// Scopes are deliberately minimal (guardrail: "Scopes limited to calendar +
// Meet creation"): calendar.events (create/update events — covers both
// pushAvailability and createMeet) and calendar.freebusy (Google's own
// narrow, read-only scope for freebusy queries — nothing broader is needed).
//
// Access tokens are never cached: every real call exchanges the stored
// refresh token for a fresh access token first. This *is* "handling expiry"
// per the Phase 8 spec — there is no separate access-token-expired state to
// track, since we never hold one longer than a single request.
// ---------------------------------------------------------------------------

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
];

function requireGoogleCredentials(): { clientId: string; clientSecret: string; redirectUri: string } {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw new Error(
      "[calendar.real] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI are not fully " +
        "configured — required when CALENDAR_PROVIDER=google.",
    );
  }
  return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, redirectUri: env.GOOGLE_REDIRECT_URI };
}

/** Exchanges the long-lived refresh token for a short-lived access token.
 * Google returns 400 `invalid_grant` when the refresh token has been revoked
 * (or expired from long inactivity) — that's the one error this provider
 * translates into a typed error services/calendar.ts specifically watches for. */
async function getAccessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = requireGoogleCredentials();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const body = (await response.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!response.ok || !body.access_token) {
    if (body.error === "invalid_grant") {
      throw new CalendarAuthRevokedError(
        `[calendar.real] Google refresh token is no longer valid (${body.error_description ?? "invalid_grant"})`,
      );
    }
    throw new Error(`[calendar.real] Failed to refresh Google access token: ${body.error_description ?? response.statusText}`);
  }
  return body.access_token;
}

async function googleRequest<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${CALENDAR_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(`[calendar.real] Google Calendar ${path} failed: ${body.error?.message ?? response.statusText}`);
  }
  return body;
}

/** Builds a single ISO datetime for a block's slot boundary — the block's
 * date at the given "HH:mm" wall-clock time, UTC (matches AvailabilityBlock's
 * existing string-slot convention; timezone-aware slots are Phase 13 scope). */
function slotDateTime(blockDate: Date, hhmm: string): string {
  const day = blockDate.toISOString().slice(0, 10);
  return `${day}T${hhmm}:00.000Z`;
}

export const realCalendarProvider: CalendarProvider = {
  async connect(state) {
    const { clientId, redirectUri } = requireGoogleCredentials();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline", // required to receive a refresh_token
      prompt: "consent", // forces a refresh_token even on a re-consent
      scope: SCOPES.join(" "),
      state,
    });
    return { authUrl: `${GOOGLE_AUTH_URL}?${params.toString()}` };
  },

  async completeConnect(code) {
    const { clientId, clientSecret, redirectUri } = requireGoogleCredentials();
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const body = (await response.json()) as {
      refresh_token?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    };
    if (!response.ok || !body.refresh_token) {
      throw new Error(
        `[calendar.real] Google token exchange did not return a refresh_token: ${body.error_description ?? body.error ?? response.statusText}`,
      );
    }
    return { refreshToken: body.refresh_token, scopes: (body.scope ?? "").split(" ").filter(Boolean) };
  },

  async pushAvailability(block: AvailabilityBlock, refreshToken: string) {
    const accessToken = await getAccessToken(refreshToken);
    const starts = block.slots.map((s) => s.start).sort();
    const ends = block.slots.map((s) => s.end).sort();
    const eventBody = {
      summary: "Monologg Availability",
      start: { dateTime: slotDateTime(block.date, starts[0] ?? "00:00") },
      end: { dateTime: slotDateTime(block.date, ends[ends.length - 1] ?? "23:59") },
      extendedProperties: { private: { monologgAvailabilityBlockId: block.id } },
    };

    const data = block.calendarEventId
      ? await googleRequest<{ id: string }>(`/calendars/primary/events/${block.calendarEventId}`, accessToken, {
          method: "PATCH",
          body: JSON.stringify(eventBody),
        })
      : await googleRequest<{ id: string }>("/calendars/primary/events", accessToken, {
          method: "POST",
          body: JSON.stringify(eventBody),
        });

    return { calendarEventId: data.id };
  },

  async getBusyTimes(date: Date, refreshToken: string): Promise<BusyPeriod[]> {
    const accessToken = await getAccessToken(refreshToken);
    const day = date.toISOString().slice(0, 10);
    const data = await googleRequest<{ calendars: Record<string, { busy: BusyPeriod[] }> }>(
      "/freeBusy",
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          timeMin: `${day}T00:00:00.000Z`,
          timeMax: `${day}T23:59:59.000Z`,
          items: [{ id: "primary" }],
        }),
      },
    );
    return data.calendars.primary?.busy ?? [];
  },

  async createMeet(bookingId: string, refreshToken: string) {
    const accessToken = await getAccessToken(refreshToken);
    const now = new Date();
    const in30Min = new Date(now.getTime() + 30 * 60 * 1000);
    const data = await googleRequest<{
      hangoutLink?: string;
      conferenceData?: { entryPoints?: Array<{ entryPointType: string; uri: string }> };
    }>(`/calendars/primary/events?conferenceDataVersion=1`, accessToken, {
      method: "POST",
      body: JSON.stringify({
        summary: "Monologg Booking Call",
        start: { dateTime: now.toISOString() },
        end: { dateTime: in30Min.toISOString() },
        conferenceData: {
          createRequest: { requestId: bookingId, conferenceSolutionKey: { type: "hangoutsMeet" } },
        },
        extendedProperties: { private: { monologgBookingId: bookingId } },
      }),
    });

    const meetUrl =
      data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ?? data.hangoutLink;
    if (!meetUrl) {
      throw new Error(`[calendar.real] Google did not return a Meet link for booking ${bookingId}`);
    }
    return { meetUrl };
  },
};
