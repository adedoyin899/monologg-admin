/**
 * Funnel Definitions (PRD Module M4.2 / AD-20).
 * Config-driven ordered steps for the three platform funnels.
 */

export interface FunnelStepDefinition {
  id: string;
  label: string;
  description: string;
}

export interface FunnelDefinition {
  id: "TALENT_ONBOARDING" | "CLIENT_LIFECYCLE" | "EXTERNAL_BOOKING";
  name: string;
  description: string;
  steps: FunnelStepDefinition[];
}

export const FUNNEL_DEFINITIONS: Record<"TALENT_ONBOARDING" | "CLIENT_LIFECYCLE" | "EXTERNAL_BOOKING", FunnelDefinition> = {
  TALENT_ONBOARDING: {
    id: "TALENT_ONBOARDING",
    name: "Talent Onboarding & Activation",
    description: "Signup to first booking for talent creators.",
    steps: [
      { id: "signup", label: "Account Created", description: "Talent user registration completed" },
      { id: "email_verified", label: "Email Verified", description: "Email address verified or authenticated" },
      { id: "onboarded", label: "Profile Onboarded", description: "Stage name, niche, and location provided" },
      { id: "media_uploaded", label: "Media Uploaded", description: "At least one video/audio portfolio item added" },
      { id: "rate_card_created", label: "Rate Card Created", description: "Bookable service and pricing published" },
      { id: "activated", label: "Talent Activated", description: "Profile complete with rate cards and portfolio" },
      { id: "first_booking", label: "First Booking", description: "First confirmed client booking secured" },
    ],
  },
  CLIENT_LIFECYCLE: {
    id: "CLIENT_LIFECYCLE",
    name: "Client Project Lifecycle",
    description: "Client registration, brief posting, escrow funding, and payment release.",
    steps: [
      { id: "signup", label: "Account Created", description: "Client user registration completed" },
      { id: "brief_or_booking", label: "Project Started", description: "Brief posted or booking initiated" },
      { id: "escrow_locked", label: "Escrow Funded", description: "Payment confirmed and escrow funds locked" },
      { id: "delivered", label: "Deliverables Received", description: "Talent submitted project deliverables" },
      { id: "released", label: "Payment Released", description: "Deliverables approved and payment disbursed" },
    ],
  },
  EXTERNAL_BOOKING: {
    id: "EXTERNAL_BOOKING",
    name: "External Storefront Booking",
    description: "Guest / public storefront visit through slot hold and checkout.",
    steps: [
      { id: "profile_viewed", label: "Storefront Viewed", description: "Public storefront or profile link visited" },
      { id: "booking_started", label: "Checkout Started", description: "Package selected and booking started" },
      { id: "slot_selected", label: "Slot Selected", description: "Date and availability slot chosen" },
      { id: "payment_initiated", label: "Payment Initiated", description: "Redirected to payment gateway" },
      { id: "escrow_locked", label: "Booking Secured", description: "Payment verified and booking confirmed in escrow" },
    ],
  },
};
