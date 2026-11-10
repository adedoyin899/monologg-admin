import { prisma } from "../db/client.js";
import { notificationQueue } from "../jobs/notificationQueue.js";
import { paginate, toSkipTake, type PaginationQuery } from "../lib/pagination.js";

// Notifications backend (features.md Phase 9).
//
// In-app persistence happens through NotifyProvider.inApp (see
// providers/notify.shared.ts) — this file is everything ELSE: the async
// email/SMS dispatch path (enqueueEmailNotification/enqueueSmsNotification,
// respecting NotificationPreference), and the read-side query API the
// GET /notifications route and the client's notification panel bind to.

export class NotificationNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificationNotFoundError";
  }
}

// ── Email / SMS dispatch (async, queued, preference-respecting) ────────────

/** Enqueues a templated email for a user, unless they've disabled email
 * notifications (NotificationPreference.emailEnabled). Never throws — a
 * failure to enqueue is logged, not fatal to the caller's main flow. */
export async function enqueueEmailNotification(
  userId: string,
  template: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  try {
    const [user, preference] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
      prisma.notificationPreference.findUnique({ where: { userId }, select: { emailEnabled: true } }),
    ]);
    if (!user) return;
    if (preference && !preference.emailEnabled) return;

    await notificationQueue.enqueue({ channel: "email", to: user.email, template, data });
  } catch (err) {
    console.error(`[services/notifications] enqueueEmailNotification failed for ${userId}:`, err);
  }
}

/** Enqueues an SMS for a user, unless SMS is disabled OR the user has no
 * phone on file (no phase through Phase 9 collects one — see User.phone's
 * schema comment). A missing phone is a silent, expected no-op, not an error. */
export async function enqueueSmsNotification(userId: string, msg: string): Promise<void> {
  try {
    const [user, preference] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { phone: true } }),
      prisma.notificationPreference.findUnique({ where: { userId }, select: { smsEnabled: true } }),
    ]);
    if (!user?.phone) return;
    if (preference && !preference.smsEnabled) return;

    await notificationQueue.enqueue({ channel: "sms", to: user.phone, msg });
  } catch (err) {
    console.error(`[services/notifications] enqueueSmsNotification failed for ${userId}:`, err);
  }
}

// ── Read-side query API ──────────────────────────────────────────────────────

export async function listNotifications(userId: string, query: PaginationQuery) {
  const { skip, take } = toSkipTake(query);
  const where = { userId };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return { ...paginate(notifications, total, query), unreadCount };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

/** Owner-scoped and idempotent — marking an already-read notification read
 * again is a no-op, not an error. */
export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.userId !== userId) {
    throw new NotificationNotFoundError(`Notification "${notificationId}" not found`);
  }
  if (notification.readAt) return notification;

  return prisma.notification.update({ where: { id: notificationId }, data: { readAt: new Date() } });
}

// ── Preferences ───────────────────────────────────────────────────────────────

export async function getNotificationPreferences(userId: string) {
  const preference = await prisma.notificationPreference.findUnique({ where: { userId } });
  return {
    emailEnabled: preference?.emailEnabled ?? true,
    smsEnabled: preference?.smsEnabled ?? true,
  };
}

export async function updateNotificationPreferences(
  userId: string,
  patch: { emailEnabled?: boolean; smsEnabled?: boolean },
) {
  const preference = await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...patch },
    update: patch,
  });
  return { emailEnabled: preference.emailEnabled, smsEnabled: preference.smsEnabled };
}
