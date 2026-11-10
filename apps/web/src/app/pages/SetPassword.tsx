import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { apiClient } from "../../lib/api-client";
import { Lock, AlertCircle, ShieldCheck } from "lucide-react";

/**
 * PWA-19 — features.md Phase 16 (FA-5): the emailed link a guest-checkout buyer
 * lands on to "set a password / use this magic link to manage your booking" once
 * services/payment.ts's webhook has surfaced their auto-created account. Reuses
 * POST /auth/reset-password (routes/auth.ts) via apiClient.setPassword — the same
 * token also logs them in, so this doubles as the "magic link" the PRD calls for.
 * Deliberately unauthenticated: this IS how a fresh guest gets a session.
 */
export function SetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("This link is missing its token — please use the link from your email.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const user = await apiClient.setPassword(token, password);
      navigate(user.userType === "CLIENT" ? "/client" : "/dashboard");
    } catch {
      setError("This link may have expired. Request a new one or contact support.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "var(--color-bg-canvas)" }}>
      <div className="w-full max-w-sm">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5 mx-auto" style={{ background: "var(--color-accent-soft)" }}>
          <ShieldCheck className="w-7 h-7" style={{ color: "var(--color-accent)" }} />
        </div>
        <h1 className="font-display text-xl mb-2 text-center" style={{ color: "var(--color-text-primary)" }}>Set your password</h1>
        <p className="text-sm font-body mb-6 text-center" style={{ color: "var(--color-text-secondary)" }}>
          Your booking is confirmed and your escrow is funded. Set a password to manage it — approve deliveries, message your performer, and track your booking.
        </p>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl mb-4 text-sm font-body" style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}>
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium font-body mb-1.5 text-[var(--color-text-secondary)]">New password</label>
            <Input
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl text-sm"
              minLength={8}
              required
            />
          </div>
          <Button type="submit" className="w-full h-11 rounded-xl gap-2 font-semibold text-sm" disabled={submitting || password.length < 8}>
            <Lock className="w-4 h-4" />
            {submitting ? "Setting up…" : "Set Password & Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
