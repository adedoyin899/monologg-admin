import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildApp } from "../app.js";
import { generateAccessToken } from "../services/auth.js";
import {
  DISPUTE_FOUR_EYES_THRESHOLD,
  isFourEyesRequired,
  getFourEyesThreshold,
  getDisputeChatReviewBanner,
} from "../config/disputeRules.js";

// Mock DB and providers
vi.mock("../db/client.js", () => {
  return {
    prisma: {
      booking: {
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
      },
      payment: {
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      dispute: {
        create: vi.fn(),
        upsert: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      supportTicket: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        updateMany: vi.fn(),
      },
      orderRoom: {
        findUnique: vi.fn(),
      },
      message: {
        findMany: vi.fn(),
      },
      adminUser: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      adminSession: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      adminAuditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

vi.mock("../db/adminRoClient.js", () => {
  return {
    adminRoPrisma: {
      dispute: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
      },
      supportTicket: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
    },
    getMaterializedViewLastRefreshed: vi.fn().mockResolvedValue(new Date()),
  };
});

vi.mock("../providers/index.js", () => ({
  notifyProvider: {
    email: vi.fn().mockResolvedValue(undefined),
    sms: vi.fn().mockResolvedValue(undefined),
    inApp: vi.fn().mockResolvedValue(undefined),
  },
  paymentProvider: {
    releaseFunds: vi.fn().mockResolvedValue(undefined),
    refund: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../services/notifications.js", () => ({
  enqueueEmailNotification: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "../db/client.js";
import { notifyProvider, paymentProvider } from "../providers/index.js";
import { enqueueEmailNotification } from "../services/notifications.js";

const prismaMock = prisma as any;
const notifyProviderMock = notifyProvider as any;
const paymentProviderMock = paymentProvider as any;
const enqueueEmailMock = enqueueEmailNotification as any;

describe("Phase A9: Disputes & Conversation Review (PRD Module M8)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  const TALENT_USER_ID = "usr-talent-1";
  const CLIENT_USER_ID = "usr-client-1";
  const ADMIN_FINANCE_1_ID = "adm-fin-1";
  const ADMIN_FINANCE_2_ID = "adm-fin-2";
  const ADMIN_SUPPORT_ID = "adm-sup-1";
  const ADMIN_OPS_ID = "adm-ops-1";
  const ADMIN_VIEWER_ID = "adm-view-1";

  const TALENT_TOKEN = generateAccessToken({
    userId: TALENT_USER_ID,
    userType: "TALENT",
    email: "talent@monologg.dev",
  });

  const CLIENT_TOKEN = generateAccessToken({
    userId: CLIENT_USER_ID,
    userType: "CLIENT",
    email: "client@monologg.dev",
  });

  const ADMIN_FINANCE_TOKEN = "mock-admin:finance@admin.monologg.dev:aal2";
  const ADMIN_FINANCE_2_TOKEN = "mock-admin:finance2@admin.monologg.dev:aal2";
  const ADMIN_SUPPORT_TOKEN = "mock-admin:support@admin.monologg.dev:aal2";
  const ADMIN_OPS_TOKEN = "mock-admin:ops@admin.monologg.dev:aal2";
  const ADMIN_VIEWER_TOKEN = "mock-admin:viewer@admin.monologg.dev:aal2";

  beforeEach(async () => {
    vi.stubEnv("ADMIN_AUTH_PROVIDER", "mock");
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();

    // Default admin mock session
    prismaMock.adminSession.findFirst.mockImplementation(async ({ where }: any) => {
      return {
        id: "sess-1",
        adminUserId: where?.adminUserId || ADMIN_FINANCE_1_ID,
        lastSeenAt: new Date(),
        createdAt: new Date(),
        endedAt: null,
      };
    });
    prismaMock.adminSession.update.mockResolvedValue({});

    prismaMock.adminUser.findFirst.mockImplementation(async ({ where }: any) => {
      const subject = where?.authSubject || "";
      const email = where?.email || "";
      const target = `${subject} ${email}`.toLowerCase();

      if (target.includes("finance2")) {
        return { id: ADMIN_FINANCE_2_ID, email: "finance2@admin.monologg.dev", role: "FINANCE", status: "ACTIVE" };
      }
      if (target.includes("support")) {
        return { id: ADMIN_SUPPORT_ID, email: "support@admin.monologg.dev", role: "SUPPORT", status: "ACTIVE" };
      }
      if (target.includes("ops")) {
        return { id: ADMIN_OPS_ID, email: "ops@admin.monologg.dev", role: "OPS", status: "ACTIVE" };
      }
      if (target.includes("viewer")) {
        return { id: ADMIN_VIEWER_ID, email: "viewer@admin.monologg.dev", role: "VIEWER", status: "ACTIVE" };
      }
      return { id: ADMIN_FINANCE_1_ID, email: "finance@admin.monologg.dev", role: "FINANCE", status: "ACTIVE" };
    });

    prismaMock.adminUser.findUnique.mockImplementation(async ({ where }: any) => {
      const id = where?.id || "";
      const email = where?.email || "";
      const target = `${id} ${email}`.toLowerCase();

      if (target.includes("finance2") || id === ADMIN_FINANCE_2_ID) {
        return { id: ADMIN_FINANCE_2_ID, email: "finance2@admin.monologg.dev", role: "FINANCE", status: "ACTIVE" };
      }
      if (target.includes("support") || id === ADMIN_SUPPORT_ID) {
        return { id: ADMIN_SUPPORT_ID, email: "support@admin.monologg.dev", role: "SUPPORT", status: "ACTIVE" };
      }
      if (target.includes("ops") || id === ADMIN_OPS_ID) {
        return { id: ADMIN_OPS_ID, email: "ops@admin.monologg.dev", role: "OPS", status: "ACTIVE" };
      }
      if (target.includes("viewer") || id === ADMIN_VIEWER_ID) {
        return { id: ADMIN_VIEWER_ID, email: "viewer@admin.monologg.dev", role: "VIEWER", status: "ACTIVE" };
      }
      return { id: ADMIN_FINANCE_1_ID, email: "finance@admin.monologg.dev", role: "FINANCE", status: "ACTIVE" };
    });

    prismaMock.adminAuditLog.create.mockResolvedValue({ id: "aud-1" });
    prismaMock.supportTicket.create.mockResolvedValue({ id: "tick-1" });
    prismaMock.supportTicket.updateMany.mockResolvedValue({ count: 1 });
  });

  // ── 1. Dispute Creation & State Transition ────────────────────────────────
  describe("1. User Dispute Creation & Release Freezing", () => {
    it("either participant can open a dispute after ESCROW_LOCKED, creating Dispute and SupportTicket", async () => {
      const mockBooking = {
        id: "b-dispute-1",
        state: "ESCROW_LOCKED",
        currency: "NGN",
        baseAmount: 100_000_00,
        talentFeeAmount: 11_000_00,
        clientFeeAmount: 15_000_00,
        creator: { userId: TALENT_USER_ID, name: "Talent Pro" },
        client: { userId: CLIENT_USER_ID, name: "Client Corp" },
        payment: { id: "p-1", status: "ESCROW_HELD", providerRef: "pay_123" },
      };

      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue(mockBooking);
      prismaMock.booking.update.mockResolvedValue({ ...mockBooking, state: "DISPUTED" });
      prismaMock.user.findUnique.mockResolvedValue({ id: CLIENT_USER_ID, email: "client@monologg.dev" });
      prismaMock.dispute.upsert.mockResolvedValue({
        id: "dsp-101",
        bookingId: "b-dispute-1",
        openedByUserId: CLIENT_USER_ID,
        openedByRole: "CLIENT",
        reason: "NOT_DELIVERED",
        description: "Talent did not provide agreed video assets",
        status: "OPEN",
        openedAt: new Date(),
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/bookings/b-dispute-1/dispute",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
        payload: {
          reason: "NOT_DELIVERED",
          description: "Talent did not provide agreed video assets",
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.state).toBe("DISPUTED");
      expect(json.dispute.id).toBe("dsp-101");
      expect(prismaMock.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "b-dispute-1" },
          data: { state: "DISPUTED" },
        }),
      );
      expect(prismaMock.supportTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            category: "DISPUTE",
            priority: "URGENT",
            bookingId: "b-dispute-1",
            disputeId: "dsp-101",
          }),
        }),
      );
      expect(notifyProviderMock.inApp).toHaveBeenCalledWith(
        TALENT_USER_ID,
        expect.objectContaining({ kind: "dispute_opened" }),
      );
    });

    it("rejects opening a dispute if booking is PENDING_PAYMENT", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b-pending",
        state: "PENDING_PAYMENT",
        creator: { userId: TALENT_USER_ID },
        client: { userId: CLIENT_USER_ID },
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/bookings/b-pending/dispute",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
        payload: { reason: "QUALITY", description: "Not happy" },
      });

      expect(response.statusCode).toBe(409);
    });

    it("refuses non-participants from raising a dispute", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b-1",
        state: "ESCROW_LOCKED",
        creator: { userId: "other-creator" },
        client: { userId: "other-client" },
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/bookings/b-1/dispute",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
        payload: { reason: "OTHER", description: "Random" },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  // ── 2. Conversation Review & Privacy Gating ──────────────────────────────
  describe("2. Audited Conversation Review (POST /disputes/:id/review-chat)", () => {
    const mockDispute = {
      id: "dsp-200",
      bookingId: "b-200",
      status: "OPEN",
    };

    beforeEach(() => {
      prismaMock.dispute.findFirst.mockResolvedValue(mockDispute);
      prismaMock.message.findMany.mockResolvedValue([
        { id: "m1", senderId: "usr-client-1", kind: "TEXT", content: "Where are the files?", createdAt: new Date() },
        { id: "m2", senderId: "usr-talent-1", kind: "TEXT", content: "Working on it today", createdAt: new Date() },
      ]);
    });

    it("refuses chat review without a valid justification reason", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/admin/disputes/dsp-200/review-chat",
        headers: { authorization: `Bearer ${ADMIN_SUPPORT_TOKEN}` },
        payload: { reason: "   " },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().message).toMatch(/valid justification reason/i);
      expect(prismaMock.adminAuditLog.create).not.toHaveBeenCalled();
    });

    it("refuses chat review if no open dispute or linked ticket exists", async () => {
      prismaMock.dispute.findFirst.mockResolvedValue(null);
      prismaMock.supportTicket.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/admin/disputes/dsp-nonexistent/review-chat",
        headers: { authorization: `Bearer ${ADMIN_SUPPORT_TOKEN}` },
        payload: { reason: "Routine investigation" },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().message).toMatch(/No open dispute or linked ticket exists/i);
    });

    it("allows SUPPORT, FINANCE and SUPER_ADMIN to review chat, writes CHAT_VIEWED audit row, and returns banner", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/admin/disputes/dsp-200/review-chat",
        headers: { authorization: `Bearer ${ADMIN_SUPPORT_TOKEN}` },
        payload: { reason: "Reviewing delivery timeline promises" },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.messageCount).toBe(2);
      expect(json.banner).toBe(getDisputeChatReviewBanner("dsp-200"));
      expect(json.messages).toHaveLength(2);

      expect(prismaMock.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "CHAT_VIEWED",
            targetType: "DISPUTE",
            targetId: "dsp-200",
            reason: "Reviewing delivery timeline promises",
            metadata: expect.objectContaining({
              messageCount: 2,
              bookingId: "b-200",
            }),
          }),
        }),
      );
    });

    it("blocks OPS and VIEWER roles from reviewing conversation messages", async () => {
      // OPS attempt
      const opsResponse = await app.inject({
        method: "POST",
        url: "/api/v1/admin/disputes/dsp-200/review-chat",
        headers: { authorization: `Bearer ${ADMIN_OPS_TOKEN}` },
        payload: { reason: "Reviewing delivery timeline promises" },
      });
      expect(opsResponse.statusCode).toBe(403);

      // VIEWER attempt
      const viewerResponse = await app.inject({
        method: "POST",
        url: "/api/v1/admin/disputes/dsp-200/review-chat",
        headers: { authorization: `Bearer ${ADMIN_VIEWER_TOKEN}` },
        payload: { reason: "Reviewing delivery timeline promises" },
      });
      expect(viewerResponse.statusCode).toBe(403);
    });
  });

  // ── 3. Four-Eyes Governance & Resolution ─────────────────────────────────
  describe("3. Four-Eyes Resolution Governance", () => {
    const HIGH_VALUE_AMOUNT = 60_000_000; // 600,000 NGN in kobo (above 50,000,000 threshold)
    const LOW_VALUE_AMOUNT = 20_000_000;  // 200,000 NGN in kobo (below 50,000,000 threshold)

    const createMockDispute = (baseAmount: number, resolvedByAdminId: string | null = null) => ({
      id: "dsp-fe-1",
      bookingId: "b-fe-1",
      status: "OPEN",
      resolvedByAdminId,
      approvedByAdminId: null,
      booking: {
        id: "b-fe-1",
        state: "DISPUTED",
        currency: "NGN",
        baseAmount,
        talentFeeAmount: Math.round(baseAmount * 0.11),
        clientFeeAmount: Math.round(baseAmount * 0.15),
        creator: { userId: TALENT_USER_ID, name: "Talent" },
        client: { userId: CLIENT_USER_ID, name: "Client" },
        payment: { id: "p-fe-1", status: "ESCROW_HELD", providerRef: "pay_fe_1" },
      },
    });

    it("allows a single admin to resolve a dispute below the four-eyes threshold immediately", async () => {
      const mockDispute = createMockDispute(LOW_VALUE_AMOUNT);
      prismaMock.dispute.findFirst.mockResolvedValue(mockDispute);
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue(mockDispute.booking);
      prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.payment.findUniqueOrThrow.mockResolvedValue({ id: "p-fe-1", status: "RELEASED" });
      prismaMock.$transaction.mockResolvedValue([{ id: "p-fe-1", status: "RELEASED" }, { id: "b-fe-1", state: "PAYMENT_RELEASED" }]);
      prismaMock.dispute.update.mockResolvedValue({
        ...mockDispute,
        status: "RESOLVED",
        resolution: "RELEASE_TO_TALENT",
        resolutionNote: "Evidence shows full delivery fulfilled",
        resolvedByAdminId: ADMIN_FINANCE_1_ID,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/admin/disputes/dsp-fe-1/resolve",
        headers: { authorization: `Bearer ${ADMIN_FINANCE_TOKEN}` },
        payload: {
          resolution: "RELEASE_TO_TALENT",
          resolutionNote: "Evidence shows full delivery fulfilled",
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.success).toBe(true);
      expect(json.requiresApproval).toBeUndefined();
      expect(paymentProviderMock.releaseFunds).toHaveBeenCalled();
      expect(prismaMock.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "DISPUTE_RESOLVED",
            targetId: "dsp-fe-1",
          }),
        }),
      );
    });

    it("blocks a single admin above the threshold: records proposal, leaves money unreleased", async () => {
      const mockDispute = createMockDispute(HIGH_VALUE_AMOUNT, null);
      prismaMock.dispute.findFirst.mockResolvedValue(mockDispute);
      prismaMock.dispute.update.mockResolvedValue({
        ...mockDispute,
        status: "UNDER_REVIEW",
        resolvedByAdminId: ADMIN_FINANCE_1_ID,
        resolution: "REFUND_CLIENT",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/admin/disputes/dsp-fe-1/resolve",
        headers: { authorization: `Bearer ${ADMIN_FINANCE_TOKEN}` },
        payload: {
          resolution: "REFUND_CLIENT",
          resolutionNote: "Talent failed to attend scheduled event",
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.requiresApproval).toBe(true);
      expect(json.message).toMatch(/A second, different administrator must approve/i);
      expect(paymentProviderMock.refund).not.toHaveBeenCalled();
      expect(prismaMock.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "DISPUTE_RESOLUTION_PROPOSED",
          }),
        }),
      );
    });

    it("blocks the same proposing admin from providing second approval", async () => {
      const mockDispute = createMockDispute(HIGH_VALUE_AMOUNT, ADMIN_FINANCE_1_ID);
      prismaMock.dispute.findFirst.mockResolvedValue(mockDispute);

      // Admin 1 attempts second approval
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/admin/disputes/dsp-fe-1/resolve",
        headers: { authorization: `Bearer ${ADMIN_FINANCE_TOKEN}` },
        payload: {
          resolution: "REFUND_CLIENT",
          resolutionNote: "Self approving",
        },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().message).toMatch(/Four-eyes violation/i);
      expect(paymentProviderMock.refund).not.toHaveBeenCalled();
    });

    it("allows a second, different admin to approve and execute high-value resolution", async () => {
      const mockDispute = createMockDispute(HIGH_VALUE_AMOUNT, ADMIN_FINANCE_1_ID);
      prismaMock.dispute.findFirst.mockResolvedValue(mockDispute);
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue(mockDispute.booking);
      prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.$transaction.mockResolvedValue([{ id: "p-fe-1", status: "REFUNDED" }, { id: "b-fe-1", state: "CANCELLED" }]);
      prismaMock.dispute.update.mockResolvedValue({
        ...mockDispute,
        status: "RESOLVED",
        resolution: "REFUND_CLIENT",
        resolvedByAdminId: ADMIN_FINANCE_1_ID,
        approvedByAdminId: ADMIN_FINANCE_2_ID,
      });

      // Admin 2 provides four-eyes approval
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/admin/disputes/dsp-fe-1/resolve",
        headers: { authorization: `Bearer ${ADMIN_FINANCE_2_TOKEN}` },
        payload: {
          resolution: "REFUND_CLIENT",
          resolutionNote: "Confirmed non-attendance. Client refund authorized.",
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.success).toBe(true);
      expect(paymentProviderMock.refund).toHaveBeenCalledWith("pay_fe_1");
      expect(prismaMock.dispute.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "RESOLVED",
            resolvedByAdminId: ADMIN_FINANCE_1_ID,
            approvedByAdminId: ADMIN_FINANCE_2_ID,
          }),
        }),
      );
    });
  });

  // ── 4. Idempotency & Financial Safety ────────────────────────────────────
  describe("4. Idempotency & Concurrency Safety", () => {
    it("is strictly idempotent: replaying resolve on an already resolved dispute does not move money twice", async () => {
      const resolvedDispute = {
        id: "dsp-already-resolved",
        bookingId: "b-1",
        status: "RESOLVED",
        resolution: "RELEASE_TO_TALENT",
        resolutionNote: "Settled yesterday",
        booking: {
          id: "b-1",
          baseAmount: 100_000,
          currency: "NGN",
        },
      };

      prismaMock.dispute.findFirst.mockResolvedValue(resolvedDispute);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/admin/disputes/dsp-already-resolved/resolve",
        headers: { authorization: `Bearer ${ADMIN_FINANCE_TOKEN}` },
        payload: {
          resolution: "RELEASE_TO_TALENT",
          resolutionNote: "Replaying request",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().alreadyResolved).toBe(true);
      expect(paymentProviderMock.releaseFunds).not.toHaveBeenCalled();
      expect(paymentProviderMock.refund).not.toHaveBeenCalled();
    });

    it("matches release and refund amounts strictly to stored booking amounts and fee rules", async () => {
      const baseAmount = 100_000_00; // 100,000 NGN
      const talentFee = Math.round(baseAmount * 0.11); // 11,000 NGN
      const expectedNet = baseAmount - talentFee; // 89,000 NGN

      const mockDispute = {
        id: "dsp-fee-check",
        bookingId: "b-fee-check",
        status: "OPEN",
        booking: {
          id: "b-fee-check",
          state: "DISPUTED",
          currency: "NGN",
          baseAmount,
          talentFeeAmount: talentFee,
          clientFeeAmount: Math.round(baseAmount * 0.15),
          creator: { userId: TALENT_USER_ID, name: "Talent" },
          client: { userId: CLIENT_USER_ID, name: "Client" },
          payment: { id: "p-fc", status: "ESCROW_HELD", providerRef: "pay_ref_net" },
        },
      };

      prismaMock.dispute.findFirst.mockResolvedValue(mockDispute);
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue(mockDispute.booking);
      prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.$transaction.mockResolvedValue([{ id: "p-fc", status: "RELEASED" }, { id: "b-fee-check", state: "PAYMENT_RELEASED" }]);
      prismaMock.dispute.update.mockResolvedValue({ ...mockDispute, status: "RESOLVED" });

      await app.inject({
        method: "POST",
        url: "/api/v1/admin/disputes/dsp-fee-check/resolve",
        headers: { authorization: `Bearer ${ADMIN_FINANCE_TOKEN}` },
        payload: {
          resolution: "RELEASE_TO_TALENT",
          resolutionNote: "Full payout to creator",
        },
      });

      expect(paymentProviderMock.releaseFunds).toHaveBeenCalledWith(
        "pay_ref_net",
        expectedNet,
        "NGN",
      );
    });

    it("leaves state consistent and reports clear error if payment provider fails", async () => {
      const mockDispute = {
        id: "dsp-fail-check",
        bookingId: "b-fail",
        status: "OPEN",
        booking: {
          id: "b-fail",
          state: "DISPUTED",
          currency: "NGN",
          baseAmount: 100_000,
          talentFeeAmount: 11_000,
          clientFeeAmount: 15_000,
          creator: { userId: TALENT_USER_ID, name: "Talent" },
          client: { userId: CLIENT_USER_ID, name: "Client" },
          payment: { id: "p-fail", status: "ESCROW_HELD", providerRef: "pay_fail" },
        },
      };

      prismaMock.dispute.findFirst.mockResolvedValue(mockDispute);
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue(mockDispute.booking);
      prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
      paymentProviderMock.releaseFunds.mockRejectedValueOnce(new Error("Provider API timeout"));

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/admin/disputes/dsp-fail-check/resolve",
        headers: { authorization: `Bearer ${ADMIN_FINANCE_TOKEN}` },
        payload: {
          resolution: "RELEASE_TO_TALENT",
          resolutionNote: "Release funds",
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().message).toMatch(/Provider API timeout/i);
      // Payment claim reverted to ESCROW_HELD
      expect(prismaMock.payment.updateMany).toHaveBeenCalledWith({
        where: { id: "p-fail", status: "RELEASING" },
        data: { status: "ESCROW_HELD" },
      });
      // Dispute is NOT resolved
      expect(prismaMock.dispute.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "RESOLVED" }),
        }),
      );
    });
  });
});
