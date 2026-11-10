import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { adminRoPrisma } from "../db/adminRoClient.js";

describe("monologg_admin_ro Read-Only Role (Live Database)", () => {
  let isConnected = false;

  beforeAll(async () => {
    try {
      await adminRoPrisma.$queryRawUnsafe("SELECT 1;");
      isConnected = true;
    } catch {
      isConnected = false;
      console.warn("Live DB not reachable; skipping integration tests for monologg_admin_ro");
    }
  });

  afterAll(async () => {
    await adminRoPrisma.$disconnect();
  });

  it("verifies the session user is monologg_admin_ro and statement_timeout is 5s", async () => {
    if (!isConnected) return;

    const rows = await adminRoPrisma.$queryRawUnsafe<Array<{ current_user: string; current_setting: string }>>(
      "SELECT current_user, current_setting('statement_timeout');"
    );

    expect(rows[0].current_user).toBe("monologg_admin_ro");
    expect(rows[0].current_setting).toBe("5s");
  });

  it("permits SELECT on application tables and admin views", async () => {
    if (!isConnected) return;

    const userCount = await adminRoPrisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      'SELECT count(*) FROM "User";'
    );
    expect(userCount).toBeDefined();

    const summary = await adminRoPrisma.$queryRawUnsafe<Array<any>>(
      "SELECT * FROM admin.v_user_summary LIMIT 1;"
    );
    expect(summary).toBeDefined();
  });

  it("BLOCKS INSERT on application tables with 42501 permission denied", async () => {
    if (!isConnected) return;

    await expect(
      adminRoPrisma.$executeRawUnsafe(
        'INSERT INTO "UserNote" ("id", "userId", "adminId", "body", "createdAt") VALUES (\'test\', \'test\', \'test\', \'test\', NOW());'
      )
    ).rejects.toThrow(/permission denied/i);
  });

  it("BLOCKS UPDATE on application tables with 42501 permission denied", async () => {
    if (!isConnected) return;

    await expect(
      adminRoPrisma.$executeRawUnsafe('UPDATE "User" SET "isTestUser" = true WHERE id = \'nonexistent\';')
    ).rejects.toThrow(/permission denied/i);
  });

  it("BLOCKS DELETE on application tables with 42501 permission denied", async () => {
    if (!isConnected) return;

    await expect(
      adminRoPrisma.$executeRawUnsafe('DELETE FROM "User" WHERE id = \'nonexistent\';')
    ).rejects.toThrow(/permission denied/i);
  });

  it("BLOCKS SELECT on sensitive tables like RefreshToken", async () => {
    if (!isConnected) return;

    await expect(
      adminRoPrisma.$queryRawUnsafe('SELECT * FROM "RefreshToken" LIMIT 1;')
    ).rejects.toThrow(/permission denied/i);
  });
});

