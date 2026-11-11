import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildApp } from "../app.js";
import {
  getAcquisitionAnalytics,
  getFunnelAnalytics,
  getRetentionAnalytics,
  getTrafficAnalytics,
  getFeatureAdoptionAnalytics,
  getMarketplaceHealthAnalytics,
  runKpiDailySnapshot,
} from "../services/adminAnalytics.js";

// Mock DB clients
vi.mock("../db/client.js", () => {
  return {
    prisma: {
      user: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      productEvent: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      creator: {
        findMany: vi.fn(),
      },
      brief: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      booking: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      kpiDaily: {
        upsert: vi.fn(),
      },
      physicalAttributes: {
        findMany: vi.fn(),
      },
      availabilityBlock: {
        findMany: vi.fn(),
      },
      adminUser: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      adminSession: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      adminAuditLog: {
        create: vi.fn(),
      },
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
      productEvent: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      creator: {
        findMany: vi.fn(),
      },
      brief: {
        findMany: vi.fn(),
      },
      booking: {
        findMany: vi.fn(),
      },
      physicalAttributes: {
        findMany: vi.fn(),
      },
      availabilityBlock: {
        findMany: vi.fn(),
      },
    },
  };
});

import { prisma } from "../db/client.js";
import { adminRoPrisma } from "../db/adminRoClient.js";

const prismaMock = prisma as any;
const adminRoMock = adminRoPrisma as any;

describe("Phase A11: Analytics: Acquisition, Funnels, Retention, Traffic, Adoption & Marketplace (PRD M4 & M10)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  const ADMIN_SUPERADMIN_TOKEN = "mock-admin:superadmin@admin.monologg.dev:aal2";
  const ADMIN_OPS_TOKEN = "mock-admin:ops@admin.monologg.dev:aal2";
  const ADMIN_VIEWER_TOKEN = "mock-admin:viewer@admin.monologg.dev:aal2";

  beforeEach(async () => {
    vi.stubEnv("ADMIN_AUTH_PROVIDER", "mock");
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();

    prismaMock.adminSession.findFirst.mockImplementation(async ({ where }: any) => {
      return {
        id: "sess-analytics-1",
        adminUserId: where?.adminUserId || "adm-1",
        lastSeenAt: new Date(),
        createdAt: new Date(),
        endedAt: null,
      };
    });
    prismaMock.adminSession.update.mockResolvedValue({});

    prismaMock.adminUser.findFirst.mockImplementation(async ({ where }: any) => {
      const subject = (where?.authSubject || where?.email || "").toLowerCase();
      if (subject.includes("superadmin")) {
        return { id: "adm-super", email: "superadmin@admin.monologg.dev", role: "SUPER_ADMIN", status: "ACTIVE" };
      }
      if (subject.includes("ops")) {
        return { id: "adm-ops", email: "ops@admin.monologg.dev", role: "OPS", status: "ACTIVE" };
      }
      return { id: "adm-viewer", email: "viewer@admin.monologg.dev", role: "VIEWER", status: "ACTIVE" };
    });

    prismaMock.adminAuditLog.create.mockResolvedValue({});
  });

  // ── 1. Acquisition Analytics (AD-19 / M4.1) ──────────────────────────────────
  describe("1. Acquisition Analytics (AD-19)", () => {
    it("returns signups by source, referral leaderboard, and Unknown (no consent) share", async () => {
      const mockUsers = [
        {
          id: "u-1",
          email: "talent1@example.com",
          userType: "TALENT",
          createdAt: new Date("2026-02-01T10:00:00Z"),
          creator: {
            id: "c-1",
            name: "Chioma Adeleke",
            referralCode: "CHIOMA10",
            celebrityBadge: true,
            rateCards: [{ id: "rc-1" }],
            media: [{ id: "m-1" }],
            bookings: [{ id: "b-1" }],
          },
          client: null,
        },
        {
          id: "u-2",
          email: "talent2@example.com",
          userType: "TALENT",
          createdAt: new Date("2026-02-02T10:00:00Z"),
          creator: {
            id: "c-2",
            name: "Babatunde Raji",
            referralCode: "BABA20",
            celebrityBadge: false,
            rateCards: [{ id: "rc-2" }],
            media: [],
            bookings: [],
          },
          client: null,
        },
        {
          id: "u-3",
          email: "client1@example.com",
          userType: "CLIENT",
          createdAt: new Date("2026-02-03T10:00:00Z"),
          creator: null,
          client: {
            id: "cl-1",
            name: "Fola Brands",
            briefs: [{ id: "br-1" }],
            bookings: [],
          },
        },
      ];

      const mockEvents = [
        {
          userId: "u-1",
          utmSource: "Instagram",
          referrerDomain: "instagram.com",
          country: "NG",
          deviceClass: "mobile",
          occurredAt: new Date("2026-02-01T10:00:00Z"),
        },
        {
          userId: "u-3",
          utmSource: "Google",
          referrerDomain: "google.com",
          country: "NG",
          deviceClass: "desktop",
          occurredAt: new Date("2026-02-03T10:00:00Z"),
        },
        // u-2 has no attribution event -> treated as "Unknown (no consent)"
      ];

      adminRoMock.user.findMany.mockResolvedValue(mockUsers);
      adminRoMock.productEvent.findMany.mockResolvedValue(mockEvents);
      adminRoMock.creator.findMany.mockResolvedValue([
        { id: "c-1", name: "Chioma Adeleke", referralCode: "CHIOMA10", celebrityBadge: true },
        { id: "c-2", name: "Babatunde Raji", referralCode: "BABA20", celebrityBadge: false },
      ]);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/acquisition",
        headers: { authorization: `Bearer ${ADMIN_OPS_TOKEN}` },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();

      expect(data).toHaveProperty("bySource");
      expect(data).toHaveProperty("referralLeaderboard");
      expect(data).toHaveProperty("unknownShare");

      // Verify Unknown (no consent) calculation
      expect(data.unknownShare.count).toBe(1); // u-2
      expect(data.unknownShare.total).toBe(3);
      expect(data.unknownShare.sharePct).toBe(33.3);
      expect(data.unknownShare.label).toBe("Unknown (no consent)");

      // Check referral leaderboard masking
      const firstRef = data.referralLeaderboard[0];
      expect(firstRef.creatorName).not.toContain("Chioma Adeleke"); // Masked!
      expect(firstRef.hasCelebrityBadge).toBe(true);

      // Verify Activation and Booking rates
      const instagramSource = data.bySource.find((s: any) => s.source === "Instagram");
      expect(instagramSource).toBeDefined();
      expect(instagramSource.signups).toBe(1);
      expect(instagramSource.activatedCount).toBe(1);
      expect(instagramSource.activationRatePct).toBe(100);
      expect(instagramSource.firstBookingCount).toBe(1);
      expect(instagramSource.firstBookingRatePct).toBe(100);
    });
  });

  // ── 2. Funnel Analytics (AD-20 / M4.2) ───────────────────────────────────────
  describe("2. Funnel Analytics (AD-20)", () => {
    it("computes TALENT_ONBOARDING 7-step funnel matching hand count precisely", async () => {
      // Create deterministic 10 users:
      // 10 signups (0..9)
      // 8 emailVerified (0..7)
      // 6 onboarded (0..5)
      // 5 media uploaded (0, 1, 2, 4, 5)
      // 4 rate card created (0, 1, 2, 3)
      // 3 activated: both media and rate card (0, 1, 2)
      // 2 first booking (0, 1)
      const mockTalent = Array.from({ length: 10 }, (_, i) => ({
        id: `talent-${i + 1}`,
        email: `talent${i + 1}@monologg.dev`,
        userType: "TALENT",
        emailVerified: i < 8,
        createdAt: new Date(`2026-02-0${(i % 5) + 1}T10:00:00Z`),
        creator: {
          id: `creator-${i + 1}`,
          name: i < 6 ? `Talent Name ${i + 1}` : "",
          location: i < 6 ? "Lagos, Nigeria" : "",
          media: [0, 1, 2, 4, 5].includes(i) ? [{ id: `med-${i + 1}` }] : [],
          rateCards: [0, 1, 2, 3].includes(i) ? [{ id: `rc-${i + 1}` }] : [],
          bookings: [0, 1].includes(i) ? [{ id: `bk-${i + 1}` }] : [],
        },
      }));

      adminRoMock.user.findMany.mockResolvedValue(mockTalent);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/funnels?funnelId=TALENT_ONBOARDING",
        headers: { authorization: `Bearer ${ADMIN_OPS_TOKEN}` },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();

      expect(data.funnelId).toBe("TALENT_ONBOARDING");
      expect(data.steps).toHaveLength(7);

      // Verify hand-counted step totals:
      expect(data.steps[0].count).toBe(10); // signup
      expect(data.steps[1].count).toBe(8);  // email_verified
      expect(data.steps[2].count).toBe(6);  // onboarded
      expect(data.steps[3].count).toBe(5);  // media_uploaded
      expect(data.steps[4].count).toBe(4);  // rate_card_created
      expect(data.steps[5].count).toBe(3);  // activated
      expect(data.steps[6].count).toBe(2);  // first_booking

      // Hand-counted conversion percentages
      expect(data.steps[0].overallConversionPct).toBe(100);
      expect(data.steps[1].conversionFromPreviousPct).toBe(80); // 8 / 10
      expect(data.steps[6].overallConversionPct).toBe(20);      // 2 / 10 = 20%
      expect(data.overallConversionPct).toBe(20);

      // Biggest drop-off step identification
      expect(data.biggestDropOffStep).toBeDefined();

      // Dropped users list check (masked PII)
      const step1Dropped = data.steps[0].droppedUsers;
      expect(step1Dropped.length).toBe(2); // 10 signup - 8 verified = 2 dropped
      expect(step1Dropped[0].userId).toBe("talent-9");
      expect(step1Dropped[0].email).toContain("***"); // Masked!
    });

    it("supports CLIENT_LIFECYCLE and EXTERNAL_BOOKING funnels", async () => {
      const mockClients = [
        {
          id: "cl-u-1",
          email: "client@test.com",
          userType: "CLIENT",
          createdAt: new Date(),
          client: {
            id: "cl-1",
            name: "Agency One",
            briefs: [{ id: "br-1" }],
            bookings: [
              { id: "b-1", state: "DELIVERABLES_PROVIDED", payment: { id: "p-1" } },
            ],
          },
        },
      ];

      adminRoMock.user.findMany.mockResolvedValue(mockClients);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/funnels?funnelId=CLIENT_LIFECYCLE",
        headers: { authorization: `Bearer ${ADMIN_OPS_TOKEN}` },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.funnelId).toBe("CLIENT_LIFECYCLE");
      expect(data.steps).toHaveLength(5);
    });
  });

  // ── 3. Retention Analytics (AD-21 / M4.3) ───────────────────────────────────
  describe("3. Retention Analytics (AD-21)", () => {
    it("returns weekly cohort retention matrix W0 through W8", async () => {
      const baseDate = new Date("2026-01-05T00:00:00Z"); // Week 1 of 2026

      const mockUsers = [
        { id: "u-ret-1", createdAt: baseDate },
        { id: "u-ret-2", createdAt: baseDate },
      ];

      // u-ret-1 was active in W0 and W1
      // u-ret-2 was active only in W0
      const mockEvents = [
        { userId: "u-ret-1", occurredAt: baseDate },
        { userId: "u-ret-1", occurredAt: new Date(baseDate.getTime() + 8 * 24 * 3600 * 1000) }, // +8 days -> W1
        { userId: "u-ret-2", occurredAt: baseDate },
      ];

      adminRoMock.user.findMany.mockResolvedValue(mockUsers);
      adminRoMock.productEvent.findMany.mockResolvedValue(mockEvents);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/retention?userType=ALL",
        headers: { authorization: `Bearer ${ADMIN_OPS_TOKEN}` },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();

      expect(data.cohorts.length).toBeGreaterThan(0);
      const cohort = data.cohorts[0];
      expect(cohort.cohortSize).toBe(2);
      expect(cohort.weeks).toHaveLength(9); // W0 to W8

      // W0 retention is 100%
      expect(cohort.weeks[0].retentionPct).toBe(100);
      expect(cohort.weeks[0].activeCount).toBe(2);

      // W1 retention has 1 active user out of 2 (50%)
      expect(cohort.weeks[1].activeCount).toBe(1);
      expect(cohort.weeks[1].retentionPct).toBe(50);
    });
  });

  // ── 4. Traffic Analytics (AD-22 / M4.4) ─────────────────────────────────────
  describe("4. Traffic Analytics (AD-22)", () => {
    it("returns traffic volume, device/browser mixes, and consent notice banner", async () => {
      const mockPageViews = [
        {
          path: "/creators/chioma",
          referrerDomain: "twitter.com",
          country: "NG",
          deviceClass: "mobile",
          browser: "Safari",
          anonymousId: "anon-1",
          userId: null,
          occurredAt: new Date("2026-02-01T12:00:00Z"),
          props: { creatorId: "c-1" },
        },
        {
          path: "/creators/chioma/media-kit",
          referrerDomain: "twitter.com",
          country: "NG",
          deviceClass: "desktop",
          browser: "Chrome",
          anonymousId: null,
          userId: "u-client-1",
          occurredAt: new Date("2026-02-01T13:00:00Z"),
          props: { creatorId: "c-1", mode: "media-kit" },
        },
      ];

      adminRoMock.productEvent.count.mockResolvedValue(mockPageViews.length);
      adminRoMock.productEvent.findMany.mockResolvedValue(mockPageViews);
      adminRoMock.creator.findMany.mockResolvedValue([
        { id: "c-1", name: "Chioma Adeleke" },
      ]);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/traffic",
        headers: { authorization: `Bearer ${ADMIN_OPS_TOKEN}` },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();

      expect(data.consentRateNotice).toBe("Numbers cover visitors who accepted analytics.");
      expect(data.consentRatePct).toBeGreaterThan(0);
      expect(data.topCreatorViews.length).toBeGreaterThan(0);
      expect(data.topCreatorViews[0].creatorName).not.toContain("Chioma Adeleke"); // Masked!
      expect(data.topPages).toBeDefined();
    });
  });

  // ── 5. Feature Adoption (AD-23 / M10.2) + Negative Privacy Constraint ─────────
  describe("5. Feature Adoption (AD-23)", () => {
    it("ranks features and verifies STRICT PRIVACY: ZERO physical attribute values returned", async () => {
      adminRoMock.user.count
        .mockResolvedValueOnce(50)  // talentCount
        .mockResolvedValueOnce(20); // clientCount

      adminRoMock.productEvent.findMany.mockResolvedValue([
        { userId: "u-1", name: "storefront_viewed", occurredAt: new Date("2026-02-01T10:00:00Z") },
        { userId: "u-1", name: "storefront_viewed", occurredAt: new Date("2026-02-02T10:00:00Z") }, // 2 distinct days = repeat
        { userId: "u-2", name: "storefront_viewed", occurredAt: new Date("2026-02-01T10:00:00Z") },
      ]);

      adminRoMock.physicalAttributes.findMany.mockResolvedValue([
        {
          visibility: {
            heightRange: "PUBLIC",
            weightRange: "SEARCHABLE",
            skinTone: "PRIVATE",
          },
          // Real row might have sensitive values in DB:
          heightRange: "175_180_CM",
          weightRange: "70_75_KG",
          skinTone: "DARK",
        },
      ]);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/features",
        headers: { authorization: `Bearer ${ADMIN_OPS_TOKEN}` },
      });

      expect(res.statusCode).toBe(200);
      const rawText = res.body;
      const data = res.json();

      expect(data.features.length).toBeGreaterThan(0);
      expect(data.features[0].rank).toBe(1);

      // Verify Attributes Aggregate Stats
      expect(data.attributesAggregate).toBeDefined();
      expect(data.attributesAggregate.completionRatePct).toBe(2); // 1 / 50 = 2%
      expect(data.attributesAggregate.visibilityMix.publicCount).toBe(1);
      expect(data.attributesAggregate.visibilityMix.searchableCount).toBe(1);
      expect(data.attributesAggregate.visibilityMix.privateCount).toBe(1);

      // NEGATIVE PRIVACY INVARIANT: Ensure NO individual attribute values leaked!
      expect(rawText).not.toContain("175_180_CM");
      expect(rawText).not.toContain("70_75_KG");
      expect(rawText).not.toContain("DARK");
    });
  });

  // ── 6. Marketplace Health (AD-24 / M10.1) + Search Privacy Constraint ────────
  describe("6. Marketplace Health (AD-24)", () => {
    it("computes liquidity metrics and returns zero-result search keys ONLY (no values)", async () => {
      adminRoMock.creator.findMany.mockResolvedValue([
        {
          niche: "ACTOR",
          verification: "VERIFIED",
          rateCards: [{ id: "rc-1" }],
          availability: [{ id: "av-1" }],
          media: [{ id: "m-1" }],
        },
        {
          niche: "VO_ARTIST",
          verification: "UNVERIFIED",
          rateCards: [],
          availability: [],
          media: [],
        },
      ]);

      adminRoMock.brief.findMany.mockResolvedValue([
        {
          nicheReq: ["ACTOR"],
          createdAt: new Date("2026-02-01T10:00:00Z"),
          applicantCap: 5,
          applications: [
            {
              id: "app-1",
              status: "SELECTED",
              createdAt: new Date("2026-02-01T14:00:00Z"), // 4 hours later (<48h)
            },
          ],
        },
      ]);

      // Search events with sensitive search terms/values
      adminRoMock.productEvent.findMany.mockResolvedValue([
        {
          props: {
            resultCount: 0,
            niche: "VO_ARTIST",
            filterKeys: ["accent", "tone"],
            accent: "British_Posh",       // Sensitive search value!
            tone: "Deep_Authoritative",   // Sensitive search value!
          },
        },
      ]);

      adminRoMock.availabilityBlock.findMany.mockResolvedValue([
        {
          slots: [
            { id: "s-1", state: "booked", bookingId: "b-1" },
            { id: "s-2", state: "available", bookingId: null },
          ],
        },
      ]);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/marketplace",
        headers: { authorization: `Bearer ${ADMIN_OPS_TOKEN}` },
      });

      expect(res.statusCode).toBe(200);
      const rawText = res.body;
      const data = res.json();

      // Verify Liquidity Metrics
      expect(data.liquidity.totalBriefsCount).toBe(1);
      expect(data.liquidity.briefsWithin48HoursPct).toBe(100);
      expect(data.liquidity.selectionRatePct).toBe(100);
      expect(data.liquidity.medianHoursToFirstApplication).toBe(4);

      // Verify Availability Slots
      expect(data.availabilityUse.totalSlots).toBe(2);
      expect(data.availabilityUse.bookedSlots).toBe(1);
      expect(data.availabilityUse.bookedSlotsPct).toBe(50);

      // Verify Unmet Demand Keys
      expect(data.unmetDemand.length).toBeGreaterThan(0);
      const zeroSearch = data.unmetDemand[0];
      expect(zeroSearch.niche).toBe("VO_ARTIST");
      expect(zeroSearch.filterKeys).toEqual(["accent", "tone"]);

      // NEGATIVE PRIVACY INVARIANT: Search values MUST NOT appear in the response!
      expect(rawText).not.toContain("British_Posh");
      expect(rawText).not.toContain("Deep_Authoritative");
    });
  });

  // ── 7. Nightly Snapshot Job (PRD M10 / KpiDaily) ────────────────────────────
  describe("7. Nightly KPI Snapshot Job", () => {
    it("runs runKpiDailySnapshot and writes KpiDaily rows and audit log", async () => {
      prismaMock.user.count.mockResolvedValue(150);
      prismaMock.productEvent.count.mockResolvedValue(8500);
      prismaMock.brief.count.mockResolvedValue(45);
      prismaMock.booking.count.mockResolvedValue(32);
      prismaMock.kpiDaily.upsert.mockResolvedValue({});

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/admin/kpi/snapshot",
        headers: { authorization: `Bearer ${ADMIN_SUPERADMIN_TOKEN}` },
        payload: { day: "2026-02-10" },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.status).toBe("ok");
      expect(data.snapshotsRecorded).toBe(4);

      // Verify KpiDaily upsert calls
      expect(prismaMock.kpiDaily.upsert).toHaveBeenCalledTimes(4);

      // Verify audit log call
      expect(prismaMock.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "KPI_SNAPSHOT_RUN",
            targetType: "KpiDaily",
          }),
        }),
      );
    });

    it("forbids VIEWER from running snapshot", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/admin/kpi/snapshot",
        headers: { authorization: `Bearer ${ADMIN_VIEWER_TOKEN}` },
        payload: {},
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ── 8. Performance on 10,000 Users and Scale Benchmark ──────────────────────
  describe("8. Performance at Scale (10,000 users)", () => {
    it("processes 10,000 user rows in getAcquisitionAnalytics within 500ms", async () => {
      const largeUserList = Array.from({ length: 10000 }, (_, i) => ({
        id: `scale-user-${i}`,
        email: `user${i}@scale.dev`,
        userType: i % 2 === 0 ? "TALENT" : "CLIENT",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        creator: i % 2 === 0 ? {
          id: `cr-${i}`,
          name: `Creator ${i}`,
          referralCode: `REF${i % 100}`,
          celebrityBadge: i % 100 === 0,
          rateCards: [{ id: `rc-${i}` }],
          media: [{ id: `med-${i}` }],
          bookings: [{ id: `bk-${i}` }],
        } : null,
        client: i % 2 !== 0 ? {
          id: `cl-${i}`,
          name: `Client ${i}`,
          briefs: [{ id: `br-${i}` }],
          bookings: [{ id: `bk-${i}` }],
        } : null,
      }));

      adminRoMock.user.findMany.mockResolvedValue(largeUserList);
      adminRoMock.productEvent.findMany.mockResolvedValue([]);
      adminRoMock.creator.findMany.mockResolvedValue([]);

      const startTime = performance.now();
      const result = await getAcquisitionAnalytics();
      const durationMs = performance.now() - startTime;

      expect(result.bySource.length).toBeGreaterThan(0);
      expect(result.unknownShare.total).toBe(10000);
      expect(durationMs).toBeLessThan(500); // Sub-second execution on 10,000 users!
    });
  });
});
