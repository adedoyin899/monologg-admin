import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { findOwnCreator } from "../lib/ownership.js";
import { paginationQuerySchema, paginate, toSkipTake } from "../lib/pagination.js";

// features.md Phase 13 (FA-1): talent-added, non-booking calendar entries —
// "add events to a specific day; clicking a day reveals everything scheduled
// that day". Owner-scoped CRUD, same shape as routes/availability.ts.
// Deliberately never subtracted by getOpenSlots (services/availability.ts) —
// see the CalendarEvent model's own doc comment in schema.prisma.

const calendarEventSchema = z.object({
  date: z.coerce.date(),
  start: z.string().min(1),
  end: z.string().min(1),
  title: z.string().min(1),
  kind: z.enum(["personal", "hold", "booking"]),
});

export async function calendarEventRoutes(app: FastifyInstance): Promise<void> {
  // GET /calendar-events — the authenticated creator's own events, paginated.
  app.get(
    "/api/v1/calendar-events",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const query = paginationQuerySchema.parse(request.query);
      const { skip, take } = toSkipTake(query);
      const where = { creatorId: creator.id };

      const [events, total] = await Promise.all([
        prisma.calendarEvent.findMany({ where, skip, take, orderBy: { date: "asc" } }),
        prisma.calendarEvent.count({ where }),
      ]);

      return reply.send(paginate(events, total, query));
    },
  );

  // POST /calendar-events — create an event owned by the authenticated creator.
  app.post(
    "/api/v1/calendar-events",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const parsed = calendarEventSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const event = await prisma.calendarEvent.create({
        data: { ...parsed.data, creatorId: creator.id },
      });
      return reply.status(201).send(event);
    },
  );

  // PATCH /calendar-events/:id — owner-scoped update.
  app.patch(
    "/api/v1/calendar-events/:id",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const { id } = request.params as { id: string };
      const existing = await prisma.calendarEvent.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: `Calendar event "${id}" not found`, statusCode: 404 });
      }
      if (existing.creatorId !== creator.id) {
        return reply.status(403).send({ error: "Forbidden", message: "You do not own this calendar event", statusCode: 403 });
      }

      const parsed = calendarEventSchema.partial().safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const updated = await prisma.calendarEvent.update({ where: { id }, data: parsed.data });
      return reply.send(updated);
    },
  );

  // DELETE /calendar-events/:id — owner-scoped delete.
  app.delete(
    "/api/v1/calendar-events/:id",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const { id } = request.params as { id: string };
      const existing = await prisma.calendarEvent.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: `Calendar event "${id}" not found`, statusCode: 404 });
      }
      if (existing.creatorId !== creator.id) {
        return reply.status(403).send({ error: "Forbidden", message: "You do not own this calendar event", statusCode: 403 });
      }

      await prisma.calendarEvent.delete({ where: { id } });
      return reply.status(200).send({ success: true });
    },
  );
}
