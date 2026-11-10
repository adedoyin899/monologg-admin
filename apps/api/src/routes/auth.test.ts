import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import { hashPassword, generateRefreshToken, hashToken } from "../services/auth.js";
import { mockCacheProvider } from "../providers/cache.mock.js";
import { mockNotifyProvider } from "../providers/notify.mock.js";
import { CURRENT_TERMS_VERSION } from "@monologg/types";
import { requireAuth } from "../middlewares/auth.js";

// Mock the Prisma client so routes do not connect to a real database during tests
vi.mock("../db/client.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    creator: {
      findUnique: vi.fn(),
    },
    client: {
      findUnique: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    termsAcceptance: {
      create: vi.fn().mockResolvedValue({}),
    },
    userAcquisition: {
      create: vi.fn().mockResolvedValue({}),
    },
    // Supports both Prisma $transaction overloads: a callback (register) and an
    // array of already-invoked query promises (reset-password).
    $transaction: vi.fn((arg) =>
      Array.isArray(arg) ? Promise.all(arg) : arg(prismaMock),
    ),
  },
}));

import { prisma } from "../db/client.js";

// Re-expose mock functions
const prismaMock = prisma as any;

describe("Authentication Endpoint Integration & Security Hardening", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    mockCacheProvider.clear();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /api/v1/auth/register", () => {
    it("successfully registers a new talent creator user", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create = vi.fn().mockResolvedValue({
        id: "new-user-id",
        email: "artist@monologg.dev",
        userType: "TALENT",
        emailVerified: false,
      });
      prismaMock.creator.create = vi.fn().mockResolvedValue({ id: "new-creator-id" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: "artist@monologg.dev",
          password: "password123",
          userType: "TALENT",
          name: "John Doe",
          location: "Lagos",
          niche: "VO_ARTIST",
          acceptedTermsVersion: CURRENT_TERMS_VERSION,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.userId).toBe("new-user-id");
      expect(body.email).toBe("artist@monologg.dev");
      expect(body.userType).toBe("TALENT");
    });

    it("features.md Phase 10: records terms acceptance with version + timestamp", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create = vi.fn().mockResolvedValue({
        id: "new-user-id",
        email: "artist@monologg.dev",
        userType: "TALENT",
        emailVerified: false,
      });
      prismaMock.creator.create = vi.fn().mockResolvedValue({ id: "new-creator-id" });

      await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: "artist@monologg.dev",
          password: "password123",
          userType: "TALENT",
          name: "John Doe",
          acceptedTermsVersion: CURRENT_TERMS_VERSION,
        },
      });

      expect(prismaMock.termsAcceptance.create).toHaveBeenCalledWith({
        data: { userId: "new-user-id", version: CURRENT_TERMS_VERSION },
      });
      // acceptedAt itself is a DB default (DateTime @default(now())), not passed
      // explicitly — asserting the call omits it confirms we rely on that default
      // rather than a client-suppliable timestamp.
      const call = prismaMock.termsAcceptance.create.mock.calls[0][0];
      expect(call.data).not.toHaveProperty("acceptedAt");
    });

    it("400s registration with no terms acceptance at all", async () => {
      prismaMock.user.create = vi.fn();

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: "no-terms@monologg.dev",
          password: "password123",
          userType: "TALENT",
          name: "No Terms",
        },
      });

      expect(response.statusCode).toBe(400);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it("succeeds with only the fields AuthFlow.tsx's sign-up form actually collects (no location/niche/org)", async () => {
      // Regression test: the real registration form only has name/email/password/role
      // plus the Terms/Privacy acceptance checkbox — location, niche, and org fields
      // are collected later in onboarding, not at sign-up.
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create = vi.fn().mockResolvedValue({
        id: "minimal-user-id",
        email: "minimal@monologg.dev",
        userType: "CLIENT",
        emailVerified: false,
      });
      prismaMock.client.create = vi.fn().mockResolvedValue({ id: "minimal-client-id" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: "minimal@monologg.dev",
          password: "password123",
          userType: "CLIENT",
          name: "Jane Client",
          acceptedTermsVersion: CURRENT_TERMS_VERSION,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(prismaMock.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ location: "" }),
        }),
      );
    });

    it("returns 409 error if email is already in use (user enumeration safety)", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: "existing-id" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: "already@registered.com",
          password: "password123",
          userType: "TALENT",
          name: "Already Registred",
          location: "Accra",
          acceptedTermsVersion: CURRENT_TERMS_VERSION,
        },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().message).toBe("Email is already registered");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("returns 200 with tokens on correct credentials", async () => {
      const password = "mysecretpassword";
      const hash = await hashPassword(password);

      prismaMock.user.findUnique.mockResolvedValue({
        id: "user-id-abc",
        email: "talent@monologg.dev",
        passwordHash: hash,
        userType: "TALENT",
        passwordSet: true,
      });
      prismaMock.refreshToken.create.mockResolvedValue({ id: "token-record-id" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "talent@monologg.dev",
          password,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.user.userId).toBe("user-id-abc");
    });

    it("prevents user enumeration by returning generic error message for invalid credentials", async () => {
      // User not found in DB
      prismaMock.user.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "nonexisting@monologg.dev",
          password: "password123",
        },
      });

      // Output must be 401 Unauthorized with generic message
      expect(response.statusCode).toBe(401);
      expect(response.json().message).toBe("Invalid email or password");
    });

    // features.md Phase 16 (FA-5): an AUTO_CHECKOUT account (services/externalBooking.ts)
    // has no real password until the emailed set-password link is used — login must
    // refuse it even with the correct-looking flow, same generic error as a wrong
    // password (enumeration-safe: doesn't reveal the account exists but isn't set up).
    it("refuses login for an account with passwordSet:false, even if a password happens to verify", async () => {
      const password = "mysecretpassword";
      const hash = await hashPassword(password);

      prismaMock.user.findUnique.mockResolvedValue({
        id: "auto-checkout-user",
        email: "guest@monologg.dev",
        passwordHash: hash,
        userType: "CLIENT",
        passwordSet: false,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: "guest@monologg.dev", password },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().message).toBe("Invalid email or password");
    });
  });

  describe("POST /api/v1/auth/refresh (Rotation & Reuse Revocation)", () => {
    it("successfully rotates tokens for a valid refresh token", async () => {
      const oldToken = generateRefreshToken("user-id-xyz", "jti-1");
      const oldHash = hashToken(oldToken);

      prismaMock.refreshToken.findFirst.mockResolvedValue({
        id: "record-id-1",
        userId: "user-id-xyz",
        tokenHash: oldHash,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000000),
      });

      prismaMock.user.findUniqueOrThrow.mockResolvedValue({
        id: "user-id-xyz",
        email: "xyz@monologg.dev",
        userType: "TALENT",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        payload: { refreshToken: oldToken },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(prismaMock.refreshToken.update).toHaveBeenCalled();
      expect(prismaMock.refreshToken.create).toHaveBeenCalled();
    });

    it("REUSE DETECTION: revokes all tokens for the user family if refresh token was already revoked", async () => {
      const reusedToken = generateRefreshToken("user-id-abc", "jti-reused");
      const reusedHash = hashToken(reusedToken);

      prismaMock.refreshToken.findFirst.mockResolvedValue({
        id: "reused-record-id",
        userId: "user-id-abc",
        tokenHash: reusedHash,
        revokedAt: new Date(), // Already revoked!
        expiresAt: new Date(Date.now() + 1000000),
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        payload: { refreshToken: reusedToken },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().message).toContain("Token reuse detected");
      // All family tokens for user-id-abc must be marked as revoked
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-id-abc" },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      });
    });
  });

  describe("Forgot Password User Enumeration Protection", () => {
    it("returns 200 success message even if email does not exist", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/forgot-password",
        payload: { email: "fakeuser@notexists.com" },
      });

      // Status must be 200 success with generic message
      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
      expect(response.json().message).toContain("If the email is registered");
    });

    it("sends a reset email with a real token when the user exists", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: "user-real", email: "real@monologg.dev" });
      const emailSpy = vi.spyOn(mockNotifyProvider, "email");

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/forgot-password",
        payload: { email: "real@monologg.dev" },
      });

      expect(response.statusCode).toBe(200);
      expect(emailSpy).toHaveBeenCalledWith(
        "real@monologg.dev",
        "reset_password",
        expect.objectContaining({ token: expect.any(String) }),
      );
    });
  });

  describe("POST /api/v1/auth/verify-email", () => {
    it("marks the user verified given a valid token and clears it from cache", async () => {
      await mockCacheProvider.set("auth:verify:good-token", "user-to-verify", 3600);
      prismaMock.user.update.mockResolvedValue({ id: "user-to-verify", emailVerified: true });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/verify-email",
        payload: { token: "good-token" },
      });

      expect(response.statusCode).toBe(200);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: "user-to-verify" },
        data: { emailVerified: true },
      });
      expect(await mockCacheProvider.get("auth:verify:good-token")).toBeNull();
    });

    it("rejects an invalid or expired verification token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/verify-email",
        payload: { token: "does-not-exist" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().message).toContain("Invalid or expired");
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/v1/auth/reset-password", () => {
    it("updates the password and revokes all refresh tokens given a valid token", async () => {
      await mockCacheProvider.set("auth:reset:good-reset-token", "user-resetting", 3600);
      prismaMock.user.update.mockResolvedValue({ id: "user-resetting" });
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/reset-password",
        payload: { token: "good-reset-token", password: "new-password-123" },
      });

      expect(response.statusCode).toBe(200);
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-resetting" },
          data: expect.objectContaining({ passwordSet: true }),
        }),
      );
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-resetting" },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      });
      expect(await mockCacheProvider.get("auth:reset:good-reset-token")).toBeNull();
    });

    // features.md Phase 16 (FA-5), PWA-19: this endpoint doubles as "set password"
    // for a guest-checkout account's emailed link — completing it must also log the
    // buyer in (the "magic link" behavior), not just change the password hash.
    it("also returns a fresh session — doubles as the PWA-19 set-password/magic-link flow", async () => {
      await mockCacheProvider.set("auth:reset:magic-token", "auto-checkout-user", 3600);
      prismaMock.user.update.mockResolvedValue({
        id: "auto-checkout-user",
        email: "guest@monologg.dev",
        userType: "CLIENT",
      });
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.refreshToken.create.mockResolvedValue({ id: "new-refresh-token-record" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/reset-password",
        payload: { token: "magic-token", password: "brand-new-password" },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.user.userId).toBe("auto-checkout-user");
      expect(prismaMock.refreshToken.create).toHaveBeenCalled();
    });

    it("rejects an invalid or expired reset token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/reset-password",
        payload: { token: "not-a-real-token", password: "new-password-123" },
      });

      expect(response.statusCode).toBe(400);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it("rejects a password shorter than 8 characters", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/reset-password",
        payload: { token: "irrelevant", password: "short" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("revokes the refresh token in the DB and denylist", async () => {
      const token = generateRefreshToken("user-logging-out", "jti-logout");
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/logout",
        payload: { refreshToken: token },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: hashToken(token) },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      });
      expect(await mockCacheProvider.get(`auth:denylist:${hashToken(token)}`)).toBe("revoked");
    });

    it("succeeds even with no refresh token provided (idempotent no-op)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/logout",
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
    });
  });

  describe("CORS and Rate Limits", () => {
    it("returns CORS headers in response", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/health",
        headers: {
          origin: "http://localhost:5173",
        },
      });

      expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    });

    it("rate-limits repeated login attempts past the 10-per-window cap", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null); // every attempt is an invalid-credentials 401

      const responses = [];
      for (let i = 0; i < 11; i++) {
        responses.push(
          await app.inject({
            method: "POST",
            url: "/api/v1/auth/login",
            payload: { email: "attacker@example.com", password: "guess" },
          }),
        );
      }

      const statuses = responses.map((r) => r.statusCode);
      expect(statuses.slice(0, 10)).toEqual(Array(10).fill(401));
      expect(statuses[10]).toBe(429);
    });

    it("rate-limits repeated forgot-password attempts past the 10-per-window cap", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const responses = [];
      for (let i = 0; i < 11; i++) {
        responses.push(
          await app.inject({
            method: "POST",
            url: "/api/v1/auth/forgot-password",
            payload: { email: "enumerator@example.com" },
          }),
        );
      }

      const statuses = responses.map((r) => r.statusCode);
      expect(statuses.slice(0, 10)).toEqual(Array(10).fill(200));
      expect(statuses[10]).toBe(429);
    });
  });

  describe("Sanitized Logs (Security)", () => {
    it("never logs the raw password or raw tokens during register + login", async () => {
      const capturedLogs: string[] = [];
      const captureStream = {
        write(chunk: string) {
          capturedLogs.push(chunk);
          return true;
        },
      };

      const loggingApp = await buildApp({ logger: { level: "info", stream: captureStream } });
      await loggingApp.ready();

      const rawPassword = "super-secret-raw-password-1";
      prismaMock.user.findUnique.mockResolvedValueOnce(null); // register: no existing user
      prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(prismaMock));
      prismaMock.user.create = vi.fn().mockResolvedValue({
        id: "log-test-user",
        email: "logtest@monologg.dev",
        userType: "TALENT",
        emailVerified: false,
      });
      prismaMock.creator.create = vi.fn().mockResolvedValue({ id: "creator-id" });

      await loggingApp.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: "logtest@monologg.dev",
          password: rawPassword,
          userType: "TALENT",
          name: "Log Test",
          location: "Lagos",
          acceptedTermsVersion: CURRENT_TERMS_VERSION,
        },
      });

      const passwordHash = await hashPassword(rawPassword);
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: "log-test-user",
        email: "logtest@monologg.dev",
        passwordHash,
        userType: "TALENT",
      });
      prismaMock.refreshToken.create.mockResolvedValueOnce({ id: "rt-id" });

      const loginResponse = await loggingApp.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: "logtest@monologg.dev", password: rawPassword },
      });
      const { accessToken, refreshToken } = loginResponse.json();

      await loggingApp.close();

      const fullLog = capturedLogs.join("\n");
      expect(fullLog).not.toContain(rawPassword);
      expect(fullLog).not.toContain(accessToken);
      expect(fullLog).not.toContain(refreshToken);
    });
  });

  describe("Full end-to-end chain: register → verify-email → login → protected route → refresh → logout", () => {
    it("completes the entire auth lifecycle", async () => {
      // A dedicated instance, since the test-only protected route below must be
      // registered before .ready() — Fastify rejects adding routes afterward,
      // and the shared `app` from beforeEach is already listening by this point.
      const e2eApp = await buildApp({ logger: false });
      e2eApp.get("/api/v1/_test/protected", { preHandler: requireAuth }, async (req: any) => ({
        userId: req.user.userId,
      }));
      await e2eApp.ready();

      const setSpy = vi.spyOn(mockCacheProvider, "set");
      const rawPassword = "e2e-test-password-1";

      // ── Register ──
      prismaMock.user.findUnique.mockResolvedValueOnce(null);
      prismaMock.user.create = vi.fn().mockResolvedValue({
        id: "e2e-user",
        email: "e2e@monologg.dev",
        userType: "TALENT",
        emailVerified: false,
      });
      prismaMock.creator.create = vi.fn().mockResolvedValue({ id: "e2e-creator" });

      const registerResponse = await e2eApp.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: "e2e@monologg.dev",
          password: rawPassword,
          userType: "TALENT",
          name: "E2E Tester",
          location: "Lagos",
          acceptedTermsVersion: CURRENT_TERMS_VERSION,
        },
      });
      expect(registerResponse.statusCode).toBe(201);

      // Extract the real verify token the route generated and stored in cache.
      const verifyCall = setSpy.mock.calls.find(([key]) => key.startsWith("auth:verify:"));
      const verifyToken = verifyCall?.[0].replace("auth:verify:", "");
      expect(verifyToken).toBeTruthy();

      // ── Verify email ──
      prismaMock.user.update.mockResolvedValue({ id: "e2e-user", emailVerified: true });
      const verifyResponse = await e2eApp.inject({
        method: "POST",
        url: "/api/v1/auth/verify-email",
        payload: { token: verifyToken },
      });
      expect(verifyResponse.statusCode).toBe(200);

      // ── Login ──
      const passwordHash = await hashPassword(rawPassword);
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: "e2e-user",
        email: "e2e@monologg.dev",
        passwordHash,
        userType: "TALENT",
        passwordSet: true,
      });
      prismaMock.refreshToken.create.mockResolvedValueOnce({ id: "rt-1" });

      const loginResponse = await e2eApp.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: "e2e@monologg.dev", password: rawPassword },
      });
      expect(loginResponse.statusCode).toBe(200);
      const { accessToken, refreshToken } = loginResponse.json();

      // ── Hit a protected route with the access token ──
      const protectedNoToken = await e2eApp.inject({ method: "GET", url: "/api/v1/_test/protected" });
      expect(protectedNoToken.statusCode).toBe(401);

      const protectedWithToken = await e2eApp.inject({
        method: "GET",
        url: "/api/v1/_test/protected",
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(protectedWithToken.statusCode).toBe(200);
      expect(protectedWithToken.json().userId).toBe("e2e-user");

      // ── Refresh ──
      prismaMock.refreshToken.findFirst.mockResolvedValueOnce({
        id: "rt-1",
        userId: "e2e-user",
        tokenHash: hashToken(refreshToken),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000000),
      });
      prismaMock.user.findUniqueOrThrow.mockResolvedValueOnce({
        id: "e2e-user",
        email: "e2e@monologg.dev",
        userType: "TALENT",
      });
      prismaMock.refreshToken.create.mockResolvedValueOnce({ id: "rt-2" });

      const refreshResponse = await e2eApp.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        payload: { refreshToken },
      });
      expect(refreshResponse.statusCode).toBe(200);
      const newRefreshToken = refreshResponse.json().refreshToken;

      // ── Logout ──
      prismaMock.refreshToken.updateMany.mockResolvedValueOnce({ count: 1 });
      const logoutResponse = await e2eApp.inject({
        method: "POST",
        url: "/api/v1/auth/logout",
        payload: { refreshToken: newRefreshToken },
      });
      expect(logoutResponse.statusCode).toBe(200);
      expect(logoutResponse.json().success).toBe(true);

      await e2eApp.close();
    });
  });
});
