import { describe, it, expect, vi } from "vitest";

// ---------------------------------------------------------------------------
// Provider-selection tests — Phase 3 gate
//
// Contract: under NODE_ENV=test, every provider resolves to its MOCK
// implementation — never the real one. This test runs in Vitest (which sets
// NODE_ENV=test), so it directly asserts the selection behaviour.
//
// We verify by checking that the exported provider objects are the exact same
// references as the known mock objects (reference equality, not duck-typing).
// ---------------------------------------------------------------------------

// Phase 9: mockNotifyProvider.inApp now genuinely persists to Notification —
// mocked here purely so this file's light behavioral smoke test doesn't need
// a real Supabase row to satisfy the userId foreign key. Real persistence
// behavior is covered by providers/notify.real.test.ts and services/notifications.test.ts.
vi.mock("../db/client.js", () => ({
  prisma: { notification: { create: vi.fn().mockResolvedValue({}) } },
}));

import { paymentProvider } from "../providers/index.js";
import { kycProvider } from "../providers/index.js";
import { aiTaggingProvider } from "../providers/index.js";
import { calendarProvider } from "../providers/index.js";
import { notifyProvider } from "../providers/index.js";

import { mockPaymentProvider } from "../providers/payment.mock.js";
import { mockKycProvider } from "../providers/kyc.mock.js";
import { mockAiTaggingProvider } from "../providers/aiTagging.mock.js";
import { mockCalendarProvider, MOCK_REVOKED_REFRESH_TOKEN } from "../providers/calendar.mock.js";
import { CalendarAuthRevokedError } from "../providers/calendar.interface.js";
import { mockNotifyProvider } from "../providers/notify.mock.js";

import { realPaymentProvider } from "../providers/payment.real.js";
import { stripePaymentProvider } from "../providers/payment.stripe.js";
import { airwallexPaymentProvider } from "../providers/payment.airwallex.js";
import { realKycProvider } from "../providers/kyc.real.js";
import { realAiTaggingProvider } from "../providers/aiTagging.real.js";
import { realCalendarProvider } from "../providers/calendar.real.js";
import { realNotifyProvider } from "../providers/notify.real.js";

describe("Provider registry (NODE_ENV=test)", () => {
  describe("resolves to mock implementations", () => {
    it("paymentProvider is the mock (not real)", () => {
      expect(paymentProvider).toBe(mockPaymentProvider);
      expect(paymentProvider).not.toBe(realPaymentProvider);
    });

    it("kycProvider is the mock (not real)", () => {
      expect(kycProvider).toBe(mockKycProvider);
      expect(kycProvider).not.toBe(realKycProvider);
    });

    it("aiTaggingProvider is the mock (not real)", () => {
      expect(aiTaggingProvider).toBe(mockAiTaggingProvider);
      expect(aiTaggingProvider).not.toBe(realAiTaggingProvider);
    });

    it("calendarProvider is the mock (not real)", () => {
      expect(calendarProvider).toBe(mockCalendarProvider);
      expect(calendarProvider).not.toBe(realCalendarProvider);
    });

    it("notifyProvider is the mock (not real)", () => {
      expect(notifyProvider).toBe(mockNotifyProvider);
      expect(notifyProvider).not.toBe(realNotifyProvider);
    });
  });

  describe("mock provider behaviours", () => {
    it("mockPaymentProvider.initEscrow returns a ref and checkoutUrl", async () => {
      const result = await mockPaymentProvider.initEscrow("booking-123", 100_000, "NGN");
      expect(result.ref).toContain("booking-123");
      expect(result.checkoutUrl).toMatch(/^https?:\/\//);
    });

    it("mockPaymentProvider.verifyWebhook always returns true", () => {
      expect(mockPaymentProvider.verifyWebhook("any-sig", Buffer.from("payload"))).toBe(true);
    });

    it("mockKycProvider.startCheck returns a ref", async () => {
      const { ref } = await mockKycProvider.startCheck("creator-456", {
        firstName: "Adaeze",
        lastName: "Okafor",
        dateOfBirth: "1990-05-20",
        country: "NG",
        idType: "NIN",
        idNumber: "12345678901",
      });
      expect(ref).toContain("creator-456");
    });

    it("mockKycProvider.getStatus returns VERIFIED for normal mock ref", async () => {
      const status = await mockKycProvider.getStatus("mock_kyc_creator-456_12345");
      expect(status).toBe("VERIFIED");
    });

    it("mockKycProvider.getStatus returns FAILED for fail-prefix ref", async () => {
      const status = await mockKycProvider.getStatus("mock_kyc_fail_creator-789");
      expect(status).toBe("FAILED");
    });

    it("mockAiTaggingProvider.tagMedia returns 3 style tags", async () => {
      const { styleTags } = await mockAiTaggingProvider.tagMedia(
        "https://example.com/video.mp4",
        "VIDEO",
      );
      expect(styleTags).toHaveLength(3);
      styleTags.forEach((tag) => expect(typeof tag).toBe("string"));
    });

    it("mockAiTaggingProvider.tagMedia is deterministic (same URL → same tags)", async () => {
      const url = "https://example.com/stable-asset.mp4";
      const first = await mockAiTaggingProvider.tagMedia(url, "VIDEO");
      const second = await mockAiTaggingProvider.tagMedia(url, "VIDEO");
      expect(first.styleTags).toEqual(second.styleTags);
    });

    it("mockCalendarProvider.createMeet returns a meet URL", async () => {
      const { meetUrl } = await mockCalendarProvider.createMeet("booking-abc", "mock_refresh_token");
      expect(meetUrl).toMatch(/^https:\/\/meet\.google\.com\//);
    });

    it("mockCalendarProvider.connect/completeConnect round-trip a state token", async () => {
      const { authUrl } = await mockCalendarProvider.connect("state-123");
      expect(authUrl).toContain("state=state-123");
      const { refreshToken, scopes } = await mockCalendarProvider.completeConnect("auth-code-abc");
      expect(refreshToken).toContain("auth-code-abc");
      expect(scopes.length).toBeGreaterThan(0);
    });

    it("mockCalendarProvider throws CalendarAuthRevokedError for the revoked sentinel token", async () => {
      await expect(
        mockCalendarProvider.pushAvailability(
          { id: "block-1", date: new Date("2026-08-01"), slots: [] },
          MOCK_REVOKED_REFRESH_TOKEN,
        ),
      ).rejects.toThrow(CalendarAuthRevokedError);
      await expect(mockCalendarProvider.getBusyTimes(new Date("2026-08-01"), MOCK_REVOKED_REFRESH_TOKEN)).rejects.toThrow(
        CalendarAuthRevokedError,
      );
      await expect(mockCalendarProvider.createMeet("booking-abc", MOCK_REVOKED_REFRESH_TOKEN)).rejects.toThrow(
        CalendarAuthRevokedError,
      );
    });

    it("mockNotifyProvider methods resolve without throwing", async () => {
      await expect(
        mockNotifyProvider.email("user@example.com", "booking_confirmed", { bookingId: "123" }),
      ).resolves.toBeUndefined();

      await expect(mockNotifyProvider.sms("+2348012345678", "Your booking is confirmed")).resolves.toBeUndefined();

      await expect(mockNotifyProvider.inApp("user-id-789", { kind: "booking_confirmed" })).resolves.toBeUndefined();
    });
  });

  describe("real providers throw descriptive errors (not yet implemented)", () => {
    // realPaymentProvider (Paystack) is genuinely implemented as of Phase 6 —
    // it's the two later-region stubs and the two later-phase providers below
    // that still throw "not yet implemented" placeholders. Calling the real
    // Paystack provider with no PAYSTACK_SECRET_KEY configured (as in this test
    // env) throws a distinct, descriptive configuration error instead.
    it("realPaymentProvider.initEscrow throws a descriptive config error when unconfigured", async () => {
      await expect(realPaymentProvider.initEscrow("b1", 100, "NGN")).rejects.toThrow("PAYSTACK_SECRET_KEY");
    });

    it("stripePaymentProvider.initEscrow throws a later-region-phase error", async () => {
      await expect(stripePaymentProvider.initEscrow("b1", 100, "NGN")).rejects.toThrow(/later region phase/i);
    });

    it("airwallexPaymentProvider.initEscrow throws a later-region-phase error", async () => {
      await expect(airwallexPaymentProvider.initEscrow("b1", 100, "NGN")).rejects.toThrow(/later region phase/i);
    });

    it("realKycProvider.startCheck throws a Phase 7 error", async () => {
      await expect(
        realKycProvider.startCheck("c1", {
          firstName: "Test",
          lastName: "User",
          dateOfBirth: "1990-01-01",
          country: "NG",
          idType: "NIN",
          idNumber: "12345678901",
        }),
      ).rejects.toThrow("Phase 7");
    });

    it("realAiTaggingProvider.tagMedia throws a Phase 7 error", async () => {
      await expect(realAiTaggingProvider.tagMedia("https://example.com/a.mp4", "VIDEO")).rejects.toThrow("Phase 7");
    });
  });
});
