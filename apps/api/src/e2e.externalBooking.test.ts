import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "./app.js";
import { mockCacheProvider } from "./providers/cache.mock.js";
import { generateAccessToken } from "./services/auth.js";

// ---------------------------------------------------------------------------
// features.md Phase 16 (FA-5) gate: "Full logged-out e2e: browse → configure →
// context → name/email → pay → on success an account exists, booking attached,
// ESCROW_LOCKED, order room open, talent notified." Mirrors e2e.happyPath.test.ts's
// approach: a small hand-rolled stateful fake Prisma client so state written by
// one step (guest booking creation) is what the next step (pay-init, webhook,
// order-room read) actually reads back — proving the whole external flow holds
// together across route boundaries, not just as isolated per-route tests.
//
// Also covers the two guardrails Phase 16 calls out as the flagship's highest-
// coverage requirements: the order room is UNREACHABLE before ESCROW_LOCKED, and
// the auto-created account is genuinely surfaced (set-password email issued, its
// token usable to obtain a real session) only once escrow is actually funded.
// ---------------------------------------------------------------------------

let userRow: any;
let bookingRow: any;
let paymentRow: any;
const messages: any[] = [];

const CLIENT_ID = "client-e2e-1";
const CREATOR_USER_ID = "user-talent-e2e-1";

function bookingSnapshot() {
  return {
    ...bookingRow,
    creator: { userId: CREATOR_USER_ID },
    client: { id: CLIENT_ID, userId: userRow?.id, user: userRow ? { ...userRow } : undefined },
    payment: paymentRow ? { ...paymentRow } : null,
    orderRoom: bookingRow ? { id: "order-room-e2e-1" } : null,
  };
}

vi.mock("./db/client.js", () => ({
  prisma: {
    rateCard: {
      findUnique: vi.fn().mockResolvedValue({
        id: "rc-1",
        creatorId: "creator-1",
        basePriceAmount: 200_000_00,
        basePriceCurrency: "NGN",
      }),
    },
    creator: { findUnique: vi.fn().mockResolvedValue(null) },
    availabilityBlock: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
    booking: {
      findMany: vi.fn().mockResolvedValue([]), // releaseExpiredHolds: nothing to expire
      create: vi.fn((args: any) => {
        bookingRow = { id: "booking-e2e-1", ...args.data };
        delete bookingRow.orderRoom;
        return Promise.resolve(bookingSnapshot());
      }),
      findUnique: vi.fn(() => Promise.resolve(bookingRow ? bookingSnapshot() : null)),
      findUniqueOrThrow: vi.fn(() =>
        bookingRow ? Promise.resolve(bookingSnapshot()) : Promise.reject(new Error("booking not found")),
      ),
      update: vi.fn((args: any) => {
        Object.assign(bookingRow, args.data);
        return Promise.resolve(bookingSnapshot());
      }),
    },
    user: {
      findUnique: vi.fn(() => Promise.resolve(null)), // always a brand-new guest email in this flow
      create: vi.fn((args: any) => {
        userRow = { ...args.data };
        delete userRow.client;
        userRow.id = "user-e2e-guest-1";
        return Promise.resolve({ ...userRow, client: { id: CLIENT_ID, ...args.data.client.create } });
      }),
      update: vi.fn((args: any) => {
        Object.assign(userRow, args.data);
        return Promise.resolve({ ...userRow });
      }),
    },
    refreshToken: {
      create: vi.fn().mockResolvedValue({ id: "refresh-e2e-1" }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    payment: {
      create: vi.fn((args: any) => {
        paymentRow = { id: "payment-e2e-1", ...args.data };
        return Promise.resolve({ ...paymentRow });
      }),
      update: vi.fn((args: any) => {
        Object.assign(paymentRow, args.data);
        return Promise.resolve({ ...paymentRow });
      }),
      updateMany: vi.fn((args: any) => {
        const matchesId = paymentRow?.id === args.where.id;
        const matchesStatus = !args.where.status || paymentRow?.status === args.where.status;
        if (matchesId && matchesStatus) {
          Object.assign(paymentRow, args.data);
          return Promise.resolve({ count: 1 });
        }
        return Promise.resolve({ count: 0 });
      }),
      findUnique: vi.fn((args: any) => {
        if (!paymentRow) return Promise.resolve(null);
        if (args.where.providerRef && paymentRow.providerRef !== args.where.providerRef) return Promise.resolve(null);
        return Promise.resolve({ ...paymentRow });
      }),
      findUniqueOrThrow: vi.fn(() =>
        paymentRow ? Promise.resolve({ ...paymentRow }) : Promise.reject(new Error("payment not found")),
      ),
    },
    paymentEvent: { create: vi.fn().mockResolvedValue({ id: "pe-e2e-1" }) },
    message: {
      create: vi.fn((args: any) => {
        const message = { id: `msg-${messages.length + 1}`, createdAt: new Date(), ...args.data };
        messages.push(message);
        return Promise.resolve(message);
      }),
      findMany: vi.fn(() => Promise.resolve([...messages])),
      count: vi.fn(() => Promise.resolve(messages.length)),
    },
    $executeRaw: vi.fn().mockResolvedValue(undefined),
    $transaction: vi.fn((arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(prismaMock))),
  },
}));

vi.mock("./providers/index.js", async () => {
  const actual = await vi.importActual<typeof import("./providers/index.js")>("./providers/index.js");
  return {
    ...actual,
    notifyProvider: { email: vi.fn().mockResolvedValue(undefined), sms: vi.fn(), inApp: vi.fn().mockResolvedValue(undefined) },
  };
});

vi.mock("./services/notifications.js", () => ({
  enqueueEmailNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./services/calendar.js", () => ({
  createMeetForBooking: vi.fn().mockResolvedValue(null),
}));

import { prisma } from "./db/client.js";
import { notifyProvider } from "./providers/index.js";
const prismaMock = prisma as any;
const notifyProviderMock = notifyProvider as any;

describe("Phase 16 e2e (FA-5): logged-out browse → guest booking → pay → webhook → account surfaced", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    userRow = undefined;
    bookingRow = undefined;
    paymentRow = undefined;
    messages.length = 0;
    mockCacheProvider.clear();
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it("takes a logged-out visitor from guest booking through funded escrow, with the auto-account surfaced and the order room gated on escrow", async () => {
    // 1–5. Configure + context + name/email, all bundled into one guest-booking
    // create call (no auth header — this whole flow is unauthenticated).
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/public/bookings",
      payload: {
        creatorId: "creator-1",
        rateCardId: "rc-1",
        slotDate: "2026-08-10",
        slotStart: "10:00",
        slotEnd: "11:00",
        contextNote: "A 30-second product voiceover for a launch video.",
        name: "Jamie Guest",
        email: "jamie.guest@example.com",
      },
    });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.json();
    expect(created.state).toBe("PENDING_PAYMENT");
    expect(created.origin).toBe("PUBLIC_LINK");
    expect(created.contextNote).toBe("A 30-second product voiceover for a launch video.");
    expect(created.slotHoldExpiresAt).toBeTruthy();
    const bookingId = created.id;

    // The account materialized quietly (X7) but is not yet surfaced — no
    // set-password email has been sent, and the account can't log in yet.
    expect(userRow.accountOrigin).toBe("AUTO_CHECKOUT");
    expect(userRow.passwordSet).toBe(false);
    expect(notifyProviderMock.email).not.toHaveBeenCalledWith(
      "jamie.guest@example.com",
      "set_password",
      expect.anything(),
    );

    // Escrow-first: the order room is unreachable before payment — even with no
    // real session to check, this is what "chat gates on ESCROW_LOCKED" protects.
    const preEscrowMessages = await app.inject({
      method: "GET",
      url: `/api/v1/order-rooms/${bookingId}/messages`,
      headers: { authorization: `Bearer ${fakeSessionFor(userRow.id)}` },
    });
    expect(preEscrowMessages.statusCode).toBe(403);

    // 6. Payment → fund escrow. No session required for this door either.
    const payRes = await app.inject({ method: "POST", url: `/api/v1/public/bookings/${bookingId}/pay` });
    expect(payRes.statusCode).toBe(200);
    const { providerRef } = payRes.json();
    expect(bookingRow.state).toBe("PENDING_PAYMENT"); // still — only the webhook advances state

    // 7. Paystack webhook confirms the charge — the only authority that can lock escrow.
    const webhookRes = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/paystack",
      payload: JSON.stringify({ event: "charge.success", data: { id: 4242, reference: providerRef, status: "success" } }),
      headers: { "content-type": "application/json", "x-paystack-signature": "mock-signature-always-valid" },
    });
    expect(webhookRes.statusCode).toBe(200);
    expect(webhookRes.json()).toMatchObject({ received: true, processed: true });
    expect(bookingRow.state).toBe("ESCROW_LOCKED");
    expect(paymentRow.status).toBe("ESCROW_HELD");

    // Talent notified — the generic escrow-lock notification, origin-agnostic.
    expect(notifyProviderMock.inApp).toHaveBeenCalledWith(
      CREATOR_USER_ID,
      expect.objectContaining({ kind: "payment_escrow_locked", bookingId }),
    );

    // The auto-account is NOW surfaced: a set-password/magic-link email went out.
    const setPasswordCall = notifyProviderMock.email.mock.calls.find((c: any[]) => c[1] === "set_password");
    expect(setPasswordCall).toBeDefined();
    const [, , emailData] = setPasswordCall;
    const setPasswordToken = emailData.token as string;
    expect(await mockCacheProvider.get(`auth:reset:${setPasswordToken}`)).toBe(userRow.id);

    // The order room is now reachable.
    const postEscrowMessages = await app.inject({
      method: "GET",
      url: `/api/v1/order-rooms/${bookingId}/messages`,
      headers: { authorization: `Bearer ${fakeSessionFor(userRow.id)}` },
    });
    expect(postEscrowMessages.statusCode).toBe(200);

    // 8. PWA-19: the emailed link both sets a password AND logs the buyer in —
    // this is the literal "buyer lands in dashboard" moment.
    const setPasswordRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/reset-password",
      payload: { token: setPasswordToken, password: "a-real-password-now" },
    });
    expect(setPasswordRes.statusCode).toBe(200);
    const session = setPasswordRes.json();
    expect(session.accessToken).toBeDefined();
    expect(session.user.userId).toBe(userRow.id);
    expect(userRow.passwordSet).toBe(true);
  });

  it("existing-email attach: a second guest checkout under the same email reuses the account, no duplicate", async () => {
    const first = await app.inject({
      method: "POST",
      url: "/api/v1/public/bookings",
      payload: {
        creatorId: "creator-1",
        rateCardId: "rc-1",
        slotDate: "2026-08-10",
        slotStart: "10:00",
        slotEnd: "11:00",
        name: "Jamie Guest",
        email: "jamie.guest@example.com",
      },
    });
    expect(first.statusCode).toBe(201);
    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);

    // A second booking under the SAME email — findUnique now resolves the
    // already-created row (simulating the real "existing user" branch).
    prismaMock.user.findUnique.mockResolvedValueOnce({ ...userRow, client: { id: CLIENT_ID } });
    prismaMock.availabilityBlock.findFirst.mockResolvedValueOnce(null);

    const second = await app.inject({
      method: "POST",
      url: "/api/v1/public/bookings",
      payload: {
        creatorId: "creator-1",
        rateCardId: "rc-1",
        slotDate: "2026-08-11",
        slotStart: "14:00",
        slotEnd: "15:00",
        name: "Jamie Guest",
        email: "jamie.guest@example.com",
      },
    });
    expect(second.statusCode).toBe(201);
    // Still only ever created once.
    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
  });
});

// Server-side JWT minting for the order-room escrow-gate assertions — mirrors
// the shortcut routes/bookings.test.ts and routes/webhooks.test.ts already
// take (a directly-minted access token stands in for a real login/session,
// since proving login itself isn't this file's job — routes/auth.test.ts owns
// that, including the passwordSet:false gate this exact user would hit before
// completing the PWA-19 step above).
function fakeSessionFor(userId: string): string {
  return generateAccessToken({ userId, userType: "CLIENT", email: "jamie.guest@example.com" });
}
