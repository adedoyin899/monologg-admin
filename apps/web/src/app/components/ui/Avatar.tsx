import * as React from "react";
import { cn } from "../../../lib/utils";

const SIZES = {
  sm: "w-9 h-9 text-sm",
  md: "w-10 h-10 text-sm",
  lg: "w-11 h-11 text-base",
  xl: "w-14 h-14 text-lg",
} as const;

interface AvatarProps {
  size?: keyof typeof SIZES;
  /** CSS color value, e.g. "var(--color-accent-soft)" */
  background?: string;
  /** CSS color value, e.g. "var(--color-accent)" */
  color?: string;
  /** Optional photo — falls back to initials/icon children if the image fails to load */
  src?: string;
  alt?: string;
  className?: string;
  children: React.ReactNode;
}

/** Circular avatar shell for initials, an icon, or (optionally) a photo.
 * Recurs 25+ times across pages with identical structure and only
 * background/color/size varying. */
export function Avatar({ size = "md", background, color, src, alt, className, children }: AvatarProps) {
  const [imgFailed, setImgFailed] = React.useState(false);
  const showImg = src && !imgFailed;

  return (
    <div
      className={cn("relative rounded-full flex items-center justify-center font-semibold font-body shrink-0 overflow-hidden", SIZES[size], className)}
      style={{ background: background ?? "var(--color-bg-elevated)", color: color ?? "var(--color-text-primary)" }}
    >
      {showImg && (
        <img
          src={src}
          alt={alt ?? ""}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      )}
      {!showImg && children}
    </div>
  );
}
