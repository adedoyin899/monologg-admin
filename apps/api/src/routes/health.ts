import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../db/client.js";

/**
 * Health-check route.
 * GET /api/v1/health
 *
 * Performs a real DB round-trip (SELECT 1) to confirm the database is reachable.
 * Returns HTTP 200 with { ok: true, db: "up" } on success.
 * Returns HTTP 503 with { ok: false, db: "down", error: "<message>" } if the DB is unreachable.
 * Never exposes raw error details in production (sanitised by the central error handler,
 * but the health route catches its own DB error here to return the right status code).
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/ready — readiness probe (features.md Phase 12: "health/readiness
  // endpoints"). Same DB round-trip as /health: for this single-process API,
  // "alive" and "able to serve real requests" both reduce to "can reach
  // Postgres" — there's no separate warm-up/cache-fill state to distinguish
  // them yet. Kept as a distinct route (not an alias) so a deploy target that
  // wires liveness vs. readiness probes differently doesn't have to share one
  // check, and so this can diverge later without a breaking route change.
  app.get(
    "/api/v1/ready",
    {
      schema: {
        response: {
          200: { type: "object", properties: { ok: { type: "boolean" }, db: { type: "string" } } },
          503: {
            type: "object",
            properties: { ok: { type: "boolean" }, db: { type: "string" }, error: { type: "string" } },
          },
        },
      },
    },
    async (_req: FastifyRequest, reply: FastifyReply) => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return reply.status(200).send({ ok: true, db: "up" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        app.log.error({ err }, "Readiness check DB round-trip failed");
        return reply.status(503).send({ ok: false, db: "down", error: message });
      }
    },
  );

  app.get(
    "/api/v1/health",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              db: { type: "string" },
            },
          },
          503: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              db: { type: "string" },
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (_req: FastifyRequest, reply: FastifyReply) => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return reply.status(200).send({ ok: true, db: "up" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        app.log.error({ err }, "Health check DB round-trip failed");
        return reply.status(503).send({ ok: false, db: "down", error: message });
      }
    },
  );
}
