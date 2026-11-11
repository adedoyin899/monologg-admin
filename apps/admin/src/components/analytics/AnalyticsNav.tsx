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
      setSnapshotSuccess(`Nightly snapshot recorded (${res.snapshotsRecorded} metrics)`);
      setTimeout(() => setSnapshotSuccess(null), 4000);
    } catch (e: any) {
      alert(`Snapshot error: ${e.message || "Failed to run snapshot"}`);
    } finally {
      setRunningSnapshot(false);
    }
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics & Intelligence</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {dataFreshness || "Data refreshed live from ProductEvent telemetry and operational datastore"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {snapshotSuccess && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {snapshotSuccess}
            </span>
          )}
          <button
            onClick={handleRunSnapshot}
            disabled={runningSnapshot}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${runningSnapshot ? "animate-spin" : ""}`} />
            {runningSnapshot ? "Running Snapshot..." : "Run KPI Snapshot"}
          </button>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-1 border-b border-gray-100 pb-1 scrollbar-none">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-purple-50 text-purple-900 font-semibold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-purple-700" : "text-gray-400"}`} />
              <span>{tab.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isActive ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"}`}>
                {tab.screen}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

