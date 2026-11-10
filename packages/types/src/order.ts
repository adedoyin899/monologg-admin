import { z } from "zod";

/** A booking as seen from either side of the marketplace. `counterpart` is
 * the other party's display name — "the talent" from a client's view, or
 * "the client" from a talent's view — the prototype previously had two
 * near-identical shapes (`talent`/`client` field names) for exactly this;
 * unified here since the displayed value was always identical, just the
 * key differed. Mirrors the eventual Booking model (features.md Phase 2). */
export const OrderSchema = z.object({
  id: z.string(),
  counterpart: z.string(),
  project: z.string(),
  /** Pre-formatted display string — see the same note on Talent.price. */
  amount: z.string(),
  status: z.string(),
  phase: z.string(),
  due: z.string(),
});
export type Order = z.infer<typeof OrderSchema>;
