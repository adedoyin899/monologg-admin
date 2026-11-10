// features.md Phase 2 — idempotent seed reproducing the prototype's mock demo data
// (apps/web/src/mocks/{talents,clientProjects,orders,services}.ts), plus one Booking per
// BookingState so `live` mode has realistic data once Phase 5 endpoints exist.
//
// Idempotent by construction: every row uses a deterministic `seed-*` id and is written via
// upsert, so re-running (`prisma db seed`, `prisma migrate reset`) never duplicates rows.
//
// Money: every amount is stored as integer minor units (kobo). Fee math below (11% talent /
// 15% client) mirrors features.md's PLATFORM_FEES (X2) — Phase 3 formalizes this into
// `config/platformFees.ts` + `computeFees()`; this is a seed-local equivalent, not a
// duplicate source of truth for the real app.
import { PrismaClient, type Niche, type OrgType } from "@prisma/client";
import { scryptSync, randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

// Exported so the integration test suite can reuse this exact client instead of opening a
// second one — Supabase's transaction pooler has few enough slots that two concurrent
// PrismaClient instances in one process can starve each other out.
export const prisma = new PrismaClient();

const PLATFORM_FEES = { talentPct: 0.11, clientPct: 0.15 };

function computeFees(baseAmount: number) {
  return {
    talentFeeAmount: Math.round(baseAmount * PLATFORM_FEES.talentPct),
    clientFeeAmount: Math.round(baseAmount * PLATFORM_FEES.clientPct),
  };
}

// Parses a "₦28,000" style mock string into integer minor units (kobo).
function nairaToKobo(display: string): number {
  const major = Number(display.replace(/[^\d.]/g, ""));
  return Math.round(major * 100);
}

// Not a real auth hash (Phase 4 picks argon2id) — just a non-plaintext placeholder so
// `passwordHash` isn't literally the word "password".
function placeholderPasswordHash(): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync("seed-dev-password", salt, 32).toString("hex");
  return `scrypt-seed-placeholder$${salt}$${hash}`;
}

async function upsertUser(id: string, email: string, userType: "TALENT" | "CLIENT") {
  return prisma.user.upsert({
    where: { id },
    update: { email, userType },
    create: { id, email, userType, passwordHash: placeholderPasswordHash(), emailVerified: true },
  });
}

interface CreatorSeed {
  id: string;
  email: string;
  name: string;
  niche: Niche;
  location: string;
  styleTags: string[];
  verified: boolean;
  referralCode: string;
}

const CREATORS: CreatorSeed[] = [
  {
    id: "seed-creator-adaeze",
    email: "adaeze.obi@seed.monologg.dev",
    name: "Adaeze Obi",
    niche: "VO_ARTIST",
    location: "Lagos",
    styleTags: ["Warm", "Multilingual", "Corporate"],
    verified: true,
    referralCode: "REF-ADAEZE",
  },
  {
    id: "seed-creator-chidi",
    email: "chidi.okeke@seed.monologg.dev",
    name: "Chidi Okeke",
    niche: "ACTOR",
    location: "Abuja",
    styleTags: ["Dramatic", "Deep Voice", "Nollywood"],
    verified: true,
    referralCode: "REF-CHIDI",
  },
  {
    id: "seed-creator-kofi",
    email: "kofi.mensah@seed.monologg.dev",
    name: "Kofi Mensah",
    niche: "COMEDIAN",
    location: "Accra",
    styleTags: ["Corporate", "Witty", "Energetic"],
    verified: true,
    referralCode: "REF-KOFI",
  },
  {
    id: "seed-creator-amara",
    email: "amara.diallo@seed.monologg.dev",
    name: "Amara Diallo",
    niche: "VO_ARTIST",
    location: "Accra",
    styleTags: ["Storytelling", "Animated", "French"],
    verified: true,
    referralCode: "REF-AMARA",
  },
  {
    id: "seed-creator-temi",
    email: "temi.adeleke@seed.monologg.dev",
    name: "Temi Adeleke",
    niche: "CONTENT_CREATOR",
    location: "Lagos",
    styleTags: ["Lifestyle", "Charismatic", "Storyteller"],
    verified: false,
    referralCode: "REF-TEMI",
  },
  {
    id: "seed-creator-ibrahim",
    email: "ibrahim.bello@seed.monologg.dev",
    name: "Ibrahim Bello",
    niche: "ACTOR",
    location: "Kano",
    styleTags: ["Commercial", "Bilingual", "Athletic"],
    verified: true,
    referralCode: "REF-IBRAHIM",
  },
  {
    id: "seed-creator-zainab",
    email: "zainab.yusuf@seed.monologg.dev",
    name: "Zainab Yusuf",
    niche: "SPEAKER_PASTOR",
    location: "Kaduna",
    styleTags: ["Inspirational", "Baritone", "Bilingual"],
    verified: true,
    referralCode: "REF-ZAINAB",
  },
  {
    id: "seed-creator-femi",
    email: "femi.adisa@seed.monologg.dev",
    name: "Femi Adisa",
    niche: "MUSICIAN",
    location: "Ibadan",
    styleTags: ["Afrobeat", "Smooth", "Session Vocalist"],
    verified: false,
    referralCode: "REF-FEMI",
  },
];

interface ClientSeed {
  id: string;
  email: string;
  name: string;
  orgName: string;
  orgType: OrgType;
  location: string;
}

const CLIENTS: ClientSeed[] = [
  {
    id: "seed-client-self",
    email: "casting@seed.monologg.dev",
    name: "Ngozi Balogun",
    orgName: "General Casting Co",
    orgType: "STUDIO",
    location: "Lagos",
  },
  {
    id: "seed-client-filmcraft",
    email: "bookings@filmcraft-lagos.seed.monologg.dev",
    name: "FilmCraft Lagos",
    orgName: "FilmCraft Lagos",
    orgType: "STUDIO",
    location: "Lagos",
  },
  {
    id: "seed-client-eventpro",
    email: "bookings@eventpro-abuja.seed.monologg.dev",
    name: "EventPro Abuja",
    orgName: "EventPro Abuja",
    orgType: "EVENT",
    location: "Abuja",
  },
  {
    id: "seed-client-brandagency",
    email: "bookings@brandagency-ng.seed.monologg.dev",
    name: "Brand Agency NG",
    orgName: "Brand Agency NG",
    orgType: "BRAND",
    location: "Lagos",
  },
  {
    id: "seed-client-saharamedia",
    email: "bookings@sahara-media.seed.monologg.dev",
    name: "Sahara Media Group",
    orgName: "Sahara Media Group",
    orgType: "STUDIO",
    location: "Port Harcourt",
  },
  {
    id: "seed-client-greenline",
    email: "bookings@greenline-network.seed.monologg.dev",
    name: "Greenline Church Network",
    orgName: "Greenline Church Network",
    orgType: "CHURCH",
    location: "Enugu",
  },
];

async function seedCreators() {
  for (const c of CREATORS) {
    const user = await upsertUser(`${c.id}-user`, c.email, "TALENT");
    await prisma.creator.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        niche: c.niche,
        location: c.location,
        styleTags: c.styleTags,
        verification: c.verified ? "VERIFIED" : "UNVERIFIED",
        referralCode: c.referralCode,
      },
      create: {
        id: c.id,
        userId: user.id,
        name: c.name,
        niche: c.niche,
        location: c.location,
        styleTags: c.styleTags,
        verification: c.verified ? "VERIFIED" : "UNVERIFIED",
        referralCode: c.referralCode,
      },
    });
  }
}

async function seedClients() {
  for (const c of CLIENTS) {
    const user = await upsertUser(`${c.id}-user`, c.email, "CLIENT");
    await prisma.client.upsert({
      where: { id: c.id },
      update: { name: c.name, orgName: c.orgName, orgType: c.orgType, location: c.location },
      create: {
        id: c.id,
        userId: user.id,
        name: c.name,
        orgName: c.orgName,
        orgType: c.orgType,
        location: c.location,
      },
    });
  }
}

// From apps/web/src/mocks/services.ts — Chidi Okeke is the demo "self" talent-dashboard user.
async function seedRateCards() {
  const rateCards = [
    {
      id: "seed-ratecard-feature-film-audition",
      creatorId: "seed-creator-chidi",
      serviceTitle: "Feature Film Audition",
      basePriceAmount: nairaToKobo("₦120,000"),
      deliveryTimeline: "48 Hours",
    },
    {
      id: "seed-ratecard-commercial-vo",
      creatorId: "seed-creator-chidi",
      serviceTitle: "Commercial Voice-Over",
      basePriceAmount: nairaToKobo("₦45,000"),
      deliveryTimeline: "Same Day",
    },
    {
      id: "seed-ratecard-script-table-reading",
      creatorId: "seed-creator-chidi",
      serviceTitle: "Script Table Reading",
      basePriceAmount: nairaToKobo("₦80,000"),
      deliveryTimeline: "2–3 Days",
    },
    // One representative rate card per remaining creator, from apps/web/src/mocks/talents.ts.
    {
      id: "seed-ratecard-adaeze-vo-session",
      creatorId: "seed-creator-adaeze",
      serviceTitle: "Voice-Over Session",
      basePriceAmount: nairaToKobo("₦28,000"),
      deliveryTimeline: "Same Day",
    },
    {
      id: "seed-ratecard-kofi-compere-booking",
      creatorId: "seed-creator-kofi",
      serviceTitle: "Comedy / Compere Booking",
      basePriceAmount: nairaToKobo("₦60,000"),
      deliveryTimeline: "48 Hours",
    },
    {
      id: "seed-ratecard-amara-vo-session",
      creatorId: "seed-creator-amara",
      serviceTitle: "Voice-Over Session",
      basePriceAmount: nairaToKobo("₦35,000"),
      deliveryTimeline: "Same Day",
    },
    {
      id: "seed-ratecard-temi-content-package",
      creatorId: "seed-creator-temi",
      serviceTitle: "Content Creation Package",
      basePriceAmount: nairaToKobo("₦50,000"),
      deliveryTimeline: "3–5 Days",
    },
    {
      id: "seed-ratecard-ibrahim-acting-booking",
      creatorId: "seed-creator-ibrahim",
      serviceTitle: "Acting / Modelling Booking",
      basePriceAmount: nairaToKobo("₦90,000"),
      deliveryTimeline: "48 Hours",
    },
    {
      id: "seed-ratecard-zainab-keynote-address",
      creatorId: "seed-creator-zainab",
      serviceTitle: "Keynote / Sermon Address",
      basePriceAmount: nairaToKobo("₦70,000"),
      deliveryTimeline: "3–5 Days",
    },
    {
      id: "seed-ratecard-femi-session-vocals",
      creatorId: "seed-creator-femi",
      serviceTitle: "Session Vocals Recording",
      basePriceAmount: nairaToKobo("₦55,000"),
      deliveryTimeline: "2–3 Days",
    },
  ];

  for (const rc of rateCards) {
    await prisma.rateCard.upsert({
      where: { id: rc.id },
      update: {
        serviceTitle: rc.serviceTitle,
        basePriceAmount: rc.basePriceAmount,
        basePriceCurrency: "NGN",
        deliveryTimeline: rc.deliveryTimeline,
      },
      create: {
        id: rc.id,
        creatorId: rc.creatorId,
        serviceTitle: rc.serviceTitle,
        basePriceAmount: rc.basePriceAmount,
        basePriceCurrency: "NGN",
        deliveryTimeline: rc.deliveryTimeline,
      },
    });
  }
}

// From apps/web/src/mocks/clientProjects.ts — all owned by the "self" client user.
async function seedBriefs() {
  const briefs = [
    {
      id: "seed-brief-p001",
      projectName: "Nike Q1 Campaign",
      projectType: "Voice-Over",
      nicheReq: ["VO_ARTIST"] as Niche[],
      budgetAmount: nairaToKobo("₦200,000"),
      status: "ACTIVE" as const,
      // features.md Phase 14 (X4): a capped, still-open brief with two real
      // applicants (below) demonstrates the cap UI without being AT the cap.
      applicantCap: 3,
    },
    {
      id: "seed-brief-p002",
      projectName: "Tech Summit Compere",
      projectType: "Compere",
      nicheReq: ["COMPERE"] as Niche[],
      budgetAmount: nairaToKobo("₦120,000"),
      status: "IN_REVIEW" as const,
      applicantCap: null,
    },
    {
      id: "seed-brief-p003",
      projectName: "Fintech Radio Ads",
      projectType: "Voice-Over",
      nicheReq: ["VO_ARTIST"] as Niche[],
      budgetAmount: nairaToKobo("₦80,000"),
      status: "DRAFT" as const,
      applicantCap: null,
    },
    {
      id: "seed-brief-p004",
      projectName: "Film Auditions Jan 2025",
      projectType: "Actor",
      nicheReq: ["ACTOR"] as Niche[],
      budgetAmount: nairaToKobo("₦500,000"),
      status: "ACTIVE" as const,
      applicantCap: null, // uncapped, per features.md Phase 14's "null = uncapped"
    },
  ];

  for (const b of briefs) {
    await prisma.brief.upsert({
      where: { id: b.id },
      update: {
        projectName: b.projectName,
        projectType: b.projectType,
        nicheReq: b.nicheReq,
        budgetAmount: b.budgetAmount,
        budgetCurrency: "NGN",
        status: b.status,
        applicantCap: b.applicantCap,
      },
      create: {
        id: b.id,
        clientId: "seed-client-self",
        projectName: b.projectName,
        projectType: b.projectType,
        nicheReq: b.nicheReq,
        budgetAmount: b.budgetAmount,
        budgetCurrency: "NGN",
        status: b.status,
        applicantCap: b.applicantCap,
      },
    });
  }
}

// features.md Phase 14 (FA-2): two real applications on the capped
// "seed-brief-p001" (Adaeze Obi applied, Amara Diallo shortlisted) — both
// VO_ARTIST, matching p001's nicheReq — so PWA-14/16/17 all have real,
// non-empty demo data. Deliberately NOT at the cap (2 of 3) so the "still
// open, applying works" path is what a fresh demo session sees by default.
async function seedApplications() {
  const applications = [
    { id: "seed-application-adaeze-p001", briefId: "seed-brief-p001", creatorId: "seed-creator-adaeze", status: "APPLIED" as const, pitch: "I've voiced three prior Nike regional spots — happy to share reels." },
    { id: "seed-application-amara-p001", briefId: "seed-brief-p001", creatorId: "seed-creator-amara", status: "SHORTLISTED" as const, pitch: "Bilingual EN/FR delivery available if the campaign runs across West Africa." },
  ];

  for (const a of applications) {
    await prisma.application.upsert({
      where: { id: a.id },
      update: { status: a.status, pitch: a.pitch },
      create: { id: a.id, briefId: a.briefId, creatorId: a.creatorId, status: a.status, pitch: a.pitch },
    });
  }
}

interface BookingSeed {
  id: string;
  clientId: string;
  creatorId: string;
  rateCardId: string;
  projectName: string;
  baseAmount: number;
  state: "PENDING_PAYMENT" | "ESCROW_LOCKED" | "DELIVERABLES_PROVIDED" | "PAYMENT_RELEASED" | "CANCELLED" | "DISPUTED";
  payment: {
    status: "INITIATED" | "AUTHORIZED" | "ESCROW_HELD" | "RELEASED" | "REFUNDED" | "FAILED";
    escrowHeld: boolean;
  };
}

// One booking per BookingState (features.md Phase 2 spec), reusing the prototype's demo
// project names/amounts from apps/web/src/mocks/orders.ts where they overlap. CLIENT_ORDERS
// and TALENT_ORDERS are two independent per-dashboard demo scripts in the prototype (same
// project names, different amounts/counterparts) rather than one shared dataset — this seed
// doesn't invent a false reconciliation between them, it just draws on both as source values.
const BOOKINGS: BookingSeed[] = [
  {
    id: "seed-booking-pending-payment",
    clientId: "seed-client-self",
    creatorId: "seed-creator-chidi",
    rateCardId: "seed-ratecard-feature-film-audition",
    projectName: "Film Auditions Jan 2025",
    baseAmount: nairaToKobo("₦120,000"),
    state: "PENDING_PAYMENT",
    payment: { status: "INITIATED", escrowHeld: false },
  },
  {
    id: "seed-booking-escrow-locked",
    clientId: "seed-client-self",
    creatorId: "seed-creator-kofi",
    rateCardId: "seed-ratecard-kofi-compere-booking",
    projectName: "Tech Summit Compere",
    baseAmount: nairaToKobo("₦80,000"),
    state: "ESCROW_LOCKED",
    payment: { status: "ESCROW_HELD", escrowHeld: true },
  },
  {
    id: "seed-booking-deliverables-provided",
    clientId: "seed-client-self",
    creatorId: "seed-creator-adaeze",
    rateCardId: "seed-ratecard-adaeze-vo-session",
    projectName: "Nike Commercial VO",
    baseAmount: nairaToKobo("₦45,000"),
    state: "DELIVERABLES_PROVIDED",
    payment: { status: "ESCROW_HELD", escrowHeld: true },
  },
  {
    id: "seed-booking-payment-released",
    clientId: "seed-client-filmcraft",
    creatorId: "seed-creator-chidi",
    rateCardId: "seed-ratecard-feature-film-audition",
    projectName: "Nike Commercial VO",
    baseAmount: nairaToKobo("₦120,000"),
    state: "PAYMENT_RELEASED",
    payment: { status: "RELEASED", escrowHeld: false },
  },
  {
    id: "seed-booking-cancelled",
    clientId: "seed-client-eventpro",
    creatorId: "seed-creator-ibrahim",
    rateCardId: "seed-ratecard-ibrahim-acting-booking",
    projectName: "Corporate Event Hosting",
    baseAmount: nairaToKobo("₦90,000"),
    state: "CANCELLED",
    payment: { status: "REFUNDED", escrowHeld: false },
  },
  {
    id: "seed-booking-disputed",
    clientId: "seed-client-brandagency",
    creatorId: "seed-creator-ibrahim",
    rateCardId: "seed-ratecard-ibrahim-acting-booking",
    projectName: "Radio Ad Campaign",
    baseAmount: nairaToKobo("₦45,000"),
    state: "DISPUTED",
    payment: { status: "ESCROW_HELD", escrowHeld: true },
  },
];

async function seedBookings() {
  for (const b of BOOKINGS) {
    const { talentFeeAmount, clientFeeAmount } = computeFees(b.baseAmount);

    await prisma.booking.upsert({
      where: { id: b.id },
      update: {
        state: b.state,
        baseAmount: b.baseAmount,
        talentFeeAmount,
        clientFeeAmount,
      },
      create: {
        id: b.id,
        creatorId: b.creatorId,
        clientId: b.clientId,
        rateCardId: b.rateCardId,
        slotDate: new Date("2026-01-15"),
        slotStart: "10:00",
        slotEnd: "12:00",
        baseAmount: b.baseAmount,
        currency: "NGN",
        talentFeeAmount,
        clientFeeAmount,
        state: b.state,
      },
    });

    await prisma.payment.upsert({
      where: { bookingId: b.id },
      update: { status: b.payment.status, escrowHeld: b.payment.escrowHeld },
      create: {
        id: `${b.id}-payment`,
        bookingId: b.id,
        provider: "paystack",
        status: b.payment.status,
        escrowHeld: b.payment.escrowHeld,
        amount: b.baseAmount + clientFeeAmount,
        currency: "NGN",
      },
    });

    const orderRoom = await prisma.orderRoom.upsert({
      where: { bookingId: b.id },
      update: {},
      create: { id: `${b.id}-orderroom`, bookingId: b.id },
    });

    await prisma.message.upsert({
      where: { id: `${b.id}-message-1` },
      update: {},
      create: {
        id: `${b.id}-message-1`,
        orderRoomId: orderRoom.id,
        senderId: b.clientId,
        kind: "SYSTEM",
        content: `Booking created for "${b.projectName}".`,
      },
    });
    await prisma.message.upsert({
      where: { id: `${b.id}-message-2` },
      update: {},
      create: {
        id: `${b.id}-message-2`,
        orderRoomId: orderRoom.id,
        senderId: b.creatorId,
        kind: "TEXT",
        content: "Looking forward to this one — let me know if you need anything from my end.",
      },
    });
  }
}

// features.md Phase 13 (FA-1) — demonstrates the default-free rule on
// "seed-creator-chidi" (the demo self talent-dashboard user, per seedRateCards'
// own comment): a recurring weekday template, one exact-date override with a
// free morning + unavailable evening (both render on that day's detail), and
// one day that is DELIBERATELY left unconfigured — no AvailabilityBlock row
// at all — to prove an unconfigured day is still fully bookable across normal
// hours (the acceptance criterion this phase exists to satisfy).
async function seedAvailability() {
  await prisma.availabilityBlock.upsert({
    where: { id: "seed-availability-chidi-weekday-template" },
    update: {
      slots: [{ start: "09:00", end: "17:00", state: "free" }],
      isRecurring: true,
      recurRule: "WEEKDAYS",
    },
    create: {
      id: "seed-availability-chidi-weekday-template",
      creatorId: "seed-creator-chidi",
      date: new Date("2026-08-01"), // unused for a recurring template, kept non-null
      slots: [{ start: "09:00", end: "17:00", state: "free" }],
      isRecurring: true,
      recurRule: "WEEKDAYS",
    },
  });

  await prisma.availabilityBlock.upsert({
    where: { id: "seed-availability-chidi-morning-free-evening-unavailable" },
    update: {
      slots: [
        { start: "09:00", end: "13:00", state: "free" },
        { start: "18:00", end: "22:00", state: "unavailable" },
      ],
    },
    create: {
      id: "seed-availability-chidi-morning-free-evening-unavailable",
      creatorId: "seed-creator-chidi",
      date: new Date("2026-08-05"),
      slots: [
        { start: "09:00", end: "13:00", state: "free" },
        { start: "18:00", end: "22:00", state: "unavailable" },
      ],
      isRecurring: false,
    },
  });

  // 2026-08-06 is intentionally NOT seeded — an unconfigured day, fully open.
}

export async function seed() {
  await seedCreators();
  await seedClients();
  await seedRateCards();
  await seedBriefs();
  await seedBookings();
  await seedAvailability();
  await seedApplications();
  console.log(
    `Seeded ${CREATORS.length} creators, ${CLIENTS.length} clients, ${BOOKINGS.length} bookings (one per BookingState), availability (recurring weekday template + morning-free/evening-unavailable override + one intentionally unconfigured day), 2 applications on a capped brief.`,
  );
}

// Only auto-run when executed directly (`prisma db seed` / `tsx prisma/seed.ts`), not when
// imported — the integration test suite imports `seed()` to re-run it in-process rather than
// shelling out to a CLI.
//
// NOT a naive `file://${process.argv[1]}` string comparison (the previous form of this
// check) — that silently never matches when the repo path contains characters `file://`
// URLs percent-encode (this project's own path has a space: ".../figj monol/monologg/...",
// which import.meta.url renders as "...figj%20monol...") or when argv[1] is a relative path
// (`tsx prisma/seed.ts`, exactly how `package.json`'s `prisma.seed` invokes it, never resolves
// argv[1] to absolute). Both defeated the old check, meaning `prisma db seed` reported success
// while silently never calling `seed()` at all, in this environment. `pathToFileURL` resolves
// relative-to-absolute AND percent-encodes correctly, matching `import.meta.url`'s own format.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
