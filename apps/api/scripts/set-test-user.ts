import { prisma } from "../src/db/client.js";

/**
 * Management CLI script to mark or unmark an account as a test user (PRD Section 11, item 8).
 * Test users are excluded from all Admin KPI aggregations.
 *
 * Usage:
 *   pnpm set-test-user <email|userId> <true|false>
 */
/**
 * Management CLI function to mark or unmark an account as a test user (PRD Section 11, item 8).
 * Test users are excluded from all Admin KPI aggregations.
 */
export async function setTestUser(identifier: string, isTest: boolean) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: identifier }, { email: identifier }],
    },
  });

  if (!user) {
    throw new Error(`User not found for identifier: ${identifier}`);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isTestUser: isTest },
  });

  return updated;
}

async function main() {
  const args = process.argv.slice(2);
  const identifier = args[0];
  const flagStr = args[1];

  if (!identifier || flagStr === undefined) {
    console.error("Usage: pnpm set-test-user <email|userId> <true|false>");
    process.exit(1);
  }

  const isTest = flagStr.toLowerCase() === "true" || flagStr === "1";
  const updated = await setTestUser(identifier, isTest);
  console.log(`[Success] Updated user ${updated.email} (${updated.id}): isTestUser = ${updated.isTestUser}`);
  await prisma.$disconnect();
}

if (process.argv[1]?.includes("set-test-user")) {
  main().catch(async (err) => {
    console.error("[Error] Failed to update test user:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
}
