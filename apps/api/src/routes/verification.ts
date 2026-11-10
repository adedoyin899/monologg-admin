import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { findOwnCreator } from "../lib/ownership.js";
import {
  acknowledgeGuidelines,
  uploadVerificationRecording,
  getLatestVerificationRecording,
  reviewVerificationRecording,
  GuidelinesNotAcknowledgedError,
  RecordingTooLongError,
  RecordingUploadTooLargeError,
  InvalidRecordingFileError,
  InvalidReviewStatusError,
  RecordingNotFoundError,
} from "../services/verificationRecording.js";
import { track } from "../lib/analytics/index.js";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "NEEDS_RERECORD"]),
  reviewerNote: z.string().optional(),
});

/**
 * Verification video routes (features.md Phase 12A.2). Registered on its own
 * encapsulated plugin instance for the same reason routes/mediaKit.ts is —
 * the `video/mp4` raw-byte content-type parser shouldn't leak onto other routes.
 */
export async function verificationRoutes(app: FastifyInstance): Promise<void> {
  app.addContentTypeParser("video/mp4", { parseAs: "buffer" }, (_req, body, done) => {
    done(null, body);
  });

  // POST /creators/me/verification/guideline-ack — BLOCKS the record CTA
  // client-side until this has been called; the upload endpoint below
  // enforces it server-side too (never trusts the client alone).
  app.post(
    "/api/v1/creators/me/verification/guideline-ack",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }
      await acknowledgeGuidelines(creator.id);
      void track(
        "verification_recording_started",
        { durationSec: 0 },
        { actor: "USER", actorId: request.user!.userId, source: "API" },
      ).catch(() => {});
      return reply.status(204).send();
    },
  );

  // POST /creators/me/verification/upload — raw video bytes, content-type
  // video/mp4. Server-authoritative duration check: a client-side 90s cap on
  // the recorder UI is guidance only, never trusted here.
  app.post(
    "/api/v1/creators/me/verification/upload",
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
          message: "Expected a non-empty video/mp4 request body",
          statusCode: 400,
        });
      }

      try {
        const recording = await uploadVerificationRecording(creator.id, body);
        void track(
          "verification_recording_submitted",
          { durationSec: Math.round(recording.durationSec) },
          { actor: "USER", actorId: request.user!.userId, source: "API" },
        ).catch(() => {});
        return reply.status(201).send(recording);
      } catch (err) {
        if (err instanceof RecordingUploadTooLargeError) {
          return reply.status(413).send({ error: "Payload Too Large", message: err.message, statusCode: 413 });
        }
        if (err instanceof GuidelinesNotAcknowledgedError || err instanceof InvalidRecordingFileError) {
          return reply.status(400).send({ error: "Bad Request", message: err.message, statusCode: 400 });
        }
        if (err instanceof RecordingTooLongError) {
          void track(
            "verification_recording_rejected_too_long",
            { durationSec: Math.round(err.durationSec) },
            { actor: "USER", actorId: request.user!.userId, source: "API" },
          ).catch(() => {});
          // A distinct, clearly-named error shape (not just a generic 400) so
          // the recorder UI can show "re-record" guidance specifically, per
          // the spec's "reject with clear message + re-record CTA".
          return reply.status(422).send({
            error: "Recording Too Long",
            message: err.message,
            statusCode: 422,
            durationSec: err.durationSec,
            reRecord: true,
          });
        }
        throw err;
      }
    },
  );

  // GET /creators/me/verification — talent-facing status of their latest recording.
  app.get(
    "/api/v1/creators/me/verification",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }
      const recording = await getLatestVerificationRecording(creator.id);
      return reply.send(recording);
    },
  );

  // PATCH /verification-recordings/:id/review — reviewer decision.
  // KNOWN GAP, same shape as Phase 6's dispute/refund endpoint: no admin/
  // moderator role exists in any phase through 12A, so this is gated to
  // requireAuth only (any authenticated user) rather than a real reviewer
  // role — flagged here, in apps/api/README.md, and in handoff/log.md, not
  // silently assumed away. A real moderation-role system is future work.
  app.patch(
    "/api/v1/verification-recordings/:id/review",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const parsed = reviewSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      try {
        const recording = await reviewVerificationRecording(id, parsed.data.status, parsed.data.reviewerNote);
        return reply.send(recording);
      } catch (err) {
        if (err instanceof RecordingNotFoundError) {
          return reply.status(404).send({ error: "Not Found", message: err.message, statusCode: 404 });
        }
        if (err instanceof InvalidReviewStatusError) {
          return reply.status(400).send({ error: "Bad Request", message: err.message, statusCode: 400 });
        }
        throw err;
      }
    },
  );
}
