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
        <div className="p-12 text-center text-gray-600 dark:text-gray-400 animate-pulse bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424]">
          Evaluating marketplace liquidity &amp; health...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <AnalyticsNav />
        <div className="p-6 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 rounded-xl border border-red-200 dark:border-red-900/60">
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

      {/* Top Liquidity Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#141414] p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              First App &lt;48h
            </span>
            <Zap className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
          </div>
          <p className="text-2xl font-extrabold tabular-nums text-gray-900 dark:text-gray-100 mt-2">
            {liquidity.briefsWithin48HoursPct}%
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 tabular-nums">
            {liquidity.briefsWithin48HoursCount} of {liquidity.totalBriefsCount} briefs
          </p>
        </div>

        <div className="bg-white dark:bg-[#141414] p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Median to App
            </span>
            <Clock className="w-4 h-4 text-[#F92729] shrink-0" />
          </div>
          <p className="text-2xl font-extrabold tabular-nums text-[#D91B1D] dark:text-[#FF5C5E] mt-2">
            {liquidity.medianHoursToFirstApplication} hrs
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">From brief publish</p>
        </div>

        <div className="bg-white dark:bg-[#141414] p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Apps / Brief
            </span>
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          </div>
          <p className="text-2xl font-extrabold tabular-nums text-gray-900 dark:text-gray-100 mt-2">
            {liquidity.avgApplicationsPerBrief}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Mean applicant pool</p>
        </div>

        <div className="bg-white dark:bg-[#141414] p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Selection Rate
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
          <p className="text-2xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400 mt-2">
            {liquidity.selectionRatePct}%
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Briefs with winner</p>
        </div>

        <div className="bg-white dark:bg-[#141414] p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Cap Reached
            </span>
            <AlertCircle className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0" />
          </div>
          <p className="text-2xl font-extrabold tabular-nums text-gray-900 dark:text-gray-100 mt-2">
            {liquidity.capReachedRatePct}%
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Briefs filled to cap</p>
        </div>
      </div>

      {/* Supply Quality by Niche & Calendar Availability */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Supply Quality */}
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm overflow-hidden lg:col-span-2">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-[#242424]">
            <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
              Supply Profile Quality by Niche
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Creator readiness from database records: verification status, rate cards, availability blocks, and portfolio media.
            </p>
          </div>

          {/* Mobile Niche Cards */}
          <div className="md:hidden divide-y divide-gray-200 dark:divide-[#242424]">
            {data.supplyByNiche.map((s) => (
              <div key={s.niche} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {s.niche}
                  </span>
                  <span className="text-xs font-bold tabular-nums px-2 py-0.5 rounded bg-gray-100 dark:bg-[#1E1E1E] text-gray-800 dark:text-gray-200">
                    {s.count} creators
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs tabular-nums">
                  <div>
                    <span className="block text-[11px] text-gray-600 dark:text-gray-400">Verified</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">{s.verifiedPct}%</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-gray-600 dark:text-gray-400">Rate Card</span>
                    <span className="font-semibold text-[#D91B1D] dark:text-[#FF5C5E]">{s.withRateCardPct}%</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-gray-600 dark:text-gray-400">Calendar</span>
                    <span className="font-semibold text-blue-700 dark:text-blue-400">{s.withAvailabilityPct}%</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-gray-600 dark:text-gray-400">Media</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{s.withMediaPct}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Niche Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-[#242424] text-xs">
              <thead className="bg-gray-50 dark:bg-[#1A1A1A] text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">Niche</th>
                  <th className="px-5 py-3 text-right">Creators</th>
                  <th className="px-5 py-3 text-right">Verified %</th>
                  <th className="px-5 py-3 text-right">Rate Card %</th>
                  <th className="px-5 py-3 text-right">Calendar %</th>
                  <th className="px-5 py-3 text-right">Media %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-[#242424]">
                {data.supplyByNiche.map((s) => (
                  <tr key={s.niche} className="hover:bg-gray-50/50 dark:hover:bg-[#1A1A1A]">
                    <td className="px-5 py-3 font-semibold text-gray-900 dark:text-gray-100">
                      {s.niche}
                    </td>
                    <td className="px-5 py-3 text-right font-bold tabular-nums text-gray-900 dark:text-gray-100">
                      {s.count}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-medium">
                        {s.verifiedPct}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-mono tabular-nums text-[#D91B1D] dark:text-[#FF5C5E] font-medium">
                        {s.withRateCardPct}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-mono tabular-nums text-blue-700 dark:text-blue-400 font-medium">
                        {s.withAvailabilityPct}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-mono tabular-nums text-gray-700 dark:text-gray-300">
                        {s.withMediaPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calendar Utilization */}
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-[#242424]">
            <Calendar className="w-5 h-5 text-[#F92729] shrink-0" />
            <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
              Calendar &amp; Slot Utilization
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5 gap-2">
                <span className="text-gray-600 dark:text-gray-400">Talent with Calendar:</span>
                <span className="font-bold tabular-nums text-gray-900 dark:text-gray-100">
                  {availabilityUse.talentWithCalendarCount} / {availabilityUse.activeTalentCount} ({availabilityUse.calendarConfiguredPct}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-[#1E1E1E] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#F92729] h-full rounded-full"
                  style={{ width: `${Math.min(100, availabilityUse.calendarConfiguredPct)}%` }}
                />
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-[#242424] pt-3">
              <div className="flex justify-between text-xs mb-1.5 gap-2">
                <span className="text-gray-600 dark:text-gray-400">Booked Slot Ratio:</span>
                <span className="font-bold tabular-nums text-gray-900 dark:text-gray-100">
                  {availabilityUse.bookedSlots} / {availabilityUse.totalSlots} ({availabilityUse.bookedSlotsPct}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-[#1E1E1E] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, availabilityUse.bookedSlotsPct)}%` }}
                />
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-[#191919] p-3.5 rounded-lg border border-gray-200 dark:border-[#242424] text-xs">
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                Direct booking slot health
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Derived from <code className="font-mono">AvailabilityBlock</code> and direct <code className="font-mono">Booking</code> slot records.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Unmet Demand & Demand by Niche/Week */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Zero-Result Searches */}
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-gray-100 dark:border-[#242424] mb-3">
            <div className="flex items-start gap-2 min-w-0">
              <Search className="w-4 h-4 text-[#F92729] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                  Unmet Demand: Zero-Result Searches
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  Privacy invariant: niche and filter keys only — raw query strings are never exposed.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 px-2 py-0.5 rounded font-bold border border-rose-200 dark:border-rose-900/60 shrink-0">
              Zero Matches
            </span>
          </div>

          {/* Mobile Zero-Result Cards */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-[#242424]">
            {data.unmetDemand.map((u, i) => (
              <div key={`${u.niche}-${i}`} className="py-3 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{u.niche}</span>
                  <span className="font-bold font-mono tabular-nums text-[#D91B1D] dark:text-[#FF5C5E]">
                    {u.zeroResultCount} queries
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {u.filterKeys.map((fk) => (
                    <span
                      key={fk}
                      className="inline-flex items-center gap-1 font-mono text-[11px] bg-gray-100 dark:bg-[#1E1E1E] text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded"
                    >
                      <Key className="w-2.5 h-2.5 text-gray-500 dark:text-gray-400" />
                      {fk}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Zero-Result Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-[#242424] text-left">
                  <th className="pb-2 font-semibold">Niche Requested</th>
                  <th className="pb-2 font-semibold">Filter Keys Applied</th>
                  <th className="pb-2 text-right font-semibold">Zero-Result Queries</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#242424]">
                {data.unmetDemand.map((u, i) => (
                  <tr key={`${u.niche}-${i}`} className="hover:bg-gray-50/50 dark:hover:bg-[#1A1A1A]">
                    <td className="py-2.5 font-semibold text-gray-900 dark:text-gray-100">
                      {u.niche}
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {u.filterKeys.map((fk) => (
                          <span
                            key={fk}
                            className="inline-flex items-center gap-1 font-mono text-[11px] bg-gray-100 dark:bg-[#1E1E1E] text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded"
                          >
                            <Key className="w-2.5 h-2.5 text-gray-500 dark:text-gray-400" />
                            {fk}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-bold tabular-nums text-[#D91B1D] dark:text-[#FF5C5E] font-mono">
                      {u.zeroResultCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Demand by Niche and Week */}
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-[#242424] mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Store className="w-4 h-4 text-[#F92729] shrink-0" />
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                Demand by Niche &amp; Week
              </h3>
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 shrink-0">
              Briefs / Bookings
            </span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-[#1E1E1E] max-h-[300px] overflow-y-auto pr-1">
            {data.demandByNicheAndWeek.length === 0 ? (
              <p className="text-xs text-gray-600 dark:text-gray-400 italic py-4 text-center">
                No weekly demand recorded yet
              </p>
            ) : (
              data.demandByNicheAndWeek.map((d, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{d.niche}</span>
                    <span className="text-gray-600 dark:text-gray-400 font-mono">({d.week})</span>
                  </div>
                  <div className="flex items-center gap-4 tabular-nums">
                    <span className="text-blue-700 dark:text-blue-400 font-medium">
                      {d.briefsCount} briefs
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                      {d.bookingsCount} bookings
                    </span>
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
    <Suspense
      fallback={
        <div className="p-12 text-center text-gray-600 dark:text-gray-400">
          Loading marketplace health...
        </div>
      }
    >
      <MarketplaceContent />
    </Suspense>
  );
}
