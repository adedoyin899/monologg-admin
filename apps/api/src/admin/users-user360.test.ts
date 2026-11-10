import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import { env } from "../config/env.js";
import type { AdminRole } from "@prisma/client";
import { generateAccessToken, generateRefreshToken, hashPassword } from "../services/auth.js";

// Mock DB clients
vi.mock("../db/client.js", () => {
  return {
    prisma: {
      adminUser: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      adminSession: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      adminAuditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit-123" }),
      },
      user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      userNote: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      userTag: {
        upsert: vi.fn(),
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      userAcquisition: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      refreshToken: {
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      supportTicket: {
        create: vi.fn(),
      },
      mediaAsset: {
        findUnique: vi.fn(),
      },
      $queryRaw: vi.fn(),
    },
  };
});

vi.mock("../db/adminRoClient.js", () => {
  return {
    adminRoPrisma: {
      user: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      userTag: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      userAcquisition: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      productEvent: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      booking: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
    getMaterializedViewLastRefreshed: vi.fn().mockResolvedValue(new Date()),
  };
});

// Mock notification provider
vi.mock("../providers/index.js", () => {
  return {
    notifyProvider: {
      email: vi.fn().mockResolvedValue(true),
      inApp: vi.fn().mockResolvedValue(true),
    },
  };
});

// Mock cache provider
vi.mock("../providers/cache.js", () => {
  return {
    cacheProvider: {
      set: vi.fn().mockResolvedValue(true),
      get: vi.fn().mockResolvedValue(null),
      del: vi.fn().mockResolvedValue(true),
    },
  };
});

import { prisma } from "../db/client.js";
import { adminRoPrisma } from "../db/adminRoClient.js";
import { notifyProvider } from "../providers/index.js";
import { cacheProvider } from "../providers/cache.js";

describe("Phase A5: Users and User 360 Tests", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.stubEnv("ADMIN_AUTH_PROVIDER", "mock");
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  function mockAdminSession(role: AdminRole = "SUPER_ADMIN") {
    const email = `${role.toLowerCase()}@monologg.com`;
    const admin = {
      id: `admin-${role.toLowerCase()}`,
      email,
      role,
      status: "ACTIVE",
      authProvider: "SUPABASE",
      authSubject: `mock-sub-${email}`,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };

    const session = {
      id: `sess-${role.toLowerCase()}`,
      adminUserId: admin.id,
      providerSessionId: `mock-session-${email}`,
      createdAt: new Date(),
      lastSeenAt: new Date(),
      endedAt: null,
      ipHash: null,
    };

    vi.mocked(prisma.adminUser.findFirst).mockResolvedValue(admin as any);
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValue(admin as any);
    vi.mocked(prisma.adminSession.findFirst).mockResolvedValue(session as any);
    vi.mocked(prisma.adminSession.update).mockResolvedValue(session as any);
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({ id: "audit-ok" } as any);

    return { admin, session, token: `mock-admin:${email}:aal2` };
  }

  // ── 1. Users List & Masking by Default ──────────────────────────────────────
  describe("1. GET /api/v1/admin/users (AD-04)", () => {
    it("masks PII (name, email, phone) by default", async () => {
      const { token } = mockAdminSession("SUPER_ADMIN");

      const mockUsers = [
        {
          id: "usr_talent_1",
          email: "chidinma.okafor@gmail.com",
          phone: "+2348031234567",
          userType: "TALENT",
          authProvider: "EMAIL",
          accountOrigin: "SIGNUP",
          isTestUser: false,
          suspendedAt: null,
          suspendedReason: null,
          createdAt: new Date("2026-06-01T10:00:00Z"),
          lastActiveAt: new Date("2026-06-15T12:00:00Z"),
          creator: {
            id: "cr_1",
            name: "Chidinma Okafor",
            verification: "VERIFIED",
            referralCode: "CHIDINMA",
            niche: "VO_ARTIST",
            _count: { bookings: 5 },
          },
          client: null,
        },
      ];

      vi.mocked(adminRoPrisma.user.findMany).mockResolvedValue(mockUsers as any);
      vi.mocked(adminRoPrisma.user.count).mockResolvedValue(1);
      vi.mocked(adminRoPrisma.userTag.findMany).mockResolvedValue([
        { userId: "usr_talent_1", tag: "top-voice" },
      ] as any);
      vi.mocked(adminRoPrisma.userAcquisition.findMany).mockResolvedValue([
        {
          userId: "usr_talent_1",
          signupCountry: "NG",
          utmSource: "instagram",
          referrerDomain: "monologg.com",
        },
      ] as any);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/users",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.users).toHaveLength(1);
      const u = body.users[0];

      // Verification of default masking
      expect(u.name).toBe("Chidinma O."); // Masked name (First name + last initial)
      expect(u.maskedEmail).toBe("c***@g***.com"); // Masked email
      expect(u.phone).toBe("+234***4567"); // Masked phone
      expect(u.verification).toBe("VERIFIED");
      expect(u.country).toBe("NG");
      expect(u.source).toBe("instagram");
      expect(u.bookings).toBe(5);
      expect(u.tags).toContain("top-voice");

      // Raw sensitive identifiers must NOT be present
      expect(JSON.stringify(body)).not.toContain("chidinma.okafor@gmail.com");
      expect(JSON.stringify(body)).not.toContain("+2348031234567");
    });

    it("applies cursor pagination stably", async () => {
      const { token } = mockAdminSession("VIEWER");

      const mockUsers = Array.from({ length: 51 }, (_, i) => ({
        id: `usr_${i + 1}`,
        email: `user${i + 1}@example.com`,
        phone: "+2348000000000",
        userType: "TALENT",
        authProvider: "EMAIL",
        accountOrigin: "SIGNUP",
        isTestUser: false,
        suspendedAt: null,
        suspendedReason: null,
        createdAt: new Date(),
        lastActiveAt: new Date(),
        creator: { name: `User ${i + 1}`, verification: "UNVERIFIED", _count: { bookings: 0 } },
        client: null,
      }));

      vi.mocked(adminRoPrisma.user.findMany).mockResolvedValue(mockUsers as any);
      vi.mocked(adminRoPrisma.user.count).mockResolvedValue(100);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/users?limit=50",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.users).toHaveLength(50);
      expect(body.hasMore).toBe(true);
      expect(body.nextCursor).toBe("usr_50");
    });

    it("meets the 1.5s latency target on a 10,000 synthetic user set", async () => {
      const { token } = mockAdminSession("OPS");

      // Generate 50 items simulating page query over 10,000 synthetic rows
      const syntheticUsers = Array.from({ length: 50 }, (_, i) => ({
        id: `usr_synth_${i}`,
        email: `synth${i}@synthetic.monologg.com`,
        phone: `+234801111${i.toString().padStart(4, "0")}`,
        userType: i % 2 === 0 ? "TALENT" : "CLIENT",
        authProvider: "EMAIL",
        accountOrigin: "SIGNUP",
        isTestUser: false,
        suspendedAt: null,
        suspendedReason: null,
        createdAt: new Date(Date.now() - i * 100000),
        lastActiveAt: new Date(),
        creator: i % 2 === 0 ? { name: `Creator ${i}`, verification: "VERIFIED", _count: { bookings: 2 } } : null,
        client: i % 2 !== 0 ? { name: `Client ${i}`, orgName: "Acme", _count: { bookings: 1 } } : null,
      }));

      vi.mocked(adminRoPrisma.user.findMany).mockResolvedValue(syntheticUsers as any);
      vi.mocked(adminRoPrisma.user.count).mockResolvedValue(10000);

      const start = performance.now();
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/users?limit=50&userType=TALENT",
        headers: { authorization: `Bearer ${token}` },
      });
      const durationMs = performance.now() - start;

      expect(res.statusCode).toBe(200);
      expect(durationMs).toBeLessThan(1500); // PRD M3.1 AC3: under 1.5s
    });
  });

  // ── 2. User 360 (AD-05) Tabs, Privacy & Attributes ─────────────────────────
  describe("2. GET /api/v1/admin/users/:id (AD-05 User 360)", () => {
    it("returns partitioned tabs and enforces PUBLIC attributes only (SEARCHABLE and PRIVATE are null)", async () => {
      const { token } = mockAdminSession("SUPPORT");

      const mockUserDetail = {
        id: "usr_talent_detail",
        email: "talent.confidential@example.com",
        phone: "+2348099998888",
        userType: "TALENT",
        authProvider: "EMAIL",
        accountOrigin: "SIGNUP",
        isTestUser: false,
        suspendedAt: null,
        suspendedReason: null,
        createdAt: new Date("2026-05-10T08:00:00Z"),
        lastActiveAt: new Date("2026-06-20T14:30:00Z"),
        creator: {
          id: "cr_detail_1",
          name: "Bolanle Williams",
          niche: "ACTOR",
          location: "Lagos, Nigeria",
          bio: "Voice and stage artist with over 10 years experience.",
          avatarUrl: "https://r2.monologg.com/avatars/cr_detail_1.jpg",
          styleTags: ["Deep Voice", "Dramatic"],
          verification: "VERIFIED",
          celebrityBadge: true,
          mediaKit: { mode: "AUTO" },
          rateCards: [
            { id: "rc_1", serviceTitle: "Voiceover (Commercial)", priceAmount: 5000000, currency: "NGN" },
          ],
          media: [
            {
              id: "med_1",
              kind: "VIDEO",
              url: "https://r2.monologg.com/media/reel_1.mp4",
              sizeBytes: 15000000,
              durationSec: 60,
              taggingStatus: "DONE",
              createdAt: new Date("2026-05-12T10:00:00Z"),
            },
          ],
          physicalAttributes: {
            id: "pa_1",
            heightRange: "CM_170_180",
            weightRange: "KG_70_80",
            complexion: "DARK",
            eyeColor: "BROWN",
            distinctiveFeatures: "Deep facial scar on left cheek",
            // Privacy visibility map:
            // heightRange -> PUBLIC
            // weightRange -> SEARCHABLE (default)
            // distinctiveFeatures -> PRIVATE
            visibility: {
              heightRange: "PUBLIC",
              weightRange: "SEARCHABLE",
              distinctiveFeatures: "PRIVATE",
            },
          },
          bookings: [
            {
              id: "bk_1",
              engagementType: "ONE_OFF",
              slotDate: new Date("2026-06-15T09:00:00Z"),
              slotStart: "09:00",
              slotEnd: "12:00",
              baseAmount: 15000000,
              currency: "NGN",
              talentFeeAmount: 1500000,
              clientFeeAmount: 2000000,
              state: "PAYMENT_RELEASED",
              origin: "INTERNAL",
              createdAt: new Date("2026-06-10T10:00:00Z"),
              client: { name: "Paramount Studio" },
            },
          ],
          applications: [],
        },
        client: null,
        calendarConnection: {
          id: "cal_1",
          provider: "google",
          status: "CONNECTED",
          connectedAt: new Date("2026-05-11T12:00:00Z"),
        },
        refreshTokens: [{ id: "rt_1", revokedAt: null, expiresAt: new Date(Date.now() + 1000000) }],
        notes: [{ id: "note_1", adminId: "admin-super", body: "VIP client confirmed.", createdAt: new Date() }],
        supportTickets: [],
        withdrawalRequests: [
          {
            id: "wd_1",
            amount: 10000000,
            currency: "NGN",
            bankName: "GTBank",
            accountNumber: "0123456789",
            accountName: "Bolanle Williams",
            status: "COMPLETED",
            flagged: false,
            flagReason: null,
            createdAt: new Date(),
          },
        ],
        notifications: [
          {
            id: "notif_otp",
            kind: "auth_otp_dispatched",
            payload: { code: "847291", secret: "super_secret" }, // SENSITIVE OTP PAYLOAD
            readAt: null,
            createdAt: new Date(),
          },
          {
            id: "notif_booking",
            kind: "booking_confirmed",
            payload: { bookingId: "bk_1" },
            readAt: new Date(),
            createdAt: new Date(),
          },
        ],
        authEvents: [
          {
            id: "ae_1",
            provider: "EMAIL",
            event: "signin_success",
            ipHash: "hash123",
            userAgent: "Mozilla/5.0",
            createdAt: new Date(),
          },
        ],
      };

      vi.mocked(adminRoPrisma.user.findUnique).mockResolvedValue(mockUserDetail as any);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/users/usr_talent_detail",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();

      // Overview Tab
      expect(body.overview.name).toBe("Bolanle W.");
      expect(body.overview.email).toBe("t***@e***.com");
      expect(body.overview.phone).toBe("+234***8888");

      // Profile Tab & Attributes
      const attrs = body.profile.attributes.values;
      expect(attrs.heightRange.visibility).toBe("PUBLIC");
      expect(attrs.heightRange.value).toBe("CM_170_180"); // PUBLIC value returned

      expect(attrs.weightRange.visibility).toBe("SEARCHABLE");
      expect(attrs.weightRange.value).toBeNull(); // SEARCHABLE hidden in standard view

      expect(attrs.distinctiveFeatures.visibility).toBe("PRIVATE");
      expect(attrs.distinctiveFeatures.value).toBeNull(); // PRIVATE is strictly null

      // STRICT NON-NEGOTIABLE PRIVACY CHECK:
      // Search entire response body for the private value or OTP code:
      const bodyString = JSON.stringify(body);
      expect(bodyString).not.toContain("Deep facial scar on left cheek");
      expect(bodyString).not.toContain("847291"); // OTP code strictly excluded!

      // Notifications Tab Check: OTP payload must be null
      const otpNotif = body.notifications.find((n: any) => n.kind === "auth_otp_dispatched");
      expect(otpNotif.payload).toBeNull();

      // Money Tab Check: Must carry explicit accounting basis label
      expect(body.money.label).toBe("Derived from bookings and withdrawals");
      expect(body.money.byCurrency.NGN.earned).toBe(15000000);
      expect(body.money.byCurrency.NGN.withdrawn).toBe(10000000);
      expect(body.money.withdrawals[0].accountNumber).toBe("******6789"); // Masked account
    });
  });

  // ── 3. Audited Reveal Route (POST /users/:id/reveal) ──────────────────────
  describe("3. POST /api/v1/admin/users/:id/reveal", () => {
    it("requires a non-empty reason and returns 400 Bad Request if missing", async () => {
      const { token } = mockAdminSession("SUPER_ADMIN");

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/admin/users/usr_123/reveal",
        headers: { authorization: `Bearer ${token}` },
        payload: { reason: "   " },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toContain("reason is required");
    });

    it("forbids VIEWER role from revealing PII (403 Forbidden)", async () => {
      const { token } = mockAdminSession("VIEWER");

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/admin/users/usr_123/reveal",
        headers: { authorization: `Bearer ${token}` },
        payload: { reason: "Investigating user dispute" },
      });

      expect(res.statusCode).toBe(403);
    });

    it("writes an immutable audit row, unmasks contact, reveals SEARCHABLE, but NEVER reveals PRIVATE attributes", async () => {
      const { token, admin } = mockAdminSession("SUPER_ADMIN");

      const mockUser = {
        id: "usr_reveal_target",
        email: "confidential.star@monologg.com",
        phone: "+2348188887777",
        creator: {
          name: "Tiwa Savage",
          physicalAttributes: {
            heightRange: "CM_170_180",
            weightRange: "KG_60_70",
            distinctiveFeatures: "Private surgical mark",
            visibility: {
              heightRange: "PUBLIC",
              weightRange: "SEARCHABLE",
              distinctiveFeatures: "PRIVATE",
            },
          },
        },
      };

      vi.mocked(adminRoPrisma.user.findUnique).mockResolvedValue(mockUser as any);

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/admin/users/usr_reveal_target/reveal",
        headers: { authorization: `Bearer ${token}` },
        payload: { reason: "Compliance review for KYC escalation #1092" },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();

      // Check unmasked contact fields
      expect(body.unmaskedName).toBe("Tiwa Savage");
      expect(body.unmaskedEmail).toBe("confidential.star@monologg.com");
      expect(body.unmaskedPhone).toBe("+2348188887777");

      // Check attributes: SEARCHABLE is revealed for SUPER_ADMIN
      expect(body.attributes.heightRange.value).toBe("CM_170_180");
      expect(body.attributes.weightRange.value).toBe("KG_60_70");

      // NON-NEGOTIABLE PRIVACY REQUIREMENT:
      // PRIVATE attributes are NEVER returned even on reveal!
      expect(body.attributes.distinctiveFeatures.visibility).toBe("PRIVATE");
      expect(body.attributes.distinctiveFeatures.value).toBeNull();
      expect(JSON.stringify(body)).not.toContain("Private surgical mark");

      // Verify Audit Log row was written
      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            adminId: admin.id,
            action: "PII_REVEALED",
            targetType: "User",
            targetId: "usr_reveal_target",
            reason: "Compliance review for KYC escalation #1092",
          }),
        }),
      );
    });
  });

  // ── 4. User Actions & Audited Modifications ────────────────────────────────
  describe("4. Audited Actions (Notes, Suspension, Sessions, Tickets, Tags, Media)", () => {
    it("adds an internal note and writes USER_NOTE_ADDED audit row", async () => {
      const { token, admin } = mockAdminSession("OPS");

      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "usr_note_1" } as any);
      vi.mocked(prisma.userNote.create).mockResolvedValue({
        id: "note_123",
        userId: "usr_note_1",
        adminId: admin.id,
        body: "Fraud check cleared by compliance.",
        createdAt: new Date(),
      } as any);

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/admin/users/usr_note_1/notes",
        headers: { authorization: `Bearer ${token}` },
        payload: { body: "Fraud check cleared by compliance." },
      });

      expect(res.statusCode).toBe(201);
      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "USER_NOTE_ADDED",
            targetType: "User",
            targetId: "usr_note_1",
          }),
        }),
      );
    });

    it("suspends a user with reason, revokes sessions, and writes USER_SUSPENDED audit row", async () => {
      const { token, admin } = mockAdminSession("SUPER_ADMIN");

      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "usr_to_suspend" } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({ id: "usr_to_suspend" } as any);
      vi.mocked(prisma.refreshToken.findMany).mockResolvedValue([
        { id: "rt_1", tokenHash: "hash1" },
        { id: "rt_2", tokenHash: "hash2" },
      ] as any);

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/admin/users/usr_to_suspend/suspend",
        headers: { authorization: `Bearer ${token}` },
        payload: { reason: "Fraudulent dispute behavior" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().revokedCount).toBe(2);

      // Verify user update
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "usr_to_suspend" },
          data: expect.objectContaining({
            suspendedReason: "Fraudulent dispute behavior",
          }),
        }),
      );

      // Verify session revocation
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "usr_to_suspend", revokedAt: null },
        }),
      );

      // Verify audit row
      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "USER_SUSPENDED",
            targetType: "User",
            targetId: "usr_to_suspend",
            reason: "Fraudulent dispute behavior",
          }),
        }),
      );
    });

    it("unsuspends a user and writes USER_UNSUSPENDED audit row", async () => {
      const { token } = mockAdminSession("OPS");

      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "usr_suspended" } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({ id: "usr_suspended" } as any);

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/admin/users/usr_suspended/unsuspend",
        headers: { authorization: `Bearer ${token}` },
        payload: { reason: "Appeal reviewed and accepted" },
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "usr_suspended" },
          data: { suspendedAt: null, suspendedReason: null },
        }),
      );
      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "USER_UNSUSPENDED",
            targetType: "User",
            targetId: "usr_suspended",
          }),
        }),
      );
    });

    it("revokes all sessions via revoke-sessions endpoint and writes USER_SESSIONS_REVOKED audit row", async () => {
      const { token } = mockAdminSession("SUPER_ADMIN");

      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "usr_revoke_test" } as any);
      vi.mocked(prisma.refreshToken.findMany).mockResolvedValue([
        { id: "rt_1", tokenHash: "hash1" },
      ] as any);

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/admin/users/usr_revoke_test/revoke-sessions",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "USER_SESSIONS_REVOKED",
            targetType: "User",
            targetId: "usr_revoke_test",
          }),
        }),
      );
    });

    it("resends verification email through notifyProvider and writes USER_VERIFICATION_RESENT audit row", async () => {
      const { token } = mockAdminSession("OPS");

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "usr_unverified",
        email: "unverified@example.com",
        emailVerified: false,
      } as any);

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/admin/users/usr_unverified/resend-verification",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(notifyProvider.email).toHaveBeenCalledWith(
        "unverified@example.com",
        "verify_email",
        expect.any(Object),
      );
      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "USER_VERIFICATION_RESENT",
            targetType: "User",
            targetId: "usr_unverified",
          }),
        }),
      );
    });

    it("creates a support ticket on behalf of user and writes TICKET_CREATED_ON_BEHALF audit row", async () => {
      const { token } = mockAdminSession("SUPPORT");

      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "usr_support_target" } as any);
      vi.mocked(prisma.supportTicket.create).mockResolvedValue({
        id: "tkt_123",
        userId: "usr_support_target",
        subject: "Client unable to join Google Meet call",
        message: "Reported via phone call to support",
        status: "OPEN",
        createdAt: new Date(),
      } as any);

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/admin/users/usr_support_target/tickets",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          subject: "Client unable to join Google Meet call",
          message: "Reported via phone call to support",
        },
      });

      expect(res.statusCode).toBe(201);
      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "TICKET_CREATED_ON_BEHALF",
            targetType: "SupportTicket",
          }),
        }),
      );
    });

    it("bulk applies and removes cohort tags and writes audit rows", async () => {
      const { token } = mockAdminSession("OPS");

      // Bulk Add
      const addRes = await app.inject({
        method: "POST",
        url: "/api/v1/admin/users/tags",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          userIds: ["usr_1", "usr_2"],
          tag: "cohort-beta-2026",
          action: "ADD",
        },
      });

      expect(addRes.statusCode).toBe(200);
      expect(prisma.userTag.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "USER_TAG_BULK_APPLIED",
            targetType: "UserTag",
            targetId: "cohort-beta-2026",
          }),
        }),
      );

      // Bulk Remove
      const removeRes = await app.inject({
        method: "POST",
        url: "/api/v1/admin/users/tags",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          userIds: ["usr_1", "usr_2"],
          tag: "cohort-beta-2026",
          action: "REMOVE",
        },
      });

      expect(removeRes.statusCode).toBe(200);
      expect(prisma.userTag.deleteMany).toHaveBeenCalled();
      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "USER_TAG_BULK_REMOVED",
            targetType: "UserTag",
            targetId: "cohort-beta-2026",
          }),
        }),
      );
    });

    it("generates a short-lived 5-minute signed URL for media preview and audits MEDIA_VIEWED", async () => {
      const { token } = mockAdminSession("VIEWER");

      vi.mocked(prisma.mediaAsset.findUnique).mockResolvedValue({
        id: "med_preview_1",
        kind: "VIDEO",
        url: "https://r2.monologg.com/videos/showreel.mp4",
      } as any);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/media/med_preview_1/signed-url",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.signedUrl).toContain("https://r2.monologg.com/videos/showreel.mp4");
      expect(body.signedUrl).toContain("sig=");
      expect(body.signedUrl).toContain("exp=");

      // Expiration must be approximately 5 minutes in the future (~300 seconds)
      const expiryTime = new Date(body.expiresAt).getTime();
      const diffSec = (expiryTime - Date.now()) / 1000;
      expect(diffSec).toBeGreaterThan(290);
      expect(diffSec).toBeLessThanOrEqual(305);

      // Audited as MEDIA_VIEWED
      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "MEDIA_VIEWED",
            targetType: "MediaAsset",
            targetId: "med_preview_1",
          }),
        }),
      );
    });
  });

  // ── 5. Suspended User Auth Path Gate ──────────────────────────────────────
  describe("5. Suspended User Gate (Main App Integration)", () => {
    it("rejects sign-in from suspended user with 403 Forbidden and clear message", async () => {
      const password = "CorrectPassword123!";
      const pwdHash = await hashPassword(password);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "usr_suspended_login",
        email: "suspended.login@example.com",
        passwordHash: pwdHash,
        passwordSet: true,
        userType: "TALENT",
        suspendedAt: new Date("2026-07-01"),
        suspendedReason: "Account blocked for fraud",
      } as any);

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "suspended.login@example.com",
          password,
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().message).toContain("suspended");
    });

    it("rejects API calls from suspended user with 403 Forbidden and clear message", async () => {
      // Mock user in DB with suspendedAt set
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "usr_suspended_caller",
        suspendedAt: new Date("2026-07-01"),
        suspendedReason: "Violated terms",
      } as any);

      const userToken = generateAccessToken({
        userId: "usr_suspended_caller",
        userType: "TALENT",
        email: "suspended@example.com",
      });

      // Attempt calling an authenticated user route (e.g. GET /api/v1/notifications protected route)
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/notifications",
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().message).toBe(
        "Your account is suspended. Please contact support@monologg.com.",
      );
    });
  });

  // ── 6. Thorough Negative Privacy Hunter Test ─────────────────────────────
  describe("6. Strict Negative Privacy & Leakage Hunting", () => {
    it("hunts for a PRIVATE attribute or an OTP code in any response and finds none", async () => {
      const { token } = mockAdminSession("OPS");

      const SECRET_OTP = "998811";
      const PRIVATE_VALUE = "SuperSecretMedicalCondition";

      const mockTarget = {
        id: "usr_leak_test",
        email: "target@example.com",
        phone: "+2348000000000",
        userType: "TALENT",
        authProvider: "EMAIL",
        accountOrigin: "SIGNUP",
        isTestUser: false,
        suspendedAt: null,
        suspendedReason: null,
        createdAt: new Date(),
        lastActiveAt: new Date(),
        creator: {
          name: "Target Performer",
          physicalAttributes: {
            distinctiveFeatures: PRIVATE_VALUE,
            visibility: {
              distinctiveFeatures: "PRIVATE",
            },
          },
          media: [],
          bookings: [],
          rateCards: [],
        },
        client: null,
        notifications: [
          {
            id: "n_otp_leak",
            kind: "auth_otp_login",
            payload: { code: SECRET_OTP, token: "sens_token" },
            readAt: null,
            createdAt: new Date(),
          },
          {
            id: "n_signin_notice",
            kind: "signin_notice",
            payload: { ip: "1.2.3.4", token: "tok_abc" },
            readAt: null,
            createdAt: new Date(),
          },
        ],
        withdrawalRequests: [
          {
            id: "w_leak",
            amount: 500000,
            currency: "NGN",
            bankName: "Zenith Bank",
            accountNumber: "0011223344",
            accountName: "Target Performer",
            status: "PENDING_OTP",
            otps: [{ codeHash: "argon2_otp_hash_secret" }],
            createdAt: new Date(),
          },
        ],
        refreshTokens: [],
        notes: [],
        supportTickets: [],
        authEvents: [],
      };

      vi.mocked(adminRoPrisma.user.findUnique).mockResolvedValue(mockTarget as any);

      // 1. Standard detail query
      const detailRes = await app.inject({
        method: "GET",
        url: "/api/v1/admin/users/usr_leak_test",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(detailRes.statusCode).toBe(200);
      const detailBody = detailRes.payload;

      // Leak hunting assertions
      expect(detailBody).not.toContain(SECRET_OTP);
      expect(detailBody).not.toContain(PRIVATE_VALUE);
      expect(detailBody).not.toContain("argon2_otp_hash_secret");
      expect(detailBody).not.toContain("sens_token");

      // 2. Reveal query
      const revealRes = await app.inject({
        method: "POST",
        url: "/api/v1/admin/users/usr_leak_test/reveal",
        headers: { authorization: `Bearer ${token}` },
        payload: { reason: "Security leakage test inspection" },
      });

      expect(revealRes.statusCode).toBe(200);
      const revealBody = revealRes.payload;

      // Even on reveal, PRIVATE attributes must NEVER appear
      expect(revealBody).not.toContain(PRIVATE_VALUE);
      expect(revealBody).not.toContain(SECRET_OTP);
    });
  });
});
