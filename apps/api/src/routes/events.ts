import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { analytics } from "../lib/analytics/index.js";
import { extractEdgeCountry } from "../lib/analytics/helpers.js";
import { TrackEvent } from "../lib/analytics/types.js";

// Rate limiter storage: key -> timestamps
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per minute

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (rateLimitMap.get(key) || []).filter((t) => t > windowStart);
  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return true;
}

export function resetRateLimits(): void {
  rateLimitMap.clear();
}

// Cleanup stale rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter((t) => t > windowStart);
    if (valid.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, valid);
    }
  }
}, 5 * 60 * 1000).unref();

const eventItemSchema = z.object({
  name: z.string().min(1).max(120),
  props: z.record(z.unknown()).optional(),
  anonymousId: z.string().max(120).optional(),
  userId: z.string().max(120).optional(),
  consent: z.boolean().optional(),
  timestamp: z.string().datetime().optional(),
});

const eventsBatchSchema = z.object({
  events: z.array(eventItemSchema).min(1, "At least 1 event is required").max(20, "Batch cannot exceed 20 events"),
});

export async function eventsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/events
   * Ingestion endpoint for product events from the web app.
   * Accepts batches up to 20, validates against allowlist, enforces rate limits,
   * derives edge country, drops anonymous events without consent, returns 204.
   */
  app.post(
    "/api/v1/events",
    {
      bodyLimit: 65536, // 64 KB cap
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // 1. Rate limiting by IP
      const clientIp = request.ip || (request.headers["x-forwarded-for"] as string) || "unknown_ip";
      if (!checkRateLimit(`ip:${clientIp}`)) {
        return reply.status(429).send({
          statusCode: 429,
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
        });
      }

      // 2. Validate batch payload
      const parsed = eventsBatchSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
        });
      }

      const { events } = parsed.data;

      // 3. Extract country from edge proxy headers (no IP stored)
      const edgeCountry = extractEdgeCountry(request.headers as Record<string, string | string[] | undefined>);
      const userAgent = (request.headers["user-agent"] as string) || null;

      // Optional user context from authenticated request
      const authUser = (request as any).user;
      const authenticatedUserId = authUser?.id;

      // 4. Transform into TrackEvents
      const trackEvents: TrackEvent[] = [];

      for (const item of events) {
        // Enforce rate limit per anonymousId if provided
        if (item.anonymousId) {
          if (!checkRateLimit(`anon:${item.anonymousId}`)) {
            continue; // Drop rate-limited anonymous event
          }
        }

        const isUserAuth = Boolean(authenticatedUserId || item.userId);
        const actor = isUserAuth ? "USER" : "ANON";
        const actorId = authenticatedUserId ?? item.userId ?? null;

        // PRD 7.1 / 7.3: Anonymous visitor events require consent flag
        if (actor === "ANON" && item.consent !== true) {
          continue; // Drop anonymous events without consent
        }

        trackEvents.push({
          name: item.name,
          props: item.props ?? {},
          timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
          context: {
            actor,
            actorId,
            anonymousId: item.anonymousId ?? null,
            source: "WEB",
            userAgent,
            country: edgeCountry,
            consent: item.consent,
          },
        });
      }

      // 5. Dispatch batch asynchronously
      if (trackEvents.length > 0) {
        await analytics.trackBatch(trackEvents);
      }

      // PRD 7.3: Returns 204 No Content
      return reply.status(204).send();
    }
  );
}

