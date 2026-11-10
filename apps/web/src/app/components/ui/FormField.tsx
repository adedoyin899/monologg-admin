import * as React from "react";

interface FormFieldProps {
  label: string;
  className?: string;
  children: React.ReactNode;
}

/** Uppercase caption label + control, reused 15+ times across Settings,
 * ProjectBrief, TalentDashboard and CreatorOnboarding with slightly
 * drifting margins/sizes — this is the single source for that shape now. */
export function FormField({ label, className, children }: FormFieldProps) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium uppercase tracking-wider mb-2 font-body" style={{ color: "var(--color-text-secondary)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
