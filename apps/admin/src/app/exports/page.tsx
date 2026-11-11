"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Download,
  FileSpreadsheet,
  Clock,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Lock,
  PlusCircle,
  ExternalLink,
} from "lucide-react";
import {
  adminClient,
  type AdminExportJobItem,
  type ExportType,
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

const EXPORT_TYPES_CONFIG: Array<{
  type: ExportType;
  label: string;
  description: string;
  allowedRoles: AdminRole[];
}> = [
  {
    type: "users",
    label: "Users & Profiles",
    description: "Export all client and creator records with metadata, cohorts and status.",
    allowedRoles: ["SUPER_ADMIN", "OPS", "SUPPORT", "COMPLIANCE"],
  },
  {
    type: "bookings",
    label: "Bookings & Orders",
    description: "All historical and active bookings, currencies, stored fee breakdowns and state.",
    allowedRoles: ["SUPER_ADMIN", "OPS", "FINANCE"],
  },
  {
    type: "payments",
    label: "Payments & Escrow",
    description: "Gateway transactions, held escrows, amounts, provider reference codes.",
    allowedRoles: ["SUPER_ADMIN", "FINANCE"],
  },
  {
    type: "withdrawals",
    label: "Withdrawal Requests",
    description: "Creator bank payouts, OTP status, bank verification and processing states.",
    allowedRoles: ["SUPER_ADMIN", "FINANCE", "OPS"],
  },
  {
    type: "tickets",
    label: "Support Tickets",
    description: "User tickets, SLA breach flags, priority levels, categories and resolutions.",
    allowedRoles: ["SUPER_ADMIN", "SUPPORT", "OPS"],
  },
  {
    type: "funnels",
    label: "Product & Funnel Events",
    description: "Raw anonymized ProductEvents for onboarding and booking step analyses.",
    allowedRoles: ["SUPER_ADMIN", "OPS"],
  },
  {
    type: "audit",
    label: "Security Audit Trail",
    description: "Immutable admin action log for compliance and external security reviews.",
    allowedRoles: ["SUPER_ADMIN", "COMPLIANCE"],
  },
];

export default function ExportsPage() {
  const { data: authData } = useAuth();
  const currentRole = (authData?.admin?.role || "VIEWER") as AdminRole;

  const [exportsList, setExportsList] = useState<AdminExportJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ExportType>("users");
  const [reason, setReason] = useState("");
  const [unmaskPii, setUnmaskPii] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const canExport = currentRole !== "VIEWER";
  const canUnmask = ["SUPER_ADMIN", "OPS", "COMPLIANCE"].includes(currentRole);

  const fetchExports = useCallback(async () => {
    if (!canExport) return;
    try {
      setLoading(true);
      const res = await adminClient.getExports();
      setExportsList(res.exports);
    } catch (err: any) {
      setToast({
        type: "error",
        message: err.message || "Failed to load exports history",
      });
    } finally {
      setLoading(false);
    }
  }, [canExport]);

  useEffect(() => {
    fetchExports();
  }, [fetchExports]);

  const handleOpenExportModal = (type: ExportType) => {
    setSelectedType(type);
    setReason("");
    setUnmaskPii(false);
    setModalOpen(true);
  };

  const handleCreateExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || reason.trim().length < 5) {
      setToast({
        type: "error",
        message: "Please provide a valid business justification reason (minimum 5 characters).",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await adminClient.createExport(selectedType, reason.trim(), unmaskPii);
      setToast({
        type: "success",
        message: res.message || "Export queued successfully.",
      });
      setModalOpen(false);
      fetchExports();
    } catch (err: any) {
      setToast({
        type: "error",
        message: err.message || "Failed to queue export",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canExport) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
        <div className="rounded-full bg-red-100 p-4 text-red-600 dark:bg-red-950/40 dark:text-red-400">
          <Lock className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Exports Restricted: VIEWER Role
        </h2>
        <p className="max-w-md text-sm text-neutral-500 dark:text-neutral-400">
          In compliance with PRD Module M12, <strong>VIEWER</strong> accounts have read-only
          dashboard access and cannot initiate or download raw CSV data exports.
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
              Data Exports
            </h1>
            <span className="font-mono text-xs font-semibold uppercase text-monologg-red">
              AD-30
            </span>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Role-gated CSV data exports with row caps, 24-hour signed URLs and complete audit tracking.
          </p>
        </div>

        <button
          onClick={() => fetchExports()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Governance & Policy Banner */}
      <Card className="border-l-4 border-l-monologg-red p-4 bg-red-50/50 dark:bg-red-950/10">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-monologg-red shrink-0 mt-0.5" />
          <div className="text-xs space-y-1 text-neutral-700 dark:text-neutral-300">
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">
              Export Security & Governance Safeguards (PRD Module M12.1):
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-neutral-600 dark:text-neutral-400">
              <li><strong>Row Cap:</strong> 50,000 rows maximum per export job to protect database performance.</li>
              <li><strong>PII Masking:</strong> PII is masked by default unless requested with explicit justification by an authorized role.</li>
              <li><strong>Delivery:</strong> Delivered via private 24-hour signed URLs. All file archives are purged after 7 days.</li>
              <li><strong>Audit Logging:</strong> Every export request and download is recorded in the permanent audit trail.</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Export Categories Grid */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
          Available Export Datasets
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXPORT_TYPES_CONFIG.map((cfg) => {
            const isRoleAllowed = cfg.allowedRoles.includes(currentRole);
            return (
              <Card
                key={cfg.type}
                className={`p-4 flex flex-col justify-between transition ${
                  isRoleAllowed
                    ? "hover:border-neutral-400 dark:hover:border-neutral-600"
                    : "opacity-60 bg-neutral-50 dark:bg-neutral-900/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                      {cfg.label}
                    </span>
                    <span className="font-mono text-[10px] uppercase font-bold text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                      {cfg.type}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                    {cfg.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <span className="text-[10px] text-neutral-400">
                    Roles: {cfg.allowedRoles.join(", ")}
                  </span>
                  <button
                    onClick={() => handleOpenExportModal(cfg.type)}
                    disabled={!isRoleAllowed}
                    className="flex items-center gap-1 text-xs font-semibold text-monologg-red hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Configure
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Export History Table */}
      <Card>
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Recent Export Jobs History ({exportsList.length})
          </span>
          <span className="text-xs text-neutral-400">
            Files expire after 24 hours &middot; Lifecycle purge after 7 days
          </span>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-neutral-500">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            Loading export history...
          </div>
        ) : exportsList.length === 0 ? (
          <div className="py-12 text-center text-sm text-neutral-500">
            No export jobs generated yet. Select a dataset above to create an export.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exportsList.map((job) => {
                  const isDone = job.status === "DONE";
                  const isExpired =
                    job.expiresAt && new Date(job.expiresAt).getTime() < Date.now();

                  return (
                    <TableRow key={job.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/40">
                      <TableCell>
                        <span className="font-mono text-xs font-bold uppercase text-neutral-800 dark:text-neutral-200">
                          {job.type}
                        </span>
                        {job.piiUnmasked && (
                          <span className="ml-2 inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                            UNMASKED
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            job.status === "DONE"
                              ? isExpired
                                ? "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : job.status === "FAILED"
                              ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                          }`}
                        >
                          {job.status === "DONE" && !isExpired && <CheckCircle className="h-3 w-3" />}
                          {job.status === "FAILED" && <AlertTriangle className="h-3 w-3" />}
                          {isExpired ? "EXPIRED" : job.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-neutral-600 dark:text-neutral-400">
                        {job.requestedByEmail || job.requestedByAdminId}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-neutral-600 dark:text-neutral-400">
                        {job.reason}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-neutral-700 dark:text-neutral-300">
                        {job.rowCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-neutral-500 whitespace-nowrap">
                        {new Date(job.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {isDone && !isExpired && job.downloadUrl ? (
                          <a
                            href={job.downloadUrl}
                            download
                            className="inline-flex items-center gap-1 rounded bg-monologg-red px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-red-700"
                          >
                            <Download className="h-3 w-3" />
                            Download CSV
                          </a>
                        ) : isExpired ? (
                          <span className="text-xs text-neutral-400 italic">Link Expired</span>
                        ) : job.status === "FAILED" ? (
                          <span className="text-xs text-red-500">{job.error || "Failed"}</span>
                        ) : (
                          <span className="inline-flex items-center text-xs text-neutral-400">
                            <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                            Processing
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Export Configuration Modal */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Request CSV Export: ${selectedType.toUpperCase()}`}
      >
        <form onSubmit={handleCreateExport} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Dataset Type
            </label>
            <input
              type="text"
              readOnly
              value={selectedType.toUpperCase()}
              className="w-full rounded-md border border-neutral-300 bg-neutral-100 px-3 py-2 font-mono text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Business Justification / Reason <span className="text-monologg-red">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="State the regulatory, finance, or operational purpose for this export..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md border border-neutral-300 p-2.5 text-xs shadow-sm focus:border-monologg-red focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
            />
            <span className="text-[10px] text-neutral-400">
              Required by PRD Module M12.1. This reason will be logged to the immutable audit trail.
            </span>
          </div>

          {canUnmask && (
            <div className="rounded border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unmaskPii}
                  onChange={(e) => setUnmaskPii(e.target.checked)}
                  className="rounded border-amber-400 text-monologg-red focus:ring-monologg-red"
                />
                <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Request unmasked PII (Full emails, full names, phone numbers)
                </span>
              </label>
              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                Authorized for {currentRole}. Unmasked exports undergo elevated compliance auditing.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-md border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-md bg-monologg-red px-4 py-2 text-xs font-semibold text-white shadow hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Queuing...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Queue Export
                </>
              )}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
