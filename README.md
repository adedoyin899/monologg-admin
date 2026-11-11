# Monologg Admin Platform

Internal monitoring, operations, and governance platform for the Monologg alpha launch.

[![CI](https://github.com/monologg/monologg-admin/actions/workflows/ci.yml/badge.svg)](https://github.com/monologg/monologg-admin/actions)
[![Version](https://img.shields.io/badge/version-1.0.0--alpha.1-blue.svg)](https://github.com/monologg/monologg-admin/releases/tag/v1.0.0-alpha.1)
[![Status](https://img.shields.io/badge/status-Alpha%20Ready-success.svg)](./admin/RUNBOOK.md)

---

## Architecture Overview

Monologg Admin is built as a hardened, role-governed internal console designed to support Monologg's marketplace operations, disputes, compliance verifications, and financial controls without cloning or exposing private customer data.

- **Frontend App (`apps/admin`)**: Next.js 14 App Router, React 18, Tailwind CSS, Lucide icons, dark/light theme switching, responsive down to 360px.
- **Backend API (`apps/api`)**: Fastify 5, Node.js 20+, TypeScript, Zod schema validation, Argon2id password/OTP hashing, HMAC token signing.
- **Data & Storage**: PostgreSQL via Prisma ORM (with dedicated read-only analytics pool `adminRoPrisma`), Cloudflare R2 object storage with 5-minute signed preview URLs.
- **Security & Privacy**: Strict default PII masking, reason-audited unmasking, forbidden key response scanning (zero leaks of password, hash, OTP, or raw vendor payloads), AAL2 MFA enforcement, and four-eyes approval gates for financial movements exceeding ₦1,500,000 (~$1,000).

---

## Core Capabilities (Phases A0 – A13 Completed)

| Module | Screens & Routes | Key Capabilities |
| :--- | :--- | :--- |
| **M1: Foundation & RBAC** | AD-01 (`/login`, `/login/mfa`), AD-31 (`/admins`) | Modular auth (Supabase/Clerk/Mock), AAL2 MFA, 8h max / 30m idle session expiry, immediate admin session revocation. |
| **M2: Overview & Feed** | AD-02 (`/`), AD-03 (`/feed`) | Core KPIs, volume chart, critical alerts ticker, real-time product event feed with actor and event filters. |
| **M3: Users & User 360** | AD-04 (`/users`), AD-05 (`/users/[id]`), AD-06 | 10-tab User 360 view, cohort tagging, PII reveal with audited justification (`PII_REVEALED`), 5-minute signed media previews. |
| **M4 & M10: Analytics** | AD-19 to AD-24 (`/analytics/*`) | Acquisition channels, funnels (Talent Onboarding, Client Lifecycle, External Storefront), W0-W8 retention cohorts, traffic & consent, feature adoption, marketplace supply/demand. |
| **M5: Bookings & Rooms** | AD-07 (`/bookings`), AD-08 (`/bookings/[id]`) | Stuck booking rule engine, stored fee breakdowns, order room message volume counts (message bodies masked), timeline audit. |
| **M6: Finance & Payouts** | AD-09 (`/payments`, `/earnings`), AD-10 (`/payments/[id]`), AD-11 (`/withdrawals`) | GMV, held escrow, take rates, payment failure rate, raw webhook modal (audited), withdrawal approvals, four-eyes gate. |
| **M7: Support & Tickets** | AD-12 (`/tickets`), AD-13 (`/tickets/[id]`), AD-14 | Ticket queue (Mine, Unassigned, Urgent), internal notes (amber highlight), SLA indicators, canned responses, create on behalf of user. |
| **M8: Disputes & Chat** | AD-17 (`/disputes`), AD-18 (`/disputes/[id]`) | Evidence panel, logged private chat review banner (`CHAT_VIEWED`), split calculations, four-eyes approval workflow. |
| **M9: Verifications** | AD-26 (`/verifications`, `/[id]`) | 90s video player, 5-point guideline checklist, approve/re-record decisions, X3 guardrail protection. |
| **M11: Alerts & Health** | AD-27 (`/alerts`), AD-28 (`/health`), `tick.ts` | Code-computed alert engine, automated 5-minute tick execution, lease locks (`JobRun`), DB & R2 storage 80% gauges, daily/weekly digests. |
| **M12: Audit & Exports** | AD-29 (`/audit`), AD-30 (`/exports`), AD-32 (`/settings`) | Immutable audit trail, role-gated CSV exports (50k row cap, 24h signed URL, 7d lifecycle purge), platform settings and SLA viewer. |

---

## Getting Started

### Prerequisites
- Node.js 20.x or higher
- pnpm 9.x or higher
- PostgreSQL 15+ database

### Local Setup
```bash
# Clone the repository
git clone https://github.com/monologg/monologg-admin.git
cd monologg-admin

# Install dependencies across monorepo
pnpm install

# Setup environment variables
cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.example apps/admin/.env.local

# Generate Prisma Client & Run Migrations
pnpm --filter @monologg/api prisma generate
pnpm --filter @monologg/api prisma migrate deploy

# Seed deterministic synthetic dataset
pnpm --filter @monologg/api tsx scripts/generate-synthetic-data.ts

# Start Development Servers
pnpm dev
```
- Admin Console: `http://localhost:3001`
- Backend API: `http://localhost:4000`

---

## Testing & Quality Assurance

```bash
# Run all API tests (71 test suites, 855 tests)
pnpm --filter @monologg/api test

# Run Response Scanner (verifies zero forbidden keys across all 22 admin routes)
pnpm --filter @monologg/api test src/admin/response-scanner.test.ts

# Run Admin Frontend Tests
pnpm --filter @monologg/admin test

# Run Production Build & Client Bundle Secret Scanner
pnpm --filter @monologg/admin build
```

---

## Operations & Documentation

- **Operations Runbook**: [`admin/RUNBOOK.md`](./admin/RUNBOOK.md) – Step-by-step procedures for daily 15-minute alpha checks, admin onboarding/offboarding, secret rotation, and incident recovery.
- **QA Sweep Report**: [`qa/admin-sweep.md`](./qa/admin-sweep.md) – Detailed testing verification covering all 32 screens, dark mode, mobile responsiveness, and RBAC matrix.
- **PRD**: [`Monologg_Admin_PRD.md`](./Monologg_Admin_PRD.md)
- **Prompt Pack**: [`PromptPack_Admin.md`](./PromptPack_Admin.md)

---

## License

Proprietary and confidential. All rights reserved © 2026 Monologg Inc.
