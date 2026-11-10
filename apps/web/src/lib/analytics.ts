/**
 * Monologg Product Analytics & Stakeholder Telemetry SDK
 * ---------------------------------------------------------------------------
 * Architecture: Supabase-First (`AnalyticsEvent` table + `/api/v1/analytics/events`)
 * with local ring-buffer persistence and a zero-config PostHog adapter bridge.
 *
 * Captures:
 * 1. Route transitions & page dwell time (`page_viewed`, `page_leave`)
 * 2. Delegated UI & CTA click stream across every button, link, tab, and modal (`ui_click`, `cta_clicked`)
 * 3. High-signal business funnel milestones across Performer, Client, and Guest journeys
 * 4. Privacy & NDPA guardrails: automatic recursive scrubbing of sensitive keys
 */

import { supabase, SUPABASE_MODE } from "./supabase";

export type AnalyticsCategory =
  | "navigation"
  | "acquisition"
  | "onboarding"
  | "discovery"
  | "booking"
  | "escrow_payment"
  | "order_room"
  | "payout"
  | "engagement"
  | "ui_interaction";

export type CanonicalAnalyticsEventName =
  // Navigation & Session
  | "session_started"
  | "page_viewed"
  | "page_leave"
  | "theme_toggled"
  | "dashboard_tab_switched"
  // UI & Click Stream
  | "ui_click"
  | "cta_clicked"
  // Acquisition & Auth
  | "landing_cta_clicked"
  | "waitlist_submitted"
  | "auth_role_selected"
  | "auth_method_selected"
  | "auth_signin_submitted"
  | "auth_signup_submitted"
  | "auth_session_established"
  | "auth_signout_clicked"
  // Onboarding
  | "creator_onboarding_step_completed"
  | "creator_onboarding_completed"
  | "client_onboarding_completed"
  // Discovery & Storefront
  | "public_storefront_viewed"
  | "public_storefront_share_clicked"
  | "talent_directory_searched"
  | "talent_directory_filtered"
  | "talent_profile_modal_opened"
  | "project_board_searched"
  | "project_board_filtered"
  // Briefs & Casting
  | "project_brief_step_viewed"
  | "project_brief_draft_saved"
  | "project_brief_published"
  | "project_application_submitted"
  | "applicant_status_updated"
  // Checkout & Escrow
  | "checkout_step_viewed"
  | "external_booking_step_viewed"
  | "escrow_agreement_accepted"
  | "escrow_payment_initiated"
  | "escrow_payment_completed"
  | "wallet_funded"
  // Order Room Collaboration
  | "order_room_viewed"
  | "order_room_tab_switched"
  | "order_room_inspector_toggled"
  | "order_room_details_expanded"
  | "order_attendance_confirmed"
  | "order_attendance_declined"
  | "order_onsite_pin_verified"
  | "order_google_meet_clicked"
  | "order_message_sent"
  | "order_deliverable_submitted"
  | "order_revision_requested"
  | "order_payment_released"
  | "order_review_submitted"
  | "order_dispute_submitted"
  // Earnings, Withdrawals & Settings
  | "balance_visibility_toggled"
  | "withdrawal_initiated"
  | "withdrawal_completed"
  | "payout_bank_change_requested"
  | "availability_updated"
  | "calendar_sync_toggled"
  | "support_ticket_created";

export type AnalyticsEventName = CanonicalAnalyticsEventName | (string & {});

export interface AnalyticsTaxonomyEntry {
  category: AnalyticsCategory;
  description: string;
  stakeholderKpi: string;
}

export const ANALYTICS_TAXONOMY: Record<CanonicalAnalyticsEventName, AnalyticsTaxonomyEntry> = {
  session_started: {
    category: "navigation",
    description: "Fired once per browser session when the app initializes",
    stakeholderKpi: "Daily / Monthly Active Sessions (DAS/MAS) & Device Split",
  },
  page_viewed: {
    category: "navigation",
    description: "Fired on every route transition across public and authenticated screens",
    stakeholderKpi: "Screen Reach & Funnel Drop-off by Route",
  },
  page_leave: {
    category: "navigation",
    description: "Fired when navigating away from a route with durationMs spent on screen",
    stakeholderKpi: "Time-on-Screen & Workspace Engagement Depth",
  },
  theme_toggled: {
    category: "engagement",
    description: "User toggled between light and dark mode",
    stakeholderKpi: "Theme Preference Adoption",
  },
  dashboard_tab_switched: {
    category: "navigation",
    description: "User switched primary tabs on Performer or Client dashboard",
    stakeholderKpi: "Feature Discovery & Tab Stickiness",
  },
  ui_click: {
    category: "ui_interaction",
    description: "Global auto-captured click on any interactive button, link, or control",
    stakeholderKpi: "Click Heatmap & Dead-Click / High-Friction Detection",
  },
  cta_clicked: {
    category: "ui_interaction",
    description: "Explicit click on a primary or tagged call-to-action button",
    stakeholderKpi: "Primary CTA Click-Through Rate (CTR)",
  },
  landing_cta_clicked: {
    category: "acquisition",
    description: "Visitor clicked a primary acquisition CTA on the landing page",
    stakeholderKpi: "Landing-to-Signup Conversion Rate",
  },
  waitlist_submitted: {
    category: "acquisition",
    description: "Visitor submitted their email to join the waitlist",
    stakeholderKpi: "Top-of-Funnel Lead Capture Velocity",
  },
  auth_role_selected: {
    category: "acquisition",
    description: "User toggled between Performer and Client role during authentication",
    stakeholderKpi: "Supply (Performer) vs. Demand (Client) Signup Intent Ratio",
  },
  auth_method_selected: {
    category: "acquisition",
    description: "User chose Email, Google OAuth, Magic Link, or OTP sign-in",
    stakeholderKpi: "Auth Provider Preference & OAuth Conversion Lift",
  },
  auth_signin_submitted: {
    category: "acquisition",
    description: "User submitted the sign-in form",
    stakeholderKpi: "Login Success vs. Friction Rate",
  },
  auth_signup_submitted: {
    category: "acquisition",
    description: "User submitted the registration form",
    stakeholderKpi: "Registration Submission Rate",
  },
  auth_session_established: {
    category: "acquisition",
    description: "Authenticated user session persisted (Email, Google, or Supabase bridge)",
    stakeholderKpi: "Verified Active Users (DAU/MAU) by Role",
  },
  auth_signout_clicked: {
    category: "acquisition",
    description: "User signed out of their account",
    stakeholderKpi: "Session Lifecycle & Multi-Account Switching",
  },
  creator_onboarding_step_completed: {
    category: "onboarding",
    description: "Performer completed a step in the onboarding wizard",
    stakeholderKpi: "Performer Onboarding Step-by-Step Drop-off",
  },
  creator_onboarding_completed: {
    category: "onboarding",
    description: "Performer finished onboarding and entered the dashboard",
    stakeholderKpi: "Performer Activation Rate",
  },
  client_onboarding_completed: {
    category: "onboarding",
    description: "Client completed organization onboarding",
    stakeholderKpi: "Client Activation Rate",
  },
  public_storefront_viewed: {
    category: "discovery",
    description: "Visitor or Client viewed a Performer's public profile (`/:handle`)",
    stakeholderKpi: "Storefront Traffic & Profile-to-Booking Conversion",
  },
  public_storefront_share_clicked: {
    category: "discovery",
    description: "User copied or shared a Performer profile link",
    stakeholderKpi: "Viral K-Factor & Bio-Link Share Frequency",
  },
  talent_directory_searched: {
    category: "discovery",
    description: "Client searched the casting directory",
    stakeholderKpi: "Search Demand Keywords & Zero-Result Rate",
  },
  talent_directory_filtered: {
    category: "discovery",
    description: "Client applied category, budget, gender, age, or location filters",
    stakeholderKpi: "Most Requested Performer Segments",
  },
  talent_profile_modal_opened: {
    category: "discovery",
    description: "Client opened a Performer's detailed dossier modal",
    stakeholderKpi: "Directory Impression-to-Dossier View Rate",
  },
  project_board_searched: {
    category: "discovery",
    description: "Performer searched open casting briefs",
    stakeholderKpi: "Performer Project Search Demand",
  },
  project_board_filtered: {
    category: "discovery",
    description: "Performer filtered open projects by craft, budget, or rating",
    stakeholderKpi: "Performer Filter Usage",
  },
  project_brief_step_viewed: {
    category: "booking",
    description: "Client viewed or advanced a step in the 5-step Project Brief wizard",
    stakeholderKpi: "Brief Creation Funnel Completion & Draft Resumption Rate",
  },
  project_brief_draft_saved: {
    category: "booking",
    description: "Client saved a project brief draft (`Save Draft`)",
    stakeholderKpi: "Draft Save & Continuation Velocity",
  },
  project_brief_published: {
    category: "booking",
    description: "Client published and funded a project brief",
    stakeholderKpi: "Gross Brief Volume & Escrow Lock Conversion",
  },
  project_application_submitted: {
    category: "booking",
    description: "Performer submitted an application/pitch to a client brief",
    stakeholderKpi: "Applications per Brief & Supply Liquidity",
  },
  applicant_status_updated: {
    category: "booking",
    description: "Client shortlisted, selected, or rejected an applicant",
    stakeholderKpi: "Time-to-Shortlist & Selection Conversion Rate",
  },
  checkout_step_viewed: {
    category: "escrow_payment",
    description: "Client advanced through the 3-step internal checkout flow",
    stakeholderKpi: "Checkout Step Drop-off Rate",
  },
  external_booking_step_viewed: {
    category: "escrow_payment",
    description: "Guest or Client advanced through the 4-step external booking entry flow",
    stakeholderKpi: "External Link Booking Conversion Rate",
  },
  escrow_agreement_accepted: {
    category: "escrow_payment",
    description: "Buyer accepted the mandatory escrow & cancellation protection agreement",
    stakeholderKpi: "Legal Gate Pass-Through Rate",
  },
  escrow_payment_initiated: {
    category: "escrow_payment",
    description: "Buyer launched Paystack modal or initiated wallet debit",
    stakeholderKpi: "Payment Initiation to Settlement Success Rate",
  },
  escrow_payment_completed: {
    category: "escrow_payment",
    description: "Escrow payment succeeded and Order Room was provisioned",
    stakeholderKpi: "Gross Merchandise Value (GMV) Locked in Escrow",
  },
  wallet_funded: {
    category: "escrow_payment",
    description: "Client added funds to their Monologg wallet",
    stakeholderKpi: "Client Wallet Top-Up Volume",
  },
  order_room_viewed: {
    category: "order_room",
    description: "User opened an active Order Room workspace",
    stakeholderKpi: "Active Order Collaboration Frequency",
  },
  order_room_tab_switched: {
    category: "order_room",
    description: "User switched between Messages, Brief & Files, and Payment tabs",
    stakeholderKpi: "Order Room Surface Utilization",
  },
  order_room_inspector_toggled: {
    category: "order_room",
    description: "User toggled the desktop Right Contextual Inspector Rail",
    stakeholderKpi: "Desktop 2-Pane Inspector Engagement",
  },
  order_room_details_expanded: {
    category: "order_room",
    description: "User expanded or collapsed progressive disclosure panels (Command Bar / Fee Breakdown)",
    stakeholderKpi: "Progressive Disclosure Usage Rate",
  },
  order_attendance_confirmed: {
    category: "order_room",
    description: "Performer confirmed an attendance verification gate (`I'm confirmed`)",
    stakeholderKpi: "Attendance Gate On-Time Confirmation Rate",
  },
  order_attendance_declined: {
    category: "order_room",
    description: "Performer declined an attendance check-in (`Can't make it`) triggering auto-refund",
    stakeholderKpi: "Performer Cancellation & Auto-Refund Rate",
  },
  order_onsite_pin_verified: {
    category: "order_room",
    description: "Performer verified the 4-digit Client arrival PIN for an onsite booking",
    stakeholderKpi: "Onsite Arrival Verification Compliance",
  },
  order_google_meet_clicked: {
    category: "order_room",
    description: "Client launched, copied, marked done, or dismissed the Google Meet intro call strip",
    stakeholderKpi: "Pre-Production Video Alignment Adoption",
  },
  order_message_sent: {
    category: "order_room",
    description: "Performer or Client sent a message or attachment in the Order Room",
    stakeholderKpi: "Order Room Messaging Velocity & Response SLA",
  },
  order_deliverable_submitted: {
    category: "order_room",
    description: "Performer uploaded and submitted final deliverables for Client review",
    stakeholderKpi: "Booking-to-Deliverable Completion Time",
  },
  order_revision_requested: {
    category: "order_room",
    description: "Client requested a revision on submitted deliverables",
    stakeholderKpi: "Revision Frequency & First-Take Approval Rate",
  },
  order_payment_released: {
    category: "order_room",
    description: "Client approved deliverables and released escrow payout to Performer",
    stakeholderKpi: "Net Realized GMV & Manual vs. 48h Auto-Release Split",
  },
  order_review_submitted: {
    category: "order_room",
    description: "Performer or Client submitted a star rating and written review",
    stakeholderKpi: "Two-Sided Review Participation Rate & Avg CSAT Rating",
  },
  order_dispute_submitted: {
    category: "order_room",
    description: "Performer or Client raised an escrow dispute",
    stakeholderKpi: "Order Dispute Rate (% of GMV Disputed)",
  },
  balance_visibility_toggled: {
    category: "engagement",
    description: "User toggled the Eye/EyeOff privacy mask on their hero balance card",
    stakeholderKpi: "Privacy Toggle Usage",
  },
  withdrawal_initiated: {
    category: "payout",
    description: "Performer opened the withdrawal flow",
    stakeholderKpi: "Withdrawal Initiation Rate",
  },
  withdrawal_completed: {
    category: "payout",
    description: "Performer completed a payout withdrawal to their verified bank account",
    stakeholderKpi: "Total Performer Payout Volume & Settlement Velocity",
  },
  payout_bank_change_requested: {
    category: "payout",
    description: "Performer submitted a KYC-matched payout bank account change request",
    stakeholderKpi: "Bank Change Request Volume & KYC Match Rate",
  },
  availability_updated: {
    category: "engagement",
    description: "Performer updated availability slots or recurring schedule",
    stakeholderKpi: "Performer Calendar Freshness",
  },
  calendar_sync_toggled: {
    category: "engagement",
    description: "Performer connected or disconnected Google Calendar sync",
    stakeholderKpi: "Calendar Sync Adoption Rate",
  },
  support_ticket_created: {
    category: "engagement",
    description: "User submitted a help/support ticket",
    stakeholderKpi: "Support Ticket Deflection & Issue Volume",
  },
};

export interface TrackedAnalyticsEvent {
  id: string;
  eventName: AnalyticsEventName;
  category: AnalyticsCategory;
  userId: string | null;
  anonymousId: string;
  sessionId: string;
  userRole: "TALENT" | "CLIENT" | "GUEST";
  path: string;
  properties: Record<string, unknown>;
  timestamp: string;
}

export interface StakeholderAnalyticsSummary {
  totalBufferedEvents: number;
  byCategory: Record<string, number>;
  byRole: Record<string, number>;
  topEvents: Array<{ eventName: string; count: number }>;
  funnel: {
    pageViews: number;
    uiClicks: number;
    authEstablished: number;
    briefsPublished: number;
    escrowPaymentsCompleted: number;
    deliverablesSubmitted: number;
    escrowPaymentsReleased: number;
    withdrawalsCompleted: number;
  };
}

const STORAGE_KEYS = {
  ANON_ID: "monologg_analytics_anon_id",
  SESSION_ID: "monologg_analytics_session_id",
  EVENT_BUFFER: "monologg_analytics_events",
  USER_SESSION: "monologg_user_session",
} as const;

const MAX_BUFFERED_EVENTS = 500;

const SENSITIVE_KEY_PATTERN =
  /^(password|passwordHash|token|accessToken|refreshToken|secret|otp|code|pin|cvv|cardNumber|idNumber|accountNumber|bvn|nin)$/i;

export function sanitizeAnalyticsPayload(input: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!input || typeof input !== "object") return {};
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      clean[key] = sanitizeAnalyticsPayload(value as Record<string, unknown>);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export function getAnonymousId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEYS.ANON_ID);
    if (existing) return existing;
    const created = generateId("anon");
    localStorage.setItem(STORAGE_KEYS.ANON_ID, created);
    return created;
  } catch {
    return "anon_ephemeral";
  }
}

export function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
    if (existing) return existing;
    const created = generateId("sess");
    sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, created);
    return created;
  } catch {
    return "sess_ephemeral";
  }
}

function getCurrentUserContext(): { userId: string | null; userRole: "TALENT" | "CLIENT" | "GUEST" } {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
    if (!raw) return { userId: null, userRole: "GUEST" };
    const parsed = JSON.parse(raw) as { id?: string; userType?: "TALENT" | "CLIENT" };
    return {
      userId: parsed.id ?? null,
      userRole: parsed.userType === "TALENT" || parsed.userType === "CLIENT" ? parsed.userType : "GUEST",
    };
  } catch {
    return { userId: null, userRole: "GUEST" };
  }
}

function getCurrentPath(): string {
  try {
    if (typeof window !== "undefined" && window.location) {
      return window.location.pathname || "/";
    }
  } catch {}
  return "/";
}

function appendToLocalBuffer(event: TrackedAnalyticsEvent): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EVENT_BUFFER);
    const list: TrackedAnalyticsEvent[] = raw ? JSON.parse(raw) : [];
    list.push(event);
    const trimmed = list.length > MAX_BUFFERED_EVENTS ? list.slice(list.length - MAX_BUFFERED_EVENTS) : list;
    localStorage.setItem(STORAGE_KEYS.EVENT_BUFFER, JSON.stringify(trimmed));
  } catch {}
}

function dispatchToSupabaseAndSinks(event: TrackedAnalyticsEvent): void {
  // 1. Primary Architecture: Direct Supabase ingestion when configured (skip external network calls in unit tests)
  if (import.meta.env.MODE !== "test" && SUPABASE_MODE === "real" && supabase) {
    void Promise.resolve(
      supabase.from("AnalyticsEvent").insert({
        id: event.id,
        eventName: event.eventName,
        category: event.category,
        userId: event.userId,
        anonymousId: event.anonymousId,
        sessionId: event.sessionId,
        userRole: event.userRole,
        path: event.path,
        properties: event.properties,
        createdAt: event.timestamp,
      }),
    ).catch(() => {});
  }

  // 2. Backend API Ingestion when running in live API mode (skip external network calls in unit tests)
  const apiMode = (import.meta.env.VITE_API_MODE as string | undefined)?.toLowerCase();
  if (import.meta.env.MODE !== "test" && apiMode === "live" && typeof fetch === "function") {
    const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000/api/v1";
    void fetch(`${baseUrl.replace(/\/+$/, "")}/analytics/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventName: event.eventName,
        category: event.category,
        userId: event.userId,
        anonymousId: event.anonymousId,
        sessionId: event.sessionId,
        userRole: event.userRole,
        path: event.path,
        properties: event.properties,
      }),
      keepalive: true,
    }).catch(() => {});
  }

  // 3. Forward-compatible PostHog bridge (zero code changes needed if PostHog is loaded later)
  try {
    const maybePosthog = (globalThis as Record<string, unknown>).posthog as
      | { capture?: (name: string, props: Record<string, unknown>) => void }
      | undefined;
    if (maybePosthog && typeof maybePosthog.capture === "function") {
      maybePosthog.capture(event.eventName, {
        ...event.properties,
        category: event.category,
        userRole: event.userRole,
        path: event.path,
        sessionId: event.sessionId,
      });
    }
  } catch {}
}

/**
 * Core event tracker. Safe to call anywhere in the app (never throws).
 */
export function trackEvent(
  eventName: AnalyticsEventName,
  properties?: Record<string, unknown>,
  categoryOverride?: AnalyticsCategory,
): TrackedAnalyticsEvent {
  const taxonomyEntry = ANALYTICS_TAXONOMY[eventName as CanonicalAnalyticsEventName];
  const category: AnalyticsCategory = categoryOverride ?? taxonomyEntry?.category ?? "ui_interaction";
  const userCtx = getCurrentUserContext();
  const safeProps = sanitizeAnalyticsPayload(properties);

  const explicitRole =
    typeof safeProps.role === "string"
      ? safeProps.role === "talent" || safeProps.role === "TALENT"
        ? "TALENT"
        : safeProps.role === "client" || safeProps.role === "CLIENT"
          ? "CLIENT"
          : userCtx.userRole
      : userCtx.userRole;

  const event: TrackedAnalyticsEvent = {
    id: generateId("evt"),
    eventName,
    category,
    userId: userCtx.userId,
    anonymousId: getAnonymousId(),
    sessionId: getSessionId(),
    userRole: explicitRole,
    path: typeof safeProps.path === "string" ? safeProps.path : getCurrentPath(),
    properties: safeProps,
    timestamp: new Date().toISOString(),
  };

  appendToLocalBuffer(event);
  dispatchToSupabaseAndSinks(event);

  return event;
}

/**
 * Tracks a route/page view with screen metadata.
 */
export function trackPageView(path: string, properties?: Record<string, unknown>): TrackedAnalyticsEvent {
  return trackEvent(
    "page_viewed",
    {
      path,
      title: typeof document !== "undefined" ? document.title : "",
      ...properties,
    },
    "navigation",
  );
}

/**
 * Tracks an explicit CTA or interactive control click.
 */
export function trackClick(label: string, properties?: Record<string, unknown>): TrackedAnalyticsEvent {
  return trackEvent(
    "cta_clicked",
    {
      label,
      ...properties,
    },
    "ui_interaction",
  );
}

/**
 * Identifies an authenticated user session for Supabase & future PostHog correlation.
 */
export function identifyAnalyticsUser(user: {
  id: string;
  email?: string;
  userType: "TALENT" | "CLIENT";
  authProvider?: string;
  isNewUser?: boolean;
}): void {
  trackEvent(
    "auth_session_established",
    {
      userId: user.id,
      userType: user.userType,
      authProvider: user.authProvider ?? "EMAIL",
      isNewUser: Boolean(user.isNewUser),
    },
    "acquisition",
  );

  try {
    const maybePosthog = (globalThis as Record<string, unknown>).posthog as
      | { identify?: (id: string, props: Record<string, unknown>) => void }
      | undefined;
    if (maybePosthog && typeof maybePosthog.identify === "function") {
      maybePosthog.identify(user.id, {
        userType: user.userType,
        authProvider: user.authProvider ?? "EMAIL",
      });
    }
  } catch {}
}

export function getBufferedEvents(): TrackedAnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EVENT_BUFFER);
    return raw ? (JSON.parse(raw) as TrackedAnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

export function clearBufferedEvents(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.EVENT_BUFFER);
  } catch {}
}

export function getStakeholderSummary(): StakeholderAnalyticsSummary {
  const events = getBufferedEvents();
  const byCategory: Record<string, number> = {};
  const byEventName: Record<string, number> = {};
  const byRole: Record<string, number> = {};

  for (const evt of events) {
    byCategory[evt.category] = (byCategory[evt.category] ?? 0) + 1;
    byEventName[evt.eventName] = (byEventName[evt.eventName] ?? 0) + 1;
    byRole[evt.userRole] = (byRole[evt.userRole] ?? 0) + 1;
  }

  const topEvents = Object.entries(byEventName)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([eventName, count]) => ({ eventName, count }));

  return {
    totalBufferedEvents: events.length,
    byCategory,
    byRole,
    topEvents,
    funnel: {
      pageViews: byEventName["page_viewed"] ?? 0,
      uiClicks: (byEventName["ui_click"] ?? 0) + (byEventName["cta_clicked"] ?? 0),
      authEstablished: byEventName["auth_session_established"] ?? 0,
      briefsPublished: byEventName["project_brief_published"] ?? 0,
      escrowPaymentsCompleted: byEventName["escrow_payment_completed"] ?? 0,
      deliverablesSubmitted: byEventName["order_deliverable_submitted"] ?? 0,
      escrowPaymentsReleased: byEventName["order_payment_released"] ?? 0,
      withdrawalsCompleted: byEventName["withdrawal_completed"] ?? 0,
    },
  };
}

export const analytics = {
  trackEvent,
  trackPageView,
  trackClick,
  identifyAnalyticsUser,
  getBufferedEvents,
  clearBufferedEvents,
  getStakeholderSummary,
  taxonomy: ANALYTICS_TAXONOMY,
};
