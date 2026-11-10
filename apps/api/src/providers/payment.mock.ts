import type { PaymentProvider } from "./payment.interface.js";

// ---------------------------------------------------------------------------
// Mock PaymentProvider — for dev and test environments.
// - No real network calls; no real API keys required.
// - Returns deterministic, reproducible values.
// - Signature verification always returns true (the test suite can override
//   this by importing and replacing the export when testing tampered webhooks).
// ---------------------------------------------------------------------------

export const mockPaymentProvider: PaymentProvider = {
  async initEscrow(bookingId, amountMinorUnits, currency) {
    const ref = `mock_ref_${bookingId}_${Date.now()}`;
    return {
      ref,
      checkoutUrl: `https://mock.paystack.co/checkout/${ref}?amount=${amountMinorUnits}&currency=${currency}`,
    };
  },

  async holdFunds(_ref) {
    // No-op in mock — funds are notionally held.
  },

  async releaseFunds(_ref, _talentNetMinorUnits, _currency) {
    // No-op in mock — funds are notionally released.
  },

  async refund(_ref) {
    // No-op in mock — charge is notionally refunded.
  },

  verifyWebhook(_signature, _rawBody) {
    // Always valid in mock — test for tampered signatures by swapping this
    // function in the test itself.
    return true;
  },
};
