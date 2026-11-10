// NotifyProvider — interface for all user-facing communications.
// Channels: email (SendGrid), SMS (Twilio), in-app (persisted to Notification table).
// Real implementation: Phase 9.
// Mock: logs to stdout — safe for dev/test, zero real sends.

export interface NotifyProvider {
  /**
   * Send a transactional email via the configured email provider.
   *
   * @param to       - Recipient email address.
   * @param template - Template identifier (e.g. "booking_confirmed", "payment_released").
   * @param data     - Template variables (serialisable to JSON).
   */
  email(to: string, template: string, data: Record<string, unknown>): Promise<void>;

  /**
   * Send an SMS via the configured SMS provider.
   *
   * @param to  - E.164 phone number (e.g. "+2348012345678").
   * @param msg - Plain-text message body (keep under 160 chars for single-part).
   */
  sms(to: string, msg: string): Promise<void>;

  /**
   * Create an in-app notification for the given user.
   * Persisted to the Notification table (see Prisma schema); surfaced in
   * the notification drawer in the client app.
   *
   * @param userId  - The User.id of the recipient.
   * @param payload - Serialisable payload (kind, message, link, etc.).
   */
  inApp(userId: string, payload: Record<string, unknown>): Promise<void>;
}
