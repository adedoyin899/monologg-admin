"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

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
    label: "Core",
    items: [
      { name: "Overview", href: "/", icon: <LayoutDashboard className="h-4 w-4" />, module: "overview" },
      { name: "Live Feed", href: "/feed", icon: <Activity className="h-4 w-4" />, module: "overview" },
      { name: "Alerts", href: "/alerts", icon: <Bell className="h-4 w-4" />, module: "alerts" },
      { name: "System Health", href: "/health", icon: <HeartPulse className="h-4 w-4" />, module: "system_health" },
      { name: "Audit Log", href: "/audit", icon: <FileText className="h-4 w-4" />, module: "audit_log" },
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
    label: "Operations",
    items: [
      { name: "Support Tickets", href: "/tickets", icon: <LifeBuoy className="h-4 w-4" />, module: "tickets" },
      { name: "Disputes", href: "/disputes", icon: <Scale className="h-4 w-4" />, module: "disputes" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { name: "Acquisition", href: "/analytics/acquisition", icon: <TrendingUp className="h-4 w-4" />, module: "overview" },
      { name: "Funnels", href: "/analytics/funnels", icon: <Activity className="h-4 w-4" />, module: "overview" },
      { name: "Retention", href: "/analytics/retention", icon: <Activity className="h-4 w-4" />, module: "overview" },
      { name: "Traffic", href: "/analytics/traffic", icon: <Activity className="h-4 w-4" />, module: "overview" },
      { name: "Feature Adoption", href: "/analytics/features", icon: <Activity className="h-4 w-4" />, module: "overview" },
      { name: "Marketplace Health", href: "/analytics/marketplace", icon: <Activity className="h-4 w-4" />, module: "overview" },
    ],
  },
  {
    label: "System",
    items: [
      { name: "Admin Users", href: "/admins", icon: <UserCog className="h-4 w-4" />, module: "admin_users" },
      { name: "Exports", href: "/exports", icon: <Download className="h-4 w-4" />, module: "exports" },
      { name: "Settings", href: "/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data, signOut, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

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
    if (role === "SUPER_ADMIN") return true;
    const perm = permissions[item.module];
    if (!perm) return false;
    return item.level === "write" ? perm.write : perm.read;
  };

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
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white dark:border-[#222222] dark:bg-[#111111] transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-100 dark:border-[#202020]">
          <Link href="/" className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-monologg-red animate-pulse" />
            <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              MONOLOGG <span className="text-xs font-mono font-normal text-monologg-red uppercase tracking-widest ml-1">Admin</span>
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#202020] lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(isAllowed);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label} className="space-y-1">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {group.label}
                </p>
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={clsx(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                        isActive
                          ? "bg-monologg-red/10 text-monologg-red font-semibold dark:bg-monologg-red/15 dark:text-monologg-red"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#1A1A1A] dark:hover:text-white",
                      )}
                    >
                      {item.icon}
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer with current identity */}
        <div className="border-t border-gray-100 dark:border-[#202020] p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Role: <strong className="text-gray-900 dark:text-white">{role || "..."}</strong></span>
            <span className="font-mono text-[10px] text-gray-400">v0.1.0</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar Header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-8 dark:border-[#222222] dark:bg-[#111111]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#202020] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Global Search Placeholder */}
            <div className="relative hidden sm:block w-64 lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search admin... (⌘K)"
                readOnly
                className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none dark:border-[#282828] dark:bg-[#181818] dark:text-gray-200 cursor-pointer"
              />
            </div>
          </div>

          {/* Badges & Profile Menu */}
          <div className="flex items-center gap-3">
            {/* Payments Mode Badge */}
            <span
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider font-mono",
                paymentsMode === "LIVE"
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400"
                  : "bg-amber-500/15 text-amber-600 border border-amber-500/30 dark:text-amber-400",
              )}
            >
              <span className={clsx("h-1.5 w-1.5 rounded-full", paymentsMode === "LIVE" ? "bg-emerald-500" : "bg-amber-500")} />
              {paymentsMode} MODE
            </span>

            {/* Environment Badge */}
            <span
              className={clsx(
                "hidden sm:inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider font-mono",
                environment === "production"
                  ? "bg-purple-500/10 text-purple-600 border border-purple-500/20 dark:text-purple-400"
                  : "bg-gray-200 text-gray-700 border border-gray-300 dark:bg-[#222222] dark:text-gray-300 dark:border-[#333333]",
              )}
            >
              {environment}
            </span>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 rounded-lg p-1.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#1C1C1C]"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-monologg-red text-white font-bold text-xs">
                  {(data?.admin?.email || "A").charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:inline font-mono text-xs">{data?.admin?.email}</span>
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-[#2A2A2A] dark:bg-[#181818] z-50">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-[#222222]">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {data?.admin?.email}
                    </p>
                    <p className="text-[10px] font-mono text-monologg-red uppercase font-semibold mt-0.5">
                      {data?.admin?.role}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      signOut();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

