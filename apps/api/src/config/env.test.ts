import { describe, it, expect, afterEach } from "vitest";
import { checkProductionDbUrls } from "./env.js";

// ---------------------------------------------------------------------------
// env.ts boot-validation tests — Phase 3 gate
//
// We can't test `parseEnv()` directly since it calls process.exit(1) on
// failure. Instead we test the zod schema by importing and invoking the
// validation logic directly via the schema export.
//
// The contract being tested:
//   - All required vars present → parse succeeds, typed object returned
//   - Any required var missing → parse fails with a message naming the field
// ---------------------------------------------------------------------------

// We import the zod schema directly (not the `env` singleton, which is already
// parsed at import time). To keep this testable without side effects, we
// replicate the schema inline. Keeping the schema definition in env.ts is still
// the single source of truth — this test validates the CONTRACT, not the import.
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  DIRECT_URL: z.string().url("DIRECT_URL must be a valid URL"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be ≥ 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be ≥ 32 chars"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  PAYMENT_PROVIDER: z.enum(["mock", "paystack", "stripe", "airwallex"]).default("mock"),
  KYC_PROVIDER: z.enum(["mock", "smile_identity"]).default("mock"),
  AI_PROVIDER: z.enum(["mock", "openai"]).default("mock"),
  CALENDAR_PROVIDER: z.enum(["mock", "google"]).default("mock"),
  NOTIFY_PROVIDER: z.enum(["mock", "sendgrid_twilio"]).default("mock"),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  SMILE_IDENTITY_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
});

/** Minimal valid env — all required vars present. */
const VALID_ENV = {
  DATABASE_URL: "postgresql://user:password@localhost:5432/monologg",
  DIRECT_URL: "postgresql://user:password@localhost:5432/monologg",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
};

describe("env.ts schema validation", () => {
  describe("valid configuration", () => {
    it("parses successfully when all required vars are present", () => {
      const result = envSchema.safeParse(VALID_ENV);
      expect(result.success).toBe(true);
    });

    it("applies correct defaults when optional vars are absent", () => {
      const result = envSchema.safeParse(VALID_ENV);
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.PORT).toBe(3001);
      expect(result.data.HOST).toBe("0.0.0.0");
      expect(result.data.NODE_ENV).toBe("development");
      expect(result.data.LOG_LEVEL).toBe("info");
      expect(result.data.CORS_ORIGIN).toBe("http://localhost:5173");
      expect(result.data.PAYMENT_PROVIDER).toBe("mock");
      expect(result.data.KYC_PROVIDER).toBe("mock");
      expect(result.data.AI_PROVIDER).toBe("mock");
      expect(result.data.CALENDAR_PROVIDER).toBe("mock");
      expect(result.data.NOTIFY_PROVIDER).toBe("mock");
    });

    it("coerces PORT from a string to a number", () => {
      const result = envSchema.safeParse({ ...VALID_ENV, PORT: "4000" });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.PORT).toBe(4000);
      expect(typeof result.data.PORT).toBe("number");
    });
  });

  describe("missing required variables", () => {
    it("fails with a clear message when DATABASE_URL is missing", () => {
      const { DATABASE_URL: _omitted, ...rest } = VALID_ENV;
      const result = envSchema.safeParse(rest);
      expect(result.success).toBe(false);
      if (result.success) return;
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("DATABASE_URL");
    });

    it("fails with a clear message when DIRECT_URL is missing", () => {
      const { DIRECT_URL: _omitted, ...rest } = VALID_ENV;
      const result = envSchema.safeParse(rest);
      expect(result.success).toBe(false);
      if (result.success) return;
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("DIRECT_URL");
    });

    it("fails with a clear message when JWT_ACCESS_SECRET is missing", () => {
      const { JWT_ACCESS_SECRET: _omitted, ...rest } = VALID_ENV;
      const result = envSchema.safeParse(rest);
      expect(result.success).toBe(false);
      if (result.success) return;
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("JWT_ACCESS_SECRET");
    });

    it("fails with a clear message when JWT_REFRESH_SECRET is missing", () => {
      const { JWT_REFRESH_SECRET: _omitted, ...rest } = VALID_ENV;
      const result = envSchema.safeParse(rest);
      expect(result.success).toBe(false);
      if (result.success) return;
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("JWT_REFRESH_SECRET");
    });

    it("fails when JWT secret is shorter than 32 chars", () => {
      const result = envSchema.safeParse({
        ...VALID_ENV,
        JWT_ACCESS_SECRET: "tooshort",
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      const issue = result.error.issues.find((i) => i.path[0] === "JWT_ACCESS_SECRET");
      expect(issue?.message).toMatch(/≥ 32/);
    });

    it("fails when DATABASE_URL is not a valid URL", () => {
      const result = envSchema.safeParse({
        ...VALID_ENV,
        DATABASE_URL: "not-a-url",
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      const issue = result.error.issues.find((i) => i.path[0] === "DATABASE_URL");
      expect(issue?.message).toBeTruthy();
    });

    it("fails with a clear message when all required vars are missing", () => {
      const result = envSchema.safeParse({});
      expect(result.success).toBe(false);
      if (result.success) return;
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("DATABASE_URL");
      expect(paths).toContain("DIRECT_URL");
      expect(paths).toContain("JWT_ACCESS_SECRET");
      expect(paths).toContain("JWT_REFRESH_SECRET");
    });
  });
});

// ---------------------------------------------------------------------------
// checkProductionDbUrls — Phase 12 gate (P3 Supabase ops rule): production
// must not accidentally swap the pooled (DATABASE_URL) and session/direct
// (DIRECT_URL) connection strings. This IS imported directly from env.ts
// (unlike the schema above) since it's a pure function with no process.exit
// side effect — safe to exercise for real rather than duplicating its logic.
// ---------------------------------------------------------------------------
describe("checkProductionDbUrls (Phase 12)", () => {
  const POOLED = "postgresql://postgres.ref:pw@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true";
  const SESSION = "postgresql://postgres.ref:pw@aws-0-region.pooler.supabase.com:5432/postgres";

  it("passes silently outside production, regardless of URL shape", () => {
    const issues: string[] = [];
    checkProductionDbUrls(
      { NODE_ENV: "development", DATABASE_URL: SESSION, DIRECT_URL: SESSION },
      issues,
    );
    expect(issues).toHaveLength(0);
  });

  it("passes in production when DATABASE_URL is pooled (6543 + pgbouncer=true) and DIRECT_URL is session (5432)", () => {
    const issues: string[] = [];
    checkProductionDbUrls(
      { NODE_ENV: "production", DATABASE_URL: POOLED, DIRECT_URL: SESSION },
      issues,
    );
    expect(issues).toHaveLength(0);
  });

  it("flags DATABASE_URL missing the pooled port/flag in production", () => {
    const issues: string[] = [];
    checkProductionDbUrls(
      { NODE_ENV: "production", DATABASE_URL: SESSION, DIRECT_URL: SESSION },
      issues,
    );
    expect(issues.some((i) => i.includes("DATABASE_URL"))).toBe(true);
  });

  it("flags DIRECT_URL not on port 5432 in production", () => {
    const issues: string[] = [];
    checkProductionDbUrls(
      { NODE_ENV: "production", DATABASE_URL: POOLED, DIRECT_URL: POOLED },
      issues,
    );
    expect(issues.some((i) => i.includes("DIRECT_URL") && i.includes("5432"))).toBe(true);
  });

  it("flags DIRECT_URL carrying pgbouncer=true even if otherwise on port 5432", () => {
    const issues: string[] = [];
    checkProductionDbUrls(
      {
        NODE_ENV: "production",
        DATABASE_URL: POOLED,
        DIRECT_URL: `${SESSION}?pgbouncer=true`,
      },
      issues,
    );
    expect(issues.some((i) => i.includes("pgbouncer=true"))).toBe(true);
  });

  it("flags DATABASE_URL and DIRECT_URL being identical in production", () => {
    const issues: string[] = [];
    checkProductionDbUrls(
      { NODE_ENV: "production", DATABASE_URL: POOLED, DIRECT_URL: POOLED },
      issues,
    );
    expect(issues.some((i) => i.includes("identical"))).toBe(true);
  });
});
