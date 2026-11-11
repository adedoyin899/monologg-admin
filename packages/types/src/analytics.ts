export interface AcquisitionSourceSummary {
  source: string;
  signups: number;
  activatedCount: number;
  activationRatePct: number;
  firstBookingCount: number;
  firstBookingRatePct: number;
}

export interface ReferralLeaderboardEntry {
  code: string;
  creatorName: string;
  inviteCount: number;
  activatedCount: number;
  hasCelebrityBadge: boolean;
}

export interface AcquisitionData {
  bySource: AcquisitionSourceSummary[];
  byReferrer: Array<{ referrer: string; count: number }>;
  byCountry: Array<{ country: string; count: number }>;
  byDevice: Array<{ device: string; count: number }>;
  dailySignups: Array<{ date: string; count: number }>;
  referralLeaderboard: ReferralLeaderboardEntry[];
  unknownShare: {
    count: number;
    total: number;
    sharePct: number;
    label: string;
  };
  dataFreshness: string;
}

export interface DroppedUser {
  userId: string;
  name: string;
  email: string;
  userType: string;
  createdAt: string;
}

export interface FunnelStepData {
  stepId: string;
  label: string;
  count: number;
  conversionFromPreviousPct: number;
  overallConversionPct: number;
  medianTimeToNextStepMinutes: number | null;
  breakdown: {
    bySource: Record<string, number>;
    byCountry: Record<string, number>;
    byDevice: Record<string, number>;
    byCohort: Record<string, number>;
  };
  droppedUsers: DroppedUser[];
}

export interface FunnelData {
  funnelId: "TALENT_ONBOARDING" | "CLIENT_LIFECYCLE" | "EXTERNAL_BOOKING";
  name: string;
  description: string;
  steps: FunnelStepData[];
  overallConversionPct: number;
  biggestDropOffStep: string;
  dataFreshness: string;
}

export interface RetentionCohortWeek {
  weekNumber: number;
  activeCount: number;
  retentionPct: number;
}

export interface RetentionCohort {
  cohortWeek: string;
  cohortSize: number;
  weeks: RetentionCohortWeek[];
}

export interface RetentionData {
  cohorts: RetentionCohort[];
  userTypeFilter: "ALL" | "TALENT" | "CLIENT";
  dataFreshness: string;
}

export interface TrafficDailyItem {
  date: string;
  visits: number;
  uniques: number;
  anonymous: number;
  signedIn: number;
}

export interface TopCreatorViewItem {
  creatorId: string;
  creatorName: string;
  profileViews: number;
  mediaKitViews: number;
}

export interface TrafficData {
  visits: number;
  uniqueVisitors: number;
  anonymousVisits: number;
  signedInVisits: number;
  consentRatePct: number;
  consentRateNotice: string;
  dailyVisits: TrafficDailyItem[];
  topPages: Array<{ path: string; views: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  countries: Array<{ country: string; count: number }>;
  deviceClasses: Array<{ device: string; count: number }>;
  browsers: Array<{ browser: string; count: number }>;
  topCreatorViews: TopCreatorViewItem[];
  dataFreshness: string;
}

export interface FeatureAdoptionItem {
  featureKey: string;
  label: string;
  eligibleAudience: "TALENT" | "CLIENT" | "ALL";
  eligibleUsers: number;
  usedUsers: number;
  firstUseRatePct: number;
  repeatUsers: number;
  repeatUseRatePct: number;
  weeklyTrend: Array<{ week: string; count: number }>;
  cohortBreakdown: Record<string, number>;
  rank: number;
}

export interface AttributesAggregateStats {
  completionRatePct: number;
  totalCreators: number;
  creatorsWithAttributes: number;
  visibilityMix: {
    publicCount: number;
    searchableCount: number;
    privateCount: number;
  };
}

export interface FeatureAdoptionData {
  features: FeatureAdoptionItem[];
  attributesAggregate: AttributesAggregateStats;
  dataFreshness: string;
}

export interface SupplyByNicheItem {
  niche: string;
  count: number;
  verifiedPct: number;
  withRateCardPct: number;
  withAvailabilityPct: number;
  withMediaPct: number;
}

export interface DemandByNicheWeekItem {
  niche: string;
  week: string;
  briefsCount: number;
  bookingsCount: number;
}

export interface LiquidityMetrics {
  briefsWithin48HoursPct: number;
  briefsWithin48HoursCount: number;
  totalBriefsCount: number;
  avgApplicationsPerBrief: number;
  medianHoursToFirstApplication: number;
  selectionRatePct: number;
  capReachedRatePct: number;
}

export interface UnmetDemandItem {
  niche: string;
  filterKeys: string[];
  zeroResultCount: number;
}

export interface AvailabilityUseMetrics {
  activeTalentCount: number;
  talentWithCalendarCount: number;
  calendarConfiguredPct: number;
  totalSlots: number;
  bookedSlots: number;
  bookedSlotsPct: number;
}

export interface MarketplaceHealthData {
  supplyByNiche: SupplyByNicheItem[];
  demandByNicheAndWeek: DemandByNicheWeekItem[];
  liquidity: LiquidityMetrics;
  unmetDemand: UnmetDemandItem[];
  availabilityUse: AvailabilityUseMetrics;
  dataFreshness: string;
}
