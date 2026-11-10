import { z } from "zod";

// features.md Phase 15 (FA-3) — the public, logged-out-reachable storefront
// at monologg.co/[handle]. Mirrors GET /api/v1/creators/:id/public exactly;
// every field here is something a logged-out visitor can already see.

export const PublicMediaAssetSchema = z.object({
  id: z.string(),
  kind: z.enum(["VIDEO", "AUDIO"]),
  url: z.string(),
  durationSec: z.number().int().nullable(),
});
export type PublicMediaAsset = z.infer<typeof PublicMediaAssetSchema>;

export const PublicStorefrontSchema = z.object({
  id: z.string(),
  name: z.string(),
  niche: z.string(),
  nicheLabel: z.string(),
  location: z.string(),
  bio: z.string().nullable(),
  styleTags: z.array(z.string()),
  verified: z.boolean(),
  celebrityBadge: z.boolean(),
  media: z.array(PublicMediaAssetSchema),
  rateCards: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      price: z.string(),
      basePriceAmount: z.number().int(),
      basePriceCurrency: z.string(),
      delivery: z.string(),
    }),
  ),
});
export type PublicStorefront = z.infer<typeof PublicStorefrontSchema>;
