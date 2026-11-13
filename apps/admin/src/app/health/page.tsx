"use client";

import { useEffect, useState, Suspense } from "react";
import {
  adminClient,
  type SystemHealthResponse,
} from "@/lib/admin-client";
import {
  Activity,
  Database,
  HardDrive,
  ExternalLink,
  RefreshCw,
  Layers,
  Webhook,
} from "lucide-react";

function SystemHealthContent() {
  const [data, setData] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = () => {
    setRefreshing(true);
    setError(null);
    adminClient
      .getSystemHealth()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load system health");
        setLoading(false);
      })
      .finally(() => {
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  if (loading && !data) {
    return (
      <div className="p-12 text-center text-gray-600 dark:text-gray-400 animate-pulse">
        Polling infrastructure telemetry and scheduled jobs...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-500/30">
        <p className="font-semibold">Error loading system health metrics</p>
        <p className="text-sm mt-1">{error || "No data returned"}</p>
      </div>
    );
  }

  const { database, storage, jobs, adminQueue, materializedViews, webhooks, api, externalServices } = data;

  const jobStatusBadge = (status: string | null) => {
    if (status === "DONE") {
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300";
    }
    if (status === "FAILED") {
      return "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300";
    }
    return "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300";
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-[#242424]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              System Health &amp; Infrastructure
            </h1>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-monologg-red/10 text-monologg-red dark:text-[#FF5A5C] font-semibold">
              AD-28
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            {data.dataFreshness} &bull; Materialized view freshness: {materializedViews.freshnessMinutes}m ago
          </p>
        </div>

        <button
          type="button"
          onClick={fetchHealth}
          disabled={refreshing}
          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 shadow-sm transition-colors disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh Status"}
        </button>
      </div>

      {/* Resource Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Database Capacity */}
        <div className="bg-white dark:bg-[#141414] p-5 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm">
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 dark:border-[#222222]">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-monologg-red" />
              <span className="font-semibold text-xs uppercase text-gray-700 dark:text-gray-300">Database Size</span>
            </div>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded tabular-nums ${
                database.usagePct >= 80
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
              }`}
            >
              {database.usagePct}%
            </span>
          </div>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-3 font-mono tabular-nums">
            {database.sizeFormatted}
          </p>
          <div className="w-full bg-gray-100 dark:bg-[#222222] h-2 rounded-full overflow-hidden mt-2.5">
            <div
              className={`h-full rounded-full ${database.usagePct >= 80 ? "bg-rose-600" : "bg-monologg-red"}`}
              style={{ width: `${Math.min(100, database.usagePct)}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            Plan limit: {(database.limitBytes / (1024 * 1024)).toFixed(0)} MB (alerts at 80%)
          </p>
        </div>

        {/* R2 Object Storage */}
        <div className="bg-white dark:bg-[#141414] p-5 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm">
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 dark:border-[#222222]">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-xs uppercase text-gray-700 dark:text-gray-300">R2 Storage</span>
            </div>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded tabular-nums ${
                storage.usagePct >= 80
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
              }`}
            >
              {storage.usagePct}%
            </span>
          </div>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-3 font-mono tabular-nums">
            {storage.r2SizeFormatted}
          </p>
          <div className="w-full bg-gray-100 dark:bg-[#222222] h-2 rounded-full overflow-hidden mt-2.5">
            <div
              className={`h-full rounded-full ${storage.usagePct >= 80 ? "bg-rose-600" : "bg-blue-600"}`}
              style={{ width: `${Math.min(100, storage.usagePct)}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            Configured cap: {(storage.limitBytes / (1024 * 1024 * 1024)).toFixed(0)} GB (alerts at 80%)
          </p>
        </div>

        {/* API Error Rate */}
        <div className="bg-white dark:bg-[#141414] p-5 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm">
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 dark:border-[#222222]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-xs uppercase text-gray-700 dark:text-gray-300">API Error Rate</span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {api.errorRatePct}%
            </span>
          </div>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-3 font-mono tabular-nums">
            {api.latencyMsMedian} ms
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            Median response &bull; {api.total5xxEvents} <code className="font-mono">api_error</code> 5xx events (24h)
          </p>
        </div>

        {/* AdminJob Queue Depth */}
        <div className="bg-white dark:bg-[#141414] p-5 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm">
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 dark:border-[#222222]">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="font-semibold text-xs uppercase text-gray-700 dark:text-gray-300">Admin Queue</span>
            </div>
            <span className="text-xs font-mono font-bold text-gray-800 dark:text-gray-200 tabular-nums">
              {adminQueue.depth} Active
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white font-mono tabular-nums">
              {adminQueue.pendingCount}
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">pending jobs</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            {adminQueue.oldestWaitingAgeMinutes !== null
              ? `Oldest waiting: ${adminQueue.oldestWaitingAgeMinutes}m (${adminQueue.failedCount} failed)`
              : `Queue clear (${adminQueue.failedCount} failed)`}
          </p>
        </div>
      </div>

      {/* Scheduled Jobs Status (Responsive cards on mobile, table on md+) */}
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-[#242424]">
          <h3 className="font-bold text-base text-gray-900 dark:text-white">Scheduled Jobs Status (JobRun)</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            Lease-locked background jobs running inside <code className="font-mono">POST /api/v1/cron/admin-tick</code>.
          </p>
        </div>

        {/* Mobile Cards */}
        <div className="divide-y divide-gray-200 dark:divide-[#222222] lg:hidden">
          {jobs.length === 0 ? (
            <p className="p-6 text-center text-xs text-gray-600 dark:text-gray-400">
              No scheduled job runs recorded yet.
            </p>
          ) : (
            jobs.map((j) => (
              <div key={j.jobKey} className="p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-gray-900 dark:text-white">{j.jobKey}</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${jobStatusBadge(j.lastStatus)}`}>
                    {j.lastStatus || "PENDING"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400 font-mono text-[11px]">
                  <div>
                    <span className="block text-gray-600 dark:text-gray-400">Last Started</span>
                    <span className="text-gray-900 dark:text-gray-200">{j.lastStartedAt ? j.lastStartedAt.slice(0, 19).replace("T", " ") : "—"}</span>
                  </div>
                  <div>
                    <span className="block text-gray-600 dark:text-gray-400">Duration</span>
                    <span className="text-gray-900 dark:text-gray-200">{j.durationMs !== null ? `${j.durationMs}ms` : "—"}</span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 font-mono">
                  Next due: {j.nextDueAt ? j.nextDueAt.slice(0, 19).replace("T", " ") : "Pending schedule"}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-[#242424] text-xs tabular-nums">
            <thead className="bg-gray-50 dark:bg-[#181818] text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left">Job Identifier</th>
                <th className="px-5 py-3 text-center">Last Status</th>
                <th className="px-5 py-3 text-left">Last Started</th>
                <th className="px-5 py-3 text-left">Last Finished</th>
                <th className="px-5 py-3 text-right">Duration</th>
                <th className="px-5 py-3 text-left">Next Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#222222]">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-600 dark:text-gray-400">
                    No scheduled job runs recorded yet.
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr key={j.jobKey} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A]">
                    <td className="px-5 py-3 font-semibold text-gray-900 dark:text-white font-mono">
                      {j.jobKey}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${jobStatusBadge(j.lastStatus)}`}>
                        {j.lastStatus || "PENDING"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-300 font-mono">
                      {j.lastStartedAt ? j.lastStartedAt.slice(0, 19).replace("T", " ") : "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-300 font-mono">
                      {j.lastFinishedAt ? j.lastFinishedAt.slice(0, 19).replace("T", " ") : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-800 dark:text-gray-200">
                      {j.durationMs !== null ? `${j.durationMs}ms` : "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-300 font-mono">
                      {j.nextDueAt ? j.nextDueAt.slice(0, 19).replace("T", " ") : "Pending schedule"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Database Tables & Provider Webhook Outcomes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-[#242424] mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-monologg-red" />
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">Top Database Tables by Size</h3>
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Rows / Storage</span>
          </div>

          <div className="space-y-1.5">
            {database.topTables.map((t) => (
              <div
                key={t.tableName}
                className="flex flex-wrap justify-between items-center gap-2 py-2 text-xs border-b border-gray-100 dark:border-[#202020] last:border-0"
              >
                <span className="font-mono text-gray-800 dark:text-gray-200 font-medium">{t.tableName}</span>
                <div className="flex items-center gap-4 tabular-nums">
                  <span className="text-gray-600 dark:text-gray-400">{t.rowCount.toLocaleString()} rows</span>
                  <span className="font-semibold text-gray-900 dark:text-white font-mono min-w-[4rem] text-right">
                    {t.sizeFormatted || "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-[#242424] mb-3">
            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">Provider Webhook Health</h3>
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400">24h Outcomes</span>
          </div>

          <div className="space-y-3">
            {webhooks.map((w) => (
              <div
                key={w.provider}
                className="p-3.5 rounded-lg border border-gray-200 dark:border-[#262626] bg-gray-50 dark:bg-[#191919] flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-gray-900 dark:text-white">{w.provider}</span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                        w.failureCount === 0
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                      }`}
                    >
                      {w.failureCount === 0 ? "Healthy" : "Degraded"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Last webhook: {w.lastWebhookAt ? w.lastWebhookAt.slice(0, 19).replace("T", " ") : "None"}
                  </p>
                </div>
                <div className="text-right text-xs tabular-nums">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">{w.successCount} ok</span>
                  {w.failureCount > 0 && (
                    <span className="text-rose-700 dark:text-rose-400 font-bold ml-2">{w.failureCount} failed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Infrastructure Consoles */}
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm p-5 sm:p-6">
        <h3 className="font-bold text-base text-gray-900 dark:text-white mb-1">
          Infrastructure Consoles &amp; Deep Links
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
          External dashboards for database pooling, edge deployments, object storage, and error traces.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {externalServices.map((srv) => (
            <a
              key={srv.name}
              href={srv.consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-xl border border-gray-200 dark:border-[#262626] bg-gray-50/50 dark:bg-[#181818] hover:border-monologg-red/40 hover:bg-monologg-red/5 dark:hover:bg-monologg-red/10 transition-all group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-xs text-gray-900 dark:text-white group-hover:text-monologg-red dark:group-hover:text-[#FF5A5C]">
                  {srv.name}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 group-hover:text-monologg-red dark:group-hover:text-[#FF5A5C]" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5">{srv.description}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SystemHealthPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-600 dark:text-gray-400">Loading system health...</div>}>
      <SystemHealthContent />
    </Suspense>
  );
}
