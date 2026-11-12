/**
 * Monologg Operations Admin Demo Dataset
 *
 * Provides a complete, interconnected, realistic fallback dataset for all 32
 * Admin screens (AD-01 to AD-32) when deployed in demo/preview mode or when
 * the live backend API is unreachable.
 */

export function getMockResponse<T>(path: string, options: RequestInit = {}, token: string | null = null): T {
  const cleanPath = path.split("?")[0].replace(/\/$/, "");
  const method = (options.method || "GET").toUpperCase();

  // Role extraction from token
  let role = "SUPER_ADMIN";
  let email = "superadmin@monologg.com";
  if (token) {
    if (token.includes("ops")) { role = "OPS"; email = "ops@monologg.com"; }
    else if (token.includes("support")) { role = "SUPPORT"; email = "support@monologg.com"; }
    else if (token.includes("finance")) { role = "FINANCE"; email = "finance@monologg.com"; }
    else if (token.includes("compliance")) { role = "COMPLIANCE"; email = "compliance@monologg.com"; }
    else if (token.includes("viewer")) { role = "VIEWER"; email = "viewer@monologg.com"; }
  }

  // 1. Current Admin / Session (AD-01, auth-context)
  if (cleanPath === "/api/v1/admin/me") {
    return {
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
    } as unknown as T;
  }

  // 2. Overview Dashboard (AD-01)
  if (cleanPath === "/api/v1/admin/overview") {
    return {
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
          message: "Daily escrow reconciliation delta within tolerance (0.01% variance).",
          severity: "CRITICAL",
          lastSeenAt: new Date().toISOString(),
        },
      ],
    } as unknown as T;
  }

  // 3. Live Feed (AD-02)
  if (cleanPath === "/api/v1/admin/feed") {
    return {
      events: [
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
          eventGroup: "finance",
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
          eventGroup: "compliance",
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
          name: "withdrawal_requested",
          eventGroup: "finance",
          occurredAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
          actorLabel: "Tunde Kelani",
          userType: "TALENT",
          country: "NG",
          targetType: "user",
          targetId: "usr_creator_01",
          targetUrl: "/withdrawals",
          description: "Requested payout of ₦450,000 to Access Bank (ending in 8912)",
          props: { amount: 450000, currency: "NGN" },
        },
      ],
      nextCursor: null,
      hasMore: false,
      polledAt: new Date().toISOString(),
    } as unknown as T;
  }

  // 4. Users Directory (AD-03)
  if (cleanPath === "/api/v1/admin/users") {
    return {
      users: [
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
      ],
      total: 5,
      nextCursor: null,
      hasMore: false,
    } as unknown as T;
  }

  // 5. User 360 View (AD-04 to AD-08)
  if (cleanPath.startsWith("/api/v1/admin/users/usr_")) {
    const userId = cleanPath.split("/")[5];
    const isClient = userId.includes("client");
    return {
      user: {
        id: userId,
        email: isClient ? "client@monologg-demo.com" : "creator@monologg-demo.com",
        maskedEmail: isClient ? "c***t@monologg-demo.com" : "c***r@monologg-demo.com",
        phone: "+234 803 *** 1234",
        type: isClient ? "CLIENT" : "TALENT",
        userType: isClient ? "CLIENT" : "TALENT",
        authProvider: "SUPABASE",
        accountOrigin: "DIRECT",
        createdAt: "2026-02-10T12:00:00.000Z",
        lastActiveAt: new Date().toISOString(),
        country: isClient ? "NG" : "GB",
        city: isClient ? "Lagos" : "London",
        tags: ["verified-active", "alpha-user"],
        suspended: false,
        suspendedAt: null,
        suspendedReason: null,
      },
      profile: {
        displayName: isClient ? "Acme Studios Worldwide" : "Tunde Kelani",
        handle: isClient ? "acmestudios" : "tundekelani",
        bio: isClient
          ? "Global brand production studio managing digital commercial campaigns."
          : "Professional cinematic director, voiceover artist, and cultural compere.",
        avatarUrl: null,
        niche: isClient ? null : "VO_ARTIST",
        tier: "PRO",
        rating: 4.9,
        reviewsCount: 38,
        mediaKitUrl: `https://monologg.com/kit/${isClient ? "acmestudios" : "tundekelani"}`,
      },
      verification: {
        state: isClient ? "UNVERIFIED" : "VERIFIED",
        recordingUrl: null,
        verifiedAt: "2026-02-15T14:30:00.000Z",
        reviewedBy: "compliance@monologg.com",
        checklistPassed: true,
      },
      kycCheck: {
        provider: "DOJAH",
        status: "VERIFIED",
        attempts: 1,
        failureCode: null,
        lastCheckedAt: "2026-02-14T11:00:00.000Z",
      },
      metrics: {
        totalGmv: isClient ? 14200000 : 8900000,
        completedBookings: 18,
        activeBookings: 2,
        disputeRate: 0.0,
        averageResponseMinutes: 24,
      },
      bookings: [
        {
          id: "bk_01",
          title: "Voiceover Brand Campaign Q4",
          status: "ESCROW_LOCKED",
          amount: 1200000,
          currency: "NGN",
          createdAt: "2026-11-01T10:00:00.000Z",
        },
      ],
      tickets: [],
      notes: [
        {
          id: "note_01",
          authorEmail: "ops@monologg.com",
          body: "Verified talent via video compliance queue. Clean audio samples.",
          createdAt: "2026-02-15T14:35:00.000Z",
        },
      ],
      auditTimeline: [
        {
          id: "aud_01",
          action: "USER_VERIFIED",
          actor: "compliance@monologg.com",
          occurredAt: "2026-02-15T14:30:00.000Z",
          details: "Waist-up video verification approved.",
        },
      ],
    } as unknown as T;
  }

  // 6. Bookings List & Detail (AD-09 to AD-13)
  if (cleanPath === "/api/v1/admin/bookings") {
    return {
      bookings: [
        {
          id: "bk_01",
          orderNumber: "ORD-2026-0042",
          title: "Voiceover Brand Campaign Q4",
          state: "ESCROW_LOCKED",
          origin: "DIRECT",
          talent: { id: "usr_creator_01", name: "Tunde Kelani", handle: "tundekelani" },
          client: { id: "usr_client_01", name: "Flutterwave Marketing", companyName: "Flutterwave" },
          budget: 1200000,
          currency: "NGN",
          niche: "VO_ARTIST",
          createdAt: "2026-11-01T10:00:00.000Z",
          updatedAt: "2026-11-12T14:00:00.000Z",
          milestonesCount: 3,
          hasDispute: false,
          stuck: false,
        },
        {
          id: "bk_02",
          orderNumber: "ORD-2026-0039",
          title: "Series Narration Pilot",
          state: "DELIVERABLES_PROVIDED",
          origin: "MARKETPLACE",
          talent: { id: "usr_creator_03", name: "David Oyelowo", handle: "davidoyelowo" },
          client: { id: "usr_client_02", name: "Netflix EMEA", companyName: "Netflix" },
          budget: 3500,
          currency: "GBP",
          niche: "ACTOR",
          createdAt: "2026-10-28T09:00:00.000Z",
          updatedAt: "2026-11-10T16:30:00.000Z",
          milestonesCount: 2,
          hasDispute: true,
          stuck: true,
        },
        {
          id: "bk_03",
          orderNumber: "ORD-2026-0028",
          title: "Social Comedy Reel Promo",
          state: "PAYMENT_RELEASED",
          origin: "DIRECT",
          talent: { id: "usr_creator_02", name: "Amina Yusuf", handle: "aminayusuf" },
          client: { id: "usr_client_03", name: "MTN Digital", companyName: "MTN Nigeria" },
          budget: 650000,
          currency: "NGN",
          niche: "COMEDIAN",
          createdAt: "2026-10-15T11:20:00.000Z",
          updatedAt: "2026-10-25T18:00:00.000Z",
          milestonesCount: 1,
          hasDispute: false,
          stuck: false,
        },
      ],
      total: 3,
      nextCursor: null,
      hasMore: false,
    } as unknown as T;
  }

  if (cleanPath.startsWith("/api/v1/admin/bookings/bk_")) {
    return {
      booking: {
        id: "bk_01",
        orderNumber: "ORD-2026-0042",
        title: "Voiceover Brand Campaign Q4",
        state: "ESCROW_LOCKED",
        origin: "DIRECT",
        talent: { id: "usr_creator_01", name: "Tunde Kelani", email: "tunde.kelani@example.com" },
        client: { id: "usr_client_01", name: "Flutterwave Marketing", email: "marketing@flutterwave.example.com" },
        budget: 1200000,
        talentFee: 132000,
        clientFee: 180000,
        netTalentPayout: 1068000,
        currency: "NGN",
        niche: "VO_ARTIST",
        brief: "Record 60-second broadcast voiceover in warm, professional, authentic African tone.",
        createdAt: "2026-11-01T10:00:00.000Z",
        updatedAt: "2026-11-12T14:00:00.000Z",
        hasDispute: false,
        stuck: false,
      },
      milestones: [
        { id: "ms_01", title: "Script Read & First Draft", amount: 400000, status: "APPROVED" },
        { id: "ms_02", title: "Master Studio Audio Cut", amount: 800000, status: "ESCROW_LOCKED" },
      ],
      deliverables: [
        {
          id: "del_01",
          fileName: "Flutterwave_Q4_Master_v2.wav",
          fileSize: "48.2 MB",
          uploadedAt: "2026-11-10T12:00:00.000Z",
          signedDownloadUrl: "#",
        },
      ],
      conversation: [
        {
          id: "msg_01",
          sender: "Flutterwave Marketing",
          body: "Hi Tunde, we loved the first cut! Could we get the second take with slightly more upbeat energy?",
          sentAt: "2026-11-08T15:00:00.000Z",
        },
        {
          id: "msg_02",
          sender: "Tunde Kelani",
          body: "Absolutely! Just uploaded Master v2 with that exact cadence. Let me know how it sits in the edit.",
          sentAt: "2026-11-10T12:05:00.000Z",
        },
      ],
    } as unknown as T;
  }

  // 7. Finance & Transactions (AD-14 to AD-16)
  if (cleanPath === "/api/v1/admin/payments") {
    return {
      payments: [
        {
          id: "tx_01",
          reference: "TX-2026-0981",
          bookingId: "bk_01",
          bookingTitle: "Voiceover Brand Campaign Q4",
          amount: 1200000,
          currency: "NGN",
          status: "SUCCESS",
          provider: "PAYSTACK",
          payerEmail: "marketing@flutterwave.example.com",
          recipientEmail: "tunde.kelani@example.com",
          createdAt: "2026-11-01T10:02:00.000Z",
        },
        {
          id: "tx_02",
          reference: "TX-2026-0975",
          bookingId: "bk_02",
          bookingTitle: "Series Narration Pilot",
          amount: 3500,
          currency: "GBP",
          status: "SUCCESS",
          provider: "STRIPE",
          payerEmail: "emea-talent@netflix.example.com",
          recipientEmail: "david.oyelowo@example.com",
          createdAt: "2026-10-28T09:05:00.000Z",
        },
        {
          id: "tx_03",
          reference: "TX-2026-0952",
          bookingId: "bk_03",
          bookingTitle: "Social Comedy Reel Promo",
          amount: 650000,
          currency: "NGN",
          status: "SUCCESS",
          provider: "PAYSTACK",
          payerEmail: "digital@mtn.example.com",
          recipientEmail: "amina.yusuf@example.com",
          createdAt: "2026-10-15T11:22:00.000Z",
        },
      ],
      total: 3,
      nextCursor: null,
      hasMore: false,
    } as unknown as T;
  }

  if (cleanPath === "/api/v1/admin/finance/earnings") {
    return {
      earnings: [
        {
          talentId: "usr_creator_01",
          talentName: "Tunde Kelani",
          handle: "tundekelani",
          currency: "NGN",
          totalEarned: 18450000,
          escrowHeld: 1068000,
          availableBalance: 4500000,
          withdrawnTotal: 12882000,
          lastPayoutAt: "2026-10-28T14:00:00.000Z",
        },
        {
          talentId: "usr_creator_02",
          talentName: "Amina Yusuf",
          handle: "aminayusuf",
          currency: "NGN",
          totalEarned: 11200000,
          escrowHeld: 0,
          availableBalance: 2400000,
          withdrawnTotal: 8800000,
          lastPayoutAt: "2026-10-20T11:00:00.000Z",
        },
      ],
    } as unknown as T;
  }

  if (cleanPath === "/api/v1/admin/withdrawals") {
    return {
      withdrawals: [
        {
          id: "wth_01",
          talentId: "usr_creator_01",
          talentName: "Tunde Kelani",
          amount: 450000,
          currency: "NGN",
          status: "PENDING",
          bankName: "Access Bank Nigeria",
          accountNumberMasked: "****8912",
          requestedAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
        },
        {
          id: "wth_02",
          talentId: "usr_creator_02",
          talentName: "Amina Yusuf",
          amount: 600000,
          currency: "NGN",
          status: "COMPLETED",
          bankName: "Guaranty Trust Bank",
          accountNumberMasked: "****3341",
          requestedAt: "2026-10-20T10:00:00.000Z",
        },
      ],
    } as unknown as T;
  }

  // 8. Support Tickets (AD-17 & AD-18)
  if (cleanPath === "/api/v1/admin/tickets") {
    return {
      tickets: [
        {
          id: "tkt_01",
          ticketNumber: "TCK-1042",
          subject: "Inquiry regarding multi-currency payout processing time",
          status: "OPEN",
          priority: "HIGH",
          category: "PAYMENTS",
          source: "IN_APP",
          user: { id: "usr_creator_01", name: "Tunde Kelani", email: "tunde.kelani@example.com" },
          assignedAdmin: null,
          createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
          slaBreached: false,
          slaTargetMinutes: 240,
        },
        {
          id: "tkt_02",
          ticketNumber: "TCK-1038",
          subject: "Request for invoice PDF re-generation",
          status: "RESOLVED",
          priority: "MEDIUM",
          category: "BILLING",
          source: "EMAIL",
          user: { id: "usr_client_01", name: "Flutterwave Marketing", email: "marketing@flutterwave.example.com" },
          assignedAdmin: { id: "adm_01", email: "support@monologg.com" },
          createdAt: "2026-11-05T14:00:00.000Z",
          slaBreached: false,
          slaTargetMinutes: 480,
        },
      ],
      total: 2,
    } as unknown as T;
  }

  if (cleanPath.startsWith("/api/v1/admin/tickets/tkt_")) {
    return {
      ticket: {
        id: "tkt_01",
        ticketNumber: "TCK-1042",
        subject: "Inquiry regarding multi-currency payout processing time",
        status: "OPEN",
        priority: "HIGH",
        category: "PAYMENTS",
        source: "IN_APP",
        user: { id: "usr_creator_01", name: "Tunde Kelani", email: "tunde.kelani@example.com" },
        assignedAdmin: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        slaBreached: false,
      },
      messages: [
        {
          id: "tmsg_01",
          sender: "Tunde Kelani",
          isStaff: false,
          body: "Hello Support Team, I initiated a withdrawal to my NGN account this morning. Could you confirm the expected clearing window?",
          createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        },
      ],
    } as unknown as T;
  }

  // 9. Disputes Queue & Resolution (AD-25)
  if (cleanPath === "/api/v1/admin/disputes") {
    return {
      disputes: [
        {
          id: "dsp_01",
          disputeNumber: "DSP-2026-004",
          bookingId: "bk_02",
          bookingTitle: "Series Narration Pilot",
          initiator: "CLIENT",
          client: { id: "usr_client_02", name: "Netflix EMEA" },
          talent: { id: "usr_creator_03", name: "David Oyelowo" },
          status: "IN_REVIEW",
          disputedAmount: 3500,
          currency: "GBP",
          reason: "Deliverable format and revision count disagreement",
          createdAt: "2026-11-10T14:00:00.000Z",
          ageHours: 56,
          slaTargetHours: 72,
        },
      ],
      total: 1,
    } as unknown as T;
  }

  if (cleanPath.startsWith("/api/v1/admin/disputes/dsp_")) {
    return {
      dispute: {
        id: "dsp_01",
        disputeNumber: "DSP-2026-004",
        bookingId: "bk_02",
        bookingTitle: "Series Narration Pilot",
        status: "IN_REVIEW",
        disputedAmount: 3500,
        currency: "GBP",
        reason: "Deliverable format and revision count disagreement",
        resolution: null,
        resolutionNote: null,
        createdAt: "2026-11-10T14:00:00.000Z",
        booking: {
          id: "bk_02",
          budget: 3500,
          currency: "GBP",
          client: { name: "Netflix EMEA", email: "emea-talent@netflix.example.com" },
          talent: { name: "David Oyelowo", email: "david.oyelowo@example.com" },
        },
      },
      evidence: [
        {
          id: "ev_01",
          submittedBy: "CLIENT",
          description: "Original brief required 48kHz / 24-bit uncompressed WAV files.",
          createdAt: "2026-11-10T14:15:00.000Z",
        },
      ],
    } as unknown as T;
  }

  // 10. Verification Queue (AD-26)
  if (cleanPath === "/api/v1/admin/verifications") {
    return {
      recordings: [
        {
          id: "rec_01",
          talent: {
            id: "usr_creator_03",
            name: "David Oyelowo",
            handle: "davidoyelowo",
            niche: "ACTOR",
            email: "david.oyelowo@example.com",
          },
          status: "UPLOADED",
          durationSec: 42,
          videoUrl: "#",
          uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
          ageHours: 18,
          slaHoursRemaining: 30,
        },
      ],
      total: 1,
    } as unknown as T;
  }

  if (cleanPath === "/api/v1/admin/verifications/metrics") {
    return {
      medianReviewMinutes: 24,
      approvalRate: 92.5,
      pendingCount: 1,
      overdueCount: 0,
    } as unknown as T;
  }

  if (cleanPath.startsWith("/api/v1/admin/verifications/rec_")) {
    return {
      recording: {
        id: "rec_01",
        talentId: "usr_creator_03",
        talentName: "David Oyelowo",
        handle: "davidoyelowo",
        niche: "ACTOR",
        status: "UPLOADED",
        durationSec: 42,
        signedUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
        guidelines: {
          waistUp: true,
          faceAndHandsVisible: true,
          goodLighting: true,
          naturalGestures: true,
          under90Sec: true,
        },
      },
      kycSummary: {
        provider: "DOJAH",
        status: "VERIFIED",
        attempts: 1,
        failureCode: null,
      },
    } as unknown as T;
  }

  // 11. Analytics Screens (AD-19 to AD-24)
  if (cleanPath === "/api/v1/admin/acquisition") {
    return {
      sources: [
        { source: "DIRECT", signups: 4250, activationRate: 68.2, firstBookingRate: 44.1 },
        { source: "TWITTER", signups: 2840, activationRate: 54.0, firstBookingRate: 31.8 },
        { source: "INSTAGRAM", signups: 1980, activationRate: 61.5, firstBookingRate: 38.2 },
        { source: "REFERRAL", signups: 920, activationRate: 82.4, firstBookingRate: 64.0 },
        { source: "UNKNOWN_NO_CONSENT", signups: 492, activationRate: 48.0, firstBookingRate: 22.0 },
      ],
      topReferrers: [
        { domain: "twitter.com", visits: 18400, signups: 2840 },
        { domain: "instagram.com", visits: 14200, signups: 1980 },
        { domain: "linkedin.com", visits: 6800, signups: 820 },
      ],
      devices: [
        { deviceClass: "DESKTOP", sharePct: 58.4 },
        { deviceClass: "MOBILE", sharePct: 37.2 },
        { deviceClass: "TABLET", sharePct: 4.4 },
      ],
    } as unknown as T;
  }

  if (cleanPath === "/api/v1/admin/funnels") {
    return {
      funnels: [
        {
          id: "TALENT_ONBOARDING",
          name: "Talent Onboarding Funnel",
          steps: [
            { step: "Signup", count: 3120, conversionPct: 100, medianSecondsToNext: 120 },
            { step: "Complete Profile", count: 2840, conversionPct: 91.0, medianSecondsToNext: 360 },
            { step: "Upload Media Kit", count: 2510, conversionPct: 80.4, medianSecondsToNext: 900 },
            { step: "Video Verification", count: 2320, conversionPct: 74.3, medianSecondsToNext: 1800 },
            { step: "First Escrow Booking", count: 1680, conversionPct: 53.8, medianSecondsToNext: 43200 },
          ],
        },
      ],
    } as unknown as T;
  }

  if (cleanPath === "/api/v1/admin/retention") {
    return {
      cohorts: [
        { cohort: "2026-W40", size: 480, weeks: [100, 78, 69, 64, 61, 58, 56, 54, 52] },
        { cohort: "2026-W41", size: 520, weeks: [100, 80, 71, 66, 63, 60, 58, 55] },
        { cohort: "2026-W42", size: 590, weeks: [100, 82, 73, 68, 64, 62, 59] },
        { cohort: "2026-W43", size: 640, weeks: [100, 81, 74, 69, 66, 63] },
        { cohort: "2026-W44", size: 710, weeks: [100, 84, 76, 71, 67] },
      ],
    } as unknown as T;
  }

  if (cleanPath === "/api/v1/admin/traffic") {
    return {
      consentRatePct: 84.6,
      visits: 142800,
      uniqueVisitors: 38400,
      signedInRatio: 0.62,
      topPages: [
        { path: "/talent", views: 48200 },
        { path: "/roster", views: 36400 },
        { path: "/kit/tundekelani", views: 12400 },
        { path: "/pricing", views: 9800 },
      ],
    } as unknown as T;
  }

  if (cleanPath === "/api/v1/admin/features") {
    return {
      features: [
        { key: "MEDIA_KIT", label: "Media Kit Customizer", eligible: 3120, used: 2510, repeatRate: 74.2 },
        { key: "INSTANT_ESCROW", label: "Direct Escrow Locking", eligible: 7362, used: 3190, repeatRate: 81.0 },
        { key: "VIDEO_VERIFICATION", label: "Video Compliance Queue", eligible: 3120, used: 2320, repeatRate: 42.0 },
      ],
    } as unknown as T;
  }

  if (cleanPath === "/api/v1/admin/marketplace") {
    return {
      liquidity48hPct: 94.2,
      timeToFirstApplicationHours: 1.4,
      supplyByNiche: [
        { niche: "VO_ARTIST", count: 840 },
        { niche: "ACTOR", count: 720 },
        { niche: "COMEDIAN", count: 540 },
        { niche: "COMPERE", count: 480 },
        { niche: "CONTENT_CREATOR", count: 540 },
      ],
      zeroResultSearches: [
        { query: "French speaking VO", count: 18 },
        { query: "Saxophonist wedding", count: 12 },
      ],
    } as unknown as T;
  }

  // 12. Alerts Engine (AD-27)
  if (cleanPath === "/api/v1/admin/alerts") {
    return {
      alerts: [
        {
          id: "alt_01",
          ruleKey: "payout_mismatch_detected",
          severity: "CRITICAL",
          status: "OPEN",
          message: "Daily escrow reconciliation delta within tolerance (0.01% variance).",
          lastSeenAt: new Date().toISOString(),
          subjectType: "FINANCE",
          subjectId: "REC-2026-11",
        },
        {
          id: "alt_02",
          ruleKey: "r2_storage_threshold",
          severity: "WARNING",
          status: "ACKNOWLEDGED",
          message: "Cloudflare R2 storage currently at 6.2 GB (configured limit 10 GB).",
          lastSeenAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          subjectType: "STORAGE",
          subjectId: "r2_private_bucket",
        },
      ],
    } as unknown as T;
  }

  // 13. System Health (AD-28)
  if (cleanPath === "/api/v1/admin/health") {
    return {
      database: {
        sizeBytes: 359464960,
        sizeHuman: "342.8 MB",
        topTables: [
          { name: "ProductEvent", rowCount: 1420500, sizeHuman: "184 MB" },
          { name: "Booking", rowCount: 14200, sizeHuman: "28 MB" },
          { name: "PaymentTransaction", rowCount: 22400, sizeHuman: "36 MB" },
          { name: "User", rowCount: 10482, sizeHuman: "18 MB" },
        ],
      },
      storage: {
        privateBytes: 6657199360,
        privateHuman: "6.2 GB",
        publicBytes: 1717986918,
        publicHuman: "1.6 GB",
        limitBytes: 10737418240,
        usedPct: 78.0,
      },
      jobs: [
        { name: "kpi_daily_rollup", lastRunAt: "2026-11-12T02:00:00.000Z", status: "SUCCESS", nextRunAt: "2026-11-13T02:00:00.000Z" },
        { name: "storage_snapshot", lastRunAt: "2026-11-12T03:00:00.000Z", status: "SUCCESS", nextRunAt: "2026-11-13T03:00:00.000Z" },
        { name: "admin_alerts_tick", lastRunAt: new Date().toISOString(), status: "SUCCESS", nextRunAt: new Date(Date.now() + 1000 * 60 * 5).toISOString() },
      ],
      apiLatencyMs: 42,
      dataLastRefreshedMinutesAgo: 1,
    } as unknown as T;
  }

  // 14. Audit Log (AD-29)
  if (cleanPath === "/api/v1/admin/audit") {
    return {
      logs: [
        {
          id: "aud_01",
          adminEmail: "superadmin@monologg.com",
          adminRole: "SUPER_ADMIN",
          action: "SETTINGS_UPDATE",
          targetType: "PLATFORM_CONFIG",
          targetId: "cfg_01",
          ipAddress: "197.210.84.12",
          occurredAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          details: "Verified production release hardening config v1.0.0-alpha.1",
        },
        {
          id: "aud_02",
          adminEmail: "compliance@monologg.com",
          adminRole: "COMPLIANCE",
          action: "VERIFICATION_APPROVED",
          targetType: "USER",
          targetId: "usr_creator_01",
          ipAddress: "197.210.84.14",
          occurredAt: "2026-11-10T12:00:00.000Z",
          details: "Talent verification recording approved.",
        },
      ],
      total: 2,
    } as unknown as T;
  }

  // 15. Exports (AD-30)
  if (cleanPath === "/api/v1/admin/exports") {
    return {
      exports: [
        {
          id: "exp_01",
          type: "USERS",
          status: "COMPLETED",
          rowCount: 10482,
          downloadUrl: "#",
          requestedBy: "superadmin@monologg.com",
          createdAt: "2026-11-11T16:00:00.000Z",
          expiresAt: "2026-11-18T16:00:00.000Z",
        },
        {
          id: "exp_02",
          type: "BOOKINGS",
          status: "COMPLETED",
          rowCount: 420,
          downloadUrl: "#",
          requestedBy: "ops@monologg.com",
          createdAt: "2026-11-12T10:00:00.000Z",
          expiresAt: "2026-11-19T10:00:00.000Z",
        },
      ],
    } as unknown as T;
  }

  // 16. Admin Users (AD-31)
  if (cleanPath === "/api/v1/admin/admins") {
    return {
      admins: [
        {
          id: "adm_01",
          email: "superadmin@monologg.com",
          role: "SUPER_ADMIN",
          status: "ACTIVE",
          authProvider: "SUPABASE",
          lastLoginAt: new Date().toISOString(),
          createdAt: "2026-01-01T00:00:00.000Z",
          lastSession: {
            id: "ses_01",
            createdAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
          },
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
    } as unknown as T;
  }

  // 17. Settings (AD-32)
  if (cleanPath === "/api/v1/admin/settings") {
    return {
      configVersion: "1.0.0-alpha.1",
      thresholds: {
        fourEyesAmountNgn: 5000000,
        fourEyesAmountUsd: 5000,
        talentFeePercent: 11,
        clientFeePercent: 15,
      },
      slas: {
        verificationReviewHours: 48,
        disputeResolutionHours: 72,
        supportTicketHours: 24,
      },
      features: [
        { key: "MEDIA_KIT", label: "Media Kit", active: true },
        { key: "DIRECT_BOOKING", label: "Direct Booking Escrow", active: true },
        { key: "VIDEO_VERIFICATION", label: "Video Verification Queue", active: true },
      ],
    } as unknown as T;
  }

  // Generic fallback for any POST action (ack, resolve, invite, suspend, etc.)
  if (method === "POST" || method === "PUT" || method === "DELETE") {
    return { success: true, message: "Action recorded successfully (demo mode)." } as unknown as T;
  }

  return {} as T;
}
