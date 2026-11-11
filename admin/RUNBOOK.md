# Monologg Admin Operations Runbook

**Version:** 1.0.0-alpha.1  
**Audience:** Platform Engineers, Site Reliability Engineers (SRE), Operations Leads, Support Staff  
**Last Updated:** February 2026  

---

## Table of Contents
1. [Daily Alpha Morning Check (< 15 Minutes)](#1-daily-alpha-morning-check--15-minutes)
2. [Admin User Management](#2-admin-user-management)
   - [Inviting Admins](#inviting-admins)
   - [Changing Roles](#changing-roles)
   - [Immediate Admin Revocation](#immediate-admin-revocation)
3. [User & Cohort Management](#3-user--cohort-management)
4. [Support & Complaints Workflow](#4-support--complaints-workflow)
5. [Disputes & Conversation Review](#5-disputes--conversation-review)
6. [Verification & Compliance Review](#6-verification--compliance-review)
7. [Alerts & Incident Response](#7-alerts--incident-response)
   - [Acknowledging and Resolving Alerts](#acknowledging-and-resolving-alerts)
   - [Recovering Stuck Job Leases](#recovering-stuck-job-leases)
8. [Secrets & Configuration Management](#8-secrets--configuration-management)
   - [Rotating CRON_SECRET](#rotating-cron_secret)
   - [Switching ADMIN_AUTH_PROVIDER](#switching-admin_auth_provider)
9. [Development, Data Seeding & Backups](#9-development-data-seeding--backups)
   - [Running the Synthetic Dataset Generator Locally](#running-the-synthetic-dataset-generator-locally)
   - [Database Backup & Disaster Recovery](#database-backup--disaster-recovery)
10. [Alpha Success Criteria & Beta Carry-Over List](#10-alpha-success-criteria--beta-carry-over-list)

---

## 1. Daily Alpha Morning Check (< 15 Minutes)

Run this checklist every morning at 08:30 UTC / 09:30 Lagos time.

### Step 1: Health & Telemetry Check (2 mins)
1. Navigate to **System Health** (`/health`).
2. Verify Database Size: Ensure Postgres storage is `< 80%` of provisioned quota (`databaseLimitBytes: 500 MB`).
3. Verify R2 Storage: Ensure bucket usage is `< 80%` of provisioned quota (`storageLimitBytes: 10 GB`).
4. Verify Scheduled Jobs: Confirm `alerts_evaluation`, `export_worker`, and `kpi_rollup_daily` show `status: DONE` and `nextDueAt` within schedule.

### Step 2: Open Alerts Review (3 mins)
1. Navigate to **Overview** (`/`) or **Alerts** (`/alerts`).
2. Filter by `Status: OPEN` and `Severity: CRITICAL`.
3. If critical alerts exist (e.g., payment failure spike, stuck escrow hold), click into the subject link and follow the incident SOP.
4. For non-critical warnings, click **Acknowledge** and add an investigation note.

### Step 3: Verification Queue Pass (3 mins)
1. Navigate to **Verifications** (`/verifications`).
2. Check recordings approaching the 48-hour SLA mark.
3. Review videos using the guideline checklist:
   - Waist-up framing, face & hands visible.
   - Natural gestures, good lighting.
   - Under 90 seconds.
4. Click **Approve** or **Needs Re-Record** with appropriate canned feedback.

### Step 4: Dispute & Ticket Backlog (4 mins)
1. Navigate to **Disputes** (`/disputes`). Ensure no active dispute exceeds the 72-hour review target.
2. Navigate to **Tickets** (`/tickets`). Check the `Urgent` and `Unassigned` views. Assign tickets nearing first response SLA (4 hours for Urgent, 24 hours for Normal).

### Step 5: Finance & Escrow Spot Check (3 mins)
1. Navigate to **Finance / Payments** (`/payments`).
2. Ensure no mismatch alerts are active:
   - Check Payment `ESCROW_HELD` vs Booking state.
   - Check Payment failure rate (<20%).
   - Check pending withdrawals in `/withdrawals` for items exceeding 24 hours.

---

## 2. Admin User Management

### Inviting Admins
> **Required Role:** `SUPER_ADMIN`

1. Navigate to **Admin Users** (`/admins`).
2. Click **Invite Admin User**.
3. Enter official organization email (`name@admin.monologg.dev`).
   - *Guardrail:* The system strictly refuses consumer emails or emails already belonging to client/talent accounts.
4. Select Role: `SUPER_ADMIN`, `OPS`, `SUPPORT`, `FINANCE`, `COMPLIANCE`, or `VIEWER`.
5. The invited administrator receives an invitation link. Upon first login, they must configure TOTP MFA (AAL2).

### Changing Roles
1. In `/admins`, locate the admin user and click **Edit Role**.
2. Select the new role and confirm.
3. The change is audited immediately in `AdminAuditLog` (`ADMIN_ROLE_CHANGE`).
4. The admin's permissions update on their next API request without requiring a re-login.

### Immediate Admin Revocation
> **Emergency SOP:** Used when offboarding an admin or mitigating credential compromise.

1. Locate the administrator in `/admins`.
2. Click **Disable Account** (or call `POST /api/v1/admin/admins/:id/disable`).
3. **What happens immediately:**
   - `AdminUser.status` is set to `DISABLED`.
   - All active `AdminSession` records (`endedAt: null`) are terminated instantly.
   - Any refresh tokens are invalidated.
   - All subsequent API requests from this user immediately return `403 Forbidden: "This account has been disabled."`.
   - Action is written to `AdminAuditLog` (`ADMIN_DISABLED`).

---

## 3. User & Cohort Management

### Adding Cohort Tags
1. Navigate to **Users** (`/users`).
2. Search for the target creator or client by handle, name, or email.
3. Click into **User 360** (`/users/:id`).
4. Under the user header, click **Add Tag** or manage existing tags (e.g., `alpha_creator`, `top_performer`, `pilot_brand`).
5. **Bulk Cohort Tagging:**
   - In `/users`, select multiple user checkboxes.
   - In the bulk actions toolbar, click **Add Cohort Tag**, enter tag name, and confirm.

### Revealing PII
> **Required Role:** `SUPER_ADMIN` or `OPS` (`VIEWER`, `SUPPORT`, `COMPLIANCE` forbidden).

1. In User 360, sensitive contact details (phone, email, full legal name) are masked by default.
2. Click **Reveal PII**.
3. A modal prompts for an **Access Reason** (minimum 5 characters, e.g., *"Customer requested phone callback for payout resolution"*).
4. Unmasked fields are returned for that view session only.
5. Action is recorded in `AdminAuditLog` (`PII_REVEALED`) with the admin ID, target user ID, reason, and timestamp.

---

## 4. Support & Complaints Workflow

### Triage & Assignment
1. Support tickets populate in `/tickets` with priority `URGENT`, `HIGH`, `NORMAL`, or `LOW`.
2. First response SLAs:
   - `URGENT`: 4 hours.
   - `NORMAL`: 24 hours.
3. Filter by **Unassigned** and assign to an agent.

### Replying & Internal Notes
- **Customer Replies:** Sent directly to the user's help inbox in the main consumer app.
- **Internal Notes:** Highlighted in amber/yellow with an eye-off icon. Internal notes are visible only to admins and never leaked to the consumer client.
- **Canned Responses:** Use the canned reply picker for common scenarios (payout times, escrow explanations, deliverable verification).

### Creating Ticket on Behalf of User
1. Click **Create Ticket on Behalf of User** in `/tickets`.
2. Enter User ID or search by email.
3. Select Category (`PAYOUTS`, `BOOKING`, `TECHNICAL`, `FEEDBACK`).
4. Optionally link a `Booking ID`.
5. Enter description and submit. The user receives an in-app ticket confirmation.

---

## 5. Disputes & Conversation Review

> **Safety Warning:** Disputes involve held escrow funds and private user correspondence. High scrutiny required.

### Dispute Evidence Review
1. Navigate to **Disputes** (`/disputes/:id`).
2. Review the Evidence Panel:
   - Original brief and agreed milestones.
   - Delivery files, timestamps, and revision requests.
   - Statements from both Talent and Client.
   - Linked support tickets.

### Conversation Review SOP
1. To view private order room messages, click **Review Private Messages**.
2. **Access Requirements:** Must provide a justification reason. Access is audited as `CHAT_VIEWED`.
3. A banner is permanently displayed: *"You are viewing private messages for dispute <id>. This access is logged."*
4. Access is strictly read-only; no message spoofing or editing is possible.

### Resolving Disputes & Four-Eyes Approval
1. Click **Resolve Dispute**.
2. Select resolution outcome:
   - `RELEASE_TO_TALENT`: 100% of escrow disbursed to talent.
   - `REFUND_TO_CLIENT`: 100% of escrow refunded to client.
   - `SPLIT`: Enter custom split percentage (e.g., 50% / 50%).
3. Enter required **Resolution Note**.
4. **Four-Eyes Threshold Rule:**
   - If dispute value exceeds `₦1,500,000` (~`$1,000`), the dispute moves to `AWAITING_APPROVAL`.
   - A second admin (`SUPER_ADMIN` or `COMPLIANCE`) must click **Approve Resolution** to execute the money movement.

---

## 6. Verification & Compliance Review

### Video Review Queue (`/verifications`)
1. Review the creator's 90-second onboarding recording via the short-lived signed video player (5-minute signed URL, audited `MEDIA_VIEWED`).
2. Evaluate against the 5-point guideline checklist:
   - [ ] Waist-up framing
   - [ ] Face and hands visible
   - [ ] Good, even lighting
   - [ ] Natural gestures
   - [ ] Under 90 seconds in duration
3. **Decisions:**
   - **Approve:** Updates status to `APPROVED`. Talent profile activates for bookings.
   - **Needs Re-Record:** Select template reason (e.g., poor audio, framing cutoff) and enter friendly guidance.

### X3 Guardrail Notice
> [!IMPORTANT]
> Admin verification actions **NEVER** write or overwrite `Creator.verification` badge directly or mutate `KycCheck` tables. Verification recordings are compliance assets reviewed independently of automated Smile Identity / Stripe KYC checks.

---

## 7. Alerts & Incident Response

### Acknowledging and Resolving Alerts
1. In `/alerts`, open alerts indicate degraded performance or platform mismatches.
2. Click **Acknowledge** to indicate an operator is actively investigating. This suppresses repeated notification emails for 60 minutes.
3. Once the root cause is resolved, click **Resolve** and enter a resolution summary.
4. Auto-resolving alerts (e.g., stuck bookings that transitioned to clean states) resolve automatically on the next 5-minute cron tick.

### Recovering Stuck Job Leases
If an automated background job (e.g., `export_worker` or `kpi_rollup_daily`) terminates unexpectedly, a lease lock may remain in `JobRun`.
1. The cron tick engine automatically checks `JobRun.lastStartedAt`. If older than 5 minutes (`LEASE_TIMEOUT_MS`), the lease is recovered automatically on the next tick.
2. To manually force recovery via CLI:
```bash
pnpm --filter @monologg/api tsx -e '
  import { prisma } from "./src/db/client.js";
  await prisma.jobRun.update({
    where: { jobKey: "export_worker" },
    data: { lastStatus: "FAILED", lastError: "Manually recovered by operator" }
  });
'
```

---

## 8. Secrets & Configuration Management

### Rotating CRON_SECRET
1. Generate a high-entropy 256-bit secret:
```bash
openssl rand -hex 32
```
2. Update the environment variable in Vercel / Railway / Docker:
```env
CRON_SECRET=new_hex_value_here
```
3. Update the scheduled caller (e.g., GitHub Actions, Supabase `pg_cron`, or Cloudflare Worker Cron Trigger) with the header:
```http
Authorization: Bearer <new_hex_value_here>
```
4. Verify by curling the tick route:
```bash
curl -X POST https://api.monologg.dev/api/v1/cron/admin-tick \
  -H "Authorization: Bearer <new_hex_value_here>"
```
Expect HTTP 200 with `{ "status": "ok", "jobsExecuted": [...] }`.

### Switching ADMIN_AUTH_PROVIDER
The platform supports modular authentication verifiers (`mock`, `supabase`, `clerk`):
1. In `.env`, set:
```env
ADMIN_AUTH_PROVIDER=supabase # or mock, clerk
```
2. For Supabase: Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured.
3. For Clerk: Ensure `CLERK_SECRET_KEY` is configured.
4. When switched, the authentication middleware adapts automatically without altering database tables or admin roles.

---

## 9. Development, Data Seeding & Backups

### Running the Synthetic Dataset Generator Locally
To generate a full deterministic dataset (120 users, 60 bookings, payments, tickets, and 1,000+ product events) for development or testing:

```bash
# From workspace root
pnpm --filter @monologg/api tsx scripts/generate-synthetic-data.ts
```

> **Safety:** The script checks `process.env.NODE_ENV === "production"` and throws an error if executed in a production environment.

### Database Backup & Disaster Recovery
- **Daily Automated Backups:** Configured on Supabase / AWS RDS with point-in-time recovery (PITR) up to 7 days.
- **Manual Snapshot:**
```bash
pg_dump -Fc -h db.monologg.dev -U postgres monologg > backup_$(date +%Y%m%d_%H%M%S).dump
```
- **Disaster Restore Procedure:**
```bash
pg_restore -v -d monologg backup_YYYYMMDD_HHMMSS.dump
```
- **Post-Restore Verification:**
1. Check database connectivity: `pnpm --filter @monologg/api test src/routes/health.test.ts`.
2. Verify admin login and session creation.
3. Run cron tick to reconcile alerts and KPI snapshots.

---

## 10. Alpha Success Criteria & Beta Carry-Over List

### Alpha Success Criteria (PRD Section 14)
- [x] **Zero Credential Leaks:** Response scanner verifies 0 forbidden keys across 22 admin routes.
- [x] **Strict PII Masking:** All user contact details masked by default; reveals audited.
- [x] **Four-Eyes Governance:** Payouts and disputes exceeding ₦1,500,000 require dual approval.
- [x] **Deterministic Telemetry:** Daily KPI rollups execute under 50-second budget.
- [x] **15-Minute Morning Check:** Operators can verify platform health, alerts, and SLA compliance in under 15 minutes.

### Beta Carry-Over Scope (PRD Section 14)
The following features are intentionally scheduled for Beta Phase:
1. **Direct Bank Automated Payouts:** Replacing manual Paystack transfer approval with automated webhook-driven bulk disbursal.
2. **Granular Attribute Schema Editor:** Dynamic runtime schema configuration for physical attributes and category taxonomies.
3. **Advanced Anomaly ML:** Machine learning-based transaction fraud scoring replacing fixed rule-based threshold detectors.
4. **Multi-Region R2 Replication:** Active-active portfolio asset replication across European and West African edge POPs.
5. **Mobile Native Push Notifications:** Admin alerting via mobile APNs/FCM alongside Slack/Email.

