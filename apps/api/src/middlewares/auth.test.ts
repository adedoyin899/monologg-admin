import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import { requireAuth, requireRole, requireOwner } from "./auth.js";
import { generateAccessToken } from "../services/auth.js";

// Mock the Prisma client for database lookup validations inside requireOwner
vi.mock("../db/client.js", () => ({
  prisma: {
    creator: {
      findUnique: vi.fn(),
    },
    client: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "../db/client.js";
const prismaMock = prisma as any;

describe("Auth Middlewares (requireAuth, requireRole, requireOwner)", () => {
  let server: ReturnType<typeof Fastify>;

  beforeEach(() => {
    server = Fastify();
    vi.clearAllMocks();
  });

  describe("requireAuth Hook", () => {
    it("returns 401 if Authorization header is missing", async () => {
      server.get("/protected", { preHandler: requireAuth }, async () => {
        return { ok: true };
      });

      const response = await server.inject({ method: "GET", url: "/protected" });
      expect(response.statusCode).toBe(401);
      expect(response.json().message).toContain("token is missing");
    });

    it("returns 401 for an invalid JWT token", async () => {
      server.get("/protected", { preHandler: requireAuth }, async () => {
        return { ok: true };
      });

      const response = await server.inject({
        method: "GET",
        url: "/protected",
        headers: { authorization: "Bearer invalid-token" },
      });
      expect(response.statusCode).toBe(401);
      expect(response.json().message).toContain("Invalid access token");
    });

    it("populates request.user and passes if JWT access token is valid", async () => {
      const payload = { userId: "user-123", userType: "TALENT", email: "john@doe.com" };
      const validToken = generateAccessToken(payload);

      server.get("/protected", { preHandler: requireAuth }, async (req: any) => {
        return { user: req.user };
      });

      const response = await server.inject({
        method: "GET",
        url: "/protected",
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().user.userId).toBe(payload.userId);
    });
  });

  describe("requireRole Hook", () => {
    it("returns 403 Forbidden if userType does not match specified role", async () => {
      const payload = { userId: "user-client", userType: "CLIENT", email: "client@brand.com" };
      const clientToken = generateAccessToken(payload);

      // Protect route for TALENT role only
      server.get(
        "/talent-only",
        { preHandler: [requireAuth, requireRole("TALENT")] },
        async () => {
          return { secret: "creators-only" };
        }
      );

      const response = await server.inject({
        method: "GET",
        url: "/talent-only",
        headers: { authorization: `Bearer ${clientToken}` },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().message).toContain("Mismatched role permissions");
    });

    it("passes successfully if role matches", async () => {
      const payload = { userId: "user-talent", userType: "TALENT", email: "talent@monologg.com" };
      const talentToken = generateAccessToken(payload);

      server.get(
        "/talent-only",
        { preHandler: [requireAuth, requireRole("TALENT")] },
        async () => {
          return { secret: "creators-only" };
        }
      );

      const response = await server.inject({
        method: "GET",
        url: "/talent-only",
        headers: { authorization: `Bearer ${talentToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().secret).toBe("creators-only");
    });

    it("Phase 12: returns 401 if called without requireAuth having set request.user (defensive branch)", async () => {
      // Exercises requireRole's own guard directly, bypassing requireAuth —
      // this is unreachable via any real route (every route chains
      // [requireAuth, requireRole(...)]) but is the code's own safety net if
      // that ordering is ever gotten wrong, and money/auth code gets full
      // branch coverage regardless of how "reachable" a defensive check is.
      const reply: any = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      const request: any = { user: undefined };

      await requireRole("TALENT")(request, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ message: "Authentication required" }));
    });
  });

  describe("requireOwner Hook", () => {
    it("passes with 200 if route user id matches token userId", async () => {
      const payload = { userId: "user-123", userType: "TALENT", email: "user@monologg.com" };
      const token = generateAccessToken(payload);

      server.get(
        "/users/:id/settings",
        { preHandler: [requireAuth, requireOwner("user", "id")] },
        async () => {
          return { success: true };
        }
      );

      const response = await server.inject({
        method: "GET",
        url: "/users/user-123/settings",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it("returns 403 if route user id does not match token userId", async () => {
      const payload = { userId: "user-123", userType: "TALENT", email: "user@monologg.com" };
      const token = generateAccessToken(payload);

      server.get(
        "/users/:id/settings",
        { preHandler: [requireAuth, requireOwner("user", "id")] },
        async () => {
          return { success: true };
        }
      );

      const response = await server.inject({
        method: "GET",
        url: "/users/user-different/settings",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().message).toContain("you do not own this user profile");
    });

    it("passes creator ownership checks after looking up userId from database", async () => {
      const payload = { userId: "user-creator", userType: "TALENT", email: "user@monologg.com" };
      const token = generateAccessToken(payload);

      // Mock database creator ownership check
      prismaMock.creator.findUnique.mockResolvedValue({
        id: "creator-id-777",
        userId: "user-creator",
      });

      server.get(
        "/creators/:creatorId/rate-cards",
        { preHandler: [requireAuth, requireOwner("creator", "creatorId")] },
        async () => {
          return { allowed: true };
        }
      );

      const response = await server.inject({
        method: "GET",
        url: "/creators/creator-id-777/rate-cards",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().allowed).toBe(true);
    });

    it("blocks creator ownership checks if Creator userId does not match token userId", async () => {
      const payload = { userId: "attacker-user", userType: "TALENT", email: "attacker@monologg.com" };
      const token = generateAccessToken(payload);

      prismaMock.creator.findUnique.mockResolvedValue({
        id: "creator-id-777",
        userId: "victim-user",
      });

      server.get(
        "/creators/:creatorId/rate-cards",
        { preHandler: [requireAuth, requireOwner("creator", "creatorId")] },
        async () => {
          return { allowed: true };
        }
      );

      const response = await server.inject({
        method: "GET",
        url: "/creators/creator-id-777/rate-cards",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().message).toContain("you do not own this creator profile");
    });

    it("passes client ownership checks after looking up userId from database", async () => {
      const payload = { userId: "user-client", userType: "CLIENT", email: "user@monologg.com" };
      const token = generateAccessToken(payload);

      prismaMock.client.findUnique.mockResolvedValue({
        id: "client-id-777",
        userId: "user-client",
      });

      server.get(
        "/clients/:clientId/briefs",
        { preHandler: [requireAuth, requireOwner("client", "clientId")] },
        async () => {
          return { allowed: true };
        }
      );

      const response = await server.inject({
        method: "GET",
        url: "/clients/client-id-777/briefs",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().allowed).toBe(true);
    });

    it("blocks client ownership checks if Client userId does not match token userId", async () => {
      const payload = { userId: "attacker-user", userType: "CLIENT", email: "attacker@monologg.com" };
      const token = generateAccessToken(payload);

      prismaMock.client.findUnique.mockResolvedValue({
        id: "client-id-777",
        userId: "victim-user",
      });

      server.get(
        "/clients/:clientId/briefs",
        { preHandler: [requireAuth, requireOwner("client", "clientId")] },
        async () => {
          return { allowed: true };
        }
      );

      const response = await server.inject({
        method: "GET",
        url: "/clients/client-id-777/briefs",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().message).toContain("you do not own this client profile");
    });

    it("returns 404 if the owned resource does not exist", async () => {
      const payload = { userId: "user-creator", userType: "TALENT", email: "user@monologg.com" };
      const token = generateAccessToken(payload);

      prismaMock.creator.findUnique.mockResolvedValue(null);

      server.get(
        "/creators/:creatorId/rate-cards",
        { preHandler: [requireAuth, requireOwner("creator", "creatorId")] },
        async () => {
          return { allowed: true };
        }
      );

      const response = await server.inject({
        method: "GET",
        url: "/creators/missing-creator/rate-cards",
        headers: { authorization: `Bearer ${token}` },
      });

      // Regression test: this handler previously returned the non-standard status
      // code 444 (nginx's "no response" code) instead of a real 404.
      expect(response.statusCode).toBe(404);
      expect(response.json().message).toContain("not found");
    });

    it("returns 404 if the owned client resource does not exist", async () => {
      const payload = { userId: "user-client", userType: "CLIENT", email: "user@monologg.com" };
      const token = generateAccessToken(payload);

      prismaMock.client.findUnique.mockResolvedValue(null);

      server.get(
        "/clients/:clientId/briefs",
        { preHandler: [requireAuth, requireOwner("client", "clientId")] },
        async () => {
          return { allowed: true };
        }
      );

      const response = await server.inject({
        method: "GET",
        url: "/clients/missing-client/briefs",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().message).toContain("not found");
    });

    it("returns 400 if the route is missing the resource-id param entirely", async () => {
      const payload = { userId: "user-123", userType: "TALENT", email: "user@monologg.com" };
      const token = generateAccessToken(payload);

      // No :id in the route at all — requireOwner("user", "id") looks for a
      // param that will never be there. A route wiring mistake, not a real
      // user input, but the middleware's own guard against it is still real code.
      server.get(
        "/users/settings",
        { preHandler: [requireAuth, requireOwner("user", "id")] },
        async () => {
          return { success: true };
        }
      );

      const response = await server.inject({
        method: "GET",
        url: "/users/settings",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().message).toContain('Missing required route parameter: "id"');
    });

    it("Phase 12: returns 401 if called without requireAuth having set request.user (defensive branch)", async () => {
      const reply: any = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      const request: any = { user: undefined, params: {} };

      await requireOwner("user", "id")(request, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ message: "Authentication required" }));
    });
  });
});
