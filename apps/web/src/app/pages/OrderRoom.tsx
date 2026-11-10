import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { EASE_OUT, DURATION_MED } from "../../lib/motionTokens";
import { apiClient } from "../../lib/api-client";
import { appStateSync, type AvailabilityCheckin } from "../../lib/state-sync";
import { trackEvent } from "../../lib/analytics";
import type { OrderMessage } from "@monologg/types";
import {
  ChevronLeft, ChevronRight, Shield, Send, Paperclip, CheckCircle2,
  FileText, Download, AlertTriangle, AlertCircle,
  UploadCloud, X, MapPin, Clock,
  RefreshCw, FastForward, Check,
  Copy, KeyRound, Star, MessageSquare, ShieldCheck,
  Video, ExternalLink, Minus, ChevronDown, ChevronUp,
  PanelRightClose, PanelRightOpen
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────── */
type Phase = "briefing" | "deliverables" | "review" | "complete";
type UserRole = "talent" | "client";
type GigType = "remote" | "onsite";

export type OnsiteEvidence = {
  venue: string;
  coords: string;
  arrivalTime: string;
  pinCode: string;
  notes?: string;
};

export type ExtendedOrderMessage = OrderMessage & {
  onsiteEvidence?: OnsiteEvidence;
};

/* ─── Constants ─────────────────────────────────────────────── */
const PHASES: { id: Phase; label: string; description: string }[] = [
  { id: "deliverables", label: "Deliverables", description: "Digital assets or verified live event performance." },
  { id: "review", label: "Review & Inspection", description: "48-hour client review window with auto-release protection." },
  { id: "complete", label: "Complete & Payout", description: "Escrow released to performer and order finalized." },
];

// Client-provided arrival PIN for onsite performance verification (only visible to client)
const CLIENT_GENERATED_PIN = "4821";

// Reciprocal Rating Pre-filled Choices Options
const CLIENT_RATING_TAGS = [
  "Exceptional delivery",
  "Great communication",
  "Fast turnaround",
  "Creative & professional",
  "Exceeded expectations",
  "Would book again",
];

const TALENT_RATING_TAGS = [
  "Clear brief & requirements",
  "Prompt milestone release",
  "Courteous & professional",
  "Responsive communication",
  "Great collaborator",
  "Smooth experience",
];

/* ─── Component ─────────────────────────────────────────────── */
export function OrderRoom() {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role");
  const initialRole: UserRole = roleParam === "client" ? "client" : "talent";
  const [phase, setPhase] = useState<Phase>("deliverables");
  const [role, setRole] = useState<UserRole>(initialRole);
  const [gigType, setGigType] = useState<GigType>("remote");
  const [messages, setMessages] = useState<ExtendedOrderMessage[]>([]);
  const [inputText, setInputText] = useState("");

  // Modal visibility
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showOrderInfoModal, setShowOrderInfoModal] = useState(false);
  const [paymentReleased, setPaymentReleased] = useState(false);

  // Desktop Contextual Inspector Rail visibility
  const [showInspectorRail, setShowInspectorRail] = useState(true);
  const [railScriptExpanded, setRailScriptExpanded] = useState(false);
  const [railFeeExpanded, setRailFeeExpanded] = useState(false);

  // Reciprocal rating system
  const [ratingStars, setRatingStars] = useState<number>(5);
  const [hoverRatingStars, setHoverRatingStars] = useState<number>(0);
  const [selectedRatingTag, setSelectedRatingTag] = useState<string>("");
  const [ratingNote, setRatingNote] = useState<string>("");
  const [ratingEditing, setRatingEditing] = useState<boolean>(false);
  const [savedReview, setSavedReview] = useState<{ stars: number; tag: string; note: string; date: string } | null>(null);

  // Submit modal — file deliverable
  const [deliverableTab, setDeliverableTab] = useState<"online" | "onsite">("online");
  const [stagedFile, setStagedFile] = useState<{ name: string; size: string; type: "file" | "image" } | null>(null);
  const [onlineNotes, setOnlineNotes] = useState("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submit modal — onsite PIN verification
  const [onsiteNotes, setOnsiteNotes] = useState("");
  const [pinEntry, setPinEntry] = useState("");
  const [copiedPin, setCopiedPin] = useState(false);
  const pin0Ref = useRef<HTMLInputElement>(null);
  const pin1Ref = useRef<HTMLInputElement>(null);
  const pin2Ref = useRef<HTMLInputElement>(null);
  const pin3Ref = useRef<HTMLInputElement>(null);
  const pinDigitRefs = [pin0Ref, pin1Ref, pin2Ref, pin3Ref];

  // Workspace Navigation Tabs (Payment lives in the static right-hand Inspector Rail)
  const [workspaceTab, setWorkspaceTab] = useState<"chat" | "brief">("chat");

  // Availability check-in state
  const [checkins, setCheckins] = useState<AvailabilityCheckin[]>(() => appStateSync.getAvailabilityCheckins());
  const [checkinIndex, setCheckinIndex] = useState(1);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedCheckinToDecline, setSelectedCheckinToDecline] = useState<AvailabilityCheckin | null>(null);

  // Review phase 48-hour countdown timer
  const [timerSeconds, setTimerSeconds] = useState(48 * 3600);
  const [revisionNotes, setRevisionNotes] = useState("");

  // Client Video Introduction Reminder state
  const [clientIntroScheduled, setClientIntroScheduled] = useState(false);
  const [clientIntroCopied, setClientIntroCopied] = useState(false);
  const [clientIntroDismissed, setClientIntroDismissed] = useState(false);
  const [clientIntroCollapsed, setClientIntroCollapsed] = useState(false);
  const [briefScriptCopied, setBriefScriptCopied] = useState(false);
  const [checkinDetailsExpanded, setCheckinDetailsExpanded] = useState(false);
  const [checkinCardMinimized, setCheckinCardMinimized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { id: orderId } = useParams();
  const curOrderId = orderId || "ORD-001";

  const handleConfirmCheckin = (checkinId: string) => {
    const updated = appStateSync.confirmAvailabilityCheckin(checkinId);
    setCheckins(appStateSync.getAvailabilityCheckins());
    if (updated) {
      setMessages(prev => [
        ...prev,
        {
          id: `sys-chk-${Date.now()}`,
          from: "system" as const,
          text: `You confirmed your availability (check-in ${updated.stepIndex} of ${updated.totalSteps}).`,
          time: "Just now",
        },
      ]);
    }
  };

  /* ── Sync saved review for current role ── */
  useEffect(() => {
    try {
      const key = `monologg_order_review_${curOrderId}_${role}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        setSavedReview(parsed);
        setRatingStars(parsed.stars || 5);
        setSelectedRatingTag(parsed.tag || "");
        setRatingNote(parsed.note || "");
      } else {
        setSavedReview(null);
        setRatingStars(5);
        setSelectedRatingTag("");
        setRatingNote("");
      }
    } catch {
      setSavedReview(null);
    }
  }, [curOrderId, role]);

  /* ── Data loading ── */
  useEffect(() => {
    trackEvent(
      "order_room_viewed",
      { orderId: curOrderId, role, mode: gigType },
      "order_room",
    );
  }, [curOrderId, role, gigType]);

  useEffect(() => {
    apiClient.getOrderMessages(orderId ?? "unknown").then(msgs => {
      const initialMsgs = msgs as ExtendedOrderMessage[];
      const syncedMsgs = appStateSync.getOrderMessages(curOrderId) as ExtendedOrderMessage[];
      const combined = [...initialMsgs];
      for (const sm of syncedMsgs) {
        if (!combined.some(m => m.id === sm.id)) {
          combined.push(sm);
        }
      }
      setMessages(combined);
    });
  }, [orderId, curOrderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── 48h countdown ── */
  useEffect(() => {
    if (phase !== "review" || paymentReleased) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) { handleAutoRelease(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, paymentReleased]);

  /* ── Helpers ── */
  const formatCountdown = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
  };

  const phaseIndex = PHASES.findIndex(p => p.id === phase);
  const talentName = appStateSync.getTalentProfile().name;
  const clientOrg = appStateSync.getClientProfile().orgName || "FilmCraft Studios";
  const clientName = appStateSync.getClientProfile().name || "Sarah Jenkins";
  const talentInitials = talentName.split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]).join("");
  const clientInitials = clientOrg.split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]).join("");

  const orderTitle = gigType === "onsite" ? "Comedy Night, Eko Hotel" : "Nike Campaign VO";
  const isOnsite = gigType === "onsite";

  /* ── Rating Submit Handler ── */
  const handleSubmitRating = () => {
    if (ratingStars <= 0) return;
    const effectiveTag = selectedRatingTag || (role === "client" ? "Exceptional delivery" : "Clear brief & requirements");
    const reviewData = {
      stars: ratingStars,
      tag: effectiveTag,
      note: ratingNote.trim(),
      date: "Just now",
      reviewerRole: role,
    };

    const curOrderId = orderId || "ORD-001";
    try {
      localStorage.setItem(`monologg_order_review_${curOrderId}_${role}`, JSON.stringify(reviewData));
      if (role === "client") {
        const existing = JSON.parse(localStorage.getItem("monologg_performer_reviews") || "[]");
        const newReview = {
          id: `rev-${Date.now()}`,
          clientName: `${clientName} (${clientOrg})`,
          projectName: orderTitle,
          orderId: curOrderId,
          stars: ratingStars,
          tag: effectiveTag,
          note: ratingNote.trim() || "Exceptional performance and delivery. Highly recommended!",
          date: "Just now",
        };
        localStorage.setItem("monologg_performer_reviews", JSON.stringify([newReview, ...existing]));
      }
    } catch (e) {
      console.error(e);
    }

    setSavedReview(reviewData);
    setRatingEditing(false);
    trackEvent(
      "order_review_submitted",
      { orderId: curOrderId, role, stars: ratingStars, tag: effectiveTag },
      "order_room",
    );

    setMessages(prev => [
      ...prev,
      {
        id: `local-rating-${Date.now()}`,
        from: "system" as const,
        text: `★ ${role === "client" ? clientName : talentName} submitted a ${ratingStars}-star rating: "${effectiveTag}".`,
        time: "Just now",
      },
    ]);
  };

  /* ── Actions ── */
  const handleCopyPin = () => {
    navigator.clipboard?.writeText(CLIENT_GENERATED_PIN);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    trackEvent(
      "order_message_sent",
      { orderId: curOrderId, role, messageLength: text.length },
      "order_room",
    );
    const sent = orderId ? await apiClient.sendOrderMessage(orderId, text) : null;
    const newMsg: ExtendedOrderMessage = sent ?? {
      id: `local-${messages.length + 1}`,
      from: role,
      text,
      time: "Just now",
    };
    setMessages(prev => [...prev, newMsg]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const advancePhase = (target?: Phase) => {
    const next = target ?? (phaseIndex + 1 < PHASES.length ? PHASES[phaseIndex + 1].id : phase);
    setPhase(next);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeMb = (file.size / 1048576).toFixed(1);
      const isImg = file.type.startsWith("image/");
      setStagedFile({ name: file.name, size: `${sizeMb} MB`, type: isImg ? "image" : "file" });
    }
  };

  const handleSubmitOnlineDeliverable = () => {
    const finalFile = stagedFile ?? { name: "Nike_VO_Final_v1.mp3", size: "8.4 MB", type: "file" as const };
    setShowSubmitModal(false);
    advancePhase("review");
    setTimerSeconds(48 * 3600);
    trackEvent(
      "order_deliverable_submitted",
      { orderId: curOrderId, role, fileName: finalFile.name, mode: "remote" },
      "order_room",
    );
    setMessages(prev => [
      ...prev,
      {
        id: `local-${prev.length + 1}`,
        from: "talent" as const,
        text: onlineNotes.trim() || "Deliverable submitted. Ready for your review.",
        time: "Just now",
        attachment: finalFile,
      },
      {
        id: `local-${prev.length + 2}`,
        from: "system" as const,
        text: "48-hour inspection window started. Escrow auto-releases if uncontested.",
        time: "Just now",
      },
    ]);
    setStagedFile(null);
    setOnlineNotes("");
  };

  const handleSubmitOnsiteEvidence = () => {
    setShowSubmitModal(false);
    advancePhase("review");
    setTimerSeconds(48 * 3600);
    trackEvent(
      "order_onsite_pin_verified",
      { orderId: curOrderId, role, venue: "Comedy Night, Eko Hotel" },
      "order_room",
    );
    const evidence: OnsiteEvidence = {
      venue: "Comedy Night, Eko Hotel",
      coords: "6.5244° N, 3.3792° E · Lagos",
      arrivalTime: "7:52 PM",
      pinCode: CLIENT_GENERATED_PIN,
      notes: onsiteNotes.trim() || "Live performance completed as scheduled.",
    };
    setMessages(prev => [
      ...prev,
      {
        id: `local-${prev.length + 1}`,
        from: "talent" as const,
        text: onsiteNotes.trim() || "Live performance completed. Onsite presence verified.",
        time: "Just now",
        onsiteEvidence: evidence,
      },
      {
        id: `local-${prev.length + 2}`,
        from: "system" as const,
        text: "Attendance confirmed with the client's code.",
        time: "Just now",
      },
      {
        id: `local-${prev.length + 3}`,
        from: "system" as const,
        text: "Onsite presence verified. 48-hour inspection window started.",
        time: "Just now",
      },
    ]);
    setOnsiteNotes("");
    setPinEntry("");
  };

  const handleAutoRelease = () => {
    setShowReleaseModal(false);
    setPaymentReleased(true);
    setPhase("complete");
    trackEvent(
      "order_payment_released",
      { orderId: curOrderId, role, amountKobo: 12000000 },
      "order_room",
    );
    setMessages(prev => [
      ...prev,
      {
        id: `local-${prev.length + 1}`,
        from: "system" as const,
        text: `₦120,000 released from escrow to ${talentName}. Order complete.`,
        time: "Just now",
      },
    ]);
  };

  const handleRequestRevision = () => {
    if (!revisionNotes.trim()) return;
    setShowRevisionModal(false);
    setPhase("deliverables");
    trackEvent(
      "order_revision_requested",
      { orderId: curOrderId, role, notesLength: revisionNotes.trim().length },
      "order_room",
    );
    setMessages(prev => [
      ...prev,
      {
        id: `local-${prev.length + 1}`,
        from: "client" as const,
        text: `Revision requested: ${revisionNotes.trim()}`,
        time: "Just now",
      },
      {
        id: `local-${prev.length + 2}`,
        from: "system" as const,
        text: "Revision requested. Inspection timer paused. Phase returned to Deliverables.",
        time: "Just now",
      },
    ]);
    setRevisionNotes("");
  };

  const activeCheckin = checkins[checkinIndex % (checkins.length || 1)] || checkins[0];
  const isCancelled = Boolean(
    appStateSync.isBookingCancelled(curOrderId) ||
    (activeCheckin && appStateSync.isBookingCancelled(activeCheckin.bookingId))
  );

  /* ─── Context-Aware Action Dock (Review, Onsite PIN & Post-Completion Rating) ─── */
  const renderActionDock = () => {
    // Completed Phase & Rating System — Available to both client and talent when order is complete or payment is released
    if (phase === "complete" || paymentReleased) {
      const targetName = role === "client" ? talentName : clientOrg;
      const tagOptions = role === "client" ? CLIENT_RATING_TAGS : TALENT_RATING_TAGS;

      if (savedReview && !ratingEditing) {
        return (
          <div className="px-4 sm:px-6 pb-2 pt-1">
            <div className="p-3.5 rounded-2xl border bg-white dark:bg-zinc-900 shadow-2xs space-y-2 border-[var(--color-hairline)] dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-500">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 font-body">
                      Your Rating for {targetName}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Verified &amp; Recorded on Monologg</div>
                  </div>
                </div>
                <button
                  onClick={() => setRatingEditing(true)}
                  className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 underline transition-colors cursor-pointer"
                >
                  Edit Review
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < savedReview.stars ? "fill-amber-400 text-amber-400" : "text-zinc-200 dark:text-zinc-700"}`}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold font-mono text-zinc-800 dark:text-zinc-200">{savedReview.stars}.0</span>
                {savedReview.tag && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {savedReview.tag}
                  </span>
                )}
              </div>

              {savedReview.note && (
                <p className="text-xs text-zinc-600 dark:text-zinc-300 font-body bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  &ldquo;{savedReview.note}&rdquo;
                </p>
              )}
            </div>
          </div>
        );
      }

      return (
        <div className="px-4 sm:px-6 pb-2 pt-1">
          <div className="p-4 rounded-2xl border bg-white dark:bg-zinc-900 shadow-2xs space-y-3 border-[var(--color-hairline)] dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 font-body">
                  Rate your experience with {targetName}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Select stars and a quick highlight tag
                </div>
              </div>
              {/* Star Rating */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = (hoverRatingStars || ratingStars) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRatingStars(star)}
                      onMouseLeave={() => setHoverRatingStars(0)}
                      onClick={() => setRatingStars(star)}
                      className="p-1 transition-transform active:scale-110 cursor-pointer"
                      title={`${star} Star${star > 1 ? "s" : ""}`}
                    >
                      <Star
                        className={`w-5 h-5 transition-colors ${
                          isFilled ? "fill-amber-400 text-amber-400" : "text-zinc-300 dark:text-zinc-600 hover:text-amber-300"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prefilled Choices */}
            <div className="flex flex-wrap gap-1.5">
              {tagOptions.map((tag) => {
                const isSelected = selectedRatingTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedRatingTag(isSelected ? "" : tag)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? role === "client"
                          ? "bg-[#5B21B6] text-white border-[#5B21B6] shadow-2xs font-medium"
                          : "bg-[#B91C1C] text-white border-[#B91C1C] shadow-2xs font-medium"
                        : "bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Option to write note */}
            <div>
              <textarea
                value={ratingNote}
                onChange={(e) => setRatingNote(e.target.value)}
                rows={2}
                placeholder={`Write an optional note or review for ${targetName}…`}
                className="w-full p-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-0.5">
              {savedReview && (
                <button
                  type="button"
                  onClick={() => setRatingEditing(false)}
                  className="px-3 h-8.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleSubmitRating}
                disabled={ratingStars === 0}
                className="px-4 h-8.5 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs hover:opacity-95 cursor-pointer"
                style={{ background: role === "client" ? "#5B21B6" : "#B91C1C" }}
              >
                Submit Rating &amp; Review
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Briefing Phase — Client
    if (phase === "briefing" && role === "client") {
      return (
        <div className="px-4 sm:px-6 pb-2 pt-1">
          <button
            onClick={() => advancePhase("deliverables")}
            className="w-full h-10 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xs hover:opacity-95 text-white cursor-pointer"
            style={{ background: "#5B21B6" }}
          >
            <Check className="w-4 h-4" />
            Confirm Brief &amp; Continue
          </button>
        </div>
      );
    }

    // Deliverables Phase — Client view for Onsite Gig: Compact Arrival Code strip
    if (phase === "deliverables" && role === "client" && isOnsite) {
      return (
        <div className="px-4 sm:px-6 pb-2 pt-1">
          <div className="px-3.5 py-2.5 rounded-xl bg-purple-50/90 dark:bg-purple-950/35 border border-purple-200/80 dark:border-purple-800/60 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <KeyRound className="w-4 h-4 text-[#5B21B6] dark:text-purple-400 shrink-0" />
              <div className="text-xs text-purple-950 dark:text-purple-100">
                <span className="font-semibold">Onsite Arrival Code:</span>{" "}
                <span className="text-purple-800/80 dark:text-purple-300 hidden sm:inline">
                  Share with <strong>{talentName}</strong> at <strong>Comedy Night, Eko Hotel</strong>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1">
                {CLIENT_GENERATED_PIN.split("").map((digit, idx) => (
                  <span
                    key={idx}
                    className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-900 border border-purple-200 dark:border-purple-700 flex items-center justify-center font-mono font-bold text-xs text-purple-950 dark:text-purple-100 shadow-2xs"
                  >
                    {digit}
                  </span>
                ))}
              </div>
              <button
                onClick={handleCopyPin}
                className="text-[11px] font-semibold text-purple-700 dark:text-purple-200 hover:text-purple-950 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-purple-200 dark:border-purple-700 shadow-2xs transition-colors cursor-pointer"
              >
                {copiedPin ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copiedPin ? "Copied" : "Copy Code"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Review Phase — Compact Inspection & Decision Bar
    if (phase === "review") {
      return (
        <div className="px-4 sm:px-6 pb-2 pt-1">
          <div className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center justify-between sm:justify-start gap-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="text-xs text-amber-900 dark:text-amber-200 font-semibold">
                  {role === "client" ? "Inspection window active" : "Escrow secured · 48h auto-release"}
                </span>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100/80 dark:bg-amber-900/40 text-amber-950 dark:text-amber-200">
                {formatCountdown(timerSeconds)} remaining
              </span>
            </div>

            {role === "client" ? (
              <div className="flex items-center gap-2 shrink-0">
                {!isOnsite && (
                  <button
                    onClick={() => setShowRevisionModal(true)}
                    className="h-8.5 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 hover:bg-zinc-100 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer"
                  >
                    Request Revision
                  </button>
                )}
                <button
                  onClick={() => setShowReleaseModal(true)}
                  className="h-8.5 px-4 rounded-xl text-xs font-semibold text-white transition-all active:scale-[0.98] shadow-xs hover:opacity-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{ background: "#5B21B6" }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Release ₦120,000</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between sm:justify-end gap-3">
                <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 hidden md:inline">
                  Auto-releases to wallet on expiry
                </span>
                <button
                  onClick={handleAutoRelease}
                  className="text-xs font-semibold text-amber-900 dark:text-amber-200 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                  title="Simulate timer expiry (demo)"
                >
                  <FastForward className="w-3 h-3" />
                  Test Release
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  /* ─── JSX ─────────────────────────────────────────────────── */
  return (
    <div
      className={`${role === "client" ? "role-client" : "role-talent"} min-h-screen flex flex-col w-full max-w-[100vw] overflow-x-hidden`}
      style={{ background: "var(--color-bg-canvas)" }}
    >
      {/* ══════════════════════════════════════════════════════════
          TOP WORKSPACE HEADER (Upwork / Fiverr / Braintrust Inspired)
         ══════════════════════════════════════════════════════════ */}
      <header
        className="h-15 flex items-center justify-between gap-1.5 sm:gap-4 px-2.5 sm:px-6 sticky top-0 z-40 border-b backdrop-blur-md"
        style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-hairline)" }}
      >
        {/* Left: Back + Counterparty Avatar + Order & Partner Identity */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
          <button
            aria-label="Go back"
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all text-zinc-500 dark:text-zinc-400 shrink-0 cursor-pointer border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Counterparty Avatar with Live Presence Dot */}
          <div className="relative shrink-0 hidden sm:block">
            <Avatar
              size="sm"
              className="w-9 h-9 text-xs font-bold shadow-2xs"
              background={role === "talent" ? "rgba(91, 33, 182, 0.12)" : "rgba(185, 28, 28, 0.12)"}
              color={role === "talent" ? "#5B21B6" : "#B91C1C"}
            >
              {role === "talent" ? clientInitials : talentInitials}
            </Avatar>
            <span
              className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900 absolute -bottom-0.5 -right-0.5"
              title="Online now"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 truncate font-display">
                {orderTitle}
              </h1>
              <span className="hidden sm:inline-flex text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700 shrink-0">
                {gigType === "remote" ? "Online" : "Onsite"}
              </span>
              <span className="hidden md:inline-flex text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 shrink-0">
                {curOrderId}
              </span>
              {(appStateSync.isBookingCancelled(curOrderId) || isCancelled) && (
                <Badge tone="error" size="sm">Cancelled</Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
              <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
                {role === "talent" ? clientOrg : talentName}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 sm:hidden" />
                Active
              </span>
              <span className="sm:hidden">·</span>
              <span className="sm:hidden text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 shrink-0">
                {gigType === "remote" ? "Online" : "Onsite"}
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline text-zinc-500 dark:text-zinc-400">Lagos (WAT)</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Call + Role/Mode Switchers + Inspector Rail Toggle */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Demo: gig type switcher */}
          <div className="hidden sm:flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 text-[11px]">
            {(["remote", "onsite"] as GigType[]).map(g => (
              <button
                key={g}
                type="button"
                onClick={() => { setGigType(g); setDeliverableTab(g === "remote" ? "online" : "onsite"); }}
                className={`px-2.5 py-1 rounded-md font-medium capitalize transition-all cursor-pointer ${
                  gigType === g
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Demo: role switcher with subtle role accent dot */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 text-[11px]">
            {(["talent", "client"] as UserRole[]).map((r) => {
              const isActive = role === r;
              const dotBg = r === "talent" ? "bg-[#B91C1C]" : "bg-[#5B21B6]";
              const dotOpacity = isActive ? "opacity-100" : "opacity-40";
              const btnTone = isActive
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200";

              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`px-1.5 sm:px-2.5 py-1 rounded-md font-medium capitalize transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${btnTone}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotBg} ${dotOpacity}`} />
                  {r === "talent" ? (
                    <>
                      <span className="hidden sm:inline">Performer</span>
                      <span className="sm:hidden">Talent</span>
                    </>
                  ) : (
                    "Client"
                  )}
                </button>
              );
            })}
          </div>

          {/* Order Info Modal Button (Shown on mobile/tablet or when desktop inspector rail is hidden) */}
          <button
            type="button"
            onClick={() => setShowOrderInfoModal(true)}
            className={`${showInspectorRail ? "lg:hidden" : "flex"} flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-2xs active:scale-95`}
            aria-label="Order Info"
            title="View Project Phases & Escrow Details"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Order </span>
            <span>Info</span>
          </button>

          {/* Desktop Inspector Rail Toggle */}
          <button
            type="button"
            onClick={() => setShowInspectorRail(prev => !prev)}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
            title={showInspectorRail ? "Hide Inspector Panel" : "Show Inspector Panel"}
            aria-label={showInspectorRail ? "Hide Inspector Panel" : "Show Inspector Panel"}
          >
            {showInspectorRail ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════
          MAIN 2-PANE RESPONSIVE WORKSPACE (Chat Stream + Right Inspector Rail)
         ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto min-h-0 min-w-0 overflow-x-hidden">

        {/* ── LEFT / PRIMARY WORKSPACE COLUMN ── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">

          {/* Compact Top Workspace Switcher + Unified Contextual Status Bar */}
          <div className="px-3 sm:px-6 pt-3 space-y-2.5 shrink-0">

            {/* Workspace View Switcher (2 Primary Views: Messages & Brief — Payment lives in Right Rail) */}
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/50 w-full sm:w-auto">
                {[
                  { id: "chat", label: "Messages", icon: MessageSquare },
                  { id: "brief", label: "Brief & Files", icon: FileText },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = workspaceTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setWorkspaceTab(tab.id as "chat" | "brief")}
                      className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-1.5 px-3.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isActive
                          ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs font-semibold"
                          : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-100"
                      }`}
                    >
                      <Icon
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? (role === "client" ? "text-[#5B21B6] dark:text-purple-400" : "text-[#B91C1C] dark:text-red-400") : "text-zinc-400 dark:text-zinc-400"
                        }`}
                      />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Unified Contextual Command & Alignment Bar (Shown in Messages View Only) ── */}
            {workspaceTab === "chat" && (() => {
              if (!activeCheckin && !isCancelled && !(role === "client" && !clientIntroDismissed)) return null;

              const isConfirmed = activeCheckin ? activeCheckin.status === "done" : false;
              const isOverdue = activeCheckin ? (activeCheckin.isOverdue || activeCheckin.status === "missed") : false;
              const showClientMeetRow = role === "client" && !isCancelled && !clientIntroDismissed;

              if (isCancelled) {
                return (
                  <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-body flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span className="truncate">
                        {role === "client"
                          ? "Performer declined check-in. ₦134,400 has been refunded automatically to your wallet."
                          : "Booking cancelled and ₦134,400 refunded automatically to client."}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-600 text-white shrink-0">
                      Cancelled
                    </span>
                  </div>
                );
              }

              if (checkinCardMinimized) {
                return (
                  <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3.5 py-2 flex items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isConfirmed ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--color-bg-elevated)] border border-[var(--color-hairline)] text-[var(--color-text-secondary)] shrink-0">
                        {isConfirmed ? "Verified" : `Gate ${activeCheckin?.stepIndex || 2}/${activeCheckin?.totalSteps || 3}`}
                      </span>
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {isConfirmed
                          ? `Attendance Confirmed · ${activeCheckin?.eventName || orderTitle}`
                          : role === "client"
                            ? "Performer Attendance Verification"
                            : `Confirm attendance for ${activeCheckin?.clientName || clientOrg}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!isConfirmed && role === "talent" && (
                        <button
                          type="button"
                          onClick={() => activeCheckin && handleConfirmCheckin(activeCheckin.id)}
                          className="h-7 px-2.5 rounded-lg text-[11px] font-bold text-white flex items-center gap-1 shadow-2xs cursor-pointer"
                          style={{ background: "#B91C1C" }}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>I&apos;m confirmed</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setCheckinCardMinimized(false)}
                        className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        title="Expand verification card"
                        aria-label="Expand verification card"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  className={`rounded-2xl border overflow-hidden transition-all bg-[var(--color-bg-surface)] ${
                    isConfirmed
                      ? "border-emerald-200/80 dark:border-emerald-800/40"
                      : isOverdue
                        ? "border-amber-400/60 shadow-2xs"
                        : "border-[var(--color-border-default)] shadow-2xs"
                  }`}
                >
                  {/* Attendance Check-in Gate Row */}
                  {activeCheckin && (
                    <div className="px-3.5 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {!isConfirmed && role === "talent" && checkins.length > 1 && (
                          <div className="hidden sm:flex items-center gap-0.5">
                            <button
                              type="button"
                              aria-label="Previous check-in"
                              onClick={() => setCheckinIndex((prev) => (prev - 1 + checkins.length) % checkins.length)}
                              className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Next check-in"
                              onClick={() => setCheckinIndex((prev) => (prev + 1) % checkins.length)}
                              className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 border ${
                            isConfirmed
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50"
                              : role === "client"
                                ? "bg-purple-50 dark:bg-purple-950/40 text-[#5B21B6] dark:text-purple-300 border-purple-200 dark:border-purple-800/50"
                                : "bg-red-50 dark:bg-red-950/40 text-[#B91C1C] dark:text-red-300 border-red-200 dark:border-red-800/50"
                          }`}
                        >
                          {isConfirmed
                            ? `Gate ${activeCheckin?.stepIndex || 2}/${activeCheckin?.totalSteps || 3} Verified`
                            : isOverdue
                              ? "Action Required"
                              : role === "client"
                                ? "Attendance"
                                : `Gate ${activeCheckin?.stepIndex || 2}/${activeCheckin?.totalSteps || 3}`}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                              {isConfirmed
                                ? "Attendance Confirmed"
                                : role === "client"
                                  ? "Performer Attendance Verification"
                                  : `Confirm attendance for ${activeCheckin?.clientName || clientOrg}`}
                            </h3>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-300 hidden md:inline shrink-0">
                              · {isConfirmed
                                ? `Milestone ${activeCheckin?.stepIndex || 2} of ${activeCheckin?.totalSteps || 3} locked in`
                                : role === "client"
                                  ? `Awaiting check-in from ${talentName}`
                                  : `Due ${activeCheckin?.dueDate || "Tue 14 Oct"}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                        {!isConfirmed && role === "talent" && (
                          <>
                            <button
                              type="button"
                              onClick={() => { setSelectedCheckinToDecline(activeCheckin); setShowDeclineModal(true); }}
                              className="h-7.5 px-2.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-red-600 hover:border-red-300 transition-colors cursor-pointer"
                            >
                              Can&apos;t make it
                            </button>
                            <button
                              type="button"
                              onClick={() => activeCheckin && handleConfirmCheckin(activeCheckin.id)}
                              className="h-7.5 px-3 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 shadow-2xs hover:opacity-95 active:scale-95 transition-all cursor-pointer"
                              style={{ background: "#B91C1C" }}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>I&apos;m confirmed</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => setCheckinDetailsExpanded(prev => !prev)}
                          className="h-7 px-2 rounded-lg text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span>{checkinDetailsExpanded ? "Hide Details" : "Details"}</span>
                          {checkinDetailsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => setCheckinCardMinimized(true)}
                          className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                          title="Minimize notification"
                          aria-label="Minimize notification"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Progressive Disclosure: Event Details Grid (Expanded on Demand) */}
                  {checkinDetailsExpanded && (
                    <div className="px-3.5 sm:px-4 pb-3 pt-2 border-t border-[var(--color-hairline)] bg-[var(--color-bg-elevated)]/50 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-body">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-300 block">EVENT</span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
                          {activeCheckin?.eventName || orderTitle}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-300 block">DATE &amp; TIME</span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
                          {activeCheckin?.eventDate || "Tue 24 Nov 2026 · 10:00 AM"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-300 block">LOCATION</span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
                          {activeCheckin?.location || (gigType === "remote" ? "Remote (Online)" : "Eko Hotel, Lagos")}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Integrated Client Google Meet Row (Unified inside the same card to eliminate stacked banner clutter) */}
                  {showClientMeetRow && (
                    <div className="px-3.5 sm:px-4 py-2 border-t border-[var(--color-hairline)] bg-purple-50/30 dark:bg-purple-950/15 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Video className="w-3.5 h-3.5 text-[#5B21B6] dark:text-purple-400 shrink-0" />
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                          Schedule Google Meet with {talentName}
                        </span>
                        <span className="hidden md:inline text-[11px] text-zinc-500 dark:text-zinc-400">
                          · Align on creative tone &amp; deliverables
                        </span>
                      </div>

                      {!clientIntroCollapsed && (
                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                          <a
                            href="https://meet.google.com/new"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Launch Google Meet"
                            onClick={() => setClientIntroScheduled(true)}
                            className="h-7 px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 text-white transition-all cursor-pointer shadow-2xs hover:opacity-95"
                            style={{ background: "#5B21B6" }}
                          >
                            <span>Launch Google Meet</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText("https://meet.google.com/new");
                              setClientIntroCopied(true);
                              setTimeout(() => setClientIntroCopied(false), 2000);
                            }}
                            className="h-7 px-2 rounded-lg text-[11px] font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{clientIntroCopied ? "Copied" : "Copy Link"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setClientIntroScheduled(prev => !prev)}
                            className={`h-7 px-2 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1 cursor-pointer ${
                              clientIntroScheduled
                                ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30"
                                : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span className="hidden sm:inline">{clientIntroScheduled ? "Done" : "Mark Done"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setClientIntroDismissed(true)}
                            className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                            title="Dismiss"
                            aria-label="Dismiss video call reminder"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ── TAB 1: 1-on-1 Conversation Stream + Action Dock + Unified Composer ── */}
          {workspaceTab === "chat" && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-2">
                {messages.map((msg, idx) => {
                  /* Sleek System / Milestone Pills */
                  if (msg.from === "system") {
                    const isEscrowMsg = msg.text?.toLowerCase().includes("escrow") || msg.text?.toLowerCase().includes("released");
                    const isWarningMsg = msg.text?.toLowerCase().includes("due") || msg.text?.toLowerCase().includes("revision");

                    return (
                      <div key={msg.id} className="flex justify-center my-2.5">
                        <div
                          className={`px-3 py-1 rounded-full text-[11px] inline-flex items-center gap-1.5 max-w-md text-center border font-medium ${
                            isEscrowMsg
                              ? "bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200/70 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200"
                              : isWarningMsg
                                ? "bg-amber-50/70 dark:bg-amber-950/25 border-amber-200/70 dark:border-amber-800/50 text-amber-800 dark:text-amber-200"
                                : "bg-zinc-100/80 dark:bg-zinc-800/80 border-zinc-200/70 dark:border-zinc-700/70 text-zinc-600 dark:text-zinc-300"
                          }`}
                        >
                          <CheckCircle2
                            className={`w-3 h-3 shrink-0 ${
                              isWarningMsg ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          />
                          <span>{msg.text}</span>
                        </div>
                      </div>
                    );
                  }

                  const isMe = msg.from === role;
                  const isTalent = msg.from === "talent";
                  const senderName = isTalent ? talentName : clientOrg;
                  const prevMsg = idx > 0 ? messages[idx - 1] : null;
                  const isGrouped = prevMsg?.from === msg.from;

                  // Clean 1-on-1 bubble styling (no noisy role tags or heavy left stripe borders)
                  const bubbleClass = isMe
                    ? isTalent
                      ? "bg-[#991B1B] text-white shadow-2xs"
                      : "bg-[#5B21B6] text-white shadow-2xs"
                    : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs";

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: DURATION_MED, ease: EASE_OUT }}
                      className={`flex gap-2.5 ${isMe ? "justify-end" : "justify-start"} ${isGrouped ? "mt-1" : "mt-3.5"}`}
                    >
                      {/* Counterparty Avatar only on incoming messages (hidden on outgoing messages to reduce visual noise) */}
                      {!isMe && (
                        isGrouped ? (
                          <div className="w-7 shrink-0" />
                        ) : (
                          <Avatar
                            size="sm"
                            className="w-7 h-7 text-[10px] shrink-0 mt-0.5 font-bold shadow-2xs"
                            background={isTalent ? "rgba(185, 28, 28, 0.12)" : "rgba(91, 33, 182, 0.12)"}
                            color={isTalent ? "#B91C1C" : "#5B21B6"}
                          >
                            {isTalent ? talentInitials : clientInitials}
                          </Avatar>
                        )
                      )}

                      <div className={`max-w-[84%] sm:max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                        {/* Minimal Header Only on First Message in a Group (No redundant CLIENT/PERFORMER/You tags) */}
                        {!isGrouped && (
                          <div className={`flex items-center gap-1.5 mb-1 px-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
                            {!isMe && (
                              <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                                {senderName}
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-400 font-mono">
                              {msg.time}
                            </span>
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div
                          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed transition-all ${bubbleClass}`}
                          style={{
                            borderRadius: isMe
                              ? isGrouped ? "16px 6px 6px 16px" : "16px 4px 16px 16px"
                              : isGrouped ? "6px 16px 16px 6px" : "4px 16px 16px 16px",
                          }}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>

                          {/* File Attachment Sub-Card */}
                          {msg.attachment && (
                            <div
                              className={`mt-2 p-2.5 rounded-xl flex items-center gap-3 border transition-colors ${
                                isMe
                                  ? "bg-black/25 dark:bg-black/40 border-white/20 text-white shadow-2xs"
                                  : "bg-zinc-50 dark:bg-zinc-800/90 border-zinc-200/90 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                              }`}
                            >
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  isMe
                                    ? "bg-white/20 text-white"
                                    : isTalent
                                      ? "bg-red-50 text-[#B91C1C] dark:bg-red-950/60 dark:text-red-300"
                                      : "bg-purple-50 text-[#5B21B6] dark:bg-purple-950/60 dark:text-purple-300"
                                }`}
                              >
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0 text-xs">
                                <div className={`font-bold truncate ${isMe ? "text-white" : "text-zinc-900 dark:text-zinc-100"}`}>
                                  {msg.attachment.name}
                                </div>
                                <div className={`font-mono text-[11px] ${isMe ? "text-white/80" : "text-zinc-500 dark:text-zinc-400"}`}>
                                  {msg.attachment.size}
                                </div>
                              </div>
                              <button
                                type="button"
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isMe
                                    ? "text-white/90 hover:text-white hover:bg-white/20"
                                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-700"
                                }`}
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {/* Onsite evidence card inside performer bubble */}
                          {msg.onsiteEvidence && (
                            <div
                              className={`mt-2.5 p-3 rounded-xl border text-xs shadow-2xs ${
                                isMe
                                  ? "bg-black/25 dark:bg-black/40 border-white/20 text-white"
                                  : "bg-white text-zinc-900 border-white/60 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className={`flex items-center gap-1.5 font-semibold ${isMe ? "text-white" : "text-zinc-900 dark:text-zinc-100"}`}>
                                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                                  Onsite Appearance Verified
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  isMe
                                    ? "bg-emerald-400/20 text-emerald-200 border border-emerald-400/30"
                                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                }`}>
                                  Verified
                                </span>
                              </div>
                              <div className={`space-y-1 ${isMe ? "text-white/90" : "text-zinc-600 dark:text-zinc-300"}`}>
                                <div className={`font-semibold ${isMe ? "text-white" : "text-zinc-900 dark:text-zinc-100"}`}>{msg.onsiteEvidence.venue}</div>
                                <div>📍 {msg.onsiteEvidence.coords}</div>
                                <div>Arrived {msg.onsiteEvidence.arrivalTime} (Auto-verified)</div>
                                {msg.onsiteEvidence.pinCode && (
                                  <div className={`mt-1.5 flex items-center gap-1.5 font-mono ${isMe ? "text-white" : "text-zinc-800 dark:text-zinc-200"}`}>
                                    <span>Client code confirmed:</span>
                                    <span className={`font-bold tracking-widest px-1.5 py-0.5 rounded border ${
                                      isMe
                                        ? "text-emerald-200 bg-emerald-400/20 border-emerald-400/40"
                                        : "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                    }`}>
                                      {msg.onsiteEvidence.pinCode}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Context-aware Action Dock (Review timer, Onsite PIN, or Rating form) */}
              {renderActionDock()}

              {/* Payment Released Banner */}
              {paymentReleased && (
                <div className="px-4 sm:px-6 pb-2">
                  <div
                    className="px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs sm:text-sm font-medium shadow-2xs"
                    style={{ background: "var(--color-success-bg)", color: "var(--color-success)" }}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>₦120,000 released to {talentName}. Order complete.</span>
                  </div>
                </div>
              )}

              {/* ── Unified Multi-Row Composer Dock (Fiverr & Braintrust Inspired) ── */}
              <div
                className="px-3 sm:px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t"
                style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-hairline)" }}
              >
                <div
                  className="rounded-2xl border transition-all overflow-hidden shadow-2xs focus-within:ring-2 focus-within:ring-zinc-900/10 dark:focus-within:ring-white/10"
                  style={{
                    background: "var(--color-bg-canvas)",
                    borderColor: "var(--color-border-default)",
                  }}
                >
                  {/* Top Row: Textarea Input */}
                  <textarea
                    className="w-full px-4 pt-3 pb-1.5 text-sm resize-none focus:outline-none bg-transparent"
                    style={{
                      lineHeight: "1.5",
                      color: "var(--color-text-primary)",
                    }}
                    rows={1}
                    placeholder={`Message ${role === "talent" ? clientOrg : talentName}…`}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />

                  {/* Bottom Toolbar Row Inside Composer */}
                  <div className="flex items-center justify-between gap-2 px-3 pb-2.5 pt-1">
                    {/* Left Toolbar: Attachment + Contextual Action Pill */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <button
                        aria-label="Attach"
                        onClick={() => role === "talent" ? setShowSubmitModal(true) : fileInputRef.current?.click()}
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all hover:bg-zinc-200/70 dark:hover:bg-zinc-800 active:scale-95 cursor-pointer text-zinc-500 dark:text-zinc-400"
                        title={role === "talent" ? "Submit deliverable" : "Attach file"}
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>

                      {/* Performer Primary Deliverable Action Integrated cleanly into Composer Toolbar */}
                      {phase === "deliverables" && role === "talent" && !isOnsite && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeliverableTab("online");
                            setShowSubmitModal(true);
                          }}
                          className="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 text-white shadow-2xs hover:opacity-95 cursor-pointer"
                          style={{ background: "#B91C1C" }}
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Submit Deliverable</span>
                        </button>
                      )}

                      {phase === "deliverables" && role === "talent" && isOnsite && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeliverableTab("onsite");
                            setShowSubmitModal(true);
                          }}
                          className="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 text-white shadow-2xs hover:opacity-95 cursor-pointer"
                          style={{ background: "#B91C1C" }}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Enter Code &amp; Verify</span>
                        </button>
                      )}

                      {/* Trust & Escrow Micro-Pill */}
                      <div className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 pl-1">
                        <Shield className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Escrow protected · 48h auto-release</span>
                      </div>
                    </div>

                    {/* Right Toolbar: Dispute Escape Hatch + Role-Colored Send Button */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowDisputeModal(true)}
                        className="text-[11px] font-medium flex items-center gap-1 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <span>Dispute</span>
                      </button>

                      <button
                        aria-label="Send"
                        onClick={sendMessage}
                        disabled={!inputText.trim()}
                        className="h-8 px-3.5 rounded-lg flex items-center justify-center gap-1.5 shrink-0 transition-all active:scale-95 disabled:opacity-35 text-white text-xs font-semibold shadow-2xs cursor-pointer"
                        style={{
                          background: role === "client" ? "#5B21B6" : "#B91C1C",
                        }}
                      >
                        <span className="hidden xs:inline">Send</span>
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: Order Brief & Deliverables ── */}
          {workspaceTab === "brief" && (
            <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-5 space-y-5">
              {/* Creative Brief & Synopsis */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-2xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-[var(--color-hairline)]">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--color-bg-elevated)] border border-[var(--color-hairline)] text-[var(--color-text-tertiary)]">
                        {curOrderId}
                      </span>
                      <Badge tone="accent" size="sm">
                        {gigType === "onsite" ? "Live On-site Performance" : "Remote Studio Recording"}
                      </Badge>
                    </div>
                    <h3 className="font-display text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
                      Creative Brief &amp; Project Scope
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      {orderTitle} · Commissioned by <span className="font-semibold text-[var(--color-text-primary)]">{clientOrg}</span>
                    </p>
                  </div>
                </div>

                {/* Synopsis */}
                <div className="p-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-hairline)] text-xs sm:text-sm font-body leading-relaxed text-[var(--color-text-secondary)]">
                  Client is seeking a commanding, resonant voiceover artist for a national campaign spot. Selected performer will record master WAV stems, adhere to natural pacing, and coordinate any retakes within the 48-hour review window.
                </div>

                {/* Format & Timeline Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-body">
                  <div className="p-3.5 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-bg-surface)] flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)] flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)] tracking-wider block">Production Format</span>
                      <span className="font-semibold text-[var(--color-text-primary)] block mt-0.5">
                        {gigType === "onsite" ? "On-site: Eko Hotel & Suites, VI, Lagos" : "Remote (Studio Audio Master)"}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-bg-surface)] flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)] tracking-wider block">Timeline &amp; Turnaround</span>
                      <span className="font-semibold text-[var(--color-text-primary)] block mt-0.5">
                        First cut due within 24h · 48h review window
                      </span>
                    </div>
                  </div>
                </div>

                {/* Teleprompter / Dialogue Script Excerpt */}
                <div className="pt-2">
                  <div className="flex items-start sm:items-center justify-between gap-3 mb-2.5">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5 font-display">
                        <FileText className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
                        <span>Dialogue Script Reader &amp; Pacing Guide</span>
                      </span>
                      <span className="text-[11px] text-[var(--color-text-tertiary)] font-body block mt-0.5">
                        ~18s audio read · Warm, commanding brand voice
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText("They told you impossible is a standard. We tell you it's a starting line. When the whistle blows in Surulere, the world listens. Nike: Just Do It.");
                        setBriefScriptCopied(true);
                        setTimeout(() => setBriefScriptCopied(false), 2000);
                      }}
                      className="h-7.5 px-2.5 rounded-lg text-xs font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition-colors flex items-center gap-1.5 cursor-pointer border border-[var(--color-accent)]/20 shrink-0 whitespace-nowrap"
                    >
                      <Copy className="w-3 h-3 shrink-0" />
                      <span>{briefScriptCopied ? "Copied!" : "Copy Script"}</span>
                    </button>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900 text-zinc-100 border border-zinc-800 shadow-inner relative overflow-hidden">
                    <div className="absolute top-2 right-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                      Broadcast Copy
                    </div>
                    <p className="font-serif sm:text-base text-sm leading-relaxed tracking-wide italic text-zinc-100 pt-2 sm:pt-0">
                      &ldquo;They told you impossible is a standard. We tell you it&apos;s a starting line. When the whistle blows in Surulere, the world listens. Nike: Just Do It.&rdquo;
                    </p>
                  </div>
                </div>

                {/* Campaign Reference Files */}
                <div className="pt-3 border-t border-[var(--color-hairline)]">
                  <span className="text-xs font-bold text-[var(--color-text-primary)] block mb-2.5 font-display">
                    Campaign Reference Attachments
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-bg-elevated)]/40 hover:border-[var(--color-accent)] transition-all">
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 text-[#B91C1C] flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[var(--color-text-primary)] truncate">Nike_Campaign_Brief_v2.pdf</div>
                        <div className="text-[11px] text-[var(--color-text-tertiary)] leading-snug mt-0.5">1.2 MB · Brand pronunciation &amp; creative tone guide</div>
                      </div>
                    </div>
                    <a
                      href="#download"
                      onClick={(e) => { e.preventDefault(); alert("Downloading brief reference package..."); }}
                      className="h-8.5 px-3.5 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1.5 shrink-0 w-full sm:w-auto sm:ml-3 cursor-pointer shadow-xs hover:opacity-95"
                      style={{ background: role === "client" ? "#5B21B6" : "#B91C1C" }}
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>

                {/* Deliverables Checklist */}
                <div className="pt-3 border-t border-[var(--color-hairline)]">
                  <span className="text-xs font-bold text-[var(--color-text-primary)] block mb-2.5 font-display">
                    Required Production Deliverables
                  </span>
                  <div className="space-y-2 text-xs font-body text-[var(--color-text-secondary)]">
                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[var(--color-bg-elevated)]/40 border border-[var(--color-hairline)]">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="font-medium text-[var(--color-text-primary)]">2x 30s broadcast WAV master audio files (24-bit / 48kHz, -23 LUFS integrated)</span>
                    </div>
                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[var(--color-bg-elevated)]/40 border border-[var(--color-hairline)]">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="font-medium text-[var(--color-text-primary)]">1x 15s social media cutdown variation with synced cues</span>
                    </div>
                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[var(--color-bg-elevated)]/40 border border-[var(--color-hairline)]">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="font-medium text-[var(--color-text-primary)]">Raw vocal stems and ambient room tone WAV file</span>
                    </div>
                  </div>
                </div>

                {role === "talent" ? (
                  <Button
                    className="w-full h-11 text-xs font-semibold gap-1.5"
                    onClick={() => setShowSubmitModal(true)}
                  >
                    <UploadCloud className="w-4 h-4" /> Submit Order Deliverable
                  </Button>
                ) : (
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400">
                    Awaiting performer deliverable submission. Once submitted, your 48-hour review window starts.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ══════════════════════════════════════════════════════════
            RIGHT CONTEXTUAL INSPECTOR RAIL (Single Source of Truth for Deal & Status)
            Persistent on Desktop (lg+), Collapsible for Focus Mode
           ══════════════════════════════════════════════════════════ */}
        {showInspectorRail && (
          <aside
            className="hidden lg:flex w-80 xl:w-88 shrink-0 flex-col border-l overflow-y-auto p-4 space-y-3.5"
            style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-hairline)" }}
            aria-label="Order Inspector Panel"
          >
            {/* 1. Counterparty Profile Card */}
            <div className="p-3.5 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-bg-canvas)] space-y-3">
              <div className="flex items-center gap-3">
                <Avatar
                  size="sm"
                  className="w-10 h-10 text-xs font-bold shrink-0"
                  background={role === "talent" ? "rgba(91, 33, 182, 0.12)" : "rgba(185, 28, 28, 0.12)"}
                  color={role === "talent" ? "#5B21B6" : "#B91C1C"}
                >
                  {role === "talent" ? clientInitials : talentInitials}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {role === "talent" ? clientOrg : talentName}
                    </span>
                    <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                    <span>{role === "talent" ? "Verified Client" : "Verified Performer"}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-0.5 text-amber-500 font-semibold">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      4.9
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--color-hairline)] text-[11px]">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 block">Location</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">Lagos, NG</span>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 block">Avg. Response</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">&lt; 1 hour</span>
                </div>
              </div>
            </div>

            {/* 2. Authoritative Escrow & Payout Card (Progressive Disclosure) */}
            <div className="p-3.5 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-bg-canvas)] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-300">
                  {role === "client" ? "Escrow Deposit" : "Net Take-Home"}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/50">
                  {paymentReleased ? "Released" : "100% Secured"}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {role === "client" ? "₦134,400" : "₦111,600"}
                </span>
                <button
                  type="button"
                  onClick={() => setRailFeeExpanded(prev => !prev)}
                  className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-0.5 cursor-pointer"
                >
                  <span>{railFeeExpanded ? "Hide math" : "Fee breakdown"}</span>
                  {railFeeExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {railFeeExpanded && (
                <div className="pt-2 border-t border-[var(--color-hairline)] space-y-1.5 text-xs">
                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                    <span>Base rate</span>
                    <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">₦120,000</span>
                  </div>
                  {role === "client" ? (
                    <>
                      <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                        <span>Escrow fee (12%)</span>
                        <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">+₦14,400</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-1 border-t border-[var(--color-hairline)] text-zinc-900 dark:text-zinc-100">
                        <span>Total deposit</span>
                        <span className="font-mono text-[#5B21B6] dark:text-purple-400">₦134,400</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                        <span>Platform fee (7%)</span>
                        <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">-₦8,400</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-1 border-t border-[var(--color-hairline)] text-zinc-900 dark:text-zinc-100">
                        <span>You receive</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">₦111,600</span>
                      </div>
                    </>
                  )}
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed pt-1">
                    Held in escrow via Paystack · Auto-releases 48h after delivery.
                  </p>
                </div>
              )}
            </div>

            {/* 3. Upwork-Style Vertical Activity Timeline */}
            <div className="p-3.5 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-bg-canvas)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-display">
                  Activity Timeline
                </span>
                <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                  Step {phaseIndex + 1} of {PHASES.length}
                </span>
              </div>

              <div className="space-y-0">
                {PHASES.map((p, idx) => {
                  const isPast = idx < phaseIndex || paymentReleased;
                  const isCurrent = p.id === phase && !paymentReleased;
                  const isLast = idx === PHASES.length - 1;

                  return (
                    <div key={p.id} className="flex gap-2.5">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            isPast
                              ? "bg-emerald-600 text-white"
                              : isCurrent
                                ? role === "client"
                                  ? "bg-[#5B21B6] text-white ring-3 ring-purple-500/15"
                                  : "bg-[#B91C1C] text-white ring-3 ring-red-500/15"
                                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                          }`}
                        >
                          {isPast ? "✓" : idx + 1}
                        </div>
                        {!isLast && (
                          <div
                            className={`w-0.5 flex-1 my-1 min-h-4 ${
                              isPast ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"
                            }`}
                          />
                        )}
                      </div>
                      <div className="pb-3 min-w-0 flex-1">
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                          {p.label}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                          {isPast ? "Completed" : isCurrent ? p.description : "Upcoming"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Quick Script & Brief Reference Drawer inside Rail */}
            <div className="p-3.5 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-bg-canvas)] space-y-2.5">
              <button
                type="button"
                onClick={() => setRailScriptExpanded(prev => !prev)}
                className="w-full flex items-center justify-between text-xs font-bold text-zinc-900 dark:text-zinc-100 font-display cursor-pointer"
              >
                <span>Script &amp; Brief Assets</span>
                {railScriptExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-400" />}
              </button>

              {railScriptExpanded && (
                <div className="space-y-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-zinc-900 text-zinc-100 text-xs font-serif italic leading-relaxed border border-zinc-800">
                    &ldquo;They told you impossible is a standard. We tell you it&apos;s a starting line. When the whistle blows in Surulere, the world listens. Nike: Just Do It.&rdquo;
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText("They told you impossible is a standard. We tell you it's a starting line. When the whistle blows in Surulere, the world listens. Nike: Just Do It.");
                        setBriefScriptCopied(true);
                        setTimeout(() => setBriefScriptCopied(false), 2000);
                      }}
                      className="flex-1 h-7.5 px-2.5 rounded-lg text-[11px] font-semibold border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{briefScriptCopied ? "Copied!" : "Copy Script"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWorkspaceTab("brief")}
                      className="h-7.5 px-2.5 rounded-lg text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                    >
                      Full Brief →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Decline Confirmation Modal (modal-decline-confirm) */}
      <AnimatePresence>
        {showDeclineModal && (
          <Modal onClose={() => setShowDeclineModal(false)}>
            <motion.div
              initial={{ y: 20, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.95 }}
              className="modal-decline-confirm w-full max-w-sm rounded-[var(--radius-lg)] p-6 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">
                Cancel this booking?
              </h3>
              <p className="text-xs sm:text-sm font-body leading-relaxed text-zinc-600 dark:text-zinc-400 mb-6">
                The client will be refunded and you won&apos;t be paid. Cancelling affects your rating and visibility on Monologg.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  className="flex-1 h-11 text-xs font-semibold"
                  onClick={() => setShowDeclineModal(false)}
                >
                  Keep booking
                </Button>
                <button
                  type="button"
                  className="flex-1 h-11 px-4 rounded-xl text-xs font-semibold border border-red-500 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                  onClick={() => {
                    if (selectedCheckinToDecline) {
                      appStateSync.cancelBookingFromCheckin(selectedCheckinToDecline.bookingId, "Performer declined check-in milestone");
                      setCheckins(appStateSync.getAvailabilityCheckins());
                      const synced = appStateSync.getOrderMessages(curOrderId) as ExtendedOrderMessage[];
                      setMessages(prev => {
                        const merged = [...prev];
                        for (const sm of synced) {
                          if (!merged.some(m => m.id === sm.id)) {
                            merged.push(sm);
                          }
                        }
                        return merged;
                      });
                    }
                    setShowDeclineModal(false);
                  }}
                >
                  Yes, cancel booking
                </button>
              </div>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ════════ MODALS ════════ */}

      {/* Submit Deliverable Modal (Dual Mode: Digital Files vs Onsite PIN Handshake) */}
      <AnimatePresence>
        {showSubmitModal && (
          <Modal onClose={() => setShowSubmitModal(false)} strength="strong">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h3 className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {deliverableTab === "onsite" ? "Verify Live Appearance" : "Submit Deliverable"}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Starts the 48-hour client review window</p>
                </div>
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab Switcher */}
              <div className="px-6 pt-4">
                <div className="flex items-center p-1 rounded-xl gap-1" style={{ background: "var(--color-bg-elevated)" }}>
                  <button
                    onClick={() => setDeliverableTab("online")}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${deliverableTab === "online" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"}`}
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    Digital Files
                  </button>
                  <button
                    onClick={() => setDeliverableTab("onsite")}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${deliverableTab === "onsite" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"}`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Onsite Gig
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 space-y-4">

                {/* ── TAB: Digital Files ── */}
                {deliverableTab === "online" && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".mp3,.mp4,.wav,.pdf,.zip,audio/*,video/*"
                      onChange={handleFileChange}
                    />

                    {stagedFile ? (
                      <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0 shadow-sm">
                            <FileText className="w-5 h-5 text-white dark:text-zinc-900" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{stagedFile.name}</div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                              <span className="font-mono">{stagedFile.size}</span>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Ready for delivery
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/70 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => setStagedFile(null)}
                            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                            aria-label="Remove staged file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                        onDragLeave={() => setIsDraggingFile(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) {
                            const sizeMb = (file.size / 1048576).toFixed(1);
                            const isImg = file.type.startsWith("image/");
                            setStagedFile({ name: file.name, size: `${sizeMb} MB`, type: isImg ? "image" : "file" });
                          }
                        }}
                        onClick={() => fileInputRef.current ? fileInputRef.current.click() : setStagedFile({ name: "Nike_VO_Final_v1.mp3", size: "8.4 MB", type: "file" })}
                        className={`border-2 border-dashed rounded-2xl flex flex-col items-center py-8 px-4 cursor-pointer transition-all text-center group ${
                          isDraggingFile
                            ? "border-[#B91C1C] bg-red-50/20"
                            : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 bg-zinc-50/50 dark:bg-zinc-800/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-800 shadow-2xs border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                          <UploadCloud className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                        </div>
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                          Drop file or <span className="underline underline-offset-2 hover:text-[#B91C1C]">browse</span>
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">MP3, MP4, WAV, PDF, ZIP · Max 500MB</p>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setStagedFile({ name: "Nike_VO_Final_v1.mp3", size: "8.4 MB", type: "file" }); }}
                          className="mt-3.5 px-3 py-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                        >
                          Use demo file
                        </button>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Notes (optional)</label>
                      <textarea
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 resize-none transition-all"
                        rows={2}
                        value={onlineNotes}
                        onChange={e => setOnlineNotes(e.target.value)}
                        placeholder="Any delivery notes for the client…"
                      />
                    </div>
                  </>
                )}

                {/* ── TAB: Onsite Gig (Streamlined auto-verified chip + 4 Discrete OTP Boxes) ── */}
                {deliverableTab === "onsite" && (
                  <>
                    <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0 animate-pulse" />
                      <div className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
                        <span className="font-semibold">Presence auto-verified: </span>
                        <span>Your venue location and arrival timestamp are automatically recorded for proof of attendance.</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/80">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Client Verification Code</label>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-200/70 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-semibold">4 digits</span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 leading-relaxed">
                        Ask <strong>{clientOrg}</strong> for their 4-digit code upon arrival to confirm your check-in.
                      </p>

                      {/* 4 discrete auto-advancing OTP digit boxes */}
                      <div className="flex items-center justify-center gap-3 my-2">
                        {[0, 1, 2, 3].map((idx) => {
                          const val = pinEntry[idx] || "";
                          const isMatched = pinEntry.length === 4 && pinEntry === CLIENT_GENERATED_PIN;
                          const isInvalid = pinEntry.length === 4 && pinEntry !== CLIENT_GENERATED_PIN;
                          return (
                            <input
                              key={idx}
                              ref={pinDigitRefs[idx]}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={1}
                              value={val}
                              aria-label={`Digit ${idx + 1} of verification code`}
                              onChange={(e) => {
                                const char = e.target.value.replace(/\D/g, "").slice(-1);
                                const chars = pinEntry.padEnd(4, " ").split("");
                                chars[idx] = char || " ";
                                const next = chars.join("").trimEnd();
                                setPinEntry(next);
                                if (char && idx < 3) {
                                  pinDigitRefs[idx + 1].current?.focus();
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Backspace") {
                                  if (!val && idx > 0) {
                                    pinDigitRefs[idx - 1].current?.focus();
                                  } else {
                                    const chars = pinEntry.padEnd(4, " ").split("");
                                    chars[idx] = " ";
                                    setPinEntry(chars.join("").trimEnd());
                                  }
                                }
                              }}
                              onPaste={(e) => {
                                e.preventDefault();
                                const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
                                setPinEntry(pasted);
                                const targetIdx = Math.min(pasted.length, 3);
                                pinDigitRefs[targetIdx].current?.focus();
                              }}
                              className={`w-14 h-14 rounded-2xl border text-center font-mono font-bold text-2xl transition-all focus:outline-none ${
                                isMatched
                                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20"
                                  : isInvalid
                                  ? "border-red-400 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 ring-2 ring-red-400/20"
                                  : val
                                  ? "border-zinc-800 dark:border-zinc-200 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 ring-1 ring-zinc-800/10 shadow-xs"
                                  : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-600 focus:border-zinc-900 dark:focus:border-white focus:ring-2 focus:ring-zinc-900/10"
                              }`}
                            />
                          );
                        })}
                      </div>

                      {pinEntry.length === 4 && pinEntry === CLIENT_GENERATED_PIN ? (
                        <div className="flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl px-3 border border-emerald-200/80 dark:border-emerald-800/60 mt-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Code verified with {clientOrg}</span>
                        </div>
                      ) : pinEntry.length === 4 ? (
                        <div className="flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50/80 dark:bg-red-950/40 rounded-xl px-3 border border-red-200/80 dark:border-red-800/60 mt-2">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                          <span>Incorrect code. Please ask {clientOrg} to confirm.</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center pt-2">
                          The client can find this 4-digit code in their active Order Room.
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Performance notes (optional)</label>
                      <textarea
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 resize-none transition-all"
                        rows={2}
                        value={onsiteNotes}
                        onChange={e => setOnsiteNotes(e.target.value)}
                        placeholder="e.g. Delivered 45-min headline set, full audience."
                      />
                    </div>
                  </>
                )}

                {/* Escrow Guarantee note */}
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl border border-emerald-100 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 text-xs text-zinc-700 dark:text-zinc-300">
                  <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    Submitting activates your <strong>48-hour inspection window</strong>. If uncontested, <strong className="font-mono font-bold text-emerald-700 dark:text-emerald-300">₦111,600 net</strong> (₦120,000 escrow minus 7% platform fee) auto-releases to your balance.
                  </div>
                </div>

                {/* Modal action buttons */}
                <div className="flex gap-2.5 pt-1">
                  <Button variant="secondary" className="flex-1 h-11 text-sm font-semibold" onClick={() => setShowSubmitModal(false)}>
                    Cancel
                  </Button>
                  <button
                    className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 shadow-xs ${
                      deliverableTab === "onsite" && pinEntry !== CLIENT_GENERATED_PIN
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 cursor-not-allowed"
                        : "text-white hover:opacity-95 active:scale-[0.98] cursor-pointer"
                    }`}
                    style={
                      deliverableTab === "onsite" && pinEntry !== CLIENT_GENERATED_PIN
                        ? undefined
                        : { background: "#B91C1C" }
                    }
                    onClick={deliverableTab === "onsite" ? handleSubmitOnsiteEvidence : handleSubmitOnlineDeliverable}
                    disabled={deliverableTab === "onsite" && pinEntry !== CLIENT_GENERATED_PIN}
                  >
                    {deliverableTab === "onsite" ? "Verify Check-In" : "Submit Deliverable"}
                  </button>
                </div>
              </div>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Release Payment Modal */}
      <AnimatePresence>
        {showReleaseModal && (
          <Modal onClose={() => setShowReleaseModal(false)} strength="strong">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl p-6 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-display text-lg font-semibold text-center mb-1 text-zinc-900 dark:text-zinc-100">Release Payment?</h3>
              <p className="text-sm text-center text-zinc-500 dark:text-zinc-400 mb-5">
                This will transfer <strong className="text-zinc-900 dark:text-zinc-100">₦120,000</strong> from escrow to {talentName}.
              </p>
              <div className="p-3.5 rounded-xl mb-5 space-y-1.5 text-xs border border-zinc-200 dark:border-zinc-700/80" style={{ background: "var(--color-bg-elevated)" }}>
                <div className="flex justify-between">
                  <span style={{ color: "var(--color-text-secondary)" }}>Base rate</span>
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">₦120,000</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--color-text-secondary)" }}>Platform fee (7%)</span>
                  <span className="font-mono text-zinc-500 dark:text-zinc-400 font-medium">-₦8,400</span>
                </div>
                <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1" />
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-zinc-900 dark:text-zinc-100">Performer receives</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">₦111,600</span>
                </div>
              </div>
              <div className="flex gap-2.5">
                <Button variant="secondary" className="flex-1 h-10 text-sm" onClick={() => setShowReleaseModal(false)}>Cancel</Button>
                <button
                  className="flex-1 h-10 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-95 shadow-sm active:scale-[0.98] cursor-pointer"
                  style={{ background: "#5B21B6" }}
                  onClick={handleAutoRelease}
                >
                  Confirm Release
                </button>
              </div>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Request Revision Modal */}
      <AnimatePresence>
        {showRevisionModal && (
          <Modal onClose={() => setShowRevisionModal(false)} strength="strong">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl p-6 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                <h3 className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">Request Revision</h3>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">The inspection timer pauses and the order returns to the performer.</p>
              <textarea
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none resize-none mb-4"
                rows={4}
                value={revisionNotes}
                onChange={e => setRevisionNotes(e.target.value)}
                placeholder="What revisions are needed?"
              />
              <div className="flex gap-2.5">
                <Button variant="secondary" className="flex-1 h-10 text-sm" onClick={() => setShowRevisionModal(false)}>Cancel</Button>
                <Button
                  className="flex-1 h-10 text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={handleRequestRevision}
                  disabled={!revisionNotes.trim()}
                >
                  Send Request
                </Button>
              </div>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Dispute Modal */}
      <AnimatePresence>
        {showDisputeModal && (
          <Modal onClose={() => setShowDisputeModal(false)} strength="strong">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl p-6 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-500" />
              </div>
              <h3 className="font-display text-lg font-semibold text-center mb-1 text-zinc-900 dark:text-zinc-100">Raise a Dispute</h3>
              <p className="text-sm text-center text-zinc-500 dark:text-zinc-400 mb-4">
                Our mediation team will review order evidence. Escrow stays locked until resolved.
              </p>
              <textarea
                className="w-full px-4 py-3 rounded-xl text-sm border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-red-500/30"
                rows={4}
                placeholder="Describe the issue in detail…"
              />
              <div className="flex gap-2.5">
                <Button variant="secondary" className="flex-1 h-10 text-sm" onClick={() => setShowDisputeModal(false)}>Cancel</Button>
                <button
                  type="button"
                  className="flex-1 h-10 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                  onClick={() => setShowDisputeModal(false)}
                >
                  Submit
                </button>
              </div>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Order Details Modal (Clean, responsive, performer doesn't see handshake code) ── */}
      <AnimatePresence>
        {showOrderInfoModal && (
          <Modal onClose={() => setShowOrderInfoModal(false)}>
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <div>
                  <h3 className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">Order Details</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{orderTitle} · {curOrderId}</p>
                </div>
                <button
                  onClick={() => setShowOrderInfoModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="px-5 sm:px-6 py-4 space-y-4 overflow-y-auto">

                {/* 1. Counterparty Profile Card (Mobile Parity with Desktop Inspector Rail) */}
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <Avatar
                      size="sm"
                      className="w-10 h-10 text-xs font-bold shrink-0"
                      background={role === "talent" ? "rgba(91, 33, 182, 0.12)" : "rgba(185, 28, 28, 0.12)"}
                      color={role === "talent" ? "#5B21B6" : "#B91C1C"}
                    >
                      {role === "talent" ? clientInitials : talentInitials}
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {role === "talent" ? clientOrg : talentName}
                        </span>
                        <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                        <span>{role === "talent" ? "Verified Client" : "Verified Performer"}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5 text-amber-500 font-semibold">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          4.9
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200/80 dark:border-zinc-800 text-[11px]">
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400 block">Location</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">Lagos, NG</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400 block">Avg. Response</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">&lt; 1 hour</span>
                    </div>
                  </div>
                </div>

                {/* 2. Role-Accurate Escrow & Payout Card */}
                <div
                  className="p-4 rounded-xl"
                  style={{
                    background: paymentReleased ? "var(--color-success-bg)" : "var(--color-bg-elevated)",
                    border: `1px solid ${paymentReleased ? "var(--color-success)" : "var(--color-hairline)"}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {role === "client" ? "Escrow Deposit" : "Net Take-Home"}
                    </span>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                      style={{
                        background: paymentReleased ? "var(--color-success-bg)" : "rgba(16,185,129,0.12)",
                        color: "var(--color-success)",
                      }}
                    >
                      <Shield className="w-3 h-3 text-emerald-600" />
                      {paymentReleased ? "Released" : "100% Secured"}
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">
                    {role === "client" ? "₦134,400" : "₦111,600"}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    {paymentReleased
                      ? `Transferred to ${talentName}.`
                      : "Funds are held securely in escrow by Paystack and auto-release 48 hours after delivery or upon client approval."}
                  </p>
                </div>

                {/* Project Lifecycle Phases */}
                <div>
                  <div className="text-[11px] font-semibold tracking-normal text-zinc-500 dark:text-zinc-300 mb-2.5">Project phases</div>
                  <div className="space-y-2">
                    {PHASES.map((p, idx) => {
                      const isPast = idx < phaseIndex;
                      const isCurrent = p.id === phase;
                      return (
                        <div
                          key={p.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isCurrent
                              ? "bg-zinc-50/90 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-600 shadow-2xs"
                              : isPast
                                ? "bg-white dark:bg-zinc-900/60 border-zinc-100 dark:border-zinc-800"
                                : "bg-white dark:bg-zinc-900/40 border-zinc-100/70 dark:border-zinc-800/50 opacity-60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                  isPast
                                    ? "bg-emerald-600 text-white"
                                    : isCurrent
                                      ? (role === "talent" ? "bg-[#B91C1C] text-white" : "bg-[#5B21B6] text-white")
                                      : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
                                }`}
                              >
                                {isPast ? "✓" : idx + 1}
                              </span>
                              <span className={`text-xs font-semibold truncate ${isCurrent ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-700 dark:text-zinc-300"}`}>
                                {p.label}
                              </span>
                            </div>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                                isPast
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                                  : isCurrent
                                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-semibold"
                                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-400"
                              }`}
                            >
                              {isPast ? "Completed" : isCurrent ? (phase === "review" ? formatCountdown(timerSeconds) : "In Progress") : "Upcoming"}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 pl-7 leading-relaxed">
                            {p.id === "briefing" && "Scope and requirements agreed."}
                            {p.id === "deliverables" && (isOnsite ? "Live performance & onsite check-in." : "Deliverable submission & files staged.")}
                            {p.id === "review" && "48-hour client review window."}
                            {p.id === "complete" && "Escrow payout released to wallet balance."}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Onsite Arrival Code: VISIBLE TO CLIENT ONLY */}
                {isOnsite && role === "client" && (
                  <div className="p-3.5 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-[#5B21B6] dark:text-purple-400" />
                        Arrival Verification Code
                      </span>
                      <span className="font-mono text-sm font-bold tracking-widest px-2.5 py-0.5 rounded-lg bg-white dark:bg-zinc-900 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 shadow-2xs">
                        {CLIENT_GENERATED_PIN}
                      </span>
                    </div>
                    <p className="text-xs text-purple-800/80 dark:text-purple-300">
                      Share this 4-digit code with {talentName} upon arrival to verify attendance.
                    </p>
                  </div>
                )}

                {/* Streamlined Payment Summary */}
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 space-y-1.5 text-xs">
                  <div className="text-[11px] font-semibold tracking-normal text-zinc-500 dark:text-zinc-300 mb-1">
                    {role === "client" ? "Escrow deposit summary" : "Payout summary"}
                  </div>
                  <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                    <span>Base rate</span>
                    <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">₦120,000</span>
                  </div>
                  {role === "client" ? (
                    <>
                      <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                        <span>Escrow protection fee (12%)</span>
                        <span className="font-mono text-zinc-700 dark:text-zinc-300 font-medium">+₦14,400</span>
                      </div>
                      <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1" />
                      <div className="flex justify-between items-center font-semibold text-zinc-900 dark:text-zinc-100">
                        <span>Total deposited</span>
                        <span className="font-mono text-[#5B21B6] dark:text-purple-400 text-sm font-bold">₦134,400</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                        <span>Platform fee (7%)</span>
                        <span className="font-mono text-zinc-500 dark:text-zinc-400 font-medium">-₦8,400</span>
                      </div>
                      <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1" />
                      <div className="flex justify-between items-center font-semibold text-zinc-900 dark:text-zinc-100">
                        <span>You receive</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm font-bold">₦111,600</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Participants */}
                <div>
                  <div className="text-[11px] font-semibold tracking-normal mb-2 text-zinc-500 dark:text-zinc-300">Participants</div>
                  <div className="space-y-2">
                    {[
                      { name: talentName, role: "Performer", initials: talentInitials, color: "#B91C1C", bg: "rgba(185, 28, 28, 0.12)" },
                      { name: clientOrg, role: "Client", initials: clientInitials, color: "#5B21B6", bg: "rgba(91, 33, 182, 0.12)" },
                    ].map((p, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <Avatar size="sm" className="w-7 h-7 text-xs font-semibold shrink-0" background={p.bg} color={p.color}>
                          {p.initials}
                        </Avatar>
                        <div>
                          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                            {p.name}
                            <Shield className="w-3 h-3 text-emerald-600" />
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{p.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
