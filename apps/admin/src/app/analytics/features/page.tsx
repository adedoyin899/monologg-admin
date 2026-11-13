"use client";

import { useEffect, useState, Suspense } from "react";
import {
  adminClient,
  type FeatureAdoptionData,
} from "@/lib/admin-client";
import { AnalyticsNav } from "@/components/analytics/AnalyticsNav";
import {
  Shield,
  Sliders,
  CheckCircle2,
  Lock,
} from "lucide-react";

function FeaturesContent() {
  const [data, setData] = useState<FeatureAdoptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audienceFilter, setAudienceFilter] = useState<"ALL" | "TALENT" | "CLIENT">("ALL");

  useEffect(() => {
    adminClient
      .getFeatureAdoptionAnalytics()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load feature adoption analytics");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <AnalyticsNav />
        <div className="p-12 text-center text-gray-600 dark:text-gray-400 animate-pulse bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424]">
          Computing feature adoption matrix...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <AnalyticsNav />
        <div className="p-6 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 rounded-xl border border-red-200 dark:border-red-900/60">
          <p className="font-semibold">Error loading feature adoption analytics</p>
          <p className="text-sm mt-1">{error || "No data returned"}</p>
        </div>
      </div>
    );
  }

  const filteredFeatures = data.features.filter((f) => {
    if (audienceFilter === "ALL") return true;
    return f.eligibleAudience === audienceFilter || f.eligibleAudience === "ALL";
  });

  const audienceBadge = (audience: string) => {
    if (audience === "TALENT") {
      return "bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200";
    }
    if (audience === "CLIENT") {
      return "bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-200";
    }
    return "bg-gray-100 dark:bg-[#1E1E1E] text-gray-700 dark:text-gray-300";
  };

  return (
    <div className="space-y-6 pb-12">
      <AnalyticsNav dataFreshness={data.dataFreshness} />

      {/* Aggregate Attributes Privacy Card (PRD M10.2: Completion & Visibility Mix Only) */}
      <div className="bg-white dark:bg-[#141414] p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-[#D91B1D] dark:text-[#FF5C5E]">
                <Shield className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Physical Attributes Adoption &amp; Visibility Mix
              </h2>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 max-w-2xl">
              Strict privacy invariant: aggregate completion counts and visibility tiers only. Individual talent attribute values are never queryable in Admin.
            </p>
          </div>

          <div className="flex items-center gap-5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-[#242424]">
            <div className="sm:text-right">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-semibold uppercase">
                Completion Rate
              </span>
              <div className="text-2xl font-extrabold tabular-nums text-[#D91B1D] dark:text-[#FF5C5E]">
                {data.attributesAggregate.completionRatePct}%
              </div>
            </div>
            <div className="h-9 w-px bg-gray-200 dark:bg-[#242424]" />
            <div className="sm:text-right">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-semibold uppercase">
                Configured
              </span>
              <div className="text-2xl font-extrabold tabular-nums text-gray-900 dark:text-gray-100">
                {data.attributesAggregate.creatorsWithAttributes} / {data.attributesAggregate.totalCreators}
              </div>
            </div>
          </div>
        </div>

        {/* Visibility Mix Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-gray-100 dark:border-[#242424]">
          <div className="bg-gray-50 dark:bg-[#191919] p-3.5 rounded-lg border border-gray-200 dark:border-[#242424]">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              PUBLIC Fields
            </span>
            <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100 mt-1">
              {data.attributesAggregate.visibilityMix.publicCount}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Visible on storefront</p>
          </div>

          <div className="bg-gray-50 dark:bg-[#191919] p-3.5 rounded-lg border border-gray-200 dark:border-[#242424]">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              SEARCHABLE Fields
            </span>
            <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100 mt-1">
              {data.attributesAggregate.visibilityMix.searchableCount}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Matchable in casting search</p>
          </div>

          <div className="bg-gray-50 dark:bg-[#191919] p-3.5 rounded-lg border border-gray-200 dark:border-[#242424]">
            <span className="text-xs font-semibold text-[#D91B1D] dark:text-[#FF5C5E] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              PRIVATE Fields
            </span>
            <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100 mt-1">
              {data.attributesAggregate.visibilityMix.privateCount}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Kept confidential from clients</p>
          </div>
        </div>
      </div>

      {/* Feature Adoption Registry */}
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-[#242424] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
              Product Feature Adoption Registry
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Ranked by first-use adoption rate. Repeat use denotes active usage across 2+ distinct days.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Audience:</span>
            <div className="flex gap-1.5">
              {(["ALL", "TALENT", "CLIENT"] as const).map((aud) => (
                <button
                  key={aud}
                  type="button"
                  onClick={() => setAudienceFilter(aud)}
                  className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition-colors ${
                    audienceFilter === aud
                      ? "bg-monologg-red text-white"
                      : "bg-gray-100 dark:bg-[#1E1E1E] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#262626]"
                  }`}
                >
                  {aud}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile & Tablet Stacked Cards */}
        <div className="lg:hidden divide-y divide-gray-200 dark:divide-[#242424]">
          {filteredFeatures.map((f) => (
            <div key={f.featureKey} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-600 dark:text-gray-400">
                      #{f.rank}
                    </span>
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                      {f.label}
                    </span>
                  </div>
                  <span className="block text-[11px] font-mono text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                    {f.featureKey}
                  </span>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 ${audienceBadge(f.eligibleAudience)}`}>
                  {f.eligibleAudience}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                <div>
                  <span className="block text-gray-600 dark:text-gray-400">Used / Eligible</span>
                  <span className="font-bold tabular-nums text-gray-900 dark:text-gray-100">
                    {f.usedUsers} / {f.eligibleUsers}
                  </span>
                </div>
                <div>
                  <span className="block text-gray-600 dark:text-gray-400">First-Use</span>
                  <span className="font-bold tabular-nums text-gray-900 dark:text-gray-100">
                    {f.firstUseRatePct}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-gray-600 dark:text-gray-400">Repeat Rate</span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold tabular-nums ${
                      f.repeatUseRatePct >= 30
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                        : "bg-gray-100 dark:bg-[#1E1E1E] text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {f.repeatUseRatePct}% ({f.repeatUsers})
                  </span>
                </div>
              </div>

              <div className="w-full bg-gray-100 dark:bg-[#1E1E1E] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#F92729] h-full rounded-full"
                  style={{ width: `${Math.min(100, f.firstUseRatePct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-[#242424] text-sm">
            <thead className="bg-gray-50 dark:bg-[#1A1A1A] text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left">Rank</th>
                <th className="px-5 py-3 text-left">Feature Name</th>
                <th className="px-5 py-3 text-center">Audience</th>
                <th className="px-5 py-3 text-right">Eligible</th>
                <th className="px-5 py-3 text-right">Used</th>
                <th className="px-5 py-3 text-right">First-Use %</th>
                <th className="px-5 py-3 text-right">Repeat Users</th>
                <th className="px-5 py-3 text-right">Repeat Rate %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#242424]">
              {filteredFeatures.map((f) => (
                <tr key={f.featureKey} className="hover:bg-gray-50/60 dark:hover:bg-[#1A1A1A]">
                  <td className="px-5 py-3.5 font-bold text-gray-600 dark:text-gray-400 font-mono text-xs tabular-nums">
                    #{f.rank}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{f.label}</span>
                    <span className="block text-[11px] font-mono text-gray-600 dark:text-gray-400 mt-0.5">
                      {f.featureKey}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${audienceBadge(f.eligibleAudience)}`}>
                      {f.eligibleAudience}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono tabular-nums text-gray-700 dark:text-gray-300">
                    {f.eligibleUsers}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold tabular-nums text-gray-900 dark:text-gray-100">
                    {f.usedUsers}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-100 dark:bg-[#1E1E1E] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#F92729] h-full rounded-full"
                          style={{ width: `${Math.min(100, f.firstUseRatePct)}%` }}
                        />
                      </div>
                      <span className="font-semibold text-xs font-mono tabular-nums text-gray-900 dark:text-gray-100 w-9 text-right">
                        {f.firstUseRatePct}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono tabular-nums text-gray-700 dark:text-gray-300">
                    {f.repeatUsers}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums ${
                        f.repeatUseRatePct >= 30
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60"
                          : "bg-gray-100 dark:bg-[#1E1E1E] text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {f.repeatUseRatePct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function FeaturesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-gray-600 dark:text-gray-400">
          Loading feature adoption...
        </div>
      }
    >
      <FeaturesContent />
    </Suspense>
  );
}
