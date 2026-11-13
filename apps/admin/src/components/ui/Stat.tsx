import React from "react";
import clsx from "clsx";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export interface StatProps {
  label: string;
  value: string | number;
  change?: number; // e.g. +12.5 or -3.2
  period?: string; // e.g. "vs previous 7 days"
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function Stat({
  label,
  value,
  change,
  period,
  prefix,
  suffix,
  icon,
  className,
}: StatProps) {
  const isPositive = typeof change === "number" && change > 0;
  const isNegative = typeof change === "number" && change < 0;
  const isNeutral = typeof change === "number" && change === 0;

  return (
    <div
      className={clsx(
        "rounded-xl border bg-white dark:bg-[#141414] border-gray-200 dark:border-[#242424] p-4 sm:p-5 shadow-sm transition-colors min-w-0",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400 truncate">
          {label}
        </span>
        {icon && <div className="text-gray-500 dark:text-gray-400 shrink-0">{icon}</div>}
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        {prefix && <span className="text-lg text-gray-600 dark:text-gray-400 font-medium">{prefix}</span>}
        <span className="text-2xl lg:text-3xl font-bold tracking-tight text-gray-900 dark:text-white font-mono tabular-nums">
          {value}
        </span>
        {suffix && <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">{suffix}</span>}
      </div>

      {typeof change === "number" && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-medium">
          <span
            className={clsx(
              "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 tabular-nums",
              isPositive && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
              isNegative && "bg-red-500/10 text-red-700 dark:text-red-400",
              isNeutral && "bg-gray-500/10 text-gray-700 dark:text-gray-400",
            )}
          >
            {isPositive && <ArrowUpRight className="h-3 w-3" />}
            {isNegative && <ArrowDownRight className="h-3 w-3" />}
            {isNeutral && <Minus className="h-3 w-3" />}
            {Math.abs(change)}%
          </span>
          {period && <span className="text-gray-600 dark:text-gray-400">{period}</span>}
        </div>
      )}
    </div>
  );
}
