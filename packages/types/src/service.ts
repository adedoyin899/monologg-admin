import { z } from "zod";

/** A talent's purchasable service listing. Mirrors the real RateCard model
 * (features.md Phase 2/5). `id` is a cuid string (RateCard.id) as of Phase 5. */
export const ServiceRateCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.string(),
  delivery: z.string(),
  bookings: z.number().int(),
});
export type ServiceRateCard = z.infer<typeof ServiceRateCardSchema>;

/** GET /api/v1/creators/:id/rate-cards (features.md Phase 13) — the public,
 * read-only counterpart a CLIENT sees when booking a specific talent. Carries
 * the raw integer minor-unit amount (never floats) alongside the pre-formatted
 * `price` display string, since Checkout needs the real number to show a fee
 * breakdown a server-created booking will later confirm exactly. */
export const PublicRateCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.string(),
  basePriceAmount: z.number().int(),
  basePriceCurrency: z.string(),
  delivery: z.string(),
});
export type PublicRateCard = z.infer<typeof PublicRateCardSchema>;
