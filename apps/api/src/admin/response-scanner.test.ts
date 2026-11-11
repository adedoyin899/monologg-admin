import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildApp } from "../app.js";

// Mock DB clients
vi.mock("../db/client.js", () => {
  return {
    prisma: {
      adminUser: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      adminSession: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
      },
      adminAuditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      client: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      creator: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      brief: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      booking: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      payment: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      withdrawalRequest: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      supportTicket: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      ticketMessage: {
        findMany: vi.fn(),
      },
      dispute: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      verificationRecording: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      productEvent: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      alertEvent: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      adminJob: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
      },
      jobRun: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      kpiDaily: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        upsert: vi.fn(),
      },
      mediaAsset: {
        findMany: vi.fn(),
      },
      userTag: {
        findMany: vi.fn(),
      },
      userAcquisition: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      physicalAttributes: {
        findMany: vi.fn(),
      },
      availabilityBlock: {
        findMany: vi.fn(),
      },
      refreshToken: {
        findMany: vi.fn(),
        updateMany: vi.fn(),
      },
    },
  };
});

vi.mock("../db/adminRoClient.js", () => {
  return {
    adminRoPrisma: {
      adminUser: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      adminAuditLog: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      client: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      creator: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      brief: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      booking: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      payment: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      paymentEvent: {
        findMany: vi.fn(),
      },
      withdrawalRequest: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      supportTicket: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      dispute: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      verificationRecording: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      productEvent: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      alertEvent: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      adminJob: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      jobRun: {
        findMany: vi.fn(),
      },
      kpiDaily: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      userTag: {
        findMany: vi.fn(),
      },
      userAcquisition: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      physicalAttributes: {
        findMany: vi.fn(),
      },
      availabilityBlock: {
        findMany: vi.fn(),
      },
    },
    getMaterializedViewLastRefreshed: vi.fn().mockResolvedValue(new Date("2026-02-10T12:00:00Z")),
  };
});

vi.mock("../providers/index.js", () => {
  return {
    notifyProvider: {
      email: vi.fn().mockResolvedValue(undefined),
      sms: vi.fn().mockResolvedValue(undefined),
      inApp: vi.fn().mockResolvedValue(undefined),
    },
  };
});

import { prisma } from "../db/client.js";
import { adminRoPrisma } from "../db/adminRoClient.js";

const prismaMock = prisma as any;
const adminRoMock = adminRoPrisma as any;

/**
 * Forbidden keys that must NEVER appear in any admin JSON response (PRD F4, F10, M1.4).
 */
const FORBIDDEN_KEYS = new Set([
  "password",
  "passwordhash",
  "hash",
  "otp",
  "otpsecret",
  "otpcode",
  "rawproviderpayload",
  "rawpayload",
  "cardnumber",
  "cvv",
  "privateattributevalue",
]);

/**
 * Recursively scans any value or nested JSON object for forbidden keys.
 */
function findForbiddenKeys(obj: any, path = ""): string[] {
  const violations: string[] = [];
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return violations;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      violations.push(...findForbiddenKeys(item, `${path}[${index}]`));
    });
    return violations;
  }

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Exclude ipHash from forbidden 'hash' check since ipHash is a deliberate one-way pseudonymized identifier
    if (normalizedKey !== "iphash" && FORBIDDEN_KEYS.has(normalizedKey)) {
      violations.push(`${currentPath} (forbidden key: "${key}")`);
    }

    violations.push(...findForbiddenKeys(value, currentPath));
  }

  return violations;
}

describe("Security Pass: Response Scanner on All Admin Routes (PRD F4, F10, M1.4)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  const SUPERADMIN_TOKEN = "mock-admin:superadmin@admin.monologg.dev:aal2";

  beforeEach(async () => {
    vi.stubEnv("ADMIN_AUTH_PROVIDER", "mock");
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();

    // Mock active session
    prismaMock.adminSession.findFirst.mockResolvedValue({
      id: "sess-1",
      adminUserId: "adm-1",
      lastSeenAt: new Date(),
      createdAt: new Date(),
      endedAt: null,
    });
    prismaMock.adminSession.update.mockResolvedValue({});

    prismaMock.adminUser.findFirst.mockResolvedValue({
      id: "adm-1",
      email: "superadmin@admin.monologg.dev",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    });
    prismaMock.adminUser.findMany.mockResolvedValue([
      {
        id: "adm-1",
        email: "superadmin@admin.monologg.dev",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    ]);

    // Seeded synthetic data for scanner
    const syntheticCreator = {
      id: "cr-1",
      userId: "usr-1",
      name: "Adaeze Okafor",
      displayName: "Adaeze Okafor",
      niche: "Fashion",
      location: "Lagos",
      verification: "VERIFIED",
      bio: "Fashion creator in Lagos",
      handle: "adaeze",
      media: [],
      rateCards: [],
      bookings: [],
      availability: [],
      createdAt: new Date(),
    };

    const syntheticUser = {
      id: "usr-1",
      email: "talent@monologg.test",
      userType: "TALENT",
      createdAt: new Date(),
      isTestUser: false,
      emailVerified: true,
      creator: syntheticCreator,
      client: null,
    };

    const syntheticBooking = {
      id: "bk-1",
      state: "ESCROW_LOCKED",
      currency: "NGN",
      baseAmount: 15000000,
      talentFeeAmount: 1500000,
      clientFeeAmount: 750000,
      origin: "DIRECT",
      createdAt: new Date(),
      slotHoldExpiresAt: null,
      creatorId: "cr-1",
      clientId: "cl-1",
      creator: { id: "cr-1", name: "Adaeze Okafor" },
      client: { id: "cl-1", name: "Client Corp" },
      payment: null,
    };

    const syntheticPayment = {
      id: "pm-1",
      bookingId: "bk-1",
      amount: 15000000,
      currency: "NGN",
      status: "SUCCESS",
      provider: "PAYSTACK",
      escrowHeld: true,
      createdAt: new Date(),
    };

    const syntheticTicket = {
      id: "tk-1",
      number: 1001,
      subject: "Inquiry about payout",
      priority: "NORMAL",
      status: "OPEN",
      source: "IN_APP",
      category: "PAYOUTS",
      createdAt: new Date(),
      messages: [],
    };

    const syntheticDispute = {
      id: "disp-1",
      bookingId: "bk-1",
      openedByUserId: "usr-1",
      openedByRole: "CLIENT",
      status: "OPEN",
      reason: "Deliverables delayed",
      description: "Deliverables not provided",
      openedAt: new Date(),
      createdAt: new Date(),
      booking: syntheticBooking,
    };

    const adminUserRecord = {
      id: "adm-1",
      email: "superadmin@admin.monologg.dev",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      createdAt: new Date(),
    };

    prismaMock.adminUser.findFirst.mockResolvedValue(adminUserRecord);
    prismaMock.adminUser.findMany.mockResolvedValue([adminUserRecord]);
    adminRoMock.adminUser.findFirst.mockResolvedValue(adminUserRecord);
    adminRoMock.adminUser.findMany.mockResolvedValue([adminUserRecord]);
    adminRoMock.adminUser.count.mockResolvedValue(1);

    prismaMock.adminSession.findFirst.mockResolvedValue({
      id: "sess-1",
      adminUserId: "adm-1",
      lastSeenAt: new Date(),
      createdAt: new Date(),
      endedAt: null,
    });
    prismaMock.adminSession.findMany.mockResolvedValue([]);
    prismaMock.adminSession.update.mockResolvedValue({});

    adminRoMock.user.findMany.mockResolvedValue([syntheticUser]);
    adminRoMock.user.findUnique.mockResolvedValue(syntheticUser);
    adminRoMock.user.count.mockResolvedValue(10);
    prismaMock.user.findMany.mockResolvedValue([syntheticUser]);
    prismaMock.user.findUnique.mockResolvedValue(syntheticUser);
    prismaMock.user.count.mockResolvedValue(10);

    adminRoMock.client.findMany.mockResolvedValue([]);
    adminRoMock.client.count.mockResolvedValue(5);
    prismaMock.client.findMany.mockResolvedValue([]);
    prismaMock.client.count.mockResolvedValue(5);

    adminRoMock.creator.findMany.mockResolvedValue([syntheticCreator]);
    adminRoMock.creator.count.mockResolvedValue(5);
    prismaMock.creator.findMany.mockResolvedValue([syntheticCreator]);
    prismaMock.creator.count.mockResolvedValue(5);

    adminRoMock.brief.findMany.mockResolvedValue([]);
    adminRoMock.brief.count.mockResolvedValue(3);

    adminRoMock.booking.findMany.mockResolvedValue([syntheticBooking]);
    adminRoMock.booking.findUnique.mockResolvedValue(syntheticBooking);
    adminRoMock.booking.count.mockResolvedValue(1);
    adminRoMock.booking.groupBy.mockResolvedValue([]);
    prismaMock.booking.findMany.mockResolvedValue([syntheticBooking]);
    prismaMock.booking.findUnique.mockResolvedValue(syntheticBooking);
    prismaMock.booking.count.mockResolvedValue(1);
    prismaMock.booking.groupBy.mockResolvedValue([]);

    adminRoMock.payment.findMany.mockResolvedValue([syntheticPayment]);
    adminRoMock.payment.findUnique.mockResolvedValue(syntheticPayment);
    adminRoMock.payment.count.mockResolvedValue(1);
    adminRoMock.paymentEvent.findMany.mockResolvedValue([]);

    adminRoMock.withdrawalRequest.findMany.mockResolvedValue([]);
    adminRoMock.withdrawalRequest.findUnique.mockResolvedValue(null);
    adminRoMock.withdrawalRequest.count.mockResolvedValue(0);
    prismaMock.withdrawalRequest.findMany.mockResolvedValue([]);
    prismaMock.withdrawalRequest.count.mockResolvedValue(0);

    adminRoMock.supportTicket.findMany.mockResolvedValue([syntheticTicket]);
    adminRoMock.supportTicket.findUnique.mockResolvedValue(syntheticTicket);
    adminRoMock.supportTicket.count.mockResolvedValue(1);
    prismaMock.supportTicket.findMany.mockResolvedValue([syntheticTicket]);
    prismaMock.supportTicket.findUnique.mockResolvedValue(syntheticTicket);
    prismaMock.supportTicket.count.mockResolvedValue(1);
    prismaMock.ticketMessage.findMany.mockResolvedValue([]);

    adminRoMock.dispute.findMany.mockResolvedValue([syntheticDispute]);
    adminRoMock.dispute.findUnique.mockResolvedValue(syntheticDispute);
    adminRoMock.dispute.count.mockResolvedValue(1);
    prismaMock.dispute.findMany.mockResolvedValue([syntheticDispute]);
    prismaMock.dispute.findUnique.mockResolvedValue(syntheticDispute);
    prismaMock.dispute.count.mockResolvedValue(1);

    adminRoMock.verificationRecording.findMany.mockResolvedValue([]);
    adminRoMock.verificationRecording.findUnique.mockResolvedValue(null);
    adminRoMock.verificationRecording.count.mockResolvedValue(0);

    adminRoMock.productEvent.findMany.mockResolvedValue([]);
    adminRoMock.productEvent.count.mockResolvedValue(100);

    adminRoMock.alertEvent.findMany.mockResolvedValue([]);
    adminRoMock.alertEvent.count.mockResolvedValue(0);

    adminRoMock.adminAuditLog.findMany.mockResolvedValue([]);
    adminRoMock.adminAuditLog.count.mockResolvedValue(0);
    prismaMock.adminAuditLog.findMany.mockResolvedValue([]);
    prismaMock.adminAuditLog.count.mockResolvedValue(0);

    adminRoMock.adminJob.findMany.mockResolvedValue([]);
    adminRoMock.adminJob.count.mockResolvedValue(0);
    adminRoMock.jobRun.findMany.mockResolvedValue([]);
    adminRoMock.userTag.findMany.mockResolvedValue([]);
    adminRoMock.kpiDaily.findMany.mockResolvedValue([]);

    adminRoMock.userAcquisition.findMany.mockResolvedValue([]);
    adminRoMock.userAcquisition.count.mockResolvedValue(0);
    prismaMock.userAcquisition.findMany.mockResolvedValue([]);
    prismaMock.userAcquisition.count.mockResolvedValue(0);

    adminRoMock.physicalAttributes.findMany.mockResolvedValue([]);
    prismaMock.physicalAttributes.findMany.mockResolvedValue([]);
    adminRoMock.availabilityBlock.findMany.mockResolvedValue([]);
    prismaMock.availabilityBlock.findMany.mockResolvedValue([]);
  });

  const routesToScan = [
    { method: "GET", url: "/api/v1/admin/me" },
    { method: "GET", url: "/api/v1/admin/overview" },
    { method: "GET", url: "/api/v1/admin/feed" },
    { method: "GET", url: "/api/v1/admin/users" },
    { method: "GET", url: "/api/v1/admin/bookings" },
    { method: "GET", url: "/api/v1/admin/payments" },
    { method: "GET", url: "/api/v1/admin/withdrawals" },
    { method: "GET", url: "/api/v1/admin/earnings" },
    { method: "GET", url: "/api/v1/admin/tickets" },
    { method: "GET", url: "/api/v1/admin/disputes" },
    { method: "GET", url: "/api/v1/admin/acquisition" },
    { method: "GET", url: "/api/v1/admin/funnels" },
    { method: "GET", url: "/api/v1/admin/retention" },
    { method: "GET", url: "/api/v1/admin/traffic" },
    { method: "GET", url: "/api/v1/admin/features" },
    { method: "GET", url: "/api/v1/admin/marketplace" },
    { method: "GET", url: "/api/v1/admin/alerts" },
    { method: "GET", url: "/api/v1/admin/health" },
    { method: "GET", url: "/api/v1/admin/audit" },
    { method: "GET", url: "/api/v1/admin/exports" },
    { method: "GET", url: "/api/v1/admin/settings" },
    { method: "GET", url: "/api/v1/admin/admins" },
  ];

  for (const { method, url } of routesToScan) {
    it(`guarantees no forbidden keys appear in response for ${method} ${url}`, async () => {
      const res = await app.inject({
        method: method as any,
        url,
        headers: {
          authorization: `Bearer ${SUPERADMIN_TOKEN}`,
        },
      });

      if (res.statusCode !== 200) {
        console.error(`Route ${url} failed with ${res.statusCode}:`, res.json());
      }
      expect(res.statusCode).toBe(200);

      const json = res.json();
      const violations = findForbiddenKeys(json);

      expect(violations).toEqual([]);
    });
  }
});
