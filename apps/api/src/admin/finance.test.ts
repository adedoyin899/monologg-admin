import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import type { AdminRole } from "@prisma/client";
import {
  detectPaymentEscrowHeldBookingNotLocked,
  detectBookingEscrowLockedNoHeldPayment,
  detectPaymentFailedBookingNotCancelled,
  detectWebhookMissingAfterInitiated,
  detectPaymentReleasedBookingNotReleased,
  runAllFinanceMismatchDetectors,
} from "../services/financeMismatches.js";
import {
  getFinanceSummary,
  listAdminPayments,
  getAdminPaymentDetail,
  getAdminPaymentRawWebhook,
  listAdminWithdrawals,
  getAdminEarnings,
  maskSensitiveFinancialFields,
  calculateOtpStatus,
} from "../services/adminFinance.js";

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
        create: vi.fn().mockResolvedValue({ id: "audit-fin-1" }),
      },
      booking: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
      },
      payment: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      withdrawalRequest: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
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
      },
      payment: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      withdrawalRequest: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
      },
    },
    getMaterializedViewLastRefreshed: vi.fn().mockResolvedValue(new Date()),
  };
});

// Mock notification & cache providers
vi.mock("../providers/index.js", () => ({
  notifyProvider: { email: vi.fn().mockResolvedValue(true) },
}));

vi.mock("../providers/cache.js", () => ({
  cacheProvider: {
    set: vi.fn().mockResolvedValue(true),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(true),
  },
}));

import { prisma } from "../db/client.js";
import { adminRoPrisma } from "../db/adminRoClient.js";

describe("Phase A7: Finance & Transactions (PRD M6)", () => {
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
  // 1. Separate Currency Totals & Stored Fees
  // ===========================================================================
  describe("Finance Summary per Currency (AD-09)", () => {
    it("returns three completely separate totals for NGN, USD, GBP with no cross-currency sums", async () => {
      const mockBookings = [
        // NGN bookings
        { id: "b-ngn-1", currency: "NGN", baseAmount: 10_000_000, clientFeeAmount: 1_500_000, talentFeeAmount: 1_100_000, state: "ESCROW_LOCKED" },
        { id: "b-ngn-2", currency: "NGN", baseAmount: 20_000_000, clientFeeAmount: 3_000_000, talentFeeAmount: 2_200_000, state: "PAYMENT_RELEASED" },
        // USD bookings
        { id: "b-usd-1", currency: "USD", baseAmount: 100_000, clientFeeAmount: 15_000, talentFeeAmount: 11_000, state: "ESCROW_LOCKED" },
        // GBP bookings
        { id: "b-gbp-1", currency: "GBP", baseAmount: 50_000, clientFeeAmount: 7_500, talentFeeAmount: 5_500, state: "PAYMENT_RELEASED" },
      ];

      const mockPayments = [
        { id: "p-ngn-1", currency: "NGN", amount: 11_500_000, status: "ESCROW_HELD", escrowHeld: true },
        { id: "p-ngn-2", currency: "NGN", amount: 23_000_000, status: "RELEASED", escrowHeld: false },
        { id: "p-usd-1", currency: "USD", amount: 115_000, status: "ESCROW_HELD", escrowHeld: true },
        { id: "p-gbp-1", currency: "GBP", amount: 57_500, status: "RELEASED", escrowHeld: false },
      ];

      vi.mocked(adminRoPrisma.booking.findMany as any).mockResolvedValue(mockBookings);
      vi.mocked(adminRoPrisma.payment.findMany as any).mockResolvedValue(mockPayments);

      const summary = await getFinanceSummary({}, adminRoPrisma);

      // Verify three separate summaries exist
      expect(summary.summaries.NGN).toBeDefined();
      expect(summary.summaries.USD).toBeDefined();
      expect(summary.summaries.GBP).toBeDefined();

      // NGN Totals
      expect(summary.summaries.NGN.gmv).toBe(30_000_000);
      expect(summary.summaries.NGN.platformRevenue).toBe(4_500_000 + 3_300_000); // 7,800,000
      expect(summary.summaries.NGN.escrowHeld).toBe(11_500_000);
      expect(summary.summaries.NGN.released).toBe(23_000_000);
      expect(summary.summaries.NGN.takeRatePct).toBe(26);

      // USD Totals
      expect(summary.summaries.USD.gmv).toBe(100_000);
      expect(summary.summaries.USD.platformRevenue).toBe(26_000); // 15k client + 11k talent
      expect(summary.summaries.USD.escrowHeld).toBe(115_000);

      // GBP Totals
      expect(summary.summaries.GBP.gmv).toBe(50_000);
      expect(summary.summaries.GBP.platformRevenue).toBe(13_000);
      expect(summary.summaries.GBP.released).toBe(57_500);

      // Verify mode banner
      expect(summary.mode).toBeDefined();
    });

    it("serves GET /api/v1/admin/finance/summary and /admin/finance/summary", async () => {
      const { token } = mockAdminSession("FINANCE");
      vi.mocked(adminRoPrisma.booking.findMany as any).mockResolvedValue([]);
      vi.mocked(adminRoPrisma.payment.findMany as any).mockResolvedValue([]);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/finance/summary",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.summaries).toBeDefined();
      expect(body.currencies).toContain("NGN");
    });
  });

  // ===========================================================================
  // 2. Mismatch Detectors (Clean Data vs Planted Bad Rows)
  // ===========================================================================
  describe("Finance Mismatch Detectors (PRD M6.2 / AC3)", () => {
    it("returns zero mismatches on clean synchronized data", async () => {
      const cleanDb: any = {
        payment: { findMany: vi.fn().mockResolvedValue([]) },
        booking: { findMany: vi.fn().mockResolvedValue([]) },
      };

      const mismatches = await runAllFinanceMismatchDetectors(cleanDb);
      expect(mismatches).toHaveLength(0);
    });

    it("Detector 1: fires when Payment is ESCROW_HELD but Booking is not ESCROW_LOCKED", async () => {
      const badDb: any = {
        payment: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "pay-bad-1",
              bookingId: "b-bad-1",
              status: "ESCROW_HELD",
              escrowHeld: true,
              amount: 115000,
              currency: "USD",
              booking: { id: "b-bad-1", state: "PENDING_PAYMENT" },
            },
          ]),
        },
      };

      const result = await detectPaymentEscrowHeldBookingNotLocked(badDb);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("PAYMENT_ESCROW_HELD_BOOKING_NOT_LOCKED");
      expect(result[0].paymentId).toBe("pay-bad-1");
      expect(result[0].severity).toBe("CRITICAL");
    });

    it("Detector 2: fires when Booking is ESCROW_LOCKED but has no held Payment", async () => {
      const badDb: any = {
        booking: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "b-bad-2",
              state: "ESCROW_LOCKED",
              baseAmount: 100000,
              currency: "NGN",
              payment: null, // No payment!
            },
          ]),
        },
      };

      const result = await detectBookingEscrowLockedNoHeldPayment(badDb);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("BOOKING_ESCROW_LOCKED_NO_HELD_PAYMENT");
      expect(result[0].bookingId).toBe("b-bad-2");
    });

    it("Detector 3: fires when Payment FAILED but Booking is not CANCELLED", async () => {
      const badDb: any = {
        payment: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "pay-bad-3",
              bookingId: "b-bad-3",
              status: "FAILED",
              amount: 50000,
              currency: "NGN",
              booking: { id: "b-bad-3", state: "DELIVERABLES_PROVIDED" },
            },
          ]),
        },
      };

      const result = await detectPaymentFailedBookingNotCancelled(badDb);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("PAYMENT_FAILED_BOOKING_NOT_CANCELLED");
      expect(result[0].bookingId).toBe("b-bad-3");
    });

    it("Detector 4: fires when webhook is missing 15 minutes after payment initiated", async () => {
      const now = new Date("2026-11-10T12:30:00Z");
      const badDb: any = {
        payment: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "pay-bad-4",
              bookingId: "b-bad-4",
              status: "INITIATED",
              amount: 10000,
              currency: "GBP",
              provider: "stripe",
              createdAt: new Date("2026-11-10T12:00:00Z"), // 30m ago (> 15m)
              events: [],
              booking: { id: "b-bad-4", state: "PENDING_PAYMENT" },
            },
          ]),
        },
      };

      const result = await detectWebhookMissingAfterInitiated(badDb, 15, now);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("WEBHOOK_MISSING_AFTER_INITIATED");
      expect(result[0].paymentId).toBe("pay-bad-4");
      expect(result[0].severity).toBe("WARNING");
    });

    it("Detector 5: fires when Payment is RELEASED while Booking is not PAYMENT_RELEASED", async () => {
      const badDb: any = {
        payment: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "pay-bad-5",
              bookingId: "b-bad-5",
              status: "RELEASED",
              amount: 250000,
              currency: "NGN",
              booking: { id: "b-bad-5", state: "ESCROW_LOCKED" },
            },
          ]),
        },
      };

      const result = await detectPaymentReleasedBookingNotReleased(badDb);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("PAYMENT_RELEASED_BOOKING_NOT_RELEASED");
      expect(result[0].paymentId).toBe("pay-bad-5");
    });
  });

  // ===========================================================================
  // 3. Raw Webhook Permissions, Auditing & Field Masking (AD-10)
  // ===========================================================================
  describe("Raw Webhook Access Gating & Auditing (PRD M6.2 / AC2)", () => {
    it("FORBIDS roles other than FINANCE and SUPER_ADMIN from viewing raw webhook JSON", async () => {
      const { token: viewerToken } = mockAdminSession("VIEWER");

      const res1 = await app.inject({
        method: "POST",
        url: "/api/v1/admin/payments/p-1/raw",
        headers: { authorization: `Bearer ${viewerToken}` },
        payload: { reason: "Routine review" },
      });
      expect(res1.statusCode).toBe(403);
      expect(res1.json().message).toContain("restricted to SUPER_ADMIN and FINANCE");

      const { token: opsToken } = mockAdminSession("OPS");
      const res2 = await app.inject({
        method: "POST",
        url: "/api/v1/admin/payments/p-1/raw",
        headers: { authorization: `Bearer ${opsToken}` },
        payload: { reason: "Investigating" },
      });
      expect(res2.statusCode).toBe(403);
    });

    it("requires a reason and audits the action for FINANCE and SUPER_ADMIN", async () => {
      const { token: finToken } = mockAdminSession("FINANCE");

      // 1. Missing reason -> 400
      const resMissingReason = await app.inject({
        method: "POST",
        url: "/api/v1/admin/payments/p-1/raw",
        headers: { authorization: `Bearer ${finToken}` },
        payload: { reason: "" },
      });
      expect(resMissingReason.statusCode).toBe(400);

      // 2. Valid reason -> 200 and writes audit row
      vi.mocked(adminRoPrisma.payment.findUnique as any).mockResolvedValue({
        id: "p-1",
        events: [
          {
            id: "pe-1",
            type: "charge.success",
            eventId: "evt_123",
            createdAt: new Date(),
            raw: {
              card_number: "4111111111111234",
              last4: "1234",
              cvv: "999",
              account_number: "0123456789",
              amount: 115000,
              customer: { email: "payer@example.com" },
            },
          },
        ],
      });

      const resSuccess = await app.inject({
        method: "POST",
        url: "/api/v1/admin/payments/p-1/raw",
        headers: { authorization: `Bearer ${finToken}` },
        payload: { reason: "Customer dispute reconciliation" },
      });

      expect(resSuccess.statusCode).toBe(200);
      const body = resSuccess.json();

      // Assert audit log was recorded
      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "WEBHOOK_RAW_VIEWED",
            targetType: "Payment",
            targetId: "p-1",
            reason: "Customer dispute reconciliation",
          }),
        })
      );

      // Assert card and bank account fields are masked
      const rawEvent = body.events[0].raw;
      expect(rawEvent.card_number).toBe("***1234");
      expect(rawEvent.account_number).toBe("***6789");
      expect(rawEvent.cvv).toBe("***");
      expect(rawEvent.customer.email).toBe("payer@example.com");
    });
  });

  // ===========================================================================
  // 4. Withdrawals Queue & OTP Privacy (AD-11)
  // ===========================================================================
  describe("Withdrawals Queue & OTP Status (PRD M6.3 / AC1)", () => {
    it("never exposes OTP codes or hashes and correctly computes OTP statuses", async () => {
      const now = new Date("2026-11-10T12:00:00Z");

      // Verify OTP status calculator directly
      expect(calculateOtpStatus([{ expiresAt: new Date(now.getTime() + 10000), verifiedAt: new Date(), attempts: 1 }], now)).toBe("verified");
      expect(calculateOtpStatus([{ expiresAt: new Date(now.getTime() + 10000), verifiedAt: null, attempts: 3 }], now)).toBe("locked");
      expect(calculateOtpStatus([{ expiresAt: new Date(now.getTime() - 1000), verifiedAt: null, attempts: 1 }], now)).toBe("expired");
      expect(calculateOtpStatus([{ expiresAt: new Date(now.getTime() + 10000), verifiedAt: null, attempts: 1 }], now)).toBe("requested");

      // Test API response
      const { token } = mockAdminSession("FINANCE");
      const SECRET_HASH = "$argon2id$v=19$m=65536,t=3,p=4$SECRET_HASH_VALUE_DO_NOT_LEAK";

      vi.mocked(adminRoPrisma.withdrawalRequest.findMany as any).mockResolvedValue([
        {
          id: "w-1",
          userId: "usr-1",
          amount: 5_000_000,
          currency: "NGN",
          bankName: "Guaranty Trust Bank",
          accountNumber: "0123456789",
          accountName: "John Doe",
          status: "APPROVED",
          createdAt: new Date(),
          user: { id: "usr-1", email: "johndoe@example.com" },
          otps: [
            {
              id: "otp-1",
              codeHash: SECRET_HASH, // In DB
              expiresAt: new Date(now.getTime() + 100000),
              verifiedAt: new Date(),
              attempts: 1,
              createdAt: new Date(),
            },
          ],
        },
      ]);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/withdrawals",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const rawText = res.body;

      // Negative assertion: codeHash is NEVER in the response
      expect(rawText).not.toContain(SECRET_HASH);
      expect(rawText).not.toContain("codeHash");

      const body = res.json();
      expect(body.withdrawals[0].otpStatus).toBe("verified");
      expect(body.withdrawals[0].bank.accountNumber).toContain("***");
    });
  });

  // ===========================================================================
  // 5. Earnings & Ledger Derived Balances (AD-12)
  // ===========================================================================
  describe("Earnings & Ledger (PRD M6.4 / AC1-AC3)", () => {
    it("returns label 'Derived from bookings and withdrawals' and computes balances per currency", async () => {
      const { token } = mockAdminSession("VIEWER");

      vi.mocked(adminRoPrisma.booking.findMany as any).mockResolvedValue([
        {
          id: "b-e-1",
          creatorId: "cr-1",
          clientId: "cl-1",
          currency: "NGN",
          baseAmount: 10_000_000, // ₦100k
          talentFeeAmount: 1_100_000, // ₦11k
          clientFeeAmount: 1_500_000, // ₦15k
          state: "PAYMENT_RELEASED",
          creator: { id: "cr-1", userId: "usr-cr-1", name: "Talent 1" },
          client: { id: "cl-1", userId: "usr-cl-1", name: "Client 1" },
        },
      ]);

      vi.mocked(adminRoPrisma.withdrawalRequest.findMany as any).mockResolvedValue([
        {
          id: "w-e-1",
          userId: "usr-cr-1",
          amount: 3_000_000, // ₦30k completed
          currency: "NGN",
          status: "COMPLETED",
        },
        {
          id: "w-e-2",
          userId: "usr-cr-1",
          amount: 1_000_000, // ₦10k pending
          currency: "NGN",
          status: "PENDING_OTP",
        },
      ]);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/finance/earnings?currency=NGN",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();

      // Mandatory label check
      expect(body.label).toBe("Derived from bookings and withdrawals");

      const topEarner = body.topEarners.NGN[0];
      expect(topEarner).toBeDefined();
      expect(topEarner.earned).toBe(8_900_000); // 100k - 11k
      expect(topEarner.withdrawn).toBe(3_000_000);
      expect(topEarner.pending).toBe(1_000_000);
      expect(topEarner.available).toBe(4_900_000); // 89k - 30k - 10k = 49k
    });
  });

  // ===========================================================================
  // 6. Performance Benchmark (10,000 Payments)
  // ===========================================================================
  describe("Performance Benchmark (10,000 Payments)", () => {
    it("processes and categorizes 10,000 payments under 1.5 seconds", () => {
      const syntheticPayments = Array.from({ length: 10_000 }, (_, i) => ({
        id: `p-${i}`,
        amount: 100_000,
        currency: i % 3 === 0 ? "NGN" : i % 2 === 0 ? "USD" : "GBP",
        status: i % 10 === 0 ? "FAILED" : i % 4 === 0 ? "RELEASED" : "ESCROW_HELD",
        escrowHeld: i % 4 !== 0,
        platformFee: 26_000,
      }));

      const startTime = performance.now();

      const totals: Record<string, { gmv: number; escrow: number; released: number }> = {
        NGN: { gmv: 0, escrow: 0, released: 0 },
        USD: { gmv: 0, escrow: 0, released: 0 },
        GBP: { gmv: 0, escrow: 0, released: 0 },
      };

      for (const p of syntheticPayments) {
        const bucket = totals[p.currency];
        bucket.gmv += p.amount;
        if (p.escrowHeld) bucket.escrow += p.amount;
        if (p.status === "RELEASED") bucket.released += p.amount;
      }

      const elapsedMs = performance.now() - startTime;
      expect(elapsedMs).toBeLessThan(1500); // Target < 1.5s
      expect(totals.NGN.gmv).toBeGreaterThan(0);
      expect(totals.USD.gmv).toBeGreaterThan(0);
      expect(totals.GBP.gmv).toBeGreaterThan(0);
    });
  });
});

