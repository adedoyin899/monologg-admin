// AiTaggingProvider — interface for style/vibe tagging of creator media.
//
// X3 — CRITICAL SEPARATION: this provider performs STYLE TAGGING ONLY.
// It must NEVER be used to set Creator.verification or the Verified badge.
// Identity KYC is a completely separate system: see kyc.interface.ts.
// "Thespian AI" (the original feature name in older specs) referred to this
// tagging-only capability — it has NO identity verification function.
// See features.md §1 conflict correction X3.

export interface TagMediaResult {
  /** Style/vibe tags inferred from the media, e.g. ["warm", "dramatic", "high-energy"]. */
  styleTags: string[];
  /** Provider confidence score, 0–1. Present on real impl; undefined on mock. */
  confidence?: number;
}

export interface AiTaggingProvider {
  /**
   * Analyse a media asset URL and return style/vibe tags.
   * This is called from a background job (BullMQ queue, Phase 9) after media upload.
   * The result is written to Creator.styleTags — never to Creator.verification.
   *
   * @param assetUrl - Public or presigned URL of the video/audio asset.
   * @param assetKind - "VIDEO" | "AUDIO" — helps the model pick the right analysis path.
   */
  tagMedia(assetUrl: string, assetKind: "VIDEO" | "AUDIO"): Promise<TagMediaResult>;
}
