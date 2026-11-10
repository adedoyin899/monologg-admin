import React, { useEffect, useState } from "react";

export interface TopAnnouncementBarProps {
  className?: string;
  nodeId?: string;
  intervalMs?: number;
}

/**
 * TopAnnouncementBar
 *
 * System-wide top banner rendering:
 * - Left: High-visibility blinking red indicator dot alongside "Monologg is in Alpha 🥳 🥳"
 * - Right: Rotating single-badge marquee alternating every 20s between:
 *   1. "Paystack Secured"
 *   2. "25+ Verified Performers"
 *
 * Smooth cross-fade translation transition with zero layout reflow.
 */
export function TopAnnouncementBar({
  className = "",
  nodeId = "178359:16887",
  intervalMs = 20000,
}: TopAnnouncementBarProps) {
  const [activeSlide, setActiveSlide] = useState<0 | 1>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev === 0 ? 1 : 0));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return (
    <div
      className={`bg-[#1a1a1a] border-b border-[#333333] flex items-center justify-between px-4 sm:px-[24px] h-[40px] relative shrink-0 w-full z-20 select-none ${className}`}
      data-node-id={nodeId}
      data-name="Background+HorizontalBorder"
    >
      {/* Left side: Blinking Red Dot + Alpha Announcement */}
      <div
        className="flex items-center gap-[8px] relative shrink-0"
        data-node-id="178359:16888"
        data-name="Container"
      >
        <span
          className="relative flex items-center justify-center size-[8px] shrink-0"
          data-testid="announcement-red-dot"
          aria-hidden="true"
        >
          <span className="absolute inline-flex size-[8px] rounded-full bg-[#f13030] animate-ping opacity-75" />
          <span className="relative inline-flex size-[8px] rounded-full bg-[#f13030] shadow-[0_0_8px_rgba(241,48,48,0.9)] animate-pulse" />
        </span>
        <div className="flex items-center relative shrink-0" data-node-id="178359:16890">
          <span
            className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[11px] leading-[15px] text-white whitespace-nowrap"
            data-node-id="178359:16891"
          >
            Monologg is in Alpha 🥳 🥳
          </span>
        </div>
      </div>

      {/* Right side: 20s rotating badge showing one item at a time */}
      <div
        className="flex items-center justify-end relative shrink-0 h-[20px] min-w-[125px] sm:min-w-[150px] overflow-hidden"
        data-node-id="178359:16892"
        data-name="Container"
        data-testid="announcement-rotating-container"
      >
        <span
          data-testid="announcement-slide-paystack"
          className={`font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[11px] leading-[15px] text-white/80 whitespace-nowrap transition-all duration-700 ease-in-out ${
            activeSlide === 0
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-3 pointer-events-none absolute"
          }`}
        >
          Paystack Secured
        </span>

        <span
          data-testid="announcement-slide-performers"
          className={`font-['JetBrains_Mono',monospace] font-bold text-[11px] leading-[15px] text-white/80 whitespace-nowrap transition-all duration-700 ease-in-out ${
            activeSlide === 1
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-3 pointer-events-none absolute"
          }`}
        >
          25+ Verified Performers
        </span>
      </div>
    </div>
  );
}
