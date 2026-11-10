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
              Talent Earnings & Client Spend
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              AD-12
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Reconciled balances, pending payouts, and highest-grossing platform participants.
          </p>
        </div>

        {/* Currency Selector */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
          {["NGN", "USD", "GBP"].map((c) => (
            <button
              key={c}
              onClick={() => handleCurrencyChange(c)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                selectedCurrency === c
                  ? "bg-white dark:bg-gray-900 text-primary shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Mandatory Accounting Basis Banner */}
      <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center justify-between text-xs text-blue-800 dark:text-blue-300">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-600 shrink-0" />
          <span>
            Accounting Basis: <strong>{data?.label || "Derived from bookings and withdrawals"}</strong>
          </span>
        </div>
        <button
          onClick={() => loadEarnings()}
          disabled={isLoading}
          className="inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          Recalculate
        </button>
      </div>

      {/* Top Earners & Top Spenders Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Earners */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Top Talent Earners ({selectedCurrency})
            </h2>
            <span className="text-xs text-gray-400 font-mono">
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
            <div className="p-8 text-center text-xs text-gray-500">
              No finalized earnings found in {selectedCurrency} yet.
            </div>
          ) : (
            <div className="overflow-x-auto min-w-[320px]">
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
                          <span className="text-xs font-bold text-gray-400 font-mono w-4">
                            #{idx + 1}
                          </span>
                          {t.avatarUrl ? (
                            <img
                              src={t.avatarUrl}
                              alt=""
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
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

                      <TableCell className="font-bold text-xs text-gray-900 dark:text-white">
                        {formatCurrency(t.earned, t.currency)}
                      </TableCell>

                      <TableCell className="text-xs text-gray-500 font-mono">
                        {formatCurrency(t.withdrawn, t.currency)}
                      </TableCell>

                      <TableCell className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(t.available, t.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Top Spenders */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Top Client Spenders ({selectedCurrency})
            </h2>
            <span className="text-xs text-gray-400 font-mono">
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
            <div className="p-8 text-center text-xs text-gray-500">
              No client spend recorded in {selectedCurrency} yet.
            </div>
          ) : (
            <div className="overflow-x-auto min-w-[320px]">
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
                          <span className="text-xs font-bold text-gray-400 font-mono w-4">
                            #{idx + 1}
                          </span>
                          {c.avatarUrl ? (
                            <img
                              src={c.avatarUrl}
                              alt=""
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
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
                              <div className="text-[10px] text-gray-400 truncate max-w-[120px]">
                                {c.orgName}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="font-bold text-xs text-gray-900 dark:text-white">
                        {formatCurrency(c.spend, c.currency)}
                      </TableCell>

                      <TableCell className="text-xs text-gray-600 dark:text-gray-300 font-mono">
                        {c.bookingsCount} orders
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
