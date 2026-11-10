import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EASE_OUT } from "../../lib/motionTokens";
import { Sidebar, type SidebarNavItem } from "../components/ui/Sidebar";
import { BottomNav } from "../components/ui/BottomNav";
import { Modal } from "../components/ui/Modal";
import { Badge } from "../components/ui/Badge";
import { apiClient, type AppNotification } from "../../lib/api-client";
import { appStateSync, type AvailabilityCheckin, type PayoutAccountChangeRequest } from "../../lib/state-sync";
import { NIGERIAN_BANKS, compareKycNames, type BankLookupStatus } from "../../lib/payoutBanks";
import { formatRelativeTime } from "../../lib/utils";
import { convertCurrency } from "../../lib/currency";
import type { ActivityItem, CalendarEvent, DayDetail, MyApplication, Order, Project, ServiceRateCard, Slot, SlotState, StatMetric, Talent } from "@monologg/types";
import {
  Home, Calendar, Bell, User, Share2, Shield, Play, TrendingUp,
  Plus, Edit2, Trash2, ChevronRight, ChevronLeft, ArrowLeft, Clock, MapPin, Info,
  MessageSquare, DollarSign, CheckCircle2, X, ExternalLink, ChevronDown,
  BarChart2, Award, Repeat, Briefcase, Search, Send, KeyRound, Eye, EyeOff,
  Camera, Instagram, Youtube, Twitter, Linkedin, Globe, Music, AlertCircle, Check, Image,
  SlidersHorizontal, Star, FileText, Layers, Lock, ShieldCheck, Users, Copy, Mic,
  Filter, ArrowRight, ArrowUpRight, Building2, AlertTriangle, Minus, List, LayoutGrid,
  Sparkles, Video, Download, Headphones
} from "lucide-react";
import { UploadPerformanceReelModal } from "../components/UploadPerformanceReelModal";
import { WatchPerformanceReelModal } from "../components/WatchPerformanceReelModal";
import { NotificationCenterModal } from "../components/notifications/NotificationCenterModal";
import { LogoMark } from "../components/ui/Logo";
import { track } from "../../lib/tracker";

type Tab = "home" | "storefront" | "rates" | "calendar" | "orders" | "earnings" | "projects" | "activity" | "analytics";

const VIBE_TAGS = ["Dramatic", "Deep Texture", "British Accent", "Authoritative", "Warm"];

export const ADDED_BANK_ACCOUNTS = [
  { bankName: "Access Bank Plc", accountNumber: "9876543210", accountName: "EMEKA JOHNSON" },
  { bankName: "GTBank (Guaranty Trust Bank)", accountNumber: "0123456789", accountName: "EMEKA JOHNSON" },
  { bankName: "Zenith Bank Plc", accountNumber: "5544332211", accountName: "EMEKA JOHNSON" },
];

export interface ClientReviewItem {
  id: string;
  clientName: string;
  projectName: string;
  orderId: string;
  stars: number;
  tag: string;
  note: string;
  date: string;
}

export const DEFAULT_CLIENT_REVIEWS: ClientReviewItem[] = [
  {
    id: "rev-1",
    clientName: "FilmCraft Lagos",
    projectName: "Nollywood Drama Lead Monologue",
    orderId: "ORD-001",
    stars: 5,
    tag: "Exceptional delivery",
    note: "Emeka delivered an extraordinary, authentic performance. The dramatic timing and vocal delivery were pitch-perfect. Highly recommended!",
    date: "Oct 8, 2026",
  },
  {
    id: "rev-2",
    clientName: "Zenith Media Brands",
    projectName: "Fintech Commercial Voice-Over",
    orderId: "ORD-002",
    stars: 5,
    tag: "Fast turnaround",
    note: "Received clean studio-grade master files in under 24 hours. Flawless audio fidelity and followed the brief to the letter.",
    date: "Sep 28, 2026",
  },
  {
    id: "rev-3",
    clientName: "Pulse Africa Studios",
    projectName: "Brand Campaign Monologue & VO",
    orderId: "ORD-003",
    stars: 5,
    tag: "Creative & professional",
    note: "Remarkable depth and vocal range. A true professional who took minimal direction to hit the exact emotional tone we needed.",
    date: "Sep 15, 2026",
  },
  {
    id: "rev-4",
    clientName: "EventPro Abuja",
    projectName: "Live Stage Hosting & Monologue",
    orderId: "ORD-004",
    stars: 4.8,
    tag: "Great collaborator",
    note: "Commanded the room with immense charisma. On-time arrival and kept the audience fully engaged throughout the night.",
    date: "Aug 30, 2026",
  },
  {
    id: "rev-5",
    clientName: "EbonyLife Creative",
    projectName: "Period Drama Feature Audition",
    orderId: "ORD-005",
    stars: 5,
    tag: "Exceptional delivery",
    note: "Immaculate dialect work and character preparation. Stood out immediately during the executive producer review round.",
    date: "Aug 12, 2026",
  },
  {
    id: "rev-6",
    clientName: "Silverbird Communications",
    projectName: "Radio Station Promo Jingles & Drops",
    orderId: "ORD-006",
    stars: 4.9,
    tag: "Fast turnaround",
    note: "Super punchy voice-over with great energy. Mastered files arrived ahead of schedule with zero retakes needed.",
    date: "Jul 24, 2026",
  },
  {
    id: "rev-7",
    clientName: "Mainframe Film & TV",
    projectName: "Cultural Epic Supporting Character",
    orderId: "ORD-007",
    stars: 5,
    tag: "Creative & professional",
    note: "Deep emotional gravitas. Emeka brought real nuance to the monologue and hit every subtle emotional cue.",
    date: "Jul 10, 2026",
  },
  {
    id: "rev-8",
    clientName: "Ovation Red Carpet Media",
    projectName: "Corporate Gala Master of Ceremony",
    orderId: "ORD-008",
    stars: 4.8,
    tag: "Great collaborator",
    note: "Exuded elegance and warmth. Fluid stage command and great synchronization with the stage director.",
    date: "Jun 28, 2026",
  },
];

export const getRatingBadgeStyle = (stars: number) => {
  if (stars >= 5.0) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800";
  }
  if (stars >= 4.9) {
    return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800";
  }
  if (stars >= 4.7) {
    return "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800";
  }
  return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
};

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

export const CATEGORY_CHART_TIMEFRAMES: Record<
  "6m" | "3m" | "1y",
  {
    labels: string[];
    gig1: number[];
    gig2: number[];
    maxVal: number;
    ticks: { label: string; val: number }[];
  }
> = {
  "6m": {
    labels: ["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
    gig1: [60000, 110000, 190000, 140000, 290000, 240000, 340000],
    gig2: [35000, 60000, 110000, 85000, 120000, 150000, 175000],
    maxVal: 400000,
    ticks: [
      { label: "₦400k", val: 400000 },
      { label: "₦300k", val: 300000 },
      { label: "₦200k", val: 200000 },
      { label: "₦100k", val: 100000 },
      { label: "₦0", val: 0 },
    ],
  },
  "3m": {
    labels: ["Jul", "Aug", "Sep"],
    gig1: [290000, 240000, 340000],
    gig2: [120000, 150000, 175000],
    maxVal: 400000,
    ticks: [
      { label: "₦400k", val: 400000 },
      { label: "₦300k", val: 300000 },
      { label: "₦200k", val: 200000 },
      { label: "₦100k", val: 100000 },
      { label: "₦0", val: 0 },
    ],
  },
  "1y": {
    labels: ["Nov '25", "Jan '26", "Mar '26", "May '26", "Jul '26", "Aug '26", "Sep '26"],
    gig1: [45000, 70000, 120000, 190000, 290000, 240000, 340000],
    gig2: [25000, 40000, 75000, 110000, 120000, 150000, 175000],
    maxVal: 400000,
    ticks: [
      { label: "₦400k", val: 400000 },
      { label: "₦300k", val: 300000 },
      { label: "₦200k", val: 200000 },
      { label: "₦100k", val: 100000 },
      { label: "₦0", val: 0 },
    ],
  },
};


const RECUR_RULE_OPTIONS = [
  { value: "WEEKDAYS", label: "Every weekday (Mon–Fri)" },
  { value: "WEEKLY:MON", label: "Every Monday" },
  { value: "WEEKLY:TUE", label: "Every Tuesday" },
  { value: "WEEKLY:WED", label: "Every Wednesday" },
  { value: "WEEKLY:THU", label: "Every Thursday" },
  { value: "WEEKLY:FRI", label: "Every Friday" },
  { value: "WEEKLY:SAT", label: "Every Saturday" },
  { value: "WEEKLY:SUN", label: "Every Sunday" },
];

function recurRuleLabel(rule: string): string {
  return RECUR_RULE_OPTIONS.find((r) => r.value === rule)?.label ?? rule;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getWeekDaysISO(dateStr: string): string[] {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  const day = d.getUTCDay(); // 0 is Sun, 1 is Mon
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() + diffToMon);
  const result: string[] = [];
  for (let i = 0; i < 7; i++) {
    const curr = new Date(mon);
    curr.setUTCDate(mon.getUTCDate() + i);
    result.push(curr.toISOString().slice(0, 10));
  }
  return result;
}

function navigatePeriodISO(dateStr: string, view: "month" | "week" | "day", direction: "prev" | "next"): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  const step = direction === "next" ? 1 : -1;
  if (view === "month") {
    d.setUTCMonth(d.getUTCMonth() + step);
  } else if (view === "week") {
    d.setUTCDate(d.getUTCDate() + (step * 7));
  } else {
    d.setUTCDate(d.getUTCDate() + step);
  }
  return d.toISOString().slice(0, 10);
}

const SLOT_STATE_META: Record<SlotState, { label: string; color: string }> = {
  free: { label: "Free", color: "var(--color-success)" },
  unavailable: { label: "Unavailable", color: "var(--color-text-tertiary)" },
  booked: { label: "Booked", color: "var(--color-accent)" },
};

const NOTIFICATION_META: Record<string, { title: string; tone: "accent" | "success" }> = {
  booking_created: { title: "New Booking Request", tone: "accent" },
  payment_escrow_locked: { title: "Booking Confirmed", tone: "success" },
  deliverables_provided: { title: "Deliverables Submitted", tone: "accent" },
  payment_released: { title: "Payment Received", tone: "success" },
  payment_refunded: { title: "Payment Refunded", tone: "accent" },
  kyc_verified: { title: "Identity Verified", tone: "success" },
  kyc_failed: { title: "Verification Unsuccessful", tone: "accent" },
  new_message: { title: "New Message", tone: "accent" },
  tagging_done: { title: "Style Tags Generated", tone: "success" },
  calendar_disconnected: { title: "Calendar Disconnected", tone: "accent" },
  application_shortlisted: { title: "You've Been Shortlisted", tone: "accent" },
  application_selected: { title: "You've Been Selected!", tone: "success" },
  application_not_selected: { title: "Application Update", tone: "accent" },
  application_rejected: { title: "Application Update", tone: "accent" },
};

function describeNotification(n: { kind: string; payload: Record<string, unknown> }): string {
  if (typeof n.payload.message === "string") return n.payload.message;
  if (typeof n.payload.projectName === "string") return `"${n.payload.projectName}"`;
  if (typeof n.payload.bookingId === "string") return `Booking ${n.payload.bookingId}`;
  return "Tap to view details.";
}

const APPLICATION_STATUS_LABEL: Record<string, string> = {
  APPLIED: "Applied",
  SHORTLISTED: "Shortlisted",
  SELECTED: "Selected",
  REJECTED: "Not selected",
  WITHDRAWN: "Withdrawn",
};

export function isProjectOnline(project?: { location?: string; description?: string; projectName?: string } | null): boolean {
  if (!project) return false;
  const loc = (project.location || "").toLowerCase();
  const desc = (project.description || "").toLowerCase();
  const name = (project.projectName || "").toLowerCase();
  return (
    loc.includes("online") ||
    loc.includes("remote") ||
    desc.includes("online") ||
    desc.includes("remote") ||
    name.includes("voiceover") ||
    name.includes("voice-over")
  );
}

const TALENT_NAV_ITEMS: SidebarNavItem<Tab>[] = [
  { id: "home", label: "Dashboard", icon: Home },
  { id: "storefront", label: "My Profile", icon: User },
  { id: "rates", label: "Rate Cards", icon: DollarSign },
  { id: "calendar", label: "Availability", icon: Calendar },
  { id: "projects", label: "Projects", icon: Briefcase },
  { id: "orders", label: "Orders", icon: MessageSquare },
  { id: "earnings", label: "Earnings", icon: BarChart2 },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
];

const TALENT_BOTTOM_NAV_ITEMS: SidebarNavItem<Tab>[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "orders", label: "Orders", icon: MessageSquare },
  { id: "rates", label: "Rates", icon: DollarSign },
  { id: "projects", label: "Projects", icon: Briefcase },
  { id: "calendar", label: "Calendar", icon: Calendar },
];

export function TalentDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [talentProfile, setTalentProfile] = useState(() => appStateSync.getTalentProfile());
  const [showBalance, setShowBalance] = useState(true);
  const [editServiceId, setEditServiceId] = useState<string | null>(null);
  const [showAddService, setShowAddService] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const [newServiceTitle, setNewServiceTitle] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("45000");
  const [newServiceDelivery, setNewServiceDelivery] = useState("24 Hours");

  const handleSaveService = async () => {
    if (!newServiceTitle.trim()) return;
    if (!editServiceId && effectiveServices.length >= 2) {
      alert("You can only create up to 2 rate cards.");
      return;
    }
    const num = Number(newServicePrice.replace(/[^0-9]/g, "")) || 0;
    const formattedPrice = `${rateCardCurrency}${num.toLocaleString("en-US")}`;

    if (editServiceId) {
      await apiClient.updateService(editServiceId, {
        title: newServiceTitle,
        price: formattedPrice,
        delivery: newServiceDelivery,
      });
      setEditServiceId(null);
    } else {
      await apiClient.createService({
        title: newServiceTitle,
        price: formattedPrice,
        delivery: newServiceDelivery,
        bookings: 0,
      });
      setShowAddService(false);
    }
    const updated = await apiClient.listServices();
    setServices(updated.slice(0, 2));
    setNewServiceTitle("");
    setNewServicePrice("45,000");
    setNewServiceDelivery("24 Hours");
  };

  const handleDeleteService = async (id: string) => {
    await apiClient.deleteService(id);
    const updated = await apiClient.listServices();
    setServices(updated.slice(0, 2));
  };

  // features.md Phase 13 — day-detail + slot editor (PWA-08). getOpenSlots on
  // dayDetail is server-authoritative; everything the UI renders as "open" or
  // "blocked" comes from there, never a client-side recomputation.
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day">("month");
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newSlotStart, setNewSlotStart] = useState("09:00");
  const [newSlotEnd, setNewSlotEnd] = useState("17:00");
  const [newSlotState, setNewSlotState] = useState<Exclude<SlotState, "booked">>("unavailable");
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventKind, setNewEventKind] = useState<"personal" | "hold">("personal");
  const [newEventStart, setNewEventStart] = useState("09:00");
  const [newEventEnd, setNewEventEnd] = useState("10:00");
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recurRule, setRecurRule] = useState("WEEKDAYS");
  const [recurSlotStart, setRecurSlotStart] = useState("09:00");
  const [recurSlotEnd, setRecurSlotEnd] = useState("17:00");
  const [recurSlotState, setRecurSlotState] = useState<Exclude<SlotState, "booked">>("free");
  const [selectedEventModal, setSelectedEventModal] = useState<{
    id: string;
    title: string;
    date: string;
    start: string;
    end: string;
    kind?: string;
    venue?: string;
    description?: string;
    isSlot?: boolean;
    slotIndex?: number;
  } | null>(null);
  const [actionPopover, setActionPopover] = useState<{
    date: string;
    time?: string;
  } | null>(null);

  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("monologg_unavailable_dates");
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set(["2026-10-18", "2026-10-25"]);
  });

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; date: string } | null>(null);

  const [allEvents, setAllEvents] = useState<Record<string, CalendarEvent[]>>(() => {
    try {
      const saved = localStorage.getItem("monologg_calendar_events");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      "2026-10-08": [
        { id: "evt-mono-1", date: "2026-10-08", start: "14:00", end: "16:00", title: "Commercial Voice-Over Booking", kind: "booking", bookingId: "bk-101" },
      ],
      "2026-10-14": [
        { id: "evt-gcal-1", date: "2026-10-14", start: "10:00", end: "11:30", title: "Personal Rehearsal & Prep", kind: "personal", bookingId: null },
      ],
      "2026-10-21": [
        { id: "evt-mono-2", date: "2026-10-21", start: "13:00", end: "15:00", title: "Feature Film Audition Session", kind: "booking", bookingId: "bk-102" },
      ],
      "2026-08-05": [
        { id: "mock-event-1", date: "2026-08-05", start: "14:00", end: "15:00", title: "Table read", kind: "personal", bookingId: null },
      ],
    };
  });

  useEffect(() => {
    const handleOutsideClick = () => setContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    window.addEventListener("click", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const navigate = useNavigate();
  const [projectDetailTab, setProjectDetailTab] = useState<"overview" | "requirements" | "sides" | "escrow" | "application">("overview");
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);

  // Availability Check-in state
  const [checkins, setCheckins] = useState<AvailabilityCheckin[]>(() => appStateSync.getAvailabilityCheckins());
  const [checkinIndex, setCheckinIndex] = useState(1);
  const [checkinBannerMinimized, setCheckinBannerMinimized] = useState(false);
  const [checkinDetailsExpanded, setCheckinDetailsExpanded] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedCheckinToDecline, setSelectedCheckinToDecline] = useState<AvailabilityCheckin | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderViewMode, setOrderViewMode] = useState<"chat" | "cards">("chat");

  const handleConfirmCheckin = (checkinId: string) => {
    appStateSync.confirmAvailabilityCheckin(checkinId);
    setCheckins(appStateSync.getAvailabilityCheckins());
  };

  // Withdraw Sheet & Payout Change Request state
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(() => appStateSync.getBalance().available.toLocaleString());
  const [showChangeAccountForm, setShowChangeAccountForm] = useState(false);
  const [changeBankName, setChangeBankName] = useState("OPay (OPay Digital Services)");
  const [changeAccountNumber, setChangeAccountNumber] = useState("");
  const [changeAccountName, setChangeAccountName] = useState("");
  const [changePhoneNumber, setChangePhoneNumber] = useState("");
  const [changeLookupStatus, setChangeLookupStatus] = useState<BankLookupStatus>("idle");
  const [changeRequest, setChangeRequest] = useState<PayoutAccountChangeRequest | null>(() => appStateSync.getPayoutAccountChangeRequest());
  const [withdrawalSuccess, setWithdrawalSuccess] = useState<{ amount: number; account: string } | null>(null);
  const [withdrawStep, setWithdrawStep] = useState<"amount" | "passcode">("amount");
  const [withdrawPasscode, setWithdrawPasscode] = useState("");
  const [withdrawPasscodeError, setWithdrawPasscodeError] = useState<string | null>(null);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);

  // Paystack lookup simulation for Payout Account Change Request
  useEffect(() => {
    if (changeAccountNumber.length === 10) {
      setChangeLookupStatus("looking_up");
      const timer = setTimeout(() => {
        const kycName = appStateSync.getTalentProfile().name || "Emeka Johnson";
        if (changeAccountNumber === "0000000000") {
          setChangeLookupStatus("lookup_failed");
          setChangeAccountName("");
        } else if (changeAccountNumber.endsWith("1")) {
          const mismatchName = "JOHN CHUKWU";
          setChangeAccountName(mismatchName);
          setChangeLookupStatus("name_mismatch");
        } else {
          const matchedName = kycName.toUpperCase();
          setChangeAccountName(matchedName);
          setChangeLookupStatus("name_matches");
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setChangeLookupStatus("idle");
      setChangeAccountName("");
    }
  }, [changeAccountNumber, changeBankName]);
  const [payouts, setPayouts] = useState<Array<{ id: string; from: string; service: string; amount: string; numericAmount: number; date: string; time: string; status: "Paid" | "Pending" | "Processing"; ref: string; bankAccount: string }>>([
    { id: "p1", from: "FilmCraft Lagos", service: "Commercial Voice-Over", amount: "₦120,000", numericAmount: 120000, date: "Dec 14, 2024", time: "14:30", status: "Paid", ref: "PAY-2024-88412", bankAccount: `${appStateSync.getBankDetails().bankName} ···· ${appStateSync.getBankDetails().accountNumber.slice(-4)}` },
    { id: "p2", from: "EventPro Abuja", service: "Feature Film Audition", amount: "₦80,000", numericAmount: 80000, date: "Dec 10, 2024", time: "09:15", status: "Paid", ref: "PAY-2024-77301", bankAccount: `${appStateSync.getBankDetails().bankName} ···· ${appStateSync.getBankDetails().accountNumber.slice(-4)}` },
    { id: "p3", from: "Brand Agency NG", service: "Compere Booking", amount: "₦45,000", numericAmount: 45000, date: "Dec 6, 2024", time: "16:45", status: "Pending", ref: "PAY-2024-65129", bankAccount: `${appStateSync.getBankDetails().bankName} ···· ${appStateSync.getBankDetails().accountNumber.slice(-4)}` },
  ]);
  const [selectedPayout, setSelectedPayout] = useState<typeof payouts[0] | null>(null);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showClientReviewsModal, setShowClientReviewsModal] = useState(false);

  const allClientReviews = React.useMemo(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("monologg_performer_reviews") || "[]");
      const mapped = stored.map((s: any, idx: number) => ({
        id: `stored-${idx}`,
        clientName: s.clientName || "Verified Client",
        projectName: s.projectTitle || "Nollywood Drama Lead Monologue",
        orderId: s.orderId || "ORD-001",
        stars: s.stars || 5,
        tag: s.tag || "Exceptional delivery",
        note: s.note || "",
        date: s.createdAt || "Just now",
      }));
      return [...mapped, ...DEFAULT_CLIENT_REVIEWS];
    } catch {
      return DEFAULT_CLIENT_REVIEWS;
    }
  }, [showReviewsModal]);

  const [chartTimeframe, setChartTimeframe] = useState<"6m" | "3m" | "1y">("6m");
  const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(null);

  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewRatingFilter, setReviewRatingFilter] = useState<"all" | "5" | "4.9" | "4.8" | "4">("all");
  const [reviewClientFilter, setReviewClientFilter] = useState("all");
  const [reviewSortOrder, setReviewSortOrder] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [reviewTagFilter, setReviewTagFilter] = useState("all");

  const handleResetReviewFilters = () => {
    setReviewSearch("");
    setReviewRatingFilter("all");
    setReviewClientFilter("all");
    setReviewSortOrder("newest");
    setReviewTagFilter("all");
  };

  const uniqueReviewClients = React.useMemo(() => {
    return Array.from(new Set(allClientReviews.map((r) => r.clientName)));
  }, [allClientReviews]);

  const uniqueReviewTags = React.useMemo(() => {
    return Array.from(new Set(allClientReviews.map((r) => r.tag).filter(Boolean)));
  }, [allClientReviews]);

  const filteredAndSortedReviews = React.useMemo(() => {
    return allClientReviews
      .filter((rev) => {
        if (reviewSearch.trim()) {
          const q = reviewSearch.toLowerCase().trim();
          const matchesClient = rev.clientName.toLowerCase().includes(q);
          const matchesProject = rev.projectName.toLowerCase().includes(q);
          const matchesNote = rev.note.toLowerCase().includes(q);
          const matchesTag = rev.tag.toLowerCase().includes(q);
          if (!matchesClient && !matchesProject && !matchesNote && !matchesTag) {
            return false;
          }
        }
        if (reviewRatingFilter === "5" && rev.stars < 4.95) return false;
        if (reviewRatingFilter === "4.9" && (rev.stars < 4.85 || rev.stars >= 4.95)) return false;
        if (reviewRatingFilter === "4.8" && (rev.stars < 4.75 || rev.stars >= 4.85)) return false;
        if (reviewRatingFilter === "4" && (rev.stars < 3.95 || rev.stars >= 4.95)) return false;
        if (reviewClientFilter !== "all" && rev.clientName !== reviewClientFilter) return false;
        if (reviewTagFilter !== "all" && rev.tag !== reviewTagFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (reviewSortOrder === "newest") {
          const timeA = Date.parse(a.date) || Date.now();
          const timeB = Date.parse(b.date) || Date.now();
          return timeB - timeA;
        }
        if (reviewSortOrder === "oldest") {
          const timeA = Date.parse(a.date) || Date.now();
          const timeB = Date.parse(b.date) || Date.now();
          return timeA - timeB;
        }
        if (reviewSortOrder === "highest") {
          return b.stars - a.stars;
        }
        if (reviewSortOrder === "lowest") {
          return a.stars - b.stars;
        }
        return 0;
      });
  }, [allClientReviews, reviewSearch, reviewRatingFilter, reviewClientFilter, reviewSortOrder, reviewTagFilter]);

  const [stats, setStats] = useState<StatMetric[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activitySearch, setActivitySearch] = useState("");
  const [activityFilter, setActivityFilter] = useState<"all" | "booking" | "payment" | "message">("all");
  const [services, setServices] = useState<ServiceRateCard[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // features.md Phase 14 (PWA-14/15/16) — project discovery & applications.
  const [projectsSubTab, setProjectsSubTab] = useState<"browse" | "applications">("browse");
  const [projects, setProjects] = useState<Project[]>([]);
  const [myApplications, setMyApplications] = useState<MyApplication[]>([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectRoleFilter, setProjectRoleFilter] = useState("all");
  const [projectBudgetFilter, setProjectBudgetFilter] = useState("all");
  const [projectBudgetSlider, setProjectBudgetSlider] = useState(0);
  const [projectStatusFilter, setProjectStatusFilter] = useState("all");
  const [projectLocationFilter, setProjectLocationFilter] = useState("all");
  const [projectRatingFilter, setProjectRatingFilter] = useState("all");
  const [projectRatingSlider, setProjectRatingSlider] = useState(0);
  const [showProjectFilterModal, setShowProjectFilterModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [pitchText, setPitchText] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [rateCardCurrency, setRateCardCurrency] = useState("₦");
  const currentUser = appStateSync.getLoggedInUser();
  const [isNewUser, setIsNewUser] = useState(() => {
    const stored = localStorage.getItem("monologg_is_new_user");
    if (stored !== null) return stored === "true";
    return currentUser ? (currentUser.isNewUser ?? false) : false;
  });

  const effectiveServices = services;
  const effectiveOrders = isNewUser ? [] : orders;
  const effectiveApplications = isNewUser ? [] : myApplications;
  const effectivePayouts = isNewUser ? [] : payouts;
  const effectiveActivity = isNewUser ? [] : activity;
  const effectiveStats = isNewUser
    ? [
        { label: "Available Balance", value: "₦0" },
        { label: "Completed Bookings", value: "0" },
        { label: "Active Orders", value: "0" },
        { label: "Profile Views", value: "0" },
      ]
    : stats;

  // Google Calendar Sync State (state-sync.ts)
  const [calendarSync, setCalendarSync] = useState(() => appStateSync.getCalendarSync());

  const handleConnectCalendarSync = () => {
    const email = currentUser?.email || "alex.morgan@gmail.com";
    const updated = appStateSync.setCalendarSync({
      connected: true,
      email,
      provider: "google",
      lastSyncedAt: new Date().toISOString(),
    });
    setCalendarSync(updated);
  };

  const handleDisconnectCalendarSync = () => {
    const updated = appStateSync.setCalendarSync({
      connected: false,
      email: undefined,
      provider: undefined,
    });
    setCalendarSync(updated);
  };

  // In-Page Profile Editing State (Airbnb / Upwork / Linktree inspired)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(talentProfile.name || "Emeka Johnson");
  const [editStageTitle, setEditStageTitle] = useState(talentProfile.stageTitle || "Actor & Voice Artist");
  const [editLocation, setEditLocation] = useState(talentProfile.location || "Lagos, Nigeria");
  const [editBio, setEditBio] = useState(talentProfile.bio || "");
  const [editIsAvailable, setEditIsAvailable] = useState(talentProfile.isAvailable ?? true);
  const [editTags, setEditTags] = useState<string[]>(talentProfile.tags || VIBE_TAGS);
  const [newTagInput, setNewTagInput] = useState("");
  const [editSocials, setEditSocials] = useState(
    talentProfile.socialLinks || {
      instagram: "emekajohnson",
      youtube: "emekaofficial",
      twitter: "emekaj",
      tiktok: "emekaacts",
      spotify: "",
      linkedin: "emeka-johnson",
    }
  );
  const [editCoverUrl, setEditCoverUrl] = useState<string | null>(talentProfile.coverUrl || null);
  const [editCoverPreset, setEditCoverPreset] = useState<string>(talentProfile.coverPreset || "crimson-studio");
  const [profileSaveToast, setProfileSaveToast] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [showUploadReelModal, setShowUploadReelModal] = useState(false);
  const [showWatchReelModal, setShowWatchReelModal] = useState(false);

  // Profile Completeness Gate Formula
  const hasBio = Boolean(
    talentProfile.bio &&
    talentProfile.bio.trim().length > 10 &&
    !talentProfile.bio.toLowerCase().includes("no bio")
  );
  const hasLocation = Boolean(talentProfile.location && talentProfile.location.trim().length > 0);
  const hasRateCard = effectiveServices.length > 0;
  const hasReel = Boolean(talentProfile.hasReel || talentProfile.performanceReelUrl || !isNewUser);
  const isProfileComplete = Boolean(hasBio && hasLocation && hasRateCard && hasReel);

  // Sync edit form with talentProfile
  useEffect(() => {
    if (!isEditingProfile) {
      setEditName(talentProfile.name || (currentUser?.name || "New Creative Performer"));
      setEditStageTitle(talentProfile.stageTitle || "Actor & Voice Artist");
      setEditLocation(talentProfile.location || "Lagos, Nigeria");
      setEditBio(talentProfile.bio || "");
      setEditIsAvailable(talentProfile.isAvailable ?? true);
      setEditTags(talentProfile.tags || VIBE_TAGS);
      setEditSocials(
        talentProfile.socialLinks || {
          instagram: "emekajohnson",
          youtube: "emekaofficial",
          twitter: "emekaj",
          tiktok: "emekaacts",
          spotify: "",
          linkedin: "emeka-johnson",
        }
      );
      setEditCoverUrl(talentProfile.coverUrl || null);
      setEditCoverPreset(talentProfile.coverPreset || "crimson-studio");
    }
  }, [talentProfile, isEditingProfile, currentUser]);

  const handleSaveProfile = async () => {
    const updates = {
      name: editName.trim() || talentProfile.name,
      stageTitle: editStageTitle.trim() || "Actor & Voice Artist",
      location: editLocation.trim() || "Lagos, Nigeria",
      bio: editBio.trim(),
      isAvailable: editIsAvailable,
      tags: editTags,
      socialLinks: editSocials,
      coverUrl: editCoverUrl,
      coverPreset: editCoverPreset,
    };

    appStateSync.updateTalentProfile(updates);
    try {
      await apiClient.updateCreatorProfile({
        name: updates.name,
        bio: updates.bio,
        location: updates.location,
      });
    } catch {}

    setTalentProfile(appStateSync.getTalentProfile());
    setIsEditingProfile(false);
    setProfileSaveToast(true);
    setTimeout(() => setProfileSaveToast(false), 3000);
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const url = evt.target?.result as string;
      setEditCoverUrl(url);
      setEditCoverPreset("custom");
      appStateSync.updateTalentProfile({ coverUrl: url, coverPreset: "custom" });
      setTalentProfile(appStateSync.getTalentProfile());
    };
    reader.readAsDataURL(file);
  };

  const getBannerBackground = () => {
    if (talentProfile.coverUrl) {
      return `url(${talentProfile.coverUrl}) center / cover no-repeat`;
    }
    switch (talentProfile.coverPreset) {
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

  useEffect(() => {
    const sync = () => {
      setTalentProfile(appStateSync.getTalentProfile());
      apiClient.listProjects().then(setProjects);
      apiClient.listServices().then(setServices);
    };
    const unsub = appStateSync.subscribe(sync);

    apiClient.getTalentStats().then(setStats);
    apiClient.listTalentActivity().then(setActivity);
    apiClient.listServices().then((srvs) => {
      const storedServices = appStateSync.getServices();
      if (isNewUser && (!storedServices || storedServices.length === 0)) {
        setServices([]);
      } else {
        setServices(srvs.slice(0, 2));
      }
    });
    apiClient.listTalentOrders().then(setOrders);
    apiClient.listNotifications().then(({ notifications, unreadCount }) => {
      setNotifications(notifications);
      setUnreadCount(unreadCount);
    });

    return unsub;
  }, [isNewUser]);

  const loadProjects = () => {
    apiClient.listProjects().then(setProjects);
  };
  const loadMyApplications = () => {
    apiClient.listMyApplications().then(setMyApplications);
  };

  useEffect(() => {
    if (activeTab !== "projects") return;
    if (projectsSubTab === "browse") loadProjects();
    else loadMyApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, projectsSubTab]);

  const handleApply = async () => {
    if (!selectedProject) return;
    if (!isProfileComplete) {
      setApplyError("You must complete your profile (bio, rate card, and performance reel) before applying to projects.");
      return;
    }
    setApplying(true);
    setApplyError(null);
    try {
      await apiClient.applyToProject(selectedProject.id, pitchText.trim() || undefined);
      loadProjects();
      setSelectedProject((prev) =>
        prev
          ? {
              ...prev,
              applicantCount: prev.applicantCount + 1,
              myApplication: { id: `app-${Date.now()}`, status: "APPLIED", pitch: pitchText.trim() || null },
            }
          : null
      );
      setPitchText("");
    } catch {
      setApplyError("That project just closed to new applications — please try another.");
    } finally {
      setApplying(false);
    }
  };

  const handleWithdrawApplication = async (applicationId: string) => {
    await apiClient.withdrawMyApplication(applicationId);
    setMyApplications((prev) => prev.map((a) => (a.id === applicationId ? { ...a, status: "WITHDRAWN" } : a)));
    setSelectedProject((prev) =>
      prev && prev.myApplication?.id === applicationId
        ? { ...prev, myApplication: { ...prev.myApplication, status: "WITHDRAWN" } }
        : prev
    );
  };

  const activeProjectFilterCount =
    (projectRoleFilter !== "all" ? 1 : 0) +
    (projectBudgetSlider > 0 || projectBudgetFilter !== "all" ? 1 : 0) +
    (projectRatingSlider > 0 || projectRatingFilter !== "all" ? 1 : 0) +
    (projectStatusFilter !== "all" ? 1 : 0) +
    (projectLocationFilter !== "all" ? 1 : 0);

  const resetProjectFilters = () => {
    setProjectRoleFilter("all");
    setProjectBudgetSlider(0);
    setProjectBudgetFilter("all");
    setProjectRatingSlider(0);
    setProjectRatingFilter("all");
    setProjectStatusFilter("all");
    setProjectLocationFilter("all");
  };

  const filteredProjects = projects.filter((p) => {
    const q = projectSearch.trim().toLowerCase();
    const matchesSearch = !q || p.projectName.toLowerCase().includes(q) || p.projectType.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q);
    const roleTarget = projectRoleFilter.toLowerCase();
    const matchesRole =
      projectRoleFilter === "all" ||
      p.projectType.toLowerCase().includes(roleTarget) ||
      p.nicheReq.some((n) => n.toLowerCase().includes(roleTarget) || (roleTarget === "voice-over" && n.toLowerCase().includes("vo")));
    const budgetNum = Number(p.budget.replace(/[^0-9]/g, "")) || 0;
    const matchesBudget =
      (projectBudgetSlider === 0 || budgetNum >= projectBudgetSlider) &&
      (projectBudgetFilter === "all"
        || (projectBudgetFilter === "under100" && budgetNum < 100000)
        || (projectBudgetFilter === "100to300" && budgetNum >= 100000 && budgetNum <= 300000)
        || (projectBudgetFilter === "over300" && budgetNum > 300000));
    const matchesStatus = projectStatusFilter === "all"
      || (projectStatusFilter === "open" && p.applicationsOpen && !p.myApplication)
      || (projectStatusFilter === "applied" && Boolean(p.myApplication))
      || (projectStatusFilter === "closed" && !p.applicationsOpen);
    const loc = (p.location || "Lagos, NG (Hybrid/Remote)").toLowerCase();
    const matchesLocation = projectLocationFilter === "all"
      || (projectLocationFilter === "lagos" && loc.includes("lagos"))
      || (projectLocationFilter === "abuja" && loc.includes("abuja"))
      || (projectLocationFilter === "remote" && (loc.includes("remote") || loc.includes("online")));
    const clientRating = p.clientRating ?? 4.8;
    const matchesRating =
      (projectRatingSlider === 0 || clientRating >= projectRatingSlider) &&
      (projectRatingFilter === "all"
        || (projectRatingFilter === "4.8" && clientRating >= 4.8)
        || (projectRatingFilter === "4.5" && clientRating >= 4.5)
        || (projectRatingFilter === "4.0" && clientRating >= 4.0));

    return matchesSearch && matchesRole && matchesBudget && matchesStatus && matchesLocation && matchesRating;
  });

  const handleToggleUnavailable = (date: string, isUnavailable: boolean) => {
    setUnavailableDates((prev) => {
      const next = new Set(prev);
      if (isUnavailable) next.add(date);
      else next.delete(date);
      try {
        localStorage.setItem("monologg_unavailable_dates", JSON.stringify([...next]));
      } catch {}
      return next;
    });

    if (dayDetail && dayDetail.date === date) {
      if (isUnavailable) {
        setDayDetail({
          ...dayDetail,
          openSlots: [],
          block: {
            id: dayDetail.block?.id ?? "unavail-block",
            slots: [{ start: "00:00", end: "23:59", state: "unavailable" }],
            isRecurring: false,
            recurRule: null,
          },
        });
      } else {
        setDayDetail({
          ...dayDetail,
          openSlots: [{ start: "00:00", end: "23:59" }],
          block: null,
        });
      }
    }
  };

  const loadDay = (date: string) => {
    setLoadingDay(true);
    apiClient.getAvailabilityDay(date).then((detail) => {
      const storedEvents = allEvents[date] || [];
      const mergedEvents = [...storedEvents];
      detail.events.forEach((de) => {
        if (!mergedEvents.some((me) => me.id === de.id)) {
          mergedEvents.push(de);
        }
      });
      detail.events = mergedEvents;
      if (unavailableDates.has(date)) {
        detail.openSlots = [];
      }
      setDayDetail(detail);
      setLoadingDay(false);
      track("calendar_day_opened", { slotCount: detail.openSlots?.length ?? 0 });
    });
  };

  useEffect(() => {
    if (activeTab === "calendar") loadDay(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedDate]);

  // Mock mode's api-client writes are no-ops (see api-client.ts's own doc
  // comments) — these handlers update dayDetail optimistically themselves
  // rather than re-fetching afterward, the same "mock mode simulates locally"
  // pattern Settings.tsx/ProjectBrief.tsx already use, so a demo session's
  // edits stay visible instead of reverting to the static fixture.
  const handleAddSlot = async () => {
    const slot: Slot = { start: newSlotStart, end: newSlotEnd, state: newSlotState };
    if (dayDetail?.block) {
      const slots = [...dayDetail.block.slots, slot];
      await apiClient.updateAvailabilityBlock(dayDetail.block.id, { slots });
      setDayDetail({ ...dayDetail, block: { ...dayDetail.block, slots } });
    } else {
      const created = await apiClient.createAvailabilityBlock({ date: selectedDate, slots: [slot] });
      setDayDetail((prev) =>
        prev ? { ...prev, block: { id: created?.id ?? "local-block", slots: [slot], isRecurring: false, recurRule: null } } : prev,
      );
    }
    setShowAddSlot(false);
    setNewSlotStart("09:00");
    setNewSlotEnd("17:00");
  };

  const handleRemoveSlot = async (index: number) => {
    if (!dayDetail?.block) return;
    const slots = dayDetail.block.slots.filter((_, i) => i !== index);
    await apiClient.updateAvailabilityBlock(dayDetail.block.id, { slots });
    setDayDetail({ ...dayDetail, block: { ...dayDetail.block, slots } });
  };

  const handleAddEvent = async () => {
    if (!newEventTitle.trim()) return;
    const created = await apiClient.createCalendarEvent({
      date: selectedDate,
      start: newEventStart,
      end: newEventEnd,
      title: newEventTitle,
      kind: newEventKind,
    });
    const event: CalendarEvent = created ?? {
      id: `local-event-${Date.now()}`,
      date: selectedDate,
      start: newEventStart,
      end: newEventEnd,
      title: newEventTitle,
      kind: newEventKind,
      bookingId: null,
    };
    setDayDetail((prev) => (prev ? { ...prev, events: [...prev.events, event].sort((a, b) => a.start.localeCompare(b.start)) } : prev));
    setAllEvents((prev) => {
      const existing = prev[selectedDate] || [];
      const next = { ...prev, [selectedDate]: [...existing, event] };
      try {
        localStorage.setItem("monologg_calendar_events", JSON.stringify(next));
      } catch {}
      return next;
    });
    setShowAddEvent(false);
    setNewEventTitle("");
  };

  const handleDeleteEvent = async (id: string) => {
    await apiClient.deleteCalendarEvent(id);
    setDayDetail((prev) => (prev ? { ...prev, events: prev.events.filter((e) => e.id !== id) } : prev));
    setAllEvents((prev) => {
      const existing = prev[selectedDate] || [];
      const next = { ...prev, [selectedDate]: existing.filter((e) => e.id !== id) };
      try {
        localStorage.setItem("monologg_calendar_events", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleAddRecurring = async () => {
    const slot: Slot = { start: recurSlotStart, end: recurSlotEnd, state: recurSlotState };
    const created = await apiClient.createAvailabilityBlock({ date: selectedDate, slots: [slot], isRecurring: true, recurRule });
    setDayDetail((prev) =>
      prev
        ? { ...prev, recurringTemplates: [...prev.recurringTemplates, { id: created?.id ?? "local-recurring", slots: [slot], recurRule }] }
        : prev,
    );
    setShowRecurringForm(false);
  };

  // Refetch on open so the badge/count reflect anything that arrived since
  // the initial load — real per-user data, not a static fixture.
  const openNotifications = () => {
    setShowNotifications(true);
    apiClient.listNotifications().then(({ notifications, unreadCount }) => {
      setNotifications(notifications);
      setUnreadCount(unreadCount);
    });
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    apiClient.markNotificationRead(id);
  };

  const screenTitle =
    activeTab === "home" ? "Dashboard"
    : activeTab === "storefront" ? "My Profile"
    : activeTab === "rates" ? "Rate Cards"
    : activeTab === "calendar" ? "Availability"
    : activeTab === "projects" ? "Projects"
    : activeTab === "orders" ? "Active Orders"
    : activeTab === "analytics" ? "Analytics"
    : activeTab === "activity" ? "Recent Activity"
    : "Earnings";

  const talentName = talentProfile.name || "Emeka Johnson";
  const talentInitials = talentName.split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]!.toUpperCase()).join("") || "EJ";
  const firstName = talentName.split(/\s+/)[0] || "Emeka";

  return (
    <div className="role-talent min-h-screen overflow-x-hidden" style={{ background: "var(--color-bg-canvas)" }}>
      <Sidebar
        portalLabel="Performer Portal"
        navItems={TALENT_NAV_ITEMS}
        activeTab={activeTab}
        onTab={setActiveTab}
        onNavigate={navigate}
        onSignOut={async () => { await apiClient.logout(); navigate("/"); }}
        identity={{
          initials: talentInitials,
          name: talentName,
          avatarUrl: talentProfile.avatarUrl ?? undefined,
          subtitle: (
            <span className="flex items-center gap-1" style={{ color: "var(--color-success)" }}>
              <Shield className="w-3 h-3" /> Verified
            </span>
          ),
        }}
      />

      {/* Mobile top bar */}
      <div
        className="lg:hidden flex items-center justify-between px-4 sm:px-5 py-2.5 sticky top-0 z-40 glass-panel"
        style={{ borderLeft: "none", borderRight: "none", borderTop: "none" }}
      >
        <div className="min-w-0 flex-1 mr-2">
          <div className="text-[11px] font-body tracking-normal truncate" style={{ color: "var(--color-text-tertiary)" }}>Good morning, {firstName}</div>
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
          <button aria-label="View notifications" onClick={openNotifications} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center relative hover:opacity-80 transition-opacity" style={{ background: "var(--color-bg-elevated)" }}>
            <Bell className="w-[18px] h-[18px]" style={{ color: "var(--color-text-secondary)" }} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2" style={{ background: "var(--color-accent)", "--tw-ring-color": "var(--color-bg-surface)" } as React.CSSProperties}></span>
            )}
          </button>
          <button
            aria-label="Go to settings"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm font-body hover:opacity-80 transition-opacity border"
            style={{
              background: "var(--color-accent-soft)",
              color: "var(--color-accent)",
              borderColor: "var(--color-hairline)",
            }}
            onClick={() => navigate("/settings")}
          >
            {talentInitials}
          </button>
        </div>
      </div>

      {/* Main content */}
      <main id="main-content" className="lg:pl-60 pb-28 lg:pb-0">
        <div className="max-w-5xl mx-auto px-4 py-6 lg:px-8 lg:py-8">

          {/* Desktop page header */}
          <div className={`hidden ${activeTab === "projects" && selectedProject ? "lg:hidden" : "lg:flex"} items-center justify-between mb-8`}>
            <div>
              <h1 className="font-display text-3xl" style={{ color: "var(--color-text-primary)" }}>
                {activeTab === "home" && `Good morning, ${firstName} 👋`}
                {activeTab === "storefront" && "My Profile"}
                {activeTab === "rates" && "Rate Cards"}
                {activeTab === "calendar" && "Availability"}
                {activeTab === "projects" && "Projects"}
                {activeTab === "orders" && "Active Orders"}
                {activeTab === "earnings" && "Earnings"}
                {activeTab === "analytics" && "Performance & Analytics"}
              </h1>
              <p className="text-sm font-body mt-1" style={{ color: "var(--color-text-secondary)" }}>
                {activeTab === "home" && "Here's what's happening with your career today."}
                {activeTab === "storefront" && "Your public profile — share this with clients."}
                {activeTab === "rates" && "Define your services and pricing."}
                {activeTab === "calendar" && "Set your availability for bookings."}
                {activeTab === "projects" && "Find and apply to client projects."}
                {activeTab === "orders" && "Manage your active collaborations."}
                {activeTab === "earnings" && "Track your income and performance."}
                {activeTab === "analytics" && `Track profile impressions, booking conversion, and earnings velocity for ${talentProfile.name}.`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {activeTab === "storefront" && (
                <div className="flex items-center gap-2">
                  <Button
                    variant={isEditingProfile ? "primary" : "secondary"}
                    className="h-10 px-4 text-sm gap-2"
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                  >
                    <Edit2 className="w-4 h-4" /> {isEditingProfile ? "Preview Profile" : "Edit Profile"}
                  </Button>
                  <Button variant="secondary" className="h-10 px-4 text-sm gap-2" onClick={() => setShowShare(true)}>
                    <Share2 className="w-4 h-4" /> Share Profile
                  </Button>
                </div>
              )}
              {activeTab === "rates" && effectiveServices.length === 1 && (
                <Button
                  className="h-10 px-4 text-sm gap-2"
                  onClick={() => {
                    setEditServiceId(null);
                    setNewServiceTitle("");
                    setNewServicePrice("45000");
                    setNewServiceDelivery("24 Hours");
                    setShowAddService(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Add Rate Card
                </Button>
              )}
              <button aria-label="View notifications" onClick={openNotifications} className="w-10 h-10 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity relative" style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
                <Bell className="w-4 h-4" style={{ color: "var(--color-text-secondary)" }} />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-accent)" }}></span>
                )}
              </button>
            </div>
          </div>

          {/* Availability Check-in Card (deep-linkable & top of talent dashboard) */}
          {(() => {
            const activeCheckin = checkins[checkinIndex % (checkins.length || 1)] || checkins[0];
            if (!activeCheckin || selectedProject) return null;
            const isConfirmed = activeCheckin.status === "done";
            const isOverdue = activeCheckin.isOverdue || activeCheckin.status === "missed";
            const isCancelled = appStateSync.isBookingCancelled(activeCheckin.bookingId);

            // Progressive disclosure: when attendance is already verified on non-Home tabs (or user minimized),
            // render the slim verified command strip so primary tab content stays above the fold on mobile.
            const showSlimBanner =
              (checkinBannerMinimized && !isCancelled) ||
              (isConfirmed && !isCancelled && activeTab !== "home" && !checkinDetailsExpanded);

            if (showSlimBanner) {
              return (
                <div className="mb-5 px-3.5 sm:px-4 py-2.5 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] flex items-center justify-between gap-2.5 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isConfirmed ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                    <Badge
                      tone={isConfirmed ? "success" : isOverdue ? "warning" : "accent"}
                      size="sm"
                    >
                      {isConfirmed
                        ? "Verified"
                        : isOverdue
                        ? "Action Required"
                        : `Gate ${activeCheckin.stepIndex}/${activeCheckin.totalSteps}`}
                    </Badge>
                    <span className="font-semibold text-xs sm:text-sm text-[var(--color-text-primary)] truncate">
                      {isConfirmed
                        ? `Session Confirmed with ${activeCheckin.clientName}`
                        : `Confirm attendance for ${activeCheckin.clientName}`}
                    </span>
                    <span className="text-xs text-[var(--color-text-tertiary)] hidden md:inline truncate">
                      {isConfirmed ? "Confirmed for production" : `due ${activeCheckin.dueDate}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isConfirmed && (
                      <Button size="sm" className="h-7 px-3 text-xs font-semibold" onClick={() => handleConfirmCheckin(activeCheckin.id)}>
                        Confirm
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setCheckinBannerMinimized(false);
                        setCheckinDetailsExpanded(true);
                      }}
                      className="px-2 py-1 rounded-md hover:bg-[var(--color-bg-elevated)] text-[11px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer inline-flex items-center gap-1"
                      title="Expand attendance card"
                      aria-label="Expand attendance card"
                    >
                      <span className="hidden sm:inline">Details</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                className={`mb-5 sm:mb-6 p-4 sm:p-6 rounded-2xl border transition-all ${
                  isCancelled
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100"
                    : isConfirmed
                    ? "bg-emerald-500/[0.04] border-emerald-500/30 shadow-xs"
                    : isOverdue
                    ? "bg-amber-500/[0.06] border-amber-500/40 shadow-xs"
                    : "bg-[var(--color-bg-surface)] border-[var(--color-border-default)] shadow-xs"
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 mb-3.5">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {checkins.length > 1 && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              aria-label="Previous check-in milestone"
                              onClick={() => setCheckinIndex((prev) => (prev - 1 + checkins.length) % checkins.length)}
                              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] transition-colors cursor-pointer border border-[var(--color-hairline)]"
                              title="Previous check-in milestone"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Next check-in milestone"
                              onClick={() => setCheckinIndex((prev) => (prev + 1) % checkins.length)}
                              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] transition-colors cursor-pointer border border-[var(--color-hairline)]"
                              title="Next check-in milestone"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <Badge
                          tone={isCancelled ? "error" : isConfirmed ? "success" : isOverdue ? "warning" : "accent"}
                          className={isConfirmed ? "badge-confirmed" : ""}
                          size="sm"
                        >
                          {isCancelled
                            ? "Cancelled & Refunded"
                            : isConfirmed
                            ? "Attendance Verified"
                            : isOverdue
                            ? "Action Required"
                            : `Milestone Gate ${activeCheckin.stepIndex} of ${activeCheckin.totalSteps}`}
                        </Badge>
                        <span className="text-xs text-[var(--color-text-tertiary)] font-body">
                          {isConfirmed ? "Confirmed for production" : `due ${activeCheckin.dueDate}`}
                        </span>
                      </div>

                      {/* Mobile minimize button in top-right corner */}
                      <button
                        type="button"
                        onClick={() => {
                          setCheckinBannerMinimized(true);
                          setCheckinDetailsExpanded(false);
                        }}
                        className="sm:hidden p-1 rounded-lg border border-[var(--color-hairline)] hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                        title="Minimize notification"
                        aria-label="Minimize notification"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h2 className="font-display text-base sm:text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
                      {isCancelled
                        ? "Booking Cancelled & Refunded"
                        : isConfirmed
                        ? `Session Confirmed with ${activeCheckin.clientName}`
                        : `Confirm attendance for ${activeCheckin.clientName}`}
                    </h2>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      {isCancelled
                        ? `Performer declined check-in. Booking with ${activeCheckin.clientName} was cancelled and ₦${activeCheckin.baseRate.toLocaleString()} refunded.`
                        : isConfirmed
                        ? `Your attendance is locked in. Next verification gate scheduled for ${activeCheckin.nextCheckinDate || "Mon 23 Nov 2026"} (2 days prior to event).`
                        : `Confirm your attendance to keep your booking reserved with ${activeCheckin.clientName}.`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0">
                    <div className="flex sm:flex-col items-baseline sm:items-end gap-2 sm:gap-0">
                      <div className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-semibold font-body">
                        {isCancelled ? "Refund Processed" : "Net Take-Home"}
                      </div>
                      <div className={`font-mono font-black text-sm sm:text-lg ${isCancelled ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                        ₦{isCancelled ? activeCheckin.baseRate.toLocaleString() : activeCheckin.performerReceives.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCheckinDetailsExpanded((prev) => !prev)}
                        className="px-2.5 py-1 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-bg-elevated)] text-[11px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>{checkinDetailsExpanded ? "Hide Details" : "Event Details"}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${checkinDetailsExpanded ? "rotate-180" : ""}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCheckinBannerMinimized(true);
                          setCheckinDetailsExpanded(false);
                        }}
                        className="hidden sm:inline-flex p-1.5 rounded-lg border border-[var(--color-hairline)] hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                        title="Minimize notification"
                        aria-label="Minimize notification"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Event details summary (Progressive disclosure when confirmed, or always shown when action required / expanded) */}
                {(!isConfirmed || checkinDetailsExpanded) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 p-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-hairline)] mb-3.5 text-xs font-body">
                    <div className="space-y-0.5">
                      <span className="text-[var(--color-text-tertiary)] block text-[10px] uppercase tracking-wider font-semibold">Event Name</span>
                      <span className="font-semibold text-[var(--color-text-primary)]">{activeCheckin.eventName}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[var(--color-text-tertiary)] block text-[10px] uppercase tracking-wider font-semibold">Date &amp; Time</span>
                      <span className="font-semibold text-[var(--color-text-primary)]">{activeCheckin.eventDate}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[var(--color-text-tertiary)] block text-[10px] uppercase tracking-wider font-semibold">Location &amp; Client</span>
                      <span className="font-semibold text-[var(--color-text-primary)]">{activeCheckin.location} · {activeCheckin.clientName}</span>
                    </div>
                  </div>
                )}

                {/* Status action row */}
                {isCancelled ? (
                  <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-body flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>Order {activeCheckin.bookingId} cancelled. Client was refunded ₦{activeCheckin.baseRate.toLocaleString()} automatically via Paystack.</span>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-600 text-white shrink-0">
                      Cancelled
                    </span>
                  </div>
                ) : isConfirmed ? (
                  <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-200 text-xs font-body flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Attendance confirmed. {activeCheckin.clientName} has been notified and production scheduling is verified.</span>
                    </div>
                    <span className="badge-confirmed text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shrink-0">
                      Confirmed ✓
                    </span>
                  </div>
                ) : (
                  <div>
                    {isOverdue && (
                      <div className="mb-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs font-body flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Confirm now — {activeCheckin.clientName} has been notified that your confirmation is pending.</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2.5 sm:gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCheckinToDecline(activeCheckin);
                          setShowDeclineModal(true);
                        }}
                        className="flex-1 sm:flex-initial h-9 px-4 text-xs font-medium rounded-xl border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:text-red-500 hover:border-red-400 transition-colors cursor-pointer bg-[var(--color-bg-surface)]"
                      >
                        I can&apos;t make it
                      </button>
                      <Button
                        className="flex-1 sm:flex-initial h-9 px-5 text-xs font-bold gap-1.5 shadow-sm"
                        onClick={() => {
                          appStateSync.confirmAvailabilityCheckin(activeCheckin.id);
                          setCheckins(appStateSync.getAvailabilityCheckins());
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Yes, I&apos;m confirmed</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Decline Confirmation Modal (modal-decline-confirm) */}
          <AnimatePresence>
            {showDeclineModal && (
              <Modal onClose={() => setShowDeclineModal(false)}>
                <motion.div
                  initial={{ y: 20, scale: 0.95 }}
                  animate={{ y: 0, scale: 1 }}
                  exit={{ y: 20, scale: 0.95 }}
                  className="modal-decline-confirm w-full max-w-sm rounded-[var(--radius-lg)] p-6 bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-[var(--shadow-elevated)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="font-display text-xl font-bold mb-2 text-[var(--color-text-primary)]">
                    Cancel this booking?
                  </h3>
                  <p className="text-xs sm:text-sm font-body leading-relaxed text-[var(--color-text-secondary)] mb-6">
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
                      className="flex-1 h-11 px-4 rounded-xl text-xs font-semibold border border-red-500 text-red-500 hover:bg-red-500/10 transition-colors"
                      onClick={() => {
                        if (selectedCheckinToDecline) {
                          appStateSync.cancelBookingFromCheckin(selectedCheckinToDecline.bookingId);
                          setCheckins(appStateSync.getAvailabilityCheckins());
                          setToastMessage("Booking cancelled. Client has received an automatic refund of ₦120,000.");
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

          <AnimatePresence mode="wait">

            {/* ── Home Tab ── */}
            {activeTab === "home" && (
              <motion.div key="home" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                {/* Onboarding Action Nudges Checklist Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-5 rounded-[var(--radius-xl)] border border-[var(--color-accent)]/30 bg-gradient-to-r from-[var(--color-accent-soft)] via-[var(--color-bg-surface)] to-[var(--color-bg-surface)] relative overflow-hidden"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-[var(--color-accent-on)] text-xs font-bold font-mono">
                        {isNewUser ? "1/5" : "4/5"}
                      </div>
                      <div>
                        <h3 className="font-display text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
                          {isNewUser ? "Welcome! Complete your Performer Setup" : "Career Checklist & Action Nudges"}
                        </h3>
                        <p className="text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>
                          {isNewUser ? "Follow these steps to unlock client bookings and start earning." : "Key steps to maximize your visibility and client booking conversion."}
                        </p>
                      </div>
                    </div>
                    <Badge tone={isNewUser ? "accent" : "success"}>{isNewUser ? "Onboarding" : "Active Profile"}</Badge>
                  </div>

                  <div className="w-full h-1.5 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-500" style={{ width: isNewUser ? "20%" : "80%" }} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <button
                      onClick={() => setActiveTab("storefront")}
                      className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] hover:border-[var(--color-accent)] text-left transition-all group"
                    >
                      <div className="w-8 h-8 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold font-body text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] flex items-center justify-between">
                          Profile <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                        </div>
                        <div className="text-[11px] font-body text-[var(--color-text-tertiary)] truncate">Bio & headshots</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab("rates")}
                      className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] hover:border-[var(--color-accent)] text-left transition-all group"
                    >
                      <div className="w-8 h-8 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center shrink-0">
                        <DollarSign className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold font-body text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] flex items-center justify-between">
                          Rate Cards <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                        </div>
                        <div className="text-[11px] font-body text-[var(--color-text-tertiary)] truncate">Add services & price</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab("calendar")}
                      className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] hover:border-[var(--color-accent)] text-left transition-all group"
                    >
                      <div className="w-8 h-8 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold font-body text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] flex items-center justify-between">
                          Availability <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                        </div>
                        <div className="text-[11px] font-body text-[var(--color-text-tertiary)] truncate">Set working slots</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { setActiveTab("projects"); setProjectsSubTab("browse"); }}
                      className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] hover:border-[var(--color-accent)] text-left transition-all group"
                    >
                      <div className="w-8 h-8 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center shrink-0">
                        <Briefcase className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold font-body text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] flex items-center justify-between">
                          Apply to Briefs <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                        </div>
                        <div className="text-[11px] font-body text-[var(--color-text-tertiary)] truncate">Browse open roles</div>
                      </div>
                    </button>
                  </div>
                </motion.div>

                {/* HERO — Modern Deep Slate / Graphite with Monologg brand red accents (Simplified Available Balance) */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                  className="relative overflow-hidden mb-6 p-6 sm:p-7 rounded-[28px] bg-zinc-900 dark:bg-zinc-950 text-white border border-zinc-800/80 shadow-xl"
                >
                  {/* Ambient red backlight */}
                  <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[var(--color-accent)]/15 blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-zinc-800/40 blur-2xl pointer-events-none" />

                  <div className="relative">
                    {/* Top status bar */}
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-400 font-semibold truncate">Available Balance</span>
                        <button
                          type="button"
                          onClick={() => setShowBalance(!showBalance)}
                          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                          aria-label={showBalance ? "Hide balance" : "Show balance"}
                        >
                          {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-body text-zinc-300 shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="hidden sm:inline">Escrow Protected Payouts</span>
                        <span className="sm:hidden">Protected</span>
                      </div>
                    </div>

                    {/* Primary balance row & action CTAs */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="font-display font-black text-white tnum leading-tight text-4xl sm:text-5xl tracking-tight">
                          {showBalance ? (isNewUser ? "₦0" : "₦148,000") : "••••••••"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 pt-1 sm:pt-0 w-full sm:w-auto">
                        <button
                          onClick={() => setActiveTab("earnings")}
                          aria-label={isNewUser ? "Setup payouts" : "Withdraw funds"}
                          className="h-10 px-4 sm:px-5 rounded-xl text-xs font-bold font-body transition-all active:scale-95 text-white shadow-md flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-95 w-full sm:w-auto"
                          style={{ background: "var(--color-accent)" }}
                        >
                          <ArrowUpRight className="w-4 h-4" />
                          <span>{isNewUser ? "Setup Payouts" : "Withdraw Funds"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Quick-action structured navigation grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: "Public Storefront", sub: "View & share profile", icon: User, action: () => setActiveTab("storefront") },
                    { label: "Availability", sub: "Manage slots & dates", icon: Calendar, action: () => setActiveTab("calendar") },
                    { label: "Rate Cards", sub: "Edit service pricing", icon: DollarSign, action: () => setActiveTab("rates") },
                    { label: "Active Orders", sub: "Track live bookings", icon: MessageSquare, action: () => setActiveTab("orders") },
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

                {/* Recent activity */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-display text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>Recent Activity</h3>
                  <button className="text-xs font-body font-semibold hover:underline flex items-center gap-1" style={{ color: "var(--color-accent)" }} onClick={() => setActiveTab("activity")}>
                    <span>View all</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {effectiveActivity.length === 0 ? (
                  <div className="text-center py-10 px-4 rounded-[var(--radius-lg)]" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)" }}>
                    <div className="w-12 h-12 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center mx-auto mb-3 text-[var(--color-accent)]">
                      <Bell className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>No activity logged yet</p>
                    <p className="text-xs font-body mt-1 mb-4 text-[var(--color-text-secondary)]">Complete your profile and apply to open projects to get client bookings.</p>
                    <Button onClick={() => { setActiveTab("projects"); setProjectsSubTab("browse"); }} className="h-9 px-4 text-xs">
                      Browse Open Projects
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {effectiveActivity.map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }}
                        onClick={() => {
                          if (item.type === "booking") navigate("/order/ORD-001");
                          else if (item.type === "payment") setActiveTab("earnings");
                          else if (item.type === "message") setActiveTab("orders");
                        }}
                        className="flex items-center gap-3.5 px-4 py-3 rounded-2xl cursor-pointer hover:border-[var(--color-accent)] transition-all active:scale-[0.99] group"
                        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-card)", minHeight: 68 }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                          style={{
                            background: item.type === "payment" ? "rgba(16, 185, 129, 0.1)" : item.type === "booking" ? "var(--color-accent-soft)" : "rgba(14, 165, 233, 0.1)",
                            color: item.type === "payment" ? "#059669" : item.type === "booking" ? "var(--color-accent)" : "#0284c7",
                          }}
                        >
                          {item.type === "booking" && <Calendar className="w-5 h-5" />}
                          {item.type === "payment" && <DollarSign className="w-5 h-5" />}
                          {item.type === "message" && <MessageSquare className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold font-body truncate group-hover:text-[var(--color-accent)] transition-colors" style={{ color: "var(--color-text-primary)" }}>
                            {item.client}
                          </div>
                          <div className="text-xs font-body text-[var(--color-text-secondary)] truncate">
                            {item.service}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-3">
                          <div>
                            <div className={`text-sm font-mono font-bold ${item.type === "payment" ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--color-text-primary)]"}`}>
                              {item.amount}
                            </div>
                            <div className="text-[11px] font-body text-[var(--color-text-tertiary)]">{item.time}</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Profile completion prompt with visual progress bar */}
                <div
                  className="mt-6 p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  style={{
                    background: "var(--color-bg-surface)",
                    borderColor: "var(--color-border-default)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-body text-[var(--color-text-primary)]">Profile 85% Complete</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          Almost Done
                        </span>
                      </div>
                      <p className="text-xs font-body text-[var(--color-text-secondary)]">
                        Add a bio and media reel to boost client discovery and rank higher in brand searches.
                      </p>
                      {/* Visual Progress Bar */}
                      <div className="w-full max-w-xs h-2 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-[var(--color-accent)]" style={{ width: "85%" }} />
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    className="h-9 px-4 text-xs font-semibold shrink-0 gap-1.5"
                    onClick={() => setActiveTab("storefront")}
                  >
                    <span>Complete Profile</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>

              </motion.div>
            )}

            {/* ── Storefront Tab (Airbnb / Upwork / Linktree inspired) ── */}
            {activeTab === "storefront" && (
              <motion.div key="storefront" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {/* Hidden Cover file input */}
                <input
                  type="file"
                  ref={coverFileInputRef}
                  onChange={handleCoverUpload}
                  accept="image/*"
                  className="hidden"
                />

                {/* Mobile action bar */}
                <div className="flex items-center justify-between mb-4 lg:hidden">
                  <Button
                    variant={isEditingProfile ? "primary" : "secondary"}
                    className="h-9 px-3 text-sm gap-2"
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                  >
                    <Edit2 className="w-4 h-4" /> {isEditingProfile ? "Preview" : "Edit Profile"}
                  </Button>
                  <Button variant="secondary" className="h-9 px-3 text-sm gap-2" onClick={() => setShowShare(true)}>
                    <Share2 className="w-4 h-4" /> Share
                  </Button>
                </div>

                {/* Save Feedback Banner */}
                {profileSaveToast && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 rounded-xl bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/30 text-xs font-semibold font-body flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Profile saved and synced across settings!</span>
                  </motion.div>
                )}

                <div
                  className="rounded-[28px] overflow-hidden border shadow-sm transition-all"
                  style={{
                    background: "var(--color-bg-surface)",
                    borderColor: "var(--color-border-default)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  {/* Hero Cover Banner (Airbnb / Linktree style) */}
                  <div
                    className="h-44 sm:h-52 w-full relative transition-all group overflow-hidden"
                    style={{
                      background: getBannerBackground(),
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="absolute inset-0 bg-black/15 transition-opacity group-hover:bg-black/25" />
                    
                    {/* Change Cover Pill Button */}
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
                          className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 overflow-hidden shrink-0 shadow-lg relative group"
                          style={{
                            borderColor: "var(--color-bg-surface)",
                            background: "var(--color-bg-elevated)",
                          }}
                        >
                          <img
                            src={talentProfile.avatarUrl || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&q=80&fit=crop"}
                            alt={talentProfile.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="pb-1">
                          {isNewUser ? (
                            <Badge tone="accent" className="border border-[var(--color-accent)] gap-1">
                              <Shield className="w-3 h-3" /> Draft Profile (Unverified)
                            </Badge>
                          ) : (
                            <Badge tone="success" className="border border-[var(--color-success)] gap-1">
                              <Shield className="w-3 h-3" /> Verified Performer
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="hidden lg:flex items-center gap-2">
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
                      </div>
                    </div>

                    {/* Performer Name & Title */}
                    <div className="mb-4">
                      <h2 className="font-display text-2xl sm:text-3xl font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>
                        {talentProfile.name || (currentUser?.name || "Emeka Johnson")}
                      </h2>
                      <p className="text-sm font-body flex items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
                        <span>{talentProfile.stageTitle || (isNewUser ? "Voice-Over & Screen Performer" : "Actor & Voice Artist")}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 opacity-60" /> {talentProfile.location || "Lagos, Nigeria"}
                        </span>
                      </p>
                    </div>

                    {/* Availability Status Badge */}
                    <div className="flex items-center gap-2 mb-4">
                      {talentProfile.isAvailable !== false ? (
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

                    {/* Social Media Row (Linktree / Upwork style) */}
                    <div className="flex flex-wrap items-center gap-2 mb-6 pt-1">
                      {talentProfile.socialLinks?.instagram && (
                        <a
                          href={`https://instagram.com/${talentProfile.socialLinks.instagram.replace(/^@/, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105 active:scale-95 bg-[var(--color-bg-elevated)] border-[var(--color-border-default)] hover:border-[#E1306C] hover:text-[#E1306C]"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          <Instagram className="w-3.5 h-3.5" />
                          <span>@{talentProfile.socialLinks.instagram.replace(/^@/, "")}</span>
                        </a>
                      )}
                      {talentProfile.socialLinks?.youtube && (
                        <a
                          href={`https://youtube.com/@${talentProfile.socialLinks.youtube.replace(/^@/, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105 active:scale-95 bg-[var(--color-bg-elevated)] border-[var(--color-border-default)] hover:border-[#FF0000] hover:text-[#FF0000]"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          <Youtube className="w-3.5 h-3.5" />
                          <span>@{talentProfile.socialLinks.youtube.replace(/^@/, "")}</span>
                        </a>
                      )}
                      {talentProfile.socialLinks?.tiktok && (
                        <a
                          href={`https://tiktok.com/@${talentProfile.socialLinks.tiktok.replace(/^@/, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105 active:scale-95 bg-[var(--color-bg-elevated)] border-[var(--color-border-default)] hover:border-black dark:hover:border-white"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.32a6.34 6.34 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 10.79 4.54V11.8a8.3 8.3 0 0 0 5.66 2.19V10.5a4.88 4.88 0 0 1-3.03-3.81z"/>
                          </svg>
                          <span>@{talentProfile.socialLinks.tiktok.replace(/^@/, "")}</span>
                        </a>
                      )}
                      {talentProfile.socialLinks?.twitter && (
                        <a
                          href={`https://x.com/${talentProfile.socialLinks.twitter.replace(/^@/, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105 active:scale-95 bg-[var(--color-bg-elevated)] border-[var(--color-border-default)] hover:border-[#1DA1F2] hover:text-[#1DA1F2]"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          <Twitter className="w-3.5 h-3.5" />
                          <span>@{talentProfile.socialLinks.twitter.replace(/^@/, "")}</span>
                        </a>
                      )}
                      {talentProfile.socialLinks?.linkedin && (
                        <a
                          href={`https://linkedin.com/in/${talentProfile.socialLinks.linkedin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105 active:scale-95 bg-[var(--color-bg-elevated)] border-[var(--color-border-default)] hover:border-[#0A66C2] hover:text-[#0A66C2]"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          <Linkedin className="w-3.5 h-3.5" />
                          <span>LinkedIn</span>
                        </a>
                      )}
                      {talentProfile.socialLinks?.spotify && (
                        <a
                          href={talentProfile.socialLinks.spotify}
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
                    {isEditingProfile ? (
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
                              Changes saved here automatically update your public storefront and sync with settings.
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
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Stage Name or Full Name"
                              className="h-11 rounded-xl text-sm font-body px-3.5 !bg-white dark:!bg-zinc-900 !border-zinc-300 dark:!border-zinc-700 !text-zinc-900 dark:!text-zinc-100 placeholder:!text-zinc-400 dark:placeholder:!text-zinc-500 shadow-2xs focus:!border-[var(--color-accent)]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 font-body text-zinc-900 dark:text-zinc-100">
                              Stage Title / Primary Craft
                            </label>
                            <Input
                              value={editStageTitle}
                              onChange={(e) => setEditStageTitle(e.target.value)}
                              placeholder="e.g. Actor & Voice Artist"
                              className="h-11 rounded-xl text-sm font-body px-3.5 !bg-white dark:!bg-zinc-900 !border-zinc-300 dark:!border-zinc-700 !text-zinc-900 dark:!text-zinc-100 placeholder:!text-zinc-400 dark:placeholder:!text-zinc-500 shadow-2xs focus:!border-[var(--color-accent)]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 font-body text-zinc-900 dark:text-zinc-100">
                              Location
                            </label>
                            <Input
                              value={editLocation}
                              onChange={(e) => setEditLocation(e.target.value)}
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
                                onClick={() => setEditIsAvailable(true)}
                                className={`flex-1 h-11 rounded-xl border text-xs font-bold font-body flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                  editIsAvailable
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-400/30 shadow-2xs"
                                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                }`}
                              >
                                <span className="relative flex h-2 w-2">
                                  {editIsAvailable && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                Available
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditIsAvailable(false)}
                                className={`flex-1 h-11 rounded-xl border text-xs font-bold font-body flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                  !editIsAvailable
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
                            value={editBio}
                            onChange={(e) => setEditBio(e.target.value)}
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
                            {editTags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                              >
                                <span>{tag}</span>
                                <button
                                  type="button"
                                  onClick={() => setEditTags(editTags.filter((_, i) => i !== idx))}
                                  className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-zinc-500 hover:text-[var(--color-accent)] cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2 max-w-md">
                            <Input
                              value={newTagInput}
                              onChange={(e) => setNewTagInput(e.target.value)}
                              placeholder="Add a new tag (e.g. Igbo Accent, Improvisation)"
                              className="h-11 rounded-xl text-sm font-body px-3.5 !bg-white dark:!bg-zinc-900 !border-zinc-300 dark:!border-zinc-700 !text-zinc-900 dark:!text-zinc-100 placeholder:!text-zinc-400 dark:placeholder:!text-zinc-500 shadow-2xs focus:!border-[var(--color-accent)]"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && newTagInput.trim()) {
                                  e.preventDefault();
                                  if (!editTags.includes(newTagInput.trim())) {
                                    setEditTags([...editTags, newTagInput.trim()]);
                                  }
                                  setNewTagInput("");
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-11 rounded-xl text-xs font-bold px-4 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-2xs"
                              onClick={() => {
                                if (newTagInput.trim() && !editTags.includes(newTagInput.trim())) {
                                  setEditTags([...editTags, newTagInput.trim()]);
                                  setNewTagInput("");
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
                                value={editSocials.instagram || ""}
                                onChange={(e) => setEditSocials({ ...editSocials, instagram: e.target.value })}
                                placeholder="Instagram handle (e.g. emeka_acts)"
                                className="h-11 rounded-xl pl-11 text-sm font-body !bg-white dark:!bg-zinc-900 !border-zinc-300 dark:!border-zinc-700 !text-zinc-900 dark:!text-zinc-100 placeholder:!text-zinc-400 dark:placeholder:!text-zinc-500 shadow-2xs focus:!border-[var(--color-accent)]"
                              />
                            </div>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 text-center text-xs font-bold text-[#FF0000]">YT</span>
                              <Input
                                value={editSocials.youtube || ""}
                                onChange={(e) => setEditSocials({ ...editSocials, youtube: e.target.value })}
                                placeholder="YouTube channel handle"
                                className="h-11 rounded-xl pl-11 text-sm font-body !bg-white dark:!bg-zinc-900 !border-zinc-300 dark:!border-zinc-700 !text-zinc-900 dark:!text-zinc-100 placeholder:!text-zinc-400 dark:placeholder:!text-zinc-500 shadow-2xs focus:!border-[var(--color-accent)]"
                              />
                            </div>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 text-center text-xs font-bold text-zinc-900 dark:text-zinc-100">TT</span>
                              <Input
                                value={editSocials.tiktok || ""}
                                onChange={(e) => setEditSocials({ ...editSocials, tiktok: e.target.value })}
                                placeholder="TikTok handle"
                                className="h-11 rounded-xl pl-11 text-sm font-body !bg-white dark:!bg-zinc-900 !border-zinc-300 dark:!border-zinc-700 !text-zinc-900 dark:!text-zinc-100 placeholder:!text-zinc-400 dark:placeholder:!text-zinc-500 shadow-2xs focus:!border-[var(--color-accent)]"
                              />
                            </div>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 text-center text-xs font-bold text-[#1DA1F2]">X</span>
                              <Input
                                value={editSocials.twitter || ""}
                                onChange={(e) => setEditSocials({ ...editSocials, twitter: e.target.value })}
                                placeholder="X (Twitter) handle"
                                className="h-11 rounded-xl pl-11 text-sm font-body !bg-white dark:!bg-zinc-900 !border-zinc-300 dark:!border-zinc-700 !text-zinc-900 dark:!text-zinc-100 placeholder:!text-zinc-400 dark:placeholder:!text-zinc-500 shadow-2xs focus:!border-[var(--color-accent)]"
                              />
                            </div>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 text-center text-xs font-bold text-[#0A66C2]">IN</span>
                              <Input
                                value={editSocials.linkedin || ""}
                                onChange={(e) => setEditSocials({ ...editSocials, linkedin: e.target.value })}
                                placeholder="LinkedIn profile slug"
                                className="h-11 rounded-xl pl-11 text-sm font-body !bg-white dark:!bg-zinc-900 !border-zinc-300 dark:!border-zinc-700 !text-zinc-900 dark:!text-zinc-100 placeholder:!text-zinc-400 dark:placeholder:!text-zinc-500 shadow-2xs focus:!border-[var(--color-accent)]"
                              />
                            </div>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 text-center text-xs font-bold text-[#1DB954]">SP</span>
                              <Input
                                value={editSocials.spotify || ""}
                                onChange={(e) => setEditSocials({ ...editSocials, spotify: e.target.value })}
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
                                  setEditCoverPreset(preset.id);
                                  setEditCoverUrl(null);
                                }}
                                className={`px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                                  editCoverPreset === preset.id && !editCoverUrl
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
                          <Button onClick={handleSaveProfile} className="gap-2 h-11 px-5 text-xs font-semibold">
                            <Check className="w-4 h-4" /> Save Changes
                          </Button>
                        </div>
                      </motion.div>
                    ) : null}

                    {/* Tags & Bio (Shown in Profile View mode, omitted during active edit to prevent duplicate slop) */}
                    {!isEditingProfile && (
                      <>
                        {/* Tags List */}
                        <div className="flex flex-wrap gap-2 mb-6">
                          {(talentProfile.tags || VIBE_TAGS).map((tag) => (
                            <Badge key={tag} tone="neutral" size="lg">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        {/* Bio Section */}
                        {talentProfile.bio && talentProfile.bio.trim() && !talentProfile.bio.toLowerCase().includes("no bio") ? (
                          <div className="mb-8">
                            <h3 className="text-sm font-semibold font-body mb-2" style={{ color: "var(--color-text-primary)" }}>
                              About the Performer
                            </h3>
                            <p className="text-sm font-body leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                              {talentProfile.bio}
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

                    {/* Featured Performance Reel (Airbnb / Upwork Portfolio style) */}
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>
                          Featured Performance Reel
                        </h3>
                        {(talentProfile.hasReel || talentProfile.performanceReelUrl || !isNewUser) && (
                          <button
                            onClick={() => setShowUploadReelModal(true)}
                            className="text-xs font-semibold hover:underline flex items-center gap-1"
                            style={{ color: "var(--color-accent)" }}
                          >
                            <Play className="w-3 h-3" /> Replace Reel
                          </button>
                        )}
                      </div>

                      {talentProfile.hasReel || talentProfile.performanceReelUrl || !isNewUser ? (
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
                            {talentProfile.performanceReelTitle || "Featured Audition Reel"}
                          </div>
                          <div className="absolute bottom-3 right-3 px-2 py-1 rounded font-mono text-xs text-white bg-black/60 backdrop-blur-md">
                            01:30
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] text-center flex flex-col items-center">
                          <div className="w-12 h-12 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center mb-3 text-[var(--color-accent)]">
                            <Play className="w-6 h-6 ml-0.5" />
                          </div>
                          <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
                            No Performance Reel Uploaded
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mb-4">
                            Upload a high-quality video clip (max 90 seconds) showcasing your acting, monologue, or voice reel.
                          </p>
                          <Button
                            variant="secondary"
                            className="h-9 px-4 text-xs gap-2"
                            onClick={() => setShowUploadReelModal(true)}
                          >
                            <Play className="w-3.5 h-3.5" /> Upload Performance Reel
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Rate Cards (Upwork Catalog style) */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>
                          Rate Cards
                        </h3>
                        {effectiveServices.length > 0 && effectiveServices.length < 2 && (
                          <button
                            onClick={() => {
                              setEditServiceId(null);
                              setNewServiceTitle("");
                              setNewServicePrice("45000");
                              setNewServiceDelivery("24 Hours");
                              setShowAddService(true);
                            }}
                            className="text-xs font-semibold hover:underline flex items-center gap-1"
                            style={{ color: "var(--color-accent)" }}
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Second Rate Card (1/2)
                          </button>
                        )}
                      </div>

                      {effectiveServices.length === 0 ? (
                        <div className="p-6 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] text-center flex flex-col items-center">
                          <div className="w-12 h-12 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center mb-3 text-[var(--color-accent)]">
                            <DollarSign className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
                            No Rate Cards Created
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mb-4">
                            You can create up to 2 service rate cards so clients can instantly book your services.
                          </p>
                          <Button
                            className="h-9 px-4 text-xs gap-2"
                            onClick={() => {
                              setEditServiceId(null);
                              setNewServiceTitle("");
                              setNewServicePrice("45000");
                              setNewServiceDelivery("24 Hours");
                              setShowAddService(true);
                            }}
                          >
                            <Plus className="w-3.5 h-3.5" /> Create Rate Card
                          </Button>
                        </div>
                      ) : (
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
                                  <button
                                    onClick={() => {
                                      setEditServiceId(service.id);
                                      setNewServiceTitle(service.title);
                                      const match = service.price.match(/^([^0-9,]*)(.*)$/);
                                      if (match) {
                                        setRateCardCurrency(match[1] || "₦");
                                        setNewServicePrice((match[2] || "").replace(/,/g, ""));
                                      } else {
                                        setNewServicePrice(service.price.replace(/[^0-9]/g, ""));
                                      }
                                      setNewServiceDelivery(service.delivery);
                                      setShowAddService(true);
                                    }}
                                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-surface)] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-colors shrink-0 -mr-1 -mt-1"
                                    title="Edit rate card"
                                    aria-label="Edit rate card"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="text-xs font-body mb-3" style={{ color: "var(--color-text-secondary)" }}>
                                  Delivery: {service.delivery}
                                </div>
                              </div>
                              {(() => {
                                const match = service.price.match(/^([^0-9,]*)(.*)$/);
                                const symbol = match ? (match[1] || "₦") : "₦";
                                const num = Number((match ? match[2] : service.price).replace(/[^0-9]/g, "")) || 0;
                                const fee = Math.round(num * 0.07);
                                const net = num - fee;
                                return (
                                  <div className="pt-2 border-t flex items-baseline justify-between" style={{ borderColor: "var(--color-hairline)" }}>
                                    <span className="text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>Rate</span>
                                    <span className="font-display text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                                      {symbol}{net.toLocaleString()}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Rate Cards Tab ── */}
            {activeTab === "rates" && (
              <motion.div key="rates" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {effectiveServices.length > 0 && effectiveServices.length < 2 && (
                  <div className="flex items-center justify-between gap-3 mb-4 lg:hidden">
                    <span className="text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>
                      {effectiveServices.length} of 2 rate cards active
                    </span>
                    <Button
                      className="h-9 px-3 text-xs font-semibold gap-1.5"
                      onClick={() => {
                        setEditServiceId(null);
                        setNewServiceTitle("");
                        setNewServicePrice("45000");
                        setNewServiceDelivery("24 Hours");
                        setShowAddService(true);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Rate Card
                    </Button>
                  </div>
                )}

                {effectiveServices.length === 0 ? (
                  <div className="text-center py-16 px-6 rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] shadow-[var(--shadow-card)] flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center mb-4 text-[var(--color-accent)]">
                      <DollarSign className="w-8 h-8" />
                    </div>
                    <h3 className="font-display text-xl font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>No Rate Cards Created Yet</h3>
                    <p className="text-sm font-body text-[var(--color-text-secondary)] max-w-md mb-6 leading-relaxed">
                      Create fixed-price service rate cards so clients can instantly book your voice-over, acting, or compere services. You can create up to 2 rate cards.
                    </p>
                    <Button onClick={() => setShowAddService(true)} className="gap-2">
                      <Plus className="w-4 h-4" /> Create Your First Rate Card
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {effectiveServices.map(service => (
                    <div
                      key={service.id}
                      className="p-5 rounded-[var(--radius-lg)]"
                      style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-card)" }}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                          style={{ background: "var(--color-accent-glow)" }}
                        >
                          <DollarSign className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="text-base font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>{service.title}</h3>
                            {(() => {
                              const match = service.price.match(/^([^0-9,]*)(.*)$/);
                              const symbol = match ? (match[1] || "₦") : "₦";
                              const num = Number((match ? match[2] : service.price).replace(/[^0-9]/g, "")) || 0;
                              const fee = Math.round(num * 0.07);
                              const net = num - fee;
                              return (
                                <span className="font-display text-xl font-bold shrink-0" style={{ color: "var(--color-accent)" }}>
                                  {symbol}{net.toLocaleString()}
                                </span>
                              );
                            })()}
                          </div>
                          <p className="text-sm font-body mb-3" style={{ color: "var(--color-text-secondary)" }}>
                            Delivery: {service.delivery} · {service.bookings} bookings
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              className="h-8 px-3 text-xs gap-1.5"
                              onClick={() => {
                                setEditServiceId(service.id);
                                setNewServiceTitle(service.title);
                                const match = service.price.match(/^([^0-9,]*)(.*)$/);
                                if (match) {
                                  const symbol = match[1] || "₦";
                                  const amountStr = match[2] || "";
                                  setRateCardCurrency(symbol);
                                  setNewServicePrice(amountStr.replace(/,/g, ""));
                                } else {
                                  setNewServicePrice(service.price.replace(/[^0-9]/g, ""));
                                }
                                setNewServiceDelivery(service.delivery);
                                setShowAddService(true);
                              }}
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </Button>
                            <Button
                              variant="destructive"
                              className="h-8 px-3 text-xs gap-1.5"
                              onClick={() => handleDeleteService(service.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {effectiveServices.length < 2 ? (
                    <button
                      onClick={() => {
                        setEditServiceId(null);
                        setNewServiceTitle("");
                        setNewServicePrice("45000");
                        setNewServiceDelivery("24 Hours");
                        setShowAddService(true);
                      }}
                      className="w-full p-5 rounded-[var(--radius-lg)] border-2 border-dashed flex items-center justify-center gap-2 text-sm font-medium font-body transition-all hover:border-[var(--color-accent)]"
                      style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-secondary)" }}
                    >
                      <Plus className="w-4 h-4" /> Add second rate card ({effectiveServices.length}/2)
                    </button>
                  ) : (
                    <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-center text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>
                      You can only create up to 2 rate cards (2/2 created).
                    </div>
                  )}
                </div>
                )}

                {/* Add/Edit Rate Card Modal */}
                <AnimatePresence>
                  {(showAddService || editServiceId !== null) && (
                    <Modal onClose={() => { setShowAddService(false); setEditServiceId(null); }} align="end">
                      <motion.div
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 40, opacity: 0 }}
                        className="w-full max-w-md rounded-[var(--radius-lg)] p-6"
                        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="font-display text-xl" style={{ color: "var(--color-text-primary)" }}>
                            {editServiceId ? "Edit Rate Card" : "New Rate Card"}
                          </h3>
                          <button
                            onClick={() => { setShowAddService(false); setEditServiceId(null); }}
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity"
                            style={{ background: "var(--color-bg-elevated)" }}
                          >
                            <X className="w-4 h-4" style={{ color: "var(--color-text-secondary)" }} />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium mb-1.5 font-body uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                              Service Title
                            </label>
                            <Input
                              placeholder="e.g., Voice-Over Recording"
                              value={newServiceTitle}
                              onChange={e => setNewServiceTitle(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5 font-body uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                              Base Price &amp; Currency
                            </label>
                            <div className="relative flex items-center">
                               <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-semibold text-sm pointer-events-none z-10" style={{ color: "var(--color-text-secondary)" }}>
                                 {rateCardCurrency}
                               </span>
                               <Input
                                 className="pl-8 pr-28 font-mono tnum w-full"
                                 placeholder="45,000"
                                 value={newServicePrice}
                                 onChange={(e) => {
                                   const digits = e.target.value.replace(/\D/g, "");
                                   setNewServicePrice(digits ? parseInt(digits, 10).toLocaleString("en-US") : "");
                                 }}
                               />
                               <select
                                 value={rateCardCurrency}
                                 onChange={(e) => {
                                   const newCurr = e.target.value;
                                   const currentVal = Number(newServicePrice.replace(/[^0-9]/g, "")) || 0;
                                   const converted = convertCurrency(currentVal, rateCardCurrency, newCurr);
                                   const newVal = Math.round(converted);
                                   setNewServicePrice(newVal > 0 ? newVal.toLocaleString("en-US") : "");
                                   setRateCardCurrency(newCurr);
                                 }}
                                 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-8 rounded-[var(--radius-md)] pl-2.5 pr-8 text-xs font-mono font-semibold border-0 outline-none cursor-pointer"
                                 style={{ background: "var(--color-bg-elevated)", color: "var(--color-accent)" }}
                               >
                                 <option value="₦">₦ NGN</option>
                                 <option value="$">$ USD</option>
                                 <option value="£">£ GBP</option>
                                 <option value="€">€ EUR</option>
                               </select>
                             </div>
                             {(() => {
                               const num = Number(newServicePrice.replace(/[^0-9]/g, "")) || 0;
                               if (num <= 0) return null;
                               const fee = Math.round(num * 0.07);
                               const net = num - fee;
                               return (
                                 <div className="mt-2.5 p-2.5 rounded-xl border flex items-center justify-between text-xs font-body" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}>
                                   <span style={{ color: "var(--color-text-secondary)" }}>You receive (after deduction)</span>
                                   <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{rateCardCurrency}{net.toLocaleString()}</span>
                                 </div>
                               );
                             })()}
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5 font-body uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                              Delivery Timeline
                            </label>
                            <select
                              className="w-full h-[54px] rounded-[var(--radius-lg)] px-4 text-base font-body appearance-none border"
                              style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-border-default)", color: "var(--color-text-primary)" }}
                              value={newServiceDelivery}
                              onChange={e => setNewServiceDelivery(e.target.value)}
                            >
                              <option value="Same Day">Same Day</option>
                              <option value="24 Hours">24 Hours</option>
                              <option value="2–3 Days">2–3 Days</option>
                              <option value="1 Week">1 Week</option>
                              <option value="Custom">Custom</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5 font-body uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                              Description (optional)
                            </label>
                            <textarea
                              className="w-full rounded-[var(--radius-md)] px-4 py-3 text-sm font-body border resize-none"
                              rows={3}
                              placeholder="What's included in this service..."
                              style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-border-default)", color: "var(--color-text-primary)" }}
                            />
                          </div>
                          <div className="flex gap-3 pt-2">
                            <Button variant="secondary" className="flex-1 h-11 text-sm" onClick={() => { setShowAddService(false); setEditServiceId(null); }}>
                              Cancel
                            </Button>
                            <Button className="flex-1 h-11 text-sm" onClick={handleSaveService}>
                              {editServiceId ? "Save Changes" : "Add Rate Card"}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    </Modal>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── Availability Calendar Tab (features.md Phase 13, PWA-08) ── */}
            {activeTab === "calendar" && (
              <motion.div key="calendar" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative">
                {isNewUser && (
                  <div className="mb-4 p-4 rounded-[var(--radius-lg)] bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/30 flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-[var(--color-accent)] shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--color-text-primary)] font-body">Default Working Hours Active (9:00 AM – 5:00 PM)</p>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 font-body">Your availability automatically defaults to standard bookable slots. Click any date below to view details, or right-click to mark availability.</p>
                    </div>
                  </div>
                )}

                {/* Google Calendar Sync Status Banner */}
                <div
                  className="mb-4 p-4 rounded-[var(--radius-lg)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  style={{
                    background: "var(--color-bg-surface)",
                    border: "1px solid var(--color-border-default)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-elevated)] flex items-center justify-center border border-[var(--color-border-default)] shrink-0">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>
                          Google Calendar Sync
                        </span>
                        {calendarSync.connected ? (
                          <Badge tone="success" size="sm">Connected</Badge>
                        ) : (
                          <Badge tone="neutral" size="sm">Not connected</Badge>
                        )}
                      </div>
                      <p className="text-xs font-body mt-0.5 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                        {calendarSync.connected
                          ? `Connected as ${calendarSync.email || "Google Account"} · Bookings sync automatically, and existing events block slots.`
                          : "Connect your calendar to automatically block out slots when you're busy."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {calendarSync.connected ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleDisconnectCalendarSync}
                        className="h-8 px-3 text-xs"
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setShowSyncModal(true)}
                        className="h-8 px-3 text-xs font-semibold"
                      >
                        Connect Google Calendar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Calendar Toolbar & Period Navigation */}
                <div
                  className="p-3.5 rounded-[var(--radius-lg)] mb-4 flex flex-col sm:flex-row items-center justify-between gap-3"
                  style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        aria-label="Jump to today"
                        title="Jump to today"
                        onClick={() => setSelectedDate(todayISO())}
                        className="p-2 rounded-xl transition-all hover:bg-[var(--color-bg-elevated)]"
                        style={{ border: "1px solid var(--color-border-default)", color: "var(--color-text-primary)" }}
                      >
                        <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
                      </button>
                      <button
                        aria-label="Previous period"
                        onClick={() => setSelectedDate(navigatePeriodISO(selectedDate, calendarView, "prev"))}
                        className="p-2 rounded-xl transition-all hover:bg-[var(--color-bg-elevated)]"
                        style={{ border: "1px solid var(--color-border-default)", color: "var(--color-text-primary)" }}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedDate(todayISO())}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold font-body transition-all hover:bg-[var(--color-bg-elevated)]"
                        style={{ border: "1px solid var(--color-border-default)", color: "var(--color-text-primary)" }}
                      >
                        Today
                      </button>
                      <button
                        aria-label="Next period"
                        onClick={() => setSelectedDate(navigatePeriodISO(selectedDate, calendarView, "next"))}
                        className="p-2 rounded-xl transition-all hover:bg-[var(--color-bg-elevated)]"
                        style={{ border: "1px solid var(--color-border-default)", color: "var(--color-text-primary)" }}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <span className="font-display text-base font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                      {new Date(`${selectedDate}T00:00:00.000Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
                    </span>
                  </div>

                  {/* 3-View Switcher: Month | Week | Day */}
                  <div className="flex p-1 rounded-xl shrink-0 w-full sm:w-auto justify-center" style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
                    {(["month", "week", "day"] as const).map((view) => (
                      <button
                        key={view}
                        onClick={() => setCalendarView(view)}
                        className="flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-semibold font-body capitalize transition-all"
                        style={{
                          background: calendarView === view ? "var(--color-accent)" : "transparent",
                          color: calendarView === view ? "var(--color-accent-on)" : "var(--color-text-secondary)",
                          boxShadow: calendarView === view ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                        }}
                      >
                        {view === "month" ? "Month" : view === "week" ? "Week" : "Day"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Floating Right-Click Context Menu */}
                {contextMenu && (
                  <div
                    className="fixed z-50 min-w-[210px] rounded-2xl p-1.5 shadow-2xl border backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
                    style={{
                      left: Math.min(contextMenu.x, window.innerWidth - 230),
                      top: Math.min(contextMenu.y, window.innerHeight - 250),
                      background: "var(--color-bg-surface)",
                      borderColor: "var(--color-border-default)",
                      boxShadow: "0 12px 36px rgba(0,0,0,0.25)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3 py-2 text-[11px] font-bold font-body uppercase tracking-wider border-b mb-1" style={{ color: "var(--color-text-tertiary)", borderColor: "var(--color-hairline)" }}>
                      {formatDayLabel(contextMenu.date)}
                    </div>

                    {unavailableDates.has(contextMenu.date) ? (
                      <button
                        onClick={() => {
                          handleToggleUnavailable(contextMenu.date, false);
                          setNewSlotState("free");
                          setShowAddSlot(true);
                          setContextMenu(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-[var(--color-bg-elevated)] transition-colors text-left"
                        style={{ color: "var(--color-success)" }}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Mark as Available
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          handleToggleUnavailable(contextMenu.date, true);
                          setContextMenu(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-[var(--color-bg-elevated)] transition-colors text-left"
                        style={{ color: "var(--color-accent)" }}
                      >
                        <X className="w-4 h-4" /> Mark as Unavailable
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedDate(contextMenu.date);
                        setContextMenu(null);
                        setShowAddSlot(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl hover:bg-[var(--color-bg-elevated)] transition-colors text-left"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      <Clock className="w-4 h-4" style={{ color: "var(--color-text-secondary)" }} /> Add Custom Slot
                    </button>

                    <button
                      onClick={() => {
                        setSelectedDate(contextMenu.date);
                        setContextMenu(null);
                        setShowAddEvent(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl hover:bg-[var(--color-bg-elevated)] transition-colors text-left"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      <Plus className="w-4 h-4" style={{ color: "var(--color-text-secondary)" }} /> Add Event / Booking
                    </button>
                  </div>
                )}

                {/* MONTH VIEW GRID */}
                {calendarView === "month" && (() => {
                  const selectedObj = new Date(`${selectedDate}T00:00:00.000Z`);
                  const year = selectedObj.getUTCFullYear();
                  const month = selectedObj.getUTCMonth();
                  const firstDayIndex = new Date(Date.UTC(year, month, 1)).getUTCDay();
                  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
                  const monthName = selectedObj.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

                  const daysArray = [];
                  for (let i = 0; i < firstDayIndex; i++) daysArray.push(null);
                  for (let d = 1; d <= daysInMonth; d++) {
                    const padD = String(d).padStart(2, "0");
                    const padM = String(month + 1).padStart(2, "0");
                    daysArray.push(`${year}-${padM}-${padD}`);
                  }

                  return (
                    <div className="p-3.5 sm:p-6 rounded-3xl mb-4" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-card)" }}>
                      {/* Compact Month Subheader (No duplicate Month title or duplicate < Today > nav) */}
                      <div className="flex items-center justify-between gap-2 mb-3.5 pb-3 border-b" style={{ borderColor: "var(--color-hairline)" }}>
                        <span className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>
                          Select a date to view scheduled slots &amp; events
                        </span>
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0" style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-secondary)" }}>
                          {daysInMonth} days
                        </span>
                      </div>

                      {/* Day of Week Header */}
                      <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[11px] sm:text-xs font-semibold mb-2 font-body uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                          <div key={day} className="py-1 font-semibold">{day}</div>
                        ))}
                      </div>

                      {/* Days Grid */}
                      <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
                        {daysArray.map((dateStr, idx) => {
                          if (!dateStr) return <div key={`empty-${idx}`} className="h-14 sm:h-20 rounded-xl sm:rounded-2xl bg-zinc-50/20 dark:bg-zinc-900/10 border border-transparent" />;
                          const isSelected = dateStr === selectedDate;
                          const isToday = dateStr === todayISO();
                          const dayNum = parseInt(dateStr.slice(8), 10);
                          const isUnavailable = unavailableDates.has(dateStr);
                          const dayEvts = allEvents[dateStr] || (dateStr === selectedDate && dayDetail?.events ? dayDetail.events : []);
                          const hasMonologg = dayEvts.some(e => e.kind === "booking" || Boolean(e.bookingId) || e.title.toLowerCase().includes("monolog"));
                          const hasExternal = dayEvts.length > 0 && !hasMonologg;

                          return (
                            <button
                              key={dateStr}
                              onClick={() => {
                                setSelectedDate(dateStr);
                                setContextMenu(null);
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setSelectedDate(dateStr);
                                setContextMenu({ x: e.clientX, y: e.clientY, date: dateStr });
                              }}
                              className={`h-14 sm:h-20 p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl flex flex-col justify-between relative transition-all active:scale-98 text-xs font-body text-left cursor-pointer group min-w-0 overflow-hidden ${
                                isUnavailable
                                  ? "bg-neutral-100/70 dark:bg-neutral-900/40 border border-dashed border-neutral-300 dark:border-neutral-700/80 text-neutral-400 dark:text-neutral-500"
                                  : isSelected
                                  ? "border-2 border-[var(--color-accent)] ring-2 sm:ring-4 ring-[var(--color-accent)]/15 shadow-sm"
                                  : isToday
                                  ? "border-2 border-[var(--color-accent)]/70 shadow-2xs hover:border-[var(--color-accent)]"
                                  : "border border-[var(--color-border-default)] hover:border-[var(--color-border-hover)] hover:shadow-2xs"
                              }`}
                              style={{
                                background: isUnavailable
                                  ? undefined
                                  : isSelected
                                  ? "var(--color-bg-elevated)"
                                  : isToday
                                  ? "var(--color-accent-soft)"
                                  : "var(--color-bg-elevated)",
                                borderColor: isUnavailable
                                  ? undefined
                                  : isSelected
                                  ? "var(--color-accent)"
                                  : isToday
                                  ? undefined
                                  : undefined,
                              }}
                            >
                              <div className="flex items-center justify-between w-full min-w-0 gap-0.5">
                                <span className={`text-xs sm:text-sm font-semibold leading-none transition-colors ${
                                  isUnavailable
                                    ? "text-neutral-400 dark:text-neutral-500 line-through"
                                    : isSelected
                                    ? "font-bold text-[var(--color-accent)]"
                                    : isToday
                                    ? "font-bold text-[var(--color-accent)]"
                                    : "group-hover:text-[var(--color-accent)]"
                                }`} style={{ color: !isUnavailable && !isSelected && !isToday ? "var(--color-text-primary)" : undefined }}>
                                  {dayNum}
                                </span>
                                {isToday && (
                                  <>
                                    <span className="hidden sm:inline-flex text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ background: "var(--color-accent)" }}>
                                      Today
                                    </span>
                                    <span className="sm:hidden w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--color-accent)" }} />
                                  </>
                                )}
                              </div>

                              {/* Visual recognition: Unavailable vs Events vs Clean Open */}
                              <div className="w-full min-h-[14px] sm:min-h-[18px] flex items-center min-w-0">
                                {isUnavailable ? (
                                  <>
                                    <span className="hidden sm:inline-flex text-[9px] uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-500 bg-neutral-200/60 dark:bg-neutral-800/80 px-1.5 py-0.5 rounded-md truncate">
                                      Unavailable
                                    </span>
                                    <span className="sm:hidden text-[8px] uppercase font-bold tracking-tight text-neutral-400 dark:text-neutral-500 truncate">
                                      Off
                                    </span>
                                  </>
                                ) : hasMonologg ? (
                                  <>
                                    <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/25 truncate max-w-full">
                                      <LogoMark className="w-2.5 h-2.5 shrink-0" /> Monologg
                                    </span>
                                    <span className="sm:hidden inline-flex items-center gap-0.5 px-1 py-0.25 rounded text-[8px] font-bold bg-[var(--color-accent)]/15 text-[var(--color-accent)] truncate max-w-full">
                                      Gig
                                    </span>
                                  </>
                                ) : hasExternal ? (
                                  <>
                                    <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25 truncate max-w-full">
                                      <Calendar className="w-2.5 h-2.5 shrink-0" /> Event
                                    </span>
                                    <span className="sm:hidden inline-flex items-center px-1 py-0.25 rounded text-[8px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 truncate max-w-full">
                                      Evt
                                    </span>
                                  </>
                                ) : isToday ? (
                                  <span className="sm:hidden text-[8px] font-bold uppercase tracking-tight text-[var(--color-accent)] truncate">
                                    Today
                                  </span>
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Bottom Legend & Quick Telemetry */}
                      <div className="mt-4 pt-3.5 border-t flex flex-wrap items-center justify-between gap-3 text-xs font-body" style={{ borderColor: "var(--color-hairline)", color: "var(--color-text-secondary)" }}>
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: "var(--color-accent)" }} />
                            <span>Monologg Gig</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-sky-500" />
                            <span>Calendar Event</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-neutral-400" />
                            <span>Unavailable</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>Open Slot</span>
                          </div>
                        </div>
                        <div className="text-[11px] hidden md:block" style={{ color: "var(--color-text-tertiary)" }}>
                          Right-click any date to toggle availability or add slots
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* WEEK VIEW GRID */}
                {calendarView === "week" && (() => {
                  const weekDays = getWeekDaysISO(selectedDate);
                  const hours = Array.from({ length: 13 }, (_, i) => i + 8);
                  return (
                    <div className="p-4 rounded-[var(--radius-lg)] mb-4 overflow-x-auto" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-card)" }}>
                      <div className="min-w-[650px]">
                        <div className="grid grid-cols-8 gap-1 mb-2 text-center text-xs font-body border-b pb-2" style={{ borderColor: "var(--color-border-default)" }}>
                          <div className="text-left font-semibold uppercase text-tertiary px-2" style={{ color: "var(--color-text-tertiary)" }}>Time</div>
                          {weekDays.map((dStr) => {
                            const dObj = new Date(`${dStr}T00:00:00.000Z`);
                            const dayName = dObj.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
                            const dayNum = dObj.getUTCDate();
                            const isSel = dStr === selectedDate;
                            const isToday = dStr === todayISO();
                            return (
                              <button
                                key={dStr}
                                onClick={() => setSelectedDate(dStr)}
                                className={`py-1.5 rounded-lg text-center transition-all ${isSel ? "font-bold text-white bg-[var(--color-accent)] shadow-md" : isToday ? "text-[var(--color-accent)] font-semibold bg-[var(--color-accent-soft)]" : "text-[var(--color-text-primary)]"}`}
                              >
                                <div>{dayName}</div>
                                <div className="text-sm font-semibold">{dayNum}</div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="relative space-y-1">
                          <div className="absolute left-0 right-0 top-[28%] z-10 pointer-events-none flex items-center">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--color-accent)] text-white shadow-sm">11:30</span>
                            <div className="h-[2px] flex-1 bg-[var(--color-accent)] opacity-80" />
                          </div>

                          {hours.map((hr) => (
                            <div key={hr} className="grid grid-cols-8 gap-1 items-center min-h-[44px] border-b" style={{ borderColor: "var(--color-border-default)" }}>
                              <div className="text-xs font-mono font-medium text-tertiary px-2" style={{ color: "var(--color-text-tertiary)" }}>
                                {String(hr).padStart(2, "0")}:00
                              </div>
                              {weekDays.map((dStr) => {
                                const isSelDay = dStr === selectedDate;
                                const hasEvent = dayDetail?.events.find(e => parseInt(e.start.slice(0, 2), 10) === hr);
                                const isMono = hasEvent ? (hasEvent.kind === "booking" || Boolean(hasEvent.bookingId) || hasEvent.title.toLowerCase().includes("monolog")) : false;
                                return (
                                  <div
                                    key={dStr}
                                    onClick={() => setActionPopover({ date: dStr, time: `${String(hr).padStart(2, "0")}:00` })}
                                    className={`h-full min-h-[40px] rounded-md p-1 cursor-pointer transition-all hover:bg-[var(--color-bg-elevated)] ${isSelDay ? "bg-[var(--color-accent-soft)]/20" : ""}`}
                                  >
                                    {hasEvent && (
                                      <div
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedEventModal({
                                            id: hasEvent.id,
                                            title: hasEvent.title,
                                            date: hasEvent.date,
                                            start: hasEvent.start,
                                            end: hasEvent.end,
                                            kind: hasEvent.kind,
                                            venue: "Studio 4B, Lagos",
                                            description: "Scheduled performance hold/session.",
                                          });
                                        }}
                                        className={`p-1.5 rounded-md text-[11px] font-body font-semibold truncate flex items-center gap-1 ${
                                          isMono
                                            ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-[var(--color-accent)]/30"
                                            : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                                        }`}
                                      >
                                        {isMono ? <LogoMark className="w-3 h-3 shrink-0" /> : <Calendar className="w-3 h-3 shrink-0" />}
                                        <span className="truncate">{hasEvent.title} ({hasEvent.start})</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* DAY VIEW GRID */}
                {calendarView === "day" && (() => {
                  const hours = Array.from({ length: 13 }, (_, i) => i + 8);
                  const dayNameLong = new Date(`${selectedDate}T00:00:00.000Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
                  return (
                    <div className="p-5 rounded-[var(--radius-lg)] mb-4" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-card)" }}>
                      <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: "var(--color-border-default)" }}>
                        <h3 className="font-display text-lg font-bold uppercase tracking-wide" style={{ color: "var(--color-accent)" }}>{dayNameLong}</h3>
                        <Button variant="secondary" className="h-8 px-3 text-xs gap-1" onClick={() => setShowAddSlot(true)}>
                          <Plus className="w-3.5 h-3.5" /> Add slot
                        </Button>
                      </div>

                      <div className="relative space-y-2">
                        <div className="absolute left-0 right-0 top-[35%] z-10 pointer-events-none flex items-center">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[var(--color-accent)] text-white shadow-sm">11:30</span>
                          <div className="h-[2px] flex-1 bg-[var(--color-accent)] opacity-80" />
                        </div>

                        {hours.map((hr) => {
                          const timeStr = `${String(hr).padStart(2, "0")}:00`;
                          const matchedEvents = dayDetail?.events.filter(e => parseInt(e.start.slice(0, 2), 10) === hr) ?? [];
                          return (
                            <div key={hr} className="flex gap-3 min-h-[52px] border-b pb-1" style={{ borderColor: "var(--color-border-default)" }}>
                              <div className="w-16 shrink-0 text-xs font-mono font-medium text-tertiary pt-1" style={{ color: "var(--color-text-tertiary)" }}>
                                {timeStr}
                              </div>
                              <div
                                onClick={() => setActionPopover({ date: selectedDate, time: timeStr })}
                                className="flex-1 rounded-lg p-1.5 cursor-pointer transition-all hover:bg-[var(--color-bg-elevated)] min-h-[44px] flex flex-col justify-center"
                              >
                                {matchedEvents.length === 0 ? (
                                  <div className="text-[11px] font-body text-tertiary opacity-0 hover:opacity-100 transition-opacity">Click to add event or slot</div>
                                ) : (
                                  matchedEvents.map((evt) => {
                                    const isMono = evt.kind === "booking" || Boolean(evt.bookingId) || evt.title.toLowerCase().includes("monolog");
                                    return (
                                      <div
                                        key={evt.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedEventModal({
                                            id: evt.id,
                                            title: evt.title,
                                            date: evt.date,
                                            start: evt.start,
                                            end: evt.end,
                                            kind: evt.kind,
                                            venue: "Main Studio / Remote",
                                            description: "Scheduled event details for this time slot.",
                                          });
                                        }}
                                        className={`p-2 rounded-lg mb-1 flex items-center justify-between text-xs font-body font-semibold ${
                                          isMono
                                            ? "bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/30 text-[var(--color-accent)]"
                                            : "bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400"
                                        }`}
                                      >
                                        <div className="flex items-center gap-1.5">
                                          {isMono ? <LogoMark className="w-3.5 h-3.5 shrink-0" /> : <Calendar className="w-3.5 h-3.5 shrink-0" />}
                                          <span>{evt.title} ({evt.start} – {evt.end})</span>
                                        </div>
                                        <Badge tone="neutral" size="sm">{isMono ? "Monologg" : evt.kind}</Badge>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {loadingDay || !dayDetail ? (
                  <div className="py-16 text-center text-sm font-body" style={{ color: "var(--color-text-tertiary)" }}>Loading…</div>
                ) : (
                  <div className="space-y-4">
                    {/* Open slots — server-authoritative (getOpenSlots) */}
                    <div className="p-4 rounded-[var(--radius-lg)]" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-2 border-b" style={{ borderColor: "var(--color-hairline)" }}>
                        <div>
                          <div className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>
                            Schedule for {formatDayLabel(selectedDate)}
                          </div>
                          <p className="text-xs font-body mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                            {unavailableDates.has(selectedDate) ? "Marked as unavailable for bookings." : "Standard bookable slots active."}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 px-3 text-xs gap-1.5"
                            onClick={() => {
                              handleToggleUnavailable(selectedDate, false);
                              setNewSlotState("free");
                              setShowAddSlot(true);
                            }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)]" /> Mark as Available
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 px-3 text-xs gap-1.5"
                            onClick={() => handleToggleUnavailable(selectedDate, true)}
                          >
                            <X className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Mark as Unavailable
                          </Button>
                        </div>
                      </div>

                      {unavailableDates.has(selectedDate) ? (
                        <div className="p-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 border border-dashed border-neutral-300 dark:border-neutral-700 text-xs font-body text-neutral-500 flex items-center gap-2">
                          <X className="w-4 h-4 text-neutral-400" />
                          <span>This date is currently marked as unavailable. Clients cannot book time slots on this day.</span>
                        </div>
                      ) : dayDetail.openSlots.length === 0 ? (
                        <p className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>No open time — fully unavailable or booked.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {dayDetail.openSlots.map((s, i) => (
                            <Badge key={i} tone="success" size="md">{s.start}–{s.end}</Badge>
                          ))}
                        </div>
                      )}
                      {!dayDetail.block && !unavailableDates.has(selectedDate) && (
                        <p className="text-xs font-body mt-2" style={{ color: "var(--color-text-tertiary)" }}>
                          No overrides set — this day follows the default-free rule{dayDetail.recurringTemplates.length > 0 ? " and your recurring templates" : ""}.
                        </p>
                      )}
                    </div>

                    {/* Explicit slots & Calendar Blocked Slots for this exact day */}
                    <div className="p-4 rounded-[var(--radius-lg)]" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>Slots for this day</div>
                          <p className="text-[11px] font-body text-[var(--color-text-tertiary)] mt-0.5">
                            Availability slots are for event times only. Conflicting calendar events are automatically blocked.
                          </p>
                        </div>
                        <Button variant="secondary" className="h-8 px-3 text-xs gap-1" onClick={() => setShowAddSlot(true)}>
                          <Plus className="w-3.5 h-3.5" /> Add slot
                        </Button>
                      </div>

                      {(!dayDetail.block || dayDetail.block.slots.length === 0) && dayDetail.events.length === 0 ? (
                        <p className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>No explicit slots — add one to mark part of this day free or unavailable.</p>
                      ) : (
                        <div className="space-y-2">
                          {/* Existing calendar events rendered as blocked slots */}
                          {dayDetail.events.map((evt) => (
                            <div
                              key={`blocked-slot-${evt.id}`}
                              className="flex items-center justify-between p-2.5 rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                <span className="text-xs font-mono tnum font-semibold text-[var(--color-text-primary)] shrink-0">
                                  {evt.start}–{evt.end}
                                </span>
                                <Badge tone="neutral" size="sm">Blocked Slot</Badge>
                                <span className="text-xs font-body text-[var(--color-text-secondary)] truncate">
                                  {evt.title} · {calendarSync.connected ? "Google Calendar" : "Calendar Event"}
                                </span>
                              </div>
                              <span className="text-[11px] font-mono font-medium text-amber-600 dark:text-amber-400 shrink-0 ml-2">
                                Busy
                              </span>
                            </div>
                          ))}

                          {/* Explicit user slots */}
                          {dayDetail.block?.slots.map((slot, i) => (
                            <div key={`user-slot-${i}`} className="flex items-center justify-between p-2.5 rounded-[var(--radius-md)]" style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ background: SLOT_STATE_META[slot.state].color }} />
                                <span className="text-xs font-mono tnum" style={{ color: "var(--color-text-primary)" }}>{slot.start}–{slot.end}</span>
                                <Badge tone="neutral" size="sm">{SLOT_STATE_META[slot.state].label}</Badge>
                              </div>
                              {slot.state !== "booked" && (
                                <button onClick={() => handleRemoveSlot(i)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-canvas)] transition-colors cursor-pointer" style={{ color: "var(--color-text-tertiary)" }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Events for this day — informational */}
                    <div className="p-4 rounded-[var(--radius-lg)]" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>Events</div>
                        <Button variant="secondary" className="h-8 px-3 text-xs gap-1" onClick={() => setShowAddEvent(true)}>
                          <Plus className="w-3.5 h-3.5" /> Add event
                        </Button>
                      </div>
                      {dayDetail.events.length === 0 ? (
                        <p className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>Nothing added for this day.</p>
                      ) : (
                        <div className="space-y-2">
                          {dayDetail.events.map((event) => {
                            const isMono = event.kind === "booking" || Boolean(event.bookingId) || event.title.toLowerCase().includes("monolog");
                            return (
                              <div key={event.id} className="flex items-center justify-between p-2.5 rounded-[var(--radius-md)]" style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: isMono ? "var(--color-accent-soft)" : "var(--color-bg-canvas)" }}>
                                    {isMono ? (
                                      <LogoMark className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                                    ) : (
                                      <Calendar className="w-4 h-4 text-sky-500" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>{event.title}</span>
                                      {isMono ? (
                                        <Badge tone="accent" size="sm" className="gap-1">
                                          <LogoMark className="w-2.5 h-2.5" /> Monologg Booking
                                        </Badge>
                                      ) : (
                                        <Badge tone="neutral" size="sm">Google Calendar</Badge>
                                      )}
                                    </div>
                                    <div className="text-xs font-mono tnum mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                                      {event.start}–{event.end}
                                    </div>
                                  </div>
                                </div>
                                <button onClick={() => handleDeleteEvent(event.id)} className="w-7 h-7 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity" style={{ color: "var(--color-text-tertiary)" }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Recurring templates. */}
                    <div className="p-4 rounded-[var(--radius-lg)]" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold font-body flex items-center gap-1.5" style={{ color: "var(--color-text-primary)" }}>
                          <Repeat className="w-4 h-4" /> Recurring availability
                        </div>
                        <Button variant="secondary" className="h-8 px-3 text-xs gap-1" onClick={() => setShowRecurringForm(true)}>
                          <Plus className="w-3.5 h-3.5" /> Add
                        </Button>
                      </div>
                      {dayDetail.recurringTemplates.length === 0 ? (
                        <p className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>No recurring pattern set (e.g. "every weekday 9–5").</p>
                      ) : (
                        <div className="space-y-2">
                          {dayDetail.recurringTemplates.map((t) => (
                            <div key={t.id} className="p-2.5 rounded-[var(--radius-md)]" style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
                              <div className="text-xs font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>{recurRuleLabel(t.recurRule ?? "")}</div>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {t.slots.map((s, i) => (
                                  <Badge key={i} tone="neutral" size="sm">{s.start}–{s.end} · {SLOT_STATE_META[s.state].label}</Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Projects Tab (features.md Phase 14, PWA-14/15/16) ── */}
            {activeTab === "projects" && (
              selectedProject ? (
                /* ── Fresh Project Details Page View ── */
                <motion.div
                  key={`project-detail-${selectedProject.id}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Top Bar: Back link & Status */}
                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedProject(null)}
                      className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold font-body py-1.5 px-3 -ml-2 rounded-xl transition-all hover:bg-[var(--color-bg-elevated)]"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Projects</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {selectedProject.myApplication ? (
                        <Badge
                          tone={
                            selectedProject.myApplication.status === "SELECTED"
                              ? "success"
                              : selectedProject.myApplication.status === "REJECTED" || selectedProject.myApplication.status === "WITHDRAWN"
                              ? "error"
                              : "accent"
                          }
                          size="md"
                        >
                          {APPLICATION_STATUS_LABEL[selectedProject.myApplication.status]}
                        </Badge>
                      ) : selectedProject.applicationsOpen ? (
                        <Badge tone="success" size="md">Accepting Pitches</Badge>
                      ) : (
                        <Badge tone="neutral" size="md">Applications Closed</Badge>
                      )}
                    </div>
                  </div>

                  {/* Project Header Banner (Clean editorial style, no gradients) */}
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
                        <span className="font-semibold text-sm font-body text-[var(--color-accent)]">
                          {selectedProject.clientName}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                          <ShieldCheck className="w-3.5 h-3.5" /> Verified Client
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowClientReviewsModal(true)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer group"
                          title="Click to view client ratings & reviews"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 group-hover:scale-110 transition-transform" />
                          <span>{selectedProject.clientRating ?? 4.9} ({selectedProject.clientReviews ?? 18} reviews)</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge tone="accent" size="md">{selectedProject.projectType}</Badge>
                        <Badge tone={isProjectOnline(selectedProject) ? "neutral" : "accent"} size="md">
                          {isProjectOnline(selectedProject) ? "Online Project" : "Onsite Project"}
                        </Badge>
                      </div>
                    </div>

                    <h1
                      className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-4"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {selectedProject.projectName}
                    </h1>

                    <div className="flex items-center gap-4 sm:gap-6 flex-wrap text-xs sm:text-sm font-body" style={{ color: "var(--color-text-secondary)" }}>
                      <div className="flex items-center gap-1.5 font-medium">
                        {isProjectOnline(selectedProject) ? (
                          <Globe className="w-4 h-4 text-sky-500 shrink-0" />
                        ) : (
                          <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                        )}
                        <span>{selectedProject.location || (isProjectOnline(selectedProject) ? "Remote (Online)" : "Lagos, NG (On-site)")}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                        <span>{selectedProject.timeline || "Auditions close Oct 24 · Production: Nov 2026"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>100% Escrow Funded</span>
                      </div>
                    </div>
                  </div>

                  {/* Airbnb / Binance / Upwork Segmented Tabs */}
                  <div
                    className="flex items-center gap-1 p-1 rounded-xl border overflow-x-auto no-scrollbar shadow-2xs"
                    style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-border-default)" }}
                  >
                    {[
                      { id: "overview", label: "Overview & Brief", icon: FileText },
                      { id: "requirements", label: "Roles & Requirements", icon: Users },
                      { id: "sides", label: "Script & Materials", icon: Layers },
                      { id: "escrow", label: "Client & Escrow", icon: ShieldCheck },
                      ...(selectedProject.myApplication
                        ? [
                            {
                              id: "application",
                              label: "My Application",
                              icon: Sparkles,
                              badge: APPLICATION_STATUS_LABEL[selectedProject.myApplication.status],
                            },
                          ]
                        : []),
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = projectDetailTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setProjectDetailTab(tab.id as any)}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                            isActive
                              ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] font-semibold shadow-xs"
                              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]/50"
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)]"}`} />
                          <span>{tab.label}</span>
                          {(tab as any).badge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-accent)] text-white shadow-2xs">
                              {(tab as any).badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Two-Column Breakdown: Left Tabbed Details, Right Sticky Compensation & Action */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                    {/* Left Column (8 cols): Clean Tab Content */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-6">

                      {/* Tab 1: Overview & Brief (Mirrors ProjectBrief.tsx inputs) */}
                      {projectDetailTab === "overview" && (
                        <motion.div
                          key="tab-overview"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-6"
                        >
                          {/* Creative Brief & Synopsis */}
                          <div
                            className="p-6 sm:p-7 rounded-3xl border space-y-4"
                            style={{
                              background: "var(--color-bg-surface)",
                              borderColor: "var(--color-border-default)",
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-[var(--color-accent)]" />
                              <h2 className="font-display text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                                Creative Brief &amp; Synopsis
                              </h2>
                            </div>
                            <p className="text-sm font-body leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                              {selectedProject.description ||
                                "Seeking a commanding, resonant voiceover artist for Nike's Q1 regional multimedia campaign celebrating Nigerian grassroots athletics across digital, broadcast, and social channels."}
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
                                  {isProjectOnline(selectedProject) ? (
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
                                  <span>{selectedProject.location || (isProjectOnline(selectedProject) ? "Remote Recording Session" : "Lagos, Nigeria")}</span>
                                </div>
                              </div>

                              <div className="p-3.5 rounded-2xl border space-y-1" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}>
                                <span className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)] block">Production Timeline</span>
                                <div className="flex items-center gap-2 font-medium" style={{ color: "var(--color-text-primary)" }}>
                                  <Clock className="w-4 h-4 text-[var(--color-accent)]" />
                                  <span>{selectedProject.timeline || "Auditions close Oct 24 · Delivery Nov 2026"}</span>
                                </div>
                              </div>

                              <div className="p-3.5 rounded-2xl border space-y-1" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}>
                                <span className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)] block">Escrow Settlement</span>
                                <div className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
                                  <Lock className="w-4 h-4" />
                                  <span>100% Upfront Paystack Escrow</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Tab 2: Role Requirements */}
                      {projectDetailTab === "requirements" && (
                        <motion.div
                          key="tab-requirements"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-6"
                        >
                          <div
                            className="p-6 sm:p-7 rounded-3xl border space-y-5"
                            style={{
                              background: "var(--color-bg-surface)",
                              borderColor: "var(--color-border-default)",
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-[var(--color-accent)]" />
                              <h2 className="font-display text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                                Role &amp; Craft Requirements
                              </h2>
                            </div>

                            <div>
                              <div className="text-xs font-semibold font-body tracking-normal mb-2.5" style={{ color: "var(--color-text-tertiary)" }}>
                                Target craft niches
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {selectedProject.nicheReq.map((n) => (
                                  <Badge key={n} tone="neutral" size="md" className="capitalize">
                                    {n.replace(/_/g, " ")}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <div className="pt-2 border-t" style={{ borderColor: "var(--color-hairline)" }}>
                              <div className="text-xs font-semibold font-body tracking-normal mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                                Performer guidelines &amp; notes from client
                              </div>
                              <p className="text-sm font-body leading-relaxed mb-3" style={{ color: "var(--color-text-secondary)" }}>
                                {selectedProject.additionalNotes ||
                                  "Audition must be recorded with a professional condenser microphone. No reverb or room acoustics in background tone. Authentic, inspiring, and grounded Nigerian accent / African cadence desired."}
                              </p>
                              <ul className="text-sm font-body space-y-2 pl-4 list-disc" style={{ color: "var(--color-text-secondary)" }}>
                                <li>Must have verified performer profile and relevant portfolio demo clips.</li>
                                <li>Access to professional recording acoustics or studio space.</li>
                                <li>Prompt communication and adherence to production delivery milestones.</li>
                              </ul>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Tab 3: Script & Materials (Sides + Attached Reference Files) */}
                      {projectDetailTab === "sides" && (
                        <motion.div
                          key="tab-sides"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-6"
                        >
                          {(() => {
                            const rawScript =
                              selectedProject.scriptSample ||
                              "They told you impossible is a standard. We tell you it's a starting line. When the whistle blows in Surulere, the world listens. Nike: Just Do It.";
                            const cleanScript = rawScript
                              .replace(/^(Sides\s*\/\s*Script\s*Excerpt|Opening\s*Keynote\s*Excerpt|Model\s*Directives|Hook\s*Excerpt|Routine\s*Sample):\s*\n?/i, "")
                              .replace(/^'([\s\S]*)'$/, "$1")
                              .trim();

                            return (
                              <div
                                className="p-6 sm:p-7 rounded-3xl border space-y-5"
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

                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(cleanScript);
                                      setCopiedScript(true);
                                      setTimeout(() => setCopiedScript(false), 2000);
                                    }}
                                    className="h-8 px-3 rounded-xl border text-xs font-semibold font-body flex items-center gap-1.5 transition-all hover:bg-[var(--color-bg-elevated)] cursor-pointer"
                                    style={{
                                      borderColor: "var(--color-border-default)",
                                      color: copiedScript ? "var(--color-success)" : "var(--color-text-secondary)",
                                    }}
                                  >
                                    {copiedScript ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                                        <span className="text-emerald-500">Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy Script</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                <p className="text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>
                                  Use this script excerpt for your audition take or pitch video recording:
                                </p>

                                <div
                                  className="p-4 sm:p-5 rounded-2xl border font-body text-sm leading-relaxed whitespace-pre-wrap select-text border-l-4"
                                  style={{
                                    background: "var(--color-bg-elevated)",
                                    borderColor: "var(--color-hairline)",
                                    borderLeftColor: "var(--color-accent)",
                                    color: "var(--color-text-primary)",
                                  }}
                                >
                                  {cleanScript}
                                </div>

                                {/* Attached Files from Project Brief Step 3 */}
                                <div className="pt-4 border-t space-y-3" style={{ borderColor: "var(--color-hairline)" }}>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wider font-body" style={{ color: "var(--color-text-tertiary)" }}>
                                      Project Reference Files
                                    </span>
                                    <span className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>
                                      3 files attached
                                    </span>
                                  </div>

                                  <div className="space-y-2">
                                    {[
                                      { name: "Nike_Q1_Campaign_Creative_Brief.pdf", size: "2.4 MB", type: "PDF Document" },
                                      { name: "Brand_Audio_Identity_Guidelines.pdf", size: "1.8 MB", type: "Style Guide" },
                                      { name: "Reference_Tone_Scratch_Track.wav", size: "14.2 MB", type: "Audio Reference" },
                                    ].map((file, fIdx) => (
                                      <div
                                        key={fIdx}
                                        className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs font-body transition-colors hover:bg-[var(--color-bg-elevated)]"
                                        style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-hairline)" }}
                                      >
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-[var(--color-accent)] flex items-center justify-center shrink-0">
                                            <FileText className="w-4 h-4" />
                                          </div>
                                          <div className="min-w-0">
                                            <div className="font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>{file.name}</div>
                                            <div className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>{file.type} · {file.size}</div>
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => alert(`Downloading reference file: ${file.name}`)}
                                          className="p-2 rounded-lg hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors shrink-0"
                                          title="Download attachment"
                                        >
                                          <Download className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </motion.div>
                      )}

                      {/* Tab 4: Client & Escrow Security */}
                      {projectDetailTab === "escrow" && (
                        <motion.div
                          key="tab-escrow"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-6"
                        >
                          {/* Verified Casting Client Card */}
                          <div
                            className="p-6 sm:p-7 rounded-3xl border space-y-5"
                            style={{
                              background: "var(--color-bg-surface)",
                              borderColor: "var(--color-border-default)",
                            }}
                          >
                            <div className="flex items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: "var(--color-hairline)" }}>
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                <h2 className="font-display text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                                  Casting Client &amp; Escrow Verification
                                </h2>
                              </div>
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                100% Escrow Funded
                              </span>
                            </div>

                            <div className="flex items-start justify-between flex-wrap gap-4">
                              <div className="flex items-center gap-3.5">
                                <div
                                  className="w-11 h-11 rounded-2xl flex items-center justify-center font-display text-base font-bold text-white shrink-0 shadow-sm"
                                  style={{ background: "var(--color-accent)" }}
                                >
                                  {selectedProject.clientName.charAt(0)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 font-display font-semibold text-base" style={{ color: "var(--color-text-primary)" }}>
                                    <span>{selectedProject.clientName}</span>
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setShowClientReviewsModal(true)}
                                    className="text-xs font-body hover:underline text-left cursor-pointer transition-colors block mt-0.5"
                                    style={{ color: "var(--color-text-secondary)" }}
                                    title="Click to view client ratings & reviews"
                                  >
                                    Verified Client · {selectedProject.clientReviews ?? 18} projects completed · <span className="text-amber-500 font-semibold">{selectedProject.clientRating ?? 4.9} rating ★</span>
                                  </button>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => setShowClientReviewsModal(true)}
                                className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold font-body transition-all hover:bg-[var(--color-bg-elevated)] cursor-pointer"
                                style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-primary)" }}
                              >
                                View Client Reviews
                              </button>
                            </div>

                            {/* Client Track Record Telemetry Dock */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border-default)] border border-[var(--color-border-default)] rounded-2xl bg-[var(--color-bg-elevated)] overflow-hidden">
                              <div className="text-center p-3 sm:p-3.5">
                                <span className="text-[10px] uppercase font-semibold font-body block" style={{ color: "var(--color-text-tertiary)" }}>Projects</span>
                                <span className="font-display text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{selectedProject.clientReviews ?? 18} funded</span>
                              </div>
                              <div className="text-center p-3 sm:p-3.5">
                                <span className="text-[10px] uppercase font-semibold font-body block" style={{ color: "var(--color-text-tertiary)" }}>Rating</span>
                                <span className="font-display text-sm font-bold text-amber-500">{selectedProject.clientRating ?? 4.9} ★★★★★</span>
                              </div>
                              <div className="text-center p-3 sm:p-3.5">
                                <span className="text-[10px] uppercase font-semibold font-body block" style={{ color: "var(--color-text-tertiary)" }}>Release Speed</span>
                                <span className="font-display text-sm font-bold text-emerald-600 dark:text-emerald-400">&lt; 2 hours</span>
                              </div>
                              <div className="text-center p-3 sm:p-3.5">
                                <span className="text-[10px] uppercase font-semibold font-body block" style={{ color: "var(--color-text-tertiary)" }}>Escrow Status</span>
                                <span className="font-display text-sm font-bold text-emerald-600 dark:text-emerald-400">100% Secured</span>
                              </div>
                            </div>

                            <p className="text-sm font-body leading-relaxed pt-2 border-t border-[var(--color-hairline)]" style={{ color: "var(--color-text-secondary)" }}>
                              Premier West African casting partner with a flawless escrow release track record on Monologg. Known for transparent briefs, prompt feedback, and instant bank disbursement upon deliverable approval.
                            </p>
                          </div>

                          {/* Escrow Guarantee 3-Pillar Security Architecture (List with Dividers) */}
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
                              {/* Pillar 1: Locked Upfront */}
                              <div className="py-4 first:pt-3 last:pb-1 flex items-start gap-3.5 sm:gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                                  <Shield className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="font-display text-sm font-bold text-[var(--color-text-primary)]">
                                      1. Locked Upfront
                                    </span>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      100% Funded
                                    </span>
                                  </div>
                                  <p className="text-xs sm:text-sm font-body leading-relaxed text-[var(--color-text-secondary)]">
                                    100% of compensation is held in escrow before you confirm your booking or record.
                                  </p>
                                </div>
                              </div>

                              {/* Pillar 2: 48h Auto-Release */}
                              <div className="py-4 last:pb-1 flex items-start gap-3.5 sm:gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                                  <Clock className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="font-display text-sm font-bold text-[var(--color-text-primary)]">
                                      2. 48h Auto-Release
                                    </span>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      Guaranteed Window
                                    </span>
                                  </div>
                                  <p className="text-xs sm:text-sm font-body leading-relaxed text-[var(--color-text-secondary)]">
                                    Client has 48 hours to review files. Funds release automatically if no revisions are requested.
                                  </p>
                                </div>
                              </div>

                              {/* Pillar 3: Direct Payout */}
                              <div className="py-4 last:pb-1 flex items-start gap-3.5 sm:gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                                  <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="font-display text-sm font-bold text-[var(--color-text-primary)]">
                                      3. Direct Payout
                                    </span>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      Instant Disbursement
                                    </span>
                                  </div>
                                  <p className="text-xs sm:text-sm font-body leading-relaxed text-[var(--color-text-secondary)]">
                                    Net earnings are disbursed straight into your designated local bank account with zero chargeback risk.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Tab 5: My Application & Pitch (Elevated FAANG Treatment) */}
                      {projectDetailTab === "application" && selectedProject.myApplication && (
                        <motion.div
                          key="tab-application"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-6"
                        >
                          <div
                            className="p-6 sm:p-8 rounded-3xl border space-y-6"
                            style={{
                              background: "var(--color-bg-surface)",
                              borderColor: "var(--color-border-default)",
                              boxShadow: "var(--shadow-card)",
                            }}
                          >
                            {/* Status Header & Stage Pipeline */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b" style={{ borderColor: "var(--color-hairline)" }}>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
                                  <span className="text-xs font-semibold uppercase tracking-wider font-body text-[var(--color-accent)]">
                                    Your Application
                                  </span>
                                </div>
                                <h2 className="font-display text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                                  Audition Pitch to {selectedProject.clientName}
                                </h2>
                              </div>
                              <Badge
                                tone={
                                  selectedProject.myApplication.status === "SELECTED"
                                    ? "success"
                                    : selectedProject.myApplication.status === "REJECTED" || selectedProject.myApplication.status === "WITHDRAWN"
                                    ? "error"
                                    : "accent"
                                }
                                size="lg"
                              >
                                {APPLICATION_STATUS_LABEL[selectedProject.myApplication.status]}
                              </Badge>
                            </div>

                            {/* Visual Application Journey Timeline */}
                            <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl" style={{ background: "var(--color-bg-elevated)" }}>
                              <div className="text-center sm:text-left space-y-1">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>1. Submitted</span>
                                </div>
                                <div className="text-[11px] font-body" style={{ color: "var(--color-text-tertiary)" }}>
                                  {(selectedProject.myApplication as any).appliedAt || "Oct 22, 2026"}
                                </div>
                              </div>

                              <div className="text-center sm:text-left space-y-1">
                                <div className={`flex items-center gap-1.5 text-xs font-semibold ${
                                  selectedProject.myApplication.status === "SELECTED" || selectedProject.myApplication.status === "SHORTLISTED"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-amber-500"
                                }`}>
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>2. Client Review</span>
                                </div>
                                <div className="text-[11px] font-body" style={{ color: "var(--color-text-tertiary)" }}>
                                  {selectedProject.myApplication.status === "SELECTED" ? "Accepted" : "In Progress"}
                                </div>
                              </div>

                              <div className="text-center sm:text-left space-y-1">
                                <div className={`flex items-center gap-1.5 text-xs font-semibold ${
                                  selectedProject.myApplication.status === "SELECTED"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-zinc-400"
                                }`}>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>3. Final Contract</span>
                                </div>
                                <div className="text-[11px] font-body" style={{ color: "var(--color-text-tertiary)" }}>
                                  {selectedProject.myApplication.status === "SELECTED" ? "Hired & Funded" : "Pending"}
                                </div>
                              </div>
                            </div>

                            {/* Quoted Pitch Statement */}
                            <div className="space-y-2">
                              <div className="text-xs font-semibold uppercase tracking-wider font-body" style={{ color: "var(--color-text-tertiary)" }}>
                                Your Submitted Pitch Note
                              </div>
                              <div
                                className="p-5 sm:p-6 rounded-2xl border font-body text-base leading-relaxed border-l-4 italic"
                                style={{
                                  background: "var(--color-bg-elevated)",
                                  borderColor: "var(--color-hairline)",
                                  borderLeftColor: "var(--color-accent)",
                                  color: "var(--color-text-primary)",
                                }}
                              >
                                &ldquo;{selectedProject.myApplication.pitch || "I've voiced three prior Nike regional spots."}&rdquo;
                              </div>
                            </div>

                            {/* Performance Reel & Sample Take */}
                            <div className="space-y-2">
                              <div className="text-xs font-semibold uppercase tracking-wider font-body" style={{ color: "var(--color-text-tertiary)" }}>
                                Audition Take / Demo Sample
                              </div>
                              <div className="p-4 rounded-2xl border flex items-center justify-between gap-4 flex-wrap" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-[var(--color-accent)] flex items-center justify-center shrink-0">
                                    <Headphones className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-sm font-body" style={{ color: "var(--color-text-primary)" }}>
                                      Audition_Take_Master.mp3
                                    </div>
                                    <div className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>
                                      24-bit · 48kHz WAV Export · 3.2 MB
                                    </div>
                                  </div>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                  Delivered to Client
                                </span>
                              </div>
                            </div>

                            {/* Status Specific Outcome Box & Action Buttons */}
                            {selectedProject.myApplication.status === "SELECTED" ? (
                              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-4">
                                <div className="flex items-start gap-3">
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                  <div>
                                    <div className="font-display font-bold text-base text-emerald-700 dark:text-emerald-300">
                                      You have been selected for this project!
                                    </div>
                                    <p className="text-sm font-body text-emerald-800 dark:text-emerald-200 mt-1">
                                      {selectedProject.clientName} has approved your pitch and funded the full escrow deposit. Your Order Room is now active.
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  className="w-full sm:w-auto h-11 px-6 text-sm font-bold gap-2 shadow-sm"
                                  onClick={() => {
                                    setSelectedProject(null);
                                    navigate("/order/ORD-001?role=talent");
                                  }}
                                >
                                  Enter Order Room <ChevronRight className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : selectedProject.myApplication.status === "SHORTLISTED" ? (
                              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-4">
                                <div className="flex items-start gap-3">
                                  <Star className="w-5 h-5 text-amber-500 fill-amber-400 shrink-0 mt-0.5" />
                                  <div>
                                    <div className="font-display font-bold text-base text-amber-800 dark:text-amber-200">
                                      You are on the client&apos;s shortlist!
                                    </div>
                                    <p className="text-sm font-body text-amber-700 dark:text-amber-300 mt-1">
                                      The casting director has shortlisted your audition and will make the final hire decision before auditions close.
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="secondary"
                                  className="h-10 px-5 text-xs font-semibold"
                                  onClick={() => handleWithdrawApplication(selectedProject.myApplication!.id)}
                                >
                                  Withdraw Application
                                </Button>
                              </div>
                            ) : selectedProject.myApplication.status === "APPLIED" ? (
                              <div className="p-5 rounded-2xl border space-y-4" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}>
                                <div className="flex items-start gap-3">
                                  <Clock className="w-5 h-5 text-[var(--color-accent)] shrink-0 mt-0.5" />
                                  <div>
                                    <div className="font-display font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>
                                      Application under review
                                    </div>
                                    <p className="text-xs font-body mt-1 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                                      Your pitch is in queue. {selectedProject.clientName} is reviewing applicant reels. You will receive an immediate notification when a decision is made.
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="secondary"
                                  className="h-10 px-5 text-xs font-semibold"
                                  onClick={() => handleWithdrawApplication(selectedProject.myApplication!.id)}
                                >
                                  Withdraw Application
                                </Button>
                              </div>
                            ) : (
                              <div className="p-5 rounded-2xl border space-y-4" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}>
                                <p className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>
                                  This application is inactive.
                                </p>
                                <Button
                                  variant="secondary"
                                  className="h-10 px-5 text-xs font-semibold"
                                  onClick={() => setSelectedProject(null)}
                                >
                                  Browse Other Open Projects
                                </Button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}

                    </div>

                    {/* Right Column (4 cols): Sticky Compensation & Action Card */}
                    <div className="lg:col-span-5 xl:col-span-4">
                      <div
                        className="p-6 rounded-3xl border sticky top-6 space-y-5"
                        style={{
                          background: "var(--color-bg-surface)",
                          borderColor: "var(--color-border-default)",
                          boxShadow: "var(--shadow-card)",
                        }}
                      >
                        {/* Budget & 3-line fee breakdown */}
                        <div>
                          <div className="text-xs font-semibold font-body tracking-normal mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                            Your earnings
                          </div>
                          {(() => {
                            const numBudget = Number(selectedProject.budget?.replace(/\D/g, "")) || 0;
                            const fee = Math.round(numBudget * 0.07);
                            const net = numBudget - fee;
                            return (
                              <div className="p-4 rounded-2xl border space-y-2 text-xs font-body" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}>
                                <div className="flex justify-between items-center" style={{ color: "var(--color-text-secondary)" }}>
                                  <span>Base rate</span>
                                  <span className="font-mono font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>₦{numBudget.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center" style={{ color: "var(--color-text-secondary)" }}>
                                  <span>Platform fee (7%)</span>
                                  <span className="font-mono text-zinc-500 font-medium">-₦{fee.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center font-semibold pt-2 border-t text-sm" style={{ borderColor: "var(--color-hairline)", color: "var(--color-text-primary)" }}>
                                  <span>You receive</span>
                                  <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">₦{net.toLocaleString()}</span>
                                </div>
                              </div>
                            );
                          })()}
                          <button
                            type="button"
                            onClick={() => setProjectDetailTab("escrow")}
                            className="flex items-center gap-1.5 mt-2.5 text-xs font-body font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>Held in escrow · Paid to your bank on approval</span>
                          </button>
                        </div>

                        {/* Applicant spots — only relevant before you apply */}
                        {!selectedProject.myApplication && selectedProject.applicationsOpen && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-body">
                              <span className="font-medium" style={{ color: "var(--color-text-secondary)" }}>Applicants</span>
                              <span className="font-semibold font-mono" style={{ color: "var(--color-text-primary)" }}>
                                {selectedProject.applicantCount} / {selectedProject.applicantCap || 10}
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, (selectedProject.applicantCount / (selectedProject.applicantCap || 10)) * 100)}%`,
                                  background: "var(--color-accent)",
                                }}
                              />
                            </div>
                            <div className="text-[11px] font-body font-medium text-amber-600 dark:text-amber-400">
                              {Math.max(0, (selectedProject.applicantCap || 10) - selectedProject.applicantCount)} spots left
                            </div>
                          </div>
                        )}

                        {/* Action Center */}
                        {applyError && (
                          <div
                            className="p-3 rounded-xl text-xs font-body"
                            style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}
                          >
                            {applyError}
                          </div>
                        )}

                        {/* State 1: Already Applied — single status-aware card */}
                        {selectedProject.myApplication ? (
                          <div
                            className="p-4 sm:p-5 rounded-2xl border space-y-3.5"
                            style={{
                              background:
                                selectedProject.myApplication.status === "SELECTED"
                                  ? "rgba(16, 185, 129, 0.08)"
                                  : "var(--color-bg-elevated)",
                              borderColor:
                                selectedProject.myApplication.status === "SELECTED"
                                  ? "rgba(16, 185, 129, 0.3)"
                                  : "var(--color-hairline)",
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>
                                Your application
                              </span>
                              <Badge
                                tone={
                                  selectedProject.myApplication.status === "SELECTED"
                                    ? "success"
                                    : selectedProject.myApplication.status === "REJECTED" || selectedProject.myApplication.status === "WITHDRAWN"
                                    ? "error"
                                    : "accent"
                                }
                                size="sm"
                              >
                                {APPLICATION_STATUS_LABEL[selectedProject.myApplication.status]}
                              </Badge>
                            </div>

                            <p className="text-xs font-body leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                              {selectedProject.myApplication.status === "SELECTED"
                                ? `You're hired. ${selectedProject.clientName} has funded escrow — kick off in the Order Room.`
                                : selectedProject.myApplication.status === "SHORTLISTED"
                                ? `You're on the shortlist. ${selectedProject.clientName} is making a final decision.`
                                : selectedProject.myApplication.status === "REJECTED"
                                ? `${selectedProject.clientName} went with another performer this time.`
                                : selectedProject.myApplication.status === "WITHDRAWN"
                                ? "You withdrew this application."
                                : `Sent to ${selectedProject.clientName}. We'll notify you as soon as they decide.`}
                            </p>

                            {selectedProject.myApplication.status === "SELECTED" ? (
                              <Button
                                className="w-full h-11 text-xs font-semibold gap-1.5"
                                onClick={() => {
                                  setSelectedProject(null);
                                  navigate("/order/ORD-001?role=talent");
                                }}
                              >
                                Open Order Room <ChevronRight className="w-4 h-4" />
                              </Button>
                            ) : selectedProject.myApplication.status === "REJECTED" || selectedProject.myApplication.status === "WITHDRAWN" ? (
                              <Button
                                variant="secondary"
                                className="w-full h-10 text-xs font-semibold"
                                onClick={() => setSelectedProject(null)}
                              >
                                Browse open projects
                              </Button>
                            ) : confirmingWithdraw ? (
                              <div className="space-y-2 pt-1">
                                <p className="text-[11px] font-body" style={{ color: "var(--color-text-tertiary)" }}>
                                  Withdraw your pitch? You can't re-apply to this project.
                                </p>
                                <div className="flex gap-2">
                                  <Button
                                    variant="secondary"
                                    className="flex-1 h-9 text-xs"
                                    onClick={() => setConfirmingWithdraw(false)}
                                  >
                                    Keep it
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    className="flex-1 h-9 text-xs text-rose-500 border-rose-500/30 hover:bg-rose-500/10"
                                    onClick={() => {
                                      handleWithdrawApplication(selectedProject.myApplication!.id);
                                      setConfirmingWithdraw(false);
                                    }}
                                  >
                                    Withdraw
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                {projectDetailTab !== "application" && (
                                  <Button
                                    variant="secondary"
                                    className="w-full h-10 text-xs font-semibold"
                                    onClick={() => setProjectDetailTab("application")}
                                  >
                                    View my pitch
                                  </Button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setConfirmingWithdraw(true)}
                                  className="text-center text-xs font-body hover:underline hover:text-rose-500 py-1 transition-colors cursor-pointer"
                                  style={{ color: "var(--color-text-tertiary)" }}
                                >
                                  Withdraw application
                                </button>
                              </div>
                            )}
                          </div>
                        ) : !selectedProject.applicationsOpen ? (
                          /* State 2: Closed */
                          <div
                            className="p-4 rounded-2xl text-center text-xs font-body border"
                            style={{
                              background: "var(--color-bg-elevated)",
                              borderColor: "var(--color-hairline)",
                              color: "var(--color-text-secondary)",
                            }}
                          >
                            This project is no longer accepting applications.
                          </div>
                        ) : !isProfileComplete ? (
                          /* State 3: Incomplete Profile */
                          <div
                            className="p-4 rounded-2xl border space-y-3"
                            style={{ background: "rgba(224, 77, 44, 0.05)", borderColor: "rgba(224, 77, 44, 0.3)" }}
                          >
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                              <span className="text-xs font-bold font-body text-[var(--color-accent)] uppercase tracking-wider">
                                Complete Profile to Apply
                              </span>
                            </div>
                            <div className="space-y-1.5 text-xs font-body">
                              <div className="flex items-center gap-2">
                                {hasBio ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <div className="w-3.5 h-3.5 rounded-full border border-dashed border-zinc-400" />}
                                <span style={{ color: hasBio ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}>Bio written</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {hasLocation ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <div className="w-3.5 h-3.5 rounded-full border border-dashed border-zinc-400" />}
                                <span style={{ color: hasLocation ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}>Location specified</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {hasRateCard ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <div className="w-3.5 h-3.5 rounded-full border border-dashed border-zinc-400" />}
                                <span style={{ color: hasRateCard ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}>At least 1 Rate Card created</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {hasReel ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <div className="w-3.5 h-3.5 rounded-full border border-dashed border-zinc-400" />}
                                <span style={{ color: hasReel ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}>Featured Performance Reel</span>
                              </div>
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="w-full text-xs"
                              onClick={() => {
                                setSelectedProject(null);
                                setActiveTab("storefront");
                              }}
                            >
                              Complete Profile
                            </Button>
                          </div>
                        ) : (
                          /* State 4: Ready to Pitch */
                          <div className="space-y-3">
                            {/* On-site requirement (online gigs need no extra explanation) */}
                            {!isProjectOnline(selectedProject) && (
                              <div className="p-3.5 rounded-xl border flex items-start gap-2.5 bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100">
                                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                                <div className="text-xs font-body leading-relaxed">
                                  <span className="font-bold">In-person.</span>{" "}
                                  You'll need to be at {selectedProject.location || "the client's venue"} and enter the client's 4-digit check-in code on arrival to unlock payout.
                                </div>
                              </div>
                            )}

                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 font-body" style={{ color: "var(--color-text-secondary)" }}>
                                Audition Pitch (optional)
                              </label>
                              <textarea
                                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-body border resize-none focus:outline-none focus:border-[var(--color-accent)]"
                                rows={3}
                                placeholder="Highlight relevant brand work, availability, or turnaround time…"
                                value={pitchText}
                                onChange={(e) => setPitchText(e.target.value)}
                                style={{
                                  background: "var(--color-bg-elevated)",
                                  borderColor: "var(--color-hairline)",
                                  color: "var(--color-text-primary)",
                                }}
                              />
                            </div>
                            <Button
                              className="w-full h-11 rounded-xl text-sm font-semibold"
                              disabled={applying}
                              onClick={handleApply}
                            >
                              {applying ? "Submitting Pitch…" : "Submit Application"}
                              <Send className="w-4 h-4 ml-2" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="projects" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex p-1 rounded-xl mb-5 w-full max-w-xs sm:max-w-sm" style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
                  {(["browse", "applications"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setProjectsSubTab(tab)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold font-body transition-all"
                      style={{
                        background: projectsSubTab === tab ? "var(--color-accent)" : "transparent",
                        color: projectsSubTab === tab ? "var(--color-accent-on)" : "var(--color-text-secondary)",
                      }}
                    >
                      {tab === "browse" ? "Browse Projects" : "My Applications"}
                    </button>
                  ))}
                </div>

                {projectsSubTab === "browse" ? (
                  <>
                    {!isProfileComplete && (
                      <div className="mb-5 p-4 rounded-[20px] bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[var(--color-accent-glow)] text-[var(--color-accent)] flex items-center justify-center shrink-0">
                            <AlertCircle className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold font-body text-[var(--color-text-primary)]">
                              Complete Your Profile to Apply
                            </h4>
                            <p className="text-xs font-body text-[var(--color-text-secondary)] mt-0.5">
                              Clients require a completed bio, at least 1 rate card, and a performance reel before accepting pitches.
                            </p>
                          </div>
                        </div>
                        <Button size="sm" className="shrink-0" onClick={() => setActiveTab("storefront")}>
                          Complete Profile
                        </Button>
                      </div>
                    )}

                    {/* Search bar with Filters button beside it */}
                    <div className="mb-5">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--color-text-tertiary)" }} />
                          <Input
                            placeholder="Search projects by title, client, or role…"
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            className="!h-10 text-xs sm:text-sm pl-10 pr-9 rounded-xl !bg-[var(--color-bg-surface)] border-[var(--color-border-default)] focus:!border-[var(--color-accent)]"
                          />
                          {projectSearch && (
                            <button
                              type="button"
                              aria-label="Clear project search"
                              onClick={() => setProjectSearch("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowProjectFilterModal(true)}
                          aria-label="Filter projects"
                          className={`h-10 px-3.5 rounded-xl border text-xs font-semibold font-body inline-flex items-center gap-2 shrink-0 transition-all ${
                            activeProjectFilterCount > 0
                              ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                              : "hover:border-[var(--color-border-strong)]"
                          }`}
                          style={{
                            background: activeProjectFilterCount > 0 ? "var(--color-accent-soft)" : "var(--color-bg-surface)",
                            borderColor: activeProjectFilterCount > 0 ? "var(--color-accent)" : "var(--color-border-default)",
                            color: activeProjectFilterCount > 0 ? "var(--color-accent)" : "var(--color-text-primary)",
                          }}
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                          <span>Filters</span>
                          {activeProjectFilterCount > 0 && (
                            <span
                              className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center font-mono tnum"
                              style={{ background: "var(--color-accent)", color: "var(--color-accent-on)" }}
                            >
                              {activeProjectFilterCount}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Active Filter Chips */}
                      {activeProjectFilterCount > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-3">
                          {projectRoleFilter !== "all" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-[var(--color-accent)]">
                              Category: {projectRoleFilter}
                              <button onClick={() => setProjectRoleFilter("all")} className="hover:opacity-75"><X className="w-3 h-3" /></button>
                            </span>
                          )}
                          {projectBudgetSlider > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-[var(--color-accent)]">
                              Min Budget: ₦{projectBudgetSlider.toLocaleString()}
                              <button onClick={() => setProjectBudgetSlider(0)} className="hover:opacity-75"><X className="w-3 h-3" /></button>
                            </span>
                          )}
                          {projectRatingSlider > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-[var(--color-accent)]">
                              Rating: {projectRatingSlider.toFixed(1)}+ ★
                              <button onClick={() => setProjectRatingSlider(0)} className="hover:opacity-75"><X className="w-3 h-3" /></button>
                            </span>
                          )}
                          {projectLocationFilter !== "all" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-[var(--color-accent)]">
                              Location: {projectLocationFilter}
                              <button onClick={() => setProjectLocationFilter("all")} className="hover:opacity-75"><X className="w-3 h-3" /></button>
                            </span>
                          )}
                          {projectStatusFilter !== "all" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-[var(--color-accent)]">
                              Status: {projectStatusFilter}
                              <button onClick={() => setProjectStatusFilter("all")} className="hover:opacity-75"><X className="w-3 h-3" /></button>
                            </span>
                          )}
                          <button onClick={resetProjectFilters} className="text-[11px] font-semibold text-[var(--color-accent)] hover:underline ml-1">
                            Clear all
                          </button>
                        </div>
                      )}
                    </div>

                    {filteredProjects.length === 0 ? (
                      <div className="text-center py-16">
                        <Briefcase className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--color-text-tertiary)" }} />
                        <h3 className="font-body text-lg font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>No open projects right now</h3>
                        <p className="text-sm font-body" style={{ color: "var(--color-text-secondary)" }}>Check back soon — new briefs post regularly.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredProjects.map((project) => (
                          <button
                            key={project.id}
                            onClick={() => {
                              setSelectedProject(project);
                              setPitchText(project.myApplication?.pitch ?? "");
                              setApplyError(null);
                            }}
                            className="w-full text-left p-4 rounded-[var(--radius-lg)] hover:opacity-90 transition-opacity"
                            style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-card)" }}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div>
                                <div className="text-base font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>{project.projectName}</div>
                                <div className="text-xs font-body flex items-center gap-1.5 mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                                  <span>{project.clientName}</span>
                                  <span>·</span>
                                  <span>{project.projectType}</span>
                                  <span>·</span>
                                  <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    {project.clientRating ?? 4.8}
                                  </span>
                                </div>
                              </div>
                              <div className="font-display text-lg tnum shrink-0" style={{ color: "var(--color-accent)" }}>{project.budget}</div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {project.myApplication ? (
                                <Badge tone={project.myApplication.status === "SELECTED" ? "success" : project.myApplication.status === "REJECTED" ? "error" : "accent"} size="sm">
                                  {APPLICATION_STATUS_LABEL[project.myApplication.status]}
                                </Badge>
                              ) : !project.applicationsOpen ? (
                                <Badge tone="neutral" size="sm">Applications closed</Badge>
                              ) : (
                                <Badge tone="success" size="sm">Open</Badge>
                              )}
                              <Badge tone={isProjectOnline(project) ? "neutral" : "accent"} size="sm">
                                {isProjectOnline(project) ? "Online" : "Onsite"}
                              </Badge>
                              <span className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>
                                {project.applicantCount}{project.applicantCap ? `/${project.applicantCap}` : ""} applicants
                              </span>
                              <span className="text-xs text-[var(--color-text-tertiary)]">·</span>
                              <span className="text-xs font-body flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
                                <MapPin className="w-3 h-3 opacity-60" /> {project.location || "Lagos, NG (Hybrid/Remote)"}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    {effectiveApplications.length === 0 ? (
                      <div className="text-center py-16 px-6 rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] shadow-[var(--shadow-card)] flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center mb-4 text-[var(--color-accent)]">
                          <Briefcase className="w-8 h-8" />
                        </div>
                        <h3 className="font-display text-xl font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>No Applications Submitted Yet</h3>
                        <p className="text-sm font-body text-[var(--color-text-secondary)] max-w-md mb-6">
                          You haven't submitted pitches to any active project briefs. Browse open roles in commercial, film, and voiceover to submit your profile.
                        </p>
                        <Button onClick={() => setProjectsSubTab("browse")} className="gap-2">
                          <Search className="w-4 h-4" /> Browse Open Projects
                        </Button>
                      </div>
                    ) : (
                      effectiveApplications.map((application) => (
                        <div
                          key={application.id}
                          onClick={() => {
                            const base = projects.find((p) => p.id === application.brief.id);
                            const found = (base
                              ? { ...base, myApplication: application }
                              : {
                                  id: application.brief.id,
                                  projectName: application.brief.projectName,
                                  clientName: application.brief.clientName,
                                  projectType: application.brief.projectType || "Voice-Over",
                                  budget: application.brief.budget,
                                  applicantCount: 1,
                                  applicantCap: 10,
                                  applicationsOpen: true,
                                  nicheReq: ["VOICE_OVER"],
                                  location: "Lagos, NG (Hybrid/Remote)",
                                  clientRating: 4.9,
                                  clientReviews: 14,
                                  description: "Client is seeking professional performers for a high-profile production campaign. Selected performer will work directly with the creative direction team for studio recording and revisions.",
                                  timeline: "Production schedule agreed upon booking confirmation.",
                                  deliverables: ["Raw audio/video master files", "Revisions included", "Commercial digital rights"],
                                  scriptSample: "Audition sides and project copy will be provided directly in the Order Room.",
                                  additionalNotes: "Review project details and submitted pitch below.",
                                  escrowProtected: true,
                                  myApplication: application,
                                }) as any;
                            setSelectedProject(found);
                            setPitchText(application.pitch ?? "");
                            setApplyError(null);
                          }}
                          className="p-4 rounded-[var(--radius-lg)] cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-card)" }}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <div className="text-base font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>{application.brief.projectName}</div>
                              <div className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>{application.brief.clientName} · {application.brief.budget}</div>
                            </div>
                            <Badge tone={application.status === "SELECTED" ? "success" : application.status === "REJECTED" || application.status === "WITHDRAWN" ? "error" : "accent"} size="sm">
                              {APPLICATION_STATUS_LABEL[application.status]}
                            </Badge>
                          </div>
                          {application.pitch && (
                            <p className="text-xs font-body mb-3 italic" style={{ color: "var(--color-text-secondary)" }}>"{application.pitch}"</p>
                          )}
                          <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: "var(--color-hairline)" }}>
                            <span className="text-[11px] font-body" style={{ color: "var(--color-text-tertiary)" }}>Tap to view project details &amp; pitch</span>
                            {(application.status === "APPLIED" || application.status === "SHORTLISTED") && (
                              <Button
                                variant="secondary"
                                className="h-7 px-2.5 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleWithdrawApplication(application.id);
                                }}
                              >
                                Withdraw
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

              </motion.div>
              )
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
                      <div className="text-center py-16 px-6 rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] shadow-[var(--shadow-card)] flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center mb-4 text-[var(--color-accent)]">
                          <MessageSquare className="w-8 h-8" />
                        </div>
                        <h3 className="font-display text-xl font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>No Active Orders</h3>
                        <p className="text-sm font-body text-[var(--color-text-secondary)] max-w-md mb-6 leading-relaxed">
                          You don't have any bookings in progress right now. Share your profile link or pitch to open projects to land client orders.
                        </p>
                        <div className="flex gap-3">
                          <Button onClick={() => { setActiveTab("projects"); setProjectsSubTab("browse"); }} className="gap-2">
                            <Briefcase className="w-4 h-4" /> Apply to Projects
                          </Button>
                          <Button variant="secondary" onClick={() => setShowShare(true)} className="gap-2">
                            <Share2 className="w-4 h-4" /> Share Profile Link
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
                              placeholder="Search orders or clients..."
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
                              .toUpperCase() || "CL";

                            const statusSummary = isCancelled
                              ? "Order cancelled & refunded to client"
                              : order.phase === "Review"
                              ? "Deliverables submitted · Under review"
                              : "Milestone in progress";

                            return (
                              <div
                                key={order.id}
                                onClick={() => navigate(`/order/${order.id}`)}
                                className="flex items-start sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-[var(--color-bg-elevated)]/60 cursor-pointer transition-colors group relative"
                              >
                                {/* Avatar with active presence dot */}
                                <div className="relative shrink-0 mt-0.5 sm:mt-0">
                                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20">
                                    {initials}
                                  </div>
                                  {!isCancelled && (
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900 absolute bottom-0.5 right-0.5" />
                                  )}
                                </div>

                                {/* Responsive Content Block: Full-width title row + structured metadata row */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <h3 className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors truncate">
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

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                          isCancelled
                                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                            : order.phase === "Review"
                                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                                        }`}
                                      >
                                        {order.phase}
                                      </span>
                                      <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 transition-all shrink-0" />
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-2 text-xs sm:text-[13px] text-[var(--color-text-secondary)]">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                      <span className="font-medium text-[var(--color-text-primary)] truncate">{order.counterpart}</span>
                                      <span className="sm:hidden inline-flex text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.25 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 shrink-0">
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

                                  <div className="sm:hidden text-[11px] text-[var(--color-text-tertiary)] mt-0.5 truncate">
                                    {statusSummary}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-4">
                      {filteredOrders.map((order) => {
                        const isCancelled = appStateSync.isBookingCancelled(order.id);
                        const num = Number(order.amount.replace(/[^0-9]/g, "")) || 0;
                        const symbol = order.amount.startsWith("$") ? "$" : order.amount.startsWith("£") ? "£" : order.amount.startsWith("€") ? "€" : "₦";
                        const net = Math.round(num * 0.93);
                        const pLower = order.project.toLowerCase();
                        const isGigOnsite = pLower.includes("compere") || pLower.includes("audition") || pLower.includes("onsite");

                        return (
                          <div
                            key={order.id}
                            className="p-5 sm:p-6 rounded-2xl cursor-pointer hover:border-[var(--color-accent)] transition-all bg-[var(--color-bg-surface)] border shadow-xs group"
                            style={{ borderColor: "var(--color-border-default)", boxShadow: "var(--shadow-card)" }}
                            onClick={() => navigate(`/order/${order.id}`)}
                          >
                            {/* Card Header */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--color-bg-elevated)] border border-[var(--color-hairline)] text-[var(--color-text-tertiary)]">
                                    {order.id}
                                  </span>
                                  <span className="inline-flex text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                    {isGigOnsite ? "Onsite" : "Online"}
                                  </span>
                                  {isCancelled ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                      Cancelled &amp; Refunded
                                    </span>
                                  ) : (
                                    <span className="text-xs font-body text-[var(--color-text-tertiary)]">
                                      Due {order.due}
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-base sm:text-lg font-bold font-body group-hover:text-[var(--color-accent)] transition-colors text-[var(--color-text-primary)]">
                                  {order.project}
                                </h3>
                                <p className="text-xs font-body text-[var(--color-text-secondary)] mt-0.5">
                                  Client: <span className="font-semibold text-[var(--color-text-primary)]">{order.counterpart}</span>
                                </p>
                              </div>

                              <div className="text-left sm:text-right shrink-0">
                                <div className="text-[10px] uppercase font-semibold tracking-wider text-[var(--color-text-tertiary)] font-body">
                                  {isCancelled ? "Refund Processed" : "Net Take-Home"}
                                </div>
                                <div className={`font-mono font-black text-xl leading-tight ${isCancelled ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                  {symbol}{isCancelled ? num.toLocaleString() : net.toLocaleString()}
                                </div>
                              </div>
                            </div>

                            {/* Phase Progress Bar (Segmented) */}
                            <div className="my-4 p-3.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-hairline)]">
                              <div className="grid grid-cols-3 gap-2">
                                {["Deliverables", "Review", "Complete"].map((phase, i) => {
                                  const phases = ["Deliverables", "Review", "Complete"];
                                  const current = phases.indexOf(order.phase === "Briefing" ? "Deliverables" : order.phase);
                                  const isDone = i < current;
                                  const isActive = i === current;
                                  return (
                                    <div key={phase} className="flex flex-col gap-1">
                                      <div
                                        className={`h-2 rounded-full transition-all ${
                                          isDone
                                            ? "bg-emerald-500"
                                            : isActive
                                            ? "bg-[var(--color-accent)]"
                                            : "bg-zinc-200 dark:bg-zinc-700"
                                        }`}
                                      />
                                      <span className={`text-[10px] font-body truncate ${
                                        isDone ? "text-emerald-600 dark:text-emerald-400 font-semibold" : isActive ? "text-[var(--color-accent)] font-bold" : "text-[var(--color-text-tertiary)]"
                                      }`}>
                                        {phase} {isDone ? "✓" : ""}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Check-in Progress Strip */}
                            {!isCancelled && (
                              <div className="mb-4 p-3 rounded-xl border flex items-center justify-between text-xs font-body" style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-hairline)" }}>
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                                    <Calendar className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0 truncate">
                                    <div className="font-semibold text-[var(--color-text-primary)] truncate">Availability Milestone Gate 2 of 3</div>
                                    <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">7-day re-confirmation due Tue 14 Oct</div>
                                  </div>
                                </div>
                                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20 shrink-0 ml-2">
                                  Due Now
                                </span>
                              </div>
                            )}

                            <Button className="w-full h-10 text-xs font-bold gap-2 shadow-xs">
                              <span>Enter Order Room</span>
                              <ChevronRight className="w-4 h-4" />
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

            {/* ── Activity History Tab ── */}
            {activeTab === "activity" && (
              <motion.div key="activity" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-display text-2xl" style={{ color: "var(--color-text-primary)" }}>Activity History</h2>
                    <p className="text-sm font-body" style={{ color: "var(--color-text-secondary)" }}>
                      View all recent transactions, bookings, and messaging updates.
                    </p>
                  </div>
                  <Button variant="secondary" className="h-9 px-3 text-xs" onClick={() => setActiveTab("home")}>
                    ← Back to Home
                  </Button>
                </div>

                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row items-center gap-3 mb-5">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--color-text-tertiary)" }} />
                    <Input
                      placeholder="Search activity..."
                      value={activitySearch}
                      onChange={(e) => setActivitySearch(e.target.value)}
                      className="!h-10 text-xs sm:text-sm pl-10 rounded-xl !bg-[var(--color-bg-surface)] border-[var(--color-border-default)] focus:!border-[var(--color-accent)]"
                    />
                  </div>
                  <div className="flex p-1 rounded-xl w-full sm:w-auto" style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
                    {(["all", "booking", "payment", "message"] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setActivityFilter(filter)}
                        className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold font-body capitalize transition-all"
                        style={{
                          background: activityFilter === filter ? "var(--color-accent)" : "transparent",
                          color: activityFilter === filter ? "var(--color-accent-on)" : "var(--color-text-secondary)",
                        }}
                      >
                        {filter}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Activity List */}
                <div className="space-y-3">
                  {effectiveActivity.filter(item => {
                    const matchesSearch = !activitySearch || item.client.toLowerCase().includes(activitySearch.toLowerCase()) || item.service.toLowerCase().includes(activitySearch.toLowerCase());
                    const matchesFilter = activityFilter === "all" || item.type === activityFilter;
                    return matchesSearch && matchesFilter;
                  }).length === 0 ? (
                    <div className="text-center py-12 px-6 rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] shadow-[var(--shadow-card)] flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center mb-3 text-[var(--color-accent)]">
                        <Bell className="w-7 h-7" />
                      </div>
                      <h3 className="font-display text-lg font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>No Activity Records Found</h3>
                      <p className="text-xs font-body text-[var(--color-text-secondary)] max-w-md mb-4">
                        Activity logs will populate as you send messages, submit project pitches, and complete client bookings.
                      </p>
                      <Button onClick={() => setActiveTab("projects")} className="text-xs gap-1.5">
                        <Briefcase className="w-3.5 h-3.5" /> Explore Projects
                      </Button>
                    </div>
                  ) : (
                    effectiveActivity
                      .filter(item => {
                        const matchesSearch = !activitySearch || item.client.toLowerCase().includes(activitySearch.toLowerCase()) || item.service.toLowerCase().includes(activitySearch.toLowerCase());
                        const matchesFilter = activityFilter === "all" || item.type === activityFilter;
                        return matchesSearch && matchesFilter;
                      })
                      .map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                          onClick={() => {
                            if (item.type === "booking") navigate("/order/ORD-001");
                            else if (item.type === "payment") setActiveTab("earnings");
                            else if (item.type === "message") setActiveTab("orders");
                          }}
                          className="flex items-center gap-4 p-4 rounded-[var(--radius-lg)] cursor-pointer hover:border-[var(--color-accent)] transition-all active:scale-[0.99]"
                          style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-card)" }}
                        >
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: item.type === "payment" ? "var(--color-success-bg)" : "var(--color-accent-glow)" }}
                          >
                            {item.type === "booking" && <Calendar className="w-5 h-5" style={{ color: "var(--color-accent)" }} />}
                            {item.type === "payment" && <DollarSign className="w-5 h-5" style={{ color: "var(--color-success)" }} />}
                            {item.type === "message" && <MessageSquare className="w-5 h-5" style={{ color: "var(--color-accent)" }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>{item.client}</div>
                            <div className="text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>{item.service}</div>
                            <div className="text-[11px] font-body mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>Click to view details →</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-semibold font-mono tnum" style={{ color: "var(--color-text-primary)" }}>{item.amount}</div>
                            <div className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>{item.time}</div>
                          </div>
                        </motion.div>
                      ))
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Earnings Tab ── */}
            {activeTab === "earnings" && (
              <motion.div key="earnings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <h2 className="font-display text-2xl mb-6 lg:hidden" style={{ color: "var(--color-text-primary)" }}>Earnings</h2>

                {/* Available Balance */}
                <div className="mb-6 p-6 rounded-[var(--radius-lg)] flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)", boxShadow: "var(--shadow-card)" }}>
                  <div>
                    <div className="text-xs font-body tracking-normal mb-2" style={{ color: "var(--color-text-tertiary)" }}>Available for withdrawal</div>
                    <div className="font-display text-4xl tnum" style={{ color: "var(--color-text-primary)" }}>₦{isNewUser ? "0" : appStateSync.getBalance().available.toLocaleString()}</div>
                  </div>
                  <Button className="h-11 px-6 whitespace-nowrap" onClick={() => setShowWithdraw(true)}>Withdraw Funds</Button>
                </div>
                
                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {[
                    { label: "This Month", value: isNewUser ? "₦0" : `₦${appStateSync.getBalance().available.toLocaleString()}`, sub: "Current month" },
                    { label: "Last Month", value: isNewUser ? "₦0" : "₦125,000", sub: "Previous month" },
                    { label: "All Time", value: isNewUser ? "₦0" : `₦${(1240000 + appStateSync.getBalance().withdrawnTotal).toLocaleString()}`, sub: "Since joining" },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="p-5 rounded-[var(--radius-lg)]"
                      style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
                    >
                      <div className="text-xs font-body mb-1" style={{ color: "var(--color-text-tertiary)" }}>{stat.label}</div>
                      <div className="font-display text-2xl tnum mb-0.5" style={{ color: "var(--color-text-primary)" }}>{stat.value}</div>
                      <div className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>{stat.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Monthly bar chart (simplified visual) */}
                <div
                  className="p-5 rounded-[var(--radius-lg)] mb-6"
                  style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
                >
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>Monthly Earnings</span>
                    <span className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>Last 6 months</span>
                  </div>
                  <div className="flex items-end gap-2 h-32">
                    {[
                      { month: "Jul", val: isNewUser ? 0 : 0.55 },
                      { month: "Aug", val: isNewUser ? 0 : 0.7 },
                      { month: "Sep", val: isNewUser ? 0 : 0.45 },
                      { month: "Oct", val: isNewUser ? 0 : 0.8 },
                      { month: "Nov", val: isNewUser ? 0 : 0.65 },
                      { month: "Dec", val: isNewUser ? 0 : Math.min(1, Math.max(0.6, payouts.length / 5)) },
                    ].map((bar, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t-lg transition-all"
                          style={{
                            height: `${bar.val * 100}%`,
                            background: bar.month === "Dec" ? "var(--color-accent)" : "var(--color-accent-glow)",
                            border: `1px solid ${bar.month === "Dec" ? "var(--color-accent)" : "var(--color-border-default)"}`,
                          }}
                        />
                        <span className="text-[10px] font-mono" style={{ color: "var(--color-text-tertiary)" }}>{bar.month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent payouts */}
                <div
                  className="rounded-[var(--radius-lg)] overflow-hidden"
                  style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
                >
                  <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--color-border-default)" }}>
                    <span className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>Recent Payouts</span>
                    <span className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>Click any row for receipt</span>
                  </div>
                  {effectivePayouts.length === 0 ? (
                    <div className="py-10 px-4 text-center">
                      <BarChart2 className="w-10 h-10 mx-auto mb-2 text-[var(--color-text-tertiary)] opacity-60" />
                      <p className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>No payouts recorded yet</p>
                      <p className="text-xs font-body text-[var(--color-text-secondary)] mt-1 mb-3">Completed order earnings will be transferred directly to your bank account.</p>
                      <Button variant="secondary" onClick={() => navigate("/settings")} className="h-8 px-3 text-xs">
                        Configure Bank Account
                      </Button>
                    </div>
                  ) : (
                    effectivePayouts.map((payout, i, arr) => (
                      <div
                        key={payout.id}
                        onClick={() => setSelectedPayout(payout)}
                        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[var(--color-bg-elevated)] transition-colors"
                        style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--color-border-default)" : undefined }}
                      >
                        <div>
                          <div className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>{payout.from}</div>
                          <div className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>{payout.date} · {payout.ref}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            ₦{(payout.numericAmount - Math.round(payout.numericAmount * 0.07)).toLocaleString()}
                          </div>
                          <div
                            className="text-[11px] font-body font-medium mt-0.5"
                            style={{ color: payout.status === "Paid" ? "var(--color-success)" : "var(--color-gold)" }}
                          >
                            {payout.status}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Analytics Tab ── */}
            {activeTab === "analytics" && (
              <motion.div key="analytics" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="lg:hidden">
                    <h2 className="font-display text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>Performer Performance &amp; Analytics</h2>
                    <p className="text-xs font-body mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                      Track profile impressions, booking conversion, and earnings velocity for {talentProfile.name}.
                    </p>
                  </div>

                  {/* Period Selector (Matches ClientDashboard UX) */}
                  <div className="flex items-center gap-2 self-start sm:self-auto sm:ml-auto">
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-lg)] border text-xs font-body shadow-xs"
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
                        value={chartTimeframe}
                        onChange={(e) => {
                          setChartTimeframe(e.target.value as "6m" | "3m" | "1y");
                          setHoveredChartIndex(null);
                        }}
                        className="bg-transparent font-semibold cursor-pointer outline-none text-xs"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        <option value="3m">Last 3 months</option>
                        <option value="6m">Last 6 months</option>
                        <option value="1y">Past year</option>
                      </select>
                    </div>
                  </div>
                </div>

                {isNewUser ? (
                  <div className="text-center py-16 px-6 rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] shadow-[var(--shadow-card)] flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center mb-4 text-[var(--color-accent)]">
                      <TrendingUp className="w-8 h-8" />
                    </div>
                    <h3 className="font-display text-xl font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>Analytics Will Unlock Soon</h3>
                    <p className="text-sm font-body text-[var(--color-text-secondary)] max-w-md mb-6 leading-relaxed">
                      Profile views, conversion metrics, and monthly booking trends will automatically track as clients view your profile and send booking requests.
                    </p>
                    <Button variant="secondary" onClick={() => setShowShare(true)} className="gap-2">
                      <Share2 className="w-4 h-4" /> Share Profile to Drive Views
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Metric Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Card 1: Profile views */}
                      <div className="p-4 sm:p-5 rounded-[var(--radius-xl)] transition-all hover:shadow-md" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-card)" }}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-body font-medium tracking-normal" style={{ color: "var(--color-text-tertiary)" }}>Profile views</div>
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            <Eye className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <div className="font-display text-2xl font-bold tnum" style={{ color: "var(--color-text-primary)" }}>1,420</div>
                        <div className="text-xs font-body mt-1 font-medium" style={{ color: "var(--color-success)" }}>↑ +18% this month</div>
                      </div>

                      {/* Card 2: Projects completed */}
                      <div className="p-4 sm:p-5 rounded-[var(--radius-xl)] transition-all hover:shadow-md" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-card)" }}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-body font-medium tracking-normal" style={{ color: "var(--color-text-tertiary)" }}>Projects completed</div>
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <div className="font-display text-2xl font-bold tnum" style={{ color: "var(--color-text-primary)" }}>28</div>
                        <div className="text-xs font-body mt-1 flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>100% on-time delivery</span>
                        </div>
                      </div>

                      {/* Card 3: Average rating (Clickable to open Reviews Modal) */}
                      <div
                        onClick={() => setShowReviewsModal(true)}
                        role="button"
                        tabIndex={0}
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
                          <span>4.9</span>
                          <span className="text-amber-500 text-xl">★</span>
                        </div>
                        <div className="text-xs font-body mt-1 transition-colors group-hover:text-[var(--color-accent)]" style={{ color: "var(--color-text-secondary)" }}>
                          Based on {allClientReviews.length} client reviews
                        </div>
                      </div>

                      {/* Card 4: Total earnings */}
                      <div className="p-4 sm:p-5 rounded-[var(--radius-xl)] transition-all hover:shadow-md" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-card)" }}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-body font-medium tracking-normal" style={{ color: "var(--color-text-tertiary)" }}>Total earnings</div>
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                            <DollarSign className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <div className="font-display text-2xl font-bold tnum" style={{ color: "var(--color-text-primary)" }}>₦1,240,000</div>
                        <div className="text-xs font-body mt-1 font-semibold" style={{ color: "var(--color-success)" }}>↑ +₦240,000 this month</div>
                      </div>
                    </div>

                    {/* Single Full-Width Category Earnings Spline Area Graph */}
                    {(() => {
                      const activeChartData = CATEGORY_CHART_TIMEFRAMES[chartTimeframe];
                      const n = activeChartData.labels.length;
                      const paddingLeft = 68;
                      const paddingRight = 30;
                      const paddingTop = 25;
                      const paddingBottom = 40;
                      const plotWidth = 760 - paddingLeft - paddingRight;
                      const plotHeight = 250 - paddingTop - paddingBottom;
                      const baselineY = paddingTop + plotHeight;

                      const gig1Points = activeChartData.gig1.map((val, i) => ({
                        x: paddingLeft + (i / (n - 1)) * plotWidth,
                        y: baselineY - (val / activeChartData.maxVal) * plotHeight,
                      }));

                      const gig2Points = activeChartData.gig2.map((val, i) => ({
                        x: paddingLeft + (i / (n - 1)) * plotWidth,
                        y: baselineY - (val / activeChartData.maxVal) * plotHeight,
                      }));

                      const spline1 = getSplinePath(gig1Points);
                      const area1 = getAreaPath(gig1Points, baselineY);
                      const spline2 = getSplinePath(gig2Points);
                      const area2 = getAreaPath(gig2Points, baselineY);

                      const gig1Title = effectiveServices[0]?.title || "Feature Film Audition";
                      const gig2Title = effectiveServices[1]?.title || "Commercial Voice-Over";

                      return (
                        <div
                          className="p-5 sm:p-6 md:p-7 rounded-[var(--radius-xl)] relative"
                          style={{
                            background: "var(--color-bg-surface)",
                            border: "1px solid var(--color-border-default)",
                            boxShadow: "var(--shadow-card)",
                          }}
                        >
                          {/* Header with Title and Legends matching Client Hierarchy */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                            <div>
                              <h3 className="font-display text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
                                Earnings by Category
                              </h3>
                              <p className="text-xs font-body mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                                Overview of monthly revenue trajectory for your 2 active rate cards
                              </p>
                            </div>

                            {/* Legends in a clean, accessible row */}
                            <div className="flex flex-wrap items-center gap-3 sm:gap-5">
                              <div className="flex items-center gap-2 text-xs font-body">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#E50914] shrink-0" />
                                <span className="font-medium" style={{ color: "var(--color-text-secondary)" }}>{gig1Title}</span>
                                <span
                                  className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold"
                                  style={{
                                    background: "rgba(229, 9, 20, 0.1)",
                                    color: "#E50914",
                                  }}
                                >
                                  68%
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs font-body">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] shrink-0" />
                                <span className="font-medium" style={{ color: "var(--color-text-secondary)" }}>{gig2Title}</span>
                                <span
                                  className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold"
                                  style={{
                                    background: "rgba(124, 58, 237, 0.1)",
                                    color: "#7C3AED",
                                  }}
                                >
                                  32%
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Interactive Hover Tooltip Float */}
                          {hoveredChartIndex !== null && hoveredChartIndex < n && (
                            <div
                              className="absolute top-14 right-6 md:right-8 border shadow-xl rounded-xl p-3 text-xs pointer-events-none transition-all z-20 min-w-[210px]"
                              style={{
                                background: "var(--color-bg-surface)",
                                borderColor: "var(--color-border-default)",
                                color: "var(--color-text-primary)",
                                boxShadow: "var(--shadow-card)",
                              }}
                            >
                              <div className="font-semibold mb-1.5 pb-1 flex justify-between border-b" style={{ borderColor: "var(--color-hairline)", color: "var(--color-text-primary)" }}>
                                <span>{activeChartData.labels[hoveredChartIndex]}</span>
                                <span className="text-[10px] font-mono" style={{ color: "var(--color-text-tertiary)" }}>Performance</span>
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                                    <span className="w-2 h-2 rounded-full bg-[#E50914] shrink-0" />
                                    <span className="truncate max-w-[120px]">{gig1Title}</span>
                                  </span>
                                  <span className="font-mono font-semibold" style={{ color: "var(--color-text-primary)" }}>
                                    ₦{activeChartData.gig1[hoveredChartIndex].toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span className="flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                                    <span className="w-2 h-2 rounded-full bg-[#7C3AED] shrink-0" />
                                    <span className="truncate max-w-[120px]">{gig2Title}</span>
                                  </span>
                                  <span className="font-mono font-semibold" style={{ color: "var(--color-text-primary)" }}>
                                    ₦{activeChartData.gig2[hoveredChartIndex].toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-3 pt-1.5 border-t font-bold" style={{ borderColor: "var(--color-hairline)" }}>
                                  <span style={{ color: "var(--color-text-primary)" }}>Total:</span>
                                  <span className="font-mono font-bold" style={{ color: "var(--color-text-primary)" }}>
                                    ₦{(activeChartData.gig1[hoveredChartIndex] + activeChartData.gig2[hoveredChartIndex]).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Chart SVG Canvas */}
                          <div className="w-full overflow-x-auto">
                            <div className="min-w-[560px]">
                              <svg
                                viewBox="0 0 760 250"
                                className="w-full h-auto overflow-visible select-none"
                                onMouseMove={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const clientX = e.clientX - rect.left;
                                  const scaleX = rect.width / 760;
                                  const svgX = clientX / scaleX;
                                  const relX = svgX - paddingLeft;
                                  const clampedRatio = Math.max(0, Math.min(1, relX / plotWidth));
                                  const idx = Math.round(clampedRatio * (n - 1));
                                  setHoveredChartIndex(idx);
                                }}
                                onMouseLeave={() => setHoveredChartIndex(null)}
                              >
                                <defs>
                                  <linearGradient id="splineGig1Gradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#E50914" stopOpacity="0.22" />
                                    <stop offset="100%" stopColor="#E50914" stopOpacity="0.01" />
                                  </linearGradient>
                                  <linearGradient id="splineGig2Gradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.18" />
                                    <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.01" />
                                  </linearGradient>
                                </defs>

                                {/* Y-Axis Label Rotated */}
                                <text
                                  transform="rotate(-90)"
                                  x={-((paddingTop + baselineY) / 2)}
                                  y="18"
                                  textAnchor="middle"
                                  className="text-[11px] font-body font-medium"
                                  style={{ fill: "var(--color-text-tertiary)" }}
                                >
                                  Earnings (₦)
                                </text>

                                {/* Horizontal Dashed Grid Lines & Y Ticks */}
                                {activeChartData.ticks.map((tick) => {
                                  const tickY = baselineY - (tick.val / activeChartData.maxVal) * plotHeight;
                                  const tickLabel = tick.label.startsWith("₦") ? tick.label : `₦${tick.label}`;
                                  return (
                                    <g key={tick.label}>
                                      <line
                                        x1={paddingLeft}
                                        y1={tickY}
                                        x2={paddingLeft + plotWidth}
                                        y2={tickY}
                                        stroke="var(--color-hairline)"
                                        strokeDasharray="4 4"
                                        strokeWidth="1"
                                      />
                                      <text
                                        x={paddingLeft - 10}
                                        y={tickY + 4}
                                        textAnchor="end"
                                        className="text-[11px] font-mono font-medium"
                                        style={{ fill: "var(--color-text-tertiary)" }}
                                      >
                                        {tickLabel}
                                      </text>
                                    </g>
                                  );
                                })}

                                {/* Area Fills */}
                                <path d={area1} fill="url(#splineGig1Gradient)" />
                                <path d={area2} fill="url(#splineGig2Gradient)" />

                                {/* Spline Lines */}
                                <path
                                  d={spline1}
                                  fill="none"
                                  stroke="#E50914"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d={spline2}
                                  fill="none"
                                  stroke="#7C3AED"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />

                                {/* Data Points Circles (permanent like Client version, expand on hover) */}
                                {gig1Points.map((pt, i) => (
                                  <circle
                                    key={`gig1-pt-${i}`}
                                    cx={pt.x}
                                    cy={pt.y}
                                    r={hoveredChartIndex === i ? 6 : 3.5}
                                    fill="#E50914"
                                    stroke="var(--color-bg-surface)"
                                    strokeWidth="2"
                                    className="transition-all duration-150 pointer-events-none"
                                  />
                                ))}
                                {gig2Points.map((pt, i) => (
                                  <circle
                                    key={`gig2-pt-${i}`}
                                    cx={pt.x}
                                    cy={pt.y}
                                    r={hoveredChartIndex === i ? 6 : 3.5}
                                    fill="#7C3AED"
                                    stroke="var(--color-bg-surface)"
                                    strokeWidth="2"
                                    className="transition-all duration-150 pointer-events-none"
                                  />
                                ))}

                                {/* Hover Indicator Vertical Line */}
                                {hoveredChartIndex !== null && hoveredChartIndex < n && (
                                  <g>
                                    <line
                                      x1={gig1Points[hoveredChartIndex].x}
                                      y1={paddingTop}
                                      x2={gig1Points[hoveredChartIndex].x}
                                      y2={baselineY}
                                      stroke="var(--color-text-tertiary)"
                                      strokeDasharray="3 3"
                                      strokeWidth="1.5"
                                    />
                                  </g>
                                )}

                                {/* X-Axis Tick Labels */}
                                {activeChartData.labels.map((label, i) => {
                                  const x = paddingLeft + (i / (n - 1)) * plotWidth;
                                  return (
                                    <text
                                      key={label}
                                      x={x}
                                      y={baselineY + 22}
                                      textAnchor="middle"
                                      className="text-[12px] font-body font-medium"
                                      style={{ fill: "var(--color-text-secondary)" }}
                                    >
                                      {label}
                                    </text>
                                  );
                                })}
                              </svg>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </motion.div>
            )}

            </AnimatePresence>
          {/* Withdraw Funds Sheet & Payout-Account Change Request */}
          <AnimatePresence>
            {showWithdraw && (
              <Modal onClose={() => {
                setShowWithdraw(false);
                setWithdrawalSuccess(null);
                setShowChangeAccountForm(false);
                setWithdrawPasscodeError(null);
              }}>
                <motion.div
                  initial={{ y: 20, scale: 0.95 }}
                  animate={{ y: 0, scale: 1 }}
                  exit={{ y: 20, scale: 0.95 }}
                  className="w-full max-w-md rounded-3xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto"
                  style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-elevated)" }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-display text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                      {withdrawalSuccess ? "Withdrawal Confirmed" : withdrawStep === "passcode" ? "Input PIN" : "Withdraw Funds"}
                    </h3>
                    <button
                      onClick={() => {
                        setShowWithdraw(false);
                        setWithdrawalSuccess(null);
                        setShowChangeAccountForm(false);
                        setWithdrawPasscodeError(null);
                        setWithdrawStep("amount");
                        setWithdrawPasscode("");
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--color-bg-elevated)]"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {withdrawalSuccess ? (
                    /* Success State: Withdrawal requested */
                    <div className="py-4 text-center space-y-4">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
                          Withdrawal requested
                        </h4>
                        <p className="text-xs font-body text-[var(--color-text-secondary)] mt-1">
                          Your funds are on the way to your verified bank account via Paystack.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-hairline)] text-left space-y-2 text-xs font-body">
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--color-text-tertiary)]">Amount</span>
                          <span className="font-mono font-bold text-base text-[var(--color-text-primary)]">
                            ₦{withdrawalSuccess.amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--color-text-tertiary)]">Destination</span>
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {withdrawalSuccess.account}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--color-text-tertiary)]">Status</span>
                          <Badge tone="success" size="sm">Processing</Badge>
                        </div>
                      </div>

                      <Button
                        className="w-full h-11 text-xs font-semibold rounded-xl"
                        onClick={() => {
                          setShowWithdraw(false);
                          setWithdrawalSuccess(null);
                          setWithdrawStep("amount");
                          setWithdrawPasscode("");
                        }}
                      >
                        Done
                      </Button>
                    </div>
                  ) : withdrawStep === "amount" ? (
                    <div className="space-y-5">
                      {withdrawPasscodeError && (
                        <div className="p-3 rounded-xl text-xs font-body" style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}>
                          {withdrawPasscodeError}
                        </div>
                      )}

                      {/* Amount Field (Defaults to full available balance) */}
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider font-body" style={{ color: "var(--color-text-secondary)" }}>
                          AMOUNT (₦)
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g. 100,000"
                          value={withdrawAmount}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, "");
                            setWithdrawAmount(raw ? Number(raw).toLocaleString() : "");
                            setWithdrawPasscodeError(null);
                          }}
                          className="h-12 rounded-xl text-base font-mono font-semibold"
                        />
                        <div className="flex items-center justify-between text-xs mt-2 font-body" style={{ color: "var(--color-text-secondary)" }}>
                          <span>Available for withdrawal: <strong className="text-[var(--color-text-primary)] font-mono">₦{appStateSync.getBalance().available.toLocaleString()}</strong></span>
                        </div>

                        {/* Quick-fill Example Figure Buttons + Max */}
                        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                          {[25000, 50000, 100000, 200000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setWithdrawAmount(preset.toLocaleString());
                                setWithdrawPasscodeError(null);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                              style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-border-default)", color: "var(--color-text-secondary)" }}
                            >
                              ₦{preset.toLocaleString()}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setWithdrawAmount(appStateSync.getBalance().available.toLocaleString());
                              setWithdrawPasscodeError(null);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-colors bg-[var(--color-accent-soft)] border-[var(--color-accent)] text-[var(--color-accent)] cursor-pointer"
                          >
                            Max
                          </button>
                        </div>
                      </div>

                      {/* Saved Payout Account (Auto-Selected Clean Card) */}
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider font-body" style={{ color: "var(--color-text-secondary)" }}>
                          DESTINATION BANK ACCOUNT
                        </label>
                        <div
                          className="p-3.5 rounded-2xl border flex items-center justify-between gap-3"
                          style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                              style={{
                                background: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
                                borderColor: "color-mix(in srgb, var(--color-accent) 25%, transparent)",
                              }}
                            >
                              <Building2 className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm font-body truncate" style={{ color: "var(--color-text-primary)" }}>
                                  {appStateSync.getBankDetails().bankName}
                                </span>
                                <span className="text-xs font-mono text-zinc-500 font-medium">
                                  •••• {appStateSync.getBankDetails().accountNumber.slice(-4)}
                                </span>
                              </div>
                              <div className="text-xs font-body text-[var(--color-text-secondary)] truncate">
                                {appStateSync.getBankDetails().accountName}
                              </div>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Auto-Selected
                          </span>
                        </div>

                        {/* Text link: Change payout account */}
                        <div className="mt-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => setShowChangeAccountForm(!showChangeAccountForm)}
                            className="text-xs font-semibold text-[var(--color-accent)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            {showChangeAccountForm ? "Hide account change form" : "Change payout account"}
                          </button>
                        </div>
                      </div>

                      {/* Payout Account Change Request Form / Status */}
                      {changeRequest && changeRequest.status === "under_review" && (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-100 space-y-2 text-xs font-body">
                          <div className="flex items-center gap-2 font-bold">
                            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>Change Request Under Review</span>
                          </div>
                          <p>
                            Under review. We&apos;ll notify you when it&apos;s approved. While a change is under review, withdrawals keep using the existing verified account ({appStateSync.getBankDetails().bankName} ···· {appStateSync.getBankDetails().accountNumber.slice(-4)}).
                          </p>
                        </div>
                      )}

                      {changeRequest && changeRequest.status === "rejected" && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-100 space-y-2 text-xs font-body">
                          <div className="flex items-center justify-between">
                            <span className="font-bold">Change Request Rejected</span>
                            <Badge tone="error" size="sm">Rejected</Badge>
                          </div>
                          <p>Reason: {changeRequest.rejectionReason || "Account name verification could not be completed."}</p>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              appStateSync.updatePayoutAccountChangeRequestStatus("under_review");
                              setChangeRequest(appStateSync.getPayoutAccountChangeRequest());
                              setShowChangeAccountForm(true);
                            }}
                          >
                            Try again
                          </Button>
                        </div>
                      )}

                      {showChangeAccountForm && (
                        <div className="p-4 rounded-2xl border space-y-3.5 bg-[var(--color-bg-surface)]" style={{ borderColor: "var(--color-border-default)" }}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                              Request Payout Account Change
                            </span>
                            <span className="text-[11px] text-[var(--color-text-tertiary)]">Paystack Verified</span>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[var(--color-text-secondary)] mb-1">
                              Bank Name
                            </label>
                            <select
                              value={changeBankName}
                              onChange={(e) => setChangeBankName(e.target.value)}
                              className="w-full h-10 px-3 rounded-xl border text-xs font-body bg-[var(--color-bg-elevated)] border-[var(--color-border-default)] text-[var(--color-text-primary)] outline-none"
                            >
                              {NIGERIAN_BANKS.map((b) => (
                                <option key={b.code} value={b.name}>
                                  {b.name} {b.isFintech ? "(Fintech)" : ""}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[var(--color-text-secondary)] mb-1">
                              Account Number (10 digits)
                            </label>
                            <Input
                              type="text"
                              maxLength={10}
                              placeholder="0123456789"
                              value={changeAccountNumber}
                              onChange={(e) => setChangeAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                              className="h-10 text-xs font-mono"
                            />
                          </div>

                          {/* Paystack Lookup States */}
                          {changeLookupStatus === "looking_up" && (
                            <div className="p-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-hairline)] flex items-center gap-2.5 animate-pulse text-xs text-[var(--color-text-secondary)]">
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
                              <span>Looking up account name via Paystack…</span>
                            </div>
                          )}

                          {changeLookupStatus === "name_matches" && (
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 space-y-1.5 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold">{changeAccountName}</span>
                                <span className="badge-verified text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                                  Verified
                                </span>
                              </div>
                              <div className="text-[11px] flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <Check className="w-3.5 h-3.5" />
                                <span>Name matches your KYC details</span>
                              </div>
                            </div>
                          )}

                          {changeLookupStatus === "name_mismatch" && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs space-y-1">
                              <span className="font-semibold block">{changeAccountName}</span>
                              <span>This account name doesn&apos;t match your KYC name. Use an account in your own name.</span>
                            </div>
                          )}

                          {changeLookupStatus === "lookup_failed" && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-center justify-between">
                              <span>Account lookup failed.</span>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => {
                                  setChangeLookupStatus("looking_up");
                                  setTimeout(() => setChangeLookupStatus("name_matches"), 500);
                                }}
                              >
                                Retry
                              </Button>
                            </div>
                          )}

                          {/* Optional Phone Number */}
                          <div>
                            <label className="block text-[11px] font-semibold text-[var(--color-text-secondary)] mb-1">
                              Phone Number (Optional)
                            </label>
                            <Input
                              type="tel"
                              placeholder="+234 800 000 0000"
                              value={changePhoneNumber}
                              onChange={(e) => setChangePhoneNumber(e.target.value)}
                              className="h-10 text-xs font-mono"
                            />
                            <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">
                              Optional. If you miss a confirmation, only a Monologg team member will call you.
                            </p>
                          </div>

                          <Button
                            className="w-full h-10 text-xs font-semibold"
                            disabled={changeLookupStatus !== "name_matches"}
                            onClick={() => {
                              const req = appStateSync.submitPayoutAccountChangeRequest({
                                bankName: changeBankName,
                                accountNumber: changeAccountNumber,
                                accountName: changeAccountName,
                                phoneNumber: changePhoneNumber,
                              });
                              setChangeRequest(req);
                              setShowChangeAccountForm(false);
                            }}
                          >
                            Submit Change Request
                          </Button>
                        </div>
                      )}

                      {/* Proceed to Passcode CTA */}
                      <Button
                        className="w-full h-12 text-sm font-semibold rounded-xl"
                        disabled={!withdrawAmount || Number(withdrawAmount.replace(/[^0-9]/g, "")) <= 0}
                        onClick={() => {
                          const amt = Number(withdrawAmount.replace(/[^0-9]/g, ""));
                          const available = appStateSync.getBalance().available;

                          if (!amt || amt <= 0) {
                            setWithdrawPasscodeError("Please enter a valid withdrawal amount.");
                            return;
                          }
                          if (amt > available) {
                            setWithdrawPasscodeError(`Withdrawal amount (₦${amt.toLocaleString()}) exceeds available balance (₦${available.toLocaleString()}).`);
                            return;
                          }

                          setWithdrawPasscodeError(null);
                          setWithdrawPasscode("");
                          setWithdrawStep("passcode");
                        }}
                      >
                        Proceed to Withdraw ₦{withdrawAmount || "0"}
                      </Button>
                    </div>
                  ) : (
                    /* Step 2: Passcode Authentication */
                    <div className="space-y-4">
                      <p className="text-xs font-body leading-relaxed text-center" style={{ color: "var(--color-text-secondary)" }}>
                        Enter your 4-digit PIN to transfer <strong className="text-[var(--color-text-primary)] font-mono">₦{withdrawAmount}</strong> to {appStateSync.getBankDetails().bankName} (•••• {appStateSync.getBankDetails().accountNumber.slice(-4)}).
                      </p>

                      {withdrawPasscodeError && (
                        <div className="p-3 rounded-xl text-xs font-body" style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}>
                          {withdrawPasscodeError}
                        </div>
                      )}

                      <div>
                        <Input
                          type="password"
                          maxLength={4}
                          autoFocus
                          value={withdrawPasscode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                            setWithdrawPasscode(val);
                            setWithdrawPasscodeError(null);
                          }}
                          placeholder="••••"
                          className="h-11 text-center text-base font-mono tracking-[0.5em] rounded-xl font-medium"
                        />
                        <p className="text-xs text-center mt-2 font-body" style={{ color: "var(--color-text-tertiary)" }}>
                          Default passcode is 1234. Change this in Settings &gt; Security &amp; Privacy.
                        </p>
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        <Button
                          variant="secondary"
                          className="flex-1 h-11 text-xs font-semibold rounded-xl"
                          onClick={() => {
                            setWithdrawStep("amount");
                            setWithdrawPasscodeError(null);
                          }}
                        >
                          Back
                        </Button>
                        <Button
                          className="flex-1 h-11 text-xs font-semibold rounded-xl"
                          disabled={withdrawPasscode.length !== 4 || withdrawSubmitting}
                          onClick={() => {
                            const savedPasscode = localStorage.getItem("monologg_withdrawal_passcode") || "1234";
                            if (withdrawPasscode !== savedPasscode) {
                              setWithdrawPasscodeError("Incorrect withdrawal passcode. Please check your 4-digit PIN.");
                              return;
                            }

                            setWithdrawSubmitting(true);
                            setWithdrawPasscodeError(null);
                            const amt = Number(withdrawAmount.replace(/[^0-9]/g, ""));
                            appStateSync.withdrawFunds(amt);
                            const bank = appStateSync.getBankDetails();
                            const formattedAccount = `${bank.bankName} ···· ${bank.accountNumber.slice(-4)}`;

                            const newPayoutItem = {
                              id: `pay-${Date.now()}`,
                              from: "Direct Withdrawal",
                              service: `Payout to ${bank.bankName}`,
                              amount: `₦${amt.toLocaleString()}`,
                              numericAmount: amt,
                              date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                              time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
                              status: "Paid" as const,
                              ref: `PAY-2026-${Math.floor(10000 + Math.random() * 90000)}`,
                              bankAccount: formattedAccount,
                            };
                            setPayouts((prev) => [newPayoutItem, ...prev]);

                            setWithdrawalSuccess({
                              amount: amt,
                              account: formattedAccount,
                            });
                            setWithdrawSubmitting(false);
                            setWithdrawStep("amount");
                            setWithdrawPasscode("");
                          }}
                        >
                          {withdrawSubmitting ? "Processing…" : "Confirm & Withdraw"}
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </Modal>
            )}
          </AnimatePresence>

          {/* Payout Receipt Modal */}
          <AnimatePresence>
            {selectedPayout && (
              <Modal onClose={() => setSelectedPayout(null)}>
                <motion.div
                  initial={{ y: 20, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.95 }}
                  className="w-full max-w-md rounded-[var(--radius-xl)] p-6 relative overflow-hidden bg-white"
                  style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-elevated)" }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Subtle Monologg watermark at 3-5% opacity */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none text-zinc-900 print:opacity-[0.04]">
                    <LogoMark className="w-64 h-64" />
                  </div>

                  <div className="flex items-center justify-between mb-4 border-b pb-3 relative z-10" style={{ borderColor: "var(--color-border-default)" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--color-success-bg)" }}>
                        <CheckCircle2 className="w-5 h-5" style={{ color: "var(--color-success)" }} />
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>Payout Receipt</h3>
                        <p className="text-xs font-mono" style={{ color: "var(--color-text-tertiary)" }}>{selectedPayout.ref}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedPayout(null)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-100 text-zinc-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-center py-4 mb-4 rounded-xl relative z-10" style={{ background: "var(--color-bg-elevated)" }}>
                    <div className="text-xs font-body font-medium" style={{ color: "var(--color-text-tertiary)" }}>Transferred Amount</div>
                    <div className="font-display text-2xl font-bold font-mono" style={{ color: "var(--color-accent)" }}>
                      ₦{(selectedPayout.numericAmount - Math.round(selectedPayout.numericAmount * 0.07)).toLocaleString()}
                    </div>
                    <Badge tone="success" size="sm" className="mt-1">{selectedPayout.status}</Badge>
                  </div>

                  <div className="space-y-3 mb-6 text-xs font-body relative z-10">
                    <div className="flex justify-between py-1.5 border-b" style={{ borderColor: "var(--color-hairline)" }}>
                      <span style={{ color: "var(--color-text-tertiary)" }}>Source / Client</span>
                      <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>{selectedPayout.from}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b" style={{ borderColor: "var(--color-hairline)" }}>
                      <span style={{ color: "var(--color-text-tertiary)" }}>Service Description</span>
                      <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>{selectedPayout.service}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b" style={{ borderColor: "var(--color-hairline)" }}>
                      <span style={{ color: "var(--color-text-tertiary)" }}>Destination Account</span>
                      <span className="font-mono font-medium" style={{ color: "var(--color-text-primary)" }}>{selectedPayout.bankAccount}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b" style={{ borderColor: "var(--color-hairline)" }}>
                      <span style={{ color: "var(--color-text-tertiary)" }}>Date &amp; Time</span>
                      <span style={{ color: "var(--color-text-secondary)" }}>{selectedPayout.date} · {selectedPayout.time}</span>
                    </div>
                    <div className="p-3 rounded-xl border flex items-center justify-between text-xs font-body mt-2" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>Payout Amount Received</span>
                      <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        ₦{(selectedPayout.numericAmount - Math.round(selectedPayout.numericAmount * 0.07)).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 relative z-10">
                    <Button variant="secondary" className="flex-1 text-xs" onClick={() => window.print()}>
                      Save / Print Receipt
                    </Button>
                    <Button className="flex-1 text-xs" onClick={() => setSelectedPayout(null)}>
                      Close
                    </Button>
                  </div>
                </motion.div>
              </Modal>
            )}
          </AnimatePresence>

          {/* Client Reviews & Ratings Modal (Clean, high-hierarchy, colored rating badges, no nested overhead card) */}
          <AnimatePresence>
            {showReviewsModal && (
              <Modal onClose={() => setShowReviewsModal(false)}>
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
                        Authentic feedback from casting directors, producers &amp; studio agencies
                      </p>
                    </div>
                    <button
                      onClick={() => setShowReviewsModal(false)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                      aria-label="Close reviews modal"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Reviews Analytics Overview (3 Statistical Pillars matching Reference Images 3 & 4) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-3.5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                    {/* Pillar 1: Total Reviews */}
                    <div className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between">
                      <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 font-body">
                        Total Reviews
                      </span>
                      <div className="my-1.5 flex items-baseline gap-2">
                        <span className="font-display text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                          {allClientReviews.length}
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
                        Across completed orders
                      </span>
                    </div>

                    {/* Pillar 3: Rating Distribution Bars (5 to 1 Stars) */}
                    <div className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 flex flex-col justify-center space-y-1">
                      {[
                        { stars: 5, count: 5, pct: 62.5, barColor: "bg-teal-500 dark:bg-teal-400" },
                        { stars: 4, count: 3, pct: 37.5, barColor: "bg-amber-500 dark:bg-amber-400" },
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

                  {/* Clean Search & Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-2.5 pt-3 pb-2 shrink-0">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={reviewSearch}
                        onChange={(e) => setReviewSearch(e.target.value)}
                        placeholder="Search reviews, clients, projects..."
                        className="w-full h-9 pl-8 pr-7 text-xs rounded-xl border bg-zinc-50/50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-400"
                      />
                      {reviewSearch && (
                        <button
                          type="button"
                          onClick={() => setReviewSearch("")}
                          className="w-4 h-4 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative">
                        <select
                          value={reviewRatingFilter}
                          onChange={(e) => setReviewRatingFilter(e.target.value as any)}
                          className="appearance-none h-9 px-3 rounded-xl border bg-zinc-50/50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer text-xs font-medium"
                        >
                          <option value="all">All Ratings</option>
                          <option value="5">★ 5.0 (5 reviews)</option>
                          <option value="4.9">★ 4.9 (1 review)</option>
                          <option value="4.8">★ 4.8 (2 reviews)</option>
                        </select>
                      </div>

                      <div className="relative">
                        <select
                          value={reviewSortOrder}
                          onChange={(e) => setReviewSortOrder(e.target.value as any)}
                          className="appearance-none h-9 px-3 rounded-xl border bg-zinc-50/50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer text-xs font-medium"
                        >
                          <option value="newest">Sort: Newest First</option>
                          <option value="highest">Sort: Highest Rating</option>
                          <option value="oldest">Sort: Oldest First</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Filter Tag Pills & Status Count */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-zinc-100 dark:border-zinc-800 shrink-0 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setReviewTagFilter("all")}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                          reviewTagFilter === "all"
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        }`}
                      >
                        All
                      </button>
                      {uniqueReviewTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setReviewTagFilter(tag)}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                            reviewTagFilter === tag
                              ? "bg-red-600 text-white"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 ml-auto">
                      <span>Showing <strong>{filteredAndSortedReviews.length}</strong> of {allClientReviews.length}</span>
                      {(reviewSearch || reviewRatingFilter !== "all" || reviewTagFilter !== "all" || reviewSortOrder !== "newest") && (
                        <button
                          type="button"
                          onClick={handleResetReviewFilters}
                          className="text-red-600 hover:underline font-medium cursor-pointer ml-1"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable Reviews List with High-Hierarchy Cards */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-3 min-h-[160px]">
                    {filteredAndSortedReviews.length === 0 ? (
                      <div className="py-12 text-center flex flex-col items-center">
                        <Search className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-2" />
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No reviews found</p>
                        <p className="text-xs text-zinc-500 max-w-xs mt-1 mb-3">
                          No client reviews match your current search or filter combination.
                        </p>
                        <Button variant="secondary" size="sm" onClick={handleResetReviewFilters} className="text-xs">
                          Reset All Filters
                        </Button>
                      </div>
                    ) : (
                      filteredAndSortedReviews.map((rev) => {
                        const badgeStyle = getRatingBadgeStyle(rev.stars);
                        const clientInitials = rev.clientName
                          .split(" ")
                          .slice(0, 2)
                          .map((w: string) => w[0])
                          .join("");
                        return (
                          <div
                            key={rev.id}
                            className="p-4 rounded-xl border transition-all shadow-2xs space-y-3"
                            style={{
                              background: "var(--color-bg-elevated)",
                              borderColor: "var(--color-border-default)",
                            }}
                          >
                            {/* Card Top: Client Avatar & Project on Left, Rating Badge & Date on Right */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div
                                  className="w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border font-display"
                                  style={{
                                    background: "var(--color-bg-surface)",
                                    borderColor: "var(--color-border-default)",
                                    color: "var(--color-text-primary)",
                                  }}
                                >
                                  {clientInitials}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-sm font-semibold truncate font-display" style={{ color: "var(--color-text-primary)" }}>
                                    {rev.clientName}
                                  </h4>
                                  <p className="text-xs font-medium truncate mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                                    Project: {rev.projectName}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono border ${badgeStyle}`}>
                                  <span className="text-amber-500">★</span>
                                  <span>{rev.stars.toFixed(1)}</span>
                                </div>
                                <span className="text-[11px] font-body" style={{ color: "var(--color-text-tertiary)" }}>{rev.date}</span>
                              </div>
                            </div>

                            {/* Review Quote (Clean quote with subtle left accent line) */}
                            {rev.note && (
                              <p
                                className="text-xs sm:text-sm font-body leading-relaxed pl-3 border-l-2 italic my-1.5"
                                style={{
                                  color: "var(--color-text-primary)",
                                  borderColor: "var(--color-hairline)",
                                }}
                              >
                                &ldquo;{rev.note}&rdquo;
                              </p>
                            )}

                            {/* Card Bottom: Compliment Tag and Direct Link */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t text-xs" style={{ borderColor: "var(--color-hairline)" }}>
                              {rev.tag ? (
                                <span
                                  className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
                                  style={{
                                    background: "var(--color-bg-surface)",
                                    borderColor: "var(--color-border-default)",
                                    color: "var(--color-text-secondary)",
                                  }}
                                >
                                  {rev.tag}
                                </span>
                              ) : <span />}
                              <button
                                type="button"
                                onClick={() => {
                                  setShowReviewsModal(false);
                                  navigate(`/order/${rev.orderId}?role=talent`);
                                }}
                                className="inline-flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer group"
                                style={{ color: "var(--color-accent)" }}
                              >
                                <span>View Order Room</span>
                                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="pt-3 mt-1 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      All reviews are verified and cannot be edited by performers.
                    </span>
                    <Button variant="secondary" className="h-8 text-xs px-4" onClick={() => setShowReviewsModal(false)}>
                      Close
                    </Button>
                  </div>
                </motion.div>
              </Modal>
            )}
          </AnimatePresence>

          {/* Casting Client Reviews & Ratings Modal */}
          <AnimatePresence>
            {showClientReviewsModal && selectedProject && (
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100">
                          {selectedProject.clientName}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3" /> Verified Client
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-body mt-0.5">
                        Authentic feedback from verified performers and talent on completed projects
                      </p>
                    </div>
                    <button
                      onClick={() => setShowClientReviewsModal(false)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                      aria-label="Close client reviews modal"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Summary Stats Pillars */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                    <div className="p-4 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-body">Average Rating</span>
                      <div className="my-2 flex items-baseline gap-2">
                        <span className="font-display text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                          {selectedProject.clientRating ?? 4.9}
                        </span>
                        <div className="flex items-center text-amber-400 text-sm" aria-label="5 stars">
                          <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-body">
                        Based on {selectedProject.clientReviews ?? 18} reviews
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-body">Completed Projects</span>
                      <div className="my-2 flex items-baseline gap-2">
                        <span className="font-display text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                          {selectedProject.clientReviews ?? 18}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          100% Funded
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-body">
                        Zero disputes filed
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-body">Escrow Reliability</span>
                      <div className="my-2 flex items-baseline gap-2">
                        <span className="font-display text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                          100%
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                          Instant Payout
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-body">
                        Protected by Paystack
                      </span>
                    </div>
                  </div>

                  {/* Reviews List */}
                  <div className="flex-1 overflow-y-auto py-3 space-y-3 min-h-0 pr-1">
                    {[
                      {
                        id: "crev-1",
                        performer: "Tomiwa Adeyemi",
                        craft: "Voice Artist",
                        stars: 5,
                        date: "Oct 8, 2026",
                        note: `${selectedProject.clientName} was prompt with milestone escrow release upon asset delivery. Professional creative direction and clear notes. Highly recommended client!`,
                        project: selectedProject.projectName,
                      },
                      {
                        id: "crev-2",
                        performer: "Chioma Ebere",
                        craft: "Commercial Actor",
                        stars: 5,
                        date: "Sep 22, 2026",
                        note: "Great communication throughout the rehearsal and recording days. The check-in code was verified on physical arrival and payout was instantaneous.",
                        project: "Independence Day Campaign",
                      },
                      {
                        id: "crev-3",
                        performer: "David Oladipo",
                        craft: "Audiobook Narrator",
                        stars: 4.8,
                        date: "Aug 15, 2026",
                        note: "Provided clear script excerpts, reasonable revision turnaround requests, and released funds immediately upon deliverable signoff.",
                        project: "Audio Drama Series",
                      },
                      {
                        id: "crev-4",
                        performer: "Sandra Kalu",
                        craft: "VO Specialist",
                        stars: 5,
                        date: "Jul 30, 2026",
                        note: "Respectful client who values talent time. Escrow funded upfront via our payment partner Paystack gave complete peace of mind.",
                        project: "Retail Promo Spots",
                      },
                    ].map((review) => (
                      <div
                        key={review.id}
                        className="p-4 rounded-xl border transition-all shadow-2xs space-y-2.5 bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-display">
                              {review.performer.split(" ").map(n => n[0]).join("")}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold truncate text-zinc-900 dark:text-zinc-100 font-display">
                                {review.performer}
                              </h4>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-body">
                                {review.craft} · {review.project}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <span>★</span>
                              <span>{review.stars}</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{review.date}</div>
                          </div>
                        </div>

                        <p className="text-xs text-zinc-700 dark:text-zinc-300 font-body leading-relaxed pl-1">
                          &ldquo;{review.note}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Modal Footer */}
                  <div className="pt-3 mt-1 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-500" />
                      Client escrow rating verified by Paystack
                    </span>
                    <Button variant="secondary" className="h-8 text-xs px-4" onClick={() => setShowClientReviewsModal(false)}>
                      Close
                    </Button>
                  </div>
                </motion.div>
              </Modal>
            )}
          </AnimatePresence>

          {/* Share Modal */}
          <AnimatePresence>
            {showShare && (
              <Modal onClose={() => setShowShare(false)}>
                <motion.div
                  initial={{ y: 20, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.95 }}
                  className="w-full max-w-sm rounded-[var(--radius-lg)] p-6"
                  style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-display text-xl">Share Profile</h3>
                    <button onClick={() => setShowShare(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--color-bg-elevated)" }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-[var(--radius-md)] mb-4 border" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-border-default)" }}>
                    <div className="text-sm font-mono truncate flex-1 pl-2">{window.location.host}/elias-thorne</div>
                    <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => {
                      const url = `${window.location.origin}/elias-thorne`;
                      navigator.clipboard?.writeText(url);
                      alert(`Copied link to clipboard: ${url}`);
                    }}>Copy</Button>
                  </div>
                  <div className="mb-4">
                    <a
                      href="/elias-thorne"
                      target="_blank"
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-[var(--radius-md)] text-xs font-semibold"
                      style={{ background: "var(--color-accent)", color: "var(--color-accent-on)" }}
                    >
                      Open Public Profile <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="secondary" className="h-10 text-xs" onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(window.location.origin + "/elias-thorne")}`)}>WhatsApp</Button>
                    <Button variant="secondary" className="h-10 text-xs" onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.origin + "/elias-thorne")}`)}>Twitter</Button>
                    <Button variant="secondary" className="h-10 text-xs" onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin + "/elias-thorne")}`)}>LinkedIn</Button>
                  </div>
                </motion.div>
              </Modal>
            )}
          </AnimatePresence>
        </div>
      
          {/* Notifications Drawer (FAANG Architecture) */}
          <AnimatePresence>
            {showNotifications && (
              <NotificationCenterModal
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
                role="talent"
                onNavigateToTab={(tab) => setActiveTab(tab as Tab)}
                items={notifications}
                onMarkRead={handleMarkNotificationRead}
              />
            )}
          </AnimatePresence>

          {/* Sync Calendar Modal */}
          <AnimatePresence>
            {showSyncModal && (
              <Modal onClose={() => setShowSyncModal(false)}>
                <motion.div
                  initial={{ y: 20, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.95 }}
                  className="w-full max-w-sm rounded-[var(--radius-lg)] p-6 text-center"
                  style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
                  onClick={e => e.stopPropagation()}
                >
                  <Calendar className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--color-accent)" }} />
                  <h3 className="font-display text-xl mb-2">Sync with Google Calendar</h3>
                  <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>Connect your Google account to automatically block out times when you're busy and prevent double-bookings.</p>
                  <Button className="w-full h-11 mb-3" onClick={() => {
                    handleConnectCalendarSync();
                    setShowSyncModal(false);
                  }}>
                    Connect Google Account
                  </Button>
                  <Button variant="ghost" className="w-full text-xs" onClick={() => setShowSyncModal(false)}>Maybe Later</Button>
                </motion.div>
              </Modal>
            )}
          </AnimatePresence>

          {/* Add Slot Modal (features.md Phase 13) */}
          <AnimatePresence>
            {showAddSlot && (
              <Modal onClose={() => setShowAddSlot(false)}>
                <motion.div
                  initial={{ y: 20, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.95 }}
                  className="w-full max-w-sm rounded-[var(--radius-lg)] p-6"
                  style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-display text-xl">Add slot — {formatDayLabel(selectedDate)}</h3>
                    <button onClick={() => setShowAddSlot(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--color-bg-elevated)" }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Start</label>
                      <Input type="time" value={newSlotStart} onChange={e => setNewSlotStart(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>End</label>
                      <Input type="time" value={newSlotEnd} onChange={e => setNewSlotEnd(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-2 mb-5">
                    {(["free", "unavailable"] as const).map(state => (
                      <button
                        key={state}
                        onClick={() => setNewSlotState(state)}
                        className="flex-1 py-2 rounded-[var(--radius-md)] text-xs font-semibold"
                        style={{
                          background: newSlotState === state ? SLOT_STATE_META[state].color : "var(--color-bg-elevated)",
                          color: newSlotState === state ? "var(--color-text-inverse)" : "var(--color-text-secondary)",
                          border: `1px solid ${newSlotState === state ? SLOT_STATE_META[state].color : "var(--color-border-default)"}`,
                        }}
                      >
                        {SLOT_STATE_META[state].label}
                      </button>
                    ))}
                  </div>
                  <Button className="w-full h-11" onClick={handleAddSlot} disabled={!newSlotStart || !newSlotEnd || newSlotStart >= newSlotEnd}>
                    Save Slot
                  </Button>
                </motion.div>
              </Modal>
            )}
          </AnimatePresence>

          {/* Add Event Modal (features.md Phase 13) */}
          <AnimatePresence>
            {showAddEvent && (
              <Modal onClose={() => setShowAddEvent(false)}>
                <motion.div
                  initial={{ y: 20, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.95 }}
                  className="w-full max-w-sm rounded-[var(--radius-lg)] p-6"
                  style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-display text-xl">Add event — {formatDayLabel(selectedDate)}</h3>
                    <button onClick={() => setShowAddEvent(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--color-bg-elevated)" }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Title</label>
                    <Input placeholder="e.g. Table read" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Start</label>
                      <Input type="time" value={newEventStart} onChange={e => setNewEventStart(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>End</label>
                      <Input type="time" value={newEventEnd} onChange={e => setNewEventEnd(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-2 mb-5">
                    {(["personal", "hold"] as const).map(kind => (
                      <button
                        key={kind}
                        onClick={() => setNewEventKind(kind)}
                        className="flex-1 py-2 rounded-[var(--radius-md)] text-xs font-semibold capitalize"
                        style={{
                          background: newEventKind === kind ? "var(--color-accent)" : "var(--color-bg-elevated)",
                          color: newEventKind === kind ? "var(--color-accent-on)" : "var(--color-text-secondary)",
                          border: `1px solid ${newEventKind === kind ? "var(--color-accent)" : "var(--color-border-default)"}`,
                        }}
                      >
                        {kind}
                      </button>
                    ))}
                  </div>
                  <Button className="w-full h-11" onClick={handleAddEvent} disabled={!newEventTitle.trim() || newEventStart >= newEventEnd}>
                    Save Event
                  </Button>
                </motion.div>
              </Modal>
            )}
          </AnimatePresence>

          {/* Add Recurring Template Modal (features.md Phase 13) */}
          <AnimatePresence>
            {showRecurringForm && (
              <Modal onClose={() => setShowRecurringForm(false)}>
                <motion.div
                  initial={{ y: 20, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.95 }}
                  className="w-full max-w-sm rounded-[var(--radius-lg)] p-6"
                  style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-display text-xl">Recurring availability</h3>
                    <button onClick={() => setShowRecurringForm(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--color-bg-elevated)" }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Repeats</label>
                    <select
                      value={recurRule}
                      onChange={e => setRecurRule(e.target.value)}
                      className="w-full h-[54px] px-4 rounded-[var(--radius-lg)] text-base font-body"
                      style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-primary)" }}
                    >
                      {RECUR_RULE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Start</label>
                      <Input type="time" value={recurSlotStart} onChange={e => setRecurSlotStart(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>End</label>
                      <Input type="time" value={recurSlotEnd} onChange={e => setRecurSlotEnd(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-2 mb-5">
                    {(["free", "unavailable"] as const).map(state => (
                      <button
                        key={state}
                        onClick={() => setRecurSlotState(state)}
                        className="flex-1 py-2 rounded-[var(--radius-md)] text-xs font-semibold"
                        style={{
                          background: recurSlotState === state ? SLOT_STATE_META[state].color : "var(--color-bg-elevated)",
                          color: recurSlotState === state ? "var(--color-text-inverse)" : "var(--color-text-secondary)",
                          border: `1px solid ${recurSlotState === state ? SLOT_STATE_META[state].color : "var(--color-border-default)"}`,
                        }}
                      >
                        {SLOT_STATE_META[state].label}
                      </button>
                    ))}
                  </div>
                  <Button className="w-full h-11" onClick={handleAddRecurring} disabled={recurSlotStart >= recurSlotEnd}>
                    Save Recurring Template
                  </Button>
                </motion.div>
              </Modal>
            )}
          </AnimatePresence>

          {/* Project Filter Modal */}
          <AnimatePresence>
            {showProjectFilterModal && (
              <Modal onClose={() => setShowProjectFilterModal(false)}>
                <motion.div
                  initial={{ y: 20, scale: 0.96, opacity: 0 }}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  exit={{ y: 20, scale: 0.96, opacity: 0 }}
                  className="w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5"
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
                        Filter Projects
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowProjectFilterModal(false)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-elevated)] transition-colors"
                      style={{ color: "var(--color-text-tertiary)" }}
                      aria-label="Close filters"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 1. Category Clickable Tags */}
                  <div>
                    <label className="block text-xs uppercase font-semibold font-body tracking-wider mb-2" style={{ color: "var(--color-text-secondary)" }}>
                      Category / Craft Role
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: "all", label: "All Roles" },
                        { id: "voice-over", label: "Voice-Over" },
                        { id: "actor", label: "Actor" },
                        { id: "model", label: "Model" },
                        { id: "presenter", label: "Presenter / Host" },
                        { id: "comedian", label: "Comedian" },
                        { id: "musician", label: "Musician" },
                      ].map((cat) => {
                        const isSelected = projectRoleFilter === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setProjectRoleFilter(cat.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold font-body transition-all ${
                              isSelected ? "shadow-sm" : "hover:border-[var(--color-border-strong)]"
                            }`}
                            style={{
                              background: isSelected ? "var(--color-accent)" : "var(--color-bg-elevated)",
                              color: isSelected ? "var(--color-accent-on)" : "var(--color-text-secondary)",
                              border: isSelected ? "1px solid var(--color-accent)" : "1px solid var(--color-border-default)",
                            }}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Budget Range Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs uppercase font-semibold font-body tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                        Minimum Budget
                      </label>
                      <span className="font-mono text-xs font-bold" style={{ color: "var(--color-accent)" }}>
                        {projectBudgetSlider === 0 ? "Any Budget" : `₦${projectBudgetSlider.toLocaleString()}+`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={600000}
                      step={25000}
                      value={projectBudgetSlider}
                      onChange={(e) => setProjectBudgetSlider(Number(e.target.value))}
                      className="w-full accent-[var(--color-accent)] cursor-pointer h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[11px] font-body mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                      <span>₦0 (Any)</span>
                      <span>₦300k</span>
                      <span>₦600k+</span>
                    </div>
                  </div>

                  {/* 3. Rating Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs uppercase font-semibold font-body tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                        Minimum Client Rating
                      </label>
                      <span className="text-xs font-bold font-body text-amber-500 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {projectRatingSlider === 0 ? "Any Rating" : `${projectRatingSlider.toFixed(1)}+ ★`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={5}
                      step={0.1}
                      value={projectRatingSlider}
                      onChange={(e) => setProjectRatingSlider(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[11px] font-body mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                      <span>Any (0.0★)</span>
                      <span>4.0★</span>
                      <span>4.5★</span>
                      <span>5.0★</span>
                    </div>
                  </div>

                  {/* 4. Location & Application Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs uppercase font-semibold font-body tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
                        Location
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: "all", label: "All" },
                          { id: "lagos", label: "Lagos" },
                          { id: "abuja", label: "Abuja" },
                          { id: "remote", label: "Remote" },
                        ].map((loc) => {
                          const isSelected = projectLocationFilter === loc.id;
                          return (
                            <button
                              key={loc.id}
                              type="button"
                              onClick={() => setProjectLocationFilter(loc.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium font-body transition-all"
                              style={{
                                background: isSelected ? "var(--color-accent-soft)" : "var(--color-bg-elevated)",
                                color: isSelected ? "var(--color-accent)" : "var(--color-text-secondary)",
                                border: isSelected ? "1px solid var(--color-accent)" : "1px solid var(--color-border-default)",
                              }}
                            >
                              {loc.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-semibold font-body tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
                        Status
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: "all", label: "All" },
                          { id: "open", label: "Open" },
                          { id: "applied", label: "Applied" },
                        ].map((st) => {
                          const isSelected = projectStatusFilter === st.id;
                          return (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => setProjectStatusFilter(st.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium font-body transition-all"
                              style={{
                                background: isSelected ? "var(--color-accent-soft)" : "var(--color-bg-elevated)",
                                color: isSelected ? "var(--color-accent)" : "var(--color-text-secondary)",
                                border: isSelected ? "1px solid var(--color-accent)" : "1px solid var(--color-border-default)",
                              }}
                            >
                              {st.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t flex items-center justify-between gap-3" style={{ borderColor: "var(--color-hairline)" }}>
                    <button
                      type="button"
                      onClick={resetProjectFilters}
                      className="text-xs font-semibold font-body hover:underline"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Reset All
                    </button>
                    <Button
                      onClick={() => setShowProjectFilterModal(false)}
                      className="h-10 px-5 text-xs font-semibold"
                    >
                      Show {filteredProjects.length} Projects
                    </Button>
                  </div>
                </motion.div>
              </Modal>
            )}
          </AnimatePresence>
          
          {/* Quick Action Popover (Images 2, 3, 4 Inspiration) */}
          <AnimatePresence>
            {actionPopover && (
              <Modal onClose={() => setActionPopover(null)}>
                <motion.div
                  initial={{ y: 20, scale: 0.95 }}
                  animate={{ y: 0, scale: 1 }}
                  exit={{ y: 20, scale: 0.95 }}
                  className="w-full max-w-xs rounded-[var(--radius-lg)] p-5"
                  style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-elevated)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4 pb-2 border-b" style={{ borderColor: "var(--color-border-default)" }}>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                      <h4 className="font-display text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                        Action — {formatDayLabel(actionPopover.date)} {actionPopover.time ? `(${actionPopover.time})` : ""}
                      </h4>
                    </div>
                    <button onClick={() => setActionPopover(null)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--color-bg-elevated)" }}>
                      <X className="w-3.5 h-3.5" style={{ color: "var(--color-text-tertiary)" }} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <Button
                      variant="secondary"
                      className="w-full justify-start text-xs h-10 gap-2"
                      onClick={() => {
                        const targetDate = actionPopover.date;
                        setActionPopover(null);
                        setSelectedDate(targetDate);
                        setNewSlotState("free");
                        setShowAddSlot(true);
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" /> Mark as Available
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full justify-start text-xs h-10 gap-2"
                      onClick={() => {
                        const targetDate = actionPopover.date;
                        setActionPopover(null);
                        setSelectedDate(targetDate);
                        setNewSlotState("unavailable");
                        setShowAddSlot(true);
                      }}
                    >
                      <X className="w-4 h-4 text-[var(--color-accent)]" /> Mark as Unavailable
                    </Button>
                    <Button
                      className="w-full justify-start text-xs h-10 gap-2"
                      onClick={() => {
                        const targetDate = actionPopover.date;
                        setActionPopover(null);
                        setSelectedDate(targetDate);
                        setShowAddEvent(true);
                      }}
                    >
                      <Plus className="w-4 h-4" /> Add Event / Hold
                    </Button>
                  </div>
                </motion.div>
              </Modal>
            )}
          </AnimatePresence>

          {/* Selected Event Details Modal (Images 2 & 4 Inspiration) */}
          <AnimatePresence>
            {selectedEventModal && (
              <Modal onClose={() => setSelectedEventModal(null)}>
                <motion.div
                  initial={{ y: 20, scale: 0.95 }}
                  animate={{ y: 0, scale: 1 }}
                  exit={{ y: 20, scale: 0.95 }}
                  className="w-full max-w-sm rounded-[var(--radius-xl)] p-6"
                  style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "var(--shadow-elevated)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between mb-4 border-b pb-3" style={{ borderColor: "var(--color-border-default)" }}>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider font-body text-[var(--color-accent)]">
                        {formatDayLabel(selectedEventModal.date)}
                      </span>
                      <h3 className="font-display text-lg font-bold mt-0.5" style={{ color: "var(--color-text-primary)" }}>
                        {selectedEventModal.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={async () => {
                          const evtId = selectedEventModal.id;
                          setSelectedEventModal(null);
                          await handleDeleteEvent(evtId);
                        }}
                        aria-label="Delete event"
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-red-500/10 text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedEventModal(null)}
                        aria-label="Close"
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-secondary)" }}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3.5 mb-6">
                    <div className="flex items-start gap-2.5">
                      <Clock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--color-accent)" }} />
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-semibold font-body text-tertiary" style={{ color: "var(--color-text-tertiary)" }}>Date & Time</div>
                        <div className="text-xs font-mono font-medium" style={{ color: "var(--color-text-primary)" }}>
                          {formatDayLabel(selectedEventModal.date)} · {selectedEventModal.start} – {selectedEventModal.end}
                        </div>
                      </div>
                    </div>

                    {selectedEventModal.venue && (
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--color-accent)" }} />
                        <div>
                          <div className="text-[10px] uppercase tracking-wider font-semibold font-body text-tertiary" style={{ color: "var(--color-text-tertiary)" }}>Venue / Location</div>
                          <div className="text-xs font-body" style={{ color: "var(--color-text-primary)" }}>
                            {selectedEventModal.venue}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedEventModal.description && (
                      <div className="flex items-start gap-2.5">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--color-accent)" }} />
                        <div>
                          <div className="text-[10px] uppercase tracking-wider font-semibold font-body text-tertiary" style={{ color: "var(--color-text-tertiary)" }}>Description</div>
                          <div className="text-xs font-body leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                            {selectedEventModal.description}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button className="w-full h-10 text-xs" onClick={() => setSelectedEventModal(null)}>
                    Done
                  </Button>
                </motion.div>
              </Modal>
            )}
          </AnimatePresence>

          <UploadPerformanceReelModal
            isOpen={showUploadReelModal}
            onClose={() => setShowUploadReelModal(false)}
            currentReelUrl={talentProfile.performanceReelUrl}
            onUploadSuccess={(url, title) => {
              setTalentProfile((prev) => ({
                ...prev,
                hasReel: true,
                performanceReelUrl: url,
                performanceReelTitle: title,
              }));
            }}
          />

          <WatchPerformanceReelModal
            isOpen={showWatchReelModal}
            onClose={() => setShowWatchReelModal(false)}
            videoUrl={talentProfile.performanceReelUrl}
            title={talentProfile.performanceReelTitle || "Featured Audition Reel"}
            canUpload={true}
            onOpenUpload={() => setShowUploadReelModal(true)}
          />

          {/* Floating Toast Notification */}
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
                  className="w-5 h-5 rounded-full flex items-center justify-center hover:opacity-75 transition-opacity cursor-pointer"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

      </main>

      <BottomNav
        navItems={TALENT_BOTTOM_NAV_ITEMS}
        allNavItems={[
          ...TALENT_NAV_ITEMS,
          { id: "activity", label: "Recent Activity", icon: Bell },
        ]}
        activeTab={activeTab}
        onTab={setActiveTab}
        indicatorId="tab-indicator"
        userName={talentName}
        userSubLabel="Verified Performer · Monologg Portal"
        userInitials={talentInitials}
        userAvatarUrl={talentProfile.avatarUrl}
        onSettings={() => navigate("/settings")}
        onTransactions={() => navigate("/transactions?role=talent")}
        onSupport={() => navigate("/support")}
        onSignOut={async () => {
          await apiClient.logout();
          navigate("/");
        }}
        isMoreOpen={showMobileMenu}
        onMoreOpenChange={setShowMobileMenu}
      />
    </div>
  );
}
