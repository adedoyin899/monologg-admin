import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../db/client.js", () => ({
  prisma: {
    supportTicket: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  },
}));

vi.mock("../providers/index.js", () => ({
  notifyProvider: { email: vi.fn(), sms: vi.fn(), inApp: vi.fn() },
}));

vi.mock("./notifications.js", () => ({
  enqueueEmailNotification: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "../db/client.js";
import { notifyProvider } from "../providers/index.js";
import { enqueueEmailNotification } from "./notifications.js";
import { env } from "../config/env.js";
import { createSupportTicket, listSupportTickets } from "./support.js";

const prismaMock = prisma as any;
const notifyProviderMock = notifyProvider as any;
const enqueueEmailNotificationMock = enqueueEmailNotification as any;

describe("Support ticket service (features.md Phase 10)", () => {
  const originalSupportInbox = env.SUPPORT_INBOX_EMAIL;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.supportTicket.create.mockResolvedValue({
      id: "ticket-1",
      userId: "user-1",
      subject: "Payment issue",
      message: "My payout hasn't arrived",
      status: "OPEN",
    });
  });

  afterEach(() => {
    (env as any).SUPPORT_INBOX_EMAIL = originalSupportInbox;
  });

  describe("createSupportTicket", () => {
    it("creates the ticket and sends a confirmation email to the submitter", async () => {
      const ticket = await createSupportTicket("user-1", { subject: "Payment issue", message: "My payout hasn't arrived" });

      expect(ticket.id).toBe("ticket-1");
      expect(prismaMock.supportTicket.create).toHaveBeenCalledWith({
        data: { userId: "user-1", subject: "Payment issue", message: "My payout hasn't arrived" },
      });
      expect(enqueueEmailNotificationMock).toHaveBeenCalledWith("user-1", "support_ticket_received", {
        ticketId: "ticket-1",
        subject: "Payment issue",
      });
    });

    it("relays to the internal support inbox when SUPPORT_INBOX_EMAIL is configured", async () => {
      (env as any).SUPPORT_INBOX_EMAIL = "support@monologg.dev";
      notifyProviderMock.email.mockResolvedValue(undefined);

      await createSupportTicket("user-1", { subject: "Payment issue", message: "My payout hasn't arrived" });

      expect(notifyProviderMock.email).toHaveBeenCalledWith(
        "support@monologg.dev",
        "support_ticket_new",
        expect.objectContaining({ ticketId: "ticket-1", userId: "user-1" }),
      );
    });

    it("does not attempt a relay when SUPPORT_INBOX_EMAIL isn't configured", async () => {
      (env as any).SUPPORT_INBOX_EMAIL = undefined;

      await createSupportTicket("user-1", { subject: "Payment issue", message: "My payout hasn't arrived" });

      expect(notifyProviderMock.email).not.toHaveBeenCalled();
    });

    it("a relay failure never fails ticket creation (best-effort)", async () => {
      (env as any).SUPPORT_INBOX_EMAIL = "support@monologg.dev";
      notifyProviderMock.email.mockRejectedValueOnce(new Error("SendGrid down"));

      await expect(
        createSupportTicket("user-1", { subject: "Payment issue", message: "My payout hasn't arrived" }),
      ).resolves.toMatchObject({ id: "ticket-1" });
    });
  });

  describe("listSupportTickets — owner-scoped", () => {
    it("only ever queries the caller's own tickets", async () => {
      prismaMock.supportTicket.findMany.mockResolvedValue([]);
      prismaMock.supportTicket.count.mockResolvedValue(0);

      await listSupportTickets("user-1", { page: 1, pageSize: 20 });

      expect(prismaMock.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-1" } }),
      );
    });
  });
});
