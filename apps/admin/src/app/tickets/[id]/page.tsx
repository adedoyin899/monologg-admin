"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  adminClient,
  type TicketDetailResponse,
  type TicketMessageItem,
  type CannedReplyItem,
} from "@/lib/admin-client";
import { Dialog } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  ChevronLeft,
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Shield,
  Send,
  Lock,
  MessageSquare,
  Bookmark,
  Calendar,
  ExternalLink,
  DollarSign,
  UserCheck,
  Check,
  AlertCircle,
  Sparkles,
  Command,
} from "lucide-react";

const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];
const STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_ON_USER", "RESOLVED", "CLOSED"];

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const router = useRouter();

  const [ticketData, setTicketData] = useState<TicketDetailResponse["ticket"] | null>(null);
  const [cannedReplies, setCannedReplies] = useState<CannedReplyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Composer state
  const [composerMode, setComposerMode] = useState<"reply" | "note">("reply");
  const [composerBody, setComposerBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Status / Resolve Modal state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>("RESOLVED");
  const [resolutionNote, setResolutionNote] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Assignment & Priority state
  const [assignedAdminInput, setAssignedAdminInput] = useState("");
  const [isEditingAssign, setIsEditingAssign] = useState(false);

  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);

  const loadTicket = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detailRes, cannedRes] = await Promise.all([
        adminClient.getTicket(ticketId),
        adminClient.getCannedReplies().catch(() => ({ cannedReplies: [] })),
      ]);

      setTicketData(detailRes.ticket);
      setCannedReplies(cannedRes.cannedReplies || []);
      setAssignedAdminInput(detailRes.ticket.assignedAdminId || "");
    } catch (err: any) {
      console.error("[TicketDetailPage] load error:", err);
      setError(err.message || "Failed to load support ticket");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  // Keyboard shortcut: Cmd+Enter / Ctrl+Enter to send
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (composerBody.trim() && !sendingMessage) {
          handleSendMessage();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [composerBody, sendingMessage, composerMode]);

  const handleSendMessage = async () => {
    if (!composerBody.trim() || sendingMessage || !ticketData) return;

    setSendingMessage(true);
    try {
      if (composerMode === "reply") {
        await adminClient.replyTicket(ticketId, composerBody.trim());
      } else {
        await adminClient.addTicketNote(ticketId, composerBody.trim());
      }
      setComposerBody("");
      await loadTicket();
    } catch (err: any) {
      alert(err.message || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleApplyCannedReply = (reply: CannedReplyItem) => {
    setComposerBody((prev) => (prev ? `${prev}\n\n${reply.body}` : reply.body));
    if (composerTextareaRef.current) {
      composerTextareaRef.current.focus();
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === "RESOLVED" || newStatus === "CLOSED") {
      setTargetStatus(newStatus);
      setShowResolveModal(true);
      return;
    }

    try {
      await adminClient.updateTicketStatus(ticketId, newStatus);
      await loadTicket();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const handleConfirmResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingStatus(true);
    try {
      await adminClient.updateTicketStatus(ticketId, targetStatus, resolutionNote.trim());
      setShowResolveModal(false);
      setResolutionNote("");
      await loadTicket();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    try {
      await adminClient.updateTicketPriority(ticketId, newPriority);
      await loadTicket();
    } catch (err: any) {
      alert(err.message || "Failed to update priority");
    }
  };

  const handleAssignSave = async () => {
    try {
      await adminClient.assignTicket(ticketId, assignedAdminInput.trim() || null);
      setIsEditingAssign(false);
      await loadTicket();
    } catch (err: any) {
      alert(err.message || "Failed to assign ticket");
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !ticketData) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Ticket Not Found</h2>
        <p className="text-sm text-zinc-500">{error || "The requested ticket could not be found."}</p>
        <Link
          href="/tickets"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold hover:bg-zinc-200"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Support Inbox
        </Link>
      </div>
    );
  }

  const isResolvedOrClosed = ticketData.status === "RESOLVED" || ticketData.status === "CLOSED";

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/tickets"
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                {ticketData.number}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                {ticketData.category}
              </span>
              <span className="text-xs text-zinc-400">· Source: {ticketData.source}</span>
            </div>
            <h1 className="text-xl font-bold font-display text-zinc-900 dark:text-zinc-100 mt-0.5 line-clamp-1">
              {ticketData.subject}
            </h1>
          </div>
        </div>

        {/* Action Pickers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority selector */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-500">Priority:</span>
            <select
              value={ticketData.priority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className="h-8 px-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Status selector */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-500">Status:</span>
            <select
              value={ticketData.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="h-8 px-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Thread (Left 2 cols) & Context Rail (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Conversation Thread & Composer */}
        <div className="lg:col-span-2 space-y-4">
          {/* SLA Strip Banner */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
              ticketData.isBreached
                ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 font-bold"
                : isResolvedOrClosed
                  ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                  : ticketData.firstResponseAt
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400 font-medium"
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0" />
              <span>
                {ticketData.isBreached
                  ? "SLA BREACH DETECTED: First response window elapsed without staff action."
                  : ticketData.firstResponseAt
                    ? `SLA Complied: First response recorded ${new Date(ticketData.firstResponseAt).toLocaleTimeString()}`
                    : `SLA Clock: Due at ${new Date(ticketData.slaDueAt).toLocaleTimeString()}`}
              </span>
            </div>

            {ticketData.timeToFirstResponseMs != null && (
              <span className="text-[11px] opacity-80">
                1st response: {Math.round(ticketData.timeToFirstResponseMs / (60 * 1000))}m
              </span>
            )}
          </div>

          {/* Messages Thread Container */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {/* Initial Ticket Problem Statement */}
            <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/40">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center font-bold text-xs">
                    {(ticketData.user?.name || "U")[0]}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {ticketData.user?.name || ticketData.reporterEmail || "User"}
                    </span>
                    <span className="text-[11px] text-zinc-500 ml-1.5 font-mono">
                      (Initial Complaint)
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-zinc-400">
                  {new Date(ticketData.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap pl-9">
                {ticketData.message}
              </p>
            </div>

            {/* Conversation Messages */}
            {ticketData.messages && ticketData.messages.length > 0 ? (
              ticketData.messages.map((msg: TicketMessageItem) => {
                const isAdmin = msg.authorType === "ADMIN" || msg.senderRole === "ADMIN";
                const isInternalNote = msg.isInternal;

                if (isInternalNote) {
                  return (
                    <div
                      key={msg.id}
                      className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border-l-4 border-amber-500"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-800 dark:text-amber-300">
                            <Lock className="w-3 h-3" />
                            <span>Staff Internal Note · Never shown to user</span>
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-800 dark:text-zinc-200 font-medium whitespace-pre-wrap pl-1 leading-relaxed">
                        {msg.body}
                      </p>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`p-4 ${isAdmin ? "bg-red-50/20 dark:bg-red-950/10" : ""}`}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                            isAdmin
                              ? "bg-red-600 text-white"
                              : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          {isAdmin ? "M" : (ticketData.user?.name || "U")[0]}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            {isAdmin ? "Monologg Support Team" : ticketData.user?.name || "User"}
                          </span>
                          <span className="text-[11px] text-zinc-500 ml-1.5 font-mono">
                            {isAdmin ? "(Public Reply)" : "(User Reply)"}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] text-zinc-400">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap pl-9">
                      {msg.body}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-zinc-400 italic">
                No replies posted yet.
              </div>
            )}
          </div>

          {/* Message Composer */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs space-y-3">
            {/* Mode Tabs & Canned Replies Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <button
                  type="button"
                  onClick={() => setComposerMode("reply")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    composerMode === "reply"
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                  }`}
                >
                  Public Reply (User sees this)
                </button>
                <button
                  type="button"
                  onClick={() => setComposerMode("note")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                    composerMode === "note"
                      ? "bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-amber-600"
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  <span>Internal Staff Note</span>
                </button>
              </div>

              {/* Canned Replies Dropdown */}
              {cannedReplies.length > 0 && composerMode === "reply" && (
                <div className="flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-zinc-400" />
                  <select
                    onChange={(e) => {
                      const selected = cannedReplies.find((r) => r.id === e.target.value);
                      if (selected) handleApplyCannedReply(selected);
                      e.target.value = "";
                    }}
                    defaultValue=""
                    className="h-7 px-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
                  >
                    <option value="" disabled>
                      Insert canned reply...
                    </option>
                    {cannedReplies.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Composer Textarea */}
            <div className="relative">
              <textarea
                ref={composerTextareaRef}
                value={composerBody}
                onChange={(e) => setComposerBody(e.target.value)}
                placeholder={
                  composerMode === "reply"
                    ? "Type your response to the user... (Sent via in-app & email notification)"
                    : "Add private staff notes, investigation findings, or handover instructions..."
                }
                rows={4}
                className={`w-full p-3 rounded-lg border text-xs focus:outline-none resize-none transition-colors ${
                  composerMode === "note"
                    ? "bg-amber-50/20 border-amber-300 dark:border-amber-800/60 text-zinc-900 dark:text-zinc-100 placeholder:text-amber-700/50"
                    : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-red-500"
                }`}
              />
            </div>

            {/* Composer Footer & Shortcuts hint */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono border border-zinc-200 dark:border-zinc-700">
                  ⌘ + Enter
                </kbd>
                <span>to send</span>
              </div>

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!composerBody.trim() || sendingMessage}
                className={`h-9 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 ${
                  composerMode === "note"
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                {sendingMessage ? (
                  <span>Sending...</span>
                ) : composerMode === "note" ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Save Internal Note</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Reply</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Context Rail */}
        <div className="space-y-4">
          {/* User Profile Card */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Requester
              </span>
              {ticketData.userId && (
                <Link
                  href={`/users/${ticketData.userId}`}
                  className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                >
                  <span>User 360</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-[11px] text-zinc-400 block">Name</span>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                  {ticketData.user?.name || "User"}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-zinc-400 block">Email</span>
                <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300 block truncate">
                  {ticketData.user?.email || ticketData.reporterEmail || "—"}
                </span>
              </div>

              {ticketData.user?.phone && (
                <div>
                  <span className="text-[11px] text-zinc-400 block">Phone</span>
                  <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300 block">
                    {ticketData.user.phone}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-[11px] text-zinc-400 block">Account Type</span>
                  <span className="text-xs font-mono font-medium text-zinc-800 dark:text-zinc-200">
                    {ticketData.user?.userType || "USER"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400 block text-right">Verification</span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {ticketData.user?.verification || "UNVERIFIED"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Staff Card */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Assignment
              </span>
              {!isEditingAssign && (
                <button
                  type="button"
                  onClick={() => setIsEditingAssign(true)}
                  className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                >
                  Change
                </button>
              )}
            </div>

            {isEditingAssign ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={assignedAdminInput}
                  onChange={(e) => setAssignedAdminInput(e.target.value)}
                  placeholder="Admin user ID (or leave blank to unassign)"
                  className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsEditingAssign(false)}
                    className="px-2.5 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAssignSave}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-red-600 text-white"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-zinc-400" />
                <span className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">
                  {ticketData.assignedAdmin
                    ? ticketData.assignedAdmin.email
                    : "Unassigned"}
                </span>
              </div>
            )}
          </div>

          {/* Linked Booking Card (if present) */}
          {ticketData.linkedBooking && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Linked Booking
                </span>
                <Link
                  href={`/bookings/${ticketData.bookingId}`}
                  className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                >
                  <span>View</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-mono">
                    ID: {ticketData.linkedBooking.id.slice(-8)}
                  </span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400 font-mono">
                    {ticketData.linkedBooking.state}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Performer</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {ticketData.linkedBooking.talentName}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Client</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {ticketData.linkedBooking.clientName}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800 font-mono">
                  <span className="text-zinc-500">Amount</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {ticketData.linkedBooking.currency}{" "}
                    {(ticketData.linkedBooking.baseAmount / 100).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Resolution Details Card (if resolved) */}
          {ticketData.resolutionNote && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 shadow-xs space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>Resolution Note</span>
              </span>
              <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
                {ticketData.resolutionNote}
              </p>
              {ticketData.resolvedAt && (
                <span className="text-[10px] text-zinc-400 block pt-1 font-mono">
                  Resolved: {new Date(ticketData.resolvedAt).toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Resolution Note Modal */}
      <Dialog
        open={showResolveModal}
        onClose={() => setShowResolveModal(false)}
        title={`Close / Resolve Ticket (${targetStatus})`}
        description="Provide a clear resolution note for audit logging and record keeping."
      >
        <form onSubmit={handleConfirmResolve} className="space-y-4 mt-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-zinc-700 dark:text-zinc-300">
              Resolution Note *
            </label>
            <textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="e.g. Escrow manually released after counterparty confirmation..."
              required
              rows={4}
              className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowResolveModal(false)}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingStatus || !resolutionNote.trim()}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
            >
              {updatingStatus ? "Saving..." : "Confirm & Resolve"}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
