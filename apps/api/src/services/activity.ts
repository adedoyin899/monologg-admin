import type { Prisma } from "@prisma/client";
import { prisma } from "../db/client.js";

// Account-activity feed (UserActivity), keyed by User.id regardless of role —
// a TALENT and a CLIENT account naturally see different actions here because
// only the routes relevant to their own role ever call logActivity for them,
// not because of any role branch in this file itself.
//
// Every call site treats this as best-effort (wrapped in .catch(() => {}) or
// placed after the real state change commits) — a logging failure must never
// roll back or fail the business action it's describing.
export type ActivityAction =
  | "ACCOUNT_REGISTERED"
  | "ACCOUNT_LINKED"
  | "USER_LOGGED_IN"
  | "PASSWORD_RESET"
  | "PROFILE_UPDATED"
  | "BOOKING_CREATED"
  | "BOOKING_RECEIVED"
  | "BOOKING_CANCELLED"
  | "ESCROW_FUNDED"
  | "DELIVERABLES_SUBMITTED"
  | "PAYMENT_RELEASED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_REFUNDED"
  | "BOOKING_DISPUTED"
  | "BRIEF_POSTED"
  | "APPLICATION_SUBMITTED"
  | "APPLICATION_RECEIVED"
  | "APPLICATION_SHORTLISTED"
  | "APPLICATION_REJECTED"
  | "APPLICATION_SELECTED"
  | "APPLICATION_NOT_SELECTED"
  | "APPLICATION_WITHDRAWN"
  | "MEDIA_KIT_UPLOADED"
  | "MEDIA_KIT_REVERTED"
  | "VERIFICATION_SUBMITTED"
  | "VERIFICATION_REVIEWED"
  | "WITHDRAWAL_REQUESTED"
  | "WITHDRAWAL_RELEASED"
  | "CALENDAR_CONNECTED"
  | "CALENDAR_DISCONNECTED";

export async function logActivity(
  userId: string,
  action: ActivityAction,
  details?: string,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const client = tx ?? prisma;
  await client.userActivity.create({ data: { userId, action, details } });
}
