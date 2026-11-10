import { PROJECTS, SERVICES, TRANSACTIONS, SUPPORT_TICKETS, CLIENT_PROJECTS } from "../mocks";
import type { Project, ServiceRateCard, Transaction, SupportTicket, Applicant, ClientProject } from "@monologg/types";
import { trackEvent, identifyAnalyticsUser } from "./analytics";

export interface BillingCard {
  id: string;
  type: "Mastercard" | "Visa" | "Verve";
  last4: string;
  expiry: string;
  cardholderName?: string;
  isDefault: boolean;
}

export interface TalentProfileState {
  name: string;
  email: string;
  gender?: string;
  dob?: string;
  craft?: string;
  performanceSummary?: string;
  craftTags?: string[];
  stageTitle?: string;
  bio: string;
  location: string;
  niche: string;
  verified: boolean;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  coverPreset?: string;
  isAvailable?: boolean;
  tags?: string[];
  socialLinks?: {
    instagram?: string;
    youtube?: string;
    twitter?: string;
    tiktok?: string;
    linkedin?: string;
    spotify?: string;
    website?: string;
  };
  hasReel?: boolean;
  performanceReelUrl?: string | null;
  performanceReelTitle?: string | null;
}

export interface ClientProfileState {
  name: string;
  email: string;
  orgName: string;
  orgType: string;
  location: string;
  bio: string;
  avatarUrl?: string | null;
  website?: string;
  targetCategories?: string[];
  hiringFrequency?: string;
}

export interface BankDetailsState {
  bankName: string;
  accountNumber: string;
  accountName: string;
  phoneNumber?: string;
}

export const CHECKIN_OFFSETS = [
  { id: "booked", label: "Booked", daysBefore: null },
  { id: "7_days", label: "7 days", daysBefore: 7 },
  { id: "2_days", label: "2 days", daysBefore: 2 },
] as const;

export interface AvailabilityCheckin {
  id: string;
  bookingId: string;
  eventName: string;
  eventDate: string;
  location: string;
  clientName: string;
  baseRate: number;
  performerReceives: number;
  stepIndex: number;
  totalSteps: number;
  stepLabel: "Booked" | "7 days" | "2 days";
  dueDate: string;
  status: "done" | "due" | "missed";
  confirmedAt?: string;
  nextCheckinDate?: string;
  isOverdue?: boolean;
}

export interface PayoutAccountChangeRequest {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  phoneNumber?: string;
  status: "under_review" | "approved" | "rejected";
  requestedAt: string;
  rejectionReason?: string;
}

export interface BalanceState {
  available: number;
  pending: number;
  withdrawnTotal: number;
}

export interface LoggedInUserSession {
  id: string;
  email: string;
  name: string;
  userType: "TALENT" | "CLIENT";
  authProvider?: string;
  isNewUser?: boolean;
  avatarUrl?: string | null;
}

export interface CalendarSyncState {
  connected: boolean;
  email?: string;
  provider?: "google";
  lastSyncedAt?: string;
}

export interface PerformerAgreementState {
  accepted: boolean;
  acceptedAt?: string;
  version: string;
}

const STORAGE_KEYS = {
  TALENT_PROFILE: "monologg_talent_profile",
  CLIENT_PROFILE: "monologg_client_profile",
  BANK_DETAILS: "monologg_bank_details",
  BALANCE: "monologg_balance",
  SERVICES: "monologg_services",
  PROJECTS: "monologg_projects",
  CLIENT_PROJECTS: "monologg_client_projects",
  BILLING_CARDS: "monologg_billing_cards",
  TRANSACTIONS: "monologg_transactions",
  SUPPORT_TICKETS: "monologg_support_tickets",
  APPLICANTS: "monologg_applicants",
  USER_SESSION: "monologg_user_session",
  CALENDAR_SYNC: "monologg_calendar_sync",
  PERFORMER_AGREEMENT: "monologg_performer_agreement",
  AVAILABILITY_CHECKINS: "monologg_availability_checkins",
  PAYOUT_CHANGE_REQUEST: "monologg_payout_change_request",
  CANCELLED_BOOKINGS: "monologg_cancelled_bookings",
  ORDER_MESSAGES_PREFIX: "monologg_order_messages_",
};

const DEFAULT_BILLING_CARDS: BillingCard[] = [
  { id: "card-1", type: "Mastercard", last4: "4242", expiry: "08/28", cardholderName: "FilmCraft Studios", isDefault: true },
  { id: "card-2", type: "Visa", last4: "8899", expiry: "11/27", cardholderName: "Sarah Jenkins", isDefault: false },
];

const DEFAULT_TALENT_PROFILE: TalentProfileState = {
  name: "Emeka Johnson",
  email: "emeka@example.com",
  gender: "Female",
  dob: "2000-05-15",
  craft: "actors",
  performanceSummary: "Dynamic and expressive screen actor with commanding emotional range, natural comedic timing, and resonant vocal presence. Well-suited for dramatic feature films, commercial voice-overs, and stage productions.",
  craftTags: ["Warm Texture", "Conversational", "Expressive", "High Energy"],
  stageTitle: "Actor & Voice Artist",
  bio: "Specializing in intense dramatic monologues, voice-overs, and Nollywood screen roles. 10+ years stage and screen experience in Lagos.",
  location: "Lagos, Nigeria",
  niche: "ACTOR",
  verified: true,
  avatarUrl: null,
  coverUrl: null,
  coverPreset: "crimson-studio",
  isAvailable: true,
  tags: ["Dramatic", "Voice-Over", "Commercial", "Nollywood", "Authoritative"],
  socialLinks: {
    instagram: "emekajohnson",
    youtube: "emekaofficial",
    twitter: "emekaj",
    tiktok: "emekaacts",
    spotify: "",
    linkedin: "emeka-johnson",
  },
  hasReel: true,
  performanceReelUrl: null,
  performanceReelTitle: "Dramatic Monologue Reel (2026)",
};

const DEFAULT_CLIENT_PROFILE: ClientProfileState = {
  name: "Sarah Jenkins",
  email: "sarah@filmcraft.com",
  orgName: "FilmCraft Studios",
  orgType: "Production Company",
  location: "Lagos, Nigeria",
  bio: "Independent film production studio specializing in feature films and commercial casting.",
  avatarUrl: null,
  website: "https://filmcraft.com",
  targetCategories: ["actors"],
  hiringFrequency: "Monthly",
};

const DEFAULT_BANK_DETAILS: BankDetailsState = {
  bankName: "GTBank",
  accountNumber: "0123456789",
  accountName: "EMEKA JOHNSON",
};

const DEFAULT_BALANCE: BalanceState = {
  available: 450000,
  pending: 120000,
  withdrawnTotal: 0,
};

const DEFAULT_APPLICANTS: Record<string, Applicant[]> = {
  "proj-1": [
    {
      applicationId: "app-1",
      status: "APPLIED",
      pitch: "I'd love to bring my stage background to this lead role!",
      appliedAt: "2 hours ago",
      creator: {
        id: "mock-creator",
        name: "Emeka Johnson",
        role: "Actor",
        location: "Lagos, Nigeria",
        avatar: "EJ",
        verified: true,
        tags: ["Dramatic", "Voice-Over"],
        price: "₦120,000",
      },
    },
  ],
};

type Listener = () => void;

class StateSyncBus {
  private listeners: Set<Listener> = new Set();
  private talentProfile: TalentProfileState;
  private clientProfile: ClientProfileState;
  private bankDetails: BankDetailsState;
  private balance: BalanceState;
  private services: ServiceRateCard[];
  private projects: Project[];
  private clientProjects: ClientProject[];
  private billingCards: BillingCard[];
  private transactions: Transaction[];
  private supportTickets: SupportTicket[];
  private applicants: Record<string, Applicant[]>;

  constructor() {
    this.talentProfile = this.load(STORAGE_KEYS.TALENT_PROFILE, DEFAULT_TALENT_PROFILE);
    this.clientProfile = this.load(STORAGE_KEYS.CLIENT_PROFILE, DEFAULT_CLIENT_PROFILE);
    this.bankDetails = this.load(STORAGE_KEYS.BANK_DETAILS, DEFAULT_BANK_DETAILS);
    this.balance = this.load(STORAGE_KEYS.BALANCE, DEFAULT_BALANCE);
    this.services = this.load(STORAGE_KEYS.SERVICES, SERVICES);
    this.projects = this.load(STORAGE_KEYS.PROJECTS, PROJECTS);
    this.clientProjects = this.load(STORAGE_KEYS.CLIENT_PROJECTS, CLIENT_PROJECTS);
    this.billingCards = this.load(STORAGE_KEYS.BILLING_CARDS, DEFAULT_BILLING_CARDS);
    const savedTxns = this.load(STORAGE_KEYS.TRANSACTIONS, TRANSACTIONS);
    const existingTxIds = new Set(savedTxns.map((t) => t.id));
    const missingTxns = TRANSACTIONS.filter((t) => !existingTxIds.has(t.id));
    this.transactions = missingTxns.length > 0 ? [...savedTxns, ...missingTxns] : savedTxns;
    this.supportTickets = this.load(STORAGE_KEYS.SUPPORT_TICKETS, SUPPORT_TICKETS);
    this.applicants = this.load(STORAGE_KEYS.APPLICANTS, DEFAULT_APPLICANTS);

    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (Object.values(STORAGE_KEYS).includes(e.key ?? "")) {
          this.reloadFromStorage();
          this.notify();
        }
      });
    }
  }

  private load<T>(key: string, defaultValue: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaultValue;
      return JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  }

  private save(key: string, data: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {}
  }

  private reloadFromStorage() {
    this.talentProfile = this.load(STORAGE_KEYS.TALENT_PROFILE, DEFAULT_TALENT_PROFILE);
    this.clientProfile = this.load(STORAGE_KEYS.CLIENT_PROFILE, DEFAULT_CLIENT_PROFILE);
    this.bankDetails = this.load(STORAGE_KEYS.BANK_DETAILS, DEFAULT_BANK_DETAILS);
    this.balance = this.load(STORAGE_KEYS.BALANCE, DEFAULT_BALANCE);
    this.services = this.load(STORAGE_KEYS.SERVICES, SERVICES);
    this.projects = this.load(STORAGE_KEYS.PROJECTS, PROJECTS);
    this.clientProjects = this.load(STORAGE_KEYS.CLIENT_PROJECTS, CLIENT_PROJECTS);
    this.billingCards = this.load(STORAGE_KEYS.BILLING_CARDS, DEFAULT_BILLING_CARDS);
    const reloadedTxns = this.load(STORAGE_KEYS.TRANSACTIONS, TRANSACTIONS);
    const reloadedIds = new Set(reloadedTxns.map((t) => t.id));
    const missingReloaded = TRANSACTIONS.filter((t) => !reloadedIds.has(t.id));
    this.transactions = missingReloaded.length > 0 ? [...reloadedTxns, ...missingReloaded] : reloadedTxns;
    this.supportTickets = this.load(STORAGE_KEYS.SUPPORT_TICKETS, SUPPORT_TICKETS);
    this.applicants = this.load(STORAGE_KEYS.APPLICANTS, DEFAULT_APPLICANTS);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((l) => l());
  }

  // Talent Profile
  getTalentProfile(): TalentProfileState {
    return { ...this.talentProfile };
  }

  updateTalentProfile(updates: Partial<TalentProfileState>) {
    this.talentProfile = { ...this.talentProfile, ...updates };
    this.save(STORAGE_KEYS.TALENT_PROFILE, this.talentProfile);
    this.notify();
  }

  // Client Profile
  getClientProfile(): ClientProfileState {
    return { ...this.clientProfile };
  }

  updateClientProfile(updates: Partial<ClientProfileState>) {
    this.clientProfile = { ...this.clientProfile, ...updates };
    this.save(STORAGE_KEYS.CLIENT_PROFILE, this.clientProfile);
    this.notify();
  }

  // Bank Details
  getBankDetails(): BankDetailsState {
    return { ...this.bankDetails };
  }

  updateBankDetails(updates: Partial<BankDetailsState>) {
    this.bankDetails = { ...this.bankDetails, ...updates };
    this.save(STORAGE_KEYS.BANK_DETAILS, this.bankDetails);
    this.notify();
  }

  // Financial Balance & Withdrawal
  getBalance(): BalanceState {
    return { ...this.balance };
  }

  withdrawFunds(amountNaira: number): boolean {
    if (amountNaira <= 0 || amountNaira > this.balance.available) return false;
    this.balance.available -= amountNaira;
    this.balance.withdrawnTotal += amountNaira;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      bookingId: `bk-payout-${Date.now()}`,
      direction: "payout",
      state: "RELEASED",
      currency: "NGN",
      baseAmount: amountNaira * 100,
      baseAmountFormatted: `₦${amountNaira.toLocaleString()}`,
      feeAmount: 0,
      feeAmountFormatted: "₦0",
      totalAmount: amountNaira * 100,
      totalAmountFormatted: `₦${amountNaira.toLocaleString()}`,
      providerRef: `bank-${this.bankDetails.bankName}`,
      createdAt: new Date().toISOString(),
    };

    this.transactions = [newTx, ...this.transactions];
    this.save(STORAGE_KEYS.BALANCE, this.balance);
    this.save(STORAGE_KEYS.TRANSACTIONS, this.transactions);
    trackEvent("withdrawal_completed", { amountKobo: amountNaira * 100, portal: "talent", bankName: this.bankDetails.bankName }, "payout");
    this.notify();
    return true;
  }

  fundWallet(amountNaira: number): boolean {
    if (amountNaira <= 0) return false;
    this.balance.available += amountNaira;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      bookingId: `bk-fund-${Date.now()}`,
      direction: "payment",
      state: "RELEASED",
      currency: "NGN",
      baseAmount: amountNaira * 100,
      baseAmountFormatted: `₦${amountNaira.toLocaleString()}`,
      feeAmount: 0,
      feeAmountFormatted: "₦0",
      totalAmount: amountNaira * 100,
      totalAmountFormatted: `₦${amountNaira.toLocaleString()}`,
      providerRef: "paystack-card",
      createdAt: new Date().toISOString(),
    };

    this.transactions = [newTx, ...this.transactions];
    this.save(STORAGE_KEYS.BALANCE, this.balance);
    this.save(STORAGE_KEYS.TRANSACTIONS, this.transactions);
    trackEvent("wallet_funded", { amountKobo: amountNaira * 100 }, "escrow_payment");
    this.notify();
    return true;
  }

  deductBalance(amountNaira: number, description?: string, ref?: string): boolean {
    if (amountNaira <= 0 || amountNaira > this.balance.available) return false;
    this.balance.available -= amountNaira;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      bookingId: ref || `bk-escrow-${Date.now()}`,
      direction: "payment",
      state: "RELEASED",
      currency: "NGN",
      baseAmount: amountNaira * 100,
      baseAmountFormatted: `₦${amountNaira.toLocaleString()}`,
      feeAmount: 0,
      feeAmountFormatted: "₦0",
      totalAmount: amountNaira * 100,
      totalAmountFormatted: `₦${amountNaira.toLocaleString()}`,
      providerRef: description ? `Wallet Escrow: ${description}` : "Wallet Escrow",
      createdAt: new Date().toISOString(),
    };

    this.transactions = [newTx, ...this.transactions];
    this.save(STORAGE_KEYS.BALANCE, this.balance);
    this.save(STORAGE_KEYS.TRANSACTIONS, this.transactions);
    trackEvent("escrow_payment_completed", { amountKobo: amountNaira * 100, description: description ?? "wallet_escrow", bookingRef: ref }, "escrow_payment");
    this.notify();
    return true;
  }

  refundOrder(bookingId: string, amountNaira: number, reason?: string): boolean {
    if (amountNaira <= 0) return false;
    this.balance.available += amountNaira;

    const newTx: Transaction = {
      id: `tx-refund-${Date.now()}`,
      bookingId,
      direction: "payment",
      state: "REFUNDED",
      currency: "NGN",
      baseAmount: amountNaira * 100,
      baseAmountFormatted: `₦${amountNaira.toLocaleString()}`,
      feeAmount: 0,
      feeAmountFormatted: "₦0",
      totalAmount: amountNaira * 100,
      totalAmountFormatted: `₦${amountNaira.toLocaleString()}`,
      providerRef: "Paystack Escrow Auto-Refund",
      createdAt: new Date().toISOString(),
    };

    this.transactions = [newTx, ...this.transactions];
    this.save(STORAGE_KEYS.BALANCE, this.balance);
    this.save(STORAGE_KEYS.TRANSACTIONS, this.transactions);
    this.notify();
    return true;
  }

  // Client Billing Cards (Saved Payment Methods)
  getBillingCards(): BillingCard[] {
    return [...this.billingCards];
  }

  addBillingCard(card: Omit<BillingCard, "id">): BillingCard {
    const newCard: BillingCard = {
      id: `card-${Date.now()}`,
      ...card,
    };
    if (newCard.isDefault) {
      this.billingCards = this.billingCards.map((c) => ({ ...c, isDefault: false }));
    }
    this.billingCards = [...this.billingCards, newCard];
    this.save(STORAGE_KEYS.BILLING_CARDS, this.billingCards);
    this.notify();
    return newCard;
  }

  setDefaultBillingCard(id: string): void {
    this.billingCards = this.billingCards.map((c) => ({ ...c, isDefault: c.id === id }));
    this.save(STORAGE_KEYS.BILLING_CARDS, this.billingCards);
    this.notify();
  }

  deleteBillingCard(id: string): void {
    const wasDefault = this.billingCards.find((c) => c.id === id)?.isDefault;
    this.billingCards = this.billingCards.filter((c) => c.id !== id);
    if (wasDefault && this.billingCards.length > 0) {
      this.billingCards[0]!.isDefault = true;
    }
    this.save(STORAGE_KEYS.BILLING_CARDS, this.billingCards);
    this.notify();
  }

  // Client Projects Lifecycle & Live-to-Draft Safeguard
  getClientProjects(): ClientProject[] {
    return [...this.clientProjects];
  }

  getClientProject(id: string): ClientProject | undefined {
    return this.clientProjects.find((p) => p.id === id);
  }

  saveClientDraft(draft: Partial<ClientProject> & { name: string; id?: string }): ClientProject {
    const existingIndex = draft.id ? this.clientProjects.findIndex((p) => p.id === draft.id) : -1;
    if (existingIndex >= 0) {
      const updated: ClientProject = {
        ...this.clientProjects[existingIndex]!,
        ...draft,
        status: "draft",
      };
      this.clientProjects[existingIndex] = updated;
      this.save(STORAGE_KEYS.CLIENT_PROJECTS, this.clientProjects);
      trackEvent("project_brief_draft_saved", { projectId: updated.id, draftStep: updated.draftStep ?? 1, isUpdate: true }, "booking");
      this.notify();
      return updated;
    }
    const newProject: ClientProject = {
      id: draft.id || `P-${String(this.clientProjects.length + 1).padStart(3, "0")}`,
      niche: draft.niche || "Voice-Over",
      budget: draft.budget || "₦150,000",
      status: "draft",
      applicants: 0,
      applicantCap: draft.applicantCap ?? null,
      applicationsOpen: false,
      posted: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      ...draft,
    };
    this.clientProjects = [newProject, ...this.clientProjects];
    this.save(STORAGE_KEYS.CLIENT_PROJECTS, this.clientProjects);
    trackEvent("project_brief_draft_saved", { projectId: newProject.id, draftStep: newProject.draftStep ?? 1, isUpdate: false }, "booking");
    this.notify();
    return newProject;
  }

  updateClientProject(id: string, updates: Partial<ClientProject>): ClientProject | null {
    const idx = this.clientProjects.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.clientProjects[idx] = { ...this.clientProjects[idx]!, ...updates };
    this.save(STORAGE_KEYS.CLIENT_PROJECTS, this.clientProjects);
    this.notify();
    return this.clientProjects[idx]!;
  }

  moveProjectsToDraft(projectIds?: string[]): ClientProject[] {
    const targetSet = projectIds && projectIds.length > 0 ? new Set(projectIds) : null;
    this.clientProjects = this.clientProjects.map((p) => {
      if (!targetSet || targetSet.has(p.id)) {
        if (p.status === "active" || p.status === "in_review" || p.status === "in_progress") {
          return { ...p, status: "draft" as const, applicationsOpen: false };
        }
      }
      return p;
    });
    this.save(STORAGE_KEYS.CLIENT_PROJECTS, this.clientProjects);
    this.notify();
    return [...this.clientProjects];
  }

  resetClientProjects(): ClientProject[] {
    this.clientProjects = [...CLIENT_PROJECTS];
    this.save(STORAGE_KEYS.CLIENT_PROJECTS, this.clientProjects);
    this.notify();
    return [...this.clientProjects];
  }

  // Client Funds Withdrawal with 24hr settlement guarantee
  withdrawClientFunds(amountNaira: number, bankDetails: { bankName: string; accountNumber: string; accountName: string }): { success: boolean; transaction: Transaction } {
    if (amountNaira <= 0) throw new Error("Invalid withdrawal amount");
    if (this.balance.available >= amountNaira) {
      this.balance.available -= amountNaira;
    }
    this.balance.withdrawnTotal += amountNaira;

    const newTx: Transaction = {
      id: `tx-client-${Date.now()}`,
      bookingId: `bk-withdrawal-${Date.now()}`,
      direction: "payout",
      state: "RELEASING",
      currency: "NGN",
      baseAmount: amountNaira * 100,
      baseAmountFormatted: `₦${amountNaira.toLocaleString()}`,
      feeAmount: 0,
      feeAmountFormatted: "₦0",
      totalAmount: amountNaira * 100,
      totalAmountFormatted: `₦${amountNaira.toLocaleString()}`,
      providerRef: `24hr-Transfer-${bankDetails.bankName}-${bankDetails.accountNumber.slice(-4)}`,
      createdAt: new Date().toISOString(),
    };

    this.transactions = [newTx, ...this.transactions];
    this.save(STORAGE_KEYS.BALANCE, this.balance);
    this.save(STORAGE_KEYS.TRANSACTIONS, this.transactions);
    trackEvent("withdrawal_completed", { amountKobo: amountNaira * 100, portal: "client", bankName: bankDetails.bankName }, "payout");
    this.notify();
    return { success: true, transaction: newTx };
  }

  // Services / Rate Cards
  getServices(): ServiceRateCard[] {
    return [...this.services];
  }

  addService(service: Omit<ServiceRateCard, "id">): ServiceRateCard {
    if (this.services.length >= 2) {
      throw new Error("You can only create up to 2 rate cards.");
    }
    const newService: ServiceRateCard = {
      id: `srv-${Date.now()}`,
      ...service,
    };
    this.services = [...this.services, newService];
    this.save(STORAGE_KEYS.SERVICES, this.services);
    this.notify();
    return newService;
  }

  updateService(id: string, updates: Partial<ServiceRateCard>): ServiceRateCard | null {
    const idx = this.services.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.services[idx] = { ...this.services[idx]!, ...updates };
    this.save(STORAGE_KEYS.SERVICES, this.services);
    this.notify();
    return this.services[idx]!;
  }

  deleteService(id: string) {
    this.services = this.services.filter((s) => s.id !== id);
    this.save(STORAGE_KEYS.SERVICES, this.services);
    this.notify();
  }

  // Projects
  getProjects(): Project[] {
    return [...this.projects];
  }

  addProject(input: {
    projectName: string;
    projectType: string;
    nicheReq: string[];
    budget: string;
    budgetAmount: number;
    budgetCurrency: string;
    clientName?: string;
    applicantCap?: number | null;
  }): Project {
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      projectName: input.projectName,
      projectType: input.projectType,
      nicheReq: input.nicheReq,
      budget: input.budget,
      budgetAmount: input.budgetAmount,
      budgetCurrency: input.budgetCurrency,
      clientName: input.clientName || this.clientProfile.orgName || "FilmCraft Studios",
      applicantCap: input.applicantCap ?? 10,
      applicationsOpen: true,
      applicantCount: 0,
      postedAt: new Date().toISOString(),
      myApplication: null,
    };

    this.projects = [newProject, ...this.projects];
    this.save(STORAGE_KEYS.PROJECTS, this.projects);
    trackEvent(
      "project_brief_published",
      { projectId: newProject.id, projectType: newProject.projectType, budgetAmount: newProject.budgetAmount },
      "booking",
    );
    this.notify();
    return newProject;
  }

  // Project Applications & Shortlisting
  listApplicants(projectId: string): Applicant[] {
    return this.applicants[projectId] ?? [];
  }

  updateApplicantStatus(projectId: string, applicationId: string, status: Applicant["status"]): boolean {
    const projectApplicants = this.applicants[projectId] ?? [];
    const idx = projectApplicants.findIndex((a) => a.applicationId === applicationId);
    if (idx === -1) return false;
    projectApplicants[idx]!.status = status;
    this.applicants[projectId] = projectApplicants;
    this.save(STORAGE_KEYS.APPLICANTS, this.applicants);
    trackEvent("applicant_status_updated", { projectId, applicationId, status }, "booking");
    this.notify();
    return true;
  }

  applyToProject(projectId: string, pitch?: string): boolean {
    const projIdx = this.projects.findIndex((p) => p.id === projectId);
    if (projIdx === -1) return false;

    this.projects[projIdx]!.applicantCount += 1;
    this.projects[projIdx]!.myApplication = { id: `app-${Date.now()}`, status: "APPLIED", pitch: pitch || null };

    const projectApplicants = this.applicants[projectId] ?? [];
    projectApplicants.push({
      applicationId: `app-${Date.now()}`,
      status: "APPLIED",
      pitch: pitch || null,
      appliedAt: "Just now",
      creator: {
        id: "mock-creator",
        name: this.talentProfile.name,
        role: "Actor",
        location: this.talentProfile.location,
        avatar: this.talentProfile.name.split(/\s+/).map((w) => w[0]).join(""),
        verified: true,
        tags: ["Dramatic"],
        price: "₦120,000",
      },
    });
    this.applicants[projectId] = projectApplicants;

    this.save(STORAGE_KEYS.PROJECTS, this.projects);
    this.save(STORAGE_KEYS.APPLICANTS, this.applicants);
    trackEvent("project_application_submitted", { projectId, hasPitch: Boolean(pitch) }, "booking");
    this.notify();
    return true;
  }

  // Notifications
  notifications: Array<{ id: string; kind: string; createdAt: string; readAt?: string; payload: Record<string, any> }> = [
    { id: "n1", kind: "PROJECT_APPLICATION", createdAt: new Date().toISOString(), payload: { clientName: "Nike Q1 Campaign" } },
    { id: "n2", kind: "BOOKING_CONFIRMED", createdAt: new Date().toISOString(), payload: { creatorName: "Adaeze Obi" } },
  ];

  getNotifications() {
    return [...this.notifications];
  }

  markNotificationRead(id: string) {
    const idx = this.notifications.findIndex((n) => n.id === id);
    if (idx !== -1) {
      this.notifications[idx]!.readAt = new Date().toISOString();
      this.notify();
    }
  }

  addNotification(notif: { id: string; kind: string; createdAt: string; payload: Record<string, any> }) {
    this.notifications = [notif, ...this.notifications];
    this.notify();
  }

  // Transactions
  getTransactions(): Transaction[] {
    return [...this.transactions];
  }

  // Support Tickets
  getSupportTickets(): SupportTicket[] {
    return [...this.supportTickets];
  }

  submitSupportTicket(subject: string, message: string): SupportTicket {
    const ticket: SupportTicket = {
      id: `st-${Date.now()}`,
      subject,
      message,
      status: "OPEN",
      createdAt: new Date().toISOString(),
    };
    this.supportTickets = [ticket, ...this.supportTickets];
    this.save(STORAGE_KEYS.SUPPORT_TICKETS, this.supportTickets);
    this.notify();
    return ticket;
  }

  // Logged-in User Session
  getLoggedInUser(): LoggedInUserSession | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
    return raw ? JSON.parse(raw) : null;
  }

  setLoggedInUser(user: LoggedInUserSession | null): void {
    if (typeof window === "undefined") return;
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(user));
      identifyAnalyticsUser(user);
      if (user.isNewUser) {
        this.addNotification({
          id: `notif-welcome-${Date.now()}`,
          kind: "WELCOME",
          createdAt: new Date().toISOString(),
          payload: { title: "Welcome to Monologg! 🎉", desc: `Account active for ${user.email}. Complete your onboarding steps!` },
        });
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
      trackEvent("auth_signout_clicked", {}, "acquisition");
    }
    this.notify();
  }

  // Calendar Sync State
  getCalendarSync(): CalendarSyncState {
    if (typeof window === "undefined") return { connected: false };
    const raw = localStorage.getItem(STORAGE_KEYS.CALENDAR_SYNC);
    if (!raw) return { connected: false };
    try {
      return JSON.parse(raw);
    } catch {
      return { connected: false };
    }
  }

  setCalendarSync(state: Partial<CalendarSyncState>): CalendarSyncState {
    const current = this.getCalendarSync();
    const updated: CalendarSyncState = { ...current, ...state };
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.CALENDAR_SYNC, JSON.stringify(updated));
    }
    this.notify();
    return updated;
  }

  // Performer Terms & Agreement State
  getPerformerAgreement(): PerformerAgreementState {
    if (typeof window === "undefined") return { accepted: false, version: "1.0" };
    const raw = localStorage.getItem(STORAGE_KEYS.PERFORMER_AGREEMENT);
    if (!raw) return { accepted: false, version: "1.0" };
    try {
      return JSON.parse(raw);
    } catch {
      return { accepted: false, version: "1.0" };
    }
  }

  setPerformerAgreement(accepted: boolean): PerformerAgreementState {
    const updated: PerformerAgreementState = {
      accepted,
      acceptedAt: accepted ? new Date().toISOString() : undefined,
      version: "1.0",
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.PERFORMER_AGREEMENT, JSON.stringify(updated));
    }
    this.notify();
    return updated;
  }

  // ── Availability Check-in Management ──
  getAvailabilityCheckins(): AvailabilityCheckin[] {
    const defaultCheckins: AvailabilityCheckin[] = [
      {
        id: "chk-001-step1",
        bookingId: "ORD-001",
        eventName: "Fintech Explainer Series",
        eventDate: "Tue 24 Nov 2026 · 10:00 AM WAT",
        location: "Remote (Online)",
        clientName: "Sahara Media Group",
        baseRate: 120000,
        performerReceives: 111600,
        stepIndex: 1,
        totalSteps: 3,
        stepLabel: "Booked",
        dueDate: "Tue 07 Oct",
        status: "done",
        confirmedAt: "2026-10-07T10:00:00.000Z",
        nextCheckinDate: "Tue 14 Oct 2026",
        isOverdue: false,
      },
      {
        id: "chk-001-step2",
        bookingId: "ORD-001",
        eventName: "Fintech Explainer Series",
        eventDate: "Tue 24 Nov 2026 · 10:00 AM WAT",
        location: "Remote (Online)",
        clientName: "Sahara Media Group",
        baseRate: 120000,
        performerReceives: 111600,
        stepIndex: 2,
        totalSteps: 3,
        stepLabel: "7 days",
        dueDate: "Tue 14 Oct",
        status: "due",
        nextCheckinDate: "Mon 23 Nov 2026",
        isOverdue: false,
      },
      {
        id: "chk-001-step3",
        bookingId: "ORD-001",
        eventName: "Fintech Explainer Series",
        eventDate: "Tue 24 Nov 2026 · 10:00 AM WAT",
        location: "Remote (Online)",
        clientName: "Sahara Media Group",
        baseRate: 120000,
        performerReceives: 111600,
        stepIndex: 3,
        totalSteps: 3,
        stepLabel: "2 days",
        dueDate: "Mon 23 Nov",
        status: "due",
        nextCheckinDate: "Event Day · Tue 24 Nov",
        isOverdue: false,
      },
    ];

    if (typeof window === "undefined") return defaultCheckins;
    const raw = localStorage.getItem(STORAGE_KEYS.AVAILABILITY_CHECKINS);
    if (!raw) return defaultCheckins;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 3) return parsed;
      // If legacy single-item array was stored, return the 3-step default checkins
      return defaultCheckins;
    } catch {
      return defaultCheckins;
    }
  }

  confirmAvailabilityCheckin(checkinId: string): AvailabilityCheckin | null {
    const checkins = this.getAvailabilityCheckins();
    let updated: AvailabilityCheckin | null = null;
    const nextList = checkins.map((chk) => {
      if (chk.id === checkinId) {
        updated = {
          ...chk,
          status: "done" as const,
          confirmedAt: new Date().toISOString(),
          isOverdue: false,
        };
        return updated;
      }
      return chk;
    });

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.AVAILABILITY_CHECKINS, JSON.stringify(nextList));
    }
    if (updated) {
      const confirmedItem = updated as AvailabilityCheckin;
      trackEvent(
        "order_attendance_confirmed",
        { checkinId, bookingId: confirmedItem.bookingId, stepLabel: confirmedItem.stepLabel },
        "order_room",
      );
    }
    this.notify();
    return updated;
  }

  isBookingCancelled(bookingId: string): boolean {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CANCELLED_BOOKINGS);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Boolean(parsed[bookingId]);
    } catch {
      return false;
    }
  }

  getCancelledBooking(bookingId: string): { cancelledAt: string; reason: string; amount: number; refundStatus: string } | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CANCELLED_BOOKINGS);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed[bookingId] || null;
    } catch {
      return null;
    }
  }

  recordBookingCancellation(bookingId: string, info: { cancelledAt: string; reason: string; amount?: number; refundStatus?: string }): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CANCELLED_BOOKINGS);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed[bookingId] = {
        amount: 120000,
        refundStatus: "completed",
        ...info,
      };
      localStorage.setItem(STORAGE_KEYS.CANCELLED_BOOKINGS, JSON.stringify(parsed));
    } catch (e) {
      console.error(e);
    }
  }

  appendOrderMessage(bookingId: string, msg: { id: string; from: "system" | "client" | "talent"; text: string; time: string }): void {
    if (typeof window === "undefined") return;
    try {
      const key = `${STORAGE_KEYS.ORDER_MESSAGES_PREFIX}${bookingId}`;
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      list.push(msg);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  }

  getOrderMessages(bookingId: string): any[] {
    if (typeof window === "undefined") return [];
    try {
      const key = `${STORAGE_KEYS.ORDER_MESSAGES_PREFIX}${bookingId}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  cancelBookingFromCheckin(bookingId: string, reason?: string): void {
    const checkins = this.getAvailabilityCheckins().filter((chk) => chk.bookingId !== bookingId);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.AVAILABILITY_CHECKINS, JSON.stringify(checkins));
    }

    // 1. Record cancellation status
    this.recordBookingCancellation(bookingId, {
      cancelledAt: new Date().toISOString(),
      reason: reason || "Performer indicated unavailable during check-in",
      amount: 120000,
      refundStatus: "completed",
    });

    // 2. Process automatic refund to client
    this.refundOrder(bookingId, 120000, "Automatic refund for cancelled booking: performer declined attendance");

    // 3. Send system message to order chat
    this.appendOrderMessage(bookingId, {
      id: `sys-chk-cancel-${Date.now()}`,
      from: "system",
      text: "Booking cancelled by performer. 100% booking amount of ₦120,000 has been refunded automatically to your payment source via Paystack Escrow.",
      time: "Just now",
    });

    // 4. Send client notification
    this.addNotification({
      id: `notif-cancel-${Date.now()}`,
      kind: "BOOKING_CANCELLED",
      createdAt: new Date().toISOString(),
      payload: {
        bookingId,
        clientName: "Sahara Media Group",
        message: `Booking ${bookingId} was cancelled by performer. Automatic refund of ₦120,000 has been processed to client wallet.`,
      },
    });

    trackEvent("order_attendance_declined", { bookingId, reasonLength: reason ? reason.length : 0 }, "order_room");
    this.notify();
  }

  // ── Payout Account Change Request Management ──
  getPayoutAccountChangeRequest(): PayoutAccountChangeRequest | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEYS.PAYOUT_CHANGE_REQUEST);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  submitPayoutAccountChangeRequest(req: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    phoneNumber?: string;
  }): PayoutAccountChangeRequest {
    const newRequest: PayoutAccountChangeRequest = {
      id: `pcr-${Date.now()}`,
      bankName: req.bankName,
      accountNumber: req.accountNumber,
      accountName: req.accountName,
      phoneNumber: req.phoneNumber,
      status: "under_review",
      requestedAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.PAYOUT_CHANGE_REQUEST, JSON.stringify(newRequest));
    }
    trackEvent("payout_bank_change_requested", { bankName: req.bankName }, "payout");
    this.notify();
    return newRequest;
  }

  updatePayoutAccountChangeRequestStatus(status: "under_review" | "approved" | "rejected", reason?: string): void {
    const current = this.getPayoutAccountChangeRequest();
    if (!current) return;
    const updated: PayoutAccountChangeRequest = {
      ...current,
      status,
      rejectionReason: reason,
    };

    if (status === "approved") {
      this.updateBankDetails({
        bankName: updated.bankName,
        accountNumber: updated.accountNumber,
        accountName: updated.accountName,
        phoneNumber: updated.phoneNumber,
      });
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.PAYOUT_CHANGE_REQUEST, JSON.stringify(updated));
    }
    this.notify();
  }
}

export const appStateSync = new StateSyncBus();
export { DEFAULT_PROJECT_DETAILS, getProjectDetails, type ProjectDetailedInfo } from "../mocks/clientProjects";
