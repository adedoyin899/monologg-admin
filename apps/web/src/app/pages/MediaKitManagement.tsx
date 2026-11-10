import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, FileText, RefreshCw, Upload, RotateCcw, Download, Share2 } from "lucide-react";
import { apiClient, type MediaKitStatus } from "../../lib/api-client";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { track } from "../../lib/tracker";

// PWA-20 (features.md Phase 12A.1) — new screen, Media Kit management inside
// the talent profile. Mode toggle, Regenerate, Upload/Replace/Revert, with a
// clear "Currently showing: Auto | Your upload" status per the spec.
export function MediaKitManagement() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<MediaKitStatus | null>(null);
  const [busy, setBusy] = useState<"regenerate" | "upload" | "revert" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => apiClient.getMediaKitStatus().then(setStatus);
  useEffect(() => { load(); }, []);

  const s = {
    text: { color: "var(--color-text-primary)" } as React.CSSProperties,
    secondary: { color: "var(--color-text-secondary)" } as React.CSSProperties,
    tertiary: { color: "var(--color-text-tertiary)" } as React.CSSProperties,
    surface: { background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)" } as React.CSSProperties,
  };

  const handleRegenerate = async () => {
    setBusy("regenerate");
    setError(null);
    try {
      setStatus(await apiClient.regenerateMediaKit());
    } finally {
      setBusy(null);
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file after an error
    if (!file) return;

    setBusy("upload");
    setError(null);
    try {
      setStatus(await apiClient.uploadMediaKit(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed — please try a different PDF.");
    } finally {
      setBusy(null);
    }
  };

  const handleRevert = async () => {
    setBusy("revert");
    setError(null);
    try {
      setStatus(await apiClient.revertMediaKitToAuto());
    } finally {
      setBusy(null);
    }
  };

  const [copiedLink, setCopiedLink] = useState(false);

  const handleDownload = () => {
    const kitUrl = status ? apiClient.getMediaKitPublicUrl(status.creatorId) : "#";
    const link = document.createElement("a");
    link.href = kitUrl;
    link.download = `MediaKit_${status?.creatorId || "Performer"}.pdf`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    track("media_kit_link_copied", { surface: "media_kit" });
    const url = window.location.origin + (status ? apiClient.getMediaKitPublicUrl(status.creatorId) : "/media-kit");
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)] font-body">
      {/* Sticky Fixed Top Header */}
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
            Media Kit &amp; Rate Cards
          </div>
        </div>

        {status && (
          <Badge tone={status.mode === "UPLOAD" ? "accent" : "success"}>
            Showing {status.mode === "UPLOAD" ? "Uploaded PDF" : "Auto-Generated Kit"}
          </Badge>
        )}
      </div>

      <div className="flex-1 px-4 sm:px-6 py-8 max-w-2xl mx-auto w-full space-y-6">
        {/* Status Card */}
        <div className="p-6 rounded-[24px] bg-[#16161A] text-white border border-[#26262E] shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F13030]/20 text-[#FF4D4D] flex items-center justify-center border border-[#F13030]/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#F5F5F0]">
                  Currently showing: {status?.mode === "UPLOAD" ? "Your upload" : "Auto"}
                </h3>
                <p className="text-xs text-[#A6A6B0]">Official PDF used by casting directors to preview your rate cards &amp; reels.</p>
              </div>
            </div>
            {status?.mode === "UPLOAD" && (
              <span className="px-3 py-1 rounded-full bg-[#FFECEC] text-[#F13030] dark:bg-[#F13030]/20 dark:text-[#FF4D4D] text-xs font-bold font-mono">
                Custom Upload
              </span>
            )}
          </div>

          <div className="pt-2 flex flex-wrap gap-3">
            <Button
              variant="red"
              className="h-10 px-5 text-xs font-bold"
              onClick={handleRegenerate}
              disabled={busy !== null}
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${busy === "regenerate" ? "animate-spin" : ""}`} />
              Regenerate from profile
            </Button>
            <Button
              variant="outline-pill"
              className="h-10 px-5 text-xs font-bold border-white/20 text-white hover:bg-white/10"
              onClick={handleUploadClick}
              disabled={busy !== null}
            >
              <Upload className="w-4 h-4 mr-1.5" />
              Upload PDF
            </Button>
            {status?.mode === "UPLOAD" && (
              <Button
                variant="ghost"
                className="h-10 px-4 text-xs font-bold text-gray-300 hover:text-white"
                onClick={handleRevert}
                disabled={busy !== null}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Revert to auto-generated
              </Button>
            )}
          </div>
        </div>

        {copiedLink && (
          <div className="rounded-[var(--radius-lg)] p-3 text-xs font-body flex items-center justify-between" style={{ background: "var(--color-success-bg)", color: "var(--color-success)" }}>
            <span>Media kit link copied to clipboard!</span>
            <span className="font-mono">✓</span>
          </div>
        )}

        {error && (
          <div className="rounded-[var(--radius-lg)] p-3 text-sm font-body" style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}>
            {error}
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileSelected} />

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 h-11 rounded-full text-xs font-bold font-body border border-[var(--color-border-strong)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] transition-all"
          >
            <Download className="w-4 h-4" /> Download Kit PDF
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-2 h-11 rounded-full text-xs font-bold font-body border border-[var(--color-border-strong)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] transition-all"
          >
            <Share2 className="w-4 h-4 text-[#F13030]" /> {copiedLink ? "Link Copied!" : "Share Link"}
          </button>
        </div>

        <p className="text-xs font-body text-center" style={s.secondary}>
          PDF only, up to 20MB. Your kit is available at monologg.co/[handle]/kit.
        </p>
      </div>
    </div>
  );
}
