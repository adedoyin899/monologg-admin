"use client";

import React, { useState, useEffect, Suspense, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  adminClient,
  type TicketListItem,
  type TicketListFilterOptions,
} from "@/lib/admin-client";
import { Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Dialog } from "@/components/ui/Dialog";
import {
  LifeBuoy,
  Clock,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  User,
  ArrowRight,
  PlusCircle,
  RefreshCw,
  Mail,
  SlidersHorizontal,
  ChevronRight,
  UserCheck,
  ShieldAlert,
} from "lucide-react";

const CATEGORIES = [
  "ALL",
  "COMPLAINT",
  "BOOKING",
  "PAYMENT",
  "DISPUTE",
  "BUG",
  "ACCOUNT",
  "VERIFICATION",
  "FEEDBACK",
  "OTHER",
];

const PRIORITIES = ["ALL", "LOW", "NORMAL", "HIGH", "URGENT"];

const STATUSES = ["ALL", "OPEN", "IN_PROGRESS", "WAITING_ON_USER", "RESOLVED", "CLOSED"];

const SOURCES = ["ALL", "IN_APP", "EMAIL", "ADMIN_CREATED", "BOOKING", "ORDER_ROOM", "HELP_MENU"];

function formatSlaClock(ticket: TicketListItem): {
  label: string;
  tone: "red" | "amber" | "green" | "neutral";
} {
  if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
    if (ticket.timeToFirstResponseMs != null) {
      const mins = Math.round(ticket.timeToFirstResponseMs / (60 * 1000));
      if (mins < 60) return { label: `Responded in ${mins}m`, tone: "neutral" };
      const hrs = (mins / 60).toFixed(1);
      return { label: `Responded in ${hrs}h`, tone: "neutral" };
    }
    return { label: "Resolved", tone: "neutral" };
  }

  if (ticket.firstResponseAt) {
    if (ticket.timeToFirstResponseMs != null) {
      const mins = Math.round(ticket.timeToFirstResponseMs / (60 * 1000));
      if (mins < 60) return { label: `1st reply in ${mins}m`, tone: "green" };
      const hrs = (mins / 60).toFixed(1);
      return { label: `1st reply in ${hrs}h`, tone: "green" };
    }
    return { label: "Responded", tone: "green" };
  }

  if (ticket.isBreached || ticket.slaRemainingMs <= 0) {
    const overdueMs = Math.abs(ticket.slaRemainingMs);
    const hrs = Math.floor(overdueMs / (60 * 60 * 1000));
    const mins = Math.floor((overdueMs % (60 * 60 * 1000)) / (60 * 1000));
    return {
      label: `Breached by ${hrs > 0 ? `${hrs}h ` : ""}${mins}m`,
      tone: "red",
    };
  }

  const remainingMs = ticket.slaRemainingMs;
  const hrs = Math.floor(remainingMs / (60 * 60 * 1000));
  const mins = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

  if (hrs < 2) {
    return {
      label: `${hrs > 0 ? `${hrs}h ` : ""}${mins}m left`,
      tone: "amber",
    };
  }

  return {
    label: `${hrs}h ${mins}m left`,
    tone: "green",
  };
}

function TicketsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Read URL params
  const currentView = (searchParams.get("view") || "unassigned") as TicketListFilterOptions["view"];
  const currentCategory = searchParams.get("category") || "ALL";
  const currentPriority = searchParams.get("priority") || "ALL";
  const currentStatus = searchParams.get("status") || "ALL";
  const currentSource = searchParams.get("source") || "ALL";
  const currentSearch = searchParams.get("search") || "";

  // Component state
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [counts, setCounts] = useState({
    mine: 0,
    unassigned: 0,
    urgent: 0,
    waiting_user: 0,
    all: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search input local state
  const [searchInput, setSearchInput] = useState(currentSearch);

  // Create on behalf modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createUserId, setCreateUserId] = useState("");
  const [createSubject, setCreateSubject] = useState("");
  const [createMessage, setCreateMessage] = useState("");
  const [createCategory, setCreateCategory] = useState("COMPLAINT");
  const [createPriority, setCreatePriority] = useState("NORMAL");
  const [createBookingId, setCreateBookingId] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(newParams)) {
      if (value === null || value === "" || value === "ALL") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const loadTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminClient.getTickets({
        view: currentView,
        category: currentCategory !== "ALL" ? currentCategory : undefined,
        priority: currentPriority !== "ALL" ? currentPriority : undefined,
        status: currentStatus !== "ALL" ? currentStatus : undefined,
        source: currentSource !== "ALL" ? currentSource : undefined,
        search: currentSearch || undefined,
      });

      setTickets(res.tickets || []);
      if (res.counts) {
        setCounts(res.counts);
      }
    } catch (err: any) {
      console.error("[TicketsPage] loadTickets error:", err);
      setError(err.message || "Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [currentView, currentCategory, currentPriority, currentStatus, currentSource, currentSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput.trim() });
  };

  const handleCreateOnBehalf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUserId.trim() || !createSubject.trim() || !createMessage.trim()) return;

    setCreatingTicket(true);
    setCreateError(null);
    try {
      await adminClient.createTicketOnBehalf({
        userId: createUserId.trim(),
        subject: createSubject.trim(),
        message: createMessage.trim(),
        category: createCategory,
        priority: createPriority,
        bookingId: createBookingId.trim() || undefined,
        source: "ADMIN_CREATED",
      });

      setShowCreateModal(false);
      setCreateUserId("");
      setCreateSubject("");
      setCreateMessage("");
      setCreateBookingId("");
      loadTickets();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create ticket");
    } finally {
      setCreatingTicket(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              AD-15 · M7
            </span>
            <span className="text-xs text-zinc-500">SLA Standard: 24h · Urgent: 4h</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-zinc-900 dark:text-zinc-100 mt-1">
            Support &amp; Complaints
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            Omnichannel inbox with SLA tracking, staff notes, and user response threads.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadTickets}
            disabled={loading}
            className="h-9 px-3 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="h-9 px-3.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New on Behalf</span>
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto pb-px">
        {[
          { id: "unassigned", label: "Unassigned", count: counts.unassigned },
          { id: "mine", label: "Assigned to Me", count: counts.mine },
          { id: "urgent", label: "Urgent", count: counts.urgent, highlight: true },
          { id: "waiting_user", label: "Waiting on User", count: counts.waiting_user },
          { id: "all", label: "All Tickets", count: counts.all },
        ].map((tab) => {
          const active = currentView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => updateFilters({ view: tab.id })}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                active
                  ? "border-red-600 text-red-600 dark:text-red-400 font-semibold"
                  : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  active
                    ? tab.highlight && tab.count > 0
                      ? "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 font-bold"
                      : "bg-red-50 dark:bg-zinc-800 text-red-600 dark:text-red-400"
                    : tab.highlight && tab.count > 0
                      ? "bg-red-500/10 text-red-600 dark:text-red-400 font-bold"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by ticket #, subject, reporter email, or user name..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Category Filter */}
            <select
              value={currentCategory}
              onChange={(e) => updateFilters({ category: e.target.value })}
              className="h-9 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.filter((c) => c !== "ALL").map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={currentPriority}
              onChange={(e) => updateFilters({ priority: e.target.value })}
              className="h-9 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none"
            >
              <option value="ALL">All Priorities</option>
              {PRIORITIES.filter((p) => p !== "ALL").map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={currentStatus}
              onChange={(e) => updateFilters({ status: e.target.value })}
              className="h-9 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              {STATUSES.filter((s) => s !== "ALL").map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>

            {/* Source Filter */}
            <select
              value={currentSource}
              onChange={(e) => updateFilters({ source: e.target.value })}
              className="h-9 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none"
            >
              <option value="ALL">All Sources</option>
              {SOURCES.filter((s) => s !== "ALL").map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={loadTickets}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200"
            >
              Try Again
            </button>
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            title="No tickets found"
            description="No support requests or complaints match your current view and filter selection."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Ticket #</TableHead>
                  <TableHead>Subject &amp; Requester</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SLA Clock</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => {
                  const sla = formatSlaClock(t);
                  return (
                    <TableRow key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      {/* Ticket # */}
                      <TableCell className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {t.number}
                      </TableCell>

                      {/* Subject & User */}
                      <TableCell>
                        <div className="min-w-[200px] max-w-sm">
                          <Link
                            href={`/tickets/${t.id}`}
                            className="font-medium text-xs text-zinc-900 dark:text-zinc-100 hover:text-red-600 dark:hover:text-red-400 transition-colors line-clamp-1"
                          >
                            {t.subject}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                            <span>{t.user?.name || t.reporterEmail || "User"}</span>
                            <span>·</span>
                            <span className="font-mono">{t.user?.userType || "USER"}</span>
                            {t.bookingId && (
                              <>
                                <span>·</span>
                                <span className="font-mono text-amber-600 dark:text-amber-400">
                                  Booking: {t.bookingId.slice(-6)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {t.category}
                        </span>
                      </TableCell>

                      {/* Priority */}
                      <TableCell>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            t.priority === "URGENT"
                              ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                              : t.priority === "HIGH"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          {t.priority}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            t.status === "OPEN"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : t.status === "WAITING_ON_USER"
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                : t.status === "IN_PROGRESS"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {t.status.replace(/_/g, " ")}
                        </span>
                      </TableCell>

                      {/* SLA Clock */}
                      <TableCell>
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium ${
                            sla.tone === "red"
                              ? "bg-red-500/15 text-red-600 dark:text-red-400 font-bold border border-red-500/30 animate-pulse"
                              : sla.tone === "amber"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                                : sla.tone === "green"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{sla.label}</span>
                        </div>
                      </TableCell>

                      {/* Assigned Admin */}
                      <TableCell className="text-xs text-zinc-600 dark:text-zinc-400">
                        {t.assignedAdmin ? (
                          <div className="flex items-center gap-1.5 font-medium">
                            <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="truncate max-w-[120px]">{t.assignedAdmin.email.split("@")[0]}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">Unassigned</span>
                        )}
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right">
                        <Link
                          href={`/tickets/${t.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                          <span>Open</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create on Behalf Modal */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Ticket on User's Behalf"
        description="For complaints received via customer service phone, WhatsApp, or email."
      >
        <form onSubmit={handleCreateOnBehalf} className="space-y-4 mt-3">
          {createError && (
            <div className="p-3 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-xs">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1 text-zinc-700 dark:text-zinc-300">
              User ID *
            </label>
            <input
              type="text"
              value={createUserId}
              onChange={(e) => setCreateUserId(e.target.value)}
              placeholder="e.g. usr-12345"
              required
              className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-zinc-700 dark:text-zinc-300">
                Category
              </label>
              <select
                value={createCategory}
                onChange={(e) => setCreateCategory(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none"
              >
                {CATEGORIES.filter((c) => c !== "ALL").map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-zinc-700 dark:text-zinc-300">
                Priority
              </label>
              <select
                value={createPriority}
                onChange={(e) => setCreatePriority(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none"
              >
                {PRIORITIES.filter((p) => p !== "ALL").map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-zinc-700 dark:text-zinc-300">
              Linked Booking ID (optional)
            </label>
            <input
              type="text"
              value={createBookingId}
              onChange={(e) => setCreateBookingId(e.target.value)}
              placeholder="e.g. b-12345"
              className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-zinc-700 dark:text-zinc-300">
              Subject *
            </label>
            <input
              type="text"
              value={createSubject}
              onChange={(e) => setCreateSubject(e.target.value)}
              placeholder="Summary of complaint"
              required
              className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-zinc-700 dark:text-zinc-300">
              Message / Notes *
            </label>
            <textarea
              value={createMessage}
              onChange={(e) => setCreateMessage(e.target.value)}
              placeholder="Provide full context from the caller..."
              required
              rows={4}
              className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingTicket}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {creatingTicket ? "Creating..." : "Create Ticket"}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 space-y-4">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <TicketsContent />
    </Suspense>
  );
}
