import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import { generateAccessToken } from "../services/auth.js";
import { computeFees } from "../services/fees.js";

vi.mock("../db/client.js", () => ({
  prisma: {
    client: { findUnique: vi.fn() },
    creator: { findUnique: vi.fn() },
    rateCard: { findUnique: vi.fn(), findMany: vi.fn() },
    booking: { create: vi.fn(), findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
    payment: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    // features.md Phase 13: createBooking claims the slot atomically via
    // services/availability.ts's bookSlot inside the same transaction — by
    // default there's no existing block for the requested day, so the slot
    // is open (the same "any requested slot is bookable" assumption this
    // file's booking-creation tests already made before this phase).
    availabilityBlock: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({}), update: vi.fn().mockResolvedValue({}) },
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

// Phase 9: booking_created/deliverables_provided also enqueue email — mocked
// here (not exercised) so this file doesn't need to model prisma.user too;
// services/notifications.test.ts owns enqueueEmailNotification's own behavior.
vi.mock("../services/notifications.js", () => ({
  enqueueEmailNotification: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "../db/client.js";
import { paymentProvider, notifyProvider } from "../providers/index.js";
import { enqueueEmailNotification } from "../services/notifications.js";
const prismaMock = prisma as any;
const paymentProviderMock = paymentProvider as any;
const notifyProviderMock = notifyProvider as any;
const enqueueEmailNotificationMock = enqueueEmailNotification as any;

const CLIENT_TOKEN = generateAccessToken({ userId: "user-client-1", userType: "CLIENT", email: "c@monologg.dev" });
const TALENT_TOKEN = generateAccessToken({ userId: "user-talent-1", userType: "TALENT", email: "t@monologg.dev" });
const OTHER_TALENT_TOKEN = generateAccessToken({ userId: "user-talent-OTHER", userType: "TALENT", email: "other@monologg.dev" });

describe("Bookings", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
    notifyProviderMock.inApp.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /bookings", () => {
    it("persists fee amounts exactly equal to computeFees() output for the rate card's baseAmount", async () => {
      const baseAmount = 12_000_000;
      prismaMock.client.findUnique.mockResolvedValue({ id: "client-1", userId: "user-client-1" });
      prismaMock.rateCard.findUnique.mockResolvedValue({
        id: "rc-1",
        creatorId: "creator-1",
        basePriceAmount: baseAmount,
        basePriceCurrency: "NGN",
        creator: { userId: "user-creator-1" },
      });
      prismaMock.booking.create.mockResolvedValue({ id: "booking-new", state: "PENDING_PAYMENT" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/bookings",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
        payload: {
          creatorId: "creator-1",
          rateCardId: "rc-1",
          slotDate: "2026-08-01",
          slotStart: "10:00",
          slotEnd: "12:00",
        },
      });

      expect(response.statusCode).toBe(201);
      const expected = computeFees(baseAmount);
      expect(prismaMock.booking.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          talentFeeAmount: expected.talentFee,
          clientFeeAmount: expected.clientFee,
          state: "PENDING_PAYMENT",
        }),
      });
    });

    it("features.md Phase 9: notifies the talent in-app and by email of the new booking request", async () => {
      prismaMock.client.findUnique.mockResolvedValue({ id: "client-1", userId: "user-client-1" });
      prismaMock.rateCard.findUnique.mockResolvedValue({
        id: "rc-1",
        creatorId: "creator-1",
        basePriceAmount: 1_000_000,
        basePriceCurrency: "NGN",
        creator: { userId: "user-creator-1" },
      });
      prismaMock.booking.create.mockResolvedValue({ id: "booking-new", state: "PENDING_PAYMENT" });

      await app.inject({
        method: "POST",
        url: "/api/v1/bookings",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
        payload: { creatorId: "creator-1", rateCardId: "rc-1", slotDate: "2026-08-01", slotStart: "10:00", slotEnd: "12:00" },
      });

      expect(notifyProviderMock.inApp).toHaveBeenCalledWith(
        "user-creator-1",
        expect.objectContaining({ kind: "booking_created", bookingId: "booking-new" }),
      );
      expect(enqueueEmailNotificationMock).toHaveBeenCalledWith("user-creator-1", "booking_created", {
        bookingId: "booking-new",
      });
    });

    it("rejects a talent-role token (only clients create bookings)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/bookings",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
        payload: { creatorId: "c1", rateCardId: "rc1", slotDate: "2026-08-01", slotStart: "10:00", slotEnd: "12:00" },
      });
      expect(response.statusCode).toBe(403);
    });

    it("rejects when the rate card doesn't belong to the given creator", async () => {
      prismaMock.client.findUnique.mockResolvedValue({ id: "client-1", userId: "user-client-1" });
      prismaMock.rateCard.findUnique.mockResolvedValue({ id: "rc-1", creatorId: "creator-DIFFERENT" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/bookings",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
        payload: { creatorId: "creator-1", rateCardId: "rc-1", slotDate: "2026-08-01", slotStart: "10:00", slotEnd: "12:00" },
      });
      expect(response.statusCode).toBe(400);
      expect(prismaMock.booking.create).not.toHaveBeenCalled();
    });
  });

  describe("GET /bookings", () => {
    it("?role=talent scopes to the caller's own creator id", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      prismaMock.booking.findMany.mockResolvedValue([]);
      prismaMock.booking.count.mockResolvedValue(0);
      prismaMock.rateCard.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/bookings?role=talent",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(prismaMock.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { creatorId: "creator-1" } }),
      );
    });

    it("?role=client scopes to the caller's own client id", async () => {
      prismaMock.client.findUnique.mockResolvedValue({ id: "client-1", userId: "user-client-1" });
      prismaMock.booking.findMany.mockResolvedValue([]);
      prismaMock.booking.count.mockResolvedValue(0);
      prismaMock.rateCard.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/bookings?role=client",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(prismaMock.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clientId: "client-1" } }),
      );
    });

    it("computes client amount as base+clientFee and formats it", async () => {
      const baseAmount = 4_500_000;
      const fees = computeFees(baseAmount);
      prismaMock.client.findUnique.mockResolvedValue({ id: "client-1", userId: "user-client-1" });
      prismaMock.booking.findMany.mockResolvedValue([
        {
          id: "b1",
          baseAmount,
          clientFeeAmount: fees.clientFee,
          talentFeeAmount: fees.talentFee,
          currency: "NGN",
          state: "PENDING_PAYMENT",
          rateCardId: "rc-1",
          slotDate: new Date("2026-08-01"),
          creator: { name: "Adaeze Obi" },
          client: { name: "Ngozi Balogun" },
        },
      ]);
      prismaMock.booking.count.mockResolvedValue(1);
      prismaMock.rateCard.findMany.mockResolvedValue([{ id: "rc-1", serviceTitle: "Voice-Over Session" }]);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/bookings?role=client",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      });

      const order = response.json().data[0];
      expect(order.counterpart).toBe("Adaeze Obi");
      expect(order.project).toBe("Voice-Over Session");
      expect(order.amount).toBe(`₦${((baseAmount + fees.clientFee) / 100).toLocaleString("en-US")}`);
      expect(order.phase).toBe("Briefing");
    });
  });

  describe("GET /bookings/:id — participant-scoping", () => {
    it("returns 403 for a talent who isn't a participant in the booking", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        creator: { userId: "user-talent-1" },
        client: { userId: "user-client-1" },
        rateCardId: "rc-1",
        baseAmount: 1000,
        clientFeeAmount: 150,
        talentFeeAmount: 110,
        currency: "NGN",
        state: "PENDING_PAYMENT",
        slotDate: new Date(),
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/bookings/b1",
        headers: { authorization: `Bearer ${OTHER_TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it("returns 200 for the actual talent participant", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        creator: { userId: "user-talent-1", name: "Elias Thorne" },
        client: { userId: "user-client-1", name: "Brand Agency NG" },
        rateCardId: "rc-1",
        baseAmount: 1000,
        clientFeeAmount: 150,
        talentFeeAmount: 110,
        currency: "NGN",
        state: "PENDING_PAYMENT",
        slotDate: new Date(),
      });
      prismaMock.rateCard.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/bookings/b1",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().counterpart).toBe("Brand Agency NG");
    });
  });

  describe("PATCH /bookings/:id/cancel", () => {
    it("cancels a PENDING_PAYMENT booking for a participant", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        state: "PENDING_PAYMENT",
        creator: { userId: "user-talent-1" },
        client: { userId: "user-client-1" },
      });
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({ id: "b1", state: "PENDING_PAYMENT" });
      prismaMock.booking.update.mockResolvedValue({ id: "b1", state: "CANCELLED" });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/bookings/b1/cancel",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().state).toBe("CANCELLED");
    });

    it("rejects cancelling a booking that's already PAYMENT_RELEASED (illegal transition)", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        state: "PAYMENT_RELEASED",
        creator: { userId: "user-talent-1" },
        client: { userId: "user-client-1" },
      });
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({ id: "b1", state: "PAYMENT_RELEASED" });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/bookings/b1/cancel",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(409);
      expect(prismaMock.booking.update).not.toHaveBeenCalled();
    });

    it("returns 403 for a non-participant", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        state: "PENDING_PAYMENT",
        creator: { userId: "user-talent-1" },
        client: { userId: "user-client-1" },
      });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/bookings/b1/cancel",
        headers: { authorization: `Bearer ${OTHER_TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(403);
      expect(prismaMock.booking.update).not.toHaveBeenCalled();
    });
  });

  describe("POST /bookings/:id/pay", () => {
    it("client initiates escrow and gets a checkout URL back", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        creator: { userId: "user-talent-1" },
        client: { userId: "user-client-1" },
      });
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({
        id: "b1",
        state: "PENDING_PAYMENT",
        baseAmount: 1000,
        clientFeeAmount: 150,
        currency: "NGN",
        payment: null,
      });
      paymentProviderMock.initEscrow.mockResolvedValue({ ref: "ref-1", checkoutUrl: "https://pay/1" });
      prismaMock.payment.create.mockResolvedValue({ id: "p1", status: "INITIATED", providerRef: "ref-1" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/bookings/b1/pay",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().checkoutUrl).toBe("https://pay/1");
    });

    it("rejects a non-client-participant (e.g. the talent) from initiating payment", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        creator: { userId: "user-talent-1" },
        client: { userId: "user-client-1" },
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/bookings/b1/pay",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(403);
      expect(paymentProviderMock.initEscrow).not.toHaveBeenCalled();
    });

    it("409s when the booking isn't payable (already past PENDING_PAYMENT)", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        creator: { userId: "user-talent-1" },
        client: { userId: "user-client-1" },
      });
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({ id: "b1", state: "ESCROW_LOCKED", payment: null });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/bookings/b1/pay",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(409);
      expect(paymentProviderMock.initEscrow).not.toHaveBeenCalled();
    });

    it("Authority: a successful /pay call alone never sets ESCROW_LOCKED — booking.update is never called by this route", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        creator: { userId: "user-talent-1" },
        client: { userId: "user-client-1" },
      });
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({
        id: "b1",
        state: "PENDING_PAYMENT",
        baseAmount: 1000,
        clientFeeAmount: 150,
        currency: "NGN",
        payment: null,
      });
      paymentProviderMock.initEscrow.mockResolvedValue({ ref: "ref-1", checkoutUrl: "https://pay/1" });
      prismaMock.payment.create.mockResolvedValue({ id: "p1", status: "INITIATED", providerRef: "ref-1" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/bookings/b1/pay",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(prismaMock.booking.update).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /bookings/:id/deliver", () => {
    it("talent marks deliverables provided", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        state: "ESCROW_LOCKED",
        creator: { userId: "user-talent-1" },
        client: { userId: "user-client-1" },
      });
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({ id: "b1", state: "ESCROW_LOCKED" });
      prismaMock.booking.update.mockResolvedValue({ id: "b1", state: "DELIVERABLES_PROVIDED" });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/bookings/b1/deliver",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().state).toBe("DELIVERABLES_PROVIDED");
    });

    it("features.md Phase 9: notifies the client in-app and by email that deliverables are ready", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        state: "ESCROW_LOCKED",
        creator: { userId: "user-talent-1" },
        client: { userId: "user-client-1" },
      });
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({ id: "b1", state: "ESCROW_LOCKED" });
      prismaMock.booking.update.mockResolvedValue({ id: "b1", state: "DELIVERABLES_PROVIDED" });

      await app.inject({
        method: "PATCH",
        url: "/api/v1/bookings/b1/deliver",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(notifyProviderMock.inApp).toHaveBeenCalledWith(
        "user-client-1",
        expect.objectContaining({ kind: "deliverables_provided", bookingId: "b1" }),
      );
      expect(enqueueEmailNotificationMock).toHaveBeenCalledWith("user-client-1", "deliverables_provided", {
        bookingId: "b1",
      });
    });

    it("rejects the client from marking deliverables provided", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        state: "ESCROW_LOCKED",
        creator: { userId: "user-talent-1" },
        client: { userId: "user-client-1" },
      });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/bookings/b1/deliver",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("PATCH /bookings/:id/approve", () => {
    it("client approves and escrow releases with correct fee split", async () => {
      const baseAmount = 4_500_000;
      const fees = computeFees(baseAmount);
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        creator: { userId: "user-talent-1" },
        client: { userId: "user-client-1" },
      });
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({
        id: "b1",
        state: "DELIVERABLES_PROVIDED",
        baseAmount,
        talentFeeAmount: fees.talentFee,
        currency: "NGN",
        payment: { id: "p1", status: "ESCROW_HELD", providerRef: "ref-1" },
        creator: { userId: "user-talent-1" },
        client: { userId: "user-client-1" },
      });
      prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
      paymentProviderMock.releaseFunds.mockResolvedValue(undefined);
      prismaMock.$transaction.mockResolvedValue([{ id: "p1", status: "RELEASED" }, { id: "b1", state: "PAYMENT_RELEASED" }]);

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/bookings/b1/approve",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(paymentProviderMock.releaseFunds).toHaveBeenCalledWith("ref-1", baseAmount - fees.talentFee, "NGN");
    });

    it("409s approving a booking still in ESCROW_LOCKED (deliverables not yet provided)", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        creator: { userId: "user-talent-1" },
        client: { userId: "user-client-1" },
      });
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({
        id: "b1",
        state: "ESCROW_LOCKED",
        payment: { id: "p1", status: "ESCROW_HELD" },
      });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/bookings/b1/approve",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(409);
      expect(paymentProviderMock.releaseFunds).not.toHaveBeenCalled();
    });

    it("rejects the talent from approving their own booking", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        creator: { userId: "user-talent-1" },
        client: { userId: "user-client-1" },
      });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/bookings/b1/approve",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("PATCH /bookings/:id/dispute + POST /bookings/:id/refund", () => {
    it("either participant can raise a dispute", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        state: "ESCROW_LOCKED",
        creator: { userId: "user-talent-1" },
        client: { userId: "user-client-1" },
      });
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({ id: "b1", state: "ESCROW_LOCKED" });
      prismaMock.booking.update.mockResolvedValue({ id: "b1", state: "DISPUTED" });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/bookings/b1/dispute",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().state).toBe("DISPUTED");
    });

    it("refunds a disputed booking back to the client", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        creator: { userId: "user-talent-1" },
        client: { userId: "user-client-1" },
      });
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({
        id: "b1",
        state: "DISPUTED",
        payment: { id: "p1", status: "ESCROW_HELD", providerRef: "ref-1" },
        creator: { userId: "user-talent-1" },
        client: { userId: "user-client-1" },
      });
      prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
      paymentProviderMock.refund.mockResolvedValue(undefined);
      prismaMock.$transaction.mockResolvedValue([{ id: "p1", status: "REFUNDED" }, { id: "b1", state: "CANCELLED" }]);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/bookings/b1/refund",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(paymentProviderMock.refund).toHaveBeenCalledWith("ref-1");
    });

    it("409s refunding a booking that isn't DISPUTED", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        creator: { userId: "user-talent-1" },
        client: { userId: "user-client-1" },
      });
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({ id: "b1", state: "ESCROW_LOCKED", payment: null });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/bookings/b1/refund",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(409);
      expect(paymentProviderMock.refund).not.toHaveBeenCalled();
    });

    it("returns 403 for a non-participant trying to dispute", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        state: "ESCROW_LOCKED",
        creator: { userId: "user-talent-1" },
        client: { userId: "user-client-1" },
      });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/bookings/b1/dispute",
        headers: { authorization: `Bearer ${OTHER_TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(403);
      expect(prismaMock.booking.update).not.toHaveBeenCalled();
    });
  });
});
