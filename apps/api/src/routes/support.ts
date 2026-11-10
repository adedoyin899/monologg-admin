import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.js";
import { paginationQuerySchema } from "../lib/pagination.js";
import {
  createSupportTicket,
  listSupportTickets,
  getSupportTicket,
  addTicketMessageFromUser,
} from "../services/support.js";

const createTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  category: z.enum([
    "COMPLAINT",
    "BUG",
    "PAYMENT",
    "BOOKING",
    "DISPUTE",
    "ACCOUNT",
    "VERIFICATION",
    "FEEDBACK",
    "OTHER",
  ]).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  source: z.enum(["IN_APP", "EMAIL", "ADMIN_CREATED", "BOOKING", "ORDER_ROOM", "HELP_MENU", "WEB"]).optional(),
  bookingId: z.string().optional(),
  reporterEmail: z.string().email().optional(),
});

const postMessageSchema = z.object({
  body: z.string().min(1).max(5000),
});

// Support ticket routes (features.md Phase 10 / PRD M7 Phase A8) — owner-scoped.
export async function supportRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/api/v1/support/tickets",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = createTicketSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const ticket = await createSupportTicket(request.user!.userId, parsed.data);
      return reply.status(201).send(ticket);
    },
  );

  app.get(
    "/api/v1/support/tickets",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = paginationQuerySchema.parse(request.query);
      const result = await listSupportTickets(request.user!.userId, query);
      return reply.send(result);
    },
  );

  app.get(
    "/api/v1/support/tickets/:id",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const ticket = await getSupportTicket(request.user!.userId, id);
      if (!ticket) {
        return reply.status(404).send({
          error: "Not Found",
          message: "Support ticket not found",
          statusCode: 404,
        });
      }
      return reply.send({ ticket });
    },
  );

  app.post(
    "/api/v1/support/tickets/:id/messages",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const parsed = postMessageSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      try {
        const message = await addTicketMessageFromUser(request.user!.userId, id, parsed.data.body);
        return reply.status(201).send({ message });
      } catch (err: any) {
        return reply.status(404).send({
          error: "Not Found",
          message: err.message || "Failed to add message",
          statusCode: 404,
        });
      }
    },
  );
}
