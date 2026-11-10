import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/client.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    booking: {
      create: vi.fn(),
    },
    // features.md Phase 13: createExternalBooking claims the slot atomically via
    // services/availability.ts's bookSlot inside the same transaction — same
    // always-open-day mocking convention as services/booking.test.ts.
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
import { createExternalBooking, GuestCheckoutEmailConflictError } from "./externalBooking.js";
import { computeFees } from "./fees.js";
import { SlotUnavailableError } from "./availability.js";

const prismaMock = prisma as any;

const BASE_INPUT = {
  creatorId: "creator-1",
  rateCardId: "rc-1",
  baseAmount: 100_000,
  currency: "NGN",
  slotDate: new Date("2026-08-10"),
  slotStart: "10:00",
  slotEnd: "11:00",
  name: "Guest Visitor",
  email: "guest@example.com",
};

describe("services/externalBooking (features.md Phase 16, FA-5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.availabilityBlock.findFirst.mockResolvedValue(null);
    prismaMock.availabilityBlock.findMany.mockResolvedValue([]);
    prismaMock.booking.create.mockResolvedValue({ id: "booking-1", state: "PENDING_PAYMENT" });
  });

  it("a brand-new email creates an AUTO_CHECKOUT User+Client with passwordSet:false", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "new-user-1", client: { id: "new-client-1" } });

    const { booking, isNewAccount } = await createExternalBooking(BASE_INPUT);

    expect(isNewAccount).toBe(true);
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "guest@example.com",
          userType: "CLIENT",
          accountOrigin: "AUTO_CHECKOUT",
          passwordSet: false,
          client: { create: { name: "Guest Visitor", location: "" } },
        }),
      }),
    );
    expect(booking.id).toBe("booking-1");
    expect(prismaMock.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: "new-client-1",
          origin: "PUBLIC_LINK",
          state: "PENDING_PAYMENT",
          slotHoldExpiresAt: expect.any(Date),
          orderRoom: { create: {} },
        }),
      }),
    );
  });

  it("computes fee amounts exactly equal to computeFees() output, same as the authenticated path", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "new-user-1", client: { id: "new-client-1" } });

    await createExternalBooking(BASE_INPUT);

    const expected = computeFees(BASE_INPUT.baseAmount);
    expect(prismaMock.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          talentFeeAmount: expected.talentFee,
          clientFeeAmount: expected.clientFee,
        }),
      }),
    );
  });

  it("sets slotHoldExpiresAt roughly SLOT_HOLD_MINUTES (30) from now", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "new-user-1", client: { id: "new-client-1" } });

    const before = Date.now();
    await createExternalBooking(BASE_INPUT);
    const after = Date.now();

    const call = prismaMock.booking.create.mock.calls[0][0];
    const expiresAt = call.data.slotHoldExpiresAt.getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(before + 29 * 60 * 1000);
    expect(expiresAt).toBeLessThanOrEqual(after + 31 * 60 * 1000);
  });

  it("an existing CLIENT email attaches to that account — no duplicate User row", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "existing-user-1",
      userType: "CLIENT",
      client: { id: "existing-client-1" },
    });

    const { isNewAccount } = await createExternalBooking(BASE_INPUT);

    expect(isNewAccount).toBe(false);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ clientId: "existing-client-1" }) }),
    );
  });

  it("an existing TALENT-only email is a conflict, not silently reused", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "talent-user-1",
      userType: "TALENT",
      client: null,
    });

    await expect(createExternalBooking(BASE_INPUT)).rejects.toThrow(GuestCheckoutEmailConflictError);
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
  });

  it("propagates SlotUnavailableError when the slot isn't actually open server-side", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "new-user-1", client: { id: "new-client-1" } });
    prismaMock.availabilityBlock.findFirst.mockResolvedValue({
      id: "block-1",
      slots: [{ start: "10:00", end: "11:00", state: "unavailable" }],
    });

    await expect(createExternalBooking(BASE_INPUT)).rejects.toThrow(SlotUnavailableError);
  });
});
