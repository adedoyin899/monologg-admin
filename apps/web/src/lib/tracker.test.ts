import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  track,
  flushEvents,
  getConsentStatus,
  setConsentStatus,
  hasAnalyticsConsent,
  getQueueForTesting,
  clearQueueForTesting,
  CONSENT_STORAGE_KEY,
  USER_SESSION_STORAGE_KEY,
} from "./tracker";

describe("Phase A3 Web Tracker & Consent Gate", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearQueueForTesting();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearQueueForTesting();
  });

  it("drops anonymous events and page views until consent is explicitly accepted", () => {
    // 1. Unset consent (null)
    expect(getConsentStatus()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);

    const queuedUnset = track("page_view", { path: "/about" });
    expect(queuedUnset).toBe(false);
    expect(getQueueForTesting().length).toBe(0);

    // 2. Explicitly declined consent
    setConsentStatus("declined");
    expect(getConsentStatus()).toBe("declined");
    expect(hasAnalyticsConsent()).toBe(false);

    const queuedDeclined = track("onboarding_step_viewed", { stepKey: "step_1", userType: "TALENT" });
    expect(queuedDeclined).toBe(false);
    expect(getQueueForTesting().length).toBe(0);

    // 3. Accepted consent
    setConsentStatus("accepted");
    expect(getConsentStatus()).toBe("accepted");
    expect(hasAnalyticsConsent()).toBe(true);

    const queuedAccepted = track("page_view", { path: "/about" });
    expect(queuedAccepted).toBe(true);
    expect(getQueueForTesting().length).toBe(1);
    expect(getQueueForTesting()[0].name).toBe("page_view");
    expect(getQueueForTesting()[0].consent).toBe(true);
  });

  it("allows authenticated user events even if anonymous consent is not yet set", () => {
    localStorage.setItem(
      USER_SESSION_STORAGE_KEY,
      JSON.stringify({ id: "usr_authenticated_1", userType: "TALENT" }),
    );
    expect(getConsentStatus()).toBeNull();

    const queued = track("calendar_day_opened", { slotCount: 4 });
    expect(queued).toBe(true);
    expect(getQueueForTesting().length).toBe(1);
    expect(getQueueForTesting()[0].userId).toBe("usr_authenticated_1");
  });

  it("drops unregistered event names completely", () => {
    setConsentStatus("accepted");

    const queued = track("unknown_custom_event_not_in_prd", { someProp: 123 });
    expect(queued).toBe(false);
    expect(getQueueForTesting().length).toBe(0);
  });

  it("strictly scrubs non-allowlisted property keys", () => {
    setConsentStatus("accepted");

    track("storefront_viewed", {
      creatorId: "creator_99",
      viaShareLink: true,
      unauthorizedProp: "should_be_stripped",
      password: "secret_password",
      messageContent: "hello private message",
    });

    const queue = getQueueForTesting();
    expect(queue.length).toBe(1);
    expect(queue[0].props).toEqual({
      creatorId: "creator_99",
      viaShareLink: true,
    });
    expect(queue[0].props).not.toHaveProperty("unauthorizedProp");
    expect(queue[0].props).not.toHaveProperty("password");
    expect(queue[0].props).not.toHaveProperty("messageContent");
  });

  it("enforces keys-only rule for talent search filterKeys", () => {
    setConsentStatus("accepted");

    track("talent_search_performed", {
      niche: "ACTOR",
      filterKeys: ["genderPresentation", "ageRange", "location"],
      resultCount: 12,
      rawQuery: "forbidden search term",
    });

    const queue = getQueueForTesting();
    expect(queue.length).toBe(1);
    expect(queue[0].props).toEqual({
      niche: "ACTOR",
      filterKeys: ["genderPresentation", "ageRange", "location"],
      resultCount: 12,
    });
    expect(queue[0].props).not.toHaveProperty("rawQuery");
  });

  it("automatically flushes when buffer reaches batch limit of 20 events", async () => {
    setConsentStatus("accepted");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));

    for (let i = 1; i <= 20; i++) {
      track("help_opened", { category: `topic_${i}` });
    }

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const callArgs = fetchSpy.mock.calls[0];
    expect(callArgs[0]).toContain("/events");
    const body = JSON.parse(callArgs[1]?.body as string);
    expect(body.events.length).toBe(20);
    expect(getQueueForTesting().length).toBe(0);
  });

  it("flushEvents returns true on 204 No Content response", async () => {
    setConsentStatus("accepted");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));

    track("share_link_copied", { surface: "storefront" });
    expect(getQueueForTesting().length).toBe(1);

    const success = await flushEvents();
    expect(success).toBe(true);
    expect(getQueueForTesting().length).toBe(0);
  });
});

