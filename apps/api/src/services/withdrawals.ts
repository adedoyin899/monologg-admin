// Phase 12C: Withdrawal Service with Email OTP Verification Gate.
//
// Invariants:
//  - Server is authoritative: Withdrawal requests start in PENDING_OTP status.
//  - Cryptographic randomness: OTP generated via crypto.randomInt(100000, 1000000).
//  - Secure hashing: Only the Argon2id hash (codeHash) is stored in WithdrawalOtp.
//  - Strict Rate Limits:
//      · Max 3 OTP requests per withdrawal per 10 minutes.
//      · Max 5 OTP requests across all withdrawals per user per hour.
//      · 60s cooldown per withdrawal between requests.
//  - 10-minute expiry & max 5 failed attempts per OTP before invalidation.
//  - Generic error messages ("Invalid or expired code") to prevent info leakage.
//  - Money release blocked (409 Conflict) if OTP is unverified.

import { randomInt } from "node:crypto";
import { prisma } from "../db/client.js";
import { hashPassword, verifyPassword } from "./auth.js";
import { notifyProvider } from "../providers/index.js";
import { env } from "../config/env.js";

export class WithdrawalError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string,
  ) {
    super(message);
    this.name = "WithdrawalError";
  }
}

export interface InitiateWithdrawalInput {
  amount: number; // minor units (kobo/cents)
  currency?: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  idempotencyKey?: string;
}

/**
 * Initiate a new withdrawal request in PENDING_OTP status and generate the first OTP.
 */
export async function initiateWithdrawal(userId: string, input: InitiateWithdrawalInput) {
  if (input.amount <= 0) {
    throw new WithdrawalError("Amount must be greater than zero", 400);
  }

  // Idempotency check: if an idempotencyKey is provided, return existing request if found
  if (input.idempotencyKey) {
    const existing = await prisma.withdrawalRequest.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      if (existing.userId !== userId) {
        throw new WithdrawalError("Forbidden: Idempotency key belongs to another user", 403);
      }
      return { withdrawalRequest: existing, replayed: true };
    }
  }

  // Create WithdrawalRequest in PENDING_OTP status
  const withdrawalRequest = await prisma.withdrawalRequest.create({
    data: {
      userId,
      amount: input.amount,
      currency: input.currency || "NGN",
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      accountName: input.accountName,
      status: "PENDING_OTP",
      idempotencyKey: input.idempotencyKey,
    },
  });

  // Generate and send the first OTP
  const otpResult = await generateWithdrawalOtp(userId, withdrawalRequest.id);

  return {
    withdrawalRequest,
    otpSent: true,
    expiresAt: otpResult.expiresAt,
  };
}

/**
 * Generate a new 6-digit cryptographically random OTP for a withdrawal.
 * Enforces rate limits, invalidates previous OTPs, stores Argon2id hash.
 */
export async function generateWithdrawalOtp(userId: string, withdrawalRequestId: string) {
  // Check ownership
  const request = await prisma.withdrawalRequest.findUnique({
    where: { id: withdrawalRequestId },
    include: { user: true },
  });

  if (!request) {
    throw new WithdrawalError("Withdrawal request not found", 404);
  }
  if (request.userId !== userId) {
    throw new WithdrawalError("Forbidden: You do not own this withdrawal request", 403);
  }

  const now = new Date();

  // Rate Limit 1: Max 3 OTP generations per withdrawal per 10 minutes
  const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const otpCountForWithdrawal = await prisma.withdrawalOtp.count({
    where: {
      withdrawalRequestId,
      createdAt: { gte: tenMinsAgo },
    },
  });
  if (otpCountForWithdrawal >= 3) {
    throw new WithdrawalError(
      "Rate limit exceeded: Maximum 3 OTP requests per withdrawal per 10 minutes",
      429,
      "RATE_LIMIT_EXCEEDED",
    );
  }

  // Rate Limit 2: Max 5 OTP generations across all withdrawals per user per hour
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const otpCountForUser = await prisma.withdrawalOtp.count({
    where: {
      userId,
      createdAt: { gte: oneHourAgo },
    },
  });
  if (otpCountForUser >= 5) {
    throw new WithdrawalError(
      "Rate limit exceeded: Maximum 5 OTP requests per user per hour",
      429,
      "RATE_LIMIT_EXCEEDED",
    );
  }

  // Rate Limit 3: 60s cooldown per withdrawal between requests
  const latestOtp = await prisma.withdrawalOtp.findFirst({
    where: { withdrawalRequestId },
    orderBy: { createdAt: "desc" },
  });
  if (latestOtp && now.getTime() - latestOtp.createdAt.getTime() < 60 * 1000) {
    const remainingSecs = Math.ceil((60 * 1000 - (now.getTime() - latestOtp.createdAt.getTime())) / 1000);
    throw new WithdrawalError(
      `Please wait ${remainingSecs} seconds before requesting another OTP`,
      429,
      "COOLDOWN_ACTIVE",
    );
  }

  // Invalidate any existing active unverified OTPs for this withdrawal
  await prisma.withdrawalOtp.updateMany({
    where: {
      withdrawalRequestId,
      verifiedAt: null,
      expiresAt: { gt: now },
    },
    data: {
      expiresAt: now,
    },
  });

  // Generate cryptographically random 6-digit code
  const code = randomInt(100000, 1000000).toString();

  // Hash the code using Argon2id before saving to DB
  const codeHash = await hashPassword(code);

  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

  // Insert WithdrawalOtp record
  await prisma.withdrawalOtp.create({
    data: {
      userId,
      withdrawalRequestId,
      codeHash,
      expiresAt,
    },
  });

  // Deliver OTP (mock log + Notification row, live via NotifyProvider.email)
  const maskedEmail = request.user.email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => `${a}${"*".repeat(b.length)}${c}`);
  console.log(`[withdrawal.otp] Code for withdrawal ${withdrawalRequestId} (${request.user.email}): ${code}`);

  await notifyProvider.inApp(userId, {
    kind: "WITHDRAWAL_OTP",
    message: `Your 6-digit withdrawal verification code is ${code}. It expires in 10 minutes.`,
    payload: {
      withdrawalRequestId,
      code,
      expiresAt: expiresAt.toISOString(),
      maskedEmail,
    },
  });

  if (env.WITHDRAWAL_OTP_MODE === "live") {
    await notifyProvider.email(request.user.email, "withdrawal_otp", {
      name: request.user.email,
      code,
      amount: request.amount,
      currency: request.currency,
      expiresAt: expiresAt.toISOString(),
    });
  }

  return { sent: true, expiresAt };
}

/**
 * Verify OTP for a withdrawal. On success, transitions status to APPROVED and triggers payout.
 * Generic error messages are returned on any failure to prevent info leakage.
 */
export async function verifyWithdrawalOtp(userId: string, withdrawalRequestId: string, code: string) {
  const request = await prisma.withdrawalRequest.findUnique({
    where: { id: withdrawalRequestId },
  });

  if (!request) {
    throw new WithdrawalError("Withdrawal request not found", 404);
  }
  if (request.userId !== userId) {
    throw new WithdrawalError("Forbidden: You do not own this withdrawal request", 403);
  }

  // Idempotency: if already APPROVED or COMPLETED, return success without re-processing
  if (request.status === "APPROVED" || request.status === "COMPLETED") {
    return { success: true, withdrawalRequest: request, replayed: true };
  }

  const now = new Date();

  // Find active, unverified, non-expired OTP
  const activeOtp = await prisma.withdrawalOtp.findFirst({
    where: {
      withdrawalRequestId,
      verifiedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!activeOtp) {
    // Generic error message — do not leak whether expired vs not requested
    throw new WithdrawalError("Invalid or expired code", 400);
  }

  // Verify Argon2id code hash
  const isValid = await verifyPassword(activeOtp.codeHash, code);

  if (!isValid) {
    const newAttempts = activeOtp.attempts + 1;
    const shouldInvalidate = newAttempts >= 5;

    await prisma.withdrawalOtp.update({
      where: { id: activeOtp.id },
      data: {
        attempts: newAttempts,
        expiresAt: shouldInvalidate ? now : activeOtp.expiresAt,
      },
    });

    // Generic error message — do not leak whether wrong code vs attempts exceeded
    throw new WithdrawalError("Invalid or expired code", 400);
  }

  // Success: mark OTP verified and transition withdrawal to APPROVED
  await prisma.withdrawalOtp.update({
    where: { id: activeOtp.id },
    data: { verifiedAt: now },
  });

  const updatedRequest = await prisma.withdrawalRequest.update({
    where: { id: withdrawalRequestId },
    data: { status: "APPROVED" },
  });

  return {
    success: true,
    withdrawalRequest: updatedRequest,
  };
}

/**
 * Release withdrawal funds to payout provider. REJECTS if OTP is not verified (status != APPROVED).
 */
export async function releaseWithdrawal(userId: string, withdrawalRequestId: string) {
  const request = await prisma.withdrawalRequest.findUnique({
    where: { id: withdrawalRequestId },
    include: { otps: { where: { verifiedAt: { not: null } } } },
  });

  if (!request) {
    throw new WithdrawalError("Withdrawal request not found", 404);
  }
  if (request.userId !== userId) {
    throw new WithdrawalError("Forbidden: You do not own this withdrawal request", 403);
  }

  // Security Gate: MUST have verified OTP and status APPROVED
  if (request.status === "PENDING_OTP" || request.otps.length === 0) {
    throw new WithdrawalError(
      "Conflict: Withdrawal funds cannot be released without a verified OTP step",
      409,
      "OTP_NOT_VERIFIED",
    );
  }

  // Mark COMPLETED
  const completedRequest = await prisma.withdrawalRequest.update({
    where: { id: withdrawalRequestId },
    data: { status: "COMPLETED" },
  });

  return { success: true, withdrawalRequest: completedRequest };
}

/**
 * Dev-only helper endpoint: retrieves raw OTP code from latest Notification payload for demo testing.
 */
export async function getDevLatestOtp(userId: string, withdrawalRequestId: string) {
  if (env.NODE_ENV === "production") {
    throw new WithdrawalError("Not found", 404);
  }

  const notification = await prisma.notification.findFirst({
    where: {
      userId,
      kind: "WITHDRAWAL_OTP",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!notification) {
    throw new WithdrawalError("No OTP notification found", 404);
  }

  const payload = notification.payload as { withdrawalRequestId?: string; code?: string; expiresAt?: string };
  if (payload?.withdrawalRequestId !== withdrawalRequestId) {
    throw new WithdrawalError("No OTP notification found for this withdrawal", 404);
  }

  return {
    code: payload.code,
    expiresAt: payload.expiresAt,
  };
}
