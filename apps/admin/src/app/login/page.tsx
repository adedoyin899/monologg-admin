"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, ArrowRight, Lock, Key } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { AdminRole } from "@/lib/admin-client";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithToken, signInAsRole, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<AdminRole>("SUPER_ADMIN");
  const [selectedAal, setSelectedAal] = useState<"aal1" | "aal2">("aal2");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMockAllowed = process.env.NODE_ENV !== "production";

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      // In production / live supabase mode, this initiates Supabase magic link / OTP.
      // For local dev fallback, construct token:
      await signInWithToken(`mock-admin:${email}:aal2`);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMockSignIn = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signInAsRole(selectedRole, selectedAal);
      if (selectedAal === "aal1") {
        router.push("/login/mfa");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mock sign-in failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0A0A0A] px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-gray-200 dark:border-[#242424] bg-white dark:bg-[#141414] p-8 shadow-xl">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-monologg-red/10 text-monologg-red mb-3">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Monologg Operations
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Internal administrative portal. Allowlisted accounts only.
          </p>
        </div>

        {(error || authError) && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400">
            {error || authError}
          </div>
        )}

        {/* Standard Allowlisted Email Form */}
        <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Admin Email Address
            </label>
            <input
              type="email"
              required
              placeholder="admin@monologg.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] px-3.5 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-monologg-red"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-monologg-red px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            <span>Continue with Magic Link</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Dev Mock Sign-in Selector */}
        {isMockAllowed && (
          <div className="pt-6 border-t border-gray-100 dark:border-[#202020] space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-500">
              <Key className="h-3.5 w-3.5" />
              <span>Dev Mock Authentication</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Select Role (M1.2 Matrix)
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as AdminRole)}
                  className="w-full rounded-lg border border-gray-300 dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none"
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Full Platform Access)</option>
                  <option value="OPS">OPS (Users, Bookings, Moderation)</option>
                  <option value="SUPPORT">SUPPORT (Tickets, Masked PII, Disputes)</option>
                  <option value="FINANCE">FINANCE (Payments, Escrow, Refunds)</option>
                  <option value="COMPLIANCE">COMPLIANCE (KYC Queue, Audit Logs)</option>
                  <option value="VIEWER">VIEWER (Aggregates, Read-only)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                  MFA Simulation State
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedAal("aal2")}
                    className={`rounded-lg border px-3 py-1.5 font-medium transition-colors ${
                      selectedAal === "aal2"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-gray-200 dark:border-[#2C2C2C] text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1F1F1F]"
                    }`}
                  >
                    aal2 (MFA Verified)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAal("aal1")}
                    className={`rounded-lg border px-3 py-1.5 font-medium transition-colors ${
                      selectedAal === "aal1"
                        ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "border-gray-200 dark:border-[#2C2C2C] text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1F1F1F]"
                    }`}
                  >
                    aal1 (MFA Pending)
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleMockSignIn}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-[#333333] bg-gray-100 dark:bg-[#1F1F1F] px-4 py-2 text-xs font-semibold text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-[#282828] transition-colors"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Sign in as {selectedRole}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

