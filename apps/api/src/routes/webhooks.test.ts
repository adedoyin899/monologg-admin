import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../db/client.js", () => ({
  prisma: {
    payment: { findUnique: vi.fn() },
    paymentEvent: { create: vi.fn() },
    booking: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

// Phase 8: processPaystackWebhookEvent best-effort-triggers Meet creation on
// escrow lock (services/calendar.ts's createMeetForBooking). Mocked here for
// the same reason as services/payment.test.ts — this route's own mocked
// Prisma doesn't model booking.findUniqueOrThrow/creator/etc., and shouldn't
// need to just to prove the webhook itself is signature-verified + idempotent.
vi.mock("../services/calendar.js", () => ({
  createMeetForBooking: vi.fn().mockResolvedValue(null),
}));

import { buildApp } from "../app.js";
import { prisma } from "../db/client.js";
import { mockPaymentProvider } from "../providers/payment.mock.js";
import { createMeetForBooking } from "../services/calendar.js";

const prismaMock = prisma as any;
const createMeetForBookingMock = createMeetForBooking as any;

// Under NODE_ENV=test, providers/index.ts always resolves to mockPaymentProvider —
// including for signature verification (which defaults to "always valid" so the
// rest of the mock test suite doesn't need real signatures). Its own docstring
// flags exactly this: "the test suite can override this by importing and
// replacing the export when testing tampered webhooks." That's what these
// tamper/no-signature tests do, restoring the default afterwards.
describe("POST /api/v1/webhooks/paystack", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
    // afterEach's vi.restoreAllMocks() (below) wipes vi.mock() factory-configured
    // implementations too, not just the vi.spyOn it's meant for — re-establish
    // this one every test rather than relying on the factory's one-time default.
    createMeetForBookingMock.mockResolvedValue(null);
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  const payloadStr = JSON.stringify({ event: "charge.success", data: { id: 42, reference: "ref-1", status: "success" } });

  it("rejects a request with no signature header at all", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/paystack",
      payload: payloadStr,
      headers: { "content-type": "application/json" },
    });

    expect(response.statusCode).toBe(401);
    expect(prismaMock.payment.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a tampered/unsigned webhook (signature verification fails)", async () => {
    vi.spyOn(mockPaymentProvider, "verifyWebhook").mockReturnValue(false);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/paystack",
      payload: payloadStr,
      headers: {
        "content-type": "application/json",
        "x-paystack-signature": "not-a-real-signature",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(prismaMock.payment.findUnique).not.toHaveBeenCalled();
  });

  it("accepts a validly signed webhook and processes it", async () => {
    prismaMock.payment.findUnique.mockResolvedValue({ id: "p1", bookingId: "b1", status: "INITIATED" });
    prismaMock.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        paymentEvent: { create: vi.fn().mockResolvedValue({}) },
        payment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        booking: { update: vi.fn().mockResolvedValue({}) },
      };
      await fn(tx);
    });
    prismaMock.booking.findUnique.mockResolvedValue({
      id: "b1",
      creator: { userId: "user-creator" },
      client: { userId: "user-client" },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/paystack",
      payload: payloadStr,
      headers: {
        "content-type": "application/json",
        "x-paystack-signature": "any-signature-mock-always-accepts",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().processed).toBe(true);
    expect(prismaMock.booking.findUnique).toHaveBeenCalled();
  });

  it("Idempotency: replaying the identical signed webhook does not double-process", async () => {
    prismaMock.payment.findUnique.mockResolvedValue({ id: "p1", bookingId: "b1", status: "ESCROW_HELD" });
    const p2002 = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    prismaMock.$transaction.mockRejectedValue(p2002);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/paystack",
      payload: payloadStr,
      headers: {
        "content-type": "application/json",
        "x-paystack-signature": "any-signature-mock-always-accepts",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().processed).toBe(false);
  });

  it("Authority: hitting an unrelated endpoint pretending payment succeeded never sets ESCROW_LOCKED — only this webhook route can", async () => {
    // There's no "client says success" endpoint anywhere in the API surface;
    // the only route that can move Payment/Booking into escrow state is this
    // one, and only when paymentProvider.verifyWebhook accepts the signature.
    prismaMock.payment.findUnique.mockResolvedValue(null); // no matching payment == as if client forged it

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/paystack",
      payload: JSON.stringify({ event: "charge.success", data: { id: 1, reference: "forged-ref" } }),
      headers: {
        "content-type": "application/json",
        "x-paystack-signature": "any-signature-mock-always-accepts",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().processed).toBe(false);
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });
});
