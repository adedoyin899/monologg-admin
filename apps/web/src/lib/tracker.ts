/**
 * PRD Section 7 Web Telemetry & Event Client
 * ---------------------------------------------------------------------------
 * Features:
 * 1. Strict allowlist validation of event names and property keys (PRD 7.2)
 * 2. Privacy & consent gate: until accepted, NO anonymous event or page view is sent
 * 3. Batched transmission: flushes every 5 seconds or when 20 events accumulate
 * 4. Reliable delivery: navigator.sendBeacon on pagehide / visibilitychange
 * 5. Automatic attachment of path, referrerDomain, UTM parameters, device class
 */

export type ConsentChoice = "accepted" | "declined" | null;

export const CONSENT_STORAGE_KEY = "monologg_analytics_consent";
export const ANON_ID_STORAGE_KEY = "monologg_analytics_anon_id";
export const SESSION_ID_STORAGE_KEY = "monologg_analytics_session_id";
export const USER_SESSION_STORAGE_KEY = "monologg_user_session";

export const ALLOWED_WEB_EVENTS: Record<string, readonly string[]> = {
  page_view: ["path", "referrerDomain", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"],
  onboarding_step_viewed: ["stepKey", "userType"],
  onboarding_step_completed: ["stepKey", "userType"],
  onboarding_step_skipped: ["stepKey", "userType"],
  storefront_viewed: ["creatorId", "viaShareLink"],
  public_profile_viewed: ["creatorId", "viaShareLink"],
  share_link_copied: ["surface"],
  media_kit_link_copied: ["surface"],
  talent_search_performed: ["niche", "filterKeys", "resultCount"],
  calendar_day_opened: ["slotCount"],
  help_opened: ["category", "bookingId"],
  ticket_created: ["ticketId", "category", "priority", "bookingId"],
  feedback_submitted: ["rating", "hasComment"],
  project_viewed: ["briefId", "cap"],
};

export interface QueuedEvent {
  name: string;
  props: Record<string, unknown>;
  anonymousId?: string;
  userId?: string;
  consent: boolean;
  timestamp: string;
}

let eventBuffer: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
const BATCH_SIZE = 20;
const FLUSH_INTERVAL_MS = 5000;

export function getConsentStatus(): ConsentChoice {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const val = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (val === "accepted" || val === "declined") return val;
    return null;
  } catch {
    return null;
  }
}

export function setConsentStatus(status: "accepted" | "declined"): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(CONSENT_STORAGE_KEY, status);
      window.dispatchEvent(new CustomEvent("monologg:consent-changed", { detail: status }));
    }
  } catch {}
}

export function hasAnalyticsConsent(): boolean {
  return getConsentStatus() === "accepted";
}

function generateRandomId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export function getAnonymousId(): string {
  try {
    if (typeof window === "undefined" || !window.localStorage) return "anon_ephemeral";
    let anonId = localStorage.getItem(ANON_ID_STORAGE_KEY);
    if (!anonId) {
      anonId = generateRandomId("anon");
      localStorage.setItem(ANON_ID_STORAGE_KEY, anonId);
    }
    return anonId;
  } catch {
    return "anon_ephemeral";
  }
}

export function getSessionId(): string {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return "sess_ephemeral";
    let sessId = sessionStorage.getItem(SESSION_ID_STORAGE_KEY);
    if (!sessId) {
      sessId = generateRandomId("sess");
      sessionStorage.setItem(SESSION_ID_STORAGE_KEY, sessId);
    }
    return sessId;
  } catch {
    return "sess_ephemeral";
  }
}

export function getLoggedInUserId(): string | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = localStorage.getItem(USER_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.id ?? parsed.userId ?? null;
  } catch {
    return null;
  }
}

export function getDeviceClass(): "mobile" | "tablet" | "desktop" {
  try {
    if (typeof window === "undefined") return "desktop";
    const width = window.innerWidth;
    if (width < 640) return "mobile";
    if (width < 1024) return "tablet";
    return "desktop";
  } catch {
    return "desktop";
  }
}

export function getReferrerDomain(): string | null {
  try {
    if (typeof document === "undefined" || !document.referrer) return null;
    const url = new URL(document.referrer);
    return url.hostname || null;
  } catch {
    return null;
  }
}

export function getUtmParams(): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    if (typeof window === "undefined" || !window.location) return params;
    const searchParams = new URLSearchParams(window.location.search);
    const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    for (const k of utmKeys) {
      const val = searchParams.get(k);
      if (val) params[k] = val;
    }
  } catch {}
  return params;
}

function getApiEventsUrl(): string {
  try {
    const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000/api/v1";
    return `${baseUrl.replace(/\/+$/, "")}/events`;
  } catch {
    return "http://localhost:4000/api/v1/events";
  }
}

/**
 * Flushes all currently queued events to the backend ingestion endpoint.
 */
export async function flushEvents(): Promise<boolean> {
  if (eventBuffer.length === 0) return true;

  const toSend = eventBuffer.splice(0, BATCH_SIZE);
  const url = getApiEventsUrl();
  const payload = JSON.stringify({ events: toSend });

  try {
    if (typeof fetch === "function") {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
      return res.status === 204 || res.ok;
    }
  } catch {
    // Network failure is non-fatal: events are dropped to avoid memory leakage
  }
  return false;
}

/**
 * Flush synchronously on page hide/unload using sendBeacon.
 */
function flushOnUnload(): void {
  if (eventBuffer.length === 0) return;
  const toSend = eventBuffer.splice(0, BATCH_SIZE);
  const url = getApiEventsUrl();
  const payload = JSON.stringify({ events: toSend });

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(url, blob);
      return;
    }
    if (typeof fetch === "function") {
      void fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    }
  } catch {}
}

// Set up periodic flusher and unload handlers once in browser
if (typeof window !== "undefined") {
  if (!flushTimer) {
    flushTimer = setInterval(() => {
      void flushEvents();
    }, FLUSH_INTERVAL_MS);
    if (typeof flushTimer.unref === "function") {
      flushTimer.unref();
    }
  }

  window.addEventListener("pagehide", flushOnUnload);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushOnUnload();
    }
  });
}

/**
 * Primary web tracking function adhering strictly to PRD Section 7:
 * - Drops any event name not in ALLOWED_WEB_EVENTS
 * - Drops anonymous events if consent is not granted
 * - Drops any property not in the allowlist for that event
 * - Enforces privacy rules (keys only for filterKeys)
 * - Batches up to 20 events or 5 seconds
 */
export function track(name: string, props?: Record<string, unknown>): boolean {
  const allowedProps = ALLOWED_WEB_EVENTS[name];
  if (!allowedProps) {
    return false; // Dropped: unregistered event
  }

  const userId = getLoggedInUserId();
  const consent = hasAnalyticsConsent();

  // PRD 7.1: Until accepted, no anonymous page view or anonymous event is sent.
  if (!userId && !consent) {
    return false; // Dropped: anonymous visitor without consent
  }

  // Filter props strictly against allowlist
  const cleanProps: Record<string, unknown> = {};
  const rawProps = props ?? {};

  // Default props for page_view if not supplied
  if (name === "page_view") {
    if (!rawProps.path && typeof window !== "undefined") {
      rawProps.path = window.location.pathname || "/";
    }
    if (!rawProps.referrerDomain) {
      const refDomain = getReferrerDomain();
      if (refDomain) rawProps.referrerDomain = refDomain;
    }
    const utms = getUtmParams();
    for (const [k, v] of Object.entries(utms)) {
      if (!rawProps[k]) rawProps[k] = v;
    }
  }

  // Ensure filterKeys contains only keys, never values
  if (name === "talent_search_performed" && rawProps.filterKeys) {
    if (Array.isArray(rawProps.filterKeys)) {
      rawProps.filterKeys = rawProps.filterKeys.map((k) => String(k));
    } else if (typeof rawProps.filterKeys === "object") {
      rawProps.filterKeys = Object.keys(rawProps.filterKeys as object);
    }
  }

  for (const [key, value] of Object.entries(rawProps)) {
    if (allowedProps.includes(key)) {
      cleanProps[key] = value;
    }
  }

  const item: QueuedEvent = {
    name,
    props: cleanProps,
    anonymousId: getAnonymousId(),
    userId: userId ?? undefined,
    consent,
    timestamp: new Date().toISOString(),
  };

  eventBuffer.push(item);

  if (eventBuffer.length >= BATCH_SIZE) {
    void flushEvents();
  }

  return true;
}

/**
 * Test helper to inspect or clear the buffer.
 */
export function getQueueForTesting(): QueuedEvent[] {
  return [...eventBuffer];
}

export function clearQueueForTesting(): void {
  eventBuffer = [];
}

