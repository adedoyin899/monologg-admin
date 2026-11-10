import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { findOwnClient } from "../lib/ownership.js";
import { paginationQuerySchema, paginate, toSkipTake } from "../lib/pagination.js";
import { formatMoney, nicheLabel, initials } from "../lib/display.js";
import {
  shortlistApplication,
  rejectApplication,
  selectApplication,
  BriefNotFoundError,
  NotApplicationOwnerError,
  IllegalApplicationTransitionError,
} from "../services/applications.js";
import { BookingNotPayableError } from "../services/payment.js";
import { SlotUnavailableError } from "../services/availability.js";
import { track } from "../lib/analytics/index.js";

// Maps a real Brief row to the display shape apps/web's ClientProject type
// expects. `applicants` is a real count (features.md Phase 14) — before that
// phase this was honestly 0, not a fabricated number.
function mapBriefToClientProject(brief: {
  id: string;
  projectName: string;
  projectType: string;
  budgetAmount: number;
  budgetCurrency: string;
  status: string;
  createdAt: Date;
  applicantCap: number | null;
  applicationsOpen: boolean;
  _count: { applications: number };
}) {
  return {
    id: brief.id,
    name: brief.projectName,
    niche: brief.projectType,
    budget: formatMoney(brief.budgetAmount, brief.budgetCurrency),
    status: brief.status.toLowerCase(),
    applicants: brief._count.applications,
    applicantCap: brief.applicantCap,
    applicationsOpen: brief.applicationsOpen,
    posted: brief.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

const NICHE_VALUES = ["ACTOR", "VO_ARTIST", "COMEDIAN", "COMPERE", "SPEAKER_PASTOR", "MUSICIAN", "CONTENT_CREATOR"] as const;
const STATUS_VALUES = ["DRAFT", "ACTIVE", "IN_REVIEW", "CLOSED"] as const;

const briefSchema = z.object({
  projectName: z.string().min(1),
  projectType: z.string().min(1),
  nicheReq: z.array(z.enum(NICHE_VALUES)),
  budgetAmount: z.number().int().nonnegative(),
  budgetCurrency: z.string().min(1),
  status: z.enum(STATUS_VALUES).optional(),
  // features.md Phase 14 (X4): null/omitted = uncapped. applicationsOpen is
  // never client-settable — only services/applications.ts flips it.
  applicantCap: z.number().int().positive().nullable().optional(),
});

const selectSchema = z.object({
  rateCardId: z.string().min(1),
  slotDate: z.coerce.date(),
  slotStart: z.string().min(1),
  slotEnd: z.string().min(1),
});

export async function briefRoutes(app: FastifyInstance): Promise<void> {
  // GET /briefs — the authenticated client's own briefs, paginated.
  app.get(
    "/api/v1/briefs",
    { preHandler: [requireAuth, requireRole("CLIENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const client = await findOwnClient(request.user!.userId);
      if (!client) {
        return reply.status(404).send({ error: "Not Found", message: "No client profile for this user", statusCode: 404 });
      }

      const query = paginationQuerySchema.parse(request.query);
      const { skip, take } = toSkipTake(query);
      const where = { clientId: client.id };

      const [briefs, total] = await Promise.all([
        prisma.brief.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { applications: true } } },
        }),
        prisma.brief.count({ where }),
      ]);

      return reply.send(paginate(briefs.map(mapBriefToClientProject), total, query));
    },
  );

  // POST /briefs — create a brief owned by the authenticated client.
  app.post(
    "/api/v1/briefs",
    { preHandler: [requireAuth, requireRole("CLIENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const client = await findOwnClient(request.user!.userId);
      if (!client) {
        return reply.status(404).send({ error: "Not Found", message: "No client profile for this user", statusCode: 404 });
      }

      const parsed = briefSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const brief = await prisma.brief.create({
        data: { ...parsed.data, clientId: client.id },
      });

      void track(
        "project_posted",
        { briefId: brief.id, cap: brief.applicantCap },
        { actor: "USER", actorId: request.user!.userId, source: "API" },
      ).catch(() => {});

      return reply.status(201).send(brief);
    },
  );

  // PATCH /briefs/:id — owner-scoped update.
  app.patch(
    "/api/v1/briefs/:id",
    { preHandler: [requireAuth, requireRole("CLIENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const client = await findOwnClient(request.user!.userId);
      if (!client) {
        return reply.status(404).send({ error: "Not Found", message: "No client profile for this user", statusCode: 404 });
      }

      const { id } = request.params as { id: string };
      const existing = await prisma.brief.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: `Brief "${id}" not found`, statusCode: 404 });
      }
      if (existing.clientId !== client.id) {
        return reply.status(403).send({ error: "Forbidden", message: "You do not own this brief", statusCode: 403 });
      }

      const parsed = briefSchema.partial().safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const updated = await prisma.brief.update({ where: { id }, data: parsed.data });
      return reply.send(updated);
    },
  );

  // GET /briefs/:id/applicants — brief-owner only (features.md Phase 14, PWA-17).
  // Every applicant's full profile summary + their pitch/status, so the client
  // can review and act (shortlist/reject/select) without a second round trip.
  app.get(
    "/api/v1/briefs/:id/applicants",
    { preHandler: [requireAuth, requireRole("CLIENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const client = await findOwnClient(request.user!.userId);
      if (!client) {
        return reply.status(404).send({ error: "Not Found", message: "No client profile for this user", statusCode: 404 });
      }

      const { id } = request.params as { id: string };
      const brief = await prisma.brief.findUnique({ where: { id } });
      if (!brief) {
        return reply.status(404).send({ error: "Not Found", message: `Brief "${id}" not found`, statusCode: 404 });
      }
      if (brief.clientId !== client.id) {
        return reply.status(403).send({ error: "Forbidden", message: "You do not own this brief", statusCode: 403 });
      }

      const applications = await prisma.application.findMany({
        where: { briefId: id },
        orderBy: { createdAt: "asc" },
        include: { creator: { include: { rateCards: { orderBy: { basePriceAmount: "asc" }, take: 1 } } } },
      });

      const applicants = applications.map((a) => ({
        applicationId: a.id,
        status: a.status,
        pitch: a.pitch,
        appliedAt: a.createdAt.toISOString(),
        creator: {
          id: a.creator.id,
          name: a.creator.name,
          role: nicheLabel(a.creator.niche),
          location: a.creator.location,
          avatar: initials(a.creator.name),
          verified: a.creator.verification === "VERIFIED",
          tags: a.creator.styleTags,
          price: a.creator.rateCards[0] ? formatMoney(a.creator.rateCards[0].basePriceAmount, a.creator.rateCards[0].basePriceCurrency) : "Contact for pricing",
        },
      }));

      return reply.send(applicants);
    },
  );

  // PATCH /applications/:id/shortlist — brief-owner only.
  app.patch(
    "/api/v1/applications/:id/shortlist",
    { preHandler: [requireAuth, requireRole("CLIENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        const updated = await shortlistApplication(id, request.user!.userId);
        void track(
          "applicant_shortlisted",
          { briefId: updated.briefId, cap: 0 },
          { actor: "USER", actorId: request.user!.userId, source: "API" },
        ).catch(() => {});
        return reply.send(updated);
      } catch (err) {
        if (err instanceof BriefNotFoundError) {
          return reply.status(404).send({ error: "Not Found", message: err.message, statusCode: 404 });
        }
        if (err instanceof NotApplicationOwnerError) {
          return reply.status(403).send({ error: "Forbidden", message: err.message, statusCode: 403 });
        }
        if (err instanceof IllegalApplicationTransitionError) {
          return reply.status(409).send({ error: "Conflict", message: err.message, statusCode: 409 });
        }
        throw err;
      }
    },
  );

  // PATCH /applications/:id/reject — brief-owner only.
  app.patch(
    "/api/v1/applications/:id/reject",
    { preHandler: [requireAuth, requireRole("CLIENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        const updated = await rejectApplication(id, request.user!.userId);
        void track(
          "applicant_rejected",
          { briefId: updated.briefId, cap: 0 },
          { actor: "USER", actorId: request.user!.userId, source: "API" },
        ).catch(() => {});
        return reply.send(updated);
      } catch (err) {
        if (err instanceof BriefNotFoundError) {
          return reply.status(404).send({ error: "Not Found", message: err.message, statusCode: 404 });
        }
        if (err instanceof NotApplicationOwnerError) {
          return reply.status(403).send({ error: "Forbidden", message: err.message, statusCode: 403 });
        }
        if (err instanceof IllegalApplicationTransitionError) {
          return reply.status(409).send({ error: "Conflict", message: err.message, statusCode: 409 });
        }
        throw err;
      }
    },
  );

  // PATCH /applications/:id/select — brief-owner only. Converts the winning
  // application into a real booking; the client picks which of the talent's
  // rate cards and which real open slot this engagement is for (the exact
  // same server-authoritative inputs POST /bookings takes — see
  // services/applications.ts's own doc comment on why this isn't a parallel
  // booking-creation path).
  app.patch(
    "/api/v1/applications/:id/select",
    { preHandler: [requireAuth, requireRole("CLIENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const parsed = selectSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const application = await prisma.application.findUnique({ where: { id }, select: { creatorId: true } });
      if (!application) {
        return reply.status(404).send({ error: "Not Found", message: `Application "${id}" not found`, statusCode: 404 });
      }

      const rateCard = await prisma.rateCard.findUnique({ where: { id: parsed.data.rateCardId } });
      if (!rateCard || rateCard.creatorId !== application.creatorId) {
        return reply.status(400).send({ error: "Bad Request", message: "rateCardId does not belong to the applicant", statusCode: 400 });
      }

      try {
        const result = await selectApplication(id, request.user!.userId, {
          rateCardId: rateCard.id,
          baseAmount: rateCard.basePriceAmount,
          currency: rateCard.basePriceCurrency,
          slotDate: parsed.data.slotDate,
          slotStart: parsed.data.slotStart,
          slotEnd: parsed.data.slotEnd,
        });

        void track(
          "applicant_selected",
          { briefId: result.application.briefId, cap: 0 },
          { actor: "USER", actorId: request.user!.userId, source: "API" },
        ).catch(() => {});

        return reply.send(result);
      } catch (err) {
        if (err instanceof BriefNotFoundError) {
          return reply.status(404).send({ error: "Not Found", message: err.message, statusCode: 404 });
        }
        if (err instanceof NotApplicationOwnerError) {
          return reply.status(403).send({ error: "Forbidden", message: err.message, statusCode: 403 });
        }
        if (err instanceof IllegalApplicationTransitionError) {
          return reply.status(409).send({ error: "Conflict", message: err.message, statusCode: 409 });
        }
        if (err instanceof SlotUnavailableError || err instanceof BookingNotPayableError) {
          return reply.status(409).send({ error: "Conflict", message: err.message, statusCode: 409 });
        }
        throw err;
      }
    },
  );
}
