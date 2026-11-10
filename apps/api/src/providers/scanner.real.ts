import type { ScannerProvider } from "./scanner.interface.js";

// Real ScannerProvider — TODO Phase 12A: integrate a real scanning backend
// (e.g. ClamAV over its daemon protocol, or a hosted API). Not implemented in
// this phase — no real scanning backend was named in the PRD, and standing
// one up (self-hosted ClamAV, or picking/paying for a hosted vendor) is a
// human decision, the same shape as Phase 7's KycProvider.real stub before a
// Smile Identity integration existed.
export const realScannerProvider: ScannerProvider = {
  async scan(_buffer) {
    throw new Error("[scanner.real] No real scanning backend integrated yet — Phase 12A.");
  },
};
