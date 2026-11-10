import { useState, useEffect } from "react";
import { getConsentStatus, setConsentStatus, ConsentChoice } from "../../lib/tracker";
import { ShieldCheck, X } from "lucide-react";

export function ConsentBanner() {
  const [choice, setChoice] = useState<ConsentChoice>(() => getConsentStatus());
  const [isOpen, setIsOpen] = useState<boolean>(() => choice === null);

  useEffect(() => {
    const handleConsentChanged = (e: Event) => {
      const customEvent = e as CustomEvent<"accepted" | "declined">;
      setChoice(customEvent.detail);
      setIsOpen(false);
    };

    const handleOpenPreferences = () => {
      setIsOpen(true);
    };

    window.addEventListener("monologg:consent-changed", handleConsentChanged);
    window.addEventListener("monologg:open-consent-preferences", handleOpenPreferences);

    return () => {
      window.removeEventListener("monologg:consent-changed", handleConsentChanged);
      window.removeEventListener("monologg:open-consent-preferences", handleOpenPreferences);
    };
  }, []);

  const handleAccept = () => {
    setConsentStatus("accepted");
    setChoice("accepted");
    setIsOpen(false);
  };

  const handleDecline = () => {
    setConsentStatus("declined");
    setChoice("declined");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <aside
      aria-label="Privacy and Analytics Consent"
      role="region"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 max-w-md p-5 rounded-2xl shadow-2xl border transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
      style={{
        backgroundColor: "var(--color-bg-surface, #ffffff)",
        color: "var(--color-text-primary, #1a1a1a)",
        borderColor: "var(--color-border-default, #e8e8e8)",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ShieldCheck className="w-5 h-5 text-[#f13030]" />
          <span>Analytics & Privacy</span>
        </div>
        {choice !== null && (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close preferences"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300 mb-4 font-['Inter_Tight',sans-serif]">
        We use privacy-friendly anonymous analytics to see what works and improve Monologg. We never track your
        personal messages, private briefs, or sensitive details.
      </p>

      <div className="flex items-center justify-end gap-2 text-xs font-medium">
        <button
          type="button"
          onClick={handleDecline}
          className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          style={{ color: "var(--color-text-primary, #1a1a1a)" }}
        >
          Decline
        </button>
        <button
          type="button"
          onClick={handleAccept}
          className="px-3.5 py-2 rounded-xl text-white bg-[#f13030] hover:bg-[#d92626] font-semibold transition-colors shadow-sm"
        >
          Accept analytics
        </button>
      </div>
    </aside>
  );
}

