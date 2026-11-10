import type { PaymentProvider } from "./payment.interface.js";

// Stub PaymentProvider — Airwallex, for later regulated-market rollout (EU/UK/AU —
// see config/paymentRails.ts) (features.md Phase 6, TODO(conflict:X1)). Selected via
// PAYMENT_PROVIDER=airwallex or by region routing once a booking's country maps here.
// Not implemented this phase — Paystack (payment.real.ts) is the only real rail.

export const airwallexPaymentProvider: PaymentProvider = {
  async initEscrow(_bookingId, _amountMinorUnits, _currency) {
    throw new Error("[payment.airwallex] Airwallex integration not yet implemented — later region phase.");
  },

  async holdFunds(_ref) {
    throw new Error("[payment.airwallex] Airwallex holdFunds not yet implemented — later region phase.");
  },

  async releaseFunds(_ref, _talentNetMinorUnits, _currency) {
    throw new Error("[payment.airwallex] Airwallex releaseFunds not yet implemented — later region phase.");
  },

  async refund(_ref) {
    throw new Error("[payment.airwallex] Airwallex refund not yet implemented — later region phase.");
  },

  verifyWebhook(_signature, _rawBody) {
    throw new Error("[payment.airwallex] Airwallex webhook verification not yet implemented — later region phase.");
  },
};
