// StorageProvider — presigned-upload seam for creator media (features.md Phase 5).
// Real implementation: any S3-compatible object store (AWS S3, Cloudflare R2, etc.).
// Mock: local disk, fronted by a dedicated PUT route (see routes/uploads.ts) so the
// same presigned-URL flow works with zero cloud credentials in dev/test.
//
// The API never accepts raw file bytes through a JSON body — callers PUT directly
// to the returned `uploadUrl`.

export type MediaKind = "VIDEO" | "AUDIO";

export interface PresignedUpload {
  /** Where the client PUTs the raw file bytes. */
  uploadUrl: string;
  /** The URL the file will be reachable at once the upload completes. */
  fileUrl: string;
  method: "PUT";
}

export interface StorageProvider {
  /**
   * Issue a presigned upload for a file the caller has already told us the
   * kind/size of. Type (video/audio) and the 150MB cap are enforced by the
   * route before this is ever called — the provider trusts its caller.
   */
  createPresignedUpload(params: {
    ownerId: string;
    kind: MediaKind;
    sizeBytes: number;
  }): Promise<PresignedUpload>;
}
