// features.md Phase 10: the current legal-terms version, shared so apps/web
// (registration checkbox + legal pages) and apps/api (TermsAcceptance rows)
// can never drift apart — one source of truth, not two hardcoded strings.
// Bump this string whenever the terms/privacy content changes; existing
// TermsAcceptance rows keep recording whatever version a user actually saw.
export const CURRENT_TERMS_VERSION = "2026-07-29";

/**
 * DRAFT additions for next legal revision (Phase A3 / PRD Section 11, ready for counsel review).
 * DO NOT publish as CURRENT_TERMS_VERSION until reviewed and approved by legal counsel.
 */
export const DRAFT_TERMS_VERSION = "2026-11-15-draft";

export const DRAFT_TERMS_DISCLOSURES = {
  conversationReviewInDispute: `Section 8.4 — Order Room Collaboration & Dispute Investigation Review
When a client or performer submits a dispute or requests formal support adjudication regarding an order or escrow release, authorized Monologg trust & safety administrators may access and review the conversation history, messages, timestamps, and submitted deliverables within the relevant Order Room. This review is conducted solely for the purpose of investigating breach of service agreements, evaluating deliverables, mediating disputed escrow settlements, or preventing fraudulent activity. Messages and communications outside of disputed or escalated order rooms remain confidential between participants.`,

  analyticsWithConsent: `Section 12.2 — Usage Telemetry, Product Analytics, and Consent Choices
Monologg collects aggregated, anonymous usage telemetry (such as page views, device classes, and user navigation milestones) to ensure system reliability and improve marketplace liquidity. Under the Nigeria Data Protection Act (NDPA) and applicable privacy regulations, visitor telemetry across unauthenticated sessions is strictly optional and requires your explicit consent. You may accept or decline analytics tracking at any time using the on-screen preference banner or via the Analytics Preferences link in the website footer. Sensitive private data—including message content, identification documents, raw payment card details, and personal contact info—is never collected or transmitted as telemetry.`,
} as const;
