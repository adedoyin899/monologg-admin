-- CreateTable: AnalyticsEvent for Supabase-first product analytics and click/funnel telemetry
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "userId" TEXT,
    "anonymousId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userRole" TEXT,
    "path" TEXT NOT NULL,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventName_createdAt_idx" ON "AnalyticsEvent"("eventName", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_category_createdAt_idx" ON "AnalyticsEvent"("category", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_createdAt_idx" ON "AnalyticsEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sessionId_createdAt_idx" ON "AnalyticsEvent"("sessionId", "createdAt");

-- Enable Row Level Security (RLS)
ALTER TABLE "AnalyticsEvent" ENABLE ROW LEVEL SECURITY;

-- Allow append-only telemetry ingestion from Supabase anon/authenticated clients;
-- reading/querying remains restricted to backend service_role and Supabase Studio.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'CREATE POLICY "analytics_event_insert_anon" ON "AnalyticsEvent" FOR INSERT TO anon, authenticated WITH CHECK (true)';
  END IF;
END
$$;
