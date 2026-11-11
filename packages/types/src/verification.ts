import { z } from "zod";

export const VerificationRecordingStatusSchema = z.enum([
  "UPLOADED",
  "IN_REVIEW",
  "APPROVED",
  "NEEDS_RERECORD",
]);
export type VerificationRecordingStatus = z.infer<typeof VerificationRecordingStatusSchema>;

export const ReRecordReasonTemplateSchema = z.enum([
  "POOR_LIGHTING",
  "HANDS_OR_FACE_NOT_VISIBLE",
  "FRAMING_NOT_WAIST_UP",
  "EXCEEDS_DURATION",
  "UNNATURAL_OR_STIFF",
  "AUDIO_QUALITY_POOR",
  "OTHER",
]);
export type ReRecordReasonTemplate = z.infer<typeof ReRecordReasonTemplateSchema>;

export const RE_RECORD_REASON_LABELS: Record<ReRecordReasonTemplate, string> = {
  POOR_LIGHTING: "Poor lighting or high contrast / glare",
  HANDS_OR_FACE_NOT_VISIBLE: "Face or hands not clearly visible",
  FRAMING_NOT_WAIST_UP: "Framing is not waist-up",
  EXCEEDS_DURATION: "Recording exceeds 90 seconds",
  UNNATURAL_OR_STIFF: "Delivery is unnatural or gestures are stiff",
  AUDIO_QUALITY_POOR: "Audio is unclear or muffled",
  OTHER: "Other guideline mismatch",
};

export interface VerificationGuidelineCheckItem {
  id: string;
  label: string;
  description: string;
  passed?: boolean;
}

export const VERIFICATION_GUIDELINES: VerificationGuidelineCheckItem[] = [
  {
    id: "waist_up",
    label: "Waist-up framing",
    description: "Camera is framed from the waist up so posture and body language are clear.",
  },
  {
    id: "face_hands_visible",
    label: "Face & hands visible",
    description: "Talent's face and hands are clearly visible throughout the presentation.",
  },
  {
    id: "good_lighting",
    label: "Good lighting",
    description: "Subject is well lit with clear contrast, no excessive backlight or harsh shadows.",
  },
  {
    id: "natural_gestures",
    label: "Natural gestures",
    description: "Presentation is relaxed and confident with natural movement and eye contact.",
  },
  {
    id: "under_90_seconds",
    label: "Under 90 seconds",
    description: "Total recording duration does not exceed the 90-second maximum cap.",
  },
];

export const VerificationQueueItemSchema = z.object({
  id: z.string(),
  creatorId: z.string(),
  creatorName: z.string(),
  creatorNiche: z.string(),
  creatorLocation: z.string(),
  creatorAvatarUrl: z.string().nullable().optional(),
  status: VerificationRecordingStatusSchema,
  durationSec: z.number().int(),
  guidelineAck: z.boolean(),
  reviewerNote: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  ageHours: z.number(),
  isOverdue: z.boolean(),
  slaRemainingHours: z.number(),
});
export type VerificationQueueItem = z.infer<typeof VerificationQueueItemSchema>;

export const KycPanelFactsSchema = z.object({
  status: z.string(),
  attempts: z.number().int(),
  provider: z.string(),
  failureReasonCode: z.string().nullable().optional(),
  lastAttemptAt: z.string().nullable().optional(),
});
export type KycPanelFacts = z.infer<typeof KycPanelFactsSchema>;

export const VerificationDetailSchema = z.object({
  id: z.string(),
  creatorId: z.string(),
  creator: z.object({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    niche: z.string(),
    location: z.string(),
    avatarUrl: z.string().nullable().optional(),
    maskedEmail: z.string(),
    maskedPhone: z.string().nullable().optional(),
    userCreatedAt: z.string(),
  }),
  status: VerificationRecordingStatusSchema,
  durationSec: z.number().int(),
  guidelineAck: z.boolean(),
  reviewerNote: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  ageHours: z.number(),
  isOverdue: z.boolean(),
  guidelineChecklist: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      passed: z.boolean(),
      hint: z.string().optional(),
    }),
  ),
  kycPanel: KycPanelFactsSchema,
});
export type VerificationDetail = z.infer<typeof VerificationDetailSchema>;

export const VerificationMetricsSchema = z.object({
  pendingUploadedCount: z.number().int(),
  inReviewCount: z.number().int(),
  overdueCount: z.number().int(),
  approvedCount: z.number().int(),
  needsRerecordCount: z.number().int(),
  totalReviewedCount: z.number().int(),
  approvalRatePct: z.number(),
  medianReviewHours: z.number(),
});
export type VerificationMetrics = z.infer<typeof VerificationMetricsSchema>;

export const VerificationDecisionInputSchema = z.object({
  decision: z.enum(["APPROVE", "NEEDS_RERECORD"]),
  reasonTemplate: ReRecordReasonTemplateSchema.optional(),
  reviewerNote: z.string().max(1000).optional(),
});
export type VerificationDecisionInput = z.infer<typeof VerificationDecisionInputSchema>;

