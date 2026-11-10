import type { AuthVerifier, VerifiedAdminToken } from "./authVerifier.interface.js";

/**
 * ClerkVerifier stub. Clerk is off by default (Flag F13, Decision D10).
 */
export const clerkVerifier: AuthVerifier = {
  async verify(_token: string): Promise<VerifiedAdminToken> {
    throw new Error("[clerkVerifier] Clerk authentication is not enabled.");
  },
};

