import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  trackEvent,
  trackPageView,
  trackClick,
  identifyAnalyticsUser,
  getBufferedEvents,
  clearBufferedEvents,
  getStakeholderSummary,
  ANALYTICS_TAXONOMY,
} from "./analytics";
import { appStateSync } from "./state-sync";

describe("Monologg Product Analytics & Stakeholder Telemetry SDK", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearBufferedEvents();
    delete (globalThis as Record<string, any>).posthog;
  });

  it("defines a complete taxonomy across all 10 stakeholder event categories", () => {
    const categories = new Set(Object.values(ANALYTICS_TAXONOMY).map((e) => e.category));
    expect(Array.from(categories)).toEqual(
      expect.arrayContaining([
        "navigation",
        "acquisition",
        "onboarding",
        "discovery",
        "booking",
        "escrow_payment",
        "order_room",
        "payout",
        "engagement",
        "ui_interaction",
      ]),
    );
    expect(Object.keys(ANALYTICS_TAXONOMY).length).toBeGreaterThanOrEqual(40);
  });

  it("tracks events, scrubs sensitive PII/secret fields, and forwards to PostHog bridge when available", () => {
    const posthogCapture = vi.fn();
    const posthogIdentify = vi.fn();
    (globalThis as Record<string, any>).posthog = {
      capture: posthogCapture,
      identify: posthogIdentify,
    };

    identifyAnalyticsUser({
      id: "usr-talent-99",
      email: "emeka@monologg.com",
      userType: "TALENT",
      authProvider: "GOOGLE",
      isNewUser: false,
    });

    const evt = trackEvent("order_deliverable_submitted", {
      orderId: "ORD-001",
      role: "talent",
      fileName: "Nike_VO_Final.mp3",
      password: "should_be_stripped",
      pin: "4821",
      token: "jwt_secret",
      cardNumber: "4111222233334444",
    });

    expect(evt.category).toBe("order_room");
    expect(evt.userRole).toBe("TALENT");
    expect(evt.properties).toEqual({
      orderId: "ORD-001",
      role: "talent",
      fileName: "Nike_VO_Final.mp3",
    });
    expect(evt.properties).not.toHaveProperty("password");
    expect(evt.properties).not.toHaveProperty("pin");
    expect(evt.properties).not.toHaveProperty("token");
    expect(evt.properties).not.toHaveProperty("cardNumber");

    expect(posthogIdentify).toHaveBeenCalledWith("usr-talent-99", {
      userType: "TALENT",
      authProvider: "GOOGLE",
    });
    expect(posthogCapture).toHaveBeenCalledWith(
      "order_deliverable_submitted",
      expect.objectContaining({
        orderId: "ORD-001",
        category: "order_room",
      }),
    );
  });

  it("automatically records funnel events when appStateSync business mutations occur", () => {
    trackPageView("/brief");
    trackClick("Save Draft", { step: 2 });

    // 1. Save draft
    const draft = appStateSync.saveClientDraft({
      name: "GTBank Radio Spot",
      niche: "Voice-Over",
      budget: "₦200,000",
      draftStep: 2,
    });
    expect(draft.id).toBeTruthy();

    // 2. Publish brief
    const published = appStateSync.addProject({
      projectName: "GTBank Radio Spot",
      projectType: "Commercial",
      nicheReq: ["VO_ARTIST"],
      budget: "₦200,000",
      budgetAmount: 20000000,
      budgetCurrency: "NGN",
    });
    expect(published.id).toBeTruthy();

    // 3. Fund wallet & complete escrow payment
    appStateSync.fundWallet(250000);
    appStateSync.deductBalance(134400, "Nike Campaign VO", "ORD-001");

    // 4. Confirm attendance check-in & release payment + withdraw
    appStateSync.confirmAvailabilityCheckin("chk-001-step2");
    trackEvent("order_deliverable_submitted", { orderId: "ORD-001" });
    trackEvent("order_payment_released", { orderId: "ORD-001", amountKobo: 12000000 });
    appStateSync.withdrawFunds(50000);

    const events = getBufferedEvents().map((e) => e.eventName);
    expect(events).toEqual(
      expect.arrayContaining([
        "page_viewed",
        "cta_clicked",
        "project_brief_draft_saved",
        "project_brief_published",
        "wallet_funded",
        "escrow_payment_completed",
        "order_attendance_confirmed",
        "order_deliverable_submitted",
        "order_payment_released",
        "withdrawal_completed",
      ]),
    );

    const summary = getStakeholderSummary();
    expect(summary.funnel).toMatchObject({
      pageViews: 1,
      uiClicks: 1,
      briefsPublished: 1,
      escrowPaymentsCompleted: 1,
      deliverablesSubmitted: 1,
      escrowPaymentsReleased: 1,
      withdrawalsCompleted: 1,
    });
  });
});
