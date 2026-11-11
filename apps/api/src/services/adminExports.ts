import crypto from "crypto";
import { prisma } from "../db/client.js";
import { adminRoPrisma } from "../db/adminRoClient.js";
import { audit } from "./adminAudit.js";
import { maskEmail, maskPhone, maskName } from "../lib/masking.js";
import { env } from "../config/env.js";
import type { ExportType, AdminExportJobItem, AdminExportListResponse } from "@monologg/types";

export const EXPORT_ROW_CAP = 50000;
export const EXPORT_EXPIRY_HOURS = 24;

const ROLE_PERMITTED_EXPORTS: Record<string, string[]> = {
  SUPER_ADMIN: ["users", "bookings", "payments", "withdrawals", "tickets", "funnels", "audit"],
  OPS: ["users", "bookings", "withdrawals", "tickets", "funnels"],
  FINANCE: ["bookings", "payments", "withdrawals"],
  SUPPORT: ["users", "tickets"],
  COMPLIANCE: ["audit", "users"],
  VIEWER: [], // VIEWER has no export access
};

export class ExportForbiddenError extends Error {
  constructor(message = "Your role is not permitted to export this dataset.") {
    super(message);
    this.name = "ExportForbiddenError";
  }
}

export class ExportReasonRequiredError extends Error {
  constructor() {
    super("A business justification reason is required for data exports.");
    this.name = "ExportReasonRequiredError";
  }
}

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return "";
  const str = typeof val === "object" ? JSON.stringify(val) : String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines: string[] = [headers.map(escapeCsvCell).join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => escapeCsvCell(r[h])).join(","));
  }
  return lines.join("\n");
}

export function generateExportSignature(jobId: string, expiresAt: string): string {
  const secret = env.JWT_ACCESS_SECRET || "monologg_export_signing_secret_alpha";
  return crypto.createHmac("sha256", secret).update(`${jobId}:${expiresAt}`).digest("hex");
}

export function verifyExportSignature(jobId: string, expiresAt: string, sig: string): boolean {
  const expected = generateExportSignature(jobId, expiresAt);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

/**
 * Creates and queues a new export job (AD-30 / PRD M12.1)
 */
export async function createExportJob(params: {
  type: ExportType;
  adminId: string;
  adminRole: string;
  adminEmail: string;
  reason: string;
  unmaskPii?: boolean;
  filters?: Record<string, any>;
  ip?: string;
}): Promise<{ jobId: string; status: string; estimatedRows: number }> {
  const { type, adminId, adminRole, adminEmail, reason, unmaskPii = false, filters = {}, ip } = params;

  if (!reason || reason.trim().length < 5) {
    throw new ExportReasonRequiredError();
  }

  const allowedTypes = ROLE_PERMITTED_EXPORTS[adminRole] || [];
  if (!allowedTypes.includes(type)) {
    throw new ExportForbiddenError();
  }

  // Only SUPER_ADMIN, OPS or COMPLIANCE can request unmasked PII
  const canUnmask = ["SUPER_ADMIN", "OPS", "COMPLIANCE"].includes(adminRole);
  const shouldUnmask = unmaskPii && canUnmask;

  const job = await prisma.adminJob.create({
    data: {
      kind: "EXPORT",
      status: "PENDING",
      payload: {
        type,
        requestedByAdminId: adminId,
        requestedByEmail: adminEmail,
        adminRole,
        reason: reason.trim(),
        piiUnmasked: shouldUnmask,
        filters,
        createdAt: new Date().toISOString(),
      },
    },
  });

  await audit({
    adminId,
    action: "CSV_EXPORT_REQUESTED",
    targetType: "ExportJob",
    targetId: job.id,
    reason: reason.trim(),
    metadata: {
      exportType: type,
      piiUnmasked: shouldUnmask,
      adminRole,
    },
    ip,
  });

  return {
    jobId: job.id,
    status: "PENDING",
    estimatedRows: 500, // queue indicator
  };
}

/**
 * Lists recent exports for the AD-30 console
 */
export async function listExportJobs(limit = 30): Promise<AdminExportListResponse> {
  const db = adminRoPrisma || prisma;
  const jobs = await db.adminJob.findMany({
    where: { kind: "EXPORT" },
    orderBy: { runAfter: "desc" },
    take: limit,
  });

  const exportItems: AdminExportJobItem[] = jobs.map((j) => {
    const payload = (typeof j.payload === "object" && j.payload ? j.payload : {}) as Record<string, any>;
    return {
      id: j.id,
      type: payload.type || "users",
      status: (j.status as any) || "PENDING",
      requestedByAdminId: payload.requestedByAdminId || "unknown",
      requestedByEmail: payload.requestedByEmail,
      reason: payload.reason || "Operational review",
      rowCount: payload.rowCount || 0,
      downloadUrl: payload.downloadUrl || null,
      expiresAt: payload.expiresAt || null,
      createdAt: payload.createdAt || j.runAfter.toISOString(),
      completedAt: payload.completedAt || null,
      error: j.lastError || payload.error || null,
      piiUnmasked: Boolean(payload.piiUnmasked),
    };
  });

  return {
    exports: exportItems,
    total: exportItems.length,
  };
}

/**
 * Worker execution for a single export job
 */
export async function executeExportJob(jobId: string): Promise<{ rowCount: number; downloadUrl: string }> {
  const db = adminRoPrisma || prisma;

  const job = await prisma.adminJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new Error(`Export job ${jobId} not found`);
  }

  const payload = (typeof job.payload === "object" && job.payload ? job.payload : {}) as Record<string, any>;
  const type: ExportType = payload.type || "users";
  const unmask = Boolean(payload.piiUnmasked);

  let rawData: Record<string, any>[] = [];

  switch (type) {
    case "users": {
      const users = await db.user.findMany({
        take: EXPORT_ROW_CAP,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          phone: true,
          userType: true,
          createdAt: true,
          client: { select: { name: true, orgName: true, location: true } },
          creator: { select: { name: true, niche: true, location: true } },
        },
      });

      rawData = users.map((u: any) => ({
        user_id: u.id,
        email: unmask ? u.email : maskEmail(u.email),
        name: unmask
          ? u.client?.name || u.creator?.name || "User"
          : maskName(u.client?.name || u.creator?.name || "User"),
        user_type: u.userType,
        company: u.client?.orgName || "",
        niche: u.creator?.niche || "",
        location: u.client?.location || u.creator?.location || "",
        phone: unmask ? u.phone || "" : u.phone ? maskPhone(u.phone) : "",
        created_at: u.createdAt.toISOString(),
      }));
      break;
    }

    case "bookings": {
      const bookings = await db.booking.findMany({
        take: EXPORT_ROW_CAP,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          state: true,
          currency: true,
          baseAmount: true,
          talentFeeAmount: true,
          clientFeeAmount: true,
          origin: true,
          createdAt: true,
          slotHoldExpiresAt: true,
          creatorId: true,
          clientId: true,
        },
      });

      rawData = bookings.map((b) => ({
        booking_id: b.id,
        state: b.state,
        currency: b.currency,
        base_amount: Number(b.baseAmount) / 100,
        talent_fee: Number(b.talentFeeAmount || 0) / 100,
        client_fee: Number(b.clientFeeAmount || 0) / 100,
        total_amount: (Number(b.baseAmount) + Number(b.clientFeeAmount || 0)) / 100,
        origin: b.origin,
        creator_id: b.creatorId,
        client_id: b.clientId,
        created_at: b.createdAt.toISOString(),
      }));
      break;
    }

    case "payments": {
      const payments = await db.payment.findMany({
        take: EXPORT_ROW_CAP,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          bookingId: true,
          amount: true,
          currency: true,
          status: true,
          provider: true,
          escrowHeld: true,
          createdAt: true,
        },
      });

      rawData = payments.map((p) => ({
        payment_id: p.id,
        booking_id: p.bookingId,
        amount: Number(p.amount) / 100,
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        escrow_held: p.escrowHeld,
        created_at: p.createdAt.toISOString(),
      }));
      break;
    }

    case "withdrawals": {
      const withdrawals = await db.withdrawalRequest.findMany({
        take: EXPORT_ROW_CAP,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userId: true,
          amount: true,
          currency: true,
          status: true,
          bankName: true,
          accountNumber: true,
          accountName: true,
          createdAt: true,
        },
      });

      rawData = withdrawals.map((w: any) => ({
        withdrawal_id: w.id,
        user_id: w.userId,
        amount: Number(w.amount) / 100,
        currency: w.currency,
        status: w.status,
        bank_name: w.bankName,
        account_name: unmask ? w.accountName : maskName(w.accountName || "Account"),
        account_number: unmask ? w.accountNumber : w.accountNumber ? `***${w.accountNumber.slice(-4)}` : "",
        created_at: w.createdAt.toISOString(),
      }));
      break;
    }

    case "tickets": {
      const tickets = await db.supportTicket.findMany({
        take: EXPORT_ROW_CAP,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          number: true,
          subject: true,
          priority: true,
          status: true,
          source: true,
          category: true,
          createdAt: true,
          assignedAdminId: true,
          firstResponseAt: true,
          resolvedAt: true,
        },
      });

      rawData = tickets.map((t) => ({
        ticket_id: t.id,
        number: t.number,
        subject: t.subject,
        priority: t.priority,
        status: t.status,
        source: t.source,
        category: t.category,
        assigned_admin_id: t.assignedAdminId || "unassigned",
        first_response_at: t.firstResponseAt?.toISOString() || "",
        resolved_at: t.resolvedAt?.toISOString() || "",
        created_at: t.createdAt.toISOString(),
      }));
      break;
    }

    case "funnels": {
      const events = await db.productEvent.findMany({
        take: EXPORT_ROW_CAP,
        orderBy: { occurredAt: "desc" },
        select: {
          id: true,
          name: true,
          actorType: true,
          source: true,
          userId: true,
          country: true,
          deviceClass: true,
          occurredAt: true,
        },
      });

      rawData = events.map((e) => ({
        event_id: e.id.toString(),
        name: e.name,
        actor: e.actorType,
        source: e.source,
        user_id: e.userId || "anonymous",
        country: e.country || "",
        device: e.deviceClass || "",
        occurred_at: e.occurredAt.toISOString(),
      }));
      break;
    }

    case "audit": {
      const logs = await db.adminAuditLog.findMany({
        take: EXPORT_ROW_CAP,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          adminId: true,
          action: true,
          targetType: true,
          targetId: true,
          reason: true,
          ipHash: true,
          createdAt: true,
        },
      });

      rawData = logs.map((l) => ({
        audit_id: l.id,
        admin_id: l.adminId,
        action: l.action,
        target_type: l.targetType || "",
        target_id: l.targetId || "",
        reason: l.reason || "",
        ip_hash: l.ipHash || "",
        created_at: l.createdAt.toISOString(),
      }));
      break;
    }
  }

  const csvContent = toCsv(rawData);
  const rowCount = rawData.length;

  // 24-hour signed download URL
  const expiresAt = new Date(Date.now() + EXPORT_EXPIRY_HOURS * 3600 * 1000).toISOString();
  const signature = generateExportSignature(jobId, expiresAt);
  const downloadUrl = `/api/v1/admin/exports/${jobId}/download?exp=${encodeURIComponent(
    expiresAt,
  )}&sig=${signature}`;

  // Update AdminJob to DONE
  await prisma.adminJob.update({
    where: { id: jobId },
    data: {
      status: "DONE",
      lockedUntil: null,
      payload: {
        ...payload,
        rowCount,
        downloadUrl,
        expiresAt,
        completedAt: new Date().toISOString(),
        csvSnapshotSnippet: csvContent.slice(0, 500), // metadata preview
      },
    },
  });

  return { rowCount, downloadUrl };
}
