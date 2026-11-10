import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import { generateAccessToken } from "../services/auth.js";

vi.mock("../db/client.js", () => ({
  prisma: {
    creator: { findUnique: vi.fn() },
    brief: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    application: { create: vi.fn(), count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    $executeRaw: vi.fn().mockResolvedValue(undefined),
    $transaction: vi.fn((arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(prismaMock))),
  },
}));

vi.mock("../providers/index.js", () => ({
  notifyProvider: { inApp: vi.fn().mockResolvedValue(undefined) },
}));

import { prisma } from "../db/client.js";
const prismaMock = prisma as any;

const TALENT_TOKEN = generateAccessToken({ userId: "user-talent-1", userType: "TALENT", email: "t@monologg.dev" });
const OTHER_TALENT_TOKEN = generateAccessToken({ userId: "user-talent-2", userType: "TALENT", email: "t2@monologg.dev" });
const CLIENT_TOKEN = generateAccessToken({ userId: "user-client-1", userType: "CLIENT", email: "c@monologg.dev" });

describe("Projects & applications — talent side (features.md Phase 14)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /projects", () => {
    it("lists only ACTIVE briefs, annotated with the caller's own application status", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      prismaMock.brief.findMany.mockResolvedValue([
        {
          id: "brief-1",
          projectName: "Nike Q1 Campaign",
          projectType: "Voice-Over",
          nicheReq: ["VO_ARTIST"],
          budgetAmount: 20_000_000,
          budgetCurrency: "NGN",
          applicantCap: 3,
          applicationsOpen: true,
          createdAt: new Date("2026-02-01"),
          client: { name: "Ngozi Balogun", orgName: "General Casting Co" },
          applications: [{ id: "app-1", status: "APPLIED", pitch: "Hi" }],
          _count: { applications: 5 },
        },
      ]);
      prismaMock.brief.count.mockResolvedValue(1);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/projects",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data[0]).toMatchObject({
        id: "brief-1",
        projectName: "Nike Q1 Campaign",
        applicantCap: 3,
        applicationsOpen: true,
        // The TRUE total applicant count (5), not just "did I apply" (1 row
        // in the caller-filtered `applications` array) — features.md Phase 14
        // bug fix, caught by live testing.
        applicantCount: 5,
        myApplication: { id: "app-1", status: "APPLIED" },
      });
      expect(prismaMock.brief.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: "ACTIVE" }) }),
      );
    });

    it("403s a client-role token", async () => {
      const response = await app.inject({ method: "GET", url: "/api/v1/projects", headers: { authorization: `Bearer ${CLIENT_TOKEN}` } });
      expect(response.statusCode).toBe(403);
    });
  });

  describe("POST /projects/:briefId/apply", () => {
    function mockOpenBrief(applicantCap: number | null, existingCount = 0) {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1", name: "Adaeze Obi" });
      prismaMock.brief.findUnique.mockResolvedValue({
        id: "brief-1",
        status: "ACTIVE",
        applicationsOpen: true,
        applicantCap,
        projectName: "Nike Q1 Campaign",
        client: { userId: "user-client-1" },
      });
      prismaMock.application.count.mockResolvedValue(existingCount);
      prismaMock.application.create.mockResolvedValue({ id: "app-new", briefId: "brief-1", creatorId: "creator-1", status: "APPLIED" });
    }

    it("201s and creates the application", async () => {
      mockOpenBrief(5, 0);
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/projects/brief-1/apply",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
        payload: { pitch: "I'd love this." },
      });
      expect(response.statusCode).toBe(201);
      expect(prismaMock.application.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { briefId: "brief-1", creatorId: "creator-1", pitch: "I'd love this." } }),
      );
    });

    it("409s once the cap is already reached", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      prismaMock.brief.findUnique.mockResolvedValue({
        id: "brief-1",
        status: "ACTIVE",
        applicationsOpen: false,
        applicantCap: 2,
        projectName: "Nike Q1 Campaign",
        client: { userId: "user-client-1" },
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/projects/brief-1/apply",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(409);
      expect(prismaMock.application.create).not.toHaveBeenCalled();
    });

    it("409s a duplicate application", async () => {
      mockOpenBrief(5, 0);
      prismaMock.application.create.mockImplementation(async () => {
        const err = new Error("Unique constraint failed") as Error & { code: string };
        err.code = "P2002";
        throw err;
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/projects/brief-1/apply",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(409);
    });

    it("404s a brief that doesn't exist", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      prismaMock.brief.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/projects/nope/apply",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it("cap race at the HTTP layer: 3 distinct talents applying sequentially against a cap of 2 — exactly 2 succeed", async () => {
      // A real stateful brief (not a fixed mock return) so each successive
      // apply call sees the previous ones' effect — the same sequential-call
      // proof services/applications.test.ts's own cap test documents (the
      // advisory lock's real concurrent-serialization guarantee is Postgres's,
      // not re-provable against a mocked Prisma client).
      const state = { status: "ACTIVE", applicationsOpen: true, applicantCap: 2, projectName: "Nike Q1 Campaign", client: { userId: "user-client-1" } };
      const applications: string[] = [];
      const creatorsByUserId: Record<string, { id: string; userId: string; name: string }> = {
        "user-talent-a": { id: "creator-a", userId: "user-talent-a", name: "Talent A" },
        "user-talent-b": { id: "creator-b", userId: "user-talent-b", name: "Talent B" },
        "user-talent-c": { id: "creator-c", userId: "user-talent-c", name: "Talent C" },
      };
      prismaMock.creator.findUnique.mockImplementation(async ({ where: { userId } }: any) => creatorsByUserId[userId] ?? null);
      prismaMock.brief.findUnique.mockImplementation(async () => ({ id: "brief-1", ...state }));
      prismaMock.brief.update.mockImplementation(async ({ data }: any) => Object.assign(state, data));
      prismaMock.application.create.mockImplementation(async ({ data }: any) => {
        applications.push(data.creatorId);
        return { id: `app-${applications.length}`, status: "APPLIED", ...data };
      });
      prismaMock.application.count.mockImplementation(async () => applications.length);

      const results: number[] = [];
      for (const userId of ["user-talent-a", "user-talent-b", "user-talent-c"]) {
        const token = generateAccessToken({ userId, userType: "TALENT", email: `${userId}@monologg.dev` });
        const response = await app.inject({
          method: "POST",
          url: "/api/v1/projects/brief-1/apply",
          headers: { authorization: `Bearer ${token}` },
        });
        results.push(response.statusCode);
      }

      expect(results.filter((s) => s === 201)).toHaveLength(2);
      expect(results.filter((s) => s === 409)).toHaveLength(1);
      expect(state.applicationsOpen).toBe(false);
    });
  });

  describe("GET /creators/me/applications", () => {
    it("returns the talent's own applications with brief context", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      prismaMock.application.findMany.mockResolvedValue([
        {
          id: "app-1",
          status: "SHORTLISTED",
          pitch: "Hi",
          createdAt: new Date("2026-02-01"),
          brief: { id: "brief-1", projectName: "Nike Q1 Campaign", projectType: "Voice-Over", budgetAmount: 20_000_000, budgetCurrency: "NGN", client: { name: "Ngozi Balogun", orgName: null } },
        },
      ]);
      prismaMock.application.count.mockResolvedValue(1);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/creators/me/applications",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data[0]).toMatchObject({
        id: "app-1",
        status: "SHORTLISTED",
        brief: { projectName: "Nike Q1 Campaign", clientName: "Ngozi Balogun" },
      });
    });
  });

  describe("PATCH /applications/:id/withdraw", () => {
    it("lets the applicant withdraw their own application", async () => {
      prismaMock.application.findUnique.mockResolvedValue({ id: "app-1", status: "APPLIED", creator: { userId: "user-talent-1" } });
      prismaMock.application.update.mockResolvedValue({ id: "app-1", status: "WITHDRAWN" });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/applications/app-1/withdraw",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("WITHDRAWN");
    });

    it("403s a different talent trying to withdraw someone else's application", async () => {
      prismaMock.application.findUnique.mockResolvedValue({ id: "app-1", status: "APPLIED", creator: { userId: "user-talent-1" } });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/applications/app-1/withdraw",
        headers: { authorization: `Bearer ${OTHER_TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(403);
      expect(prismaMock.application.update).not.toHaveBeenCalled();
    });
  });
});
