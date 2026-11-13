"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  TrendingUp,
  Filter,
  Users,
  Eye,
  Sparkles,
  Store,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { adminClient } from "@/lib/admin-client";

const TABS = [
  { name: "Acquisition", href: "/analytics/acquisition", screen: "AD-19", icon: TrendingUp },
  { name: "Funnels", href: "/analytics/funnels", screen: "AD-20", icon: Filter },
  { name: "Retention", href: "/analytics/retention", screen: "AD-21", icon: Users },
  { name: "Traffic", href: "/analytics/traffic", screen: "AD-22", icon: Eye },
  { name: "Feature Adoption", href: "/analytics/features", screen: "AD-23", icon: Sparkles },
  { name: "Marketplace Health", href: "/analytics/marketplace", screen: "AD-24", icon: Store },
];

export function AnalyticsNav({ dataFreshness }: { dataFreshness?: string }) {
  const pathname = usePathname();
  const [runningSnapshot, setRunningSnapshot] = useState(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState<string | null>(null);

  const handleRunSnapshot = async () => {
    try {
      setRunningSnapshot(true);
      const res = await adminClient.triggerKpiSnapshot();
      setSnapshotSuccess(`Snapshot recorded (${res.snapshotsRecorded} metrics)`);
      setTimeout(() => setSnapshotSuccess(null), 4000);
    } catch (e: any) {
      alert(`Snapshot error: ${e.message || "Failed to run snapshot"}`);
    } finally {
      setRunningSnapshot(false);
    }
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-[#242424] pb-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Analytics &amp; Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            {dataFreshness || "Computed from consent-gated ProductEvent telemetry and PostgreSQL ledger"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {snapshotSuccess && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/25">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              {snapshotSuccess}
            </span>
          )}
          <button
            type="button"
            onClick={handleRunSnapshot}
            disabled={runningSnapshot}
            className="inline-flex min-h-[40px] items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${runningSnapshot ? "animate-spin" : ""}`} />
            {runningSnapshot ? "Running Snapshot..." : "Run KPI Snapshot"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap sm:flex-nowrap sm:overflow-x-auto gap-1.5 border-b border-gray-200 dark:border-[#242424] pb-2 no-scrollbar">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex min-h-[40px] items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border ${
                isActive
                  ? "bg-monologg-red/10 text-monologg-red border-monologg-red/25 font-semibold dark:bg-monologg-red/15 dark:text-[#FF5A5C] dark:border-monologg-red/30"
                  : "border-transparent text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1A1A1A]"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-monologg-red dark:text-[#FF5A5C]" : "text-gray-500 dark:text-gray-400"}`} />
              <span>{tab.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                  isActive
                    ? "bg-monologg-red/15 text-monologg-red dark:text-[#FF5A5C]"
                    : "bg-gray-100 text-gray-700 dark:bg-[#222222] dark:text-gray-300"
                }`}
              >
                {tab.screen}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
