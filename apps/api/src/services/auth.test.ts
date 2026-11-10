import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
} from "./auth.js";

describe("Auth Services (Argon2id & JWT)", () => {
  describe("Argon2id Hashing", () => {
    it("hashes and verifies a password successfully", async () => {
      const password = "my-secure-password-123";
      const hash = await hashPassword(password);

      expect(hash).toContain("$argon2id$"); // verify default is argon2id
      expect(await verifyPassword(hash, password)).toBe(true);
    });

    it("returns false for incorrect password verify", async () => {
      const password = "my-secure-password-123";
      const hash = await hashPassword(password);

      expect(await verifyPassword(hash, "wrong-password")).toBe(false);
    });

    it("handles malformed hashes gracefully without throwing", async () => {
      expect(await verifyPassword("invalid-hash-string", "password")).toBe(false);
    });
  });

  describe("Token Hashing (SHA-256)", () => {
    it("returns correct deterministic SHA-256 hash", () => {
      const token = "my-raw-jwt-refresh-token";
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // 64 hex characters
    });
  });

  describe("JWT Operations", () => {
    const payload = {
      userId: "user-123",
      userType: "TALENT",
      email: "talent@example.com",
    };

    it("issues and decodes a valid access token", () => {
      const token = generateAccessToken(payload);
      const decoded = verifyAccessToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.userType).toBe(payload.userType);
      expect(decoded.email).toBe(payload.email);
    });

    it("issues and decodes a valid refresh token containing jti", () => {
      const jti = "token-jti-uuid";
      const token = generateRefreshToken(payload.userId, jti);
      const decoded = verifyRefreshToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.jti).toBe(jti);
    });

    it("throws error for expired or invalid access tokens", () => {
      expect(() => verifyAccessToken("invalid-access-token")).toThrow();
    });

    it("throws error for expired or invalid refresh tokens", () => {
      expect(() => verifyRefreshToken("invalid-refresh-token")).toThrow();
    });
  });
});
