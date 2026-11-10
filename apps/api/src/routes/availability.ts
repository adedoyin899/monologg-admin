import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { findOwnCreator } from "../lib/ownership.js";
import { paginationQuerySchema, paginate, toSkipTake } from "../lib/pagination.js";
import {
  pushAvailabilityToGoogle,
  CalendarNotConnectedError,
  CalendarReconnectRequiredError,
} from "../services/calendar.js";
import { getOpenSlots, startOfDayUTC } from "../services/availability.js";
import { track } from "../lib/analytics/index.js";

// features.md Phase 13: slots carry a state, not just a boolean — "free" is
// informational (the default-free rule already treats an unconfigured day as
// open); only "unavailable"/"booked" actually subtract from getOpenSlots.
// bookingId is set only by the server (services/availability.ts's bookSlot) —
// never client-writable, so it's accepted here but has no independent effect
// on a plain PATCH/POST from the talent.
const slotSchema = z.object({
  start: z.string(),
  end: z.string(),
  state: z.enum(["free", "unavailable", "booked"]),
  bookingId: z.string().optional(),
});

const availabilityBlockSchema = z.object({
  date: z.coerce.date(),
  slots: z.array(slotSchema),
  isRecurring: z.boolean().optional(),
  recurRule: z.string().optional(),
  calendarEventId: z.string().optional(),
});

export async function availabilityRoutes(app: FastifyInstance): Promise<void> {
  // GET /availability — the authenticated creator's own blocks, paginated.
  app.get(
    "/api/v1/availability",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const query = paginationQuerySchema.parse(request.query);
      const { skip, take } = toSkipTake(query);
      const where = { creatorId: creator.id };

      const [blocks, total] = await Promise.all([
        prisma.availabilityBlock.findMany({ where, skip, take, orderBy: { date: "asc" } }),
        prisma.availabilityBlock.count({ where }),
      ]);

      return reply.send(paginate(blocks, total, query));
    },
  );

  // GET /availability/day?date=YYYY-MM-DD — features.md Phase 13's "clicking a
  // day shows everything scheduled that day": the resolved slots (exact-date
  // override, or the matching recurring template, or none — the default-free
  // rule) plus that day's CalendarEvents, in one call for the day-detail UI.
  app.get(
    "/api/v1/availability/day",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const query = z.object({ date: z.coerce.date() }).safeParse(request.query);
      if (!query.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: query.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }
      const day = startOfDayUTC(query.data.date);

      const [override, recurringBlocks, events] = await Promise.all([
        prisma.availabilityBlock.findFirst({ where: { creatorId: creator.id, date: day, isRecurring: false } }),
        prisma.availabilityBlock.findMany({ where: { creatorId: creator.id, isRecurring: true } }),
        prisma.calendarEvent.findMany({ where: { creatorId: creator.id, date: day }, orderBy: { start: "asc" } }),
      ]);

      const openSlots = await getOpenSlots(creator.id, day);

      return reply.send({
        date: day.toISOString().slice(0, 10),
        block: override
          ? { id: override.id, slots: override.slots, isRecurring: false, recurRule: null }
          : null,
        recurringTemplates: recurringBlocks.map((b) => ({ id: b.id, slots: b.slots, recurRule: b.recurRule })),
        events,
        openSlots,
      });
    },
  );

  // POST /availability — create a block owned by the authenticated creator.
  app.post(
    "/api/v1/availability",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const parsed = availabilityBlockSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const block = await prisma.availabilityBlock.create({
        data: { ...parsed.data, creatorId: creator.id },
      });

      const slotsCount = Array.isArray(parsed.data.slots) ? parsed.data.slots.length : 1;
      void track(
        "availability_set",
        { slotCount: slotsCount },
        { actor: "USER", actorId: request.user!.userId, source: "API" },
      ).catch(() => {});

      return reply.status(201).send(block);
    },
  );

  // PATCH /availability/:id — owner-scoped update.
  app.patch(
    "/api/v1/availability/:id",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const { id } = request.params as { id: string };
      const existing = await prisma.availabilityBlock.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: `Availability block "${id}" not found`, statusCode: 404 });
      }
      if (existing.creatorId !== creator.id) {
        return reply.status(403).send({ error: "Forbidden", message: "You do not own this availability block", statusCode: 403 });
      }

      const parsed = availabilityBlockSchema.partial().safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const updated = await prisma.availabilityBlock.update({ where: { id }, data: parsed.data });
      return reply.send(updated);
    },
  );

  // POST /availability/:id/sync-calendar — pushes this block to the owning
  // creator's connected Google Calendar (features.md Phase 8). 404 if never
  // connected; 409 + reconnectRequired if the connection was revoked.
  app.post(
    "/api/v1/availability/:id/sync-calendar",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const { id } = request.params as { id: string };
      const existing = await prisma.availabilityBlock.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: `Availability block "${id}" not found`, statusCode: 404 });
      }
      if (existing.creatorId !== creator.id) {
        return reply.status(403).send({ error: "Forbidden", message: "You do not own this availability block", statusCode: 403 });
      }

      try {
        const result = await pushAvailabilityToGoogle(request.user!.userId, id);
        return reply.send(result);
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

  // DELETE /availability/:id — owner-scoped delete.
  app.delete(
    "/api/v1/availability/:id",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const { id } = request.params as { id: string };
      const existing = await prisma.availabilityBlock.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: `Availability block "${id}" not found`, statusCode: 404 });
      }
      if (existing.creatorId !== creator.id) {
        return reply.status(403).send({ error: "Forbidden", message: "You do not own this availability block", statusCode: 403 });
      }

      await prisma.availabilityBlock.delete({ where: { id } });
      return reply.status(200).send({ success: true });
    },
  );
}
