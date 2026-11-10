import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/client.js", () => ({
  prisma: { notification: { create: vi.fn() } },
}));

import { prisma } from "../db/client.js";
import { persistInAppNotification } from "./notify.shared.js";

const prismaMock = prisma as any;

describe("persistInAppNotification (features.md Phase 9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.notification.create.mockResolvedValue({});
  });

  it("splits kind out of the payload into its own column", async () => {
    await persistInAppNotification("user-1", { kind: "payment_released", bookingId: "b1", amount: 5000 });

    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: { userId: "user-1", kind: "payment_released", payload: { bookingId: "b1", amount: 5000 } },
    });
  });

  it("falls back to 'unknown' kind if the payload has none", async () => {
    await persistInAppNotification("user-1", { bookingId: "b1" });

    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: { userId: "user-1", kind: "unknown", payload: { bookingId: "b1" } },
    });
  });
});
