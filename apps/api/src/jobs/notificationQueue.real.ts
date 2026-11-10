import { Redis } from "ioredis";
import { Queue, Worker } from "bullmq";
import { env } from "../config/env.js";
import { processNotificationJob } from "./notificationWorker.js";
import type { NotificationJobData, NotificationQueue } from "./notificationQueue.interface.js";

// Real NotificationQueue — BullMQ on Redis (features.md's own architecture
// section: "Jobs/queue: BullMQ on Redis for webhooks and async work").
// Instantiated only when JOB_QUEUE_PROVIDER=bullmq (see notificationQueue.ts's
// dynamic import — mirrors providers/cache.ts, which does the same for Redis).

const QUEUE_NAME = "notifications";

// BullMQ requires maxRetriesPerRequest: null on the underlying ioredis connection.
const connection = new Redis(env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: null });

const queue = new Queue<NotificationJobData>(QUEUE_NAME, { connection });

// The worker just delegates to the shared processor — retries/backoff are
// BullMQ's own job options below, applied at enqueue time, not worker logic.
new Worker<NotificationJobData>(
  QUEUE_NAME,
  async (job) => {
    await processNotificationJob(job.data);
  },
  { connection },
);

export const realNotificationQueue: NotificationQueue = {
  async enqueue(job) {
    await queue.add(job.channel, job, {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: true,
      removeOnFail: 100, // keep the last 100 failures visible/observable, per the Phase 9 acceptance criterion
    });
  },
};
