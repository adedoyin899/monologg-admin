// ScannerProvider — virus/malware scanning seam for user-supplied file uploads
// (features.md Phase 12A, Media Kit upload override). Same provider-interface
// pattern as every other external dependency in this codebase (payment/KYC/
// calendar/notify/storage): a real implementation and a deterministic mock,
// selected by NODE_ENV/env flag in providers/index.ts.

export type ScanResult = "CLEAN" | "INFECTED";

export interface ScannerProvider {
  /** Scans raw file bytes. Never throws on an infected result — INFECTED is a
   * normal, expected return value, not an error; only a scanner-unavailable
   * condition (network/timeout) should throw. */
  scan(buffer: Buffer): Promise<ScanResult>;
}
