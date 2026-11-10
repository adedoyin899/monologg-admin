"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  adminClient,
  type DisputeListItem,
} from "@/lib/admin-client";
import {
  AlertTriangle,
  Clock,
  Search,
  ShieldAlert,
  ArrowRight,
  Filter,
  CheckCircle2,
  FileQuestion,
  RotateCcw,
} from "lucide-react";

const STATUS_TABS = [
  { id: "ALL", label: "All Disputes" },
  { id: "OPEN", label: "Open" },
  { id: "UNDER_REVIEW", label: "Under Review" },
  { id: "AWAITING_EVIDENCE", label: "Awaiting Evidence" },
  { id: "RESOLVED", label: "Resolved" },
] as const;

function DisputesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentStatus = searchParams.get("status") || "ALL";
  const currentSearch = searchParams.get("search") || "";

  const [disputes, setDisputes] = useState<DisputeListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(currentSearch);

  const fetchDisputes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminClient.getDisputes({
        status: currentStatus !== "ALL" ? currentStatus : undefined,
        search: currentSearch || undefined,
      });
      setDisputes(res.disputes || []);
      setTotalCount(res.totalCount || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load disputes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [currentStatus, currentSearch]);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([k, v]) => {
      if (!v || v === "ALL") params.delete(k);
      else params.set(k, v);
    });
    startTransition(() => {
      router.push(`/disputes?${params.toString()}`);
    });
  };

  const overdueCount = disputes.filter((d) => d.isOverdue && d.status !== "RESOLVED").length;
  const fourEyesCount = disputes.filter((d) => d.isFourEyesRequired && d.status !== "RESOLVED").length;

  return (
    <div className="space-y-6">
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Disputes Queue
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900/60">
              AD-17 · PRD M8
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Active escrow disputes, arbitration evidence, four-eyes resolutions, and chat review.
          </p>
        </div>

        <button
          onClick={fetchDisputes}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-700 dark:text-zinc-300"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Disputes</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{totalCount}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Across all statuses</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Open / Under Review</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {disputes.filter((d) => d.status === "OPEN" || d.status === "UNDER_REVIEW").length}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Active mediation</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Overdue (&gt;3 days)</span>
            {overdueCount > 0 && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
          </div>
          <div className={`text-2xl font-bold mt-1 ${overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-100"}`}>
            {overdueCount}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Breached 72h SLA target</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Four-Eyes Required</span>
            {fourEyesCount > 0 && <ShieldAlert className="w-3.5 h-3.5 text-purple-500" />}
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {fourEyesCount}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Above currency threshold</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const isActive = currentStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => updateFilters({ status: tab.id })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateFilters({ search: searchTerm.trim() || null });
          }}
          className="flex items-center gap-2"
        >
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search disputes…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-red-500 w-48 sm:w-64"
            />
          </div>
        </form>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Disputes Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Dispute & Booking</th>
                <th className="px-4 py-3">Parties</th>
                <th className="px-4 py-3">Reason & Opener</th>
                <th className="px-4 py-3">Value & Governance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Age & SLA</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                    Loading disputes queue…
                  </td>
                </tr>
              ) : disputes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                    No disputes found for this view.
                  </td>
                </tr>
              ) : (
                disputes.map((d) => {
                  const statusColors: Record<string, string> = {
                    OPEN: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900/60",
                    UNDER_REVIEW: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900/60",
                    AWAITING_EVIDENCE: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-900/60",
                    RESOLVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60",
                  };

                  const amount = d.booking ? (d.booking.baseAmount / 100).toLocaleString() : "0";
                  const currency = d.booking?.currency || "NGN";

                  return (
                    <tr
                      key={d.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* ID & Booking */}
                      <td className="px-4 py-3 font-mono">
                        <Link
                          href={`/disputes/${d.id}`}
                          className="font-semibold text-zinc-900 dark:text-zinc-100 hover:text-red-600 dark:hover:text-red-400"
                        >
                          {d.id.slice(0, 10)}…
                        </Link>
                        <div className="text-[11px] text-zinc-400 font-sans mt-0.5">
                          Booking:{" "}
                          <Link
                            href={`/bookings/${d.bookingId}`}
                            className="underline hover:text-zinc-600 dark:hover:text-zinc-200 font-mono"
                          >
                            {d.bookingId.slice(0, 8)}…
                          </Link>
                        </div>
                      </td>

                      {/* Parties */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          Talent: {d.booking?.creator?.name || "Unknown"}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Client: {d.booking?.client?.name || d.booking?.client?.orgName || "Unknown"}
                        </div>
                      </td>

                      {/* Reason & Opener */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {d.reason.replace(/_/g, " ")}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              d.openedByRole === "TALENT"
                                ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                                : "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400"
                            }`}
                          >
                            by {d.openedByRole}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5 max-w-xs">
                          {d.description}
                        </div>
                      </td>

                      {/* Value & Governance */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {currency} {amount}
                        </div>
                        {d.isFourEyesRequired && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                            <ShieldAlert className="w-2.5 h-2.5" />
                            Four-Eyes
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                            statusColors[d.status] || "bg-zinc-100 text-zinc-700 border-zinc-200"
                          }`}
                        >
                          {d.status.replace(/_/g, " ")}
                        </span>
                        {d.resolution && (
                          <div className="text-[10px] text-zinc-400 mt-0.5">
                            Outcome: {d.resolution.replace(/_/g, " ")}
                          </div>
                        )}
                      </td>

                      {/* Age & SLA */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span>{d.ageDays}d ({d.ageHours}h)</span>
                        </div>
                        {d.status !== "RESOLVED" && (
                          <div className="mt-0.5">
                            {d.isOverdue ? (
                              <span className="text-[10px] font-bold text-red-600 dark:text-red-400 flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" /> Overdue (&gt;3d)
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                Within 3d SLA
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/disputes/${d.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 transition-colors cursor-pointer"
                        >
                          <span>Review</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function DisputesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-zinc-400">
          Loading disputes queue…
        </div>
      }
    >
      <DisputesContent />
    </Suspense>
  );
}
