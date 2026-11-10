# Monologg Admin · Phase A0 Preflight Report

**Date:** 2026-11-10  
**Status:** Complete with **CRITICAL SECURITY BLOCKER**  
**Author:** Antigravity (Phase A0 Preflight)  
**Audience:** Maz, Engineering  

---

## 1. Blockers & Urgent Findings (Ordered by Severity)

### 1.1 [CRITICAL BLOCKER] Data API & PII Leak via Supabase Anon Key
- **Finding:** Four tables in the `public` schema return live data or internal schema information to unauthenticated clients using only `SUPABASE_ANON_KEY`:
  1. `InvestorApplication`: Public SELECT policy (`USING (true)`) leaks names, emails, phone numbers, and investment memos.
  2. `NewsletterSubscriber`: Public SELECT and UPDATE policies (`USING (true)`) expose subscriber email addresses and allow arbitrary edits.
  3. `AnalyticsEvent`: Public SELECT policy (`USING (true)`) exposes 1,721 user telemetry events, session IDs, and user IDs.
  4. `_prisma_migrations`: RLS is completely **DISABLED**, exposing database migration history.
- **Root Cause:** In earlier sessions (Sessions 174, 184, 194), client-side pages (`ResourcesPage.tsx`, `WebsiteFooter.tsx`, `analytics.ts`) were wired directly to PostgREST via `supabase.from(...)`. The RLS policies created inadvertently granted public read access.
- **Action Required:** Apply the exact SQL fix documented in `admin/ANON_AUDIT.md` before deploying or launching alpha. Do not apply without human review.

### 1.2 [HIGH] Notification Payload Leaks OTP Codes (PRD Flag F10 Confirmed)
- **Finding:** In `src/services/withdrawals.ts`, when sending in-app notifications for withdrawal OTPs, the unhashed 6-digit code is placed in `Notification.payload`:
  ```ts
  payload: { withdrawalRequestId, code, expiresAt, maskedEmail }
  ```
- **Impact:** Any admin route reading `Notification` records could expose active OTP codes if payloads are returned.
- **Remediation:** PRD Invariant #4 and Flag F10 are strictly validated. Admin API endpoints must NEVER serialize `Notification.payload` for `WITHDRAWAL_OTP` or sign-in notification types.

### 1.3 [HIGH] Supabase Free Tier Risk (PRD Flag F1 & Decision D11)
- **Finding:** Database size is currently **14 MB** on a Supabase Free tier project (`uuacczlwejzjbhhcyjii`).
- **Impact:** On Free tier, the database automatically pauses after 7 days of inactivity and has no automated PITR backups.
- **Recommendation:** Upgrade to **Supabase Pro** prior to the alpha cohort launch.

### 1.4 [MEDIUM] PaymentProvider Does Not Support Partial SPLIT (Decision D6 & Flag F11)
- **Finding:** Inspection of `src/providers/payment.interface.ts` and `src/providers/payment.real.ts` reveals:
  - `refund(ref: string)` only supports full refunds.
  - `releaseFunds()` currently throws an error indicating Paystack transfer recipient codes have not been collected.
  - Neither partial refund nor partial release is implemented in `PaymentProvider`.
- **Decision:** In Phase A9 (Disputes), build `RELEASE_TO_TALENT` and `REFUND_CLIENT` first. Flag `SPLIT` as manual-only until provider support is added.

---

## 2. Infrastructure & System Facts (Section 6 Findings)

| Area | Fact / Finding | Evidence |
|---|---|---|
| **API Host (F14 / D5)** | **Railway** (Docker container, Node 20, Fastify) | `monologg/railway.json` and `apps/api/Dockerfile` |
| **API Compute Model** | **Long-running Node process** on port 3001 | `src/server.ts` starting Fastify instance |
| **Web -> API Connectivity** | Relative `/api/v1/*` proxy (dev) or CORS-gated direct URL (prod) using **Bearer tokens** in `Authorization` header | `apps/web/src/lib/api-client.ts`, `apps/api/src/middlewares/auth.ts` |
| **Existing Job Runner** | **No cron scheduler exists today**. BullMQ on Redis is configured as an async queue strictly for notifications (`JOB_QUEUE_PROVIDER=mock` default) | `src/jobs/notificationQueue.real.ts`, `services/availability.ts` |
| **Configuration & Validation** | Zod schema validating all environment variables synchronously at startup | `src/config/env.ts` |
| **Monitoring** | `@sentry/node` initialized when `SENTRY_DSN` is present; currently lacks PII scrubbing | `src/lib/sentry.ts` |
| **CI/CD** | GitHub Actions workflow running typecheck, lint, vitest tests, pnpm audit, and Docker build | `.github/workflows/monologg-ci.yml` |
| **Existing Auth Middleware** | Custom app JWTs with `requireAuth`, `requireRole("TALENT"|"CLIENT")`, and `requireOwner` | `src/middlewares/auth.ts` |
| **Supabase Auth Bridge** | `/api/v1/auth/session/sync` verifies Supabase JWTs and exchanges them for standard app JWTs | `src/routes/authSupabase.ts` |
| **Direct supabase-js Usage** | `apps/web` uses `supabase-js` for auth plus direct table writes: `NewsletterSubscriber.upsert`, `InvestorApplication.insert`, `AnalyticsEvent.insert` | `WebsiteFooter.tsx`, `ResourcesPage.tsx`, `analytics.ts` |
| **Cloudflare R2 Storage** | No R2 configuration exists yet. `StorageProvider` is implemented only as `storage.mock.ts` (local disk); `storage.real.ts` currently throws | `src/providers/storage.real.ts` |
| **Supabase Storage** | Zero buckets and zero objects exist in `storage.buckets` | Live query against `storage.buckets` |

---

## 3. Core Decisions Answered for Maz

### D5 · API Host Confirmation
**Answer:** `apps/api` is containerized with Docker and configured for **Railway** (`monologg/railway.json`). It runs as a long-running Fastify server. `apps/admin` (Next.js on Vercel) can reach it via `API_BASE_URL` with CORS configured on the API.

### D6 · SPLIT Dispute Resolution Support
**Answer:** `PaymentProvider` does **NOT** support partial releases or partial refunds today. We will build `RELEASE_TO_TALENT` and `REFUND_CLIENT` in Phase A9, and treat `SPLIT` as a flagged manual action.

### D10 · Clerk Reversal Sign-off
**Answer:** **Confirmed**. Supabase Auth is deeply wired into the user onboarding, `AuthEvent` logging, and database schema (`User.supabaseUserId`). We will retain Supabase Auth as the default identity provider for Admin behind the `AuthVerifier` interface, keeping Clerk switchable and off.

### D11 · Supabase Pro Upgrade
**Answer:** **Confirmed recommendation**. Supabase Pro must be enabled before alpha to prevent the database from pausing and to provide automated daily backups.

---

## 4. Test Suite Baseline

- **Command:** `pnpm run test` (executed from `monologg/`)
- **Result:** **100% PASSING**
- **Summary:** 57 test files passed, 583 total tests passed in 7.98s.
- **Baseline Status:** Clean, fully green.

---

## 5. Next Steps
1. Review and approve the SQL remediation in `admin/ANON_AUDIT.md`.
2. Proceed to **Prompt A1: Admin auth, session control and bootstrap**.