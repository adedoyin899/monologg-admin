import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "./app.js";
import { generateAccessToken } from "./services/auth.js";

// ---------------------------------------------------------------------------
// features.md Phase 12 gate: "a few full e2e happy paths (register → book →
// pay → release) pass end-to-end in all-mock mode." The literal register/
// login leg is already the subject of routes/auth.test.ts's own dedicated
// "Full end-to-end chain: register → verify-email → login → protected route
// → refresh → logout" test — duplicating that mocking here would test nothing
// new. This file picks up right where an authenticated session begins (the
// same shortcut routes/bookings.test.ts and routes/webhooks.test.ts already
// take: an access token minted directly via generateAccessToken) and is the
// one place that proves the REST of the chain — book → pay → webhook →
// deliver → approve — actually holds together across route boundaries as one
// continuous flow, not just as isolated per-route tests with fresh mocks
// every time. Together the two files cover the full literal path.
//
// Runs entirely against a mocked Prisma client (no real DB/network) — a small
// hand-rolled stateful fake (bookingRow/paymentRow below) so that state
// written by one step (e.g. POST /pay creating a Payment) is what the next
// step (the webhook, then /deliver, then /approve) actually reads back, the
// way a real database would. NODE_ENV=test also means providers/index.ts
// resolves every provider to its mock automatically (no vi.mock needed for
// PaymentProvider) — only the notification/calendar side-effects are
// stubbed out, exactly as the per-route tests already do, since this flow
// isn't what proves those work (services/notifications.test.ts,
// services/calendar.test.ts own that).
// ---------------------------------------------------------------------------

let bookingRow: any;
let paymentRow: any;

function bookingSnapshot() {
  return {
    ...bookingRow,
    creator: { userId: "user-talent-1" },
    client: { userId: "user-client-1" },
    payment: paymentRow ? { ...paymentRow } : null,
  };
}

vi.mock("./db/client.js", () => ({
  prisma: {
    client: {
      findUnique: vi.fn().mockResolvedValue({ id: "client-1", userId: "user-client-1" }),
    },
    // features.md Phase 13: createBooking claims the slot atomically via
    // services/availability.ts's bookSlot inside the same transaction — no
    // existing block for this day, no calendar connection, so the requested
    // slot is open (this flow isn't exercising Phase 13's own logic, just
    // needs it to not crash the transaction it now runs inside).
    creator: { findUnique: vi.fn().mockResolvedValue(null) },
    availabilityBlock: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
    $executeRaw: vi.fn().mockResolvedValue(undefined),
    rateCard: {
      findUnique: vi.fn().mockResolvedValue({
        id: "rc-1",
        creatorId: "creator-1",
        basePriceAmount: 200_000_00, // ₦200,000 in kobo
        basePriceCurrency: "NGN",
        creator: { userId: "user-talent-1" },
      }),
    },
    booking: {
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
    paymentEvent: {
      create: vi.fn().mockResolvedValue({ id: "pe-1" }),
    },
    $transaction: vi.fn((arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(prismaMock))),
  },
}));

vi.mock("./providers/index.js", async () => {
  const actual = await vi.importActual<typeof import("./providers/index.js")>("./providers/index.js");
  return {
    ...actual,
    notifyProvider: { email: vi.fn(), sms: vi.fn(), inApp: vi.fn().mockResolvedValue(undefined) },
  };
});

vi.mock("./services/notifications.js", () => ({
  enqueueEmailNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./services/calendar.js", () => ({
  createMeetForBooking: vi.fn().mockResolvedValue(null),
}));

import { prisma } from "./db/client.js";
const prismaMock = prisma as any;

const TALENT_TOKEN = generateAccessToken({ userId: "user-talent-1", userType: "TALENT", email: "t@monologg.dev" });
const CLIENT_TOKEN = generateAccessToken({ userId: "user-client-1", userType: "CLIENT", email: "c@monologg.dev" });

describe("Phase 12 e2e happy path: book → pay → webhook → deliver → approve (all-mock)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    bookingRow = undefined;
    paymentRow = undefined;
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it("takes a booking from creation through funded escrow to released payment", async () => {
    // 1. Client creates a booking.
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/bookings",
      headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      payload: {
        creatorId: "creator-1",
        rateCardId: "rc-1",
        slotDate: "2026-08-01",
        slotStart: "10:00",
        slotEnd: "11:00",
      },
    });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.json();
    expect(created.state).toBe("PENDING_PAYMENT");
    const bookingId = created.id;

    // 2. Client initiates payment — escrow charge, still PENDING_PAYMENT
    //    (only the webhook, not this call, ever advances state).
    const payRes = await app.inject({
      method: "POST",
      url: `/api/v1/bookings/${bookingId}/pay`,
      headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
    });
    expect(payRes.statusCode).toBe(200);
    const { providerRef, status: initiatedStatus } = payRes.json();
    expect(initiatedStatus).toBe("INITIATED");
    expect(bookingRow.state).toBe("PENDING_PAYMENT");

    // 3. Paystack webhook confirms the charge — the ONLY thing allowed to lock escrow.
    const webhookPayload = JSON.stringify({
      event: "charge.success",
      data: { id: 999, reference: providerRef, status: "success" },
    });
    const webhookRes = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/paystack",
      payload: webhookPayload,
      headers: { "content-type": "application/json", "x-paystack-signature": "mock-signature-always-valid" },
    });
    expect(webhookRes.statusCode).toBe(200);
    expect(webhookRes.json()).toMatchObject({ received: true, processed: true });
    expect(bookingRow.state).toBe("ESCROW_LOCKED");
    expect(paymentRow.status).toBe("ESCROW_HELD");

    // 4. Talent marks deliverables provided.
    const deliverRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/bookings/${bookingId}/deliver`,
      headers: { authorization: `Bearer ${TALENT_TOKEN}` },
    });
    expect(deliverRes.statusCode).toBe(200);
    expect(deliverRes.json().state).toBe("DELIVERABLES_PROVIDED");

    // 5. Client approves — releases escrow to the talent.
    const approveRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/bookings/${bookingId}/approve`,
      headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
    });
    expect(approveRes.statusCode).toBe(200);
    expect(approveRes.json().status).toBe("RELEASED");
    expect(bookingRow.state).toBe("PAYMENT_RELEASED");

    // A client-side "success" callback was never the authority at any point —
    // only the webhook call above ever set ESCROW_LOCKED, and only /approve
    // (server-side, client-authenticated) ever set PAYMENT_RELEASED.
  });

  it("never lets a client-side callback substitute for the webhook: state stays PENDING_PAYMENT until the webhook fires", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/bookings",
      headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      payload: { creatorId: "creator-1", rateCardId: "rc-1", slotDate: "2026-08-01", slotStart: "10:00", slotEnd: "11:00" },
    });
    const bookingId = createRes.json().id;

    await app.inject({
      method: "POST",
      url: `/api/v1/bookings/${bookingId}/pay`,
      headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
    });

    // No webhook call at all — booking must still be unpaid.
    expect(bookingRow.state).toBe("PENDING_PAYMENT");

    // Approve is illegal from PENDING_PAYMENT (only legal from DELIVERABLES_PROVIDED).
    const approveRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/bookings/${bookingId}/approve`,
      headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
    });
    expect(approveRes.statusCode).toBe(409);
  });
});
