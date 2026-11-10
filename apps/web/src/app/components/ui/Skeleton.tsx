import React from "react";
import { cn } from "../../../lib/utils";

/**
 * Skeleton — shimmer placeholder for content loading states.
 * Design review T2: replaces plain "Loading..." text with content-shaped
 * placeholders that match the expected layout, reducing perceived load time.
 *
 * Usage:
 *   <Skeleton className="w-48 h-6" />           — single block
 *   <Skeleton circle className="w-12 h-12" />   — avatar placeholder
 *   <Skeleton className="w-full h-4" count={3} gap={8} />  — multi-line
 */

interface SkeletonProps {
  className?: string;
  /** Render as a circle (avatar placeholder) */
  circle?: boolean;
  /** Repeat N shimmer blocks with optional gap */
  count?: number;
  /** Gap between repeated blocks in px */
  gap?: number;
  style?: React.CSSProperties;
}

export function Skeleton({ className, circle, count = 1, gap = 8, style }: SkeletonProps) {
  const baseClass = cn(
    "animate-pulse",
    circle ? "rounded-full" : "rounded-[var(--radius-md)]",
    className,
  );
  const baseStyle: React.CSSProperties = {
    background: "var(--color-bg-elevated)",
    ...style,
  };

  if (count === 1) {
    return <div className={baseClass} style={baseStyle} />;
  }

  return (
    <div className="flex flex-col" style={{ gap: `${gap}px` }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={baseClass} style={baseStyle} />
      ))}
    </div>
  );
}

/**
 * Pre-built skeleton layouts for common patterns.
 */

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("p-5 rounded-[var(--radius-lg)]", className)}
      style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
    >
      <Skeleton className="w-24 h-4 mb-3" />
      <Skeleton className="w-full h-8 mb-2" />
      <Skeleton className="w-3/4 h-4" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div
      className="p-4 rounded-[var(--radius-lg)] flex flex-col gap-2"
      style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
    >
      <Skeleton className="w-16 h-3" />
      <Skeleton className="w-24 h-8" />
      <Skeleton className="w-12 h-3" />
    </div>
  );
}

export function ListItemSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-4 rounded-[var(--radius-md)]"
          style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
        >
          <Skeleton circle className="w-10 h-10 shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="w-32 h-4 mb-2" />
            <Skeleton className="w-48 h-3" />
          </div>
          <Skeleton className="w-16 h-6 shrink-0" />
        </div>
      ))}
    </div>
  );
}
