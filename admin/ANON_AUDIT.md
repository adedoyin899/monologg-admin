# Supabase Anon Key & Data API Security Audit

**Date:** 2026-11-10  
**Auditor:** Antigravity (Phase A0 Preflight)  
**Target Database:** Supabase Postgres (`uuacczlwejzjbhhcyjii`)  
**Protocol Tested:** PostgREST Data API (`https://uuacczlwejzjbhhcyjii.supabase.co/rest/v1/*`) using `SUPABASE_ANON_KEY`  

---

## 1. Executive Summary & Blocker Alert

> [!CAUTION]
> **CRITICAL LAUNCH BLOCKER IDENTIFIED**: Four tables in the `public` schema return live data or schema information directly to any unauthenticated client possessing only the public Supabase anon key:
> 1. **`InvestorApplication`**: Leaks full PII of backer leads (first/last name, email, phone, investor role, memo).
> 2. **`NewsletterSubscriber`**: Leaks subscriber email list, with an open UPDATE policy allowing arbitrary modifications.
> 3. **`AnalyticsEvent`**: Leaks full application event telemetry (1,721 events, session IDs, user IDs, paths).
> 4. **`_prisma_migrations`**: Has **RLS DISABLED**, leaking migration names, checksums, and execution timestamps.

Per the A0 prompt requirements, **this audit stops here and reports the exact SQL fix below**. Do NOT deploy or launch until this fix is reviewed and applied.

---

## 2. Detailed Findings by Table

| Table Name | RLS Status | Anon Policy / Grants | Data API Response (Anon Key) | Severity |
|---|---|---|---|---|
| `_prisma_migrations` | **DISABLED** | `GRANT SELECT TO anon` | **200 OK — Returns all migration rows** | **HIGH** |
| `InvestorApplication` | **ENABLED** | `Allow select to InvestorApplication` (`USING (true)`) | **200 OK — Returns live backer PII & emails** | **CRITICAL** |
| `NewsletterSubscriber` | **ENABLED** | `Allow select on NewsletterSubscriber` (`USING (true)`) | **200 OK — Returns subscriber emails** | **CRITICAL** |
| `AnalyticsEvent` | **ENABLED** | `Allow select to AnalyticsEvent` (`USING (true)`) | **200 OK — Returns 1,721 event telemetry rows** | **HIGH** |
| `Application` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `AuthEvent` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `AvailabilityBlock` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `Booking` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `Brief` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `CalendarConnection` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `CalendarEvent` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `Client` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `Creator` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `KycCheck` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `MediaAsset` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `MediaKit` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `Message` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `Notification` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `NotificationPreference` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `OrderRoom` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `Payment` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `PaymentEvent` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `PhysicalAttributes` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `RateCard` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `RefreshToken` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `SupportTicket` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `TermsAcceptance` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `User` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `UserActivity` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `VerificationRecording` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `WithdrawalOtp` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |
| `WithdrawalRequest` | ENABLED | Default deny (no matching anon policy) | 200 OK `[]` (0 rows leaked) | Low / Exposed Endpoint |

### Storage and Auth Endpoints
- `GET /storage/v1/bucket`: Returns `200 OK []` (No buckets exist or are visible).
- `GET /auth/v1/users`: Returns `404 Not Found` (Administrative user endpoint correctly gated).

---

## 3. Why This Happened
During earlier frontend feature builds (Sessions 174, 184, 194):
1. `WebsiteFooter.tsx` was implemented to directly call `supabase.from("NewsletterSubscriber").upsert(...)`.
2. `ResourcesPage.tsx` was implemented to directly call `supabase.from("InvestorApplication").insert(...)`.
3. `analytics.ts` was implemented to directly call `supabase.from("AnalyticsEvent").insert(...)`.

To enable these client-side calls, RLS policies were added. However, whoever wrote the migration also added permissive `SELECT` policies (`USING (true)`) for `anon` and `authenticated` roles, completely exposing all submitted records to anyone viewing the website.

---

## 4. Remediation Plan & Exact SQL Fix

### Step 1: Immediate SQL Fix (To Be Executed in Supabase SQL Editor / Migration)
This immediately seals the PII leaks while preserving frontend functionality (the website can still insert newsletter and investor leads, but nobody can read them):

```sql
-- 1. Secure _prisma_migrations (Enable RLS and revoke public access)
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."_prisma_migrations" FROM anon, authenticated;

-- 2. Drop permissive SELECT and UPDATE policies on InvestorApplication
DROP POLICY IF EXISTS "Allow select to InvestorApplication" ON public."InvestorApplication";
-- Ensure INSERT remains permitted for prospective investors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'InvestorApplication' AND policyname = 'Allow public insert to InvestorApplication'
  ) THEN
    CREATE POLICY "Allow public insert to InvestorApplication" 
    ON public."InvestorApplication" FOR INSERT TO anon, authenticated 
    WITH CHECK (true);
  END IF;
END $$;

-- 3. Drop permissive SELECT and UPDATE policies on NewsletterSubscriber
DROP POLICY IF EXISTS "Allow select on NewsletterSubscriber" ON public."NewsletterSubscriber";
DROP POLICY IF EXISTS "Allow public update on NewsletterSubscriber" ON public."NewsletterSubscriber";
-- Ensure INSERT remains permitted for newsletter signups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'NewsletterSubscriber' AND policyname = 'Allow public insert on NewsletterSubscriber'
  ) THEN
    CREATE POLICY "Allow public insert on NewsletterSubscriber" 
    ON public."NewsletterSubscriber" FOR INSERT TO anon, authenticated 
    WITH CHECK (true);
  END IF;
END $$;

-- 4. Drop permissive SELECT on AnalyticsEvent
DROP POLICY IF EXISTS "Allow select to AnalyticsEvent" ON public."AnalyticsEvent";
```

### Step 2: Long-Term Architectural Fix (PRD Flag F2)
1. Route all newsletter signups, investor applications, and analytics events through `apps/api` endpoints:
   - `POST /api/v1/newsletter`
   - `POST /api/v1/investor-applications`
   - `POST /api/v1/events` (as defined in PRD Section 7.3)
2. Once client-side `supabase.from(...)` calls are removed, completely revoke all access to the `public` schema from the `anon` role:
```sql
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;
```
3. In the Supabase Project Dashboard under **API Settings**, disable the Data API (PostgREST) for the `public` schema entirely. This guarantees that the anon key can never reach any application table, even if an RLS policy is misconfigured in the future.