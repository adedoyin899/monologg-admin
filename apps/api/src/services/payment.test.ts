import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/client.js", () => ({
  prisma: {
    booking: { findUniqueOrThrow: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    payment: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    paymentEvent: { create: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

// Phase 8: processPaystackWebhookEvent best-effort-triggers Meet creation on
// escrow lock. Mocked here (not exercised) — services/calendar.test.ts owns
// createMeetForBooking's own behavior; these tests only need to know it's
// called, not re-verify its internals with unrelated mocked Prisma state.
vi.mock("./calendar.js", () => ({
  createMeetForBooking: vi.fn().mockResolvedValue(null),
}));

vi.mock("../providers/index.js", () => ({
  paymentProvider: {
    initEscrow: vi.fn(),
    holdFunds: vi.fn(),
    releaseFunds: vi.fn(),
    refund: vi.fn(),
    verifyWebhook: vi.fn(),
  },
  notifyProvider: {
    email: vi.fn(),
    sms: vi.fn(),
    inApp: vi.fn(),
  },
}));

import { prisma } from "../db/client.js";
import { paymentProvider, notifyProvider } from "../providers/index.js";
import { createMeetForBooking } from "./calendar.js";
import { computeFees } from "./fees.js";
import { IllegalBookingTransitionError } from "./booking.js";
import {
  initEscrowForBooking,
  processPaystackWebhookEvent,
  releaseEscrowForBooking,
  refundEscrowForBooking,
  BookingNotPayableError,
} from "./payment.js";

const prismaMock = prisma as any;
const paymentProviderMock = paymentProvider as any;
const notifyProviderMock = notifyProvider as any;
const createMeetForBookingMock = createMeetForBooking as any;

describe("Payment / escrow service (features.md Phase 6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifyProviderMock.inApp.mockResolvedValue(undefined);
    notifyProviderMock.email.mockResolvedValue(undefined);
    notifyProviderMock.sms.mockResolvedValue(undefined);
  });

  describe("initEscrowForBooking — fee/ledger math", () => {
    it("charges the client base+clientFee total (computeFees output), not a client-supplied value", async () => {
      const baseAmount = 4_500_000;
      const fees = computeFees(baseAmount);

      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({
        id: "b1",
        state: "PENDING_PAYMENT",
        baseAmount,
        clientFeeAmount: fees.clientFee,
        talentFeeAmount: fees.talentFee,
        currency: "NGN",
        payment: null,
      });
      paymentProviderMock.initEscrow.mockResolvedValue({ ref: "ref-1", checkoutUrl: "https://pay/1" });
      prismaMock.payment.create.mockResolvedValue({ id: "p1", status: "INITIATED", providerRef: "ref-1" });

      await initEscrowForBooking("b1");

      expect(paymentProviderMock.initEscrow).toHaveBeenCalledWith("b1", baseAmount + fees.clientFee, "NGN");
      expect(prismaMock.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ amount: baseAmount + fees.clientFee, status: "INITIATED" }) }),
      );
    });

    it("rejects paying a booking that isn't PENDING_PAYMENT", async () => {
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({ id: "b1", state: "ESCROW_LOCKED", payment: null });

      await expect(initEscrowForBooking("b1")).rejects.toThrow(BookingNotPayableError);
      expect(paymentProviderMock.initEscrow).not.toHaveBeenCalled();
    });

    it("rejects paying again once a payment has moved past INITIATED", async () => {
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({
        id: "b1",
        state: "PENDING_PAYMENT",
        baseAmount: 1000,
        clientFeeAmount: 150,
        currency: "NGN",
        payment: { id: "p1", status: "ESCROW_HELD" },
      });

      await expect(initEscrowForBooking("b1")).rejects.toThrow(BookingNotPayableError);
      expect(paymentProviderMock.initEscrow).not.toHaveBeenCalled();
    });

    it("allows retrying pay while still INITIATED (safe retry, e.g. expired checkout link)", async () => {
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({
        id: "b1",
        state: "PENDING_PAYMENT",
        baseAmount: 1000,
        clientFeeAmount: 150,
        currency: "NGN",
        payment: { id: "p1", status: "INITIATED" },
      });
      paymentProviderMock.initEscrow.mockResolvedValue({ ref: "ref-2", checkoutUrl: "https://pay/2" });
      prismaMock.payment.update.mockResolvedValue({ id: "p1", status: "INITIATED", providerRef: "ref-2" });

      const { checkoutUrl } = await initEscrowForBooking("b1");

      expect(checkoutUrl).toBe("https://pay/2");
      expect(prismaMock.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { bookingId: "b1" } }),
      );
      expect(prismaMock.payment.create).not.toHaveBeenCalled();
    });
  });

  describe("processPaystackWebhookEvent — authority + idempotency", () => {
    const payload = { event: "charge.success", data: { id: 999, reference: "ref-1", status: "success" } };

    it("ignores an event for a reference we don't have a Payment for", async () => {
      prismaMock.payment.findUnique.mockResolvedValue(null);

      const result = await processPaystackWebhookEvent(payload);

      expect(result.processed).toBe(false);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("on charge.success: moves Payment to ESCROW_HELD and Booking to ESCROW_LOCKED", async () => {
      prismaMock.payment.findUnique.mockResolvedValue({ id: "p1", bookingId: "b1", status: "INITIATED" });
      prismaMock.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          paymentEvent: { create: vi.fn().mockResolvedValue({}) },
          payment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
          booking: { update: vi.fn().mockResolvedValue({}) },
        };
        await fn(tx);
        return tx;
      });
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        creator: { userId: "user-creator" },
        client: { userId: "user-client" },
      });
      paymentProviderMock.holdFunds.mockResolvedValue(undefined);

      const result = await processPaystackWebhookEvent(payload);

      expect(result.processed).toBe(true);
      expect(paymentProviderMock.holdFunds).toHaveBeenCalledWith("ref-1");
      expect(notifyProviderMock.inApp).toHaveBeenCalledTimes(2);
      // Phase 8: escrow lock best-effort-triggers Meet link generation.
      expect(createMeetForBookingMock).toHaveBeenCalledWith("b1");
    });

    // features.md Phase 17 (security pen-style test): amount tampering. A forged webhook
    // payload can't change what gets charged/held — processPaystackWebhookEvent never reads
    // payload.data.amount at all; the only amount that ever mattered was server-computed and
    // persisted at initEscrowForBooking time (services/payment.ts, computeFees). Proven here by
    // asserting the escrow-lock update touches only status/escrowHeld, never amount, even when
    // the payload carries a wildly different forged amount.
    it("amount tampering: a forged payload.data.amount is never read or written anywhere", async () => {
      const tamperedPayload = {
        event: "charge.success",
        data: { id: 999, reference: "ref-1", status: "success", amount: 1 }, // forged: real total was e.g. 1,000,000
      };
      prismaMock.payment.findUnique.mockResolvedValue({ id: "p1", bookingId: "b1", status: "INITIATED" });
      let capturedUpdateManyArgs: unknown;
      prismaMock.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          paymentEvent: { create: vi.fn().mockResolvedValue({}) },
          payment: {
            updateMany: vi.fn((args: unknown) => {
              capturedUpdateManyArgs = args;
              return Promise.resolve({ count: 1 });
            }),
          },
          booking: { update: vi.fn().mockResolvedValue({}) },
        };
        await fn(tx);
        return tx;
      });
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        creator: { userId: "user-creator" },
        client: { userId: "user-client" },
      });
      paymentProviderMock.holdFunds.mockResolvedValue(undefined);

      const result = await processPaystackWebhookEvent(tamperedPayload);

      expect(result.processed).toBe(true);
      expect(capturedUpdateManyArgs).toMatchObject({
        data: { status: "ESCROW_HELD", escrowHeld: true },
      });
      expect((capturedUpdateManyArgs as { data: object }).data).not.toHaveProperty("amount");
    });

    it("a createMeetForBooking failure never fails the webhook (best-effort)", async () => {
      prismaMock.payment.findUnique.mockResolvedValue({ id: "p1", bookingId: "b1", status: "INITIATED" });
      prismaMock.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          paymentEvent: { create: vi.fn().mockResolvedValue({}) },
          payment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
          booking: { update: vi.fn().mockResolvedValue({}) },
        };
        await fn(tx);
        return tx;
      });
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        creator: { userId: "user-creator" },
        client: { userId: "user-client" },
      });
      paymentProviderMock.holdFunds.mockResolvedValue(undefined);
      createMeetForBookingMock.mockRejectedValueOnce(new Error("google is down"));

      const result = await processPaystackWebhookEvent(payload);

      expect(result.processed).toBe(true);
    });

    it("Authority: a client-side callback (calling holdFunds/notify directly) never runs — only this function, driven by a verified webhook, does", async () => {
      // There is no code path that lets client input alone reach this function;
      // the only caller is routes/webhooks.ts, gated on paymentProvider.verifyWebhook.
      // This test documents that guarantee at the service boundary: calling with
      // an unresolved reference (as a forged/advisory client callback would look
      // like server-side, since it has no real Payment row) does nothing.
      prismaMock.payment.findUnique.mockResolvedValue(null);

      const result = await processPaystackWebhookEvent({
        event: "charge.success",
        data: { id: 1, reference: "client-forged-ref" },
      });

      expect(result.processed).toBe(false);
      expect(prismaMock.booking.update).not.toHaveBeenCalled();
    });

    it("Idempotency: replaying the same event (unique constraint violation) does not double-process", async () => {
      prismaMock.payment.findUnique.mockResolvedValue({ id: "p1", bookingId: "b1", status: "ESCROW_HELD" });
      const p2002 = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
      prismaMock.$transaction.mockRejectedValue(p2002);

      const result = await processPaystackWebhookEvent(payload);

      expect(result.processed).toBe(false);
      expect(paymentProviderMock.holdFunds).not.toHaveBeenCalled();
      expect(notifyProviderMock.inApp).not.toHaveBeenCalled();
    });

    it("Concurrency: two simultaneous identical webhooks — only one processes", async () => {
      prismaMock.payment.findUnique.mockResolvedValue({ id: "p1", bookingId: "b1", status: "INITIATED" });
      let callCount = 0;
      prismaMock.$transaction.mockImplementation(async (fn: any) => {
        callCount += 1;
        if (callCount === 1) {
          const tx = {
            paymentEvent: { create: vi.fn().mockResolvedValue({}) },
            payment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
            booking: { update: vi.fn().mockResolvedValue({}) },
          };
          await fn(tx);
          return tx;
        }
        throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
      });
      prismaMock.booking.findUnique.mockResolvedValue({
        id: "b1",
        creator: { userId: "user-creator" },
        client: { userId: "user-client" },
      });

      const [first, second] = await Promise.all([
        processPaystackWebhookEvent(payload),
        processPaystackWebhookEvent(payload),
      ]);

      const processedCount = [first, second].filter((r) => r.processed).length;
      expect(processedCount).toBe(1);
    });

    it("propagates non-idempotency database errors instead of swallowing them", async () => {
      prismaMock.payment.findUnique.mockResolvedValue({ id: "p1", bookingId: "b1", status: "INITIATED" });
      prismaMock.$transaction.mockRejectedValue(new Error("connection reset"));

      await expect(processPaystackWebhookEvent(payload)).rejects.toThrow("connection reset");
    });
  });

  describe("releaseEscrowForBooking — release + concurrency", () => {
    it("computes talentNet as base - talentFee and calls releaseFunds with it", async () => {
      const baseAmount = 4_500_000;
      const fees = computeFees(baseAmount);
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({
        id: "b1",
        state: "DELIVERABLES_PROVIDED",
        baseAmount,
        talentFeeAmount: fees.talentFee,
        currency: "NGN",
        payment: { id: "p1", status: "ESCROW_HELD", providerRef: "ref-1" },
        creator: { userId: "user-creator" },
        client: { userId: "user-client" },
      });
      prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
      paymentProviderMock.releaseFunds.mockResolvedValue(undefined);
      prismaMock.$transaction.mockResolvedValue([{ id: "p1", status: "RELEASED" }, { id: "b1", state: "PAYMENT_RELEASED" }]);

      const result = await releaseEscrowForBooking("b1");

      expect(paymentProviderMock.releaseFunds).toHaveBeenCalledWith("ref-1", baseAmount - fees.talentFee, "NGN");
      expect(result.alreadyProcessed).toBe(false);
    });

    it("rejects releasing a booking not in DELIVERABLES_PROVIDED", async () => {
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({
        id: "b1",
        state: "ESCROW_LOCKED",
        payment: { id: "p1", status: "ESCROW_HELD" },
      });

      await expect(releaseEscrowForBooking("b1")).rejects.toThrow(IllegalBookingTransitionError);
      expect(prismaMock.payment.updateMany).not.toHaveBeenCalled();
    });

    it("Concurrency: a second release call sees the atomic claim already taken and no-ops", async () => {
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({
        id: "b1",
        state: "DELIVERABLES_PROVIDED",
        baseAmount: 1000,
        talentFeeAmount: 110,
        currency: "NGN",
        payment: { id: "p1", status: "ESCROW_HELD", providerRef: "ref-1" },
        creator: { userId: "user-creator" },
        client: { userId: "user-client" },
      });
      // Simulate: the claim (updateMany where status=ESCROW_HELD) already lost the race.
      prismaMock.payment.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.payment.findUniqueOrThrow.mockResolvedValue({ id: "p1", status: "RELEASING" });

      const result = await releaseEscrowForBooking("b1");

      expect(result.alreadyProcessed).toBe(true);
      expect(paymentProviderMock.releaseFunds).not.toHaveBeenCalled();
    });

    it("rolls the claim back to ESCROW_HELD if the provider call fails, so a retry is possible", async () => {
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({
        id: "b1",
        state: "DELIVERABLES_PROVIDED",
        baseAmount: 1000,
        talentFeeAmount: 110,
        currency: "NGN",
        payment: { id: "p1", status: "ESCROW_HELD", providerRef: "ref-1" },
        creator: { userId: "user-creator" },
        client: { userId: "user-client" },
      });
      prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
      paymentProviderMock.releaseFunds.mockRejectedValue(new Error("provider down"));

      await expect(releaseEscrowForBooking("b1")).rejects.toThrow("provider down");

      expect(prismaMock.payment.updateMany).toHaveBeenLastCalledWith({
        where: { id: "p1", status: "RELEASING" },
        data: { status: "ESCROW_HELD" },
      });
    });
  });

  describe("refundEscrowForBooking — dispute refund path", () => {
    it("refunds via the provider and moves Payment to REFUNDED, Booking to CANCELLED", async () => {
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({
        id: "b1",
        state: "DISPUTED",
        payment: { id: "p1", status: "ESCROW_HELD", providerRef: "ref-1" },
        creator: { userId: "user-creator" },
        client: { userId: "user-client" },
      });
      prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
      paymentProviderMock.refund.mockResolvedValue(undefined);
      prismaMock.$transaction.mockResolvedValue([{ id: "p1", status: "REFUNDED" }, { id: "b1", state: "CANCELLED" }]);

      const result = await refundEscrowForBooking("b1");

      expect(paymentProviderMock.refund).toHaveBeenCalledWith("ref-1");
      expect(result.alreadyProcessed).toBe(false);
    });

    it("rejects refunding a booking that isn't DISPUTED", async () => {
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({
        id: "b1",
        state: "ESCROW_LOCKED",
        payment: { id: "p1", status: "ESCROW_HELD" },
      });

      await expect(refundEscrowForBooking("b1")).rejects.toThrow(IllegalBookingTransitionError);
      expect(prismaMock.payment.updateMany).not.toHaveBeenCalled();
    });
  });
});
