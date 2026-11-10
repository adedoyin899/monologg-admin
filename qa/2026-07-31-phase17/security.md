# Phase 17 — Security review

Date: 2026-07-31. Independent pass beyond the Phase-12 hardening checklist. All new tests are
CI-blocking (part of `apps/api/src/**/*.test.ts`, run by `pnpm test`) unless noted otherwise.

## 1. Auth / token handling

- **Access tokens**: short-lived JWT (services/auth.ts). **Refresh tokens**: rotating, hashed at
  rest (`RefreshToken.tokenHash`, SHA-256), with reuse-detection that revokes the entire session
  family on a replayed token — already implemented (Phase 4) and tested
  (`routes/auth.test.ts`'s "Full end-to-end chain" + rotation/reuse suite).
- **Session fixation**: architecturally not applicable — there is no server-side session
  identifier to fixate in a stateless-JWT + rotating-refresh-token design. Noted rather than
  forcing an irrelevant test.
- **Privilege escalation across roles**: `requireRole` is applied consistently everywhere a route
  is meant to be role-restricted (confirmed by reading every route file in `apps/api/src/routes/`
  during this pass — see §3). No route found that should be role-gated but isn't.

## 2. Payment/escrow — webhook forgery, replay, amount tampering

- **Forgery**: `routes/webhooks.ts` requires a valid `x-paystack-signature`, verified via
  `paymentProvider.verifyWebhook` before any processing — already tested
  (`webhooks.test.ts`: "rejects a request with no signature header at all", "rejects a
  tampered/unsigned webhook").
- **Replay**: `PaymentEvent`'s DB-level unique constraint on `(paymentId, type, eventId)` makes a
  replayed event a no-op — already tested sequentially (`webhooks.test.ts`,
  `payment.test.ts`'s "Idempotency"/"Concurrency" tests) and now also proven under **genuine
  concurrent** delivery against the real database (`load-concurrency.md`).
- **Amount tampering — new test this phase**
  (`services/payment.test.ts`: "amount tampering: a forged payload.data.amount is never read or
  written anywhere"): confirms `processPaystackWebhookEvent` never reads `payload.data.amount` at
  all — the only amount that ever mattered was server-computed via `computeFees` and persisted at
  `initEscrowForBooking` time. A forged payload amount is provably inert; the webhook's DB update
  touches only `status`/`escrowHeld`, never `amount`.
- **Public/external surfaces** (Phase 16's guest-checkout flow, the widest attack surface per this
  phase's own framing): existing coverage already includes guest-pay-init scoped to
  `origin=PUBLIC_LINK` bookings only (`routes/publicBookings.test.ts`), an escrow-first chat gate
  (`routes/orderRooms.test.ts`), and login blocked for `passwordSet:false` accounts
  (`routes/auth.test.ts`) — all reconfirmed green this pass, no new gap found here.

## 3. Authorization fuzzing

New file: `apps/api/src/security.authzFuzz.test.ts` (10 tests). Rather than duplicate the
per-route stranger-token tests that already exist (`bookings.test.ts`, `briefs.test.ts`,
`orderRooms.test.ts`, `rateCards.test.ts`, `projects.test.ts`, `availability.test.ts`), this file
does two things:

**a) A systematic read of every route file with previously zero explicit 403/cross-tenant test
coverage** (`mediaKit.ts`, `verification.ts`, `attributes.ts`, `calendarEvents.ts`,
`transactions.ts`, `talent.ts`, `support.ts`, `notifications.ts`, `creators.ts`, `calendar.ts`,
`uploads.ts`, `webhooks.ts`, `health.ts`, `auth.ts`). Result:

| File | Finding |
|---|---|
| `mediaKit.ts` | Safe by design — every mutating route derives its creator from the caller's own token (`findOwnCreator`), never a client-supplied id; the one `:id`-parameterized route is deliberately public. |
| `attributes.ts` | Safe by design — same "me"-only pattern, no `:id` param exists. |
| `transactions.ts` | Safe by design — scoped entirely by the caller's own `userId` inside `listTransactions`, no `:id` param. |
| `notifications.ts` | Correct — `markNotificationRead` checks `notification.userId !== userId` and 404s (not 403) rather than leaking existence, before any update. |
| `creators.ts` | Correct — the `/me/media/:id` and `/me/media/:id/confirm` routes both check `asset.creatorId !== creator.id` before touching the resource. |
| `calendar.ts` | Safe by design — every route is scoped to `request.user!.userId`, no `:id` param; the OAuth callback is state-token-gated (not identity-gated), matching the webhook pattern. |
| `talent.ts` | Intentionally fully public (discovery) — no auth, no private data. |
| `support.ts` | Scoped by `request.user!.userId`, no `:id` param. |
| `uploads.ts` | Single-use, token-gated presigned-upload stub (mock-provider-only); no user identity concept, acceptable for what it is. |
| **`calendarEvents.ts`** | **Correct code** (`existing.creatorId !== creator.id` → 403 on PATCH/DELETE) **but previously untested.** Added confirmatory stranger-403 tests this phase. |
| **`verification.ts`** | **Real, confirmed gap — see (b) below.** |

**b) A confirmed, demonstrated finding: `PATCH /verification-recordings/:id/review` has no
ownership or role check at all.** The route (and the service function
`reviewVerificationRecording` it calls) never checks who is calling against who owns the
recording, and there is no reviewer/moderator role in the system to check against — this is
already flagged in the route's own code comment as a "KNOWN GAP... future work," and the existing
`verification.test.ts` suite already calls it with a generic authenticated token and asserts
success (correct for the code as written). What was missing was a demonstration of the actual
blast radius. The new test in `security.authzFuzz.test.ts` proves the sharpest version: **a
talent can self-approve their own identity verification**, granting themselves a "Verified" badge
with zero independent review, using nothing but their own valid session token.

- **Severity**: P0/P1 — identity verification integrity is a trust-and-safety property real users
  and clients rely on ("Verified" badge). Self-approval defeats the entire point of the check.
- **Not fixed here**: building a real moderator/admin role system is feature work, explicitly out
  of this phase's scope ("does not add features"). This must be closed — a moderator role, or at
  minimum a same-creator-cannot-review-own-recording check — before this feature ships to
  production with real users.

## 4. Secrets & data handling

- **No secrets in the repo**: swept the tracked `monologg/` tree for common secret-shaped strings
  (`sk_live_`, AWS `AKIA...`, PEM private key headers, GitHub/Slack tokens) — clean. Confirmed via
  `git log --all` that `apps/api/.env` / `apps/web/.env` (the files holding real Supabase
  credentials used for this phase's integration testing) have **never** been committed at any
  point in history — only `.env.example` templates are tracked.
- **Dockerfiles / docker-compose**: no hardcoded secrets; `docker-compose.yml` uses an explicitly
  dev-only placeholder Postgres password.
- **Lockfile pinned**: `pnpm-lock.yaml` is tracked in git (not gitignored), consistent with
  "lockfile pinned" gate language.
- **OAuth tokens encrypted at rest**: `CalendarConnection.encryptedRefreshToken` — AES-256-GCM via
  `lib/encryption.ts`, confirmed passing (`lib/encryption.test.ts`, 4/4 tests, ~87% line coverage
  in the accumulated suite).
- **KYC PII encrypted at rest — finding**: `KycCheck.raw: Json?` is defined in the schema but
  **never actually populated** by current code (`services/kyc.ts`'s `startKycCheck` only ever
  persists `{creatorId, provider, providerRef, status}`, never the raw `KycData` payload — the
  name/DOB/ID-number data passed to `kycProvider.startCheck` is never written to our own database
  at all). `realKycProvider` (`providers/kyc.real.ts`) still throws "not yet implemented" — the
  Smile Identity integration is a Phase 7 stub. **Conclusion: there is no KYC PII at rest to
  encrypt yet**, so this requirement is trivially satisfied today, but it is **not yet tested or
  proven** — it must be re-verified the moment a real KYC provider integration actually starts
  persisting applicant data, not assumed carried-over from this finding.

## 5. Dependency audit

`pnpm run audit` (`pnpm audit --audit-level=high`): exit 0. "3 vulnerabilities found, Severity: 3
high (2 ignored)" — against the two GHSAs already reviewed and allowlisted in `package.json`'s
`pnpm.auditConfig.ignoreGhsas` (GHSA-qwww-vcr4-c8h2: react-router RSC-mode CSRF, confirmed N/A —
this app has no RSC/`unstable_middleware` usage; GHSA-mh99-v99m-4gvg: a brace-expansion DoS only
reachable via eslint/vitest's own dev-tooling dependency trees). No new, unreviewed high/critical
found this pass.

## 6. NDPA / data-handling

See `ndpa-data-inventory.md` — a structured personal-data inventory, not a legal sign-off (which
this pass isn't positioned to give). Marked PENDING in `README.md`.

## Summary of gate-blocking findings from this section

1. **P0/P1 — verification self-approval** (no reviewer role check). Must close before real users.
2. KYC PII encryption — not yet applicable, must be re-verified when the real provider lands.

Everything else in this section: **closed / confirmed safe.**
