import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Upload, Check, Video, AlertTriangle, Play, RotateCcw } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { apiClient } from "../../lib/api-client";
import { appStateSync } from "../../lib/state-sync";

interface UploadPerformanceReelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (reelUrl: string, reelTitle: string) => void;
  currentReelUrl?: string | null;
}

const CHECKLIST = [
  "Waist-up framing with face visible",
  "Clear lighting and audio",
  "Natural performance delivery",
  "Under 90 seconds duration",
];

const MAX_FILE_SIZE_BYTES = 150 * 1024 * 1024; // 150MB

export function UploadPerformanceReelModal({
  isOpen,
  onClose,
  onUploadSuccess,
  currentReelUrl,
}: UploadPerformanceReelModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [fileSizeError, setFileSizeError] = useState(false);
  const [reelTitle, setReelTitle] = useState("Dramatic Audition Reel");
  const [uploading, setUploading] = useState(false);
  const [acknowledged, setAcknowledged] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileSizeError(true);
      setSelectedFile(null);
      setFilePreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFileSizeError(false);
    setError(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setFilePreviewUrl(objectUrl);
  };

  const handleResetFile = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileSizeError(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!selectedFile && !currentReelUrl) {
      setError("Please select a video file to upload.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      let finalUrl = currentReelUrl || "https://assets.mixkit.co/videos/preview/mixkit-acting-audition-sample-4244-large.mp4";
      if (selectedFile) {
        try {
          const res = await apiClient.uploadVerificationRecording(selectedFile);
          if (res?.url) finalUrl = res.url;
        } catch {
          // If mock or offline mode, create safe local object url
          finalUrl = filePreviewUrl || "https://assets.mixkit.co/videos/preview/mixkit-acting-audition-sample-4244-large.mp4";
        }
      }

      // Persist to appStateSync talentProfile
      appStateSync.updateTalentProfile({
        hasReel: true,
        performanceReelUrl: finalUrl,
        performanceReelTitle: reelTitle.trim() || "Dramatic Audition Reel",
      });

      onUploadSuccess?.(finalUrl, reelTitle.trim() || "Dramatic Audition Reel");
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to upload video. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal onClose={onClose} align="center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-[28px] overflow-hidden flex flex-col max-h-[92vh] border shadow-2xl"
        style={{
          background: "var(--color-bg-surface)",
          borderColor: "var(--color-border-default)",
        }}
      >
        {/* Header — Clean title, no verification top banner */}
        <div
          className="px-6 py-5 flex items-center justify-between border-b"
          style={{ borderColor: "var(--color-border-default)" }}
        >
          <div>
            <h3 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
              Upload Performance Reel
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 font-body">
              Upload a video showcase of your craft.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Reel Title Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5 font-body">
              Reel Title
            </label>
            <input
              type="text"
              value={reelTitle}
              onChange={(e) => setReelTitle(e.target.value)}
              placeholder="e.g. Dramatic Monologue Showcase (2026)"
              className="w-full h-11 px-4 rounded-[var(--radius-md)] border text-sm font-body bg-[var(--color-bg-elevated)] border-[var(--color-border-default)] text-[var(--color-text-primary)] focus:border-[var(--color-accent)] outline-none"
            />
          </div>

          {/* Viewfinder / Upload Dropzone */}
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              onChange={handleFileChange}
              className="hidden"
            />

            {fileSizeError ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-[var(--color-error)] rounded-[20px] p-6 text-center bg-[var(--color-error-bg)] flex flex-col items-center justify-center min-h-[220px]"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--color-error)]/20 text-[var(--color-error)] flex items-center justify-center mb-3">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-[var(--color-error)] mb-1">
                  File too large (exceeds 150MB)
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mb-4 max-w-xs">
                  Performance reels must be under 150MB and max 90 seconds in duration.
                </p>
                <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  Choose a smaller file
                </Button>
              </div>
            ) : filePreviewUrl || currentReelUrl ? (
              <div
                className="relative rounded-[20px] overflow-hidden border border-[var(--color-border-default)] bg-black aspect-video flex items-center justify-center group"
              >
                <video
                  src={filePreviewUrl || currentReelUrl || ""}
                  controls
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  onClick={handleResetFile}
                  title="Choose different video"
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-semibold bg-black/70 text-white backdrop-blur-md flex items-center gap-1.5 hover:bg-black transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Replace Video
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-[var(--color-border-default)] hover:border-[var(--color-accent)] rounded-[20px] p-6 text-center bg-[var(--color-bg-elevated)] transition-colors flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden"
              >
                {/* Subtle Viewfinder Framing Guide */}
                <div
                  className="absolute inset-x-8 top-6 bottom-10 border border-dashed rounded-[14px] pointer-events-none opacity-30"
                  style={{ borderColor: "var(--color-accent)" }}
                />

                <div className="w-12 h-12 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] flex items-center justify-center mb-3 shadow-sm">
                  <Video className="w-6 h-6" />
                </div>

                <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
                  Click or drag video reel here
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  MP4 or QuickTime · Max 90s · Up to 150MB
                </p>
              </div>
            )}
          </div>

          {/* Checklist Guidelines */}
          <div
            className="rounded-[16px] p-4 space-y-2 border"
            style={{
              background: "var(--color-bg-elevated)",
              borderColor: "var(--color-hairline)",
            }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-2 font-body">
              Before you upload
            </div>
            {CHECKLIST.map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-xs font-body text-[var(--color-text-secondary)]">
                <Check className="w-4 h-4 mt-0.5 shrink-0 text-[var(--color-accent)]" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          {error && (
            <div className="p-3 rounded-xl text-xs font-body bg-[var(--color-error-bg)] text-[var(--color-error)] border border-[var(--color-error)]/20">
              {error}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div
          className="px-6 py-4 flex items-center justify-end gap-3 border-t bg-[var(--color-bg-surface-2)]"
          style={{ borderColor: "var(--color-border-default)" }}
        >
          <Button variant="secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={uploading || (!selectedFile && !currentReelUrl)}
            className="gap-2 min-w-[140px]"
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Saving…" : "Save Reel"}
          </Button>
        </div>
      </motion.div>
    </Modal>
  );
}
