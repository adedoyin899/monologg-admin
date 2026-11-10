import crypto from "node:crypto";
import { env } from "../config/env.js";

// AES-256-GCM helper (features.md Phase 8) — the only place secrets that must be
// stored long-term (currently: CalendarConnection.encryptedRefreshToken) get
// encrypted/decrypted. GCM's auth tag makes tampered ciphertext fail to decrypt
// rather than silently returning garbage.
//
// Output format: base64(iv[12] || authTag[16] || ciphertext). A fresh random IV
// per call means encrypting the same plaintext twice never produces the same
// ciphertext — this is by design, not a bug to "fix" with a cached/derived IV.

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function requireKey(): Buffer {
  if (!env.CALENDAR_TOKEN_ENCRYPTION_KEY) {
    throw new Error(
      "[lib/encryption] CALENDAR_TOKEN_ENCRYPTION_KEY is not configured — required to store or read an encrypted calendar token.",
    );
  }
  return Buffer.from(env.CALENDAR_TOKEN_ENCRYPTION_KEY, "hex");
}

export function encrypt(plaintext: string): string {
  const key = requireKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decrypt(payload: string): string {
  const key = requireKey();
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
