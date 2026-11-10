import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../db/client.js";
import { audit } from "./adminAudit.js";

describe("AdminAuditLog Append-Only Trigger", () => {
  let createdLogId: string;

  it("successfully creates audit log entry", async () => {
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
    expect(createdLogId).toBeDefined();

    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE "AdminAuditLog" SET "reason" = 'tampered' WHERE "id" = '${createdLogId}'`,
      ),
    ).rejects.toThrow(/AdminAuditLog is append-only/);
  }, 15000);

  it("blocks DELETE via database trigger", async () => {
    expect(createdLogId).toBeDefined();

    await expect(
      prisma.$executeRawUnsafe(
        `DELETE FROM "AdminAuditLog" WHERE "id" = '${createdLogId}'`,
      ),
    ).rejects.toThrow(/AdminAuditLog is append-only/);
  }, 15000);
});

