import type { AuthVerifier, VerifiedAdminToken } from "./authVerifier.interface.js";

/**
 * Mock AuthVerifier for local development and automated testing.
 * Token format:
 *   "mock-admin:<email>:<aal1|aal2>:<sessionId>"
 * or
 *   "mock-admin:<email>:<aal1|aal2>"
 * or
 *   "mock-admin:<email>"
 */
export const mockVerifier: AuthVerifier = {
  async verify(token: string): Promise<VerifiedAdminToken> {
    if (!token || typeof token !== "string") {
      throw new Error("[mockVerifier] Empty token provided.");
    }

    if (!token.startsWith("mock-admin:")) {
      throw new Error("[mockVerifier] Invalid mock token format. Must start with 'mock-admin:'.");
    }

    const parts = token.split(":");
    // parts[0] = "mock-admin"
    // parts[1] = email
    // parts[2] = aal ("aal1" | "aal2") - defaults to "aal2"
    // parts[3] = optional sessionId
    const email = (parts[1] || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      throw new Error("[mockVerifier] Mock token missing valid email.");
    }

    const aal = parts[2] || "aal2";
    const sessionId = parts[3] || `mock-session-${email}`;

    return {
      subject: `mock-sub-${email}`,
      email,
      sessionId,
      mfaVerified: aal === "aal2",
      issuedAt: new Date(),
    };
  },
};

