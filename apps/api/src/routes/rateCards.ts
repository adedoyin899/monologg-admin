import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { findOwnCreator } from "../lib/ownership.js";
import { paginationQuerySchema, paginate, toSkipTake } from "../lib/pagination.js";
import { formatMoney } from "../lib/display.js";
import { track } from "../lib/analytics/index.js";

// Maps a real RateCard row to the display shape apps/web's ServiceRateCard type
// expects (mirrors the same mapping style used in routes/talent.ts, routes/bookings.ts).
async function mapRateCardToServiceCard(rateCard: {
  id: string;
  serviceTitle: string;
  basePriceAmount: number;
  basePriceCurrency: string;
  deliveryTimeline: string;
}) {
  const bookings = await prisma.booking.count({ where: { rateCardId: rateCard.id } });
  return {
    id: rateCard.id,
    title: rateCard.serviceTitle,
    price: formatMoney(rateCard.basePriceAmount, rateCard.basePriceCurrency),
    delivery: rateCard.deliveryTimeline,
    bookings,
  };
}

const rateCardSchema = z.object({
  serviceTitle: z.string().min(1),
  basePriceAmount: z.number().int().nonnegative(),
  basePriceCurrency: z.string().min(1),
  deliveryTimeline: z.string().min(1),
});

export async function rateCardRoutes(app: FastifyInstance): Promise<void> {
  // GET /rate-cards — the authenticated creator's own rate cards, paginated.
  app.get(
    "/api/v1/rate-cards",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const query = paginationQuerySchema.parse(request.query);
      const { skip, take } = toSkipTake(query);
      const where = { creatorId: creator.id };

      const [rateCards, total] = await Promise.all([
        prisma.rateCard.findMany({ where, skip, take, orderBy: { id: "asc" } }),
        prisma.rateCard.count({ where }),
      ]);

      const mapped = await Promise.all(rateCards.map(mapRateCardToServiceCard));
      return reply.send(paginate(mapped, total, query));
    },
  );

  // POST /rate-cards — create a new rate card owned by the authenticated creator.
  app.post(
    "/api/v1/rate-cards",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const parsed = rateCardSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const rateCard = await prisma.rateCard.create({
        data: { ...parsed.data, creatorId: creator.id },
      });

      void track(
        "rate_card_created",
        { kind: "rate_card", mode: "standard" },
        { actor: "USER", actorId: request.user!.userId, source: "API" },
      ).catch(() => {});

      return reply.status(201).send(rateCard);
    },
  );

  // PATCH /rate-cards/:id — owner-scoped update.
  app.patch(
    "/api/v1/rate-cards/:id",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const { id } = request.params as { id: string };
      const existing = await prisma.rateCard.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: `Rate card "${id}" not found`, statusCode: 404 });
      }
      if (existing.creatorId !== creator.id) {
        return reply.status(403).send({ error: "Forbidden", message: "You do not own this rate card", statusCode: 403 });
      }

      const parsed = rateCardSchema.partial().safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const updated = await prisma.rateCard.update({ where: { id }, data: parsed.data });
      return reply.send(updated);
    },
  );

  // DELETE /rate-cards/:id — owner-scoped delete.
  app.delete(
    "/api/v1/rate-cards/:id",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const { id } = request.params as { id: string };
      const existing = await prisma.rateCard.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: `Rate card "${id}" not found`, statusCode: 404 });
      }
      if (existing.creatorId !== creator.id) {
        return reply.status(403).send({ error: "Forbidden", message: "You do not own this rate card", statusCode: 403 });
      }

      await prisma.rateCard.delete({ where: { id } });
      return reply.status(200).send({ success: true });
    },
  );
}
