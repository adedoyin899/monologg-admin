import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "./app.js";
import { __resetMetricsForTest } from "./lib/metrics.js";

// ---------------------------------------------------------------------------
// Cross-cutting hardening tests — features.md Phase 12 gate:
//   "Added cross-cutting tests: security headers present, CORS locked, rate
//    limits enforced, no PII in logs."
// (Rate-limit enforcement and no-PII-in-logs already have dedicated coverage
// in routes/auth.test.ts's "CORS and Rate Limits" / "Sanitized Logs" suites —
// this file covers what those don't: headers on a non-auth route, CSP, the
// request-id correlation header, and the new /ready + /metrics routes.)
// ---------------------------------------------------------------------------

vi.mock("./db/client.js", () => ({
  prisma: { $queryRaw: vi.fn() },
}));

import { prisma } from "./db/client.js";

describe("Phase 12 hardening — cross-cutting", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    __resetMetricsForTest();
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  describe("Security headers", () => {
    it("sets Helmet's core secure headers on an ordinary route", async () => {
      const response = await app.inject({ method: "GET", url: "/api/v1/health" });
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.headers["x-frame-options"]).toBeTruthy();
      expect(response.headers["strict-transport-security"]).toBeTruthy();
    });

    it("sets a strict Content-Security-Policy (default-src 'none') since this is a pure JSON API", async () => {
      const response = await app.inject({ method: "GET", url: "/api/v1/health" });
      expect(response.headers["content-security-policy"]).toContain("default-src 'none'");
    });

    it("echoes a per-request x-request-id header for log correlation", async () => {
      const response = await app.inject({ method: "GET", url: "/api/v1/health" });
      expect(response.headers["x-request-id"]).toBeTruthy();
    });

    it("issues a different x-request-id per request", async () => {
      const [a, b] = await Promise.all([
        app.inject({ method: "GET", url: "/api/v1/health" }),
        app.inject({ method: "GET", url: "/api/v1/health" }),
      ]);
      expect(a.headers["x-request-id"]).not.toBe(b.headers["x-request-id"]);
    });
  });

  describe("CORS", () => {
    it("reflects the configured origin, not an arbitrary requester's origin", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/health",
        headers: { origin: "http://localhost:5173" },
      });
      expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    });

    it("does not reflect an unrecognised origin", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/health",
        headers: { origin: "https://evil.example.com" },
      });
      expect(response.headers["access-control-allow-origin"]).not.toBe("https://evil.example.com");
    });
  });

  describe("GET /api/v1/ready", () => {
    it("returns 200 { ok: true, db: 'up' } when the DB round-trip succeeds", async () => {
      const response = await app.inject({ method: "GET", url: "/api/v1/ready" });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ ok: true, db: "up" });
    });

    it("returns 503 when the DB round-trip fails", async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error("down"));
      const response = await app.inject({ method: "GET", url: "/api/v1/ready" });
      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({ ok: false, db: "down" });
    });
  });

  describe("GET /api/v1/metrics", () => {
    it("reflects request volume and status class after traffic", async () => {
      await app.inject({ method: "GET", url: "/api/v1/health" });
      await app.inject({ method: "GET", url: "/api/v1/does-not-exist" });

      const response = await app.inject({ method: "GET", url: "/api/v1/metrics" });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      // The onResponse hook records a request only after its own response is
      // sent, so /metrics' own snapshot reflects the 2 prior calls, not itself.
      expect(body.requests.total).toBeGreaterThanOrEqual(2);
      expect(body.requests.byStatusClass["2xx"]).toBeGreaterThanOrEqual(1);
      expect(body.requests.byStatusClass["4xx"]).toBeGreaterThanOrEqual(1);
      expect(body.payments).toMatchObject({ escrow_locked: 0, released: 0, refunded: 0 });
      expect(body.payments.successRate).toBeNull(); // no terminal payment outcomes yet
    });
  });
});
