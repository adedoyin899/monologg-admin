import { notifyProvider } from "../providers/index.js";
import type { NotificationJobData } from "./notificationQueue.interface.js";

// The actual delivery step — shared by both queue backends (notificationQueue.mock.ts's
// in-process retry loop and notificationQueue.real.ts's BullMQ Worker call the
// exact same function). Throws on failure; callers own retry/backoff, not this.
export async function processNotificationJob(job: NotificationJobData): Promise<void> {
  if (job.channel === "email") {
    await notifyProvider.email(job.to, job.template, job.data);
  } else {
    await notifyProvider.sms(job.to, job.msg);
  }
}
