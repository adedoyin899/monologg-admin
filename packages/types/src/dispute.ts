import { z } from "zod";

export const DisputeReasonSchema = z.enum([
  "NOT_DELIVERED",
  "QUALITY",
  "NO_SHOW",
  "NOT_AS_DESCRIBED",
  "PAYMENT",
  "OTHER",
]);
export type DisputeReason = z.infer<typeof DisputeReasonSchema>;

export const DisputeStatusSchema = z.enum([
  "OPEN",
  "UNDER_REVIEW",
  "AWAITING_EVIDENCE",
  "RESOLVED",
]);
export type DisputeStatus = z.infer<typeof DisputeStatusSchema>;

export const DisputeResolutionSchema = z.enum([
  "RELEASE_TO_TALENT",
  "REFUND_CLIENT",
  "SPLIT",
]);
export type DisputeResolution = z.infer<typeof DisputeResolutionSchema>;

export const DisputeSchema = z.object({
  id: z.string(),
  bookingId: z.string(),
  openedByUserId: z.string(),
  openedByRole: z.enum(["TALENT", "CLIENT"]),
  reason: DisputeReasonSchema,
  description: z.string(),
  status: DisputeStatusSchema,
  resolution: DisputeResolutionSchema.nullable().optional(),
  splitTalentPct: z.number().int().min(0).max(100).nullable().optional(),
  resolutionNote: z.string().nullable().optional(),
  resolvedByAdminId: z.string().nullable().optional(),
  approvedByAdminId: z.string().nullable().optional(),
  evidenceRequestedAt: z.coerce.date().nullable().optional(),
  openedAt: z.coerce.date(),
  resolvedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});
export type Dispute = z.infer<typeof DisputeSchema>;

export const CreateDisputeInputSchema = z.object({
  reason: DisputeReasonSchema.default("OTHER"),
  description: z.string().min(5, "Description must be at least 5 characters"),
});
export type CreateDisputeInput = z.infer<typeof CreateDisputeInputSchema>;

export const ResolveDisputeInputSchema = z.object({
  resolution: DisputeResolutionSchema,
  resolutionNote: z.string().min(5, "Resolution note must be at least 5 characters"),
  splitTalentPct: z.number().int().min(0).max(100).optional(),
});
export type ResolveDisputeInput = z.infer<typeof ResolveDisputeInputSchema>;
