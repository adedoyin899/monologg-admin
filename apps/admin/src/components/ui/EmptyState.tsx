import React from "react";
import clsx from "clsx";
import { Inbox } from "lucide-react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon = <Inbox className="h-10 w-10 text-gray-400" />,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-[#2A2A2A] p-12 text-center",
        className,
      )}
    >
      <div className="mb-4 rounded-full bg-gray-100 p-3 dark:bg-[#1C1C1C]">{icon}</div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

