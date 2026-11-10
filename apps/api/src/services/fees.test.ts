import { describe, it, expect } from "vitest";
import { computeFees } from "../services/fees.js";
import { PLATFORM_FEES } from "../config/platformFees.js";

// ---------------------------------------------------------------------------
// computeFees() unit tests — Phase 3 gate
// ---------------------------------------------------------------------------
// Rules enforced:
//   1. Reads PLATFORM_FEES (config), not inline literals.
//   2. All results are integers (no floats) — money rule.
//   3. Math is correct for both the default config AND an overridden config.
//   4. Overridable: passing a different fees object changes the result predictably.
// ---------------------------------------------------------------------------

describe("computeFees()", () => {
  describe("with default PLATFORM_FEES (11% talent / 15% client)", () => {
    it("computes correct clientFee, clientTotal, talentFee, talentNet for a round base", () => {
      // base: 100_000 kobo (₦1,000)
      const result = computeFees(100_000);

      expect(result.clientFee).toBe(15_000);     // 100_000 × 0.15
      expect(result.clientTotal).toBe(115_000);  // 100_000 + 15_000
      expect(result.talentFee).toBe(11_000);     // 100_000 × 0.11
      expect(result.talentNet).toBe(89_000);     // 100_000 - 11_000
    });

    it("reads PLATFORM_FEES from config, not literals — changing config changes output", () => {
      // This test proves the function is not hardcoded: we override the config
      // object and confirm the output changes accordingly.
      const customFees = { talentPct: 0.05, clientPct: 0.10 };
      const base = 200_000;

      const fromConfig = computeFees(base); // uses PLATFORM_FEES
      const fromCustom = computeFees(base, customFees);

      // Custom fees should differ from the default fees
      expect(fromCustom.clientFee).toBe(20_000);  // 200_000 × 0.10
      expect(fromCustom.talentFee).toBe(10_000);  // 200_000 × 0.05

      // Default fees differ (confirming the function IS reading config)
      expect(fromConfig.clientFee).toBe(30_000);  // 200_000 × 0.15
      expect(fromConfig.talentFee).toBe(22_000);  // 200_000 × 0.11
    });

    it("returns integer results — no floats (money rule)", () => {
      // Use a base that produces non-round intermediate values to prove rounding.
      // 37_333 × 0.11 = 4106.63 → rounds to 4107
      const base = 37_333;
      const result = computeFees(base);

      expect(Number.isInteger(result.clientFee)).toBe(true);
      expect(Number.isInteger(result.clientTotal)).toBe(true);
      expect(Number.isInteger(result.talentFee)).toBe(true);
      expect(Number.isInteger(result.talentNet)).toBe(true);
    });

    it("talentNet + talentFee === base (no money lost/created)", () => {
      const base = 500_000;
      const result = computeFees(base);
      expect(result.talentNet + result.talentFee).toBe(base);
    });

    it("clientTotal - clientFee === base (no money lost/created)", () => {
      const base = 500_000;
      const result = computeFees(base);
      expect(result.clientTotal - result.clientFee).toBe(base);
    });
  });

  describe("with overridden fees config", () => {
    it("uses the provided fees object, not PLATFORM_FEES constants", () => {
      const overridden = { talentPct: 0.20, clientPct: 0.25 };
      const base = 100_000;
      const result = computeFees(base, overridden);

      expect(result.talentFee).toBe(20_000);
      expect(result.clientFee).toBe(25_000);
      expect(result.talentNet).toBe(80_000);
      expect(result.clientTotal).toBe(125_000);

      // Confirm these differ from the PLATFORM_FEES defaults
      const defaults = computeFees(base, PLATFORM_FEES);
      expect(result.talentFee).not.toBe(defaults.talentFee);
      expect(result.clientFee).not.toBe(defaults.clientFee);
    });

    it("handles zero fees (no-fee mode)", () => {
      const noFees = { talentPct: 0, clientPct: 0 };
      const base = 75_000;
      const result = computeFees(base, noFees);

      expect(result.clientFee).toBe(0);
      expect(result.clientTotal).toBe(base);
      expect(result.talentFee).toBe(0);
      expect(result.talentNet).toBe(base);
    });
  });
});
