"use client";

import { useEffect, useState, Suspense } from "react";
import {
  adminClient,
  type FeatureAdoptionData,
  type FeatureAdoptionItem,
} from "@/lib/admin-client";
import { AnalyticsNav } from "@/components/analytics/AnalyticsNav";
import {
  Sparkles,
  Award,
  Users,
  Repeat,
  Shield,
  TrendingUp,
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
        <div className="p-12 text-center text-gray-400 animate-pulse">
          Computing feature adoption matrix...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <AnalyticsNav />
        <div className="p-6 bg-red-50 text-red-700 rounded-lg border border-red-200">
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

  return (
    <div className="space-y-6 pb-12">
      <AnalyticsNav dataFreshness={data.dataFreshness} />

      {/* Aggregate Attributes Privacy Card (PRD M10.2: COMPLETION & VISIBILITY MIX ONLY) */}
      <div className="bg-white p-6 rounded-xl border border-purple-200 shadow-sm bg-gradient-to-r from-purple-50/50 via-white to-purple-50/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                <Shield className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-gray-900">
                Physical Attributes Adoption & Visibility Mix
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-1 max-w-2xl">
              Strict privacy invariant: Aggregate metrics only. Individual attribute values (e.g. height, weight, skin tone) are never exposed on analytics or public screens.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-gray-400 font-semibold uppercase">Completion Rate</span>
              <div className="text-2xl font-extrabold text-purple-700">
                {data.attributesAggregate.completionRatePct}%
              </div>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="text-right">
              <span className="text-xs text-gray-400 font-semibold uppercase">Configured</span>
              <div className="text-2xl font-extrabold text-gray-900">
                {data.attributesAggregate.creatorsWithAttributes} / {data.attributesAggregate.totalCreators}
              </div>
            </div>
          </div>
        </div>

        {/* Visibility Mix Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-purple-100/60">
          <div className="bg-white p-3 rounded-lg border border-gray-100">
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              PUBLIC Fields
            </span>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {data.attributesAggregate.visibilityMix.publicCount}
            </p>
            <p className="text-[10px] text-gray-400">Visible on storefront</p>
          </div>

          <div className="bg-white p-3 rounded-lg border border-gray-100">
            <span className="text-xs font-semibold text-blue-700 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5" />
              SEARCHABLE Fields
            </span>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {data.attributesAggregate.visibilityMix.searchableCount}
            </p>
            <p className="text-[10px] text-gray-400">Matchable in casting search</p>
          </div>

          <div className="bg-white p-3 rounded-lg border border-gray-100">
            <span className="text-xs font-semibold text-purple-700 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              PRIVATE Fields
            </span>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {data.attributesAggregate.visibilityMix.privateCount}
            </p>
            <p className="text-[10px] text-gray-400">Kept confidential from clients</p>
          </div>
        </div>
      </div>

      {/* Feature Adoption Table with Filters and Ranking */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-gray-900">Product Feature Adoption Registry</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Ranked by first-use adoption rate. Repeat use denotes active usage across 2 or more distinct days.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Audience:</span>
            <div className="flex gap-1">
              {(["ALL", "TALENT", "CLIENT"] as const).map((aud) => (
                <button
                  key={aud}
                  onClick={() => setAudienceFilter(aud)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                    audienceFilter === aud
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {aud}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left">Rank</th>
                <th className="px-6 py-3 text-left">Feature Name</th>
                <th className="px-6 py-3 text-center">Audience</th>
                <th className="px-6 py-3 text-right">Eligible</th>
                <th className="px-6 py-3 text-right">Used</th>
                <th className="px-6 py-3 text-right">First-Use %</th>
                <th className="px-6 py-3 text-right">Repeat Users</th>
                <th className="px-6 py-3 text-right">Repeat Rate %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredFeatures.map((f) => (
                <tr key={f.featureKey} className="hover:bg-gray-50/60">
                  <td className="px-6 py-3.5 font-bold text-gray-400 font-mono text-xs">
                    #{f.rank}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="font-semibold text-gray-900">{f.label}</span>
                    <span className="block text-[11px] font-mono text-gray-400 mt-0.5">
                      {f.featureKey}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                      f.eligibleAudience === "TALENT"
                        ? "bg-purple-100 text-purple-800"
                        : f.eligibleAudience === "CLIENT"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {f.eligibleAudience}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono text-gray-600">
                    {f.eligibleUsers}
                  </td>
                  <td className="px-6 py-3.5 text-right font-bold text-gray-900">
                    {f.usedUsers}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-600 h-full rounded-full"
                          style={{ width: `${Math.min(100, f.firstUseRatePct)}%` }}
                        />
                      </div>
                      <span className="font-semibold text-xs font-mono text-gray-900 w-8 text-right">
                        {f.firstUseRatePct}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono text-gray-700">
                    {f.repeatUsers}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                      f.repeatUseRatePct >= 30
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-gray-100 text-gray-700"
                    }`}>
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
    <Suspense fallback={<div className="p-12 text-center text-gray-400">Loading feature adoption...</div>}>
      <FeaturesContent />
    </Suspense>
  );
}
