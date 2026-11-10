import type { PaymentStatus } from "@prisma/client";
import { prisma } from "../db/client.js";
import { findOwnCreator, findOwnClient } from "../lib/ownership.js";
import { formatMoney } from "../lib/display.js";
import { paginate, toSkipTake, type PaginationQuery } from "../lib/pagination.js";

// Transaction history (features.md Phase 10). Derived read-only from Payment +
// Booking — no new ledger table. A "transaction" is one Payment row, viewed
// from the caller's own side of the booking: a client sees what they were
// charged (base + clientFee); a creator sees what they were/will be paid out
// (base − talentFee). The same Payment row can appear differently to each side
// — direction disambiguates which math applies.

export interface TransactionFilters {
  state?: PaymentStatus;
  direction?: "payment" | "payout";
}

export async function listTransactions(userId: string, query: PaginationQuery, filters: TransactionFilters = {}) {
  const [creator, client] = await Promise.all([findOwnCreator(userId), findOwnClient(userId)]);

  const bookingConditions: Array<{ creatorId: string } | { clientId: string }> = [];
  if (creator && filters.direction !== "payment") bookingConditions.push({ creatorId: creator.id });
  if (client && filters.direction !== "payout") bookingConditions.push({ clientId: client.id });

  if (bookingConditions.length === 0) {
    return paginate([], 0, query);
  }

  const where = {
    booking: { OR: bookingConditions },
    ...(filters.state ? { status: filters.state } : {}),
  };

  const { skip, take } = toSkipTake(query);
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { booking: true },
    }),
    prisma.payment.count({ where }),
  ]);

  const transactions = payments.map((payment) => {
    const isPayout = creator !== null && payment.booking.creatorId === creator.id;
    const feeAmount = isPayout ? payment.booking.talentFeeAmount : payment.booking.clientFeeAmount;
    const totalAmount = isPayout
      ? payment.booking.baseAmount - payment.booking.talentFeeAmount
      : payment.amount;

    return {
      id: payment.id,
      bookingId: payment.bookingId,
      direction: isPayout ? ("payout" as const) : ("payment" as const),
      state: payment.status,
      currency: payment.currency,
      baseAmount: payment.booking.baseAmount,
      baseAmountFormatted: formatMoney(payment.booking.baseAmount, payment.currency),
      feeAmount,
      feeAmountFormatted: formatMoney(feeAmount, payment.currency),
      totalAmount,
      totalAmountFormatted: formatMoney(totalAmount, payment.currency),
      providerRef: payment.providerRef,
      createdAt: payment.createdAt,
    };
  });

  return paginate(transactions, total, query);
}
