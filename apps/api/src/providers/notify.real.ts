import { env } from "../config/env.js";
import { renderEmailTemplate } from "../lib/notificationTemplates.js";
import { persistInAppNotification } from "./notify.shared.js";
import type { NotifyProvider } from "./notify.interface.js";

// ---------------------------------------------------------------------------
// Real NotifyProvider — SendGrid (email) + Twilio (SMS). No SDK dependency —
// raw fetch against each provider's REST API, matching this codebase's
// existing provider style (see payment.real.ts, calendar.real.ts).
// ---------------------------------------------------------------------------

const SENDGRID_API = "https://api.sendgrid.com/v3/mail/send";
const SENDGRID_FROM_EMAIL = "notifications@monologg.dev"; // TODO(conflict): confirm the real sending domain before go-live (SPF/DKIM must be configured for it).

function requireSendgridKey(): string {
  if (!env.SENDGRID_API_KEY) {
    throw new Error("[notify.real] SENDGRID_API_KEY is not configured — required when NOTIFY_PROVIDER=sendgrid_twilio.");
  }
  return env.SENDGRID_API_KEY;
}

function requireTwilioCredentials(): { accountSid: string; authToken: string } {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error(
      "[notify.real] TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are not configured — required when NOTIFY_PROVIDER=sendgrid_twilio.",
    );
  }
  return { accountSid: env.TWILIO_ACCOUNT_SID, authToken: env.TWILIO_AUTH_TOKEN };
}

export const realNotifyProvider: NotifyProvider = {
  async email(to, template, data) {
    const { subject, body } = renderEmailTemplate(template, data);

    const response = await fetch(SENDGRID_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireSendgridKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: SENDGRID_FROM_EMAIL },
        subject,
        content: [{ type: "text/plain", value: body }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => response.statusText);
      throw new Error(`[notify.real] SendGrid send to ${to} failed (${response.status}): ${errorBody}`);
    }
  },

  async sms(to, msg) {
    const { accountSid, authToken } = requireTwilioCredentials();
    if (!env.TWILIO_FROM_NUMBER) {
      throw new Error("[notify.real] TWILIO_FROM_NUMBER is not configured — required when NOTIFY_PROVIDER=sendgrid_twilio.");
    }

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: env.TWILIO_FROM_NUMBER, Body: msg }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => response.statusText);
      throw new Error(`[notify.real] Twilio send to ${to} failed (${response.status}): ${errorBody}`);
    }
  },

  async inApp(userId, payload) {
    await persistInAppNotification(userId, payload);
  },
};
