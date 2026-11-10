import { z } from "zod";

export const TicketCategorySchema = z.enum([
  "COMPLAINT",
  "BUG",
  "PAYMENT",
  "BOOKING",
  "DISPUTE",
  "ACCOUNT",
  "VERIFICATION",
  "FEEDBACK",
  "OTHER",
]);
export type TicketCategory = z.infer<typeof TicketCategorySchema>;

export const TicketPrioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
export type TicketPriority = z.infer<typeof TicketPrioritySchema>;

export const TicketStatusSchema = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "WAITING_ON_USER",
  "RESOLVED",
  "CLOSED",
]);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const TicketSourceSchema = z.enum([
  "IN_APP",
  "EMAIL",
  "ADMIN_CREATED",
  "BOOKING",
  "ORDER_ROOM",
  "HELP_MENU",
  "WEB",
]);
export type TicketSource = z.infer<typeof TicketSourceSchema>;

export const TicketAuthorSchema = z.enum(["USER", "ADMIN", "SYSTEM"]);
export type TicketAuthor = z.infer<typeof TicketAuthorSchema>;

export const TicketMessageSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  authorType: TicketAuthorSchema.optional(),
  authorId: z.string().nullable().optional(),
  senderId: z.string().nullable().optional(),
  senderRole: z.string().optional(),
  body: z.string(),
  isInternal: z.boolean().default(false),
  internal: z.boolean().optional(),
  attachments: z.any().optional(),
  createdAt: z.union([z.string(), z.date()]),
});
export type TicketMessage = z.infer<typeof TicketMessageSchema>;

export const SupportTicketSchema = z.object({
  id: z.string(),
  number: z.union([z.number(), z.string()]).optional(),
  userId: z.string().optional(),
  reporterUserId: z.string().nullable().optional(),
  reporterEmail: z.string().nullable().optional(),
  subject: z.string(),
  message: z.string(),
  body: z.string().nullable().optional(),
  category: TicketCategorySchema.optional(),
  priority: TicketPrioritySchema.optional(),
  status: TicketStatusSchema.default("OPEN"),
  source: TicketSourceSchema.optional(),
  bookingId: z.string().nullable().optional(),
  disputeId: z.string().nullable().optional(),
  assignedAdminId: z.string().nullable().optional(),
  firstResponseAt: z.union([z.string(), z.date()]).nullable().optional(),
  resolvedAt: z.union([z.string(), z.date()]).nullable().optional(),
  slaDueAt: z.union([z.string(), z.date()]).nullable().optional(),
  resolutionNote: z.string().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]).optional(),
  messages: z.array(TicketMessageSchema).optional(),
});
export type SupportTicket = z.infer<typeof SupportTicketSchema>;
