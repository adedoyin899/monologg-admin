import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import { generateAccessToken } from "../services/auth.js";

vi.mock("../db/client.js", () => ({
  prisma: {
    creator: { findUnique: vi.fn() },
    calendarEvent: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "../db/client.js";
const prismaMock = prisma as any;

const TALENT_TOKEN = generateAccessToken({ userId: "user-talent-1", userType: "TALENT", email: "t@monologg.dev" });

describe("Calendar events (owner-scoped CRUD, features.md Phase 13)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it("GET /calendar-events returns a paginated envelope scoped to the caller's creator", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
    prismaMock.calendarEvent.findMany.mockResolvedValue([{ id: "evt-1", creatorId: "creator-1" }]);
    prismaMock.calendarEvent.count.mockResolvedValue(1);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/calendar-events",
      headers: { authorization: `Bearer ${TALENT_TOKEN}` },
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.calendarEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { creatorId: "creator-1" } }),
    );
  });

  it("POST /calendar-events creates an event owned by the authenticated creator", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
    prismaMock.calendarEvent.create.mockResolvedValue({ id: "evt-new" });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/calendar-events",
      headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      payload: { date: "2026-08-05", start: "14:00", end: "15:00", title: "Table read", kind: "personal" },
    });

    expect(response.statusCode).toBe(201);
    expect(prismaMock.calendarEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ creatorId: "creator-1", title: "Table read" }) }),
    );
  });

  it("rejects an invalid kind", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/calendar-events",
      headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      payload: { date: "2026-08-05", start: "14:00", end: "15:00", title: "x", kind: "not-a-kind" },
    });

    expect(response.statusCode).toBe(400);
    expect(prismaMock.calendarEvent.create).not.toHaveBeenCalled();
  });

  it("PATCH /calendar-events/:id returns 403 for an event owned by a different creator", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
    prismaMock.calendarEvent.findUnique.mockResolvedValue({ id: "evt-2", creatorId: "creator-OTHER" });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/calendar-events/evt-2",
      headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      payload: { title: "hijacked" },
    });

    expect(response.statusCode).toBe(403);
    expect(prismaMock.calendarEvent.update).not.toHaveBeenCalled();
  });

  it("DELETE /calendar-events/:id succeeds when the caller owns the event", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
    prismaMock.calendarEvent.findUnique.mockResolvedValue({ id: "evt-1", creatorId: "creator-1" });
    prismaMock.calendarEvent.delete.mockResolvedValue({ id: "evt-1" });

    const response = await app.inject({
      method: "DELETE",
      url: "/api/v1/calendar-events/evt-1",
      headers: { authorization: `Bearer ${TALENT_TOKEN}` },
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.calendarEvent.delete).toHaveBeenCalledWith({ where: { id: "evt-1" } });
  });

  it("404s when the caller has no creator profile", async () => {
    prismaMock.creator.findUnique.mockResolvedValue(null);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/calendar-events",
      headers: { authorization: `Bearer ${TALENT_TOKEN}` },
    });

    expect(response.statusCode).toBe(404);
  });
});
