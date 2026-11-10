// Live-DB concurrency/load test for money + two-sided flows (features.md Phase 17 QA gate:
// "concurrency/load on escrow checkout, webhook processing, slot booking, applicant cap — no
// double-charge, no double-book, no cap overrun; idempotency holds"). Same rationale as
// phase5/phase6.integration.test.ts for why this is separate from the CI-blocking `pnpm test`
// gate — real network + real Supabase credentials, run manually via
// `pnpm --filter @monologg/api run test:integration`.
//
// The point of THIS file specifically: every existing money/state test (unit or integration)
// proves correctness sequentially — call A, await it, then call B. That's necessary but not
// sufficient for a concurrency guarantee, since a mocked Prisma client can't reproduce a real
// Postgres advisory lock's actual blocking behavior. This file fires genuine `Promise.all`
// concurrency at the REAL dev database, so it's Postgres's own advisory locks and unique
// constraints under test, not an approximation of them.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { generateAccessToken } from "../src/services/auth.js";
import { prisma } from "./seed.js";
import { createBooking } from "../src/services/booking.js";
import { initEscrowForBooking, releaseEscrowForBooking } from "../src/services/payment.js";
import { applyToBrief, ApplicationsClosedError } from "../src/services/applications.js";
import { SlotUnavailableError } from "../src/services/availability.js";

const ADAEZE_USER_ID = "seed-creator-adaeze-user";
const SELF_CLIENT_USER_ID = "seed-client-self-user";
const adaezeToken = generateAccessToken({ userId: ADAEZE_USER_ID, userType: "TALENT", email: "adaeze.obi@seed.monologg.dev" });
const clientToken = generateAccessToken({ userId: SELF_CLIENT_USER_ID, userType: "CLIENT", email: "casting@seed.monologg.dev" });

describe("Phase 17 — concurrency/load on real Postgres (manual, not CI-blocking)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  const createdBookingIds: string[] = [];
  const createdCreatorUserIds: string[] = [];
  let throwawayBriefId: string | undefined;

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
    // Every test in this file books seed-creator-adaeze on one of these three dates — writes
    // into AvailabilityBlock too, which phase6.integration.test.ts's own afterAll doesn't clean
    // up (a pre-existing gap this file won't repeat).
    await prisma.availabilityBlock.deleteMany({
      where: {
        creatorId: "seed-creator-adaeze",
        date: { in: [new Date("2027-06-15T00:00:00.000Z"), new Date("2027-06-16T00:00:00.000Z"), new Date("2027-06-17T00:00:00.000Z")] },
      },
    });

    if (throwawayBriefId) {
      await prisma.application.deleteMany({ where: { briefId: throwawayBriefId } });
      await prisma.brief.delete({ where: { id: throwawayBriefId } }).catch(() => {});
    }
    for (const userId of createdCreatorUserIds) {
      await prisma.creator.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
  });

  // NOTE on N and the assertion shape: an earlier N=8 run against this sandbox's real (cross-
  // region) link to the dev Supabase pooler proved the hard safety property — exactly 1 winner,
  // 1 clean SlotUnavailableError — but the other 6 requests, queued behind the real Postgres
  // advisory lock, exceeded Prisma's default 5000ms interactive-transaction timeout while
  // waiting and errored with PrismaClientKnownRequestError instead of a clean 409. That is a
  // real, environment-latency-driven robustness finding (a losing request may see a confusing
  // 500 instead of "slot taken" under sustained contention) — tracked in
  // qa/2026-07-31-phase17/load-concurrency.md — but it is NOT a money-safety violation: no run,
  // at any N tried, ever produced more than one successful booking. The assertion below checks
  // exactly that hard invariant (never double-booked) rather than the stronger "every loser gets
  // a clean error", which this environment's network latency makes flaky to assert on.
  it("slot booking race: N concurrent createBooking calls for the identical slot — never more than 1 wins", async () => {
    const rateCard = await prisma.rateCard.findUniqueOrThrow({ where: { id: "seed-ratecard-adaeze-vo-session" } });
    const N = 5;
    const attempt = () =>
      createBooking({
        creatorId: "seed-creator-adaeze",
        clientId: "seed-client-self",
        rateCardId: rateCard.id,
        baseAmount: rateCard.basePriceAmount,
        currency: rateCard.basePriceCurrency,
        slotDate: new Date("2027-06-15"),
        slotStart: "09:00",
        slotEnd: "10:00",
      });

    const results = await Promise.allSettled(Array.from({ length: N }, attempt));
    const fulfilled = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<Awaited<ReturnType<typeof createBooking>>>[];
    const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    const slotUnavailableCount = rejected.filter((r) => r.reason instanceof SlotUnavailableError).length;
    const otherErrorCount = rejected.length - slotUnavailableCount;

    for (const f of fulfilled) createdBookingIds.push(f.value.id);
    console.log(
      `[phase17 concurrency] slot race (N=${N}): ${fulfilled.length} won, ${slotUnavailableCount} clean SlotUnavailableError, ${otherErrorCount} other (e.g. transaction-timeout under this environment's DB latency)`,
    );

    // The hard, non-negotiable safety guarantee: never more than one concurrent booking wins
    // the identical slot, regardless of how the losers fail.
    expect(fulfilled.length, "at most one concurrent booking may win the slot — never double-booked").toBeLessThanOrEqual(1);
    // And the slot is genuinely bookable under concurrency at all (not a false "nobody can ever
    // book this" wedge) — at least one attempt should get through even under contention.
    expect(fulfilled.length, "at least one concurrent attempt should still successfully claim the slot").toBeGreaterThanOrEqual(1);
  }, 60_000);

  it("webhook replay race: N concurrent identical signed webhooks — exactly one ESCROW_LOCKED transition", async () => {
    const rateCard = await prisma.rateCard.findUniqueOrThrow({ where: { id: "seed-ratecard-adaeze-vo-session" } });
    const booking = await createBooking({
      creatorId: "seed-creator-adaeze",
      clientId: "seed-client-self",
      rateCardId: rateCard.id,
      baseAmount: rateCard.basePriceAmount,
      currency: rateCard.basePriceCurrency,
      slotDate: new Date("2027-06-16"),
      slotStart: "09:00",
      slotEnd: "10:00",
    });
    createdBookingIds.push(booking.id);

    const { checkoutUrl } = await initEscrowForBooking(booking.id);
    expect(checkoutUrl).toBeTruthy();
    const payment = await prisma.payment.findUniqueOrThrow({ where: { bookingId: booking.id } });

    const N = 8;
    const identicalPayload = JSON.stringify({
      event: "charge.success",
      data: { id: `evt-race-${booking.id}`, reference: payment.providerRef, status: "success" },
    });
    const fire = () =>
      app.inject({
        method: "POST",
        url: "/api/v1/webhooks/paystack",
        headers: { "content-type": "application/json", "x-paystack-signature": "mock-accepts-anything" },
        payload: identicalPayload,
      });

    const responses = await Promise.all(Array.from({ length: N }, fire));
    const processedCount = responses.filter((r) => r.json().processed === true).length;

    expect(responses.every((r) => r.statusCode === 200), "every replay returns 200 (idempotent no-op, not an error)").toBe(true);
    expect(processedCount, "exactly one concurrent webhook delivery should actually process").toBe(1);

    const events = await prisma.paymentEvent.count({ where: { paymentId: payment.id } });
    expect(events, "the unique (paymentId,type,eventId) constraint allows exactly one row for N identical deliveries").toBe(1);

    const finalBooking = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(finalBooking.state).toBe("ESCROW_LOCKED");
  }, 60_000);

  it("double-approve race: N concurrent escrow-release approvals — funds released exactly once", async () => {
    const rateCard = await prisma.rateCard.findUniqueOrThrow({ where: { id: "seed-ratecard-adaeze-vo-session" } });
    const booking = await createBooking({
      creatorId: "seed-creator-adaeze",
      clientId: "seed-client-self",
      rateCardId: rateCard.id,
      baseAmount: rateCard.basePriceAmount,
      currency: rateCard.basePriceCurrency,
      slotDate: new Date("2027-06-17"),
      slotStart: "09:00",
      slotEnd: "10:00",
    });
    createdBookingIds.push(booking.id);

    const { checkoutUrl } = await initEscrowForBooking(booking.id);
    expect(checkoutUrl).toBeTruthy();
    const payment = await prisma.payment.findUniqueOrThrow({ where: { bookingId: booking.id } });
    await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/paystack",
      headers: { "content-type": "application/json", "x-paystack-signature": "mock-accepts-anything" },
      payload: JSON.stringify({ event: "charge.success", data: { id: `evt-deliver-${booking.id}`, reference: payment.providerRef, status: "success" } }),
    });
    await app.inject({
      method: "PATCH",
      url: `/api/v1/bookings/${booking.id}/deliver`,
      headers: { authorization: `Bearer ${adaezeToken}` },
    });

    const N = 6;
    const approve = () =>
      app.inject({
        method: "PATCH",
        url: `/api/v1/bookings/${booking.id}/approve`,
        headers: { authorization: `Bearer ${clientToken}` },
      });
    const responses = await Promise.all(Array.from({ length: N }, approve));

    expect(responses.every((r) => r.statusCode === 200), "every concurrent approve returns 200 (idempotent, not an error)").toBe(true);

    const finalPayment = await prisma.payment.findUniqueOrThrow({ where: { bookingId: booking.id } });
    expect(finalPayment.status).toBe("RELEASED");
    const finalBooking = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(finalBooking.state).toBe("PAYMENT_RELEASED");
  }, 60_000);

  it("applicant cap contention: N concurrent applicants racing a cap-3 brief — exactly 3 succeed", async () => {
    throwawayBriefId = "qa17-concurrency-brief";
    await prisma.brief.upsert({
      where: { id: throwawayBriefId },
      update: { status: "ACTIVE", applicantCap: 3, applicationsOpen: true },
      create: {
        id: throwawayBriefId,
        clientId: "seed-client-self",
        projectName: "QA17 concurrency test brief",
        projectType: "Voice-Over",
        nicheReq: ["VO_ARTIST"],
        budgetAmount: 10_000_00,
        budgetCurrency: "NGN",
        status: "ACTIVE",
        applicantCap: 3,
      },
    });
    await prisma.application.deleteMany({ where: { briefId: throwawayBriefId } });

    const N = 6;
    const creatorIds: string[] = [];
    for (let i = 0; i < N; i++) {
      const userId = `qa17-concurrency-creator-user-${i}`;
      const creatorId = `qa17-concurrency-creator-${i}`;
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: `qa17-concurrency-${i}@monologg.dev`, passwordHash: "x", userType: "TALENT" },
      });
      await prisma.creator.upsert({
        where: { id: creatorId },
        update: {},
        create: { id: creatorId, userId, name: `QA17 Creator ${i}`, niche: "VO_ARTIST", location: "Lagos", referralCode: `QA17-${i}` },
      });
      creatorIds.push(creatorId);
      createdCreatorUserIds.push(userId);
    }

    const results = await Promise.allSettled(creatorIds.map((creatorId) => applyToBrief(throwawayBriefId!, creatorId)));
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

    expect(fulfilled.length, "exactly cap-many applications should succeed under contention").toBe(3);
    expect(rejected.length).toBe(N - 3);
    for (const r of rejected) expect(r.reason).toBeInstanceOf(ApplicationsClosedError);

    const finalBrief = await prisma.brief.findUniqueOrThrow({ where: { id: throwawayBriefId } });
    expect(finalBrief.applicationsOpen, "the cap-hit flip happens exactly once, inside the same race").toBe(false);
  }, 60_000);
});
