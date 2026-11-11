export interface PlatformThresholds {
  databaseLimitBytes: number;
  databaseLimitMb: number;
  storageLimitBytes: number;
  storageLimitGb: number;
  resourceAlertThresholdPct: number;
  fourEyesThresholdNgn: number;
  fourEyesThresholdUsd: number;
}

export interface SlaTargets {
  urgentTicketHours: number;
  highTicketHours: number;
  normalTicketHours: number;
  lowTicketHours: number;
  verificationReviewHours: number;
  disputeStalledDays: number;
  withdrawalStalledHours: number;
}

export interface PlatformSettingsResponse {
  version: {
    appVersion: string;
    configVersion: string;
    environment: string;
    commitHash?: string;
  };
  thresholds: PlatformThresholds;
  slas: SlaTargets;
  retention: {
    analyticsRetentionMonths: number;
    exportFileRetentionDays: number;
    auditLogRetention: "PERMANENT";
  };
  featuresCount: number;
  funnelsCount: number;
}
