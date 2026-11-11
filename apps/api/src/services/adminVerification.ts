import { createHmac } from "crypto";
import type { Prisma, VerificationRecordingStatus } from "@prisma/client";
import { prisma } from "../db/client.js";
import { env } from "../config/env.js";
import { audit } from "./adminAudit.js";
import { maskEmail, maskName, maskPhone } from "../lib/masking.js";
import {
  isVerificationOverdue,
  getRemainingSlaHours,
  VERIFICATION_CHECKLIST,
  RE_RECORD_TEMPLATES,
  type ReRecordReasonTemplate,
} from "../config/verificationRules.js";
import {
  reviewVerificationRecording,
  RecordingNotFoundError,
} from "./verificationRecording.js";
import { hasPermission } from "../config/adminPermissions.js";
import { notifyProvider } from "../providers/index.js";
import { enqueueEmailNotification } from "./notifications.js";
import type {
  VerificationQueueItem,
  VerificationDetail,
  VerificationMetrics,
  VerificationDecisionInput,
} from "@monologg/types";

export interface AdminUserContext {
  id: string;
  email: string;
  role: string;
}

export interface ListVerificationQueueQuery {
  status?: string;
  niche?: string;
  search?: string;
  isOverdue?: boolean;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  limit?: number;
}

export class VerificationPermissionError extends Error {
  statusCode = 403;
  constructor(message = "Insufficient permissions for verification actions") {
    super(message);
    this.name = "VerificationPermissionError";
  }
}

export class VerificationValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "VerificationValidationError";
  }
}

/**
 * Lists verification recordings for the admin queue (AD-26).
 */
export async function listVerificationQueue(query: ListVerificationQueueQuery): Promise<{
  items: VerificationQueueItem[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}> {
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
  const where: Prisma.VerificationRecordingWhereInput = {};

  if (query.status && query.status !== "ALL") {
    if (query.status === "ACTIVE") {
      where.status = { in: ["UPLOADED", "IN_REVIEW"] };
    } else {
      where.status = query.status as VerificationRecordingStatus;
    }
  }

  if (query.niche) {
    where.creator = {
      niche: query.niche as any,
    };
  }

  if (query.search) {
    where.OR = [
      { creator: { name: { contains: query.search, mode: "insensitive" } } },
      { creator: { user: { email: { contains: query.search, mode: "insensitive" } } } },
    ];
  }

  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
    if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
  }

  if (query.isOverdue) {
    const overdueThreshold = new Date(Date.now() - 48 * 3600 * 1000);
    where.status = { in: ["UPLOADED", "IN_REVIEW"] };
    where.createdAt = {
      ...(where.createdAt as Prisma.DateTimeFilter),
      lte: overdueThreshold,
    };
  }

  const total = await prisma.verificationRecording.count({ where });

  const recordings = await prisma.verificationRecording.findMany({
    where,
    take: limit + 1,
    orderBy: { createdAt: "asc" }, // Oldest first to prioritize SLA
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    include: {
      creator: {
        include: {
          user: true,
        },
      },
    },
  });

  const hasMore = recordings.length > limit;
  const pageItems = hasMore ? recordings.slice(0, limit) : recordings;
  const nextCursor = hasMore ? pageItems[pageItems.length - 1].id : null;

  const items: VerificationQueueItem[] = pageItems.map((rec) => {
    const now = Date.now();
    const createdTime = rec.createdAt.getTime();
    const ageHours = Math.round(((now - createdTime) / (3600 * 1000)) * 10) / 10;
    const isOverdue = (rec.status === "UPLOADED" || rec.status === "IN_REVIEW") && isVerificationOverdue(rec.createdAt);
    const slaRemainingHours = getRemainingSlaHours(rec.createdAt);

    return {
      id: rec.id,
      creatorId: rec.creatorId,
      creatorName: maskName(rec.creator.name),
      creatorNiche: rec.creator.niche,
      creatorLocation: rec.creator.location,
      creatorAvatarUrl: rec.creator.avatarUrl,
      status: rec.status,
      durationSec: rec.durationSec,
      guidelineAck: rec.guidelineAck,
      reviewerNote: rec.reviewerNote,
      createdAt: rec.createdAt.toISOString(),
      updatedAt: rec.updatedAt.toISOString(),
      ageHours,
      isOverdue,
      slaRemainingHours,
    };
  });

  return {
    items,
    total,
    hasMore,
    nextCursor,
  };
}

/**
 * Gets recording detail, automatically moving UPLOADED -> IN_REVIEW.
 * Includes masked user card and sanitized KYC panel facts (zero documents, zero raw payload).
 */
export async function getVerificationRecordingDetail(
  recordingId: string,
  admin: AdminUserContext,
  ip?: string,
): Promise<VerificationDetail> {
  const recording = await prisma.verificationRecording.findUnique({
    where: { id: recordingId },
    include: {
      creator: {
        include: {
          user: true,
          kycChecks: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      },
    },
  });

  if (!recording) {
    throw new RecordingNotFoundError(recordingId);
  }

  // Automatic transition: opening an UPLOADED recording transitions it to IN_REVIEW
  if (recording.status === "UPLOADED") {
    await prisma.verificationRecording.update({
      where: { id: recording.id },
      data: { status: "IN_REVIEW" },
    });
    recording.status = "IN_REVIEW";

    await audit({
      adminId: admin.id,
      action: "VERIFICATION_STATUS_CHANGED",
      targetType: "VerificationRecording",
      targetId: recording.id,
      reason: "Recording opened by reviewer; transitioned to IN_REVIEW",
      metadata: { from: "UPLOADED", to: "IN_REVIEW" },
      ip,
    });
  }

  const now = Date.now();
  const createdTime = recording.createdAt.getTime();
  const ageHours = Math.round(((now - createdTime) / (3600 * 1000)) * 10) / 10;
  const isOverdue = (recording.status === "IN_REVIEW" || (recording.status as string) === "UPLOADED") && isVerificationOverdue(recording.createdAt);

  // Guideline checklist evaluation
  const guidelineChecklist = VERIFICATION_CHECKLIST.map((item) => {
    if (item.id === "under_90_seconds") {
      const isPassed = recording.durationSec <= 90;
      return {
        id: item.id,
        label: `${item.label} (${recording.durationSec}s)`,
        passed: isPassed,
        hint: isPassed
          ? `Compliant (${recording.durationSec}s / 90s)`
          : `Exceeds 90s limit by ${recording.durationSec - 90}s`,
      };
    }
    return {
      id: item.id,
      label: item.label,
      passed: recording.guidelineAck,
      hint: item.description,
    };
  });

  // KYC Panel Facts - SANITIZED per PRD M9:
  // "show KycCheck provider status, attempts and failure reason code only.
  //  No documents, no raw provider payload, no PII beyond what is in the masked user card."
  const kycChecks = recording.creator.kycChecks || [];
  const latestKycCheck = kycChecks[0] ?? null;
  const attempts = kycChecks.length;
  let failureReasonCode: string | null = null;

  if (latestKycCheck && latestKycCheck.status === "FAILED") {
    const raw = latestKycCheck.raw as Record<string, any> | null;
    if (raw && typeof raw === "object") {
      failureReasonCode = raw.reasonCode || raw.ResultCode || raw.error_code || raw.code || "FAILED";
    } else {
      failureReasonCode = "FAILED";
    }
  }

  const kycPanel = {
    status: latestKycCheck ? latestKycCheck.status : "UNVERIFIED",
    attempts,
    provider: latestKycCheck?.provider ?? "smile_identity",
    failureReasonCode,
    lastAttemptAt: latestKycCheck?.createdAt ? latestKycCheck.createdAt.toISOString() : null,
  };

  return {
    id: recording.id,
    creatorId: recording.creatorId,
    creator: {
      id: recording.creator.id,
      userId: recording.creator.userId,
      name: maskName(recording.creator.name),
      niche: recording.creator.niche,
      location: recording.creator.location,
      avatarUrl: recording.creator.avatarUrl,
      maskedEmail: maskEmail(recording.creator.user.email),
      maskedPhone: maskPhone(recording.creator.user.phone),
      userCreatedAt: recording.creator.user.createdAt.toISOString(),
    },
    status: recording.status,
    durationSec: recording.durationSec,
    guidelineAck: recording.guidelineAck,
    reviewerNote: recording.reviewerNote,
    createdAt: recording.createdAt.toISOString(),
    updatedAt: recording.updatedAt.toISOString(),
    ageHours,
    isOverdue,
    guidelineChecklist,
    kycPanel,
  };
}

/**
 * Generates a short-lived signed URL (5 minutes) for video playback and writes MEDIA_VIEWED audit log.
 */
export async function getVerificationSignedUrl(
  recordingId: string,
  admin: AdminUserContext,
  ip?: string,
): Promise<{ id: string; signedUrl: string; expiresAt: string }> {
  const recording = await prisma.verificationRecording.findUnique({
    where: { id: recordingId },
  });

  if (!recording) {
    throw new RecordingNotFoundError(recordingId);
  }

  // 5-minute expiry
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const signature = createHmac("sha256", env.JWT_ACCESS_SECRET)
    .update(`${recording.id}:${expiresAt}`)
    .digest("hex");
  const signedUrl = `${recording.url}?exp=${encodeURIComponent(expiresAt)}&sig=${signature}`;

  // Audited as MEDIA_VIEWED
  await audit({
    adminId: admin.id,
    action: "MEDIA_VIEWED",
    targetType: "VerificationRecording",
    targetId: recording.id,
    reason: "Verification recording video playback initiated",
    metadata: { expiresAt },
    ip,
  });

  return {
    id: recording.id,
    signedUrl,
    expiresAt,
  };
}

/**
 * Submits a reviewer decision (APPROVE or NEEDS_RERECORD).
 *
 * X3 GUARDRAIL:
 * NEVER writes Creator.verification or KycCheck. Presentation recording review
 * is strictly decoupled from identity KYC.
 */
export async function decideVerificationRecording(
  recordingId: string,
  admin: AdminUserContext,
  input: VerificationDecisionInput,
  ip?: string,
): Promise<any> {
  // Permission gate: COMPLIANCE and SUPER_ADMIN only
  if (!hasPermission(admin.role as any, "verifications", "write")) {
    throw new VerificationPermissionError(
      `Role ${admin.role} is not permitted to review or decide verification recordings`,
    );
  }

  if (input.decision !== "APPROVE" && input.decision !== "NEEDS_RERECORD") {
    throw new VerificationValidationError(
      `Invalid decision "${input.decision}". Must be APPROVE or NEEDS_RERECORD`,
    );
  }

  if (input.decision === "NEEDS_RERECORD" && !input.reasonTemplate) {
    throw new VerificationValidationError(
      "A reason template is required when requesting a re-record",
    );
  }

  const recording = await prisma.verificationRecording.findUnique({
    where: { id: recordingId },
    include: {
      creator: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!recording) {
    throw new RecordingNotFoundError(recordingId);
  }

  // X3 Guardrail Pre-state capture
  const preCreatorVerification = recording.creator.verification;
  const preKycCount = await prisma.kycCheck.count({
    where: { creatorId: recording.creatorId },
  });

  // Prepare status and reviewer note
  const newStatus = input.decision === "APPROVE" ? "APPROVED" : "NEEDS_RERECORD";
  let combinedNote: string | undefined = undefined;

  if (input.reasonTemplate) {
    const templateInfo = RE_RECORD_TEMPLATES[input.reasonTemplate as ReRecordReasonTemplate];
    const templateLabel = templateInfo?.label ?? input.reasonTemplate;
    combinedNote = input.reviewerNote
      ? `[${input.reasonTemplate}] ${templateLabel}: ${input.reviewerNote}`
      : `[${input.reasonTemplate}] ${templateLabel}`;
  } else if (input.reviewerNote) {
    combinedNote = input.reviewerNote;
  }

  // Execute update through the existing verificationRecording service
  const updatedRecording = await reviewVerificationRecording(
    recording.id,
    newStatus,
    combinedNote,
  );

  // X3 Guardrail Post-state verification: ASSERT NO MUTATION to Creator.verification or KycCheck
  const postCreator = await prisma.creator.findUnique({
    where: { id: recording.creatorId },
  });
  const postKycCount = await prisma.kycCheck.count({
    where: { creatorId: recording.creatorId },
  });

  if (postCreator?.verification !== preCreatorVerification) {
    throw new Error(
      `X3 VIOLATION: Creator.verification mutated from ${preCreatorVerification} to ${postCreator?.verification}! Verification recordings must never change identity verification.`,
    );
  }

  if (postKycCount !== preKycCount) {
    throw new Error(
      `X3 VIOLATION: KycCheck rows mutated during VerificationRecording decision!`,
    );
  }

  // Audit decision
  await audit({
    adminId: admin.id,
    action: input.decision === "APPROVE" ? "VERIFICATION_APPROVED" : "VERIFICATION_NEEDS_RERECORD",
    targetType: "VerificationRecording",
    targetId: recording.id,
    reason: combinedNote || (input.decision === "APPROVE" ? "Approved by compliance" : "Needs re-record"),
    metadata: {
      decision: input.decision,
      reasonTemplate: input.reasonTemplate,
      reviewerNote: input.reviewerNote,
    },
    ip,
  });

  // Notifications (In-app and email to talent)
  const talentUserId = recording.creator.userId;
  const templateKind = input.decision === "APPROVE"
    ? "verification_recording_approved"
    : "verification_recording_needs_rerecord";

  const reasonLabel = input.reasonTemplate
    ? RE_RECORD_TEMPLATES[input.reasonTemplate as ReRecordReasonTemplate]?.label || input.reasonTemplate
    : undefined;

  // In-app notification
  await notifyProvider.inApp(talentUserId, {
    kind: templateKind,
    recordingId: recording.id,
    reason: reasonLabel,
    note: input.reviewerNote,
  }).catch((err) => {
    console.error("[adminVerification] Failed to send in-app notification:", err);
  });

  // Email notification
  await enqueueEmailNotification(talentUserId, templateKind, {
    creatorId: recording.creatorId,
    recordingId: recording.id,
    reason: reasonLabel,
    note: input.reviewerNote,
  }).catch((err) => {
    console.error("[adminVerification] Failed to enqueue email notification:", err);
  });

  return updatedRecording;
}

/**
 * Calculates verification queue metrics for Overview and Alerts (PRD M9 / AD-26).
 */
export async function getVerificationQueueMetrics(): Promise<VerificationMetrics> {
  const [
    pendingUploadedCount,
    inReviewCount,
    approvedCount,
    needsRerecordCount,
    overdueCount,
  ] = await Promise.all([
    prisma.verificationRecording.count({ where: { status: "UPLOADED" } }),
    prisma.verificationRecording.count({ where: { status: "IN_REVIEW" } }),
    prisma.verificationRecording.count({ where: { status: "APPROVED" } }),
    prisma.verificationRecording.count({ where: { status: "NEEDS_RERECORD" } }),
    prisma.verificationRecording.count({
      where: {
        status: { in: ["UPLOADED", "IN_REVIEW"] },
        createdAt: { lte: new Date(Date.now() - 48 * 3600 * 1000) },
      },
    }),
  ]);

  const totalReviewedCount = approvedCount + needsRerecordCount;
  const approvalRatePct = totalReviewedCount > 0
    ? Math.round((approvedCount / totalReviewedCount) * 100)
    : 100;

  // Calculate median review time (hours) for resolved recordings
  const resolved = await prisma.verificationRecording.findMany({
    where: { status: { in: ["APPROVED", "NEEDS_RERECORD"] } },
    select: { createdAt: true, updatedAt: true },
  });

  let medianReviewHours = 0;
  if (resolved.length > 0) {
    const durations = resolved
      .map((r) => (r.updatedAt.getTime() - r.createdAt.getTime()) / (3600 * 1000))
      .sort((a, b) => a - b);
    const mid = Math.floor(durations.length / 2);
    medianReviewHours = durations.length % 2 !== 0
      ? durations[mid]
      : (durations[mid - 1] + durations[mid]) / 2;
    medianReviewHours = Math.round(medianReviewHours * 10) / 10;
  }

  return {
    pendingUploadedCount,
    inReviewCount,
    overdueCount,
    approvedCount,
    needsRerecordCount,
    totalReviewedCount,
    approvalRatePct,
    medianReviewHours,
  };
}
