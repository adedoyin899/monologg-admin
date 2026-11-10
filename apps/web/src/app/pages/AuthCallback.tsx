import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { Logo } from "../components/ui/Logo";
import { supabase } from "../../lib/supabase";
import { apiClient } from "../../lib/api-client";
import { appStateSync } from "../../lib/state-sync";

/**
 * /auth/callback — OAuth / magic-link callback landing page.
 *
 * After Supabase Auth redirects the browser here, this component:
 *  1. Retrieves the Supabase session (supabase.auth.getSession or exchangeCodeForSession)
 *  2. Sends the Supabase access token to POST /api/v1/auth/session/sync
 *  3. On success: brand-new accounts go to the first onboarding step for their
 *     role (TALENT → /onboarding, CLIENT → /onboarding/client); returning
 *     accounts go straight to their home screen (TALENT → /dashboard, CLIENT → /client)
 *  4. On failure: routes to /auth with an error message
 *
 * Shows a clean loading state while the sync completes.
 * Public route — no RequireAuth wrapper (this IS how a Supabase user gets their session).
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false); // prevent double-run in React Strict Mode

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void (async () => {
      try {
        // First check if OAuth returned an error in URL query parameters
        const urlError = searchParams.get("error_description") || searchParams.get("error");
        if (urlError) {
          throw new Error(urlError);
        }

        // The userType was passed via query parameter or localStorage backup.
        // We fall back to "TALENT" if both are absent (e.g. direct nav or magic-link).
        let storedRole: string | null = null;
        try {
          storedRole = window.localStorage.getItem("monologg_oauth_role");
          window.localStorage.removeItem("monologg_oauth_role");
        } catch {
          // Ignore storage access errors
        }
        const userTypeParam = searchParams.get("userType") || storedRole;
        const userType: "TALENT" | "CLIENT" =
          userTypeParam === "CLIENT" ? "CLIENT" : "TALENT";

        if (!supabase) {
          // ALL-MOCK mode: no real Supabase client — should not be reachable
          // unless someone navigates here directly. Route back to auth.
          navigate("/auth", { replace: true });
          return;
        }

        // Exchange the OAuth code for a session. getSession() checks the URL
        // or stored tokens. In PKCE flows, exchangeCodeForSession explicitly exchanges
        // any 'code' parameter if a session is not already active.
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        let session = sessionData?.session;

        if (!session && !sessionError) {
          const code = searchParams.get("code");
          if (code && typeof supabase.auth.exchangeCodeForSession === "function") {
            const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              throw new Error(exchangeError.message);
            }
            session = exchangeData.session;
          }
        }

        if (sessionError || !session) {
          throw new Error(sessionError?.message ?? "No Supabase session found");
        }

        const supabaseAccessToken = session.access_token;
        // Google (via Supabase) puts the real profile under a few different
        // possible keys depending on the flow — check them all rather than
        // trusting a single one, so a real name/avatar is never silently
        // dropped in favor of a fallback.
        const metadata = session.user.user_metadata ?? {};
        const name = (metadata["full_name"] ??
          metadata["name"] ??
          (metadata["given_name"]
            ? `${metadata["given_name"]} ${metadata["family_name"] ?? ""}`.trim()
            : undefined)) as string | undefined;
        const avatarUrl = (metadata["avatar_url"] ?? metadata["picture"]) as string | undefined;
        const email = session.user.email ?? "";

        // Determine which Supabase provider was used
        const provider = session.user.app_metadata?.["provider"];
        const syncProvider =
          provider === "google" ? "GOOGLE" : provider === "email" ? "EMAIL_OTP" : "MAGIC_LINK";

        // Sync with our app backend — creates/links the User, issues an app JWT.
        // avatarUrl is only ever a Google-hosted photo URL (never an uploaded
        // file), stored on Creator/Client and refreshed on every sign-in.
        const user = await apiClient.sessionSync(supabaseAccessToken, userType, {
          name,
          avatarUrl,
          provider: syncProvider,
        });

        // Also push into local profile state immediately, so Settings/sidebar
        // show the real Google identity right away instead of the
        // "Emeka Johnson"/"Sarah Jenkins" demo defaults a fresh browser starts with.
        const effectiveName = user.name || name || email.split("@")[0];
        const effectiveAvatar = user.avatarUrl ?? avatarUrl;

        if (user.userType === "CLIENT") {
          appStateSync.updateClientProfile({ name: effectiveName, email, avatarUrl: effectiveAvatar });
        } else {
          appStateSync.updateTalentProfile({ name: effectiveName, email, avatarUrl: effectiveAvatar });
        }

        // Check if an onboarding draft exists so users carry on from where they left off
        const hasTalentDraft = typeof window !== "undefined" && !!window.localStorage.getItem("monologg_creator_onboarding_draft");
        const hasClientDraft = typeof window !== "undefined" && !!window.localStorage.getItem("monologg_client_onboarding_draft");
        const shouldResumeOnboarding = user.isNewUser || (user.userType === "CLIENT" ? hasClientDraft : hasTalentDraft);

        if (shouldResumeOnboarding) {
          navigate(user.userType === "CLIENT" ? "/onboarding/client" : "/onboarding", { replace: true });
        } else {
          navigate(user.userType === "CLIENT" ? "/client" : "/dashboard", { replace: true });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign-in failed";
        setError(message);
        // After a short delay, redirect back to the auth page with the error
        setTimeout(() => navigate("/auth", { replace: true }), 2500);
      }
    })();
  }, [navigate, searchParams]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "var(--color-bg-canvas)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-6 text-center max-w-sm px-6"
      >
        <Logo className="h-6 w-auto" style={{ color: "var(--color-text-primary)" }} />

        {error ? (
          <>
            <p className="text-sm font-body" style={{ color: "var(--color-error)" }}>
              {error}
            </p>
            <p className="text-xs font-body" style={{ color: "var(--color-text-secondary)" }}>
              Redirecting you back…
            </p>
          </>
        ) : (
          <>
            {/* Animated loading dots */}
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ background: "var(--color-text-tertiary)" }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
            <p className="text-sm font-body" style={{ color: "var(--color-text-secondary)" }}>
              Finishing sign in…
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
