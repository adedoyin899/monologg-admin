"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  adminClient,
  type FunnelData,
  type FunnelStepData,
} from "@/lib/admin-client";
import { AnalyticsNav } from "@/components/analytics/AnalyticsNav";
import {
  Clock,
  UserX,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
  TrendingDown,
} from "lucide-react";

const FUNNELS = [
  { id: "TALENT_ONBOARDING", label: "Talent Onboarding (7 Steps)", desc: "From signup to first completed booking" },
  { id: "CLIENT_LIFECYCLE", label: "Client Lifecycle (5 Steps)", desc: "From brief creation to escrow release" },
  { id: "EXTERNAL_BOOKING", label: "External Booking (5 Steps)", desc: "From storefront view to escrow hold" },
] as const;

function FunnelsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFunnelId = (searchParams.get("funnelId") || "TALENT_ONBOARDING") as
    | "TALENT_ONBOARDING"
    | "CLIENT_LIFECYCLE"
    | "EXTERNAL_BOOKING";

  const [data, setData] = useState<FunnelData | null>(null);
  const [selectedStepIdx, setSelectedStepIdx] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    adminClient
      .getFunnelAnalytics(currentFunnelId)
      .then((res) => {
        setData(res);
        setSelectedStepIdx(0);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load funnel analytics");
        setLoading(false);
      });
  }, [currentFunnelId]);

  const handleSelectFunnel = (id: string) => {
    router.push(`/analytics/funnels?funnelId=${id}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <AnalyticsNav />
        <div className="p-12 text-center text-gray-600 dark:text-gray-400 animate-pulse">
          Loading funnel telemetry...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <AnalyticsNav />
        <div className="p-6 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-500/30">
          <p className="font-semibold">Error loading funnel analytics</p>
          <p className="text-sm mt-1">{error || "No data returned"}</p>
        </div>
      </div>
    );
  }

  const selectedStep: FunnelStepData | undefined = data.steps[selectedStepIdx];

  return (
    <div className="space-y-6 pb-12">
      <AnalyticsNav dataFreshness={data.dataFreshness} />

      {/* Funnel Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {FUNNELS.map((f) => {
          const isSelected = currentFunnelId === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => handleSelectFunnel(f.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? "bg-monologg-red/10 border-monologg-red/40 dark:bg-monologg-red/15 shadow-sm"
                  : "bg-white dark:bg-[#141414] border-gray-200 dark:border-[#242424] hover:border-gray-300 dark:hover:border-[#333333]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm font-bold ${isSelected ? "text-monologg-red dark:text-[#FF5A5C]" : "text-gray-900 dark:text-white"}`}>
                  {f.label}
                </span>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-monologg-red dark:text-[#FF5A5C] shrink-0" />}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{f.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#141414] p-5 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            Overall Conversion
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white font-mono tabular-nums">
              {data.overallConversionPct}%
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">end-to-end</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Step 1 ({data.steps[0]?.label}) to step {data.steps.length} ({data.steps[data.steps.length - 1]?.label})
          </p>
        </div>

        <div className="bg-white dark:bg-[#141414] p-5 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 shrink-0" />
              Primary Bottleneck (Biggest Drop-Off)
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 font-bold">
              Highest Friction
            </span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-2">
            {data.biggestDropOffStep}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Select any funnel step below to inspect segment distribution and dropped accounts.
          </p>
        </div>
      </div>

      {/* Funnel Step Sequence */}
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-200 dark:border-[#242424]">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">{data.name}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">{data.description}</p>
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
            Click step to inspect drop-offs
          </span>
        </div>

        <div className="space-y-3">
          {data.steps.map((step, idx) => {
            const isSelected = selectedStepIdx === idx;
            const isDropoffPeak = data.biggestDropOffStep.includes(step.label);
            const prevStep = idx > 0 ? data.steps[idx - 1] : null;

            return (
              <button
                key={step.stepId}
                type="button"
                onClick={() => setSelectedStepIdx(idx)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? "bg-monologg-red/10 border-monologg-red/40 dark:bg-monologg-red/15 shadow-sm"
                    : "bg-white dark:bg-[#181818] border-gray-200 dark:border-[#262626] hover:border-gray-300 dark:hover:border-[#363636]"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                        isSelected
                          ? "bg-monologg-red text-white"
                          : "bg-gray-100 dark:bg-[#242424] text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{step.label}</span>
                        {isDropoffPeak && (
                          <span className="text-[11px] bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 font-semibold px-2 py-0.5 rounded-full">
                            Bottleneck
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-400 mt-1">
                        <span className="font-mono tabular-nums">{step.count.toLocaleString()} users</span>
                        {idx > 0 && (
                          <span className="font-medium">
                            &bull; {step.conversionFromPreviousPct}% from {prevStep?.label}
                          </span>
                        )}
                        {step.medianTimeToNextStepMinutes !== null && (
                          <span className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-300 font-medium">
                            <Clock className="w-3 h-3" />
                            ~{step.medianTimeToNextStepMinutes}m median
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    <div className="flex-1 sm:w-48 bg-gray-100 dark:bg-[#262626] h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isDropoffPeak ? "bg-rose-500" : "bg-monologg-red"}`}
                        style={{ width: `${Math.max(4, step.overallConversionPct)}%` }}
                      />
                    </div>
                    <span className="font-mono font-bold text-sm text-gray-900 dark:text-white w-12 text-right tabular-nums">
                      {step.overallConversionPct}%
                    </span>
                    <ChevronRight className={`w-4 h-4 text-gray-500 dark:text-gray-400 ${isSelected ? "text-monologg-red dark:text-[#FF5A5C]" : ""}`} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Step Breakdown & Dropped Users */}
      {selectedStep && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm p-5 space-y-4">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white border-b border-gray-200 dark:border-[#242424] pb-2">
              Step {selectedStepIdx + 1} Segment Breakdowns
            </h4>

            <div>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">By Source</span>
              <div className="space-y-1.5 mt-1.5 text-xs">
                {Object.entries(selectedStep.breakdown.bySource).map(([src, cnt]) => (
                  <div key={src} className="flex justify-between py-0.5">
                    <span className="text-gray-700 dark:text-gray-300">{src}</span>
                    <span className="font-mono font-semibold text-gray-900 dark:text-white tabular-nums">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-[#222222] pt-3">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">By Country</span>
              <div className="space-y-1.5 mt-1.5 text-xs">
                {Object.entries(selectedStep.breakdown.byCountry).map(([ctry, cnt]) => (
                  <div key={ctry} className="flex justify-between py-0.5">
                    <span className="text-gray-700 dark:text-gray-300">{ctry}</span>
                    <span className="font-mono font-semibold text-gray-900 dark:text-white tabular-nums">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-[#222222] pt-3">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">By Device</span>
              <div className="space-y-1.5 mt-1.5 text-xs">
                {Object.entries(selectedStep.breakdown.byDevice).map(([dev, cnt]) => (
                  <div key={dev} className="flex justify-between py-0.5">
                    <span className="text-gray-700 dark:text-gray-300 capitalize">{dev}</span>
                    <span className="font-mono font-semibold text-gray-900 dark:text-white tabular-nums">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm p-5 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-200 dark:border-[#242424]">
              <div className="flex items-center gap-2 min-w-0">
                <UserX className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                    Dropped Users at Step {selectedStepIdx + 1}: {selectedStep.label}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Masked sample of accounts who reached this step without advancing.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 px-2.5 py-1 rounded border border-rose-200 dark:border-rose-500/30 font-semibold">
                {selectedStep.droppedUsers.length} Sampled
              </span>
            </div>

            {selectedStep.droppedUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-600 dark:text-gray-400 text-xs">
                No dropped users sampled or final funnel stage reached.
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="divide-y divide-gray-100 dark:divide-[#222222] mt-3 md:hidden">
                  {selectedStep.droppedUsers.map((u) => (
                    <div key={u.userId} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">{u.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              u.userType === "TALENT"
                                ? "bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300"
                                : "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300"
                            }`}
                          >
                            {u.userType}
                          </span>
                        </div>
                        <p className="font-mono text-gray-600 dark:text-gray-400 truncate mt-0.5">{u.email}</p>
                      </div>
                      <Link
                        href={`/users/${u.userId}`}
                        className="inline-flex min-h-[36px] shrink-0 items-center gap-1 text-monologg-red dark:text-[#FF5A5C] font-semibold bg-monologg-red/10 px-2.5 py-1 rounded-lg"
                      >
                        <span>360</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto mt-3">
                  <table className="min-w-full text-xs divide-y divide-gray-200 dark:divide-[#242424] tabular-nums">
                    <thead className="bg-gray-50 dark:bg-[#181818] text-gray-600 dark:text-gray-400 text-left">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Masked Name</th>
                        <th className="py-2.5 px-3 font-semibold">Masked Email</th>
                        <th className="py-2.5 px-3 font-semibold">Type</th>
                        <th className="py-2.5 px-3 font-semibold">Signed Up</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#222222]">
                      {selectedStep.droppedUsers.map((u) => (
                        <tr key={u.userId} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A]">
                          <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">{u.name}</td>
                          <td className="py-2.5 px-3 font-mono text-gray-700 dark:text-gray-300">{u.email}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                u.userType === "TALENT"
                                  ? "bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300"
                                  : "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300"
                              }`}
                            >
                              {u.userType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400 font-mono">
                            {u.createdAt.slice(0, 10)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Link
                              href={`/users/${u.userId}`}
                              className="inline-flex items-center gap-1 text-monologg-red dark:text-[#FF5A5C] font-semibold text-xs bg-monologg-red/10 hover:bg-monologg-red/20 px-2.5 py-1 rounded transition-colors"
                            >
                              <span>User 360</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FunnelsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-600 dark:text-gray-400">Loading funnels...</div>}>
      <FunnelsContent />
    </Suspense>
  );
}
