import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../db/client.js";
import { adminRoPrisma } from "../db/adminRoClient.js";
import { notifyProvider } from "../providers/index.js";
import { enqueueEmailNotification } from "./notifications.js";
import { audit } from "./adminAudit.js";
import { maskEmail, maskName, maskPhone } from "../lib/masking.js";
import {
  computeSlaDueAt,
  isSlaBreached,
  computeFirstResponseTimeMs,
  formatTicketNumber,
  CANNED_REPLIES,
  USER_CONFIRMATION_MESSAGES,
  type CannedReply,
} from "../config/slaRules.js";

export interface AdminTicketFilters {
  view?: "mine" | "unassigned" | "urgent" | "waiting_user" | "all";
  category?: string;
  priority?: string;
  status?: string;
  source?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  limit?: number;
}

export interface AdminTicketSummary {
  id: string;
  number: string;
  rawNumber?: number | null;
  subject: string;
  message: string;
  category: string;
  priority: string;
  status: string;
  source: string;
  userId: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
    userType: string;
  } | null;
  reporterEmail?: string | null;
  assignedAdminId?: string | null;
  assignedAdmin?: {
    id: string;
    email: string;
  } | null;
  bookingId?: string | null;
  disputeId?: string | null;
  firstResponseAt?: string | null;
  resolvedAt?: string | null;
  slaDueAt: string;
  isBreached: boolean;
  timeToFirstResponseMs?: number | null;
  slaRemainingMs: number;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTicketsListResponse {
  tickets: AdminTicketSummary[];
  counts: {
    mine: number;
    unassigned: number;
    urgent: number;
    waiting_user: number;
    all: number;
  };
  pagination: {
    total: number;
    hasMore: boolean;
    nextCursor?: string | null;
  };
}

export async function listAdminTickets(
  adminId: string,
  role: string,
  filters: AdminTicketFilters = {},
  prismaClient: PrismaClient = adminRoPrisma,
): Promise<AdminTicketsListResponse> {
  const db = prismaClient || defaultPrisma;
  const isViewer = role === "VIEWER";
  const limit = Math.min(Math.max(filters.limit || 50, 1), 100);
  const view = filters.view || "all";

  // Build where clause based on view and filters
  const where: any = {};

  if (view === "mine") {
    where.assignedAdminId = adminId;
  } else if (view === "unassigned") {
    where.assignedAdminId = null;
    where.status = { notIn: ["RESOLVED", "CLOSED"] };
  } else if (view === "urgent") {
    where.priority = "URGENT";
    where.status = { notIn: ["RESOLVED", "CLOSED"] };
  } else if (view === "waiting_user") {
    where.status = "WAITING_ON_USER";
  }

  if (filters.category) {
    where.category = filters.category;
  }
  if (filters.priority) {
    where.priority = filters.priority;
  }
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.source) {
    where.source = filters.source;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
  }

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { subject: { contains: q, mode: "insensitive" } },
      { message: { contains: q, mode: "insensitive" } },
      { reporterEmail: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  if (filters.cursor) {
    where.id = { lt: filters.cursor };
  }

  // Fetch tickets
  const items = typeof db.supportTicket?.findMany === "function"
    ? await db.supportTicket.findMany({
        where,
        take: limit + 1,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              userType: true,
              creator: { select: { name: true } },
              client: { select: { name: true, orgName: true } },
            },
          },
          messages: {
            select: { id: true },
          },
        },
      })
    : [];

  const hasMore = items.length > limit;
  const rawTickets = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore && rawTickets.length > 0 ? rawTickets[rawTickets.length - 1].id : null;

  // Gather admin info if any assigned
  const assignedAdminIds = Array.from(
    new Set(rawTickets.map((t) => t.assignedAdminId).filter(Boolean) as string[]),
  );
  const admins = assignedAdminIds.length > 0
    ? await defaultPrisma.adminUser.findMany({
        where: { id: { in: assignedAdminIds } },
        select: { id: true, email: true },
      })
    : [];
  const adminMap = new Map(admins.map((a) => [a.id, a]));

  const nowMs = Date.now();

  const formattedTickets: AdminTicketSummary[] = rawTickets.map((t: any) => {
    const userRaw = t.user;
    let userName: string | null = null;
    if (userRaw?.creator) {
      userName = userRaw.creator.name;
    } else if (userRaw?.client) {
      userName = userRaw.client.name || userRaw.client.orgName;
    }

    const assignedAdmin = t.assignedAdminId ? adminMap.get(t.assignedAdminId) || null : null;
    const slaDue = t.slaDueAt ? new Date(t.slaDueAt) : computeSlaDueAt(t.createdAt, t.priority);
    const breached = isSlaBreached({
      slaDueAt: slaDue,
      firstResponseAt: t.firstResponseAt,
      createdAt: t.createdAt,
      priority: t.priority,
      status: t.status,
    });
    const firstResTime = computeFirstResponseTimeMs({
      createdAt: t.createdAt,
      firstResponseAt: t.firstResponseAt,
    });
    const slaRemainingMs = slaDue.getTime() - nowMs;

    return {
      id: t.id,
      number: formatTicketNumber((t as any).number, t.id),
      rawNumber: (t as any).number || null,
      subject: t.subject,
      message: t.message,
      category: t.category,
      priority: t.priority,
      status: t.status,
      source: t.source,
      userId: t.userId,
      user: userRaw
        ? {
            id: userRaw.id,
            email: isViewer ? maskEmail(userRaw.email) : userRaw.email,
            name: isViewer && userName ? maskName(userName) : userName,
            userType: userRaw.userType,
          }
        : null,
      reporterEmail: t.reporterEmail ? (isViewer ? maskEmail(t.reporterEmail) : t.reporterEmail) : null,
      assignedAdminId: t.assignedAdminId,
      assignedAdmin: assignedAdmin ? { id: assignedAdmin.id, email: assignedAdmin.email } : null,
      bookingId: t.bookingId,
      disputeId: (t as any).disputeId || null,
      firstResponseAt: t.firstResponseAt ? t.firstResponseAt.toISOString() : null,
      resolvedAt: t.resolvedAt ? t.resolvedAt.toISOString() : null,
      slaDueAt: slaDue.toISOString(),
      isBreached: breached,
      timeToFirstResponseMs: firstResTime,
      slaRemainingMs,
      messageCount: t.messages?.length || 0,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt ? t.updatedAt.toISOString() : t.createdAt.toISOString(),
    };
  });

  // Calculate tab counts
  let counts = { mine: 0, unassigned: 0, urgent: 0, waiting_user: 0, all: 0 };
  try {
    const safeCount = (countWhere?: any) =>
      typeof db.supportTicket?.count === "function"
        ? db.supportTicket.count({ where: countWhere })
        : Promise.resolve(0);

    const [mineCount, unassignedCount, urgentCount, waitingCount, allCount] = await Promise.all([
      safeCount({ assignedAdminId: adminId }),
      safeCount({
        assignedAdminId: null,
        status: { notIn: ["RESOLVED", "CLOSED"] },
      }),
      safeCount({
        priority: "URGENT",
        status: { notIn: ["RESOLVED", "CLOSED"] },
      }),
      safeCount({ status: "WAITING_ON_USER" }),
      safeCount(),
    ]);
    counts = {
      mine: mineCount,
      unassigned: unassignedCount,
      urgent: urgentCount,
      waiting_user: waitingCount,
      all: allCount,
    };
  } catch (err) {
    console.error("[listAdminTickets] Error fetching tab counts:", err);
  }

  return {
    tickets: formattedTickets,
    counts,
    pagination: {
      total: counts.all,
      hasMore,
      nextCursor,
    },
  };
}

export async function getAdminTicketDetail(
  ticketId: string,
  role: string,
  prismaClient: PrismaClient = adminRoPrisma,
) {
  const db = prismaClient || defaultPrisma;
  const isViewer = role === "VIEWER";

  const ticket = await db.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          userType: true,
          emailVerified: true,
          createdAt: true,
          creator: {
            select: {
              name: true,
              verification: true,
              niche: true,
              location: true,
            },
          },
          client: {
            select: {
              name: true,
              orgName: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) return null;

  // Assigned admin info
  let assignedAdmin: { id: string; email: string } | null = null;
  if (ticket.assignedAdminId) {
    const admin = await defaultPrisma.adminUser.findUnique({
      where: { id: ticket.assignedAdminId },
      select: { id: true, email: true },
    });
    if (admin) assignedAdmin = admin;
  }

  // Linked booking info
  let linkedBooking: any = null;
  if (ticket.bookingId) {
    try {
      const b = await db.booking.findUnique({
        where: { id: ticket.bookingId },
        include: {
          creator: { select: { name: true, user: { select: { email: true } } } },
          client: { select: { name: true, orgName: true, user: { select: { email: true } } } },
        },
      });
      if (b) {
        linkedBooking = {
          id: b.id,
          state: b.state,
          origin: b.origin,
          currency: b.currency,
          baseAmount: b.baseAmount,
          talentFeeAmount: b.talentFeeAmount,
          clientFeeAmount: b.clientFeeAmount,
          talentName: b.creator?.name || "Talent",
          clientName: b.client?.name || b.client?.orgName || "Client",
          createdAt: b.createdAt.toISOString(),
        };
      }
    } catch (err) {
      console.error("[getAdminTicketDetail] Failed to load linked booking:", err);
    }
  }

  const slaDue = ticket.slaDueAt ? new Date(ticket.slaDueAt) : computeSlaDueAt(ticket.createdAt, ticket.priority);
  const breached = isSlaBreached({
    slaDueAt: slaDue,
    firstResponseAt: ticket.firstResponseAt,
    createdAt: ticket.createdAt,
    priority: ticket.priority,
    status: ticket.status,
  });
  const firstResTime = computeFirstResponseTimeMs({
    createdAt: ticket.createdAt,
    firstResponseAt: ticket.firstResponseAt,
  });
  const slaRemainingMs = slaDue.getTime() - Date.now();

  const userRaw = (ticket as any).user;
  let userName = "User";
  if (userRaw?.creator) {
    userName = userRaw.creator.name || "Talent";
  } else if (userRaw?.client) {
    userName = userRaw.client.name || userRaw.client.orgName || "Client";
  }

  return {
    id: ticket.id,
    number: formatTicketNumber((ticket as any).number, ticket.id),
    rawNumber: (ticket as any).number || null,
    subject: ticket.subject,
    message: ticket.message,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    source: ticket.source,
    userId: ticket.userId,
    user: userRaw
      ? {
          id: userRaw.id,
          email: isViewer ? maskEmail(userRaw.email) : userRaw.email,
          phone: isViewer && userRaw.phone ? maskPhone(userRaw.phone) : userRaw.phone,
          name: isViewer ? maskName(userName) : userName,
          userType: userRaw.userType,
          verification: userRaw.creator?.verification || "UNVERIFIED",
          createdAt: userRaw.createdAt.toISOString(),
        }
      : null,
    reporterEmail: ticket.reporterEmail ? (isViewer ? maskEmail(ticket.reporterEmail) : ticket.reporterEmail) : null,
    assignedAdminId: ticket.assignedAdminId,
    assignedAdmin,
    bookingId: ticket.bookingId,
    linkedBooking,
    disputeId: (ticket as any).disputeId || null,
    firstResponseAt: ticket.firstResponseAt ? ticket.firstResponseAt.toISOString() : null,
    resolvedAt: ticket.resolvedAt ? ticket.resolvedAt.toISOString() : null,
    resolutionNote: ticket.resolutionNote,
    slaDueAt: slaDue.toISOString(),
    isBreached: breached,
    timeToFirstResponseMs: firstResTime,
    slaRemainingMs,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt ? ticket.updatedAt.toISOString() : ticket.createdAt.toISOString(),
    messages: ((ticket as any).messages || []).map((m: any) => ({
      id: m.id,
      ticketId: m.ticketId,
      authorType: m.authorType,
      authorId: m.authorId,
      senderId: m.senderId || m.authorId,
      senderRole: m.senderRole || m.authorType,
      body: m.body,
      isInternal: m.isInternal || m.internal || false,
      attachments: m.attachments,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function replyToTicketAsAdmin(
  adminId: string,
  ticketId: string,
  body: string,
  ip?: string,
) {
  const ticket = await defaultPrisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!ticket) {
    throw new Error("Support ticket not found");
  }

  const now = new Date();
  const isFirstResponse = !ticket.firstResponseAt;

  // 1. Create public ticket message
  const message = await (defaultPrisma as any).ticketMessage.create({
    data: {
      ticketId,
      authorType: "ADMIN",
      authorId: adminId,
      senderId: adminId,
      senderRole: "ADMIN",
      body: body.trim(),
      isInternal: false,
      internal: false,
    },
  });

  // 2. Update ticket status & firstResponseAt
  const updateData: any = {
    updatedAt: now,
  };
  if (isFirstResponse) {
    updateData.firstResponseAt = now;
  }
  if (ticket.status === "OPEN") {
    updateData.status = "WAITING_ON_USER";
  }

  await defaultPrisma.supportTicket.update({
    where: { id: ticketId },
    data: updateData,
  });

  // 3. Dispatch user notification (in-app & email)
  try {
    await notifyProvider.inApp(ticket.userId, {
      kind: "support_reply",
      ticketId: ticket.id,
      subject: ticket.subject,
      preview: body.slice(0, 100),
    });
  } catch (err) {
    console.error("[replyToTicketAsAdmin] inApp notification failed:", err);
  }

  try {
    await enqueueEmailNotification(ticket.userId, "support_ticket_reply", {
      ticketId: ticket.id,
      subject: ticket.subject,
      replyBody: body,
    });
  } catch (err) {
    console.error("[replyToTicketAsAdmin] email enqueue failed:", err);
  }

  // 4. Audit
  await audit({
    adminId,
    action: "TICKET_REPLY",
    targetType: "SupportTicket",
    targetId: ticketId,
    reason: `Admin reply to ticket ${formatTicketNumber((ticket as any).number, ticket.id)}`,
    metadata: { isFirstResponse, messageId: message.id },
    ip,
  });

  return message;
}

export async function addInternalNote(
  adminId: string,
  ticketId: string,
  body: string,
  ip?: string,
) {
  const ticket = await defaultPrisma.supportTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new Error("Support ticket not found");
  }

  // 1. Create internal staff note (isInternal: true)
  const message = await (defaultPrisma as any).ticketMessage.create({
    data: {
      ticketId,
      authorType: "ADMIN",
      authorId: adminId,
      senderId: adminId,
      senderRole: "ADMIN",
      body: body.trim(),
      isInternal: true,
      internal: true,
    },
  });

  // 2. Audit
  await audit({
    adminId,
    action: "TICKET_INTERNAL_NOTE",
    targetType: "SupportTicket",
    targetId: ticketId,
    reason: `Added staff note on ticket ${formatTicketNumber((ticket as any).number, ticket.id)}`,
    metadata: { messageId: message.id },
    ip,
  });

  return message;
}

export async function assignTicket(
  adminId: string,
  ticketId: string,
  targetAdminId: string | null,
  ip?: string,
) {
  const ticket = await defaultPrisma.supportTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new Error("Support ticket not found");
  }

  await defaultPrisma.supportTicket.update({
    where: { id: ticketId },
    data: { assignedAdminId: targetAdminId },
  });

  await audit({
    adminId,
    action: "TICKET_ASSIGN",
    targetType: "SupportTicket",
    targetId: ticketId,
    reason: targetAdminId ? `Assigned to admin ${targetAdminId}` : "Unassigned ticket",
    metadata: { previousAssignedAdminId: ticket.assignedAdminId, targetAdminId },
    ip,
  });
}

export async function updateTicketPriority(
  adminId: string,
  ticketId: string,
  priority: string,
  ip?: string,
) {
  const ticket = await defaultPrisma.supportTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new Error("Support ticket not found");
  }

  const newSlaDueAt = computeSlaDueAt(ticket.createdAt, priority);

  await defaultPrisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      priority: priority as any,
      slaDueAt: newSlaDueAt,
    },
  });

  await audit({
    adminId,
    action: "TICKET_PRIORITY_CHANGE",
    targetType: "SupportTicket",
    targetId: ticketId,
    reason: `Priority changed from ${ticket.priority} to ${priority}`,
    metadata: { previousPriority: ticket.priority, newPriority: priority, newSlaDueAt },
    ip,
  });
}

export async function updateTicketStatus(
  adminId: string,
  ticketId: string,
  status: string,
  resolutionNote?: string,
  ip?: string,
) {
  const ticket = await defaultPrisma.supportTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new Error("Support ticket not found");
  }

  const isResolvedOrClosed = status === "RESOLVED" || status === "CLOSED";
  const updateData: any = {
    status: status as any,
    updatedAt: new Date(),
  };

  if (isResolvedOrClosed) {
    updateData.resolvedAt = new Date();
    if (resolutionNote) {
      updateData.resolutionNote = resolutionNote.trim();
    }
  }

  await defaultPrisma.supportTicket.update({
    where: { id: ticketId },
    data: updateData,
  });

  await audit({
    adminId,
    action: "TICKET_STATUS_CHANGE",
    targetType: "SupportTicket",
    targetId: ticketId,
    reason: `Status changed from ${ticket.status} to ${status}${resolutionNote ? `: ${resolutionNote}` : ""}`,
    metadata: { previousStatus: ticket.status, newStatus: status, resolutionNote },
    ip,
  });
}

export async function createTicketOnBehalf(
  adminId: string,
  input: {
    userId: string;
    subject: string;
    message: string;
    category?: string;
    priority?: string;
    source?: string;
    bookingId?: string;
  },
  ip?: string,
) {
  const user = await defaultPrisma.user.findUnique({
    where: { id: input.userId },
  });

  if (!user) {
    throw new Error("Target user not found");
  }

  const priority = input.priority || "NORMAL";
  const category = input.category || "OTHER";
  const source = input.source || "ADMIN_CREATED";
  const now = new Date();
  const slaDueAt = computeSlaDueAt(now, priority);

  const ticket = await defaultPrisma.supportTicket.create({
    data: {
      userId: user.id,
      reporterEmail: user.email,
      subject: input.subject.trim(),
      message: input.message.trim(),
      body: input.message.trim(),
      category: category as any,
      priority: priority as any,
      source: source as any,
      bookingId: input.bookingId || null,
      status: "OPEN",
      slaDueAt,
      assignedAdminId: adminId,
    },
  });

  // Create initial TicketMessage row
  try {
    if (typeof (defaultPrisma as any).ticketMessage?.create === "function") {
      await (defaultPrisma as any).ticketMessage.create({
        data: {
          ticketId: ticket.id,
          authorType: "USER",
          authorId: user.id,
          senderId: user.id,
          senderRole: "USER",
          body: input.message.trim(),
          isInternal: false,
          internal: false,
        },
      });
    }
  } catch (err) {
    console.error("[createTicketOnBehalf] failed to create initial TicketMessage:", err);
  }

  await audit({
    adminId,
    action: "TICKET_CREATED_ON_BEHALF",
    targetType: "SupportTicket",
    targetId: ticket.id,
    reason: `Created ticket on behalf of user ${user.id} (${user.email}): ${input.subject.trim()}`,
    metadata: { userId: user.id, category, priority, source },
    ip,
  });

  return ticket;
}

export function getCannedReplies(): CannedReply[] {
  return CANNED_REPLIES;
}
