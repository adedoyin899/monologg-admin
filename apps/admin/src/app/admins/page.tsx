"use client";

import React, { useState, useEffect, useCallback } from "react";
import { UserPlus, Shield, UserX, CheckCircle, RefreshCw } from "lucide-react";
import { adminClient, type AdminUser, type AdminRole, type AdminSessionInfo } from "@/lib/admin-client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Dialog } from "@/components/ui/Dialog";
import { Toast } from "@/components/ui/Toast";

export default function AdminsPage() {
  const { data: authData } = useAuth();
  const [admins, setAdmins] = useState<(AdminUser & { lastSession: AdminSessionInfo | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AdminRole>("VIEWER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminClient.getAdmins();
      setAdmins(res.admins);
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to load admin users",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await adminClient.inviteAdmin(inviteEmail, inviteRole);
      setToast({ type: "success", message: `Successfully invited ${inviteEmail} as ${inviteRole}` });
      setInviteOpen(false);
      setInviteEmail("");
      fetchAdmins();
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to invite admin",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (id: string, role: AdminRole) => {
    try {
      await adminClient.changeRole(id, role);
      setToast({ type: "success", message: "Role updated successfully." });
      fetchAdmins();
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update role",
      });
    }
  };

  const handleDisable = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to disable admin access for ${email}? Active sessions will be terminated immediately.`)) {
      return;
    }
    try {
      await adminClient.disableAdmin(id, "Disabled by Super Admin from console");
      setToast({ type: "success", message: `Admin ${email} disabled and sessions revoked.` });
      fetchAdmins();
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to disable admin",
      });
    }
  };

  const isSuperAdmin = authData?.admin?.role === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Screen Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold uppercase text-monologg-red">AD-31</span>
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Admin Users
            </h1>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Manage administrative accounts, role-based access control, and active session states.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-monologg-red px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-600 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite Admin</span>
          </button>
        )}
      </div>

      {/* Admin Users Table Card */}
      <Card>
        <div className="flex items-center justify-between pb-4">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {admins.length} Total Registered Admin(s)
          </span>
          <button
            onClick={() => fetchAdmins()}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-gray-500">Loading admin users...</div>
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MFA Status</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => {
                const isCurrent = admin.id === authData?.admin?.id;
                return (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-mono text-xs font-medium">
                        <span>{admin.email}</span>
                        {isCurrent && (
                          <span className="rounded bg-monologg-red/10 px-1.5 py-0.5 text-[10px] font-semibold text-monologg-red">
                            YOU
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isSuperAdmin && !isCurrent ? (
                        <select
                          value={admin.role}
                          onChange={(e) => handleRoleChange(admin.id, e.target.value as AdminRole)}
                          className="rounded border border-gray-300 dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] px-2 py-1 text-xs font-mono font-semibold text-gray-900 dark:text-white focus:outline-none"
                        >
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                          <option value="OPS">OPS</option>
                          <option value="SUPPORT">SUPPORT</option>
                          <option value="FINANCE">FINANCE</option>
                          <option value="COMPLIANCE">COMPLIANCE</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      ) : (
                        <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {admin.role}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold font-mono ${
                          admin.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            admin.status === "ACTIVE" ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                        {admin.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 rounded bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] font-mono text-neutral-700 dark:text-neutral-300">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        {admin.status === "ACTIVE" ? "aal2 Verified" : "None"}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {admin.authProvider}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {admin.lastSession ? new Date(admin.lastSession.lastSeenAt).toLocaleString() : "No active session"}
                    </TableCell>
                    <TableCell className="text-right">
                      {isSuperAdmin && !isCurrent && admin.status === "ACTIVE" && (
                        <button
                          onClick={() => handleDisable(admin.id, admin.email)}
                          className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          <span>Disable</span>
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Invite Admin Dialog */}
      <Dialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite Administrative User"
        description="Invited emails cannot belong to existing talent or client accounts."
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Admin Email Address
            </label>
            <input
              type="email"
              required
              placeholder="operator@monologg.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] px-3.5 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-monologg-red"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role & Permissions
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as AdminRole)}
              className="w-full rounded-lg border border-gray-300 dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:outline-none"
            >
              <option value="VIEWER">VIEWER (Aggregates, Read-only)</option>
              <option value="SUPPORT">SUPPORT (Tickets, Masked PII, Disputes)</option>
              <option value="OPS">OPS (Users, Bookings, Moderation)</option>
              <option value="FINANCE">FINANCE (Payments, Escrow, Refunds)</option>
              <option value="COMPLIANCE">COMPLIANCE (KYC Queue, Audit Logs)</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN (Full Platform Access)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#222222]">
            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              className="rounded-lg border border-gray-300 dark:border-[#333333] px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#202020]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-monologg-red px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
            >
              {isSubmitting ? "Inviting..." : "Send Invite"}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

