import { adminRoPrisma } from "../db/adminRoClient.js";
import { prisma as defaultPrisma } from "../db/client.js";

export type MismatchType =
  | "PAYMENT_ESCROW_HELD_BOOKING_NOT_LOCKED"
  | "BOOKING_ESCROW_LOCKED_NO_HELD_PAYMENT"
  | "PAYMENT_FAILED_BOOKING_NOT_CANCELLED"
  | "WEBHOOK_MISSING_AFTER_INITIATED"
  | "PAYMENT_RELEASED_BOOKING_NOT_RELEASED";

export interface MismatchRecord {
  type: MismatchType;
  severity: "CRITICAL" | "WARNING";
  paymentId?: string | null;
  bookingId?: string | null;
  amount?: number | null;
  currency?: string | null;
  description: string;
  detectedAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * 1. Payment ESCROW_HELD while Booking is not ESCROW_LOCKED.
 * Offending condition: Payment has status ESCROW_HELD or escrowHeld = true,
 * but booking state is not ESCROW_LOCKED, DELIVERABLES_PROVIDED, or DISPUTED.
 */
export async function detectPaymentEscrowHeldBookingNotLocked(
  dbClient: any = adminRoPrisma || defaultPrisma
): Promise<MismatchRecord[]> {
  const payments = await dbClient.payment.findMany({
    where: {
      OR: [{ status: "ESCROW_HELD" }, { escrowHeld: true }],
      booking: {
        state: {
          notIn: ["ESCROW_LOCKED", "DELIVERABLES_PROVIDED", "DISPUTED"],
        },
      },
    },
    include: {
      booking: {
        select: { id: true, state: true, currency: true, baseAmount: true },
      },
    },
  });

  return payments.map((p: any) => ({
    type: "PAYMENT_ESCROW_HELD_BOOKING_NOT_LOCKED",
    severity: "CRITICAL",
    paymentId: p.id,
    bookingId: p.booking?.id || p.bookingId,
    amount: p.amount,
    currency: p.currency,
    description: `Payment ${p.id} is in status ${p.status} (escrowHeld: ${p.escrowHeld}), but Booking ${p.bookingId} is in state ${p.booking?.state || "UNKNOWN"}.`,
    detectedAt: new Date().toISOString(),
    metadata: {
      paymentStatus: p.status,
      escrowHeld: p.escrowHeld,
      bookingState: p.booking?.state,
    },
  }));
}

/**
 * 2. Booking ESCROW_LOCKED with no held Payment.
 * Offending condition: Booking has state ESCROW_LOCKED, but has no payment
 * or payment status is not ESCROW_HELD and escrowHeld is false.
 */
export async function detectBookingEscrowLockedNoHeldPayment(
  dbClient: any = adminRoPrisma || defaultPrisma
): Promise<MismatchRecord[]> {
  const bookings = await dbClient.booking.findMany({
    where: {
      state: "ESCROW_LOCKED",
      OR: [
        { payment: null },
        {
          payment: {
            status: { not: "ESCROW_HELD" },
            escrowHeld: false,
          },
        },
      ],
    },
    include: {
      payment: {
        select: { id: true, status: true, escrowHeld: true, amount: true, currency: true },
      },
    },
  });

  return bookings.map((b: any) => ({
    type: "BOOKING_ESCROW_LOCKED_NO_HELD_PAYMENT",
    severity: "CRITICAL",
    paymentId: b.payment?.id || null,
    bookingId: b.id,
    amount: b.baseAmount,
    currency: b.currency,
    description: `Booking ${b.id} is ESCROW_LOCKED, but payment is ${
      b.payment ? `in status ${b.payment.status} with escrowHeld=${b.payment.escrowHeld}` : "MISSING"
    }.`,
    detectedAt: new Date().toISOString(),
    metadata: {
      bookingState: b.state,
      paymentId: b.payment?.id || null,
      paymentStatus: b.payment?.status || null,
    },
  }));
}

/**
 * 3. Payment FAILED with Booking not CANCELLED after the hold.
 * Offending condition: Payment has status FAILED, but booking is not CANCELLED.
 */
export async function detectPaymentFailedBookingNotCancelled(
  dbClient: any = adminRoPrisma || defaultPrisma
): Promise<MismatchRecord[]> {
  const payments = await dbClient.payment.findMany({
    where: {
      status: "FAILED",
      booking: {
        state: { not: "CANCELLED" },
      },
    },
    include: {
      booking: {
        select: { id: true, state: true, currency: true, baseAmount: true },
      },
    },
  });

  return payments.map((p: any) => ({
    type: "PAYMENT_FAILED_BOOKING_NOT_CANCELLED",
    severity: "CRITICAL",
    paymentId: p.id,
    bookingId: p.booking?.id || p.bookingId,
    amount: p.amount,
    currency: p.currency,
    description: `Payment ${p.id} failed, but Booking ${p.bookingId} is still in state ${p.booking?.state || "UNKNOWN"} instead of CANCELLED.`,
    detectedAt: new Date().toISOString(),
    metadata: {
      paymentStatus: p.status,
      bookingState: p.booking?.state,
    },
  }));
}

/**
 * 4. Webhook missing 15 minutes after payment initiated.
 * Offending condition: Payment is in status INITIATED, created over 15 minutes ago,
 * and has received zero PaymentEvent webhook rows.
 */
export async function detectWebhookMissingAfterInitiated(
  dbClient: any = adminRoPrisma || defaultPrisma,
  windowMinutes: number = 15,
  now: Date = new Date()
): Promise<MismatchRecord[]> {
  const cutoff = new Date(now.getTime() - windowMinutes * 60 * 1000);

  const payments = await dbClient.payment.findMany({
    where: {
      status: "INITIATED",
      createdAt: { lte: cutoff },
      events: { none: {} },
    },
    include: {
      booking: {
        select: { id: true, state: true, currency: true },
      },
    },
  });

  return payments.map((p: any) => ({
    type: "WEBHOOK_MISSING_AFTER_INITIATED",
    severity: "WARNING",
    paymentId: p.id,
    bookingId: p.booking?.id || p.bookingId,
    amount: p.amount,
    currency: p.currency,
    description: `Payment ${p.id} was initiated ${Math.round(
      (now.getTime() - new Date(p.createdAt).getTime()) / 60000
    )} minutes ago with no webhook received from provider (${p.provider}).`,
    detectedAt: new Date().toISOString(),
    metadata: {
      provider: p.provider,
      providerRef: p.providerRef,
      createdAt: p.createdAt,
    },
  }));
}

/**
 * 5. Payment RELEASED while Booking is not PAYMENT_RELEASED.
 * Offending condition: Payment has status RELEASED, but booking state is not PAYMENT_RELEASED.
 */
export async function detectPaymentReleasedBookingNotReleased(
  dbClient: any = adminRoPrisma || defaultPrisma
): Promise<MismatchRecord[]> {
  const payments = await dbClient.payment.findMany({
    where: {
      status: "RELEASED",
      booking: {
        state: { not: "PAYMENT_RELEASED" },
      },
    },
    include: {
      booking: {
        select: { id: true, state: true, currency: true, baseAmount: true },
      },
    },
  });

  return payments.map((p: any) => ({
    type: "PAYMENT_RELEASED_BOOKING_NOT_RELEASED",
    severity: "CRITICAL",
    paymentId: p.id,
    bookingId: p.booking?.id || p.bookingId,
    amount: p.amount,
    currency: p.currency,
    description: `Payment ${p.id} is RELEASED, but Booking ${p.bookingId} is in state ${p.booking?.state || "UNKNOWN"} instead of PAYMENT_RELEASED.`,
    detectedAt: new Date().toISOString(),
    metadata: {
      paymentStatus: p.status,
      bookingState: p.booking?.state,
    },
  }));
}

/**
 * Runs all mismatch detectors and aggregates results.
 * Shared and reused by Phase A12 background alerts.
 */
export async function runAllFinanceMismatchDetectors(
  dbClient: any = adminRoPrisma || defaultPrisma,
  options?: { now?: Date; webhookWindowMinutes?: number }
): Promise<MismatchRecord[]> {
  const [m1, m2, m3, m4, m5] = await Promise.all([
    detectPaymentEscrowHeldBookingNotLocked(dbClient),
    detectBookingEscrowLockedNoHeldPayment(dbClient),
    detectPaymentFailedBookingNotCancelled(dbClient),
    detectWebhookMissingAfterInitiated(dbClient, options?.webhookWindowMinutes, options?.now),
    detectPaymentReleasedBookingNotReleased(dbClient),
  ]);

  return [...m1, ...m2, ...m3, ...m4, ...m5];
}

