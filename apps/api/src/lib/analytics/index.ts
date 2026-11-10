import { EventSink, TrackContext, TrackEvent } from "./types.js";
import { sanitizeTrackEvent, getAllowlistMetrics, resetAllowlistMetrics } from "./allowlist.js";
import { FirstPartySink } from "./firstPartySink.js";
import { PostHogSink } from "./postHogSink.js";

export * from "./types.js";
export * from "./allowlist.js";
export * from "./helpers.js";
export * from "./firstPartySink.js";
export * from "./postHogSink.js";

// Metrics for sink failures
let sinkFailureCount = 0;

export function getSinkFailureMetrics(): { sinkFailureCount: number } {
  return { sinkFailureCount };
}

export function resetSinkFailureMetrics(): void {
  sinkFailureCount = 0;
}

class AnalyticsService {
  private sinks: EventSink[];

  constructor(sinks?: EventSink[]) {
    this.sinks = sinks ?? [new FirstPartySink(), new PostHogSink()];
  }

  /**
   * For testing or swapping sinks.
   */
  setSinks(sinks: EventSink[]): void {
    this.sinks = sinks;
  }

  /**
   * Tracks a single event asynchronously.
   * Never throws into the caller (failures are swallowed and counted).
   */
  async track(name: string, props?: Record<string, unknown>, ctx?: TrackContext): Promise<void> {
    const rawEvent: TrackEvent = {
      name,
      props,
      context: ctx,
      timestamp: new Date(),
    };

    const { sanitized } = sanitizeTrackEvent(rawEvent);
    if (!sanitized) {
      // Dropped by allowlist or missing anonymous consent
      return;
    }

    await this.dispatchToSinks([sanitized]);
  }

  /**
   * Tracks a batch of events (e.g. from POST /api/v1/events).
   * Never throws into the caller.
   */
  async trackBatch(events: TrackEvent[]): Promise<number> {
    const validEvents: TrackEvent[] = [];

    for (const e of events) {
      const { sanitized } = sanitizeTrackEvent(e);
      if (sanitized) {
        validEvents.push(sanitized);
      }
    }

    if (validEvents.length > 0) {
      await this.dispatchToSinks(validEvents);
    }

    return validEvents.length;
  }

  private async dispatchToSinks(events: TrackEvent[]): Promise<void> {
    for (const sink of this.sinks) {
      try {
        await sink.sendBatch(events);
      } catch (err) {
        sinkFailureCount++;
        // Logging only — a failing sink NEVER throws into the caller (PRD 7.1)
        if (process.env.NODE_ENV !== "test") {
          console.error("[analytics] Sink error swallowed:", err);
        }
      }
    }
  }
}

export const analytics = new AnalyticsService();

/**
 * Primary convenience function for application code to fire tracking events.
 * Fire-and-forget: does not block the caller and guarantees no exceptions.
 */
export async function track(name: string, props?: Record<string, unknown>, ctx?: TrackContext): Promise<void> {
  return analytics.track(name, props, ctx);
}

