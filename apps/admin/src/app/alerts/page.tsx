"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  adminClient,
  type AlertListResponse,
} from "@/lib/admin-client";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  X,
} from "lucide-react";

const SEVERITIES = [
  { id: "ALL", label: "All Severities" },
  { id: "CRITICAL", label: "Critical" },
  { id: "WARNING", label: "Warning" },
  { id: "INFO", label: "Info" },
] as const;

const STATUSES = [
  { id: "ALL", label: "All Statuses" },
  { id: "OPEN", label: "Open" },
  { id: "ACKNOWLEDGED", label: "Acknowledged" },
  { id: "RESOLVED", label: "Resolved" },
] as const;

function AlertsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSeverity = searchParams.get("severity") || "ALL";
  const currentStatus = searchParams.get("status") || "OPEN";
  const [data, setData] = useState<AlertListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Resolution modal state
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [submittingResolve, setSubmittingResolve] = useState(false);

  const fetchAlerts = () => {
    setLoading(true);
    setError(null);
    adminClient
      .getAlerts({
        severity: currentSeverity,
        status: currentStatus,
      })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load alerts");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAlerts();
  }, [currentSeverity, currentStatus]);

  const handleFilterChange = (key: "severity" | "status", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/alerts?${params.toString()}`);
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await adminClient.ackAlert(id);
      setFeedback("Alert acknowledged.");
      fetchAlerts();
    } catch (e: any) {
      setError(`Could not acknowledge alert: ${e.message}`);
    }
  };

  const handleResolveSubmit = async () => {
    if (!resolvingId || !resolveNote.trim()) return;
    try {
      setSubmittingResolve(true);
      await adminClient.resolveAlert(resolvingId, resolveNote.trim());
      setResolvingId(null);
      setResolveNote("");
      setFeedback("Alert resolved and recorded in AdminAuditLog.");
      fetchAlerts();
    } catch (e: any) {
      setError(`Could not resolve alert: ${e.message}`);
    } finally {
      setSubmittingResolve(false);
    }
  };

  const handleTriggerEvaluation = async () => {
    try {
      setEvaluating(true);
      const res = await adminClient.triggerAlertsEvaluation();
      setFeedback(`Rule check completed: ${res.triggered} active, ${res.autoResolved} auto-resolved.`);
      fetchAlerts();
    } catch (e: any) {
      setError(`Failed to trigger evaluation: ${e.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-12 text-center text-gray-600 dark:text-gray-400 animate-pulse">
        Loading system alerts...
      </div>
    );
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30 font-bold";
      case "WARNING":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 font-semibold";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30 font-medium";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/25";
      case "ACKNOWLEDGED":
        return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/25";
      case "RESOLVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-[#222222] dark:text-gray-300 dark:border-[#333333]";
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-[#242424]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              System Alerts Console
            </h1>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-monologg-red/10 text-monologg-red dark:text-[#FF5A5C] font-semibold">
              AD-27
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Automated rule detection from AlertEvent (stuck bookings, ledger mismatches, SLA &amp; queue checks).
          </p>
        </div>

        <button
          type="button"
          onClick={handleTriggerEvaluation}
          disabled={evaluating}
          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${evaluating ? "animate-spin" : ""}`} />
          {evaluating ? "Checking..." : "Trigger Rule Check"}
        </button>
      </div>

      {feedback && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {feedback}
          </span>
          <button type="button" onClick={() => setFeedback(null)} className="p-1" aria-label="Dismiss notice">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-xs text-rose-800 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Summary Stat Cards */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-[#141414] p-4 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Open Incidents</span>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 tabular-nums">{data.openCount}</p>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">Awaiting resolution</p>
          </div>

          <div className="bg-rose-50/40 dark:bg-rose-500/10 p-4 rounded-xl border border-rose-200 dark:border-rose-500/30 shadow-sm">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 uppercase flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              Critical
            </span>
            <p className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-1 tabular-nums">{data.criticalCount}</p>
            <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">Immediate attention</p>
          </div>

          <div className="bg-amber-50/40 dark:bg-amber-500/10 p-4 rounded-xl border border-amber-200 dark:border-amber-500/30 shadow-sm">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Warnings
            </span>
            <p className="text-2xl font-bold text-amber-800 dark:text-amber-300 mt-1 tabular-nums">{data.warningCount}</p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">SLA / queue stalls</p>
          </div>

          <div className="bg-white dark:bg-[#141414] p-4 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase flex items-center gap-1">
              <Info className="w-3.5 h-3.5 shrink-0" />
              Informational
            </span>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1 tabular-nums">{data.infoCount}</p>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">System activity notices</p>
          </div>
        </div>
      )}

      {/* Filters Strip (clean wrapping on small mobile screens) */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 bg-white dark:bg-[#141414] p-4 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-gray-600 dark:text-gray-400 uppercase">Status:</span>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleFilterChange("status", s.id)}
                className={`min-h-[36px] px-3 py-1 rounded-lg font-semibold transition-colors ${
                  currentStatus === s.id
                    ? "bg-monologg-red text-white shadow-sm"
                    : "bg-gray-100 dark:bg-[#1F1F1F] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2A2A2A]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px md:h-5 md:w-px bg-gray-200 dark:bg-[#2A2A2A]" />

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-gray-600 dark:text-gray-400 uppercase">Severity:</span>
          <div className="flex flex-wrap gap-1.5">
            {SEVERITIES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleFilterChange("severity", s.id)}
                className={`min-h-[36px] px-3 py-1 rounded-lg font-semibold transition-colors ${
                  currentSeverity === s.id
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm"
                    : "bg-gray-100 dark:bg-[#1F1F1F] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2A2A2A]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm overflow-hidden">
        {data?.alerts.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <p className="font-semibold text-gray-900 dark:text-white">No alerts matching filter criteria</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              All monitored services and queues are operating within configured thresholds.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-[#222222]">
            {data?.alerts.map((alert) => (
              <div key={alert.id} className="p-4 sm:p-5 hover:bg-gray-50/70 dark:hover:bg-[#1A1A1A] transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] border ${getSeverityBadge(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[11px] border ${getStatusBadge(alert.status)} font-semibold`}>
                        {alert.status}
                      </span>
                      <span className="font-mono text-xs font-bold text-gray-900 dark:text-white break-all">
                        {alert.ruleKey}
                      </span>
                      {alert.subjectType && (
                        <span className="text-[11px] text-gray-700 dark:text-gray-300 font-mono bg-gray-100 dark:bg-[#222222] px-2 py-0.5 rounded break-all">
                          {alert.subjectType}:{alert.subjectId}
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {alert.detail.message || "Alert condition met"}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400 pt-0.5">
                      <span>First seen: {alert.firstSeenAt.slice(0, 19).replace("T", " ")}</span>
                      <span>Last seen: {alert.lastSeenAt.slice(0, 19).replace("T", " ")}</span>
                      {alert.resolvedAt && (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          Resolved: {alert.resolvedAt.slice(0, 19).replace("T", " ")}
                        </span>
                      )}
                      {alert.detail.resolutionNote && (
                        <span className="text-gray-700 dark:text-gray-300 italic">
                          Note: &ldquo;{alert.detail.resolutionNote}&rdquo;
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {alert.subjectUrl && (
                      <Link
                        href={alert.subjectUrl}
                        className="inline-flex min-h-[38px] items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-[#202020] hover:bg-gray-200 dark:hover:bg-[#2A2A2A] text-gray-800 dark:text-gray-200 transition-colors"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    {alert.status === "OPEN" && (
                      <button
                        type="button"
                        onClick={() => handleAcknowledge(alert.id)}
                        className="min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/25 border border-amber-200 dark:border-amber-500/30 transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}

                    {alert.status !== "RESOLVED" && (
                      <button
                        type="button"
                        onClick={() => {
                          setResolvingId(alert.id);
                          setResolveNote("");
                        }}
                        className="min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 border border-emerald-200 dark:border-emerald-500/30 transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolution Note Modal */}
      {resolvingId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141414] rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 border border-gray-200 dark:border-[#242424]">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-[#242424]">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Resolve Alert</h3>
              <button
                type="button"
                aria-label="Close resolve modal"
                onClick={() => setResolvingId(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400">
              A resolution note is required for the immutable AdminAuditLog before closing this alert.
            </p>

            <textarea
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder="Explain the corrective action taken or why this alert cleared..."
              className="w-full text-xs p-3 border border-gray-300 dark:border-[#333333] bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-monologg-red h-28"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200 dark:border-[#242424]">
              <button
                type="button"
                onClick={() => setResolvingId(null)}
                className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolveSubmit}
                disabled={submittingResolve || !resolveNote.trim()}
                className="min-h-[38px] px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
              >
                {submittingResolve ? "Saving..." : "Confirm Resolution"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AlertsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-600 dark:text-gray-400">Loading alerts console...</div>}>
      <AlertsContent />
    </Suspense>
  );
}
