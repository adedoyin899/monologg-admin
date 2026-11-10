import { z } from "zod";

/** A talent profile as shown in client-side discovery/browse — mirrors the
 * real Creator + RateCard read model (features.md Phase 2/5). `id` is a cuid
 * string (Creator.id) as of Phase 5 — was a mock-only sequential number
 * before the real /talent discovery endpoint existed. */
export const TalentSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  location: z.string(),
  /** Pre-formatted display string (e.g. "₦28,000"), matching the prototype's
   * current UI exactly. Phase 2 stores money as integer minor units +
   * currency (per the money-handling invariant); this field becomes a
   * formatted projection of that, not the source of truth. */
  price: z.string(),
  tags: z.array(z.string()),
  verified: z.boolean(),
  rating: z.number(),
  reviews: z.number().int(),
  available: z.boolean(),
  avatar: z.string(),
  // features.md Phase 12A.3 — PUBLIC-visibility physical attributes only
  // (routes/talent.ts's publicAttributesOf). Optional: absent in every
  // pre-12A mock fixture, and a talent with no PhysicalAttributes row at all
  // simply has none to show, not an empty-but-present object either way.
  attributes: z.record(z.string(), z.string()).optional(),
});
export type Talent = z.infer<typeof TalentSchema>;
