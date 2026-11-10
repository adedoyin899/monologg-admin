# Phase 17 — Regression baseline

Date: 2026-07-31. Scope: exactly what `.github/workflows/monologg-ci.yml` runs, re-confirmed
green with everything through Phase 16 merged.

| Step | Command | Result |
|---|---|---|
| Typecheck | `pnpm run typecheck` (api, web, packages/types) | ✅ clean |
| Lint | `pnpm run lint` (web) | ✅ 0 errors, 7 pre-existing warnings (fast-refresh/exhaustive-deps style warnings, not correctness issues) |
| Test — api | `pnpm --filter @monologg/api test` | ✅ green (see exact count in the final commit's test output — accumulates every phase's unit suite plus this phase's additions) |
| Test — web | `pnpm --filter @monologg/web test` | ✅ green |
| Audit | `pnpm run audit` (`pnpm audit --audit-level=high`) | ✅ exit 0 — "3 vulnerabilities found, Severity: 3 high (2 ignored)" against the reviewed `pnpm.auditConfig.ignoreGhsas` allowlist in `package.json`; see `security.md` |
| Build | `pnpm run build` (web) | ✅ succeeds; one pre-existing Rollup chunk-size warning (`index.js` 803KB / 215KB gzip) — a real, tracked performance note, not an error, see `security.md`/perf notes below |

## What "regression" covers in this phase

- **All-mock leg**: the full accumulated unit/route test suite (`apps/api/src/**/*.test.ts`,
  `apps/web/src/**/*.test.tsx`) plus the new Playwright cross-browser pass (`cross-device-
  a11y.md`) — every screen exercised in mock mode, no backend required.
- **Real-DB leg**: `phase5.integration.test.ts`, `phase6.integration.test.ts`,
  `seed.integration.test.ts` (pre-existing) plus this phase's new
  `phase17.concurrency.integration.test.ts` — run manually against the real dev Supabase
  project via `pnpm --filter @monologg/api run test:integration` (see `load-concurrency.md`).
- **Staging with test-mode real providers**: **not attempted** — no such environment exists yet
  (confirmed with the user before starting this phase). Tracked as an infra gap in `README.md`.

## Not covered here (see README.md's PENDING list)

- Lighthouse performance/SEO/PWA budgets.
- Physical device testing (real iOS/Android hardware).
- Dynamic-type/OS-level zoom testing.
