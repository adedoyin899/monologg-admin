import crypto from "node:crypto";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { realPaymentProvider } from "./payment.real.js";
import { env } from "../config/env.js";

// Unit tests for the actual Paystack HMAC verification logic — separate from
// routes/webhooks.test.ts, which only exercises the mock provider (always
// valid) since NODE_ENV=test never selects the real one at runtime. This file
// proves the real signature check itself is correct.
describe("realPaymentProvider.verifyWebhook (Paystack HMAC-SHA512)", () => {
  const SECRET = "sk_test_abc123_secret";
  const originalKey = env.PAYSTACK_SECRET_KEY;

  beforeEach(() => {
    (env as any).PAYSTACK_SECRET_KEY = SECRET;
  });

  afterEach(() => {
    (env as any).PAYSTACK_SECRET_KEY = originalKey;
  });

  function sign(body: string): string {
    return crypto.createHmac("sha512", SECRET).update(body).digest("hex");
  }

  it("accepts a signature computed with the correct secret over the exact body", () => {
    const body = Buffer.from(JSON.stringify({ event: "charge.success", data: { reference: "ref-1" } }));
    const signature = sign(body.toString());

    expect(realPaymentProvider.verifyWebhook(signature, body)).toBe(true);
  });

  it("rejects a signature for a different body (tampered payload)", () => {
    const originalBody = JSON.stringify({ event: "charge.success", data: { reference: "ref-1", amount: 1000 } });
    const tamperedBody = Buffer.from(JSON.stringify({ event: "charge.success", data: { reference: "ref-1", amount: 999999 } }));

    expect(realPaymentProvider.verifyWebhook(sign(originalBody), tamperedBody)).toBe(false);
  });

  it("rejects a signature signed with the wrong secret", () => {
    const body = Buffer.from(JSON.stringify({ event: "charge.success", data: { reference: "ref-1" } }));
    const wrongSignature = crypto.createHmac("sha512", "some_other_secret").update(body).digest("hex");

    expect(realPaymentProvider.verifyWebhook(wrongSignature, body)).toBe(false);
  });

  it("rejects an empty/missing signature", () => {
    const body = Buffer.from(JSON.stringify({ event: "charge.success", data: { reference: "ref-1" } }));

    expect(realPaymentProvider.verifyWebhook("", body)).toBe(false);
  });

  it("rejects when PAYSTACK_SECRET_KEY isn't configured", () => {
    (env as any).PAYSTACK_SECRET_KEY = undefined;
    const body = Buffer.from(JSON.stringify({ event: "charge.success", data: { reference: "ref-1" } }));

    expect(realPaymentProvider.verifyWebhook(sign(body.toString()), body)).toBe(false);
  });
});
