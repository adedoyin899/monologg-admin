import { z } from "zod";

/** A client's posted project brief, as shown in the client dashboard's
 * "Projects" list. Mirrors the eventual Brief model (features.md Phase 2);
 * gains `applicantCap`/`applicationsOpen` in Phase 14. */
export const ClientProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  niche: z.string(),
  /** Pre-formatted display string — see the same note on Talent.price. */
  budget: z.string(),
  status: z.string(),
  /** features.md Phase 14: a real Application count, not a placeholder. */
  applicants: z.number().int(),
  applicantCap: z.number().int().nullable(),
  applicationsOpen: z.boolean(),
  posted: z.string(),
  draftStep: z.number().int().optional(),
  projectType: z.string().optional(),
  projectFormat: z.enum(["online", "onsite"]).optional(),
  venueLocation: z.string().optional(),
  description: z.string().optional(),
  selectedNiches: z.array(z.string()).optional(),
  timeline: z.string().optional(),
  location: z.string().optional(),
  scriptSample: z.string().optional(),
  additionalNotes: z.string().optional(),
  assets: z
    .array(
      z.object({
        name: z.string(),
        size: z.string(),
        type: z.string(),
      })
    )
    .optional(),
});
export type ClientProject = z.infer<typeof ClientProjectSchema>;
