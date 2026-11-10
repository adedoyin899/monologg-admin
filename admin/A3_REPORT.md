# Phase A3 Implementation Report: Instrument the Main App

**Date:** November 10, 2026  
**Status:** Completed  
**Monorepo:** `/Users/oyeniyiadedoyin/Downloads/figj monol/monologg`  
**PRD References:** Monologg Admin PRD Section 7 (Analytics, Event Allowlist & EventSink Seam), Section 11 (Main App Instrumentation), Monologg Complete PRD Phase 10 & 16.

---

## 1. Executive Summary

Phase A3 instruments `apps/web` and `apps/api` with full allowlist telemetry, user consent management, acquisition tracking, active timestamp throttling, and suspended-user access control. Every change was implemented additively without modifying booking state machine transitions, breaking contracts, or altering the visual design system of existing screens.

The full test suite was executed before and after instrumentation:
- **Baseline Test Suite:** 98 test files, 900 tests passing (100% green).
- **Post-A3 Test Suite:** 100 test files, 921 tests passing (100% green).
  - `apps/web`: 37 test files, 207 tests (100% green)
  - `apps/api`: 61 test files, 707 tests (100% green)
  - `apps/admin`: 2 test files, 7 tests (100% green)

---

## 2. Web Consent Banner & Tracker (`apps/web`)

### 2.1 Consent Banner (`ConsentBanner.tsx`)
- **Location:** `apps/web/src/app/components/ConsentBanner.tsx`
- **Mount Point:** Mounted in `apps/web/src/app/Root.tsx` and linked persistently via footer action "Analytics Preferences" in `apps/web/src/app/components/WebsiteFooter.tsx`.
- **Options:** "Accept analytics" and "Decline".
- **Storage:** Persisted in `localStorage` under `monologg_analytics_consent` (`"granted"` | `"denied"`).
- **Negative Privacy Guarantee:** Until explicit consent is granted, NO anonymous `page_view` or anonymous event is dispatched. When declined, all anonymous events and URL telemetry (UTMs, referrer) are suppressed.

### 2.2 Client-Side Tracker (`lib/tracker.ts`)
- **Location:** `apps/web/src/lib/tracker.ts`
- **Features:**
  - Strict client-side allowlist filtering matching PRD Section 7.2.
  - Automatic `anonymousId` and `sessionId` generation and session lifecycle tracking.
  - Coarse device classification (`desktop`, `mobile`, `tablet`).
  - Batching queue: flushes automatically every 5 seconds or upon accumulating 20 events.
  - Flush on unload: uses `navigator.sendBeacon` with fallback to `fetch(..., { keepalive: true })` on `pagehide` and `visibilitychange`.
  - Route change auto-tracking: `page_view` fired on React Router route changes.

---

## 3. Web Event Instrumentations Instrumented

All client-side events use exact names from PRD Section 7.2 with allowlisted property enforcement:

| Event Name | Surface / Component | Allowlisted Props Captured |
| :--- | :--- | :--- |
| `page_view` | `Root.tsx` | `path`, `referrerDomain`, `utm_source`, `utm_medium`, `utm_campaign`, `deviceClass` |
| `onboarding_step_viewed` | `CreatorOnboarding.tsx`, `ClientOnboarding.tsx` | `stepKey`, `userType` |
| `onboarding_step_completed` | `CreatorOnboarding.tsx`, `ClientOnboarding.tsx` | `stepKey`, `userType` |
| `onboarding_step_skipped` | `CreatorOnboarding.tsx` (Calendar step) | `stepKey`, `userType` |
| `storefront_viewed` | `PublicStorefront.tsx` | `creatorId`, `viaShareLink` |
| `public_profile_viewed` | `PublicStorefront.tsx` | `creatorId`, `viaShareLink` |
| `share_link_copied` | `PublicStorefront.tsx` | `surface: "storefront"` |
| `media_kit_link_copied` | `MediaKitManagement.tsx` | `surface: "media_kit"` |
| `talent_search_performed` | `ClientDashboard.tsx` | `niche`, `filterKeys` (array of filter keys only, no raw values), `resultCount` |
| `calendar_day_opened` | `TalentDashboard.tsx` | `slotCount` |
| `help_opened` | `HelpSupport.tsx` | `category` |
| `project_viewed` | `ProjectBrief.tsx` | `briefId`, `cap` |

---

## 4. Server-Side Events & Application Layer (`apps/api`)

### 4.1 Server Events Emitted via `track()`
All server events dispatch through the non-blocking `EventSink` seam:

| Domain | Event Names Instrumented | Files Instrumented |
| :--- | :--- | :--- |
| **Auth** | `auth_signup_started`, `auth_signup_completed`, `auth_signin_succeeded`, `auth_signin_failed` | `routes/auth.ts`, `routes/authSupabase.ts` |
| **Talent Setup** | `rate_card_created`, `media_uploaded`, `media_kit_mode_changed`, `media_kit_downloaded` | `routes/rateCards.ts`, `routes/mediaKit.ts` |
| **Verification** | `verification_recording_started`, `verification_recording_submitted`, `verification_recording_rejected_too_long` | `routes/verification.ts` |
| **Attributes** | `attributes_saved`, `attributes_deleted` (*Counts only: fieldCount, publicCount, searchableCount, privateCount*) | `routes/attributes.ts` |
| **Calendar** | `availability_set`, `calendar_connected` | `routes/availability.ts`, `routes/calendar.ts` |
| **Projects** | `project_posted`, `application_submitted`, `applicant_shortlisted`, `applicant_selected`, `applicant_rejected`, `cap_reached` | `routes/briefs.ts`, `services/applications.ts` |
| **Bookings & Escrow** | `booking_started`, `slot_selected`, `checkout_started`, `payment_initiated`, `escrow_locked`, `deliverables_provided`, `release_approved`, `booking_cancelled` | `routes/bookings.ts`, `services/booking.ts`, `services/payment.ts` |
| **Booking State Transitions** | `booking_state_changed` (*Emitted directly from `transitionBooking` and webhook handlers*) | `services/booking.ts`, `services/payment.ts` |
| **Messaging** | `message_sent` (*Strictly orderRoomId, kind — zero message content*) | `routes/orderRooms.ts` |
| **Withdrawals** | `withdrawal_requested`, `withdrawal_otp_verified`, `withdrawal_completed`, `withdrawal_failed` | `routes/withdrawals.ts` |
| **System & Health** | `api_error` (*route, status, provider*), `webhook_received`, `webhook_failed` | `app.ts` (`setErrorHandler`), `routes/webhooks.ts` |

### 4.2 Booking State Changed Emission
The core booking transition function `transitionBooking` in `apps/api/src/services/booking.ts` now emits `booking_state_changed` on every valid state transition:
- Props captured: `bookingId`, `from`, `to`, `currency`, `amountMinor`, `origin`.
- State machine rules and transition validation logic remain completely untouched.

### 4.3 Throttled `lastActiveAt` Tracking
- **Location:** `apps/api/src/middlewares/lastActive.ts`
- **Hook:** Wired into Fastify `onResponse` hook in `app.ts` for all authenticated requests (`request.user.id`).
- **Throttle:** In-memory TTL cache (`Map<string, number>`) ensures `User.lastActiveAt` database write is executed at most once every 5 minutes (300,000 ms) per user.
- **Resilience:** Database updates are non-blocking, fire-and-forget, and never delay HTTP response delivery.

### 4.4 User Acquisition Record Capture
- **Location:** `apps/api/src/routes/auth.ts`, `apps/api/src/routes/authSupabase.ts`
- **Behavior:** Upon first registration or first Supabase session synchronization, an entry is written to `UserAcquisition`:
  - If user consented: extracts `landingPath`, `referrerDomain`, `utmSource`, `utmMedium`, `utmCampaign`, `referralCodeUsed`, `signupCountry`, `signupDeviceClass`, `analyticsConsent: true`.
  - If user declined consent: sets `referrerDomain: "unknown"`, omits UTM parameters, sets `analyticsConsent: false`.

### 4.5 Test User Flag & Management CLI
- **Schema Column:** `User.isTestUser` (boolean, default false).
- **CLI Script:** `apps/api/scripts/set-test-user.ts`, registered in `package.json` as:
  ```bash
  pnpm set-test-user <email|userId> <true|false>
  ```
- **KPI Exclusion:** All KPI query builders and views in `apps/api/src/services/kpi.ts` filter out records where `isTestUser = true`.

### 4.6 Suspended User Access Gate
- **Enforcement:** Added immediate suspension checks (`user.suspendedAt !== null`) across:
  - `POST /api/v1/auth/login` (returns 403 Forbidden with `Account is suspended`)
  - `POST /api/v1/auth/refresh` (returns 403 Forbidden with `Account is suspended`)
  - `POST /api/v1/auth/session/sync` (returns 403 Forbidden with `Account is suspended`)

---

## 5. Terms of Service Draft (`/admin/TERMS_DRAFT.md`)

- **File Created:** `admin/TERMS_DRAFT.md` (marked **DRAFT FOR COUNSEL REVIEW**).
- **Disclosures Included:**
  1. Platform Fee Structure (11% talent fee deducted from gross, 15% client service fee added at checkout).
  2. Dispute Timeline & Non-Appealable Resolution (48h mutual negotiation window, admin binding resolution).
  3. Verification Recording Usage (strictly identity and authenticity verification; never public, never shared).
  4. Auto-Release Policy (automatic milestone escrow release 72 hours following deliverable submission if unprompted).
  5. Telemetry & Analytics (strict allowlist, anonymous telemetry gated by consent banner).
- **Integrity Note:** Existing terms verification version constant `CURRENT_TERMS_VERSION = "2026-07-29"` remains intact and unbumped so existing tests stay green. Draft disclosures are exposed via `DRAFT_TERMS_VERSION` and `DRAFT_TERMS_DISCLOSURES` in `packages/types/src/legal.ts`.

---

## 6. Privacy Negative & Security Hardening Tests

Comprehensive tests were implemented in:
- `apps/web/src/lib/tracker.test.ts` (7 tests)
- `apps/api/src/admin/privacy-negative.test.ts` (14 tests)

### Test Verification Summary

| Test Requirement | Result | Verified Property |
| :--- | :--- | :--- |
| **No Message Contents** | PASSED | `message_sent` strips `content`, `text`, `body`, `message` and records them in `droppedProps`. |
| **No Passwords or Secrets** | PASSED | `auth_signin_succeeded` strips `password`, `passwordHash`, `accessToken`, `refreshToken`, `secret`. |
| **Counts-Only for Attributes** | PASSED | `attributes_saved` drops raw values (`instagramHandle`, `shoeSize`, `homeAddress`, `phone`), preserving only counts. |
| **No KYC Docs / Raw IPs** | PASSED | `verification_recording_submitted` strips document numbers, national IDs, selfie URLs, and IP addresses. |
| **Anonymous Consent Gate** | PASSED | Anonymous events (`page_view`, `talent_search_performed`) without explicit consent return `droppedReason: "missing_consent"`. |
| **Sink Failure Resilience** | PASSED | Failing/throwing sinks in `EventSink` are caught, increment `sinkFailureCount`, and never throw into caller. |
| **Booking State Validation** | PASSED | `booking_state_changed` props validated (`bookingId`, `from`, `to`, `currency`, `amountMinor`, `origin`). |
| **Suspended User Block** | PASSED | Suspended users receive 403 Forbidden on login and token refresh. |
| **5-Minute Active Throttle** | PASSED | Rapid calls for same user update DB at most once per 5-minute interval. |
| **Test User CLI Script** | PASSED | `setTestUser` toggles `isTestUser` in database. |

---

## 7. Monorepo Verification Matrix

Full test execution command:
```bash
pnpm test
```

Results across monorepo packages:
- **`apps/web`**: 37 test files passed, 207 tests passed (0 failures).
- **`apps/api`**: 61 test files passed, 707 tests passed (0 failures).
- **`apps/admin`**: 2 test files passed, 7 tests passed (0 failures).
- **Total:** 100 test files passed, 921 tests passed (0 failures).

---

## 8. Carry-Forward Statement

> **A3 done. Web and API emit allowlisted events. Consent banner works. Acquisition, last active and booking state change events are captured. Existing behaviour is unchanged.**
