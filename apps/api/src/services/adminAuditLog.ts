import { adminRoPrisma } from "../db/adminRoClient.js";
import { prisma as defaultPrisma } from "../db/client.js";
import type { AdminAuditListResponse, AdminAuditFilters } from "@monologg/types";

/**
 * Lists audit logs with filtering and cursor pagination (AD-29)
 * Read access strictly for SUPER_ADMIN and COMPLIANCE.
 */
export async function listAdminAuditLogs(
  filters: AdminAuditFilters = {},
  dbClient: any = adminRoPrisma || defaultPrisma,
): Promise<AdminAuditListResponse> {
  const {
    adminId,
    action,
    targetType,
    targetId,
    startDate,
    endDate,
    limit = 50,
    cursor,
  } = filters;

  const where: any = {};

  if (adminId) {
    where.adminId = adminId;
  }
  if (action) {
    where.action = action;
  }
  if (targetType) {
    where.targetType = targetType;
  }
  if (targetId) {
    where.targetId = targetId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  const take = Math.min(Math.max(1, limit), 100);

  const queryArgs: any = {
    where,
    take: take + 1,
    orderBy: { createdAt: "desc" },
  };

  if (cursor) {
    queryArgs.cursor = { id: cursor };
    queryArgs.skip = 1;
  }

  const [rawLogs, totalCount] = await Promise.all([
    dbClient.adminAuditLog.findMany(queryArgs),
    dbClient.adminAuditLog.count({ where }),
  ]);

  const hasMore = rawLogs.length > take;
  const items = hasMore ? rawLogs.slice(0, take) : rawLogs;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  // Resolve admin emails if possible
  const adminIds = Array.from(new Set(items.map((i: any) => i.adminId).filter(Boolean)));
  const adminUsers = await dbClient.adminUser.findMany({
    where: { id: { in: adminIds } },
    select: { id: true, email: true, role: true },
  }).catch(() => []);

  const adminMap = new Map<string, { email: string; role: string }>();
  for (const a of adminUsers) {
    adminMap.set(a.id, { email: a.email, role: a.role });
  }

  const mappedLogs = items.map((log: any) => {
    const admin = adminMap.get(log.adminId);
    return {
      id: log.id,
      adminId: log.adminId,
      adminEmail: admin?.email || (log.adminId === "system" ? "system@monologg.dev" : undefined),
      adminRole: admin?.role,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      reason: log.reason,
      metadata: typeof log.metadata === "object" && log.metadata !== null ? log.metadata : {},
      ipHash: log.ipHash,
      createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : log.createdAt,
    };
  });

  return {
    logs: mappedLogs,
    total: totalCount,
    nextCursor,
    hasMore,
  };
}

