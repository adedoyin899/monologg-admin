import type { PaymentProvider } from "./payment.interface.js";

// Stub PaymentProvider — Stripe, for later international/default-region rollout
// (features.md Phase 6, TODO(conflict:X1)). Selected via PAYMENT_PROVIDER=stripe or
// by region routing (config/paymentRails.ts) once a booking's country maps here.
// Not implemented this phase — Paystack (payment.real.ts) is the only real rail.

export const stripePaymentProvider: PaymentProvider = {
  async initEscrow(_bookingId, _amountMinorUnits, _currency) {
    throw new Error("[payment.stripe] Stripe integration not yet implemented — later region phase.");
  },

  async holdFunds(_ref) {
    throw new Error("[payment.stripe] Stripe holdFunds not yet implemented — later region phase.");
  },

  async releaseFunds(_ref, _talentNetMinorUnits, _currency) {
    throw new Error("[payment.stripe] Stripe releaseFunds not yet implemented — later region phase.");
  },

  async refund(_ref) {
    throw new Error("[payment.stripe] Stripe refund not yet implemented — later region phase.");
  },

  verifyWebhook(_signature, _rawBody) {
    throw new Error("[payment.stripe] Stripe webhook verification not yet implemented — later region phase.");
  },
};
