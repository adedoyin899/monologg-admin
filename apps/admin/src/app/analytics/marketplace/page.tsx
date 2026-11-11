"use client";

import { useEffect, useState, Suspense } from "react";
import {
  adminClient,
  type MarketplaceHealthData,
} from "@/lib/admin-client";
import { AnalyticsNav } from "@/components/analytics/AnalyticsNav";
import {
  Store,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Zap,
  Users,
  Search,
  Key,
} from "lucide-react";

function MarketplaceContent() {
  const [data, setData] = useState<MarketplaceHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminClient
      .getMarketplaceHealthAnalytics()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load marketplace health analytics");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <AnalyticsNav />
        <div className="p-12 text-center text-gray-400 animate-pulse">
          Evaluating marketplace liquidity & health...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <AnalyticsNav />
        <div className="p-6 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <p className="font-semibold">Error loading marketplace health analytics</p>
          <p className="text-sm mt-1">{error || "No data returned"}</p>
        </div>
      </div>
    );
  }

  const { liquidity, availabilityUse } = data;

  return (
    <div className="space-y-6 pb-12">
      <AnalyticsNav dataFreshness={data.dataFreshness} />

      {/* Top Banner: Liquidity Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase">First App &lt;48h</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900 mt-2">{liquidity.briefsWithin48HoursPct}%</p>
          <p className="text-xs text-gray-400 mt-1">
            {liquidity.briefsWithin48HoursCount} of {liquidity.totalBriefsCount} briefs
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase">Median Time to App</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-purple-700 mt-2">{liquidity.medianHoursToFirstApplication} hrs</p>
          <p className="text-xs text-gray-400 mt-1">From brief publish</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase">Apps / Brief</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900 mt-2">{liquidity.avgApplicationsPerBrief}</p>
          <p className="text-xs text-gray-400 mt-1">Average applicant pool</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase">Selection Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 mt-2">{liquidity.selectionRatePct}%</p>
          <p className="text-xs text-gray-400 mt-1">Briefs with winner selected</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase">Cap Reached Rate</span>
            <AlertCircle className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-purple-900 mt-2">{liquidity.capReachedRatePct}%</p>
          <p className="text-xs text-gray-400 mt-1">Briefs filled to cap</p>
        </div>
      </div>

      {/* Grid: Supply by Niche Table & Calendar Availability Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Supply Quality by Niche */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden lg:col-span-2">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-bold text-base text-gray-900">Supply Profile Quality by Niche</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Creator distribution and readiness signals (verified, rate card configured, availability block, media uploads).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">Niche</th>
                  <th className="px-5 py-3 text-right">Creators</th>
                  <th className="px-5 py-3 text-right">Verified %</th>
                  <th className="px-5 py-3 text-right">Rate Card %</th>
                  <th className="px-5 py-3 text-right">Calendar %</th>
                  <th className="px-5 py-3 text-right">Media %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.supplyByNiche.map((s) => (
                  <tr key={s.niche} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-semibold text-gray-900">{s.niche}</td>
                    <td className="px-5 py-3 text-right font-bold text-gray-900">{s.count}</td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-mono text-emerald-700 font-medium">{s.verifiedPct}%</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-mono text-purple-700 font-medium">{s.withRateCardPct}%</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-mono text-blue-700 font-medium">{s.withAvailabilityPct}%</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-mono text-gray-700">{s.withMediaPct}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Availability Calendar Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Calendar className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-base text-gray-900">Calendar & Slot Utilization</h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Talent with Calendar:</span>
                <span className="font-bold text-gray-900">
                  {availabilityUse.talentWithCalendarCount} / {availabilityUse.activeTalentCount} ({availabilityUse.calendarConfiguredPct}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full"
                  style={{ width: `${availabilityUse.calendarConfiguredPct}%` }}
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Booked Slot Ratio:</span>
                <span className="font-bold text-gray-900">
                  {availabilityUse.bookedSlots} / {availabilityUse.totalSlots} ({availabilityUse.bookedSlotsPct}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full"
                  style={{ width: `${availabilityUse.bookedSlotsPct}%` }}
                />
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 mt-2">
              <p className="font-semibold text-gray-800">Direct booking slot health</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Higher booked slot percentage indicates high liquidity and booking conversion on talent availability blocks.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Unmet Demand (Zero-Result Searches) & Demand by Niche and Week */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unmet Demand: Zero-Result Talent Searches (Filter Keys ONLY!) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-rose-600" />
              <div>
                <h3 className="font-bold text-sm text-gray-900">Unmet Demand: Zero-Result Searches</h3>
                <p className="text-[11px] text-gray-500">
                  Strict Privacy: Shows niche and filter keys ONLY. Specific user search values are never exposed.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-bold border border-rose-200">
              Zero Matches
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100 text-left">
                  <th className="pb-2 font-medium">Niche Requested</th>
                  <th className="pb-2 font-medium">Filter Keys Applied</th>
                  <th className="pb-2 text-right font-medium">Zero-Result Queries</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.unmetDemand.map((u, i) => (
                  <tr key={`${u.niche}-${i}`} className="hover:bg-gray-50/50">
                    <td className="py-2.5 font-semibold text-gray-900">{u.niche}</td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {u.filterKeys.map((fk) => (
                          <span
                            key={fk}
                            className="inline-flex items-center gap-1 font-mono text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded"
                          >
                            <Key className="w-2.5 h-2.5 text-gray-400" />
                            {fk}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-bold text-rose-700 font-mono">
                      {u.zeroResultCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Demand by Niche and Week */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-purple-600" />
              <h3 className="font-bold text-sm text-gray-900">Demand by Niche & Week</h3>
            </div>
            <span className="text-xs text-gray-400">Briefs / Bookings</span>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {data.demandByNicheAndWeek.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4 text-center">No weekly demand recorded yet</p>
            ) : (
              data.demandByNicheAndWeek.map((d, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 text-xs border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{d.niche}</span>
                    <span className="text-gray-400 font-mono">({d.week})</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-blue-700 font-medium">{d.briefsCount} briefs</span>
                    <span className="text-emerald-700 font-bold">{d.bookingsCount} bookings</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketplaceHealthPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-400">Loading marketplace health...</div>}>
      <MarketplaceContent />
    </Suspense>
  );
}
