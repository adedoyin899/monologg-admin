import { prisma } from "../db/client.js";
import { nicheLabel, initials, formatMoney } from "../lib/display.js";

// Public marketplace profile (features.md Phase 15, FA-3). `monologg.co/[handle]`
// — `:id` (the creator's cuid) stands in for a real handle/username, the same
// forward-reference routes/mediaKit.ts already flagged when it built the first
// public creator sub-resource in Phase 12A.1. Every field returned here must be
// something a logged-out storefront visitor could already see — never a
// booking, message, contact detail, or anything KYC-internal beyond the
// boolean "verified" derivation (X3: identity verification and styleTags stay
// conceptually separate even in this public read model).

export class PublicProfileNotFoundError extends Error {
  constructor(id: string) {
    super(`Creator "${id}" not found`);
    this.name = "PublicProfileNotFoundError";
  }
}

export async function getPublicStorefront(creatorId: string) {
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    include: {
      media: { orderBy: { createdAt: "desc" } },
      rateCards: { orderBy: { basePriceAmount: "asc" } },
    },
  });
  if (!creator) throw new PublicProfileNotFoundError(creatorId);

  return {
    id: creator.id,
    name: creator.name,
    niche: creator.niche,
    nicheLabel: nicheLabel(creator.niche),
    location: creator.location,
    bio: creator.bio,
    styleTags: creator.styleTags,
    // X3: derived to a plain boolean — the public view gets "verified or not",
    // never the internal PROCESSING/FAILED states (those are the talent's own
    // business, surfaced only on their authenticated dashboard).
    verified: creator.verification === "VERIFIED",
    celebrityBadge: creator.celebrityBadge,
    media: creator.media.map((m) => ({ id: m.id, kind: m.kind, url: m.url, durationSec: m.durationSec })),
    rateCards: creator.rateCards.map((rc) => ({
      id: rc.id,
      title: rc.serviceTitle,
      price: formatMoney(rc.basePriceAmount, rc.basePriceCurrency),
      basePriceAmount: rc.basePriceAmount,
      basePriceCurrency: rc.basePriceCurrency,
      delivery: rc.deliveryTimeline,
    })),
  };
}

const BRAND = {
  cream: "#FAF5E9",
  coral: "#E85B52",
  ink: "#221C19",
};

/**
 * A deterministic initials-mark SVG stands in for a real Open Graph photo —
 * no phase's schema stores a creator headshot (same gap services/mediaKit.ts's
 * PDF renderer already documents), so this generates a real, data-derived
 * image instead of embedding a stock/fabricated photo. Valid as an `og:image`
 * URL (an absolute `<img>`-fetchable resource), unlike a data: URI.
 */
export function renderOgImageSvg(name: string): string {
  const mark = initials(name) || "?";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${BRAND.cream}" />
  <circle cx="600" cy="275" r="120" fill="${BRAND.coral}" />
  <text x="600" y="275" dy="0.35em" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="96" font-weight="700" fill="#ffffff">${mark}</text>
  <text x="600" y="460" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="48" font-weight="700" fill="${BRAND.ink}">${escapeXml(name)}</text>
</svg>`;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
