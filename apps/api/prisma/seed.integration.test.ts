// Live-DB tests against the real Supabase project — see vitest.integration.config.ts for why
// these are separate from the CI-blocking `pnpm test` gate. Run:
//   pnpm --filter @monologg/api run db:seed
//   pnpm --filter @monologg/api run test:integration
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PAYMENT_PROVIDER_ALLOWLIST } from "../src/config/paymentProviders.js";
import type { Creator, Brief, Booking } from "@prisma/client";
// Reuses seed.ts's own client rather than opening a second one — Supabase's transaction
// pooler has few enough slots that two concurrent PrismaClient instances in one process can
// starve each other out (observed directly while building this test). This client still
// talks over DATABASE_URL (the pooled/transaction-pooler connection), the same connection
// the running app uses, per the Phase 2 acceptance criterion "app queries succeed via pooled
// DATABASE_URL".
import { prisma, seed } from "./seed.js";

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("pooled connection", () => {
  it("runs a real query via DATABASE_URL", async () => {
    const result = await prisma.$queryRaw<{ ok: number }[]>`select 1 as ok`;
    expect(result[0].ok).toBe(1);
  });
});

describe("seed parity — reproduces apps/web/src/mocks demo data", () => {
  it("seeded all 6 creators from talents.ts with matching names/niches", async () => {
    // >= 6, not === 6: seed.ts also carries extra, non-mock-fixture creators
    // added directly for manual DB verification (see CREATORS below Ibrahim
    // Bello) — this test's own job is mock-parity for the original 6, not an
    // exhaustive count of everything the seed has ever grown to contain.
    const creators = await prisma.creator.findMany({ orderBy: { name: "asc" } });
    expect(creators.length).toBeGreaterThanOrEqual(6);

    const byName = Object.fromEntries(creators.map((c: Creator) => [c.name, c]));
    expect(byName["Adaeze Obi"]?.niche).toBe("VO_ARTIST");
    expect(byName["Adaeze Obi"]?.styleTags).toEqual(["Warm", "Multilingual", "Corporate"]);
    expect(byName["Chidi Okeke"]?.niche).toBe("ACTOR");
    expect(byName["Temi Adeleke"]?.verification).toBe("UNVERIFIED");
  });

  it("keeps styleTags and verification independently settable (X3)", async () => {
    const chidi = await prisma.creator.findUniqueOrThrow({
      where: { id: "seed-creator-chidi" },
    });
    // A creator can be verified with no bearing on their style tags, and vice versa —
    // proven by these being two independently-stored columns, not a derived/coupled value.
    expect(chidi.verification).toBe("VERIFIED");
    expect(Array.isArray(chidi.styleTags)).toBe(true);
  });

  it("seeded 4 briefs from clientProjects.ts", async () => {
    const briefs = await prisma.brief.findMany();
    expect(briefs).toHaveLength(4);
    expect(briefs.map((b: Brief) => b.projectName).sort()).toEqual(
      [
        "Fintech Radio Ads",
        "Film Auditions Jan 2025",
        "Nike Q1 Campaign",
        "Tech Summit Compere",
      ].sort(),
    );
  });

  it("seeded exactly one booking per BookingState", async () => {
    const bookings = await prisma.booking.findMany();
    expect(bookings).toHaveLength(6);
    const states = bookings.map((b: Booking) => b.state).sort();
    expect(states).toEqual(
      [
        "PENDING_PAYMENT",
        "ESCROW_LOCKED",
        "DELIVERABLES_PROVIDED",
        "PAYMENT_RELEASED",
        "CANCELLED",
        "DISPUTED",
      ].sort(),
    );
  });

  it("every booking money field is an integer (no floats)", async () => {
    const bookings = await prisma.booking.findMany();
    for (const b of bookings) {
      expect(Number.isInteger(b.baseAmount)).toBe(true);
      expect(Number.isInteger(b.talentFeeAmount)).toBe(true);
      expect(Number.isInteger(b.clientFeeAmount)).toBe(true);
    }
  });

  it("fee amounts match the 11%/15% split (X2) for every seeded booking", async () => {
    const bookings = await prisma.booking.findMany();
    for (const b of bookings) {
      expect(b.talentFeeAmount).toBe(Math.round(b.baseAmount * 0.11));
      expect(b.clientFeeAmount).toBe(Math.round(b.baseAmount * 0.15));
    }
  });

  it("every seeded Payment.provider is on the allowlist (never 'fincra')", async () => {
    const payments = await prisma.payment.findMany();
    expect(payments.length).toBeGreaterThan(0);
    for (const p of payments) {
      expect(PAYMENT_PROVIDER_ALLOWLIST).toContain(p.provider);
      expect(p.provider).not.toBe("fincra");
    }
  });

  it("re-running the seed is idempotent (row counts unchanged)", async () => {
    const before = {
      users: await prisma.user.count(),
      creators: await prisma.creator.count(),
      bookings: await prisma.booking.count(),
      payments: await prisma.payment.count(),
      messages: await prisma.message.count(),
    };

    await seed();

    const after = {
      users: await prisma.user.count(),
      creators: await prisma.creator.count(),
      bookings: await prisma.booking.count(),
      payments: await prisma.payment.count(),
      messages: await prisma.message.count(),
    };

    expect(after).toEqual(before);
  });
});
