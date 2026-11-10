// TODO(conflict:X5) — confirmed: abandoned external checkouts (features.md Phase 16,
// FA-5) hold the slot for this long before it's released back to open. Config, never
// an inline literal — services/externalBooking.ts and services/availability.ts both
// read from here.
export const SLOT_HOLD_MINUTES = 30;
