import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Badge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { EASE_OUT } from "../../lib/motionTokens";
import { Sidebar, type SidebarNavItem } from "../components/ui/Sidebar";
import { BottomNav } from "../components/ui/BottomNav";
import { apiClient, type TalentFilters } from "../../lib/api-client";
import { appStateSync, type BillingCard, DEFAULT_PROJECT_DETAILS, getProjectDetails, type ProjectDetailedInfo } from "../../lib/state-sync";
import { NotificationCenterModal } from "../components/notifications/NotificationCenterModal";
import { track } from "../../lib/tracker";
import type { Applicant, ClientProject, Order, PublicRateCard, StatMetric, Talent } from "@monologg/types";
import {
  Home, Search, Briefcase, MessageSquare, Bell,
  Plus, Star, Shield, Filter, Users,
  ChevronRight, Play, X, Check, AlertCircle, TrendingUp,
  CreditCard, ArrowLeft, Clock, MapPin, Lock, FileText,
  Layers, Copy, FileDown, Folder, Calendar, Share2,
  CheckCircle2, PlayCircle, Eye, EyeOff, HelpCircle, Edit3,
  Trash2, Sparkles, ShieldCheck, Download, ExternalLink,
  Upload, FileCheck, ArrowRight, SlidersHorizontal, Globe,
  Zap, Pause, Volume2, List, LayoutGrid, Video
} from "lucide-react";

// features.md Phase 14 (PWA-17) — the same fixed-hour slot-picker pattern
// Checkout.tsx uses for booking a real, server-verified open slot; small
// enough (and stable enough) that duplicating it here beats importing across
// a page-to-page boundary, the same tradeoff routes/talent.ts documents for
// its own small enum duplication.
const APPLICANT_STATUS_LABEL: Record<string, string> = {
  APPLIED: "Applied",
  SHORTLISTED: "Shortlisted",
  SELECTED: "Selected",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};
const CANDIDATE_SLOT_HOURS = Array.from({ length: 12 }, (_, i) => i + 8);
const SLOT_DURATION_MIN = 60;
function toTimeStr(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
  const m = (totalMinutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}
function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
function addMinutes(time: string, minutes: number): string {
  return toTimeStr(minutesOf(time) + minutes);
}

export function isProjectOnline(project?: { location?: string; description?: string; name?: string; projectName?: string } | null): boolean {
  if (!project) return false;
  const loc = (project.location || "").toLowerCase();
  const desc = (project.description || "").toLowerCase();
  const name = ((project as any).name || project.projectName || "").toLowerCase();
  return (
    loc.includes("online") ||
    loc.includes("remote") ||
    desc.includes("online") ||
    desc.includes("remote") ||
    name.includes("voiceover") ||
    name.includes("voice-over")
  );
}

export function getSplinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

export function getAreaPath(points: { x: number; y: number }[], baselineY: number): string {
  if (points.length === 0) return "";
  const spline = getSplinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${spline} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z`;
}

export type ClientAnalyticsRange = "30d" | "90d" | "year" | "all";

export const CLIENT_ANALYTICS_DATA: Record<
  ClientAnalyticsRange,
  {
    rangeLabel: string;
    totalSpend: string;
    spendSubtext: string;
    successfulProjects: string;
    projectsSubtext: string;
    avgRating: string;
    ratingSubtext: string;
    repeatRate: string;
    repeatSubtext: string;
    graphPeriodSubtitle: string;
    graphPoints: { label: string; amount: number }[];
    yTicks: { label: string; val: number }[];
    maxVal: number;
  }
> = {
  "30d": {
    rangeLabel: "Last 30 days",
    totalSpend: "₦285,000",
    spendSubtext: "+18% vs previous month",
    successfulProjects: "2",
    projectsSubtext: "100% on-time milestone delivery",
    avgRating: "5.0 ★",
    ratingSubtext: "Across 2 verified performer reviews",
    repeatRate: "33%",
    repeatSubtext: "High talent retention rate",
    graphPeriodSubtitle: "Campaign spend across 4 weekly payout milestones",
    graphPoints: [
      { label: "Wk 1", amount: 45000 },
      { label: "Wk 2", amount: 80000 },
      { label: "Wk 3", amount: 60000 },
      { label: "Wk 4", amount: 100000 },
    ],
    yTicks: [
      { label: "₦100k", val: 100000 },
      { label: "₦75k", val: 75000 },
      { label: "₦50k", val: 50000 },
      { label: "₦25k", val: 25000 },
      { label: "₦0", val: 0 },
    ],
    maxVal: 100000,
  },
  "90d": {
    rangeLabel: "Last 90 days",
    totalSpend: "₦590,000",
    spendSubtext: "+24% quarterly growth",
    successfulProjects: "3",
    projectsSubtext: "3 productions wrapped & released",
    avgRating: "4.9 ★",
    ratingSubtext: "Across 3 verified performer reviews",
    repeatRate: "28%",
    repeatSubtext: "Optimal roster re-hire benchmark",
    graphPeriodSubtitle: "Quarterly escrow commitment and disbursements",
    graphPoints: [
      { label: "Month 1", amount: 150000 },
      { label: "Month 2", amount: 220000 },
      { label: "Month 3", amount: 220000 },
    ],
    yTicks: [
      { label: "₦250k", val: 250000 },
      { label: "₦200k", val: 200000 },
      { label: "₦150k", val: 150000 },
      { label: "₦100k", val: 100000 },
      { label: "₦0", val: 0 },
    ],
    maxVal: 250000,
  },
  "year": {
    rangeLabel: "This Year",
    totalSpend: "₦850,000",
    spendSubtext: "Across 4 active & completed briefs",
    successfulProjects: "4",
    projectsSubtext: "100% dispute-free completions",
    avgRating: "4.9 ★",
    ratingSubtext: "Top 5% client rating on Monologg",
    repeatRate: "25%",
    repeatSubtext: "High performer satisfaction",
    graphPeriodSubtitle: "Year-to-date production budgets locked in escrow",
    graphPoints: [
      { label: "Q1", amount: 180000 },
      { label: "Q2", amount: 240000 },
      { label: "Q3", amount: 280000 },
      { label: "Q4", amount: 150000 },
    ],
    yTicks: [
      { label: "₦300k", val: 300000 },
      { label: "₦200k", val: 200000 },
      { label: "₦100k", val: 100000 },
      { label: "₦0", val: 0 },
    ],
    maxVal: 300000,
  },
  "all": {
    rangeLabel: "All time",
    totalSpend: "₦1,420,000",
    spendSubtext: "Cumulative verified platform spend",
    successfulProjects: "6",
    projectsSubtext: "All escrow funds settled",
    avgRating: "4.9 ★",
    ratingSubtext: "Consistent 5-star reputation",
    repeatRate: "30%",
    repeatSubtext: "Trusted client partner tier",
    graphPeriodSubtitle: "Historical platform spend across all completed cycles",
    graphPoints: [
      { label: "H1 2025", amount: 250000 },
      { label: "H2 2025", amount: 320000 },
      { label: "H1 2026", amount: 450000 },
      { label: "H2 2026", amount: 400000 },
    ],
    yTicks: [
      { label: "₦500k", val: 500000 },
      { label: "₦375k", val: 375000 },
      { label: "₦250k", val: 250000 },
      { label: "₦125k", val: 125000 },
      { label: "₦0", val: 0 },
    ],
    maxVal: 500000,
  },
};



const DEFAULT_FALLBACK_APPLICANTS: Record<string, Applicant[]> = {
  "P-001": [
    {
      applicationId: "myapp-1",
      status: "APPLIED",
      pitch: "I've voiced three prior Nike regional spots — happy to share reels and turnaround takes within 24 hours.",
      appliedAt: "2026-07-15T00:00:00.000Z",
      creator: { id: "seed-creator-adaeze", name: "Adaeze Obi", role: "Voice-Over Artist", location: "Lagos", avatar: "AO", verified: true, tags: ["Warm", "Multilingual", "Corporate"], price: "₦28,000" },
    },
    {
      applicationId: "myapp-4",
      status: "SHORTLISTED",
      pitch: "Bilingual EN/FR delivery available if the campaign runs across West Africa. Professional home booth setup.",
      appliedAt: "2026-07-16T00:00:00.000Z",
      creator: { id: "seed-creator-amara", name: "Amara Diallo", role: "Voice-Over Artist", location: "Accra", avatar: "AD", verified: true, tags: ["Storytelling", "Animated", "French"], price: "₦35,000" },
    },
  ],
  "P-002": [
    {
      applicationId: "myapp-2",
      status: "SHORTLISTED",
      pitch: "Experienced bilingual master of ceremonies for pan-African conferences. High-energy audience engagement.",
      appliedAt: "2026-07-10T00:00:00.000Z",
      creator: { id: "seed-creator-funke", name: "Funke Davies", role: "Keynote Compere", location: "Abuja", avatar: "FD", verified: true, tags: ["Corporate", "Executive", "Stage Presence"], price: "₦50,000" },
    },
  ],
  "P-004": [
    {
      applicationId: "myapp-5",
      status: "APPLIED",
      pitch: "Nollywood feature experience, ready for on-set shoot schedule in Lagos. Monologue reel attached.",
      appliedAt: "2026-07-18T00:00:00.000Z",
      creator: { id: "seed-creator-chidi", name: "Chidi Okon", role: "Actor", location: "Lagos", avatar: "CO", verified: true, tags: ["Dramatic", "Method Acting", "Nollywood"], price: "₦45,000" },
    },
  ],
};

type Tab = "home" | "discover" | "projects" | "orders" | "shortlist" | "activity" | "analytics";

// Filter option list — UI configuration, not domain data; stays local
// (see apps/web/src/lib/api-client.ts doc comment for the mock-data boundary).
const NICHES = ["All", "Actor", "Voice-Over", "Comedian", "Compere", "Speaker", "Content Creator"];

// features.md Phase 12A.3 — PWA-10 attribute filters. Chip multi-selects
// (spec's own words) collapse to single-select here: the search rule is an
// AND across active filters (routes/talent.ts), and true multi-value-per-field
// OR-within-a-field filtering isn't something the backend's current query
// shape supports — a real "multi-select" would need an `in: [...]` clause per
// field, which is a bigger backend change than this UI pass. Flagged, not
// silently narrowed.
const ATTRIBUTE_FILTER_FIELDS: Array<{ key: keyof TalentFilters; label: string; options: string[] }> = [
  { key: "genderPresentation", label: "Gender", options: ["MASCULINE", "FEMININE", "ANDROGYNOUS", "NON_BINARY"] },
];

const CLIENT_NAV_ITEMS: SidebarNavItem<Tab>[] = [
  { id: "home", label: "Dashboard", icon: Home },
  { id: "discover", label: "Find Performers", icon: Search },
  { id: "projects", label: "My Projects", icon: Briefcase },
  { id: "orders", label: "Orders", icon: MessageSquare },
  { id: "shortlist", label: "Shortlist", icon: Star },
  { id: "activity", label: "Activity", icon: AlertCircle },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
];

const CLIENT_BOTTOM_NAV_ITEMS: SidebarNavItem<Tab>[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "discover", label: "Find", icon: Search },
  { id: "projects", label: "Projects", icon: Briefcase },
  { id: "orders", label: "Orders", icon: MessageSquare },
  { id: "shortlist", label: "Saved", icon: Star },
];

interface ClientNotificationItem {
  id: string;
  kind: string;
  createdAt: string;
  readAt?: string;
  payload: Record<string, any>;
}

export function ClientDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [clientProfile, setClientProfile] = useState(() => appStateSync.getClientProfile());
  const [analyticsDateRange, setAnalyticsDateRange] = useState<ClientAnalyticsRange>("year");
  const [hoveredSpendIndex, setHoveredSpendIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("All");
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);
  const [selectedApplicantForProfile, setSelectedApplicantForProfile] = useState<Applicant | null>(null);
  const [stats, setStats] = useState<StatMetric[]>([]);
  const [talents, setTalents] = useState<Talent[]>([]);
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showAttributeFilters, setShowAttributeFilters] = useState(false);
  const [showClientReviewsModal, setShowClientReviewsModal] = useState(false);
  const [attributeFilters, setAttributeFilters] = useState<TalentFilters>({});
  const [maxBudgetSlider, setMaxBudgetSlider] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<ClientNotificationItem[]>(() => appStateSync.getNotifications());
  const [selectedProjectDetail, setSelectedProjectDetail] = useState<ClientProject | null>(null);
  const [clientProjectTab, setClientProjectTab] = useState<"applicants" | "overview" | "requirements" | "sides" | "escrow">("applicants");
  const [isEditingProjectInfo, setIsEditingProjectInfo] = useState(false);
  const [editingSection, setEditingSection] = useState<"overview" | "roles" | "sides" | "deliverables" | "assets" | null>(null);
  const [editedProjectName, setEditedProjectName] = useState("");
  const [editedProjectBudget, setEditedProjectBudget] = useState("");
  const [editedProjectNiche, setEditedProjectNiche] = useState("");
  const [editedProjectLocation, setEditedProjectLocation] = useState("");
  const [editedProjectTimeline, setEditedProjectTimeline] = useState("");
  const [editedProjectSynopsis, setEditedProjectSynopsis] = useState("");
  const [editedProjectScript, setEditedProjectScript] = useState("");
  const [editedRoleNiches, setEditedRoleNiches] = useState<string[]>([]);
  const [editedRoleGuidelines, setEditedRoleGuidelines] = useState("");
  const [editedDeliverables, setEditedDeliverables] = useState<string[]>([]);
  const [newDeliverableInput, setNewDeliverableInput] = useState("");
  const [editedAssets, setEditedAssets] = useState<{ name: string; size: string; type: string }[]>([]);
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetType, setNewAssetType] = useState("Brief PDF");
  const [projectStateOverrides, setProjectStateOverrides] = useState<Record<string, string>>({});
  const [projectOverridesInfo, setProjectOverridesInfo] = useState<Record<string, Partial<ProjectDetailedInfo>>>({});
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [applicantFilterTab, setApplicantFilterTab] = useState<"all" | "shortlisted" | "selected" | "applied" | "rejected">("all");
  const [applicantSearchQuery, setApplicantSearchQuery] = useState("");
  const [editingSynopsisInline, setEditingSynopsisInline] = useState(false);
  const [isPlayingReel, setIsPlayingReel] = useState(false);
  const [activitySearch, setActivitySearch] = useState("");
  const [activityFilter, setActivityFilter] = useState<"all" | "project" | "application" | "payment" | "message">("all");
  const [activity] = useState([
    { id: "act-1", type: "project", title: "Project Posted", desc: "Nike Q1 Campaign brief created", time: "10m ago", refId: "P-001" },
    { id: "act-2", type: "application", title: "New Application", desc: "Adaeze Obi applied to Tech Summit Compere", time: "1h ago", refId: "P-002" },
    { id: "act-3", type: "payment", title: "Escrow Locked", desc: "₦120,000 locked securely for Nike Campaign VO", time: "2d ago", refId: "ORD-001" },
    { id: "act-4", type: "message", title: "New Message", desc: "Emeka Johnson uploaded script audio file", time: "3d ago", refId: "ORD-001" },
  ]);
  const currentUser = appStateSync.getLoggedInUser();
  const [isNewUser, setIsNewUser] = useState(() => {
    const stored = localStorage.getItem("monologg_is_new_user");
    if (stored !== null) return stored === "true";
    return currentUser ? (currentUser.isNewUser ?? false) : false;
  });
  const [walletBalance, setWalletBalance] = useState(() => {
    const bal = appStateSync.getBalance().available;
    return bal > 0 ? bal : 850000;
  });
  const [showBalance, setShowBalance] = useState(true);
  const [showFundWalletModal, setShowFundWalletModal] = useState(false);
  const [fundAmountInput, setFundAmountInput] = useState("50,000");
  const [isFunding, setIsFunding] = useState(false);
  const [fundingSuccess, setFundingSuccess] = useState(false);
  const [walletFundMethod, setWalletFundMethod] = useState<"card" | "paystack">("card");

  // Client project escrow & card debit publishing states
  const [savedCards, setSavedCards] = useState<BillingCard[]>(() => appStateSync.getBillingCards());
  const [showPublishEscrowModal, setShowPublishEscrowModal] = useState(false);
  const [publishingProject, setPublishingProject] = useState<ClientProject | null>(null);
  const [escrowPaymentMethod, setEscrowPaymentMethod] = useState<"card" | "wallet">("card");
  const [selectedEscrowCardId, setSelectedEscrowCardId] = useState<string>(() => {
    const cards = appStateSync.getBillingCards();
    const def = cards.find(c => c.isDefault) || cards[0];
    return def ? def.id : "";
  });
  const [cardCvv, setCardCvv] = useState("739");
  const [isPublishingEscrow, setIsPublishingEscrow] = useState(false);
  const [publishEscrowSuccess, setPublishEscrowSuccess] = useState(false);

  // Fund Wallet Enhanced Features: Card Add, Insufficient Funds Error, Paystack Checkout Modal, Success & Toasts
  const [cardFundError, setCardFundError] = useState<string | null>(null);
  const [showAddNewCardInline, setShowAddNewCardInline] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardCvv, setNewCardCvv] = useState("");
  const [newCardName, setNewCardName] = useState("");
  const [showPaystackModal, setShowPaystackModal] = useState(false);
  const [paystackTab, setPaystackTab] = useState<"card" | "transfer" | "ussd">("card");
  const [paystackProcessing, setPaystackProcessing] = useState(false);
  const [paystackCopied, setPaystackCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [fundingSuccessData, setFundingSuccessData] = useState<{
    amount: number;
    method: string;
    newBalance: number;
    ref: string;
  } | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  function formatCardNumber(val: string): string {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
  }

  function detectCardType(num: string): "Mastercard" | "Visa" | "Verve" {
    const clean = num.replace(/\D/g, "");
    if (clean.startsWith("4")) return "Visa";
    if (clean.startsWith("506") || clean.startsWith("650") || clean.startsWith("507")) return "Verve";
    return "Mastercard";
  }

  function executePaystackPayment() {
    const amt = parseInt(fundAmountInput.replace(/\D/g, ""), 10) || 50000;
    setPaystackProcessing(true);
    setTimeout(() => {
      appStateSync.fundWallet(amt);
      const newBal = (walletBalance || 850000) + amt;
      setWalletBalance(newBal);
      appStateSync.addNotification({
        id: `notif-${Date.now()}`,
        kind: "WALLET_FUNDED",
        createdAt: new Date().toISOString(),
        payload: { clientName: `Wallet Credited: ₦${amt.toLocaleString()} via Paystack` },
      });
      setNotifications(appStateSync.getNotifications());
      setToastMessage(`✓ Wallet credited with ₦${amt.toLocaleString()} via Paystack`);
      setPaystackProcessing(false);
      setShowPaystackModal(false);
      setFundingSuccessData({
        amount: amt,
        method: "Paystack Instant Escrow",
        newBalance: newBal,
        ref: `ref_paystack_${Date.now().toString().slice(-6)}`,
      });
      setFundingSuccess(true);
    }, 600);
  }

  function executeCardDebit() {
    const amt = parseInt(fundAmountInput.replace(/\D/g, ""), 10) || 0;
    if (amt <= 0) return;

    setIsFunding(true);
    setTimeout(() => {
      // Simulate insufficient funds if amount >= 1,000,000 or error simulation is triggered
      if (amt >= 1000000) {
        setIsFunding(false);
        setCardFundError("insufficient_funds");
        return;
      }

      appStateSync.fundWallet(amt);
      const newBal = (walletBalance || 850000) + amt;
      setWalletBalance(newBal);
      const selectedCard = savedCards.find(c => c.id === selectedEscrowCardId) || savedCards[0];
      const cardLabel = selectedCard ? `${selectedCard.type} •••• ${selectedCard.last4}` : "Saved Card";

      appStateSync.addNotification({
        id: `notif-${Date.now()}`,
        kind: "WALLET_FUNDED",
        createdAt: new Date().toISOString(),
        payload: { clientName: `Wallet Credited: ₦${amt.toLocaleString()} from ${cardLabel}` },
      });
      setNotifications(appStateSync.getNotifications());
      setToastMessage(`✓ Wallet credited with ₦${amt.toLocaleString()} from ${cardLabel}`);
      setIsFunding(false);
      setFundingSuccessData({
        amount: amt,
        method: `${cardLabel} Direct Debit`,
        newBalance: newBal,
        ref: `card_tx_${Date.now().toString().slice(-6)}`,
      });
      setFundingSuccess(true);
    }, 500);
  }

  const effectiveProjects = isNewUser ? [] : projects;
  const effectiveOrders = isNewUser ? [] : orders;
  const effectiveShortlist = isNewUser ? [] : shortlist;
  const effectiveActivity = isNewUser ? [] : activity;
  const effectiveStats = isNewUser
    ? [
        { label: "Total Spent", value: "₦0" },
        { label: "Active Projects", value: "0" },
        { label: "Performers Hired", value: "0" },
        { label: "Applicants", value: "0" },
      ]
    : stats;
  const navigate = useNavigate();
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderViewMode, setOrderViewMode] = useState<"chat" | "cards">("chat");

  const handleOpenPublishEscrow = (project?: ClientProject | null) => {
    const target = project || selectedProjectDetail;
    if (!target) return;
    setPublishingProject(target);
    setPublishEscrowSuccess(false);
    setIsPublishingEscrow(false);
    const cards = appStateSync.getBillingCards();
    setSavedCards(cards);
    if (!selectedEscrowCardId && cards.length > 0) {
      const def = cards.find(c => c.isDefault) || cards[0];
      setSelectedEscrowCardId(def.id);
    }
    setShowPublishEscrowModal(true);
  };

  const handleConfirmPublishEscrow = () => {
    if (!publishingProject) return;
    setIsPublishingEscrow(true);
    setTimeout(() => {
      appStateSync.updateClientProject(publishingProject.id, {
        status: "active",
        applicationsOpen: true,
      });
      setProjectStateOverrides((prev) => ({ ...prev, [publishingProject.id]: "active" }));
      setProjects((prev) =>
        prev.map((p) =>
          p.id === publishingProject.id ? { ...p, status: "active", applicationsOpen: true } : p
        )
      );
      setSelectedProjectDetail((prev) =>
        prev && prev.id === publishingProject.id
          ? { ...prev, status: "active", applicationsOpen: true }
          : prev
      );
      if (applicants.length === 0 && DEFAULT_FALLBACK_APPLICANTS[publishingProject.id]) {
        setApplicants(DEFAULT_FALLBACK_APPLICANTS[publishingProject.id]);
      }
      appStateSync.addNotification({
        id: `notif-${Date.now()}`,
        kind: "PROJECT_APPLICATION",
        createdAt: new Date().toISOString(),
        payload: { clientName: `Casting Call Live: ${publishingProject.name}` },
      });

      if (escrowPaymentMethod === "wallet") {
        const budgetNum = parseInt(publishingProject.budget.replace(/\D/g, ""), 10) || 750000;
        setWalletBalance((prev) => Math.max(0, prev - budgetNum));
      }

      setIsPublishingEscrow(false);
      setPublishEscrowSuccess(true);
    }, 600);
  };

  useEffect(() => {
    const sync = () => {
      setClientProfile(appStateSync.getClientProfile());
      apiClient.listClientProjects().then(setProjects);
      setNotifications(appStateSync.getNotifications());
      setSavedCards(appStateSync.getBillingCards());
    };
    const unsub = appStateSync.subscribe(sync);
    apiClient.getClientStats().then(setStats);
    apiClient.listClientProjects().then(setProjects);
    apiClient.listClientOrders().then(setOrders);
    apiClient.getShortlistedTalentIds().then(setShortlist);
    return unsub;
  }, []);

  // features.md Phase 14 (PWA-17) — applicant management.
  const [applicantsProject, setApplicantsProject] = useState<ClientProject | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [applicantActionError, setApplicantActionError] = useState<string | null>(null);
  const [selectingApplicationId, setSelectingApplicationId] = useState<string | null>(null);
  const [selectRateCards, setSelectRateCards] = useState<PublicRateCard[]>([]);
  const [selectRateCardId, setSelectRateCardId] = useState("");
  const [selectDate, setSelectDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectOpenSlots, setSelectOpenSlots] = useState<{ start: string; end: string }[]>([]);
  const [selectSlotStart, setSelectSlotStart] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);

  const openProjectDetail = (project: ClientProject) => {
    setSelectedProjectDetail(project);
    setEditedProjectName(project.name);
    setEditedProjectBudget(project.budget);
    setEditedProjectNiche(project.niche);
    const details = { ...getProjectDetails(project), ...(projectOverridesInfo[project.id] || {}) };
    setEditedProjectSynopsis(details.description);
    setEditedProjectScript(details.scriptSample);
    setEditedProjectLocation(details.location);
    setEditedProjectTimeline(details.timeline);
    setEditedRoleNiches(details.nicheReq || []);
    setEditedRoleGuidelines(details.additionalNotes || "");
    setEditedDeliverables(details.deliverables || []);
    setEditedAssets(details.assets || []);
    setIsEditingProjectInfo(false);
    setEditingSynopsisInline(false);
    setEditingSection(null);
    const initialTab = (project.status === "draft" || projectStateOverrides[project.id] === "draft") ? "overview" : "applicants";
    setClientProjectTab(initialTab);
    setApplicantsProject(project);
    setApplicantActionError(null);
    setLoadingApplicants(true);
    apiClient.listApplicants(project.id).then((list) => {
      if (list && list.length > 0) {
        setApplicants(list);
      } else if (DEFAULT_FALLBACK_APPLICANTS[project.id]) {
        setApplicants(DEFAULT_FALLBACK_APPLICANTS[project.id]);
      } else {
        setApplicants([]);
      }
      setLoadingApplicants(false);
    });
  };

  const viewTalentProfile = (creator: Applicant["creator"], applicant?: Applicant) => {
    setSelectedApplicantForProfile(applicant || null);
    const match = talents.find((t) => t.id === creator.id || t.name === creator.name);
    if (match) {
      setSelectedTalent(match);
    } else {
      setSelectedTalent({
        id: creator.id,
        name: creator.name,
        role: creator.role,
        location: creator.location,
        price: creator.price || "₦28,000",
        avatar: creator.avatar,
        verified: creator.verified,
        available: true,
        tags: creator.tags || ["Warm", "Multilingual", "Corporate"],
        rating: 4.9,
        reviews: 18,
      });
    }

    // Open performer storefront profile in separate tab for in-depth inspection
    const slug = (creator.name || creator.id).toLowerCase().replace(/\s+/g, "-");
    try {
      if (typeof window !== "undefined" && typeof window.open === "function") {
        window.open(`/${slug}?role=client`, "_blank");
      }
    } catch {
      // test environment or popup blocker safeguard
    }
  };

  const refreshApplicants = () => {
    if (!applicantsProject) return;
    apiClient.listApplicants(applicantsProject.id).then((list) => {
      if (list && list.length > 0) setApplicants(list);
    });
    apiClient.listClientProjects().then(setProjects);
  };

  const handleShortlist = async (applicationId: string) => {
    setApplicantActionError(null);
    setApplicants((prev) => prev.map((a) => a.applicationId === applicationId ? { ...a, status: "SHORTLISTED" } : a));
    setSelectedApplicantForProfile((prev) => prev && prev.applicationId === applicationId ? { ...prev, status: "SHORTLISTED" } : prev);
    await apiClient.shortlistApplicant(applicationId);
    refreshApplicants();
  };

  const handleRejectApplicant = async (applicationId: string) => {
    setApplicantActionError(null);
    setApplicants((prev) => prev.map((a) => a.applicationId === applicationId ? { ...a, status: "REJECTED" } : a));
    setSelectedApplicantForProfile((prev) => prev && prev.applicationId === applicationId ? { ...prev, status: "REJECTED" } : prev);
    await apiClient.rejectApplicant(applicationId);
    refreshApplicants();
  };

  const handleSelectAndHireApplicant = (applicant: Applicant) => {
    setApplicants((prev) => prev.map((a) => a.applicationId === applicant.applicationId ? { ...a, status: "SELECTED" } : a));
    setSelectedApplicantForProfile((prev) => prev && prev.applicationId === applicant.applicationId ? { ...prev, status: "SELECTED" } : prev);
    if (selectedProjectDetail) {
      setProjectStateOverrides((prev) => ({ ...prev, [selectedProjectDetail.id]: "in_progress" }));
      setProjects((prev) => prev.map((p) => p.id === selectedProjectDetail.id ? { ...p, status: "in_progress" } : p));
      setSelectedProjectDetail((prev) => prev ? { ...prev, status: "in_progress" } : null);
      appStateSync.addNotification({
        id: `notif-${Date.now()}`,
        kind: "ORDER_CREATED",
        createdAt: new Date().toISOString(),
        payload: { clientName: `Hired ${applicant.creator.name} for ${selectedProjectDetail.name}. Order Room created.` },
      });
    }
  };

  const openSelectFlow = (applicant: Applicant) => {
    setSelectingApplicationId(applicant.applicationId);
    setSelectRateCardId("");
    setSelectSlotStart(null);
    setApplicantActionError(null);
    apiClient.getCreatorRateCardsPublic(applicant.creator.id).then((cards) => {
      setSelectRateCards(cards);
      if (cards.length === 1) setSelectRateCardId(cards[0].id);
    });
  };

  useEffect(() => {
    if (!selectingApplicationId) return;
    const applicant = applicants.find((a) => a.applicationId === selectingApplicationId);
    if (!applicant) return;
    setSelectSlotStart(null);
    apiClient.getOpenSlots(applicant.creator.id, selectDate).then(setSelectOpenSlots);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectingApplicationId, selectDate]);

  const selectSlotFits = (start: string): boolean => {
    const end = addMinutes(start, SLOT_DURATION_MIN);
    return selectOpenSlots.some((o) => o.start <= start && o.end >= end);
  };

  const handleConfirmSelect = async () => {
    if (!selectingApplicationId || !selectRateCardId || !selectSlotStart) return;
    setSelecting(true);
    setApplicantActionError(null);
    try {
      await apiClient.selectApplicant(selectingApplicationId, {
        rateCardId: selectRateCardId,
        slotDate: selectDate,
        slotStart: selectSlotStart,
        slotEnd: addMinutes(selectSlotStart, SLOT_DURATION_MIN),
      });
      setApplicants((prev) => prev.map((a) => a.applicationId === selectingApplicationId ? { ...a, status: "SELECTED" } : a));
      if (selectedProjectDetail) {
        setProjectStateOverrides((prev) => ({ ...prev, [selectedProjectDetail.id]: "in_progress" }));
        setProjects((prev) => prev.map((p) => p.id === selectedProjectDetail.id ? { ...p, status: "in_progress" } : p));
        setSelectedProjectDetail((prev) => prev ? { ...prev, status: "in_progress" } : null);
        appStateSync.addNotification({
          id: `notif-${Date.now()}`,
          kind: "ORDER_CREATED",
          createdAt: new Date().toISOString(),
          payload: { clientName: `Performer selected for ${selectedProjectDetail.name}. Order Room created.` },
        });
      }
      setSelectingApplicationId(null);
      refreshApplicants();
    } catch {
      setApplicantActionError("That slot was just taken, or this application can no longer be selected — please try again.");
    } finally {
      setSelecting(false);
    }
  };

  // features.md Phase 12A.3: attribute filters are server-authoritative
  // (visibility rules can't be evaluated client-side without leaking
  // SEARCHABLE/PRIVATE values), so changing them re-fetches rather than
  // filtering the already-loaded `talents` list in memory.
  useEffect(() => {
    apiClient.listTalents(attributeFilters).then(setTalents);
  }, [attributeFilters]);

  const toggleAttributeFilter = (key: keyof TalentFilters, value: string) => {
    setAttributeFilters((prev) => (prev[key] === value ? { ...prev, [key]: undefined } : { ...prev, [key]: value }));
  };

  const toggleShortlist = (id: string) => {
    setShortlist(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const activeFiltersCount = Object.values(attributeFilters).filter(Boolean).length + (maxBudgetSlider > 0 ? 1 : 0);
  const totalPerformerFilterCount = activeFiltersCount + (selectedNiche !== "All" ? 1 : 0);

  const filteredTalents = talents.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesNiche = selectedNiche === "All" || t.role.toLowerCase().includes(selectedNiche.toLowerCase());

    // Location filter
    const matchesLocation = !attributeFilters.location || attributeFilters.location === "All" || t.location.toLowerCase() === attributeFilters.location.toLowerCase();

    // Budget slider filter (Rate card)
    const talentNumPrice = parseInt(t.price.replace(/\D/g, ""), 10) || 0;
    const matchesBudget = !maxBudgetSlider || maxBudgetSlider === 0 || talentNumPrice <= maxBudgetSlider;

    // Gender / presentation filter
    const talentGender = t.attributes?.genderPresentation;
    const matchesGender = !attributeFilters.genderPresentation || !talentGender || talentGender === attributeFilters.genderPresentation;

    // Age filter
    const talentAge = t.attributes?.ageRange;
    const matchesAge = !attributeFilters.ageRange || !talentAge || talentAge === attributeFilters.ageRange;

    // Physical attributes (build, height, complexion, hair)
    const matchesBuild = !attributeFilters.build || !t.attributes?.build || t.attributes.build === attributeFilters.build;
    const matchesHeight = !attributeFilters.heightRange || !t.attributes?.heightRange || t.attributes.heightRange === attributeFilters.heightRange;
    const matchesComplexion = !attributeFilters.complexion || !t.attributes?.complexion || t.attributes.complexion === attributeFilters.complexion;
    const matchesHair = !attributeFilters.hairColor || !t.attributes?.hairColor || t.attributes.hairColor === attributeFilters.hairColor;

    return matchesSearch && matchesNiche && matchesLocation && matchesBudget && matchesGender && matchesAge && matchesBuild && matchesHeight && matchesComplexion && matchesHair;
  });

  useEffect(() => {
    if (activeTab === "discover" && (searchQuery.trim() || totalPerformerFilterCount > 0)) {
      const keys = [
        searchQuery.trim() ? "searchQuery" : null,
        selectedNiche !== "All" ? "niche" : null,
        maxBudgetSlider > 0 ? "budget" : null,
        ...Object.keys(attributeFilters).filter((k) => (attributeFilters as Record<string, unknown>)[k]),
      ].filter(Boolean) as string[];

      track("talent_search_performed", {
        niche: selectedNiche,
        filterKeys: keys,
        resultCount: filteredTalents.length,
      });
    }
  }, [activeTab, searchQuery, selectedNiche, attributeFilters, maxBudgetSlider, filteredTalents.length, totalPerformerFilterCount]);

  const filteredActivity = effectiveActivity.filter(item => {
    const matchesQuery = item.title.toLowerCase().includes(activitySearch.toLowerCase()) || item.desc.toLowerCase().includes(activitySearch.toLowerCase());
    const matchesKind = activityFilter === "all" || item.type === activityFilter;
    return matchesQuery && matchesKind;
  });

  const screenTitle =
    activeTab === "home" ? "Dashboard"
    : activeTab === "discover" ? "Find Performers"
    : activeTab === "projects" ? "My Projects"
    : activeTab === "orders" ? "Active Orders"
    : activeTab === "activity" ? "Activity History"
    : activeTab === "analytics" ? "Hiring Analytics"
    : "Shortlist";

  const orgName = clientProfile.orgName || clientProfile.name || "FilmCraft Studios";
  const clientInitials = orgName.split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]!.toUpperCase()).join("") || "FS";

  return (
    <div className="role-client min-h-screen overflow-x-hidden" style={{ background: "var(--color-bg-canvas)" }}>
      <Sidebar
        portalLabel="Client Portal"
        navItems={CLIENT_NAV_ITEMS}
        activeTab={activeTab}
        onTab={setActiveTab}
        onNavigate={navigate}
        onSignOut={async () => { await apiClient.logout(); navigate("/"); }}
        identity={{ initials: clientInitials, name: orgName, avatarUrl: clientProfile.avatarUrl ?? undefined, subtitle: "Client Account" }}
      />

      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between px-4 sm:px-5 py-2.5 sticky top-0 z-40 glass-panel" style={{ borderLeft: "none", borderRight: "none", borderTop: "none" }}>
        <div className="min-w-0 flex-1 mr-2">
          <div className="text-[11px] font-body tracking-normal truncate" style={{ color: "var(--color-text-tertiary)" }}>{orgName}</div>
          <div className="font-display text-base sm:text-lg leading-tight truncate" style={{ color: "var(--color-text-primary)" }}>{screenTitle}</div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setIsNewUser(!isNewUser)}
            className="text-xs px-2 sm:px-2.5 py-1 rounded-full border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] transition-colors text-[var(--color-text-secondary)] flex items-center gap-1.5 font-body"
            title="Toggle between New User empty state and Active Demo state"
          >
            <span className={`w-2 h-2 rounded-full ${isNewUser ? "bg-amber-500" : "bg-emerald-500"}`} />
            <span className="hidden sm:inline">{isNewUser ? "New User" : "Demo"}</span>
          </button>
          <button
            aria-label="View notifications"
            onClick={() => setShowNotifications(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center relative hover:opacity-80 transition-opacity"
            style={{ background: "var(--color-bg-elevated)" }}
          >
            <Bell className="w-[18px] h-[18px]" style={{ color: "var(--color-text-secondary)" }} />
            {notifications.some(n => !n.readAt) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2" style={{ background: "var(--color-accent)", "--tw-ring-color": "var(--color-bg-surface)" } as React.CSSProperties} />
            )}
          </button>
          <button
            aria-label="Account"
            onClick={() => navigate("/settings?role=client")}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm font-body hover:opacity-80 transition-opacity border"
            style={{
              background: "var(--color-accent-soft)",
              color: "var(--color-accent)",
              borderColor: "var(--color-hairline)",
            }}
          >
            {clientInitials}
          </button>
        </div>
      </div>

      <main id="main-content" className="lg:pl-60 pb-28 lg:pb-0">
        <div className="max-w-5xl mx-auto px-4 py-6 lg:px-8 lg:py-8">

          {/* Desktop header */}
          <div className={`hidden ${activeTab === "projects" && selectedProjectDetail ? "lg:hidden" : "lg:flex"} items-center justify-between mb-8`}>
            <div>
              <h1 className="font-display text-3xl" style={{ color: "var(--color-text-primary)" }}>
                {activeTab === "home" && `Good morning, ${orgName} 🎬`}
                {activeTab === "discover" && "Find Performers"}
                {activeTab === "projects" && "My Projects"}
                {activeTab === "orders" && "Active Orders"}
                {activeTab === "shortlist" && "Shortlisted Performers"}
                {activeTab === "activity" && "Activity History"}
              </h1>
              <p className="text-sm font-body mt-1" style={{ color: "var(--color-text-secondary)" }}>
                {activeTab === "home" && "Your next project is just a few clicks away."}
                {activeTab === "discover" && "Browse verified performers, style-tagged by AI, across all niches."}
                {activeTab === "projects" && "Manage your project briefs and applications."}
                {activeTab === "orders" && "Track your active collaborations."}
                {activeTab === "shortlist" && "Performers you've saved for future bookings."}
                {activeTab === "activity" && "Complete log of your project creations, applications, payments, and messages."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button className="h-10 px-4 text-sm gap-2" onClick={() => navigate("/brief")}>
                <Plus className="w-4 h-4" /> Post Project
              </Button>
              <button
                aria-label="View notifications"
                onClick={() => setShowNotifications(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity relative"
                style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}
              >
                <Bell className="w-4 h-4" style={{ color: "var(--color-text-secondary)" }} />
                {notifications.some(n => !n.readAt) && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: "var(--color-accent)" }} />
                )}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">

            {/* ── Home ── */}
            {activeTab === "home" && (
              <motion.div key="home" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                {/* Onboarding Action Nudges Checklist Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-5 sm:p-6 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-card)] relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)] flex items-center justify-center text-white text-xs font-bold font-mono shadow-xs">
                        {isNewUser ? "1/4" : "3/4"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-base font-bold text-[var(--color-text-primary)]">
                            {isNewUser ? "Welcome! Get Started as a Client" : "Client Onboarding & Action Nudges"}
                          </h3>
                        </div>
                        <p className="text-xs font-body text-[var(--color-text-secondary)] mt-0.5">
                          {isNewUser ? "Follow these steps to discover, shortlist, and hire top performers for your productions." : "Actions to streamline performer acquisition for your current projects."}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {isNewUser ? "Onboarding" : "Active Client"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-xs font-body">
                      <span className="text-[var(--color-text-tertiary)] font-medium">Setup progress</span>
                      <span className="font-bold text-[var(--color-accent)]">{isNewUser ? "25%" : "75%"} completed</span>
                    </div>
                    <div className="w-full h-2 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--color-accent)] to-[#9035FF] rounded-full transition-all duration-500 shadow-2xs"
                        style={{ width: isNewUser ? "25%" : "75%" }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <button
                      onClick={() => navigate("/settings?role=client")}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--color-bg-surface-2)] border border-[var(--color-border-default)] hover:border-[var(--color-accent)] hover:shadow-xs text-left transition-all group hover:-translate-y-0.5 cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[var(--color-accent-soft)] flex items-center justify-center shrink-0 text-[var(--color-accent)] group-hover:scale-105 transition-transform">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold font-body text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] flex items-center justify-between transition-colors">
                          Profile <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <div className="text-[11px] font-body text-[var(--color-text-tertiary)] truncate mt-0.5">Brand details</div>
                      </div>
                    </button>

                    <button
                      onClick={() => navigate("/brief")}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--color-bg-surface-2)] border border-[var(--color-border-default)] hover:border-[var(--color-accent)] hover:shadow-xs text-left transition-all group hover:-translate-y-0.5 cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[var(--color-accent-soft)] flex items-center justify-center shrink-0 text-[var(--color-accent)] group-hover:scale-105 transition-transform">
                        <Plus className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold font-body text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] flex items-center justify-between transition-colors">
                          Post Project Brief <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <div className="text-[11px] font-body text-[var(--color-text-tertiary)] truncate mt-0.5">Receive applications</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab("discover")}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--color-bg-surface-2)] border border-[var(--color-border-default)] hover:border-[var(--color-accent)] hover:shadow-xs text-left transition-all group hover:-translate-y-0.5 cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[var(--color-accent-soft)] flex items-center justify-center shrink-0 text-[var(--color-accent)] group-hover:scale-105 transition-transform">
                        <Search className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold font-body text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] flex items-center justify-between transition-colors">
                          Find Performers <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <div className="text-[11px] font-body text-[var(--color-text-tertiary)] truncate mt-0.5">Filter by niche & style</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab("shortlist")}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--color-bg-surface-2)] border border-[var(--color-border-default)] hover:border-[var(--color-accent)] hover:shadow-xs text-left transition-all group hover:-translate-y-0.5 cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[var(--color-accent-soft)] flex items-center justify-center shrink-0 text-[var(--color-accent)] group-hover:scale-105 transition-transform">
                        <Star className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold font-body text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] flex items-center justify-between transition-colors">
                          Shortlist Creators <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <div className="text-[11px] font-body text-[var(--color-text-tertiary)] truncate mt-0.5">Bookmark favorites</div>
                      </div>
                    </button>
                  </div>
                </motion.div>

                {/* HERO — Executive Financial Command Center (Simplified Wallet Balance) */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE_OUT }}
                  className="relative overflow-hidden mb-6 p-6 sm:p-7 rounded-[28px] bg-gradient-to-br from-[#1C0E35] via-[#2A1052] to-[#150727] text-white shadow-xl border border-purple-500/20"
                >
                  {/* Subtle blurred purple glow rings in background */}
                  <div className="absolute -top-24 -right-12 w-72 h-72 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-20 -left-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

                  <div className="relative">
                    {/* Top status bar */}
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="text-[11px] font-mono tracking-wider uppercase text-purple-200 font-semibold truncate">
                          Wallet Balance
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowBalance(!showBalance)}
                          className="p-1 rounded-md text-purple-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                          aria-label={showBalance ? "Hide balance" : "Show balance"}
                        >
                          {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-body text-purple-200 shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="hidden sm:inline">Paystack Secured</span>
                        <span className="sm:hidden">Secured</span>
                      </div>
                    </div>

                    {/* Primary balance row & sole Fund Wallet CTA */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="font-display font-black text-white tnum leading-tight text-4xl sm:text-5xl tracking-tight">
                          {showBalance ? (isNewUser ? "₦0" : `₦${walletBalance.toLocaleString()}`) : "••••••••"}
                        </div>
                      </div>

                      <div className="pt-1 sm:pt-0 w-full sm:w-auto">
                        <button
                          onClick={() => setShowFundWalletModal(true)}
                          className="h-10 px-5 rounded-full text-xs font-bold font-body transition-all active:scale-95 bg-white text-[#7B00FE] shadow-md hover:bg-white/90 flex sm:inline-flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
                        >
                          <Plus className="w-3.5 h-3.5" /> Fund Wallet
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Quick-Action Hub Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: "Post Project", sub: "Create brief & audition", icon: Plus, action: () => navigate("/brief") },
                    { label: "Find Performers", sub: "Browse 120+ verified talent", icon: Search, action: () => setActiveTab("discover") },
                    { label: "My Projects", sub: "Review applicant pipeline", icon: Briefcase, action: () => setActiveTab("projects") },
                    { label: "Active Orders", sub: "Live production rooms", icon: MessageSquare, action: () => setActiveTab("orders") },
                  ].map((qa, i) => (
                    <button
                      key={i}
                      onClick={qa.action}
                      className="p-3 sm:p-3.5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] hover:border-[var(--color-accent)] hover:shadow-xs transition-all hover:-translate-y-0.5 group cursor-pointer text-left flex items-center gap-2.5 sm:gap-3"
                      style={{ boxShadow: "var(--shadow-card)" }}
                    >
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--color-accent-soft)] flex items-center justify-center shrink-0 text-[var(--color-accent)] group-hover:scale-105 transition-transform">
                        <qa.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold font-body text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors truncate">
                          {qa.label}
                        </div>
                        <div className="hidden sm:block text-[11px] font-body text-[var(--color-text-tertiary)] truncate mt-0.5">
                          {qa.sub}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Recent Activity */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="font-display text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>Recent Activity</span>
                  <button className="text-xs font-bold font-body text-[var(--color-accent)] hover:underline cursor-pointer" onClick={() => setActiveTab("activity")}>View all →</button>
                </div>
                {effectiveActivity.length === 0 ? (
                  <div className="text-center py-10 px-4 rounded-[var(--radius-lg)]" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)" }}>
                    <div className="w-12 h-12 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center mx-auto mb-3 text-[var(--color-accent)]">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>No activity logged yet</p>
                    <p className="text-xs font-body mt-1 mb-4 text-[var(--color-text-secondary)]">Post a project brief or discover performers to start building your activity log.</p>
                    <Button onClick={() => navigate("/brief")} className="h-9 px-4 text-xs">
                      Post a Project Brief
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {effectiveActivity.slice(0, 4).map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }}
                        className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.99] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] hover:border-[var(--color-accent)] shadow-xs group"
                        onClick={() => {
                          if (item.type === "project" || item.type === "application") {
                            setActiveTab("projects");
                          } else if (item.type === "payment") {
                            navigate("/transactions?role=client");
                          } else {
                            navigate("/order/ORD-001?role=client");
                          }
                        }}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105" style={{
                          background: item.type === "payment" ? "rgba(26,117,68,0.12)" : item.type === "application" ? "rgba(230,165,23,0.12)" : "var(--color-accent-soft)",
                        }}>
                          {item.type === "project" && <Briefcase className="w-4 h-4" style={{ color: "var(--color-accent)" }} />}
                          {item.type === "application" && <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                          {item.type === "payment" && <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                          {item.type === "message" && <MessageSquare className="w-4 h-4" style={{ color: "var(--color-accent)" }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold font-body text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors truncate">{item.title}</div>
                          <div className="text-xs font-body text-[var(--color-text-secondary)] truncate mt-0.5">{item.desc}</div>
                        </div>
                        <div className="text-[11px] font-mono font-medium shrink-0 px-2.5 py-1 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-hairline)] text-[var(--color-text-tertiary)]">
                          {item.time}
                        </div>
                        <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Activity History Tab ── */}
            {activeTab === "activity" && (
              <motion.div key="activity" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-text-tertiary)" }} />
                    <Input
                      className="pl-9"
                      placeholder="Search activity records..."
                      value={activitySearch}
                      onChange={e => setActivitySearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                  {(["all", "project", "application", "payment", "message"] as const).map(kind => (
                    <button
                      key={kind}
                      onClick={() => setActivityFilter(kind)}
                      className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium font-body capitalize transition-all"
                      style={{
                        background: activityFilter === kind ? "var(--color-accent)" : "var(--color-bg-surface)",
                        color: activityFilter === kind ? "var(--color-text-inverse)" : "var(--color-text-secondary)",
                        border: `1px solid ${activityFilter === kind ? "var(--color-accent)" : "var(--color-border-default)"}`,
                      }}
                    >
                      {kind === "all" ? "All Activity" : kind}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {filteredActivity.length === 0 ? (
                    <div className="text-center py-12 rounded-[var(--radius-lg)] p-6" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
                      <p className="text-sm font-body" style={{ color: "var(--color-text-tertiary)" }}>No activity records found.</p>
                    </div>
                  ) : (
                    filteredActivity.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (item.type === "project" || item.type === "application") {
                            setActiveTab("projects");
                          } else if (item.type === "payment") {
                            navigate("/transactions?role=client");
                          } else {
                            navigate("/order/ORD-001?role=client");
                          }
                        }}
                        className="p-4 rounded-[var(--radius-lg)] flex items-center justify-between cursor-pointer hover:border-[var(--color-accent)] transition-all"
                        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-card)" }}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--color-accent-glow)" }}>
                            {item.type === "project" && <Briefcase className="w-4 h-4" style={{ color: "var(--color-accent)" }} />}
                            {item.type === "application" && <Users className="w-4 h-4" style={{ color: "var(--color-accent)" }} />}
                            {item.type === "payment" && <Shield className="w-4 h-4" style={{ color: "var(--color-success)" }} />}
                            {item.type === "message" && <MessageSquare className="w-4 h-4" style={{ color: "var(--color-accent)" }} />}
                          </div>
                          <div>
                            <div className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>{item.title}</div>
                            <div className="text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>{item.desc}</div>
                          </div>
                        </div>
                        <div className="text-xs font-body text-right" style={{ color: "var(--color-text-tertiary)" }}>
                          {item.time}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Discover Tab ── */}
            {activeTab === "discover" && (
              <motion.div key="discover" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <h2 className="font-display text-2xl mb-4 lg:hidden" style={{ color: "var(--color-text-primary)" }}>Find Performers</h2>

                {/* Search + filter */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-tertiary)" }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search by name, role, or vibe..."
                      className="w-full !h-10 text-xs sm:text-sm pl-9 pr-8 rounded-xl border font-body outline-none transition-all focus:border-[var(--color-accent)]"
                      style={{
                        background: "var(--color-bg-surface)",
                        borderColor: "var(--color-border-default)",
                        color: "var(--color-text-primary)",
                      }}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[var(--color-bg-elevated)]"
                        style={{ color: "var(--color-text-tertiary)" }}
                        aria-label="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    aria-label="Filter performers"
                    aria-pressed={showAttributeFilters}
                    onClick={() => setShowAttributeFilters((v) => !v)}
                    className={`h-10 px-3.5 rounded-xl border text-xs font-semibold font-body inline-flex items-center gap-2 shrink-0 transition-all ${
                      totalPerformerFilterCount > 0 || showAttributeFilters
                        ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                        : "hover:border-[var(--color-border-strong)]"
                    }`}
                    style={{
                      background: (showAttributeFilters || totalPerformerFilterCount > 0) ? "var(--color-accent-soft)" : "var(--color-bg-surface)",
                      borderColor: (showAttributeFilters || totalPerformerFilterCount > 0) ? "var(--color-accent)" : "var(--color-border-default)",
                      color: (showAttributeFilters || totalPerformerFilterCount > 0) ? "var(--color-accent)" : "var(--color-text-primary)",
                    }}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Filters</span>
                    {totalPerformerFilterCount > 0 && (
                      <span
                        className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center font-mono tnum"
                        style={{ background: "var(--color-accent)", color: "#FFFFFF" }}
                      >
                        {totalPerformerFilterCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Active Filter Chips */}
                {totalPerformerFilterCount > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mb-4">
                    {selectedNiche !== "All" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-[var(--color-accent)]">
                        Craft: {selectedNiche}
                        <button onClick={() => setSelectedNiche("All")} className="hover:opacity-75" aria-label="Remove craft filter">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {maxBudgetSlider > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-[var(--color-accent)]">
                        Max Rate: ₦{maxBudgetSlider.toLocaleString()}
                        <button onClick={() => setMaxBudgetSlider(0)} className="hover:opacity-75" aria-label="Remove budget filter">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {Object.entries(attributeFilters).map(([k, v]) => {
                      if (!v) return null;
                      const fieldDef = ATTRIBUTE_FILTER_FIELDS.find(f => f.key === k);
                      const label = fieldDef?.label || k;
                      return (
                        <span key={k} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-[var(--color-accent)]">
                          {label}: {String(v).replace(/_/g, " ")}
                          <button onClick={() => toggleAttributeFilter(k as any, v as any)} className="hover:opacity-75" aria-label={`Remove ${label} filter`}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                    <button
                      onClick={() => {
                        setAttributeFilters({});
                        setMaxBudgetSlider(0);
                        setSelectedNiche("All");
                      }}
                      className="text-[11px] font-semibold text-[var(--color-accent)] hover:underline ml-1"
                    >
                      Clear all
                    </button>
                  </div>
                )}

                {/* Filter Performers Modal — Modal dialog matching Performer's own filter modal (Image 5) */}
                <AnimatePresence>
                  {showAttributeFilters && (
                    <Modal onClose={() => setShowAttributeFilters(false)} strength="strong">
                      <motion.div
                        initial={{ y: 20, scale: 0.96, opacity: 0 }}
                        animate={{ y: 0, scale: 1, opacity: 1 }}
                        exit={{ y: 20, scale: 0.96, opacity: 0 }}
                        className="w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
                        style={{
                          background: "var(--color-bg-surface)",
                          border: "1px solid var(--color-border-default)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--color-hairline)" }}>
                          <div className="flex items-center gap-2.5">
                            <SlidersHorizontal className="w-5 h-5 text-[var(--color-accent)]" />
                            <h3 className="font-display text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
                              Filter Performers
                            </h3>
                          </div>
                          <button
                            onClick={() => setShowAttributeFilters(false)}
                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-elevated)] transition-colors"
                            style={{ color: "var(--color-text-tertiary)" }}
                            aria-label="Close filters"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* 1. Category / Craft Role */}
                        <div>
                          <label className="block text-xs uppercase font-semibold font-body tracking-wider mb-2" style={{ color: "var(--color-text-secondary)" }}>
                            Category / Craft Role
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {NICHES.map((niche) => {
                              const active = selectedNiche === niche;
                              return (
                                <button
                                  key={niche}
                                  type="button"
                                  onClick={() => setSelectedNiche(niche)}
                                  className={`px-3 py-1.5 rounded-full text-xs font-semibold font-body transition-all ${
                                    active ? "shadow-sm" : "hover:border-[var(--color-border-strong)]"
                                  }`}
                                  style={{
                                    background: active ? "var(--color-accent)" : "var(--color-bg-elevated)",
                                    color: active ? "var(--color-accent-on)" : "var(--color-text-secondary)",
                                    border: active ? "1px solid var(--color-accent)" : "1px solid var(--color-border-default)",
                                  }}
                                >
                                  {niche}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2. Budget (Rate Card) Slider */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs uppercase font-semibold font-body tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                              Minimum Budget
                            </label>
                            <span className="font-mono text-xs font-bold" style={{ color: "var(--color-accent)" }}>
                              {maxBudgetSlider === 0 ? "Any Budget" : `Up to ₦${maxBudgetSlider.toLocaleString()}`}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={150000}
                            step={5000}
                            value={maxBudgetSlider}
                            onChange={(e) => setMaxBudgetSlider(Number(e.target.value))}
                            className="w-full accent-[var(--color-accent)] cursor-pointer h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none"
                          />
                          <div className="flex justify-between text-[11px] font-body mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                            <span>₦0 (Any)</span>
                            <span>₦75k</span>
                            <span>₦150k+</span>
                          </div>
                        </div>

                        {/* 3. Gender Filter */}
                        <div>
                          {ATTRIBUTE_FILTER_FIELDS.map((field) => (
                            <div key={field.key as string}>
                              <label className="block text-xs uppercase font-semibold font-body tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
                                {field.label}
                              </label>
                              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide flex-wrap">
                                {field.options.map((opt) => {
                                  const active = attributeFilters[field.key] === opt;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => toggleAttributeFilter(field.key, opt)}
                                      aria-pressed={active}
                                      className="px-2.5 py-1 rounded-full text-[11px] font-medium font-body transition-all"
                                      style={{
                                        background: active ? "var(--color-accent)" : "var(--color-bg-elevated)",
                                        color: active ? "var(--color-accent-on)" : "var(--color-text-secondary)",
                                        border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border-default)"}`,
                                      }}
                                    >
                                      {opt.replace(/_/g, " ")}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 4. Age Range Filter */}
                        <div>
                          <label className="block text-xs uppercase font-semibold font-body tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
                            Age Range
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: "18–25", val: "RANGE_18_25" },
                              { label: "26–35", val: "RANGE_26_35" },
                              { label: "36–45", val: "RANGE_36_45" },
                              { label: "46–55", val: "RANGE_46_55" },
                              { label: "56–65", val: "RANGE_56_65" },
                              { label: "65+", val: "OVER_65" },
                            ].map(({ label, val }) => {
                              const active = attributeFilters.ageRange === val;
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => toggleAttributeFilter("ageRange", val)}
                                  className="px-3 py-1.5 rounded-full text-xs font-medium font-body transition-all"
                                  style={{
                                    background: active ? "var(--color-accent)" : "var(--color-bg-elevated)",
                                    color: active ? "var(--color-accent-on)" : "var(--color-text-secondary)",
                                    border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border-default)"}`,
                                  }}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 5. Location Filter */}
                        <div>
                          <label className="block text-xs uppercase font-semibold font-body tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
                            Location
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {["All", "Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano", "Enugu", "Accra"].map((loc) => {
                              const active = (!attributeFilters.location && loc === "All") || attributeFilters.location === loc;
                              return (
                                <button
                                  key={loc}
                                  type="button"
                                  onClick={() => {
                                    setAttributeFilters(prev => ({
                                      ...prev,
                                      location: loc === "All" || prev.location === loc ? undefined : loc,
                                    }));
                                  }}
                                  className="px-3 py-1.5 rounded-full text-xs font-medium font-body transition-all"
                                  style={{
                                    background: active ? "var(--color-accent)" : "var(--color-bg-elevated)",
                                    color: active ? "var(--color-accent-on)" : "var(--color-text-secondary)",
                                    border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border-default)"}`,
                                  }}
                                >
                                  {loc}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="pt-3 border-t flex items-center justify-between gap-3" style={{ borderColor: "var(--color-hairline)" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setAttributeFilters({});
                              setMaxBudgetSlider(0);
                              setSelectedNiche("All");
                            }}
                            className="text-xs font-semibold font-body hover:underline"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            Clear attribute filters
                          </button>

                          <Button
                            className="h-10 px-5 text-xs font-bold"
                            onClick={() => setShowAttributeFilters(false)}
                          >
                            Show Performers ({filteredTalents.length})
                          </Button>
                        </div>
                      </motion.div>
                    </Modal>
                  )}
                </AnimatePresence>

                {/* Talent grid */}
                {filteredTalents.length === 0 ? (
                  <div className="text-center py-16 px-6 rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] shadow-[var(--shadow-card)] flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center mb-4 text-[var(--color-accent)]">
                      <Users className="w-8 h-8" />
                    </div>
                    <h3 className="font-display text-xl font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>No Creators Found</h3>
                    <p className="text-sm font-body text-[var(--color-text-secondary)] max-w-md mb-6 leading-relaxed">
                      We couldn't find any performers matching your current search or filter criteria. Try clearing your filters or posting a project brief to receive direct pitches.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedNiche("All");
                          setAttributeFilters({});
                        }}
                      >
                        Clear Search & Filters
                      </Button>
                      <Button onClick={() => navigate("/brief")} className="gap-2">
                        <Plus className="w-4 h-4" /> Post a Project Brief
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredTalents.map(talent => (
                      <div
                        key={talent.id}
                        className="p-4 rounded-[var(--radius-lg)] cursor-pointer hover:scale-[1.01] transition-transform"
                        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-card)" }}
                        onClick={() => { window.open(`/${talent.id}?role=client`, "_blank"); }}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <Avatar className="w-12 h-12 text-base" background="var(--color-accent-glow)" color="var(--color-accent)">
                            {talent.avatar}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>{talent.name}</span>
                              {talent.verified && <Shield className="w-3.5 h-3.5" style={{ color: "var(--color-success)" }} />}
                            </div>
                            <div className="text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>{talent.role} · {talent.location}</div>
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="w-3 h-3 fill-current" style={{ color: "var(--color-gold)" }} />
                              <span className="text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>{talent.rating} ({talent.reviews})</span>
                            </div>
                          </div>
                          <button
                            aria-label={shortlist.includes(talent.id) ? `Remove ${talent.name} from shortlist` : `Shortlist ${talent.name}`}
                            className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                            style={{ background: shortlist.includes(talent.id) ? "var(--color-accent-glow)" : "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}
                            onClick={e => { e.stopPropagation(); toggleShortlist(talent.id); }}
                          >
                            <Star className={`w-4 h-4 ${shortlist.includes(talent.id) ? "fill-current" : ""}`} style={{ color: shortlist.includes(talent.id) ? "var(--color-accent)" : "var(--color-text-secondary)" }} />
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {talent.tags.map(tag => (
                            <Badge key={tag} tone="neutral" size="sm">{tag}</Badge>
                          ))}
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-display text-base tnum" style={{ color: "var(--color-accent)" }}>{talent.price}</span>
                            <span className="text-xs font-body ml-1" style={{ color: "var(--color-text-tertiary)" }}>/ booking</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: talent.available ? "var(--color-success)" : "var(--color-text-tertiary)" }} />
                            <span className="text-xs font-body" style={{ color: talent.available ? "var(--color-success)" : "var(--color-text-tertiary)" }}>
                              {talent.available ? "Available" : "Booked"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Projects Tab ── */}
            {activeTab === "projects" && (
              <motion.div key="projects" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {selectedProjectDetail ? (() => {
                  const currentStatus = (projectStateOverrides[selectedProjectDetail.id] || selectedProjectDetail.status).toLowerCase();
                  const projectDetails = { ...getProjectDetails(selectedProjectDetail), ...(projectOverridesInfo[selectedProjectDetail.id] || {}) };
                  const effectiveSynopsis = projectDetails.description;
                  const effectiveScript = projectDetails.scriptSample;
                  const effectiveDeliverables = projectDetails.deliverables;
                  const effectiveAssets = projectDetails.assets;
                  const effectiveLocation = projectDetails.location;
                  const effectiveTimeline = projectDetails.timeline;
                  const applicantCapNumber = selectedProjectDetail.applicantCap || 10;
                  const applicantCountNumber = currentStatus === "draft" ? 0 : (applicants.length || selectedProjectDetail.applicants || 0);
                  const capPercentage = currentStatus === "draft" ? 0 : currentStatus === "in_progress" || currentStatus === "review" || currentStatus === "completed" ? 100 : Math.min(100, Math.round((applicantCountNumber / applicantCapNumber) * 100));

                  const filteredApplicants = applicants.filter((app) => {
                    if (applicantFilterTab === "shortlisted") return app.status === "SHORTLISTED";
                    if (applicantFilterTab === "selected") return app.status === "SELECTED";
                    if (applicantFilterTab === "applied") return app.status === "APPLIED";
                    if (applicantFilterTab === "rejected") return app.status === "REJECTED";
                    return true;
                  }).filter((app) => {
                    if (!applicantSearchQuery.trim()) return true;
                    const q = applicantSearchQuery.toLowerCase();
                    return (
                      app.creator.name.toLowerCase().includes(q) ||
                      app.creator.role.toLowerCase().includes(q) ||
                      app.creator.location.toLowerCase().includes(q) ||
                      (app.pitch && app.pitch.toLowerCase().includes(q))
                    );
                  });

                  const selectedHiredPerformer = applicants.find((a) => a.status === "SELECTED") || (currentStatus === "in_progress" || currentStatus === "review" || currentStatus === "completed" ? applicants[0] : null);

                  const statusTone =
                    currentStatus === "active"
                      ? "success"
                      : currentStatus === "in_progress"
                      ? "accent"
                      : currentStatus === "review" || currentStatus === "in_review"
                      ? "warning"
                      : currentStatus === "completed"
                      ? "success"
                      : "neutral";

                  const statusLabel =
                    currentStatus === "active"
                      ? "Active · Accepting Pitches"
                      : currentStatus === "in_progress"
                      ? "In Progress · Hired"
                      : currentStatus === "review" || currentStatus === "in_review"
                      ? "Under Review · Files Submitted"
                      : currentStatus === "completed"
                      ? "Completed & Settled"
                      : currentStatus === "closed"
                      ? "Applications Closed"
                      : "Draft";

                  return (
                    /* ── Dedicated Project Management & Details Page (Client POV) ── */
                    <div className="space-y-6">
                      {/* Top Bar: Back link & State Switcher Preview */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2 border-b min-w-0" style={{ borderColor: "var(--color-hairline)" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedProjectDetail(null)}
                          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold font-body py-1.5 px-3 -ml-2 rounded-xl transition-all hover:bg-[var(--color-bg-elevated)] w-fit"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Back to My Projects</span>
                        </button>

                        <div className="flex items-center gap-2.5 max-w-full overflow-x-auto no-scrollbar">
                          {/* Interactive State Previewer */}
                          <div
                            className="inline-flex items-center gap-1 p-1 rounded-xl border text-[11px] font-body shrink-0"
                            style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-border-default)" }}
                          >
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 shrink-0" style={{ color: "var(--color-text-tertiary)" }}>
                              State:
                            </span>
                            {[
                              { id: "draft", label: "Draft" },
                              { id: "active", label: "Active" },
                              { id: "in_progress", label: "In Progress" },
                              { id: "review", label: "Review" },
                              { id: "completed", label: "Completed" },
                              { id: "closed", label: "Closed" },
                            ].map((st) => (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => {
                                  setProjectStateOverrides((prev) => ({ ...prev, [selectedProjectDetail.id]: st.id }));
                                  if (st.id === "in_progress" || st.id === "review" || st.id === "completed") {
                                    setApplicants((prev) => {
                                      if (prev.some((a) => a.status === "SELECTED")) return prev;
                                      if (prev.length > 0) return [{ ...prev[0], status: "SELECTED" }, ...prev.slice(1)];
                                      return prev;
                                    });
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                                  currentStatus === st.id
                                    ? st.id === "draft"
                                      ? "bg-zinc-700 text-white shadow-sm"
                                      : st.id === "active"
                                      ? "bg-emerald-600 text-white shadow-sm"
                                      : st.id === "in_progress"
                                      ? "bg-[#7C3AED] text-white shadow-sm"
                                      : st.id === "review"
                                      ? "bg-amber-600 text-white shadow-sm"
                                      : st.id === "completed"
                                      ? "bg-emerald-600 text-white shadow-sm"
                                      : "bg-zinc-600 text-white shadow-sm"
                                    : "hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]"
                                }`}
                              >
                                {st.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Project Header Banner (Clean editorial style) */}
                      <div
                        className="p-6 sm:p-8 rounded-3xl border"
                        style={{
                          background: "var(--color-bg-surface)",
                          borderColor: "var(--color-border-default)",
                          boxShadow: "var(--shadow-card)",
                        }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-tertiary)" }}>
                              {selectedProjectDetail.id}
                            </span>
                            <Badge tone="accent" size="sm">
                              {selectedProjectDetail.niche}
                            </Badge>
                            <Badge tone="neutral" size="sm">
                              {(selectedProjectDetail as any).projectType || "Commercial / Brief"}
                            </Badge>
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                                currentStatus === "draft"
                                  ? "text-zinc-400 bg-zinc-500/10 border-zinc-500/20"
                                  : currentStatus === "in_progress"
                                  ? "text-purple-400 bg-purple-500/10 border-purple-500/20"
                                  : currentStatus === "review"
                                  ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                                  : currentStatus === "completed"
                                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                  : currentStatus === "closed"
                                  ? "text-zinc-400 bg-zinc-500/10 border-zinc-500/20"
                                  : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                              }`}
                            >
                              {currentStatus === "draft" ? (
                                <>
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Draft Brief · Unfunded</span>
                                </>
                              ) : currentStatus === "in_progress" ? (
                                <>
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Escrow Locked · In Production</span>
                                </>
                              ) : currentStatus === "review" ? (
                                <>
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>48h Inspection Timer Active</span>
                                </>
                              ) : currentStatus === "completed" ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Escrow Disbursed · Completed</span>
                                </>
                              ) : currentStatus === "closed" ? (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Applications Paused · Closed</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>100% Escrow Funded · Live Casting</span>
                                </>
                              )}
                            </span>
                          </div>

                          {currentStatus === "draft" && (
                            <button
                              type="button"
                              onClick={() => navigate(`/brief?id=${selectedProjectDetail.id}`)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold font-body py-1.5 px-3 rounded-xl border transition-all hover:bg-[var(--color-bg-elevated)] w-fit whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
                              style={{ borderColor: "var(--color-border-default)", color: "var(--color-accent)" }}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Resume Draft Stepper</span>
                            </button>
                          )}
                        </div>

                        <h1
                          className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-4"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {selectedProjectDetail.name}
                        </h1>

                        <div className="flex items-center gap-4 sm:gap-6 flex-wrap text-xs sm:text-sm font-body" style={{ color: "var(--color-text-secondary)" }}>
                          <div className="flex items-center gap-1.5">
                            {(!projectDetails.location || projectDetails.location.toLowerCase().includes("remote") || projectDetails.location.toLowerCase().includes("online")) ? (
                              <Globe className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                            ) : (
                              <MapPin className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                            )}
                            <span>{projectDetails.location}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                            <span>
                              {currentStatus === "draft"
                                ? "Opens upon publishing"
                                : currentStatus === "in_progress"
                                ? "Delivery due in 4 days"
                                : currentStatus === "review"
                                ? "48h review countdown"
                                : currentStatus === "completed"
                                ? "Delivery completed"
                                : currentStatus === "closed"
                                ? "Applications closed"
                                : projectDetails.timeline}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                            <span>
                              {currentStatus === "draft"
                                ? `Target: ${applicantCapNumber} performers`
                                : currentStatus === "in_progress"
                                ? "1 performer contracted"
                                : currentStatus === "review"
                                ? "1 performer submitted"
                                : currentStatus === "completed"
                                ? "1 performer completed"
                                : `${applicantCountNumber} / ${applicantCapNumber} applicants filled`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                            <span>
                              {currentStatus === "draft"
                                ? `Draft saved ${selectedProjectDetail.posted}`
                                : `Posted ${selectedProjectDetail.posted}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ── Guided Draft Stepper (Direct Stepper Resume) ── */}
                      {currentStatus === "draft" && (
                        <div
                          className="p-5 sm:p-6 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          style={{
                            background: "var(--color-bg-surface)",
                            borderColor: "var(--color-border-default)",
                            boxShadow: "var(--shadow-card)",
                          }}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)] font-body">
                                Draft Setup Stepper · Continuing from where you left off
                              </span>
                            </div>
                            <h2 className="text-base sm:text-lg font-bold font-display" style={{ color: "var(--color-text-primary)" }}>
                              Complete project brief sections in the stepper before publishing
                            </h2>
                            <p className="text-xs font-body max-w-xl" style={{ color: "var(--color-text-secondary)" }}>
                              Resume the normal create project flow prefilled with your saved data (Step {selectedProjectDetail.draftStep || 3} of 5) to finalize details, audition sides, and escrow terms.
                            </p>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                            <Button
                              variant="secondary"
                              className="flex-1 sm:flex-initial h-10 px-4 text-xs font-semibold gap-1.5 whitespace-nowrap cursor-pointer justify-center"
                              onClick={() => navigate(`/brief?id=${selectedProjectDetail.id}`)}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Continue Draft Stepper →</span>
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 sm:flex-initial h-10 px-4 text-xs font-semibold whitespace-nowrap shadow-sm gap-1.5 cursor-pointer justify-center"
                              onClick={() => handleOpenPublishEscrow(selectedProjectDetail)}
                            >
                              <Sparkles className="w-3.5 h-3.5 shrink-0" />
                              <span>Publish &amp; Fund Escrow</span>
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Airbnb / Binance / Upwork Segmented Tabs */}
                      <div
                        className="flex items-center gap-1 p-1 rounded-xl border overflow-x-auto no-scrollbar shadow-2xs"
                        style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-border-default)" }}
                      >
                        {[
                          {
                            id: "applicants",
                            label: "Applicants & Casting",
                            icon: Users,
                            badge: currentStatus !== "draft" ? `${applicants.length}` : "Draft",
                          },
                          { id: "overview", label: "Overview & Brief", icon: FileText },
                          { id: "requirements", label: "Roles & Requirements", icon: CheckCircle2 },
                          { id: "sides", label: "Script & Materials", icon: Layers },
                          { id: "escrow", label: "Escrow & Protection", icon: ShieldCheck },
                        ].map((tab) => {
                          const Icon = tab.icon;
                          const isActive = clientProjectTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setClientProjectTab(tab.id as any)}
                              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                                isActive
                                  ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] font-semibold shadow-xs"
                                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]/50"
                              }`}
                            >
                              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)]"}`} />
                              <span>{tab.label}</span>
                              {tab.badge && (
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    tab.id === "applicants" && currentStatus !== "draft" && applicants.length > 0
                                      ? "bg-[var(--color-accent)] text-white shadow-2xs"
                                      : "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-hairline)]"
                                  }`}
                                >
                                  {tab.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Two-Column Grid: Left (8 cols) Information & Applicants, Right (4 cols) Sticky Actions */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                        {/* ── Left Column: Information & Applicants ── */}
                        <div className="lg:col-span-7 xl:col-span-8 space-y-6">

                          {/* ── Tab 1: Applicants & Casting Pipeline ── */}
                          {clientProjectTab === "applicants" && (
                            <motion.div
                              key="tab-applicants"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.15 }}
                              className="space-y-6"
                            >
                              <div
                                id="applicant-pipeline-section"
                                className="p-6 sm:p-7 rounded-3xl border space-y-5"
                                style={{
                                  background: "var(--color-bg-surface)",
                                  borderColor: "var(--color-border-default)",
                                }}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div>
                                    <h2 className="font-display text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                                      Applicant Pipeline &amp; Casting {currentStatus !== "draft" ? `(${applicants.length})` : ""}
                                    </h2>
                                    <p className="text-xs font-body mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                                      {currentStatus === "draft"
                                        ? "Casting submissions will appear here once this brief is published to performers."
                                        : "Review submissions, shortlist favorites, and hire performers with escrow protection."}
                                    </p>
                                  </div>

                                  {currentStatus !== "draft" && (
                                    <div className="relative w-full sm:w-56">
                                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-tertiary)" }} />
                                      <input
                                        type="text"
                                        value={applicantSearchQuery}
                                        onChange={(e) => setApplicantSearchQuery(e.target.value)}
                                        placeholder="Search applicants..."
                                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs font-body outline-none"
                                        style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-border-default)", color: "var(--color-text-primary)" }}
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* State Specific Spotlight Banner or Inactive Draft Mode */}
                                {currentStatus === "draft" ? (
                                  <div className="text-center py-12 px-6 rounded-3xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] relative overflow-hidden">
                                    <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-md bg-[var(--color-accent-soft)] text-[var(--color-accent)] ring-4 ring-purple-500/10">
                                      <FileText className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-base sm:text-lg font-bold font-display" style={{ color: "var(--color-text-primary)" }}>
                                      Casting Pipeline Inactive
                                    </h3>
                                    <p className="text-xs sm:text-sm font-body text-[var(--color-text-secondary)] max-w-md mx-auto mt-1.5 mb-5 leading-relaxed">
                                      This project brief is saved as a private draft and is not visible in performer discovery. Publish and fund escrow to start receiving audition pitches.
                                    </p>
                                    <Button
                                      className="h-10 px-6 text-xs font-bold gap-2 whitespace-nowrap shadow-md shadow-purple-500/20 mx-auto"
                                      onClick={() => handleOpenPublishEscrow(selectedProjectDetail)}
                                    >
                                      <Sparkles className="w-4 h-4 shrink-0" />
                                      <span>Publish &amp; Fund Escrow</span>
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    {currentStatus === "in_progress" && selectedHiredPerformer && (
                                      <div
                                        className="p-4 sm:p-5 rounded-2xl border space-y-3"
                                        style={{ background: "rgba(124, 58, 237, 0.06)", borderColor: "rgba(124, 58, 237, 0.25)" }}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#7C3AED]">
                                            <Sparkles className="w-3.5 h-3.5 shrink-0" /> Hired Performer in Production
                                          </span>
                                          <Badge tone="accent" size="sm">Active Contract</Badge>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                          <div className="flex items-center gap-3">
                                            <Avatar className="w-10 h-10 text-sm" background="var(--color-accent-glow)" color="var(--color-accent)">
                                              {selectedHiredPerformer.creator.avatar}
                                            </Avatar>
                                            <div>
                                              <div className="flex items-center gap-1.5 font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>
                                                <span>{selectedHiredPerformer.creator.name}</span>
                                                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                              </div>
                                              <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                                                {selectedHiredPerformer.creator.role} · {selectedHiredPerformer.creator.location}
                                              </div>
                                            </div>
                                          </div>

                                          <Button
                                            className="h-9 px-4 text-xs font-semibold gap-1.5 whitespace-nowrap"
                                            onClick={() => navigate("/order/ORD-001?role=client")}
                                          >
                                            <span>Open Order Room</span>
                                            <ChevronRight className="w-4 h-4 ml-0.5 shrink-0" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}

                                    {currentStatus === "review" && (
                                      <div
                                        className="p-4 sm:p-5 rounded-2xl border space-y-2"
                                        style={{ background: "rgba(245, 158, 11, 0.08)", borderColor: "rgba(245, 158, 11, 0.3)" }}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                            <AlertCircle className="w-4 h-4 shrink-0" /> Deliverables Ready for Inspection
                                          </span>
                                          <span className="text-xs font-mono font-semibold text-amber-700 dark:text-amber-300">
                                            ⏱️ 41h : 22m auto-release
                                          </span>
                                        </div>
                                        <p className="text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>
                                          Final broadcast audio master WAV files were uploaded by the performer. Inspect files in the Order Room to release payment.
                                        </p>
                                        <Button
                                          className="h-8 px-3 text-xs font-semibold gap-1.5 mt-1 whitespace-nowrap"
                                          onClick={() => navigate("/order/ORD-001?role=client")}
                                        >
                                          <span>Inspect in Order Room</span>
                                          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                                        </Button>
                                      </div>
                                    )}

                                    {currentStatus === "completed" && (
                                      <div
                                        className="p-4 sm:p-5 rounded-2xl border space-y-2"
                                        style={{ background: "rgba(16, 185, 129, 0.08)", borderColor: "rgba(16, 185, 129, 0.3)" }}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 className="w-4 h-4 shrink-0" /> Collaboration Completed
                                          </span>
                                          <span className="text-xs font-semibold text-amber-500">★ 5.0 Rating</span>
                                        </div>
                                        <p className="text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>
                                          All milestones approved and escrow of {selectedProjectDetail.budget} disbursed. Order closed successfully.
                                        </p>
                                      </div>
                                    )}

                                    {/* Filter Chips Bar */}
                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                                      {[
                                        { id: "all", label: `All (${applicants.length})` },
                                        { id: "shortlisted", label: `Shortlisted (${applicants.filter((a) => a.status === "SHORTLISTED").length})` },
                                        { id: "selected", label: `Selected (${applicants.filter((a) => a.status === "SELECTED").length})` },
                                        { id: "applied", label: `Applied (${applicants.filter((a) => a.status === "APPLIED").length})` },
                                        { id: "rejected", label: `Rejected (${applicants.filter((a) => a.status === "REJECTED").length})` },
                                      ].map((tab) => (
                                        <button
                                          key={tab.id}
                                          type="button"
                                          onClick={() => setApplicantFilterTab(tab.id as any)}
                                          className={`px-3 py-1 rounded-xl text-xs font-semibold font-body whitespace-nowrap transition-all ${
                                            applicantFilterTab === tab.id
                                              ? "bg-[#7C3AED] text-white shadow-sm"
                                              : "border text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]"
                                          }`}
                                          style={{
                                            borderColor: applicantFilterTab === tab.id ? "transparent" : "var(--color-hairline)",
                                          }}
                                        >
                                          {tab.label}
                                        </button>
                                      ))}
                                    </div>

                                    {/* Applicants Feed */}
                                    {loadingApplicants ? (
                                      <div className="py-8 text-center text-sm font-body" style={{ color: "var(--color-text-tertiary)" }}>
                                        Loading applicants…
                                      </div>
                                    ) : filteredApplicants.length === 0 ? (
                                      <div className="py-8 text-center text-sm font-body" style={{ color: "var(--color-text-tertiary)" }}>
                                        No candidates match the current filter.
                                      </div>
                                    ) : (
                                      <div className="space-y-4">
                                        {filteredApplicants.map((app) => (
                                          <div
                                            key={app.applicationId}
                                            className="p-4 sm:p-5 rounded-2xl border transition-all"
                                            style={{
                                              background: "var(--color-bg-elevated)",
                                              borderColor: app.status === "SELECTED" ? "rgba(124, 58, 237, 0.4)" : "var(--color-hairline)",
                                            }}
                                          >
                                            <div className="flex items-start justify-between gap-3 mb-2.5">
                                              <div className="flex items-center gap-3">
                                                <Avatar className="w-11 h-11 text-sm shrink-0" background="var(--color-accent-glow)" color="var(--color-accent)">
                                                  {app.creator.avatar}
                                                </Avatar>
                                                <div>
                                                  <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>
                                                      {app.creator.name}
                                                    </span>
                                                    {app.creator.verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                                  </div>
                                                  <div className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>
                                                    {app.creator.role} · {app.creator.location}
                                                    {app.creator.price && ` · ${app.creator.price}`}
                                                  </div>
                                                </div>
                                              </div>

                                              <Badge
                                                tone={app.status === "SELECTED" ? "success" : app.status === "SHORTLISTED" ? "accent" : app.status === "REJECTED" ? "error" : "neutral"}
                                                size="sm"
                                              >
                                                {APPLICANT_STATUS_LABEL[app.status] ?? app.status}
                                              </Badge>
                                            </div>

                                            {app.pitch && (
                                              <div
                                                className="text-xs font-body italic my-3 p-3 rounded-xl border leading-relaxed"
                                                style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-hairline)", color: "var(--color-text-secondary)" }}
                                              >
                                                "{app.pitch}"
                                              </div>
                                            )}

                                            {/* Action Bar */}
                                            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t" style={{ borderColor: "var(--color-hairline)" }}>
                                              <button
                                                type="button"
                                                onClick={() => viewTalentProfile(app.creator, app)}
                                                className="text-xs font-semibold font-body hover:underline flex items-center gap-1.5 text-[var(--color-accent)] whitespace-nowrap cursor-pointer"
                                              >
                                                <span>View Profile &amp; Reels</span>
                                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                              </button>

                                              <div className="flex items-center gap-2">
                                                {currentStatus === "active" ? (
                                                  <>
                                                    {app.status === "APPLIED" && (
                                                      <Button
                                                        variant="secondary"
                                                        className="h-8 px-3 text-xs whitespace-nowrap"
                                                        onClick={() => handleShortlist(app.applicationId)}
                                                      >
                                                        Shortlist
                                                      </Button>
                                                    )}
                                                    {app.status === "REJECTED" ? (
                                                      <Button
                                                        variant="secondary"
                                                        className="h-8 px-3 text-xs whitespace-nowrap"
                                                        onClick={() => handleShortlist(app.applicationId)}
                                                      >
                                                        Move to Shortlist
                                                      </Button>
                                                    ) : (
                                                      app.status !== "SELECTED" && (
                                                        <Button
                                                          variant="secondary"
                                                          className="h-8 px-3 text-xs text-rose-500 border-rose-500/20 hover:bg-rose-500/10 whitespace-nowrap"
                                                          onClick={() => handleRejectApplicant(app.applicationId)}
                                                        >
                                                          Reject
                                                        </Button>
                                                      )
                                                    )}
                                                    {app.status === "SELECTED" ? (
                                                      <Button
                                                        className="h-8 px-3 text-xs font-semibold gap-1 whitespace-nowrap"
                                                        onClick={() => navigate("/order/ORD-001?role=client")}
                                                      >
                                                        <span>Open Order Room</span>
                                                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                                                      </Button>
                                                    ) : (
                                                      <Button
                                                        className="h-8 px-3 text-xs font-semibold whitespace-nowrap"
                                                        onClick={() => handleSelectAndHireApplicant(app)}
                                                      >
                                                        Select / Hire
                                                      </Button>
                                                    )}
                                                  </>
                                                ) : (
                                                  app.status === "SELECTED" ? (
                                                    <Button
                                                      className="h-8 px-3 text-xs font-semibold gap-1 whitespace-nowrap"
                                                      onClick={() => navigate("/order/ORD-001?role=client")}
                                                    >
                                                      <span>Open Order Room</span>
                                                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                                                    </Button>
                                                  ) : (
                                                    <span
                                                      className="text-xs px-2.5 py-1 rounded-lg font-body"
                                                      style={{ background: "var(--color-bg-surface)", color: "var(--color-text-tertiary)" }}
                                                    >
                                                      Casting Concluded
                                                    </span>
                                                  )
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </motion.div>
                          )}

                          {/* ── Tab 2: Overview & Creative Brief ── */}
                          {clientProjectTab === "overview" && (
                            <motion.div
                              key="tab-overview"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.15 }}
                              className="space-y-6"
                            >
                              {/* 1. Creative Brief & Synopsis (Inline Editable for Draft) */}
                              <div
                                id="section-overview"
                                className="p-6 sm:p-7 rounded-3xl border space-y-4"
                                style={{
                                  background: "var(--color-bg-surface)",
                                  borderColor: "var(--color-border-default)",
                                }}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-[var(--color-accent)]" />
                                    <h2 className="font-display text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                                      Creative Brief &amp; Synopsis
                                    </h2>
                                  </div>
                                  {currentStatus === "draft" && (
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/brief?id=${selectedProjectDetail.id}&step=3`)}
                                      className="text-xs font-semibold text-[var(--color-accent)] hover:underline whitespace-nowrap cursor-pointer"
                                    >
                                      Edit in Stepper →
                                    </button>
                                  )}
                                </div>

                                <p className="text-sm font-body leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                                  {effectiveSynopsis}
                                </p>
                              </div>

                              {/* Project Scope & Production Format */}
                              <div
                                className="p-6 sm:p-7 rounded-3xl border space-y-4"
                                style={{
                                  background: "var(--color-bg-surface)",
                                  borderColor: "var(--color-border-default)",
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-[var(--color-accent)]" />
                                  <h2 className="font-display text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                                    Project Format &amp; Production Details
                                  </h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-body">
                                  <div className="p-3.5 rounded-2xl border space-y-1" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}>
                                    <span className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)] block">Project Format</span>
                                    <div className="flex items-center gap-2 font-medium" style={{ color: "var(--color-text-primary)" }}>
                                      {isProjectOnline(selectedProjectDetail) ? (
                                        <>
                                          <Video className="w-4 h-4 text-sky-500" />
                                          <span>Online / Remote (Digital Deliverables)</span>
                                        </>
                                      ) : (
                                        <>
                                          <MapPin className="w-4 h-4 text-amber-500" />
                                          <span>On-site / In-person Session</span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div className="p-3.5 rounded-2xl border space-y-1" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}>
                                    <span className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)] block">Location &amp; Venue</span>
                                    <div className="flex items-center gap-2 font-medium" style={{ color: "var(--color-text-primary)" }}>
                                      <MapPin className="w-4 h-4 text-[var(--color-accent)]" />
                                      <span>{effectiveLocation || (isProjectOnline(selectedProjectDetail) ? "Remote Recording Session" : "Lagos, Nigeria")}</span>
                                    </div>
                                  </div>

                                  <div className="p-3.5 rounded-2xl border space-y-1" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}>
                                    <span className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)] block">Production Timeline</span>
                                    <div className="flex items-center gap-2 font-medium" style={{ color: "var(--color-text-primary)" }}>
                                      <Clock className="w-4 h-4 text-[var(--color-accent)]" />
                                      <span>{effectiveTimeline || "Auditions open · Production timeline agreed upon hire"}</span>
                                    </div>
                                  </div>

                                  <div className="p-3.5 rounded-2xl border space-y-1" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}>
                                    <span className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)] block">Escrow Settlement</span>
                                    <div className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
                                      <Lock className="w-4 h-4" />
                                      <span>100% Upfront Paystack Escrow ({selectedProjectDetail.budget})</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {/* ── Tab 3: Roles & Requirements ── */}
                          {clientProjectTab === "requirements" && (
                            <motion.div
                              key="tab-requirements"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.15 }}
                              className="space-y-6"
                            >
                              <div
                                id="section-roles"
                                className="p-6 sm:p-7 rounded-3xl border space-y-5"
                                style={{
                                  background: "var(--color-bg-surface)",
                                  borderColor: "var(--color-border-default)",
                                }}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-[var(--color-accent)]" />
                                    <h2 className="font-display text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                                      Role &amp; Craft Requirements
                                    </h2>
                                  </div>
                                  {currentStatus === "draft" && (
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/brief?id=${selectedProjectDetail.id}&step=2`)}
                                      className="text-xs font-semibold text-[var(--color-accent)] hover:underline whitespace-nowrap cursor-pointer"
                                    >
                                      Edit in Stepper →
                                    </button>
                                  )}
                                </div>

                                <div>
                                  <div className="text-xs font-semibold font-body tracking-normal mb-2.5" style={{ color: "var(--color-text-tertiary)" }}>
                                    Target craft niches
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {projectDetails.nicheReq.map((n) => (
                                      <Badge key={n} tone="neutral" size="md" className="capitalize">
                                        {n.replace(/_/g, " ")}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>

                                <div className="pt-2 border-t" style={{ borderColor: "var(--color-hairline)" }}>
                                  <div className="text-xs font-semibold font-body tracking-normal mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                                    Performer guidelines &amp; quality standards
                                  </div>
                                  <p className="text-sm font-body leading-relaxed mb-3" style={{ color: "var(--color-text-secondary)" }}>
                                    {projectDetails.additionalNotes}
                                  </p>
                                  <ul className="text-sm font-body space-y-2 pl-4 list-disc" style={{ color: "var(--color-text-secondary)" }}>
                                    <li>Must have verified profile and demo samples matching requested crafts.</li>
                                    <li>Access to professional recording acoustics or studio space.</li>
                                    <li>Prompt communication and adherence to production delivery milestones.</li>
                                  </ul>
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {/* ── Tab 4: Script & Materials (Sides + Attached Reference Files) ── */}
                          {clientProjectTab === "sides" && (
                            <motion.div
                              key="tab-sides"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.15 }}
                              className="space-y-6"
                            >
                              {/* Audition Sides & Script Excerpt */}
                              <div
                                id="section-sides"
                                className="p-6 sm:p-7 rounded-3xl border space-y-4"
                                style={{
                                  background: "var(--color-bg-surface)",
                                  borderColor: "var(--color-border-default)",
                                }}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-[var(--color-accent)]" />
                                    <h2 className="font-display text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                                      Audition Sides &amp; Script Excerpt
                                    </h2>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(effectiveScript);
                                        setCopiedScript(true);
                                        setTimeout(() => setCopiedScript(false), 2000);
                                      }}
                                      className="h-8 px-3 rounded-xl border text-xs font-semibold font-body flex items-center gap-1.5 transition-all hover:bg-[var(--color-bg-elevated)] whitespace-nowrap cursor-pointer"
                                      style={{
                                        borderColor: "var(--color-border-default)",
                                        color: copiedScript ? "var(--color-success)" : "var(--color-text-secondary)",
                                      }}
                                    >
                                      {copiedScript ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                          <span className="text-emerald-500 whitespace-nowrap">Copied!</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3.5 h-3.5 shrink-0" />
                                          <span className="whitespace-nowrap">Copy Script</span>
                                        </>
                                      )}
                                    </button>
                                    {currentStatus === "draft" && (
                                      <button
                                        type="button"
                                        onClick={() => navigate(`/brief?id=${selectedProjectDetail.id}&step=3`)}
                                        className="text-xs font-semibold text-[var(--color-accent)] hover:underline whitespace-nowrap cursor-pointer"
                                      >
                                        Edit in Stepper →
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <p className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>
                                  This excerpt is presented to auditioning performers for their sample take or pitch video:
                                </p>

                                <div
                                  className="p-5 sm:p-6 rounded-2xl border font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap select-text border-l-4 border-l-[var(--color-accent)] relative overflow-hidden bg-slate-950 text-slate-100 shadow-inner"
                                  style={{
                                    borderColor: "var(--color-hairline)",
                                  }}
                                >
                                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-purple-300/70 mb-3 pb-2 border-b border-white/10 select-none">
                                    <span>Sides // Script Excerpt</span>
                                    <span>48kHz Studio Mic Take</span>
                                  </div>
                                  {effectiveScript}
                                </div>
                              </div>

                              {/* Project Assets & Reference Files */}
                              <div
                                id="section-assets"
                                className="p-6 sm:p-7 rounded-3xl border space-y-4"
                                style={{
                                  background: "var(--color-bg-surface)",
                                  borderColor: "var(--color-border-default)",
                                }}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <Folder className="w-4 h-4 text-[var(--color-accent)]" />
                                    <h2 className="font-display text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                                      Project Assets &amp; Reference Files
                                    </h2>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-tertiary)" }}>
                                      {effectiveAssets.length} files attached
                                    </span>
                                    {currentStatus === "draft" && (
                                      <button
                                        type="button"
                                        onClick={() => navigate(`/brief?id=${selectedProjectDetail.id}&step=3`)}
                                        className="text-xs font-semibold text-[var(--color-accent)] hover:underline whitespace-nowrap cursor-pointer"
                                      >
                                        Edit in Stepper →
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-2.5">
                                    {effectiveAssets.map((asset, idx) => (
                                      <div
                                        key={idx}
                                        className="p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-body bg-[var(--color-bg-elevated)] hover:border-[var(--color-accent)]/50 transition-all group"
                                        style={{ borderColor: "var(--color-hairline)" }}
                                      >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[var(--color-accent-soft)] text-[var(--color-accent)] group-hover:scale-105 transition-transform">
                                            <FileText className="w-5 h-5" />
                                          </div>
                                          <div className="truncate">
                                            <div className="font-semibold text-xs sm:text-sm truncate text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                                              {asset.name}
                                            </div>
                                            <div className="text-[11px] font-mono text-[var(--color-text-tertiary)] mt-0.5">
                                              {asset.type} · {asset.size}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => alert(`Previewing ${asset.name}`)}
                                            className="px-3 py-1.5 rounded-xl border text-xs font-semibold hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-accent)] transition-all whitespace-nowrap shadow-2xs cursor-pointer"
                                            style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-secondary)" }}
                                          >
                                            Preview
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => alert(`Downloading ${asset.name} (${asset.size})`)}
                                            className="p-2 rounded-xl border hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-accent)] transition-all whitespace-nowrap shadow-2xs cursor-pointer"
                                            style={{ borderColor: "var(--color-border-default)", color: "var(--color-accent)" }}
                                            title="Download asset"
                                          >
                                            <Download className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                              </div>
                            </motion.div>
                          )}

                          {/* ── Tab 5: Escrow & Protection ── */}
                          {clientProjectTab === "escrow" && (
                            <motion.div
                              key="tab-escrow"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.15 }}
                              className="space-y-6"
                            >
                              <div
                                className="p-6 sm:p-7 rounded-3xl border space-y-4"
                                style={{
                                  background: "var(--color-bg-surface)",
                                  borderColor: "var(--color-border-default)",
                                }}
                              >
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-2">
                                <Lock className="w-4 h-4 text-emerald-500" />
                                <h3 className="font-display text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                                  Escrow Protection &amp; Settlement Guarantee
                                </h3>
                              </div>
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Paystack Secured
                              </span>
                            </div>

                            <div className="divide-y divide-[var(--color-border-default)] border-t border-[var(--color-border-default)]">
                              {/* Pillar 1: 100% Escrow Protection */}
                              <div className="py-4 first:pt-3 last:pb-1 flex items-start gap-3.5 sm:gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                                  <Shield className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="font-display text-sm font-bold text-[var(--color-text-primary)]">
                                      1. 100% Escrow Protection
                                    </span>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      Funded Upfront
                                    </span>
                                  </div>
                                  <p className="text-xs sm:text-sm font-body leading-relaxed text-[var(--color-text-secondary)]">
                                    Your project budget is held safely in Paystack escrow. Performers are never paid until you inspect and approve the final deliverables.
                                  </p>
                                </div>
                              </div>

                              {/* Pillar 2: 48h Inspection Window */}
                              <div className="py-4 last:pb-1 flex items-start gap-3.5 sm:gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                                  <Clock className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="font-display text-sm font-bold text-[var(--color-text-primary)]">
                                      2. 48h Inspection Window
                                    </span>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      Review Guarantee
                                    </span>
                                  </div>
                                  <p className="text-xs sm:text-sm font-body leading-relaxed text-[var(--color-text-secondary)]">
                                    Upon deliverable submission, you have 48 hours to inspect high-resolution files, request milestone revisions, or verify broadcast quality.
                                  </p>
                                </div>
                              </div>

                              {/* Pillar 3: Milestone Release Control */}
                              <div className="py-4 last:pb-1 flex items-start gap-3.5 sm:gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                                  <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="font-display text-sm font-bold text-[var(--color-text-primary)]">
                                      3. Milestone Release Control
                                    </span>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      Direct Approval
                                    </span>
                                  </div>
                                  <p className="text-xs sm:text-sm font-body leading-relaxed text-[var(--color-text-secondary)]">
                                    Disbursement only triggers when you confirm satisfaction in the Order Room. In case of disputes, Monologg mediation protects your funds.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                        {/* ── Right Column: Sticky Compensation, Status & Action Sidebar ── */}
                        <div className="lg:col-span-5 xl:col-span-4">
                          <div
                            className="p-6 rounded-3xl border sticky top-6 space-y-5"
                            style={{
                              background: "var(--color-bg-surface)",
                              borderColor: "var(--color-border-default)",
                              boxShadow: "var(--shadow-card)",
                            }}
                          >
                            {/* Budget & Escrow Rate */}
                            <div>
                              <div className="text-xs uppercase font-semibold font-body tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>
                                Project Budget &amp; Escrow
                              </div>
                              <div className="flex items-baseline gap-2 mt-1">
                                <span className="font-display text-3xl font-bold font-mono text-[var(--color-accent)]">
                                  {selectedProjectDetail.budget}
                                </span>
                                <span className="text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>
                                  Fixed Escrow
                                </span>
                              </div>
                              <p className="text-xs font-body mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                                {currentStatus === "draft"
                                  ? "Escrow deposit reserved upon publishing"
                                  : "100% Escrow Funded · Zero talent deduction"}
                              </p>
                            </div>

                            {/* Applicant Capacity Tracker */}
                            <div
                              className="p-4 rounded-2xl border space-y-2.5"
                              style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}
                            >
                              <div className="flex items-center justify-between text-xs font-body">
                                <span style={{ color: "var(--color-text-secondary)" }}>Casting Capacity</span>
                                <span className="font-semibold font-mono" style={{ color: "var(--color-text-primary)" }}>
                                  {currentStatus === "draft"
                                    ? `Target: ${applicantCapNumber}`
                                    : currentStatus === "in_progress" || currentStatus === "review" || currentStatus === "completed"
                                    ? "1 / 1 filled"
                                    : `${applicantCountNumber} / ${applicantCapNumber} filled`}
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${capPercentage}%`,
                                    background: currentStatus === "active" || currentStatus === "in_progress" || currentStatus === "completed" ? "var(--color-accent)" : "var(--color-text-tertiary)",
                                  }}
                                />
                              </div>

                              <div className="flex items-center justify-between pt-1 text-[11px] font-body" style={{ color: "var(--color-text-tertiary)" }}>
                                <span>
                                  {currentStatus === "draft"
                                    ? "Submissions inactive (Draft)"
                                    : currentStatus === "closed"
                                    ? "Submissions paused"
                                    : currentStatus === "in_progress"
                                    ? "Contract active · In production"
                                    : currentStatus === "review"
                                    ? "Inspection countdown active"
                                    : currentStatus === "completed"
                                    ? "Project completed"
                                    : "Accepting pitches"}
                                </span>
                                {currentStatus === "active" ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setProjectStateOverrides((prev) => ({ ...prev, [selectedProjectDetail.id]: "closed" }));
                                      setProjects((prev) => prev.map((p) => p.id === selectedProjectDetail.id ? { ...p, status: "closed", applicationsOpen: false } : p));
                                    }}
                                    className="font-semibold text-rose-500 hover:underline whitespace-nowrap"
                                  >
                                    Pause Applications
                                  </button>
                                ) : currentStatus === "closed" ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setProjectStateOverrides((prev) => ({ ...prev, [selectedProjectDetail.id]: "active" }));
                                      setProjects((prev) => prev.map((p) => p.id === selectedProjectDetail.id ? { ...p, status: "active", applicationsOpen: true } : p));
                                    }}
                                    className="font-semibold text-emerald-500 hover:underline whitespace-nowrap"
                                  >
                                    Reopen
                                  </button>
                                ) : null}
                              </div>
                            </div>

                            {/* Dynamic State Action Center */}
                            <div
                              className="p-4 sm:p-5 rounded-2xl border space-y-3.5"
                              style={{
                                background:
                                  currentStatus === "in_progress"
                                    ? "rgba(124, 58, 237, 0.06)"
                                    : currentStatus === "review"
                                    ? "rgba(245, 158, 11, 0.08)"
                                    : currentStatus === "completed"
                                    ? "rgba(16, 185, 129, 0.08)"
                                    : "var(--color-bg-elevated)",
                                borderColor:
                                  currentStatus === "in_progress"
                                    ? "rgba(124, 58, 237, 0.25)"
                                    : currentStatus === "review"
                                    ? "rgba(245, 158, 11, 0.3)"
                                    : currentStatus === "completed"
                                    ? "rgba(16, 185, 129, 0.3)"
                                    : "var(--color-hairline)",
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider font-body" style={{ color: "var(--color-text-primary)" }}>
                                  Project Action Center
                                </span>
                                <Badge tone={statusTone} size="sm">
                                  {statusLabel}
                                </Badge>
                              </div>

                              {/* State 1: DRAFT */}
                              {currentStatus === "draft" && (
                                <div className="space-y-3">
                                  <p className="text-xs font-body leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                                    This brief is saved as a private draft. Publish it to Monologg discovery to notify verified performers.
                                  </p>
                                  <Button
                                    className="w-full h-11 text-xs font-bold gap-1.5 whitespace-nowrap bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-500/25"
                                    onClick={() => handleOpenPublishEscrow(selectedProjectDetail)}
                                  >
                                    <Sparkles className="w-4 h-4 shrink-0" />
                                    <span className="whitespace-nowrap">Publish &amp; Fund Escrow</span>
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    className="w-full h-9 text-xs font-semibold whitespace-nowrap shadow-2xs gap-1.5 cursor-pointer"
                                    onClick={() => navigate(`/brief?id=${selectedProjectDetail.id}`)}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Resume Draft in Stepper</span>
                                  </Button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setProjects((prev) => prev.filter((p) => p.id !== selectedProjectDetail.id));
                                      setSelectedProjectDetail(null);
                                    }}
                                    className="w-full text-center text-xs text-rose-500 hover:underline pt-1 font-body whitespace-nowrap cursor-pointer"
                                  >
                                    Discard Draft
                                  </button>
                                </div>
                              )}

                              {/* State 2: ACTIVE */}
                              {currentStatus === "active" && (
                                <div className="space-y-3">
                                  <p className="text-xs font-body leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                                    Casting call is live! Review audition takes and pitches in the applicant pipeline to select your performer.
                                  </p>
                                  <Button
                                    className="w-full h-10 text-xs font-semibold gap-1 whitespace-nowrap"
                                    onClick={() => {
                                      setClientProjectTab("applicants");
                                      const el = document.getElementById("applicant-pipeline-section");
                                      el?.scrollIntoView({ behavior: "smooth" });
                                    }}
                                  >
                                    Review Applicants ({applicants.length})
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    className="w-full h-9 text-xs whitespace-nowrap"
                                    onClick={() => {
                                      setProjectStateOverrides((prev) => ({ ...prev, [selectedProjectDetail.id]: "closed" }));
                                      setProjects((prev) => prev.map((p) => p.id === selectedProjectDetail.id ? { ...p, status: "closed", applicationsOpen: false } : p));
                                      setSelectedProjectDetail((prev) => prev ? { ...prev, status: "closed", applicationsOpen: false } : null);
                                    }}
                                  >
                                    Pause Applications
                                  </Button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(`${window.location.origin}/brief/${selectedProjectDetail.id}`);
                                      setCopiedShareLink(true);
                                      setTimeout(() => setCopiedShareLink(false), 2000);
                                    }}
                                    className="w-full text-center text-xs text-[var(--color-accent)] hover:underline pt-1 font-body flex items-center justify-center gap-1.5 whitespace-nowrap"
                                  >
                                    <Share2 className="w-3.5 h-3.5 shrink-0" />
                                    <span>{copiedShareLink ? "Link Copied!" : "Copy Casting Link"}</span>
                                  </button>
                                </div>
                              )}

                              {/* State 3: IN PROGRESS */}
                              {currentStatus === "in_progress" && (
                                <div className="space-y-3">
                                  <p className="text-xs font-body leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                                    Performer contracted and production is underway. Chat in real-time, inspect files, and approve milestones in the Order Room.
                                  </p>
                                  <Button
                                    className="w-full h-11 text-xs font-semibold gap-1.5 whitespace-nowrap"
                                    onClick={() => navigate("/order/ORD-001?role=client")}
                                  >
                                    <span>Open Order Room</span>
                                    <ChevronRight className="w-4 h-4 ml-1 shrink-0" />
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    className="w-full h-9 text-xs whitespace-nowrap"
                                    onClick={() => navigate("/order/ORD-001?role=client")}
                                  >
                                    Message Performer
                                  </Button>
                                </div>
                              )}

                              {/* State 4: REVIEW */}
                              {(currentStatus === "review" || currentStatus === "in_review") && (
                                <div className="space-y-3">
                                  <p className="text-xs font-body leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                                    The performer has submitted the final project assets. Review the deliverables before the 48-hour inspection countdown expires.
                                  </p>
                                  <Button
                                    className="w-full h-11 text-xs font-semibold gap-1.5 whitespace-nowrap"
                                    onClick={() => navigate("/order/ORD-001?role=client")}
                                  >
                                    <span>Inspect in Order Room</span>
                                    <ChevronRight className="w-4 h-4 ml-1 shrink-0" />
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    className="w-full h-9 text-xs whitespace-nowrap"
                                    onClick={() => navigate("/order/ORD-001?role=client")}
                                  >
                                    Request Revision
                                  </Button>
                                </div>
                              )}

                              {/* State 5: COMPLETED */}
                              {currentStatus === "completed" && (
                                <div className="space-y-3">
                                  <p className="text-xs font-body leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                                    All milestones approved and escrow of {selectedProjectDetail.budget} disbursed. Project concluded with 5.0 ★ rating.
                                  </p>
                                  <Button
                                    className="w-full h-10 text-xs font-semibold gap-1.5 whitespace-nowrap"
                                    onClick={() => navigate("/order/ORD-001?role=client")}
                                  >
                                    View Order Room
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    className="w-full h-9 text-xs whitespace-nowrap"
                                    onClick={() => navigate("/brief")}
                                  >
                                    Post Similar Brief
                                  </Button>
                                </div>
                              )}

                              {/* State 6: CLOSED */}
                              {currentStatus === "closed" && (
                                <div className="space-y-3">
                                  <p className="text-xs font-body leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                                    Applications for this project are currently paused. You can reopen submissions at any time to receive further pitches.
                                  </p>
                                  <Button
                                    className="w-full h-10 text-xs font-semibold gap-1.5 whitespace-nowrap"
                                    onClick={() => {
                                      setProjectStateOverrides((prev) => ({ ...prev, [selectedProjectDetail.id]: "active" }));
                                      setProjects((prev) => prev.map((p) => p.id === selectedProjectDetail.id ? { ...p, status: "active", applicationsOpen: true } : p));
                                      setSelectedProjectDetail((prev) => prev ? { ...prev, status: "active", applicationsOpen: true } : null);
                                    }}
                                  >
                                    Reopen Applications
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    className="w-full h-9 text-xs whitespace-nowrap"
                                    onClick={() => navigate("/brief")}
                                  >
                                    Post Similar Brief
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* Escrow Guarantee Footer Note */}
                            <div className="flex items-center justify-center gap-1.5 text-xs font-body text-emerald-600 dark:text-emerald-400 py-1">
                              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                              <span className="text-[11px] font-medium">100% Escrow Protected · 24/7 Casting Concierge</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  /* Standard Projects List */
                  <div>
                    <div className="flex items-center justify-between mb-4 lg:hidden">
                      <span className="text-xs font-medium font-body" style={{ color: "var(--color-text-secondary)" }}>
                        <span className="font-semibold text-[var(--color-text-primary)]">{effectiveProjects.length}</span>{" "}
                        {effectiveProjects.length === 1 ? "project brief" : "project briefs"}
                      </span>
                      <Button className="h-9 px-3.5 text-xs font-semibold gap-1.5" onClick={() => navigate("/brief")}>
                        <Plus className="w-4 h-4" /> Post Brief
                      </Button>
                    </div>

                    {effectiveProjects.length === 0 ? (
                      <div className="text-center py-16 px-6 rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-[var(--shadow-card)] flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center mb-4 text-[var(--color-accent)]">
                          <Briefcase className="w-8 h-8" />
                        </div>
                        <h3 className="font-display text-xl font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>No Projects Created Yet</h3>
                        <p className="text-sm font-body text-[var(--color-text-secondary)] max-w-md mb-6 leading-relaxed">
                          Post a project brief with your role requirements, budget, and timeline to start receiving pitches from verified performers.
                        </p>
                        <Button onClick={() => navigate("/brief")} className="gap-2">
                          <Plus className="w-4 h-4" /> Post Your First Project Brief
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {effectiveProjects.map(project => (
                        <div key={project.id} className="p-4 sm:p-5 rounded-[var(--radius-lg)]" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-card)" }}>
                          <div className="flex items-start justify-between gap-3 sm:gap-4 mb-3">
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-mono mb-1" style={{ color: "var(--color-text-tertiary)" }}>{project.id}</div>
                              <h3 className="text-base font-semibold font-body leading-snug" style={{ color: "var(--color-text-primary)" }}>{project.name}</h3>
                              <p className="text-xs sm:text-sm font-body mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                                {project.niche} · {project.status === "draft" ? `Draft saved ${project.posted}` : `Posted ${project.posted}`}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-display text-lg tnum" style={{ color: "var(--color-accent)" }}>{project.budget}</div>
                              <Badge tone={project.status === "active" ? "success" : project.status === "draft" ? "neutral" : "accent"} size="md">
                                {project.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--color-hairline)]">
                            <div className="flex items-center gap-2 min-w-0">
                              <Users className="w-4 h-4 shrink-0" style={{ color: "var(--color-text-tertiary)" }} />
                              <span className="text-xs sm:text-sm font-body" style={{ color: "var(--color-text-secondary)" }}>
                                {project.status === "draft"
                                  ? `Target: ${project.applicantCap || 10} performers · Inactive draft`
                                  : `${project.applicants}${project.applicantCap ? `/${project.applicantCap}` : ""} applicants${!project.applicationsOpen && project.status === "active" ? " · closed" : ""}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              {project.status === "draft" && (
                                <Button
                                  variant="secondary"
                                  className="flex-1 sm:flex-initial h-9 px-3 text-xs font-semibold gap-1.5 cursor-pointer justify-center"
                                  onClick={() => navigate(`/brief?id=${project.id}`)}
                                >
                                  <Edit3 className="w-3.5 h-3.5 shrink-0" />
                                  <span>Resume Draft</span>
                                </Button>
                              )}
                              <Button className="flex-1 sm:flex-initial h-9 px-4 text-xs font-semibold cursor-pointer justify-center" onClick={() => openProjectDetail(project)}>
                                View Project →
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => navigate("/brief")}
                        className="w-full p-5 rounded-[var(--radius-lg)] border-2 border-dashed flex items-center justify-center gap-2 text-sm font-medium font-body"
                        style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-tertiary)" }}
                      >
                        <Plus className="w-4 h-4" /> Post a new project
                      </button>
                    </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Orders Tab ── */}
            {activeTab === "orders" && (
              <motion.div key="orders" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {(() => {
                  const filteredOrders = effectiveOrders.filter((o) => {
                    if (!orderSearchQuery.trim()) return true;
                    const q = orderSearchQuery.toLowerCase();
                    return (
                      o.project.toLowerCase().includes(q) ||
                      o.counterpart.toLowerCase().includes(q) ||
                      o.id.toLowerCase().includes(q)
                    );
                  });

                  if (effectiveOrders.length === 0) {
                    return (
                      <div className="text-center py-16 px-6 rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-[var(--shadow-card)] flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center mb-4 text-[var(--color-accent)]">
                          <MessageSquare className="w-8 h-8" />
                        </div>
                        <h3 className="font-display text-xl font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>No Active Collaborations</h3>
                        <p className="text-sm font-body text-[var(--color-text-secondary)] max-w-md mb-6 leading-relaxed">
                          You don't have any active bookings or performer hires right now. Search the performer marketplace or review project applications to start an order.
                        </p>
                        <div className="flex gap-3">
                          <Button onClick={() => setActiveTab("discover")} className="gap-2">
                            <Search className="w-4 h-4" /> Discover Performers
                          </Button>
                          <Button variant="secondary" onClick={() => navigate("/brief")} className="gap-2">
                            <Plus className="w-4 h-4" /> Post Project Brief
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* Controls Toolbar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                        <div className="text-xs sm:text-sm font-medium text-[var(--color-text-secondary)]">
                          {orderSearchQuery ? (
                            <>
                              Showing <span className="font-semibold text-[var(--color-text-primary)]">{filteredOrders.length}</span> of {effectiveOrders.length} {effectiveOrders.length === 1 ? "order" : "orders"}
                            </>
                          ) : (
                            <>
                              <span className="font-semibold text-[var(--color-text-primary)]">{effectiveOrders.length}</span> active {effectiveOrders.length === 1 ? "order" : "orders"}
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative flex-1 sm:w-64">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
                            <input
                              type="text"
                              value={orderSearchQuery}
                              onChange={(e) => setOrderSearchQuery(e.target.value)}
                              placeholder="Search orders or performers..."
                              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[var(--color-hairline)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                            />
                          </div>
                          <div className="flex items-center p-0.5 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-bg-surface)]">
                            <button
                              type="button"
                              onClick={() => setOrderViewMode("chat")}
                              className={`p-1.5 rounded-md transition-colors ${
                                orderViewMode === "chat"
                                  ? "bg-[var(--color-accent)] text-white shadow-2xs"
                                  : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                              }`}
                              title="Chat / List View"
                              aria-label="Chat / List View"
                            >
                              <List className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrderViewMode("cards")}
                              className={`p-1.5 rounded-md transition-colors ${
                                orderViewMode === "cards"
                                  ? "bg-[var(--color-accent)] text-white shadow-2xs"
                                  : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                              }`}
                              title="Detailed Cards View"
                              aria-label="Detailed Cards View"
                            >
                              <LayoutGrid className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {filteredOrders.length === 0 ? (
                        <div className="text-center py-12 px-4 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] text-xs text-[var(--color-text-secondary)]">
                          No orders match &ldquo;{orderSearchQuery}&rdquo;.
                        </div>
                      ) : orderViewMode === "chat" ? (
                        <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] divide-y divide-[var(--color-hairline)] overflow-hidden shadow-xs">
                          {filteredOrders.map((order) => {
                            const isCancelled = appStateSync.isBookingCancelled(order.id);
                            const pLower = order.project.toLowerCase();
                            const isGigOnsite = pLower.includes("compere") || pLower.includes("audition") || pLower.includes("onsite");
                            const initials = order.counterpart
                              .split(" ")
                              .map((w) => w[0])
                              .filter(Boolean)
                              .slice(0, 2)
                              .join("")
                              .toUpperCase() || "PF";

                            const statusSummary = isCancelled
                              ? "Booking cancelled & funds refunded"
                              : order.phase === "Review"
                              ? "Deliverables submitted · Inspection active"
                              : "Milestone in progress";

                            return (
                              <div
                                key={order.id}
                                onClick={() => navigate(`/order/${order.id}?role=client`)}
                                className="flex items-start sm:items-center gap-3 sm:gap-4 p-3.5 sm:p-5 hover:bg-[var(--color-bg-elevated)]/60 cursor-pointer transition-colors group relative"
                              >
                                {/* Avatar with active presence dot */}
                                <div className="relative shrink-0 mt-0.5 sm:mt-0">
                                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                    {initials}
                                  </div>
                                  {!isCancelled && (
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900 absolute bottom-0.5 right-0.5" />
                                  )}
                                </div>

                                {/* Responsive content block — prevents severe mobile truncation */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                      <h3 className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors leading-snug">
                                        {order.project}
                                      </h3>
                                      <span className="hidden sm:inline-flex text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 shrink-0">
                                        {isGigOnsite ? "Onsite" : "Online"}
                                      </span>
                                      {isCancelled && (
                                        <span className="inline-flex text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded shrink-0">
                                          Cancelled
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                                        isCancelled
                                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                          : order.phase === "Review"
                                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                          : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                      }`}
                                    >
                                      {order.phase}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between gap-2 text-xs sm:text-[13px] text-[var(--color-text-secondary)]">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                      <span className="font-medium text-[var(--color-text-primary)] truncate">{order.counterpart}</span>
                                      <span className="sm:hidden inline-flex text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 shrink-0">
                                        {isGigOnsite ? "Onsite" : "Online"}
                                      </span>
                                      <span className="hidden sm:inline text-[var(--color-text-tertiary)]">&middot;</span>
                                      <span className="hidden sm:inline truncate text-[var(--color-text-tertiary)]">
                                        {statusSummary}
                                      </span>
                                    </div>
                                    <div className="text-[11px] font-medium text-[var(--color-text-tertiary)] shrink-0">
                                      Due {order.due}
                                    </div>
                                  </div>

                                  <div className="sm:hidden text-[11px] text-[var(--color-text-tertiary)] mt-1 truncate">
                                    {statusSummary}
                                  </div>
                                </div>

                                <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 transition-all shrink-0 self-center" />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-4">
                      {filteredOrders.map(order => {
                        const pLower = order.project.toLowerCase();
                        const isGigOnsite = pLower.includes("compere") || pLower.includes("audition") || pLower.includes("onsite");

                        return (
                          <div
                            key={order.id}
                            className="p-5 rounded-[var(--radius-lg)] cursor-pointer hover:scale-[1.01] transition-transform"
                            style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-card)" }}
                            onClick={() => navigate(`/order/${order.id}?role=client`)}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-mono" style={{ color: "var(--color-text-tertiary)" }}>{order.id}</span>
                                  <span className="inline-flex text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                    {isGigOnsite ? "Onsite" : "Online"}
                                  </span>
                                </div>
                                <h3 className="text-base font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>{order.project}</h3>
                                <p className="text-sm font-body" style={{ color: "var(--color-text-secondary)" }}>Performer: {order.counterpart}</p>
                              </div>
                              <div className="text-right">
                                <div className="font-display text-lg tnum" style={{ color: "var(--color-accent)" }}>{order.amount}</div>
                                <div className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>Due {order.due}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mb-4">
                              {["Deliverables", "Review", "Complete"].map((phase, i) => {
                                const phases = ["Deliverables", "Review", "Complete"];
                                const current = phases.indexOf(order.phase === "Briefing" ? "Deliverables" : order.phase);
                                const isDone = i < current;
                                const isActive = i === current;
                                return (
                                  <React.Fragment key={phase}>
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono" style={{
                                      background: isDone ? "var(--color-success-bg)" : isActive ? "var(--color-accent-glow)" : "var(--color-bg-elevated)",
                                      color: isDone ? "var(--color-success)" : isActive ? "var(--color-accent)" : "var(--color-text-tertiary)",
                                      border: `1px solid ${isDone ? "var(--color-success)" : isActive ? "var(--color-accent)" : "var(--color-border-default)"}`,
                                    }}>
                                      {isDone ? "✓" : i + 1}
                                    </div>
                                    {i < 2 && <div className="flex-1 h-px" style={{ background: isDone ? "var(--color-success)" : "var(--color-border-default)" }} />}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                            <div className="text-xs font-body mb-3" style={{ color: "var(--color-text-secondary)" }}>
                              Current phase: <strong>{order.phase === "Briefing" ? "Deliverables" : order.phase}</strong>
                            </div>
                            <Button className="w-full h-10 text-sm gap-2">
                              Enter Order Room <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
              </motion.div>
            )}

            {/* ── Shortlist Tab ── */}
            {activeTab === "shortlist" && (
              <motion.div key="shortlist" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {effectiveShortlist.length === 0 ? (
                  <div className="text-center py-16 px-6 rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-[var(--shadow-card)] flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center mb-4 text-[var(--color-accent)]">
                      <Star className="w-8 h-8" />
                    </div>
                    <h3 className="font-display text-xl font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>Your Shortlist is Empty</h3>
                    <p className="text-sm font-body text-[var(--color-text-secondary)] max-w-md mb-6 leading-relaxed">
                      Bookmark creators while searching the performer directory so you can easily compare their rate cards and hire them for upcoming projects.
                    </p>
                    <Button onClick={() => setActiveTab("discover")} className="gap-2">
                      <Search className="w-4 h-4" /> Explore Performer Directory
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {talents.filter(t => effectiveShortlist.includes(t.id)).map(talent => (
                      <div key={talent.id} className="p-4 rounded-[var(--radius-lg)]" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-card)" }}>
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="w-12 h-12 text-base" background="var(--color-accent-glow)" color="var(--color-accent)">
                            {talent.avatar}
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>{talent.name}</span>
                              {talent.verified && <Shield className="w-3.5 h-3.5" style={{ color: "var(--color-success)" }} />}
                            </div>
                            <div className="text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>{talent.role}</div>
                          </div>
                          <button onClick={() => toggleShortlist(talent.id)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--color-accent-glow)" }}>
                            <X className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" className="flex-1 h-9 text-sm" onClick={() => window.open(`/${talent.id}?role=client`, "_blank")}>View Profile</Button>
                          <Button className="flex-1 h-9 text-sm" onClick={() => window.open(`/book/${talent.id}?role=client`, "_blank")}>Book Now</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Analytics Tab ── */}
            {activeTab === "analytics" && (() => {
              const currentData = CLIENT_ANALYTICS_DATA[analyticsDateRange];
              const plotWidth = 660;
              const plotHeight = 170;
              const paddingLeft = 70;
              const paddingTop = 24;
              const baselineY = paddingTop + plotHeight;

              const splinePoints = currentData.graphPoints.map((pt, i, arr) => {
                const x = paddingLeft + (arr.length > 1 ? (i / (arr.length - 1)) * plotWidth : plotWidth / 2);
                const y = baselineY - (pt.amount / currentData.maxVal) * plotHeight;
                return { x, y, ...pt };
              });

              const spline = getSplinePath(splinePoints);
              const area = getAreaPath(splinePoints, baselineY);

              return (
                <motion.div key="analytics" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>Hiring &amp; Budget Analytics</h2>
                      <p className="text-xs font-body mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                        Overview of campaign spending, successful projects, and talent retention metrics for {clientProfile.orgName || clientProfile.name}.
                      </p>
                    </div>

                    {/* Date Range Dropdown (Replaces Live Sync Active chip) */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div
                        className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-lg)] border text-xs font-body shadow-sm"
                        style={{
                          background: "var(--color-bg-surface)",
                          borderColor: "var(--color-border-default)",
                          color: "var(--color-text-primary)",
                        }}
                      >
                        <Calendar className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
                        <span className="text-[var(--color-text-secondary)] font-medium">Period:</span>
                        <select
                          aria-label="Analytics date range"
                          value={analyticsDateRange}
                          onChange={(e) => setAnalyticsDateRange(e.target.value as ClientAnalyticsRange)}
                          className="bg-transparent font-semibold cursor-pointer outline-none text-xs"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          <option value="30d">Last 30 days</option>
                          <option value="90d">Last 90 days</option>
                          <option value="year">This Year</option>
                          <option value="all">All time</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {isNewUser ? (
                    <div className="text-center py-16 px-6 rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] shadow-[var(--shadow-card)] flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center mb-4 text-[var(--color-accent)]">
                        <TrendingUp className="w-8 h-8" />
                      </div>
                      <h3 className="font-display text-xl font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>Hiring Analytics Pending</h3>
                      <p className="text-sm font-body text-[var(--color-text-secondary)] max-w-md mb-6 leading-relaxed">
                        Metrics on campaign spending, successful projects, and talent retention will be tracked here once you initiate hiring campaigns.
                      </p>
                      <Button onClick={() => setActiveTab("discover")} className="gap-2">
                        <Search className="w-4 h-4" /> Discover Performers
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* 4 Metric Cards (Designed in exact parity with Performer's cards — Image 3) */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Card 1: Total spend till date */}
                        <div
                          className="p-4 sm:p-5 rounded-[var(--radius-xl)] transition-all hover:shadow-md"
                          style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-card)" }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-body font-medium tracking-normal" style={{ color: "var(--color-text-tertiary)" }}>Total spend till date</div>
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                              <CreditCard className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div className="font-display text-2xl font-bold tnum" style={{ color: "var(--color-text-primary)" }}>{currentData.totalSpend}</div>
                          <div className="text-xs font-body mt-1 font-semibold" style={{ color: "var(--color-success)" }}>{currentData.spendSubtext}</div>
                        </div>

                        {/* Card 2: Total successful projects */}
                        <div
                          className="p-4 sm:p-5 rounded-[var(--radius-xl)] transition-all hover:shadow-md"
                          style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-card)" }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-body font-medium tracking-normal" style={{ color: "var(--color-text-tertiary)" }}>Total successful projects</div>
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div className="font-display text-2xl font-bold tnum" style={{ color: "var(--color-accent)" }}>{currentData.successfulProjects}</div>
                          <div className="text-xs font-body mt-1 flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>{currentData.projectsSubtext}</span>
                          </div>
                        </div>

                        {/* Card 3: Average rating (Clickable to open Client Reviews Modal) */}
                        <div
                          onClick={() => setShowClientReviewsModal(true)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setShowClientReviewsModal(true); }}
                          className="p-4 sm:p-5 rounded-[var(--radius-xl)] cursor-pointer transition-all hover:border-[var(--color-accent)] hover:shadow-md group"
                          style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-card)" }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-body font-medium tracking-normal" style={{ color: "var(--color-text-tertiary)" }}>Average rating</div>
                            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 group-hover:text-[var(--color-accent)] transition-all flex items-center gap-0.5">
                              Reviews <ChevronRight className="w-3 h-3 inline" />
                            </span>
                          </div>
                          <div className="font-display text-2xl font-bold tnum flex items-center gap-1.5" style={{ color: "var(--color-text-primary)" }}>
                            <span>{currentData.avgRating}</span>
                          </div>
                          <div className="text-xs font-body mt-1 transition-colors group-hover:text-[var(--color-accent)]" style={{ color: "var(--color-text-secondary)" }}>
                            {currentData.ratingSubtext}
                          </div>
                        </div>

                        {/* Card 4: Repeat talent rate */}
                        <div
                          className="p-4 sm:p-5 rounded-[var(--radius-xl)] transition-all hover:shadow-md"
                          style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-card)" }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-body font-medium tracking-normal" style={{ color: "var(--color-text-tertiary)" }}>Repeat talent rate</div>
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                              <Users className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div className="font-display text-2xl font-bold tnum" style={{ color: "var(--color-text-primary)" }}>{currentData.repeatRate}</div>
                          <div className="text-xs font-body mt-1 font-semibold" style={{ color: "var(--color-success)" }}>{currentData.repeatSubtext}</div>
                        </div>
                      </div>

                      {/* Spend Graph */}
                      <div
                        className="p-6 sm:p-7 rounded-2xl sm:rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-card)]"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                          <div>
                            <h3 className="font-display text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
                              Spend Over Time
                            </h3>
                            <p className="text-xs font-body mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                              {currentData.graphPeriodSubtitle}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-xs font-body">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" />
                              <span style={{ color: "var(--color-text-secondary)" }}>Escrow Spend (₦)</span>
                            </div>
                            <div
                              className="px-3 py-1 rounded-full text-xs font-mono font-bold"
                              style={{
                                background: "var(--color-accent-soft)",
                                color: "var(--color-accent)",
                              }}
                            >
                              {currentData.totalSpend}
                            </div>
                          </div>
                        </div>

                        {/* Spline Area Chart */}
                        <div className="w-full overflow-x-auto">
                          <div className="min-w-[560px]">
                            <svg
                              viewBox="0 0 760 230"
                              className="w-full h-auto overflow-visible select-none"
                              onMouseLeave={() => setHoveredSpendIndex(null)}
                            >
                              <defs>
                                <linearGradient id="clientSpendGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.3" />
                                  <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.02" />
                                </linearGradient>
                              </defs>

                              {/* Y-Axis Label Rotated */}
                              <text
                                transform="rotate(-90)"
                                x={-((paddingTop + baselineY) / 2)}
                                y="18"
                                textAnchor="middle"
                                className="text-[11px] font-body fill-zinc-400 font-medium"
                              >
                                Spend (₦)
                              </text>

                              {/* Horizontal Dashed Grid Lines & Y Ticks */}
                              {currentData.yTicks.map((tick) => {
                                const tickY = baselineY - (tick.val / currentData.maxVal) * plotHeight;
                                return (
                                  <g key={tick.label}>
                                    <line
                                      x1={paddingLeft}
                                      y1={tickY}
                                      x2={paddingLeft + plotWidth}
                                      y2={tickY}
                                      stroke="currentColor"
                                      strokeDasharray="4 4"
                                      className="text-zinc-200 dark:text-zinc-800"
                                      strokeWidth="1"
                                    />
                                    <text
                                      x={paddingLeft - 10}
                                      y={tickY + 4}
                                      textAnchor="end"
                                      className="text-[11px] font-mono fill-zinc-400 dark:fill-zinc-500 font-medium"
                                    >
                                      {tick.label}
                                    </text>
                                  </g>
                                );
                              })}

                              {/* Area Fill */}
                              <path d={area} fill="url(#clientSpendGradient)" />

                              {/* Spline Line */}
                              <path
                                d={spline}
                                fill="none"
                                stroke="#7C3AED"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />

                              {/* Data Points & Interactive Hover Area */}
                              {splinePoints.map((pt, i) => (
                                <g
                                  key={pt.label}
                                  onMouseEnter={() => setHoveredSpendIndex(i)}
                                  className="cursor-pointer"
                                >
                                  <circle
                                    cx={pt.x}
                                    cy={pt.y}
                                    r={hoveredSpendIndex === i ? 6 : 4}
                                    fill="#7C3AED"
                                    stroke="#ffffff"
                                    strokeWidth="2"
                                    className="transition-all duration-150"
                                  />
                                  {hoveredSpendIndex === i && (
                                    <g>
                                      <rect
                                        x={pt.x - 48}
                                        y={pt.y - 36}
                                        width="96"
                                        height="26"
                                        rx="6"
                                        fill="#18181B"
                                        className="shadow-lg"
                                      />
                                      <text
                                        x={pt.x}
                                        y={pt.y - 19}
                                        textAnchor="middle"
                                        className="text-[11px] font-mono font-bold fill-white"
                                      >
                                        ₦{pt.amount.toLocaleString()}
                                      </text>
                                    </g>
                                  )}
                                  {/* X-Axis Tick Label */}
                                  <text
                                    x={pt.x}
                                    y={baselineY + 20}
                                    textAnchor="middle"
                                    className="text-[11px] font-body font-medium fill-zinc-500 dark:fill-zinc-400"
                                  >
                                    {pt.label}
                                  </text>
                                </g>
                              ))}
                            </svg>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })()}

          </AnimatePresence>

          {/* Applicant Management Modal (features.md Phase 14, PWA-17) */}
          <AnimatePresence>
            {applicantsProject && !selectedProjectDetail && (
              <Modal onClose={() => { setApplicantsProject(null); setSelectingApplicationId(null); }} align="end">
                <motion.div
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 40, opacity: 0 }}
                  className="w-full max-w-lg rounded-[var(--radius-lg)] overflow-hidden max-h-[90vh] overflow-y-auto"
                  style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-5 flex items-start justify-between sticky top-0 z-10" style={{ background: "var(--color-bg-surface)", borderBottom: "1px solid var(--color-hairline)" }}>
                    <div>
                      <h3 className="font-display text-xl" style={{ color: "var(--color-text-primary)" }}>{applicantsProject.name}</h3>
                      <p className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>
                        {applicantsProject.applicants}{applicantsProject.applicantCap ? `/${applicantsProject.applicantCap}` : ""} applicants
                      </p>
                    </div>
                    <button onClick={() => { setApplicantsProject(null); setSelectingApplicationId(null); }} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--color-bg-elevated)" }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5 space-y-3">
                    {applicantActionError && (
                      <div className="flex items-center gap-2 p-3 rounded-xl text-sm font-body" style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}>
                        <AlertCircle className="w-4 h-4 shrink-0" /> {applicantActionError}
                      </div>
                    )}

                    {loadingApplicants ? (
                      <p className="text-sm font-body text-center py-10" style={{ color: "var(--color-text-tertiary)" }}>Loading applicants…</p>
                    ) : applicants.length === 0 ? (
                      <p className="text-sm font-body text-center py-10" style={{ color: "var(--color-text-tertiary)" }}>No applicants yet.</p>
                    ) : (
                      applicants.map((applicant) => (
                        <div key={applicant.applicationId} className="p-4 rounded-[var(--radius-md)]" style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
                          <div className="flex items-start gap-3 mb-3">
                            <Avatar className="w-11 h-11 text-sm shrink-0" background="var(--color-accent-glow)" color="var(--color-accent)">
                              {applicant.creator.avatar}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold font-body truncate" style={{ color: "var(--color-text-primary)" }}>{applicant.creator.name}</span>
                                {applicant.creator.verified && <Shield className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-success)" }} />}
                              </div>
                              <div className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>{applicant.creator.role} · {applicant.creator.location}</div>
                            </div>
                            <Badge tone={applicant.status === "SELECTED" ? "success" : applicant.status === "REJECTED" ? "error" : "accent"} size="sm">
                              {APPLICANT_STATUS_LABEL[applicant.status]}
                            </Badge>
                          </div>
                          {applicant.pitch && (
                            <p className="text-xs font-body mb-3 italic" style={{ color: "var(--color-text-secondary)" }}>"{applicant.pitch}"</p>
                          )}

                          {(applicant.status === "APPLIED" || applicant.status === "SHORTLISTED") && (
                            <div className="flex gap-2 mb-2">
                              {applicant.status === "APPLIED" && (
                                <Button variant="secondary" className="flex-1 h-9 text-xs" onClick={() => handleShortlist(applicant.applicationId)}>Shortlist</Button>
                              )}
                              <Button variant="secondary" className="flex-1 h-9 text-xs" onClick={() => handleRejectApplicant(applicant.applicationId)}>Reject</Button>
                              <Button className="flex-1 h-9 text-xs" onClick={() => openSelectFlow(applicant)}>Select</Button>
                            </div>
                          )}

                          {selectingApplicationId === applicant.applicationId && (
                            <div className="mt-3 p-3 rounded-[var(--radius-md)] space-y-3" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)" }}>
                              <div>
                                <label className="block text-[10px] uppercase tracking-wider font-body mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>Service</label>
                                <select
                                  value={selectRateCardId}
                                  onChange={(e) => setSelectRateCardId(e.target.value)}
                                  className="w-full h-[54px] px-4 rounded-[var(--radius-lg)] text-base font-body"
                                  style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-primary)" }}
                                >
                                  <option value="">Choose a service…</option>
                                  {selectRateCards.map((card) => (
                                    <option key={card.id} value={card.id}>{card.title} · {card.price}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase tracking-wider font-body mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>Date</label>
                                <input
                                  type="date"
                                  value={selectDate}
                                  min={new Date().toISOString().slice(0, 10)}
                                  onChange={(e) => e.target.value && setSelectDate(e.target.value)}
                                  className="w-full h-10 px-3 rounded-[var(--radius-md)] text-xs font-body"
                                  style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-primary)" }}
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase tracking-wider font-body mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>Time</label>
                                <div className="grid grid-cols-4 gap-1.5">
                                  {CANDIDATE_SLOT_HOURS.map((h) => {
                                    const start = toTimeStr(h * 60);
                                    const fits = selectSlotFits(start);
                                    const isSelected = selectSlotStart === start;
                                    return (
                                      <button
                                        key={start}
                                        disabled={!fits}
                                        onClick={() => setSelectSlotStart(start)}
                                        className="py-1.5 rounded-lg text-[11px] font-mono tnum disabled:opacity-30 disabled:cursor-not-allowed"
                                        style={{
                                          background: isSelected ? "var(--color-accent)" : "var(--color-bg-elevated)",
                                          color: isSelected ? "var(--color-accent-on)" : "var(--color-text-primary)",
                                          border: `1px solid ${isSelected ? "var(--color-accent)" : "var(--color-border-default)"}`,
                                        }}
                                      >
                                        {start}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="secondary" className="flex-1 h-9 text-xs" onClick={() => setSelectingApplicationId(null)}>Cancel</Button>
                                <Button
                                  className="flex-1 h-9 text-xs gap-1.5"
                                  disabled={!selectRateCardId || !selectSlotStart || selecting}
                                  onClick={handleConfirmSelect}
                                >
                                  <Check className="w-3.5 h-3.5" /> {selecting ? "Booking…" : "Confirm Selection"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </Modal>
            )}
          </AnimatePresence>
          {/* Notifications Drawer (FAANG Architecture) */}
          <AnimatePresence>
            {showNotifications && (
              <NotificationCenterModal
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
                role="client"
                onNavigateToTab={(tab) => setActiveTab(tab as Tab)}
              />
            )}
          </AnimatePresence>

          {/* Client Reviews & Ratings Modal (Opens when clicking Average Rating card or Reviews >) */}
          <AnimatePresence>
            {showClientReviewsModal && (
              <Modal onClose={() => setShowClientReviewsModal(false)}>
                <motion.div
                  initial={{ y: 20, scale: 0.95 }}
                  animate={{ y: 0, scale: 1 }}
                  exit={{ y: 20, scale: 0.95 }}
                  className="w-full max-w-2xl rounded-2xl p-6 relative max-h-[88vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="flex items-start justify-between pb-3.5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                    <div>
                      <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100">
                        Reviews
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-body mt-0.5">
                        Authentic feedback and ratings from performers and creators
                      </p>
                    </div>
                    <button
                      onClick={() => setShowClientReviewsModal(false)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                      aria-label="Close reviews modal"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 3 Statistical Pillars */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-3.5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                    {/* Pillar 1: Total Reviews */}
                    <div className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between">
                      <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 font-body">
                        Total Reviews
                      </span>
                      <div className="my-1.5 flex items-baseline gap-2">
                        <span className="font-display text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                          4
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          ✓ 100% Verified
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-body">
                        Zero disputes filed
                      </span>
                    </div>

                    {/* Pillar 2: Average Rating */}
                    <div className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between">
                      <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 font-body">
                        Average Rating
                      </span>
                      <div className="my-1.5 flex items-center gap-2">
                        <span className="font-display text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                          4.9
                        </span>
                        <div className="flex items-center text-amber-500 text-sm tracking-tight" aria-label="5 stars">
                          <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-body">
                        Top 5% client on Monologg
                      </span>
                    </div>

                    {/* Pillar 3: Rating Distribution Bars */}
                    <div className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 flex flex-col justify-center space-y-1">
                      {[
                        { stars: 5, count: 3, pct: 75, barColor: "bg-teal-500 dark:bg-teal-400" },
                        { stars: 4, count: 1, pct: 25, barColor: "bg-amber-500 dark:bg-amber-400" },
                        { stars: 3, count: 0, pct: 0, barColor: "bg-zinc-200 dark:bg-zinc-700" },
                        { stars: 2, count: 0, pct: 0, barColor: "bg-zinc-200 dark:bg-zinc-700" },
                        { stars: 1, count: 0, pct: 0, barColor: "bg-zinc-200 dark:bg-zinc-700" },
                      ].map((item) => (
                        <div key={item.stars} className="flex items-center gap-1.5 text-[10px]">
                          <span className="w-5 text-zinc-600 dark:text-zinc-400 font-mono text-right flex items-center justify-end gap-0.5">
                            {item.stars}<span className="text-amber-500 text-[9px]">★</span>
                          </span>
                          <div className="flex-1 h-1.5 rounded-full bg-zinc-200/80 dark:bg-zinc-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${item.barColor} transition-all duration-300`}
                              style={{ width: `${item.pct}%` }}
                            />
                          </div>
                          <span className="w-4 text-zinc-400 font-mono text-right text-[10px]">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reviews List */}
                  <div className="py-4 space-y-3.5 overflow-y-auto flex-1">
                    {[
                      {
                        name: "Adaeze Obi",
                        initials: "AO",
                        role: "Lead Voice Artist · Commercial VO",
                        rating: 5.0,
                        date: "Oct 2026",
                        note: "FilmCraft Studios provides the clearest creative briefs in Nollywood. Milestones are funded upfront in escrow and released immediately upon review.",
                        tags: ["Clear brief & requirements", "Prompt milestone release"],
                        badgeBg: "var(--color-red-soft)",
                        badgeColor: "var(--color-mono-red)",
                      },
                      {
                        name: "Chidi Okeke",
                        initials: "CO",
                        role: "Stage & Screen Actor · Feature Film Audition",
                        rating: 5.0,
                        date: "Sep 2026",
                        note: "Incredible team to work with. Rehearsal expectations were crystal clear and communication through Monologg order room was seamless.",
                        tags: ["Fast turnaround", "Professional & respectful"],
                        badgeBg: "var(--color-purple-soft)",
                        badgeColor: "var(--color-mono-purple)",
                      },
                      {
                        name: "Kofi Mensah",
                        initials: "KM",
                        role: "Compere & Host · Corporate Gala 2026",
                        rating: 4.8,
                        date: "Aug 2026",
                        note: "Very organized event production team. Prompt check-in PIN exchange and instant escrow settlement upon event completion.",
                        tags: ["Prompt milestone release", "Would work with again"],
                        badgeBg: "var(--color-accent-soft)",
                        badgeColor: "var(--color-accent)",
                      },
                      {
                        name: "Fatima Bello",
                        initials: "FB",
                        role: "Commercial Model · Brand Campaign",
                        rating: 4.9,
                        date: "Jul 2026",
                        note: "Superb client experience. Creative direction was detailed, respectful, and constructive. Highly recommend booking with them.",
                        tags: ["Creative & professional", "Clear brief & requirements"],
                        badgeBg: "var(--color-red-soft)",
                        badgeColor: "var(--color-mono-red)",
                      },
                    ].map((rev, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar size="sm" className="w-8 h-8 text-xs font-semibold shrink-0" background={rev.badgeBg} color={rev.badgeColor}>
                              {rev.initials}
                            </Avatar>
                            <div>
                              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                {rev.name}
                                <span className="text-[10px] font-normal text-zinc-500 dark:text-zinc-400">· {rev.date}</span>
                              </div>
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{rev.role}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 text-xs font-bold font-mono">
                            <span>★</span>
                            <span>{rev.rating.toFixed(1)}</span>
                          </div>
                        </div>

                        <p className="text-xs text-zinc-700 dark:text-zinc-300 font-body leading-relaxed">
                          &ldquo;{rev.note}&rdquo;
                        </p>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {rev.tags.map((t, tidx) => (
                            <span
                              key={tidx}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                            >
                              ✓ {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Modal Footer */}
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 shrink-0 flex items-center justify-between">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Ratings verified by Monologg Escrow
                    </span>
                    <Button variant="secondary" className="h-9 px-4 text-xs font-semibold" onClick={() => setShowClientReviewsModal(false)}>
                      Close
                    </Button>
                  </div>
                </motion.div>
              </Modal>
            )}

            {/* ── Fund Wallet Modal ── */}
            {showFundWalletModal && (
              <Modal key="fund-wallet-modal" onClose={() => { setShowFundWalletModal(false); setFundingSuccess(false); setCardFundError(null); }}>
                <motion.div
                  initial={{ y: 20, scale: 0.95 }}
                  animate={{ y: 0, scale: 1 }}
                  exit={{ y: 20, scale: 0.95 }}
                  className="w-full max-w-md rounded-[var(--radius-xl)] p-6 max-h-[90vh] overflow-y-auto space-y-5"
                  style={{
                    background: "var(--color-bg-surface)",
                    border: "1px solid var(--color-border-default)",
                    boxShadow: "var(--shadow-modal)",
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--color-hairline)" }}>
                    <div>
                      <h3 className="font-display text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>Fund Client Wallet</h3>
                      <p className="text-xs font-body mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                        Add funds to book performers and fund project escrow
                      </p>
                    </div>
                    <button
                      onClick={() => { setShowFundWalletModal(false); setFundingSuccess(false); setCardFundError(null); }}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
                      style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-secondary)" }}
                      aria-label="Close modal"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {fundingSuccess ? (
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-6 text-center space-y-4">
                      <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <Check className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="font-display text-xl font-bold text-[var(--color-text-primary)]">Wallet Funded Successfully!</h4>
                        <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                          +₦{(fundingSuccessData?.amount || parseInt(fundAmountInput.replace(/\D/g, ""), 10) || 50000).toLocaleString()}
                        </div>
                        <p className="text-xs font-body mt-1 text-[var(--color-text-secondary)]">
                          Your balance is updated. You can fund escrow and hire performers immediately.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-bg-elevated)] text-left text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--color-text-tertiary)]">New Available Balance</span>
                          <span className="font-mono font-bold text-[var(--color-text-primary)]">
                            ₦{(fundingSuccessData?.newBalance || walletBalance).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--color-text-tertiary)]">Payment Method</span>
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {fundingSuccessData?.method || (walletFundMethod === "card" ? "Saved Card" : "Paystack Instant Escrow")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--color-text-tertiary)]">Transaction Reference</span>
                          <span className="font-mono text-[var(--color-text-secondary)]">
                            {fundingSuccessData?.ref || "ref_paystack_018274"}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2.5 pt-1">
                        <Button
                          variant="secondary"
                          className="flex-1 h-11 text-xs font-semibold whitespace-nowrap"
                          onClick={() => {
                            setShowFundWalletModal(false);
                            setFundingSuccess(false);
                            setCardFundError(null);
                          }}
                        >
                          Done
                        </Button>
                        <Button
                          className="flex-1 h-11 text-xs font-bold shadow-md whitespace-nowrap"
                          onClick={() => {
                            setShowFundWalletModal(false);
                            setFundingSuccess(false);
                            setCardFundError(null);
                            setActiveTab("projects");
                          }}
                        >
                          View Projects
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      {/* Amount Section */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold block mb-2 font-body" style={{ color: "var(--color-text-tertiary)" }}>
                            Amount to Fund (NGN)
                          </label>
                          <div className="relative flex items-center rounded-2xl border transition-all focus-within:border-[#7B00FE] focus-within:ring-2 focus-within:ring-[#7B00FE]/20" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-border-default)" }}>
                            <span className="pl-4 pr-1 font-mono font-bold text-xl select-none" style={{ color: "#7B00FE" }}>
                              ₦
                            </span>
                            <Input
                              className="border-0 bg-transparent pl-1 pr-4 text-xl font-mono font-bold h-12 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                              value={fundAmountInput}
                              onChange={e => {
                                const raw = e.target.value.replace(/\D/g, "");
                                const num = parseInt(raw, 10);
                                setFundAmountInput(isNaN(num) ? "" : num.toLocaleString());
                                setCardFundError(null);
                              }}
                              placeholder="e.g. 50,000"
                            />
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-medium font-body" style={{ color: "var(--color-text-tertiary)" }}>
                              Quick Amount Presets
                            </label>
                            <span className="text-[11px] font-body" style={{ color: "var(--color-text-tertiary)" }}>Zero deposit fee</span>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {[50000, 100000, 250000, 500000].map(amt => {
                              const isSelected = fundAmountInput.replace(/\D/g, "") === amt.toString();
                              return (
                                <button
                                  key={amt}
                                  type="button"
                                  onClick={() => {
                                    setFundAmountInput(amt.toLocaleString());
                                    setCardFundError(null);
                                  }}
                                  className="py-2 px-1 text-xs font-mono font-semibold rounded-xl border transition-all text-center flex items-center justify-center cursor-pointer"
                                  style={{
                                    background: isSelected ? "#7B00FE" : "var(--color-bg-elevated)",
                                    borderColor: isSelected ? "#7B00FE" : "var(--color-hairline)",
                                    color: isSelected ? "#FFFFFF" : "var(--color-text-secondary)",
                                    boxShadow: isSelected ? "0 2px 8px rgba(123, 0, 254, 0.25)" : "none",
                                  }}
                                >
                                  ₦{(amt / 1000)}k
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Payment Method Selector */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold block font-body" style={{ color: "var(--color-text-tertiary)" }}>
                          Payment Method
                        </label>
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setWalletFundMethod("card");
                              setCardFundError(null);
                            }}
                            className="p-3 rounded-xl border text-left transition-all flex items-center gap-3 relative cursor-pointer"
                            style={{
                              background: walletFundMethod === "card" ? "rgba(123, 0, 254, 0.06)" : "var(--color-bg-elevated)",
                              borderColor: walletFundMethod === "card" ? "#7B00FE" : "var(--color-hairline)",
                              boxShadow: walletFundMethod === "card" ? "0 0 0 1px #7B00FE" : "none",
                            }}
                          >
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                              style={{
                                background: walletFundMethod === "card" ? "rgba(123, 0, 254, 0.12)" : "var(--color-bg-surface)",
                                color: walletFundMethod === "card" ? "#7B00FE" : "var(--color-text-secondary)",
                              }}
                            >
                              <CreditCard className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold font-body" style={{ color: "var(--color-text-primary)" }}>Saved Card</div>
                              <div className="text-[11px] font-body truncate" style={{ color: "var(--color-text-tertiary)" }}>Direct debit</div>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setWalletFundMethod("paystack");
                              setCardFundError(null);
                            }}
                            className="p-3 rounded-xl border text-left transition-all flex items-center gap-3 relative cursor-pointer"
                            style={{
                              background: walletFundMethod === "paystack" ? "rgba(123, 0, 254, 0.06)" : "var(--color-bg-elevated)",
                              borderColor: walletFundMethod === "paystack" ? "#7B00FE" : "var(--color-hairline)",
                              boxShadow: walletFundMethod === "paystack" ? "0 0 0 1px #7B00FE" : "none",
                            }}
                          >
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                              style={{
                                background: walletFundMethod === "paystack" ? "rgba(123, 0, 254, 0.12)" : "var(--color-bg-surface)",
                                color: walletFundMethod === "paystack" ? "#7B00FE" : "var(--color-text-secondary)",
                              }}
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold font-body" style={{ color: "var(--color-text-primary)" }}>Paystack</div>
                              <div className="text-[11px] font-body truncate" style={{ color: "var(--color-text-tertiary)" }}>Card, Transfer, USSD</div>
                            </div>
                          </button>
                        </div>
                      </div>

                      {walletFundMethod === "card" ? (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-semibold font-body" style={{ color: "var(--color-text-tertiary)" }}>
                                Select Card
                              </label>
                              <span className="text-[11px] font-body" style={{ color: "var(--color-text-tertiary)" }}>
                                Registered in Settings
                              </span>
                            </div>

                            {savedCards.length > 0 ? (
                              <div className="space-y-2">
                                {savedCards.map(c => {
                                  const isSelected = selectedEscrowCardId === c.id;
                                  const isMastercard = c.type.toLowerCase().includes("master");
                                  return (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedEscrowCardId(c.id);
                                        setCardFundError(null);
                                      }}
                                      className="w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer"
                                      style={{
                                        background: isSelected ? "rgba(123, 0, 254, 0.06)" : "var(--color-bg-elevated)",
                                        borderColor: isSelected ? "#7B00FE" : "var(--color-hairline)",
                                        boxShadow: isSelected ? "0 0 0 1.5px #7B00FE" : "none",
                                      }}
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div
                                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border"
                                          style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-hairline)" }}
                                        >
                                          {isMastercard ? (
                                            <div className="flex -space-x-1.5 items-center">
                                              <div className="w-3.5 h-3.5 rounded-full bg-[#EB001B] opacity-90" />
                                              <div className="w-3.5 h-3.5 rounded-full bg-[#F79E1B] opacity-90" />
                                            </div>
                                          ) : (
                                            <span className="font-mono font-black italic text-[11px] text-[#1A1F71] dark:text-[#2E77D0]">
                                              VISA
                                            </span>
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="text-xs font-bold font-body flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
                                            <span>{c.type.toUpperCase()} •••• {c.last4}</span>
                                            {c.isDefault && (
                                              <Badge tone="accent" size="sm">Default</Badge>
                                            )}
                                          </div>
                                          <div className="text-[11px] font-body truncate" style={{ color: "var(--color-text-tertiary)" }}>
                                            Expires {c.expiry}{c.cardholderName ? ` · ${c.cardholderName}` : ""}
                                          </div>
                                        </div>
                                      </div>
                                      <div
                                        className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all"
                                        style={{
                                          borderColor: isSelected ? "#7B00FE" : "var(--color-border-default)",
                                          background: isSelected ? "#7B00FE" : "transparent",
                                        }}
                                      >
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-4 rounded-xl border border-dashed text-xs text-center space-y-1" style={{ color: "var(--color-text-secondary)", borderColor: "var(--color-border-default)" }}>
                                <p className="font-semibold text-[var(--color-text-primary)]">No saved cards found</p>
                                <p className="text-[11px] text-[var(--color-text-tertiary)]">Add and manage billing cards in Settings &gt; Payment details, or fund directly via Paystack.</p>
                              </div>
                            )}
                          </div>

                          {/* Insufficient Funds Error State Alert */}
                          {cardFundError === "insufficient_funds" && (
                            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 space-y-2">
                              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-xs">
                                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                                <span>Payment Declined: Insufficient Funds</span>
                              </div>
                              <p className="text-rose-700 dark:text-rose-300 text-xs leading-relaxed font-body">
                                Your bank declined the debit of ₦{fundAmountInput} due to insufficient funds in this account. Please select another card or fund with Paystack.
                              </p>
                              <div className="flex gap-2 pt-1">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="flex-1 h-8 text-xs font-semibold whitespace-nowrap"
                                  onClick={() => setCardFundError(null)}
                                >
                                  Try Another Card
                                </Button>
                                <Button
                                  type="button"
                                  className="flex-1 h-8 text-xs font-semibold whitespace-nowrap"
                                  style={{ background: "#7B00FE", color: "#FFFFFF" }}
                                  onClick={() => {
                                    setCardFundError(null);
                                    setWalletFundMethod("paystack");
                                  }}
                                >
                                  Switch to Paystack
                                </Button>
                              </div>
                            </div>
                          )}

                          <div className="pt-2">
                            <Button
                              className="w-full h-12 text-sm font-bold shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer"
                              style={{ background: "#7B00FE", color: "#FFFFFF" }}
                              disabled={isFunding || !fundAmountInput || parseInt(fundAmountInput.replace(/\D/g, ""), 10) <= 0 || savedCards.length === 0}
                              onClick={executeCardDebit}
                            >
                              <Lock className="w-4 h-4 shrink-0" />
                              <span>{isFunding ? "Processing Debit..." : `Debit ₦${fundAmountInput || "0"} from Card`}</span>
                            </Button>
                            <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>Paystack Escrow Protected · 256-Bit Bank-Grade Encryption</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="p-4 rounded-xl border space-y-2.5" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-[#0BA4DB]/15 text-[#0BA4DB] flex items-center justify-center font-bold text-sm">
                                  P
                                </div>
                                <div>
                                  <div className="text-xs font-bold font-body" style={{ color: "var(--color-text-primary)" }}>Paystack Secure Checkout</div>
                                  <div className="text-[10px] font-body" style={{ color: "var(--color-text-tertiary)" }}>Card, Bank Transfer, or USSD</div>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 whitespace-nowrap">
                                256-Bit SSL
                              </span>
                            </div>
                            <p className="text-xs font-body leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                              Click below to open Paystack's secure checkout. Once payment completes, your wallet balance will be credited instantly.
                            </p>
                          </div>

                          <Button
                            className="w-full h-12 text-sm font-bold shadow-md flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                            style={{ background: "#0BA4DB", color: "#FFFFFF" }}
                            disabled={!fundAmountInput || parseInt(fundAmountInput.replace(/\D/g, ""), 10) <= 0}
                            onClick={() => setShowPaystackModal(true)}
                          >
                            <span>Pay ₦{fundAmountInput || "0"} with Paystack</span>
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                          <div className="flex items-center justify-center gap-1.5 text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Instant Settlement · Certified PCI-DSS Level 1 Payment Gateway</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </Modal>
            )}

            {/* ── Paystack Checkout Integration Modal ── */}
            {showPaystackModal && (
              <Modal key="paystack-modal" onClose={() => { if (!paystackProcessing) setShowPaystackModal(false); }}>
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="p-0 max-w-md w-full rounded-2xl overflow-hidden bg-white text-slate-900 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Paystack Header */}
                  <div className="bg-[#0BA4DB] px-6 py-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
                        P
                      </div>
                      <div>
                        <div className="text-xs font-semibold tracking-wide text-white/90">PAYSTACK SECURE CHECKOUT</div>
                        <div className="text-[11px] text-white/75">Monologg Creative · client@filmcraft.ng</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-lg text-white">₦{fundAmountInput}</div>
                      <div className="text-[10px] text-white/80">Secured 256-Bit</div>
                    </div>
                  </div>

                  {/* Paystack Tabs */}
                  <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                    <button
                      type="button"
                      onClick={() => setPaystackTab("card")}
                      className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                        paystackTab === "card"
                          ? "border-[#0BA4DB] text-[#0BA4DB] bg-white dark:bg-slate-900"
                          : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaystackTab("transfer")}
                      className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                        paystackTab === "transfer"
                          ? "border-[#0BA4DB] text-[#0BA4DB] bg-white dark:bg-slate-900"
                          : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Transfer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaystackTab("ussd")}
                      className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                        paystackTab === "ussd"
                          ? "border-[#0BA4DB] text-[#0BA4DB] bg-white dark:bg-slate-900"
                          : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>USSD</span>
                    </button>
                  </div>

                  {/* Tab Body */}
                  <div className="p-6 space-y-4">
                    {paystackProcessing ? (
                      <div className="py-10 text-center space-y-3">
                        <div className="w-10 h-10 border-3 border-[#0BA4DB] border-t-transparent rounded-full animate-spin mx-auto" />
                        <div className="text-sm font-bold text-slate-900 dark:text-white">Authorizing payment with bank...</div>
                        <div className="text-xs text-slate-500">Please do not close this window</div>
                      </div>
                    ) : (
                      <>
                        {paystackTab === "card" && (
                          <div className="space-y-3">
                            <div className="text-xs text-slate-500">
                              Simulate instant card payment via Paystack:
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1 text-slate-500">Card Number</label>
                              <Input readOnly value="4084 ···· ···· 9410 (Visa)" className="font-mono text-xs bg-slate-50 dark:bg-slate-800" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1 text-slate-500">Valid Thru</label>
                                <Input readOnly value="12 / 28" className="font-mono text-xs bg-slate-50 dark:bg-slate-800" />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1 text-slate-500">CVV</label>
                                <Input readOnly value="123" className="font-mono text-xs bg-slate-50 dark:bg-slate-800" />
                              </div>
                            </div>
                            <Button
                              className="w-full h-11 text-xs font-bold text-white shadow-md mt-2"
                              style={{ background: "#0BA4DB" }}
                              onClick={executePaystackPayment}
                            >
                              Pay ₦{fundAmountInput}
                            </Button>
                          </div>
                        )}

                        {paystackTab === "transfer" && (
                          <div className="space-y-3">
                            <div className="text-xs text-slate-500">
                              Transfer exactly <strong>₦{fundAmountInput}</strong> to the dedicated virtual account:
                            </div>
                            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">Bank</span>
                                <span className="text-xs font-bold">Wema Bank</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">Account Number</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-sm">0128 4930 21</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard?.writeText("0128493021");
                                      setPaystackCopied(true);
                                      setTimeout(() => setPaystackCopied(false), 2000);
                                    }}
                                    className="text-xs px-2 py-0.5 rounded bg-[#0BA4DB]/10 text-[#0BA4DB] font-semibold hover:bg-[#0BA4DB]/20 transition-colors"
                                  >
                                    {paystackCopied ? "Copied!" : "Copy"}
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">Beneficiary</span>
                                <span className="text-xs font-medium">Monologg / Paystack</span>
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700 text-[11px] text-amber-600 dark:text-amber-400">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Expires in 29:45</span>
                                <span>Single-use account</span>
                              </div>
                            </div>
                            <Button
                              className="w-full h-11 text-xs font-bold text-white shadow-md"
                              style={{ background: "#0BA4DB" }}
                              onClick={executePaystackPayment}
                            >
                              I Have Sent ₦{fundAmountInput}
                            </Button>
                          </div>
                        )}

                        {paystackTab === "ussd" && (
                          <div className="space-y-3">
                            <div className="text-xs text-slate-500">
                              Dial this code on your mobile phone to authorize payment:
                            </div>
                            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-center space-y-1">
                              <div className="text-xs text-slate-500 font-semibold">GTBank USSD Code</div>
                              <div className="font-mono font-bold text-base text-[#0BA4DB] tracking-wider">
                                *737*2*{fundAmountInput.replace(/\D/g, "")}*0128#
                              </div>
                              <div className="text-[11px] text-slate-400">Works with your linked mobile number</div>
                            </div>
                            <Button
                              className="w-full h-11 text-xs font-bold text-white shadow-md"
                              style={{ background: "#0BA4DB" }}
                              onClick={executePaystackPayment}
                            >
                              I Have Dialed the Code
                            </Button>
                          </div>
                        )}

                        <div className="pt-2 text-center">
                          <button
                            type="button"
                            onClick={() => setShowPaystackModal(false)}
                            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
                          >
                            Cancel and return to Monologg
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              </Modal>
            )}

            {/* ── Publish Brief & Fund Escrow Modal ── */}
            {showPublishEscrowModal && publishingProject && (
              <Modal onClose={() => { setShowPublishEscrowModal(false); setPublishEscrowSuccess(false); }}>
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="p-6 max-w-lg w-full rounded-[24px] space-y-5"
                  style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)", boxShadow: "var(--shadow-modal)" }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--color-hairline)" }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#7C3AED]/15 text-[#7C3AED] border border-[#7C3AED]/25">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
                          Publish Brief &amp; Fund Escrow
                        </h3>
                        <p className="text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>
                          Lock milestone escrow to activate performer discovery
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setShowPublishEscrowModal(false); setPublishEscrowSuccess(false); }}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
                      style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-secondary)" }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {publishEscrowSuccess ? (
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-6 text-center space-y-4">
                      <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="font-display text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                          Brief Published &amp; Escrow Funded!
                        </h4>
                        <p className="text-xs font-body max-w-sm mx-auto mt-1 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                          <strong>{publishingProject.name}</strong> is now live in performer discovery. Verified performers matching {publishingProject.niche} will start submitting audition tapes.
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl border text-xs font-mono text-left bg-emerald-500/5 border-emerald-500/20 text-emerald-400 space-y-1">
                        <div className="flex justify-between">
                          <span>Escrow Budget Locked:</span>
                          <span className="font-bold">{publishingProject.budget || "₦750,000"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className="font-bold">Active · Applications Open</span>
                        </div>
                      </div>
                      <Button
                        className="w-full h-11 text-xs font-bold shadow-md"
                        onClick={() => {
                          setShowPublishEscrowModal(false);
                          setPublishEscrowSuccess(false);
                        }}
                      >
                        Go to Applicant Pipeline
                      </Button>
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      {/* Brief Summary Box */}
                      <div className="p-4 rounded-xl border space-y-2" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#7C3AED]">
                            Target Brief
                          </span>
                          <Badge tone="neutral" size="sm">Private Draft</Badge>
                        </div>
                        <div className="text-sm font-bold font-display" style={{ color: "var(--color-text-primary)" }}>
                          {publishingProject.name}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-[var(--color-hairline)] text-xs font-body text-[var(--color-text-secondary)]">
                          <span>Craft Niche: <strong className="text-[var(--color-text-primary)]">{publishingProject.niche}</strong></span>
                          <span>Audition Cap: <strong className="text-[var(--color-text-primary)]">{publishingProject.applicantCap || 10} performers</strong></span>
                        </div>
                      </div>

                      {/* Escrow Required Card */}
                      <div className="p-4 rounded-xl border flex items-center justify-between" style={{ background: "rgba(124, 58, 237, 0.05)", borderColor: "rgba(124, 58, 237, 0.2)" }}>
                        <div>
                          <div className="text-xs text-[var(--color-text-secondary)] font-body">Escrow Commitment Required</div>
                          <div className="text-2xl font-bold font-mono text-[var(--color-text-primary)]">
                            {publishingProject.budget || "₦750,000"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                            <ShieldCheck className="w-3.5 h-3.5" /> 100% Escrow Protected
                          </div>
                          <div className="text-[10px] text-[var(--color-text-tertiary)]">Released only upon your approval</div>
                        </div>
                      </div>

                      {/* Payment Method Selector */}
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider block mb-2 font-body" style={{ color: "var(--color-text-tertiary)" }}>
                          Payment Method
                        </label>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <button
                            type="button"
                            onClick={() => setEscrowPaymentMethod("card")}
                            className="p-3 rounded-xl border text-left transition-all flex items-center gap-2.5"
                            style={{
                              background: escrowPaymentMethod === "card" ? "var(--color-accent-soft)" : "var(--color-bg-elevated)",
                              borderColor: escrowPaymentMethod === "card" ? "var(--color-accent)" : "var(--color-hairline)",
                            }}
                          >
                            <CreditCard className="w-4 h-4 shrink-0" style={{ color: escrowPaymentMethod === "card" ? "var(--color-accent)" : "var(--color-text-secondary)" }} />
                            <div>
                              <div className="text-xs font-bold" style={{ color: "var(--color-text-primary)" }}>Debit from Card</div>
                              <div className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>Saved billing card</div>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEscrowPaymentMethod("wallet")}
                            className="p-3 rounded-xl border text-left transition-all flex items-center gap-2.5"
                            style={{
                              background: escrowPaymentMethod === "wallet" ? "var(--color-accent-soft)" : "var(--color-bg-elevated)",
                              borderColor: escrowPaymentMethod === "wallet" ? "var(--color-accent)" : "var(--color-hairline)",
                            }}
                          >
                            <Shield className="w-4 h-4 shrink-0" style={{ color: escrowPaymentMethod === "wallet" ? "var(--color-accent)" : "var(--color-text-secondary)" }} />
                            <div>
                              <div className="text-xs font-bold" style={{ color: "var(--color-text-primary)" }}>Wallet Balance</div>
                              <div className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>₦{walletBalance.toLocaleString()} available</div>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Subview for Debit from Card */}
                      {escrowPaymentMethod === "card" && (
                        <div className="space-y-3">
                          {savedCards.length > 0 ? (
                            <>
                              <div className="space-y-2">
                                {savedCards.map(c => (
                                  <label
                                    key={c.id}
                                    className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all"
                                    style={{
                                      background: selectedEscrowCardId === c.id ? "rgba(124, 58, 237, 0.08)" : "var(--color-bg-elevated)",
                                      borderColor: selectedEscrowCardId === c.id ? "#7C3AED" : "var(--color-hairline)",
                                    }}
                                  >
                                    <div className="flex items-center gap-3">
                                      <input
                                        type="radio"
                                        name="escrowCard"
                                        checked={selectedEscrowCardId === c.id}
                                        onChange={() => setSelectedEscrowCardId(c.id)}
                                        className="accent-[#7C3AED]"
                                      />
                                      <CreditCard className="w-4 h-4 text-[#7C3AED]" />
                                      <div>
                                        <div className="text-xs font-bold text-[var(--color-text-primary)]">
                                          {c.type.toUpperCase()} •••• {c.last4}
                                        </div>
                                        <div className="text-[10px] text-[var(--color-text-tertiary)]">
                                          Expires {c.expiry}{c.cardholderName ? ` · ${c.cardholderName}` : ""}
                                        </div>
                                      </div>
                                    </div>
                                    {c.isDefault && (
                                      <Badge tone="accent" size="sm">Default</Badge>
                                    )}
                                  </label>
                                ))}
                              </div>

                              <div className="flex items-center gap-2.5 p-3 rounded-xl border" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}>
                                <label className="text-xs font-medium text-[var(--color-text-secondary)] whitespace-nowrap">
                                  Card CVV Code:
                                </label>
                                <Input
                                  type="password"
                                  maxLength={4}
                                  value={cardCvv}
                                  onChange={e => setCardCvv(e.target.value.replace(/\D/g, ""))}
                                  className="w-20 text-center font-mono font-bold h-9"
                                  placeholder="•••"
                                />
                                <span className="text-[10px] text-[var(--color-text-tertiary)] flex-1">
                                  Required for 3D-Secure 256-bit tokenized authorization
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="p-4 rounded-xl border border-dashed text-center text-xs space-y-2" style={{ borderColor: "var(--color-border-default)", background: "var(--color-bg-elevated)" }}>
                              <p className="text-[var(--color-text-secondary)]">No billing card found in your account.</p>
                              <Button
                                variant="secondary"
                                className="h-8 text-xs"
                                onClick={() => {
                                  setShowPublishEscrowModal(false);
                                  navigate("/settings?role=client&section=payment");
                                }}
                              >
                                Add Card in Billing &amp; Payments
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Subview for Wallet */}
                      {escrowPaymentMethod === "wallet" && (
                        <div className="p-3.5 rounded-xl border space-y-2 text-xs" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}>
                          <div className="flex justify-between">
                            <span className="text-[var(--color-text-secondary)]">Available Client Balance</span>
                            <span className="font-mono font-bold text-[var(--color-text-primary)]">₦{walletBalance.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--color-text-secondary)]">Deduction for Escrow</span>
                            <span className="font-mono font-bold text-[#7C3AED]">- {publishingProject.budget || "₦750,000"}</span>
                          </div>
                        </div>
                      )}

                      <div className="pt-2 flex gap-3">
                        <Button
                          variant="secondary"
                          className="flex-1 h-12 text-xs"
                          onClick={() => { setShowPublishEscrowModal(false); setPublishEscrowSuccess(false); }}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="flex-1 h-12 text-xs font-bold shadow-md"
                          disabled={isPublishingEscrow || (escrowPaymentMethod === "card" && savedCards.length === 0)}
                          onClick={handleConfirmPublishEscrow}
                        >
                          {isPublishingEscrow
                            ? "Securing Escrow & Publishing..."
                            : escrowPaymentMethod === "card"
                            ? `Debit ${publishingProject.budget || "₦750k"} & Publish Live`
                            : `Fund Escrow & Publish Live`}
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </Modal>
            )}

            {/* ── Performer Storefront Profile & Casting Modal ── */}
            {selectedTalent && (() => {
              const isProjectActive = selectedProjectDetail
                ? (projectStateOverrides[selectedProjectDetail.id] || selectedProjectDetail.status).toLowerCase() === "active"
                : false;

              return (
                <Modal onClose={() => { setSelectedTalent(null); setSelectedApplicantForProfile(null); }}>
                  <motion.div
                    initial={{ scale: 0.96, opacity: 0, y: 16 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.96, opacity: 0, y: 16 }}
                    transition={{ duration: 0.2, ease: EASE_OUT }}
                    className="w-full max-w-lg rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
                    style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)", boxShadow: "var(--shadow-modal)" }}
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Header Banner */}
                    <div className="h-32 relative overflow-hidden bg-gradient-to-br from-[#2D124D] via-[#1D0C33] to-[#0F081D]">
                      {/* Atmospheric ambient lighting and subtle grid */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(168,85,247,0.3),transparent_70%)]" />
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:16px_16px]" />
                      <button
                        onClick={() => { setSelectedTalent(null); setSelectedApplicantForProfile(null); }}
                        className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-all z-20 cursor-pointer border border-white/10 active:scale-95"
                        aria-label="Close talent profile"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="px-6 pb-6">
                      {/* Creator Identity Bar */}
                      <div className="flex items-end justify-between -mt-12 mb-4 relative z-10">
                        <div className="relative">
                          <Avatar
                            className="w-22 h-22 text-2xl font-display font-black ring-4 ring-[var(--color-bg-surface)] shadow-2xl"
                            background="linear-gradient(135deg, #7C3AED, #4F46E5)"
                            color="#FFFFFF"
                          >
                            {selectedTalent.avatar}
                          </Avatar>
                          <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-[var(--color-bg-surface)]" title="Online & Studio Ready" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            className="h-9 px-3.5 text-xs font-semibold gap-1.5 whitespace-nowrap rounded-xl shadow-xs hover:border-[var(--color-accent)] transition-all"
                            onClick={() => {
                              const slug = (selectedTalent.name || selectedTalent.id).toLowerCase().replace(/\s+/g, "-");
                              window.open(`/${slug}?role=client`, "_blank");
                            }}
                          >
                            <span>Open Public Storefront</span>
                            <ExternalLink className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1 mb-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display text-2xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                            {selectedTalent.name}
                          </h3>
                          {selectedTalent.verified && (
                            <span title="Verified Monologg Performer" className="text-emerald-500 flex items-center">
                              <ShieldCheck className="w-5 h-5" />
                            </span>
                          )}
                          <span className="text-xs font-mono font-bold flex items-center gap-1.5 text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                            <Star className="w-3.5 h-3.5 fill-amber-500" />
                            <span>{selectedTalent.rating || 4.9}</span>
                            <span className="text-[11px] opacity-75 font-normal">({selectedTalent.reviews || 48})</span>
                          </span>
                        </div>
                        <p className="text-xs font-body font-medium flex items-center gap-1.5 flex-wrap" style={{ color: "var(--color-text-secondary)" }}>
                          <span className="font-semibold text-[var(--color-accent)]">@{selectedTalent.id.toString().startsWith("@") ? selectedTalent.id.slice(1) : (selectedTalent.name || "talent").toLowerCase().replace(/[^a-z0-9]/g, ".")}</span>
                          <span className="text-[var(--color-text-tertiary)]">•</span>
                          <span>{selectedTalent.role}</span>
                          <span className="text-[var(--color-text-tertiary)]">•</span>
                          <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3 text-[var(--color-text-tertiary)]" />{selectedTalent.location}</span>
                        </p>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-5">
                        {selectedTalent.tags?.map(tag => (
                          <Badge key={tag} tone="neutral" size="sm" className="rounded-lg font-medium">{tag}</Badge>
                        ))}
                      </div>

                      {/* If viewing as an applicant for a project brief: Pitch & proposal callout */}
                      {selectedApplicantForProfile && (
                        <div
                          className="p-4 rounded-xl border mb-5 space-y-2.5"
                          style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold uppercase tracking-wider font-body flex items-center gap-1.5" style={{ color: "var(--color-accent)" }}>
                              <Sparkles className="w-3.5 h-3.5" />
                              Audition Pitch &amp; Proposal
                            </span>
                            <Badge tone={selectedApplicantForProfile.status === "SELECTED" ? "success" : selectedApplicantForProfile.status === "SHORTLISTED" ? "accent" : selectedApplicantForProfile.status === "REJECTED" ? "neutral" : "warning"} size="sm">
                              {APPLICANT_STATUS_LABEL[selectedApplicantForProfile.status] || selectedApplicantForProfile.status}
                            </Badge>
                          </div>
                          <p className="text-xs font-body italic leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                            "{selectedApplicantForProfile.pitch || "Experienced talent ready to bring full dynamic vocal range to your brief."}"
                          </p>
                          <div className="text-[11px] font-mono text-[var(--color-text-tertiary)] flex items-center gap-1 pt-1 border-t" style={{ borderColor: "var(--color-hairline)" }}>
                            <Clock className="w-3 h-3" />
                            <span>Applied {selectedApplicantForProfile.appliedAt ? new Date(selectedApplicantForProfile.appliedAt).toLocaleDateString() : "recently"}</span>
                          </div>
                        </div>
                      )}

                      {/* Reel Preview Player */}
                      <div className="mb-5">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold uppercase tracking-wider font-body text-[var(--color-text-tertiary)]">
                            Featured Audio / Video Reel
                          </label>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const slug = (selectedTalent.name || selectedTalent.id).toLowerCase().replace(/\s+/g, "-");
                              window.open(`/${slug}?role=client`, "_blank");
                            }}
                            className="text-[11px] font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>Open in new tab</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                        <div
                          onClick={() => {
                            setIsPlayingReel(!isPlayingReel);
                            const slug = (selectedTalent.name || selectedTalent.id).toLowerCase().replace(/\s+/g, "-");
                            try {
                              if (typeof window !== "undefined" && typeof window.open === "function") {
                                window.open(`/${slug}?role=client`, "_blank");
                              }
                            } catch {}
                          }}
                          className="relative rounded-2xl overflow-hidden cursor-pointer group border border-purple-500/25 bg-gradient-to-br from-[#0B0616] via-[#140B28] to-[#07030E] text-white p-4 shadow-xl select-none transition-all hover:border-purple-500/50"
                        >
                          {/* Studio Ambient Glow */}
                          <div className="absolute -top-12 -left-12 w-36 h-36 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />
                          <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-indigo-600/20 rounded-full blur-2xl pointer-events-none" />

                          {/* Top Bar with Showreel name and specs */}
                          <div className="flex items-center justify-between relative z-10 mb-4">
                            <div className="px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide bg-white/10 backdrop-blur-md text-white border border-white/10">
                              Commercial &amp; Narration Showreel
                            </div>
                            <div className="px-2.5 py-1 rounded-md font-mono text-[11px] font-medium bg-black/50 backdrop-blur-md text-purple-200 border border-white/10">
                              02:30 · 48kHz HD
                            </div>
                          </div>

                          {/* Center Playhead & Dynamic Waveform */}
                          <div className="flex items-center gap-4 py-2 relative z-10">
                            <button
                              type="button"
                              className="w-13 h-13 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-tr from-purple-600 via-purple-500 to-indigo-500 text-white shadow-[0_0_24px_rgba(147,51,234,0.6)] group-hover:scale-105 active:scale-95 transition-all"
                              aria-label={isPlayingReel ? "Pause reel" : "Play reel"}
                            >
                              {isPlayingReel ? (
                                <Pause className="w-5 h-5 fill-current" />
                              ) : (
                                <Play className="w-5 h-5 fill-current ml-0.5" />
                              )}
                            </button>

                            {/* Simulated Audio EQ Waveform Bars */}
                            <div className="flex-1 flex items-center gap-1 h-12 px-2 overflow-hidden">
                              {[20, 35, 55, 80, 45, 90, 65, 40, 75, 100, 70, 85, 45, 60, 35, 70, 95, 50, 30, 65, 40, 20].map((h, idx) => (
                                <div
                                  key={idx}
                                  className={`flex-1 rounded-full transition-all duration-300 ${
                                    idx < 9 ? "bg-purple-400" : "bg-purple-400/30"
                                  }`}
                                  style={{
                                    height: isPlayingReel ? `${Math.max(15, (h * (0.6 + (idx % 3) * 0.25)))}%` : `${h * 0.7}%`,
                                  }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Bottom Scrubber & Time */}
                          <div className="flex items-center justify-between text-[11px] font-mono text-purple-200/70 mt-2 relative z-10">
                            <span>{isPlayingReel ? "00:42" : "00:00"}</span>
                            <div className="flex-1 mx-3 h-1.5 rounded-full bg-white/10 overflow-hidden relative">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-300"
                                style={{ width: isPlayingReel ? "35%" : "0%" }}
                              />
                            </div>
                            <span>02:30</span>
                          </div>
                        </div>
                      </div>

                      {/* Storefront Rate Cards */}
                      <div className="space-y-2 mb-6">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-wider font-body text-[var(--color-text-tertiary)]">
                            Standard Storefront Rates
                          </label>
                          <span className="text-[11px] font-body text-[var(--color-text-secondary)]">Escrow Protected</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3.5 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-accent)] transition-all flex flex-col justify-between group">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold font-body text-[var(--color-text-primary)]">Standard Master</span>
                                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-[var(--color-accent)] border border-purple-500/20">48h Delivery</span>
                              </div>
                              <p className="text-[11px] font-body text-[var(--color-text-secondary)] leading-tight">Broadcast-ready master wav, 2 revisions</p>
                            </div>
                            <div className="font-display text-base font-black mt-2 text-[var(--color-accent)]">
                              {selectedTalent.price || "₦28,000"}
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] hover:border-amber-500/50 transition-all flex flex-col justify-between group">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold font-body text-[var(--color-text-primary)]">Rush 24h Turnaround</span>
                                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">⚡ Priority</span>
                              </div>
                              <p className="text-[11px] font-body text-[var(--color-text-secondary)] leading-tight">Immediate studio queue, expedited delivery</p>
                            </div>
                            <div className="font-display text-base font-black mt-2 text-amber-600 dark:text-amber-400">
                              ₦{((parseInt((selectedTalent.price || "28000").replace(/\D/g, ""), 10) || 28000) * 1.5).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Modal CTAs */}
                      <div className="pt-3 border-t" style={{ borderColor: "var(--color-hairline)" }}>
                        {selectedApplicantForProfile ? (
                          <div className="flex items-center gap-2">
                            {isProjectActive ? (
                              <>
                                {selectedApplicantForProfile.status === "REJECTED" ? (
                                  <Button
                                    variant="secondary"
                                    className="flex-1 h-11 text-xs whitespace-nowrap"
                                    onClick={() => handleShortlist(selectedApplicantForProfile.applicationId)}
                                  >
                                    Move to Shortlist
                                  </Button>
                                ) : (
                                  selectedApplicantForProfile.status !== "SELECTED" && (
                                    <Button
                                      variant="secondary"
                                      className="flex-1 h-11 text-xs text-rose-500 border-rose-500/20 hover:bg-rose-500/10 whitespace-nowrap"
                                      onClick={() => handleRejectApplicant(selectedApplicantForProfile.applicationId)}
                                    >
                                      Reject
                                    </Button>
                                  )
                                )}

                                {selectedApplicantForProfile.status === "APPLIED" && (
                                  <Button
                                    variant="secondary"
                                    className="flex-1 h-11 text-xs whitespace-nowrap"
                                    onClick={() => handleShortlist(selectedApplicantForProfile.applicationId)}
                                  >
                                    Shortlist
                                  </Button>
                                )}

                                {selectedApplicantForProfile.status === "SELECTED" ? (
                                  <Button
                                    className="flex-1 h-11 text-xs font-bold gap-1 whitespace-nowrap"
                                    onClick={() => {
                                      setSelectedTalent(null);
                                      setSelectedApplicantForProfile(null);
                                      navigate("/order/ORD-001?role=client");
                                    }}
                                  >
                                    <span>Open Order Room</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </Button>
                                ) : (
                                  <Button
                                    className="flex-1 h-11 text-xs font-bold whitespace-nowrap"
                                    onClick={() => {
                                      handleSelectAndHireApplicant(selectedApplicantForProfile);
                                    }}
                                  >
                                    Accept / Hire Performer
                                  </Button>
                                )}
                              </>
                            ) : (
                              selectedApplicantForProfile.status === "SELECTED" ? (
                                <Button
                                  className="w-full h-11 text-xs font-bold gap-1.5 whitespace-nowrap"
                                  onClick={() => {
                                    setSelectedTalent(null);
                                    setSelectedApplicantForProfile(null);
                                    navigate("/order/ORD-001?role=client");
                                  }}
                                >
                                  <span>Open Order Room</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </Button>
                              ) : (
                                <div
                                  className="w-full py-2.5 px-4 rounded-xl text-center text-xs font-body border"
                                  style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)", color: "var(--color-text-secondary)" }}
                                >
                                  Casting Concluded for this project brief
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              className="flex-1 h-11 text-xs gap-1.5 whitespace-nowrap"
                              onClick={() => toggleShortlist(selectedTalent.id)}
                            >
                              <Star className={`w-3.5 h-3.5 ${shortlist.includes(selectedTalent.id) ? "fill-current" : ""}`} />
                              {shortlist.includes(selectedTalent.id) ? "Shortlisted" : "Save to Shortlist"}
                            </Button>
                            <Button
                              className="flex-1 h-11 text-xs font-bold whitespace-nowrap"
                              onClick={() => {
                                const talentId = selectedTalent.id;
                                setSelectedTalent(null);
                                setSelectedApplicantForProfile(null);
                                window.open(`/book/${talentId}?role=client`, "_blank");
                              }}
                            >
                              Book Now →
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </Modal>
              );
            })()}
          </AnimatePresence>

          {/* Floating Success Toast Notification */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                key="toast-banner"
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="fixed top-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700/60 max-w-sm text-xs font-body font-medium"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">{toastMessage}</div>
                <button
                  onClick={() => setToastMessage(null)}
                  className="w-5 h-5 rounded-full flex items-center justify-center hover:opacity-75 transition-opacity"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <BottomNav
        navItems={CLIENT_BOTTOM_NAV_ITEMS}
        allNavItems={CLIENT_NAV_ITEMS}
        activeTab={activeTab}
        onTab={setActiveTab}
        indicatorId="client-tab-indicator"
        userName={orgName}
        userSubLabel="Client Account · Monologg Portal"
        userInitials={clientInitials}
        userAvatarUrl={clientProfile.avatarUrl ?? undefined}
        onSettings={() => navigate("/settings?role=client")}
        onTransactions={() => navigate("/transactions?role=client")}
        onSupport={() => navigate("/support")}
        onSignOut={async () => { await apiClient.logout(); navigate("/"); }}
      />
    </div>
  );
}
