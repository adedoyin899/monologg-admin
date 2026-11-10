import * as React from "react";
import { Settings, Sun, Moon, LogOut } from "lucide-react";
import { useTheme } from "../../Root";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";

export interface SidebarNavItem<T extends string> {
  id: T;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  badge?: string | number;
}

interface SidebarIdentity {
  initials: string;
  name: string;
  avatarUrl?: string;
  /** e.g. "Client Account", or a verified-badge row for talent */
  subtitle: React.ReactNode;
}

interface SidebarProps<T extends string> {
  portalLabel: string;
  navItems: SidebarNavItem<T>[];
  activeTab: T;
  onTab: (t: T) => void;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
  identity: SidebarIdentity;
}

/** Desktop sidebar shared by TalentDashboard and ClientDashboard — the
 * two were previously byte-for-byte-identical markup reimplemented
 * per file, differing only in nav items, portal label and identity. */
export function Sidebar<T extends string>({ portalLabel, navItems, activeTab, onTab, onNavigate, onSignOut, identity }: SidebarProps<T>) {
  const { isDark, toggle } = useTheme();

  return (
    <aside
      className="hidden lg:flex flex-col w-60 shrink-0 min-h-screen fixed left-0 top-0 bottom-0 z-20"
      style={{ background: "var(--color-bg-surface)", borderRight: "1px solid var(--color-border-default)" }}
    >
      <button
        onClick={() => onNavigate("/")}
        className="p-5 mb-2 text-left"
        style={{ borderBottom: "1px solid var(--color-border-default)" }}
        aria-label="Monologg home"
      >
        <Logo className="h-6 w-auto" style={{ color: "var(--color-text-primary)" }} />
        <div className="text-xs font-body mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>{portalLabel}</div>
      </button>

      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navItems.map(item => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTab(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium font-body transition-all text-left"
              style={{
                background: active ? "var(--color-accent-glow)" : "transparent",
                color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
                borderLeft: active ? "2px solid var(--color-accent)" : "2px solid transparent",
              }}
            >
              <item.icon className="w-4 h-4" style={{ color: active ? "var(--color-accent)" : "var(--color-text-tertiary)" }} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-4 space-y-0.5" style={{ borderTop: "1px solid var(--color-border-default)" }}>
        <button
          onClick={() => onNavigate(portalLabel.toLowerCase().includes("client") ? "/settings?role=client" : "/settings?role=talent")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body transition-all text-left"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <Settings className="w-4 h-4" style={{ color: "var(--color-text-tertiary)" }} /> Settings
        </button>
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body transition-all text-left"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {isDark ? <Sun className="w-4 h-4" style={{ color: "var(--color-text-tertiary)" }} /> : <Moon className="w-4 h-4" style={{ color: "var(--color-text-tertiary)" }} />}
          {isDark ? "Light Mode" : "Dark Mode"}
        </button>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body transition-all text-left"
          style={{ color: "var(--color-error)" }}
        >
          <LogOut className="w-4 h-4" style={{ color: "var(--color-error)" }} /> Sign Out
        </button>

        <div
          className="mt-3 px-3 py-3 rounded-xl flex items-center gap-3"
          style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}
        >
          <Avatar size="sm" src={identity.avatarUrl} background="var(--color-accent-glow)" color="var(--color-accent)">
            {identity.initials}
          </Avatar>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate font-body" style={{ color: "var(--color-text-primary)" }}>{identity.name}</div>
            <div className="text-xs truncate font-body" style={{ color: "var(--color-text-tertiary)" }}>{identity.subtitle}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
