import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import { generateAccessToken } from "../services/auth.js";

vi.mock("../db/client.js", () => ({
  prisma: {
    creator: { findUnique: vi.fn() },
    physicalAttributes: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  },
}));

import { prisma } from "../db/client.js";
const prismaMock = prisma as any;

const TALENT_TOKEN = generateAccessToken({ userId: "user-talent-1", userType: "TALENT", email: "t@monologg.dev" });
const CLIENT_TOKEN = generateAccessToken({ userId: "user-client-1", userType: "CLIENT", email: "c@monologg.dev" });

describe("Physical attributes routes (features.md Phase 12A.3)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /creators/me/attributes", () => {
    it("requires auth", async () => {
      const response = await app.inject({ method: "GET", url: "/api/v1/creators/me/attributes" });
      expect(response.statusCode).toBe(401);
    });

    it("is client-role-forbidden — this is a talent/creator resource", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/creators/me/attributes",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      });
      expect(response.statusCode).toBe(403);
    });

    it("returns the caller's own record", async () => {
      prismaMock.physicalAttributes.findUnique.mockResolvedValue({ creatorId: "creator-1", heightRange: "CM_170_180" });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/creators/me/attributes",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().heightRange).toBe("CM_170_180");
    });
  });

  describe("PUT /creators/me/attributes", () => {
    it("400s without a consentVersion (Non-Negotiable #4 — consent is mandatory even though every attribute is optional)", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/creators/me/attributes",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
        payload: { heightRange: "CM_170_180" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("400s an invalid enum value", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/creators/me/attributes",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
        payload: { heightRange: "NOT_A_REAL_RANGE", consentVersion: "v1" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("400s distinctiveFeatures over 120 chars", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/creators/me/attributes",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
        payload: { distinctiveFeatures: "x".repeat(121), consentVersion: "v1" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("accepts an empty body except consentVersion — every attribute is genuinely optional", async () => {
      prismaMock.physicalAttributes.findUnique.mockResolvedValue(null);
      prismaMock.physicalAttributes.create.mockResolvedValue({ creatorId: "creator-1", consentVersion: "v1" });

      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/creators/me/attributes",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
        payload: { consentVersion: "v1" },
      });

      expect(response.statusCode).toBe(200);
    });

    it("saves a valid single field with default SEARCHABLE visibility", async () => {
      prismaMock.physicalAttributes.findUnique.mockResolvedValue(null);
      prismaMock.physicalAttributes.create.mockResolvedValue({
        creatorId: "creator-1", heightRange: "CM_170_180", visibility: { heightRange: "SEARCHABLE" },
      });

      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/creators/me/attributes",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
        payload: { heightRange: "CM_170_180", consentVersion: "v1" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().visibility.heightRange).toBe("SEARCHABLE");
    });
  });

  describe("DELETE /creators/me/attributes", () => {
    it("204s and hard-deletes (Non-Negotiable #5 — revocable at any time)", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/v1/creators/me/attributes",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(204);
      expect(prismaMock.physicalAttributes.deleteMany).toHaveBeenCalledWith({ where: { creatorId: "creator-1" } });
    });

    it("is idempotent — deleting when nothing exists still 204s, not an error", async () => {
      prismaMock.physicalAttributes.deleteMany.mockResolvedValue({ count: 0 });

      const response = await app.inject({
        method: "DELETE",
        url: "/api/v1/creators/me/attributes",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(204);
    });
  });
});
