import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import { mockCacheProvider } from "../providers/cache.mock.js";
import { generateAccessToken, hashPassword } from "../services/auth.js";
import argon2 from "argon2";

// ── Prisma mock ──────────────────────────────────────────────────────────────
vi.mock("../db/client.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    withdrawalRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    withdrawalOtp: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "../db/client.js";
const prismaMock = prisma as any;

describe("Withdrawal OTP Gate Integration & Security Suite (Phase 12C)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let userToken: string;

  const testUser = {
    id: "usr-talent-001",
    email: "talent@monologg.test",
    userType: "TALENT",
  };

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    mockCacheProvider.clear();
    vi.clearAllMocks();

    userToken = generateAccessToken({
      userId: testUser.id,
      userType: testUser.userType,
      email: testUser.email,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /api/v1/withdrawals (Initiate)", () => {
    it("creates a WithdrawalRequest in PENDING_OTP status and generates an Argon2id-hashed OTP", async () => {
      const mockRequest = {
        id: "wdr-001",
        userId: testUser.id,
        amount: 50000,
        currency: "NGN",
        bankName: "First Bank",
        accountNumber: "0123456789",
        accountName: "Emeka Johnson",
        status: "PENDING_OTP",
        user: testUser,
      };

      prismaMock.withdrawalRequest.findUnique.mockResolvedValue(null);
      prismaMock.withdrawalRequest.create.mockResolvedValue(mockRequest);
      prismaMock.withdrawalRequest.findUnique.mockResolvedValue(mockRequest);
      prismaMock.withdrawalOtp.count.mockResolvedValue(0);
      prismaMock.withdrawalOtp.findFirst.mockResolvedValue(null);
      prismaMock.withdrawalOtp.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.withdrawalOtp.create.mockResolvedValue({
        id: "otp-001",
        withdrawalRequestId: "wdr-001",
        codeHash: "$argon2id$v=19$m=65536...",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/withdrawals",
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          amount: 50000,
          currency: "NGN",
          bankName: "First Bank",
          accountNumber: "0123456789",
          accountName: "Emeka Johnson",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.withdrawalRequest.status).toBe("PENDING_OTP");
      expect(body.otpSent).toBe(true);

      // Verify stored OTP is Argon2id hashed, NOT raw code
      const createOtpCall = prismaMock.withdrawalOtp.create.mock.calls[0][0];
      expect(createOtpCall.data.codeHash).toMatch(/^\$argon2/);
      expect(createOtpCall.data.codeHash).not.toMatch(/^\d{6}$/);

      // Verify Notification of kind WITHDRAWAL_OTP was created
      expect(prismaMock.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ kind: "WITHDRAWAL_OTP" }),
        }),
      );
    });

    it("rejects non-positive withdrawal amounts", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/withdrawals",
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          amount: -100,
          bankName: "First Bank",
          accountNumber: "0123456789",
          accountName: "Emeka Johnson",
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /api/v1/withdrawals/:id/otp/verify (Verify & Payout)", () => {
    it("successfully verifies correct code, marks verifiedAt, and transitions status to APPROVED", async () => {
      const rawCode = "123456";
      const codeHash = await hashPassword(rawCode);

      const mockRequest = {
        id: "wdr-002",
        userId: testUser.id,
        status: "PENDING_OTP",
      };

      const mockOtp = {
        id: "otp-002",
        userId: testUser.id,
        withdrawalRequestId: "wdr-002",
        codeHash,
        attempts: 0,
        verifiedAt: null,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // active
      };

      prismaMock.withdrawalRequest.findUnique.mockResolvedValue(mockRequest);
      prismaMock.withdrawalOtp.findFirst.mockResolvedValue(mockOtp);
      prismaMock.withdrawalOtp.update.mockResolvedValue({ ...mockOtp, verifiedAt: new Date() });
      prismaMock.withdrawalRequest.update.mockResolvedValue({ ...mockRequest, status: "APPROVED" });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/withdrawals/wdr-002/otp/verify",
        headers: { authorization: `Bearer ${userToken}` },
        payload: { code: rawCode },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.withdrawalRequest.status).toBe("APPROVED");

      // Verify OTP verifiedAt was set
      expect(prismaMock.withdrawalOtp.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "otp-002" },
          data: expect.objectContaining({ verifiedAt: expect.any(Date) }),
        }),
      );
    });

    it("returns generic error message on incorrect code and increments attempts", async () => {
      const realCode = "654321";
      const wrongCode = "111111";
      const codeHash = await hashPassword(realCode);

      const mockRequest = { id: "wdr-003", userId: testUser.id, status: "PENDING_OTP" };
      const mockOtp = {
        id: "otp-003",
        userId: testUser.id,
        withdrawalRequestId: "wdr-003",
        codeHash,
        attempts: 0,
        verifiedAt: null,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      prismaMock.withdrawalRequest.findUnique.mockResolvedValue(mockRequest);
      prismaMock.withdrawalOtp.findFirst.mockResolvedValue(mockOtp);
      prismaMock.withdrawalOtp.update.mockResolvedValue({ ...mockOtp, attempts: 1 });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/withdrawals/wdr-003/otp/verify",
        headers: { authorization: `Bearer ${userToken}` },
        payload: { code: wrongCode },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      // Generic message requirement: never leak "wrong code" vs "expired"
      expect(body.message).toBe("Invalid or expired code");

      expect(prismaMock.withdrawalOtp.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "otp-003" },
          data: expect.objectContaining({ attempts: 1 }),
        }),
      );
    });

    it("invalidates OTP after 5 failed attempts", async () => {
      const codeHash = await hashPassword("654321");
      const mockRequest = { id: "wdr-004", userId: testUser.id, status: "PENDING_OTP" };
      const mockOtp = {
        id: "otp-004",
        userId: testUser.id,
        withdrawalRequestId: "wdr-004",
        codeHash,
        attempts: 4, // 4 prior attempts -> this is the 5th
        verifiedAt: null,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      prismaMock.withdrawalRequest.findUnique.mockResolvedValue(mockRequest);
      prismaMock.withdrawalOtp.findFirst.mockResolvedValue(mockOtp);
      prismaMock.withdrawalOtp.update.mockResolvedValue({ ...mockOtp, attempts: 5 });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/withdrawals/wdr-004/otp/verify",
        headers: { authorization: `Bearer ${userToken}` },
        payload: { code: "000000" },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toBe("Invalid or expired code");

      // Verify attempts=5 and expiresAt set to now (invalidated)
      expect(prismaMock.withdrawalOtp.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "otp-004" },
          data: expect.objectContaining({ attempts: 5, expiresAt: expect.any(Date) }),
        }),
      );
    });

    it("rejects expired OTP even if code is correct", async () => {
      const codeHash = await hashPassword("123456");
      const mockRequest = { id: "wdr-005", userId: testUser.id, status: "PENDING_OTP" };

      prismaMock.withdrawalRequest.findUnique.mockResolvedValue(mockRequest);
      // findFirst returns null because expiresAt is in the past
      prismaMock.withdrawalOtp.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/withdrawals/wdr-005/otp/verify",
        headers: { authorization: `Bearer ${userToken}` },
        payload: { code: "123456" },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toBe("Invalid or expired code");
    });
  });

  describe("Security Gating: POST /api/v1/withdrawals/:id/release", () => {
    it("REJECTS release when OTP is unverified (status is PENDING_OTP) returning 409 Conflict", async () => {
      const unverifiedRequest = {
        id: "wdr-unverified",
        userId: testUser.id,
        status: "PENDING_OTP",
        otps: [], // no verified OTP
      };

      prismaMock.withdrawalRequest.findUnique.mockResolvedValue(unverifiedRequest);

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/withdrawals/wdr-unverified/release",
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(409);
      const body = res.json();
      expect(body.error).toBe("Conflict");
      expect(body.message).toMatch(/cannot be released without a verified OTP/i);
    });

    it("allows release when withdrawal status is APPROVED with verified OTP", async () => {
      const approvedRequest = {
        id: "wdr-approved",
        userId: testUser.id,
        status: "APPROVED",
        otps: [{ id: "otp-ok", verifiedAt: new Date() }],
      };

      prismaMock.withdrawalRequest.findUnique.mockResolvedValue(approvedRequest);
      prismaMock.withdrawalRequest.update.mockResolvedValue({ ...approvedRequest, status: "COMPLETED" });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/withdrawals/wdr-approved/release",
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().withdrawalRequest.status).toBe("COMPLETED");
    });
  });

  describe("Rate Limiting: POST /api/v1/withdrawals/:id/otp/request", () => {
    it("enforces max 3 OTP requests per withdrawal per 10 minutes (returns 429)", async () => {
      const mockRequest = { id: "wdr-rate1", userId: testUser.id, user: testUser };

      prismaMock.withdrawalRequest.findUnique.mockResolvedValue(mockRequest);
      // 3 OTPs generated in last 10m
      prismaMock.withdrawalOtp.count.mockImplementation((args: any) => {
        if (args?.where?.withdrawalRequestId === "wdr-rate1") return Promise.resolve(3);
        return Promise.resolve(0);
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/withdrawals/wdr-rate1/otp/request",
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(429);
      expect(res.json().message).toMatch(/3 OTP requests per withdrawal/i);
    });

    it("enforces max 5 OTP requests across all withdrawals per user per hour (returns 429)", async () => {
      const mockRequest = { id: "wdr-rate2", userId: testUser.id, user: testUser };

      prismaMock.withdrawalRequest.findUnique.mockResolvedValue(mockRequest);
      prismaMock.withdrawalOtp.count.mockImplementation((args: any) => {
        if (args?.where?.withdrawalRequestId === "wdr-rate2") return Promise.resolve(1);
        if (args?.where?.userId === testUser.id) return Promise.resolve(5); // 5 for user
        return Promise.resolve(0);
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/withdrawals/wdr-rate2/otp/request",
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(429);
      expect(res.json().message).toMatch(/5 OTP requests per user per hour/i);
    });

    it("enforces 60-second cooldown per withdrawal (returns 429)", async () => {
      const mockRequest = { id: "wdr-cooldown", userId: testUser.id, user: testUser };

      prismaMock.withdrawalRequest.findUnique.mockResolvedValue(mockRequest);
      prismaMock.withdrawalOtp.count.mockResolvedValue(0);
      // Latest OTP was created 10 seconds ago
      prismaMock.withdrawalOtp.findFirst.mockResolvedValue({
        id: "otp-recent",
        createdAt: new Date(Date.now() - 10 * 1000),
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/withdrawals/wdr-cooldown/otp/request",
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(429);
      expect(res.json().message).toMatch(/wait \d+ seconds/i);
    });
  });

  describe("Dev Helper: GET /api/v1/dev/withdrawals/:id/otp", () => {
    it("returns latest active code from Notification payload in dev mode", async () => {
      prismaMock.notification.findFirst.mockResolvedValue({
        id: "notif-001",
        userId: testUser.id,
        kind: "WITHDRAWAL_OTP",
        payload: {
          withdrawalRequestId: "wdr-dev",
          code: "987654",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        },
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/dev/withdrawals/wdr-dev/otp",
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        code: "987654",
        expiresAt: expect.any(String),
      });
    });
  });
});
