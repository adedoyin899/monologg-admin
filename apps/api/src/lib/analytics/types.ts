import { EventActor, EventSource } from "@prisma/client";

export { EventActor, EventSource };

export interface TrackContext {
  actor?: EventActor;
  actorId?: string | null;
  anonymousId?: string | null;
  source?: EventSource;
  userAgent?: string | null;
  country?: string | null;
  ip?: string | null; // For edge extraction only, NEVER stored in ProductEvent
  consent?: boolean;
}

export interface TrackEvent {
  name: string;
  props?: Record<string, unknown>;
  context?: TrackContext;
  timestamp?: Date;
}

export interface EventSink {
  send(event: TrackEvent): Promise<void>;
  sendBatch(events: TrackEvent[]): Promise<void>;
}

