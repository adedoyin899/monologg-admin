import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import { env } from "../config/env.js";
import { prisma } from "../db/client.js";
import { cacheProvider } from "../providers/cache.js";

// ---------------------------------------------------------------------------
// Authentication Services
// - Password hashing and verification via Argon2id (default)
// - JWT signing & verifying for Access and Refresh tokens
// - Token hashing (SHA-256) for secure storage of refresh tokens in DB
// ---------------------------------------------------------------------------

export interface AccessTokenPayload {
  userId: string;
  userType: string;
  email: string;
}

export interface RefreshTokenPayload {
  userId: string;
  jti: string;
}

/**
 * Hash a plain-text password using Argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

/**
 * Verify a plain-text password against an Argon2id hash.
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (err) {
    // If the hash is malformed or verify fails internally, return false
    return false;
  }
}

/**
 * Hash a string (e.g. refresh token string) using SHA-256 for secure database storage.
 * This guarantees that even if the database is leaked, raw active refresh tokens
 * cannot be harvested to hijack sessions.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a short-lived access token (~15 minutes).
 */
export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
}

/**
 * Generate a long-lived rotating refresh token (~30 days).
 * Contains a unique JWT ID (jti) to track token family.
 */
export function generateRefreshToken(userId: string, jti: string): string {
  const payload: RefreshTokenPayload = { userId, jti };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: "30d" });
}

/**
 * Verify and decode an access token. Throws if invalid or expired.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

/**
 * Verify and decode a refresh token. Throws if invalid or expired.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

/**
 * Revokes all active refresh tokens for a user across the platform
 * and denylists their hashes in the cache. Used for security revocation,
 * suspension, and password resets.
 */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  const activeTokens = await prisma.refreshToken.findMany({
    where: { userId, revokedAt: null },
    select: { id: true, tokenHash: true },
  });

  if (activeTokens.length === 0) return 0;

  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  for (const token of activeTokens) {
    if (token.tokenHash) {
      await cacheProvider
        .set(`auth:denylist:${token.tokenHash}`, "revoked", 30 * 24 * 60 * 60)
        .catch(() => {});
    }
  }

  return activeTokens.length;
}
