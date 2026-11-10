import { z } from "zod";

/** A single Order Room message. Mirrors the real Message model (features.md
 * Phase 2/5) — `kind` there is TEXT|VOICE|DOCUMENT|CALL|SYSTEM, a superset of
 * the prototype's `from`/`attachment` shape. `id` is a cuid string as of Phase 5. */
export const OrderMessageSchema = z.object({
  id: z.string(),
  from: z.enum(["talent", "client", "system"]),
  text: z.string(),
  time: z.string(),
  attachment: z
    .object({
      name: z.string(),
      size: z.string(),
      type: z.enum(["file", "image"]),
    })
    .optional(),
});
export type OrderMessage = z.infer<typeof OrderMessageSchema>;
