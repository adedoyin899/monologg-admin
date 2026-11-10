import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import { generateAccessToken } from "../services/auth.js";

vi.mock("../db/client.js", () => ({
  prisma: {
    creator: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
    mediaKit: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(), update: vi.fn() },
    rateCard: { findMany: vi.fn() },
  },
}));

vi.mock("../lib/mediaKitStorage.js", () => ({
  writeMediaKitFile: vi.fn(),
  readMediaKitFile: vi.fn(),
  deleteMediaKitFile: vi.fn(),
}));

vi.mock("../providers/index.js", () => ({
  scannerProvider: { scan: vi.fn() },
}));

import { prisma } from "../db/client.js";
import { readMediaKitFile } from "../lib/mediaKitStorage.js";
import { scannerProvider } from "../providers/index.js";

const prismaMock = prisma as any;
const readMediaKitFileMock = readMediaKitFile as any;
const scannerMock = scannerProvider as any;

const TALENT_TOKEN = generateAccessToken({ userId: "user-talent-1", userType: "TALENT", email: "t@monologg.dev" });
const REAL_PDF = Buffer.from("%PDF-1.4\nreal pdf bytes\n", "utf8");

describe("Media Kit routes (features.md Phase 12A.1)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /creators/:id/media-kit.pdf — public", () => {
    it("serves the current PDF bytes with no auth required", async () => {
      prismaMock.mediaKit.findUniqueOrThrow.mockResolvedValue({ mode: "AUTO", autoVersion: 5, autoLastRenderedAt: new Date() });
      prismaMock.creator.findUniqueOrThrow.mockResolvedValue({ id: "creator-1", name: "Ada", niche: "VO_ARTIST", location: "Lagos", bio: null, styleTags: [], verification: "UNVERIFIED", celebrityBadge: false });
      readMediaKitFileMock.mockResolvedValue(REAL_PDF);

      const response = await app.inject({ method: "GET", url: "/api/v1/creators/creator-1/media-kit.pdf" });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toBe("application/pdf");
      expect(response.headers["etag"]).toBe('"v5"');
      expect(response.rawPayload.subarray(0, 5).toString()).toBe("%PDF-");
    });

    it("404s for an unknown creator", async () => {
      prismaMock.mediaKit.findUniqueOrThrow.mockRejectedValue(new Error("not found"));

      const response = await app.inject({ method: "GET", url: "/api/v1/creators/does-not-exist/media-kit.pdf" });
      expect(response.statusCode).toBe(404);
    });
  });

  describe("GET /creators/me/media-kit", () => {
    it("requires auth", async () => {
      const response = await app.inject({ method: "GET", url: "/api/v1/creators/me/media-kit" });
      expect(response.statusCode).toBe(401);
    });

    it("returns the caller's own kit status", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      prismaMock.mediaKit.findUnique.mockResolvedValue({ creatorId: "creator-1", mode: "AUTO", autoVersion: 1 });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/creators/me/media-kit",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ mode: "AUTO" });
    });
  });

  describe("POST /creators/me/media-kit/upload", () => {
    it("400s an upload that isn't a real PDF (magic-byte check)", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/creators/me/media-kit/upload",
        headers: { authorization: `Bearer ${TALENT_TOKEN}`, "content-type": "application/pdf" },
        payload: Buffer.from("not a real pdf"),
      });

      expect(response.statusCode).toBe(400);
      expect(scannerMock.scan).not.toHaveBeenCalled();
    });

    it("413s an oversized upload", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      const oversized = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(21 * 1024 * 1024)]);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/creators/me/media-kit/upload",
        headers: { authorization: `Bearer ${TALENT_TOKEN}`, "content-type": "application/pdf" },
        payload: oversized,
      });

      expect(response.statusCode).toBe(413);
    });

    it("accepts a clean, real, correctly-sized PDF and flips mode to UPLOAD", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      scannerMock.scan.mockResolvedValue("CLEAN");
      prismaMock.mediaKit.update.mockResolvedValue({ creatorId: "creator-1", mode: "UPLOAD" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/creators/me/media-kit/upload",
        headers: { authorization: `Bearer ${TALENT_TOKEN}`, "content-type": "application/pdf" },
        payload: REAL_PDF,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().mode).toBe("UPLOAD");
    });

    it("400s a real PDF the scanner flags as infected", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      scannerMock.scan.mockResolvedValue("INFECTED");

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/creators/me/media-kit/upload",
        headers: { authorization: `Bearer ${TALENT_TOKEN}`, "content-type": "application/pdf" },
        payload: REAL_PDF,
      });

      expect(response.statusCode).toBe(400);
      expect(prismaMock.mediaKit.update).not.toHaveBeenCalled();
    });
  });

  describe("POST /creators/me/media-kit/revert", () => {
    it("switches mode back to AUTO", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      prismaMock.mediaKit.update.mockResolvedValue({ creatorId: "creator-1", mode: "AUTO" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/creators/me/media-kit/revert",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().mode).toBe("AUTO");
    });
  });
});
