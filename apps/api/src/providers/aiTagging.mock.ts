import type { AiTaggingProvider } from "./aiTagging.interface.js";

// ---------------------------------------------------------------------------
// Mock AiTaggingProvider — for dev and test environments.
// Returns a deterministic, reproducible set of style tags based on the asset URL.
// No real network calls; no real API key required.
// X3: Returns STYLE TAGS ONLY — never sets Creator.verification.
// ---------------------------------------------------------------------------

const MOCK_TAG_POOL = [
  "warm",
  "dramatic",
  "high-energy",
  "professional",
  "comedic",
  "authoritative",
  "intimate",
  "cinematic",
  "conversational",
  "inspirational",
];

export const mockAiTaggingProvider: AiTaggingProvider = {
  async tagMedia(assetUrl, _assetKind) {
    // Deterministic: derive a simple hash from the URL to always return
    // the same tags for the same asset — useful for snapshot tests.
    const hash = [...assetUrl].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const start = hash % MOCK_TAG_POOL.length;
    const styleTags = [
      MOCK_TAG_POOL[start % MOCK_TAG_POOL.length],
      MOCK_TAG_POOL[(start + 3) % MOCK_TAG_POOL.length],
      MOCK_TAG_POOL[(start + 7) % MOCK_TAG_POOL.length],
    ];
    return { styleTags, confidence: 0.92 };
  },
};
