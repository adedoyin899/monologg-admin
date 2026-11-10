import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import { generateAccessToken } from "../services/auth.js";

vi.mock("../db/client.js", () => ({
  prisma: {
    creator: { findUnique: vi.fn() },
    verificationRecording: { create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("../providers/cache.js", () => ({
  cacheProvider: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
}));

vi.mock("../lib/verificationStorage.js", () => ({
  writeVerificationRecordingFile: vi.fn(),
}));

import { prisma } from "../db/client.js";
import { cacheProvider } from "../providers/cache.js";
import { writeVerificationRecordingFile } from "../lib/verificationStorage.js";

const prismaMock = prisma as any;
const cacheMock = cacheProvider as any;
const writeFileMock = writeVerificationRecordingFile as any;

const TALENT_TOKEN = generateAccessToken({ userId: "user-talent-1", userType: "TALENT", email: "t@monologg.dev" });
const OTHER_TOKEN = generateAccessToken({ userId: "user-reviewer-1", userType: "CLIENT", email: "r@monologg.dev" });

function box(type: string, body: Buffer): Buffer {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(8 + body.length, 0);
  header.write(type, 4, "ascii");
  return Buffer.concat([header, body]);
}
function mp4WithDurationSeconds(seconds: number): Buffer {
  const body = Buffer.alloc(1 + 3 + 4 + 4 + 4 + 4);
  body.writeUInt32BE(1000, 12); // timescale
  body.writeUInt32BE(seconds * 1000, 16); // duration
  const mvhd = box("mvhd", body);
  return Buffer.concat([box("ftyp", Buffer.from("isom")), box("moov", mvhd)]);
}

describe("Verification video routes (features.md Phase 12A.2)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /creators/me/verification/guideline-ack", () => {
    it("requires auth", async () => {
      const response = await app.inject({ method: "POST", url: "/api/v1/creators/me/verification/guideline-ack" });
      expect(response.statusCode).toBe(401);
    });

    it("sets the ack flag for the caller's own creator", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/creators/me/verification/guideline-ack",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(204);
      expect(cacheMock.set).toHaveBeenCalledWith(expect.stringContaining("creator-1"), "true", expect.any(Number));
    });
  });

  describe("POST /creators/me/verification/upload", () => {
    it("blocks upload until guidelines have been acknowledged", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      cacheMock.get.mockResolvedValue(null);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/creators/me/verification/upload",
        headers: { authorization: `Bearer ${TALENT_TOKEN}`, "content-type": "video/mp4" },
        payload: mp4WithDurationSeconds(30),
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().message).toContain("guideline");
    });

    it("422s a recording over 90s with a clear re-record signal, server-side, regardless of client claims", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      cacheMock.get.mockResolvedValue("true");

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/creators/me/verification/upload",
        headers: { authorization: `Bearer ${TALENT_TOKEN}`, "content-type": "video/mp4" },
        payload: mp4WithDurationSeconds(120),
      });

      expect(response.statusCode).toBe(422);
      const body = response.json();
      expect(body.reRecord).toBe(true);
      expect(body.durationSec).toBe(120);
    });

    it("accepts a valid <=90s recording and sets IN_REVIEW", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      cacheMock.get.mockResolvedValue("true");
      writeFileMock.mockResolvedValue("local://verification-recordings/x.mp4");
      prismaMock.verificationRecording.create.mockResolvedValue({ id: "rec-1", status: "IN_REVIEW", durationSec: 60 });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/creators/me/verification/upload",
        headers: { authorization: `Bearer ${TALENT_TOKEN}`, "content-type": "video/mp4" },
        payload: mp4WithDurationSeconds(60),
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({ status: "IN_REVIEW", durationSec: 60 });
    });
  });

  describe("GET /creators/me/verification", () => {
    it("returns the latest recording's status", async () => {
      prismaMock.creator.findUnique.mockResolvedValue({ id: "creator-1", userId: "user-talent-1" });
      prismaMock.verificationRecording.findFirst.mockResolvedValue({ id: "rec-1", status: "APPROVED" });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/creators/me/verification",
        headers: { authorization: `Bearer ${TALENT_TOKEN}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("APPROVED");
    });
  });

  describe("PATCH /verification-recordings/:id/review", () => {
    it("requires auth", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/verification-recordings/rec-1/review",
        payload: { status: "APPROVED" },
      });
      expect(response.statusCode).toBe(401);
    });

    it("APPROVED transitions the recording (no admin role system exists yet — any authenticated user, a flagged known gap)", async () => {
      prismaMock.verificationRecording.findUnique.mockResolvedValue({ id: "rec-1" });
      prismaMock.verificationRecording.update.mockResolvedValue({ id: "rec-1", status: "APPROVED" });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/verification-recordings/rec-1/review",
        headers: { authorization: `Bearer ${OTHER_TOKEN}` },
        payload: { status: "APPROVED" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("APPROVED");
    });

    it("NEEDS_RERECORD carries a reviewerNote through", async () => {
      prismaMock.verificationRecording.findUnique.mockResolvedValue({ id: "rec-1" });
      prismaMock.verificationRecording.update.mockResolvedValue({ id: "rec-1", status: "NEEDS_RERECORD", reviewerNote: "Show your hands." });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/verification-recordings/rec-1/review",
        headers: { authorization: `Bearer ${OTHER_TOKEN}` },
        payload: { status: "NEEDS_RERECORD", reviewerNote: "Show your hands." },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().reviewerNote).toBe("Show your hands.");
    });

    it("400s an invalid status value", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/verification-recordings/rec-1/review",
        headers: { authorization: `Bearer ${OTHER_TOKEN}` },
        payload: { status: "VERIFIED" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("404s an unknown recording id", async () => {
      prismaMock.verificationRecording.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/verification-recordings/does-not-exist/review",
        headers: { authorization: `Bearer ${OTHER_TOKEN}` },
        payload: { status: "APPROVED" },
      });
      expect(response.statusCode).toBe(404);
    });
  });
});
