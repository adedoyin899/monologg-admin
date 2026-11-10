import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { createExternalBooking, GuestCheckoutEmailConflictError } from "../services/externalBooking.js";
import { SlotUnavailableError } from "../services/availability.js";
import { initEscrowForBooking, BookingNotPayableError } from "../services/payment.js";

const createGuestBookingSchema = z.object({
  creatorId: z.string().min(1),
  rateCardId: z.string().min(1),
  slotDate: z.coerce.date(),
  slotStart: z.string().min(1),
  slotEnd: z.string().min(1),
  contextNote: z.string().max(500).optional(),
  name: z.string().min(1),
  email: z.string().email(),
});

// The logged-out external-visitor booking flow (features.md Phase 16, FA-5). No
// requireAuth anywhere in this file — the whole point is that no session exists yet.
// A returned Booking id (a cuid, handed only to whoever just created it) is the
// authorization boundary for the /pay call below, the same trust model a Stripe/
// Shopify checkout-session URL uses.
export async function publicBookingRoutes(app: FastifyInstance): Promise<void> {
  // POST /public/bookings — creates the guest's booking (and, transparently, their
  // AUTO_CHECKOUT account if their email is new). Fees and the base amount are always
  // server-computed from the RateCard — never trusted from the request body, same
  // guardrail as the authenticated POST /bookings.
  app.post(
    "/api/v1/public/bookings",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = createGuestBookingSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const { creatorId, rateCardId, slotDate, slotStart, slotEnd, contextNote, name, email } = parsed.data;
      const rateCard = await prisma.rateCard.findUnique({ where: { id: rateCardId } });
      if (!rateCard || rateCard.creatorId !== creatorId) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "rateCardId does not belong to the given creatorId",
          statusCode: 400,
        });
      }

      try {
        const { booking } = await createExternalBooking({
          creatorId,
          rateCardId,
          baseAmount: rateCard.basePriceAmount,
          currency: rateCard.basePriceCurrency,
          slotDate,
          slotStart,
          slotEnd,
          contextNote,
          name,
          email,
        });
        return reply.status(201).send(booking);
      } catch (err) {
        if (err instanceof SlotUnavailableError) {
          return reply.status(409).send({ error: "Conflict", message: err.message, statusCode: 409 });
        }
        if (err instanceof GuestCheckoutEmailConflictError) {
          return reply.status(409).send({ error: "Conflict", message: err.message, statusCode: 409 });
        }
        throw err;
      }
    },
  );

  // POST /public/bookings/:id/pay — same escrow-init as the authenticated flow, just
  // reachable without a session. Refuses to pay-init an INTERNAL booking through this
  // door (that one requires a real client session, routes/bookings.ts).
  app.post(
    "/api/v1/public/bookings/:id/pay",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const booking = await prisma.booking.findUnique({ where: { id } });
      if (!booking) {
        return reply.status(404).send({ error: "Not Found", message: `Booking "${id}" not found`, statusCode: 404 });
      }
      if (booking.origin !== "PUBLIC_LINK") {
        return reply.status(403).send({
          error: "Forbidden",
          message: "This booking requires an authenticated session to pay",
          statusCode: 403,
        });
      }

      try {
        const { payment, checkoutUrl } = await initEscrowForBooking(id);
        return reply.send({ checkoutUrl, providerRef: payment.providerRef, status: payment.status });
      } catch (err) {
        if (err instanceof BookingNotPayableError) {
          return reply.status(409).send({ error: "Conflict", message: err.message, statusCode: 409 });
        }
        throw err;
      }
    },
  );
}
