import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";

vi.mock("../db/client.js", () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    rateCard: { findUnique: vi.fn() },
    booking: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    payment: { create: vi.fn(), update: vi.fn() },
    availabilityBlock: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
    creator: { findUnique: vi.fn().mockResolvedValue(null) },
    $executeRaw: vi.fn().mockResolvedValue(undefined),
    $transaction: vi.fn((cb: any) => cb(prismaMock)),
  },
}));

vi.mock("../providers/index.js", () => ({
  paymentProvider: {
    initEscrow: vi.fn(),
    holdFunds: vi.fn(),
    releaseFunds: vi.fn(),
    refund: vi.fn(),
    verifyWebhook: vi.fn(),
  },
  notifyProvider: { email: vi.fn(), sms: vi.fn(), inApp: vi.fn() },
}));

import { prisma } from "../db/client.js";
import { paymentProvider } from "../providers/index.js";
const prismaMock = prisma as any;
const paymentProviderMock = paymentProvider as any;

const RATE_CARD = {
  id: "rc-1",
  creatorId: "creator-1",
  basePriceAmount: 100_000,
  basePriceCurrency: "NGN",
};

describe("Public (guest) bookings — features.md Phase 16, FA-5", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
    prismaMock.availabilityBlock.findFirst.mockResolvedValue(null);
    prismaMock.availabilityBlock.findMany.mockResolvedValue([]);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /public/bookings", () => {
    it("creates a guest booking for a brand-new email — no auth header required", async () => {
      prismaMock.rateCard.findUnique.mockResolvedValue(RATE_CARD);
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({ id: "new-user-1", client: { id: "new-client-1" } });
      prismaMock.booking.create.mockResolvedValue({ id: "booking-1", origin: "PUBLIC_LINK", state: "PENDING_PAYMENT" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/public/bookings",
        payload: {
          creatorId: "creator-1",
          rateCardId: "rc-1",
          slotDate: "2026-08-10",
          slotStart: "10:00",
          slotEnd: "11:00",
          contextNote: "Need a 30s voiceover",
          name: "Guest Visitor",
          email: "guest@example.com",
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().id).toBe("booking-1");
    });

    it("400s when rateCardId doesn't belong to the given creatorId", async () => {
      prismaMock.rateCard.findUnique.mockResolvedValue({ ...RATE_CARD, creatorId: "some-other-creator" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/public/bookings",
        payload: {
          creatorId: "creator-1",
          rateCardId: "rc-1",
          slotDate: "2026-08-10",
          slotStart: "10:00",
          slotEnd: "11:00",
          name: "Guest Visitor",
          email: "guest@example.com",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("409s when the email already belongs to a TALENT-only account (no silent reuse)", async () => {
      prismaMock.rateCard.findUnique.mockResolvedValue(RATE_CARD);
      prismaMock.user.findUnique.mockResolvedValue({ id: "talent-1", userType: "TALENT", client: null });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/public/bookings",
        payload: {
          creatorId: "creator-1",
          rateCardId: "rc-1",
          slotDate: "2026-08-10",
          slotStart: "10:00",
          slotEnd: "11:00",
          name: "Guest Visitor",
          email: "talent@example.com",
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it("409s when the slot isn't actually open server-side", async () => {
      prismaMock.rateCard.findUnique.mockResolvedValue(RATE_CARD);
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({ id: "new-user-1", client: { id: "new-client-1" } });
      prismaMock.availabilityBlock.findFirst.mockResolvedValue({
        id: "block-1",
        slots: [{ start: "10:00", end: "11:00", state: "unavailable" }],
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/public/bookings",
        payload: {
          creatorId: "creator-1",
          rateCardId: "rc-1",
          slotDate: "2026-08-10",
          slotStart: "10:00",
          slotEnd: "11:00",
          name: "Guest Visitor",
          email: "guest@example.com",
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it("400s on an invalid email", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/public/bookings",
        payload: {
          creatorId: "creator-1",
          rateCardId: "rc-1",
          slotDate: "2026-08-10",
          slotStart: "10:00",
          slotEnd: "11:00",
          name: "Guest Visitor",
          email: "not-an-email",
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /public/bookings/:id/pay", () => {
    it("initiates escrow for a PUBLIC_LINK booking with no auth required", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "booking-1",
        origin: "PUBLIC_LINK",
        state: "PENDING_PAYMENT",
        baseAmount: 100_000,
        clientFeeAmount: 15_000,
        currency: "NGN",
        payment: null,
      });
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({
        id: "booking-1",
        state: "PENDING_PAYMENT",
        baseAmount: 100_000,
        clientFeeAmount: 15_000,
        currency: "NGN",
        payment: null,
      });
      paymentProviderMock.initEscrow.mockResolvedValue({ ref: "ref-1", checkoutUrl: "https://pay.example/ref-1" });
      prismaMock.payment.create.mockResolvedValue({ id: "payment-1", providerRef: "ref-1", status: "INITIATED" });

      const response = await app.inject({ method: "POST", url: "/api/v1/public/bookings/booking-1/pay" });

      expect(response.statusCode).toBe(200);
      expect(response.json().checkoutUrl).toBe("https://pay.example/ref-1");
    });

    it("404s for a booking that doesn't exist", async () => {
      prismaMock.booking.findUnique.mockResolvedValue(null);

      const response = await app.inject({ method: "POST", url: "/api/v1/public/bookings/nope/pay" });

      expect(response.statusCode).toBe(404);
    });

    it("403s an INTERNAL booking — this door is guest-only", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({ id: "booking-2", origin: "INTERNAL", state: "PENDING_PAYMENT" });

      const response = await app.inject({ method: "POST", url: "/api/v1/public/bookings/booking-2/pay" });

      expect(response.statusCode).toBe(403);
    });
  });
});
