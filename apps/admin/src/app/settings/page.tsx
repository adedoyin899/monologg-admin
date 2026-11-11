"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Shield,
  Clock,
  Database,
  Sliders,
  CheckCircle,
  Layers,
  FileText,
  RefreshCw,
  GitBranch,
} from "lucide-react";
import {
  adminClient,
  type PlatformSettingsResponse,
} from "@/lib/admin-client";
import { Card } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const data = await adminClient.getSettings();
        setSettings(data);
      } catch (err) {
        console.error("Failed to load platform settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Platform Settings & Parameters
            </h1>
            <span className="font-mono text-xs font-semibold uppercase text-monologg-red">
              AD-32
            </span>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Read-only registry of system thresholds, operational SLA targets, four-eyes rules and version metadata.
          </p>
        </div>

        {settings && (
          <div className="flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            <GitBranch className="h-3.5 w-3.5 text-monologg-red" />
            <span>Version {settings.version.appVersion}</span>
            <span className="text-neutral-400">&middot;</span>
            <span className="font-mono text-[11px] text-neutral-500">{settings.version.configVersion}</span>
          </div>
        )}
      </div>

      {loading || !settings ? (
        <div className="flex h-64 items-center justify-center text-sm text-neutral-500">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Loading platform configuration...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* SLA Targets */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <Clock className="h-4 w-4 text-monologg-red" />
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Operational SLA Targets (PRD Section 6 & M7)
              </h2>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-neutral-50 dark:border-neutral-800/40">
                <span className="text-neutral-600 dark:text-neutral-400">Urgent Priority Support Ticket</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">{settings.slas.urgentTicketHours} hours</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neutral-50 dark:border-neutral-800/40">
                <span className="text-neutral-600 dark:text-neutral-400">High Priority Support Ticket</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">{settings.slas.highTicketHours} hours</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neutral-50 dark:border-neutral-800/40">
                <span className="text-neutral-600 dark:text-neutral-400">Normal Priority Support Ticket</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">{settings.slas.normalTicketHours} hours</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neutral-50 dark:border-neutral-800/40">
                <span className="text-neutral-600 dark:text-neutral-400">Low Priority Support Ticket</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">{settings.slas.lowTicketHours} hours</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neutral-50 dark:border-neutral-800/40">
                <span className="text-neutral-600 dark:text-neutral-400">Talent Video Verification Review</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">{settings.slas.verificationReviewHours} hours</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neutral-50 dark:border-neutral-800/40">
                <span className="text-neutral-600 dark:text-neutral-400">Dispute Max Resolution Window</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">{settings.slas.disputeStalledDays} days</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-600 dark:text-neutral-400">Pending Withdrawal Alert Stale Threshold</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">{settings.slas.withdrawalStalledHours} hours</span>
              </div>
            </div>
          </Card>

          {/* Thresholds & Governance */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <Shield className="h-4 w-4 text-monologg-red" />
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Governance, Four-Eyes & Capacity Limits
              </h2>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-neutral-50 dark:border-neutral-800/40">
                <span className="text-neutral-600 dark:text-neutral-400">Four-Eyes Dispute Approval Threshold (NGN)</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  ₦{settings.thresholds.fourEyesThresholdNgn.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neutral-50 dark:border-neutral-800/40">
                <span className="text-neutral-600 dark:text-neutral-400">Four-Eyes Dispute Approval Threshold (USD)</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  ${settings.thresholds.fourEyesThresholdUsd.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neutral-50 dark:border-neutral-800/40">
                <span className="text-neutral-600 dark:text-neutral-400">Database Max Allocation Limit</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  {settings.thresholds.databaseLimitMb} MB
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neutral-50 dark:border-neutral-800/40">
                <span className="text-neutral-600 dark:text-neutral-400">Storage Max Allocation Limit (R2)</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  {settings.thresholds.storageLimitGb} GB
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-600 dark:text-neutral-400">Resource Warning Threshold Indicator</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  &ge; {settings.thresholds.resourceAlertThresholdPct}%
                </span>
              </div>
            </div>
          </Card>

          {/* Retention Policies */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <Database className="h-4 w-4 text-monologg-red" />
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Data Retention & Purge Policies (PRD Section 12.3)
              </h2>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-neutral-50 dark:border-neutral-800/40">
                <div>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200 block">
                    Product & Analytics Events
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Pre-aggregated into KpiDaily nightly before deletion
                  </span>
                </div>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  {settings.retention.analyticsRetentionMonths} months
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-neutral-50 dark:border-neutral-800/40">
                <div>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200 block">
                    Export CSV Archives
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Private R2 storage purged automatically via scheduled tick
                  </span>
                </div>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  {settings.retention.exportFileRetentionDays} days
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <div>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200 block">
                    Security Audit Trail
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Immutable append-only log &middot; Never purged
                  </span>
                </div>
                <span className="inline-flex items-center rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                  {settings.retention.auditLogRetention}
                </span>
              </div>
            </div>
          </Card>

          {/* Model Registry & Funnels */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <Layers className="h-4 w-4 text-monologg-red" />
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Analytics Models & Feature Registry
              </h2>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-neutral-50 dark:border-neutral-800/40">
                <div>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200 block">
                    Active Product Features Registered
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Tracked in Adoption Analytics (PRD M10.2)
                  </span>
                </div>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  {settings.featuresCount} features
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-neutral-50 dark:border-neutral-800/40">
                <div>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200 block">
                    Conversion Funnel Architectures
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Talent Onboarding, Client Lifecycle, External Booking
                  </span>
                </div>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  {settings.funnelsCount} funnels
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <div>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200 block">
                    Environment Deployment
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Vercel Edge &middot; Fastify Backend
                  </span>
                </div>
                <span className="font-mono font-semibold uppercase text-neutral-700 dark:text-neutral-300">
                  {settings.version.environment}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
