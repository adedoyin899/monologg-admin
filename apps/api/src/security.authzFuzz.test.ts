import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "./app.js";
import { generateAccessToken } from "./services/auth.js";

// ---------------------------------------------------------------------------
// features.md Phase 17 — QA/security gate: "Authorization fuzzing: attempt
// every cross-tenant access (user A → user B's bookings, messages, briefs,
// payouts) and confirm 403 across the board." Most owner-scoped routes
// already carry their own per-route stranger-token test (bookings.test.ts,
// briefs.test.ts, orderRooms.test.ts, rateCards.test.ts, projects.test.ts,
// availability.test.ts) — this file exists for what a systematic sweep of
// EVERY route actually found, not to duplicate what's already covered:
//
//   1. A REAL, confirmed finding: PATCH /verification-recordings/:id/review
//      (routes/verification.ts) has NO ownership/role check at all — flagged
//      in that file's own comment as a "KNOWN GAP" (no moderator role exists
//      yet), and routes/verification.test.ts's existing tests already call it
//      with a generic "OTHER_TOKEN" and assert success, which is correct
//      behavior for the code as written but never demonstrates the actual
//      blast radius. This test proves the sharpest version: a talent can
//      self-approve their OWN identity verification. See
//      qa/2026-07-31-phase17/security.md — this is a P0/P1 pre-cutover
//      finding, NOT fixed here (building a moderator-role system is feature
//      work, out of this phase's scope per its own "does not add features"
//      rule).
//   2. calendarEvents.ts's PATCH/DELETE ownership checks (correct code,
//      confirmed by reading it, but had zero test coverage before this file).
//   3. A consolidated cross-resource sweep: one stranger token against every
//      participant-scoped booking/order-room action on the same booking, in
//      one place, matching the spec's literal "bookings, messages" phrasing.
// ---------------------------------------------------------------------------

vi.mock("./db/client.js", () => ({
  prisma: {
    verificationRecording: { findUnique: vi.fn(), update: vi.fn() },
    creator: { findUnique: vi.fn() },
    calendarEvent: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    booking: { findUnique: vi.fn() },
    message: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("./providers/index.js", () => ({
  notifyProvider: { email: vi.fn(), sms: vi.fn(), inApp: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("./services/notifications.js", () => ({
  enqueueEmailNotification: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "./db/client.js";
const prismaMock = prisma as any;

const TALENT_A = generateAccessToken({ userId: "user-talent-a", userType: "TALENT", email: "a@monologg.dev" });
const STRANGER = generateAccessToken({ userId: "user-stranger", userType: "TALENT", email: "stranger@monologg.dev" });
const STRANGER_CLIENT = generateAccessToken({ userId: "user-stranger-client", userType: "CLIENT", email: "sc@monologg.dev" });

describe("Authorization fuzzing (features.md Phase 17 gate)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("FINDING: verification review has no ownership check (routes/verification.ts)", () => {
    it("a talent can self-approve their OWN verification recording — no independent reviewer required", async () => {
      // The recording belongs to creator "creator-a" (owned by user-talent-a) — the SAME
      // identity submitting the review below. Nothing in the route or
      // services/verificationRecording.ts's reviewVerificationRecording ever checks who's
      // calling against who owns the recording, or requires any reviewer/moderator role.
      prismaMock.verificationRecording.findUnique.mockResolvedValue({
        id: "rec-self",
        creatorId: "creator-a",
        status: "IN_REVIEW",
      });
      prismaMock.verificationRecording.update.mockResolvedValue({
        id: "rec-self",
        status: "APPROVED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/verification-recordings/rec-self/review",
        headers: { authorization: `Bearer ${TALENT_A}` }, // the recording's OWN creator
        payload: { status: "APPROVED" },
      });

      // Documents current (gap) behavior: this SUCCEEDS. A fixed system would reject
      // self-review with 403. Tracked as a P0/P1 pre-cutover finding — see
      // qa/2026-07-31-phase17/security.md — not remediated in this QA-only phase.
      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("APPROVED");
    });
  });

  describe("calendarEvents.ts — confirmatory ownership check (correct code, previously untested)", () => {
    const EVENT = { id: "evt-1", creatorId: "creator-a", date: new Date(), start: "09:00", end: "10:00", title: "Table read", kind: "personal" };

    it("403s a stranger's PATCH on another creator's calendar event", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-stranger", userId: "user-stranger" });
      prismaMock.calendarEvent.findUnique.mockResolvedValue(EVENT);

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/calendar-events/evt-1",
        headers: { authorization: `Bearer ${STRANGER}` },
        payload: { title: "Hijacked" },
      });

      expect(response.statusCode).toBe(403);
      expect(prismaMock.calendarEvent.update).not.toHaveBeenCalled();
    });

    it("403s a stranger's DELETE on another creator's calendar event", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-stranger", userId: "user-stranger" });
      prismaMock.calendarEvent.findUnique.mockResolvedValue(EVENT);

      const response = await app.inject({
        method: "DELETE",
        url: "/api/v1/calendar-events/evt-1",
        headers: { authorization: `Bearer ${STRANGER}` },
      });

      expect(response.statusCode).toBe(403);
      expect(prismaMock.calendarEvent.delete).not.toHaveBeenCalled();
    });
  });

  describe("Consolidated sweep: one stranger token, every booking/order-room action, same booking", () => {
    const BOOKING = {
      id: "booking-fuzz-1",
      state: "ESCROW_LOCKED",
      creator: { userId: "user-talent-a" },
      client: { userId: "user-client-a" },
      orderRoom: { id: "room-fuzz-1" },
      payment: { id: "payment-fuzz-1" },
    };

    beforeEach(() => {
      prismaMock.booking.findUnique.mockResolvedValue(BOOKING);
    });

    const cases: Array<{ method: "GET" | "PATCH" | "POST"; url: string; payload?: object }> = [
      { method: "GET", url: "/api/v1/bookings/booking-fuzz-1" },
      { method: "PATCH", url: "/api/v1/bookings/booking-fuzz-1/cancel" },
      { method: "POST", url: "/api/v1/bookings/booking-fuzz-1/pay" },
      { method: "PATCH", url: "/api/v1/bookings/booking-fuzz-1/deliver" },
      { method: "PATCH", url: "/api/v1/bookings/booking-fuzz-1/approve" },
      { method: "GET", url: "/api/v1/order-rooms/booking-fuzz-1/messages" },
      { method: "POST", url: "/api/v1/order-rooms/booking-fuzz-1/messages", payload: { text: "hi" } },
    ];

    for (const { method, url, payload } of cases) {
      it(`${method} ${url} — stranger (neither party) gets 403, never the resource`, async () => {
        const response = await app.inject({
          method,
          url,
          headers: { authorization: `Bearer ${STRANGER_CLIENT}` },
          payload,
        });

        expect(response.statusCode, `${method} ${url} should 403 a non-participant`).toBe(403);
      });
    }
  });
});
