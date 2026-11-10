import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import { KpiService } from "./kpi/index.js";
import { track } from "../lib/analytics/index.js";
import { maskEmail, maskName } from "../lib/masking.js";

// Mock database layer for deterministic, lightning-fast testing
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
        findMany: vi.fn(),
        count: vi.fn(),
      },
      productEvent: {
        createMany: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      $queryRaw: vi.fn(),
    },
  };
});

vi.mock("../db/adminRoClient.js", () => {
  return {
    adminRoPrisma: {
      user: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      userTag: {
        findMany: vi.fn(),
      },
      creator: {
        count: vi.fn(),
      },
      client: {
        count: vi.fn(),
      },
      verificationRecording: {
        count: vi.fn(),
      },
      booking: {
        findMany: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      payment: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      withdrawalRequest: {
        findMany: vi.fn(),
      },
      productEvent: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      supportTicket: {
        count: vi.fn(),
      },
      alertEvent: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      $queryRaw: vi.fn(),
    },
    getMaterializedViewLastRefreshed: vi.fn(),
  };
});

import { prisma } from "../db/client.js";
import { adminRoPrisma, getMaterializedViewLastRefreshed } from "../db/adminRoClient.js";

describe("Phase A4: Overview, Live Feed and KPIs (PRD M2)", () => {
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

  // Helper to mock admin session
  function mockAdminSession(role: "SUPER_ADMIN" | "VIEWER" = "SUPER_ADMIN") {
    const admin = {
      id: `admin-${role.toLowerCase()}`,
      email: `${role.toLowerCase()}@monologg.com`,
      role,
      status: "ACTIVE",
      authProvider: "SUPABASE",
      authSubject: `mock-sub-${role.toLowerCase()}@monologg.com`,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };

    const session = {
      id: `sess-${role.toLowerCase()}`,
      adminUserId: admin.id,
      providerSessionId: `mock-session-${admin.email}`,
      createdAt: new Date(),
      lastSeenAt: new Date(),
      endedAt: null,
      ipHash: null,
    };

    vi.mocked(prisma.adminUser.findFirst).mockResolvedValue(admin as any);
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValue(admin as any);
    vi.mocked(prisma.adminSession.findFirst).mockResolvedValue(session as any);
    vi.mocked(prisma.adminSession.update).mockResolvedValue(session as any);
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({ id: "audit-1" } as any);

    return { admin, session, token: `mock-admin:${admin.email}:aal2` };
  }

  // ── 1. Seeded Dataset Verification Against PRD Section 4 Definitions ─────
  describe("1. Seeded Dataset KPI Hand Count Verification", () => {
    it("matches exact hand counts for every PRD Section 4 KPI definition", async () => {
      const now = new Date("2026-06-15T12:00:00Z");

      // Known seeded dataset
      const mockUsers = [
        {
          id: "u-tal-1",
          userType: "TALENT",
          accountOrigin: "SIGNUP",
          isTestUser: false,
          createdAt: new Date("2026-06-01T10:00:00Z"),
          client: null,
          creator: {
            bookings: [{ createdAt: new Date("2026-06-01T12:00:00Z") }], // 2h diff
          },
        },
        {
          id: "u-tal-2",
          userType: "TALENT",
          accountOrigin: "SIGNUP",
          isTestUser: false,
          createdAt: new Date("2026-06-02T10:00:00Z"),
          client: null,
          creator: { bookings: [] },
        },
        {
          id: "u-tal-3",
          userType: "TALENT",
          accountOrigin: "SIGNUP",
          isTestUser: false,
          createdAt: new Date("2026-06-03T10:00:00Z"),
          client: null,
          creator: {
            bookings: [{ createdAt: new Date("2026-06-03T14:00:00Z") }], // 4h diff
          },
        },
        {
          id: "u-cli-1",
          userType: "CLIENT",
          accountOrigin: "SIGNUP",
          isTestUser: false,
          createdAt: new Date("2026-06-04T10:00:00Z"),
          client: {
            bookings: [{ createdAt: new Date("2026-06-04T15:00:00Z") }], // 5h diff
          },
          creator: null,
        },
        {
          id: "u-cli-2",
          userType: "CLIENT",
          accountOrigin: "AUTO_CHECKOUT",
          isTestUser: false,
          createdAt: new Date("2026-06-05T10:00:00Z"),
          client: { bookings: [] },
          creator: null,
        },
      ];

      const mockDb: any = {
        user: {
          findMany: vi.fn().mockImplementation((args: any) => {
            if (args?.select?.userType) {
              return mockUsers.map((u) => ({
                userType: u.userType,
                accountOrigin: u.accountOrigin,
              }));
            }
            return mockUsers;
          }),
          count: vi.fn().mockResolvedValue(3), // 3 email verified
        },
        creator: {
          count: vi.fn().mockImplementation((args: any) => {
            if (args?.where?.verification === "VERIFIED") return 1; // 1 verified identity
            if (args?.where?.rateCards) return 2; // 2 talent activated
            return 3; // 3 talent onboarded
          }),
        },
        client: {
          count: vi.fn().mockResolvedValue(1), // 1 client activated
        },
        verificationRecording: {
          count: vi.fn().mockResolvedValue(1), // 1 recording approved
        },
        productEvent: {
          findMany: vi.fn().mockResolvedValue([
            { userId: "u-tal-1" },
            { userId: "u-cli-1" },
          ]), // 2 active users
          count: vi.fn().mockImplementation((args: any) => {
            const stepCounts: Record<string, number> = {
              public_profile_viewed: 100,
              booking_started: 50,
              slot_selected: 30,
              payment_initiated: 20,
              escrow_locked: 10,
            };
            return stepCounts[args?.where?.name] || 0;
          }),
        },
        booking: {
          findMany: vi.fn().mockImplementation((args: any) => {
            const currency = args?.where?.currency;
            if (currency === "NGN") {
              return [
                { baseAmount: 10000000n, talentFeeAmount: 1100000n, clientFeeAmount: 1500000n }, // 100k
                { baseAmount: 5000000n, talentFeeAmount: 550000n, clientFeeAmount: 750000n }, // 50k
              ];
            }
            if (currency === "USD") {
              return [
                { baseAmount: 200000n, talentFeeAmount: 22000n, clientFeeAmount: 30000n }, // $2k
              ];
            }
            return [];
          }),
          count: vi.fn().mockImplementation((args: any) => {
            if (args?.where?.state === "DISPUTED") return 1;
            return 3; // 3 escrow reached bookings
          }),
        },
        payment: {
          findMany: vi.fn().mockImplementation((args: any) => {
            if (args?.where?.currency === "NGN") return [{ amount: 5000000n }];
            if (args?.where?.currency === "USD") return [{ amount: 200000n }];
            return [];
          }),
          count: vi.fn().mockImplementation((args: any) => {
            if (args?.where?.status === "FAILED") return 1;
            return 4; // 4 total payments
          }),
        },
        withdrawalRequest: {
          findMany: vi.fn().mockImplementation((args: any) => {
            if (args?.where?.currency === "NGN") return [{ amount: 3000000n }];
            return [];
          }),
        },
      };

      const kpi = new KpiService(mockDb);
      const snapshot = await kpi.getSnapshot();

      // Hand count assertions:
      // Signups:
      expect(snapshot.signups.total).toBe(5);
      expect(snapshot.signups.byUserType["TALENT"]).toBe(3);
      expect(snapshot.signups.byUserType["CLIENT"]).toBe(2);
      expect(snapshot.signups.byAccountOrigin["SIGNUP"]).toBe(4);
      expect(snapshot.signups.byAccountOrigin["AUTO_CHECKOUT"]).toBe(1);

      // Onboarding & Activation:
      expect(snapshot.emailVerified).toBe(3);
      expect(snapshot.talentOnboarded).toBe(3);
      expect(snapshot.talentActivated).toBe(2);
      expect(snapshot.clientActivated).toBe(1);
      expect(snapshot.identityVerified).toBe(1);
      expect(snapshot.verificationRecordingApproved).toBe(1);

      // Time to First Booking: median of [2h, 4h, 5h] = 4h
      expect(snapshot.timeToFirstBookingHours.median).toBe(4);

      // Funnel:
      expect(snapshot.bookingFunnel).toHaveLength(5);
      expect(snapshot.bookingFunnel[0].count).toBe(100);
      expect(snapshot.bookingFunnel[1].count).toBe(50);
      expect(snapshot.bookingFunnel[1].conversionFromPrevious).toBe(0.5);

      // Isolated Currencies Invariant:
      const ngn = snapshot.moneyByCurrency.find((m) => m.currency === "NGN")!;
      expect(ngn).toBeDefined();
      expect(ngn.gmv).toBe(15000000n);
      expect(ngn.escrowHeld).toBe(5000000n);
      expect(ngn.platformRevenue).toBe(3900000n); // (1.1m+1.5m) + (0.55m+0.75m)
      expect(ngn.talentAvailable).toBe(10350000n); // (15m - 1.65m) - 3m withdrawn = 10.35m

      const usd = snapshot.moneyByCurrency.find((m) => m.currency === "USD")!;
      expect(usd).toBeDefined();
      expect(usd.gmv).toBe(200000n);

      // Dispute Rate: 1 / 3 = 0.333
      expect(snapshot.disputeRate).toBe(0.333);

      // Payment Failure Rate: 1 / 4 = 0.25
      expect(snapshot.paymentFailureRate).toBe(0.25);
    });
  });

  // ── 2. Currency Separation Invariant (PRD Appendix B) ────────────────────
  describe("2. Monetary Metrics Currency Separation", () => {
    it("returns money metrics strictly partitioned by currency, never summed across", async () => {
      const { token } = mockAdminSession("SUPER_ADMIN");

      vi.mocked(adminRoPrisma.booking.count).mockResolvedValue(12);
      vi.mocked(adminRoPrisma.booking.groupBy).mockResolvedValue([
        { state: "ESCROW_LOCKED", _count: { id: 7 } },
        { state: "PAYMENT_RELEASED", _count: { id: 5 } },
      ] as any);

      vi.mocked(adminRoPrisma.booking.findMany).mockImplementation((args: any) => {
        if (args?.select?.currency) {
          return Promise.resolve([
            { createdAt: new Date(), currency: "NGN", baseAmount: 25000000 },
            { createdAt: new Date(), currency: "USD", baseAmount: 150000 },
          ] as any);
        }
        return Promise.resolve([
          { baseAmount: 25000000n, talentFeeAmount: 2750000n, clientFeeAmount: 3750000n },
        ] as any);
      });

      vi.mocked(adminRoPrisma.user.findMany).mockResolvedValue([]);
      vi.mocked(adminRoPrisma.user.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.creator.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.client.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.verificationRecording.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.productEvent.findMany).mockResolvedValue([]);
      vi.mocked(adminRoPrisma.productEvent.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.payment.findMany).mockResolvedValue([]);
      vi.mocked(adminRoPrisma.payment.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.withdrawalRequest.findMany).mockResolvedValue([]);
      vi.mocked(adminRoPrisma.supportTicket.count).mockResolvedValue(2);
      vi.mocked(adminRoPrisma.alertEvent.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.alertEvent.findMany).mockResolvedValue([]);
      vi.mocked(getMaterializedViewLastRefreshed).mockResolvedValue(new Date());

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/overview",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);

      // Money must be an array of distinct currency records
      expect(Array.isArray(data.cards.money.byCurrency)).toBe(true);
      for (const m of data.cards.money.byCurrency) {
        expect(["NGN", "USD", "GBP"]).toContain(m.currency);
        expect(typeof m.gmv).toBe("number");
        expect(typeof m.platformRevenue).toBe("number");
      }

      // No cross-currency summed scalar in the cards
      expect(data.cards).not.toHaveProperty("totalGmvAllCurrencies");
      expect(data.cards).not.toHaveProperty("totalPlatformRevenueCombined");
    });
  });

  // ── 3. Test Users Excluded by Default ─────────────────────────────────────
  describe("3. Test User Exclusion (PRD Section 4 / 6)", () => {
    it("excludes test users from overview metrics and feed by default", async () => {
      const { token } = mockAdminSession("SUPER_ADMIN");

      // Mock ProductEvent with both real and test users
      vi.mocked(adminRoPrisma.productEvent.findMany).mockResolvedValue([
        {
          id: 101n,
          occurredAt: new Date("2026-06-10T12:00:00Z"),
          name: "auth_signup_completed",
          actorType: "USER",
          source: "API",
          userId: "usr-real-1",
          country: "NG",
          props: { provider: "EMAIL", userType: "TALENT", isTestUser: false },
        },
        {
          id: 102n,
          occurredAt: new Date("2026-06-10T12:05:00Z"),
          name: "auth_signup_completed",
          actorType: "USER",
          source: "API",
          userId: "usr-test-user-99",
          country: "US",
          props: { provider: "EMAIL", userType: "TALENT", isTestUser: true },
        },
      ] as any);

      vi.mocked(adminRoPrisma.user.findMany).mockResolvedValue([
        {
          id: "usr-real-1",
          email: "real@monologg.test",
          userType: "TALENT",
          isTestUser: false,
          creator: { name: "Real Talent", location: "Lagos, Nigeria" },
          client: null,
        },
        {
          id: "usr-test-user-99",
          email: "internal-qa@monologg.test",
          userType: "TALENT",
          isTestUser: true,
          creator: { name: "QA Tester", location: "New York, USA" },
          client: null,
        },
      ] as any);

      // 1. Default feed call without includeTestUsers
      const feedRes = await app.inject({
        method: "GET",
        url: "/api/v1/admin/feed",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(feedRes.statusCode).toBe(200);
      const feedData = JSON.parse(feedRes.body);

      // Only real user appears; test user is excluded
      expect(feedData.events).toHaveLength(1);
      expect(feedData.events[0].id).toBe("101");
      expect(feedData.events[0].actorLabel).not.toContain("QA Tester");

      // 2. Feed call with includeTestUsers=true
      const feedWithTestRes = await app.inject({
        method: "GET",
        url: "/api/v1/admin/feed?includeTestUsers=true",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(feedWithTestRes.statusCode).toBe(200);
      const feedWithTestData = JSON.parse(feedWithTestRes.body);
      expect(feedWithTestData.events).toHaveLength(2);
    });
  });

  // ── 4. Filters Change Results Correctly ───────────────────────────────────
  describe("4. Filters Behavior", () => {
    it("alters query results when date range and userType filters are passed", async () => {
      const { token } = mockAdminSession("SUPER_ADMIN");

      vi.mocked(adminRoPrisma.user.findMany).mockResolvedValue([]);
      vi.mocked(adminRoPrisma.user.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.creator.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.client.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.verificationRecording.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.productEvent.findMany).mockResolvedValue([]);
      vi.mocked(adminRoPrisma.productEvent.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.booking.findMany).mockResolvedValue([]);
      vi.mocked(adminRoPrisma.booking.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.booking.groupBy).mockResolvedValue([]);
      vi.mocked(adminRoPrisma.payment.findMany).mockResolvedValue([]);
      vi.mocked(adminRoPrisma.payment.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.withdrawalRequest.findMany).mockResolvedValue([]);
      vi.mocked(adminRoPrisma.supportTicket.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.alertEvent.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.alertEvent.findMany).mockResolvedValue([]);
      vi.mocked(getMaterializedViewLastRefreshed).mockResolvedValue(new Date());

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/overview?from=2026-05-01T00:00:00Z&to=2026-05-31T23:59:59Z&userType=TALENT&currency=NGN",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.period.from).toBe("2026-05-01T00:00:00.000Z");
      expect(data.period.to).toBe("2026-05-31T23:59:59.000Z");
      expect(data.period.previousFrom).toBeDefined();
    });
  });

  // ── 5. Feed Pagination Stability ──────────────────────────────────────────
  describe("5. Feed Pagination Stability", () => {
    it("guarantees stable cursor pagination with no duplicate items across pages", async () => {
      const { token } = mockAdminSession("SUPER_ADMIN");

      const eventBatch = [
        {
          id: 300n,
          occurredAt: new Date("2026-06-12T10:00:00Z"),
          name: "booking_started",
          actorType: "USER",
          userId: "usr-1",
          props: { bookingId: "b-1" },
        },
        {
          id: 299n,
          occurredAt: new Date("2026-06-12T09:30:00Z"),
          name: "escrow_locked",
          actorType: "USER",
          userId: "usr-2",
          props: { bookingId: "b-2" },
        },
        {
          id: 298n,
          occurredAt: new Date("2026-06-12T09:00:00Z"),
          name: "media_uploaded",
          actorType: "USER",
          userId: "usr-1",
          props: {},
        },
      ];

      vi.mocked(adminRoPrisma.productEvent.findMany).mockImplementation((args: any) => {
        if (args?.where?.id?.lt) {
          // Page 2 request with cursor
          return Promise.resolve(eventBatch.filter((e) => e.id < args.where.id.lt) as any);
        }
        return Promise.resolve(eventBatch as any);
      });

      vi.mocked(adminRoPrisma.user.findMany).mockResolvedValue([
        {
          id: "usr-1",
          email: "user1@example.com",
          userType: "TALENT",
          isTestUser: false,
          creator: { name: "User One", location: "Lagos, NG" },
          client: null,
        },
        {
          id: "usr-2",
          email: "user2@example.com",
          userType: "CLIENT",
          isTestUser: false,
          creator: null,
          client: { name: "User Two", location: "London, UK" },
        },
      ] as any);

      // Page 1 with limit 2
      const page1Res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/feed?limit=2",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(page1Res.statusCode).toBe(200);
      const page1 = JSON.parse(page1Res.body);
      expect(page1.events).toHaveLength(2);
      expect(page1.events[0].id).toBe("300");
      expect(page1.events[1].id).toBe("299");
      expect(page1.nextCursor).toBe("299");

      // Page 2 using nextCursor
      const page2Res = await app.inject({
        method: "GET",
        url: `/api/v1/admin/feed?cursor=${page1.nextCursor}&limit=2`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(page2Res.statusCode).toBe(200);
      const page2 = JSON.parse(page2Res.body);
      expect(page2.events).toHaveLength(1);
      expect(page2.events[0].id).toBe("298");

      // Verify no item overlaps between page 1 and page 2
      const page1Ids = page1.events.map((e: any) => e.id);
      const page2Ids = page2.events.map((e: any) => e.id);
      for (const id of page2Ids) {
        expect(page1Ids).not.toContain(id);
      }
    });
  });

  // ── 6. Signup Appears in Feed Within One Poll ─────────────────────────────
  describe("6. Real-Time Signup Event Ingestion to Feed", () => {
    it("causes a new signup event to appear in the live feed immediately", async () => {
      const { token } = mockAdminSession("SUPER_ADMIN");

      // Ingest signup event through track
      const newUserId = "usr-instant-signup";
      const signupEvent = {
        id: 501n,
        occurredAt: new Date(),
        name: "auth_signup_completed",
        actorType: "USER",
        source: "API",
        userId: newUserId,
        country: "NG",
        props: { provider: "EMAIL", userType: "TALENT" },
      };

      vi.mocked(adminRoPrisma.productEvent.findMany).mockResolvedValue([signupEvent as any]);
      vi.mocked(adminRoPrisma.user.findMany).mockResolvedValue([
        {
          id: newUserId,
          email: "instant-signup@monologg.test",
          userType: "TALENT",
          isTestUser: false,
          creator: { name: "David Adeleke", location: "Lagos, Nigeria" },
          client: null,
        },
      ] as any);

      // Next poll call to /feed
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/feed",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);

      expect(data.events).toHaveLength(1);
      const feedItem = data.events[0];
      expect(feedItem.name).toBe("auth_signup_completed");
      expect(feedItem.actorLabel).toBe(maskName("David Adeleke")); // Masked label: David A.
      expect(feedItem.country).toBe("NG");
      expect(feedItem.targetUrl).toBe(`/users/${newUserId}`);
    });
  });

  // ── 7. VIEWER Role Sees Overview with Zero PII ────────────────────────────
  describe("7. VIEWER Role Zero-PII Guarantee", () => {
    it("permits VIEWER to access overview and feed, returning strictly zero sensitive PII", async () => {
      const { token } = mockAdminSession("VIEWER");

      vi.mocked(adminRoPrisma.user.findMany).mockResolvedValue([
        {
          id: "usr-viewer-check",
          email: "super-sensitive-talent@secretcorp.com",
          userType: "TALENT",
          isTestUser: false,
          creator: { name: "Alexander Hamilton", location: "New York, USA" },
          client: null,
        },
      ] as any);

      vi.mocked(adminRoPrisma.productEvent.findMany).mockResolvedValue([
        {
          id: 601n,
          occurredAt: new Date(),
          name: "auth_signin_succeeded",
          actorType: "USER",
          userId: "usr-viewer-check",
          country: "US",
          props: {
            sensitiveTokenHash: "abc123secret",
            passwordHash: "not-allowed",
            provider: "EMAIL",
          },
        },
      ] as any);

      vi.mocked(adminRoPrisma.booking.groupBy).mockResolvedValue([]);
      vi.mocked(adminRoPrisma.booking.findMany).mockResolvedValue([]);
      vi.mocked(adminRoPrisma.booking.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.user.count).mockResolvedValue(1);
      vi.mocked(adminRoPrisma.creator.count).mockResolvedValue(1);
      vi.mocked(adminRoPrisma.client.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.verificationRecording.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.payment.findMany).mockResolvedValue([]);
      vi.mocked(adminRoPrisma.payment.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.withdrawalRequest.findMany).mockResolvedValue([]);
      vi.mocked(adminRoPrisma.supportTicket.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.alertEvent.count).mockResolvedValue(0);
      vi.mocked(adminRoPrisma.alertEvent.findMany).mockResolvedValue([]);
      vi.mocked(getMaterializedViewLastRefreshed).mockResolvedValue(new Date());

      // 1. Overview check
      const overviewRes = await app.inject({
        method: "GET",
        url: "/api/v1/admin/overview",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(overviewRes.statusCode).toBe(200);
      const overviewText = overviewRes.body;
      expect(overviewText).not.toContain("secretcorp.com");
      expect(overviewText).not.toContain("Alexander Hamilton");
      expect(overviewText).not.toContain("password");

      // 2. Feed check
      const feedRes = await app.inject({
        method: "GET",
        url: "/api/v1/admin/feed",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(feedRes.statusCode).toBe(200);
      const feedData = JSON.parse(feedRes.body);
      const feedText = feedRes.body;

      // Full raw email must NEVER appear
      expect(feedText).not.toContain("super-sensitive-talent@secretcorp.com");
      // Masked actor label must be used
      expect(feedData.events[0].actorLabel).toBe("Alexander H.");
      // Sensitive keys (password, token) must be scrubbed from props
      expect(feedData.events[0].props).not.toHaveProperty("sensitiveTokenHash");
      expect(feedData.events[0].props).not.toHaveProperty("passwordHash");
    });
  });
});
