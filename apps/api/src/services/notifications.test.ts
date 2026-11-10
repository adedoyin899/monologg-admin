import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/client.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    notificationPreference: { findUnique: vi.fn(), upsert: vi.fn() },
    notification: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("../jobs/notificationQueue.js", () => ({
  notificationQueue: { enqueue: vi.fn() },
}));

import { prisma } from "../db/client.js";
import { notificationQueue } from "../jobs/notificationQueue.js";
import {
  enqueueEmailNotification,
  enqueueSmsNotification,
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  getNotificationPreferences,
  updateNotificationPreferences,
  NotificationNotFoundError,
} from "./notifications.js";

const prismaMock = prisma as any;
const queueMock = notificationQueue as any;

describe("Notifications service (features.md Phase 9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("enqueueEmailNotification", () => {
    it("enqueues an email job when no preference row exists (default enabled)", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ email: "talent@monologg.dev" });
      prismaMock.notificationPreference.findUnique.mockResolvedValue(null);

      await enqueueEmailNotification("user-1", "payment_released", { bookingId: "b1" });

      expect(queueMock.enqueue).toHaveBeenCalledWith({
        channel: "email",
        to: "talent@monologg.dev",
        template: "payment_released",
        data: { bookingId: "b1" },
      });
    });

    it("does not enqueue when the user has disabled email notifications", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ email: "talent@monologg.dev" });
      prismaMock.notificationPreference.findUnique.mockResolvedValue({ emailEnabled: false });

      await enqueueEmailNotification("user-1", "payment_released", { bookingId: "b1" });

      expect(queueMock.enqueue).not.toHaveBeenCalled();
    });

    it("no-ops silently when the user doesn't exist", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await enqueueEmailNotification("ghost-user", "payment_released", {});

      expect(queueMock.enqueue).not.toHaveBeenCalled();
    });

    it("never throws, even if the queue itself fails (best-effort)", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ email: "talent@monologg.dev" });
      prismaMock.notificationPreference.findUnique.mockResolvedValue(null);
      queueMock.enqueue.mockRejectedValueOnce(new Error("queue down"));

      await expect(enqueueEmailNotification("user-1", "payment_released", {})).resolves.toBeUndefined();
    });
  });

  describe("enqueueSmsNotification", () => {
    it("skips when the user has no phone on file", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ phone: null });
      prismaMock.notificationPreference.findUnique.mockResolvedValue(null);

      await enqueueSmsNotification("user-1", "Your booking is confirmed");

      expect(queueMock.enqueue).not.toHaveBeenCalled();
    });

    it("enqueues an SMS job when the user has a phone and SMS is enabled", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ phone: "+2348012345678" });
      prismaMock.notificationPreference.findUnique.mockResolvedValue(null);

      await enqueueSmsNotification("user-1", "Your booking is confirmed");

      expect(queueMock.enqueue).toHaveBeenCalledWith({
        channel: "sms",
        to: "+2348012345678",
        msg: "Your booking is confirmed",
      });
    });

    it("does not enqueue when the user has disabled SMS notifications", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ phone: "+2348012345678" });
      prismaMock.notificationPreference.findUnique.mockResolvedValue({ smsEnabled: false });

      await enqueueSmsNotification("user-1", "hi");

      expect(queueMock.enqueue).not.toHaveBeenCalled();
    });
  });

  describe("listNotifications — user-scoped", () => {
    it("only ever queries the requesting user's own notifications", async () => {
      prismaMock.notification.findMany.mockResolvedValue([{ id: "n1", userId: "user-1" }]);
      prismaMock.notification.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

      await listNotifications("user-1", { page: 1, pageSize: 20 });

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-1" } }),
      );
      // Both the total count and the unread count are scoped to this user —
      // never a global count that could leak another user's activity.
      expect(prismaMock.notification.count).toHaveBeenCalledWith({ where: { userId: "user-1" } });
      expect(prismaMock.notification.count).toHaveBeenCalledWith({
        where: { userId: "user-1", readAt: null },
      });
    });

    it("returns unreadCount alongside the paginated envelope", async () => {
      prismaMock.notification.findMany.mockResolvedValue([{ id: "n1" }, { id: "n2" }]);
      prismaMock.notification.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

      const result = await listNotifications("user-1", { page: 1, pageSize: 20 });

      expect(result.unreadCount).toBe(1);
      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
    });
  });

  describe("getUnreadCount", () => {
    it("counts only this user's unread notifications", async () => {
      prismaMock.notification.count.mockResolvedValue(3);
      const count = await getUnreadCount("user-1");
      expect(count).toBe(3);
      expect(prismaMock.notification.count).toHaveBeenCalledWith({ where: { userId: "user-1", readAt: null } });
    });
  });

  describe("markNotificationRead — owner-scoped, no cross-account leakage", () => {
    it("marks the caller's own notification read", async () => {
      prismaMock.notification.findUnique.mockResolvedValue({ id: "n1", userId: "user-1", readAt: null });
      prismaMock.notification.update.mockResolvedValue({ id: "n1", userId: "user-1", readAt: new Date() });

      const result = await markNotificationRead("user-1", "n1");

      expect(result.readAt).not.toBeNull();
      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: "n1" },
        data: { readAt: expect.any(Date) },
      });
    });

    it("is idempotent — marking an already-read notification read again is a no-op", async () => {
      const readAt = new Date("2026-01-01");
      prismaMock.notification.findUnique.mockResolvedValue({ id: "n1", userId: "user-1", readAt });

      const result = await markNotificationRead("user-1", "n1");

      expect(result.readAt).toBe(readAt);
      expect(prismaMock.notification.update).not.toHaveBeenCalled();
    });

    it("throws NotificationNotFoundError for a notification that doesn't exist", async () => {
      prismaMock.notification.findUnique.mockResolvedValue(null);
      await expect(markNotificationRead("user-1", "ghost")).rejects.toThrow(NotificationNotFoundError);
    });

    it("SECURITY: throws (never leaks or mutates) when the notification belongs to a different user", async () => {
      prismaMock.notification.findUnique.mockResolvedValue({ id: "n1", userId: "user-OTHER", readAt: null });

      await expect(markNotificationRead("user-1", "n1")).rejects.toThrow(NotificationNotFoundError);
      expect(prismaMock.notification.update).not.toHaveBeenCalled();
    });
  });

  describe("preferences", () => {
    it("defaults both channels to enabled when no row exists", async () => {
      prismaMock.notificationPreference.findUnique.mockResolvedValue(null);
      expect(await getNotificationPreferences("user-1")).toEqual({ emailEnabled: true, smsEnabled: true });
    });

    it("reflects stored preferences when a row exists", async () => {
      prismaMock.notificationPreference.findUnique.mockResolvedValue({ emailEnabled: false, smsEnabled: true });
      expect(await getNotificationPreferences("user-1")).toEqual({ emailEnabled: false, smsEnabled: true });
    });

    it("updateNotificationPreferences upserts by userId", async () => {
      prismaMock.notificationPreference.upsert.mockResolvedValue({ emailEnabled: false, smsEnabled: true });

      const result = await updateNotificationPreferences("user-1", { emailEnabled: false });

      expect(result).toEqual({ emailEnabled: false, smsEnabled: true });
      expect(prismaMock.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        create: { userId: "user-1", emailEnabled: false },
        update: { emailEnabled: false },
      });
    });
  });
});
