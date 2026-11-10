export interface VerifiedAdminToken {
  /** Provider-side unique subject/user identifier (e.g. Supabase sub UUID). */
  subject: string;
  /** Admin user email address (case-insensitive/normalized). */
  email: string;
  /** Provider-side session identifier. */
  sessionId: string;
  /** Whether multi-factor authentication was verified (e.g. Supabase aal === 'aal2'). */
  mfaVerified: boolean;
  /** Timestamp when the token or session was issued. */
  issuedAt: Date;
}

export interface AuthVerifier {
  /**
   * Verifies an administrative bearer token issued by the active auth provider.
   * Throws an Error if invalid, expired, or malformed.
   */
  verify(token: string): Promise<VerifiedAdminToken>;
}

