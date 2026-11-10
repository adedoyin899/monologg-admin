import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken } from "../services/auth.js";
import { prisma } from "../db/client.js";

/**
 * Authentication Middleware Hook (requireAuth)
 *
 * Checks the Authorization header for a Bearer token.
 * Decodes the access token and decorates the request with `request.user`.
 * Throws a standard 401 HTTP error if the token is missing, expired, or invalid.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Authorization token is missing or invalid",
      statusCode: 401,
    });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = verifyAccessToken(token);
    request.user = payload;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid token";
    return reply.status(401).send({
      error: "Unauthorized",
      message: `Invalid access token: ${message}`,
      statusCode: 401,
    });
  }
}

/**
 * Role Authorization Middleware Hook (requireRole)
 *
 * Asserts that the authenticated user matches the specified role.
 * Throws a 403 Forbidden error on mismatch.
 *
 * Must be registered AFTER requireAuth.
 */
export function requireRole(allowedRole: "TALENT" | "CLIENT") {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Authentication required",
        statusCode: 401,
      });
    }

    if (request.user.userType !== allowedRole) {
      return reply.status(403).send({
        error: "Forbidden",
        message: `Mismatched role permissions: required ${allowedRole}`,
        statusCode: 403,
      });
    }
  };
}

/**
 * Ownership Verification Middleware Hook (requireOwner)
 *
 * Asserts that the requested resource belongs to the authenticated user.
 * Supports three resource scopes:
 *   - "user": checks if param value equals request.user.userId
 *   - "creator": looks up Creator in DB and checks if Creator.userId equals request.user.userId
 *   - "client": looks up Client in DB and checks if Client.userId equals request.user.userId
 * Throws a 403 Forbidden error on mismatch or resource not found.
 *
 * Must be registered AFTER requireAuth.
 */
export function requireOwner(resourceType: "user" | "creator" | "client", paramName: string = "id") {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Authentication required",
        statusCode: 401,
      });
    }

    const params = request.params as Record<string, string>;
    const resourceId = params[paramName];

    if (!resourceId) {
      return reply.status(400).send({
        error: "Bad Request",
        message: `Missing required route parameter: "${paramName}"`,
        statusCode: 400,
      });
    }

    const { userId } = request.user;

    if (resourceType === "user") {
      if (resourceId !== userId) {
        return reply.status(403).send({
          error: "Forbidden",
          message: "Access denied: you do not own this user profile",
          statusCode: 403,
        });
      }
      return;
    }

    if (resourceType === "creator") {
      const creator = await prisma.creator.findUnique({
        where: { id: resourceId },
        select: { userId: true },
      });

      if (!creator) {
        return reply.status(404).send({
          error: "Not Found",
          message: `Creator profile not found for id "${resourceId}"`,
          statusCode: 404,
        });
      }

      if (creator.userId !== userId) {
        return reply.status(403).send({
          error: "Forbidden",
          message: "Access denied: you do not own this creator profile",
          statusCode: 403,
        });
      }
      return;
    }

    if (resourceType === "client") {
      const client = await prisma.client.findUnique({
        where: { id: resourceId },
        select: { userId: true },
      });

      if (!client) {
        return reply.status(404).send({
          error: "Not Found",
          message: `Client profile not found for id "${resourceId}"`,
          statusCode: 404,
        });
      }

      if (client.userId !== userId) {
        return reply.status(403).send({
          error: "Forbidden",
          message: "Access denied: you do not own this client profile",
          statusCode: 403,
        });
      }
      return;
    }
  };
}
