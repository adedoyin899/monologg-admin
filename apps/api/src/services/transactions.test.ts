import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/client.js", () => ({
  prisma: {
    creator: { findUnique: vi.fn() },
    client: { findUnique: vi.fn() },
    payment: { findMany: vi.fn(), count: vi.fn() },
  },
}));

import { prisma } from "../db/client.js";
import { listTransactions } from "./transactions.js";

const prismaMock = prisma as any;

const PAGINATION = { page: 1, pageSize: 20 };

describe("Transaction history service (features.md Phase 10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty page for a user with neither a creator nor a client profile", async () => {
    prismaMock.creator.findUnique.mockResolvedValue(null);
    prismaMock.client.findUnique.mockResolvedValue(null);

    const result = await listTransactions("user-ghost", PAGINATION);

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(prismaMock.payment.findMany).not.toHaveBeenCalled();
  });

  it("OWNER-SCOPED: a client only ever sees payments on their own bookings", async () => {
    prismaMock.creator.findUnique.mockResolvedValue(null);
    prismaMock.client.findUnique.mockResolvedValue({ id: "client-1", userId: "user-1" });
    prismaMock.payment.findMany.mockResolvedValue([]);
    prismaMock.payment.count.mockResolvedValue(0);

    await listTransactions("user-1", PAGINATION);

    expect(prismaMock.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ booking: { OR: [{ clientId: "client-1" }] } }) }),
    );
  });

  it("OWNER-SCOPED: a creator only ever sees payments on bookings where they're the talent", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-1" });
    prismaMock.client.findUnique.mockResolvedValue(null);
    prismaMock.payment.findMany.mockResolvedValue([]);
    prismaMock.payment.count.mockResolvedValue(0);

    await listTransactions("user-1", PAGINATION);

    expect(prismaMock.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ booking: { OR: [{ creatorId: "creator-1" }] } }) }),
    );
  });

  it("maps a client-side row as a 'payment' with base+clientFee as the total charged", async () => {
    prismaMock.creator.findUnique.mockResolvedValue(null);
    prismaMock.client.findUnique.mockResolvedValue({ id: "client-1", userId: "user-1" });
    prismaMock.payment.findMany.mockResolvedValue([
      {
        id: "pay-1",
        bookingId: "b1",
        status: "ESCROW_HELD",
        currency: "NGN",
        amount: 1_150_000, // base + clientFee, per initEscrowForBooking
        providerRef: "ref-1",
        createdAt: new Date("2026-07-01"),
        booking: { creatorId: "creator-OTHER", clientId: "client-1", baseAmount: 1_000_000, clientFeeAmount: 150_000, talentFeeAmount: 110_000 },
      },
    ]);
    prismaMock.payment.count.mockResolvedValue(1);

    const result = await listTransactions("user-1", PAGINATION);

    expect(result.data[0]).toMatchObject({
      direction: "payment",
      state: "ESCROW_HELD",
      baseAmount: 1_000_000,
      feeAmount: 150_000,
      totalAmount: 1_150_000,
      providerRef: "ref-1",
    });
    expect(result.data[0].totalAmountFormatted).toContain("11,500"); // ₦11,500 (minor units / 100)
  });

  it("maps a creator-side row as a 'payout' with base-talentFee as the net amount", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-1" });
    prismaMock.client.findUnique.mockResolvedValue(null);
    prismaMock.payment.findMany.mockResolvedValue([
      {
        id: "pay-1",
        bookingId: "b1",
        status: "RELEASED",
        currency: "NGN",
        amount: 1_150_000,
        providerRef: "ref-1",
        createdAt: new Date("2026-07-01"),
        booking: { creatorId: "creator-1", clientId: "client-OTHER", baseAmount: 1_000_000, clientFeeAmount: 150_000, talentFeeAmount: 110_000 },
      },
    ]);
    prismaMock.payment.count.mockResolvedValue(1);

    const result = await listTransactions("user-1", PAGINATION);

    expect(result.data[0]).toMatchObject({
      direction: "payout",
      state: "RELEASED",
      baseAmount: 1_000_000,
      feeAmount: 110_000,
      totalAmount: 890_000, // 1,000,000 - 110,000
    });
  });

  it("is filterable by state", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-1" });
    prismaMock.client.findUnique.mockResolvedValue(null);
    prismaMock.payment.findMany.mockResolvedValue([]);
    prismaMock.payment.count.mockResolvedValue(0);

    await listTransactions("user-1", PAGINATION, { state: "REFUNDED" });

    expect(prismaMock.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "REFUNDED" }) }),
    );
  });

  it("is filterable by direction — 'payout' only queries the creator side even if the user has both profiles", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-1" });
    prismaMock.client.findUnique.mockResolvedValue({ id: "client-1", userId: "user-1" });
    prismaMock.payment.findMany.mockResolvedValue([]);
    prismaMock.payment.count.mockResolvedValue(0);

    await listTransactions("user-1", PAGINATION, { direction: "payout" });

    expect(prismaMock.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ booking: { OR: [{ creatorId: "creator-1" }] } }) }),
    );
  });
});
