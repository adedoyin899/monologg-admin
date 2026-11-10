import { STUCK_THRESHOLDS, MS_PER_DAY, MS_PER_MINUTE } from "../config/stuckRules.js";

export type StuckRuleKey =
  | "PENDING_PAYMENT_EXPIRED"
  | "ESCROW_LOCKED_STALE"
  | "DELIVERABLES_UNREVIEWED";

export interface BookingStuckInput {
  id: string;
  state: string;
  createdAt: Date;
  slotHoldExpiresAt?: Date | null;
  updatedAt?: Date | null;
}

export interface StuckEvaluationResult {
  isStuck: boolean;
  reason: string | null;
  ruleKey: StuckRuleKey | null;
  ageInStateMs: number;
  ageInStateSeconds: number;
  ageInStateHuman: string;
}

/**
 * Format milliseconds into a human-readable duration string (e.g. "3d 4h", "2h 15m", "45s")
 */
export function formatAge(ms: number): string {
  if (ms < 0) ms = 0;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const remSec = seconds % 60;
    return remSec > 0 ? `${minutes}m ${remSec}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remMin = minutes % 60;
    return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

/**
 * Evaluates whether a booking is stuck based on PRD M5.1 / AC3 rules:
 * 1. PENDING_PAYMENT past slotHoldExpiresAt (or past 30 min hold window if slotHoldExpiresAt is null)
 * 2. ESCROW_LOCKED over 7 days
 * 3. DELIVERABLES_PROVIDED over 5 days
 *
 * This function is shared and reused across M5 (Bookings API/UI) and M11 (A12 Alerts).
 */
export function evaluateBookingStuck(
  booking: BookingStuckInput,
  options?: {
    stateEnteredAt?: Date | null;
    now?: Date;
  }
): StuckEvaluationResult {
  const now = options?.now || new Date();
  const enteredAt = options?.stateEnteredAt || booking.createdAt;
  const ageInStateMs = Math.max(0, now.getTime() - enteredAt.getTime());
  const ageInStateSeconds = Math.floor(ageInStateMs / 1000);
  const ageInStateHuman = formatAge(ageInStateMs);

  // 1. PENDING_PAYMENT: past slotHoldExpiresAt
  if (booking.state === "PENDING_PAYMENT") {
    if (booking.slotHoldExpiresAt) {
      if (now.getTime() > new Date(booking.slotHoldExpiresAt).getTime()) {
        return {
          isStuck: true,
          reason: "PENDING_PAYMENT past slotHoldExpiresAt",
          ruleKey: "PENDING_PAYMENT_EXPIRED",
          ageInStateMs,
          ageInStateSeconds,
          ageInStateHuman,
        };
      }
    } else {
      // Internal bookings without explicit slotHoldExpiresAt
      const defaultHoldMs = STUCK_THRESHOLDS.PENDING_PAYMENT_DEFAULT_HOLD_MINUTES * MS_PER_MINUTE;
      if (ageInStateMs > defaultHoldMs) {
        return {
          isStuck: true,
          reason: "PENDING_PAYMENT past default slot hold duration (30 mins)",
          ruleKey: "PENDING_PAYMENT_EXPIRED",
          ageInStateMs,
          ageInStateSeconds,
          ageInStateHuman,
        };
      }
    }
  }

  // 2. ESCROW_LOCKED: over 7 days
  if (booking.state === "ESCROW_LOCKED") {
    const maxMs = STUCK_THRESHOLDS.ESCROW_LOCKED_MAX_DAYS * MS_PER_DAY;
    if (ageInStateMs > maxMs) {
      return {
        isStuck: true,
        reason: "ESCROW_LOCKED over 7 days",
        ruleKey: "ESCROW_LOCKED_STALE",
        ageInStateMs,
        ageInStateSeconds,
        ageInStateHuman,
      };
    }
  }

  // 3. DELIVERABLES_PROVIDED: over 5 days
  if (booking.state === "DELIVERABLES_PROVIDED") {
    const maxMs = STUCK_THRESHOLDS.DELIVERABLES_PROVIDED_MAX_DAYS * MS_PER_DAY;
    if (ageInStateMs > maxMs) {
      return {
        isStuck: true,
        reason: "DELIVERABLES_PROVIDED over 5 days",
        ruleKey: "DELIVERABLES_UNREVIEWED",
        ageInStateMs,
        ageInStateSeconds,
        ageInStateHuman,
      };
    }
  }

  return {
    isStuck: false,
    reason: null,
    ruleKey: null,
    ageInStateMs,
    ageInStateSeconds,
    ageInStateHuman,
  };
}

/**
 * Convenience boolean check
 */
export function isBookingStuck(
  booking: BookingStuckInput,
  options?: { stateEnteredAt?: Date | null; now?: Date }
): boolean {
  return evaluateBookingStuck(booking, options).isStuck;
}

