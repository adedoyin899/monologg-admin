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
        "rounded-xl border bg-white dark:bg-[#141414] border-gray-200 dark:border-[#242424] p-5 shadow-sm transition-colors",
        className,
      )}
      {...props}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-[#222222] mb-4">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
