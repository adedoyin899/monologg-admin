import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { buildApp } from "../app.js";
import { pendingUploads } from "../providers/storage.mock.js";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

describe("PUT /uploads/local/:token — the mock StorageProvider's presigned endpoint", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    pendingUploads.clear();
    // These tests register tokens directly via pendingUploads.set(), bypassing
    // createPresignedUpload() — which is normally what creates UPLOAD_DIR (see
    // storage.mock.ts) before any token exists. Without this, writeFile() below
    // 500s with ENOENT unless some other test file happened to create the dir
    // first — a real, order-dependent flake, not a hypothetical one.
    await mkdir(UPLOAD_DIR, { recursive: true });
  });

  afterEach(async () => {
    await app.close();
    await rm(UPLOAD_DIR, { recursive: true, force: true });
  });

  it("writes the file to disk and consumes the token on a matching-size upload", async () => {
    const body = Buffer.from("fake video bytes");
    pendingUploads.set("token-1", {
      ownerId: "creator-1",
      sizeBytes: body.length,
      filePath: path.join(UPLOAD_DIR, "token-1"),
    });

    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/uploads/local/token-1",
      headers: { "content-type": "application/octet-stream" },
      payload: body,
    });

    expect(response.statusCode).toBe(200);
    expect(pendingUploads.has("token-1")).toBe(false);
  });

  it("rejects an unknown token", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/uploads/local/never-issued",
      headers: { "content-type": "application/octet-stream" },
      payload: Buffer.from("bytes"),
    });

    expect(response.statusCode).toBe(404);
  });

  it("rejects a body whose size doesn't match what was declared at presign time", async () => {
    pendingUploads.set("token-2", {
      ownerId: "creator-1",
      sizeBytes: 999_999,
      filePath: path.join(UPLOAD_DIR, "token-2"),
    });

    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/uploads/local/token-2",
      headers: { "content-type": "application/octet-stream" },
      payload: Buffer.from("short"),
    });

    expect(response.statusCode).toBe(400);
    // The token stays valid — reject-and-retry, not reject-and-burn.
    expect(pendingUploads.has("token-2")).toBe(true);
  });
});
