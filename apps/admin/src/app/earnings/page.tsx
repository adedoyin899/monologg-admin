"use client";

import React, { useState, useEffect, Suspense, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  adminClient,
  type EarningsResponse,
} from "@/lib/admin-client";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  TrendingUp,
  DollarSign,
  User,
  Building,
  RefreshCw,
  ExternalLink,
  Info,
  Award,
  Wallet,
} from "lucide-react";

function formatCurrency(amountMinor: number, currency: string): string {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(major);
  } catch {
    return `${currency} ${major.toLocaleString()}`;
  }
}

function EarningsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currencyParam = searchParams.get("currency") || "NGN";
  const [selectedCurrency, setSelectedCurrency] = useState(currencyParam);
  const [data, setData] = useState<EarningsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCurrency(currencyParam);
  }, [currencyParam]);

  const handleCurrencyChange = (curr: string) => {
    setSelectedCurrency(curr);
    const params = new URLSearchParams(searchParams.toString());
    params.set("currency", curr);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const loadEarnings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminClient.getEarnings(selectedCurrency);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load earnings ledger");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEarnings();
  }, [selectedCurrency]);

  const topEarners = data?.topEarners[selectedCurrency] || [];
  const topSpenders = data?.topSpenders[selectedCurrency] || [];

  return (
    <div className="space-y-6">
      {/* Header & Accounting Basis Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Talent Earnings &amp; Client Spend
            </h1>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-rose-500/10 text-monologg-red dark:text-[#FF5C5E] border border-rose-500/20">
              AD-12
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Reconciled balances, pending payouts, and highest-grossing platform participants.
          </p>
        </div>

        {/* Currency Selector */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#1C1C1C] p-1 rounded-xl border border-gray-200 dark:border-[#2A2A2A] self-start sm:self-auto">
          {["NGN", "USD", "GBP"].map((c) => (
            <button
              key={c}
              onClick={() => handleCurrencyChange(c)}
              className={`px-3 py-1.5 min-h-[34px] text-xs font-bold rounded-lg transition-colors ${
                selectedCurrency === c
                  ? "bg-white dark:bg-[#2A2A2A] text-[#D91B1D] dark:text-[#FF5C5E] shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Mandatory Accounting Basis Banner */}
      <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-900 dark:text-blue-200">
        <div className="flex items-center gap-2 min-w-0">
          <Info className="h-4 w-4 text-blue-700 dark:text-blue-400 shrink-0" />
          <span>
            Accounting Basis: <strong>{data?.label || "Derived from bookings and withdrawals"}</strong>
          </span>
        </div>
        <button
          onClick={() => loadEarnings()}
          disabled={isLoading}
          className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          Recalculate
        </button>
      </div>

      {/* Top Earners & Top Spenders Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Earners */}
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="h-4 w-4 text-monologg-red dark:text-[#FF5C5E]" />
              Top Talent Earners ({selectedCurrency})
            </h2>
            <span className="text-xs text-gray-600 dark:text-gray-400 font-mono tabular-nums">
              Top {topEarners.length}
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : topEarners.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-600 dark:text-gray-400">
              No finalized earnings found in {selectedCurrency} yet.
            </div>
          ) : (
            <>
              {/* Mobile Top Earners */}
              <div className="md:hidden divide-y divide-gray-200 dark:divide-[#242424]">
                {topEarners.map((t, idx) => (
                  <div key={t.creatorId || idx} className="py-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-gray-600 dark:text-gray-400 font-mono">
                          #{idx + 1}
                        </span>
                        <Link
                          href={`/users/${t.userId}`}
                          className="font-semibold text-gray-900 dark:text-white hover:underline truncate inline-flex items-center gap-1"
                        >
                          {t.name}
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                        </Link>
                      </div>
                      <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400 shrink-0">
                        {formatCurrency(t.available, t.currency)} avail
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 tabular-nums">
                      <span>Earned: <strong className="text-gray-900 dark:text-gray-100">{formatCurrency(t.earned, t.currency)}</strong></span>
                      <span>Withdrawn: {formatCurrency(t.withdrawn, t.currency)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Top Earners Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Talent</TableHead>
                      <TableHead>Earned</TableHead>
                      <TableHead>Withdrawn</TableHead>
                      <TableHead>Available</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topEarners.map((t, idx) => (
                      <TableRow key={t.creatorId || idx}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 font-mono w-5 tabular-nums">
                              #{idx + 1}
                            </span>
                            {t.avatarUrl ? (
                              <img
                                src={t.avatarUrl}
                                alt=""
                                className="h-6 w-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-6 w-6 rounded-full bg-rose-500/10 text-[#D91B1D] dark:text-[#FF5C5E] flex items-center justify-center font-bold text-[10px]">
                                {t.name.charAt(0)}
                              </div>
                            )}
                            <Link
                              href={`/users/${t.userId}`}
                              className="font-medium text-xs text-gray-900 dark:text-white hover:underline flex items-center gap-1"
                            >
                              {t.name}
                              <ExternalLink className="h-3 w-3 opacity-60" />
                            </Link>
                          </div>
                        </TableCell>

                        <TableCell className="font-bold text-xs tabular-nums text-gray-900 dark:text-white">
                          {formatCurrency(t.earned, t.currency)}
                        </TableCell>

                        <TableCell className="text-xs text-gray-600 dark:text-gray-400 font-mono tabular-nums">
                          {formatCurrency(t.withdrawn, t.currency)}
                        </TableCell>

                        <TableCell className="font-bold text-xs tabular-nums text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(t.available, t.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </Card>

        {/* Top Spenders */}
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Top Client Spenders ({selectedCurrency})
            </h2>
            <span className="text-xs text-gray-600 dark:text-gray-400 font-mono tabular-nums">
              Top {topSpenders.length}
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : topSpenders.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-600 dark:text-gray-400">
              No client spend recorded in {selectedCurrency} yet.
            </div>
          ) : (
            <>
              {/* Mobile Top Spenders */}
              <div className="md:hidden divide-y divide-gray-200 dark:divide-[#242424]">
                {topSpenders.map((c, idx) => (
                  <div key={c.clientId || idx} className="py-3 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-600 dark:text-gray-400 font-mono">
                          #{idx + 1}
                        </span>
                        <Link
                          href={`/users/${c.userId}`}
                          className="font-semibold text-gray-900 dark:text-white hover:underline truncate inline-flex items-center gap-1"
                        >
                          {c.name}
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                        </Link>
                      </div>
                      {c.orgName && (
                        <div className="text-[11px] text-gray-600 dark:text-gray-400 truncate mt-0.5">
                          {c.orgName}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <div className="font-bold text-gray-900 dark:text-white">
                        {formatCurrency(c.spend, c.currency)}
                      </div>
                      <div className="text-[11px] text-gray-600 dark:text-gray-400 font-mono">
                        {c.bookingsCount} orders
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Top Spenders Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Total Spend</TableHead>
                      <TableHead>Bookings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topSpenders.map((c, idx) => (
                      <TableRow key={c.clientId || idx}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 font-mono w-5 tabular-nums">
                              #{idx + 1}
                            </span>
                            {c.avatarUrl ? (
                              <img
                                src={c.avatarUrl}
                                alt=""
                                className="h-6 w-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 flex items-center justify-center font-bold text-[10px]">
                                {c.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <Link
                                href={`/users/${c.userId}`}
                                className="font-medium text-xs text-gray-900 dark:text-white hover:underline flex items-center gap-1"
                              >
                                {c.name}
                                <ExternalLink className="h-3 w-3 opacity-60" />
                              </Link>
                              {c.orgName && (
                                <div className="text-[11px] text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
                                  {c.orgName}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="font-bold text-xs tabular-nums text-gray-900 dark:text-white">
                          {formatCurrency(c.spend, c.currency)}
                        </TableCell>

                        <TableCell className="text-xs text-gray-700 dark:text-gray-300 font-mono tabular-nums">
                          {c.bookingsCount} orders
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function EarningsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <EarningsContent />
    </Suspense>
  );
}
