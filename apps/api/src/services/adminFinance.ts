import { adminRoPrisma } from "../db/adminRoClient.js";
import { prisma as defaultPrisma } from "../db/client.js";
import { env } from "../config/env.js";
import { maskEmail, maskPhone, maskAccount } from "../lib/masking.js";
import { runAllFinanceMismatchDetectors, type MismatchRecord } from "./financeMismatches.js";

export interface CurrencyFinanceSummary {
  currency: string;
  gmv: number;
  escrowHeld: number;
  released: number;
  refunded: number;
  platformRevenue: number;
  talentFees: number;
  clientFees: number;
  takeRatePct: number;
  averageBookingValue: number;
  paymentFailureRatePct: number;
  totalBookings: number;
  totalPayments: number;
  failedPayments: number;
}

export interface FinanceSummaryResponse {
  mode: "TEST" | "LIVE";
  summaries: Record<string, CurrencyFinanceSummary>;
  currencies: string[];
  mismatchesCount: number;
  recentMismatches: MismatchRecord[];
}

export interface PaymentFilters {
  status?: string;
  provider?: string;
  currency?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface WithdrawalFilters {
  status?: string;
  currency?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

/**
 * Mask sensitive card and bank account fields inside raw webhook JSON payloads.
 */
export function maskSensitiveFinancialFields(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(maskSensitiveFinancialFields);
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (typeof value === "string") {
      if (
        lowerKey.includes("card") ||
        lowerKey.includes("pan") ||
        lowerKey.includes("account_number") ||
        lowerKey.includes("accountnumber") ||
        lowerKey.includes("cvv") ||
        lowerKey.includes("authorization_code") ||
        lowerKey.includes("auth_code") ||
        lowerKey.includes("bin") ||
        lowerKey.includes("last4")
      ) {
        result[key] = value.length > 4 ? `***${value.slice(-4)}` : "***";
      } else {
        result[key] = value;
      }
    } else if (typeof value === "object" && value !== null) {
      result[key] = maskSensitiveFinancialFields(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Calculate OTP status from withdrawal OTP records.
 * Rules:
 * - verified: verifiedAt is not null
 * - locked: attempts >= 3
 * - expired: now > expiresAt
 * - requested: valid unexpired attempt
 */
export function calculateOtpStatus(
  otps: Array<{ expiresAt: Date; verifiedAt: Date | null; attempts: number }>,
  now: Date = new Date()
): "requested" | "verified" | "expired" | "locked" | "none" {
  if (!otps || otps.length === 0) return "none";
  const latest = otps[0];
  if (latest.verifiedAt) return "verified";
  if (latest.attempts >= 3) return "locked";
  if (now.getTime() > new Date(latest.expiresAt).getTime()) return "expired";
  return "requested";
}

/**
 * Finance Summary (AD-09)
 * Calculates per currency GMV, escrow, releases, platform revenues, take rates, ABV, failure rates.
 * NEVER sums across different currencies.
 */
export async function getFinanceSummary(
  filters: { dateFrom?: string; dateTo?: string } = {},
  dbClient: any = adminRoPrisma || defaultPrisma
): Promise<FinanceSummaryResponse> {
  const mode = (env.PAYSTACK_SECRET_KEY || "").startsWith("sk_live_") ? "LIVE" : "TEST";

  const bookingWhere: any = {};
  const paymentWhere: any = {};

  if (filters.dateFrom || filters.dateTo) {
    bookingWhere.createdAt = {};
    paymentWhere.createdAt = {};
    if (filters.dateFrom) {
      bookingWhere.createdAt.gte = new Date(filters.dateFrom);
      paymentWhere.createdAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      bookingWhere.createdAt.lte = new Date(filters.dateTo);
      paymentWhere.createdAt.lte = new Date(filters.dateTo);
    }
  }

  // 1. Fetch bookings for GMV & Platform revenues (from stored amounts)
  const bookings = await dbClient.booking.findMany({
    where: bookingWhere,
    select: {
      id: true,
      currency: true,
      baseAmount: true,
      clientFeeAmount: true,
      talentFeeAmount: true,
      state: true,
    },
  });

  // 2. Fetch payments for Escrow & Payment statistics
  const payments = await dbClient.payment.findMany({
    where: paymentWhere,
    select: {
      id: true,
      currency: true,
      amount: true,
      status: true,
      escrowHeld: true,
    },
  });

  // 3. Run mismatch detectors
  const mismatches = await runAllFinanceMismatchDetectors(dbClient);

  // Group by currency
  const currencies = Array.from(
    new Set([
      "NGN",
      "USD",
      "GBP",
      ...bookings.map((b: any) => b.currency),
      ...payments.map((p: any) => p.currency),
    ])
  ).filter(Boolean);

  const summaries: Record<string, CurrencyFinanceSummary> = {};

  for (const curr of currencies) {
    const currBookings = bookings.filter((b: any) => b.currency === curr);
    const currPayments = payments.filter((p: any) => p.currency === curr);

    // GMV: bookings that entered ESCROW_LOCKED or beyond
    const gmvBookings = currBookings.filter((b: any) =>
      ["ESCROW_LOCKED", "DELIVERABLES_PROVIDED", "PAYMENT_RELEASED", "COMPLETED"].includes(b.state)
    );
    const gmv = gmvBookings.reduce((sum: number, b: any) => sum + (b.baseAmount || 0), 0);

    // Platform revenue from stored booking amounts (never recomputed!)
    const talentFees = gmvBookings.reduce((sum: number, b: any) => sum + (b.talentFeeAmount || 0), 0);
    const clientFees = gmvBookings.reduce((sum: number, b: any) => sum + (b.clientFeeAmount || 0), 0);
    const platformRevenue = talentFees + clientFees;

    // Escrow held now
    const escrowHeld = currPayments
      .filter((p: any) => p.status === "ESCROW_HELD" || p.escrowHeld)
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    // Released
    const released = currPayments
      .filter((p: any) => p.status === "RELEASED")
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    // Refunded
    const refunded = currPayments
      .filter((p: any) => p.status === "REFUNDED")
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    // Take rate
    const takeRatePct = gmv > 0 ? Number(((platformRevenue / gmv) * 100).toFixed(2)) : 0;

    // ABV
    const averageBookingValue = gmvBookings.length > 0 ? Math.round(gmv / gmvBookings.length) : 0;

    // Failure rate
    const totalPayments = currPayments.length;
    const failedPayments = currPayments.filter((p: any) => p.status === "FAILED").length;
    const paymentFailureRatePct =
      totalPayments > 0 ? Number(((failedPayments / totalPayments) * 100).toFixed(2)) : 0;

    summaries[curr] = {
      currency: curr,
      gmv,
      escrowHeld,
      released,
      refunded,
      platformRevenue,
      talentFees,
      clientFees,
      takeRatePct,
      averageBookingValue,
      paymentFailureRatePct,
      totalBookings: currBookings.length,
      totalPayments,
      failedPayments,
    };
  }

  return {
    mode,
    summaries,
    currencies,
    mismatchesCount: mismatches.length,
    recentMismatches: mismatches.slice(0, 10),
  };
}

/**
 * Payments List with cursor pagination and filtering (AD-09)
 */
export async function listAdminPayments(
  filters: PaymentFilters = {},
  dbClient: any = adminRoPrisma || defaultPrisma
): Promise<{
  payments: any[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}> {
  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 100);
  const where: any = {};

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status;
  }

  if (filters.provider && filters.provider !== "ALL") {
    where.provider = filters.provider;
  }

  if (filters.currency && filters.currency !== "ALL") {
    where.currency = filters.currency;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
  }

  if (filters.search) {
    const term = filters.search.trim();
    where.OR = [
      { id: { contains: term, mode: "insensitive" } },
      { providerRef: { contains: term, mode: "insensitive" } },
      { booking: { client: { name: { contains: term, mode: "insensitive" } } } },
      { booking: { creator: { name: { contains: term, mode: "insensitive" } } } },
    ];
  }

  let cursorOptions: any = {};
  if (filters.cursor) {
    cursorOptions = {
      cursor: { id: filters.cursor },
      skip: 1,
    };
  }

  const payments = await dbClient.payment.findMany({
    where,
    take: limit + 1,
    ...cursorOptions,
    orderBy: { createdAt: "desc" },
    include: {
      booking: {
        select: {
          id: true,
          state: true,
          baseAmount: true,
          clientFeeAmount: true,
          talentFeeAmount: true,
          origin: true,
          client: {
            select: { id: true, name: true, orgName: true, user: { select: { email: true } } },
          },
          creator: {
            select: { id: true, name: true, user: { select: { email: true } } },
          },
        },
      },
    },
  });

  const hasMore = payments.length > limit;
  const items = hasMore ? payments.slice(0, limit) : payments;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;
  const totalCount =
    typeof dbClient.payment?.count === "function"
      ? await dbClient.payment.count({ where }).catch(() => items.length)
      : items.length;

  const formatted = items.map((p: any) => {
    const clientFee = p.booking?.clientFeeAmount || 0;
    const talentFee = p.booking?.talentFeeAmount || 0;
    const platformFee = clientFee + talentFee;

    return {
      id: p.id,
      bookingId: p.bookingId,
      bookingState: p.booking?.state || "UNKNOWN",
      payer: {
        id: p.booking?.client?.id || "",
        name: p.booking?.client?.name || "Unknown Payer",
        orgName: p.booking?.client?.orgName || null,
        email: maskEmail(p.booking?.client?.user?.email || ""),
      },
      creator: {
        id: p.booking?.creator?.id || "",
        name: p.booking?.creator?.name || "Unknown Creator",
        email: maskEmail(p.booking?.creator?.user?.email || ""),
      },
      provider: p.provider,
      providerRef: p.providerRef || null,
      status: p.status,
      amount: p.amount,
      currency: p.currency,
      platformFee,
      clientFee,
      talentFee,
      escrowHeld: Boolean(p.escrowHeld),
      createdAt: new Date(p.createdAt).toISOString(),
    };
  });

  return {
    payments: formatted,
    nextCursor,
    hasMore,
    totalCount,
  };
}

/**
 * Payment Detail & Webhook log (AD-10)
 * Note: Raw webhook JSON is strictly omitted here (revealed only via audited /raw endpoint).
 */
export async function getAdminPaymentDetail(
  id: string,
  dbClient: any = adminRoPrisma || defaultPrisma
): Promise<any | null> {
  const payment = await dbClient.payment.findUnique({
    where: { id },
    include: {
      booking: {
        include: {
          client: {
            include: { user: { select: { id: true, email: true, phone: true } } },
          },
          creator: {
            include: { user: { select: { id: true, email: true, phone: true } } },
          },
        },
      },
      events: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          type: true,
          eventId: true,
          createdAt: true,
          // Exclude raw payload from default response!
        },
      },
    },
  });

  if (!payment) return null;

  // Detect duplicates in events
  const seenEventIds = new Set<string>();
  const events = payment.events.map((ev: any) => {
    const isDuplicate = seenEventIds.has(ev.eventId);
    seenEventIds.add(ev.eventId);
    return {
      id: ev.id,
      type: ev.type,
      eventId: ev.eventId,
      createdAt: new Date(ev.createdAt).toISOString(),
      isDuplicate,
      processingResult: "SUCCESS",
    };
  });

  const clientFee = payment.booking?.clientFeeAmount || 0;
  const talentFee = payment.booking?.talentFeeAmount || 0;
  const platformRevenue = clientFee + talentFee;

  return {
    payment: {
      id: payment.id,
      bookingId: payment.bookingId,
      provider: payment.provider,
      providerRef: payment.providerRef,
      status: payment.status,
      escrowHeld: Boolean(payment.escrowHeld),
      amount: payment.amount,
      currency: payment.currency,
      createdAt: new Date(payment.createdAt).toISOString(),
      platformRevenue,
      talentFee,
      clientFee,
      feeBreakdownLabel: "Fee breakdown equals stored amounts from booking creation",
    },
    booking: payment.booking
      ? {
          id: payment.booking.id,
          state: payment.booking.state,
          origin: payment.booking.origin,
          slotDate: payment.booking.slotDate ? new Date(payment.booking.slotDate).toISOString() : null,
          baseAmount: payment.booking.baseAmount,
          currency: payment.booking.currency,
          client: {
            name: payment.booking.client?.name || "Unknown Client",
            orgName: payment.booking.client?.orgName || null,
            email: maskEmail(payment.booking.client?.user?.email || ""),
            phone: maskPhone(payment.booking.client?.user?.phone || ""),
          },
          talent: {
            name: payment.booking.creator?.name || "Unknown Talent",
            email: maskEmail(payment.booking.creator?.user?.email || ""),
            phone: maskPhone(payment.booking.creator?.user?.phone || ""),
          },
        }
      : null,
    events,
  };
}

/**
 * Fetch and mask raw webhook JSON payload for a payment.
 * Strictly restricted to SUPER_ADMIN and FINANCE with mandatory audit logging.
 */
export async function getAdminPaymentRawWebhook(
  id: string,
  dbClient: any = adminRoPrisma || defaultPrisma
): Promise<{ paymentId: string; events: Array<{ id: string; type: string; eventId: string; raw: any; createdAt: string }> }> {
  const payment = await dbClient.payment.findUnique({
    where: { id },
    include: {
      events: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!payment) {
    throw new Error(`Payment with ID ${id} not found.`);
  }

  const maskedEvents = (payment.events || []).map((ev: any) => ({
    id: ev.id,
    type: ev.type,
    eventId: ev.eventId,
    raw: maskSensitiveFinancialFields(ev.raw),
    createdAt: new Date(ev.createdAt).toISOString(),
  }));

  return {
    paymentId: payment.id,
    events: maskedEvents,
  };
}

/**
 * Withdrawals queue (AD-11)
 * Uses real WithdrawalRequest model from Phase A0 / 12C.
 * PRIVACY GUARANTEE: Never exposes codeHash or verification codes!
 */
export async function listAdminWithdrawals(
  filters: WithdrawalFilters = {},
  dbClient: any = adminRoPrisma || defaultPrisma
): Promise<{
  withdrawals: any[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}> {
  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 100);
  const where: any = {};

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status;
  }

  if (filters.currency && filters.currency !== "ALL") {
    where.currency = filters.currency;
  }

  if (filters.search) {
    const term = filters.search.trim();
    where.OR = [
      { id: { contains: term, mode: "insensitive" } },
      { accountName: { contains: term, mode: "insensitive" } },
      { bankName: { contains: term, mode: "insensitive" } },
      { user: { email: { contains: term, mode: "insensitive" } } },
    ];
  }

  let cursorOptions: any = {};
  if (filters.cursor) {
    cursorOptions = {
      cursor: { id: filters.cursor },
      skip: 1,
    };
  }

  const withdrawals = await dbClient.withdrawalRequest.findMany({
    where,
    take: limit + 1,
    ...cursorOptions,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          creator: { select: { id: true, name: true, avatarUrl: true } },
          client: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
      otps: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          expiresAt: true,
          verifiedAt: true,
          attempts: true,
          createdAt: true,
          // Strictly omit codeHash!
        },
      },
    },
  });

  const hasMore = withdrawals.length > limit;
  const items = hasMore ? withdrawals.slice(0, limit) : withdrawals;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;
  const totalCount =
    typeof dbClient.withdrawalRequest?.count === "function"
      ? await dbClient.withdrawalRequest.count({ where }).catch(() => items.length)
      : items.length;

  const now = new Date();
  const formatted = items.map((w: any) => {
    const userName =
      w.user?.creator?.name || w.user?.client?.name || w.accountName || "User";
    const userAvatar =
      w.user?.creator?.avatarUrl || w.user?.client?.avatarUrl || null;
    const otpStatus = calculateOtpStatus(w.otps, now);

    return {
      id: w.id,
      userId: w.userId,
      user: {
        id: w.userId,
        name: userName,
        email: maskEmail(w.user?.email || ""),
        avatarUrl: userAvatar,
      },
      amount: w.amount,
      currency: w.currency,
      state: w.status,
      requestedTime: new Date(w.createdAt).toISOString(),
      bank: {
        bankName: w.bankName,
        accountName: w.accountName,
        accountNumber: maskAccount(w.accountNumber),
      },
      otpStatus,
      providerReference: w.idempotencyKey || null,
      failureReason: w.flagReason || null,
      flagged: Boolean(w.flagged),
      flaggedAt: w.flaggedAt ? new Date(w.flaggedAt).toISOString() : null,
    };
  });

  return {
    withdrawals: formatted,
    nextCursor,
    hasMore,
    totalCount,
  };
}

/**
 * Earnings & Ledger View (AD-12)
 * Per talent earned, withdrawn, pending, available per currency.
 * Per client spend per currency.
 * Label: "Derived from bookings and withdrawals"
 */
export async function getAdminEarnings(
  filters: { currency?: string } = {},
  dbClient: any = adminRoPrisma || defaultPrisma
): Promise<{
  label: string;
  currencies: string[];
  topEarners: Record<string, any[]>;
  topSpenders: Record<string, any[]>;
}> {
  const label = "Derived from bookings and withdrawals";

  // 1. Fetch completed bookings for talent earnings & client spend
  const bookings = await dbClient.booking.findMany({
    where: {
      state: { in: ["ESCROW_LOCKED", "DELIVERABLES_PROVIDED", "PAYMENT_RELEASED", "COMPLETED"] },
    },
    select: {
      id: true,
      creatorId: true,
      clientId: true,
      currency: true,
      baseAmount: true,
      clientFeeAmount: true,
      talentFeeAmount: true,
      state: true,
      creator: { select: { id: true, userId: true, name: true, avatarUrl: true } },
      client: { select: { id: true, userId: true, name: true, orgName: true, avatarUrl: true } },
    },
  });

  // 2. Fetch withdrawal requests for talent withdrawals and pending payouts
  const withdrawals = await dbClient.withdrawalRequest.findMany({
    select: {
      id: true,
      userId: true,
      amount: true,
      currency: true,
      status: true,
    },
  });

  // Discover currencies
  const currencies = Array.from(
    new Set(["NGN", "USD", "GBP", ...bookings.map((b: any) => b.currency)])
  ).filter(Boolean);

  const topEarners: Record<string, any[]> = {};
  const topSpenders: Record<string, any[]> = {};

  for (const curr of currencies) {
    const currBookings = bookings.filter((b: any) => b.currency === curr);
    const currWithdrawals = withdrawals.filter((w: any) => w.currency === curr);

    // Calculate per talent
    const talentMap = new Map<string, { creator: any; earned: number; withdrawn: number; pending: number }>();

    for (const b of currBookings) {
      if (!b.creator) continue;
      const key = b.creator.id;
      if (!talentMap.has(key)) {
        talentMap.set(key, { creator: b.creator, earned: 0, withdrawn: 0, pending: 0 });
      }
      const entry = talentMap.get(key)!;
      // Only PAYMENT_RELEASED counts as finalized earnings
      if (b.state === "PAYMENT_RELEASED" || b.state === "COMPLETED") {
        entry.earned += b.baseAmount - (b.talentFeeAmount || 0);
      }
    }

    for (const w of currWithdrawals) {
      // Find talent matching this userId
      for (const [_, entry] of talentMap.entries()) {
        if (entry.creator.userId === w.userId) {
          if (w.status === "COMPLETED") {
            entry.withdrawn += w.amount;
          } else if (w.status === "PENDING_OTP" || w.status === "APPROVED") {
            entry.pending += w.amount;
          }
        }
      }
    }

    const talentList = Array.from(talentMap.values()).map((t) => ({
      creatorId: t.creator.id,
      userId: t.creator.userId,
      name: t.creator.name,
      avatarUrl: t.creator.avatarUrl,
      currency: curr,
      earned: t.earned,
      withdrawn: t.withdrawn,
      pending: t.pending,
      available: Math.max(0, t.earned - t.withdrawn - t.pending),
    }));

    talentList.sort((a, b) => b.earned - a.earned);
    topEarners[curr] = talentList.slice(0, 10);

    // Calculate per client spend
    const clientMap = new Map<string, { client: any; spend: number; bookingsCount: number }>();

    for (const b of currBookings) {
      if (!b.client) continue;
      const key = b.client.id;
      if (!clientMap.has(key)) {
        clientMap.set(key, { client: b.client, spend: 0, bookingsCount: 0 });
      }
      const entry = clientMap.get(key)!;
      entry.spend += b.baseAmount + (b.clientFeeAmount || 0);
      entry.bookingsCount++;
    }

    const clientList = Array.from(clientMap.values()).map((c) => ({
      clientId: c.client.id,
      userId: c.client.userId,
      name: c.client.name,
      orgName: c.client.orgName,
      avatarUrl: c.client.avatarUrl,
      currency: curr,
      spend: c.spend,
      bookingsCount: c.bookingsCount,
    }));

    clientList.sort((a, b) => b.spend - a.spend);
    topSpenders[curr] = clientList.slice(0, 10);
  }

  return {
    label,
    currencies,
    topEarners,
    topSpenders,
  };
}

