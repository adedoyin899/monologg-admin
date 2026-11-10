import type { AdminRole } from "@prisma/client";

export type AdminModule =
  | "overview"
  | "users"
  | "reveal_pii"
  | "user_actions"
  | "bookings"
  | "chat"
  | "payments"
  | "withdrawals"
  | "tickets"
  | "disputes"
  | "disputes_resolve"
  | "verifications"
  | "alerts"
  | "system_health"
  | "audit_log"
  | "admin_users"
  | "exports";

export type PermissionLevel = "read" | "write" | "manage";

export interface PermissionRule {
  read: boolean;
  write: boolean;
}

/**
 * Exact permission matrix defined in Monologg Admin PRD M1.2.
 */
export const ADMIN_PERMISSION_MATRIX: Record<AdminRole, Record<AdminModule, PermissionRule>> = {
  SUPER_ADMIN: {
    overview: { read: true, write: true },
    users: { read: true, write: true },
    reveal_pii: { read: true, write: true },
    user_actions: { read: true, write: true },
    bookings: { read: true, write: true },
    chat: { read: true, write: true }, // dispute-gated or supervisor
    payments: { read: true, write: true },
    withdrawals: { read: true, write: true },
    tickets: { read: true, write: true },
    disputes: { read: true, write: true },
    disputes_resolve: { read: true, write: true },
    verifications: { read: true, write: true },
    alerts: { read: true, write: true },
    system_health: { read: true, write: true },
    audit_log: { read: true, write: true },
    admin_users: { read: true, write: true },
    exports: { read: true, write: true },
  },
  OPS: {
    overview: { read: true, write: false },
    users: { read: true, write: true },
    reveal_pii: { read: true, write: true },
    user_actions: { read: true, write: true },
    bookings: { read: true, write: false },
    chat: { read: false, write: false }, // no chat content access
    payments: { read: true, write: false },
    withdrawals: { read: true, write: false },
    tickets: { read: true, write: true },
    disputes: { read: true, write: false },
    disputes_resolve: { read: false, write: false },
    verifications: { read: true, write: false },
    alerts: { read: true, write: true },
    system_health: { read: true, write: false },
    audit_log: { read: false, write: false },
    admin_users: { read: false, write: false },
    exports: { read: true, write: false }, // exports with no PII
  },
  SUPPORT: {
    overview: { read: true, write: false },
    users: { read: true, write: false },
    reveal_pii: { read: true, write: true },
    user_actions: { read: false, write: false },
    bookings: { read: true, write: false },
    chat: { read: true, write: false }, // ticket or dispute-gated
    payments: { read: true, write: false },
    withdrawals: { read: false, write: false },
    tickets: { read: true, write: true },
    disputes: { read: true, write: true }, // review, request evidence
    disputes_resolve: { read: false, write: false },
    verifications: { read: false, write: false },
    alerts: { read: true, write: false },
    system_health: { read: false, write: false },
    audit_log: { read: false, write: false },
    admin_users: { read: false, write: false },
    exports: { read: false, write: false },
  },
  FINANCE: {
    overview: { read: true, write: false },
    users: { read: true, write: false },
    reveal_pii: { read: true, write: true },
    user_actions: { read: false, write: false },
    bookings: { read: true, write: false },
    chat: { read: true, write: false }, // dispute-gated
    payments: { read: true, write: true },
    withdrawals: { read: true, write: false }, // read queue, clear/flag
    tickets: { read: true, write: false },
    disputes: { read: true, write: true }, // resolve
    disputes_resolve: { read: true, write: true },
    verifications: { read: false, write: false },
    alerts: { read: true, write: true },
    system_health: { read: false, write: false },
    audit_log: { read: false, write: false },
    admin_users: { read: false, write: false },
    exports: { read: true, write: false }, // finance exports
  },
  COMPLIANCE: {
    overview: { read: true, write: false },
    users: { read: true, write: false },
    reveal_pii: { read: true, write: true },
    user_actions: { read: false, write: false },
    bookings: { read: true, write: false },
    chat: { read: false, write: false },
    payments: { read: true, write: false },
    withdrawals: { read: false, write: false },
    tickets: { read: true, write: false },
    disputes: { read: true, write: false },
    disputes_resolve: { read: false, write: false },
    verifications: { read: true, write: true }, // review and approve/reject KYC
    alerts: { read: true, write: false },
    system_health: { read: false, write: false },
    audit_log: { read: true, write: false },
    admin_users: { read: false, write: false },
    exports: { read: true, write: false }, // compliance exports
  },
  VIEWER: {
    overview: { read: true, write: false },
    users: { read: true, write: false },
    reveal_pii: { read: false, write: false }, // VIEWER can never reveal PII
    user_actions: { read: false, write: false },
    bookings: { read: true, write: false },
    chat: { read: false, write: false },
    payments: { read: true, write: false }, // aggregates only
    withdrawals: { read: false, write: false },
    tickets: { read: false, write: false },
    disputes: { read: false, write: false },
    disputes_resolve: { read: false, write: false },
    verifications: { read: false, write: false },
    alerts: { read: true, write: false },
    system_health: { read: true, write: false },
    audit_log: { read: false, write: false },
    admin_users: { read: false, write: false },
    exports: { read: false, write: false },
  },
};

/**
 * Checks whether an admin role has the required permission level for a module.
 */
export function hasPermission(
  role: AdminRole,
  module: AdminModule,
  level: "read" | "write" = "read",
): boolean {
  const roleRules = ADMIN_PERMISSION_MATRIX[role];
  if (!roleRules) return false;
  const moduleRule = roleRules[module];
  if (!moduleRule) return false;

  return level === "write" ? moduleRule.write : moduleRule.read;
}

/**
 * Returns a summary dictionary of permissions for the given role.
 */
export function getRolePermissions(role: AdminRole): Record<AdminModule, PermissionRule> {
  return ADMIN_PERMISSION_MATRIX[role] || ({} as Record<AdminModule, PermissionRule>);
}

