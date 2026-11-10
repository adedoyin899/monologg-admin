import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { AdminRole, UserType, BookingState } from "@prisma/client";
import { randomUUID, createHmac } from "node:crypto";
import { prisma } from "../../db/client.js";
import { adminRoPrisma, getMaterializedViewLastRefreshed } from "../../db/adminRoClient.js";
import { env } from "../../config/env.js";
import { requireAdmin, requirePermission } from "../../middlewares/adminAuth.js";
import { getRolePermissions } from "../../config/adminPermissions.js";
import { audit } from "../../services/adminAudit.js";
import { kpiService, type KpiFilterOptions } from "../../admin/kpi/index.js";
import { maskEmail, maskName, maskPhone, maskAccount } from "../../lib/masking.js";
import { revokeAllUserSessions } from "../../services/auth.js";
import { notifyProvider } from "../../providers/index.js";
import { cacheProvider } from "../../providers/cache.js";
import {
  ATTRIBUTE_FIELD_NAMES,
  type AttributeFieldName,
  type VisibilityMap,
} from "../../services/attributes.js";

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
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as {
        from?: string;
        to?: string;
        cohortTag?: string;
        userType?: string;
        currency?: string;
      };

      // 1. Resolve date range & previous equal period
      const toDate = query.to ? new Date(query.to) : new Date();
      const fromDate = query.from
        ? new Date(query.from)
        : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const durationMs = Math.max(toDate.getTime() - fromDate.getTime(), 1000);
      const prevToDate = new Date(fromDate.getTime());
      const prevFromDate = new Date(fromDate.getTime() - durationMs);

      const validUserTypes: UserType[] = ["TALENT", "CLIENT"];
      const validatedUserType =
        query.userType && validUserTypes.includes(query.userType as UserType)
          ? (query.userType as UserType)
          : undefined;

      const validCurrencies = ["NGN", "USD", "GBP"];
      const validatedCurrency =
        query.currency && validCurrencies.includes(query.currency.toUpperCase())
          ? query.currency.toUpperCase()
          : undefined;

      const currentOptions: KpiFilterOptions = {
        startDate: fromDate,
        endDate: toDate,
        userType: validatedUserType,
        cohortTag: query.cohortTag?.trim() || undefined,
        currency: validatedCurrency,
      };

      const prevOptions: KpiFilterOptions = {
        startDate: prevFromDate,
        endDate: prevToDate,
        userType: validatedUserType,
        cohortTag: query.cohortTag?.trim() || undefined,
        currency: validatedCurrency,
      };

      // Helper for calculating percentage change vs previous period
      const calcChange = (curr: number, prev: number): number | null => {
        if (prev === 0) return curr === 0 ? 0 : null;
        return Math.round(((curr - prev) / prev) * 1000) / 10;
      };

      // 2. Fetch current & previous snapshots + contextual aggregate counts
      const [
        currentSnapshot,
        prevSnapshot,
        openTicketsCount,
        openDisputesCount,
        criticalAlertsCount,
        criticalAlertsList,
        currentBookingsCount,
        prevBookingsCount,
        usersInRange,
        bookingsByStateRaw,
        eligibleBookingsGmv,
        lastRefreshedDate,
      ] = await Promise.all([
        kpiService.getSnapshot(currentOptions),
        kpiService.getSnapshot(prevOptions),
        adminRoPrisma.supportTicket.count({
          where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        }),
        adminRoPrisma.booking.count({
          where: { state: "DISPUTED" },
        }),
        adminRoPrisma.alertEvent.count({
          where: { severity: "CRITICAL", status: "OPEN" },
        }),
        adminRoPrisma.alertEvent.findMany({
          where: { severity: "CRITICAL", status: "OPEN" },
          take: 5,
          orderBy: { lastSeenAt: "desc" },
          select: {
            id: true,
            ruleKey: true,
            severity: true,
            detail: true,
            lastSeenAt: true,
          },
        }),
        adminRoPrisma.booking.count({
          where: {
            createdAt: { gte: fromDate, lte: toDate },
            client: { user: { isTestUser: false } },
            ...(validatedCurrency ? { currency: validatedCurrency } : {}),
          },
        }),
        adminRoPrisma.booking.count({
          where: {
            createdAt: { gte: prevFromDate, lte: prevToDate },
            client: { user: { isTestUser: false } },
            ...(validatedCurrency ? { currency: validatedCurrency } : {}),
          },
        }),
        adminRoPrisma.user.findMany({
          where: {
            createdAt: { gte: fromDate, lte: toDate },
            isTestUser: false,
            ...(validatedUserType ? { userType: validatedUserType } : {}),
          },
          select: {
            createdAt: true,
            userType: true,
          },
        }),
        adminRoPrisma.booking.groupBy({
          by: ["state"],
          where: {
            createdAt: { gte: fromDate, lte: toDate },
            client: { user: { isTestUser: false } },
            ...(validatedCurrency ? { currency: validatedCurrency } : {}),
          },
          _count: { id: true },
        }),
        adminRoPrisma.booking.findMany({
          where: {
            createdAt: { gte: fromDate, lte: toDate },
            client: { user: { isTestUser: false } },
            state: {
              in: [
                "ESCROW_LOCKED",
                "DELIVERABLES_PROVIDED",
                "PAYMENT_RELEASED",
                "DISPUTED",
              ],
            },
            ...(validatedCurrency ? { currency: validatedCurrency } : {}),
          },
          select: {
            createdAt: true,
            currency: true,
            baseAmount: true,
          },
        }),
        getMaterializedViewLastRefreshed().catch(() => null),
      ]);

      // 3. Build signupsByDay chart series
      const dayMap = new Map<string, { talent: number; client: number; total: number }>();
      const cursorDate = new Date(fromDate);
      while (cursorDate <= toDate) {
        const key = cursorDate.toISOString().slice(0, 10);
        dayMap.set(key, { talent: 0, client: 0, total: 0 });
        cursorDate.setDate(cursorDate.getDate() + 1);
      }

      for (const u of usersInRange) {
        if (!u.createdAt) continue;
        const dayKey = new Date(u.createdAt).toISOString().slice(0, 10);
        const entry = dayMap.get(dayKey);
        if (entry) {
          if (u.userType === "TALENT") entry.talent++;
          else if (u.userType === "CLIENT") entry.client++;
          entry.total++;
        }
      }

      const signupsByDay = Array.from(dayMap.entries()).map(([date, counts]) => ({
        date,
        ...counts,
      }));

      // 4. Build bookingsByState chart series
      const bookingsByState = bookingsByStateRaw.map((b) => ({
        state: b.state,
        count: b._count.id,
      }));

      // 5. Build gmvByDay chart series
      const gmvDayMap = new Map<string, Record<string, number>>();
      const gmvCursor = new Date(fromDate);
      while (gmvCursor <= toDate) {
        const key = gmvCursor.toISOString().slice(0, 10);
        gmvDayMap.set(key, { NGN: 0, USD: 0, GBP: 0 });
        gmvCursor.setDate(gmvCursor.getDate() + 1);
      }

      for (const b of eligibleBookingsGmv) {
        if (!b.createdAt || !b.currency) continue;
        const dayKey = new Date(b.createdAt).toISOString().slice(0, 10);
        const entry = gmvDayMap.get(dayKey);
        if (entry) {
          entry[b.currency] = (entry[b.currency] || 0) + Number(b.baseAmount);
        }
      }

      const gmvByDay = Array.from(gmvDayMap.entries()).map(([date, amountsByCurrency]) => ({
        date,
        amountsByCurrency,
      }));

      // 6. Build activationFunnel snapshot
      const talentTotal = currentSnapshot.signups.byUserType["TALENT"] || 0;
      const clientTotal = currentSnapshot.signups.byUserType["CLIENT"] || 0;

      const activationFunnel = {
        talent: [
          { stage: "Signups", count: talentTotal, conversion: 1.0 },
          {
            stage: "Email Verified",
            count: currentSnapshot.emailVerified,
            conversion: talentTotal > 0 ? Math.min(currentSnapshot.emailVerified / talentTotal, 1) : 0,
          },
          {
            stage: "Onboarded",
            count: currentSnapshot.talentOnboarded,
            conversion:
              currentSnapshot.emailVerified > 0
                ? Math.min(currentSnapshot.talentOnboarded / currentSnapshot.emailVerified, 1)
                : 0,
          },
          {
            stage: "Activated",
            count: currentSnapshot.talentActivated,
            conversion:
              currentSnapshot.talentOnboarded > 0
                ? Math.min(currentSnapshot.talentActivated / currentSnapshot.talentOnboarded, 1)
                : 0,
          },
          {
            stage: "Verified KYC",
            count: currentSnapshot.identityVerified,
            conversion:
              currentSnapshot.talentActivated > 0
                ? Math.min(currentSnapshot.identityVerified / currentSnapshot.talentActivated, 1)
                : 0,
          },
        ],
        client: [
          { stage: "Signups", count: clientTotal, conversion: 1.0 },
          {
            stage: "Activated",
            count: currentSnapshot.clientActivated,
            conversion: clientTotal > 0 ? Math.min(currentSnapshot.clientActivated / clientTotal, 1) : 0,
          },
          {
            stage: "Escrow Locked",
            count:
              currentSnapshot.bookingFunnel.find((f) => f.step === "escrow_locked")?.count ||
              currentBookingsCount,
            conversion:
              currentSnapshot.clientActivated > 0
                ? Math.min(
                    (currentSnapshot.bookingFunnel.find((f) => f.step === "escrow_locked")?.count ||
                      currentBookingsCount) / currentSnapshot.clientActivated,
                    1,
                  )
                : 0,
          },
        ],
      };

      // 7. Data Freshness Block
      const lastRefreshedAt = lastRefreshedDate ? lastRefreshedDate.toISOString() : new Date().toISOString();
      const stalenessMinutes = Math.floor(
        (Date.now() - new Date(lastRefreshedAt).getTime()) / (60 * 1000),
      );
      const isStale = stalenessMinutes > 15;

      const paymentsMode: "TEST" | "LIVE" = (env.PAYSTACK_SECRET_KEY || "").startsWith("sk_live_")
        ? "LIVE"
        : "TEST";

      // 8. Format money metrics (all BigInts converted to numbers, per currency)
      const moneyByCurrency = currentSnapshot.moneyByCurrency.map((m) => ({
        currency: m.currency,
        gmv: Number(m.gmv),
        escrowHeld: Number(m.escrowHeld),
        released: Number(m.released),
        platformRevenue: Number(m.platformRevenue),
        talentEarned: Number(m.talentEarned),
        talentAvailable: Number(m.talentAvailable),
        takeRate: m.takeRate,
      }));

      // Total Escrow Locked map
      const escrowLockedByCurrency: Record<string, number> = {};
      for (const m of moneyByCurrency) {
        escrowLockedByCurrency[m.currency] = m.escrowHeld;
      }

      return reply.send({
        period: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          previousFrom: prevFromDate.toISOString(),
          previousTo: prevToDate.toISOString(),
        },
        cards: {
          signups: {
            total: currentSnapshot.signups.total,
            talent: currentSnapshot.signups.byUserType["TALENT"] || 0,
            client: currentSnapshot.signups.byUserType["CLIENT"] || 0,
            change: calcChange(currentSnapshot.signups.total, prevSnapshot.signups.total),
          },
          activeUsers: {
            dau: currentSnapshot.activeUsers.dau,
            wau: currentSnapshot.activeUsers.wau,
            mau: currentSnapshot.activeUsers.mau,
          },
          talentActivated: {
            total: currentSnapshot.talentActivated,
            change: calcChange(currentSnapshot.talentActivated, prevSnapshot.talentActivated),
          },
          clientActivated: {
            total: currentSnapshot.clientActivated,
            change: calcChange(currentSnapshot.clientActivated, prevSnapshot.clientActivated),
          },
          bookingsCreated: {
            total: currentBookingsCount,
            change: calcChange(currentBookingsCount, prevBookingsCount),
          },
          escrowLocked: {
            byCurrency: escrowLockedByCurrency,
            change: null,
          },
          money: {
            byCurrency: moneyByCurrency,
          },
          openTickets: {
            total: openTicketsCount,
          },
          openDisputes: {
            total: openDisputesCount,
          },
          criticalAlerts: {
            total: criticalAlertsCount,
          },
        },
        charts: {
          signupsByDay,
          bookingsByState,
          gmvByDay,
          activationFunnel,
        },
        freshness: {
          lastRefreshedAt,
          isStale,
          stalenessMinutes,
          paymentsMode,
          environment: env.NODE_ENV,
        },
        criticalAlerts: criticalAlertsList.map((a) => ({
          id: a.id,
          ruleKey: a.ruleKey,
          message: typeof a.detail === "object" && a.detail && "message" in a.detail ? String((a.detail as any).message) : a.ruleKey,
          severity: a.severity,
          lastSeenAt: a.lastSeenAt.toISOString(),
        })),
      });
    },
  );

  const FEED_EVENT_GROUPS: Record<string, string[]> = {
    auth: [
      "auth_signup_started",
      "auth_signup_completed",
      "auth_signin_succeeded",
      "auth_signin_failed",
      "signup",
      "sign_in",
    ],
    bookings: [
      "booking_started",
      "booking_state_changed",
      "slot_selected",
      "checkout_started",
      "deliverables_provided",
      "release_approved",
      "booking_cancelled",
    ],
    payments: [
      "payment_initiated",
      "escrow_locked",
      "release_approved",
      "webhook_received",
      "webhook_failed",
    ],
    projects: [
      "project_posted",
      "application_submitted",
      "application_shortlisted",
      "application_selected",
      "application_rejected",
      "cap_reached",
    ],
    media: [
      "media_uploaded",
      "rate_card_created",
      "media_kit_mode_changed",
      "media_kit_downloaded",
      "verification_recording_started",
      "verification_recording_submitted",
      "verification_recording_rejected",
      "attributes_saved",
      "attributes_deleted",
    ],
    withdrawals: [
      "withdrawal_requested",
      "withdrawal_otp_verified",
      "withdrawal_completed",
      "withdrawal_failed",
    ],
    support: [
      "support_ticket_created",
      "ticket_created",
      "dispute_created",
      "dispute_opened",
    ],
  };

  app.get(
    "/api/v1/admin/feed",
    { preHandler: [requirePermission("overview", "read")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as {
        cursor?: string;
        limit?: string;
        eventGroup?: string;
        userType?: string;
        includeTestUsers?: string;
      };

      const requestedLimit = Math.min(Math.max(parseInt(query.limit || "20", 10) || 20, 1), 100);
      const includeTestUsers = query.includeTestUsers === "true";
      const eventGroup = (query.eventGroup || "all").toLowerCase();
      const targetUserType = query.userType && query.userType !== "ALL" ? query.userType : undefined;

      // Base query for ProductEvent
      const where: any = {};

      if (eventGroup !== "all" && FEED_EVENT_GROUPS[eventGroup]) {
        where.name = { in: FEED_EVENT_GROUPS[eventGroup] };
      }

      if (query.cursor) {
        try {
          const cursorBigInt = BigInt(query.cursor);
          where.id = { lt: cursorBigInt };
        } catch {
          // ignore malformed cursor
        }
      }

      // Query raw events (take extra to allow for test user filtration)
      const rawEvents = await adminRoPrisma.productEvent.findMany({
        where,
        take: requestedLimit * 3 + 10,
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      });

      // Collect user IDs for batch lookup & masking
      const userIds = [
        ...new Set(rawEvents.map((e) => e.userId).filter((id): id is string => Boolean(id))),
      ];

      const users = await adminRoPrisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          email: true,
          userType: true,
          isTestUser: true,
          creator: {
            select: { name: true, location: true },
          },
          client: {
            select: { name: true, location: true },
          },
        },
      });

      const userMap = new Map<string, (typeof users)[0]>();
      for (const u of users) {
        userMap.set(u.id, u);
      }

      // Filter and format items
      const formattedEvents: Array<{
        id: string;
        name: string;
        eventGroup: string;
        occurredAt: string;
        actorLabel: string;
        userType: string | null;
        country: string | null;
        targetType: "user" | "booking" | "ticket" | null;
        targetId: string | null;
        targetUrl: string | null;
        description: string;
        props: Record<string, unknown>;
      }> = [];

      for (const ev of rawEvents) {
        const u = ev.userId ? userMap.get(ev.userId) : null;
        const props = (ev.props as Record<string, any>) || {};

        // Exclude test users unless explicitly requested
        const isTest = u?.isTestUser ?? (props.isTestUser === true);
        if (!includeTestUsers && isTest) {
          continue;
        }

        // Filter by userType if requested
        const effectiveUserType = u?.userType ?? props.userType ?? null;
        if (targetUserType && effectiveUserType !== targetUserType) {
          continue;
        }

        // Determine event group
        let assignedGroup = "other";
        for (const [groupName, eventNames] of Object.entries(FEED_EVENT_GROUPS)) {
          if (eventNames.includes(ev.name)) {
            assignedGroup = groupName;
            break;
          }
        }

        // Mask actor label
        let actorLabel = "Anonymous User";
        if (u) {
          if (u.creator?.name) {
            actorLabel = maskName(u.creator.name);
          } else if (u.client?.name) {
            actorLabel = maskName(u.client.name);
          } else {
            actorLabel = maskEmail(u.email);
          }
        } else if (ev.actorType === "SYSTEM") {
          actorLabel = "System Engine";
        }

        // Resolve target URL & ID
        let targetType: "user" | "booking" | "ticket" | null = null;
        let targetId: string | null = null;
        let targetUrl: string | null = null;

        if (props.bookingId) {
          targetType = "booking";
          targetId = String(props.bookingId);
          targetUrl = `/bookings/${props.bookingId}`;
        } else if (ev.userId) {
          targetType = "user";
          targetId = ev.userId;
          targetUrl = `/users/${ev.userId}`;
        } else if (props.ticketId) {
          targetType = "ticket";
          targetId = String(props.ticketId);
          targetUrl = `/support/${props.ticketId}`;
        }

        // Clean readable description
        let description = ev.name.replace(/_/g, " ");
        if (ev.name === "auth_signup_completed" || ev.name === "signup") {
          description = `New user signed up (${effectiveUserType || "TALENT"})`;
        } else if (ev.name === "auth_signin_succeeded" || ev.name === "sign_in") {
          description = "User signed in successfully";
        } else if (ev.name === "booking_started") {
          description = "Started checkout on a talent profile";
        } else if (ev.name === "booking_state_changed") {
          description = `Booking status changed to ${props.to || "updated"}`;
        } else if (ev.name === "escrow_locked") {
          description = `Escrow locked (${props.currency || "NGN"} ${props.amountMinor ? Number(props.amountMinor) / 100 : ""})`;
        } else if (ev.name === "deliverables_provided") {
          description = "Talent submitted work deliverables";
        } else if (ev.name === "release_approved") {
          description = "Payment release approved to talent";
        } else if (ev.name === "media_uploaded") {
          description = "New media portfolio item uploaded";
        } else if (ev.name === "rate_card_created") {
          description = "New rate card service published";
        } else if (ev.name === "withdrawal_requested") {
          description = `Withdrawal request submitted (${props.currency || "NGN"})`;
        } else if (ev.name === "dispute_opened" || ev.name === "dispute_created") {
          description = "Dispute filed on booking";
        } else if (ev.name === "support_ticket_created" || ev.name === "ticket_created") {
          description = "Support ticket submitted";
        }

        // Scrub sensitive values from props before returning (PII negative guarantee)
        const safeProps: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(props)) {
          if (
            key.toLowerCase().includes("password") ||
            key.toLowerCase().includes("token") ||
            key.toLowerCase().includes("secret") ||
            key.toLowerCase().includes("code") ||
            key.toLowerCase().includes("hash")
          ) {
            continue;
          }
          safeProps[key] = typeof value === "bigint" ? value.toString() : value;
        }

        formattedEvents.push({
          id: ev.id.toString(),
          name: ev.name,
          eventGroup: assignedGroup,
          occurredAt: ev.occurredAt.toISOString(),
          actorLabel,
          userType: effectiveUserType,
          country: ev.country || u?.creator?.location?.split(",")?.pop()?.trim() || null,
          targetType,
          targetId,
          targetUrl,
          description,
          props: safeProps,
        });

        if (formattedEvents.length === requestedLimit) {
          break;
        }
      }

      const hasMore = rawEvents.length > requestedLimit;
      const nextCursor =
        hasMore && formattedEvents.length > 0
          ? formattedEvents[formattedEvents.length - 1].id
          : null;

      return reply.send({
        events: formattedEvents,
        nextCursor,
        hasMore,
        polledAt: new Date().toISOString(),
      });
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
  function isSensitiveNotification(kind: string): boolean {
    const k = (kind || "").toLowerCase();
    return (
      k.includes("otp") ||
      k.includes("signin") ||
      k.includes("sign_in") ||
      k.includes("login") ||
      k.includes("password") ||
      k.includes("auth") ||
      k.includes("token") ||
      k.includes("code") ||
      k.includes("verification")
    );
  }

  app.get(
    "/api/v1/admin/users",
    { preHandler: [requirePermission("users", "read")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as {
        search?: string;
        userType?: string;
        verification?: string;
        authProvider?: string;
        accountOrigin?: string;
        country?: string;
        cohortTag?: string;
        signupDateFrom?: string;
        signupDateTo?: string;
        lastActiveFrom?: string;
        lastActiveTo?: string;
        hasBooking?: string;
        hasEarnings?: string;
        suspended?: string;
        cursor?: string;
        limit?: string;
        sort?: string;
        order?: string;
        includeTestUsers?: string;
      };

      const db = adminRoPrisma || prisma;
      const limit = Math.min(Math.max(parseInt(query.limit || "50", 10) || 50, 1), 50);
      const sortField = query.sort === "lastActiveAt" ? "lastActiveAt" : "createdAt";
      const sortOrder: "asc" | "desc" = query.order === "asc" ? "asc" : "desc";

      const where: any = {};

      if (query.includeTestUsers !== "true") {
        where.isTestUser = false;
      }

      if (query.userType && (query.userType === "TALENT" || query.userType === "CLIENT")) {
        where.userType = query.userType;
      }

      if (query.authProvider) {
        where.authProvider = query.authProvider;
      }

      if (query.accountOrigin) {
        where.accountOrigin = query.accountOrigin;
      }

      if (query.suspended === "true") {
        where.suspendedAt = { not: null };
      } else if (query.suspended === "false") {
        where.suspendedAt = null;
      }

      if (query.signupDateFrom || query.signupDateTo) {
        where.createdAt = {};
        if (query.signupDateFrom) where.createdAt.gte = new Date(query.signupDateFrom);
        if (query.signupDateTo) where.createdAt.lte = new Date(query.signupDateTo);
      }

      if (query.lastActiveFrom || query.lastActiveTo) {
        where.lastActiveAt = {};
        if (query.lastActiveFrom) where.lastActiveAt.gte = new Date(query.lastActiveFrom);
        if (query.lastActiveTo) where.lastActiveAt.lte = new Date(query.lastActiveTo);
      }

      if (query.verification) {
        where.creator = { ...where.creator, verification: query.verification };
      }

      if (query.hasBooking === "true") {
        where.OR = [
          { creator: { bookings: { some: {} } } },
          { client: { bookings: { some: {} } } },
        ];
      } else if (query.hasBooking === "false") {
        where.AND = [
          ...(where.AND || []),
          { creator: { bookings: { none: {} } } },
          { client: { bookings: { none: {} } } },
        ];
      }

      if (query.hasEarnings === "true") {
        where.creator = {
          ...where.creator,
          bookings: { some: { state: "PAYMENT_RELEASED" } },
        };
      } else if (query.hasEarnings === "false") {
        where.creator = {
          ...where.creator,
          bookings: { none: { state: "PAYMENT_RELEASED" } },
        };
      }

      if (query.cohortTag) {
        const tagged = await db.userTag.findMany({
          where: { tag: query.cohortTag.trim() },
          select: { userId: true },
        });
        const taggedIds = tagged.map((t) => t.userId);
        where.id = where.id ? { ...where.id, in: taggedIds } : { in: taggedIds };
      }

      if (query.country) {
        const acquisitions = await db.userAcquisition.findMany({
          where: { signupCountry: query.country.trim().toUpperCase() },
          select: { userId: true },
        });
        const acqIds = acquisitions.map((a) => a.userId);
        where.id = where.id ? { ...where.id, in: acqIds } : { in: acqIds };
      }

      if (query.search && query.search.trim()) {
        const term = query.search.trim();
        const searchConditions = [
          { id: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
          { creator: { name: { contains: term, mode: "insensitive" } } },
          { client: { name: { contains: term, mode: "insensitive" } } },
          { creator: { referralCode: { contains: term, mode: "insensitive" } } },
        ];
        if (where.OR) {
          where.AND = [...(where.AND || []), { OR: searchConditions }];
        } else {
          where.OR = searchConditions;
        }
      }

      const users = await db.user.findMany({
        where,
        take: limit + 1,
        skip: query.cursor ? 1 : 0,
        cursor: query.cursor ? { id: query.cursor } : undefined,
        orderBy: { [sortField]: sortOrder },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              verification: true,
              referralCode: true,
              niche: true,
              _count: { select: { bookings: true } },
            },
          },
          client: {
            select: {
              id: true,
              name: true,
              orgName: true,
              _count: { select: { bookings: true } },
            },
          },
        },
      });

      const hasMore = users.length > limit;
      const pageUsers = hasMore ? users.slice(0, limit) : users;
      const nextCursor = hasMore && pageUsers.length > 0 ? pageUsers[pageUsers.length - 1].id : null;

      const userIds = pageUsers.map((u) => u.id);

      const [tags, acquisitions, totalCount] = await Promise.all([
        userIds.length > 0 ? db.userTag.findMany({ where: { userId: { in: userIds } } }) : [],
        userIds.length > 0
          ? db.userAcquisition.findMany({ where: { userId: { in: userIds } } })
          : [],
        db.user.count({ where }).catch(() => pageUsers.length),
      ]);

      const tagsByUserId = new Map<string, string[]>();
      for (const t of tags) {
        const arr = tagsByUserId.get(t.userId) || [];
        arr.push(t.tag);
        tagsByUserId.set(t.userId, arr);
      }

      const acqByUserId = new Map<string, (typeof acquisitions)[0]>();
      for (const a of acquisitions) {
        acqByUserId.set(a.userId, a);
      }

      const formatted = pageUsers.map((u) => {
        const acq = acqByUserId.get(u.id);
        const rawName = u.creator?.name || u.client?.name || "";
        const source =
          acq?.utmSource ||
          acq?.referrerDomain ||
          (acq?.referralCodeUsed ? `ref:${acq.referralCodeUsed}` : null) ||
          "direct";
        const bookingsCount =
          (u.creator?._count?.bookings ?? 0) + (u.client?._count?.bookings ?? 0);

        return {
          id: u.id,
          name: maskName(rawName),
          email: maskEmail(u.email),
          maskedEmail: maskEmail(u.email),
          phone: maskPhone(u.phone),
          type: u.userType,
          userType: u.userType,
          authProvider: u.authProvider,
          accountOrigin: u.accountOrigin,
          signedUp: u.createdAt.toISOString(),
          createdAt: u.createdAt.toISOString(),
          lastActive: u.lastActiveAt ? u.lastActiveAt.toISOString() : null,
          lastActiveAt: u.lastActiveAt ? u.lastActiveAt.toISOString() : null,
          country: acq?.signupCountry || null,
          source,
          verification: u.creator?.verification || "N/A",
          bookings: bookingsCount,
          tags: tagsByUserId.get(u.id) || [],
          suspended: Boolean(u.suspendedAt),
          suspendedAt: u.suspendedAt ? u.suspendedAt.toISOString() : null,
          suspendedReason: u.suspendedReason,
        };
      });

      return reply.send({
        users: formatted,
        nextCursor,
        hasMore,
        totalCount,
      });
    },
  );

  app.get(
    "/api/v1/admin/users/:id",
    { preHandler: [requirePermission("users", "read")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const db = adminRoPrisma || prisma;

      const user = await db.user.findUnique({
        where: { id },
        include: {
          creator: {
            include: {
              media: { orderBy: { createdAt: "desc" } },
              rateCards: true,
              mediaKit: true,
              physicalAttributes: true,
              bookings: {
                orderBy: { createdAt: "desc" },
                take: 50,
                include: {
                  client: { select: { name: true } },
                },
              },
              applications: {
                orderBy: { createdAt: "desc" },
                take: 50,
                include: {
                  brief: {
                    select: {
                      id: true,
                      projectName: true,
                      projectType: true,
                      budgetAmount: true,
                      budgetCurrency: true,
                      status: true,
                    },
                  },
                },
              },
            },
          },
          client: {
            include: {
              briefs: {
                orderBy: { createdAt: "desc" },
                take: 50,
                include: {
                  _count: { select: { applications: true } },
                },
              },
              bookings: {
                orderBy: { createdAt: "desc" },
                take: 50,
                include: {
                  creator: { select: { name: true } },
                },
              },
            },
          },
          calendarConnection: true,
          refreshTokens: {
            where: { revokedAt: null, expiresAt: { gt: new Date() } },
          },
          notes: {
            orderBy: { createdAt: "desc" },
          },
          supportTickets: {
            orderBy: { createdAt: "desc" },
          },
          withdrawalRequests: {
            orderBy: { createdAt: "desc" },
          },
          notifications: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
          authEvents: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
        },
      });

      if (!user) {
        return reply.status(404).send({ error: "User not found." });
      }

      const [tags, acquisition, productEvents] = await Promise.all([
        db.userTag.findMany({ where: { userId: id } }).catch(() => []),
        db.userAcquisition.findUnique({ where: { userId: id } }).catch(() => null),
        db.productEvent
          .findMany({
            where: { userId: id },
            orderBy: { occurredAt: "desc" },
            take: 50,
          })
          .catch(() => []),
      ]);

      const rawName = user.creator?.name || user.client?.name || "";
      const maskedUserName = maskName(rawName);
      const maskedUserEmail = maskEmail(user.email);
      const maskedUserPhone = maskPhone(user.phone);

      // Attributes privacy calculation
      const phys = user.creator?.physicalAttributes;
      const visMap = (phys?.visibility as VisibilityMap) || {};
      let filledAttributesCount = 0;
      const attributesValues: Record<string, { value: string | null; visibility: string }> = {};

      for (const field of [...ATTRIBUTE_FIELD_NAMES, "distinctiveFeatures" as const]) {
        const val = phys ? (phys as any)[field] : null;
        if (val !== null && val !== undefined) {
          filledAttributesCount++;
        }
        const visibility = visMap[field as AttributeFieldName] || "SEARCHABLE";
        // NON-NEGOTIABLE #3 / Section 5: Standard view returns PUBLIC values ONLY.
        // SEARCHABLE and PRIVATE return value: null.
        if (visibility === "PUBLIC") {
          attributesValues[field] = { value: val ?? null, visibility: "PUBLIC" };
        } else if (visibility === "SEARCHABLE") {
          attributesValues[field] = { value: null, visibility: "SEARCHABLE" };
        } else {
          attributesValues[field] = { value: null, visibility: "PRIVATE" };
        }
      }

      const attributeCompleteness = {
        filled: filledAttributesCount,
        total: ATTRIBUTE_FIELD_NAMES.length,
        percentage: Math.round((filledAttributesCount / ATTRIBUTE_FIELD_NAMES.length) * 100),
      };

      // Money calculation (derived from bookings and withdrawals per currency)
      const allUserBookings = [
        ...(user.creator?.bookings || []),
        ...(user.client?.bookings || []),
      ];

      const currencies = ["NGN", "USD", "GBP"];
      const moneyByCurrency: Record<
        string,
        {
          currency: string;
          earned: number;
          escrowHeld: number;
          withdrawn: number;
          pendingWithdrawal: number;
          feesPaid: number;
          totalSpend: number;
        }
      > = {};

      for (const curr of currencies) {
        let earned = 0;
        let escrowHeld = 0;
        let feesPaid = 0;
        let totalSpend = 0;

        if (user.userType === "TALENT") {
          for (const b of user.creator?.bookings || []) {
            if (b.currency?.toUpperCase() === curr) {
              if (b.state === "PAYMENT_RELEASED") earned += b.baseAmount;
              if (b.state === "ESCROW_LOCKED" || b.state === "DELIVERABLES_PROVIDED") {
                escrowHeld += b.baseAmount;
              }
              feesPaid += b.talentFeeAmount || 0;
            }
          }
        } else {
          for (const b of user.client?.bookings || []) {
            if (b.currency?.toUpperCase() === curr) {
              const bookingTotal = b.baseAmount + (b.clientFeeAmount || 0);
              if (b.state === "PAYMENT_RELEASED") totalSpend += bookingTotal;
              if (b.state === "ESCROW_LOCKED" || b.state === "DELIVERABLES_PROVIDED") {
                escrowHeld += bookingTotal;
              }
              feesPaid += b.clientFeeAmount || 0;
            }
          }
        }

        let withdrawn = 0;
        let pendingWithdrawal = 0;
        for (const w of user.withdrawalRequests || []) {
          if (w.currency?.toUpperCase() === curr) {
            if (w.status === "COMPLETED") withdrawn += w.amount;
            if (w.status === "PENDING_OTP" || w.status === "APPROVED") pendingWithdrawal += w.amount;
          }
        }

        moneyByCurrency[curr] = {
          currency: curr,
          earned,
          escrowHeld,
          withdrawn,
          pendingWithdrawal,
          feesPaid,
          totalSpend,
        };
      }

      // Sanitized notifications: Never return payload for OTP and sign-in notice kinds
      const sanitizedNotifications = (user.notifications || []).map((n) => ({
        id: n.id,
        kind: n.kind,
        createdAt: n.createdAt.toISOString(),
        readAt: n.readAt ? n.readAt.toISOString() : null,
        isRead: n.readAt !== null,
        payload: isSensitiveNotification(n.kind) ? null : n.payload,
      }));

      // Media list with short-lived preview endpoint
      const mediaList = (user.creator?.media || []).map((m) => ({
        id: m.id,
        kind: m.kind,
        url: m.url,
        sizeBytes: m.sizeBytes,
        durationSec: m.durationSec,
        taggingStatus: m.taggingStatus,
        createdAt: m.createdAt.toISOString(),
        previewUrl: `/api/v1/admin/media/${m.id}/signed-url`,
      }));

      return reply.send({
        overview: {
          id: user.id,
          name: maskedUserName,
          email: maskedUserEmail,
          phone: maskedUserPhone,
          userType: user.userType,
          authProvider: user.authProvider,
          accountOrigin: user.accountOrigin,
          createdAt: user.createdAt.toISOString(),
          lastActiveAt: user.lastActiveAt ? user.lastActiveAt.toISOString() : null,
          suspended: Boolean(user.suspendedAt),
          suspendedAt: user.suspendedAt ? user.suspendedAt.toISOString() : null,
          suspendedReason: user.suspendedReason,
          acquisition: acquisition
            ? {
                firstSeenAt: acquisition.firstSeenAt?.toISOString() || null,
                landingPath: acquisition.landingPath,
                referrerDomain: acquisition.referrerDomain,
                utmSource: acquisition.utmSource,
                utmMedium: acquisition.utmMedium,
                utmCampaign: acquisition.utmCampaign,
                referralCodeUsed: acquisition.referralCodeUsed,
                signupCountry: acquisition.signupCountry,
                signupDeviceClass: acquisition.signupDeviceClass,
              }
            : null,
          tags: tags.map((t) => t.tag),
          notes: (user.notes || []).map((n) => ({
            id: n.id,
            adminId: n.adminId,
            body: n.body,
            createdAt: n.createdAt.toISOString(),
          })),
        },
        profile: {
          name: maskedUserName,
          userType: user.userType,
          ...(user.userType === "TALENT"
            ? {
                niche: user.creator?.niche,
                location: user.creator?.location,
                bio: user.creator?.bio,
                avatarUrl: user.creator?.avatarUrl,
                badges: {
                  celebrityBadge: user.creator?.celebrityBadge ?? false,
                },
                styleTags: user.creator?.styleTags || [],
                verification: user.creator?.verification || "UNVERIFIED",
                mediaKitMode: user.creator?.mediaKit?.mode || "AUTO",
                rateCards: (user.creator?.rateCards || []).map((rc) => ({
                  id: rc.id,
                  serviceTitle: rc.serviceTitle,
                  tier: (rc as any).tier,
                  priceAmount: (rc as any).priceAmount,
                  currency: (rc as any).currency,
                })),
                availabilitySummary: {
                  hasCalendarConnected: user.calendarConnection?.status === "CONNECTED",
                },
                media: mediaList,
                attributes: {
                  completeness: attributeCompleteness,
                  values: attributesValues,
                },
              }
            : {
                orgName: user.client?.orgName,
                orgType: user.client?.orgType,
                location: user.client?.location,
                avatarUrl: user.client?.avatarUrl,
              }),
        },
        calendar: {
          connection: {
            connected: user.calendarConnection?.status === "CONNECTED",
            provider: user.calendarConnection?.provider || null,
            connectedAt: user.calendarConnection?.connectedAt?.toISOString() || null,
          },
        },
        bookings: allUserBookings.map((b) => ({
          id: b.id,
          engagementType: b.engagementType,
          slotDate: b.slotDate.toISOString(),
          slotStart: b.slotStart,
          slotEnd: b.slotEnd,
          baseAmount: b.baseAmount,
          currency: b.currency,
          talentFeeAmount: b.talentFeeAmount,
          clientFeeAmount: b.clientFeeAmount,
          state: b.state,
          origin: b.origin,
          createdAt: b.createdAt.toISOString(),
          otherPartyName: maskName(
            user.userType === "TALENT"
              ? (b as any).client?.name || "Client"
              : (b as any).creator?.name || "Talent",
          ),
        })),
        projects:
          user.userType === "TALENT"
            ? (user.creator?.applications || []).map((app) => ({
                id: app.id,
                briefId: app.briefId,
                projectName: app.brief?.projectName,
                projectType: app.brief?.projectType,
                budgetAmount: app.brief?.budgetAmount,
                budgetCurrency: app.brief?.budgetCurrency,
                pitch: app.pitch,
                status: app.status,
                createdAt: app.createdAt.toISOString(),
              }))
            : (user.client?.briefs || []).map((br) => ({
                id: br.id,
                projectName: br.projectName,
                projectType: br.projectType,
                budgetAmount: br.budgetAmount,
                budgetCurrency: br.budgetCurrency,
                status: br.status,
                applicantCap: br.applicantCap,
                applicationsOpen: br.applicationsOpen,
                applicationCount: br._count?.applications ?? 0,
                createdAt: br.createdAt.toISOString(),
              })),
        money: {
          label: "Derived from bookings and withdrawals",
          byCurrency: moneyByCurrency,
          withdrawals: (user.withdrawalRequests || []).map((w) => ({
            id: w.id,
            amount: w.amount,
            currency: w.currency,
            bankName: w.bankName,
            accountNumber: maskAccount(w.accountNumber),
            accountName: maskName(w.accountName),
            status: w.status,
            flagged: w.flagged,
            flagReason: w.flagReason,
            createdAt: w.createdAt.toISOString(),
          })),
        },
        notifications: sanitizedNotifications,
        activity: productEvents.map((e) => ({
          id: e.id.toString(),
          occurredAt: e.occurredAt.toISOString(),
          name: e.name,
          source: e.source,
          path: e.path,
          country: e.country,
          deviceClass: e.deviceClass,
          props: e.props,
        })),
        support: {
          tickets: (user.supportTickets || []).map((t) => ({
            id: t.id,
            subject: t.subject,
            message: t.message,
            status: t.status,
            createdAt: t.createdAt.toISOString(),
          })),
        },
        auth: {
          authProvider: user.authProvider,
          supabaseUserId: user.supabaseUserId,
          activeSessionCount: user.refreshTokens.length,
          authEvents: (user.authEvents || []).map((a) => ({
            id: a.id,
            provider: a.provider,
            event: a.event,
            ipHash: a.ipHash,
            userAgent: a.userAgent,
            createdAt: a.createdAt.toISOString(),
          })),
        },
      });
    },
  );

  app.post(
    "/api/v1/admin/users/:id/reveal",
    { preHandler: [requirePermission("reveal_pii", "read")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { reason } = (request.body as { reason?: string }) || {};

      if (!reason || !reason.trim()) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "A valid non-empty reason is required for PII reveal.",
          statusCode: 400,
        });
      }

      const db = adminRoPrisma || prisma;
      const user = await db.user.findUnique({
        where: { id },
        include: {
          creator: { include: { physicalAttributes: true } },
          client: true,
        },
      });

      if (!user) {
        return reply.status(404).send({ error: "User not found." });
      }

      // Mandatory audit log entry for every PII reveal
      await audit({
        adminId: request.adminUser!.id,
        action: "PII_REVEALED",
        targetType: "User",
        targetId: id,
        reason: reason.trim(),
        ip: request.ip,
      });

      const unmaskedName = user.creator?.name || user.client?.name || "User";
      const unmaskedEmail = user.email;
      const unmaskedPhone = user.phone;

      // Attributes reveal rules:
      // SUPER_ADMIN and OPS can see SEARCHABLE attributes after reveal with reason.
      // PRIVATE attributes are NEVER returned under any circumstances.
      const adminRole = request.adminUser!.role;
      const canSeeSearchable = adminRole === "SUPER_ADMIN" || adminRole === "OPS";

      const phys = user.creator?.physicalAttributes;
      const visMap = (phys?.visibility as VisibilityMap) || {};
      const revealedAttributes: Record<string, { value: string | null; visibility: string }> = {};

      if (phys) {
        for (const field of [...ATTRIBUTE_FIELD_NAMES, "distinctiveFeatures" as const]) {
          const val = (phys as any)[field] ?? null;
          const visibility = visMap[field as AttributeFieldName] || "SEARCHABLE";

          if (visibility === "PRIVATE") {
            // Strictly forbidden: PRIVATE attributes are never returned
            revealedAttributes[field] = { value: null, visibility: "PRIVATE" };
          } else if (visibility === "SEARCHABLE") {
            revealedAttributes[field] = {
              value: canSeeSearchable ? val : null,
              visibility: "SEARCHABLE",
            };
          } else {
            // PUBLIC
            revealedAttributes[field] = { value: val, visibility: "PUBLIC" };
          }
        }
      }

      return reply.send({
        unmaskedName,
        unmaskedEmail,
        unmaskedPhone,
        attributes: revealedAttributes,
        revealedAt: new Date().toISOString(),
      });
    },
  );

  app.post(
    "/api/v1/admin/users/:id/notes",
    { preHandler: [requirePermission("user_actions", "write")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { body } = (request.body as { body?: string }) || {};

      if (!body || !body.trim()) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Note body cannot be empty.",
          statusCode: 400,
        });
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return reply.status(404).send({ error: "User not found." });
      }

      const note = await prisma.userNote.create({
        data: {
          userId: id,
          adminId: request.adminUser!.id,
          body: body.trim(),
        },
      });

      await audit({
        adminId: request.adminUser!.id,
        action: "USER_NOTE_ADDED",
        targetType: "User",
        targetId: id,
        reason: body.trim().slice(0, 100),
        ip: request.ip,
      });

      return reply.status(201).send({
        note: {
          id: note.id,
          userId: note.userId,
          adminId: note.adminId,
          body: note.body,
          createdAt: note.createdAt.toISOString(),
        },
      });
    },
  );

  app.post(
    "/api/v1/admin/users/:id/suspend",
    { preHandler: [requirePermission("user_actions", "write")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { reason } = (request.body as { reason?: string }) || {};

      if (!reason || !reason.trim()) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "A valid non-empty reason is required to suspend a user.",
          statusCode: 400,
        });
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return reply.status(404).send({ error: "User not found." });
      }

      await prisma.user.update({
        where: { id },
        data: {
          suspendedAt: new Date(),
          suspendedReason: reason.trim(),
        },
      });

      // Revoke all active sessions on suspension
      const revokedCount = await revokeAllUserSessions(id);

      await audit({
        adminId: request.adminUser!.id,
        action: "USER_SUSPENDED",
        targetType: "User",
        targetId: id,
        reason: reason.trim(),
        metadata: { revokedCount },
        ip: request.ip,
      });

      return reply.send({
        success: true,
        message: "User suspended and all active sessions revoked.",
        revokedCount,
      });
    },
  );

  app.post(
    "/api/v1/admin/users/:id/unsuspend",
    { preHandler: [requirePermission("user_actions", "write")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { reason } = (request.body as { reason?: string }) || {};

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return reply.status(404).send({ error: "User not found." });
      }

      await prisma.user.update({
        where: { id },
        data: {
          suspendedAt: null,
          suspendedReason: null,
        },
      });

      await audit({
        adminId: request.adminUser!.id,
        action: "USER_UNSUSPENDED",
        targetType: "User",
        targetId: id,
        reason: reason?.trim() || "Unsuspended by admin",
        ip: request.ip,
      });

      return reply.send({
        success: true,
        message: "User unsuspended successfully.",
      });
    },
  );

  app.post(
    "/api/v1/admin/users/:id/revoke-sessions",
    { preHandler: [requirePermission("user_actions", "write")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return reply.status(404).send({ error: "User not found." });
      }

      const revokedCount = await revokeAllUserSessions(id);

      await audit({
        adminId: request.adminUser!.id,
        action: "USER_SESSIONS_REVOKED",
        targetType: "User",
        targetId: id,
        metadata: { revokedCount },
        ip: request.ip,
      });

      return reply.send({
        success: true,
        revokedCount,
        message: `Revoked ${revokedCount} active session(s).`,
      });
    },
  );

  app.post(
    "/api/v1/admin/users/:id/resend-verification",
    { preHandler: [requirePermission("user_actions", "write")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return reply.status(404).send({ error: "User not found." });
      }

      if (user.emailVerified) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "User email is already verified.",
          statusCode: 400,
        });
      }

      const verifyToken = randomUUID();
      await cacheProvider.set(`auth:verify:${verifyToken}`, user.id, 24 * 60 * 60);
      await notifyProvider.email(user.email, "verify_email", { token: verifyToken });

      await audit({
        adminId: request.adminUser!.id,
        action: "USER_VERIFICATION_RESENT",
        targetType: "User",
        targetId: id,
        ip: request.ip,
      });

      return reply.send({
        success: true,
        message: "Verification email resent successfully.",
      });
    },
  );

  app.post(
    "/api/v1/admin/users/:id/tickets",
    { preHandler: [requirePermission("tickets", "write")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { subject, message } = (request.body as { subject?: string; message?: string }) || {};

      if (!subject || !subject.trim() || !message || !message.trim()) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Subject and message are required to create a ticket.",
          statusCode: 400,
        });
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return reply.status(404).send({ error: "User not found." });
      }

      const ticket = await prisma.supportTicket.create({
        data: {
          userId: id,
          subject: subject.trim(),
          message: message.trim(),
          status: "OPEN",
        },
      });

      await audit({
        adminId: request.adminUser!.id,
        action: "TICKET_CREATED_ON_BEHALF",
        targetType: "SupportTicket",
        targetId: ticket.id,
        reason: `Created on behalf of user ${id}: ${subject.trim()}`,
        ip: request.ip,
      });

      return reply.status(201).send({
        ticket: {
          id: ticket.id,
          userId: ticket.userId,
          subject: ticket.subject,
          message: ticket.message,
          status: ticket.status,
          createdAt: ticket.createdAt.toISOString(),
        },
      });
    },
  );

  app.post(
    "/api/v1/admin/users/tags",
    { preHandler: [requirePermission("user_actions", "write")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userIds, tag, action } =
        (request.body as {
          userIds?: string[];
          tag?: string;
          action?: "ADD" | "REMOVE";
        }) || {};

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "A non-empty userIds array is required.",
          statusCode: 400,
        });
      }

      if (!tag || !tag.trim()) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "A non-empty tag is required.",
          statusCode: 400,
        });
      }

      if (action !== "ADD" && action !== "REMOVE") {
        return reply.status(400).send({
          error: "Bad Request",
          message: 'Action must be either "ADD" or "REMOVE".',
          statusCode: 400,
        });
      }

      const cleanTag = tag.trim();

      if (action === "ADD") {
        for (const uid of userIds) {
          await prisma.userTag.upsert({
            where: { userId_tag: { userId: uid, tag: cleanTag } },
            create: {
              userId: uid,
              tag: cleanTag,
              createdById: request.adminUser!.id,
            },
            update: {},
          });
        }

        await audit({
          adminId: request.adminUser!.id,
          action: "USER_TAG_BULK_APPLIED",
          targetType: "UserTag",
          targetId: cleanTag,
          reason: `Bulk applied tag "${cleanTag}" to ${userIds.length} users.`,
          metadata: { userIds, count: userIds.length },
          ip: request.ip,
        });
      } else {
        const deleted = await prisma.userTag.deleteMany({
          where: {
            tag: cleanTag,
            userId: { in: userIds },
          },
        });

        await audit({
          adminId: request.adminUser!.id,
          action: "USER_TAG_BULK_REMOVED",
          targetType: "UserTag",
          targetId: cleanTag,
          reason: `Bulk removed tag "${cleanTag}" from ${userIds.length} users.`,
          metadata: { userIds, count: deleted.count },
          ip: request.ip,
        });
      }

      return reply.send({
        success: true,
        count: userIds.length,
        action,
        tag: cleanTag,
      });
    },
  );

  // ── Media Previews (Signed URLs) ──────────────────────────────────────────
  const handleMediaSignedUrl = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const media = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!media) {
      return reply.status(404).send({ error: "Media asset not found." });
    }

    // Audited as MEDIA_VIEWED (PRD M3.2 / AC3 / Phase A5 item 4)
    await audit({
      adminId: request.adminUser!.id,
      action: "MEDIA_VIEWED",
      targetType: "MediaAsset",
      targetId: id,
      ip: request.ip,
    });

    // 5-minute signed URL
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const signature = createHmac("sha256", env.JWT_ACCESS_SECRET)
      .update(`${media.id}:${expiresAt}`)
      .digest("hex");
    const signedUrl = `${media.url}?exp=${encodeURIComponent(expiresAt)}&sig=${signature}`;

    return reply.send({
      id: media.id,
      kind: media.kind,
      signedUrl,
      expiresAt,
    });
  };

  app.get(
    "/api/v1/admin/media/:id/signed-url",
    { preHandler: [requirePermission("users", "read")] },
    handleMediaSignedUrl,
  );

  app.post(
    "/api/v1/admin/media/:id/signed-url",
    { preHandler: [requirePermission("users", "read")] },
    handleMediaSignedUrl,
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
