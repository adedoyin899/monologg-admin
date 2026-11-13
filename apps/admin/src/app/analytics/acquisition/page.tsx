"use client";

import { useEffect, useState, Suspense } from "react";
import {
  adminClient,
  type AcquisitionData,
} from "@/lib/admin-client";
import { AnalyticsNav } from "@/components/analytics/AnalyticsNav";
import {
  TrendingUp,
  Award,
  Globe,
  Smartphone,
  ShieldAlert,
  Calendar,
  Sparkles,
} from "lucide-react";

function AcquisitionContent() {
  const [data, setData] = useState<AcquisitionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminClient
      .getAcquisitionAnalytics()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load acquisition analytics");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <AnalyticsNav />
        <div className="p-12 text-center text-gray-600 dark:text-gray-400 animate-pulse">
          Loading acquisition analytics...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <AnalyticsNav />
        <div className="p-6 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-500/30">
          <p className="font-semibold">Error loading acquisition analytics</p>
          <p className="text-sm mt-1">{error || "No data returned"}</p>
        </div>
      </div>
    );
  }

  const totalSignups = data.bySource.reduce((acc, s) => acc + s.signups, 0);
  const maxDailyCount = Math.max(1, ...data.dailySignups.map((d) => d.count));

  return (
    <div className="space-y-6 pb-12">
      <AnalyticsNav dataFreshness={data.dataFreshness} />

      {/* Top Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#141414] p-5 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Total Signups
            </span>
            <TrendingUp className="w-4 h-4 text-monologg-red" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2 font-mono tabular-nums">
            {totalSignups.toLocaleString()}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Measured from User records</p>
        </div>

        <div className="bg-white dark:bg-[#141414] p-5 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Attributed Sources
            </span>
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2 font-mono tabular-nums">
            {data.bySource.length}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">From UserAcquisition UTMs &amp; codes</p>
        </div>

        <div className="bg-white dark:bg-[#141414] p-5 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              Unknown (No Consent) Share
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 font-semibold tabular-nums">
              {data.unknownShare.sharePct}%
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-2 font-mono tabular-nums">
            {data.unknownShare.count} of {data.unknownShare.total} users
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Signups without marketing attribution consent; never inferred or backfilled.
          </p>
        </div>
      </div>

      {/* Signups & Performance by Source */}
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-[#242424]">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Signups &amp; Performance by Source
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            Activation (profile + rate card/media for talent; brief/booking for client) and completed first-booking conversion.
          </p>
        </div>

        {/* Mobile & Tablet Stacked Cards */}
        <div className="divide-y divide-gray-200 dark:divide-[#222222] lg:hidden">
          {data.bySource.map((s) => {
            const sharePct = totalSignups > 0 ? Math.round((s.signups / totalSignups) * 100) : 0;
            const isUnknown = s.source.includes("Unknown");
            return (
              <div key={s.source} className={`p-4 space-y-2.5 text-xs ${isUnknown ? "bg-amber-50/40 dark:bg-amber-500/5" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                    {isUnknown && <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
                    {s.source}
                  </span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white tabular-nums">
                    {s.signups.toLocaleString()} ({sharePct}%)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400 tabular-nums">
                  <div className="rounded-lg bg-gray-50 dark:bg-[#1A1A1A] p-2">
                    <span className="block text-[11px]">Activated</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {s.activatedCount.toLocaleString()} ({s.activationRatePct}%)
                    </span>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-[#1A1A1A] p-2">
                    <span className="block text-[11px]">1st Booking</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {s.firstBookingCount.toLocaleString()} ({s.firstBookingRatePct}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-[#242424] text-sm tabular-nums">
            <thead className="bg-gray-50 dark:bg-[#181818] text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Source Channel</th>
                <th className="px-4 py-3 text-right">Signups</th>
                <th className="px-4 py-3 text-right">Share</th>
                <th className="px-4 py-3 text-right">Activated</th>
                <th className="px-4 py-3 text-right">Activation Rate</th>
                <th className="px-4 py-3 text-right">1st Booking</th>
                <th className="px-4 py-3 text-right">Booking Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#222222]">
              {data.bySource.map((s) => {
                const sharePct = totalSignups > 0 ? Math.round((s.signups / totalSignups) * 100) : 0;
                const isUnknown = s.source.includes("Unknown");
                return (
                  <tr
                    key={s.source}
                    className={
                      isUnknown
                        ? "bg-amber-50/40 dark:bg-amber-500/5"
                        : "hover:bg-gray-50 dark:hover:bg-[#1A1A1A]"
                    }
                  >
                    <td className="px-6 py-3.5 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      {isUnknown && <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                      <span>{s.source}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-semibold text-gray-900 dark:text-white font-mono">
                      {s.signups.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right text-gray-600 dark:text-gray-400 font-mono text-xs">
                      {sharePct}%
                    </td>
                    <td className="px-6 py-3.5 text-right text-gray-700 dark:text-gray-300 font-mono">
                      {s.activatedCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          s.activationRatePct >= 50
                            ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/25"
                            : "bg-gray-100 dark:bg-[#222222] text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {s.activationRatePct}%
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right text-gray-700 dark:text-gray-300 font-mono">
                      {s.firstBookingCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          s.firstBookingRatePct >= 20
                            ? "bg-monologg-red/10 text-monologg-red dark:text-[#FF5A5C] border border-monologg-red/25"
                            : "bg-gray-100 dark:bg-[#222222] text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {s.firstBookingRatePct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Referral Leaderboard + Daily Signups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-gray-200 dark:border-[#242424]">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Referral Code Leaderboard</h3>
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">Top Invites</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs tabular-nums">
              <thead>
                <tr className="text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-[#242424] text-left">
                  <th className="pb-2.5 font-semibold">Referral Code</th>
                  <th className="pb-2.5 font-semibold">Creator</th>
                  <th className="pb-2.5 text-right font-semibold">Invites</th>
                  <th className="pb-2.5 text-right font-semibold">Activated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#202020]">
                {data.referralLeaderboard.map((r) => (
                  <tr key={r.code} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A]">
                    <td className="py-2.5 pr-3 font-mono font-semibold text-monologg-red dark:text-[#FF5A5C]">
                      {r.code}
                    </td>
                    <td className="py-2.5 pr-3 text-gray-800 dark:text-gray-200">
                      <span className="inline-flex items-center gap-1.5">
                        <span>{r.creatorName}</span>
                        {r.hasCelebrityBadge && (
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-semibold">
                            Verified
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-semibold text-gray-900 dark:text-white font-mono">
                      {r.inviteCount}
                    </td>
                    <td className="py-2.5 text-right text-emerald-700 dark:text-emerald-400 font-semibold font-mono">
                      {r.activatedCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-gray-200 dark:border-[#242424]">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-monologg-red" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Daily Signup Volume</h3>
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Chronological</span>
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {data.dailySignups.map((d) => (
              <div
                key={d.date}
                className="flex items-center justify-between py-1.5 text-xs border-b border-gray-100 dark:border-[#202020] last:border-0"
              >
                <span className="font-mono text-gray-700 dark:text-gray-300">{d.date}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 sm:w-32 bg-gray-100 dark:bg-[#222222] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-monologg-red h-full rounded-full"
                      style={{ width: `${Math.round((d.count / maxDailyCount) * 100)}%` }}
                    />
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white w-8 text-right font-mono tabular-nums">
                    {d.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Referrer Domains, Country & Device Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-[#222222]">
            <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Top Referrer Domains</h4>
          </div>
          <div className="space-y-2 text-xs">
            {data.byReferrer.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400 italic">No external referrers recorded</p>
            ) : (
              data.byReferrer.map((r) => (
                <div key={r.referrer} className="flex justify-between items-center py-1 gap-2">
                  <span className="font-mono text-gray-700 dark:text-gray-300 truncate">{r.referrer}</span>
                  <span className="font-semibold text-gray-900 dark:text-white font-mono tabular-nums">{r.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-[#222222]">
            <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Signups by Edge Country</h4>
          </div>
          <div className="space-y-2 text-xs">
            {data.byCountry.map((c) => (
              <div key={c.country} className="flex justify-between items-center py-1">
                <span className="font-medium text-gray-700 dark:text-gray-300">{c.country}</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono tabular-nums">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-[#222222]">
            <Smartphone className="w-4 h-4 text-monologg-red" />
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Device Class (User-Agent)</h4>
          </div>
          <div className="space-y-2 text-xs">
            {data.byDevice.map((dev) => (
              <div key={dev.device} className="flex justify-between items-center py-1">
                <span className="capitalize text-gray-700 dark:text-gray-300">{dev.device}</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono tabular-nums">{dev.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AcquisitionPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-600 dark:text-gray-400">Loading acquisition analytics...</div>}>
      <AcquisitionContent />
    </Suspense>
  );
}
