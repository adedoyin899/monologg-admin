import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { AdminRole } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { env } from "../../config/env.js";
import { requireAdmin, requirePermission } from "../../middlewares/adminAuth.js";
import { getRolePermissions } from "../../config/adminPermissions.js";
import { audit } from "../../services/adminAudit.js";

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // All routes in this plugin are prefixed with /api/v1/admin and require requireAdmin
  app.addHook("preHandler", requireAdmin);

  // ── M1.1 Admin Me ────────────────────────────────────────────────────────
  app.get("/api/v1/admin/me", async (request: FastifyRequest, reply: FastifyReply) => {
    const admin = request.adminUser!;
    const session = request.adminSession!;

    return reply.send({
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        status: admin.status,
        authProvider: admin.authProvider,
        lastLoginAt: admin.lastLoginAt,
        createdAt: admin.createdAt,
      },
      permissions: getRolePermissions(admin.role),
      session: {
        id: session.id,
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
      },
      env: {
        environment: env.NODE_ENV,
        paymentsMode: (env.PAYSTACK_SECRET_KEY || "").startsWith("sk_live_") ? "LIVE" : "TEST",
      },
    });
  });

  // ── M12.2 Admin Management (SUPER_ADMIN only) ───────────────────────────
  app.get(
    "/api/v1/admin/admins",
    { preHandler: [requirePermission("admin_users", "read")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const admins = await prisma.adminUser.findMany({
        orderBy: { createdAt: "asc" },
      });

      const adminIds = admins.map((a) => a.id);
      const activeSessions = await prisma.adminSession.findMany({
        where: { adminUserId: { in: adminIds }, endedAt: null },
        orderBy: { lastSeenAt: "desc" },
      });

      const sessionsByAdminId = new Map<string, (typeof activeSessions)[0]>();
      for (const s of activeSessions) {
        if (!sessionsByAdminId.has(s.adminUserId)) {
          sessionsByAdminId.set(s.adminUserId, s);
        }
      }

      return reply.send({
        admins: admins.map((a) => ({
          id: a.id,
          email: a.email,
          role: a.role,
          status: a.status,
          authProvider: a.authProvider,
          lastLoginAt: a.lastLoginAt,
          createdAt: a.createdAt,
          lastSession: sessionsByAdminId.get(a.id) || null,
        })),
      });
    },
  );

  app.post(
    "/api/v1/admin/admins/invite",
    { preHandler: [requirePermission("admin_users", "write")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, role } = (request.body as { email?: string; role?: AdminRole }) || {};
      const normalizedEmail = (email || "").trim().toLowerCase();

      if (!normalizedEmail || !normalizedEmail.includes("@")) {
        return reply.status(400).send({ error: "A valid email address is required." });
      }

      const validRoles: AdminRole[] = [
        "SUPER_ADMIN",
        "OPS",
        "SUPPORT",
        "FINANCE",
        "COMPLIANCE",
        "VIEWER",
      ];
      const targetRole = role && validRoles.includes(role) ? role : "VIEWER";

      // 1. Refuse if email belongs to a talent or client User
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existingUser) {
        return reply.status(400).send({
          error:
            "Cannot invite this email: an account for talent or client already exists with this address.",
        });
      }

      // 2. Refuse if already exists in AdminUser
      const existingAdmin = await prisma.adminUser.findUnique({
        where: { email: normalizedEmail },
      });
      if (existingAdmin) {
        return reply.status(409).send({
          error: "An admin user with this email address already exists.",
        });
      }

      // 3. Create AdminUser with status ACTIVE
      const newAdmin = await prisma.adminUser.create({
        data: {
          email: normalizedEmail,
          role: targetRole,
          status: "ACTIVE",
          authProvider: env.ADMIN_AUTH_PROVIDER === "clerk" ? "CLERK" : "SUPABASE",
        },
      });

      await audit({
        adminId: request.adminUser!.id,
        action: "ADMIN_INVITED",
        targetType: "AdminUser",
        targetId: newAdmin.id,
        metadata: { email: normalizedEmail, role: targetRole },
        ip: request.ip,
      });

      return reply.status(201).send({ admin: newAdmin });
    },
  );

  app.post(
    "/api/v1/admin/admins/:id/role",
    { preHandler: [requirePermission("admin_users", "write")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { role } = (request.body as { role?: AdminRole }) || {};

      const validRoles: AdminRole[] = [
        "SUPER_ADMIN",
        "OPS",
        "SUPPORT",
        "FINANCE",
        "COMPLIANCE",
        "VIEWER",
      ];
      if (!role || !validRoles.includes(role)) {
        return reply.status(400).send({ error: "Invalid admin role specified." });
      }

      const targetAdmin = await prisma.adminUser.findUnique({ where: { id } });
      if (!targetAdmin) {
        return reply.status(404).send({ error: "Admin user not found." });
      }

      const updated = await prisma.adminUser.update({
        where: { id },
        data: { role },
      });

      await audit({
        adminId: request.adminUser!.id,
        action: "ADMIN_ROLE_CHANGED",
        targetType: "AdminUser",
        targetId: id,
        metadata: { previousRole: targetAdmin.role, newRole: role },
        ip: request.ip,
      });

      return reply.send({ admin: updated });
    },
  );

  app.post(
    "/api/v1/admin/admins/:id/disable",
    { preHandler: [requirePermission("admin_users", "write")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const reason = (request.body as { reason?: string })?.reason || "Disabled by SUPER_ADMIN";

      if (request.adminUser!.id === id) {
        return reply.status(400).send({ error: "You cannot disable your own admin account." });
      }

      const targetAdmin = await prisma.adminUser.findUnique({ where: { id } });
      if (!targetAdmin) {
        return reply.status(404).send({ error: "Admin user not found." });
      }

      // 1. Mark status DISABLED
      await prisma.adminUser.update({
        where: { id },
        data: { status: "DISABLED" },
      });

      // 2. End all active AdminSession rows
      await prisma.adminSession.deleteMany({
        where: { adminUserId: id },
      });

      // 3. Invalidate Supabase session if configured
      if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && targetAdmin.authSubject) {
        try {
          await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${targetAdmin.authSubject}/logout`, {
            method: "POST",
            headers: {
              apikey: env.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
          }).catch(() => {});
        } catch {
          // ignore external fetch failures
        }
      }

      // 4. Audit
      await audit({
        adminId: request.adminUser!.id,
        action: "ADMIN_DISABLED",
        targetType: "AdminUser",
        targetId: id,
        reason,
        ip: request.ip,
      });

      return reply.send({ success: true, message: "Admin account disabled and sessions revoked." });
    },
  );

  // ── M2 Overview & Analytics ──────────────────────────────────────────────
  app.get(
    "/api/v1/admin/overview",
    { preHandler: [requirePermission("overview", "read")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "overview" });
    },
  );

  app.get(
    "/api/v1/admin/feed",
    { preHandler: [requirePermission("overview", "read")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "feed" });
    },
  );

  app.get(
    "/api/v1/admin/acquisition",
    { preHandler: [requirePermission("overview", "read")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "acquisition" });
    },
  );

  app.get(
    "/api/v1/admin/funnels",
    { preHandler: [requirePermission("overview", "read")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "funnels" });
    },
  );

  app.get(
    "/api/v1/admin/retention",
    { preHandler: [requirePermission("overview", "read")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "retention" });
    },
  );

  app.get(
    "/api/v1/admin/traffic",
    { preHandler: [requirePermission("overview", "read")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "traffic" });
    },
  );

  // ── M3 Users & Directory ────────────────────────────────────────────────
  app.get(
    "/api/v1/admin/users",
    { preHandler: [requirePermission("users", "read")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "users" });
    },
  );

  app.get(
    "/api/v1/admin/users/:id",
    { preHandler: [requirePermission("users", "read")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "users_detail" });
    },
  );

  app.post(
    "/api/v1/admin/users/:id/reveal",
    { preHandler: [requirePermission("reveal_pii", "read")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { reason } = (request.body as { reason?: string }) || {};
      await audit({
        adminId: request.adminUser!.id,
        action: "PII_REVEAL",
        targetType: "User",
        targetId: id,
        reason: reason || "Audited PII reveal",
        ip: request.ip,
      });
      return reply.send({ status: "ok", module: "reveal_pii" });
    },
  );

  app.post(
    "/api/v1/admin/users/:id/notes",
    { preHandler: [requirePermission("tickets", "write")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "notes" });
    },
  );

  app.post(
    "/api/v1/admin/users/:id/suspend",
    { preHandler: [requirePermission("user_actions", "write")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { reason } = (request.body as { reason?: string }) || {};
      await audit({
        adminId: request.adminUser!.id,
        action: "USER_SUSPEND",
        targetType: "User",
        targetId: id,
        reason: reason || "Suspended by admin",
        ip: request.ip,
      });
      return reply.send({ status: "ok", module: "suspend" });
    },
  );

  app.post(
    "/api/v1/admin/users/:id/revoke-sessions",
    { preHandler: [requirePermission("user_actions", "write")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      await audit({
        adminId: request.adminUser!.id,
        action: "USER_REVOKE_SESSIONS",
        targetType: "User",
        targetId: id,
        ip: request.ip,
      });
      return reply.send({ status: "ok", module: "revoke_sessions" });
    },
  );

  app.post(
    "/api/v1/admin/users/:id/resend-verification",
    { preHandler: [requirePermission("tickets", "write")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "resend_verification" });
    },
  );

  app.post(
    "/api/v1/admin/users/tags",
    { preHandler: [requirePermission("user_actions", "write")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "tags" });
    },
  );

  // ── M4/M5 Bookings & Order Rooms ─────────────────────────────────────────
  app.get(
    "/api/v1/admin/bookings",
    { preHandler: [requirePermission("bookings", "read")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "bookings" });
    },
  );

  app.get(
    "/api/v1/admin/bookings/:id",
    { preHandler: [requirePermission("bookings", "read")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "bookings_detail" });
    },
  );

  app.post(
    "/api/v1/admin/bookings/:id/force-state",
    { preHandler: [requirePermission("admin_users", "write")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "force_state" });
    },
  );

  app.get(
    "/api/v1/admin/bookings/:id/chat",
    { preHandler: [requirePermission("chat", "read")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      await audit({
        adminId: request.adminUser!.id,
        action: "CHAT_VIEW",
        targetType: "Booking",
        targetId: id,
        ip: request.ip,
      });
      return reply.send({ status: "ok", module: "chat" });
    },
  );

  // ── M6/M7 Payments & Withdrawals ─────────────────────────────────────────
  app.get(
    "/api/v1/admin/payments",
    { preHandler: [requirePermission("payments", "read")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "payments" });
    },
  );

  app.get(
    "/api/v1/admin/withdrawals",
    { preHandler: [requirePermission("withdrawals", "read")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "withdrawals" });
    },
  );

  app.post(
    "/api/v1/admin/withdrawals/:id/flag",
    { preHandler: [requirePermission("payments", "write")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "withdrawals_flag" });
    },
  );

  app.post(
    "/api/v1/admin/withdrawals/:id/clear",
    { preHandler: [requirePermission("payments", "write")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "withdrawals_clear" });
    },
  );

  // ── M8 Support Tickets ───────────────────────────────────────────────────
  app.get(
    "/api/v1/admin/tickets",
    { preHandler: [requirePermission("tickets", "read")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "tickets" });
    },
  );

  app.post(
    "/api/v1/admin/tickets/:id/reply",
    { preHandler: [requirePermission("tickets", "write")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      await audit({
        adminId: request.adminUser!.id,
        action: "TICKET_REPLY",
        targetType: "SupportTicket",
        targetId: id,
        ip: request.ip,
      });
      return reply.send({ status: "ok", module: "tickets_reply" });
    },
  );

  app.post(
    "/api/v1/admin/tickets/:id/assign",
    { preHandler: [requirePermission("tickets", "write")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "tickets_assign" });
    },
  );

  app.post(
    "/api/v1/admin/tickets/:id/status",
    { preHandler: [requirePermission("tickets", "write")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "tickets_status" });
    },
  );

  // ── M9 Disputes ──────────────────────────────────────────────────────────
  app.get(
    "/api/v1/admin/disputes",
    { preHandler: [requirePermission("disputes", "read")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "disputes" });
    },
  );

  app.get(
    "/api/v1/admin/disputes/:id",
    { preHandler: [requirePermission("disputes", "read")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "disputes_detail" });
    },
  );

  app.post(
    "/api/v1/admin/disputes/:id/evidence",
    { preHandler: [requirePermission("disputes", "write")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "disputes_evidence" });
    },
  );

  app.post(
    "/api/v1/admin/disputes/:id/resolve",
    { preHandler: [requirePermission("disputes_resolve", "write")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { reason } = (request.body as { reason?: string }) || {};
      await audit({
        adminId: request.adminUser!.id,
        action: "DISPUTE_RESOLVED",
        targetType: "Dispute",
        targetId: id,
        reason: reason || "Dispute resolved",
        ip: request.ip,
      });
      return reply.send({ status: "ok", module: "disputes_resolve" });
    },
  );

  // ── M10 Verifications ────────────────────────────────────────────────────
  app.get(
    "/api/v1/admin/verifications",
    { preHandler: [requirePermission("verifications", "read")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "verifications" });
    },
  );

  app.post(
    "/api/v1/admin/verifications/:id/approve",
    { preHandler: [requirePermission("verifications", "write")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      await audit({
        adminId: request.adminUser!.id,
        action: "KYC_APPROVED",
        targetType: "KycCheck",
        targetId: id,
        ip: request.ip,
      });
      return reply.send({ status: "ok", module: "verifications_approve" });
    },
  );

  app.post(
    "/api/v1/admin/verifications/:id/reject",
    { preHandler: [requirePermission("verifications", "write")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { reason } = (request.body as { reason?: string }) || {};
      await audit({
        adminId: request.adminUser!.id,
        action: "KYC_REJECTED",
        targetType: "KycCheck",
        targetId: id,
        reason: reason || "Rejected by compliance",
        ip: request.ip,
      });
      return reply.send({ status: "ok", module: "verifications_reject" });
    },
  );

  // ── M11 Alerts & System Health ───────────────────────────────────────────
  app.get(
    "/api/v1/admin/alerts",
    { preHandler: [requirePermission("alerts", "read")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "alerts" });
    },
  );

  app.post(
    "/api/v1/admin/alerts/:id/ack",
    { preHandler: [requirePermission("alerts", "read")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      if (request.adminUser!.role === "VIEWER") {
        return reply.status(403).send({ error: "VIEWER cannot acknowledge alerts." });
      }
      await audit({
        adminId: request.adminUser!.id,
        action: "ALERT_ACK",
        targetType: "AlertEvent",
        targetId: id,
        ip: request.ip,
      });
      return reply.send({ status: "ok", module: "alerts_ack" });
    },
  );

  app.post(
    "/api/v1/admin/alerts/:id/resolve",
    { preHandler: [requirePermission("alerts", "write")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      await audit({
        adminId: request.adminUser!.id,
        action: "ALERT_RESOLVED",
        targetType: "AlertEvent",
        targetId: id,
        ip: request.ip,
      });
      return reply.send({ status: "ok", module: "alerts_resolve" });
    },
  );

  app.get(
    "/api/v1/admin/health",
    { preHandler: [requirePermission("system_health", "read")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: "ok", module: "health" });
    },
  );

  // ── M1.3 Audit Log & Exports ────────────────────────────────────────────
  app.get(
    "/api/v1/admin/audit",
    { preHandler: [requirePermission("audit_log", "read")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const logs = await prisma.adminAuditLog.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
      });
      return reply.send({ logs });
    },
  );

  app.post(
    "/api/v1/admin/exports/:type",
    { preHandler: [requirePermission("exports", "read")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { type } = request.params as { type: string };
      const { reason } = (request.body as { reason?: string }) || {};
      await audit({
        adminId: request.adminUser!.id,
        action: "CSV_EXPORT",
        targetType: "Export",
        targetId: type,
        reason: reason || "Export triggered",
        ip: request.ip,
      });
      return reply.send({ status: "ok", exportType: type });
    },
  );
}
