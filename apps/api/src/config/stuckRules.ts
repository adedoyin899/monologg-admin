/**
 * Configuration thresholds for stuck bookings.
 * PRD M5.1 / AC3 & M11.1 / AC3.
 *
 * Rules:
 * - PENDING_PAYMENT past slotHoldExpiresAt (or default hold minutes if slotHoldExpiresAt is null)
 * - ESCROW_LOCKED over 7 days
 * - DELIVERABLES_PROVIDED over 5 days
 *
 * Shared config reused across M5 (Bookings) and M11/A12 (Alerts & Health).
 */

export const STUCK_THRESHOLDS = {
  /** Default hold duration in minutes for PENDING_PAYMENT when slotHoldExpiresAt is null */
  PENDING_PAYMENT_DEFAULT_HOLD_MINUTES: 30,

  /** Max allowed days in ESCROW_LOCKED state before being flagged as stuck */
  ESCROW_LOCKED_MAX_DAYS: 7,

  /** Max allowed days in DELIVERABLES_PROVIDED state before being flagged as stuck */
  DELIVERABLES_PROVIDED_MAX_DAYS: 5,
} as const;

export const MS_PER_MINUTE = 60 * 1000;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

