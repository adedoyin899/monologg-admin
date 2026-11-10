import type { PublicStorefront } from "@monologg/types";

// features.md Phase 15 (FA-3) — mock-mode fixture for the public,
// logged-out-reachable storefront at /[handle].
export const PUBLIC_STOREFRONT: PublicStorefront = {
  id: "mock-creator",
  name: "Emeka Johnson",
  niche: "ACTOR",
  nicheLabel: "Actor",
  location: "Lagos, Nigeria",
  bio: "Specializing in intense dramatic monologues and authoritative voice-overs. 10+ years stage experience across Nollywood productions, corporate events, and studio sessions.",
  styleTags: ["Dramatic", "Deep Texture", "British Accent", "Authoritative", "Warm"],
  verified: true,
  celebrityBadge: true,
  media: [{ id: "mock-media-1", kind: "VIDEO", url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80&fit=crop", durationSec: 165 }],
  rateCards: [
    { id: "1", title: "Feature Film Audition", price: "₦120,000", basePriceAmount: 12_000_000, basePriceCurrency: "NGN", delivery: "48 Hours" },
    { id: "2", title: "Commercial Voice-Over", price: "₦45,000", basePriceAmount: 4_500_000, basePriceCurrency: "NGN", delivery: "Same Day" },
  ],
};
