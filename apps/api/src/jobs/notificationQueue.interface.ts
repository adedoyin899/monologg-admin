// NotificationQueue — the async delivery boundary for email/SMS (features.md
// Phase 9: "Delivery is async via the job queue; failures retry with
// backoff"). In-app notifications never go through this — they're a
// synchronous DB write (see services/notifications.ts) with nothing to retry.
//
// This lives under src/jobs/, not src/providers/ — features.md's own
// architecture section lists "jobs: queue for webhooks, async tasks" as a
// concern separate from the *Provider interfaces, and this is that queue.

export type NotificationJobData =
  | { channel: "email"; to: string; template: string; data: Record<string, unknown> }
  | { channel: "sms"; to: string; msg: string };

export interface NotificationQueue {
  /** Enqueues a job and returns immediately — delivery (and any retries) happen
   * in the background, never blocking the caller. */
  enqueue(job: NotificationJobData): Promise<void>;
}
