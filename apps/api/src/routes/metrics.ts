import type { FastifyInstance } from "fastify";
import { getMetricsSnapshot } from "../lib/metrics.js";

/**
 * GET /api/v1/metrics — basic in-process metrics (features.md Phase 12: "request
 * rate, error rate, payment success rate"). JSON, not Prometheus text format —
 * no metrics scraper/backend exists in any prior phase, so this is intentionally
 * the simplest thing that lets a human or a future scraper compute rates from a
 * sampling interval. Unauthenticated by design (no admin-role system exists in
 * any phase to gate it behind) — the README documents that a production
 * deployment should restrict network access to this route rather than rely on
 * app-layer auth for it.
 */
export async function metricsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/metrics", async () => getMetricsSnapshot());
}
