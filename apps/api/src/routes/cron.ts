import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { runAdminTick } from "../admin/cron/tick.js";

export async function cronRoutes(app: FastifyInstance): Promise<void> {
  const handler = async (request: FastifyRequest, reply: FastifyReply) => {
    const expectedSecret = process.env.CRON_SECRET || "monologg_cron_secret_alpha_2026";
    const authHeader = request.headers.authorization;
    const cronHeader = request.headers["x-cron-secret"];
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : typeof cronHeader === "string"
      ? cronHeader
      : null;

    if (!token || token !== expectedSecret) {
      return reply.status(401).send({ error: "Unauthorized: Invalid or missing CRON_SECRET." });
    }

    const body = (request.body as Record<string, any>) || {};
    const now = body.now ? new Date(body.now) : new Date();

    const result = await runAdminTick(now, {
      forceAllJobs: Boolean(body.forceAllJobs),
      simulatedBudgetMs: body.simulatedBudgetMs,
    });

    return reply.send(result);
  };

  app.post("/api/v1/cron/admin-tick", handler);
  app.post("/cron/admin-tick", handler);
}

