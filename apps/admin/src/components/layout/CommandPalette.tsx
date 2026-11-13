"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  ArrowRight,
  LayoutDashboard,
  Activity,
  Bell,
  HeartPulse,
  Users,
  Calendar,
  ShieldCheck,
  CreditCard,
  ArrowDownLeft,
  DollarSign,
  LifeBuoy,
  Scale,
  TrendingUp,
  Filter,
  Eye,
  Sparkles,
  Store,
  FileText,
  Download,
  UserCog,
  Settings,
} from "lucide-react";

export interface PaletteItem {
  id: string;
  label: string;
  group: string;
  href: string;
  keywords: string;
  code?: string;
  icon: React.ReactNode;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { id: "overview", label: "Platform Overview", group: "Command Center", href: "/", code: "AD-01", keywords: "kpi metrics dashboard home revenue gmv", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "feed", label: "Live Activity Feed", group: "Command Center", href: "/feed", code: "AD-02", keywords: "realtime stream events audit log", icon: <Activity className="h-4 w-4" /> },
  { id: "alerts", label: "System Alerts Console", group: "Command Center", href: "/alerts", code: "AD-27", keywords: "incidents sla breached critical warning", icon: <Bell className="h-4 w-4" /> },
  { id: "health", label: "System Health & Infrastructure", group: "Command Center", href: "/health", code: "AD-28", keywords: "postgres r2 storage cron jobs webhooks", icon: <HeartPulse className="h-4 w-4" /> },

  { id: "users", label: "Users Directory", group: "Marketplace", href: "/users", code: "AD-03", keywords: "creators talent clients accounts profiles", icon: <Users className="h-4 w-4" /> },
  { id: "bookings", label: "Bookings & Escrow Monitor", group: "Marketplace", href: "/bookings", code: "AD-09", keywords: "orders stuck escrow schedule slots", icon: <Calendar className="h-4 w-4" /> },
  { id: "verifications", label: "Talent Verifications Queue", group: "Marketplace", href: "/verifications", code: "AD-26", keywords: "kyc video verification approve reject", icon: <ShieldCheck className="h-4 w-4" /> },

  { id: "payments", label: "Transactions & Reconciliation", group: "Finance", href: "/payments", code: "AD-14", keywords: "paystack stripe ledger mismatch fees", icon: <CreditCard className="h-4 w-4" /> },
  { id: "withdrawals", label: "Creator Withdrawals", group: "Finance", href: "/withdrawals", code: "AD-16", keywords: "payouts bank otp transfer hold", icon: <ArrowDownLeft className="h-4 w-4" /> },
  { id: "earnings", label: "Creator Earnings & Spenders", group: "Finance", href: "/earnings", code: "AD-15", keywords: "ngn usd gbp revenue leaderboard", icon: <DollarSign className="h-4 w-4" /> },

  { id: "tickets", label: "Support Tickets Queue", group: "Trust & Support", href: "/tickets", code: "AD-17", keywords: "helpdesk complaints sla replies", icon: <LifeBuoy className="h-4 w-4" /> },
  { id: "disputes", label: "Escrow Disputes Queue", group: "Trust & Support", href: "/disputes", code: "AD-25", keywords: "mediation four eyes refund release", icon: <Scale className="h-4 w-4" /> },

  { id: "acquisition", label: "Acquisition & Attribution", group: "Intelligence", href: "/analytics/acquisition", code: "AD-19", keywords: "utms referrals channels signups", icon: <TrendingUp className="h-4 w-4" /> },
  { id: "funnels", label: "Conversion Funnels", group: "Intelligence", href: "/analytics/funnels", code: "AD-20", keywords: "onboarding lifecycle dropoff conversion", icon: <Filter className="h-4 w-4" /> },
  { id: "retention", label: "Weekly Retention Cohorts", group: "Intelligence", href: "/analytics/retention", code: "AD-21", keywords: "churn cohorts w1 w4", icon: <Users className="h-4 w-4" /> },
  { id: "traffic", label: "Traffic & Storefront Views", group: "Intelligence", href: "/analytics/traffic", code: "AD-22", keywords: "pageviews browsers countries devices", icon: <Eye className="h-4 w-4" /> },
  { id: "features", label: "Feature Adoption & Attributes", group: "Intelligence", href: "/analytics/features", code: "AD-23", keywords: "rate card calendar media kit usage", icon: <Sparkles className="h-4 w-4" /> },
  { id: "marketplace", label: "Marketplace Liquidity Health", group: "Intelligence", href: "/analytics/marketplace", code: "AD-24", keywords: "supply demand briefs applications niche", icon: <Store className="h-4 w-4" /> },

  { id: "audit", label: "Immutable Audit Log", group: "Governance", href: "/audit", code: "AD-29", keywords: "compliance logs security pii reveal", icon: <FileText className="h-4 w-4" /> },
  { id: "exports", label: "Data Exports (CSV)", group: "Governance", href: "/exports", code: "AD-30", keywords: "csv r2 signed download", icon: <Download className="h-4 w-4" /> },
  { id: "admins", label: "Admin Team & Roles", group: "Governance", href: "/admins", code: "AD-31", keywords: "rbacs invite mfa staff", icon: <UserCog className="h-4 w-4" /> },
  { id: "settings", label: "Platform Settings & SLAs", group: "Governance", href: "/settings", code: "AD-32", keywords: "thresholds config four eyes rules", icon: <Settings className="h-4 w-4" /> },
];

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PALETTE_ITEMS;
    return PALETTE_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q) ||
        (item.code && item.code.toLowerCase().includes(q)),
    );
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  const navigateTo = (href: string) => {
    onClose();
    router.push(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      navigateTo(filtered[selectedIndex].href);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-16 sm:pt-24"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Admin Quick Jump"
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#141414] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-gray-200 dark:border-[#242424] px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Jump to screen, queue, or metric (e.g. funnels, payouts, AD-09)..."
            className="w-full bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick jump"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#222222] dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-600 dark:text-gray-400">
              No matching screens found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const active = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => navigateTo(item.href)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${
                    active
                      ? "bg-monologg-red/10 text-gray-900 dark:text-white"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#1D1D1D]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={active ? "text-monologg-red" : "text-gray-500 dark:text-gray-400"}>
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400">{item.group}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {item.code && (
                      <span className="rounded bg-gray-100 dark:bg-[#222222] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                        {item.code}
                      </span>
                    )}
                    <ArrowRight className={`h-3.5 w-3.5 ${active ? "text-monologg-red" : "text-gray-400"}`} />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="hidden sm:flex items-center justify-between border-t border-gray-100 dark:border-[#222222] bg-gray-50 dark:bg-[#101010] px-4 py-2 text-[11px] text-gray-600 dark:text-gray-400">
          <span>Use ↑↓ to navigate · Enter to open</span>
          <span className="font-mono">ESC to close</span>
        </div>
      </div>
    </div>
  );
}

