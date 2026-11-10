# Monologg Legal Terms Update — Draft for Counsel Review
**Document Status:** DRAFT — Ready for Legal Counsel Review (DO NOT PUBLISH)  
**Proposed Version:** `2026-11-15-draft`  
**Current Live Version:** `2026-07-29`  
**Applicable Regulations:** Nigeria Data Protection Act (NDPA) 2023, General Data Protection Regulation (GDPR) / UK GDPR equivalents, Paystack / CBN Escrow Guidelines.

---

## Executive Summary
This document drafts proposed additions to the Monologg Terms of Service and Privacy Policy to support the Alpha Operations and Admin Platform (Phase A3 / PRD Section 11):
1. **Clause 8.4 (Dispute and Support Investigation Review):** Explicit user disclosure that communications within an active Order Room may be inspected by authorized administrators solely when an escalated dispute, fraud alert, or support ticket is filed.
2. **Clause 12.2 (Product Telemetry and Consent Choice):** Clear disclosure of anonymous telemetry, opt-in consent controls for visitors, and complete prohibition on collecting message text, secrets, or identity verification files as telemetry.

---

## Clause 1: Conversation Review in Disputes and Support

### Proposed Insertion into Terms of Service:
> ### Section 8.4 — Order Room Collaboration & Dispute Investigation Review
> 
> 1. **Order Room Scope & Confidentiality.** The Order Room is a private workspace provisioned upon escrow locking to facilitate creative briefing, contract milestone coordination, asset delivery, and collaboration between the Client and the Performer.
> 2. **Administrative Access Conditions.** Monologg does not routinely monitor, read, or scrape real-time private messages between users. However, you acknowledge and agree that authorized Monologg trust & safety personnel and dispute adjudicators may inspect Order Room conversation histories, message timestamps, and submitted deliverable files under the following strict conditions:
>    - (a) A party to the booking raises a formal Escrow Dispute (Status: `DISPUTED`);
>    - (b) A party to the booking opens a Customer Support ticket referencing the order ID;
>    - (c) Automated platform security safeguards trigger a critical alert regarding suspected fraud, credential compromise, off-platform payment evasion, or Terms of Service violations; or
>    - (d) Required by applicable Nigerian law or valid legal process served upon Monologg.
> 3. **Proportionality and Purpose Limitation.** Any administrative review of Order Room messages is strictly limited to the information reasonably necessary to resolve the dispute, enforce terms, evaluate deliverables against the agreed brief, or determine appropriate escrow disbursement.
> 4. **Audit Logging.** All administrative access to Order Room communications is indelibly logged in an append-only internal audit ledger recording the administrative identity, timestamp, accessed booking ID, and reason for access.

---

## Clause 2: Usage Telemetry, Product Analytics, and Consent Choices

### Proposed Insertion into Privacy Policy:
> ### Section 12.2 — Usage Telemetry, Product Analytics, and Consent Choices
> 
> 1. **Purpose and Scope.** Monologg collects coarse, privacy-preserving usage telemetry to understand platform traffic patterns, prevent bot abuse, calculate aggregate marketplace liquidity metrics (e.g., liquidity by talent niche), and improve platform performance.
> 2. **Consent-First Architecture for Anonymous Visitors.** In compliance with the Nigeria Data Protection Act (NDPA) and global privacy standards:
>    - (a) When visiting Monologg without being signed in, no anonymous telemetry or page-view tracking is transmitted until you provide explicit affirmative consent via the on-screen analytics banner;
>    - (b) If you select **Decline**, all anonymous telemetry is suppressed, your visit remains unmeasured, and your acquisition source is recorded as "unknown";
>    - (c) You may review or modify your consent choice at any time using the **Analytics Preferences** link located in the website footer.
> 3. **Strict Negative Privacy Constraints.** Monologg's telemetry system is cryptographically and architecturally gated. Under no circumstances will our telemetry SDK or event sinks capture, collect, or transmit:
>    - Private message text, chat conversations, or attachment contents;
>    - Passwords, cryptographic hashes, session tokens, or OTP codes;
>    - Identity verification video recordings or raw government identification documents;
>    - Physical attribute measurements or confidential demographic traits; or
>    - Raw, unhashed visitor IP addresses (only coarse edge country codes, e.g., "NG", are retained).
> 4. **Retention.** Event-level telemetry rows are retained for thirteen (13) months, after which they are rolled up into anonymized daily platform KPI aggregates and permanently purged.

---

## Review Instructions for Legal Counsel
- [ ] Confirm alignment with Section 24 of the NDPA (Lawful Basis of Data Processing & Consent).
- [ ] Verify that Order Room dispute review disclosure meets contractual necessity standards under Nigerian Contract Law.
- [ ] Approve whether terms version bump from `2026-07-29` to `2026-11-15` requires active in-app re-acknowledgement for existing active users or can be accepted upon subsequent milestone interaction.
