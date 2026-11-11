"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  adminClient,
  type VerificationQueueItem,
  type VerificationMetricsResponse,
} from "@/lib/admin-client";
import {
  AlertTriangle,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  Video,
  Shield,
  ArrowRight,
  RotateCcw,
  Sparkles,
  UserCheck,
} from "lucide-react";

const STATUS_TABS = [
  { id: "ACTIVE", label: "Active Queue" },
  { id: "ALL", label: "All Submissions" },
  { id: "UPLOADED", label: "Uploaded" },
  { id: "IN_REVIEW", label: "In Review" },
  { id: "APPROVED", label: "Approved" },
  { id: "NEEDS_RERECORD", label: "Needs Re-record" },
] as const;

const NICHES = [
  { id: "ALL", label: "All Niches" },
  { id: "ACTOR", label: "Actor" },
  { id: "VO_ARTIST", label: "Voiceover Artist" },
  { id: "COMEDIAN", label: "Comedian" },
  { id: "COMPERE", label: "Compere / Host" },
  { id: "SPEAKER_PASTOR", label: "Speaker / Pastor" },
  { id: "MUSICIAN", label: "Musician" },
  { id: "CONTENT_CREATOR", label: "Content Creator" },
] as const;

function VerificationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentStatus = searchParams.get("status") || "ACTIVE";
  const currentNiche = searchParams.get("niche") || "ALL";
  const currentSearch = searchParams.get("search") || "";
  const currentOverdue = searchParams.get("isOverdue") === "true";

  const [recordings, setRecordings] = useState<VerificationQueueItem[]>([]);
  const [metrics, setMetrics] = useState<VerificationMetricsResponse | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(currentSearch);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [queueRes, metricsRes] = await Promise.all([
        adminClient.getVerificationQueue({
          status: currentStatus,
          niche: currentNiche !== "ALL" ? currentNiche : undefined,
          search: currentSearch || undefined,
          isOverdue: currentOverdue || undefined,
        }),
        adminClient.getVerificationMetrics().catch(() => null),
      ]);

      setRecordings(queueRes.items || []);
      setTotalCount(queueRes.total || 0);
      if (metricsRes) setMetrics(metricsRes);
    } catch (err: any) {
      setError(err.message || "Failed to load verification queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentStatus, currentNiche, currentSearch, currentOverdue]);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([k, v]) => {
      if (!v || v === "ALL") params.delete(k);
      else params.set(k, v);
    });
    startTransition(() => {
      router.push(`/verifications?${params.toString()}`);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Verification & Compliance Queue
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
              AD-26 · PRD M9
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Talent showcase presentation recordings review. Strict 48-hour SLA.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-700 dark:text-zinc-300"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* X3 Invariant Notice */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
        <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
          <p className="font-medium text-zinc-900 dark:text-zinc-200">
            X3 Privacy & Identity Invariant
          </p>
          <p>
            Presentation video reviews evaluate showcase quality and presence only (under 90s, waist-up, lighting).
            Review decisions <strong>never modify identity KYC or the Verified badge</strong> (managed strictly by Smile Identity).
          </p>
        </div>
      </div>

      {/* Metrics Strip */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Pending Uploads</span>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
              {metrics.pendingUploadedCount}
            </div>
            <span className="text-[11px] text-zinc-400">Awaiting reviewer</span>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">In Review</span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {metrics.inReviewCount}
            </div>
            <span className="text-[11px] text-zinc-400">Currently open</span>
          </div>

          <div className={`rounded-xl border p-4 ${
            metrics.overdueCount > 0
              ? "border-red-200 dark:border-red-900/60 bg-red-50/30 dark:bg-red-950/20"
              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
          }`}>
            <span className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Overdue (&gt;48h)
            </span>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400 mt-1">
              {metrics.overdueCount}
            </div>
            <span className="text-[11px] text-red-500/80">SLA breached</span>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Approval Rate</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {metrics.approvalRatePct}%
            </div>
            <span className="text-[11px] text-zinc-400">{metrics.totalReviewedCount} total reviews</span>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Median Review Time</span>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
              {metrics.medianReviewHours}h
            </div>
            <span className="text-[11px] text-zinc-400">Target &lt; 48 hours</span>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 pb-px">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => updateFilters({ status: tab.id })}
            className={`px-3.5 py-2 text-xs font-medium rounded-t-lg transition-colors cursor-pointer shrink-0 border-b-2 -mb-px ${
              currentStatus === tab.id
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
                : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateFilters({ search: searchTerm.trim() || null });
          }}
          className="relative flex-1 max-w-md"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search talent name or email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Niche selector */}
          <select
            value={currentNiche}
            onChange={(e) => updateFilters({ niche: e.target.value })}
            className="text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {NICHES.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>

          {/* Overdue toggle */}
          <button
            onClick={() => updateFilters({ isOverdue: currentOverdue ? null : "true" })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              currentOverdue
                ? "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900"
                : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Overdue Only
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-4 text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Queue List Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Loading verification submissions...
          </div>
        ) : recordings.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Video className="w-8 h-8 text-zinc-400 mx-auto stroke-[1.5]" />
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              No submissions found
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
              There are currently no recordings matching this filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4 font-medium">Talent</th>
                  <th className="py-3 px-4 font-medium">Niche / Location</th>
                  <th className="py-3 px-4 font-medium">Duration</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">SLA / Age</th>
                  <th className="py-3 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {recordings.map((rec) => {
                  const isDurationCompliant = rec.durationSec <= 90;

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* Talent Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-600 dark:text-zinc-300 overflow-hidden shrink-0">
                            {rec.creatorAvatarUrl ? (
                              <img src={rec.creatorAvatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              rec.creatorName.slice(0, 1)
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-zinc-900 dark:text-zinc-100 block">
                              {rec.creatorName}
                            </span>
                            <span className="text-[11px] text-zinc-400 font-mono">
                              ID: {rec.creatorId.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Niche & Location */}
                      <td className="py-3.5 px-4">
                        <div className="text-zinc-900 dark:text-zinc-200 font-medium">
                          {rec.creatorNiche}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {rec.creatorLocation}
                        </div>
                      </td>

                      {/* Stored Duration */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                            isDurationCompliant
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60"
                              : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60"
                          }`}
                        >
                          <Video className="w-3 h-3" />
                          {rec.durationSec}s / 90s
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            rec.status === "UPLOADED"
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60"
                              : rec.status === "IN_REVIEW"
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60"
                              : rec.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60"
                              : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60"
                          }`}
                        >
                          {rec.status === "APPROVED" && <CheckCircle2 className="w-3 h-3" />}
                          {rec.status === "NEEDS_RERECORD" && <XCircle className="w-3 h-3" />}
                          {rec.status}
                        </span>
                      </td>

                      {/* SLA & Age */}
                      <td className="py-3.5 px-4">
                        {rec.isOverdue ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400">
                              <AlertTriangle className="w-3 h-3" /> Overdue
                            </span>
                            <div className="text-[11px] text-zinc-400">
                              Age: {rec.ageHours}h (SLA 48h)
                            </div>
                          </div>
                        ) : rec.status === "UPLOADED" || rec.status === "IN_REVIEW" ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-700 dark:text-zinc-300">
                              <Clock className="w-3 h-3 text-zinc-400" />
                              {rec.slaRemainingHours}h remaining
                            </span>
                            <div className="text-[11px] text-zinc-400">
                              Age: {rec.ageHours}h
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-zinc-400">
                            Decided · Age {rec.ageHours}h
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/verifications/${rec.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                        >
                          Review
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-zinc-500">
          Loading verification queue...
        </div>
      }
    >
      <VerificationsContent />
    </Suspense>
  );
}
