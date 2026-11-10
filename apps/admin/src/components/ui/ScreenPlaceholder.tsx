import React from "react";
import { Card } from "./Card";
import { EmptyState } from "./EmptyState";

export interface ScreenPlaceholderProps {
  screenId: string;
  title: string;
  module: string;
  description: string;
  phase: string;
}

export function ScreenPlaceholder({
  screenId,
  title,
  module,
  description,
  phase,
}: ScreenPlaceholderProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold uppercase text-monologg-red">
              {screenId}
            </span>
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <span className="font-mono text-xs text-gray-500 uppercase">{module}</span>
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {title}
            </h1>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>

      <Card>
        <EmptyState
          title={`${title} Placeholder`}
          description={`Screen ${screenId} (${module}) will be fully implemented in ${phase}. API route endpoints and RBAC rules are established.`}
        />
      </Card>
    </div>
  );
}

