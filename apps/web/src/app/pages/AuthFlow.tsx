import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Logo } from "../components/ui/Logo";
import { useTheme } from "../Root";
import { apiClient } from "../../lib/api-client";
import { supabase, SUPABASE_MODE } from "../../lib/supabase";
import { appStateSync } from "../../lib/state-sync";
import { CURRENT_TERMS_VERSION } from "@monologg/types";
import {
  Eye,
  EyeOff,
  ChevronLeft,
  Sun,
  Moon,
  Check,
  Mail,
  KeyRound,
  User,
  Lock,
  AlertCircle,
} from "lucide-react";
import { WebGLHeroCanvas } from "../components/ui/WebGLHeroCanvas";

type View = "splash" | "register" | "login" | "forgot" | "otp_entry" | "magic_sent";
type Role = "talent" | "client";

export function AuthFlow() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") || searchParams.get("view");
  const initialRole = searchParams.get("role");

  const [view, setView] = useState<View>(() => {
    if (initialMode === "login" || initialMode === "signin") return "login";
    if (initialMode === "register" || initialMode === "signup") return "register";
    return "splash";
  });
  const [role, setRole] = useState<Role>(() => {
    if (initialRole === "client") return "client";
    return "talent";
  });

  useEffect(() => {
    const mode = searchParams.get("mode") || searchParams.get("view");
    if (mode === "login" || mode === "signin") {
      setView("login");
    } else if (mode === "register" || mode === "signup") {
      setView("register");
    }
    const roleParam = searchParams.get("role");
    if (roleParam === "client") {
      setRole("client");
    } else if (roleParam === "talent" || roleParam === "performer") {
      setRole("talent");
    }
  }, [searchParams]);
  const [showPwd, setShowPwd] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Phase 12B: magic-link + OTP state
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.register({
        email,
        password,
        name,
        userType: role === "talent" ? "TALENT" : "CLIENT",
        acceptedTermsVersion: CURRENT_TERMS_VERSION,
      });
      navigate(role === "talent" ? "/onboarding" : "/onboarding/client");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await apiClient.login(email, password);
      navigate(user.userType === "CLIENT" ? "/client" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.forgotPassword(email);
      setForgotSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Phase 12B: Supabase Auth handlers ──────────────────────────────────────

  /** Real Google OAuth via Supabase — fires the browser redirect. */
  const handleSupabaseGoogle = async () => {
    setError(null);
    if (!supabase) {
      setError("Google Sign-In isn't configured in this environment yet.");
      return;
    }
    setGoogleAuthLoading(true);
    const userTypeParam = role === "talent" ? "TALENT" : "CLIENT";
    try {
      window.localStorage.setItem("monologg_oauth_role", userTypeParam);
    } catch {
      // Ignore storage errors in restricted browser modes
    }
    const appUrl = window.location.origin;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${appUrl}/auth/callback?userType=${userTypeParam}`,
      },
    });
    if (oauthError) setError(oauthError.message);
    setGoogleAuthLoading(false);
  };

  /** Magic link — sends an email with a sign-in link, then shows a confirmation. */
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      // Mock mode: just show a toast-style confirmation
      console.log(`[auth mock] Magic link sent to ${magicLinkEmail}`);
      setView("magic_sent" as View);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const appUrl = window.location.origin;
      const userTypeParam = role === "talent" ? "TALENT" : "CLIENT";
      const { error: mlError } = await supabase.auth.signInWithOtp({
        email: magicLinkEmail,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback?userType=${userTypeParam}`,
          shouldCreateUser: true,
        },
      });
      if (mlError) throw new Error(mlError.message);
      setView("magic_sent" as View);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send magic link.");
    } finally {
      setSubmitting(false);
    }
  };

  /** OTP step 1: request OTP (server rate-limit check + supabase.auth.signInWithOtp). */
  const handleOtpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.requestOtp(otpEmail);
      if (supabase) {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: otpEmail,
          options: { shouldCreateUser: true },
        });
        if (otpError) throw new Error(otpError.message);
      } else {
        console.log(`[auth mock] OTP requested for ${otpEmail}`);
      }
      setView("otp_entry" as View);
      setOtpResendCooldown(60);
      const timer = setInterval(() => {
        setOtpResendCooldown((c) => {
          if (c <= 1) { clearInterval(timer); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP.");
    } finally {
      setSubmitting(false);
    }
  };

  /** OTP step 2: verify the 6-digit code then sync with our backend. */
  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const userType = role === "talent" ? "TALENT" : "CLIENT";
      if (supabase) {
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          email: otpEmail,
          token: otpCode,
          type: "email",
        });
        if (verifyError) throw new Error(verifyError.message);
        if (!verifyData.session) throw new Error("No session returned after OTP verification.");
        const user = await apiClient.sessionSync(
          verifyData.session.access_token,
          userType,
          { provider: "EMAIL_OTP" },
        );
        navigate(
          user.isNewUser
            ? user.userType === "CLIENT" ? "/onboarding/client" : "/onboarding"
            : user.userType === "CLIENT" ? "/client" : "/dashboard",
        );
      } else {
        if (otpCode.length !== 6) throw new Error("Enter the 6-digit code.");
        const user = await apiClient.sessionSync("", userType, { provider: "EMAIL_OTP" });
        navigate(
          user.isNewUser
            ? user.userType === "CLIENT" ? "/onboarding/client" : "/onboarding"
            : user.userType === "CLIENT" ? "/client" : "/dashboard",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const s = {
    canvas: { background: "var(--color-bg-canvas)" } as React.CSSProperties,
    surface: { background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)" } as React.CSSProperties,
    primary: { color: "var(--color-text-primary)" } as React.CSSProperties,
    secondary: { color: "var(--color-text-secondary)" } as React.CSSProperties,
    gold: { color: "var(--color-text-primary)", textDecoration: "underline", textDecorationColor: "var(--color-gold-primary)", textUnderlineOffset: "3px" } as React.CSSProperties,
  };

  return (
    <div
      className={`${role === "client" ? "role-client" : "role-talent"} h-screen h-[100dvh] max-h-screen w-full flex flex-col lg:grid lg:grid-cols-[1fr_1.25fr] relative overflow-hidden`}
      style={s.canvas}
    >
      <WebGLHeroCanvas opacityMultiplier={0.03} />

      {/* ── Left panel: Clean Frictionless Auth Form ── */}
      <div className="flex-1 flex flex-col justify-between px-6 sm:px-12 lg:px-14 xl:px-18 py-6 lg:py-8 bg-[var(--color-bg-surface)] h-full max-h-screen overflow-y-auto relative z-10">
        {/* Top bar inside left form */}
        <div className="w-full max-w-[400px] mx-auto flex items-center justify-between mb-4 shrink-0">
          <Link to="/" aria-label="Monologg">
            <Logo className="h-5 w-auto" style={s.primary} />
          </Link>
          <button
            onClick={toggle}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="w-9 h-9 rounded-full flex items-center justify-center border transition-colors active:scale-[0.97]"
            style={{ borderColor: "var(--color-hairline)", background: "var(--color-bg-surface)", color: "var(--color-text-secondary)" }}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Center Form Container */}
        <div className="w-full max-w-[400px] mx-auto my-auto py-2">
          {/* Single Unified Role Switcher */}
          <div className="flex p-1 mb-6 rounded-full bg-[var(--color-bg-surface-2)] border border-[var(--color-hairline)] w-full">
            <button
              type="button"
              onClick={() => setRole("talent")}
              className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${
                role === "talent"
                  ? "bg-[#F13030] text-white shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Performer
            </button>
            <button
              type="button"
              onClick={() => setRole("client")}
              className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${
                role === "client"
                  ? "bg-[#7B00FE] text-white shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Client
            </button>
          </div>

          <AnimatePresence mode="wait">

            {/* ── Splash ── */}
            {view === "splash" && (
              <motion.div
                key="splash"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="flex flex-col"
              >
                <h1 className="font-display text-[28px] sm:text-[32px] font-bold leading-[1.15] tracking-tight mb-2 text-[var(--color-text-primary)]">
                  Welcome to Monologg
                </h1>
                <p className="text-sm font-body mb-6 text-[var(--color-text-secondary)] leading-relaxed">
                  Sign in or create a free {role === "talent" ? "Performer" : "Client"} account to continue.
                </p>
                <div className="flex flex-col gap-3">
                  <Button
                    variant={role === "talent" ? "red" : "purple"}
                    className="w-full h-12 text-sm font-bold shadow-md rounded-full"
                    onClick={() => setView("register")}
                  >
                    Create Free Account
                  </Button>
                  <Button
                    variant="outline-pill"
                    className="w-full h-12 text-sm font-bold rounded-full border border-[var(--color-hairline)]"
                    onClick={() => setView("login")}
                  >
                    Sign In
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Register ── */}
            {view === "register" && (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col"
              >
                <h2 className="font-display text-2xl sm:text-[28px] font-bold tracking-tight mb-1 text-[var(--color-text-primary)]">
                  Create account
                </h2>
                <p className="text-sm font-body mb-5 text-[var(--color-text-secondary)]">
                  Join Monologg as a {role === "talent" ? "Performer" : "Client"}.
                </p>

                {/* Google OAuth Button */}
                <button
                  type="button"
                  onClick={handleSupabaseGoogle}
                  disabled={submitting || googleAuthLoading}
                  className="w-full h-12 rounded-full border border-[var(--color-hairline)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-surface-2)] transition-colors flex items-center justify-center gap-2.5 text-sm font-semibold font-body text-[var(--color-text-primary)] mb-4 active:scale-[0.99] shadow-xs"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  {googleAuthLoading ? "Redirecting to Google…" : "Continue with Google"}
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-[var(--color-hairline)]" />
                  <span className="text-xs font-body tracking-normal text-[var(--color-text-tertiary)]">Or with email</span>
                  <div className="flex-1 h-px bg-[var(--color-hairline)]" />
                </div>

                <form onSubmit={handleRegister} className="flex flex-col gap-3.5">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium font-body text-[var(--color-text-secondary)] pl-1">Full name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        placeholder="Full Name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="h-12 pl-10 pr-4 rounded-full text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium font-body text-[var(--color-text-secondary)] pl-1">Email address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="h-12 pl-10 pr-4 rounded-full text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium font-body text-[var(--color-text-secondary)] pl-1">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        type={showPwd ? "text" : "password"}
                        placeholder="Create Password (min. 8 chars)"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="h-12 pl-10 pr-11 rounded-full text-sm"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-full hover:bg-[var(--color-bg-surface-2)] transition-colors"
                        aria-label={showPwd ? "Hide password" : "Show password"}
                      >
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Terms consent */}
                  <label className="flex items-start gap-3 mt-1.5 cursor-pointer select-none">
                    <div
                      className="relative w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border transition-all"
                      style={{
                        background: agreed ? "var(--color-gold-primary)" : "var(--color-bg-elevated)",
                        borderColor: agreed ? "var(--color-gold-primary)" : "var(--color-hairline)",
                      }}
                      onClick={() => setAgreed(!agreed)}
                    >
                      {agreed && <Check className="w-3.5 h-3.5" style={{ color: "#1A1200" }} />}
                    </div>
                    <span className="text-xs font-body leading-relaxed text-[var(--color-text-secondary)]">
                      I agree to the{" "}
                      <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="hover:underline font-medium text-[var(--color-text-primary)] underline underline-offset-2">Terms of Service</a>{" "}
                      and{" "}
                      <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline font-medium text-[var(--color-text-primary)] underline underline-offset-2">Privacy Policy</a>
                    </span>
                  </label>

                  {error && (
                    <div className="p-3 rounded-xl bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 flex items-start gap-2.5 text-xs font-body text-[var(--color-error)]">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant={role === "talent" ? "red" : "purple"}
                    className="w-full h-12 mt-1 text-sm font-bold rounded-full shadow-md"
                    disabled={!agreed || !name || !email || password.length < 8 || submitting}
                  >
                    {submitting ? "Creating account…" : role === "talent" ? "Create My Performer Profile" : "Create Client Account"}
                  </Button>
                </form>

                <p className="text-sm text-center mt-5 font-body text-[var(--color-text-secondary)]">
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="hover:underline font-semibold text-[var(--color-accent)] underline-offset-2"
                    onClick={() => setView("login")}
                  >
                    Sign in
                  </button>
                </p>

                {/* Quick Demo Access (Session 165 Restoration) */}
                <div className="mt-5 pt-3.5 border-t border-[var(--color-hairline)] flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium font-body text-[var(--color-text-tertiary)] flex items-center gap-1">
                    <span>⚡</span> Quick Demo:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem("monologg_is_new_user", "false");
                        appStateSync.setLoggedInUser({
                          id: "usr-demo-talent",
                          email: "emeka@example.com",
                          name: "Emeka Johnson",
                          userType: "TALENT",
                          authProvider: "EMAIL",
                          isNewUser: false,
                        });
                        navigate("/dashboard");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F13030]/10 text-[#F13030] hover:bg-[#F13030]/20 transition-all border border-[#F13030]/20 cursor-pointer active:scale-95"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F13030]" />
                      Performer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem("monologg_is_new_user", "false");
                        appStateSync.setLoggedInUser({
                          id: "usr-demo-client",
                          email: "sarah@filmcraft.com",
                          name: "Sarah Jenkins",
                          userType: "CLIENT",
                          authProvider: "EMAIL",
                          isNewUser: false,
                        });
                        navigate("/client");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#7B00FE]/10 text-[#7B00FE] hover:bg-[#7B00FE]/20 transition-all border border-[#7B00FE]/20 cursor-pointer active:scale-95"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7B00FE]" />
                      Client
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Login ── */}
            {view === "login" && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col"
              >
                <h2 className="font-display text-2xl sm:text-[28px] font-bold tracking-tight mb-1 text-[var(--color-text-primary)]">
                  Welcome back
                </h2>
                <p className="text-sm font-body mb-5 text-[var(--color-text-secondary)]">
                  Sign in to your {role === "talent" ? "Performer" : "Client"} account.
                </p>

                {/* Google OAuth Button */}
                <button
                  type="button"
                  onClick={handleSupabaseGoogle}
                  disabled={submitting || googleAuthLoading}
                  className="w-full h-12 rounded-full border border-[var(--color-hairline)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-surface-2)] transition-colors flex items-center justify-center gap-2.5 text-sm font-semibold font-body text-[var(--color-text-primary)] mb-4 active:scale-[0.99] shadow-xs"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  {googleAuthLoading ? "Redirecting to Google…" : "Continue with Google"}
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-[var(--color-hairline)]" />
                  <span className="text-xs font-body tracking-normal text-[var(--color-text-tertiary)]">Or sign in with email</span>
                  <div className="flex-1 h-px bg-[var(--color-hairline)]" />
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium font-body text-[var(--color-text-secondary)] pl-1">Email address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="h-12 pl-10 pr-4 rounded-full text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium font-body text-[var(--color-text-secondary)] pl-1">Password</label>
                      <button
                        type="button"
                        className="text-xs font-body hover:underline text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        onClick={() => setView("forgot")}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        type={showPwd ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="h-12 pl-10 pr-11 rounded-full text-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-full hover:bg-[var(--color-bg-surface-2)] transition-colors"
                        aria-label={showPwd ? "Hide password" : "Show password"}
                      >
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 flex items-start gap-2.5 text-xs font-body text-[var(--color-error)]">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant={role === "talent" ? "red" : "purple"}
                    className="w-full h-12 mt-1 text-sm font-bold rounded-full shadow-md"
                    disabled={submitting}
                  >
                    {submitting ? "Signing in…" : "Sign In"}
                  </Button>
                </form>

                <p className="text-sm text-center mt-4 font-body text-[var(--color-text-secondary)]">
                  New here?{" "}
                  <button
                    type="button"
                    className="hover:underline font-semibold text-[var(--color-accent)] underline-offset-2"
                    onClick={() => setView("register")}
                  >
                    Create free account
                  </button>
                </p>

                {/* Quick Demo Access (Session 165 Restoration) */}
                <div className="mt-5 pt-3.5 border-t border-[var(--color-hairline)] flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium font-body text-[var(--color-text-tertiary)] flex items-center gap-1">
                    <span>⚡</span> Quick Demo:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem("monologg_is_new_user", "false");
                        appStateSync.setLoggedInUser({
                          id: "usr-demo-talent",
                          email: "emeka@example.com",
                          name: "Emeka Johnson",
                          userType: "TALENT",
                          authProvider: "EMAIL",
                          isNewUser: false,
                        });
                        navigate("/dashboard");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F13030]/10 text-[#F13030] hover:bg-[#F13030]/20 transition-all border border-[#F13030]/20 cursor-pointer active:scale-95"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F13030]" />
                      Performer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem("monologg_is_new_user", "false");
                        appStateSync.setLoggedInUser({
                          id: "usr-demo-client",
                          email: "sarah@filmcraft.com",
                          name: "Sarah Jenkins",
                          userType: "CLIENT",
                          authProvider: "EMAIL",
                          isNewUser: false,
                        });
                        navigate("/client");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#7B00FE]/10 text-[#7B00FE] hover:bg-[#7B00FE]/20 transition-all border border-[#7B00FE]/20 cursor-pointer active:scale-95"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7B00FE]" />
                      Client
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── OTP entry (Phase 12B) ── */}
            {view === "otp_entry" && (
              <motion.div
                key="otp_entry"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col"
              >
                <button
                  onClick={() => setView("login")}
                  className="mb-5 -ml-1 flex items-center gap-1 text-xs font-medium font-body text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors p-1 rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to sign in
                </button>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-[var(--color-bg-surface-2)] border border-[var(--color-hairline)]">
                  <KeyRound className="w-6 h-6" style={{ color: "var(--color-gold-primary)" }} />
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-1 text-[var(--color-text-primary)]">
                  Enter your code
                </h2>
                <p className="text-sm font-body mb-6 text-[var(--color-text-secondary)]">
                  We sent a 6-digit code to <strong className="text-[var(--color-text-primary)]">{otpEmail}</strong>.
                </p>
                <form onSubmit={handleOtpVerify} className="flex flex-col gap-3.5">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium font-body text-[var(--color-text-secondary)] pl-1">Verification code</label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="000000"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="h-12 text-center tracking-[0.3em] text-xl font-mono rounded-full"
                      required
                    />
                  </div>
                  {error && (
                    <div className="p-3 rounded-xl bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 flex items-start gap-2.5 text-xs font-body text-[var(--color-error)]">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}
                  <Button
                    type="submit"
                    variant={role === "talent" ? "red" : "purple"}
                    className="w-full h-12 text-sm font-bold rounded-full shadow-md"
                    disabled={otpCode.length !== 6 || submitting}
                  >
                    {submitting ? "Verifying…" : "Verify Code"}
                  </Button>
                </form>
                <div className="mt-4 text-center">
                  {otpResendCooldown > 0 ? (
                    <p className="text-xs font-body text-[var(--color-text-tertiary)]">Resend in {otpResendCooldown}s</p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleOtpRequest as unknown as React.MouseEventHandler}
                      className="text-xs font-body hover:underline text-[var(--color-text-primary)] font-medium"
                    >
                      Resend code
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Magic Link Sent (Phase 12B) ── */}
            {view === "magic_sent" && (
              <motion.div
                key="magic_sent"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-4"
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-[var(--color-success-bg)] border border-[var(--color-success)]/20">
                  <Mail className="w-7 h-7 text-[var(--color-success)]" />
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-1 text-[var(--color-text-primary)]">
                  Check your inbox
                </h2>
                <p className="text-sm font-body mb-6 text-[var(--color-text-secondary)] max-w-xs">
                  We sent a magic sign-in link to <strong className="text-[var(--color-text-primary)]">{magicLinkEmail}</strong>. Click the link in the email to continue.
                  {SUPABASE_MODE === "mock" && " (Dev mode: check console for link.)"}
                </p>
                <Button
                  variant="outline-pill"
                  className="h-11 px-6 text-xs font-semibold rounded-full"
                  onClick={() => setView("login")}
                >
                  Back to Sign In
                </Button>
              </motion.div>
            )}

            {/* ── Forgot Password ── */}
            {view === "forgot" && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col"
              >
                <button
                  onClick={() => setView("login")}
                  className="mb-5 -ml-1 flex items-center gap-1 text-xs font-medium font-body text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors p-1 rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to sign in
                </button>

                {!forgotSent ? (
                  <>
                    <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-1 text-[var(--color-text-primary)]">
                      Reset password
                    </h2>
                    <p className="text-sm font-body mb-6 text-[var(--color-text-secondary)]">
                      Enter your email and we'll send you a password reset link.
                    </p>
                    <form onSubmit={handleForgot} className="flex flex-col gap-3.5">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium font-body text-[var(--color-text-secondary)] pl-1">Email address</label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="h-12 pl-10 pr-4 rounded-full text-sm"
                            required
                          />
                        </div>
                      </div>
                      {error && (
                        <div className="p-3 rounded-xl bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 flex items-start gap-2.5 text-xs font-body text-[var(--color-error)]">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{error}</span>
                        </div>
                      )}
                      <Button
                        type="submit"
                        variant={role === "talent" ? "red" : "purple"}
                        className="w-full h-12 mt-1 text-sm font-bold rounded-full shadow-md"
                        disabled={submitting}
                      >
                        {submitting ? "Sending…" : "Send Reset Link"}
                      </Button>
                    </form>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-4"
                  >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-[var(--color-success-bg)] border border-[var(--color-success)]/20">
                      <Check className="w-7 h-7 text-[var(--color-success)]" />
                    </div>
                    <h3 className="font-display text-2xl font-bold mb-1 text-[var(--color-text-primary)]">
                      Check your email
                    </h3>
                    <p className="text-sm font-body text-[var(--color-text-secondary)] max-w-xs mx-auto mb-6">
                      We sent a reset link to <strong className="text-[var(--color-text-primary)]">{email}</strong>. Check your inbox and follow the instructions.
                    </p>
                    <Button
                      variant="outline-pill"
                      className="h-11 px-6 text-xs font-semibold rounded-full"
                      onClick={() => {
                        setForgotSent(false);
                        setView("login");
                      }}
                    >
                      Back to Sign In
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

      {/* ── Right panel: Atmospheric Showcase (Full-Bleed, Casual Flow Copy, Cropped Device) ── */}
      <div 
        className="hidden lg:flex flex-col justify-between items-center relative overflow-hidden pt-8 xl:pt-12 px-8 h-full max-h-screen"
        style={{
          background: isDark 
            ? "radial-gradient(130% 95% at 50% 8%, #1A1325 0%, #100E17 50%, #0A090D 100%)"
            : "radial-gradient(130% 95% at 50% 8%, #EBF4FF 0%, #E3EDF9 50%, #D8E5F5 100%)"
        }}
      >
        <div 
          className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
            isDark ? "opacity-15 mix-blend-overlay" : "opacity-90"
          }`}
          style={{
            backgroundImage: "url('/auth-backdrop.png')",
            backgroundSize: "cover",
            backgroundPosition: "center top"
          }}
        />

        {/* Casual Flow Editorial Copy */}
        <div className="relative z-10 text-center max-w-[520px] mb-4">
          <div 
            className="text-base lg:text-lg font-medium mb-1 tracking-tight font-body transition-colors"
            style={{
              color: isDark ? "rgba(255, 255, 255, 0.70)" : "#475569"
            }}
          >
            {role === "talent" ? "lets help you" : "Lets help you"}
          </div>
          <h2 
            className="text-2xl lg:text-3xl xl:text-4xl font-bold tracking-tight leading-tight font-display transition-colors"
            style={{
              color: isDark ? "#FFFFFF" : "#09090b"
            }}
          >
            {role === "talent" ? "Find gigs, finish your project" : "Find performers, Finish your project"}
          </h2>
        </div>

        {/* Device Stage Wrapper (Grounded at bottom, cropped 200px down for the cropped vibe) */}
        <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-end overflow-hidden">
          <img
            src={role === "talent" ? "/auth-performer-device.png" : "/auth-client-device.png"}
            alt={role === "talent" ? "Monologg Performer App" : "Monologg Client App"}
            className="w-[330px] xl:w-[380px] max-w-[420px] h-auto object-contain block select-none pointer-events-none transition-all duration-300 translate-y-[200px]"
            style={{ aspectRatio: "489 / 1024" }}
          />
        </div>
      </div>
    </div>
  );
}

