import type { SupportTicket } from "@monologg/types";

// features.md Phase 10: mock-mode fixture for the new Help & Support screen.
export const SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: "ticket-1",
    subject: "Payout hasn't arrived",
    message: "My escrow was released 3 days ago but I haven't seen the payout yet.",
    status: "IN_PROGRESS",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
