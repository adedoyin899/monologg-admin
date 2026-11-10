import type { ScannerProvider, ScanResult } from "./scanner.interface.js";

// Mock ScannerProvider — deterministic, no real AV engine. Detects the EICAR
// test string (https://www.eicar.org/download-anti-malware-testfile/), the
// industry-standard synthetic "this looks like malware" signature every real
// antivirus product also detects on sight without it being actual malware —
// this is exactly what lets tests exercise a genuine "dirty" path with a real,
// safe, well-known byte sequence instead of a fake sentinel this codebase
// invented, which real scanners obviously wouldn't recognize.
const EICAR_SIGNATURE = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

export const mockScannerProvider: ScannerProvider = {
  async scan(buffer: Buffer): Promise<ScanResult> {
    return buffer.includes(EICAR_SIGNATURE) ? "INFECTED" : "CLEAN";
  },
};
