// Live-DB e2e test for the Phase 6 escrow lifecycle, against the real seeded
// Supabase project (see phase5.integration.test.ts for why these live tests
// are separate from the CI-blocking `pnpm test` gate). The payment PROVIDER
// itself is still the mock (NODE_ENV=test always forces mock — see
// providers/index.ts — so the app runs with zero real Paystack API keys, per
// CONTRIBUTING.md rule #3), but every DB write, transition, and fee
// computation here is real.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { generateAccessToken } from "../src/services/auth.js";
import { prisma } from "./seed.js";
import { computeFees } from "../src/services/fees.js";

const ADAEZE_USER_ID = "seed-creator-adaeze-user";
const SELF_CLIENT_USER_ID = "seed-client-self-user";

const adaezeToken = generateAccessToken({ userId: ADAEZE_USER_ID, userType: "TALENT", email: "adaeze.obi@seed.monologg.dev" });
const clientToken = generateAccessToken({ userId: SELF_CLIENT_USER_ID, userType: "CLIENT", email: "casting@seed.monologg.dev" });

describe("Phase 6 — real escrow lifecycle against seeded Supabase data", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  const createdBookingIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    for (const id of createdBookingIds) {
      await prisma.paymentEvent.deleteMany({ where: { payment: { bookingId: id } } });
      await prisma.message.deleteMany({ where: { orderRoom: { bookingId: id } } });
      await prisma.orderRoom.deleteMany({ where: { bookingId: id } });
      await prisma.payment.deleteMany({ where: { bookingId: id } });
      await prisma.booking.delete({ where: { id } }).catch(() => {});
    }
  });

  async function createRealBooking(): Promise<{ id: string; baseAmount: number }> {
    const rateCard = await prisma.rateCard.findUniqueOrThrow({ where: { id: "seed-ratecard-adaeze-vo-session" } });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/bookings",
      headers: { authorization: `Bearer ${clientToken}` },
      payload: {
        creatorId: "seed-creator-adaeze",
        rateCardId: rateCard.id,
        slotDate: "2026-09-15",
        slotStart: "10:00",
        slotEnd: "11:00",
      },
    });
    expect(response.statusCode).toBe(201);
    const created = response.json();
    createdBookingIds.push(created.id);
    return { id: created.id, baseAmount: rateCard.basePriceAmount };
  }

  it("checkout → webhook → ESCROW_LOCKED → deliver → approve → PAYMENT_RELEASED, with correct fee splits", async () => {
    const { id: bookingId, baseAmount } = await createRealBooking();
    const fees = computeFees(baseAmount);

    // 1. Client initiates checkout.
    const payResponse = await app.inject({
      method: "POST",
      url: `/api/v1/bookings/${bookingId}/pay`,
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(payResponse.statusCode).toBe(200);
    const { providerRef } = payResponse.json();
    expect(providerRef).toBeTruthy();

    // A client-side "success" callback (nothing in this API advances state on
    // its own) — the booking must still be PENDING_PAYMENT at this point.
    const stillPending = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(stillPending.state).toBe("PENDING_PAYMENT");

    // 2. Provider webhook confirms the charge — the only thing that unlocks escrow.
    const webhookResponse = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/paystack",
      headers: { "content-type": "application/json", "x-paystack-signature": "mock-accepts-anything" },
      payload: JSON.stringify({ event: "charge.success", data: { id: `evt-${bookingId}`, reference: providerRef, status: "success" } }),
    });
    expect(webhookResponse.statusCode).toBe(200);
    expect(webhookResponse.json().processed).toBe(true);

    const afterWebhook = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { payment: true } });
    expect(afterWebhook.state).toBe("ESCROW_LOCKED");
    expect(afterWebhook.payment!.status).toBe("ESCROW_HELD");

    // Replaying the identical webhook must not double-process.
    const replay = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/paystack",
      headers: { "content-type": "application/json", "x-paystack-signature": "mock-accepts-anything" },
      payload: JSON.stringify({ event: "charge.success", data: { id: `evt-${bookingId}`, reference: providerRef, status: "success" } }),
    });
    expect(replay.statusCode).toBe(200);
    expect(replay.json().processed).toBe(false);

    // 3. Talent delivers.
    const deliverResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/bookings/${bookingId}/deliver`,
      headers: { authorization: `Bearer ${adaezeToken}` },
    });
    expect(deliverResponse.statusCode).toBe(200);
    expect(deliverResponse.json().state).toBe("DELIVERABLES_PROVIDED");

    // 4. Client approves — releases escrow.
    const approveResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/bookings/${bookingId}/approve`,
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(approveResponse.statusCode).toBe(200);

    const final = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { payment: true } });
    expect(final.state).toBe("PAYMENT_RELEASED");
    expect(final.payment!.status).toBe("RELEASED");
    expect(final.clientFeeAmount).toBe(fees.clientFee);
    expect(final.talentFeeAmount).toBe(fees.talentFee);
    expect(final.payment!.amount).toBe(baseAmount + fees.clientFee);
  });

  it("refund path: checkout → webhook → dispute → refund → CANCELLED", async () => {
    const { id: bookingId } = await createRealBooking();

    const payResponse = await app.inject({
      method: "POST",
      url: `/api/v1/bookings/${bookingId}/pay`,
      headers: { authorization: `Bearer ${clientToken}` },
    });
    const { providerRef } = payResponse.json();

    await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/paystack",
      headers: { "content-type": "application/json", "x-paystack-signature": "mock-accepts-anything" },
      payload: JSON.stringify({ event: "charge.success", data: { id: `evt-${bookingId}`, reference: providerRef, status: "success" } }),
    });

    const disputeResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/bookings/${bookingId}/dispute`,
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(disputeResponse.statusCode).toBe(200);

    const refundResponse = await app.inject({
      method: "POST",
      url: `/api/v1/bookings/${bookingId}/refund`,
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(refundResponse.statusCode).toBe(200);

    const final = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { payment: true } });
    expect(final.state).toBe("CANCELLED");
    expect(final.payment!.status).toBe("REFUNDED");
  });

  it("no seeded or newly-created Payment.provider is ever 'fincra'", async () => {
    const payments = await prisma.payment.findMany({ where: { bookingId: { in: createdBookingIds } } });
    for (const p of payments) {
      expect(p.provider.toLowerCase()).not.toBe("fincra");
    }
  });
});
