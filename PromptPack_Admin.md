# Monologg Admin · Prompt Pack v0.2 (A0 to A13)

**Pairs with:** `Monologg_Admin_PRD.md` v0.2 (keep it in the repo root, the agent reads it every phase). Infrastructure decisions (auth, hosting, jobs, storage, CI) are folded into both documents.
**Builds on:** the existing Monologg monorepo, Supabase database, Prisma, `apps/api`, and the provider seams
**For:** Antigravity or Claude Code, one prompt at a time
**Relationship to other packs:** additive. It does not replace or renumber `PromptPack_Complete.md` or `PromptPack_Auth_and_OTP.md`.

---

## How to use

1. Paste the **Global context** once per new agent session.
2. Run one prompt at a time, in order. Each ends with a verify list. Do not continue until every item passes.
3. After each prompt: review the diff, run the full test suite (old tests included), commit, then paste the **Carry forward** line at the start of the next prompt.
4. Work on a branch per prompt (`admin-a3-instrumentation`). Merge when verified.
5. If the agent finds that the live database differs from the PRD, the live database wins. Ask it to log the difference in `/admin/SCHEMA_MAP.md` and carry on with the real names.

### Suggested gstack skills (if installed, names can vary by version)

| When | Skill | Use |
|---|---|---|
| After every prompt | `/review` | Catch bugs and privacy leaks before merge |
| After A5, A7, A9, A13 | `/qa` | Real-browser click-through, fix and verify |
| End of A13 | `/ship` | Tests, review, push, PR |

---

## Global context (paste once per session)

```
You are building the Monologg Admin app: an internal monitoring and operations platform for
the alpha launch (about 100 users, designed for 10,000). The source of truth is
Monologg_Admin_PRD.md in the repo root. Read it fully before every phase. For the product,
schema, payments and auth, Monologg_Complete_PRD.md is the source of truth. If a prompt
conflicts with a PRD, stop and ask me.

EXISTING SYSTEM (do not break)
- Monorepo: apps/web (user app), apps/api (Node, TypeScript, Fastify), packages/types.
- Database: Supabase Postgres via Prisma. Supabase Auth was added in P12B for user sign-in.
  Custom app JWT and authorization middleware (requireAuth, requireRole, requireOwner) remain.
- Payments through a region-routed PaymentProvider (Paystack first). Never mention FINCRA.
  Fees come from PLATFORM_FEES config (11 percent talent, 15 percent client). Never recompute
  fees in admin, read stored booking amounts.
- Verification recording (VerificationRecording) and identity KYC (KycCheck, Smile Identity)
  are SEPARATE. Admin actions on recordings never write Creator.verification.
- styleTags (AI vibe tags) and verification (KYC) stay separate.
- Escrow-first: chat opens only after ESCROW_LOCKED.
- Provider seam: every external dependency has a real and a mock implementation. The whole
  app, including admin, runs and tests with zero real keys.
- Migrations are additive only. No renames, no drops, no data loss. Existing tests must stay
  green after every phase.

NEW ADMIN STACK
- apps/admin: Next.js App Router, TypeScript strict, Tailwind, Monologg design tokens
  (MONOLOGG_DESIGN_SYSTEM.md), opendraft components where they fit (Stat, Time Series Chart,
  Gauge, Timeline, Chat Panel), shadcn-style primitives otherwise.
- Admin API: new routes under /api/v1/admin in apps/api, behind requireAdmin and a
  permission check. The admin browser NEVER talks to the database.
- Reads use a read-only Postgres role (monologg_admin_ro) with statement_timeout 5s.
  Writes go only through existing services, never raw SQL.
- Admin identity: separate AdminUser table. Authentication through an AuthVerifier interface
  (SupabaseVerifier default, ClerkVerifier off, MockVerifier for local and tests), selected by
  ADMIN_AUTH_PROVIDER. Google or magic link, allowlist only. Every admin route except /me
  requires MFA (Supabase aal2). Session limits (8 hours absolute, 30 minutes idle) are enforced
  by our own AdminSession table, not by provider settings. Roles live only in AdminUser.role.

INFRASTRUCTURE
- Frontend: apps/admin on Vercel, apps/web on Firebase Hosting (hosting only, not auth, storage
  or API). Database: Supabase Postgres only. Storage and CDN: Cloudflare R2 behind a
  StorageProvider seam (public and private buckets, signed URLs for private). Monitoring:
  Sentry with PII scrubbing. CI/CD: GitHub Actions.
- apps/api is the existing Node (Fastify) service on its current host. Admin code must be
  host-agnostic: stateless routes, no in-process timers, no dependence on Redis or BullMQ for
  admin jobs. Supabase cannot host the API, do not suggest it.
- Scheduling: one idempotent tick endpoint POST /api/v1/cron/admin-tick (CRON_SECRET, 50 second
  budget, lease locks). Vercel Cron in apps/admin calls it every minute. pg_cron is for pure SQL
  jobs only (materialised view refresh, retention purge). Do not put KPI logic in SQL jobs.
- The API allows the admin origin through CORS. Admin calls use bearer tokens, not cookies.
- Previews use the dev Supabase project only. Production migrations need manual approval.

INVARIANTS (never break these)
1. Every admin route authorises on the server by role and permission. The UI hiding a button
   is never the control.
2. Every sensitive read and every write creates an AdminAuditLog row. The audit table is
   append-only.
3. PII is masked by default. Reveal needs a reason and is audited. VIEWER cannot reveal.
4. These are NEVER returned by any admin route: password hashes, refresh token hashes,
   WithdrawalOtp.codeHash, any OTP code, Notification.payload for OTP and sign-in notice
   kinds, PRIVATE physical attributes, KYC documents.
5. Money is integer minor units with a currency code. Every money figure is per currency.
   Never sum across currencies.
6. Events never contain message text, attribute values, KYC data, free text, emails or raw IPs.
   Country code only.
7. Chat content is visible only from an open dispute or a linked ticket, needs a stated
   reason, is read-only, and is audited.
8. Any money movement is idempotent, goes through PaymentProvider, and is webhook-authoritative
   as in the main build.
9. Tracking never blocks or breaks a user request.
10. Test users and admin accounts are excluded from KPIs.

TESTING IS A GATE
- Every phase writes and passes its own tests. A phase is not done until CI is green with the
  full accumulated suite, including the main app's existing tests.
- Permission, privacy and money code get the strongest coverage.
- All tests run in mock mode with zero real keys.

UX COPY RULES (every user-visible string, including admin)
- No em dashes. Use commas or full stops.
- Direct and explanatory, like Kuda, Moniepoint or Carbon. Say what happened and what to do next.
  Examples: "This account does not have access." "No data yet for this period."
  "Data last refreshed 4 minutes ago."
- No filler, no jokes, no "Oops".

WORKING RULES
- One phase at a time. Finish, test, commit, then stop for my review.
- Atomic commits with clear messages.
- If blocked, say what blocked you. Do not guess.
- When you find something risky (auth, money, schema), flag it in the phase report instead of
  quietly changing it.

Confirm you understand, then wait for the phase prompt.
```

---

## A0 · Preflight, schema discovery and security audit

**Maps to:** PRD sections 1.3, 12, F1, F2, F7, F11, F13 to F17 · **Changes nothing in the product**

**Prompt**

```
Phase A0: Preflight. Do NOT modify application code, schema or data in this phase. You produce
reports only. Output goes in /admin/.

1. SCHEMA MAP. Connect to the live Supabase database (read-only) and the Prisma schema. Write
   /admin/SCHEMA_MAP.md listing every table in the public schema with columns, types,
   nullability, indexes, foreign keys, enums, and row counts. Then compare against
   Monologg_Admin_PRD.md Appendix B and section 6. Produce three lists: (a) tables and columns
   the PRD expects that exist, (b) PRD names that differ in the live database (give the real
   names), (c) things the PRD assumes that do not exist. Pay special attention to:
   support tickets and terms acceptance (Phase 10), withdrawals and WithdrawalOtp (P12C),
   AuthEvent (P12B), any earnings or wallet or ledger table, and a booking state history table.
2. ANON KEY AUDIT (blocker if it fails). Using only the Supabase anon key and the Data API,
   attempt to select from every table in public and in storage and auth-adjacent views. Record
   which tables return data or schema information. For each table also record whether RLS is
   enabled and what grants exist for anon and authenticated roles. Write
   /admin/ANON_AUDIT.md. If any application table is readable, stop and tell me, with the exact
   SQL to fix it (enable RLS with deny-all, or revoke grants). Do not apply the fix yet.
3. PAYMENT PROVIDER CAPABILITIES. Inspect the PaymentProvider interface and the Paystack
   implementation. Report whether partial release and partial refund exist (needed for dispute
   SPLIT), how refunds and releases are invoked, how idempotency keys are used, and whether
   the code runs in test or live mode in each environment.
4. WITHDRAWAL AND EARNINGS. Report how a talent balance is represented today. Is there a
   ledger, a wallet, or only Payment and Booking rows? How does a withdrawal request move
   through states, and where does the OTP gate sit?
5. STORAGE AND PLAN. Report Supabase plan, database size, whether backups are enabled, and
   existing Supabase Storage buckets with object count and total size. Report whether any
   Cloudflare R2 code or config already exists, and whether a private bucket is truly
   non-public. Recommend the plan decision for PRD flag F1.
6. INFRA FACTS. Report each of the following with evidence from the repo and config:
   a) where apps/api is hosted and how it is deployed (flag F14);
   b) how apps/web (Firebase Hosting) reaches it: base URL, CORS, bearer tokens or cookies;
   c) existing job runner (BullMQ, Vercel Cron, pg_cron, other) and what jobs run today;
   d) whether the API process is long-running or serverless;
   e) existing env var validation, Sentry setup and CI workflows;
   f) the existing auth middleware roles and how Supabase JWTs are verified today;
   g) whether the web app uses supabase-js for anything besides auth, and whether the Data API
      for the public schema could be disabled (feeds flag F2). Report only, change nothing.
7. Write /admin/PREFLIGHT_REPORT.md summarising findings, blockers, and questions for me,
   ordered by severity.

Tests: none to add. Run the existing suite to confirm a clean baseline and record the result.
```

**Verify**
- [ ] `/admin/SCHEMA_MAP.md`, `/admin/ANON_AUDIT.md`, `/admin/PREFLIGHT_REPORT.md` exist
- [ ] Anon audit shows no application table readable. If any is, fix before anything else
- [ ] You know your Supabase plan and have confirmed Pro before alpha (D11)
- [ ] Decisions D5 (API host), D6 (SPLIT support) and D10 (Clerk reversal) have answers

**Carry forward:** "A0 done. Schema map, anon audit and preflight report exist. Real table names differ from the PRD as listed in SCHEMA_MAP.md. Use real names. Anon key is confirmed unable to read app tables."

---

## A1 · Admin foundation: app, auth, roles, audit

**Maps to:** M1 · **gstack:** `/review`

**Prompt**

```
Phase A1: Admin foundation. PRD module M1.

1. Create apps/admin (Next.js App Router, TypeScript strict, Tailwind) in the monorepo with
   lint, typecheck and test scripts wired into the existing CI. Apply Monologg tokens from
   MONOLOGG_DESIGN_SYSTEM.md. Admin defaults to dark mode, with a light toggle. Install only
   the opendraft components needed now (Stat, Card, Table-style rows, Toast, Dialog, Tabs,
   Skeleton, Empty State, Theme Toggle).
2. Prisma migration (additive): AdminUser (with authProvider and authSubject, no MFA fields),
   AdminRole, AdminStatus, AdminSession, AdminAuditLog as in PRD section 6. Add a database
   trigger that blocks UPDATE and DELETE on AdminAuditLog.
3. Admin auth through the AuthVerifier interface (PRD section 12.2). Implement SupabaseVerifier
   and MockVerifier now, and ClerkVerifier as a stub that throws "not enabled". After sign-in
   the app calls GET /api/v1/admin/me. Every other admin route requires mfaVerified (aal2) and
   returns needs_mfa_enroll or needs_mfa_challenge. Check AdminUser ACTIVE on every request.
   Enforce AdminSession limits (8 hours absolute, 30 minutes idle) with the message "Your
   session has expired. Sign in again." Rejection of a non-allowlisted email uses "This account
   does not have access." Disabling an admin ends their AdminSession rows, signs them out
   through the Supabase admin API and writes an audit row. Refuse to invite an email that
   belongs to a talent or client User. No public sign-up.
4. Bootstrap: a script that creates the first SUPER_ADMIN from ADMIN_ALLOWED_EMAILS (idempotent).
   SUPER_ADMIN can invite admins by email and assign roles from the Admin users screen (AD-31,
   basic list and invite for now).
5. Authorisation: implement requireAdmin and requirePermission(module, level) in apps/api,
   driven by a single permission matrix object that mirrors PRD M1.2. Add a typed
   admin-client in apps/admin that calls /api/v1/admin/* and attaches the session token.
6. Audit helper: audit(adminId, action, target, reason?, metadata?) used by every sensitive
   route. Add middleware that records ADMIN_SIGNIN and logs every denied access attempt as
   ACCESS_DENIED.
7. Layout shell: sidebar navigation grouped by module with items hidden by role, a top bar
   with environment badge and payments mode badge (TEST or LIVE read from config), user menu,
   and a global search placeholder. Mobile-friendly nav. Empty placeholder pages for every
   screen in PRD Appendix A.
8. Security headers (CSP, frame-ancestors none, no-referrer), noindex, and rate limiting on
   /api/v1/admin/*. Add a build check that fails if any service key, R2 secret or CRON_SECRET
   appears in the admin client bundle. Allow the admin origin in the API CORS config.
9. Mock mode: when ADMIN_AUTH_PROVIDER=mock, sign in with a dev-only "Sign in as <role>"
   selector that also simulates aal2. Disabled when NODE_ENV is production.

Tests: permission matrix test (every route times every role returns the expected status);
non-allowlisted email gets 403; user JWT from the main app cannot call any admin route; audit
table rejects update and delete; aal1 token gets needs_mfa_challenge on every route except /me;
session older than 8 hours rejected; idle over 30 minutes rejected; disabled admin rejected with a
still-valid token; invite of an existing talent email refused; switching ADMIN_AUTH_PROVIDER
changes only the verifier; bundle secret check.
```

**Verify**
- [ ] You can sign in as SUPER_ADMIN with MFA and see the shell
- [ ] A normal user account cannot open any admin route
- [ ] A disabled admin loses access immediately, even with an unexpired token
- [ ] Audit rows appear for sign-in and for a denied attempt

**Carry forward:** "A1 done. apps/admin exists with AuthVerifier auth, MFA, AdminSession limits, roles, audit and the layout shell. requireAdmin and requirePermission are in apps/api. Pages are placeholders."

---

## A2 · Data layer: read-only role, tables, indexes, event sink, synthetic data

**Maps to:** PRD sections 5, 6, 7

**Prompt**

```
Phase A2: Data layer. Use the real table names from /admin/SCHEMA_MAP.md.

1. Migrations (additive only): UserNote, UserTag, UserAcquisition, ProductEvent (with enums),
   KpiDaily, AlertEvent, and columns on User: lastActiveAt, isTestUser (default false),
   suspendedAt, suspendedReason. If support tickets, disputes or withdrawals already exist,
   EXTEND them with the missing columns from PRD section 6 instead of creating duplicates.
   Do not create SupportTicket, TicketMessage or Dispute here, that is A8 and A9.
2. Additive indexes listed in PRD section 6 on existing tables, created CONCURRENTLY where
   supported. Skip any that already exist.
3. Read-only role monologg_admin_ro: SELECT on required tables only, statement_timeout 5s,
   no access to RefreshToken, no access to WithdrawalOtp.codeHash, and no access to any column
   that stores secrets. Add ADMIN_DATABASE_URL to env validation and a separate Prisma or
   query client in apps/api used only for admin reads. A test must prove this role cannot
   INSERT, UPDATE or DELETE anything.
4. SQL views in an admin schema: v_user_summary, v_booking_summary, v_money_by_currency (one
   row per currency, never summed across), v_signup_funnel, v_support_summary. Heavy views are
   materialised, refreshed every 15 minutes by a pg_cron job (if pg_cron is not enabled, report
   it and fall back to the tick endpoint), with a last_refreshed_at value exposed to the UI.
4b. Add the AdminJob and JobRun migrations (PRD section 6). They are excluded from the
   read-only role except JobRun, which system health needs. KPI rollup is NOT a pg_cron job.
5. EventSink seam in apps/api/src/lib/analytics: interface EventSink, FirstPartySink (writes
   ProductEvent), PostHogSink (mock by default, off in config), and track(name, props, ctx).
   Implement the allowlist registry from PRD section 7.2: each event name has an allowed props
   map. Unknown event names and unknown props are dropped and counted. A failing sink never
   throws into the caller. Add country, device class, browser and OS parsing helpers (coarse
   only, no raw IP storage).
6. Ingestion route POST /api/v1/events: batch of up to 20, validates against the allowlist,
   caps body size, rate-limits per IP and per anonymousId, drops anonymous events when the
   consent flag is absent, attaches country from the edge header, returns 204.
7. KPI service in apps/api/src/admin/kpi implementing the definitions in PRD section 4 as
   tested pure query builders. No definitions inline in routes.
8. Synthetic dataset generator (mock and local only, refuses to run in production): about 120
   users (talent and client, several niches, countries, sources), profiles, rate cards, media,
   bookings in every BookingState across NGN, USD and GBP, payments with webhook events,
   tickets, disputes, verification recordings, withdrawals, and 30 days of ProductEvent rows
   that follow realistic funnels with drop-off. Deterministic by seed. Tag all as isTestUser
   unless a flag says otherwise, so KPI tests can choose to include them.

Tests: role cannot write; timeout fires; allowlist drops unknown props and logs the count;
message text and attribute values cannot enter props (negative tests); anonymous event without
consent not stored; sink failure does not fail the request; generator is deterministic; view
queries return per-currency rows; existing suite green.
```

**Verify**
- [ ] `ProductEvent` accepts a valid batch and rejects bad props
- [ ] The read-only role cannot write
- [ ] The synthetic generator produces a dataset you can query
- [ ] No existing table was renamed or dropped

**Carry forward:** "A2 done. Analytics and admin tables exist. ProductEvent and the EventSink seam work. Read-only role and views exist. KPI service implements section 4. Synthetic data generator is available."

---

## A3 · Instrument the main app

**Maps to:** PRD sections 7 and 11 · **gstack:** `/review` (this touches the main app)

**Prompt**

```
Phase A3: Instrument apps/web and apps/api. Every change is additive. Run the full existing
test suite before and after. Do not restyle existing screens.

1. Consent banner in apps/web: concise, plain language. Choices: Accept analytics, Decline.
   Store the choice. Until accepted, no anonymous page view or anonymous event is sent. Copy
   in the UX voice rules. Respect the choice on every visit. Add a link to change it.
2. Web tracker: a small track() wrapper with batching (flush every 5 seconds or 20 events),
   sendBeacon on unload, anonymousId and sessionId handling, and page_view on route change.
   Attach path, referrer domain, UTM parameters from the URL, device class. Never send
   anything outside the allowlisted props.
3. Instrument these web events: onboarding steps (viewed, completed, skipped), storefront and
   public profile views, share link copied, talent search (niche, filter KEYS only, result
   count), calendar day opened, help opened, project viewed. Use the exact names in PRD 7.2.
4. Server events in apps/api via track(): auth sign-up started and completed, sign-in
   succeeded and failed (provider, userType), rate card created, media uploaded, media kit
   mode changed and downloaded, verification recording started, submitted and rejected for
   length, attributes saved and deleted (counts only), availability set, calendar connected,
   project posted, application submitted, shortlisted, selected, rejected, cap reached,
   booking started, slot selected, checkout started, payment initiated, escrow locked
   (webhook), deliverables provided, release approved, booking cancelled, message sent (no
   content), withdrawal requested, OTP verified, completed and failed, api_error (route and
   status only), webhook received and failed (provider).
5. booking_state_changed: emit from the existing booking state machine with from and to, in the
   same place the state is written, without changing its logic.
6. Acquisition capture: at sign-up, write UserAcquisition from URL UTM parameters, first-touch
   record (only if consent was given), referral code used, country header, device class. If
   consent was not given, record source as unknown and analyticsConsent false.
7. lastActiveAt middleware: update at most once every 5 minutes per authenticated user,
   using a cheap in-memory or Redis throttle.
8. Test user flag: a way to mark internal accounts (script plus admin later) and exclude them
   from KPIs.
9. Terms: add a versioned clause (placeholder text clearly marked for counsel) disclosing
   conversation review in dispute or support cases and analytics with consent. Do not publish
   it, just add it to the terms system as a draft version.

Tests: events carry only allowlisted props; no message text, attribute values or emails in any
event (negative tests over every instrumented call site); consent off means no anonymous event
stored; sink failure does not slow or fail a booking or payment request; booking_state_changed
fires for every transition in the state machine; lastActiveAt throttle; UserAcquisition written
with and without consent; full existing suite still green including payment and booking tests.
```

**Verify**
- [ ] Use the app as a talent and as a client, then query `ProductEvent` to see sensible rows
- [ ] Decline consent, browse, and confirm no anonymous rows appear
- [ ] A payment and a booking still work exactly as before
- [ ] No event row contains an email, message text or attribute value

**Carry forward:** "A3 done. Web and API emit allowlisted events. Consent banner works. Acquisition, last active and booking state change events are captured. Existing behaviour is unchanged."

---

## A4 · Overview, live feed and KPIs

**Maps to:** M2 · **gstack:** `/review`

**Prompt**

```
Phase A4: Overview and live activity. PRD module M2 and KPI dictionary section 4.

1. GET /api/v1/admin/overview: returns KPI cards with change against the previous equal period,
   chart series, and a data freshness block. Uses the KPI service from A2. Supports filters:
   from, to, cohort tag, userType, currency. Money is returned per currency.
2. GET /api/v1/admin/feed: cursor-paginated recent events (signup, sign-in, uploads, publishes,
   applications, bookings, payments, disputes, tickets, withdrawals) joined to masked user
   labels and country. Excludes test users unless included by filter.
3. Overview screen (AD-02): KPI cards, charts (signups per day by type, bookings by state, GMV
   per day by currency, activation funnel snapshot), filters persisted in the URL, banners for
   payments mode and data freshness, and a critical alerts strip (empty until A12).
4. Live feed screen (AD-03): newest first, 15 second polling with pause and resume, filters by
   event group and user type, click-through to the user or booking, and a "last updated"
   indicator. Time shown in the admin's timezone with a toggle for UTC.
5. Empty and loading states: if there is no data say "No data yet for this period." Never show
   a misleading zero when a job is late, show the staleness instead.
6. Mobile layout from 360 px.

Tests: with the seeded dataset every KPI value matches the expected figure from the PRD
definitions; currency separation; test users excluded; filters change results correctly; feed
pagination is stable; a signup created in the test appears in the feed within one poll;
VIEWER sees overview with no PII.
```

**Verify**
- [ ] Create a test signup in the main app and watch it appear in the live feed in under 60 seconds
- [ ] KPI numbers on the seeded set match a hand count
- [ ] Switching filters updates every card and chart

**Carry forward:** "A4 done. Overview and live feed work on real and synthetic data. KPI service is verified against the dictionary."

---

## A5 · Users and User 360

**Maps to:** M3 · **gstack:** `/review`, then `/qa`

**Prompt**

```
Phase A5: Users and User 360. PRD module M3.

1. GET /api/v1/admin/users with search (email, name, handle, id) and the filters in M3.1,
   cursor pagination (50), sorting, and masked PII by default. GET /users/:id returns a payload
   per tab. Add the reveal route POST /users/:id/reveal (reason required, audited, VIEWER
   forbidden) that returns the unmasked fields for that view only.
2. Users list screen (AD-04) with filters, saved filter in URL, bulk add or remove cohort tag.
3. User 360 screen (AD-05) with tabs: Overview, Profile and storefront, Calendar, Bookings,
   Applications and projects, Money, Notifications, Activity, Support and disputes, Auth.
   Build what each user sees as read-only admin pages using the same data. Do not embed or
   clone the user app.
4. Media previews through short-lived signed URLs generated server-side (5 minutes), audited
   as MEDIA_VIEWED.
5. Attributes: show completeness and PUBLIC values only. SEARCHABLE values appear only after a
   reveal with reason, for SUPER_ADMIN and OPS. PRIVATE values are never returned.
6. Notifications tab shows kind, time and read state only. Never return payload for OTP and
   sign-in notice kinds.
7. Money tab: bookings, earnings (derived, labelled), fees paid, withdrawals and their states,
   per currency. If A0 found no ledger, say so in the UI label "Derived from bookings and
   withdrawals".
8. Actions (audited with reason): add internal note, suspend or unsuspend, revoke all sessions
   (through the existing session revocation service), resend verification email (through
   NotifyProvider), create a ticket on behalf of the user (stub until A8).
9. Main app change: add the suspension check to the existing auth path so a suspended user
   cannot sign in or call the API, with a clear message. Touch the minimum code. Flag this
   diff for my review.

Tests: masking default; reveal needs a reason and writes an audit row; VIEWER cannot reveal;
PRIVATE attributes never appear in any response (seeded case); OTP notification payload never
appears; suspended user is rejected at sign-in and on API calls; revoke-sessions works; user
list meets the 1.5 s target on a 10,000 user synthetic set; every action writes an audit row.
```

**Verify**
- [ ] Open a real alpha signup and see their upload, source, country and last active
- [ ] Suspend a test user and confirm they are blocked, then unsuspend
- [ ] Hunt for a PRIVATE attribute or an OTP code in any response and find none

**Carry forward:** "A5 done. Users list and User 360 work. Masking, reveal, notes, tags and suspension are in. Suspension check is added to the main auth path."

---

## A6 · Bookings and order rooms

**Maps to:** M5

**Prompt**

```
Phase A6: Bookings and order rooms. PRD module M5.

1. GET /admin/bookings with filters (state, origin, currency, niche, date, talent, client, has
   dispute, stuck), cursor pagination, and age in current state. GET /admin/bookings/:id.
2. Stuck rules from config: PENDING_PAYMENT past slotHoldExpiresAt, ESCROW_LOCKED over 7 days,
   DELIVERABLES_PROVIDED over 5 days. Implement as shared functions reused by alerts in A12.
3. Bookings list screen (AD-07) and Booking detail (AD-08): summary, parties, fee breakdown from
   stored amounts, payment status, order room metadata (message counts by kind, file count,
   call links, last activity), and a timeline built from booking_state_changed events,
   PaymentEvent rows and system messages. If a state change has no event (older rows), show the
   known timestamps and mark the gap clearly.
4. No message content on this screen. Add a "Review conversation" button that is disabled with
   the reason "Opens only from an open dispute or ticket" unless one exists. The review flow is
   built in A9.
5. Copy and layout follow the admin conventions. Money per currency.

Tests: filters; stuck detection with seeded edge cases around the thresholds; timeline order;
no message content in any response from these routes; fee breakdown equals stored amounts;
performance on 10,000 bookings.
```

**Verify**
- [ ] Pick a real test booking and trace every state change with times
- [ ] The stuck filter finds the seeded stuck bookings
- [ ] No message text appears anywhere on these screens

**Carry forward:** "A6 done. Bookings list and detail with timeline and stuck detection are in. Chat content is not exposed here."

---

## A7 · Finance

**Maps to:** M6 · **gstack:** `/review` (money views, check carefully)

**Prompt**

```
Phase A7: Finance. PRD module M6. Read-only. No money movement in this phase.

1. Finance summary (AD-09): per currency GMV, escrow held now, released, refunded, platform
   revenue (stored talentFeeAmount plus clientFeeAmount, never recomputed), take rate, average
   booking value, payment failure rate. Payments table with filters (status, provider,
   currency, date) and cursor pagination.
2. Payment detail (AD-10): summary and the PaymentEvent list (type, received time, processing
   result, duplicate flag). Raw webhook JSON only through POST /payments/:id/raw for FINANCE and
   SUPER_ADMIN, with a reason, audited, with card and bank fields masked.
3. Mismatch detectors, each as a function returning offending rows, also reused by A12 alerts:
   Payment ESCROW_HELD while Booking is not ESCROW_LOCKED; Booking ESCROW_LOCKED with no held
   Payment; Payment FAILED with Booking not CANCELLED after the hold; webhook missing 15
   minutes after payment initiated; Payment RELEASED while Booking is not PAYMENT_RELEASED.
4. Withdrawals (AD-11): list with user, amount, currency, state, requested time, OTP status
   (requested, verified, expired, locked), provider reference and failure reason. Never show
   codes or hashes. Use the real withdrawal model found in A0.
5. Earnings (AD-12): per talent earned (derived), withdrawn, pending, available (derived), per
   currency. Per client spend. Top earners and top spenders. Label "Derived from bookings and
   withdrawals". If A0 found a ledger, use it and drop the label.
6. Prominent mode banner (TEST or LIVE). A currency selector. No cross-currency totals anywhere.

Tests: seed NGN, USD and GBP and assert three separate totals everywhere; fees equal stored
amounts; every detector fires on a planted bad row and stays quiet on clean data; raw webhook
route is forbidden to roles other than FINANCE and SUPER_ADMIN and writes an audit row; OTP codes
and hashes absent from every response; performance on 10,000 payments.
```

**Verify**
- [ ] Reconcile one real test payment against the Paystack dashboard by eye
- [ ] The mismatch detectors list nothing on clean data and something on planted data
- [ ] You can see a withdrawal's state without ever seeing its code

**Carry forward:** "A7 done. Finance views, payment detail, webhook log, mismatch detectors, withdrawals and derived earnings are in, per currency, read-only."

---

## A8 · Support and complaints

**Maps to:** M7 · **gstack:** `/review`, then `/qa`

**Prompt**

```
Phase A8: Support and complaints. PRD module M7. This touches the main app, additively.

1. Check the existing Phase 10 support ticket model and endpoints. Extend them to match PRD
   section 6 (SupportTicket, TicketMessage, enums, number, priority, source, SLA fields). Do
   not create duplicates. Migrate existing rows safely with defaults.
2. Main app, user side: add "Get help" in the account menu for talent and client (category,
   message, optional booking), "Report a problem" on every booking and order room (pre-filled
   booking and category), and an alpha feedback prompt (thumbs plus optional comment) that
   creates a FEEDBACK ticket. All use the existing ticket endpoint. Emit help_opened,
   ticket_created and feedback_submitted events. Show the user their tickets and admin replies
   in the existing Help list.
3. Admin routes: list with views (Mine, Unassigned, Urgent, Waiting on user, All) and filters,
   detail, create on behalf of a user, reply, internal note, assign, change priority and status,
   close with a resolution note. Admin replies go in-app, appear as a notification, and email
   through NotifyProvider. Internal notes never reach the user.
4. SLA: first response 24 hours, URGENT 4 hours, from config. Compute breaches for alerts in A12
   and show an SLA clock on the inbox.
5. Screens: Support inbox (AD-16 list) and Ticket detail (AD-16): thread, user card, linked
   booking and dispute, canned replies (a small editable set in config), keyboard shortcuts for
   reply and assign.
6. Copy for user-facing strings follows the voice rules, for example "We have your message.
   We usually reply within 24 hours."

Tests: ticket created from the app appears in the admin inbox; admin reply reaches the user and
internal note does not; SLA timestamps; category and priority rules; user cannot read another
user's ticket; existing Help tests pass; every admin action audited.
```

**Verify**
- [ ] Report a problem from a test booking, see it in the inbox, reply, and see the reply as the user
- [ ] An internal note is invisible to the user
- [ ] First response time shows on the ticket

**Carry forward:** "A8 done. Complaint channels exist in the app and the support inbox works with SLAs and notifications."

---

## A9 · Disputes and chat review

**Maps to:** M8 · **gstack:** `/review`, `/qa` (money and privacy, review slowly)

**Prompt**

```
Phase A9: Disputes and conversation review. PRD module M8. High risk: money and private data.

1. Check for an existing dispute concept (BookingState DISPUTED exists). Add the Dispute model
   and enums from PRD section 6 additively.
2. Main app, user side: "Open a dispute" on a booking after ESCROW_LOCKED for either party
   (reason, description). The existing state machine moves the booking to DISPUTED, funds stay
   held, and a linked ticket is created. Notify the other party and show a clear status. Emit
   dispute_opened. The user sees a short note that the conversation may be reviewed by Monologg
   staff for this dispute.
3. Admin: dispute queue (AD-17) by status and age, and dispute detail (AD-18) with an evidence
   panel: booking and payment facts, delivery files and timestamps, state timeline, both
   statements, linked tickets.
4. Conversation review: POST /disputes/:id/review-chat needs a reason, writes CHAT_VIEWED with
   message counts, returns messages read-only, and the UI shows the banner "You are viewing
   private messages for dispute <id>. This access is logged." Allowed roles per PRD. Access
   without an open dispute or linked ticket is refused.
5. Request evidence: notify a party in-app and by email, set AWAITING_EVIDENCE.
6. Resolution (FINANCE or SUPER_ADMIN): RELEASE_TO_TALENT and REFUND_CLIENT through the existing
   PaymentProvider services with an idempotency key and the existing state transitions. Require
   a written note. Four-eyes: at or above DISPUTE_FOUR_EYES_THRESHOLD (config per currency) a
   second, different admin must approve before execution. Use A0 findings: build SPLIT only if
   the provider supports partial release and refund, otherwise record SPLIT as a manual
   decision with a note and flag it in the phase report.
7. After resolution notify both parties with the outcome and note, close the linked ticket, emit
   events.

Tests: dispute creation freezes release; chat review refused without a dispute or ticket;
chat review writes an audit row and needs a reason; VIEWER and OPS cannot review chat;
resolution is idempotent (replay does not move money twice); concurrent resolution attempts
resolve to one outcome; four-eyes blocks a single admin above the threshold and allows a
second approver; refund and release amounts match stored booking amounts and fee rules;
mock provider failure leaves state consistent and reports a clear error; the existing payment
and booking tests still pass.
```

**Verify**
- [ ] Open a dispute from the app, review the chat with a reason, and find the audit row
- [ ] Resolve once, replay the request, and confirm money moved once
- [ ] A single admin cannot resolve above the threshold

**Carry forward:** "A9 done. Disputes can be opened in the app, reviewed with evidence and logged chat access, and resolved idempotently with four-eyes."

---

## A10 · Verification and compliance queue

**Maps to:** M9

**Prompt**

```
Phase A10: Verification queue. PRD module M9.

1. Admin routes and screen (AD-26): list VerificationRecording by status (UPLOADED, IN_REVIEW)
   with age and a 48 hour SLA. Detail plays the video through a short-lived signed URL
   (audited MEDIA_VIEWED) beside the guideline checklist: waist-up, face and hands visible,
   good light, natural gestures, under 90 seconds (duration shown from stored durationSec).
2. Decisions: Approve, or Needs re-record with a required reason from templates plus optional
   text. Both update VerificationRecording.status through the existing service, add the reviewer
   note, and notify the talent in-app and by email. Moving to IN_REVIEW happens when a reviewer
   opens it.
3. X3 guardrail: these actions NEVER write Creator.verification or KycCheck. Add a test that
   fails if they do.
4. KYC panel: show KycCheck provider status, attempts and failure reason code only. No
   documents, no raw provider payload, no PII beyond what is in the masked user card.
5. Queue metrics: median review time and approval rate for the Overview and alerts.

Tests: decision transitions and notifications; reviewer note stored; COMPLIANCE-only write
access; X3 test; signed URL expiry; audit rows for views and decisions; no KYC document or raw
payload in any response.
```

**Verify**
- [ ] Submit a recording as a test talent, review it, and see the talent get the outcome
- [ ] The Verified badge did not change

**Carry forward:** "A10 done. The verification review queue works and stays separate from identity KYC."

---

## A11 · Analytics: acquisition, funnels, retention, traffic, adoption, marketplace

**Maps to:** M4 and M10 · **gstack:** `/review`

**Prompt**

```
Phase A11: Analytics pages. PRD modules M4 and M10. All from ProductEvent and existing tables.

1. Acquisition (AD-19): signups by source, referrer domain, referral code, country, device
   class, per day. Per source: signups, activation rate, first-booking rate. Referral code
   leaderboard. "Unknown (no consent)" shown with its share.
2. Funnels (AD-20): the three funnels in PRD M4.2 defined in config as ordered steps. Show
   count, step conversion, overall conversion, median time to next step, and breakdown by
   source, country, device and cohort. Clicking a step lists the dropped users (masked) with a
   link to User 360.
3. Retention (AD-21): weekly signup cohorts W0 to W8, filter by user type, percentages and
   counts.
4. Traffic (AD-22): visits, unique visitors, signed-in versus anonymous, top pages, referrers,
   countries, device classes, browsers, public profile and media kit views by creator. Consent
   rate at the top with the note "Numbers cover visitors who accepted analytics."
5. Feature adoption (AD-23): a feature registry in config (feature key, label, events that mean
   used, eligible audience). Show eligible, used, first-use rate, repeat use (2 or more days),
   weekly trend, by cohort, and a ranking view. Include the features listed in PRD M10.2,
   including attribute completion and visibility mix as aggregates only.
6. Marketplace health (AD-24): supply by niche, demand by niche and week, liquidity metrics
   (briefs with an application within 48 hours, applications per brief, time to first
   application, selection rate, cap reached rate), unmet demand from zero-result searches by
   niche and filter keys, and availability use.
7. Heavy queries use views or KpiDaily snapshots. Add the nightly KpiDaily job. Pages show
   data freshness.

Tests: on the seeded dataset funnel counts, retention grid, adoption figures, liquidity and
zero-result rates equal the known expected values; consent-less visits excluded; no attribute
values in any response; performance on 10,000 users and 1 million events.
```

**Verify**
- [ ] The seeded funnel numbers match your hand count
- [ ] You can name the biggest drop-off step in each funnel from the pages alone
- [ ] Feature adoption ranking looks plausible against what testers actually did

**Carry forward:** "A11 done. Acquisition, funnels, retention, traffic, adoption and marketplace pages are in, with config-driven definitions and a nightly snapshot job."

---

## A12 · Alerts, digests and system health

**Maps to:** M11 · **gstack:** `/review`

**Prompt**

```
Phase A12: Alerts, digests, system health. PRD module M11.

1. Alert engine: rules as code in apps/api/src/admin/alerts with thresholds in config. It runs
   inside POST /api/v1/cron/admin-tick every 5 minutes (CRON_SECRET, 50 second budget, lease
   locks through AdminJob and JobRun). It upserts AlertEvent rows using the unique key
   (ruleKey, subjectType, subjectId, status), updates lastSeenAt while the condition holds, and
   auto-resolves when it clears. Implement all rules listed in PRD M11.1, reusing the
   stuck-booking functions from A6, mismatch detectors from A7, ticket SLA from A8, dispute age
   from A9, and verification age from A10.
2. Alerts screen (AD-27): list by severity and status, acknowledge, resolve with note, link to
   the subject. Overview alerts strip now shows open critical alerts.
3. Delivery: critical alerts email the SUPER_ADMIN group through NotifyProvider and post to an
   optional Slack or Telegram webhook (SLACK_ALERT_WEBHOOK, mock by default). Throttle repeats,
   at most one notification per alert per 60 minutes.
4. Digests: a daily email to selected admin roles and a weekly summary for VIEWER recipients,
   built from KPI service numbers and top insights computed by code (biggest movers, worst
   funnel step, stuck items). No AI text. Mock email in dev records the payload for tests.
5. Scheduled jobs through the same tick: KPI rollup daily 02:00 Africa/Lagos, storage snapshot
   03:00 (list both R2 buckets, write KpiDaily metric storage_bytes), daily digest 07:30, weekly
   summary Monday 08:00, export worker every tick. Add the apps/admin Vercel Cron entry
   `* * * * *` calling /api/cron/tick, which forwards to API_BASE_URL. Add `pnpm admin:tick` for
   local and preview, since Vercel Cron does not run there.
6. System health (AD-28): database size and top tables, R2 storage trend versus the configured
   limit, last run, status, error and next due time per job from JobRun, AdminJob depth and
   failures, materialised view freshness, recent webhook outcomes by provider, API error rate
   from api_error events, and links to Supabase, Vercel, Cloudflare and Sentry. Show "Data last
   refreshed N minutes ago" on every dashboard.
7. Add the limit config (R2 storage and database size) so the 80 percent alert works for the
   plan chosen after A0.

Tests: each rule fires on a planted condition, does not fire on clean data, throttles repeats,
and auto-resolves; acknowledge and resolve audited; digest content matches the seed; critical
alert triggers the notification once; system health queries stay under the timeout; job failure
produces an alert. Tick tests: two overlapping ticks run each job once; an expired lease is
recovered; a wrong CRON_SECRET returns 401; a failing job does not stop the others; a job over
budget is deferred to the next tick.
```

**Verify**
- [ ] Plant a stuck booking and a failed payment and watch the alerts fire and email
- [ ] The daily digest reads clearly and the numbers match the Overview
- [ ] System health shows R2 storage and job status against your configured limits

**Carry forward:** "A12 done. Alerts, digests and system health are in, with throttled notifications and auto-resolution."

---

## A13 · Audit, exports, admin management, hardening and alpha runbook

**Maps to:** M1, M12, section 13 · **gstack:** `/review`, `/qa`, `/ship`

**Prompt**

```
Phase A13: Final build and hardening. Add no new product scope beyond this list.

1. Audit log screen (AD-29): filter by admin, action, target and date, export, read access for
   SUPER_ADMIN and COMPLIANCE.
2. Exports (AD-30): CSV for users, bookings, payments, withdrawals, tickets and funnels. Role
   gated, PII masked unless the role allows it and a reason is given, row cap 50,000, queued as
   an AdminJob, written to the private R2 bucket and delivered by a 24 hour signed URL,
   lifecycle-deleted after 7 days, every download audited.
3. Admin users (AD-31): invite, change role, disable (ends sessions immediately), last login
   and MFA status. Settings (AD-32): read-only view of thresholds, SLA targets, four-eyes
   threshold, feature registry and funnel definitions with config version.
4. Retention job (pg_cron): delete ProductEvent beyond ANALYTICS_RETENTION_MONTHS after
   rolling into KpiDaily; purge old export records; keep AdminAuditLog.
5. Security pass: re-run the anon key audit; run the full permission matrix test; dependency
   audit; confirm no service key in any client bundle; confirm the read-only role limits;
   confirm the private R2 bucket has no public access and previews use 5 minute signed URLs;
   confirm a Sentry event with an email, a name and a request body arrives scrubbed;
   confirm CI runs on a Postgres service container and production migrations need approval;
   confirm CSP and headers; confirm rate limits on admin and events routes; confirm hidden
   fields never appear in any response (F4, F10, M1.4) with a response-scanner test that
   walks every admin route on the synthetic dataset and fails on forbidden keys.
6. Performance: verify the targets in PRD section 10 on a 10,000 user and 1 million event
   synthetic set. Fix slow queries with indexes or views, additively.
7. Accessibility and mobile: axe scan on every screen, keyboard pass, 44 px targets, layout
   from 360 px.
8. Full QA sweep of every admin screen, every button, every state and empty state, as each
   role, in light and dark. Write /qa/admin-sweep.md with fixed items and flagged items.
9. Runbook /admin/RUNBOOK.md: how to invite admins, add cohorts, handle a ticket, handle a
   dispute, review a verification, acknowledge an alert, rotate secrets (including CRON_SECRET),
   switch ADMIN_AUTH_PROVIDER, recover a stuck job lease, revoke an admin immediately, run the synthetic
   generator locally, restore from backup, and what to check each morning in alpha. Include the
   alpha success criteria and the beta carry-over list from PRD section 14.
10. Tag the release and update the README.

Tests: full accumulated suite green; response scanner green; matrix test green; export caps and
masking; admin disable ends sessions; axe has no serious issues; performance budgets pass.
```

**Verify**
- [ ] The response scanner finds no forbidden field in any admin route
- [ ] A VIEWER account sees dashboards only, with masked data and no exports
- [ ] You can run a full morning check from the runbook in under 15 minutes
- [ ] Q1 to Q20 in the PRD can each be answered from the app

**Carry forward:** "A13 done. The admin app is complete, hardened and documented. Ready for alpha."

---

## Operator notes

- **Order matters.** A0 before everything. A2 before A3. A3 before A4 and A11, or the pages have no real data. A8 and A9 touch the main app, so run the full existing suite after each.
- **Start collecting alpha data early.** After A3, real events start flowing even before every admin page exists. You can run A3 first if the alpha date is close, then build pages while data accumulates.
- **Counsel before invites.** The terms wording (D7) and analytics consent need confirming before users are invited.
- **Check the plan.** Confirm Supabase Pro before alpha (F1, D11). Re-check R2 storage after the first week of uploads.
- **Sign off Clerk.** Supabase Auth is the default (F13, D10). Say so before A1 if you want Clerk instead.
- **Cron.** Vercel Cron runs on production only. On previews and local, run `pnpm admin:tick`.
- **Money mode.** Keep the TEST or LIVE banner honest. If any live money flows, settle D2 (withdrawal review) first.
- **Keep the PRD current.** If a decision changes, edit `Monologg_Admin_PRD.md` first and tell the agent which section changed.
