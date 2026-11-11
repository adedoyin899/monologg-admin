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
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Server,
  Layers,
  Webhook,
  ShieldCheck,
} from "lucide-react";

function SystemHealthContent() {
  const [data, setData] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = () => {
    setRefreshing(true);
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
      <div className="p-12 text-center text-gray-400 animate-pulse">
        Polling infrastructure telemetry and scheduled jobs...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200">
        <p className="font-semibold">Error loading system health metrics</p>
        <p className="text-sm mt-1">{error || "No data returned"}</p>
      </div>
    );
  }

  const { database, storage, jobs, adminQueue, materializedViews, webhooks, api, externalServices } = data;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Health & Infrastructure</h1>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-purple-100 text-purple-700 font-semibold">
              AD-28
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {data.dataFreshness} • Materialized view freshness: {materializedViews.freshnessMinutes}m ago
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 shadow-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh Status"}
        </button>
      </div>

      {/* Resource Gauges (Database & R2 Storage with 80% Thresholds) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Database Capacity */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-600" />
              <span className="font-bold text-xs uppercase text-gray-700">Database Size</span>
            </div>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
              database.usagePct >= 80 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
            }`}>
              {database.usagePct}%
            </span>
          </div>
          <p className="text-2xl font-extrabold text-gray-900 mt-3">{database.sizeFormatted}</p>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full ${database.usagePct >= 80 ? "bg-rose-600" : "bg-purple-600"}`}
              style={{ width: `${Math.min(100, database.usagePct)}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            Plan limit: {(database.limitBytes / (1024 * 1024)).toFixed(0)} MB
          </p>
        </div>

        {/* R2 Object Storage */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-xs uppercase text-gray-700">R2 Storage</span>
            </div>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
              storage.usagePct >= 80 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
            }`}>
              {storage.usagePct}%
            </span>
          </div>
          <p className="text-2xl font-extrabold text-gray-900 mt-3">{storage.r2SizeFormatted}</p>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full ${storage.usagePct >= 80 ? "bg-rose-600" : "bg-blue-600"}`}
              style={{ width: `${Math.min(100, storage.usagePct)}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            Configured cap: {(storage.limitBytes / (1024 * 1024 * 1024)).toFixed(0)} GB
          </p>
        </div>

        {/* API Error Rate */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-xs uppercase text-gray-700">API Error Rate</span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700">
              {api.errorRatePct}%
            </span>
          </div>
          <p className="text-2xl font-extrabold text-gray-900 mt-3">{api.latencyMsMedian} ms</p>
          <p className="text-[11px] text-gray-500 mt-2">
            Median latency • {api.total5xxEvents} 5xx server errors in 24h
          </p>
        </div>

        {/* AdminJob Queue Depth */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <span className="font-bold text-xs uppercase text-gray-700">Admin Queue</span>
            </div>
            <span className="text-xs font-mono font-bold text-gray-700">
              {adminQueue.depth} Active
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-2xl font-extrabold text-gray-900">{adminQueue.pendingCount}</span>
            <span className="text-xs text-gray-500">pending</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            {adminQueue.oldestWaitingAgeMinutes !== null
              ? `Oldest waiting: ${adminQueue.oldestWaitingAgeMinutes}m`
              : "Queue is empty"}
          </p>
        </div>
      </div>

      {/* Scheduled Jobs Status Table (from JobRun) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-gray-900">Scheduled Jobs Status (JobRun)</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Automated crons executed via the 5-minute admin tick with lease locks and budget protection.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left">Job Identifier</th>
                <th className="px-5 py-3 text-center">Last Status</th>
                <th className="px-5 py-3 text-left">Last Started</th>
                <th className="px-5 py-3 text-left">Last Finished</th>
                <th className="px-5 py-3 text-right">Duration</th>
                <th className="px-5 py-3 text-left">Next Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    No scheduled job runs recorded yet. Crons trigger on first tick.
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr key={j.jobKey} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-semibold text-gray-900 font-mono">
                      {j.jobKey}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        j.lastStatus === "DONE"
                          ? "bg-emerald-100 text-emerald-800"
                          : j.lastStatus === "FAILED"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-purple-100 text-purple-800"
                      }`}>
                        {j.lastStatus || "PENDING"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600 font-mono">
                      {j.lastStartedAt ? j.lastStartedAt.slice(0, 19).replace("T", " ") : "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-600 font-mono">
                      {j.lastFinishedAt ? j.lastFinishedAt.slice(0, 19).replace("T", " ") : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-700">
                      {j.durationMs !== null ? `${j.durationMs}ms` : "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-600 font-mono">
                      {j.nextDueAt ? j.nextDueAt.slice(0, 19).replace("T", " ") : "Pending schedule"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Top Database Tables & Recent Webhook Outcomes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Database Tables */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-600" />
              <h3 className="font-bold text-sm text-gray-900">Top Database Tables by Size</h3>
            </div>
            <span className="text-xs text-gray-400">Rows / Storage</span>
          </div>

          <div className="space-y-2">
            {database.topTables.map((t) => (
              <div key={t.tableName} className="flex justify-between items-center py-1.5 text-xs border-b border-gray-50">
                <span className="font-mono text-gray-800 font-medium">{t.tableName}</span>
                <div className="flex items-center gap-4">
                  <span className="text-gray-500">{t.rowCount.toLocaleString()} rows</span>
                  <span className="font-semibold text-gray-900 font-mono w-16 text-right">
                    {t.sizeFormatted || "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Webhook Outcomes */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-gray-900">Provider Webhook Health</h3>
            </div>
            <span className="text-xs text-gray-400">Status</span>
          </div>

          <div className="space-y-3">
            {webhooks.map((w) => (
              <div key={w.provider} className="p-3 rounded-lg border border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-gray-900">{w.provider}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                      Healthy
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Last webhook: {w.lastWebhookAt ? w.lastWebhookAt.slice(0, 19).replace("T", " ") : "None"}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <span className="text-emerald-700 font-bold">{w.successCount} ok</span>
                  {w.failureCount > 0 && (
                    <span className="text-rose-700 font-bold ml-2">{w.failureCount} failed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* External Observability & Cloud Provider Links */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-bold text-base text-gray-900 mb-1">Infrastructure Consoles & Deep Links</h3>
        <p className="text-xs text-gray-500 mb-4">
          Direct navigation to external dashboards for logs, traces, database pooling, and DNS management.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {externalServices.map((srv) => (
            <a
              key={srv.name}
              href={srv.consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/30 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-gray-900 group-hover:text-purple-900">
                  {srv.name}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-purple-600" />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">{srv.description}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SystemHealthPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-400">Loading system health console...</div>}>
      <SystemHealthContent />
    </Suspense>
  );
}
