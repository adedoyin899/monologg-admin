import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Play, Pause, Volume2, VolumeX, RotateCcw, Upload, Maximize2 } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";

interface WatchPerformanceReelModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string | null;
  title?: string;
  canUpload?: boolean;
  onOpenUpload?: () => void;
}

const DEFAULT_SAMPLE_VIDEO =
  "https://assets.mixkit.co/videos/preview/mixkit-acting-audition-sample-4244-large.mp4";

export function WatchPerformanceReelModal({
  isOpen,
  onClose,
  videoUrl,
  title = "Featured Performance Reel",
  canUpload = false,
  onOpenUpload,
}: WatchPerformanceReelModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(90);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const effectiveUrl = videoUrl || DEFAULT_SAMPLE_VIDEO;

  useEffect(() => {
    if (isOpen) {
      setIsPlaying(false);
      setCurrentTime(0);
      setShowControls(true);
    }
  }, [isOpen, effectiveUrl]);

  if (!isOpen) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    if (!isNaN(videoRef.current.duration) && videoRef.current.duration > 0) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    if (!isNaN(videoRef.current.duration) && videoRef.current.duration > 0) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pos * duration;
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 2800);
  };

  return (
    <Modal onClose={onClose} strength="strong">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-3xl rounded-[24px] overflow-hidden bg-black shadow-2xl relative border border-white/10 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
      >
        {/* Top Floating Header */}
        <div
          className={`absolute top-0 inset-x-0 z-30 p-4 sm:p-5 flex items-center justify-between transition-opacity duration-300 bg-gradient-to-b from-black/80 via-black/40 to-transparent ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
            <h3 className="text-sm sm:text-base font-semibold font-body text-white truncate max-w-md">
              {title}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {canUpload && onOpenUpload && (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 px-3 text-xs gap-1.5 bg-white/15 text-white hover:bg-white/25 border-white/20 backdrop-blur-md"
                onClick={() => {
                  onClose();
                  onOpenUpload();
                }}
              >
                <Upload className="w-3.5 h-3.5" /> Replace Reel
              </Button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/15 text-white hover:bg-white/25 transition-colors backdrop-blur-md"
              aria-label="Close video player"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Container */}
        <div
          className="relative w-full aspect-video sm:max-h-[68vh] bg-black flex items-center justify-center cursor-pointer group"
          onClick={togglePlay}
        >
          <video
            ref={videoRef}
            src={effectiveUrl}
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            className="w-full h-full object-contain"
          />

          {/* Big Center Play Icon when Paused */}
          <AnimatePresence>
            {!isPlaying && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/30"
              >
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-2xl pl-1"
                  style={{ background: "var(--color-accent)" }}
                >
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Floating Music/Video Controls Bar */}
        <div
          className={`absolute bottom-0 inset-x-0 z-30 p-4 sm:p-5 flex flex-col gap-2.5 transition-opacity duration-300 bg-gradient-to-t from-black/90 via-black/50 to-transparent ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Scrubber Progress Bar */}
          <div
            ref={progressBarRef}
            onClick={handleSeek}
            className="w-full h-3 flex items-center cursor-pointer group/bar relative"
          >
            <div className="w-full h-1 group-hover/bar:h-2 bg-white/25 rounded-full overflow-hidden transition-all relative">
              <div
                className="h-full rounded-full transition-all duration-75"
                style={{
                  width: `${progressPercent}%`,
                  background: "var(--color-accent)",
                }}
              />
            </div>
            {/* Scrubber Thumb */}
            <div
              className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-md pointer-events-none transform -translate-x-1/2 scale-0 group-hover/bar:scale-100 transition-transform"
              style={{ left: `${progressPercent}%` }}
            />
          </div>

          {/* Control Buttons & Timestamp Row */}
          <div className="flex items-center justify-between text-white text-xs font-body pt-1">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <button
                onClick={toggleMute}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <span className="font-mono text-white/80 select-none">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    setCurrentTime(0);
                  }
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                title="Replay from start"
                aria-label="Replay video"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handleFullscreen}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                title="Fullscreen"
                aria-label="Toggle fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </Modal>
  );
}
