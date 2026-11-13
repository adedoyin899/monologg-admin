import React from "react";
import clsx from "clsx";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("w-full max-w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-[#242424] bg-white dark:bg-[#141414]", className)}>
      <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300 tabular-nums">
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-gray-200 dark:border-[#242424] bg-gray-50 dark:bg-[#181818] text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F1F] bg-white dark:bg-[#141414]">{children}</tbody>;
}

export function TableRow({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={clsx(
        "transition-colors hover:bg-gray-50 dark:hover:bg-[#1A1A1A]",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function TableHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={clsx("px-3 py-3 whitespace-nowrap", className)}>{children}</th>;
}

export function TableCell({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <td onClick={onClick} className={clsx("px-3 py-3 text-sm", className)}>
      {children}
    </td>
  );
}
