# Phase A2: Data Layer Report
**PRD Modules / Sections:** Sections 4, 5, 6, 7  
**Date:** November 10, 2026  
**Status:** Completed & Fully Verified (100% Green, Live Database Verified)

---

## 1. Executive Summary

Phase A2 establishes the database foundation, read-only analytical architecture, event sink seam, KPI calculation engine, and deterministic synthetic data generator for the Monologg Admin platform. All database additions are strictly additive with zero drops, zero renames, and zero data loss. 

Key milestones completed:
1. **Additive Migrations Applied to Live Supabase Postgres:** Created `UserNote`, `UserTag`, `UserAcquisition`, `ProductEvent`, `KpiDaily`, `AlertEvent`, `AdminJob`, `JobRun`, and additive columns on `User` (`lastActiveAt`, `isTestUser`, `suspendedAt`, `suspendedReason`) and `WithdrawalRequest` (`flagged`, `flagReason`, `flaggedAt`, `flaggedByAdminId`, `clearedAt`, `clearedByAdminId`).
2. **13 Additive Indexes:** Applied to existing tables for query acceleration across users, bookings, payments, events, and notifications.
3. **Read-Only Database Role (`monologg_admin_ro`):** Live PostgreSQL role created with `statement_timeout = '5s'`, SELECT privileges on required tables, and strictly prohibited from writing or accessing secret tables (`RefreshToken`, `WithdrawalOtp.codeHash`, `AdminJob`, `AdminAuditLog`).
4. **Admin SQL Views & Materialized Views (`admin` schema):** Created `v_user_summary`, `v_booking_summary`, `v_money_by_currency`, `v_signup_funnel`, `v_support_summary`, and `mv_money_by_currency` with refresh log table `admin.materialized_view_refresh`.
5. **EventSink Seam & Ingestion:** Fire-and-forget event pipeline with `FirstPartySink` and `PostHogSink` (mock by default), strict allowlist matching PRD Section 7.2 catalogue, negative privacy enforcement, edge country derivation (ISO-2), coarse user-agent parsing (no raw IP storage), and `POST /api/v1/events` ingestion route.
6. **KPI Service:** Pure query builders implementing all definitions from PRD Section 4 with monetary metrics strictly isolated per currency.
7. **Synthetic Dataset Generator:** Deterministic, seed-based generator populating 120 users (`isTestUser = true`), bookings across states and currencies, payments with webhooks, tickets, disputes, withdrawals, and 30 days of realistic `ProductEvent` rows. Refuses to run in production.

---

## 2. Additive Database Migrations & Schema Map

### 2.1 Applied Migration
- **File:** `apps/api/prisma/migrations/20261110190000_phase_a2_data_layer/migration.sql`
- **Deployment Status:** Successfully deployed to live Supabase Postgres via `prisma migrate deploy`.

### 2.2 Table Additions
| Model | Description | Primary Key / Indexes |
|---|---|---|
| `UserNote` | Internal staff notes on a user | `id` (CUID), `(userId, createdAt)` |
| `UserTag` | Administrative tagging for user cohorts | `id` (CUID), `(userId, tag)` UNIQUE |
| `UserAcquisition` | First-touch attribution & UTM tracking | `id` (CUID), `userId` UNIQUE |
| `ProductEvent` | 1st-party event tracking log (13-month retention) | `id` (BIGINT), `(name, occurredAt)`, `(userId, occurredAt)`, `(occurredAt)`, `(anonymousId, occurredAt)` |
| `KpiDaily` | Daily KPI snapshot rollups | `(day, metric, dimension)` composite PK |
| `AlertEvent` | System & business alert notifications | `id` (CUID), `(status, createdAt)`, `(severity, createdAt)` |
| `AdminJob` | Scheduled administrative job definitions | `id` (CUID), `name` UNIQUE |
| `JobRun` | Audit log of job executions | `id` (CUID), `(jobId, startedAt)` |

### 2.3 Extended Columns on Existing Models
- **`User`**:
  - `lastActiveAt`: `TIMESTAMP(3)` NULL
  - `isTestUser`: `BOOLEAN NOT NULL DEFAULT false`
  - `suspendedAt`: `TIMESTAMP(3)` NULL
  - `suspendedReason`: `TEXT` NULL
- **`WithdrawalRequest`**:
  - `flagged`: `BOOLEAN NOT NULL DEFAULT false`
  - `flagReason`: `TEXT` NULL
  - `flaggedAt`: `TIMESTAMP(3)` NULL
  - `flaggedByAdminId`: `TEXT` NULL
  - `clearedAt`: `TIMESTAMP(3)` NULL
  - `clearedByAdminId`: `TEXT` NULL

### 2.4 Additive Indexes Applied
1. `User_createdAt_idx` ON `"User"("createdAt")`
2. `User_lastActiveAt_idx` ON `"User"("lastActiveAt")`
3. `Booking_state_createdAt_idx` ON `"Booking"("state", "createdAt")`
4. `Booking_creatorId_createdAt_idx` ON `"Booking"("creatorId", "createdAt")`
5. `Booking_clientId_createdAt_idx` ON `"Booking"("clientId", "createdAt")`
6. `Payment_status_createdAt_idx` ON `"Payment"("status", "createdAt")`
7. `PaymentEvent_paymentId_createdAt_idx` ON `"PaymentEvent"("paymentId", "createdAt")`
8. `Message_orderRoomId_createdAt_idx` ON `"Message"("orderRoomId", "createdAt")`
9. `AuthEvent_createdAt_idx` ON `"AuthEvent"("createdAt")`
10. `Application_briefId_createdAt_idx` ON `"Application"("briefId", "createdAt")`
11. `Brief_createdAt_idx` ON `"Brief"("createdAt")`
12. `VerificationRecording_status_createdAt_idx` ON `"VerificationRecording"("status", "createdAt")`
13. `Notification_userId_createdAt_idx` ON `"Notification"("userId", "createdAt")`

---

## 3. Read-Only Database Role (`monologg_admin_ro`)

### 3.1 Role Configuration
- **Role Name:** `monologg_admin_ro`
- **Statement Timeout:** `5s` (`ALTER ROLE monologg_admin_ro SET statement_timeout = '5s'`)
- **Connection URL:** `ADMIN_DATABASE_URL` configured in `apps/api/.env` and validated in `apps/api/src/config/env.ts`.
- **Query Client:** Dedicated `adminRoPrisma` instance in `apps/api/src/db/adminRoClient.ts`.

### 3.2 Security Permissions Verification
Verified via live integration test (`apps/api/src/admin/admin-ro-role.integration.test.ts`):
- `current_user = 'monologg_admin_ro'` and `current_setting('statement_timeout') = '5s'`: **PASSED**
- `SELECT` on application tables and admin views: **PASSED**
- `INSERT` blocked with code `42501` (`permission denied for table UserNote`): **PASSED**
- `UPDATE` blocked with code `42501` (`permission denied for table User`): **PASSED**
- `DELETE` blocked with code `42501` (`permission denied for table User`): **PASSED**
- `SELECT` on token table `RefreshToken` blocked with code `42501` (`permission denied for table RefreshToken`): **PASSED**

---

## 4. Admin Schema Views & Aggregations

Views created in dedicated schema `admin`:
1. `admin.v_user_summary`: Aggregates total users, talent, clients, verified emails, test users, suspensions, and 24h/7d/30d signups.
2. `admin.v_booking_summary`: Grouped by `state` and `currency` with booking counts, base amount, and fee totals.
3. `admin.v_money_by_currency`: One row per currency (`NGN`, `USD`, `GBP`). **Zero cross-currency summation**.
4. `admin.v_signup_funnel`: Signups total, verified emails, creator profiles, onboarded talent, identity verified, and client profiles.
5. `admin.v_support_summary`: Ticket volume grouped by status (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`).
6. `admin.mv_money_by_currency`: Materialized view with unique index on `currency` for instant dashboard reads.
7. `admin.materialized_view_refresh`: Refresh tracking table logging `last_refreshed_at` for UI freshness badges.

> [!NOTE]
> `pg_cron` extension query returned empty (`SELECT extname FROM pg_extension WHERE extname = 'pg_cron'` -> `[]`). As required by PRD Section 5, materialized view refresh falls back to the `/api/v1/cron/admin-tick` scheduler endpoint.

---

## 5. Event Tracking & Ingestion (`apps/api/src/lib/analytics`)

### 5.1 Architecture
```
Web App / Server Action
       |
       v
track(name, props, ctx)  -->  sanitizeTrackEvent()
                                    |-- Allowlist check (PRD 7.2)
                                    |-- Consent flag check for anonymous visitors
                                    |-- Prohibited key filter (negative privacy)
                                    |-- Drop metrics counters
                                    v
                            EventSink Seam
                            |-- FirstPartySink (ProductEvent table)
                            |-- PostHogSink (mock by default, off in config)
```

### 5.2 Catalogue Compliance (PRD Section 7.2)
All event groups implemented with allowed prop keys:
- **Visit**: `page_view` (`path`, `referrerDomain`, `utm_*`)
- **Auth**: `auth_signup_started`, `auth_signup_completed`, `auth_signin_succeeded`, `auth_signin_failed`
- **Onboarding**: `onboarding_step_viewed`, `onboarding_step_completed`, `onboarding_step_skipped`
- **Storefront**: `storefront_viewed`, `public_profile_viewed`
- **Talent setup**: `rate_card_created`, `media_uploaded`, `media_kit_mode_changed`, `media_kit_downloaded`
- **Verification**: `verification_recording_started`, `verification_recording_submitted`, `verification_recording_rejected_too_long`
- **Attributes**: `attributes_step_skipped`, `attributes_saved`, `attributes_deleted`
- **Calendar**: `availability_set`, `calendar_connected`, `calendar_day_opened`
- **Search**: `talent_search_performed` (`niche`, `filterKeys` - keys only, `resultCount`)
- **Projects**: `project_posted`, `project_viewed`, `application_submitted`, `applicant_shortlisted`, `applicant_selected`, `applicant_rejected`, `cap_reached`
- **Booking**: `booking_started`, `slot_selected`, `checkout_started`, `payment_initiated`, `escrow_locked`, `deliverables_provided`, `release_approved`, `booking_cancelled`, `booking_state_changed`
- **Messaging**: `message_sent` (`orderRoomId`, `kind` - counts only, **never message content**)
- **Money**: `withdrawal_requested`, `withdrawal_otp_verified`, `withdrawal_completed`, `withdrawal_failed`
- **Support**: `help_opened`, `ticket_created`, `dispute_opened`, `feedback_submitted`
- **Share**: `share_link_copied`, `media_kit_link_copied`
- **System**: `api_error`, `job_failed`, `webhook_received`, `webhook_failed`

### 5.3 Negative Privacy Constraints Verified
- Prohibited content filter strictly removes message text/body (`content`, `body`, `messageText`), raw attribute values, passwords, secrets, KYC document URLs, and raw IP addresses.
- Edge country derivation extracts 2-letter uppercase ISO-2 code from `cf-ipcountry`, `x-country-code`, `x-vercel-ip-country`. Raw IPs are never stored.
- Device class (`mobile`, `tablet`, `desktop`), browser, and OS are coarsely extracted without fingerprinting.
- Anonymous events without `consent: true` are dropped and counted.
- Failing sink calls are swallowed and counted without throwing into callers.

### 5.4 Ingestion Route (`POST /api/v1/events`)
- Fastify route under `/api/v1/events`.
- Accepts batches up to 20 events with a 64 KB payload cap. Batches > 20 return 400 Bad Request.
- Rate limits enforced per IP and per `anonymousId`.
- Derives country from edge proxy headers.
- Drops anonymous events lacking consent.
- Dispatches to sinks asynchronously and returns 204 No Content.

---

## 6. KPI Service (`apps/api/src/admin/kpi`)

Pure query builders implementing PRD Section 4 definitions:
- **Signups**: Total users split by `userType` (`TALENT`, `CLIENT`) and `accountOrigin` (`SIGNUP`, `AUTO_CHECKOUT`), excluding test users.
- **Email Verified**: Users with `emailVerified = true`.
- **Talent Onboarded**: Creators with name and location set.
- **Talent Activated**: Onboarded creators with >=1 RateCard and >=1 MediaAsset.
- **Client Activated**: Clients who posted a Brief or started a booking.
- **Identity Verified**: KYC verified creators (`Creator.verification = VERIFIED`).
- **Verification Recording Approved**: `VerificationRecording.status = APPROVED`.
- **DAU, WAU, MAU**: Distinct active users with authenticated `ProductEvent`s in the last 1, 7, 28 days.
- **Time to First Booking**: Median and 90th percentile hours from user signup to first booking.
- **Booking Funnel**: Drop-off rates and conversion percentages across `public_profile_viewed` -> `booking_started` -> `slot_selected` -> `payment_initiated` -> `escrow_locked`.
- **Monetary Metrics Isolated Per Currency**:
  - `GMV`: Sum of `Booking.baseAmount` for bookings reaching `ESCROW_LOCKED` or beyond.
  - `Escrow Held Now`: Sum of `Payment.amount` where `escrowHeld = true` and `status = 'ESCROW_HELD'`.
  - `Released`: Sum of `baseAmount` for `PAYMENT_RELEASED` bookings.
  - `Platform Revenue`: `talentFeeAmount + clientFeeAmount` on released bookings.
  - `Talent Earned`: `baseAmount - talentFeeAmount` on released bookings.
  - `Talent Available`: Talent earned minus completed and pending withdrawals.
  - `Take Rate`: Platform revenue / GMV.
  - `Dispute Rate`: Disputed bookings / Escrow locked bookings.
  - `Payment Failure Rate`: Failed payments / Total payments initiated.

---

## 7. Synthetic Dataset Generator (`apps/api/scripts/generate-synthetic-data.ts`)

- **Safety Guard:** Throws immediately if `NODE_ENV === "production"`.
- **Determinism:** Seed-based pseudo-random generator ensuring reproducible datasets across runs.
- **Dataset Volume:**
  - 120 Users tagged with `isTestUser = true` (70 Creators, 50 Clients).
  - Creators configured across 7 real schema niches (`COMEDIAN`, `ACTOR`, `VO_ARTIST`, `COMPERE`, `SPEAKER_PASTOR`, `MUSICIAN`, `CONTENT_CREATOR`), multi-currency rate cards, portfolio media assets, and verification recordings.
  - 60 Bookings across all 6 real `BookingState`s (`PENDING_PAYMENT`, `ESCROW_LOCKED`, `DELIVERABLES_PROVIDED`, `PAYMENT_RELEASED`, `CANCELLED`, `DISPUTED`) in `NGN`, `USD`, and `GBP`.
  - 60 Payments with audit events in `PaymentEvent`.
  - Support tickets and disputes.
  - 15 Withdrawals with velocity flags and admin clearance audit fields.
  - 1,000 `ProductEvent` rows spread across 30 days with realistic device and geographical distributions.

---

## 8. Verification & Test Suite Results

| Test Suite | File | Tests | Result |
|---|---|---|---|
| Live Role Verification | `src/admin/admin-ro-role.integration.test.ts` | 6 | **PASS (100%)** |
| Data Layer & Analytics Seam | `src/admin/data-layer.test.ts` | 15 | **PASS (100%)** |
| Schema Money & Float Invariants | `prisma/schema.test.ts` | 17 | **PASS (100%)** |
| API Suite Total | `apps/api` | 60 files / 693 tests | **PASS (100%)** |
| Admin App Total | `apps/admin` | 2 files / 7 tests | **PASS (100%)** |
| Web App Total | `apps/web` | 36 files / 200 tests | **PASS (100%)** |
| **Monorepo Grand Total** | **All Packages** | **98 files / 900 tests** | **100% GREEN** |

---

## 9. Carry-Forward Statement

> **A2 done. Analytics and admin tables exist. ProductEvent and the EventSink seam work. Read-only role and views exist. KPI service implements section 4. Synthetic data generator is available.**
