# Phase 17 — Load & concurrency on money paths

Date: 2026-07-31. No k6/artillery/live-traffic infrastructure exists in this environment — the
agreed substitute (confirmed with the user before starting) is genuine `Promise.all` concurrency
fired at the **real dev Supabase database** via the existing, pre-established integration-test
harness (`apps/api/prisma/*.integration.test.ts`), not a mocked approximation of Postgres's own
locking/constraint behavior.

New file: `apps/api/prisma/phase17.concurrency.integration.test.ts`. Run manually via
`pnpm --filter @monologg/api run test:integration` (same "not wired into CI, no Supabase secrets
in CI yet" convention every other `*.integration.test.ts` file already documents — this phase
didn't change that, just used the mechanism that already exists). All 4 tests pass; the database
was verified clean (zero leftover rows) after each run via a direct follow-up query.

## Results

| Scenario | Result |
|---|---|
| **Slot booking race** — N concurrent `createBooking` calls for the identical slot | Never more than 1 winner in every trial (N=2 through N=8 tried during investigation). Hard safety property holds. |
| **Webhook replay race** — N=8 concurrent identical signed webhook deliveries | Exactly 1 processed (`ESCROW_LOCKED`), 7 clean no-ops (`processed:false`, still HTTP 200) — proven via the real `PaymentEvent` unique-constraint, not a mock. |
| **Double-approve race** — N=6 concurrent escrow-release approvals on one booking | Funds released exactly once; all 6 calls return 200 (idempotent, none error). |
| **Applicant cap contention** — N=6 throwaway creators racing a cap-3 brief | Exactly 3 succeed; `applicationsOpen` flips to `false` exactly once, inside the same race. |

**No double-charge, no double-booking, no cap overrun in any trial. Idempotency held under
genuine concurrency, not just sequential replay.**

## A real finding from this testing, not a money-safety issue

The slot-booking-race scenario, at higher N (5–8 simultaneous requests for the *exact same*
slot), produced some `PrismaClientKnownRequestError: Transaction already closed... timeout was
5000ms` errors for requests queued behind the real Postgres advisory lock — Prisma's default
5-second interactive-transaction timeout, exceeded while a later-queued request waited its turn.

- **This is not a money-safety violation**: across every trial at every N tried, **never more
  than one booking succeeded** — the advisory lock correctly serialized every attempt, exactly as
  designed. The only effect was that some *losing* requests received a confusing raw error
  instead of the intended clean `409 SlotUnavailableError`.
- **Root cause is very likely this environment's network latency**, not a fundamental design
  flaw: this sandbox talks to the dev Supabase project across a real, cross-region network link
  (the same `aws-0-eu-west-1` pooler used throughout this project's integration tests), adding
  meaningful per-round-trip latency to each transaction's several sequential queries while the
  advisory lock is held. A production deployment with the API co-located near its database would
  see this same scenario resolve in a fraction of the time.
- **A specific, attributable contributor**: Phase 16's lazy slot-hold-expiry check
  (`releaseExpiredHolds` in `services/availability.ts`) adds one extra query inside the advisory
  lock's critical section for every caller *after* the first, once at least one "booked" slot
  entry exists to check. This measurably extends lock-hold time under sustained single-slot
  contention and is a plausible contributor to later-queued callers timing out first in this
  latency-sensitive environment.
- **Recommendation, not fixed here**: before treating "graceful behavior under N simultaneous
  identical-slot requests" as fully proven for production, re-run this same test against a
  production-representative (co-located, low-latency) environment. If it still times out there,
  consider either raising the interactive-transaction timeout for this specific transaction, or
  having the slot-hold-expiry check run outside the lock for the common case. Tracked as a
  follow-up, not addressed in this QA-only phase (tuning/optimizing this further would be
  engineering work beyond "verify," and speculatively changing a money-path transaction's timeout
  based on one sandbox's atypical network conditions would be irresponsible without production
  numbers to justify it).

## Provider-down fail-safe

Confirmed via existing (already-passing) test coverage, not new to this phase:
- `getOpenSlots` degrades gracefully when Google Calendar is disconnected or access was revoked
  (`CalendarNotConnectedError`/`CalendarReconnectRequiredError` are swallowed, not thrown —
  `services/availability.test.ts`).
- `releaseEscrowForBooking` / `refundEscrowForBooking` roll their atomic claim back to
  `ESCROW_HELD` if the payment provider call itself fails, so a retry is possible and no money
  state is ever stranded mid-transition (`services/payment.test.ts`).

No gap found here this pass.
