import React from "react";
import clsx from "clsx";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export interface ToastProps {
  type?: "success" | "error" | "info" | "warning";
  message: string;
  onClose?: () => void;
}

export function Toast({ type = "info", message, onClose }: ToastProps) {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertCircle className="h-5 w-5 text-amber-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  return (
    <div
      className={clsx(
        "flex items-center gap-3 rounded-xl border p-4 shadow-lg transition-all",
        "bg-white dark:bg-[#181818] border-gray-200 dark:border-[#2A2A2A] text-gray-900 dark:text-white",
      )}
    >
      <div>{icons[type]}</div>
      <p className="text-sm font-medium">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-auto rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

