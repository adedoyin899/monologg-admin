import { env } from "../config/env.js";
import { mockNotificationQueue } from "./notificationQueue.mock.js";
import type { NotificationQueue } from "./notificationQueue.interface.js";

const isTest = env.NODE_ENV === "test";

let notificationQueue: NotificationQueue;

if (isTest || env.JOB_QUEUE_PROVIDER === "mock") {
  notificationQueue = mockNotificationQueue;
} else {
  // Dynamically loaded so dev/test never pulls in bullmq/ioredis or opens a
  // Redis connection while mocking is active — same pattern as providers/cache.ts.
  const { realNotificationQueue } = await import("./notificationQueue.real.js");
  notificationQueue = realNotificationQueue;
}

export { notificationQueue };
export type { NotificationQueue, NotificationJobData } from "./notificationQueue.interface.js";
export { mockNotificationQueue } from "./notificationQueue.mock.js";
