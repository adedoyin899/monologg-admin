import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import { generateAccessToken } from "../services/auth.js";

vi.mock("../db/client.js", () => ({
  prisma: {
    supportTicket: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  },
}));

vi.mock("../providers/index.js", () => ({
  notifyProvider: { email: vi.fn(), sms: vi.fn(), inApp: vi.fn() },
}));

vi.mock("../services/notifications.js", () => ({
  enqueueEmailNotification: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "../db/client.js";
const prismaMock = prisma as any;

const USER_1_TOKEN = generateAccessToken({ userId: "user-1", userType: "TALENT", email: "u1@monologg.dev" });

describe("Support ticket routes (features.md Phase 10)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /support/tickets", () => {
    it("401s without a token", async () => {
      const response = await app.inject({ method: "POST", url: "/api/v1/support/tickets" });
      expect(response.statusCode).toBe(401);
    });

    it("submits a ticket for the caller", async () => {
      prismaMock.supportTicket.create.mockResolvedValue({
        id: "ticket-1",
        userId: "user-1",
        subject: "Help",
        message: "Something's wrong",
        status: "OPEN",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/support/tickets",
        headers: { authorization: `Bearer ${USER_1_TOKEN}` },
        payload: { subject: "Help", message: "Something's wrong" },
      });

      expect(response.statusCode).toBe(201);
      expect(prismaMock.supportTicket.create).toHaveBeenCalledWith({
        data: { userId: "user-1", subject: "Help", message: "Something's wrong" },
      });
    });

    it("400s a missing subject/message", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/support/tickets",
        headers: { authorization: `Bearer ${USER_1_TOKEN}` },
        payload: { subject: "" },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /support/tickets", () => {
    it("401s without a token", async () => {
      const response = await app.inject({ method: "GET", url: "/api/v1/support/tickets" });
      expect(response.statusCode).toBe(401);
    });

    it("lists only the caller's own tickets", async () => {
      prismaMock.supportTicket.findMany.mockResolvedValue([
        { id: "t1", userId: "user-1", subject: "Help", message: "...", status: "OPEN", createdAt: new Date() },
      ]);
      prismaMock.supportTicket.count.mockResolvedValue(1);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/support/tickets",
        headers: { authorization: `Bearer ${USER_1_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data).toHaveLength(1);
      expect(prismaMock.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-1" } }),
      );
    });
  });
});
