# Monologg — Complete Build & Feature PRD (Consolidated)

**Document type:** Technical implementation PRD (agent-executable)
**Audience:** Google Antigravity (or any coding agent) + the human reviewing its work
**Starting point:** A UI-complete front-end prototype. Every screen renders; all data is mock constants; there is no server, database, auth, or real integration.
**Goal:** Turn the prototype into a working, secure, production-ready full-stack application — including the newly requested features — without regressing the existing UI.
**Supersedes & consolidates:** the backend build-out PRD *and* the feature-additions PRD. This is the single source of truth. Nothing from either is dropped.
**Companion files (keep in repo root):** `design.md` (design system + tokens), `prd.md` (original product requirements), this file, and the consolidated prompt pack.

---

## 0. How to use this document

This PRD is ordered by **dependency**, not priority — each phase unblocks the next. Do not skip ahead: auth depends on the database, which depends on the backend scaffold, which depends on the repo being initialised. The new feature work (availability, applications, public booking) sits *after* the core infrastructure it relies on.

Each work item follows the same shape:
- **Goal** — what "done" means
- **Why now** — the dependency reason it sits here
- **Spec** — the technical detail to implement
- **Acceptance** — how the agent (and reviewer) confirm it works
- **Tests (gate)** — the tests that must exist and pass *before the phase is considered done*
- **Guardrails** — what must not break or leak

The agent completes one phase, **writes and passes that phase's tests**, runs its acceptance checks, commits, and **stops for review** before the next. Do not build all phases in one pass.

### Testing is continuous, not back-loaded (global rule)

Tests are written **with each phase, as an acceptance gate** — not swept up at the end. A phase is not "done" until its tests exist and pass in CI. This is deliberate: writing tests twelve phases after a bug is introduced means it surfaces far from its cause, which is the most expensive way to find it. The rules:

- **Every phase ships its own tests.** Each phase's **Tests (gate)** block lists the minimum suite. CI runs the full accumulated suite on every phase, so later phases can't silently break earlier ones (regression protection).
- **Money, auth, availability, cap, and escrow-state code carry the strongest coverage** — these are the paths where a bug costs real money or leaks data. They get unit + integration + concurrency/race tests, not just happy-path.
- **All tests run in all-mock mode** with zero real API keys, so the whole suite is runnable by the agent and in CI without provisioning anything.
- **Phase 12** (hardening) and **Phase 17-QA** (the new dedicated QA/security/UAT phase) are *consolidation and independent verification* passes — they raise coverage, add cross-cutting tests, and bring in QA that isn't just the builder checking their own work. They do **not** replace per-phase testing; they backstop it.
- **Definition of done for any phase includes green CI** — typecheck, lint, and the accumulated test suite.

**Two big parts, one sequence:**
- **Phases 0–12 — Infrastructure & core build-out:** repo, monorepo, database, backend scaffold, **authentication**, core endpoints, **payments/escrow**, KYC + AI tagging, calendar, notifications, system screens, design-token/font cleanup, hardening.
- **Phases 13–16 — New feature areas:** rich availability calendar, two-sided project applications, public marketplace profile, and the external-visitor booking flow with deferred account creation. These build *on top of* the infrastructure above.

---

## 1. ⚠️ Conflict corrections — read before building

Three items in the backlog and original PRD contradict the Monologg source documents. This PRD uses the **source-of-truth** values and flags each so a human can override. Do not hardcode the stale values.

| # | Backlog / old PRD says | Source-of-truth (this PRD uses) | Action |
|---|---|---|---|
| X1 | Payment/escrow via **FINCRA** | **Paystack** (Africa) + **Stripe** & **Airwallex** (rest of world) | Build a provider-agnostic `PaymentProvider` interface; implement Paystack first. Never hardcode "FINCRA". `// TODO(conflict:X1)` at the config site. |
| X2 | Fees **9% talent / 12% client** | **11% talent / 15% client** | Fees are **config constants**, never inline literals. Single `PLATFORM_FEES` object. `// TODO(conflict:X2)` |
| X3 | "Thespian AI" as quasi-KYC | Style/vibe **tagging only**; identity KYC is **separate** (Smile Identity) | Model two independent concepts: `styleTags` (AI) and `verification` (identity KYC). Never conflate in schema, API, or UI copy. `// TODO(conflict:X3)` |

If the human confirms any stale value is actually correct, it's a one-line change because everything money- and provider-related is config-driven by design.

**Two feature-level confirmations** (from the new phases, surfaced here too):
- **X4 — Applicant cap behaviour (Phase 14):** this PRD hard-closes applications first-come when the cap is reached, then the client selects manually from the pool. Confirm vs a soft warning that never closes.
- **X5 — Slot-hold timeout (Phase 16):** abandoned external checkouts release the held slot after a configurable window (default 30 min). Confirm the window.

---
## 2. Target architecture

The prototype is a client-only app. The target is a conventional, boring-on-purpose full-stack architecture — chosen for agent-friendliness and hireability, not novelty.

```
┌─────────────────────────────────────────────────────────┐
│  CLIENT (existing prototype — preserve UI)               │
│  React + Vite + TypeScript · design tokens · React Router│
│  Talks ONLY to /api via a typed api-client layer         │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTPS / JSON
┌───────────────────────────▼─────────────────────────────┐
│  API (new)  Node + TypeScript + Fastify (or Express)     │
│  ├─ auth        JWT access + refresh, bcrypt/argon2       │
│  ├─ routes      REST, versioned /api/v1                   │
│  ├─ services    business logic (fees, escrow state)       │
│  ├─ providers   PaymentProvider · KycProvider · CalProvider│
│  │              · AiTaggingProvider · NotifyProvider      │
│  ├─ db          Prisma ORM                                │
│  └─ jobs        queue for webhooks, async tasks           │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  DATA   PostgreSQL (Prisma-managed migrations)           │
│  Redis (sessions/refresh-token denylist, job queue)      │
└──────────────────────────────────────────────────────────┘

External (behind provider interfaces, all swappable, all mockable):
  Paystack / Stripe / Airwallex · Smile Identity · Google Calendar
  · AI tagging service · SendGrid (email) · Twilio (SMS)
```

**Stack decisions (do not substitute without asking the human):**
- **API:** Node 20 LTS + TypeScript (strict) + Fastify. Rationale: shares the language/types with the React client, huge hiring pool, first-class Prisma support.
- **ORM/DB:** Prisma + PostgreSQL. Type-safe, migration-driven, agent-legible schema.
- **Auth:** JWT (short-lived access + rotating refresh), argon2id password hashing. Redis-backed refresh-token denylist.
- **Validation:** zod on every request boundary; share zod schemas with the client where possible.
- **Jobs/queue:** BullMQ on Redis for webhooks and async work (payouts, notifications).
- **Monorepo:** keep client and api in one repo with a shared `packages/types` for DTOs. Use npm/pnpm workspaces.
- **Config:** all secrets via environment variables, validated at boot with zod; never committed. Provide `.env.example`.

**The provider pattern is the spine of this whole build.** Every external dependency (payments, KYC, calendar, AI tagging, notifications) is defined as a TypeScript interface with (a) a real implementation and (b) a mock implementation. Local dev and tests use mocks; production uses real. This is what lets the agent build and verify the entire system without any real API keys, and it's what makes the FINCRA-vs-Paystack question a config change rather than a rewrite.

---

## 3. Build sequence (phases) — infrastructure + features, one order

| Phase | Item | Unblocks |
|---|---|---|
| **0** | Repo init + tooling + CI | everything |
| **1** | Monorepo restructure + shared types + api-client seam | all client↔server work |
| **2** | Database schema + Prisma + seed | auth, all data |
| **3** | Backend scaffold + config + provider interfaces (all mocked) | all endpoints |
| **4** | **Real authentication + protected routes** | all user-scoped data |
| **5** | Core domain endpoints (profiles, rate cards, bookings, briefs) | payments, calendar, features |
| **6** | Payment / escrow integration (Paystack-first) | booking completion, external flow |
| **7** | KYC (Smile Identity) + AI style-tagging — kept separate | verified badge, discovery |
| **8** | Calendar sync (Google) — provider layer | rich availability (Phase 13) |
| **9** | Notifications backend (email/SMS/in-app) | all user comms, applications |
| **10** | System screens (transactions, help, terms, support) | PRD completeness |
| **11** | Design-token adoption + font self-hosting | design consistency, offline |
| **12** | Hardening: security, tests, observability, deploy | production baseline |
| **12A** | **NEW · Storefront extensions: media kit + verification guidelines + physical attributes (FA-6)** | applications, public profile, casting search |
| **13** | **NEW · Rich availability calendar & time-slot booking (FA-1)** | slot-aware booking, external flow |
| **14** | **NEW · Project applications, two-sided + applicant cap (FA-2, FA-4)** | talent/client project workflow |
| **15** | **NEW · Public marketplace profile / shareable link (FA-3)** | external booking entry |
| **16** | **NEW · External-visitor booking + deferred account + escrow-first (FA-5)** | anonymous→client conversion |
| **17** | **QA, security & UAT (production gate)** | production cutover |

**Why the features come after core:** availability (13) needs the calendar provider (8) and booking endpoints (5); applications (14) need notifications (9), briefs (5), and auth (4); the public profile (15) needs the storefront and discovery (5); and the external flow (16) is the most dependent of all — it needs auth (4), payments/escrow (6), availability (13), and the public profile (15) all in place first. Building features before this foundation would mean building on mocks that don't exist yet.

Each phase below is specified in full. Phases 0–12 are the infrastructure spine; 13–16 are the new features integrated into the same review cadence.

---
## Phase 0 — Repository initialisation & tooling

**Goal:** The folder becomes a version-controlled, CI-backed repo with consistent tooling.
**Why now:** Nothing else should be built on an untracked folder; the first real bug or bad agent edit is unrecoverable without git.

**Spec**
1. `git init`; create `.gitignore` (node_modules, dist, `.env`, `.env.*` except `.env.example`, coverage, `.DS_Store`, Prisma `*.db`).
2. Make an initial commit of the *current* prototype **before any changes**, so there's a known-good baseline.
3. Adopt tooling at repo root: TypeScript (strict), ESLint, Prettier, EditorConfig. Add `lint`, `format`, `typecheck` scripts.
4. Add CI (GitHub Actions): on push/PR run install → typecheck → lint → test → build. Block merge on failure.
5. Add `commitlint` + conventional commits (optional but recommended for agent-generated history legibility).
6. Add a `CONTRIBUTING.md` and a `README.md` with run instructions (updated each phase).

**Acceptance**
- `git log` shows the baseline commit of the untouched prototype, then tooling commits.
- CI passes green on a trivial PR.
- `npm run typecheck && npm run lint` pass.

**Tests (gate)**
- CI pipeline itself is verified: a trivial PR runs typecheck → lint → test → build and blocks on any failure.
- A placeholder test asserts the test runner is wired and green.

**Guardrails**
- The baseline prototype commit must be pushed before any refactor, so the UI can always be diffed/restored.
- No secrets in the initial commit. Scan before committing.

---

## Phase 1 — Monorepo restructure, shared types, and the API-client seam

**Goal:** Split into `apps/web` (existing client) and `apps/api` (new) with a shared `packages/types`, and route **all** client data access through a single typed api-client module.
**Why now:** Establishes the contract boundary. Every later phase swaps a mock for a real endpoint behind this seam without touching components.

**Spec**
1. Convert to workspaces (pnpm or npm):
   ```
   apps/web/     ← existing prototype, moved wholesale, still runs
   apps/api/     ← new, empty scaffold for now
   packages/types/ ← shared DTOs + zod schemas (source of truth for shapes)
   ```
2. Create `apps/web/src/lib/api-client.ts`: a single typed module exposing every data operation the UI needs (`getProfile`, `listTalent`, `createBooking`, …). For now each function returns the **existing mock constants**, but from this one place.
3. Replace every in-component mock-data import with a call to `api-client`. The UI must look and behave identically — this is a pure refactor.
4. Define an env flag `VITE_API_MODE = mock | live`. In `mock` mode the api-client returns local fixtures; in `live` mode it fetches `/api/v1/...`. Default `mock` until Phase 5 endpoints exist.
5. Move mock constants into `apps/web/src/mocks/` as typed fixtures conforming to `packages/types`.

**Acceptance**
- App runs and is visually/behaviourally identical to the baseline (diff screenshots per key screen).
- No component imports mock data directly; all go through `api-client`.
- Flipping `VITE_API_MODE` changes only the data source, not the UI.

**Tests (gate)**
- Snapshot/DOM tests (or screenshot diffs) on key screens prove the api-client refactor is visually and behaviourally identical to the Phase-0 baseline.
- A test asserts no component imports mock data directly (grep-based or lint rule) — all data goes through `api-client`.
- Flipping `VITE_API_MODE` is covered: mock mode returns fixtures, live mode targets `/api/v1` (mocked transport).

**Guardrails**
- Zero UI regressions. This phase adds a seam; it does not restyle anything.
- Types in `packages/types` are the single source of truth — the API and client both import them.

---

## Phase 2 — Database schema, Prisma, migrations, seed

**Goal:** A real relational schema replacing mock constants, with migrations and a seed script that reproduces the prototype's demo data.
**Why now:** Auth and every endpoint need tables to read/write.

**Spec — core entities** (translate the prototype's mock shapes; corrects X1–X3):

```prisma
// Users & identity
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  userType      UserType // TALENT | CLIENT
  emailVerified Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  creator       Creator?
  client        Client?
  refreshTokens RefreshToken[]
  notifications Notification[]
}
enum UserType { TALENT CLIENT }

model Creator {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name          String
  niche         Niche
  bio           String?
  location      String
  styleTags     String[] // X3: AI-generated vibe tags — NOT identity
  verification  VerificationState @default(UNVERIFIED) // X3: identity KYC, separate
  celebrityBadge Boolean @default(false) // referral-earned, distinct from KYC
  referralCode  String   @unique
  media         MediaAsset[]
  rateCards     RateCard[]
  availability  AvailabilityBlock[]
  bookings      Booking[] @relation("CreatorBookings")
}
enum Niche { ACTOR VO_ARTIST COMEDIAN COMPERE SPEAKER_PASTOR MUSICIAN CONTENT_CREATOR }
enum VerificationState { UNVERIFIED PROCESSING VERIFIED FAILED }

model Client {
  id       String @id @default(cuid())
  userId   String @unique
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  name     String
  orgName  String?
  orgType  OrgType?
  location String
  briefs   Brief[]
  bookings Booking[] @relation("ClientBookings")
}
enum OrgType { STUDIO EVENT BRAND CHURCH }

model MediaAsset {
  id         String    @id @default(cuid())
  creatorId  String
  creator    Creator   @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  kind       MediaKind // VIDEO | AUDIO
  url        String
  sizeBytes  Int
  durationSec Int?
  createdAt  DateTime  @default(now())
}
enum MediaKind { VIDEO AUDIO }

model RateCard {
  id              String  @id @default(cuid())
  creatorId       String
  creator         Creator @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  serviceTitle    String
  basePriceAmount Int      // minor units (kobo/cents)
  basePriceCurrency String // NGN, USD, GBP…
  deliveryTimeline String
}

model AvailabilityBlock {
  id        String  @id @default(cuid())
  creatorId String
  creator   Creator @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  date      DateTime
  slots     Json    // [{start,end,booked}]
  calendarEventId String? // Google Calendar linkage
}

model Brief {
  id            String   @id @default(cuid())
  clientId      String
  client        Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  projectName   String
  projectType   String
  nicheReq      Niche[]
  budgetAmount  Int
  budgetCurrency String
  createdAt     DateTime @default(now())
}

model Booking {
  id             String   @id @default(cuid())
  creatorId      String
  creator        Creator  @relation("CreatorBookings", fields: [creatorId], references: [id])
  clientId       String
  client         Client   @relation("ClientBookings", fields: [clientId], references: [id])
  rateCardId     String
  engagementType EngagementType @default(ONE_OFF) // ONE_OFF | RETAINER
  slotDate       DateTime
  slotStart      String
  slotEnd        String
  recurrence     String?  // when RETAINER
  baseAmount     Int
  currency       String
  talentFeeAmount Int     // computed from PLATFORM_FEES at creation, stored for audit
  clientFeeAmount Int
  state          BookingState @default(PENDING_PAYMENT)
  meetUrl        String?  // Google Meet live call
  payment        Payment?
  orderRoom      OrderRoom?
  createdAt      DateTime @default(now())
}
enum EngagementType { ONE_OFF RETAINER }
enum BookingState { PENDING_PAYMENT ESCROW_LOCKED DELIVERABLES_PROVIDED PAYMENT_RELEASED CANCELLED DISPUTED }

model Payment {
  id            String   @id @default(cuid())
  bookingId     String   @unique
  booking       Booking  @relation(fields: [bookingId], references: [id])
  provider      String   // "paystack" | "stripe" | "airwallex" — X1, never "fincra"
  providerRef   String?  // provider transaction/charge id
  status        PaymentStatus @default(INITIATED)
  escrowHeld    Boolean  @default(false)
  amount        Int
  currency      String
  events        PaymentEvent[] // webhook audit trail
  createdAt     DateTime @default(now())
}
enum PaymentStatus { INITIATED AUTHORIZED ESCROW_HELD RELEASED REFUNDED FAILED }

model PaymentEvent {
  id         String   @id @default(cuid())
  paymentId  String
  payment    Payment  @relation(fields: [paymentId], references: [id])
  type       String   // provider event name
  raw        Json     // full webhook payload for audit/idempotency
  createdAt  DateTime @default(now())
}

model OrderRoom {
  id         String    @id @default(cuid())
  bookingId  String    @unique
  booking    Booking   @relation(fields: [bookingId], references: [id])
  messages   Message[]
}
model Message {
  id          String    @id @default(cuid())
  orderRoomId String
  orderRoom   OrderRoom @relation(fields: [orderRoomId], references: [id], onDelete: Cascade)
  senderId    String
  kind        MessageKind // TEXT | VOICE | DOCUMENT | CALL | SYSTEM
  content     String
  createdAt   DateTime  @default(now())
}
enum MessageKind { TEXT VOICE DOCUMENT CALL SYSTEM }

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String   // store a hash, never the raw token
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime @default(now())
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  kind      String
  payload   Json
  readAt    DateTime?
  createdAt DateTime @default(now())
}

model KycCheck {
  id         String @id @default(cuid())
  creatorId  String
  provider   String  // "smile_identity"
  providerRef String?
  status     VerificationState
  raw        Json?
  createdAt  DateTime @default(now())
}
```

**Money rule:** store all money as **integer minor units** + a currency code. Never floats. `computeFees()` (Phase 3) is the only place that derives fee amounts, and it reads `PLATFORM_FEES`.

**Spec — migrations & seed**
1. `prisma migrate dev` to generate the initial migration.
2. Write `prisma/seed.ts` that reproduces the prototype's demo profiles, rate cards, and one sample booking in each `BookingState`, so the UI has realistic data in `live` mode.
3. Seed must be idempotent (safe to re-run).

**Acceptance**
- `prisma migrate dev` applies cleanly; `prisma studio` shows the tables.
- Seed produces data that renders identically to the mock fixtures.
- No monetary field is a float anywhere.

**Tests (gate)**
- Migration applies cleanly on a fresh test DB in CI; `prisma migrate reset` + seed is idempotent (re-runnable).
- A schema test asserts every monetary field is an integer type (no floats) and `styleTags`/`verification` are separate columns.
- A test asserts the payment `provider` allowlist rejects `"fincra"`.
- Seed-parity test: seeded records deserialize to the same shapes the mock fixtures used.

**Guardrails**
- `styleTags` and `verification` are separate columns (X3).
- Fee amounts are stored on the booking for audit but always *derived* from `PLATFORM_FEES` at write time (X2).
- `provider` free-text is validated against an allowlist that does **not** include "fincra" (X1).

---

## Phase 3 — Backend scaffold, config, and provider interfaces (all mocked)

**Goal:** A running API server with validated config, health check, error handling, and every external dependency defined as an interface with a **mock implementation**.
**Why now:** Endpoints (Phase 5+) need the server, config, and provider seams in place. Mocks let everything be built and tested with zero real keys.

**Spec**
1. Fastify app in `apps/api/src`: `app.ts` (server), `routes/`, `services/`, `providers/`, `db/` (Prisma client), `config/`, `jobs/`.
2. `config/env.ts`: load + **validate all env vars with zod at boot**; fail fast with a clear message if any required var is missing. Provide `.env.example` listing every var (no values).
3. `config/platformFees.ts`:
   ```ts
   export const PLATFORM_FEES = { talentPct: 0.11, clientPct: 0.15 } // TODO(conflict:X2) confirm
   ```
4. `config/paymentRails.ts`: region → provider map (`NG→paystack`, default→`stripe`, some regions→`airwallex`). No "fincra". `// TODO(conflict:X1)`.
5. Define provider interfaces in `providers/`, each with `*.real.ts` and `*.mock.ts`:
   - `PaymentProvider` — `initEscrow(booking)`, `holdFunds(ref)`, `releaseFunds(ref)`, `refund(ref)`, `verifyWebhook(sig,body)`
   - `KycProvider` — `startCheck(creator)`, `getStatus(ref)` (Smile Identity)
   - `AiTaggingProvider` — `tagMedia(asset) → styleTags[]` (X3: tagging only)
   - `CalendarProvider` — `connect(userId)`, `pushAvailability(block)`, `createMeet(booking)`
   - `NotifyProvider` — `email(to,template,data)`, `sms(to,msg)`, `inApp(userId,payload)`
   A `providers/index.ts` picks real vs mock per `NODE_ENV` / per-provider env flag.
6. Cross-cutting: request logging (pino), centralised error handler (never leak stack traces in prod), zod validation middleware, CORS locked to the web origin, `helmet` headers, rate limiting.
7. `GET /api/v1/health` returns `{ok:true, db:'up'}` after checking a DB round-trip.
8. `services/fees.ts`: `computeFees(base, PLATFORM_FEES)` → `{talentFee, clientFee, talentNet, clientTotal}`. Unit-tested; asserts it reads config not literals.

**Acceptance**
- `npm run dev:api` boots; `/health` returns ok with DB up.
- Missing an env var fails boot with a precise message.
- Every provider resolves to its mock under test; `computeFees` unit tests pass with both default and overridden percentages.

**Tests (gate)**
- `computeFees()` unit-tested with the default 11%/15% AND an overridden config, asserting it reads `PLATFORM_FEES` (not literals) and returns correct minor-unit splits.
- Boot test: missing a required env var fails fast with a clear message; present config boots.
- `/health` returns ok with DB up; DB-down path returns the correct error shape.
- Every provider resolves to its **mock** under `NODE_ENV=test`; a test asserts no real provider is constructed in test.

**Guardrails**
- No real API keys required to run or test. Mocks are the default in dev/test.
- Errors are logged server-side but responses are sanitised.

---

## Phase 4 — Real authentication & protected routes

**Goal:** Replace the fake login with real registration, login, JWT sessions, refresh rotation, email verification, and route protection.
**Why now:** Every user-scoped resource (profiles, bookings, payments) must be access-controlled before it holds real data.

**Spec**
1. Endpoints (`/api/v1/auth`): `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`, `POST /verify-email`, `POST /forgot-password`, `POST /reset-password`.
2. Passwords hashed with **argon2id** (fallback bcrypt cost ≥12). Never store or log raw passwords.
3. **JWT:** short-lived access token (~15 min) in memory/Authorization header; long-lived **refresh token** (~30 days) rotated on every use, stored **hashed** in `RefreshToken`, revocable via Redis denylist + DB `revokedAt`. On refresh reuse-detection, revoke the whole token family (theft response).
4. Registration sets `userType` (TALENT|CLIENT), creates the matching `Creator`/`Client` row, sends a verification email (via `NotifyProvider`; mock logs it in dev).
5. **Auth middleware:** `requireAuth` (valid access token), `requireRole('TALENT'|'CLIENT')`, and `requireOwner` (the user owns the resource). Apply to every non-public route.
6. Client: `api-client` attaches the access token, transparently refreshes on 401, and routes protected pages through an auth guard. The existing login UI is wired to real endpoints (no visual change).
7. zod-validate every auth payload; generic error messages ("invalid credentials") to avoid user enumeration; rate-limit login and forgot-password.

**Acceptance**
- Register → verify → login → access a protected route → refresh → logout all work end-to-end.
- A protected endpoint returns 401 without a token, 403 for the wrong role/owner.
- Refresh-token reuse is detected and revokes the family.
- No password or raw token appears in logs or responses.

**Tests (gate)** — *high-coverage path*
- Unit: argon2id hash/verify; access+refresh token issue/verify; refresh rotation.
- **Security tests:** refresh-token **reuse detection revokes the whole family**; expired/invalid tokens rejected; passwords and raw tokens never appear in logs or responses.
- Integration: full register → verify-email → login → hit protected route → refresh → logout.
- Authz matrix: protected route returns 401 without a token, 403 for wrong role, 403 for non-owner.
- Rate-limit tests on login and forgot-password; generic-error test (no user enumeration).

**Guardrails**
- Access control is enforced **server-side** on every route — never trust the client.
- Tokens signed with a secret from validated env; rotate-able.

---

## Phase 5 — Core domain endpoints

**Goal:** Real CRUD for profiles, media, rate cards, availability, briefs, bookings, order rooms — replacing the corresponding mocks behind the api-client seam.
**Why now:** Payments, KYC, calendar all operate on these resources.

**Spec**
1. Versioned REST under `/api/v1`, resource-oriented:
   - `creators` (profile, media upload, style tags read-only, verification read-only)
   - `rate-cards` (CRUD, owner-scoped)
   - `availability` (CRUD, owner-scoped)
   - `briefs` (client CRUD)
   - `talent` (public discovery: search/filter by niche, style tags, price, location — paginated)
   - `bookings` (create → computes fees from config, sets `PENDING_PAYMENT`; state transitions guarded)
   - `order-rooms` + `messages` (participants only)
2. **Media upload:** presigned-URL flow to object storage (S3-compatible; mock = local disk in dev). Enforce type (video/audio) and size (≤150 MB). Never accept raw file bytes through the API JSON body.
3. Every list endpoint paginates and is authz-filtered (a user sees only what they may).
4. Booking state machine lives in `services/booking.ts`; illegal transitions rejected (e.g. can't go `PENDING_PAYMENT → PAYMENT_RELEASED` directly).
5. Flip `VITE_API_MODE=live` for the screens covered; verify parity with the mock UI.

**Acceptance**
- Each screen that used a mock now reads/writes real data with no visual change.
- Discovery search returns correctly filtered, paginated results.
- Owner-scoping verified: user A cannot read/modify user B's rate cards, bookings, or messages.
- Booking creation persists fee amounts derived from `PLATFORM_FEES`.

**Tests (gate)**
- Integration tests for each resource (creators, rate-cards, availability, briefs, talent discovery, bookings, order-rooms) against a test DB with mocked providers.
- **Owner-scoping tests:** user A cannot read or mutate user B's rate cards, bookings, or messages (403).
- Booking-creation test asserts persisted fee amounts equal `computeFees()` output from config.
- **State-machine tests:** illegal booking transitions are rejected (e.g. PENDING_PAYMENT → PAYMENT_RELEASED direct).
- Pagination + discovery-filter tests return correctly scoped, filtered results.
- Media-upload test enforces type (video/audio) and ≤150 MB.

**Guardrails**
- Authorization on every record access (`requireOwner`/participant checks).
- Fees never recomputed on the client; the server is authoritative.

---

## Phase 6 — Payment & escrow integration (Paystack-first)

**Goal:** Replace the fake 2.5 s delay with real escrow-style payment via the `PaymentProvider`, Paystack implemented first, behind the region-router.
**Why now:** Booking completion and payouts depend on it; everything upstream (bookings, fees) is now real.

**Spec**
1. Implement `PaymentProvider.real` for **Paystack** first (Africa/NGN). Stub Stripe & Airwallex behind the same interface for later regions (`// TODO(conflict:X1)`), selected by `paymentRails.ts`.
2. **Escrow model:** true escrow may require a provider sub-account/split or a manual hold ledger. For beta, implement a **ledger-based hold**: on checkout, charge the client's total (`base + clientFee`), record `Payment.status=ESCROW_HELD`, and do **not** pay out the creator until release. Document this clearly — it's a custodial hold, with compliance implications the human must sign off.
3. **Checkout flow:** `POST /bookings/:id/pay` → provider `initEscrow` → client completes payment on provider UI/SDK → provider **webhook** confirms → server sets `ESCROW_LOCKED`. Never trust a client-side "success" callback; the webhook is the source of truth.
4. **Webhooks:** `POST /api/v1/webhooks/paystack` — verify signature, be **idempotent** (dedupe on event id via `PaymentEvent.raw`), update state inside a DB transaction, enqueue notifications. Reject unverified signatures.
5. **Release:** when booking reaches `DELIVERABLES_PROVIDED` and the client approves, `releaseFunds` pays the creator their `base` (minus the 11% talent fee already accounted), sets `PAYMENT_RELEASED`. Refund path for disputes.
6. Fee math: client pays `base + 15%`; creator receives `base − 11%`; platform keeps both fees. All from `PLATFORM_FEES` (X2). Show the breakdown to each side in the UI.
7. Idempotency keys on all money-moving calls; retries safe.

**Acceptance**
- End-to-end in Paystack **test mode**: checkout → webhook → `ESCROW_LOCKED` → deliver → approve → `PAYMENT_RELEASED`, with correct fee splits.
- Replaying a webhook does not double-process (idempotent).
- A tampered/unsigned webhook is rejected.
- No "FINCRA" string anywhere; provider selected by region config.

**Tests (gate)** — *highest-coverage path, money*
- Unit: escrow-hold ledger math; fee splits (client base+15%, creator base−11%) from config.
- **Idempotency:** replaying the same webhook event id does **not** double-process (dedupe on `PaymentEvent`).
- **Signature:** an unsigned/tampered webhook is rejected.
- **Authority:** a client-side "success" callback alone never advances state; only a verified webhook sets `ESCROW_LOCKED`.
- **Concurrency:** two simultaneous webhooks / release calls don't double-pay (transactional + idempotency-key tests).
- Integration e2e in Paystack **test mode**: checkout → webhook → ESCROW_LOCKED → deliver → approve → PAYMENT_RELEASED with correct splits; refund path.
- Grep test: no `"fincra"` string anywhere in source.

**Guardrails**
- Webhook is the only authority for payment state; client callbacks are advisory.
- All money moves are idempotent and wrapped in DB transactions.
- Custodial-hold approach flagged for human/legal sign-off before real funds.

---

## Phase 7 — KYC (Smile Identity) & AI style-tagging — separate systems

**Goal:** Real identity verification (the Verified badge) via `KycProvider`, and real style/vibe tagging via `AiTaggingProvider` — implemented as **two independent flows** (X3).
**Why now:** Discovery and the verified badge need real signals; both operate on Phase 5 creator/media data.

**Spec**
1. **KYC (identity):** `POST /creators/me/verify` → `KycProvider.startCheck` (Smile Identity) → set `verification=PROCESSING` → provider webhook/poll → `VERIFIED|FAILED`. The Verified badge reflects **only** this. Store attempts in `KycCheck`.
2. **AI tagging (vibe):** on media upload, enqueue a job → `AiTaggingProvider.tagMedia` returns `styleTags` (e.g. "warm", "dramatic", "high-energy") → write to `Creator.styleTags`. This is **not** verification and must never gate the badge. Replace the scripted "Thespian AI" animation with a real async job whose UI reflects real job state (queued → tagging → done).
3. Both providers have mocks: mock KYC returns `VERIFIED` after a short delay; mock tagging returns deterministic tags. The UI's processing states bind to real job/check status, not a fixed timer.
4. Copy audit: ensure no screen or string implies the AI performs identity verification (X3).

**Acceptance**
- A creator can complete real (test-mode) KYC and receive the Verified badge; a failed check shows `FAILED` and a retry path.
- Uploading media produces real style tags via the job, independent of KYC.
- Badge never appears from tagging alone; tags never appear from KYC alone.

**Tests (gate)**
- KYC flow: start → PROCESSING → VERIFIED (mock) sets the badge; FAILED path offers retry.
- **Separation tests (X3):** the Verified badge is set **only** by a KYC result; `styleTags` are set **only** by the tagging job; a KYC pass never writes tags and a tagging run never sets the badge.
- Tagging job test: media upload enqueues a job whose real state (queued→tagging→done) drives the UI, not a fixed timer.
- Copy audit test/assertion: no string implies the AI performs identity verification.

**Guardrails**
- `verification` and `styleTags` are never coupled in code or copy.
- KYC PII handled per NDPA: encrypted at rest, access-logged, minimal retention.

---

## Phase 8 — Calendar sync (Google)

**Goal:** Make the Google Calendar "sync" real via `CalendarProvider`, and generate real Google Meet links for order-room calls.
**Why now:** Availability and bookings (Phase 5) exist; live-call links (Phase 5 order room) need real Meet URLs.

**Spec**
1. Google OAuth 2.0 connect flow per user (store refresh token encrypted). Scopes limited to calendar + Meet creation.
2. `pushAvailability` writes/reads busy blocks so `AvailabilityBlock` reflects the real calendar; two-way sync where feasible, one-way (Monologg→Google) at minimum.
3. `createMeet(booking)` generates a real Meet link stored on `Booking.meetUrl`, surfaced in the order room's call button.
4. Mock provider returns fake but well-formed events/links for dev/test.
5. Handle token expiry/refresh and revoked access gracefully.

**Acceptance**
- Connecting a Google account reflects real busy times in availability.
- Booking generates a working Meet link shown in the order room.
- Revoking access degrades gracefully with a reconnect prompt.

**Tests (gate)**
- OAuth connect stores an **encrypted** refresh token (test asserts it's not plaintext and never logged).
- `pushAvailability` reflects provider busy times; `createMeet` returns a well-formed link stored on the booking (mock provider).
- Token-expiry/refresh and revoked-access paths degrade gracefully (reconnect prompt), covered by tests.

**Guardrails**
- OAuth tokens encrypted at rest; never logged. Minimal scopes.

---

## Phase 9 — Notifications backend

**Goal:** Replace the hardcoded notification panel with a real notification system across in-app, email, and SMS via `NotifyProvider`.
**Why now:** Bookings, payments, KYC, and calendar all need to notify users; the panel UI already exists.

**Spec**
1. Domain events (booking created, escrow locked, deliverables provided, payment released, KYC result, new message, missed check-in) publish notifications through `NotifyProvider`.
2. In-app: persist to `Notification`; expose `GET /notifications` (paginated, unread count) and `POST /notifications/:id/read`. The existing panel binds to this.
3. Email via SendGrid, SMS via Twilio (both mockable; dev logs them). Templated, localisable.
4. Delivery is async via the job queue; failures retry with backoff; user notification preferences respected.

**Acceptance**
- A real booking event produces an in-app notification (and email/SMS in relevant cases).
- The panel shows real, per-user, time-ordered notifications with unread counts.
- Failed sends retry and are observable.

**Tests (gate)**
- A domain event (e.g. escrow locked) produces an in-app `Notification` and, where relevant, enqueues email/SMS (mock providers).
- **User-scoping:** notifications never leak across accounts (a user only reads their own).
- Unread-count + mark-read endpoints tested; failed sends retry with backoff (job-queue test).

**Guardrails**
- Notifications are user-scoped; no leakage across accounts.
- Respect preferences and unsubscribe where legally required.

---

## Phase 10 — System screens (PRD SYS-01–04)

**Goal:** Build the unbuilt/partial system screens: transaction history, help & support, terms/privacy, notification centre (if not fully covered in Phase 9).
**Why now:** They depend on real payment, notification, and user data now available.

**Spec**
1. **Transaction history:** `GET /transactions` — a user's payments/payouts with state, amounts, fee breakdown, provider ref; paginated, filterable. Wire the screen.
2. **Help & support:** ticket submission endpoint + list; routes to email/inbox; FAQ/knowledge-base content (static or CMS-backed).
3. **Terms & privacy:** static legal pages, versioned, with acceptance capture at registration (store consent + version + timestamp).
4. **Notification centre:** finalise on Phase 9 data if not already complete.

**Acceptance**
- Each screen renders real data and matches the design system.
- Terms acceptance is recorded per user with version + timestamp.

**Tests (gate)**
- Transaction-history endpoint returns the user's payments/payouts with correct fee breakdown, paginated/filterable, owner-scoped.
- Terms acceptance is recorded with **version + timestamp** at registration (test asserts persistence).
- Support-ticket submit + list tested.

**Guardrails**
- Legal pages versioned; consent auditable.

---

## Phase 11 — Design-token adoption & font self-hosting

**Goal:** Close the two design-consistency gaps: adopt the `--font-size-*` tokens everywhere, and self-host the fonts.
**Why now:** Non-blocking for backend, but required before "production-ready"; safe to do once screens are stable.

**Spec**
1. **Type scale:** replace ad-hoc pixel headings with the existing `--font-size-*` (and weight/line-height) tokens across all pages. Audit each screen; no raw px on text where a token exists.
2. **Font self-hosting:** download General Sans, Plus Jakarta Sans, JetBrains Mono; serve locally via `@font-face` with `font-display: swap` and preloads; drop the Fontshare/Google CDN links. Provide WOFF2. Verify offline load no longer falls back to system fonts.
3. Add a visual-regression check (or a documented manual pass) so token adoption doesn't shift layouts unintentionally.

**Acceptance**
- No text uses ad-hoc px where a token exists (lint or grep audit).
- With network disabled, brand fonts still render (self-hosted).
- No unintended layout shifts vs baseline.

**Tests (gate)**
- Lint/grep audit: **no ad-hoc px on text** where a `--font-size-*` token exists.
- Offline test: with network disabled, brand fonts still render (self-hosted, no system-font fallback).
- Visual-regression pass confirms token adoption introduced **no unintended layout shift** vs the Phase-1 baseline.

**Guardrails**
- Preserve the existing visual design; this is consistency + resilience, not a restyle.
- Respect licensing terms for self-hosting each font.

---

## Phase 12 — Hardening: security, testing, observability, deployment

**Goal:** Make it production-ready.
**Why now:** Everything real exists; now make it safe, tested, observable, and deployable.

**Spec**
1. **Security:** OWASP pass — parameterised queries (Prisma covers most), input validation everywhere, output encoding, CSRF strategy for cookie flows, secure headers (helmet), CORS locked, rate limiting, secrets only in env, dependency audit (`npm audit`/Snyk), no PII in logs, encryption at rest for tokens/KYC data. NDPA compliance review.
2. **Testing:** unit (fees, auth, state machines, providers), integration (endpoints against a test DB with mocks), a few end-to-end happy paths (register→book→pay→release). Target meaningful coverage on money/auth/state code specifically. CI runs all.
3. **Observability:** structured logs (pino), request IDs, error tracking (Sentry), health/readiness endpoints, basic metrics (request rate, error rate, payment success rate).
4. **Deployment:** Dockerfile per app; docker-compose for local (api+web+postgres+redis); documented deploy (managed Postgres/Redis, container host); DB migrations run on deploy; environment-specific config; backups for Postgres.
5. **README/runbook:** how to run locally (all-mock, no keys), how to configure each provider, how to run migrations/seed, and the full conflict ledger (X1–X3) as open items.

**Acceptance**
- CI green: typecheck, lint, all tests, build.
- `docker-compose up` runs the whole stack locally in all-mock mode with no real keys.
- Security checklist completed and documented; `npm audit` clean of highs.
- A documented deploy produces a working environment.

**Tests (gate)** — *consolidation, not a substitute for per-phase tests*
- Accumulated unit + integration suites from all prior phases run green in CI.
- Added cross-cutting tests: security headers present, CORS locked, rate limits enforced, no PII in logs.
- A few full e2e happy paths (register → book → pay → release) pass end-to-end in all-mock mode.
- `npm audit` clean of highs; dependency scan in CI.
- Coverage thresholds enforced specifically on money/auth/state modules (fail the build if they drop).

**Guardrails**
- No secrets in the repo or images.
- Money, auth, and state-transition code carry the strongest test coverage.

---

## Phase 12A — Storefront extensions: media kit, verification guidelines, physical attributes (FA-6)

**Goal:** Extend the talent storefront and onboarding with three additions requested after the initial build: a **media kit** (auto-generated by default, upload as override), stricter **verification-video guidelines** (max 90s, waist-up framing), and a compliant **physical-attributes** system that powers casting search.
**Why now:** Additive to the storefront and verification already live; must precede Phase 14 (applications) and Phase 15 (public profile) so those consume the new attribute-search and public media-kit link. Everything is opt-in and privacy-safe by construction.

### 12A.1 Media kit — auto-generate default, upload override

**Decision:** every storefront has a downloadable, on-brand **auto-generated media kit** by default. Talent can optionally **upload** a custom PDF/deck that replaces the auto-generated one on their storefront. Rationale: guarantees a professional, consistent kit for every profile (raising the marketplace floor) while allowing pros with their own materials to override.

**Spec — auto-generated kit**
- Sourced entirely from existing profile data: name, niche(s), location, style tags, celebrity/verified badges, headshot(s), showcase reel thumbnails, rate cards (or "on request"), key credits (short list), contact-via-Monologg CTA link.
- Rendered as a PDF on the server (headless renderer, e.g. Puppeteer or a PDF library) using the Monologg brand: General Sans + Plus Jakarta Sans, Stage Cream canvas, Talent Coral accents, the `/` motif. Re-renders when underlying data changes (or on a manual "Regenerate" action).
- Publicly downloadable from the storefront via `GET /creators/:handle/media-kit.pdf` (cached; only public profile data appears).
- Also shareable as a short link (`monologg.co/[handle]/kit`) that lands on a lightweight preview page with a download CTA.

**Spec — upload override**
- Talent may upload a **PDF** ≤ **20 MB** as their custom media kit. Type-checked server-side (real PDF magic bytes, not just extension); virus-scanned (existing scanner or a lightweight `clamav` provider in the seam, mockable).
- When an upload exists, it **replaces** the auto-generated PDF on the storefront and at the same URLs. Talent can revert to auto at any time (upload is removed; download URLs continue to work seamlessly).
- The talent's Media Kit page shows: "Currently showing: **Auto-generated** [Regenerate] / [Upload your own]" **or** "Currently showing: **Your upload** [Replace] / [Revert to auto]".

**Data model additions**
```prisma
model MediaKit {
  id             String   @id @default(cuid())
  creatorId      String   @unique
  creator        Creator  @relation(fields:[creatorId], references:[id], onDelete: Cascade)
  mode           MediaKitMode @default(AUTO)   // AUTO = generated | UPLOAD = custom PDF
  uploadUrl      String?                       // present when mode=UPLOAD
  uploadSizeBytes Int?
  autoVersion    Int      @default(1)          // bumped on regenerate to bust caches
  autoLastRenderedAt DateTime?
  updatedAt      DateTime @updatedAt
}
enum MediaKitMode { AUTO UPLOAD }
```

**Screens:** PWA-07 (storefront) gains a Media Kit section with a download link and share button. New PWA-20 Media Kit management inside the talent profile settings (mode toggle, upload, regenerate, preview).

**Acceptance**
- Every talent has a downloadable media kit from day one (auto-generated), even if they've done nothing.
- Uploading a PDF replaces the auto version on the storefront and share link with no URL change; reverting brings the auto version back.
- Public media-kit URLs expose **only public profile data** (no bookings, messages, private attributes, contact PII).

**Guardrails**
- Upload path: type/size check, magic-byte validation, virus scan; never trust file extension.
- Auto-generated PDF must not include any private field (see 12A.3 visibility rules).
- Regeneration is idempotent and cache-busted via `autoVersion`.

### 12A.2 Verification video — guidelines + max-90s + waist-up

**Goal:** Improve the quality of verification recordings so identity reviewers can actually assess face, hands, and gestures — without conflating this with identity KYC (X3 still holds: verification video ≠ KYC).

**Spec**
- Before recording, show a **pre-recording checklist** (blocking the record CTA until acknowledged): "Frame yourself waist-up so your face and hands are visible", "Use good lighting", "Speak naturally and use natural gestures", "Maximum 90 seconds", plus a visual reference frame overlay on the recorder preview (a translucent waist-up guide).
- **Server-side validation:** upon upload, the media job reads the video duration; **reject > 90 s** with a clear error and a re-record CTA. Also reject formats/sizes outside spec (existing media limits).
- Framing/gesture guidance is presented to the talent and to the human reviewer; the system cannot enforce framing, but it shows the guidelines to both sides so reviewers can flag off-guideline uploads and prompt a re-record.
- Talent see status transitions clearly: Uploaded → In review → **Approved / Needs re-record (with reason)**.

**Data model additions**
```prisma
model VerificationRecording {
  id             String   @id @default(cuid())
  creatorId      String
  creator        Creator  @relation(fields:[creatorId], references:[id], onDelete: Cascade)
  url            String
  durationSec    Int
  guidelineAck   Boolean  @default(false)   // talent acknowledged pre-record checklist
  status         VerificationRecStatus @default(UPLOADED)
  reviewerNote   String?
  createdAt      DateTime @default(now())
}
enum VerificationRecStatus { UPLOADED IN_REVIEW APPROVED NEEDS_RERECORD }
```
Note: this is the **performance/verification recording** (for the platform's own review of talent quality/authenticity); it is **not** the identity KYC document, which stays with `KycProvider` (Smile Identity) and its own model (X3).

**Screens:** PWA-04/onboarding-verification updated with the checklist + framing overlay + client-side duration cap (soft cap; server is authoritative). Talent profile shows current recording status and reason if `NEEDS_RERECORD`.

**Acceptance**
- Recorder shows the guideline overlay + checklist; record CTA is disabled until the checklist is acknowledged.
- A > 90 s upload is rejected server-side with a clear message; a ≤ 90 s upload proceeds to review.
- Verification recording and identity KYC remain distinct (separate models, separate flows, no cross-writes).

**Guardrails**
- Duration cap enforced server-side, not just in the recorder UI.
- Never combine `VerificationRecording` state with `KycCheck` state — they belong to different concerns (X3).

### 12A.3 Physical attributes for casting search (GDPR/NDPR-compliant)

**Goal:** Give clients a real casting-style search ("comedian, female, slim, 25–30, tall") while treating body data as the sensitive personal data it is.

**Non-negotiable privacy design principles:**
1. **Every attribute is optional and skippable.** Onboarding shows this as a step the talent can skip and complete later from settings. Nothing about attribute filtering blocks a talent from being on the platform.
2. **Ranges by default, not exact values.** Height/weight/age captured as ranges (e.g. 170–175 cm; 25–30 years). Exact values are only allowed where the talent explicitly opts in; the system uses ranges for search regardless.
3. **Per-field visibility control.** Every attribute has three states — **public** (shown on the storefront), **searchable** (matched by client filters but not displayed publicly), **private** (visible only to the talent themselves). Default is **searchable**. This is the biggest privacy lever the design gives the user.
4. **Explicit granular consent capture.** When the talent saves attributes for the first time, they explicitly consent to their use for casting search, with a plain-language note; the consent (version + timestamp) is stored.
5. **Revocable at any time.** Talent can wipe attributes or change visibility from settings; a wipe deletes the record (hard delete of the row, not just hiding), consistent with GDPR/NDPR right-to-erasure for this specific data category.
6. **No attribute-based auto-decisions.** The system never auto-selects, auto-shortlists, or ranks based on attributes — it only filters. Selection stays a client decision (per FA-2 rules).

**Spec — the attribute set** (a small, deliberate MVP scope — designed to expand later)
- **Ranges:** heightRange, weightRange, ageRange (all controlled enum ranges)
- **Enums:** build (`SLIM`, `ATHLETIC`, `AVERAGE`, `CURVY`, `MUSCULAR`, `LARGER`, `OTHER`), complexion (`FAIR`, `LIGHT`, `MEDIUM`, `TAN`, `DARK`, `DEEP`), hairColor, eyeColor, genderPresentation (`FEMALE`, `MALE`, `NON_BINARY`, `PREFER_NOT_TO_SAY`)
- **Practical:** shoeSize (numeric with unit)
- **Free-text (short, moderated):** distinctiveFeatures (max ~120 chars, e.g. "left-handed", "trained dancer")

The exact wording of enum labels should be reviewed with a diversity/inclusion pass before shipping; the *shape* is what matters here.

**Data model additions**
```prisma
model PhysicalAttributes {
  id                 String   @id @default(cuid())
  creatorId          String   @unique
  creator            Creator  @relation(fields:[creatorId], references:[id], onDelete: Cascade)

  heightRange        String?          // e.g. "170_175_CM"
  weightRange        String?          // e.g. "60_70_KG"
  ageRange           String?          // e.g. "25_30"
  build              Build?
  complexion         Complexion?
  hairColor          HairColor?
  eyeColor           EyeColor?
  genderPresentation GenderPresentation?
  shoeSize           Float?
  shoeSizeUnit       String?          // "EU" | "UK" | "US"
  distinctiveFeatures String?         // max 120 chars

  // per-field visibility, defaulting to searchable
  visibility         Json             @default("{}") // { fieldName: "PUBLIC"|"SEARCHABLE"|"PRIVATE" }

  consentVersion     String
  consentedAt        DateTime
  updatedAt          DateTime @updatedAt
}
enum Build { SLIM ATHLETIC AVERAGE CURVY MUSCULAR LARGER OTHER }
enum Complexion { FAIR LIGHT MEDIUM TAN DARK DEEP }
enum HairColor { BLACK BROWN BLONDE RED GREY WHITE OTHER }
enum EyeColor { BROWN BLACK BLUE GREEN HAZEL GREY OTHER }
enum GenderPresentation { FEMALE MALE NON_BINARY PREFER_NOT_TO_SAY }
```
Storing visibility as JSON keyed by field name is deliberate: it lets the set of attributes expand later without a schema change.

**Spec — endpoints & search integration**
- `PUT /creators/me/attributes` upserts; requires `consentVersion` in body; records `consentedAt`.
- `DELETE /creators/me/attributes` hard-deletes the row (right-to-erasure).
- **Talent discovery search (`GET /talent`)** gains attribute filters. Server logic:
  - A talent is only considered a *candidate for an attribute filter* if that attribute's visibility is **PUBLIC** or **SEARCHABLE** (not PRIVATE).
  - The response includes attributes marked **PUBLIC** on the storefront, and **omits** SEARCHABLE + PRIVATE from public payloads even when they matched (so a "slim" filter can succeed without exposing the label).
  - Attributes are **never** returned in unauthenticated public API responses beyond what's already `PUBLIC` on the storefront.

**Screens**
- Onboarding: new **skippable** attributes step with clear "you can complete this later" affordance and the consent copy.
- Settings: full attributes editor with per-field visibility toggles.
- Client discovery (existing PWA-10 talent directory): expanded filter set for the new attributes, ranges as sliders/steppers, enums as chip multi-selects.
- Storefront (PWA-07): shows only PUBLIC attributes.

**Acceptance**
- Talent can complete onboarding without providing a single attribute; can add them later from settings.
- A search for `build=SLIM & genderPresentation=FEMALE` matches only talent whose visibility on those fields is not PRIVATE; matched talent whose fields are SEARCHABLE-not-PUBLIC are returned without exposing those field values.
- Consent version + timestamp are captured on first save and on any consent-affecting change.
- Deleting attributes hard-deletes the row.
- No API response leaks PRIVATE fields under any circumstance.

**Guardrails**
- Every attribute defaults to **SEARCHABLE**, never **PUBLIC**, on initial save.
- The onboarding attributes step is skippable and clearly labelled optional.
- No auto-selection, auto-shortlisting, or scoring based on attributes — filtering only.
- Right-to-erasure is a hard delete of the row, not a soft flag.

### 12A cross-cutting

- **Additive-only migrations.** No existing table is renamed or dropped; every change is a new table or new nullable column. Nothing shipped in P0–P12 breaks.
- **Provider seams unchanged.** Media kit generation is a new local service, not a provider. Virus scanning uses a scanner interface with a mock — same seam pattern as everywhere else.
- **All-mock mode still runs the whole app** with zero real keys.

**Tests (gate)**
- **Media kit — auto-generation:** unit tests confirm the rendered PDF contains only public profile data; snapshot/hash test on a canonical creator to catch unintended drift; regenerate bumps `autoVersion` and busts the cache.
- **Media kit — upload:** magic-byte validation rejects a `.pdf`-named non-PDF; oversize (> 20 MB) rejected; virus-scan mock returns clean-then-dirty and both paths handled; upload replaces then reverts cleanly with the same public URL.
- **Verification recording:** > 90 s upload rejected server-side with a clear error; ≤ 90 s accepted → status IN_REVIEW; the guideline-acknowledgement flag is required and stored; state transitions APPROVED and NEEDS_RERECORD both drive the correct talent-facing status.
- **Physical attributes — privacy:** default visibility is SEARCHABLE (never PUBLIC) on first save; per-field visibility toggles honoured; PRIVATE fields never appear in any API response; consent version + timestamp captured; hard-delete removes the row.
- **Physical attributes — search:** an attribute filter matches only when visibility ≠ PRIVATE; SEARCHABLE-not-PUBLIC fields are matched but not returned in the payload; range filters work as expected; unauthenticated public responses omit non-PUBLIC attributes.
- **Regression:** existing storefront, verification, and discovery tests from prior phases still pass.

---

## Phase 13 — Rich availability calendar & time-slot booking (FA-1)

**Goal:** Replace the UI-only calendar with a real, granular availability tool for talent, and a slot-aware booking experience for clients.
**Why now:** Needs the calendar provider (Phase 8), booking endpoints (Phase 5), and auth (Phase 4). The external flow (Phase 16) depends on this for slot selection.

**Spec — talent sets availability by day and time-of-day**
- Talent selects a specific day and marks **time-of-day slots** (e.g. *free 09:00–13:00*, *unavailable 18:00–22:00*) — granular, not all-or-nothing.
- **Multiple slots per day coexist** (a morning block and a night block on the same date).
- Talent can add **events to a specific day**; clicking a day reveals **everything scheduled that day**; two events on one day render together without collision.
- Recurring availability (e.g. "every weekday 9–5") with per-day overrides.

**Spec — the default-free rule**
- **If a talent has not specified anything for a day, that day is treated as available (free).** Only slots explicitly marked **unavailable** (or already **booked**) are blocked. Talent opt *out* of times, not in — an unconfigured calendar never blocks bookings.

**Spec — client books within available slots**
- The booking sheet shows the talent's **real open slots** for the chosen date; unavailable/booked slots are visibly disabled.
- Booking a slot marks it **booked** (no double-booking) and — once escrow is funded — generates the order room and Meet link.

**Spec — data model additions**
```prisma
model AvailabilityBlock {              // extends existing
  id          String   @id @default(cuid())
  creatorId   String
  date        DateTime            // the specific day
  slots       Json                // [{start:"09:00",end:"13:00",state:"free"|"unavailable"|"booked",bookingId?}]
  isRecurring Boolean  @default(false)
  recurRule   String?             // "WEEKDAYS", "WEEKLY:MON"
  calendarEventId String?
}
model CalendarEvent {                  // talent-added, non-booking
  id String @id @default(cuid())
  creatorId String
  date DateTime
  start String
  end String
  title String
  kind String            // "personal" | "hold" | "booking"
  bookingId String?
}
```
**Spec — slot-resolution service (server-authoritative)**
`getOpenSlots(creatorId, date)` = start from "whole day free" → subtract explicit `unavailable` slots → subtract `booked` slots → subtract Google busy times (via the CalendarProvider from Phase 8, mock in dev) → return the remainder. The client renders only what this returns; it never computes availability itself.

**Screens:** PWA-08 Scheduling upgraded to day-detail + slot-editor; PWA-11 Checkout upgraded to a slot-picker fed by `getOpenSlots`.

**Acceptance**
- Talent can mark a morning-free / evening-unavailable day and both render on that day's detail.
- A day with no config is bookable across normal hours; a day with an unavailable evening blocks only the evening.
- Client can only select free slots; booking one disables it for everyone else.

**Tests (gate)** — *high-coverage path, availability*
- Unit tests for `getOpenSlots` covering: unconfigured day → normal hours free (default-free rule); evening-unavailable day → only evening blocked; booked slot → excluded; recurring rule → applies per weekday; Google-busy → subtracted.
- **Double-booking race:** two clients booking the same slot concurrently — only one succeeds; the slot is excluded from `getOpenSlots` immediately after.
- Server-authority test: a client request claiming a slot the server considers unavailable is rejected.

**Guardrails**
- Availability is computed server-side; the client never decides what's free.
- No double-booking: a booked slot is immediately excluded from `getOpenSlots`.

---

## Phase 14 — Project applications, two-sided + applicant cap (FA-2, FA-4)

**Goal:** Talent can discover and **apply** to client projects; clients can **manage applicants** and **cap** applications. Completes both navigations.
**Why now:** Needs auth (4), briefs (5), and notifications (9). Feeds the booking relationship (a selected applicant becomes a booking).

**Spec — talent browse & apply (new nav surface)**
- New **Projects** item in the **talent bottom nav**: Home · Bookings · **Projects** · Inbox · Profile (talent previously had no way to discover projects).
- Talent **searches/filters open projects** (niche, budget, location, date) and **applies** (optional short pitch).
- Talent sees **application status** per project: Applied · Shortlisted · Selected · Not selected · Closed.

**Spec — client applicant cap on posting**
- On posting a brief, the client sets a **maximum number of applicants** (`applicantCap`).
- **When the cap is reached, applications close automatically (first-come).** Later talent see "Applications closed."
- The client still **manually selects** from the capped pool — the cap controls *volume*, not the choice. (⚠️ **X4** — confirm hard-close vs soft warning.)

**Spec — client manage applicants**
- Client is **notified when a talent applies**, sees **all applicants**, opens **each full profile**, and can **shortlist / reject-remove / select**.
- Selecting converts the application into a **booking in `PENDING_PAYMENT`** (funded via the normal escrow flow, Phase 6).

**Spec — notifications both ways (via Phase 9)**
- Talent: application received → shortlisted → **selected / not selected**.
- Client: new application → cap reached / applications closed.

**Spec — client nav completion (FA-4)**
- **Client bottom nav:** Home · Find Talent · **Projects** (posted briefs + applicant management) · Inbox · Account.

**Spec — data model additions**
```prisma
model Brief {                          // extends existing
  applicantCap     Int?               // null = uncapped
  applicationsOpen Boolean @default(true)
}
model Application {
  id String @id @default(cuid())
  briefId String
  creatorId String
  pitch String?
  status ApplicationStatus @default(APPLIED)
  createdAt DateTime @default(now())
  @@unique([briefId, creatorId])       // one application per talent per brief
}
enum ApplicationStatus { APPLIED SHORTLISTED SELECTED REJECTED WITHDRAWN }
```
**Cap enforcement (server-authoritative):** application creation is transactional — it checks `applicationsOpen` and the current count against `applicantCap` inside the same transaction, rejects if closed, and flips `applicationsOpen=false` when the cap is hit. Prevents racing past the cap.

**Screens:** PWA-14 Talent Projects browse/search; PWA-15 Project detail + Apply; PWA-16 Talent Applications status list; PWA-17 Client applicant management; PWA-09 brief form gains `applicantCap`.

**Acceptance**
- Talent finds a project, applies, and sees status change as the client acts.
- The Nth+1 applicant after the cap is blocked with "applications closed"; duplicate application rejected.
- Client sees all applicants, can shortlist/reject/select; selection creates a booking.
- Both sides receive the right notifications; no new screen is orphaned in either nav.

**Tests (gate)** — *high-coverage path, cap*
- **Cap race:** N+1 concurrent applications against a cap of N — exactly N succeed, the rest get "applications closed"; `applicationsOpen` flips atomically (transactional test).
- Duplicate application (same talent, same brief) rejected by the unique constraint.
- Status-transition tests: applied → shortlisted → selected/rejected; selection creates a booking in PENDING_PAYMENT.
- Notification tests both directions (received/closed; shortlisted; selected/not selected).
- Authz: only the brief-owner can shortlist/reject/select; only the applicant sees their own status.

**Guardrails**
- Cap enforced transactionally server-side (no race past the cap).
- Applications and selections are owner/participant-scoped.

---

## Phase 15 — Public marketplace profile / shareable link (FA-3)

**Goal:** `monologg.co/[handle]` works as a public storefront for **anyone**, including logged-out strangers, and can convert into a booking.
**Why now:** Needs the storefront + discovery (Phase 5). It's the entry point for the external flow (Phase 16).

**Spec**
- Every talent has a public URL `monologg.co/[handle]`.
- A **logged-out** visitor sees the full public storefront: name, niche, location, verified badge (identity), celebrity badge (if earned), style tags, showcase media, and **rate cards with prices** — all without an account.
- **SEO / link-sharing:** server-render or pre-render meta + **Open Graph** (talent name, photo, tagline) so a shared link shows a rich preview card.
- Each service has a **Book** action → enters the external booking flow (Phase 16).

**Screens:** PWA-07 storefront gains a fully public, logged-out-capable mode served at `/[handle]`.

**Acceptance**
- A logged-out user opening `/[handle]` sees the full storefront and prices.
- A shared link produces a rich preview (OG image + name + tagline).
- "Book" leads into Phase 16.

**Tests (gate)**
- Logged-out request to `/[handle]` returns the full public storefront with prices and **no private data** (no bookings, messages, or contact info leak).
- Open Graph / meta tags present for link previews (test asserts the tags render).
- "Book" entry point routes into the external flow.

**Guardrails**
- Public view exposes only public profile data — never private booking, message, or contact data.

---

## Phase 16 — External-visitor booking + deferred account + escrow-first (FA-5) — flagship

**Goal:** A stranger from a shared link books a talent, funds escrow, and gets an account **created automatically from the checkout information** — never experiencing a separate "sign up." Escrow funding is the gate before any conversation opens.
**Why now:** The most dependent phase — needs auth (4), payments/escrow (6), availability (13), and the public profile (15). Build it last.

**Spec — design principles (the build must honour these)**
- **Deferred account creation (e-commerce guest-checkout pattern):** the visitor never *decides* to sign up. They enter the info the booking needs anyway (name, email, payment); on payment, an account **materializes** from that data and the booking lands in their new client dashboard. Account creation is a *confirmation, not a task*.
- **Escrow-first is preserved:** the order room / chat opens **only after** escrow is funded (`ESCROW_LOCKED`). The deposit is the spam filter — no funded escrow, no chat.
- **Payment is the final committing step;** information is collected stepwise before it. The account is created *on* successful payment, not before.
- **Selection + context survive the whole flow** — the chosen service, slot, and context note persist through account creation; nothing restarts.
- **The auto-account is surfaced, not silent** — the buyer must return to approve escrow release, so the account is made accessible immediately (set-password / magic link), and release approval is the built-in reason they come back.

**Spec — the step sequence (PWA-18, works logged-out until step 7)**
```
1. Browse (anonymous)        public profile, services, prices, availability (Phase 15)
2. Pick service + slot       configure while anonymous (slot from getOpenSlots, Phase 13)
3. Booking summary           base · client fee (15%, config) · escrow total,
   + escrow explainer        "your money is held safely; talent paid only when you approve"
4. Context line (one-way)    optional "Briefly, what do you need?" — one field, NOT a
                             conversation. Attached to the booking request. Does not open chat.
5. Name + email              the info the booking needs anyway (stepwise)
6. Payment → fund escrow     final committing step. Full amount into escrow HELD (not paid to
                             talent). Provider per region (Paystack…). Webhook-authoritative,
                             idempotent. Progress indicator "Step 2 of 3: Secure your booking".
7. On payment success:       • account auto-created from name/email (or attached if email exists)
                             • booking attached (origin=PUBLIC_LINK); ESCROW_LOCKED on webhook
                             • order room opens; talent notified "new booking — escrow funded"
                             • buyer lands in client dashboard, booking + chat live
8. Account surfacing (PWA-19) "set a password / use this magic link to manage your booking",
                             emailed too.
```
- The pending booking **holds the slot** on `PENDING_PAYMENT` with `slotHoldExpiresAt` (config, default 30 min, ⚠️ **X5**); expiry releases the slot so abandoned checkouts don't lock it.
- **Abandoned-checkout capture:** email is collected at step 5 (before payment), so a visitor who bails is a recoverable lead (consent-respecting).

**Spec — escrow + fee specifics**
- Client pays `base + 15%` (config, X2); creator receives `base − 11%` (config, X1); both through the escrow-held ledger (Phase 6). Payment is the **only** authority for state (webhook, idempotent); chat gates on `ESCROW_LOCKED`, never a client callback.

**Spec — data model additions**
```prisma
model Booking {                        // extends existing
  origin            BookingOrigin @default(INTERNAL)   // INTERNAL | PUBLIC_LINK
  contextNote       String?                            // step 4, one-way
  slotHoldExpiresAt DateTime?                           // PENDING_PAYMENT expiry
}
enum BookingOrigin { INTERNAL PUBLIC_LINK }
model User {                           // extends existing
  accountOrigin AccountOrigin @default(SIGNUP)          // SIGNUP | AUTO_CHECKOUT
  passwordSet   Boolean @default(true)                  // false for auto-created until set
}
enum AccountOrigin { SIGNUP AUTO_CHECKOUT }
```
**Auto-account rules (server):** on payment success for a `PUBLIC_LINK` booking with no existing user for that email → create `User(userType=CLIENT, accountOrigin=AUTO_CHECKOUT, passwordSet=false)` + `Client` row, attach the booking, issue a set-password/magic-link token, send it. If the email **already** has an account → attach the booking to it (prompt login), never duplicate.

**Screens:** PWA-18 Public booking flow (steps 2–6, logged-out); PWA-19 post-payment account-ready / set-password; PWA-07 public mode (Phase 15). Reuse PWA-11/12 checkout/escrow where possible.

**Acceptance**
- A logged-out user completes browse→configure→context→name/email→pay in one unbroken flow.
- On payment: account exists, booking attached, escrow `ESCROW_LOCKED`, order room open, talent notified.
- The conversation is **not** reachable before escrow is funded.
- Set-password / magic-link gives the buyer access to manage and later approve release.
- An abandoned payment releases the held slot after timeout; the email is retained as a lead.
- Booking with an already-registered email attaches to that account with no duplicate.

**Tests (gate)** — *highest-coverage path, flagship*
- **Full logged-out e2e:** browse → configure → context → name/email → pay → on success an account exists, booking attached, `ESCROW_LOCKED`, order room open, talent notified.
- **Escrow-gate test:** the conversation/order room is **unreachable** until escrow is funded (chat gates on `ESCROW_LOCKED`).
- **Deferred-account edge cases:** new email creates `AUTO_CHECKOUT` account with `passwordSet=false`; **existing email attaches to that account with no duplicate**; set-password/magic-link grants access.
- **Slot-hold expiry:** an abandoned checkout releases the held slot after `slotHoldExpiresAt`; the email is retained as a recoverable lead.
- Money-path idempotency reused from Phase 6 applies here (webhook-authoritative, no double-charge).

**Guardrails**
- Escrow-first is non-negotiable: chat gates on `ESCROW_LOCKED`.
- Auto-created accounts must be claimable and surfaced (escrow release depends on it).
- All money math from config; provider per region; webhook-authoritative; idempotent.

---
## Phase 17 — QA, security & UAT (production gate)

**Goal:** Independent verification before the production cutover — the pass that isn't just the builder checking their own work. Per-phase tests prove each unit behaves; this phase proves the *whole system* is safe, coherent, and acceptable to real users.
**Why now:** Everything real exists and each phase self-tested. Before real money and real users, the system needs regression, security, and acceptance verification as a distinct gate — not more feature work.

**Spec — independent QA pass**
- **Full regression** across every screen and flow (not just changed ones), run against the assembled app in all-mock and in a staging environment with test-mode real providers.
- **Cross-device / cross-browser / responsive:** verify 360→1600px, iOS Safari + Android Chrome + desktop, the PWA install path, and offline behaviour (self-hosted fonts, cached shell).
- **Accessibility audit:** automated (axe/Lighthouse) **and** manual — keyboard navigation, focus order, screen-reader labels on every interactive element, contrast per the design system's verified tokens, dynamic-type without clipping.
- **Exploratory QA on the two-sided and money flows specifically:** the escrow lifecycle, the external deferred-account flow, the applicant cap under contention, availability/double-booking — probed by someone trying to break them, not just confirm them.

**Spec — security verification (beyond the Phase-12 checklist)**
- **Penetration-style testing** of auth (token handling, session fixation, privilege escalation across roles), the payment/escrow endpoints (webhook forgery, replay, amount tampering), and the public/external surfaces (the logged-out profile and booking flow, which are the widest attack surface).
- **Authorization fuzzing:** attempt every cross-tenant access (user A → user B's bookings, messages, briefs, payouts) and confirm 403 across the board.
- **Secrets & data:** confirm no secrets in the repo/images/logs; KYC PII and OAuth tokens encrypted at rest; NDPA data-handling review signed off.
- **Dependency & supply chain:** `npm audit` / Snyk clean of highs; lockfile pinned.

**Spec — load & resilience on money paths**
- Concurrency/load test the escrow checkout, webhook processing, slot booking, and applicant cap under simultaneous requests — confirm no double-charge, no double-book, no cap overrun, idempotency holds.
- Confirm graceful degradation when a provider is down (payments, calendar, notify): the app fails safe, never loses money state, and surfaces a clear error.

**Spec — User Acceptance Testing (UAT)**
- A structured UAT round with **real talent and real clients** on staging: complete the core journeys (build storefront → get discovered → book → escrow → deliver → release; post brief → applications → select; external link → book → auto-account).
- Capture issues, triage by severity, and fix blockers before cutover. Sign-off is a human gate, not an automated one.

**Acceptance**
- Regression, cross-device, and accessibility audits pass with no open criticals.
- Security/pen-test findings triaged; all highs/criticals fixed or explicitly accepted by the human.
- Load tests on money/booking/cap paths show no double-processing under concurrency.
- UAT completed with real users; blocker issues resolved; human sign-off recorded.

**Tests (gate)**
- The full accumulated automated suite is green in CI, with enforced coverage thresholds on money/auth/state modules.
- Automated a11y (axe) and Lighthouse budgets pass in CI.
- A documented manual QA + security + UAT checklist is completed and archived in the repo (`/qa/` with dated results), signed off by the human reviewer.

**Guardrails**
- This phase does not add features; it verifies. Any feature gap found becomes a tracked ticket, not scope creep here.
- No production cutover until the security highs are closed and UAT is signed off. This is the hard gate.

---

## 17. Consolidated new-screen registry (Phases 12A–16)

New and extended screens introduced by the feature phases (▲ = extends an existing screen):

| Code | Screen | User | Phase | Priority |
|---|---|---|---|---|
| PWA-07▲ | Storefront — media kit section + share link | Talent | 12A | P0 |
| PWA-20 | Media kit management (auto/upload toggle) | Talent | 12A | P0 |
| PWA-04▲ | Verification recorder — checklist + waist-up overlay + 90s cap | Talent | 12A | P0 |
| PWA-10▲ | Talent directory — attribute filters (build/complexion/height/etc.) | Client | 12A | P0 |
| PWA-21 | Onboarding attributes step (skippable) + settings editor | Talent | 12A | P0 |
| PWA-08▲ | Scheduling — day detail + time-slot editor | Talent | 13 | P0 |
| PWA-11▲ | Checkout — slot picker from `getOpenSlots` | Client | 13 | P0 |
| PWA-14 | Talent Projects — browse/search | Talent | 14 | P0 |
| PWA-15 | Project detail + Apply | Talent | 14 | P0 |
| PWA-16 | Talent Applications — status list | Talent | 14 | P1 |
| PWA-17 | Client applicant management | Client | 14 | P0 |
| PWA-09▲ | Client brief form + applicant cap | Client | 14 | P0 |
| PWA-07▲ | Public marketplace profile, logged-out mode | Public | 15 | P0 |
| PWA-18 | External public booking flow | Public→Client | 16 | P0 |
| PWA-19 | Post-payment account-ready / set password | Client | 16 | P0 |

These extend (do not replace) the original PRD's screen registry. System screens (transactions, help, terms) remain in Phase 10.

---
## 18. Cross-cutting requirements (apply to every phase)

These are not a phase — they are constraints the agent honours throughout.

### 13.1 Do-no-harm to the existing UI
The prototype's visual design is an asset. No phase may restyle a screen except Phase 11 (token adoption, which must be visually neutral). After each phase, diff key screens against the Phase-0 baseline; unintended visual changes are regressions.

### 13.2 The provider seam is sacred
Every external dependency stays behind its interface with a working mock. The entire app must run and pass tests in **all-mock mode with zero real API keys**. This is the property that lets the agent self-verify and lets a human review without provisioning accounts. Never call a real external API directly from a route or service — always through the provider.

### 13.3 Config, not literals
Fees, payment-rail-by-region, token lifetimes, size/type limits, and every provider selection are configuration. No magic numbers in business logic. The conflict items (X1–X3) resolve as one-line config changes.

### 13.4 Server is authoritative
Money math, fee computation, access control, and state transitions are decided **server-side** and never trusted from the client. The client displays; the server decides.

### 13.5 Money handling
Integer minor units + currency code everywhere. One `computeFees()`. Every money move idempotent and transactional. Fee amounts stored on bookings for audit but always derived from config at write time.

### 13.6 Security defaults
Validate every input boundary with zod. Hash passwords (argon2id) and refresh tokens. Encrypt OAuth/KYC data at rest. Sanitise all error responses. Rate-limit auth and money endpoints. No PII or secrets in logs. NDPA compliance for Nigerian user data.

### 13.7 Migrations over manual DB edits
All schema change via Prisma migrations, committed. Never hand-edit a deployed database.

### 13.8 Stop-and-review cadence
Complete one phase, run its acceptance checks, commit, and pause for human review before the next. Do not batch multiple phases in a single unreviewed pass — this is how scope and correctness drift.

---

## 19. Environment variables (the complete set)

Provide `.env.example` with every key below (no values). Boot validates all required vars with zod.

```
# Core
NODE_ENV, PORT, WEB_ORIGIN, API_BASE_URL
DATABASE_URL                 # Postgres
REDIS_URL

# Auth
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL

# Providers — each also has an *_MODE = real|mock flag
PAYSTACK_SECRET_KEY, PAYSTACK_WEBHOOK_SECRET      # X1 primary
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET          # X1 later
AIRWALLEX_CLIENT_ID, AIRWALLEX_API_KEY            # X1 later
SMILE_IDENTITY_PARTNER_ID, SMILE_IDENTITY_API_KEY # KYC (X3)
AI_TAGGING_API_KEY                                # style tags (X3)
GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT
SENDGRID_API_KEY, EMAIL_FROM
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM

# Storage
S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY

# Observability
SENTRY_DSN, LOG_LEVEL
```

**Rule:** every provider defaults to `mock` unless its `*_MODE=real` and its keys are present. The app must boot and pass tests with **none** of the real keys set.

---

## 20. Definition of done (whole project)

- All 19 phases (0–17, including 12A) pass their acceptance checks, **including per-phase test gates**.
- Testing was continuous: every phase shipped its own tests as a gate; Phase 12 consolidated and Phase 17 independently QA'd (regression, security/pen-test, load, accessibility, UAT).
- Security highs closed; UAT signed off by a human before cutover.
- `docker-compose up` runs web + api + postgres + redis locally in all-mock mode with **zero** real API keys, and the full user journey works end-to-end (register → build storefront → get discovered → book → escrow → deliver → release → notify).
- CI is green: typecheck, lint, tests, build.
- No UI regressions vs the Phase-0 baseline (except intended Phase-11 token adoption).
- Conflict ledger X1–X5 resolved or explicitly signed off by the human, as one-line config values.
- Security checklist complete; `npm audit` clean of highs; NDPA review done.
- README/runbook lets a new developer run everything locally in minutes and configure each provider for staging/production.
- The folder is a git repository with a legible, phase-by-phase commit history starting from the untouched-prototype baseline.

---

## 21. Explicit non-goals (for this build-out)

To keep scope bounded, these are **out** unless the human adds them:
- The three recommended-but-unspecified interfaces from the earlier UX analysis (Next-of-Kin portal, Doctor view, Admin/Ops console). This PRD builds the existing prototype's backend **plus the new feature areas in Phases 13–16** (availability, applications, public profile, external booking) — but not those three extra portals.
- Native mobile apps — PWA/web only.
- Multi-currency FX beyond what the payment providers handle natively.
- Real-time collaborative editing in the order room (async messaging + live Meet calls only).
- Advanced analytics/BI dashboards.

---

## 22. First three moves for the agent (quickstart)

1. **Phase 0, commit the baseline first.** `git init`, commit the untouched prototype, *then* add tooling. This is the safety net for everything after.
2. **Phase 1 seam before anything real.** Route all data through `api-client` in `mock` mode so the UI is decoupled before a single endpoint exists. Verify pixel-parity with the baseline.
3. **Phase 2 schema, then stop.** Land the Prisma schema + migration + seed, confirm the seeded data renders identically, and pause for review. Do not start auth until the data model is signed off.

Proceed one phase at a time, running acceptance checks and committing between each.
