import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db/client.js";
import { computeFees } from "./fees.js";
import { bookSlot } from "./availability.js";
import { hashPassword } from "./auth.js";
import { SLOT_HOLD_MINUTES } from "../config/slotHold.js";

// The external, logged-out booking flow (features.md Phase 16, FA-5). Reuses the same
// fee computation and slot-claiming machinery services/booking.ts's createBooking does
// — the only real difference is that no Client (and often no User) exists yet when the
// visitor reaches this step.
//
// TODO(conflict:X7): Booking.clientId is a required FK and Phase 16's own schema diff
// doesn't loosen that, so the guest's User+Client row must exist by the time the
// Booking row is created (to hold the slot in PENDING_PAYMENT) — before the payment
// webhook fires. The spec's "account materializes on payment" is honored at the
// UX/surfacing level, not the DB-write level: this function creates the row quietly,
// but nothing surfaces it (no session, no email, login blocked via passwordSet=false)
// until services/payment.ts's webhook handler confirms escrow and issues the
// set-password/magic-link token. This is the only schema-faithful design available.

export class GuestCheckoutEmailConflictError extends Error {
  constructor(email: string) {
    super(`Email "${email}" is already registered as a talent account — log in to book instead`);
    this.name = "GuestCheckoutEmailConflictError";
  }
}

export interface CreateExternalBookingInput {
  creatorId: string;
  rateCardId: string;
  baseAmount: number;
  currency: string;
  slotDate: Date;
  slotStart: string;
  slotEnd: string;
  contextNote?: string;
  name: string;
  email: string;
}

export interface CreateExternalBookingResult {
  booking: Awaited<ReturnType<typeof prisma.booking.create>>;
  isNewAccount: boolean;
}

/** Finds-or-creates the guest's Client row inside the caller's transaction. Existing
 * CLIENT email → reused, no duplicate. Existing TALENT-only email → conflict (they
 * should log in, not guest-checkout under the same address). No match → a fresh
 * AUTO_CHECKOUT User+Client, passwordSet=false until the post-payment set-password
 * flow (routes/auth.ts's reset-password, reused) flips it. */
async function resolveOrCreateGuestClient(
  tx: Prisma.TransactionClient,
  email: string,
  name: string,
): Promise<{ clientId: string; isNewAccount: boolean }> {
  const existing = await tx.user.findUnique({ where: { email }, include: { client: true } });

  if (existing) {
    if (!existing.client) {
      throw new GuestCheckoutEmailConflictError(email);
    }
    return { clientId: existing.client.id, isNewAccount: false };
  }

  // Never-communicated random password — passwordSet:false is the real login gate
  // (routes/auth.ts), this is belt-and-suspenders, same idiom as auth.ts's DUMMY_HASH.
  const passwordHash = await hashPassword(randomUUID());
  const user = await tx.user.create({
    data: {
      email,
      passwordHash,
      userType: "CLIENT",
      accountOrigin: "AUTO_CHECKOUT",
      passwordSet: false,
      client: { create: { name, location: "" } },
    },
    include: { client: true },
  });

  return { clientId: user.client!.id, isNewAccount: true };
}

export async function createExternalBooking(
  input: CreateExternalBookingInput,
): Promise<CreateExternalBookingResult> {
  const { talentFee, clientFee } = computeFees(input.baseAmount);

  return prisma.$transaction(async (tx) => {
    const { clientId, isNewAccount } = await resolveOrCreateGuestClient(tx, input.email, input.name);

    const slotHoldExpiresAt = new Date(Date.now() + SLOT_HOLD_MINUTES * 60 * 1000);

    const booking = await tx.booking.create({
      data: {
        creatorId: input.creatorId,
        clientId,
        rateCardId: input.rateCardId,
        baseAmount: input.baseAmount,
        currency: input.currency,
        talentFeeAmount: talentFee,
        clientFeeAmount: clientFee,
        slotDate: input.slotDate,
        slotStart: input.slotStart,
        slotEnd: input.slotEnd,
        state: "PENDING_PAYMENT",
        origin: "PUBLIC_LINK",
        contextNote: input.contextNote,
        slotHoldExpiresAt,
        orderRoom: { create: {} },
      },
    });

    await bookSlot(tx, {
      creatorId: input.creatorId,
      date: input.slotDate,
      slotStart: input.slotStart,
      slotEnd: input.slotEnd,
      bookingId: booking.id,
    });

    return { booking, isNewAccount };
  });
}
