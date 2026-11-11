"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  adminClient,
  type RetentionData,
  type RetentionCohort,
} from "@/lib/admin-client";
import { AnalyticsNav } from "@/components/analytics/AnalyticsNav";
import {
  Users,
  Calendar,
  Filter,
  TrendingUp,
  Info,
} from "lucide-react";

const USER_TYPE_FILTERS = [
  { id: "ALL", label: "All Users" },
  { id: "TALENT", label: "Talent Only" },
  { id: "CLIENT", label: "Clients Only" },
] as const;

function RetentionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUserType = (searchParams.get("userType") || "ALL") as "ALL" | "TALENT" | "CLIENT";

  const [data, setData] = useState<RetentionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
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
        <div className="p-12 text-center text-gray-400 animate-pulse">
          Computing weekly retention cohorts...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <AnalyticsNav />
        <div className="p-6 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <p className="font-semibold">Error loading retention analytics</p>
          <p className="text-sm mt-1">{error || "No data returned"}</p>
        </div>
      </div>
    );
  }

  // Calculate Average Retention across cohorts for W1, W4, W8
  const w1Avg = Math.round(
    data.cohorts.reduce((acc, c) => acc + (c.weeks[1]?.retentionPct || 0), 0) /
      Math.max(1, data.cohorts.length),
  );
  const w4Avg = Math.round(
    data.cohorts.reduce((acc, c) => acc + (c.weeks[4]?.retentionPct || 0), 0) /
      Math.max(1, data.cohorts.length),
  );
  const totalTracked = data.cohorts.reduce((acc, c) => acc + c.cohortSize, 0);

  const getHeatmapColor = (pct: number) => {
    if (pct >= 80) return "bg-purple-600 text-white font-bold";
    if (pct >= 60) return "bg-purple-500 text-white font-semibold";
    if (pct >= 40) return "bg-purple-400 text-white font-medium";
    if (pct >= 25) return "bg-purple-200 text-purple-900 font-medium";
    if (pct >= 10) return "bg-purple-100 text-purple-800";
    if (pct > 0) return "bg-purple-50 text-purple-700";
    return "bg-gray-50 text-gray-400";
  };

  return (
    <div className="space-y-6 pb-12">
      <AnalyticsNav dataFreshness={data.dataFreshness} />

      {/* Filter and Overview Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            Audience:
          </span>
          <div className="flex gap-1.5">
            {USER_TYPE_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => handleFilterChange(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  currentUserType === f.id
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-gray-600">
          <div>
            <span className="text-gray-400">Total Tracked:</span>{" "}
            <span className="font-bold text-gray-900">{totalTracked} users</span>
          </div>
          <div>
            <span className="text-gray-400">Avg W1 Retention:</span>{" "}
            <span className="font-bold text-purple-700">{w1Avg}%</span>
          </div>
          <div>
            <span className="text-gray-400">Avg W4 Retention:</span>{" "}
            <span className="font-bold text-purple-700">{w4Avg}%</span>
          </div>
        </div>
      </div>

      {/* Cohort Retention Table Matrix (W0 through W8) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Weekly Signup Retention Matrix (W0–W8)</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Active users who generated a ProductEvent in the given calendar week relative to their signup cohort.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Info className="w-4 h-4" />
            <span>Cell values show percentage (and count)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Cohort Week</th>
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
            <tbody className="divide-y divide-gray-200">
              {data.cohorts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-gray-400">
                    No cohort telemetry recorded.
                  </td>
                </tr>
              ) : (
                data.cohorts.map((c) => (
                  <tr key={c.cohortWeek} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono font-medium text-gray-900 whitespace-nowrap">
                      {c.cohortWeek}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {c.cohortSize}
                    </td>
                    {c.weeks.map((w) => (
                      <td key={w.weekNumber} className="px-1 py-1 text-center">
                        <div
                          className={`py-2 px-1 rounded-md flex flex-col items-center justify-center transition-all ${getHeatmapColor(
                            w.retentionPct,
                          )}`}
                          title={`Week ${w.weekNumber}: ${w.activeCount} of ${c.cohortSize} active (${w.retentionPct}%)`}
                        >
                          <span className="text-xs">{w.retentionPct}%</span>
                          <span className="text-[10px] opacity-75">{w.activeCount}</span>
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
    <Suspense fallback={<div className="p-12 text-center text-gray-400">Loading retention cohorts...</div>}>
      <RetentionContent />
    </Suspense>
  );
}
