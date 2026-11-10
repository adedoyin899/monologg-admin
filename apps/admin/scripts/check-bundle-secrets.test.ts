import { describe, it, expect } from "vitest";

describe("Bundle Secret Scanner Rule", () => {
  const FORBIDDEN_PATTERNS = [
    /CRON_SECRET/i,
    /service_role/i,
    /SUPABASE_SERVICE_ROLE_KEY/i,
    /R2_SECRET_ACCESS_KEY/i,
    /sk_live_[0-9a-zA-Z]{20,}/,
    /postgresql:\/\/[^:]+:[^@]+@/,
  ];

  it("detects forbidden service role keys", () => {
    const bundleSnippet = 'const key = "SUPABASE_SERVICE_ROLE_KEY_abcdef123456";';
    const found = FORBIDDEN_PATTERNS.some((p) => p.test(bundleSnippet));
    expect(found).toBe(true);
  });

  it("detects CRON_SECRET references", () => {
    const bundleSnippet = 'const cron = "CRON_SECRET=super_secret_cron_key";';
    const found = FORBIDDEN_PATTERNS.some((p) => p.test(bundleSnippet));
    expect(found).toBe(true);
  });

  it("detects raw postgres connection strings", () => {
    const bundleSnippet = 'const db = "postgresql://postgres:secret@db.supabase.co:5432/postgres";';
    const found = FORBIDDEN_PATTERNS.some((p) => p.test(bundleSnippet));
    expect(found).toBe(true);
  });

  it("passes clean client code", () => {
    const bundleSnippet = 'console.log("Welcome to Monologg Admin!"); const api = "/api/v1/admin/me";';
    const found = FORBIDDEN_PATTERNS.some((p) => p.test(bundleSnippet));
    expect(found).toBe(false);
  });
});

