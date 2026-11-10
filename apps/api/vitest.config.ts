import { defineConfig } from "vitest/config";

// Fast, no-network tests — this is the CI-blocking gate. Live-DB tests live in
// vitest.integration.config.ts (see README.md for why they're separate).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "prisma/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/*.integration.test.ts"],
    // Coverage thresholds (features.md Phase 12 gate: "coverage thresholds
    // enforced specifically on money/auth/state modules — fail the build if
    // they drop"). Global floor is modest and descriptive, not aspirational —
    // most of this codebase is route/provider glue already covered by
    // integration-style route tests; the per-file overrides below are the
    // actual gate, on the modules where a bug costs real money or leaks data.
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.d.ts", "src/types/**"],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
        // Money: fee computation, escrow/payment state.
        "src/services/fees.ts": { lines: 95, functions: 95, branches: 90, statements: 95 },
        "src/services/payment.ts": { lines: 85, functions: 85, branches: 75, statements: 85 },
        // Auth: password hashing, token issuance/rotation, middleware gate.
        "src/services/auth.ts": { lines: 90, functions: 90, branches: 80, statements: 90 },
        "src/middlewares/auth.ts": { lines: 90, functions: 90, branches: 80, statements: 90 },
        // State: the booking legal-transition graph.
        "src/services/booking.ts": { lines: 90, functions: 90, branches: 85, statements: 90 },
        // features.md Phase 16 (FA-5): the deferred-account, escrow-first guest
        // checkout — money + auth-adjacent (auto-creates a User/Client), same bar
        // as services/booking.ts.
        "src/services/externalBooking.ts": { lines: 90, functions: 90, branches: 85, statements: 90 },
      },
    },
  },
});
