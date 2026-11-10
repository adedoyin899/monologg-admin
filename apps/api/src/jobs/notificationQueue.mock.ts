import { processNotificationJob } from "./notificationWorker.js";
import type { NotificationJobData, NotificationQueue } from "./notificationQueue.interface.js";

// Mock NotificationQueue — for dev and test environments. No Redis, no BullMQ:
// an in-process retry loop with the same attempts/exponential-backoff shape
// real BullMQ jobs get, just on a much shorter clock (this only ever runs
// against the mock NotifyProvider, so there's no reason to make tests eat
// seconds of real backoff to prove the retry logic works).
export const MAX_ATTEMPTS = 3;
export const BASE_BACKOFF_MS = 20;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exported so tests can await the full retry chain directly, instead of
 * racing the fire-and-forget promise `enqueue()` below never awaits. Mirrors
 * services/aiTagging.ts's processTaggingJob pattern (Phase 7). */
export async function runNotificationJobWithRetry(
  job: NotificationJobData,
  attempt = 1,
): Promise<void> {
  try {
    await processNotificationJob(job);
  } catch (err) {
    if (attempt >= MAX_ATTEMPTS) {
      console.error(
        `[jobs/notificationQueue.mock] job failed permanently after ${attempt} attempts (channel: ${job.channel}):`,
        err,
      );
      return;
    }
    await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
    return runNotificationJobWithRetry(job, attempt + 1);
  }
}

export const mockNotificationQueue: NotificationQueue = {
  async enqueue(job) {
    void runNotificationJobWithRetry(job);
  },
};
