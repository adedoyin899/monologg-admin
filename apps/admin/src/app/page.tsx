"use client";

import React from "react";
import { Users, Calendar, DollarSign, AlertTriangle, ShieldAlert, LifeBuoy } from "lucide-react";
import { Stat } from "@/components/ui/Stat";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth-context";

export default function OverviewPage() {
  const { data } = useAuth();

  return (
    <div className="space-y-6">
      {/* Title & Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold uppercase text-monologg-red">AD-02</span>
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Platform Overview
            </h1>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Real-time operational metrics and health overview across users, bookings, and cash flow.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Data updated 1m ago</span>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Total Signups"
          value="142"
          change={12.4}
          period="vs last 7d"
          icon={<Users className="h-4 w-4" />}
        />
        <Stat
          label="Bookings Created"
          value="48"
          change={8.1}
          period="vs last 7d"
          icon={<Calendar className="h-4 w-4" />}
        />
        <Stat
          label="Escrow Locked"
          value="₦ 3,450,000"
          change={19.5}
          period="vs last 7d"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <Stat
          label="Platform Revenue"
          value="₦ 517,500"
          change={15.0}
          period="vs last 7d"
          icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat
          label="Open Tickets"
          value="3"
          icon={<LifeBuoy className="h-4 w-4 text-blue-500" />}
        />
        <Stat
          label="Active Disputes"
          value="1"
          icon={<ShieldAlert className="h-4 w-4 text-amber-500" />}
        />
        <Stat
          label="Critical Alerts"
          value="0"
          icon={<AlertTriangle className="h-4 w-4 text-emerald-500" />}
        />
      </div>

      {/* Charts & Analytical Modules Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Bookings & Escrow Flow" subtitle="Transaction velocity over the past 30 days">
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-200 dark:border-[#222222] bg-gray-50/50 dark:bg-[#0E0E0E]">
            <p className="text-xs font-mono text-gray-400">[AD-02 Time Series Chart placeholder · Phase A2]</p>
          </div>
        </Card>

        <Card title="Funnel Conversion Snapshot" subtitle="Talent onboarding & booking completion rates">
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-200 dark:border-[#222222] bg-gray-50/50 dark:bg-[#0E0E0E]">
            <p className="text-xs font-mono text-gray-400">[AD-02 Funnel Gauge placeholder · Phase A2]</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

