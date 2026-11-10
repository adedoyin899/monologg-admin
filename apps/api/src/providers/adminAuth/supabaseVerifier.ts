import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import type { AuthVerifier, VerifiedAdminToken } from "./authVerifier.interface.js";

export const supabaseVerifier: AuthVerifier = {
  async verify(token: string): Promise<VerifiedAdminToken> {
    const supabaseUrl = env.SUPABASE_URL;
    const anonKey = env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      throw new Error(
        "[supabaseVerifier] SUPABASE_URL / SUPABASE_ANON_KEY must be configured for Supabase admin auth.",
      );
    }

    // 1. Decode token claims to extract aal and session_id
    const decoded = jwt.decode(token) as {
      sub?: string;
      email?: string;
      session_id?: string;
      aal?: string;
      iat?: number;
    } | null;

    if (!decoded || !decoded.sub) {
      throw new Error("[supabaseVerifier] Malformed token: unable to decode claims.");
    }

    // 2. Validate token against Supabase /auth/v1/user endpoint
    let res: Response;
    try {
      res = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      throw new Error(`[supabaseVerifier] Failed to reach Supabase Auth: ${msg}`);
    }

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`[supabaseVerifier] Supabase rejected token (${res.status}): ${errBody}`);
    }

    const userData = (await res.json()) as { id?: string; email?: string };
    const email = (userData.email || decoded.email || "").toLowerCase();
    if (!email) {
      throw new Error("[supabaseVerifier] Token valid but missing email address.");
    }

    const mfaVerified = decoded.aal === "aal2";
    const sessionId = decoded.session_id || `session-${decoded.sub}`;
    const issuedAt = decoded.iat ? new Date(decoded.iat * 1000) : new Date();

    return {
      subject: userData.id || decoded.sub,
      email,
      sessionId,
      mfaVerified,
      issuedAt,
    };
  },
};

