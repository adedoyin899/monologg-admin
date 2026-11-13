"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Activity,
  ChevronRight,
  Eye,
  RefreshCw,
  Lock,
} from "lucide-react";
import {
  adminClient,
  type AdminAuditLogItem,
  type AdminRole,
} from "@/lib/admin-client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/Card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { Dialog } from "@/components/ui/Dialog";
import { Toast } from "@/components/ui/Toast";

const ACTION_OPTIONS = [
  "ALL",
  "USER_VIEWED",
  "PII_REVEALED",
  "CHAT_VIEWED",
  "MEDIA_VIEWED",
  "ALERT_ACK",
  "ALERT_RESOLVED",
  "CSV_EXPORT_REQUESTED",
  "EXPORT_DOWNLOADED",
  "ADMIN_SIGNIN",
  "ADMIN_INVITE",
  "ADMIN_ROLE_CHANGE",
  "ADMIN_DISABLED",
  "TICKET_REPLY",
  "DISPUTE_RESOLVED",
];

const TARGET_TYPES = [
  "ALL",
  "User",
  "Booking",
  "Payment",
  "Dispute",
  "SupportTicket",
  "VerificationRecording",
  "AlertEvent",
  "ExportJob",
  "AdminUser",
];

export default function AuditLogPage() {
  const { data: authData } = useAuth();
  const currentRole = authData?.admin?.role as AdminRole;

  const [logs, setLogs] = useState<AdminAuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [targetTypeFilter, setTargetTypeFilter] = useState("ALL");
  const [targetIdQuery, setTargetIdQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLog, setSelectedLog] = useState<AdminAuditLogItem | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const isPermitted = currentRole === "SUPER_ADMIN" || currentRole === "COMPLIANCE";

  const fetchLogs = useCallback(async () => {
    if (!isPermitted) return;
    try {
      setLoading(true);
      const res = await adminClient.getAuditLogs({
        action: actionFilter,
        targetType: targetTypeFilter,
        targetId: targetIdQuery.trim() || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        limit: 50,
      });
      setLogs(res.logs);
      setTotalCount(res.total);
    } catch (err: any) {
      setToast({
        type: "error",
        message: err.message || "Failed to load audit logs",
      });
    } finally {
      setLoading(false);
    }
  }, [isPermitted, actionFilter, targetTypeFilter, targetIdQuery, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExportAudit = async () => {
    try {
      setIsExporting(true);
      await adminClient.createExport("audit", "Compliance audit trail download");
      setToast({
        type: "success",
        message: "Audit trail export queued. Check the Data Exports page shortly.",
      });
    } catch (err: any) {
      setToast({
        type: "error",
        message: err.message || "Failed to trigger export",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!isPermitted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
        <div className="rounded-full bg-red-100 p-4 text-red-600 dark:bg-red-950/40 dark:text-red-400">
          <Lock className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Access Restricted: Audit Trail
        </h2>
        <p className="max-w-md text-sm text-neutral-500 dark:text-neutral-400">
          In compliance with PRD Module M1, access to the immutable system audit trail is
          strictly reserved for <strong>SUPER_ADMIN</strong> and <strong>COMPLIANCE</strong> roles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Audit Trail Log
            </h1>
            <span className="font-mono text-xs font-semibold uppercase text-monologg-red dark:text-[#FF5C5E]">
              AD-29
            </span>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Immutable, append-only security log of staff actions, PII reveals, chat views and sensitive mutations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleExportAudit}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-lg bg-monologg-red px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-monologg-red focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              Target Type
            </label>
            <select
              value={targetTypeFilter}
              onChange={(e) => setTargetTypeFilter(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-monologg-red focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
            >
              {TARGET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              Target ID
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="e.g. usr-123, bk-456"
                value={targetIdQuery}
                onChange={(e) => setTargetIdQuery(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-monologg-red focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-monologg-red focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-monologg-red focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
            />
          </div>
        </div>
      </Card>

      {/* Table & Mobile Cards */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-[#242424] flex flex-wrap gap-2 justify-between items-center">
          <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider tabular-nums">
            Displaying {logs.length} of {totalCount} Recorded Events
          </span>
          <span className="text-xs text-neutral-600 dark:text-neutral-400">
            Retention: Permanent &middot; Direct Postgres Trigger Protected
          </span>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-neutral-600 dark:text-neutral-400">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            Loading audit events...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-sm text-neutral-600 dark:text-neutral-400">
            No audit records match the selected criteria.
          </div>
        ) : (
          <>
            {/* Mobile & Tablet Audit Cards */}
            <div className="lg:hidden divide-y divide-neutral-200 dark:divide-[#242424]">
              {logs.map((log) => (
                <div key={log.id} className="p-4 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 font-medium text-neutral-900 dark:bg-[#202020] dark:text-neutral-100 font-mono break-all">
                      {log.action}
                    </span>
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-semibold text-monologg-red dark:text-[#FF5C5E] hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                  </div>
                  <div className="font-medium text-neutral-900 dark:text-neutral-100">
                    {log.adminEmail || log.adminId}{" "}
                    {log.adminRole && (
                      <span className="text-neutral-600 dark:text-neutral-400 font-normal">
                        ({log.adminRole})
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-neutral-700 dark:text-neutral-300 truncate">
                    Target: {log.targetType ? `${log.targetType}: ${log.targetId || "-"}` : "-"}
                  </div>
                  {log.reason && (
                    <p className="text-neutral-600 dark:text-neutral-400 line-clamp-2">{log.reason}</p>
                  )}
                  <div className="font-mono text-[11px] text-neutral-600 dark:text-neutral-400 tabular-nums">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Audit Table */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Reason / Notes</TableHead>
                    <TableHead>IP Hash</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-neutral-50 dark:hover:bg-[#1A1A1A]">
                      <TableCell className="font-mono text-[11px] tabular-nums text-neutral-600 dark:text-neutral-400 max-w-[115px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-[155px]">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100 text-xs truncate">
                          {log.adminEmail || log.adminId}
                        </div>
                        {log.adminRole && (
                          <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                            {log.adminRole}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-900 dark:bg-[#202020] dark:text-neutral-100 font-mono">
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[130px]">
                        <div className="text-xs text-neutral-700 dark:text-neutral-300 font-mono truncate">
                          {log.targetType ? `${log.targetType}: ${log.targetId || "-"}` : "-"}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-xs text-neutral-600 dark:text-neutral-400">
                        {log.reason || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
                        {log.ipHash ? `${log.ipHash.slice(0, 10)}...` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-monologg-red dark:text-[#FF5C5E] hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      {/* Detail Modal */}
      {selectedLog && (
        <Dialog
          open={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title={`Audit Event: ${selectedLog.action}`}
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-neutral-500">Event ID:</span>
                <p className="font-mono text-neutral-800 dark:text-neutral-200">{selectedLog.id}</p>
              </div>
              <div>
                <span className="text-neutral-500">Timestamp:</span>
                <p className="text-neutral-800 dark:text-neutral-200">
                  {new Date(selectedLog.createdAt).toISOString()}
                </p>
              </div>
              <div>
                <span className="text-neutral-500">Admin Actor:</span>
                <p className="font-medium text-neutral-800 dark:text-neutral-200">
                  {selectedLog.adminEmail || selectedLog.adminId} ({selectedLog.adminRole || "N/A"})
                </p>
              </div>
              <div>
                <span className="text-neutral-500">IP Hash (SHA-256):</span>
                <p className="font-mono text-neutral-800 dark:text-neutral-200">
                  {selectedLog.ipHash || "None recorded"}
                </p>
              </div>
            </div>

            <div>
              <span className="text-xs text-neutral-500">Reason / Justification:</span>
              <p className="mt-1 rounded bg-neutral-100 p-2 text-xs text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                {selectedLog.reason || "No explicit reason provided."}
              </p>
            </div>

            <div>
              <span className="text-xs text-neutral-500">Event Metadata:</span>
              <pre className="mt-1 max-h-48 overflow-auto rounded bg-neutral-900 p-3 font-mono text-xs text-neutral-100">
                {JSON.stringify(selectedLog.metadata, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-md border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Close
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
