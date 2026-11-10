// Email template registry (features.md Phase 9). notify.real.ts renders a
// template + data into a subject/body pair before handing it to SendGrid —
// this is the "templated" half of "Templated, localisable."
//
// "Localisable": every renderer takes a `locale` and every lookup falls back
// to "en" when a locale has no pack — the mechanism is real and load-bearing,
// but only "en" content actually ships in this phase, matching the same
// proportionate-stub pattern as payment.stripe.ts/payment.airwallex.ts
// ("later regions", not fabricated). Adding a language is adding an entry to
// LOCALES below, not a redesign.

export interface RenderedEmail {
  subject: string;
  body: string;
}

type TemplateRenderer = (data: Record<string, unknown>) => RenderedEmail;

const EN_TEMPLATES: Record<string, TemplateRenderer> = {
  verify_email: (data) => ({
    subject: "Verify your Monologg account",
    body: `Welcome to Monologg. Verify your email using this token: ${data.token}`,
  }),
  reset_password: (data) => ({
    subject: "Reset your Monologg password",
    body: `Use this token to reset your password: ${data.token}. If you didn't request this, you can ignore this email.`,
  }),
  set_password: (data) => ({
    subject: "Your booking is confirmed — set up your account",
    body: `Your payment secured booking ${data.bookingId} in escrow, and we've created an account for you. Use this token to set a password and manage your booking: ${data.token}.`,
  }),
  booking_created: (data) => ({
    subject: "New booking request",
    body: `You have a new booking request (booking ${data.bookingId}). Log in to review and respond.`,
  }),
  payment_escrow_locked: (data) => ({
    subject: "Your booking is confirmed",
    body: `Funds are secured in escrow for booking ${data.bookingId}. You can proceed with the work.`,
  }),
  deliverables_provided: (data) => ({
    subject: "Deliverables ready for review",
    body: `Deliverables have been submitted for booking ${data.bookingId}. Review and approve to release payment.`,
  }),
  payment_released: (data) => ({
    subject: "Payment released",
    body: `Payment for booking ${data.bookingId} has been released${data.amount ? ` (${data.amount})` : ""}.`,
  }),
  payment_refunded: (data) => ({
    subject: "Payment refunded",
    body: `The payment for booking ${data.bookingId} has been refunded.`,
  }),
  kyc_verified: () => ({
    subject: "You're verified",
    body: "Your identity verification is complete. Your Verified badge is now live on your profile.",
  }),
  kyc_failed: () => ({
    subject: "Verification unsuccessful",
    body: "We couldn't verify your identity with the details provided. You can retry from your profile settings.",
  }),
  new_message: (data) => ({
    subject: "New message",
    body: `You have a new message in booking ${data.bookingId}.`,
  }),
  support_ticket_received: (data) => ({
    subject: "We received your support request",
    body: `Thanks for reaching out about "${data.subject}". Our team will follow up by email. Ticket reference: ${data.ticketId}.`,
  }),
  support_ticket_new: (data) => ({
    subject: `New support ticket: ${data.subject}`,
    body: `Ticket ${data.ticketId} from user ${data.userId}:\n\n${data.message}`,
  }),
};

const LOCALES: Record<string, Record<string, TemplateRenderer>> = {
  en: EN_TEMPLATES,
};

export function renderEmailTemplate(
  template: string,
  data: Record<string, unknown>,
  locale = "en",
): RenderedEmail {
  const pack = LOCALES[locale] ?? LOCALES.en;
  const renderer = pack[template] ?? EN_TEMPLATES[template];
  if (!renderer) {
    throw new Error(`[notificationTemplates] Unknown email template "${template}"`);
  }
  return renderer(data);
}
