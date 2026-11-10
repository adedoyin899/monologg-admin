import type { NotifyProvider } from "./notify.interface.js";
import { persistInAppNotification } from "./notify.shared.js";

// Mock NotifyProvider — for dev and test environments.
// email/sms log to stdout instead of sending real emails/SMS — zero real
// sends, but the log output is inspectable. inApp is NOT logged-only: it
// always persists for real (see notify.shared.ts) — there's no meaningful
// "mock in-app notification" distinct from a real one, since Notification is
// our own table either way.

export const mockNotifyProvider: NotifyProvider = {
  async email(to, template, data) {
    console.log(`[notify.mock] EMAIL → ${to} | template: ${template} | data:`, JSON.stringify(data));
  },

  async sms(to, msg) {
    console.log(`[notify.mock] SMS → ${to} | "${msg}"`);
  },

  async inApp(userId, payload) {
    await persistInAppNotification(userId, payload);
  },
};
