# Monologg — Product Analytics, Click-Stream & Stakeholder Telemetry Reference

**Last updated:** 2026-10-30 (Session 174: Supabase-First Product Analytics, Delegated Click Tracking & PostHog Bridge)
**Status:** Active across `apps/web` (`src/lib/analytics.ts`, `src/app/Root.tsx`, `src/lib/state-sync.ts`) and `apps/api` (`prisma/schema.prisma` `AnalyticsEvent`, `src/routes/analytics.ts`).

---

## 1. Architecture Overview (Supabase-First + PostHog Ready)

Monologg's analytics infrastructure is built natively on **Supabase Postgres** as the primary data warehouse, while maintaining a plug-and-play forward adapter for **PostHog** (or any external BI sink) so stakeholders never lose historical context or require component rewrites.

### Three-Tier Telemetry Pipeline

1. **Supabase Behavioral & Click-Stream Table (`"AnalyticsEvent"`):**
   - Defined in `apps/api/prisma/schema.prisma` (`model AnalyticsEvent`) and migrated in `20261030101500_add_analytics_events/migration.sql`.
   - Stores every route view (`page_viewed`), screen dwell duration (`page_leave`), delegated UI/CTA click (`ui_click`, `cta_clicked`), and business funnel milestone across **Performer (`TALENT`)**, **Client (`CLIENT`)**, and **Guest (`GUEST`)** sessions.
   - Row-Level Security (RLS) is enabled with an append-only `INSERT` policy for `anon` and `authenticated` roles so the browser Supabase client (`supabase.from("AnalyticsEvent").insert(...)`) can write directly, while `SELECT` queries remain restricted to `service_role` and Supabase Studio dashboards.
2. **Backend Ingestion & Stakeholder Summary API (`/api/v1/analytics/*`):**
   - `POST /api/v1/analytics/events` — Accepts single or batched events (1–100 per request), recursively scrubs sensitive keys (`password`, `token`, `otp`, `pin`, `cvv`, `cardNumber`, `idNumber`, `accountNumber`, `bvn`, `nin`), and writes to `prisma.analyticsEvent.createMany`.
   - `GET /api/v1/analytics/summary` — Returns an instant JSON snapshot of total events, category distribution, role split (`TALENT` vs. `CLIENT` vs. `GUEST`), top 15 interactions, and end-to-end conversion funnel counts.
3. **Server-Authoritative Audit Tables (`"UserActivity"`, `"AuthEvent"`, `"PaymentEvent"`):**
   - Complement behavioral analytics with transactional audit logs (`services/activity.ts`) for `ACCOUNT_REGISTERED`, `ESCROW_FUNDED`, `DELIVERABLES_SUBMITTED`, `PAYMENT_RELEASED`, `WITHDRAWAL_REQUESTED`, and Paystack webhook idempotency.
4. **Zero-Config PostHog Bridge:**
   - `src/lib/analytics.ts` automatically checks for `window.posthog`. If a PostHog snippet or SDK is initialized in the future, every `trackEvent()` and `identifyAnalyticsUser()` call automatically forwards to `posthog.capture()` and `posthog.identify()` with zero component changes.

---

## 2. Automatic vs. Explicit Tracking

| Mechanism | Where It Lives | What It Captures |
|---|---|---|
| **Global Session & Route Tracker** | `apps/web/src/app/Root.tsx` | Fires `session_started` (with viewport classification `mobile` / `tablet` / `desktop`), `page_viewed` on every route change, and `page_leave` with `durationMs` spent on the previous screen. |
| **Global Delegated Click Capture** | `apps/web/src/app/Root.tsx` (`onClickCapture`) | Automatically intercepts clicks on any `<button>`, `<a>`, `[role="button"]`, `[role="tab"]`, or `[data-analytics]` element across the entire app, recording `ui_click` (or `cta_clicked`), visible label, `aria-label`, `data-analytics` ID, tag name, and route path. |
| **State-Sync Funnel Instrumentation** | `apps/web/src/lib/state-sync.ts` | Automatically fires canonical funnel events whenever core business state mutates (saving drafts, publishing briefs, applying to projects, shortlisting applicants, funding wallets, locking escrow, confirming/declining attendance check-ins, withdrawing payouts, and requesting bank changes). |
| **Workspace & Order Room Instrumentation** | `apps/web/src/app/pages/OrderRoom.tsx` | Explicitly tracks `order_room_viewed`, `order_message_sent`, `order_deliverable_submitted`, `order_onsite_pin_verified`, `order_revision_requested`, `order_payment_released`, and `order_review_submitted`. |

---

## 3. Canonical Event Taxonomy & Stakeholder KPI Mapping

### 3.1 Navigation & Session (`navigation`)
| Event Name | Trigger | Key Properties | Stakeholder KPI |
|---|---|---|---|
| `session_started` | App initialization once per browser session | `entryPath`, `viewport` (`mobile` \| `tablet` \| `desktop`) | Daily / Monthly Active Sessions & Mobile vs. Desktop Split |
| `page_viewed` | Every route change | `path`, `search`, `title` | Screen Reach & Route-Level Funnel Drop-Off |
| `page_leave` | Navigating away from a route | `fromPath`, `toPath`, `durationMs` | Average Time-on-Screen & Engagement Depth |
| `dashboard_tab_switched` | Switching tabs on Performer or Client portal | `portal`, `tab` | Feature Discovery & Tab Stickiness |

### 3.2 UI & Click Stream (`ui_interaction`)
| Event Name | Trigger | Key Properties | Stakeholder KPI |
|---|---|---|---|
| `ui_click` | Any click on `<button>`, `<a>`, `[role="button"]`, `[role="tab"]` | `label`, `elementTag`, `href`, `path` | Click Heatmap, Feature Usage & Dead-Click Detection |
| `cta_clicked` | Click on an element with `data-analytics` or `trackClick()` | `label`, `analyticsId`, `path` | Primary Call-to-Action Click-Through Rate (CTR) |

### 3.3 Acquisition & Authentication (`acquisition`)
| Event Name | Trigger | Key Properties | Stakeholder KPI |
|---|---|---|---|
| `landing_cta_clicked` | Clicking primary CTA on Landing / Product / Pricing pages | `label`, `section` | Landing-to-Auth Conversion Rate |
| `waitlist_submitted` | Submitting waitlist form | `niche`, `role` | Top-of-Funnel Lead Capture Velocity |
| `auth_role_selected` | Toggling Performer vs. Client in `AuthFlow` | `role` (`TALENT` \| `CLIENT`) | Supply (Performer) vs. Demand (Client) Signup Intent |
| `auth_method_selected` | Choosing Email, Google OAuth, Magic Link, or OTP | `provider` | Auth Provider Preference & OAuth Conversion Lift |
| `auth_session_established` | User session persisted (`setLoggedInUser`) | `userId`, `userType`, `authProvider`, `isNewUser` | Verified Active Users (DAU/MAU) by Role |
| `auth_signout_clicked` | User signs out | — | Session Lifecycle |

### 3.4 Onboarding (`onboarding`)
| Event Name | Trigger | Key Properties | Stakeholder KPI |
|---|---|---|---|
| `creator_onboarding_step_completed` | Performer completes an onboarding step | `step`, `niche` | Performer Onboarding Step Drop-Off |
| `creator_onboarding_completed` | Performer finishes onboarding | `niche`, `verified` | Performer Activation Rate |
| `client_onboarding_completed` | Client finishes organization onboarding | `orgType` | Client Activation Rate |

### 3.5 Discovery & Public Storefront (`discovery`)
| Event Name | Trigger | Key Properties | Stakeholder KPI |
|---|---|---|---|
| `public_storefront_viewed` | Viewing `/:handle` public profile | `handle` | Bio-Link Traffic & Storefront-to-Booking Conversion |
| `public_storefront_share_clicked` | Copying/sharing storefront URL | `handle` | Viral K-Factor & Bio-Link Share Frequency |
| `talent_directory_searched` | Searching talent in Client Dashboard | `queryLength` | Casting Search Demand |
| `talent_directory_filtered` | Applying category, budget, gender, age, or location filters | `category`, `location` | Most Requested Performer Segments |
| `talent_profile_modal_opened` | Opening a Performer dossier from Client Dashboard | `creatorId` | Impression-to-Dossier View Rate |

### 3.6 Briefs & Casting (`booking`)
| Event Name | Trigger | Key Properties | Stakeholder KPI |
|---|---|---|---|
| `project_brief_step_viewed` | Viewing/advancing a step in the 5-step Brief Wizard | `step`, `isEditingDraft` | Brief Wizard Step Completion Rate |
| `project_brief_draft_saved` | Saving a project brief draft (`saveClientDraft`) | `projectId`, `draftStep`, `isUpdate` | Draft Save & Continuation Velocity |
| `project_brief_published` | Publishing a project brief (`addProject`) | `projectId`, `projectType`, `budgetAmount` | Gross Brief Volume & Demand Liquidity |
| `project_application_submitted` | Performer applies to a brief (`applyToProject`) | `projectId`, `hasPitch` | Applications per Brief & Performer Liquidity |
| `applicant_status_updated` | Client shortlists, selects, or rejects an applicant | `projectId`, `applicationId`, `status` | Time-to-Shortlist & Selection Conversion Rate |

### 3.7 Checkout & Escrow (`escrow_payment`)
| Event Name | Trigger | Key Properties | Stakeholder KPI |
|---|---|---|---|
| `checkout_step_viewed` | Advancing through 3-step internal Checkout | `step` | Checkout Step Drop-Off |
| `external_booking_step_viewed` | Advancing through 4-step External Booking (`/book/:creatorId`) | `step`, `creatorId` | Guest Direct-Booking Conversion Rate |
| `escrow_agreement_accepted` | Accepting the mandatory protection clauses | `flow` | Legal Gate Pass-Through Rate |
| `escrow_payment_completed` | Escrow funded (`deductBalance` / Paystack settlement) | `amountKobo`, `bookingRef`, `description` | Gross Merchandise Value (GMV) Locked in Escrow |
| `wallet_funded` | Client tops up wallet (`fundWallet`) | `amountKobo` | Client Wallet Top-Up Volume |

### 3.8 Order Room Collaboration (`order_room`)
| Event Name | Trigger | Key Properties | Stakeholder KPI |
|---|---|---|---|
| `order_room_viewed` | Opening `/order/:id` | `orderId`, `role`, `mode` | Active Order Workspace Engagement |
| `order_attendance_confirmed` | Performer confirms check-in gate (`I'm confirmed`) | `checkinId`, `bookingId`, `stepLabel` | Attendance Gate On-Time Compliance Rate |
| `order_attendance_declined` | Performer declines check-in (`Can't make it`) | `bookingId`, `reasonLength` | Performer Cancellation & Auto-Refund Rate |
| `order_onsite_pin_verified` | Performer verifies 4-digit Client arrival PIN | `orderId`, `venue` | Onsite Arrival Verification Compliance |
| `order_message_sent` | Sending a message in Order Room | `orderId`, `role`, `messageLength` | Collaboration Velocity & Response SLA |
| `order_deliverable_submitted` | Performer submits deliverable for review | `orderId`, `role`, `fileName`, `mode` | Booking-to-Deliverable Turnaround Time |
| `order_revision_requested` | Client requests revision | `orderId`, `role`, `notesLength` | First-Take Approval Rate vs. Revision Frequency |
| `order_payment_released` | Escrow released to Performer (`handleAutoRelease`) | `orderId`, `role`, `amountKobo` | Realized GMV & Payout Release Velocity |
| `order_review_submitted` | Performer or Client submits star rating | `orderId`, `role`, `stars`, `tag` | Two-Sided Review Participation & Average CSAT |

### 3.9 Payouts, Withdrawals & Engagement (`payout` / `engagement`)
| Event Name | Trigger | Key Properties | Stakeholder KPI |
|---|---|---|---|
| `withdrawal_completed` | Performer or Client withdraws funds | `amountKobo`, `portal`, `bankName` | Payout Settlement Volume & Frequency |
| `payout_bank_change_requested` | Performer requests KYC-matched bank update | `bankName` | Bank Change Request Rate |
| `theme_toggled` | Switching light/dark mode | `theme` | Dark Mode vs. Light Mode Adoption |

---

## 4. Ready-to-Run Supabase Studio SQL Queries for Stakeholders

### 4.1 End-to-End Marketplace Conversion Funnel (Last 30 Days)
```sql
SELECT
  COUNT(*) FILTER (WHERE "eventName" = 'page_viewed') AS page_views,
  COUNT(*) FILTER (WHERE "eventName" IN ('ui_click', 'cta_clicked')) AS total_clicks,
  COUNT(*) FILTER (WHERE "eventName" = 'auth_session_established') AS authenticated_sessions,
  COUNT(*) FILTER (WHERE "eventName" = 'project_brief_published') AS briefs_published,
  COUNT(*) FILTER (WHERE "eventName" = 'escrow_payment_completed') AS escrow_locked_orders,
  COUNT(*) FILTER (WHERE "eventName" = 'order_deliverable_submitted') AS deliverables_submitted,
  COUNT(*) FILTER (WHERE "eventName" = 'order_payment_released') AS orders_completed_and_paid,
  COUNT(*) FILTER (WHERE "eventName" = 'withdrawal_completed') AS payouts_withdrawn
FROM "AnalyticsEvent"
WHERE "createdAt" >= NOW() - INTERVAL '30 days';
```

### 4.2 Top Clicked Buttons & CTAs by Role (`TALENT` vs. `CLIENT` vs. `GUEST`)
```sql
SELECT
  COALESCE("userRole", 'GUEST') AS role,
  "path",
  "properties"->>'label' AS clicked_label,
  COUNT(*) AS click_count
FROM "AnalyticsEvent"
WHERE "eventName" IN ('ui_click', 'cta_clicked')
  AND "createdAt" >= NOW() - INTERVAL '30 days'
GROUP BY 1, 2, 3
ORDER BY click_count DESC
LIMIT 25;
```

### 4.3 Attendance Gate Compliance vs. Auto-Refund Cancellations
```sql
SELECT
  COUNT(*) FILTER (WHERE "eventName" = 'order_attendance_confirmed') AS confirmed_checkins,
  COUNT(*) FILTER (WHERE "eventName" = 'order_attendance_declined') AS declined_checkins_auto_refunded,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE "eventName" = 'order_attendance_confirmed') /
    NULLIF(COUNT(*) FILTER (WHERE "eventName" IN ('order_attendance_confirmed', 'order_attendance_declined')), 0),
    2
  ) AS attendance_compliance_pct
FROM "AnalyticsEvent"
WHERE "createdAt" >= NOW() - INTERVAL '30 days';
```

### 4.4 Average Screen Dwell Time by Route
```sql
SELECT
  "properties"->>'fromPath' AS screen_path,
  COUNT(*) AS transitions,
  ROUND(AVG(("properties"->>'durationMs')::numeric) / 1000.0, 1) AS avg_seconds_on_screen
FROM "AnalyticsEvent"
WHERE "eventName" = 'page_leave'
  AND ("properties"->>'durationMs') IS NOT NULL
GROUP BY 1
ORDER BY avg_seconds_on_screen DESC;
```

---

## 5. Privacy, NDPA & Money Rule Guardrails

1. **Automatic PII & Secret Scrubbing:** Both `sanitizeAnalyticsPayload` (`apps/web/src/lib/analytics.ts`) and `sanitizeAnalyticsProperties` (`apps/api/src/routes/analytics.ts`) recursively strip `password`, `passwordHash`, `token`, `accessToken`, `refreshToken`, `secret`, `otp`, `code`, `pin`, `cvv`, `cardNumber`, `idNumber`, `accountNumber`, `bvn`, and `nin` before any event enters `localStorage`, Supabase, or the API.
2. **Integer Minor Units Only:** In compliance with Monologg's schema-wide Money Rule (`prisma/schema.test.ts`), `AnalyticsEvent` introduces zero `Float` or `Decimal` columns, and all monetary event properties use integer minor units (`amountKobo`, `budgetAmount`).
