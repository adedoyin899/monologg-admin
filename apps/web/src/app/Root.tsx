import { Outlet, useLocation } from "react-router";
import { useState, createContext, useContext, useEffect, useRef } from "react";
import { trackEvent, trackPageView } from "../lib/analytics";
import { track as trackAllowlisted } from "../lib/tracker";
import { ConsentBanner } from "./components/ConsentBanner";

interface ThemeContextType {
  isDark: boolean;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({ isDark: false, toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);

/** The dark/light state + persistence logic, factored out of Root so any
 * entry point that doesn't render Root (e.g. the standalone design-system
 * build, which uses a bare MemoryRouter) can still provide a working theme
 * toggle without duplicating the localStorage read/write logic. */
export function useThemeState() {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("monologg-theme") === "dark"; } catch { return false; }
  });

  useEffect(() => {
    try {
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", isDark);
      }
    } catch {}
  }, [isDark]);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    try { localStorage.setItem("monologg-theme", next ? "dark" : "light"); } catch {}
    trackEvent("theme_toggled", { theme: next ? "dark" : "light" }, "engagement");
  };

  return { isDark, toggle };
}

export function Root() {
  const { isDark, toggle } = useThemeState();
  const location = useLocation();
  const pageEnteredAtRef = useRef<number>(Date.now());
  const prevPathRef = useRef<string | null>(null);
  const sessionTrackedRef = useRef<boolean>(false);

  // 1. Track session_started once on mount
  useEffect(() => {
    if (!sessionTrackedRef.current) {
      sessionTrackedRef.current = true;
      const width = typeof window !== "undefined" ? window.innerWidth : 1280;
      const viewport = width < 640 ? "mobile" : width < 1024 ? "tablet" : "desktop";
      trackEvent(
        "session_started",
        {
          entryPath: location.pathname,
          viewport,
        },
        "navigation",
      );
    }
  }, [location.pathname]);

  // 2. Track page_viewed & page_leave dwell time on route changes
  useEffect(() => {
    const now = Date.now();
    if (prevPathRef.current && prevPathRef.current !== location.pathname) {
      const durationMs = Math.max(0, now - pageEnteredAtRef.current);
      trackEvent(
        "page_leave",
        {
          fromPath: prevPathRef.current,
          toPath: location.pathname,
          durationMs,
        },
        "navigation",
      );
    }
    pageEnteredAtRef.current = now;
    prevPathRef.current = location.pathname;
    trackPageView(location.pathname, {
      search: location.search || undefined,
    });
    trackAllowlisted("page_view", {
      path: location.pathname,
    });
  }, [location.pathname, location.search]);

  // 3. Delegated click tracking across all buttons, links, tabs, and [data-analytics] elements
  const handleGlobalClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    try {
      const target = e.target as HTMLElement | null;
      if (!target || typeof target.closest !== "function") return;
      const interactive = target.closest(
        'button, a, [role="button"], [role="tab"], [data-analytics]',
      ) as HTMLElement | null;
      if (!interactive) return;

      const analyticsAttr = interactive.getAttribute("data-analytics");
      const ariaLabel = interactive.getAttribute("aria-label");
      const rawText = (interactive.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
      const label = analyticsAttr || ariaLabel || rawText || interactive.tagName.toLowerCase();
      const tag = interactive.tagName.toLowerCase();
      const href = tag === "a" ? interactive.getAttribute("href") || undefined : undefined;

      trackEvent(
        analyticsAttr ? "cta_clicked" : "ui_click",
        {
          label,
          analyticsId: analyticsAttr || undefined,
          elementTag: tag,
          href,
          path: location.pathname,
        },
        "ui_interaction",
      );
    } catch {}
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      <div
        className={isDark ? "dark" : ""}
        style={{ minHeight: "100vh", background: "var(--color-bg-canvas)", color: "var(--color-text-primary)" }}
        onClickCapture={handleGlobalClickCapture}
      >
        {/* T3: Skip-to-content link — visible only on keyboard focus */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:rounded-[var(--radius-md)]"
          style={{ background: "var(--color-accent)", color: "var(--color-accent-on)" }}
        >
          Skip to main content
        </a>
        <Outlet />
        <ConsentBanner />
      </div>
    </ThemeContext.Provider>
  );
}
