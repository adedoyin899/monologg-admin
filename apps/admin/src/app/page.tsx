"use client";

import React, { useEffect, useState, useTransition, useCallback, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Users,
  Calendar,
  DollarSign,
  AlertTriangle,
  ShieldAlert,
  LifeBuoy,
  UserCheck,
  RefreshCw,
  TrendingUp,
  Activity,
  ArrowRight,
  Filter,
} from "lucide-react";
import { Stat } from "@/components/ui/Stat";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { adminClient, type OverviewResponse } from "@/lib/admin-client";
import { useAuth } from "@/lib/auth-context";

function OverviewContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: authData } = useAuth();
  const [, startTransition] = useTransition();

  // ── Filters synced to URL ────────────────────────────────────────────────
  const rangeParam = searchParams.get("range") || "30d";
  const userTypeParam = (searchParams.get("userType") as "ALL" | "TALENT" | "CLIENT") || "ALL";
  const currencyParam = (searchParams.get("currency") as "ALL" | "NGN" | "USD" | "GBP") || "ALL";
  const cohortTagParam = searchParams.get("cohortTag") || "";
  const fromParam = searchParams.get("from") || "";
  const toParam = searchParams.get("to") || "";

  const [rangePreset, setRangePreset] = useState<string>(rangeParam);
  const [userType, setUserType] = useState<"ALL" | "TALENT" | "CLIENT">(userTypeParam);
  const [currency, setCurrency] = useState<"ALL" | "NGN" | "USD" | "GBP">(currencyParam);
  const [cohortTag, setCohortTag] = useState<string>(cohortTagParam);
  const [customFrom, setCustomFrom] = useState<string>(fromParam);
  const [customTo, setCustomTo] = useState<string>(toParam);

  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync state to URL search parameters
  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (!val || val === "ALL" || (key === "range" && val === "30d")) {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      }
      const qs = params.toString();
      startTransition(() => {
        router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
      });
    },
    [searchParams, pathname, router],
  );

  // Fetch overview data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let fromDate: string | undefined;
      let toDate: string | undefined;

      const now = new Date();
      if (rangePreset === "7d") {
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        toDate = now.toISOString();
      } else if (rangePreset === "90d") {
        fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
        toDate = now.toISOString();
      } else if (rangePreset === "custom" && customFrom && customTo) {
        fromDate = new Date(customFrom).toISOString();
        toDate = new Date(customTo).toISOString();
      } else {
        // default 30d
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        toDate = now.toISOString();
      }

      const res = await adminClient.getOverview({
        from: fromDate,
        to: toDate,
        userType: userType !== "ALL" ? userType : undefined,
        currency: currency !== "ALL" ? currency : undefined,
        cohortTag: cohortTag.trim() || undefined,
      });

      setOverview(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load platform overview.");
    } finally {
      setLoading(false);
    }
  }, [rangePreset, userType, currency, cohortTag, customFrom, customTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRangeChange = (preset: string) => {
    setRangePreset(preset);
    if (preset !== "custom") {
      updateUrl({ range: preset, from: null, to: null });
    } else {
      updateUrl({ range: "custom", from: customFrom, to: customTo });
    }
  };

  const handleUserTypeChange = (type: "ALL" | "TALENT" | "CLIENT") => {
    setUserType(type);
    updateUrl({ userType: type });
  };

  const handleCurrencyChange = (curr: "ALL" | "NGN" | "USD" | "GBP") => {
    setCurrency(curr);
    updateUrl({ currency: curr });
  };

  const handleCohortTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ cohortTag: cohortTag.trim() });
  };

  // Currency Formatter Helper (amounts in integer minor units)
  const formatMoney = (minorUnits: number, curr: string) => {
    const major = minorUnits / 100;
    const symbol = curr === "NGN" ? "₦" : curr === "USD" ? "$" : curr === "GBP" ? "£" : `${curr} `;
    return `${symbol} ${major.toLocaleString(undefined, {
      minimumFractionDigits: major % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const isDataEmpty =
    overview &&
    overview.cards.signups.total === 0 &&
    overview.cards.bookingsCreated.total === 0 &&
    overview.cards.money.byCurrency.every((m) => m.gmv === 0);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Critical Alerts Strip (PRD M2.1 / M11) ────────────────────── */}
      {overview && overview.cards.criticalAlerts.total > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-700 dark:text-red-400">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 animate-bounce text-red-600 dark:text-red-400" />
            <div>
              <p className="font-semibold text-sm">
                {overview.cards.criticalAlerts.total} Critical Alert
                {overview.cards.criticalAlerts.total > 1 ? "s" : ""} Active
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/80">
                System requires immediate operator response:{" "}
                {overview.criticalAlerts[0]?.message || "Action required in operational queue."}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/alerts")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold self-start sm:self-auto transition-colors"
          >
            Review Alerts <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Header & Freshness Banners ─────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold uppercase text-monologg-red dark:text-[#FF5C5E]">AD-02</span>
            <span className="text-gray-500 dark:text-gray-400" aria-hidden="true">/</span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Platform Overview
            </h1>
          </div>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Real-time platform metrics, user activation funnels, and isolated-currency cash flows.
          </p>
        </div>

        {/* Status Indicators */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Payments Mode Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
              (overview?.freshness.paymentsMode || authData?.env.paymentsMode) === "LIVE"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            PAYMENTS: {overview?.freshness.paymentsMode || authData?.env.paymentsMode || "TEST"}
          </span>

          {/* Environment Badge */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-200 dark:border-[#2A2A2A] bg-gray-100 dark:bg-[#1A1A1A] text-gray-700 dark:text-gray-300">
            ENV: {overview?.freshness.environment || authData?.env.environment || "production"}
          </span>

          {/* Freshness Badge */}
          {overview && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                overview.freshness.isStale
                  ? "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
                  : "bg-gray-100 dark:bg-[#1A1A1A] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#2A2A2A]"
              }`}
              title={`Materialized view refreshed at ${overview.freshness.lastRefreshedAt}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  overview.freshness.isStale ? "bg-amber-500 animate-ping" : "bg-emerald-500"
                }`}
              />
              {overview.freshness.isStale
                ? `Stale data: refreshed ${overview.freshness.stalenessMinutes}m ago`
                : "Data Fresh"}
            </span>
          )}

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-200 dark:border-[#2A2A2A] hover:bg-gray-100 dark:hover:bg-[#1E1E1E] text-gray-600 dark:text-gray-400 transition-colors disabled:opacity-50"
            title="Refresh overview metrics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Filter Bar (Persisted in URL) ──────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 dark:border-[#242424] bg-white dark:bg-[#141414] p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1 bg-gray-100 dark:bg-[#1C1C1C] p-1 rounded-lg max-w-full">
            {["7d", "30d", "90d", "custom"].map((p) => (
              <button
                key={p}
                onClick={() => handleRangeChange(p)}
                className={`px-3 py-1.5 min-h-[34px] text-xs font-semibold rounded-md transition-all ${
                  rangePreset === p
                    ? "bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {p === "custom" ? "Custom Range" : `Last ${p}`}
              </button>
            ))}
          </div>

          {/* User Type & Currency Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <Filter className="h-3.5 w-3.5" />
              <span>Type:</span>
            </div>
            <select
              value={userType}
              onChange={(e) => handleUserTypeChange(e.target.value as any)}
              className="text-xs min-h-[36px] rounded-lg border border-gray-200 dark:border-[#2A2A2A] bg-gray-50 dark:bg-[#1A1A1A] text-gray-800 dark:text-gray-200 px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-monologg-red"
            >
              <option value="ALL">All Users</option>
              <option value="TALENT">Talent Only</option>
              <option value="CLIENT">Clients Only</option>
            </select>

            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 sm:ml-2">
              <span>Currency:</span>
            </div>
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value as any)}
              className="text-xs min-h-[36px] rounded-lg border border-gray-200 dark:border-[#2A2A2A] bg-gray-50 dark:bg-[#1A1A1A] text-gray-800 dark:text-gray-200 px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-monologg-red"
            >
              <option value="ALL">All Currencies</option>
              <option value="NGN">NGN (₦)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          {/* Cohort Tag Search */}
          <form onSubmit={handleCohortTagSubmit} className="flex items-center gap-1.5 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Cohort tag (e.g. alpha)"
              value={cohortTag}
              onChange={(e) => setCohortTag(e.target.value)}
              className="text-xs min-h-[36px] rounded-lg border border-gray-200 dark:border-[#2A2A2A] bg-gray-50 dark:bg-[#1A1A1A] text-gray-800 dark:text-gray-200 px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-monologg-red flex-1 sm:flex-initial sm:w-44 min-w-0"
            />
            <button
              type="submit"
              className="px-3 py-1.5 min-h-[36px] bg-gray-200 dark:bg-[#2A2A2A] text-gray-800 dark:text-gray-100 text-xs font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-[#333333] transition-colors shrink-0"
            >
              Filter
            </button>
          </form>
        </div>

        {/* Custom Range Inputs */}
        {rangePreset === "custom" && (
          <div className="pt-2 border-t border-gray-100 dark:border-[#1F1F1F] flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400">From:</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="text-xs rounded-lg border border-gray-200 dark:border-[#2A2A2A] bg-gray-50 dark:bg-[#1A1A1A] text-gray-800 dark:text-gray-200 px-2.5 py-1 focus:outline-hidden"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400">To:</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="text-xs rounded-lg border border-gray-200 dark:border-[#2A2A2A] bg-gray-50 dark:bg-[#1A1A1A] text-gray-800 dark:text-gray-200 px-2.5 py-1 focus:outline-hidden"
              />
            </div>
            <button
              onClick={() => updateUrl({ range: "custom", from: customFrom, to: customTo })}
              className="text-xs px-3 py-1 bg-monologg-red text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              Apply Dates
            </button>
          </div>
        )}
      </div>

      {/* ── Error Banner ──────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
          <p>{error}</p>
          <button onClick={fetchData} className="font-semibold underline ml-2">
            Retry
          </button>
        </div>
      )}

      {/* ── Empty State ────────────────────────────────────────────────── */}
      {!loading && isDataEmpty && (
        <EmptyState
          icon={<Calendar className="h-8 w-8 text-gray-400" />}
          title="No data yet for this period."
          description={`No activity recorded between ${overview?.period.from.slice(0, 10)} and ${overview?.period.to.slice(0, 10)}. Adjust date range or tags above.`}
        />
      )}

      {/* ── KPI Stat Cards Grid ────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : overview ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Stat
              label="Signups"
              value={overview.cards.signups.total}
              change={overview.cards.signups.change ?? undefined}
              period="vs previous period"
              suffix={`(${overview.cards.signups.talent}T / ${overview.cards.signups.client}C)`}
              icon={<Users className="h-4 w-4" />}
            />
            <Stat
              label="Active Users"
              value={overview.cards.activeUsers.dau}
              period={`WAU: ${overview.cards.activeUsers.wau} · MAU: ${overview.cards.activeUsers.mau}`}
              icon={<Activity className="h-4 w-4" />}
            />
            <Stat
              label="Talent Activated"
              value={overview.cards.talentActivated.total}
              change={overview.cards.talentActivated.change ?? undefined}
              period="vs previous period"
              suffix="RateCards+Media"
              icon={<UserCheck className="h-4 w-4 text-monologg-red dark:text-[#FF5C5E]" />}
            />
            <Stat
              label="Clients Activated"
              value={overview.cards.clientActivated.total}
              change={overview.cards.clientActivated.change ?? undefined}
              period="vs previous period"
              suffix="Brief/Booking"
              icon={<TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
            />
          </div>

          {/* Bookings & Operational Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Stat
              label="Bookings Created"
              value={overview.cards.bookingsCreated.total}
              change={overview.cards.bookingsCreated.change ?? undefined}
              period="vs previous period"
              icon={<Calendar className="h-4 w-4" />}
            />
            <Stat
              label="Open Tickets"
              value={overview.cards.openTickets.total}
              icon={<LifeBuoy className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
            />
            <Stat
              label="Active Disputes"
              value={overview.cards.openDisputes.total}
              icon={<ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-400" />}
            />
            <Stat
              label="Critical Alerts"
              value={overview.cards.criticalAlerts.total}
              icon={
                <AlertTriangle
                  className={`h-4 w-4 ${
                    overview.cards.criticalAlerts.total > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                />
              }
            />
          </div>

          {/* ── Monetary KPIs Strictly Per Currency (PRD 4, 6, Appendix B) ── */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 font-mono">
              Cash Flow &amp; Revenue by Currency (Isolated Minor Units)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {overview.cards.money.byCurrency.map((m) => (
                <div
                  key={m.currency}
                  className="rounded-xl border border-gray-200 dark:border-[#242424] bg-white dark:bg-[#141414] p-5 shadow-xs"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#1E1E1E]">
                    <span className="text-xs font-mono font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Currency: {m.currency}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-sm bg-gray-100 dark:bg-[#202020] text-gray-700 dark:text-gray-300 tabular-nums">
                      Take Rate: {(m.takeRate * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-600 dark:text-gray-400">GMV (Escrow+):</span>
                      <span className="font-mono font-semibold tabular-nums text-gray-900 dark:text-white">
                        {formatMoney(m.gmv, m.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-600 dark:text-gray-400">Escrow Held Now:</span>
                      <span className="font-mono font-medium tabular-nums text-amber-800 dark:text-amber-300">
                        {formatMoney(m.escrowHeld, m.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-600 dark:text-gray-400">Released Funds:</span>
                      <span className="font-mono font-medium tabular-nums text-gray-700 dark:text-gray-300">
                        {formatMoney(m.released, m.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-[#1E1E1E]">
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">
                        Platform Revenue:
                      </span>
                      <span className="font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                        {formatMoney(m.platformRevenue, m.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Charts Grid (AD-02) ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Signups per day by user type */}
            <Card
              title="Daily Signups by User Type"
              subtitle={`Signups velocity (${overview.period.from.slice(0, 10)} to ${overview.period.to.slice(0, 10)})`}
            >
              <div className="h-64 flex flex-col justify-between pt-4">
                {overview.charts.signupsByDay.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-gray-600 dark:text-gray-400">
                    No signups in this date range.
                  </div>
                ) : (
                  <>
                    <div className="h-48 flex items-end gap-1 sm:gap-2 px-2 overflow-x-auto pb-2 border-b border-gray-200 dark:border-[#222222]">
                      {overview.charts.signupsByDay.map((day) => {
                        const maxVal = Math.max(
                          ...overview.charts.signupsByDay.map((d) => d.total),
                          1,
                        );
                        const talentHeight = (day.talent / maxVal) * 100;
                        const clientHeight = (day.client / maxVal) * 100;

                        return (
                          <div
                            key={day.date}
                            className="flex flex-col items-center flex-1 min-w-[14px] group relative h-full justify-end"
                          >
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1 z-10 bg-gray-900 text-white text-[10px] rounded px-1.5 py-0.5 pointer-events-none whitespace-nowrap shadow-md">
                              {day.date}: {day.talent} Talent, {day.client} Client
                            </div>
                            <div className="w-full flex flex-col items-center justify-end h-full">
                              <div
                                style={{ height: `${clientHeight}%` }}
                                className="w-full bg-blue-500 rounded-t-xs"
                              />
                              <div
                                style={{ height: `${talentHeight}%` }}
                                className="w-full bg-monologg-red"
                              />
                            </div>
                            <span className="text-[9px] font-mono text-gray-600 dark:text-gray-400 mt-1 truncate max-w-full">
                              {day.date.slice(8)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-center gap-6 text-xs text-gray-600 dark:text-gray-400 pt-2 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-xs bg-monologg-red" />
                        <span>Talent ({overview.cards.signups.talent})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-xs bg-blue-500" />
                        <span>Clients ({overview.cards.signups.client})</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* 2. Bookings by State */}
            <Card
              title="Bookings Distribution by State"
              subtitle="Breakdown of order lifecycle states in period"
            >
              <div className="min-h-[16rem] flex flex-col justify-center space-y-3 px-1 sm:px-2">
                {overview.charts.bookingsByState.length === 0 ? (
                  <div className="text-xs text-gray-600 dark:text-gray-400 text-center">No bookings recorded.</div>
                ) : (
                  overview.charts.bookingsByState.map((st) => {
                    const totalBookings = Math.max(overview.cards.bookingsCreated.total, 1);
                    const pct = Math.round((st.count / totalBookings) * 100);

                    return (
                      <div key={st.state} className="space-y-1">
                        <div className="flex items-center justify-between text-xs gap-2">
                          <span className="font-mono text-gray-700 dark:text-gray-300 truncate">
                            {st.state.replace(/_/g, " ")}
                          </span>
                          <span className="font-mono font-semibold tabular-nums text-gray-900 dark:text-white shrink-0">
                            {st.count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 dark:bg-[#1C1C1C] rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.min(pct, 100)}%` }}
                            className={`h-full rounded-full ${
                              st.state === "ESCROW_LOCKED"
                                ? "bg-amber-500"
                                : st.state === "PAYMENT_RELEASED" || st.state === "COMPLETED"
                                ? "bg-emerald-500"
                                : st.state === "DISPUTED"
                                ? "bg-red-500"
                                : "bg-monologg-red"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* 3. Activation Funnel Snapshot */}
            <Card
              title="Activation Funnel Snapshot"
              subtitle="Conversion flow from onboarding to paid escrow"
            >
              <div className="min-h-[16rem] flex flex-col justify-around gap-4 px-1 sm:px-2 text-xs">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-monologg-red" />
                    Talent Funnel
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-mono">
                    {overview.charts.activationFunnel.talent.map((step, idx) => (
                      <div
                        key={step.stage}
                        className="p-2 rounded-lg bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#242424]"
                      >
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 truncate" title={step.stage}>
                          {step.stage}
                        </p>
                        <p className="font-bold text-sm tabular-nums text-gray-900 dark:text-white mt-0.5">
                          {step.count}
                        </p>
                        <p className="text-[10px] tabular-nums text-gray-600 dark:text-gray-400">
                          {idx === 0 ? "100%" : `${Math.round(step.conversion * 100)}%`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-[#1E1E1E]">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    Client Funnel
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center font-mono">
                    {overview.charts.activationFunnel.client.map((step, idx) => (
                      <div
                        key={step.stage}
                        className="p-2 rounded-lg bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#242424]"
                      >
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 truncate" title={step.stage}>
                          {step.stage}
                        </p>
                        <p className="font-bold text-sm tabular-nums text-gray-900 dark:text-white mt-0.5">
                          {step.count}
                        </p>
                        <p className="text-[10px] tabular-nums text-gray-600 dark:text-gray-400">
                          {idx === 0 ? "100%" : `${Math.round(step.conversion * 100)}%`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* 4. GMV Per Day by Currency */}
            <Card
              title="Daily GMV Velocity"
              subtitle="Transaction volume committed to escrow per currency"
            >
              <div className="h-64 flex flex-col justify-between pt-4">
                <div className="h-48 flex items-end gap-1 px-2 overflow-x-auto pb-2 border-b border-gray-200 dark:border-[#222222]">
                  {overview.charts.gmvByDay.map((day) => {
                    const totalGmv = Object.values(day.amountsByCurrency).reduce((a, b) => a + b, 0);
                    const maxVal = Math.max(
                      ...overview.charts.gmvByDay.map((d) =>
                        Object.values(d.amountsByCurrency).reduce((a, b) => a + b, 0),
                      ),
                      1,
                    );
                    const barHeight = (totalGmv / maxVal) * 100;

                    return (
                      <div
                        key={day.date}
                        className="flex flex-col items-center flex-1 min-w-[14px] group relative h-full justify-end"
                      >
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1 z-10 bg-gray-900 text-white text-[10px] rounded px-1.5 py-0.5 pointer-events-none whitespace-nowrap shadow-md">
                          {day.date}: {Object.entries(day.amountsByCurrency)
                            .filter(([, v]) => v > 0)
                            .map(([c, v]) => `${c} ${(v / 100).toLocaleString()}`)
                            .join(" · ") || "0"}
                        </div>
                        <div
                          style={{ height: `${Math.max(barHeight, 3)}%` }}
                          className={`w-full rounded-t-xs ${
                            totalGmv > 0 ? "bg-emerald-500" : "bg-gray-200 dark:bg-[#202020]"
                          }`}
                        />
                        <span className="text-[9px] font-mono text-gray-600 dark:text-gray-400 mt-1 truncate">
                          {day.date.slice(8)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400 pt-2 font-mono">
                  <span>Daily volume in escrow</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    Active: {overview.cards.money.byCurrency.map((m) => m.currency).join(", ")}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function OverviewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Loading overview...</div>}>
      <OverviewContent />
    </Suspense>
  );
}

