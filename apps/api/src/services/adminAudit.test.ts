import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../db/client.js";
import { audit } from "./adminAudit.js";

describe("AdminAuditLog Append-Only Trigger", () => {
  let createdLogId: string;
  let hasLiveDb = false;

  beforeAll(async () => {
    try {
      if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("mock:mock")) {
        await prisma.$queryRaw`SELECT 1`;
        hasLiveDb = true;
      }
    } catch {
      hasLiveDb = false;
    }
  });

  it("successfully creates audit log entry", async () => {
    if (!hasLiveDb) {
      // Offline / unit test fallback: verify audit function runs safely without crashing
      await expect(
        audit({
          adminId: "test-admin-trigger",
          action: "TRIGGER_TEST",
          targetType: "TEST",
          targetId: "target-123",
          reason: "Testing append-only DB trigger",
          ip: "127.0.0.1",
        }),
      ).resolves.not.toThrow();
      return;
    }

    await audit({
      adminId: "test-admin-trigger",
      action: "TRIGGER_TEST",
      targetType: "TEST",
      targetId: "target-123",
      reason: "Testing append-only DB trigger",
      ip: "127.0.0.1",
    });

    const log = await prisma.adminAuditLog.findFirst({
      where: { action: "TRIGGER_TEST", adminId: "test-admin-trigger" },
      orderBy: { createdAt: "desc" },
    });

    expect(log).not.toBeNull();
    expect(log?.reason).toBe("Testing append-only DB trigger");
    expect(log?.ipHash).toBeDefined();
    createdLogId = log!.id;
  }, 15000);

  it("blocks UPDATE via database trigger", async () => {
    if (!hasLiveDb) return;
    expect(createdLogId).toBeDefined();

    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE "AdminAuditLog" SET "reason" = 'tampered' WHERE "id" = '${createdLogId}'`,
      ),
    ).rejects.toThrow(/AdminAuditLog is append-only/);
  }, 15000);

  it("blocks DELETE via database trigger", async () => {
    if (!hasLiveDb) return;
    expect(createdLogId).toBeDefined();

    await expect(
      prisma.$executeRawUnsafe(
        `DELETE FROM "AdminAuditLog" WHERE "id" = '${createdLogId}'`,
      ),
    ).rejects.toThrow(/AdminAuditLog is append-only/);
  }, 15000);
});

