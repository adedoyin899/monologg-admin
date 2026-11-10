"use client";

import React, { useState, useEffect, Suspense, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  adminClient,
  type BookingListItem,
  type BookingListFilterOptions,
} from "@/lib/admin-client";
import { Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Calendar,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  ShieldAlert,
  ArrowRight,
  User,
  Building,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";

const NICHES = [
  "ACTING",
  "MODELING",
  "DANCE",
  "MUSIC",
  "COMEDY",
  "VOICE_OVER",
  "INFLUENCER",
  "CONTENT_CREATOR",
  "OTHER",
];

const STATES = [
  "PENDING_PAYMENT",
  "ESCROW_LOCKED",
  "DELIVERABLES_PROVIDED",
  "PAYMENT_RELEASED",
  "CANCELLED",
  "DISPUTED",
];

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

function getStateBadge(state: string) {
  switch (state) {
    case "PENDING_PAYMENT":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          Pending Payment
        </span>
      );
    case "ESCROW_LOCKED":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
          Escrow Locked
        </span>
      );
    case "DELIVERABLES_PROVIDED":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
          Deliverables Provided
        </span>
      );
    case "PAYMENT_RELEASED":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
          Payment Released
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
          Cancelled
        </span>
      );
    case "DISPUTED":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
          Disputed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
          {state}
        </span>
      );
  }
}

function BookingsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Read URL query params
  const search = searchParams.get("search") || "";
  const state = searchParams.get("state") || "ALL";
  const origin = searchParams.get("origin") || "ALL";
  const currency = searchParams.get("currency") || "ALL";
  const niche = searchParams.get("niche") || "ALL";
  const stuck = searchParams.get("stuck") || "ALL";
  const hasDispute = searchParams.get("hasDispute") || "ALL";
  const cursor = searchParams.get("cursor") || "";

  // Local state
  const [searchInput, setSearchInput] = useState(search);
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync search input
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Update query params in URL
  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, val]) => {
      if (!val || val === "ALL") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    // Reset pagination cursor when filters change (unless updating cursor)
    if (!("cursor" in newParams)) {
      params.delete("cursor");
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // Fetch bookings
  const loadBookings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: BookingListFilterOptions = {
        search: search || undefined,
        state: state !== "ALL" ? state : undefined,
        origin: origin !== "ALL" ? origin : undefined,
        currency: currency !== "ALL" ? currency : undefined,
        niche: niche !== "ALL" ? niche : undefined,
        cursor: cursor || undefined,
        limit: 50,
      };

      if (stuck === "true") filters.stuck = true;
      if (stuck === "false") filters.stuck = false;
      if (hasDispute === "true") filters.hasDispute = true;

      const res = await adminClient.getBookings(filters);
      setBookings(res.bookings || []);
      setNextCursor(res.nextCursor || null);
      setHasMore(Boolean(res.hasMore));
      setTotalCount(res.totalCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [search, state, origin, currency, niche, stuck, hasDispute, cursor]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput.trim() || null });
  };

  const handleClearFilters = () => {
    setSearchInput("");
    router.push(pathname);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Bookings & Order Rooms
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              AD-07
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monitor booking lifecycles, escrow states, fee breakdowns, and stuck orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadBookings()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by Booking ID, Talent name, Client name, Org..."
              className="w-full pl-9 pr-20 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 dark:text-white"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 px-3 py-1 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
            >
              Search
            </button>
          </form>

          {/* Quick Stuck Filter Button */}
          <button
            type="button"
            onClick={() => updateFilters({ stuck: stuck === "true" ? "ALL" : "true" })}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
              stuck === "true"
                ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                : "bg-gray-50 dark:bg-gray-800 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Stuck Bookings</span>
            {stuck === "true" && <span className="ml-1 text-[10px] bg-white/20 px-1 rounded">Active</span>}
          </button>

          {/* Quick Dispute Filter Button */}
          <button
            type="button"
            onClick={() => updateFilters({ hasDispute: hasDispute === "true" ? "ALL" : "true" })}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
              hasDispute === "true"
                ? "bg-rose-600 text-white border-rose-700 shadow-sm"
                : "bg-gray-50 dark:bg-gray-800 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Disputed</span>
            {hasDispute === "true" && <span className="ml-1 text-[10px] bg-white/20 px-1 rounded">Active</span>}
          </button>
        </div>

        {/* Extended Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          {/* State */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">State</label>
            <select
              value={state}
              onChange={(e) => updateFilters({ state: e.target.value })}
              className="w-full text-xs py-1.5 px-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-white"
            >
              <option value="ALL">All States</option>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Origin */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Origin</label>
            <select
              value={origin}
              onChange={(e) => updateFilters({ origin: e.target.value })}
              className="w-full text-xs py-1.5 px-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-white"
            >
              <option value="ALL">All Origins</option>
              <option value="INTERNAL">Internal</option>
              <option value="PUBLIC_LINK">Public Link</option>
            </select>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => updateFilters({ currency: e.target.value })}
              className="w-full text-xs py-1.5 px-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-white"
            >
              <option value="ALL">All Currencies</option>
              <option value="NGN">NGN (₦)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          {/* Niche */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Creator Niche</label>
            <select
              value={niche}
              onChange={(e) => updateFilters({ niche: e.target.value })}
              className="w-full text-xs py-1.5 px-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-white"
            >
              <option value="ALL">All Niches</option>
              {NICHES.map((n) => (
                <option key={n} value={n}>
                  {n.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Action */}
          <div className="flex items-end">
            <button
              onClick={handleClearFilters}
              className="w-full py-1.5 px-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
            <p className="font-semibold">Error Loading Bookings</p>
            <p className="text-xs text-gray-500 mt-1">{error}</p>
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState
            title="No Bookings Found"
            description="No bookings match your current search and filter criteria."
            icon={<Calendar className="h-8 w-8 text-gray-400" />}
            action={
              <button
                onClick={handleClearFilters}
                className="mt-2 text-xs font-medium text-primary hover:underline"
              >
                Clear all filters
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto min-w-[360px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Talent</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Service & Slot</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Age in State</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b) => (
                  <TableRow key={b.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    {/* Booking ID */}
                    <TableCell className="font-mono text-xs font-semibold text-primary">
                      <Link href={`/bookings/${b.id}`} className="hover:underline flex items-center gap-1">
                        {b.id}
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </Link>
                      {b.isStuck && (
                        <span
                          title={b.stuckReason || "Stuck booking"}
                          className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          STUCK
                        </span>
                      )}
                    </TableCell>

                    {/* Talent */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {b.talent.avatarUrl ? (
                          <img
                            src={b.talent.avatarUrl}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                          />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {b.talent.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <Link
                            href={`/users/${b.talent.userId}`}
                            className="font-medium text-xs text-gray-900 dark:text-white hover:underline flex items-center gap-1"
                          >
                            {b.talent.name}
                          </Link>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            {b.talent.niche}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Client */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {b.client.avatarUrl ? (
                          <img
                            src={b.client.avatarUrl}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                          />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 flex items-center justify-center font-bold text-xs">
                            {b.client.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <Link
                            href={`/users/${b.client.userId}`}
                            className="font-medium text-xs text-gray-900 dark:text-white hover:underline"
                          >
                            {b.client.name}
                          </Link>
                          {b.client.orgName && (
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                              {b.client.orgName}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Service & Slot */}
                    <TableCell>
                      <div className="text-xs font-medium text-gray-900 dark:text-white">
                        {b.service.title}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span>{new Date(b.slotDate).toLocaleDateString()}</span>
                        <span>·</span>
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span>{b.slotStart}</span>
                      </div>
                    </TableCell>

                    {/* Amount */}
                    <TableCell>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">
                        {formatCurrency(b.clientTotal, b.currency)}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Net: {formatCurrency(b.talentNet, b.currency)}
                      </div>
                    </TableCell>

                    {/* State */}
                    <TableCell>
                      {getStateBadge(b.state)}
                    </TableCell>

                    {/* Age in State */}
                    <TableCell>
                      <div
                        className={`text-xs font-mono font-medium ${
                          b.isStuck
                            ? "text-rose-600 dark:text-rose-400 font-bold"
                            : "text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {b.ageInState.human}
                      </div>
                    </TableCell>

                    {/* Origin */}
                    <TableCell>
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          b.origin === "PUBLIC_LINK"
                            ? "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {b.origin}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <Link
                        href={`/bookings/${b.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                      >
                        View
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
            Showing <span className="font-semibold">{bookings.length}</span> bookings
            {totalCount > 0 && <span> (approx. {totalCount.toLocaleString()} total)</span>}
          </div>

          <div className="flex items-center gap-2">
            {cursor && (
              <button
                onClick={() => updateFilters({ cursor: null })}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                First Page
              </button>
            )}

            {hasMore && nextCursor && (
              <button
                onClick={() => updateFilters({ cursor: nextCursor })}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-md shadow-sm hover:bg-primary/90"
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

export default function BookingsPage() {
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
      <BookingsContent />
    </Suspense>
  );
}
