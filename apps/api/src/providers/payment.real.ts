import crypto from "node:crypto";
import { env } from "../config/env.js";
import type { InitEscrowResult, PaymentProvider } from "./payment.interface.js";

// ---------------------------------------------------------------------------
// REAL PaymentProvider — Paystack implementation (Africa / NGN market, features.md
// Phase 6). TODO(conflict:X1) — provider is Paystack (+ Stripe/Airwallex stubs for
// later regions, see payment.stripe.ts / payment.airwallex.ts), never "fincra".
//
// All amounts are integer minor units (kobo) — the same convention as the rest of
// the codebase — and Paystack's API already expects/returns amounts in kobo for
// NGN, so no conversion happens at this boundary.
// ---------------------------------------------------------------------------

const PAYSTACK_API = "https://api.paystack.co";

function requireSecretKey(): string {
  if (!env.PAYSTACK_SECRET_KEY) {
    throw new Error(
      "[payment.real] PAYSTACK_SECRET_KEY is not configured — required when PAYMENT_PROVIDER=paystack.",
    );
  }
  return env.PAYSTACK_SECRET_KEY;
}

async function paystackRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${PAYSTACK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireSecretKey()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const body = (await response.json()) as { status: boolean; message: string; data: T };
  if (!response.ok || !body.status) {
    throw new Error(`[payment.real] Paystack ${path} failed: ${body.message ?? response.statusText}`);
  }
  return body.data;
}

export const realPaymentProvider: PaymentProvider = {
  // POST /transaction/initialize — starts the escrow charge. The client completes
  // payment on Paystack's hosted checkout (authorization_url); we never handle
  // card details ourselves.
  async initEscrow(bookingId, amountMinorUnits, currency): Promise<InitEscrowResult> {
    const reference = `booking_${bookingId}_${Date.now()}`;
    const data = await paystackRequest<{ authorization_url: string; reference: string }>(
      "/transaction/initialize",
      {
        method: "POST",
        body: JSON.stringify({
          amount: amountMinorUnits,
          currency,
          reference,
          metadata: { bookingId },
        }),
      },
    );
    return { ref: data.reference, checkoutUrl: data.authorization_url };
  },

  // GET /transaction/verify/:reference — defense-in-depth: the webhook signature is
  // the authority that unlocks escrow, but we re-verify server-to-server with
  // Paystack directly before trusting it, rather than trusting the webhook payload
  // alone (standard Paystack-recommended practice).
  async holdFunds(ref) {
    const data = await paystackRequest<{ status: string }>(
      `/transaction/verify/${encodeURIComponent(ref)}`,
      { method: "GET" },
    );
    if (data.status !== "success") {
      throw new Error(`[payment.real] Paystack transaction ${ref} is not in "success" state (got "${data.status}")`);
    }
  },

  // POST /transfer — pays the creator's net amount out.
  // NOTE: a real Paystack transfer requires a `recipient_code` (created once via
  // POST /transferrecipient with the creator's bank account details). Collecting
  // and storing creator payout/bank details is not part of any phase up through
  // Phase 6 in features.md — this is a real, flagged gap, not an oversight: beta
  // launches on the ledger-hold model described in the Phase 6 spec ("true escrow
  // may require a provider sub-account/split... For beta, implement a ledger-based
  // hold"), where the internal ledger reaching RELEASED is the authoritative record
  // and the actual bank payout is reconciled manually/off-platform until a creator
  // payout-onboarding phase collects recipient details. Throwing here (rather than
  // silently no-op'ing) makes that gap loud instead of quietly wrong.
  async releaseFunds(_ref, _talentNetMinorUnits, _currency) {
    throw new Error(
      "[payment.real] Paystack payout requires a transfer recipient_code, which needs creator " +
        "bank details not yet collected by any phase through Phase 6 — release the ledger " +
        "manually via the platform's Paystack dashboard until creator payout onboarding exists.",
    );
  },

  // POST /refund — refunds the full original charge back to the client's payment
  // method. Unlike payouts, this doesn't need a recipient_code (Paystack refunds
  // via the original transaction), so it's fully implementable now.
  async refund(ref) {
    await paystackRequest("/refund", {
      method: "POST",
      body: JSON.stringify({ transaction: ref }),
    });
  },

  // HMAC-SHA512 of the raw request body using the secret key — Paystack's
  // documented webhook verification scheme. Timing-safe compare against the
  // `x-paystack-signature` header.
  verifyWebhook(signature, rawBody) {
    if (!signature || !env.PAYSTACK_SECRET_KEY) return false;
    const expected = crypto.createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
    const expectedBuf = Buffer.from(expected, "utf8");
    const signatureBuf = Buffer.from(signature, "utf8");
    if (expectedBuf.length !== signatureBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  },
};
