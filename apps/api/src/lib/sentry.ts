import * as Sentry from "@sentry/node";
import { env } from "../config/env.js";

// Error tracking (features.md Phase 12). Fails open by design: SENTRY_DSN is
// optional (config/env.ts) in every environment, including production — a
// missing DSN degrades observability (errors are still logged via pino,
// src/app.ts's central error handler), never availability. Never initialised
// under NODE_ENV=test regardless of DSN, so the test suite never makes an
// outbound network call.

let initialised = false;

export function initSentry(): void {
  if (initialised || env.NODE_ENV === "test" || !env.SENTRY_DSN) return;
  Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV, tracesSampleRate: 0.1 });
  initialised = true;
}

/** No-op when Sentry was never initialised (no DSN, or NODE_ENV=test). */
export function captureException(error: unknown): void {
  if (!initialised) return;
  Sentry.captureException(error);
}
