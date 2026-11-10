import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { paymentProvider } from "../providers/index.js";
import { processPaystackWebhookEvent, type PaystackWebhookPayload } from "../services/payment.js";
import { track } from "../lib/analytics/index.js";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

/**
 * Paystack webhook (features.md Phase 6). This is the ONLY authority that can
 * move a Payment/Booking into ESCROW_LOCKED — a client-side "success" redirect
 * is advisory at best and must never be trusted to advance state on its own.
 *
 * A dedicated content-type parser stashes the raw buffer on the request before
 * parsing it as JSON, since HMAC signature verification needs the exact bytes
 * Paystack signed — a JSON.parse → JSON.stringify round-trip isn't guaranteed
 * byte-identical (key order, whitespace). Registered on this plugin's own
 * encapsulated Fastify instance, so it doesn't affect any other route.
 */
export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (request, body, done) => {
    const buf = body as Buffer;
    request.rawBody = buf;
    try {
      done(null, buf.length ? JSON.parse(buf.toString("utf8")) : {});
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  app.post(
    "/api/v1/webhooks/paystack",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const signature = request.headers["x-paystack-signature"] as string | undefined;
      const rawBody = request.rawBody ?? Buffer.alloc(0);

      if (!signature || !paymentProvider.verifyWebhook(signature, rawBody)) {
        void track(
          "webhook_failed",
          { route: "/api/v1/webhooks/paystack", status: 401, provider: "PAYSTACK" },
          { actor: "SYSTEM", source: "API" },
        ).catch(() => {});
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Invalid or missing webhook signature",
          statusCode: 401,
        });
      }

      void track(
        "webhook_received",
        { route: "/api/v1/webhooks/paystack", status: 200, provider: "PAYSTACK" },
        { actor: "SYSTEM", source: "API" },
      ).catch(() => {});

      const payload = request.body as PaystackWebhookPayload;
      const result = await processPaystackWebhookEvent(payload);
      return reply.status(200).send({ received: true, processed: result.processed });
    },
  );
}
