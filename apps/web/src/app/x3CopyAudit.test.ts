import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// features.md Phase 7, X3: "no screen implies AI does identity." Style/vibe
// tagging (Thespian AI) and identity KYC (the Verified badge) are fully
// independent systems — see apps/api/src/providers/aiTagging.interface.ts and
// kyc.interface.ts. This walks every .ts/.tsx file under src/app and fails if
// any of them contains copy that attributes identity verification to the AI.
//
// Patterns are specific, known-bad phrasings (regression guards for the copy
// this phase actually fixed), not a broad "AI" + "verif" co-occurrence check —
// several legitimate sentences in this same codebase correctly use both words
// together to *clarify* the separation (e.g. "...generated your profile tags.
// This is separate from identity verification."), and a fuzzy heuristic would
// flag those false positives.

const SRC_APP = join(__dirname);

const BANNED_PATTERNS: RegExp[] = [
  /thespian[\s-]*(ai[\s-]*)?verif/i, // "Thespian Verified", "Thespian AI Verified/Verification"
  /ai[\s-]*verif(y|ies|ied|ication)/i, // "AI verification", "AI-verified"
  /verif\w*\s+by\s+ai/i, // "verified by AI"
  /ai[\s-]*screen(ed|ing)?\b/i, // "AI-screened"
  /quality\s+kyc/i, // "acting as a quality KYC"
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) return walk(full);
    if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) return [full];
    return [];
  });
}

describe("X3 copy audit — AI style-tagging must never imply identity verification", () => {
  it("no file under src/app contains copy conflating the AI with identity verification", () => {
    const offenders: string[] = [];

    for (const file of walk(SRC_APP)) {
      const content = readFileSync(file, "utf-8");
      for (const pattern of BANNED_PATTERNS) {
        if (pattern.test(content)) {
          offenders.push(`${relative(join(__dirname, "..", ".."), file)} matches ${pattern}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
