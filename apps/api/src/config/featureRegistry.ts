/**
 * Feature Adoption Registry (PRD Module M10.2 / AD-23).
 * Declares tracked platform features, trigger events, and eligible audience.
 */

export interface FeatureRegistryItem {
  key: string;
  label: string;
  description: string;
  events: string[];
  eligibleAudience: "TALENT" | "CLIENT" | "ALL";
}

export const FEATURE_REGISTRY: FeatureRegistryItem[] = [
  {
    key: "storefront_publish",
    label: "Storefront Profile Publish",
    description: "Public storefront page published and active.",
    events: ["storefront_viewed", "public_profile_viewed"],
    eligibleAudience: "TALENT",
  },
  {
    key: "rate_cards",
    label: "Rate Cards & Services",
    description: "Services with pricing and delivery terms configured.",
    events: ["rate_card_created"],
    eligibleAudience: "TALENT",
  },
  {
    key: "media_upload",
    label: "Portfolio Media Upload",
    description: "Showreel video or audio sample uploaded.",
    events: ["media_uploaded"],
    eligibleAudience: "TALENT",
  },
  {
    key: "media_kit",
    label: "Media Kit (Auto & Upload)",
    description: "Media kit generated or custom kit uploaded.",
    events: ["media_kit_mode_changed", "media_kit_downloaded"],
    eligibleAudience: "TALENT",
  },
  {
    key: "verification_recording",
    label: "Presentation Video Recording",
    description: "Under-90-second portfolio introduction recording submitted.",
    events: ["verification_recording_submitted", "verification_recording_started"],
    eligibleAudience: "TALENT",
  },
  {
    key: "physical_attributes",
    label: "Physical Attributes (Casting)",
    description: "Height, build, and appearance characteristics configured.",
    events: ["attributes_saved"],
    eligibleAudience: "TALENT",
  },
  {
    key: "availability_calendar",
    label: "Availability Calendar",
    description: "Working hours and bookable time blocks customized.",
    events: ["availability_set", "calendar_day_opened"],
    eligibleAudience: "TALENT",
  },
  {
    key: "google_calendar",
    label: "Google Calendar Connect",
    description: "Two-way Google Calendar synchronization linked.",
    events: ["calendar_connected"],
    eligibleAudience: "TALENT",
  },
  {
    key: "project_browse_apply",
    label: "Project Applications",
    description: "Browsing briefs and submitting talent casting pitches.",
    events: ["application_submitted", "project_viewed"],
    eligibleAudience: "TALENT",
  },
  {
    key: "brief_posting",
    label: "Brief with Applicant Cap",
    description: "Casting project briefs created with optional applicant caps.",
    events: ["project_posted", "cap_reached"],
    eligibleAudience: "CLIENT",
  },
  {
    key: "talent_search",
    label: "Talent Directory Search",
    description: "Keyword, niche, and location search queries in talent catalog.",
    events: ["talent_search_performed"],
    eligibleAudience: "ALL",
  },
  {
    key: "attribute_filters",
    label: "Casting Attribute Filters",
    description: "Physical and aesthetic attribute criteria applied to search.",
    events: ["talent_search_performed"], // Checked specifically for filterKeys presence
    eligibleAudience: "ALL",
  },
  {
    key: "share_links",
    label: "Public Link Shares",
    description: "Copying direct profile links or media kit URLs for marketing.",
    events: ["share_link_copied", "media_kit_link_copied"],
    eligibleAudience: "TALENT",
  },
  {
    key: "external_booking",
    label: "External Storefront Checkout",
    description: "Public link guest bookings processed through escrow checkout.",
    events: ["booking_started", "slot_selected", "checkout_started"],
    eligibleAudience: "CLIENT",
  },
  {
    key: "withdrawals",
    label: "Earnings Withdrawals",
    description: "Bank payouts requested with SMS/email OTP verification.",
    events: ["withdrawal_requested", "withdrawal_otp_verified", "withdrawal_completed"],
    eligibleAudience: "TALENT",
  },
  {
    key: "help_and_tickets",
    label: "Support & Help Tickets",
    description: "Submitting inquiry tickets, problem reports, and feedback.",
    events: ["help_opened", "ticket_created", "feedback_submitted"],
    eligibleAudience: "ALL",
  },
];
