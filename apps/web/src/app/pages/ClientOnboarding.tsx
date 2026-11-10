import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EASE_OUT, DURATION_MED, DURATION_SLOW } from "../../lib/motionTokens";
import {
  ChevronLeft,
  Building2,
  Briefcase,
  Globe,
  Users,
  Check,
  Drama,
  AudioLines,
  Mic,
  Laugh,
  Headphones,
  Video,
} from "lucide-react";
import { appStateSync } from "../../lib/state-sync";
import { track } from "../../lib/tracker";

type Step = 1 | 2;

// Client organization types — clean labels without slashes (Brand, Individual)
const CLIENT_CATEGORIES = [
  { id: "agency", label: "Creative Agency", icon: Building2 },
  { id: "brand", label: "Brand", icon: Briefcase },
  { id: "production", label: "Production Company", icon: Globe },
  { id: "event", label: "Events Company", icon: Users },
  { id: "individual", label: "Individual", icon: Users },
  { id: "other", label: "Other", icon: Globe },
];

// The 6 Performer Craft Categories (matching performer onboarding)
const PERFORMER_CATEGORIES = [
  { id: "actors", label: "Actors", icon: Drama },
  { id: "public_speakers", label: "Public speakers", icon: AudioLines },
  { id: "comperes", label: "Comperes", icon: Mic },
  { id: "comedians", label: "Comedians", icon: Laugh },
  { id: "artists", label: "Artists", icon: Headphones },
  { id: "creators", label: "Creators", icon: Video },
];

const HIRING_FREQUENCIES = [
  "Once or twice a year",
  "Monthly",
  "Weekly",
  "Multiple times per week",
  "I'm exploring",
];

const CLIENT_ONBOARDING_DRAFT_KEY = "monologg_client_onboarding_draft";

interface ClientOnboardingDraft {
  step: Step;
  brandName: string;
  category: string;
  website: string;
  selectedCategories: string[];
  hiringFrequency: string;
}

function loadSavedClientDraft(): ClientOnboardingDraft | null {
  try {
    if (typeof window === "undefined") return null;
    if (import.meta.env.MODE === "test") return null;
    const raw = window.localStorage.getItem(CLIENT_ONBOARDING_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function ClientOnboarding() {
  const savedDraft = useMemo(() => loadSavedClientDraft(), []);
  const [step, setStep] = useState<Step>(() => savedDraft?.step ?? 1);
  const [brandName, setBrandName] = useState(() => savedDraft?.brandName ?? "");
  const [category, setCategory] = useState(() => savedDraft?.category ?? "agency");
  const [website, setWebsite] = useState(() => savedDraft?.website ?? "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => savedDraft?.selectedCategories ?? ["actors"]);
  const [hiringFrequency, setHiringFrequency] = useState(() => savedDraft?.hiringFrequency ?? "Monthly");
  const navigate = useNavigate();

  // Auto-save draft progress so the client can carry on from where they left off
  useEffect(() => {
    try {
      window.localStorage.setItem(
        CLIENT_ONBOARDING_DRAFT_KEY,
        JSON.stringify({
          step,
          brandName,
          category,
          website,
          selectedCategories,
          hiringFrequency,
        }),
      );
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, [step, brandName, category, website, selectedCategories, hiringFrequency]);

  useEffect(() => {
    track("onboarding_step_viewed", { stepKey: `step_${step}`, userType: "CLIENT" });
  }, [step]);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((c) => c !== id)
          : prev
        : [...prev, id]
    );
  };

  const handleFinishOnboarding = () => {
    track("onboarding_step_completed", { stepKey: "step_2", userType: "CLIENT" });
    appStateSync.updateClientProfile({
      orgName: brandName.trim(),
      orgType: CLIENT_CATEGORIES.find((c) => c.id === category)?.label || category,
      website: website.trim(),
      targetCategories: selectedCategories,
      hiringFrequency: hiringFrequency,
    });
    try {
      window.localStorage.removeItem(CLIENT_ONBOARDING_DRAFT_KEY);
    } catch {
      // ignore
    }
    navigate("/client");
  };

  const rise = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: DURATION_MED, ease: EASE_OUT },
  };

  return (
    <div
      className="role-client min-h-screen flex flex-col w-full max-w-[480px] mx-auto"
      style={{ background: "var(--color-bg-canvas)" }}
    >
      {/* Header & Progress Indicator */}
      <div className="px-5 pt-6 pb-3 flex items-center gap-3">
        <button
          aria-label="Go back"
          onClick={() => (step === 1 ? navigate("/auth") : setStep(1))}
          className="w-10 h-10 -ml-1 flex items-center justify-center rounded-[var(--radius-full)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] active:scale-[0.94] transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className="flex-1 h-1.5 rounded-[var(--radius-full)] bg-[var(--color-bg-elevated)] overflow-hidden"
            >
              <motion.div
                className="h-full rounded-[var(--radius-full)] bg-[var(--color-accent)]"
                initial={false}
                animate={{ width: s <= step ? "100%" : "0%" }}
                transition={{ duration: DURATION_SLOW, ease: EASE_OUT }}
              />
            </div>
          ))}
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-5 py-5 w-full flex flex-col">
        <AnimatePresence mode="wait">
          {/* ── Step 1: Tell us about you ── */}
          {step === 1 && (
            <motion.div key="step1" {...rise} className="flex-1 flex flex-col">
              <div className="mb-7">
                <h2
                  className="font-display text-[length:var(--font-size-2xl)] leading-[1.15] mb-2"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  Tell us about you
                </h2>
                <p
                  className="text-[15px] font-body leading-relaxed"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Help us personalize your performer discovery experience.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label
                    className="block text-[length:var(--font-size-xs)] font-medium uppercase tracking-wider mb-2 font-body"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Brand Name
                  </label>
                  <Input
                    placeholder="e.g., RedTV, Nike, or your name"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                  />
                </div>

                <div>
                  <label
                    className="block text-[length:var(--font-size-xs)] font-medium uppercase tracking-wider mb-3 font-body"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Category
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {CLIENT_CATEGORIES.map((type) => {
                      const selected = category === type.id;
                      return (
                        <motion.button
                          key={type.id}
                          type="button"
                          onClick={() => setCategory(type.id)}
                          whileTap={{ scale: 0.97 }}
                          className="flex items-center gap-2.5 min-h-[52px] px-3.5 py-3 rounded-[var(--radius-lg)] text-left relative transition-colors duration-[var(--duration-fast)]"
                          style={{
                            background: selected ? "var(--color-accent-soft)" : "var(--color-bg-surface)",
                            border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-hairline)"}`,
                          }}
                        >
                          <type.icon
                            className="w-4 h-4 shrink-0"
                            style={{ color: selected ? "var(--color-accent)" : "var(--color-text-tertiary)" }}
                          />
                          <span
                            className="text-[length:var(--font-size-sm)] font-body font-medium"
                            style={{ color: selected ? "var(--color-accent)" : "var(--color-text-primary)" }}
                          >
                            {type.label}
                          </span>
                          {selected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 400, damping: 22 }}
                              className="absolute top-2 right-2 w-4 h-4 rounded-[var(--radius-full)] flex items-center justify-center"
                              style={{ background: "var(--color-accent)" }}
                            >
                              <Check className="w-2.5 h-2.5" strokeWidth={3} style={{ color: "var(--color-accent-on)" }} />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    className="block text-[length:var(--font-size-xs)] font-medium uppercase tracking-wider mb-2 font-body"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Website (optional)
                  </label>
                  <Input
                    placeholder="https://yourwebsite.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-auto pt-8 sticky bottom-0 bg-gradient-to-t from-[var(--color-bg-canvas)] via-[var(--color-bg-canvas)] to-transparent pb-1">
                <Button
                  className="w-full"
                  disabled={!brandName.trim() || !category}
                  onClick={() => {
                    track("onboarding_step_completed", { stepKey: "step_1", userType: "CLIENT" });
                    setStep(2);
                  }}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: What are you looking for? ── */}
          {step === 2 && (
            <motion.div key="step2" {...rise} className="flex-1 flex flex-col">
              <div className="mb-7">
                <h2
                  className="font-display text-[length:var(--font-size-2xl)] leading-[1.15] mb-2"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  What are you looking for?
                </h2>
                <p
                  className="text-[15px] font-body leading-relaxed"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Select the performers you want to discover and how often you hire.
                </p>
              </div>

              <div className="space-y-6">
                {/* 1. Multi-select performer categories */}
                <div>
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <label
                      className="block text-[length:var(--font-size-xs)] font-medium uppercase tracking-wider font-body truncate"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Performer Categories
                    </label>
                    <span
                      className="shrink-0 text-[11px] font-body font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)" }}
                    >
                      {selectedCategories.length} selected
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {PERFORMER_CATEGORIES.map((cat) => {
                      const selected = selectedCategories.includes(cat.id);
                      return (
                        <motion.button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          whileTap={{ scale: 0.97 }}
                          className="flex items-center gap-2.5 min-h-[52px] px-3.5 py-3 rounded-[var(--radius-lg)] text-left relative transition-colors duration-[var(--duration-fast)]"
                          style={{
                            background: selected ? "var(--color-accent-soft)" : "var(--color-bg-surface)",
                            border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-hairline)"}`,
                          }}
                        >
                          <cat.icon
                            className="w-4 h-4 shrink-0"
                            style={{ color: selected ? "var(--color-accent)" : "var(--color-text-tertiary)" }}
                          />
                          <span
                            className="text-[length:var(--font-size-sm)] font-body font-medium"
                            style={{ color: selected ? "var(--color-accent)" : "var(--color-text-primary)" }}
                          >
                            {cat.label}
                          </span>
                          {selected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 400, damping: 22 }}
                              className="absolute top-2 right-2 w-4 h-4 rounded-[var(--radius-full)] flex items-center justify-center"
                              style={{ background: "var(--color-accent)" }}
                            >
                              <Check className="w-2.5 h-2.5" strokeWidth={3} style={{ color: "var(--color-accent-on)" }} />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Hiring frequency */}
                <div>
                  <label
                    className="block text-[length:var(--font-size-xs)] font-medium uppercase tracking-wider mb-3 font-body"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    How often will you be hiring?
                  </label>
                  <div className="space-y-2">
                    {HIRING_FREQUENCIES.map((opt) => {
                      const selected = hiringFrequency === opt;
                      return (
                        <motion.button
                          key={opt}
                          type="button"
                          onClick={() => setHiringFrequency(opt)}
                          whileTap={{ scale: 0.98 }}
                          className="w-full flex items-center justify-between min-h-[48px] px-4 py-2.5 rounded-[var(--radius-lg)] text-[14px] font-body font-medium transition-colors duration-[var(--duration-fast)]"
                          style={{
                            background: selected ? "var(--color-accent-soft)" : "var(--color-bg-surface)",
                            border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-hairline)"}`,
                            color: selected ? "var(--color-accent)" : "var(--color-text-primary)",
                          }}
                        >
                          <span>{opt}</span>
                          {selected && (
                            <span
                              className="w-4 h-4 rounded-[var(--radius-full)] flex items-center justify-center shrink-0"
                              style={{ background: "var(--color-accent)" }}
                            >
                              <Check className="w-2.5 h-2.5" strokeWidth={3} style={{ color: "var(--color-accent-on)" }} />
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-8 flex gap-3 sticky bottom-0 bg-gradient-to-t from-[var(--color-bg-canvas)] via-[var(--color-bg-canvas)] to-transparent pb-1">
                <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  className="flex-[2]"
                  disabled={selectedCategories.length === 0}
                  onClick={handleFinishOnboarding}
                >
                  Get Started
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
