import { z } from "zod";

/** A recent-activity feed entry on the talent dashboard. */
export const ActivityItemSchema = z.object({
  type: z.string(),
  client: z.string(),
  service: z.string(),
  amount: z.string(),
  time: z.string(),
  status: z.string(),
});
export type ActivityItem = z.infer<typeof ActivityItemSchema>;
