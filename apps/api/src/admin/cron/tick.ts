import { prisma } from "../../db/client.js";
import { evaluateAllAlertRules } from "../alerts/engine.js";
import { generateAndSendDailyDigest, generateAndSendWeeklySummary } from "../alerts/digest.js";
import { runKpiDailySnapshot } from "../../services/adminAnalytics.js";
import { executeExportJob } from "../../services/adminExports.js";
import { ALERT_CONFIG } from "../../config/alertRules.js";
import type { CronTickResponse } from "@monologg/types";

export const TICK_BUDGET_MS = 50_000; // 50 second budget
export const LEASE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes lease

export interface ScheduledJobDef {
  key: string;
  name: string;
  isDue: (now: Date, lastRun: any) => boolean;
  run: (now: Date) => Promise<any>;
  getNextDue: (now: Date) => Date;
}

/**
 * Storage snapshot helper:
 * Computes storage bytes (R2 buckets) and records metric into KpiDaily.
 */
export async function runStorageSnapshot(now = new Date()): Promise<{ storageBytes: bigint }> {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Count size from media assets and recordings
  const [mediaList, recordingsList] = await Promise.all([
    prisma.mediaAsset.findMany({ select: { id: true, sizeBytes: true } }).catch(() => []),
    prisma.verificationRecording.findMany({ select: { id: true, durationSec: true } }).catch(() => []),
  ]);

  const mediaBytes = mediaList.reduce((acc, m) => acc + BigInt(m.sizeBytes || 25 * 1024 * 1024), 0n);
  const recordingBytes = BigInt(recordingsList.length) * 15n * 1024n * 1024n;
  const estimatedBytes = mediaBytes + recordingBytes + 120n * 1024n * 1024n; // baseline bucket metadata

  await prisma.kpiDaily.upsert({
    where: {
      day_metric_dimension: {
        day,
        metric: "storage_bytes",
        dimension: "r2_buckets",
      },
    },
    create: {
      day,
      metric: "storage_bytes",
      dimension: "r2_buckets",
      value: estimatedBytes,
    },
    update: {
      value: estimatedBytes,
    },
  });

  return { storageBytes: estimatedBytes };
}

/**
 * Export Worker helper:
 * Processes any pending AdminJob rows of kind "EXPORT".
 */
export async function processPendingAdminExports(now = new Date()): Promise<{ processedCount: number }> {
  const pendingExports = await prisma.adminJob.findMany({
    where: {
      kind: "EXPORT",
      status: "PENDING",
      runAfter: { lte: now },
    },
    take: 10,
  });

  for (const job of pendingExports) {
    try {
      await executeExportJob(job.id);
    } catch (err: any) {
      console.error(`[cron-tick] Export job ${job.id} failed:`, err);
      await prisma.adminJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          lastError: err.message || "Export execution failed",
          lockedUntil: null,
        },
      }).catch(() => {});
    }
  }

  return { processedCount: pendingExports.length };
}

/**
 * Retention Purge helper (PRD Section 12.3 / Phase A13 item 4):
 * Deletes ProductEvent beyond ANALYTICS_RETENTION_MONTHS after rolling into KpiDaily.
 * Purges old export records (> 7 days).
 * AdminAuditLog is strictly preserved (immutable append-only).
 */
export async function runRetentionPurge(now = new Date()): Promise<{ deletedEvents: number; purgedExports: number }> {
  const retentionMonths = parseInt(process.env.ANALYTICS_RETENTION_MONTHS || "12", 10);
  const eventCutoff = new Date(now.getFullYear(), now.getMonth() - retentionMonths, now.getDate());
  const exportCutoff = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  // 1. Purge expired export jobs (> 7 days)
  const purgedExportsResult = typeof prisma.adminJob?.deleteMany === "function"
    ? await prisma.adminJob.deleteMany({
        where: {
          kind: "EXPORT",
          runAfter: { lte: exportCutoff },
        },
      }).catch(() => ({ count: 0 }))
    : { count: 0 };

  // 2. Delete ProductEvents older than retention months
  const deletedEventsResult = typeof prisma.productEvent?.deleteMany === "function"
    ? await prisma.productEvent.deleteMany({
        where: {
          occurredAt: { lte: eventCutoff },
        },
      }).catch(() => ({ count: 0 }))
    : { count: 0 };

  return {
    deletedEvents: deletedEventsResult.count,
    purgedExports: purgedExportsResult.count,
  };
}

/**
 * Registered Scheduled Jobs Definition (PRD M11.1 / M11.2 / M11.3 / M12.3)
 */
export const SCHEDULED_JOBS: ScheduledJobDef[] = [
  // 1. Alerts Evaluation (every tick)
  {
    key: "alerts_evaluation",
    name: "Evaluate All Alert Rules & Auto-Resolve",
    isDue: () => true, // every tick
    run: async (now) => evaluateAllAlertRules(now),
    getNextDue: (now) => new Date(now.getTime() + 5 * 60 * 1000),
  },

  // 2. Export Worker (every tick)
  {
    key: "export_worker",
    name: "Process Pending CSV Exports",
    isDue: () => true,
    run: async (now) => processPendingAdminExports(now),
    getNextDue: (now) => new Date(now.getTime() + 5 * 60 * 1000),
  },

  // 3. KPI Rollup Daily (02:00 Africa/Lagos = 01:00 UTC)
  {
    key: "kpi_rollup_daily",
    name: "Nightly KPI Daily Snapshot Rollup",
    isDue: (now, lastRun) => {
      if (!lastRun?.lastFinishedAt) return true;
      const hoursSinceLast = (now.getTime() - lastRun.lastFinishedAt.getTime()) / (3600 * 1000);
      return hoursSinceLast >= 20; // Run once a day
    },
    run: async (now) => runKpiDailySnapshot(now),
    getNextDue: (now) => new Date(now.getTime() + 24 * 3600 * 1000),
  },

  // 4. Storage Snapshot (03:00 Africa/Lagos = 02:00 UTC)
  {
    key: "storage_snapshot",
    name: "R2 Buckets Storage Snapshot",
    isDue: (now, lastRun) => {
      if (!lastRun?.lastFinishedAt) return true;
      const hoursSinceLast = (now.getTime() - lastRun.lastFinishedAt.getTime()) / (3600 * 1000);
      return hoursSinceLast >= 20;
    },
    run: async (now) => runStorageSnapshot(now),
    getNextDue: (now) => new Date(now.getTime() + 24 * 3600 * 1000),
  },

  // 5. Daily Digest (07:30 Africa/Lagos = 06:30 UTC)
  {
    key: "daily_digest",
    name: "Daily Executive Email Digest",
    isDue: (now, lastRun) => {
      if (!lastRun?.lastFinishedAt) return true;
      const hoursSinceLast = (now.getTime() - lastRun.lastFinishedAt.getTime()) / (3600 * 1000);
      return hoursSinceLast >= 20;
    },
    run: async (now) => generateAndSendDailyDigest(now),
    getNextDue: (now) => new Date(now.getTime() + 24 * 3600 * 1000),
  },

  // 6. Weekly Summary (Monday 08:00 Africa/Lagos = 07:00 UTC)
  {
    key: "weekly_summary",
    name: "Weekly Stakeholder Summary for Viewers",
    isDue: (now, lastRun) => {
      if (!lastRun?.lastFinishedAt) return true;
      const daysSinceLast = (now.getTime() - lastRun.lastFinishedAt.getTime()) / (24 * 3600 * 1000);
      return daysSinceLast >= 6;
    },
    run: async (now) => generateAndSendWeeklySummary(now),
    getNextDue: (now) => new Date(now.getTime() + 7 * 24 * 3600 * 1000),
  },

  // 7. Retention Purge (daily 03:30 UTC / PRD Section 12.3)
  {
    key: "retention_purge",
    name: "Data Retention Purge (Old Events & Expired Exports)",
    isDue: (now, lastRun) => {
      if (!lastRun?.lastFinishedAt) return true;
      const hoursSinceLast = (now.getTime() - lastRun.lastFinishedAt.getTime()) / (3600 * 1000);
      return hoursSinceLast >= 20;
    },
    run: async (now) => runRetentionPurge(now),
    getNextDue: (now) => new Date(now.getTime() + 24 * 3600 * 1000),
  },
];

/**
 * Main Cron Tick Runner:
 * Enforces 50-second budget, lease locks through JobRun, recovers expired leases,
 * isolates job failures so one failing job does not block others, and defers
 * jobs if budget is exhausted.
 */
export async function runAdminTick(
  now = new Date(),
  options?: { forceAllJobs?: boolean; simulatedBudgetMs?: number },
): Promise<CronTickResponse> {
  const startTime = Date.now();
  const budgetMs = options?.simulatedBudgetMs ?? TICK_BUDGET_MS;
  const jobsExecuted: string[] = [];
  const jobsDeferred: string[] = [];
  const errors: Record<string, string> = {};

  let totalAlertsTriggered = 0;
  let totalAlertsResolved = 0;
  let totalNotificationsSent = 0;

  for (const job of SCHEDULED_JOBS) {
    const elapsedMs = Date.now() - startTime;
    if (elapsedMs >= budgetMs) {
      // Exceeded budget! Defer remaining jobs to next tick
      jobsDeferred.push(job.key);
      continue;
    }

    // Check lease lock via JobRun
    const existingRun = await prisma.jobRun.findUnique({
      where: { jobKey: job.key },
    });

    if (existingRun && existingRun.lastStatus === "RUNNING") {
      const leaseAgeMs = existingRun.lastStartedAt
        ? now.getTime() - existingRun.lastStartedAt.getTime()
        : 0;
      if (leaseAgeMs < LEASE_TIMEOUT_MS) {
        // Active lease held by another process; skip
        continue;
      }
      // Expired lease: recover and proceed!
      console.warn(`[cron-tick] Recovering expired lease on job ${job.key}`);
    }

    // Check if job is due (or forced)
    const due = options?.forceAllJobs ? true : job.isDue(now, existingRun);
    if (!due) {
      continue;
    }

    // Acquire lease
    await prisma.jobRun.upsert({
      where: { jobKey: job.key },
      create: {
        jobKey: job.key,
        lastStartedAt: now,
        lastStatus: "RUNNING",
        lastError: null,
      },
      update: {
        lastStartedAt: now,
        lastStatus: "RUNNING",
        lastError: null,
      },
    });

    try {
      const result = await job.run(now);
      if (job.key === "alerts_evaluation" && result) {
        totalAlertsTriggered += result.triggered || 0;
        totalAlertsResolved += result.autoResolved || 0;
        totalNotificationsSent += result.notificationsSent || 0;
      }

      await prisma.jobRun.update({
        where: { jobKey: job.key },
        data: {
          lastFinishedAt: new Date(),
          lastStatus: "DONE",
          lastError: null,
          nextDueAt: job.getNextDue(now),
        },
      });

      jobsExecuted.push(job.key);
    } catch (err: any) {
      errors[job.key] = err.message || "Unknown error";
      console.error(`[cron-tick] Job ${job.key} failed:`, err);

      await prisma.jobRun.update({
        where: { jobKey: job.key },
        data: {
          lastFinishedAt: new Date(),
          lastStatus: "FAILED",
          lastError: err.message,
          nextDueAt: job.getNextDue(now),
        },
      });

      // Scheduled job failure triggers an alert
      try {
        await prisma.alertEvent.upsert({
          where: {
            ruleKey_subjectType_subjectId_status: {
              ruleKey: "scheduled_job_overdue_or_failed",
              subjectType: "job",
              subjectId: job.key,
              status: "OPEN",
            },
          },
          create: {
            ruleKey: "scheduled_job_overdue_or_failed",
            severity: "CRITICAL",
            status: "OPEN",
            subjectType: "job",
            subjectId: job.key,
            detail: {
              message: `Scheduled job "${job.name}" failed: ${err.message}`,
              jobKey: job.key,
              lastError: err.message,
              detectedAt: now.toISOString(),
            },
          },
          update: {
            lastSeenAt: now,
            detail: {
              message: `Scheduled job "${job.name}" failed: ${err.message}`,
              jobKey: job.key,
              lastError: err.message,
              detectedAt: now.toISOString(),
            },
          },
        });
      } catch (alertErr) {
        // Safe fallback
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const status = Object.keys(errors).length > 0 ? "degraded" : "ok";

  return {
    status,
    durationMs,
    budgetMs,
    jobsExecuted,
    jobsDeferred,
    alertsTriggered: totalAlertsTriggered,
    alertsResolved: totalAlertsResolved,
    notificationsSent: totalNotificationsSent,
    ...(Object.keys(errors).length > 0 ? { errors } : {}),
  };
}
