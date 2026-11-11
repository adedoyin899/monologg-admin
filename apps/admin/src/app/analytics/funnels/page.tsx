"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  adminClient,
  type FunnelData,
  type FunnelStepData,
  type DroppedUser,
} from "@/lib/admin-client";
import { AnalyticsNav } from "@/components/analytics/AnalyticsNav";
import {
  Filter,
  ArrowRight,
  Clock,
  AlertTriangle,
  UserX,
  ExternalLink,
  Users,
  CheckCircle2,
  ChevronRight,
  TrendingDown,
} from "lucide-react";

const FUNNELS = [
  { id: "TALENT_ONBOARDING", label: "Talent Onboarding (7 Steps)", desc: "From signup to first booking" },
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
        <div className="p-12 text-center text-gray-400 animate-pulse">
          Loading funnel telemetry...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <AnalyticsNav />
        <div className="p-6 bg-red-50 text-red-700 rounded-lg border border-red-200">
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
              onClick={() => handleSelectFunnel(f.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? "bg-purple-50/70 border-purple-300 ring-2 ring-purple-500/20 shadow-sm"
                  : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${isSelected ? "text-purple-950" : "text-gray-900"}`}>
                  {f.label}
                </span>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
              </div>
              <p className="text-xs text-gray-500 mt-1">{f.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Summary Banner: Overall Conversion & Biggest Drop-Off */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Overall Conversion</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-gray-900">{data.overallConversionPct}%</span>
            <span className="text-xs text-gray-500 font-medium">end-to-end</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            From step 1 ({data.steps[0]?.label}) to step {data.steps.length} ({data.steps[data.steps.length - 1]?.label})
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" />
              Primary Bottleneck (Biggest Drop-Off)
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
              Action Required
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900 mt-2">{data.biggestDropOffStep}</p>
          <p className="text-xs text-gray-500 mt-1">
            This transition loses the highest relative percentage of users. Click step below to review dropped users.
          </p>
        </div>
      </div>

      {/* Visual Funnel Step Sequence */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">{data.name}</h3>
            <p className="text-xs text-gray-500">{data.description}</p>
          </div>
          <span className="text-xs text-gray-400 font-medium">Click step to view drop-offs</span>
        </div>

        <div className="space-y-3">
          {data.steps.map((step, idx) => {
            const isSelected = selectedStepIdx === idx;
            const isDropoffPeak = data.biggestDropOffStep.includes(step.label);
            const prevStep = idx > 0 ? data.steps[idx - 1] : null;

            return (
              <div
                key={step.stepId}
                onClick={() => setSelectedStepIdx(idx)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-purple-50/50 border-purple-400 ring-2 ring-purple-500/10 shadow-sm"
                    : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/30"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isSelected ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700"
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 text-sm">{step.label}</span>
                        {isDropoffPeak && (
                          <span className="text-[10px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-full">
                            Bottleneck
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="font-mono">{step.count.toLocaleString()} users</span>
                        {idx > 0 && (
                          <span className="text-gray-400 font-medium">
                            • {step.conversionFromPreviousPct}% from {prevStep?.label}
                          </span>
                        )}
                        {step.medianTimeToNextStepMinutes !== null && (
                          <span className="flex items-center gap-1 text-purple-700 font-medium">
                            <Clock className="w-3 h-3" />
                            ~{step.medianTimeToNextStepMinutes} min median
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-48 bg-gray-100 h-3 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className={`h-full rounded-full ${isDropoffPeak ? "bg-rose-500" : "bg-purple-600"}`}
                        style={{ width: `${Math.max(4, step.overallConversionPct)}%` }}
                      />
                    </div>
                    <span className="font-mono font-bold text-sm text-gray-900 w-12 text-right">
                      {step.overallConversionPct}%
                    </span>
                    <ChevronRight className={`w-4 h-4 text-gray-400 ${isSelected ? "text-purple-600 rotate-90 sm:rotate-0" : ""}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Step Breakdown & Dropped Users Drawer */}
      {selectedStep && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dimension Breakdowns for Selected Step */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h4 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2">
              Step {selectedStepIdx + 1} Segment Breakdowns
            </h4>

            {/* By Source */}
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">By Source</span>
              <div className="space-y-1 mt-1 text-xs">
                {Object.entries(selectedStep.breakdown.bySource).map(([src, cnt]) => (
                  <div key={src} className="flex justify-between py-0.5">
                    <span className="text-gray-600">{src}</span>
                    <span className="font-mono font-semibold text-gray-900">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Country */}
            <div className="border-t border-gray-50 pt-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">By Country</span>
              <div className="space-y-1 mt-1 text-xs">
                {Object.entries(selectedStep.breakdown.byCountry).map(([ctry, cnt]) => (
                  <div key={ctry} className="flex justify-between py-0.5">
                    <span className="text-gray-600">{ctry}</span>
                    <span className="font-mono font-semibold text-gray-900">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Device */}
            <div className="border-t border-gray-50 pt-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">By Device</span>
              <div className="space-y-1 mt-1 text-xs">
                {Object.entries(selectedStep.breakdown.byDevice).map(([dev, cnt]) => (
                  <div key={dev} className="flex justify-between py-0.5">
                    <span className="text-gray-600 capitalize">{dev}</span>
                    <span className="font-mono font-semibold text-gray-900">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dropped Users Table with Links to User 360 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 lg:col-span-2">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-rose-600" />
                <div>
                  <h4 className="font-bold text-sm text-gray-900">
                    Dropped Users at Step {selectedStepIdx + 1}: {selectedStep.label}
                  </h4>
                  <p className="text-xs text-gray-500">
                    Users who reached this step but did not advance to the next step.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono bg-rose-50 text-rose-700 px-2 py-1 rounded border border-rose-200 font-semibold">
                {selectedStep.droppedUsers.length} Sampled
              </span>
            </div>

            {selectedStep.droppedUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                No dropped users recorded or final funnel stage reached.
              </div>
            ) : (
              <div className="overflow-x-auto mt-3">
                <table className="min-w-full text-xs divide-y divide-gray-100">
                  <thead className="bg-gray-50 text-gray-500 text-left">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Masked Name</th>
                      <th className="py-2 px-3 font-semibold">Masked Email</th>
                      <th className="py-2 px-3 font-semibold">Type</th>
                      <th className="py-2 px-3 font-semibold">Signed Up</th>
                      <th className="py-2 px-3 text-right font-semibold">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedStep.droppedUsers.map((u) => (
                      <tr key={u.userId} className="hover:bg-gray-50/60">
                        <td className="py-2.5 px-3 font-medium text-gray-900">{u.name}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-600">{u.email}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            u.userType === "TALENT"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {u.userType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-500 font-mono">
                          {u.createdAt.slice(0, 10)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            href={`/users/${u.userId}`}
                            className="inline-flex items-center gap-1 text-purple-700 hover:text-purple-900 font-semibold text-xs bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded transition-colors"
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FunnelsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-400">Loading funnels...</div>}>
      <FunnelsContent />
    </Suspense>
  );
}
