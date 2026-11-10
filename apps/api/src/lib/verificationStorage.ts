import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Local-disk storage for verification recordings (features.md Phase 12A.2).
// Unlike MediaKit (one current file per creator), a creator can have several
// VerificationRecording rows over time (NEEDS_RERECORD supersedes rather than
// deletes) — each upload gets its own file, keyed by a random id, never
// creatorId alone.

const VERIFICATION_DIR = path.join(process.cwd(), "uploads", "verification-recordings");

export async function writeVerificationRecordingFile(bytes: Buffer): Promise<string> {
  await mkdir(VERIFICATION_DIR, { recursive: true });
  const filename = `${randomUUID()}.mp4`;
  await writeFile(path.join(VERIFICATION_DIR, filename), bytes);
  return `local://verification-recordings/${filename}`;
}
