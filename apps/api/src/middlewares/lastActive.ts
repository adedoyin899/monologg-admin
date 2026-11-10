import { prisma } from "../db/client.js";

const lastActiveCache = new Map<string, number>();
const FIVE_MINUTES_MS = 5 * 60 * 1000;

/**
 * Records user activity by updating `User.lastActiveAt`, throttled to at most
 * once every 5 minutes per user so it does not hammer the database (PRD Section 11, item 4).
 * Asynchronous and fire-and-forget: never impedes or fails the HTTP response.
 */
export function recordUserActive(userId: string): void {
  const now = Date.now();
  const last = lastActiveCache.get(userId);

  if (!last || now - last >= FIVE_MINUTES_MS) {
    lastActiveCache.set(userId, now);
    void prisma.user
      .update({
        where: { id: userId },
        data: { lastActiveAt: new Date(now) },
      })
      .catch(() => {});
  }
}

/**
 * Test helper to reset the throttle cache.
 */
export function resetLastActiveCache(): void {
  lastActiveCache.clear();
}

export function getLastActiveCacheSize(): number {
  return lastActiveCache.size;
}

