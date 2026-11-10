import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { findOwnCreator } from "../lib/ownership.js";
import {
  getOrCreateMediaKit,
  regenerateMediaKit,
  applyMediaKitUpload,
  revertMediaKitToAuto,
  getPublicMediaKitFile,
  MediaKitUploadTooLargeError,
  MediaKitNotAPdfError,
  MediaKitInfectedError,
  MediaKitFileMissingError,
} from "../services/mediaKit.js";
import { track } from "../lib/analytics/index.js";

/**
 * Media Kit routes (features.md Phase 12A.1). Registered on its own
 * encapsulated plugin instance (mirrors routes/webhooks.ts) so the
 * `application/pdf` content-type parser it needs for raw-byte uploads doesn't
 * leak onto every other route.
 */
export async function mediaKitRoutes(app: FastifyInstance): Promise<void> {
  app.addContentTypeParser("application/pdf", { parseAs: "buffer" }, (_req, body, done) => {
    done(null, body);
  });

  // GET /creators/:id/media-kit.pdf — public, no auth. `:id` is the creator's
  // id, standing in for the real handle Phase 15's public-profile work will
  // introduce — see schema.prisma's TODO(conflict:X6)-style note on this
  // phase's PhysicalAttributes model for the same forward-reference.
  app.get(
    "/api/v1/creators/:id/media-kit.pdf",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        const { bytes, version } = await getPublicMediaKitFile(id);
        void track(
          "media_kit_downloaded",
          { kind: "media_kit", mode: "public" },
          { actor: "ANON", source: "API" },
        ).catch(() => {});
        return reply
          .header("Content-Type", "application/pdf")
          .header("Content-Disposition", `inline; filename="media-kit.pdf"`)
          .header("Cache-Control", `public, max-age=3600`)
          .header("ETag", `"v${version}"`)
          .send(bytes);
      } catch (err) {
        if (err instanceof MediaKitFileMissingError) {
          return reply.status(404).send({ error: "Not Found", message: "Media kit not available", statusCode: 404 });
        }
        // findUniqueOrThrow inside the service throws Prisma's own not-found error
        // for an unknown creator id — surfaced as a plain 404 either way.
        return reply.status(404).send({ error: "Not Found", message: `Creator "${id}" not found`, statusCode: 404 });
      }
    },
  );

  // GET /creators/me/media-kit — talent-facing status: which mode is live,
  // upload metadata if any, auto-render version/timestamp.
  app.get(
    "/api/v1/creators/me/media-kit",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }
      const kit = await getOrCreateMediaKit(creator.id);
      return reply.send(kit);
    },
  );

  // POST /creators/me/media-kit/regenerate — re-render the AUTO PDF from
  // current profile data and bump autoVersion (cache bust). Does not change
  // `mode` — regenerating while UPLOAD is active just refreshes the AUTO file
  // in the background for whenever the talent reverts to it.
  app.post(
    "/api/v1/creators/me/media-kit/regenerate",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }
      const kit = await regenerateMediaKit(creator);
      return reply.send(kit);
    },
  );

  // POST /creators/me/media-kit/upload — raw PDF bytes, content-type
  // application/pdf. Validates real magic bytes + 20MB cap + virus scan
  // before ever touching disk or flipping `mode` to UPLOAD.
  app.post(
    "/api/v1/creators/me/media-kit/upload",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const body = request.body;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Expected a non-empty application/pdf request body",
          statusCode: 400,
        });
      }

      try {
        const kit = await applyMediaKitUpload(creator.id, body);
        void track(
          "media_uploaded",
          { kind: "media_kit", mode: "UPLOAD" },
          { actor: "USER", actorId: request.user!.userId, source: "API" },
        ).catch(() => {});
        void track(
          "media_kit_mode_changed",
          { kind: "media_kit", mode: "UPLOAD" },
          { actor: "USER", actorId: request.user!.userId, source: "API" },
        ).catch(() => {});
        return reply.send(kit);
      } catch (err) {
        if (err instanceof MediaKitUploadTooLargeError) {
          return reply.status(413).send({ error: "Payload Too Large", message: err.message, statusCode: 413 });
        }
        if (err instanceof MediaKitNotAPdfError || err instanceof MediaKitInfectedError) {
          return reply.status(400).send({ error: "Bad Request", message: err.message, statusCode: 400 });
        }
        throw err;
      }
    },
  );

  // POST /creators/me/media-kit/revert — back to AUTO, same public URL.
  app.post(
    "/api/v1/creators/me/media-kit/revert",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }
      const kit = await revertMediaKitToAuto(creator.id);
      void track(
        "media_kit_mode_changed",
        { kind: "media_kit", mode: "AUTO" },
        { actor: "USER", actorId: request.user!.userId, source: "API" },
      ).catch(() => {});
      return reply.send(kit);
    },
  );
}
