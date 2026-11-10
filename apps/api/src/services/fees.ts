import { PLATFORM_FEES, type PlatformFees } from "../config/platformFees.js";

// ---------------------------------------------------------------------------
// Fee computation — the ONLY place this math lives.
// ---------------------------------------------------------------------------
// Money rule: all amounts are integer minor units (kobo / cents).
// Never use floats; never inline fee percentages anywhere else.
// ---------------------------------------------------------------------------

export interface FeeBreakdown {
  /** What the client pays on top of the base amount (15% by default). Integer minor units. */
  clientFee: number;
  /** Total the client is charged: base + clientFee. Integer minor units. */
  clientTotal: number;
  /** What the platform takes from the talent's side (11% by default). Integer minor units. */
  talentFee: number;
  /** What the talent actually receives: base − talentFee. Integer minor units. */
  talentNet: number;
}

/**
 * Computes the platform fee breakdown for a given base booking amount.
 *
 * @param baseAmount - The rate-card base price in integer minor units (e.g. kobo).
 * @param fees       - Override PLATFORM_FEES for testing; do NOT pass literals in
 *                     production — always use the config object.
 *
 * Fee model (from features.md §1 conflict correction X2):
 *   - Client pays:   base + (base × clientPct)  → platform keeps the clientPct portion
 *   - Talent receives: base − (base × talentPct) → platform keeps the talentPct portion
 *   - Platform net:  clientFee + talentFee
 *
 * Rounding: Math.round() — never truncate money.
 */
export function computeFees(baseAmount: number, fees: PlatformFees = PLATFORM_FEES): FeeBreakdown {
  const clientFee = Math.round(baseAmount * fees.clientPct);
  const talentFee = Math.round(baseAmount * fees.talentPct);
  return {
    clientFee,
    clientTotal: baseAmount + clientFee,
    talentFee,
    talentNet: baseAmount - talentFee,
  };
}
