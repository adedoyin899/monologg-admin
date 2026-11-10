import type { Niche } from "@prisma/client";

// Small formatting helpers shared by read-model mappers (talent discovery,
// rate cards, bookings) — turning real schema values into the same kind of
// display strings the prototype's mocks always used.

const NICHE_LABELS: Record<Niche, string> = {
  ACTOR: "Actor",
  VO_ARTIST: "Voice-Over Artist",
  COMEDIAN: "Comedian",
  COMPERE: "Compere",
  SPEAKER_PASTOR: "Speaker",
  MUSICIAN: "Musician",
  CONTENT_CREATOR: "Content Creator",
};

export function nicheLabel(niche: Niche): string {
  return NICHE_LABELS[niche];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const CURRENCY_SYMBOLS: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£" };

/** Formats integer minor units (kobo/cents) as a display string, e.g. 2800000 → "₦28,000". */
export function formatMoney(minorUnits: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  const majorUnits = minorUnits / 100;
  return `${symbol}${majorUnits.toLocaleString("en-US")}`;
}
