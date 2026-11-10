# Phase A8 Completion Report: Support and Complaints

**Maps to:** PRD Module M7 (Support & Complaints)  
**Date:** 2026-11-11  
**Branch:** `main`  
**Status:** COMPLETE & VERIFIED

---

## 1. Overview & Objectives

Phase A8 connects end-user issue resolution, complaints, and platform feedback directly to admin operational workflows with strict SLA tracking:
- **Additive Support Schema:** Extended existing Phase 10 support models safely with zero data loss or duplicate models, introducing `TicketMessage` threading, typed categories, priorities, sources, auto-formatted ticket numbers (`MNL-XXXX`), and SLA timestamps.
- **Main App End-User Complaint Entrypoints:**
  - **Account Menu / Navigation:** "Get Help" entry in user navigation directing to `/support` with category selection, booking association, and SLA expectation copy.
  - **Booking & Order Rooms:** "Report a problem" trigger pre-populating context (`bookingId`, dispute category) from active orders.
  - **Alpha Feedback Prompt:** Inline thumbs up/down rating with optional comment creating tagged `FEEDBACK` tickets and emitting `feedback_submitted`.
  - **Telemetry:** User interactions emit `help_opened`, `ticket_created`, and `feedback_submitted` events.
  - **Help & Support View:** Users can view their existing tickets, see staff replies, and send replies directly in-app.
- **Support Inbox (`AD-15`):** Admin triage workspace with dedicated operational views (`Unassigned`, `Assigned to Me`, `Urgent`, `Waiting on User`, `All`), URL filters, live SLA countdown clock (green/amber/red breach status), and "+ New on Behalf" ticket modal.
- **Ticket Detail & Thread (`AD-16`):** Multi-party conversation thread, user context card, linked booking card, canned replies picker, and keyboard shortcuts (`Cmd+Enter` / `Ctrl+Enter` to reply).
- **Internal Notes Guarantee:** Strict privacy invariant ensuring internal staff notes (`isInternal: true`) are excluded from all user-facing endpoints and views.
- **Staff Actions & Auditing:** Assigning, priority/status updates, resolution notes, and ticket creation on behalf of users are fully audited in `AdminAuditLog`.

---

## 2. Deliverables & Implementations

### A. Data Models & Schema Extensions
- **Prisma Schema:** [`apps/api/prisma/schema.prisma`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/api/prisma/schema.prisma)
  - Extended `SupportTicket` model:
    - `number`: Unique integer for human-readable IDs (`MNL-1001`).
    - `reporterEmail`: Direct contact tracking.
    - `category`: `TicketCategory` (`ACCOUNT`, `BOOKING`, `PAYMENT`, `DISPUTE`, `TECHNICAL`, `SAFETY`, `FEEDBACK`, `OTHER`).
    - `priority`: `TicketPriority` (`LOW`, `NORMAL`, `HIGH`, `URGENT`).
    - `source`: `TicketSource` (`IN_APP`, `EMAIL`, `ORDER_ROOM`, `ADMIN_ON_BEHALF`, `FEEDBACK_PROMPT`).
    - `assignedAdminId`: Relation to admin assignee.
    - `firstResponseAt`, `resolvedAt`, `slaDueAt`, `resolutionNote`.
    - Added `WAITING_ON_USER` to `SupportTicketStatus`.
  - Added `TicketMessage` model:
    - Threaded messages with `ticketId`, `authorType` (`USER`, `STAFF`, `SYSTEM`), `senderId`, `senderRole`, `body`, `isInternal`, `attachments`, `createdAt`.
- **Shared Types:** [`packages/types/src/support.ts`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/packages/types/src/support.ts)
  - Zod schemas for `TicketCategory`, `TicketPriority`, `TicketStatus`, `TicketSource`, `TicketAuthor`, and `TicketMessage`.

### B. SLA Rules & Configuration
- **File:** [`apps/api/src/config/slaRules.ts`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/api/src/config/slaRules.ts)
  - SLA Thresholds: Standard first response within **24 hours**; `URGENT` first response within **4 hours**.
  - `computeSlaDeadline(priority, createdAt)`: Calculates accurate deadlines.
  - `isSlaBreached(ticket)`: Identifies breached SLAs for notifications and inbox alerts.
  - `formatTicketNumber(number)`: Standard format `MNL-1001`.
  - `CANNED_REPLIES`: Configurable response templates for greeting, booking inquiry, payment investigation, and dispute escalation.
  - `USER_CONFIRMATION_MESSAGES`: Standard voice copy ("We have your message. We usually reply within 24 hours.").

### C. Services & API Endpoints
- **User-Facing Service & Endpoints:** [`apps/api/src/services/support.ts`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/api/src/services/support.ts) & [`apps/api/src/routes/support.ts`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/api/src/routes/support.ts)
  - `POST /api/v1/support/tickets`: Creates ticket, initializes SLA deadline, and dispatches confirmation.
  - `GET /api/v1/support/tickets`: Lists user's tickets (excluding internal messages).
  - `GET /api/v1/support/tickets/:id`: Retrieves ticket and public message thread (`where: { isInternal: false }`).
  - `POST /api/v1/support/tickets/:id/messages`: Adds user reply, updates status from `WAITING_ON_USER` to `IN_PROGRESS`.
- **Admin Support Service & Routes:** [`apps/api/src/services/adminSupport.ts`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/api/src/services/adminSupport.ts) & [`apps/api/src/routes/admin/index.ts`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/api/src/routes/admin/index.ts)
  - `GET /api/v1/admin/tickets`: Lists tickets with tab filtering (`mine`, `unassigned`, `urgent`, `waiting_user`, `all`), search, priority, category, and cursor pagination.
  - `GET /api/v1/admin/tickets/canned-replies`: Returns canned reply templates.
  - `GET /api/v1/admin/tickets/:id`: Returns full ticket, complete thread (including internal notes), joined user info, and linked booking.
  - `POST /api/v1/admin/tickets/:id/reply`: Posts public staff reply, sets `firstResponseAt` if unrecorded, dispatches in-app notification and email via `NotifyProvider`, and logs audit trail.
  - `POST /api/v1/admin/tickets/:id/notes`: Adds staff-only internal note (`isInternal: true`), audited.
  - `POST /api/v1/admin/tickets/:id/assign`: Assigns ticket to admin user, audited.
  - `POST /api/v1/admin/tickets/:id/priority`: Updates priority and recalculates SLA, audited.
  - `POST /api/v1/admin/tickets/:id/status`: Updates status, captures `resolvedAt` and `resolutionNote` when resolved/closed, audited.
  - `POST /api/v1/admin/tickets/on-behalf`: Creates ticket on behalf of user, audited.

### D. Main App Integration (`apps/web`)
- **Navigation:** [`apps/web/src/app/components/ui/Sidebar.tsx`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/web/src/app/components/ui/Sidebar.tsx)
  - "Get Help" entry added to sidebar directing users to `/support`.
- **Order Room Integration:** [`apps/web/src/app/pages/OrderRoom.tsx`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/web/src/app/pages/OrderRoom.tsx)
  - "Report a problem" button opens modal prefilled with booking context.
- **Modal Component:** [`apps/web/src/app/components/ReportProblemModal.tsx`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/web/src/app/components/ReportProblemModal.tsx)
  - Category, priority, message input with SLA confirmation dialog.
- **Feedback Prompt:** [`apps/web/src/app/components/AlphaFeedbackPrompt.tsx`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/web/src/app/components/AlphaFeedbackPrompt.tsx)
  - Inline rating (thumbs up/down) with optional comments, creating `FEEDBACK` ticket and emitting telemetry.
- **Help Center View:** [`apps/web/src/app/pages/HelpSupport.tsx`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/web/src/app/pages/HelpSupport.tsx)
  - Updated to show user tickets, active thread with staff replies, reply composer, and brand voice SLA confirmation copy.

### E. Admin App Interfaces (`apps/admin`)
- **Support Inbox (`AD-15`):** [`apps/admin/src/app/tickets/page.tsx`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/admin/src/app/tickets/page.tsx)
  - View switcher tabs with live counts (`Unassigned`, `Assigned to Me`, `Urgent`, `Waiting on User`, `All`).
  - Live SLA countdown badges showing remaining time or breach duration.
  - Search by ticket number, subject, user email, or reporter.
  - "+ New on Behalf" modal for phone or external complaint intake.
- **Ticket Detail & Thread (`AD-16`):** [`apps/admin/src/app/tickets/[id]/page.tsx`](file:///Users/oyeniyiadedoyin/Desktop/Anti%20gravity%20Projects/Monologg%20Admin/apps/admin/src/app/tickets/[id]/page.tsx)
  - Conversation thread distinguishing between user messages, public staff replies, and internal notes (highlighted with amber lock banner).
  - Reply composer supporting public replies and internal notes with canned response dropdown.
  - Keyboard shortcuts: `Cmd+Enter` / `Ctrl+Enter` to send reply.
  - Right rail: User details, linked booking metadata with direct link, SLA status clock, and resolution summary.

---

## 3. Verification & Test Results

### A. Test Execution Summary
- **Backend API Tests (`apps/api`):**
  - `src/admin/support-tickets.test.ts`: **15/15 tests passing**
    - Verifies ticket creation on behalf of user.
    - Verifies public staff replies generate audit logs and notifications.
    - Verifies internal notes are strictly filtered from user endpoints (`isInternal: true`).
    - Verifies SLA calculation (4h urgent vs 24h standard).
    - Verifies ticket assignment, status, and priority updates.
    - Verifies role-based access controls (`VIEWER` cannot write).
  - Full API Suite: **66/66 test suites passing, 779/779 tests passing**.
- **Web App Tests (`apps/web`):**
  - **37/37 test suites passing, 207/207 tests passing**.
  - All existing Help & Support tests pass without regression.
- **Admin App Tests (`apps/admin`):**
  - **2/2 test suites passing, 9/9 tests passing**.
  - Production build (`pnpm --filter @monologg/admin build`): All 27 pages compiled cleanly.
  - Bundle secrets check passed (`0 leaked secrets`).

### B. Manual Verification Checklist
- [x] **Report a problem from a booking:** Created a problem report from an active booking, observed it appear in admin Support Inbox, replied as staff, and verified reply rendered in user view.
- [x] **Internal notes privacy:** Added an internal note from admin panel; verified note is visible to staff but completely omitted from user ticket API response and UI.
- [x] **First response tracking:** First staff reply recorded `firstResponseAt` and stopped the initial SLA countdown clock.
- [x] **SLA breach alert:** Verified overdue tickets trigger amber/red badges based on 24h standard / 4h urgent thresholds.

---

## 4. Carry Forward

**A8 done. Complaint channels exist in the app and the support inbox works with SLAs and notifications.**

