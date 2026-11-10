import { PrismaClient, UserType, BookingState, PaymentStatus, Niche, VerificationState, VerificationRecordingStatus, WithdrawalRequestStatus } from "@prisma/client";
import { prisma as defaultPrisma } from "../src/db/client.js";

// PRD Section 5/6: Platform fees
const TALENT_FEE_PERCENT = 11;
const CLIENT_FEE_PERCENT = 15;

function createSeededRandom(seed = 123456) {
  let s = seed;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SyntheticDatasetSummary {
  userCount: number;
  creatorCount: number;
  clientCount: number;
  bookingCount: number;
  paymentCount: number;
  ticketCount: number;
  eventCount: number;
  withdrawalCount: number;
}

/**
 * Generates deterministic synthetic dataset for local development and testing.
 * Strictly refuses to run in production.
 */
export async function generateSyntheticDataset(
  options: { seed?: number; cleanFirst?: boolean; db?: PrismaClient } = {}
): Promise<SyntheticDatasetSummary> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to generate synthetic data in production environment");
  }

  const db = options.db ?? defaultPrisma;
  const rand = createSeededRandom(options.seed ?? 98765);

  const NICHES: Niche[] = [
    "ACTOR",
    "VO_ARTIST",
    "COMEDIAN",
    "COMPERE",
    "SPEAKER_PASTOR",
    "MUSICIAN",
    "CONTENT_CREATOR",
  ];
  const LOCATIONS = ["Lagos, Nigeria", "London, UK", "New York, USA", "Accra, Ghana", "Nairobi, Kenya", "Toronto, Canada"];
  const CURRENCIES = ["NGN", "USD", "GBP"] as const;
  const COUNTRIES = ["NG", "GB", "US", "GH", "KE", "CA"];
  const ALL_STATES: BookingState[] = [
    "PENDING_PAYMENT",
    "ESCROW_LOCKED",
    "DELIVERABLES_PROVIDED",
    "PAYMENT_RELEASED",
    "CANCELLED",
    "DISPUTED",
  ];

  if (options.cleanFirst) {
    // Delete only synthetic test users and related records
    await db.productEvent.deleteMany({
      where: { userId: { startsWith: "syn-" } },
    });
    await db.user.deleteMany({
      where: { isTestUser: true, email: { contains: "synthetic-" } },
    });
  }

  const now = new Date();
  const DAY_MS = 24 * 60 * 60 * 1000;

  // 1. Generate 70 Creators + 50 Clients = 120 Users
  const creatorIds: string[] = [];
  const clientIds: string[] = [];
  const userIds: string[] = [];
  const rateCardIds: string[] = [];

  for (let i = 1; i <= 70; i++) {
    userIds.push(`syn-creator-${i}`);
    creatorIds.push(`syn-cr-profile-${i}`);
    rateCardIds.push(`syn-rc-${i}-1`);
  }
  for (let j = 1; j <= 50; j++) {
    userIds.push(`syn-client-${j}`);
    clientIds.push(`syn-cl-profile-${j}`);
  }

  const existingUserCount = await db.user.count({
    where: { isTestUser: true, email: { contains: "synthetic-" } },
  });

  if (options.cleanFirst || existingUserCount < 120) {
    // 70 Creators
    for (let i = 1; i <= 70; i++) {
      const daysAgo = Math.floor(rand() * 30);
      const createdAt = new Date(now.getTime() - daysAgo * DAY_MS);
      const lastActiveAt = new Date(createdAt.getTime() + Math.floor(rand() * 20) * DAY_MS);
      const userId = `syn-creator-${i}`;
      const creatorId = `syn-cr-profile-${i}`;
      const niche = NICHES[i % NICHES.length];
      const location = LOCATIONS[i % LOCATIONS.length];
      const isVerified = i % 3 === 0;
      const rcId1 = `syn-rc-${i}-1`;
      const rcId2 = `syn-rc-${i}-2`;

      await db.user.upsert({
        where: { email: `synthetic-creator-${i}@monologg.test` },
        create: {
          id: userId,
          email: `synthetic-creator-${i}@monologg.test`,
          passwordHash: "$2b$10$syntheticpasswordhashsyntheticpass000",
          userType: "TALENT",
          emailVerified: i % 4 !== 0,
          isTestUser: true,
          createdAt,
          lastActiveAt,
          creator: {
            create: {
              id: creatorId,
              name: `Synthetic Creator ${i}`,
              bio: `Creator in ${niche} creating high impact media.`,
              niche,
              location,
              verification: isVerified ? "VERIFIED" : "UNVERIFIED",
              referralCode: `SYNTHETIC${i}`,
              rateCards: {
                create: [
                  {
                    id: rcId1,
                    serviceTitle: "Standard Reel",
                    deliveryTimeline: "48 hours",
                    basePriceCurrency: CURRENCIES[i % 3],
                    basePriceAmount: 5000000 + (i * 100000),
                  },
                  {
                    id: rcId2,
                    serviceTitle: "Story Integration",
                    deliveryTimeline: "24 hours",
                    basePriceCurrency: CURRENCIES[(i + 1) % 3],
                    basePriceAmount: 2500000 + (i * 50000),
                  },
                ],
              },
              media: {
                create: [
                  {
                    id: `syn-media-${i}-1`,
                    kind: "VIDEO",
                    url: `https://storage.monologg.test/portfolio-${i}.mp4`,
                    sizeBytes: 10485760,
                  },
                ],
              },
            },
          },
        },
        update: {},
      });

      // Verification recording for some creators
      if (i % 2 === 0) {
        await db.verificationRecording.upsert({
          where: { id: `syn-rec-${i}` },
          create: {
            id: `syn-rec-${i}`,
            creatorId,
            url: `https://storage.monologg.test/recording-${i}.mp4`,
            durationSec: 35,
            guidelineAck: true,
            status: (i % 4 === 0 ? "APPROVED" : "IN_REVIEW") as VerificationRecordingStatus,
            createdAt,
          },
          update: {},
        });
      }
    }

    // 50 Clients
    for (let j = 1; j <= 50; j++) {
      const daysAgo = Math.floor(rand() * 30);
      const createdAt = new Date(now.getTime() - daysAgo * DAY_MS);
      const lastActiveAt = new Date(createdAt.getTime() + Math.floor(rand() * 15) * DAY_MS);
      const userId = `syn-client-${j}`;
      const clientId = `syn-cl-profile-${j}`;

      await db.user.upsert({
        where: { email: `synthetic-client-${j}@monologg.test` },
        create: {
          id: userId,
          email: `synthetic-client-${j}@monologg.test`,
          passwordHash: "$2b$10$syntheticpasswordhashsyntheticpass000",
          userType: "CLIENT",
          emailVerified: j % 5 !== 0,
          isTestUser: true,
          createdAt,
          lastActiveAt,
          client: {
            create: {
              id: clientId,
              name: `Client Executive ${j}`,
              orgName: `Brand Studio ${j}`,
              location: LOCATIONS[j % LOCATIONS.length],
            },
          },
        },
        update: {},
      });
    }
  }
  console.log(`[synthetic-data] Users verified: 120 users (${creatorIds.length} creators, ${clientIds.length} clients)`);

  // 2. Generate Bookings across all 11 states in NGN, USD, GBP
  let bookingCount = 0;
  let paymentCount = 0;
  let ticketCount = 0;
  let withdrawalCount = 0;

  for (let b = 0; b < 60; b++) {
    const state = ALL_STATES[b % ALL_STATES.length];
    const currency = CURRENCIES[b % CURRENCIES.length];
    const creatorId = creatorIds[b % creatorIds.length];
    const clientId = clientIds[b % clientIds.length];
    const rateCardId = rateCardIds[b % rateCardIds.length];
    const baseAmount = 10000000 + (b * 500000); // minor units
    const talentFee = Math.round((baseAmount * TALENT_FEE_PERCENT) / 100);
    const clientFee = Math.round((baseAmount * CLIENT_FEE_PERCENT) / 100);
    const totalAmount = baseAmount + clientFee;
    const bookingId = `syn-booking-${b + 1}`;

    const daysAgo = 28 - Math.floor((b / 60) * 26);
    const createdAt = new Date(now.getTime() - daysAgo * DAY_MS);

    await db.booking.upsert({
      where: { id: bookingId },
      create: {
        id: bookingId,
        creatorId,
        clientId,
        rateCardId,
        state,
        currency,
        slotDate: createdAt,
        slotStart: "10:00",
        slotEnd: "11:00",
        baseAmount,
        talentFeeAmount: talentFee,
        clientFeeAmount: clientFee,
        createdAt,
      },
      update: {},
    });
    bookingCount++;

    // Generate Payment row if state reached or passed PENDING_PAYMENT
    const paymentId = `syn-pay-${b + 1}`;
    const isHeld = ["ESCROW_LOCKED", "DELIVERABLES_PROVIDED", "DISPUTED"].includes(state);
    const isReleased = state === "PAYMENT_RELEASED";
    const isRefunded = state === "CANCELLED";

    let status: PaymentStatus = "INITIATED";
    if (isHeld) status = "ESCROW_HELD";
    else if (isReleased) status = "RELEASED";
    else if (isRefunded) status = "REFUNDED";

      await db.payment.upsert({
        where: { id: paymentId },
        create: {
          id: paymentId,
          bookingId,
          amount: totalAmount,
          currency,
          provider: "paystack",
          providerRef: `pstk_syn_${b + 1}`,
          status,
          escrowHeld: isHeld,
          createdAt,
          events: {
            create: [
              {
                id: `syn-pay-evt-${b + 1}-1`,
                type: "charge.initiated",
                eventId: `evt_syn_${b + 1}_init`,
                raw: { status: "initiated", amount: totalAmount },
                createdAt,
              },
            ],
          },
        },
        update: {},
      });
      paymentCount++;

    // Support ticket for disputed or some bookings
    if (state === "DISPUTED" || b % 15 === 0) {
      await db.supportTicket.upsert({
        where: { id: `syn-ticket-${b + 1}` },
        create: {
          id: `syn-ticket-${b + 1}`,
          userId: userIds[b % userIds.length],
          subject: `Dispute or Inquiry regarding Booking #${b + 1}`,
          message: "Booking details inquiry from user",
          status: state === "DISPUTED" ? "OPEN" : "RESOLVED",
          createdAt,
        },
        update: {},
      });
      ticketCount++;
    }
  }

  // 3. Withdrawals (some flagged, some cleared, some pending)
  for (let w = 1; w <= 15; w++) {
    const creatorUserId = userIds[w % 70]; // Creator User ID
    const currency = CURRENCIES[w % CURRENCIES.length];
    const amount = 3000000 + w * 200000;
    const isFlagged = w % 4 === 0;
    const isCleared = w % 8 === 0;

    await db.withdrawalRequest.upsert({
      where: { id: `syn-wth-${w}` },
      create: {
        id: `syn-wth-${w}`,
        userId: creatorUserId,
        amount,
        currency,
        bankName: "Guaranty Trust Bank",
        accountNumber: "0123456789",
        accountName: "Synthetic Creator",
        status: (isFlagged ? "PENDING_OTP" : (w % 3 === 0 ? "COMPLETED" : "APPROVED")) as WithdrawalRequestStatus,
        flagged: isFlagged,
        flagReason: isFlagged ? "Velocity check triggered: high initial withdrawal" : null,
        flaggedAt: isFlagged ? new Date() : null,
        flaggedByAdminId: isFlagged ? "admin-system" : null,
        clearedAt: isCleared ? new Date() : null,
        clearedByAdminId: isCleared ? "admin-super" : null,
        createdAt: new Date(now.getTime() - (30 - w) * DAY_MS),
      },
      update: {},
    });
    withdrawalCount++;
  }
  console.log(`[synthetic-data] Upserted ${bookingCount} bookings, ${paymentCount} payments, ${ticketCount} tickets, and ${withdrawalCount} withdrawals`);

  // 4. Generate ~1,000 ProductEvent rows distributed over 30 days
  const eventRows: any[] = [];
  const eventCatalogue = [
    { name: "page_view", props: { path: "/marketplace", referrerDomain: "google.com" } },
    { name: "public_profile_viewed", props: { viaShareLink: true } },
    { name: "booking_started", props: { origin: "DIRECT", currency: "NGN", amountMinor: 20000000 } },
    { name: "slot_selected", props: { origin: "CALENDAR" } },
    { name: "checkout_started", props: { currency: "NGN", amountMinor: 20000000 } },
    { name: "payment_initiated", props: { currency: "NGN", amountMinor: 20000000 } },
    { name: "escrow_locked", props: { currency: "NGN", amountMinor: 20000000 } },
    { name: "deliverables_provided", props: {} },
    { name: "release_approved", props: { currency: "NGN", amountMinor: 20000000 } },
    { name: "message_sent", props: { kind: "TEXT" } },
    { name: "withdrawal_requested", props: { currency: "NGN", amountMinor: 5000000 } },
  ];

  for (let e = 1; e <= 1000; e++) {
    const daysAgo = Math.floor(rand() * 30);
    const hour = Math.floor(rand() * 24);
    const minute = Math.floor(rand() * 60);
    const occurredAt = new Date(now.getTime() - (daysAgo * DAY_MS) + (hour * 3600 * 1000) + (minute * 60 * 1000));

    const item = eventCatalogue[e % eventCatalogue.length];
    const isUser = e % 4 !== 0;
    const userId = isUser ? userIds[e % userIds.length] : null;
    const country = COUNTRIES[e % COUNTRIES.length];

    eventRows.push({
      occurredAt,
      name: item.name,
      actorType: isUser ? "USER" : "ANON",
      source: "WEB",
      userId,
      anonymousId: !isUser ? `anon-syn-${e}` : null,
      country,
      deviceClass: e % 2 === 0 ? "mobile" : "desktop",
      browser: e % 3 === 0 ? "Chrome" : "Safari",
      os: e % 2 === 0 ? "iOS" : "macOS",
      props: item.props,
    });
  }

  await db.productEvent.createMany({
    data: eventRows,
  });

  return {
    userCount: 120,
    creatorCount: 70,
    clientCount: 50,
    bookingCount,
    paymentCount,
    ticketCount,
    eventCount: eventRows.length,
    withdrawalCount,
  };
}

// Standalone CLI execution
if (process.argv[1]?.endsWith("generate-synthetic-data.ts")) {
  console.log("Generating deterministic synthetic dataset...");
  generateSyntheticDataset({ cleanFirst: false })
    .then((summary) => {
      console.log("Synthetic dataset generated successfully:", summary);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Failed to generate synthetic dataset:", err);
      process.exit(1);
    });
}
