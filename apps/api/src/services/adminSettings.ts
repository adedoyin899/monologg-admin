import { ALERT_CONFIG } from "../config/alertRules.js";
import { SLA_TARGETS_HOURS } from "../config/slaRules.js";
import { FEATURE_REGISTRY } from "../config/featureRegistry.js";
import { FUNNELS } from "../config/funnelConfig.js";
import type { PlatformSettingsResponse } from "@monologg/types";

/**
 * Returns read-only platform configuration and settings (AD-32 / PRD M12.3)
 */
export function getPlatformSettings(): PlatformSettingsResponse {
  return {
    version: {
      appVersion: "1.0.0-alpha.1",
      configVersion: "2026.02-alpha",
      environment: process.env.NODE_ENV || "test",
      commitHash: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev-alpha",
    },
    thresholds: {
      databaseLimitBytes: ALERT_CONFIG.databaseLimitBytes,
      databaseLimitMb: Math.round(ALERT_CONFIG.databaseLimitBytes / (1024 * 1024)),
      storageLimitBytes: ALERT_CONFIG.storageLimitBytes,
      storageLimitGb: Math.round(ALERT_CONFIG.storageLimitBytes / (1024 * 1024 * 1024)),
      resourceAlertThresholdPct: ALERT_CONFIG.resourceAlertThresholdPct,
      fourEyesThresholdNgn: 1500000, // ₦1,500,000 (~$1,000)
      fourEyesThresholdUsd: 1000,
    },
    slas: {
      urgentTicketHours: SLA_TARGETS_HOURS.URGENT,
      highTicketHours: SLA_TARGETS_HOURS.HIGH,
      normalTicketHours: SLA_TARGETS_HOURS.NORMAL,
      lowTicketHours: SLA_TARGETS_HOURS.LOW,
      verificationReviewHours: ALERT_CONFIG.verificationStalledHours,
      disputeStalledDays: Math.round(ALERT_CONFIG.disputeStalledHours / 24),
      withdrawalStalledHours: ALERT_CONFIG.withdrawalStalledHours,
    },
    retention: {
      analyticsRetentionMonths: parseInt(process.env.ANALYTICS_RETENTION_MONTHS || "12", 10),
      exportFileRetentionDays: 7,
      auditLogRetention: "PERMANENT",
    },
    featuresCount: FEATURE_REGISTRY.length,
    funnelsCount: Object.keys(FUNNELS).length,
  };
}
