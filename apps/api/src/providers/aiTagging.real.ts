import type { AiTaggingProvider } from "./aiTagging.interface.js";

// Real AiTaggingProvider — Phase 7 (e.g. GPT-4o or a specialist media-analysis model).
// X3: Sets STYLE TAGS ONLY. Never sets Creator.verification or the Verified badge.

export const realAiTaggingProvider: AiTaggingProvider = {
  async tagMedia(_assetUrl, _assetKind) {
    throw new Error("[aiTagging.real] AI tagging integration not yet implemented — Phase 7.");
  },
};
