import * as React from "react";
import { motion } from "motion/react";
import { cn } from "../../../lib/utils";

interface ModalProps {
  onClose: () => void;
  /** "center" for confirm/dialog modals, "end" for bottom-sheet-on-mobile
   * modals, "right" for a full-height slide-in drawer (e.g. notifications) */
  align?: "center" | "end" | "right";
  /** Scrim opacity — "strong" (--color-overlay-strong, 0.6) vs default (--color-overlay, 0.5) */
  strength?: "default" | "strong";
  className?: string;
  children: React.ReactNode;
}

/**
 * Shared modal scrim + positioning wrapper. Owns the overlay color
 * (var(--color-overlay*) — see src/styles/tokens.css), backdrop blur,
 * fixed positioning, and click-outside-to-close. The panel itself
 * (entrance animation, content, buttons) stays bespoke per call site —
 * pass it as children and stop its click propagation so backdrop clicks
 * don't reach it.
 */
export function Modal({ onClose, align = "center", strength = "default", className, children }: ModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "fixed inset-0 z-50 flex",
        align === "right" ? "justify-end" : "justify-center p-4",
        align === "end" ? "items-end sm:items-center" : align === "right" ? "" : "items-center",
        className
      )}
      style={{
        background: strength === "strong" ? "var(--color-overlay-strong)" : "var(--color-overlay)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      {children}
    </motion.div>
  );
}
