// TODO(conflict:X2) — confirm these values:
//   This PRD uses 11% talent / 15% client.
//   An earlier draft used 9%/12%. If the human confirms the old values are correct,
//   change *only* this object — computeFees() and all callers read from here, never
//   from literals, so it's a one-line change.

export interface PlatformFees {
  /** Fraction taken from the talent's base amount (e.g. 0.11 = 11%). */
  talentPct: number;
  /** Fraction added on top of the base amount for the client (e.g. 0.15 = 15%). */
  clientPct: number;
}

export const PLATFORM_FEES: PlatformFees = {
  talentPct: 0.11,
  clientPct: 0.15,
} as const;
