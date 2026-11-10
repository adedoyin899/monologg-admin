import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/client.js", () => ({
  prisma: {
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
import {
  acknowledgeGuidelines,
  uploadVerificationRecording,
  getLatestVerificationRecording,
  reviewVerificationRecording,
  GuidelinesNotAcknowledgedError,
  RecordingTooLongError,
  RecordingUploadTooLargeError,
  InvalidRecordingFileError,
  InvalidReviewStatusError,
  RecordingNotFoundError,
  MAX_UPLOAD_BYTES,
  MAX_RECORDING_SECONDS,
} from "./verificationRecording.js";

const prismaMock = prisma as any;
const cacheMock = cacheProvider as any;
const writeFileMock = writeVerificationRecordingFile as any;

// Minimal real MP4 (ftyp + moov > mvhd) built the same way lib/videoDuration.test.ts
// does, so this test exercises the real parser, not a mocked duration.
function box(type: string, body: Buffer): Buffer {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(8 + body.length, 0);
  header.write(type, 4, "ascii");
  return Buffer.concat([header, body]);
}
function mp4WithDurationSeconds(seconds: number): Buffer {
  const timescale = 1000;
  const body = Buffer.alloc(1 + 3 + 4 + 4 + 4 + 4);
  body.writeUInt8(0, 0);
  body.writeUInt32BE(0, 4);
  body.writeUInt32BE(0, 8);
  body.writeUInt32BE(timescale, 12);
  body.writeUInt32BE(seconds * timescale, 16);
  const mvhd = box("mvhd", body);
  const ftyp = box("ftyp", Buffer.from("isom", "ascii"));
  return Buffer.concat([ftyp, box("moov", mvhd)]);
}

describe("Verification recording service (features.md Phase 12A.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("acknowledgeGuidelines", () => {
    it("caches an ack flag with a TTL, keyed per creator", async () => {
      await acknowledgeGuidelines("creator-1");
      expect(cacheMock.set).toHaveBeenCalledWith(expect.stringContaining("creator-1"), "true", expect.any(Number));
    });
  });

  describe("uploadVerificationRecording", () => {
    it("rejects when guidelines were never acknowledged", async () => {
      cacheMock.get.mockResolvedValue(null);
      const mp4 = mp4WithDurationSeconds(30);
      await expect(uploadVerificationRecording("creator-1", mp4)).rejects.toThrow(GuidelinesNotAcknowledgedError);
      expect(writeFileMock).not.toHaveBeenCalled();
    });

    it("rejects an oversized upload before even checking the ack flag", async () => {
      const oversized = Buffer.alloc(MAX_UPLOAD_BYTES + 1);
      await expect(uploadVerificationRecording("creator-1", oversized)).rejects.toThrow(RecordingUploadTooLargeError);
      expect(cacheMock.get).not.toHaveBeenCalled();
    });

    it("rejects a non-MP4 file with a clear error", async () => {
      cacheMock.get.mockResolvedValue("true");
      await expect(uploadVerificationRecording("creator-1", Buffer.from("not a video"))).rejects.toThrow(InvalidRecordingFileError);
    });

    it("SERVER-AUTHORITATIVE: rejects a recording over 90s even though nothing client-side enforced it", async () => {
      cacheMock.get.mockResolvedValue("true");
      const tooLong = mp4WithDurationSeconds(MAX_RECORDING_SECONDS + 1);

      await expect(uploadVerificationRecording("creator-1", tooLong)).rejects.toThrow(RecordingTooLongError);
      expect(writeFileMock).not.toHaveBeenCalled();
      expect(prismaMock.verificationRecording.create).not.toHaveBeenCalled();
      // The ack flag survives a rejected upload — the talent doesn't have to
      // re-tick the checklist just to retry with a shorter clip.
      expect(cacheMock.del).not.toHaveBeenCalled();
    });

    it("accepts a <=90s recording, stores it, sets IN_REVIEW, and consumes the ack flag", async () => {
      cacheMock.get.mockResolvedValue("true");
      writeFileMock.mockResolvedValue("local://verification-recordings/abc.mp4");
      prismaMock.verificationRecording.create.mockResolvedValue({
        id: "rec-1", creatorId: "creator-1", status: "IN_REVIEW", durationSec: 45, guidelineAck: true,
      });

      const result = await uploadVerificationRecording("creator-1", mp4WithDurationSeconds(45));

      expect(prismaMock.verificationRecording.create).toHaveBeenCalledWith({
        data: {
          creatorId: "creator-1",
          url: "local://verification-recordings/abc.mp4",
          durationSec: 45,
          guidelineAck: true,
          status: "IN_REVIEW",
        },
      });
      expect(cacheMock.del).toHaveBeenCalledWith(expect.stringContaining("creator-1"));
      expect(result.status).toBe("IN_REVIEW");
    });

    it("accepts exactly 90s (boundary — not > 90)", async () => {
      cacheMock.get.mockResolvedValue("true");
      writeFileMock.mockResolvedValue("local://verification-recordings/boundary.mp4");
      prismaMock.verificationRecording.create.mockResolvedValue({ id: "rec-2", status: "IN_REVIEW" });

      await expect(uploadVerificationRecording("creator-1", mp4WithDurationSeconds(90))).resolves.toMatchObject({ status: "IN_REVIEW" });
    });
  });

  describe("getLatestVerificationRecording", () => {
    it("orders by createdAt desc — the most recent row is authoritative", async () => {
      await getLatestVerificationRecording("creator-1");
      expect(prismaMock.verificationRecording.findFirst).toHaveBeenCalledWith({
        where: { creatorId: "creator-1" },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("reviewVerificationRecording", () => {
    it("rejects a status other than APPROVED/NEEDS_RERECORD", async () => {
      await expect(reviewVerificationRecording("rec-1", "IN_REVIEW" as any)).rejects.toThrow(InvalidReviewStatusError);
      expect(prismaMock.verificationRecording.update).not.toHaveBeenCalled();
    });

    it("404s (throws) for an unknown recording id", async () => {
      prismaMock.verificationRecording.findUnique.mockResolvedValue(null);
      await expect(reviewVerificationRecording("does-not-exist", "APPROVED")).rejects.toThrow(RecordingNotFoundError);
    });

    it("APPROVED sets status and clears reviewerNote if none given", async () => {
      prismaMock.verificationRecording.findUnique.mockResolvedValue({ id: "rec-1" });
      prismaMock.verificationRecording.update.mockResolvedValue({ id: "rec-1", status: "APPROVED" });

      const result = await reviewVerificationRecording("rec-1", "APPROVED");

      expect(prismaMock.verificationRecording.update).toHaveBeenCalledWith({
        where: { id: "rec-1" },
        data: { status: "APPROVED", reviewerNote: null },
      });
      expect(result.status).toBe("APPROVED");
    });

    it("NEEDS_RERECORD carries the reviewer's note through", async () => {
      prismaMock.verificationRecording.findUnique.mockResolvedValue({ id: "rec-1" });
      prismaMock.verificationRecording.update.mockResolvedValue({ id: "rec-1", status: "NEEDS_RERECORD", reviewerNote: "Please show your hands." });

      const result = await reviewVerificationRecording("rec-1", "NEEDS_RERECORD", "Please show your hands.");

      expect(prismaMock.verificationRecording.update).toHaveBeenCalledWith({
        where: { id: "rec-1" },
        data: { status: "NEEDS_RERECORD", reviewerNote: "Please show your hands." },
      });
      expect(result.reviewerNote).toBe("Please show your hands.");
    });
  });
});
