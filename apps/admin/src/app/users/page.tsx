"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Filter,
  RefreshCw,
  Tag,
  ShieldAlert,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  X,
  AlertTriangle,
  User,
  CheckSquare,
  Square,
  Globe,
  Briefcase,
  Calendar,
} from "lucide-react";
import {
  adminClient,
  type UserListItem,
  type UserListFilterOptions,
} from "@/lib/admin-client";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

function UsersListContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL-driven filter state
  const searchParam = searchParams.get("search") || "";
  const userTypeParam = (searchParams.get("userType") as "ALL" | "TALENT" | "CLIENT") || "ALL";
  const verificationParam = searchParams.get("verification") || "ALL";
  const suspendedParam = (searchParams.get("suspended") as "ALL" | "true" | "false") || "ALL";
  const countryParam = searchParams.get("country") || "";
  const cohortTagParam = searchParams.get("cohortTag") || "";
  const cursorParam = searchParams.get("cursor") || "";

  // Local state
  const [searchTerm, setSearchTerm] = useState(searchParam);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bulk selection
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBulkTagDialogOpen, setIsBulkTagDialogOpen] = useState(false);
  const [bulkTagAction, setBulkTagAction] = useState<"ADD" | "REMOVE">("ADD");
  const [bulkTagName, setBulkTagName] = useState("");
  const [isSubmittingBulkTag, setIsSubmittingBulkTag] = useState(false);

  // Sync filter changes to URL
  const updateFilters = useCallback(
    (newParams: Record<string, string | null>) => {
      const current = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(newParams)) {
        if (!val || val === "ALL") {
          current.delete(key);
        } else {
          current.set(key, val);
        }
      }
      // Reset cursor when changing search or filter parameters
      if (!("cursor" in newParams)) {
        current.delete("cursor");
      }
      router.push(`${pathname}?${current.toString()}`);
    },
    [router, pathname, searchParams],
  );

  // Load users from API
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const options: UserListFilterOptions = {
        search: searchParam || undefined,
        userType: userTypeParam !== "ALL" ? userTypeParam : undefined,
        verification: verificationParam !== "ALL" ? verificationParam : undefined,
        suspended: suspendedParam !== "ALL" ? suspendedParam : undefined,
        country: countryParam || undefined,
        cohortTag: cohortTagParam || undefined,
        cursor: cursorParam || undefined,
        limit: 50,
      };

      const res = await adminClient.getUsers(options);
      setUsers(res.users);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
      setTotalCount(res.totalCount);
    } catch (err: any) {
      setError(err?.message || "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  }, [
    searchParam,
    userTypeParam,
    verificationParam,
    suspendedParam,
    countryParam,
    cohortTagParam,
    cursorParam,
  ]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Bulk select toggles
  const toggleSelectAll = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map((u) => u.id));
    }
  };

  const toggleSelectUser = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleBulkTagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkTagName.trim() || selectedUserIds.length === 0) return;
    setIsSubmittingBulkTag(true);
    try {
      await adminClient.bulkUpdateUserTags(selectedUserIds, bulkTagName.trim(), bulkTagAction);
      setIsBulkTagDialogOpen(false);
      setBulkTagName("");
      setSelectedUserIds([]);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || "Failed to update tags.");
    } finally {
      setIsSubmittingBulkTag(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Users Directory
            </h1>
            <span className="rounded-md bg-gray-100 dark:bg-[#202020] px-2 py-0.5 text-xs font-mono font-medium text-gray-600 dark:text-gray-400">
              AD-04
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Search, moderate, inspect activity, and view holistic user profiles.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadUsers()}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-[#2C2C2C] bg-white dark:bg-[#181818] px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222222] transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by masked name, email, referral code or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") updateFilters({ search: searchTerm });
              }}
              className="w-full rounded-xl border border-gray-200 dark:border-[#282828] bg-gray-50/50 dark:bg-[#161616] pl-9 pr-8 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-monologg-red focus:outline-none focus:ring-1 focus:ring-monologg-red"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  updateFilters({ search: null });
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* User Type */}
          <div className="md:col-span-2">
            <select
              value={userTypeParam}
              onChange={(e) => updateFilters({ userType: e.target.value })}
              className="w-full rounded-xl border border-gray-200 dark:border-[#282828] bg-gray-50/50 dark:bg-[#161616] px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-monologg-red focus:outline-none focus:ring-1 focus:ring-monologg-red"
            >
              <option value="ALL">All Types</option>
              <option value="TALENT">Talent (Creators)</option>
              <option value="CLIENT">Clients</option>
            </select>
          </div>

          {/* Verification */}
          <div className="md:col-span-2">
            <select
              value={verificationParam}
              onChange={(e) => updateFilters({ verification: e.target.value })}
              className="w-full rounded-xl border border-gray-200 dark:border-[#282828] bg-gray-50/50 dark:bg-[#161616] px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-monologg-red focus:outline-none focus:ring-1 focus:ring-monologg-red"
            >
              <option value="ALL">All Verification</option>
              <option value="VERIFIED">Verified</option>
              <option value="UNVERIFIED">Unverified</option>
              <option value="PROCESSING">Processing</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Suspended */}
          <div className="md:col-span-2">
            <select
              value={suspendedParam}
              onChange={(e) => updateFilters({ suspended: e.target.value })}
              className="w-full rounded-xl border border-gray-200 dark:border-[#282828] bg-gray-50/50 dark:bg-[#161616] px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-monologg-red focus:outline-none focus:ring-1 focus:ring-monologg-red"
            >
              <option value="ALL">All Status</option>
              <option value="false">Active Only</option>
              <option value="true">Suspended Only</option>
            </select>
          </div>

          {/* Filter apply button */}
          <div className="md:col-span-1">
            <button
              onClick={() => updateFilters({ search: searchTerm })}
              className="w-full rounded-xl bg-monologg-red px-3 py-2 text-sm font-semibold text-white hover:bg-monologg-red/90 transition-colors shadow-sm text-center"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Secondary filters: Country & Cohort Tag */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 dark:border-[#222222] text-xs">
          <span className="font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" /> Filters:
          </span>

          {/* Country filter */}
          <input
            type="text"
            placeholder="Country (e.g. NG, US)"
            value={countryParam}
            onChange={(e) => updateFilters({ country: e.target.value.toUpperCase() })}
            className="rounded-lg border border-gray-200 dark:border-[#282828] bg-white dark:bg-[#161616] px-2.5 py-1 text-xs text-gray-800 dark:text-gray-200 uppercase w-32 focus:border-monologg-red focus:outline-none"
          />

          {/* Cohort tag filter */}
          <input
            type="text"
            placeholder="Cohort tag..."
            value={cohortTagParam}
            onChange={(e) => updateFilters({ cohortTag: e.target.value })}
            className="rounded-lg border border-gray-200 dark:border-[#282828] bg-white dark:bg-[#161616] px-2.5 py-1 text-xs text-gray-800 dark:text-gray-200 w-36 focus:border-monologg-red focus:outline-none"
          />

          {/* Reset active filters */}
          {(searchParam ||
            userTypeParam !== "ALL" ||
            verificationParam !== "ALL" ||
            suspendedParam !== "ALL" ||
            countryParam ||
            cohortTagParam) && (
            <button
              onClick={() => {
                setSearchTerm("");
                router.push(pathname);
              }}
              className="text-xs text-monologg-red hover:underline font-medium ml-auto"
            >
              Clear all filters
            </button>
          )}
        </div>
      </Card>

      {/* Bulk actions banner */}
      {selectedUserIds.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-monologg-red/10 border border-monologg-red/20 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 font-medium text-monologg-red">
            <CheckSquare className="h-4 w-4" />
            <span>{selectedUserIds.length} user(s) selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setBulkTagAction("ADD");
                setIsBulkTagDialogOpen(true);
              }}
              className="rounded-lg bg-monologg-red px-3 py-1.5 text-xs font-semibold text-white hover:bg-monologg-red/90 transition-colors shadow-sm"
            >
              Add Cohort Tag
            </button>
            <button
              onClick={() => {
                setBulkTagAction("REMOVE");
                setIsBulkTagDialogOpen(true);
              }}
              className="rounded-lg border border-monologg-red/30 bg-white dark:bg-[#181818] px-3 py-1.5 text-xs font-medium text-monologg-red hover:bg-red-50 dark:hover:bg-[#201515] transition-colors"
            >
              Remove Cohort Tag
            </button>
            <button
              onClick={() => setSelectedUserIds([])}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ml-2"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-400 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <Card className="p-6 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      ) : users.length === 0 ? (
        <EmptyState
          icon={<User className="h-8 w-8 text-gray-400" />}
          title="No users found"
          description="Try adjusting your search query, user type, or cohort tag filter."
          action={
            <button
              onClick={() => {
                setSearchTerm("");
                router.push(pathname);
              }}
              className="rounded-xl bg-monologg-red px-4 py-2 text-xs font-semibold text-white hover:bg-monologg-red/90"
            >
              Clear Filters
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <tr>
                <TableHead className="w-10">
                  <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600">
                    {selectedUserIds.length === users.length && users.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-monologg-red" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Masked Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Country / Source</TableHead>
                <TableHead>Signed Up</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Status</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <TableRow
                    key={u.id}
                    onClick={() => router.push(`/users/${u.id}`)}
                    className={isSelected ? "bg-monologg-red/5 dark:bg-monologg-red/10" : ""}
                  >
                    <TableCell onClick={(e) => toggleSelectUser(u.id, e)}>
                      <button className="text-gray-400 hover:text-gray-600">
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-monologg-red" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </TableCell>

                    {/* Name & ID */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {u.name}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          {u.id.slice(0, 10)}...
                        </span>
                      </div>
                    </TableCell>

                    {/* Masked Email */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-mono text-gray-700 dark:text-gray-300">
                          {u.maskedEmail}
                        </span>
                        <span className="text-[11px] text-gray-400 font-mono">{u.phone}</span>
                      </div>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.type === "TALENT"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        }`}
                      >
                        {u.type}
                      </span>
                    </TableCell>

                    {/* Verification */}
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.verification === "VERIFIED"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : u.verification === "PROCESSING"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                              : u.verification === "FAILED"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                : "bg-gray-100 text-gray-600 dark:bg-[#202020] dark:text-gray-400"
                        }`}
                      >
                        {u.verification}
                      </span>
                    </TableCell>

                    {/* Country & Source */}
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {u.country || "Unknown"}
                        </span>
                        <span className="text-[11px] text-gray-400 truncate max-w-[120px]">
                          {u.source}
                        </span>
                      </div>
                    </TableCell>

                    {/* Signed Up */}
                    <TableCell>
                      <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {new Date(u.signedUp).toLocaleDateString()}
                      </span>
                    </TableCell>

                    {/* Last Active */}
                    <TableCell>
                      <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {u.lastActive ? new Date(u.lastActive).toLocaleDateString() : "Never"}
                      </span>
                    </TableCell>

                    {/* Bookings */}
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-[#222222] px-2 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {u.bookings}
                      </span>
                    </TableCell>

                    {/* Tags */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {u.tags.length > 0 ? (
                          u.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-gray-100 dark:bg-[#202020] px-1.5 py-0.5 text-[10px] font-mono text-gray-600 dark:text-gray-400"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                        {u.tags.length > 2 && (
                          <span className="text-[10px] text-gray-400">+{u.tags.length - 2}</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {u.suspended ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          <ShieldAlert className="h-3 w-3" /> Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing {users.length} users {totalCount !== null ? `of ~${totalCount}` : ""}
            </span>
            <div className="flex items-center gap-2">
              {hasMore && nextCursor && (
                <button
                  onClick={() => updateFilters({ cursor: nextCursor })}
                  className="flex items-center gap-1 rounded-xl border border-gray-200 dark:border-[#2C2C2C] bg-white dark:bg-[#181818] px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222222] transition-colors"
                >
                  Next Page <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Tag Dialog */}
      <Dialog
        open={isBulkTagDialogOpen}
        onClose={() => setIsBulkTagDialogOpen(false)}
        title={bulkTagAction === "ADD" ? "Bulk Add Cohort Tag" : "Bulk Remove Cohort Tag"}
        description={`This action will ${bulkTagAction === "ADD" ? "add" : "remove"} the specified tag for ${selectedUserIds.length} selected users and write an audited log row.`}
      >
        <form onSubmit={handleBulkTagSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Cohort Tag Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. beta-2026, vip-creator, alpha-talent"
              value={bulkTagName}
              onChange={(e) => setBulkTagName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-gray-50/50 dark:bg-[#181818] px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-monologg-red focus:outline-none focus:ring-1 focus:ring-monologg-red"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsBulkTagDialogOpen(false)}
              className="rounded-xl border border-gray-200 dark:border-[#2A2A2A] px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1E1E1E]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingBulkTag || !bulkTagName.trim()}
              className="rounded-xl bg-monologg-red px-4 py-2 text-xs font-semibold text-white hover:bg-monologg-red/90 disabled:opacity-50"
            >
              {isSubmittingBulkTag ? "Applying..." : bulkTagAction === "ADD" ? "Apply Tag" : "Remove Tag"}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Loading directory...</div>}>
      <UsersListContent />
    </Suspense>
  );
}
