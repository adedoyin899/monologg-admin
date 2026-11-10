import { PrismaClient, UserType, BookingState } from "@prisma/client";
import { adminRoPrisma } from "../../db/adminRoClient.js";

export interface KpiFilterOptions {
  startDate?: Date;
  endDate?: Date;
  userType?: UserType;
  cohortTag?: string;
  currency?: string;
}

export interface SignupKpi {
  total: number;
  byUserType: Record<string, number>;
  byAccountOrigin: Record<string, number>;
}

export interface FunnelStep {
  step: string;
  count: number;
  conversionFromPrevious: number; // 0 to 1
  dropOffRate: number; // 0 to 1
}

export interface MonetaryKpiByCurrency {
  currency: string;
  gmv: bigint;
  escrowHeld: bigint;
  released: bigint;
  platformRevenue: bigint;
  talentEarned: bigint;
  talentAvailable: bigint;
  takeRate: number; // 0 to 1
}

export interface KpiSnapshot {
  signups: SignupKpi;
  emailVerified: number;
  talentOnboarded: number;
  talentActivated: number;
  clientActivated: number;
  identityVerified: number;
  verificationRecordingApproved: number;
  activeUsers: {
    dau: number;
    wau: number;
    mau: number;
  };
  timeToFirstBookingHours: {
    median: number | null;
    p90: number | null;
  };
  bookingFunnel: FunnelStep[];
  moneyByCurrency: MonetaryKpiByCurrency[];
  disputeRate: number;
  paymentFailureRate: number;
}

export class KpiService {
  constructor(private readonly db: PrismaClient = adminRoPrisma) {}

  /**
   * Helper to construct Prisma User filter excluding test users and admins.
   */
  private getUserBaseFilter(options?: KpiFilterOptions) {
    const filter: any = {
      isTestUser: false,
    };
    if (options?.userType) {
      filter.userType = options.userType;
    }
    if (options?.startDate || options?.endDate) {
      filter.createdAt = {};
      if (options.startDate) filter.createdAt.gte = options.startDate;
      if (options.endDate) filter.createdAt.lte = options.endDate;
    }
    return filter;
  }

  /**
   * 1. Signup KPI: Total User rows created, split by userType and accountOrigin.
   */
  async getSignups(options?: KpiFilterOptions): Promise<SignupKpi> {
    const where = this.getUserBaseFilter(options);
    const users = await this.db.user.findMany({
      where,
      select: {
        userType: true,
        accountOrigin: true,
      },
    });

    const byUserType: Record<string, number> = {};
    const byAccountOrigin: Record<string, number> = {};

    for (const u of users) {
      byUserType[u.userType] = (byUserType[u.userType] || 0) + 1;
      byAccountOrigin[u.accountOrigin] = (byAccountOrigin[u.accountOrigin] || 0) + 1;
    }

    return {
      total: users.length,
      byUserType,
      byAccountOrigin,
    };
  }

  /**
   * 2. Email Verified: User.emailVerified = true or Google Auth.
   */
  async getEmailVerifiedCount(options?: KpiFilterOptions): Promise<number> {
    const where = {
      ...this.getUserBaseFilter(options),
      emailVerified: true,
    };
    return await this.db.user.count({ where });
  }

  /**
   * 3. Talent Onboarded: Creator with name, niche, location set.
   */
  async getTalentOnboardedCount(options?: KpiFilterOptions): Promise<number> {
    const userFilter = this.getUserBaseFilter(options);
    return await this.db.creator.count({
      where: {
        user: userFilter,
        name: { not: "" },
        location: { not: "" },
      },
    });
  }

  /**
   * 4. Talent Activated: Onboarded + >=1 RateCard + >=1 MediaAsset.
   */
  async getTalentActivatedCount(options?: KpiFilterOptions): Promise<number> {
    const userFilter = this.getUserBaseFilter(options);
    return await this.db.creator.count({
      where: {
        user: userFilter,
        name: { not: "" },
        location: { not: "" },
        rateCards: { some: {} },
        media: { some: {} },
      },
    });
  }

  /**
   * 5. Client Activated: Client who created a Brief or started a booking.
   */
  async getClientActivatedCount(options?: KpiFilterOptions): Promise<number> {
    const userFilter = this.getUserBaseFilter(options);
    return await this.db.client.count({
      where: {
        user: userFilter,
        OR: [
          { briefs: { some: {} } },
          { bookings: { some: {} } },
        ],
      },
    });
  }

  /**
   * 6. Verified (Identity): Creator.verification = VERIFIED (KYC only).
   */
  async getIdentityVerifiedCount(options?: KpiFilterOptions): Promise<number> {
    const userFilter = this.getUserBaseFilter(options);
    return await this.db.creator.count({
      where: {
        user: userFilter,
        verification: "VERIFIED",
      },
    });
  }

  /**
   * 7. Verification Recording Approved: VerificationRecording.status = APPROVED.
   */
  async getVerificationRecordingApprovedCount(options?: KpiFilterOptions): Promise<number> {
    const where: any = {
      status: "APPROVED",
      creator: {
        user: this.getUserBaseFilter(options),
      },
    };
    return await this.db.verificationRecording.count({ where });
  }

  /**
   * 8. DAU / WAU / MAU: Distinct users with authenticated ProductEvent in last 1, 7, 28 days.
   */
  async getActiveUsers(now = new Date()): Promise<{ dau: number; wau: number; mau: number }> {
    const day1Ago = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const day7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const day28Ago = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const [dauRows, wauRows, mauRows] = await Promise.all([
      this.db.productEvent.findMany({
        where: {
          occurredAt: { gte: day1Ago },
          actorType: "USER",
          userId: { not: null },
        },
        distinct: ["userId"],
        select: { userId: true },
      }),
      this.db.productEvent.findMany({
        where: {
          occurredAt: { gte: day7Ago },
          actorType: "USER",
          userId: { not: null },
        },
        distinct: ["userId"],
        select: { userId: true },
      }),
      this.db.productEvent.findMany({
        where: {
          occurredAt: { gte: day28Ago },
          actorType: "USER",
          userId: { not: null },
        },
        distinct: ["userId"],
        select: { userId: true },
      }),
    ]);

    return {
      dau: dauRows.length,
      wau: wauRows.length,
      mau: mauRows.length,
    };
  }

  /**
   * 9. Time to First Booking: First booking createdAt - user createdAt.
   * Median and 90th percentile in hours.
   */
  async getTimeToFirstBooking(options?: KpiFilterOptions): Promise<{ median: number | null; p90: number | null }> {
    const userFilter = this.getUserBaseFilter(options);
    const usersWithBookings = await this.db.user.findMany({
      where: {
        ...userFilter,
        OR: [
          { client: { bookings: { some: {} } } },
          { creator: { bookings: { some: {} } } },
        ],
      },
      select: {
        id: true,
        createdAt: true,
        client: {
          select: {
            bookings: {
              select: { createdAt: true },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        },
        creator: {
          select: {
            bookings: {
              select: { createdAt: true },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        },
      },
    });

    const diffHours: number[] = [];

    for (const u of usersWithBookings) {
      const firstClientBooking = u.client?.bookings[0]?.createdAt;
      const firstCreatorBooking = u.creator?.bookings[0]?.createdAt;
      const firstDate = firstClientBooking && firstCreatorBooking
        ? (firstClientBooking < firstCreatorBooking ? firstClientBooking : firstCreatorBooking)
        : (firstClientBooking || firstCreatorBooking);

      if (firstDate) {
        const ms = firstDate.getTime() - u.createdAt.getTime();
        if (ms >= 0) {
          diffHours.push(ms / (1000 * 60 * 60));
        }
      }
    }

    if (diffHours.length === 0) {
      return { median: null, p90: null };
    }

    diffHours.sort((a, b) => a - b);
    const medianIndex = Math.floor(diffHours.length / 2);
    const p90Index = Math.min(Math.floor(diffHours.length * 0.9), diffHours.length - 1);

    return {
      median: Math.round(diffHours[medianIndex] * 10) / 10,
      p90: Math.round(diffHours[p90Index] * 10) / 10,
    };
  }

  /**
   * 10. Booking Funnel: public_profile_viewed -> booking_started -> slot_selected -> payment_initiated -> escrow_locked
   */
  async getBookingFunnel(options?: KpiFilterOptions): Promise<FunnelStep[]> {
    const timeFilter: any = {};
    if (options?.startDate) timeFilter.gte = options.startDate;
    if (options?.endDate) timeFilter.lte = options.endDate;

    const eventNames = [
      "public_profile_viewed",
      "booking_started",
      "slot_selected",
      "payment_initiated",
      "escrow_locked",
    ];

    const counts = await Promise.all(
      eventNames.map(async (name) => {
        return await this.db.productEvent.count({
          where: {
            name,
            ...(Object.keys(timeFilter).length > 0 ? { occurredAt: timeFilter } : {}),
          },
        });
      })
    );

    const steps: FunnelStep[] = [];
    for (let i = 0; i < eventNames.length; i++) {
      const count = counts[i];
      let conversionFromPrevious = 1.0;
      let dropOffRate = 0.0;

      if (i > 0) {
        const prevCount = counts[i - 1];
        if (prevCount > 0) {
          conversionFromPrevious = Math.min(count / prevCount, 1.0);
          dropOffRate = 1.0 - conversionFromPrevious;
        } else {
          conversionFromPrevious = 0.0;
          dropOffRate = 1.0;
        }
      }

      steps.push({
        step: eventNames[i],
        count,
        conversionFromPrevious: Math.round(conversionFromPrevious * 1000) / 1000,
        dropOffRate: Math.round(dropOffRate * 1000) / 1000,
      });
    }

    return steps;
  }

  /**
   * 11. Monetary KPIs strictly per currency (NEVER summed across currencies):
   * - GMV: Sum of Booking.baseAmount for bookings that reached ESCROW_LOCKED or beyond.
   * - Escrow held now: Sum of Payment.amount where escrowHeld = true and status = HELD.
   * - Released: Sum of baseAmount for PAYMENT_RELEASED / COMPLETED.
   * - Platform revenue: talentFeeAmount + clientFeeAmount on PAYMENT_RELEASED / COMPLETED.
   * - Talent earned: baseAmount - talentFeeAmount on PAYMENT_RELEASED / COMPLETED.
   * - Talent available: Talent earned - (completed + pending withdrawals).
   * - Take rate: Platform revenue / GMV.
   */
  async getMoneyByCurrency(options?: KpiFilterOptions): Promise<MonetaryKpiByCurrency[]> {
    const currencies = ["NGN", "USD", "GBP"];

    const escrowEligibleStates: BookingState[] = [
      "ESCROW_LOCKED",
      "DELIVERABLES_PROVIDED",
      "PAYMENT_RELEASED",
      "DISPUTED",
    ];

    const releasedStates: BookingState[] = ["PAYMENT_RELEASED"];

    const results: MonetaryKpiByCurrency[] = [];

    for (const currency of currencies) {
      if (options?.currency && options.currency !== currency) {
        continue;
      }

      // Base booking query
      const bookingWhere: any = {
        currency,
        client: { user: { isTestUser: false } },
      };

      if (options?.startDate || options?.endDate) {
        bookingWhere.createdAt = {};
        if (options.startDate) bookingWhere.createdAt.gte = options.startDate;
        if (options.endDate) bookingWhere.createdAt.lte = options.endDate;
      }

      // GMV: Bookings that reached ESCROW_LOCKED or beyond
      const gmvBookings = await this.db.booking.findMany({
        where: {
          ...bookingWhere,
          state: { in: escrowEligibleStates },
        },
        select: { baseAmount: true },
      });
      const gmv = gmvBookings.reduce((sum, b) => sum + BigInt(b.baseAmount), 0n);

      // Escrow held now
      const heldPayments = await this.db.payment.findMany({
        where: {
          currency,
          escrowHeld: true,
          status: "ESCROW_HELD",
        },
        select: { amount: true },
      });
      const escrowHeld = heldPayments.reduce((sum, p) => sum + BigInt(p.amount), 0n);

      // Released bookings
      const releasedBookings = await this.db.booking.findMany({
        where: {
          ...bookingWhere,
          state: { in: releasedStates },
        },
        select: {
          baseAmount: true,
          talentFeeAmount: true,
          clientFeeAmount: true,
        },
      });

      let released = 0n;
      let platformRevenue = 0n;
      let talentEarned = 0n;

      for (const b of releasedBookings) {
        const base = BigInt(b.baseAmount);
        const talentFee = BigInt(b.talentFeeAmount);
        const clientFee = BigInt(b.clientFeeAmount);

        released += base;
        platformRevenue += talentFee + clientFee;
        talentEarned += (base - talentFee);
      }

      // Withdrawals for this currency (completed and pending)
      const withdrawals = await this.db.withdrawalRequest.findMany({
        where: {
          currency,
          status: { in: ["PENDING_OTP", "APPROVED", "COMPLETED"] },
          user: { isTestUser: false },
        },
        select: { amount: true },
      });
      const totalWithdrawn = withdrawals.reduce((sum, w) => sum + BigInt(w.amount), 0n);
      const talentAvailable = talentEarned >= totalWithdrawn ? talentEarned - totalWithdrawn : 0n;

      const takeRate = gmv > 0n ? Number(platformRevenue) / Number(gmv) : 0;

      // Only include if there is activity or if specifically requested
      if (gmv > 0n || escrowHeld > 0n || released > 0n || options?.currency === currency) {
        results.push({
          currency,
          gmv,
          escrowHeld,
          released,
          platformRevenue,
          talentEarned,
          talentAvailable,
          takeRate: Math.round(takeRate * 1000) / 1000,
        });
      }
    }

    return results;
  }

  /**
   * 12. Dispute rate: Bookings that entered DISPUTED / Bookings that reached ESCROW_LOCKED.
   */
  async getDisputeRate(options?: KpiFilterOptions): Promise<number> {
    const bookingWhere: any = {
      client: { user: { isTestUser: false } },
    };
    if (options?.startDate || options?.endDate) {
      bookingWhere.createdAt = {};
      if (options.startDate) bookingWhere.createdAt.gte = options.startDate;
      if (options.endDate) bookingWhere.createdAt.lte = options.endDate;
    }

    const escrowReachedCount = await this.db.booking.count({
      where: {
        ...bookingWhere,
        state: { in: ["ESCROW_LOCKED", "DELIVERABLES_PROVIDED", "PAYMENT_RELEASED", "DISPUTED"] },
      },
    });

    if (escrowReachedCount === 0) return 0;

    const disputedCount = await this.db.booking.count({
      where: {
        ...bookingWhere,
        state: "DISPUTED",
      },
    });

    return Math.round((disputedCount / escrowReachedCount) * 1000) / 1000;
  }

  /**
   * 13. Payment failure rate: Payments FAILED / Payments INITIATED.
   */
  async getPaymentFailureRate(options?: KpiFilterOptions): Promise<number> {
    const where: any = {};
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    const totalPayments = await this.db.payment.count({ where });
    if (totalPayments === 0) return 0;

    const failedPayments = await this.db.payment.count({
      where: {
        ...where,
        status: "FAILED",
      },
    });

    return Math.round((failedPayments / totalPayments) * 1000) / 1000;
  }

  /**
   * Complete KPI snapshot aggregating all metrics.
   */
  async getSnapshot(options?: KpiFilterOptions): Promise<KpiSnapshot> {
    const [
      signups,
      emailVerified,
      talentOnboarded,
      talentActivated,
      clientActivated,
      identityVerified,
      verificationRecordingApproved,
      activeUsers,
      timeToFirstBookingHours,
      bookingFunnel,
      moneyByCurrency,
      disputeRate,
      paymentFailureRate,
    ] = await Promise.all([
      this.getSignups(options),
      this.getEmailVerifiedCount(options),
      this.getTalentOnboardedCount(options),
      this.getTalentActivatedCount(options),
      this.getClientActivatedCount(options),
      this.getIdentityVerifiedCount(options),
      this.getVerificationRecordingApprovedCount(options),
      this.getActiveUsers(),
      this.getTimeToFirstBooking(options),
      this.getBookingFunnel(options),
      this.getMoneyByCurrency(options),
      this.getDisputeRate(options),
      this.getPaymentFailureRate(options),
    ]);

    return {
      signups,
      emailVerified,
      talentOnboarded,
      talentActivated,
      clientActivated,
      identityVerified,
      verificationRecordingApproved,
      activeUsers,
      timeToFirstBookingHours,
      bookingFunnel,
      moneyByCurrency,
      disputeRate,
      paymentFailureRate,
    };
  }
}

export const kpiService = new KpiService();
