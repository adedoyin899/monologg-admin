import * as React from "react";
import { cn } from "../../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-[54px] w-full rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface-2)] px-4 font-body text-[length:var(--font-size-base)] text-[var(--color-text-primary)] transition-all duration-[var(--duration-fast,160ms)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-border-active)] focus:bg-[var(--color-bg-surface)] focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-glow)] disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-[var(--color-error)] focus:shadow-[0_0_0_4px_var(--color-error-bg)]",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
