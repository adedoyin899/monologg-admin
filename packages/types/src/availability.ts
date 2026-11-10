import { z } from "zod";

// features.md Phase 13 (FA-1) — the real day/time-of-day availability model,
// replacing the prototype's old fixed weekly grid entirely (that shape is
// gone; nothing in apps/web references it anymore). Mirrors
// apps/api/src/services/availability.ts's own types exactly.

export const SlotStateSchema = z.enum(["free", "unavailable", "booked"]);
export type SlotState = z.infer<typeof SlotStateSchema>;

export const SlotSchema = z.object({
  start: z.string(), // "HH:MM", 24h
  end: z.string(),
  state: SlotStateSchema,
  bookingId: z.string().optional(),
});
export type Slot = z.infer<typeof SlotSchema>;

export const OpenIntervalSchema = z.object({ start: z.string(), end: z.string() });
export type OpenInterval = z.infer<typeof OpenIntervalSchema>;

export const AvailabilityBlockSchema = z.object({
  id: z.string(),
  date: z.string(), // ISO date, "YYYY-MM-DD"
  slots: z.array(SlotSchema),
  isRecurring: z.boolean(),
  recurRule: z.string().nullable().optional(),
  calendarEventId: z.string().nullable().optional(),
});
export type AvailabilityBlock = z.infer<typeof AvailabilityBlockSchema>;

export const CalendarEventKindSchema = z.enum(["personal", "hold", "booking"]);
export type CalendarEventKind = z.infer<typeof CalendarEventKindSchema>;

export const CalendarEventSchema = z.object({
  id: z.string(),
  date: z.string(),
  start: z.string(),
  end: z.string(),
  title: z.string(),
  kind: CalendarEventKindSchema,
  bookingId: z.string().nullable().optional(),
});
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

/** GET /api/v1/availability/day — everything scheduled on one day, resolved
 * server-side: the exact-date override block (if any), the recurring
 * templates that could apply, the day's CalendarEvents, and the
 * server-authoritative openSlots (the ONLY thing the UI should render as
 * "bookable" — never recomputed client-side). */
export const DayDetailSchema = z.object({
  date: z.string(),
  block: z
    .object({
      id: z.string(),
      slots: z.array(SlotSchema),
      isRecurring: z.literal(false),
      recurRule: z.null(),
    })
    .nullable(),
  recurringTemplates: z.array(z.object({ id: z.string(), slots: z.array(SlotSchema), recurRule: z.string().nullable() })),
  events: z.array(CalendarEventSchema),
  openSlots: z.array(OpenIntervalSchema),
});
export type DayDetail = z.infer<typeof DayDetailSchema>;

/** GET /api/v1/creators/:id/open-slots — the public, booking-sheet-facing
 * shape of the same server-authoritative resolution. */
export const OpenSlotsResponseSchema = z.object({
  date: z.string(),
  openSlots: z.array(OpenIntervalSchema),
});
export type OpenSlotsResponse = z.infer<typeof OpenSlotsResponseSchema>;
