/**
 * Monologg Operations Admin Demo Dataset
 *
 * Strictly typed against every AdminClient response interface so that all 32
 * Admin screens (AD-01 to AD-32), tabs, filters, and detail views render cleanly
 * without missing properties or runtime exceptions.
 */

import type {
  AcquisitionData,
  AdminAuditListResponse,
  AdminExportListResponse,
  AdminMeResponse,
  AdminRole,
  AdminSessionInfo,
  AdminUser,
  AlertListResponse,
  BookingDetailResponse,
  BookingListResponse,
  CannedReplyItem,
  DisputeChatReviewResponse,
  DisputeDetailResponse,
  DisputeListResponse,
  EarningsResponse,
  FeatureAdoptionData,
  FeedResponse,
  FinanceSummaryResponse,
  FunnelData,
  MarketplaceHealthData,
  OverviewResponse,
  PaymentDetailResponse,
  PaymentListResponse,
  PlatformSettingsResponse,
  RetentionData,
  SystemHealthResponse,
  TicketDetailResponse,
  TicketListResponse,
  TrafficData,
  User360Response,
  UserListItem,
  UserListResponse,
  UserRevealResponse,
  VerificationDetailResponse,
  VerificationMetricsResponse,
  VerificationQueueResponse,
  WithdrawalListResponse,
} from "./admin-client";

const BASE_USERS: UserListItem[] = [
  {
    id: "usr_creator_01",
    name: "Tunde Kelani",
    email: "tunde.kelani@example.com",
    maskedEmail: "t***i@example.com",
    phone: "+234 803 *** 8912",
    type: "TALENT",
    userType: "TALENT",
    authProvider: "SUPABASE",
    accountOrigin: "ORGANIC",
    signedUp: "2026-02-14T10:00:00.000Z",
    createdAt: "2026-02-14T10:00:00.000Z",
    lastActive: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    country: "NG",
    source: "DIRECT",
    verification: "VERIFIED",
    bookings: 18,
    tags: ["alpha-talent", "top-rated", "voiceover"],
    suspended: false,
    suspendedAt: null,
    suspendedReason: null,
  },
  {
    id: "usr_creator_02",
    name: "Amina Yusuf",
    email: "amina.yusuf@example.com",
    maskedEmail: "a***f@example.com",
    phone: "+234 812 *** 3341",
    type: "TALENT",
    userType: "TALENT",
    authProvider: "SUPABASE",
    accountOrigin: "INSTAGRAM",
    signedUp: "2026-03-01T14:20:00.000Z",
    createdAt: "2026-03-01T14:20:00.000Z",
    lastActive: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    country: "NG",
    source: "INSTAGRAM",
    verification: "VERIFIED",
    bookings: 12,
    tags: ["comedy", "creator"],
    suspended: false,
    suspendedAt: null,
    suspendedReason: null,
  },
  {
    id: "usr_creator_03",
    name: "David Oyelowo",
    email: "david.oyelowo@example.com",
    maskedEmail: "d***o@example.com",
    phone: "+44 7700 *** 912",
    type: "TALENT",
    userType: "TALENT",
    authProvider: "GOOGLE",
    accountOrigin: "TWITTER",
    signedUp: "2026-04-10T12:00:00.000Z",
    createdAt: "2026-04-10T12:00:00.000Z",
    lastActive: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    country: "GB",
    source: "TWITTER",
    verification: "IN_REVIEW",
    bookings: 8,
    tags: ["actor", "speaker"],
    suspended: false,
    suspendedAt: null,
    suspendedReason: null,
  },
  {
    id: "usr_client_01",
    name: "Flutterwave Marketing",
    email: "marketing@flutterwave.example.com",
    maskedEmail: "m***g@flutterwave.example.com",
    phone: "+234 809 *** 4400",
    type: "CLIENT",
    userType: "CLIENT",
    authProvider: "SUPABASE",
    accountOrigin: "DIRECT",
    signedUp: "2026-01-20T08:00:00.000Z",
    createdAt: "2026-01-20T08:00:00.000Z",
    lastActive: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    country: "NG",
    source: "DIRECT",
    verification: "UNVERIFIED",
    bookings: 24,
    tags: ["enterprise-client", "tier-1"],
    suspended: false,
    suspendedAt: null,
    suspendedReason: null,
  },
  {
    id: "usr_client_02",
    name: "Netflix EMEA Talent Acquisition",
    email: "emea-talent@netflix.example.com",
    maskedEmail: "e***t@netflix.example.com",
    phone: "+44 20 7946 *** 01",
    type: "CLIENT",
    userType: "CLIENT",
    authProvider: "GOOGLE",
    accountOrigin: "REFERRAL",
    signedUp: "2026-02-18T16:30:00.000Z",
    createdAt: "2026-02-18T16:30:00.000Z",
    lastActive: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    country: "GB",
    source: "REFERRAL",
    verification: "UNVERIFIED",
    bookings: 15,
    tags: ["streaming", "vip"],
    suspended: false,
    suspendedAt: null,
    suspendedReason: null,
  },
];

function parseQuery(path: string): { cleanPath: string; params: URLSearchParams } {
  const [rawPath, qs] = path.split("?");
  const cleanPath = rawPath.replace(/\/$/, "") || "/";
  return { cleanPath, params: new URLSearchParams(qs || "") };
}

export function getMockResponse<T>(path: string, options: RequestInit = {}, token: string | null = null): T {
  const { cleanPath, params } = parseQuery(path);
  const method = (options.method || "GET").toUpperCase();

  let role: AdminRole = "SUPER_ADMIN";
  let email = "superadmin@monologg.com";
  if (token) {
    if (token.includes("ops")) {
      role = "OPS";
      email = "ops@monologg.com";
    } else if (token.includes("support")) {
      role = "SUPPORT";
      email = "support@monologg.com";
    } else if (token.includes("finance")) {
      role = "FINANCE";
      email = "finance@monologg.com";
    } else if (token.includes("compliance")) {
      role = "COMPLIANCE";
      email = "compliance@monologg.com";
    } else if (token.includes("viewer")) {
      role = "VIEWER";
      email = "viewer@monologg.com";
    }
  }

  // 1. Auth / Me
  if (cleanPath === "/api/v1/admin/me") {
    const res: AdminMeResponse = {
      admin: {
        id: "adm_demo_01",
        email,
        role,
        status: "ACTIVE",
        authProvider: "SUPABASE",
        lastLoginAt: new Date().toISOString(),
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      permissions: {
        overview: { read: true, write: role === "SUPER_ADMIN" },
        users: { read: true, write: ["SUPER_ADMIN", "OPS"].includes(role) },
        reveal_pii: { read: ["SUPER_ADMIN", "COMPLIANCE"].includes(role), write: true },
        user_actions: { read: true, write: ["SUPER_ADMIN", "OPS"].includes(role) },
        bookings: { read: true, write: ["SUPER_ADMIN", "OPS"].includes(role) },
        chat: { read: ["SUPER_ADMIN", "SUPPORT", "OPS"].includes(role), write: true },
        payments: { read: true, write: ["SUPER_ADMIN", "FINANCE"].includes(role) },
        withdrawals: { read: true, write: ["SUPER_ADMIN", "FINANCE"].includes(role) },
        tickets: { read: true, write: ["SUPER_ADMIN", "SUPPORT"].includes(role) },
        disputes: { read: true, write: ["SUPER_ADMIN", "SUPPORT"].includes(role) },
        disputes_resolve: { read: true, write: ["SUPER_ADMIN", "SUPPORT"].includes(role) },
        verifications: { read: true, write: ["SUPER_ADMIN", "COMPLIANCE"].includes(role) },
        alerts: { read: true, write: ["SUPER_ADMIN", "OPS"].includes(role) },
        system_health: { read: true, write: role === "SUPER_ADMIN" },
        audit_log: { read: ["SUPER_ADMIN", "COMPLIANCE"].includes(role), write: false },
        admin_users: { read: role === "SUPER_ADMIN", write: role === "SUPER_ADMIN" },
        exports: { read: true, write: true },
      },
      session: {
        id: "ses_demo_current",
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      },
      env: {
        environment: "preview",
        paymentsMode: "TEST",
      },
    };
    return res as unknown as T;
  }

  // 2. Overview (AD-01)
  if (cleanPath === "/api/v1/admin/overview") {
    const res: OverviewResponse = {
      period: {
        from: "2026-10-13T00:00:00.000Z",
        to: "2026-11-12T23:59:59.000Z",
        previousFrom: "2026-09-13T00:00:00.000Z",
        previousTo: "2026-10-12T23:59:59.000Z",
      },
      cards: {
        signups: { total: 10482, talent: 3120, client: 7362, change: 14.8 },
        activeUsers: { dau: 1840, wau: 5620, mau: 8940 },
        talentActivated: { total: 2410, change: 12.3 },
        clientActivated: { total: 4890, change: 18.5 },
        bookingsCreated: { total: 420, change: 24.1 },
        escrowLocked: { byCurrency: { NGN: 18400000, USD: 24500, GBP: 14200 }, change: 9.6 },
        money: {
          byCurrency: [
            {
              currency: "NGN",
              gmv: 148250000,
              escrowHeld: 18400000,
              released: 124500000,
              platformRevenue: 22237500,
              talentEarned: 102262500,
              talentAvailable: 14800000,
              takeRate: 15.0,
            },
            {
              currency: "USD",
              gmv: 185000,
              escrowHeld: 24500,
              released: 155000,
              platformRevenue: 27750,
              talentEarned: 127250,
              talentAvailable: 19500,
              takeRate: 15.0,
            },
            {
              currency: "GBP",
              gmv: 96000,
              escrowHeld: 14200,
              released: 78000,
              platformRevenue: 14400,
              talentEarned: 63600,
              talentAvailable: 8400,
              takeRate: 15.0,
            },
          ],
        },
        openTickets: { total: 4 },
        openDisputes: { total: 2 },
        criticalAlerts: { total: 1 },
      },
      charts: {
        signupsByDay: [
          { date: "2026-11-06", talent: 42, client: 88, total: 130 },
          { date: "2026-11-07", talent: 48, client: 95, total: 143 },
          { date: "2026-11-08", talent: 39, client: 81, total: 120 },
          { date: "2026-11-09", talent: 55, client: 110, total: 165 },
          { date: "2026-11-10", talent: 62, client: 125, total: 187 },
          { date: "2026-11-11", talent: 58, client: 119, total: 177 },
          { date: "2026-11-12", talent: 66, client: 134, total: 200 },
        ],
        bookingsByState: [
          { state: "ESCROW_LOCKED", count: 42 },
          { state: "DELIVERABLES_PROVIDED", count: 28 },
          { state: "PAYMENT_RELEASED", count: 320 },
          { state: "CANCELLED", count: 18 },
          { state: "DISPUTED", count: 4 },
        ],
        gmvByDay: [
          { date: "2026-11-06", amountsByCurrency: { NGN: 4800000, USD: 1200, GBP: 800 } },
          { date: "2026-11-07", amountsByCurrency: { NGN: 5600000, USD: 2100, GBP: 950 } },
          { date: "2026-11-08", amountsByCurrency: { NGN: 3900000, USD: 850, GBP: 600 } },
          { date: "2026-11-09", amountsByCurrency: { NGN: 6800000, USD: 3200, GBP: 1400 } },
          { date: "2026-11-10", amountsByCurrency: { NGN: 8100000, USD: 4100, GBP: 1800 } },
          { date: "2026-11-11", amountsByCurrency: { NGN: 7400000, USD: 3600, GBP: 1550 } },
          { date: "2026-11-12", amountsByCurrency: { NGN: 9200000, USD: 4800, GBP: 2200 } },
        ],
        activationFunnel: {
          talent: [
            { stage: "Signed Up", count: 3120, conversion: 100 },
            { stage: "Profile Complete", count: 2840, conversion: 91.0 },
            { stage: "Media Kit Published", count: 2510, conversion: 80.4 },
            { stage: "First Booking", count: 1680, conversion: 53.8 },
          ],
          client: [
            { stage: "Signed Up", count: 7362, conversion: 100 },
            { stage: "Searched Roster", count: 6180, conversion: 83.9 },
            { stage: "Initiated Brief", count: 4240, conversion: 57.5 },
            { stage: "Escrow Deposited", count: 3190, conversion: 43.3 },
          ],
        },
      },
      freshness: {
        lastRefreshedAt: new Date().toISOString(),
        isStale: false,
        stalenessMinutes: 0,
        paymentsMode: "TEST",
        environment: "preview",
      },
      criticalAlerts: [
        {
          id: "alt_01",
          ruleKey: "payout_mismatch_detected",
          message: "Daily escrow reconciliation variance detected on batch #492 (₦12,500 delta).",
          severity: "CRITICAL",
          lastSeenAt: new Date().toISOString(),
        },
      ],
    };
    return res as unknown as T;
  }

  // 3. Live Feed (AD-02)
  if (cleanPath === "/api/v1/admin/feed") {
    const groupFilter = params.get("eventGroup");
    const userTypeFilter = params.get("userType");
    const allEvents: FeedResponse["events"] = [
      {
        id: "evt_01",
        name: "booking_created",
        eventGroup: "bookings",
        occurredAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
        actorLabel: "Flutterwave Marketing",
        userType: "CLIENT",
        country: "NG",
        targetType: "booking",
        targetId: "bk_01",
        targetUrl: "/bookings/bk_01",
        description: "Created booking 'Voiceover Brand Campaign Q4' with Tunde Kelani (₦1,200,000)",
        props: { amount: 1200000, currency: "NGN" },
      },
      {
        id: "evt_02",
        name: "payment_succeeded",
        eventGroup: "payments",
        occurredAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        actorLabel: "Netflix EMEA",
        userType: "CLIENT",
        country: "GB",
        targetType: "booking",
        targetId: "bk_02",
        targetUrl: "/payments/tx_02",
        description: "Escrow lock of £3,500 succeeded via Stripe",
        props: { amount: 3500, currency: "GBP", provider: "STRIPE" },
      },
      {
        id: "evt_03",
        name: "verification_submitted",
        eventGroup: "verification",
        occurredAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        actorLabel: "David Oyelowo",
        userType: "TALENT",
        country: "GB",
        targetType: "user",
        targetId: "usr_creator_03",
        targetUrl: "/verifications/rec_01",
        description: "Submitted waist-up verification recording (42s duration)",
        props: { durationSec: 42 },
      },
      {
        id: "evt_04",
        name: "deliverable_submitted",
        eventGroup: "bookings",
        occurredAt: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
        actorLabel: "Amina Yusuf",
        userType: "TALENT",
        country: "NG",
        targetType: "booking",
        targetId: "bk_03",
        targetUrl: "/bookings/bk_03",
        description: "Submitted Master Audio Wave deliverables for client review",
        props: {},
      },
      {
        id: "evt_05",
        name: "ticket_opened",
        eventGroup: "support",
        occurredAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
        actorLabel: "Tunde Kelani",
        userType: "TALENT",
        country: "NG",
        targetType: "ticket",
        targetId: "tkt_01",
        targetUrl: "/tickets/tkt_01",
        description: "Opened high-priority ticket regarding multi-currency payout timing",
        props: { priority: "HIGH" },
      },
    ];
    const filtered = allEvents.filter((e) => {
      if (groupFilter && groupFilter !== "all" && e.eventGroup !== groupFilter) return false;
      if (userTypeFilter && userTypeFilter !== "ALL" && e.userType !== userTypeFilter) return false;
      return true;
    });
    const res: FeedResponse = {
      events: filtered,
      nextCursor: null,
      hasMore: false,
      polledAt: new Date().toISOString(),
    };
    return res as unknown as T;
  }

  // 4. Users Directory (AD-03)
  if (cleanPath === "/api/v1/admin/users") {
    const search = (params.get("search") || "").toLowerCase();
    const userType = params.get("userType");
    const verification = params.get("verification");
    const filtered = BASE_USERS.filter((u) => {
      if (userType && userType !== "ALL" && u.userType !== userType) return false;
      if (verification && verification !== "ALL" && u.verification !== verification) return false;
      if (search && !u.name.toLowerCase().includes(search) && !u.email.toLowerCase().includes(search)) return false;
      return true;
    });
    const res: UserListResponse = {
      users: filtered,
      nextCursor: null,
      hasMore: false,
      totalCount: filtered.length,
    };
    return res as unknown as T;
  }

  // 5. User Reveal PII
  if (cleanPath.match(/^\/api\/v1\/admin\/users\/[^/]+\/reveal$/)) {
    const userId = cleanPath.split("/")[5];
    const found = BASE_USERS.find((u) => u.id === userId) || BASE_USERS[0];
    const res: UserRevealResponse = {
      unmaskedName: found.name,
      unmaskedEmail: found.email,
      unmaskedPhone: found.phone.replace("***", "429"),
      attributes: {
        gender: { value: "Male", visibility: "PUBLIC" },
        accent: { value: "West African / British", visibility: "SEARCHABLE" },
      },
      revealedAt: new Date().toISOString(),
    };
    return res as unknown as T;
  }

  // 6. User Note
  if (cleanPath.match(/^\/api\/v1\/admin\/users\/[^/]+\/notes$/) && method === "POST") {
    let body = "Admin note added";
    try {
      body = JSON.parse((options.body as string) || "{}").body || body;
    } catch {}
    return {
      note: {
        id: `note_${Date.now()}`,
        adminId: "adm_demo_01",
        body,
        createdAt: new Date().toISOString(),
      },
    } as unknown as T;
  }

  // 7. User 360 View (AD-04 to AD-08)
  if (cleanPath.match(/^\/api\/v1\/admin\/users\/[^/]+$/)) {
    const userId = cleanPath.split("/")[5];
    const found = BASE_USERS.find((u) => u.id === userId) || BASE_USERS[0];
    const isClient = found.userType === "CLIENT";
    const res: User360Response = {
      overview: {
        id: found.id,
        name: found.name,
        email: found.maskedEmail,
        phone: found.phone,
        userType: found.userType,
        authProvider: found.authProvider,
        accountOrigin: found.accountOrigin,
        createdAt: found.createdAt,
        lastActiveAt: found.lastActiveAt,
        suspended: found.suspended,
        suspendedAt: found.suspendedAt,
        suspendedReason: found.suspendedReason,
        acquisition: {
          firstSeenAt: found.createdAt,
          landingPath: "/roster",
          referrerDomain: "twitter.com",
          utmSource: found.source.toLowerCase(),
          utmMedium: "social",
          utmCampaign: "alpha_launch",
          referralCodeUsed: isClient ? null : "MONOLOGG_VIP",
          signupCountry: found.country,
          signupDeviceClass: "DESKTOP",
        },
        tags: found.tags,
        notes: [
          {
            id: "note_01",
            adminId: "ops@monologg.com",
            body: "Active alpha cohort participant with strong completion history.",
            createdAt: "2026-10-15T14:35:00.000Z",
          },
        ],
      },
      profile: {
        name: found.name,
        userType: found.userType,
        niche: isClient ? undefined : "VO_ARTIST",
        location: found.country === "GB" ? "London, UK" : "Lagos, Nigeria",
        bio: isClient
          ? "Enterprise creative production & digital commercial campaigns."
          : "Award-winning voiceover artist, actor, and live event compere.",
        avatarUrl: null,
        badges: { celebrityBadge: !isClient },
        styleTags: isClient ? ["Commercial", "Brand"] : ["Warm", "Authoritative", "Bilingual"],
        verification: found.verification,
        mediaKitMode: "PUBLIC",
        rateCards: isClient
          ? []
          : [
              { id: "rc_01", serviceTitle: "60s Commercial Voiceover", tier: "PRO", priceAmount: 350000, currency: "NGN" },
              { id: "rc_02", serviceTitle: "Documentary Narration (15m)", tier: "STUDIO", priceAmount: 1200000, currency: "NGN" },
            ],
        availabilitySummary: { hasCalendarConnected: !isClient },
        media: isClient
          ? []
          : [
              {
                id: "med_01",
                kind: "VIDEO",
                url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                sizeBytes: 12450000,
                durationSec: 45,
                taggingStatus: "TAGGED",
                createdAt: "2026-09-10T12:00:00.000Z",
                previewUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
              },
            ],
        attributes: {
          completeness: { filled: 8, total: 10, percentage: 80 },
          values: {
            accent: { value: "Masked (Reveal PII to view)", visibility: "SEARCHABLE" },
            language: { value: "Masked (Reveal PII to view)", visibility: "PUBLIC" },
          },
        },
        orgName: isClient ? found.name : null,
        orgType: isClient ? "AGENCY" : null,
      },
      calendar: {
        connection: {
          connected: !isClient,
          provider: isClient ? null : "GOOGLE",
          connectedAt: isClient ? null : "2026-03-02T09:00:00.000Z",
        },
      },
      bookings: [
        {
          id: "bk_01",
          engagementType: "VOICEOVER",
          slotDate: "2026-11-15",
          slotStart: "10:00",
          slotEnd: "12:00",
          baseAmount: 1200000,
          currency: "NGN",
          talentFeeAmount: 132000,
          clientFeeAmount: 180000,
          state: "ESCROW_LOCKED",
          origin: "DIRECT",
          createdAt: "2026-11-01T10:00:00.000Z",
          otherPartyName: isClient ? "Tunde Kelani" : "Flutterwave Marketing",
        },
      ],
      projects: [
        {
          id: "prj_01",
          briefId: "brf_01",
          projectName: "Q4 Fintech Brand Anthem",
          projectType: "VOICEOVER",
          budgetAmount: 1200000,
          budgetCurrency: "NGN",
          pitch: "Seeking warm Pan-African narration for TV & YouTube launch.",
          status: "ACTIVE",
          applicantCap: 15,
          applicationsOpen: true,
          applicationCount: 9,
          createdAt: "2026-11-01T08:00:00.000Z",
        },
      ],
      money: {
        label: isClient ? "Client Spend Summary" : "Talent Earnings Summary",
        byCurrency: {
          NGN: {
            currency: "NGN",
            earned: isClient ? 0 : 18450000,
            escrowHeld: 1200000,
            withdrawn: isClient ? 0 : 12882000,
            pendingWithdrawal: isClient ? 0 : 450000,
            feesPaid: isClient ? 2130000 : 2029500,
            totalSpend: isClient ? 14200000 : 0,
          },
        },
        withdrawals: isClient
          ? []
          : [
              {
                id: "wth_01",
                amount: 450000,
                currency: "NGN",
                bankName: "Access Bank Nigeria",
                accountNumber: "****8912",
                accountName: found.name,
                status: "PENDING",
                flagged: false,
                flagReason: null,
                createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
              },
            ],
      },
      notifications: [
        {
          id: "ntf_01",
          kind: "BOOKING_CONFIRMED",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
          readAt: null,
          isRead: false,
          payload: { bookingId: "bk_01" },
        },
      ],
      activity: [
        {
          id: "act_01",
          occurredAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
          name: "page_viewed",
          source: "WEB",
          path: "/dashboard",
          country: found.country,
          deviceClass: "DESKTOP",
          props: {},
        },
      ],
      support: {
        tickets: [
          {
            id: "tkt_01",
            subject: "Inquiry regarding multi-currency payout processing time",
            message: "Hello Support Team, I initiated a withdrawal to my NGN account this morning.",
            status: "OPEN",
            createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
          },
        ],
      },
      auth: {
        authProvider: found.authProvider,
        supabaseUserId: `sb_${found.id}`,
        activeSessionCount: 2,
        authEvents: [
          {
            id: "authevt_01",
            provider: found.authProvider,
            event: "LOGIN_SUCCESS",
            ipHash: "a8f5f167f44f4964",
            userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
            createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          },
        ],
      },
    };
    return res as unknown as T;
  }

  // 8. Bookings List (AD-09)
  if (cleanPath === "/api/v1/admin/bookings") {
    const state = params.get("state");
    const currency = params.get("currency");
    const stuck = params.get("stuck");
    const hasDispute = params.get("hasDispute");
    const search = (params.get("search") || "").toLowerCase();

    const allBookings: BookingListResponse["bookings"] = [
      {
        id: "bk_01",
        state: "ESCROW_LOCKED",
        origin: "DIRECT",
        currency: "NGN",
        baseAmount: 1200000,
        clientFeeAmount: 180000,
        talentFeeAmount: 132000,
        clientTotal: 1380000,
        talentNet: 1068000,
        slotDate: "2026-11-15",
        slotStart: "10:00",
        slotEnd: "12:00",
        engagementType: "VOICEOVER",
        recurrence: null,
        meetUrl: "https://meet.monologg.com/ord-0042",
        contextNote: "60s Broadcast Commercial Voiceover Q4",
        slotHoldExpiresAt: null,
        createdAt: "2026-11-01T10:00:00.000Z",
        talent: {
          id: "cr_01",
          userId: "usr_creator_01",
          name: "Tunde Kelani",
          niche: "VO_ARTIST",
          avatarUrl: null,
          referralCode: "TUNDE_VO",
        },
        client: {
          id: "cl_01",
          userId: "usr_client_01",
          name: "Flutterwave Marketing",
          orgName: "Flutterwave",
          avatarUrl: null,
        },
        service: { id: "svc_01", title: "Voiceover Brand Campaign Q4" },
        payment: {
          id: "tx_01",
          status: "SUCCESS",
          provider: "PAYSTACK",
          providerRef: "PSK_9812390",
          escrowHeld: true,
          amount: 1380000,
        },
        ageInState: { ms: 86400000, seconds: 86400, human: "1d 0h" },
        isStuck: false,
        stuckReason: null,
        hasDispute: false,
      },
      {
        id: "bk_02",
        state: "DELIVERABLES_PROVIDED",
        origin: "MARKETPLACE",
        currency: "GBP",
        baseAmount: 3500,
        clientFeeAmount: 525,
        talentFeeAmount: 385,
        clientTotal: 4025,
        talentNet: 3115,
        slotDate: "2026-11-10",
        slotStart: "14:00",
        slotEnd: "17:00",
        engagementType: "NARRATION",
        recurrence: null,
        meetUrl: null,
        contextNote: "Series Narration Pilot",
        slotHoldExpiresAt: null,
        createdAt: "2026-10-28T09:00:00.000Z",
        talent: {
          id: "cr_03",
          userId: "usr_creator_03",
          name: "David Oyelowo",
          niche: "ACTOR",
          avatarUrl: null,
          referralCode: null,
        },
        client: {
          id: "cl_02",
          userId: "usr_client_02",
          name: "Netflix EMEA",
          orgName: "Netflix EMEA",
          avatarUrl: null,
        },
        service: { id: "svc_02", title: "Series Narration Pilot" },
        payment: {
          id: "tx_02",
          status: "SUCCESS",
          provider: "STRIPE",
          providerRef: "pi_3Qx8L92",
          escrowHeld: true,
          amount: 4025,
        },
        ageInState: { ms: 201600000, seconds: 201600, human: "2d 8h" },
        isStuck: true,
        stuckReason: "Awaiting client approval > 48h (active dispute opened)",
        hasDispute: true,
      },
      {
        id: "bk_03",
        state: "PAYMENT_RELEASED",
        origin: "DIRECT",
        currency: "NGN",
        baseAmount: 650000,
        clientFeeAmount: 97500,
        talentFeeAmount: 71500,
        clientTotal: 747500,
        talentNet: 578500,
        slotDate: "2026-10-22",
        slotStart: "11:00",
        slotEnd: "13:00",
        engagementType: "CONTENT_CREATION",
        recurrence: null,
        meetUrl: null,
        contextNote: "Social Comedy Reel Promo",
        slotHoldExpiresAt: null,
        createdAt: "2026-10-15T11:20:00.000Z",
        talent: {
          id: "cr_02",
          userId: "usr_creator_02",
          name: "Amina Yusuf",
          niche: "COMEDIAN",
          avatarUrl: null,
          referralCode: "AMINA_FUN",
        },
        client: {
          id: "cl_03",
          userId: "usr_client_01",
          name: "MTN Digital",
          orgName: "MTN Nigeria",
          avatarUrl: null,
        },
        service: { id: "svc_03", title: "Social Comedy Reel Promo" },
        payment: {
          id: "tx_03",
          status: "SUCCESS",
          provider: "PAYSTACK",
          providerRef: "PSK_7721104",
          escrowHeld: false,
          amount: 747500,
        },
        ageInState: { ms: 1641600000, seconds: 1641600, human: "19d" },
        isStuck: false,
        stuckReason: null,
        hasDispute: false,
      },
    ];

    const filtered = allBookings.filter((b) => {
      if (state && state !== "ALL" && b.state !== state) return false;
      if (currency && currency !== "ALL" && b.currency !== currency) return false;
      if (stuck === "true" && !b.isStuck) return false;
      if (hasDispute === "true" && !b.hasDispute) return false;
      if (
        search &&
        !b.id.toLowerCase().includes(search) &&
        !b.talent.name.toLowerCase().includes(search) &&
        !b.client.name.toLowerCase().includes(search) &&
        !b.service.title.toLowerCase().includes(search)
      ) {
        return false;
      }
      return true;
    });

    const res: BookingListResponse = {
      bookings: filtered,
      nextCursor: null,
      hasMore: false,
      totalCount: filtered.length,
    };
    return res as unknown as T;
  }

  // 9. Booking Detail & Order Room (AD-10 to AD-13)
  if (cleanPath.match(/^\/api\/v1\/admin\/bookings\/[^/]+$/)) {
    const id = cleanPath.split("/")[5];
    const isBk2 = id === "bk_02";
    const res: BookingDetailResponse = {
      booking: {
        id,
        state: isBk2 ? "DELIVERABLES_PROVIDED" : "ESCROW_LOCKED",
        origin: isBk2 ? "MARKETPLACE" : "DIRECT",
        currency: isBk2 ? "GBP" : "NGN",
        baseAmount: isBk2 ? 3500 : 1200000,
        clientFeeAmount: isBk2 ? 525 : 180000,
        talentFeeAmount: isBk2 ? 385 : 132000,
        clientTotal: isBk2 ? 4025 : 1380000,
        talentNet: isBk2 ? 3115 : 1068000,
        feeBreakdownLabel: "Client 15% + Talent 11% platform fee",
        slotDate: "2026-11-15",
        slotStart: "10:00",
        slotEnd: "12:00",
        engagementType: isBk2 ? "NARRATION" : "VOICEOVER",
        recurrence: null,
        meetUrl: "https://meet.monologg.com/ord-0042",
        contextNote: isBk2
          ? "Series Narration Pilot — uncompressed 48kHz WAV deliverables required."
          : "Record 60-second broadcast voiceover in warm, authentic African tone.",
        slotHoldExpiresAt: null,
        createdAt: "2026-11-01T10:00:00.000Z",
        talent: {
          id: isBk2 ? "cr_03" : "cr_01",
          userId: isBk2 ? "usr_creator_03" : "usr_creator_01",
          name: isBk2 ? "David Oyelowo" : "Tunde Kelani",
          email: isBk2 ? "d***o@example.com" : "t***i@example.com",
          phone: isBk2 ? "+44 7700 *** 912" : "+234 803 *** 8912",
          niche: isBk2 ? "ACTOR" : "VO_ARTIST",
          bio: "Professional voiceover & screen talent.",
          avatarUrl: null,
          celebrityBadge: true,
          referralCode: "TUNDE_VO",
        },
        client: {
          id: isBk2 ? "cl_02" : "cl_01",
          userId: isBk2 ? "usr_client_02" : "usr_client_01",
          name: isBk2 ? "Netflix EMEA" : "Flutterwave Marketing",
          email: isBk2 ? "e***t@netflix.example.com" : "m***g@flutterwave.example.com",
          phone: "+234 809 *** 4400",
          orgName: isBk2 ? "Netflix EMEA" : "Flutterwave",
          orgType: "ENTERPRISE",
          avatarUrl: null,
        },
        service: {
          id: "svc_01",
          title: isBk2 ? "Series Narration Pilot" : "Voiceover Brand Campaign Q4",
          deliveryTimeline: 5,
        },
        payment: {
          id: isBk2 ? "tx_02" : "tx_01",
          status: "SUCCESS",
          provider: isBk2 ? "STRIPE" : "PAYSTACK",
          providerRef: isBk2 ? "pi_3Qx8L92" : "PSK_9812390",
          escrowHeld: true,
          amount: isBk2 ? 4025 : 1380000,
          currency: isBk2 ? "GBP" : "NGN",
          createdAt: "2026-11-01T10:02:00.000Z",
        },
        ageInState: { ms: 86400000, seconds: 86400, human: "1d 0h" },
        isStuck: isBk2,
        stuckReason: isBk2 ? "Awaiting client approval > 48h" : null,
        hasDispute: isBk2,
        canReviewConversation: true,
        reviewDisabledReason: null,
        disputeDetail: isBk2 ? { status: "UNDER_REVIEW", subject: "Format revision disagreement", ticketId: "dsp_01" } : null,
      },
      orderRoom: {
        exists: true,
        totalMessages: 8,
        countsByKind: { TEXT: 5, VOICE: 1, DOCUMENT: 1, CALL: 0, SYSTEM: 1 },
        fileCount: 2,
        callLinks: ["https://meet.monologg.com/ord-0042"],
        lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      },
      timeline: [
        {
          id: "tl_01",
          type: "STATE_CHANGE",
          title: "Booking Created",
          description: "Client initiated booking request and locked slot.",
          timestamp: "2026-11-01T10:00:00.000Z",
          actor: "Client",
          source: "WEB",
        },
        {
          id: "tl_02",
          type: "PAYMENT_EVENT",
          title: "Escrow Payment Verified",
          description: "Funds captured and held safely in platform escrow.",
          timestamp: "2026-11-01T10:02:00.000Z",
          actor: isBk2 ? "Stripe" : "Paystack",
          source: "WEBHOOK",
        },
        {
          id: "tl_03",
          type: "MILESTONE",
          title: "Deliverable Uploaded",
          description: "Master WAV take uploaded to Order Room.",
          timestamp: "2026-11-10T12:00:00.000Z",
          actor: "Talent",
          source: "WEB",
        },
      ],
    };
    return res as unknown as T;
  }

  // 10. Finance Summary (AD-14)
  if (cleanPath === "/api/v1/admin/finance/summary") {
    const res: FinanceSummaryResponse = {
      mode: "TEST",
      currencies: ["NGN", "USD", "GBP"],
      summaries: {
        NGN: {
          currency: "NGN",
          gmv: 148250000,
          escrowHeld: 18400000,
          released: 124500000,
          refunded: 5350000,
          platformRevenue: 22237500,
          talentFees: 12800000,
          clientFees: 9437500,
          takeRatePct: 15.0,
          averageBookingValue: 825000,
          paymentFailureRatePct: 1.4,
          totalBookings: 180,
          totalPayments: 185,
          failedPayments: 3,
        },
        USD: {
          currency: "USD",
          gmv: 185000,
          escrowHeld: 24500,
          released: 155000,
          refunded: 5500,
          platformRevenue: 27750,
          talentFees: 16200,
          clientFees: 11550,
          takeRatePct: 15.0,
          averageBookingValue: 1850,
          paymentFailureRatePct: 0.8,
          totalBookings: 100,
          totalPayments: 102,
          failedPayments: 1,
        },
        GBP: {
          currency: "GBP",
          gmv: 96000,
          escrowHeld: 14200,
          released: 78000,
          refunded: 3800,
          platformRevenue: 14400,
          talentFees: 8400,
          clientFees: 6000,
          takeRatePct: 15.0,
          averageBookingValue: 1600,
          paymentFailureRatePct: 0.0,
          totalBookings: 60,
          totalPayments: 60,
          failedPayments: 0,
        },
      },
      mismatchesCount: 1,
      recentMismatches: [
        {
          type: "PAYOUT_LEDGER_DELTA",
          severity: "WARNING",
          paymentId: "tx_01",
          bookingId: "bk_01",
          amount: 12500,
          currency: "NGN",
          description: "FX rounding variance of ₦12,500 on batch #492 settlement.",
          detectedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        },
      ],
    };
    return res as unknown as T;
  }

  if (cleanPath === "/api/v1/admin/finance/mismatches") {
    return {
      mismatches: [
        {
          type: "PAYOUT_LEDGER_DELTA",
          severity: "WARNING",
          paymentId: "tx_01",
          bookingId: "bk_01",
          amount: 12500,
          currency: "NGN",
          description: "FX rounding variance of ₦12,500 on batch #492 settlement.",
          detectedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        },
      ],
      count: 1,
    } as unknown as T;
  }

  // 11. Payments List & Detail (AD-14)
  if (cleanPath === "/api/v1/admin/payments") {
    const status = params.get("status");
    const provider = params.get("provider");
    const currency = params.get("currency");
    const allPayments: PaymentListResponse["payments"] = [
      {
        id: "tx_01",
        bookingId: "bk_01",
        bookingState: "ESCROW_LOCKED",
        payer: {
          id: "usr_client_01",
          name: "Flutterwave Marketing",
          orgName: "Flutterwave",
          email: "m***g@flutterwave.example.com",
        },
        creator: { id: "usr_creator_01", name: "Tunde Kelani", email: "t***i@example.com" },
        provider: "PAYSTACK",
        providerRef: "PSK_9812390",
        status: "SUCCESS",
        amount: 1380000,
        currency: "NGN",
        platformFee: 312000,
        clientFee: 180000,
        talentFee: 132000,
        escrowHeld: true,
        createdAt: "2026-11-01T10:02:00.000Z",
      },
      {
        id: "tx_02",
        bookingId: "bk_02",
        bookingState: "DELIVERABLES_PROVIDED",
        payer: {
          id: "usr_client_02",
          name: "Netflix EMEA",
          orgName: "Netflix",
          email: "e***t@netflix.example.com",
        },
        creator: { id: "usr_creator_03", name: "David Oyelowo", email: "d***o@example.com" },
        provider: "STRIPE",
        providerRef: "pi_3Qx8L92",
        status: "SUCCESS",
        amount: 4025,
        currency: "GBP",
        platformFee: 910,
        clientFee: 525,
        talentFee: 385,
        escrowHeld: true,
        createdAt: "2026-10-28T09:05:00.000Z",
      },
      {
        id: "tx_03",
        bookingId: "bk_03",
        bookingState: "PAYMENT_RELEASED",
        payer: {
          id: "usr_client_01",
          name: "MTN Digital",
          orgName: "MTN Nigeria",
          email: "d***l@mtn.example.com",
        },
        creator: { id: "usr_creator_02", name: "Amina Yusuf", email: "a***f@example.com" },
        provider: "PAYSTACK",
        providerRef: "PSK_7721104",
        status: "SUCCESS",
        amount: 747500,
        currency: "NGN",
        platformFee: 169000,
        clientFee: 97500,
        talentFee: 71500,
        escrowHeld: false,
        createdAt: "2026-10-15T11:22:00.000Z",
      },
    ];
    const filtered = allPayments.filter((p) => {
      if (status && status !== "ALL" && p.status !== status) return false;
      if (provider && provider !== "ALL" && p.provider !== provider) return false;
      if (currency && currency !== "ALL" && p.currency !== currency) return false;
      return true;
    });
    const res: PaymentListResponse = {
      payments: filtered,
      nextCursor: null,
      hasMore: false,
      totalCount: filtered.length,
    };
    return res as unknown as T;
  }

  if (cleanPath.match(/^\/api\/v1\/admin\/payments\/[^/]+$/)) {
    const id = cleanPath.split("/")[5];
    const res: PaymentDetailResponse = {
      payment: {
        id,
        bookingId: "bk_01",
        provider: id === "tx_02" ? "STRIPE" : "PAYSTACK",
        providerRef: id === "tx_02" ? "pi_3Qx8L92" : "PSK_9812390",
        status: "SUCCESS",
        escrowHeld: true,
        amount: id === "tx_02" ? 4025 : 1380000,
        currency: id === "tx_02" ? "GBP" : "NGN",
        createdAt: "2026-11-01T10:02:00.000Z",
        platformRevenue: id === "tx_02" ? 910 : 312000,
        talentFee: id === "tx_02" ? 385 : 132000,
        clientFee: id === "tx_02" ? 525 : 180000,
        feeBreakdownLabel: "Client 15% + Talent 11%",
      },
      booking: {
        id: "bk_01",
        state: "ESCROW_LOCKED",
        origin: "DIRECT",
        slotDate: "2026-11-15",
        baseAmount: id === "tx_02" ? 3500 : 1200000,
        currency: id === "tx_02" ? "GBP" : "NGN",
        client: {
          name: "Flutterwave Marketing",
          orgName: "Flutterwave",
          email: "m***g@flutterwave.example.com",
          phone: "+234 809 *** 4400",
        },
        talent: {
          name: "Tunde Kelani",
          email: "t***i@example.com",
          phone: "+234 803 *** 8912",
        },
      },
      events: [
        {
          id: "we_01",
          type: "charge.success",
          eventId: "evt_paystack_0912",
          createdAt: "2026-11-01T10:02:05.000Z",
          isDuplicate: false,
          processingResult: "ESCROW_LOCKED",
        },
      ],
    };
    return res as unknown as T;
  }

  // 12. Earnings (AD-15)
  if (cleanPath === "/api/v1/admin/finance/earnings") {
    const res: EarningsResponse = {
      label: "All-time Creator & Client Ledgers",
      currencies: ["NGN", "USD", "GBP"],
      topEarners: {
        NGN: [
          {
            creatorId: "cr_01",
            userId: "usr_creator_01",
            name: "Tunde Kelani",
            avatarUrl: null,
            currency: "NGN",
            earned: 18450000,
            withdrawn: 12882000,
            pending: 450000,
            available: 5118000,
          },
          {
            creatorId: "cr_02",
            userId: "usr_creator_02",
            name: "Amina Yusuf",
            avatarUrl: null,
            currency: "NGN",
            earned: 11200000,
            withdrawn: 8800000,
            pending: 0,
            available: 2400000,
          },
        ],
        USD: [
          {
            creatorId: "cr_01",
            userId: "usr_creator_01",
            name: "Tunde Kelani",
            avatarUrl: null,
            currency: "USD",
            earned: 24500,
            withdrawn: 18000,
            pending: 0,
            available: 6500,
          },
        ],
        GBP: [
          {
            creatorId: "cr_03",
            userId: "usr_creator_03",
            name: "David Oyelowo",
            avatarUrl: null,
            currency: "GBP",
            earned: 31200,
            withdrawn: 22000,
            pending: 3115,
            available: 6085,
          },
        ],
      },
      topSpenders: {
        NGN: [
          {
            clientId: "cl_01",
            userId: "usr_client_01",
            name: "Flutterwave Marketing",
            orgName: "Flutterwave",
            avatarUrl: null,
            currency: "NGN",
            spend: 28400000,
            bookingsCount: 24,
          },
        ],
        USD: [
          {
            clientId: "cl_02",
            userId: "usr_client_02",
            name: "Netflix EMEA",
            orgName: "Netflix EMEA",
            avatarUrl: null,
            currency: "USD",
            spend: 68500,
            bookingsCount: 15,
          },
        ],
        GBP: [
          {
            clientId: "cl_02",
            userId: "usr_client_02",
            name: "Netflix EMEA",
            orgName: "Netflix EMEA",
            avatarUrl: null,
            currency: "GBP",
            spend: 42000,
            bookingsCount: 11,
          },
        ],
      },
    };
    return res as unknown as T;
  }

  // 13. Withdrawals (AD-16)
  if (cleanPath === "/api/v1/admin/withdrawals") {
    const status = params.get("status");
    const currency = params.get("currency");
    const allWithdrawals: WithdrawalListResponse["withdrawals"] = [
      {
        id: "wth_01",
        userId: "usr_creator_01",
        user: {
          id: "usr_creator_01",
          name: "Tunde Kelani",
          email: "t***i@example.com",
          avatarUrl: null,
        },
        amount: 450000,
        currency: "NGN",
        state: "PENDING",
        requestedTime: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
        bank: {
          bankName: "Access Bank Nigeria",
          accountName: "Tunde Kelani",
          accountNumber: "****8912",
        },
        otpStatus: "verified",
        providerReference: null,
        failureReason: null,
        flagged: false,
        flaggedAt: null,
      },
      {
        id: "wth_02",
        userId: "usr_creator_02",
        user: {
          id: "usr_creator_02",
          name: "Amina Yusuf",
          email: "a***f@example.com",
          avatarUrl: null,
        },
        amount: 600000,
        currency: "NGN",
        state: "PAID",
        requestedTime: "2026-10-20T10:00:00.000Z",
        bank: {
          bankName: "Guaranty Trust Bank",
          accountName: "Amina Yusuf",
          accountNumber: "****3341",
        },
        otpStatus: "verified",
        providerReference: "TRF_998120",
        failureReason: null,
        flagged: false,
        flaggedAt: null,
      },
    ];
    const filtered = allWithdrawals.filter((w) => {
      if (status && status !== "ALL" && w.state !== status) return false;
      if (currency && currency !== "ALL" && w.currency !== currency) return false;
      return true;
    });
    const res: WithdrawalListResponse = {
      withdrawals: filtered,
      nextCursor: null,
      hasMore: false,
      totalCount: filtered.length,
    };
    return res as unknown as T;
  }

  // 14. Tickets Queue, Canned Replies & Detail (AD-17 & AD-18)
  if (cleanPath === "/api/v1/admin/tickets/canned-replies") {
    const replies: { cannedReplies: CannedReplyItem[] } = {
      cannedReplies: [
        {
          id: "cr_1",
          title: "Payout Processing Window (24-48h)",
          body: "Hi there, NGN withdrawals are typically settled within 24 hours on business days via NIBSS.",
        },
        {
          id: "cr_2",
          title: "Verification Video Guidelines",
          body: "Please ensure your waist-up video is under 90 seconds with both face and hands clearly visible in bright light.",
        },
      ],
    };
    return replies as unknown as T;
  }

  if (cleanPath === "/api/v1/admin/tickets") {
    const view = params.get("view") || "all";
    const status = params.get("status");
    const priority = params.get("priority");
    const allTickets: TicketListResponse["tickets"] = [
      {
        id: "tkt_01",
        number: "TCK-1042",
        rawNumber: 1042,
        subject: "Inquiry regarding multi-currency payout processing time",
        message: "Hello Support Team, I initiated a withdrawal to my NGN account this morning.",
        category: "PAYMENTS",
        priority: "HIGH",
        status: "OPEN",
        source: "IN_APP",
        userId: "usr_creator_01",
        user: {
          id: "usr_creator_01",
          email: "t***i@example.com",
          name: "Tunde Kelani",
          userType: "TALENT",
        },
        assignedAdminId: null,
        assignedAdmin: null,
        bookingId: "bk_01",
        disputeId: null,
        firstResponseAt: null,
        resolvedAt: null,
        slaDueAt: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
        isBreached: false,
        slaRemainingMs: 1000 * 60 * 120,
        messageCount: 1,
        createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      },
      {
        id: "tkt_02",
        number: "TCK-1038",
        rawNumber: 1038,
        subject: "Request for invoice PDF re-generation",
        message: "Can we get an updated VAT invoice for booking ORD-2026-0042?",
        category: "BILLING",
        priority: "NORMAL",
        status: "RESOLVED",
        source: "EMAIL",
        userId: "usr_client_01",
        user: {
          id: "usr_client_01",
          email: "m***g@flutterwave.example.com",
          name: "Flutterwave Marketing",
          userType: "CLIENT",
        },
        assignedAdminId: "adm_01",
        assignedAdmin: { id: "adm_01", email: "support@monologg.com" },
        bookingId: "bk_01",
        disputeId: null,
        firstResponseAt: "2026-11-05T14:25:00.000Z",
        resolvedAt: "2026-11-05T15:00:00.000Z",
        slaDueAt: "2026-11-06T14:00:00.000Z",
        isBreached: false,
        slaRemainingMs: 0,
        messageCount: 3,
        createdAt: "2026-11-05T14:00:00.000Z",
        updatedAt: "2026-11-05T15:00:00.000Z",
      },
    ];

    const filtered = allTickets.filter((t) => {
      if (view === "unassigned" && t.assignedAdminId) return false;
      if (view === "urgent" && !["URGENT", "HIGH"].includes(t.priority)) return false;
      if (view === "waiting_user" && t.status !== "WAITING_USER") return false;
      if (status && status !== "ALL" && t.status !== status) return false;
      if (priority && priority !== "ALL" && t.priority !== priority) return false;
      return true;
    });

    const res: TicketListResponse = {
      tickets: filtered,
      counts: {
        mine: 0,
        unassigned: 1,
        urgent: 1,
        waiting_user: 0,
        all: allTickets.length,
      },
      pagination: {
        total: filtered.length,
        hasMore: false,
        nextCursor: null,
      },
    };
    return res as unknown as T;
  }

  if (cleanPath.match(/^\/api\/v1\/admin\/tickets\/[^/]+$/)) {
    const id = cleanPath.split("/")[5];
    const res: TicketDetailResponse = {
      ticket: {
        id,
        number: "TCK-1042",
        rawNumber: 1042,
        subject: "Inquiry regarding multi-currency payout processing time",
        message: "Hello Support Team, I initiated a withdrawal to my NGN account this morning.",
        category: "PAYMENTS",
        priority: "HIGH",
        status: "OPEN",
        source: "IN_APP",
        userId: "usr_creator_01",
        user: {
          id: "usr_creator_01",
          email: "t***i@example.com",
          phone: "+234 803 *** 8912",
          name: "Tunde Kelani",
          userType: "TALENT",
          verification: "VERIFIED",
          createdAt: "2026-02-14T10:00:00.000Z",
        },
        assignedAdminId: null,
        assignedAdmin: null,
        bookingId: "bk_01",
        linkedBooking: {
          id: "bk_01",
          state: "ESCROW_LOCKED",
          origin: "DIRECT",
          currency: "NGN",
          baseAmount: 1200000,
          talentFeeAmount: 132000,
          clientFeeAmount: 180000,
          talentName: "Tunde Kelani",
          clientName: "Flutterwave Marketing",
          createdAt: "2026-11-01T10:00:00.000Z",
        },
        disputeId: null,
        firstResponseAt: null,
        resolvedAt: null,
        resolutionNote: null,
        slaDueAt: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
        isBreached: false,
        slaRemainingMs: 1000 * 60 * 120,
        createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        messages: [
          {
            id: "tmsg_01",
            ticketId: id,
            authorType: "USER",
            authorId: "usr_creator_01",
            senderRole: "TALENT",
            body: "Hello Support Team, I initiated a withdrawal to my NGN account this morning. Could you confirm the expected clearing window?",
            isInternal: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
          },
        ],
      },
    };
    return res as unknown as T;
  }

  // 15. Disputes Queue & Detail (AD-25)
  if (cleanPath === "/api/v1/admin/disputes") {
    const status = params.get("status");
    const allDisputes: DisputeListResponse["disputes"] = [
      {
        id: "dsp_01",
        bookingId: "bk_02",
        openedByUserId: "usr_client_02",
        openedByRole: "CLIENT",
        reason: "DELIVERABLE_QUALITY",
        description: "Client requested uncompressed 48kHz / 24-bit master WAV files instead of MP3.",
        status: "UNDER_REVIEW",
        resolution: null,
        splitTalentPct: null,
        resolutionNote: null,
        openedAt: "2026-11-10T14:00:00.000Z",
        resolvedAt: null,
        ageHours: 56,
        ageDays: 2,
        isOverdue: false,
        isFourEyesRequired: true,
        booking: {
          id: "bk_02",
          state: "DELIVERABLES_PROVIDED",
          currency: "GBP",
          baseAmount: 3500,
          talentFeeAmount: 385,
          clientFeeAmount: 525,
          creator: { id: "cr_03", userId: "usr_creator_03", name: "David Oyelowo" },
          client: { id: "cl_02", userId: "usr_client_02", name: "Netflix EMEA", orgName: "Netflix" },
          payment: { id: "tx_02", status: "SUCCESS", amount: 4025, currency: "GBP", provider: "STRIPE" },
        },
      },
    ];
    const filtered = allDisputes.filter((d) => !status || status === "ALL" || d.status === status);
    const res: DisputeListResponse = {
      disputes: filtered,
      nextCursor: null,
      totalCount: filtered.length,
    };
    return res as unknown as T;
  }

  if (cleanPath.match(/^\/api\/v1\/admin\/disputes\/[^/]+\/review-chat$/)) {
    const id = cleanPath.split("/")[5];
    const res: DisputeChatReviewResponse = {
      disputeId: id,
      bookingId: "bk_02",
      messageCount: 3,
      banner: "Audited chat log snapshot (read-only compliance view)",
      messages: [
        {
          id: "cm_01",
          senderId: "Netflix EMEA (Client)",
          kind: "TEXT",
          content: "Hi David, please ensure final exports are delivered in 48kHz / 24-bit WAV format.",
          createdAt: "2026-11-08T10:00:00.000Z",
        },
        {
          id: "cm_02",
          senderId: "David Oyelowo (Talent)",
          kind: "TEXT",
          content: "Understood! Uploaded take 1 in compressed preview format for pacing approval first.",
          createdAt: "2026-11-09T14:20:00.000Z",
        },
      ],
    };
    return res as unknown as T;
  }

  if (cleanPath.match(/^\/api\/v1\/admin\/disputes\/[^/]+$/)) {
    const id = cleanPath.split("/")[5];
    const res: DisputeDetailResponse = {
      dispute: {
        id,
        bookingId: "bk_02",
        openedByUserId: "usr_client_02",
        openedByRole: "CLIENT",
        reason: "DELIVERABLE_QUALITY",
        description: "Client requested uncompressed 48kHz / 24-bit master WAV files instead of MP3.",
        status: "UNDER_REVIEW",
        openedAt: "2026-11-10T14:00:00.000Z",
        isOverdue: false,
        fourEyes: {
          required: true,
          thresholdMinor: 500000,
          isApproved: false,
          resolvedByAdminId: null,
          approvedByAdminId: null,
        },
      },
      booking: {
        id: "bk_02",
        state: "DELIVERABLES_PROVIDED",
        currency: "GBP",
        baseAmount: 3500,
        talentFeeAmount: 385,
        clientFeeAmount: 525,
        slotDate: "2026-11-10",
        creator: { id: "cr_03", userId: "usr_creator_03", name: "David Oyelowo" },
        client: { id: "cl_02", userId: "usr_client_02", name: "Netflix EMEA", orgName: "Netflix" },
        payment: {
          id: "tx_02",
          status: "SUCCESS",
          amount: 4025,
          currency: "GBP",
          provider: "STRIPE",
          providerRef: "pi_3Qx8L92",
          escrowHeld: true,
        },
      },
      deliveryFiles: [
        {
          id: "df_01",
          senderId: "usr_creator_03",
          content: "Pilot_Narration_Take1_Preview.mp3",
          createdAt: "2026-11-09T14:22:00.000Z",
        },
      ],
      timeline: [
        {
          timestamp: "2026-11-10T14:00:00.000Z",
          title: "Dispute Opened by Client",
          detail: "Requested final uncompressed WAV assets per original brief.",
          source: "CLIENT",
        },
      ],
      linkedTickets: [],
    };
    return res as unknown as T;
  }

  // 16. Verifications Queue, Metrics & Detail (AD-26)
  if (cleanPath === "/api/v1/admin/verifications/metrics") {
    const res: VerificationMetricsResponse = {
      pendingUploadedCount: 1,
      inReviewCount: 1,
      overdueCount: 0,
      approvedCount: 48,
      needsRerecordCount: 4,
      totalReviewedCount: 52,
      approvalRatePct: 92.3,
      medianReviewHours: 4.2,
    };
    return res as unknown as T;
  }

  if (cleanPath === "/api/v1/admin/verifications") {
    const status = params.get("status");
    const allItems: VerificationQueueResponse["items"] = [
      {
        id: "rec_01",
        creatorId: "cr_03",
        creatorName: "David Oyelowo",
        creatorNiche: "ACTOR",
        creatorLocation: "London, UK",
        creatorAvatarUrl: null,
        status: "UPLOADED",
        durationSec: 42,
        guidelineAck: true,
        reviewerNote: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
        ageHours: 18,
        isOverdue: false,
        slaRemainingHours: 30,
      },
      {
        id: "rec_02",
        creatorId: "cr_01",
        creatorName: "Tunde Kelani",
        creatorNiche: "VO_ARTIST",
        creatorLocation: "Lagos, Nigeria",
        creatorAvatarUrl: null,
        status: "APPROVED",
        durationSec: 54,
        guidelineAck: true,
        reviewerNote: "Clear voice, waist-up lighting meets all guidelines.",
        createdAt: "2026-11-08T10:00:00.000Z",
        updatedAt: "2026-11-08T14:00:00.000Z",
        ageHours: 4,
        isOverdue: false,
        slaRemainingHours: 44,
      },
    ];
    const filtered = allItems.filter((item) => !status || status === "ALL" || item.status === status);
    const res: VerificationQueueResponse = {
      items: filtered,
      total: filtered.length,
      hasMore: false,
      nextCursor: null,
    };
    return res as unknown as T;
  }

  if (cleanPath.match(/^\/api\/v1\/admin\/verifications\/[^/]+\/signed-url$/)) {
    const id = cleanPath.split("/")[5];
    return {
      id,
      signedUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      expiresAt: new Date(Date.now() + 1000 * 60 * 5).toISOString(),
    } as unknown as T;
  }

  if (cleanPath.match(/^\/api\/v1\/admin\/verifications\/[^/]+$/)) {
    const id = cleanPath.split("/")[5];
    const res: VerificationDetailResponse = {
      id,
      creatorId: "cr_03",
      creator: {
        id: "cr_03",
        userId: "usr_creator_03",
        name: "David Oyelowo",
        niche: "ACTOR",
        location: "London, UK",
        avatarUrl: null,
        maskedEmail: "d***o@example.com",
        maskedPhone: "+44 7700 *** 912",
        userCreatedAt: "2026-04-10T12:00:00.000Z",
      },
      status: "IN_REVIEW",
      durationSec: 42,
      guidelineAck: true,
      reviewerNote: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
      updatedAt: new Date().toISOString(),
      ageHours: 18,
      isOverdue: false,
      guidelineChecklist: [
        { id: "waist_up", label: "Waist-up framing", passed: true, hint: "Subject clearly visible from waist up" },
        { id: "face_hands", label: "Face and hands visible", passed: true },
        { id: "good_light", label: "Clear front lighting", passed: true },
        { id: "natural_gestures", label: "Natural speaking gestures", passed: true },
        { id: "under_90s", label: "Duration under 90 seconds", passed: true, hint: "42s stored duration" },
      ],
      kycPanel: {
        status: "VERIFIED",
        attempts: 1,
        provider: "DOJAH",
        failureReasonCode: null,
        lastAttemptAt: "2026-04-12T10:15:00.000Z",
      },
    };
    return res as unknown as T;
  }

  // 17. Analytics: Acquisition (AD-19)
  if (cleanPath === "/api/v1/admin/acquisition") {
    const res: AcquisitionData = {
      bySource: [
        { source: "DIRECT", signups: 4250, activatedCount: 2898, activationRatePct: 68.2, firstBookingCount: 1874, firstBookingRatePct: 44.1 },
        { source: "TWITTER", signups: 2840, activatedCount: 1534, activationRatePct: 54.0, firstBookingCount: 903, firstBookingRatePct: 31.8 },
        { source: "INSTAGRAM", signups: 1980, activatedCount: 1218, activationRatePct: 61.5, firstBookingCount: 756, firstBookingRatePct: 38.2 },
        { source: "REFERRAL", signups: 920, activatedCount: 758, activationRatePct: 82.4, firstBookingCount: 589, firstBookingRatePct: 64.0 },
        { source: "UNKNOWN_NO_CONSENT", signups: 492, activatedCount: 236, activationRatePct: 48.0, firstBookingCount: 108, firstBookingRatePct: 22.0 },
      ],
      byReferrer: [
        { referrer: "twitter.com", count: 2840 },
        { referrer: "instagram.com", count: 1980 },
        { referrer: "linkedin.com", count: 820 },
        { referrer: "google.com", count: 610 },
      ],
      byCountry: [
        { country: "NG", count: 6240 },
        { country: "GB", count: 2180 },
        { country: "US", count: 1420 },
        { country: "GH", count: 642 },
      ],
      byDevice: [
        { device: "DESKTOP", count: 6120 },
        { device: "MOBILE", count: 3890 },
        { device: "TABLET", count: 472 },
      ],
      dailySignups: [
        { date: "2026-11-06", count: 130 },
        { date: "2026-11-07", count: 143 },
        { date: "2026-11-08", count: 120 },
        { date: "2026-11-09", count: 165 },
        { date: "2026-11-10", count: 187 },
        { date: "2026-11-11", count: 177 },
        { date: "2026-11-12", count: 200 },
      ],
      referralLeaderboard: [
        { code: "TUNDE_VO", creatorName: "Tunde Kelani", inviteCount: 142, activatedCount: 118, hasCelebrityBadge: true },
        { code: "AMINA_FUN", creatorName: "Amina Yusuf", inviteCount: 98, activatedCount: 76, hasCelebrityBadge: false },
        { code: "MONOLOGG_VIP", creatorName: "David Oyelowo", inviteCount: 64, activatedCount: 54, hasCelebrityBadge: true },
      ],
      unknownShare: {
        count: 492,
        total: 10482,
        sharePct: 4.7,
        label: "Unknown (no consent)",
      },
      dataFreshness: new Date().toISOString(),
    };
    return res as unknown as T;
  }

  // 18. Analytics: Funnels (AD-20)
  if (cleanPath === "/api/v1/admin/funnels") {
    const funnelId = (params.get("funnelId") || "TALENT_ONBOARDING") as FunnelData["funnelId"];
    const funnels: Record<FunnelData["funnelId"], FunnelData> = {
      TALENT_ONBOARDING: {
        funnelId: "TALENT_ONBOARDING",
        name: "Talent Onboarding & Activation",
        description: "End-to-end creator activation from signup to verified media kit & first escrow.",
        overallConversionPct: 53.8,
        biggestDropOffStep: "Video Verification -> First Escrow Booking",
        dataFreshness: new Date().toISOString(),
        steps: [
          {
            stepId: "signup",
            label: "Talent Signup",
            count: 3120,
            conversionFromPreviousPct: 100,
            overallConversionPct: 100,
            medianTimeToNextStepMinutes: 8,
            breakdown: {
              bySource: { DIRECT: 1400, TWITTER: 920, INSTAGRAM: 800 },
              byCountry: { NG: 1900, GB: 720, US: 500 },
              byDevice: { DESKTOP: 1850, MOBILE: 1270 },
              byCohort: { "2026-W44": 420, "2026-W45": 510 },
            },
            droppedUsers: [],
          },
          {
            stepId: "profile",
            label: "Profile & Rates Configured",
            count: 2840,
            conversionFromPreviousPct: 91.0,
            overallConversionPct: 91.0,
            medianTimeToNextStepMinutes: 24,
            breakdown: {
              bySource: { DIRECT: 1320, TWITTER: 810, INSTAGRAM: 710 },
              byCountry: { NG: 1740, GB: 660, US: 440 },
              byDevice: { DESKTOP: 1710, MOBILE: 1130 },
              byCohort: { "2026-W44": 390, "2026-W45": 470 },
            },
            droppedUsers: [
              { userId: "usr_creator_03", name: "David Oyelowo", email: "d***o@example.com", userType: "TALENT", createdAt: "2026-04-10T12:00:00.000Z" },
            ],
          },
          {
            stepId: "mediakit",
            label: "Media Kit Published",
            count: 2510,
            conversionFromPreviousPct: 88.4,
            overallConversionPct: 80.4,
            medianTimeToNextStepMinutes: 45,
            breakdown: {
              bySource: { DIRECT: 1200, TWITTER: 710, INSTAGRAM: 600 },
              byCountry: { NG: 1510, GB: 610, US: 390 },
              byDevice: { DESKTOP: 1580, MOBILE: 930 },
              byCohort: { "2026-W44": 340, "2026-W45": 420 },
            },
            droppedUsers: [],
          },
          {
            stepId: "booking",
            label: "First Escrow Booking",
            count: 1680,
            conversionFromPreviousPct: 66.9,
            overallConversionPct: 53.8,
            medianTimeToNextStepMinutes: null,
            breakdown: {
              bySource: { DIRECT: 880, TWITTER: 440, INSTAGRAM: 360 },
              byCountry: { NG: 1020, GB: 420, US: 240 },
              byDevice: { DESKTOP: 1120, MOBILE: 560 },
              byCohort: { "2026-W44": 240, "2026-W45": 280 },
            },
            droppedUsers: [
              { userId: "usr_creator_02", name: "Amina Yusuf", email: "a***f@example.com", userType: "TALENT", createdAt: "2026-03-01T14:20:00.000Z" },
            ],
          },
        ],
      },
      CLIENT_LIFECYCLE: {
        funnelId: "CLIENT_LIFECYCLE",
        name: "Client Discovery to Escrow Funding",
        description: "Client conversion from initial visit and brief posting to funded booking.",
        overallConversionPct: 43.3,
        biggestDropOffStep: "Searched Roster -> Initiated Brief",
        dataFreshness: new Date().toISOString(),
        steps: [
          {
            stepId: "client_signup",
            label: "Client Account Created",
            count: 7362,
            conversionFromPreviousPct: 100,
            overallConversionPct: 100,
            medianTimeToNextStepMinutes: 4,
            breakdown: { bySource: { DIRECT: 4100, REFERRAL: 1800 }, byCountry: { NG: 4300, GB: 1900 }, byDevice: { DESKTOP: 5100, MOBILE: 2262 }, byCohort: { "2026-W45": 980 } },
            droppedUsers: [],
          },
          {
            stepId: "roster_search",
            label: "Searched Creator Roster",
            count: 6180,
            conversionFromPreviousPct: 83.9,
            overallConversionPct: 83.9,
            medianTimeToNextStepMinutes: 18,
            breakdown: { bySource: { DIRECT: 3500, REFERRAL: 1620 }, byCountry: { NG: 3600, GB: 1650 }, byDevice: { DESKTOP: 4400, MOBILE: 1780 }, byCohort: { "2026-W45": 840 } },
            droppedUsers: [],
          },
          {
            stepId: "escrow_funded",
            label: "Funded Booking Escrow",
            count: 3190,
            conversionFromPreviousPct: 51.6,
            overallConversionPct: 43.3,
            medianTimeToNextStepMinutes: null,
            breakdown: { bySource: { DIRECT: 1900, REFERRAL: 920 }, byCountry: { NG: 1840, GB: 920 }, byDevice: { DESKTOP: 2540, MOBILE: 650 }, byCohort: { "2026-W45": 490 } },
            droppedUsers: [],
          },
        ],
      },
      EXTERNAL_BOOKING: {
        funnelId: "EXTERNAL_BOOKING",
        name: "External Media Kit -> Direct Booking",
        description: "Conversion from public creator media kit links to direct booking checkout.",
        overallConversionPct: 28.4,
        biggestDropOffStep: "Media Kit View -> Slot Selected",
        dataFreshness: new Date().toISOString(),
        steps: [
          {
            stepId: "kit_view",
            label: "Media Kit Visited",
            count: 12400,
            conversionFromPreviousPct: 100,
            overallConversionPct: 100,
            medianTimeToNextStepMinutes: 5,
            breakdown: { bySource: { TWITTER: 6400, DIRECT: 4200 }, byCountry: { NG: 7200, GB: 3200 }, byDevice: { MOBILE: 7100, DESKTOP: 5300 }, byCohort: { "2026-W45": 2100 } },
            droppedUsers: [],
          },
          {
            stepId: "slot_pick",
            label: "Availability Slot Selected",
            count: 5200,
            conversionFromPreviousPct: 41.9,
            overallConversionPct: 41.9,
            medianTimeToNextStepMinutes: 12,
            breakdown: { bySource: { TWITTER: 2600, DIRECT: 1950 }, byCountry: { NG: 3100, GB: 1400 }, byDevice: { MOBILE: 2700, DESKTOP: 2500 }, byCohort: { "2026-W45": 910 } },
            droppedUsers: [],
          },
          {
            stepId: "checkout_paid",
            label: "Checkout Paid",
            count: 3520,
            conversionFromPreviousPct: 67.7,
            overallConversionPct: 28.4,
            medianTimeToNextStepMinutes: null,
            breakdown: { bySource: { TWITTER: 1720, DIRECT: 1400 }, byCountry: { NG: 2100, GB: 980 }, byDevice: { MOBILE: 1620, DESKTOP: 1900 }, byCohort: { "2026-W45": 615 } },
            droppedUsers: [],
          },
        ],
      },
    };
    return (funnels[funnelId] || funnels.TALENT_ONBOARDING) as unknown as T;
  }

  // 19. Analytics: Retention (AD-21)
  if (cleanPath === "/api/v1/admin/retention") {
    const userTypeFilter = (params.get("userType") || "ALL") as RetentionData["userTypeFilter"];
    const res: RetentionData = {
      userTypeFilter,
      dataFreshness: new Date().toISOString(),
      cohorts: [
        {
          cohortWeek: "2026-W40",
          cohortSize: 480,
          weeks: [100, 78, 69, 64, 61, 58, 56, 54, 52].map((pct, i) => ({
            weekNumber: i,
            activeCount: Math.round((480 * pct) / 100),
            retentionPct: pct,
          })),
        },
        {
          cohortWeek: "2026-W41",
          cohortSize: 520,
          weeks: [100, 80, 71, 66, 63, 60, 58, 55].map((pct, i) => ({
            weekNumber: i,
            activeCount: Math.round((520 * pct) / 100),
            retentionPct: pct,
          })),
        },
        {
          cohortWeek: "2026-W42",
          cohortSize: 590,
          weeks: [100, 82, 73, 68, 64, 62, 59].map((pct, i) => ({
            weekNumber: i,
            activeCount: Math.round((590 * pct) / 100),
            retentionPct: pct,
          })),
        },
        {
          cohortWeek: "2026-W43",
          cohortSize: 640,
          weeks: [100, 81, 74, 69, 66, 63].map((pct, i) => ({
            weekNumber: i,
            activeCount: Math.round((640 * pct) / 100),
            retentionPct: pct,
          })),
        },
        {
          cohortWeek: "2026-W44",
          cohortSize: 710,
          weeks: [100, 84, 76, 71, 67].map((pct, i) => ({
            weekNumber: i,
            activeCount: Math.round((710 * pct) / 100),
            retentionPct: pct,
          })),
        },
      ],
    };
    return res as unknown as T;
  }

  // 20. Analytics: Traffic (AD-22)
  if (cleanPath === "/api/v1/admin/traffic") {
    const res: TrafficData = {
      visits: 142800,
      uniqueVisitors: 38400,
      anonymousVisits: 54264,
      signedInVisits: 88536,
      consentRatePct: 84.6,
      consentRateNotice: "Numbers cover visitors who accepted analytics.",
      dailyVisits: [
        { date: "2026-11-06", visits: 18400, uniques: 5100, anonymous: 7200, signedIn: 11200 },
        { date: "2026-11-07", visits: 19200, uniques: 5400, anonymous: 7400, signedIn: 11800 },
        { date: "2026-11-08", visits: 16800, uniques: 4800, anonymous: 6500, signedIn: 10300 },
        { date: "2026-11-09", visits: 21500, uniques: 6100, anonymous: 8100, signedIn: 13400 },
        { date: "2026-11-10", visits: 22900, uniques: 6450, anonymous: 8500, signedIn: 14400 },
        { date: "2026-11-11", visits: 21800, uniques: 6200, anonymous: 8200, signedIn: 13600 },
        { date: "2026-11-12", visits: 22200, uniques: 6350, anonymous: 8364, signedIn: 13836 },
      ],
      topPages: [
        { path: "/talent", views: 48200 },
        { path: "/roster", views: 36400 },
        { path: "/kit/tundekelani", views: 12400 },
        { path: "/pricing", views: 9800 },
      ],
      topReferrers: [
        { referrer: "twitter.com", count: 18400 },
        { referrer: "instagram.com", count: 14200 },
        { referrer: "google.com", count: 8900 },
        { referrer: "linkedin.com", count: 6800 },
      ],
      countries: [
        { country: "NG", count: 78200 },
        { country: "GB", count: 31400 },
        { country: "US", count: 22100 },
        { country: "GH", count: 11100 },
      ],
      deviceClasses: [
        { device: "DESKTOP", count: 83395 },
        { device: "MOBILE", count: 53121 },
        { device: "TABLET", count: 6284 },
      ],
      browsers: [
        { browser: "Chrome", count: 94200 },
        { browser: "Safari", count: 34100 },
        { browser: "Edge", count: 8900 },
        { browser: "Firefox", count: 5600 },
      ],
      topCreatorViews: [
        { creatorId: "usr_creator_01", creatorName: "Tunde Kelani", profileViews: 8420, mediaKitViews: 4190 },
        { creatorId: "usr_creator_02", creatorName: "Amina Yusuf", profileViews: 6180, mediaKitViews: 3120 },
        { creatorId: "usr_creator_03", creatorName: "David Oyelowo", profileViews: 5910, mediaKitViews: 2840 },
      ],
      dataFreshness: new Date().toISOString(),
    };
    return res as unknown as T;
  }

  // 21. Analytics: Feature Adoption (AD-23)
  if (cleanPath === "/api/v1/admin/features") {
    const res: FeatureAdoptionData = {
      features: [
        {
          featureKey: "MEDIA_KIT",
          label: "Media Kit Customizer",
          eligibleAudience: "TALENT",
          eligibleUsers: 3120,
          usedUsers: 2510,
          firstUseRatePct: 80.4,
          repeatUsers: 1862,
          repeatUseRatePct: 74.2,
          weeklyTrend: [
            { week: "W42", count: 1920 },
            { week: "W43", count: 2140 },
            { week: "W44", count: 2380 },
            { week: "W45", count: 2510 },
          ],
          cohortBreakdown: { "2026-W42": 72, "2026-W43": 78, "2026-W44": 84 },
          rank: 1,
        },
        {
          featureKey: "INSTANT_ESCROW",
          label: "Direct Escrow Locking",
          eligibleAudience: "CLIENT",
          eligibleUsers: 7362,
          usedUsers: 3190,
          firstUseRatePct: 43.3,
          repeatUsers: 2584,
          repeatUseRatePct: 81.0,
          weeklyTrend: [
            { week: "W42", count: 2400 },
            { week: "W43", count: 2780 },
            { week: "W44", count: 2990 },
            { week: "W45", count: 3190 },
          ],
          cohortBreakdown: { "2026-W42": 40, "2026-W43": 42, "2026-W44": 46 },
          rank: 2,
        },
        {
          featureKey: "VIDEO_VERIFICATION",
          label: "Waist-Up Video Compliance",
          eligibleAudience: "TALENT",
          eligibleUsers: 3120,
          usedUsers: 2320,
          firstUseRatePct: 74.4,
          repeatUsers: 980,
          repeatUseRatePct: 42.2,
          weeklyTrend: [
            { week: "W42", count: 1650 },
            { week: "W43", count: 1890 },
            { week: "W44", count: 2120 },
            { week: "W45", count: 2320 },
          ],
          cohortBreakdown: { "2026-W42": 68, "2026-W43": 72, "2026-W44": 77 },
          rank: 3,
        },
      ],
      attributesAggregate: {
        completionRatePct: 78.6,
        totalCreators: 3120,
        creatorsWithAttributes: 2452,
        visibilityMix: {
          publicCount: 1680,
          searchableCount: 640,
          privateCount: 132,
        },
      },
      dataFreshness: new Date().toISOString(),
    };
    return res as unknown as T;
  }

  // 22. Analytics: Marketplace Health (AD-24)
  if (cleanPath === "/api/v1/admin/marketplace") {
    const res: MarketplaceHealthData = {
      supplyByNiche: [
        { niche: "VO_ARTIST", count: 840, verifiedPct: 82.1, withRateCardPct: 91.4, withAvailabilityPct: 76.2, withMediaPct: 94.0 },
        { niche: "ACTOR", count: 720, verifiedPct: 78.4, withRateCardPct: 84.0, withAvailabilityPct: 68.5, withMediaPct: 89.2 },
        { niche: "COMEDIAN", count: 540, verifiedPct: 71.2, withRateCardPct: 80.5, withAvailabilityPct: 62.0, withMediaPct: 92.4 },
        { niche: "COMPERE", count: 480, verifiedPct: 75.8, withRateCardPct: 86.2, withAvailabilityPct: 71.0, withMediaPct: 85.0 },
        { niche: "CONTENT_CREATOR", count: 540, verifiedPct: 69.0, withRateCardPct: 79.4, withAvailabilityPct: 64.8, withMediaPct: 96.1 },
      ],
      demandByNicheAndWeek: [
        { niche: "VO_ARTIST", week: "2026-W44", briefsCount: 84, bookingsCount: 52 },
        { niche: "ACTOR", week: "2026-W44", briefsCount: 62, bookingsCount: 38 },
        { niche: "COMEDIAN", week: "2026-W44", briefsCount: 48, bookingsCount: 31 },
        { niche: "COMPERE", week: "2026-W44", briefsCount: 36, bookingsCount: 24 },
      ],
      liquidity: {
        briefsWithin48HoursPct: 94.2,
        briefsWithin48HoursCount: 216,
        totalBriefsCount: 230,
        avgApplicationsPerBrief: 6.4,
        medianHoursToFirstApplication: 1.4,
        selectionRatePct: 68.5,
        capReachedRatePct: 24.0,
      },
      unmetDemand: [
        { niche: "VO_ARTIST", filterKeys: ["language:French", "country:NG"], zeroResultCount: 18 },
        { niche: "MUSICIAN", filterKeys: ["instrument:Saxophone", "city:Abuja"], zeroResultCount: 12 },
      ],
      availabilityUse: {
        activeTalentCount: 2410,
        talentWithCalendarCount: 1785,
        calendarConfiguredPct: 74.1,
        totalSlots: 14200,
        bookedSlots: 3840,
        bookedSlotsPct: 27.0,
      },
      dataFreshness: new Date().toISOString(),
    };
    return res as unknown as T;
  }

  // 23. Alerts (AD-27)
  if (cleanPath === "/api/v1/admin/alerts") {
    const severity = params.get("severity");
    const status = params.get("status");
    const allAlerts: AlertListResponse["alerts"] = [
      {
        id: "alt_01",
        ruleKey: "payout_mismatch_detected",
        severity: "CRITICAL",
        status: "OPEN",
        subjectType: "PAYMENT",
        subjectId: "tx_01",
        subjectUrl: "/payments/tx_01",
        detail: { message: "Daily escrow reconciliation variance of ₦12,500 on batch #492.", delta: 12500, currency: "NGN" },
        firstSeenAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        lastSeenAt: new Date().toISOString(),
        ackedByAdminId: null,
        resolvedAt: null,
      },
      {
        id: "alt_02",
        ruleKey: "r2_storage_threshold_80pct",
        severity: "WARNING",
        status: "ACKNOWLEDGED",
        subjectType: "STORAGE",
        subjectId: "r2_private_bucket",
        subjectUrl: "/health",
        detail: { message: "Cloudflare R2 storage usage at 78.0% (7.8 GB / 10 GB limit).", usedPct: 78 },
        firstSeenAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
        lastSeenAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        ackedByAdminId: "adm_demo_01",
        resolvedAt: null,
      },
      {
        id: "alt_03",
        ruleKey: "verification_sla_reminder",
        severity: "INFO",
        status: "RESOLVED",
        subjectType: "VERIFICATION",
        subjectId: "rec_02",
        subjectUrl: "/verifications/rec_02",
        detail: { message: "Verification recording reviewed within 4h SLA." },
        firstSeenAt: "2026-11-08T10:00:00.000Z",
        lastSeenAt: "2026-11-08T14:00:00.000Z",
        ackedByAdminId: "adm_05",
        resolvedAt: "2026-11-08T14:00:00.000Z",
      },
    ];
    const filtered = allAlerts.filter((a) => {
      if (severity && severity !== "ALL" && a.severity !== severity) return false;
      if (status && status !== "ALL" && a.status !== status) return false;
      return true;
    });
    const res: AlertListResponse = {
      alerts: filtered,
      total: filtered.length,
      openCount: allAlerts.filter((a) => a.status === "OPEN").length,
      criticalCount: allAlerts.filter((a) => a.severity === "CRITICAL" && a.status !== "RESOLVED").length,
      warningCount: allAlerts.filter((a) => a.severity === "WARNING" && a.status !== "RESOLVED").length,
      infoCount: allAlerts.filter((a) => a.severity === "INFO").length,
    };
    return res as unknown as T;
  }

  // 24. System Health (AD-28)
  if (cleanPath === "/api/v1/admin/health") {
    const res: SystemHealthResponse = {
      database: {
        sizeBytes: 359464960,
        sizeFormatted: "342.8 MB",
        limitBytes: 5368709120,
        usagePct: 6.7,
        topTables: [
          { tableName: "ProductEvent", rowCount: 1420500, sizeBytes: 192937984, sizeFormatted: "184 MB" },
          { tableName: "PaymentTransaction", rowCount: 22400, sizeBytes: 37748736, sizeFormatted: "36 MB" },
          { tableName: "Booking", rowCount: 14200, sizeBytes: 29360128, sizeFormatted: "28 MB" },
          { tableName: "User", rowCount: 10482, sizeBytes: 18874368, sizeFormatted: "18 MB" },
        ],
      },
      storage: {
        r2SizeBytes: 8375186227,
        r2SizeFormatted: "7.8 GB",
        limitBytes: 10737418240,
        usagePct: 78.0,
        dailyHistory: [
          { day: "2026-11-08", bytes: 7400000000 },
          { day: "2026-11-09", bytes: 7650000000 },
          { day: "2026-11-10", bytes: 7900000000 },
          { day: "2026-11-11", bytes: 8120000000 },
          { day: "2026-11-12", bytes: 8375186227 },
        ],
      },
      jobs: [
        {
          jobKey: "kpi_daily_rollup",
          lastStartedAt: "2026-11-12T02:00:00.000Z",
          lastFinishedAt: "2026-11-12T02:00:14.000Z",
          lastStatus: "SUCCESS",
          lastError: null,
          nextDueAt: "2026-11-13T02:00:00.000Z",
          durationMs: 14200,
        },
        {
          jobKey: "storage_snapshot",
          lastStartedAt: "2026-11-12T03:00:00.000Z",
          lastFinishedAt: "2026-11-12T03:00:04.000Z",
          lastStatus: "SUCCESS",
          lastError: null,
          nextDueAt: "2026-11-13T03:00:00.000Z",
          durationMs: 4100,
        },
        {
          jobKey: "admin_alerts_tick",
          lastStartedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
          lastFinishedAt: new Date(Date.now() - 1000 * 60 * 2 + 1200).toISOString(),
          lastStatus: "SUCCESS",
          lastError: null,
          nextDueAt: new Date(Date.now() + 1000 * 60 * 3).toISOString(),
          durationMs: 1200,
        },
      ],
      adminQueue: {
        depth: 1,
        pendingCount: 0,
        runningCount: 1,
        failedCount: 0,
        oldestWaitingAgeMinutes: 0,
      },
      materializedViews: {
        lastRefreshedAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
        freshnessMinutes: 14,
      },
      webhooks: [
        { provider: "PAYSTACK", successCount: 1420, failureCount: 2, lastWebhookAt: new Date(Date.now() - 1000 * 60 * 4).toISOString() },
        { provider: "STRIPE", successCount: 840, failureCount: 0, lastWebhookAt: new Date(Date.now() - 1000 * 60 * 11).toISOString() },
        { provider: "DOJAH", successCount: 312, failureCount: 1, lastWebhookAt: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
      ],
      api: {
        errorRatePct: 0.04,
        total5xxEvents: 2,
        total4xxEvents: 48,
        latencyMsMedian: 42,
      },
      externalServices: [
        { name: "Supabase PostgreSQL", status: "HEALTHY", consoleUrl: "https://supabase.com/dashboard", description: "Primary database & transaction pooler" },
        { name: "Vercel Edge & Admin", status: "HEALTHY", consoleUrl: "https://vercel.com/dashboard", description: "Admin Portal hosting & Next.js edge" },
        { name: "Cloudflare R2", status: "HEALTHY", consoleUrl: "https://dash.cloudflare.com", description: "Media deliverables & private exports bucket" },
        { name: "Sentry Telemetry", status: "HEALTHY", consoleUrl: "https://sentry.io", description: "PII-scrubbed error tracking" },
      ],
      dataFreshness: new Date().toISOString(),
    };
    return res as unknown as T;
  }

  // 25. Audit Log (AD-29)
  if (cleanPath === "/api/v1/admin/audit") {
    const res: AdminAuditListResponse = {
      logs: [
        {
          id: "aud_01",
          adminId: "adm_01",
          adminEmail: "superadmin@monologg.com",
          adminRole: "SUPER_ADMIN",
          action: "SETTINGS_VIEWED",
          targetType: "PLATFORM_CONFIG",
          targetId: "cfg_01",
          reason: "Alpha release v1.0.0 verification",
          metadata: { version: "1.0.0-alpha.1" },
          ipHash: "c7f1a4b9e2d8",
          createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        },
        {
          id: "aud_02",
          adminId: "adm_05",
          adminEmail: "compliance@monologg.com",
          adminRole: "COMPLIANCE",
          action: "VERIFICATION_APPROVED",
          targetType: "VerificationRecording",
          targetId: "rec_02",
          reason: "Passed waist-up, lighting and audio guidelines",
          metadata: { durationSec: 54 },
          ipHash: "8b42d1a0c9f3",
          createdAt: "2026-11-08T14:00:00.000Z",
        },
        {
          id: "aud_03",
          adminId: "adm_04",
          adminEmail: "finance@monologg.com",
          adminRole: "FINANCE",
          action: "EXPORT_DOWNLOADED",
          targetType: "AdminExportJob",
          targetId: "exp_01",
          reason: "Monthly finance reconciliation",
          metadata: { rowCount: 10482 },
          ipHash: "4e91c3d2a7b1",
          createdAt: "2026-11-11T16:05:00.000Z",
        },
      ],
      total: 3,
      nextCursor: null,
      hasMore: false,
    };
    return res as unknown as T;
  }

  // 26. Exports (AD-30)
  if (cleanPath === "/api/v1/admin/exports") {
    if (method === "POST") {
      return {
        status: "QUEUED",
        jobId: `exp_${Date.now()}`,
        exportType: "users",
        message: "Export job queued (demo mode).",
      } as unknown as T;
    }
    const res: AdminExportListResponse = {
      exports: [
        {
          id: "exp_01",
          type: "users",
          status: "DONE",
          requestedByAdminId: "adm_01",
          requestedByEmail: "superadmin@monologg.com",
          reason: "Alpha cohort signup audit",
          rowCount: 10482,
          downloadUrl: "#demo-export-users.csv",
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          createdAt: "2026-11-11T16:00:00.000Z",
          completedAt: "2026-11-11T16:00:18.000Z",
          error: null,
          piiUnmasked: false,
        },
        {
          id: "exp_02",
          type: "bookings",
          status: "DONE",
          requestedByAdminId: "adm_02",
          requestedByEmail: "ops@monologg.com",
          reason: "Weekly operations review",
          rowCount: 420,
          downloadUrl: "#demo-export-bookings.csv",
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          createdAt: "2026-11-12T10:00:00.000Z",
          completedAt: "2026-11-12T10:00:06.000Z",
          error: null,
          piiUnmasked: false,
        },
      ],
      total: 2,
    };
    return res as unknown as T;
  }

  // 27. Admin Users (AD-31)
  if (cleanPath === "/api/v1/admin/admins") {
    const res: { admins: (AdminUser & { lastSession: AdminSessionInfo | null })[] } = {
      admins: [
        {
          id: "adm_01",
          email: "superadmin@monologg.com",
          role: "SUPER_ADMIN",
          status: "ACTIVE",
          authProvider: "SUPABASE",
          lastLoginAt: new Date().toISOString(),
          createdAt: "2026-01-01T00:00:00.000Z",
          lastSession: { id: "ses_01", createdAt: new Date().toISOString(), lastSeenAt: new Date().toISOString() },
        },
        {
          id: "adm_02",
          email: "ops@monologg.com",
          role: "OPS",
          status: "ACTIVE",
          authProvider: "SUPABASE",
          lastLoginAt: "2026-11-12T14:30:00.000Z",
          createdAt: "2026-02-01T00:00:00.000Z",
          lastSession: null,
        },
        {
          id: "adm_03",
          email: "support@monologg.com",
          role: "SUPPORT",
          status: "ACTIVE",
          authProvider: "SUPABASE",
          lastLoginAt: "2026-11-12T12:00:00.000Z",
          createdAt: "2026-02-15T00:00:00.000Z",
          lastSession: null,
        },
        {
          id: "adm_04",
          email: "finance@monologg.com",
          role: "FINANCE",
          status: "ACTIVE",
          authProvider: "SUPABASE",
          lastLoginAt: "2026-11-11T18:00:00.000Z",
          createdAt: "2026-03-01T00:00:00.000Z",
          lastSession: null,
        },
        {
          id: "adm_05",
          email: "compliance@monologg.com",
          role: "COMPLIANCE",
          status: "ACTIVE",
          authProvider: "SUPABASE",
          lastLoginAt: "2026-11-12T09:00:00.000Z",
          createdAt: "2026-03-10T00:00:00.000Z",
          lastSession: null,
        },
      ],
    };
    return res as unknown as T;
  }

  // 28. Settings (AD-32)
  if (cleanPath === "/api/v1/admin/settings") {
    const res: PlatformSettingsResponse = {
      version: {
        appVersion: "1.0.0-alpha.1",
        configVersion: "2026.11.12-v1",
        environment: "preview",
        commitHash: "b280846",
      },
      thresholds: {
        databaseLimitBytes: 5368709120,
        databaseLimitMb: 5120,
        storageLimitBytes: 10737418240,
        storageLimitGb: 10,
        resourceAlertThresholdPct: 80,
        fourEyesThresholdNgn: 5000000,
        fourEyesThresholdUsd: 5000,
      },
      slas: {
        urgentTicketHours: 2,
        highTicketHours: 4,
        normalTicketHours: 24,
        lowTicketHours: 48,
        verificationReviewHours: 48,
        disputeStalledDays: 3,
        withdrawalStalledHours: 24,
      },
      retention: {
        analyticsRetentionMonths: 12,
        exportFileRetentionDays: 7,
        auditLogRetention: "PERMANENT",
      },
      featuresCount: 3,
      funnelsCount: 3,
    };
    return res as unknown as T;
  }

  // Fallback for POST mutations
  if (method === "POST" || method === "PUT" || method === "DELETE") {
    return { success: true, status: "ok", message: "Action recorded successfully (demo mode)." } as unknown as T;
  }

  return {} as T;
}
