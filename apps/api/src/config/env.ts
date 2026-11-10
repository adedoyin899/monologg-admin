import { z } from "zod";

// ---------------------------------------------------------------------------
// Boot-time environment validation
// Every required variable is declared here. Any missing/malformed var causes
// the process to exit with a clear, specific message before the server binds.
// ---------------------------------------------------------------------------

const envSchema = z.object({
  // ── Server ──────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  // ── Database ─────────────────────────────────────────────────────────────
  // Both vars come from Supabase; see apps/api/.env.example for format.
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  DIRECT_URL: z.string().url("DIRECT_URL must be a valid URL"),

  // ── Auth (JWT) ───────────────────────────────────────────────────────────
  // Phase 4 will use these; defined here so the server fails fast if missing.
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be ≥ 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be ≥ 32 chars"),

  // ── CORS ─────────────────────────────────────────────────────────────────
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  // ── Provider selection ───────────────────────────────────────────────────
  // Each defaults to "mock" so dev + test work without real API keys.
  PAYMENT_PROVIDER: z.enum(["mock", "paystack", "stripe", "airwallex"]).default("mock"),
  KYC_PROVIDER: z.enum(["mock", "smile_identity"]).default("mock"),
  AI_PROVIDER: z.enum(["mock", "openai"]).default("mock"),
  CALENDAR_PROVIDER: z.enum(["mock", "google"]).default("mock"),
  NOTIFY_PROVIDER: z.enum(["mock", "sendgrid_twilio"]).default("mock"),
  CACHE_PROVIDER: z.enum(["mock", "redis"]).default("mock"),
  STORAGE_PROVIDER: z.enum(["mock", "s3"]).default("mock"),
  // features.md Phase 12A: virus/malware scanning for Media Kit PDF uploads.
  SCANNER_PROVIDER: z.enum(["mock", "clamav"]).default("mock"),
  // Phase 9: the async job queue email/SMS delivery runs through (src/jobs/).
  // Not one of the *Provider interfaces above — features.md's own architecture
  // section lists "jobs" as a separate concern from "providers" — but the same
  // mock-in-test/real-in-prod selection convention applies.
  JOB_QUEUE_PROVIDER: z.enum(["mock", "bullmq"]).default("mock"),

  // ── Redis Cache (optional, used when CACHE_PROVIDER is "redis") ──────────
  REDIS_URL: z.string().optional(),

  // ── External service keys (optional — only validated when provider≠mock) ─
  PAYSTACK_SECRET_KEY: z.string().optional(),
  SMILE_IDENTITY_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  // ── Encryption (Phase 8: encrypts CalendarConnection.encryptedRefreshToken) ─
  // 64 hex chars = 32 bytes, for AES-256-GCM. Generate with: openssl rand -hex 32
  CALENDAR_TOKEN_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, "CALENDAR_TOKEN_ENCRYPTION_KEY must be 64 hex chars (32 bytes)")
    .optional(),
  SENDGRID_API_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  // ── Support (Phase 10) ──────────────────────────────────────────────────────
  // Optional — when unset, new tickets simply aren't relayed to an internal
  // inbox (the ticket + confirmation email to the submitter still work).
  SUPPORT_INBOX_EMAIL: z.string().email().optional(),

  // ── Observability (Phase 12) ─────────────────────────────────────────────
  // Optional — error tracking is a no-op (logged locally only) when unset, in
  // dev/test and even in prod (fails open: a missing DSN degrades observability,
  // never availability).
  SENTRY_DSN: z.string().optional(),

  // ── Supabase Auth (Phase 12B) ─────────────────────────────────────────────
  // SUPABASE_MODE controls the provider seam exactly like PAYMENT_PROVIDER etc:
  //   "mock"  → all tests and ALL-MOCK dev work with zero real Supabase keys.
  //   "real"  → production: requires the three vars below.
  SUPABASE_MODE: z.enum(["mock", "real"]).default("mock"),
  // SUPABASE_URL + SUPABASE_ANON_KEY: client-safe (also in apps/web/.env*).
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  // SUPABASE_SERVICE_ROLE_KEY: SERVER-SIDE ONLY — never ship to the client.
  // Has full database bypass; only used server-side for Admin API calls if needed.
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  // The secret used to verify Supabase-issued HS256 JWTs.
  SUPABASE_JWT_SECRET: z.string().optional(),
  // ── Withdrawal OTP (Phase 12C) ───────────────────────────────────────────
  // WITHDRAWAL_OTP_MODE controls OTP delivery:
  //   "mock" (default) → logs code to pino + writes Notification row of kind WITHDRAWAL_OTP
  //   "live"           → fires NotifyProvider.email()
  WITHDRAWAL_OTP_MODE: z.enum(["mock", "live"]).default("mock"),

  // ── Admin Stack (Phase A1 / A2) ───────────────────────────────────────────
  ADMIN_AUTH_PROVIDER: z.enum(["supabase", "clerk", "mock"]).default("supabase"),
  ADMIN_ALLOWED_EMAILS: z
    .string()
    .default("")
    .transform((s) => (s ? s.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean) : [])),
  ADMIN_CORS_ORIGIN: z.string().default("http://localhost:3000"),
  ADMIN_DATABASE_URL: z.string().url("ADMIN_DATABASE_URL must be a valid URL").optional(),
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().default("https://app.posthog.com"),
  POSTHOG_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1")
    .default("false"),
});

export type Env = z.infer<typeof envSchema>;

// ---------------------------------------------------------------------------
// Production-only cross-field checks (Phase 12 — P3 Supabase ops rule): the
// pooled/direct URLs are easy to swap by accident since both point at the same
// Supabase project host. DATABASE_URL must be the transaction-mode pooler
// (port 6543, pgbouncer=true) that Prisma's query engine uses at request time;
// DIRECT_URL must be the session-mode connection (port 5432, no pgbouncer=true)
// that `prisma migrate`/advisory-lock-requiring operations need. Getting these
// backwards silently breaks migrations or, worse, exhausts pooled connections
// by routing every request through the session pooler. See apps/api/README.md
// "Supabase operational notes" for the full pooled-vs-direct rationale.
// ---------------------------------------------------------------------------
export function checkProductionDbUrls(envData: Record<string, string | undefined>, issues: string[]): void {
  if (envData.NODE_ENV !== "production") return;

  const dbUrl = envData.DATABASE_URL ?? "";
  const directUrl = envData.DIRECT_URL ?? "";

  if (!dbUrl.includes(":6543") || !dbUrl.includes("pgbouncer=true")) {
    issues.push(
      "  • DATABASE_URL: in production this must be the Supabase transaction pooler (port 6543, `?pgbouncer=true`) — got a URL missing one or both markers.",
    );
  }
  if (!directUrl.includes(":5432")) {
    issues.push(
      "  • DIRECT_URL: in production this must be the Supabase session pooler/direct connection (port 5432) — got a URL not on port 5432.",
    );
  }
  if (directUrl.includes("pgbouncer=true")) {
    issues.push(
      "  • DIRECT_URL: must NOT include `pgbouncer=true` — that flag belongs on DATABASE_URL only; DIRECT_URL needs session semantics (prepared statements, advisory locks) for migrations.",
    );
  }
  if (dbUrl && directUrl && dbUrl === directUrl) {
    issues.push(
      "  • DATABASE_URL and DIRECT_URL: must not be identical in production — one is the pooled connection, the other the session/direct one.",
    );
  }
}

// ---------------------------------------------------------------------------
// Validate and export. Throws (and exits) at module-load time if any required
// var is absent, so nothing else in the codebase can run with a broken config.
// ---------------------------------------------------------------------------
function parseEnv(): Env {
  const envData = { ...process.env };
  if (envData.NODE_ENV === "test") {
    envData.DATABASE_URL = envData.DATABASE_URL || "postgresql://mock:mock@localhost:5432/mock";
    envData.DIRECT_URL = envData.DIRECT_URL || "postgresql://mock:mock@localhost:5432/mock";
    envData.JWT_ACCESS_SECRET = envData.JWT_ACCESS_SECRET || "mock_access_secret_length_minimum_32_chars";
    envData.JWT_REFRESH_SECRET = envData.JWT_REFRESH_SECRET || "mock_refresh_secret_length_minimum_32_chars";
    envData.CALENDAR_TOKEN_ENCRYPTION_KEY =
      envData.CALENDAR_TOKEN_ENCRYPTION_KEY || "0".repeat(63) + "1"; // 64 hex chars, test-only
    // Phase 12B: always use mock Supabase in tests — zero real keys required.
    envData.SUPABASE_MODE = envData.SUPABASE_MODE || "mock";
    envData.SUPABASE_JWT_SECRET = envData.SUPABASE_JWT_SECRET || "mock_supabase_jwt_secret_for_tests_only_32";
    // Phase 12C: always use mock withdrawal OTP mode in tests
    envData.WITHDRAWAL_OTP_MODE = envData.WITHDRAWAL_OTP_MODE || "mock";
  }

  const result = envSchema.safeParse(envData);
  const issues = result.success
    ? []
    : result.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`);
  if (result.success) {
    checkProductionDbUrls(envData, issues);
  }

  if (issues.length > 0) {
    // Print to stderr and exit — don't throw, since a top-level throw won't
    // always produce a readable message in all Node runners.
    process.stderr.write(`\n[config/env] Invalid environment configuration:\n${issues.join("\n")}\n\n`);
    process.exit(1);
  }
  return result.data as Env;
}

export const env = parseEnv();
