import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.js";
import {
  startGoogleConnect,
  completeGoogleConnect,
  disconnectGoogleCalendar,
  getCalendarConnectionStatus,
  getGoogleBusyTimes,
  InvalidOAuthStateError,
  CalendarNotConnectedError,
  CalendarReconnectRequiredError,
} from "../services/calendar.js";
import { track } from "../lib/analytics/index.js";

// Google Calendar OAuth + busy-times routes (features.md Phase 8). "Per user" —
// available to both TALENT and CLIENT, not role-restricted, since either can
// connect their own calendar. No frontend page consumes these yet (this phase
// is the provider layer, per the kickoff scope note; Phase 13 owns the rich
// availability UX) — see handoff/log.md for the flagged gap.

const callbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

const busyTimesQuerySchema = z.object({
  date: z.string().date(),
});

export async function calendarRoutes(app: FastifyInstance): Promise<void> {
  // POST /calendar/connect — returns a Google consent URL. Never returns or
  // logs anything token-shaped; that only exists after the callback below.
  app.post(
    "/api/v1/calendar/connect",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { authUrl } = await startGoogleConnect(request.user!.userId);
      return reply.send({ authUrl });
    },
  );

  // GET /calendar/callback — Google redirects the *browser* here (no Authorization
  // header reaches this route; the OAuth `state` token is what proves identity —
  // see services/calendar.ts). Public route, same shape as routes/webhooks.ts.
  app.get(
    "/api/v1/calendar/callback",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = callbackQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      try {
        await completeGoogleConnect(parsed.data.state, parsed.data.code);
        void track(
          "calendar_connected",
          { slotCount: 0 },
          { actor: "USER", source: "API" },
        ).catch(() => {});
        return reply.send({ connected: true });
      } catch (err) {
        if (err instanceof InvalidOAuthStateError) {
          return reply.status(400).send({ error: "Bad Request", message: err.message, statusCode: 400 });
        }
        throw err;
      }
    },
  );

  // POST /calendar/disconnect — user-initiated revoke.
  app.post(
    "/api/v1/calendar/disconnect",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await disconnectGoogleCalendar(request.user!.userId);
      return reply.send({ disconnected: true });
    },
  );

  // GET /calendar/status — whether the authenticated user has a live connection.
  app.get(
    "/api/v1/calendar/status",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const status = await getCalendarConnectionStatus(request.user!.userId);
      return reply.send(status);
    },
  );

  // GET /calendar/busy-times?date=YYYY-MM-DD — real Google busy periods for the
  // authenticated user's own calendar. This is the hook Phase 13's
  // getOpenSlots will call; no availability-merging UI logic lives here.
  app.get(
    "/api/v1/calendar/busy-times",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = busyTimesQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      try {
        const busyTimes = await getGoogleBusyTimes(request.user!.userId, new Date(parsed.data.date));
        return reply.send({ busyTimes });
      } catch (err) {
        if (err instanceof CalendarNotConnectedError) {
          return reply.status(404).send({ error: "Not Found", message: err.message, statusCode: 404 });
        }
        if (err instanceof CalendarReconnectRequiredError) {
          return reply.status(409).send({
            error: "Conflict",
            message: err.message,
            statusCode: 409,
            reconnectRequired: true,
          });
        }
        throw err;
      }
    },
  );
}
