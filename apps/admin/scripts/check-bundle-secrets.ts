import fs from "fs";
import path from "path";

/**
 * Build security check:
 * Inspects all client bundle JS files in `.next/static/` to ensure no backend secrets,
 * database connection strings, R2 credentials, service keys, or CRON_SECRET
 * were accidentally bundled into client-facing code.
 */
function scanDir(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath, fileList);
    } else if (file.endsWith(".js") || file.endsWith(".mjs")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const FORBIDDEN_PATTERNS = [
  /CRON_SECRET/i,
  /service_role/i,
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /R2_SECRET_ACCESS_KEY/i,
  /sk_live_[0-9a-zA-Z]{20,}/,
  /postgresql:\/\/[^:]+:[^@]+@/,
];

function checkBundleSecrets() {
  const staticDir = path.resolve(process.cwd(), ".next/static");
  if (!fs.existsSync(staticDir)) {
    console.log("[check-bundle-secrets] .next/static not found, skipping client bundle check.");
    return;
  }

  const jsFiles = scanDir(staticDir);
  console.log(`[check-bundle-secrets] Scanning ${jsFiles.length} client JavaScript bundle(s)...`);

  const violations: { file: string; pattern: string }[] = [];

  for (const file of jsFiles) {
    const content = fs.readFileSync(file, "utf8");
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(content)) {
        violations.push({ file: path.relative(process.cwd(), file), pattern: pattern.toString() });
      }
    }
  }

  if (violations.length > 0) {
    console.error("[check-bundle-secrets] CRITICAL SECURITY FAILURE: Forbidden secret pattern found in client bundle!");
    for (const v of violations) {
      console.error(` - Found ${v.pattern} in ${v.file}`);
    }
    process.exit(1);
  }

  console.log("[check-bundle-secrets] Scan clean. No sensitive secrets detected in client bundle.");
}

checkBundleSecrets();

