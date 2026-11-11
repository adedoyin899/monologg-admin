"use client";

import { useEffect, useState, Suspense } from "react";
import {
  adminClient,
  type TrafficData,
} from "@/lib/admin-client";
import { AnalyticsNav } from "@/components/analytics/AnalyticsNav";
import {
  Eye,
  Users,
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
        <div className="p-12 text-center text-gray-400 animate-pulse">
          Loading traffic metrics and analytics...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <AnalyticsNav />
        <div className="p-6 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <p className="font-semibold">Error loading traffic analytics</p>
          <p className="text-sm mt-1">{error || "No data returned"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <AnalyticsNav dataFreshness={data.dataFreshness} />

      {/* Mandatory PRD M4.4 Consent Rate Banner */}
      <div className="bg-purple-900 text-white p-5 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-800/80 border border-purple-700">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-purple-200">
                Analytics Consent Rate
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                {data.consentRatePct}% Opt-in
              </span>
            </div>
            <p className="text-sm text-purple-100 mt-0.5 font-medium">
              {data.consentRateNotice}
            </p>
          </div>
        </div>
        <p className="text-xs text-purple-300 max-w-sm">
          Privacy-first tracking: Visits from visitors who reject or dismiss consent are excluded from traffic counts.
        </p>
      </div>

      {/* Top Stat Cards: Visits, Uniques, Signed-in vs Anonymous */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Page Views</span>
          <p className="text-2xl font-extrabold text-gray-900 mt-2">{data.visits.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Telemetry events captured</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Unique Visitors</span>
          <p className="text-2xl font-extrabold text-purple-700 mt-2">{data.uniqueVisitors.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Deduplicated client & user IDs</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Signed-In Views</span>
          <p className="text-2xl font-extrabold text-emerald-700 mt-2">{data.signedInVisits.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">
            {data.visits > 0 ? Math.round((data.signedInVisits / data.visits) * 100) : 0}% of traffic
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Anonymous Views</span>
          <p className="text-2xl font-extrabold text-blue-700 mt-2">{data.anonymousVisits.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">
            {data.visits > 0 ? Math.round((data.anonymousVisits / data.visits) * 100) : 0}% of traffic
          </p>
        </div>
      </div>

      {/* Grid: Top Pages & Creator Storefront / Media Kit Views */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              <h3 className="font-semibold text-sm text-gray-900">Top Visited Pages</h3>
            </div>
            <span className="text-xs text-gray-400">Views</span>
          </div>

          <div className="space-y-2">
            {data.topPages.map((p) => (
              <div key={p.path} className="flex justify-between items-center py-1.5 text-xs border-b border-gray-50">
                <span className="font-mono text-gray-700 truncate max-w-[280px]">{p.path}</span>
                <span className="font-semibold text-gray-900">{p.views.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Creator Profile & Media Kit Views */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="font-semibold text-sm text-gray-900">Creator Storefront & Media Kit Views</h3>
            </div>
            <span className="text-xs text-gray-400">Profile / Media Kit</span>
          </div>

          <div className="space-y-2">
            {data.topCreatorViews.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4 text-center">No storefront views recorded yet</p>
            ) : (
              data.topCreatorViews.map((c) => (
                <div key={c.creatorId} className="flex justify-between items-center py-1.5 text-xs border-b border-gray-50">
                  <span className="font-medium text-gray-800">{c.creatorName}</span>
                  <div className="flex items-center gap-4 text-right">
                    <span className="text-gray-600">{c.profileViews} profile</span>
                    <span className="text-purple-700 font-semibold">{c.mediaKitViews} media kit</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Grid: Referrers, Countries, Devices, Browsers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-3">
            <Compass className="w-4 h-4 text-blue-600" />
            <h4 className="font-semibold text-xs text-gray-900 uppercase">Top Referrers</h4>
          </div>
          <div className="space-y-2 text-xs">
            {data.topReferrers.map((r) => (
              <div key={r.referrer} className="flex justify-between items-center py-1">
                <span className="font-mono text-gray-700 truncate max-w-[140px]">{r.referrer}</span>
                <span className="font-semibold text-gray-900">{r.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-3">
            <Globe className="w-4 h-4 text-emerald-600" />
            <h4 className="font-semibold text-xs text-gray-900 uppercase">Countries</h4>
          </div>
          <div className="space-y-2 text-xs">
            {data.countries.map((c) => (
              <div key={c.country} className="flex justify-between items-center py-1">
                <span className="font-medium text-gray-700">{c.country}</span>
                <span className="font-semibold text-gray-900">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-3">
            <Smartphone className="w-4 h-4 text-purple-600" />
            <h4 className="font-semibold text-xs text-gray-900 uppercase">Device Classes</h4>
          </div>
          <div className="space-y-2 text-xs">
            {data.deviceClasses.map((d) => (
              <div key={d.device} className="flex justify-between items-center py-1">
                <span className="capitalize text-gray-700">{d.device}</span>
                <span className="font-semibold text-gray-900">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-3">
            <Laptop className="w-4 h-4 text-amber-600" />
            <h4 className="font-semibold text-xs text-gray-900 uppercase">Browsers</h4>
          </div>
          <div className="space-y-2 text-xs">
            {data.browsers.map((b) => (
              <div key={b.browser} className="flex justify-between items-center py-1">
                <span className="text-gray-700">{b.browser}</span>
                <span className="font-semibold text-gray-900">{b.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Visits Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-600" />
            <h3 className="font-semibold text-sm text-gray-900">Daily Traffic Activity</h3>
          </div>
          <span className="text-xs text-gray-400">Total Visits / Uniques / Auth Breakdown</span>
        </div>

        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {data.dailyVisits.map((d) => (
            <div key={d.date} className="flex items-center justify-between py-2 text-xs border-b border-gray-50">
              <span className="font-mono text-gray-700">{d.date}</span>
              <div className="flex items-center gap-6">
                <span className="text-gray-500">{d.uniques} uniques</span>
                <span className="text-emerald-600">{d.signedIn} signed-in</span>
                <span className="text-blue-600">{d.anonymous} anonymous</span>
                <span className="font-bold text-gray-900 w-12 text-right">{d.visits} views</span>
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
    <Suspense fallback={<div className="p-12 text-center text-gray-400">Loading traffic analytics...</div>}>
      <TrafficContent />
    </Suspense>
  );
}
