import type { PublicRateCard, ServiceRateCard } from "@monologg/types";

export const SERVICES: ServiceRateCard[] = [
  { id: "1", title: "Feature Film Audition", price: "₦120,000", delivery: "48 Hours", bookings: 24 },
  { id: "2", title: "Commercial Voice-Over", price: "₦45,000", delivery: "Same Day", bookings: 67 },
];

// features.md Phase 13: mock-mode fixture for GET /creators/:id/rate-cards
// (the public, client-facing counterpart to SERVICES above), used by
// Checkout.tsx's service picker when VITE_API_MODE=mock.
export const PUBLIC_RATE_CARDS: PublicRateCard[] = [
  { id: "1", title: "Standard Booking", price: "₦120,000", basePriceAmount: 120_000_00, basePriceCurrency: "NGN", delivery: "48 Hours" },
  { id: "2", title: "Rush Delivery", price: "₦180,000", basePriceAmount: 180_000_00, basePriceCurrency: "NGN", delivery: "Same Day" },
];
