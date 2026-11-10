import type { StorageProvider } from "./storage.interface.js";

// Real StorageProvider — any S3-compatible object store (AWS S3, Cloudflare R2, etc.).
// TODO: implement using an AWS SDK v3 S3Client + getSignedUrl (or the equivalent for
// whichever provider is chosen) once real storage credentials exist. Not phase-gated
// like payments/KYC/calendar — implement whenever real media upload goes to production.

export const realStorageProvider: StorageProvider = {
  async createPresignedUpload(_params) {
    throw new Error("[storage.real] Object storage integration not yet implemented.");
  },
};
