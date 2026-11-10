import { z } from "zod";

// X1: the payment provider is Paystack-first (+ Stripe/Airwallex for later regions) — never
// "fincra" (a stale reference from an earlier PRD draft). `Payment.provider` is stored as
// free text in the schema (not a DB enum, since new providers may be added without a
// migration), so this allowlist is the single place that decides what's actually valid.
// Phase 3's `config/paymentRails.ts` (region → provider routing) is expected to import this
// same allowlist rather than redeclare it.
export const PAYMENT_PROVIDER_ALLOWLIST = ["paystack", "stripe", "airwallex"] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDER_ALLOWLIST)[number];

export const PaymentProviderSchema = z.enum(PAYMENT_PROVIDER_ALLOWLIST);

export function isAllowedPaymentProvider(value: string): value is PaymentProvider {
  return (PAYMENT_PROVIDER_ALLOWLIST as readonly string[]).includes(value);
}

export function assertAllowedPaymentProvider(value: string): PaymentProvider {
  const result = PaymentProviderSchema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `Invalid payment provider "${value}" — must be one of: ${PAYMENT_PROVIDER_ALLOWLIST.join(", ")}`,
    );
  }
  return result.data;
}
