import { prisma } from "../src/db/client.js";
import { env } from "../src/config/env.js";

async function bootstrap() {
  const allowedList = Array.isArray(env.ADMIN_ALLOWED_EMAILS)
    ? env.ADMIN_ALLOWED_EMAILS
    : [];

  if (allowedList.length === 0) {
    console.log("[bootstrap-superadmin] No emails found in ADMIN_ALLOWED_EMAILS. Skipping.");
    await prisma.$disconnect();
    return;
  }

  console.log(`[bootstrap-superadmin] Processing ${allowedList.length} allowed admin email(s)...`);

  for (const email of allowedList) {
    const normalized = email.trim().toLowerCase();
    const existing = await prisma.adminUser.findUnique({ where: { email: normalized } });
    if (existing) {
      const updated = await prisma.adminUser.update({
        where: { email: normalized },
        data: {
          role: "SUPER_ADMIN",
          status: "ACTIVE",
        },
      });
      console.log(`[bootstrap-superadmin] Updated existing admin: ${updated.email} (${updated.role}, ${updated.status})`);
    } else {
      const created = await prisma.adminUser.create({
        data: {
          email: normalized,
          role: "SUPER_ADMIN",
          status: "ACTIVE",
          authProvider: env.ADMIN_AUTH_PROVIDER === "clerk" ? "CLERK" : "SUPABASE",
        },
      });
      console.log(`[bootstrap-superadmin] Created new SUPER_ADMIN: ${created.email} (${created.id})`);
    }
  }

  console.log("[bootstrap-superadmin] Bootstrap complete.");
  await prisma.$disconnect();
}

bootstrap().catch((err) => {
  console.error("[bootstrap-superadmin] Fatal error:", err);
  process.exit(1);
});
