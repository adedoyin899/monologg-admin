import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import { generateAccessToken } from "../services/auth.js";

vi.mock("../db/client.js", () => ({
  prisma: {
    creator: { findUnique: vi.fn() },
    availabilityBlock: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    calendarConnection: { findUnique: vi.fn(), updateMany: vi.fn() },
    calendarEvent: { findMany: vi.fn() },
  },
}));

import { prisma } from "../db/client.js";
import { encrypt } from "../lib/encryption.js";
import { MOCK_REVOKED_REFRESH_TOKEN } from "../providers/calendar.mock.js";
const prismaMock = prisma as any;

const TALENT_TOKEN = generateAccessToken({ userId: "user-talent-1", userType: "TALENT", email: "t@monologg.dev" });

describe("Availability blocks (owner-scoped CRUD)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it("GET /availability returns a paginated envelope scoped to the caller's creator", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
    prismaMock.availabilityBlock.findMany.mockResolvedValue([{ id: "block-1", creatorId: "creator-1" }]);
    prismaMock.availabilityBlock.count.mockResolvedValue(1);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/availability",
      headers: { authorization: `Bearer ${TALENT_TOKEN}` },
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.availabilityBlock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { creatorId: "creator-1" } }),
    );
  });

  it("POST /availability creates a block with the slot shape validated", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
    prismaMock.availabilityBlock.create.mockResolvedValue({ id: "block-new" });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/availability",
      headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      payload: { date: "2026-08-01", slots: [{ start: "09:00", end: "10:00", state: "free" }] },
    });

    expect(response.statusCode).toBe(201);
  });

  describe("GET /availability/day (features.md Phase 13)", () => {
    it("returns the resolved slots, recurring templates, events, and openSlots for one day", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      prismaMock.availabilityBlock.findFirst.mockResolvedValue({
        id: "block-1",
        slots: [{ start: "09:00", end: "13:00", state: "free" }],
      });
      prismaMock.availabilityBlock.findMany.mockResolvedValue([]);
      prismaMock.calendarEvent.findMany.mockResolvedValue([{ id: "evt-1", title: "Table read" }]);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/availability/day?date=2026-08-05",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.date).toBe("2026-08-05");
      expect(body.block).toEqual({ id: "block-1", slots: [{ start: "09:00", end: "13:00", state: "free" }], isRecurring: false, recurRule: null });
      expect(body.events).toEqual([{ id: "evt-1", title: "Table read" }]);
      expect(body.openSlots).toEqual([{ start: "00:00", end: "23:59" }]);
    });

    it("400s when the date query param is missing", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/availability/day",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  it("rejects a malformed slots array", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/availability",
      headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      payload: { date: "2026-08-01", slots: [{ start: "09:00" }] },
    });

    expect(response.statusCode).toBe(400);
    expect(prismaMock.availabilityBlock.create).not.toHaveBeenCalled();
  });

  it("PATCH /availability/:id returns 403 for a block owned by a different creator", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
    prismaMock.availabilityBlock.findUnique.mockResolvedValue({ id: "block-2", creatorId: "creator-OTHER" });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/availability/block-2",
      headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      payload: { calendarEventId: "evt-hijack" },
    });

    expect(response.statusCode).toBe(403);
    expect(prismaMock.availabilityBlock.update).not.toHaveBeenCalled();
  });

  describe("POST /availability/:id/sync-calendar (features.md Phase 8)", () => {
    it("403s a block owned by a different creator", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      prismaMock.availabilityBlock.findUnique.mockResolvedValue({ id: "block-2", creatorId: "creator-OTHER" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/availability/block-2/sync-calendar",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it("404s when the creator hasn't connected a calendar", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      prismaMock.availabilityBlock.findUnique.mockResolvedValue({ id: "block-1", creatorId: "creator-1" });
      prismaMock.calendarConnection.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/availability/block-1/sync-calendar",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it("pushes to the mock calendar and returns the calendarEventId when connected", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      prismaMock.availabilityBlock.findUnique.mockResolvedValue({ id: "block-1", creatorId: "creator-1" });
      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        status: "CONNECTED",
        encryptedRefreshToken: encrypt("some-refresh-token"),
      });
      prismaMock.availabilityBlock.findUniqueOrThrow.mockResolvedValue({
        id: "block-1",
        date: new Date("2026-08-01"),
        slots: [{ start: "09:00", end: "10:00", booked: false }],
        calendarEventId: null,
      });
      prismaMock.availabilityBlock.update.mockResolvedValue({});

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/availability/block-1/sync-calendar",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ calendarEventId: "mock_cal_event_block-1" });
    });

    it("409s with reconnectRequired when the connection was revoked — degrades gracefully", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      prismaMock.availabilityBlock.findUnique.mockResolvedValue({ id: "block-1", creatorId: "creator-1" });
      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        status: "CONNECTED",
        encryptedRefreshToken: encrypt(MOCK_REVOKED_REFRESH_TOKEN),
      });
      prismaMock.availabilityBlock.findUniqueOrThrow.mockResolvedValue({
        id: "block-1",
        date: new Date("2026-08-01"),
        slots: [],
        calendarEventId: null,
      });
      prismaMock.calendarConnection.updateMany.mockResolvedValue({ count: 1 });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/availability/block-1/sync-calendar",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().reconnectRequired).toBe(true);
    });
  });

  it("DELETE /availability/:id succeeds when the caller owns the block", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
    prismaMock.availabilityBlock.findUnique.mockResolvedValue({ id: "block-1", creatorId: "creator-1" });
    prismaMock.availabilityBlock.delete.mockResolvedValue({ id: "block-1" });

    const response = await app.inject({
      method: "DELETE",
      url: "/api/v1/availability/block-1",
      headers: { authorization: `Bearer ${TALENT_TOKEN}` },
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.availabilityBlock.delete).toHaveBeenCalledWith({ where: { id: "block-1" } });
  });
});
