"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Activity,
  Users,
  Calendar,
  CreditCard,
  ArrowDownLeft,
  DollarSign,
  LifeBuoy,
  Scale,
  ShieldCheck,
  Bell,
  HeartPulse,
  FileText,
  Download,
  UserCog,
  Settings,
  Search,
  Menu,
  X,
  LogOut,
  ChevronDown,
  TrendingUp,
  Filter,
  Eye,
  Sparkles,
  Store,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { type AdminRole } from "@/lib/admin-client";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { CommandPalette } from "@/components/layout/CommandPalette";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  module?: string;
  level?: "read" | "write";
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Command Center",
    items: [
      { name: "Overview", href: "/", icon: <LayoutDashboard className="h-4 w-4" />, module: "overview" },
      { name: "Live Feed", href: "/feed", icon: <Activity className="h-4 w-4" />, module: "overview" },
      { name: "Alerts", href: "/alerts", icon: <Bell className="h-4 w-4" />, module: "alerts" },
      { name: "System Health", href: "/health", icon: <HeartPulse className="h-4 w-4" />, module: "system_health" },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { name: "Users", href: "/users", icon: <Users className="h-4 w-4" />, module: "users" },
      { name: "Bookings", href: "/bookings", icon: <Calendar className="h-4 w-4" />, module: "bookings" },
      { name: "Verifications", href: "/verifications", icon: <ShieldCheck className="h-4 w-4" />, module: "verifications" },
    ],
  },
  {
    label: "Finance",
    items: [
      { name: "Transactions", href: "/payments", icon: <CreditCard className="h-4 w-4" />, module: "payments" },
      { name: "Withdrawals", href: "/withdrawals", icon: <ArrowDownLeft className="h-4 w-4" />, module: "withdrawals" },
      { name: "Earnings", href: "/earnings", icon: <DollarSign className="h-4 w-4" />, module: "payments" },
    ],
  },
  {
    label: "Trust & Support",
    items: [
      { name: "Support Tickets", href: "/tickets", icon: <LifeBuoy className="h-4 w-4" />, module: "tickets" },
      { name: "Disputes", href: "/disputes", icon: <Scale className="h-4 w-4" />, module: "disputes" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { name: "Acquisition", href: "/analytics/acquisition", icon: <TrendingUp className="h-4 w-4" />, module: "overview" },
      { name: "Funnels", href: "/analytics/funnels", icon: <Filter className="h-4 w-4" />, module: "overview" },
      { name: "Retention", href: "/analytics/retention", icon: <Users className="h-4 w-4" />, module: "overview" },
      { name: "Traffic", href: "/analytics/traffic", icon: <Eye className="h-4 w-4" />, module: "overview" },
      { name: "Feature Adoption", href: "/analytics/features", icon: <Sparkles className="h-4 w-4" />, module: "overview" },
      { name: "Marketplace Health", href: "/analytics/marketplace", icon: <Store className="h-4 w-4" />, module: "overview" },
    ],
  },
  {
    label: "Governance",
    items: [
      { name: "Audit Log", href: "/audit", icon: <FileText className="h-4 w-4" />, module: "audit_log" },
      { name: "Exports", href: "/exports", icon: <Download className="h-4 w-4" />, module: "exports" },
      { name: "Admin Users", href: "/admins", icon: <UserCog className="h-4 w-4" />, module: "admin_users" },
      { name: "Settings", href: "/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data, signOut, signInAsRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Global Cmd+K / Ctrl+K shortcut for Command Palette
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setUserDropdownOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  const activeContext = useMemo(() => {
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(`${item.href}/`))
        ) {
          return { group: group.label, page: item.name };
        }
      }
    }
    return { group: "Command Center", page: "Overview" };
  }, [pathname]);

  // If on login pages, render clean without shell
  if (pathname.startsWith("/login")) {
    return <>{children}</>;
  }

  const role = data?.admin?.role;
  const permissions = data?.permissions || {};
  const paymentsMode = data?.env?.paymentsMode || "TEST";
  const environment = data?.env?.environment || "development";

  const isAllowed = (item: NavItem) => {
    if (!item.module) return true;
    if (!role || role === "SUPER_ADMIN") return true;
    const perm = permissions[item.module];
    if (!perm) return false;
    return item.level === "write" ? perm.write : perm.read;
  };

  const isItemActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900 dark:bg-[#0A0A0A] dark:text-gray-100 font-sans">
      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-[#222222] dark:bg-[#111111] transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-gray-100 dark:border-[#202020]">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-monologg-red" />
            <span className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
              MONOLOGG{" "}
              <span className="text-[11px] font-mono font-semibold text-monologg-red dark:text-[#FF5C5E] uppercase tracking-widest ml-1">
                Admin
              </span>
            </span>
          </Link>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#202020] lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav aria-label="Primary Admin Navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(isAllowed);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label} className="space-y-1">
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  {group.label}
                </p>
                {visibleItems.map((item) => {
                  const active = isItemActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={clsx(
                        "flex min-h-[38px] items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-monologg-red/10 text-monologg-red font-semibold dark:bg-monologg-red/15 dark:text-[#FF5A5C]"
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-[#1A1A1A] dark:hover:text-white",
                      )}
                    >
                      <span className={active ? "text-monologg-red dark:text-[#FF5A5C]" : "text-gray-500 dark:text-gray-400"}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer with current identity */}
        <div className="shrink-0 border-t border-gray-100 dark:border-[#202020] px-4 py-3">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>
              Role: <strong className="font-mono text-gray-900 dark:text-white">{role || "SUPER_ADMIN"}</strong>
            </span>
            <span className="font-mono text-[11px] text-gray-600 dark:text-gray-400">v0.1.0</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Bar Header */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 sm:px-6 lg:px-8 dark:border-[#222222] dark:bg-[#111111]">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-800 hover:bg-gray-100 dark:border-[#2C2C2C] dark:bg-[#1A1A1A] dark:text-gray-200 dark:hover:bg-[#252525] lg:hidden"
            >
              <Menu className="h-4 w-4 text-monologg-red" />
              <span>Menu</span>
            </button>

            {/* Quick Jump Command Palette Trigger (Desktop) */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden sm:flex items-center justify-between w-60 lg:w-80 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 hover:border-gray-300 hover:bg-gray-100 dark:border-[#282828] dark:bg-[#181818] dark:text-gray-300 dark:hover:border-[#3A3A3A] dark:hover:bg-[#202020] transition-colors"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400" />
                <span>Jump to screen or metric...</span>
              </span>
              <kbd className="rounded border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#111111] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-600 dark:text-gray-400">
                ⌘K
              </kbd>
            </button>

            {/* Quick Jump Button (Mobile) */}
            <button
              type="button"
              aria-label="Open quick jump search"
              onClick={() => setPaletteOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-[#2C2C2C] dark:bg-[#1A1A1A] dark:text-gray-200 sm:hidden"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          {/* Badges & Profile Menu */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Payments Mode Badge */}
            <span
              className={clsx(
                "hidden xs:inline-flex sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider font-mono",
                paymentsMode === "LIVE"
                  ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/25 dark:text-emerald-300"
                  : "bg-amber-500/15 text-amber-800 border border-amber-500/30 dark:text-amber-300",
              )}
            >
              <span className={clsx("h-1.5 w-1.5 rounded-full", paymentsMode === "LIVE" ? "bg-emerald-600 dark:bg-emerald-400" : "bg-amber-600 dark:bg-amber-400")} />
              <span className="hidden md:inline">{paymentsMode} MODE</span>
              <span className="md:hidden">{paymentsMode}</span>
            </span>

            {/* Environment Badge */}
            <span
              className={clsx(
                "hidden md:inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider font-mono",
                environment === "production"
                  ? "bg-purple-500/10 text-purple-700 border border-purple-500/20 dark:text-purple-300"
                  : "bg-gray-100 text-gray-700 border border-gray-300 dark:bg-[#222222] dark:text-gray-300 dark:border-[#333333]",
              )}
            >
              {environment}
            </span>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Profile Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                aria-expanded={userDropdownOpen}
                aria-label="Open operator menu"
                className="flex min-h-[40px] items-center gap-2 rounded-lg px-2 py-1 text-left text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-[#1C1C1C]"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-monologg-red text-white font-bold text-xs">
                  {(data?.admin?.email || "A").charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:inline font-mono text-xs">{data?.admin?.email}</span>
                <ChevronDown className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl dark:border-[#2A2A2A] dark:bg-[#181818] z-50">
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-[#222222]">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                        {data?.admin?.email || "superadmin@monologg.com"}
                      </p>
                      <p className="text-[11px] font-mono text-monologg-red dark:text-[#FF5A5C] uppercase font-semibold mt-0.5">
                        {data?.admin?.role || "SUPER_ADMIN"}
                      </p>
                    </div>

                    {/* Switch Role Matrix */}
                    <div className="px-3 py-2.5 border-b border-gray-100 dark:border-[#222222]">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">
                        Preview RBAC Role View
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(["SUPER_ADMIN", "OPS", "SUPPORT", "FINANCE", "COMPLIANCE", "VIEWER"] as AdminRole[]).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => {
                              signInAsRole(r, "aal2");
                              setUserDropdownOpen(false);
                            }}
                            className={clsx(
                              "min-h-[34px] rounded-md px-2 py-1 text-left font-mono text-[10px] transition-colors",
                              role === r
                                ? "bg-monologg-red text-white font-semibold"
                                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#252525]",
                            )}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        signOut();
                      }}
                      className="flex min-h-[40px] w-full items-center gap-2 px-4 py-2 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Context Breadcrumb Strip (clean, non-duplicative) */}
        <div className="flex lg:hidden items-center justify-between border-b border-gray-200 dark:border-[#222222] bg-gray-50/90 dark:bg-[#0F0F0F] px-3 py-1.5 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-medium text-gray-600 dark:text-gray-400 truncate">
              {activeContext.group}
            </span>
            <span className="text-gray-600 dark:text-gray-400">/</span>
            <span className="font-semibold text-gray-900 dark:text-white truncate">
              {activeContext.page}
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase text-gray-600 dark:text-gray-400 shrink-0 ml-2">
            {paymentsMode}
          </span>
        </div>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1440px]">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
