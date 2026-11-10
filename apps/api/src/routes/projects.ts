import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db/client.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { findOwnCreator } from "../lib/ownership.js";
import { paginationQuerySchema, paginate, toSkipTake } from "../lib/pagination.js";
import { formatMoney } from "../lib/display.js";
import {
  applyToBrief,
  withdrawApplication,
  BriefNotFoundError,
  BriefNotOpenError,
  ApplicationsClosedError,
  DuplicateApplicationError,
  NotApplicantError,
  IllegalApplicationTransitionError,
} from "../services/applications.js";

// Talent-side project discovery & applications (features.md Phase 14, FA-2).
// The client-side counterpart (applicant management) lives in routes/briefs.ts
// and routes/applications.ts.

const NICHE_VALUES = ["ACTOR", "VO_ARTIST", "COMEDIAN", "COMPERE", "SPEAKER_PASTOR", "MUSICIAN", "CONTENT_CREATOR"] as const;

// Search filters actually backed by the Brief schema: niche (nicheReq),
// budget range, and free-text on projectName/projectType. The original PRD
// language also mentions "location, date" filters, but no phase's Brief
// model has ever carried either field (features.md Phase 2's own model has
// no location/date columns) — filtering on them would mean fabricating data,
// so they're honestly left out here rather than faked, the same tradeoff
// routes/talent.ts already documents for its own "available"/"rating" fields.
const projectsQuerySchema = paginationQuerySchema.extend({
  niche: z.enum(NICHE_VALUES).optional(),
  q: z.string().optional(),
  minBudget: z.coerce.number().int().nonnegative().optional(),
  maxBudget: z.coerce.number().int().nonnegative().optional(),
});

function mapBriefToProject(
  brief: Prisma.BriefGetPayload<{ include: { client: true; applications: true; _count: { select: { applications: true } } } }>,
  myApplication: { id: string; status: string; pitch: string | null } | undefined,
) {
  return {
    id: brief.id,
    projectName: brief.projectName,
    projectType: brief.projectType,
    nicheReq: brief.nicheReq,
    budget: formatMoney(brief.budgetAmount, brief.budgetCurrency),
    budgetAmount: brief.budgetAmount,
    budgetCurrency: brief.budgetCurrency,
    clientName: brief.client.orgName ?? brief.client.name,
    applicantCap: brief.applicantCap,
    applicationsOpen: brief.applicationsOpen,
    // The TRUE total (features.md Phase 14 bug fix, caught by live testing):
    // `brief.applications` above is deliberately filtered to just this
    // caller's own application (for `myApplication`), so it can never be the
    // source for a total headcount — every talent who hadn't applied yet was
    // seeing "0/N" instead of the real count.
    applicantCount: brief._count.applications,
    postedAt: brief.createdAt.toISOString(),
    myApplication: myApplication ? { id: myApplication.id, status: myApplication.status, pitch: myApplication.pitch } : null,
  };
}

const applySchema = z.object({
  pitch: z.string().max(2000).optional(),
});

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  // GET /projects — talent browse/search. Only ACTIVE briefs are listed (a
  // DRAFT/IN_REVIEW/CLOSED brief was never meant to be discoverable); a
  // capped-out brief still appears (applicationsOpen: false) so the talent
  // can see it and understand why Apply is disabled, rather than it vanishing.
  app.get(
    "/api/v1/projects",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const parsed = projectsQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }
      const query = parsed.data;

      const where: Prisma.BriefWhereInput = {
        status: "ACTIVE",
        ...(query.niche ? { nicheReq: { has: query.niche } } : {}),
        ...(query.q
          ? { OR: [{ projectName: { contains: query.q, mode: "insensitive" } }, { projectType: { contains: query.q, mode: "insensitive" } }] }
          : {}),
        ...(query.minBudget !== undefined || query.maxBudget !== undefined
          ? {
              budgetAmount: {
                ...(query.minBudget !== undefined ? { gte: query.minBudget } : {}),
                ...(query.maxBudget !== undefined ? { lte: query.maxBudget } : {}),
              },
            }
          : {}),
      };

      const { skip, take } = toSkipTake(query);
      const [briefs, total] = await Promise.all([
        prisma.brief.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
          include: {
            client: true,
            applications: { where: { creatorId: creator.id } },
            _count: { select: { applications: true } },
          },
        }),
        prisma.brief.count({ where }),
      ]);

      const projects = briefs.map((b) => mapBriefToProject(b, b.applications[0]));
      return reply.send(paginate(projects, total, query));
    },
  );

  // POST /projects/:briefId/apply — creates the Application. Cap enforcement,
  // duplicate rejection, and both-way notifications all live in
  // services/applications.ts (server-authoritative, transactional).
  app.post(
    "/api/v1/projects/:briefId/apply",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const { briefId } = request.params as { briefId: string };
      const parsed = applySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      try {
        const application = await applyToBrief(briefId, creator.id, parsed.data.pitch);
        return reply.status(201).send(application);
      } catch (err) {
        if (err instanceof BriefNotFoundError) {
          return reply.status(404).send({ error: "Not Found", message: err.message, statusCode: 404 });
        }
        if (err instanceof BriefNotOpenError || err instanceof ApplicationsClosedError) {
          return reply.status(409).send({ error: "Conflict", message: err.message, statusCode: 409 });
        }
        if (err instanceof DuplicateApplicationError) {
          return reply.status(409).send({ error: "Conflict", message: err.message, statusCode: 409 });
        }
        throw err;
      }
    },
  );

  // GET /creators/me/applications — the authenticated talent's own
  // applications, with status, paginated (PWA-16).
  app.get(
    "/api/v1/creators/me/applications",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const query = paginationQuerySchema.parse(request.query);
      const { skip, take } = toSkipTake(query);
      const where = { creatorId: creator.id };

      const [applications, total] = await Promise.all([
        prisma.application.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
          include: { brief: { include: { client: true } } },
        }),
        prisma.application.count({ where }),
      ]);

      const mapped = applications.map((a) => ({
        id: a.id,
        status: a.status,
        pitch: a.pitch,
        createdAt: a.createdAt.toISOString(),
        brief: {
          id: a.brief.id,
          projectName: a.brief.projectName,
          projectType: a.brief.projectType,
          budget: formatMoney(a.brief.budgetAmount, a.brief.budgetCurrency),
          clientName: a.brief.client.orgName ?? a.brief.client.name,
        },
      }));

      return reply.send(paginate(mapped, total, query));
    },
  );

  // PATCH /applications/:id/withdraw — applicant-only (never the brief owner).
  app.patch(
    "/api/v1/applications/:id/withdraw",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        const updated = await withdrawApplication(id, request.user!.userId);
        return reply.send(updated);
      } catch (err) {
        if (err instanceof BriefNotFoundError) {
          return reply.status(404).send({ error: "Not Found", message: err.message, statusCode: 404 });
        }
        if (err instanceof NotApplicantError) {
          return reply.status(403).send({ error: "Forbidden", message: err.message, statusCode: 403 });
        }
        if (err instanceof IllegalApplicationTransitionError) {
          return reply.status(409).send({ error: "Conflict", message: err.message, statusCode: 409 });
        }
        throw err;
      }
    },
  );
}
