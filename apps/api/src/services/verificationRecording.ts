import { prisma } from "../db/client.js";
import { cacheProvider } from "../providers/cache.js";
import { getMp4DurationSeconds, InvalidMp4Error } from "../lib/videoDuration.js";
import { writeVerificationRecordingFile } from "../lib/verificationStorage.js";

// Verification video service (features.md Phase 12A.2). Deliberately its own
// system, with zero coupling to KycCheck/Creator.verification — same X3-shaped
// invariant as Phase 7 (identity KYC) vs. AI style-tagging, applied to a new
// axis: this is PERFORMANCE review, never identity. See prisma/schema.prisma's
// VerificationRecording docstring.

export const MAX_RECORDING_SECONDS = 90;
// Not named in the PRD (only the duration cap is) — a basic size sanity bound
// so an absurdly large upload doesn't get fully buffered before duration is
// even checked. Generous for a <=90s video at any normal mobile-recording
// bitrate; adjust if a real deploy's recording quality needs more headroom.
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

const GUIDELINE_ACK_PREFIX = "verification_guideline_ack:";
const GUIDELINE_ACK_TTL_SECONDS = 60 * 60; // 1 hour to actually record and upload

export class GuidelinesNotAcknowledgedError extends Error {
  constructor() {
    super("Pre-record guidelines must be acknowledged before uploading — call the guideline-ack endpoint first");
    this.name = "GuidelinesNotAcknowledgedError";
  }
}
export class RecordingTooLongError extends Error {
  constructor(public readonly durationSec: number) {
    super(`Recording is ${durationSec}s, exceeding the ${MAX_RECORDING_SECONDS}s cap — please re-record`);
    this.name = "RecordingTooLongError";
  }
}
export class RecordingUploadTooLargeError extends Error {
  constructor(sizeBytes: number) {
    super(`Upload is ${sizeBytes} bytes, exceeding the ${MAX_UPLOAD_BYTES}-byte cap`);
    this.name = "RecordingUploadTooLargeError";
  }
}
export class InvalidRecordingFileError extends Error {
  constructor(reason: string) {
    super(`Not a valid recording file: ${reason}`);
    this.name = "InvalidRecordingFileError";
  }
}
export class InvalidReviewStatusError extends Error {
  constructor(status: string) {
    super(`A reviewer decision must be APPROVED or NEEDS_RERECORD, got "${status}"`);
    this.name = "InvalidReviewStatusError";
  }
}
export class RecordingNotFoundError extends Error {
  constructor(id: string) {
    super(`VerificationRecording "${id}" not found`);
    this.name = "RecordingNotFoundError";
  }
}

/** Pre-record checklist acknowledgement — BLOCKS the upload until called.
 * Cache-backed (mirrors services/calendar.ts's OAuth state-token pattern)
 * rather than a DB column: this is a short-lived "did they just tick the
 * box" flag, consumed by the very next upload, not a permanent fact about
 * the creator worth its own row. */
export async function acknowledgeGuidelines(creatorId: string): Promise<void> {
  await cacheProvider.set(`${GUIDELINE_ACK_PREFIX}${creatorId}`, "true", GUIDELINE_ACK_TTL_SECONDS);
}

/**
 * Validates and stores a verification recording upload. Order matters, same
 * principle as Media Kit's upload validation: size cap first (never fully
 * process something absurdly large), then parse (a real MP4 is required to
 * even read a duration), then the SERVER-AUTHORITATIVE duration check — a
 * client-side recorder cap is UX-only and never trusted here.
 */
export async function uploadVerificationRecording(creatorId: string, buffer: Buffer) {
  if (buffer.length > MAX_UPLOAD_BYTES) throw new RecordingUploadTooLargeError(buffer.length);

  const ack = await cacheProvider.get(`${GUIDELINE_ACK_PREFIX}${creatorId}`);
  if (ack !== "true") throw new GuidelinesNotAcknowledgedError();

  let durationSecExact: number;
  try {
    durationSecExact = getMp4DurationSeconds(buffer);
  } catch (err) {
    if (err instanceof InvalidMp4Error) throw new InvalidRecordingFileError(err.message);
    throw err;
  }

  if (durationSecExact > MAX_RECORDING_SECONDS) {
    throw new RecordingTooLongError(Math.round(durationSecExact));
  }

  const url = await writeVerificationRecordingFile(buffer);
  const recording = await prisma.verificationRecording.create({
    data: {
      creatorId,
      url,
      durationSec: Math.round(durationSecExact),
      guidelineAck: true,
      status: "IN_REVIEW",
    },
  });

  // One-time token, consumed — a second upload needs a fresh acknowledgement.
  await cacheProvider.del(`${GUIDELINE_ACK_PREFIX}${creatorId}`);

  return recording;
}

/** The talent-facing "current" recording — the same "latest row is authoritative"
 * pattern services/kyc.ts already uses for KycCheck, since creatorId isn't unique here. */
export async function getLatestVerificationRecording(creatorId: string) {
  return prisma.verificationRecording.findFirst({
    where: { creatorId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Reviewer decision. No admin/moderator role system exists in any phase
 * through 12A — same known, flagged gap as Phase 6's dispute/refund endpoint
 * ("no admin/adjudication flow exists in any phase yet, so either participant
 * can call it"). Gated at the route layer to requireAuth only (any
 * authenticated user); real moderator-only access control is future work,
 * not silently assumed to already exist.
 */
export async function reviewVerificationRecording(
  recordingId: string,
  status: "APPROVED" | "NEEDS_RERECORD",
  reviewerNote?: string,
) {
  if (status !== "APPROVED" && status !== "NEEDS_RERECORD") {
    throw new InvalidReviewStatusError(status);
  }
  const existing = await prisma.verificationRecording.findUnique({ where: { id: recordingId } });
  if (!existing) throw new RecordingNotFoundError(recordingId);

  return prisma.verificationRecording.update({
    where: { id: recordingId },
    data: { status, reviewerNote: reviewerNote ?? null },
  });
}
