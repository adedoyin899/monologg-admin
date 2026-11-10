-- =============================================================================
-- Migration: 20261110190000_phase_a2_data_layer
-- Additive migration for Phase A2: Data Layer (PRD Sections 5, 6, 7)
-- =============================================================================

-- 1. Alter User with additive admin columns
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isTestUser" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspendedReason" TEXT;

-- 2. Alter WithdrawalRequest with review and flag columns
ALTER TABLE "WithdrawalRequest" ADD COLUMN IF NOT EXISTS "flagged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WithdrawalRequest" ADD COLUMN IF NOT EXISTS "flagReason" TEXT;
ALTER TABLE "WithdrawalRequest" ADD COLUMN IF NOT EXISTS "flaggedAt" TIMESTAMP(3);
ALTER TABLE "WithdrawalRequest" ADD COLUMN IF NOT EXISTS "flaggedByAdminId" TEXT;
ALTER TABLE "WithdrawalRequest" ADD COLUMN IF NOT EXISTS "clearedAt" TIMESTAMP(3);
ALTER TABLE "WithdrawalRequest" ADD COLUMN IF NOT EXISTS "clearedByAdminId" TEXT;

-- 3. Additive indexes on existing tables
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX IF NOT EXISTS "User_lastActiveAt_idx" ON "User"("lastActiveAt");
CREATE INDEX IF NOT EXISTS "Booking_state_createdAt_idx" ON "Booking"("state", "createdAt");
CREATE INDEX IF NOT EXISTS "Booking_creatorId_createdAt_idx" ON "Booking"("creatorId", "createdAt");
CREATE INDEX IF NOT EXISTS "Booking_clientId_createdAt_idx" ON "Booking"("clientId", "createdAt");
CREATE INDEX IF NOT EXISTS "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentEvent_paymentId_createdAt_idx" ON "PaymentEvent"("paymentId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_orderRoomId_createdAt_idx" ON "Message"("orderRoomId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuthEvent_createdAt_idx" ON "AuthEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "Application_briefId_createdAt_idx" ON "Application"("briefId", "createdAt");
CREATE INDEX IF NOT EXISTS "Brief_createdAt_idx" ON "Brief"("createdAt");
CREATE INDEX IF NOT EXISTS "VerificationRecording_status_createdAt_idx" ON "VerificationRecording"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- 4. Create Enums for Analytics & Alerts
DO $$ BEGIN
  CREATE TYPE "EventActor" AS ENUM ('USER', 'ANON', 'SYSTEM', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EventSource" AS ENUM ('WEB', 'API', 'SYSTEM', 'WEBHOOK');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 5. Create New Admin & Analytics Tables
CREATE TABLE IF NOT EXISTS "UserNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserNote_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "UserNote_userId_createdAt_idx" ON "UserNote"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "UserTag" (
    "userId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTag_pkey" PRIMARY KEY ("userId", "tag")
);
CREATE INDEX IF NOT EXISTS "UserTag_tag_idx" ON "UserTag"("tag");

CREATE TABLE IF NOT EXISTS "UserAcquisition" (
    "userId" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3),
    "landingPath" TEXT,
    "referrerDomain" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "referralCodeUsed" TEXT,
    "signupCountry" TEXT,
    "signupDeviceClass" TEXT,
    "analyticsConsent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAcquisition_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE IF NOT EXISTS "ProductEvent" (
    "id" BIGSERIAL NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "actorType" "EventActor" NOT NULL,
    "source" "EventSource" NOT NULL,
    "userId" TEXT,
    "anonymousId" TEXT,
    "sessionId" TEXT,
    "path" TEXT,
    "referrerDomain" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "country" TEXT,
    "deviceClass" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "appVersion" TEXT,
    "props" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ProductEvent_name_occurredAt_idx" ON "ProductEvent"("name", "occurredAt");
CREATE INDEX IF NOT EXISTS "ProductEvent_userId_occurredAt_idx" ON "ProductEvent"("userId", "occurredAt");
CREATE INDEX IF NOT EXISTS "ProductEvent_occurredAt_idx" ON "ProductEvent"("occurredAt");
CREATE INDEX IF NOT EXISTS "ProductEvent_anonymousId_occurredAt_idx" ON "ProductEvent"("anonymousId", "occurredAt");

CREATE TABLE IF NOT EXISTS "KpiDaily" (
    "day" TIMESTAMP(3) NOT NULL,
    "metric" TEXT NOT NULL,
    "dimension" TEXT NOT NULL DEFAULT 'all',
    "value" DECIMAL(20,4) NOT NULL,

    CONSTRAINT "KpiDaily_pkey" PRIMARY KEY ("day", "metric", "dimension")
);

CREATE TABLE IF NOT EXISTS "AlertEvent" (
    "id" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "subjectType" TEXT,
    "subjectId" TEXT,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ackedByAdminId" TEXT,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AlertEvent_status_severity_lastSeenAt_idx" ON "AlertEvent"("status", "severity", "lastSeenAt");
CREATE UNIQUE INDEX IF NOT EXISTS "AlertEvent_ruleKey_subjectType_subjectId_status_key" ON "AlertEvent"("ruleKey", "subjectType", "subjectId", "status");

CREATE TABLE IF NOT EXISTS "AdminJob" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "lastError" TEXT,

    CONSTRAINT "AdminJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AdminJob_status_runAfter_idx" ON "AdminJob"("status", "runAfter");

CREATE TABLE IF NOT EXISTS "JobRun" (
    "jobKey" TEXT NOT NULL,
    "lastStartedAt" TIMESTAMP(3),
    "lastFinishedAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastError" TEXT,
    "nextDueAt" TIMESTAMP(3),

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("jobKey")
);

-- 6. Lock down RLS on newly created tables
ALTER TABLE "UserNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserAcquisition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KpiDaily" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AlertEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JobRun" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "UserNote" FROM anon;
REVOKE ALL ON "UserTag" FROM anon;
REVOKE ALL ON "UserAcquisition" FROM anon;
REVOKE ALL ON "ProductEvent" FROM anon;
REVOKE ALL ON "KpiDaily" FROM anon;
REVOKE ALL ON "AlertEvent" FROM anon;
REVOKE ALL ON "AdminJob" FROM anon;
REVOKE ALL ON "JobRun" FROM anon;

-- 7. Create admin schema and SQL views
CREATE SCHEMA IF NOT EXISTS admin;

-- View 1: admin.v_user_summary
CREATE OR REPLACE VIEW admin.v_user_summary AS
SELECT
  COUNT(*) AS total_users,
  COUNT(*) FILTER (WHERE "userType" = 'TALENT') AS total_talent,
  COUNT(*) FILTER (WHERE "userType" = 'CLIENT') AS total_clients,
  COUNT(*) FILTER (WHERE "emailVerified" = true) AS email_verified_count,
  COUNT(*) FILTER (WHERE "isTestUser" = true) AS test_users_count,
  COUNT(*) FILTER (WHERE "suspendedAt" IS NOT NULL) AS suspended_count,
  COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '30 days') AS signups_last_30d,
  COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '7 days') AS signups_last_7d,
  COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '24 hours') AS signups_last_24h
FROM "User";

-- View 2: admin.v_booking_summary
CREATE OR REPLACE VIEW admin.v_booking_summary AS
SELECT
  state,
  currency,
  COUNT(*) AS booking_count,
  COALESCE(SUM("baseAmount"), 0) AS total_base_amount,
  COALESCE(SUM("talentFeeAmount"), 0) AS total_talent_fee,
  COALESCE(SUM("clientFeeAmount"), 0) AS total_client_fee
FROM "Booking"
GROUP BY state, currency;

-- View 3: admin.v_money_by_currency (one row per currency, never summed across)
CREATE OR REPLACE VIEW admin.v_money_by_currency AS
WITH gmv_calc AS (
  SELECT
    currency,
    COALESCE(SUM("baseAmount"), 0) AS gmv
  FROM "Booking"
  WHERE state IN ('ESCROW_LOCKED', 'DELIVERABLES_PROVIDED', 'PAYMENT_RELEASED', 'DISPUTED')
  GROUP BY currency
),
released_calc AS (
  SELECT
    currency,
    COALESCE(SUM("baseAmount"), 0) AS released,
    COALESCE(SUM("talentFeeAmount" + "clientFeeAmount"), 0) AS platform_revenue
  FROM "Booking"
  WHERE state = 'PAYMENT_RELEASED'
  GROUP BY currency
),
escrow_calc AS (
  SELECT
    currency,
    COALESCE(SUM(amount), 0) AS escrow_held
  FROM "Payment"
  WHERE "escrowHeld" = true AND status NOT IN ('RELEASED', 'REFUNDED')
  GROUP BY currency
),
withdrawn_calc AS (
  SELECT
    currency,
    COALESCE(SUM(amount), 0) AS total_withdrawn
  FROM "WithdrawalRequest"
  WHERE status = 'COMPLETED'
  GROUP BY currency
),
all_currencies AS (
  SELECT DISTINCT currency FROM "Booking"
  UNION
  SELECT DISTINCT currency FROM "Payment"
  UNION
  SELECT DISTINCT currency FROM "WithdrawalRequest"
)
SELECT
  c.currency,
  COALESCE(g.gmv, 0) AS gmv,
  COALESCE(e.escrow_held, 0) AS escrow_held,
  COALESCE(r.released, 0) AS released,
  COALESCE(r.platform_revenue, 0) AS platform_revenue,
  COALESCE(w.total_withdrawn, 0) AS total_withdrawn
FROM all_currencies c
LEFT JOIN gmv_calc g ON c.currency = g.currency
LEFT JOIN escrow_calc e ON c.currency = e.currency
LEFT JOIN released_calc r ON c.currency = r.currency
LEFT JOIN withdrawn_calc w ON c.currency = w.currency;

-- Materialized View for heavy money calculations
DROP MATERIALIZED VIEW IF EXISTS admin.mv_money_by_currency;
CREATE MATERIALIZED VIEW admin.mv_money_by_currency AS
SELECT *, NOW() AS last_refreshed_at FROM admin.v_money_by_currency;
CREATE UNIQUE INDEX IF NOT EXISTS "mv_money_by_currency_idx" ON admin.mv_money_by_currency (currency);

-- View 4: admin.v_signup_funnel
CREATE OR REPLACE VIEW admin.v_signup_funnel AS
SELECT
  COUNT(u.id) AS signups_total,
  COUNT(u.id) FILTER (WHERE u."emailVerified" = true) AS email_verified_count,
  COUNT(c.id) AS talent_profiles_created,
  COUNT(c.id) FILTER (WHERE c.name IS NOT NULL AND c.niche IS NOT NULL AND c.location IS NOT NULL) AS talent_onboarded_count,
  COUNT(c.id) FILTER (WHERE c.verification = 'VERIFIED') AS identity_verified_count,
  COUNT(cl.id) AS client_profiles_created
FROM "User" u
LEFT JOIN "Creator" c ON u.id = c."userId"
LEFT JOIN "Client" cl ON u.id = cl."userId"
WHERE u."isTestUser" = false;

-- View 5: admin.v_support_summary
CREATE OR REPLACE VIEW admin.v_support_summary AS
SELECT
  COUNT(*) FILTER (WHERE status = 'OPEN') AS tickets_open,
  COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS tickets_in_progress,
  COUNT(*) FILTER (WHERE status = 'RESOLVED') AS tickets_resolved,
  COUNT(*) FILTER (WHERE status = 'CLOSED') AS tickets_closed,
  COUNT(*) AS tickets_total
FROM "SupportTicket";

-- Materialized view refresh log table
CREATE TABLE IF NOT EXISTS admin.materialized_view_refresh (
  view_name TEXT PRIMARY KEY,
  last_refreshed_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO admin.materialized_view_refresh (view_name, last_refreshed_at)
VALUES ('mv_money_by_currency', CURRENT_TIMESTAMP)
ON CONFLICT (view_name) DO UPDATE SET last_refreshed_at = CURRENT_TIMESTAMP;

-- 8. Read-only role monologg_admin_ro
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'monologg_admin_ro') THEN
    CREATE ROLE monologg_admin_ro WITH LOGIN PASSWORD 'monologg_ro_secure_password_2026';
  END IF;
END
$$;

ALTER ROLE monologg_admin_ro SET statement_timeout = '5s';

GRANT USAGE ON SCHEMA public TO monologg_admin_ro;
GRANT USAGE ON SCHEMA admin TO monologg_admin_ro;

-- Explicitly revoke all table permissions first
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM monologg_admin_ro;
REVOKE ALL ON ALL TABLES IN SCHEMA admin FROM monologg_admin_ro;

-- Grant SELECT only on allowed tables
GRANT SELECT ON
  "User",
  "Creator",
  "Client",
  "AuthEvent",
  "MediaAsset",
  "RateCard",
  "AvailabilityBlock",
  "CalendarEvent",
  "Brief",
  "Application",
  "Booking",
  "Payment",
  "PaymentEvent",
  "OrderRoom",
  "Message",
  "Notification",
  "NotificationPreference",
  "KycCheck",
  "TermsAcceptance",
  "SupportTicket",
  "MediaKit",
  "VerificationRecording",
  "PhysicalAttributes",
  "WithdrawalRequest",
  "AnalyticsEvent",
  "UserNote",
  "UserTag",
  "UserAcquisition",
  "ProductEvent",
  "KpiDaily",
  "AlertEvent",
  "JobRun",
  "AdminUser",
  "AdminSession"
TO monologg_admin_ro;

-- Grant SELECT on admin schema views
GRANT SELECT ON ALL TABLES IN SCHEMA admin TO monologg_admin_ro;

-- Explicitly revoke access to sensitive tables & secret columns
REVOKE ALL ON "RefreshToken" FROM monologg_admin_ro;
REVOKE ALL ON "AdminJob" FROM monologg_admin_ro;
REVOKE ALL ON "AdminAuditLog" FROM monologg_admin_ro;
REVOKE ALL ON "WithdrawalOtp" FROM monologg_admin_ro;

-- Revoke SELECT on passwordHash from User
REVOKE SELECT ("passwordHash") ON "User" FROM monologg_admin_ro;

