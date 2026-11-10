import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sanitizeTrackEvent,
  getAllowlistMetrics,
  resetAllowlistMetrics,
} from "../lib/analytics/allowlist.js";
import { track, analytics } from "../lib/analytics/index.js";
import { EventSink } from "../lib/analytics/types.js";
import { recordUserActive, resetLastActiveCache } from "../middlewares/lastActive.js";
import { setTestUser } from "../../scripts/set-test-user.js";
import { hashPassword, generateRefreshToken, hashToken } from "../services/auth.js";
import { buildApp } from "../app.js";

// Mock prisma for route and script testing
vi.mock("../db/client.js", () => {
  const mockUserFindUnique = vi.fn();
  const mockUserFindUniqueOrThrow = vi.fn();
  const mockUserFindFirst = vi.fn();
  const mockUserUpdate = vi.fn();
  const mockRefreshTokenFindFirst = vi.fn();
  const mockRefreshTokenUpdate = vi.fn();
  const mockRefreshTokenUpdateMany = vi.fn();

  return {
    prisma: {
      user: {
        findUnique: mockUserFindUnique,
        findUniqueOrThrow: mockUserFindUniqueOrThrow,
        findFirst: mockUserFindFirst,
        update: mockUserUpdate,
      },
      creator: { findUnique: vi.fn(), create: vi.fn() },
      client: { findUnique: vi.fn(), create: vi.fn() },
      refreshToken: {
        findFirst: mockRefreshTokenFindFirst,
        update: mockRefreshTokenUpdate,
        updateMany: mockRefreshTokenUpdateMany,
        create: vi.fn(),
      },
      termsAcceptance: { create: vi.fn() },
      authEvent: { create: vi.fn() },
      userAcquisition: { create: vi.fn().mockResolvedValue({}) },
      $transaction: vi.fn((arg) => (typeof arg === "function" ? arg(prisma) : Promise.all(arg))),
    },
  };
});

import { prisma } from "../db/client.js";
const prismaMock = prisma as any;

describe("Phase A3: Privacy Negative & Security Hardening Tests", () => {
  beforeEach(() => {
    resetAllowlistMetrics();
    resetLastActiveCache();
    vi.clearAllMocks();
  });

  describe("1. Strict Negative Privacy Constraints (PRD 7.2)", () => {
    it("never logs or passes message contents in message_sent events", () => {
      const result = sanitizeTrackEvent({
        name: "message_sent",
        props: {
          orderRoomId: "ord_123",
          kind: "TEXT",
          // Prohibited negative payloads
          content: "Hello, this is a secret private chat message",
          text: "Let us meet outside the platform",
          body: "Sensitive proposal details",
          message: "Confidential negotiation",
        },
        context: { actor: "USER", actorId: "usr_1" },
      });

      expect(result.sanitized).not.toBeNull();
      expect(result.sanitized?.name).toBe("message_sent");
      expect(result.sanitized?.props).toEqual({
        orderRoomId: "ord_123",
        kind: "TEXT",
      });
      expect(result.droppedProps).toEqual(
        expect.arrayContaining(["content", "text", "body", "message"])
      );
      expect(JSON.stringify(result.sanitized?.props)).not.toContain("secret");
      expect(JSON.stringify(result.sanitized?.props)).not.toContain("negotiation");
    });

    it("strips raw passwords, hashes, and tokens from auth events", () => {
      const result = sanitizeTrackEvent({
        name: "auth_signin_succeeded",
        props: {
          provider: "EMAIL",
          userType: "TALENT",
          // Prohibited secrets
          password: "SuperSecretPassword123!",
          passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$dummyhash",
          accessToken: "jwt.access.token.signature",
          refreshToken: "refresh_token_plain",
          secret: "oauth_client_secret",
        },
        context: { actor: "USER", actorId: "usr_1" },
      });

      expect(result.sanitized).not.toBeNull();
      expect(result.sanitized?.props).toEqual({
        provider: "EMAIL",
        userType: "TALENT",
      });
      expect(result.droppedProps).toEqual(
        expect.arrayContaining(["password", "passwordHash", "accessToken", "refreshToken", "secret"])
      );
      expect(JSON.stringify(result.sanitized?.props)).not.toContain("SuperSecretPassword123!");
    });

    it("enforces COUNTS ONLY for attributes_saved and attributes_deleted (never values)", () => {
      const result = sanitizeTrackEvent({
        name: "attributes_saved",
        props: {
          fieldCount: 5,
          publicCount: 3,
          searchableCount: 2,
          privateCount: 0,
          // Prohibited raw attribute values
          instagramHandle: "@celebrity",
          shoeSize: 42,
          homeAddress: "123 Private St",
          phone: "+2348012345678",
        },
        context: { actor: "USER", actorId: "usr_1" },
      });

      expect(result.sanitized).not.toBeNull();
      expect(result.sanitized?.props).toEqual({
        fieldCount: 5,
        publicCount: 3,
        searchableCount: 2,
        privateCount: 0,
      });
      expect(result.droppedProps).toEqual(
        expect.arrayContaining(["instagramHandle", "shoeSize", "homeAddress", "phone"])
      );
      expect(JSON.stringify(result.sanitized?.props)).not.toContain("@celebrity");
    });

    it("strips KYC documents, selfies, identity checks, and raw IP addresses", () => {
      const result = sanitizeTrackEvent({
        name: "verification_recording_submitted",
        props: {
          durationSec: 15,
          // Prohibited KYC / IP info
          kycDocNumber: "A12345678",
          nationalId: "123-456-789",
          selfieUrl: "https://storage.supabase.co/kyc/selfie.jpg",
          rawIp: "192.168.1.1",
          ip_address: "105.112.98.12",
        },
        context: { actor: "USER", actorId: "usr_1" },
      });

      expect(result.sanitized).not.toBeNull();
      expect(result.sanitized?.props).toEqual({
        durationSec: 15,
      });
      expect(result.droppedProps).toEqual(
        expect.arrayContaining(["kycDocNumber", "nationalId", "selfieUrl", "rawIp", "ip_address"])
      );
    });
  });

  describe("2. Consent Enforcement for Anonymous Events (PRD 7.1 & 7.2)", () => {
    it("drops anonymous page_view and web events when consent is not granted", () => {
      const resultWithoutConsent = sanitizeTrackEvent({
        name: "page_view",
        props: { path: "/about" },
        context: {
          actor: "ANONYMOUS",
          anonymousId: "anon_abc123",
          consent: false,
        },
      });

      expect(resultWithoutConsent.sanitized).toBeNull();
      expect(resultWithoutConsent.droppedReason).toBe("missing_consent");

      const resultWithUndefinedConsent = sanitizeTrackEvent({
        name: "talent_search_performed",
        props: { niche: "ACTOR", filterKeys: ["location"], resultCount: 12 },
        context: {
          actor: "ANONYMOUS",
          anonymousId: "anon_abc123",
          // no consent property
        },
      });

      expect(resultWithUndefinedConsent.sanitized).toBeNull();
      expect(resultWithUndefinedConsent.droppedReason).toBe("missing_consent");
    });

    it("allows anonymous events when consent is explicitly true", () => {
      const resultWithConsent = sanitizeTrackEvent({
        name: "page_view",
        props: { path: "/marketplace", referrerDomain: "twitter.com" },
        context: {
          actor: "ANONYMOUS",
          anonymousId: "anon_abc123",
          consent: true,
        },
      });

      expect(resultWithConsent.sanitized).not.toBeNull();
      expect(resultWithConsent.sanitized?.props.path).toBe("/marketplace");
      expect(resultWithConsent.sanitized?.context.consent).toBe(true);
    });

    it("allows authenticated user events even if consent flag is omitted", () => {
      const result = sanitizeTrackEvent({
        name: "rate_card_created",
        props: { kind: "STANDALONE", mode: "AUTO" },
        context: {
          actor: "USER",
          actorId: "usr_talent_99",
        },
      });

      expect(result.sanitized).not.toBeNull();
      expect(result.sanitized?.props.kind).toBe("STANDALONE");
    });
  });

  describe("3. Resilience & Failing Sinks Seam", () => {
    it("track() never throws or interrupts caller even when a sink throws an error", async () => {
      const brokenSink: EventSink = {
        send: vi.fn().mockRejectedValue(new Error("Database connection timed out")),
        sendBatch: vi.fn().mockRejectedValue(new Error("Database connection timed out or network down")),
      };

      analytics.setSinks([brokenSink]);

      // Calling track must resolve safely without rejecting
      await expect(
        track(
          "booking_state_changed",
          {
            bookingId: "bk_123",
            from: "PENDING_ACCEPTANCE",
            to: "ESCROW_LOCKED",
            currency: "NGN",
            amountMinor: 5000000,
            origin: "WEBHOOK",
          },
          { actor: "SYSTEM" }
        )
      ).resolves.toBeUndefined();

      expect(brokenSink.sendBatch).toHaveBeenCalled();

      // Reset sinks
      analytics.setSinks([]);
    });
  });

  describe("4. Booking State Changed Schema Validation", () => {
    it("validates all required booking_state_changed properties", () => {
      const result = sanitizeTrackEvent({
        name: "booking_state_changed",
        props: {
          bookingId: "bk_xyz",
          from: "ESCROW_LOCKED",
          to: "COMPLETED",
          currency: "NGN",
          amountMinor: 15000000,
          origin: "ADMIN_ACTION",
        },
        context: { actor: "ADMIN", actorId: "adm_1" },
      });

      expect(result.sanitized).not.toBeNull();
      expect(result.sanitized?.props).toEqual({
        bookingId: "bk_xyz",
        from: "ESCROW_LOCKED",
        to: "COMPLETED",
        currency: "NGN",
        amountMinor: 15000000,
        origin: "ADMIN_ACTION",
      });
    });
  });

  describe("5. Suspended User Gate (PRD Section 11, item 6)", () => {
    let app: Awaited<ReturnType<typeof buildApp>>;

    beforeEach(async () => {
      app = await buildApp({ logger: false });
      await app.ready();
    });

    afterEach(async () => {
      await app.close();
    });

    it("rejects login with 403 Forbidden when user is suspended", async () => {
      const password = "CorrectPassword123!";
      const passwordHash = await hashPassword(password);

      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: "usr_suspended",
        email: "suspended@example.com",
        passwordHash,
        passwordSet: true,
        userType: "TALENT",
        suspendedAt: new Date("2026-08-01"),
        suspendedReason: "Violation of terms",
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "suspended@example.com",
          password,
        },
      });

      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.message).toContain("suspended");
    });

    it("rejects token refresh with 403 Forbidden when user is suspended", async () => {
      const refreshToken = generateRefreshToken("usr_suspended", "jti_token_123");
      const tokenHash = hashToken(refreshToken);

      prismaMock.refreshToken.findFirst.mockResolvedValueOnce({
        id: "tok_1",
        userId: "usr_suspended",
        tokenHash,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      });

      prismaMock.refreshToken.update.mockResolvedValueOnce({});

      prismaMock.user.findUniqueOrThrow.mockResolvedValueOnce({
        id: "usr_suspended",
        email: "suspended@example.com",
        userType: "TALENT",
        suspendedAt: new Date("2026-08-01"),
        suspendedReason: "Fraudulent dispute",
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        payload: {
          refreshToken,
        },
      });

      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.message).toContain("suspended");
    });
  });

  describe("6. User Last Active Throttling (PRD Section 11, item 4)", () => {
    it("throttles database writes to at most once per 5 minutes per user", () => {
      const updateSpy = prismaMock.user.update;
      updateSpy.mockResolvedValue({});

      // First call -> should update DB
      recordUserActive("usr_active_1");
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "usr_active_1" },
          data: expect.objectContaining({ lastActiveAt: expect.any(Date) }),
        })
      );

      // Immediate second call for same user -> throttled, no DB call
      recordUserActive("usr_active_1");
      expect(updateSpy).toHaveBeenCalledTimes(1);

      // Call for different user -> should update DB
      recordUserActive("usr_active_2");
      expect(updateSpy).toHaveBeenCalledTimes(2);

      // Reset cache (simulating cache expiration or restart) -> should update DB again
      resetLastActiveCache();
      recordUserActive("usr_active_1");
      expect(updateSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe("7. Test User Flag Management Script (PRD Section 11, item 8)", () => {
    it("updates isTestUser flag on the specified user account", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce({
        id: "usr_test_account",
        email: "qa@monologg.dev",
        isTestUser: false,
      });
      prismaMock.user.update.mockResolvedValueOnce({
        id: "usr_test_account",
        email: "qa@monologg.dev",
        isTestUser: true,
      });

      const updated = await setTestUser("qa@monologg.dev", true);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: "usr_test_account" },
        data: { isTestUser: true },
      });
      expect(updated.isTestUser).toBe(true);
    });

    it("throws an error if user does not exist", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(null);

      await expect(setTestUser("nonexistent@example.com", true)).rejects.toThrow(
        "User not found for identifier: nonexistent@example.com"
      );
    });
  });
});
