import React from "react";
import clsx from "clsx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function Card({ title, subtitle, action, children, className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-xl border bg-white dark:bg-[#141414] border-gray-200 dark:border-[#242424] p-4 sm:p-5 shadow-sm transition-colors min-w-0",
        className,
      )}
      {...props}
    >
      {(title || subtitle || action) && (
        <div className="flex flex-wrap items-start justify-between gap-2 pb-4 border-b border-gray-100 dark:border-[#222222] mb-4">
          <div className="min-w-0">
            {title && (
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
