import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Logo } from "../components/ui/Logo";
import { EASE_OUT, DURATION_MED, DURATION_SLOW } from "../../lib/motionTokens";
import { apiClient } from "../../lib/api-client";
import { appStateSync } from "../../lib/state-sync";
import { track } from "../../lib/tracker";
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  Video,
  Check,
  UploadCloud,
  Plus,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  X,
  Calendar as CalendarIcon,
  MapPin,
  Drama,
  AudioLines,
  Laugh,
  Headphones,
  Trash2,
  ShieldAlert,
  RotateCcw,
  Shield,
  FileText,
} from "lucide-react";

const DEFAULT_STYLE_TAGS = ["Warm Texture", "Conversational", "Expressive", "High Energy"];
const TAGGING_POLL_INTERVAL_MS = 1000;

// The 6 Craft Categories from inspiration (singular for individual performer profiles)
const NICHE_CATEGORIES = [
  { id: "actors", legacyId: "actor", label: "Actor", icon: Drama },
  { id: "public_speakers", legacyId: "speaker", label: "Public speaker", icon: AudioLines },
  { id: "comperes", legacyId: "host", label: "Compere", icon: Mic },
  { id: "comedians", legacyId: "comedian", label: "Comedian", icon: Laugh },
  { id: "artists", legacyId: "musician", label: "Artist", icon: Headphones },
  { id: "creators", legacyId: "creator", label: "Creator", icon: Video },
];

const GENDER_OPTIONS = ["Female", "Male"];

// Nigerian Locations — clean city names with state associations for intelligent filtering
interface LocationItem {
  city: string;
  state: string;
}

const NIGERIAN_LOCATIONS: LocationItem[] = [
  { city: "Ikeja", state: "Lagos" },
  { city: "Lekki", state: "Lagos" },
  { city: "Victoria Island", state: "Lagos" },
  { city: "Yaba", state: "Lagos" },
  { city: "Surulere", state: "Lagos" },
  { city: "Ajah", state: "Lagos" },
  { city: "Maryland", state: "Lagos" },
  { city: "Abuja", state: "Federal Capital Territory FCT" },
  { city: "Maitama", state: "Abuja FCT" },
  { city: "Wuse 2", state: "Abuja FCT" },
  { city: "Gwarinpa", state: "Abuja FCT" },
  { city: "Port Harcourt", state: "Rivers" },
  { city: "Ibadan", state: "Oyo" },
  { city: "Benin City", state: "Edo" },
  { city: "Enugu", state: "Enugu" },
  { city: "Asaba", state: "Delta" },
  { city: "Warri", state: "Delta" },
  { city: "Calabar", state: "Cross River" },
  { city: "Kano", state: "Kano" },
  { city: "Uyo", state: "Akwa Ibom" },
  { city: "Abeokuta", state: "Ogun" },
  { city: "Jos", state: "Plateau" },
  { city: "Owerri", state: "Imo" },
  { city: "Ilorin", state: "Kwara" },
  { city: "Akure", state: "Ondo" },
  { city: "Osogbo", state: "Osun" },
  { city: "Awka", state: "Anambra" },
  { city: "Onitsha", state: "Anambra" },
];

const DEFAULT_SUMMARIES: Record<string, string> = {
  actors:
    "Dynamic and expressive screen actor with commanding emotional range, natural comedic timing, and resonant vocal presence. Well-suited for dramatic feature films, commercial voice-overs, and stage productions.",
  public_speakers:
    "Charismatic keynote speaker with articulate vocal projection, authoritative cadence, and deep narrative resonance. Inspires and commands diverse live and virtual audiences with structured storytelling.",
  comperes:
    "Vibrant master of ceremonies and compere with high crowd engagement, spontaneous wit, and seamless stage transition mastery across corporate galas and entertainment shows.",
  comedians:
    "Sharp observational comedy performer with relatable punchlines, physical comedic delivery, and quick improvisational crowd timing.",
  artists:
    "Versatile sonic artist with soulful vocal texture, distinctive lyrical phrasing, and emotive delivery across acoustic and studio productions.",
  creators:
    "Engaging digital creator with rapid visual storytelling, infectious on-camera energy, and high audience retention hooks for modern campaigns.",
};

interface RateCardItem {
  id: string;
  title: string;
  description: string;
  price: string;
  delivery: string;
}

const ONBOARDING_DRAFT_KEY = "monologg_creator_onboarding_draft";

interface CreatorOnboardingDraft {
  step: number;
  gender: string;
  dob: string;
  location: string;
  selectedNiche: string | null;
  tags: string[];
  aiSummary: string;
  rateCards: RateCardItem[];
}

function loadSavedOnboardingDraft(): CreatorOnboardingDraft | null {
  try {
    if (typeof window === "undefined") return null;
    if (import.meta.env.MODE === "test") return null;
    const raw = window.localStorage.getItem(ONBOARDING_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function CreatorOnboarding() {
  const savedDraft = useMemo(() => loadSavedOnboardingDraft(), []);

  // Step 1: Personal Details (Gender, DOB, Location)
  // Step 2: Craft (6 Categories)
  // Step 3: Showcase Reel Upload (Anti-AI)
  // Step 4: Analysing (Thespian AI)
  // Step 5: Tags & AI Summary
  // Step 6: Rate Cards
  // Step 7: Connect your calendar (Google Calendar Sync)
  // Step 8: Performer Terms & Payout Agreement
  const [step, setStep] = useState(() => savedDraft?.step ?? 1);

  // Step 7: Connect your calendar State
  const currentUser = appStateSync.getLoggedInUser();
  const initialCalendar = appStateSync.getCalendarSync();
  const [calendarState, setCalendarState] = useState<"initial" | "connected" | "error">(() => {
    return initialCalendar.connected ? "connected" : "initial";
  });
  const [connectedEmail, setConnectedEmail] = useState<string>(() => {
    return initialCalendar.email || currentUser?.email || "alex.morgan@gmail.com";
  });
  const [connectingCalendar, setConnectingCalendar] = useState(false);

  // Step 1: Personal Details
  const [gender, setGender] = useState(() => savedDraft?.gender ?? "Female");
  const [dob, setDob] = useState(() => savedDraft?.dob ?? "2000-05-15");
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarViewYear, setCalendarViewYear] = useState(2000);
  const [calendarViewMonth, setCalendarViewMonth] = useState(4); // May (0-indexed)

  const [location, setLocation] = useState(() => savedDraft?.location ?? "Ikeja");
  const [locationInput, setLocationInput] = useState(() => savedDraft?.location ?? "Ikeja");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Step 2: Craft Selection
  const [selectedNiche, setSelectedNiche] = useState<string | null>(() => savedDraft?.selectedNiche ?? "actors");

  // Step 3: Showcase Reel Upload
  const [file, setFile] = useState<File | null>(null);
  const [fileSizeError, setFileSizeError] = useState(false);
  const [antiAiCertified, setAntiAiCertified] = useState(true);

  // Step 5: AI Summary & Style Tags
  const [tags, setTags] = useState<string[]>(() => savedDraft?.tags ?? DEFAULT_STYLE_TAGS);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([
    "Conversational",
    "Expressive",
    "High Energy",
    "Deep Voice",
    "Commanding",
    "Narrative",
    "Character",
    "Nuanced",
    "Vibrant",
  ]);
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
  const [editingTagValue, setEditingTagValue] = useState("");
  const [newTagInput, setNewTagInput] = useState("");
  const [aiSummary, setAiSummary] = useState(() => savedDraft?.aiSummary ?? DEFAULT_SUMMARIES.actors);

  // Step 6: Rate Cards State (Alpha limit: max 2 rate cards)
  const [rateCards, setRateCards] = useState<RateCardItem[]>(() => savedDraft?.rateCards ?? [
    {
      id: "card-1",
      title: "Feature Film Audition",
      description:
        "Full scene read and audition tape delivery with 2 distinct takes, recorded in studio lighting with clean audio.",
      price: "45,000",
      delivery: "24 Hours",
    },
  ]);
  const [refiningCardId, setRefiningCardId] = useState<string | null>(null);

  // Auto-save draft progress so the user can carry on from where they left off
  useEffect(() => {
    try {
      window.localStorage.setItem(
        ONBOARDING_DRAFT_KEY,
        JSON.stringify({
          step,
          gender,
          dob,
          location,
          selectedNiche,
          tags,
          aiSummary,
          rateCards,
        }),
      );
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, [step, gender, dob, location, selectedNiche, tags, aiSummary, rateCards]);

  // Step 8: Performer Terms & Payout Agreement State
  const initialAgreement = appStateSync.getPerformerAgreement();
  const [termsAccepted, setTermsAccepted] = useState(initialAgreement.accepted);

  const [taggingFailed, setTaggingFailed] = useState(false);
  const mediaAssetIdRef = useRef<string | null>(null);
  const navigate = useNavigate();

  // Calendar handlers
  const handleConnectCalendar = () => {
    setConnectingCalendar(true);
    setTimeout(() => {
      setConnectingCalendar(false);
      const email = currentUser?.email || "alex.morgan@gmail.com";
      appStateSync.setCalendarSync({
        connected: true,
        email,
        provider: "google",
        lastSyncedAt: new Date().toISOString(),
      });
      setConnectedEmail(email);
      setCalendarState("connected");
    }, 450);
  };

  const handleDisconnectCalendar = () => {
    appStateSync.setCalendarSync({
      connected: false,
      email: undefined,
      provider: undefined,
    });
    setCalendarState("initial");
  };

  const handleFinishOnboarding = () => {
    if (!termsAccepted) return;

    // Store acceptance with a timestamp
    appStateSync.setPerformerAgreement(true);

    for (const card of rateCards) {
      if (card.title.trim()) {
        try {
          appStateSync.addService({
            title: card.title,
            price: `₦${Number(card.price.replace(/\D/g, "") || "45000").toLocaleString("en-US")}`,
            delivery: card.delivery,
            bookings: 0,
          });
        } catch {
          // ignore cap
        }
      }
    }
    appStateSync.updateTalentProfile({
      location: location ? `${location}, Nigeria` : "Lagos, Nigeria",
      bio: aiSummary || undefined,
      tags: tags.length > 0 ? tags : undefined,
      gender,
      dob,
      craft: selectedNiche || "actors",
      performanceSummary: aiSummary || undefined,
      craftTags: tags.length > 0 ? tags : undefined,
    });
    try {
      window.localStorage.removeItem(ONBOARDING_DRAFT_KEY);
    } catch {
      // ignore
    }
    navigate("/dashboard");
  };

  // Sync AI summary when niche changes
  useEffect(() => {
    const key = selectedNiche || "actors";
    const mapped = DEFAULT_SUMMARIES[key] || DEFAULT_SUMMARIES.actors;
    setAiSummary(mapped);
  }, [selectedNiche]);

  useEffect(() => {
    track("onboarding_step_viewed", { stepKey: `step_${step}`, userType: "TALENT" });
  }, [step]);

  const handleNext = () => {
    track("onboarding_step_completed", { stepKey: `step_${step}`, userType: "TALENT" });
    setStep((s) => s + 1);
  };
  const handleBack = () => {
    if (step === 5) {
      setStep(3);
    } else {
      setStep((s) => s - 1);
    }
  };

  // Tag Handlers
  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed || tags.length >= 7 || tags.includes(trimmed)) return;
    setTags([...tags, trimmed]);
    setNewTagInput("");
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
    if (editingTagIndex === index) setEditingTagIndex(null);
  };

  const handleTagClick = (index: number, value: string) => {
    setEditingTagIndex(index);
    setEditingTagValue(value);
  };

  const handleTagEditConfirm = (index: number) => {
    const trimmed = editingTagValue.trim();
    if (trimmed && !tags.some((t, i) => t === trimmed && i !== index)) {
      setTags(tags.map((t, i) => (i === index ? trimmed : t)));
    }
    setEditingTagIndex(null);
  };

  const handleAddSuggestion = (suggestion: string) => {
    if (tags.length >= 7 || tags.includes(suggestion)) return;
    // Move from suggestions into active tags
    setTags([...tags, suggestion]);
    setSuggestedTags(suggestedTags.filter((t) => t !== suggestion));
  };

  const handleDeleteSuggestion = (e: React.MouseEvent, suggestion: string) => {
    e.stopPropagation();
    setSuggestedTags(suggestedTags.filter((t) => t !== suggestion));
  };

  // Rate Card Handlers
  const handleAddRateCard = () => {
    if (rateCards.length >= 2) return;
    const newCard: RateCardItem = {
      id: `card-${Date.now()}`,
      title: "Commercial Voice-Over / Cameo",
      description:
        "Professional 60-second voice track or cameo reading delivered in high-fidelity WAV format with up to 2 revisions.",
      price: "60,000",
      delivery: "2–3 Days",
    };
    setRateCards([...rateCards, newCard]);
  };

  const handleRemoveRateCard = (id: string) => {
    if (rateCards.length <= 1) return;
    setRateCards(rateCards.filter((card) => card.id !== id));
  };

  const handleUpdateRateCard = (id: string, field: keyof RateCardItem, val: string) => {
    setRateCards(
      rateCards.map((card) => {
        if (card.id !== id) return card;
        return { ...card, [field]: val };
      }),
    );
  };

  const handleRefineRateDescription = (cardId: string) => {
    setRefiningCardId(cardId);
    setTimeout(() => {
      setRateCards((prev) =>
        prev.map((card) => {
          if (card.id !== cardId) return card;
          const craftKey = selectedNiche || "actors";
          const refinedMap: Record<string, string> = {
            actors:
              "High-caliber dramatic or commercial audition reel with 2 distinct tonal interpretations, industry standard slate, clean audio mastering, and 24-hour turnaround.",
            public_speakers:
              "Keynote engagement delivery including pre-event consultation, audience-aligned thematic storytelling, customized presentation slides, and interactive Q&A moderating.",
            comperes:
              "Complete master-of-ceremonies event hosting with run-of-show synchronization, VIP introductions, impromptu crowd comedy, and dynamic stage coordination.",
            comedians:
              "Tailored comedic set featuring original observational humor, custom corporate/event brand-safe punchlines, and vibrant improvisational stage delivery.",
            artists:
              "Studio recording and creative vocal/audio performance delivered as raw stems and mixed WAV file with commercial broadcast license.",
            creators:
              "Full-service short-form video asset (9:16 vertical format) including organic brand integration, authentic performance hook, and rights-cleared delivery.",
          };
          return { ...card, description: refinedMap[craftKey] || card.description };
        }),
      );
      setRefiningCardId(null);
    }, 450);
  };

  // Upload and Job Polling
  async function handleUploadAndAnalyse() {
    if (!file) return;
    setTaggingFailed(false);
    setStep(4);

    if (apiClient.mode !== "live") return;

    try {
      const kind = file.type.startsWith("audio") ? "AUDIO" : "VIDEO";
      const { mediaAssetId } = await apiClient.uploadCreatorMedia(file, kind);
      mediaAssetIdRef.current = mediaAssetId;
    } catch {
      setTaggingFailed(true);
    }
  }

  useEffect(() => {
    if (step !== 4 || taggingFailed) return;

    if (apiClient.mode !== "live") {
      const timer = setTimeout(() => setStep(5), 3000);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    const poll = async () => {
      const mediaAssetId = mediaAssetIdRef.current;
      if (!mediaAssetId) return;
      const { taggingStatus } = await apiClient.getMediaTaggingStatus(mediaAssetId);
      if (cancelled) return;

      if (taggingStatus === "DONE") {
        const profile = await apiClient.getCreatorProfile();
        if (cancelled) return;
        setTags(profile.styleTags.length > 0 ? profile.styleTags : DEFAULT_STYLE_TAGS);
        setStep(5);
      } else if (taggingStatus === "FAILED") {
        setTaggingFailed(true);
      }
    };

    const interval = setInterval(poll, TAGGING_POLL_INTERVAL_MS);
    void poll();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [step, taggingFailed]);

  // Intelligent Location Filtering: user types city or state, system matches and presents clean city names
  const filteredCities = useMemo(() => {
    const q = locationInput.trim().toLowerCase();
    if (!q) return NIGERIAN_LOCATIONS.slice(0, 8);
    return NIGERIAN_LOCATIONS.filter(
      (item) => item.city.toLowerCase().includes(q) || item.state.toLowerCase().includes(q),
    );
  }, [locationInput]);

  // Calendar Helpers
  const daysInCurrentMonth = useMemo(() => {
    return new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();
  }, [calendarViewYear, calendarViewMonth]);

  const firstDayOfMonth = useMemo(() => {
    return new Date(calendarViewYear, calendarViewMonth, 1).getDay();
  }, [calendarViewYear, calendarViewMonth]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const handleSelectDay = (day: number) => {
    const mm = String(calendarViewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    setDob(`${calendarViewYear}-${mm}-${dd}`);
    setShowCalendar(false);
  };

  const rise = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: DURATION_MED, ease: EASE_OUT },
  };

  return (
    <div className="role-talent min-h-screen bg-[var(--color-bg-canvas)] flex flex-col w-full max-w-[480px] mx-auto relative overflow-hidden">
      {/* Top Progress Bar - 7 Content Steps: 1, 2, 3, 5, 6, 7, 8 (step 4 is Analysing) */}
      {step !== 4 && (
        <div className="px-5 pt-6 pb-3 flex items-center gap-3">
          <button
            aria-label="Go back"
            onClick={step === 1 ? () => navigate("/auth") : handleBack}
            className="w-10 h-10 -ml-1 flex items-center justify-center rounded-[var(--radius-full)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] active:scale-[0.94] transition-all cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center gap-1.5">
            {[1, 2, 3, 5, 6, 7, 8].map((s, idx) => {
              const currentIdx = step < 4 ? step - 1 : step - 2;
              const done = idx < currentIdx;
              const active = idx === currentIdx;
              return (
                <div key={s} className="flex-1 h-1.5 rounded-[var(--radius-full)] bg-[var(--color-bg-elevated)] overflow-hidden">
                  <motion.div
                    className="h-full rounded-[var(--radius-full)] bg-[var(--color-accent)]"
                    initial={false}
                    animate={{ width: active || done ? "100%" : "0%" }}
                    transition={{ duration: DURATION_SLOW, ease: EASE_OUT }}
                  />
                </div>
              );
            })}
          </div>
          <div className="w-10 text-right">
            <span className="text-[11px] font-mono text-[var(--color-text-tertiary)]">
              {step < 4 ? step : step - 1}/7
            </span>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── STEP 1: Personal Details (Gender, Date of Birth, Location) ── */}
        {step === 1 && (
          <motion.div key="step-personal" {...rise} className="flex-1 flex flex-col px-5 pb-6 overflow-y-auto">
            <div className="mt-4 mb-6">
              <h2 className="font-display text-[length:var(--font-size-2xl)] leading-[1.15] text-[var(--color-text-primary)] mb-2">
                Tell us about yourself
              </h2>
              <p className="font-body text-[15px] text-[var(--color-text-secondary)] leading-relaxed">
                Enter your basic details to personalize your profile.
              </p>
            </div>

            <div className="rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] shadow-[var(--shadow-card)] p-5 mb-6 space-y-5">
              {/* 1. Gender: Female and Male only */}
              <div>
                <label className="font-body text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-2">
                  Gender
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {GENDER_OPTIONS.map((g) => {
                    const isSelected = gender === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`h-11 px-4 rounded-[var(--radius-lg)] font-body text-sm font-semibold border text-center transition-all ${
                          isSelected
                            ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                            : "border-[var(--color-border-default)] bg-[var(--color-bg-surface-2)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-active)]"
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Date of Birth: calendar input only (no age display) */}
              <div className="relative">
                <label className="font-body text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-2">
                  Date of Birth
                </label>
                <button
                  type="button"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="w-full h-[52px] px-4 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface-2)] flex items-center gap-2.5 font-body text-sm text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors"
                >
                  <CalendarIcon className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                  <span className={dob ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)]"}>
                    {dob || "Select your birth date"}
                  </span>
                </button>

                {/* Interactive Custom Calendar Popover */}
                {showCalendar && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-2 p-3.5 rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] shadow-[var(--shadow-elevated)]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (calendarViewMonth === 0) {
                            setCalendarViewMonth(11);
                            setCalendarViewYear((y) => y - 1);
                          } else {
                            setCalendarViewMonth((m) => m - 1);
                          }
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-elevated)]"
                      >
                        <ChevronLeft className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      </button>

                      <div className="flex items-center gap-1.5">
                        <span className="font-body text-xs font-semibold text-[var(--color-text-primary)]">
                          {monthNames[calendarViewMonth]}
                        </span>
                        <select
                          value={calendarViewYear}
                          onChange={(e) => setCalendarViewYear(parseInt(e.target.value, 10))}
                          className="h-7 text-xs font-mono font-semibold rounded px-1 bg-[var(--color-bg-surface-2)] border border-[var(--color-hairline)] text-[var(--color-text-primary)]"
                        >
                          {Array.from({ length: 65 }, (_, i) => 2012 - i).map((yr) => (
                            <option key={yr} value={yr}>
                              {yr}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (calendarViewMonth === 11) {
                            setCalendarViewMonth(0);
                            setCalendarViewYear((y) => y + 1);
                          } else {
                            setCalendarViewMonth((m) => m + 1);
                          }
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-elevated)]"
                      >
                        <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-[var(--color-text-tertiary)] mb-1">
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                        <div key={d} className="py-1">
                          {d}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const mm = String(calendarViewMonth + 1).padStart(2, "0");
                        const dd = String(dayNum).padStart(2, "0");
                        const dateStr = `${calendarViewYear}-${mm}-${dd}`;
                        const isSelected = dob === dateStr;
                        return (
                          <button
                            key={dayNum}
                            type="button"
                            onClick={() => handleSelectDay(dayNum)}
                            className={`h-7 rounded-[var(--radius-sm)] text-xs font-mono transition-colors ${
                              isSelected
                                ? "bg-[var(--color-accent)] text-white font-bold"
                                : "text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]"
                            }`}
                          >
                            {dayNum}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* 3. Location: clean dropdown list filtering across states with placeholder "Search location..." */}
              <div className="relative">
                <label className="font-body text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-2">
                  Location
                </label>

                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-accent)]" />
                  <Input
                    className="pl-9 pr-8 h-[52px] text-sm"
                    value={locationInput}
                    onFocus={() => setShowLocationDropdown(true)}
                    onChange={(e) => {
                      setLocationInput(e.target.value);
                      setLocation(e.target.value);
                      setShowLocationDropdown(true);
                    }}
                    placeholder="Search location..."
                  />
                  {locationInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocationInput("");
                        setLocation("");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Location dropdown: city + state shown distinctly */}
                {showLocationDropdown && filteredCities.length > 0 && (
                  <div className="mt-1.5 p-1 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] shadow-[var(--shadow-elevated)] max-h-48 overflow-y-auto space-y-0.5 z-20 relative">
                    {filteredCities.map((item) => (
                      <button
                        key={item.city}
                        type="button"
                        onClick={() => {
                          setLocationInput(item.city);
                          setLocation(item.city);
                          setShowLocationDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-elevated)] transition-colors flex items-baseline justify-between gap-3"
                      >
                        <span className="text-sm font-body font-medium text-[var(--color-text-primary)]">{item.city}</span>
                        <span className="text-[11px] font-body text-[var(--color-text-tertiary)] shrink-0">{item.state}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto pt-6 sticky bottom-0 bg-gradient-to-t from-[var(--color-bg-canvas)] via-[var(--color-bg-canvas)] to-transparent pb-1">
              <Button onClick={handleNext} className="w-full">
                Continue
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: Craft Selection (The 6 Core Categories) ── */}
        {step === 2 && (
          <motion.div key="step-craft" {...rise} className="flex-1 flex flex-col px-5 pb-6 overflow-y-auto">
            <div className="mt-4 mb-6">
              <h2 className="font-display text-[length:var(--font-size-2xl)] leading-[1.15] text-[var(--color-text-primary)] mb-2">
                What best describes your craft?
              </h2>
              <p className="font-body text-[15px] text-[var(--color-text-secondary)] leading-relaxed">
                Select your primary craft to personalize your profile.
              </p>
            </div>

            {/* 6 Craft Categories Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {NICHE_CATEGORIES.map((niche) => {
                const selected =
                  selectedNiche === niche.id ||
                  selectedNiche === niche.legacyId ||
                  (selectedNiche === "actor" && niche.id === "actors");
                return (
                  <motion.button
                    key={niche.id}
                    onClick={() => setSelectedNiche(niche.id)}
                    whileTap={{ scale: 0.97 }}
                    className={`relative p-4 rounded-[var(--radius-lg)] border flex flex-col items-center justify-center text-center gap-2.5 min-h-[104px] transition-colors duration-[var(--duration-fast)] ${
                      selected
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                        : "border-[var(--color-hairline)] bg-[var(--color-bg-surface)] hover:border-[var(--color-border-strong)]"
                    }`}
                  >
                    <niche.icon
                      className={`w-6 h-6 transition-colors ${
                        selected ? "text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)]"
                      }`}
                    />
                    <span
                      className={`font-body text-[length:var(--font-size-sm)] font-semibold ${
                        selected ? "text-[var(--color-accent)]" : "text-[var(--color-text-primary)]"
                      }`}
                    >
                      {niche.label}
                    </span>
                    {selected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 22 }}
                        className="absolute top-2.5 right-2.5 w-5 h-5 bg-[var(--color-accent)] rounded-[var(--radius-full)] flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-[var(--color-accent-on)]" strokeWidth={3} />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-auto pt-6 sticky bottom-0 bg-gradient-to-t from-[var(--color-bg-canvas)] via-[var(--color-bg-canvas)] to-transparent pb-1">
              <Button onClick={handleNext} disabled={!selectedNiche} className="w-full">
                Continue
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: Upload Showcase Reel + Anti-AI Policy ── */}
        {step === 3 && (
          <motion.div key="step-reel" {...rise} className="flex-1 flex flex-col px-5 pb-6 overflow-y-auto">
            <div className="mt-4 mb-4">
              <h2 className="font-display text-[length:var(--font-size-2xl)] leading-[1.15] text-[var(--color-text-primary)] mb-2">
                Upload your showcase reel
              </h2>
              <p className="font-body text-[15px] text-[var(--color-text-secondary)] leading-relaxed">
                MP4, MOV, AVI — up to 150MB
              </p>
            </div>

            {/* Upload Zone */}
            <div
              className={`relative min-h-[200px] rounded-[var(--radius-xl)] border-2 border-dashed flex flex-col items-center justify-center p-6 text-center transition-colors ${
                fileSizeError
                  ? "border-[var(--color-error)] bg-[var(--color-error-bg)]"
                  : file
                  ? "border-[var(--color-success)] bg-[var(--color-success-bg)]"
                  : "border-[var(--color-border-strong)] bg-[var(--color-bg-surface)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
              }`}
            >
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => {
                  const selected = e.target.files?.[0] || null;
                  if (selected && selected.size > 150 * 1024 * 1024) {
                    setFileSizeError(true);
                    setFile(null);
                  } else {
                    setFileSizeError(false);
                    setFile(selected);
                  }
                }}
                accept="video/*,audio/*"
              />

              {fileSizeError ? (
                <>
                  <div className="w-14 h-14 rounded-[var(--radius-full)] bg-[var(--color-error-bg)] flex items-center justify-center mb-4">
                    <AlertTriangle className="w-6 h-6 text-[var(--color-error)]" />
                  </div>
                  <p className="font-body text-[15px] font-semibold text-[var(--color-error)]">
                    File too large
                  </p>
                  <p className="font-body text-[13px] text-[var(--color-text-secondary)] mt-1">
                    Maximum file size is 150MB. Please choose a smaller file.
                  </p>
                  <Button
                    variant="ghost"
                    className="h-9 mt-3 z-10 relative text-[var(--color-error)] opacity-100 hover:opacity-80"
                    onClick={() => { setFileSizeError(false); setFile(null); }}
                  >
                    Try again
                  </Button>
                </>
              ) : !file ? (
                <>
                  <div className="w-14 h-14 rounded-[var(--radius-full)] bg-[var(--color-accent-soft)] flex items-center justify-center mb-4">
                    <UploadCloud className="w-6 h-6 text-[var(--color-accent)]" />
                  </div>
                  <p className="font-body text-[15px] font-semibold text-[var(--color-text-primary)]">
                    Drag and drop here, or tap to browse
                  </p>
                  <p className="font-body text-[13px] text-[var(--color-text-tertiary)] mt-1">
                    Your reel is analysed to build your profile
                  </p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-[var(--radius-full)] bg-[var(--color-success-bg)] flex items-center justify-center mb-4">
                    <Video className="w-6 h-6 text-[var(--color-success)]" />
                  </div>
                  <p className="font-body text-[15px] font-semibold text-[var(--color-text-primary)]">{file.name}</p>
                  <p className="font-body text-[length:var(--font-size-xs)] text-[var(--color-text-secondary)] mt-1 tnum">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                  <Button
                    variant="ghost"
                    className="h-9 mt-2 z-10 relative text-[var(--color-error)] opacity-100 hover:opacity-80"
                    onClick={() => setFile(null)}
                  >
                    Remove
                  </Button>
                </>
              )}
            </div>

            {/* Anti-AI Policy Notice — below upload box */}
            <div className="mt-4 p-3.5 rounded-[var(--radius-lg)] bg-[var(--color-error-bg)] border border-[var(--color-error)]/25">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-[var(--color-error)] shrink-0 mt-0.5" />
                <p className="font-body text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  <span className="font-semibold text-[var(--color-error)]">Human performers only.</span>{" "}
                  AI-generated reels, deepfakes, or copied content will result in an account ban.
                </p>
              </div>
            </div>

            {/* Certification checkbox */}
            <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={antiAiCertified}
                onChange={(e) => setAntiAiCertified(e.target.checked)}
                className="w-4 h-4 rounded text-[var(--color-accent)] focus:ring-0 shrink-0"
              />
              <span className="font-body text-[12px] text-[var(--color-text-secondary)]">
                I confirm this reel is my own authentic performance.
              </span>
            </label>

            <div className="mt-auto pt-6 sticky bottom-0 bg-gradient-to-t from-[var(--color-bg-canvas)] via-[var(--color-bg-canvas)] to-transparent pb-1">
              <Button onClick={handleUploadAndAnalyse} disabled={!file || !antiAiCertified} className="w-full">
                Upload &amp; Analyse
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: Job Polling Simulation & Animation ── */}
        {step === 4 && (
          <motion.div
            key="step-analysing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center px-8 text-center"
          >
            <Logo className="h-5 w-auto absolute top-10" style={{ color: "var(--color-text-primary)" }} />

            {!taggingFailed ? (
              <>
                <div className="relative w-[120px] h-[120px] rounded-[var(--radius-full)] flex items-center justify-center bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] shadow-[var(--shadow-elevated)] mb-10">
                  <motion.div
                    className="absolute inset-0 rounded-[var(--radius-full)] border-2 border-[var(--color-accent)]"
                    animate={{ scale: [1, 1.14, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <Sparkles className="w-10 h-10 text-[var(--color-accent)]" />
                </div>

                <div className="w-[220px] h-1.5 rounded-[var(--radius-full)] bg-[var(--color-bg-elevated)] mb-6 overflow-hidden relative">
                  <motion.div
                    className="absolute top-0 bottom-0 left-0 w-1/3 rounded-[var(--radius-full)] bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent"
                    animate={{ x: [-90, 300] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                </div>

                <p className="font-display text-[19px] text-[var(--color-text-primary)] mb-3 leading-snug max-w-[300px]">
                  Thespian AI is analysing your reel to generate style tags…
                </p>
                <p className="font-body text-[length:var(--font-size-sm)] text-[var(--color-text-secondary)]">
                  This usually takes 15–45 seconds. Stay with us.
                </p>
              </>
            ) : (
              <>
                <div className="w-[120px] h-[120px] rounded-[var(--radius-full)] flex items-center justify-center bg-[var(--color-error-bg)] border border-[var(--color-hairline)] shadow-[var(--shadow-elevated)] mb-10">
                  <AlertTriangle className="w-10 h-10 text-[var(--color-error)]" />
                </div>
                <p className="font-display text-[19px] text-[var(--color-text-primary)] mb-3 leading-snug max-w-[300px]">
                  Style tagging didn&apos;t complete.
                </p>
                <p className="font-body text-[length:var(--font-size-sm)] text-[var(--color-text-secondary)] mb-6 max-w-[300px]">
                  Your reel is saved — we just couldn&apos;t generate tags this time. You can try again.
                </p>
                <Button onClick={() => setStep(3)} className="w-full max-w-[220px]">
                  Try again
                </Button>
              </>
            )}
          </motion.div>
        )}

        {/* ── STEP 5: AI Summary & Editable Style Tags + Deletable Suggestions ── */}
        {step === 5 && (
          <motion.div
            key="step-tags"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="flex-1 flex flex-col px-5 pb-6 overflow-y-auto"
          >
            <div className="flex flex-col items-center text-center mt-6 mb-6">
              <h2 className="font-display text-[26px] leading-[1.15] text-[var(--color-text-primary)] mb-2">
                Your style tags are ready.
              </h2>
              <p className="font-body text-[14px] text-[var(--color-text-secondary)] leading-relaxed max-w-[360px]">
                Based on your upload, Thespian AI has extracted your performance summary and style tags.
              </p>
            </div>

            {/* 1. Editable Performance Summary */}
            <div className="mb-5 rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] shadow-[var(--shadow-card)] p-4 space-y-3">
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block">
                Performance Summary
              </span>

              <textarea
                value={aiSummary}
                onChange={(e) => setAiSummary(e.target.value)}
                rows={3}
                className="w-full text-xs font-body leading-relaxed text-[var(--color-text-primary)] bg-[var(--color-bg-surface-2)] p-3 rounded-[var(--radius-md)] border border-[var(--color-hairline)] focus:border-[var(--color-accent)] outline-none resize-none"
                placeholder="Edit your performance summary..."
              />
              <div className="flex items-center justify-end text-[11px] text-[var(--color-text-tertiary)] pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const key = selectedNiche || "actors";
                    setAiSummary(DEFAULT_SUMMARIES[key] || DEFAULT_SUMMARIES.actors);
                  }}
                  className="hover:text-[var(--color-accent)] flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>
            </div>

            {/* 2. Profile Tags & Suggestions */}
            <div className="mb-6 rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] shadow-[var(--shadow-card)] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Profile Tags ({tags.length}/7)
                </span>
              </div>

              {/* Active Tags — always-visible × to remove, click tag text to edit inline */}
              <div className="flex flex-wrap gap-2 mb-4">
                {tags.map((tag, i) =>
                  editingTagIndex === i ? (
                    <input
                      key={i}
                      autoFocus
                      value={editingTagValue}
                      onChange={(e) => setEditingTagValue(e.target.value)}
                      onBlur={() => handleTagEditConfirm(i)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleTagEditConfirm(i); }
                        if (e.key === "Escape") setEditingTagIndex(null);
                      }}
                      className="h-8 px-3 rounded-[var(--radius-full)] bg-[var(--color-accent-soft)] border border-[var(--color-accent)] text-[var(--color-accent)] text-[13px] font-medium font-body outline-none min-w-[80px] max-w-[160px]"
                    />
                  ) : (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 h-8 pl-3.5 pr-2 rounded-[var(--radius-full)] bg-[var(--color-accent-soft)] border border-[var(--color-accent)] font-body text-[13px] font-medium text-[var(--color-accent)]"
                    >
                      <span
                        onClick={() => handleTagClick(i, tag)}
                        className="leading-none cursor-text"
                        title="Click to rename"
                      >{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(i)}
                        className="text-[var(--color-accent)] hover:opacity-60 transition-opacity ml-0.5"
                        title="Remove tag"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                )}
              </div>

              {/* Suggested Tags — always-visible + add button */}
              {suggestedTags.length > 0 && (
                <div className="pt-3 border-t border-[var(--color-hairline)] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-body uppercase tracking-wider font-semibold text-[var(--color-text-tertiary)]">
                      Suggested
                    </span>
                    {suggestedTags.length < 5 && (
                      <button
                        type="button"
                        onClick={() =>
                          setSuggestedTags([
                            "Warm Texture", "Conversational", "Expressive", "High Energy",
                            "Deep Voice", "Commanding", "Narrative", "Character", "Nuanced", "Vibrant",
                          ])
                        }
                        className="text-[10px] text-[var(--color-accent)] font-semibold hover:underline"
                      >
                        Restore All
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {suggestedTags.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        disabled={tags.length >= 7}
                        onClick={() => handleAddSuggestion(preset)}
                        className="flex items-center gap-1.5 h-8 pl-2.5 pr-3.5 rounded-[var(--radius-full)] bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)] font-body text-[13px] font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] disabled:opacity-40 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Custom Tag */}
              <div className="flex gap-2 pt-3 border-t border-[var(--color-hairline)] mt-3">
                <Input
                  placeholder="Add a custom tag..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="h-10 text-xs flex-1"
                  disabled={tags.length >= 7}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 text-xs shrink-0 px-3"
                  onClick={handleAddTag}
                  disabled={tags.length >= 7 || !newTagInput.trim()}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>
            </div>

            <div className="mt-auto pt-6 flex flex-col gap-3 sticky bottom-0 bg-gradient-to-t from-[var(--color-bg-canvas)] via-[var(--color-bg-canvas)] to-transparent pb-1">
              <Button onClick={handleNext} className="w-full">
                Looks great, continue
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep(3)}>
                Re-upload my reel
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 6: Set your Rate Cards (Max 2) + Three-line fee breakdown ── */}
        {step === 6 && (
          <motion.div key="step-rates" {...rise} className="flex-1 flex flex-col px-5 pb-6 overflow-y-auto">
            <div className="mt-4 mb-4">
              <h2 className="font-display text-[length:var(--font-size-2xl)] leading-[1.15] text-[var(--color-text-primary)] mb-2">
                Set your rate cards
              </h2>
              <p className="font-body text-[14px] text-[var(--color-text-secondary)] leading-relaxed">
                Create purchasable services for your profile. You can only create up to 2 rate cards.
              </p>
            </div>

            {/* Rate Cards List */}
            <div className="space-y-4 mb-6">
              {rateCards.map((card, index) => {
                const isRefining = refiningCardId === card.id;
                const numPrice = Number(card.price.replace(/\D/g, "")) || 0;
                const fee = Math.round(numPrice * 0.07);
                const net = numPrice - fee;

                return (
                  <div
                    key={card.id}
                    className="bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] shadow-[var(--shadow-card)] rounded-[var(--radius-xl)] p-5 relative overflow-hidden space-y-4"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[var(--color-accent)]" />

                    <div className="flex items-center justify-between border-b border-[var(--color-hairline)] pb-3">
                      <span className="font-body text-xs font-semibold text-[var(--color-text-secondary)]">
                        Rate Card {index + 1}
                      </span>
                      {rateCards.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRateCard(card.id)}
                          className="text-xs text-[var(--color-error)] hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>

                    {/* 1. Service Title */}
                    <div>
                      <label className="font-body text-[length:var(--font-size-xs)] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 block">
                        Booking Service Title
                      </label>
                      <Input
                        value={card.title}
                        onChange={(e) => handleUpdateRateCard(card.id, "title", e.target.value)}
                        placeholder="e.g. Feature Film Audition"
                      />
                    </div>

                    {/* 2. Service Description + Refine with Thespian AI */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-body text-[length:var(--font-size-xs)] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider block">
                          Service Description
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRefineRateDescription(card.id)}
                          className="text-xs font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          {isRefining ? "Refining..." : "Refine with Thespian AI"}
                        </button>
                      </div>
                      <textarea
                        value={card.description}
                        onChange={(e) => handleUpdateRateCard(card.id, "description", e.target.value)}
                        rows={2}
                        className="w-full text-xs font-body leading-relaxed text-[var(--color-text-primary)] bg-[var(--color-bg-surface-2)] p-3 rounded-[var(--radius-md)] border border-[var(--color-hairline)] focus:border-[var(--color-accent)] outline-none resize-none"
                        placeholder="Describe what clients receive with this booking..."
                      />
                    </div>

                    {/* 3. Price (Naira Only for Alpha) */}
                    <div>
                      <label className="font-body text-[length:var(--font-size-xs)] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 block">
                        Base Price (₦ NGN)
                      </label>
                      <div className="relative flex items-center">
                        <span
                          className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-semibold text-[length:var(--font-size-base)] pointer-events-none z-10"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          ₦
                        </span>
                        <Input
                          className="pl-9 pr-14 font-mono tnum w-full h-[54px] text-base"
                          value={card.price}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "");
                            handleUpdateRateCard(
                              card.id,
                              "price",
                              digits ? parseInt(digits, 10).toLocaleString("en-US") : "",
                            );
                          }}
                          placeholder="45,000"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-[var(--color-text-tertiary)] pointer-events-none">
                          NGN
                        </span>
                      </div>

                      {/* Three-line fee breakdown: Base rate, Platform fee (7%), You receive */}
                      {numPrice > 0 && (
                        <div className="mt-3 p-3 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface-2)] border border-[var(--color-hairline)] space-y-1.5 text-xs font-body">
                          <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                            <span>Base rate</span>
                            <span className="font-mono font-medium text-[var(--color-text-primary)]">₦{numPrice.toLocaleString("en-US")}</span>
                          </div>
                          <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                            <span>Platform fee (7%)</span>
                            <span className="font-mono text-zinc-500 font-medium">-₦{fee.toLocaleString("en-US")}</span>
                          </div>
                          <div className="pt-1 border-t border-[var(--color-hairline)] flex justify-between items-center font-semibold text-[var(--color-text-primary)]">
                            <span>You receive</span>
                            <span className="font-mono text-emerald-600 font-bold">₦{net.toLocaleString("en-US")}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 4. Delivery Timeline */}
                    <div>
                      <label className="font-body text-[length:var(--font-size-xs)] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 block">
                        Delivery Timeline
                      </label>
                      <select
                        value={card.delivery}
                        onChange={(e) => handleUpdateRateCard(card.id, "delivery", e.target.value)}
                        className="w-full h-[54px] rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface-2)] px-4 font-body text-[length:var(--font-size-base)] text-[var(--color-text-primary)] focus:border-[var(--color-border-active)] focus:shadow-[0_0_0_4px_var(--color-accent-glow)] outline-none appearance-none"
                      >
                        <option value="Same Day">Same Day</option>
                        <option value="24 Hours">24 Hours</option>
                        <option value="2–3 Days">2–3 Days</option>
                        <option value="1 Week">1 Week</option>
                        <option value="Custom">Custom Schedule</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Rate Card or Limit Notice */}
            {rateCards.length < 2 ? (
              <Button onClick={handleAddRateCard} variant="secondary" className="w-full border-dashed mb-8">
                <Plus className="w-4 h-4 mr-2" /> Add second rate card ({rateCards.length}/2)
              </Button>
            ) : (
              <div className="p-3 mb-8 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface-2)] border border-[var(--color-hairline)] text-center text-xs text-[var(--color-text-secondary)]">
                You can only create up to 2 rate cards (2/2 created).
              </div>
            )}

            <div className="mt-auto pt-6 sticky bottom-0 bg-gradient-to-t from-[var(--color-bg-canvas)] via-[var(--color-bg-canvas)] to-transparent pb-1">
              <Button
                onClick={handleNext}
                className="w-full"
              >
                Continue
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 7: Connect your calendar (Google Calendar Sync — before terms agreement) ── */}
        {step === 7 && (
          <motion.div key="step-calendar" {...rise} className="flex-1 flex flex-col px-5 pb-6 overflow-y-auto">
            <div className="mt-8 mb-6 text-center max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/20 shadow-lg shadow-purple-500/10">
                <CalendarIcon className="w-8 h-8 text-[var(--color-accent)]" />
              </div>
              <h2 className="font-display text-[length:var(--font-size-2xl)] leading-[1.15] text-[var(--color-text-primary)] mb-3">
                Connect your calendar
              </h2>
              <p className="font-body text-[15px] text-[var(--color-text-secondary)] leading-relaxed">
                Bookings appear on your calendar automatically, and we only offer slots when you&apos;re free.
              </p>
            </div>

            {/* Calendar Connection Status Area */}
            <div className="max-w-sm w-full mx-auto mb-6">
              {calendarState === "connected" ? (
                <div className="p-4 rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-emerald-500/30 shadow-[var(--shadow-card)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <Badge tone="success" size="sm">Connected</Badge>
                    </div>
                    <button
                      type="button"
                      onClick={handleDisconnectCalendar}
                      className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] hover:underline cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-9 h-9 rounded-xl bg-[var(--color-bg-elevated)] flex items-center justify-center border border-[var(--color-border-default)]">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-[var(--color-text-primary)] font-body block truncate">
                        Google Calendar
                      </span>
                      <span className="text-[11px] text-[var(--color-text-secondary)] font-mono truncate block">
                        {connectedEmail}
                      </span>
                    </div>
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  </div>
                </div>
              ) : calendarState === "error" ? (
                <div className="p-4 rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-rose-500/30 shadow-[var(--shadow-card)] space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[var(--color-error)]" />
                    <span className="text-xs font-semibold text-[var(--color-error)] font-body">Calendar Connection Failed</span>
                  </div>
                  <p className="text-xs font-body text-[var(--color-text-secondary)] leading-relaxed">
                    Could not connect to Google Calendar. Permission request was not completed.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleConnectCalendar}
                    className="w-full text-xs font-semibold"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
                  </Button>
                </div>
              ) : (
                <div className="p-4 rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] shadow-[var(--shadow-card)] text-center space-y-2">
                  <div className="flex justify-center items-center gap-2 text-xs text-[var(--color-text-secondary)] font-body">
                    <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Read-only busy slots · Never exposes private event titles</span>
                  </div>
                </div>
              )}
            </div>

            {/* Buttons: Connect Google Calendar (primary) & Skip for now text link */}
            <div className="mt-auto pt-6 sticky bottom-0 bg-gradient-to-t from-[var(--color-bg-canvas)] via-[var(--color-bg-canvas)] to-transparent pb-1 max-w-sm w-full mx-auto flex flex-col items-center gap-3">
              {calendarState === "connected" ? (
                <Button onClick={handleNext} className="w-full h-12 text-sm font-bold shadow-md cursor-pointer">
                  Continue
                </Button>
              ) : (
                <Button
                  onClick={handleConnectCalendar}
                  disabled={connectingCalendar}
                  className="w-full h-12 text-sm font-bold shadow-md flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{connectingCalendar ? "Connecting to Google..." : "Connect Google Calendar"}</span>
                </Button>
              )}

              <button
                type="button"
                onClick={() => {
                  track("onboarding_step_skipped", { stepKey: "calendar", userType: "TALENT" });
                  handleNext();
                }}
                className="text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:underline py-1 cursor-pointer transition-colors"
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 8: Performer Terms & Payout Agreement ── */}
        {step === 8 && (
          <motion.div key="step-agreement" {...rise} className="flex-1 flex flex-col px-5 pb-6 overflow-y-auto">
            <div className="mt-4 mb-4">
              <h2 className="font-display text-[length:var(--font-size-2xl)] leading-[1.15] text-[var(--color-text-primary)] mb-2">
                Performer Terms &amp; Payout Agreement
              </h2>
              <p className="font-body text-[14px] text-[var(--color-text-secondary)] leading-relaxed">
                Please review and accept our platform performer terms before launching your profile.
              </p>
            </div>

            {/* Clauses List (Unboxed, clean vertical list with bold emphasis) */}
            <ul className="space-y-4 my-6 text-[13px] leading-relaxed text-[var(--color-text-secondary)] list-disc pl-5">
              <li>
                <strong className="font-semibold text-[var(--color-text-primary)]">Service Fee:</strong>{" "}
                Monologg deducts a 7% platform fee from all completed bookings before settlement.
              </li>
              <li>
                <strong className="font-semibold text-[var(--color-text-primary)]">Payout Verification:</strong>{" "}
                Payouts are routed directly to your verified bank account (OPay, Wema, Zenith, etc.) matching your KYC full legal name. Any payout account changes are subject to review.
              </li>
              <li>
                <strong className="font-semibold text-[var(--color-text-primary)]">Milestone Confirmations:</strong>{" "}
                You agree to respond to automated availability prompts (sent via email and/or platform alerts at 3 times prior to each event).
              </li>
              <li>
                <strong className="font-semibold text-[var(--color-text-primary)]">Attendance Code:</strong>{" "}
                On-site payouts require entering the client&apos;s 4-digit check-in code upon physical arrival.
              </li>
              <li>
                <strong className="font-semibold text-[var(--color-text-primary)]">Account Standing:</strong>{" "}
                Unconfirmed gigs or no-shows directly degrade your performer rating and visibility on the platform.
              </li>
            </ul>

            {/* Checkbox: I agree to the Performer Terms of Service (Mandatory) */}
            <div className="mb-6">
              <label className="flex items-start gap-3 p-3.5 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] cursor-pointer select-none hover:border-[var(--color-border-strong)] transition-colors">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[var(--color-accent)] focus:ring-0 shrink-0 cursor-pointer"
                />
                <span className="font-body text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  I agree to the{" "}
                  <a
                    href="/legal/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Performer Terms of Service
                  </a>{" "}
                  <span className="font-semibold text-[var(--color-text-primary)]">(Mandatory)</span>
                </span>
              </label>
            </div>

            <div className="mt-auto pt-6 sticky bottom-0 bg-gradient-to-t from-[var(--color-bg-canvas)] via-[var(--color-bg-canvas)] to-transparent pb-1">
              <Button
                onClick={handleFinishOnboarding}
                disabled={!termsAccepted}
                className="w-full"
              >
                Continue
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
