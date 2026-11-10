import type { PrismaClient, BookingState, BookingOrigin } from "@prisma/client";
import { prisma as defaultPrisma } from "../db/client.js";
import { adminRoPrisma } from "../db/adminRoClient.js";
import {
  evaluateBookingStuck,
  formatAge,
  type StuckEvaluationResult,
} from "./stuckDetection.js";
import { maskEmail, maskPhone } from "../lib/masking.js";

export interface BookingFilters {
  state?: BookingState | string;
  origin?: BookingOrigin | string;
  currency?: string;
  niche?: string;
  dateFrom?: string;
  dateTo?: string;
  talent?: string; // creator name, handle/referralCode, or creatorId
  client?: string; // client name, orgName, or clientId
  hasDispute?: string | boolean;
  stuck?: string | boolean;
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface BookingListItem {
  id: string;
  state: BookingState;
  origin: BookingOrigin;
  currency: string;
  baseAmount: number;
  clientFeeAmount: number;
  talentFeeAmount: number;
  clientTotal: number;
  talentNet: number;
  slotDate: string;
  slotStart: string;
  slotEnd: string;
  engagementType: string;
  recurrence: string | null;
  meetUrl: string | null;
  contextNote: string | null;
  slotHoldExpiresAt: string | null;
  createdAt: string;
  talent: {
    id: string;
    userId: string;
    name: string;
    niche: string;
    avatarUrl: string | null;
    referralCode: string | null;
  };
  client: {
    id: string;
    userId: string;
    name: string;
    orgName: string | null;
    avatarUrl: string | null;
  };
  service: {
    id: string | null;
    title: string;
  };
  payment: {
    id: string | null;
    status: string | null;
    provider: string | null;
    providerRef: string | null;
    escrowHeld: boolean;
    amount: number | null;
  } | null;
  ageInState: {
    ms: number;
    seconds: number;
    human: string;
  };
  isStuck: boolean;
  stuckReason: string | null;
  hasDispute: boolean;
}

export interface BookingTimelineItem {
  id: string;
  type: "STATE_CHANGE" | "PAYMENT_EVENT" | "SYSTEM_MESSAGE" | "MILESTONE" | "GAP";
  title: string;
  description: string;
  timestamp: string;
  actor?: string;
  source?: string;
  isGap?: boolean;
  metadata?: Record<string, unknown>;
}

export interface OrderRoomMetadata {
  exists: boolean;
  totalMessages: number;
  countsByKind: {
    TEXT: number;
    VOICE: number;
    DOCUMENT: number;
    CALL: number;
    SYSTEM: number;
  };
  fileCount: number;
  callLinks: string[];
  lastActivityAt: string | null;
}

export interface BookingDetailResponse {
  booking: {
    id: string;
    state: BookingState;
    origin: BookingOrigin;
    currency: string;
    baseAmount: number;
    clientFeeAmount: number;
    talentFeeAmount: number;
    clientTotal: number;
    talentNet: number;
    feeBreakdownLabel: string;
    slotDate: string;
    slotStart: string;
    slotEnd: string;
    engagementType: string;
    recurrence: string | null;
    meetUrl: string | null;
    contextNote: string | null;
    slotHoldExpiresAt: string | null;
    createdAt: string;
    talent: {
      id: string;
      userId: string;
      name: string;
      email: string;
      phone: string;
      niche: string;
      bio: string | null;
      avatarUrl: string | null;
      celebrityBadge: boolean;
      referralCode: string | null;
    };
    client: {
      id: string;
      userId: string;
      name: string;
      email: string;
      phone: string;
      orgName: string | null;
      orgType: string | null;
      avatarUrl: string | null;
    };
    service: {
      id: string | null;
      title: string;
      deliveryTimeline: number | null;
    };
    payment: {
      id: string | null;
      status: string | null;
      provider: string | null;
      providerRef: string | null;
      escrowHeld: boolean;
      amount: number | null;
      currency: string | null;
      createdAt: string | null;
    } | null;
    ageInState: {
      ms: number;
      seconds: number;
      human: string;
    };
    isStuck: boolean;
    stuckReason: string | null;
    hasDispute: boolean;
    canReviewConversation: boolean;
    reviewDisabledReason: string | null;
    disputeDetail?: {
      status: string;
      subject?: string;
      ticketId?: string;
    } | null;
  };
  orderRoom: OrderRoomMetadata;
  timeline: BookingTimelineItem[];
}

/**
 * Lists bookings with cursor pagination and rich filtering.
 * High performance query optimized for 10,000+ bookings.
 */
export async function listAdminBookings(
  filters: BookingFilters = {},
  dbClient: any = adminRoPrisma || defaultPrisma
): Promise<{
  bookings: BookingListItem[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}> {
  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 100);
  const where: any = {};

  // 1. State filter
  if (filters.state && filters.state !== "ALL") {
    where.state = filters.state as BookingState;
  }

  // 2. Origin filter
  if (filters.origin && filters.origin !== "ALL") {
    where.origin = filters.origin as BookingOrigin;
  }

  // 3. Currency filter
  if (filters.currency && filters.currency !== "ALL") {
    where.currency = filters.currency;
  }

  // 4. Niche filter
  if (filters.niche && filters.niche !== "ALL") {
    where.creator = {
      ...(where.creator || {}),
      niche: filters.niche,
    };
  }

  // 5. Date filter (on slotDate or createdAt)
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
  }

  // 6. Talent search / filter
  if (filters.talent) {
    const term = filters.talent.trim();
    where.creator = {
      ...(where.creator || {}),
      OR: [
        { id: term },
        { name: { contains: term, mode: "insensitive" } },
        { referralCode: { contains: term, mode: "insensitive" } },
        { user: { email: { contains: term, mode: "insensitive" } } },
      ],
    };
  }

  // 7. Client search / filter
  if (filters.client) {
    const term = filters.client.trim();
    where.client = {
      ...(where.client || {}),
      OR: [
        { id: term },
        { name: { contains: term, mode: "insensitive" } },
        { orgName: { contains: term, mode: "insensitive" } },
        { user: { email: { contains: term, mode: "insensitive" } } },
      ],
    };
  }

  // 8. General search
  if (filters.search) {
    const term = filters.search.trim();
    where.OR = [
      { id: { contains: term, mode: "insensitive" } },
      { creator: { name: { contains: term, mode: "insensitive" } } },
      { client: { name: { contains: term, mode: "insensitive" } } },
      { client: { orgName: { contains: term, mode: "insensitive" } } },
    ];
  }

  // 9. Dispute filter
  const hasDisputeRequested =
    filters.hasDispute === true || filters.hasDispute === "true";
  if (hasDisputeRequested) {
    where.state = "DISPUTED";
  }

  // Cursor pagination
  let cursorOptions: any = {};
  if (filters.cursor) {
    cursorOptions = {
      cursor: { id: filters.cursor },
      skip: 1,
    };
  }

  // Fetch 1 extra to check hasMore
  const bookings = await dbClient.booking.findMany({
    where,
    take: limit + 1,
    ...cursorOptions,
    orderBy: { createdAt: "desc" },
    include: {
      creator: {
        select: {
          id: true,
          userId: true,
          name: true,
          niche: true,
          avatarUrl: true,
          referralCode: true,
        },
      },
      client: {
        select: {
          id: true,
          userId: true,
          name: true,
          orgName: true,
          avatarUrl: true,
        },
      },
      payment: {
        select: {
          id: true,
          status: true,
          provider: true,
          providerRef: true,
          escrowHeld: true,
          amount: true,
        },
      },
    },
  });

  const hasMore = bookings.length > limit;
  const items = hasMore ? bookings.slice(0, limit) : bookings;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

  // Approximate total count
  const totalCount =
    typeof dbClient.booking?.count === "function"
      ? await dbClient.booking.count({ where }).catch(() => items.length)
      : items.length;

  // Fetch RateCards for titles in bulk
  const rateCardIds = Array.from(
    new Set(items.map((b: any) => b.rateCardId).filter(Boolean))
  );
  let rateCardsMap = new Map<string, string>();
  if (rateCardIds.length > 0 && dbClient.rateCard?.findMany) {
    try {
      const cards = await dbClient.rateCard.findMany({
        where: { id: { in: rateCardIds } },
        select: { id: true, serviceTitle: true },
      });
      for (const c of cards) {
        rateCardsMap.set(c.id, c.serviceTitle);
      }
    } catch {
      // ignore
    }
  }

  // Process items with stuck evaluation and fee calculations
  const now = new Date();
  const formatted: BookingListItem[] = items.map((b: any) => {
    const stuckResult = evaluateBookingStuck(
      {
        id: b.id,
        state: b.state,
        createdAt: b.createdAt,
        slotHoldExpiresAt: b.slotHoldExpiresAt,
      },
      { now }
    );

    const clientTotal = b.baseAmount + (b.clientFeeAmount || 0);
    const talentNet = b.baseAmount - (b.talentFeeAmount || 0);
    const hasDispute = b.state === "DISPUTED";

    return {
      id: b.id,
      state: b.state,
      origin: b.origin,
      currency: b.currency,
      baseAmount: b.baseAmount,
      clientFeeAmount: b.clientFeeAmount || 0,
      talentFeeAmount: b.talentFeeAmount || 0,
      clientTotal,
      talentNet,
      slotDate: b.slotDate ? new Date(b.slotDate).toISOString() : b.createdAt.toISOString(),
      slotStart: b.slotStart || "10:00",
      slotEnd: b.slotEnd || "11:00",
      engagementType: b.engagementType || "ONE_OFF",
      recurrence: b.recurrence || null,
      meetUrl: b.meetUrl || null,
      contextNote: b.contextNote || null,
      slotHoldExpiresAt: b.slotHoldExpiresAt ? new Date(b.slotHoldExpiresAt).toISOString() : null,
      createdAt: new Date(b.createdAt).toISOString(),
      talent: {
        id: b.creator?.id || b.creatorId,
        userId: b.creator?.userId || "",
        name: b.creator?.name || "Unknown Creator",
        niche: b.creator?.niche || "OTHER",
        avatarUrl: b.creator?.avatarUrl || null,
        referralCode: b.creator?.referralCode || null,
      },
      client: {
        id: b.client?.id || b.clientId,
        userId: b.client?.userId || "",
        name: b.client?.name || "Unknown Client",
        orgName: b.client?.orgName || null,
        avatarUrl: b.client?.avatarUrl || null,
      },
      service: {
        id: b.rateCardId || null,
        title: rateCardsMap.get(b.rateCardId) || b.engagementType || "Consultation",
      },
      payment: b.payment
        ? {
            id: b.payment.id,
            status: b.payment.status,
            provider: b.payment.provider,
            providerRef: b.payment.providerRef,
            escrowHeld: Boolean(b.payment.escrowHeld),
            amount: b.payment.amount,
          }
        : null,
      ageInState: {
        ms: stuckResult.ageInStateMs,
        seconds: stuckResult.ageInStateSeconds,
        human: stuckResult.ageInStateHuman,
      },
      isStuck: stuckResult.isStuck,
      stuckReason: stuckResult.reason,
      hasDispute,
    };
  });

  // Post-filter stuck if requested in query
  let result = formatted;
  if (filters.stuck === true || filters.stuck === "true") {
    result = formatted.filter((b) => b.isStuck);
  } else if (filters.stuck === false || filters.stuck === "false") {
    result = formatted.filter((b) => !b.isStuck);
  }

  return {
    bookings: result,
    nextCursor,
    hasMore,
    totalCount,
  };
}

/**
 * Fetches single booking detail, fee breakdown, timeline, order room metadata,
 * and dispute review availability.
 * PRIVACY GUARANTEE: Never exposes message content.
 */
export async function getAdminBookingDetail(
  id: string,
  dbClient: any = adminRoPrisma || defaultPrisma
): Promise<BookingDetailResponse | null> {
  const booking = await dbClient.booking.findUnique({
    where: { id },
    include: {
      creator: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      client: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      payment: {
        include: {
          events: {
            orderBy: { createdAt: "asc" },
          },
        },
      },
      orderRoom: {
        include: {
          messages: {
            select: {
              id: true,
              kind: true,
              senderId: true,
              createdAt: true,
              // Strictly omit content!
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!booking) {
    return null;
  }

  // Fetch RateCard details
  let serviceTitle = booking.engagementType || "Booking";
  let deliveryTimeline: number | null = null;
  if (booking.rateCardId && dbClient.rateCard?.findUnique) {
    try {
      const rc = await dbClient.rateCard.findUnique({
        where: { id: booking.rateCardId },
      });
      if (rc) {
        serviceTitle = rc.serviceTitle;
        deliveryTimeline = rc.deliveryTimeline;
      }
    } catch {
      // ignore
    }
  }

  // Check linked disputes or tickets
  const creatorUserId = booking.creator?.user?.id || booking.creator?.userId;
  const clientUserId = booking.client?.user?.id || booking.client?.userId;
  const userIds = [creatorUserId, clientUserId].filter(Boolean);

  let openDisputeDetail: { status: string; subject?: string; ticketId?: string } | null = null;
  let hasDispute = booking.state === "DISPUTED";

  if (userIds.length > 0 && dbClient.supportTicket?.findMany) {
    try {
      const tickets = await dbClient.supportTicket.findMany({
        where: {
          userId: { in: userIds },
          OR: [
            { subject: { contains: booking.id, mode: "insensitive" } },
            { message: { contains: booking.id, mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
      });

      const openTicket = tickets.find(
        (t: any) => t.status === "OPEN" || t.status === "IN_PROGRESS"
      );
      if (openTicket) {
        hasDispute = true;
        openDisputeDetail = {
          status: openTicket.status,
          subject: openTicket.subject,
          ticketId: openTicket.id,
        };
      }
    } catch {
      // ignore
    }
  }

  if (booking.state === "DISPUTED" && !openDisputeDetail) {
    openDisputeDetail = {
      status: "DISPUTED",
      subject: "Booking marked as Disputed",
    };
  }

  // Query product events for booking_state_changed
  let stateEvents: any[] = [];
  if (dbClient.productEvent?.findMany) {
    try {
      const rawEvents = await dbClient.productEvent.findMany({
        where: {
          name: "booking_state_changed",
          occurredAt: { gte: new Date(booking.createdAt.getTime() - 60000) },
        },
        orderBy: { occurredAt: "asc" },
      });

      stateEvents = rawEvents.filter(
        (ev: any) => (ev.props as any)?.bookingId === booking.id
      );
    } catch {
      // ignore
    }
  }

  // Age in current state & stuck calculation
  let stateEnteredAt = booking.createdAt;
  const matchingTransition = stateEvents
    .slice()
    .reverse()
    .find((ev: any) => (ev.props as any)?.to === booking.state);

  if (matchingTransition) {
    stateEnteredAt = matchingTransition.occurredAt;
  } else if (booking.state === "ESCROW_LOCKED" && booking.payment?.createdAt) {
    stateEnteredAt = booking.payment.createdAt;
  }

  const stuckResult = evaluateBookingStuck(
    {
      id: booking.id,
      state: booking.state,
      createdAt: booking.createdAt,
      slotHoldExpiresAt: booking.slotHoldExpiresAt,
    },
    { stateEnteredAt }
  );

  // Order room metadata calculation (Strictly NO content)
  const messages = booking.orderRoom?.messages || [];
  const countsByKind = {
    TEXT: 0,
    VOICE: 0,
    DOCUMENT: 0,
    CALL: 0,
    SYSTEM: 0,
  };

  for (const m of messages) {
    const k = m.kind as keyof typeof countsByKind;
    if (countsByKind[k] !== undefined) {
      countsByKind[k]++;
    }
  }

  const callLinks: string[] = [];
  if (booking.meetUrl) {
    callLinks.push(booking.meetUrl);
  }

  const lastMessage = messages[messages.length - 1];
  const lastActivityAt = lastMessage
    ? new Date(lastMessage.createdAt).toISOString()
    : new Date(booking.createdAt).toISOString();

  const orderRoomMetadata: OrderRoomMetadata = {
    exists: Boolean(booking.orderRoom),
    totalMessages: messages.length,
    countsByKind,
    fileCount: countsByKind.DOCUMENT,
    callLinks,
    lastActivityAt,
  };

  // Build the chronological timeline
  const timeline: BookingTimelineItem[] = [];

  // 1. Initial creation
  timeline.push({
    id: `creation-${booking.id}`,
    type: "MILESTONE",
    title: "Booking Created",
    description: `Booking initiated via ${booking.origin} flow. Initial state: PENDING_PAYMENT.`,
    timestamp: new Date(booking.createdAt).toISOString(),
    source: booking.origin,
  });

  // 2. State change events
  let recordedStates = new Set<string>(["PENDING_PAYMENT"]);
  for (const ev of stateEvents) {
    const props = ev.props as any;
    recordedStates.add(props.to);
    timeline.push({
      id: `state-ev-${ev.id}`,
      type: "STATE_CHANGE",
      title: `State Transition: ${props.from || "UNKNOWN"} → ${props.to}`,
      description: `Transitioned to ${props.to}. Currency: ${props.currency || booking.currency}.`,
      timestamp: new Date(ev.occurredAt).toISOString(),
      actor: ev.actorType,
      source: ev.source,
      metadata: { from: props.from, to: props.to },
    });
  }

  // 3. Payment events
  if (booking.payment?.events) {
    for (const pe of booking.payment.events) {
      timeline.push({
        id: `pay-ev-${pe.id}`,
        type: "PAYMENT_EVENT",
        title: `Payment Event: ${pe.type}`,
        description: `Provider ${booking.payment.provider} event ${pe.eventId} processed.`,
        timestamp: new Date(pe.createdAt).toISOString(),
        actor: "PAYMENT_GATEWAY",
        source: booking.payment.provider,
        metadata: { eventId: pe.eventId, type: pe.type },
      });
    }
  }

  // 4. System messages
  for (const sm of messages.filter((m: any) => m.kind === "SYSTEM")) {
    timeline.push({
      id: `sys-msg-${sm.id}`,
      type: "SYSTEM_MESSAGE",
      title: "System Notification",
      description: "Automated system update delivered in order room.",
      timestamp: new Date(sm.createdAt).toISOString(),
      actor: "SYSTEM",
      source: "ORDER_ROOM",
    });
  }

  // 5. Gap detection: If current state was reached without a recorded telemetry event
  if (booking.state !== "PENDING_PAYMENT" && !recordedStates.has(booking.state)) {
    const gapTimestamp = booking.payment?.createdAt || booking.createdAt;
    timeline.push({
      id: `gap-${booking.state}`,
      type: "GAP",
      title: `State Transition: ${booking.state}`,
      description: `Historical row: No direct booking_state_changed event logged. Inferred from booking record and payment status (${booking.payment?.status || "UNKNOWN"}).`,
      timestamp: new Date(gapTimestamp).toISOString(),
      actor: "SYSTEM",
      source: "AUDIT_RECONSTRUCTION",
      isGap: true,
    });
  }

  // Sort timeline chronologically (ascending)
  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Gating for "Review conversation"
  const canReviewConversation = hasDispute;
  const reviewDisabledReason = canReviewConversation
    ? null
    : "Opens only from an open dispute or ticket";

  const clientTotal = booking.baseAmount + (booking.clientFeeAmount || 0);
  const talentNet = booking.baseAmount - (booking.talentFeeAmount || 0);

  return {
    booking: {
      id: booking.id,
      state: booking.state,
      origin: booking.origin,
      currency: booking.currency,
      baseAmount: booking.baseAmount,
      clientFeeAmount: booking.clientFeeAmount || 0,
      talentFeeAmount: booking.talentFeeAmount || 0,
      clientTotal,
      talentNet,
      feeBreakdownLabel: "Fee breakdown equals stored amounts from booking creation",
      slotDate: booking.slotDate ? new Date(booking.slotDate).toISOString() : booking.createdAt.toISOString(),
      slotStart: booking.slotStart || "10:00",
      slotEnd: booking.slotEnd || "11:00",
      engagementType: booking.engagementType || "ONE_OFF",
      recurrence: booking.recurrence || null,
      meetUrl: booking.meetUrl || null,
      contextNote: booking.contextNote || null,
      slotHoldExpiresAt: booking.slotHoldExpiresAt
        ? new Date(booking.slotHoldExpiresAt).toISOString()
        : null,
      createdAt: new Date(booking.createdAt).toISOString(),
      talent: {
        id: booking.creator?.id || booking.creatorId,
        userId: booking.creator?.user?.id || booking.creator?.userId || "",
        name: booking.creator?.name || "Unknown Creator",
        email: maskEmail(booking.creator?.user?.email || ""),
        phone: maskPhone(booking.creator?.user?.phone || ""),
        niche: booking.creator?.niche || "OTHER",
        bio: booking.creator?.bio || null,
        avatarUrl: booking.creator?.avatarUrl || null,
        celebrityBadge: Boolean(booking.creator?.celebrityBadge),
        referralCode: booking.creator?.referralCode || null,
      },
      client: {
        id: booking.client?.id || booking.clientId,
        userId: booking.client?.user?.id || booking.client?.userId || "",
        name: booking.client?.name || "Unknown Client",
        email: maskEmail(booking.client?.user?.email || ""),
        phone: maskPhone(booking.client?.user?.phone || ""),
        orgName: booking.client?.orgName || null,
        orgType: booking.client?.orgType || null,
        avatarUrl: booking.client?.avatarUrl || null,
      },
      service: {
        id: booking.rateCardId || null,
        title: serviceTitle,
        deliveryTimeline,
      },
      payment: booking.payment
        ? {
            id: booking.payment.id,
            status: booking.payment.status,
            provider: booking.payment.provider,
            providerRef: booking.payment.providerRef,
            escrowHeld: Boolean(booking.payment.escrowHeld),
            amount: booking.payment.amount,
            currency: booking.payment.currency,
            createdAt: booking.payment.createdAt
              ? new Date(booking.payment.createdAt).toISOString()
              : null,
          }
        : null,
      ageInState: {
        ms: stuckResult.ageInStateMs,
        seconds: stuckResult.ageInStateSeconds,
        human: stuckResult.ageInStateHuman,
      },
      isStuck: stuckResult.isStuck,
      stuckReason: stuckResult.reason,
      hasDispute,
      canReviewConversation,
      reviewDisabledReason,
      disputeDetail: openDisputeDetail,
    },
    orderRoom: orderRoomMetadata,
    timeline,
  };
}

