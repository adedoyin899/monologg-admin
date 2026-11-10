import type { ApplicationStatus } from "@prisma/client";
import { prisma } from "../db/client.js";
import { notifyProvider } from "../providers/index.js";
import { enqueueEmailNotification } from "./notifications.js";
import { createBooking, type CreateBookingInput } from "./booking.js";
import { track } from "../lib/analytics/index.js";

// Project applications (features.md Phase 14, FA-2). The applicant-cap
// enforcement here mirrors services/availability.ts's bookSlot: a Postgres
// advisory transaction lock keyed on the Brief, taken BEFORE the
// open/count-vs-cap check, so concurrent applicants for the same brief are
// fully serialized — the (cap+1)th request always sees the brief already
// closed, never a stale "still open" read. This is what makes "exactly N
// succeed" true under real concurrency, not just in a single-request test.

export class BriefNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BriefNotFoundError";
  }
}

export class BriefNotOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BriefNotOpenError";
  }
}

export class ApplicationsClosedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationsClosedError";
  }
}

export class DuplicateApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateApplicationError";
  }
}

export class IllegalApplicationTransitionError extends Error {
  constructor(from: ApplicationStatus, to: ApplicationStatus) {
    super(`Illegal application state transition: ${from} → ${to}`);
    this.name = "IllegalApplicationTransitionError";
  }
}

export class NotApplicationOwnerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotApplicationOwnerError";
  }
}

export class NotApplicantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotApplicantError";
  }
}

// APPLIED can go straight to SELECTED — a client may select without ever
// shortlisting first. WITHDRAWN is applicant-initiated (routes/projects.ts
// scopes who's allowed to call it); SELECTED/REJECTED/WITHDRAWN are terminal.
const LEGAL_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  APPLIED: ["SHORTLISTED", "SELECTED", "REJECTED", "WITHDRAWN"],
  SHORTLISTED: ["SELECTED", "REJECTED", "WITHDRAWN"],
  SELECTED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export function assertLegalApplicationTransition(from: ApplicationStatus, to: ApplicationStatus): void {
  if (!LEGAL_TRANSITIONS[from]?.includes(to)) {
    throw new IllegalApplicationTransitionError(from, to);
  }
}

/**
 * POST /projects/:briefId/apply. Server-authoritative cap enforcement (X4:
 * hard-close, first-come): takes an advisory lock on the brief, re-checks
 * applicationsOpen + the live count against applicantCap, creates the
 * Application, and flips applicationsOpen=false the instant the cap is met —
 * all inside one transaction, so no concurrent request can ever slip in
 * after the cap without seeing the flip.
 */
export async function applyToBrief(briefId: string, creatorId: string, pitch?: string) {
  const { application, capReached } = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${briefId}))`;

    const brief = await tx.brief.findUnique({ where: { id: briefId } });
    if (!brief) {
      throw new BriefNotFoundError(`Brief "${briefId}" not found`);
    }
    if (brief.status !== "ACTIVE") {
      throw new BriefNotOpenError(`Brief "${briefId}" is not open for applications`);
    }
    if (!brief.applicationsOpen) {
      throw new ApplicationsClosedError(`Applications for brief "${briefId}" are closed`);
    }

    let created;
    try {
      created = await tx.application.create({ data: { briefId, creatorId, pitch } });
    } catch (err) {
      if ((err as { code?: string })?.code === "P2002") {
        throw new DuplicateApplicationError(`Creator "${creatorId}" already applied to brief "${briefId}"`);
      }
      throw err;
    }

    let capReached = false;
    if (brief.applicantCap !== null) {
      const count = await tx.application.count({ where: { briefId } });
      if (count >= brief.applicantCap) {
        await tx.brief.update({ where: { id: briefId }, data: { applicationsOpen: false } });
        capReached = true;
      }
    }

    return { application: created, capReached };
  });

  // features.md Phase 9: both-ways notifications. Best-effort — a notify
  // failure never fails the application itself.
  const brief = await prisma.brief.findUnique({ where: { id: briefId }, include: { client: true } });
  const creator = await prisma.creator.findUnique({ where: { id: creatorId } });
  if (brief && creator) {
    await notifyProvider
      .inApp(brief.client.userId, { kind: "application_received", briefId, applicationId: application.id, creatorName: creator.name })
      .catch(() => {});
    await enqueueEmailNotification(brief.client.userId, "application_received", { briefId, projectName: brief.projectName, creatorName: creator.name });

    if (capReached) {
      await notifyProvider
        .inApp(brief.client.userId, { kind: "applications_closed", briefId, projectName: brief.projectName })
        .catch(() => {});
      await enqueueEmailNotification(brief.client.userId, "applications_closed", { briefId, projectName: brief.projectName });
    }
  }

  void track(
    "application_submitted",
    { briefId, cap: brief?.applicantCap ?? 0 },
    { actor: "USER", actorId: creator?.userId ?? null, source: "API" },
  ).catch(() => {});

  if (capReached) {
    void track(
      "cap_reached",
      { briefId, cap: brief?.applicantCap ?? 0 },
      { actor: "SYSTEM", source: "API" },
    ).catch(() => {});
  }

  return application;
}

async function getBriefOwnedApplication(applicationId: string, requestingUserId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { brief: { include: { client: true } }, creator: true },
  });
  if (!application) {
    throw new BriefNotFoundError(`Application "${applicationId}" not found`);
  }
  if (application.brief.client.userId !== requestingUserId) {
    throw new NotApplicationOwnerError("You do not own the brief this application belongs to");
  }
  return application;
}

/** PATCH /applications/:id/shortlist — brief-owner only. */
export async function shortlistApplication(applicationId: string, requestingUserId: string) {
  const application = await getBriefOwnedApplication(applicationId, requestingUserId);
  assertLegalApplicationTransition(application.status, "SHORTLISTED");

  const updated = await prisma.application.update({ where: { id: applicationId }, data: { status: "SHORTLISTED" } });

  await notifyProvider
    .inApp(application.creator.userId, { kind: "application_shortlisted", briefId: application.briefId, applicationId, projectName: application.brief.projectName })
    .catch(() => {});
  await enqueueEmailNotification(application.creator.userId, "application_shortlisted", { projectName: application.brief.projectName });

  return updated;
}

/** PATCH /applications/:id/reject — brief-owner only. A plain "not a fit"
 * rejection independent of selecting anyone else — see selectApplication for
 * the auto-reject-the-rest-on-select path. */
export async function rejectApplication(applicationId: string, requestingUserId: string) {
  const application = await getBriefOwnedApplication(applicationId, requestingUserId);
  assertLegalApplicationTransition(application.status, "REJECTED");

  const updated = await prisma.application.update({ where: { id: applicationId }, data: { status: "REJECTED" } });

  await notifyProvider
    .inApp(application.creator.userId, { kind: "application_rejected", briefId: application.briefId, applicationId, projectName: application.brief.projectName })
    .catch(() => {});
  await enqueueEmailNotification(application.creator.userId, "application_rejected", { projectName: application.brief.projectName });

  return updated;
}

/** PATCH /applications/:id/withdraw — applicant only (never the brief owner). */
export async function withdrawApplication(applicationId: string, requestingUserId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { creator: true },
  });
  if (!application) {
    throw new BriefNotFoundError(`Application "${applicationId}" not found`);
  }
  if (application.creator.userId !== requestingUserId) {
    throw new NotApplicantError("You did not submit this application");
  }
  assertLegalApplicationTransition(application.status, "WITHDRAWN");

  return prisma.application.update({ where: { id: applicationId }, data: { status: "WITHDRAWN" } });
}

export interface SelectApplicationInput {
  rateCardId: string;
  baseAmount: number;
  currency: string;
  slotDate: Date;
  slotStart: string;
  slotEnd: string;
}

/**
 * PATCH /applications/:id/select — brief-owner only. Converts the winning
 * application into a real booking (PENDING_PAYMENT, fees server-computed,
 * slot claimed atomically — the exact same services/booking.ts path Checkout
 * uses, not a parallel money/booking code path). Auto-rejects every other
 * still-open application on the same brief and closes it — a Brief fills one
 * role, per this data model's shape (one Application row per talent, no
 * multi-select concept anywhere in the schema).
 */
export async function selectApplication(applicationId: string, requestingUserId: string, input: SelectApplicationInput) {
  const application = await getBriefOwnedApplication(applicationId, requestingUserId);
  assertLegalApplicationTransition(application.status, "SELECTED");

  const booking = await createBooking({
    creatorId: application.creatorId,
    clientId: application.brief.clientId,
    rateCardId: input.rateCardId,
    baseAmount: input.baseAmount,
    currency: input.currency,
    slotDate: input.slotDate,
    slotStart: input.slotStart,
    slotEnd: input.slotEnd,
  } satisfies CreateBookingInput);

  const [updated] = await prisma.$transaction([
    prisma.application.update({ where: { id: applicationId }, data: { status: "SELECTED" } }),
    prisma.brief.update({ where: { id: application.briefId }, data: { status: "CLOSED", applicationsOpen: false } }),
  ]);

  await notifyProvider
    .inApp(application.creator.userId, { kind: "application_selected", briefId: application.briefId, applicationId, bookingId: booking.id, projectName: application.brief.projectName })
    .catch(() => {});
  await enqueueEmailNotification(application.creator.userId, "application_selected", { projectName: application.brief.projectName });

  const others = await prisma.application.findMany({
    where: { briefId: application.briefId, id: { not: applicationId }, status: { in: ["APPLIED", "SHORTLISTED"] } },
    include: { creator: true },
  });
  for (const other of others) {
    await prisma.application.update({ where: { id: other.id }, data: { status: "REJECTED" } });
    await notifyProvider
      .inApp(other.creator.userId, { kind: "application_not_selected", briefId: application.briefId, applicationId: other.id, projectName: application.brief.projectName })
      .catch(() => {});
    await enqueueEmailNotification(other.creator.userId, "application_not_selected", { projectName: application.brief.projectName });
  }

  return { application: updated, booking };
}
