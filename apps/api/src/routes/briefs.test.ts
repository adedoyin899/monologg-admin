import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import { generateAccessToken } from "../services/auth.js";

vi.mock("../db/client.js", () => ({
  prisma: {
    client: { findUnique: vi.fn() },
    brief: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    // features.md Phase 14 — applicant management (GET /briefs/:id/applicants,
    // shortlist/reject/select).
    application: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    rateCard: { findUnique: vi.fn() },
    creator: { findUnique: vi.fn() },
    $transaction: vi.fn((arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(prismaMock))),
  },
}));

vi.mock("../providers/index.js", () => ({
  notifyProvider: { inApp: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("../services/booking.js", () => ({
  createBooking: vi.fn().mockResolvedValue({ id: "booking-new", state: "PENDING_PAYMENT" }),
}));

import { prisma } from "../db/client.js";
const prismaMock = prisma as any;

const CLIENT_TOKEN = generateAccessToken({ userId: "user-client-1", userType: "CLIENT", email: "c@monologg.dev" });
const TALENT_TOKEN = generateAccessToken({ userId: "user-talent-1", userType: "TALENT", email: "t@monologg.dev" });

describe("Briefs (client-owned CRUD)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it("GET /briefs returns a paginated envelope mapped to the ClientProject display shape", async () => {
    prismaMock.client.findUnique.mockResolvedValue({ id: "client-1", userId: "user-client-1" });
    prismaMock.brief.findMany.mockResolvedValue([
      {
        id: "brief-1",
        clientId: "client-1",
        projectName: "Nike Q1 Campaign",
        projectType: "Voice-Over",
        budgetAmount: 20_000_000,
        budgetCurrency: "NGN",
        status: "ACTIVE",
        createdAt: new Date("2026-01-14"),
        applicantCap: 3,
        applicationsOpen: true,
        _count: { applications: 2 },
      },
    ]);
    prismaMock.brief.count.mockResolvedValue(1);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/briefs",
      headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data[0]).toMatchObject({
      id: "brief-1",
      name: "Nike Q1 Campaign",
      niche: "Voice-Over",
      budget: "₦200,000",
      status: "active",
      applicants: 2,
      applicantCap: 3,
      applicationsOpen: true,
    });
    expect(prismaMock.brief.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientId: "client-1" } }),
    );
  });

  it("returns 403 when a TALENT-role token calls a CLIENT-only route", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/briefs",
      headers: { authorization: `Bearer ${TALENT_TOKEN}` },
    });

    expect(response.statusCode).toBe(403);
  });

  it("POST /briefs creates a brief owned by the caller's client profile", async () => {
    prismaMock.client.findUnique.mockResolvedValue({ id: "client-1", userId: "user-client-1" });
    prismaMock.brief.create.mockResolvedValue({ id: "brief-new", clientId: "client-1" });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/briefs",
      headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      payload: {
        projectName: "New Campaign",
        projectType: "Voice-Over",
        nicheReq: ["VO_ARTIST"],
        budgetAmount: 10_000_000,
        budgetCurrency: "NGN",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(prismaMock.brief.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ clientId: "client-1", projectName: "New Campaign" }),
    });
  });

  it("PATCH /briefs/:id returns 403 for a brief owned by a different client (owner-scoping)", async () => {
    prismaMock.client.findUnique.mockResolvedValue({ id: "client-1", userId: "user-client-1" });
    prismaMock.brief.findUnique.mockResolvedValue({ id: "brief-2", clientId: "client-OTHER" });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/briefs/brief-2",
      headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      payload: { status: "CLOSED" },
    });

    expect(response.statusCode).toBe(403);
    expect(prismaMock.brief.update).not.toHaveBeenCalled();
  });

  it("rejects an invalid niche value", async () => {
    prismaMock.client.findUnique.mockResolvedValue({ id: "client-1", userId: "user-client-1" });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/briefs",
      headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      payload: {
        projectName: "Bad Brief",
        projectType: "Voice-Over",
        nicheReq: ["NOT_A_REAL_NICHE"],
        budgetAmount: 1000,
        budgetCurrency: "NGN",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  describe("GET /briefs/:id/applicants (features.md Phase 14, PWA-17)", () => {
    it("returns every applicant's profile summary + pitch/status, brief-owner only", async () => {
      prismaMock.client.findUnique.mockResolvedValue({ id: "client-1", userId: "user-client-1" });
      prismaMock.brief.findUnique.mockResolvedValue({ id: "brief-1", clientId: "client-1" });
      prismaMock.application.findMany.mockResolvedValue([
        {
          id: "app-1",
          status: "APPLIED",
          pitch: "I'd love to work on this.",
          createdAt: new Date("2026-02-01"),
          creator: {
            id: "creator-1",
            name: "Adaeze Obi",
            niche: "VO_ARTIST",
            location: "Lagos",
            verification: "VERIFIED",
            styleTags: ["Warm"],
            rateCards: [{ basePriceAmount: 2_800_000, basePriceCurrency: "NGN" }],
          },
        },
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/briefs/brief-1/applicants",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([
        {
          applicationId: "app-1",
          status: "APPLIED",
          pitch: "I'd love to work on this.",
          appliedAt: "2026-02-01T00:00:00.000Z",
          creator: {
            id: "creator-1",
            name: "Adaeze Obi",
            role: "Voice-Over Artist",
            location: "Lagos",
            avatar: "AO",
            verified: true,
            tags: ["Warm"],
            price: "₦28,000",
          },
        },
      ]);
    });

    it("403s for a brief the caller doesn't own", async () => {
      prismaMock.client.findUnique.mockResolvedValue({ id: "client-1", userId: "user-client-1" });
      prismaMock.brief.findUnique.mockResolvedValue({ id: "brief-1", clientId: "client-OTHER" });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/briefs/brief-1/applicants",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("PATCH /applications/:id/shortlist|reject|select — authz (features.md Phase 14)", () => {
    function mockApplication(clientUserId: string) {
      prismaMock.application.findUnique.mockResolvedValue({
        id: "app-1",
        briefId: "brief-1",
        creatorId: "creator-1",
        status: "APPLIED",
        brief: { id: "brief-1", clientId: "client-1", projectName: "Nike Q1 Campaign", client: { userId: clientUserId } },
        creator: { id: "creator-1", userId: "user-talent-1" },
      });
    }

    it("shortlist: 403s a client who doesn't own the brief", async () => {
      mockApplication("user-client-OTHER");
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/applications/app-1/shortlist",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      });
      expect(response.statusCode).toBe(403);
      expect(prismaMock.application.update).not.toHaveBeenCalled();
    });

    it("shortlist: succeeds for the real owner", async () => {
      mockApplication("user-client-1");
      prismaMock.application.update.mockResolvedValue({ id: "app-1", status: "SHORTLISTED" });
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/applications/app-1/shortlist",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("SHORTLISTED");
    });

    it("reject: 403s a non-owner", async () => {
      mockApplication("user-client-OTHER");
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/applications/app-1/reject",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      });
      expect(response.statusCode).toBe(403);
    });

    it("select: rejects a rateCardId that doesn't belong to the applicant", async () => {
      mockApplication("user-client-1");
      prismaMock.rateCard.findUnique.mockResolvedValue({ id: "rc-1", creatorId: "creator-DIFFERENT", basePriceAmount: 1, basePriceCurrency: "NGN" });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/applications/app-1/select",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
        payload: { rateCardId: "rc-1", slotDate: "2026-09-01", slotStart: "10:00", slotEnd: "11:00" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("select: creates a booking and returns it when everything checks out", async () => {
      mockApplication("user-client-1");
      prismaMock.rateCard.findUnique.mockResolvedValue({ id: "rc-1", creatorId: "creator-1", basePriceAmount: 100_000, basePriceCurrency: "NGN" });
      prismaMock.application.update.mockResolvedValue({ id: "app-1", status: "SELECTED" });
      prismaMock.brief.update.mockResolvedValue({});
      prismaMock.application.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/applications/app-1/select",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
        payload: { rateCardId: "rc-1", slotDate: "2026-09-01", slotStart: "10:00", slotEnd: "11:00" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().booking).toEqual({ id: "booking-new", state: "PENDING_PAYMENT" });
    });
  });
});
