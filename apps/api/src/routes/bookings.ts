import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Booking, BookingState } from "@prisma/client";
import { prisma } from "../db/client.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { findOwnCreator, findOwnClient, bookingParticipantRole } from "../lib/ownership.js";
import { paginationQuerySchema, paginate, toSkipTake } from "../lib/pagination.js";
import { formatMoney } from "../lib/display.js";
import { createBooking, transitionBooking, IllegalBookingTransitionError } from "../services/booking.js";
import { SlotUnavailableError } from "../services/availability.js";
import { openDispute, DisputeError } from "../services/disputes.js";
import {
  initEscrowForBooking,
  releaseEscrowForBooking,
  refundEscrowForBooking,
  BookingNotPayableError,
} from "../services/payment.js";
import { notifyProvider } from "../providers/index.js";
import { enqueueEmailNotification } from "../services/notifications.js";
import { track } from "../lib/analytics/index.js";

const createBookingSchema = z.object({
  creatorId: z.string().min(1),
  rateCardId: z.string().min(1),
  slotDate: z.coerce.date(),
  slotStart: z.string().min(1),
  slotEnd: z.string().min(1),
});

const PHASE_LABELS: Record<BookingState, string> = {
  PENDING_PAYMENT: "Briefing",
  ESCROW_LOCKED: "Deliverables",
  DELIVERABLES_PROVIDED: "Review",
  PAYMENT_RELEASED: "Complete",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
};

type BookingWithParties = Booking & {
  creator: { name: string };
  client: { name: string };
};

function mapBookingToOrder(
  booking: BookingWithParties,
  role: "creator" | "client",
  rateCardTitle: string | undefined,
) {
  const amount =
    role === "client"
      ? booking.baseAmount + booking.clientFeeAmount
      : booking.baseAmount - booking.talentFeeAmount;

  return {
    id: booking.id,
    counterpart: role === "client" ? booking.creator.name : booking.client.name,
    project: rateCardTitle ?? "Booking",
    amount: formatMoney(amount, booking.currency),
    status: booking.state.toLowerCase(),
    phase: PHASE_LABELS[booking.state],
    due: booking.slotDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

async function rateCardTitleMap(rateCardIds: string[]): Promise<Map<string, string>> {
  const rateCards = await prisma.rateCard.findMany({
    where: { id: { in: rateCardIds } },
    select: { id: true, serviceTitle: true },
  });
  return new Map(rateCards.map((rc) => [rc.id, rc.serviceTitle]));
}

export async function bookingRoutes(app: FastifyInstance): Promise<void> {
  // POST /bookings — client creates a booking against a creator's rate card.
  // Fees are always server-computed (services/booking.ts) — never client-supplied.
  app.post(
    "/api/v1/bookings",
    { preHandler: [requireAuth, requireRole("CLIENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const client = await findOwnClient(request.user!.userId);
      if (!client) {
        return reply.status(404).send({ error: "Not Found", message: "No client profile for this user", statusCode: 404 });
      }

      const parsed = createBookingSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const { creatorId, rateCardId, slotDate, slotStart, slotEnd } = parsed.data;
      const rateCard = await prisma.rateCard.findUnique({
        where: { id: rateCardId },
        include: { creator: { select: { userId: true } } },
      });
      if (!rateCard || rateCard.creatorId !== creatorId) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "rateCardId does not belong to the given creatorId",
          statusCode: 400,
        });
      }

      let booking;
      try {
        booking = await createBooking({
          creatorId,
          clientId: client.id,
          rateCardId,
          baseAmount: rateCard.basePriceAmount,
          currency: rateCard.basePriceCurrency,
          slotDate,
          slotStart,
          slotEnd,
        });
      } catch (err) {
        if (err instanceof SlotUnavailableError) {
          return reply.status(409).send({ error: "Conflict", message: err.message, statusCode: 409 });
        }
        throw err;
      }

      // features.md Phase 9: domain event — a new booking request notifies the
      // talent. Best-effort: a notification failure must never fail booking creation.
      await notifyProvider
        .inApp(rateCard.creator.userId, { kind: "booking_created", bookingId: booking.id })
        .catch(() => {});
      await enqueueEmailNotification(rateCard.creator.userId, "booking_created", { bookingId: booking.id });

      void track("booking_started", {
        bookingId: booking.id,
        currency: booking.currency,
        amountMinor: booking.baseAmount,
        from: "NONE",
        to: "PENDING_PAYMENT",
        origin: "client",
      }, { actor: "USER", actorId: request.user!.userId, source: "API" }).catch(() => {});

      void track("slot_selected", {
        bookingId: booking.id,
        currency: booking.currency,
        amountMinor: booking.baseAmount,
        from: "NONE",
        to: "PENDING_PAYMENT",
        origin: "client",
      }, { actor: "USER", actorId: request.user!.userId, source: "API" }).catch(() => {});

      return reply.status(201).send(booking);
    },
  );

  // GET /bookings?role=talent|client — the authenticated user's own bookings.
  app.get(
    "/api/v1/bookings",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { role } = request.query as { role?: string };
      if (role !== "talent" && role !== "client") {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Query param 'role' must be 'talent' or 'client'",
          statusCode: 400,
        });
      }

      const query = paginationQuerySchema.parse(request.query);
      const { skip, take } = toSkipTake(query);

      let where: { creatorId: string } | { clientId: string };
      const participantRole: "creator" | "client" = role === "talent" ? "creator" : "client";

      if (role === "talent") {
        const creator = await findOwnCreator(request.user!.userId);
        if (!creator) {
          return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
        }
        where = { creatorId: creator.id };
      } else {
        const client = await findOwnClient(request.user!.userId);
        if (!client) {
          return reply.status(404).send({ error: "Not Found", message: "No client profile for this user", statusCode: 404 });
        }
        where = { clientId: client.id };
      }

      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
          include: { creator: { select: { name: true } }, client: { select: { name: true } } },
        }),
        prisma.booking.count({ where }),
      ]);

      const titles = await rateCardTitleMap(bookings.map((b) => b.rateCardId));
      const orders = bookings.map((b) => mapBookingToOrder(b, participantRole, titles.get(b.rateCardId)));

      return reply.send(paginate(orders, total, query));
    },
  );

  // GET /bookings/:id — participant-scoped read.
  app.get(
    "/api/v1/bookings/:id",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const booking = await prisma.booking.findUnique({
        where: { id },
        include: { creator: true, client: true },
      });
      if (!booking) {
        return reply.status(404).send({ error: "Not Found", message: `Booking "${id}" not found`, statusCode: 404 });
      }

      const role = bookingParticipantRole(booking, request.user!.userId);
      if (!role) {
        return reply.status(403).send({ error: "Forbidden", message: "You are not a participant in this booking", statusCode: 403 });
      }

      const titles = await rateCardTitleMap([booking.rateCardId]);
      return reply.send(mapBookingToOrder(booking, role, titles.get(booking.rateCardId)));
    },
  );

  // PATCH /bookings/:id/cancel — participant-scoped, only legal from PENDING_PAYMENT
  // (services/booking.ts rejects any other transition attempt).
  app.patch(
    "/api/v1/bookings/:id/cancel",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const booking = await prisma.booking.findUnique({
        where: { id },
        include: { creator: true, client: true },
      });
      if (!booking) {
        return reply.status(404).send({ error: "Not Found", message: `Booking "${id}" not found`, statusCode: 404 });
      }

      const role = bookingParticipantRole(booking, request.user!.userId);
      if (!role) {
        return reply.status(403).send({ error: "Forbidden", message: "You are not a participant in this booking", statusCode: 403 });
      }

      try {
        const updated = await transitionBooking(id, "CANCELLED", role);
        void track("booking_cancelled", {
          bookingId: id,
          currency: booking.currency,
          amountMinor: booking.baseAmount,
          from: booking.state,
          to: "CANCELLED",
          origin: role,
        }, { actor: "USER", actorId: request.user!.userId, source: "API" }).catch(() => {});
        return reply.send(updated);
      } catch (err) {
        if (err instanceof IllegalBookingTransitionError) {
          return reply.status(409).send({ error: "Conflict", message: err.message, statusCode: 409 });
        }
        throw err;
      }
    },
  );

  // POST /bookings/:id/pay — client initiates the escrow charge (features.md
  // Phase 6). Returns a provider checkout URL; this call NEVER advances
  // BookingState itself — only a verified Paystack webhook does that (see
  // routes/webhooks.ts + services/payment.ts).
  app.post(
    "/api/v1/bookings/:id/pay",
    { preHandler: [requireAuth, requireRole("CLIENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const booking = await prisma.booking.findUnique({ where: { id }, include: { creator: true, client: true } });
      if (!booking) {
        return reply.status(404).send({ error: "Not Found", message: `Booking "${id}" not found`, statusCode: 404 });
      }
      if (bookingParticipantRole(booking, request.user!.userId) !== "client") {
        return reply.status(403).send({ error: "Forbidden", message: "You are not the client on this booking", statusCode: 403 });
      }

      try {
        const { payment, checkoutUrl } = await initEscrowForBooking(id);
        void track("checkout_started", {
          bookingId: id,
          currency: booking.currency,
          amountMinor: booking.baseAmount,
          from: booking.state,
          to: booking.state,
          origin: "client",
        }, { actor: "USER", actorId: request.user!.userId, source: "API" }).catch(() => {});
        void track("payment_initiated", {
          bookingId: id,
          currency: booking.currency,
          amountMinor: booking.baseAmount,
          from: booking.state,
          to: booking.state,
          origin: "client",
        }, { actor: "USER", actorId: request.user!.userId, source: "API" }).catch(() => {});
        return reply.send({ checkoutUrl, providerRef: payment.providerRef, status: payment.status });
      } catch (err) {
        if (err instanceof BookingNotPayableError) {
          return reply.status(409).send({ error: "Conflict", message: err.message, statusCode: 409 });
        }
        throw err;
      }
    },
  );

  // PATCH /bookings/:id/deliver — talent marks deliverables provided. No money
  // moves here; it just unlocks the client's ability to approve release.
  app.patch(
    "/api/v1/bookings/:id/deliver",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const booking = await prisma.booking.findUnique({ where: { id }, include: { creator: true, client: true } });
      if (!booking) {
        return reply.status(404).send({ error: "Not Found", message: `Booking "${id}" not found`, statusCode: 404 });
      }
      if (bookingParticipantRole(booking, request.user!.userId) !== "creator") {
        return reply.status(403).send({ error: "Forbidden", message: "You are not the talent on this booking", statusCode: 403 });
      }

      try {
        const updated = await transitionBooking(id, "DELIVERABLES_PROVIDED", "creator");

        void track("deliverables_provided", {
          bookingId: id,
          currency: booking.currency,
          amountMinor: booking.baseAmount,
          from: booking.state,
          to: "DELIVERABLES_PROVIDED",
          origin: "creator",
        }, { actor: "USER", actorId: request.user!.userId, source: "API" }).catch(() => {});

        // features.md Phase 9: domain event — the client is notified their
        // deliverables are ready for review. Best-effort, never fails the transition.
        await notifyProvider
          .inApp(booking.client.userId, { kind: "deliverables_provided", bookingId: id })
          .catch(() => {});
        await enqueueEmailNotification(booking.client.userId, "deliverables_provided", { bookingId: id });

        return reply.send(updated);
      } catch (err) {
        if (err instanceof IllegalBookingTransitionError) {
          return reply.status(409).send({ error: "Conflict", message: err.message, statusCode: 409 });
        }
        throw err;
      }
    },
  );

  // PATCH /bookings/:id/approve — client approves delivered work, releasing the
  // held escrow to the creator (base − talentFee). Idempotent: approving twice
  // is a safe no-op (services/payment.ts's atomic claim on Payment.status).
  app.patch(
    "/api/v1/bookings/:id/approve",
    { preHandler: [requireAuth, requireRole("CLIENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const booking = await prisma.booking.findUnique({ where: { id }, include: { creator: true, client: true } });
      if (!booking) {
        return reply.status(404).send({ error: "Not Found", message: `Booking "${id}" not found`, statusCode: 404 });
      }
      if (bookingParticipantRole(booking, request.user!.userId) !== "client") {
        return reply.status(403).send({ error: "Forbidden", message: "You are not the client on this booking", statusCode: 403 });
      }

      try {
        const result = await releaseEscrowForBooking(id);
        return reply.send(result.payment);
      } catch (err) {
        if (err instanceof IllegalBookingTransitionError || err instanceof BookingNotPayableError) {
          return reply.status(409).send({ error: "Conflict", message: err.message, statusCode: 409 });
        }
        throw err;
      }
    },
  );

  // PATCH & POST /bookings/:id/dispute — either participant can flag a dispute while
  // funds are held. Moves booking to DISPUTED, creates Dispute record & linked SupportTicket,
  // notifies counterparty, and emits dispute_opened.
  const handleDispute = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) ?? {};

    try {
      const result = await openDispute(id, request.user!.userId, body);
      return reply.send({
        ...result.booking,
        dispute: result.dispute,
      });
    } catch (err) {
      if (err instanceof DisputeError) {
        return reply.status(err.statusCode).send({ error: err.name, message: err.message, statusCode: err.statusCode });
      }
      if (err instanceof IllegalBookingTransitionError) {
        return reply.status(409).send({ error: "Conflict", message: err.message, statusCode: 409 });
      }
      throw err;
    }
  };

  app.patch("/api/v1/bookings/:id/dispute", { preHandler: [requireAuth] }, handleDispute);
  app.post("/api/v1/bookings/:id/dispute", { preHandler: [requireAuth] }, handleDispute);

  // GET /bookings/:id/dispute — view dispute details for a booking
  app.get(
    "/api/v1/bookings/:id/dispute",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const booking = await prisma.booking.findUnique({ where: { id }, include: { creator: true, client: true } });
      if (!booking) {
        return reply.status(404).send({ error: "Not Found", message: `Booking "${id}" not found`, statusCode: 404 });
      }
      if (!bookingParticipantRole(booking, request.user!.userId)) {
        return reply.status(403).send({ error: "Forbidden", message: "You are not a participant in this booking", statusCode: 403 });
      }

      const dispute = await prisma.dispute.findUnique({ where: { bookingId: id } });
      return reply.send({ dispute, bookingState: booking.state });
    },
  );

  // POST /bookings/:id/refund — refund path for disputes. Only legal from
  // DISPUTED; idempotent the same way /approve is (atomic claim on Payment.status).
  app.post(
    "/api/v1/bookings/:id/refund",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const booking = await prisma.booking.findUnique({ where: { id }, include: { creator: true, client: true } });
      if (!booking) {
        return reply.status(404).send({ error: "Not Found", message: `Booking "${id}" not found`, statusCode: 404 });
      }
      if (!bookingParticipantRole(booking, request.user!.userId)) {
        return reply.status(403).send({ error: "Forbidden", message: "You are not a participant in this booking", statusCode: 403 });
      }

      try {
        const result = await refundEscrowForBooking(id);
        return reply.send(result.payment);
      } catch (err) {
        if (err instanceof IllegalBookingTransitionError || err instanceof BookingNotPayableError) {
          return reply.status(409).send({ error: "Conflict", message: err.message, statusCode: 409 });
        }
        throw err;
      }
    },
  );
}
