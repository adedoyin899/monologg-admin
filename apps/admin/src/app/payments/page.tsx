"use client";

import React, { useState, useEffect, Suspense, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  adminClient,
  type FinanceSummaryResponse,
  type PaymentListItem,
  type PaymentListFilterOptions,
} from "@/lib/admin-client";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  DollarSign,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  CreditCard,
  TrendingUp,
  Percent,
  Calendar,
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

function getPaymentStatusBadge(status: string) {
  switch (status) {
    case "ESCROW_HELD":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
          <Lock className="h-3 w-3" />
          Escrow Held
        </span>
      );
    case "RELEASED":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
          <CheckCircle className="h-3 w-3" />
          Released
        </span>
      );
    case "REFUNDED":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
          Refunded
        </span>
      );
    case "FAILED":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
          <AlertTriangle className="h-3 w-3" />
          Failed
        </span>
      );
    case "INITIATED":
    case "AUTHORIZED":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          {status}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
          {status}
        </span>
      );
  }
}

function PaymentsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Read URL query params
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "ALL";
  const provider = searchParams.get("provider") || "ALL";
  const currencyParam = searchParams.get("currency") || "NGN";
  const cursor = searchParams.get("cursor") || "";

  // Active selected currency for KPI cards
  const [selectedCurrency, setSelectedCurrency] = useState(currencyParam);
  const [searchInput, setSearchInput] = useState(search);

  // Data states
  const [summaryData, setSummaryData] = useState<FinanceSummaryResponse | null>(null);
  const [payments, setPayments] = useState<PaymentListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    setSelectedCurrency(currencyParam);
  }, [currencyParam]);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, val]) => {
      if (!val || val === "ALL") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    if (!("cursor" in newParams)) {
      params.delete("cursor");
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sumRes, payRes] = await Promise.all([
        adminClient.getFinanceSummary(),
        adminClient.getPayments({
          search: search || undefined,
          status: status !== "ALL" ? status : undefined,
          provider: provider !== "ALL" ? provider : undefined,
          currency: selectedCurrency !== "ALL" ? selectedCurrency : undefined,
          cursor: cursor || undefined,
          limit: 50,
        }),
      ]);

      setSummaryData(sumRes);
      setPayments(payRes.payments || []);
      setNextCursor(payRes.nextCursor || null);
      setHasMore(Boolean(payRes.hasMore));
      setTotalCount(payRes.totalCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load financial records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, status, provider, selectedCurrency, cursor]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput.trim() || null });
  };

  const handleCurrencyChange = (curr: string) => {
    setSelectedCurrency(curr);
    updateFilters({ currency: curr });
  };

  const currSummary = summaryData?.summaries[selectedCurrency] || {
    currency: selectedCurrency,
    gmv: 0,
    escrowHeld: 0,
    released: 0,
    refunded: 0,
    platformRevenue: 0,
    talentFees: 0,
    clientFees: 0,
    takeRatePct: 0,
    averageBookingValue: 0,
    paymentFailureRatePct: 0,
    totalBookings: 0,
    totalPayments: 0,
    failedPayments: 0,
  };

  return (
    <div className="space-y-6">
      {/* Prominent Payments Mode Banner */}
      <div
        className={`px-4 py-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
          summaryData?.mode === "LIVE"
            ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
            : "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              summaryData?.mode === "LIVE" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            }`}
          />
          <span>PAYMENTS MODE: {summaryData?.mode || "TEST"}</span>
          <span className="text-gray-500 font-normal">
            ({summaryData?.mode === "LIVE" ? "Live payment gateway active" : "Test mode with mock webhooks enabled"})
          </span>
        </div>

        <button
          onClick={() => loadData()}
          disabled={isLoading}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 dark:text-gray-300 hover:underline"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Data
        </button>
      </div>

      {/* Header and Currency Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transactions & Finance
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              AD-09
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time financial reconciliation, escrow locks, stored revenue cuts, and payment failure metrics.
          </p>
        </div>

        {/* Currency Selector (No cross-currency totals!) */}
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

      {/* Mismatch Alert Strip (if any mismatch detected) */}
      {summaryData && summaryData.mismatchesCount > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs">
          <div className="flex items-center gap-2 font-bold text-rose-900 dark:text-rose-200 mb-1">
            <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            <span>{summaryData.mismatchesCount} Financial Inconsistencies Detected</span>
          </div>
          <p className="text-rose-700 dark:text-rose-300">
            Automated detectors found booking/payment state mismatches. Review offending records below.
          </p>
          <div className="mt-2 space-y-1">
            {summaryData.recentMismatches.slice(0, 3).map((m, idx) => (
              <div key={idx} className="font-mono text-[11px] text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                <span className="font-bold">[{m.severity}]</span>
                <span>{m.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards for Selected Currency */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* GMV */}
        <Card className="p-4">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            GMV ({selectedCurrency})
          </span>
          <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {formatCurrency(currSummary.gmv, selectedCurrency)}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Escrowed & completed</div>
        </Card>

        {/* Escrow Held Now */}
        <Card className="p-4">
          <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Escrow Held Now
          </span>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {formatCurrency(currSummary.escrowHeld, selectedCurrency)}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Active safe storage</div>
        </Card>

        {/* Released */}
        <Card className="p-4">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Released to Talent
          </span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(currSummary.released, selectedCurrency)}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Finalized payouts</div>
        </Card>

        {/* Platform Revenue */}
        <Card className="p-4">
          <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider block flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Platform Revenue
          </span>
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {formatCurrency(currSummary.platformRevenue, selectedCurrency)}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            Take rate: <strong>{currSummary.takeRatePct}%</strong> (stored cuts)
          </div>
        </Card>

        {/* Refunded */}
        <Card className="p-4">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            Refunded
          </span>
          <div className="text-lg font-bold text-gray-700 dark:text-gray-300 mt-1">
            {formatCurrency(currSummary.refunded, selectedCurrency)}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Returned to clients</div>
        </Card>

        {/* Average Booking Value */}
        <Card className="p-4">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            Avg Booking Value
          </span>
          <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
            {formatCurrency(currSummary.averageBookingValue, selectedCurrency)}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Across active bookings</div>
        </Card>

        {/* Payment Failure Rate */}
        <Card className="p-4">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block flex items-center gap-1">
            <Percent className="h-3 w-3" />
            Failure Rate
          </span>
          <div className={`text-lg font-bold mt-1 ${currSummary.paymentFailureRatePct > 10 ? "text-rose-600" : "text-gray-900 dark:text-white"}`}>
            {currSummary.paymentFailureRatePct}%
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            {currSummary.failedPayments} / {currSummary.totalPayments} attempts
          </div>
        </Card>

        {/* Quick Link to Earnings */}
        <Card className="p-4 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            Talent Ledger
          </span>
          <div className="mt-1">
            <Link
              href="/earnings"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              View Talent Balances
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="text-[10px] text-gray-400 mt-1">Derived earnings & withdrawals</div>
        </Card>
      </div>

      {/* Filter and Search Bar for Payments Table */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search payments by ID, reference, payer, talent..."
              className="w-full pl-9 pr-20 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 px-3 py-1 text-xs font-medium text-white bg-primary rounded-md"
            >
              Search
            </button>
          </form>

          {/* Status Dropdown */}
          <select
            value={status}
            onChange={(e) => updateFilters({ status: e.target.value })}
            className="text-xs py-2 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="ESCROW_HELD">Escrow Held</option>
            <option value="RELEASED">Released</option>
            <option value="REFUNDED">Refunded</option>
            <option value="FAILED">Failed</option>
            <option value="INITIATED">Initiated</option>
          </select>

          {/* Provider Dropdown */}
          <select
            value={provider}
            onChange={(e) => updateFilters({ provider: e.target.value })}
            className="text-xs py-2 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
          >
            <option value="ALL">All Providers</option>
            <option value="paystack">Paystack</option>
            <option value="stripe">Stripe</option>
            <option value="airwallex">Airwallex</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
            <p className="font-semibold">Error Loading Payments</p>
            <p className="text-xs text-gray-500 mt-1">{error}</p>
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            title="No Payments Found"
            description="No transactions match your current search and filter settings."
            icon={<CreditCard className="h-8 w-8 text-gray-400" />}
          />
        ) : (
          <div className="overflow-x-auto min-w-[360px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Payer</TableHead>
                  <TableHead>Provider & Ref</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Platform Revenue</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    {/* Payment ID */}
                    <TableCell className="font-mono text-xs font-semibold text-primary">
                      <Link href={`/payments/${p.id}`} className="hover:underline flex items-center gap-1">
                        {p.id}
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </Link>
                    </TableCell>

                    {/* Booking ID */}
                    <TableCell className="font-mono text-xs">
                      <Link href={`/bookings/${p.bookingId}`} className="text-gray-700 dark:text-gray-300 hover:underline">
                        {p.bookingId}
                      </Link>
                      <div className="text-[10px] text-gray-400">{p.bookingState}</div>
                    </TableCell>

                    {/* Payer */}
                    <TableCell>
                      <div className="text-xs font-medium text-gray-900 dark:text-white">{p.payer.name}</div>
                      <div className="text-[11px] font-mono text-gray-500">{p.payer.email}</div>
                    </TableCell>

                    {/* Provider & Ref */}
                    <TableCell>
                      <div className="text-xs uppercase font-semibold text-gray-800 dark:text-gray-200">{p.provider}</div>
                      <div className="text-[10px] font-mono text-gray-400 truncate max-w-[120px]">
                        {p.providerRef || "—"}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>{getPaymentStatusBadge(p.status)}</TableCell>

                    {/* Amount */}
                    <TableCell>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">
                        {formatCurrency(p.amount, p.currency)}
                      </div>
                    </TableCell>

                    {/* Platform Revenue */}
                    <TableCell>
                      <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                        {formatCurrency(p.platformFee, p.currency)}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        Talent: {formatCurrency(p.talentFee, p.currency)}
                      </div>
                    </TableCell>

                    {/* Date */}
                    <TableCell className="text-xs text-gray-500 font-mono">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </TableCell>

                    {/* Action */}
                    <TableCell className="text-right">
                      <Link
                        href={`/payments/${p.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                      >
                        Detail
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Cursor Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Showing <span className="font-semibold">{payments.length}</span> payments
            {totalCount > 0 && <span> (approx. {totalCount.toLocaleString()} total)</span>}
          </div>

          <div className="flex items-center gap-2">
            {cursor && (
              <button
                onClick={() => updateFilters({ cursor: null })}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                First Page
              </button>
            )}

            {hasMore && nextCursor && (
              <button
                onClick={() => updateFilters({ cursor: nextCursor })}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-md shadow-sm"
              >
                Next Page
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
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
      <PaymentsContent />
    </Suspense>
  );
}
