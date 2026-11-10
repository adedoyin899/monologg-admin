import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { findOwnCreator } from "../lib/ownership.js";
import { storageProvider } from "../providers/index.js";
import {
  startKycCheck,
  pollKycStatus,
  KycCheckInProgressError,
  KycAlreadyVerifiedError,
} from "../services/kyc.js";
import { confirmMediaUpload, TaggingAlreadyStartedError } from "../services/aiTagging.js";
import { getOpenSlots } from "../services/availability.js";
import { formatMoney } from "../lib/display.js";
import { getPublicStorefront, renderOgImageSvg, PublicProfileNotFoundError } from "../services/publicProfile.js";

const NICHE_VALUES = ["ACTOR", "VO_ARTIST", "COMEDIAN", "COMPERE", "SPEAKER_PASTOR", "MUSICIAN", "CONTENT_CREATOR"] as const;

// styleTags/verification are deliberately absent from this schema — X3: they're
// read-only here, written only by the AI-tagging job and KYC flow (Phase 7).
const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().optional(),
  location: z.string().min(1).optional(),
  niche: z.enum(NICHE_VALUES).optional(),
});

const MAX_UPLOAD_BYTES = 150 * 1024 * 1024; // 150MB, per features.md Phase 5

const presignSchema = z.object({
  kind: z.enum(["VIDEO", "AUDIO"]),
  sizeBytes: z.number().int().positive(),
});

// features.md Phase 7 — identity KYC input. Kept separate from every other
// schema in this file: it's the only endpoint allowed to move Creator.verification.
const kycDataSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().date(),
  country: z.string().length(2),
  idType: z.string().min(1),
  idNumber: z.string().min(1),
});

export async function creatorRoutes(app: FastifyInstance): Promise<void> {
  // GET /creators/me — own profile, including read-only styleTags/verification.
  app.get(
    "/api/v1/creators/me",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }
      return reply.send(creator);
    },
  );

  // PATCH /creators/me — update profile fields. styleTags/verification are never
  // accepted here (X3) — they aren't even in updateProfileSchema.
  app.patch(
    "/api/v1/creators/me",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const parsed = updateProfileSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const updated = await prisma.creator.update({ where: { id: creator.id }, data: parsed.data });
      return reply.send(updated);
    },
  );

  // POST /creators/me/media/presign — validate type (video/audio) and size (≤150MB),
  // then hand back a presigned upload. The API never accepts raw file bytes in the
  // JSON body — the caller PUTs directly to `uploadUrl`.
  app.post(
    "/api/v1/creators/me/media/presign",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const parsed = presignSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const { kind, sizeBytes } = parsed.data;
      if (sizeBytes > MAX_UPLOAD_BYTES) {
        return reply.status(400).send({
          error: "Bad Request",
          message: `File too large: ${sizeBytes} bytes exceeds the 150MB limit`,
          statusCode: 400,
        });
      }

      const presigned = await storageProvider.createPresignedUpload({
        ownerId: creator.id,
        kind,
        sizeBytes,
      });

      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          creatorId: creator.id,
          kind,
          url: presigned.fileUrl,
          sizeBytes,
        },
      });

      return reply.status(201).send({ ...presigned, mediaAssetId: mediaAsset.id });
    },
  );

  // GET /creators/me/media/:id — polled by the client to drive the real
  // queued -> tagging -> done/failed UI state (features.md Phase 7). No fixed
  // timer: this is the actual job status.
  app.get(
    "/api/v1/creators/me/media/:id",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const { id } = request.params as { id: string };
      const asset = await prisma.mediaAsset.findUnique({ where: { id } });
      if (!asset || asset.creatorId !== creator.id) {
        return reply.status(404).send({ error: "Not Found", message: `Media asset "${id}" not found`, statusCode: 404 });
      }

      return reply.send(asset);
    },
  );

  // POST /creators/me/media/:id/confirm — call once the client has finished
  // PUTting the file to the presigned URL. Enqueues the AI style-tagging job.
  // X3: writes ONLY to MediaAsset.taggingStatus / Creator.styleTags — never
  // Creator.verification. See services/aiTagging.ts.
  app.post(
    "/api/v1/creators/me/media/:id/confirm",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const { id } = request.params as { id: string };
      const asset = await prisma.mediaAsset.findUnique({ where: { id } });
      if (!asset || asset.creatorId !== creator.id) {
        return reply.status(404).send({ error: "Not Found", message: `Media asset "${id}" not found`, statusCode: 404 });
      }

      try {
        const updated = await confirmMediaUpload(asset);
        return reply.status(202).send(updated);
      } catch (err) {
        if (err instanceof TaggingAlreadyStartedError) {
          return reply.status(409).send({ error: "Conflict", message: err.message, statusCode: 409 });
        }
        throw err;
      }
    },
  );

  // POST /creators/me/verify — starts identity KYC via KycProvider (Smile
  // Identity). The Verified badge reflects ONLY this flow (features.md Phase 7,
  // X3). Never touches styleTags — see services/kyc.ts.
  app.post(
    "/api/v1/creators/me/verify",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const parsed = kycDataSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      try {
        const check = await startKycCheck(creator, parsed.data);
        return reply.status(202).send({ verification: "PROCESSING", check });
      } catch (err) {
        if (err instanceof KycCheckInProgressError || err instanceof KycAlreadyVerifiedError) {
          return reply.status(409).send({ error: "Conflict", message: err.message, statusCode: 409 });
        }
        throw err;
      }
    },
  );

  // GET /creators/me/verify — polls the latest KYC check's current status,
  // updating the badge only on a real PROCESSING -> VERIFIED|FAILED transition.
  app.get(
    "/api/v1/creators/me/verify",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const result = await pollKycStatus(creator);
      return reply.send(result);
    },
  );

  // GET /creators/:id/open-slots?date=YYYY-MM-DD — public, no auth (features.md
  // Phase 13). The booking sheet's ONLY source for what's bookable — the client
  // never computes availability itself, it just renders this response.
  app.get(
    "/api/v1/creators/:id/open-slots",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const query = z.object({ date: z.coerce.date() }).safeParse(request.query);
      if (!query.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: query.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const creator = await prisma.creator.findUnique({ where: { id }, select: { id: true } });
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: `Creator "${id}" not found`, statusCode: 404 });
      }

      const openSlots = await getOpenSlots(id, query.data.date);
      return reply.send({ date: query.data.date.toISOString().slice(0, 10), openSlots });
    },
  );

  // GET /creators/:id/rate-cards — public, no auth. The read-only counterpart
  // to the owner-scoped /rate-cards (routes/rateCards.ts) — lets a client
  // (or the external-visitor flow, Phase 16) see what a specific talent
  // sells and its price, without exposing anything owner-only.
  app.get(
    "/api/v1/creators/:id/rate-cards",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const creator = await prisma.creator.findUnique({ where: { id }, select: { id: true } });
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: `Creator "${id}" not found`, statusCode: 404 });
      }

      const rateCards = await prisma.rateCard.findMany({ where: { creatorId: id }, orderBy: { basePriceAmount: "asc" } });
      return reply.send(
        rateCards.map((rc) => ({
          id: rc.id,
          title: rc.serviceTitle,
          price: formatMoney(rc.basePriceAmount, rc.basePriceCurrency),
          basePriceAmount: rc.basePriceAmount,
          basePriceCurrency: rc.basePriceCurrency,
          delivery: rc.deliveryTimeline,
        })),
      );
    },
  );

  // GET /creators/:id/public — the full public storefront (features.md Phase 15,
  // FA-3): monologg.co/[handle], reachable logged out, no account required.
  // Only ever returns public profile data — see services/publicProfile.ts's
  // own doc comment for the exact guardrail.
  app.get(
    "/api/v1/creators/:id/public",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        const profile = await getPublicStorefront(id);
        return reply.send(profile);
      } catch (err) {
        if (err instanceof PublicProfileNotFoundError) {
          return reply.status(404).send({ error: "Not Found", message: err.message, statusCode: 404 });
        }
        throw err;
      }
    },
  );

  // GET /creators/:id/og-image.svg — public, no auth. A real, data-derived
  // (initials-mark) image for the `og:image`/`twitter:image` tags the public
  // storefront sets client-side — see services/publicProfile.ts's doc comment
  // on why this stands in for a real headshot no phase's schema stores.
  app.get(
    "/api/v1/creators/:id/og-image.svg",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const creator = await prisma.creator.findUnique({ where: { id }, select: { name: true } });
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: `Creator "${id}" not found`, statusCode: 404 });
      }

      const svg = renderOgImageSvg(creator.name);
      return reply
        .header("Content-Type", "image/svg+xml")
        .header("Cache-Control", "public, max-age=3600")
        .send(svg);
    },
  );
}
