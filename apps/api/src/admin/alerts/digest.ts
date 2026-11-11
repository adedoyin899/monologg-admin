import { prisma } from "../../db/client.js";
import { adminRoPrisma } from "../../db/adminRoClient.js";
import { notifyProvider } from "../../providers/index.js";
import { kpiService } from "../kpi/index.js";
import { getFunnelAnalytics } from "../../services/adminAnalytics.js";
import { collectActiveAlertConditions } from "./engine.js";

export interface DigestPayload {
  period: string;
  generatedAt: string;
  kpis: {
    signupsTotal: number;
    talentActivated: number;
    clientActivated: number;
    bookingsTotal: number;
    gmvNgn: string;
    gmvUsd: string;
    platformRevenueNgn: string;
    openTickets: number;
    openDisputes: number;
    criticalAlerts: number;
  };
  insights: [string, string, string];
  recipientsCount: number;
}

export interface WeeklySummaryPayload {
  weekLabel: string;
  generatedAt: string;
  wowComparisons: {
    signupsChangePct: number;
    bookingsChangePct: number;
    gmvChangePct: number;
    disputeRatePct: number;
  };
  summaryText: string;
  recipientsCount: number;
}

/**
 * Generates and delivers the Daily Executive Digest (PRD M11.2 / AC1)
 * Code-computed numbers and top insights — NO AI text.
 */
export async function generateAndSendDailyDigest(now = new Date()): Promise<DigestPayload> {
  const db = adminRoPrisma || prisma;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 3600 * 1000);

  // 1. Fetch KPI snapshots for today and yesterday
  const [currentKpi, prevKpi, openTickets, openDisputes, activeAlerts, funnelData] =
    await Promise.all([
      kpiService.getSnapshot({ startDate: yesterdayStart, endDate: now }),
      kpiService.getSnapshot({
        startDate: new Date(yesterdayStart.getTime() - 24 * 3600 * 1000),
        endDate: yesterdayStart,
      }),
      db.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      db.dispute.count({ where: { status: { in: ["OPEN", "AWAITING_EVIDENCE"] } } }),
      collectActiveAlertConditions(now),
      getFunnelAnalytics("TALENT_ONBOARDING").catch(() => null),
    ]);

  const criticalAlertsCount = activeAlerts.filter((a) => a.severity === "CRITICAL").length;
  const stuckBookingsCount = activeAlerts.filter((a) => a.ruleKey === "booking_stuck").length;

  // Extract GMV and revenue
  const ngnMoney = currentKpi.moneyByCurrency.find((m) => m.currency === "NGN");
  const usdMoney = currentKpi.moneyByCurrency.find((m) => m.currency === "USD");

  const gmvNgn = ngnMoney ? (Number(ngnMoney.gmv) / 100).toLocaleString() : "0";
  const gmvUsd = usdMoney ? (Number(usdMoney.gmv) / 100).toLocaleString() : "0";
  const platformRevenueNgn = ngnMoney
    ? (Number(ngnMoney.platformRevenue) / 100).toLocaleString()
    : "0";

  // 2. Compute Top 3 Insights by deterministic code (NO AI)
  // Insight 1: Biggest mover
  const currentSignups = currentKpi.signups.total;
  const prevSignups = prevKpi.signups.total;
  const signupDiffPct =
    prevSignups > 0
      ? Math.round(((currentSignups - prevSignups) / prevSignups) * 100)
      : currentSignups > 0
      ? 100
      : 0;

  const signupsMover =
    signupDiffPct >= 0
      ? `User signups grew +${signupDiffPct}% vs prior window (${currentSignups} vs ${prevSignups}).`
      : `User signups declined ${signupDiffPct}% vs prior window (${currentSignups} vs ${prevSignups}).`;

  // Insight 2: Funnel bottleneck
  const worstStepText = funnelData?.biggestDropOffStep
    ? `Funnel bottleneck: highest attrition occurs at "${funnelData.biggestDropOffStep}".`
    : "Funnel progression remains steady with no abnormal step attrition.";

  // Insight 3: Operational Queue & Risk
  const operationalHealth =
    criticalAlertsCount > 0 || stuckBookingsCount > 0
      ? `Operational attention required: ${criticalAlertsCount} critical alert(s) and ${stuckBookingsCount} stuck booking(s) active.`
      : `Operations healthy: 0 critical alerts and queues within standard SLAs.`;

  const insights: [string, string, string] = [
    signupsMover,
    worstStepText,
    operationalHealth,
  ];

  // 3. Find recipients (SUPER_ADMIN and OPS)
  const recipients = await prisma.adminUser.findMany({
    where: {
      role: { in: ["SUPER_ADMIN", "OPS"] },
      status: "ACTIVE",
    },
    select: { email: true },
  });

  const payload: DigestPayload = {
    period: `${todayStart.toISOString().slice(0, 10)} Daily Digest`,
    generatedAt: now.toISOString(),
    kpis: {
      signupsTotal: currentSignups,
      talentActivated: currentKpi.talentActivated,
      clientActivated: currentKpi.clientActivated,
      bookingsTotal: currentKpi.bookingFunnel.find((b) => b.step === "created")?.count || 0,
      gmvNgn,
      gmvUsd,
      platformRevenueNgn,
      openTickets,
      openDisputes,
      criticalAlerts: criticalAlertsCount,
    },
    insights,
    recipientsCount: recipients.length,
  };

  // 4. Send emails
  for (const r of recipients) {
    await notifyProvider.email(r.email, "admin_daily_digest", payload as any);
  }

  return payload;
}

/**
 * Generates and delivers the Weekly Stakeholder Summary (PRD M11.2 / AC2)
 * Designed for VIEWER recipients with week-on-week comparisons.
 */
export async function generateAndSendWeeklySummary(now = new Date()): Promise<WeeklySummaryPayload> {
  const currentWeekStart = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const prevWeekStart = new Date(now.getTime() - 14 * 24 * 3600 * 1000);

  const [currentKpi, prevKpi] = await Promise.all([
    kpiService.getSnapshot({ startDate: currentWeekStart, endDate: now }),
    kpiService.getSnapshot({ startDate: prevWeekStart, endDate: currentWeekStart }),
  ]);

  const currSignups = currentKpi.signups.total;
  const prevSignups = prevKpi.signups.total;
  const signupsChangePct =
    prevSignups > 0 ? Math.round(((currSignups - prevSignups) / prevSignups) * 100) : 0;

  const currBookings =
    currentKpi.bookingFunnel.find((b) => b.step === "completed")?.count || 1;
  const prevBookings =
    prevKpi.bookingFunnel.find((b) => b.step === "completed")?.count || 1;
  const bookingsChangePct =
    prevBookings > 0 ? Math.round(((currBookings - prevBookings) / prevBookings) * 100) : 0;

  const currNgnGmv = Number(currentKpi.moneyByCurrency.find((m) => m.currency === "NGN")?.gmv || 0n);
  const prevNgnGmv = Number(prevKpi.moneyByCurrency.find((m) => m.currency === "NGN")?.gmv || 0n);
  const gmvChangePct =
    prevNgnGmv > 0 ? Math.round(((currNgnGmv - prevNgnGmv) / prevNgnGmv) * 100) : 0;

  const viewers = await prisma.adminUser.findMany({
    where: { role: "VIEWER", status: "ACTIVE" },
    select: { email: true },
  });

  const payload: WeeklySummaryPayload = {
    weekLabel: `Week of ${currentWeekStart.toISOString().slice(0, 10)}`,
    generatedAt: now.toISOString(),
    wowComparisons: {
      signupsChangePct,
      bookingsChangePct,
      gmvChangePct,
      disputeRatePct: Math.round(currentKpi.disputeRate * 100),
    },
    summaryText: `Weekly summary: Signups WoW ${signupsChangePct >= 0 ? "+" : ""}${signupsChangePct}%, GMV WoW ${gmvChangePct >= 0 ? "+" : ""}${gmvChangePct}%, Dispute rate ${Math.round(currentKpi.disputeRate * 100)}%.`,
    recipientsCount: viewers.length,
  };

  for (const v of viewers) {
    await notifyProvider.email(v.email, "admin_weekly_summary", payload as any);
  }

  return payload;
}

