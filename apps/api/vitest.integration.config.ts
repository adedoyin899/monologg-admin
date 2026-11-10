import { defineConfig } from "vitest/config";

// Live-DB tests: real network + real Supabase credentials from apps/api/.env, not wired into
// `pnpm test`/CI since CI doesn't have Supabase secrets or per-run branching configured yet
// (see handoff/log.md Session 12). Run manually with `pnpm --filter @monologg/api run test:integration`
// after `pnpm --filter @monologg/api run db:seed`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.integration.test.ts"],
    exclude: ["**/node_modules/**"],
    setupFiles: ["./test-setup.integration.ts"],
    // The idempotent-reseed test re-runs ~90 sequential upserts (grew from ~60 once seed.ts
    // picked up 2 more creators/clients — features.md Phase 12's manual-DB-verification rows)
    // against Supabase's transaction pooler over an already-active client; observed at ~100s+
    // in this sandbox vs. ~2.5s for a fresh `prisma db seed` process — real network latency,
    // not a hang, but slow enough to need a generous budget since this suite doesn't run on
    // every commit. The 90000 this replaced was calibrated for the smaller pre-Phase-12 seed
    // and started timing out once the row count grew.
    testTimeout: 150000,
    // Vitest's hookTimeout defaults to 10s independent of testTimeout above — too tight for
    // this same slow pooler when a hook (not a test body) does several sequential DB calls,
    // e.g. phase6.integration.test.ts's afterAll cleanup loop.
    hookTimeout: 30000,
    pool: "forks",
    // These files all read/write the same live, shared Supabase project — unlike
    // the mocked-Prisma unit tests, they aren't isolated from each other. Running
    // them in parallel let a row-count-idempotency check in one file race against
    // in-flight bookings created by another (surfaced once a third live-DB file
    // was added in Phase 6); force sequential execution instead.
    fileParallelism: false,
  },
});
