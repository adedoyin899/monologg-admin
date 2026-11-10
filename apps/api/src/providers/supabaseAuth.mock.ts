// Phase 12B: Mock SupabaseAuthProvider.
// Used in NODE_ENV=test and SUPABASE_MODE=mock.
// Verifies/signs tokens using JWT_ACCESS_SECRET (already available in test) so
// the full /auth/session/sync endpoint can be exercised with zero real Supabase
// calls. The mock signs a token with a known payload; tests can call signMockToken()
// to produce a verifiable token for injection into test requests.

import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { SupabaseAuthProvider, SupabaseJwtClaims } from "./supabaseAuth.interface.js";

// The secret used to sign mock Supabase tokens in tests.
// Deliberately different from JWT_ACCESS_SECRET and JWT_REFRESH_SECRET to make
// sure test assertions are checking the right token type.
function getMockSigningSecret(): string {
  return env.SUPABASE_JWT_SECRET ?? env.JWT_ACCESS_SECRET;
}

/**
 * Sign a mock Supabase-style JWT for use in tests.
 * Tests call this directly to produce a token they can inject into requests.
 */
export function signMockSupabaseToken(claims: {
  sub: string;
  email: string;
  aud?: string;
  expiresIn?: string;
}): string {
  return jwt.sign(
    {
      sub: claims.sub,
      email: claims.email,
      aud: claims.aud ?? "authenticated",
      role: "authenticated",
    },
    getMockSigningSecret(),
    { expiresIn: (claims.expiresIn ?? "15m") as any },
  );
}

export const mockSupabaseAuthProvider: SupabaseAuthProvider = {
  async verifyJwt(token: string): Promise<SupabaseJwtClaims> {
    try {
      const payload = jwt.verify(token, getMockSigningSecret()) as SupabaseJwtClaims & {
        exp: number;
      };
      return {
        sub: payload.sub,
        email: payload.email,
        aud: payload.aud ?? "authenticated",
        exp: payload.exp,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid token";
      throw new Error(`[supabaseAuth.mock] JWT verification failed: ${message}`);
    }
  },
};
