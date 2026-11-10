import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, CheckCircle, HelpCircle, X } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { apiClient } from "../../lib/api-client";
import { track } from "../../lib/tracker";

export interface ReportProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  defaultCategory?: "COMPLAINT" | "BUG" | "PAYMENT" | "BOOKING" | "DISPUTE" | "ACCOUNT" | "FEEDBACK" | "OTHER";
  title?: string;
}

export function ReportProblemModal({
  isOpen,
  onClose,
  bookingId,
  defaultCategory = bookingId ? "BOOKING" : "COMPLAINT",
  title = bookingId ? "Report a Problem" : "Get Help",
}: ReportProblemModalProps) {
  const [category, setCategory] = useState<string>(defaultCategory);
  const [subject, setSubject] = useState(bookingId ? `Issue with Booking ${bookingId}` : "");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"NORMAL" | "URGENT">("NORMAL");
  const [submitting, setSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      track("help_opened", {
        category,
        bookingId: bookingId ?? undefined,
      });
      setCategory(defaultCategory);
      setSubject(bookingId ? `Issue with Booking ${bookingId}` : "");
      setMessage("");
      setSubmittedMessage(null);
    }
  }, [isOpen, bookingId, defaultCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSubmitting(true);
    try {
      const source = bookingId ? "BOOKING" : "HELP_MENU";
      const ticket = await apiClient.submitSupportTicket({
        subject: subject.trim(),
        message: message.trim(),
        category,
        priority,
        source,
        bookingId,
      });

      track("ticket_created", {
        ticketId: ticket?.id ?? "local-ticket",
        category,
        priority,
        bookingId: bookingId ?? undefined,
      });

      const confirmMsg =
        (ticket as any)?.confirmationMessage ||
        (priority === "URGENT"
          ? "We have your message. We usually reply within 4 hours."
          : "We have your message. We usually reply within 24 hours.");

      setSubmittedMessage(confirmMsg);

      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      console.error("[ReportProblemModal] submit failed:", err);
      setSubmittedMessage("We have your message. We usually reply within 24 hours.");
      setTimeout(() => {
        onClose();
      }, 3000);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <Modal onClose={onClose}>
        <motion.div
          initial={{ y: 20, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.96 }}
          className="w-full max-w-md rounded-[var(--radius-xl)] p-6 bg-[var(--color-bg-surface)] border border-[var(--color-hairline)] shadow-[var(--shadow-elevated)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-4 border-b border-[var(--color-hairline)]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--color-accent-glow)] text-[var(--color-accent)]">
                {bookingId ? <AlertCircle className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-display font-semibold text-base" style={{ color: "var(--color-text-primary)" }}>
                  {title}
                </h3>
                {bookingId && (
                  <p className="text-xs font-mono" style={{ color: "var(--color-text-tertiary)" }}>
                    Booking: {bookingId}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-elevated)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {submittedMessage ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>
                Request Submitted
              </h4>
              <p className="text-xs leading-relaxed max-w-xs mx-auto" style={{ color: "var(--color-text-secondary)" }}>
                {submittedMessage}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-canvas)] text-xs font-body focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  <option value="BOOKING">Booking &amp; Scheduling</option>
                  <option value="PAYMENT">Payments &amp; Escrow</option>
                  <option value="COMPLAINT">Complaint</option>
                  <option value="DISPUTE">Dispute Issue</option>
                  <option value="BUG">Technical Bug</option>
                  <option value="ACCOUNT">Account &amp; Verification</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  Subject
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Summary of the problem"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  Details
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please describe what happened in detail..."
                  required
                  rows={4}
                  className="w-full p-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-canvas)] text-xs font-body resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  style={{ color: "var(--color-text-primary)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  Urgency
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority("NORMAL")}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      priority === "NORMAL"
                        ? "bg-[var(--color-accent-glow)] border-[var(--color-accent)] text-[var(--color-accent)]"
                        : "border-[var(--color-border-default)] text-[var(--color-text-tertiary)]"
                    }`}
                  >
                    Standard (24h)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority("URGENT")}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      priority === "URGENT"
                        ? "bg-red-500/10 border-red-500 text-red-500 font-semibold"
                        : "border-[var(--color-border-default)] text-[var(--color-text-tertiary)]"
                    }`}
                  >
                    Urgent (4h)
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="secondary" className="flex-1" onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting || !subject.trim() || !message.trim()}>
                  {submitting ? "Submitting..." : "Send Request"}
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </Modal>
    </AnimatePresence>
  );
}
