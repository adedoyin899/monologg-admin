import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";

// ---------------------------------------------------------------------------
// Health route tests — Phase 3 gate
//
// Tests the GET /api/v1/health endpoint:
//   - Returns { ok: true, db: "up" } (HTTP 200) when DB responds.
//   - Returns { ok: false, db: "down" } (HTTP 503) when DB throws.
//
// Prisma is mocked at the module level so this test never hits a real DB and
// runs fine in CI without any DATABASE_URL secret being configured.
// ---------------------------------------------------------------------------

// Mock the Prisma client before it's imported by the route handler.
vi.mock("../db/client.js", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from "../db/client.js";

describe("GET /api/v1/health", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it("returns 200 { ok: true, db: 'up' } when DB responds", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/health",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ ok: boolean; db: string }>();
    expect(body.ok).toBe(true);
    expect(body.db).toBe("up");
  });

  it("returns 503 { ok: false, db: 'down' } when DB throws", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("Connection refused"));

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/health",
    });

    expect(response.statusCode).toBe(503);
    const body = response.json<{ ok: boolean; db: string; error?: string }>();
    expect(body.ok).toBe(false);
    expect(body.db).toBe("down");
    // The error field may be present in non-prod (we're in test/dev mode here)
    // but the critical thing is ok/db shape is correct regardless.
  });

  it("responds to OPTIONS (CORS preflight) without error", async () => {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/api/v1/health",
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "GET",
      },
    });

    // Should not be a 5xx
    expect(response.statusCode).toBeLessThan(500);
  });
});
