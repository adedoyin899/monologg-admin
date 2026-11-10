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
}

export const adminClient = new AdminClient();

