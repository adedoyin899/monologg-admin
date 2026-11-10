import { prisma } from "../db/client.js";
import { env } from "../config/env.js";
import { notifyProvider } from "../providers/index.js";
import { enqueueEmailNotification } from "./notifications.js";
import { paginate, toSkipTake, type PaginationQuery } from "../lib/pagination.js";

// Help & support (features.md Phase 10): ticket submit + list, "routes to
// email/inbox". Owner-scoped — a user only ever sees their own tickets.

export async function createSupportTicket(userId: string, input: { subject: string; message: string }) {
  const ticket = await prisma.supportTicket.create({
    data: { userId, subject: input.subject, message: input.message },
  });

  // Confirmation to the submitter, via the same queued/retrying path every
  // other notification email uses.
  await enqueueEmailNotification(userId, "support_ticket_received", {
    ticketId: ticket.id,
    subject: ticket.subject,
  });

  // Relay to the internal support inbox, if one is configured. Best-effort —
  // a relay failure must never fail ticket creation for the user.
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

  return ticket;
}

export async function listSupportTickets(userId: string, query: PaginationQuery) {
  const where = { userId };
  const { skip, take } = toSkipTake(query);

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
    prisma.supportTicket.count({ where }),
  ]);

  return paginate(tickets, total, query);
}
