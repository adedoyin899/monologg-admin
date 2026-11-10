import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { PresignedUpload, StorageProvider } from "./storage.interface.js";

// Mock StorageProvider — local disk instead of S3. The "presigned URL" is a real
// route on this same server (see routes/uploads.ts), which looks tokens up in
// `pendingUploads` below to know where to write the file and reject anything that
// wasn't actually issued a presign first.

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export interface PendingUpload {
  ownerId: string;
  sizeBytes: number;
  filePath: string;
}

// Exported so routes/uploads.ts (the mock "presigned endpoint" itself) can consume
// tokens issued here — this coupling is fine since both only exist together in mock mode.
export const pendingUploads = new Map<string, PendingUpload>();

export const mockStorageProvider: StorageProvider = {
  async createPresignedUpload({ ownerId, sizeBytes }): Promise<PresignedUpload> {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const token = randomUUID();
    const filePath = path.join(UPLOAD_DIR, token);
    pendingUploads.set(token, { ownerId, sizeBytes, filePath });

    return {
      uploadUrl: `/api/v1/uploads/local/${token}`,
      fileUrl: `/api/v1/uploads/local/${token}`,
      method: "PUT",
    };
  },
};
