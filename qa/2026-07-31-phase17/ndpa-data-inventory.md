# Phase 17 — NDPA / data-handling inventory

Date: 2026-07-31. **This is a structured personal-data inventory to inform a legal review — it is
NOT a legal sign-off.** Nigeria Data Protection Act (NDPA) compliance review requires qualified
legal/compliance judgment this pass isn't positioned to give; treat every row below as an input
to that review, not a conclusion. Legal sign-off is tracked as PENDING in `README.md`, same
treatment as UAT.

## What personal data this system collects, and where

| Data category | Model / field | Collected at | Sensitivity notes |
|---|---|---|---|
| Email, phone (optional) | `User.email`, `User.phone` | Registration / guest checkout (Phase 16) | Email is the primary identifier; phone is nullable, never required. |
| Password (hashed) | `User.passwordHash` | Registration / set-password | Argon2id hash only, never plaintext at rest. |
| Legal name, location | `Creator.name`/`location`, `Client.name`/`location`, `Client.orgName` | Onboarding | |
| Style/vibe tags (AI-derived) | `Creator.styleTags` | AI tagging job (Phase 7) — X3: never conflated with identity | Derived from uploaded media, not directly submitted. |
| Media (photos/video reels) | `MediaAsset` | Creator upload | Biometric-*adjacent* (a person's likeness), not biometric identifiers per se. |
| **Identity/KYC data** (legal name, DOB, government ID type + number) | Passed to `KycProvider.startCheck` (`KycData` in `providers/kyc.interface.ts`) | KYC verification flow (Phase 7) | **Currently NOT persisted anywhere in our own database** — see `security.md` §4. `KycCheck.raw` exists in the schema but is never written by current code; the real Smile Identity integration is still a stub. This is the single highest-sensitivity category in the whole system and needs a compliance review **before** the real integration lands, not after. |
| **Physical/casting attributes** (height, weight, age range, build, complexion, hair/eye color, gender presentation, shoe size, freeform "distinctive features") | `PhysicalAttributes` | Explicit opt-in casting-attributes flow (Phase 12A.3) | Already has consent versioning/timestamping built in (`consentVersion`, `consentedAt` — non-null, captured on first save and any consent-version change) and per-field visibility (`PUBLIC`/`SEARCHABLE`/`PRIVATE`, defaulting to `SEARCHABLE`) plus a documented hard-delete path (`DELETE /creators/me/attributes`). This is the most privacy-engineered model in the schema already — worth confirming with legal that the existing consent/visibility/delete mechanics actually satisfy NDPA's specific requirements (not just "look reasonable"). |
| Google Calendar OAuth refresh token | `CalendarConnection.encryptedRefreshToken` | Calendar connect flow (Phase 8) | Encrypted at rest, AES-256-GCM (`lib/encryption.ts`) — confirmed passing. |
| Payment/financial data | `Payment`, `PaymentEvent.raw` (full webhook payload, JSON) | Checkout / webhook | No card numbers ever touch this system directly (Paystack/Stripe/Airwallex are the PCI-scope holders); `PaymentEvent.raw` stores the *provider's* webhook payload (references, statuses), not raw card data. |
| Messages (order-room chat) | `Message.content` | In-app chat | Plaintext at rest, no field-level encryption — flag for legal review given it can contain freeform personal/project detail. |
| Support ticket content | `SupportTicket.subject`/`message` | Support flow | Plaintext at rest, same note as above. |
| Terms-of-service acceptance | `TermsAcceptance` (versioned, timestamped, append-only) | Registration | Already an audit-friendly design (never updated in place). |

## Cross-border transfer note

The dev/staging database is hosted on Supabase's `aws-0-eu-west-1` region (EU). Whether this
satisfies NDPA's data-localization/cross-border-transfer provisions for Nigerian user data is
exactly the kind of question this inventory exists to hand to legal — not something inferred here.

## What's already good (for the record, not a substitute for review)

- Consent is versioned and auditable in two places independently (`TermsAcceptance`,
  `PhysicalAttributes.consentVersion`/`consentedAt`) — neither silently backdates.
- OAuth tokens are the one third-party secret this system stores long-term, and they're
  encrypted at rest with a documented algorithm.
- No KYC PII is persisted yet (see caveat above — this is provisional, not durable).
- A hard-delete path exists for the most sensitive opt-in category (`PhysicalAttributes`).

## What legal specifically needs to weigh in on before cutover

1. Whether the (currently non-existent) KYC PII storage plan, once Smile Identity is wired up,
   meets NDPA requirements — this should be reviewed **at design time** for that future phase, not
   retrofitted after.
2. Whether `Message.content` / `SupportTicket.message` need field-level encryption at rest, or
   whether the existing infrastructure-level protections (Supabase's own at-rest encryption) are
   deemed sufficient.
3. Cross-border data transfer/localization for Nigerian user data given the EU-hosted database.
4. Data retention/deletion policy generally — beyond `PhysicalAttributes`' explicit hard-delete,
   there is no documented retention or right-to-erasure flow for the rest of the personal-data
   categories above (email, name, media, messages, transactions).

**Sign-off: PENDING — requires a qualified legal/compliance reviewer, not this QA pass.**
