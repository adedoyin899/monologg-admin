"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  adminClient,
  type VerificationDetailResponse,
} from "@/lib/admin-client";
import {
  ArrowLeft,
  Video,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  RotateCcw,
  UserCheck,
  FileCheck2,
  AlertCircle,
  Lock,
} from "lucide-react";

const RE_RECORD_TEMPLATES = [
  { id: "POOR_LIGHTING", label: "Poor lighting or high contrast / glare" },
  { id: "HANDS_OR_FACE_NOT_VISIBLE", label: "Face or hands not clearly visible" },
  { id: "FRAMING_NOT_WAIST_UP", label: "Framing is not waist-up" },
  { id: "EXCEEDS_DURATION", label: "Recording exceeds 90 seconds" },
  { id: "UNNATURAL_OR_STIFF", label: "Delivery is unnatural or gestures are stiff" },
  { id: "AUDIO_QUALITY_POOR", label: "Audio is unclear or muffled" },
  { id: "OTHER", label: "Other guideline mismatch" },
] as const;

export default function VerificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();

  const [detail, setDetail] = useState<VerificationDetailResponse | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [signedUrlExpiresAt, setSignedUrlExpiresAt] = useState<string | null>(null);
  const [urlSecondsRemaining, setUrlSecondsRemaining] = useState<number>(300);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Decision Modal State
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<"APPROVE" | "NEEDS_RERECORD">("APPROVE");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("POOR_LIGHTING");
  const [reviewerNote, setReviewerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionSuccess, setDecisionSuccess] = useState<string | null>(null);

  // Fetch detail and signed playback URL
  const fetchDetailAndUrl = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detailRes, signedRes] = await Promise.all([
        adminClient.getVerificationDetail(id),
        adminClient.getVerificationSignedUrl(id).catch(() => null),
      ]);

      setDetail(detailRes);
      if (signedRes) {
        setSignedUrl(signedRes.signedUrl);
        setSignedUrlExpiresAt(signedRes.expiresAt);
        const exp = new Date(signedRes.expiresAt).getTime();
        const diffSec = Math.max(0, Math.floor((exp - Date.now()) / 1000));
        setUrlSecondsRemaining(diffSec);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load verification detail");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailAndUrl();
  }, [id]);

  // Countdown timer for signed URL
  useEffect(() => {
    if (!signedUrlExpiresAt) return;
    const interval = setInterval(() => {
      const exp = new Date(signedUrlExpiresAt).getTime();
      const diffSec = Math.max(0, Math.floor((exp - Date.now()) / 1000));
      setUrlSecondsRemaining(diffSec);
    }, 1000);
    return () => clearInterval(interval);
  }, [signedUrlExpiresAt]);

  const handleRefreshSignedUrl = async () => {
    try {
      const signedRes = await adminClient.getVerificationSignedUrl(id);
      setSignedUrl(signedRes.signedUrl);
      setSignedUrlExpiresAt(signedRes.expiresAt);
      setUrlSecondsRemaining(300);
    } catch (err: any) {
      console.error("Failed to refresh signed URL:", err);
    }
  };

  const handleDecisionSubmit = async () => {
    if (decisionType === "NEEDS_RERECORD" && !selectedTemplate) {
      setDecisionError("Please select a reason template.");
      return;
    }

    setSubmitting(true);
    setDecisionError(null);

    try {
      await adminClient.submitVerificationDecision(id, {
        decision: decisionType,
        reasonTemplate: decisionType === "NEEDS_RERECORD" ? selectedTemplate : undefined,
        reviewerNote: reviewerNote.trim() || undefined,
      });

      setDecisionSuccess(
        decisionType === "APPROVE"
          ? "Recording approved successfully. In-app and email notifications dispatched."
          : "Re-record requested. Reason and guidelines dispatched to talent.",
      );
      setIsDecisionModalOpen(false);
      // Refresh detail to reflect updated status
      await fetchDetailAndUrl();
    } catch (err: any) {
      setDecisionError(err.message || "Failed to submit decision");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-zinc-500">
        Loading verification recording and generating audited playback URL...
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Link
          href="/verifications"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Queue
        </Link>
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-6 text-xs text-red-700 dark:text-red-300">
          <AlertTriangle className="w-5 h-5 text-red-500 mb-2" />
          {error || "Verification recording not found"}
        </div>
      </div>
    );
  }

  const isDurationCompliant = detail.durationSec <= 90;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/verifications"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Verifications Queue
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Review Recording #{detail.id.slice(0, 8)}
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
              AD-26 · M9
            </span>
          </div>
        </div>

        {/* Current Status Badge & SLA */}
        <div className="flex items-center gap-2">
          {detail.isOverdue && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900">
              <AlertTriangle className="w-3.5 h-3.5" />
              SLA Overdue
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${
              detail.status === "UPLOADED"
                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                : detail.status === "IN_REVIEW"
                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                : detail.status === "APPROVED"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300"
            }`}
          >
            {detail.status === "APPROVED" && <CheckCircle2 className="w-3.5 h-3.5" />}
            {detail.status === "NEEDS_RERECORD" && <XCircle className="w-3.5 h-3.5" />}
            {detail.status}
          </span>
        </div>
      </div>

      {/* Success Notification */}
      {decisionSuccess && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{decisionSuccess}</span>
          </div>
          <button
            onClick={() => setDecisionSuccess(null)}
            className="text-emerald-700 hover:underline font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Video Player + Guideline Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Video Player & Audited URL */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-black overflow-hidden shadow-sm">
            {signedUrl ? (
              <div className="relative aspect-video flex items-center justify-center bg-black">
                <video
                  src={signedUrl}
                  controls
                  playsInline
                  className="w-full h-full max-h-[480px] object-contain"
                />
              </div>
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center text-zinc-400 p-8 space-y-2">
                <Video className="w-10 h-10 text-zinc-600" />
                <p className="text-xs">Playback URL not generated or expired</p>
                <button
                  onClick={handleRefreshSignedUrl}
                  className="px-3 py-1 text-xs rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                >
                  Generate URL
                </button>
              </div>
            )}
          </div>

          {/* Signed URL Expiration & Security Banner */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                Audited signed URL:{" "}
                <span className="font-mono text-zinc-800 dark:text-zinc-200">
                  {urlSecondsRemaining > 0 ? `${urlSecondsRemaining}s remaining` : "Expired"}
                </span>
                {" "}(logged as <code className="text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">MEDIA_VIEWED</code>)
              </span>
            </div>

            <button
              onClick={handleRefreshSignedUrl}
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Refresh
            </button>
          </div>

          {/* Reviewer Note (if already decided) */}
          {detail.reviewerNote && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4 space-y-1">
              <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Stored Reviewer Note
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {detail.reviewerNote}
              </p>
            </div>
          )}

          {/* Decision Buttons (COMPLIANCE / SUPER_ADMIN) */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Compliance Review Decision
            </h3>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setDecisionType("APPROVE");
                  setReviewerNote("");
                  setIsDecisionModalOpen(true);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve Presentation
              </button>

              <button
                onClick={() => {
                  setDecisionType("NEEDS_RERECORD");
                  setSelectedTemplate("POOR_LIGHTING");
                  setReviewerNote("");
                  setIsDecisionModalOpen(true);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer shadow-sm"
              >
                <XCircle className="w-4 h-4" />
                Request Re-record
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 text-center">
              Requires COMPLIANCE or SUPER_ADMIN role. Dispatches in-app notification & templated email.
            </p>
          </div>
        </div>

        {/* Right Column: Guideline Checklist & Sanitized KYC Panel */}
        <div className="lg:col-span-5 space-y-4">
          {/* Guideline Checklist (PRD Module M9) */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-blue-500" />
                Guideline Checklist
              </h3>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                  isDurationCompliant
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300"
                }`}
              >
                {detail.durationSec}s / 90s
              </span>
            </div>

            <div className="space-y-2.5">
              {detail.guidelineChecklist.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-start gap-2.5"
                >
                  {item.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs space-y-0.5">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {item.label}
                    </div>
                    {item.hint && (
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {item.hint}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-1 text-[11px] text-zinc-400">
              Talent confirmed pre-record guidelines before video capture was unlocked.
            </div>
          </div>

          {/* Masked User Card */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-indigo-500" />
              Talent Profile Card
            </h3>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-sm text-zinc-700 dark:text-zinc-200 overflow-hidden shrink-0">
                {detail.creator.avatarUrl ? (
                  <img src={detail.creator.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  detail.creator.name.slice(0, 1)
                )}
              </div>
              <div className="text-xs space-y-0.5">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {detail.creator.name}
                </div>
                <div className="text-zinc-500">
                  {detail.creator.niche} · {detail.creator.location}
                </div>
              </div>
            </div>

            <div className="text-xs space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
              <div className="flex justify-between">
                <span>Email (Masked):</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">{detail.creator.maskedEmail}</span>
              </div>
              <div className="flex justify-between">
                <span>Phone (Masked):</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">{detail.creator.maskedPhone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Member Since:</span>
                <span>{new Date(detail.creator.userCreatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Sanitized KYC Panel (M9 / X3 Invariant) */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-500" />
                Identity KYC Status
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                X3 Invariant
              </span>
            </div>

            <div className="text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Provider:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {detail.kycPanel.provider}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Verification State:</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                    detail.kycPanel.status === "VERIFIED"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : detail.kycPanel.status === "PROCESSING"
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                      : detail.kycPanel.status === "FAILED"
                      ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {detail.kycPanel.status}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Total KYC Attempts:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {detail.kycPanel.attempts}
                </span>
              </div>

              {detail.kycPanel.failureReasonCode && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Failure Reason Code:</span>
                  <span className="font-mono text-red-600 dark:text-red-400 font-medium">
                    {detail.kycPanel.failureReasonCode}
                  </span>
                </div>
              )}

              {detail.kycPanel.lastAttemptAt && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Last Attempt:</span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {new Date(detail.kycPanel.lastAttemptAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <div className="text-[11px] text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800/60">
              Sanitized identity panel: raw provider payloads and identity documents are never exposed in this console.
            </div>
          </div>
        </div>
      </div>

      {/* Decision Modal */}
      {isDecisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {decisionType === "APPROVE" ? "Approve Presentation Recording" : "Request Recording Re-record"}
              </h3>
              <button
                onClick={() => setIsDecisionModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {decisionError && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3 text-xs text-red-700 dark:text-red-300">
                {decisionError}
              </div>
            )}

            {decisionType === "NEEDS_RERECORD" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Select Reason Template <span className="text-red-500">*</span>
                </label>
                <div className="space-y-1.5">
                  {RE_RECORD_TEMPLATES.map((tpl) => (
                    <label
                      key={tpl.id}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        selectedTemplate === tpl.id
                          ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-100"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reRecordTemplate"
                        checked={selectedTemplate === tpl.id}
                        onChange={() => setSelectedTemplate(tpl.id)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>{tpl.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Reviewer Note {decisionType === "APPROVE" ? "(Optional)" : "(Optional Additional Guidance)"}
              </label>
              <textarea
                value={reviewerNote}
                onChange={(e) => setReviewerNote(e.target.value)}
                rows={3}
                placeholder={
                  decisionType === "APPROVE"
                    ? "Optional feedback or praise for talent..."
                    : "Specific details on what needs improvement (lighting, camera distance, framing)..."
                }
                className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsDecisionModalOpen(false)}
                disabled={submitting}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDecisionSubmit}
                disabled={submitting}
                className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition-colors cursor-pointer ${
                  decisionType === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                } ${submitting ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {submitting ? "Submitting..." : decisionType === "APPROVE" ? "Confirm Approval" : "Confirm Re-record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

