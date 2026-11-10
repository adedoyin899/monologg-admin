import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EASE_OUT, DURATION_MED } from "../../lib/motionTokens";
import { apiClient, type CreatedBooking } from "../../lib/api-client";
import { appStateSync } from "../../lib/state-sync";
import type { PublicRateCard } from "@monologg/types";
import { Modal } from "../components/ui/Modal";
import { PaystackModal } from "../components/ui/PaystackModal";
import {
  ChevronLeft, Lock, Shield, CreditCard, CheckCircle2,
  ArrowRight, Smartphone, Building2, AlertCircle,
  Wallet, MapPin, Video, Check, AlertTriangle, X,
  ShieldCheck
} from "lucide-react";

type PaymentMethod = "card" | "bank_transfer" | "ussd";
type CheckoutStep = "service" | "slot" | "summary" | "review" | "payment" | "processing" | "confirmed";

interface BookingNavState {
  creatorId?: string;
  creatorName?: string;
  rateCardId?: string;
}

// features.md Phase 13: fixed 1-hour candidate slots across a normal working
// window — this prototype's booking sheet doesn't offer a duration picker,
// only which hour to start. A candidate is selectable only when it's fully
// contained in one of the server's real openSlots (never a client-side guess).
const CANDIDATE_SLOT_HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 08:00..19:00
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

const CURRENCY_SYMBOLS: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£" };
function formatMinorUnits(minorUnits: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${(minorUnits / 100).toLocaleString("en-US")}`;
}

export function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();

  // features.md Phase 13: a real creatorId in nav state (from ClientDashboard's
  // Book Now buttons) routes into the live, server-authoritative slot-aware
  // flow below. With no state (or in mock mode, which never wires one up),
  // this falls back to the prototype's original static demo — unchanged.
  const bookingParams = (location.state as BookingNavState | null) ?? null;
  const isLive = apiClient.mode === "live" && !!bookingParams?.creatorId;

  const [step, setStep] = useState<CheckoutStep>(isLive ? "service" : "summary");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [cardNum, setCardNum] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [savedCards, setSavedCards] = useState(() => appStateSync.getBillingCards());
  const [selectedCardId, setSelectedCardId] = useState<string>(() => {
    const cards = appStateSync.getBillingCards();
    const def = cards.find((c) => c.isDefault);
    return def ? def.id : cards[0]?.id || "";
  });
  const [cardPayMode, setCardPayMode] = useState<"saved" | "new">(() => {
    return appStateSync.getBillingCards().length > 0 ? "saved" : "new";
  });
  const [savedCardCvv, setSavedCardCvv] = useState("");
  const [saveNewCard, setSaveNewCard] = useState(true);

  // ── Project Details for this rate card booking ───────────────────────────
  const [projectTitle, setProjectTitle] = useState("Commercial Campaign Voice-Over");
  const [projectFormat, setProjectFormat] = useState<"online" | "onsite">("online");
  const [venueLocation, setVenueLocation] = useState("");
  const [projectNotes, setProjectNotes] = useState("");

  // ── Funding Source & Review Terms ─────────────────────────────────────────
  const [fundingSource, setFundingSource] = useState<"wallet" | "card">("wallet");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [walletBalance, setWalletBalance] = useState(() => appStateSync.getBalance().available);
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState("100,000");
  const [fundingProcessing, setFundingProcessing] = useState(false);
  const [showPaystackModal, setShowPaystackModal] = useState(false);

  // ── Live booking-flow state ────────────────────────────────────────────────
  const [rateCards, setRateCards] = useState<PublicRateCard[]>([]);
  const [selectedRateCard, setSelectedRateCard] = useState<PublicRateCard | null>(null);
  const [slotDate, setSlotDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [openSlots, setOpenSlots] = useState<{ start: string; end: string }[]>([]);
  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState<CreatedBooking | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLive || !bookingParams?.creatorId) return;
    apiClient.getCreatorRateCardsPublic(bookingParams.creatorId).then((cards) => {
      setRateCards(cards);
      const preselected = bookingParams.rateCardId ? cards.find((c) => c.id === bookingParams.rateCardId) : undefined;
      if (preselected) {
        setSelectedRateCard(preselected);
        setStep("slot");
      } else if (cards.length === 1) {
        setSelectedRateCard(cards[0]);
        setStep("slot");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLive || step !== "slot" || !bookingParams?.creatorId) return;
    setLoadingSlots(true);
    setSelectedSlotStart(null);
    apiClient.getOpenSlots(bookingParams.creatorId, slotDate).then((slots) => {
      setOpenSlots(slots);
      setLoadingSlots(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, step, slotDate]);

  const slotFits = (start: string): boolean => {
    const end = addMinutes(start, SLOT_DURATION_MIN);
    return openSlots.some((o) => o.start <= start && o.end >= end);
  };

  const handleConfirmSlot = async () => {
    if (!isLive || !bookingParams?.creatorId || !selectedRateCard || !selectedSlotStart) return;
    setCreatingBooking(true);
    setBookingError(null);
    try {
      const created = await apiClient.createBooking({
        creatorId: bookingParams.creatorId,
        rateCardId: selectedRateCard.id,
        slotDate,
        slotStart: selectedSlotStart,
        slotEnd: addMinutes(selectedSlotStart, SLOT_DURATION_MIN),
      });
      setBooking(created);
      setStep("summary");
    } catch {
      // Server-authoritative: someone else may have taken this slot first
      // (409). Refresh openSlots so it disappears from the picker.
      setBookingError("That slot was just taken — please pick another time.");
      apiClient.getOpenSlots(bookingParams.creatorId, slotDate).then(setOpenSlots);
      setSelectedSlotStart(null);
    } finally {
      setCreatingBooking(false);
    }
  };

  // Live values (from the server-created booking) vs. the prototype's static
  // demo values — both feed the SAME summary/payment JSX below.
  const BASE_RATE = isLive && booking ? booking.baseAmount : 120000;
  const currency = isLive && booking ? booking.currency : "NGN";
  const ESCROW_FEE = isLive && booking ? booking.clientFeeAmount : Math.round(BASE_RATE * 0.12);
  const PROMO_DISCOUNT = promoApplied ? Math.round(BASE_RATE * 0.05) : 0;
  const TOTAL = BASE_RATE + ESCROW_FEE - PROMO_DISCOUNT;
  const talentName = isLive ? (bookingParams?.creatorName ?? "your selected talent") : appStateSync.getTalentProfile().name;
  const serviceTitle = isLive ? (selectedRateCard?.title ?? "Booking") : "Commercial Voice-Over";
  const serviceDelivery = isLive ? (selectedRateCard?.delivery ?? "") : "Same Day";
  const money = (minorUnits: number) => (isLive ? formatMinorUnits(minorUnits, currency) : `₦${minorUnits.toLocaleString()}`);

  const handleWalletPayment = () => {
    if (!agreedToTerms || walletBalance < TOTAL) return;
    setStep("processing");
    setTimeout(() => {
      appStateSync.deductBalance(TOTAL, `Rate Card Escrow: ${serviceTitle}`, `BK-${Date.now()}`);
      setWalletBalance(appStateSync.getBalance().available);
      setStep("confirmed");
    }, 1000);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep("processing");
    setPayError(null);

    try {
      if (cardPayMode === "new" && saveNewCard && cardNum.trim()) {
        const cleanNum = cardNum.replace(/\D/g, "");
        if (cleanNum.length >= 15) {
          const type = cleanNum.startsWith("4") ? "Visa" : cleanNum.startsWith("5") ? "Mastercard" : "Verve";
          appStateSync.addBillingCard({
            type,
            last4: cleanNum.slice(-4),
            expiry,
            cardholderName: cardName.trim(),
            isDefault: savedCards.length === 0,
          });
          setSavedCards(appStateSync.getBillingCards());
        }
      }

      if (booking) {
        const { providerRef } = await apiClient.payBooking(booking.id);
        const ok = await apiClient.simulateEscrowWebhook(providerRef);
        if (!ok) throw new Error("escrow confirmation failed");
      }
      setTimeout(() => setStep("confirmed"), 1200);
    } catch {
      setPayError("We couldn't confirm your payment. Please try again.");
      setStep("payment");
    }
  };

  const formatCard = (val: string) => {
    return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 4);
    if (clean.length > 2) return `${clean.slice(0, 2)}/${clean.slice(2)}`;
    return clean;
  };

  // ── Step: pick a service (live flow only, skipped when preselected/only one) ──
  if (step === "service") {
    return (
      <div className="role-client min-h-screen flex flex-col" style={{ background: "var(--color-bg-canvas)" }}>
        <div className="h-16 flex items-center gap-3 px-4 sticky top-0 z-40 glass-panel" style={{ borderBottom: "1px solid var(--color-hairline)" }}>
          <button aria-label="Go back" onClick={() => navigate(-1)} className="w-10 h-10 rounded-[var(--radius-full)] flex items-center justify-center" style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-secondary)" }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-sm font-semibold font-display" style={{ color: "var(--color-text-primary)" }}>Choose a service</div>
        </div>
        <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-3">
          {rateCards.length === 0 ? (
            <p className="text-sm font-body text-center py-10" style={{ color: "var(--color-text-tertiary)" }}>Loading services…</p>
          ) : (
            rateCards.map((card) => (
              <button
                key={card.id}
                onClick={() => { setSelectedRateCard(card); setStep("slot"); }}
                className="w-full p-4 rounded-2xl flex items-center justify-between text-left hover:opacity-90"
                style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)" }}
              >
                <div>
                  <div className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>{card.title}</div>
                  <div className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>Delivery: {card.delivery}</div>
                </div>
                <div className="font-mono tnum font-semibold" style={{ color: "var(--color-accent)" }}>{card.price}</div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // ── Step: pick a real, server-verified open slot ────────────────────────────
  if (step === "slot") {
    return (
      <div className="role-client min-h-screen flex flex-col" style={{ background: "var(--color-bg-canvas)" }}>
        <div className="h-16 flex items-center gap-3 px-4 sticky top-0 z-40 glass-panel" style={{ borderBottom: "1px solid var(--color-hairline)" }}>
          <button
            aria-label="Go back"
            onClick={() => (rateCards.length > 1 ? setStep("service") : navigate(-1))}
            className="w-10 h-10 rounded-[var(--radius-full)] flex items-center justify-center"
            style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-secondary)" }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-sm font-semibold font-display" style={{ color: "var(--color-text-primary)" }}>Pick a time</div>
        </div>
        <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
          <input
            type="date"
            aria-label="Booking date"
            value={slotDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => e.target.value && setSlotDate(e.target.value)}
            className="w-full h-12 px-4 rounded-[var(--radius-lg)] text-sm font-body mb-5"
            style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)", color: "var(--color-text-primary)" }}
          />

          {bookingError && (
            <div className="flex items-center gap-2 p-3 rounded-xl mb-4 text-sm font-body" style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}>
              <AlertCircle className="w-4 h-4 shrink-0" /> {bookingError}
            </div>
          )}

          {loadingSlots ? (
            <p className="text-sm font-body text-center py-10" style={{ color: "var(--color-text-tertiary)" }}>Checking availability…</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
              {CANDIDATE_SLOT_HOURS.map((h) => {
                const start = toTimeStr(h * 60);
                const fits = slotFits(start);
                const isSelected = selectedSlotStart === start;
                return (
                  <button
                    key={start}
                    disabled={!fits}
                    onClick={() => setSelectedSlotStart(start)}
                    className="py-2.5 rounded-xl text-sm font-mono tnum font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: isSelected ? "var(--color-accent)" : "var(--color-bg-surface)",
                      color: isSelected ? "var(--color-accent-on)" : fits ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                      border: `1px solid ${isSelected ? "var(--color-accent)" : "var(--color-hairline)"}`,
                    }}
                  >
                    {start}
                  </button>
                );
              })}
            </div>
          )}

          <Button className="w-full h-12" disabled={!selectedSlotStart || creatingBooking} onClick={handleConfirmSlot}>
            {creatingBooking ? "Booking…" : "Continue"} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="role-client min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "var(--color-bg-canvas)" }}>
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 relative"
            style={{ background: "var(--color-accent-soft)", border: "1px solid var(--color-accent)" }}
          >
            <motion.div
              className="absolute inset-0 rounded-full border-2"
              style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <Lock className="w-8 h-8" style={{ color: "var(--color-accent)" }} />
          </div>
          <h2 className="font-display text-2xl mb-2" style={{ color: "var(--color-text-primary)" }}>Processing Payment</h2>
          <p className="text-sm font-body" style={{ color: "var(--color-text-secondary)" }}>
            {isLive ? "Securing your funds in escrow…" : "Securing your funds in escrow via Paystack..."}
          </p>
        </motion.div>
      </div>
    );
  }

  if (step === "confirmed") {
    const nextSteps = [
      {
        num: "1",
        title: `Schedule intro call with ${talentName}`,
        desc: "A quick 10-min Google Meet to align on tone, brief, and expectations.",
        color: "var(--color-accent)",
        colorSoft: "var(--color-accent-soft)",
      },
      {
        num: "2",
        title: "Await your deliverable",
        desc: `${talentName} will submit your files. You'll be notified when they're ready to review.`,
        color: "var(--color-success)",
        colorSoft: "var(--color-success-bg)",
      },
      {
        num: "3",
        title: "Approve & release payment",
        desc: "Once satisfied, approve and escrow auto-releases to the performer.",
        color: "#f59e0b",
        colorSoft: "#fef3c7",
      },
    ];

    return (
      <div className="role-client min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "var(--color-bg-canvas)" }}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION_MED, ease: EASE_OUT }}
          className="w-full max-w-sm"
        >
          {/* Success icon */}
          <div className="flex justify-center mb-5">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.08 }}
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "var(--color-success-bg)", border: "1.5px solid var(--color-success)" }}
            >
              <CheckCircle2 className="w-8 h-8" style={{ color: "var(--color-success)" }} />
            </motion.div>
          </div>

          {/* Heading */}
          <div className="text-center mb-5">
            <h2 className="font-display text-2xl font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>
              Booking Confirmed!
            </h2>
            {/* Escrow pill */}
            <div
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold font-mono mt-1"
              style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)", border: "1px solid var(--color-accent)20" }}
            >
              <Lock className="w-3.5 h-3.5" />
              {money(TOTAL)} secured in escrow
            </div>
            <p className="text-xs font-body mt-2 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              Funds remain protected until you review and approve completed deliverables.
            </p>
          </div>

          {/* What happens next */}
          <div
            className="rounded-2xl overflow-hidden mb-5"
            style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)", boxShadow: "var(--shadow-card)" }}
          >
            {/* Next step call-out */}
            <div className="px-5 pt-4 pb-3 border-b" style={{ borderColor: "var(--color-hairline)" }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)" }}
                >
                  Next step · Order Room
                </span>
              </div>
              <div className="flex items-start gap-3 mt-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "var(--color-accent-soft)", border: "1px solid var(--color-accent)30" }}
                >
                  <Video className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold font-body leading-tight" style={{ color: "var(--color-text-primary)" }}>
                    Schedule Google Meet with {talentName}
                  </p>
                  <p className="text-xs font-body mt-1 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    Launch your orientation video call, align on script sides, and coordinate milestones directly in your Order Room.
                  </p>
                </div>
              </div>
            </div>

            {/* Info bullets */}
            {[
              { icon: CheckCircle2, text: "Milestones and creative files tracked in real time", iconColor: "var(--color-success)" },
              { icon: Shield, text: "Payment is released only after your final sign-off", iconColor: "var(--color-accent)" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-start gap-2.5 px-5 py-3 border-b last:border-b-0" style={{ borderColor: "var(--color-hairline)" }}>
                  <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: item.iconColor }} />
                  <span className="text-xs font-body leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{item.text}</span>
                </div>
              );
            })}
          </div>

          {/* Account notice (if new user) */}
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl mb-5"
            style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)" }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--color-bg-elevated)" }}>
              <Lock className="w-3.5 h-3.5" style={{ color: "var(--color-text-secondary)" }} />
            </div>
            <div>
              <p className="text-xs font-semibold font-body mb-0.5" style={{ color: "var(--color-text-primary)" }}>
                We've created your Monologg account
              </p>
              <p className="text-xs font-body leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                Check <span className="font-semibold" style={{ color: "var(--color-accent)" }}>ss@gmail.com</span> for a secure sign-in link to set your password and access your Order Room to approve deliverables.
              </p>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-2.5">
            <Button
              className="w-full h-12 text-sm font-semibold gap-2"
              onClick={() => navigate(isLive && booking ? `/order/${booking.id}` : "/order/1")}
            >
              Enter Order Room <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="secondary" className="w-full h-11 text-sm" onClick={() => navigate("/client")}>
              Back to Storefront
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
          onClick={() => step === "payment" ? setStep("summary") : navigate(-1)}
          className="w-10 h-10 rounded-[var(--radius-full)] flex items-center justify-center hover:opacity-80 active:scale-95 transition-all"
          style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-secondary)" }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="text-sm font-semibold font-display" style={{ color: "var(--color-text-primary)" }}>
            {step === "summary" ? "Booking Details" : step === "review" ? "Review & Agreement" : "Payment"}
          </div>
          <div className="text-xs font-body flex items-center gap-1" style={{ color: "var(--color-success)" }}>
            <Lock className="w-3 h-3 shrink-0" />
            <span className="hidden sm:inline">{isLive ? "Escrow Protected" : "Escrow Protected · Paystack Escrow"}</span>
            <span className="sm:hidden">Escrow Protected</span>
          </div>
        </div>
        {/* 3-step progress */}
        <div className="flex items-center gap-1.5" aria-hidden>
          {(["summary", "review", "payment"] as const).map(st => {
            const stepOrder: Record<CheckoutStep, number> = {
              service: 0,
              slot: 0,
              summary: 1,
              review: 2,
              payment: 3,
              processing: 3,
              confirmed: 3,
            };
            const currentOrder = stepOrder[step] ?? 1;
            const thisOrder = stepOrder[st];
            const isActive = currentOrder >= thisOrder;
            const isCurrent = step === st;
            return (
              <div
                key={st}
                className="h-1.5 rounded-[var(--radius-full)] transition-all"
                style={{
                  width: isCurrent ? 24 : 10,
                  background: isActive ? "var(--color-accent)" : "var(--color-bg-elevated)",
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex-1 px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-w-lg mx-auto w-full">

        <AnimatePresence mode="wait">

          {/* Step 1: Summary */}
          {step === "summary" && (
            <motion.div key="summary" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Talent summary card */}
              <div
                className="p-5 rounded-2xl mb-5"
                style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)", boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center font-semibold text-lg font-body" style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
                    {talentName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-body font-semibold" style={{ color: "var(--color-text-primary)" }}>{talentName}</span>
                      <Shield className="w-4 h-4" style={{ color: "var(--color-success)" }} />
                    </div>
                    <div className="text-sm font-body" style={{ color: "var(--color-text-secondary)" }}>
                      {isLive ? serviceDelivery : "Actor & Voice Artist"}
                    </div>
                  </div>
                </div>

                <div
                  className="px-4 py-3 rounded-xl mb-4"
                  style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-hairline)", borderLeft: "3px solid var(--color-accent)" }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>{serviceTitle}</div>
                      <div className="text-xs font-body mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                        {isLive && booking ? `${booking.slotDate.slice(0, 10)} · ${booking.slotStart}–${booking.slotEnd}` : `Delivery: ${serviceDelivery}`}
                      </div>
                    </div>
                    <div className="font-mono tnum text-xl font-semibold" style={{ color: "var(--color-accent)" }}>{money(BASE_RATE)}</div>
                  </div>
                </div>

                {/* Fee breakdown */}
                <div className="space-y-2.5 mb-4">
                  {[
                    { label: "Base Rate", value: money(BASE_RATE), color: "var(--color-text-primary)" },
                    { label: `Escrow Processing Fee${isLive ? "" : " (12%)"}`, value: `+${money(ESCROW_FEE)}`, color: "var(--color-text-secondary)", note: "Protects your payment" },
                    ...(promoApplied ? [{ label: "Promo (MONO5)", value: `-${money(PROMO_DISCOUNT)}`, color: "var(--color-success)" }] : []),
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm font-body">
                      <div>
                        <span style={{ color: "var(--color-text-secondary)" }}>{item.label}</span>
                        {item.note && <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{item.note}</div>}
                      </div>
                      <span className="font-mono tnum" style={{ color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                  <div className="border-t pt-3 flex justify-between items-center" style={{ borderColor: "var(--color-hairline)" }}>
                    <span className="text-sm font-semibold font-body" style={{ color: "var(--color-text-primary)" }}>Total</span>
                    <span className="font-mono tnum text-2xl font-semibold" style={{ color: "var(--color-accent)" }}>{money(TOTAL)}</span>
                  </div>
                </div>

                {/* Promo code */}
                {!promoOpen ? (
                  <button
                    className="text-sm font-body hover:underline"
                    style={{ color: "var(--color-accent)" }}
                    onClick={() => setPromoOpen(true)}
                  >
                    Have a promo code?
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter promo code"
                      value={promoCode}
                      onChange={e => setPromoCode(e.target.value.toUpperCase())}
                      className="flex-1"
                    />
                    <Button
                      variant="secondary"
                      className="h-12 px-4 text-sm"
                      onClick={() => {
                        if (promoCode === "MONO5") setPromoApplied(true);
                        setPromoOpen(false);
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                )}
              </div>

              {/* Project Details Section (for booking rate card) */}
              <div
                className="p-5 rounded-2xl mb-5 space-y-4"
                style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)", boxShadow: "var(--shadow-card)" }}
              >
                <div>
                  <h3 className="text-sm font-bold font-display uppercase tracking-wider" style={{ color: "var(--color-text-primary)" }}>
                    Project Details
                  </h3>
                  <p className="text-xs font-body mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                    Confirm the brief and format for this talent booking.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 font-body" style={{ color: "var(--color-text-secondary)" }}>
                    Project Name / Campaign Title *
                  </label>
                  <Input
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="e.g., Sahara Fintech Explainer Series"
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 font-body" style={{ color: "var(--color-text-secondary)" }}>
                    Project Format *
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setProjectFormat("online")}
                      className="p-3 rounded-xl border text-left transition-all cursor-pointer"
                      style={{
                        background: projectFormat === "online" ? "var(--color-accent-soft)" : "var(--color-bg-elevated)",
                        border: `1px solid ${projectFormat === "online" ? "var(--color-accent)" : "var(--color-hairline)"}`,
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1" style={{ color: projectFormat === "online" ? "var(--color-accent)" : "var(--color-text-primary)" }}>
                        <Video className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs font-bold font-body">Online / Remote</span>
                      </div>
                      <p className="text-[11px] font-body" style={{ color: "var(--color-text-tertiary)" }}>
                        Remote audio/video delivery
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProjectFormat("onsite")}
                      className="p-3 rounded-xl border text-left transition-all cursor-pointer"
                      style={{
                        background: projectFormat === "onsite" ? "var(--color-accent-soft)" : "var(--color-bg-elevated)",
                        border: `1px solid ${projectFormat === "onsite" ? "var(--color-accent)" : "var(--color-hairline)"}`,
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1" style={{ color: projectFormat === "onsite" ? "var(--color-accent)" : "var(--color-text-primary)" }}>
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs font-bold font-body">On-site / In-person</span>
                      </div>
                      <p className="text-[11px] font-body" style={{ color: "var(--color-text-tertiary)" }}>
                        Physical event or shoot appearance
                      </p>
                    </button>
                  </div>
                </div>

                {projectFormat === "onsite" && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 font-body" style={{ color: "var(--color-text-secondary)" }}>
                      Event Venue / Location *
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

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 font-body" style={{ color: "var(--color-text-secondary)" }}>
                    Brief Notes for Performer (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Key instructions, script attachments, or expectations for the performer..."
                    value={projectNotes}
                    onChange={(e) => setProjectNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-body border resize-none"
                    style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)", color: "var(--color-text-primary)" }}
                  />
                </div>
              </div>

              {/* Funding Source Selector */}
              <div
                className="p-5 rounded-2xl mb-5 space-y-3.5"
                style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)", boxShadow: "var(--shadow-card)" }}
              >
                <div>
                  <h3 className="text-sm font-bold font-display uppercase tracking-wider" style={{ color: "var(--color-text-primary)" }}>
                    Select Funding Source
                  </h3>
                  <p className="text-xs font-body mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                    Choose how you want to fund this escrow booking.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFundingSource("wallet")}
                    className="p-3.5 rounded-xl border text-left transition-all relative cursor-pointer"
                    style={{
                      background: fundingSource === "wallet" ? "var(--color-accent-soft)" : "var(--color-bg-elevated)",
                      border: `1px solid ${fundingSource === "wallet" ? "var(--color-accent)" : "var(--color-hairline)"}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet className="w-4 h-4" style={{ color: fundingSource === "wallet" ? "var(--color-accent)" : "var(--color-text-secondary)" }} />
                      <span className="text-xs font-bold font-body" style={{ color: fundingSource === "wallet" ? "var(--color-accent)" : "var(--color-text-primary)" }}>
                        Wallet Balance
                      </span>
                    </div>
                    <div className="text-xs font-mono font-medium" style={{ color: "var(--color-text-secondary)" }}>
                      Available: ₦{walletBalance.toLocaleString()}
                    </div>
                    {fundingSource === "wallet" && (
                      <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--color-accent)" }}>
                        <Check className="w-2.5 h-2.5" style={{ color: "var(--color-accent-on)" }} />
                      </div>
                    )}
                  </button>

                  {/* Paystack Pill Card — styled exactly like Image 4 */}
                  <button
                    type="button"
                    onClick={() => setFundingSource("card")}
                    className="px-5 py-3 rounded-full border-2 text-left transition-all flex items-center gap-3 relative cursor-pointer"
                    style={{
                      borderColor: fundingSource === "card" ? "#0052FF" : "var(--color-hairline)",
                      background: fundingSource === "card" ? "rgba(0, 82, 255, 0.05)" : "var(--color-bg-elevated)",
                      boxShadow: fundingSource === "card" ? "0 0 0 1px #0052FF" : "none",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(123, 0, 254, 0.12)",
                        color: "#7B00FE",
                      }}
                    >
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 pr-2">
                      <div className="text-sm font-bold font-body" style={{ color: "var(--color-text-primary)" }}>Paystack</div>
                      <div className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>Card, Transfer, USSD</div>
                    </div>
                    {fundingSource === "card" && (
                      <div className="ml-auto w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#0052FF" }}>
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                </div>

                {fundingSource === "wallet" && walletBalance < TOTAL && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-100 text-xs font-body space-y-2.5">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Insufficient Wallet Balance</span>
                    </div>
                    <p className="leading-relaxed">
                      You have <strong className="font-mono">₦{walletBalance.toLocaleString()}</strong> available, but this booking requires <strong className="font-mono">{money(TOTAL)}</strong>. Please fund your wallet or pay via Paystack Card.
                    </p>
                    <div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                        onClick={() => setShowFundModal(true)}
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>+ Fund Wallet with Paystack</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Button
                className="w-full h-12 text-base font-semibold"
                disabled={!projectTitle.trim() || (projectFormat === "onsite" && !venueLocation.trim())}
                onClick={() => setStep("review")}
                aria-label="Continue to Review &amp; Agreement"
              >
                <span className="hidden sm:inline">Continue to Review &amp; Agreement</span>
                <span className="sm:hidden">Continue to Review</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <button
                type="button"
                className="w-full text-sm text-center mt-3 font-body cursor-pointer hover:underline"
                style={{ color: "var(--color-text-tertiary)" }}
                onClick={() => {
                  if (isLive && selectedRateCard) {
                    setStep("slot");
                  } else {
                    navigate(-1);
                  }
                }}
              >
                Go back
              </button>
            </motion.div>
          )}

          {/* Step 2: Review & Agreement (Dedicated step before payment) */}
          {step === "review" && (
            <motion.div key="review" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-5">
                <h2 className="font-display text-2xl mb-1" style={{ color: "var(--color-text-primary)" }}>
                  Review &amp; Agreement
                </h2>
                <p className="text-sm font-body" style={{ color: "var(--color-text-secondary)" }}>
                  Please review your booking overview and agree to the protection terms before payment.
                </p>
              </div>

              {/* Booking Overview Card */}
              <div
                className="p-5 rounded-2xl mb-5 space-y-3.5"
                style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)", boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--color-hairline)" }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm font-body" style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
                      {talentName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-bold font-body" style={{ color: "var(--color-text-primary)" }}>{talentName}</div>
                      <div className="text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>{serviceTitle} · {isLive ? serviceDelivery : "Same Day Delivery"}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase font-semibold font-body" style={{ color: "var(--color-text-tertiary)" }}>Total Escrow</div>
                    <div className="font-mono tnum text-lg font-bold" style={{ color: "var(--color-accent)" }}>{money(TOTAL)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-body pt-1">
                  <div>
                    <span className="text-[var(--color-text-tertiary)] block">Project Title:</span>
                    <span className="font-semibold truncate block" style={{ color: "var(--color-text-primary)" }}>{projectTitle || "Untitled Project"}</span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-tertiary)] block">Format:</span>
                    <span className="font-semibold block" style={{ color: "var(--color-text-primary)" }}>
                      {projectFormat === "onsite" ? "On-site / In-person" : "Online / Remote"}
                    </span>
                  </div>
                  {projectFormat === "onsite" && venueLocation && (
                    <div className="col-span-2">
                      <span className="text-[var(--color-text-tertiary)] block">Venue:</span>
                      <span className="font-medium text-xs block truncate" style={{ color: "var(--color-text-secondary)" }}>{venueLocation}</span>
                    </div>
                  )}
                  <div className="col-span-2 pt-2 border-t flex items-center justify-between" style={{ borderColor: "var(--color-hairline)" }}>
                    <span className="text-[var(--color-text-tertiary)]">Funding Source:</span>
                    <span className="font-semibold inline-flex items-center gap-1.5" style={{ color: "var(--color-text-primary)" }}>
                      {fundingSource === "wallet" ? (
                        <>
                          <Wallet className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                          <span>Wallet Balance (₦{walletBalance.toLocaleString()} available)</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                          <span>Paystack Card</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Review & Agreement Card */}
              <div
                className="p-5 rounded-2xl mb-5 space-y-3.5"
                style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)", boxShadow: "var(--shadow-card)" }}
              >
                <div className="space-y-2.5 text-xs font-body leading-relaxed divide-y divide-[var(--color-hairline)]" style={{ color: "var(--color-text-secondary)" }}>
                  <div className="pt-1">
                    <strong className="font-semibold block mb-0.5" style={{ color: "var(--color-text-primary)" }}>
                      Escrow Protection &amp; Transparent Fee Structure:
                    </strong>
                    100% of your booking fee is held securely in escrow by Paystack and is only released to the performer after service completion. A transparent 12% client escrow protection fee is added at deposit, and a 7% platform fee is deducted from the performer's payout upon completion.
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
                  <div className="pt-2">
                    <strong className="font-semibold block mb-0.5" style={{ color: "var(--color-text-primary)" }}>
                      On-Site Attendance:
                    </strong>
                    You will be issued a 4-digit verification code to provide to the talent upon arrival to confirm physical attendance.
                  </div>
                </div>

                <div className="pt-3 border-t" style={{ borderColor: "var(--color-hairline)" }}>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={e => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[var(--color-accent)] focus:ring-[var(--color-accent)] cursor-pointer"
                    />
                    <span className="text-xs font-semibold font-body leading-normal" style={{ color: "var(--color-text-primary)" }}>
                      I agree to the Terms of Service, Escrow Policy, and Processing Fee Terms. (Mandatory)
                    </span>
                  </label>
                </div>
              </div>

              {fundingSource === "wallet" && walletBalance < TOTAL && (
                <div className="p-4 rounded-xl mb-5 bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-100 text-xs font-body space-y-2.5">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Insufficient Wallet Balance</span>
                  </div>
                  <p className="leading-relaxed">
                    You have <strong className="font-mono">₦{walletBalance.toLocaleString()}</strong> available, but this booking requires <strong className="font-mono">{money(TOTAL)}</strong>. Please fund your wallet or switch to card payment.
                  </p>
                  <div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                      onClick={() => setShowFundModal(true)}
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>+ Fund Wallet with Paystack</span>
                    </Button>
                  </div>
                </div>
              )}

              <Button
                className="w-full h-12 text-base font-semibold"
                disabled={!agreedToTerms}
                onClick={() => setStep("payment")}
              >
                <span>Proceed to Payment</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <button
                type="button"
                className="w-full text-sm text-center mt-3 font-body cursor-pointer hover:underline"
                style={{ color: "var(--color-text-tertiary)" }}
                onClick={() => setStep("summary")}
              >
                ← Back to Booking Details
              </button>
            </motion.div>
          )}

          {/* Step 2: Payment */}
          {step === "payment" && (
            <motion.div key="payment" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              <h2 className="font-display text-2xl mb-5" style={{ color: "var(--color-text-primary)" }}>
                Pay <span className="font-mono tnum">{money(TOTAL)}</span>
              </h2>

              {payError && (
                <div className="flex items-center gap-2 p-3 rounded-xl mb-4 text-sm font-body" style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}>
                  <AlertCircle className="w-4 h-4 shrink-0" /> {payError}
                </div>
              )}

              {/* Paystack Primary Option (styled like Image 4) */}
              <div className="p-4 rounded-2xl mb-5 border space-y-3" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-hairline)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-semibold font-body tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>
                    Recommended Payment Gateway
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 font-semibold">
                    Instant Escrow
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* Paystack Pill Card — styled exactly like Image 4 */}
                  <div
                    className="px-5 py-3 rounded-full border-2 text-left flex items-center gap-3 relative"
                    style={{
                      borderColor: "#0052FF",
                      background: "rgba(0, 82, 255, 0.05)",
                      boxShadow: "0 0 0 1px #0052FF",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(123, 0, 254, 0.12)",
                        color: "#7B00FE",
                      }}
                    >
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 pr-2">
                      <div className="text-sm font-bold font-body" style={{ color: "var(--color-text-primary)" }}>Paystack</div>
                      <div className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>Card, Transfer, USSD</div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    className="h-11 px-5 font-bold shadow-md cursor-pointer whitespace-nowrap"
                    style={{ background: "#0BA4DB", color: "#FFFFFF" }}
                    onClick={() => setShowPaystackModal(true)}
                    aria-label={`Pay ${money(TOTAL)} with Paystack`}
                  >
                    <span className="hidden sm:inline">Pay {money(TOTAL)} with Paystack</span>
                    <span className="sm:hidden">Pay {money(TOTAL)}</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] pt-1" style={{ color: "var(--color-text-tertiary)" }}>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="hidden sm:inline">Click above to open Paystack's official interface. Certified PCI-DSS Level 1 · 256-Bit SSL.</span>
                  <span className="sm:hidden">Official Paystack interface · 256-Bit SSL Escrow.</span>
                </div>
              </div>

              {/* Wallet payment alternative if sufficient funds */}
              {walletBalance >= TOTAL && (
                <div className="p-3.5 rounded-xl mb-5 border flex items-center justify-between gap-3" style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-hairline)" }}>
                  <div className="flex items-center gap-2.5">
                    <Wallet className="w-4 h-4 text-[var(--color-accent)]" />
                    <span className="text-xs font-medium font-body" style={{ color: "var(--color-text-primary)" }}>
                      Or pay from Wallet balance (₦{walletBalance.toLocaleString()} available)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 text-xs font-semibold whitespace-nowrap"
                    onClick={handleWalletPayment}
                  >
                    Pay from Wallet
                  </Button>
                </div>
              )}

              {/* Payment method tabs for custom manual details */}
              <div
                className="flex p-1 rounded-xl mb-5"
                style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-hairline)" }}
              >
                {[
                  { id: "card" as PaymentMethod, label: "Card", icon: CreditCard },
                  { id: "bank_transfer" as PaymentMethod, label: "Bank Transfer", icon: Building2 },
                  { id: "ussd" as PaymentMethod, label: "USSD", icon: Smartphone },
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium font-body transition-all"
                    style={{
                      background: paymentMethod === method.id ? "var(--color-accent)" : "transparent",
                      /* dark text on gold passes; secondary text on transparent passes in both modes */
                      color: paymentMethod === method.id ? "var(--color-accent-on)" : "var(--color-text-secondary)",
                    }}
                  >
                    <method.icon className="w-3.5 h-3.5" />
                    {method.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {paymentMethod === "card" && (
                  <motion.form
                    key="card"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handlePayment}
                    className="space-y-4"
                  >
                    {/* Toggle between Saved Cards and New Card if saved cards exist */}
                    {savedCards.length > 0 && (
                      <div className="flex p-1 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] mb-4">
                        <button
                          type="button"
                          onClick={() => setCardPayMode("saved")}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold font-body transition-all"
                          style={{
                            background: cardPayMode === "saved" ? "var(--color-accent)" : "transparent",
                            color: cardPayMode === "saved" ? "var(--color-accent-on)" : "var(--color-text-secondary)",
                          }}
                        >
                          Debit from Saved Card ({savedCards.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setCardPayMode("new")}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold font-body transition-all"
                          style={{
                            background: cardPayMode === "new" ? "var(--color-accent)" : "transparent",
                            color: cardPayMode === "new" ? "var(--color-accent-on)" : "var(--color-text-secondary)",
                          }}
                        >
                          + New Card
                        </button>
                      </div>
                    )}

                    {/* MODE 1: Debit from Saved Card */}
                    {cardPayMode === "saved" && savedCards.length > 0 ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-xs font-medium uppercase tracking-wider font-body" style={{ color: "var(--color-text-secondary)" }}>
                            Select Billing Card
                          </label>
                          <div className="space-y-2">
                            {savedCards.map((card) => {
                              const isChosen = (selectedCardId || savedCards[0]?.id) === card.id;
                              return (
                                <div
                                  key={card.id}
                                  onClick={() => setSelectedCardId(card.id)}
                                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                    isChosen
                                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                                      : "border-[var(--color-hairline)] bg-[var(--color-bg-surface)] hover:border-[var(--color-accent)]"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--color-bg-elevated)] border border-[var(--color-hairline)]">
                                      <CreditCard className="w-4 h-4 text-[var(--color-accent)]" />
                                    </div>
                                    <div>
                                      <div className="text-sm font-semibold font-body flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
                                        <span>{card.type} ···· {card.last4}</span>
                                        {card.isDefault && (
                                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
                                            DEFAULT
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs font-body text-[var(--color-text-tertiary)]">
                                        Expires {card.expiry} {card.cardholderName && `· ${card.cardholderName}`}
                                      </div>
                                    </div>
                                  </div>
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    isChosen ? "border-[var(--color-accent)] bg-[var(--color-accent)]" : "border-zinc-400"
                                  }`}>
                                    {isChosen && <div className="w-2 h-2 rounded-full bg-white" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium uppercase tracking-wider mb-2 font-body" style={{ color: "var(--color-text-secondary)" }}>
                            Enter Card CVV Security Code
                          </label>
                          <div className="relative max-w-[140px]">
                            <Input
                              type="password"
                              placeholder="•••"
                              maxLength={4}
                              value={savedCardCvv}
                              onChange={(e) => setSavedCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                              className="font-mono text-center tracking-widest text-base font-bold"
                              required
                            />
                          </div>
                          <p className="text-[11px] font-body text-[var(--color-text-tertiary)] mt-1.5">
                            3-digit security code on the back of your card for authorized debit
                          </p>
                        </div>

                        <Button
                          type="submit"
                          className="w-full h-12 gap-2 text-sm font-bold shadow-md"
                          disabled={savedCardCvv.length < 3}
                        >
                          <Lock className="w-4 h-4" />
                          Debit {money(TOTAL)} from {savedCards.find((c) => c.id === selectedCardId)?.type || "Card"} ···· {savedCards.find((c) => c.id === selectedCardId)?.last4 || "4242"}
                        </Button>
                      </div>
                    ) : (
                      /* MODE 2: Enter New Card Details */
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium uppercase tracking-wider mb-2 font-body" style={{ color: "var(--color-text-secondary)" }}>Card Number</label>
                          <div className="relative">
                            <Input
                              placeholder="0000 0000 0000 0000"
                              value={cardNum}
                              onChange={e => setCardNum(formatCard(e.target.value))}
                              className="pr-10 font-mono"
                              required
                            />
                            <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-text-tertiary)" }} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium uppercase tracking-wider mb-2 font-body" style={{ color: "var(--color-text-secondary)" }}>Cardholder Name</label>
                          <Input
                            placeholder="Name on card"
                            value={cardName}
                            onChange={e => setCardName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium uppercase tracking-wider mb-2 font-body" style={{ color: "var(--color-text-secondary)" }}>Expiry</label>
                            <Input
                              placeholder="MM/YY"
                              value={expiry}
                              onChange={e => setExpiry(formatExpiry(e.target.value))}
                              className="font-mono"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium uppercase tracking-wider mb-2 font-body" style={{ color: "var(--color-text-secondary)" }}>CVV</label>
                            <Input
                              placeholder="•••"
                              value={cvv}
                              onChange={e => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                              type="password"
                              className="font-mono"
                              required
                            />
                          </div>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={saveNewCard}
                            onChange={(e) => setSaveNewCard(e.target.checked)}
                            className="w-4 h-4 rounded text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                          />
                          <span className="text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>
                            Save this card to Billing and Payments for future project debits
                          </span>
                        </label>

                        <Button
                          type="submit"
                          className="w-full h-12 gap-2 text-sm font-bold shadow-md"
                          disabled={!cardNum || !cardName || !expiry || !cvv}
                        >
                          <Lock className="w-4 h-4" />
                          Debit &amp; Deposit {money(TOTAL)}
                        </Button>
                      </div>
                    )}
                  </motion.form>
                )}

                {paymentMethod === "bank_transfer" && (
                  <motion.div
                    key="bank"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="p-5 rounded-2xl" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)" }}>
                      <div className="text-sm font-semibold font-body mb-4" style={{ color: "var(--color-text-primary)" }}>Transfer to this account:</div>
                      {[
                        { label: "Bank", value: "Access Bank", mono: false },
                        { label: "Account Name", value: "Monologg Escrow Ltd", mono: false },
                        { label: "Account Number", value: "0123456789", mono: true },
                        { label: "Amount", value: money(TOTAL), mono: true },
                        { label: "Reference", value: "ORD-" + Math.floor(Math.random() * 9000 + 1000), mono: true },
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between py-2.5 text-sm font-body" style={{ borderBottom: i < 4 ? "1px solid var(--color-hairline)" : undefined }}>
                          <span style={{ color: "var(--color-text-tertiary)" }}>{item.label}</span>
                          <span className={`font-semibold ${item.mono ? "font-mono tnum" : ""}`} style={{ color: "var(--color-text-primary)" }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs font-body text-center" style={{ color: "var(--color-text-tertiary)" }}>
                      Include the reference in your transfer narration. Escrow will be activated within 2 business hours.
                    </p>
                    <Button className="w-full h-12" onClick={() => (isLive ? handlePayment({ preventDefault() {} } as React.FormEvent) : setStep("confirmed"))}>
                      I've Made the Transfer
                    </Button>
                  </motion.div>
                )}

                {paymentMethod === "ussd" && (
                  <motion.div
                    key="ussd"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-center space-y-4"
                  >
                    <div
                      className="p-8 rounded-2xl"
                      style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)" }}
                    >
                      <Smartphone className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--color-accent)" }} />
                      <p className="text-sm font-body mb-2" style={{ color: "var(--color-text-secondary)" }}>Dial this code on your phone:</p>
                      <div className="font-mono tnum text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>*901*2*{isLive ? Math.round(TOTAL / 100) : 120000}#</div>
                      <p className="text-xs font-body mt-3" style={{ color: "var(--color-text-tertiary)" }}>Works on all Nigerian networks · GTBank USSD</p>
                    </div>
                    <Button className="w-full h-12" onClick={() => (isLive ? handlePayment({ preventDefault() {} } as React.FormEvent) : setStep("confirmed"))}>
                      Payment Confirmed
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-center gap-2 mt-5">
                <Lock className="w-3.5 h-3.5" style={{ color: "var(--color-success)" }} />
                <p className="text-xs font-body" style={{ color: "var(--color-text-tertiary)" }}>
                  {isLive ? "SSL encrypted · PCI DSS compliant" : "Powered by Paystack · SSL encrypted · PCI DSS compliant"}
                </p>
              </div>

              <button
                type="button"
                className="w-full text-sm text-center mt-4 font-body cursor-pointer hover:underline"
                style={{ color: "var(--color-text-tertiary)" }}
                onClick={() => setStep("review")}
              >
                ← Back to Review &amp; Agreement
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Quick Fund Wallet Modal */}
      {showFundModal && (
        <Modal onClose={() => setShowFundModal(false)} align="center" strength="strong">
          <div
            onClick={e => e.stopPropagation()}
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
              Top up your Monologg wallet balance instantly with Paystack to reserve escrow funds for this booking.
            </p>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 font-body text-zinc-600 dark:text-zinc-400">
                Deposit Amount (₦)
              </label>
              <Input
                value={fundAmount}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setFundAmount(raw ? Number(raw).toLocaleString() : "");
                }}
                className="font-mono text-base font-bold"
                placeholder="e.g. 100,000"
              />
            </div>
            <div className="flex gap-2">
              {[50000, 100000, 200000].map(amt => (
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
              className="w-full h-11 text-xs font-bold gap-2"
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

      {showPaystackModal && (
        <PaystackModal
          isOpen={showPaystackModal}
          onClose={() => setShowPaystackModal(false)}
          amount={TOTAL}
          email="client@filmcraft.ng"
          onSuccess={async () => {
            setShowPaystackModal(false);
            if (isLive && booking) {
              setStep("processing");
              try {
                const { providerRef } = await apiClient.payBooking(booking.id);
                const ok = await apiClient.simulateEscrowWebhook(providerRef);
                if (!ok) throw new Error("escrow confirmation failed");
                setStep("confirmed");
              } catch {
                setPayError("We couldn't confirm your payment. Please try again.");
                setStep("payment");
              }
            } else {
              setStep("confirmed");
            }
          }}
        />
      )}
    </div>
  );
}
