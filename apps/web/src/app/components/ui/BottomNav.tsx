import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LayoutGrid, X, Settings, LogOut, ChevronRight } from "lucide-react";
import type { SidebarNavItem } from "./Sidebar";

interface BottomNavProps<T extends string> {
  navItems: SidebarNavItem<T>[];
  activeTab: T;
  onTab: (id: T) => void;
  indicatorId: string;
  /** Complete list of all role navigation items (including secondary items like Earnings, Analytics, Activity) */
  allNavItems?: SidebarNavItem<T>[];
  userName?: string;
  userSubLabel?: string;
  userInitials?: string;
  userAvatarUrl?: string | null;
  onSettings?: () => void;
  onTransactions?: () => void;
  onSupport?: () => void;
  onSignOut?: () => void;
  /** Optional controlled state so mobile top-bar menu trigger can open the same drawer */
  isMoreOpen?: boolean;
  onMoreOpenChange?: (open: boolean) => void;
}

export function BottomNav<T extends string>({
  navItems,
  activeTab,
  onTab,
  indicatorId,
  allNavItems,
  userName,
  userSubLabel,
  userInitials,
  userAvatarUrl,
  onSettings,
  onTransactions: _onTransactions,
  onSupport: _onSupport,
  onSignOut,
  isMoreOpen: controlledMoreOpen,
  onMoreOpenChange,
}: BottomNavProps<T>) {
  const [internalMoreOpen, setInternalMoreOpen] = useState(false);

  const isMoreOpen = controlledMoreOpen !== undefined ? controlledMoreOpen : internalMoreOpen;
  const setMoreOpen = (next: boolean) => {
    if (onMoreOpenChange) {
      onMoreOpenChange(next);
    } else {
      setInternalMoreOpen(next);
    }
  };

  // Only show views in the More sheet that are NOT already visible on the bottom dock
  const unrepresentedNavItems = (allNavItems || []).filter(
    (item) => !navItems.some((visible) => visible.id === item.id)
  );
  const hasMoreMenu =
    unrepresentedNavItems.length > 0 || Boolean(onSettings || onSignOut);
  const isSecondaryTabActive =
    unrepresentedNavItems.some((item) => item.id === activeTab);

  return (
    <>
      {/* Mobile Navigation & Quick Actions Bottom Sheet */}
      <AnimatePresence>
        {isMoreOpen && hasMoreMenu && (
          <div className="lg:hidden fixed inset-0 z-[70] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              onClick={() => setMoreOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation menu"
              initial={{ y: "100%", opacity: 0.6 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              className="relative z-10 w-full max-h-[85vh] overflow-y-auto rounded-t-[28px] border-t p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl"
              style={{
                background: "var(--color-bg-surface)",
                borderColor: "var(--color-hairline)",
              }}
            >
              {/* Grab handle */}
              <div className="w-10 h-1 rounded-full mx-auto mb-3 opacity-30" style={{ background: "var(--color-text-tertiary)" }} />

              {/* Sheet Header: User Profile + Close */}
              <div className="flex items-center justify-between gap-3 pb-3.5 mb-3.5 border-b" style={{ borderColor: "var(--color-hairline)" }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-semibold text-sm font-body shrink-0 border"
                    style={{
                      background: "var(--color-accent-soft)",
                      color: "var(--color-accent)",
                      borderColor: "var(--color-hairline)",
                    }}
                  >
                    {userAvatarUrl ? (
                      <img src={userAvatarUrl} alt={userName || "User"} className="w-full h-full object-cover" />
                    ) : (
                      userInitials || "M"
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold font-display truncate" style={{ color: "var(--color-text-primary)" }}>
                      {userName || "Monologg Account"}
                    </div>
                    <div className="text-xs font-body truncate" style={{ color: "var(--color-text-tertiary)" }}>
                      {userSubLabel || "Verified Portal"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close navigation menu"
                  onClick={() => setMoreOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  style={{
                    background: "var(--color-bg-elevated)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Unrepresented Workspace Destinations Grid (only views not on the floating bottom dock) */}
              {unrepresentedNavItems.length > 0 && (
                <div className="mb-4">
                  <div
                    className="text-[11px] font-bold uppercase tracking-wider font-body px-1 mb-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    More Views
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {unrepresentedNavItems.map((item) => {
                      const active = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onTab(item.id);
                            setMoreOpen(false);
                          }}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-left border transition-all active:scale-[0.98] cursor-pointer"
                          style={{
                            background: active ? "var(--color-accent-soft)" : "var(--color-bg-elevated)",
                            borderColor: active ? "var(--color-accent)" : "var(--color-hairline)",
                            color: active ? "var(--color-accent)" : "var(--color-text-primary)",
                          }}
                        >
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              background: active ? "var(--color-accent)" : "var(--color-bg-surface)",
                              color: active ? "#FFFFFF" : "var(--color-text-secondary)",
                            }}
                          >
                            <item.icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold font-body truncate">{item.label}</div>
                          </div>
                          {item.badge && (
                            <span
                              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full shrink-0"
                              style={{
                                background: "var(--color-accent)",
                                color: "#FFFFFF",
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Simplified Settings & Session Controls */}
              <div>
                <div
                  className="text-[11px] font-bold uppercase tracking-wider font-body px-1 mb-2"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  Settings
                </div>
                <div
                  className="rounded-2xl border overflow-hidden divide-y"
                  style={{
                    background: "var(--color-bg-elevated)",
                    borderColor: "var(--color-hairline)",
                  }}
                >
                  {onSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        onSettings();
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-3 text-xs font-semibold font-body hover:opacity-85 transition-opacity cursor-pointer"
                      style={{ color: "var(--color-text-primary)", borderColor: "var(--color-hairline)" }}
                    >
                      <span className="flex items-center gap-2.5">
                        <Settings className="w-4 h-4 text-[var(--color-accent)]" />
                        <span>Settings</span>
                      </span>
                      <ChevronRight className="w-4 h-4" style={{ color: "var(--color-text-tertiary)" }} />
                    </button>
                  )}

                  {onSignOut && (
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        onSignOut();
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-3 text-xs font-semibold font-body hover:opacity-85 transition-opacity cursor-pointer"
                      style={{ color: "var(--color-error)", borderColor: "var(--color-hairline)" }}
                    >
                      <span className="flex items-center gap-2.5">
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Navigation Pill */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-2.5 sm:px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 pointer-events-none">
        <div
          className="flex items-center justify-between rounded-[var(--radius-2xl)] px-1.5 py-1.5 glass-panel pointer-events-auto max-w-md mx-auto"
          style={{ boxShadow: "var(--shadow-elevated)" }}
        >
          {navItems.map((item) => {
            const active = activeTab === item.id && !isMoreOpen;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  onTab(item.id);
                }}
                className="flex-1 min-w-0 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-[var(--radius-lg)] transition-all relative cursor-pointer"
                style={{ color: active ? "var(--color-accent)" : "var(--color-text-tertiary)" }}
              >
                {active && (
                  <motion.div
                    layoutId={indicatorId}
                    className="absolute inset-0 rounded-[var(--radius-lg)]"
                    style={{ background: "var(--color-accent-glow)" }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <item.icon className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 shrink-0" />
                <span className="text-[10px] font-body font-medium relative z-10 truncate max-w-full">
                  {item.label}
                </span>
                {item.badge && (
                  <span
                    className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--color-accent)" }}
                  />
                )}
              </button>
            );
          })}

          {hasMoreMenu && (
            <button
              type="button"
              aria-label="More navigation options"
              onClick={() => setMoreOpen(!isMoreOpen)}
              className="flex-1 min-w-0 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-[var(--radius-lg)] transition-all relative cursor-pointer"
              style={{
                color:
                  isMoreOpen || isSecondaryTabActive
                    ? "var(--color-accent)"
                    : "var(--color-text-tertiary)",
              }}
            >
              {(isMoreOpen || isSecondaryTabActive) && (
                <motion.div
                  layoutId={indicatorId}
                  className="absolute inset-0 rounded-[var(--radius-lg)]"
                  style={{ background: "var(--color-accent-glow)" }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 shrink-0" />
              <span className="text-[10px] font-body font-medium relative z-10 truncate max-w-full">
                More
              </span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
