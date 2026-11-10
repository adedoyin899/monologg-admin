import { EventSink, TrackEvent } from "./types.js";
import { env } from "../../config/env.js";

export class PostHogSink implements EventSink {
  private readonly enabled: boolean;
  private readonly apiKey?: string;
  private readonly host: string;

  constructor() {
    this.enabled = env.POSTHOG_ENABLED && Boolean(env.POSTHOG_API_KEY);
    this.apiKey = env.POSTHOG_API_KEY;
    this.host = env.POSTHOG_HOST || "https://app.posthog.com";
  }

  async send(event: TrackEvent): Promise<void> {
    await this.sendBatch([event]);
  }

  async sendBatch(events: TrackEvent[]): Promise<void> {
    if (!this.enabled || !this.apiKey || events.length === 0) {
      // Mock / disabled by default in line with PRD seam rule
      return;
    }

    try {
      const batch = events.map((e) => ({
        event: e.name,
        properties: {
          ...e.props,
          distinct_id: e.context?.actorId ?? e.context?.anonymousId ?? "anonymous",
          $current_url: e.props?.path,
          $geoip_country_code: e.context?.country,
        },
        timestamp: (e.timestamp ?? new Date()).toISOString(),
      }));

      await fetch(`${this.host}/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: this.apiKey,
          batch,
        }),
      });
    } catch {
      // PostHog relay failure must never throw
    }
  }
}

