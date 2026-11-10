import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import type { AdminRole } from "@prisma/client";
import { evaluateBookingStuck, isBookingStuck } from "../services/stuckDetection.js";
import { listAdminBookings, getAdminBookingDetail } from "../services/adminBookings.js";
import { STUCK_THRESHOLDS, MS_PER_DAY, MS_PER_MINUTE } from "../config/stuckRules.js";

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
      booking: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      rateCard: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
      },
      supportTicket: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      productEvent: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  };
});

vi.mock("../db/adminRoClient.js", () => {
  return {
    adminRoPrisma: {
      booking: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      rateCard: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
      },
      supportTicket: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      productEvent: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      user: {
        findUnique: vi.fn(),
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

describe("Phase A6: Bookings & Order Rooms (PRD M5)", () => {
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
      ipHash: "hash-ip",
    };

    vi.mocked(prisma.adminUser.findFirst).mockResolvedValue(admin as any);
    vi.mocked(prisma.adminSession.findFirst).mockResolvedValue(session as any);

    return { token: `mock-admin:${email}:aal2`, admin, session };
  }

  // ===========================================================================
  // 1. Stuck Detection Unit Tests (Thresholds & Edge Cases)
  // ===========================================================================
  describe("Stuck Rules Evaluation (PRD M5.1 / AC3)", () => {
    const now = new Date("2026-11-10T12:00:00Z");

    describe("Rule 1: PENDING_PAYMENT past slotHoldExpiresAt", () => {
      it("is NOT stuck when slotHoldExpiresAt is in the future", () => {
        const booking = {
          id: "b-1",
          state: "PENDING_PAYMENT",
          createdAt: new Date(now.getTime() - 10 * MS_PER_MINUTE),
          slotHoldExpiresAt: new Date(now.getTime() + 20 * MS_PER_MINUTE), // 20m in future
        };
        const result = evaluateBookingStuck(booking, { now });
        expect(result.isStuck).toBe(false);
        expect(result.reason).toBeNull();
      });

      it("is STUCK when slotHoldExpiresAt is 1 second in the past", () => {
        const booking = {
          id: "b-2",
          state: "PENDING_PAYMENT",
          createdAt: new Date(now.getTime() - 31 * MS_PER_MINUTE),
          slotHoldExpiresAt: new Date(now.getTime() - 1000), // 1s in past
        };
        const result = evaluateBookingStuck(booking, { now });
        expect(result.isStuck).toBe(true);
        expect(result.reason).toBe("PENDING_PAYMENT past slotHoldExpiresAt");
        expect(result.ruleKey).toBe("PENDING_PAYMENT_EXPIRED");
      });

      it("is STUCK for internal booking (no slotHoldExpiresAt) older than 30 minutes", () => {
        const booking = {
          id: "b-3",
          state: "PENDING_PAYMENT",
          createdAt: new Date(now.getTime() - 31 * MS_PER_MINUTE),
          slotHoldExpiresAt: null,
        };
        const result = evaluateBookingStuck(booking, { now });
        expect(result.isStuck).toBe(true);
        expect(result.reason).toContain("past default slot hold duration");
        expect(result.ruleKey).toBe("PENDING_PAYMENT_EXPIRED");
      });

      it("is NOT stuck for internal booking under 30 minutes", () => {
        const booking = {
          id: "b-4",
          state: "PENDING_PAYMENT",
          createdAt: new Date(now.getTime() - 25 * MS_PER_MINUTE),
          slotHoldExpiresAt: null,
        };
        const result = evaluateBookingStuck(booking, { now });
        expect(result.isStuck).toBe(false);
      });
    });

    describe("Rule 2: ESCROW_LOCKED over 7 days", () => {
      it("is NOT stuck when in ESCROW_LOCKED for 6 days 23 hours", () => {
        const stateEnteredAt = new Date(now.getTime() - (7 * MS_PER_DAY - 60 * 1000));
        const booking = {
          id: "b-5",
          state: "ESCROW_LOCKED",
          createdAt: new Date(now.getTime() - 10 * MS_PER_DAY),
        };
        const result = evaluateBookingStuck(booking, { stateEnteredAt, now });
        expect(result.isStuck).toBe(false);
      });

      it("is STUCK when in ESCROW_LOCKED for 7 days + 1 second", () => {
        const stateEnteredAt = new Date(now.getTime() - (7 * MS_PER_DAY + 1000));
        const booking = {
          id: "b-6",
          state: "ESCROW_LOCKED",
          createdAt: new Date(now.getTime() - 10 * MS_PER_DAY),
        };
        const result = evaluateBookingStuck(booking, { stateEnteredAt, now });
        expect(result.isStuck).toBe(true);
        expect(result.reason).toBe("ESCROW_LOCKED over 7 days");
        expect(result.ruleKey).toBe("ESCROW_LOCKED_STALE");
      });
    });

    describe("Rule 3: DELIVERABLES_PROVIDED over 5 days", () => {
      it("is NOT stuck when in DELIVERABLES_PROVIDED for 4 days 23 hours", () => {
        const stateEnteredAt = new Date(now.getTime() - (5 * MS_PER_DAY - 60 * 1000));
        const booking = {
          id: "b-7",
          state: "DELIVERABLES_PROVIDED",
          createdAt: new Date(now.getTime() - 12 * MS_PER_DAY),
        };
        const result = evaluateBookingStuck(booking, { stateEnteredAt, now });
        expect(result.isStuck).toBe(false);
      });

      it("is STUCK when in DELIVERABLES_PROVIDED for 5 days + 1 second", () => {
        const stateEnteredAt = new Date(now.getTime() - (5 * MS_PER_DAY + 1000));
        const booking = {
          id: "b-8",
          state: "DELIVERABLES_PROVIDED",
          createdAt: new Date(now.getTime() - 12 * MS_PER_DAY),
        };
        const result = evaluateBookingStuck(booking, { stateEnteredAt, now });
        expect(result.isStuck).toBe(true);
        expect(result.reason).toBe("DELIVERABLES_PROVIDED over 5 days");
        expect(result.ruleKey).toBe("DELIVERABLES_UNREVIEWED");
      });
    });

    describe("Terminal & Other States", () => {
      it("is never stuck when PAYMENT_RELEASED or CANCELLED", () => {
        const oldDate = new Date(now.getTime() - 30 * MS_PER_DAY);
        expect(isBookingStuck({ id: "b-9", state: "PAYMENT_RELEASED", createdAt: oldDate }, { now })).toBe(false);
        expect(isBookingStuck({ id: "b-10", state: "CANCELLED", createdAt: oldDate }, { now })).toBe(false);
      });
    });
  });

  // ===========================================================================
  // 2. GET /admin/bookings List & Filters Tests
  // ===========================================================================
  describe("GET /api/v1/admin/bookings (AD-07)", () => {
    it("returns list of bookings with cursor pagination and fee breakdown", async () => {
      const { token } = mockAdminSession("OPS");

      const mockBookings = [
        {
          id: "book-1",
          creatorId: "creator-1",
          clientId: "client-1",
          rateCardId: "rc-1",
          state: "ESCROW_LOCKED",
          origin: "INTERNAL",
          currency: "NGN",
          baseAmount: 10_000_000, // ₦100,000 in kobo
          clientFeeAmount: 1_500_000, // ₦15,000 (15%)
          talentFeeAmount: 1_100_000, // ₦11,000 (11%)
          slotDate: new Date("2026-11-15"),
          slotStart: "10:00",
          slotEnd: "11:00",
          createdAt: new Date(Date.now() - 2 * MS_PER_DAY),
          creator: {
            id: "creator-1",
            userId: "usr-creator-1",
            name: "Chioma Chukwu",
            niche: "ACTING",
            avatarUrl: "https://example.com/avatar1.jpg",
            referralCode: "CHIOMA10",
          },
          client: {
            id: "client-1",
            userId: "usr-client-1",
            name: "Amina Bello",
            orgName: "FilmOne",
            avatarUrl: null,
          },
          payment: {
            id: "pay-1",
            status: "ESCROW_HELD",
            provider: "paystack",
            providerRef: "pstk_123",
            escrowHeld: true,
            amount: 11_500_000,
          },
        },
      ];

      vi.mocked(adminRoPrisma.booking.findMany as any).mockResolvedValue(mockBookings);
      vi.mocked(adminRoPrisma.booking.count as any).mockResolvedValue(1);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/bookings?state=ESCROW_LOCKED&currency=NGN",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.bookings).toHaveLength(1);

      const b = body.bookings[0];
      expect(b.id).toBe("book-1");
      expect(b.state).toBe("ESCROW_LOCKED");
      expect(b.currency).toBe("NGN");
      expect(b.baseAmount).toBe(10_000_000);
      expect(b.clientFeeAmount).toBe(1_500_000);
      expect(b.talentFeeAmount).toBe(1_100_000);
      expect(b.clientTotal).toBe(11_500_000); // 100k + 15k
      expect(b.talentNet).toBe(8_900_000); // 100k - 11k
      expect(b.talent.name).toBe("Chioma Chukwu");
      expect(b.client.name).toBe("Amina Bello");
      expect(b.isStuck).toBe(false);
      expect(b.ageInState).toBeDefined();
    });

    it("supports the alias route GET /admin/bookings", async () => {
      const { token } = mockAdminSession("VIEWER");
      vi.mocked(adminRoPrisma.booking.findMany as any).mockResolvedValue([]);
      vi.mocked(adminRoPrisma.booking.count as any).mockResolvedValue(0);

      const res = await app.inject({
        method: "GET",
        url: "/admin/bookings",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.bookings).toEqual([]);
    });

    it("filters by stuck=true and returns only stuck bookings", async () => {
      const { token } = mockAdminSession("OPS");

      const stuckBooking = {
        id: "book-stuck",
        state: "ESCROW_LOCKED",
        origin: "INTERNAL",
        currency: "USD",
        baseAmount: 50_000,
        clientFeeAmount: 7_500,
        talentFeeAmount: 5_500,
        createdAt: new Date(Date.now() - 10 * MS_PER_DAY), // 10 days old (> 7 days)
        creator: { id: "c1", userId: "u1", name: "Creator 1", niche: "MUSIC" },
        client: { id: "cl1", userId: "u2", name: "Client 1" },
      };

      const freshBooking = {
        id: "book-fresh",
        state: "ESCROW_LOCKED",
        origin: "INTERNAL",
        currency: "USD",
        baseAmount: 50_000,
        clientFeeAmount: 7_500,
        talentFeeAmount: 5_500,
        createdAt: new Date(Date.now() - 1 * MS_PER_DAY), // 1 day old
        creator: { id: "c2", userId: "u3", name: "Creator 2", niche: "MUSIC" },
        client: { id: "cl2", userId: "u4", name: "Client 2" },
      };

      vi.mocked(adminRoPrisma.booking.findMany as any).mockResolvedValue([stuckBooking, freshBooking]);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/bookings?stuck=true",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.bookings).toHaveLength(1);
      expect(body.bookings[0].id).toBe("book-stuck");
      expect(body.bookings[0].isStuck).toBe(true);
      expect(body.bookings[0].stuckReason).toBe("ESCROW_LOCKED over 7 days");
    });
  });

  // ===========================================================================
  // 3. GET /admin/bookings/:id Detail & Timeline Tests (AD-08)
  // ===========================================================================
  describe("GET /api/v1/admin/bookings/:id (AD-08)", () => {
    it("returns complete booking detail, fee breakdown, and chronological audit timeline", async () => {
      const { token } = mockAdminSession("SUPER_ADMIN");

      const createdAt = new Date("2026-11-01T10:00:00Z");
      const escrowTime = new Date("2026-11-01T10:05:00Z");
      const deliverablesTime = new Date("2026-11-03T14:00:00Z");

      const mockBooking = {
        id: "book-123",
        creatorId: "creator-1",
        clientId: "client-1",
        rateCardId: "rc-1",
        state: "DELIVERABLES_PROVIDED",
        origin: "INTERNAL",
        currency: "NGN",
        baseAmount: 20_000_000, // ₦200,000
        clientFeeAmount: 3_000_000, // ₦30,000
        talentFeeAmount: 2_200_000, // ₦22,000
        meetUrl: "https://meet.google.com/xyz-abc-def",
        contextNote: "Filming brand commercial in Lagos",
        slotDate: new Date("2026-11-04"),
        slotStart: "10:00",
        slotEnd: "12:00",
        createdAt,
        creator: {
          id: "creator-1",
          userId: "usr-c1",
          name: "Davido Adeleke",
          niche: "MUSIC",
          bio: "Afrobeats Artist",
          avatarUrl: "https://example.com/davido.jpg",
          celebrityBadge: true,
          referralCode: "DAVIDO",
          user: {
            id: "usr-c1",
            email: "davido@example.com",
            phone: "+2348011112222",
          },
        },
        client: {
          id: "client-1",
          userId: "usr-cl1",
          name: "Nike Nigeria",
          orgName: "Nike Inc",
          orgType: "Brand",
          avatarUrl: null,
          user: {
            id: "usr-cl1",
            email: "brand@nike.com",
            phone: "+2348033334444",
          },
        },
        payment: {
          id: "pay-123",
          status: "ESCROW_HELD",
          provider: "paystack",
          providerRef: "pstk_tx_999",
          escrowHeld: true,
          amount: 23_000_000,
          currency: "NGN",
          createdAt: escrowTime,
          events: [
            {
              id: "pe-1",
              type: "charge.success",
              eventId: "evt-pay-1",
              createdAt: escrowTime,
            },
          ],
        },
        orderRoom: {
          id: "room-123",
          messages: [
            { id: "m1", kind: "TEXT", senderId: "usr-cl1", createdAt: new Date("2026-11-01T10:10:00Z") },
            { id: "m2", kind: "DOCUMENT", senderId: "usr-c1", createdAt: new Date("2026-11-03T13:50:00Z") },
            { id: "m3", kind: "SYSTEM", senderId: "system", createdAt: new Date("2026-11-03T14:00:00Z") },
          ],
        },
      };

      vi.mocked(adminRoPrisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      vi.mocked(adminRoPrisma.rateCard.findUnique as any).mockResolvedValue({
        id: "rc-1",
        serviceTitle: "Commercial Feature Shoot",
        deliveryTimeline: 7,
      });

      // Mock ProductEvents for state changes
      vi.mocked(adminRoPrisma.productEvent.findMany as any).mockResolvedValue([
        {
          id: 101n,
          name: "booking_state_changed",
          actorType: "SYSTEM",
          source: "API",
          occurredAt: escrowTime,
          props: { bookingId: "book-123", from: "PENDING_PAYMENT", to: "ESCROW_LOCKED", currency: "NGN" },
        },
        {
          id: 102n,
          name: "booking_state_changed",
          actorType: "USER",
          source: "API",
          occurredAt: deliverablesTime,
          props: { bookingId: "book-123", from: "ESCROW_LOCKED", to: "DELIVERABLES_PROVIDED", currency: "NGN" },
        },
      ]);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/bookings/book-123",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();

      // Verify Booking summary & stored fees
      expect(body.booking.id).toBe("book-123");
      expect(body.booking.state).toBe("DELIVERABLES_PROVIDED");
      expect(body.booking.baseAmount).toBe(20_000_000);
      expect(body.booking.clientFeeAmount).toBe(3_000_000);
      expect(body.booking.talentFeeAmount).toBe(2_200_000);
      expect(body.booking.clientTotal).toBe(23_000_000);
      expect(body.booking.talentNet).toBe(17_800_000);
      expect(body.booking.feeBreakdownLabel).toBe("Fee breakdown equals stored amounts from booking creation");

      // Verify parties & masked PII
      expect(body.booking.talent.name).toBe("Davido Adeleke");
      expect(body.booking.talent.email).toContain("***@");
      expect(body.booking.client.email).toContain("***@");

      // Verify OrderRoom metadata
      expect(body.orderRoom.exists).toBe(true);
      expect(body.orderRoom.totalMessages).toBe(3);
      expect(body.orderRoom.countsByKind.TEXT).toBe(1);
      expect(body.orderRoom.countsByKind.DOCUMENT).toBe(1);
      expect(body.orderRoom.countsByKind.SYSTEM).toBe(1);
      expect(body.orderRoom.fileCount).toBe(1);
      expect(body.orderRoom.callLinks).toContain("https://meet.google.com/xyz-abc-def");

      // Verify Timeline is chronologically sorted
      expect(body.timeline.length).toBeGreaterThanOrEqual(4);
      for (let i = 0; i < body.timeline.length - 1; i++) {
        const t1 = new Date(body.timeline[i].timestamp).getTime();
        const t2 = new Date(body.timeline[i + 1].timestamp).getTime();
        expect(t1).toBeLessThanOrEqual(t2);
      }
    });

    it("marks telemetry gaps clearly when historical state changes lack product events", async () => {
      const { token } = mockAdminSession("OPS");

      const mockBooking = {
        id: "book-gap-1",
        state: "ESCROW_LOCKED", // State reached, but no telemetry product events exist!
        origin: "INTERNAL",
        currency: "USD",
        baseAmount: 100_000,
        clientFeeAmount: 15_000,
        talentFeeAmount: 11_000,
        createdAt: new Date("2026-10-01T10:00:00Z"),
        creator: { id: "c1", user: { id: "u1", email: "a@b.com" } },
        client: { id: "cl1", user: { id: "u2", email: "c@d.com" } },
        payment: {
          id: "pay-gap",
          status: "ESCROW_HELD",
          createdAt: new Date("2026-10-01T10:05:00Z"),
          events: [],
        },
        orderRoom: { messages: [] },
      };

      vi.mocked(adminRoPrisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      vi.mocked(adminRoPrisma.productEvent.findMany as any).mockResolvedValue([]); // No events!

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/bookings/book-gap-1",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();

      // Gap item should be present and flagged
      const gapItem = body.timeline.find((t: any) => t.isGap === true);
      expect(gapItem).toBeDefined();
      expect(gapItem.type).toBe("GAP");
      expect(gapItem.description).toContain("No direct booking_state_changed event logged");
    });
  });

  // ===========================================================================
  // 4. Strict Negative Privacy Invariant Tests (No Message Content)
  // ===========================================================================
  describe("Strict Privacy Check: No Chat Content Exposed (PRD M5.2 / AC3)", () => {
    it("never returns raw message text anywhere in bookings API responses", async () => {
      const { token } = mockAdminSession("SUPER_ADMIN");

      const SECRET_MESSAGE = "TOP_SECRET_OFFLINE_PAYMENT_NEGOTIATION_12345";

      const mockBooking = {
        id: "book-privacy",
        state: "ESCROW_LOCKED",
        origin: "INTERNAL",
        currency: "NGN",
        baseAmount: 100_000,
        clientFeeAmount: 15_000,
        talentFeeAmount: 11_000,
        createdAt: new Date(),
        creator: { id: "c1", user: { id: "u1", email: "c@m.com" } },
        client: { id: "cl1", user: { id: "u2", email: "cl@m.com" } },
        payment: null,
        orderRoom: {
          id: "room-p",
          messages: [
            {
              id: "msg-1",
              kind: "TEXT",
              content: SECRET_MESSAGE, // Private content in DB
              createdAt: new Date(),
            },
          ],
        },
      };

      vi.mocked(adminRoPrisma.booking.findUnique as any).mockResolvedValue(mockBooking);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/bookings/book-privacy",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const rawText = res.body;

      // Assert that the raw text does NOT contain the secret message
      expect(rawText).not.toContain(SECRET_MESSAGE);

      // Inspect JSON structure
      const body = res.json();
      expect(body.orderRoom).toBeDefined();
      expect(body.orderRoom.messages).toBeUndefined(); // messages array itself omitted!
      expect(body.orderRoom.countsByKind.TEXT).toBe(1);
    });
  });

  // ===========================================================================
  // 5. Review Conversation Gating Tests
  // ===========================================================================
  describe("Conversation Review Gating (PRD M5.2 / AC3)", () => {
    it("disables review button when no open dispute or ticket exists", async () => {
      const { token } = mockAdminSession("OPS");

      const mockBooking = {
        id: "book-nodispute",
        state: "ESCROW_LOCKED",
        origin: "INTERNAL",
        currency: "NGN",
        baseAmount: 100_000,
        createdAt: new Date(),
        creator: { id: "c1", user: { id: "u1", email: "a@b.com" } },
        client: { id: "cl1", user: { id: "u2", email: "c@d.com" } },
      };

      vi.mocked(adminRoPrisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      vi.mocked(adminRoPrisma.supportTicket.findMany as any).mockResolvedValue([]);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/bookings/book-nodispute",
        headers: { authorization: `Bearer ${token}` },
      });

      const body = res.json();
      expect(body.booking.canReviewConversation).toBe(false);
      expect(body.booking.reviewDisabledReason).toBe("Opens only from an open dispute or ticket");
    });

    it("enables review button when booking state is DISPUTED", async () => {
      const { token } = mockAdminSession("OPS");

      const mockBooking = {
        id: "book-disputed",
        state: "DISPUTED",
        origin: "INTERNAL",
        currency: "NGN",
        baseAmount: 100_000,
        createdAt: new Date(),
        creator: { id: "c1", user: { id: "u1", email: "a@b.com" } },
        client: { id: "cl1", user: { id: "u2", email: "c@d.com" } },
      };

      vi.mocked(adminRoPrisma.booking.findUnique as any).mockResolvedValue(mockBooking);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/bookings/book-disputed",
        headers: { authorization: `Bearer ${token}` },
      });

      const body = res.json();
      expect(body.booking.canReviewConversation).toBe(true);
      expect(body.booking.reviewDisabledReason).toBeNull();
      expect(body.booking.hasDispute).toBe(true);
    });

    it("enables review button when an open SupportTicket is linked to the booking", async () => {
      const { token } = mockAdminSession("OPS");

      const mockBooking = {
        id: "book-with-ticket",
        state: "ESCROW_LOCKED",
        origin: "INTERNAL",
        currency: "NGN",
        baseAmount: 100_000,
        createdAt: new Date(),
        creator: { id: "c1", user: { id: "u1", email: "a@b.com" } },
        client: { id: "cl1", user: { id: "u2", email: "c@d.com" } },
      };

      vi.mocked(adminRoPrisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      vi.mocked(adminRoPrisma.supportTicket.findMany as any).mockResolvedValue([
        {
          id: "tick-99",
          userId: "u2",
          subject: "Issue regarding book-with-ticket deliverables",
          message: "Talent did not show up",
          status: "OPEN",
          createdAt: new Date(),
        },
      ]);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/bookings/book-with-ticket",
        headers: { authorization: `Bearer ${token}` },
      });

      const body = res.json();
      expect(body.booking.canReviewConversation).toBe(true);
      expect(body.booking.reviewDisabledReason).toBeNull();
      expect(body.booking.disputeDetail?.ticketId).toBe("tick-99");
    });
  });

  // ===========================================================================
  // 6. Performance Test on 10,000 Synthetic Bookings
  // ===========================================================================
  describe("Performance Benchmark (10,000 Bookings)", () => {
    it("evaluates stuck rules and fee calculations on 10,000 bookings under 1.5 seconds", () => {
      const syntheticBookings = Array.from({ length: 10_000 }, (_, i) => {
        const state = i % 5 === 0 ? "ESCROW_LOCKED" : i % 3 === 0 ? "PENDING_PAYMENT" : "PAYMENT_RELEASED";
        const daysAgo = (i % 20) + 1;
        return {
          id: `syn-b-${i}`,
          state,
          createdAt: new Date(Date.now() - daysAgo * MS_PER_DAY),
          slotHoldExpiresAt: i % 4 === 0 ? new Date(Date.now() - 5 * MS_PER_MINUTE) : null,
          baseAmount: 100_000,
          clientFeeAmount: 15_000,
          talentFeeAmount: 11_000,
        };
      });

      const startTime = performance.now();
      let stuckCount = 0;

      for (const b of syntheticBookings) {
        const stuck = isBookingStuck(b);
        if (stuck) stuckCount++;
      }

      const elapsedMs = performance.now() - startTime;
      expect(elapsedMs).toBeLessThan(1500); // Target < 1.5s
      expect(stuckCount).toBeGreaterThan(0);
    });
  });
});

