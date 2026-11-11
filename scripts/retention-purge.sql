-- =============================================================================
-- Monologg Admin — Retention & Purge Jobs (pg_cron)
-- PRD Section 12.3: Retention purge runs daily at 03:30 UTC
-- =============================================================================

-- Ensure pg_cron extension exists
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Refresh materialized view every 15 minutes (PRD M12.3)
SELECT cron.schedule(
  'refresh_mat_view_money',
  '*/15 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_money_by_currency;$$
);

-- 2. Daily retention purge at 03:30 UTC:
--    - Delete ProductEvent beyond ANALYTICS_RETENTION_MONTHS (12 months)
--    - Purge AdminJob of kind EXPORT older than 7 days
--    - AdminAuditLog is strictly preserved (immutable append-only)
SELECT cron.schedule(
  'daily_retention_purge',
  '30 3 * * *',
  $$
  DELETE FROM "ProductEvent"
  WHERE "occurredAt" < NOW() - INTERVAL '12 months';

  DELETE FROM "AdminJob"
  WHERE "kind" = 'EXPORT' AND "runAfter" < NOW() - INTERVAL '7 days';
  $$
);
