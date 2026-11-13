"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  adminClient,
  type DisputeDetailResponse,
  type DisputeChatReviewResponse,
} from "@/lib/admin-client";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  FileQuestion,
  FileText,
  Lock,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  User,
  ExternalLink,
  RotateCcw,
} from "lucide-react";

export default function DisputeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const disputeId = params.id as string;

  const [data, setData] = useState<DisputeDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chat Review Modal
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatReason, setChatReason] = useState("");
  const [chatData, setChatData] = useState<DisputeChatReviewResponse | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Request Evidence Modal
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceParty, setEvidenceParty] = useState<"TALENT" | "CLIENT">("CLIENT");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceSubmitting, setEvidenceSubmitting] = useState(false);

  // Resolve Modal
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionType, setResolutionType] = useState<"RELEASE_TO_TALENT" | "REFUND_CLIENT" | "SPLIT">("RELEASE_TO_TALENT");
  const [resolutionNote, setResolutionNote] = useState("");
  const [splitTalentPct, setSplitTalentPct] = useState(50);
  const [resolveSubmitting, setResolveSubmitting] = useState(false);
  const [resolveSuccessMsg, setResolveSuccessMsg] = useState<string | null>(null);

  const fetchDispute = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminClient.getDispute(disputeId);
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load dispute details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispute();
  }, [disputeId]);

  const handleReviewChat = async () => {
    if (!chatReason.trim() || chatReason.trim().length < 5) {
      setChatError("A valid justification reason (at least 5 characters) is required.");
      return;
    }
    setChatLoading(true);
    setChatError(null);
    try {
      const res = await adminClient.reviewDisputeChat(disputeId, chatReason.trim());
      setChatData(res);
    } catch (err: any) {
      setChatError(err.message || "Failed to access conversation messages");
    } finally {
      setChatLoading(false);
    }
  };

  const handleRequestEvidence = async () => {
    if (!evidenceNote.trim()) return;
    setEvidenceSubmitting(true);
    try {
      await adminClient.requestDisputeEvidence(disputeId, {
        targetParty: evidenceParty,
        note: evidenceNote.trim(),
      });
      setShowEvidenceModal(false);
      setEvidenceNote("");
      fetchDispute();
    } catch (err: any) {
      alert(err.message || "Failed to request evidence");
    } finally {
      setEvidenceSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!resolutionNote.trim()) return;
    setResolveSubmitting(true);
    try {
      const idempotencyKey = `resolve-${disputeId}-${Date.now()}`;
      const res = await adminClient.resolveDispute(
        disputeId,
        {
          resolution: resolutionType,
          resolutionNote: resolutionNote.trim(),
          splitTalentPct: resolutionType === "SPLIT" ? splitTalentPct : undefined,
        },
        idempotencyKey,
      );
      if (res.requiresApproval) {
        setResolveSuccessMsg(res.message || "Resolution proposed. Awaiting second approval.");
      } else {
        setResolveSuccessMsg(res.message || "Dispute resolved successfully.");
      }
      setShowResolveModal(false);
      fetchDispute();
    } catch (err: any) {
      alert(err.message || "Failed to resolve dispute");
    } finally {
      setResolveSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm("Confirm second approval for this dispute resolution? This will execute fund release/refund.")) {
      return;
    }
    setResolveSubmitting(true);
    try {
      const idempotencyKey = `approve-${disputeId}-${Date.now()}`;
      await adminClient.approveDispute(disputeId, { resolutionNote: "Approved by second administrator" }, idempotencyKey);
      setResolveSuccessMsg("Resolution approved and executed successfully.");
      fetchDispute();
    } catch (err: any) {
      alert(err.message || "Failed to approve dispute resolution");
    } finally {
      setResolveSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-zinc-400">
        Loading dispute details…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-4">
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error || "Dispute not found"}</span>
        </div>
        <Link
          href="/disputes"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Disputes Queue
        </Link>
      </div>
    );
  }

  const { dispute, booking, deliveryFiles, timeline, linkedTickets } = data;
  const isResolved = dispute.status === "RESOLVED";
  const fourEyes = dispute.fourEyes;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <Link
            href="/disputes"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors mb-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Disputes
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 font-mono">
              Dispute {dispute.id}
            </h1>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                dispute.status === "RESOLVED"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200"
                  : dispute.status === "AWAITING_EVIDENCE"
                  ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900"
              }`}
            >
              {dispute.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setShowChatModal(true);
              setChatData(null);
              setChatError(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer shadow-2xs"
          >
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span>Review Conversation</span>
          </button>

          {!isResolved && (
            <>
              <button
                onClick={() => setShowEvidenceModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer shadow-2xs"
              >
                <FileQuestion className="w-3.5 h-3.5 text-blue-500" />
                <span>Request Evidence</span>
              </button>

              {fourEyes.required && fourEyes.resolvedByAdminId && !fourEyes.approvedByAdminId ? (
                <button
                  onClick={handleApprove}
                  disabled={resolveSubmitting}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white transition-colors cursor-pointer shadow-2xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Approve Resolution (Four-Eyes)</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowResolveModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-monologg-red hover:bg-monologg-red/90 text-white transition-colors cursor-pointer shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Resolve Dispute</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {resolveSuccessMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{resolveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setResolveSuccessMsg(null)}
            className="text-xs font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Four-Eyes Governance Alert Banner */}
      {fourEyes.required && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm">
                Four-Eyes Governance Gate Active
              </div>
              <p className="mt-0.5 text-amber-900 dark:text-amber-300">
                Booking value exceeds the threshold (
                {booking?.currency} {(fourEyes.thresholdMinor / 100).toLocaleString()}). Resolution requires a written note and approval by two separate administrators before execution.
              </p>
              {fourEyes.resolvedByAdminId && (
                <div className="mt-2 text-[11px] font-mono text-amber-900 dark:text-amber-200">
                  Proposed by Admin: {fourEyes.resolvedByAdminId}
                  {fourEyes.approvedByAdminId && ` · Approved by Admin: ${fourEyes.approvedByAdminId}`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Layout: Evidence Panel (Left) & Context Rail (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Evidence Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Opener Statement Card */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Dispute Statement & Reason
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                Opened by {dispute.openedByRole}
              </span>
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                Reason: {dispute.reason.replace(/_/g, " ")}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
                {dispute.description}
              </p>
            </div>
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400 tabular-nums">
              Opened: {new Date(dispute.openedAt).toLocaleString()}
              {dispute.isOverdue && !isResolved && (
                <span className="ml-2 font-semibold text-red-700 dark:text-red-400">
                  (Overdue &gt; 3 days)
                </span>
              )}
            </div>
          </div>

          {/* Deliverables & Uploaded Files */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Delivery Files &amp; Evidence ({deliveryFiles.length})
            </h2>
            {deliveryFiles.length === 0 ? (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 py-3">
                No deliverable files uploaded in the order room.
              </p>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {deliveryFiles.map((f) => (
                  <div key={f.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{f.content}</div>
                      <div className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5 tabular-nums">
                        Uploaded: {new Date(f.createdAt).toLocaleString()} · Sender: {f.senderId}
                      </div>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono shrink-0">
                      DOCUMENT
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* State Timeline */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              Dispute &amp; Booking Timeline
            </h2>
            <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800 pl-6">
              {timeline.map((t, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-6 top-1.5 w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600 border-2 border-white dark:border-zinc-900" />
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {t.title}
                    </span>
                    <span className="text-[11px] text-zinc-600 dark:text-zinc-400 tabular-nums">
                      {new Date(t.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                    {t.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Facts & Linked Context Rail */}
        <div className="space-y-6">
          {/* Booking & Financial Facts */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Booking Facts
            </h2>
            {booking ? (
              <div className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex justify-between">
                  <span>Booking ID:</span>
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="font-mono text-zinc-900 dark:text-zinc-100 underline hover:text-red-500"
                  >
                    {booking.id.slice(0, 10)}…
                  </Link>
                </div>
                <div className="flex justify-between">
                  <span>State:</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {booking.state}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Talent:</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {booking.creator?.name || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Client:</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {booking.client?.name || booking.client?.orgName || "N/A"}
                  </span>
                </div>

                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2.5 space-y-1.5">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Stored Fee Breakdown
                  </div>
                  <div className="flex justify-between">
                    <span>Base Amount:</span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">
                      {booking.currency} {(booking.baseAmount / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Talent Fee:</span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">
                      {booking.currency} {(booking.talentFeeAmount / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Client Fee:</span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">
                      {booking.currency} {(booking.clientFeeAmount / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 italic mt-1">
                    Fee breakdown equals stored amounts from booking creation.
                  </div>
                </div>

                {booking.payment && (
                  <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2.5 space-y-1.5">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                      Payment Escrow Status
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {booking.payment.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Provider:</span>
                      <span className="capitalize">{booking.payment.provider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Escrow Locked:</span>
                      <span>{booking.payment.escrowHeld ? "Yes (Held)" : "No"}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 dark:text-zinc-400">No booking details available.</p>
            )}
          </div>

          {/* Linked Support Tickets */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Linked Tickets ({linkedTickets.length})
            </h2>
            {linkedTickets.length === 0 ? (
              <p className="text-xs text-zinc-600 dark:text-zinc-400">No linked support tickets.</p>
            ) : (
              <div className="space-y-2">
                {linkedTickets.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tickets/${t.id}`}
                    className="block p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        MNL-{t.number}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold">
                        {t.status}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 line-clamp-1">
                      {t.subject}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Chat Review Modal (Audited CHAT_VIEWED) ────────────────────────── */}
      {showChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Review Conversation Messages
                </h3>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="text-xs text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                Close
              </button>
            </div>

            {!chatData ? (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-200">
                  <div className="font-semibold mb-0.5">Audited Private Data Access</div>
                  Order room messages are confidential. Accessing this conversation is logged under your admin identity as <code>CHAT_VIEWED</code> in the permanent audit trail.
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Justification Reason (Required, min 5 chars)
                  </label>
                  <textarea
                    value={chatReason}
                    onChange={(e) => setChatReason(e.target.value)}
                    placeholder="e.g., Investigating non-delivery dispute claims for Booking..."
                    rows={3}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                {chatError && (
                  <div className="text-xs text-red-600 dark:text-red-400">{chatError}</div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowChatModal(false)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReviewChat}
                    disabled={chatLoading}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs"
                  >
                    {chatLoading ? "Verifying…" : "Reveal Messages"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 overflow-hidden flex flex-col flex-1">
                {/* Mandatory PRD M8 Banner */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 rounded-xl text-xs font-medium shrink-0">
                  {chatData.banner}
                </div>

                {/* Message Log */}
                <div className="overflow-y-auto flex-1 divide-y divide-zinc-100 dark:divide-zinc-800 pr-1 space-y-2">
                  {chatData.messages.length === 0 ? (
                    <p className="text-xs text-zinc-400 text-center py-8">
                      No messages recorded in this order room.
                    </p>
                  ) : (
                    chatData.messages.map((m) => (
                      <div key={m.id} className="pt-2 text-xs">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                          <span className="font-mono text-zinc-700 dark:text-zinc-300 font-semibold">
                            Sender: {m.senderId}
                          </span>
                          <span>{new Date(m.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200">
                          {m.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Request Evidence Modal ────────────────────────────────────────── */}
      {showEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Request Evidence from Participant
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Sets status to AWAITING_EVIDENCE and notifies the selected party in-app and by email.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Target Participant
                </label>
                <select
                  value={evidenceParty}
                  onChange={(e) => setEvidenceParty(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="CLIENT">Client ({booking?.client?.name || "Client"})</option>
                  <option value="TALENT">Talent ({booking?.creator?.name || "Talent"})</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Requested Information / Note
                </label>
                <textarea
                  value={evidenceNote}
                  onChange={(e) => setEvidenceNote(e.target.value)}
                  placeholder="Specify the requested files, proof of attendance, or deliverables..."
                  rows={4}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestEvidence}
                disabled={!evidenceNote.trim() || evidenceSubmitting}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white cursor-pointer shadow-xs"
              >
                {evidenceSubmitting ? "Sending…" : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resolve Dispute Modal ─────────────────────────────────────────── */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Resolve Dispute
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Executes payout release or refund through PaymentProvider. Closes linked ticket and notifies both parties.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Resolution Decision
                </label>
                <select
                  value={resolutionType}
                  onChange={(e) => setResolutionType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
                >
                  <option value="RELEASE_TO_TALENT">Release Escrow to Talent</option>
                  <option value="REFUND_CLIENT">Refund Escrow to Client</option>
                  <option value="SPLIT">Split Escrow (Manual Settlement)</option>
                </select>
              </div>

              {resolutionType === "SPLIT" && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                  <div className="font-semibold mb-0.5">Manual Settlement Required</div>
                  PaymentProvider does not support automated partial split. This decision will be recorded with your split percentages for offline processing.
                  <div className="mt-2">
                    <label className="block text-[11px] font-medium mb-1">
                      Talent Share: {splitTalentPct}% / Client Share: {100 - splitTalentPct}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={splitTalentPct}
                      onChange={(e) => setSplitTalentPct(Number(e.target.value))}
                      className="w-full accent-amber-600"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Written Resolution Note (Mandatory)
                </label>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Detail the mediation findings and grounds for this decision..."
                  rows={4}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolutionNote.trim() || resolveSubmitting}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white cursor-pointer shadow-xs"
              >
                {resolveSubmitting ? "Executing…" : "Execute Resolution"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
