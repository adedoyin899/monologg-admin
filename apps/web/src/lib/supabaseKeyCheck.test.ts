// Phase 12B: verify that SUPABASE_SERVICE_ROLE_KEY never appears in any web source file.
// This is the same pattern as the existing forbidden-string guard in the test suite.
// Run as part of `vitest run` in apps/web.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

// __dirname = apps/web/src/lib — go up to apps/web/src
const WEB_SRC = resolve(__dirname, "..");

/**
 * Recursively collect all TypeScript/TSX/CSS/HTML source file paths under a dir,
 * excluding node_modules and the dist folder.
 */
function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (entry === "node_modules" || entry === "dist" || entry === ".git") continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectSourceFiles(full, acc);
    } else if (/\.(ts|tsx|css|html|env\.example)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe("Supabase service role key isolation", () => {
  it("SUPABASE_SERVICE_ROLE_KEY does not appear in any web source file", () => {
    const sourceFiles = collectSourceFiles(WEB_SRC);
    const violations: string[] = [];

    for (const file of sourceFiles) {
      // Skip test files — they reference the forbidden string as a string literal
      // in their own assertions (that's the point of the test, not a real usage).
      if (file.includes(".test.") || file.includes(".spec.") || file.includes(".env")) continue;
      const content = readFileSync(file, "utf-8");
      if (content.includes("SUPABASE_SERVICE_ROLE_KEY")) {
        violations.push(file);
      }
    }

    expect(
      violations,
      `SUPABASE_SERVICE_ROLE_KEY found in client-side files:\n${violations.join("\n")}\nThis key must NEVER appear in apps/web — it belongs in apps/api only.`,
    ).toHaveLength(0);
  });

  it("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are the only Supabase vars referenced in web source", () => {
    const sourceFiles = collectSourceFiles(WEB_SRC);
    // Allow only the safe Vite-prefixed vars in non-test source files
    const FORBIDDEN_PATTERN = /\bSUPABASE_(?!(URL|ANON_KEY|MODE)\b)/;

    const violations: string[] = [];
    for (const file of sourceFiles) {
      // Skip: .env.example (documents configs), test files (they reference the patterns as strings
      // in their own assertions — that's the whole point, not a real usage)
      if (file.includes(".env") || file.includes(".test.") || file.includes(".spec.")) continue;
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Skip pure comment lines
        if (line.startsWith("//") || line.startsWith("*") || line.startsWith("#")) continue;
        if (FORBIDDEN_PATTERN.test(line)) {
          violations.push(`${file}:${i + 1}: ${lines[i].trim()}`);
        }
      }
    }

    expect(
      violations,
      `Unexpected raw SUPABASE_ env reference in client-side source files:\n${violations.join("\n")}`,
    ).toHaveLength(0);
  });
});
