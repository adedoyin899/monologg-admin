import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/client.js", () => ({
  prisma: {
    mediaAsset: { update: vi.fn(), findUniqueOrThrow: vi.fn() },
    creator: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../providers/index.js", () => ({
  aiTaggingProvider: { tagMedia: vi.fn() },
  notifyProvider: { email: vi.fn(), sms: vi.fn(), inApp: vi.fn() },
}));

import { prisma } from "../db/client.js";
import { aiTaggingProvider, notifyProvider } from "../providers/index.js";
import { confirmMediaUpload, processTaggingJob, TaggingAlreadyStartedError } from "./aiTagging.js";

const prismaMock = prisma as any;
const aiTaggingProviderMock = aiTaggingProvider as any;
const notifyProviderMock = notifyProvider as any;

function mediaAsset(overrides: Partial<{ id: string; creatorId: string; taggingStatus: string; url: string; kind: string }> = {}) {
  return { id: "media-1", creatorId: "creator-1", url: "https://cdn.test/media-1", kind: "VIDEO", taggingStatus: "QUEUED", ...overrides } as any;
}

describe("AI style-tagging service (features.md Phase 7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifyProviderMock.inApp.mockResolvedValue(undefined);
  });

  describe("confirmMediaUpload", () => {
    it("claims QUEUED -> TAGGING and kicks off the job", async () => {
      const asset = mediaAsset();
      prismaMock.mediaAsset.update.mockResolvedValue({ ...asset, taggingStatus: "TAGGING" });
      // job body runs in the background; give it something inert to resolve against
      prismaMock.mediaAsset.findUniqueOrThrow.mockResolvedValue({ ...asset, taggingStatus: "TAGGING" });
      aiTaggingProviderMock.tagMedia.mockResolvedValue({ styleTags: ["warm"] });
      prismaMock.creator.findUniqueOrThrow.mockResolvedValue({ id: "creator-1", userId: "user-1", styleTags: [] });
      prismaMock.$transaction.mockResolvedValue([{}, {}]);

      const result = await confirmMediaUpload(asset);

      expect(prismaMock.mediaAsset.update).toHaveBeenCalledWith({
        where: { id: "media-1" },
        data: { taggingStatus: "TAGGING" },
      });
      expect(result.taggingStatus).toBe("TAGGING");
    });

    it("rejects confirming an asset that isn't QUEUED", async () => {
      await expect(confirmMediaUpload(mediaAsset({ taggingStatus: "DONE" }))).rejects.toThrow(
        TaggingAlreadyStartedError,
      );
      expect(prismaMock.mediaAsset.update).not.toHaveBeenCalled();
    });
  });

  describe("processTaggingJob", () => {
    it("calls AiTaggingProvider, merges styleTags onto the creator, and marks DONE — never touching verification", async () => {
      const asset = mediaAsset({ taggingStatus: "TAGGING" });
      prismaMock.mediaAsset.findUniqueOrThrow.mockResolvedValue(asset);
      aiTaggingProviderMock.tagMedia.mockResolvedValue({ styleTags: ["warm", "dramatic"] });
      prismaMock.creator.findUniqueOrThrow.mockResolvedValue({ id: "creator-1", userId: "user-1", styleTags: ["existing"] });
      prismaMock.$transaction.mockResolvedValue([
        { id: "media-1", taggingStatus: "DONE" },
        { id: "creator-1", styleTags: ["existing", "warm", "dramatic"] },
      ]);

      await processTaggingJob("media-1");

      expect(aiTaggingProviderMock.tagMedia).toHaveBeenCalledWith("https://cdn.test/media-1", "VIDEO");
      const transactionArgs = prismaMock.$transaction.mock.calls[0][0];
      expect(transactionArgs).toHaveLength(2);
      expect(notifyProviderMock.inApp).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ kind: "tagging_done", styleTags: ["warm", "dramatic"] }),
      );
      // Separation (X3): the creator update this job builds must only ever touch
      // styleTags — never verification/the Verified badge.
      expect(prismaMock.creator.update).toHaveBeenCalledWith({
        where: { id: "creator-1" },
        data: { styleTags: ["existing", "warm", "dramatic"] },
      });
      const creatorUpdateCall = prismaMock.creator.update.mock.calls[0][0];
      expect(creatorUpdateCall.data).not.toHaveProperty("verification");
    });

    it("marks FAILED when the provider throws, and does not touch styleTags", async () => {
      const asset = mediaAsset({ taggingStatus: "TAGGING" });
      prismaMock.mediaAsset.findUniqueOrThrow.mockResolvedValue(asset);
      aiTaggingProviderMock.tagMedia.mockRejectedValue(new Error("provider unreachable"));
      prismaMock.mediaAsset.update.mockResolvedValue({ ...asset, taggingStatus: "FAILED" });

      await expect(processTaggingJob("media-1")).rejects.toThrow("provider unreachable");

      expect(prismaMock.mediaAsset.update).toHaveBeenCalledWith({
        where: { id: "media-1" },
        data: { taggingStatus: "FAILED" },
      });
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });
});
