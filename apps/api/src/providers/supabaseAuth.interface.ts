// Phase 12B: SupabaseAuthProvider interface.
// The single operation this provider performs: verify a Supabase-issued JWT
// and return the identity claims from it. All other Supabase Auth operations
// (signInWithOtp, signInWithOAuth) happen client-side via @supabase/supabase-js;
// the server only ever sees the resulting access token and verifies it here.

export interface SupabaseJwtClaims {
  /** Supabase Auth user UUID — stored as User.supabaseUserId */
  sub: string;
  /** User's email address */
  email: string;
  /** Token audience — should be "authenticated" for real Supabase tokens */
  aud: string;
  /** Expiry timestamp (Unix seconds) */
  exp: number;
}

export interface SupabaseAuthProvider {
  /**
   * Verify a Supabase-issued JWT (access token) and extract identity claims.
   * Throws if the token is expired, malformed, or the signature is invalid.
   */
  verifyJwt(token: string): Promise<SupabaseJwtClaims>;
}
