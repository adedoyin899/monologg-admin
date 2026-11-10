import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";

vi.mock("../db/client.js", () => ({
  prisma: {
    analyticsEvent: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "../db/client.js";
const prismaMock = prisma as any;

describe("Analytics routes (/api/v1/analytics/*)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it("POST /api/v1/analytics/events ingests a single event and strips sensitive PII keys", async () => {
    prismaMock.analyticsEvent.createMany.mockResolvedValue({ count: 1 });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/analytics/events",
      payload: {
        eventName: "order_deliverable_submitted",
        category: "order_room",
        userId: "user-talent-1",
        anonymousId: "anon-123",
        sessionId: "sess-456",
        userRole: "TALENT",
        path: "/order/ORD-001",
        properties: {
          orderId: "ORD-001",
          fileCount: 2,
          password: "secret-should-be-stripped",
          pin: "4829",
          token: "jwt-token",
        },
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ accepted: 1 });
    expect(prismaMock.analyticsEvent.createMany).toHaveBeenCalledTimes(1);

    const insertedRow = prismaMock.analyticsEvent.createMany.mock.calls[0][0].data[0];
    expect(insertedRow.eventName).toBe("order_deliverable_submitted");
    expect(insertedRow.properties).toEqual({
      orderId: "ORD-001",
      fileCount: 2,
    });
    expect(insertedRow.properties).not.toHaveProperty("password");
    expect(insertedRow.properties).not.toHaveProperty("pin");
    expect(insertedRow.properties).not.toHaveProperty("token");
  });

  it("POST /api/v1/analytics/events ingests a batch of events", async () => {
    prismaMock.analyticsEvent.createMany.mockResolvedValue({ count: 2 });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/analytics/events",
      payload: {
        events: [
          {
            eventName: "page_viewed",
            category: "navigation",
            anonymousId: "anon-123",
            sessionId: "sess-456",
            path: "/client",
            userRole: "CLIENT",
          },
          {
            eventName: "cta_clicked",
            category: "ui_interaction",
            anonymousId: "anon-123",
            sessionId: "sess-456",
            path: "/client",
            userRole: "CLIENT",
            properties: { label: "Post a Brief" },
          },
        ],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ accepted: 2 });
  });

  it("GET /api/v1/analytics/summary aggregates categories, roles, top events, and conversion funnel", async () => {
    prismaMock.analyticsEvent.findMany.mockResolvedValue([
      { eventName: "page_viewed", category: "navigation", userRole: "CLIENT", path: "/client", createdAt: new Date() },
      { eventName: "cta_clicked", category: "ui_interaction", userRole: "CLIENT", path: "/client", createdAt: new Date() },
      { eventName: "project_brief_published", category: "booking", userRole: "CLIENT", path: "/brief", createdAt: new Date() },
      { eventName: "escrow_payment_completed", category: "escrow_payment", userRole: "CLIENT", path: "/checkout", createdAt: new Date() },
      { eventName: "order_deliverable_submitted", category: "order_room", userRole: "TALENT", path: "/order/ORD-001", createdAt: new Date() },
      { eventName: "order_payment_released", category: "order_room", userRole: "CLIENT", path: "/order/ORD-001", createdAt: new Date() },
    ]);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/analytics/summary",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.totalSampledEvents).toBe(6);
    expect(body.byCategory.order_room).toBe(2);
    expect(body.byRole.CLIENT).toBe(5);
    expect(body.byRole.TALENT).toBe(1);
    expect(body.funnel).toMatchObject({
      pageViews: 1,
      ctaClicks: 1,
      briefsPublished: 1,
      escrowPaymentsCompleted: 1,
      deliverablesSubmitted: 1,
      escrowPaymentsReleased: 1,
    });
  });
});
