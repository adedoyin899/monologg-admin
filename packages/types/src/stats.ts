import { z } from "zod";

/** A single dashboard stat tile's data. Icon and color are presentation
 * concerns (a lucide-react component reference isn't serializable JSON, and
 * a backend has no opinion on which icon represents "Profile Views") — the
 * consuming page maps `kind` to an icon/color locally. Mirrors the
 * eventual aggregation-query response for dashboard metrics. */
export const StatMetricSchema = z.object({
  kind: z.string(),
  label: z.string(),
  /** Pre-formatted display string — see the same note on Talent.price for
   * money-shaped values; some of these (counts, percentages) aren't money. */
  value: z.string(),
  delta: z.string(),
});
export type StatMetric = z.infer<typeof StatMetricSchema>;
