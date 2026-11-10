import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "./encryption.js";

// features.md Phase 8 gate: "OAuth connect stores an encrypted refresh token
// (test asserts it's not plaintext...)". NODE_ENV=test supplies a fixed
// CALENDAR_TOKEN_ENCRYPTION_KEY (config/env.ts), so this runs with no real key.

describe("lib/encryption (AES-256-GCM)", () => {
  it("round-trips plaintext through encrypt -> decrypt", () => {
    const plaintext = "1//0gExampleGoogleRefreshTokenValue";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it("ciphertext never contains the plaintext substring", () => {
    const plaintext = "super-secret-refresh-token-xyz";
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toContain(plaintext);
    expect(ciphertext).not.toBe(plaintext);
  });

  it("encrypting the same plaintext twice produces different ciphertext (random IV)", () => {
    const plaintext = "same-token";
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe(plaintext);
    expect(decrypt(b)).toBe(plaintext);
  });

  it("rejects tampered ciphertext instead of silently returning garbage (GCM auth tag)", () => {
    const ciphertext = encrypt("integrity-check");
    const bytes = Buffer.from(ciphertext, "base64");
    bytes[bytes.length - 1] ^= 0xff; // flip a bit in the ciphertext tail
    const tampered = bytes.toString("base64");
    expect(() => decrypt(tampered)).toThrow();
  });
});
