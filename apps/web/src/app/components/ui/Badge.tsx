import * as React from "react";
import { cn } from "../../../lib/utils";

const TONES = {
  neutral: { background: "var(--color-bg-elevated)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border-default)" },
  accent: { background: "var(--color-accent-soft)", color: "var(--color-accent)", border: "none" },
  success: { background: "var(--color-success-bg)", color: "var(--color-success)", border: "none" },
  warning: { background: "var(--color-gold-soft)", color: "var(--color-gold-dark)", border: "none" },
  error: { background: "var(--color-error-bg)", color: "var(--color-error)", border: "none" },
} as const;

const SIZES = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-xs",
} as const;

interface BadgeProps {
  tone?: keyof typeof TONES;
  size?: keyof typeof SIZES;
  className?: string;
  children: React.ReactNode;
}

/** Status pill / chip / tag. Recurs across dashboards and Settings with
 * near-identical shape and slightly drifting padding — this is the
 * single source for that shape now. */
export function Badge({ tone = "neutral", size = "md", className, children }: BadgeProps) {
  const t = TONES[tone];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full font-medium font-body", SIZES[size], className)}
      style={{ background: t.background, color: t.color, border: t.border }}
    >
      {children}
    </span>
  );
}
