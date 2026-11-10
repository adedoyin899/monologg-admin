import type { StatMetric } from "@monologg/types";

// `kind` is a new field (icon/color were stripped — see @monologg/types
// StatMetric doc comment); each dashboard maps kind -> icon/color locally.

export const CLIENT_STATS: StatMetric[] = [
  { kind: "active-projects", label: "Active Projects", value: "4", delta: "2 in review" },
  { kind: "talents-hired", label: "Talents Hired", value: "12", delta: "+3 this month" },
  { kind: "total-spent", label: "Total Spent", value: "₦850K", delta: "Dec budget: ₦200K" },
  { kind: "avg-rating", label: "Avg. Rating Given", value: "4.8", delta: "Excellent" },
];

export const TALENT_STATS: StatMetric[] = [
  { kind: "earnings", label: "This Month", value: "₦148,000", delta: "+18%" },
  { kind: "active-bookings", label: "Active Bookings", value: "3", delta: "2 new" },
  { kind: "profile-views", label: "Profile Views", value: "1,240", delta: "+34%" },
  { kind: "response-rate", label: "Response Rate", value: "96%", delta: "Excellent" },
];
