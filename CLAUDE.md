# Monologg Admin

Internal monitoring and operations platform for the Monologg alpha launch (about 100 users, designed for 10,000).
The source of truth is `Monologg_Admin_PRD.md` in the repo root. Read it fully before starting any phase.
Follow prompts in `PromptPack_Admin.md` (A0 to A13). If a prompt conflicts with a PRD, stop and ask.

## Stack & Architecture
- **Admin App (`apps/admin`)**: Next.js App Router, TypeScript strict, Tailwind CSS, Monologg design tokens, opendraft components where they fit (Stat, Time Series Chart, Gauge, Timeline, Chat Panel), shadcn-style primitives as fallback. Deployed as its own Vercel project on a separate subdomain.
- **Admin API**: New routes under `/api/v1/admin/*` in `apps/api` (Node, Fastify), behind `requireAdmin` and permission checks. The admin browser **NEVER** talks directly to the database.
- **Database**: Supabase Postgres via Prisma. Reports run on a **read-only database role** (`monologg_admin_ro`) with a 5s `statement_timeout`. Writes go only through existing services, never raw SQL.
- **Identity & Auth**: Separate `AdminUser` table. Auth through `AuthVerifier` seam (Supabase Auth with Google/magic link by default, TOTP MFA server-enforced `aal2`). Session limits tracked via `AdminSession`. Admin accounts never mix with talent or client accounts.
- **Scheduling**: Single tick endpoint `POST /api/v1/cron/admin-tick` called every minute by Vercel Cron.
- **Storage**: Cloudflare R2 behind `StorageProvider` seam. Signed URLs for private exports and recordings.
- **Analytics**: First-party event log (`ProductEvent`) behind `EventSink` seam.

## System Invariants (Do Not Break)
1. **Existing Monorepo**: `apps/web` (user app), `apps/api` (Node/Fastify), `packages/types`.
2. **Database & Migrations**: Migrations are additive only. No renames, no drops, no data loss. All existing tests must stay green after every phase.
3. **Escrow-First**: Chat opens only after `ESCROW_LOCKED`.
4. **Separation of Concerns**:
   - Verification recording (`VerificationRecording`) and identity KYC (`KycCheck`, Smile Identity) are separate. Admin actions on recordings never write `Creator.verification`.
   - `styleTags` (AI vibe tags) and verification (KYC) stay separate.
5. **Provider Seams**: Every external dependency has a real and a mock implementation. The entire app, including admin, runs and tests with zero real keys.
6. **Payments & Fees**: Region-routed `PaymentProvider` (Paystack first; never mention FINCRA). Fees come from `PLATFORM_FEES` config (11% talent, 15% client). Never recompute fees in admin; read stored booking amounts.
7. **Privacy & Access Control**:
   - Physical attributes have per-field visibility (`PUBLIC`, `SEARCHABLE`, `PRIVATE`). `PRIVATE` values are never shown to any admin.
   - Reading chat requires ticket/dispute context, explicit reason, and generates an audit log.

## Working Rules
- Follow `PromptPack_Admin.md` (prompts A0 through A13). Run one prompt at a time.
- Verify every item in each prompt's verify list before proceeding.
- Work on a branch per prompt (`admin-a3-instrumentation`), test, review, and merge.
- Use gstack skills (`/review`, `/qa`, `/ship`) for reviews and verification.
