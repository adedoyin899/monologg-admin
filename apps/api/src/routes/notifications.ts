import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.js";
import { paginationQuerySchema } from "../lib/pagination.js";
import {
  listNotifications,
  markNotificationRead,
  getNotificationPreferences,
  updateNotificationPreferences,
  NotificationNotFoundError,
} from "../services/notifications.js";

const preferencesPatchSchema = z.object({
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
});

// Notification routes (features.md Phase 9). All owner-scoped to the
// authenticated user — the client's notification panel binds to GET below.
export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  // GET /notifications — the caller's own notifications, paginated + unread count.
  app.get(
    "/api/v1/notifications",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = paginationQuerySchema.parse(request.query);
      const result = await listNotifications(request.user!.userId, query);
      return reply.send(result);
    },
  );

  // POST /notifications/:id/read — owner-scoped, idempotent.
  app.post(
    "/api/v1/notifications/:id/read",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        const notification = await markNotificationRead(request.user!.userId, id);
        return reply.send(notification);
      } catch (err) {
        if (err instanceof NotificationNotFoundError) {
          return reply.status(404).send({ error: "Not Found", message: err.message, statusCode: 404 });
        }
        throw err;
      }
    },
  );

  // GET/PATCH /notifications/preferences — respects the Phase 9 guardrail
  // ("respect preferences and unsubscribe where legally required"). No row
  // yet = both channels default enabled.
  app.get(
    "/api/v1/notifications/preferences",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const preferences = await getNotificationPreferences(request.user!.userId);
      return reply.send(preferences);
    },
  );

  app.patch(
    "/api/v1/notifications/preferences",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = preferencesPatchSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const preferences = await updateNotificationPreferences(request.user!.userId, parsed.data);
      return reply.send(preferences);
    },
  );
}
