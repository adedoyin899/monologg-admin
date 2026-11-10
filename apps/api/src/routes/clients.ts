import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { findOwnClient } from "../lib/ownership.js";

const ORG_TYPE_VALUES = ["STUDIO", "EVENT", "BRAND", "CHURCH"] as const;

// Mirrors routes/creators.ts's updateProfileSchema — the Client-side equivalent
// never existed before now (Settings.tsx, the one screen that needs it, had no
// backend wiring of any kind through Phase 12; see handoff/log.md's Phase 9
// entry, which already flagged that screen as a known gap for the TALENT side).
const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  orgName: z.string().optional(),
  orgType: z.enum(ORG_TYPE_VALUES).optional(),
  location: z.string().min(1).optional(),
});

export async function clientRoutes(app: FastifyInstance): Promise<void> {
  // GET /clients/me — own profile.
  app.get(
    "/api/v1/clients/me",
    { preHandler: [requireAuth, requireRole("CLIENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const client = await findOwnClient(request.user!.userId);
      if (!client) {
        return reply.status(404).send({ error: "Not Found", message: "No client profile for this user", statusCode: 404 });
      }
      return reply.send(client);
    },
  );

  // PATCH /clients/me — update profile fields.
  app.patch(
    "/api/v1/clients/me",
    { preHandler: [requireAuth, requireRole("CLIENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const client = await findOwnClient(request.user!.userId);
      if (!client) {
        return reply.status(404).send({ error: "Not Found", message: "No client profile for this user", statusCode: 404 });
      }

      const parsed = updateProfileSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const updated = await prisma.client.update({ where: { id: client.id }, data: parsed.data });
      return reply.send(updated);
    },
  );
}
