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
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
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
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
    }

    return (await res.json()) as T;
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

export const adminClient = new AdminClient();

