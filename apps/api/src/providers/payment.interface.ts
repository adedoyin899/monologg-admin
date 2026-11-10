// PaymentProvider — interface for all money-movement operations.
// Implementations: payment.mock.ts (dev/test) · payment.real.ts (Phase 6, Paystack-first).
// TODO(conflict:X1) — provider is Paystack/Stripe/Airwallex, never "fincra".

export interface InitEscrowResult {
  /** Provider-side transaction / charge reference. */
  ref: string;
  /** URL to redirect the client to complete payment on the provider's UI/SDK. */
  checkoutUrl: string;
}

export interface PaymentProvider {
  /**
   * Initialise an escrow-style charge for the given booking.
   * Returns a ref + checkout URL the client uses to pay.
   * The server must NOT advance BookingState until the provider webhook confirms.
   */
  initEscrow(bookingId: string, amountMinorUnits: number, currency: string): Promise<InitEscrowResult>;

  /**
   * Confirm that funds are held (called internally after webhook confirmation).
   */
  holdFunds(ref: string): Promise<void>;

  /**
   * Release held funds to the talent (called when DELIVERABLES_PROVIDED + client approves).
   * Only releases the talent's net amount (base − talentFee).
   */
  releaseFunds(ref: string, talentNetMinorUnits: number, currency: string): Promise<void>;

  /**
   * Refund the full client charge (called on dispute resolution or cancellation).
   */
  refund(ref: string): Promise<void>;

  /**
   * Verify a webhook signature from the provider.
   * Must be called BEFORE processing any webhook payload.
   * Returns true if valid, false if tampered/unsigned.
   */
  verifyWebhook(signature: string, rawBody: Buffer): boolean;
}
