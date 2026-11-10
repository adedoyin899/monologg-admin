import type { BookingState } from "@prisma/client";
import { prisma } from "../db/client.js";
import { computeFees } from "./fees.js";
import { bookSlot } from "./availability.js";
import { track } from "../lib/analytics/index.js";

// The booking state machine (features.md Phase 5): the single place that decides
// which BookingState transitions are legal. Nothing outside this file should
// mutate Booking.state directly.
//
// PENDING_PAYMENT ──▶ ESCROW_LOCKED ──▶ DELIVERABLES_PROVIDED ──▶ PAYMENT_RELEASED
//        │                   │                    │
//        └──────────────▶ CANCELLED          DISPUTED ◀───────────┘
//
// Only PENDING_PAYMENT → CANCELLED has a route in this phase (a client can cancel
// before paying). ESCROW_LOCKED (Phase 6, real payment) and everything after it
// are triggered by later phases' own machinery (webhooks, delivery/dispute flows) —
// but the full legal-transition graph is defined and rejected-on-violation here now,
// per this phase's own guardrail ("illegal transitions rejected").
const LEGAL_TRANSITIONS: Record<BookingState, BookingState[]> = {
  PENDING_PAYMENT: ["ESCROW_LOCKED", "CANCELLED"],
  ESCROW_LOCKED: ["DELIVERABLES_PROVIDED", "DISPUTED", "CANCELLED"],
  DELIVERABLES_PROVIDED: ["PAYMENT_RELEASED", "DISPUTED"],
  PAYMENT_RELEASED: [],
  CANCELLED: [],
  DISPUTED: ["PAYMENT_RELEASED", "CANCELLED"],
};

export class IllegalBookingTransitionError extends Error {
  constructor(from: BookingState, to: BookingState) {
    super(`Illegal booking state transition: ${from} → ${to}`);
    this.name = "IllegalBookingTransitionError";
  }
}

export function assertLegalTransition(from: BookingState, to: BookingState): void {
  if (!LEGAL_TRANSITIONS[from]?.includes(to)) {
    throw new IllegalBookingTransitionError(from, to);
  }
}

export interface CreateBookingInput {
  creatorId: string;
  clientId: string;
  rateCardId: string;
  baseAmount: number;
  currency: string;
  slotDate: Date;
  slotStart: string;
  slotEnd: string;
}

/** Creates a booking in PENDING_PAYMENT with fees derived from PLATFORM_FEES — never
 * from a client-supplied value (fees are always server-computed, features.md guardrail).
 * Also creates the booking's OrderRoom (1:1) so participants can message immediately,
 * even before payment — matches the seed data's shape (every booking has one).
 *
 * features.md Phase 13: the requested slot is claimed atomically in the same
 * transaction via services/availability.ts's bookSlot — if the slot isn't
 * actually open server-side (SlotUnavailableError), the whole transaction
 * rolls back and no booking is created. This is what makes double-booking
 * impossible under concurrency: two simultaneous requests for the same
 * creator+day serialize on bookSlot's advisory lock, and only the first to
 * commit sees the slot as open. */
export async function createBooking(input: CreateBookingInput) {
  const { talentFee, clientFee } = computeFees(input.baseAmount);

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({
      data: {
        creatorId: input.creatorId,
        clientId: input.clientId,
        rateCardId: input.rateCardId,
        baseAmount: input.baseAmount,
        currency: input.currency,
        talentFeeAmount: talentFee,
        clientFeeAmount: clientFee,
        slotDate: input.slotDate,
        slotStart: input.slotStart,
        slotEnd: input.slotEnd,
        state: "PENDING_PAYMENT",
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

    return booking;
  });
}

/** Transitions a booking to `to`, throwing IllegalBookingTransitionError if the move
 * isn't legal from its current state. Emits booking_state_changed domain event. */
export async function transitionBooking(bookingId: string, to: BookingState, origin: string = "system") {
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
  assertLegalTransition(booking.state, to);
  const updated = await prisma.booking.update({ where: { id: bookingId }, data: { state: to } });

  void track(
    "booking_state_changed",
    {
      bookingId: updated.id,
      from: booking.state,
      to: updated.state,
      currency: updated.currency,
      amountMinor: updated.baseAmount,
      origin,
    },
    {
      actor: "SYSTEM",
      source: "API",
    },
  ).catch(() => {});

  return updated;
}
