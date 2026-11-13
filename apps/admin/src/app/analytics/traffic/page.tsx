"use client";

import { useEffect, useState, Suspense } from "react";
import {
  adminClient,
  type TrafficData,
} from "@/lib/admin-client";
import { AnalyticsNav } from "@/components/analytics/AnalyticsNav";
import {
  ShieldCheck,
  Globe,
  Smartphone,
  Laptop,
  Compass,
  FileText,
  UserCheck,
  Calendar,
} from "lucide-react";

function TrafficContent() {
  const [data, setData] = useState<TrafficData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminClient
      .getTrafficAnalytics()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load traffic analytics");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <AnalyticsNav />
        <div className="p-12 text-center text-gray-600 dark:text-gray-400 animate-pulse bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424]">
          Loading traffic telemetry...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <AnalyticsNav />
        <div className="p-6 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 rounded-xl border border-red-200 dark:border-red-900/60">
          <p className="font-semibold">Error loading traffic analytics</p>
          <p className="text-sm mt-1">{error || "No data returned"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <AnalyticsNav dataFreshness={data.dataFreshness} />

      {/* Consent Gate Banner (Monologg elevated dark surface) */}
      <div className="bg-gray-900 dark:bg-[#141414] text-white p-4 sm:p-5 rounded-xl border border-gray-800 dark:border-[#242424] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#1F1F1F] border border-[#2E2E2E] shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-gray-300">
                Consent-Gated Telemetry
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 tabular-nums">
                {data.consentRatePct}% Opt-in
              </span>
            </div>
            <p className="text-sm text-gray-100 mt-0.5 font-medium">
              {data.consentRateNotice}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-300 max-w-md">
          Country comes from edge headers and device/browser from User-Agent parsing on consented <code className="font-mono">ProductEvent</code> logs. IP addresses are never stored.
        </p>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#141414] p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            Page Views
          </span>
          <p className="text-2xl font-extrabold tabular-nums text-gray-900 dark:text-gray-100 mt-1.5">
            {data.visits.toLocaleString()}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Consented events</p>
        </div>

        <div className="bg-white dark:bg-[#141414] p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            Unique Visitors
          </span>
          <p className="text-2xl font-extrabold tabular-nums text-[#D91B1D] dark:text-[#FF5C5E] mt-1.5">
            {data.uniqueVisitors.toLocaleString()}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Distinct client &amp; user IDs</p>
        </div>

        <div className="bg-white dark:bg-[#141414] p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            Signed-In Views
          </span>
          <p className="text-2xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1.5">
            {data.signedInVisits.toLocaleString()}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 tabular-nums">
            {data.visits > 0 ? Math.round((data.signedInVisits / data.visits) * 100) : 0}% of traffic
          </p>
        </div>

        <div className="bg-white dark:bg-[#141414] p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            Anonymous Views
          </span>
          <p className="text-2xl font-extrabold tabular-nums text-blue-700 dark:text-blue-400 mt-1.5">
            {data.anonymousVisits.toLocaleString()}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 tabular-nums">
            {data.visits > 0 ? Math.round((data.anonymousVisits / data.visits) * 100) : 0}% of traffic
          </p>
        </div>
      </div>

      {/* Top Pages & Creator Storefront Views */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm p-4 sm:p-5 min-w-0">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#242424] mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-[#F92729] shrink-0" />
              <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                Top Visited Pages
              </h3>
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 shrink-0">Views</span>
          </div>

          <div className="space-y-1.5">
            {data.topPages.map((p) => (
              <div
                key={p.path}
                className="flex justify-between items-center gap-3 py-1.5 text-xs border-b border-gray-100 dark:border-[#1E1E1E] last:border-b-0"
              >
                <span className="font-mono text-gray-700 dark:text-gray-300 truncate min-w-0">
                  {p.path}
                </span>
                <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100 shrink-0">
                  {p.views.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm p-4 sm:p-5 min-w-0">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-[#242424] mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                Creator Storefront &amp; Media Kit Views
              </h3>
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 shrink-0 hidden sm:inline">
              Profile / Media Kit
            </span>
          </div>

          <div className="space-y-1.5">
            {data.topCreatorViews.length === 0 ? (
              <p className="text-xs text-gray-600 dark:text-gray-400 italic py-4 text-center">
                No storefront views recorded yet
              </p>
            ) : (
              data.topCreatorViews.map((c) => (
                <div
                  key={c.creatorId}
                  className="flex flex-wrap justify-between items-center gap-2 py-1.5 text-xs border-b border-gray-100 dark:border-[#1E1E1E] last:border-b-0"
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {c.creatorName}
                  </span>
                  <div className="flex items-center gap-3 tabular-nums shrink-0">
                    <span className="text-gray-600 dark:text-gray-400">
                      {c.profileViews} profile
                    </span>
                    <span className="text-[#D91B1D] dark:text-[#FF5C5E] font-semibold">
                      {c.mediaKitViews} media kit
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Referrers, Countries, Devices, Browsers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm p-4 sm:p-5 min-w-0">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#242424] mb-3">
            <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <h4 className="font-semibold text-xs text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              Top Referrers
            </h4>
          </div>
          <div className="space-y-2 text-xs">
            {data.topReferrers.map((r) => (
              <div key={r.referrer} className="flex justify-between items-center gap-2 py-0.5">
                <span className="font-mono text-gray-700 dark:text-gray-300 truncate min-w-0">
                  {r.referrer}
                </span>
                <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100 shrink-0">
                  {r.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm p-4 sm:p-5 min-w-0">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#242424] mb-3">
            <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h4 className="font-semibold text-xs text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              Countries
            </h4>
          </div>
          <div className="space-y-2 text-xs">
            {data.countries.map((c) => (
              <div key={c.country} className="flex justify-between items-center gap-2 py-0.5">
                <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{c.country}</span>
                <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100 shrink-0">
                  {c.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm p-4 sm:p-5 min-w-0">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#242424] mb-3">
            <Smartphone className="w-4 h-4 text-[#F92729] shrink-0" />
            <h4 className="font-semibold text-xs text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              Device Classes
            </h4>
          </div>
          <div className="space-y-2 text-xs">
            {data.deviceClasses.map((d) => (
              <div key={d.device} className="flex justify-between items-center gap-2 py-0.5">
                <span className="capitalize text-gray-700 dark:text-gray-300 truncate">{d.device}</span>
                <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100 shrink-0">
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm p-4 sm:p-5 min-w-0">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#242424] mb-3">
            <Laptop className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
            <h4 className="font-semibold text-xs text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              Browsers
            </h4>
          </div>
          <div className="space-y-2 text-xs">
            {data.browsers.map((b) => (
              <div key={b.browser} className="flex justify-between items-center gap-2 py-0.5">
                <span className="text-gray-700 dark:text-gray-300 truncate">{b.browser}</span>
                <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100 shrink-0">
                  {b.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Visits Timeline */}
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-gray-100 dark:border-[#242424] mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#F92729] shrink-0" />
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              Daily Traffic Activity
            </h3>
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Views / Uniques / Auth Breakdown
          </span>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-[#1E1E1E] max-h-[300px] overflow-y-auto pr-1">
          {data.dailyVisits.map((d) => (
            <div
              key={d.date}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 py-2.5 text-xs"
            >
              <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                {d.date}
              </span>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 tabular-nums">
                <span className="text-gray-600 dark:text-gray-400">{d.uniques} uniques</span>
                <span className="text-emerald-700 dark:text-emerald-400">
                  {d.signedIn} signed-in
                </span>
                <span className="text-blue-700 dark:text-blue-400">
                  {d.anonymous} anonymous
                </span>
                <span className="font-bold text-gray-900 dark:text-gray-100 sm:min-w-[4.5rem] sm:text-right">
                  {d.visits} views
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TrafficPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-gray-600 dark:text-gray-400">
          Loading traffic analytics...
        </div>
      }
    >
      <TrafficContent />
    </Suspense>
  );
}
