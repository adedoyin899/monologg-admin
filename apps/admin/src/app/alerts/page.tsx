"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  adminClient,
  type AlertEventItem,
  type AlertListResponse,
} from "@/lib/admin-client";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  Search,
  Check,
  X,
  FileText,
  UserCheck,
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

  // Resolution modal state
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [submittingResolve, setSubmittingResolve] = useState(false);

  const fetchAlerts = () => {
    setLoading(true);
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
      fetchAlerts();
    } catch (e: any) {
      alert(`Could not acknowledge alert: ${e.message}`);
    }
  };

  const handleResolveSubmit = async () => {
    if (!resolvingId || !resolveNote.trim()) return;
    try {
      setSubmittingResolve(true);
      await adminClient.resolveAlert(resolvingId, resolveNote.trim());
      setResolvingId(null);
      setResolveNote("");
      fetchAlerts();
    } catch (e: any) {
      alert(`Could not resolve alert: ${e.message}`);
    } finally {
      setSubmittingResolve(false);
    }
  };

  const handleTriggerEvaluation = async () => {
    try {
      setEvaluating(true);
      const res = await adminClient.triggerAlertsEvaluation();
      alert(`Alert evaluation complete: ${res.triggered} active, ${res.autoResolved} auto-resolved.`);
      fetchAlerts();
    } catch (e: any) {
      alert(`Failed to trigger evaluation: ${e.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-12 text-center text-gray-400 animate-pulse">
        Loading system alerts...
      </div>
    );
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-rose-100 text-rose-800 border-rose-200 font-bold";
      case "WARNING":
        return "bg-amber-100 text-amber-800 border-amber-200 font-semibold";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200 font-medium";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "ACKNOWLEDGED":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "RESOLVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Alerts Console</h1>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-purple-100 text-purple-700 font-semibold">
              AD-27
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Real-time automated incident detection, threshold monitoring, and operational SLA tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerEvaluation}
            disabled={evaluating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${evaluating ? "animate-spin" : ""}`} />
            {evaluating ? "Checking..." : "Trigger Rule Check"}
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs font-semibold text-gray-500 uppercase">Open Incidents</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data.openCount}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Awaiting resolution</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm bg-rose-50/20">
            <span className="text-xs font-semibold text-rose-700 uppercase flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Critical
            </span>
            <p className="text-2xl font-bold text-rose-700 mt-1">{data.criticalCount}</p>
            <p className="text-[11px] text-rose-500 mt-0.5">Immediate attention</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm bg-amber-50/20">
            <span className="text-xs font-semibold text-amber-700 uppercase flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Warnings
            </span>
            <p className="text-2xl font-bold text-amber-700 mt-1">{data.warningCount}</p>
            <p className="text-[11px] text-amber-500 mt-0.5">SLA / queue stalls</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs font-semibold text-blue-700 uppercase flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Informational
            </span>
            <p className="text-2xl font-bold text-blue-700 mt-1">{data.infoCount}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">System activity notices</p>
          </div>
        </div>
      )}

      {/* Filters Strip */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-500 uppercase">Status:</span>
          <div className="flex gap-1">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                onClick={() => handleFilterChange("status", s.id)}
                className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                  currentStatus === s.id
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-4 w-px bg-gray-200 hidden sm:block" />

        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-500 uppercase">Severity:</span>
          <div className="flex gap-1">
            {SEVERITIES.map((s) => (
              <button
                key={s.id}
                onClick={() => handleFilterChange("severity", s.id)}
                className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                  currentSeverity === s.id
                    ? "bg-gray-900 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts Table/List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {data?.alerts.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-semibold text-gray-700">No alerts matching filter criteria</p>
            <p className="text-xs">All monitored services and queues operating within normal parameters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data?.alerts.map((alert) => (
              <div key={alert.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${getSeverityBadge(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${getStatusBadge(alert.status)} font-semibold`}>
                        {alert.status}
                      </span>
                      <span className="font-mono text-xs font-bold text-gray-900">
                        {alert.ruleKey}
                      </span>
                      {alert.subjectType && (
                        <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                          {alert.subjectType}:{alert.subjectId}
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-gray-800">
                      {alert.detail.message || "Alert condition met"}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-1">
                      <span>First seen: {alert.firstSeenAt.slice(0, 19).replace("T", " ")}</span>
                      <span>Last seen: {alert.lastSeenAt.slice(0, 19).replace("T", " ")}</span>
                      {alert.resolvedAt && (
                        <span className="text-emerald-700 font-medium">
                          Resolved at: {alert.resolvedAt.slice(0, 19).replace("T", " ")}
                        </span>
                      )}
                      {alert.detail.resolutionNote && (
                        <span className="text-gray-600 italic">
                          Note: "{alert.detail.resolutionNote}"
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Actions: Link to Subject + Ack + Resolve */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    {alert.subjectUrl && (
                      <Link
                        href={alert.subjectUrl}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}

                    {alert.status === "OPEN" && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}

                    {alert.status !== "RESOLVED" && (
                      <button
                        onClick={() => {
                          setResolvingId(alert.id);
                          setResolveNote("");
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 border border-gray-200">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">Resolve Alert</h3>
              <button
                onClick={() => setResolvingId(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              A resolution note is required for the audit trail before closing this incident.
            </p>

            <textarea
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder="Explain the corrective action taken or why this incident is cleared..."
              className="w-full text-xs p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-28"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setResolvingId(null)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveSubmit}
                disabled={submittingResolve || !resolveNote.trim()}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {submittingResolve ? "Resolving..." : "Confirm Resolution"}
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
    <Suspense fallback={<div className="p-12 text-center text-gray-400">Loading alerts console...</div>}>
      <AlertsContent />
    </Suspense>
  );
}
