// Phase 12B: Real SupabaseAuthProvider.
// Used in SUPABASE_MODE=real (production).
//
// Verifies Supabase-issued access tokens via Supabase's own GET /auth/v1/user
// introspection endpoint rather than verifying the JWT signature locally.
// This project's Supabase instance signs tokens with ES256 (the modern
// asymmetric "JWT Signing Keys" default), not the legacy shared HS256
// secret — a local `jwt.verify(token, SUPABASE_JWT_SECRET, { algorithms:
// ["HS256"] })` rejects every real token with "invalid algorithm" regardless
// of validity, which silently 401s every real Google/magic-link/OTP sign-in
// at the session/sync step. Asking Supabase to verify its own token sidesteps
// needing to fetch/cache its JWKS and re-derive PEM keys per algorithm, and
// keeps working across any future key rotation or algorithm change on
// Supabase's side. This endpoint is only called once per sign-in (not on the
// hot path — every subsequent request is gated by our own app JWT), so the
// extra network round-trip is not a meaningful cost.

import { env } from "../config/env.js";
import type { SupabaseAuthProvider, SupabaseJwtClaims } from "./supabaseAuth.interface.js";

export const realSupabaseAuthProvider: SupabaseAuthProvider = {
  async verifyJwt(token: string): Promise<SupabaseJwtClaims> {
    const supabaseUrl = env.SUPABASE_URL;
    const anonKey = env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      throw new Error(
        "[supabaseAuth.real] SUPABASE_URL / SUPABASE_ANON_KEY are not set — cannot verify Supabase token. " +
          "Set them in apps/api/.env when SUPABASE_MODE=real.",
      );
    }

    let res: Response;
    try {
      res = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown network error";
      throw new Error(`[supabaseAuth.real] Could not reach Supabase to verify token: ${message}`);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`[supabaseAuth.real] JWT verification failed: Supabase rejected the token (${res.status} ${body})`);
    }

    const user = (await res.json()) as { id?: string; email?: string; aud?: string };
    if (!user.id || !user.email) {
      throw new Error("[supabaseAuth.real] JWT verification failed: Missing required claims (id, email) in Supabase user response");
    }

    return {
      sub: user.id,
      email: user.email,
      aud: user.aud ?? "authenticated",
      // Supabase already confirmed this token is unexpired by returning 200;
      // the JWT's own `exp` isn't otherwise consumed downstream (see
      // SupabaseJwtClaims), so a real value here isn't load-bearing.
      exp: Math.floor(Date.now() / 1000),
    };
  },
};
