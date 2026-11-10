import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.js";
import { paginationQuerySchema } from "../lib/pagination.js";
import { listTransactions } from "../services/transactions.js";

const PAYMENT_STATUS_VALUES = [
  "INITIATED",
  "AUTHORIZED",
  "ESCROW_HELD",
  "RELEASING",
  "RELEASED",
  "REFUNDING",
  "REFUNDED",
  "FAILED",
] as const;

const transactionsQuerySchema = z.object({
  state: z.enum(PAYMENT_STATUS_VALUES).optional(),
  direction: z.enum(["payment", "payout"]).optional(),
});

// GET /transactions (features.md Phase 10) — the caller's own payments/payouts,
// owner-scoped (see services/transactions.ts: only bookings where the caller is
// the creator or client), paginated and filterable by state/direction.
export async function transactionRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/api/v1/transactions",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const pagination = paginationQuerySchema.parse(request.query);
      const parsedFilters = transactionsQuerySchema.safeParse(request.query);
      if (!parsedFilters.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsedFilters.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const result = await listTransactions(request.user!.userId, pagination, parsedFilters.data);
      return reply.send(result);
    },
  );
}
