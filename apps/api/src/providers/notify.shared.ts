import { prisma } from "../db/client.js";

// In-app notifications are the one NotifyProvider channel with no real
// third-party system behind it (unlike email/SMS, which genuinely differ
// between mock and SendGrid/Twilio) — the Notification table itself IS the
// "external system" from the app's point of view. Both notify.mock.ts and
// notify.real.ts's `inApp` call this exact same persistence, per the
// interface's own documented contract ("Persisted to the Notification table").
export async function persistInAppNotification(
  userId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { kind, ...rest } = payload;
  await prisma.notification.create({
    data: {
      userId,
      kind: typeof kind === "string" ? kind : "unknown",
      payload: rest as object,
    },
  });
}
