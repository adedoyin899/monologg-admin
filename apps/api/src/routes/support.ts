import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.js";
import { paginationQuerySchema } from "../lib/pagination.js";
import { createSupportTicket, listSupportTickets } from "../services/support.js";

const createTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

// Support ticket routes (features.md Phase 10) — owner-scoped.
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
}
