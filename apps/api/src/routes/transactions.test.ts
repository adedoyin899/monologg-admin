import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import { generateAccessToken } from "../services/auth.js";

vi.mock("../db/client.js", () => ({
  prisma: {
    creator: { findUnique: vi.fn() },
    client: { findUnique: vi.fn() },
    payment: { findMany: vi.fn(), count: vi.fn() },
  },
}));

import { prisma } from "../db/client.js";
const prismaMock = prisma as any;

const TOKEN = generateAccessToken({ userId: "user-1", userType: "TALENT", email: "t@monologg.dev" });

describe("GET /transactions (features.md Phase 10)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it("401s without a token", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/transactions" });
    expect(response.statusCode).toBe(401);
  });

  it("returns the caller's own transactions with fee breakdown, paginated", async () => {
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
        booking: { creatorId: "creator-1", clientId: "client-x", baseAmount: 1_000_000, clientFeeAmount: 150_000, talentFeeAmount: 110_000 },
      },
    ]);
    prismaMock.payment.count.mockResolvedValue(1);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/transactions",
      headers: { authorization: `Bearer ${TOKEN}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      direction: "payout",
      state: "RELEASED",
      baseAmount: 1_000_000,
      feeAmount: 110_000,
      totalAmount: 890_000,
      providerRef: "ref-1",
    });
  });

  it("400s an invalid state filter", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/transactions?state=NOT_A_REAL_STATE",
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(response.statusCode).toBe(400);
  });

  it("accepts a valid state filter and applies it", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-1" });
    prismaMock.client.findUnique.mockResolvedValue(null);
    prismaMock.payment.findMany.mockResolvedValue([]);
    prismaMock.payment.count.mockResolvedValue(0);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/transactions?state=REFUNDED",
      headers: { authorization: `Bearer ${TOKEN}` },
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "REFUNDED" }) }),
    );
  });
});
