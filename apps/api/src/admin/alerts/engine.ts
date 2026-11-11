import { prisma } from "../../db/client.js";
import { adminRoPrisma } from "../../db/adminRoClient.js";
import { notifyProvider } from "../../providers/index.js";
import { audit } from "../../services/adminAudit.js";
import { ALERT_CONFIG, type AlertRuleKey, type EvaluatedAlert } from "../../config/alertRules.js";
import { evaluateBookingStuck } from "../../services/stuckDetection.js";
import { runAllFinanceMismatchDetectors } from "../../services/financeMismatches.js";
import { isSlaBreached } from "../../config/slaRules.js";
import { isDisputeOverdue } from "../../config/disputeRules.js";
import { isVerificationOverdue } from "../../config/verificationRules.js";
import type { AlertEventItem, AlertListResponse } from "@monologg/types";

/**
 * 1. Collect all active alert conditions across the operational datastore.
 */
export async function collectActiveAlertConditions(now = new Date()): Promise<EvaluatedAlert[]> {
  const db = adminRoPrisma || prisma;
  const triggered: EvaluatedAlert[] = [];
  const nowMs = now.getTime();

  // 1. Payment failure spike (>20% failures with at least 5 attempts in 1 hour)
  try {
    const oneHourAgo = new Date(nowMs - ALERT_CONFIG.paymentFailureWindowMinutes * 60 * 1000);
    const recentPayments = await db.payment.findMany({
      where: { createdAt: { gte: oneHourAgo } },
      select: { id: true, status: true },
    });

    if (recentPayments.length >= ALERT_CONFIG.paymentFailureMinAttempts) {
      const failed = recentPayments.filter((p) => p.status === "FAILED").length;
      const ratePct = Math.round((failed / recentPayments.length) * 100);
      if (ratePct > ALERT_CONFIG.paymentFailureSpikePct) {
        triggered.push({
          ruleKey: "payment_failure_spike",
          severity: "CRITICAL",
          subjectType: "system",
          subjectId: "payment_gateway",
          detail: {
            message: `Payment failure rate is ${ratePct}% (${failed} of ${recentPayments.length} failed in last hour)`,
            metricValue: ratePct,
            threshold: ALERT_CONFIG.paymentFailureSpikePct,
            detectedAt: now.toISOString(),
            targetUrl: "/payments",
          },
        });
      }
    }
  } catch (err: any) {
    console.error("[alerts] Error evaluating payment_failure_spike:", err.message);
  }

  // 2. Booking stuck (from A6 evaluateBookingStuck)
  try {
    const activeBookings = await db.booking.findMany({
      where: {
        state: { in: ["PENDING_PAYMENT", "ESCROW_LOCKED", "DELIVERABLES_PROVIDED"] },
      },
      select: {
        id: true,
        state: true,
        createdAt: true,
        slotHoldExpiresAt: true,
      },
    });

    for (const b of activeBookings) {
      const stuckRes = evaluateBookingStuck(
        {
          id: b.id,
          state: b.state,
          createdAt: b.createdAt,
          slotHoldExpiresAt: b.slotHoldExpiresAt,
        },
        { now },
      );

      if (stuckRes.isStuck) {
        triggered.push({
          ruleKey: "booking_stuck",
          severity: "WARNING",
          subjectType: "booking",
          subjectId: b.id,
          detail: {
            message: `Booking ${b.id} is stuck: ${stuckRes.reason}`,
            metricValue: stuckRes.ageInStateHuman,
            threshold: stuckRes.ruleKey || "STUCK",
            detectedAt: now.toISOString(),
            targetUrl: `/bookings/${b.id}`,
            extra: { state: b.state, ageMs: stuckRes.ageInStateMs },
          },
        });
      }
    }
  } catch (err: any) {
    console.error("[alerts] Error evaluating booking_stuck:", err.message);
  }

  // 3. Finance mismatches (from A7 runAllFinanceMismatchDetectors)
  try {
    const mismatches = await runAllFinanceMismatchDetectors(db, {
      now,
      webhookWindowMinutes: ALERT_CONFIG.webhookMissingWindowMinutes,
    });

    for (const m of mismatches) {
      triggered.push({
        ruleKey: "finance_mismatch",
        severity: m.severity,
        subjectType: m.paymentId ? "payment" : "booking",
        subjectId: m.paymentId || m.bookingId || "finance_mismatch",
        detail: {
          message: m.description,
          detectedAt: now.toISOString(),
          targetUrl: m.bookingId ? `/bookings/${m.bookingId}` : "/payments",
          extra: { mismatchType: m.type, ...m.metadata },
        },
      });
    }
  } catch (err: any) {
    console.error("[alerts] Error evaluating finance_mismatch:", err.message);
  }

  // 4. Withdrawal pending over 24 hours or failed
  try {
    const stalledWithdrawals = await db.withdrawalRequest.findMany({
      where: {
        OR: [
          { status: "FAILED" },
          {
            status: "PENDING_OTP",
            createdAt: { lte: new Date(nowMs - ALERT_CONFIG.withdrawalStalledHours * 3600 * 1000) },
          },
        ],
      },
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        createdAt: true,
      },
    });

    for (const w of stalledWithdrawals) {
      const isFailed = w.status === "FAILED";
      triggered.push({
        ruleKey: "withdrawal_stalled_or_failed",
        severity: isFailed ? "CRITICAL" : "WARNING",
        subjectType: "withdrawal",
        subjectId: w.id,
        detail: {
          message: isFailed
            ? `Withdrawal ${w.id} of ${w.currency} ${w.amount} FAILED.`
            : `Withdrawal ${w.id} has been pending in ${w.status} for over 24 hours.`,
          detectedAt: now.toISOString(),
          targetUrl: "/withdrawals",
          extra: { status: w.status, amount: w.amount, currency: w.currency },
        },
      });
    }
  } catch (err: any) {
    console.error("[alerts] Error evaluating withdrawal_stalled_or_failed:", err.message);
  }

  // 5. Dispute open over 3 days (from A9 / disputeRules)
  try {
    const threeDaysAgo = new Date(nowMs - ALERT_CONFIG.disputeStalledHours * 3600 * 1000);
    const staleDisputes = await db.dispute.findMany({
      where: {
        status: { in: ["OPEN", "AWAITING_EVIDENCE"] },
        createdAt: { lte: threeDaysAgo },
      },
      select: { id: true, bookingId: true, status: true, createdAt: true },
    });

    for (const d of staleDisputes) {
      triggered.push({
        ruleKey: "dispute_open_over_3_days",
        severity: "WARNING",
        subjectType: "dispute",
        subjectId: d.id,
        detail: {
          message: `Dispute ${d.id} for booking ${d.bookingId} has been unresolved for >3 days.`,
          detectedAt: now.toISOString(),
          targetUrl: `/disputes/${d.id}`,
          extra: { status: d.status, bookingId: d.bookingId },
        },
      });
    }
  } catch (err: any) {
    console.error("[alerts] Error evaluating dispute_open_over_3_days:", err.message);
  }

  // 6. Ticket SLA breach (from A8 / slaRules)
  try {
    const openTickets = await db.supportTicket.findMany({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS", "WAITING_ON_USER"] },
      },
      select: {
        id: true,
        number: true,
        priority: true,
        status: true,
        createdAt: true,
        slaDueAt: true,
        firstResponseAt: true,
      },
    });

    for (const t of openTickets) {
      if (isSlaBreached(t)) {
        const isUrgent = t.priority === "URGENT";
        triggered.push({
          ruleKey: "ticket_sla_breach",
          severity: isUrgent ? "CRITICAL" : "WARNING",
          subjectType: "ticket",
          subjectId: t.id,
          detail: {
            message: `Ticket #${t.number} (${t.priority}) has breached its response SLA.`,
            detectedAt: now.toISOString(),
            targetUrl: `/tickets/${t.id}`,
            extra: { ticketNumber: t.number, priority: t.priority },
          },
        });
      }
    }
  } catch (err: any) {
    console.error("[alerts] Error evaluating ticket_sla_breach:", err.message);
  }

  // 7. Verification waiting over 48 hours (from A10 / verificationRules)
  try {
    const pendingRecordings = await db.verificationRecording.findMany({
      where: {
        status: { in: ["UPLOADED", "IN_REVIEW"] },
      },
      select: { id: true, creatorId: true, createdAt: true, status: true },
    });

    for (const r of pendingRecordings) {
      if (isVerificationOverdue(r.createdAt)) {
        triggered.push({
          ruleKey: "verification_waiting_over_48h",
          severity: "WARNING",
          subjectType: "verification",
          subjectId: r.id,
          detail: {
            message: `Verification recording ${r.id} has been waiting review over 48 hours.`,
            detectedAt: now.toISOString(),
            targetUrl: `/verifications/${r.id}`,
            extra: { creatorId: r.creatorId, status: r.status },
          },
        });
      }
    }
  } catch (err: any) {
    console.error("[alerts] Error evaluating verification_waiting_over_48h:", err.message);
  }

  // 8. Auth failure spike (>10 failures in 15 minutes)
  try {
    const fifteenMinsAgo = new Date(nowMs - ALERT_CONFIG.authFailureWindowMinutes * 60 * 1000);
    const authFailures = await db.productEvent.count({
      where: {
        name: { in: ["auth_login_failed", "auth_otp_failed", "admin_login_failed"] },
        occurredAt: { gte: fifteenMinsAgo },
      },
    });

    if (authFailures >= ALERT_CONFIG.authFailureSpikeCount) {
      triggered.push({
        ruleKey: "auth_failure_spike",
        severity: "WARNING",
        subjectType: "system",
        subjectId: "auth_service",
        detail: {
          message: `${authFailures} authentication failures detected in the last 15 minutes.`,
          metricValue: authFailures,
          threshold: ALERT_CONFIG.authFailureSpikeCount,
          detectedAt: now.toISOString(),
          targetUrl: "/users",
        },
      });
    }
  } catch (err: any) {
    console.error("[alerts] Error evaluating auth_failure_spike:", err.message);
  }

  // 9. Alpha signups check (24 hours with 0 signups)
  try {
    const twentyFourHoursAgo = new Date(nowMs - ALERT_CONFIG.noSignupsWindowHours * 3600 * 1000);
    const recentSignups = await db.user.count({
      where: { createdAt: { gte: twentyFourHoursAgo }, isTestUser: false },
    });

    if (recentSignups === 0) {
      triggered.push({
        ruleKey: "no_signups_24h",
        severity: "INFO",
        subjectType: "system",
        subjectId: "acquisition",
        detail: {
          message: "No new user signups recorded in the past 24 hours.",
          detectedAt: now.toISOString(),
          targetUrl: "/analytics/acquisition",
        },
      });
    }
  } catch (err: any) {
    console.error("[alerts] Error evaluating no_signups_24h:", err.message);
  }

  // 10. AdminJob queue backlog (>100 waiting or oldest >10 min)
  try {
    const pendingJobs = await db.adminJob.findMany({
      where: { status: "PENDING" },
      orderBy: { runAfter: "asc" },
      select: { id: true, runAfter: true },
    });

    const pendingCount = pendingJobs.length;
    const oldest = pendingJobs[0];
    const isOldestStale =
      oldest && nowMs - oldest.runAfter.getTime() > ALERT_CONFIG.jobBacklogAgeMinutes * 60 * 1000;

    if (pendingCount >= ALERT_CONFIG.jobBacklogCount || isOldestStale) {
      triggered.push({
        ruleKey: "job_backlog",
        severity: "WARNING",
        subjectType: "system",
        subjectId: "admin_queue",
        detail: {
          message: `Admin job backlog: ${pendingCount} pending jobs. Oldest waiting ${
            oldest ? Math.round((nowMs - oldest.runAfter.getTime()) / 60000) : 0
          } minutes.`,
          metricValue: pendingCount,
          threshold: ALERT_CONFIG.jobBacklogCount,
          detectedAt: now.toISOString(),
          targetUrl: "/health",
        },
      });
    }
  } catch (err: any) {
    console.error("[alerts] Error evaluating job_backlog:", err.message);
  }

  // 11. Scheduled job failed or overdue (from JobRun)
  try {
    const jobRuns = await db.jobRun.findMany();
    for (const jr of jobRuns) {
      const isFailed = jr.lastStatus === "FAILED";
      const isOverdue =
        jr.nextDueAt && nowMs > jr.nextDueAt.getTime() + 10 * 60 * 1000;

      if (isFailed || isOverdue) {
        triggered.push({
          ruleKey: "scheduled_job_overdue_or_failed",
          severity: "CRITICAL",
          subjectType: "job",
          subjectId: jr.jobKey,
          detail: {
            message: isFailed
              ? `Scheduled job ${jr.jobKey} failed: ${jr.lastError || "Unknown error"}`
              : `Scheduled job ${jr.jobKey} is overdue by >10 minutes.`,
            detectedAt: now.toISOString(),
            targetUrl: "/health",
            extra: { lastStatus: jr.lastStatus, lastError: jr.lastError },
          },
        });
      }
    }
  } catch (err: any) {
    console.error("[alerts] Error evaluating scheduled_job_overdue_or_failed:", err.message);
  }

  // 12. Storage or Database size > 80% limit
  try {
    const latestStorage = await db.kpiDaily.findFirst({
      where: { metric: "storage_bytes", dimension: "r2_buckets" },
      orderBy: { day: "desc" },
    });

    if (latestStorage) {
      const r2Bytes = Number(latestStorage.value);
      const r2Limit = ALERT_CONFIG.storageLimitBytes;
      const r2Pct = Math.round((r2Bytes / r2Limit) * 100);
      if (r2Pct >= ALERT_CONFIG.resourceAlertThresholdPct) {
        triggered.push({
          ruleKey: "storage_or_db_over_80",
          severity: "WARNING",
          subjectType: "system",
          subjectId: "storage_r2",
          detail: {
            message: `R2 storage capacity reached ${r2Pct}% of limit (${Math.round(r2Bytes / 1024 / 1024)}MB / ${Math.round(r2Limit / 1024 / 1024)}MB).`,
            metricValue: r2Pct,
            threshold: ALERT_CONFIG.resourceAlertThresholdPct,
            detectedAt: now.toISOString(),
            targetUrl: "/health",
          },
        });
      }
    }

    const latestDbSnapshot = await db.kpiDaily.findFirst({
      where: { metric: "database_bytes", dimension: "postgres" },
      orderBy: { day: "desc" },
    });

    if (latestDbSnapshot) {
      const dbBytes = Number(latestDbSnapshot.value);
      const dbLimit = ALERT_CONFIG.databaseLimitBytes;
      const dbPct = Math.round((dbBytes / dbLimit) * 100);
      if (dbPct >= ALERT_CONFIG.resourceAlertThresholdPct) {
        triggered.push({
          ruleKey: "storage_or_db_over_80",
          severity: "WARNING",
          subjectType: "system",
          subjectId: "database",
          detail: {
            message: `Database capacity reached ${dbPct}% of limit (${Math.round(dbBytes / 1024 / 1024)}MB / ${Math.round(dbLimit / 1024 / 1024)}MB).`,
            metricValue: dbPct,
            threshold: ALERT_CONFIG.resourceAlertThresholdPct,
            detectedAt: now.toISOString(),
            targetUrl: "/health",
          },
        });
      }
    }
  } catch (err: any) {
    console.error("[alerts] Error evaluating storage_or_db_over_80:", err.message);
  }

  return triggered;
}

/**
 * 2. Main Alert Engine Runner:
 * Evaluates active conditions, upserts AlertEvent rows, throttles notifications,
 * and auto-resolves cleared conditions.
 */
export async function evaluateAllAlertRules(
  now = new Date(),
  options: { sendNotifications?: boolean } = { sendNotifications: true },
): Promise<{ triggered: number; autoResolved: number; notificationsSent: number }> {
  const activeConditions = await collectActiveAlertConditions(now);
  let notificationsSent = 0;
  let autoResolved = 0;

  // Track existing open or acknowledged alert events
  const existingAlerts = await prisma.alertEvent.findMany({
    where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
  });

  const activeKeys = new Set(
    activeConditions.map((c) => `${c.ruleKey}::${c.subjectType}::${c.subjectId}`),
  );

  // 1. Upsert triggered alerts
  for (const cond of activeConditions) {
    const existing = existingAlerts.find(
      (e) =>
        e.ruleKey === cond.ruleKey &&
        e.subjectType === cond.subjectType &&
        e.subjectId === cond.subjectId,
    );

    if (existing) {
      // Update lastSeenAt and detail
      await prisma.alertEvent.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: now,
          detail: {
            ...(typeof existing.detail === "object" && existing.detail ? existing.detail : {}),
            ...cond.detail,
          },
        },
      });

      // Throttle critical alerts notification: at most 1 per 60 mins
      if (cond.severity === "CRITICAL" && options.sendNotifications) {
        const detailObj = (existing.detail || {}) as Record<string, any>;
        const lastNotifiedAt = detailObj.lastNotifiedAt
          ? new Date(detailObj.lastNotifiedAt).getTime()
          : 0;
        const elapsedMinutes = (now.getTime() - lastNotifiedAt) / (60 * 1000);

        if (elapsedMinutes >= ALERT_CONFIG.repeatThrottleMinutes) {
          await dispatchCriticalAlertNotification(cond, now);
          await prisma.alertEvent.update({
            where: { id: existing.id },
            data: {
              detail: {
                ...detailObj,
                lastNotifiedAt: now.toISOString(),
              },
            },
          });
          notificationsSent++;
        }
      }
    } else {
      // Create new OPEN alert
      const created = await prisma.alertEvent.create({
        data: {
          ruleKey: cond.ruleKey,
          severity: cond.severity,
          status: "OPEN",
          subjectType: cond.subjectType,
          subjectId: cond.subjectId,
          detail: {
            ...cond.detail,
            lastNotifiedAt: cond.severity === "CRITICAL" ? now.toISOString() : undefined,
          },
          firstSeenAt: now,
          lastSeenAt: now,
        },
      });

      if (cond.severity === "CRITICAL" && options.sendNotifications) {
        await dispatchCriticalAlertNotification(cond, now);
        notificationsSent++;
      }
    }
  }

  // 2. Auto-resolve alerts whose condition has cleared
  for (const existing of existingAlerts) {
    const key = `${existing.ruleKey}::${existing.subjectType}::${existing.subjectId}`;
    if (!activeKeys.has(key)) {
      const existingDetail = (existing.detail || {}) as Record<string, any>;
      await prisma.alertEvent.update({
        where: { id: existing.id },
        data: {
          status: "RESOLVED",
          resolvedAt: now,
          detail: {
            ...existingDetail,
            resolvedReason: "AUTO_RESOLVED",
            resolvedAt: now.toISOString(),
          },
        },
      });
      autoResolved++;
    }
  }

  return {
    triggered: activeConditions.length,
    autoResolved,
    notificationsSent,
  };
}

/**
 * Dispatches critical alert email to SUPER_ADMIN group and sends webhook if configured.
 */
export async function dispatchCriticalAlertNotification(
  alert: EvaluatedAlert,
  now = new Date(),
): Promise<void> {
  try {
    const superAdmins = await prisma.adminUser.findMany({
      where: { role: "SUPER_ADMIN", status: "ACTIVE" },
      select: { email: true },
    });

    const emailPayload = {
      ruleKey: alert.ruleKey,
      message: alert.detail.message,
      subjectType: alert.subjectType,
      subjectId: alert.subjectId,
      detectedAt: alert.detail.detectedAt || now.toISOString(),
      targetUrl: alert.detail.targetUrl,
    };

    for (const admin of superAdmins) {
      await notifyProvider.email(admin.email, "admin_critical_alert", emailPayload);
    }

    // Optional webhook dispatch (Slack/Telegram)
    const webhookUrl = process.env.SLACK_ALERT_WEBHOOK;
    if (webhookUrl && webhookUrl.startsWith("http")) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚨 [CRITICAL ALERT] ${alert.ruleKey}: ${alert.detail.message}`,
          alert,
        }),
      }).catch((e) => {
        console.warn("[alerts] Failed to post to SLACK_ALERT_WEBHOOK:", e.message);
      });
    }
  } catch (err: any) {
    console.error("[alerts] Error dispatching critical alert notification:", err.message);
  }
}

/**
 * 3. List AlertEvents for AD-27 console
 */
export async function listAlertEvents(filters?: {
  severity?: string;
  status?: string;
  ruleKey?: string;
  limit?: number;
}): Promise<AlertListResponse> {
  const db = adminRoPrisma || prisma;
  const where: any = {};

  if (filters?.severity && filters.severity !== "ALL") {
    where.severity = filters.severity;
  }
  if (filters?.status && filters.status !== "ALL") {
    where.status = filters.status;
  }
  if (filters?.ruleKey) {
    where.ruleKey = filters.ruleKey;
  }

  const [alertsRaw, openCount, criticalCount, warningCount, infoCount] = await Promise.all([
    db.alertEvent.findMany({
      where,
      orderBy: [{ severity: "desc" }, { lastSeenAt: "desc" }],
      take: filters?.limit || 100,
    }),
    db.alertEvent.count({ where: { status: "OPEN" } }),
    db.alertEvent.count({ where: { severity: "CRITICAL", status: "OPEN" } }),
    db.alertEvent.count({ where: { severity: "WARNING", status: "OPEN" } }),
    db.alertEvent.count({ where: { severity: "INFO", status: "OPEN" } }),
  ]);

  const alerts: AlertEventItem[] = alertsRaw.map((a: any) => {
    const detail = (typeof a.detail === "object" && a.detail ? a.detail : {}) as Record<string, any>;
    return {
      id: a.id,
      ruleKey: a.ruleKey,
      severity: a.severity,
      status: a.status,
      subjectType: a.subjectType,
      subjectId: a.subjectId,
      subjectUrl: detail.targetUrl || null,
      detail,
      firstSeenAt: a.firstSeenAt.toISOString(),
      lastSeenAt: a.lastSeenAt.toISOString(),
      ackedByAdminId: a.ackedByAdminId,
      resolvedAt: a.resolvedAt ? a.resolvedAt.toISOString() : null,
    };
  });

  return {
    alerts,
    total: alerts.length,
    openCount,
    criticalCount,
    warningCount,
    infoCount,
  };
}

/**
 * 4. Acknowledge an alert (audited, VIEWER forbidden)
 */
export async function acknowledgeAlert(
  id: string,
  adminUser: { id: string; role: string },
  ip?: string,
): Promise<{ status: string; alertId: string }> {
  if (adminUser.role === "VIEWER") {
    throw new Error("VIEWER cannot acknowledge alerts.");
  }

  await prisma.alertEvent.update({
    where: { id },
    data: {
      status: "ACKNOWLEDGED",
      ackedByAdminId: adminUser.id,
    },
  });

  await audit({
    adminId: adminUser.id,
    action: "ALERT_ACK",
    targetType: "AlertEvent",
    targetId: id,
    ip,
  });

  return { status: "ok", alertId: id };
}

/**
 * 5. Resolve an alert with a note (audited)
 */
export async function resolveAlert(
  id: string,
  adminUser: { id: string; role: string },
  note: string,
  ip?: string,
): Promise<{ status: string; alertId: string }> {
  if (!note || note.trim().length === 0) {
    throw new Error("Resolution note is required to resolve an alert.");
  }

  const existing = await prisma.alertEvent.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`Alert ${id} not found.`);
  }

  const detailObj = (typeof existing.detail === "object" && existing.detail ? existing.detail : {}) as Record<string, any>;

  await prisma.alertEvent.update({
    where: { id },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      detail: {
        ...detailObj,
        resolutionNote: note.trim(),
        resolvedByAdminId: adminUser.id,
      },
    },
  });

  await audit({
    adminId: adminUser.id,
    action: "ALERT_RESOLVED",
    targetType: "AlertEvent",
    targetId: id,
    reason: note.trim(),
    ip,
  });

  return { status: "ok", alertId: id };
}
