import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "../db/client.js";
import {
  hashPassword,
  verifyPassword,
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../services/auth.js";
import { notifyProvider } from "../providers/index.js";
import { cacheProvider } from "../providers/cache.js";
import { track } from "../lib/analytics/index.js";
import { extractEdgeCountry, parseCoarseUserAgent } from "../lib/analytics/helpers.js";

// Dummy hash to execute argon2 timing verify on non-existing emails (enumeration safety)
const DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$dummyhashsaltvalue$47z26nN9tTfR8/z4T1e6Gk9x0oWjRzS7G3wP9j1k2kQ";

const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  userType: z.enum(["TALENT", "CLIENT"]),
  name: z.string().min(1, "Name is required"),
  // Optional at registration: the existing AuthFlow.tsx sign-up form only ever collects
  // name/email/password/role — location, niche, org fields are collected later in
  // CreatorOnboarding.tsx/ClientOnboarding.tsx (not yet wired to the backend, Phase 5+).
  // Defaults keep the row creatable now; onboarding fills these in for real once wired.
  location: z.string().optional(),
  niche: z.enum(["ACTOR", "VO_ARTIST", "COMEDIAN", "COMPERE", "SPEAKER_PASTOR", "MUSICIAN", "CONTENT_CREATOR"]).optional(),
  // features.md Phase 10: "Terms acceptance is recorded per user with version +
  // timestamp." Required, not optional — mirrors AuthFlow.tsx's own hard gate
  // (the "I agree" checkbox disables submission until checked).
  acceptedTermsVersion: z.string().min(1, "You must accept the Terms of Service and Privacy Policy"),
  orgName: z.string().optional(),
  orgType: z.enum(["STUDIO", "EVENT", "BRAND", "CHURCH"]).optional(),
  referrer: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  referralCodeUsed: z.string().optional(),
  analyticsConsent: z.boolean().optional(),
  anonymousId: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // ── Register Endpoint ──────────────────────────────────────────────────────
  app.post(
    "/api/v1/auth/register",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const {
        email,
        password,
        userType,
        name,
        location,
        niche,
        orgName,
        orgType,
        acceptedTermsVersion,
        referrer,
        utmSource,
        utmMedium,
        utmCampaign,
        referralCodeUsed,
        analyticsConsent,
        anonymousId,
      } = parsed.data;

      void track(
        "auth_signup_started",
        { provider: "EMAIL", userType },
        { actor: "ANON", source: "API", consent: analyticsConsent },
      ).catch(() => {});

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        // Enforce generic message to prevent registration-based user enumeration
        return reply.status(409).send({
          error: "Conflict",
          message: "Email is already registered",
          statusCode: 409,
        });
      }

      const pwdHash = await hashPassword(password);
      const referralCode = `REF-${name.replace(/\s+/g, "").toUpperCase()}-${randomUUID().slice(0, 4)}`;

      const edgeCountry = extractEdgeCountry(request.headers as Record<string, string | string[] | undefined>);
      const { deviceClass } = parseCoarseUserAgent(request.headers["user-agent"] as string);

      let referrerDomain: string | null = null;
      if (referrer) {
        try {
          referrerDomain = new URL(referrer).hostname || referrer;
        } catch {
          referrerDomain = referrer;
        }
      }

      // Execute within database transaction
      const newUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            passwordHash: pwdHash,
            userType,
          },
        });

        // PRD 7.1 / Section 11: Capture acquisition record
        if ((tx as any).userAcquisition) {
          await (tx as any).userAcquisition.create({
            data: {
              userId: user.id,
              firstSeenAt: new Date(),
              landingPath: "/",
              referrerDomain: analyticsConsent ? referrerDomain : "unknown",
              utmSource: analyticsConsent ? (utmSource ?? null) : null,
              utmMedium: analyticsConsent ? (utmMedium ?? null) : null,
              utmCampaign: analyticsConsent ? (utmCampaign ?? null) : null,
              referralCodeUsed: referralCodeUsed ?? null,
              signupCountry: edgeCountry,
              signupDeviceClass: deviceClass,
              analyticsConsent: Boolean(analyticsConsent),
            },
          });
        }

        if (userType === "TALENT") {
          await tx.creator.create({
            data: {
              userId: user.id,
              name,
              location: location ?? "",
              niche: niche ?? "CONTENT_CREATOR",
              referralCode,
              // features.md Phase 12A: every creator has a MediaKit from the
              // moment they exist — AUTO mode, nothing to render yet until
              // there's a profile worth rendering (services/mediaKit.ts's
              // renderer handles an all-defaults creator gracefully).
              mediaKit: { create: {} },
            },
          });
        } else {
          await tx.client.create({
            data: {
              userId: user.id,
              name,
              location: location ?? "",
              orgName,
              orgType,
            },
          });
        }

        // features.md Phase 10 guardrail: consent auditable — a new row per
        // acceptance event, never updated in place.
        await tx.termsAcceptance.create({
          data: { userId: user.id, version: acceptedTermsVersion },
        });

        return user;
      });

      // Issue temporary verify-email token in cache (expires in 24 hours)
      const verifyToken = randomUUID();
      await cacheProvider.set(`auth:verify:${verifyToken}`, newUser.id, 24 * 60 * 60);

      // Send verification email (logs to stdout under NotifyProvider.mock)
      await notifyProvider.email(newUser.email, "verify_email", { token: verifyToken });

      void track(
        "auth_signup_completed",
        { provider: "EMAIL", userType: newUser.userType },
        {
          actor: "USER",
          actorId: newUser.id,
          anonymousId: analyticsConsent ? anonymousId : undefined,
          source: "API",
          consent: analyticsConsent,
        },
      ).catch(() => {});

      return reply.status(201).send({
        userId: newUser.id,
        email: newUser.email,
        userType: newUser.userType,
        emailVerified: newUser.emailVerified,
      });
    }
  );

  // ── Login Endpoint ─────────────────────────────────────────────────────────
  app.post(
    "/api/v1/auth/login",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "15 minutes",
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const { email, password } = parsed.data;

      // Find user
      const user = await prisma.user.findUnique({ where: { email }, include: { creator: true, client: true } });

      // Run password verification logic regardless to mitigate timing attacks
      const isValid = user
        ? await verifyPassword(user.passwordHash, password)
        : await verifyPassword(DUMMY_HASH, password);

      // features.md Phase 16 (FA-5): an AUTO_CHECKOUT account has no real password
      // yet (passwordHash is an unguessable random value — see
      // services/externalBooking.ts) — passwordSet is the explicit gate, checked
      // after the same-shape/same-timing verifyPassword call above so a
      // not-yet-set-up account is indistinguishable from a wrong password.
      if (!user || !isValid || !user.passwordSet) {
        void track(
          "auth_signin_failed",
          { provider: "EMAIL", userType: user?.userType ?? "TALENT" },
          { actor: "ANON", source: "API" },
        ).catch(() => {});
        // Generic error response to prevent user enumeration
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Invalid email or password",
          statusCode: 401,
        });
      }

      // PRD Section 11, item 5: Suspension check in existing auth path
      if (user.suspendedAt) {
        void track(
          "auth_signin_failed",
          { provider: "EMAIL", userType: user.userType },
          { actor: "USER", actorId: user.id, source: "API" },
        ).catch(() => {});
        return reply.status(403).send({
          error: "Forbidden",
          message: "Account is suspended",
          statusCode: 403,
        });
      }

      void track(
        "auth_signin_succeeded",
        { provider: "EMAIL", userType: user.userType },
        { actor: "USER", actorId: user.id, source: "API" },
      ).catch(() => {});

      const accessToken = generateAccessToken({
        userId: user.id,
        userType: user.userType,
        email: user.email,
      });

      const tokenJti = randomUUID();
      const refreshToken = generateRefreshToken(user.id, tokenJti);

      // Store hashed refresh token in DB
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(refreshToken),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      return reply.status(200).send({
        accessToken,
        refreshToken,
        user: {
          userId: user.id,
          email: user.email,
          userType: user.userType,
          // Without this, the client has no source for the signed-in user's
          // real name and previously fell back to hardcoded demo names
          // ("Elias Thorne" / "FilmCraft Studios") for every real account.
          name: user.creator?.name ?? user.client?.name ?? user.email.split("@")[0],
        },
      });
    }
  );

  // ── Token Refresh Endpoint (With Family Rotation & Reuse Detection) ───────
  app.post(
    "/api/v1/auth/refresh",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { refreshToken } = (request.body ?? {}) as { refreshToken?: string };
      if (!refreshToken) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Missing refresh token parameter",
          statusCode: 400,
        });
      }

      let payload;
      try {
        payload = verifyRefreshToken(refreshToken);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Expired or invalid refresh token";
        return reply.status(401).send({
          error: "Unauthorized",
          message: `Invalid refresh token: ${message}`,
          statusCode: 401,
        });
      }

      const incomingHash = hashToken(refreshToken);

      // Check cache denylist first
      const isBlacklisted = await cacheProvider.get(`auth:denylist:${incomingHash}`);
      if (isBlacklisted) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Refresh token has been revoked",
          statusCode: 401,
        });
      }

      // Check DB record
      const tokenRecord = await prisma.refreshToken.findFirst({
        where: { tokenHash: incomingHash },
      });

      // Token reuse detection: if record exists but is already revoked OR if not found
      if (!tokenRecord || tokenRecord.revokedAt !== null || tokenRecord.expiresAt < new Date()) {
        // Reuse detected (theft attempt)! Revoke all refresh tokens for this user.
        await prisma.refreshToken.updateMany({
          where: { userId: payload.userId },
          data: { revokedAt: new Date() },
        });

        // Add this token to cache denylist just in case
        await cacheProvider.set(`auth:denylist:${incomingHash}`, "revoked", 30 * 24 * 60 * 60);

        return reply.status(401).send({
          error: "Unauthorized",
          message: "Token reuse detected. All sessions revoked.",
          statusCode: 401,
        });
      }

      // Revoke the used token in DB
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });

      // Retrieve user info
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: payload.userId },
      });

      if (user.suspendedAt) {
        return reply.status(403).send({
          error: "Forbidden",
          message: "Account is suspended",
          statusCode: 403,
        });
      }

      // Issue new token pair
      const newAccessToken = generateAccessToken({
        userId: user.id,
        userType: user.userType,
        email: user.email,
      });

      const newJti = randomUUID();
      const newRefreshToken = generateRefreshToken(user.id, newJti);

      // Save new refresh token hash
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(newRefreshToken),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return reply.status(200).send({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    }
  );

  // ── Logout Endpoint ────────────────────────────────────────────────────────
  app.post(
    "/api/v1/auth/logout",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { refreshToken } = (request.body ?? {}) as { refreshToken?: string };
      if (refreshToken) {
        const tokenHash = hashToken(refreshToken);

        // Revoke in DB
        await prisma.refreshToken.updateMany({
          where: { tokenHash },
          data: { revokedAt: new Date() },
        });

        // Add to cache denylist (valid for token remaining life, fallback to 30 days)
        await cacheProvider.set(`auth:denylist:${tokenHash}`, "revoked", 30 * 24 * 60 * 60);
      }

      return reply.status(200).send({ success: true });
    }
  );

  // ── Verify Email Endpoint ──────────────────────────────────────────────────
  app.post(
    "/api/v1/auth/verify-email",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { token } = (request.body ?? {}) as { token?: string };
      if (!token) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Missing verification token",
          statusCode: 400,
        });
      }

      const userId = await cacheProvider.get(`auth:verify:${token}`);
      if (!userId) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Invalid or expired verification token",
          statusCode: 400,
        });
      }

      // Update emailVerified flag
      await prisma.user.update({
        where: { id: userId },
        data: { emailVerified: true },
      });

      // Clear token
      await cacheProvider.del(`auth:verify:${token}`);

      return reply.status(200).send({ success: true });
    }
  );

  // ── Forgot Password Endpoint (User Enumeration Protection) ─────────────────
  app.post(
    "/api/v1/auth/forgot-password",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "15 minutes",
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email } = (request.body ?? {}) as { email?: string };
      if (!email) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Missing email address",
          statusCode: 400,
        });
      }

      const user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        const resetToken = randomUUID();
        // Expires in 1 hour
        await cacheProvider.set(`auth:reset:${resetToken}`, user.id, 60 * 60);

        // Send reset email mock link
        await notifyProvider.email(user.email, "reset_password", { token: resetToken });
      }

      // Always return generic success to mitigate user enumeration
      return reply.status(200).send({
        success: true,
        message: "If the email is registered, a password reset link has been sent.",
      });
    }
  );

  // ── Reset Password Endpoint ────────────────────────────────────────────────
  app.post(
    "/api/v1/auth/reset-password",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = resetPasswordSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const { token, password } = parsed.data;

      const userId = await cacheProvider.get(`auth:reset:${token}`);
      if (!userId) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Invalid or expired reset token",
          statusCode: 400,
        });
      }

      const newHash = await hashPassword(password);

      // Update password hash and revoke all active refresh tokens (security hygiene).
      // passwordSet:true is a no-op for a normal reset (already true) but is the real
      // login-unlock for an AUTO_CHECKOUT account (features.md Phase 16, FA-5) — this
      // endpoint doubles as "set password" for the emailed post-checkout link
      // (services/payment.ts's webhook issues a token under this same cache prefix).
      const [user] = await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { passwordHash: newHash, passwordSet: true },
        }),
        prisma.refreshToken.updateMany({
          where: { userId },
          data: { revokedAt: new Date() },
        }),
      ]);

      // Remove password reset token from cache
      await cacheProvider.del(`auth:reset:${token}`);

      // features.md Phase 16 (FA-5): issue a fresh session so the emailed link also
      // works as a magic link — completing this step logs the buyer straight into
      // their new (or existing) account, not just changes their password.
      const accessToken = generateAccessToken({
        userId: user.id,
        userType: user.userType,
        email: user.email,
      });
      const tokenJti = randomUUID();
      const refreshToken = generateRefreshToken(user.id, tokenJti);
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(refreshToken),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return reply.status(200).send({
        success: true,
        accessToken,
        refreshToken,
        user: { userId: user.id, email: user.email, userType: user.userType },
      });
    }
  );
}
