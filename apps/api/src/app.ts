import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import { env } from "./config/env.js";
import { registerRoutes } from "./routes/index.js";
import { recordRequest } from "./lib/metrics.js";
import { initSentry, captureException } from "./lib/sentry.js";
import { recordUserActive } from "./middlewares/lastActive.js";
import { track } from "./lib/analytics/index.js";

export interface BuildAppOptions {
  /** Override the logger for testing (pass false to disable, or a custom logger). */
  logger?: boolean | object;
}

/**
 * Fastify app factory.
 *
 * Separated from the server entry point (index.ts) so tests can call `buildApp()`
 * directly without binding a real port — the pattern recommended in Fastify docs.
 *
 * Cross-cutting concerns registered here:
 *  - CORS        — locked to CORS_ORIGIN env var
 *  - Helmet      — secure HTTP headers, strict CSP (pure JSON API, no HTML)
 *  - Rate limit  — global 100 req / 1 min per IP
 *  - Sensible    — standardised HTTP error helpers
 *  - pino logger — structured JSON in production, pretty in development, PII-redacting
 *  - Request ID  — `x-request-id` response header, mirrors Fastify's per-request log id
 *  - Metrics     — in-process request/payment counters (src/lib/metrics.ts, Phase 12)
 *  - Sentry      — error tracking, no-op unless SENTRY_DSN is set (Phase 12)
 *  - Error handler — never leaks stack traces in production
 *
 * Route plugins are registered via registerRoutes().
 */
export async function buildApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  const isProd = env.NODE_ENV === "production";
  const isTest = env.NODE_ENV === "test";

  // ── Logger ─────────────────────────────────────────────────────────────────
  // Use pino-pretty in dev, raw JSON in prod (consumed by log aggregators).
  // In test, caller can pass `logger: false` to silence output.
  //
  // `redact` (Phase 12 — "no PII in logs") is defense-in-depth: nothing in this
  // codebase currently logs a request body or a raw token/password (verified by
  // routes/auth.test.ts's "Sanitized Logs" suite — Fastify's default request/
  // response serializers never include the body). This config is what stops a
  // *future* `log.info({ body })`-style debug line, or an error object that
  // happens to wrap sensitive data, from actually reaching the log stream —
  // pino replaces matched paths with "[Redacted]" rather than omitting the key,
  // so shape stays legible in aggregators.
  const redact = {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.accessToken",
      "*.refreshToken",
      "*.tokenHash",
      "*.idNumber", // KYC data (features.md Phase 7) — never persisted, but redact if ever logged
    ],
    censor: "[Redacted]",
  };
  const loggerConfig =
    opts.logger !== undefined
      ? opts.logger
      : isTest
        ? false
        : isProd
          ? { level: env.LOG_LEVEL, redact }
          : {
              level: env.LOG_LEVEL,
              redact,
              transport: {
                target: "pino-pretty",
                options: {
                  translateTime: "HH:MM:ss Z",
                  ignore: "pid,hostname",
                  colorize: true,
                },
              },
            };

  initSentry();

  const app = Fastify({ logger: loggerConfig });

  // ── Request ID ─────────────────────────────────────────────────────────────
  // Fastify already assigns `request.id` per-request and folds it into every
  // log line via a child logger — this just also surfaces it on the response,
  // so a caller (or a support ticket, features.md Phase 10) can hand back the
  // exact ID to grep for in aggregated logs.
  app.addHook("onSend", async (request, reply, payload) => {
    reply.header("x-request-id", request.id);
    return payload;
  });

  // ── Metrics & Activity ───────────────────────────────────────────────────
  app.addHook("onResponse", async (request, reply) => {
    recordRequest(reply.statusCode);
    if ((request as any).user?.userId) {
      recordUserActive((request as any).user.userId);
    }
  });

  // ── CORS ─────────────────────────────────────────────────────────────────
  const allowedOrigins: string[] = [env.CORS_ORIGIN];
  if (env.ADMIN_CORS_ORIGIN && !allowedOrigins.includes(env.ADMIN_CORS_ORIGIN)) {
    allowedOrigins.push(env.ADMIN_CORS_ORIGIN);
  }
  if (!allowedOrigins.includes("http://localhost:3001")) {
    allowedOrigins.push("http://localhost:3001");
  }
  if (!allowedOrigins.includes("http://localhost:3000")) {
    allowedOrigins.push("http://localhost:3000");
  }
  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // ── Helmet (secure headers) ───────────────────────────────────────────────
  await app.register(helmet, {
    // This is a pure JSON API — no route ever serves HTML — so the strictest
    // CSP is also the correct one, not a placeholder to "tighten later".
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: "1 minute",
    // Phase 4: tighten login + forgot-password to 10 req / 15 min per IP.
    errorResponseBuilder(_req, context) {
      return {
        error: "Too Many Requests",
        message: `Rate limit exceeded. Retry in ${Math.ceil(context.ttl / 1000)} seconds.`,
        statusCode: 429,
      };
    },
  });

  // ── Sensible (standardised HTTP error helpers) ────────────────────────────
  await app.register(sensible);

  // ── Central error handler ─────────────────────────────────────────────────
  // Never leak stack traces to the client in production.
  app.setErrorHandler(function (error: any, req, reply) {
    const statusCode = error.statusCode ?? 500;

    void track(
      "api_error",
      {
        route: (req.routeOptions?.url as string) || req.url,
        status: statusCode,
      },
      { actor: "SYSTEM", source: "API" },
    ).catch(() => {});

    // Always log the real error server-side.
    if (statusCode >= 500) {
      this.log.error({ err: error }, "Unhandled server error");
      captureException(error);
    } else {
      this.log.warn({ err: error }, "Client error");
    }

    const body: Record<string, unknown> = {
      error: error.name ?? "Error",
      message: error.message,
      statusCode,
    };

    // Never expose internal error details (stack, cause) to the client in prod.
    if (!isProd && error.stack) {
      body.stack = error.stack;
    }

    reply.status(statusCode).send(body);
  });

  // ── Routes ────────────────────────────────────────────────────────────────
  await registerRoutes(app);

  return app;
}
