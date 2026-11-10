import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, Check, Upload, User } from "lucide-react";
import { apiClient, type VerificationRecordingStatus } from "../../lib/api-client";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

// features.md Phase 12A.2 — verification video. X3: entirely separate from
// identity KYC (CreatorOnboarding.tsx's "Thespian AI"/Verified-badge flow) —
// this is a performance/presentation review, never identity, and never
// touches that screen's state.
//
// Upload-based, not a live in-browser recorder: the browser MediaRecorder API
// produces WebM/VP8 by default, not MP4 — the server-authoritative duration
// check (services/verificationRecording.ts) parses real MP4 `moov/mvhd`
// boxes, so a live recorder would need client-side transcoding to MP4 (e.g.
// ffmpeg.wasm) to produce a file the backend can even read. That's a real,
// separate undertaking disproportionate to this phase — flagged here rather
// than silently building a recorder that produces files the backend rejects.
// The pre-record checklist and framing guidance the spec asks for are real
// either way: an upload of an existing MP4 (e.g. recorded on a phone camera)
// is a legitimate, common shape for this kind of flow.

const CHECKLIST = [
  "Waist-up framing — head and hands both in view",
  "Face and hands clearly visible, good lighting",
  "Natural gestures, speaking as you normally would",
  "Maximum 90 seconds",
];

const STATUS_META: Record<VerificationRecordingStatus["status"], { label: string; tone: "success" | "accent" | "error" | "warning" | "neutral" }> = {
  UPLOADED: { label: "Uploaded", tone: "neutral" },
  IN_REVIEW: { label: "In Review", tone: "accent" },
  APPROVED: { label: "Approved", tone: "success" },
  NEEDS_RERECORD: { label: "Needs re-record", tone: "error" },
};

export function VerificationVideo() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationRecordingStatus | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [acking, setAcking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiClient.getVerificationRecordingStatus().then(setStatus);
  }, []);

  const s = {
    text: { color: "var(--color-text-primary)" } as React.CSSProperties,
    secondary: { color: "var(--color-text-secondary)" } as React.CSSProperties,
    tertiary: { color: "var(--color-text-tertiary)" } as React.CSSProperties,
    surface: { background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)" } as React.CSSProperties,
  };

  const handleAcknowledge = async () => {
    setAcking(true);
    try {
      await apiClient.acknowledgeVerificationGuidelines();
      setAcknowledged(true);
    } finally {
      setAcking(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      setStatus(await apiClient.uploadVerificationRecording(file));
      setAcknowledged(false); // the ack flag is consumed server-side on a successful upload
    } catch (err) {
      // A > 90s rejection surfaces here — clear message + the same re-record
      // CTA (the upload button itself, nothing separate needed) per spec.
      setError(err instanceof Error ? err.message : "Upload failed — please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)] font-body">
      {/* Sticky Top Header */}
      <div className="h-16 flex items-center justify-between px-5 md:px-8 sticky top-0 z-40 backdrop-blur-xl bg-[var(--color-bg-glass)] border-b border-[var(--color-hairline)] shadow-sm">
        <div className="flex items-center gap-3">
          <button
            aria-label="Go back"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--color-hairline)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-base font-bold font-display text-[var(--color-text-primary)]">
            Verification &amp; Performance Review Video
          </div>
        </div>

        {status && (
          <Badge tone={STATUS_META[status.status].tone}>
            {STATUS_META[status.status].label}
          </Badge>
        )}
      </div>

      <div className="flex-1 px-4 sm:px-6 py-8 max-w-2xl mx-auto w-full space-y-6">
        {/* Verification Status Banner */}
        <div className="p-6 rounded-[24px] bg-[#16161A] text-white border border-[#26262E] shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F13030]/20 text-[#FF4D4D] flex items-center justify-center border border-[#F13030]/30">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#F5F5F0]">Performance Verification</h3>
                <p className="text-xs text-[#A6A6B0]">90-second waist-up introduction video for casting directors.</p>
              </div>
            </div>
            {status && (
              <span className="px-3 py-1 rounded-full bg-[#FFECEC] text-[#F13030] dark:bg-[#F13030]/20 dark:text-[#FF4D4D] text-xs font-bold font-mono">
                {status.status}
              </span>
            )}
          </div>
        </div>

        {/* Framing overlay guide — a static viewfinder mockup, not a live camera
            preview (see the file-level docstring for why this is upload-based). */}
        <div
          className="aspect-[3/4] rounded-[var(--radius-xl)] relative overflow-hidden flex items-center justify-center"
          style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-hairline)" }}
        >
          <User className="w-16 h-16 opacity-20" style={s.text} />
          {/* Waist-up framing guide lines, translucent per spec. */}
          <div className="absolute inset-x-8 top-8 bottom-20 border-2 border-dashed rounded-[var(--radius-lg)]" style={{ borderColor: "var(--color-accent)", opacity: 0.4 }} />
          <div className="absolute bottom-3 left-0 right-0 text-center text-xs font-body" style={s.tertiary}>
            Frame yourself waist-up, within the guide
          </div>
        </div>

        <div className="rounded-[var(--radius-xl)] p-4 space-y-2.5" style={s.surface}>
          <div className="text-sm font-semibold font-body mb-1" style={s.text}>Before you upload</div>
          {CHECKLIST.map((item) => (
            <div key={item} className="flex items-start gap-2.5 text-sm font-body" style={s.secondary}>
              <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--color-accent)" }} />
              {item}
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded-[var(--radius-lg)] p-3 text-sm font-body" style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}>
            {error}
          </div>
        )}

        {!acknowledged ? (
          <Button className="w-full h-12" onClick={handleAcknowledge} disabled={acking}>
            {acking ? "Confirming…" : "I've read the guidelines"}
          </Button>
        ) : (
          <>
            <input ref={fileInputRef} type="file" accept="video/mp4" className="hidden" onChange={handleFileSelected} />
            <Button className="w-full h-12" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="w-4 h-4" />
              {uploading ? "Uploading…" : "Upload recording (MP4, max 90s)"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
