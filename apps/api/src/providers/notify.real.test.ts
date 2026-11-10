import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./notify.shared.js", () => ({
  persistInAppNotification: vi.fn().mockResolvedValue(undefined),
}));

import { realNotifyProvider } from "./notify.real.js";
import { persistInAppNotification } from "./notify.shared.js";
import { env } from "../config/env.js";

// Unit tests for the actual SendGrid/Twilio HTTP logic — separate from any
// route/service test, which only ever exercises the mock provider under
// NODE_ENV=test. Global fetch is stubbed; no real network, no real keys.
describe("realNotifyProvider (SendGrid email + Twilio SMS)", () => {
  const original = {
    SENDGRID_API_KEY: env.SENDGRID_API_KEY,
    TWILIO_ACCOUNT_SID: env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: env.TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER: env.TWILIO_FROM_NUMBER,
  };

  beforeEach(() => {
    (env as any).SENDGRID_API_KEY = "SG.test-key";
    (env as any).TWILIO_ACCOUNT_SID = "ACtest";
    (env as any).TWILIO_AUTH_TOKEN = "twilio-auth-token";
    (env as any).TWILIO_FROM_NUMBER = "+15005550006";
  });

  afterEach(() => {
    Object.assign(env, original);
    vi.unstubAllGlobals();
  });

  describe("email", () => {
    it("renders the template and POSTs subject/body to SendGrid with a bearer key", async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
      vi.stubGlobal("fetch", fetchMock);

      await realNotifyProvider.email("talent@monologg.dev", "payment_released", { bookingId: "b1", amount: "₦45,000" });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://api.sendgrid.com/v3/mail/send");
      expect(init.headers.Authorization).toBe("Bearer SG.test-key");
      const body = JSON.parse(init.body);
      expect(body.personalizations[0].to[0].email).toBe("talent@monologg.dev");
      expect(body.subject).toBe("Payment released");
      expect(body.content[0].value).toContain("b1");
      expect(body.content[0].value).toContain("₦45,000");
    });

    it("throws a descriptive error on a non-2xx SendGrid response", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad request", { status: 400 })));

      await expect(realNotifyProvider.email("a@b.com", "payment_released", { bookingId: "b1" })).rejects.toThrow(
        /SendGrid send to a@b.com failed \(400\)/,
      );
    });

    it("throws a clear config error when SENDGRID_API_KEY is missing", async () => {
      (env as any).SENDGRID_API_KEY = undefined;
      await expect(realNotifyProvider.email("a@b.com", "payment_released", { bookingId: "b1" })).rejects.toThrow(
        /SENDGRID_API_KEY is not configured/,
      );
    });

    it("throws for an unknown template rather than sending a blank email", async () => {
      await expect(realNotifyProvider.email("a@b.com", "not_a_real_template", {})).rejects.toThrow(
        /Unknown email template/,
      );
    });
  });

  describe("sms", () => {
    it("POSTs to Twilio with HTTP Basic auth and the configured From number", async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
      vi.stubGlobal("fetch", fetchMock);

      await realNotifyProvider.sms("+2348012345678", "Your booking is confirmed");

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://api.twilio.com/2010-04-01/Accounts/ACtest/Messages.json");
      expect(init.headers.Authorization).toBe(`Basic ${Buffer.from("ACtest:twilio-auth-token").toString("base64")}`);
      const body = init.body as URLSearchParams;
      expect(body.get("To")).toBe("+2348012345678");
      expect(body.get("From")).toBe("+15005550006");
      expect(body.get("Body")).toBe("Your booking is confirmed");
    });

    it("throws a descriptive error on a non-2xx Twilio response", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("invalid number", { status: 400 })));

      await expect(realNotifyProvider.sms("+2348012345678", "hi")).rejects.toThrow(
        /Twilio send to \+2348012345678 failed \(400\)/,
      );
    });

    it("throws a clear config error when Twilio credentials are missing", async () => {
      (env as any).TWILIO_ACCOUNT_SID = undefined;
      await expect(realNotifyProvider.sms("+2348012345678", "hi")).rejects.toThrow(
        /TWILIO_ACCOUNT_SID.*TWILIO_AUTH_TOKEN/,
      );
    });
  });

  describe("inApp", () => {
    it("delegates to the shared persistence helper (same as the mock provider)", async () => {
      await realNotifyProvider.inApp("user-1", { kind: "payment_released", bookingId: "b1" });
      expect(persistInAppNotification).toHaveBeenCalledWith("user-1", { kind: "payment_released", bookingId: "b1" });
    });
  });
});
