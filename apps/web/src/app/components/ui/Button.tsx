import * as React from "react";
import { cn } from "../../../lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "icon" | "red" | "purple" | "dark-pill" | "outline-pill" | "lime" | "forest" | "clay";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 font-body text-[15px] font-semibold tracking-[-0.01em] whitespace-nowrap transition-all duration-[var(--duration-fast,160ms)] ease-[var(--ease-out,ease-out)] disabled:opacity-35 disabled:pointer-events-none active:scale-[0.97] focus-visible:outline-none";

    const sizeStyles = size ? {
      sm: "!h-9 !px-4 !text-xs",
      md: "h-[50px] px-7 text-[15px]",
      lg: "h-[56px] px-8 text-base",
    }[size] : "";

    const variants = {
      /* primary: role accent fill (red for Talent, purple for Client) + on-accent text — WCAG AA */
      primary: "h-[50px] px-7 rounded-full bg-[var(--color-accent)] text-white shadow-[var(--shadow-card)] hover:opacity-90 focus-visible:shadow-[var(--shadow-focus)] font-semibold [&_*]:text-white",
      /* secondary: neutral inked surface — quiet, high-contrast */
      secondary: "h-[50px] px-7 rounded-full bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg-elevated)] focus-visible:shadow-[var(--shadow-focus)] font-semibold",
      /* ghost: text-only, primary text so it always passes contrast */
      ghost: "h-[50px] px-5 rounded-full bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] focus-visible:shadow-[var(--shadow-focus)] font-semibold",
      destructive: "h-[50px] px-7 rounded-full bg-[var(--color-error-bg)] text-[var(--color-error)] border border-[var(--color-error)] hover:bg-[var(--color-error)] hover:text-white focus-visible:shadow-[var(--shadow-focus)]",
      icon: "w-[46px] h-[46px] rounded-full bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] hover:bg-[var(--color-bg-elevated)] focus-visible:shadow-[var(--shadow-focus)] flex-shrink-0",
      
      /* Monologg Native Mono-Red Pill CTA (Talent) */
      red: "h-[48px] px-6 rounded-full bg-[#F13030] text-white font-semibold text-[15px] hover:bg-[#d31f20] transition-all shadow-md focus-visible:shadow-[var(--shadow-focus)] [&_*]:text-white",
      /* Monologg Native Mono-Purple Pill CTA (Client) */
      purple: "h-[48px] px-6 rounded-full bg-[#7B00FE] text-white font-semibold text-[15px] hover:bg-[#6400d1] transition-all shadow-md focus-visible:shadow-[var(--shadow-focus)] [&_*]:text-white",
      /* Monologg Dark Neutral Pill Button */
      "dark-pill": "h-[48px] px-6 rounded-full bg-[#16161A] text-white font-semibold text-[15px] hover:bg-[#232329] border border-white/10 transition-all [&_*]:text-white",
      /* Monologg Outlined Pill Button */
      "outline-pill": "h-[48px] px-6 rounded-full bg-transparent text-[var(--color-text-primary)] border border-[var(--color-border-strong)] hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-elevated)] transition-all",
      
      /* Backward compatibility aliases */
      lime: "h-[48px] px-6 rounded-full bg-[#F13030] text-white font-semibold text-[15px] hover:bg-[#d31f20] transition-all [&_*]:text-white",
      forest: "h-[48px] px-6 rounded-full bg-[#16161A] text-white font-semibold text-[15px] hover:bg-[#232329] border border-white/10 transition-all [&_*]:text-white",
      clay: "h-[48px] px-6 rounded-full bg-[#7B00FE] text-white font-semibold text-[15px] hover:bg-[#6400d1] transition-all [&_*]:text-white"
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizeStyles, className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
