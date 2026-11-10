// Live-DB tests against the real, seeded Supabase project — see
// vitest.integration.config.ts for why these are separate from the CI-blocking
// `pnpm test` gate. Complements the fast mocked-Prisma route tests in
// src/routes/*.test.ts with a few checks against real, relational seed data —
// most valuable for owner-scoping, where a mock can't accidentally "prove" two
// different rows are actually different rows the way a real foreign key can.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { generateAccessToken } from "../src/services/auth.js";
import { prisma } from "./seed.js";
import { computeFees } from "../src/services/fees.js";

// Real seeded userIds (see prisma/seed.ts) — deterministic `${creator/client id}-user`.
const ADAEZE_USER_ID = "seed-creator-adaeze-user";
const CHIDI_USER_ID = "seed-creator-chidi-user";
const SELF_CLIENT_USER_ID = "seed-client-self-user";

const adaezeToken = generateAccessToken({ userId: ADAEZE_USER_ID, userType: "TALENT", email: "adaeze.obi@seed.monologg.dev" });
const clientToken = generateAccessToken({ userId: SELF_CLIENT_USER_ID, userType: "CLIENT", email: "casting@seed.monologg.dev" });

describe("Phase 5 — real owner-scoping and fee persistence against seeded Supabase data", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  const createdBookingIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    // Clean up so re-runs (and the seed idempotency test elsewhere) start from
    // the same baseline every time.
    for (const id of createdBookingIds) {
      await prisma.message.deleteMany({ where: { orderRoom: { bookingId: id } } });
      await prisma.orderRoom.deleteMany({ where: { bookingId: id } });
      await prisma.payment.deleteMany({ where: { bookingId: id } });
      await prisma.booking.delete({ where: { id } }).catch(() => {});
    }
  });

  it("real owner-scoping: Adaeze cannot edit Chidi's real seeded rate card", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/rate-cards/seed-ratecard-feature-film-audition", // owned by Chidi, not Adaeze
      headers: { authorization: `Bearer ${adaezeToken}` },
      payload: { serviceTitle: "Hijacked by Adaeze" },
    });

    expect(response.statusCode).toBe(403);

    const untouched = await prisma.rateCard.findUniqueOrThrow({
      where: { id: "seed-ratecard-feature-film-audition" },
    });
    expect(untouched.serviceTitle).toBe("Feature Film Audition");
  });

  it("real owner-scoping: Adaeze CAN edit her own real seeded rate card", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/rate-cards/seed-ratecard-adaeze-vo-session",
      headers: { authorization: `Bearer ${adaezeToken}` },
      payload: { deliveryTimeline: "24 Hours" },
    });

    expect(response.statusCode).toBe(200);

    // Restore, so this test is safe to re-run.
    await prisma.rateCard.update({
      where: { id: "seed-ratecard-adaeze-vo-session" },
      data: { deliveryTimeline: "Same Day" },
    });
  });

  it("creating a real booking persists fee amounts exactly equal to computeFees() output", async () => {
    const rateCard = await prisma.rateCard.findUniqueOrThrow({
      where: { id: "seed-ratecard-adaeze-vo-session" },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/bookings",
      headers: { authorization: `Bearer ${clientToken}` },
      payload: {
        creatorId: "seed-creator-adaeze",
        rateCardId: rateCard.id,
        slotDate: "2026-09-01",
        slotStart: "10:00",
        slotEnd: "11:00",
      },
    });

    expect(response.statusCode).toBe(201);
    const created = response.json();
    createdBookingIds.push(created.id);

    const persisted = await prisma.booking.findUniqueOrThrow({ where: { id: created.id } });
    const expected = computeFees(rateCard.basePriceAmount);
    expect(persisted.talentFeeAmount).toBe(expected.talentFee);
    expect(persisted.clientFeeAmount).toBe(expected.clientFee);
    expect(persisted.state).toBe("PENDING_PAYMENT");

    // The booking's OrderRoom should exist too (createBooking creates it inline).
    const orderRoom = await prisma.orderRoom.findUnique({ where: { bookingId: created.id } });
    expect(orderRoom).not.toBeNull();
  });

  it("real pagination: GET /talent with pageSize=2 returns exactly 2 of the 6 seeded creators", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/talent?pageSize=2&page=1" });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(2);
    expect(body.total).toBeGreaterThanOrEqual(6);
    expect(body.totalPages).toBeGreaterThanOrEqual(3);
  });
});
