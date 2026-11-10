import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import { generateAccessToken } from "../services/auth.js";
import {
  computeSlaDueAt,
  isSlaBreached,
  computeFirstResponseTimeMs,
  formatTicketNumber,
  CANNED_REPLIES,
} from "../config/slaRules.js";

// Mock DB and providers
vi.mock("../db/client.js", () => {
  return {
    prisma: {
      supportTicket: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      ticketMessage: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      adminUser: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      adminSession: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      adminAuditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      booking: {
        findUnique: vi.fn(),
      },
      notificationPreference: {
        findUnique: vi.fn(),
      },
    },
  };
});

vi.mock("../db/adminRoClient.js", () => {
  return {
    adminRoPrisma: {
      supportTicket: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      booking: {
        findUnique: vi.fn(),
      },
    },
    getMaterializedViewLastRefreshed: vi.fn().mockResolvedValue(new Date()),
  };
});

vi.mock("../providers/index.js", () => ({
  notifyProvider: {
    email: vi.fn().mockResolvedValue(undefined),
    sms: vi.fn().mockResolvedValue(undefined),
    inApp: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../services/notifications.js", () => ({
  enqueueEmailNotification: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "../db/client.js";
import { adminRoPrisma } from "../db/adminRoClient.js";
import { notifyProvider } from "../providers/index.js";
import { enqueueEmailNotification } from "../services/notifications.js";

const prismaMock = prisma as any;
const adminRoMock = adminRoPrisma as any;
const notifyProviderMock = notifyProvider as any;
const enqueueEmailMock = enqueueEmailNotification as any;

describe("Phase A8: Support & Complaints (PRD Module M7)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  const USER_1_ID = "user-alice-123";
  const USER_2_ID = "user-bob-456";
  const ADMIN_ID = "adm-support-1";

  const USER_1_TOKEN = generateAccessToken({
    userId: USER_1_ID,
    userType: "CLIENT",
    email: "alice@monologg.dev",
  });

  const USER_2_TOKEN = generateAccessToken({
    userId: USER_2_ID,
    userType: "TALENT",
    email: "bob@monologg.dev",
  });

  const ADMIN_TOKEN = "mock-admin:support@admin.monologg.dev:aal2";

  beforeEach(async () => {
    vi.stubEnv("ADMIN_AUTH_PROVIDER", "mock");
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();

    // Default admin mock session
    prismaMock.adminUser.findFirst.mockResolvedValue({
      id: ADMIN_ID,
      email: "support@admin.monologg.dev",
      role: "SUPPORT",
      status: "ACTIVE",
    });
    prismaMock.adminUser.findUnique.mockResolvedValue({
      id: ADMIN_ID,
      email: "support@admin.monologg.dev",
      role: "SUPPORT",
      status: "ACTIVE",
    });
    prismaMock.adminSession.findFirst.mockResolvedValue({
      id: "sess-1",
      adminUserId: ADMIN_ID,
      endedAt: null,
      createdAt: new Date(),
      lastSeenAt: new Date(),
    });
  });

  afterEach(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  describe("SLA Calculation Rules", () => {
    it("computes 24 hours SLA due date for NORMAL priority", () => {
      const now = new Date("2026-11-10T12:00:00Z");
      const due = computeSlaDueAt(now, "NORMAL");
      expect(due.toISOString()).toBe("2026-11-11T12:00:00.000Z");
    });

    it("computes 4 hours SLA due date for URGENT priority", () => {
      const now = new Date("2026-11-10T12:00:00Z");
      const due = computeSlaDueAt(now, "URGENT");
      expect(due.toISOString()).toBe("2026-11-10T16:00:00.000Z");
    });

    it("detects SLA breach correctly", () => {
      const createdAt = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5 hours ago
      const slaDueAt = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago

      const isBreached = isSlaBreached({
        createdAt,
        slaDueAt,
        status: "OPEN",
        firstResponseAt: null,
      });
      expect(isBreached).toBe(true);
    });

    it("does not flag breach if resolved or closed", () => {
      const createdAt = new Date(Date.now() - 50 * 60 * 60 * 1000);
      const slaDueAt = new Date(Date.now() - 26 * 60 * 60 * 1000);

      const isBreached = isSlaBreached({
        createdAt,
        slaDueAt,
        status: "RESOLVED",
        firstResponseAt: null,
      });
      expect(isBreached).toBe(false);
    });

    it("formats ticket numbers cleanly", () => {
      expect(formatTicketNumber(1042)).toBe("MNL-1042");
      expect(formatTicketNumber(null, "t-cuid-9988")).toBe("MNL-9988");
    });
  });

  describe("User Complaint Channels & Ticket Creation", () => {
    it("allows user to create a ticket with category and bookingId", async () => {
      const mockTicket = {
        id: "t-101",
        number: 101,
        userId: USER_1_ID,
        subject: "Disputed delivery timeline",
        message: "Talent did not show up for session.",
        category: "BOOKING",
        priority: "HIGH",
        status: "OPEN",
        source: "BOOKING",
        bookingId: "b-999",
        createdAt: new Date(),
        slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      prismaMock.supportTicket.create.mockResolvedValue(mockTicket);
      prismaMock.ticketMessage.create.mockResolvedValue({ id: "msg-1" });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/support/tickets",
        headers: { authorization: `Bearer ${USER_1_TOKEN}` },
        payload: {
          subject: "Disputed delivery timeline",
          message: "Talent did not show up for session.",
          category: "BOOKING",
          priority: "HIGH",
          source: "BOOKING",
          bookingId: "b-999",
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.id).toBe("t-101");
      expect(data.confirmationMessage).toBe("We have your message. We usually reply within 24 hours.");
      expect(enqueueEmailMock).toHaveBeenCalledWith(USER_1_ID, "support_ticket_received", {
        ticketId: "t-101",
        subject: "Disputed delivery timeline",
      });
    });

    it("gives 4-hour confirmation message for URGENT tickets", async () => {
      prismaMock.supportTicket.create.mockResolvedValue({
        id: "t-102",
        userId: USER_1_ID,
        subject: "Unauthorized payment charge",
        message: "Help immediately!",
        priority: "URGENT",
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/support/tickets",
        headers: { authorization: `Bearer ${USER_1_TOKEN}` },
        payload: {
          subject: "Unauthorized payment charge",
          message: "Help immediately!",
          priority: "URGENT",
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().confirmationMessage).toBe("We have your message. We usually reply within 4 hours.");
    });
  });

  describe("Privacy & Internal Notes Guardrail", () => {
    it("never returns internal staff notes to the user", async () => {
      const publicMsg = {
        id: "m-pub-1",
        ticketId: "t-101",
        body: "Hello! We are looking into your case.",
        authorType: "ADMIN",
        isInternal: false,
        internal: false,
        createdAt: new Date(),
      };

      prismaMock.supportTicket.findFirst.mockResolvedValue({
        id: "t-101",
        userId: USER_1_ID,
        subject: "Delivery issue",
        message: "Problem details...",
        status: "WAITING_ON_USER",
        createdAt: new Date(),
        messages: [publicMsg], // Prisma where: { isInternal: false } filtered at query time
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/support/tickets/t-101",
        headers: { authorization: `Bearer ${USER_1_TOKEN}` },
      });

      expect(res.statusCode).toBe(200);
      const ticket = res.json().ticket;
      expect(ticket.messages).toHaveLength(1);
      expect(ticket.messages[0].id).toBe("m-pub-1");
      expect(ticket.messages[0].isInternal).toBe(false);
    });

    it("prevents user A from viewing user B's support ticket (404 / owner-scoped)", async () => {
      prismaMock.supportTicket.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/support/tickets/t-101",
        headers: { authorization: `Bearer ${USER_2_TOKEN}` }, // User 2 trying to read User 1's ticket
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("Admin Support Inbox & Operations", () => {
    it("lists tickets with tab counts and SLA remaining indicators", async () => {
      const mockTicket = {
        id: "t-201",
        number: 201,
        subject: "Need escrow release",
        message: "Booking finished 2 days ago.",
        category: "PAYMENT",
        priority: "NORMAL",
        status: "OPEN",
        source: "IN_APP",
        userId: USER_1_ID,
        assignedAdminId: null,
        firstResponseAt: null,
        resolvedAt: null,
        slaDueAt: new Date(Date.now() + 18 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        updatedAt: new Date(),
        user: {
          id: USER_1_ID,
          email: "alice@monologg.dev",
          userType: "CLIENT",
          client: { name: "Alice Enterprises", orgName: "Alice Org" },
        },
        messages: [{ id: "m-1" }],
      };

      adminRoMock.supportTicket.findMany.mockResolvedValue([mockTicket]);
      adminRoMock.supportTicket.count.mockResolvedValue(1);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/tickets?view=unassigned",
        headers: {
          authorization: `Bearer ${ADMIN_TOKEN}`,
          "x-admin-role": "SUPPORT",
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.tickets).toHaveLength(1);
      expect(data.tickets[0].number).toBe("MNL-201");
      expect(data.tickets[0].isBreached).toBe(false);
      expect(data.counts).toHaveProperty("unassigned");
    });

    it("returns canned replies config for quick staff responses", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/tickets/canned-replies",
        headers: {
          authorization: `Bearer ${ADMIN_TOKEN}`,
          "x-admin-role": "SUPPORT",
        },
      });

      expect(res.statusCode).toBe(200);
      const replies = res.json().cannedReplies;
      expect(replies.length).toBeGreaterThanOrEqual(4);
      expect(replies.some((r: any) => r.id === "escrow_payout")).toBe(true);
    });

    it("records first response time, notifies user, and audits on admin reply", async () => {
      prismaMock.supportTicket.findUnique.mockResolvedValue({
        id: "t-301",
        number: 301,
        userId: USER_1_ID,
        subject: "Question about fee",
        status: "OPEN",
        firstResponseAt: null,
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      });

      prismaMock.ticketMessage.create.mockResolvedValue({
        id: "msg-reply-1",
        ticketId: "t-301",
        authorType: "ADMIN",
        senderRole: "ADMIN",
        body: "Hello! Our platform fee is 10% as outlined in the rate card.",
        isInternal: false,
      });

      prismaMock.supportTicket.update.mockResolvedValue({ id: "t-301" });
      prismaMock.adminAuditLog.create.mockResolvedValue({ id: "aud-1" });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/admin/tickets/t-301/reply",
        headers: {
          authorization: `Bearer ${ADMIN_TOKEN}`,
          "x-admin-role": "SUPPORT",
        },
        payload: {
          body: "Hello! Our platform fee is 10% as outlined in the rate card.",
        },
      });

      expect(res.statusCode).toBe(201);
      expect(prismaMock.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "t-301" },
          data: expect.objectContaining({
            status: "WAITING_ON_USER",
            firstResponseAt: expect.any(Date),
          }),
        }),
      );

      // Verifies notification reached user
      expect(notifyProviderMock.inApp).toHaveBeenCalledWith(USER_1_ID, expect.objectContaining({
        kind: "support_reply",
        ticketId: "t-301",
      }));
      expect(enqueueEmailMock).toHaveBeenCalledWith(USER_1_ID, "support_ticket_reply", expect.anything());

      // Verifies audit log written
      expect(prismaMock.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "TICKET_REPLY",
            targetType: "SupportTicket",
            targetId: "t-301",
          }),
        }),
      );
    });

    it("adds an internal note without notifying or emailing the user", async () => {
      prismaMock.supportTicket.findUnique.mockResolvedValue({
        id: "t-301",
        number: 301,
        userId: USER_1_ID,
      });

      prismaMock.ticketMessage.create.mockResolvedValue({
        id: "msg-internal-1",
        isInternal: true,
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/admin/tickets/t-301/notes",
        headers: {
          authorization: `Bearer ${ADMIN_TOKEN}`,
          "x-admin-role": "SUPPORT",
        },
        payload: {
          body: "Staff note: Checked Paystack dashboard; payment charge was successful.",
        },
      });

      expect(res.statusCode).toBe(201);
      expect(prismaMock.ticketMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isInternal: true,
            authorType: "ADMIN",
          }),
        }),
      );

      // Must NOT email or notify user for internal note
      expect(notifyProviderMock.inApp).not.toHaveBeenCalled();
      expect(enqueueEmailMock).not.toHaveBeenCalled();

      // Audits the internal note
      expect(prismaMock.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "TICKET_INTERNAL_NOTE",
          }),
        }),
      );
    });

    it("allows assignment, priority change, and resolving with a resolution note", async () => {
      prismaMock.supportTicket.findUnique.mockResolvedValue({
        id: "t-301",
        createdAt: new Date(),
        status: "OPEN",
        priority: "NORMAL",
      });

      // 1. Assign
      const resAssign = await app.inject({
        method: "POST",
        url: "/api/v1/admin/tickets/t-301/assign",
        headers: { authorization: `Bearer ${ADMIN_TOKEN}`, "x-admin-role": "SUPPORT" },
        payload: { adminId: "adm-ops-9" },
      });
      expect(resAssign.statusCode).toBe(200);
      expect(prismaMock.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "t-301" }, data: { assignedAdminId: "adm-ops-9" } }),
      );

      // 2. Change priority
      const resPrio = await app.inject({
        method: "POST",
        url: "/api/v1/admin/tickets/t-301/priority",
        headers: { authorization: `Bearer ${ADMIN_TOKEN}`, "x-admin-role": "SUPPORT" },
        payload: { priority: "URGENT" },
      });
      expect(resPrio.statusCode).toBe(200);

      // 3. Resolve ticket
      const resStatus = await app.inject({
        method: "POST",
        url: "/api/v1/admin/tickets/t-301/status",
        headers: { authorization: `Bearer ${ADMIN_TOKEN}`, "x-admin-role": "SUPPORT" },
        payload: { status: "RESOLVED", resolutionNote: "Payment refunded via provider portal." },
      });
      expect(resStatus.statusCode).toBe(200);
      expect(prismaMock.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "t-301" },
          data: expect.objectContaining({
            status: "RESOLVED",
            resolutionNote: "Payment refunded via provider portal.",
            resolvedAt: expect.any(Date),
          }),
        }),
      );
    });

    it("creates a ticket on a user's behalf with audit log", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: USER_1_ID,
        email: "alice@monologg.dev",
      });

      prismaMock.supportTicket.create.mockResolvedValue({
        id: "t-phone-1",
        userId: USER_1_ID,
        subject: "WhatsApp complaint regarding contract",
        status: "OPEN",
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/admin/tickets/on-behalf",
        headers: { authorization: `Bearer ${ADMIN_TOKEN}`, "x-admin-role": "SUPPORT" },
        payload: {
          userId: USER_1_ID,
          subject: "WhatsApp complaint regarding contract",
          message: "User called customer support WhatsApp complaining about delayed delivery.",
          category: "COMPLAINT",
          source: "ADMIN_CREATED",
        },
      });

      expect(res.statusCode).toBe(201);
      expect(prismaMock.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "TICKET_CREATED_ON_BEHALF",
            targetType: "SupportTicket",
          }),
        }),
      );
    });
  });
});
