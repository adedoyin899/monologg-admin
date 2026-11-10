// SLA Rules and Canned Replies for Support & Complaints (PRD Module M7 / Phase A8)

export interface SlaConfig {
  standardFirstResponseHours: number;
  urgentFirstResponseHours: number;
}

export const SLA_CONFIG: SlaConfig = {
  standardFirstResponseHours: 24,
  urgentFirstResponseHours: 4,
};

export interface CannedReply {
  id: string;
  title: string;
  category?: string;
  body: string;
}

export const CANNED_REPLIES: CannedReply[] = [
  {
    id: "acknowledgement",
    title: "General Acknowledgement",
    body: "Hello! We have received your request and our support team is actively reviewing the details. We will update you here shortly.",
  },
  {
    id: "need_more_info",
    title: "Request Additional Information",
    body: "To help us resolve this swiftly, could you please provide additional details or screenshots regarding what occurred?",
  },
  {
    id: "escrow_payout",
    title: "Escrow & Payout Explanation",
    body: "Funds are held securely in escrow and automatically release once delivered work is approved by the client or when the review window completes. Payout transfers typically settle within 24 business hours.",
  },
  {
    id: "dispute_opened",
    title: "Dispute Escalation Notice",
    body: "We have logged this issue and notified both parties. A member of our disputes team will review the deliverables, order room timeline, and message logs to facilitate a fair resolution.",
  },
  {
    id: "resolution",
    title: "Resolution Confirmation",
    body: "We have resolved this issue on our end. Please review and feel free to reach back out if there is anything else we can assist you with!",
  },
];

export const USER_CONFIRMATION_MESSAGES = {
  STANDARD: "We have your message. We usually reply within 24 hours.",
  URGENT: "We have your message. We usually reply within 4 hours.",
};

/**
 * Calculates when the first response is due based on ticket creation time and priority.
 */
export function computeSlaDueAt(createdAt: Date = new Date(), priority: string = "NORMAL"): Date {
  const hours = priority.toUpperCase() === "URGENT"
    ? SLA_CONFIG.urgentFirstResponseHours
    : SLA_CONFIG.standardFirstResponseHours;

  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Determines whether a ticket has breached its SLA.
 * If firstResponseAt exists, check if it responded after slaDueAt.
 * If still awaiting first response and not closed/resolved, check if now > slaDueAt.
 */
export function isSlaBreached(ticket: {
  slaDueAt?: Date | string | null;
  firstResponseAt?: Date | string | null;
  createdAt: Date | string;
  priority?: string;
  status: string;
}): boolean {
  const createdAt = new Date(ticket.createdAt);
  const dueAt = ticket.slaDueAt
    ? new Date(ticket.slaDueAt)
    : computeSlaDueAt(createdAt, ticket.priority);

  if (ticket.firstResponseAt) {
    const firstResAt = new Date(ticket.firstResponseAt);
    return firstResAt.getTime() > dueAt.getTime();
  }

  // If not responded to yet, check if closed/resolved
  const isResolvedOrClosed = ticket.status === "RESOLVED" || ticket.status === "CLOSED";
  if (isResolvedOrClosed) {
    return false;
  }

  return Date.now() > dueAt.getTime();
}

/**
 * Milliseconds to first response, or null if no first response yet.
 */
export function computeFirstResponseTimeMs(ticket: {
  createdAt: Date | string;
  firstResponseAt?: Date | string | null;
}): number | null {
  if (!ticket.firstResponseAt) return null;
  return new Date(ticket.firstResponseAt).getTime() - new Date(ticket.createdAt).getTime();
}

/**
 * Formats ticket number into MNL-XXXX display format.
 */
export function formatTicketNumber(num?: number | null, fallbackId?: string): string {
  if (typeof num === "number" && !Number.isNaN(num)) {
    return `MNL-${num}`;
  }
  if (fallbackId) {
    const clean = fallbackId.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase();
    return `MNL-${clean || "0001"}`;
  }
  return "MNL-0001";
}

