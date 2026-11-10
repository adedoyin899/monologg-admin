import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { PaystackModal } from "../components/ui/PaystackModal";
import { apiClient, type CreatedBooking } from "../../lib/api-client";
import { appStateSync } from "../../lib/state-sync";
import type { PublicRateCard, PublicStorefront } from "@monologg/types";
import {
  ChevronLeft, ChevronRight, Lock, ArrowRight, AlertCircle, CheckCircle2, Mail,
  CreditCard, ShieldCheck, Check, Calendar, Clock, MapPin, Video,
  UploadCloud, FileText, CalendarX, Copy, ExternalLink, Video as VideoIcon
} from "lucide-react";

/**
 * PWA-18 — External Booking Entry via Performer Storefront Link.
 *
 * Streamlined 4-step external booking flow:
 *   1. Service & Slot (Rate cards selector, Event Date with available/unavailable states, Performer Slots)
 *   2. Project Brief (Campaign title, Format, Venue if onsite, Description, Assets upload, Notes, Client Name & Email)
 *   3. Review & Agreement (Service Agreement with 4 mandatory protection clauses, no duplicate headings, no redundant green badge)
 *   4. Escrow Payment (Image 4 Paystack pill modal integration + direct Card input)
 *   -> Confirmed View with Google Meet Introduction Call scheduler & account surfacing.
 */

type Step = "slot" | "brief" | "review" | "payment" | "processing" | "confirmed";

const CANDIDATE_SLOT_HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 08:00..19:00
const SLOT_DURATION_MIN = 60;

function todayISO(): string {
  return new Date().toISOString().split("T")[0]!;
}

function addMinutes(timeHHMM: string, mins: number): string {
  const [h, m] = timeHHMM.split(":").map(Number);
  const total = h! * 60 + m! + mins;
  const rh = Math.floor(total / 60) % 24;
  const rm = total % 60;
  return `${String(rh).padStart(2, "0")}:${String(rm).padStart(2, "0")}`;
}

const FALLBACK_RATE_CARDS = [
  {
    id: "rc-1",
    title: "Commercial Voice-Over Session",
    price: "₦120,000",
    basePriceAmount: 120_000_00,
    basePriceCurrency: "NGN",
    delivery: "Same Day Delivery",
    description: "Broadcast-ready studio recording with full commercial licensing.",
  },
  {
    id: "rc-2",
    title: "Full-Day Shoot Appearance",
    price: "₦250,000",
    basePriceAmount: 250_000_00,
    basePriceCurrency: "NGN",
    delivery: "On-site Appearance",
    description: "Up to 8 hours on-location or in-studio event / filming presence.",
  },
  {
    id: "rc-3",
    title: "Social Media Video Endorsement",
    price: "₦180,000",
    basePriceAmount: 180_000_00,
    basePriceCurrency: "NGN",
    delivery: "2-Day Delivery",
    description: "Dedicated creator reel / video endorsement across platforms.",
  },
];

export function ExternalBookingEntry() {
  const params = useParams<{ handle?: string; creatorId?: string }>();
  const handle = params.handle || params.creatorId;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isClient = searchParams.get("role") === "client";

  const [creator, setCreator] = useState<PublicStorefront | null>(null);
  const [rateCards, setRateCards] = useState<any[]>(FALLBACK_RATE_CARDS);
  const [selectedRateCard, setSelectedRateCard] = useState<any>(FALLBACK_RATE_CARDS[0]);
  const [step, setStep] = useState<Step>("slot");

  // Step 1: Service & Slot Selection
  const [slotDate, setSlotDate] = useState<string>(todayISO());
  const [openSlots, setOpenSlots] = useState<{ start: string; end: string }[]>([]);
  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>("08:00");
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);

  // Step 2: Project Brief & Client Contact
  const [projectName, setProjectName] = useState("Commercial Campaign Voice-Over");
  const [projectFormat, setProjectFormat] = useState<"online" | "onsite">("online");
  const [venueLocation, setVenueLocation] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Auto-populate registered client contact info when accessed via client role
  useEffect(() => {
    if (isClient) {
      const client = appStateSync.getClientProfile();
      setName((prev) => prev || client.name || client.orgName || "FilmCraft Studios");
      setEmail((prev) => prev || client.email || "client@filmcraft.ng");
      setPhone((prev) => prev || "+234 802 345 6789");
    }
  }, [isClient]);

  // Step 3: Review & Agreement (Service Agreement)
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Step 4: Escrow Payment
  const [paymentOption, setPaymentOption] = useState<"card" | "paystack">("card");
  const [cardNum, setCardNum] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [showPaystackModal, setShowPaystackModal] = useState(false);

  // Booking Execution State
  const [booking, setBooking] = useState<CreatedBooking | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  // Auto-transition client to Order Room after confirming booking
  useEffect(() => {
    if (step === "confirmed" && isClient) {
      const timer = setTimeout(() => {
        navigate(booking?.id ? `/order/${booking.id}?role=client` : "/order/ORD-001?role=client");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [step, isClient, booking, navigate]);

  // Google Meet Prompt State
  const [copiedMeetLink, setCopiedMeetLink] = useState(false);
  const googleMeetUrl = "https://meet.google.com/new";

  const creatorId = creator?.id ?? null;

  // Load creator + rate cards
  useEffect(() => {
    if (!handle) return;
    apiClient
      .getPublicStorefront(handle)
      .then(setCreator)
      .catch(() => {});

    apiClient
      .getCreatorRateCardsPublic(handle)
      .then((cards) => {
        const availableCards = cards.length > 0 ? cards : FALLBACK_RATE_CARDS;
        setRateCards(availableCards);
        const preselectedId = searchParams.get("rateCard");
        const matched = availableCards.find((c) => c.id === preselectedId) ?? availableCards[0] ?? null;
        setSelectedRateCard(matched);
      })
      .catch(() => {
        setRateCards(FALLBACK_RATE_CARDS);
        setSelectedRateCard(FALLBACK_RATE_CARDS[0]);
      });
  }, [handle, searchParams]);

  // Load open slots when date or creator changes
  useEffect(() => {
    if (!creatorId) {
      // In mock mode / initial load, provide realistic default open slots
      setOpenSlots([
        { start: "08:00", end: "10:00" },
        { start: "11:00", end: "13:00" },
        { start: "14:00", end: "16:00" },
        { start: "17:00", end: "19:00" },
      ]);
      return;
    }
    setSlotError(null);
    apiClient
      .getOpenSlots(creatorId, slotDate)
      .then((slots) => {
        setOpenSlots(slots);
        if (slots.length > 0 && !slots.some((s) => s.start === selectedSlotStart)) {
          setSelectedSlotStart(slots[0]!.start);
        }
      })
      .catch(() => {
        setOpenSlots([]);
      });
  }, [creatorId, slotDate]);

  const baseRate = selectedRateCard?.basePriceAmount ?? 120_000_00;
  const escrowFee = Math.round(baseRate * 0.12);
  const total = baseRate + escrowFee;

  const money = (kobo: number) => `₦${(kobo / 100).toLocaleString()}`;

  // Month Calendar View State (FAANG-grade month grid with navigation)
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => {
    const d = new Date(slotDate || todayISO());
    return isNaN(d.getTime()) ? new Date() : new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const calendarYear = calendarViewDate.getFullYear();
  const calendarMonth = calendarViewDate.getMonth(); // 0-indexed

  const monthYearLabel = calendarViewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const handlePrevMonth = () => {
    setCalendarViewDate((prev) => {
      const now = new Date();
      if (
        prev.getFullYear() < now.getFullYear() ||
        (prev.getFullYear() === now.getFullYear() && prev.getMonth() <= now.getMonth())
      ) {
        return prev;
      }
      return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
    });
  };

  const handleNextMonth = () => {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const isPrevMonthDisabled = (() => {
    const now = new Date();
    return (
      calendarYear < now.getFullYear() ||
      (calendarYear === now.getFullYear() && calendarMonth <= now.getMonth())
    );
  })();

  const DOW_HEADERS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  // Helper to determine whether a given ISO date is unavailable
  const checkDateUnavailable = React.useCallback((iso: string): boolean => {
    try {
      const [y, m, d] = iso.split("-").map(Number);
      const target = new Date(y!, m! - 1, d!);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetStart = new Date(target);
      targetStart.setHours(0, 0, 0, 0);

      // Past dates are unavailable
      if (targetStart < today) return true;

      // Sundays (day 0) or specific scheduled booked days (20, 25) when not today
      const isToday = targetStart.getTime() === today.getTime();
      const dayOfWeek = target.getDay();
      const isBooked = !isToday && (dayOfWeek === 0 || [20, 25].includes(d!));
      return isBooked;
    } catch {
      return false;
    }
  }, []);

  const isSelectedDateUnavailable = checkDateUnavailable(slotDate);

  const calendarDays = React.useMemo(() => {
    const firstDayRaw = new Date(calendarYear, calendarMonth, 1).getDay();
    // Monday start: 0 = Mon, ..., 6 = Sun
    const startOffset = (firstDayRaw + 6) % 7;
    const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    const blanks = Array.from({ length: startOffset }, (_, i) => ({
      key: `blank-${i}`,
      isBlank: true,
      dayNum: 0,
      iso: "",
      isPast: false,
      isUnavailable: false,
      isSelected: false,
    }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = Array.from({ length: totalDays }, (_, i) => {
      const dayNum = i + 1;
      const iso = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      const dObj = new Date(calendarYear, calendarMonth, dayNum);
      dObj.setHours(0, 0, 0, 0);
      const isPast = dObj < today;
      const isUnavailable = checkDateUnavailable(iso);
      const isSelected = slotDate === iso;

      return {
        key: `day-${iso}`,
        isBlank: false,
        dayNum,
        iso,
        isPast,
        isUnavailable,
        isSelected,
      };
    });

    return [...blanks, ...days];
  }, [calendarYear, calendarMonth, slotDate, checkDateUnavailable]);

  const formatSelectedDateHuman = (iso: string): string => {
    try {
      const [y, m, d] = iso.split("-").map(Number);
      const dateObj = new Date(y!, m! - 1, d!);
      return dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const handleSelectDate = (iso: string, isUnavailable: boolean) => {
    if (isUnavailable) {
      setShowUnavailableModal(true);
      return;
    }
    setSlotDate(iso);
  };

  const handleProceedFromSlot = () => {
    if (isSelectedDateUnavailable || !selectedSlotStart) {
      setShowUnavailableModal(true);
      return;
    }
    setStep("brief");
  };

  const handlePay = async () => {
    if (!selectedRateCard || !selectedSlotStart) return;
    setSubmitting(true);
    setPayError(null);
    setStep("processing");

    const compiledContextNote = [
      projectName && `Project: ${projectName}`,
      projectFormat && `Format: ${projectFormat === "onsite" ? `On-site (${venueLocation || "Venue TBD"})` : "Online / Remote"}`,
      projectDescription && `Description: ${projectDescription}`,
      phone && `Phone: ${phone}`,
      additionalNotes && `Notes: ${additionalNotes}`,
      uploadedFile && `Asset attached: ${uploadedFile.name}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const created =
        booking ??
        (await apiClient.createGuestBooking({
          creatorId: creatorId || "creator-1",
          rateCardId: selectedRateCard.id,
          slotDate,
          slotStart: selectedSlotStart,
          slotEnd: addMinutes(selectedSlotStart, SLOT_DURATION_MIN),
          contextNote: compiledContextNote.trim() || undefined,
          name: name.trim() || "Guest Client",
          email: email.trim() || "client@example.com",
        }));
      setBooking(created);

      const { providerRef } = await apiClient.payGuestBooking(created.id);
      const ok = await apiClient.simulateEscrowWebhook(providerRef);
      if (!ok) throw new Error("escrow confirmation failed");
      setStep("confirmed");
    } catch (err) {
      if (!booking && err instanceof Error && err.message.includes("409")) {
        setSlotError("That slot was just taken — please pick another time.");
        setSelectedSlotStart(null);
        if (creatorId) apiClient.getOpenSlots(creatorId, slotDate).then(setOpenSlots);
        setStep("slot");
      } else {
        setPayError("We couldn't confirm your payment. Please try again.");
        setStep("payment");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const roleThemeClass = searchParams.get("role") === "client" ? "role-client" : "role-talent";

  const getStepNumber = (s: Step): number => {
    if (s === "slot") return 1;
    if (s === "brief") return 2;
    if (s === "review") return 3;
    if (s === "payment" || s === "processing" || s === "confirmed") return 4;
    return 1;
  };

  const STEP_ITEMS = [
    { id: 1, label: "Event & Slot", mobileLabel: "Slot", key: "slot" as Step },
    { id: 2, label: "Project Brief", mobileLabel: "Brief", key: "brief" as Step },
    { id: 3, label: isClient ? "Agreement" : "Contact & Agreement", mobileLabel: "Agreement", key: "review" as Step },
    { id: 4, label: "Escrow Payment", mobileLabel: "Payment", key: "payment" as Step },
  ];

  const header = (onBack: () => void) => {
    const currentStepNum = getStepNumber(step);
    return (
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/90 dark:bg-[#0D0D0F]/90 border-b border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs transition-colors">
        <div className="h-20 relative flex items-center justify-center px-4 max-w-xl mx-auto w-full">
          {/* Back button at the extreme left (omitted on step 1 since it's a fresh browser page) */}
          {currentStepNum > 1 && (
            <button
              type="button"
              aria-label="Go back"
              onClick={onBack}
              className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/80 hover:scale-105 active:scale-95 transition-all cursor-pointer z-20 shadow-2xs"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
          )}

          {/* 4-Step Progress Stepper centered in the navbar with pixel-perfect segmented connector lines */}
          <div className="w-full max-w-md mx-auto px-2 relative flex items-start justify-between">
            {STEP_ITEMS.map((item, index) => {
              const isDone = item.id < currentStepNum;
              const isActive = item.id === currentStepNum;
              return (
                <React.Fragment key={item.id}>
                  <button
                    type="button"
                    disabled={item.id > currentStepNum}
                    onClick={() => {
                      if (item.id === 1) setStep("slot");
                      else if (item.id === 2) setStep("brief");
                      else if (item.id === 3) setStep("review");
                      else if (item.id === 4 && agreedToTerms && (isClient || (name.trim() && email.trim() && phone.trim()))) setStep("payment");
                    }}
                    className={`flex flex-col items-center group relative z-10 shrink-0 w-14 sm:w-20 ${
                      item.id <= currentStepNum ? "cursor-pointer" : "cursor-not-allowed opacity-45"
                    }`}
                  >
                    {/* Circle Node with glowing halo ring on active step */}
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold font-body transition-all duration-300 select-none ${
                        isDone
                          ? "bg-[var(--color-accent)] text-white shadow-xs"
                          : isActive
                          ? "bg-[var(--color-accent)] text-white shadow-md ring-4 ring-[var(--color-accent-soft)] ring-offset-2 ring-offset-white dark:ring-offset-zinc-900"
                          : "bg-white dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" /> : item.id}
                    </div>

                    {/* Step Label */}
                    <span
                      className={`text-[10px] sm:text-[11px] font-body mt-1 sm:mt-1.5 transition-colors text-center leading-tight whitespace-nowrap ${
                        isActive
                          ? "text-[var(--color-accent)] font-semibold"
                          : isDone
                          ? "text-zinc-900 dark:text-zinc-100 font-medium"
                          : "text-zinc-400 dark:text-zinc-500 font-normal"
                      }`}
                    >
                      <span className="hidden sm:inline">{item.label}</span>
                      <span className="sm:hidden">{item.mobileLabel}</span>
                    </span>
                  </button>

                  {/* Segmented Connector Line between circles (never bleeds past start or end) */}
                  {index < STEP_ITEMS.length - 1 && (
                    <div className="flex-1 h-[2px] mx-1 sm:mx-2 mt-[13px] sm:mt-[15px] relative bg-zinc-200 dark:bg-zinc-700/80 rounded-full overflow-hidden self-start">
                      <div
                        className={`h-full bg-[var(--color-accent)] transition-all duration-300 ease-out ${
                          item.id < currentStepNum ? "w-full" : "w-0"
                        }`}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </header>
    );
  };

  // ── Step 1: Event Date & Performer Slots ──────────────────────────────────────
  if (step === "slot") {
    return (
      <div className={`${roleThemeClass} min-h-screen flex flex-col`} style={{ background: "var(--color-bg-canvas)" }}>
        {header(() => navigate(-1))}
        <div className="flex-1 px-4 py-6 max-w-xl mx-auto w-full space-y-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              Book {creator?.name ?? "Performer"}
            </h1>
            <p className="text-xs sm:text-sm font-body mt-1 text-[var(--color-text-secondary)]">
              Select your event date and preferred performer time slot.
            </p>
          </div>

          {/* Event Date Section: Simple Compact Month Calendar with Month Toggle */}
          <div
            className="p-4 sm:p-5 rounded-2xl border space-y-4"
            style={{
              background: "var(--color-bg-surface)",
              borderColor: "var(--color-hairline)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            {/* Calendar Month Header & Switcher */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
                  {monthYearLabel}
                </h3>
                <p className="text-[11px] font-body text-[var(--color-text-tertiary)]">
                  Pick an available date for your event
                </p>
              </div>

              {/* Month Switcher Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={handlePrevMonth}
                  disabled={isPrevMonthDisabled}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                    isPrevMonthDisabled
                      ? "opacity-30 cursor-not-allowed border-transparent text-zinc-400"
                      : "cursor-pointer hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border-[var(--color-hairline)]"
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={handleNextMonth}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border cursor-pointer hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border-[var(--color-hairline)] transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Availability Legend */}
            <div className="flex items-center gap-4 text-xs font-body pt-1 pb-1 border-b" style={{ borderColor: "var(--color-hairline)" }}>
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Date available</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-zinc-400/60 dark:bg-zinc-600" />
                <span className="line-through decoration-zinc-400/50">Booked / Unavailable</span>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {DOW_HEADERS.map((dow) => (
                <div key={dow} className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] py-1">
                  {dow}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
              {calendarDays.map((item) => {
                if (item.isBlank) {
                  return <div key={item.key} className="h-9 sm:h-10" />;
                }

                if (item.isPast) {
                  return (
                    <div
                      key={item.key}
                      className="h-9 sm:h-10 flex items-center justify-center text-xs font-mono text-zinc-300 dark:text-zinc-700 cursor-not-allowed select-none"
                    >
                      {item.dayNum}
                    </div>
                  );
                }

                if (item.isUnavailable) {
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleSelectDate(item.iso, true)}
                      title="Booked — click for availability details"
                      className="h-9 sm:h-10 rounded-xl flex items-center justify-center text-xs font-mono font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-100/60 dark:bg-zinc-800/40 line-through decoration-zinc-400/60 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer"
                    >
                      {item.dayNum}
                    </button>
                  );
                }

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSelectDate(item.iso, false)}
                    className={`h-9 sm:h-10 rounded-xl flex items-center justify-center text-xs font-mono font-semibold transition-all cursor-pointer ${
                      item.isSelected
                        ? "shadow-sm scale-[1.04]"
                        : "hover:bg-[var(--color-bg-elevated)]"
                    }`}
                    style={{
                      background: item.isSelected ? "var(--color-accent)" : "transparent",
                      color: item.isSelected ? "var(--color-accent-on)" : "var(--color-text-primary)",
                    }}
                  >
                    {item.dayNum}
                  </button>
                );
              })}
            </div>

            {/* Selected Date Status Pill */}
            <div
              className="p-3 rounded-xl border flex items-center justify-between text-xs font-body mt-2"
              style={{
                background: "var(--color-bg-elevated)",
                borderColor: "var(--color-hairline)",
              }}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {formatSelectedDateHuman(slotDate)}
                </span>
              </div>
              <span
                className="font-medium flex items-center gap-1.5"
                style={{ color: isSelectedDateUnavailable ? "var(--color-error)" : "var(--color-success)" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: isSelectedDateUnavailable ? "var(--color-error)" : "var(--color-success)" }}
                />
                <span>{isSelectedDateUnavailable ? "Date unavailable" : "Date available"}</span>
              </span>
            </div>
          </div>

          {slotError && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl text-sm font-body bg-[var(--color-error-bg)] text-[var(--color-error)]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{slotError}</span>
            </div>
          )}

          {/* Performer Slots Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold font-body text-[var(--color-text-secondary)]">
                Performer slots
              </label>
              <span className="text-xs font-body text-[var(--color-text-tertiary)]">
                {openSlots.length > 0 ? "Select an available hour" : "No open slots on this date"}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {CANDIDATE_SLOT_HOURS.map((h) => {
                const startStr = `${String(h).padStart(2, "0")}:00`;
                const isOpen = !isSelectedDateUnavailable && openSlots.some((s) => startStr >= s.start && startStr < s.end);
                const isSelected = selectedSlotStart === startStr;

                return (
                  <button
                    key={startStr}
                    type="button"
                    disabled={!isOpen}
                    onClick={() => setSelectedSlotStart(startStr)}
                    className="h-11 rounded-xl font-mono text-sm font-medium transition-all flex items-center justify-center cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                    style={{
                      background: isSelected ? "var(--color-accent)" : isOpen ? "var(--color-bg-surface)" : "var(--color-bg-elevated)",
                      color: isSelected ? "var(--color-accent-on)" : "var(--color-text-primary)",
                      border: `1px solid ${isSelected ? "var(--color-accent)" : "var(--color-hairline)"}`,
                    }}
                  >
                    <Clock className="w-3.5 h-3.5 mr-1.5 opacity-60" />
                    <span>{startStr}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            className="w-full h-12 text-sm font-bold gap-2 cursor-pointer"
            onClick={handleProceedFromSlot}
            aria-label="Continue to Project Brief"
          >
            <span className="hidden sm:inline">Continue to Project Brief</span>
            <span className="sm:hidden">Continue</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Unavailable Performer Modal — Solid background, stopPropagation */}
        {showUnavailableModal && (
          <Modal onClose={() => setShowUnavailableModal(false)} align="center" strength="strong">
            <div
              className="w-full max-w-sm rounded-3xl p-6 text-center space-y-4 border shadow-2xl relative z-10"
              style={{
                background: "var(--color-bg-surface)",
                borderColor: "var(--color-hairline)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <CalendarX className="w-7 h-7" />
              </div>
              <h3 className="font-display text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                Performer Unavailable
              </h3>
              <p className="text-xs font-body leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                {creator?.name || "This performer"} is not available on this date or time. You can check back again for updated availability or explore another verified performer.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button className="w-full h-11 text-xs font-bold cursor-pointer" onClick={() => setShowUnavailableModal(false)}>
                  Choose Another Date
                </Button>
                <Button variant="secondary" className="w-full h-11 text-xs cursor-pointer" onClick={() => navigate("/client")}>
                  Browse Other Performers
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // ── Step 2: Project Brief (Campaign title, Format, Venue, Description, Assets, Notes) ──
  if (step === "brief") {
    return (
      <div className={`${roleThemeClass} min-h-screen flex flex-col`} style={{ background: "var(--color-bg-canvas)" }}>
        {header(() => setStep("slot"))}
        <div className="flex-1 px-4 py-6 max-w-xl mx-auto w-full space-y-5">
          <div>
            <h2 className="font-display text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              Project Brief
            </h2>
            <p className="text-xs font-body mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
              Provide your project requirements, script, and deliverables for {creator?.name ?? "the performer"}.
            </p>
          </div>

          {/* Project Title */}
          <div>
            <label className="block text-xs font-medium mb-1.5 font-body text-[var(--color-text-secondary)]">
              Project name / campaign title *
            </label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., Sahara Fintech Explainer Series"
              className="text-sm font-body"
            />
          </div>

          {/* Project Format */}
          <div>
            <label className="block text-xs font-medium mb-1.5 font-body text-[var(--color-text-secondary)]">
              Project format *
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setProjectFormat("online")}
                className="p-3.5 rounded-xl border text-left transition-all cursor-pointer"
                style={{
                  background: projectFormat === "online" ? "var(--color-accent-soft)" : "var(--color-bg-surface)",
                  borderColor: projectFormat === "online" ? "var(--color-accent)" : "var(--color-hairline)",
                }}
              >
                <div className="flex items-center gap-1.5 mb-1" style={{ color: projectFormat === "online" ? "var(--color-accent)" : "var(--color-text-primary)" }}>
                  <Video className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-bold font-body">Online / Remote</span>
                </div>
                <p className="text-[11px] font-body text-[var(--color-text-tertiary)]">
                  Digital deliverables, voiceover recordings, remote sessions.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setProjectFormat("onsite")}
                className="p-3.5 rounded-xl border text-left transition-all cursor-pointer"
                style={{
                  background: projectFormat === "onsite" ? "var(--color-accent-soft)" : "var(--color-bg-surface)",
                  borderColor: projectFormat === "onsite" ? "var(--color-accent)" : "var(--color-hairline)",
                }}
              >
                <div className="flex items-center gap-1.5 mb-1" style={{ color: projectFormat === "onsite" ? "var(--color-accent)" : "var(--color-text-primary)" }}>
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-bold font-body">On-site / In-person</span>
                </div>
                <p className="text-[11px] font-body text-[var(--color-text-tertiary)]">
                  Physical event presence, shoot location, stage performance.
                </p>
              </button>
            </div>
          </div>

          {/* On-site Venue */}
          {projectFormat === "onsite" && (
            <div>
              <label className="block text-xs font-medium mb-1.5 font-body text-[var(--color-text-secondary)]">
                Event venue / location *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-accent)]" />
                <Input
                  className="pl-9 text-sm"
                  placeholder="e.g., Eko Hotel Grand Ballroom, Victoria Island, Lagos"
                  value={venueLocation}
                  onChange={(e) => setVenueLocation(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Project Description */}
          <div>
            <label className="block text-xs font-medium mb-1.5 font-body text-[var(--color-text-secondary)]">
              Project description
            </label>
            <textarea
              rows={3}
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Describe your project, goals, and what you're looking for in a performer..."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-body border resize-none"
              style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-hairline)", color: "var(--color-text-primary)" }}
            />
          </div>

          {/* Assets Upload */}
          <div>
            <label className="block text-xs font-medium mb-1.5 font-body text-[var(--color-text-secondary)]">
              Project assets & script
            </label>
            <div
              className="relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors"
              style={{
                borderColor: uploadedFile ? "var(--color-success)" : "var(--color-hairline)",
                background: uploadedFile ? "var(--color-success-bg)" : "var(--color-bg-surface)",
              }}
            >
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".pdf,.doc,.docx,.txt,.mp3,.mp4"
                onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
              />
              {!uploadedFile ? (
                <>
                  <UploadCloud className="w-8 h-8 mb-2 text-[var(--color-text-tertiary)]" />
                  <p className="text-xs font-semibold font-body text-[var(--color-text-secondary)]">
                    Drag &amp; drop or click to upload
                  </p>
                  <p className="text-[11px] font-body text-[var(--color-text-tertiary)] mt-0.5">
                    PDF, DOC, DOCX, TXT, MP3, MP4 · Max 50MB
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-[var(--color-success)]" />
                  <div className="text-left">
                    <p className="text-xs font-semibold font-body text-[var(--color-text-primary)]">{uploadedFile.name}</p>
                    <p className="text-[10px] font-body text-[var(--color-text-tertiary)]">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ml-3 text-xs text-[var(--color-error)] underline cursor-pointer relative z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFile(null);
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-medium mb-1.5 font-body text-[var(--color-text-secondary)]">
              Additional notes for performer
            </label>
            <textarea
              rows={3}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Any specific requirements, tone preferences, reference examples, or important context the performer should know..."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-body border resize-none"
              style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-hairline)", color: "var(--color-text-primary)" }}
            />
          </div>

          <Button
            className="w-full h-12 text-sm font-bold gap-2 cursor-pointer"
            disabled={!projectName.trim() || (projectFormat === "onsite" && !venueLocation.trim())}
            onClick={() => setStep("review")}
            aria-label={isClient ? "Continue to Agreement" : "Continue to Contact & Agreement"}
          >
            <span className="hidden sm:inline">{isClient ? "Continue to Agreement" : "Continue to Contact & Agreement"}</span>
            <span className="sm:hidden">{isClient ? "Continue" : "Continue to Agreement"}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>

          <button
            type="button"
            className="w-full text-xs text-center font-body text-[var(--color-text-tertiary)] hover:underline cursor-pointer"
            onClick={() => setStep("slot")}
          >
            ← Back to Event & Slot
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: Contact & Agreement (Contact Details & Service Agreement) ──────────
  if (step === "review") {
    return (
      <div className={`${roleThemeClass} min-h-screen flex flex-col`} style={{ background: "var(--color-bg-canvas)" }}>
        {header(() => setStep("brief"))}
        <div className="flex-1 px-4 py-6 max-w-xl mx-auto w-full space-y-5">
          <div>
            <h2 className="font-display text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              {isClient ? "Agreement" : "Contact & Agreement"}
            </h2>
            <p className="text-xs font-body mt-0.5 text-[var(--color-text-secondary)]">
              {isClient
                ? "Review and accept the Monologg service agreement and escrow terms."
                : "Provide your contact details for booking notifications and accept the escrow terms."}
            </p>
          </div>

          {/* Contact Details Card — Only shown for guest bookings (clients have pre-registered profiles) */}
          {!isClient && (
            <div
              className="p-5 rounded-2xl border space-y-4"
              style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-hairline)", boxShadow: "var(--shadow-card)" }}
            >
              <div>
                <h3 className="text-sm font-bold font-body" style={{ color: "var(--color-text-primary)" }}>
                  Your contact details
                </h3>
                <p className="text-xs font-body text-[var(--color-text-tertiary)] mt-0.5">
                  We'll use these details to send project updates, check-in alerts, and your Monologg sign-in link.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1 font-body text-[var(--color-text-secondary)]">
                    Your name *
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="text-sm font-body"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 font-body text-[var(--color-text-secondary)]">
                      Email address *
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="text-sm font-body"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 font-body text-[var(--color-text-secondary)]">
                      Phone number *
                    </label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234 800 000 0000"
                      className="text-sm font-body"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clean Service Agreement Card */}
          <div
            className="p-5 rounded-2xl border space-y-3.5"
            style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-hairline)", boxShadow: "var(--shadow-card)" }}
          >
            <h3 className="text-sm font-bold font-body" style={{ color: "var(--color-text-primary)" }}>
              Service agreement & escrow terms
            </h3>
            <div className="space-y-2.5 text-xs font-body leading-relaxed divide-y divide-[var(--color-hairline)]" style={{ color: "var(--color-text-secondary)" }}>
              <div className="pt-1">
                <strong className="font-semibold block mb-0.5" style={{ color: "var(--color-text-primary)" }}>
                  Escrow Protection &amp; Fee Policy:
                </strong>
                100% of your booking fee is held securely in escrow by Paystack and is only released after service completion and approval. A transparent 12% client escrow protection fee is added at deposit, and a 7% platform fee is deducted from the performer's payout upon completion.
              </div>
              <div className="pt-2">
                <strong className="font-semibold block mb-0.5" style={{ color: "var(--color-text-primary)" }}>
                  Performer Verification:
                </strong>
                Performers must confirm availability check-ins prior to your project to ensure attendance and readiness.
              </div>
              <div className="pt-2">
                <strong className="font-semibold block mb-0.5" style={{ color: "var(--color-text-primary)" }}>
                  Cancellation & Refund Policy:
                </strong>
                If a performer fails confirmation check-ins or cancels, you receive a full refund minus payment processing charges capped at NGN 5,000.
              </div>
              <div className="pt-2">
                <strong className="font-semibold block mb-0.5" style={{ color: "var(--color-text-primary)" }}>
                  On-Site Attendance:
                </strong>
                You will receive a 4-digit verification code to give to the talent upon arrival to confirm physical attendance.
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

          <Button
            className="w-full h-12 text-sm font-bold gap-2 cursor-pointer"
            disabled={!agreedToTerms || (!isClient && (!name.trim() || !email.trim() || !email.includes("@") || !phone.trim()))}
            onClick={() => setStep("payment")}
          >
            <span>Proceed to Payment</span>
            <ArrowRight className="w-4 h-4" />
          </Button>

          <button
            type="button"
            className="w-full text-xs text-center font-body text-[var(--color-text-tertiary)] hover:underline cursor-pointer"
            onClick={() => setStep("brief")}
          >
            ← Back to Project Brief
          </button>
        </div>
      </div>
    );
  }

  // ── Step 4: Escrow Payment (2-Option Selector, Single CTA Button) ─────────────
  if (step === "payment") {
    return (
      <div className={`${roleThemeClass} min-h-screen flex flex-col`} style={{ background: "var(--color-bg-canvas)" }}>
        {header(() => setStep("review"))}
        <div className="flex-1 px-4 py-6 max-w-xl mx-auto w-full space-y-5">
          <div>
            <h2 className="font-display text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              Payment
            </h2>
            <p className="text-xs font-body mt-0.5 text-[var(--color-text-secondary)]">
              Choose your preferred payment method to deposit funds into escrow.
            </p>
          </div>

          {/* Clean Order Total & Escrow Card */}
          <div
            className="p-4 sm:p-5 rounded-2xl border flex items-center justify-between"
            style={{
              background: "var(--color-bg-surface)",
              borderColor: "var(--color-hairline)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div>
              <div className="text-xs font-body text-[var(--color-text-tertiary)]">
                Total escrow deposit
              </div>
              <div className="font-mono text-2xl font-bold mt-0.5" style={{ color: "var(--color-text-primary)" }}>
                {money(total)}
              </div>
              <div className="text-[11px] font-body text-[var(--color-text-secondary)] mt-0.5">
                {creator?.name || "Performer"} · {slotDate} @ {selectedSlotStart}
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" /> 100% Escrow Protected
              </span>
              <div className="text-[10px] text-[var(--color-text-tertiary)] mt-1">
                Released only after your approval
              </div>
            </div>
          </div>

          {payError && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl text-sm font-body bg-[var(--color-error-bg)] text-[var(--color-error)]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{payError}</span>
            </div>
          )}

          {/* Payment Method 2-Option Selector */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold font-body text-[var(--color-text-secondary)]">
              Select payment method
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Card */}
              <button
                type="button"
                onClick={() => setPaymentOption("card")}
                className="p-4 rounded-2xl border text-left transition-all cursor-pointer relative"
                style={{
                  background: paymentOption === "card" ? "var(--color-accent-soft)" : "var(--color-bg-surface)",
                  borderColor: paymentOption === "card" ? "var(--color-accent)" : "var(--color-hairline)",
                  boxShadow: paymentOption === "card" ? "var(--shadow-card)" : "none",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[var(--color-accent)]" />
                    <span className="text-xs font-bold font-body" style={{ color: "var(--color-text-primary)" }}>
                      Pay with Card
                    </span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      paymentOption === "card" ? "border-[var(--color-accent)] bg-[var(--color-accent)]" : "border-[var(--color-hairline)]"
                    }`}
                  >
                    {paymentOption === "card" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[11px] font-body text-[var(--color-text-tertiary)]">
                  Direct card entry (Visa, Mastercard, Verve)
                </p>
              </button>

              {/* Option 2: Paystack */}
              <button
                type="button"
                onClick={() => setPaymentOption("paystack")}
                className="p-4 rounded-2xl border text-left transition-all cursor-pointer relative"
                style={{
                  background: paymentOption === "paystack" ? "var(--color-accent-soft)" : "var(--color-bg-surface)",
                  borderColor: paymentOption === "paystack" ? "var(--color-accent)" : "var(--color-hairline)",
                  boxShadow: paymentOption === "paystack" ? "var(--shadow-card)" : "none",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[var(--color-accent)]" />
                    <span className="text-xs font-bold font-body" style={{ color: "var(--color-text-primary)" }}>
                      Pay with Paystack
                    </span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      paymentOption === "paystack" ? "border-[var(--color-accent)] bg-[var(--color-accent)]" : "border-[var(--color-hairline)]"
                    }`}
                  >
                    {paymentOption === "paystack" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[11px] font-body text-[var(--color-text-tertiary)]">
                  Instant checkout via Card, Bank Transfer, or USSD
                </p>
              </button>
            </div>
          </div>

          {/* Conditional Details based on selection */}
          {paymentOption === "card" ? (
            <div
              className="p-5 rounded-2xl border space-y-4"
              style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-hairline)", boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold font-body text-[var(--color-text-secondary)]">
                  Card information
                </span>
                <div className="flex gap-1.5 text-[10px] font-mono uppercase font-semibold text-[var(--color-text-tertiary)]">
                  <span>Visa</span> · <span>Mastercard</span> · <span>Verve</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1 font-body text-[var(--color-text-secondary)]">
                    Card number
                  </label>
                  <Input
                    value={cardNum}
                    onChange={(e) => setCardNum(e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim())}
                    placeholder="0000 0000 0000 0000"
                    className="font-mono text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 font-body text-[var(--color-text-secondary)]">
                      Expiry date
                    </label>
                    <Input
                      value={expiry}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setExpiry(clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean);
                      }}
                      placeholder="MM/YY"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 font-body text-[var(--color-text-secondary)]">
                      CVV
                    </label>
                    <Input
                      type="password"
                      maxLength={4}
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="123"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 font-body text-[var(--color-text-secondary)]">
                    Cardholder name
                  </label>
                  <Input
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Name as it appears on card"
                    className="text-sm font-body"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div
              className="p-5 rounded-2xl border space-y-3"
              style={{
                background: "var(--color-bg-surface)",
                borderColor: "var(--color-hairline)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(11, 164, 219, 0.12)", color: "#0BA4DB" }}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold font-body" style={{ color: "var(--color-text-primary)" }}>
                    Paystack Checkout
                  </div>
                  <div className="text-xs font-body text-[var(--color-text-tertiary)]">
                    Instant, secure checkout via Cards, direct Bank Transfer (Wema Bank), or USSD
                  </div>
                </div>
              </div>
              <p className="text-xs font-body text-[var(--color-text-secondary)] leading-relaxed pt-2 border-t" style={{ borderColor: "var(--color-hairline)" }}>
                Click below to launch the secure Paystack checkout modal. Your funds will be deposited directly into Monologg escrow.
              </p>
            </div>
          )}

          {/* Only ONE single CTA button */}
          {paymentOption === "paystack" ? (
            <Button
              type="button"
              className="w-full h-12 text-sm font-bold gap-2 cursor-pointer"
              onClick={() => setShowPaystackModal(true)}
              aria-label={`Pay ${money(total)} with Paystack`}
            >
              <span className="hidden sm:inline">Pay {money(total)} with Paystack</span>
              <span className="sm:hidden">Pay {money(total)}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              className="w-full h-12 text-sm font-bold gap-2 cursor-pointer"
              disabled={submitting}
              onClick={handlePay}
              aria-label={submitting ? "Confirming escrow…" : `Confirm & Deposit ${money(total)}`}
            >
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">{submitting ? "Confirming escrow…" : `Confirm & Deposit ${money(total)}`}</span>
              <span className="sm:hidden">{submitting ? "Depositing…" : `Deposit ${money(total)}`}</span>
            </Button>
          )}

          <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-tertiary)] pt-1">
            <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">256-bit SSL encryption · PCI-DSS compliant Paystack escrow</span>
            <span className="sm:hidden">256-bit SSL · Paystack Escrow</span>
          </div>
        </div>

        {/* Authentic Paystack Modal */}
        {showPaystackModal && (
          <PaystackModal
            isOpen={showPaystackModal}
            onClose={() => setShowPaystackModal(false)}
            amount={total / 100}
            email={email || "guest@client.ng"}
            onSuccess={async () => {
              setShowPaystackModal(false);
              await handlePay();
            }}
          />
        )}
      </div>
    );
  }

  // ── Step: processing ──────────────────────────────────────────────────────────
  if (step === "processing") {
    return (
      <div className="role-client min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "var(--color-bg-canvas)" }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse bg-[var(--color-accent-soft)]">
            <Lock className="w-8 h-8 text-[var(--color-accent)]" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
            Processing Payment
          </h2>
          <p className="text-sm font-body" style={{ color: "var(--color-text-secondary)" }}>
            Securing {money(total)} in escrow via Paystack…
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Step: confirmed (FAANG-grade UX — Serene, Polished, High-Trust) ───────────
  return (
    <div className="role-client min-h-screen flex flex-col items-center justify-center p-4 sm:p-6" style={{ background: "var(--color-bg-canvas)" }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="text-center max-w-md w-full space-y-6">
        {/* Refined single-ring status badge */}
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-500/10">
          <Check className="w-7 h-7 stroke-[2.5]" />
        </div>

        {/* Clean, calm typography */}
        <div className="space-y-1.5">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            Booking Confirmed!
          </h2>
          <p className="text-sm font-body font-medium" style={{ color: "var(--color-text-secondary)" }}>
            <span className="font-mono font-bold text-[var(--color-text-primary)]">{money(total)}</span> secured in escrow
          </p>
          <p className="text-xs font-body text-[var(--color-text-tertiary)] max-w-sm mx-auto leading-relaxed">
            Funds remain protected until you review and approve completed deliverables.
          </p>
        </div>

        {/* Order Room & Google Meet Next Step Card */}
        <div
          className="p-5 rounded-2xl border text-left space-y-3"
          style={{
            background: "var(--color-bg-surface)",
            borderColor: "var(--color-hairline)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-start gap-3.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                background: "var(--color-bg-elevated)",
                borderColor: "var(--color-hairline)",
                color: "var(--color-text-primary)",
              }}
            >
              <VideoIcon className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-[var(--color-accent)]">
                Next step · Order Room
              </div>
              <h4 className="text-sm font-bold font-body mt-0.5" style={{ color: "var(--color-text-primary)" }}>
                Schedule Google Meet with {creator?.name || "Performer"}
              </h4>
              <p className="text-xs font-body mt-1 text-[var(--color-text-secondary)] leading-relaxed">
                Launch your orientation video call, align on script sides, and coordinate milestones directly in your Order Room.
              </p>
            </div>
          </div>

          <div
            className="p-3 rounded-xl text-xs font-body flex items-center gap-2.5 border"
            style={{
              background: "var(--color-bg-elevated)",
              borderColor: "var(--color-hairline)",
            }}
          >
            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-[var(--color-text-secondary)]">
              Milestones and creative files tracked in real time
            </span>
          </div>

          <div className="text-[11px] font-body text-[var(--color-text-tertiary)] flex items-center gap-1.5 pt-1 border-t" style={{ borderColor: "var(--color-hairline)" }}>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Payment is released only after your final sign-off</span>
          </div>
        </div>

        {/* Muted Account Surfacing Card — Only for guest checkouts */}
        {!isClient && (
          <div
            className="p-4 rounded-2xl flex items-start gap-3 text-left border"
            style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-hairline)" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-secondary)" }}
            >
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>
                We've created your Monologg account
              </div>
              <div className="text-xs font-body mt-0.5 text-[var(--color-text-tertiary)] leading-relaxed">
                Check <span className="font-semibold text-[var(--color-text-secondary)]">{email || "your inbox"}</span> for a secure sign-in link to set your password and access your Order Room to approve deliverables.
              </div>
            </div>
          </div>
        )}

        {/* Clean, unified navigation buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <Button
            className="w-full h-11 text-xs font-bold gap-2 cursor-pointer"
            onClick={() => navigate(booking?.id ? `/order/${booking.id}?role=client` : "/order/ORD-001?role=client")}
          >
            <span>Enter Order Room</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            className="w-full h-11 text-xs font-medium cursor-pointer"
            onClick={() => navigate(isClient ? "/client" : `/${handle || ""}`)}
          >
            {isClient ? "Back to Client Portal" : "Back to Storefront"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

