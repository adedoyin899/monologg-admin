import { getMockResponse } from "./demo-data";

export type AdminRole =
  | "SUPER_ADMIN"
  | "OPS"
  | "SUPPORT"
  | "FINANCE"
  | "COMPLIANCE"
  | "VIEWER";

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  status: "ACTIVE" | "INVITED" | "DISABLED";
  authProvider: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminSessionInfo {
  id: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface AdminMeResponse {
  admin: AdminUser;
  permissions: Record<string, { read: boolean; write: boolean }>;
  session: AdminSessionInfo;
  env: {
    environment: string;
    paymentsMode: "TEST" | "LIVE";
  };
}

export interface OverviewFilterOptions {
  from?: string;
  to?: string;
  cohortTag?: string;
  userType?: "ALL" | "TALENT" | "CLIENT";
  currency?: "ALL" | "NGN" | "USD" | "GBP";
}

export interface OverviewResponse {
  period: {
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
  };
  cards: {
    signups: {
      total: number;
      talent: number;
      client: number;
      change: number | null;
    };
    activeUsers: {
      dau: number;
      wau: number;
      mau: number;
    };
    talentActivated: {
      total: number;
      change: number | null;
    };
    clientActivated: {
      total: number;
      change: number | null;
    };
    bookingsCreated: {
      total: number;
      change: number | null;
    };
    escrowLocked: {
      byCurrency: Record<string, number>;
      change: number | null;
    };
    money: {
      byCurrency: Array<{
        currency: string;
        gmv: number;
        escrowHeld: number;
        released: number;
        platformRevenue: number;
        talentEarned: number;
        talentAvailable: number;
        takeRate: number;
      }>;
    };
    openTickets: {
      total: number;
    };
    openDisputes: {
      total: number;
    };
    criticalAlerts: {
      total: number;
    };
  };
  charts: {
    signupsByDay: Array<{
      date: string;
      talent: number;
      client: number;
      total: number;
    }>;
    bookingsByState: Array<{
      state: string;
      count: number;
    }>;
    gmvByDay: Array<{
      date: string;
      amountsByCurrency: Record<string, number>;
    }>;
    activationFunnel: {
      talent: Array<{ stage: string; count: number; conversion: number }>;
      client: Array<{ stage: string; count: number; conversion: number }>;
    };
  };
  freshness: {
    lastRefreshedAt: string;
    isStale: boolean;
    stalenessMinutes: number;
    paymentsMode: "TEST" | "LIVE";
    environment: string;
  };
  criticalAlerts: Array<{
    id: string;
    ruleKey: string;
    message: string;
    severity: string;
    lastSeenAt: string;
  }>;
}

export interface FeedFilterOptions {
  cursor?: string;
  limit?: number;
  eventGroup?: string;
  userType?: string;
  includeTestUsers?: boolean;
}

export interface FeedEventItem {
  id: string;
  name: string;
  eventGroup: string;
  occurredAt: string;
  actorLabel: string;
  userType: string | null;
  country: string | null;
  targetType: "user" | "booking" | "ticket" | null;
  targetId: string | null;
  targetUrl: string | null;
  description: string;
  props: Record<string, unknown>;
}

export interface FeedResponse {
  events: FeedEventItem[];
  nextCursor: string | null;
  hasMore: boolean;
  polledAt: string;
}

export class AdminClient {
  private baseUrl: string;
  private tokenKey = "monologg_admin_token";

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ||
      (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
      "http://localhost:3000";
  }

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.tokenKey, token);
  }

  clearToken(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.tokenKey);
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const isVercelOrDemo =
      typeof window !== "undefined" &&
      Boolean(
        window.location?.hostname?.includes("vercel.app") ||
        process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
        window.location?.search?.includes("demo=true")
      );

    if (isVercelOrDemo && (!process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_DEMO_MODE === "true")) {
      return getMockResponse<T>(path, options, token);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      if (res.status === 401) {
        this.clearToken();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login?error=expired";
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Your session has expired. Sign in again.");
      }

      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.code === "needs_mfa_challenge" || data.code === "needs_mfa_enroll") {
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login/mfa")) {
            window.location.href = "/login/mfa";
          }
        }
        throw new Error(data.error || "Access forbidden.");
      }

      if (!res.ok) {
        if (isVercelOrDemo) {
          return getMockResponse<T>(path, options, token);
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      if (isVercelOrDemo) {
        return getMockResponse<T>(path, options, token);
      }
      throw err;
    }
  }

  async getMe(): Promise<AdminMeResponse> {
    return this.request<AdminMeResponse>("/api/v1/admin/me");
  }

  async getAdmins(): Promise<{ admins: (AdminUser & { lastSession: AdminSessionInfo | null })[] }> {
    return this.request<{ admins: (AdminUser & { lastSession: AdminSessionInfo | null })[] }>(
      "/api/v1/admin/admins",
    );
  }

  async inviteAdmin(email: string, role: AdminRole): Promise<{ admin: AdminUser }> {
    return this.request<{ admin: AdminUser }>("/api/v1/admin/admins/invite", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
  }

  async changeRole(id: string, role: AdminRole): Promise<{ admin: AdminUser }> {
    return this.request<{ admin: AdminUser }>(`/api/v1/admin/admins/${id}/role`, {
      method: "POST",
      body: JSON.stringify({ role }),
    });
  }

  async disableAdmin(id: string, reason?: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      `/api/v1/admin/admins/${id}/disable`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    );
  }

  async getOverview(filters?: OverviewFilterOptions): Promise<OverviewResponse> {
    const params = new URLSearchParams();
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    if (filters?.cohortTag) params.set("cohortTag", filters.cohortTag);
    if (filters?.userType && filters.userType !== "ALL") params.set("userType", filters.userType);
    if (filters?.currency && filters.currency !== "ALL") params.set("currency", filters.currency);
    const qs = params.toString();
    return this.request<OverviewResponse>(`/api/v1/admin/overview${qs ? `?${qs}` : ""}`);
  }

  async getFeed(filters?: FeedFilterOptions): Promise<FeedResponse> {
    const params = new URLSearchParams();
    if (filters?.cursor) params.set("cursor", filters.cursor);
    if (filters?.limit) params.set("limit", filters.limit.toString());
    if (filters?.eventGroup && filters.eventGroup !== "all") params.set("eventGroup", filters.eventGroup);
    if (filters?.userType && filters.userType !== "ALL") params.set("userType", filters.userType);
    if (filters?.includeTestUsers) params.set("includeTestUsers", "true");
    const qs = params.toString();
    return this.request<FeedResponse>(`/api/v1/admin/feed${qs ? `?${qs}` : ""}`);
  }

  // ── M3 Users & Directory ──────────────────────────────────────────────────
  async getUsers(filters?: UserListFilterOptions): Promise<UserListResponse> {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.userType && filters.userType !== "ALL") params.set("userType", filters.userType);
    if (filters?.verification) params.set("verification", filters.verification);
    if (filters?.authProvider) params.set("authProvider", filters.authProvider);
    if (filters?.accountOrigin) params.set("accountOrigin", filters.accountOrigin);
    if (filters?.country) params.set("country", filters.country);
    if (filters?.cohortTag) params.set("cohortTag", filters.cohortTag);
    if (filters?.signupDateFrom) params.set("signupDateFrom", filters.signupDateFrom);
    if (filters?.signupDateTo) params.set("signupDateTo", filters.signupDateTo);
    if (filters?.lastActiveFrom) params.set("lastActiveFrom", filters.lastActiveFrom);
    if (filters?.lastActiveTo) params.set("lastActiveTo", filters.lastActiveTo);
    if (filters?.hasBooking) params.set("hasBooking", filters.hasBooking);
    if (filters?.hasEarnings) params.set("hasEarnings", filters.hasEarnings);
    if (filters?.suspended && filters.suspended !== "ALL") params.set("suspended", filters.suspended);
    if (filters?.cursor) params.set("cursor", filters.cursor);
    if (filters?.limit) params.set("limit", filters.limit.toString());
    if (filters?.sort) params.set("sort", filters.sort);
    if (filters?.order) params.set("order", filters.order);
    if (filters?.includeTestUsers) params.set("includeTestUsers", "true");

    const qs = params.toString();
    return this.request<UserListResponse>(`/api/v1/admin/users${qs ? `?${qs}` : ""}`);
  }

  async getUser(id: string): Promise<User360Response> {
    return this.request<User360Response>(`/api/v1/admin/users/${id}`);
  }

  async revealUser(id: string, reason: string): Promise<UserRevealResponse> {
    return this.request<UserRevealResponse>(`/api/v1/admin/users/${id}/reveal`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async addUserNote(id: string, body: string): Promise<{ note: any }> {
    return this.request<{ note: any }>(`/api/v1/admin/users/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  }

  async suspendUser(id: string, reason: string): Promise<{ success: boolean; message: string; revokedCount: number }> {
    return this.request<{ success: boolean; message: string; revokedCount: number }>(
      `/api/v1/admin/users/${id}/suspend`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    );
  }

  async unsuspendUser(id: string, reason?: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      `/api/v1/admin/users/${id}/unsuspend`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    );
  }

  async revokeUserSessions(id: string): Promise<{ success: boolean; revokedCount: number; message: string }> {
    return this.request<{ success: boolean; revokedCount: number; message: string }>(
      `/api/v1/admin/users/${id}/revoke-sessions`,
      {
        method: "POST",
      },
    );
  }

  async resendUserVerification(id: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      `/api/v1/admin/users/${id}/resend-verification`,
      {
        method: "POST",
      },
    );
  }

  async createUserTicket(
    id: string,
    data: { subject: string; message: string },
  ): Promise<{ ticket: any }> {
    return this.request<{ ticket: any }>(`/api/v1/admin/users/${id}/tickets`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async bulkUpdateUserTags(
    userIds: string[],
    tag: string,
    action: "ADD" | "REMOVE",
  ): Promise<{ success: boolean; count: number; action: string; tag: string }> {
    return this.request<{ success: boolean; count: number; action: string; tag: string }>(
      "/api/v1/admin/users/tags",
      {
        method: "POST",
        body: JSON.stringify({ userIds, tag, action }),
      },
    );
  }

  async getMediaSignedUrl(
    mediaId: string,
  ): Promise<{ id: string; kind: string; signedUrl: string; expiresAt: string }> {
    return this.request<{ id: string; kind: string; signedUrl: string; expiresAt: string }>(
      `/api/v1/admin/media/${mediaId}/signed-url`,
    );
  }

  // ── M5 Bookings & Order Rooms ─────────────────────────────────────────────
  async getBookings(filters?: BookingListFilterOptions): Promise<BookingListResponse> {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.state && filters.state !== "ALL") params.set("state", filters.state);
    if (filters?.origin && filters.origin !== "ALL") params.set("origin", filters.origin);
    if (filters?.currency && filters.currency !== "ALL") params.set("currency", filters.currency);
    if (filters?.niche && filters.niche !== "ALL") params.set("niche", filters.niche);
    if (filters?.talent) params.set("talent", filters.talent);
    if (filters?.client) params.set("client", filters.client);
    if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.set("dateTo", filters.dateTo);
    if (filters?.hasDispute !== undefined) params.set("hasDispute", String(filters.hasDispute));
    if (filters?.stuck !== undefined) params.set("stuck", String(filters.stuck));
    if (filters?.cursor) params.set("cursor", filters.cursor);
    if (filters?.limit) params.set("limit", filters.limit.toString());

    const qs = params.toString();
    return this.request<BookingListResponse>(`/api/v1/admin/bookings${qs ? `?${qs}` : ""}`);
  }

  async getBooking(id: string): Promise<BookingDetailResponse> {
    return this.request<BookingDetailResponse>(`/api/v1/admin/bookings/${id}`);
  }

  // ── M6 Finance, Payments, Withdrawals & Earnings ──────────────────────────
  async getFinanceSummary(filters?: { dateFrom?: string; dateTo?: string }): Promise<FinanceSummaryResponse> {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.set("dateTo", filters.dateTo);
    const qs = params.toString();
    return this.request<FinanceSummaryResponse>(`/api/v1/admin/finance/summary${qs ? `?${qs}` : ""}`);
  }

  async getPayments(filters?: PaymentListFilterOptions): Promise<PaymentListResponse> {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.status && filters.status !== "ALL") params.set("status", filters.status);
    if (filters?.provider && filters.provider !== "ALL") params.set("provider", filters.provider);
    if (filters?.currency && filters.currency !== "ALL") params.set("currency", filters.currency);
    if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.set("dateTo", filters.dateTo);
    if (filters?.cursor) params.set("cursor", filters.cursor);
    if (filters?.limit) params.set("limit", filters.limit.toString());
    const qs = params.toString();
    return this.request<PaymentListResponse>(`/api/v1/admin/payments${qs ? `?${qs}` : ""}`);
  }

  async getPayment(id: string): Promise<PaymentDetailResponse> {
    return this.request<PaymentDetailResponse>(`/api/v1/admin/payments/${id}`);
  }

  async getPaymentRawWebhook(id: string, reason: string): Promise<{ paymentId: string; events: Array<{ id: string; type: string; eventId: string; raw: any; createdAt: string }> }> {
    return this.request<{ paymentId: string; events: Array<{ id: string; type: string; eventId: string; raw: any; createdAt: string }> }>(
      `/api/v1/admin/payments/${id}/raw`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      }
    );
  }

  async getFinanceMismatches(): Promise<{ mismatches: any[]; count: number }> {
    return this.request<{ mismatches: any[]; count: number }>("/api/v1/admin/finance/mismatches");
  }

  async getWithdrawals(filters?: WithdrawalListFilterOptions): Promise<WithdrawalListResponse> {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.status && filters.status !== "ALL") params.set("status", filters.status);
    if (filters?.currency && filters.currency !== "ALL") params.set("currency", filters.currency);
    if (filters?.cursor) params.set("cursor", filters.cursor);
    if (filters?.limit) params.set("limit", filters.limit.toString());
    const qs = params.toString();
    return this.request<WithdrawalListResponse>(`/api/v1/admin/withdrawals${qs ? `?${qs}` : ""}`);
  }

  async getEarnings(currency?: string): Promise<EarningsResponse> {
    const params = new URLSearchParams();
    if (currency && currency !== "ALL") params.set("currency", currency);
    const qs = params.toString();
    return this.request<EarningsResponse>(`/api/v1/admin/finance/earnings${qs ? `?${qs}` : ""}`);
  }

  // ── Support & Complaints (PRD M7 / Phase A8) ─────────────────────────────
  async getTickets(filters?: TicketListFilterOptions): Promise<TicketListResponse> {
    const params = new URLSearchParams();
    if (filters?.view) params.set("view", filters.view);
    if (filters?.category && filters.category !== "ALL") params.set("category", filters.category);
    if (filters?.priority && filters.priority !== "ALL") params.set("priority", filters.priority);
    if (filters?.status && filters.status !== "ALL") params.set("status", filters.status);
    if (filters?.source && filters.source !== "ALL") params.set("source", filters.source);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.set("dateTo", filters.dateTo);
    if (filters?.cursor) params.set("cursor", filters.cursor);
    if (filters?.limit) params.set("limit", String(filters.limit));

    const qs = params.toString();
    return this.request<TicketListResponse>(`/api/v1/admin/tickets${qs ? `?${qs}` : ""}`);
  }

  async getTicket(id: string): Promise<TicketDetailResponse> {
    return this.request<TicketDetailResponse>(`/api/v1/admin/tickets/${id}`);
  }

  async getCannedReplies(): Promise<{ cannedReplies: CannedReplyItem[] }> {
    return this.request<{ cannedReplies: CannedReplyItem[] }>("/api/v1/admin/tickets/canned-replies");
  }

  async replyTicket(id: string, body: string): Promise<{ message: TicketMessageItem }> {
    return this.request<{ message: TicketMessageItem }>(`/api/v1/admin/tickets/${id}/reply`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  }

  async addTicketNote(id: string, body: string): Promise<{ message: TicketMessageItem }> {
    return this.request<{ message: TicketMessageItem }>(`/api/v1/admin/tickets/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  }

  async assignTicket(id: string, adminId: string | null): Promise<{ status: string; assignedAdminId: string | null }> {
    return this.request<{ status: string; assignedAdminId: string | null }>(`/api/v1/admin/tickets/${id}/assign`, {
      method: "POST",
      body: JSON.stringify({ adminId }),
    });
  }

  async updateTicketPriority(id: string, priority: string): Promise<{ status: string; priority: string }> {
    return this.request<{ status: string; priority: string }>(`/api/v1/admin/tickets/${id}/priority`, {
      method: "POST",
      body: JSON.stringify({ priority }),
    });
  }

  async updateTicketStatus(
    id: string,
    status: string,
    resolutionNote?: string,
  ): Promise<{ status: string; statusUpdate: string }> {
    return this.request<{ status: string; statusUpdate: string }>(`/api/v1/admin/tickets/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status, resolutionNote }),
    });
  }

  async createTicketOnBehalf(payload: CreateTicketOnBehalfPayload): Promise<{ ticket: any }> {
    return this.request<{ ticket: any }>("/api/v1/admin/tickets/on-behalf", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // ── Disputes & Conversation Review (PRD M8 / Phase A9) ───────────────────
  async getDisputes(filters?: {
    status?: string;
    search?: string;
    cursor?: string;
    limit?: number;
  }): Promise<DisputeListResponse> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== "ALL") params.set("status", filters.status);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.cursor) params.set("cursor", filters.cursor);
    if (filters?.limit) params.set("limit", String(filters.limit));
    const qs = params.toString();
    return this.request<DisputeListResponse>(`/api/v1/admin/disputes${qs ? `?${qs}` : ""}`);
  }

  async getDispute(id: string): Promise<DisputeDetailResponse> {
    return this.request<DisputeDetailResponse>(`/api/v1/admin/disputes/${id}`);
  }

  async reviewDisputeChat(id: string, reason: string): Promise<DisputeChatReviewResponse> {
    return this.request<DisputeChatReviewResponse>(`/api/v1/admin/disputes/${id}/review-chat`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async requestDisputeEvidence(
    id: string,
    payload: { targetParty: "TALENT" | "CLIENT"; note: string },
  ): Promise<{ success: boolean; dispute: any }> {
    return this.request<{ success: boolean; dispute: any }>(`/api/v1/admin/disputes/${id}/request-evidence`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async resolveDispute(
    id: string,
    payload: {
      resolution: "RELEASE_TO_TALENT" | "REFUND_CLIENT" | "SPLIT";
      resolutionNote: string;
      splitTalentPct?: number;
    },
    idempotencyKey?: string,
  ): Promise<DisputeResolveResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
    return this.request<DisputeResolveResponse>(`/api/v1/admin/disputes/${id}/resolve`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  }

  async approveDispute(
    id: string,
    payload?: { resolutionNote?: string },
    idempotencyKey?: string,
  ): Promise<DisputeResolveResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
    return this.request<DisputeResolveResponse>(`/api/v1/admin/disputes/${id}/approve`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload ?? {}),
    });
  }

  // ── Verifications & Compliance Queue (PRD M9 / Phase A10) ───────────────────
  async getVerificationQueue(filters?: {
    status?: string;
    niche?: string;
    search?: string;
    isOverdue?: boolean;
    dateFrom?: string;
    dateTo?: string;
    cursor?: string;
    limit?: number;
  }): Promise<VerificationQueueResponse> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== "ALL") params.set("status", filters.status);
    if (filters?.niche) params.set("niche", filters.niche);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.isOverdue) params.set("isOverdue", "true");
    if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.set("dateTo", filters.dateTo);
    if (filters?.cursor) params.set("cursor", filters.cursor);
    if (filters?.limit) params.set("limit", String(filters.limit));
    const qs = params.toString();
    return this.request<VerificationQueueResponse>(`/api/v1/admin/verifications${qs ? `?${qs}` : ""}`);
  }

  async getVerificationMetrics(): Promise<VerificationMetricsResponse> {
    return this.request<VerificationMetricsResponse>("/api/v1/admin/verifications/metrics");
  }

  async getVerificationDetail(id: string): Promise<VerificationDetailResponse> {
    return this.request<VerificationDetailResponse>(`/api/v1/admin/verifications/${id}`);
  }

  async getVerificationSignedUrl(id: string): Promise<{ id: string; signedUrl: string; expiresAt: string }> {
    return this.request<{ id: string; signedUrl: string; expiresAt: string }>(`/api/v1/admin/verifications/${id}/signed-url`);
  }

  async submitVerificationDecision(
    id: string,
    payload: {
      decision: "APPROVE" | "NEEDS_RERECORD";
      reasonTemplate?: string;
      reviewerNote?: string;
    },
  ): Promise<{ status: string; recording: any }> {
    return this.request<{ status: string; recording: any }>(`/api/v1/admin/verifications/${id}/decision`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // ── Analytics (PRD M4 & M10 / Phase A11) ──────────────────────────────────
  async getAcquisitionAnalytics(): Promise<AcquisitionData> {
    return this.request<AcquisitionData>("/api/v1/admin/acquisition");
  }

  async getFunnelAnalytics(
    funnelId?: "TALENT_ONBOARDING" | "CLIENT_LIFECYCLE" | "EXTERNAL_BOOKING",
  ): Promise<FunnelData> {
    const qs = funnelId ? `?funnelId=${funnelId}` : "";
    return this.request<FunnelData>(`/api/v1/admin/funnels${qs}`);
  }

  async getRetentionAnalytics(
    userType?: "ALL" | "TALENT" | "CLIENT",
  ): Promise<RetentionData> {
    const qs = userType ? `?userType=${userType}` : "";
    return this.request<RetentionData>(`/api/v1/admin/retention${qs}`);
  }

  async getTrafficAnalytics(): Promise<TrafficData> {
    return this.request<TrafficData>("/api/v1/admin/traffic");
  }

  async getFeatureAdoptionAnalytics(): Promise<FeatureAdoptionData> {
    return this.request<FeatureAdoptionData>("/api/v1/admin/features");
  }

  async getMarketplaceHealthAnalytics(): Promise<MarketplaceHealthData> {
    return this.request<MarketplaceHealthData>("/api/v1/admin/marketplace");
  }

  async triggerKpiSnapshot(day?: string): Promise<{ status: string; snapshotsRecorded: number }> {
    return this.request<{ status: string; snapshotsRecorded: number }>("/api/v1/admin/kpi/snapshot", {
      method: "POST",
      body: JSON.stringify({ day }),
    });
  }

  // ── Alerts & System Health (PRD M11 / Phase A12) ───────────────────────────
  async getAlerts(filters?: {
    severity?: string;
    status?: string;
    ruleKey?: string;
    limit?: number;
  }): Promise<AlertListResponse> {
    const params = new URLSearchParams();
    if (filters?.severity && filters.severity !== "ALL") params.set("severity", filters.severity);
    if (filters?.status && filters.status !== "ALL") params.set("status", filters.status);
    if (filters?.ruleKey) params.set("ruleKey", filters.ruleKey);
    if (filters?.limit) params.set("limit", String(filters.limit));
    const qs = params.toString();
    return this.request<AlertListResponse>(`/api/v1/admin/alerts${qs ? `?${qs}` : ""}`);
  }

  async ackAlert(id: string): Promise<{ status: string; alertId: string }> {
    return this.request<{ status: string; alertId: string }>(`/api/v1/admin/alerts/${id}/ack`, {
      method: "POST",
    });
  }

  async resolveAlert(id: string, note: string): Promise<{ status: string; alertId: string }> {
    return this.request<{ status: string; alertId: string }>(`/api/v1/admin/alerts/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  }

  async triggerAlertsEvaluation(): Promise<{ status: string; triggered: number; autoResolved: number }> {
    return this.request<{ status: string; triggered: number; autoResolved: number }>("/api/v1/admin/alerts/evaluate", {
      method: "POST",
    });
  }

  async getSystemHealth(): Promise<SystemHealthResponse> {
    return this.request<SystemHealthResponse>("/api/v1/admin/health");
  }

  // ── Audit Trail Log (PRD M1 / AD-29 / Phase A13) ───────────────────────────
  async getAuditLogs(filters?: {
    adminId?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    cursor?: string;
  }): Promise<AdminAuditListResponse> {
    const params = new URLSearchParams();
    if (filters?.adminId) params.set("adminId", filters.adminId);
    if (filters?.action && filters.action !== "ALL") params.set("action", filters.action);
    if (filters?.targetType && filters.targetType !== "ALL") params.set("targetType", filters.targetType);
    if (filters?.targetId) params.set("targetId", filters.targetId);
    if (filters?.startDate) params.set("startDate", filters.startDate);
    if (filters?.endDate) params.set("endDate", filters.endDate);
    if (filters?.limit) params.set("limit", String(filters.limit));
    if (filters?.cursor) params.set("cursor", filters.cursor);
    const qs = params.toString();
    return this.request<AdminAuditListResponse>(`/api/v1/admin/audit${qs ? `?${qs}` : ""}`);
  }

  // ── Exports (PRD M12 / AD-30 / Phase A13) ──────────────────────────────────
  async getExports(): Promise<AdminExportListResponse> {
    return this.request<AdminExportListResponse>("/api/v1/admin/exports");
  }

  async createExport(
    type: ExportType,
    reason: string,
    unmaskPii = false,
    filters?: Record<string, any>,
  ): Promise<{ status: string; jobId: string; exportType: string; message: string }> {
    return this.request<{ status: string; jobId: string; exportType: string; message: string }>(
      "/api/v1/admin/exports",
      {
        method: "POST",
        body: JSON.stringify({ type, reason, unmaskPii, filters }),
      },
    );
  }

  // ── Settings (PRD M12.3 / AD-32 / Phase A13) ───────────────────────────────
  async getSettings(): Promise<PlatformSettingsResponse> {
    return this.request<PlatformSettingsResponse>("/api/v1/admin/settings");
  }
}

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  maskedEmail: string;
  phone: string;
  type: "TALENT" | "CLIENT";
  userType: "TALENT" | "CLIENT";
  authProvider: string;
  accountOrigin: string;
  signedUp: string;
  createdAt: string;
  lastActive: string | null;
  lastActiveAt: string | null;
  country: string | null;
  source: string;
  verification: string;
  bookings: number;
  tags: string[];
  suspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
}

export interface UserListFilterOptions {
  search?: string;
  userType?: "ALL" | "TALENT" | "CLIENT";
  verification?: string;
  authProvider?: string;
  accountOrigin?: string;
  country?: string;
  cohortTag?: string;
  signupDateFrom?: string;
  signupDateTo?: string;
  lastActiveFrom?: string;
  lastActiveTo?: string;
  hasBooking?: string;
  hasEarnings?: string;
  suspended?: "ALL" | "true" | "false";
  cursor?: string;
  limit?: number;
  sort?: "createdAt" | "lastActiveAt";
  order?: "asc" | "desc";
  includeTestUsers?: boolean;
}

export interface UserListResponse {
  users: UserListItem[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

export interface User360Response {
  overview: {
    id: string;
    name: string;
    email: string;
    phone: string;
    userType: "TALENT" | "CLIENT";
    authProvider: string;
    accountOrigin: string;
    createdAt: string;
    lastActiveAt: string | null;
    suspended: boolean;
    suspendedAt: string | null;
    suspendedReason: string | null;
    acquisition: {
      firstSeenAt: string | null;
      landingPath: string | null;
      referrerDomain: string | null;
      utmSource: string | null;
      utmMedium: string | null;
      utmCampaign: string | null;
      referralCodeUsed: string | null;
      signupCountry: string | null;
      signupDeviceClass: string | null;
    } | null;
    tags: string[];
    notes: Array<{
      id: string;
      adminId: string;
      body: string;
      createdAt: string;
    }>;
  };
  profile: {
    name: string;
    userType: "TALENT" | "CLIENT";
    niche?: string;
    location?: string;
    bio?: string | null;
    avatarUrl?: string | null;
    badges?: { celebrityBadge: boolean };
    styleTags?: string[];
    verification?: string;
    mediaKitMode?: string;
    rateCards?: Array<{
      id: string;
      serviceTitle: string;
      tier?: string;
      priceAmount?: number;
      currency?: string;
    }>;
    availabilitySummary?: { hasCalendarConnected: boolean };
    media?: Array<{
      id: string;
      kind: string;
      url: string;
      sizeBytes: number;
      durationSec: number | null;
      taggingStatus: string;
      createdAt: string;
      previewUrl: string;
    }>;
    attributes?: {
      completeness: {
        filled: number;
        total: number;
        percentage: number;
      };
      values: Record<string, { value: string | null; visibility: string }>;
    };
    orgName?: string | null;
    orgType?: string | null;
  };
  calendar: {
    connection: {
      connected: boolean;
      provider: string | null;
      connectedAt: string | null;
    };
  };
  bookings: Array<{
    id: string;
    engagementType: string;
    slotDate: string;
    slotStart: string;
    slotEnd: string;
    baseAmount: number;
    currency: string;
    talentFeeAmount: number;
    clientFeeAmount: number;
    state: string;
    origin: string;
    createdAt: string;
    otherPartyName: string;
  }>;
  projects: Array<{
    id: string;
    briefId?: string;
    projectName?: string;
    projectType?: string;
    budgetAmount?: number;
    budgetCurrency?: string;
    pitch?: string | null;
    status: string;
    applicantCap?: number | null;
    applicationsOpen?: boolean;
    applicationCount?: number;
    createdAt: string;
  }>;
  money: {
    label: string;
    byCurrency: Record<
      string,
      {
        currency: string;
        earned: number;
        escrowHeld: number;
        withdrawn: number;
        pendingWithdrawal: number;
        feesPaid: number;
        totalSpend: number;
      }
    >;
    withdrawals: Array<{
      id: string;
      amount: number;
      currency: string;
      bankName: string;
      accountNumber: string;
      accountName: string;
      status: string;
      flagged: boolean;
      flagReason: string | null;
      createdAt: string;
    }>;
  };
  notifications: Array<{
    id: string;
    kind: string;
    createdAt: string;
    readAt: string | null;
    isRead: boolean;
    payload: any;
  }>;
  activity: Array<{
    id: string;
    occurredAt: string;
    name: string;
    source: string;
    path: string | null;
    country: string | null;
    deviceClass: string | null;
    props: any;
  }>;
  support: {
    tickets: Array<{
      id: string;
      subject: string;
      message: string;
      status: string;
      createdAt: string;
    }>;
  };
  auth: {
    authProvider: string;
    supabaseUserId: string | null;
    activeSessionCount: number;
    authEvents: Array<{
      id: string;
      provider: string;
      event: string;
      ipHash: string | null;
      userAgent: string | null;
      createdAt: string;
    }>;
  };
}

export interface UserRevealResponse {
  unmaskedName: string;
  unmaskedEmail: string;
  unmaskedPhone: string | null;
  attributes: Record<string, { value: string | null; visibility: string }>;
  revealedAt: string;
}

export interface BookingListFilterOptions {
  state?: string;
  origin?: string;
  currency?: string;
  niche?: string;
  dateFrom?: string;
  dateTo?: string;
  talent?: string;
  client?: string;
  hasDispute?: string | boolean;
  stuck?: string | boolean;
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface BookingListItem {
  id: string;
  state: string;
  origin: string;
  currency: string;
  baseAmount: number;
  clientFeeAmount: number;
  talentFeeAmount: number;
  clientTotal: number;
  talentNet: number;
  slotDate: string;
  slotStart: string;
  slotEnd: string;
  engagementType: string;
  recurrence: string | null;
  meetUrl: string | null;
  contextNote: string | null;
  slotHoldExpiresAt: string | null;
  createdAt: string;
  talent: {
    id: string;
    userId: string;
    name: string;
    niche: string;
    avatarUrl: string | null;
    referralCode: string | null;
  };
  client: {
    id: string;
    userId: string;
    name: string;
    orgName: string | null;
    avatarUrl: string | null;
  };
  service: {
    id: string | null;
    title: string;
  };
  payment: {
    id: string | null;
    status: string | null;
    provider: string | null;
    providerRef: string | null;
    escrowHeld: boolean;
    amount: number | null;
  } | null;
  ageInState: {
    ms: number;
    seconds: number;
    human: string;
  };
  isStuck: boolean;
  stuckReason: string | null;
  hasDispute: boolean;
}

export interface BookingListResponse {
  bookings: BookingListItem[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

export interface BookingTimelineItem {
  id: string;
  type: "STATE_CHANGE" | "PAYMENT_EVENT" | "SYSTEM_MESSAGE" | "MILESTONE" | "GAP";
  title: string;
  description: string;
  timestamp: string;
  actor?: string;
  source?: string;
  isGap?: boolean;
  metadata?: Record<string, unknown>;
}

export interface OrderRoomMetadata {
  exists: boolean;
  totalMessages: number;
  countsByKind: {
    TEXT: number;
    VOICE: number;
    DOCUMENT: number;
    CALL: number;
    SYSTEM: number;
  };
  fileCount: number;
  callLinks: string[];
  lastActivityAt: string | null;
}

export interface BookingDetailResponse {
  booking: {
    id: string;
    state: string;
    origin: string;
    currency: string;
    baseAmount: number;
    clientFeeAmount: number;
    talentFeeAmount: number;
    clientTotal: number;
    talentNet: number;
    feeBreakdownLabel: string;
    slotDate: string;
    slotStart: string;
    slotEnd: string;
    engagementType: string;
    recurrence: string | null;
    meetUrl: string | null;
    contextNote: string | null;
    slotHoldExpiresAt: string | null;
    createdAt: string;
    talent: {
      id: string;
      userId: string;
      name: string;
      email: string;
      phone: string;
      niche: string;
      bio: string | null;
      avatarUrl: string | null;
      celebrityBadge: boolean;
      referralCode: string | null;
    };
    client: {
      id: string;
      userId: string;
      name: string;
      email: string;
      phone: string;
      orgName: string | null;
      orgType: string | null;
      avatarUrl: string | null;
    };
    service: {
      id: string | null;
      title: string;
      deliveryTimeline: number | null;
    };
    payment: {
      id: string | null;
      status: string | null;
      provider: string | null;
      providerRef: string | null;
      escrowHeld: boolean;
      amount: number | null;
      currency: string | null;
      createdAt: string | null;
    } | null;
    ageInState: {
      ms: number;
      seconds: number;
      human: string;
    };
    isStuck: boolean;
    stuckReason: string | null;
    hasDispute: boolean;
    canReviewConversation: boolean;
    reviewDisabledReason: string | null;
    disputeDetail?: {
      status: string;
      subject?: string;
      ticketId?: string;
    } | null;
  };
  orderRoom: OrderRoomMetadata;
  timeline: BookingTimelineItem[];
}

export interface CurrencyFinanceSummary {
  currency: string;
  gmv: number;
  escrowHeld: number;
  released: number;
  refunded: number;
  platformRevenue: number;
  talentFees: number;
  clientFees: number;
  takeRatePct: number;
  averageBookingValue: number;
  paymentFailureRatePct: number;
  totalBookings: number;
  totalPayments: number;
  failedPayments: number;
}

export interface FinanceSummaryResponse {
  mode: "TEST" | "LIVE";
  summaries: Record<string, CurrencyFinanceSummary>;
  currencies: string[];
  mismatchesCount: number;
  recentMismatches: Array<{
    type: string;
    severity: string;
    paymentId?: string | null;
    bookingId?: string | null;
    amount?: number | null;
    currency?: string | null;
    description: string;
    detectedAt: string;
  }>;
}

export interface PaymentListFilterOptions {
  status?: string;
  provider?: string;
  currency?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface PaymentListItem {
  id: string;
  bookingId: string;
  bookingState: string;
  payer: {
    id: string;
    name: string;
    orgName: string | null;
    email: string;
  };
  creator: {
    id: string;
    name: string;
    email: string;
  };
  provider: string;
  providerRef: string | null;
  status: string;
  amount: number;
  currency: string;
  platformFee: number;
  clientFee: number;
  talentFee: number;
  escrowHeld: boolean;
  createdAt: string;
}

export interface PaymentListResponse {
  payments: PaymentListItem[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

export interface PaymentDetailResponse {
  payment: {
    id: string;
    bookingId: string;
    provider: string;
    providerRef: string | null;
    status: string;
    escrowHeld: boolean;
    amount: number;
    currency: string;
    createdAt: string;
    platformRevenue: number;
    talentFee: number;
    clientFee: number;
    feeBreakdownLabel: string;
  };
  booking: {
    id: string;
    state: string;
    origin: string;
    slotDate: string | null;
    baseAmount: number;
    currency: string;
    client: {
      name: string;
      orgName: string | null;
      email: string;
      phone: string;
    };
    talent: {
      name: string;
      email: string;
      phone: string;
    };
  } | null;
  events: Array<{
    id: string;
    type: string;
    eventId: string;
    createdAt: string;
    isDuplicate: boolean;
    processingResult: string;
  }>;
}

export interface WithdrawalListFilterOptions {
  status?: string;
  currency?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface WithdrawalListItem {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  amount: number;
  currency: string;
  state: string;
  requestedTime: string;
  bank: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
  otpStatus: "requested" | "verified" | "expired" | "locked" | "none";
  providerReference: string | null;
  failureReason: string | null;
  flagged: boolean;
  flaggedAt: string | null;
}

export interface WithdrawalListResponse {
  withdrawals: WithdrawalListItem[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

export interface EarningsResponse {
  label: string;
  currencies: string[];
  topEarners: Record<
    string,
    Array<{
      creatorId: string;
      userId: string;
      name: string;
      avatarUrl: string | null;
      currency: string;
      earned: number;
      withdrawn: number;
      pending: number;
      available: number;
    }>
  >;
  topSpenders: Record<
    string,
    Array<{
      clientId: string;
      userId: string;
      name: string;
      orgName: string | null;
      avatarUrl: string | null;
      currency: string;
      spend: number;
      bookingsCount: number;
    }>
  >;
}

export interface TicketListItem {
  id: string;
  number: string;
  rawNumber?: number | null;
  subject: string;
  message: string;
  category: string;
  priority: string;
  status: string;
  source: string;
  userId: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
    userType: string;
  } | null;
  reporterEmail?: string | null;
  assignedAdminId?: string | null;
  assignedAdmin?: {
    id: string;
    email: string;
  } | null;
  bookingId?: string | null;
  disputeId?: string | null;
  firstResponseAt?: string | null;
  resolvedAt?: string | null;
  slaDueAt: string;
  isBreached: boolean;
  timeToFirstResponseMs?: number | null;
  slaRemainingMs: number;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TicketListResponse {
  tickets: TicketListItem[];
  counts: {
    mine: number;
    unassigned: number;
    urgent: number;
    waiting_user: number;
    all: number;
  };
  pagination: {
    total: number;
    hasMore: boolean;
    nextCursor?: string | null;
  };
}

export interface TicketListFilterOptions {
  view?: "mine" | "unassigned" | "urgent" | "waiting_user" | "all";
  category?: string;
  priority?: string;
  status?: string;
  source?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  limit?: number;
}

export interface TicketMessageItem {
  id: string;
  ticketId: string;
  authorType?: string;
  authorId?: string | null;
  senderId?: string | null;
  senderRole?: string;
  body: string;
  isInternal: boolean;
  attachments?: any;
  createdAt: string;
}

export interface TicketDetailResponse {
  ticket: {
    id: string;
    number: string;
    rawNumber?: number | null;
    subject: string;
    message: string;
    category: string;
    priority: string;
    status: string;
    source: string;
    userId: string;
    user: {
      id: string;
      email: string;
      phone?: string | null;
      name?: string | null;
      userType: string;
      verification?: string;
      createdAt: string;
    } | null;
    reporterEmail?: string | null;
    assignedAdminId?: string | null;
    assignedAdmin?: {
      id: string;
      email: string;
    } | null;
    bookingId?: string | null;
    linkedBooking?: {
      id: string;
      state: string;
      origin: string;
      currency: string;
      baseAmount: number;
      talentFeeAmount: number;
      clientFeeAmount: number;
      talentName: string;
      clientName: string;
      createdAt: string;
    } | null;
    disputeId?: string | null;
    firstResponseAt?: string | null;
    resolvedAt?: string | null;
    resolutionNote?: string | null;
    slaDueAt: string;
    isBreached: boolean;
    timeToFirstResponseMs?: number | null;
    slaRemainingMs: number;
    createdAt: string;
    updatedAt: string;
    messages: TicketMessageItem[];
  };
}

export interface CannedReplyItem {
  id: string;
  title: string;
  body: string;
}

export interface CreateTicketOnBehalfPayload {
  userId: string;
  subject: string;
  message: string;
  category?: string;
  priority?: string;
  source?: string;
  bookingId?: string;
}

// ── Dispute Interfaces (PRD M8 / Phase A9) ──────────────────────────────────
export interface DisputeListItem {
  id: string;
  bookingId: string;
  openedByUserId: string;
  openedByRole: "TALENT" | "CLIENT";
  reason: string;
  description: string;
  status: "OPEN" | "UNDER_REVIEW" | "AWAITING_EVIDENCE" | "RESOLVED";
  resolution?: string | null;
  splitTalentPct?: number | null;
  resolutionNote?: string | null;
  resolvedByAdminId?: string | null;
  approvedByAdminId?: string | null;
  openedAt: string;
  resolvedAt?: string | null;
  ageHours: number;
  ageDays: number;
  isOverdue: boolean;
  isFourEyesRequired: boolean;
  booking?: {
    id: string;
    state: string;
    currency: string;
    baseAmount: number;
    talentFeeAmount: number;
    clientFeeAmount: number;
    creator?: {
      id: string;
      userId: string;
      name: string;
    };
    client?: {
      id: string;
      userId: string;
      name: string;
      orgName?: string | null;
    };
    payment?: {
      id: string;
      status: string;
      amount: number;
      currency: string;
      provider: string;
    } | null;
  } | null;
}

export interface DisputeListResponse {
  disputes: DisputeListItem[];
  nextCursor: string | null;
  totalCount: number;
}

export interface DisputeDetailResponse {
  dispute: {
    id: string;
    bookingId: string;
    openedByUserId: string;
    openedByRole: "TALENT" | "CLIENT";
    reason: string;
    description: string;
    status: "OPEN" | "UNDER_REVIEW" | "AWAITING_EVIDENCE" | "RESOLVED";
    resolution?: string | null;
    splitTalentPct?: number | null;
    resolutionNote?: string | null;
    resolvedByAdminId?: string | null;
    approvedByAdminId?: string | null;
    evidenceRequestedAt?: string | null;
    openedAt: string;
    resolvedAt?: string | null;
    isOverdue: boolean;
    fourEyes: {
      required: boolean;
      thresholdMinor: number;
      isApproved: boolean;
      resolvedByAdminId?: string | null;
      approvedByAdminId?: string | null;
    };
  };
  booking?: {
    id: string;
    state: string;
    currency: string;
    baseAmount: number;
    talentFeeAmount: number;
    clientFeeAmount: number;
    slotDate: string;
    creator?: {
      id: string;
      userId: string;
      name: string;
    };
    client?: {
      id: string;
      userId: string;
      name: string;
      orgName?: string | null;
    };
    payment?: {
      id: string;
      status: string;
      amount: number;
      currency: string;
      provider: string;
      providerRef?: string | null;
      escrowHeld: boolean;
    } | null;
  } | null;
  deliveryFiles: Array<{
    id: string;
    senderId: string;
    content: string;
    createdAt: string;
  }>;
  timeline: Array<{
    timestamp: string;
    title: string;
    detail: string;
    source: string;
  }>;
  linkedTickets: Array<{
    id: string;
    number: number;
    status: string;
    priority: string;
    category: string;
    subject: string;
    message: string;
    createdAt: string;
  }>;
}

export interface DisputeChatReviewResponse {
  disputeId: string;
  bookingId: string;
  messageCount: number;
  banner: string;
  messages: Array<{
    id: string;
    senderId: string;
    kind: string;
    content: string;
    createdAt: string;
  }>;
}

export interface DisputeResolveResponse {
  success: boolean;
  alreadyResolved?: boolean;
  requiresApproval?: boolean;
  message?: string;
  dispute?: any;
  paymentResult?: any;
}

export interface VerificationQueueItem {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorNiche: string;
  creatorLocation: string;
  creatorAvatarUrl?: string | null;
  status: "UPLOADED" | "IN_REVIEW" | "APPROVED" | "NEEDS_RERECORD";
  durationSec: number;
  guidelineAck: boolean;
  reviewerNote?: string | null;
  createdAt: string;
  updatedAt: string;
  ageHours: number;
  isOverdue: boolean;
  slaRemainingHours: number;
}

export interface VerificationQueueResponse {
  items: VerificationQueueItem[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface VerificationMetricsResponse {
  pendingUploadedCount: number;
  inReviewCount: number;
  overdueCount: number;
  approvedCount: number;
  needsRerecordCount: number;
  totalReviewedCount: number;
  approvalRatePct: number;
  medianReviewHours: number;
}

export interface GuidelineCheckItem {
  id: string;
  label: string;
  passed: boolean;
  hint?: string;
}

export interface KycPanelFacts {
  status: string;
  attempts: number;
  provider: string;
  failureReasonCode?: string | null;
  lastAttemptAt?: string | null;
}

export interface VerificationDetailResponse {
  id: string;
  creatorId: string;
  creator: {
    id: string;
    userId: string;
    name: string;
    niche: string;
    location: string;
    avatarUrl?: string | null;
    maskedEmail: string;
    maskedPhone?: string | null;
    userCreatedAt: string;
  };
  status: "UPLOADED" | "IN_REVIEW" | "APPROVED" | "NEEDS_RERECORD";
  durationSec: number;
  guidelineAck: boolean;
  reviewerNote?: string | null;
  createdAt: string;
  updatedAt: string;
  ageHours: number;
  isOverdue: boolean;
  guidelineChecklist: GuidelineCheckItem[];
  kycPanel: KycPanelFacts;
}

export const adminClient = new AdminClient();

// ── Analytics Interfaces (PRD M4 & M10 / Phase A11) ─────────────────────────
export interface AcquisitionSourceSummary {
  source: string;
  signups: number;
  activatedCount: number;
  activationRatePct: number;
  firstBookingCount: number;
  firstBookingRatePct: number;
}

export interface ReferralLeaderboardEntry {
  code: string;
  creatorName: string;
  inviteCount: number;
  activatedCount: number;
  hasCelebrityBadge: boolean;
}

export interface AcquisitionData {
  bySource: AcquisitionSourceSummary[];
  byReferrer: Array<{ referrer: string; count: number }>;
  byCountry: Array<{ country: string; count: number }>;
  byDevice: Array<{ device: string; count: number }>;
  dailySignups: Array<{ date: string; count: number }>;
  referralLeaderboard: ReferralLeaderboardEntry[];
  unknownShare: {
    count: number;
    total: number;
    sharePct: number;
    label: string;
  };
  dataFreshness: string;
}

export interface DroppedUser {
  userId: string;
  name: string;
  email: string;
  userType: string;
  createdAt: string;
}

export interface FunnelStepData {
  stepId: string;
  label: string;
  count: number;
  conversionFromPreviousPct: number;
  overallConversionPct: number;
  medianTimeToNextStepMinutes: number | null;
  breakdown: {
    bySource: Record<string, number>;
    byCountry: Record<string, number>;
    byDevice: Record<string, number>;
    byCohort: Record<string, number>;
  };
  droppedUsers: DroppedUser[];
}

export interface FunnelData {
  funnelId: "TALENT_ONBOARDING" | "CLIENT_LIFECYCLE" | "EXTERNAL_BOOKING";
  name: string;
  description: string;
  steps: FunnelStepData[];
  overallConversionPct: number;
  biggestDropOffStep: string;
  dataFreshness: string;
}

export interface RetentionCohortWeek {
  weekNumber: number;
  activeCount: number;
  retentionPct: number;
}

export interface RetentionCohort {
  cohortWeek: string;
  cohortSize: number;
  weeks: RetentionCohortWeek[];
}

export interface RetentionData {
  cohorts: RetentionCohort[];
  userTypeFilter: "ALL" | "TALENT" | "CLIENT";
  dataFreshness: string;
}

export interface TrafficDailyItem {
  date: string;
  visits: number;
  uniques: number;
  anonymous: number;
  signedIn: number;
}

export interface TopCreatorViewItem {
  creatorId: string;
  creatorName: string;
  profileViews: number;
  mediaKitViews: number;
}

export interface TrafficData {
  visits: number;
  uniqueVisitors: number;
  anonymousVisits: number;
  signedInVisits: number;
  consentRatePct: number;
  consentRateNotice: string;
  dailyVisits: TrafficDailyItem[];
  topPages: Array<{ path: string; views: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  countries: Array<{ country: string; count: number }>;
  deviceClasses: Array<{ device: string; count: number }>;
  browsers: Array<{ browser: string; count: number }>;
  topCreatorViews: TopCreatorViewItem[];
  dataFreshness: string;
}

export interface FeatureAdoptionItem {
  featureKey: string;
  label: string;
  eligibleAudience: "TALENT" | "CLIENT" | "ALL";
  eligibleUsers: number;
  usedUsers: number;
  firstUseRatePct: number;
  repeatUsers: number;
  repeatUseRatePct: number;
  weeklyTrend: Array<{ week: string; count: number }>;
  cohortBreakdown: Record<string, number>;
  rank: number;
}

export interface AttributesAggregateStats {
  completionRatePct: number;
  totalCreators: number;
  creatorsWithAttributes: number;
  visibilityMix: {
    publicCount: number;
    searchableCount: number;
    privateCount: number;
  };
}

export interface FeatureAdoptionData {
  features: FeatureAdoptionItem[];
  attributesAggregate: AttributesAggregateStats;
  dataFreshness: string;
}

export interface SupplyByNicheItem {
  niche: string;
  count: number;
  verifiedPct: number;
  withRateCardPct: number;
  withAvailabilityPct: number;
  withMediaPct: number;
}

export interface DemandByNicheWeekItem {
  niche: string;
  week: string;
  briefsCount: number;
  bookingsCount: number;
}

export interface LiquidityMetrics {
  briefsWithin48HoursPct: number;
  briefsWithin48HoursCount: number;
  totalBriefsCount: number;
  avgApplicationsPerBrief: number;
  medianHoursToFirstApplication: number;
  selectionRatePct: number;
  capReachedRatePct: number;
}

export interface UnmetDemandItem {
  niche: string;
  filterKeys: string[];
  zeroResultCount: number;
}

export interface AvailabilityUseMetrics {
  activeTalentCount: number;
  talentWithCalendarCount: number;
  calendarConfiguredPct: number;
  totalSlots: number;
  bookedSlots: number;
  bookedSlotsPct: number;
}

export interface MarketplaceHealthData {
  supplyByNiche: SupplyByNicheItem[];
  demandByNicheAndWeek: DemandByNicheWeekItem[];
  liquidity: LiquidityMetrics;
  unmetDemand: UnmetDemandItem[];
  availabilityUse: AvailabilityUseMetrics;
  dataFreshness: string;
}

// ── Alerts & System Health Interfaces (PRD M11 / Phase A12) ──────────────────
export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";
export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export interface AlertEventItem {
  id: string;
  ruleKey: string;
  severity: AlertSeverity;
  status: AlertStatus;
  subjectType: string | null;
  subjectId: string | null;
  subjectUrl?: string | null;
  detail: Record<string, any>;
  firstSeenAt: string;
  lastSeenAt: string;
  ackedByAdminId: string | null;
  resolvedAt: string | null;
}

export interface AlertListResponse {
  alerts: AlertEventItem[];
  total: number;
  openCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
}

export interface TopTableItem {
  tableName: string;
  rowCount: number;
  sizeBytes?: number;
  sizeFormatted?: string;
}

export interface ScheduledJobHealthItem {
  jobKey: string;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  nextDueAt: string | null;
  durationMs: number | null;
}

export interface WebhookOutcomeItem {
  provider: string;
  successCount: number;
  failureCount: number;
  lastWebhookAt: string | null;
}

export interface ExternalServiceStatus {
  name: string;
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  consoleUrl: string;
  description: string;
}

export interface SystemHealthResponse {
  database: {
    sizeBytes: number;
    sizeFormatted: string;
    limitBytes: number;
    usagePct: number;
    topTables: TopTableItem[];
  };
  storage: {
    r2SizeBytes: number;
    r2SizeFormatted: string;
    limitBytes: number;
    usagePct: number;
    dailyHistory: Array<{ day: string; bytes: number }>;
  };
  jobs: ScheduledJobHealthItem[];
  adminQueue: {
    depth: number;
    pendingCount: number;
    runningCount: number;
    failedCount: number;
    oldestWaitingAgeMinutes: number | null;
  };
  materializedViews: {
    lastRefreshedAt: string | null;
    freshnessMinutes: number;
  };
  webhooks: WebhookOutcomeItem[];
  api: {
    errorRatePct: number;
    total5xxEvents: number;
    total4xxEvents: number;
    latencyMsMedian: number;
  };
  externalServices: ExternalServiceStatus[];
  dataFreshness: string;
}

// ── Audit & Exports Interfaces (PRD M1 & M12 / Phase A13) ───────────────────
export interface AdminAuditLogItem {
  id: string;
  adminId: string;
  adminEmail?: string;
  adminRole?: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  metadata: Record<string, any>;
  ipHash: string | null;
  createdAt: string;
}

export interface AdminAuditListResponse {
  logs: AdminAuditLogItem[];
  total: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export type ExportType =
  | "users"
  | "bookings"
  | "payments"
  | "withdrawals"
  | "tickets"
  | "funnels"
  | "audit";

export type ExportStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";

export interface AdminExportJobItem {
  id: string;
  type: ExportType;
  status: ExportStatus;
  requestedByAdminId: string;
  requestedByEmail?: string;
  reason: string;
  rowCount: number;
  downloadUrl?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  completedAt?: string | null;
  error?: string | null;
  piiUnmasked: boolean;
}

export interface AdminExportListResponse {
  exports: AdminExportJobItem[];
  total: number;
}

export interface PlatformThresholds {
  databaseLimitBytes: number;
  databaseLimitMb: number;
  storageLimitBytes: number;
  storageLimitGb: number;
  resourceAlertThresholdPct: number;
  fourEyesThresholdNgn: number;
  fourEyesThresholdUsd: number;
}

export interface SlaTargets {
  urgentTicketHours: number;
  highTicketHours: number;
  normalTicketHours: number;
  lowTicketHours: number;
  verificationReviewHours: number;
  disputeStalledDays: number;
  withdrawalStalledHours: number;
}

export interface PlatformSettingsResponse {
  version: {
    appVersion: string;
    configVersion: string;
    environment: string;
    commitHash?: string;
  };
  thresholds: PlatformThresholds;
  slas: SlaTargets;
  retention: {
    analyticsRetentionMonths: number;
    exportFileRetentionDays: number;
    auditLogRetention: "PERMANENT";
  };
  featuresCount: number;
  funnelsCount: number;
}



