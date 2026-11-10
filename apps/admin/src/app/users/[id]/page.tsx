"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  ShieldAlert,
  ShieldCheck,
  Eye,
  FileText,
  Clock,
  DollarSign,
  Calendar,
  Bell,
  Activity,
  LifeBuoy,
  Lock,
  RefreshCw,
  Plus,
  Play,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Send,
  Trash2,
  KeyRound,
  Tag,
  Globe,
  Smartphone,
  Info,
} from "lucide-react";
import {
  adminClient,
  type User360Response,
  type UserRevealResponse,
} from "@/lib/admin-client";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Dialog } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function UserDetailPage({ params }: UserDetailPageProps) {
  const router = useRouter();
  const { id } = use(params);

  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState<User360Response | null>(null);
  const [revealedPii, setRevealedPii] = useState<UserRevealResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isRevealDialogOpen, setIsRevealDialogOpen] = useState(false);
  const [revealReason, setRevealReason] = useState("");
  const [isSubmittingReveal, setIsSubmittingReveal] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);

  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [isSubmittingSuspend, setIsSubmittingSuspend] = useState(false);

  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminClient.getUser(id);
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load user details.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const showSuccessBanner = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 5000);
  };

  // Handlers
  const handleReveal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revealReason.trim()) return;
    setIsSubmittingReveal(true);
    setRevealError(null);
    try {
      const res = await adminClient.revealUser(id, revealReason.trim());
      setRevealedPii(res);
      setIsRevealDialogOpen(false);
      setRevealReason("");
      showSuccessBanner("Unmasked PII and searchable attributes revealed. Access was audited.");
    } catch (err: any) {
      setRevealError(err?.message || "Reveal forbidden or failed.");
    } finally {
      setIsSubmittingReveal(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim()) return;
    setIsSubmittingNote(true);
    try {
      await adminClient.addUserNote(id, noteBody.trim());
      setIsNoteDialogOpen(false);
      setNoteBody("");
      showSuccessBanner("Internal note added and audited.");
      await loadUser();
    } catch (err: any) {
      alert(err.message || "Failed to add note.");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleSuspendToggle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!data) return;

    if (data.overview.suspended) {
      // Unsuspend
      if (!confirm("Are you sure you want to unsuspend this user?")) return;
      setIsSubmittingSuspend(true);
      try {
        await adminClient.unsuspendUser(id, "Unsuspended via User 360");
        showSuccessBanner("User account unsuspended.");
        await loadUser();
      } catch (err: any) {
        alert(err.message || "Failed to unsuspend user.");
      } finally {
        setIsSubmittingSuspend(false);
      }
    } else {
      // Suspend
      if (!suspendReason.trim()) return;
      setIsSubmittingSuspend(true);
      try {
        const res = await adminClient.suspendUser(id, suspendReason.trim());
        setIsSuspendDialogOpen(false);
        setSuspendReason("");
        showSuccessBanner(`User suspended and ${res.revokedCount} active session(s) revoked.`);
        await loadUser();
      } catch (err: any) {
        alert(err.message || "Failed to suspend user.");
      } finally {
        setIsSubmittingSuspend(false);
      }
    }
  };

  const handleRevokeSessions = async () => {
    if (!confirm("Revoke all active sessions for this user? They will be signed out immediately.")) {
      return;
    }
    try {
      const res = await adminClient.revokeUserSessions(id);
      showSuccessBanner(`All active sessions revoked (${res.revokedCount} session tokens invalidated).`);
      await loadUser();
    } catch (err: any) {
      alert(err.message || "Failed to revoke sessions.");
    }
  };

  const handleResendVerification = async () => {
    try {
      await adminClient.resendUserVerification(id);
      showSuccessBanner("Verification email resent to user.");
    } catch (err: any) {
      alert(err.message || "Failed to resend verification email.");
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    setIsSubmittingTicket(true);
    try {
      await adminClient.createUserTicket(id, {
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
      });
      setIsTicketDialogOpen(false);
      setTicketSubject("");
      setTicketMessage("");
      showSuccessBanner("Support ticket created on behalf of user.");
      await loadUser();
    } catch (err: any) {
      alert(err.message || "Failed to create support ticket.");
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const handlePlayMediaPreview = async (mediaId: string) => {
    try {
      const res = await adminClient.getMediaSignedUrl(mediaId);
      setPreviewMediaUrl(res.signedUrl);
    } catch (err: any) {
      alert(err.message || "Failed to generate preview URL.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Link
          href="/users"
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Users Directory
        </Link>
        <Card className="p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">User not found</h2>
          <p className="text-sm text-gray-500 mt-1">{error || "Unable to retrieve user record."}</p>
        </Card>
      </div>
    );
  }

  const { overview, profile, calendar, bookings, projects, money, notifications, activity, support, auth } =
    data;

  // Effective display values (masked vs unmasked)
  const displayName = revealedPii ? revealedPii.unmaskedName : overview.name;
  const displayEmail = revealedPii ? revealedPii.unmaskedEmail : overview.email;
  const displayPhone = revealedPii ? revealedPii.unmaskedPhone : overview.phone;

  const tabsList = [
    { id: "overview", label: "Overview" },
    { id: "profile", label: "Profile & Storefront" },
    { id: "calendar", label: "Calendar" },
    { id: "bookings", label: "Bookings", badge: bookings.length },
    { id: "projects", label: "Applications & Projects", badge: projects.length },
    { id: "money", label: "Money" },
    { id: "notifications", label: "Notifications", badge: notifications.length },
    { id: "activity", label: "Activity", badge: activity.length },
    { id: "support", label: "Support & Disputes", badge: support.tickets.length },
    { id: "auth", label: "Auth & Security" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/users"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Users Directory
        </Link>
        <span className="rounded-md bg-gray-100 dark:bg-[#202020] px-2 py-0.5 text-xs font-mono font-medium text-gray-600 dark:text-gray-400">
          AD-05 · User 360
        </span>
      </div>

      {/* Success Notification */}
      {actionSuccessMessage && (
        <div className="rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/20 p-4 text-sm text-green-800 dark:text-green-300 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Hero Banner Header */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-monologg-red/10 text-monologg-red font-bold text-xl">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{displayName}</h1>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    overview.userType === "TALENT"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  }`}
                >
                  {overview.userType}
                </span>
                {overview.suspended ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    <ShieldAlert className="h-3.5 w-3.5" /> Suspended
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <ShieldCheck className="h-3.5 w-3.5" /> Active
                  </span>
                )}
                {revealedPii && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-mono font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    <Eye className="h-3.5 w-3.5" /> PII Revealed (Audited)
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 font-mono">
                <span>ID: {overview.id}</span>
                <span>Email: {displayEmail}</span>
                {displayPhone && <span>Phone: {displayPhone}</span>}
                <span>Signed up: {new Date(overview.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {!revealedPii && (
              <button
                onClick={() => setIsRevealDialogOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-gray-300 dark:border-[#2C2C2C] bg-white dark:bg-[#181818] px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222222] transition-colors"
              >
                <Eye className="h-3.5 w-3.5" /> Reveal PII
              </button>
            )}

            <button
              onClick={() => setIsNoteDialogOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-gray-300 dark:border-[#2C2C2C] bg-white dark:bg-[#181818] px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222222] transition-colors"
            >
              <FileText className="h-3.5 w-3.5" /> Add Note
            </button>

            <button
              onClick={() => {
                if (overview.suspended) {
                  handleSuspendToggle();
                } else {
                  setIsSuspendDialogOpen(true);
                }
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition-colors ${
                overview.suspended
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              {overview.suspended ? "Unsuspend User" : "Suspend User"}
            </button>

            <button
              onClick={handleRevokeSessions}
              className="flex items-center gap-1.5 rounded-xl border border-gray-300 dark:border-[#2C2C2C] bg-white dark:bg-[#181818] px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222222] transition-colors"
            >
              <KeyRound className="h-3.5 w-3.5" /> Revoke Sessions
            </button>

            <button
              onClick={handleResendVerification}
              className="flex items-center gap-1.5 rounded-xl border border-gray-300 dark:border-[#2C2C2C] bg-white dark:bg-[#181818] px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222222] transition-colors"
            >
              <Send className="h-3.5 w-3.5" /> Resend Verification
            </button>

            <button
              onClick={() => setIsTicketDialogOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-monologg-red px-3.5 py-2 text-xs font-semibold text-white hover:bg-monologg-red/90 transition-colors shadow-sm"
            >
              <LifeBuoy className="h-3.5 w-3.5" /> Create Ticket
            </button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs tabs={tabsList} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Panels */}
      <div className="pt-2">
        {/* 1. OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Account Facts */}
              <Card className="p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Account Facts
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#202020]">
                    <span className="text-gray-500">Auth Provider</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {overview.authProvider}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#202020]">
                    <span className="text-gray-500">Account Origin</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {overview.accountOrigin}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#202020]">
                    <span className="text-gray-500">Signed Up</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {new Date(overview.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Last Active</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {overview.lastActiveAt
                        ? new Date(overview.lastActiveAt).toLocaleString()
                        : "Never"}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Acquisition Source */}
              <Card className="p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Acquisition & Origin
                </h3>
                {overview.acquisition ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#202020]">
                      <span className="text-gray-500">Country</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {overview.acquisition.signupCountry || "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#202020]">
                      <span className="text-gray-500">Device Class</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 capitalize">
                        {overview.acquisition.signupDeviceClass || "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#202020]">
                      <span className="text-gray-500">UTM Source</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {overview.acquisition.utmSource || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Referral Code</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 font-mono">
                        {overview.acquisition.referralCodeUsed || "-"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No acquisition record captured.</p>
                )}
              </Card>

              {/* Tags & Moderation */}
              <Card className="p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Tags & Moderation
                </h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-gray-500 block mb-1.5">Cohort Tags:</span>
                    <div className="flex flex-wrap gap-1">
                      {overview.tags.length > 0 ? (
                        overview.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-md bg-gray-100 dark:bg-[#222222] px-2 py-0.5 text-xs font-mono text-gray-700 dark:text-gray-300"
                          >
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400">No tags assigned.</span>
                      )}
                    </div>
                  </div>

                  {overview.suspended && (
                    <div className="pt-2 border-t border-gray-100 dark:border-[#202020]">
                      <span className="text-red-500 font-semibold block">Suspension Reason:</span>
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-2 rounded-lg">
                        {overview.suspendedReason || "No reason specified."}
                      </p>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        Suspended at: {new Date(overview.suspendedAt!).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Internal Notes Thread */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-monologg-red" /> Internal Staff Notes
                </h3>
                <button
                  onClick={() => setIsNoteDialogOpen(true)}
                  className="rounded-lg bg-gray-100 dark:bg-[#202020] px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2A2A2A] transition-colors"
                >
                  + Add Note
                </button>
              </div>

              {overview.notes.length === 0 ? (
                <p className="text-xs text-gray-400 py-3">No staff notes added yet for this account.</p>
              ) : (
                <div className="space-y-3">
                  {overview.notes.map((n) => (
                    <div
                      key={n.id}
                      className="rounded-xl border border-gray-100 dark:border-[#222222] bg-gray-50/50 dark:bg-[#181818] p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-gray-400">
                        <span className="font-mono">Admin ID: {n.adminId}</span>
                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{n.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* 2. PROFILE & STOREFRONT TAB */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            {profile.userType === "TALENT" ? (
              <>
                {/* Talent storefront presentation */}
                <Card className="p-6 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Storefront & Talent Card
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400 block">Niche:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {profile.niche}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Location:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {profile.location || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Celebrity Badge:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {profile.badges?.celebrityBadge ? "Yes (Referral-earned)" : "No"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Media Kit Mode:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {profile.mediaKitMode}
                      </span>
                    </div>
                  </div>

                  {profile.bio && (
                    <div className="text-xs pt-2 border-t border-gray-100 dark:border-[#202020]">
                      <span className="text-gray-400 block mb-1">Bio:</span>
                      <p className="text-gray-700 dark:text-gray-300 italic">{profile.bio}</p>
                    </div>
                  )}

                  {profile.styleTags && profile.styleTags.length > 0 && (
                    <div className="text-xs pt-2 border-t border-gray-100 dark:border-[#202020]">
                      <span className="text-gray-400 block mb-1.5">Style & Vibe Tags:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.styleTags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 px-2 py-0.5 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Media Assets with Signed URL Previews */}
                <Card className="p-6 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Play className="h-4 w-4 text-monologg-red" /> Media Assets ({profile.media?.length || 0})
                  </h3>
                  {profile.media && profile.media.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {profile.media.map((m) => (
                        <div
                          key={m.id}
                          className="rounded-xl border border-gray-200 dark:border-[#282828] bg-gray-50/50 dark:bg-[#161616] p-3 text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-800 dark:text-gray-200 uppercase">
                              {m.kind}
                            </span>
                            <span className="rounded bg-gray-200 dark:bg-[#242424] px-1.5 py-0.5 text-[10px] font-mono">
                              {m.taggingStatus}
                            </span>
                          </div>
                          <div className="text-gray-500 text-[11px]">
                            <span>Size: {(m.sizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                            {m.durationSec && <span> · Duration: {m.durationSec}s</span>}
                          </div>
                          <button
                            onClick={() => handlePlayMediaPreview(m.id)}
                            className="flex items-center gap-1.5 text-monologg-red font-semibold hover:underline text-xs"
                          >
                            <Play className="h-3 w-3" /> Preview Media (5-min Signed URL)
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No media assets uploaded.</p>
                  )}
                </Card>

                {/* Physical Attributes Privacy Section */}
                <Card className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        Physical Attributes & Privacy
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Completeness: {profile.attributes?.completeness.filled} /{" "}
                        {profile.attributes?.completeness.total} (
                        {profile.attributes?.completeness.percentage}%)
                      </p>
                    </div>
                    {!revealedPii && (
                      <button
                        onClick={() => setIsRevealDialogOpen(true)}
                        className="rounded-lg bg-monologg-red/10 text-monologg-red px-3 py-1.5 text-xs font-semibold hover:bg-monologg-red/20 transition-colors"
                      >
                        Reveal Searchable Attributes
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-2">
                    {profile.attributes?.values &&
                      Object.entries(
                        revealedPii?.attributes || profile.attributes.values,
                      ).map(([field, item]) => (
                        <div
                          key={field}
                          className="rounded-xl border border-gray-100 dark:border-[#222222] bg-gray-50/50 dark:bg-[#181818] p-2.5"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-500 capitalize">
                              {field.replace(/([A-Z])/g, " $1")}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-mono uppercase ${
                                item.visibility === "PUBLIC"
                                  ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                                  : item.visibility === "SEARCHABLE"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                    : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                              }`}
                            >
                              {item.visibility}
                            </span>
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {item.visibility === "PRIVATE" ? (
                              <span className="text-red-500 italic text-[11px]">
                                Strictly Private (Never Disclosed)
                              </span>
                            ) : item.value ? (
                              item.value
                            ) : (
                              <span className="text-gray-400 italic text-[11px]">
                                Hidden (Reveal with Reason)
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                  </div>
                </Card>
              </>
            ) : (
              /* Client Profile */
              <Card className="p-6 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Client Profile</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block">Organization Name:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {profile.orgName || "Individual Client"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Organization Type:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {profile.orgType || "-"}
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* 3. CALENDAR TAB */}
        {activeTab === "calendar" && (
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-monologg-red" /> Calendar Linkage
            </h3>
            <div className="text-xs space-y-2">
              <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-[#202020]">
                <span className="text-gray-500">Google Calendar Connected</span>
                <span className="font-semibold">
                  {calendar.connection.connected ? (
                    <span className="text-green-600 font-semibold">Connected</span>
                  ) : (
                    <span className="text-gray-400">Disconnected / None</span>
                  )}
                </span>
              </div>
              {calendar.connection.connectedAt && (
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-500">Connected At</span>
                  <span className="font-mono">
                    {new Date(calendar.connection.connectedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 4. BOOKINGS TAB */}
        {activeTab === "bookings" && (
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Associated Bookings ({bookings.length})
            </h3>
            {bookings.length === 0 ? (
              <p className="text-xs text-gray-400 py-4">No bookings found for this user.</p>
            ) : (
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Counterparty</TableHead>
                    <TableHead>Slot Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Origin</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id} onClick={() => router.push(`/bookings/${b.id}`)}>
                      <TableCell className="font-mono text-xs text-monologg-red hover:underline">
                        {b.id}
                      </TableCell>
                      <TableCell>{b.otherPartyName}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(b.slotDate).toLocaleDateString()} {b.slotStart}-{b.slotEnd}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        {b.currency} {(b.baseAmount / 100).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className="rounded-full bg-gray-100 dark:bg-[#202020] px-2 py-0.5 text-xs font-mono">
                          {b.state}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-gray-500">{b.origin}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        )}

        {/* 5. APPLICATIONS & PROJECTS TAB */}
        {activeTab === "projects" && (
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              {overview.userType === "TALENT"
                ? `Casting & Brief Applications (${projects.length})`
                : `Briefs Posted (${projects.length})`}
            </h3>
            {projects.length === 0 ? (
              <p className="text-xs text-gray-400 py-4">No project applications or briefs found.</p>
            ) : (
              <div className="space-y-3">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-gray-100 dark:border-[#222222] bg-gray-50/50 dark:bg-[#181818] p-4 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">
                        {p.projectName || "Untitled Project"}
                      </span>
                      <span className="rounded bg-gray-200 dark:bg-[#242424] px-2 py-0.5 font-mono text-[11px]">
                        {p.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-gray-500">
                      <span>Type: {p.projectType || "-"}</span>
                      {p.budgetAmount && (
                        <span>
                          Budget: {p.budgetCurrency} {(p.budgetAmount / 100).toLocaleString()}
                        </span>
                      )}
                      <span>Created: {new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>
                    {p.pitch && (
                      <div className="text-gray-700 dark:text-gray-300 italic pt-1 border-t border-gray-100 dark:border-[#222222]">
                        "{p.pitch}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* 6. MONEY & WITHDRAWALS TAB */}
        {activeTab === "money" && (
          <div className="space-y-6">
            {/* PRD Non-Negotiable: Explicit Label */}
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-4 text-xs flex items-center gap-2.5 text-blue-700 dark:text-blue-300">
              <Info className="h-4 w-4 shrink-0" />
              <span>
                <strong>Accounting Basis:</strong> {money.label}
              </span>
            </div>

            {/* Currency Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(money.byCurrency).map(([curr, stats]) => (
                <Card key={curr} className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">{curr}</h3>
                    <span className="rounded bg-gray-100 dark:bg-[#202020] px-2 py-0.5 text-xs font-mono font-semibold">
                      Currency
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#202020]">
                      <span className="text-gray-500">
                        {overview.userType === "TALENT" ? "Earned (Released)" : "Total Spend"}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {curr} {(stats.earned / 100).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#202020]">
                      <span className="text-gray-500">Escrow Held Now</span>
                      <span className="font-semibold text-amber-600">
                        {curr} {(stats.escrowHeld / 100).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#202020]">
                      <span className="text-gray-500">Withdrawn</span>
                      <span className="font-semibold text-green-600">
                        {curr} {(stats.withdrawn / 100).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#202020]">
                      <span className="text-gray-500">Pending Withdrawal</span>
                      <span className="font-semibold text-yellow-600">
                        {curr} {(stats.pendingWithdrawal / 100).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Platform Fees Paid</span>
                      <span className="font-mono text-gray-600 dark:text-gray-400">
                        {curr} {(stats.feesPaid / 100).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Withdrawals List */}
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Withdrawal Requests ({money.withdrawals.length})
              </h3>
              {money.withdrawals.length === 0 ? (
                <p className="text-xs text-gray-400 py-3">No withdrawal requests recorded.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Destination Account</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested At</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {money.withdrawals.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-mono text-xs">{w.id.slice(0, 12)}...</TableCell>
                        <TableCell className="text-xs font-semibold">
                          {w.currency} {(w.amount / 100).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {w.bankName}
                            </span>
                            <span className="font-mono text-[11px] text-gray-500">
                              {w.accountNumber} ({w.accountName})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="rounded-full bg-gray-100 dark:bg-[#202020] px-2 py-0.5 text-xs font-mono font-medium">
                            {w.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {new Date(w.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>
        )}

        {/* 7. NOTIFICATIONS TAB */}
        {activeTab === "notifications" && (
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="h-4 w-4 text-monologg-red" /> Notification History (Sanitized)
            </h3>
            <p className="text-xs text-gray-400">
              Only notification kind, delivery time, and read state are displayed. OTP and sign-in
              notice payloads are strictly excluded.
            </p>

            {notifications.length === 0 ? (
              <p className="text-xs text-gray-400 py-3">No notifications dispatched.</p>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-[#222222] bg-gray-50/50 dark:bg-[#181818] text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-medium text-gray-900 dark:text-white">
                        {n.kind}
                      </span>
                      {n.isRead ? (
                        <span className="text-[10px] text-green-600 bg-green-50 dark:bg-green-950/30 px-1.5 py-0.5 rounded">
                          Read
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">
                          Unread
                        </span>
                      )}
                    </div>
                    <span className="text-gray-400 text-[11px]">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* 8. ACTIVITY TIMELINE TAB */}
        {activeTab === "activity" && (
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-monologg-red" /> Product Event Timeline (Newest First)
            </h3>
            {activity.length === 0 ? (
              <p className="text-xs text-gray-400 py-3">No telemetry events logged for this user.</p>
            ) : (
              <div className="space-y-2.5">
                {activity.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-[#222222] bg-gray-50/50 dark:bg-[#181818] text-xs gap-2"
                  >
                    <div>
                      <span className="font-mono font-semibold text-gray-900 dark:text-white">
                        {ev.name}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                        <span>Source: {ev.source}</span>
                        {ev.country && <span>Country: {ev.country}</span>}
                        {ev.deviceClass && <span>Device: {ev.deviceClass}</span>}
                        {ev.path && <span>Path: {ev.path}</span>}
                      </div>
                    </div>
                    <span className="text-gray-400 text-[11px] font-mono shrink-0">
                      {new Date(ev.occurredAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* 9. SUPPORT & DISPUTES TAB */}
        {activeTab === "support" && (
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-monologg-red" /> Support Tickets ({support.tickets.length})
              </h3>
              <button
                onClick={() => setIsTicketDialogOpen(true)}
                className="rounded-lg bg-monologg-red px-3 py-1.5 text-xs font-semibold text-white hover:bg-monologg-red/90"
              >
                + New Ticket on Behalf
              </button>
            </div>

            {support.tickets.length === 0 ? (
              <p className="text-xs text-gray-400 py-3">No support tickets on record.</p>
            ) : (
              <div className="space-y-3">
                {support.tickets.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl border border-gray-100 dark:border-[#222222] bg-gray-50/50 dark:bg-[#181818] p-4 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 dark:text-white text-sm">
                        {t.subject}
                      </span>
                      <span className="rounded bg-gray-200 dark:bg-[#242424] px-2 py-0.5 font-mono text-[10px]">
                        {t.status}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{t.message}</p>
                    <span className="text-gray-400 text-[11px] block">
                      Opened: {new Date(t.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* 10. AUTH & SECURITY TAB */}
        {activeTab === "auth" && (
          <div className="space-y-6">
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-monologg-red" /> Identity & Active Sessions
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-[#202020]">
                  <span className="text-gray-500">Auth Provider</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{auth.authProvider}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-[#202020]">
                  <span className="text-gray-500">Supabase User UUID</span>
                  <span className="font-mono text-gray-800 dark:text-gray-200">
                    {auth.supabaseUserId || "None (Legacy Email Auth)"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-500">Active Refresh Sessions</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-green-600">{auth.activeSessionCount}</span>
                    {auth.activeSessionCount > 0 && (
                      <button
                        onClick={handleRevokeSessions}
                        className="text-xs text-red-500 hover:underline font-medium"
                      >
                        (Revoke All)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Auth Event Audit Trail ({auth.authEvents.length})
              </h3>
              {auth.authEvents.length === 0 ? (
                <p className="text-xs text-gray-400 py-3">No authentication events recorded.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHead>Event</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>IP Hash</TableHead>
                      <TableHead>Time</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {auth.authEvents.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs">{a.event}</TableCell>
                        <TableCell className="text-xs">{a.provider}</TableCell>
                        <TableCell className="font-mono text-xs text-gray-400">
                          {a.ipHash ? `${a.ipHash.slice(0, 12)}...` : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {new Date(a.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Reveal PII Dialog */}
      <Dialog
        open={isRevealDialogOpen}
        onClose={() => setIsRevealDialogOpen(false)}
        title="Audited PII & Sensitive Attributes Reveal"
        description="Accessing unmasked personal identifiable information requires an explicit, audited reason. Your action, admin ID, IP, and reason will be immutably recorded in the Admin Audit Log."
      >
        <form onSubmit={handleReveal} className="space-y-4">
          {revealError && (
            <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 rounded-xl">
              {revealError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Reason for Reveal (Mandatory)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Investigating dispute #DISP-998, user verification compliance audit"
              value={revealReason}
              onChange={(e) => setRevealReason(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-gray-50/50 dark:bg-[#181818] px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-monologg-red focus:outline-none focus:ring-1 focus:ring-monologg-red"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsRevealDialogOpen(false)}
              className="rounded-xl border border-gray-200 dark:border-[#2A2A2A] px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1E1E1E]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingReveal || !revealReason.trim()}
              className="rounded-xl bg-monologg-red px-4 py-2 text-xs font-semibold text-white hover:bg-monologg-red/90 disabled:opacity-50"
            >
              {isSubmittingReveal ? "Revealing..." : "Confirm & Reveal"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Add Staff Note Dialog */}
      <Dialog
        open={isNoteDialogOpen}
        onClose={() => setIsNoteDialogOpen(false)}
        title="Add Internal Staff Note"
        description="Notes are internal to the admin team and are NEVER visible to the user."
      >
        <form onSubmit={handleAddNote} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Note Body
            </label>
            <textarea
              required
              rows={4}
              placeholder="Record moderation notes, customer support context, or dispute findings..."
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-gray-50/50 dark:bg-[#181818] px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-monologg-red focus:outline-none focus:ring-1 focus:ring-monologg-red"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsNoteDialogOpen(false)}
              className="rounded-xl border border-gray-200 dark:border-[#2A2A2A] px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1E1E1E]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingNote || !noteBody.trim()}
              className="rounded-xl bg-monologg-red px-4 py-2 text-xs font-semibold text-white hover:bg-monologg-red/90 disabled:opacity-50"
            >
              {isSubmittingNote ? "Saving..." : "Save Note"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Suspend User Dialog */}
      <Dialog
        open={isSuspendDialogOpen}
        onClose={() => setIsSuspendDialogOpen(false)}
        title="Suspend User Account"
        description="Suspending a user blocks them from signing in or calling the API, immediately revokes all active sessions, and writes an audit row."
      >
        <form onSubmit={handleSuspendToggle} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Suspension Reason (Mandatory)
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Terms violation, fraudulent chargeback activity, compliance review failure"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-gray-50/50 dark:bg-[#181818] px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-monologg-red focus:outline-none focus:ring-1 focus:ring-monologg-red"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsSuspendDialogOpen(false)}
              className="rounded-xl border border-gray-200 dark:border-[#2A2A2A] px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1E1E1E]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingSuspend || !suspendReason.trim()}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmittingSuspend ? "Suspending..." : "Confirm Suspension"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Create Support Ticket Dialog */}
      <Dialog
        open={isTicketDialogOpen}
        onClose={() => setIsTicketDialogOpen(false)}
        title="Create Support Ticket on Behalf"
        description="Submit a complaint or inquiry on behalf of this user (e.g. reported via WhatsApp, email, or telephone)."
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Subject
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Inbound inquiry regarding escrow payout delay"
              value={ticketSubject}
              onChange={(e) => setTicketSubject(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-gray-50/50 dark:bg-[#181818] px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-monologg-red focus:outline-none focus:ring-1 focus:ring-monologg-red"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Message Details
            </label>
            <textarea
              required
              rows={4}
              placeholder="Details of the complaint or issue reported by the user..."
              value={ticketMessage}
              onChange={(e) => setTicketMessage(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-gray-50/50 dark:bg-[#181818] px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-monologg-red focus:outline-none focus:ring-1 focus:ring-monologg-red"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsTicketDialogOpen(false)}
              className="rounded-xl border border-gray-200 dark:border-[#2A2A2A] px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1E1E1E]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingTicket || !ticketSubject.trim() || !ticketMessage.trim()}
              className="rounded-xl bg-monologg-red px-4 py-2 text-xs font-semibold text-white hover:bg-monologg-red/90 disabled:opacity-50"
            >
              {isSubmittingTicket ? "Creating..." : "Create Ticket"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Media Preview Modal */}
      {previewMediaUrl && (
        <Dialog
          open={Boolean(previewMediaUrl)}
          onClose={() => setPreviewMediaUrl(null)}
          title="Media Preview (5-minute Signed URL)"
          description="Access to this media preview was recorded as MEDIA_VIEWED in the audit trail."
        >
          <div className="space-y-4">
            <div className="aspect-video w-full rounded-xl bg-black flex items-center justify-center overflow-hidden">
              <video src={previewMediaUrl} controls autoPlay className="h-full w-full object-contain" />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setPreviewMediaUrl(null)}
                className="rounded-xl bg-gray-100 dark:bg-[#202020] px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
