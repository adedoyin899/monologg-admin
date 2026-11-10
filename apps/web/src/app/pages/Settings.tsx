import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { FormField } from "../components/ui/FormField";
import { Badge } from "../components/ui/Badge";
import { useTheme } from "../Root";
import { EASE_OUT, DURATION_MED } from "../../lib/motionTokens";
import { apiClient, type PhysicalAttributes, type AttributeVisibility, type UpdateAttributesInput } from "../../lib/api-client";
import { appStateSync, type BillingCard } from "../../lib/state-sync";
import { NIGERIAN_BANKS, type BankLookupStatus, type PayoutAccountChangeRequest } from "../../lib/payoutBanks";
import { Modal } from "../components/ui/Modal";
import type { ServiceRateCard } from "@monologg/types";
import {
  ChevronLeft, User, CreditCard, Bell, Shield, LogOut, ChevronRight,
  Sun, Moon, Camera, Check, Trash2, Plus, Receipt, LifeBuoy, FileText, Ruler, Building, Edit2, X,
  MapPin, Share2, Play, CheckCircle2, ExternalLink, Instagram, Youtube, Twitter, Linkedin, Music,
  Info, AlertTriangle, Clock, Sparkles, Drama, AudioLines, Laugh, Headphones, Video, Mic, Calendar as CalendarIcon, RotateCcw,
  ShieldCheck, Lock
} from "lucide-react";
import { UploadPerformanceReelModal } from "../components/UploadPerformanceReelModal";
import { WatchPerformanceReelModal } from "../components/WatchPerformanceReelModal";

type Section = "main" | "profile" | "payment" | "notifications" | "security" | "attributes" | "craft_details" | "terms" | "escrow";

const TERMS_OF_SERVICE_ITEMS = [
  {
    title: "Eligibility & Account Responsibilities",
    description: "You must be at least 18 years of age (or the legal age of majority in your jurisdiction) to register an account on Monologg. You are responsible for safeguarding your credentials and maintaining verified, accurate profile information.",
  },
  {
    title: "Marketplace & Booking Engagements",
    description: "Monologg provides a direct brief-to-booking pipeline connecting clients with verified performing artists. Selecting a rate card or accepting a project brief constitutes a binding legal engagement under the Monologg Standard Booking Agreement.",
  },
  {
    title: "Professional Conduct & Non-Circumvention",
    description: "All client-performer communications, briefing documents, milestone files, and financial payments must occur strictly within the Monologg platform. Off-platform payment solicitation constitutes a material breach and results in immediate account forfeiture.",
  },
  {
    title: "Deliverables, Licensing & Intellectual Property",
    description: "Performers retain copyright in their original likeness, voice recordings, and preexisting portfolio assets. Upon full escrow payout release, the client receives the specific commercial or non-exclusive license designated in the agreed brief.",
  },
  {
    title: "Platform Fees & Fair Trade Transparency",
    description: "Monologg operates with unbundled, transparent fees: a 7% service fee is deducted from the performer's base rate, and a 12% escrow processing fee is paid by the client at checkout. No hidden agency cuts or arbitrary delays.",
  },
  {
    title: "Order Room Mediation & Dispute Arbitration",
    description: "Any deliverable disagreements, scope issues, or attendance disputes are mediated through the Order Room arbitration system by Monologg Trust & Safety within 24 to 48 hours. Engagements are governed by applicable commercial laws.",
  },
];

const CLIENT_ESCROW_TERMS = [
  {
    title: "100% Upfront Funding & Isolation",
    badge: "Deposit",
    description: "100% of the agreed project fee plus the 12% escrow processing fee is deposited via Paystack at checkout. Funds remain securely vaulted in escrow and are never accessible to the performer prior to verified milestone delivery.",
  },
  {
    title: "Order Room Contract Activation",
    badge: "Workspace",
    description: "Escrow confirmation automatically activates the dedicated Order Room workspace, locking in shoot dates, call times, script attachments, and micro-deliverable specifications as binding mutual covenants.",
  },
  {
    title: "48-Hour Inspection & Review Window",
    badge: "Review",
    description: "When the performer submits digital files or checks in at a live venue via mutual 4-digit PIN, your 48-hour inspection window begins. Use this time to inspect assets, test deliverables, or request in-scope revisions.",
  },
  {
    title: "Automated Release Upon Approval",
    badge: "Payout",
    description: "Clicking 'Approve Deliverables' or 'Release Payment' transfers escrow funds to the performer's wallet instantly. If no action is taken and no dispute is filed within 48 hours, the system auto-releases payment to guarantee fair talent treatment.",
  },
  {
    title: "Cancellation & Refund Protection",
    badge: "Refunds",
    description: "Full 100% refund if the performer cancels or fails to deliver. If you cancel ≥48 hours before call time, a 95% refund is issued (5% processing fee retained). Cancellations under 24 hours allocate a 50% kill-fee to the performer for reserved time.",
  },
  {
    title: "Dispute Freezing & Evidence Review",
    badge: "Mediation",
    description: "If submitted work deviates materially from the agreed brief, clicking 'Dispute Booking' immediately freezes escrow release. Monologg Trust & Safety mediators review chat logs, brief specs, and uploaded files within 24 hours.",
  },
  {
    title: "Anti-Circumvention Protection Guarantee",
    badge: "Security",
    description: "Escrow protections, dispute arbitration, and refund guarantees apply exclusively to payments routed through Monologg. Off-platform wire transfers or direct arrangements forfeit all protection.",
  },
];

const PERFORMER_ESCROW_TERMS = [
  {
    title: "Pre-Funded Gig Guarantee",
    badge: "Guaranteed",
    description: "Never work on speculation. You are never expected to rehearse, travel, or deliver creative work until 100% of the client's budget is confirmed and locked in Monologg Escrow.",
  },
  {
    title: "Verified Delivery & Attendance PIN",
    badge: "Delivery",
    description: "Digital deliverables are uploaded directly to the Order Room dropzone. Live in-person gigs are verified instantaneously using a 4-digit mutual attendance PIN entered with the client at the venue.",
  },
  {
    title: "48-Hour Auto-Release Safeguard",
    badge: "Timely Pay",
    description: "Clients have exactly 48 hours to inspect submitted work. If the client approves early or does not file a dispute within 48 hours, escrow funds auto-release directly to your wallet.",
  },
  {
    title: "Transparent 93% Net Take-Home",
    badge: "Earnings",
    description: "You keep exactly 93% of your rate card base price. The 7% platform service fee covers escrow vaulting, Paystack settlement, and 24/7 mediation. Zero hidden agency commissions (saving 13–18% vs legacy agencies).",
  },
  {
    title: "Late Cancellation Kill-Fee Protection",
    badge: "Kill-Fee",
    description: "If a client cancels less than 24 hours prior to call time, you automatically receive a 50% kill-fee from the locked escrow to compensate for your blocked calendar. Completed submissions receive 100%.",
  },
  {
    title: "Scope Creep & Revisions Safeguard",
    badge: "Scope",
    description: "You are only contractually obligated to fulfill what was agreed in the project brief and accepted rate card. Additional revision rounds require the client to deposit a supplementary milestone escrow before work begins.",
  },
  {
    title: "Instant Bank Withdrawals via Paystack",
    badge: "Withdrawal",
    description: "Once escrow releases to your balance, withdraw anytime directly to any verified Nigerian bank account via Paystack instant settlement, protected by your 4-digit security passcode and OTP.",
  },
  {
    title: "Impartial Dispute Resolution Rights",
    badge: "Fairness",
    description: "If a client unreasonably withholds payment approval, Monologg mediators evaluate your uploaded proofs, timestamped chat records, and brief specifications. Verified artistic work is always paid.",
  },
];

const CRAFT_CATEGORIES = [
  { id: "actors", label: "Actor", icon: Drama, desc: "Screen, feature film, and stage drama roles" },
  { id: "public_speakers", label: "Public speaker", icon: AudioLines, desc: "Keynotes, panel discussions, and conferences" },
  { id: "comperes", label: "Compere", icon: Mic, desc: "Event hosting, MC, and ceremonies" },
  { id: "comedians", label: "Comedian", icon: Laugh, desc: "Stand-up, improv, and comedic sketches" },
  { id: "artists", label: "Artist", icon: Headphones, desc: "Musical performances, vocal tracks, and studio voice" },
  { id: "creators", label: "Creator", icon: Video, desc: "Digital storytelling, UGC, and commercial brand content" },
];

const CRAFT_DEFAULT_SUMMARIES: Record<string, string> = {
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

const CRAFT_SUGGESTED_TAGS = [
  "Conversational",
  "Expressive",
  "High Energy",
  "Deep Voice",
  "Commanding",
  "Narrative",
  "Character",
  "Nuanced",
  "Vibrant",
];

const CRAFT_NIGERIAN_CITIES = [
  "Ikeja", "Lekki", "Victoria Island", "Yaba", "Surulere", "Ajah", "Maryland",
  "Abuja FCT", "Port Harcourt", "Ibadan", "Benin City", "Enugu", "Asaba", "Calabar", "Uyo"
];

const ATTRIBUTE_FIELDS: Array<{ key: keyof UpdateAttributesInput; label: string; options: string[] }> = [
  { key: "heightRange", label: "Height", options: ["UNDER_150CM", "CM_150_160", "CM_160_170", "CM_170_180", "CM_180_190", "OVER_190CM"] },
  { key: "weightRange", label: "Weight", options: ["UNDER_50KG", "KG_50_65", "KG_65_80", "KG_80_95", "OVER_95KG"] },
  { key: "ageRange", label: "Age range", options: ["RANGE_18_25", "RANGE_26_35", "RANGE_36_45", "RANGE_46_55", "RANGE_56_65", "OVER_65"] },
  { key: "build", label: "Build", options: ["SLIM", "ATHLETIC", "AVERAGE", "CURVY", "PLUS_SIZE", "MUSCULAR"] },
  { key: "complexion", label: "Complexion", options: ["FAIR", "LIGHT", "MEDIUM", "TAN", "DARK", "DEEP"] },
  { key: "hairColor", label: "Hair color", options: ["BLACK", "BROWN", "BLONDE", "RED", "GREY", "WHITE", "DYED_OTHER"] },
  { key: "eyeColor", label: "Eye color", options: ["BROWN", "BLACK", "HAZEL", "GREEN", "BLUE", "GREY"] },
  { key: "genderPresentation", label: "Gender presentation", options: ["MASCULINE", "FEMININE", "ANDROGYNOUS", "NON_BINARY"] },
];
const ATTRIBUTES_CONSENT_VERSION = "attrs-v1";
const VISIBILITY_LEVELS: AttributeVisibility[] = ["PRIVATE", "SEARCHABLE", "PUBLIC"];

const TOGGLE = ({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) => (
  <button
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={onToggle}
    className="w-11 h-6 rounded-full transition-all relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
    style={{ background: on ? "var(--color-accent)" : "var(--color-bg-elevated)", border: "1px solid var(--color-hairline)" }}
  >
    <div
      className="w-4 h-4 rounded-full absolute top-0.5 transition-all"
      style={{ background: on ? "var(--color-accent-on)" : "var(--color-text-primary)", opacity: on ? 1 : 0.6, left: on ? "calc(100% - 18px)" : "2px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
    />
  </button>
);

export function Settings() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // Role detection: query param ?role=client or fallback to client detection
  const roleParam = searchParams.get("role");
  const isClient = roleParam === "client";
  const sectionParam = searchParams.get("section") as Section | null;

  const [section, setSection] = useState<Section>(() => {
    if (sectionParam && ["main", "profile", "payment", "craft_details", "attributes", "notifications", "security", "terms", "escrow"].includes(sectionParam)) {
      return sectionParam;
    }
    return "main";
  });

  // Talent fields
  const [name, setName] = useState("Emeka Johnson");
  const [email, setEmail] = useState("emeka@example.com");
  const [stageTitle, setStageTitle] = useState("Actor & Voice Artist");
  const [niche, setNiche] = useState("actors");
  const [bio, setBio] = useState("Specializing in intense dramatic monologues, voice-overs, and Nollywood screen roles.");
  const [location, setLocation] = useState("Lagos, Nigeria");
  const [isAvailable, setIsAvailable] = useState(true);
  const [tags, setTags] = useState<string[]>(["Dramatic", "Voice-Over", "Commercial", "Nollywood", "Authoritative"]);
  const [newTag, setNewTag] = useState("");
  const [socialLinks, setSocialLinks] = useState({
    instagram: "emekajohnson",
    youtube: "emekaofficial",
    twitter: "emekaj",
    tiktok: "emekaacts",
    linkedin: "emeka-johnson",
    spotify: "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverPreset, setCoverPreset] = useState("crimson-studio");
  const [performanceReelUrl, setPerformanceReelUrl] = useState<string | null>(null);
  const [performanceReelTitle, setPerformanceReelTitle] = useState<string | null>("Featured Audition Reel");
  const [hasReel, setHasReel] = useState(true);
  const [services, setServices] = useState<ServiceRateCard[]>(() => appStateSync.getServices());

  // Interactive profile editor states
  const [isEditingProfile, setIsEditingProfile] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [showUploadReelModal, setShowUploadReelModal] = useState(false);
  const [showWatchReelModal, setShowWatchReelModal] = useState(false);

  // Personal & Craft Details fields (simple read-only by default with edit toggle)
  const [gender, setGender] = useState<string>(() => appStateSync.getTalentProfile().gender || "Female");
  const [dob, setDob] = useState<string>(() => appStateSync.getTalentProfile().dob || "2000-05-15");
  const [craftLocation, setCraftLocation] = useState<string>(() => {
    const loc = appStateSync.getTalentProfile().location;
    if (loc && loc.includes("Ikeja")) return "Ikeja";
    if (loc && loc !== "Lagos, Nigeria") return loc.replace(/, Nigeria$/, "");
    return "Ikeja";
  });
  const [selectedCraft, setSelectedCraft] = useState<string>(() => appStateSync.getTalentProfile().craft || "actors");
  const [performanceSummary, setPerformanceSummary] = useState<string>(
    () => appStateSync.getTalentProfile().performanceSummary || CRAFT_DEFAULT_SUMMARIES.actors
  );
  const [craftTags, setCraftTags] = useState<string[]>(
    () => appStateSync.getTalentProfile().craftTags || ["Warm Texture", "Conversational", "Expressive", "High Energy"]
  );
  const [isEditingCraftDetails, setIsEditingCraftDetails] = useState(false);
  const [newCraftTagInput, setNewCraftTagInput] = useState("");

  const handleSaveCraftDetails = () => {
    appStateSync.updateTalentProfile({
      gender,
      dob,
      craft: selectedCraft,
      performanceSummary,
      craftTags,
      location: craftLocation ? `${craftLocation}, Nigeria` : location,
    });
    setLocation(craftLocation ? `${craftLocation}, Nigeria` : location);
    setIsEditingCraftDetails(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Client fields
  const [clientName, setClientName] = useState("Sarah Jenkins");
  const [clientOrgName, setClientOrgName] = useState("FilmCraft Studios");
  const [clientOrgType, setClientOrgType] = useState("Production Company");
  const [clientEmail, setClientEmail] = useState("sarah@filmcraft.com");
  const [clientLocation, setClientLocation] = useState("Lagos, Nigeria");

  // Bank details
  const [bankDetails, setBankDetails] = useState(() => appStateSync.getBankDetails());
  const [editingBank, setEditingBank] = useState(false);
  const [bankName, setBankName] = useState(bankDetails.bankName || "GTBank (Guaranty Trust Bank)");
  const [accountNumber, setAccountNumber] = useState(bankDetails.accountNumber || "");
  const [accountName, setAccountName] = useState(bankDetails.accountName || "");
  const [phoneNumber, setPhoneNumber] = useState(bankDetails.phoneNumber || "");
  const [bankSearchQuery, setBankSearchQuery] = useState("");
  const [bankLookupStatus, setBankLookupStatus] = useState<BankLookupStatus>(() => {
    if (bankDetails.accountNumber && bankDetails.accountNumber.length === 10 && bankDetails.accountName) {
      return "name_matches";
    }
    return "idle";
  });
  const [payoutChangeRequest, setPayoutChangeRequest] = useState<PayoutAccountChangeRequest | null>(() => appStateSync.getPayoutAccountChangeRequest());

  // Paystack lookup simulation for Payout Bank Account
  useEffect(() => {
    if (!editingBank) return;
    if (accountNumber.length === 10) {
      setBankLookupStatus("looking_up");
      const timer = setTimeout(() => {
        const kycName = name || appStateSync.getTalentProfile().name || "Emeka Johnson";
        if (accountNumber === "0000000000") {
          setBankLookupStatus("lookup_failed");
          setAccountName("");
        } else if (accountNumber.endsWith("1")) {
          const mismatchName = "JOHN CHUKWU";
          setAccountName(mismatchName);
          setBankLookupStatus("name_mismatch");
        } else {
          const matchedName = kycName.toUpperCase();
          setAccountName(matchedName);
          setBankLookupStatus("name_matches");
        }
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setBankLookupStatus("idle");
    }
  }, [accountNumber, bankName, editingBank, name]);

  // Payment Cards state
  const [paymentCards, setPaymentCards] = useState<BillingCard[]>(() => appStateSync.getBillingCards());
  const [deleteCardModal, setDeleteCardModal] = useState<{ id: string; type: string; last4: string } | null>(null);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardName, setNewCardName] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardCvv, setNewCardCvv] = useState("");
  const [newCardIsDefault, setNewCardIsDefault] = useState(false);
  const [addCardError, setAddCardError] = useState<string | null>(null);
  const [addCardSuccess, setAddCardSuccess] = useState(false);

  const [notif, setNotif] = useState({ bookings: true, messages: true, payments: true, marketing: false, reminders: true });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [currentPasscode, setCurrentPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [passcodeSaved, setPasscodeSaved] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteScheduled, setDeleteScheduled] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Physical attributes
  const [attributes, setAttributes] = useState<PhysicalAttributes | null>(null);
  const [attrValues, setAttrValues] = useState<Record<string, string>>({});
  const [attrVisibility, setAttrVisibility] = useState<Record<string, AttributeVisibility>>({});
  const [distinctiveFeatures, setDistinctiveFeatures] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [savingAttributes, setSavingAttributes] = useState(false);

  useEffect(() => {
    if (section !== "attributes") return;
    apiClient.getMyAttributes().then((record) => {
      if (!record) return;
      setAttributes(record);
      const values: Record<string, string> = {};
      for (const field of ATTRIBUTE_FIELDS) {
        const v = record[field.key as keyof PhysicalAttributes];
        if (typeof v === "string") values[field.key] = v;
      }
      setAttrValues(values);
      setAttrVisibility((record.visibility as Record<string, AttributeVisibility>) ?? {});
      setDistinctiveFeatures(record.distinctiveFeatures ?? "");
      setConsentChecked(true);
    });
  }, [section]);

  const handleSaveAttributes = async () => {
    setSavingAttributes(true);
    try {
      const input: UpdateAttributesInput = {
        consentVersion: ATTRIBUTES_CONSENT_VERSION,
        visibility: attrVisibility,
        distinctiveFeatures: distinctiveFeatures || undefined,
      };
      for (const field of ATTRIBUTE_FIELDS) {
        const value = attrValues[field.key as string];
        if (value) (input as Record<string, unknown>)[field.key as string] = value;
      }
      const updated = await apiClient.updateMyAttributes(input);
      setAttributes(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSavingAttributes(false);
    }
  };

  const handleDeleteAttributes = async () => {
    await apiClient.deleteMyAttributes();
    setAttributes(null);
    setAttrValues({});
    setAttrVisibility({});
    setDistinctiveFeatures("");
    setConsentChecked(false);
  };

  const getBannerBackground = () => {
    if (coverUrl) {
      return `url(${coverUrl}) center / cover no-repeat`;
    }
    switch (coverPreset) {
      case "noir-velvet":
        return "linear-gradient(135deg, #26262E 0%, #16161A 50%, #0D0D11 100%)";
      case "amber-gold":
        return "linear-gradient(135deg, #D97706 0%, #92400E 60%, #1F1305 100%)";
      case "electric-violet":
        return "linear-gradient(135deg, #7C3AED 0%, #4C1D95 60%, #140727 100%)";
      case "crimson-studio":
      default:
        return "linear-gradient(135deg, #E52E2E 0%, #991B1B 50%, #450A0A 100%)";
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const url = evt.target?.result as string;
      setCoverUrl(url);
      setCoverPreset("custom");
      appStateSync.updateTalentProfile({ coverUrl: url, coverPreset: "custom" });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    };
    reader.readAsDataURL(file);
  };

  // Sync profile & bank data on mount & from appStateSync
  useEffect(() => {
    const syncData = () => {
      if (isClient) {
        const cState = appStateSync.getClientProfile();
        setClientName(cState.name);
        setClientOrgName(cState.orgName);
        if (cState.orgType) {
          const norm =
            cState.orgType === "STUDIO" ? "Production Company" :
              cState.orgType === "BRAND" ? "Brand" :
                cState.orgType === "EVENT" ? "Events Company" :
                  cState.orgType === "CHURCH" ? "Other" :
                    cState.orgType;
          setClientOrgType(norm);
        }
        setClientEmail(cState.email);
        setClientLocation(cState.location);
        if (cState.avatarUrl !== undefined) setAvatarUrl(cState.avatarUrl);
      } else {
        const tState = appStateSync.getTalentProfile();
        setName(tState.name);
        setEmail(tState.email);
        if (tState.stageTitle) setStageTitle(tState.stageTitle);
        if (tState.niche) setNiche(tState.niche.toLowerCase());
        setBio(tState.bio);
        setLocation(tState.location);
        if (tState.isAvailable !== undefined) setIsAvailable(tState.isAvailable);
        if (tState.tags) setTags(tState.tags);
        if (tState.socialLinks) setSocialLinks((prev) => ({ ...prev, ...tState.socialLinks }));
        if (tState.avatarUrl !== undefined) setAvatarUrl(tState.avatarUrl);
        if (tState.coverUrl !== undefined) setCoverUrl(tState.coverUrl);
        if (tState.coverPreset) setCoverPreset(tState.coverPreset);
        if (tState.performanceReelUrl !== undefined) setPerformanceReelUrl(tState.performanceReelUrl);
        if (tState.performanceReelTitle !== undefined) setPerformanceReelTitle(tState.performanceReelTitle);
        if (tState.hasReel !== undefined) setHasReel(tState.hasReel);
        const storedServices = appStateSync.getServices();
        if (storedServices) setServices(storedServices);
      }
      const bState = appStateSync.getBankDetails();
      setBankDetails(bState);
      setBankName(bState.bankName);
      setAccountNumber(bState.accountNumber);
      setAccountName(bState.accountName);
    };

    syncData();
    const unsubscribe = appStateSync.subscribe(syncData);

    if (isClient) {
      apiClient.getClientProfile().then((cp) => {
        setClientName(cp.name);
        if (cp.orgName) setClientOrgName(cp.orgName);
        if (cp.orgType) {
          const norm =
            cp.orgType === "STUDIO" ? "Production Company" :
              cp.orgType === "BRAND" ? "Brand" :
                cp.orgType === "EVENT" ? "Events Company" :
                  cp.orgType === "CHURCH" ? "Other" :
                    cp.orgType;
          setClientOrgType(norm);
        }
        if (cp.location) setClientLocation(cp.location);
        if (cp.avatarUrl) setAvatarUrl(cp.avatarUrl);
      }).catch(() => { });
    } else {
      apiClient.getCreatorProfile().then((profile) => {
        setName(profile.name);
        setBio(profile.bio ?? "");
        setLocation(profile.location ?? "");
        if (profile.avatarUrl) setAvatarUrl(profile.avatarUrl);
      }).catch(() => { });
      apiClient.listServices().then((srvs) => {
        if (srvs && srvs.length > 0) setServices(srvs.slice(0, 2));
      }).catch(() => { });
    }

    return unsubscribe;
  }, [isClient]);

  const initials = isClient
    ? clientOrgName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]!.toUpperCase()).join("") || "FS"
    : name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]!.toUpperCase()).join("") || "EJ";

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      if (isClient) {
        const apiOrgType: "STUDIO" | "EVENT" | "BRAND" | "CHURCH" =
          clientOrgType === "Production Company" ? "STUDIO" :
            clientOrgType === "Brand" ? "BRAND" :
              clientOrgType === "Events Company" ? "EVENT" :
                clientOrgType === "Creative Agency" ? "BRAND" :
                  clientOrgType === "Individual" ? "STUDIO" :
                    "CHURCH";
        const updated = await apiClient.updateClientProfile({
          name: clientName,
          orgName: clientOrgName,
          orgType: apiOrgType,
          location: clientLocation,
        });
        setClientName(updated.name);
        if (updated.orgName) setClientOrgName(updated.orgName);
        appStateSync.updateClientProfile({
          name: updated.name,
          orgName: updated.orgName ?? undefined,
          orgType: clientOrgType,
          location: updated.location ?? undefined,
        });
      } else {
        const updated = await apiClient.updateCreatorProfile({ name, bio, location });
        setName(updated.name);
        setBio(updated.bio ?? "");
        setLocation(updated.location ?? "");
        appStateSync.updateTalentProfile({
          name: updated.name,
          email,
          stageTitle,
          niche,
          bio: updated.bio ?? "",
          location: updated.location ?? "",
          isAvailable,
          tags,
          socialLinks,
          avatarUrl,
          coverUrl,
          coverPreset,
          performanceReelUrl,
          performanceReelTitle,
          hasReel,
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const url = evt.target?.result as string;
      setAvatarUrl(url);
      if (isClient) {
        appStateSync.updateClientProfile({ avatarUrl: url });
      } else {
        appStateSync.updateTalentProfile({ avatarUrl: url });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdatePassword = () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setPasswordError(null);
    setPasswordSaved(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSaved(true);
    setTimeout(() => {
      setPasswordSaved(false);
      setSaved(false);
    }, 2500);
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") return;
    setDeletingAccount(true);
    setTimeout(() => {
      setDeletingAccount(false);
      setDeleteScheduled(true);
    }, 800);
  };

  const handleFinishDeletion = () => {
    setShowDeleteAccountModal(false);
    setDeleteScheduled(false);
    setDeleteConfirmText("");
    navigate("/auth");
  };

  const handleUpdatePasscode = () => {
    const savedCode = localStorage.getItem("monologg_withdrawal_passcode") || "1234";
    if (currentPasscode !== savedCode) {
      setPasscodeError("Current passcode is incorrect.");
      return;
    }
    if (newPasscode.length !== 4) {
      setPasscodeError("New passcode must be exactly 4 digits.");
      return;
    }
    if (newPasscode !== confirmPasscode) {
      setPasscodeError("New passcodes do not match.");
      return;
    }
    localStorage.setItem("monologg_withdrawal_passcode", newPasscode);
    setCurrentPasscode("");
    setNewPasscode("");
    setConfirmPasscode("");
    setPasscodeError(null);
    setPasscodeSaved(true);
    setSaved(true);
    setTimeout(() => {
      setPasscodeSaved(false);
      setSaved(false);
    }, 2500);
  };

  const sectionBack = () => setSection("main");

  const effectiveServices: ServiceRateCard[] = services && services.length > 0 ? services : [
    {
      id: "srv-default-1",
      title: "Commercial Voice-Over (up to 60s)",
      price: "₦35,000",
      delivery: "24 Hours",
      bookings: 14,
    },
    {
      id: "srv-default-2",
      title: "Dramatic Video Audition Reel Monologue",
      price: "₦65,000",
      delivery: "48 Hours",
      bookings: 8,
    },
  ];

  const s = {
    text: { color: "var(--color-text-primary)" } as React.CSSProperties,
    secondary: { color: "var(--color-text-secondary)" } as React.CSSProperties,
    tertiary: { color: "var(--color-text-tertiary)" } as React.CSSProperties,
    surface: { background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)" } as React.CSSProperties,
    elevated: { background: "var(--color-bg-elevated)", border: "1px solid var(--color-hairline)" } as React.CSSProperties,
  };

  const ListItem = ({ label, icon: Icon, onClick, danger = false, value }: { label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; onClick?: () => void; danger?: boolean; value?: string }) => (
    <button
      className="w-full flex items-center gap-3 px-4 py-3.5 min-h-[56px] text-left border-b border-[var(--color-hairline)] last:border-b-0 hover:bg-[var(--color-bg-elevated)] active:scale-[0.99] transition-all"
      onClick={onClick}
    >
      <span
        className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
        style={{ background: danger ? "var(--color-error-bg)" : "var(--color-accent-soft)" }}
      >
        <Icon className="w-[18px] h-[18px]" style={{ color: danger ? "var(--color-error)" : "var(--color-accent)" }} />
      </span>
      <span className="flex-1 text-sm font-body font-medium" style={{ color: danger ? "var(--color-error)" : "var(--color-text-primary)" }}>{label}</span>
      {value && <span className="text-sm font-body font-mono tnum" style={s.tertiary}>{value}</span>}
      {!danger && <ChevronRight className="w-4 h-4" style={s.tertiary} />}
    </button>
  );

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
  };

  const formatCardExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const detectCardType = (num: string): "Visa" | "Mastercard" | "Verve" => {
    const clean = num.replace(/\D/g, "");
    if (clean.startsWith("4")) return "Visa";
    if (clean.startsWith("5") || clean.startsWith("2")) return "Mastercard";
    if (clean.startsWith("506") || clean.startsWith("6500")) return "Verve";
    return "Mastercard";
  };

  const handleSaveNewCard = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanNum = newCardNumber.replace(/\D/g, "");
    if (cleanNum.length < 15) {
      setAddCardError("Please enter a valid 16-digit card number.");
      return;
    }
    if (!newCardName.trim()) {
      setAddCardError("Please enter the name on the card.");
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(newCardExpiry)) {
      setAddCardError("Please enter a valid expiry date (MM/YY).");
      return;
    }
    const [mm, yy] = newCardExpiry.split("/").map(Number);
    if (!mm || mm < 1 || mm > 12) {
      setAddCardError("Invalid expiry month.");
      return;
    }
    if (!yy || yy < 24) {
      setAddCardError("Card has expired or invalid year.");
      return;
    }
    if (newCardCvv.length < 3) {
      setAddCardError("Please enter a valid 3-digit CVV.");
      return;
    }

    const cardType = detectCardType(cleanNum);
    appStateSync.addBillingCard({
      type: cardType,
      last4: cleanNum.slice(-4),
      expiry: newCardExpiry,
      cardholderName: newCardName.trim(),
      isDefault: newCardIsDefault || paymentCards.length === 0,
    });

    setPaymentCards(appStateSync.getBillingCards());
    setAddCardError(null);
    setShowAddCardModal(false);
    setNewCardNumber("");
    setNewCardName("");
    setNewCardExpiry("");
    setNewCardCvv("");
    setNewCardIsDefault(false);
    setAddCardSuccess(true);
    setTimeout(() => setAddCardSuccess(false), 3000);
  };

  return (
    <div className={isClient ? "role-client min-h-screen flex flex-col" : "role-talent min-h-screen flex flex-col"} style={{ background: "var(--color-bg-canvas)" }}>
      {/* Hidden file inputs for avatar & cover photo upload */}
      <input type="file" ref={fileInputRef} onChange={handlePhotoSelect} accept="image/*" className="hidden" />
      <input type="file" ref={coverFileInputRef} onChange={handleCoverUpload} accept="image/*" className="hidden" />

      {/* Header */}
      <div className="h-16 flex items-center gap-3 px-4 sticky top-0 z-40 glass-panel" style={{ borderBottom: "1px solid var(--color-hairline)" }}>
        <button
          aria-label={section === "main" ? "Go back" : "Back to settings"}
          onClick={section === "main" ? () => navigate(-1) : sectionBack}
          className="w-10 h-10 rounded-[var(--radius-full)] flex items-center justify-center hover:opacity-80 active:scale-95 transition-all shrink-0"
          style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-secondary)" }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold font-display truncate" style={s.text}>
            {section === "main" && (isClient ? "Client Settings" : "Settings")}
            {section === "profile" && (isClient ? "Profile" : "Edit Profile")}
            {section === "craft_details" && "Personal Details"}
            {section === "payment" && (isClient ? "Billing and Payments" : "Payment details")}
            {section === "notifications" && "Notifications"}
            {section === "security" && "Security & Privacy"}
            {section === "attributes" && "Physical Attributes"}
            {section === "terms" && "Terms of Service"}
            {section === "escrow" && (isClient ? "Client Escrow Policy" : "Performer Escrow Policy")}
          </div>
        </div>
        {section === "craft_details" && (
          <div className="flex items-center gap-2">
            {isEditingCraftDetails ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditingCraftDetails(false)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-full hover:bg-[var(--color-bg-elevated)] transition-colors"
                  style={s.secondary}
                >
                  Cancel
                </button>
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs gap-1 font-semibold"
                  onClick={handleSaveCraftDetails}
                >
                  <Check className="w-3.5 h-3.5" /> Save
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 px-3 text-xs gap-1.5 font-semibold"
                onClick={() => setIsEditingCraftDetails(true)}
              >
                <Edit2 className="w-3 h-3" /> Edit
              </Button>
            )}
          </div>
        )}
        {section === "profile" && (
          <Button
            size="sm"
            className="h-8 px-3 text-xs gap-1.5 font-semibold"
            onClick={handleSaveProfile}
            disabled={savingProfile}
          >
            <Check className="w-3.5 h-3.5" /> {savingProfile ? "Saving…" : "Save"}
          </Button>
        )}
        {section !== "main" && (
          <AnimatePresence>
            {saved && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                <Badge tone="success" size="lg">
                  <Check className="w-3 h-3" /> Saved
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <main id="main-content" className={`flex-1 px-4 py-5 w-full ${(section === "profile" || section === "attributes") && !isClient ? "max-w-4xl mx-auto" : "max-w-lg mx-auto"}`}>
        <AnimatePresence mode="wait">

          {/* ── Main Settings Menu ── */}
          {section === "main" && (
            <motion.div key="main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DURATION_MED, ease: EASE_OUT }} exit={{ opacity: 0 }}>
              {/* Profile summary */}
              <div
                className="p-4 rounded-[var(--radius-xl)] flex items-center gap-4 mb-6 cursor-pointer hover:border-zinc-300 transition-all"
                style={{ ...s.surface, boxShadow: "var(--shadow-card)" }}
                onClick={() => setSection("profile")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSection("profile"); } }}
              >
                <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center font-semibold text-xl font-body shrink-0" style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-body font-semibold truncate" style={s.text}>
                    {isClient ? clientOrgName : name}
                  </div>
                  <div className="text-sm font-body truncate" style={s.secondary}>
                    {isClient ? clientEmail : email}
                  </div>
                </div>
                {/* Verified badge placed prominently on the right where Edit was */}
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0"
                  style={{
                    background: "var(--color-success-bg)",
                    color: "var(--color-success)",
                    border: "1px solid color-mix(in srgb, var(--color-success) 25%, transparent)",
                  }}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{isClient ? "Verified Client" : "Verified"}</span>
                </div>
              </div>

              {/* Settings sections */}
              <div className="text-xs font-medium tracking-normal mb-2 px-1 font-body" style={s.tertiary}>Account</div>
              <div className="rounded-[var(--radius-xl)] overflow-hidden mb-6" style={{ ...s.surface, boxShadow: "var(--shadow-card)" }}>
                {isClient ? (
                  <>
                    <ListItem label="Profile" icon={Building} onClick={() => setSection("profile")} />
                    <ListItem label="Billing and Payments" icon={CreditCard} onClick={() => setSection("payment")} />
                    <ListItem label="Transaction History" icon={Receipt} onClick={() => navigate("/transactions?role=client")} />
                    <ListItem label="Notifications" icon={Bell} onClick={() => setSection("notifications")} />
                    <ListItem label="Security & Privacy" icon={Shield} onClick={() => setSection("security")} />
                  </>
                ) : (
                  <>
                    <ListItem label="Profile" icon={User} onClick={() => setSection("profile")} />
                    <ListItem label="Personal Details" icon={Sparkles} onClick={() => setSection("craft_details")} />
                    <ListItem label="Physical Attributes" icon={Ruler} onClick={() => setSection("attributes")} />
                    <ListItem label="Payment details" icon={CreditCard} onClick={() => setSection("payment")} />
                    <ListItem label="Transaction History" icon={Receipt} onClick={() => navigate("/transactions?role=talent")} />
                    <ListItem label="Notifications" icon={Bell} onClick={() => setSection("notifications")} />
                    <ListItem label="Security & Privacy" icon={Shield} onClick={() => setSection("security")} />
                  </>
                )}
              </div>

              {/* Appearance */}
              <div className="text-xs font-medium tracking-normal mb-2 px-1 font-body" style={s.tertiary}>Appearance</div>
              <div className="rounded-[var(--radius-xl)] overflow-hidden mb-6" style={{ ...s.surface, boxShadow: "var(--shadow-card)" }}>
                <div className="px-4 py-3.5 min-h-[56px] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0" style={{ background: "var(--color-accent-soft)" }}>
                      {isDark ? <Moon className="w-[18px] h-[18px]" style={{ color: "var(--color-accent)" }} /> : <Sun className="w-[18px] h-[18px]" style={{ color: "var(--color-accent)" }} />}
                    </span>
                    <span className="text-sm font-medium font-body" style={s.text}>{isDark ? "Dark Mode" : "Light Mode"}</span>
                  </div>
                  <TOGGLE on={isDark} onToggle={toggle} label={isDark ? "Switch to light mode" : "Switch to dark mode"} />
                </div>
              </div>

              {/* Support */}
              <div className="text-xs font-medium tracking-normal mb-2 px-1 font-body" style={s.tertiary}>Support &amp; legal</div>
              <div className="rounded-[var(--radius-xl)] overflow-hidden mb-6" style={{ ...s.surface, boxShadow: "var(--shadow-card)" }}>
                <ListItem label="Help Center" icon={LifeBuoy} onClick={() => navigate("/support")} />
                <ListItem label="Terms of Service" icon={FileText} onClick={() => setSection("terms")} />
                <ListItem label="Escrow Policy" icon={ShieldCheck} onClick={() => setSection("escrow")} />
              </div>

              <div className="rounded-[var(--radius-xl)] overflow-hidden" style={{ ...s.surface, boxShadow: "var(--shadow-card)" }}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3.5 min-h-[56px] text-left hover:bg-[var(--color-error-bg)] active:scale-[0.99] transition-all"
                  onClick={() => navigate("/")}
                >
                  <span className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0" style={{ background: "var(--color-error-bg)" }}>
                    <LogOut className="w-[18px] h-[18px]" style={{ color: "var(--color-error)" }} />
                  </span>
                  <span className="text-sm font-medium font-body" style={{ color: "var(--color-error)" }}>Sign Out</span>
                </button>
              </div>

              <p className="text-xs text-center mt-6 font-body" style={s.tertiary}>
                Monologg v1.0.0 · © 2024 Monologg Inc.
              </p>
            </motion.div>
          )}

          {/* ── Profile (Full Performer Profile Storefront in Editable Format) ── */}
          {section === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {isClient ? (
                <div className="space-y-5">
                  <div className="flex flex-col items-center py-2">
                    <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center font-semibold text-2xl font-body" style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
                        {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : initials}
                      </div>
                      <button
                        aria-label="Change profile photo"
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                        style={{ background: "var(--color-accent)" }}
                      >
                        <Camera className="w-4 h-4" style={{ color: "var(--color-accent-on)" }} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-body mt-3 underline underline-offset-2 hover:opacity-80 transition-opacity"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      Change Profile Photo
                    </button>
                  </div>

                  <FormField label="Brand Name">
                    <Input value={clientOrgName} onChange={e => setClientOrgName(e.target.value)} placeholder="e.g., FilmCraft Studios or your brand name" />
                  </FormField>
                  <FormField label="Primary Contact Person">
                    <Input value={clientName} onChange={e => setClientName(e.target.value)} />
                  </FormField>
                  <FormField label="Brand Type">
                    <select
                      value={clientOrgType}
                      onChange={e => setClientOrgType(e.target.value)}
                      className="w-full h-[54px] rounded-[var(--radius-lg)] border px-4 font-body text-base"
                      style={{ ...s.elevated, color: "var(--color-text-primary)" }}
                    >
                      <option value="Creative Agency">Creative Agency</option>
                      <option value="Brand">Brand</option>
                      <option value="Production Company">Production Company</option>
                      <option value="Events Company">Events Company</option>
                      <option value="Individual">Individual</option>
                      <option value="Other">Other</option>
                    </select>
                  </FormField>
                  <FormField label="Email Address">
                    <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
                  </FormField>
                  <FormField label="Location">
                    <Input value={clientLocation} onChange={e => setClientLocation(e.target.value)} />
                  </FormField>

                  <Button className="w-full h-12 font-semibold" onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* ── Rich Performer Profile Card ── */}
                  <div
                    className="rounded-[28px] overflow-hidden border shadow-sm transition-all"
                    style={{
                      background: "var(--color-bg-surface)",
                      borderColor: "var(--color-border-default)",
                      boxShadow: "var(--shadow-card)",
                    }}
                  >
                    {/* Hero Cover Banner */}
                    <div
                      className="h-44 sm:h-56 w-full relative transition-all group overflow-hidden"
                      style={{
                        background: getBannerBackground(),
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      <div className="absolute inset-0 bg-black/15 transition-opacity group-hover:bg-black/25" />

                      {/* Change Cover Button */}
                      <button
                        type="button"
                        onClick={() => coverFileInputRef.current?.click()}
                        className="absolute top-4 right-4 h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-2 backdrop-blur-md bg-black/50 hover:bg-black/75 text-white border border-white/20 transition-all shadow-md active:scale-95"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Change Cover</span>
                      </button>
                    </div>

                    {/* Main Profile Info Section */}
                    <div className="px-6 pb-8">
                      {/* Avatar & Badges Header */}
                      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
                        <div className="flex items-end gap-4">
                          <div
                            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 overflow-hidden shrink-0 shadow-lg relative group cursor-pointer"
                            style={{
                              borderColor: "var(--color-bg-surface)",
                              background: "var(--color-accent-soft)",
                              color: "var(--color-accent)",
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            title="Click to change profile photo"
                          >
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-display font-bold text-2xl sm:text-3xl">
                                {initials}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Camera className="w-6 h-6 text-white" />
                            </div>
                          </div>

                          <div className="pb-1">
                            <Badge tone="success" className="border border-[var(--color-success)] gap-1">
                              <Shield className="w-3 h-3" /> Verified Performer
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant={isEditingProfile ? "primary" : "secondary"}
                            size="sm"
                            className="gap-2 text-xs h-9"
                            onClick={() => setIsEditingProfile(!isEditingProfile)}
                          >
                            <Edit2 className="w-3.5 h-3.5" /> {isEditingProfile ? "Preview Profile" : "Edit Profile"}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-2 text-xs h-9"
                            onClick={() => setShowShare(true)}
                          >
                            <Share2 className="w-3.5 h-3.5" /> Share
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-2 text-xs h-9 hidden sm:inline-flex"
                            onClick={() => navigate("/storefront/emeka")}
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Public Storefront
                          </Button>
                        </div>
                      </div>

                      {/* Performer Name & Title */}
                      <div className="mb-4">
                        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>
                          {name || "Emeka Johnson"}
                        </h2>
                        <p className="text-sm font-body flex items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
                          <span>{stageTitle || "Actor & Voice Artist"}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 opacity-60" /> {location || "Lagos, Nigeria"}
                          </span>
                        </p>
                      </div>

                      {/* Availability Status Badge */}
                      <div className="flex items-center gap-2 mb-4">
                        {isAvailable !== false ? (
                          <>
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--color-success)" }}></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "var(--color-success)" }}></span>
                            </span>
                            <span className="text-xs font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>
                              Available for bookings &amp; casting
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                            <span className="text-xs font-semibold font-body text-amber-600 dark:text-amber-400">
                              Booked / Unavailable
                            </span>
                          </>
                        )}
                      </div>

                      {/* Social Media Row */}
                      <div className="flex flex-wrap items-center gap-2 mb-6 pt-1">
                        {socialLinks?.instagram && (
                          <a
                            href={`https://instagram.com/${socialLinks.instagram.replace(/^@/, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105 active:scale-95 bg-[var(--color-bg-elevated)] border-[var(--color-border-default)] hover:border-[#E1306C] hover:text-[#E1306C]"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            <Instagram className="w-3.5 h-3.5" />
                            <span>@{socialLinks.instagram.replace(/^@/, "")}</span>
                          </a>
                        )}
                        {socialLinks?.youtube && (
                          <a
                            href={`https://youtube.com/@${socialLinks.youtube.replace(/^@/, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105 active:scale-95 bg-[var(--color-bg-elevated)] border-[var(--color-border-default)] hover:border-[#FF0000] hover:text-[#FF0000]"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            <Youtube className="w-3.5 h-3.5" />
                            <span>@{socialLinks.youtube.replace(/^@/, "")}</span>
                          </a>
                        )}
                        {socialLinks?.tiktok && (
                          <a
                            href={`https://tiktok.com/@${socialLinks.tiktok.replace(/^@/, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105 active:scale-95 bg-[var(--color-bg-elevated)] border-[var(--color-border-default)] hover:border-black dark:hover:border-white"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.32a6.34 6.34 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 0 0 0 10.79 4.54V11.8a8.3 8.3 0 0 0 5.66 2.19V10.5a4.88 4.88 0 0 1-3.03-3.81z" />
                            </svg>
                            <span>@{socialLinks.tiktok.replace(/^@/, "")}</span>
                          </a>
                        )}
                        {socialLinks?.twitter && (
                          <a
                            href={`https://x.com/${socialLinks.twitter.replace(/^@/, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105 active:scale-95 bg-[var(--color-bg-elevated)] border-[var(--color-border-default)] hover:border-[#1DA1F2] hover:text-[#1DA1F2]"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            <Twitter className="w-3.5 h-3.5" />
                            <span>@{socialLinks.twitter.replace(/^@/, "")}</span>
                          </a>
                        )}
                        {socialLinks?.linkedin && (
                          <a
                            href={`https://linkedin.com/in/${socialLinks.linkedin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105 active:scale-95 bg-[var(--color-bg-elevated)] border-[var(--color-border-default)] hover:border-[#0A66C2] hover:text-[#0A66C2]"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            <Linkedin className="w-3.5 h-3.5" />
                            <span>LinkedIn</span>
                          </a>
                        )}
                        {socialLinks?.spotify && (
                          <a
                            href={socialLinks.spotify}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105 active:scale-95 bg-[var(--color-bg-elevated)] border-[var(--color-border-default)] hover:border-[#1DB954] hover:text-[#1DB954]"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            <Music className="w-3.5 h-3.5" />
                            <span>Spotify</span>
                          </a>
                        )}
                        <button
                          onClick={() => setIsEditingProfile(true)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border border-dashed border-[var(--color-hairline)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Social
                        </button>
                      </div>

                      {/* ── IN-PAGE PROFILE EDIT MODE ── */}
                      {isEditingProfile && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-6 rounded-[24px] border mb-8 space-y-6"
                          style={{
                            background: "var(--color-bg-elevated)",
                            borderColor: "var(--color-border-default)",
                          }}
                        >
                          <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--color-hairline)" }}>
                            <div>
                              <h3 className="font-display text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
                                Edit Profile Details
                              </h3>
                              <p className="text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>
                                Changes saved here automatically update your profile and sync with settings.
                              </p>
                            </div>
                          </div>

                          {/* Basic Info Fields */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 font-body text-zinc-900 dark:text-zinc-100">
                                Performer Name
                              </label>
                              <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Stage Name or Full Name"
                                className="h-11 rounded-xl text-sm font-body px-3.5 !bg-white dark:!bg-zinc-900 !border-zinc-300 dark:!border-zinc-700 !text-zinc-900 dark:!text-zinc-100 placeholder:!text-zinc-400 dark:placeholder:!text-zinc-500 shadow-2xs focus:!border-[var(--color-accent)]"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 font-body text-zinc-900 dark:text-zinc-100">
                                Stage Title / Primary Craft
                              </label>
                              <Input
                                value={stageTitle}
                                onChange={(e) => setStageTitle(e.target.value)}
                                placeholder="e.g. Actor & Voice Artist"
                                className="h-11 rounded-xl text-sm font-body px-3.5 !bg-white dark:!bg-zinc-900 !border-zinc-300 dark:!border-zinc-700 !text-zinc-900 dark:!text-zinc-100 placeholder:!text-zinc-400 dark:placeholder:!text-zinc-500 shadow-2xs focus:!border-[var(--color-accent)]"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 font-body text-zinc-900 dark:text-zinc-100">
                                Location
                              </label>
                              <Input
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="City, Nigeria"
                                className="h-11 rounded-xl text-sm font-body px-3.5 !bg-white dark:!bg-zinc-900 !border-zinc-300 dark:!border-zinc-700 !text-zinc-900 dark:!text-zinc-100 placeholder:!text-zinc-400 dark:placeholder:!text-zinc-500 shadow-2xs focus:!border-[var(--color-accent)]"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 font-body text-zinc-900 dark:text-zinc-100">
                                Availability Status
                              </label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setIsAvailable(true)}
                                  className={`flex-1 h-11 rounded-xl border text-xs font-bold font-body flex items-center justify-center gap-2 transition-all cursor-pointer ${isAvailable
                                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-400/30 shadow-2xs"
                                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                    }`}
                                >
                                  <span className="relative flex h-2 w-2">
                                    {isAvailable && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                  </span>
                                  Available
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsAvailable(false)}
                                  className={`flex-1 h-11 rounded-xl border text-xs font-bold font-body flex items-center justify-center gap-2 transition-all cursor-pointer ${!isAvailable
                                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-400 dark:border-amber-600 ring-1 ring-amber-400/30 shadow-2xs"
                                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                    }`}
                                >
                                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                  Booked
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Bio Field */}
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 font-body text-zinc-900 dark:text-zinc-100">
                              Performer Bio &amp; Summary
                            </label>
                            <textarea
                              rows={4}
                              value={bio}
                              onChange={(e) => setBio(e.target.value)}
                              placeholder="Describe your training, performance styles, notable credits, and vocal qualities..."
                              className="w-full px-4 py-3 rounded-xl text-sm font-body border resize-none outline-none focus:border-[var(--color-accent)] bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 shadow-2xs"
                            />
                          </div>

                          {/* Profile Tags Editor */}
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 font-body text-zinc-900 dark:text-zinc-100">
                              Profile Tags &amp; Specialties
                            </label>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                                >
                                  <span>{tag}</span>
                                  <button
                                    type="button"
                                    onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                                    className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-zinc-500 hover:text-[var(--color-accent)] cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-2 max-w-md">
                              <Input
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                placeholder="Add a new tag (e.g. Igbo Accent, Improvisation)"
                                className="h-11 rounded-xl text-sm font-body px-3.5 !bg-white dark:!bg-zinc-900 !border-zinc-300 dark:!border-zinc-700 !text-zinc-900 dark:!text-zinc-100 placeholder:!text-zinc-400 dark:placeholder:!text-zinc-500 shadow-2xs focus:!border-[var(--color-accent)]"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && newTag.trim()) {
                                    e.preventDefault();
                                    if (!tags.includes(newTag.trim())) {
                                      setTags([...tags, newTag.trim()]);
                                    }
                                    setNewTag("");
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                className="h-11 rounded-xl text-xs font-bold px-4 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-2xs"
                                onClick={() => {
                                  if (newTag.trim() && !tags.includes(newTag.trim())) {
                                    setTags([...tags, newTag.trim()]);
                                    setNewTag("");
                                  }
                                }}
                              >
                                Add
                              </Button>
                            </div>
                          </div>

                          {/* Social Media Links Inputs */}
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2 font-body text-zinc-900 dark:text-zinc-100">
                              Social Media &amp; Portfolios (Linktree style)
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 text-center text-xs font-bold text-[#E1306C]">IG</span>
                                <Input
                                  value={socialLinks.instagram || ""}
                                  onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                                  placeholder="Instagram handle (e.g. emeka_acts)"
                                  className="h-11 rounded-xl pl-11 text-sm font-body !bg-white dark:!bg-zinc-900 !border-zinc-300 dark:!border-zinc-700 !text-zinc-900 dark:!text-zinc-100 placeholder:!text-zinc-400 dark:placeholder:!text-zinc-500 shadow-2xs focus:!border-[var(--color-accent)]"
                                />
                              </div>
                              <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 text-center text-xs font-bold text-[#FF0000]">YT</span>
                                <Input
                                  value={socialLinks.youtube || ""}
                                  onChange={(e) => setSocialLinks({ ...socialLinks, youtube: e.target.value })}
                                  placeholder="YouTube channel handle"
                                  className="h-11 rounded-xl pl-11 text-sm font-body !bg-white dark:!bg-zinc-900 !border-zinc-300 dark:!border-zinc-700 !text-zinc-900 dark:!text-zinc-100 placeholder:!text-zinc-400 dark:placeholder:!text-zinc-500 shadow-2xs focus:!border-[var(--color-accent)]"
                                />
                              </div>
                              <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 text-center text-xs font-bold text-zinc-900 dark:text-zinc-100">TT</span>
                                <Input
                                  value={socialLinks.tiktok || ""}
                                  onChange={(e) => setSocialLinks({ ...socialLinks, tiktok: e.target.value })}
                                  placeholder="TikTok handle"
                                  className="h-11 rounded-xl pl-11 text-sm font-body !bg-white dark:!bg-zinc-900 !border-zinc-300 dark:!border-zinc-700 !text-zinc-900 dark:!text-zinc-100 placeholder:!text-zinc-400 dark:placeholder:!text-zinc-500 shadow-2xs focus:!border-[var(--color-accent)]"
                                />
                              </div>
                              <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 text-center text-xs font-bold text-[#1DA1F2]">X</span>
                                <Input
                                  value={socialLinks.twitter || ""}
                                  onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                                  placeholder="X (Twitter) handle"
                                  className="h-11 rounded-xl pl-11 text-sm font-body !bg-white dark:!bg-zinc-900 !border-zinc-300 dark:!border-zinc-700 !text-zinc-900 dark:!text-zinc-100 placeholder:!text-zinc-400 dark:placeholder:!text-zinc-500 shadow-2xs focus:!border-[var(--color-accent)]"
                                />
                              </div>
                              <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 text-center text-xs font-bold text-[#0A66C2]">IN</span>
                                <Input
                                  value={socialLinks.linkedin || ""}
                                  onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                                  placeholder="LinkedIn profile slug"
                                  className="h-11 rounded-xl pl-11 text-sm font-body !bg-white dark:!bg-zinc-900 !border-zinc-300 dark:!border-zinc-700 !text-zinc-900 dark:!text-zinc-100 placeholder:!text-zinc-400 dark:placeholder:!text-zinc-500 shadow-2xs focus:!border-[var(--color-accent)]"
                                />
                              </div>
                              <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 text-center text-xs font-bold text-[#1DB954]">SP</span>
                                <Input
                                  value={socialLinks.spotify || ""}
                                  onChange={(e) => setSocialLinks({ ...socialLinks, spotify: e.target.value })}
                                  placeholder="Spotify or audio artist URL"
                                  className="h-11 rounded-xl pl-11 text-sm font-body !bg-white dark:!bg-zinc-900 !border-zinc-300 dark:!border-zinc-700 !text-zinc-900 dark:!text-zinc-100 placeholder:!text-zinc-400 dark:placeholder:!text-zinc-500 shadow-2xs focus:!border-[var(--color-accent)]"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Banner Style Presets */}
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2 font-body text-zinc-900 dark:text-zinc-100">
                              Banner Theme Presets
                            </label>
                            <div className="flex flex-wrap gap-2.5">
                              {[
                                { id: "crimson-studio", name: "Crimson Studio", color: "from-[#E52E2E] to-[#450A0A]" },
                                { id: "noir-velvet", name: "Noir Velvet", color: "from-[#26262E] to-[#0D0D11]" },
                                { id: "amber-gold", name: "Amber Gold", color: "from-[#D97706] to-[#1F1305]" },
                                { id: "electric-violet", name: "Velvet Plum", color: "from-[#7C3AED] to-[#140727]" },
                              ].map((preset) => (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => {
                                    setCoverPreset(preset.id);
                                    setCoverUrl(null);
                                  }}
                                  className={`px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${coverPreset === preset.id && !coverUrl
                                      ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20 text-zinc-900 dark:text-zinc-100 font-bold bg-white dark:bg-zinc-900 shadow-xs"
                                      : "border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 shadow-2xs hover:border-zinc-400"
                                    }`}
                                >
                                  <span className={`w-3.5 h-3.5 rounded-full bg-gradient-to-r ${preset.color}`} />
                                  <span>{preset.name}</span>
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => coverFileInputRef.current?.click()}
                                className="px-3.5 py-2 rounded-full text-xs font-semibold border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-[var(--color-accent)] hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                              >
                                <Camera className="w-3.5 h-3.5" /> Upload Custom Banner
                              </button>
                            </div>
                          </div>

                          <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor: "var(--color-hairline)" }}>
                            <Button variant="secondary" onClick={() => setIsEditingProfile(false)} className="h-11 px-5 text-xs font-semibold">
                              Cancel
                            </Button>
                            <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-2 h-11 px-6 text-xs font-semibold">
                              <Check className="w-4 h-4" /> {savingProfile ? "Saving…" : "Save Changes"}
                            </Button>
                          </div>
                        </motion.div>
                      )}

                      {/* Tags & Bio (Shown in Profile View mode, omitted during active edit to prevent duplicate slop) */}
                      {!isEditingProfile && (
                        <>
                          {/* Tags List */}
                          <div className="flex flex-wrap gap-2 mb-6">
                            {tags.map((tag) => (
                              <Badge key={tag} tone="neutral" size="lg">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          {/* Bio Section */}
                          {bio && bio.trim() && !bio.toLowerCase().includes("no bio") ? (
                            <div className="mb-8">
                              <h3 className="text-sm font-semibold font-body mb-2" style={{ color: "var(--color-text-primary)" }}>
                                About the Performer
                              </h3>
                              <p className="text-sm font-body leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                                {bio}
                              </p>
                            </div>
                          ) : (
                            <div className="p-4 rounded-[var(--radius-lg)] mb-8 border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-[var(--color-text-primary)]">No Bio Added Yet</p>
                                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                                  Write a compelling summary of your craft, training, and vocal range to complete your profile.
                                </p>
                              </div>
                              <Button
                                variant="secondary"
                                className="h-8 text-xs shrink-0"
                                onClick={() => setIsEditingProfile(true)}
                              >
                                Add Bio
                              </Button>
                            </div>
                          )}
                        </>
                      )}

                      {/* Featured Performance Reel */}
                      <div className="mb-8">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>
                            Featured Performance Reel
                          </h3>
                          <button
                            onClick={() => setShowUploadReelModal(true)}
                            className="text-xs font-semibold hover:underline flex items-center gap-1"
                            style={{ color: "var(--color-accent)" }}
                          >
                            <Play className="w-3 h-3" /> Replace Reel
                          </button>
                        </div>

                        <div
                          className="relative h-48 sm:h-56 md:h-60 w-full rounded-[var(--radius-lg)] overflow-hidden group cursor-pointer border shadow-sm"
                          style={{
                            background: "var(--color-bg-elevated)",
                            borderColor: "var(--color-border-default)",
                          }}
                          onClick={() => setShowWatchReelModal(true)}
                        >
                          <img
                            src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80&fit=crop"
                            alt="Reel"
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div
                              className="w-14 h-14 rounded-full flex items-center justify-center pl-1 shadow-xl transition-transform group-hover:scale-110"
                              style={{ background: "var(--color-accent)" }}
                            >
                              <Play className="w-6 h-6 text-white" />
                            </div>
                          </div>
                          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-black/60 text-white backdrop-blur-md">
                            {performanceReelTitle || "Featured Audition Reel"}
                          </div>
                          <div className="absolute bottom-3 right-3 px-2 py-1 rounded font-mono text-xs text-white bg-black/60 backdrop-blur-md">
                            01:30
                          </div>
                        </div>
                      </div>

                      {/* Rate Cards */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>
                            Rate Cards
                          </h3>
                          <button
                            onClick={() => navigate("/talent")}
                            className="text-xs font-semibold hover:underline flex items-center gap-1"
                            style={{ color: "var(--color-accent)" }}
                          >
                            Manage on Dashboard <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {effectiveServices.map((service) => (
                            <div
                              key={service.id}
                              className="p-4 rounded-[var(--radius-lg)] border flex flex-col justify-between transition-all hover:shadow-md"
                              style={{
                                background: "var(--color-bg-elevated)",
                                borderColor: "var(--color-border-default)",
                                borderLeft: "3px solid var(--color-accent)",
                              }}
                            >
                              <div>
                                <div className="flex justify-between items-start mb-1.5">
                                  <span className="text-sm font-bold font-body" style={{ color: "var(--color-text-primary)" }}>
                                    {service.title}
                                  </span>
                                </div>
                                <div className="text-xs font-body mb-3" style={{ color: "var(--color-text-secondary)" }}>
                                  Delivery: {service.delivery}
                                </div>
                              </div>
                              <div className="pt-3 border-t flex items-baseline justify-between" style={{ borderColor: "var(--color-hairline)" }}>
                                <span className="text-[11px] uppercase tracking-wider font-semibold font-body" style={{ color: "var(--color-text-tertiary)" }}>
                                  Base Rate
                                </span>
                                <span className="font-display text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
                                  {service.price}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Personal & Craft Details (Talent Only) ── */}
          {section === "craft_details" && !isClient && (
            <motion.div
              key="craft_details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Introduction Card */}
              <div
                className="p-4 rounded-[var(--radius-xl)] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border"
                style={{ ...s.surface, boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)" }}
                  >
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold font-display" style={s.text}>
                      Personal Details
                    </div>
                    <p className="text-xs font-body mt-0.5 leading-relaxed" style={s.secondary}>
                      Your basic details, craft category, and voice &amp; performance style tags.
                    </p>
                  </div>
                </div>
                {!isEditingCraftDetails ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-9 sm:h-8 px-3.5 sm:px-3 text-xs gap-1.5 shrink-0 font-semibold w-full sm:w-auto justify-center"
                    onClick={() => setIsEditingCraftDetails(true)}
                  >
                    <Edit2 className="w-3 h-3" /> Edit Details
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    className="h-9 sm:h-8 px-3.5 sm:px-3 text-xs gap-1.5 shrink-0 font-semibold w-full sm:w-auto justify-center"
                    onClick={handleSaveCraftDetails}
                  >
                    <Check className="w-3.5 h-3.5" /> Save Changes
                  </Button>
                )}
              </div>

              {!isEditingCraftDetails ? (
                /* ── Read-Only State (Simple, Clean, FAANG UX) ── */
                <div className="space-y-5">
                  {/* Card 1: Basic Information */}
                  <div
                    className="rounded-[var(--radius-xl)] p-5 border space-y-4"
                    style={{ ...s.surface, boxShadow: "var(--shadow-card)" }}
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-[var(--color-hairline)]">
                      <span className="text-[11px] font-bold tracking-normal font-body text-[var(--color-text-tertiary)]">
                        Basic information
                      </span>
                      <span className="text-[11px] font-semibold text-[var(--color-success)] flex items-center gap-1 font-body">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified Identity
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                      <div>
                        <div className="text-[11px] font-medium tracking-normal text-[var(--color-text-tertiary)] mb-1 font-body">
                          Gender
                        </div>
                        <div className="text-sm font-semibold font-body" style={s.text}>
                          {gender}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-medium tracking-normal text-[var(--color-text-tertiary)] mb-1 font-body">
                          Date of birth
                        </div>
                        <div className="text-sm font-semibold font-mono tnum flex items-center gap-1.5" style={s.text}>
                          <CalendarIcon className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
                          <span>{dob}</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-medium tracking-normal text-[var(--color-text-tertiary)] mb-1 font-body">
                          Location
                        </div>
                        <div className="text-sm font-semibold font-body flex items-center gap-1.5" style={s.text}>
                          <MapPin className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                          <span>{craftLocation ? `${craftLocation}, Nigeria` : "Lagos, Nigeria"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Primary Craft */}
                  <div
                    className="rounded-[var(--radius-xl)] p-5 border space-y-3"
                    style={{ ...s.surface, boxShadow: "var(--shadow-card)" }}
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-[var(--color-hairline)]">
                      <span className="text-[11px] font-bold tracking-normal font-body text-[var(--color-text-tertiary)]">
                        Primary craft
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-body">
                        Core Discipline
                      </span>
                    </div>

                    {(() => {
                      const craftItem = CRAFT_CATEGORIES.find((c) => c.id === selectedCraft) || CRAFT_CATEGORIES[0];
                      const CraftIcon = craftItem.icon;
                      return (
                        <div className="flex items-center gap-3.5 pt-1">
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border"
                            style={{
                              background: "var(--color-accent-soft)",
                              borderColor: "var(--color-hairline)",
                              color: "var(--color-accent)",
                            }}
                          >
                            <CraftIcon className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="text-base font-bold font-display" style={s.text}>
                              {craftItem.label}
                            </div>
                            <div className="text-xs font-body" style={s.secondary}>
                              {craftItem.desc}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Card 3: Performance Persona & Style Tags */}
                  <div
                    className="rounded-[var(--radius-xl)] p-5 border space-y-4"
                    style={{ ...s.surface, boxShadow: "var(--shadow-card)" }}
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-[var(--color-hairline)]">
                      <span className="text-[11px] font-bold tracking-normal font-body text-[var(--color-text-tertiary)]">
                        Thespian AI performance summary
                      </span>
                      <span className="text-[11px] font-semibold text-[var(--color-text-tertiary)] flex items-center gap-1 font-body">
                        <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" /> AI Extracted
                      </span>
                    </div>

                    <div
                      className="p-4 rounded-xl text-xs font-body leading-relaxed border italic"
                      style={{
                        background: "var(--color-bg-elevated)",
                        borderColor: "var(--color-hairline)",
                        color: "var(--color-text-primary)",
                      }}
                    >
                      &ldquo;{performanceSummary}&rdquo;
                    </div>

                    <div>
                      <div className="text-[11px] font-bold tracking-normal font-body text-[var(--color-text-tertiary)] mb-2.5">
                        Style &amp; profile tags ({craftTags.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {craftTags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 rounded-full text-xs font-semibold font-body border"
                            style={{
                              background: "var(--color-accent-soft)",
                              borderColor: "var(--color-accent)",
                              color: "var(--color-accent)",
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Edit Action */}
                  <Button
                    variant="secondary"
                    className="w-full h-11 text-xs font-semibold gap-2 border"
                    onClick={() => setIsEditingCraftDetails(true)}
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Personal Details
                  </Button>
                </div>
              ) : (
                /* ── Edit State (Matching Screenshots 1, 2, 3) ── */
                <div className="space-y-6">
                  {/* 1. Basic Details (Gender, DOB, Location) */}
                  <div
                    className="rounded-[var(--radius-xl)] p-5 border space-y-4"
                    style={{ ...s.surface, boxShadow: "var(--shadow-card)" }}
                  >
                    <div>
                      <h3 className="font-display text-lg font-bold" style={s.text}>
                        Tell us about yourself
                      </h3>
                      <p className="text-xs font-body mt-0.5" style={s.secondary}>
                        Enter your basic details to personalize your profile.
                      </p>
                    </div>

                    {/* Gender Segmented Pill Buttons */}
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider font-mono text-[var(--color-text-tertiary)] block mb-2">
                        Gender
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {["Female", "Male"].map((opt) => {
                          const isSel = gender.toLowerCase() === opt.toLowerCase();
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setGender(opt)}
                              className={`h-12 rounded-[16px] text-sm font-semibold transition-all border ${isSel
                                  ? "border-[#F13030] bg-[#F13030]/10 text-[#F13030] shadow-sm"
                                  : "border-[var(--color-hairline)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                                }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider font-mono text-[var(--color-text-tertiary)] block mb-2">
                        Date of Birth
                      </label>
                      <div className="relative">
                        <CalendarIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-accent)] pointer-events-none" />
                        <Input
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="pl-10 h-12 text-sm font-mono"
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider font-mono text-[var(--color-text-tertiary)] block mb-2">
                        Location
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-accent)] pointer-events-none" />
                        <select
                          value={craftLocation}
                          onChange={(e) => setCraftLocation(e.target.value)}
                          className="w-full h-12 pl-10 pr-4 rounded-[var(--radius-lg)] border text-sm font-body outline-none appearance-none cursor-pointer"
                          style={{ ...s.elevated, color: "var(--color-text-primary)" }}
                        >
                          {CRAFT_NIGERIAN_CITIES.map((city) => (
                            <option key={city} value={city}>
                              {city}, Nigeria
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 2. Craft Selection (What best describes your craft?) */}
                  <div
                    className="rounded-[var(--radius-xl)] p-5 border space-y-4"
                    style={{ ...s.surface, boxShadow: "var(--shadow-card)" }}
                  >
                    <div>
                      <h3 className="font-display text-lg font-bold" style={s.text}>
                        What best describes your craft?
                      </h3>
                      <p className="text-xs font-body mt-0.5" style={s.secondary}>
                        Select your primary craft to personalize your profile and casting filters.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                      {CRAFT_CATEGORIES.map((craft) => {
                        const isSel = selectedCraft.toLowerCase() === craft.id.toLowerCase();
                        const CraftIcon = craft.icon;
                        return (
                          <button
                            key={craft.id}
                            type="button"
                            onClick={() => {
                              setSelectedCraft(craft.id);
                              if (CRAFT_DEFAULT_SUMMARIES[craft.id]) {
                                setPerformanceSummary(CRAFT_DEFAULT_SUMMARIES[craft.id]);
                              }
                            }}
                            className={`p-3 sm:p-4 rounded-[18px] sm:rounded-[20px] text-center flex flex-col items-center justify-center gap-2 sm:gap-2.5 transition-all relative border min-h-[96px] sm:min-h-[110px] ${isSel
                                ? "border-[#F13030] bg-[#F13030]/10 text-[#F13030] shadow-sm shadow-[#F13030]/10"
                                : "border-[var(--color-hairline)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-zinc-300"
                              }`}
                          >
                            {isSel && (
                              <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#F13030] text-white flex items-center justify-center">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                            <CraftIcon className={`w-6 h-6 sm:w-7 sm:h-7 ${isSel ? "text-[#F13030]" : "opacity-75"}`} />
                            <span className="text-xs font-bold font-body">{craft.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Performance Summary & Style Tags */}
                  <div
                    className="rounded-[var(--radius-xl)] p-5 border space-y-4"
                    style={{ ...s.surface, boxShadow: "var(--shadow-card)" }}
                  >
                    <div>
                      <h3 className="font-display text-lg font-bold" style={s.text}>
                        Your style tags are ready.
                      </h3>
                      <p className="text-xs font-body mt-0.5" style={s.secondary}>
                        Based on your upload, Thespian AI has extracted your performance summary and style tags.
                      </p>
                    </div>

                    {/* Performance Summary Textarea */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider font-mono text-[var(--color-text-tertiary)]">
                          Performance Summary
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const summary = CRAFT_DEFAULT_SUMMARIES[selectedCraft] || CRAFT_DEFAULT_SUMMARIES.actors;
                            setPerformanceSummary(summary);
                          }}
                          className="text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] flex items-center gap-1 font-body transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" /> Reset
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={performanceSummary}
                        onChange={(e) => setPerformanceSummary(e.target.value)}
                        className="w-full text-xs font-body leading-relaxed p-3 rounded-[var(--radius-md)] border outline-none resize-none"
                        style={{ ...s.elevated, color: "var(--color-text-primary)", borderColor: "var(--color-hairline)" }}
                        placeholder="Edit your performance summary..."
                      />
                    </div>

                    {/* Active Style Tags */}
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider font-mono text-[var(--color-text-tertiary)] block mb-2">
                        Profile Tags ({craftTags.length}/7)
                      </label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {craftTags.map((tag, idx) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold font-body border"
                            style={{
                              background: "var(--color-accent-soft)",
                              borderColor: "var(--color-accent)",
                              color: "var(--color-accent)",
                            }}
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => setCraftTags(craftTags.filter((_, i) => i !== idx))}
                              className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
                              aria-label={`Remove tag ${tag}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>

                      {/* Suggested Tags */}
                      <div className="text-[11px] font-bold uppercase tracking-wider font-mono text-[var(--color-text-tertiary)] mb-2">
                        Suggested
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {CRAFT_SUGGESTED_TAGS.filter((t) => !craftTags.includes(t)).map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => {
                              if (craftTags.length < 7) {
                                setCraftTags([...craftTags, suggestion]);
                              }
                            }}
                            className="px-2.5 py-1 rounded-full text-xs font-body border hover:border-[var(--color-accent)] transition-all flex items-center gap-1"
                            style={{
                              background: "var(--color-bg-elevated)",
                              borderColor: "var(--color-hairline)",
                              color: "var(--color-text-secondary)",
                            }}
                          >
                            <Plus className="w-3 h-3 text-[var(--color-text-tertiary)]" /> {suggestion}
                          </button>
                        ))}
                      </div>

                      {/* Custom Tag Input */}
                      <div className="flex items-center gap-2">
                        <Input
                          value={newCraftTagInput}
                          onChange={(e) => setNewCraftTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const val = newCraftTagInput.trim();
                              if (val && craftTags.length < 7 && !craftTags.includes(val)) {
                                setCraftTags([...craftTags, val]);
                                setNewCraftTagInput("");
                              }
                            }
                          }}
                          placeholder="Add a custom tag..."
                          className="h-10 text-xs flex-1"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-10 px-3 text-xs gap-1 shrink-0 font-semibold"
                          onClick={() => {
                            const val = newCraftTagInput.trim();
                            if (val && craftTags.length < 7 && !craftTags.includes(val)) {
                              setCraftTags([...craftTags, val]);
                              setNewCraftTagInput("");
                            }
                          }}
                          disabled={!newCraftTagInput.trim() || craftTags.length >= 7}
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      variant="secondary"
                      className="flex-1 h-12 text-sm font-semibold"
                      onClick={() => setIsEditingCraftDetails(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      className="flex-1 h-12 text-sm font-semibold gap-1.5"
                      onClick={handleSaveCraftDetails}
                    >
                      <Check className="w-4 h-4" /> Save Changes
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Physical Attributes (features.md Phase 12A.3, Talent Only) ── */}
          {section === "attributes" && !isClient && (
            <motion.div key="attributes" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Informational Guidance Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-[var(--shadow-card)] space-y-1.5">
                <h3 className="font-display text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Casting &amp; Physical Specifications
                </h3>
                <p className="text-xs font-body leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Help casting directors match you to roles that fit your look. All fields are 100% optional, and you control your visibility: keep any detail <strong>Private</strong> (hidden), <strong>Searchable</strong> (matched anonymously in casting filters), or <strong>Public</strong> (featured on your storefront).
                </p>
              </div>

              {/* Group 1: Demographics & Build */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-[var(--shadow-card)] space-y-4">
                <div className="border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <h4 className="font-display text-sm font-semibold text-zinc-900 dark:text-zinc-100">Demographics &amp; Build</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Physical measurements and demographic attributes for role casting.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ATTRIBUTE_FIELDS.filter(f => ["heightRange", "weightRange", "ageRange", "build", "genderPresentation"].includes(f.key as string)).map((field) => {
                    const currentVal = attrValues[field.key as string] ?? "";
                    const currentVis = attrVisibility[field.key as string] ?? "SEARCHABLE";
                    return (
                      <div key={field.key as string} className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-bold uppercase tracking-wider font-body text-zinc-700 dark:text-zinc-300">
                            {field.label}
                          </label>
                          {/* Segmented Visibility Control */}
                          <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 bg-white dark:bg-zinc-900">
                            {VISIBILITY_LEVELS.map((level) => {
                              const active = currentVis === level;
                              const labels: Record<AttributeVisibility, string> = {
                                PRIVATE: "🔒 Priv",
                                SEARCHABLE: "🔍 Filter",
                                PUBLIC: "🌐 Public",
                              };
                              return (
                                <button
                                  key={level}
                                  type="button"
                                  aria-label={`${field.label} visibility: ${level}`}
                                  aria-pressed={active}
                                  disabled={!currentVal}
                                  onClick={() => setAttrVisibility((prev) => ({ ...prev, [field.key as string]: level }))}
                                  className={`px-2 py-0.5 text-[10px] font-semibold font-body rounded transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${active
                                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                                    }`}
                                >
                                  {labels[level]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <select
                          aria-label={field.label}
                          value={currentVal}
                          onChange={(e) => setAttrValues((prev) => ({ ...prev, [field.key as string]: e.target.value }))}
                          className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 font-body text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900/10 transition-colors"
                        >
                          <option value="">Not set</option>
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>{opt.replace(/_/g, " ")}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Group 2: Appearance & Complexion */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-[var(--shadow-card)] space-y-4">
                <div className="border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <h4 className="font-display text-sm font-semibold text-zinc-900 dark:text-zinc-100">Appearance &amp; Features</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Complexion, hair, and eye colors for visual character matching.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ATTRIBUTE_FIELDS.filter(f => ["complexion", "hairColor", "eyeColor"].includes(f.key as string)).map((field) => {
                    const currentVal = attrValues[field.key as string] ?? "";
                    const currentVis = attrVisibility[field.key as string] ?? "SEARCHABLE";
                    return (
                      <div key={field.key as string} className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-bold uppercase tracking-wider font-body text-zinc-700 dark:text-zinc-300">
                            {field.label}
                          </label>
                          {/* Segmented Visibility Control */}
                          <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 bg-white dark:bg-zinc-900">
                            {VISIBILITY_LEVELS.map((level) => {
                              const active = currentVis === level;
                              const labels: Record<AttributeVisibility, string> = {
                                PRIVATE: "🔒 Priv",
                                SEARCHABLE: "🔍 Filter",
                                PUBLIC: "🌐 Public",
                              };
                              return (
                                <button
                                  key={level}
                                  type="button"
                                  aria-label={`${field.label} visibility: ${level}`}
                                  aria-pressed={active}
                                  disabled={!currentVal}
                                  onClick={() => setAttrVisibility((prev) => ({ ...prev, [field.key as string]: level }))}
                                  className={`px-2 py-0.5 text-[10px] font-semibold font-body rounded transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${active
                                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                                    }`}
                                >
                                  {labels[level]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <select
                          aria-label={field.label}
                          value={currentVal}
                          onChange={(e) => setAttrValues((prev) => ({ ...prev, [field.key as string]: e.target.value }))}
                          className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 font-body text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900/10 transition-colors"
                        >
                          <option value="">Not set</option>
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>{opt.replace(/_/g, " ")}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Group 3: Casting Notes & Distinctive Features */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-[var(--shadow-card)] space-y-4">
                <div>
                  <h4 className="font-display text-sm font-semibold text-zinc-900 dark:text-zinc-100">Distinctive Features</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Tattoos, piercings, scars, or notable physical traits (up to 120 characters).</p>
                </div>
                <FormField label="Distinctive features (up to 120 characters)">
                  <textarea
                    maxLength={120}
                    rows={2}
                    value={distinctiveFeatures}
                    onChange={(e) => setDistinctiveFeatures(e.target.value)}
                    placeholder="e.g. Small scar near left eyebrow, athletic posture, fluent voice delivery"
                    className="w-full px-4 py-3 rounded-xl text-sm font-body border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900/10 resize-none transition-all"
                  />
                </FormField>
              </div>

              {/* Consent Card */}
              <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-700 bg-[var(--color-bg-surface)] shadow-2xs">
                <label className="flex items-start gap-3 text-xs font-body leading-relaxed text-zinc-600 dark:text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-300 dark:border-zinc-600 text-[var(--color-red)] focus:ring-[var(--color-red)] cursor-pointer"
                  />
                  <span>
                    I consent to storing this information under the visibility settings I've chosen above, and understand it's used for casting search filters only — never automated shortlisting or scoring.
                  </span>
                </label>
              </div>

              {/* Action Buttons with Crisp Disabled State */}
              <button
                type="button"
                className={`w-full h-12 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 shadow-xs ${savingAttributes || !consentChecked
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 cursor-not-allowed"
                    : "bg-[var(--color-red)] hover:opacity-95 text-white active:scale-[0.98] cursor-pointer"
                  }`}
                onClick={handleSaveAttributes}
                disabled={savingAttributes || !consentChecked}
              >
                {savingAttributes ? "Saving…" : "Save Attributes"}
              </button>

              {attributes && (
                <button
                  type="button"
                  onClick={handleDeleteAttributes}
                  className="w-full h-11 text-sm font-body font-medium flex items-center justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Delete all attribute data
                </button>
              )}
            </motion.div>
          )}

          {/* ── Payment / Billing Methods ── */}
          {section === "payment" && (
            <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Payout Bank Account (Performer Only) */}
              {!isClient && (
                <div className="p-5 rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] shadow-[var(--shadow-card)] space-y-4">
                  <div>
                    <h3 className="font-display text-base font-semibold" style={s.text}>Payout Bank Account</h3>
                    <p className="text-xs font-body mt-0.5" style={s.tertiary}>Direct earnings withdrawal destination for your completed orders.</p>
                  </div>

                  {/* Operational Rule Notice */}
                  <div
                    className="p-3.5 rounded-[var(--radius-lg)] flex items-start gap-2.5 text-xs font-body leading-relaxed"
                    style={{
                      background: "var(--color-bg-elevated)",
                      border: "1px solid var(--color-border-subtle)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--color-accent)" }} />
                    <div>
                      <span className="font-semibold block mb-0.5" style={{ color: "var(--color-text-primary)" }}>
                        One Payout Bank Account
                      </span>
                      You can only have one payout bank. This is how Monologg operates — all earnings withdrawals from your completed orders and milestones are routed directly to this single verified account. You can change your bank account after 48hrs to protect your funds.
                    </div>
                  </div>

                  {/* Payout Change Request Status Card */}
                  {payoutChangeRequest && payoutChangeRequest.status === "under_review" && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-100 space-y-2 text-xs font-body">
                      <div className="flex items-center gap-2 font-bold">
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Payout Account Change Under Review</span>
                      </div>
                      <p>
                        Under review. We&apos;ll notify you when it&apos;s approved. While a change is under review, withdrawals keep using the existing verified account ({bankDetails.bankName} •••• {bankDetails.accountNumber.slice(-4)}).
                      </p>
                    </div>
                  )}

                  {payoutChangeRequest && payoutChangeRequest.status === "rejected" && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-100 space-y-2 text-xs font-body">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Payout Account Change Rejected</span>
                        <Badge tone="error" size="sm">Rejected</Badge>
                      </div>
                      <p>Reason: {payoutChangeRequest.rejectionReason || "Account name verification could not be completed."}</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          appStateSync.updatePayoutAccountChangeRequestStatus("under_review");
                          setPayoutChangeRequest(appStateSync.getPayoutAccountChangeRequest());
                          setEditingBank(true);
                        }}
                      >
                        Try again
                      </Button>
                    </div>
                  )}

                  {payoutChangeRequest && payoutChangeRequest.status === "approved" && (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-100 space-y-1.5 text-xs font-body">
                      <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Payout Account Change Approved</span>
                      </div>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                        Your new payout destination is now active for all completed order withdrawals.
                      </p>
                    </div>
                  )}

                  {/* Clean Input Form (Read-only by default, editable when Change Bank Account is clicked) */}
                  <div className="space-y-4 pt-1">
                    {/* Bank Name */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider font-body" style={{ color: "var(--color-text-secondary)" }}>
                        Bank Name
                      </label>
                      {editingBank ? (
                        <>
                          <Input
                            type="text"
                            placeholder="Search bank or fintech (e.g. OPay, Wema, Zenith, GTBank)..."
                            value={bankSearchQuery}
                            onChange={(e) => setBankSearchQuery(e.target.value)}
                            className="h-9 text-xs font-body mb-1"
                          />
                          <select
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            className="w-full h-11 rounded-xl border px-3.5 font-body text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
                            style={{
                              background: "var(--color-bg-elevated)",
                              borderColor: "var(--color-border-default)",
                              color: "var(--color-text-primary)",
                            }}
                          >
                            {!NIGERIAN_BANKS.some((b) => b.name === bankName) && (
                              <option value={bankName}>{bankName}</option>
                            )}
                            {NIGERIAN_BANKS.filter((b) =>
                              b.name.toLowerCase().includes(bankSearchQuery.toLowerCase())
                            ).map((b) => (
                              <option key={b.code} value={b.name}>
                                {b.name} {b.isFintech ? "(Fintech)" : ""}
                              </option>
                            ))}
                          </select>
                          <p className="text-[11px] font-body" style={{ color: "var(--color-text-tertiary)" }}>
                            Withdrawals go to this account.
                          </p>
                        </>
                      ) : (
                        <Input
                          value={bankDetails.bankName || "GTBank (Guaranty Trust Bank)"}
                          readOnly
                          className="h-11 rounded-xl text-sm font-body px-3.5 bg-[var(--color-bg-elevated)] cursor-default font-medium"
                        />
                      )}
                    </div>

                    {/* Account Number */}
                    <FormField label="Account Number (10 digits)">
                      {editingBank ? (
                        <Input
                          value={accountNumber}
                          maxLength={10}
                          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          className="h-11 rounded-xl text-sm font-mono tnum px-3.5"
                          placeholder="0123456789"
                        />
                      ) : (
                        <Input
                          value={bankDetails.accountNumber || "0123456789"}
                          readOnly
                          className="h-11 rounded-xl text-sm font-mono tnum px-3.5 bg-[var(--color-bg-elevated)] cursor-default font-medium"
                        />
                      )}
                    </FormField>

                    {/* Account Name */}
                    <FormField label="Account Name">
                      <Input
                        value={editingBank ? accountName : (bankDetails.accountName || "EMEKA JOHNSON")}
                        readOnly
                        className="h-11 rounded-xl text-sm font-body px-3.5 bg-[var(--color-bg-elevated)] opacity-95 cursor-default font-medium"
                        placeholder="EMEKA JOHNSON"
                      />
                    </FormField>

                    {/* Paystack Account Lookup Status (when editing) */}
                    {editingBank && bankLookupStatus === "looking_up" && (
                      <div className="p-3.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-hairline)] flex items-center gap-2.5 animate-pulse text-xs text-[var(--color-text-secondary)]">
                        <div className="w-4 h-4 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin shrink-0" />
                        <span className="font-body">Looking up account name via Paystack…</span>
                      </div>
                    )}

                    {editingBank && bankLookupStatus === "name_matches" && (
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-body space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{accountName}</span>
                          <span className="badge-verified inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-600 text-white shrink-0">
                            <Check className="w-3 h-3" /> Name matches your KYC details
                          </span>
                        </div>
                      </div>
                    )}

                    {editingBank && bankLookupStatus === "name_mismatch" && (
                      <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs font-body space-y-1">
                        <div className="font-semibold">{accountName}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-red-600 dark:text-red-400">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>This account name doesn&apos;t match your KYC name. Use an account in your own name.</span>
                        </div>
                      </div>
                    )}

                    {editingBank && bankLookupStatus === "lookup_failed" && (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-body flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>Account lookup failed. Please check the account number or bank.</span>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs h-8 px-3 shrink-0"
                          onClick={() => {
                            setBankLookupStatus("looking_up");
                            setTimeout(() => {
                              const kycName = name || appStateSync.getTalentProfile().name || "Emeka Johnson";
                              setAccountName(kycName.toUpperCase());
                              setBankLookupStatus("name_matches");
                            }, 500);
                          }}
                        >
                          Retry
                        </Button>
                      </div>
                    )}

                    {/* Phone Number (Optional) */}
                    <div>
                      <label className="block text-xs font-semibold mb-1 uppercase tracking-wider font-body" style={{ color: "var(--color-text-secondary)" }}>
                        Phone number
                      </label>
                      {editingBank ? (
                        <>
                          <Input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="h-11 rounded-xl text-sm font-body px-3.5"
                            placeholder="+234 800 000 0000"
                          />
                          <p className="text-[11px] font-body mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                            Optional. If you miss a confirmation, only a Monologg team member will call you.
                          </p>
                        </>
                      ) : (
                        <Input
                          value={bankDetails.phoneNumber || "Not provided"}
                          readOnly
                          className="h-11 rounded-xl text-sm font-body px-3.5 bg-[var(--color-bg-elevated)] cursor-default text-[var(--color-text-secondary)]"
                        />
                      )}
                    </div>

                    {/* Action Buttons */}
                    {editingBank ? (
                      <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                        <Button
                          variant="secondary"
                          className="w-full sm:flex-1 h-11 text-xs font-semibold rounded-xl"
                          onClick={() => {
                            setEditingBank(false);
                            setBankName(bankDetails.bankName);
                            setAccountNumber(bankDetails.accountNumber);
                            setAccountName(bankDetails.accountName);
                            setPhoneNumber(bankDetails.phoneNumber || "");
                            setBankLookupStatus(bankDetails.accountNumber?.length === 10 ? "name_matches" : "idle");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="w-full sm:flex-1 h-11 text-xs font-semibold rounded-xl"
                          disabled={accountNumber.length !== 10 || bankLookupStatus !== "name_matches"}
                          onClick={() => {
                            appStateSync.updateBankDetails({ bankName, accountNumber, accountName, phoneNumber });
                            setBankDetails({ bankName, accountNumber, accountName, phoneNumber });
                            setEditingBank(false);
                            setSaved(true);
                            setTimeout(() => setSaved(false), 2000);
                          }}
                        >
                          {saved ? "Bank Details Saved! ✓" : "Save Payout Bank Account"}
                        </Button>
                      </div>
                    ) : (
                      <div className="pt-2">
                        <Button
                          variant="secondary"
                          className="w-full sm:w-auto h-11 px-5 text-xs font-semibold gap-2 rounded-xl border justify-center"
                          onClick={() => {
                            setEditingBank(true);
                            setBankName(bankDetails.bankName || "GTBank (Guaranty Trust Bank)");
                            setAccountNumber(bankDetails.accountNumber || "0123456789");
                            setAccountName(bankDetails.accountName || "EMEKA JOHNSON");
                            setPhoneNumber(bankDetails.phoneNumber || "");
                            setBankLookupStatus(bankDetails.accountNumber?.length === 10 ? "name_matches" : "idle");
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Change Bank Account
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Saved Cards / Billing Methods (Clients Only) */}
              {isClient && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wider font-body" style={s.tertiary}>
                          Saved Billing Cards
                        </div>
                        <div className="text-xs font-body mt-0.5" style={s.secondary}>
                          Cards used for instant project escrow funding and talent bookings
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        className="h-8 px-3 text-xs flex items-center gap-1.5"
                        onClick={() => {
                          setAddCardError(null);
                          setShowAddCardModal(true);
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Card</span>
                      </Button>
                    </div>

                    {addCardSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl flex items-center gap-2.5 text-xs font-body bg-emerald-500/10 border border-emerald-500/20 text-emerald-500"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Billing card saved successfully and ready for project debits.</span>
                      </motion.div>
                    )}

                    {paymentCards.length === 0 ? (
                      <div className="p-8 rounded-2xl border text-center space-y-2" style={s.surface}>
                        <CreditCard className="w-8 h-8 mx-auto" style={s.tertiary} />
                        <div className="text-sm font-semibold font-body" style={s.text}>No Saved Cards</div>
                        <p className="text-xs font-body max-w-xs mx-auto" style={s.secondary}>
                          Add a corporate debit card or credit card to fund escrow and pay for project briefs seamlessly.
                        </p>
                      </div>
                    ) : (
                      paymentCards.map((card) => (
                        <div key={card.id} className="p-4 rounded-xl flex items-center gap-3.5" style={s.surface}>
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border"
                            style={{
                              background: card.type === "Mastercard" ? "rgba(239, 68, 68, 0.08)" : "rgba(124, 58, 237, 0.08)",
                              borderColor: card.type === "Mastercard" ? "rgba(239, 68, 68, 0.2)" : "rgba(124, 58, 237, 0.2)",
                            }}
                          >
                            <CreditCard
                              className="w-5 h-5"
                              style={{ color: card.type === "Mastercard" ? "#EF4444" : "var(--color-accent)" }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold font-body truncate" style={s.text}>
                                {card.type} ···· {card.last4}
                              </span>
                              {card.isDefault && (
                                <Badge tone="success" size="sm">Default</Badge>
                              )}
                            </div>
                            <div className="text-xs font-body flex items-center gap-2 mt-0.5" style={s.tertiary}>
                              <span>Expires {card.expiry}</span>
                              {card.cardholderName && (
                                <>
                                  <span>·</span>
                                  <span className="truncate">{card.cardholderName}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {!card.isDefault && (
                            <button
                              type="button"
                              onClick={() => {
                                appStateSync.setDefaultBillingCard(card.id);
                                setPaymentCards(appStateSync.getBillingCards());
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-md)] border hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all font-body whitespace-nowrap"
                              style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-secondary)" }}
                            >
                              Set Default
                            </button>
                          )}

                          <button
                            type="button"
                            aria-label={`Remove ${card.type} ending ${card.last4}`}
                            onClick={() => setDeleteCardModal({ id: card.id, type: card.type, last4: card.last4 })}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Corporate Billing Card Dashed Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setAddCardError(null);
                      setShowAddCardModal(true);
                    }}
                    className="w-full p-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-semibold font-body hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] active:scale-[0.99]"
                    style={{ borderColor: "var(--color-hairline)", color: "var(--color-text-secondary)" }}
                  >
                    <Plus className="w-4 h-4" /> Add Corporate Billing Card
                  </button>

                  {/* Delete Payment Method Confirmation Modal */}
                  {deleteCardModal && (
                    <Modal onClose={() => setDeleteCardModal(null)}>
                      <div className="w-full max-w-sm rounded-[var(--radius-xl)] p-6" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-display text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>Delete Payment Method</h3>
                          <button onClick={() => setDeleteCardModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--color-bg-elevated)" }}>
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm font-body mb-6" style={{ color: "var(--color-text-secondary)" }}>
                          Are you sure you want to remove <strong>{deleteCardModal.type} ending in {deleteCardModal.last4}</strong>? You will need to re-add this card for future project debits.
                        </p>
                        <div className="flex gap-3">
                          <Button variant="secondary" className="flex-1 h-10 text-xs" onClick={() => setDeleteCardModal(null)}>Cancel</Button>
                          <Button
                            className="flex-1 h-10 text-xs"
                            style={{ background: "var(--color-error)", color: "#fff" }}
                            onClick={() => {
                              appStateSync.deleteBillingCard(deleteCardModal.id);
                              setPaymentCards(appStateSync.getBillingCards());
                              setDeleteCardModal(null);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Modal>
                  )}

                  {/* ── Working Add Card Modal (FAANG Card Entry & Live Preview) ── */}
                  {showAddCardModal && (
                    <Modal onClose={() => setShowAddCardModal(false)}>
                      <div
                        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[24px] p-5 sm:p-6 space-y-5"
                        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--color-hairline)" }}>
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
                              <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-display text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>Add Billing Card</h3>
                              <p className="text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>
                                Corporate card for project escrow &amp; bookings
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowAddCardModal(false)}
                            className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
                            style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-secondary)" }}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Interactive Live Card Preview */}
                        <div
                          className="relative p-4 sm:p-5 rounded-2xl text-white shadow-xl overflow-hidden border border-white/10"
                          style={{
                            background: "linear-gradient(135deg, #181820 0%, #2A183C 60%, #15151D 100%)",
                          }}
                        >
                          <div className="flex items-center justify-between mb-6">
                            {/* Gold EMV Chip graphic */}
                            <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 border border-amber-200/50 shadow-inner flex items-center justify-center">
                              <div className="w-6 h-4 border border-amber-900/30 rounded-sm" />
                            </div>
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/10 backdrop-blur-md uppercase tracking-wider">
                              {detectCardType(newCardNumber)}
                            </span>
                          </div>

                          {/* Card Number display */}
                          <div className="font-mono text-base sm:text-xl font-bold tracking-[0.12em] sm:tracking-[0.18em] mb-4 text-zinc-100">
                            {newCardNumber.trim() ? formatCardNumber(newCardNumber) : "•••• •••• •••• ••••"}
                          </div>

                          {/* Cardholder & Expiry */}
                          <div className="flex justify-between items-end text-xs font-mono uppercase tracking-wider text-zinc-300">
                            <div className="truncate max-w-[200px]">
                              <div className="text-[10px] text-zinc-400 font-sans normal-case">Cardholder</div>
                              <span className="font-semibold text-white">{newCardName.trim() || (clientOrgName || "BRAND / CLIENT NAME")}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-[10px] text-zinc-400 font-sans normal-case">Expires</div>
                              <span className="font-semibold text-white">{newCardExpiry || "MM/YY"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Card Entry Form */}
                        <form onSubmit={handleSaveNewCard} className="space-y-4">
                          {addCardError && (
                            <div className="p-3 rounded-xl flex items-center gap-2 text-xs font-body bg-rose-500/10 border border-rose-500/20 text-rose-500">
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                              <span>{addCardError}</span>
                            </div>
                          )}

                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 font-body" style={{ color: "var(--color-text-secondary)" }}>
                              Card Number
                            </label>
                            <div className="relative">
                              <Input
                                value={newCardNumber}
                                onChange={(e) => {
                                  const formatted = formatCardNumber(e.target.value);
                                  setNewCardNumber(formatted);
                                  if (addCardError) setAddCardError(null);
                                }}
                                placeholder="4123 4567 8901 2345"
                                maxLength={19}
                                className="pr-10 font-mono text-sm"
                                required
                              />
                              <CreditCard className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 font-body" style={{ color: "var(--color-text-secondary)" }}>
                              Cardholder Name
                            </label>
                            <Input
                              value={newCardName}
                              onChange={(e) => {
                                setNewCardName(e.target.value);
                                if (addCardError) setAddCardError(null);
                              }}
                              placeholder="e.g. Sarah Jenkins / FilmCraft Studios"
                              className="text-sm font-body"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 font-body" style={{ color: "var(--color-text-secondary)" }}>
                                Expiry Date
                              </label>
                              <Input
                                value={newCardExpiry}
                                onChange={(e) => {
                                  const formatted = formatCardExpiry(e.target.value);
                                  setNewCardExpiry(formatted);
                                  if (addCardError) setAddCardError(null);
                                }}
                                placeholder="MM/YY"
                                maxLength={5}
                                className="font-mono text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 font-body" style={{ color: "var(--color-text-secondary)" }}>
                                CVV Security Code
                              </label>
                              <Input
                                type="password"
                                value={newCardCvv}
                                onChange={(e) => {
                                  const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                                  setNewCardCvv(digits);
                                  if (addCardError) setAddCardError(null);
                                }}
                                placeholder="•••"
                                maxLength={4}
                                className="font-mono text-sm"
                                required
                              />
                            </div>
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={newCardIsDefault}
                              onChange={(e) => setNewCardIsDefault(e.target.checked)}
                              className="w-4 h-4 rounded text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                            />
                            <span className="text-xs font-body font-medium" style={{ color: "var(--color-text-secondary)" }}>
                              Set as default billing method for project escrow funding
                            </span>
                          </label>

                          <div className="pt-2 flex gap-3">
                            <Button
                              type="button"
                              variant="secondary"
                              className="flex-1 h-11 text-xs"
                              onClick={() => setShowAddCardModal(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              className="flex-1 h-11 text-xs font-semibold shadow-md"
                            >
                              Save Card
                            </Button>
                          </div>

                          <div className="text-[11px] font-body text-center text-zinc-400 flex items-center justify-center gap-1.5 pt-1">
                            <Shield className="w-3.5 h-3.5 text-emerald-500" />
                            <span>256-bit bank encryption · Monologg Escrow Verified</span>
                          </div>
                        </form>
                      </div>
                    </Modal>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ── Notifications ── */}
          {section === "notifications" && (
            <motion.div key="notifications" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <div className="rounded-2xl overflow-hidden" style={s.surface}>
                {(isClient ? [
                  { key: "bookings" as const, label: "New Project Applications", desc: "When performers apply to your posted briefs" },
                  { key: "messages" as const, label: "Order Room Messages", desc: "New messages from booked performers" },
                  { key: "payments" as const, label: "Escrow Receipts & Charges", desc: "Escrow lock and release confirmations" },
                  { key: "reminders" as const, label: "Project Milestones", desc: "Applicant caps and deliverable updates" },
                  { key: "marketing" as const, label: "Casting Tips & Product Updates", desc: "Platform features and performer highlights" },
                ] : [
                  { key: "bookings" as const, label: "New Booking Requests", desc: "When a client books one of your services" },
                  { key: "messages" as const, label: "Messages", desc: "New messages in your Order Rooms" },
                  { key: "payments" as const, label: "Payment Updates", desc: "Escrow releases, payouts, and payment confirmations" },
                  { key: "reminders" as const, label: "Deadline Reminders", desc: "Upcoming order deadlines and schedule alerts" },
                  { key: "marketing" as const, label: "Tips & Product Updates", desc: "Platform tips, new features, and newsletters" },
                ]).map((item, i, arr) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between px-4 py-4"
                    style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--color-hairline)" : undefined }}
                  >
                    <div className="flex-1 pr-4">
                      <div className="text-sm font-semibold font-body" style={s.text}>{item.label}</div>
                      <div className="text-xs font-body mt-0.5" style={s.tertiary}>{item.desc}</div>
                    </div>
                    <TOGGLE on={notif[item.key]} onToggle={() => setNotif(prev => ({ ...prev, [item.key]: !prev[item.key] }))} label={item.label} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Security ── */}
          {section === "security" && (
            <motion.div key="security" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="rounded-2xl overflow-hidden" style={s.surface}>
                <div className="px-4 py-3.5">
                  <div className="text-sm font-semibold font-body mb-3" style={s.text}>Change Password</div>
                  <div className="space-y-3">
                    <Input
                      type="password"
                      placeholder="Current Password"
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        setPasswordError(null);
                      }}
                    />
                    <Input
                      type="password"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPasswordError(null);
                      }}
                    />
                    <Input
                      type="password"
                      placeholder="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPasswordError(null);
                      }}
                    />
                  </div>
                  {passwordError && (
                    <div className="text-xs text-[var(--color-error)] font-body mt-2">{passwordError}</div>
                  )}
                  {passwordSaved && (
                    <div className="text-xs text-[var(--color-success)] font-body mt-2">Password updated successfully. ✓</div>
                  )}
                  <Button
                    className="w-full h-11 mt-3 text-sm"
                    disabled={!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()}
                    onClick={handleUpdatePassword}
                  >
                    {passwordSaved ? "Password Updated! ✓" : "Update Password"}
                  </Button>
                </div>
              </div>

              {/* Change Passcode (Performers only - client accounts do not have a withdrawal passcode) */}
              {!isClient && (
                <div className="rounded-2xl overflow-hidden" style={s.surface}>
                  <div className="px-4 py-3.5">
                    <div className="text-sm font-semibold font-body mb-3" style={s.text}>Change Passcode</div>
                    <div className="space-y-3">
                      <Input
                        type="password"
                        maxLength={4}
                        placeholder="Current Passcode"
                        value={currentPasscode}
                        onChange={(e) => {
                          setCurrentPasscode(e.target.value.replace(/\D/g, "").slice(0, 4));
                          setPasscodeError(null);
                        }}
                      />
                      <Input
                        type="password"
                        maxLength={4}
                        placeholder="New Passcode"
                        value={newPasscode}
                        onChange={(e) => {
                          setNewPasscode(e.target.value.replace(/\D/g, "").slice(0, 4));
                          setPasscodeError(null);
                        }}
                      />
                      <Input
                        type="password"
                        maxLength={4}
                        placeholder="Confirm New Passcode"
                        value={confirmPasscode}
                        onChange={(e) => {
                          setConfirmPasscode(e.target.value.replace(/\D/g, "").slice(0, 4));
                          setPasscodeError(null);
                        }}
                      />
                    </div>
                    {passcodeError && (
                      <div className="text-xs text-[var(--color-error)] font-body mt-2">{passcodeError}</div>
                    )}
                    {passcodeSaved && (
                      <div className="text-xs text-[var(--color-success)] font-body mt-2">Withdrawal security passcode updated successfully. ✓</div>
                    )}
                    <Button
                      className="w-full h-11 mt-3 text-sm"
                      disabled={currentPasscode.length !== 4 || newPasscode.length !== 4 || confirmPasscode.length !== 4}
                      onClick={handleUpdatePasscode}
                    >
                      {passcodeSaved ? "Passcode Updated! ✓" : "Update Passcode"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-error-bg)", border: "1px solid var(--color-error)" }}>
                <button
                  type="button"
                  className="w-full px-4 py-3.5 text-left transition-opacity hover:opacity-90 active:scale-[0.99]"
                  onClick={() => {
                    setShowDeleteAccountModal(true);
                    setDeleteConfirmText("");
                    setDeleteScheduled(false);
                  }}
                >
                  <div className="text-sm font-semibold font-body" style={{ color: "var(--color-error)" }}>Delete Account</div>
                  <div className="text-xs font-body mt-0.5" style={{ color: "var(--color-error)", opacity: 0.7 }}>Permanently delete your account and all data</div>
                </button>
              </div>
            </motion.div>
          )}

          {/* Terms of Service Section */}
          {section === "terms" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: DURATION_MED, ease: EASE_OUT }}
              className="space-y-4 sm:space-y-6"
            >
              {/* Header Card */}
              <div
                className="p-4 sm:p-6 rounded-[var(--radius-xl)] flex flex-col gap-2.5 relative"
                style={{ ...s.surface, boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
                  <span className="text-[11px] sm:text-xs font-mono font-medium tracking-wider uppercase" style={{ color: "var(--color-accent)" }}>
                    Effective Date: October 29, 2026
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight" style={s.text}>
                  Terms of Service
                </h2>
                <p className="text-xs sm:text-sm font-body leading-relaxed" style={s.secondary}>
                  These Terms of Service govern your access to Monologg, including bookable profile storefronts, project briefs, escrow-protected milestone payments, and Order Room workspaces.
                </p>
              </div>

              {/* Structured Terms List */}
              <div className="space-y-3 sm:space-y-4">
                {TERMS_OF_SERVICE_ITEMS.map((item, idx) => (
                  <div
                    key={item.title}
                    className="p-4 sm:p-5 rounded-[var(--radius-xl)] transition-all hover:border-[var(--color-border-strong)]"
                    style={{ ...s.surface, boxShadow: "var(--shadow-card)" }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs sm:text-sm font-bold font-mono"
                        style={{ background: "var(--color-bg-elevated)", color: "var(--color-accent)" }}
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-semibold font-body mb-1" style={s.text}>
                          {item.title}
                        </h3>
                        <p className="text-xs sm:text-sm font-body leading-relaxed" style={s.secondary}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Full Document Link Card */}
              <div
                className="p-4 sm:p-5 rounded-[var(--radius-xl)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                style={{ ...s.elevated, boxShadow: "var(--shadow-card)" }}
              >
                <div>
                  <div className="text-xs sm:text-sm font-semibold font-body" style={s.text}>
                    Need the comprehensive legal fine print?
                  </div>
                  <div className="text-[11px] sm:text-xs font-body mt-0.5" style={s.secondary}>
                    Includes international GDPR &amp; NDPA compliance clauses and governing law.
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5 text-xs font-semibold shrink-0 w-full sm:w-auto"
                  onClick={() => navigate("/legal/terms")}
                >
                  View Full Web Terms <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Escrow Policy Section (Role-Adaptive: Client see Client, Performer see Performer) */}
          {section === "escrow" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: DURATION_MED, ease: EASE_OUT }}
              className="space-y-4 sm:space-y-6"
            >
              {/* Header Card */}
              <div
                className="p-4 sm:p-6 rounded-[var(--radius-xl)] flex flex-col gap-2.5 relative"
                style={{ ...s.surface, boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-success)]" />
                  <span className="text-[11px] sm:text-xs font-mono font-medium tracking-wider uppercase text-[var(--color-success)]">
                    {isClient ? "Client Escrow Protection · Paystack Secured" : "Performer Escrow Guarantee · 100% Pre-Funded"}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight" style={s.text}>
                  {isClient ? "Client Escrow Policy" : "Performer Escrow Policy"}
                </h2>
                <p className="text-xs sm:text-sm font-body leading-relaxed" style={s.secondary}>
                  {isClient
                    ? "Your budget is vaulted securely in escrow upon checkout and only disbursed to performers when deliverables are verified and accepted."
                    : "Never work on speculation. Client funds are 100% pre-funded and legally locked in escrow before your call time or creative production begins."}
                </p>

                {/* Key Metric Highlights Bar */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-3 border-t border-[var(--color-hairline)] mt-1">
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-[var(--color-bg-elevated)]">
                    <div className="text-[10px] sm:text-xs font-body font-medium" style={s.tertiary}>
                      {isClient ? "Protection" : "Guaranteed"}
                    </div>
                    <div className="text-xs sm:text-sm font-bold font-mono text-[var(--color-accent)] mt-0.5">
                      100% Escrow
                    </div>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-[var(--color-bg-elevated)]">
                    <div className="text-[10px] sm:text-xs font-body font-medium" style={s.tertiary}>
                      Review Window
                    </div>
                    <div className="text-xs sm:text-sm font-bold font-mono text-[var(--color-accent)] mt-0.5">
                      48 Hours
                    </div>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-[var(--color-bg-elevated)]">
                    <div className="text-[10px] sm:text-xs font-body font-medium" style={s.tertiary}>
                      {isClient ? "Fee" : "Take-Home"}
                    </div>
                    <div className="text-xs sm:text-sm font-bold font-mono text-[var(--color-accent)] mt-0.5">
                      {isClient ? "12% Transparent" : "93% Net"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Role-Specific Escrow Terms */}
              <div className="space-y-3 sm:space-y-4">
                {(isClient ? CLIENT_ESCROW_TERMS : PERFORMER_ESCROW_TERMS).map((item, idx) => (
                  <div
                    key={item.title}
                    className="p-4 sm:p-5 rounded-[var(--radius-xl)] transition-all hover:border-[var(--color-border-strong)]"
                    style={{ ...s.surface, boxShadow: "var(--shadow-card)" }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs sm:text-sm font-bold font-mono"
                        style={{ background: "var(--color-bg-elevated)", color: "var(--color-accent)" }}
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm sm:text-base font-semibold font-body" style={s.text}>
                            {item.title}
                          </h3>
                          {item.badge && (
                            <Badge tone="neutral" className="text-[10px] px-1.5 py-0 font-mono">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm font-body leading-relaxed" style={s.secondary}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trust & Safety Assurance Footer */}
              <div
                className="p-4 sm:p-5 rounded-[var(--radius-xl)] flex items-start gap-3"
                style={{ ...s.elevated, boxShadow: "var(--shadow-card)" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)" }}
                >
                  <Lock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-semibold font-body" style={s.text}>
                    Monologg Trust &amp; Safety Assurance
                  </div>
                  <p className="text-[11px] sm:text-xs font-body mt-0.5 leading-relaxed" style={s.secondary}>
                    All escrow deposits and settlements are processed via Paystack with end-to-end encryption. Monologg acts as an impartial escrow agent ensuring agreed terms and milestone deliverables are honored in full.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Share Modal */}
      <AnimatePresence>
        {showShare && (
          <Modal onClose={() => setShowShare(false)}>
            <motion.div
              initial={{ y: 20, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.95 }}
              className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-[var(--radius-xl)] p-5 sm:p-6"
              style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>Share Profile</h3>
                <button
                  onClick={() => setShowShare(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80"
                  style={{ background: "var(--color-bg-elevated)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs font-body mb-4" style={{ color: "var(--color-text-secondary)" }}>
                Share your public Monologg talent profile with casting directors and clients.
              </p>
              <div className="flex items-center gap-2 p-2 rounded-xl mb-4 border" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-border-default)" }}>
                <div className="text-xs font-mono truncate flex-1 pl-2" style={{ color: "var(--color-text-primary)" }}>
                  monologg.co/emeka-johnson
                </div>
                <Button
                  variant="secondary"
                  className="h-8 px-3 text-xs shrink-0"
                  onClick={() => {
                    const url = `${window.location.origin}/storefront/emeka`;
                    navigator.clipboard?.writeText(url);
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2000);
                  }}
                >
                  Copy Link
                </Button>
              </div>
              <div className="mb-4">
                <Button
                  className="w-full h-10 text-xs font-semibold gap-2"
                  onClick={() => navigate("/storefront/emeka")}
                >
                  Open Public Storefront <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="secondary" className="h-9 text-xs" onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(window.location.origin + "/storefront/emeka")}`)}>WhatsApp</Button>
                <Button variant="secondary" className="h-9 text-xs" onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.origin + "/storefront/emeka")}`)}>Twitter</Button>
                <Button variant="secondary" className="h-9 text-xs" onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin + "/storefront/emeka")}`)}>LinkedIn</Button>
              </div>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteAccountModal && (
          <Modal onClose={() => !deletingAccount && setShowDeleteAccountModal(false)}>
            <motion.div
              initial={{ y: 20, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.95 }}
              className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[var(--radius-xl)] p-5 sm:p-6"
              style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {!deleteScheduled ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}
                      >
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-display text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                          Delete Account
                        </h3>
                        <p className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>
                          Permanent action · Cannot be undone
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDeleteAccountModal(false)}
                      disabled={deletingAccount}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
                      style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-secondary)" }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div
                    className="p-4 rounded-2xl border space-y-3.5 mb-5"
                    style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}
                  >
                    {/* Information loss item */}
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-body flex-1">
                        <strong className="block font-semibold mb-0.5 text-sm" style={{ color: "var(--color-text-primary)" }}>
                          Profile &amp; Content Removed
                        </strong>
                        <p className="leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                          Your profile, videos, client reviews, and messages will be permanently deleted and cannot be recovered.
                        </p>
                      </div>
                    </div>

                    <div className="h-[1px] bg-[var(--color-hairline)]" />

                    {/* 72-hour earnings transfer guarantee */}
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}
                      >
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-body flex-1">
                        <strong className="block font-semibold mb-0.5 text-sm" style={{ color: "var(--color-text-primary)" }}>
                          Remaining Balance Sent to Bank
                        </strong>
                        <p className="leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                          Any remaining balance will be automatically transferred to your bank within 72 hours.
                        </p>
                        <div className="mt-2 font-mono text-[11px] px-2.5 py-1 rounded-md bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] inline-flex items-center gap-1.5 text-[var(--color-text-primary)]">
                          <span style={{ color: "var(--color-text-tertiary)" }}>Payout to:</span>
                          <span className="font-semibold">{bankDetails.bankName || "Verified Bank"} (•••• {bankDetails.accountNumber.slice(-4) || "••••"})</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="block text-xs font-medium font-body mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
                      To confirm deletion, type <span className="font-mono font-bold text-[var(--color-error)]">DELETE</span> below:
                    </label>
                    <Input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE to confirm"
                      className="font-mono tracking-wider text-sm"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <Button
                      variant="secondary"
                      className="w-full sm:flex-1 h-11 text-xs font-semibold"
                      disabled={deletingAccount}
                      onClick={() => setShowDeleteAccountModal(false)}
                    >
                      Keep Account
                    </Button>
                    <Button
                      className="w-full sm:flex-1 h-11 text-xs font-semibold transition-colors"
                      style={{
                        background: deleteConfirmText.trim().toUpperCase() === "DELETE" ? "var(--color-error)" : "var(--color-bg-elevated)",
                        color: deleteConfirmText.trim().toUpperCase() === "DELETE" ? "#fff" : "var(--color-text-tertiary)",
                        border: "1px solid var(--color-hairline)",
                      }}
                      disabled={deleteConfirmText.trim().toUpperCase() !== "DELETE" || deletingAccount}
                      onClick={handleDeleteAccount}
                    >
                      {deletingAccount ? "Deleting Account…" : "Delete My Account"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)" }}
                  >
                    <Clock className="w-7 h-7" />
                  </div>
                  <h3 className="font-display text-lg font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
                    Account Scheduled for Deletion
                  </h3>
                  <p className="text-xs font-body mb-4 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    Your account is deactivated. Any remaining balance will be transferred to your bank within 72 hours.
                  </p>
                  <div className="p-3 rounded-xl mb-5 text-xs font-mono" style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-primary)" }}>
                    Payout window: Under 72 hours to {bankDetails.bankName || "Verified Bank"} (•••• {bankDetails.accountNumber.slice(-4) || "••••"})
                  </div>
                  <Button
                    className="w-full h-11 text-xs font-semibold"
                    onClick={handleFinishDeletion}
                  >
                    Sign Out & Return to Home
                  </Button>
                </div>
              )}
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>

      <UploadPerformanceReelModal
        isOpen={showUploadReelModal}
        onClose={() => setShowUploadReelModal(false)}
        currentReelUrl={performanceReelUrl}
        onUploadSuccess={(url, title) => {
          setHasReel(true);
          setPerformanceReelUrl(url);
          if (title) setPerformanceReelTitle(title);
          appStateSync.updateTalentProfile({
            hasReel: true,
            performanceReelUrl: url,
            performanceReelTitle: title,
          });
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }}
      />

      <WatchPerformanceReelModal
        isOpen={showWatchReelModal}
        onClose={() => setShowWatchReelModal(false)}
        videoUrl={performanceReelUrl}
        title={performanceReelTitle || "Featured Audition Reel"}
        canUpload={true}
        onOpenUpload={() => setShowUploadReelModal(true)}
      />
    </div>
  );
}
