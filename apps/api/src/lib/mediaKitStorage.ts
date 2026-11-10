import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";

// Local-disk storage for Media Kit PDF bytes (features.md Phase 12A). Unlike
// creator media (large video/audio, always client-authored — see
// providers/storage.*), a media kit PDF is small (<=20MB), and for the AUTO
// case is server-generated, not client-uploaded — there's no real "presign a
// client upload" step to seam behind a StorageProvider for that path. This is
// a dedicated, minimal helper rather than a general-purpose provider
// interface: it has exactly one real-world backing (local disk in dev; a real
// deploy would swap this for a bucket write, same shape as StorageProvider.real
// eventually gains one) and doesn't need a mock/real split of its own since
// both AUTO and UPLOAD already go through the same synchronous validation
// path in services/mediaKit.ts regardless of environment.

const MEDIA_KIT_DIR = path.join(process.cwd(), "uploads", "media-kits");

function keyFor(creatorId: string, variant: "auto" | "upload"): string {
  return path.join(MEDIA_KIT_DIR, `${creatorId}-${variant}.pdf`);
}

export async function writeMediaKitFile(creatorId: string, variant: "auto" | "upload", bytes: Buffer): Promise<void> {
  await mkdir(MEDIA_KIT_DIR, { recursive: true });
  await writeFile(keyFor(creatorId, variant), bytes);
}

export async function readMediaKitFile(creatorId: string, variant: "auto" | "upload"): Promise<Buffer | null> {
  try {
    return await readFile(keyFor(creatorId, variant));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function deleteMediaKitFile(creatorId: string, variant: "auto" | "upload"): Promise<void> {
  await rm(keyFor(creatorId, variant), { force: true });
}
