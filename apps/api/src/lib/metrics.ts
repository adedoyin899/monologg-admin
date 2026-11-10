// In-process metrics (features.md Phase 12 — "basic metrics: request rate, error
// rate, payment success rate"). Deliberately NOT Prometheus/StatsD: no metrics
// backend exists in any prior phase, and adding one is out of this phase's
// scope. This is a minimal, dependency-free counter set exposed as JSON at
// GET /api/v1/metrics — enough to compute request/error/payment-success rate
// from a scrape interval, and a real backend can be swapped in later without
// touching call sites (recordRequest/recordPaymentOutcome are the only API).
//
// Process-local and reset on restart — acceptable for a single-instance
// deployment (this phase's docker-compose target); a multi-instance deployment
// would need to aggregate across instances or replace this with a real metrics
// backend, noted in the README as a known scaling limit, not silently ignored.

export type PaymentOutcome = "escrow_locked" | "released" | "release_failed" | "refunded" | "refund_failed";

interface MetricsState {
  requestsTotal: number;
  requestsByStatusClass: Record<"2xx" | "3xx" | "4xx" | "5xx" | "other", number>;
  payments: Record<PaymentOutcome, number>;
  startedAt: number;
}

function freshState(): MetricsState {
  return {
    requestsTotal: 0,
    requestsByStatusClass: { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0, other: 0 },
    payments: { escrow_locked: 0, released: 0, release_failed: 0, refunded: 0, refund_failed: 0 },
    startedAt: Date.now(),
  };
}

let state = freshState();

function statusClass(statusCode: number): keyof MetricsState["requestsByStatusClass"] {
  if (statusCode >= 200 && statusCode < 300) return "2xx";
  if (statusCode >= 300 && statusCode < 400) return "3xx";
  if (statusCode >= 400 && statusCode < 500) return "4xx";
  if (statusCode >= 500 && statusCode < 600) return "5xx";
  return "other";
}

export function recordRequest(statusCode: number): void {
  state.requestsTotal += 1;
  state.requestsByStatusClass[statusClass(statusCode)] += 1;
}

export function recordPaymentOutcome(outcome: PaymentOutcome): void {
  state.payments[outcome] += 1;
}

export function getMetricsSnapshot() {
  const errorTotal = state.requestsByStatusClass["5xx"];

  // Success rate over terminal money-movement outcomes only: escrow_locked is
  // an intermediate step (already counted, but excluded here), released/refunded
  // both count as a successful resolution (a refund is dispute-resolution
  // working as intended, not a system failure) against release_failed/refund_failed.
  const terminalSuccesses = state.payments.released + state.payments.refunded;
  const terminalFailures = state.payments.release_failed + state.payments.refund_failed;
  const terminalTotal = terminalSuccesses + terminalFailures;

  return {
    uptimeSeconds: Math.round((Date.now() - state.startedAt) / 1000),
    requests: {
      total: state.requestsTotal,
      byStatusClass: state.requestsByStatusClass,
      errorRate: state.requestsTotal > 0 ? errorTotal / state.requestsTotal : 0,
    },
    payments: {
      ...state.payments,
      successRate: terminalTotal > 0 ? terminalSuccesses / terminalTotal : null,
    },
  };
}

/** Test-only reset — never called from production code paths. */
export function __resetMetricsForTest(): void {
  state = freshState();
}
