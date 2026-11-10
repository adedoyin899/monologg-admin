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
}

export const adminClient = new AdminClient();

