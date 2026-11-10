import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import { generateAccessToken } from "../services/auth.js";

vi.mock("../db/client.js", () => ({
  prisma: {
    notification: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    notificationPreference: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));

import { prisma } from "../db/client.js";

const prismaMock = prisma as any;

const USER_1_TOKEN = generateAccessToken({ userId: "user-1", userType: "TALENT", email: "u1@monologg.dev" });
const USER_2_TOKEN = generateAccessToken({ userId: "user-2", userType: "TALENT", email: "u2@monologg.dev" });

describe("Notification routes (features.md Phase 9)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /notifications", () => {
    it("401s without a token", async () => {
      const response = await app.inject({ method: "GET", url: "/api/v1/notifications" });
      expect(response.statusCode).toBe(401);
    });

    it("returns the caller's own notifications, paginated, with unreadCount", async () => {
      prismaMock.notification.findMany.mockResolvedValue([
        { id: "n1", userId: "user-1", kind: "payment_released", payload: {}, readAt: null, createdAt: new Date() },
      ]);
      prismaMock.notification.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/notifications",
        headers: { authorization: `Bearer ${USER_1_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.unreadCount).toBe(1);
      expect(body.data).toHaveLength(1);
      // SECURITY: scoped to the authenticated user, not a client-supplied id.
      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-1" } }),
      );
    });
  });

  describe("POST /notifications/:id/read", () => {
    it("401s without a token", async () => {
      const response = await app.inject({ method: "POST", url: "/api/v1/notifications/n1/read" });
      expect(response.statusCode).toBe(401);
    });

    it("marks the caller's own notification read", async () => {
      prismaMock.notification.findUnique.mockResolvedValue({ id: "n1", userId: "user-1", readAt: null });
      prismaMock.notification.update.mockResolvedValue({ id: "n1", userId: "user-1", readAt: new Date() });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/notifications/n1/read",
        headers: { authorization: `Bearer ${USER_1_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().readAt).not.toBeNull();
    });

    it("SECURITY: 404s (not leak, not mutate) when user-2 tries to mark user-1's notification read", async () => {
      prismaMock.notification.findUnique.mockResolvedValue({ id: "n1", userId: "user-1", readAt: null });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/notifications/n1/read",
        headers: { authorization: `Bearer ${USER_2_TOKEN}` },
      });

      expect(response.statusCode).toBe(404);
      expect(prismaMock.notification.update).not.toHaveBeenCalled();
    });

    it("404s a notification that doesn't exist", async () => {
      prismaMock.notification.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/notifications/ghost/read",
        headers: { authorization: `Bearer ${USER_1_TOKEN}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("GET/PATCH /notifications/preferences", () => {
    it("defaults both channels enabled with no stored row", async () => {
      prismaMock.notificationPreference.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/notifications/preferences",
        headers: { authorization: `Bearer ${USER_1_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ emailEnabled: true, smsEnabled: true });
    });

    it("updates preferences for the caller", async () => {
      prismaMock.notificationPreference.upsert.mockResolvedValue({ emailEnabled: false, smsEnabled: true });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/notifications/preferences",
        headers: { authorization: `Bearer ${USER_1_TOKEN}` },
        payload: { emailEnabled: false },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ emailEnabled: false, smsEnabled: true });
      expect(prismaMock.notificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-1" } }),
      );
    });

    it("400s an invalid preferences payload", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/notifications/preferences",
        headers: { authorization: `Bearer ${USER_1_TOKEN}` },
        payload: { emailEnabled: "not-a-boolean" },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
