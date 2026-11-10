import type { Order } from "@monologg/types";

// Same booking data the prototype always had — `talent`/`client` fields
// renamed to the shared `counterpart` key (see @monologg/types Order).
// Status vocabularies deliberately differ between the two lists ("active"
// vs. "in_progress" for the same Deliverables phase) because that's what
// each dashboard's badge-coloring logic already keyed off — preserved
// exactly rather than unified, since this is a pure refactor.

export const CLIENT_ORDERS: Order[] = [
  { id: "ORD-001", counterpart: "Adaeze Obi", project: "Nike Commercial VO", amount: "₦45,000", phase: "Deliverables", status: "active", due: "Dec 18" },
  { id: "ORD-002", counterpart: "Kofi Mensah", project: "Tech Summit Compere", amount: "₦80,000", phase: "Review", status: "review", due: "Dec 22" },
  { id: "ORD-003", counterpart: "Chidi Okeke", project: "Film Auditions Jan 25", amount: "₦120,000", phase: "Deliverables", status: "new", due: "Dec 28" },
];

export const TALENT_ORDERS: Order[] = [
  { id: "ORD-001", counterpart: "FilmCraft Lagos", project: "Nike Commercial VO", amount: "₦120,000", status: "in_progress", phase: "Deliverables", due: "Dec 18" },
  { id: "ORD-002", counterpart: "EventPro Abuja", project: "Tech Summit Compere", amount: "₦80,000", status: "review", phase: "Review", due: "Dec 22" },
  { id: "ORD-003", counterpart: "Brand Agency NG", project: "Radio Ad Campaign", amount: "₦45,000", status: "new", phase: "Deliverables", due: "Dec 28" },
];
