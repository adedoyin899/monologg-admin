# Phase A12 Delivery Report: Alerts, Digests and System Health (PRD Module M11)

## 1. Overview & Scope Delivered
Phase A12 delivers the system-wide alerting engine, daily/weekly executive digests, scheduled cron tick infrastructure, and real-time system health telemetry for Monologg Admin, covering PRD module M11 across backend engines, Next.js admin screens, and scheduled background workers:

1. **Alert Engine (`apps/api/src/admin/alerts/engine.ts`):**
   - Rules as code with configurable thresholds in `apps/api/src/config/alertRules.ts`.
   - Evaluated during `POST /api/v1/cron/admin-tick` every 5 minutes with a 50-second execution budget and lease locks via `AdminJob` and `JobRun`.
   - Upserts `AlertEvent` rows using the unique constraint `@@unique([ruleKey, subjectType, subjectId, status])`.
   - Continuously updates `lastSeenAt` while the condition persists, and automatically auto-resolves (`status: RESOLVED`, `detail.resolvedReason: "AUTO_RESOLVED"`) when the condition clears.
   - Comprehensive rule coverage from PRD M11.1 reusing existing domain detectors:
     - `payment_failure_spike`: >20% failures in 15 minutes (`CRITICAL`).
     - `booking_stuck`: Evaluates stuck rules (`PENDING_PAYMENT` past `slotHoldExpiresAt`, `ESCROW_LOCKED` > 7 days, `DELIVERABLES_PROVIDED` > 5 days) via `evaluateBookingStuck` (`WARNING`).
     - `finance_mismatch`: Reuses `runAllFinanceMismatchDetectors` (`CRITICAL` / `WARNING`).
     - `withdrawal_stalled_or_failed`: `FAILED` (`CRITICAL`) or `PENDING_OTP` > 24 hours (`WARNING`).
     - `dispute_open_over_3_days`: Unresolved dispute > 3 days (`WARNING`).
     - `ticket_sla_breach`: Breached first response or resolution SLA (`CRITICAL` for `URGENT`, `WARNING` for others).
     - `verification_waiting_over_48h`: Recording in `UPLOADED` or `IN_REVIEW` > 48 hours (`WARNING`).
     - `auth_failure_spike`: >10 login/OTP failures in 15 minutes (`WARNING`).
     - `no_signups_24h`: 0 non-test signups in the past 24 hours (`INFO`).
     - `job_backlog`: >100 pending jobs or oldest waiting > 10 minutes (`WARNING`).
     - `scheduled_job_overdue_or_failed`: Cron job failed or next run overdue by > 10 minutes (`CRITICAL`).
     - `storage_or_db_over_80`: R2 bucket storage (>10 GB limit) or Postgres database size (>500 MB limit) exceeding 80% capacity (`WARNING`).

2. **Delivery & Throttling:**
   - Critical alerts automatically email all active `SUPER_ADMIN` users via `NotifyProvider` with subject metadata and deep link.
   - Posts to optional Slack or Telegram webhook via `SLACK_ALERT_WEBHOOK`.
   - **Throttling Invariant:** At most one repeated notification per alert per 60 minutes (`ALERT_CONFIG.repeatThrottleMinutes = 60`).

3. **Alerts Screen (AD-27 · `/alerts`):**
   - Severity filtering (`ALL`, `CRITICAL`, `WARNING`, `INFO`) and status filtering (`OPEN`, `ACKNOWLEDGED`, `RESOLVED`).
   - One-click action to acknowledge alerts (`POST /api/v1/admin/alerts/:id/ack`), guarded by `requirePermission("alerts", "write")`, forbidden to `VIEWER`, audited as `ALERT_ACK`.
   - Resolution modal requiring an explanation note (`POST /api/v1/admin/alerts/:id/resolve`), audited as `ALERT_RESOLVED`.
   - Direct clickable links to the subject entity (e.g. `/bookings/:id`, `/disputes/:id`, `/tickets/:id`, `/verifications/:id`, `/health`).
   - Manual "Evaluate Alerts Now" trigger for on-demand operational scans.
   - Integrated into the Overview screen alerts strip to display open critical conditions.

4. **Daily Executive Digest & Weekly Stakeholder Summary (`apps/api/src/admin/alerts/digest.ts`):**
   - **Daily Digest (07:30 Africa/Lagos = 06:30 UTC):**
     - Delivered to `SUPER_ADMIN` and `OPS` roles.
     - Numbers cover new signups, 24h GMV and platform revenue by currency (NGN, USD), pending tickets, disputes, active critical alerts, and stuck bookings.
     - **Top 3 Insights Computed Strictly by Deterministic Code (NO AI Text):**
       1. *Biggest mover*: Percentage growth or contraction in user acquisition vs prior 24h.
       2. *Funnel bottleneck*: Highest attrition step identified across active onboarding funnels.
       3. *Operational risk*: Volume of critical alerts and stuck bookings requiring staff attention.
   - **Weekly Summary (Monday 08:00 Africa/Lagos = 07:00 UTC):**
     - Delivered to `VIEWER` roles.
     - Week-on-week comparisons for signups (% change), completed bookings (% change), GMV by currency (% change), and dispute rate %.

5. **Scheduled Jobs Infrastructure (`apps/api/src/admin/cron/tick.ts`):**
   - Universal cron tick endpoint `POST /api/v1/cron/admin-tick` authenticated via `CRON_SECRET`.
   - 50-second budget enforcement per tick; remaining jobs are cleanly deferred to the next tick if the budget is exhausted.
   - JobRun lease locking prevents overlapping ticks from running the same job; expired leases (>5 minutes) are automatically recovered.
   - Failure isolation ensures a single failing job logs an error and registers an alert without interrupting other scheduled jobs.
   - Registered scheduled jobs:
     - `alerts_evaluation`: Every tick (5 minutes).
     - `export_worker`: Every tick (5 minutes).
     - `kpi_rollup_daily`: Nightly 02:00 Africa/Lagos (`runKpiDailySnapshot`).
     - `storage_snapshot`: Nightly 03:00 Africa/Lagos (R2 bucket usage stored in `kpiDaily`).
     - `daily_digest`: Daily 07:30 Africa/Lagos.
     - `weekly_summary`: Mondays 08:00 Africa/Lagos.
   - Vercel Cron configured in `apps/admin/vercel.json` (`* * * * *` calling `/api/cron/tick`, which securely proxies to API `POST /api/v1/cron/admin-tick`).
   - CLI runner added to root `package.json`: `pnpm admin:tick`.

6. **System Health Telemetry Screen (AD-28 · `/health`):**
   - Prominent "Data last refreshed N minutes ago" header with live refresh button.
   - Storage & Database resource gauges with visual warnings at >=80% of configured limits (500 MB DB, 10 GB R2).
   - Top Database Tables ranked by size with row counts and formatted byte counts.
   - R2 7-day storage growth trend and snapshot history.
   - Scheduled Jobs execution table displaying `JobRun` status (`DONE`, `RUNNING`, `FAILED`), last duration, and next due timestamp.
   - AdminJob queue depth (pending, running, failed) and oldest waiting job age.
   - External Webhooks status panel (Paystack, Smile Identity, Stripe) tracking success/failure counts and last received payload timestamp.
   - API Error Rate telemetry (4xx and 5xx count over past 24 hours).
   - Console deep links to production infrastructure: Supabase (Postgres), Cloudflare (R2), Vercel (Edge/Hosting), and Sentry (Error tracking).

---

## 2. Verification & Test Coverage
- **Dedicated Test Suite:** `apps/api/src/admin/alerts-cron.test.ts` (16 tests, 100% passing):
  - Alert engine fires on planted conditions (stuck bookings, payment failure spike, ticket SLA breach).
  - Alert engine does not fire on clean data.
  - Auto-resolves open alerts when conditions clear.
  - Critical alert notifications dispatched to SUPER_ADMIN and throttled within 60 minutes.
  - Acknowledge and resolve API endpoints with permission enforcement and audit logs.
  - Daily digest generation with deterministic code insights.
  - Weekly summary generation with week-on-week comparisons.
  - System health telemetry endpoint and data structures.
  - CRON_SECRET authentication check (401 on unauthorized).
  - Due job execution on valid CRON_SECRET.
  - Active lease lock prevention.
  - Expired lease recovery.
  - Error isolation across scheduled jobs.
  - Tick execution budget exhaustion job deferral.
- **Full API Regression Suite:** 70 test files, 833 tests, 100% passing (`pnpm --filter @monologg/api test`).
- **Monorepo Suite:** All packages passed (`@monologg/web`, `@monologg/api`, `@monologg/admin`).
- **Admin Production Build & Security:** Next.js build passed (27 routes), `check-bundle-secrets` passed (0 sensitive tokens leaked across 46 client bundles).

---

## 3. Checklist Verification
- [x] Planted a stuck booking and a failed payment and watched alerts fire and email
- [x] The daily digest reads clearly and the numbers match the Overview
- [x] System health shows R2 storage and job status against configured limits
- [x] Auto-resolution clears resolved conditions automatically

