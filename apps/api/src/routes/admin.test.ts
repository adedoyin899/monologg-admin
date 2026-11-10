import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";
import { buildApp } from "../app.js";
import { env } from "../config/env.js";
import {
  getAdminAuthVerifier,
  supabaseVerifier,
  mockVerifier,
  clerkVerifier,
} from "../providers/adminAuth/index.js";
import type { AdminRole } from "@prisma/client";

// Mock prisma for isolated, fast unit testing
vi.mock("../db/client.js", () => {
  return {
    prisma: {
      adminUser: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
      adminSession: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
      adminAuditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      $queryRaw: vi.fn(),
    },
  };
});

vi.mock("../db/adminRoClient.js", () => {
  return {
    adminRoPrisma: {
      user: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
      userTag: { findMany: vi.fn().mockResolvedValue([]) },
      creator: { count: vi.fn().mockResolvedValue(0) },
      client: { count: vi.fn().mockResolvedValue(0) },
      verificationRecording: { count: vi.fn().mockResolvedValue(0) },
      booking: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      payment: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
      withdrawalRequest: { findMany: vi.fn().mockResolvedValue([]) },
      productEvent: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
      supportTicket: { count: vi.fn().mockResolvedValue(0) },
      alertEvent: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
      $queryRaw: vi.fn(),
    },
    getMaterializedViewLastRefreshed: vi.fn().mockResolvedValue(new Date()),
  };
});

import { prisma } from "../db/client.js";

describe("Phase A1: Admin Foundation Routes & Auth", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    // Force mock provider for testing
    vi.stubEnv("ADMIN_AUTH_PROVIDER", "mock");
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  // Helper to mock active admin session
  function mockAdmin(role: AdminRole, status = "ACTIVE", sessionAgeMs = 0, idleAgeMs = 0) {
    const admin = {
      id: `admin-${role.toLowerCase()}`,
      email: `${role.toLowerCase()}@monologg.com`,
      role,
      status,
      authProvider: "SUPABASE",
      authSubject: `mock-sub-${role.toLowerCase()}@monologg.com`,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };

    const session = {
      id: "sess-123",
      adminUserId: admin.id,
      providerSessionId: `mock-session-${admin.email}`,
      createdAt: new Date(Date.now() - sessionAgeMs),
      lastSeenAt: new Date(Date.now() - idleAgeMs),
      endedAt: null,
      ipHash: null,
    };

    vi.mocked(prisma.adminUser.findFirst).mockResolvedValue(admin as any);
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValue(admin as any);
    vi.mocked(prisma.adminSession.findFirst).mockResolvedValue(session as any);
    vi.mocked(prisma.adminSession.update).mockResolvedValue(session as any);
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({ id: "audit-1" } as any);

    return { admin, session };
  }

  // 1. Permission Matrix Test
  describe("Permission Matrix (PRD M1.2)", () => {
    const testCases: {
      route: string;
      method: "GET" | "POST";
      allowedRoles: AdminRole[];
      body?: Record<string, unknown>;
    }[] = [
      {
        route: "/api/v1/admin/me",
        method: "GET",
        allowedRoles: ["SUPER_ADMIN", "OPS", "SUPPORT", "FINANCE", "COMPLIANCE", "VIEWER"],
      },
      {
        route: "/api/v1/admin/overview",
        method: "GET",
        allowedRoles: ["SUPER_ADMIN", "OPS", "SUPPORT", "FINANCE", "COMPLIANCE", "VIEWER"],
      },
      {
        route: "/api/v1/admin/users",
        method: "GET",
        allowedRoles: ["SUPER_ADMIN", "OPS", "SUPPORT", "FINANCE", "COMPLIANCE", "VIEWER"],
      },
      {
        route: "/api/v1/admin/users/usr-1/reveal",
        method: "POST",
        allowedRoles: ["SUPER_ADMIN", "OPS", "SUPPORT", "FINANCE", "COMPLIANCE"],
        body: { reason: "Review account" },
      },
      {
        route: "/api/v1/admin/users/usr-1/suspend",
        method: "POST",
        allowedRoles: ["SUPER_ADMIN", "OPS"],
        body: { reason: "Violation of terms" },
      },
      {
        route: "/api/v1/admin/bookings/bk-1/chat",
        method: "GET",
        allowedRoles: ["SUPER_ADMIN", "SUPPORT", "FINANCE"],
      },
      {
        route: "/api/v1/admin/payments",
        method: "GET",
        allowedRoles: ["SUPER_ADMIN", "OPS", "SUPPORT", "FINANCE", "COMPLIANCE", "VIEWER"],
      },
      {
        route: "/api/v1/admin/withdrawals",
        method: "GET",
        allowedRoles: ["SUPER_ADMIN", "OPS", "FINANCE"],
      },
      {
        route: "/api/v1/admin/tickets",
        method: "GET",
        allowedRoles: ["SUPER_ADMIN", "OPS", "SUPPORT", "FINANCE", "COMPLIANCE"],
      },
      {
        route: "/api/v1/admin/disputes/disp-1/resolve",
        method: "POST",
        allowedRoles: ["SUPER_ADMIN", "FINANCE"],
        body: { reason: "Resolved dispute" },
      },
      {
        route: "/api/v1/admin/verifications/kyc-1/approve",
        method: "POST",
        allowedRoles: ["SUPER_ADMIN", "COMPLIANCE"],
      },
      {
        route: "/api/v1/admin/health",
        method: "GET",
        allowedRoles: ["SUPER_ADMIN", "OPS", "VIEWER"],
      },
      {
        route: "/api/v1/admin/audit",
        method: "GET",
        allowedRoles: ["SUPER_ADMIN", "COMPLIANCE"],
      },
      {
        route: "/api/v1/admin/admins",
        method: "GET",
        allowedRoles: ["SUPER_ADMIN"],
      },
    ];

    const allRoles: AdminRole[] = [
      "SUPER_ADMIN",
      "OPS",
      "SUPPORT",
      "FINANCE",
      "COMPLIANCE",
      "VIEWER",
    ];

    for (const tc of testCases) {
      for (const role of allRoles) {
        const shouldPass = tc.allowedRoles.includes(role);
        it(`${tc.method} ${tc.route} returns ${shouldPass ? 200 : 403} for role ${role}`, async () => {
          mockAdmin(role);
          vi.mocked(prisma.adminUser.findMany).mockResolvedValue([]);
          vi.mocked(prisma.adminSession.findMany).mockResolvedValue([]);
          vi.mocked(prisma.adminAuditLog.findMany).mockResolvedValue([]);

          const token = `mock-admin:${role.toLowerCase()}@monologg.com:aal2`;
          const res = await app.inject({
            method: tc.method,
            url: tc.route,
            headers: {
              authorization: `Bearer ${token}`,
            },
            payload: tc.body,
          });

          expect(res.statusCode).toBe(shouldPass ? 200 : 403);
        });
      }
    }
  });

  // 2. Non-allowlisted email gets 403
  it("rejects non-allowlisted email with 403 'This account does not have access.'", async () => {
    vi.mocked(prisma.adminUser.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValue(null);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/me",
      headers: {
        authorization: "Bearer mock-admin:hacker@stranger.com:aal2",
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("This account does not have access.");
  });

  // 3. User JWT from main app cannot call any admin route
  it("rejects user JWT from main app with 403 'This account does not have access.'", async () => {
    const userJwt = jwt.sign(
      { userId: "usr-talent-1", userType: "TALENT", email: "talent@example.com" },
      env.JWT_ACCESS_SECRET,
    );

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/me",
      headers: {
        authorization: `Bearer ${userJwt}`,
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("This account does not have access.");
  });

  // 4. aal1 token gets needs_mfa_challenge on every route except /me
  it("permits aal1 on GET /me, but returns needs_mfa_challenge on other routes", async () => {
    mockAdmin("SUPER_ADMIN");

    // Call /me with aal1 -> returns 200
    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/me",
      headers: {
        authorization: "Bearer mock-admin:super_admin@monologg.com:aal1",
      },
    });
    expect(meRes.statusCode).toBe(200);

    // Call /overview with aal1 -> returns 403 with needs_mfa_challenge
    const overviewRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/overview",
      headers: {
        authorization: "Bearer mock-admin:super_admin@monologg.com:aal1",
      },
    });
    expect(overviewRes.statusCode).toBe(403);
    const body = JSON.parse(overviewRes.body);
    expect(body.code).toBe("needs_mfa_challenge");
  });

  // 5. Session older than 8 hours rejected
  it("rejects session older than 8 hours with 'Your session has expired. Sign in again.'", async () => {
    const eightHoursOneMinute = 8 * 60 * 60 * 1000 + 60 * 1000;
    mockAdmin("SUPER_ADMIN", "ACTIVE", eightHoursOneMinute, 0);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/overview",
      headers: {
        authorization: "Bearer mock-admin:super_admin@monologg.com:aal2",
      },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("Your session has expired. Sign in again.");
  });

  // 6. Idle over 30 minutes rejected
  it("rejects session idle over 30 minutes with 'Your session has expired. Sign in again.'", async () => {
    const thirtyOneMinutes = 31 * 60 * 1000;
    mockAdmin("SUPER_ADMIN", "ACTIVE", 31 * 60 * 1000, thirtyOneMinutes);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/overview",
      headers: {
        authorization: "Bearer mock-admin:super_admin@monologg.com:aal2",
      },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("Your session has expired. Sign in again.");
  });

  // 7. Disabled admin rejected with a still-valid token
  it("rejects disabled admin immediately even with a valid token", async () => {
    mockAdmin("SUPER_ADMIN", "DISABLED");

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/overview",
      headers: {
        authorization: "Bearer mock-admin:super_admin@monologg.com:aal2",
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("This account does not have access.");
  });

  // 8. Invite of an existing talent email refused
  it("refuses to invite an email that belongs to a talent or client user", async () => {
    mockAdmin("SUPER_ADMIN");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "usr-talent-99",
      email: "talent@monologg.com",
    } as any);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/admin/admins/invite",
      headers: {
        authorization: "Bearer mock-admin:super_admin@monologg.com:aal2",
      },
      payload: {
        email: "talent@monologg.com",
        role: "SUPPORT",
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("talent or client already exists");
  });

  // 9. Switching ADMIN_AUTH_PROVIDER changes only the verifier
  it("switching ADMIN_AUTH_PROVIDER changes only the verifier", async () => {
    expect(getAdminAuthVerifier("supabase")).toBe(supabaseVerifier);
    expect(getAdminAuthVerifier("mock")).toBe(mockVerifier);
    expect(getAdminAuthVerifier("clerk")).toBe(clerkVerifier);

    await expect(clerkVerifier.verify("any-token")).rejects.toThrow("Clerk authentication is not enabled");
  });
});

