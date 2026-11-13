"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  adminClient,
  type RetentionData,
} from "@/lib/admin-client";
import { AnalyticsNav } from "@/components/analytics/AnalyticsNav";
import { Filter, Info } from "lucide-react";

const USER_TYPE_FILTERS = [
  { id: "ALL", label: "All Users" },
  { id: "TALENT", label: "Talent Only" },
  { id: "CLIENT", label: "Clients Only" },
] as const;

function getHeatmapClasses(pct: number) {
  if (pct >= 80) {
    return "bg-monologg-red text-white font-bold";
  }
  if (pct >= 60) {
    return "bg-rose-600 text-white font-semibold";
  }
  if (pct >= 40) {
    return "bg-rose-200 text-rose-950 dark:bg-rose-800/70 dark:text-rose-50 font-semibold";
  }
  if (pct >= 25) {
    return "bg-rose-100 text-rose-900 dark:bg-rose-950/70 dark:text-rose-200 font-medium";
  }
  if (pct >= 10) {
    return "bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-300";
  }
  if (pct > 0) {
    return "bg-gray-100 text-gray-800 dark:bg-[#1E1E1E] dark:text-gray-200";
  }
  return "bg-gray-50 text-gray-600 dark:bg-[#111111] dark:text-gray-400";
}

function RetentionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUserType = (searchParams.get("userType") || "ALL") as "ALL" | "TALENT" | "CLIENT";

  const [data, setData] = useState<RetentionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    adminClient
      .getRetentionAnalytics(currentUserType)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load retention analytics");
        setLoading(false);
      });
  }, [currentUserType]);

  const handleFilterChange = (val: string) => {
    router.push(`/analytics/retention?userType=${val}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <AnalyticsNav />
        <div className="p-12 text-center text-gray-600 dark:text-gray-400 animate-pulse bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424]">
          Computing weekly retention cohorts...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <AnalyticsNav />
        <div className="p-6 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 rounded-xl border border-red-200 dark:border-red-900/60">
          <p className="font-semibold">Error loading retention analytics</p>
          <p className="text-sm mt-1">{error || "No data returned"}</p>
        </div>
      </div>
    );
  }

  const w1Avg = Math.round(
    data.cohorts.reduce((acc, c) => acc + (c.weeks[1]?.retentionPct || 0), 0) /
      Math.max(1, data.cohorts.length),
  );
  const w4Avg = Math.round(
    data.cohorts.reduce((acc, c) => acc + (c.weeks[4]?.retentionPct || 0), 0) /
      Math.max(1, data.cohorts.length),
  );
  const totalTracked = data.cohorts.reduce((acc, c) => acc + c.cohortSize, 0);

  return (
    <div className="space-y-6 pb-12">
      <AnalyticsNav dataFreshness={data.dataFreshness} />

      {/* Filter & Summary Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#141414] p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            Audience:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {USER_TYPE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => handleFilterChange(f.id)}
                className={`px-3 py-2 min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                  currentUserType === f.id
                    ? "bg-monologg-red text-white shadow-sm"
                    : "bg-gray-100 dark:bg-[#1E1E1E] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#262626]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:flex sm:items-center sm:gap-6 text-xs pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-[#242424]">
          <div>
            <span className="block sm:inline text-gray-600 dark:text-gray-400">Tracked: </span>
            <span className="font-bold tabular-nums text-gray-900 dark:text-gray-100">
              {totalTracked.toLocaleString()} users
            </span>
          </div>
          <div>
            <span className="block sm:inline text-gray-600 dark:text-gray-400">Avg W1: </span>
            <span className="font-bold tabular-nums text-rose-700 dark:text-rose-400">{w1Avg}%</span>
          </div>
          <div>
            <span className="block sm:inline text-gray-600 dark:text-gray-400">Avg W4: </span>
            <span className="font-bold tabular-nums text-rose-700 dark:text-rose-400">{w4Avg}%</span>
          </div>
        </div>
      </div>

      {/* Cohort Retention Matrix */}
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-[#242424] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Weekly Signup Retention Matrix (W0–W8)
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Signed-in users generating at least one <code className="font-mono">ProductEvent</code> in each calendar week after signup.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 shrink-0">
            <Info className="w-4 h-4 shrink-0" />
            <span>% retained (active users)</span>
          </div>
        </div>

        {/* Mobile Cohort Cards */}
        <div className="md:hidden divide-y divide-gray-200 dark:divide-[#242424]">
          {data.cohorts.length === 0 ? (
            <div className="py-10 px-4 text-center text-sm text-gray-600 dark:text-gray-400">
              No cohort telemetry recorded.
            </div>
          ) : (
            data.cohorts.map((c) => (
              <div key={c.cohortWeek} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {c.cohortWeek}
                  </span>
                  <span className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded bg-gray-100 dark:bg-[#1E1E1E] text-gray-700 dark:text-gray-300">
                    {c.cohortSize} users
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {c.weeks.map((w) => (
                    <div
                      key={w.weekNumber}
                      className={`py-1.5 px-1 rounded-md text-center ${getHeatmapClasses(w.retentionPct)}`}
                    >
                      <span className="block text-[10px] opacity-85 font-semibold">W{w.weekNumber}</span>
                      <span className="block text-xs tabular-nums">{w.retentionPct}%</span>
                      <span className="block text-[10px] tabular-nums opacity-80">{w.activeCount}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Matrix Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-[#242424] text-xs">
            <thead className="bg-gray-50 dark:bg-[#1A1A1A] text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left sticky left-0 bg-gray-50 dark:bg-[#1A1A1A] z-10">Cohort Week</th>
                <th className="px-4 py-3 text-right">Size</th>
                <th className="px-3 py-3 text-center">W0</th>
                <th className="px-3 py-3 text-center">W1</th>
                <th className="px-3 py-3 text-center">W2</th>
                <th className="px-3 py-3 text-center">W3</th>
                <th className="px-3 py-3 text-center">W4</th>
                <th className="px-3 py-3 text-center">W5</th>
                <th className="px-3 py-3 text-center">W6</th>
                <th className="px-3 py-3 text-center">W7</th>
                <th className="px-3 py-3 text-center">W8</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#242424]">
              {data.cohorts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-gray-600 dark:text-gray-400">
                    No cohort telemetry recorded.
                  </td>
                </tr>
              ) : (
                data.cohorts.map((c) => (
                  <tr key={c.cohortWeek} className="hover:bg-gray-50/60 dark:hover:bg-[#1A1A1A]">
                    <td className="px-4 py-3 font-mono font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap sticky left-0 bg-white dark:bg-[#141414]">
                      {c.cohortWeek}
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-900 dark:text-gray-100">
                      {c.cohortSize}
                    </td>
                    {c.weeks.map((w) => (
                      <td key={w.weekNumber} className="px-1 py-1 text-center">
                        <div
                          className={`py-2 px-1 rounded-md flex flex-col items-center justify-center transition-colors ${getHeatmapClasses(
                            w.retentionPct,
                          )}`}
                          title={`Week ${w.weekNumber}: ${w.activeCount} of ${c.cohortSize} active (${w.retentionPct}%)`}
                        >
                          <span className="text-xs tabular-nums">{w.retentionPct}%</span>
                          <span className="text-[10px] tabular-nums opacity-85">{w.activeCount}</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function RetentionPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-gray-600 dark:text-gray-400">
          Loading retention cohorts...
        </div>
      }
    >
      <RetentionContent />
    </Suspense>
  );
}
