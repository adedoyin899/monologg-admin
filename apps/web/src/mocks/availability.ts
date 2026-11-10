import type { DayDetail } from "@monologg/types";

// features.md Phase 13: mock-mode day-detail fixture, replacing the
// prototype's old fixed weekly grid entirely. One demo date renders a
// populated day (free morning, unavailable evening, one personal event) so
// the calendar UI has something to show; every other date returns exactly
// the "unconfigured, fully open" shape the real default-free rule would
// produce for it — the mock and the live default-free behavior agree.
export const AVAILABILITY_DEMO_DATE = "2026-08-05";

export function mockDayDetail(date: string): DayDetail {
  if (date === AVAILABILITY_DEMO_DATE) {
    return {
      date,
      block: {
        id: "mock-block-1",
        slots: [
          { start: "09:00", end: "13:00", state: "free" },
          { start: "18:00", end: "22:00", state: "unavailable" },
        ],
        isRecurring: false,
        recurRule: null,
      },
      recurringTemplates: [],
      events: [{ id: "mock-event-1", date, start: "14:00", end: "15:00", title: "Table read", kind: "personal", bookingId: null }],
      openSlots: [
        { start: "00:00", end: "18:00" },
        { start: "22:00", end: "23:59" },
      ],
    };
  }
  return {
    date,
    block: null,
    recurringTemplates: [],
    events: [],
    openSlots: [{ start: "00:00", end: "23:59" }],
  };
}
