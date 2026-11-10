import { z } from "zod";

/** A user's own view of one Payment row (features.md Phase 10). `direction`
 * disambiguates the math: "payment" = what a client was charged (base +
 * clientFee); "payout" = what a creator receives net (base − talentFee). */
export const TransactionSchema = z.object({
  id: z.string(),
  bookingId: z.string(),
  direction: z.enum(["payment", "payout"]),
  state: z.enum([
    "INITIATED",
    "AUTHORIZED",
    "ESCROW_HELD",
    "RELEASING",
    "RELEASED",
    "REFUNDING",
    "REFUNDED",
    "FAILED",
  ]),
  currency: z.string(),
  baseAmount: z.number(),
  baseAmountFormatted: z.string(),
  feeAmount: z.number(),
  feeAmountFormatted: z.string(),
  totalAmount: z.number(),
  totalAmountFormatted: z.string(),
  providerRef: z.string().nullable(),
  createdAt: z.string(),
});
export type Transaction = z.infer<typeof TransactionSchema>;
