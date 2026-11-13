"use client";

import React, { useState, useEffect, Suspense, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  adminClient,
  type WithdrawalListItem,
  type WithdrawalListFilterOptions,
} from "@/lib/admin-client";
import { Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  ArrowDownToLine,
  CheckCircle,
  AlertTriangle,
  Clock,
  Lock,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Shield,
  Building,
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

function getWithdrawalStateBadge(status: string) {
  switch (status) {
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
          <CheckCircle className="h-3 w-3" />
          Completed
        </span>
      );
    case "APPROVED":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
          Approved
        </span>
      );
    case "PENDING_OTP":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          <Clock className="h-3 w-3" />
          Pending OTP
        </span>
      );
    case "REJECTED":
    case "FAILED":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
          <AlertTriangle className="h-3 w-3" />
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

function getOtpBadge(status: string) {
  switch (status) {
    case "verified":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
          <CheckCircle className="h-3 w-3" />
          Verified
        </span>
      );
    case "locked":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
          <Lock className="h-3 w-3" />
          Locked (3+ attempts)
        </span>
      );
    case "expired":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
          Expired
        </span>
      );
    case "requested":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          Requested
        </span>
      );
    default:
      return <span className="text-gray-400">—</span>;
  }
}

function WithdrawalsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "ALL";
  const currency = searchParams.get("currency") || "ALL";
  const cursor = searchParams.get("cursor") || "";

  const [searchInput, setSearchInput] = useState(search);
  const [withdrawals, setWithdrawals] = useState<WithdrawalListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

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

  const loadWithdrawals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminClient.getWithdrawals({
        search: search || undefined,
        status: status !== "ALL" ? status : undefined,
        currency: currency !== "ALL" ? currency : undefined,
        cursor: cursor || undefined,
        limit: 50,
      });

      setWithdrawals(res.withdrawals || []);
      setNextCursor(res.nextCursor || null);
      setHasMore(Boolean(res.hasMore));
      setTotalCount(res.totalCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load withdrawals queue");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, [search, status, currency, cursor]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput.trim() || null });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Withdrawals Queue
            </h1>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-rose-500/10 text-monologg-red dark:text-[#FF5C5E] border border-rose-500/20">
              AD-11
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Talent payout requests, bank routing, OTP authentication statuses, and failure investigations.
          </p>
        </div>

        <button
          onClick={() => loadWithdrawals()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 dark:bg-[#181818] dark:text-gray-300 dark:border-[#2C2C2C] self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#141414] p-4 rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by ID, user email, bank account name..."
              className="w-full min-h-[40px] pl-9 pr-20 py-2 text-sm bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2C2C2C] rounded-lg text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-semibold text-white bg-monologg-red rounded-md hover:bg-monologg-red/90"
            >
              Search
            </button>
          </form>

          {/* Status Dropdown */}
          <select
            value={status}
            onChange={(e) => updateFilters({ status: e.target.value })}
            className="min-h-[40px] text-xs py-2 px-3 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2C2C2C] rounded-lg text-gray-900 dark:text-white"
          >
            <option value="ALL">All States</option>
            <option value="PENDING_OTP">Pending OTP</option>
            <option value="APPROVED">Approved</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Currency Dropdown */}
          <select
            value={currency}
            onChange={(e) => updateFilters({ currency: e.target.value })}
            className="min-h-[40px] text-xs py-2 px-3 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2C2C2C] rounded-lg text-gray-900 dark:text-white"
          >
            <option value="ALL">All Currencies</option>
            <option value="NGN">NGN (₦)</option>
            <option value="USD">USD ($)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>
      </div>

      {/* Withdrawals List / Table */}
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-[#242424] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-700 dark:text-rose-400">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-rose-700 dark:text-rose-400" />
            <p className="font-semibold">Error Loading Withdrawals</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{error}</p>
          </div>
        ) : withdrawals.length === 0 ? (
          <EmptyState
            title="No Withdrawals in Queue"
            description="No payout requests found matching the current filters."
            icon={<ArrowDownToLine className="h-8 w-8 text-gray-400" />}
          />
        ) : (
          <>
            {/* Mobile Withdrawal Cards */}
            <div className="lg:hidden divide-y divide-gray-200 dark:divide-[#242424]">
              {withdrawals.map((w) => (
                <div key={w.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-semibold text-[#D91B1D] dark:text-[#FF5C5E] block">
                        {w.id}
                      </span>
                      <Link
                        href={`/users/${w.user.id}`}
                        className="text-sm font-semibold text-gray-900 dark:text-white hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        {w.user.name}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </Link>
                      <div className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">
                        {w.user.email}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {getWithdrawalStateBadge(w.state)}
                      {getOtpBadge(w.otpStatus)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs pt-1">
                    <div>
                      <span className="block text-[11px] text-gray-600 dark:text-gray-400">Bank Routing</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{w.bank.bankName}</span>
                      <span className="block font-mono text-[11px] text-gray-600 dark:text-gray-400">
                        {w.bank.accountNumber} ({w.bank.accountName})
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-[11px] text-gray-600 dark:text-gray-400">Amount</span>
                      <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                        {formatCurrency(w.amount, w.currency)}
                      </span>
                    </div>
                  </div>

                  {w.failureReason && (
                    <div className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1.5 rounded-md">
                      {w.failureReason}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] font-mono text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-[#202020]">
                    <span>{new Date(w.requestedTime).toLocaleDateString()}</span>
                    {w.flagged && (
                      <span className="font-bold text-rose-700 dark:text-rose-400 inline-flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> FLAGGED
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Withdrawals Table */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>User / Talent</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>OTP Status</TableHead>
                    <TableHead>Bank Routing</TableHead>
                    <TableHead>Requested Date</TableHead>
                    <TableHead>Provider Ref / Failure</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((w) => (
                    <TableRow key={w.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1A1A1A] transition-colors">
                      {/* Request ID */}
                      <TableCell className="font-mono text-xs font-semibold text-[#D91B1D] dark:text-[#FF5C5E]">
                        {w.id}
                        {w.flagged && (
                          <div className="text-[10px] font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="h-3 w-3" />
                            FLAGGED
                          </div>
                        )}
                      </TableCell>

                      {/* User */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {w.user.avatarUrl ? (
                            <img
                              src={w.user.avatarUrl}
                              alt=""
                              className="h-7 w-7 rounded-full object-cover border border-gray-200 dark:border-[#2A2A2A]"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-rose-500/10 text-[#D91B1D] dark:text-[#FF5C5E] flex items-center justify-center font-bold text-xs">
                              {w.user.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/users/${w.user.id}`}
                              className="font-medium text-xs text-gray-900 dark:text-white hover:underline flex items-center gap-1"
                            >
                              {w.user.name}
                              <ExternalLink className="h-3 w-3 opacity-60" />
                            </Link>
                            <div className="text-[11px] font-mono text-gray-600 dark:text-gray-400">{w.user.email}</div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Amount */}
                      <TableCell>
                        <div className="text-xs font-bold tabular-nums text-gray-900 dark:text-white">
                          {formatCurrency(w.amount, w.currency)}
                        </div>
                      </TableCell>

                      {/* State */}
                      <TableCell>{getWithdrawalStateBadge(w.state)}</TableCell>

                      {/* OTP Status (Never displays codes or hashes) */}
                      <TableCell>{getOtpBadge(w.otpStatus)}</TableCell>

                      {/* Bank Routing */}
                      <TableCell>
                        <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                          {w.bank.bankName}
                        </div>
                        <div className="text-[11px] font-mono text-gray-600 dark:text-gray-400">
                          {w.bank.accountNumber} ({w.bank.accountName})
                        </div>
                      </TableCell>

                      {/* Requested Date */}
                      <TableCell className="text-xs font-mono tabular-nums text-gray-600 dark:text-gray-400">
                        {new Date(w.requestedTime).toLocaleString()}
                      </TableCell>

                      {/* Ref / Failure Reason */}
                      <TableCell>
                        {w.failureReason ? (
                          <div className="text-xs text-rose-700 dark:text-rose-400 font-medium max-w-xs truncate" title={w.failureReason}>
                            {w.failureReason}
                          </div>
                        ) : (
                          <div className="text-[11px] font-mono text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
                            {w.providerReference || "—"}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Cursor Pagination Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-gray-200 dark:border-[#242424] bg-gray-50 dark:bg-[#191919]">
          <div className="text-xs text-gray-600 dark:text-gray-400 tabular-nums">
            Showing <span className="font-semibold text-gray-900 dark:text-white">{withdrawals.length}</span> withdrawal requests
            {totalCount > 0 && <span> (approx. {totalCount.toLocaleString()} total)</span>}
          </div>

          <div className="flex items-center gap-2">
            {cursor && (
              <button
                onClick={() => updateFilters({ cursor: null })}
                className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[34px] text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md dark:bg-[#1F1F1F] dark:text-gray-200 dark:border-[#303030]"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                First Page
              </button>
            )}

            {hasMore && nextCursor && (
              <button
                onClick={() => updateFilters({ cursor: nextCursor })}
                className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[34px] text-xs font-semibold text-white bg-monologg-red rounded-md shadow-sm hover:bg-monologg-red/90"
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

export default function WithdrawalsPage() {
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
      <WithdrawalsContent />
    </Suspense>
  );
}
