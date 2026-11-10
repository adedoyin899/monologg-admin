import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Message } from "@prisma/client";
import { prisma } from "../db/client.js";
import { requireAuth } from "../middlewares/auth.js";
import { bookingParticipantRole } from "../lib/ownership.js";
import { paginationQuerySchema, paginate, toSkipTake } from "../lib/pagination.js";
import { notifyProvider } from "../providers/index.js";
import { enqueueEmailNotification } from "../services/notifications.js";
import { track } from "../lib/analytics/index.js";

const sendMessageSchema = z.object({
  text: z.string().min(1),
});

function mapMessageToOrderMessage(
  message: Message,
  booking: { creator: { userId: string }; client: { userId: string } },
) {
  const from =
    message.kind === "SYSTEM"
      ? "system"
      : message.senderId === booking.creator.userId
        ? "talent"
        : "client";

  return {
    id: message.id,
    from,
    text: message.content,
    time: message.createdAt.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}

async function loadParticipantBooking(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { creator: true, client: true, orderRoom: true },
  });
  if (!booking) return { error: "not_found" as const };

  const role = bookingParticipantRole(booking, userId);
  if (!role) return { error: "forbidden" as const };

  if (!booking.orderRoom) return { error: "not_found" as const };

  // features.md Phase 16 (FA-5) guardrail, but not external-only: escrow-first is a
  // general invariant — the order room is created at booking time (before payment)
  // for every booking, internal or PUBLIC_LINK alike, so this is the one shared gate
  // that actually enforces "chat gates on ESCROW_LOCKED, never a client callback."
  if (booking.state === "PENDING_PAYMENT") return { error: "escrow_pending" as const };

  return { booking, role };
}

// Order-room messages — participants only (features.md Phase 5). The route param
// is the Booking id (OrderRoom.bookingId is 1:1 with Booking), matching the
// existing frontend's getOrderMessages(orderId) call shape.
export async function orderRoomRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/api/v1/order-rooms/:bookingId/messages",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { bookingId } = request.params as { bookingId: string };
      const result = await loadParticipantBooking(bookingId, request.user!.userId);

      if ("error" in result) {
        if (result.error === "forbidden") {
          return reply.status(403).send({ error: "Forbidden", message: "You are not a participant in this booking", statusCode: 403 });
        }
        if (result.error === "escrow_pending") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Escrow not yet funded — the order room opens once payment is confirmed",
            statusCode: 403,
          });
        }
        return reply.status(404).send({ error: "Not Found", message: `Booking "${bookingId}" not found`, statusCode: 404 });
      }

      const query = paginationQuerySchema.parse(request.query);
      const { skip, take } = toSkipTake(query);
      const where = { orderRoomId: result.booking.orderRoom!.id };

      const [messages, total] = await Promise.all([
        prisma.message.findMany({ where, skip, take, orderBy: { createdAt: "asc" } }),
        prisma.message.count({ where }),
      ]);

      const mapped = messages.map((m) => mapMessageToOrderMessage(m, result.booking));
      return reply.send(paginate(mapped, total, query));
    },
  );

  app.post(
    "/api/v1/order-rooms/:bookingId/messages",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { bookingId } = request.params as { bookingId: string };
      const result = await loadParticipantBooking(bookingId, request.user!.userId);

      if ("error" in result) {
        if (result.error === "forbidden") {
          return reply.status(403).send({ error: "Forbidden", message: "You are not a participant in this booking", statusCode: 403 });
        }
        if (result.error === "escrow_pending") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Escrow not yet funded — the order room opens once payment is confirmed",
            statusCode: 403,
          });
        }
        return reply.status(404).send({ error: "Not Found", message: `Booking "${bookingId}" not found`, statusCode: 404 });
      }

      const parsed = sendMessageSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const message = await prisma.message.create({
        data: {
          orderRoomId: result.booking.orderRoom!.id,
          senderId: request.user!.userId,
          kind: "TEXT",
          content: parsed.data.text,
        },
      });

      void track(
        "message_sent",
        { orderRoomId: result.booking.orderRoom!.id, kind: "TEXT" },
        { actor: "USER", actorId: request.user!.userId, source: "API" },
      ).catch(() => {});

      // features.md Phase 9: domain event — notify the OTHER participant, never
      // the sender. Best-effort: a notification failure must never fail the send.
      const recipientUserId =
        result.role === "creator" ? result.booking.client.userId : result.booking.creator.userId;
      await notifyProvider
        .inApp(recipientUserId, { kind: "new_message", bookingId })
        .catch(() => {});
      await enqueueEmailNotification(recipientUserId, "new_message", { bookingId });

      return reply.status(201).send(mapMessageToOrderMessage(message, result.booking));
    },
  );
}
