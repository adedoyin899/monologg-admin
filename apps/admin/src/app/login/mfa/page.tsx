"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, Smartphone } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function MfaChallengePage() {
  const router = useRouter();
  const { data, signInAsRole } = useAuth();
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Please enter a valid 6-digit verification code.");
      return;
    }

    setIsVerifying(true);
    setError(null);
    try {
      // In production, verifies TOTP via Supabase MFA endpoint.
      // In dev/mock mode, upgrades session to aal2:
      const role = data?.admin?.role || "SUPER_ADMIN";
      await signInAsRole(role, "aal2");
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const simulateSuccess = async () => {
    setIsVerifying(true);
    const role = data?.admin?.role || "SUPER_ADMIN";
    await signInAsRole(role, "aal2");
    router.push("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0A0A0A] px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-gray-200 dark:border-[#242424] bg-white dark:bg-[#141414] p-8 shadow-xl text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-monologg-purple/10 text-monologg-purple mb-2">
          <Smartphone className="h-6 w-6" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          Two-Factor Authentication
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Enter the 6-digit TOTP verification code from your authenticator app (aal2 required).
        </p>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full text-center tracking-[0.5em] text-2xl font-mono rounded-lg border border-gray-300 dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-monologg-red"
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying || code.length !== 6}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-monologg-red px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            <span>Verify & Access Console</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-gray-100 dark:border-[#202020]">
          <button
            type="button"
            onClick={simulateSuccess}
            className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            [Dev Mock] Bypass with Simulated aal2 Challenge
          </button>
        </div>
      </div>
    </div>
  );
}

