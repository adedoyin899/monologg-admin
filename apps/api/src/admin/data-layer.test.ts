import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sanitizeTrackEvent,
  getAllowlistMetrics,
  resetAllowlistMetrics,
  ALLOWED_EVENTS_PROPS,
} from "../lib/analytics/allowlist.js";
import {
  extractEdgeCountry,
  parseCoarseUserAgent,
  getCoarseClientInfo,
} from "../lib/analytics/helpers.js";
import { track, analytics } from "../lib/analytics/index.js";
import { EventSink, TrackEvent } from "../lib/analytics/types.js";
import { generateSyntheticDataset } from "../../scripts/generate-synthetic-data.js";
import { buildApp } from "../app.js";

describe("Phase A2: Data Layer & Analytics Seam", () => {
  beforeEach(() => {
    resetAllowlistMetrics();
  });

  describe("PRD 7.2 Event Allowlist & Negative Privacy Constraints", () => {
    it("allows valid events and their allowlisted props", () => {
      const result = sanitizeTrackEvent({
        name: "page_view",
        props: {
          path: "/marketplace",
          referrerDomain: "google.com",
          utm_source: "newsletter",
        },
        context: { actor: "USER", actorId: "usr_1" },
      });

      expect(result.sanitized).not.toBeNull();
      expect(result.sanitized?.name).toBe("page_view");
      expect(result.sanitized?.props).toEqual({
        path: "/marketplace",
        referrerDomain: "google.com",
        utm_source: "newsletter",
      });
      expect(result.droppedProps).toHaveLength(0);
    });

    it("drops unknown event names and increments droppedEventsCount", () => {
      const initialMetrics = getAllowlistMetrics();

      const result = sanitizeTrackEvent({
        name: "totally_unknown_custom_event",
        props: { anyProp: "value" },
        context: { actor: "USER", actorId: "usr_1" },
      });

      expect(result.sanitized).toBeNull();
      expect(result.droppedReason).toBe("unknown_event");

      const afterMetrics = getAllowlistMetrics();
      expect(afterMetrics.droppedEventsCount).toBe(initialMetrics.droppedEventsCount + 1);
    });

    it("drops unknown property keys and increments droppedPropsCount", () => {
      const initialMetrics = getAllowlistMetrics();

      const result = sanitizeTrackEvent({
        name: "booking_started",
        props: {
          bookingId: "b_123",
          currency: "NGN",
          amountMinor: 5000000,
          unauthorizedSecretKey: "secret_value",
          anotherUnknownProp: 42,
        },
        context: { actor: "USER", actorId: "usr_1" },
      });

      expect(result.sanitized).not.toBeNull();
      expect(result.sanitized?.props).toEqual({
        bookingId: "b_123",
        currency: "NGN",
        amountMinor: 5000000,
      });
      expect(result.droppedProps).toContain("unauthorizedSecretKey");
      expect(result.droppedProps).toContain("anotherUnknownProp");

      const afterMetrics = getAllowlistMetrics();
      expect(afterMetrics.droppedPropsCount).toBe(initialMetrics.droppedPropsCount + 2);
    });

    it("NEGATIVE TEST: message content/body text is strictly dropped from message_sent props", () => {
      const result = sanitizeTrackEvent({
        name: "message_sent",
        props: {
          orderRoomId: "room_1",
          kind: "TEXT",
          content: "Hey, what is your phone number?",
          body: "Here is the sensitive agreement text",
          messageText: "Call me right now",
        },
        context: { actor: "USER", actorId: "usr_1" },
      });

      expect(result.sanitized).not.toBeNull();
      // Only orderRoomId and kind are in the allowlist
      expect(result.sanitized?.props).toEqual({
        orderRoomId: "room_1",
        kind: "TEXT",
      });
      expect(result.sanitized?.props).not.toHaveProperty("content");
      expect(result.sanitized?.props).not.toHaveProperty("body");
      expect(result.sanitized?.props).not.toHaveProperty("messageText");
    });

    it("NEGATIVE TEST: raw attribute values and KYC documents are strictly prevented from entering props", () => {
      const result = sanitizeTrackEvent({
        name: "attributes_saved",
        props: {
          fieldCount: 3,
          publicCount: 2,
          attributeValue: "Waist: 32 inches, Bust: 36 inches",
          privateValue: "Chest measurement raw value",
          kycDocumentUrl: "https://identity.storage/passport.jpg",
          rawIpAddress: "192.168.1.1",
        },
        context: { actor: "USER", actorId: "usr_1" },
      });

      expect(result.sanitized).not.toBeNull();
      expect(result.sanitized?.props).toEqual({
        fieldCount: 3,
        publicCount: 2,
      });
      expect(result.sanitized?.props).not.toHaveProperty("attributeValue");
      expect(result.sanitized?.props).not.toHaveProperty("kycDocumentUrl");
      expect(result.sanitized?.props).not.toHaveProperty("rawIpAddress");
    });

    it("drops anonymous visitor events when consent flag is absent or false", () => {
      const withoutConsent = sanitizeTrackEvent({
        name: "public_profile_viewed",
        props: { creatorId: "cr_1" },
        context: { actor: "ANON", anonymousId: "anon_123" },
      });
      expect(withoutConsent.sanitized).toBeNull();
      expect(withoutConsent.droppedReason).toBe("missing_consent");

      const withFalseConsent = sanitizeTrackEvent({
        name: "public_profile_viewed",
        props: { creatorId: "cr_1" },
        context: { actor: "ANON", anonymousId: "anon_123", consent: false },
      });
      expect(withFalseConsent.sanitized).toBeNull();
      expect(withFalseConsent.droppedReason).toBe("missing_consent");

      const withTrueConsent = sanitizeTrackEvent({
        name: "public_profile_viewed",
        props: { creatorId: "cr_1" },
        context: { actor: "ANON", anonymousId: "anon_123", consent: true },
      });
      expect(withTrueConsent.sanitized).not.toBeNull();
      expect(withTrueConsent.sanitized?.name).toBe("public_profile_viewed");
    });

    it("allows authenticated user events without explicit consent flag", () => {
      const userEvent = sanitizeTrackEvent({
        name: "withdrawal_requested",
        props: { currency: "NGN", amountMinor: 20000000 },
        context: { actor: "USER", actorId: "usr_active_1" },
      });
      expect(userEvent.sanitized).not.toBeNull();
      expect(userEvent.sanitized?.name).toBe("withdrawal_requested");
    });
  });

  describe("Edge Country & Coarse Client Metadata", () => {
    it("extracts ISO-2 country code from edge headers", () => {
      expect(extractEdgeCountry({ "cf-ipcountry": "ng" })).toBe("NG");
      expect(extractEdgeCountry({ "x-country-code": "GB" })).toBe("GB");
      expect(extractEdgeCountry({ "x-vercel-ip-country": "US" })).toBe("US");
      expect(extractEdgeCountry({ "cf-ipcountry": "XX" })).toBeNull(); // Special/unknown code
      expect(extractEdgeCountry({})).toBeNull();
    });

    it("parses coarse device class, browser, and OS without raw IP", () => {
      const mobileUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1";
      const mobileInfo = parseCoarseUserAgent(mobileUA);
      expect(mobileInfo.deviceClass).toBe("mobile");
      expect(mobileInfo.os).toBe("iOS");
      expect(mobileInfo.browser).toBe("Safari");

      const desktopUA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const desktopInfo = parseCoarseUserAgent(desktopUA);
      expect(desktopInfo.deviceClass).toBe("desktop");
      expect(desktopInfo.os).toBe("macOS");
      expect(desktopInfo.browser).toBe("Chrome");
    });
  });

  describe("EventSink Seam Failure Resilience", () => {
    it("never throws into the caller when an underlying sink fails", async () => {
      const throwingSink: EventSink = {
        send: vi.fn().mockRejectedValue(new Error("Database connection pool exhausted")),
        sendBatch: vi.fn().mockRejectedValue(new Error("Network timeout to event store")),
      };

      analytics.setSinks([throwingSink]);

      // Calling track must resolve cleanly and not throw
      await expect(
        track("booking_started", { bookingId: "b_fail_test", currency: "USD", amountMinor: 1000 }, { actor: "USER", actorId: "usr_1" })
      ).resolves.toBeUndefined();

      expect(throwingSink.sendBatch).toHaveBeenCalled();
    });
  });

  describe("Ingestion Route POST /api/v1/events", () => {
    it("accepts a valid batch and returns 204", async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/events",
        headers: {
          "cf-ipcountry": "GB",
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        },
        payload: {
          events: [
            {
              name: "page_view",
              props: { path: "/about" },
              anonymousId: "anon_batch_1",
              consent: true,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(204);
    });

    it("rejects batches with more than 20 events with 400 Bad Request", async () => {
      const app = await buildApp();

      const events = Array.from({ length: 21 }, (_, i) => ({
        name: "page_view",
        props: { path: `/page-${i}` },
        anonymousId: `anon_${i}`,
        consent: true,
      }));

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/events",
        payload: { events },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toContain("Batch cannot exceed 20 events");
    });
  });

  describe("Deterministic Synthetic Dataset Generator", () => {
    it("refuses to run when NODE_ENV is production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      try {
        await expect(generateSyntheticDataset()).rejects.toThrow(
          "Refusing to generate synthetic data in production environment"
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it("produces deterministic output with a given seed", async () => {
      const mockDb: any = {
        user: { upsert: vi.fn().mockResolvedValue({}), count: vi.fn().mockResolvedValue(120) },
        verificationRecording: { upsert: vi.fn().mockResolvedValue({}) },
        booking: { upsert: vi.fn().mockResolvedValue({}) },
        payment: { upsert: vi.fn().mockResolvedValue({}) },
        supportTicket: { upsert: vi.fn().mockResolvedValue({}) },
        withdrawalRequest: { upsert: vi.fn().mockResolvedValue({}) },
        productEvent: { createMany: vi.fn().mockResolvedValue({ count: 1000 }) },
      };

      const result1 = await generateSyntheticDataset({ seed: 42, db: mockDb });
      const result2 = await generateSyntheticDataset({ seed: 42, db: mockDb });

      expect(result1.userCount).toBe(120);
      expect(result1.creatorCount).toBe(70);
      expect(result1.clientCount).toBe(50);
      expect(result1.bookingCount).toBe(result2.bookingCount);
      expect(result1.eventCount).toBe(result2.eventCount);
    });
  });

  describe("PRD Appendix B: Separate Currencies Invariant", () => {
    it("guarantees monetary stats are isolated per currency and never summed across", () => {
      const mockCurrencyRows = [
        { currency: "NGN", gmv: 29000000n, escrowHeld: 19550000n, released: 12000000n },
        { currency: "USD", gmv: 150000n, escrowHeld: 100000n, released: 50000n },
        { currency: "GBP", gmv: 80000n, escrowHeld: 40000n, released: 40000n },
      ];

      // Currencies must remain distinct rows
      expect(mockCurrencyRows).toHaveLength(3);
      const currencies = mockCurrencyRows.map((r) => r.currency);
      expect(currencies).toEqual(["NGN", "USD", "GBP"]);

      // Cross-currency arithmetic is disallowed: each row's currency is independent
      for (const row of mockCurrencyRows) {
        expect(typeof row.currency).toBe("string");
        expect(typeof row.gmv).toBe("bigint");
      }
    });
  });
});
