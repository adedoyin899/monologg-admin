import { PAYMENT_PROVIDER_ALLOWLIST, type PaymentProvider } from "./paymentProviders.js";

// TODO(conflict:X1) — the payment provider is Paystack/Stripe/Airwallex, never "fincra".
// An earlier draft of the PRD listed FINCRA. If the human confirms that was correct,
// add it to PAYMENT_PROVIDER_ALLOWLIST in paymentProviders.ts — the region map here
// will automatically be allowed to reference it.

/**
 * Maps a 2-letter ISO 3166-1 country code (or a fallback region key) to the
 * payment provider that should be used for that market.
 *
 * Rules:
 * - Africa / NGN markets → Paystack (widest coverage, local acquiring)
 * - Everything else → Stripe (default international fallback)
 * - Some regulated markets (EU/UK/AU) → Airwallex (better FX + compliance)
 *
 * The map value must be in PAYMENT_PROVIDER_ALLOWLIST; asserting that at load
 * time means a typo surfaces immediately rather than at the first real checkout.
 */

type RegionKey = string; // ISO 3166-1 alpha-2 ("NG", "GH", "GB" …) or "*" for default

export const PAYMENT_RAILS: Record<RegionKey, PaymentProvider> = {
  // ── Africa ───────────────────────────────────────────────────────────────
  NG: "paystack", // Nigeria (primary market)
  GH: "paystack", // Ghana
  KE: "paystack", // Kenya
  ZA: "paystack", // South Africa

  // ── EU / UK / AU — Airwallex for better FX + regulatory coverage ─────────
  GB: "airwallex",
  DE: "airwallex",
  FR: "airwallex",
  AU: "airwallex",

  // ── Default (rest of world) ───────────────────────────────────────────────
  "*": "stripe",
} as const;

// Validate all values are in the allowlist at module load (not at runtime checkout)
for (const [region, provider] of Object.entries(PAYMENT_RAILS)) {
  if (!(PAYMENT_PROVIDER_ALLOWLIST as readonly string[]).includes(provider)) {
    throw new Error(
      `[config/paymentRails] Region "${region}" maps to unknown provider "${provider}". ` +
        `Allowed: ${PAYMENT_PROVIDER_ALLOWLIST.join(", ")}`,
    );
  }
}

/**
 * Returns the PaymentProvider to use for a given ISO country code.
 * Falls back to the "*" default if the country isn't explicitly mapped.
 */
export function getProviderForCountry(countryCode: string): PaymentProvider {
  const upper = countryCode.toUpperCase();
  return PAYMENT_RAILS[upper] ?? PAYMENT_RAILS["*"];
}
