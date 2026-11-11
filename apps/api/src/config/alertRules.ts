/**
 * Alert Rules & Threshold Configuration (PRD Module M11.1 / Phase A12)
 * Centralizes thresholds for the automated alert evaluation engine.
 */

export const ALERT_CONFIG = {
  // Payment failures: >20% failure rate with >= 5 attempts in 1 hour
  paymentFailureSpikePct: 20,
  paymentFailureMinAttempts: 5,
  paymentFailureWindowMinutes: 60,

  // Missing webhook threshold (15 minutes)
  webhookMissingWindowMinutes: 15,

  // Withdrawal stall threshold (24 hours)
  withdrawalStalledHours: 24,

  // Dispute age SLA target (3 days / 72 hours)
  disputeStalledHours: 72,

  // Verification SLA threshold (48 hours)
  verificationStalledHours: 48,

  // Auth failure spike (>10 failures in 15 minutes)
  authFailureSpikeCount: 10,
  authFailureWindowMinutes: 15,

  // Alpha signups check (24 hours with 0 signups)
  noSignupsWindowHours: 24,

  // AdminJob queue backlog
  jobBacklogCount: 100,
  jobBacklogAgeMinutes: 10,

  // Provider error rate (>5% in 15 minutes)
  providerErrorRatePct: 5,
  providerErrorWindowMinutes: 15,

  // API 5xx error rate (>2% in 15 minutes)
  api5xxRatePct: 2,
  api5xxWindowMinutes: 15,

  // Storage and Database 80% limits
  storageLimitBytes: 10 * 1024 * 1024 * 1024, // 10 GB
  databaseLimitBytes: 500 * 1024 * 1024,      // 500 MB
  resourceAlertThresholdPct: 80,

  // Notification throttle: at most one notification per alert per 60 minutes
  repeatThrottleMinutes: 60,
};

export type AlertRuleKey =
  | "payment_failure_spike"
  | "webhook_missing_or_failing"
  | "booking_stuck"
  | "finance_mismatch"
  | "withdrawal_stalled_or_failed"
  | "dispute_open_over_3_days"
  | "ticket_sla_breach"
  | "verification_waiting_over_48h"
  | "auth_failure_spike"
  | "no_signups_24h"
  | "job_backlog"
  | "scheduled_job_overdue_or_failed"
  | "provider_error_rate_high"
  | "api_5xx_rate_high"
  | "storage_or_db_over_80";

export interface EvaluatedAlert {
  ruleKey: AlertRuleKey;
  severity: "CRITICAL" | "WARNING" | "INFO";
  subjectType: string;
  subjectId: string;
  detail: {
    message: string;
    metricValue?: number | string;
    threshold?: number | string;
    detectedAt: string;
    targetUrl?: string;
    extra?: Record<string, any>;
  };
}

