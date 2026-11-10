import { prisma } from "../db/client.js";
import { env } from "../config/env.js";
import { notifyProvider } from "../providers/index.js";
import { enqueueEmailNotification } from "./notifications.js";
import { paginate, toSkipTake, type PaginationQuery } from "../lib/pagination.js";
import { computeSlaDueAt, USER_CONFIRMATION_MESSAGES } from "../config/slaRules.js";

// Help & support (features.md Phase 10 / PRD M7 Phase A8):
// Ticket submit + list + messages. Owner-scoped — a user only ever sees their own tickets.
// Guardrail: Internal staff notes (isInternal: true) are strictly excluded from user-facing responses.

export interface CreateTicketInput {
  subject: string;
  message: string;
  body?: string;
  category?: any;
  priority?: any;
  source?: any;
  bookingId?: string;
  reporterEmail?: string;
}

export async function createSupportTicket(userId: string, input: CreateTicketInput) {
  const priority = input.priority || "NORMAL";
  const now = new Date();
  const slaDueAt = computeSlaDueAt(now, priority);

  const data: Record<string, any> = {
    userId,
    subject: input.subject.trim(),
    message: input.message.trim(),
  };

  if (input.category) data.category = input.category;
  if (input.priority) data.priority = input.priority;
  if (input.source) data.source = input.source;
  if (input.bookingId) data.bookingId = input.bookingId;
  if (input.reporterEmail) data.reporterEmail = input.reporterEmail;
  if (input.body) data.body = input.body;
  if (input.category || input.priority || input.source || input.bookingId) {
    data.slaDueAt = slaDueAt;
  }

  const ticket = await prisma.supportTicket.create({
    data: data as any,
  });

  // Create initial TicketMessage row for the conversation thread
  try {
    if (typeof (prisma as any).ticketMessage?.create === "function") {
      await (prisma as any).ticketMessage.create({
        data: {
          ticketId: ticket.id,
          authorType: "USER",
          authorId: userId,
          senderId: userId,
          senderRole: "USER",
          body: input.message.trim(),
          isInternal: false,
          internal: false,
        },
      });
    }
  } catch (err) {
    console.error(`[services/support] Warning: unable to create initial TicketMessage for ticket ${ticket.id}:`, err);
  }

  // Confirmation to the submitter via email notification queue
  await enqueueEmailNotification(userId, "support_ticket_received", {
    ticketId: ticket.id,
    subject: ticket.subject,
  }).catch((err) => {
    console.error(`[services/support] failed to enqueue confirmation for ticket ${ticket.id}:`, err);
  });

  // Relay to the internal support inbox, if one is configured (best-effort)
  if (env.SUPPORT_INBOX_EMAIL) {
    await notifyProvider
      .email(env.SUPPORT_INBOX_EMAIL, "support_ticket_new", {
        ticketId: ticket.id,
        userId,
        subject: ticket.subject,
        message: ticket.message,
      })
      .catch((err) => {
        console.error(`[services/support] failed to relay ticket ${ticket.id} to support inbox:`, err);
      });
  }

  const confirmationMessage = priority === "URGENT"
    ? USER_CONFIRMATION_MESSAGES.URGENT
    : USER_CONFIRMATION_MESSAGES.STANDARD;

  return {
    ...ticket,
    confirmationMessage,
  };
}

export async function listSupportTickets(userId: string, query: PaginationQuery) {
  const where = { userId };
  const { skip, take } = toSkipTake(query);

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        messages: {
          where: { isInternal: false, internal: false },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  return paginate(tickets, total, query);
}

export async function getSupportTicket(userId: string, ticketId: string) {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId },
    include: {
      messages: {
        where: { isInternal: false, internal: false },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return ticket;
}

export async function addTicketMessageFromUser(userId: string, ticketId: string, body: string) {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId },
  });

  if (!ticket) {
    throw new Error("Ticket not found or unauthorized");
  }

  const message = await (prisma as any).ticketMessage.create({
    data: {
      ticketId,
      authorType: "USER",
      authorId: userId,
      senderId: userId,
      senderRole: "USER",
      body: body.trim(),
      isInternal: false,
      internal: false,
    },
  });

  // If ticket was waiting on user, mark it IN_PROGRESS or OPEN
  if (ticket.status === "WAITING_ON_USER") {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: "IN_PROGRESS" },
    });
  }

  return message;
}
