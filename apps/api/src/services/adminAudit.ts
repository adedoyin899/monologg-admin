import crypto from "crypto";
import { prisma } from "../db/client.js";

export interface AuditParams {
  adminId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  reason?: string;
  metadata?: Record<string, unknown> | null;
  ip?: string;
  ipHash?: string;
}

/**
 * Creates an immutable audit row in AdminAuditLog.
 * Append-only; attempts to UPDATE or DELETE will be blocked at the database trigger level.
 */
export async function audit(params: AuditParams): Promise<void> {
  const { adminId, action, targetType, targetId, reason, metadata, ip, ipHash } = params;

  let computedIpHash = ipHash;
  if (!computedIpHash && ip) {
    computedIpHash = crypto.createHash("sha256").update(ip).digest("hex").substring(0, 32);
  }

  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: adminId || "system",
        action,
        targetType: targetType || null,
        targetId: targetId || null,
        reason: reason || null,
        metadata: (metadata as object) || {},
        ipHash: computedIpHash || null,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to write AdminAuditLog:", err);
  }
}
