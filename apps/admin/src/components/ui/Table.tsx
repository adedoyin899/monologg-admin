import React from "react";
import clsx from "clsx";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-[#242424]", className)}>
      <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-gray-200 dark:border-[#242424] bg-gray-50 dark:bg-[#181818] text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
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
  return <th className={clsx("px-4 py-3.5", className)}>{children}</th>;
}

export function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={clsx("px-4 py-3.5 text-sm", className)}>{children}</td>;
}

