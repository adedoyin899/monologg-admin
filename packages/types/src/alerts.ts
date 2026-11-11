export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";
export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export interface AlertEventItem {
  id: string;
  ruleKey: string;
  severity: AlertSeverity;
  status: AlertStatus;
  subjectType: string | null;
  subjectId: string | null;
  subjectUrl?: string | null;
  detail: Record<string, any>;
  firstSeenAt: string;
  lastSeenAt: string;
  ackedByAdminId: string | null;
  resolvedAt: string | null;
}

export interface AlertListResponse {
  alerts: AlertEventItem[];
  total: number;
  openCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
}

export interface TopTableItem {
  tableName: string;
  rowCount: number;
  sizeBytes?: number;
  sizeFormatted?: string;
}

export interface ScheduledJobHealthItem {
  jobKey: string;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  nextDueAt: string | null;
  durationMs: number | null;
}

export interface WebhookOutcomeItem {
  provider: string;
  successCount: number;
  failureCount: number;
  lastWebhookAt: string | null;
}

export interface ExternalServiceStatus {
  name: string;
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  consoleUrl: string;
  description: string;
}

export interface SystemHealthResponse {
  database: {
    sizeBytes: number;
    sizeFormatted: string;
    limitBytes: number;
    usagePct: number;
    topTables: TopTableItem[];
  };
  storage: {
    r2SizeBytes: number;
    r2SizeFormatted: string;
    limitBytes: number;
    usagePct: number;
    dailyHistory: Array<{ day: string; bytes: number }>;
  };
  jobs: ScheduledJobHealthItem[];
  adminQueue: {
    depth: number;
    pendingCount: number;
    runningCount: number;
    failedCount: number;
    oldestWaitingAgeMinutes: number | null;
  };
  materializedViews: {
    lastRefreshedAt: string | null;
    freshnessMinutes: number;
  };
  webhooks: WebhookOutcomeItem[];
  api: {
    errorRatePct: number;
    total5xxEvents: number;
    total4xxEvents: number;
    latencyMsMedian: number;
  };
  externalServices: ExternalServiceStatus[];
  dataFreshness: string;
}

export interface CronTickResponse {
  status: "ok" | "degraded";
  durationMs: number;
  budgetMs: number;
  jobsExecuted: string[];
  jobsDeferred: string[];
  alertsTriggered: number;
  alertsResolved: number;
  notificationsSent: number;
  errors?: Record<string, string>;
}

