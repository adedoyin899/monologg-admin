import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import { generateAccessToken } from "../services/auth.js";

vi.mock("../db/client.js", () => ({
  prisma: {
    creator: { findUnique: vi.fn() },
    rateCard: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    booking: { count: vi.fn() },
  },
}));

import { prisma } from "../db/client.js";
const prismaMock = prisma as any;

const TALENT_TOKEN = generateAccessToken({ userId: "user-talent-1", userType: "TALENT", email: "t@monologg.dev" });

describe("Rate cards (owner-scoped CRUD)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it("GET /rate-cards returns a paginated envelope mapped to the ServiceRateCard display shape", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
    prismaMock.rateCard.findMany.mockResolvedValue([
      {
        id: "rc-1",
        creatorId: "creator-1",
        serviceTitle: "VO Session",
        basePriceAmount: 2_800_000,
        basePriceCurrency: "NGN",
        deliveryTimeline: "Same Day",
      },
    ]);
    prismaMock.rateCard.count.mockResolvedValue(1);
    prismaMock.booking.count.mockResolvedValue(3);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/rate-cards",
      headers: { authorization: `Bearer ${TALENT_TOKEN}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({ page: 1, pageSize: 20, total: 1 });
    expect(body.data).toEqual([
      { id: "rc-1", title: "VO Session", price: "₦28,000", delivery: "Same Day", bookings: 3 },
    ]);
    expect(prismaMock.rateCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { creatorId: "creator-1" } }),
    );
  });

  it("returns 401 with no token", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/rate-cards" });
    expect(response.statusCode).toBe(401);
  });

  it("PATCH /rate-cards/:id returns 403 when the rate card belongs to a different creator (owner-scoping)", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
    prismaMock.rateCard.findUnique.mockResolvedValue({ id: "rc-owned-by-other", creatorId: "creator-OTHER" });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/rate-cards/rc-owned-by-other",
      headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      payload: { serviceTitle: "Hijacked" },
    });

    expect(response.statusCode).toBe(403);
    expect(prismaMock.rateCard.update).not.toHaveBeenCalled();
  });

  it("PATCH /rate-cards/:id succeeds when the caller owns the rate card", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
    prismaMock.rateCard.findUnique.mockResolvedValue({ id: "rc-1", creatorId: "creator-1" });
    prismaMock.rateCard.update.mockResolvedValue({ id: "rc-1", serviceTitle: "Updated" });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/rate-cards/rc-1",
      headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      payload: { serviceTitle: "Updated" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().serviceTitle).toBe("Updated");
  });

  it("DELETE /rate-cards/:id returns 403 for a non-owned rate card", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
    prismaMock.rateCard.findUnique.mockResolvedValue({ id: "rc-2", creatorId: "creator-OTHER" });

    const response = await app.inject({
      method: "DELETE",
      url: "/api/v1/rate-cards/rc-2",
      headers: { authorization: `Bearer ${TALENT_TOKEN}` },
    });

    expect(response.statusCode).toBe(403);
    expect(prismaMock.rateCard.delete).not.toHaveBeenCalled();
  });

  it("POST /rate-cards creates a rate card owned by the caller's creator profile", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
    prismaMock.rateCard.create.mockResolvedValue({ id: "rc-new", creatorId: "creator-1", serviceTitle: "New Service" });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/rate-cards",
      headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      payload: {
        serviceTitle: "New Service",
        basePriceAmount: 5_000_000,
        basePriceCurrency: "NGN",
        deliveryTimeline: "48 Hours",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(prismaMock.rateCard.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ creatorId: "creator-1", serviceTitle: "New Service" }),
    });
  });
});
