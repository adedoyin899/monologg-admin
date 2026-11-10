# Monologg Admin · Alpha Monitoring Platform PRD v0.2

**Status:** Draft for build · **Owner:** Maz · **Audience:** Maz, Antigravity or Claude Code, reviewers
**Companion:** `PromptPack_Admin.md` (build prompts A0 to A13)
**Version:** v0.2. Infrastructure decisions are folded in (sections 1.1, 1.2, 5, 6, 12 and 15). `PromptPack_Admin.md` is updated to match. No separate addendum is needed.

**Relationship to existing documents (additive, supersedes nothing):**
- `Monologg_Complete_PRD.md` stays the source of truth for the product, schema, payments, auth and features.
- `PromptPack_Complete.md` and `PromptPack_Auth_and_OTP.md` stay as they are. This PRD adds a new admin app and a small set of additive migrations and instrumentation hooks on top of what they built.
- Where this PRD touches the main app (event instrumentation, support entry points, one auth check), the changes are listed in section 11 so nothing is hidden.

---

## 0. Why this exists

Alpha starts with about 100 users. Today the only window into the platform is the Supabase dashboard. That cannot answer stakeholder questions (who signed up, from where, did they activate, are bookings converting, is money moving correctly, what are people complaining about), and it cannot be shared safely with non-engineers.

This PRD defines an **admin and monitoring web app** that reads from the existing Supabase Postgres database, adds first-party product analytics, and gives each stakeholder role the right view. It is built so that moving from alpha to beta changes configuration, not architecture.

---

## 1. Locked decisions, assumptions and flags

### 1.1 Decisions

| Area | Decision | Why |
|---|---|---|
| Placement | New app `apps/admin` in the existing monorepo, deployed as its own Vercel project on a separate subdomain | Isolates admin from the user app. Separate origin, separate session, separate deploys |
| Frontend | Next.js (App Router), TypeScript, Tailwind, Monologg design tokens, opendraft components where they fit (Stat, Time Series Chart, Gauge, Timeline, Chat Panel), with shadcn-style primitives as fallback | Fast to build, matches the Learnitt component choice, Monologg tokens keep it on brand |
| Backend | New admin routes under `/api/v1/admin/*` in the existing `apps/api`, behind `requireAdmin` and a permission check | Business rules and money services stay in one place. The admin browser never talks to the database |
| Database | Same Supabase Postgres. Reports run on a **read-only database role** with a statement timeout. Writes go only through existing services | Protects production from heavy queries and from accidental writes |
| Hosting | `apps/admin` on Vercel Pro. `apps/web` stays on Firebase Hosting (hosting only: not auth, storage or API). `apps/api` is the existing Node (Fastify) service on its current host, confirmed in A0 | Admin needs Vercel Cron. The frontends only meet through the API |
| Backend compute | Admin is **host-agnostic**: stateless routes, a database-backed job table, and a tick endpoint | Supabase offers Postgres and Edge Functions, not a long-running Node API with BullMQ and Redis, so the API cannot move there. Admin must not depend on where the API runs |
| Admin identity | Separate `AdminUser` table. Authentication through an `AuthVerifier` interface: Supabase Auth (Google or magic link) by default, Clerk switchable and off, mock for local. Allowlist, TOTP MFA enforced on the server (Supabase `aal2`). Session limits enforced by our own `AdminSession` table | Admin accounts never mix with talent or client accounts. P12B already uses Supabase Auth, so one identity vendor. See F13 |
| Scheduling | One tick endpoint `POST /api/v1/cron/admin-tick`, called every minute by Vercel Cron in `apps/admin`. `pg_cron` only for pure SQL jobs | Works on any API host. KPI logic exists once, in TypeScript |
| Storage and CDN | Cloudflare R2 behind a `StorageProvider` seam. Public and private buckets, signed URLs for private | Approved. Admin exports and verification recordings never sit in a public bucket |
| Monitoring and CI | Sentry with PII scrubbing. GitHub Actions with a manually approved production migration job | Errors without user text. No unreviewed production migrations |
| Analytics | **First-party event log** (`ProductEvent`) for business and visit analytics, behind an `EventSink` seam. PostHog can be added later as another sink for replay and heatmaps | You own the data, it carries over to beta unchanged, and consent is controlled in one place |
| Live updates | Polling every 15 seconds for the activity feed in alpha | Simple and reliable at this scale. Streaming is a beta item |
| "Clone of the user apps" | Built as a **User 360 read-only mirror** inside admin, not a pixel clone and not "log in as user" | See flag F6 |

### 1.2 Conflict and risk ledger (surfaced, not resolved silently)

| ID | Flag | What the build does about it |
|---|---|---|
| F1 | Supabase free tier has no backups and pauses after inactivity. Alpha users upload verification videos (up to 90 s), reels and PDFs, which now go to R2 rather than Supabase Storage | **Supabase Pro before alpha** for backups, no pause and database headroom. A0 records the plan decision. The system health page tracks R2 storage and database size against configured limits |
| F2 | P12B put the Supabase anon key in the browser. Monologg tables were created by Prisma in the `public` schema. If any table has no RLS and the Data API can reach it, the anon key may read it | A0 audits every table. Required end state: no app table readable with the anon key. Fix is RLS deny-all or revoking Data API grants. This is a launch blocker. If the web app uses `supabase-js` only for auth, or not at all, the Data API on the `public` schema can be switched off, which closes the risk at the source. A0 reports whether that is possible and changes nothing |
| F3 | Reading private chat messages is sensitive | Chat is visible only from a dispute or ticket, needs a stated reason, is read-only, is logged in the audit trail, and the terms must disclose it. Counsel to confirm wording (open decision D7) |
| F4 | Physical attributes have per-field visibility (PUBLIC, SEARCHABLE, PRIVATE). KYC data is regulated | Admin shows PUBLIC values. SEARCHABLE values need a logged reveal. **PRIVATE values are never shown to any admin.** KYC shows provider status only, never documents |
| F5 | Bookings use several currencies (NGN, USD, GBP) | Every money figure is shown per currency. Nothing is summed across currencies without an explicit FX rate, which alpha does not have |
| F6 | You asked for a clone of the talent and client sides | A pixel clone doubles the UI maintenance. "Log in as user" is risky for money and privacy. The **User 360 mirror** shows what each user sees (storefront, calendar, bookings, applications, money, notifications) as read-only admin pages fed by the same data |
| F7 | The existing schema may have no earnings ledger or wallet balance. Withdrawals (P12C) may be a minimal model | A0 reports what exists. Admin earnings are **derived** (released bookings minus fees minus withdrawals) and labelled "derived". The agent must report a missing ledger as a finding, not invent one |
| F8 | Alpha money mode: test or live | The admin shows a permanent banner: "Payments: TEST" or "Payments: LIVE". If live, see decision D2 on withdrawal review and the earlier custodial-hold sign-off flag from Phase 6 |
| F9 | Visit analytics need consent in the UK, EU and Nigeria | Anonymous visit tracking only runs after consent. The traffic page shows the consent rate so numbers are read correctly. Counsel to confirm lawful basis and update the privacy notice |
| F10 | The `Notification` table may hold OTP codes in its payload when OTP delivery runs in mock mode (P12C) | Admin never displays `Notification.payload` for OTP or sign-in notice kinds. Field allowlist, enforced and tested |
| F11 | SPLIT dispute resolutions need partial release and partial refund from the payment provider. Unknown if the existing `PaymentProvider` supports it | A9 builds RELEASE and REFUND first. SPLIT is built only if A0 confirms provider support. Otherwise it is recorded as a manual decision and flagged |
| F12 | Open items inherited from the main build: X4 (applicant cap behaviour) and X5 (slot-hold timeout) | Admin reads whatever values are configured. It reports cap-reached and hold-expired events so you can judge them with real data |
| F13 | The commitments table listed Clerk for authentication, but P12B already built user sign-in on Supabase Auth | Admin uses Supabase Auth behind an `AuthVerifier` interface. Clerk is a switchable implementation, off by default. **Needs Maz's sign-off (D10)**. Reconsider Clerk only if you want its prebuilt user-management UI or organisation features |
| F14 | Where `apps/api` runs is not yet confirmed. The dev confirmed it is a Node service and that Firebase hosts only the user app frontend | A0 reports the host. Admin is built host-agnostic, so the answer changes configuration, not code |
| F15 | BullMQ and Puppeteer (media-kit PDFs) need a long-running host with Redis | Out of admin scope. Resolve with the API host decision. Admin jobs do not use BullMQ |
| F16 | Vercel Cron runs on production deployments only | Previews and local use `pnpm admin:tick` to run the same handler |
| F17 | Supabase Auth is one shared user pool for talents, clients and admins | Admins use dedicated admin emails. Inviting an email that belongs to a talent or client account is refused |

### 1.3 Assumptions (verify in A0)

- The live Supabase schema matches `Monologg_Complete_PRD.md` plus the additions from P12A, P12B and P12C, with possible differences from the agent's implementation choices. **The live database wins over this document.** A0 produces a schema map and lists every difference.
- Support tickets from Phase 10 and terms acceptance records exist in some form. They are extended, not duplicated.
- `apps/api` is a Node (Fastify) service deployed somewhere reachable from Vercel, host confirmed in A0 (F14, D5). Supabase is the database only. Firebase hosts the user app frontend only.

---

## 2. Goals, non-goals and users

### Goals
- G1. See every signup, sign-in, upload and action the moment it happens, with who, when and where from.
- G2. Answer the stakeholder questions in section 3 without touching Supabase.
- G3. Run support and disputes from one place, with the evidence in front of you.
- G4. See all money: payments, escrow held, releases, refunds, fees, withdrawals, per currency.
- G5. Track activation, conversion, retention and feature adoption, to decide what to change for beta.
- G6. Keep a complete audit trail of what admins see and do.
- G7. Carry over to beta with no schema or architecture change.

### Non-goals (alpha)
- Impersonation or "log in as user"
- Pixel-clone of user screens
- Manual payment operations beyond dispute resolution
- Session replay, heatmaps, A/B testing (PostHog later)
- Automated provider reconciliation files (alpha uses mismatch detectors)
- Native mobile admin app (the admin web app must be usable on a phone)
- Multi-tenant admin or customer-facing analytics

### Admin roles

| Role | Who | Purpose |
|---|---|---|
| SUPER_ADMIN | Maz and one backup | Everything, including admin user management |
| OPS | Operations | Users, bookings, marketplace, alerts, support |
| SUPPORT | Support agents | Tickets, disputes (review), user lookups |
| FINANCE | Finance lead | Payments, withdrawals, dispute resolution, finance exports |
| COMPLIANCE | Reviewer | Verification queue, KYC status, audit log |
| VIEWER | Stakeholders and investors | Dashboards and analytics only, PII masked |

---

## 3. What stakeholders need to answer

These are the acceptance questions for the whole product. Each maps to a page. A0 to A13 are done when every question can be answered in under two minutes.

| # | Question | Page |
|---|---|---|
| Q1 | How many people signed up today, this week, since alpha start? Talent versus client? | AD-02 Overview |
| Q2 | Who just signed in or signed up, when, with what method, from which country? | AD-03 Live feed |
| Q3 | What did this user upload, publish or do? Where are they stuck? | AD-05 User 360 |
| Q4 | Which sources and referral codes bring signups that activate? | AD-19 Acquisition |
| Q5 | Where do people drop off between signup and first booking? | AD-20 Funnels |
| Q6 | Are people coming back? Week 1 and week 4 retention by cohort | AD-21 Retention |
| Q7 | Where are visitors from? Which pages and which devices? | AD-22 Traffic |
| Q8 | Which features are used, by how many, repeatedly? | AD-23 Feature adoption |
| Q9 | Is there enough supply and demand in each niche? What are people searching for and not finding? | AD-24 Marketplace health |
| Q10 | How many bookings, in which state, how long in each state? | AD-07 Bookings |
| Q11 | How much money has moved? GMV, escrow held, released, refunded, platform revenue, per currency | AD-09 Finance |
| Q12 | How much has each talent earned and withdrawn? Any withdrawals pending or failing? | AD-11, AD-12 |
| Q13 | Which payments failed, and why? Did every webhook arrive? | AD-10 |
| Q14 | What complaints and tickets are open? How fast are we responding? | AD-15 Support |
| Q15 | Which disputes are open? What happened in the booking and the chat? | AD-17 Disputes |
| Q16 | Who is waiting for verification review, and for how long? | AD-26 Verification |
| Q17 | Is anything broken right now? Stuck payments, failed jobs, error spikes | AD-27 Alerts |
| Q18 | Are we close to storage or database limits? | AD-28 System health |
| Q19 | Who looked at what data and who changed what? | AD-29 Audit |
| Q20 | Can I send stakeholders a weekly summary? | Digest, AD-30 Exports |

---

## 4. KPI dictionary (exact definitions the code must follow)

All counts exclude test users and admin accounts (`isTestUser` flag, see section 6) and can be filtered by cohort tag, date range and user type. "Active" means at least one authenticated event in the window.

| KPI | Definition |
|---|---|
| Signup | A `User` row created. Split by `userType` and `accountOrigin` (SIGNUP, AUTO_CHECKOUT) |
| Email verified | `User.emailVerified = true`, or sign-in through Google |
| Talent onboarded | Creator with name, niche, location set |
| Talent activated | Onboarded and at least one RateCard and at least one MediaAsset |
| Client activated | Client who created a Brief, or started a booking (event `booking_started`) |
| Verified (identity) | `Creator.verification = VERIFIED` (KYC only, never from the verification recording) |
| Verification recording approved | `VerificationRecording.status = APPROVED` |
| DAU, WAU, MAU | Distinct users with any authenticated `ProductEvent` in the last 1, 7, 28 days |
| Time to first booking | `Booking.createdAt` of the first booking minus `User.createdAt`, median and 90th percentile |
| Booking funnel (external) | `public_profile_viewed`, `booking_started`, `slot_selected`, `payment_initiated`, `escrow_locked` |
| GMV | Sum of `Booking.baseAmount` for bookings that reached ESCROW_LOCKED, per currency |
| Escrow held now | Sum of `Payment.amount` where `escrowHeld = true` and not released or refunded, per currency |
| Released | Sum of `baseAmount` for PAYMENT_RELEASED bookings, per currency |
| Platform revenue | `talentFeeAmount + clientFeeAmount` on PAYMENT_RELEASED bookings, per currency |
| Take rate | Platform revenue divided by GMV for the same set |
| Dispute rate | Bookings that entered DISPUTED divided by bookings that reached ESCROW_LOCKED |
| Payment failure rate | Payments FAILED divided by payments INITIATED, same period |
| Talent earned (derived) | Sum of `baseAmount - talentFeeAmount` for PAYMENT_RELEASED bookings, per currency |
| Talent available (derived) | Talent earned minus completed and pending withdrawals |
| Applications per brief | Count of Application per Brief, median |
| Cap reached rate | Briefs with `applicationsOpen = false` due to the cap divided by briefs with a cap |
| Zero-result search rate | `talent_search_performed` with `resultCount = 0` divided by all searches |
| First response time | `SupportTicket.firstResponseAt - createdAt`, median |
| Verification review time | Review decision time minus upload time, median |
| Retention (Wn) | Share of a signup-week cohort with an authenticated event in week n after signup |
| Consent rate | Visitors with analytics consent divided by visitors counted at the consent banner |

---

## 5. Architecture

```
Admin browser (apps/admin, Next.js on Vercel, admin.<domain>)
   |  Supabase Auth session (Google or magic link) + TOTP MFA, verified through AuthVerifier
   v
Admin routes in apps/api   /api/v1/admin/*
   |  requireAdmin -> permission check -> audit write
   |-------------------------------|
   v                               v
Read path                       Write path
Read-only DB role               Existing services only
(statement_timeout 5s)          (booking state machine, PaymentProvider,
SQL views and queries            NotifyProvider, verification, support)
   v                               v
Supabase Postgres (existing tables + additive admin tables + analytics tables)

Main app (apps/web and apps/api) --> EventSink seam --> ProductEvent table
                                      (PostHog sink optional, later)
Vercel Cron (apps/admin, every minute) --> POST /api/v1/cron/admin-tick --> due jobs
   (KPI rollup, alert checks, digests, exports; state in AdminJob and JobRun)
pg_cron: materialised view refresh, retention purge (pure SQL only)
Files: Cloudflare R2 through StorageProvider (monologg-public, monologg-private)
Errors: Sentry (PII scrubbed)
```

**Rules**
1. The admin browser never receives database credentials and never queries the database directly.
2. All report queries use the read-only role. Any write goes through an existing service, never raw SQL.
3. Every admin route authorises on the server by role and permission. The UI hides what a role cannot use, but the server decides.
4. Every sensitive read and every write creates an `AdminAuditLog` row (section 8, M1).
5. Money amounts are integer minor units with a currency code everywhere. Display formatting happens at the edge.
6. Provider seam rule from the main build applies: the admin runs fully in mock mode with zero real keys and a synthetic dataset.

---

## 6. Data model additions (additive only, Prisma)

No existing table is renamed or dropped. Existing models are extended only with nullable columns or defaults. A0 confirms names against the live schema.

```prisma
// ---------- Admin access ----------
model AdminUser {
  id             String    @id @default(cuid())
  email          String    @unique
  authProvider   AdminAuthProvider @default(SUPABASE)
  authSubject    String?   // provider user id, bound on first sign-in
  role           AdminRole
  status         AdminStatus @default(INVITED)
  invitedById    String?
  lastLoginAt    DateTime?
  createdAt      DateTime  @default(now())
  @@unique([authProvider, authSubject])
}
enum AdminRole   { SUPER_ADMIN OPS SUPPORT FINANCE COMPLIANCE VIEWER }
enum AdminStatus { INVITED ACTIVE DISABLED }
enum AdminAuthProvider { SUPABASE CLERK }

// MFA state is read from the verified token (Supabase aal2), not stored here.
model AdminSession {             // our own session limits: 8 hours absolute, 30 minutes idle
  id                String    @id @default(cuid())
  adminUserId       String
  providerSessionId String    @unique
  createdAt         DateTime  @default(now())
  lastSeenAt        DateTime  @default(now())
  endedAt           DateTime?
  ipHash            String?   // hashed, never raw
  @@index([adminUserId, endedAt])
}

model AdminJob {                 // small DB-backed queue for one-off work (exports, on-demand digests)
  id          String    @id @default(cuid())
  kind        String
  payload     Json
  status      String    @default("PENDING")   // PENDING | RUNNING | DONE | FAILED
  attempts    Int       @default(0)
  runAfter    DateTime  @default(now())
  lockedUntil DateTime?
  lastError   String?
  @@index([status, runAfter])
}

model JobRun {                   // one row per scheduled job, feeds system health
  jobKey         String    @id
  lastStartedAt  DateTime?
  lastFinishedAt DateTime?
  lastStatus     String?
  lastError      String?
  nextDueAt      DateTime?
}

model AdminAuditLog {            // append-only, enforced by a database trigger
  id          String   @id @default(cuid())
  adminId     String
  action      String             // e.g. USER_VIEWED, PII_REVEALED, CHAT_VIEWED, DISPUTE_RESOLVED
  targetType  String?            // USER, BOOKING, DISPUTE, TICKET, PAYMENT, EXPORT
  targetId    String?
  reason      String?            // required for sensitive actions
  metadata    Json     @default("{}")
  ipHash      String?
  createdAt   DateTime @default(now())
  @@index([adminId, createdAt])
  @@index([targetType, targetId])
  @@index([action, createdAt])
}

// ---------- Existing user table: additive columns ----------
// model User { lastActiveAt DateTime?  isTestUser Boolean @default(false)
//              suspendedAt DateTime?   suspendedReason String? }

model UserNote {                 // internal admin notes on a user
  id          String   @id @default(cuid())
  userId      String
  adminId     String
  body        String
  createdAt   DateTime @default(now())
  @@index([userId, createdAt])
}
model UserTag {                  // cohorts, e.g. "alpha-wave-1"
  userId      String
  tag         String
  createdById String?
  createdAt   DateTime @default(now())
  @@id([userId, tag])
  @@index([tag])
}

// ---------- Acquisition and analytics ----------
model UserAcquisition {
  userId            String   @id
  firstSeenAt       DateTime?
  landingPath       String?
  referrerDomain    String?
  utmSource         String?
  utmMedium         String?
  utmCampaign       String?
  referralCodeUsed  String?
  signupCountry     String?      // ISO-2 only
  signupDeviceClass String?      // mobile, tablet, desktop
  analyticsConsent  Boolean  @default(false)
  createdAt         DateTime @default(now())
}

model ProductEvent {             // first-party event log
  id           BigInt      @id @default(autoincrement())
  occurredAt   DateTime    @default(now())
  name         String
  actorType    EventActor
  source       EventSource
  userId       String?
  anonymousId  String?
  sessionId    String?
  path         String?
  referrerDomain String?
  utmSource    String?
  utmMedium    String?
  utmCampaign  String?
  country      String?         // ISO-2 only. No city, no raw IP
  deviceClass  String?
  browser      String?
  os           String?
  appVersion   String?
  props        Json        @default("{}")   // allowlisted keys only, no free text
  @@index([name, occurredAt])
  @@index([userId, occurredAt])
  @@index([occurredAt])
  @@index([anonymousId, occurredAt])
}
enum EventActor  { USER ANON SYSTEM ADMIN }
enum EventSource { WEB API SYSTEM WEBHOOK }

model KpiDaily {                 // nightly snapshot so history is cheap and stable
  day        DateTime
  metric     String
  dimension  String   @default("all")   // e.g. userType, currency, cohort tag
  value      Decimal  @db.Decimal(20,4)
  @@id([day, metric, dimension])
}

// ---------- Support and disputes (extend if Phase 10 already created tickets) ----------
model SupportTicket {
  id              String   @id @default(cuid())
  number          Int      @unique @default(autoincrement())   // shown as MNL-<number>
  reporterUserId  String?
  reporterEmail   String?
  category        TicketCategory
  priority        TicketPriority @default(NORMAL)
  status          TicketStatus   @default(OPEN)
  source          TicketSource   @default(IN_APP)
  subject         String
  body            String
  bookingId       String?
  disputeId       String?
  assignedAdminId String?
  firstResponseAt DateTime?
  resolvedAt      DateTime?
  slaDueAt        DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  messages        TicketMessage[]
  @@index([status, priority, createdAt])
  @@index([reporterUserId])
}
enum TicketCategory { COMPLAINT BUG PAYMENT DISPUTE ACCOUNT VERIFICATION FEEDBACK OTHER }
enum TicketPriority { LOW NORMAL HIGH URGENT }
enum TicketStatus   { OPEN IN_PROGRESS WAITING_ON_USER RESOLVED CLOSED }
enum TicketSource   { IN_APP EMAIL ADMIN_CREATED }

model TicketMessage {
  id         String   @id @default(cuid())
  ticketId   String
  ticket     SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  authorType TicketAuthor
  authorId   String?
  body       String
  internal   Boolean  @default(false)     // internal notes are never shown to the user
  attachments Json    @default("[]")
  createdAt  DateTime @default(now())
  @@index([ticketId, createdAt])
}
enum TicketAuthor { USER ADMIN SYSTEM }

model Dispute {
  id                String   @id @default(cuid())
  bookingId         String   @unique
  openedByUserId    String
  openedByRole      UserType
  reason            DisputeReason
  description       String
  status            DisputeStatus @default(OPEN)
  resolution        DisputeResolution?
  splitTalentPct    Int?             // 0 to 100, only for SPLIT
  resolutionNote    String?
  resolvedByAdminId String?
  approvedByAdminId String?          // second approver above the four-eyes threshold
  openedAt          DateTime @default(now())
  resolvedAt        DateTime?
  @@index([status, openedAt])
}
enum DisputeReason     { NOT_DELIVERED QUALITY NO_SHOW NOT_AS_DESCRIBED PAYMENT OTHER }
enum DisputeStatus     { OPEN UNDER_REVIEW AWAITING_EVIDENCE RESOLVED }
enum DisputeResolution { RELEASE_TO_TALENT REFUND_CLIENT SPLIT }

// ---------- Alerts ----------
model AlertEvent {
  id            String   @id @default(cuid())
  ruleKey       String
  severity      AlertSeverity
  status        AlertStatus @default(OPEN)
  subjectType   String?
  subjectId     String?
  detail        Json     @default("{}")
  firstSeenAt   DateTime @default(now())
  lastSeenAt    DateTime @default(now())
  ackedByAdminId String?
  resolvedAt    DateTime?
  @@index([status, severity, lastSeenAt])
  @@unique([ruleKey, subjectType, subjectId, status])
}
enum AlertSeverity { INFO WARNING CRITICAL }
enum AlertStatus   { OPEN ACKNOWLEDGED RESOLVED }
```

**Additive indexes on existing tables** (migration in A2, after A0 confirms columns): `User(createdAt)`, `User(lastActiveAt)`, `Booking(state, createdAt)`, `Booking(creatorId, createdAt)`, `Booking(clientId, createdAt)`, `Payment(status, createdAt)`, `PaymentEvent(paymentId, createdAt)`, `Message(orderRoomId, createdAt)`, `AuthEvent(userId, createdAt)`, `AuthEvent(createdAt)`, `Application(briefId, createdAt)`, `Brief(createdAt)`, `VerificationRecording(status, createdAt)`, `Notification(userId, createdAt)`.

**Read-only role and views** (migration in A2)
- Role `monologg_admin_ro` with `SELECT` on the tables the admin needs, `statement_timeout = 5s`, no access to token tables (`RefreshToken`), no access to `WithdrawalOtp.codeHash`, and column-level exclusion of any secret columns.
- Views in an `admin` schema for the shared aggregations: `v_user_summary`, `v_booking_summary`, `v_money_by_currency`, `v_signup_funnel`, `v_support_summary`. Heavy ones are materialised views refreshed by a job, with the refresh time shown in the UI.

---

## 7. Event tracking

### 7.1 Principles
- **Server events are the source of truth for business facts** (bookings, payments, state changes, sign-ins, withdrawals). They cannot be blocked by an ad blocker and need no consent beyond the contract.
- **Web events** cover visits and UI behaviour (page views, clicks that matter, searches, funnel steps). Anonymous visitor events fire only after consent. Signed-in product events fire for authenticated users as part of operating the service, subject to counsel confirming lawful basis (F9).
- **No personal content in events.** Never log message text, attribute values, KYC data, free-text fields, emails or raw IPs. `props` keys are allowlisted per event. Unknown keys are dropped and counted.
- **Country only.** Derive country from the edge request header at the web layer. Store ISO-2 code. No city.
- **One seam.** `EventSink` interface with `FirstPartySink` (writes `ProductEvent`) and `PostHogSink` (optional, mock by default). Calls go through `track(name, props, ctx)`.
- **Never block the user.** Tracking is fire-and-forget with batching on the client and failures swallowed and counted.

### 7.2 Event catalogue (initial)

| Group | Event | Source | Allowed props |
|---|---|---|---|
| Visit | `page_view` | WEB | path, referrerDomain, utm* |
| Auth | `auth_signup_started`, `auth_signup_completed`, `auth_signin_succeeded`, `auth_signin_failed` | API | provider, userType |
| Onboarding | `onboarding_step_viewed`, `onboarding_step_completed`, `onboarding_step_skipped` | WEB | stepKey, userType |
| Storefront | `storefront_viewed`, `public_profile_viewed` | WEB | creatorId, viaShareLink |
| Talent setup | `rate_card_created`, `media_uploaded`, `media_kit_mode_changed`, `media_kit_downloaded` | API | kind, mode |
| Verification | `verification_recording_started`, `verification_recording_submitted`, `verification_recording_rejected_too_long` | API | durationSec |
| Attributes | `attributes_step_skipped`, `attributes_saved`, `attributes_deleted` | API | fieldCount, publicCount, searchableCount, privateCount |
| Calendar | `availability_set`, `calendar_connected`, `calendar_day_opened` | WEB/API | slotCount |
| Search | `talent_search_performed` | WEB | niche, filterKeys (keys only, never values), resultCount |
| Projects | `project_posted`, `project_viewed`, `application_submitted`, `applicant_shortlisted`, `applicant_selected`, `applicant_rejected`, `cap_reached` | API | briefId, cap |
| Booking | `booking_started`, `slot_selected`, `checkout_started`, `payment_initiated`, `escrow_locked`, `deliverables_provided`, `release_approved`, `booking_cancelled`, `booking_state_changed` | API/WEBHOOK | bookingId, from, to, currency, amountMinor, origin |
| Messaging | `message_sent` | API | orderRoomId, kind (counts only, never content) |
| Money | `withdrawal_requested`, `withdrawal_otp_verified`, `withdrawal_completed`, `withdrawal_failed` | API | currency, amountMinor |
| Support | `help_opened`, `ticket_created`, `dispute_opened`, `feedback_submitted` | WEB/API | category |
| Share | `share_link_copied`, `media_kit_link_copied` | WEB | surface |
| System | `api_error`, `job_failed`, `webhook_received`, `webhook_failed` | API/SYSTEM | route, status, provider |

### 7.3 Ingestion
- `POST /api/v1/events` accepts a batch of up to 20 events from the web app. Validates names and props against the allowlist, caps payload size, rate-limits per IP and per anonymous id, attaches country from the edge header, drops anonymous events without the consent flag.
- Server code calls `track()` directly. No HTTP hop.
- Retention: `ProductEvent` kept 13 months in alpha. A daily job rolls up to `KpiDaily` and deletes beyond retention.

---

## 8. Admin modules (epics, stories and acceptance criteria)

Screen IDs (AD-xx) are listed in Appendix A.

### M1 · Access, security and audit

**M1.1 Admin sign-in.** As an admin, I sign in securely.
- AC1. Sign in with Google or magic link through Supabase Auth (via the `AuthVerifier`). Only emails in `AdminUser` with status ACTIVE can proceed. Everyone else sees "This account does not have access."
- AC2. TOTP MFA is required on first sign-in and on every new session. Enforced on the server: every admin route except `GET /me` needs a token that shows MFA verified (`aal2`), otherwise the API answers `needs_mfa_enroll` or `needs_mfa_challenge`. No MFA, no access.
- AC3. Session expires after 30 minutes idle and 8 hours absolute, with the message "Your session has expired. Sign in again." Limits are enforced by our own `AdminSession` table, because provider session settings depend on plan and a revoked token stays valid until it expires. `AdminUser` status ACTIVE is checked on every request.
- AC4. There is no public sign-up. SUPER_ADMIN invites by email and assigns a role.
- AC5. The admin app sets strict security headers and is not indexed.
- AC6. Disabling an admin ends all their `AdminSession` rows, signs them out through the provider's admin API, and writes an audit row. The next request fails even if their token has not expired.
- AC7. Inviting an email that already belongs to a talent or client account is refused. Admins use dedicated admin emails.

**M1.2 Role-based access.** As the owner, each role sees and does only what it should.
- AC1. The permission matrix below is enforced on the server for every route, and the UI hides unavailable actions.
- AC2. A test iterates every route and every role and asserts the expected status (200 or 403).

| Module | SUPER | OPS | SUPPORT | FINANCE | COMPLIANCE | VIEWER |
|---|---|---|---|---|---|---|
| Overview and analytics | R | R | R | R | R | R |
| Users (PII masked) | RW | RW | R | R | R | R |
| Reveal masked PII | yes | yes | yes | yes | yes | no |
| User actions (suspend, revoke sessions) | W | W | no | no | no | no |
| Bookings and order rooms (metadata) | R | R | R | R | R | R |
| Chat content | dispute-gated | no | dispute or ticket-gated | dispute-gated | no | no |
| Payments and transactions | R | R | R | RW | R | aggregates |
| Withdrawals | R | R | no | R | no | no |
| Support tickets | RW | RW | RW | R | R | no |
| Disputes | RW | R | RW (review, request evidence) | RW (resolve) | R | no |
| Verification queue | R | R | no | no | RW | no |
| Alerts | RW | RW | R | RW | R | R |
| System health | R | R | no | no | no | R |
| Audit log | R | no | no | no | R | no |
| Admin users | RW | no | no | no | no | no |
| Exports | yes | yes, no PII | no | yes, finance | yes, compliance | no |

**M1.3 Audit trail.** As the owner, I can see who saw and did what.
- AC1. Actions that write an audit row: sign-in, user view, PII reveal, media preview, chat view, ticket reply, dispute status change and resolution, user suspend or session revoke, export, role change, alert acknowledge, setting change.
- AC2. A row has admin, action, target, reason (mandatory for PII reveal, chat view, dispute resolution, suspend), metadata and hashed IP.
- AC3. The table is append-only. A database trigger blocks update and delete.
- AC4. A test fails if any sensitive route runs without writing an audit row.

**M1.4 PII masking.**
- AC1. By default emails, phone numbers and full names of non-staff are masked (`a***@gmail.com`).
- AC2. "Reveal" requires a reason, lasts for the current page view, and writes an audit row.
- AC3. VIEWER can never reveal.
- AC4. These fields are never returned by any admin route: password hashes, refresh token hashes, `WithdrawalOtp.codeHash`, any OTP code, `Notification.payload` for OTP and sign-in notice kinds, PRIVATE physical attributes, KYC documents.

### M2 · Overview and live activity

**M2.1 Overview (AD-02).** As a stakeholder, I see the health of the platform on one screen.
- AC1. KPI cards with change against the previous equal period: signups (talent, client), active users (DAU, WAU), talent activated, clients activated, bookings created, escrow locked, GMV and platform revenue per currency, open tickets, open disputes, open critical alerts.
- AC2. Charts: signups per day by user type, bookings by state, GMV per day by currency, activation funnel snapshot.
- AC3. Filters: date range, cohort tag, user type, currency. Filters persist in the URL.
- AC4. A banner shows payments mode (TEST or LIVE), environment, and the freshness of materialised data.
- AC5. KPI numbers match the definitions in section 4. A test seeds a known dataset and asserts every number.

**M2.2 Live feed (AD-03).** As an admin, I watch activity as it happens.
- AC1. Newest first list of events: sign-ups, sign-ins, uploads, publishes, applications, bookings, payments, disputes, tickets, withdrawals. Each shows time, actor (masked), event, and country.
- AC2. Polls every 15 seconds. Pause and resume control. Filters by event group and user type.
- AC3. A signup appears in the feed within 60 seconds of the user being created.
- AC4. Clicking an item opens the user or booking.

### M3 · Users and User 360

**M3.1 Users list (AD-04).**
- AC1. Search by email, name, handle or id. Filters: user type, verification state, auth provider, account origin, country, cohort tag, signup date, last active, has booking, has earnings, suspended.
- AC2. Columns: name, masked email, type, signed up, last active, country, source, verification, bookings, tags.
- AC3. Cursor pagination, 50 per page, sortable, results in under 1.5 seconds for 10,000 users.
- AC4. Bulk action: add or remove cohort tag (audited).

**M3.2 User 360 (AD-05).** As support or ops, I see a user's whole story.
- AC1. Tabs: Overview, Profile and storefront, Calendar, Bookings, Applications and projects, Money, Notifications, Activity, Support and disputes, Auth.
- AC2. Overview shows sign-up time, auth provider, account origin, acquisition source and referral code, signup country and device, last active, suspended state, tags and internal notes.
- AC3. Profile and storefront show what the user sees: name, niche, location, badges, style tags, verification state, media kit mode, media list with preview via short-lived signed URLs (audited), rate cards, availability summary, and attribute completeness with PUBLIC values only.
- AC4. Money shows bookings, earnings (derived), fees paid, withdrawals and their states, per currency.
- AC5. Activity is a timeline of `ProductEvent` rows for that user, newest first, filterable.
- AC6. Auth shows `AuthEvent` history (provider, success or failure, time, country), linked Supabase id, and active session count.
- AC7. Actions: add internal note, suspend or unsuspend (reason required), revoke all sessions, resend verification email, create a ticket on the user's behalf. Each is audited.
- AC8. Suspended users cannot sign in or call the API (tested in the main app, see section 11).

### M4 · Acquisition, traffic and funnels

**M4.1 Acquisition (AD-19).**
- AC1. Signups by source (utm source, referrer domain, referral code), by country, by device class, by day.
- AC2. For each source: signups, activation rate, first-booking rate.
- AC3. Referral code leaderboard (the existing `referralCode` and celebrity badge flow).
- AC4. Signups without consent show as "Unknown (no consent)". The page shows the share of unknown.

**M4.2 Funnels (AD-20).**
- AC1. Pre-defined funnels: Talent (signup, email verified, onboarded, media uploaded, rate card created, activated, first booking), Client (signup, brief posted or booking started, escrow locked, delivered, released), External booking (public profile viewed, booking started, slot selected, payment initiated, escrow locked).
- AC2. Each step shows count, conversion from the previous step, conversion from the start, and median time to the next step.
- AC3. Breakdown by source, country, device class and cohort.
- AC4. Clicking a step lists the users who dropped off, so support can reach out.

**M4.3 Retention (AD-21).** Weekly signup cohorts, W0 to W8, as a grid with percentages, filterable by user type.

**M4.4 Traffic (AD-22).**
- AC1. Visits, unique visitors, signed-in versus anonymous, by day.
- AC2. Top pages, top referrers, countries, device classes, browsers.
- AC3. Public profile and media kit link views by creator.
- AC4. A consent rate figure sits at the top with a note: "Numbers cover visitors who accepted analytics."

### M5 · Bookings and order rooms

**M5.1 Bookings list (AD-07).**
- AC1. Filters: state, origin (INTERNAL, PUBLIC_LINK), currency, niche, date, talent, client, has dispute.
- AC2. Columns: booking id, talent, client, service, slot, amount and currency, state, age in state, origin.
- AC3. "Stuck" filter: PENDING_PAYMENT past the hold, ESCROW_LOCKED over 7 days, DELIVERABLES_PROVIDED over 5 days (thresholds in config).

**M5.2 Booking detail (AD-08).**
- AC1. Summary, parties, fee breakdown, payment, and order room metadata (message counts, call links, files, last activity).
- AC2. Timeline built from `booking_state_changed` events, `PaymentEvent` rows and system messages, with exact timestamps.
- AC3. Message content is not shown here. A "Review conversation" button appears only when the booking has an open dispute or a linked ticket, and follows M8.

### M6 · Finance

**M6.1 Transactions (AD-09).**
- AC1. Per currency totals: GMV, escrow held now, released, refunded, platform revenue, take rate, average booking value, payment failure rate.
- AC2. Payments table: id, booking, payer, provider, provider reference, status, amount, currency, time. Filters by status, provider, currency, date.
- AC3. Platform fees collected split into talent fee and client fee, both read from stored booking amounts, never recomputed.

**M6.2 Payment detail and webhook log (AD-10).**
- AC1. Payment summary with the full list of `PaymentEvent` rows: event type, received time, processing result, duplicate flag.
- AC2. Raw webhook JSON is visible to FINANCE and SUPER_ADMIN only, behind a reveal with reason, with card or bank details masked.
- AC3. Mismatch detectors, each listing offending rows: Payment ESCROW_HELD while Booking is not ESCROW_LOCKED; Booking ESCROW_LOCKED with no Payment held; Payment FAILED with Booking not CANCELLED after the hold; webhook missing 15 minutes after payment initiated.

**M6.3 Withdrawals (AD-11).**
- AC1. List with user, amount, currency, state, requested time, OTP status (requested, verified, expired, locked), provider reference, failure reason. Codes are never shown.
- AC2. Pending over 24 hours or failed raise alerts.
- AC3. Optional alpha review gate (decision D2).

**M6.4 Earnings (AD-12).**
- AC1. Per talent: earned (derived), withdrawn, pending, available (derived), per currency. Per client: spend, per currency.
- AC2. Top earners and top spenders lists.
- AC3. The page carries a label: "Derived from bookings and withdrawals" until a ledger exists.

### M7 · Support and complaints

**M7.1 Complaint channels (main app changes, section 11).**
- AC1. A "Get help" entry in the account menu on talent and client apps opens a short form (category, message, optional booking) that creates a ticket.
- AC2. Every booking and order room has "Report a problem", which pre-fills the booking and creates a ticket.
- AC3. "Open a dispute" is available to either party after ESCROW_LOCKED and creates a Dispute and a linked ticket (see M8).
- AC4. A feedback prompt (thumbs and optional comment) for alpha testers creates a FEEDBACK ticket.
- AC5. Admin can create a ticket on a user's behalf (for email or WhatsApp complaints). Inbound email parsing is a beta item.

**M7.2 Support inbox (AD-15) and ticket detail (AD-16).**
- AC1. Inbox with views: Mine, Unassigned, Urgent, Waiting on user, All. Filters: category, priority, status, source, age.
- AC2. Ticket detail shows the thread, user card, linked booking and dispute, and internal notes in a separate style.
- AC3. Reply sends in-app, appears in the user's existing Help list as a notification, and is emailed through `NotifyProvider`. Internal notes are never visible to the user.
- AC4. SLA: first response target 24 hours, 4 hours for URGENT (config). Breaches raise alerts and show on the Overview.
- AC5. Canned replies, assign to admin, change priority, merge duplicates (alpha: link only), close with a resolution note.

### M8 · Disputes and chat review

**M8.1 Dispute queue (AD-17).** List by status and age, with booking value, parties, reason, and age against a 3 day target.

**M8.2 Dispute detail (AD-18).**
- AC1. Evidence panel: booking and payment facts, delivery files and timestamps, state timeline, both parties' statements, linked tickets.
- AC2. Conversation review: button "Review conversation" requires a reason and writes `CHAT_VIEWED`. The view is read-only and shows a banner: "You are viewing private messages for dispute <id>. This access is logged."
- AC3. Request evidence: sends an in-app notification and email to a party and moves status to AWAITING_EVIDENCE.
- AC4. Resolution actions (FINANCE or SUPER_ADMIN): RELEASE_TO_TALENT, REFUND_CLIENT, and SPLIT if supported (F11). Each requires a written note and executes through the existing `PaymentProvider` services with an idempotency key. The booking state follows the existing state machine.
- AC5. Four-eyes: resolutions at or above `DISPUTE_FOUR_EYES_THRESHOLD` (config per currency) need a second admin, different from the first, to approve before execution.
- AC6. After resolution, both parties are notified with the outcome and the note.
- AC7. Replaying a resolution request never moves money twice (tested).

### M9 · Verification and compliance

**M9.1 Verification queue (AD-26).**
- AC1. Lists `VerificationRecording` rows by status (UPLOADED, IN_REVIEW) with age and an SLA target of 48 hours.
- AC2. Reviewer plays the video through a short-lived signed URL (audited) beside the guideline checklist (waist-up, face and hands visible, good light, natural gestures, under 90 seconds).
- AC3. Actions: Approve, or Needs re-record with a required reason chosen from templates plus optional text. Both notify the talent.
- AC4. These actions **never write `Creator.verification`**. Identity KYC and the verification recording stay separate (X3).
- AC5. A KYC panel shows `KycCheck` provider status, attempts and failure reason code only.

### M10 · Marketplace health and feature adoption

**M10.1 Marketplace health (AD-24).**
- AC1. Supply: talent by niche, with percentages verified, with rate card, with availability set, with media.
- AC2. Demand: briefs and bookings by niche and by week.
- AC3. Liquidity: briefs with at least one application within 48 hours, applications per brief, time to first application, selection rate, cap-reached rate.
- AC4. Unmet demand: zero-result searches by niche and filter keys (never values), top 20.
- AC5. Availability use: share of active talent with a configured calendar, and booked share of open slots.

**M10.2 Feature adoption (AD-23).**
- AC1. A feature registry in config lists each feature, the events that mean "used", and the eligible audience.
- AC2. For each feature: users eligible, users who used it, first-use rate, repeat use (on 2 or more days), trend by week, by cohort.
- AC3. Included features: storefront publish, rate cards, media upload, media kit (auto versus upload), verification recording, physical attributes (completion rate and visibility mix, aggregates only), availability calendar, Google Calendar connect, project browse and apply, brief with applicant cap, talent search, attribute filters, public link shares, external booking flow, withdrawals, help and tickets.
- AC4. A "feature ranking" view ranks by adoption and repeat rate to guide beta decisions.

### M11 · Alerts, digests and system health

**M11.1 Alerts (AD-27).**
- AC1. Rules are code with thresholds in config. The tick endpoint evaluates them every 5 minutes and upserts `AlertEvent` rows.
- AC2. Severity, owner role, acknowledge, resolve with a note. Critical alerts email the SUPER_ADMIN group and post to an optional Slack or Telegram webhook.
- AC3. Initial rules: payment failure spike (over 20% with at least 5 attempts in 1 hour); webhook missing or failing; booking stuck (see M5.1); withdrawal pending over 24 hours or failed; dispute open over 3 days; ticket SLA breach; verification waiting over 48 hours; auth failure spike; no signups in 24 hours during alpha (info); job backlog (over 100 waiting `AdminJob` rows or oldest over 10 minutes), scheduled job overdue or failed (from `JobRun`); provider error rate over 5% in 15 minutes; API 5xx rate over 2% in 15 minutes; storage or database over 80% of the configured limit.

**M11.2 Daily and weekly digest.**
- AC1. Daily email to selected roles at a configured time: signups, activations, bookings, GMV and revenue per currency, open tickets and disputes, alerts, top 3 insights from the data (computed by code, not AI).
- AC2. Weekly stakeholder summary for VIEWER recipients with week on week change.

**M11.3 System health (AD-28).**
- AC1. Database size and top tables, storage used versus the configured limit (daily R2 bucket snapshot as `KpiDaily` metric `storage_bytes`, plus legacy Supabase Storage if any exists), last run, status, error and next due time of each scheduled job (from `JobRun`), `AdminJob` depth and failures, materialised view freshness, recent webhook outcomes by provider, and API error rate.
- AC2. Links out to Supabase, Vercel, Cloudflare and Sentry for deeper debugging. Every dashboard shows "Data last refreshed N minutes ago".

### M12 · Exports and admin management

**M12.1 Exports (AD-30).** CSV exports of users, bookings, payments, withdrawals, tickets, funnels. Role-gated, PII masked unless the role allows and a reason is given, row cap 50,000, audited.
**M12.2 Admin management (AD-31).** SUPER_ADMIN invites, changes role, disables admins, and sees last login and MFA status (read from the last verified session). Disabling an admin ends their sessions immediately.
**M12.3 Settings (AD-32).** Read-only view of thresholds, SLA targets, four-eyes threshold, feature registry and funnel definitions as loaded from config, with the config version.

---

## 9. Admin API (all under `/api/v1/admin`, all require an admin session)

| Method | Path | Purpose | Min role |
|---|---|---|---|
| GET | `/me` | Current admin, role, permissions | any |
| GET | `/overview` | KPI cards and charts | any |
| GET | `/feed` | Recent events (cursor) | any |
| GET | `/users` | List and search | any |
| GET | `/users/:id` | User 360 payload by tab | any |
| POST | `/users/:id/reveal` | Reveal masked fields (reason) | not VIEWER |
| POST | `/users/:id/notes` | Add internal note | SUPPORT |
| POST | `/users/:id/suspend` | Suspend or unsuspend | OPS |
| POST | `/users/:id/revoke-sessions` | Revoke sessions | OPS |
| POST | `/users/:id/resend-verification` | Resend email | SUPPORT |
| POST | `/users/tags` | Bulk tag | OPS |
| GET | `/acquisition` `/funnels` `/retention` `/traffic` | Analytics pages | any |
| GET | `/features` `/marketplace` | Adoption and health | any |
| GET | `/bookings` `/bookings/:id` | List and detail | any |
| GET | `/payments` `/payments/:id` | List and detail | any (aggregates for VIEWER) |
| POST | `/payments/:id/raw` | Reveal raw webhook (reason) | FINANCE |
| GET | `/withdrawals` `/earnings` | Money views | OPS |
| GET/POST | `/tickets` `/tickets/:id` | Inbox, detail, create | SUPPORT |
| POST | `/tickets/:id/reply` `/assign` `/status` | Ticket actions | SUPPORT |
| GET | `/disputes` `/disputes/:id` | Queue and detail | SUPPORT |
| POST | `/disputes/:id/review-chat` | Open chat review (reason) | SUPPORT |
| POST | `/disputes/:id/request-evidence` | Ask a party | SUPPORT |
| POST | `/disputes/:id/resolve` | Resolve or approve (idempotency key) | FINANCE |
| GET | `/verification` `/verification/:id` | Queue and detail | COMPLIANCE |
| POST | `/verification/:id/decision` | Approve or re-record | COMPLIANCE |
| GET/POST | `/alerts` `/alerts/:id/ack` | Alerts | any, act by role |
| GET | `/system` | System health | OPS |
| GET | `/audit` | Audit log | SUPER_ADMIN, COMPLIANCE |
| POST | `/exports` | Create export | by role |
| GET/POST | `/admins` | Manage admins | SUPER_ADMIN |

Main-app routes added (not under `/admin`): `POST /api/v1/events`, `POST /api/v1/support/tickets`, `POST /api/v1/bookings/:id/disputes`, `POST /api/v1/feedback`.

---

## 10. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | List pages under 1.5 s and dashboards under 3 s at 100 users, and designed to hold at 10,000 users. Cursor pagination everywhere. No unbounded queries |
| Database safety | All admin reads on the read-only role, 5 s statement timeout, row caps, no admin query holds a transaction open |
| Freshness | Live feed within 60 s. KPI cards read from live queries for alpha volume, snapshots feed history and trends |
| Security | Separate origin and session. MFA enforced on the server. Session limits enforced by `AdminSession`. Server-side authorisation. Strict CSP. No secrets in the client bundle. Rate limits on admin routes. Admin allowlist |
| Privacy | PII masking, reveal with reason, no private content in analytics, PRIVATE attributes never shown, chat gated and logged, retention limits, privacy notice and terms updated |
| Accessibility | WCAG 2.2 AA, keyboard use, 44 px touch targets, usable on a phone |
| Auditability | Complete audit trail, append-only |
| Resilience | If analytics tables are empty or a job is late, pages say so plainly and never show wrong zeros |
| Observability | Errors to Sentry with admin context and PII scrubbed (no bodies, emails or names), job run history in `JobRun`, API error events |
| Copy | Direct, specific, no em dashes, same voice rules as the main app |

---

## 11. Changes required in the main app (listed so nothing is hidden)

All additive and covered by regression tests.

1. **Event client in `apps/web`:** consent banner, `track()` wrapper with batching, `page_view` on route change, funnel and feature events from section 7.2.
2. **Server events in `apps/api`:** `track()` calls at auth, upload, booking, payment, webhook, message, withdrawal, application and verification points. `booking_state_changed` emitted from the existing booking state machine with `from` and `to`.
3. **Acquisition capture:** on signup, read UTM parameters from the URL and the first-touch record (if consent), referral code and country header, and write `UserAcquisition`.
4. **Last active:** API middleware updates `User.lastActiveAt` at most once every 5 minutes per user.
5. **Suspension check:** one added condition in the existing auth path that rejects suspended users (`suspendedAt` not null). This touches auth, so it needs the strongest tests and a review.
6. **Support entry points:** "Get help", "Report a problem" on bookings and order rooms, "Open a dispute", and the feedback prompt, reusing the existing Help screen and ticket endpoint from Phase 10.
7. **Terms update:** a versioned clause disclosing that conversations may be reviewed when a dispute or support case is opened, and that anonymous usage analytics run with consent. Counsel to confirm wording.
8. **Test user flag:** a way to mark internal and test accounts so they are excluded from KPIs.
9. **CORS:** the API allows the admin origin alongside the web origin. Admin calls use bearer tokens, not cookies.
10. **Storage seam:** admin reads files through `StorageProvider` (R2). If the main app still writes new uploads to Supabase Storage, the admin storage snapshot reports both until the main build adopts the seam. Admin work does not migrate existing objects.

---

## 12. Infrastructure, deployment and environments

### 12.1 Final decisions

| Area | Decision |
|---|---|
| Frontend hosting | `apps/admin` on Vercel Pro. `apps/web` on Firebase Hosting (hosting only) |
| Backend compute | Existing Node (Fastify) `apps/api` on its current host. Admin is host-agnostic |
| Database | Supabase Pro (Postgres only) |
| Storage and CDN | Cloudflare R2 behind `StorageProvider` |
| Authentication | Supabase Auth through `AuthVerifier`. Clerk switchable, off (F13, D10) |
| Scheduling | Tick endpoint plus Vercel Cron. `pg_cron` for pure SQL |
| Monitoring | Sentry, PII scrubbed |
| CI/CD | GitHub Actions. Production migrations need manual approval |

### 12.2 Admin auth design

```ts
interface AuthVerifier {
  verify(token: string): Promise<{
    subject: string;       // provider user id
    email: string;
    sessionId: string;     // provider session id
    mfaVerified: boolean;  // Supabase: aal === "aal2"
    issuedAt: Date;
  }>;
}
```

Implementations: `SupabaseVerifier` (default), `ClerkVerifier` (off), `MockVerifier` (local and tests), chosen by `ADMIN_AUTH_PROVIDER`.

Rules on every admin request:
1. Verify the token.
2. Find an `AdminUser` with status ACTIVE by `authProvider` and `authSubject` (first sign-in binds by allowlisted email). No match returns 403, "This account does not have access."
3. Every route except `GET /api/v1/admin/me` requires `mfaVerified`, otherwise `needs_mfa_enroll` or `needs_mfa_challenge`.
4. Check the `AdminSession` row for the provider session id. Reject if older than 8 hours or idle more than 30 minutes. Otherwise update `lastSeenAt`.
5. Authorise by `AdminUser.role` and the permission matrix. Roles live only in `AdminUser.role`, never in token claims.

### 12.3 Jobs and scheduling

- `POST /api/v1/cron/admin-tick` requires `Authorization: Bearer CRON_SECRET`. It runs due jobs inside a 50 second budget, using lease locks (`AdminJob.lockedUntil`) so overlapping ticks never double-run. `JobRun` records the outcome of each job.
- `apps/admin` holds a Vercel Cron entry `* * * * *` calling `/api/cron/tick`, which forwards server to server to `API_BASE_URL/api/v1/cron/admin-tick`. Vercel Cron runs on production only, in UTC, with a one minute minimum interval.
- Local and preview: `pnpm admin:tick` runs the same handler.

| Job | When (Africa/Lagos unless stated) | Runs in |
|---|---|---|
| Alert evaluation | every 5 minutes | tick |
| KPI rollup into `KpiDaily` | daily 02:00 | tick (TypeScript KPI service) |
| Storage snapshot | daily 03:00 | tick |
| Daily digest | daily 07:30 | tick |
| Weekly summary | Monday 08:00 | tick |
| Export worker | every tick | tick |
| Materialised view refresh | every 15 minutes | `pg_cron` |
| Retention purge | daily 03:30 UTC | `pg_cron` |

KPI rollup stays in TypeScript, not `pg_cron`, so each KPI definition exists once.

### 12.4 Storage (R2)

- `StorageProvider` has a mock (local disk) and a real implementation (R2 through the S3 API). Everything runs with the mock and zero keys.
- Buckets: `monologg-public` (reels, avatars, portfolio, served on a custom CDN domain) and `monologg-private` (verification recordings, deliverables, admin exports, no public access, signed URLs only).
- Signed URL lifetime: 5 minutes for previews, 24 hours for exports. Exports expire by lifecycle rule after 7 days. CORS limited to the web and admin origins.
- The daily storage snapshot lists both buckets and writes total bytes and object counts to `KpiDaily` metric `storage_bytes`.

### 12.5 Environments, variables, CI and monitoring

- **Environments:** local (mock mode, synthetic data), preview (dev Supabase project only, behind Vercel deployment protection), production.
- **New environment variables:** `ADMIN_DATABASE_URL` (read-only role), `ADMIN_ALLOWED_EMAILS` (bootstrap), `ADMIN_AUTH_PROVIDER`, `CRON_SECRET`, `API_BASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_PUBLIC`, `R2_BUCKET_PRIVATE`, `R2_PUBLIC_BASE_URL`, `SENTRY_DSN_ADMIN`, `SENTRY_DSN_API`, `SUPABASE_*` for admin auth, `ANALYTICS_RETENTION_MONTHS`, `SLACK_ALERT_WEBHOOK` (optional), plus threshold settings. `ADMIN_SESSION_SECRET` is not used. All validated at boot with zod.
- **CI:** GitHub Actions with a Postgres service container so the full suite runs with no cloud credentials. Production migrations run from a separate job that needs manual approval.
- **Sentry:** `beforeSend` strips request bodies, emails and names.
- **Mock mode:** the admin runs with zero real keys. A synthetic data generator creates about 120 users, bookings in every state, payments in several currencies, tickets, disputes, verification items and 30 days of events, so every page can be built and tested before real data exists.
- **Migrations:** additive only, reviewed before production. The read-only role is created by migration.
- **Backups:** Supabase Pro (F1). The admin audit table is included.

### 12.6 Commitments table (corrected)

| Area | Provider | Status | Note |
|---|---|---|---|
| Frontend hosting | Vercel Pro (admin), Firebase Hosting (user app) | Clarified | Firebase is hosting only |
| Backend compute | Current Node host for `apps/api` | Corrected | Supabase cannot run the Fastify, BullMQ and Redis API |
| Database | Supabase Pro | As planned | Backups, no pause |
| Storage and CDN | Cloudflare R2 | Approved | Two buckets, signed URLs for private |
| Authentication | Supabase Auth | Reverses Clerk, awaiting sign-off | Clerk switchable later |
| Monitoring | Sentry | Accepted | PII scrubbing required |
| CI/CD | GitHub Actions | Approved | Manual approval for production migrations |

---

## 13. Test plan (acceptance gates)

**Security and access**
- Anon key cannot read any application table (F2), proven by a test that tries every table.
- Every admin route returns the expected status for every role (matrix test).
- A user token cannot call any admin route. An admin token cannot call user-only routes as that user.
- Read-only role cannot write, and its statement timeout fires.
- Sensitive routes always write an audit row. Audit table rejects update and delete.
- Hidden fields never appear in any admin response (F10, F4, M1.4 AC4), tested with seeded OTP payloads and PRIVATE attributes.
- Suspended user is rejected by the main API and cannot sign in.
- A token without MFA (`aal1`) gets `needs_mfa_challenge` on every admin route except `/me`.
- A session older than 8 hours, or idle more than 30 minutes, is rejected. A disabled admin is rejected even with a valid token.
- Inviting an existing talent or client email is refused. Changing `ADMIN_AUTH_PROVIDER` changes only the verifier.
- The private R2 bucket has no public access. Previews use 5 minute signed URLs.
- A Sentry event containing an email, a name and a request body arrives with all three removed.

**Data and KPIs**
- A seeded dataset with known answers produces exactly the expected value for every KPI in section 4.
- Currencies never mix. A seed with NGN, USD and GBP bookings shows three separate totals.
- Funnel counts equal manual counts on the seed. Retention grid equals manual cohort counts.
- Zero-result search events and feature adoption numbers match the seed.

**Events and privacy**
- Unknown prop keys are dropped. Message text and attribute values never reach `ProductEvent`.
- Anonymous events without consent are not stored. Consent rate is computed correctly.
- A failing sink never breaks a user request.

**Workflows**
- Ticket created from the app appears in the admin inbox. Admin reply reaches the user, internal notes do not.
- Dispute opened from the app creates the dispute and ticket, freezes release, and shows in the queue. Chat review needs a reason and is audited. Resolution executes once even when replayed. Four-eyes blocks a single admin above the threshold.
- Verification decision notifies the talent and never changes `Creator.verification`.
- Alerts fire on seeded conditions and resolve when the condition clears.
- The tick is idempotent: two overlapping ticks run each job once. An expired lease is recovered. A wrong `CRON_SECRET` returns 401. A failing job does not stop the others. A job over budget is deferred to the next tick.

**Performance and quality**
- List queries meet the targets on a 10,000 user synthetic set.
- Accessibility scan has no serious issues. Mobile layout works from 360 px.
- Admin app boots in mock mode with no keys.

---

## 14. Alpha success criteria and beta carry-over

**Alpha success criteria**
- Every signup is visible in the admin within 60 seconds, with source, country and method.
- Every booking has a complete timeline from creation to final state.
- No sensitive admin read occurs without an audit row.
- Median first response to tickets under 24 hours. No dispute open more than 3 days without a status update.
- Money mismatch detectors show zero unexplained rows at the end of each week.
- Stakeholders can answer Q1 to Q20 without help from engineering.

**Carries over to beta unchanged:** the event catalogue and table, KPI definitions, roles and audit, support and dispute workflows, alert rules, and the admin app itself.
**Expected beta changes (configuration or small additions):** partition `ProductEvent` by month, add streaming for the live feed, add inbound email to tickets, add provider reconciliation files, add PostHog sink for replay and heatmaps, and tune thresholds from alpha data.

---

## 15. Open decisions for Maz

| # | Decision | Recommendation |
|---|---|---|
| D1 | Alpha payments mode: TEST or LIVE | Start TEST with a few real-money trial bookings once the finance views are verified. Banner shows the mode either way |
| D2 | Manual review gate on withdrawals during alpha (OTP, then admin approval) | Yes, if any live money. It is cheap insurance for a first cohort. Needs a small change to the P12C flow |
| D3 | First-party analytics only, or add PostHog now | First-party now. Add PostHog later only if you need replay or heatmaps |
| D4 | Admin subdomain and the first admin list with roles | Decide names and emails so A1 can seed them |
| D5 | Where `apps/api` is hosted and how Vercel reaches it | A0 reports it. Admin works on any Node host. Needed for `API_BASE_URL` and CORS |
| D6 | Does the `PaymentProvider` support partial release and refund (SPLIT)? | A0 will check. Build RELEASE and REFUND first |
| D7 | Policy and terms wording for chat review and analytics consent | Counsel to confirm before alpha invites go out |
| D8 | Alpha access control: invite-only allowlist or open sign-up | Invite-only for 100 users keeps cohorts clean. Implement through cohort tags and a sign-up gate |
| D9 | Do you want a manual "flag for follow-up" on users and bookings | Optional. Cheap to add as tags |
| D10 | Sign off the Clerk reversal (F13) | Supabase Auth by default. Say so if you want Clerk instead |
| D11 | Confirm Supabase Pro before alpha (F1) | Yes. Backups and no pause |

---

## Appendix A · Screen registry

| ID | Screen | Module |
|---|---|---|
| AD-01 | Admin sign-in and MFA | M1 |
| AD-02 | Overview | M2 |
| AD-03 | Live feed | M2 |
| AD-04 | Users list | M3 |
| AD-05 | User 360 (tabs) | M3 |
| AD-07 | Bookings list | M5 |
| AD-08 | Booking detail and timeline | M5 |
| AD-09 | Transactions and finance summary | M6 |
| AD-10 | Payment detail and webhook log | M6 |
| AD-11 | Withdrawals | M6 |
| AD-12 | Earnings | M6 |
| AD-15 | Support inbox | M7 |
| AD-16 | Ticket detail | M7 |
| AD-17 | Dispute queue | M8 |
| AD-18 | Dispute detail and chat review | M8 |
| AD-19 | Acquisition | M4 |
| AD-20 | Funnels | M4 |
| AD-21 | Retention | M4 |
| AD-22 | Traffic | M4 |
| AD-23 | Feature adoption | M10 |
| AD-24 | Marketplace health | M10 |
| AD-26 | Verification queue and detail | M9 |
| AD-27 | Alerts | M11 |
| AD-28 | System health | M11 |
| AD-29 | Audit log | M1 |
| AD-30 | Exports | M12 |
| AD-31 | Admin users | M12 |
| AD-32 | Settings | M12 |

## Appendix B · Existing data the admin reads

| Existing table | Admin use | Sensitivity |
|---|---|---|
| User, Creator, Client | Users, User 360, signups | Masked PII |
| AuthEvent | Sign-in history, auth failure alerts | Country only, no raw IP |
| RefreshToken | Session count and revoke only | Never read token hashes |
| MediaAsset, MediaKit, VerificationRecording | Uploads, previews, verification queue | Signed URLs, audited |
| KycCheck | Provider status only | No documents, no PII |
| PhysicalAttributes | Completeness and PUBLIC values | PRIVATE never shown |
| RateCard, AvailabilityBlock, CalendarEvent | Profile mirror, marketplace health | Low |
| Brief, Application | Projects, liquidity | Low |
| Booking, Payment, PaymentEvent | Bookings, finance, webhook log | Raw payload gated |
| OrderRoom, Message | Metadata always, content only in dispute or ticket | High, logged |
| Notification | Sent history | Payload hidden for OTP and sign-in kinds |
| Withdrawal records, WithdrawalOtp | Status only | Never codes or hashes |
| Support tickets, terms acceptance (Phase 10) | Support, consent evidence | Extend, do not duplicate |
