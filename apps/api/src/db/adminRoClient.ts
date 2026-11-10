import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

/**
 * Resolves the database URL for the read-only admin role `monologg_admin_ro`.
 * Defaults to ADMIN_DATABASE_URL from env validation; if unset in development,
 * attempts to derive the pooler connection string, or falls back to DATABASE_URL.
 */
function resolveAdminDatabaseUrl(): string {
  if (env.ADMIN_DATABASE_URL) {
    return env.ADMIN_DATABASE_URL;
  }
  if (process.env.ADMIN_DATABASE_URL) {
    return process.env.ADMIN_DATABASE_URL;
  }
  if (env.DATABASE_URL && env.DATABASE_URL.includes("supabase.com")) {
    try {
      const u = new URL(env.DATABASE_URL);
      const parts = u.username.split(".");
      const projectRef = parts[1] || "uuacczlwejzjbhhcyjii";
      u.username = `monologg_admin_ro.${projectRef}`;
      u.password = "monologg_ro_secure_password_2026";
      return u.toString();
    } catch {
      // Fallback below
    }
  }
  return env.DATABASE_URL;
}

/**
 * Separate Prisma client used exclusively for admin reads.
 * Connects under `monologg_admin_ro` with statement_timeout = 5s.
 */
export const adminRoPrisma = new PrismaClient({
  datasources: {
    db: {
      url: resolveAdminDatabaseUrl(),
    },
  },
});

export interface AdminUserSummaryViewRow {
  total_users: bigint;
  total_talent: bigint;
  total_clients: bigint;
  email_verified_count: bigint;
  test_users_count: bigint;
  suspended_count: bigint;
  signups_last_30d: bigint;
  signups_last_7d: bigint;
  signups_last_24h: bigint;
}

export interface AdminBookingSummaryViewRow {
  state: string;
  currency: string;
  booking_count: bigint;
  total_base_amount: bigint;
  total_talent_fee: bigint;
  total_client_fee: bigint;
}

export interface AdminMoneyByCurrencyViewRow {
  currency: string;
  gmv: bigint;
  escrow_held: bigint;
  released: bigint;
  platform_revenue: bigint;
  total_withdrawn: bigint;
  last_refreshed_at?: Date;
}

export interface AdminSignupFunnelViewRow {
  signups_total: bigint;
  email_verified_count: bigint;
  talent_profiles_created: bigint;
  talent_onboarded_count: bigint;
  identity_verified_count: bigint;
  client_profiles_created: bigint;
}

export interface AdminSupportSummaryViewRow {
  tickets_open: bigint;
  tickets_in_progress: bigint;
  tickets_resolved: bigint;
  tickets_closed: bigint;
  tickets_total: bigint;
}

/**
 * Admin view access helpers using read-only role.
 */
export async function getAdminUserSummary(): Promise<AdminUserSummaryViewRow | null> {
  const rows = await adminRoPrisma.$queryRaw<AdminUserSummaryViewRow[]>`
    SELECT * FROM admin.v_user_summary LIMIT 1;
  `;
  return rows[0] ?? null;
}

export async function getAdminBookingSummary(): Promise<AdminBookingSummaryViewRow[]> {
  return await adminRoPrisma.$queryRaw<AdminBookingSummaryViewRow[]>`
    SELECT * FROM admin.v_booking_summary ORDER BY currency, state;
  `;
}

export async function getAdminMoneyByCurrency(): Promise<AdminMoneyByCurrencyViewRow[]> {
  return await adminRoPrisma.$queryRaw<AdminMoneyByCurrencyViewRow[]>`
    SELECT * FROM admin.v_money_by_currency ORDER BY currency;
  `;
}

export async function getAdminMaterializedMoney(): Promise<AdminMoneyByCurrencyViewRow[]> {
  return await adminRoPrisma.$queryRaw<AdminMoneyByCurrencyViewRow[]>`
    SELECT * FROM admin.mv_money_by_currency ORDER BY currency;
  `;
}

export async function getAdminSignupFunnel(): Promise<AdminSignupFunnelViewRow | null> {
  const rows = await adminRoPrisma.$queryRaw<AdminSignupFunnelViewRow[]>`
    SELECT * FROM admin.v_signup_funnel LIMIT 1;
  `;
  return rows[0] ?? null;
}

export async function getAdminSupportSummary(): Promise<AdminSupportSummaryViewRow | null> {
  const rows = await adminRoPrisma.$queryRaw<AdminSupportSummaryViewRow[]>`
    SELECT * FROM admin.v_support_summary LIMIT 1;
  `;
  return rows[0] ?? null;
}

export async function getMaterializedViewLastRefreshed(viewName = "mv_money_by_currency"): Promise<Date | null> {
  const rows = await adminRoPrisma.$queryRaw<Array<{ last_refreshed_at: Date }>>`
    SELECT last_refreshed_at FROM admin.materialized_view_refresh WHERE view_name = ${viewName} LIMIT 1;
  `;
  return rows[0]?.last_refreshed_at ?? null;
}

