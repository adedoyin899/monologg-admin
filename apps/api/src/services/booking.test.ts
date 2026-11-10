import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/client.js", () => ({
  prisma: {
    booking: {
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    // features.md Phase 13: createBooking now claims the slot atomically via
    // services/availability.ts's bookSlot inside the same transaction — these
    // mocks let that inner call run against an always-open day by default
    // (no existing block, no calendar connection), same as booking.test.ts's
    // existing happy-path assumption that any requested slot is bookable.
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

import { prisma } from "../db/client.js";
import { createBooking, transitionBooking, assertLegalTransition, IllegalBookingTransitionError } from "./booking.js";
import { computeFees } from "./fees.js";
import { SlotUnavailableError } from "./availability.js";

const prismaMock = prisma as any;

describe("Booking state machine (features.md Phase 5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("assertLegalTransition", () => {
    it("allows every documented legal transition", () => {
      expect(() => assertLegalTransition("PENDING_PAYMENT", "ESCROW_LOCKED")).not.toThrow();
      expect(() => assertLegalTransition("PENDING_PAYMENT", "CANCELLED")).not.toThrow();
      expect(() => assertLegalTransition("ESCROW_LOCKED", "DELIVERABLES_PROVIDED")).not.toThrow();
      expect(() => assertLegalTransition("DELIVERABLES_PROVIDED", "PAYMENT_RELEASED")).not.toThrow();
    });

    it("rejects PENDING_PAYMENT -> PAYMENT_RELEASED directly", () => {
      expect(() => assertLegalTransition("PENDING_PAYMENT", "PAYMENT_RELEASED")).toThrow(
        IllegalBookingTransitionError,
      );
    });

    it("rejects any transition out of a terminal state", () => {
      expect(() => assertLegalTransition("PAYMENT_RELEASED", "CANCELLED")).toThrow(IllegalBookingTransitionError);
      expect(() => assertLegalTransition("CANCELLED", "PENDING_PAYMENT")).toThrow(IllegalBookingTransitionError);
    });
  });

  describe("createBooking", () => {
    it("persists fee amounts exactly equal to computeFees() output, and creates the OrderRoom", async () => {
      const baseAmount = 4_500_000;
      prismaMock.booking.create.mockResolvedValue({ id: "booking-1", baseAmount, state: "PENDING_PAYMENT" });

      await createBooking({
        creatorId: "creator-1",
        clientId: "client-1",
        rateCardId: "rc-1",
        baseAmount,
        currency: "NGN",
        slotDate: new Date("2026-08-01"),
        slotStart: "10:00",
        slotEnd: "12:00",
      });

      const expected = computeFees(baseAmount);
      expect(prismaMock.booking.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          state: "PENDING_PAYMENT",
          talentFeeAmount: expected.talentFee,
          clientFeeAmount: expected.clientFee,
          orderRoom: { create: {} },
        }),
      });
    });

    it("rejects with SlotUnavailableError (and never leaves a booking behind) when the slot isn't actually open server-side", async () => {
      prismaMock.booking.create.mockResolvedValue({ id: "booking-1", baseAmount: 100_000, state: "PENDING_PAYMENT" });
      // An existing block marks this exact range unavailable — the server
      // re-verifies the slot itself rather than trusting the caller's claim.
      prismaMock.availabilityBlock.findFirst.mockResolvedValue({
        id: "block-1",
        slots: [{ start: "10:00", end: "12:00", state: "unavailable" }],
      });

      await expect(
        createBooking({
          creatorId: "creator-1",
          clientId: "client-1",
          rateCardId: "rc-1",
          baseAmount: 100_000,
          currency: "NGN",
          slotDate: new Date("2026-08-01"),
          slotStart: "10:00",
          slotEnd: "12:00",
        }),
      ).rejects.toThrow(SlotUnavailableError);
    });
  });

  describe("transitionBooking", () => {
    it("updates state when the transition is legal", async () => {
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({ id: "b1", state: "PENDING_PAYMENT" });
      prismaMock.booking.update.mockResolvedValue({ id: "b1", state: "CANCELLED" });

      const result = await transitionBooking("b1", "CANCELLED");
      expect(result.state).toBe("CANCELLED");
      expect(prismaMock.booking.update).toHaveBeenCalledWith({ where: { id: "b1" }, data: { state: "CANCELLED" } });
    });

    it("throws and never calls update when the transition is illegal", async () => {
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({ id: "b1", state: "PENDING_PAYMENT" });

      await expect(transitionBooking("b1", "PAYMENT_RELEASED")).rejects.toThrow(IllegalBookingTransitionError);
      expect(prismaMock.booking.update).not.toHaveBeenCalled();
    });
  });
});
