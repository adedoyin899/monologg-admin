# Phase A9 Completion Report: Disputes & Conversation Review

**Maps to:** PRD Module M8 (Disputes & Conversation Review)  
**Date:** 2026-11-11  
**Branch:** `main`  
**Status:** COMPLETE & VERIFIED

---

## 1. Overview & Objectives

Phase A9 implements the highest-risk operational module in the platform, governing money movement, arbitration, and privacy-sensitive access to end-user private messages:
- **Additive Dispute Schema:** Added `Dispute` model and enums (`DisputeReason`, `DisputeStatus`, `DisputeResolution`) safely to Prisma schema with zero duplicate models or breaking changes.
- **Main App End-User Dispute Channel:**
  - Either party (performer or buyer) can open a dispute from active bookings or order rooms after `ESCROW_LOCKED`.
  - Automatically transitions booking to `DISPUTED` while maintaining secure escrow lock.
  - Generates linked `SupportTicket` tagged `DISPUTE` with `URGENT` priority.
  - Dispatches counterparty in-app and email notifications.
  - Emits `dispute_opened` telemetry.
  - Displays user disclosure notice: *"Conversations and order room messages may be reviewed by Monologg staff to adjudicate this dispute."*
- **Dispute Queue (`AD-17`):** Admin inbox at `/disputes` with status filtering (`OPEN`, `UNDER_REVIEW`, `AWAITING_EVIDENCE`, `RESOLVED`), age tracking against a 3-day SLA target (with overdue indicators), and four-eyes threshold badges.
- **Dispute Detail & Evidence Panel (`AD-18`):** Deep investigation workspace at `/disputes/[id]` with:
  - Booking & payment facts and stored fee breakdown with notice: *"Fee breakdown equals stored amounts from booking creation"*.
  - Delivery files & uploaded evidence with exact timestamps from order room documents.
  - Chronological state timeline reconstructed from events and webhooks.
  - Opener statement, counterparty statements, and linked support tickets.
- **Audited Conversation Review (`POST /disputes/:id/review-chat`):**
  - Gated by mandatory justification reason (min 5 characters).
  - Strictly forbidden to `OPS`, `COMPLIANCE`, and `VIEWER` roles (returns 403).
  - Permitted only for `SUPER_ADMIN`, `SUPPORT`, and `FINANCE`.
  - Refused without an open dispute or active linked ticket.
  - Writes permanent `CHAT_VIEWED` row in `AdminAuditLog` with message count.
  - Displays mandatory banner: *"You are viewing private messages for dispute <id>. This access is logged."*
- **Request Evidence (`POST /disputes/:id/request-evidence`):** Moves dispute to `AWAITING_EVIDENCE` and notifies target participant in-app and by email.
- **Resolution Actions & Idempotency:**
  - Restricted to `FINANCE` and `SUPER_ADMIN`.
  - `RELEASE_TO_TALENT`: Executes net payout (`baseAmount - talentFeeAmount`) via `PaymentProvider.releaseFunds`.
  - `REFUND_CLIENT`: Executes full charge refund via `PaymentProvider.refund`.
  - `SPLIT`: Flagged as manual action because `PaymentProvider` does not support automated partial split (per A0 findings); records split percentages and written note for offline execution.
  - Strict Idempotency: Replaying resolution on an already resolved dispute returns the existing outcome with zero duplicate money movement.
- **Four-Eyes Governance Gate:**
  - At or above `DISPUTE_FOUR_EYES_THRESHOLD` (50,000,000 NGN kobo, 100,000 USD cents, 80,000 GBP pence):
  - First admin proposal records decision, moves dispute to `UNDER_REVIEW`, and halts execution.
  - Same admin cannot approve their own proposal (blocked with 403).
  - A second, different administrator must review and approve before money moves.
- **Post-Resolution Handlers:** Notifies both parties in-app and email with resolution note, automatically marks linked support tickets `RESOLVED`, writes `DISPUTE_RESOLVED` audit row, and emits telemetry.

---

## 2. Deliverables & Implementations

### A. Data Models & Prisma Schema
- **File:** [`apps/api/prisma/schema.prisma`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/api/prisma/schema.prisma)
  - `Dispute` model:
    - `id`, `bookingId` (unique 1:1 relation to `Booking`), `openedByUserId`, `openedByRole` (`TALENT` | `CLIENT`).
    - `reason` (`NOT_DELIVERED`, `QUALITY`, `NO_SHOW`, `NOT_AS_DESCRIBED`, `PAYMENT`, `OTHER`).
    - `description`, `status` (`OPEN`, `UNDER_REVIEW`, `AWAITING_EVIDENCE`, `RESOLVED`).
    - `resolution` (`RELEASE_TO_TALENT`, `REFUND_CLIENT`, `SPLIT`), `splitTalentPct`, `resolutionNote`.
    - `resolvedByAdminId`, `approvedByAdminId` (second four-eyes approver).
    - `evidenceRequestedAt`, `openedAt`, `resolvedAt`, `createdAt`, `updatedAt`.
  - Updated `Booking` model with optional 1:1 relation `dispute Dispute?`.
- **Shared Types:** [`packages/types/src/dispute.ts`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/packages/types/src/dispute.ts)
  - Zod schemas and TypeScript types for `Dispute`, `DisputeReason`, `DisputeStatus`, `DisputeResolution`, and resolution inputs.

### B. Dispute Rules & SLA Config
- **File:** [`apps/api/src/config/disputeRules.ts`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/api/src/config/disputeRules.ts)
  - `DISPUTE_FOUR_EYES_THRESHOLD`: NGN 50,000,000 (500,000 NGN in kobo), USD 100,000 ($1,000 in cents), GBP 80,000 (£800 in pence).
  - `DISPUTE_TARGET_DAYS = 3` (72-hour SLA target).
  - `isFourEyesRequired(amountMinor, currency)`.
  - `isDisputeOverdue(openedAt)`.
  - Disclosure and chat review banner formatting.

### C. Backend Dispute Services & API Routes
- **Service:** [`apps/api/src/services/disputes.ts`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/api/src/services/disputes.ts)
  - `openDispute`: Transitions booking to `DISPUTED`, creates `Dispute`, creates linked `SupportTicket`, sends notifications, emits `dispute_opened`.
  - `listAdminDisputes`: Query queue with cursor pagination, search, status tabs, age, overdue flags, and four-eyes flags.
  - `getAdminDispute`: Evidence panel payload with joined facts, stored fees, order room delivery files, and state timeline.
  - `reviewDisputeChat`: Privacy-gated conversation review, writes `CHAT_VIEWED` with message count, returns banner and messages.
  - `requestDisputeEvidence`: Sets `AWAITING_EVIDENCE`, dispatches notifications, writes audit.
  - `resolveDispute`: Enforces four-eyes approval, executes idempotent release/refund, closes linked tickets, notifies parties, writes audit.
- **User Routes:** [`apps/api/src/routes/bookings.ts`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/api/src/routes/bookings.ts)
  - `PATCH /api/v1/bookings/:id/dispute` & `POST /api/v1/bookings/:id/dispute`.
  - `GET /api/v1/bookings/:id/dispute`.
- **Admin Routes:** [`apps/api/src/routes/admin/index.ts`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/api/src/routes/admin/index.ts)
  - `GET /api/v1/admin/disputes` & `/admin/disputes`
  - `GET /api/v1/admin/disputes/:id` & `/admin/disputes/:id`
  - `POST /api/v1/admin/disputes/:id/review-chat` & `/admin/disputes/:id/review-chat`
  - `POST /api/v1/admin/disputes/:id/request-evidence` & `/admin/disputes/:id/request-evidence`
  - `POST /api/v1/admin/disputes/:id/resolve` & `/admin/disputes/:id/resolve`
  - `POST /api/v1/admin/disputes/:id/approve` & `/admin/disputes/:id/approve`

### D. Main App Integration (`apps/web`)
- **API Client:** Added `openBookingDispute` and `getBookingDispute` in [`apps/web/src/lib/api-client.ts`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/web/src/lib/api-client.ts).
- **Telemetry:** Registered `dispute_opened` in `ALLOWED_WEB_EVENTS` in [`apps/web/src/lib/tracker.ts`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/web/src/lib/tracker.ts).
- **Order Room Interface:** [`apps/web/src/app/pages/OrderRoom.tsx`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/web/src/app/pages/OrderRoom.tsx)
  - Wired dispute modal with reason dropdown, issue description, and mandatory disclosure notice.
  - Prominent dispute under review banner displayed in Order Room when status is `DISPUTED`.

### E. Admin App Interfaces (`apps/admin`)
- **Client SDK:** Added dispute methods and TypeScript interfaces in [`apps/admin/src/lib/admin-client.ts`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/admin/src/lib/admin-client.ts).
- **Dispute Queue (`AD-17`):** [`apps/admin/src/app/disputes/page.tsx`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/admin/src/app/disputes/page.tsx)
  - Status filter tabs (`ALL`, `OPEN`, `UNDER_REVIEW`, `AWAITING_EVIDENCE`, `RESOLVED`), search, age, overdue 3-day badges, and four-eyes tags.
  - Wrapped in `<Suspense>` for clean CSR bailout compliance.
- **Dispute Detail & Evidence Panel (`AD-18`):** [`apps/admin/src/app/disputes/[id]/page.tsx`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/admin/src/app/disputes/[id]/page.tsx)
  - Evidence panel: Statements, delivery files, chronological state timeline, fee breakdown, and linked tickets.
  - Audited Conversation Review modal with mandatory reason input, `CHAT_VIEWED` audit logging, and the required disclosure banner.
  - Request Evidence modal for in-app/email dispatches.
  - Resolve Dispute modal with four-eyes enforcement and second-approver approval workflow.

---

## 3. Provider Findings & SPLIT Handling (Flag F11)

As documented in preflight findings (A0), `PaymentProvider` does **not** support automated partial refunds or partial releases:
- `PaymentProvider.refund()` only accepts the provider charge reference for full refunds.
- `PaymentProvider.releaseFunds()` only accepts single recipient transfers.
- In accordance with prompt instructions, `SPLIT` resolution is recorded as a **manual decision**:
  - The admin specifies talent and client percentage splits alongside a required written note.
  - Dispute status moves to `RESOLVED` with `resolution = "SPLIT"`.
  - Payout is marked for manual offline settlement without failing or attempting unsupported provider calls.

---

## 4. Verification & Test Results

### A. Test Execution Summary
- **Dedicated Dispute Suite (`src/admin/disputes.test.ts`):** **14/14 tests passing**
  - Dispute creation freezes release and transitions booking to `DISPUTED`.
  - Chat review refused without valid reason (min 5 chars).
  - Chat review refused without open dispute or linked ticket.
  - `SUPPORT`, `FINANCE`, and `SUPER_ADMIN` can review chat; logs `CHAT_VIEWED` with message count and returns banner.
  - `OPS` and `VIEWER` roles blocked from reviewing conversation messages (403).
  - Single admin resolves below four-eyes threshold immediately.
  - Single admin blocked above four-eyes threshold: records proposal, leaves funds unreleased.
  - Same proposing admin cannot provide second approval (403).
  - Second different admin approves and executes high-value resolution.
  - Strictly idempotent: replaying resolve on an already resolved dispute does not move money twice.
  - Release and refund amounts match stored booking amounts and fee rules.
  - Provider failure leaves state consistent and reports clear error.
- **Existing Payment & Booking Suites:**
  - `src/routes/bookings.test.ts`: **26/26 tests passing**.
  - `src/routes/admin.test.ts`: **92/92 tests passing**.
  - Full API Suite: **67/67 test suites passing, 793/793 tests passing**.
- **Web App Tests (`apps/web`):**
  - `src/app/pages/OrderRoom.test.tsx`: **5/5 tests passing**.
  - Full Web Suite: **37/37 test suites passing, 207/207 tests passing**.
- **Admin App Tests & Production Build (`apps/admin`):**
  - `vitest run`: **2/2 test suites passing, 9/9 tests passing**.
  - `next build`: Successfully compiled all 27 routes including `/disputes` and `/disputes/[id]`.
  - `check:bundle-secrets`: Clean (0 leaked secrets).

### B. Manual Verification Checklist
- [x] **Open dispute from app & review chat:** Opened dispute from test booking, submitted conversation review request with reason, verified message log rendered with mandatory logged banner, and confirmed `CHAT_VIEWED` audit row.
- [x] **Idempotent resolution:** Resolved dispute once via `POST /disputes/:id/resolve`, replayed request, and verified money moved exactly once with `alreadyResolved: true`.
- [x] **Four-eyes gate:** Verified a dispute above the currency threshold requires two different administrators to resolve before money moves.

---

## 5. Carry Forward

**A9 done. Disputes can be opened in the app, reviewed with evidence and logged chat access, and resolved idempotently with four-eyes.**

