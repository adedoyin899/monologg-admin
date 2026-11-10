import { z } from "zod";

export const SupportTicketSchema = z.object({
  id: z.string(),
  subject: z.string(),
  message: z.string(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
  createdAt: z.string(),
});
export type SupportTicket = z.infer<typeof SupportTicketSchema>;
