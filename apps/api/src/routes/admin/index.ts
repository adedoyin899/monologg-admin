import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { AdminRole, UserType, BookingState } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { adminRoPrisma, getMaterializedViewLastRefreshed } from "../../db/adminRoClient.js";
import { env } from "../../config/env.js";
import { requireAdmin, requirePermission } from "../../middlewares/adminAuth.js";
import { getRolePermissions } from "../../config/adminPermissions.js";
import { audit } from "../../services/adminAudit.js";
import { kpiService, type KpiFilterOptions } from "../../admin/kpi/index.js";
import { maskEmail, maskName } from "../../lib/masking.js";

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
