import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import { generateAccessToken } from "../services/auth.js";

vi.mock("../db/client.js", () => ({
  prisma: {
    client: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { prisma } from "../db/client.js";
const prismaMock = prisma as any;

const CLIENT_TOKEN = generateAccessToken({ userId: "user-client-1", userType: "CLIENT", email: "c@monologg.dev" });
const TALENT_TOKEN = generateAccessToken({ userId: "user-talent-1", userType: "TALENT", email: "t@monologg.dev" });

describe("Client profile (Phase 12 — Settings.tsx wiring)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /clients/me", () => {
    it("returns the caller's own client profile", async () => {
      prismaMock.client.findUnique.mockResolvedValue({
        id: "client-1",
        userId: "user-client-1",
        name: "Acme Studios",
        orgName: "Acme",
        orgType: "STUDIO",
        location: "Lagos",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/clients/me",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ name: "Acme Studios", orgType: "STUDIO" });
    });

    it("404s if the authenticated user has no client profile", async () => {
      prismaMock.client.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/clients/me",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it("403s a TALENT-role token (client-only route)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/clients/me",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("PATCH /clients/me", () => {
    it("updates name/orgName/orgType/location", async () => {
      prismaMock.client.findUnique.mockResolvedValue({ id: "client-1", userId: "user-client-1" });
      prismaMock.client.update.mockResolvedValue({
        id: "client-1",
        name: "New Name",
        orgName: "New Org",
        orgType: "BRAND",
        location: "Abuja",
      });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/clients/me",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
        payload: { name: "New Name", orgName: "New Org", orgType: "BRAND", location: "Abuja" },
      });

      expect(response.statusCode).toBe(200);
      expect(prismaMock.client.update).toHaveBeenCalledWith({
        where: { id: "client-1" },
        data: { name: "New Name", orgName: "New Org", orgType: "BRAND", location: "Abuja" },
      });
      expect(response.json()).toMatchObject({ name: "New Name", orgType: "BRAND" });
    });

    it("rejects an invalid orgType", async () => {
      prismaMock.client.findUnique.mockResolvedValue({ id: "client-1", userId: "user-client-1" });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/clients/me",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
        payload: { orgType: "NOT_A_REAL_TYPE" },
      });

      expect(response.statusCode).toBe(400);
      expect(prismaMock.client.update).not.toHaveBeenCalled();
    });

    it("404s if the authenticated user has no client profile", async () => {
      prismaMock.client.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/clients/me",
        headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
        payload: { name: "New Name" },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
