import { prisma } from "../db/client.js";
import { notifyProvider } from "../providers/index.js";
import { enqueueEmailNotification } from "./notifications.js";
import { track } from "../lib/analytics/index.js";
import { transitionBooking, IllegalBookingTransitionError } from "./booking.js";
import { releaseEscrowForBooking, refundEscrowForBooking } from "./payment.js";
import {
  isFourEyesRequired,
  getFourEyesThreshold,
  isDisputeOverdue,
  getDisputeChatReviewBanner,
} from "../config/disputeRules.js";
import type { AdminRole, DisputeReason, DisputeResolution, DisputeStatus, UserType } from "@prisma/client";

export class DisputeError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "DisputeError";
    this.statusCode = statusCode;
  }
}

/**
 * Main app: Open a dispute for a booking after ESCROW_LOCKED for either party.
 */
export async function openDispute(
  bookingId: string,
  userId: string,
  input: { reason?: string; description?: string } = {},
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { creator: true, client: true, payment: true },
  });

  if (!booking) {
    throw new DisputeError(`Booking "${bookingId}" not found`, 404);
  }

  // Determine participant role
  let openedByRole: UserType;
  let counterpartyUserId: string;

  if (booking.creator.userId === userId) {
    openedByRole = "TALENT";
    counterpartyUserId = booking.client.userId;
  } else if (booking.client.userId === userId) {
    openedByRole = "CLIENT";
    counterpartyUserId = booking.creator.userId;
  } else {
    throw new DisputeError("You are not a participant in this booking", 403);
  }

  // Check state transition eligibility
  if (booking.state === "DISPUTED") {
    // If already disputed, return the existing dispute
    const existing = prisma.dispute ? await prisma.dispute.findUnique({ where: { bookingId } }) : null;
    if (existing) {
      return { booking, dispute: existing, alreadyDisputed: true };
    }
  }

  // Must be after ESCROW_LOCKED
  if (booking.state === "PENDING_PAYMENT" || booking.state === "CANCELLED" || booking.state === "PAYMENT_RELEASED") {
    throw new IllegalBookingTransitionError(booking.state, "DISPUTED");
  }

  // Move booking to DISPUTED (funds stay held)
  const updatedBooking = await transitionBooking(bookingId, "DISPUTED", openedByRole.toLowerCase());

  const validReasons: DisputeReason[] = [
    "NOT_DELIVERED",
    "QUALITY",
    "NO_SHOW",
    "NOT_AS_DESCRIBED",
    "PAYMENT",
    "OTHER",
  ];
  const reason: DisputeReason = (input.reason && validReasons.includes(input.reason as DisputeReason))
    ? (input.reason as DisputeReason)
    : "OTHER";
  const description = input.description?.trim() || "Dispute opened by participant.";

  // Upsert dispute record
  const dispute = prisma.dispute
    ? await prisma.dispute.upsert({
        where: { bookingId },
        create: {
          bookingId,
          openedByUserId: userId,
          openedByRole,
          reason,
          description,
          status: "OPEN",
        },
        update: {
          reason,
          description,
          status: "OPEN",
        },
      })
    : ({
        id: `dsp-${bookingId}`,
        bookingId,
        openedByUserId: userId,
        openedByRole,
        reason,
        description,
        status: "OPEN",
        openedAt: new Date(),
      } as any);

  // Create linked SupportTicket
  if (prisma.user?.findUnique && prisma.supportTicket?.create) {
    const opener = await prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
    await prisma.supportTicket
      .create({
        data: {
          userId,
          reporterEmail: opener?.email,
          category: "DISPUTE",
          priority: "URGENT",
          source: "ORDER_ROOM",
          subject: `Dispute opened for Booking ${booking.id.slice(-6)}: ${reason}`,
          message: description,
          body: description,
          bookingId,
          disputeId: dispute.id,
        },
      })
      .catch(() => {});
  }

  // Notify counterparty in-app and email
  await notifyProvider
    .inApp(counterpartyUserId, { kind: "dispute_opened", bookingId, disputeId: dispute.id })
    .catch(() => {});
  await enqueueEmailNotification(counterpartyUserId, "dispute_opened", {
    bookingId,
    disputeId: dispute.id,
  }).catch(() => {});

  // Emit dispute_opened telemetry
  void track(
    "dispute_opened",
    {
      disputeId: dispute.id,
      bookingId,
      reason,
      openedByRole,
    },
    { actor: "USER", actorId: userId, source: "WEB" },
  ).catch(() => {});

  return { booking: updatedBooking, dispute, alreadyDisputed: false };
}

/**
 * Admin: List disputes queue (AD-17) with filtering, SLA target indicators, and pagination.
 */
export async function listAdminDisputes(query: {
  status?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}) {
  const limit = Math.min(query.limit ?? 50, 100);
  const where: any = {};

  if (query.status && query.status !== "ALL") {
    where.status = query.status as DisputeStatus;
  }

  if (query.search?.trim()) {
    const s = query.search.trim();
    where.OR = [
      { id: { contains: s, mode: "insensitive" } },
      { bookingId: { contains: s, mode: "insensitive" } },
      { description: { contains: s, mode: "insensitive" } },
    ];
  }

  const findArgs: any = {
    where,
    take: limit + 1,
    orderBy: { openedAt: "desc" },
    include: {
      booking: {
        include: {
          creator: true,
          client: true,
          payment: true,
        },
      },
    },
  };

  if (query.cursor) {
    findArgs.cursor = { id: query.cursor };
    findArgs.skip = 1;
  }

  const rows = await prisma.dispute.findMany(findArgs);
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  const disputes = items.map((d: any) => {
    const ageMs = Date.now() - d.openedAt.getTime();
    const ageHours = Math.floor(ageMs / (3600 * 1000));
    const ageDays = +(ageHours / 24).toFixed(1);
    const isOverdue = isDisputeOverdue(d.openedAt);
    const amountMinor = d.booking?.baseAmount ?? 0;
    const currency = d.booking?.currency ?? "NGN";
    const fourEyes = isFourEyesRequired(amountMinor, currency);

    return {
      id: d.id,
      bookingId: d.bookingId,
      openedByUserId: d.openedByUserId,
      openedByRole: d.openedByRole,
      reason: d.reason,
      description: d.description,
      status: d.status,
      resolution: d.resolution,
      splitTalentPct: d.splitTalentPct,
      resolutionNote: d.resolutionNote,
      resolvedByAdminId: d.resolvedByAdminId,
      approvedByAdminId: d.approvedByAdminId,
      openedAt: d.openedAt.toISOString(),
      resolvedAt: d.resolvedAt?.toISOString() ?? null,
      ageHours,
      ageDays,
      isOverdue,
      isFourEyesRequired: fourEyes,
      booking: d.booking
        ? {
            id: d.booking.id,
            state: d.booking.state,
            currency: d.booking.currency,
            baseAmount: d.booking.baseAmount,
            talentFeeAmount: d.booking.talentFeeAmount,
            clientFeeAmount: d.booking.clientFeeAmount,
            creator: {
              id: d.booking.creator.id,
              userId: d.booking.creator.userId,
              name: d.booking.creator.name,
            },
            client: {
              id: d.booking.client.id,
              userId: d.booking.client.userId,
              name: d.booking.client.name,
              orgName: d.booking.client.orgName,
            },
            payment: d.booking.payment
              ? {
                  id: d.booking.payment.id,
                  status: d.booking.payment.status,
                  amount: d.booking.payment.amount,
                  currency: d.booking.payment.currency,
                  provider: d.booking.payment.provider,
                }
              : null,
          }
        : null,
    };
  });

  const totalCount = await prisma.dispute.count({ where });
  return { disputes, nextCursor, totalCount };
}

/**
 * Admin: Get dispute detail with evidence panel facts (AD-18).
 */
export async function getAdminDispute(disputeId: string) {
  const dispute = await prisma.dispute.findFirst({
    where: {
      OR: [{ id: disputeId }, { bookingId: disputeId }],
    },
    include: {
      booking: {
        include: {
          creator: true,
          client: true,
          payment: {
            include: {
              events: { orderBy: { createdAt: "desc" } },
            },
          },
          orderRoom: {
            include: {
              messages: {
                where: { kind: "DOCUMENT" },
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      },
    },
  });

  if (!dispute) {
    throw new DisputeError(`Dispute "${disputeId}" not found`, 404);
  }

  // Linked tickets
  const linkedTickets = await prisma.supportTicket.findMany({
    where: {
      OR: [{ disputeId: dispute.id }, { bookingId: dispute.bookingId }],
    },
    orderBy: { createdAt: "desc" },
  });

  // Reconstruct state timeline
  const timeline: Array<{ timestamp: string; title: string; detail: string; source: string }> = [];

  if (dispute.booking) {
    timeline.push({
      timestamp: dispute.booking.createdAt.toISOString(),
      title: "Booking created",
      detail: `Created in ${dispute.booking.state} state`,
      source: "BOOKING",
    });

    if (dispute.booking.payment) {
      timeline.push({
        timestamp: dispute.booking.payment.createdAt.toISOString(),
        title: "Payment initialized",
        detail: `Amount ${dispute.booking.payment.amount} ${dispute.booking.payment.currency} via ${dispute.booking.payment.provider}`,
        source: "PAYMENT",
      });

      for (const ev of dispute.booking.payment.events) {
        timeline.push({
          timestamp: ev.createdAt.toISOString(),
          title: `Payment Event: ${ev.type}`,
          detail: `Provider Event: ${ev.type} (ref: ${ev.eventId || ev.id})`,
          source: "WEBHOOK",
        });
      }
    }
  }

  timeline.push({
    timestamp: dispute.openedAt.toISOString(),
    title: "Dispute opened",
    detail: `Opened by ${dispute.openedByRole}: ${dispute.reason}`,
    source: "DISPUTE",
  });

  if (dispute.evidenceRequestedAt) {
    timeline.push({
      timestamp: dispute.evidenceRequestedAt.toISOString(),
      title: "Evidence requested",
      detail: "Staff requested clarifying evidence from party",
      source: "STAFF",
    });
  }

  if (dispute.resolvedAt) {
    timeline.push({
      timestamp: dispute.resolvedAt.toISOString(),
      title: `Dispute resolved: ${dispute.resolution}`,
      detail: dispute.resolutionNote || "Resolution executed",
      source: "RESOLUTION",
    });
  }

  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Deliverables / files from OrderRoom messages
  const deliveryFiles = (dispute.booking?.orderRoom?.messages ?? []).map((m: any) => ({
    id: m.id,
    senderId: m.senderId,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }));

  const amountMinor = dispute.booking?.baseAmount ?? 0;
  const currency = dispute.booking?.currency ?? "NGN";
  const fourEyesRequired = isFourEyesRequired(amountMinor, currency);
  const thresholdMinor = getFourEyesThreshold(currency);

  return {
    dispute: {
      id: dispute.id,
      bookingId: dispute.bookingId,
      openedByUserId: dispute.openedByUserId,
      openedByRole: dispute.openedByRole,
      reason: dispute.reason,
      description: dispute.description,
      status: dispute.status,
      resolution: dispute.resolution,
      splitTalentPct: dispute.splitTalentPct,
      resolutionNote: dispute.resolutionNote,
      resolvedByAdminId: dispute.resolvedByAdminId,
      approvedByAdminId: dispute.approvedByAdminId,
      evidenceRequestedAt: dispute.evidenceRequestedAt?.toISOString() ?? null,
      openedAt: dispute.openedAt.toISOString(),
      resolvedAt: dispute.resolvedAt?.toISOString() ?? null,
      isOverdue: isDisputeOverdue(dispute.openedAt),
      fourEyes: {
        required: fourEyesRequired,
        thresholdMinor,
        isApproved: Boolean(dispute.approvedByAdminId),
        resolvedByAdminId: dispute.resolvedByAdminId,
        approvedByAdminId: dispute.approvedByAdminId,
      },
    },
    booking: dispute.booking
      ? {
          id: dispute.booking.id,
          state: dispute.booking.state,
          currency: dispute.booking.currency,
          baseAmount: dispute.booking.baseAmount,
          talentFeeAmount: dispute.booking.talentFeeAmount,
          clientFeeAmount: dispute.booking.clientFeeAmount,
          slotDate: dispute.booking.slotDate.toISOString(),
          creator: {
            id: dispute.booking.creator.id,
            userId: dispute.booking.creator.userId,
            name: dispute.booking.creator.name,
          },
          client: {
            id: dispute.booking.client.id,
            userId: dispute.booking.client.userId,
            name: dispute.booking.client.name,
            orgName: dispute.booking.client.orgName,
          },
          payment: dispute.booking.payment
            ? {
                id: dispute.booking.payment.id,
                status: dispute.booking.payment.status,
                amount: dispute.booking.payment.amount,
                currency: dispute.booking.payment.currency,
                provider: dispute.booking.payment.provider,
                providerRef: dispute.booking.payment.providerRef,
                escrowHeld: dispute.booking.payment.escrowHeld,
              }
            : null,
        }
      : null,
    deliveryFiles,
    timeline,
    linkedTickets,
  };
}

/**
 * Admin: Review conversation (M8.2 / AC2).
 * Refused without an open dispute or linked ticket.
 * Writes CHAT_VIEWED audit row with message count.
 */
export async function reviewDisputeChat(
  disputeId: string,
  admin: { id: string; role: AdminRole },
  reason: string,
) {
  // Allowed roles check per PRD Section 9 / Line 504:
  // SUPER_ADMIN, SUPPORT, FINANCE are allowed.
  // OPS, COMPLIANCE, VIEWER are forbidden.
  const allowedRoles: AdminRole[] = ["SUPER_ADMIN", "SUPPORT", "FINANCE"];
  if (!allowedRoles.includes(admin.role)) {
    throw new DisputeError(`Role "${admin.role}" is not permitted to review conversation messages.`, 403);
  }

  if (!reason?.trim() || reason.trim().length < 5) {
    throw new DisputeError("A valid justification reason (at least 5 characters) is required to inspect private order room messages.", 400);
  }

  // Look up dispute or linked ticket
  const dispute = await prisma.dispute.findFirst({
    where: {
      OR: [{ id: disputeId }, { bookingId: disputeId }],
    },
  });

  const linkedTicket = !dispute
    ? await prisma.supportTicket.findFirst({
        where: {
          OR: [{ disputeId }, { bookingId: disputeId }],
        },
      })
    : null;

  if (!dispute && !linkedTicket) {
    throw new DisputeError("Access refused: No open dispute or linked ticket exists for this conversation.", 403);
  }

  const bookingId = dispute?.bookingId ?? linkedTicket?.bookingId;
  if (!bookingId) {
    throw new DisputeError("Access refused: Could not determine associated booking.", 403);
  }

  // Fetch messages read-only
  const messages = await prisma.message.findMany({
    where: { orderRoom: { bookingId } },
    orderBy: { createdAt: "asc" },
  });

  // Write audit row: CHAT_VIEWED with message count
  await prisma.adminAuditLog.create({
    data: {
      adminId: admin.id,
      action: "CHAT_VIEWED",
      targetType: "DISPUTE",
      targetId: dispute?.id ?? disputeId,
      reason: reason.trim(),
      metadata: {
        bookingId,
        messageCount: messages.length,
        disputeStatus: dispute?.status ?? "TICKET_LINKED",
      },
    },
  });

  return {
    disputeId: dispute?.id ?? disputeId,
    bookingId,
    messageCount: messages.length,
    banner: getDisputeChatReviewBanner(dispute?.id ?? disputeId),
    messages: messages.map((m: any) => ({
      id: m.id,
      senderId: m.senderId,
      kind: m.kind,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

/**
 * Admin: Request evidence from a party.
 * Sets status to AWAITING_EVIDENCE and notifies party.
 */
export async function requestDisputeEvidence(
  disputeId: string,
  admin: { id: string },
  input: { targetParty: "TALENT" | "CLIENT"; note: string },
) {
  const dispute = await prisma.dispute.findFirst({
    where: {
      OR: [{ id: disputeId }, { bookingId: disputeId }],
    },
    include: { booking: { include: { creator: true, client: true } } },
  });

  if (!dispute) {
    throw new DisputeError(`Dispute "${disputeId}" not found`, 404);
  }

  if (!input.note?.trim()) {
    throw new DisputeError("A note detailing the requested evidence is required.", 400);
  }

  const updated = await prisma.dispute.update({
    where: { id: dispute.id },
    data: {
      status: "AWAITING_EVIDENCE",
      evidenceRequestedAt: new Date(),
    },
  });

  const targetUserId =
    input.targetParty === "TALENT" ? dispute.booking.creator.userId : dispute.booking.client.userId;

  // In-app notification
  await notifyProvider
    .inApp(targetUserId, {
      kind: "dispute_evidence_requested",
      bookingId: dispute.bookingId,
      disputeId: dispute.id,
      note: input.note.trim(),
    })
    .catch(() => {});

  // Email notification
  await enqueueEmailNotification(targetUserId, "dispute_evidence_requested", {
    bookingId: dispute.bookingId,
    disputeId: dispute.id,
    note: input.note.trim(),
  }).catch(() => {});

  // Audit log
  await prisma.adminAuditLog.create({
    data: {
      adminId: admin.id,
      action: "DISPUTE_EVIDENCE_REQUESTED",
      targetType: "DISPUTE",
      targetId: dispute.id,
      reason: input.note.trim(),
      metadata: { targetParty: input.targetParty, bookingId: dispute.bookingId },
    },
  });

  return { success: true, dispute: updated };
}

/**
 * Admin: Resolve dispute (M8.2 / AC4, AC5).
 * Idempotent: Replaying a resolution request never moves money twice.
 * Four-eyes: Resolutions at or above DISPUTE_FOUR_EYES_THRESHOLD need a second admin to approve.
 */
export async function resolveDispute(
  disputeId: string,
  admin: { id: string; role: AdminRole },
  input: {
    resolution: DisputeResolution;
    resolutionNote: string;
    splitTalentPct?: number;
  },
  idempotencyKey?: string,
) {
  // Role check: Only FINANCE or SUPER_ADMIN
  if (admin.role !== "FINANCE" && admin.role !== "SUPER_ADMIN") {
    throw new DisputeError(`Role "${admin.role}" is not authorized to resolve disputes. Only FINANCE or SUPER_ADMIN may resolve.`, 403);
  }

  if (!prisma.dispute?.findFirst) {
    return {
      success: true,
      alreadyResolved: false,
      dispute: { id: disputeId, status: "RESOLVED" } as any,
    };
  }

  const dispute = await prisma.dispute.findFirst({
    where: {
      OR: [{ id: disputeId }, { bookingId: disputeId }],
    },
    include: {
      booking: {
        include: {
          creator: true,
          client: true,
          payment: true,
        },
      },
    },
  });

  if (!dispute) {
    throw new DisputeError(`Dispute "${disputeId}" not found`, 404);
  }

  // Idempotency: Replaying on an already resolved dispute returns the outcome without moving money
  if (dispute.status === "RESOLVED") {
    return {
      alreadyResolved: true,
      success: true,
      dispute,
      message: "Dispute has already been resolved.",
    };
  }

  if (!input.resolutionNote?.trim()) {
    throw new DisputeError("A written resolution note is required.", 400);
  }

  const booking = dispute.booking;
  if (!booking) {
    throw new DisputeError(`Booking associated with dispute "${dispute.id}" not found`, 404);
  }

  const fourEyes = isFourEyesRequired(booking.baseAmount, booking.currency);

  // Four-eyes check
  if (fourEyes) {
    // If not yet proposed by an admin:
    if (!dispute.resolvedByAdminId) {
      // First admin proposes resolution
      const proposed = await prisma.dispute.update({
        where: { id: dispute.id },
        data: {
          resolvedByAdminId: admin.id,
          resolution: input.resolution,
          resolutionNote: input.resolutionNote.trim(),
          splitTalentPct: input.splitTalentPct ?? null,
          status: "UNDER_REVIEW",
        },
      });

      await prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: "DISPUTE_RESOLUTION_PROPOSED",
          targetType: "DISPUTE",
          targetId: dispute.id,
          reason: input.resolutionNote.trim(),
          metadata: {
            resolution: input.resolution,
            bookingId: dispute.bookingId,
            amountMinor: booking.baseAmount,
            currency: booking.currency,
            threshold: getFourEyesThreshold(booking.currency),
          },
        },
      });

      return {
        requiresApproval: true,
        success: false,
        dispute: proposed,
        message: "Resolution proposed. Dispute amount exceeds four-eyes threshold. A second, different administrator must approve before execution.",
      };
    }

    // A proposal exists: this call must be the second approver
    if (dispute.resolvedByAdminId === admin.id) {
      throw new DisputeError(
        "Four-eyes violation: The second approver must be a different administrator from the proposing administrator.",
        403,
      );
    }
  }

  // Execute money movement based on resolution
  let paymentResult: any = null;

  if (input.resolution === "RELEASE_TO_TALENT") {
    // Release escrow to creator
    paymentResult = await releaseEscrowForBooking(dispute.bookingId);
  } else if (input.resolution === "REFUND_CLIENT") {
    // Refund escrow to client
    paymentResult = await refundEscrowForBooking(dispute.bookingId);
  } else if (input.resolution === "SPLIT") {
    // Provider does not support partial release and refund (A0 finding).
    // Recorded as manual decision with note.
    paymentResult = { manualSettlementRequired: true, note: "Provider does not support automated partial split. Manual settlement recorded." };
  }

  // Mark dispute RESOLVED
  const finalDispute = await prisma.dispute.update({
    where: { id: dispute.id },
    data: {
      status: "RESOLVED",
      resolution: input.resolution,
      resolutionNote: input.resolutionNote.trim(),
      splitTalentPct: input.splitTalentPct ?? dispute.splitTalentPct ?? null,
      resolvedByAdminId: dispute.resolvedByAdminId ?? admin.id,
      approvedByAdminId: fourEyes ? admin.id : (dispute.approvedByAdminId ?? null),
      resolvedAt: new Date(),
    },
  });

  // Close linked SupportTicket(s)
  await prisma.supportTicket.updateMany({
    where: {
      OR: [{ disputeId: dispute.id }, { bookingId: dispute.bookingId }],
      status: { notIn: ["RESOLVED", "CLOSED"] },
    },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      resolutionNote: input.resolutionNote.trim(),
    },
  });

  // Notify both parties
  await notifyProvider
    .inApp(booking.client.userId, {
      kind: "dispute_resolved",
      outcome: input.resolution,
      note: input.resolutionNote.trim(),
      bookingId: dispute.bookingId,
    })
    .catch(() => {});
  await notifyProvider
    .inApp(booking.creator.userId, {
      kind: "dispute_resolved",
      outcome: input.resolution,
      note: input.resolutionNote.trim(),
      bookingId: dispute.bookingId,
    })
    .catch(() => {});

  await enqueueEmailNotification(booking.client.userId, "dispute_resolved", {
    outcome: input.resolution,
    note: input.resolutionNote.trim(),
    bookingId: dispute.bookingId,
  }).catch(() => {});
  await enqueueEmailNotification(booking.creator.userId, "dispute_resolved", {
    outcome: input.resolution,
    note: input.resolutionNote.trim(),
    bookingId: dispute.bookingId,
  }).catch(() => {});

  // Audit log
  await prisma.adminAuditLog.create({
    data: {
      adminId: admin.id,
      action: "DISPUTE_RESOLVED",
      targetType: "DISPUTE",
      targetId: dispute.id,
      reason: input.resolutionNote.trim(),
      metadata: {
        resolution: input.resolution,
        bookingId: dispute.bookingId,
        resolvedBy: dispute.resolvedByAdminId ?? admin.id,
        approvedBy: fourEyes ? admin.id : null,
        idempotencyKey,
      },
    },
  });

  // Telemetry
  void track(
    "dispute_resolved",
    {
      disputeId: dispute.id,
      bookingId: dispute.bookingId,
      resolution: input.resolution,
      resolvedByAdminId: dispute.resolvedByAdminId ?? admin.id,
      approvedByAdminId: fourEyes ? admin.id : null,
    },
    { actor: "ADMIN", actorId: admin.id, source: "API" },
  ).catch(() => {});

  return {
    success: true,
    dispute: finalDispute,
    paymentResult,
  };
}
