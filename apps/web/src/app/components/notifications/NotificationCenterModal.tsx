import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  CheckCheck,
  Filter,
  DollarSign,
  Briefcase,
  FileText,
  MessageSquare,
  ShieldCheck,
  Video,
  Clock,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router";
import { appStateSync } from "../../../lib/state-sync";

export type NotificationCategory =
  | "all"
  | "action_required"
  | "order_room"
  | "payments"
  | "applications"
  | "system";

export interface RichNotification {
  id: string;
  kind: string;
  category: "action_required" | "order_room" | "payments" | "applications" | "system";
  actorName: string;
  actorAvatar?: string | null;
  actorRole?: string;
  title: string;
  subtitle: string;
  contextTag?: string;
  amount?: string;
  actionCta?: string;
  actionUrl?: string;
  actionTab?: string;
  actionRequired?: boolean;
  createdAt: string;
  readAt?: string | null;
}

export interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: "client" | "talent";
  onNavigateToTab?: (tab: string) => void;
  items?: Array<{ id: string; kind: string; payload: Record<string, unknown>; readAt?: string | null; createdAt: string }>;
  onMarkRead?: (id: string) => void;
}

export function NotificationCenterModal({
  isOpen,
  onClose,
  role,
  onNavigateToTab,
  items,
  onMarkRead,
}: NotificationCenterModalProps) {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Synchronized notification items
  const [localNotifications, setLocalNotifications] = useState<RichNotification[]>(() => {
    return getInitialNotifications(role);
  });

  const notifications = useMemo(() => {
    if (items !== undefined) {
      return items.map((item) => mapAppNotificationToRich(item));
    }
    return localNotifications;
  }, [items, localNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.readAt).length;
  }, [notifications]);

  const actionRequiredCount = useMemo(() => {
    return notifications.filter((n) => n.actionRequired && !n.readAt).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (unreadOnly && item.readAt) return false;
      if (activeCategory === "all") return true;
      if (activeCategory === "action_required") return item.actionRequired;
      return item.category === activeCategory;
    });
  }, [notifications, activeCategory, unreadOnly]);

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLocalNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt || new Date().toISOString() } : n)),
    );
    appStateSync.markNotificationRead(id);
    onMarkRead?.(id);
  };

  const handleMarkAllRead = () => {
    const now = new Date().toISOString();
    setLocalNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || now })));
    notifications.forEach((n) => {
      appStateSync.markNotificationRead(n.id);
      onMarkRead?.(n.id);
    });
  };

  const handleNotificationAction = (item: RichNotification) => {
    handleMarkAsRead(item.id);
    onClose();
    if (item.actionUrl) {
      if (item.actionUrl.startsWith("http")) {
        window.open(item.actionUrl, "_blank", "noopener,noreferrer");
      } else {
        navigate(item.actionUrl);
      }
    } else if (item.actionTab && onNavigateToTab) {
      onNavigateToTab(item.actionTab);
    }
  };

  const categories: Array<{ id: NotificationCategory; label: string; badge?: number }> = [
    { id: "all", label: "All" },
    { id: "action_required", label: "Action Required", badge: actionRequiredCount },
    { id: "order_room", label: "Order Room" },
    { id: "payments", label: "Escrow & Payments" },
    { id: "applications", label: role === "client" ? "Casting" : "Applications" },
    { id: "system", label: "System" },
  ];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(0, 0, 0, 0.45)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="w-full max-w-full sm:max-w-md md:max-w-lg h-full flex flex-col shadow-2xl relative"
        style={{
          background: "var(--color-bg-surface)",
          borderLeft: "1px solid var(--color-hairline)",
          color: "var(--color-text-primary)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top Header ─────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 pb-3 border-b border-[var(--color-hairline)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight truncate">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border border-[var(--color-hairline)] shrink-0">
                {unreadCount} unread
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md hover:bg-[var(--color-bg-elevated)]"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark all as read</span>
                <span className="sm:hidden">Mark all</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notifications"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Category Filters & Unread Toggle ──────────────────── */}
        <div className="px-3 sm:px-4 py-2 border-b border-[var(--color-hairline)] bg-[var(--color-bg-canvas)] flex items-center justify-between gap-1.5 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 shrink-0">
            {categories.map((c) => {
              const active = activeCategory === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCategory(c.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all shrink-0 flex items-center gap-1.5 ${
                    active
                      ? "bg-[var(--color-text-primary)] text-[var(--color-bg-canvas)] shadow-xs"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-2)]"
                  }`}
                >
                  <span>{c.label}</span>
                  {c.badge !== undefined && c.badge > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        active
                          ? "bg-[var(--color-accent)] text-white"
                          : "bg-red-500/20 text-red-500 font-bold"
                      }`}
                    >
                      {c.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setUnreadOnly((prev) => !prev)}
            className={`p-1.5 rounded-full text-xs font-medium transition-colors shrink-0 ${
              unreadOnly
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-2)]"
            }`}
            title={unreadOnly ? "Showing unread only" : "Filter unread only"}
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Notification Feed ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 divide-y divide-transparent">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-[var(--color-bg-surface-2)] flex items-center justify-center text-[var(--color-text-tertiary)] mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">All caught up!</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1 max-w-xs">
                {unreadOnly
                  ? "No unread notifications in this category."
                  : "No notifications found under this filter."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const isUnread = !item.readAt;
              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationAction(item)}
                  className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer relative group ${
                    isUnread
                      ? "bg-[var(--color-bg-surface)] border-[var(--color-border-strong)] shadow-xs hover:border-[var(--color-accent)]"
                      : "bg-[var(--color-bg-surface)] border-[var(--color-hairline)] hover:border-[var(--color-border-strong)] opacity-85 hover:opacity-100"
                  }`}
                >
                  {/* Unread Indicator Dot */}
                  {isUnread && (
                    <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[var(--color-accent)] ring-4 ring-[var(--color-accent)]/15" />
                  )}

                  <div className="flex items-start gap-3.5">
                    {/* Actor Avatar / Icon Badge */}
                    <div className="relative shrink-0 mt-0.5">
                      {item.actorAvatar ? (
                        <img
                          src={item.actorAvatar}
                          alt={item.actorName}
                          className="w-10 h-10 rounded-full object-cover border border-[var(--color-hairline)]"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs"
                          style={{
                            background: getCategoryBadgeBg(item.category),
                            color: getCategoryBadgeColor(item.category),
                          }}
                        >
                          {getCategoryIcon(item.category)}
                        </div>
                      )}

                      {/* Mini corner status badge */}
                      {item.actionRequired && (
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] shadow-xs ring-2 ring-[var(--color-bg-surface)]">
                          !
                        </span>
                      )}
                    </div>

                    {/* Middle Details */}
                    <div className="flex-1 min-w-0 pr-4">
                      {/* Subheader: Actor & Category & Timestamp */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1 text-xs">
                        <span className="font-semibold text-[var(--color-text-primary)]">
                          {item.actorName}
                        </span>
                        {item.actorRole && (
                          <span className="text-[11px] text-[var(--color-text-tertiary)]">
                            · {item.actorRole}
                          </span>
                        )}
                        <span className="text-[var(--color-text-tertiary)]">·</span>
                        <span className="text-[11px] text-[var(--color-text-tertiary)]">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>

                      {/* Headline Title */}
                      <p className="text-sm font-semibold text-[var(--color-text-primary)] leading-snug">
                        {item.title}
                      </p>

                      {/* Context Box (FAANG Activity Timeline Style) */}
                      <div className="mt-2 p-2.5 rounded-lg bg-[var(--color-bg-surface-2)] border border-[var(--color-hairline)] text-xs text-[var(--color-text-secondary)] space-y-1.5">
                        <p className="leading-relaxed">{item.subtitle}</p>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--color-hairline)] text-[11px]">
                          {item.contextTag && (
                            <span className="px-2 py-0.5 rounded bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] font-medium border border-[var(--color-hairline)]">
                              {item.contextTag}
                            </span>
                          )}
                          {item.amount && (
                            <span className="font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                              {item.amount}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action CTA Button */}
                      {item.actionCta && (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotificationAction(item);
                            }}
                            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--color-text-primary)] text-[var(--color-bg-canvas)] hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-1 shadow-xs"
                          >
                            <span>{item.actionCta}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          {isUnread && (
                            <button
                              type="button"
                              onClick={(e) => handleMarkAsRead(item.id, e)}
                              className="px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-2)] rounded-lg transition-colors"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "payments":
      return <DollarSign className="w-4 h-4" />;
    case "order_room":
      return <Video className="w-4 h-4" />;
    case "applications":
      return <Briefcase className="w-4 h-4" />;
    case "action_required":
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:
      return <ShieldCheck className="w-4 h-4" />;
  }
}

function getCategoryBadgeBg(category: string) {
  switch (category) {
    case "payments":
      return "rgba(16, 185, 129, 0.12)";
    case "order_room":
      return "rgba(59, 130, 246, 0.12)";
    case "applications":
      return "rgba(168, 85, 247, 0.12)";
    case "action_required":
      return "rgba(239, 68, 68, 0.12)";
    default:
      return "rgba(113, 113, 122, 0.12)";
  }
}

function getCategoryBadgeColor(category: string) {
  switch (category) {
    case "payments":
      return "#10B981";
    case "order_room":
      return "#3B82F6";
    case "applications":
      return "#A855F7";
    case "action_required":
      return "#EF4444";
    default:
      return "var(--color-text-secondary)";
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

function getInitialNotifications(role: "client" | "talent"): RichNotification[] {
  const now = Date.now();
  if (role === "client") {
    return [
      {
        id: "notif-c1",
        kind: "deliverable_submitted",
        category: "order_room",
        actorName: "Adaeze Obi",
        actorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
        actorRole: "Voice-Over Artist",
        title: "Deliverable uploaded for review",
        subtitle: "Adaeze Obi submitted 'Raw Monologue Take 3.mp4' (48MB) for client approval.",
        contextTag: "Nike Q1 Commercial · Order #ORD-001",
        amount: "₦134,400 in Escrow",
        actionCta: "Review Deliverable",
        actionUrl: "/order/ORD-001",
        actionRequired: true,
        createdAt: new Date(now - 8 * 60000).toISOString(),
      },
      {
        id: "notif-c2",
        kind: "application_received",
        category: "applications",
        actorName: "Chidi Okeke",
        actorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
        actorRole: "Actor",
        title: "New candidate audition submitted",
        subtitle: "Submitted audition tape for Lead Actor with 2 custom reads.",
        contextTag: "Pulse Fitness Commercial",
        actionCta: "Review Audition",
        actionTab: "projects",
        actionRequired: true,
        createdAt: new Date(now - 24 * 60000).toISOString(),
      },
      {
        id: "notif-c3",
        kind: "escrow_funded",
        category: "payments",
        actorName: "Escrow Protocol",
        actorRole: "Paystack Secured",
        title: "Escrow Deposit Confirmed",
        subtitle: "₦450,000 has been secured in platform escrow for 'Nike Q1 Campaign'.",
        contextTag: "Brief #BRF-2026-004",
        amount: "₦450,000 Locked",
        actionCta: "View Escrow Ledger",
        actionTab: "activity",
        createdAt: new Date(now - 65 * 60000).toISOString(),
        readAt: new Date(now - 10 * 60000).toISOString(),
      },
      {
        id: "notif-c4",
        kind: "meet_scheduled",
        category: "order_room",
        actorName: "Google Meet",
        actorRole: "Automated Calendar Sync",
        title: "Introduction Call Scheduled",
        subtitle: "Pre-production alignment video call with Adaeze Obi today at 3:00 PM.",
        contextTag: "Video Conference · 30 Mins",
        actionCta: "Launch Meet ↗",
        actionUrl: "https://meet.google.com/monologg-demo",
        createdAt: new Date(now - 120 * 60000).toISOString(),
      },
      {
        id: "notif-c5",
        kind: "onsite_pin_generated",
        category: "order_room",
        actorName: "Production Check-in",
        actorRole: "Security Protocol",
        title: "4-Digit PIN Active",
        subtitle: "Check-in PIN code '4829' is active. Share with performer upon physical arrival.",
        contextTag: "Lekki Phase 1 Studio",
        actionCta: "Open Order Room",
        actionUrl: "/order/ORD-001",
        createdAt: new Date(now - 280 * 60000).toISOString(),
        readAt: new Date(now - 200 * 60000).toISOString(),
      },
      {
        id: "notif-c6",
        kind: "signin_notice",
        category: "system",
        actorName: "Google Account",
        actorRole: "Security",
        title: "Google Identity Connected",
        subtitle: "Your profile information, name, and verified avatar have been synchronized.",
        contextTag: "Google OAuth 2.0",
        actionCta: "Security Settings",
        actionUrl: "/settings",
        createdAt: new Date(now - 360 * 60000).toISOString(),
        readAt: new Date(now - 350 * 60000).toISOString(),
      },
    ];
  }

  return [
    {
      id: "notif-t1",
      kind: "booking_created",
      category: "applications",
      actorName: "FilmCraft Studios",
      actorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
      actorRole: "Verified Client",
      title: "New Booking Request",
      subtitle: "Brand Agency NG requested a Commercial Voice-Over with 2 revisions included.",
      contextTag: "Nike Q1 Commercial · Booking #ORD-001",
      amount: "₦134,400 Escrow",
      actionCta: "View Booking Request",
      actionUrl: "/order/ORD-001",
      actionRequired: true,
      createdAt: new Date(now - 5 * 60000).toISOString(),
    },
    {
      id: "notif-t2",
      kind: "payment_released",
      category: "payments",
      actorName: "Monologg Escrow",
      actorRole: "Automated Settlement",
      title: "Payment Received",
      subtitle: "Milestone payment for Booking booking-42 has been released directly to your Available Balance.",
      contextTag: "Booking booking-42 · Day 1 Wrap",
      amount: "₦134,400 Credited",
      actionCta: "View Available Balance",
      actionTab: "earnings",
      createdAt: new Date(now - 15 * 60000).toISOString(),
    },
    {
      id: "notif-t3",
      kind: "application_selected",
      category: "applications",
      actorName: "Netflix Nollywood",
      actorRole: "Casting Director",
      title: "You've Been Selected!",
      subtitle: "Congratulations! You have been selected for the role of 'Chief Inspector' in Netflix Nollywood Series.",
      contextTag: "Feature Film Season 2",
      amount: "₦350,000",
      actionCta: "View Contract & Brief",
      actionTab: "projects",
      actionRequired: true,
      createdAt: new Date(now - 45 * 60000).toISOString(),
    },
    {
      id: "notif-t4",
      kind: "order_revision",
      category: "order_room",
      actorName: "FilmCraft Studios",
      actorRole: "Client Feedback",
      title: "Revision Requested",
      subtitle: "Client left a note on Scene 2: 'Please deliver take 2 with a higher conversational energy'.",
      contextTag: "Order Room #ORD-001",
      actionCta: "Open Order Room ↗",
      actionUrl: "/order/ORD-001",
      actionRequired: true,
      createdAt: new Date(now - 90 * 60000).toISOString(),
    },
    {
      id: "notif-t5",
      kind: "calendar_meet",
      category: "order_room",
      actorName: "Google Calendar",
      actorRole: "Meet Integration",
      title: "Pre-Production Call in 30 Mins",
      subtitle: "Live Google Meet consultation with Sarah Jenkins. Camera check and audio levels.",
      contextTag: "Online · 3:00 PM Today",
      actionCta: "Join Google Meet ↗",
      actionUrl: "https://meet.google.com/monologg-demo",
      createdAt: new Date(now - 140 * 60000).toISOString(),
    },
    {
      id: "notif-t6",
      kind: "kyc_approved",
      category: "system",
      actorName: "Monologg Trust & Safety",
      actorRole: "Identity KYC",
      title: "Verified Performer Badge Approved",
      subtitle: "Your government ID and face match have been verified. Verified Performer badge is active on your public profile.",
      contextTag: "Smile Identity Sandbox",
      actionCta: "View Public Profile",
      actionTab: "storefront",
      createdAt: new Date(now - 1440 * 60000).toISOString(),
      readAt: new Date(now - 700 * 60000).toISOString(),
    },
  ];
}

function mapAppNotificationToRich(n: {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  readAt?: string | null;
  createdAt: string;
}): RichNotification {
  const isBooking = n.kind.includes("booking");
  const isPayment = n.kind.includes("payment") || n.kind.includes("escrow");
  const isApp = n.kind.includes("application");
  const isOrder = n.kind.includes("order") || n.kind.includes("deliverable");

  let category: RichNotification["category"] = "system";
  if (isPayment) category = "payments";
  else if (isBooking || isApp) category = "applications";
  else if (isOrder) category = "order_room";

  let title = n.kind.replace(/_/g, " ");
  if (n.kind === "booking_created") title = "New Booking Request";
  else if (n.kind === "payment_released") title = "Payment Received";
  else if (n.kind === "application_selected") title = "You've Been Selected!";
  else if (n.kind === "application_shortlisted") title = "Application Update";
  else if (n.kind === "deliverable_submitted") title = "Deliverable uploaded for review";

  let subtitle = "Tap to view details.";
  if (typeof n.payload.message === "string") subtitle = n.payload.message;
  else if (typeof n.payload.projectName === "string") subtitle = `"${n.payload.projectName}"`;
  else if (typeof n.payload.bookingId === "string") subtitle = `Booking ${n.payload.bookingId}`;
  else if (typeof n.payload.clientName === "string") subtitle = `Update for ${n.payload.clientName}`;
  else if (typeof n.payload.creatorName === "string") subtitle = `Update for ${n.payload.creatorName}`;

  return {
    id: n.id,
    kind: n.kind,
    category,
    actorName:
      (n.payload.clientName as string) ||
      (n.payload.creatorName as string) ||
      (isPayment ? "Monologg Escrow" : isBooking ? "Brand Agency NG" : "System Update"),
    title,
    subtitle,
    contextTag: n.payload.bookingId ? `Booking #${n.payload.bookingId}` : undefined,
    actionCta: isPayment ? "View Balance" : isBooking ? "View Booking" : "View Details",
    actionRequired: !n.readAt && (isBooking || n.kind.includes("action")),
    createdAt: n.createdAt,
    readAt: n.readAt,
  };
}
