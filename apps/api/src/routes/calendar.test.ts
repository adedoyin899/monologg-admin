import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import { generateAccessToken } from "../services/auth.js";

vi.mock("../db/client.js", () => ({
  prisma: {
    calendarConnection: { upsert: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
  },
}));

import { prisma } from "../db/client.js";
import { mockCacheProvider } from "../providers/cache.mock.js";
import { encrypt } from "../lib/encryption.js";
import { MOCK_REVOKED_REFRESH_TOKEN } from "../providers/calendar.mock.js";

const prismaMock = prisma as any;

const TALENT_TOKEN = generateAccessToken({ userId: "user-talent-1", userType: "TALENT", email: "t@monologg.dev" });

describe("Calendar routes (features.md Phase 8)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
    mockCacheProvider.clear();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /calendar/connect", () => {
    it("401s without a token", async () => {
      const response = await app.inject({ method: "POST", url: "/api/v1/calendar/connect" });
      expect(response.statusCode).toBe(401);
    });

    it("returns a Google authUrl and caches state -> userId", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/calendar/connect",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      const { authUrl } = response.json();
      expect(authUrl).toContain("mock.accounts.google.com");
      const state = new URL(authUrl).searchParams.get("state")!;
      expect(await mockCacheProvider.get(`calendar:oauth:${state}`)).toBe("user-talent-1");
    });
  });

  describe("GET /calendar/callback", () => {
    it("400s a missing code/state", async () => {
      const response = await app.inject({ method: "GET", url: "/api/v1/calendar/callback" });
      expect(response.statusCode).toBe(400);
    });

    it("400s an invalid/expired state", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/calendar/callback?code=abc&state=never-issued",
      });
      expect(response.statusCode).toBe(400);
    });

    it("completes the connection for a valid state + code — no auth header needed (Google redirects the browser)", async () => {
      await mockCacheProvider.set("calendar:oauth:state-1", "user-talent-1", 600);
      prismaMock.calendarConnection.upsert.mockResolvedValue({});

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/calendar/callback?code=auth-code-1&state=state-1",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ connected: true });
      expect(prismaMock.calendarConnection.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-talent-1" } }),
      );
    });
  });

  describe("POST /calendar/disconnect", () => {
    it("401s without a token", async () => {
      const response = await app.inject({ method: "POST", url: "/api/v1/calendar/disconnect" });
      expect(response.statusCode).toBe(401);
    });

    it("revokes the caller's own connection", async () => {
      prismaMock.calendarConnection.updateMany.mockResolvedValue({ count: 1 });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/calendar/disconnect",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(prismaMock.calendarConnection.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-talent-1" },
        data: { status: "REVOKED", revokedAt: expect.any(Date) },
      });
    });
  });

  describe("GET /calendar/status", () => {
    it("reports not connected when no row exists", async () => {
      prismaMock.calendarConnection.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/calendar/status",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ connected: false });
    });
  });

  describe("GET /calendar/busy-times", () => {
    it("400s a missing/invalid date", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/calendar/busy-times?date=not-a-date",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });
      expect(response.statusCode).toBe(400);
    });

    it("404s when the user has never connected a calendar", async () => {
      prismaMock.calendarConnection.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/calendar/busy-times?date=2026-08-01",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns real busy times from the mock provider when connected", async () => {
      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        status: "CONNECTED",
        encryptedRefreshToken: encrypt("some-refresh-token"),
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/calendar/busy-times?date=2026-08-01",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().busyTimes).toEqual([
        { start: "2026-08-01T09:00:00.000Z", end: "2026-08-01T09:30:00.000Z" },
      ]);
    });

    it("409s with reconnectRequired when access was revoked — degrades gracefully, not a raw 500", async () => {
      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        status: "CONNECTED",
        encryptedRefreshToken: encrypt(MOCK_REVOKED_REFRESH_TOKEN),
      });
      prismaMock.calendarConnection.updateMany.mockResolvedValue({ count: 1 });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/calendar/busy-times?date=2026-08-01",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().reconnectRequired).toBe(true);
    });
  });
});
