/**
 * Dispute rules, thresholds, and disclosure copy for PRD Module M8 (Phase A9).
 */

export const DISPUTE_FOUR_EYES_THRESHOLD: Record<string, number> = {
  NGN: 50_000_000, // 500,000 NGN in kobo
  USD: 100_000,    // 1,000 USD in cents
  GBP: 80_000,     // 800 GBP in pence
};

export const DISPUTE_TARGET_DAYS = 3;
export const DISPUTE_TARGET_HOURS = 72; // 3 days SLA target

export const DISPUTE_REASONS = [
  { value: "NOT_DELIVERED", label: "Deliverables not provided" },
  { value: "QUALITY", label: "Quality does not meet brief / agreement" },
  { value: "NO_SHOW", label: "No-show for scheduled live session" },
  { value: "NOT_AS_DESCRIBED", label: "Deliverable differs significantly from description" },
  { value: "PAYMENT", label: "Pricing or payment calculation issue" },
  { value: "OTHER", label: "Other dispute" },
] as const;

export const DISPUTE_USER_DISCLOSURE_COPY =
  "Conversations and order room messages may be reviewed by Monologg staff to adjudicate this dispute.";

export function getDisputeChatReviewBanner(disputeId: string): string {
  return `You are viewing private messages for dispute ${disputeId}. This access is logged.`;
}

/**
 * Returns the four-eyes threshold in minor units for the specified currency.
 */
export function getFourEyesThreshold(currency: string): number {
  return DISPUTE_FOUR_EYES_THRESHOLD[currency.toUpperCase()] ?? 100_000;
}

/**
 * Checks whether dispute resolution requires four-eyes approval (second different admin).
 */
export function isFourEyesRequired(amountMinor: number, currency: string): boolean {
  const threshold = getFourEyesThreshold(currency);
  return amountMinor >= threshold;
}

/**
 * Computes whether a dispute is past its 3-day SLA target.
 */
export function isDisputeOverdue(openedAt: Date | string): boolean {
  const opened = typeof openedAt === "string" ? new Date(openedAt) : openedAt;
  const ageMs = Date.now() - opened.getTime();
  return ageMs > DISPUTE_TARGET_HOURS * 3600 * 1000;
}
