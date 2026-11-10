import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/client.js";

const SENSITIVE_KEY_PATTERN = /^(password|passwordHash|token|accessToken|refreshToken|secret|otp|code|pin|cvv|cardNumber|idNumber|accountNumber|bvn|nin)$/i;

export function sanitizeAnalyticsProperties(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      clean[key] = sanitizeAnalyticsProperties(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

const singleEventSchema = z.object({
  eventName: z.string().min(1).max(120),
  category: z.string().min(1).max(60).default("ui_interaction"),
  userId: z.string().max(120).nullable().optional(),
  anonymousId: z.string().min(1).max(120),
  sessionId: z.string().min(1).max(120),
  userRole: z.string().max(40).nullable().optional(),
  path: z.string().min(1).max(500),
  properties: z.record(z.unknown()).optional().default({}),
});

const batchOrSingleSchema = z.union([
  z.object({
    events: z.array(singleEventSchema).min(1).max(100),
  }),
  singleEventSchema,
]);

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/analytics/events
   * Ingests single or batched product analytics events into Supabase Postgres
   * (`AnalyticsEvent` table). Unauthenticated by design so guest checkout,
   * landing page, and storefront interactions are captured alongside signed-in
   * Performer and Client actions.
   */
  app.post("/api/v1/analytics/events", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = batchOrSingleSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Bad Request",
        message: parsed.error.issues.map((i) => i.message).join(", "),
        statusCode: 400,
      });
    }

    const rawEvents = "events" in parsed.data ? parsed.data.events : [parsed.data];
    const rows = rawEvents.map((evt) => ({
      eventName: evt.eventName,
      category: evt.category,
      userId: evt.userId ?? null,
      anonymousId: evt.anonymousId,
      sessionId: evt.sessionId,
      userRole: evt.userRole ?? null,
      path: evt.path,
      properties: sanitizeAnalyticsProperties(evt.properties) as Prisma.InputJsonValue,
    }));

    await prisma.analyticsEvent.createMany({ data: rows });

    return reply.status(201).send({ accepted: rows.length });
  });

  /**
   * GET /api/v1/analytics/summary
   * Stakeholder decision-support snapshot aggregating total event volume,
   * breakdown by category, top user interactions, and conversion funnel stages.
   */
  app.get("/api/v1/analytics/summary", async (_request: FastifyRequest, reply: FastifyReply) => {
    const events = await prisma.analyticsEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: {
        eventName: true,
        category: true,
        userRole: true,
        path: true,
        createdAt: true,
      },
    });

    const byCategory: Record<string, number> = {};
    const byEventName: Record<string, number> = {};
    const byRole: Record<string, number> = {};

    for (const evt of events) {
      byCategory[evt.category] = (byCategory[evt.category] ?? 0) + 1;
      byEventName[evt.eventName] = (byEventName[evt.eventName] ?? 0) + 1;
      const roleKey = evt.userRole ?? "GUEST";
      byRole[roleKey] = (byRole[roleKey] ?? 0) + 1;
    }

    const topEvents = Object.entries(byEventName)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([eventName, count]) => ({ eventName, count }));

    const funnel = {
      pageViews: byEventName["page_viewed"] ?? 0,
      ctaClicks: (byEventName["cta_clicked"] ?? 0) + (byEventName["ui_click"] ?? 0),
      authEstablished: byEventName["auth_session_established"] ?? 0,
      briefsPublished: byEventName["project_brief_published"] ?? 0,
      escrowPaymentsCompleted: byEventName["escrow_payment_completed"] ?? 0,
      deliverablesSubmitted: byEventName["order_deliverable_submitted"] ?? 0,
      escrowPaymentsReleased: byEventName["order_payment_released"] ?? 0,
      withdrawalsCompleted: byEventName["withdrawal_completed"] ?? 0,
    };

    return reply.send({
      totalSampledEvents: events.length,
      byCategory,
      byRole,
      topEvents,
      funnel,
    });
  });
}
