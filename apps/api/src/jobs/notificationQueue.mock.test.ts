import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../providers/index.js", () => ({
  notifyProvider: { email: vi.fn(), sms: vi.fn(), inApp: vi.fn() },
}));

import { notifyProvider } from "../providers/index.js";
import { runNotificationJobWithRetry, MAX_ATTEMPTS } from "./notificationQueue.mock.js";
import { mockNotificationQueue } from "./notificationQueue.mock.js";

const notifyProviderMock = notifyProvider as any;

// features.md Phase 9 gate: "failed sends retry with backoff (job-queue test)".
// runNotificationJobWithRetry is directly awaitable (bypassing the fire-and-
// forget enqueue() wrapper) so these assertions are deterministic — same
// pattern as services/aiTagging.ts's processTaggingJob (Phase 7).
describe("jobs/notificationQueue.mock — retry with backoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("succeeds on the first attempt without retrying", async () => {
    notifyProviderMock.email.mockResolvedValue(undefined);

    await runNotificationJobWithRetry({ channel: "email", to: "a@b.com", template: "booking_created", data: {} });

    expect(notifyProviderMock.email).toHaveBeenCalledTimes(1);
  });

  it("retries a failing send with backoff, and succeeds once the transient failure clears", async () => {
    notifyProviderMock.sms
      .mockRejectedValueOnce(new Error("Twilio 500"))
      .mockRejectedValueOnce(new Error("Twilio 500"))
      .mockResolvedValueOnce(undefined);

    await runNotificationJobWithRetry({ channel: "sms", to: "+2348012345678", msg: "hi" });

    expect(notifyProviderMock.sms).toHaveBeenCalledTimes(3);
  });

  it("gives up after MAX_ATTEMPTS and does not throw (observable failure, not a crash)", async () => {
    notifyProviderMock.email.mockRejectedValue(new Error("permanently down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      runNotificationJobWithRetry({ channel: "email", to: "a@b.com", template: "booking_created", data: {} }),
    ).resolves.toBeUndefined();

    expect(notifyProviderMock.email).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("failed permanently"), expect.any(Error));

    errorSpy.mockRestore();
  });

  it("enqueue() returns immediately without waiting for delivery (fire-and-forget)", async () => {
    let resolveDelivery: () => void;
    notifyProviderMock.email.mockReturnValue(new Promise<void>((resolve) => { resolveDelivery = resolve; }));

    const start = Date.now();
    await mockNotificationQueue.enqueue({ channel: "email", to: "a@b.com", template: "booking_created", data: {} });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(20);
    resolveDelivery!();
  });
});
