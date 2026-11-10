# Contributing to Monologg

## Running it locally

This is a pnpm workspace (`apps/web`, `apps/api`, `packages/types`) as of `features.md` Phase 1. Everything below runs from **this folder** (`monologg/`), not from inside `apps/web/`.

```
pnpm install        # or: npx pnpm install, if pnpm isn't installed globally
pnpm dev            # http://localhost:5173 — apps/web only

pnpm --filter @monologg/api run dev   # http://localhost:3001 — apps/api, needs apps/api/.env
```

`apps/web/vite.config.ts` proxies `/api` to `localhost:3001` in dev, so `apps/web` with `VITE_API_MODE=live` reaches a locally running `apps/api` directly — no separate setup needed beyond starting both dev servers. To hit `apps/api` on its own without the browser (`curl localhost:3001/api/v1/health`, Postman, etc.), that still works too.

## Before you commit

```
pnpm run typecheck   # tsc --noEmit across all three packages, strict
pnpm run lint        # eslint . in apps/web — warnings are OK, errors block CI
pnpm run test        # vitest run in apps/web, then apps/api (fast/no-network tests only)
pnpm run audit       # pnpm audit --audit-level=high — Phase 12; see apps/api/README.md for the one reviewed exception
pnpm run build       # production build
```

All five are exactly what CI's `ci` job runs on every push/PR (`.github/workflows/monologg-ci.yml`, scoped to `monologg/**`). If it's not green here, it won't be green there. A second `docker` job (Phase 12) builds `apps/api/Dockerfile` and `apps/web/Dockerfile` on the same trigger — there's no local command that substitutes for it if Docker isn't installed; see apps/api/README.md's "Deployment" section.

`pnpm --filter @monologg/api run test:coverage` runs the same test suite with coverage thresholds enforced on the money/auth/state modules (`apps/api/vitest.config.ts`) — not part of the CI-blocking `pnpm run test`, but worth running before touching `services/fees.ts`, `services/payment.ts`, `services/auth.ts`, `middlewares/auth.ts`, or `services/booking.ts`.

`pnpm run format` reformats `apps/web` with Prettier. It's available but not currently a CI gate — the codebase predates Prettier adoption and hasn't been bulk-reformatted yet (see `handoff/log.md`); new code is expected to already match `.prettierrc.json`, and full normalization can happen as a dedicated pass later.

## The data seam

Every screen reads/writes through `apps/web/src/lib/api-client.ts` — never import `apps/web/src/mocks/*` directly from a page or component (a test enforces this). `VITE_API_MODE` (`apps/web/.env.example`) switches between `mock` (default — local fixtures) and `live` (real `/api/v1/...` endpoints — every domain resource through Phase 16 is wired, including availability/booking/checkout as of Phase 13). Four methods (stats ×2, activity, shortlist) stay mock-only regardless of the flag — no backing resource exists anywhere in `features.md` for them, see `handoff/design.md` §6. List endpoints paginate server-side (`apps/api/src/lib/pagination.ts`, `{data, page, pageSize, total, totalPages}`); live-mode list calls fetch one `pageSize=100` page and unwrap it rather than building pagination UI.

## Database (Supabase + Prisma)

`apps/api/.env` (gitignored — copy `apps/api/.env.example`) holds `DATABASE_URL` (transaction pooler, port 6543, `?pgbouncer=true` — what the running app/Prisma client uses at runtime) and `DIRECT_URL` (session pooler, port 5432, same pooler host — what `prisma migrate` uses). Both route through Supabase's pooler host, not the raw direct host (`db.<ref>.supabase.co`) — that host is IPv6-only unless the project's IPv4 add-on is enabled, and some networks (including the one this was built in) can't reach it at all.

Schema lives in `apps/api/prisma/schema.prisma` (15 models per `features.md` Phase 2). Useful commands, all from `monologg/`:

```
pnpm --filter @monologg/api run verify:db          # smoke-test both connection strings
pnpm --filter @monologg/api exec prisma migrate dev # apply schema changes
pnpm --filter @monologg/api run db:seed             # idempotent seed (safe to re-run)
pnpm --filter @monologg/api run test:integration    # live-DB tests — NOT part of `pnpm test`/CI
```

`test:integration` isn't CI-gated: CI has no Supabase secrets or per-run branching configured. `pnpm test`/CI only run `apps/api`'s fast, no-network tests (payment-provider allowlist, schema shape via Prisma's DMMF).

## Authentication (Phase 4)

Real: `POST /api/v1/auth/{register,login,refresh,logout,verify-email,forgot-password,reset-password}` — argon2id passwords, rotating JWT refresh tokens (reuse revokes the whole family), `requireAuth`/`requireRole`/`requireOwner` middleware (`apps/api/src/middlewares/auth.ts`). Requires `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (≥32 chars) in `apps/api/.env`.

`apps/web/src/lib/api-client.ts` calls these in `VITE_API_MODE=live` (attaches the access token to every request, retries once on a 401 via silent refresh); `mock` mode (the default) is unchanged from before Phase 4 — no login needed to reach any page. `apps/web/src/app/RequireAuth.tsx` gates the six protected routes the same way: a no-op in `mock`, real in `live`.

## Payments & escrow (Phase 6)

Real: `POST /api/v1/bookings/:id/pay` (Paystack-first checkout via `PaymentProvider.real`) → `POST /api/v1/webhooks/paystack` (HMAC-SHA512-verified, idempotent — the **only** thing that sets `ESCROW_LOCKED`) → `PATCH /api/v1/bookings/:id/deliver` → `PATCH /api/v1/bookings/:id/approve` (releases escrow) → `PATCH /api/v1/bookings/:id/dispute` / `POST /api/v1/bookings/:id/refund`. A client-side "payment succeeded" redirect is advisory only; nothing in the API lets it advance state on its own. Requires `PAYSTACK_SECRET_KEY` in `apps/api/.env` only when `PAYMENT_PROVIDER != mock` — the default `mock` provider needs no real keys.

**`apps/web/src/app/pages/Checkout.tsx` is now wired to this, as of Phase 13** — a real, slot-aware, server-computed-fee flow when `apiClient.mode === "live"` and a real `creatorId` is present in nav state. The old scripted delay/"FINCRA" copy only remains as the mock-mode fallback demo.

## Working on the backend build-out (`features.md`)

This project is mid-way through turning from a frontend prototype into a full-stack app, following `handoff/features.md` — an 18-phase (0–17), dependency-ordered PRD. The rules that matter most:

1. **One phase at a time.** Finish a phase's acceptance checks and tests, commit, and stop for review before starting the next. Don't batch phases.
2. **Tests are a gate, not an afterthought.** Every phase ships its own tests before it's "done" — money/auth/availability/cap/escrow-state code gets the strongest coverage (unit + integration + concurrency, not just happy-path).
3. **The provider seam is sacred.** Every external dependency (payments, KYC, calendar, AI tagging, notifications) is an interface with a real *and* a mock implementation. The whole app must run and test in all-mock mode with zero real API keys.
4. **Server is authoritative.** Fees, availability, cap enforcement, escrow state, and access control are decided server-side — never trust the client.
5. **Config, not literals.** Fees (`PLATFORM_FEES`), payment provider selection, token lifetimes, etc. are configuration values, never hardcoded in business logic. See `features.md` §1 for the specific stale values (FINCRA, 9%/12% fees) this corrects.
6. **Do no harm to the existing UI.** No phase restyles a screen except the token-adoption phase (Phase 11), which must be visually neutral. Diff key screens against the baseline after each phase.

Read `handoff/features.md` in full before starting Phase 1 or later — this file only summarizes the rules, not the specs.

## Project structure

See `README.md` for the folder map, and `handoff/README.md` for the full documentation index.
