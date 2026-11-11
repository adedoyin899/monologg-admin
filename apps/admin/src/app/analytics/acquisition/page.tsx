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
        <div className="p-12 text-center text-gray-400 animate-pulse">
          Loading acquisition analytics...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <AnalyticsNav />
        <div className="p-6 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <p className="font-semibold">Error loading acquisition analytics</p>
          <p className="text-sm mt-1">{error || "No data returned"}</p>
        </div>
      </div>
    );
  }

  const totalSignups = data.bySource.reduce((acc, s) => acc + s.signups, 0);

  return (
    <div className="space-y-6 pb-12">
      <AnalyticsNav dataFreshness={data.dataFreshness} />

      {/* Top Banner: Consent & Unknown Share */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Signups</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{totalSignups.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Tracked across all user types</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Attributed Sources</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{data.bySource.length}</p>
          <p className="text-xs text-gray-500 mt-1">Unique channels identified</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              Unknown (No Consent) Share
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
              {data.unknownShare.sharePct}%
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900 mt-2">
            {data.unknownShare.count} of {data.unknownShare.total} users
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Visitors who declined analytics cookies or signed up with no marketing attribution consent.
          </p>
        </div>
      </div>

      {/* Primary Table: Acquisition by Source with Activation & First Booking */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Signups & Performance by Source</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Activation (profile + rate card/media for talent, brief/booking for client) and first-booking rates.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left">Source Channel</th>
                <th className="px-6 py-3 text-right">Signups</th>
                <th className="px-6 py-3 text-right">Share</th>
                <th className="px-6 py-3 text-right">Activated</th>
                <th className="px-6 py-3 text-right">Activation Rate</th>
                <th className="px-6 py-3 text-right">1st Booking</th>
                <th className="px-6 py-3 text-right">Booking Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.bySource.map((s) => {
                const sharePct = totalSignups > 0 ? Math.round((s.signups / totalSignups) * 100) : 0;
                const isUnknown = s.source.includes("Unknown");
                return (
                  <tr key={s.source} className={isUnknown ? "bg-amber-50/40" : "hover:bg-gray-50/60"}>
                    <td className="px-6 py-3.5 font-medium text-gray-900 flex items-center gap-2">
                      {isUnknown && <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />}
                      <span>{s.source}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-semibold text-gray-900">
                      {s.signups.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right text-gray-500 font-mono text-xs">
                      {sharePct}%
                    </td>
                    <td className="px-6 py-3.5 text-right text-gray-700">
                      {s.activatedCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        s.activationRatePct >= 50
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {s.activationRatePct}%
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right text-gray-700">
                      {s.firstBookingCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        s.firstBookingRatePct >= 20
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : "bg-gray-100 text-gray-700"
                      }`}>
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

      {/* Grid: Referral Leaderboard + Daily Signups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referral Code Leaderboard */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-gray-900">Referral Code Leaderboard</h3>
            </div>
            <span className="text-xs text-gray-500 font-mono">Top Invites</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100 text-left">
                  <th className="pb-2 font-medium">Referral Code</th>
                  <th className="pb-2 font-medium">Creator</th>
                  <th className="pb-2 text-right font-medium">Invites</th>
                  <th className="pb-2 text-right font-medium">Activated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.referralLeaderboard.map((r) => (
                  <tr key={r.code} className="hover:bg-gray-50/50">
                    <td className="py-2.5 font-mono font-semibold text-purple-700">
                      {r.code}
                    </td>
                    <td className="py-2.5 text-gray-700 flex items-center gap-1.5">
                      <span>{r.creatorName}</span>
                      {r.hasCelebrityBadge && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">
                          Celeb
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-gray-900">
                      {r.inviteCount}
                    </td>
                    <td className="py-2.5 text-right text-emerald-600 font-medium">
                      {r.activatedCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily Signups Trend */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Daily Signup Volume</h3>
            </div>
            <span className="text-xs text-gray-500">Chronological</span>
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {data.dailySignups.map((d) => (
              <div key={d.date} className="flex items-center justify-between py-1.5 text-xs border-b border-gray-50">
                <span className="font-mono text-gray-600">{d.date}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full"
                      style={{ width: `${Math.min(100, d.count * 10)}%` }}
                    />
                  </div>
                  <span className="font-bold text-gray-900 w-8 text-right">{d.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Referrer Domains, Country & Device Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
            <Globe className="w-4 h-4 text-blue-600" />
            <h4 className="font-semibold text-sm text-gray-900">Top Referrer Domains</h4>
          </div>
          <div className="space-y-2 text-xs">
            {data.byReferrer.length === 0 ? (
              <p className="text-gray-400 italic">No external referrers recorded</p>
            ) : (
              data.byReferrer.map((r) => (
                <div key={r.referrer} className="flex justify-between items-center py-1">
                  <span className="font-mono text-gray-700 truncate max-w-[160px]">{r.referrer}</span>
                  <span className="font-semibold text-gray-900">{r.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
            <Globe className="w-4 h-4 text-emerald-600" />
            <h4 className="font-semibold text-sm text-gray-900">Signups by Country</h4>
          </div>
          <div className="space-y-2 text-xs">
            {data.byCountry.map((c) => (
              <div key={c.country} className="flex justify-between items-center py-1">
                <span className="font-medium text-gray-700">{c.country}</span>
                <span className="font-semibold text-gray-900">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
            <Smartphone className="w-4 h-4 text-purple-600" />
            <h4 className="font-semibold text-sm text-gray-900">Device Breakdown</h4>
          </div>
          <div className="space-y-2 text-xs">
            {data.byDevice.map((dev) => (
              <div key={dev.device} className="flex justify-between items-center py-1">
                <span className="capitalize text-gray-700">{dev.device}</span>
                <span className="font-semibold text-gray-900">{dev.count}</span>
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
    <Suspense fallback={<div className="p-12 text-center text-gray-400">Loading acquisition analytics...</div>}>
      <AcquisitionContent />
    </Suspense>
  );
}
