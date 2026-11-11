import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildApp } from "../app.js";
import {
  collectActiveAlertConditions,
  evaluateAllAlertRules,
  listAlertEvents,
  acknowledgeAlert,
  resolveAlert,
} from "./alerts/engine.js";
import {
  generateAndSendDailyDigest,
  generateAndSendWeeklySummary,
} from "./alerts/digest.js";
import { runAdminTick } from "./cron/tick.js";
import { getSystemHealth } from "../services/adminHealth.js";

// Mock DB clients
vi.mock("../db/client.js", () => {
  return {
    prisma: {
      alertEvent: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        upsert: vi.fn(),
      },
      payment: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      booking: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      withdrawalRequest: {
        findMany: vi.fn(),
      },
      dispute: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      supportTicket: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      verificationRecording: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      productEvent: {
        findMany: vi.fn(),
        count: vi.fn(),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      adminJob: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      jobRun: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
      },
      kpiDaily: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        upsert: vi.fn(),
      },
      mediaAsset: {
        findMany: vi.fn(),
      },
      brief: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      creator: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      client: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      paymentEvent: {
        findMany: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      adminUser: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      adminSession: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      adminAuditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
    },
  };
});

vi.mock("../db/adminRoClient.js", () => {
  return {
    adminRoPrisma: {
      alertEvent: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      payment: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      booking: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      withdrawalRequest: {
        findMany: vi.fn(),
      },
      dispute: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      supportTicket: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      verificationRecording: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      productEvent: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      adminJob: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
      },
      jobRun: {
        findMany: vi.fn(),
      },
      kpiDaily: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      paymentEvent: {
        findMany: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      brief: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      creator: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      client: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      userTag: {
        findMany: vi.fn(),
      },
    },
    getMaterializedViewLastRefreshed: vi.fn().mockResolvedValue(new Date("2026-02-10T12:00:00Z")),
  };
});

vi.mock("../providers/index.js", () => {
  return {
    notifyProvider: {
      email: vi.fn().mockResolvedValue(undefined),
      sms: vi.fn().mockResolvedValue(undefined),
      inApp: vi.fn().mockResolvedValue(undefined),
    },
  };
});

import { prisma } from "../db/client.js";
import { adminRoPrisma } from "../db/adminRoClient.js";
import { notifyProvider } from "../providers/index.js";

const prismaMock = prisma as any;
const adminRoMock = adminRoPrisma as any;
const notifyMock = notifyProvider as any;

describe("Phase A12: Alerts, Digests and System Health (PRD Module M11)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  const ADMIN_SUPERADMIN_TOKEN = "mock-admin:superadmin@admin.monologg.dev:aal2";
  const ADMIN_OPS_TOKEN = "mock-admin:ops@admin.monologg.dev:aal2";
  const ADMIN_VIEWER_TOKEN = "mock-admin:viewer@admin.monologg.dev:aal2";
  const CRON_SECRET = "monologg_cron_secret_alpha_2026";

  beforeEach(async () => {
    vi.stubEnv("ADMIN_AUTH_PROVIDER", "mock");
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();

    // Default admin mock session
    prismaMock.adminSession.findFirst.mockImplementation(async ({ where }: any) => {
      return {
        id: "sess-1",
        adminUserId: where?.adminUserId || "adm-super",
        lastSeenAt: new Date(),
        createdAt: new Date(),
        endedAt: null,
      };
    });
    prismaMock.adminSession.update.mockResolvedValue({});

    prismaMock.adminUser.findFirst.mockImplementation(async ({ where }: any) => {
      const subject = (where?.authSubject || where?.email || "").toLowerCase();
      if (subject.includes("superadmin")) {
        return { id: "adm-super", email: "superadmin@admin.monologg.dev", role: "SUPER_ADMIN", status: "ACTIVE" };
      }
      if (subject.includes("ops")) {
        return { id: "adm-ops", email: "ops@admin.monologg.dev", role: "OPS", status: "ACTIVE" };
      }
      return { id: "adm-viewer", email: "viewer@admin.monologg.dev", role: "VIEWER", status: "ACTIVE" };
    });

    prismaMock.adminUser.findMany.mockImplementation(async ({ where }: any) => {
      if (where?.role === "SUPER_ADMIN" || where?.role?.in?.includes("SUPER_ADMIN")) {
        return [{ id: "adm-super", email: "superadmin@admin.monologg.dev", role: "SUPER_ADMIN", status: "ACTIVE" }];
      }
      if (where?.role === "VIEWER") {
        return [{ id: "adm-viewer", email: "viewer@admin.monologg.dev", role: "VIEWER", status: "ACTIVE" }];
      }
      return [];
    });

    prismaMock.adminAuditLog.create.mockResolvedValue({});
    notifyMock.email.mockResolvedValue(undefined);

    // Default Prisma and AdminRo mock values
    prismaMock.brief.count.mockResolvedValue(0);
    prismaMock.creator.count.mockResolvedValue(0);
    prismaMock.client.count.mockResolvedValue(0);
    prismaMock.booking.count.mockResolvedValue(0);
    prismaMock.user.count.mockResolvedValue(10);
    prismaMock.productEvent.count.mockResolvedValue(0);
    prismaMock.mediaAsset.findMany.mockResolvedValue([]);
    prismaMock.verificationRecording.findMany.mockResolvedValue([]);
    prismaMock.verificationRecording.count.mockResolvedValue(0);
    prismaMock.kpiDaily.upsert.mockResolvedValue({});
    prismaMock.kpiDaily.findMany.mockResolvedValue([]);

    adminRoMock.brief.count.mockResolvedValue(0);
    adminRoMock.creator.count.mockResolvedValue(5);
    adminRoMock.client.count.mockResolvedValue(5);
    adminRoMock.user.count.mockResolvedValue(10);
    adminRoMock.user.findMany.mockResolvedValue([]);
    adminRoMock.booking.count.mockResolvedValue(0);
    adminRoMock.booking.findMany.mockResolvedValue([]);
    adminRoMock.payment.count.mockResolvedValue(0);
    adminRoMock.payment.findMany.mockResolvedValue([]);
    adminRoMock.userTag.findMany.mockResolvedValue([]);
    adminRoMock.productEvent.findMany.mockResolvedValue([]);
    adminRoMock.productEvent.count.mockResolvedValue(0);
    adminRoMock.withdrawalRequest.findMany.mockResolvedValue([]);
    adminRoMock.dispute.findMany.mockResolvedValue([]);
    adminRoMock.dispute.count.mockResolvedValue(0);
    adminRoMock.supportTicket.findMany.mockResolvedValue([]);
    adminRoMock.supportTicket.count.mockResolvedValue(0);
    adminRoMock.verificationRecording.findMany.mockResolvedValue([]);
    adminRoMock.verificationRecording.count.mockResolvedValue(0);
    adminRoMock.adminJob.findMany.mockResolvedValue([]);
    adminRoMock.adminJob.findFirst.mockResolvedValue(null);
    adminRoMock.jobRun.findMany.mockResolvedValue([]);
  });

  // ── 1. Alert Rule Engine Evaluation & Auto-Resolution ────────────────────────
  describe("1. Alert Rule Engine & Auto-Resolution", () => {
    it("fires on planted conditions (stuck booking, failed payments spike, ticket SLA breach)", async () => {
      const now = new Date("2026-02-10T14:00:00Z");

      // Plant 1: Payment failure spike (>20% failed out of 5 attempts)
      adminRoMock.payment.findMany.mockImplementation(async (args?: any) => {
        if (args?.where?.booking || args?.where?.status === "ESCROW_HELD" || args?.where?.status === "RELEASED" || args?.where?.status === "INITIATED") {
          return [];
        }
        return [
          { id: "p-1", status: "FAILED" },
          { id: "p-2", status: "FAILED" },
          { id: "p-3", status: "SUCCESS" },
          { id: "p-4", status: "SUCCESS" },
          { id: "p-5", status: "SUCCESS" },
        ];
      }); // 2/5 = 40% failure > 20%

      // Plant 2: Stuck booking (ESCROW_LOCKED over 7 days)
      adminRoMock.booking.findMany.mockResolvedValue([
        {
          id: "bk-stuck-1",
          state: "ESCROW_LOCKED",
          createdAt: new Date("2026-02-01T00:00:00Z"), // 9 days old > 7 days
          slotHoldExpiresAt: null,
        },
      ]);

      // Plant 3: Support ticket SLA breached (urgent priority)
      adminRoMock.supportTicket.findMany.mockResolvedValue([
        {
          id: "t-urgent-1",
          number: 1042,
          priority: "URGENT",
          status: "OPEN",
          createdAt: new Date("2026-02-10T08:00:00Z"),
          slaDueAt: new Date("2026-02-10T12:00:00Z"), // Breached 2 hours ago
          firstResponseAt: null,
        },
      ]);

      // Clean defaults for other rules
      adminRoMock.withdrawalRequest.findMany.mockResolvedValue([]);
      adminRoMock.dispute.findMany.mockResolvedValue([]);
      adminRoMock.verificationRecording.findMany.mockResolvedValue([]);
      adminRoMock.productEvent.count.mockResolvedValue(0);
      adminRoMock.adminJob.findMany.mockResolvedValue([]);
      adminRoMock.jobRun.findMany.mockResolvedValue([]);
      adminRoMock.user.count.mockResolvedValue(5);

      const conditions = await collectActiveAlertConditions(now);

      const paymentAlert = conditions.find((c) => c.ruleKey === "payment_failure_spike");
      expect(paymentAlert).toBeDefined();
      expect(paymentAlert?.severity).toBe("CRITICAL");

      const bookingAlert = conditions.find((c) => c.ruleKey === "booking_stuck");
      expect(bookingAlert).toBeDefined();
      expect(bookingAlert?.subjectId).toBe("bk-stuck-1");

      const ticketAlert = conditions.find((c) => c.ruleKey === "ticket_sla_breach");
      expect(ticketAlert).toBeDefined();
      expect(ticketAlert?.severity).toBe("CRITICAL"); // URGENT SLA breach is critical!
    });

    it("does not fire on clean data", async () => {
      const now = new Date("2026-02-10T14:00:00Z");

      adminRoMock.payment.findMany.mockImplementation(async (args?: any) => {
        if (args?.where?.booking || args?.where?.status === "ESCROW_HELD" || args?.where?.status === "RELEASED" || args?.where?.status === "INITIATED") {
          return [];
        }
        return [
          { id: "p-1", status: "SUCCESS" },
          { id: "p-2", status: "SUCCESS" },
          { id: "p-3", status: "SUCCESS" },
        ];
      });
      adminRoMock.booking.findMany.mockResolvedValue([]);
      adminRoMock.withdrawalRequest.findMany.mockResolvedValue([]);
      adminRoMock.dispute.findMany.mockResolvedValue([]);
      adminRoMock.supportTicket.findMany.mockResolvedValue([]);
      adminRoMock.verificationRecording.findMany.mockResolvedValue([]);
      adminRoMock.productEvent.count.mockResolvedValue(0);
      adminRoMock.adminJob.findMany.mockResolvedValue([]);
      adminRoMock.jobRun.findMany.mockResolvedValue([]);
      adminRoMock.kpiDaily.findFirst.mockResolvedValue(null);
      adminRoMock.user.count.mockResolvedValue(10); // Alpha signups present

      const conditions = await collectActiveAlertConditions(now);
      const criticalOrWarning = conditions.filter((c) => c.severity !== "INFO");
      expect(criticalOrWarning).toHaveLength(0);
    });

    it("auto-resolves open alerts when condition clears", async () => {
      const now = new Date("2026-02-10T14:00:00Z");

      // Existing open alert in DB: bk-stuck-1
      prismaMock.alertEvent.findMany.mockResolvedValue([
        {
          id: "alert-prev-1",
          ruleKey: "booking_stuck",
          subjectType: "booking",
          subjectId: "bk-stuck-1",
          status: "OPEN",
          detail: { message: "Booking was stuck" },
        },
      ]);
      prismaMock.alertEvent.update.mockResolvedValue({});

      // Booking is now completed / cleared
      adminRoMock.payment.findMany.mockResolvedValue([]);
      adminRoMock.booking.findMany.mockResolvedValue([]);
      adminRoMock.withdrawalRequest.findMany.mockResolvedValue([]);
      adminRoMock.dispute.findMany.mockResolvedValue([]);
      adminRoMock.supportTicket.findMany.mockResolvedValue([]);
      adminRoMock.verificationRecording.findMany.mockResolvedValue([]);
      adminRoMock.productEvent.count.mockResolvedValue(0);
      adminRoMock.adminJob.findMany.mockResolvedValue([]);
      adminRoMock.jobRun.findMany.mockResolvedValue([]);
      adminRoMock.user.count.mockResolvedValue(5);

      const result = await evaluateAllAlertRules(now, { sendNotifications: false });

      expect(result.autoResolved).toBe(1);
      expect(prismaMock.alertEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "alert-prev-1" },
          data: expect.objectContaining({
            status: "RESOLVED",
            detail: expect.objectContaining({
              resolvedReason: "AUTO_RESOLVED",
            }),
          }),
        }),
      );
    });
  });

  // ── 2. Notification Throttling ──────────────────────────────────────────────
  describe("2. Critical Alert Notification & Throttling", () => {
    it("emails SUPER_ADMIN on critical alert and throttles repeated notifications within 60 minutes", async () => {
      const now = new Date("2026-02-10T14:00:00Z");

      // Condition: Critical payment failure spike
      adminRoMock.payment.findMany.mockImplementation(async (args?: any) => {
        if (args?.where?.booking || args?.where?.status === "ESCROW_HELD" || args?.where?.status === "RELEASED" || args?.where?.status === "INITIATED") {
          return [];
        }
        return [
          { id: "p-1", status: "FAILED" },
          { id: "p-2", status: "FAILED" },
          { id: "p-3", status: "FAILED" },
          { id: "p-4", status: "SUCCESS" },
          { id: "p-5", status: "SUCCESS" },
        ];
      });
      adminRoMock.booking.findMany.mockResolvedValue([]);
      adminRoMock.withdrawalRequest.findMany.mockResolvedValue([]);
      adminRoMock.dispute.findMany.mockResolvedValue([]);
      adminRoMock.supportTicket.findMany.mockResolvedValue([]);
      adminRoMock.verificationRecording.findMany.mockResolvedValue([]);
      adminRoMock.productEvent.count.mockResolvedValue(0);
      adminRoMock.adminJob.findMany.mockResolvedValue([]);
      adminRoMock.jobRun.findMany.mockResolvedValue([]);
      adminRoMock.user.count.mockResolvedValue(5);

      // First run: brand new alert -> sends notification
      prismaMock.alertEvent.findMany.mockResolvedValueOnce([]);
      prismaMock.alertEvent.create.mockResolvedValue({ id: "alt-new-1" });

      const run1 = await evaluateAllAlertRules(now, { sendNotifications: true });
      expect(run1.notificationsSent).toBe(1);
      expect(notifyMock.email).toHaveBeenCalledTimes(1);

      // Second run 15 minutes later (condition still holds) -> throttled!
      const fifteenMinsLater = new Date(now.getTime() + 15 * 60 * 1000);
      prismaMock.alertEvent.findMany.mockResolvedValueOnce([
        {
          id: "alt-new-1",
          ruleKey: "payment_failure_spike",
          subjectType: "system",
          subjectId: "payment_gateway",
          status: "OPEN",
          detail: { lastNotifiedAt: now.toISOString() },
        },
      ]);
      prismaMock.alertEvent.update.mockResolvedValue({});

      notifyMock.email.mockClear();
      const run2 = await evaluateAllAlertRules(fifteenMinsLater, { sendNotifications: true });
      expect(run2.notificationsSent).toBe(0);
      expect(notifyMock.email).not.toHaveBeenCalled(); // Throttled!
    });
  });

  // ── 3. Alert Actions: Acknowledge & Resolve ──────────────────────────────────
  describe("3. Acknowledge and Resolve API Endpoints", () => {
    it("allows OPS to acknowledge an alert and creates audit entry", async () => {
      prismaMock.alertEvent.update.mockResolvedValue({});

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/admin/alerts/alt-101/ack",
        headers: { authorization: `Bearer ${ADMIN_OPS_TOKEN}` },
      });

      expect(res.statusCode).toBe(200);
      expect(prismaMock.alertEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "alt-101" },
          data: expect.objectContaining({ status: "ACKNOWLEDGED" }),
        }),
      );
      expect(prismaMock.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "ALERT_ACK",
            targetId: "alt-101",
          }),
        }),
      );
    });

    it("forbids VIEWER from acknowledging alerts", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/admin/alerts/alt-101/ack",
        headers: { authorization: `Bearer ${ADMIN_VIEWER_TOKEN}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it("resolves alert with required note and writes audit entry", async () => {
      prismaMock.alertEvent.findUnique.mockResolvedValue({
        id: "alt-102",
        detail: {},
      });
      prismaMock.alertEvent.update.mockResolvedValue({});

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/admin/alerts/alt-102/resolve",
        headers: { authorization: `Bearer ${ADMIN_SUPERADMIN_TOKEN}` },
        payload: { note: "Provider restarted and gateway failure cleared" },
      });

      expect(res.statusCode).toBe(200);
      expect(prismaMock.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "ALERT_RESOLVED",
            targetId: "alt-102",
            reason: "Provider restarted and gateway failure cleared",
          }),
        }),
      );
    });
  });

  // ── 4. Daily Digest & Weekly Summary ─────────────────────────────────────────
  describe("4. Daily and Weekly Digests (Code-Computed Insights)", () => {
    it("generates daily digest with code-computed insights and emails SUPER_ADMIN and OPS", async () => {
      const now = new Date("2026-02-10T07:30:00Z");

      adminRoMock.supportTicket.count.mockResolvedValue(3);
      adminRoMock.dispute.count.mockResolvedValue(1);
      adminRoMock.payment.findMany.mockResolvedValue([]);
      adminRoMock.booking.findMany.mockResolvedValue([]);
      adminRoMock.withdrawalRequest.findMany.mockResolvedValue([]);
      adminRoMock.verificationRecording.findMany.mockResolvedValue([]);
      adminRoMock.productEvent.count.mockResolvedValue(0);
      adminRoMock.adminJob.findMany.mockResolvedValue([]);
      adminRoMock.jobRun.findMany.mockResolvedValue([]);
      adminRoMock.user.count.mockResolvedValue(8);

      const digest = await generateAndSendDailyDigest(now);

      expect(digest.insights).toHaveLength(3);
      expect(digest.insights[0]).toMatch(/signups/i);
      expect(digest.recipientsCount).toBeGreaterThan(0);
      expect(notifyMock.email).toHaveBeenCalled();
    });

    it("generates weekly summary with WoW comparisons for VIEWER recipients", async () => {
      const now = new Date("2026-02-09T08:00:00Z"); // Monday

      const summary = await generateAndSendWeeklySummary(now);

      expect(summary.wowComparisons).toBeDefined();
      expect(summary.summaryText).toContain("Weekly summary");
      expect(notifyMock.email).toHaveBeenCalled();
    });
  });

  // ── 5. System Health ────────────────────────────────────────────────────────
  describe("5. System Health Telemetry (AD-28)", () => {
    it("returns database top tables, R2 storage usage against limit, and job statuses", async () => {
      adminRoMock.user.count.mockResolvedValue(150);
      adminRoMock.productEvent.count.mockResolvedValue(15000);
      adminRoMock.booking.count.mockResolvedValue(45);
      adminRoMock.payment.count.mockResolvedValue(40);
      adminRoMock.supportTicket.count.mockResolvedValue(10);
      adminRoMock.alertEvent.count.mockResolvedValue(2);
      adminRoMock.verificationRecording.count.mockResolvedValue(12);
      adminRoMock.adminJob.count.mockResolvedValue(3);
      adminRoMock.adminJob.findFirst.mockResolvedValue(null);

      adminRoMock.kpiDaily.findMany.mockResolvedValue([
        {
          day: new Date("2026-02-10"),
          metric: "storage_bytes",
          dimension: "r2_buckets",
          value: BigInt(850 * 1024 * 1024), // 850 MB
        },
      ]);

      adminRoMock.jobRun.findMany.mockResolvedValue([
        {
          jobKey: "alerts_evaluation",
          lastStartedAt: new Date("2026-02-10T12:00:00Z"),
          lastFinishedAt: new Date("2026-02-10T12:00:01Z"),
          lastStatus: "DONE",
          lastError: null,
          nextDueAt: new Date("2026-02-10T12:05:00Z"),
        },
      ]);

      adminRoMock.paymentEvent.findMany.mockResolvedValue([]);
      adminRoMock.productEvent.findMany.mockResolvedValue([]);

      const health = await getSystemHealth();

      expect(health.database.topTables.length).toBeGreaterThan(0);
      expect(health.storage.r2SizeBytes).toBeGreaterThan(0);
      expect(health.storage.limitBytes).toBe(10 * 1024 * 1024 * 1024); // 10 GB limit
      expect(health.jobs).toHaveLength(1);
      expect(health.jobs[0].jobKey).toBe("alerts_evaluation");
      expect(health.externalServices).toHaveLength(4); // Supabase, Cloudflare, Vercel, Sentry
    });
  });

  // ── 6. Cron Tick Lease Locks & Error Isolation ──────────────────────────────
  describe("6. Cron Tick Execution, Lease Locks & Error Handling", () => {
    it("returns 401 when CRON_SECRET is wrong or missing", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/cron/admin-tick",
        headers: { authorization: "Bearer wrong_secret" },
      });

      expect(res.statusCode).toBe(401);
    });

    it("runs due jobs successfully on valid CRON_SECRET", async () => {
      prismaMock.jobRun.findUnique.mockResolvedValue(null);
      prismaMock.jobRun.upsert.mockResolvedValue({});
      prismaMock.jobRun.update.mockResolvedValue({});
      prismaMock.alertEvent.findMany.mockResolvedValue([]);
      prismaMock.adminJob.findMany.mockResolvedValue([]);

      adminRoMock.payment.findMany.mockResolvedValue([]);
      adminRoMock.booking.findMany.mockResolvedValue([]);
      adminRoMock.withdrawalRequest.findMany.mockResolvedValue([]);
      adminRoMock.dispute.findMany.mockResolvedValue([]);
      adminRoMock.supportTicket.findMany.mockResolvedValue([]);
      adminRoMock.verificationRecording.findMany.mockResolvedValue([]);
      adminRoMock.productEvent.count.mockResolvedValue(0);
      adminRoMock.user.count.mockResolvedValue(5);

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/cron/admin-tick",
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.status).toBe("ok");
      expect(data.jobsExecuted).toContain("alerts_evaluation");
    });

    it("prevents overlapping ticks from running the same job when lease is active", async () => {
      const now = new Date("2026-02-10T12:00:00Z");

      // Active lease: started 1 minute ago (lease duration is 5 mins)
      prismaMock.jobRun.findUnique.mockResolvedValue({
        jobKey: "alerts_evaluation",
        lastStatus: "RUNNING",
        lastStartedAt: new Date(now.getTime() - 60 * 1000),
      });

      const tickRes = await runAdminTick(now);
      expect(tickRes.jobsExecuted).not.toContain("alerts_evaluation"); // Skipped due to active lease!
    });

    it("recovers an expired lease and proceeds", async () => {
      const now = new Date("2026-02-10T12:00:00Z");

      // Expired lease: started 10 minutes ago (> 5 mins lease timeout)
      prismaMock.jobRun.findUnique.mockResolvedValue({
        jobKey: "alerts_evaluation",
        lastStatus: "RUNNING",
        lastStartedAt: new Date(now.getTime() - 10 * 60 * 1000),
      });
      prismaMock.jobRun.upsert.mockResolvedValue({});
      prismaMock.jobRun.update.mockResolvedValue({});
      prismaMock.alertEvent.findMany.mockResolvedValue([]);

      adminRoMock.payment.findMany.mockResolvedValue([]);
      adminRoMock.booking.findMany.mockResolvedValue([]);
      adminRoMock.withdrawalRequest.findMany.mockResolvedValue([]);
      adminRoMock.dispute.findMany.mockResolvedValue([]);
      adminRoMock.supportTicket.findMany.mockResolvedValue([]);
      adminRoMock.verificationRecording.findMany.mockResolvedValue([]);
      adminRoMock.productEvent.count.mockResolvedValue(0);
      adminRoMock.user.count.mockResolvedValue(5);

      const tickRes = await runAdminTick(now);
      expect(tickRes.jobsExecuted).toContain("alerts_evaluation"); // Recovered!
    });

    it("isolates job failures so one failing job does not stop others and records alert", async () => {
      const now = new Date("2026-02-10T12:00:00Z");

      prismaMock.jobRun.findUnique.mockResolvedValue(null);
      prismaMock.jobRun.upsert.mockResolvedValue({});
      prismaMock.jobRun.update.mockResolvedValue({});
      prismaMock.alertEvent.upsert.mockResolvedValue({});

      // Mock AdminJob.findMany throwing an error during export_worker
      prismaMock.adminJob.findMany.mockRejectedValueOnce(new Error("Database connection dropped"));

      adminRoMock.payment.findMany.mockResolvedValue([]);
      adminRoMock.booking.findMany.mockResolvedValue([]);
      adminRoMock.withdrawalRequest.findMany.mockResolvedValue([]);
      adminRoMock.dispute.findMany.mockResolvedValue([]);
      adminRoMock.supportTicket.findMany.mockResolvedValue([]);
      adminRoMock.verificationRecording.findMany.mockResolvedValue([]);
      adminRoMock.productEvent.count.mockResolvedValue(0);
      adminRoMock.user.count.mockResolvedValue(5);
      prismaMock.alertEvent.findMany.mockResolvedValue([]);

      const tickRes = await runAdminTick(now);

      expect(tickRes.status).toBe("degraded");
      expect(tickRes.errors?.export_worker).toBe("Database connection dropped");
      expect(tickRes.jobsExecuted).toContain("alerts_evaluation"); // Alerts still ran successfully!

      // Scheduled job failure produced an alert
      expect(prismaMock.alertEvent.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            ruleKey: "scheduled_job_overdue_or_failed",
            subjectId: "export_worker",
          }),
        }),
      );
    });

    it("defers jobs when tick execution budget is exhausted", async () => {
      const now = new Date("2026-02-10T12:00:00Z");

      prismaMock.jobRun.findUnique.mockResolvedValue(null);
      prismaMock.jobRun.upsert.mockResolvedValue({});
      prismaMock.jobRun.update.mockResolvedValue({});
      prismaMock.alertEvent.findMany.mockResolvedValue([]);

      adminRoMock.payment.findMany.mockResolvedValue([]);
      adminRoMock.booking.findMany.mockResolvedValue([]);
      adminRoMock.withdrawalRequest.findMany.mockResolvedValue([]);
      adminRoMock.dispute.findMany.mockResolvedValue([]);
      adminRoMock.supportTicket.findMany.mockResolvedValue([]);
      adminRoMock.verificationRecording.findMany.mockResolvedValue([]);
      adminRoMock.productEvent.count.mockResolvedValue(0);
      adminRoMock.user.count.mockResolvedValue(5);

      // Force 0ms budget so remaining jobs are deferred
      const tickRes = await runAdminTick(now, { simulatedBudgetMs: 0 });
      expect(tickRes.jobsDeferred.length).toBeGreaterThan(0);
    });
  });
});
