import React from "react";
import clsx from "clsx";

export interface TabItem {
  id: string;
  label: string;
  badge?: number | string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      className={clsx(
        "flex space-x-1 border-b border-gray-200 dark:border-[#242424] overflow-x-auto no-scrollbar",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={clsx(
              "flex min-h-[44px] items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              isActive
                ? "border-monologg-red text-monologg-red dark:text-[#FF5A5C] font-semibold"
                : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-white",
            )}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                  isActive
                    ? "bg-monologg-red/10 text-monologg-red dark:text-[#FF5A5C]"
                    : "bg-gray-100 text-gray-700 dark:bg-[#202020] dark:text-gray-300",
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
