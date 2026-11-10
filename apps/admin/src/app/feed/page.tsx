"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  Play,
  Pause,
  RefreshCw,
  Globe,
  Clock,
  ArrowRight,
  User,
  Calendar,
  CreditCard,
  Briefcase,
  Image as ImageIcon,
  HelpCircle,
  Banknote,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { adminClient, type FeedEventItem } from "@/lib/admin-client";

const EVENT_GROUP_FILTERS = [
  { id: "all", label: "All Events" },
  { id: "auth", label: "Auth & Signups" },
  { id: "bookings", label: "Bookings" },
  { id: "payments", label: "Payments & Escrow" },
  { id: "projects", label: "Projects & Briefs" },
  { id: "media", label: "Media & Rates" },
  { id: "withdrawals", label: "Withdrawals" },
  { id: "support", label: "Support & Disputes" },
];

export default function LiveFeedPage() {
  const [events, setEvents] = useState<FeedEventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Filters
  const [eventGroup, setEventGroup] = useState<string>("all");
  const [userType, setUserType] = useState<string>("ALL");
  const [useUtc, setUseUtc] = useState<boolean>(false);

  // Last refreshed timer
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  // Fetch initial/refreshed feed
  const fetchFeed = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setLoading(true);

      try {
        const res = await adminClient.getFeed({
          eventGroup: eventGroup !== "all" ? eventGroup : undefined,
          userType: userType !== "ALL" ? userType : undefined,
          limit: 30,
        });

        setEvents(res.events);
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
        setLastUpdated(new Date());
        setSecondsAgo(0);
      } catch (err) {
        console.error("[LiveFeed] Failed to load activity feed:", err);
      } finally {
        if (!isBackground) setLoading(false);
      }
    },
    [eventGroup, userType],
  );

  // Fetch older page
  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);

    try {
      const res = await adminClient.getFeed({
        cursor: nextCursor,
        eventGroup: eventGroup !== "all" ? eventGroup : undefined,
        userType: userType !== "ALL" ? userType : undefined,
        limit: 30,
      });

      setEvents((prev) => [...prev, ...res.events]);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error("[LiveFeed] Failed to load more events:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Initial load & when filters change
  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // 15-second polling loop
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(() => {
      fetchFeed(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [isPolling, fetchFeed]);

  // Elapsed seconds timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [lastUpdated]);

  // Format timestamp helper
  const formatEventTime = (isoString: string) => {
    const d = new Date(isoString);
    if (useUtc) {
      return (
        d.toISOString().slice(11, 19) +
        " UTC · " +
        d.toISOString().slice(5, 10).replace("-", "/")
      );
    }
    return (
      d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }) +
      " " +
      d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    );
  };

  // Group badge styling & icons
  const getGroupBadge = (group: string) => {
    switch (group) {
      case "auth":
        return {
          icon: <User className="h-3.5 w-3.5" />,
          color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
          name: "Auth",
        };
      case "bookings":
        return {
          icon: <Calendar className="h-3.5 w-3.5" />,
          color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          name: "Booking",
        };
      case "payments":
        return {
          icon: <CreditCard className="h-3.5 w-3.5" />,
          color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          name: "Payment",
        };
      case "projects":
        return {
          icon: <Briefcase className="h-3.5 w-3.5" />,
          color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
          name: "Project",
        };
      case "media":
        return {
          icon: <ImageIcon className="h-3.5 w-3.5" />,
          color: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
          name: "Media",
        };
      case "withdrawals":
        return {
          icon: <Banknote className="h-3.5 w-3.5" />,
          color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
          name: "Payout",
        };
      case "support":
        return {
          icon: <HelpCircle className="h-3.5 w-3.5" />,
          color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
          name: "Support",
        };
      default:
        return {
          icon: <Activity className="h-3.5 w-3.5" />,
          color: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
          name: "Event",
        };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Title & Polling Controls ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold uppercase text-monologg-red">AD-03</span>
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Live Activity Feed
            </h1>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Chronological audit stream of platform events with actor masking and 15s live polling.
          </p>
        </div>

        {/* Polling & Timezone Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pause / Resume Button */}
          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isPolling
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                : "bg-gray-100 dark:bg-[#202020] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#2E2E2E]"
            }`}
          >
            {isPolling ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <Pause className="h-3 w-3" />
                <span>Polling (15s)</span>
              </>
            ) : (
              <>
                <Play className="h-3 w-3" />
                <span>Paused</span>
              </>
            )}
          </button>

          {/* Timezone Toggle */}
          <button
            onClick={() => setUseUtc(!useUtc)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] text-gray-700 dark:text-gray-300 text-xs font-mono font-medium hover:bg-gray-50 dark:hover:bg-[#222222] transition-colors"
            title="Toggle between local browser timezone and UTC"
          >
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <span>{useUtc ? "Time: UTC" : "Time: Local"}</span>
          </button>

          {/* Refresh & Elapsed Indicator */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] text-xs font-mono text-gray-500">
            <span>{secondsAgo < 5 ? "Updated just now" : `Updated ${secondsAgo}s ago`}</span>
            <button
              onClick={() => fetchFeed(false)}
              disabled={loading}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50"
              title="Refresh now"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Filters (Event Group & User Type) ─────────────────────────── */}
      <div className="rounded-xl border border-gray-200 dark:border-[#242424] bg-white dark:bg-[#141414] p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
            {EVENT_GROUP_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setEventGroup(f.id)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap border ${
                  eventGroup === f.id
                    ? "bg-gray-900 text-white dark:bg-white dark:text-black border-transparent shadow-xs"
                    : "border-gray-200 dark:border-[#2E2E2E] text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* User Type Filter */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="text-xs text-gray-500">Actor Type:</span>
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
              className="text-xs rounded-lg border border-gray-200 dark:border-[#2A2A2A] bg-gray-50 dark:bg-[#1A1A1A] text-gray-800 dark:text-gray-200 px-2.5 py-1 focus:outline-hidden focus:ring-1 focus:ring-monologg-red"
            >
              <option value="ALL">All Actors</option>
              <option value="TALENT">Talent</option>
              <option value="CLIENT">Clients</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Activity Stream ───────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-18 w-full rounded-xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={<Activity className="h-8 w-8 text-gray-400" />}
          title="No activity events recorded yet."
          description="Activity events will appear here in real time as signups, bookings, and payments occur."
        />
      ) : (
        <div className="space-y-2.5">
          {events.map((ev) => {
            const groupBadge = getGroupBadge(ev.eventGroup);

            return (
              <div
                key={ev.id}
                className="rounded-xl border border-gray-200 dark:border-[#242424] bg-white dark:bg-[#141414] p-3.5 sm:p-4 shadow-2xs hover:border-gray-300 dark:hover:border-[#333333] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Left side: Icon, Description, Metadata */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-lg border shrink-0 mt-0.5 sm:mt-0 ${groupBadge.color}`}
                  >
                    {groupBadge.icon}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {ev.description}
                      </span>

                      {/* Group Tag */}
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm border ${groupBadge.color}`}
                      >
                        {groupBadge.name}
                      </span>

                      {/* Actor Type Pill */}
                      {ev.userType && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#202020] text-gray-600 dark:text-gray-400">
                          {ev.userType}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-mono text-gray-700 dark:text-gray-300">
                        Actor: {ev.actorLabel}
                      </span>
                      {ev.country && (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-gray-500">
                          <Globe className="h-3 w-3" />
                          {ev.country}
                        </span>
                      )}
                      <span className="font-mono text-[11px] text-gray-400">
                        {formatEventTime(ev.occurredAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side: Click-through Button */}
                {ev.targetUrl && (
                  <div className="self-end sm:self-center shrink-0">
                    <Link
                      href={ev.targetUrl}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#2A2A2A] hover:bg-gray-50 dark:hover:bg-[#1E1E1E] text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      <span>
                        {ev.targetType === "booking"
                          ? "Booking"
                          : ev.targetType === "user"
                          ? "User 360"
                          : "Details"}
                      </span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}

          {/* Load More Button */}
          {hasMore && (
            <div className="pt-4 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#141414] hover:bg-gray-50 dark:hover:bg-[#1C1C1C] text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
              >
                {loadingMore ? "Loading earlier events..." : "Load Earlier Events"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
