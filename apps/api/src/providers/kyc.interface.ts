// KycProvider — interface for identity verification (Smile Identity in production).
// X3: This is IDENTITY verification only — not style/vibe tagging.
// Never use this to set Creator.styleTags, and never use AiTaggingProvider to set
// Creator.verification. They are fully independent systems.
// See: aiTagging.interface.ts, features.md §1 conflict correction X3.

export type VerificationState = "UNVERIFIED" | "PROCESSING" | "VERIFIED" | "FAILED";

export interface KycData {
  /** Creator's legal first name (as on government ID). */
  firstName: string;
  /** Creator's legal last name. */
  lastName: string;
  /** ISO 8601 date of birth, e.g. "1992-04-15". */
  dateOfBirth: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "NG". */
  country: string;
  /** Government-issued ID type, e.g. "NIN", "BVN", "PASSPORT". */
  idType: string;
  /** The ID number/document number. */
  idNumber: string;
}

export interface KycProvider {
  /**
   * Initiate a KYC check for the given creator.
   * Sets Creator.verification = PROCESSING on success.
   * @returns A provider reference to poll/receive webhooks against.
   */
  startCheck(creatorId: string, data: KycData): Promise<{ ref: string }>;

  /**
   * Query the current status of a previously started KYC check.
   * Used for polling (real impl) or webhook processing.
   */
  getStatus(ref: string): Promise<VerificationState>;
}
