import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildApp } from "../app.js";
import {
  VERIFICATION_SLA_HOURS,
  isVerificationOverdue,
  getRemainingSlaHours,
} from "../config/verificationRules.js";

// Mock DB and providers
vi.mock("../db/client.js", () => {
  return {
    prisma: {
      verificationRecording: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      creator: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      kycCheck: {
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
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
    },
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
import { notifyProvider } from "../providers/index.js";
import { enqueueEmailNotification } from "../services/notifications.js";

const prismaMock = prisma as any;
const notifyProviderMock = notifyProvider as any;
const enqueueEmailMock = enqueueEmailNotification as any;

describe("Phase A10: Verification & Compliance Queue (PRD Module M9)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  const TALENT_USER_ID = "usr-talent-1";
  const CREATOR_ID = "creator-1";
  const RECORDING_ID = "rec-1";

  const ADMIN_COMPLIANCE_ID = "adm-comp-1";
  const ADMIN_SUPERADMIN_ID = "adm-super-1";
  const ADMIN_OPS_ID = "adm-ops-1";
  const ADMIN_SUPPORT_ID = "adm-sup-1";
  const ADMIN_FINANCE_ID = "adm-fin-1";
  const ADMIN_VIEWER_ID = "adm-view-1";

  const ADMIN_COMPLIANCE_TOKEN = "mock-admin:compliance@admin.monologg.dev:aal2";
  const ADMIN_SUPERADMIN_TOKEN = "mock-admin:superadmin@admin.monologg.dev:aal2";
  const ADMIN_OPS_TOKEN = "mock-admin:ops@admin.monologg.dev:aal2";
  const ADMIN_SUPPORT_TOKEN = "mock-admin:support@admin.monologg.dev:aal2";
  const ADMIN_FINANCE_TOKEN = "mock-admin:finance@admin.monologg.dev:aal2";
  const ADMIN_VIEWER_TOKEN = "mock-admin:viewer@admin.monologg.dev:aal2";

  beforeEach(async () => {
    vi.stubEnv("ADMIN_AUTH_PROVIDER", "mock");
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();

    // Default admin mock session
    prismaMock.adminSession.findFirst.mockImplementation(async ({ where }: any) => {
      return {
        id: "sess-1",
        adminUserId: where?.adminUserId || ADMIN_COMPLIANCE_ID,
        lastSeenAt: new Date(),
        createdAt: new Date(),
        endedAt: null,
      };
    });
    prismaMock.adminSession.update.mockResolvedValue({});

    prismaMock.adminUser.findFirst.mockImplementation(async ({ where }: any) => {
      const subject = (where?.authSubject || where?.email || "").toLowerCase();

      if (subject.includes("superadmin")) {
        return { id: ADMIN_SUPERADMIN_ID, email: "superadmin@admin.monologg.dev", role: "SUPER_ADMIN", status: "ACTIVE" };
      }
      if (subject.includes("ops")) {
        return { id: ADMIN_OPS_ID, email: "ops@admin.monologg.dev", role: "OPS", status: "ACTIVE" };
      }
      if (subject.includes("support")) {
        return { id: ADMIN_SUPPORT_ID, email: "support@admin.monologg.dev", role: "SUPPORT", status: "ACTIVE" };
      }
      if (subject.includes("finance")) {
        return { id: ADMIN_FINANCE_ID, email: "finance@admin.monologg.dev", role: "FINANCE", status: "ACTIVE" };
      }
      if (subject.includes("viewer")) {
        return { id: ADMIN_VIEWER_ID, email: "viewer@admin.monologg.dev", role: "VIEWER", status: "ACTIVE" };
      }
      return { id: ADMIN_COMPLIANCE_ID, email: "compliance@admin.monologg.dev", role: "COMPLIANCE", status: "ACTIVE" };
    });

    prismaMock.adminAuditLog.create.mockResolvedValue({});
  });

  const buildMockRecording = (overrides: Record<string, any> = {}) => ({
    id: RECORDING_ID,
    creatorId: CREATOR_ID,
    url: "https://storage.monologg.dev/recordings/rec-1.mp4",
    durationSec: 68,
    guidelineAck: true,
    status: "UPLOADED",
    reviewerNote: null,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000), // 2 hours ago
    updatedAt: new Date(Date.now() - 2 * 3600 * 1000),
    creator: {
      id: CREATOR_ID,
      userId: TALENT_USER_ID,
      name: "Chioma Okonjo",
      niche: "ACTOR",
      location: "Lagos, Nigeria",
      avatarUrl: "https://cdn.monologg.dev/avatars/chioma.jpg",
      verification: "UNVERIFIED", // X3: identity KYC status
      user: {
        id: TALENT_USER_ID,
        email: "chioma.okonjo@example.com",
        phone: "+2348012345678",
        createdAt: new Date(Date.now() - 30 * 86400 * 1000),
      },
      kycChecks: [
        {
          id: "kyc-1",
          creatorId: CREATOR_ID,
          provider: "smile_identity",
          providerRef: "smile-ref-123",
          status: "FAILED",
          raw: { reasonCode: "ID_EXPIRED", ResultCode: "1012", details: "Sensitive provider json" },
          createdAt: new Date(Date.now() - 5 * 86400 * 1000),
        },
      ],
    },
    ...overrides,
  });

  describe("1. Verification Queue Listing & Filters (AD-26)", () => {
    it("lists recordings with age, SLA remaining, and masked creator info", async () => {
      const rec = buildMockRecording();
      prismaMock.verificationRecording.count.mockResolvedValue(1);
      prismaMock.verificationRecording.findMany.mockResolvedValue([rec]);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/verifications",
        headers: { authorization: `Bearer ${ADMIN_COMPLIANCE_TOKEN}` },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.total).toBe(1);
      expect(data.items).toHaveLength(1);

      const item = data.items[0];
      expect(item.id).toBe(RECORDING_ID);
      expect(item.durationSec).toBe(68);
      expect(item.creatorName).toBe("Chioma O."); // Masked PII (maskName format)
      expect(item.isOverdue).toBe(false);
      expect(item.slaRemainingHours).toBeGreaterThan(40);
    });

    it("identifies overdue recordings when created > 48 hours ago", async () => {
      const overdueRec = buildMockRecording({
        id: "rec-overdue",
        createdAt: new Date(Date.now() - 50 * 3600 * 1000), // 50 hours ago (> 48h SLA)
      });
      prismaMock.verificationRecording.count.mockResolvedValue(1);
      prismaMock.verificationRecording.findMany.mockResolvedValue([overdueRec]);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/verifications?isOverdue=true",
        headers: { authorization: `Bearer ${ADMIN_COMPLIANCE_TOKEN}` },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.items[0].isOverdue).toBe(true);
      expect(data.items[0].slaRemainingHours).toBe(0);
      expect(data.items[0].ageHours).toBeGreaterThanOrEqual(50);
    });
  });

  describe("2. Detail & Auto-Transition to IN_REVIEW", () => {
    it("automatically transitions UPLOADED recording to IN_REVIEW upon opening", async () => {
      const rec = buildMockRecording({ status: "UPLOADED" });
      prismaMock.verificationRecording.findUnique.mockResolvedValue(rec);
      prismaMock.verificationRecording.update.mockResolvedValue({ ...rec, status: "IN_REVIEW" });

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/admin/verifications/${RECORDING_ID}`,
        headers: { authorization: `Bearer ${ADMIN_COMPLIANCE_TOKEN}` },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.status).toBe("IN_REVIEW");

      // Assert auto-transition update was triggered
      expect(prismaMock.verificationRecording.update).toHaveBeenCalledWith({
        where: { id: RECORDING_ID },
        data: { status: "IN_REVIEW" },
      });

      // Assert status change was audited
      expect(prismaMock.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "VERIFICATION_STATUS_CHANGED",
            targetType: "VerificationRecording",
            targetId: RECORDING_ID,
          }),
        }),
      );
    });

    it("evaluates the guideline checklist beside the video player", async () => {
      const rec = buildMockRecording({ durationSec: 75, guidelineAck: true });
      prismaMock.verificationRecording.findUnique.mockResolvedValue(rec);

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/admin/verifications/${RECORDING_ID}`,
        headers: { authorization: `Bearer ${ADMIN_COMPLIANCE_TOKEN}` },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.guidelineChecklist).toHaveLength(5);

      const durationItem = data.guidelineChecklist.find((g: any) => g.id === "under_90_seconds");
      expect(durationItem).toBeDefined();
      expect(durationItem.passed).toBe(true);
      expect(durationItem.label).toContain("75s");
    });
  });

  describe("3. KYC Panel Sanitization (Prompt Requirement #4)", () => {
    it("returns provider status, attempts, and failure reason code only — zero documents, zero raw payload", async () => {
      const rec = buildMockRecording();
      prismaMock.verificationRecording.findUnique.mockResolvedValue(rec);

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/admin/verifications/${RECORDING_ID}`,
        headers: { authorization: `Bearer ${ADMIN_COMPLIANCE_TOKEN}` },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);

      // Verify KYC Panel structure
      expect(data.kycPanel).toEqual({
        status: "FAILED",
        attempts: 1,
        provider: "smile_identity",
        failureReasonCode: "ID_EXPIRED",
        lastAttemptAt: expect.any(String),
      });

      // Assert that raw provider payload is NEVER exposed in the response
      expect(data.kycPanel.raw).toBeUndefined();
      expect(JSON.stringify(data)).not.toContain("Sensitive provider json");
      expect(JSON.stringify(data)).not.toContain("smile-ref-123");
    });
  });

  describe("4. Audited Short-Lived Signed URL", () => {
    it("generates a 5-minute signed URL and logs MEDIA_VIEWED audit row", async () => {
      const rec = buildMockRecording();
      prismaMock.verificationRecording.findUnique.mockResolvedValue(rec);

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/admin/verifications/${RECORDING_ID}/signed-url`,
        headers: { authorization: `Bearer ${ADMIN_COMPLIANCE_TOKEN}` },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.signedUrl).toContain("https://storage.monologg.dev/recordings/rec-1.mp4");
      expect(data.signedUrl).toContain("exp=");
      expect(data.signedUrl).toContain("sig=");

      const expiresAt = new Date(data.expiresAt).getTime();
      const diffMs = expiresAt - Date.now();
      expect(diffMs).toBeGreaterThan(4 * 60 * 1000);
      expect(diffMs).toBeLessThanOrEqual(5 * 60 * 1000 + 5000);

      // Audit row MEDIA_VIEWED
      expect(prismaMock.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "MEDIA_VIEWED",
            targetType: "VerificationRecording",
            targetId: RECORDING_ID,
          }),
        }),
      );
    });
  });

  describe("5. Decisions: Approve and Needs Re-record", () => {
    it("APPROVE decision updates status, stores note, notifies talent in-app & email, and writes audit row", async () => {
      const rec = buildMockRecording();
      prismaMock.verificationRecording.findUnique.mockResolvedValue(rec);
      prismaMock.creator.findUnique.mockResolvedValue(rec.creator);
      prismaMock.kycCheck.count.mockResolvedValue(1);
      prismaMock.verificationRecording.update.mockResolvedValue({
        ...rec,
        status: "APPROVED",
        reviewerNote: "Excellent presentation and natural delivery",
      });

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/admin/verifications/${RECORDING_ID}/decision`,
        headers: {
          authorization: `Bearer ${ADMIN_COMPLIANCE_TOKEN}`,
          "content-type": "application/json",
        },
        payload: {
          decision: "APPROVE",
          reviewerNote: "Excellent presentation and natural delivery",
        },
      });

      expect(res.statusCode).toBe(200);
      expect(prismaMock.verificationRecording.update).toHaveBeenCalledWith({
        where: { id: RECORDING_ID },
        data: {
          status: "APPROVED",
          reviewerNote: "Excellent presentation and natural delivery",
        },
      });

      // Notification: in-app
      expect(notifyProviderMock.inApp).toHaveBeenCalledWith(
        TALENT_USER_ID,
        expect.objectContaining({
          kind: "verification_recording_approved",
          recordingId: RECORDING_ID,
        }),
      );

      // Notification: email
      expect(enqueueEmailMock).toHaveBeenCalledWith(
        TALENT_USER_ID,
        "verification_recording_approved",
        expect.objectContaining({
          creatorId: CREATOR_ID,
          recordingId: RECORDING_ID,
        }),
      );

      // Audit row
      expect(prismaMock.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "VERIFICATION_APPROVED",
            targetType: "VerificationRecording",
            targetId: RECORDING_ID,
          }),
        }),
      );
    });

    it("NEEDS_RERECORD decision requires a reason template, stores note, and notifies talent", async () => {
      const rec = buildMockRecording();
      prismaMock.verificationRecording.findUnique.mockResolvedValue(rec);
      prismaMock.creator.findUnique.mockResolvedValue(rec.creator);
      prismaMock.kycCheck.count.mockResolvedValue(1);

      // Reject without template should fail (400 Bad Request)
      const failRes = await app.inject({
        method: "POST",
        url: `/api/v1/admin/verifications/${RECORDING_ID}/decision`,
        headers: {
          authorization: `Bearer ${ADMIN_COMPLIANCE_TOKEN}`,
          "content-type": "application/json",
        },
        payload: {
          decision: "NEEDS_RERECORD",
        },
      });
      expect(failRes.statusCode).toBe(400);

      // Reject with valid template
      prismaMock.verificationRecording.update.mockResolvedValue({
        ...rec,
        status: "NEEDS_RERECORD",
        reviewerNote: "[POOR_LIGHTING] Poor lighting or high contrast: Backlight obscures facial expression",
      });

      const successRes = await app.inject({
        method: "POST",
        url: `/api/v1/admin/verifications/${RECORDING_ID}/decision`,
        headers: {
          authorization: `Bearer ${ADMIN_COMPLIANCE_TOKEN}`,
          "content-type": "application/json",
        },
        payload: {
          decision: "NEEDS_RERECORD",
          reasonTemplate: "POOR_LIGHTING",
          reviewerNote: "Backlight obscures facial expression",
        },
      });

      expect(successRes.statusCode).toBe(200);

      // Notification: in-app
      expect(notifyProviderMock.inApp).toHaveBeenCalledWith(
        TALENT_USER_ID,
        expect.objectContaining({
          kind: "verification_recording_needs_rerecord",
          recordingId: RECORDING_ID,
        }),
      );

      // Notification: email
      expect(enqueueEmailMock).toHaveBeenCalledWith(
        TALENT_USER_ID,
        "verification_recording_needs_rerecord",
        expect.objectContaining({
          creatorId: CREATOR_ID,
          recordingId: RECORDING_ID,
        }),
      );

      // Audit row
      expect(prismaMock.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "VERIFICATION_NEEDS_RERECORD",
            targetType: "VerificationRecording",
            targetId: RECORDING_ID,
          }),
        }),
      );
    });
  });

  describe("6. X3 GUARDRAIL: Decisions NEVER write Creator.verification or KycCheck", () => {
    it("X3 Invariant Test: asserts Creator.verification and KycCheck are NEVER modified", async () => {
      const rec = buildMockRecording({
        creator: {
          id: CREATOR_ID,
          userId: TALENT_USER_ID,
          name: "Chioma Okonjo",
          verification: "UNVERIFIED", // Must remain UNVERIFIED!
          user: { id: TALENT_USER_ID, email: "talent@monologg.dev" },
          kycChecks: [],
        },
      });

      prismaMock.verificationRecording.findUnique.mockResolvedValue(rec);
      prismaMock.creator.findUnique.mockResolvedValue(rec.creator);
      prismaMock.kycCheck.count.mockResolvedValue(0);
      prismaMock.verificationRecording.update.mockResolvedValue({ ...rec, status: "APPROVED" });

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/admin/verifications/${RECORDING_ID}/decision`,
        headers: {
          authorization: `Bearer ${ADMIN_COMPLIANCE_TOKEN}`,
          "content-type": "application/json",
        },
        payload: {
          decision: "APPROVE",
          reviewerNote: "Approved",
        },
      });

      expect(res.statusCode).toBe(200);

      // STRICT ASSERTION: Creator.update was NEVER called with verification
      expect(prismaMock.creator.update).not.toHaveBeenCalled();

      // STRICT ASSERTION: KycCheck.create was NEVER called
      expect(prismaMock.kycCheck.create).not.toHaveBeenCalled();
      expect(prismaMock.kycCheck.update).not.toHaveBeenCalled();

      // The Verified badge state is completely unchanged
      expect(rec.creator.verification).toBe("UNVERIFIED");
    });
  });

  describe("7. Role-Based Access Control", () => {
    it("COMPLIANCE can read and write", async () => {
      const rec = buildMockRecording();
      prismaMock.verificationRecording.findMany.mockResolvedValue([rec]);
      prismaMock.verificationRecording.count.mockResolvedValue(1);

      const readRes = await app.inject({
        method: "GET",
        url: "/api/v1/admin/verifications",
        headers: { authorization: `Bearer ${ADMIN_COMPLIANCE_TOKEN}` },
      });
      expect(readRes.statusCode).toBe(200);
    });

    it("SUPER_ADMIN can read and write", async () => {
      const rec = buildMockRecording();
      prismaMock.verificationRecording.findMany.mockResolvedValue([rec]);
      prismaMock.verificationRecording.count.mockResolvedValue(1);

      const readRes = await app.inject({
        method: "GET",
        url: "/api/v1/admin/verifications",
        headers: { authorization: `Bearer ${ADMIN_SUPERADMIN_TOKEN}` },
      });
      expect(readRes.statusCode).toBe(200);
    });

    it("OPS can read but write is FORBIDDEN (403)", async () => {
      const rec = buildMockRecording();
      prismaMock.verificationRecording.findMany.mockResolvedValue([rec]);
      prismaMock.verificationRecording.count.mockResolvedValue(1);

      // OPS read allowed
      const readRes = await app.inject({
        method: "GET",
        url: "/api/v1/admin/verifications",
        headers: { authorization: `Bearer ${ADMIN_OPS_TOKEN}` },
      });
      expect(readRes.statusCode).toBe(200);

      // OPS write forbidden
      const writeRes = await app.inject({
        method: "POST",
        url: `/api/v1/admin/verifications/${RECORDING_ID}/decision`,
        headers: {
          authorization: `Bearer ${ADMIN_OPS_TOKEN}`,
          "content-type": "application/json",
        },
        payload: { decision: "APPROVE" },
      });
      expect(writeRes.statusCode).toBe(403);
    });

    it("VIEWER, SUPPORT, and FINANCE roles are FORBIDDEN from reading (403)", async () => {
      const rolesToTest = [
        ADMIN_VIEWER_TOKEN,
        ADMIN_SUPPORT_TOKEN,
        ADMIN_FINANCE_TOKEN,
      ];

      for (const token of rolesToTest) {
        const res = await app.inject({
          method: "GET",
          url: "/api/v1/admin/verifications",
          headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(403);
      }
    });
  });

  describe("8. Queue Metrics Calculation", () => {
    it("computes counts, overdue count, approval rate %, and median review time", async () => {
      prismaMock.verificationRecording.count
        .mockResolvedValueOnce(3) // UPLOADED
        .mockResolvedValueOnce(2) // IN_REVIEW
        .mockResolvedValueOnce(8) // APPROVED
        .mockResolvedValueOnce(2) // NEEDS_RERECORD
        .mockResolvedValueOnce(1); // Overdue

      prismaMock.verificationRecording.findMany.mockResolvedValue([
        {
          createdAt: new Date("2026-03-01T10:00:00Z"),
          updatedAt: new Date("2026-03-01T14:00:00Z"), // 4h
        },
        {
          createdAt: new Date("2026-03-01T10:00:00Z"),
          updatedAt: new Date("2026-03-01T16:00:00Z"), // 6h
        },
        {
          createdAt: new Date("2026-03-01T10:00:00Z"),
          updatedAt: new Date("2026-03-01T20:00:00Z"), // 10h
        },
      ]);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/verifications/metrics",
        headers: { authorization: `Bearer ${ADMIN_COMPLIANCE_TOKEN}` },
      });

      expect(res.statusCode).toBe(200);
      const metrics = JSON.parse(res.body);

      expect(metrics.pendingUploadedCount).toBe(3);
      expect(metrics.inReviewCount).toBe(2);
      expect(metrics.approvedCount).toBe(8);
      expect(metrics.needsRerecordCount).toBe(2);
      expect(metrics.overdueCount).toBe(1);
      expect(metrics.totalReviewedCount).toBe(10);
      expect(metrics.approvalRatePct).toBe(80); // 8 / 10 * 100
      expect(metrics.medianReviewHours).toBe(6); // median of [4, 6, 10]
    });
  });
});
