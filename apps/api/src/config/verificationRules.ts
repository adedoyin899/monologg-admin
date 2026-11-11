/**
 * Verification & Compliance Queue Rules (PRD Module M9 / Phase A10).
 *
 * Distinct from identity KYC: this governs presentation video recordings
 * submitted by talent for storefront showcase review. Under the X3 invariant,
 * recording reviews NEVER write to KycCheck or Creator.verification.
 */

export const VERIFICATION_SLA_HOURS = 48;
export const VERIFICATION_SIGNED_URL_EXPIRY_SECONDS = 300; // 5 minutes

export type ReRecordReasonTemplate =
  | "POOR_LIGHTING"
  | "HANDS_OR_FACE_NOT_VISIBLE"
  | "FRAMING_NOT_WAIST_UP"
  | "EXCEEDS_DURATION"
  | "UNNATURAL_OR_STIFF"
  | "AUDIO_QUALITY_POOR"
  | "OTHER";

export const RE_RECORD_TEMPLATES: Record<ReRecordReasonTemplate, { label: string; description: string }> = {
  POOR_LIGHTING: {
    label: "Poor lighting or high contrast",
    description: "Lighting is too dim, high-contrast, or back-lit.",
  },
  HANDS_OR_FACE_NOT_VISIBLE: {
    label: "Face or hands not clearly visible",
    description: "Talent's face or hands are obscured or out of frame.",
  },
  FRAMING_NOT_WAIST_UP: {
    label: "Framing is not waist-up",
    description: "Framing must be waist-up to showcase poise and presence.",
  },
  EXCEEDS_DURATION: {
    label: "Recording exceeds 90 seconds",
    description: "Presentation video must be 90 seconds or less.",
  },
  UNNATURAL_OR_STIFF: {
    label: "Unnatural delivery or stiff gestures",
    description: "Delivery lacks natural presentation rhythm or gestures are excessively stiff.",
  },
  AUDIO_QUALITY_POOR: {
    label: "Audio is unclear or background noise is too high",
    description: "Speech is inaudible, distorted, or drowned out by background noise.",
  },
  OTHER: {
    label: "Other guideline mismatch",
    description: "Recording does not meet quality or presentation standards.",
  },
};

export interface GuidelineChecklistItem {
  id: string;
  label: string;
  description: string;
}

export const VERIFICATION_CHECKLIST: GuidelineChecklistItem[] = [
  {
    id: "waist_up",
    label: "Waist-up framing",
    description: "Framed from waist up to assess poise and full presentation.",
  },
  {
    id: "face_hands_visible",
    label: "Face and hands visible",
    description: "Both face and hands remain clearly in view.",
  },
  {
    id: "good_lighting",
    label: "Good lighting",
    description: "Even illumination, no blown-out highlights or deep shadows.",
  },
  {
    id: "natural_gestures",
    label: "Natural gestures",
    description: "Comfortable, engaging presentation style with natural gestures.",
  },
  {
    id: "under_90_seconds",
    label: "Under 90 seconds",
    description: "Duration is within the strict 90-second boundary.",
  },
];

/**
 * Checks if a verification recording has breached the 48-hour SLA.
 */
export function isVerificationOverdue(createdAt: Date | string): boolean {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const ageMs = Date.now() - created.getTime();
  return ageMs > VERIFICATION_SLA_HOURS * 3600 * 1000;
}

/**
 * Calculates remaining SLA hours. Returns 0 if already overdue.
 */
export function getRemainingSlaHours(createdAt: Date | string): number {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const ageMs = Date.now() - created.getTime();
  const slaTotalMs = VERIFICATION_SLA_HOURS * 3600 * 1000;
  const remainingMs = slaTotalMs - ageMs;
  return Math.max(0, Math.round((remainingMs / (3600 * 1000)) * 10) / 10);
}

