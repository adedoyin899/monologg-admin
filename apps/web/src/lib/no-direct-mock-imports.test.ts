import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// features.md Phase 1 acceptance: "No component imports mock data directly;
// all go through api-client." This walks every .ts/.tsx file under src/app
// (components and pages — never src/mocks or src/lib themselves) and fails
// if any of them imports from "../mocks", "../../mocks", etc. api-client.ts
// is the one, single place allowed to import the mocks.

const SRC_APP = join(__dirname, "..", "app");
const MOCK_IMPORT_PATTERN = /from\s+["'](?:\.\.\/)+mocks(?:\/[^"']*)?["']/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) return walk(full);
    if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) return [full];
    return [];
  });
}

describe("mock-data import boundary", () => {
  it("no file under src/app imports from src/mocks directly", () => {
    const offenders = walk(SRC_APP)
      .filter((file) => MOCK_IMPORT_PATTERN.test(readFileSync(file, "utf-8")))
      .map((file) => relative(join(__dirname, "..", ".."), file));

    expect(offenders).toEqual([]);
  });
});
