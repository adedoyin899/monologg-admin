// Phase 12C: Withdrawal OTP Routes
//
// Endpoints:
//   POST /api/v1/withdrawals               — Initiate withdrawal (creates request in PENDING_OTP status)
//   POST /api/v1/withdrawals/:id/otp/request — Request/resend OTP (rate-limited, returns { sent: true, expiresAt })
//   POST /api/v1/withdrawals/:id/otp/verify — Verify OTP code & transition to APPROVED
//   POST /api/v1/withdrawals/:id/release     — Release funds (rejects with 409 if unverified)
//   GET /api/v1/dev/withdrawals/:id/otp     — Dev-only helper (NODE_ENV !== "production")

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.js";
import {
  initiateWithdrawal,
  generateWithdrawalOtp,
  verifyWithdrawalOtp,
  releaseWithdrawal,
  getDevLatestOtp,
  WithdrawalError,
} from "../services/withdrawals.js";
import { env } from "../config/env.js";
import { track } from "../lib/analytics/index.js";

const initiateSchema = z.object({
  amount: z.number().int().positive("Amount must be a positive integer in minor units"),
  currency: z.string().default("NGN"),
  bankName: z.string().min(1, "bankName is required"),
  accountNumber: z.string().min(1, "accountNumber is required"),
  accountName: z.string().min(1, "accountName is required"),
  idempotencyKey: z.string().optional(),
});

const verifySchema = z.object({
  code: z.string().length(6, "OTP code must be 6 digits"),
});

const paramsSchema = z.object({
  id: z.string().min(1, "id is required"),
});

function handleError(err: unknown, reply: FastifyReply) {
  if (err instanceof WithdrawalError) {
    return reply.status(err.statusCode).send({
      error: err.statusCode === 409 ? "Conflict" : err.statusCode === 429 ? "Too Many Requests" : err.statusCode === 403 ? "Forbidden" : err.statusCode === 404 ? "Not Found" : "Bad Request",
      message: err.message,
      statusCode: err.statusCode,
      code: err.code,
    });
  }
  const message = err instanceof Error ? err.message : "Internal Server Error";
  return reply.status(500).send({
    error: "Internal Server Error",
    message,
    statusCode: 500,
  });
}

export async function withdrawalRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /api/v1/withdrawals ───────────────────────────────────────────────
  app.post(
    "/api/v1/withdrawals",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = initiateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      try {
        const result = await initiateWithdrawal(request.user!.userId, parsed.data);
        const wr = "withdrawalRequest" in result ? result.withdrawalRequest : null;
        if (wr) {
          void track(
            "withdrawal_requested",
            { currency: wr.currency, amountMinor: wr.amount },
            { actor: "USER", actorId: request.user!.userId, source: "API" },
          ).catch(() => {});
        }
        return reply.status(201).send(result);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // ── POST /api/v1/withdrawals/:id/otp/request ──────────────────────────────
  app.post(
    "/api/v1/withdrawals/:id/otp/request",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsedParams = paramsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Invalid parameter: id",
          statusCode: 400,
        });
      }

      try {
        const result = await generateWithdrawalOtp(request.user!.userId, parsedParams.data.id);
        return reply.status(200).send(result);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // ── POST /api/v1/withdrawals/:id/otp/verify ───────────────────────────────
  app.post(
    "/api/v1/withdrawals/:id/otp/verify",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsedParams = paramsSchema.safeParse(request.params);
      const parsedBody = verifySchema.safeParse(request.body);

      if (!parsedParams.success || !parsedBody.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Invalid code or parameter",
          statusCode: 400,
        });
      }

      try {
        const result = await verifyWithdrawalOtp(
          request.user!.userId,
          parsedParams.data.id,
          parsedBody.data.code,
        );
        const wr = "withdrawalRequest" in result ? result.withdrawalRequest : null;
        if (wr) {
          void track(
            "withdrawal_otp_verified",
            { currency: wr.currency, amountMinor: wr.amount },
            { actor: "USER", actorId: request.user!.userId, source: "API" },
          ).catch(() => {});
        }
        return reply.status(200).send(result);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // ── POST /api/v1/withdrawals/:id/release ──────────────────────────────────
  app.post(
    "/api/v1/withdrawals/:id/release",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsedParams = paramsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Invalid parameter: id",
          statusCode: 400,
        });
      }

      try {
        const result = await releaseWithdrawal(request.user!.userId, parsedParams.data.id);
        const wr = result.withdrawalRequest;
        void track(
          "withdrawal_completed",
          { currency: wr.currency, amountMinor: wr.amount },
          { actor: "USER", actorId: request.user!.userId, source: "API" },
        ).catch(() => {});
        return reply.status(200).send(result);
      } catch (err) {
        void track(
          "withdrawal_failed",
          { currency: "NGN", amountMinor: 0 },
          { actor: "USER", actorId: request.user!.userId, source: "API" },
        ).catch(() => {});
        return handleError(err, reply);
      }
    },
  );

  // ── GET /api/v1/dev/withdrawals/:id/otp ────────────────────────────────────
  if (env.NODE_ENV !== "production") {
    app.get(
      "/api/v1/dev/withdrawals/:id/otp",
      { preHandler: [requireAuth] },
      async (request: FastifyRequest, reply: FastifyReply) => {
        const parsedParams = paramsSchema.safeParse(request.params);
        if (!parsedParams.success) {
          return reply.status(400).send({ error: "Bad Request", message: "Invalid id", statusCode: 400 });
        }
        try {
          const result = await getDevLatestOtp(request.user!.userId, parsedParams.data.id);
          return reply.status(200).send(result);
        } catch (err) {
          return handleError(err, reply);
        }
      },
    );
  }
}
