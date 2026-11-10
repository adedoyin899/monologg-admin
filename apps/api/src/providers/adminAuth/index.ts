import { env } from "../../config/env.js";
import type { AuthVerifier } from "./authVerifier.interface.js";
import { supabaseVerifier } from "./supabaseVerifier.js";
import { mockVerifier } from "./mockVerifier.js";
import { clerkVerifier } from "./clerkVerifier.js";

export * from "./authVerifier.interface.js";
export { supabaseVerifier } from "./supabaseVerifier.js";
export { mockVerifier } from "./mockVerifier.js";
export { clerkVerifier } from "./clerkVerifier.js";

export function getAdminAuthVerifier(provider?: string): AuthVerifier {
  const selected = provider || process.env.ADMIN_AUTH_PROVIDER || env.ADMIN_AUTH_PROVIDER;
  switch (selected) {
    case "supabase":
      return supabaseVerifier;
    case "mock":
      return mockVerifier;
    case "clerk":
      return clerkVerifier;
    default:
      throw new Error(`[adminAuth] Unsupported ADMIN_AUTH_PROVIDER: ${selected}`);
  }
}

export const adminAuthVerifier: AuthVerifier = {
  verify(token: string) {
    return getAdminAuthVerifier().verify(token);
  },
};
