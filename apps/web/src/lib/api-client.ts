import type {
  ActivityItem,
  Applicant,
  CalendarEvent,
  CalendarEventKind,
  ClientProject,
  DayDetail,
  MyApplication,
  Order,
  OrderMessage,
  Project,
  PublicRateCard,
  PublicStorefront,
  ServiceRateCard,
  Slot,
  StatMetric,
  SupportTicket,
  Talent,
  Transaction,
} from "@monologg/types";
import * as mocks from "../mocks";
import { appStateSync } from "./state-sync";
import { CODE_TO_SYMBOL } from "./currency";

/**
 * The one seam every screen's data flows through (features.md Phase 1).
 * `VITE_API_MODE=mock` (the default) returns local fixtures; `live` calls
 * the real `/api/v1` endpoints once they exist (Phase 5+). No component
 * should import from `../mocks` directly — only this file does.
 */
const API_MODE = (import.meta.env.VITE_API_MODE as "mock" | "live" | undefined) ?? "mock";

// ── Auth session (features.md Phase 4) ────────────────────────────────────
// Access token: in memory only (per spec — never persisted). Refresh token:
// localStorage, since it must survive a page reload for the rotation/refresh
// flow to work at all in a plain SPA. Both are no-ops in mock mode.
const REFRESH_TOKEN_STORAGE_KEY = "monologg_refresh_token";
let accessToken: string | null = null;

function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

function setSession(tokens: { accessToken: string; refreshToken: string } | null): void {
  accessToken = tokens?.accessToken ?? null;
  if (typeof window === "undefined") return;
  if (tokens?.refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refreshToken);
  } else {
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }
}

export interface AuthUser {
  userId: string;
  email: string;
  userType: "TALENT" | "CLIENT";
  name?: string;
  avatarUrl?: string;
}

// Auth endpoints get their own minimal fetch helper, deliberately not routed through
// request(): a 401 from /auth/login means "wrong credentials", not "expired session",
// so it must never trigger the refresh-and-retry behavior below.
async function authRequest<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/v1/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.message === "string" ? data.message : `Request failed (${res.status})`);
  }
  return data as T;
}

// De-dupes concurrent refresh attempts. Refresh tokens are single-use/rotated
// server-side (features.md Phase 4) — a page that fires several protected
// requests at once (e.g. a dashboard's mount-time useEffect) previously had
// EACH one independently 401 and call tryRefreshSession(), all racing to
// spend the same stored refresh token. Only the first actually succeeded;
// every other concurrent attempt replayed an already-rotated token, which the
// server's reuse-detection correctly treats as theft and revokes the whole
// session family — stranding the user right after a real login. Sharing one
// in-flight promise means concurrent 401s await a single refresh instead of
// each spending it.
let refreshInFlight: Promise<boolean> | null = null;

/** Attempts one silent refresh using the stored refresh token. Never throws.
 * Safe to call concurrently — overlapping calls share the same in-flight
 * refresh rather than each consuming the single-use refresh token. */
async function tryRefreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) return false;
    try {
      const data = await authRequest<{ accessToken: string; refreshToken: string }>("/refresh", {
        refreshToken,
      });
      setSession(data);
      return true;
    } catch {
      setSession(null);
      return false;
    }
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function request<T>(path: string, init: RequestInit = {}, allowRetry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(`/api/v1${path}`, { ...init, headers });

  if (res.status === 401 && allowRetry && (await tryRefreshSession())) {
    return request<T>(path, init, false);
  }
  if (!res.ok) {
    throw new Error(`API error ${res.status} ${res.statusText}: ${path}`);
  }
  // 204 No Content (e.g. DELETE /creators/me/attributes, POST .../guideline-ack —
  // features.md Phase 12A) has no body; calling res.json() on it throws
  // "Unexpected end of JSON input" in a real browser too, not just under test.
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// features.md Phase 5: every list endpoint paginates server-side, but no current
// screen has "load more"/page-number UI — they all just render "the list". Rather
// than build pagination UI as a side effect of this phase, live-mode list calls
// fetch one generously-sized page and unwrap it, so today's no-pagination UI stays
// exactly as it is. The pagination itself is proven correct by apps/api's own tests.
interface Paginated<T> {
  data: T[];
}
async function requestList<T>(path: string): Promise<T[]> {
  const separator = path.includes("?") ? "&" : "?";
  const page = await request<Paginated<T>>(`${path}${separator}pageSize=100`);
  return page.data;
}

// features.md Phase 7: AI style-tagging job state. Independent of KYC/verification (X3) —
// see CreatorProfile below.
export type TaggingStatus = "QUEUED" | "TAGGING" | "DONE" | "FAILED";
export interface MediaAssetStatus {
  id: string;
  taggingStatus: TaggingStatus;
}

export type VerificationState = "UNVERIFIED" | "PROCESSING" | "VERIFIED" | "FAILED";
export interface CreatorProfile {
  id: string;
  name: string;
  bio: string | null;
  location: string;
  styleTags: string[];
  verification: VerificationState;
  avatarUrl?: string | null;
}

// features.md Phase 12: the client-side equivalent of CreatorProfile. Not yet
// consumed by any screen — Settings.tsx (the one screen that edits a profile)
// is only reachable from TalentDashboard.tsx's nav today, so there's no client
// entry point to wire this into yet. Added now, alongside the backend route
// (routes/clients.ts), so that gap is one screen away from closed, not a new
// backend build too, whenever a client "Account" screen is added.
export interface ClientProfile {
  id: string;
  name: string;
  orgName: string | null;
  orgType: "STUDIO" | "EVENT" | "BRAND" | "CHURCH" | null;
  location: string;
  avatarUrl?: string | null;
}

// features.md Phase 12A.1 — Media Kit.
export interface MediaKitStatus {
  creatorId: string;
  mode: "AUTO" | "UPLOAD";
  uploadUrl: string | null;
  uploadSizeBytes: number | null;
  autoVersion: number;
  autoLastRenderedAt: string | null;
}

// features.md Phase 12A.2 — Verification video. Deliberately not named
// "VerificationStatus" (that's the identity-KYC type above, VerificationState) —
// X3: these are two fully independent systems and must never share a name
// that could suggest otherwise.
export interface VerificationRecordingStatus {
  id: string;
  url: string;
  durationSec: number;
  guidelineAck: boolean;
  status: "UPLOADED" | "IN_REVIEW" | "APPROVED" | "NEEDS_RERECORD";
  reviewerNote: string | null;
}

// features.md Phase 12A.3 — Physical attributes. Value sets mirror
// apps/api/src/routes/attributes.ts's own zod enums exactly; kept as plain
// strings here (not a shared @monologg/types export) for the same reason
// apps/api/src/routes/talent.ts duplicates them rather than importing across
// a route-to-route boundary — small, stable, casting-industry enums.
export type AttributeVisibility = "PUBLIC" | "SEARCHABLE" | "PRIVATE";
export interface PhysicalAttributes {
  id: string;
  heightRange?: string | null;
  weightRange?: string | null;
  ageRange?: string | null;
  build?: string | null;
  complexion?: string | null;
  hairColor?: string | null;
  eyeColor?: string | null;
  genderPresentation?: string | null;
  shoeSize?: string | null;
  shoeSizeUnit?: string | null;
  distinctiveFeatures?: string | null;
  visibility: Partial<Record<string, AttributeVisibility>>;
  consentVersion: string;
  consentedAt: string;
}
export type UpdateAttributesInput = Partial<
  Pick<
    PhysicalAttributes,
    "heightRange" | "weightRange" | "ageRange" | "build" | "complexion" | "hairColor" | "eyeColor" | "genderPresentation" | "shoeSize" | "shoeSizeUnit" | "distinctiveFeatures" | "visibility"
  >
> & { consentVersion: string };

/** Discovery filters GET /talent accepts server-side (features.md Phase 12A.3
 * adds the attribute fields; niche/tag/location/price predate this phase). */
export interface TalentFilters {
  niche?: string;
  tag?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  heightRange?: string;
  weightRange?: string;
  ageRange?: string;
  build?: string;
  complexion?: string;
  hairColor?: string;
  eyeColor?: string;
  genderPresentation?: string;
}

// features.md Phase 9: notifications backend.
export interface AppNotification {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  userType: "TALENT" | "CLIENT";
  name: string;
  // features.md Phase 10: required — mirrors AuthFlow.tsx's "I agree" checkbox gate.
  acceptedTermsVersion: string;
}

export const apiClient = {
  mode: API_MODE,

  // ── Auth ────────────────────────────────────────────────────────────
  // Mock mode mirrors the prototype's original mock behavior exactly (no visual/
  // behavioral change) — only `live` mode talks to the real endpoints and stores tokens.
  async register(
    input: RegisterInput,
  ): Promise<{ userId: string; email: string; userType: "TALENT" | "CLIENT"; emailVerified: boolean; isNewUser?: boolean }> {
    if (API_MODE === "mock") {
      const user = {
        userId: `usr-${Date.now()}`,
        email: input.email,
        userType: input.userType,
        emailVerified: false,
        isNewUser: true,
      };
      appStateSync.setLoggedInUser({ id: user.userId, email: user.email, name: input.name, userType: input.userType, authProvider: "EMAIL", isNewUser: true });
      return user;
    }
    const res = await authRequest<{ userId: string; email: string; userType: "TALENT" | "CLIENT"; emailVerified: boolean; isNewUser?: boolean }>("/register", input);
    // /register only creates the account — it never issues tokens (the client
    // is expected to log in separately). Without this, a fresh registration
    // landed on /onboarding with no session at all, and the very next
    // protected route (finishing onboarding, /dashboard, ...) bounced back to
    // /auth as if the user had never signed up. Logging in immediately with
    // the credentials they just set reuses the real, working session path.
    await apiClient.login(input.email, input.password);
    const justRegistered = appStateSync.getLoggedInUser();
    if (justRegistered) appStateSync.setLoggedInUser({ ...justRegistered, isNewUser: true });
    return res;
  },
  async login(email: string, password: string): Promise<AuthUser & { isNewUser?: boolean }> {
    if (API_MODE === "mock") {
      const userType: "TALENT" | "CLIENT" =
        email.toLowerCase().includes("client") || email.toLowerCase().includes("brand") ? "CLIENT" : "TALENT";
      const user = { userId: "mock-user", email, userType, isNewUser: false };
      appStateSync.setLoggedInUser({ id: user.userId, email: user.email, name: userType === "CLIENT" ? "FilmCraft Studios" : "Elias Thorne", userType, authProvider: "EMAIL", isNewUser: false });
      return user;
    }
    const data = await authRequest<{ accessToken: string; refreshToken: string; user: AuthUser & { name: string; isNewUser?: boolean } }>(
      "/login",
      { email, password },
    );
    setSession(data);
    appStateSync.setLoggedInUser({ id: data.user.userId, email: data.user.email, name: data.user.name, userType: data.user.userType, authProvider: "EMAIL", isNewUser: data.user.isNewUser ?? false });
    // Dashboards read the greeting/sidebar identity from the talent/client
    // profile store, not from the logged-in-user session record — without
    // this, every real password-auth account showed the seeded
    // "Emeka Johnson"/"Sarah Jenkins" demo persona instead of their own name.
    if (data.user.userType === "CLIENT") {
      appStateSync.updateClientProfile({ name: data.user.name, email: data.user.email });
    } else {
      appStateSync.updateTalentProfile({ name: data.user.name, email: data.user.email });
    }
    return data.user;
  },
  async getAdminUsers(): Promise<{ users: Array<{ id: string; email: string; userType: string; authProvider: string; isNewUser: boolean; name: string; createdAt: string }>; totalCount: number }> {
    if (API_MODE !== "live") {
      const currentUser = appStateSync.getLoggedInUser();
      const mockUsers = [
        { id: "usr-001", email: "elias@monologg.test", userType: "TALENT", authProvider: "EMAIL", isNewUser: false, name: "Elias Thorne", createdAt: new Date().toISOString() },
        { id: "usr-002", email: "filmcraft@studio.test", userType: "CLIENT", authProvider: "EMAIL", isNewUser: false, name: "FilmCraft Studios", createdAt: new Date().toISOString() },
      ];
      if (currentUser) {
        mockUsers.unshift({
          id: currentUser.id,
          email: currentUser.email,
          userType: currentUser.userType,
          authProvider: currentUser.authProvider || "GOOGLE",
          isNewUser: currentUser.isNewUser ?? true,
          name: currentUser.name,
          createdAt: new Date().toISOString(),
        });
      }
      return { users: mockUsers, totalCount: mockUsers.length };
    }
    return request("/admin/users");
  },
  async logout(): Promise<void> {
    if (API_MODE === "live") {
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        await authRequest("/logout", { refreshToken }).catch(() => {});
      }
    }
    setSession(null);
    // Without this, every "signed in" UI (landing page header, dashboard
    // sidebar) kept showing the account as logged in after Sign Out, since
    // they all key off this local session record, not the token alone.
    appStateSync.setLoggedInUser(null);
  },
  async forgotPassword(email: string): Promise<void> {
    if (API_MODE === "mock") return;
    await authRequest("/forgot-password", { email });
  },
  /** features.md Phase 16 (FA-5), PWA-19: consumes the set-password/magic-link token
   * emailed after an external-booking guest's escrow funds (services/payment.ts's
   * webhook). Reuses POST /auth/reset-password (routes/auth.ts) — same mechanism as
   * a normal password reset, just also returns a session so this doubles as the
   * "magic link" the buyer uses to land in their new dashboard. */
  async setPassword(token: string, password: string): Promise<AuthUser> {
    if (API_MODE === "mock") {
      return { userId: "mock-user", email: "guest@monologg.dev", userType: "CLIENT" };
    }
    const data = await authRequest<{ accessToken: string; refreshToken: string; user: AuthUser }>(
      "/reset-password",
      { token, password },
    );
    setSession(data);
    return data.user;
  },
  /** Mock mode preserves today's ungated demo browsing exactly — no login required. */
  isAuthenticated(): boolean {
    if (API_MODE === "mock") return true;
    return accessToken !== null || getStoredRefreshToken() !== null;
  },

  /**
   * Phase 12B: Bridge a Supabase Auth session to an app JWT.
   * Called by AuthCallback after supabase.auth.getSession() returns a real session.
   * In mock mode: returns a demo user immediately (no network call).
   */
  async sessionSync(
    supabaseAccessToken: string,
    userType: "TALENT" | "CLIENT",
    opts: { name?: string; avatarUrl?: string; provider?: "GOOGLE" | "MAGIC_LINK" | "EMAIL_OTP" } = {},
  ): Promise<AuthUser & { isNewUser?: boolean }> {
    if (API_MODE !== "live") {
      const user: AuthUser & { isNewUser?: boolean } = {
        userId: `usr-supabase-${Date.now()}`,
        email: "demo@monologg.dev",
        userType,
        isNewUser: true,
      };
      appStateSync.setLoggedInUser({
        id: user.userId,
        email: user.email,
        name: opts.name ?? (userType === "TALENT" ? "Elias Thorne" : "FilmCraft Studios"),
        userType,
        authProvider: opts.provider ?? "GOOGLE",
        isNewUser: true,
        avatarUrl: opts.avatarUrl,
      });
      return user;
    }
    const data = await authRequest<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser & { isNewUser?: boolean };
    }>("/session/sync", {
      supabaseAccessToken,
      userType,
      name: opts.name,
      avatarUrl: opts.avatarUrl,
      provider: opts.provider ?? "GOOGLE",
    });
    setSession(data);
    const resolvedName = data.user.name || opts.name || data.user.email.split("@")[0];
    const resolvedAvatar = data.user.avatarUrl ?? opts.avatarUrl;
    appStateSync.setLoggedInUser({
      id: data.user.userId,
      email: data.user.email,
      name: resolvedName,
      userType: data.user.userType,
      authProvider: opts.provider ?? "GOOGLE",
      isNewUser: data.user.isNewUser ?? true,
      avatarUrl: resolvedAvatar,
    });
    return { ...data.user, name: resolvedName, avatarUrl: resolvedAvatar };
  },

  /**
   * Phase 12C: Server-side rate-limit gate before calling supabase.auth.signInWithOtp().
   * Returns true if allowed, throws with a 429-style message if within the 60s cooldown.
   * In mock mode: always succeeds (dev/test — no real OTP send).
   */
  async requestOtp(email: string): Promise<void> {
    if (API_MODE !== "live") {
      console.log(`[api-client mock] OTP request gate passed for ${email}`);
      return;
    }
    await authRequest("/otp/request", { email });
  },

  // ── Withdrawal OTP Gate (Phase 12C) ──────────────────────────────────────
  async initiateWithdrawal(input: {
    amount: number;
    currency?: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    idempotencyKey?: string;
  }): Promise<{ withdrawalRequest: { id: string; amount: number; currency: string; status: string }; otpSent: boolean; expiresAt: string }> {
    if (API_MODE !== "live") {
      const mockId = `wdr-${Date.now()}`;
      return {
        withdrawalRequest: {
          id: mockId,
          amount: input.amount,
          currency: input.currency || "NGN",
          status: "PENDING_OTP",
        },
        otpSent: true,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };
    }
    return request("/withdrawals", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async requestWithdrawalOtp(withdrawalRequestId: string): Promise<{ sent: boolean; expiresAt: string }> {
    if (API_MODE !== "live") {
      return { sent: true, expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() };
    }
    return request(`/withdrawals/${withdrawalRequestId}/otp/request`, {
      method: "POST",
    });
  },

  async verifyWithdrawalOtp(
    withdrawalRequestId: string,
    code: string,
  ): Promise<{ success: boolean; withdrawalRequest: { id: string; status: string } }> {
    if (API_MODE !== "live") {
      if (code.length !== 6) throw new Error("Invalid or expired code");
      return {
        success: true,
        withdrawalRequest: { id: withdrawalRequestId, status: "APPROVED" },
      };
    }
    return request(`/withdrawals/${withdrawalRequestId}/otp/verify`, {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },

  async getDevWithdrawalOtp(withdrawalRequestId: string): Promise<{ code: string; expiresAt: string }> {
    if (API_MODE !== "live") {
      return { code: "123456", expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() };
    }
    return request(`/dev/withdrawals/${withdrawalRequestId}/otp`);
  },

  // ── Client dashboard ──────────────────────────────────────────────
  // getClientStats/getShortlistedTalentIds stay mock-only: features.md Phase 5 doesn't
  // define a stats or shortlist resource (no schema/endpoint exists for either yet).
  async getClientStats(): Promise<StatMetric[]> {
    return mocks.CLIENT_STATS;
  },
  /** `filters` (features.md Phase 12A.3 adds the attribute fields) only apply
   * in live mode — mock mode keeps returning the full fixture list unfiltered,
   * same as every other mock-mode screen (no client-side re-filter is layered
   * on top here; ClientDashboard.tsx's own search/niche filtering already
   * happens client-side against whatever this returns, independent of mode). */
  async listTalents(filters: TalentFilters = {}): Promise<Talent[]> {
    if (API_MODE !== "live") return mocks.TALENTS;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) params.set(key, String(value));
    }
    const query = params.toString();
    return requestList(`/talent${query ? `?${query}` : ""}`);
  },
  async listClientProjects(): Promise<ClientProject[]> {
    if (API_MODE === "live") return requestList("/briefs");
    return appStateSync.getClientProjects();
  },
  async listClientOrders(): Promise<Order[]> {
    if (API_MODE === "live") return requestList("/bookings?role=client");
    return mocks.CLIENT_ORDERS;
  },
  async getShortlistedTalentIds(): Promise<string[]> {
    return mocks.SHORTLIST_IDS;
  },
  /** Creates a real Brief (features.md Phase 5; `applicantCap` added Phase 14).
   * Mock mode is a no-op — ProjectBrief.tsx's "Publish" already simulates
   * success locally without this. `status` defaults server-side to DRAFT
   * (Prisma schema) — callers meaning to actually publish (the only path that
   * exists today) must pass "ACTIVE" explicitly, or the brief is created but
   * never shows up in GET /projects' talent-facing browse list. */
  async createBrief(input: {
    projectName: string;
    projectType: string;
    nicheReq: string[];
    budgetAmount: number;
    budgetCurrency: string;
    applicantCap?: number | null;
    status?: "DRAFT" | "ACTIVE" | "IN_REVIEW" | "CLOSED";
  }): Promise<void> {
    if (API_MODE !== "live") {
      const symbol = CODE_TO_SYMBOL[input.budgetCurrency || "NGN"] || "₦";
      const budgetFormatted = input.budgetAmount >= 100
        ? `${symbol}${(input.budgetAmount / 100).toLocaleString()}`
        : `${symbol}${input.budgetAmount.toLocaleString()}`;
      appStateSync.addProject({
        projectName: input.projectName,
        projectType: input.projectType,
        nicheReq: input.nicheReq,
        budget: budgetFormatted,
        budgetAmount: input.budgetAmount,
        budgetCurrency: input.budgetCurrency || "NGN",
        applicantCap: input.applicantCap ?? 10,
      });
      return;
    }
    await request("/briefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  // ── Project applications (features.md Phase 14, FA-2) ──────────────────────
  /** GET /projects — talent browse/search (PWA-14); only ACTIVE briefs are
   * returned, each annotated with the caller's own application (if any). */
  async listProjects(filters: { niche?: string; q?: string; minBudget?: number; maxBudget?: number } = {}): Promise<Project[]> {
    if (API_MODE !== "live") return appStateSync.getProjects();
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) params.set(key, String(value));
    }
    const query = params.toString();
    return requestList(`/projects${query ? `?${query}` : ""}`);
  },
  /** Server re-verifies the cap itself (never trusts the client) — a 409
   * means the brief closed or this talent already applied. */
  async applyToProject(briefId: string, pitch?: string): Promise<void> {
    if (API_MODE !== "live") return;
    await request(`/projects/${briefId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pitch }),
    });
  },
  /** GET /creators/me/applications — PWA-16 status list. */
  async listMyApplications(): Promise<MyApplication[]> {
    if (API_MODE !== "live") return mocks.MY_APPLICATIONS;
    return requestList("/creators/me/applications");
  },
  async withdrawMyApplication(applicationId: string): Promise<void> {
    if (API_MODE !== "live") return;
    await request(`/applications/${applicationId}/withdraw`, { method: "PATCH" });
  },
  /** GET /briefs/:id/applicants — PWA-17, client-side applicant management. */
  async listApplicants(briefId: string): Promise<Applicant[]> {
    if (API_MODE !== "live") return mocks.APPLICANTS;
    return request(`/briefs/${briefId}/applicants`);
  },
  async shortlistApplicant(applicationId: string): Promise<void> {
    if (API_MODE !== "live") return;
    await request(`/applications/${applicationId}/shortlist`, { method: "PATCH" });
  },
  async rejectApplicant(applicationId: string): Promise<void> {
    if (API_MODE !== "live") return;
    await request(`/applications/${applicationId}/reject`, { method: "PATCH" });
  },
  /** Selecting converts the application into a real booking (PENDING_PAYMENT) —
   * the client picks which of the talent's rate cards and which real open
   * slot (fed by the same getOpenSlots endpoint Checkout uses) this
   * engagement is for. */
  async selectApplicant(applicationId: string, input: { rateCardId: string; slotDate: string; slotStart: string; slotEnd: string }): Promise<void> {
    if (API_MODE !== "live") return;
    await request(`/applications/${applicationId}/select`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  // ── Talent dashboard ──────────────────────────────────────────────
  // getTalentStats/listTalentActivity stay mock-only, same reason as getClientStats
  // above. getAvailability also stays mock-only: the real AvailabilityBlock model
  // (per-date, {start,end,booked} slots) is a genuinely different shape from this
  // prototype's fixed weekly grid, which @monologg/types' own doc comment already
  // flags as superseded by Phase 13's real day/time-of-day model — translating one
  // into the other now would be exactly the premature redesign that comment warns
  // against. The real /availability CRUD endpoint exists and is tested; this UI
  // just doesn't consume it yet.
  async getTalentStats(): Promise<StatMetric[]> {
    if (API_MODE !== "live") {
      const bal = appStateSync.getBalance();
      return [
        { kind: "balance", label: "Available Balance", value: `₦${bal.available.toLocaleString()}`, delta: bal.withdrawnTotal > 0 ? `₦${bal.withdrawnTotal.toLocaleString()} withdrawn` : "+12% this month" },
        { kind: "escrow", label: "Pending Escrow", value: `₦${bal.pending.toLocaleString()}`, delta: "2 orders in progress" },
        { kind: "orders", label: "Completed Orders", value: "18", delta: "+3 this week" },
        { kind: "views", label: "Profile Views", value: "1,240", delta: "+18% this month" },
      ];
    }
    return mocks.TALENT_STATS;
  },
  async withdrawFunds(amountNaira: number): Promise<boolean> {
    if (API_MODE !== "live") return appStateSync.withdrawFunds(amountNaira);
    return true;
  },
  async listTalentActivity(): Promise<ActivityItem[]> {
    return mocks.TALENT_ACTIVITY;
  },
  async listServices(): Promise<ServiceRateCard[]> {
    if (API_MODE !== "live") return appStateSync.getServices();
    return requestList("/rate-cards");
  },
  async createService(service: Omit<ServiceRateCard, "id">): Promise<ServiceRateCard> {
    if (API_MODE !== "live") return appStateSync.addService(service);
    return request("/rate-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(service),
    });
  },
  async updateService(id: string, updates: Partial<ServiceRateCard>): Promise<ServiceRateCard | null> {
    if (API_MODE !== "live") return appStateSync.updateService(id, updates);
    return request(`/rate-cards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  },
  async deleteService(id: string): Promise<void> {
    if (API_MODE !== "live") {
      appStateSync.deleteService(id);
      return;
    }
    await request(`/rate-cards/${id}`, { method: "DELETE" });
  },
  async listTalentOrders(): Promise<Order[]> {
    if (API_MODE === "live") return requestList("/bookings?role=talent");
    return mocks.TALENT_ORDERS;
  },

  // ── Availability & calendar events (features.md Phase 13, FA-1) ────────────
  // Server-authoritative: openSlots on every response is exactly what
  // services/availability.ts's getOpenSlots computed — the UI only ever
  // renders it, never recomputes availability itself.
  async getAvailabilityDay(date: string): Promise<DayDetail> {
    if (API_MODE !== "live") return mocks.mockDayDetail(date);
    return request(`/availability/day?date=${date}`);
  },
  /** Creates a new exact-date override block for a day that has none yet.
   * Returns the created row (real `id`, needed for follow-up edits in the
   * same session) in live mode; null in mock mode, where the caller updates
   * its own local state optimistically instead (same pattern Settings.tsx /
   * ProjectBrief.tsx already use for mock-mode writes). */
  async createAvailabilityBlock(input: { date: string; slots: Slot[]; isRecurring?: boolean; recurRule?: string }): Promise<{ id: string } | null> {
    if (API_MODE !== "live") return null;
    return request("/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },
  /** Updates an existing block's slots (or its recurring template) in place. */
  async updateAvailabilityBlock(id: string, input: { slots?: Slot[]; isRecurring?: boolean; recurRule?: string }): Promise<void> {
    if (API_MODE !== "live") return;
    await request(`/availability/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },
  async deleteAvailabilityBlock(id: string): Promise<void> {
    if (API_MODE !== "live") return;
    await request(`/availability/${id}`, { method: "DELETE" });
  },
  async createCalendarEvent(input: { date: string; start: string; end: string; title: string; kind: CalendarEventKind }): Promise<CalendarEvent | null> {
    if (API_MODE !== "live") return null;
    return request("/calendar-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },
  async deleteCalendarEvent(id: string): Promise<void> {
    if (API_MODE !== "live") return;
    await request(`/calendar-events/${id}`, { method: "DELETE" });
  },
  /** Public, no-auth — the booking sheet's ONLY source for what's bookable
   * (features.md Phase 13's own guardrail: the client never computes
   * availability itself). Mock mode reuses the same day-detail fixture so a
   * demo checkout sees consistent open slots. */
  async getOpenSlots(creatorId: string, date: string): Promise<{ start: string; end: string }[]> {
    if (API_MODE !== "live") return mocks.mockDayDetail(date).openSlots;
    const { openSlots } = await request<{ date: string; openSlots: { start: string; end: string }[] }>(
      `/creators/${creatorId}/open-slots?date=${date}`,
    );
    return openSlots;
  },
  /** Public, no-auth — the read-only counterpart to listServices() (which is
   * owner-scoped to the logged-in talent), used by a CLIENT picking a service
   * to book on someone else's storefront. */
  async getCreatorRateCardsPublic(creatorId: string): Promise<PublicRateCard[]> {
    if (API_MODE !== "live") {
      const matched = mocks.TALENTS.find(
        (t) => t.id === creatorId || t.name.toLowerCase().replace(/\s+/g, "-") === creatorId.toLowerCase()
      );
      if (matched) {
        const baseNum = parseInt(matched.price.replace(/[^\d]/g, ""), 10) || 50000;
        return [
          {
            id: `rc-${matched.id}-1`,
            title: `${matched.role} Standard Booking`,
            price: matched.price,
            basePriceAmount: baseNum * 100,
            basePriceCurrency: "NGN",
            delivery: "48 Hours",
          },
          {
            id: `rc-${matched.id}-2`,
            title: `${matched.role} Priority / Rush`,
            price: `₦${Math.round(baseNum * 1.5).toLocaleString()}`,
            basePriceAmount: Math.round(baseNum * 1.5) * 100,
            basePriceCurrency: "NGN",
            delivery: "Same Day",
          },
        ];
      }
      return mocks.PUBLIC_RATE_CARDS;
    }
    return request(`/creators/${creatorId}/rate-cards`);
  },

  // ── Public marketplace profile (features.md Phase 15, FA-3) ────────────────
  // monologg.co/[handle] — reachable logged out, no account. `handle` is the
  // creator's id (no phase's schema adds a real username/slug field yet, the
  // same forward-reference apps/api's routes/mediaKit.ts already documents
  // for its own public creator sub-resource).
  async getPublicStorefront(handle: string): Promise<PublicStorefront> {
    if (API_MODE !== "live") {
      const cleanHandle = handle.toLowerCase().replace(/^seed-creator-/, "").replace(/[^a-z0-9]/g, "");
      const matched = mocks.TALENTS.find(
        (t) =>
          t.id === handle ||
          t.name.toLowerCase().replace(/\s+/g, "-") === handle.toLowerCase() ||
          t.name.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanHandle ||
          (cleanHandle.length > 2 && t.name.toLowerCase().includes(cleanHandle))
      );
      if (matched) {
        const baseNum = parseInt(matched.price.replace(/[^\d]/g, ""), 10) || 50000;
        return {
          ...mocks.PUBLIC_STOREFRONT,
          id: matched.id,
          name: matched.name,
          bio: `Professional ${matched.role} based in ${matched.location}. Specializing in stage and camera performance, voice-over productions, and commercial storytelling.`,
          location: `${matched.location}, Nigeria`,
          nicheLabel: matched.role,
          styleTags: matched.tags && matched.tags.length > 0 ? matched.tags : mocks.PUBLIC_STOREFRONT.styleTags,
          verified: matched.verified,
          rateCards: [
            {
              id: `rc-${matched.id}-1`,
              title: `${matched.role} Standard Booking`,
              price: matched.price,
              basePriceAmount: baseNum * 100,
              basePriceCurrency: "NGN",
              delivery: "48 Hours",
            },
            {
              id: `rc-${matched.id}-2`,
              title: `${matched.role} Priority / Rush`,
              price: `₦${Math.round(baseNum * 1.5).toLocaleString()}`,
              basePriceAmount: Math.round(baseNum * 1.5) * 100,
              basePriceCurrency: "NGN",
              delivery: "Same Day",
            },
          ],
        };
      }
      const tState = appStateSync.getTalentProfile();
      return {
        ...mocks.PUBLIC_STOREFRONT,
        name: tState.name || mocks.PUBLIC_STOREFRONT.name,
        bio: tState.bio || mocks.PUBLIC_STOREFRONT.bio,
        location: tState.location || mocks.PUBLIC_STOREFRONT.location,
        nicheLabel: tState.stageTitle || mocks.PUBLIC_STOREFRONT.nicheLabel,
        styleTags: tState.tags && tState.tags.length > 0 ? tState.tags : mocks.PUBLIC_STOREFRONT.styleTags,
        verified: tState.verified !== undefined ? tState.verified : mocks.PUBLIC_STOREFRONT.verified,
      };
    }
    return request(`/creators/${handle}/public`);
  },
  /** A real, name-derived image (not a data: URI, not a fabricated stock
   * photo) — see apps/api's services/publicProfile.ts for why. Absolute path
   * (not routed through request()) since it's an <img src>/og:image target,
   * never JSON. */
  getOgImageUrl(handle: string): string {
    return `/api/v1/creators/${handle}/og-image.svg`;
  },

  // ── Creator media + AI style-tagging (features.md Phase 7) ────────────────
  // X3: this system only ever produces styleTags. It never sets `verification` —
  // see startKycVerification/getVerificationStatus below for the fully separate
  // identity flow. Mock mode makes no network calls (CreatorOnboarding.tsx runs
  // its own local simulation, matching every other mock-mode screen); only live
  // mode drives real job state.
  async uploadCreatorMedia(file: File, kind: "VIDEO" | "AUDIO"): Promise<{ mediaAssetId: string }> {
    if (API_MODE !== "live") return { mediaAssetId: "mock-media-1" };

    const presigned = await request<{ uploadUrl: string; mediaAssetId: string }>("/creators/me/media/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, sizeBytes: file.size }),
    });
    // `uploadUrl` is already a full API path (e.g. "/api/v1/uploads/local/:token")
    // — fetched directly, not through request(), which would double-prefix it.
    await fetch(presigned.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: file,
    });
    await request(`/creators/me/media/${presigned.mediaAssetId}/confirm`, { method: "POST" });
    return { mediaAssetId: presigned.mediaAssetId };
  },
  /** Polled by the UI to drive the real queued -> tagging -> done/failed state —
   * never a fixed timer. */
  async getMediaTaggingStatus(mediaAssetId: string): Promise<MediaAssetStatus> {
    if (API_MODE !== "live") return { id: mediaAssetId, taggingStatus: "DONE" };
    return request(`/creators/me/media/${mediaAssetId}`);
  },
  async getCreatorProfile(): Promise<CreatorProfile> {
    if (API_MODE !== "live") {
      const state = appStateSync.getTalentProfile();
      return {
        id: "mock-creator",
        name: state.name,
        bio: state.bio,
        location: state.location,
        styleTags: [],
        verification: state.verified ? "VERIFIED" : "UNVERIFIED",
      };
    }
    return request("/creators/me");
  },
  async updateCreatorProfile(
    data: Partial<Pick<CreatorProfile, "name" | "bio" | "location">>,
  ): Promise<CreatorProfile> {
    if (API_MODE !== "live") {
      appStateSync.updateTalentProfile({
        name: data.name ?? undefined,
        bio: data.bio ?? undefined,
        location: data.location ?? undefined,
      });
      return apiClient.getCreatorProfile();
    }
    return request("/creators/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
  async getClientProfile(): Promise<ClientProfile> {
    if (API_MODE !== "live") {
      const state = appStateSync.getClientProfile();
      return {
        id: "mock-client",
        name: state.name,
        orgName: state.orgName,
        orgType: (state.orgType as ClientProfile["orgType"]) || "STUDIO",
        location: state.location,
      };
    }
    return request("/clients/me");
  },
  async updateClientProfile(
    data: Partial<Pick<ClientProfile, "name" | "orgName" | "orgType" | "location">>,
  ): Promise<ClientProfile> {
    if (API_MODE !== "live") {
      appStateSync.updateClientProfile({
        name: data.name ?? undefined,
        orgName: data.orgName ?? undefined,
        orgType: data.orgType ?? undefined,
        location: data.location ?? undefined,
      });
      return apiClient.getClientProfile();
    }
    return request("/clients/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  // ── Media Kit (features.md Phase 12A.1) ─────────────────────────────────────
  async getMediaKitStatus(): Promise<MediaKitStatus> {
    if (API_MODE !== "live") return { creatorId: "mock-creator", mode: "AUTO", uploadUrl: null, uploadSizeBytes: null, autoVersion: 1, autoLastRenderedAt: null };
    return request("/creators/me/media-kit");
  },
  async regenerateMediaKit(): Promise<MediaKitStatus> {
    if (API_MODE !== "live") return { creatorId: "mock-creator", mode: "AUTO", uploadUrl: null, uploadSizeBytes: null, autoVersion: 2, autoLastRenderedAt: new Date().toISOString() };
    return request("/creators/me/media-kit/regenerate", { method: "POST" });
  },
  /** Uploads a PDF override — real magic-byte/size/virus-scan validation happens
   * server-side (services/mediaKit.ts); this just ships the raw bytes, the same
   * "never JSON-wrap a file body" convention uploadCreatorMedia already uses. */
  async uploadMediaKit(file: File): Promise<MediaKitStatus> {
    if (API_MODE !== "live") return { creatorId: "mock-creator", mode: "UPLOAD", uploadUrl: "mock://media-kit-upload.pdf", uploadSizeBytes: file.size, autoVersion: 1, autoLastRenderedAt: null };
    return request("/creators/me/media-kit/upload", {
      method: "POST",
      headers: { "Content-Type": "application/pdf" },
      body: file,
    });
  },
  async revertMediaKitToAuto(): Promise<MediaKitStatus> {
    if (API_MODE !== "live") return { creatorId: "mock-creator", mode: "AUTO", uploadUrl: "mock://media-kit-upload.pdf", uploadSizeBytes: 1024, autoVersion: 1, autoLastRenderedAt: null };
    return request("/creators/me/media-kit/revert", { method: "POST" });
  },
  /** The public download/preview URL — same path whether AUTO or UPLOAD is
   * live, per the spec's "revert brings it back with no URL change." Not
   * fetched through request() (it's a direct browser download/embed target,
   * not a JSON call). */
  getMediaKitPublicUrl(creatorId: string): string {
    return `/api/v1/creators/${creatorId}/media-kit.pdf`;
  },

  // ── Verification video (features.md Phase 12A.2) ────────────────────────────
  // X3-shaped: entirely separate from startKycVerification/getVerificationStatus
  // above (identity KYC) — this is performance/presentation review only.
  async acknowledgeVerificationGuidelines(): Promise<void> {
    if (API_MODE !== "live") return;
    await request("/creators/me/verification/guideline-ack", { method: "POST" });
  },
  /** Server-authoritative duration check happens on the API side
   * (services/verificationRecording.ts) — a > 90s clip comes back as a 422
   * with `reRecord: true`, which the caller surfaces as a re-record prompt,
   * never trusting whatever the client-side recorder's own timer claimed. */
  async uploadVerificationRecording(file: File): Promise<VerificationRecordingStatus> {
    if (API_MODE !== "live") return { id: "mock-recording", url: "mock://verification.mp4", durationSec: 45, guidelineAck: true, status: "IN_REVIEW", reviewerNote: null };
    return request("/creators/me/verification/upload", {
      method: "POST",
      headers: { "Content-Type": "video/mp4" },
      body: file,
    });
  },
  async getVerificationRecordingStatus(): Promise<VerificationRecordingStatus | null> {
    if (API_MODE !== "live") return null;
    return request("/creators/me/verification");
  },

  // ── Physical attributes (features.md Phase 12A.3) ───────────────────────────
  async getMyAttributes(): Promise<PhysicalAttributes | null> {
    if (API_MODE !== "live") return null;
    return request("/creators/me/attributes");
  },
  /** Partial-merge PUT — omitted fields are left as they were server-side
   * (services/attributes.ts). `consentVersion` is required even for a save
   * that only touches one field, since it's the record of having gone
   * through consent at all, not an attribute itself. */
  async updateMyAttributes(input: UpdateAttributesInput): Promise<PhysicalAttributes> {
    if (API_MODE !== "live") {
      const now = new Date().toISOString();
      return { id: "mock-attrs", visibility: input.visibility ?? {}, consentedAt: now, ...input };
    }
    return request("/creators/me/attributes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },
  /** Non-Negotiable #5 — revocable at any time, hard-deletes the row. */
  async deleteMyAttributes(): Promise<void> {
    if (API_MODE !== "live") return;
    await request("/creators/me/attributes", { method: "DELETE" });
  },

  // ── Identity KYC (features.md Phase 7) ─────────────────────────────────────
  // X3: the ONLY system allowed to move `verification` / set the Verified badge.
  async startKycVerification(data: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    country: string;
    idType: string;
    idNumber: string;
  }): Promise<{ verification: VerificationState }> {
    if (API_MODE !== "live") return { verification: "PROCESSING" };
    return request("/creators/me/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
  /** Polled by the UI to reflect a real PROCESSING -> VERIFIED|FAILED transition. */
  async getVerificationStatus(): Promise<{ verification: VerificationState }> {
    if (API_MODE !== "live") return { verification: "UNVERIFIED" };
    return request("/creators/me/verify");
  },

  // ── Notifications (features.md Phase 9) ────────────────────────────────────
  // Mock mode preserves the original two hardcoded panel entries (no network) —
  // only live mode reads real, per-user notifications.
  async listNotifications(): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
    if (API_MODE !== "live") {
      const now = Date.now();
      return {
        notifications: [
          {
            id: "mock-1",
            kind: "booking_created",
            payload: { message: "Brand Agency NG requested a Commercial Voice-Over." },
            readAt: null,
            createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: "mock-2",
            kind: "payment_released",
            payload: { message: "₦120,000 released from escrow for FilmCraft Lagos." },
            readAt: null,
            createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        unreadCount: 2,
      };
    }
    const page = await request<{ data: AppNotification[]; unreadCount: number }>("/notifications?pageSize=50");
    return { notifications: page.data, unreadCount: page.unreadCount };
  },
  async markNotificationRead(id: string): Promise<void> {
    if (API_MODE !== "live") return;
    await request(`/notifications/${id}/read`, { method: "POST" });
  },

  // ── Transaction history (features.md Phase 10) ─────────────────────────────
  async listTransactions(filters: { state?: string; direction?: "payment" | "payout" } = {}): Promise<Transaction[]> {
    if (API_MODE !== "live") return appStateSync.getTransactions();
    const qs = new URLSearchParams();
    if (filters.state) qs.set("state", filters.state);
    if (filters.direction) qs.set("direction", filters.direction);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return requestList(`/transactions${suffix}`);
  },

  // ── Help & Support (features.md Phase 10) ───────────────────────────────────
  async listSupportTickets(): Promise<SupportTicket[]> {
    if (API_MODE !== "live") return appStateSync.getSupportTickets();
    return requestList("/support/tickets");
  },
  async submitSupportTicket(input: { subject: string; message: string }): Promise<SupportTicket | null> {
    if (API_MODE !== "live") return appStateSync.submitSupportTicket(input.subject, input.message);
    return request("/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  // ── Order Room ────────────────────────────────────────────────────
  async getOrderMessages(orderId: string): Promise<OrderMessage[]> {
    if (API_MODE === "live") return requestList(`/order-rooms/${orderId}/messages`);
    return mocks.ORDER_MESSAGES;
  },
  /** Sends a real message (features.md Phase 5). Mock mode returns null — OrderRoom.tsx
   * keeps appending to local state itself, exactly as before this phase. */
  async sendOrderMessage(orderId: string, text: string): Promise<OrderMessage | null> {
    if (API_MODE !== "live") return null;
    return request(`/order-rooms/${orderId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  },

  // ── Booking + checkout (features.md Phase 13's slot-aware booking flow) ────
  /** POST /bookings — the server re-verifies the slot itself (never trusts
   * this call's claim); a 409 means someone else took it first. */
  async createBooking(input: {
    creatorId: string;
    rateCardId: string;
    slotDate: string;
    slotStart: string;
    slotEnd: string;
  }): Promise<CreatedBooking> {
    if (API_MODE !== "live") {
      return {
        id: `booking-${Date.now()}`,
        creatorId: input.creatorId,
        clientId: "mock-client",
        rateCardId: input.rateCardId,
        baseAmount: 12000000,
        currency: "NGN",
        talentFeeAmount: 1200000,
        clientFeeAmount: 1800000,
        slotDate: input.slotDate,
        slotStart: input.slotStart,
        slotEnd: input.slotEnd,
        state: "PENDING_PAYMENT",
      };
    }
    return request("/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },
  async payBooking(bookingId: string): Promise<{ checkoutUrl: string; providerRef: string; status: string }> {
    if (API_MODE !== "live") {
      return {
        checkoutUrl: "mock://paystack-checkout",
        providerRef: `ref-${Date.now()}`,
        status: "success",
      };
    }
    return request(`/bookings/${bookingId}/pay`, { method: "POST" });
  },

  // ── External-visitor guest checkout (features.md Phase 16, FA-5) ───────────
  async createGuestBooking(input: {
    creatorId: string;
    rateCardId: string;
    slotDate: string;
    slotStart: string;
    slotEnd: string;
    contextNote?: string;
    name: string;
    email: string;
  }): Promise<CreatedBooking> {
    if (API_MODE !== "live") {
      return {
        id: `guest-booking-${Date.now()}`,
        creatorId: input.creatorId,
        talentFeeAmount: 1200000,
        clientFeeAmount: 1800000,
        slotDate: input.slotDate,
        slotStart: input.slotStart,
        slotEnd: input.slotEnd,
        state: "PENDING_PAYMENT",
      } as any;
    }
    return request("/public/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },
  async payGuestBooking(bookingId: string): Promise<{ checkoutUrl: string; providerRef: string; status: string }> {
    if (API_MODE !== "live") {
      return {
        checkoutUrl: "mock://paystack-checkout",
        providerRef: `ref-${Date.now()}`,
        status: "success",
      };
    }
    return request(`/public/bookings/${bookingId}/pay`, { method: "POST" });
  },
  async simulateEscrowWebhook(providerRef: string): Promise<boolean> {
    if (API_MODE !== "live") {
      return true;
    }
    try {
      await request("/webhooks/paystack", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-paystack-signature": "dev-mock-signature" },
        body: JSON.stringify({ event: "charge.success", data: { id: Date.now(), reference: providerRef, status: "success" } }),
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Subscribe an email address to the newsletter / marketing waitlist.
   * In mock mode, succeeds immediately; in live mode, POSTs to /api/v1/newsletter/subscribe.
   */
  async subscribeNewsletter(
    email: string,
    source: string = "website_footer",
  ): Promise<{ success: boolean; message?: string }> {
    if (API_MODE !== "live") {
      return { success: true, message: "Subscribed successfully" };
    }
    return request<{ success: boolean; message?: string }>("/newsletter/subscribe", {
      method: "POST",
      body: JSON.stringify({ email, source }),
    });
  },
};

/** The raw Booking row POST /bookings returns — not the display-mapped Order
 * shape (packages/types' Order), since Checkout needs the real computed fee
 * amounts before any display formatting happens. */
export interface CreatedBooking {
  id: string;
  creatorId: string;
  clientId: string;
  rateCardId: string;
  baseAmount: number;
  currency: string;
  talentFeeAmount: number;
  clientFeeAmount: number;
  slotDate: string;
  slotStart: string;
  slotEnd: string;
  state: string;
}

export type ApiClient = typeof apiClient;
