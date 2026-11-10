# Monologg Live Database Schema Map

Generated during Phase A0 preflight audit against the live Supabase PostgreSQL database.

---

## 1. Executive Summary: PRD Comparison

### (a) Expected Tables & Columns That Exist
- **`User`**: `id`, `email`, `phone`, `passwordHash`, `userType`, `emailVerified`, `googleId`, `authProvider`, `isNewUser`, `accountOrigin`, `passwordSet`, `supabaseUserId`, `createdAt`, `updatedAt`
- **`Creator`**: `id`, `userId`, `name`, `niche`, `bio`, `location`, `avatarUrl`, `styleTags`, `verification`, `celebrityBadge`, `referralCode`
- **`Client`**: `id`, `userId`, `name`, `orgName`, `orgType`, `location`, `avatarUrl`
- **`AuthEvent`** (P12B): `id`, `userId`, `provider`, `event`, `ipHash`, `userAgent`, `createdAt`
- **`RefreshToken`**: `id`, `userId`, `tokenHash`, `expiresAt`, `revokedAt`, `createdAt`
- **`MediaAsset`**: `id`, `creatorId`, `kind`, `url`, `sizeBytes`, `durationSec`, `taggingStatus`, `createdAt`
- **`RateCard`**: `id`, `creatorId`, `serviceTitle`, `basePriceAmount`, `basePriceCurrency`, `deliveryTimeline`
- **`AvailabilityBlock`**: `id`, `creatorId`, `date`, `slots`, `isRecurring`, `recurRule`, `calendarEventId`
- **`CalendarEvent`**: `id`, `creatorId`, `date`, `start`, `end`, `title`, `kind`, `bookingId`
- **`CalendarConnection`**: `id`, `userId`, `provider`, `encryptedRefreshToken`, `scopes`, `status`, `connectedAt`, `revokedAt`
- **`Brief`**: `id`, `clientId`, `projectName`, `projectType`, `nicheReq`, `budgetAmount`, `budgetCurrency`, `status`, `createdAt`, `applicantCap`, `applicationsOpen`
- **`Application`**: `id`, `briefId`, `creatorId`, `pitch`, `status`, `createdAt`, `updatedAt`
- **`Booking`**: `id`, `creatorId`, `clientId`, `rateCardId`, `engagementType`, `slotDate`, `slotStart`, `slotEnd`, `recurrence`, `baseAmount`, `currency`, `talentFeeAmount`, `clientFeeAmount`, `state`, `meetUrl`, `origin`, `contextNote`, `slotHoldExpiresAt`, `createdAt`
- **`Payment`**: `id`, `bookingId`, `provider`, `providerRef`, `status`, `escrowHeld`, `amount`, `currency`, `createdAt`
- **`PaymentEvent`**: `id`, `paymentId`, `type`, `eventId`, `raw`, `createdAt`
- **`OrderRoom`**: `id`, `bookingId`
- **`Message`**: `id`, `orderRoomId`, `senderId`, `kind`, `content`, `createdAt`
- **`Notification`**: `id`, `userId`, `kind`, `payload`, `readAt`, `createdAt`
- **`NotificationPreference`**: `id`, `userId`, `emailEnabled`, `smsEnabled`, `updatedAt`
- **`KycCheck`**: `id`, `creatorId`, `provider`, `providerRef`, `status`, `raw`, `createdAt`
- **`TermsAcceptance`** (Phase 10): `id`, `userId`, `version`, `acceptedAt`
- **`SupportTicket`** (Phase 10): `id`, `userId`, `subject`, `message`, `status`, `createdAt`
- **`MediaKit`**: `id`, `creatorId`, `mode`, `uploadUrl`, `uploadSizeBytes`, `autoVersion`, `autoLastRenderedAt`, `createdAt`, `updatedAt`
- **`VerificationRecording`**: `id`, `creatorId`, `url`, `durationSec`, `guidelineAck`, `status`, `reviewerNote`, `createdAt`, `updatedAt`
- **`PhysicalAttributes`**: `id`, `creatorId`, all ranges/enums, `shoeSize`, `shoeSizeUnit`, `distinctiveFeatures`, `visibility`, `consentVersion`, `consentedAt`, `createdAt`, `updatedAt`
- **`WithdrawalOtp`** (P12C): `id`, `userId`, `withdrawalRequestId`, `codeHash`, `expiresAt`, `attempts`, `verifiedAt`, `createdAt`

### (b) PRD Names That Differ in Live Database
1. **Withdrawal table**: PRD refers to `withdrawals` / `Withdrawal`. Real table name is **`WithdrawalRequest`** with columns `(id, userId, amount, currency, bankName, accountNumber, accountName, status, idempotencyKey, createdAt, updatedAt)` and status enum `WithdrawalRequestStatus` (`PENDING_OTP`, `APPROVED`, `REJECTED`, `COMPLETED`, `FAILED`).
2. **SupportTicket schema**: PRD section 6 proposed a rich ticketing model with `number` (autoincrement MNL-xx), `reporterUserId`, `category`, `priority`, `source`, `body`, `assignedAdminId`, `firstResponseAt`, `resolvedAt`, `slaDueAt`, and a child table `TicketMessage`. The live database has the Phase 10 model: `(id, userId, subject, message, status, createdAt)` with status enum `SupportTicketStatus` (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`). In A8, we must additively migrate `SupportTicket` (adding the new nullable columns/enums) and create `TicketMessage` without dropping existing Phase 10 rows.
3. **Analytics Events table**: Live database has an existing `AnalyticsEvent` table (from Session 174) with `(id, eventName, category, userId, anonymousId, sessionId, userRole, path, properties, createdAt)`. The PRD specifies a new first-party `ProductEvent` model with BigInt autoincrement ID, `EventActor`, `EventSource`, `country`, `deviceClass`, etc. Both can coexist, with `ProductEvent` serving as the comprehensive first-party analytics sink for Admin.

### (c) PRD Assumptions That Do NOT Exist
1. **No Wallet / Earnings Ledger Table**: There is NO `Wallet`, `Ledger`, `Balance`, or `Transaction` table in the database. As Flag F7 anticipated, talent earnings are strictly **derived** at query time: `sum(Booking.baseAmount - Booking.talentFeeAmount)` for bookings in `PAYMENT_RELEASED` state, minus completed and pending `WithdrawalRequest` rows.
2. **No Booking State History Table**: There is NO `BookingStateHistory` or `BookingTransition` audit table. The booking only tracks its current `state` column. Timelines must be reconstructed from `Booking.createdAt`, `PaymentEvent` entries, and system messages in `Message`. (Phase A3 will add the `booking_state_changed` event to `ProductEvent` to capture full history going forward).
3. **No Existing Admin Tables**: None of `AdminUser`, `AdminSession`, `AdminJob`, `JobRun`, `AdminAuditLog`, `UserNote`, `UserTag`, `UserAcquisition`, `ProductEvent`, `KpiDaily`, `Dispute`, or `AlertEvent` exist yet. They will be added in upcoming prompts.
4. **User table flags**: `User.lastActiveAt`, `User.isTestUser`, `User.suspendedAt`, and `User.suspendedReason` do not exist yet on `User`. They will be added as nullable/defaulted columns in A1/A2.

---

## 2. All 32 Tables in Public Schema

### `AnalyticsEvent` (1721 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `eventName` | text | NO | `-` |
| `category` | text | NO | `-` |
| `userId` | text | YES | `-` |
| `anonymousId` | text | NO | `-` |
| `sessionId` | text | NO | `-` |
| `userRole` | text | YES | `-` |
| `path` | text | NO | `-` |
| `properties` | jsonb | NO | `'{}'::jsonb` |
| `createdAt` | timestamp with time zone (timestamptz) | NO | `now()` |

**Indexes:**
- `AnalyticsEvent_pkey`: `CREATE UNIQUE INDEX "AnalyticsEvent_pkey" ON public."AnalyticsEvent" USING btree (id)`

### `Application` (2 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `briefId` | text | NO | `-` |
| `creatorId` | text | NO | `-` |
| `pitch` | text | YES | `-` |
| `status` | ENUM (ApplicationStatus) | NO | `'APPLIED'::"ApplicationStatus"` |
| `createdAt` | timestamp without time zone (timestamp) | NO | `CURRENT_TIMESTAMP` |
| `updatedAt` | timestamp without time zone (timestamp) | NO | `-` |

**Indexes:**
- `Application_briefId_creatorId_key`: `CREATE UNIQUE INDEX "Application_briefId_creatorId_key" ON public."Application" USING btree ("briefId", "creatorId")`
- `Application_briefId_idx`: `CREATE INDEX "Application_briefId_idx" ON public."Application" USING btree ("briefId")`
- `Application_creatorId_idx`: `CREATE INDEX "Application_creatorId_idx" ON public."Application" USING btree ("creatorId")`
- `Application_pkey`: `CREATE UNIQUE INDEX "Application_pkey" ON public."Application" USING btree (id)`

**Foreign Keys:**
- `briefId` -> `Brief.id` (`Application_briefId_fkey`)
- `creatorId` -> `Creator.id` (`Application_creatorId_fkey`)

### `AuthEvent` (9 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `userId` | text | NO | `-` |
| `provider` | ENUM (AuthProvider) | NO | `-` |
| `event` | text | NO | `-` |
| `ipHash` | text | YES | `-` |
| `userAgent` | text | YES | `-` |
| `createdAt` | timestamp without time zone (timestamp) | NO | `CURRENT_TIMESTAMP` |

**Indexes:**
- `AuthEvent_pkey`: `CREATE UNIQUE INDEX "AuthEvent_pkey" ON public."AuthEvent" USING btree (id)`
- `AuthEvent_userId_createdAt_idx`: `CREATE INDEX "AuthEvent_userId_createdAt_idx" ON public."AuthEvent" USING btree ("userId", "createdAt")`

**Foreign Keys:**
- `userId` -> `User.id` (`AuthEvent_userId_fkey`)

### `AvailabilityBlock` (2 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `creatorId` | text | NO | `-` |
| `date` | timestamp without time zone (timestamp) | NO | `-` |
| `slots` | jsonb | NO | `-` |
| `calendarEventId` | text | YES | `-` |
| `isRecurring` | boolean (bool) | NO | `false` |
| `recurRule` | text | YES | `-` |

**Indexes:**
- `AvailabilityBlock_creatorId_date_idx`: `CREATE INDEX "AvailabilityBlock_creatorId_date_idx" ON public."AvailabilityBlock" USING btree ("creatorId", date)`
- `AvailabilityBlock_pkey`: `CREATE UNIQUE INDEX "AvailabilityBlock_pkey" ON public."AvailabilityBlock" USING btree (id)`

**Foreign Keys:**
- `creatorId` -> `Creator.id` (`AvailabilityBlock_creatorId_fkey`)

### `Booking` (7 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `creatorId` | text | NO | `-` |
| `clientId` | text | NO | `-` |
| `rateCardId` | text | NO | `-` |
| `engagementType` | ENUM (EngagementType) | NO | `'ONE_OFF'::"EngagementType"` |
| `slotDate` | timestamp without time zone (timestamp) | NO | `-` |
| `slotStart` | text | NO | `-` |
| `slotEnd` | text | NO | `-` |
| `recurrence` | text | YES | `-` |
| `baseAmount` | integer (int4) | NO | `-` |
| `currency` | text | NO | `-` |
| `talentFeeAmount` | integer (int4) | NO | `-` |
| `clientFeeAmount` | integer (int4) | NO | `-` |
| `state` | ENUM (BookingState) | NO | `'PENDING_PAYMENT'::"BookingState"` |
| `meetUrl` | text | YES | `-` |
| `createdAt` | timestamp without time zone (timestamp) | NO | `CURRENT_TIMESTAMP` |
| `contextNote` | text | YES | `-` |
| `origin` | ENUM (BookingOrigin) | NO | `'INTERNAL'::"BookingOrigin"` |
| `slotHoldExpiresAt` | timestamp without time zone (timestamp) | YES | `-` |

**Indexes:**
- `Booking_pkey`: `CREATE UNIQUE INDEX "Booking_pkey" ON public."Booking" USING btree (id)`

**Foreign Keys:**
- `creatorId` -> `Creator.id` (`Booking_creatorId_fkey`)
- `clientId` -> `Client.id` (`Booking_clientId_fkey`)

### `Brief` (4 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `clientId` | text | NO | `-` |
| `projectName` | text | NO | `-` |
| `projectType` | text | NO | `-` |
| `nicheReq` | ARRAY (_Niche) | YES | `-` |
| `budgetAmount` | integer (int4) | NO | `-` |
| `budgetCurrency` | text | NO | `-` |
| `createdAt` | timestamp without time zone (timestamp) | NO | `CURRENT_TIMESTAMP` |
| `status` | ENUM (BriefStatus) | NO | `'DRAFT'::"BriefStatus"` |
| `applicantCap` | integer (int4) | YES | `-` |
| `applicationsOpen` | boolean (bool) | NO | `true` |

**Indexes:**
- `Brief_pkey`: `CREATE UNIQUE INDEX "Brief_pkey" ON public."Brief" USING btree (id)`

**Foreign Keys:**
- `clientId` -> `Client.id` (`Brief_clientId_fkey`)

### `CalendarConnection` (0 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `userId` | text | NO | `-` |
| `provider` | text | NO | `-` |
| `encryptedRefreshToken` | text | NO | `-` |
| `scopes` | ARRAY (_text) | YES | `-` |
| `status` | ENUM (CalendarConnectionStatus) | NO | `'CONNECTED'::"CalendarConnectionStatus"` |
| `connectedAt` | timestamp without time zone (timestamp) | NO | `CURRENT_TIMESTAMP` |
| `revokedAt` | timestamp without time zone (timestamp) | YES | `-` |

**Indexes:**
- `CalendarConnection_pkey`: `CREATE UNIQUE INDEX "CalendarConnection_pkey" ON public."CalendarConnection" USING btree (id)`
- `CalendarConnection_userId_key`: `CREATE UNIQUE INDEX "CalendarConnection_userId_key" ON public."CalendarConnection" USING btree ("userId")`

**Foreign Keys:**
- `userId` -> `User.id` (`CalendarConnection_userId_fkey`)

### `CalendarEvent` (0 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `creatorId` | text | NO | `-` |
| `date` | timestamp without time zone (timestamp) | NO | `-` |
| `start` | text | NO | `-` |
| `end` | text | NO | `-` |
| `title` | text | NO | `-` |
| `kind` | text | NO | `-` |
| `bookingId` | text | YES | `-` |

**Indexes:**
- `CalendarEvent_creatorId_date_idx`: `CREATE INDEX "CalendarEvent_creatorId_date_idx" ON public."CalendarEvent" USING btree ("creatorId", date)`
- `CalendarEvent_pkey`: `CREATE UNIQUE INDEX "CalendarEvent_pkey" ON public."CalendarEvent" USING btree (id)`

**Foreign Keys:**
- `creatorId` -> `Creator.id` (`CalendarEvent_creatorId_fkey`)

### `Client` (11 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `userId` | text | NO | `-` |
| `name` | text | NO | `-` |
| `orgName` | text | YES | `-` |
| `orgType` | ENUM (OrgType) | YES | `-` |
| `location` | text | NO | `-` |
| `avatarUrl` | text | YES | `-` |

**Indexes:**
- `Client_pkey`: `CREATE UNIQUE INDEX "Client_pkey" ON public."Client" USING btree (id)`
- `Client_userId_key`: `CREATE UNIQUE INDEX "Client_userId_key" ON public."Client" USING btree ("userId")`

**Foreign Keys:**
- `userId` -> `User.id` (`Client_userId_fkey`)

### `Creator` (19 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `userId` | text | NO | `-` |
| `name` | text | NO | `-` |
| `niche` | ENUM (Niche) | NO | `-` |
| `bio` | text | YES | `-` |
| `location` | text | NO | `-` |
| `styleTags` | ARRAY (_text) | YES | `-` |
| `verification` | ENUM (VerificationState) | NO | `'UNVERIFIED'::"VerificationState"` |
| `celebrityBadge` | boolean (bool) | NO | `false` |
| `referralCode` | text | NO | `-` |
| `avatarUrl` | text | YES | `-` |

**Indexes:**
- `Creator_pkey`: `CREATE UNIQUE INDEX "Creator_pkey" ON public."Creator" USING btree (id)`
- `Creator_referralCode_key`: `CREATE UNIQUE INDEX "Creator_referralCode_key" ON public."Creator" USING btree ("referralCode")`
- `Creator_userId_key`: `CREATE UNIQUE INDEX "Creator_userId_key" ON public."Creator" USING btree ("userId")`

**Foreign Keys:**
- `userId` -> `User.id` (`Creator_userId_fkey`)

### `InvestorApplication` (1 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `firstName` | text | NO | `-` |
| `lastName` | text | NO | `-` |
| `email` | text | NO | `-` |
| `phone` | text | YES | `-` |
| `investorRole` | text | NO | `-` |
| `message` | text | YES | `-` |
| `status` | text | NO | `'PENDING'::text` |
| `createdAt` | timestamp with time zone (timestamptz) | NO | `now()` |
| `updatedAt` | timestamp with time zone (timestamptz) | NO | `now()` |

**Indexes:**
- `InvestorApplication_pkey`: `CREATE UNIQUE INDEX "InvestorApplication_pkey" ON public."InvestorApplication" USING btree (id)`

### `KycCheck` (0 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `creatorId` | text | NO | `-` |
| `provider` | text | NO | `-` |
| `providerRef` | text | YES | `-` |
| `status` | ENUM (VerificationState) | NO | `-` |
| `raw` | jsonb | YES | `-` |
| `createdAt` | timestamp without time zone (timestamp) | NO | `CURRENT_TIMESTAMP` |

**Indexes:**
- `KycCheck_pkey`: `CREATE UNIQUE INDEX "KycCheck_pkey" ON public."KycCheck" USING btree (id)`

**Foreign Keys:**
- `creatorId` -> `Creator.id` (`KycCheck_creatorId_fkey`)

### `MediaAsset` (0 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `creatorId` | text | NO | `-` |
| `kind` | ENUM (MediaKind) | NO | `-` |
| `url` | text | NO | `-` |
| `sizeBytes` | integer (int4) | NO | `-` |
| `durationSec` | integer (int4) | YES | `-` |
| `createdAt` | timestamp without time zone (timestamp) | NO | `CURRENT_TIMESTAMP` |
| `taggingStatus` | ENUM (TaggingStatus) | NO | `'QUEUED'::"TaggingStatus"` |

**Indexes:**
- `MediaAsset_pkey`: `CREATE UNIQUE INDEX "MediaAsset_pkey" ON public."MediaAsset" USING btree (id)`

**Foreign Keys:**
- `creatorId` -> `Creator.id` (`MediaAsset_creatorId_fkey`)

### `MediaKit` (19 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `creatorId` | text | NO | `-` |
| `mode` | ENUM (MediaKitMode) | NO | `'AUTO'::"MediaKitMode"` |
| `uploadUrl` | text | YES | `-` |
| `uploadSizeBytes` | integer (int4) | YES | `-` |
| `autoVersion` | integer (int4) | NO | `1` |
| `autoLastRenderedAt` | timestamp without time zone (timestamp) | YES | `-` |
| `createdAt` | timestamp without time zone (timestamp) | NO | `CURRENT_TIMESTAMP` |
| `updatedAt` | timestamp without time zone (timestamp) | NO | `-` |

**Indexes:**
- `MediaKit_creatorId_key`: `CREATE UNIQUE INDEX "MediaKit_creatorId_key" ON public."MediaKit" USING btree ("creatorId")`
- `MediaKit_pkey`: `CREATE UNIQUE INDEX "MediaKit_pkey" ON public."MediaKit" USING btree (id)`

**Foreign Keys:**
- `creatorId` -> `Creator.id` (`MediaKit_creatorId_fkey`)

### `Message` (12 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `orderRoomId` | text | NO | `-` |
| `senderId` | text | NO | `-` |
| `kind` | ENUM (MessageKind) | NO | `-` |
| `content` | text | NO | `-` |
| `createdAt` | timestamp without time zone (timestamp) | NO | `CURRENT_TIMESTAMP` |

**Indexes:**
- `Message_pkey`: `CREATE UNIQUE INDEX "Message_pkey" ON public."Message" USING btree (id)`

**Foreign Keys:**
- `orderRoomId` -> `OrderRoom.id` (`Message_orderRoomId_fkey`)

### `NewsletterSubscriber` (2 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `email` | text | NO | `-` |
| `source` | text | NO | `'website_footer'::text` |
| `status` | text | NO | `'ACTIVE'::text` |
| `metadata` | jsonb | YES | `'{}'::jsonb` |
| `createdAt` | timestamp with time zone (timestamptz) | NO | `now()` |
| `updatedAt` | timestamp with time zone (timestamptz) | NO | `now()` |

**Indexes:**
- `NewsletterSubscriber_createdAt_idx`: `CREATE INDEX "NewsletterSubscriber_createdAt_idx" ON public."NewsletterSubscriber" USING btree ("createdAt")`
- `NewsletterSubscriber_email_idx`: `CREATE INDEX "NewsletterSubscriber_email_idx" ON public."NewsletterSubscriber" USING btree (email)`
- `NewsletterSubscriber_email_key`: `CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON public."NewsletterSubscriber" USING btree (email)`
- `NewsletterSubscriber_pkey`: `CREATE UNIQUE INDEX "NewsletterSubscriber_pkey" ON public."NewsletterSubscriber" USING btree (id)`
- `NewsletterSubscriber_status_idx`: `CREATE INDEX "NewsletterSubscriber_status_idx" ON public."NewsletterSubscriber" USING btree (status)`

### `Notification` (56 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `userId` | text | NO | `-` |
| `kind` | text | NO | `-` |
| `payload` | jsonb | NO | `-` |
| `readAt` | timestamp without time zone (timestamp) | YES | `-` |
| `createdAt` | timestamp without time zone (timestamp) | NO | `CURRENT_TIMESTAMP` |

**Indexes:**
- `Notification_pkey`: `CREATE UNIQUE INDEX "Notification_pkey" ON public."Notification" USING btree (id)`

**Foreign Keys:**
- `userId` -> `User.id` (`Notification_userId_fkey`)

### `NotificationPreference` (0 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `userId` | text | NO | `-` |
| `emailEnabled` | boolean (bool) | NO | `true` |
| `smsEnabled` | boolean (bool) | NO | `true` |
| `updatedAt` | timestamp without time zone (timestamp) | NO | `-` |

**Indexes:**
- `NotificationPreference_pkey`: `CREATE UNIQUE INDEX "NotificationPreference_pkey" ON public."NotificationPreference" USING btree (id)`
- `NotificationPreference_userId_key`: `CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON public."NotificationPreference" USING btree ("userId")`

**Foreign Keys:**
- `userId` -> `User.id` (`NotificationPreference_userId_fkey`)

### `OrderRoom` (7 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `bookingId` | text | NO | `-` |

**Indexes:**
- `OrderRoom_bookingId_key`: `CREATE UNIQUE INDEX "OrderRoom_bookingId_key" ON public."OrderRoom" USING btree ("bookingId")`
- `OrderRoom_pkey`: `CREATE UNIQUE INDEX "OrderRoom_pkey" ON public."OrderRoom" USING btree (id)`

**Foreign Keys:**
- `bookingId` -> `Booking.id` (`OrderRoom_bookingId_fkey`)

### `Payment` (7 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `bookingId` | text | NO | `-` |
| `provider` | text | NO | `-` |
| `providerRef` | text | YES | `-` |
| `status` | ENUM (PaymentStatus) | NO | `'INITIATED'::"PaymentStatus"` |
| `escrowHeld` | boolean (bool) | NO | `false` |
| `amount` | integer (int4) | NO | `-` |
| `currency` | text | NO | `-` |
| `createdAt` | timestamp without time zone (timestamp) | NO | `CURRENT_TIMESTAMP` |

**Indexes:**
- `Payment_bookingId_key`: `CREATE UNIQUE INDEX "Payment_bookingId_key" ON public."Payment" USING btree ("bookingId")`
- `Payment_pkey`: `CREATE UNIQUE INDEX "Payment_pkey" ON public."Payment" USING btree (id)`
- `Payment_providerRef_key`: `CREATE UNIQUE INDEX "Payment_providerRef_key" ON public."Payment" USING btree ("providerRef")`

**Foreign Keys:**
- `bookingId` -> `Booking.id` (`Payment_bookingId_fkey`)

### `PaymentEvent` (0 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `paymentId` | text | NO | `-` |
| `type` | text | NO | `-` |
| `raw` | jsonb | NO | `-` |
| `createdAt` | timestamp without time zone (timestamp) | NO | `CURRENT_TIMESTAMP` |
| `eventId` | text | NO | `-` |

**Indexes:**
- `PaymentEvent_paymentId_type_eventId_key`: `CREATE UNIQUE INDEX "PaymentEvent_paymentId_type_eventId_key" ON public."PaymentEvent" USING btree ("paymentId", type, "eventId")`
- `PaymentEvent_pkey`: `CREATE UNIQUE INDEX "PaymentEvent_pkey" ON public."PaymentEvent" USING btree (id)`

**Foreign Keys:**
- `paymentId` -> `Payment.id` (`PaymentEvent_paymentId_fkey`)

### `PhysicalAttributes` (0 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `creatorId` | text | NO | `-` |
| `heightRange` | ENUM (HeightRange) | YES | `-` |
| `weightRange` | ENUM (WeightRange) | YES | `-` |
| `ageRange` | ENUM (AgeRange) | YES | `-` |
| `build` | ENUM (BuildType) | YES | `-` |
| `complexion` | ENUM (Complexion) | YES | `-` |
| `hairColor` | ENUM (HairColor) | YES | `-` |
| `eyeColor` | ENUM (EyeColor) | YES | `-` |
| `genderPresentation` | ENUM (GenderPresentation) | YES | `-` |
| `shoeSize` | text | YES | `-` |
| `shoeSizeUnit` | ENUM (ShoeSizeUnit) | YES | `-` |
| `distinctiveFeatures` | text | YES | `-` |
| `visibility` | jsonb | NO | `'{}'::jsonb` |
| `consentVersion` | text | NO | `-` |
| `consentedAt` | timestamp without time zone (timestamp) | NO | `-` |
| `createdAt` | timestamp without time zone (timestamp) | NO | `CURRENT_TIMESTAMP` |
| `updatedAt` | timestamp without time zone (timestamp) | NO | `-` |

**Indexes:**
- `PhysicalAttributes_creatorId_key`: `CREATE UNIQUE INDEX "PhysicalAttributes_creatorId_key" ON public."PhysicalAttributes" USING btree ("creatorId")`
- `PhysicalAttributes_pkey`: `CREATE UNIQUE INDEX "PhysicalAttributes_pkey" ON public."PhysicalAttributes" USING btree (id)`

**Foreign Keys:**
- `creatorId` -> `Creator.id` (`PhysicalAttributes_creatorId_fkey`)

### `RateCard` (10 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `creatorId` | text | NO | `-` |
| `serviceTitle` | text | NO | `-` |
| `basePriceAmount` | integer (int4) | NO | `-` |
| `basePriceCurrency` | text | NO | `-` |
| `deliveryTimeline` | text | NO | `-` |

**Indexes:**
- `RateCard_pkey`: `CREATE UNIQUE INDEX "RateCard_pkey" ON public."RateCard" USING btree (id)`

**Foreign Keys:**
- `creatorId` -> `Creator.id` (`RateCard_creatorId_fkey`)

### `RefreshToken` (30 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `userId` | text | NO | `-` |
| `tokenHash` | text | NO | `-` |
| `expiresAt` | timestamp without time zone (timestamp) | NO | `-` |
| `revokedAt` | timestamp without time zone (timestamp) | YES | `-` |
| `createdAt` | timestamp without time zone (timestamp) | NO | `CURRENT_TIMESTAMP` |

**Indexes:**
- `RefreshToken_pkey`: `CREATE UNIQUE INDEX "RefreshToken_pkey" ON public."RefreshToken" USING btree (id)`

**Foreign Keys:**
- `userId` -> `User.id` (`RefreshToken_userId_fkey`)

### `SupportTicket` (0 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `userId` | text | NO | `-` |
| `subject` | text | NO | `-` |
| `message` | text | NO | `-` |
| `status` | ENUM (SupportTicketStatus) | NO | `'OPEN'::"SupportTicketStatus"` |
| `createdAt` | timestamp without time zone (timestamp) | NO | `CURRENT_TIMESTAMP` |

**Indexes:**
- `SupportTicket_pkey`: `CREATE UNIQUE INDEX "SupportTicket_pkey" ON public."SupportTicket" USING btree (id)`

**Foreign Keys:**
- `userId` -> `User.id` (`SupportTicket_userId_fkey`)

### `TermsAcceptance` (16 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `userId` | text | NO | `-` |
| `version` | text | NO | `-` |
| `acceptedAt` | timestamp without time zone (timestamp) | NO | `CURRENT_TIMESTAMP` |

**Indexes:**
- `TermsAcceptance_pkey`: `CREATE UNIQUE INDEX "TermsAcceptance_pkey" ON public."TermsAcceptance" USING btree (id)`

**Foreign Keys:**
- `userId` -> `User.id` (`TermsAcceptance_userId_fkey`)

### `User` (30 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `email` | text | NO | `-` |
| `passwordHash` | text | NO | `-` |
| `userType` | ENUM (UserType) | NO | `-` |
| `emailVerified` | boolean (bool) | NO | `false` |
| `createdAt` | timestamp without time zone (timestamp) | NO | `CURRENT_TIMESTAMP` |
| `updatedAt` | timestamp without time zone (timestamp) | NO | `-` |
| `phone` | text | YES | `-` |
| `accountOrigin` | ENUM (AccountOrigin) | NO | `'SIGNUP'::"AccountOrigin"` |
| `passwordSet` | boolean (bool) | NO | `true` |
| `authProvider` | ENUM (AuthProvider) | NO | `'EMAIL'::"AuthProvider"` |
| `googleId` | text | YES | `-` |
| `isNewUser` | boolean (bool) | NO | `true` |
| `supabaseUserId` | text | YES | `-` |

**Indexes:**
- `User_email_key`: `CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email)`
- `User_googleId_key`: `CREATE UNIQUE INDEX "User_googleId_key" ON public."User" USING btree ("googleId")`
- `User_pkey`: `CREATE UNIQUE INDEX "User_pkey" ON public."User" USING btree (id)`
- `User_supabaseUserId_key`: `CREATE UNIQUE INDEX "User_supabaseUserId_key" ON public."User" USING btree ("supabaseUserId")`

### `UserActivity` (3 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `userId` | text | NO | `-` |
| `action` | text | NO | `-` |
| `details` | text | YES | `-` |
| `createdAt` | timestamp without time zone (timestamp) | NO | `CURRENT_TIMESTAMP` |

**Indexes:**
- `UserActivity_pkey`: `CREATE UNIQUE INDEX "UserActivity_pkey" ON public."UserActivity" USING btree (id)`

**Foreign Keys:**
- `userId` -> `User.id` (`UserActivity_userId_fkey`)

### `VerificationRecording` (0 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `creatorId` | text | NO | `-` |
| `url` | text | NO | `-` |
| `durationSec` | integer (int4) | NO | `-` |
| `guidelineAck` | boolean (bool) | NO | `-` |
| `status` | ENUM (VerificationRecordingStatus) | NO | `'IN_REVIEW'::"VerificationRecordingStatus"` |
| `reviewerNote` | text | YES | `-` |
| `createdAt` | timestamp without time zone (timestamp) | NO | `CURRENT_TIMESTAMP` |
| `updatedAt` | timestamp without time zone (timestamp) | NO | `-` |

**Indexes:**
- `VerificationRecording_pkey`: `CREATE UNIQUE INDEX "VerificationRecording_pkey" ON public."VerificationRecording" USING btree (id)`

**Foreign Keys:**
- `creatorId` -> `Creator.id` (`VerificationRecording_creatorId_fkey`)

### `WithdrawalOtp` (0 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `userId` | text | NO | `-` |
| `withdrawalRequestId` | text | NO | `-` |
| `codeHash` | text | NO | `-` |
| `expiresAt` | timestamp without time zone (timestamp) | NO | `-` |
| `attempts` | integer (int4) | NO | `0` |
| `verifiedAt` | timestamp without time zone (timestamp) | YES | `-` |
| `createdAt` | timestamp without time zone (timestamp) | NO | `CURRENT_TIMESTAMP` |

**Indexes:**
- `WithdrawalOtp_pkey`: `CREATE UNIQUE INDEX "WithdrawalOtp_pkey" ON public."WithdrawalOtp" USING btree (id)`
- `WithdrawalOtp_userId_createdAt_idx`: `CREATE INDEX "WithdrawalOtp_userId_createdAt_idx" ON public."WithdrawalOtp" USING btree ("userId", "createdAt")`
- `WithdrawalOtp_withdrawalRequestId_createdAt_idx`: `CREATE INDEX "WithdrawalOtp_withdrawalRequestId_createdAt_idx" ON public."WithdrawalOtp" USING btree ("withdrawalRequestId", "createdAt")`

**Foreign Keys:**
- `userId` -> `User.id` (`WithdrawalOtp_userId_fkey`)
- `withdrawalRequestId` -> `WithdrawalRequest.id` (`WithdrawalOtp_withdrawalRequestId_fkey`)

### `WithdrawalRequest` (0 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | text | NO | `-` |
| `userId` | text | NO | `-` |
| `amount` | integer (int4) | NO | `-` |
| `currency` | text | NO | `'NGN'::text` |
| `bankName` | text | NO | `-` |
| `accountNumber` | text | NO | `-` |
| `accountName` | text | NO | `-` |
| `status` | ENUM (WithdrawalRequestStatus) | NO | `'PENDING_OTP'::"WithdrawalRequestStatus"` |
| `idempotencyKey` | text | YES | `-` |
| `createdAt` | timestamp without time zone (timestamp) | NO | `CURRENT_TIMESTAMP` |
| `updatedAt` | timestamp without time zone (timestamp) | NO | `-` |

**Indexes:**
- `WithdrawalRequest_idempotencyKey_key`: `CREATE UNIQUE INDEX "WithdrawalRequest_idempotencyKey_key" ON public."WithdrawalRequest" USING btree ("idempotencyKey")`
- `WithdrawalRequest_pkey`: `CREATE UNIQUE INDEX "WithdrawalRequest_pkey" ON public."WithdrawalRequest" USING btree (id)`
- `WithdrawalRequest_userId_createdAt_idx`: `CREATE INDEX "WithdrawalRequest_userId_createdAt_idx" ON public."WithdrawalRequest" USING btree ("userId", "createdAt")`

**Foreign Keys:**
- `userId` -> `User.id` (`WithdrawalRequest_userId_fkey`)

### `_prisma_migrations` (16 rows)

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | character varying (varchar) | NO | `-` |
| `checksum` | character varying (varchar) | NO | `-` |
| `finished_at` | timestamp with time zone (timestamptz) | YES | `-` |
| `migration_name` | character varying (varchar) | NO | `-` |
| `logs` | text | YES | `-` |
| `rolled_back_at` | timestamp with time zone (timestamptz) | YES | `-` |
| `started_at` | timestamp with time zone (timestamptz) | NO | `now()` |
| `applied_steps_count` | integer (int4) | NO | `0` |

**Indexes:**
- `_prisma_migrations_pkey`: `CREATE UNIQUE INDEX _prisma_migrations_pkey ON public._prisma_migrations USING btree (id)`

---

## 3. Database Enums

- **`AccountOrigin`**: `["SIGNUP", "AUTO_CHECKOUT"]`
- **`AgeRange`**: `["RANGE_18_25", "RANGE_26_35", "RANGE_36_45", "RANGE_46_55", "RANGE_56_65", "OVER_65"]`
- **`ApplicationStatus`**: `["APPLIED", "SHORTLISTED", "SELECTED", "REJECTED", "WITHDRAWN"]`
- **`AuthProvider`**: `["EMAIL", "GOOGLE", "MAGIC_LINK", "EMAIL_OTP"]`
- **`BookingOrigin`**: `["INTERNAL", "PUBLIC_LINK"]`
- **`BookingState`**: `["PENDING_PAYMENT", "ESCROW_LOCKED", "DELIVERABLES_PROVIDED", "PAYMENT_RELEASED", "CANCELLED", "DISPUTED"]`
- **`BriefStatus`**: `["DRAFT", "ACTIVE", "IN_REVIEW", "CLOSED"]`
- **`BuildType`**: `["SLIM", "ATHLETIC", "AVERAGE", "CURVY", "PLUS_SIZE", "MUSCULAR"]`
- **`CalendarConnectionStatus`**: `["CONNECTED", "REVOKED"]`
- **`Complexion`**: `["FAIR", "LIGHT", "MEDIUM", "TAN", "DARK", "DEEP"]`
- **`EngagementType`**: `["ONE_OFF", "RETAINER"]`
- **`EyeColor`**: `["BROWN", "BLACK", "HAZEL", "GREEN", "BLUE", "GREY"]`
- **`GenderPresentation`**: `["MASCULINE", "FEMININE", "ANDROGYNOUS", "NON_BINARY"]`
- **`HairColor`**: `["BLACK", "BROWN", "BLONDE", "RED", "GREY", "WHITE", "DYED_OTHER"]`
- **`HeightRange`**: `["UNDER_150CM", "CM_150_160", "CM_160_170", "CM_170_180", "CM_180_190", "OVER_190CM"]`
- **`MediaKind`**: `["VIDEO", "AUDIO"]`
- **`MediaKitMode`**: `["AUTO", "UPLOAD"]`
- **`MessageKind`**: `["TEXT", "VOICE", "DOCUMENT", "CALL", "SYSTEM"]`
- **`Niche`**: `["ACTOR", "VO_ARTIST", "COMEDIAN", "COMPERE", "SPEAKER_PASTOR", "MUSICIAN", "CONTENT_CREATOR"]`
- **`OrgType`**: `["STUDIO", "EVENT", "BRAND", "CHURCH"]`
- **`PaymentStatus`**: `["INITIATED", "AUTHORIZED", "ESCROW_HELD", "RELEASED", "REFUNDED", "FAILED", "RELEASING", "REFUNDING"]`
- **`ShoeSizeUnit`**: `["EU", "US", "UK"]`
- **`SupportTicketStatus`**: `["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]`
- **`TaggingStatus`**: `["QUEUED", "TAGGING", "DONE", "FAILED"]`
- **`UserType`**: `["TALENT", "CLIENT"]`
- **`VerificationRecordingStatus`**: `["UPLOADED", "IN_REVIEW", "APPROVED", "NEEDS_RERECORD"]`
- **`VerificationState`**: `["UNVERIFIED", "PROCESSING", "VERIFIED", "FAILED"]`
- **`WeightRange`**: `["UNDER_50KG", "KG_50_65", "KG_65_80", "KG_80_95", "OVER_95KG"]`
- **`WithdrawalRequestStatus`**: `["PENDING_OTP", "APPROVED", "REJECTED", "COMPLETED", "FAILED"]`
