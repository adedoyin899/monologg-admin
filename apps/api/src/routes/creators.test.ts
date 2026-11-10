import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import { generateAccessToken } from "../services/auth.js";

vi.mock("../db/client.js", () => ({
  prisma: {
    creator: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
    mediaAsset: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findUniqueOrThrow: vi.fn() },
    kycCheck: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    // features.md Phase 13: public GET /creators/:id/open-slots + /rate-cards.
    rateCard: { findMany: vi.fn() },
    availabilityBlock: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
    calendarConnection: { findUnique: vi.fn().mockResolvedValue(null) },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "../db/client.js";
const prismaMock = prisma as any;

const TALENT_TOKEN = generateAccessToken({ userId: "user-talent-1", userType: "TALENT", email: "t@monologg.dev" });

describe("Creator profile + media upload", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it("GET /creators/me returns styleTags and verification as read-only fields", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({
      id: "creator-1",
      userId: "user-talent-1",
      styleTags: ["Warm"],
      verification: "VERIFIED",
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/creators/me",
      headers: { authorization: `Bearer ${TALENT_TOKEN}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ styleTags: ["Warm"], verification: "VERIFIED" });
  });

  it("PATCH /creators/me silently ignores an attempt to set styleTags/verification directly (X3)", async () => {
    prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
    prismaMock.creator.update.mockResolvedValue({ id: "creator-1", name: "New Name" });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/creators/me",
      headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      payload: { name: "New Name", styleTags: ["Hacked"], verification: "VERIFIED" },
    });

    expect(response.statusCode).toBe(200);
    // styleTags/verification aren't in updateProfileSchema, so zod strips them —
    // Prisma only ever receives the allowed fields.
    expect(prismaMock.creator.update).toHaveBeenCalledWith({
      where: { id: "creator-1" },
      data: { name: "New Name" },
    });
  });

  describe("POST /creators/me/media/presign", () => {
    it("issues a presigned upload for a valid video under the size cap", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      prismaMock.mediaAsset.create.mockResolvedValue({ id: "media-1" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/creators/me/media/presign",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
        payload: { kind: "VIDEO", sizeBytes: 10_000_000 },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.uploadUrl).toContain("/api/v1/uploads/local/");
      expect(body.mediaAssetId).toBe("media-1");
    });

    it("rejects a file over the 150MB cap", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/creators/me/media/presign",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
        payload: { kind: "VIDEO", sizeBytes: 200 * 1024 * 1024 },
      });

      expect(response.statusCode).toBe(400);
      expect(prismaMock.mediaAsset.create).not.toHaveBeenCalled();
    });

    it("rejects a kind that isn't VIDEO or AUDIO", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/creators/me/media/presign",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
        payload: { kind: "IMAGE", sizeBytes: 1000 },
      });

      expect(response.statusCode).toBe(400);
      expect(prismaMock.mediaAsset.create).not.toHaveBeenCalled();
    });
  });

  // features.md Phase 7: AI style-tagging job — real state (queued -> tagging ->
  // done), never coupled to identity verification (X3).
  describe("GET /creators/me/media/:id", () => {
    it("returns the asset's real taggingStatus for polling", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      prismaMock.mediaAsset.findUnique.mockResolvedValue({
        id: "media-1",
        creatorId: "creator-1",
        taggingStatus: "TAGGING",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/creators/me/media/media-1",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ taggingStatus: "TAGGING" });
    });

    it("404s a media asset owned by another creator", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      prismaMock.mediaAsset.findUnique.mockResolvedValue({ id: "media-1", creatorId: "creator-OTHER" });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/creators/me/media/media-1",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /creators/me/media/:id/confirm", () => {
    it("claims QUEUED -> TAGGING and enqueues the job, without ever touching verification", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      prismaMock.mediaAsset.findUnique.mockResolvedValue({
        id: "media-1",
        creatorId: "creator-1",
        url: "https://cdn.test/media-1",
        kind: "VIDEO",
        taggingStatus: "QUEUED",
      });
      prismaMock.mediaAsset.update.mockResolvedValue({
        id: "media-1",
        creatorId: "creator-1",
        url: "https://cdn.test/media-1",
        kind: "VIDEO",
        taggingStatus: "TAGGING",
      });
      // Background job dependencies — let it settle quietly so no unhandled rejection.
      prismaMock.mediaAsset.findUniqueOrThrow.mockResolvedValue({
        id: "media-1",
        creatorId: "creator-1",
        url: "https://cdn.test/media-1",
        kind: "VIDEO",
      });
      prismaMock.creator.findUniqueOrThrow.mockResolvedValue({ id: "creator-1", userId: "user-talent-1", styleTags: [] });
      prismaMock.$transaction.mockResolvedValue([{}, {}]);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/creators/me/media/media-1/confirm",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(202);
      expect(response.json()).toMatchObject({ taggingStatus: "TAGGING" });
      expect(prismaMock.mediaAsset.update).toHaveBeenCalledWith({
        where: { id: "media-1" },
        data: { taggingStatus: "TAGGING" },
      });

      // Let the fire-and-forget background job settle, then assert separation:
      // whatever it wrote to the creator, it was never `verification`.
      await new Promise((resolve) => setImmediate(resolve));
      for (const call of prismaMock.creator.update.mock.calls) {
        expect(call[0].data).not.toHaveProperty("verification");
      }
    });

    it("rejects confirming an asset that's already past QUEUED", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      prismaMock.mediaAsset.findUnique.mockResolvedValue({
        id: "media-1",
        creatorId: "creator-1",
        taggingStatus: "DONE",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/creators/me/media/media-1/confirm",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(409);
      expect(prismaMock.mediaAsset.update).not.toHaveBeenCalled();
    });
  });

  // features.md Phase 7: identity KYC — the Verified badge reflects ONLY this
  // flow (X3). Uses the real mock KycProvider (auto-selected under NODE_ENV=test).
  describe("POST /creators/me/verify", () => {
    const KYC_PAYLOAD = {
      firstName: "Ada",
      lastName: "Lovelace",
      dateOfBirth: "1992-04-15",
      country: "NG",
      idType: "NIN",
      idNumber: "12345678901",
    };

    it("starts a check and sets verification=PROCESSING", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1", verification: "UNVERIFIED" });
      prismaMock.$transaction.mockResolvedValue([
        { id: "creator-1", verification: "PROCESSING" },
        { id: "check-1", status: "PROCESSING", providerRef: "mock_kyc_creator-1_1" },
      ]);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/creators/me/verify",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
        payload: KYC_PAYLOAD,
      });

      expect(response.statusCode).toBe(202);
      expect(response.json()).toMatchObject({ verification: "PROCESSING" });
      // Never touches styleTags (X3).
      const [creatorUpdateCall] = prismaMock.$transaction.mock.calls[0][0];
      expect(creatorUpdateCall).toBeDefined();
    });

    it("400s an incomplete KYC payload", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1", verification: "UNVERIFIED" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/creators/me/verify",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
        payload: { firstName: "Ada" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("409s a second check while one is already PROCESSING", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1", verification: "PROCESSING" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/creators/me/verify",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
        payload: KYC_PAYLOAD,
      });

      expect(response.statusCode).toBe(409);
    });

    it("allows retrying after a FAILED check", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1", verification: "FAILED" });
      prismaMock.$transaction.mockResolvedValue([
        { id: "creator-1", verification: "PROCESSING" },
        { id: "check-2", status: "PROCESSING" },
      ]);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/creators/me/verify",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
        payload: KYC_PAYLOAD,
      });

      expect(response.statusCode).toBe(202);
    });
  });

  describe("GET /creators/me/verify", () => {
    it("VERIFIED: a completed mock check sets the badge", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1", verification: "PROCESSING" });
      prismaMock.kycCheck.findFirst.mockResolvedValue({
        id: "check-1",
        status: "PROCESSING",
        providerRef: "mock_kyc_creator-1_1",
      });
      prismaMock.$transaction.mockResolvedValue([
        { id: "creator-1", userId: "user-talent-1", verification: "VERIFIED" },
        { id: "check-1", status: "VERIFIED" },
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/creators/me/verify",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ verification: "VERIFIED" });
    });

    it("FAILED: offers a retry path (verification is FAILED, not VERIFIED)", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1", verification: "PROCESSING" });
      prismaMock.kycCheck.findFirst.mockResolvedValue({
        id: "check-1",
        status: "PROCESSING",
        providerRef: "mock_kyc_fail_creator-1_1",
      });
      prismaMock.$transaction.mockResolvedValue([
        { id: "creator-1", userId: "user-talent-1", verification: "FAILED" },
        { id: "check-1", status: "FAILED" },
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/creators/me/verify",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ verification: "FAILED" });
    });
  });

  describe("GET /creators/:id/open-slots — public (features.md Phase 13)", () => {
    it("requires no authentication and returns the server-computed open intervals", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1" });
      prismaMock.availabilityBlock.findFirst.mockResolvedValue(null);
      prismaMock.availabilityBlock.findMany.mockResolvedValue([]);

      const response = await app.inject({ method: "GET", url: "/api/v1/creators/creator-1/open-slots?date=2026-08-05" });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ date: "2026-08-05", openSlots: [{ start: "00:00", end: "23:59" }] });
    });

    it("404s for a creator that doesn't exist", async () => {
      prismaMock.creator.findUnique.mockResolvedValue(null);

      const response = await app.inject({ method: "GET", url: "/api/v1/creators/nope/open-slots?date=2026-08-05" });

      expect(response.statusCode).toBe(404);
    });

    it("400s when the date query param is missing/invalid", async () => {
      const response = await app.inject({ method: "GET", url: "/api/v1/creators/creator-1/open-slots" });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /creators/:id/rate-cards — public (features.md Phase 13)", () => {
    it("requires no authentication and returns the creator's rate cards, cheapest first", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1" });
      prismaMock.rateCard.findMany.mockResolvedValue([
        { id: "rc-1", serviceTitle: "Voice-Over Session", basePriceAmount: 2_800_000, basePriceCurrency: "NGN", deliveryTimeline: "Same Day" },
      ]);

      const response = await app.inject({ method: "GET", url: "/api/v1/creators/creator-1/rate-cards" });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([
        {
          id: "rc-1",
          title: "Voice-Over Session",
          price: "₦28,000",
          basePriceAmount: 2_800_000,
          basePriceCurrency: "NGN",
          delivery: "Same Day",
        },
      ]);
    });

    it("404s for a creator that doesn't exist", async () => {
      prismaMock.creator.findUnique.mockResolvedValue(null);
      const response = await app.inject({ method: "GET", url: "/api/v1/creators/nope/rate-cards" });
      expect(response.statusCode).toBe(404);
    });
  });

  describe("GET /creators/:id/public — public storefront (features.md Phase 15)", () => {
    const FULL_CREATOR_ROW = {
      id: "creator-1",
      userId: "user-talent-1",
      email: "talent@monologg.dev",
      passwordHash: "argon2id$fake-hash",
      name: "Adaeze Obi",
      niche: "VO_ARTIST",
      bio: "Warm, multilingual voice artist.",
      location: "Lagos",
      styleTags: ["Warm", "Multilingual"],
      verification: "VERIFIED",
      celebrityBadge: true,
      referralCode: "REF-ADAEZE",
      media: [{ id: "media-1", kind: "VIDEO", url: "https://cdn.example/reel.mp4", durationSec: 30, sizeBytes: 123456, taggingStatus: "DONE" }],
      rateCards: [{ id: "rc-1", serviceTitle: "Voice-Over Session", basePriceAmount: 2_800_000, basePriceCurrency: "NGN", deliveryTimeline: "Same Day" }],
    };

    it("requires no authentication and returns the full public storefront", async () => {
      prismaMock.creator.findUnique.mockResolvedValue(FULL_CREATOR_ROW);

      const response = await app.inject({ method: "GET", url: "/api/v1/creators/creator-1/public" });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        id: "creator-1",
        name: "Adaeze Obi",
        niche: "VO_ARTIST",
        nicheLabel: "Voice-Over Artist",
        location: "Lagos",
        bio: "Warm, multilingual voice artist.",
        styleTags: ["Warm", "Multilingual"],
        verified: true,
        celebrityBadge: true,
        media: [{ id: "media-1", kind: "VIDEO", url: "https://cdn.example/reel.mp4", durationSec: 30 }],
        rateCards: [
          {
            id: "rc-1",
            title: "Voice-Over Session",
            price: "₦28,000",
            basePriceAmount: 2_800_000,
            basePriceCurrency: "NGN",
            delivery: "Same Day",
          },
        ],
      });
    });

    it("never leaks private data: no email, password hash, userId, referralCode, or media-asset internals", async () => {
      prismaMock.creator.findUnique.mockResolvedValue(FULL_CREATOR_ROW);

      const response = await app.inject({ method: "GET", url: "/api/v1/creators/creator-1/public" });

      const raw = JSON.stringify(response.json());
      expect(raw).not.toContain("email");
      expect(raw).not.toContain("passwordHash");
      expect(raw).not.toContain("userId");
      expect(raw).not.toContain("referralCode");
      expect(raw).not.toContain("sizeBytes");
      expect(raw).not.toContain("taggingStatus");
    });

    it("exposes verified as a plain boolean, never the internal PROCESSING/FAILED states (X3)", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ ...FULL_CREATOR_ROW, verification: "PROCESSING" });
      const response = await app.inject({ method: "GET", url: "/api/v1/creators/creator-1/public" });
      expect(response.json().verified).toBe(false);
      expect(JSON.stringify(response.json())).not.toContain("PROCESSING");
    });

    it("404s for a creator that doesn't exist", async () => {
      prismaMock.creator.findUnique.mockResolvedValue(null);
      const response = await app.inject({ method: "GET", url: "/api/v1/creators/nope/public" });
      expect(response.statusCode).toBe(404);
    });
  });

  describe("GET /creators/:id/og-image.svg — public (features.md Phase 15)", () => {
    it("requires no authentication and returns a real, name-derived SVG image", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ name: "Adaeze Obi" });

      const response = await app.inject({ method: "GET", url: "/api/v1/creators/creator-1/og-image.svg" });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("image/svg+xml");
      expect(response.body).toContain("<svg");
      expect(response.body).toContain("AO"); // initials(name)
      expect(response.body).toContain("Adaeze Obi");
    });

    it("404s for a creator that doesn't exist", async () => {
      prismaMock.creator.findUnique.mockResolvedValue(null);
      const response = await app.inject({ method: "GET", url: "/api/v1/creators/nope/og-image.svg" });
      expect(response.statusCode).toBe(404);
    });
  });
});
