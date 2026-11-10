import { Prisma, PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../../db/client.js";
import { EventSink, TrackEvent } from "./types.js";
import { parseCoarseUserAgent } from "./helpers.js";

export class FirstPartySink implements EventSink {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async send(event: TrackEvent): Promise<void> {
    await this.sendBatch([event]);
  }

  async sendBatch(events: TrackEvent[]): Promise<void> {
    if (events.length === 0) return;

    const data: Prisma.ProductEventCreateManyInput[] = events.map((e) => {
      const coarse = parseCoarseUserAgent(e.context?.userAgent);
      const props = (e.props ?? {}) as Record<string, any>;

      return {
        occurredAt: e.timestamp ?? new Date(),
        name: e.name,
        actorType: e.context?.actor ?? (e.context?.actorId ? "USER" : "ANON"),
        source: e.context?.source ?? "API",
        userId: e.context?.actorId ?? null,
        anonymousId: e.context?.anonymousId ?? null,
        path: typeof props.path === "string" ? props.path : null,
        referrerDomain: typeof props.referrerDomain === "string" ? props.referrerDomain : null,
        utmSource: typeof props.utm_source === "string" ? props.utm_source : null,
        utmMedium: typeof props.utm_medium === "string" ? props.utm_medium : null,
        utmCampaign: typeof props.utm_campaign === "string" ? props.utm_campaign : null,
        country: e.context?.country ?? null,
        deviceClass: coarse.deviceClass !== "unknown" ? coarse.deviceClass : null,
        browser: coarse.browser,
        os: coarse.os,
        props: props as Prisma.InputJsonValue,
      };
    });

    await this.db.productEvent.createMany({
      data,
    });
  }
}

