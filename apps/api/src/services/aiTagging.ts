import type { MediaAsset } from "@prisma/client";
import { prisma } from "../db/client.js";
import { aiTaggingProvider, notifyProvider } from "../providers/index.js";

// Style/vibe tagging service (features.md Phase 7). This is the ONLY place that
// ever writes Creator.styleTags — X3: never touches Creator.verification or the
// Verified badge. See services/kyc.ts for the fully independent identity system.
//
// No dedicated job queue exists yet (that's Phase 9's BullMQ work). In the
// meantime, confirmMediaUpload synchronously claims the QUEUED -> TAGGING
// transition (so the caller gets a definitive "tagging started" response), then
// runs the provider call + DONE/FAILED finalization in the background — the
// route/client polls GET /creators/me/media/:id for the real state, never a
// fixed timer.

export class TaggingAlreadyStartedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaggingAlreadyStartedError";
  }
}

/** POST /creators/me/media/:id/confirm — call once the client has finished
 * PUTting the file to the presigned URL. Claims the job and kicks it off. */
export async function confirmMediaUpload(asset: MediaAsset): Promise<MediaAsset> {
  if (asset.taggingStatus !== "QUEUED") {
    throw new TaggingAlreadyStartedError(`Media asset "${asset.id}" tagging has already been started`);
  }

  const updated = await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: { taggingStatus: "TAGGING" },
  });

  void processTaggingJob(updated.id).catch((err) => {
    console.error(`[services/aiTagging] tagging job crashed for ${asset.id}:`, err);
  });

  return updated;
}

/** The background job body: calls AiTaggingProvider, merges styleTags onto the
 * creator, and marks the asset DONE/FAILED. Exported so tests can await the
 * full pipeline directly instead of racing a fire-and-forget promise. */
export async function processTaggingJob(mediaAssetId: string): Promise<void> {
  const asset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: mediaAssetId } });

  try {
    const result = await aiTaggingProvider.tagMedia(asset.url, asset.kind);
    const creator = await prisma.creator.findUniqueOrThrow({ where: { id: asset.creatorId } });
    const styleTags = Array.from(new Set([...creator.styleTags, ...result.styleTags]));

    await prisma.$transaction([
      prisma.mediaAsset.update({ where: { id: mediaAssetId }, data: { taggingStatus: "DONE" } }),
      prisma.creator.update({ where: { id: asset.creatorId }, data: { styleTags } }),
    ]);

    await notifyProvider
      .inApp(creator.userId, { kind: "tagging_done", mediaAssetId, styleTags: result.styleTags })
      .catch(() => {});
  } catch (err) {
    await prisma.mediaAsset.update({ where: { id: mediaAssetId }, data: { taggingStatus: "FAILED" } });
    throw err;
  }
}
