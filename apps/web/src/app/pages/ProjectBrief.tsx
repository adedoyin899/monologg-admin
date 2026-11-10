import React, { useState } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { FormField } from "../components/ui/FormField";
import { EASE_OUT, DURATION_MED } from "../../lib/motionTokens";
import { apiClient } from "../../lib/api-client";
import { appStateSync, getProjectDetails } from "../../lib/state-sync";
import { track } from "../../lib/tracker";
import type { ClientProject } from "@monologg/types";
import { CURRENCIES, convertCurrency, CODE_TO_SYMBOL, getRandomLimitError, LimitError } from "../../lib/currency";
import { Modal } from "../components/ui/Modal";
import { PaystackModal } from "../components/ui/PaystackModal";
import {
  ChevronLeft, FileText, Users, DollarSign, UploadCloud,
  Check, Mic, Video, AlertTriangle, AlertCircle,
  Drama, AudioLines, Laugh, Headphones, MapPin, X,
  Shield, CreditCard, Wallet, ShieldCheck, Save, Sparkles
} from "lucide-react";

type Step = 1 | 2 | 3 | 4 | 5;

const NICHES = [
  { id: "vo", label: "Voice-Over", icon: Mic },
  { id: "actors", label: "Actors", icon: Drama },
  { id: "public_speakers", label: "Public speakers", icon: AudioLines },
  { id: "comperes", label: "Comperes", icon: Mic },
  { id: "comedians", label: "Comedians", icon: Laugh },
  { id: "artists", label: "Artists", icon: Headphones },
  { id: "creators", label: "Creators", icon: Video },
];

// Maps this form's local niche ids to the real Niche enum (features.md Phase 2/5) —
// supports both the standard performer categories and legacy identifiers.
const NICHE_TO_ENUM: Record<string, string> = {
  vo: "VO_ARTIST",
  actors: "ACTOR",
  public_speakers: "SPEAKER_PASTOR",
  comperes: "COMPERE",
  comedians: "COMEDIAN",
  artists: "MUSICIAN",
  creators: "CONTENT_CREATOR",
  actor: "ACTOR",
  comedian: "COMEDIAN",
  compere: "COMPERE",
  speaker: "SPEAKER_PASTOR",
  musician: "MUSICIAN",
  creator: "CONTENT_CREATOR",
};

const ENUM_TO_NICHE_ID: Record<string, string> = {
  VO_ARTIST: "vo",
  ACTOR: "actors",
  COMPERE: "comperes",
  SPEAKER_PASTOR: "public_speakers",
  COMEDIAN: "comedians",
  MUSICIAN: "artists",
  CONTENT_CREATOR: "creators",
};

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

const PROJECT_TYPES = [
  "Commercial / Ad Campaign",
  "Corporate Event",
  "Film / TV Production",
  "Radio / Podcast",
  "Brand Activation",
  "Social Media Content",
  "Conference / Summit",
  "Other",
];

const STEPS = [
  { num: 1 as Step, label: "Project Details", icon: FileText },
  { num: 2 as Step, label: "Requirements", icon: Users },
  { num: 3 as Step, label: "Assets", icon: UploadCloud },
  { num: 4 as Step, label: "Review & Agreement", icon: Shield },
  { num: 5 as Step, label: "Budget & Publish", icon: DollarSign },
];

export function ProjectBrief() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Retrieve project ID from router params, query search params, or state navigation
  const editId =
    params.id ||
    searchParams.get("id") ||
    searchParams.get("projectId") ||
    searchParams.get("edit") ||
    searchParams.get("draft") ||
    (location.state as any)?.projectId ||
    null;

  // Hydrate initial draft data when editing or resuming
  const initialDraft = React.useMemo(() => {
    if (!editId) return null;
    const project =
      appStateSync.getClientProject(editId) ||
      appStateSync.getClientProjects().find((p) => p.id === editId) ||
      null;
    if (!project) return null;
    const details = getProjectDetails(project);
    return { project, details };
  }, [editId]);

  React.useEffect(() => {
    track("project_viewed", { briefId: editId || "new", cap: 0 });
  }, [editId]);

  // Determine starting step: essentially where the user stopped last in their draft action
  const [step, setStep] = useState<Step>(() => {
    const paramStep = searchParams.get("step");
    if (paramStep && Number(paramStep) >= 1 && Number(paramStep) <= 5) {
      return Number(paramStep) as Step;
    }
    if (initialDraft?.project.draftStep && initialDraft.project.draftStep >= 1 && initialDraft.project.draftStep <= 5) {
      return initialDraft.project.draftStep as Step;
    }
    if (initialDraft?.details.draftStep && initialDraft.details.draftStep >= 1 && initialDraft.details.draftStep <= 5) {
      return initialDraft.details.draftStep as Step;
    }
    return 1;
  });

  const [projectName, setProjectName] = useState(() => initialDraft?.project.name || "");
  const [projectType, setProjectType] = useState(() => {
    if (initialDraft?.project.projectType) return initialDraft.project.projectType;
    if (initialDraft?.project.niche === "Voice-Over") return "Commercial / Ad Campaign";
    if (initialDraft?.project.niche === "Compere") return "Corporate Event";
    return initialDraft ? "Commercial / Ad Campaign" : "";
  });
  const [projectFormat, setProjectFormat] = useState<"online" | "onsite">(() => {
    if (initialDraft?.project.projectFormat) return initialDraft.project.projectFormat;
    const loc = initialDraft?.details.location?.toLowerCase() || "";
    if (loc.includes("on-site") || loc.includes("on-set") || loc.includes("onsite")) return "onsite";
    return "online";
  });
  const [venueLocation, setVenueLocation] = useState(
    () => initialDraft?.project.venueLocation || (initialDraft?.details.location && !initialDraft.details.location.toLowerCase().includes("remote") ? initialDraft.details.location : "") || ""
  );
  const [description, setDescription] = useState(() => initialDraft?.project.description || initialDraft?.details.description || "");
  const [auditionSides, setAuditionSides] = useState(() => initialDraft?.project.scriptSample || initialDraft?.details.scriptSample || "");
  const [draftAssets, setDraftAssets] = useState<{ name: string; size: string; type: string }[]>(() => initialDraft?.project.assets || initialDraft?.details.assets || []);
  const [selectedNiches, setSelectedNiches] = useState<string[]>(() => {
    if (initialDraft?.project.selectedNiches && initialDraft.project.selectedNiches.length > 0) {
      return initialDraft.project.selectedNiches;
    }
    if (initialDraft?.details.nicheReq) {
      const mapped = initialDraft.details.nicheReq.map((n) => ENUM_TO_NICHE_ID[n] || n.toLowerCase()).filter(Boolean);
      if (mapped.length > 0) return mapped;
    }
    if (initialDraft?.project.niche) {
      if (initialDraft.project.niche === "Voice-Over") return ["vo"];
      const match = NICHES.find((n) => n.label.toLowerCase().includes(initialDraft.project.niche.toLowerCase()) || initialDraft.project.niche.toLowerCase().includes(n.id));
      if (match) return [match.id];
    }
    return [];
  });
  const [timeline, setTimeline] = useState(() => initialDraft?.project.timeline || initialDraft?.details.timeline || "");
  const [locationValue, setLocationValue] = useState(() => initialDraft?.project.location || initialDraft?.details.location || "");
  const [locationInput, setLocationInput] = useState(() => initialDraft?.project.location || initialDraft?.details.location || "");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  const filteredLocations = React.useMemo(() => {
    const q = locationInput.trim().toLowerCase();
    if (!q) return NIGERIAN_LOCATIONS.slice(0, 8);
    return NIGERIAN_LOCATIONS.filter(
      (item) =>
        item.city.toLowerCase().includes(q) ||
        item.state.toLowerCase().includes(q)
    );
  }, [locationInput]);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [additionalNotes, setAdditionalNotes] = useState(() => initialDraft?.project.additionalNotes || initialDraft?.details.additionalNotes || "");
  const [selectedCurrency, setSelectedCurrency] = useState("NGN");
  const [budgetAmount, setBudgetAmount] = useState(() => {
    if (initialDraft?.project.budget) {
      const parsed = parseInt(initialDraft.project.budget.replace(/\D/g, ""), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 150000;
  });
  const [sliderMax, setSliderMax] = useState(2000000);
  const [budgetInputStr, setBudgetInputStr] = useState(() => {
    if (initialDraft?.project.budget) {
      const parsed = parseInt(initialDraft.project.budget.replace(/\D/g, ""), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed.toLocaleString("en-US");
    }
    return "150,000";
  });
  const [limitError, setLimitError] = useState<LimitError | null>(null);
  const [applicantCap, setApplicantCap] = useState(() => (initialDraft?.project.applicantCap ? String(initialDraft.project.applicantCap) : ""));
  const [fundingSource, setFundingSource] = useState<"wallet" | "card">("wallet");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [walletBalance, setWalletBalance] = useState(() => appStateSync.getBalance().available);
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState("100,000");
  const [fundingProcessing, setFundingProcessing] = useState(false);
  const [showPaystackModal, setShowPaystackModal] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const activeCurr = CURRENCIES.find((c) => c.code === selectedCurrency) || CURRENCIES[0];

  // Sync sliderMax when currency changes
  React.useEffect(() => {
    const active = CURRENCIES.find((c) => c.code === selectedCurrency);
    if (active) {
      setSliderMax((prev) => Math.max(prev, active.max));
    }
  }, [selectedCurrency]);

  // Sync input string when budgetAmount changes
  React.useEffect(() => {
    setBudgetInputStr(budgetAmount.toLocaleString("en-US"));
  }, [budgetAmount]);

  const toggleNiche = (id: string) => {
    setSelectedNiches((prev) => (prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]));
  };

  const canAdvance = () => {
    if (step === 1) return Boolean(projectName.trim() && projectType && (projectFormat === "online" || venueLocation.trim()));
    if (step === 2) return selectedNiches.length > 0;
    if (step === 3) return true;
    if (step === 4) return agreedToTerms;
    if (step === 5) {
      if (budgetAmount <= 0) return false;
      if (fundingSource === "wallet" && walletBalance < budgetAmount) return false;
      return true;
    }
    return false;
  };

  const symbol = "₦";

  const handleBudgetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const numericStr = rawVal.replace(/\D/g, "");

    if (numericStr.length > 15 || (numericStr.length === 15 && parseInt(numericStr, 10) > 999999999999999)) {
      const isMobile = window.innerWidth < 500;
      setLimitError(getRandomLimitError(isMobile));
      return;
    }

    setBudgetInputStr(numericStr);

    const numericVal = numericStr ? parseInt(numericStr, 10) : 0;
    setBudgetAmount(numericVal);
    if (numericVal > sliderMax) {
      setSliderMax(numericVal);
    }
  };

  const handleBudgetInputFocus = () => {
    setBudgetInputStr(budgetAmount === 0 ? "" : budgetAmount.toString());
  };

  const handleBudgetInputBlur = () => {
    setBudgetInputStr(budgetAmount.toLocaleString("en-US"));
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setBudgetAmount(val);
    if (val >= sliderMax * 0.95) {
      setSliderMax((prev) => Math.round(prev * 1.5));
    }
  };

  // Draft persistence action: save progress & prefilled values at current step
  const handleSaveDraft = () => {
    const currentBudgetStr = `₦${budgetAmount.toLocaleString("en-US")}`;
    const primaryNicheLabel =
      selectedNiches.length > 0
        ? NICHES.find((n) => n.id === selectedNiches[0])?.label || "Voice-Over"
        : initialDraft?.project.niche || "Voice-Over";

    const draftData: ClientProject = {
      id: editId || `P-${Date.now()}`,
      name: projectName.trim() || "Untitled Project Brief",
      niche: primaryNicheLabel,
      budget: currentBudgetStr,
      status: "draft",
      applicants: initialDraft?.project.applicants || 0,
      applicantCap: applicantCap.trim() ? Number(applicantCap) : null,
      applicationsOpen: false,
      posted: initialDraft?.project.posted || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      draftStep: step,
      projectType,
      projectFormat,
      venueLocation,
      description,
      selectedNiches,
      timeline,
      location: projectFormat === "onsite" ? venueLocation || "Lagos, NG (On-site)" : locationValue || "Remote (Online)",
      scriptSample: auditionSides,
      additionalNotes,
      assets: draftAssets,
    };

    appStateSync.saveClientDraft(draftData);

    appStateSync.addNotification({
      id: `notif-${Date.now()}`,
      kind: "PROJECT_APPLICATION",
      createdAt: new Date().toISOString(),
      payload: { clientName: `Draft saved: ${draftData.name} (Step ${step} of ${STEPS.length})` },
    });

    navigate("/client", { state: { savedDraftId: draftData.id, savedStep: step } });
  };

  const executePublish = async () => {
    setPublishing(true);
    try {
      if (fundingSource === "wallet") {
        appStateSync.deductBalance(budgetAmount, `Project Escrow: ${projectName}`, `BRIEF-${Date.now()}`);
        setWalletBalance(appStateSync.getBalance().available);
      }
      await apiClient.createBrief({
        projectName,
        projectType,
        nicheReq: selectedNiches.map((id) => NICHE_TO_ENUM[id]).filter(Boolean),
        budgetAmount: Math.round(budgetAmount * 100),
        budgetCurrency: selectedCurrency,
        applicantCap: applicantCap.trim() ? Number(applicantCap) : null,
        status: "ACTIVE",
      });

      // Transition draft to active if editing or publishing a saved brief
      if (editId) {
        appStateSync.updateClientProject(editId, {
          name: projectName,
          status: "active",
          applicationsOpen: true,
          budget: `₦${budgetAmount.toLocaleString("en-US")}`,
          applicantCap: applicantCap.trim() ? Number(applicantCap) : null,
          description,
          scriptSample: auditionSides,
          additionalNotes,
        });
      } else {
        appStateSync.saveClientDraft({
          id: `P-${Date.now()}`,
          name: projectName,
          niche: selectedNiches.length > 0 ? NICHES.find((n) => n.id === selectedNiches[0])?.label || "Voice-Over" : "Voice-Over",
          budget: `₦${budgetAmount.toLocaleString("en-US")}`,
          status: "active",
          applicants: 0,
          applicantCap: applicantCap.trim() ? Number(applicantCap) : null,
          applicationsOpen: true,
          posted: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          description,
          scriptSample: auditionSides,
          additionalNotes,
        });
      }

      appStateSync.addNotification({
        id: `notif-${Date.now()}`,
        kind: "PROJECT_APPLICATION",
        createdAt: new Date().toISOString(),
        payload: { clientName: `New Brief Posted: ${projectName}` },
      });
      setSubmitSuccess(true);
    } finally {
      setPublishing(false);
    }
  };

  const handleNext = async () => {
    if (step < 5) {
      setStep((step + 1) as Step);
      return;
    }
    if (fundingSource === "card") {
      setShowPaystackModal(true);
      return;
    }
    await executePublish();
  };

  if (submitSuccess) {
    return (
      <div className="role-client min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "var(--color-bg-canvas)" }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION_MED, ease: EASE_OUT }}
          className="text-center max-w-sm"
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "var(--color-success-bg)", border: "1px solid var(--color-success)" }}>
            <Check className="w-10 h-10" style={{ color: "var(--color-success)" }} />
          </div>
          <h2 className="font-display text-3xl mb-2" style={{ color: "var(--color-text-primary)" }}>Project Published!</h2>
          <p className="text-sm font-body mb-2" style={{ color: "var(--color-text-secondary)" }}>
            <strong className="text-base" style={{ color: "var(--color-accent)" }}>{projectName || "Your Project"}</strong>
          </p>
          <p className="text-sm font-body mb-8" style={{ color: "var(--color-text-secondary)" }}>
            Your brief is now live with escrow reserved. Verified performers will start applying shortly. You can also browse and invite specific performers.
          </p>
          <div className="flex flex-col gap-3">
            <Button className="w-full h-12" onClick={() => navigate("/client")}>View My Projects</Button>
            <Button
              variant="secondary"
              className="w-full h-12"
              onClick={() => {
                setStep(1);
                setSubmitSuccess(false);
                setProjectName("");
                setProjectType("");
                setSelectedNiches([]);
                setSelectedCurrency("NGN");
                setBudgetAmount(150000);
                setSliderMax(2000000);
                setBudgetInputStr("150,000");
                setApplicantCap("");
              }}
            >
              Post Another Project
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="role-client min-h-screen flex flex-col" style={{ background: "var(--color-bg-canvas)" }}>
      {/* Header */}
      <div
        className="h-16 flex items-center gap-3 px-4 sticky top-0 z-40 glass-panel"
        style={{ borderBottom: "1px solid var(--color-hairline)" }}
      >
        <button
          aria-label="Go back"
          onClick={() => (step === 1 ? navigate("/client") : setStep((step - 1) as Step))}
          className="w-10 h-10 rounded-[var(--radius-full)] flex items-center justify-center hover:opacity-80 active:scale-95 transition-all cursor-pointer"
          style={{ background: "var(--color-bg-elevated)" }}
        >
          <ChevronLeft className="w-5 h-5" style={{ color: "var(--color-text-secondary)" }} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold font-display truncate" style={{ color: "var(--color-text-primary)" }}>
              {editId ? "Edit Project Brief" : "Create Project Brief"}
            </span>
            {editId && (
              <span className="text-[10px] uppercase font-bold font-mono tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
                Draft Mode
              </span>
            )}
          </div>
          <div className="text-xs font-body truncate" style={{ color: "var(--color-text-tertiary)" }}>
            {editId
              ? `Continuing from where you left off · Step ${step} of ${STEPS.length}`
              : `Step ${step} of ${STEPS.length}`}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSaveDraft}
            className="h-9 px-3 text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
            title="Save draft and return to dashboard"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save Draft</span>
            <span className="sm:hidden">Save</span>
          </Button>

          <button
            onClick={() => navigate("/client")}
            className="text-sm font-body px-3 py-2 rounded-[var(--radius-full)] hover:opacity-80 active:scale-95 transition-all cursor-pointer"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Exit
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1" style={{ background: "var(--color-bg-elevated)" }}>
        <motion.div
          className="h-full"
          style={{ background: "var(--color-accent)" }}
          animate={{ width: `${(step / STEPS.length) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Steps indicator */}
      <div className="px-4 py-4 flex items-center gap-2 overflow-x-auto">
        {STEPS.map((s, i) => {
          const isDone = s.num < step;
          const isActive = s.num === step;
          return (
            <React.Fragment key={s.num}>
              <button
                type="button"
                onClick={() => setStep(s.num)}
                className="flex items-center gap-1.5 shrink-0 cursor-pointer text-left focus:outline-none"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-transform active:scale-90"
                  style={{
                    background: isDone ? "var(--color-success)" : isActive ? "var(--color-accent)" : "var(--color-bg-elevated)",
                    color: isDone ? "var(--color-text-inverse)" : isActive ? "var(--color-accent-on)" : "var(--color-text-tertiary)",
                  }}
                >
                  {isDone ? "✓" : s.num}
                </div>
                <span className="hidden sm:block text-xs font-body font-medium" style={{ color: isActive ? "var(--color-accent)" : isDone ? "var(--color-success)" : "var(--color-text-tertiary)" }}>
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px min-w-4" style={{ background: isDone ? "var(--color-success)" : "var(--color-hairline)" }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 max-w-xl mx-auto w-full px-4 py-6">
        <AnimatePresence mode="wait">
          {/* Step 1 — Project Details */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="font-display text-2xl mb-1" style={{ color: "var(--color-text-primary)" }}>Project Details</h2>
                <p className="text-sm font-body" style={{ color: "var(--color-text-secondary)" }}>Give your casting brief a clear, recognizable name.</p>
              </div>

              <FormField label="Project Name *">
                <Input
                  className="h-12 text-base"
                  placeholder="e.g., Nike Q1 Campaign Voice-Over"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </FormField>

              <FormField label="Project Type *">
                <div className="grid grid-cols-2 gap-2">
                  {PROJECT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setProjectType(type)}
                      className="p-3.5 rounded-xl text-left text-sm font-body transition-all"
                      style={{
                        background: projectType === type ? "var(--color-accent-soft)" : "var(--color-bg-elevated)",
                        border: `1px solid ${projectType === type ? "var(--color-accent)" : "var(--color-hairline)"}`,
                        color: projectType === type ? "var(--color-accent)" : "var(--color-text-secondary)",
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </FormField>

              <FormField label="Project Format *">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setProjectFormat("online")}
                    className="p-4 rounded-2xl text-left border transition-all cursor-pointer"
                    style={{
                      background: projectFormat === "online" ? "var(--color-accent-soft)" : "var(--color-bg-elevated)",
                      border: `1px solid ${projectFormat === "online" ? "var(--color-accent)" : "var(--color-hairline)"}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1" style={{ color: projectFormat === "online" ? "var(--color-accent)" : "var(--color-text-primary)" }}>
                      <Video className="w-5 h-5" />
                      <span className="font-semibold text-sm font-display">Online / Remote</span>
                    </div>
                    <p className="text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>
                      Performers record and deliver deliverables digitally from anywhere.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProjectFormat("onsite")}
                    className="p-4 rounded-2xl text-left border transition-all cursor-pointer"
                    style={{
                      background: projectFormat === "onsite" ? "var(--color-accent-soft)" : "var(--color-bg-elevated)",
                      border: `1px solid ${projectFormat === "onsite" ? "var(--color-accent)" : "var(--color-hairline)"}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1" style={{ color: projectFormat === "onsite" ? "var(--color-accent)" : "var(--color-text-primary)" }}>
                      <MapPin className="w-5 h-5" />
                      <span className="font-semibold text-sm font-display">On-site Event</span>
                    </div>
                    <p className="text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>
                      Requires in-person attendance at a specific venue in Nigeria.
                    </p>
                  </button>
                </div>
              </FormField>

              {projectFormat === "onsite" && (
                <FormField label="Venue Location *">
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-accent)" }} />
                    <Input
                      className="pl-9 text-sm"
                      placeholder="e.g., Eko Hotel Grand Ballroom, Victoria Island, Lagos"
                      value={venueLocation}
                      onChange={(e) => setVenueLocation(e.target.value)}
                    />
                  </div>
                </FormField>
              )}
            </motion.div>
          )}

          {/* Step 2 — Requirements */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="font-display text-2xl mb-1" style={{ color: "var(--color-text-primary)" }}>Performer Requirements</h2>
                <p className="text-sm font-body" style={{ color: "var(--color-text-secondary)" }}>What craft category are you looking to cast?</p>
              </div>

              <FormField label="Creative Niche * (select all that apply)">
                <div className="grid grid-cols-2 gap-2">
                  {NICHES.map((niche) => {
                    const selected = selectedNiches.includes(niche.id);
                    return (
                      <button
                        key={niche.id}
                        type="button"
                        onClick={() => toggleNiche(niche.id)}
                        className="flex items-center gap-2.5 p-3.5 rounded-xl text-left transition-all relative cursor-pointer"
                        style={{
                          background: selected ? "var(--color-accent-soft)" : "var(--color-bg-elevated)",
                          border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-hairline)"}`,
                        }}
                      >
                        <niche.icon className="w-5 h-5 shrink-0" style={{ color: selected ? "var(--color-accent)" : "var(--color-text-tertiary)" }} />
                        <span className="text-sm font-body font-medium" style={{ color: selected ? "var(--color-accent)" : "var(--color-text-secondary)" }}>{niche.label}</span>
                        {selected && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--color-accent)" }}>
                            <Check className="w-2.5 h-2.5" style={{ color: "var(--color-accent-on)" }} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField label="Timeline">
                  <select
                    className="w-full h-[54px] px-4 rounded-[var(--radius-lg)] text-base font-body border appearance-none"
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)", color: "var(--color-text-primary)" }}
                  >
                    <option value="">Select...</option>
                    <option>ASAP (1–3 days)</option>
                    <option>This week</option>
                    <option>2 weeks</option>
                    <option>This month</option>
                    <option>Flexible</option>
                  </select>
                </FormField>

                <div className="relative">
                  <label className="block text-xs font-semibold uppercase tracking-wider font-body mb-2" style={{ color: "var(--color-text-secondary)" }}>
                    Audition Location Focus
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--color-accent)" }} />
                    <Input
                      className="pl-9 pr-8 h-[54px] text-sm"
                      placeholder="e.g., Lagos, Abuja, or Remote"
                      value={locationInput}
                      onFocus={() => setShowLocationDropdown(true)}
                      onChange={(e) => {
                        setLocationInput(e.target.value);
                        setLocationValue(e.target.value);
                        setShowLocationDropdown(true);
                      }}
                    />
                    {locationInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setLocationInput("");
                          setLocationValue("");
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Location interactive dropdown */}
                  {showLocationDropdown && filteredLocations.length > 0 && (
                    <div
                      className="absolute left-0 right-0 top-full mt-1.5 p-1 rounded-xl shadow-xl max-h-48 overflow-y-auto space-y-0.5 z-50"
                      style={{
                        background: "var(--color-bg-surface)",
                        border: "1px solid var(--color-hairline)",
                      }}
                    >
                      {filteredLocations.map((item) => (
                        <button
                          key={item.city}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setLocationInput(item.city);
                            setLocationValue(item.city);
                            setShowLocationDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--color-bg-elevated)] transition-colors flex items-baseline justify-between gap-3 cursor-pointer"
                        >
                          <span className="text-sm font-body font-medium" style={{ color: "var(--color-text-primary)" }}>{item.city}</span>
                          <span className="text-[11px] font-body shrink-0" style={{ color: "var(--color-text-tertiary)" }}>{item.state}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3 — Assets */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="font-display text-2xl mb-1" style={{ color: "var(--color-text-primary)" }}>Assets</h2>
                <p className="text-sm font-body" style={{ color: "var(--color-text-secondary)" }}>
                  Review your project synopsis, audition script sides, and attached reference materials.
                </p>
              </div>

              <FormField label="Project Description & Synopsis">
                <textarea
                  className="w-full px-4 py-3 rounded-2xl text-sm font-body border resize-none transition-colors"
                  rows={4}
                  placeholder="Describe your project, goals, and what you're looking for in a performer..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)", color: "var(--color-text-primary)" }}
                />
              </FormField>

              <FormField label="Audition Sides & Script Excerpt">
                <textarea
                  className="w-full px-4 py-3 rounded-2xl text-xs sm:text-sm font-mono border resize-none transition-colors"
                  rows={4}
                  placeholder="Paste sides / script excerpt for auditioning talent to read and submit takes for..."
                  value={auditionSides}
                  onChange={(e) => setAuditionSides(e.target.value)}
                  style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)", color: "var(--color-text-primary)" }}
                />
              </FormField>

              {/* Attached Reference Files */}
              {draftAssets.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider font-body" style={{ color: "var(--color-text-secondary)" }}>
                    Attached Project Reference Files ({draftAssets.length})
                  </label>
                  <div className="space-y-2">
                    {draftAssets.map((asset, idx) => (
                      <div
                        key={asset.name + idx}
                        className="flex items-center justify-between p-3 rounded-xl border text-xs font-body"
                        style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                          <div className="truncate">
                            <span className="font-semibold text-[var(--color-text-primary)] block truncate">{asset.name}</span>
                            <span className="text-[var(--color-text-tertiary)]">{asset.type} · {asset.size}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDraftAssets((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:underline px-2 py-1 cursor-pointer shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div
                className="relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                  borderColor: uploadedFile ? "var(--color-success)" : "var(--color-hairline)",
                  background: uploadedFile ? "var(--color-success-bg)" : "var(--color-bg-elevated)",
                }}
              >
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.doc,.docx,.txt,.mp3,.mp4,.wav"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setUploadedFile(f);
                      setDraftAssets((prev) => [
                        ...prev,
                        { name: f.name, size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`, type: f.type.includes("pdf") ? "PDF Document" : "Reference File" },
                      ]);
                    }
                  }}
                />
                {!uploadedFile ? (
                  <>
                    <UploadCloud className="w-10 h-10 mb-3" style={{ color: "var(--color-text-tertiary)" }} />
                    <p className="text-sm font-body mb-1" style={{ color: "var(--color-text-secondary)" }}>
                      Attach script, brief document, or audio reference
                    </p>
                    <p className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>
                      PDF, DOC, DOCX, TXT, MP3, WAV, MP4 · Max 50MB
                    </p>
                  </>
                ) : (
                  <>
                    <FileText className="w-10 h-10 mb-3" style={{ color: "var(--color-success)" }} />
                    <p className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>{uploadedFile.name}</p>
                    <p className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>
                      {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                    <button
                      className="mt-2 text-xs font-body hover:underline relative z-10"
                      style={{ color: "var(--color-error)" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedFile(null);
                      }}
                    >
                      Remove file
                    </button>
                  </>
                )}
              </div>

              <FormField label="Additional Notes & Guidelines for Performers">
                <textarea
                  className="w-full px-4 py-3 rounded-xl text-sm font-body border resize-none"
                  rows={4}
                  placeholder="Any specific delivery format, tone preferences, acoustics, or performer instructions..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)", color: "var(--color-text-primary)" }}
                />
              </FormField>
            </motion.div>
          )}

          {/* Step 4 — Review & Agreement */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="font-display text-2xl mb-1" style={{ color: "var(--color-text-primary)" }}>Review &amp; Agreement</h2>
                <p className="text-sm font-body" style={{ color: "var(--color-text-secondary)" }}>Please review booking terms and your prefilled draft details:</p>
              </div>

              {/* Review & Agreement Card */}
              <div
                className="p-4 sm:p-5 rounded-2xl space-y-3.5"
                style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-hairline)" }}
              >
                <div className="space-y-2.5 text-xs font-body leading-relaxed divide-y divide-[var(--color-hairline)]" style={{ color: "var(--color-text-secondary)" }}>
                  <div className="pt-1">
                    <strong className="font-semibold block mb-0.5" style={{ color: "var(--color-text-primary)" }}>
                      Escrow Protection &amp; Transparent Fee Policy:
                    </strong>
                    100% of your project budget is held securely in escrow by Paystack and is only released after milestone delivery and approval. A transparent 12% client escrow protection fee is added at deposit, and a 7% platform fee is deducted from the performer's payout upon completion.
                  </div>
                  <div className="pt-2">
                    <strong className="font-semibold block mb-0.5" style={{ color: "var(--color-text-primary)" }}>
                      Performer Verification:
                    </strong>
                    Performers must confirm availability check ins prior to your project 3 separate times to ensure attendance.
                  </div>
                  <div className="pt-2">
                    <strong className="font-semibold block mb-0.5" style={{ color: "var(--color-text-primary)" }}>
                      Cancellation &amp; Refund Policy:
                    </strong>
                    If a performer fails any confirmation check ins or cancels, you receive a refund of your booking amount, minus payment processing charges capped at NGN 5,000.
                  </div>
                </div>

                <div className="pt-3 border-t" style={{ borderColor: "var(--color-hairline)" }}>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[var(--color-accent)] focus:ring-[var(--color-accent)] cursor-pointer"
                    />
                    <span className="text-xs font-semibold font-body leading-normal" style={{ color: "var(--color-text-primary)" }}>
                      I agree to the Terms of Service, Escrow Policy, and Processing Fee Terms. (Mandatory)
                    </span>
                  </label>
                </div>
              </div>

              {/* Project Overview Card */}
              <div className="p-4 rounded-2xl" style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-hairline)" }}>
                <div className="text-xs font-medium uppercase tracking-wider mb-3 font-body" style={{ color: "var(--color-text-tertiary)" }}>
                  Project Overview
                </div>
                <div className="space-y-2 text-sm font-body">
                  {[
                    { label: "Name", value: projectName || "—" },
                    { label: "Type", value: projectType || "—" },
                    { label: "Format", value: projectFormat === "onsite" ? `On-site (${venueLocation || "Venue TBD"})` : "Online / Remote" },
                    { label: "Craft Niches", value: selectedNiches.length > 0 ? selectedNiches.map((id) => NICHES.find((n) => n.id === id)?.label || id).join(", ") : "—" },
                    { label: "Audition Sides", value: auditionSides ? `${auditionSides.slice(0, 70)}…` : "Not provided" },
                    { label: "Reference Files", value: `${draftAssets.length + (uploadedFile ? 1 : 0)} attached` },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-baseline gap-4 py-1 border-b last:border-0" style={{ borderColor: "var(--color-hairline)" }}>
                      <span style={{ color: "var(--color-text-tertiary)" }}>{item.label}</span>
                      <span className="font-medium text-right truncate max-w-[240px]" style={{ color: "var(--color-text-primary)" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 5 — Budget & Publish */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="font-display text-2xl mb-1" style={{ color: "var(--color-text-primary)" }}>Budget &amp; Escrow Deposit</h2>
                <p className="text-sm font-body" style={{ color: "var(--color-text-secondary)" }}>Set your project budget range to attract the right performers.</p>
              </div>

              {/* Currency selector */}
              <div className="flex gap-2">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setSelectedCurrency(c.code)}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold font-body border transition-all cursor-pointer"
                    style={{
                      background: selectedCurrency === c.code ? "var(--color-accent-soft)" : "var(--color-bg-elevated)",
                      border: `1px solid ${selectedCurrency === c.code ? "var(--color-accent)" : "var(--color-hairline)"}`,
                      color: selectedCurrency === c.code ? "var(--color-accent)" : "var(--color-text-secondary)",
                    }}
                  >
                    {c.flag} {c.code}
                  </button>
                ))}
              </div>

              {/* Budget amount input & slider */}
              <div
                className="p-5 rounded-2xl space-y-4"
                style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-hairline)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider font-body" style={{ color: "var(--color-text-secondary)" }}>
                    Total Budget ({activeCurr.code})
                  </span>
                  <div className="flex items-center gap-1 font-display text-2xl" style={{ color: "var(--color-text-primary)" }}>
                    <span>{symbol}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={budgetInputStr}
                      onChange={handleBudgetInputChange}
                      onFocus={handleBudgetInputFocus}
                      onBlur={handleBudgetInputBlur}
                      className="bg-transparent border-b border-[var(--color-hairline)] w-36 text-right font-display text-2xl font-bold focus:outline-none focus:border-[var(--color-accent)]"
                      style={{ color: "var(--color-text-primary)" }}
                    />
                  </div>
                </div>

                <input
                  type="range"
                  min={10000}
                  max={sliderMax}
                  step={5000}
                  value={budgetAmount}
                  onChange={handleSliderChange}
                  className="w-full accent-[var(--color-accent)] cursor-pointer"
                />

                <div className="flex justify-between text-xs font-mono" style={{ color: "var(--color-text-tertiary)" }}>
                  <span>{symbol}10,000</span>
                  <span>{symbol}{sliderMax.toLocaleString("en-US")}+</span>
                </div>
              </div>

              {/* Applicant Cap */}
              <FormField label="Target Applicant Cap (Optional)">
                <div className="relative">
                  <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-tertiary)" }} />
                  <Input
                    className="pl-9 text-sm"
                    placeholder="e.g., 10 (Leave blank for unlimited applicants)"
                    value={applicantCap}
                    onChange={(e) => setApplicantCap(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </FormField>

              {/* Escrow Payment Method Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider font-body" style={{ color: "var(--color-text-secondary)" }}>
                  Escrow Deposit Funding Method
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFundingSource("wallet")}
                    className="p-4 rounded-2xl text-left border transition-all cursor-pointer"
                    style={{
                      background: fundingSource === "wallet" ? "var(--color-accent-soft)" : "var(--color-bg-elevated)",
                      border: `1px solid ${fundingSource === "wallet" ? "var(--color-accent)" : "var(--color-hairline)"}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1" style={{ color: fundingSource === "wallet" ? "var(--color-accent)" : "var(--color-text-primary)" }}>
                      <Wallet className="w-4 h-4" />
                      <span className="font-semibold text-sm font-display">Client Wallet</span>
                    </div>
                    <p className="text-xs font-body font-mono" style={{ color: "var(--color-text-secondary)" }}>
                      Balance: ₦{walletBalance.toLocaleString()}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFundingSource("card")}
                    className="p-4 rounded-2xl text-left border transition-all cursor-pointer"
                    style={{
                      background: fundingSource === "card" ? "var(--color-accent-soft)" : "var(--color-bg-elevated)",
                      border: `1px solid ${fundingSource === "card" ? "var(--color-accent)" : "var(--color-hairline)"}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1" style={{ color: fundingSource === "card" ? "var(--color-accent)" : "var(--color-text-primary)" }}>
                      <CreditCard className="w-4 h-4" />
                      <span className="font-semibold text-sm font-display">Paystack Card</span>
                    </div>
                    <p className="text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>
                      Debit card or bank transfer
                    </p>
                  </button>
                </div>

                {fundingSource === "wallet" && walletBalance < budgetAmount && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Wallet balance is lower than project budget</span>
                    </div>
                    <Button size="sm" className="h-7 px-2.5 text-xs font-semibold" onClick={() => setShowFundModal(true)}>
                      Top Up Wallet
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky CTA bar */}
      <div
        className="sticky bottom-0 z-40 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] glass-panel"
        style={{ borderTop: "1px solid var(--color-hairline)" }}
      >
        <div className="max-w-xl mx-auto w-full">
          <div className="flex gap-3">
            {step > 1 && (
              <Button variant="secondary" className="flex-1 h-12 cursor-pointer" onClick={() => setStep((step - 1) as Step)}>
                Back
              </Button>
            )}
            <Button
              className="flex-1 h-12 font-bold cursor-pointer"
              disabled={!canAdvance() || publishing}
              onClick={handleNext}
              aria-label={
                step === 5
                  ? fundingSource === "card"
                    ? `Pay ₦${budgetAmount.toLocaleString()} with Paystack`
                    : publishing
                    ? "Publishing…"
                    : "Publish Project"
                  : step === 4
                  ? "Continue to Budget & Payment"
                  : "Continue"
              }
              style={{
                background: step === 5 && fundingSource === "card" ? "#0BA4DB" : undefined,
                color: step === 5 && fundingSource === "card" ? "#FFFFFF" : undefined,
              }}
            >
              {step === 5 ? (
                fundingSource === "card" ? (
                  <>
                    <span className="hidden sm:inline">Pay ₦{budgetAmount.toLocaleString()} with Paystack</span>
                    <span className="sm:hidden">Pay ₦{budgetAmount.toLocaleString()}</span>
                  </>
                ) : publishing ? (
                  "Publishing…"
                ) : (
                  <>
                    <span className="hidden sm:inline">Publish Project</span>
                    <span className="sm:hidden">Publish</span>
                  </>
                )
              ) : step === 4 ? (
                <>
                  <span className="hidden sm:inline">Continue to Budget &amp; Payment</span>
                  <span className="sm:hidden">Continue</span>
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between mt-2.5">
            {step < 4 ? (
              <button
                className="text-xs font-body hover:opacity-80 transition-opacity cursor-pointer"
                style={{ color: "var(--color-text-tertiary)" }}
                onClick={() => setStep((step + 1) as Step)}
              >
                Skip this step
              </button>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={handleSaveDraft}
              className="text-xs font-body hover:underline cursor-pointer inline-flex items-center gap-1.5"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <Save className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>Save draft &amp; finish later</span>
            </button>
          </div>
        </div>
      </div>

      {showPaystackModal && (
        <PaystackModal
          isOpen={showPaystackModal}
          onClose={() => setShowPaystackModal(false)}
          amount={budgetAmount}
          email="client@filmcraft.ng"
          onSuccess={() => {
            setShowPaystackModal(false);
            executePublish();
          }}
        />
      )}

      {limitError && (
        <Modal onClose={() => setLimitError(null)} align="center" strength="strong">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#16161A] border border-gray-200 dark:border-[#26262E] rounded-[28px] p-6 max-w-sm w-full text-center space-y-6 shadow-2xl relative"
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-[#F13030]/10 flex items-center justify-center text-[#F13030]">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold font-display text-[#16161A] dark:text-white">
                {limitError.heading}
              </h3>
              <p className="text-sm text-gray-600 dark:text-[#A6A6B0] font-body leading-relaxed">
                {limitError.subtext}
              </p>
            </div>
            <button
              onClick={() => setLimitError(null)}
              className="w-full py-3 rounded-full bg-[#F13030] text-white font-bold text-sm hover:bg-[#d31f20] transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              Adjust Amount
            </button>
          </div>
        </Modal>
      )}

      {showFundModal && (
        <Modal onClose={() => setShowFundModal(false)} align="center" strength="strong">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#16161A] border border-gray-200 dark:border-[#26262E] rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-display text-zinc-900 dark:text-white">
                Fund Your Wallet
              </h3>
              <button
                onClick={() => setShowFundModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-body text-zinc-600 dark:text-zinc-400">
              Top up your Monologg wallet balance instantly with Paystack to reserve escrow funds.
            </p>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 font-body text-zinc-600 dark:text-zinc-400">
                Deposit Amount (₦)
              </label>
              <Input
                value={fundAmount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setFundAmount(raw ? Number(raw).toLocaleString() : "");
                }}
                className="font-mono text-base font-bold"
                placeholder="e.g. 100,000"
              />
            </div>
            <div className="flex gap-2">
              {[50000, 100000, 200000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setFundAmount(amt.toLocaleString())}
                  className="flex-1 py-1 px-2 rounded-lg text-xs font-mono border border-zinc-200 dark:border-zinc-700 hover:border-purple-500 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  ₦{amt.toLocaleString()}
                </button>
              ))}
            </div>
            <Button
              className="w-full h-11 text-xs font-bold gap-2 cursor-pointer"
              disabled={fundingProcessing || !fundAmount}
              onClick={() => {
                const num = parseInt(fundAmount.replace(/\D/g, ""), 10);
                if (num > 0) {
                  setFundingProcessing(true);
                  setTimeout(() => {
                    appStateSync.fundWallet(num);
                    setWalletBalance(appStateSync.getBalance().available);
                    setFundingProcessing(false);
                    setShowFundModal(false);
                  }, 500);
                }
              }}
            >
              <CreditCard className="w-4 h-4" />
              <span>{fundingProcessing ? "Processing via Paystack…" : `Pay ₦${fundAmount} with Paystack`}</span>
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
