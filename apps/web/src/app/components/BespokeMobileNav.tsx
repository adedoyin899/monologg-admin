import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "../Root";
import { Logo } from "./ui/Logo";
import type { LoggedInUserSession } from "../../lib/state-sync";

export type NavPageId = "home" | "product" | "pricing" | "resources" | "legal";

interface BespokeMobileNavProps {
  /** The currently active main page */
  activePage: NavPageId;
  /** Whether the full-screen mobile menu drawer is open */
  isOpen: boolean;
  /** Callback to close the mobile menu drawer */
  onClose: () => void;
  /** Logged-in user session, or null if logged out */
  loggedInUser: LoggedInUserSession | null;
  /** Formatted user display name */
  displayName?: string;
  /** Profile avatar image URL or fallback */
  displayAvatar?: string;
  /** Whether current session is a client workspace */
  isClientSession?: boolean;
  /** Sign out callback */
  onSignOut?: () => void;
}

export const MAIN_PAGES = [
  {
    id: "home" as const,
    label: "Home",
    path: "/",
  },
  {
    id: "product" as const,
    label: "Product",
    path: "/product",
  },
  {
    id: "pricing" as const,
    label: "Pricing",
    path: "/pricing",
  },
  {
    id: "resources" as const,
    label: "Resources",
    path: "/resources",
  },
];

/**
 * Animated Hamburger / Close Button for Mobile Headers
 */
export function MobileMenuButton({
  isOpen,
  onClick,
  className = "",
}: {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
      aria-expanded={isOpen}
      className={`md:hidden flex items-center justify-center size-[36px] rounded-full border border-[#e8e8e8] dark:border-[#1a1a1a] bg-white dark:bg-[#000000] text-[#1a1a1a] dark:text-[#f9f9f9] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-all cursor-pointer shadow-xs active:scale-95 ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isOpen ? (
          <motion.div
            key="close-icon"
            initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            <X className="size-4" />
          </motion.div>
        ) : (
          <motion.div
            key="menu-icon"
            initial={{ opacity: 0, rotate: 45, scale: 0.8 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            <Menu className="size-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

/**
 * Minimal, Bespoke Full-Screen Mobile Navigation Overlay
 * Inspired by Rise: Ultra-clean brand header, clean vertical text link stack,
 * and pinned side-by-side bottom action pills.
 */
export function BespokeMobileNavDrawer({
  activePage,
  isOpen,
  onClose,
  loggedInUser,
  displayName = "",
  displayAvatar = "",
  isClientSession = false,
  onSignOut,
}: BespokeMobileNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggle } = useTheme();

  // Lock body scroll while mobile drawer is open to prevent background bleed
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isOpen]);

  const handleNav = (path: string) => {
    onClose();
    if (location.pathname !== path) {
      navigate(path);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const dashboardHref = isClientSession ? "/client" : "/dashboard";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-0 z-50 md:hidden bg-white dark:bg-[#121316] text-[#1a1a1a] dark:text-[#f5f5f5] flex flex-col justify-between"
        >
          {/* Top Bar: Brand Logo & Close Icon */}
          <div className="h-[68px] px-6 flex items-center justify-between shrink-0 border-b border-[#e8e8e8]/60 dark:border-white/5">
            {/* Logo */}
            <button
              type="button"
              onClick={() => handleNav("/")}
              aria-label="Monologg Home"
              className="cursor-pointer text-left focus:outline-none"
            >
              <Logo className="h-6 w-auto text-[#1a1a1a] dark:text-white" />
            </button>

            {/* Right Controls: Theme Toggle & Close (X) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggle}
                aria-label="Toggle theme"
                className="size-9 rounded-full flex items-center justify-center text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-white transition-colors cursor-pointer"
              >
                {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close navigation menu"
                className="size-9 rounded-full flex items-center justify-center text-[#1a1a1a] dark:text-white hover:text-[#f13030] dark:hover:text-[#f13030] transition-colors cursor-pointer"
              >
                <X className="size-6" />
              </button>
            </div>
          </div>

          {/* Navigation Links: Rise-style clean vertical stack */}
          <div className="flex-1 px-7 pt-12 sm:pt-16 flex flex-col">
            <nav className="flex flex-col gap-8 sm:gap-10">
              {MAIN_PAGES.map((page) => {
                const isActive = activePage === page.id;
                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => handleNav(page.path)}
                    className="group flex items-center justify-between text-left cursor-pointer transition-colors"
                  >
                    <span
                      className={`font-['Plus_Jakarta_Sans',sans-serif] text-[22px] sm:text-[25px] font-semibold tracking-[-0.01em] transition-colors ${
                        isActive
                          ? "text-[#f13030]"
                          : "text-[#1a1a1a]/90 dark:text-white/90 group-hover:text-[#f13030] dark:group-hover:text-white"
                      }`}
                    >
                      {page.label}
                    </span>
                    {isActive && (
                      <span className="size-2 rounded-full bg-[#f13030] shadow-[0_0_8px_rgba(241,48,48,0.8)]" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Actions: Rise-style side-by-side pills */}
          <div className="p-6 pb-8 sm:pb-10 flex gap-3.5 w-full shrink-0 border-t border-[#e8e8e8]/60 dark:border-white/5">
            {loggedInUser ? (
              <>
                <button
                  type="button"
                  onClick={() => handleNav(dashboardHref)}
                  className="flex-1 h-[52px] rounded-full bg-[#f0f0f2] dark:bg-[#22242a] hover:bg-[#e4e4e7] dark:hover:bg-[#2c2f37] border border-[#e4e4e7] dark:border-[#2d3037] text-[#1a1a1a] dark:text-white font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[15px] transition-all cursor-pointer flex items-center justify-center active:scale-98"
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onSignOut) {
                      onSignOut();
                    } else {
                      navigate("/");
                    }
                  }}
                  className="flex-1 h-[52px] rounded-full bg-[#f13030] hover:bg-[#d31f20] text-white font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[15px] transition-all cursor-pointer flex items-center justify-center shadow-md active:scale-98"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleNav("/auth?mode=signin")}
                  className="flex-1 h-[52px] rounded-full bg-[#f0f0f2] dark:bg-[#22242a] hover:bg-[#e4e4e7] dark:hover:bg-[#2c2f37] border border-[#e4e4e7] dark:border-[#2d3037] text-[#1a1a1a] dark:text-white font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[15px] transition-all cursor-pointer flex items-center justify-center active:scale-98"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => handleNav("/auth?mode=signup")}
                  className="flex-1 h-[52px] rounded-full bg-[#f13030] hover:bg-[#d31f20] text-white font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[15px] transition-all cursor-pointer flex items-center justify-center shadow-md active:scale-98"
                >
                  Get started
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Optional Mobile Floating Bottom Navigation Dock
 * Retained for backwards compatibility with tests and custom screen modes.
 */
export function BespokeMobileBottomDock({
  activePage,
  isMenuOpen,
  onToggleMenu,
  loggedInUser,
  displayAvatar = "",
}: {
  activePage: NavPageId;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  loggedInUser?: LoggedInUserSession | null;
  displayAvatar?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (path: string) => {
    if (isMenuOpen) onToggleMenu();
    if (location.pathname !== path) {
      navigate(path);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="fixed bottom-4 inset-x-3 max-w-sm mx-auto z-40 md:hidden pointer-events-none">
      <div className="pointer-events-auto backdrop-blur-2xl bg-white/92 dark:bg-[#0d0d10]/92 border border-[#e8e8e8]/90 dark:border-[#1f1f23] rounded-full shadow-[0_12px_36px_rgba(0,0,0,0.16)] p-1.5 flex items-center justify-between">
        {MAIN_PAGES.map((page) => {
          const isActive = activePage === page.id && !isMenuOpen;
          return (
            <button
              key={page.id}
              type="button"
              onClick={() => handleNav(page.path)}
              aria-label={page.label}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all cursor-pointer min-w-[54px] ${
                isActive
                  ? "text-[#f13030]"
                  : "text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9]"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-mobile-dock-pill"
                  className="absolute inset-0 rounded-full bg-[#fff0f0] dark:bg-[#1f1010] border border-[#f13030]/20 -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="text-[12px] font-['Plus_Jakarta_Sans',sans-serif] font-bold leading-[14px]">
                {page.label}
              </span>
            </button>
          );
        })}

        {/* Menu Toggle */}
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all cursor-pointer min-w-[54px] ${
            isMenuOpen
              ? "text-[#f13030]"
              : "text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9]"
          }`}
        >
          <span className="text-[12px] font-['Plus_Jakarta_Sans',sans-serif] font-bold leading-[14px]">
            {isMenuOpen ? "Close" : "Menu"}
          </span>
        </button>
      </div>
    </div>
  );
}
