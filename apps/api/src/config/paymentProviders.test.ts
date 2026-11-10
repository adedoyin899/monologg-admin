import { describe, expect, it } from "vitest";
import {
  PAYMENT_PROVIDER_ALLOWLIST,
  assertAllowedPaymentProvider,
  isAllowedPaymentProvider,
} from "./paymentProviders.js";

describe("payment provider allowlist (X1)", () => {
  it("accepts every allowlisted provider", () => {
    for (const provider of PAYMENT_PROVIDER_ALLOWLIST) {
      expect(isAllowedPaymentProvider(provider)).toBe(true);
      expect(() => assertAllowedPaymentProvider(provider)).not.toThrow();
    }
  });

  it("rejects 'fincra'", () => {
    expect(isAllowedPaymentProvider("fincra")).toBe(false);
    expect(() => assertAllowedPaymentProvider("fincra")).toThrow(/fincra/i);
  });

  it("rejects arbitrary unknown strings", () => {
    expect(isAllowedPaymentProvider("some-random-gateway")).toBe(false);
  });

  it("never includes 'fincra' in the allowlist itself", () => {
    expect(PAYMENT_PROVIDER_ALLOWLIST).not.toContain("fincra");
  });
});
