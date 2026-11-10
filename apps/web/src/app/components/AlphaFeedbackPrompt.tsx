import { useState } from "react";
import { ThumbsUp, ThumbsDown, Check, MessageSquare } from "lucide-react";
import { apiClient } from "../../lib/api-client";
import { track } from "../../lib/tracker";

export interface AlphaFeedbackPromptProps {
  compact?: boolean;
}

export function AlphaFeedbackPrompt({ compact = false }: AlphaFeedbackPromptProps) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSelectRating = (type: "up" | "down") => {
    setRating(type);
    setShowInput(true);
  };

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      const subject = `Alpha Feedback: ${rating === "up" ? "Positive" : "Needs Improvement"}`;
      const message = comment.trim() || `User gave thumbs ${rating} on alpha experience.`;

      await apiClient.submitSupportTicket({
        subject,
        message,
        category: "FEEDBACK",
        priority: "LOW",
        source: "IN_APP",
      });

      track("feedback_submitted", {
        rating,
        hasComment: !!comment.trim(),
      });

      setSubmitted(true);
    } catch (err) {
      console.error("[AlphaFeedbackPrompt] failed to submit feedback:", err);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
        <Check className="w-4 h-4 shrink-0" />
        <span>Thank you for your feedback! It helps us shape Monologg.</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-3 text-xs font-body ${
        compact ? "" : "shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-medium" style={{ color: "var(--color-text-secondary)" }}>
          <MessageSquare className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          <span>How is your alpha experience?</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleSelectRating("up")}
            className={`p-1.5 rounded-lg border transition-all ${
              rating === "up"
                ? "bg-emerald-500/20 border-emerald-500 text-emerald-600"
                : "border-[var(--color-border-default)] hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-tertiary)]"
            }`}
            title="Good experience"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleSelectRating("down")}
            className={`p-1.5 rounded-lg border transition-all ${
              rating === "down"
                ? "bg-red-500/20 border-red-500 text-red-600"
                : "border-[var(--color-border-default)] hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-tertiary)]"
            }`}
            title="Needs improvement"
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showInput && (
        <div className="mt-2.5 pt-2 border-t border-[var(--color-hairline)] space-y-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any specific comments? (optional)"
            className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            style={{ color: "var(--color-text-primary)" }}
          />
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-3 py-1 rounded-md text-xs font-semibold bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
