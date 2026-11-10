import { TrackEvent } from "./types.js";

/**
 * PRD Section 7.2 Event Catalogue Allowlist.
 * Maps every known event name to its strict set of allowed property keys.
 */
export const ALLOWED_EVENTS_PROPS: Record<string, readonly string[]> = {
  // Visit
  page_view: ["path", "referrerDomain", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"],

  // Auth
  auth_signup_started: ["provider", "userType"],
  auth_signup_completed: ["provider", "userType"],
  auth_signin_succeeded: ["provider", "userType"],
  auth_signin_failed: ["provider", "userType"],

  // Onboarding
  onboarding_step_viewed: ["stepKey", "userType"],
  onboarding_step_completed: ["stepKey", "userType"],
  onboarding_step_skipped: ["stepKey", "userType"],

  // Storefront
  storefront_viewed: ["creatorId", "viaShareLink"],
  public_profile_viewed: ["creatorId", "viaShareLink"],

  // Talent setup
  rate_card_created: ["kind", "mode"],
  media_uploaded: ["kind", "mode"],
  media_kit_mode_changed: ["kind", "mode"],
  media_kit_downloaded: ["kind", "mode"],

  // Verification
  verification_recording_started: ["durationSec"],
  verification_recording_submitted: ["durationSec"],
  verification_recording_rejected_too_long: ["durationSec"],

  // Attributes
  attributes_step_skipped: ["fieldCount", "publicCount", "searchableCount", "privateCount"],
  attributes_saved: ["fieldCount", "publicCount", "searchableCount", "privateCount"],
  attributes_deleted: ["fieldCount", "publicCount", "searchableCount", "privateCount"],

  // Calendar
  availability_set: ["slotCount"],
  calendar_connected: ["slotCount"],
  calendar_day_opened: ["slotCount"],

  // Search
  talent_search_performed: ["niche", "filterKeys", "resultCount"],

  // Projects
  project_posted: ["briefId", "cap"],
  project_viewed: ["briefId", "cap"],
  application_submitted: ["briefId", "cap"],
  applicant_shortlisted: ["briefId", "cap"],
  applicant_selected: ["briefId", "cap"],
  applicant_rejected: ["briefId", "cap"],
  cap_reached: ["briefId", "cap"],

  // Booking
  booking_started: ["bookingId", "from", "to", "currency", "amountMinor", "origin"],
  slot_selected: ["bookingId", "from", "to", "currency", "amountMinor", "origin"],
  checkout_started: ["bookingId", "from", "to", "currency", "amountMinor", "origin"],
  payment_initiated: ["bookingId", "from", "to", "currency", "amountMinor", "origin"],
  escrow_locked: ["bookingId", "from", "to", "currency", "amountMinor", "origin"],
  deliverables_provided: ["bookingId", "from", "to", "currency", "amountMinor", "origin"],
  release_approved: ["bookingId", "from", "to", "currency", "amountMinor", "origin"],
  booking_cancelled: ["bookingId", "from", "to", "currency", "amountMinor", "origin"],
  booking_state_changed: ["bookingId", "from", "to", "currency", "amountMinor", "origin"],

  // Messaging
  message_sent: ["orderRoomId", "kind"],

  // Money
  withdrawal_requested: ["currency", "amountMinor"],
  withdrawal_otp_verified: ["currency", "amountMinor"],
  withdrawal_completed: ["currency", "amountMinor"],
  withdrawal_failed: ["currency", "amountMinor"],

  // Support
  help_opened: ["category"],
  ticket_created: ["category"],
  dispute_opened: ["category"],
  feedback_submitted: ["category"],

  // Share
  share_link_copied: ["surface"],
  media_kit_link_copied: ["surface"],

  // System
  api_error: ["route", "status", "provider"],
  job_failed: ["route", "status", "provider"],
  webhook_received: ["route", "status", "provider"],
  webhook_failed: ["route", "status", "provider"],
};

/**
 * Negative constraint list: properties that must NEVER enter ProductEvent.props
 * under any circumstances (PRD 7.1 / 7.2: No personal content, no message text,
 * no raw attribute values, no KYC data, no secrets, no raw IPs).
 */
export const PROHIBITED_PROPS_SUBSTRINGS = [
  "content",
  "text",
  "message",
  "body",
  "password",
  "secret",
  "token",
  "codehash",
  "email",
  "phone",
  "kyc",
  "document",
  "rawip",
  "ipaddress",
  "attributevalue",
];

// Metrics counters for dropped items
let droppedEventsCount = 0;
let droppedPropsCount = 0;

export function getAllowlistMetrics(): { droppedEventsCount: number; droppedPropsCount: number } {
  return { droppedEventsCount, droppedPropsCount };
}

export function resetAllowlistMetrics(): void {
  droppedEventsCount = 0;
  droppedPropsCount = 0;
}

export interface SanitizeResult {
  sanitized: TrackEvent | null;
  droppedReason?: "unknown_event" | "missing_consent" | "prohibited_content";
  droppedProps?: string[];
}

/**
 * Validates and sanitizes a TrackEvent according to PRD section 7 rules:
 * 1. Checks if event name is in the allowlist.
 * 2. If actor is anonymous, requires consent flag; drops event if consent is missing/false.
 * 3. Filters `props` to only include allowed keys for that event.
 * 4. Ensures prohibited keys never pass through.
 * 5. Increments metrics counters for dropped events and props.
 */
export function sanitizeTrackEvent(event: TrackEvent): SanitizeResult {
  const allowedPropKeys = ALLOWED_EVENTS_PROPS[event.name];
  if (!allowedPropKeys) {
    droppedEventsCount++;
    return { sanitized: null, droppedReason: "unknown_event" };
  }

  // Anonymous visitor events require consent flag (PRD 7.1 / 7.3)
  const isAnonymous = event.context?.actor === "ANON" || (!event.context?.actorId && event.context?.actor !== "SYSTEM");
  if (isAnonymous && event.context?.consent !== true) {
    droppedEventsCount++;
    return { sanitized: null, droppedReason: "missing_consent" };
  }

  const rawProps = event.props ?? {};
  const cleanedProps: Record<string, unknown> = {};
  const droppedProps: string[] = [];

  for (const [key, value] of Object.entries(rawProps)) {
    const lowerKey = key.toLowerCase();
    const isProhibited = PROHIBITED_PROPS_SUBSTRINGS.some((prohibited) => lowerKey.includes(prohibited));

    if (isProhibited || !allowedPropKeys.includes(key)) {
      droppedProps.push(key);
      droppedPropsCount++;
    } else {
      cleanedProps[key] = value;
    }
  }

  const sanitizedEvent: TrackEvent = {
    ...event,
    props: cleanedProps,
  };

  return { sanitized: sanitizedEvent, droppedProps };
}

