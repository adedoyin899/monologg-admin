# Monologg — Tools, Integrations & API Architecture Guide

**Last updated:** 2026-08-17 (Session 69: Comprehensive Non-Technical Tools & Integrations Guide)  
**Target Audience:** Non-technical stakeholders, product managers, decision-makers, and new engineers seeking a plain-language understanding of Monologg's tech ecosystem.

---

## Executive Summary & Non-Technical Analogy

Building a modern digital marketplace like **Monologg** (which connects talent with clients, schedules appointments, holds payments safely, and verifies identities) is very much like building a modern, high-security luxury hotel:

- **The Building & Rooms (Frontend - React, Vite, Tailwind, Motion):** What the guest sees, touches, and interacts with—the decor, doors, furniture, lighting, and visual experience.
- **The Front Desk & Manager's Office (Backend - Fastify API):** The brain of the operation that takes requests, enforces hotel rules, checks IDs, and makes sure guests only go into rooms they paid for.
- **The Hotel Vault & filing cabinet (Database - PostgreSQL & Prisma):** The unshakeable safe where records of every registered guest, booking, message, contract, and transaction are permanently and safely logged.
- **Specialized Third-Party Contractors (Integrations & APIs):**
  - **The Armored Bank Truck (Paystack / Stripe):** Collects money safely, locks funds in escrow, and pays talent once jobs are completed.
  - **The ID Inspector (KYC Provider):** Checks government IDs and selfies to ensure people are who they claim to be.
  - **The Talent Scout / Stylist AI (AI Tagging Provider):** Scans audio and video clips to automatically catalog acting styles, vocal range, and performance vibes.
  - **The Concierge & Calendar Syncer (Google Calendar API):** Auto-schedules meetings and creates Google Meet video links.
  - **The Mailroom & SMS Dispatch (SendGrid & Twilio):** Sends instant email receipts, booking reminders, and text message alerts.
  - **The Night Shift Workers (BullMQ & Redis):** Handle background tasks without slowing down the front desk.
  - **The Security Guard & Housekeeping Scanner (Malware/Virus Scanner):** Inspects all uploaded files for safety before putting them on hotel shelves (Storage).

This document breaks down **every single tool, service, API, and integration** in Monologg: what it is, why it is essential, how it was set up, when it was introduced, and how to configure it.

---

## Quick Reference Summary Table

| Tool / Integration | Type | Plain-Language Category | Introduced Stage | Architectural Importance | Primary Purpose |
|---|---|---|---|---|---|
| **Fastify** | Node.js Backend Framework | Front Desk / Brain | Phase 3 | 🔴 Critical (Core) | High-speed server processing user requests, security, and logic |
| **PostgreSQL & Prisma** | Database & Schema ORM | Master Vault / Records | Phase 2 | 🔴 Critical (Core) | Permanent, safe storage of accounts, bookings, escrow, and profiles |
| **Custom JWT + Argon2id** | Auth & Password Security | Hotel Keycard System | Phase 4 | 🔴 Critical (Core) | Secure passwords with bank-grade encryption & issue login keycards |
| **Supabase Auth Bridge** | Google OAuth & Avatars | VIP Single-Sign-On | Phase 12B/12C & Session 68 | 🟡 High Importance | Allows 1-click Google Sign-In and auto-syncs profile avatar photos |
| **Paystack** | Payment & Escrow Engine | Armored Money Truck | Phase 6 & Phase 13 | 🔴 Critical (Core) | Card/Bank checkout in NGN/USD/GHS/ZAR, holds money in escrow safely |
| **Stripe & Airwallex (Stubs)** | Global & FX Payments | International Money Transfers | Phase 6 | 🟢 Supporting | Global credit card processing and international multi-currency payouts |
| **KYC Verification Provider** | Identity Verification | Security ID Scanner | Phase 7 & Phase 12A | 🟡 High Importance | Verifies legal names, government IDs, and selfie check video clips |
| **AI Style-Tagging Engine** | Computer Vision / NLP AI | Talent Scout & Cataloger | Phase 7 | 🟡 High Importance | Analyzes media uploads to auto-assign searchable style tags (e.g. "Dramatic") |
| **Google Calendar & Meet** | Scheduling & Video Links | Concierge Sync | Phase 8 & Phase 13 | 🟡 High Importance | Checks talent availability and automatically generates Google Meet links |
| **SendGrid** | Transactional Email | Official Mailroom | Phase 9 | 🟡 High Importance | Sends booking confirmations, escrow alerts, and password resets |
| **Twilio** | SMS Gateway | Mobile Text Dispatch | Phase 9 | 🟢 Supporting | Sends instant SMS alerts for urgent bookings and status updates |
| **BullMQ & Redis** | Background Queue & Cache | Night-Shift Processing | Phase 9 & Phase 12 | 🟡 High Importance | Executes slow tasks (emails, media processing) in background without lag |
| **AWS S3 / Supabase Storage** | Object Media Storage | Digital Asset Warehouse | Phase 7 & Phase 12A | 🔴 Critical (Core) | Securely stores video headshots, voice demos, and Media Kit PDFs |
| **Virus / Media Scanner** | Security & Virus Protection | Bag Inspection Guard | Phase 12 | 🟡 High Importance | Scans uploaded files for viruses and malware before saving to storage |
| **React 18 & Vite 6** | Web UI & Build Engine | Hotel Decor & Construction | Phase 0 & Phase 1 | 🔴 Critical (Core) | Fast, responsive web application interface for web browsers |
| **Tailwind CSS v4 & Motion** | Visual Styling & Animation | Interior Design & Motion | Phase 0 & Phase 11 | 🔴 Critical (Core) | Design token system, dark mode, red/purple branding, smooth animations |
| **Lucide Icons & Web Fonts** | Icons & Offline Fonts | Signage & Typography | Phase 11 | 🟢 Supporting | Self-hosted typography (General Sans) and crisp UI icons |
| **Vitest** | Automated Test Suite | Quality Control Inspection | Phase 0 & Phase 12 | 🔴 Critical (Core) | Runs hundreds of automatic tests to catch bugs before code reaches users |
| **Playwright & Axe-Core** | E2E & Accessibility Tester | Inspector General / Audit | Phase 17 | 🟡 High Importance | Simulates real user browser sessions & checks WCAG accessibility |
| **Docker & Docker Compose** | Software Containerization | Portable Shipping Container | Phase 12 | 🟡 High Importance | Packages server & database so they run identically anywhere |
| **Vercel & Railway** | Cloud Hosting Infrastructure | Power & Land Utility | Phase 12 & Session 66 | 🔴 Critical (Core) | Vercel hosts the web app; Railway hosts the backend server & database |
| **GitHub Actions (CI)** | Automated Pipeline | Security Gatekeeper | Phase 0 & Phase 12 | 🟡 High Importance | Automatically tests and checks every single line of new code |

---

## Detailed Tool & Integration Breakdowns

---

### 1. Database, Backend & Core Infrastructure

#### A. Fastify (API Backend Framework)
- **What it is in Plain Language:** The central engine ("front desk manager") of Monologg. Whenever a user clicks a button, books a talent, or posts a brief, the browser sends a message to Fastify, which checks permissions, runs logic, and responds.
- **Architectural Importance:** 🔴 **Critical (Core)** — Without Fastify, the application has no server-side logic or security enforcement.
- **Stage Introduced:** Introduced in **Phase 3** (Server Setup).
- **How to Set Up & Configure:**
  - Located in `apps/api/src/app.ts` and `apps/api/src/index.ts`.
  - Configured via environment variable: `PORT=3001` and `HOST=0.0.0.0`.
  - Started locally using: `pnpm --filter @monologg/api run dev`.

#### B. PostgreSQL & Prisma ORM
- **What it is in Plain Language:** **PostgreSQL** is the main digital vault (database) storing all accounts, rate cards, bookings, reviews, and money balances. **Prisma** is the smart translator that lets developers write clear TypeScript code to read and write data safely without writing raw SQL.
- **Architectural Importance:** 🔴 **Critical (Core)** — The sole source of truth for persistent data in Monologg.
- **Stage Introduced:** Introduced in **Phase 2** (Database Schema) & **Phase 5** (Domain Resources).
- **How to Set Up & Configure:**
  - Database schema defined in `apps/api/prisma/schema.prisma`.
  - Configured via environment variable: `DATABASE_URL="postgresql://user:password@localhost:5432/monologg"`.
  - Commands to apply schema and migrations:
    - Apply schema: `pnpm --filter @monologg/api run prisma:db-push`
    - Run seed data: `pnpm --filter @monologg/api run seed`

---

### 2. User Authentication & Identity Management

#### A. Custom JWT + Argon2id Security
- **What it is in Plain Language:** Monologg's built-in keycard and lock system. When users log in with email and password, **Argon2id** (bank-grade password encryption) verifies their identity, and **JWT** gives their web browser a secure digital keycard (access token) to access protected pages.
- **Architectural Importance:** 🔴 **Critical (Core)** — Guarantees passwords can never be stolen in plain text and enforces role security (Talent vs Client).
- **Stage Introduced:** Introduced in **Phase 4** (Authentication System).
- **How to Set Up & Configure:**
  - Configured via environment variables:
    - `JWT_SECRET="your-super-secret-jwt-key"`
    - `JWT_EXPIRES_IN="15m"`
    - `REFRESH_TOKEN_EXPIRES_IN="7d"`
  - Logic located in `apps/api/src/routes/auth.ts` and `apps/api/src/middlewares/auth.ts`.

#### B. Supabase Auth Bridge (Google OAuth & Avatars)
- **What it is in Plain Language:** The "Sign in with Google" button. It lets clients and talent create accounts or log in with one click using their Google account, while automatically fetching their Google profile photo.
- **Architectural Importance:** 🟡 **High Importance** — Drastically reduces registration friction for non-technical users and provides instant high-resolution avatars.
- **Stage Introduced:** Introduced in **Phase 12B / 12C** and refined in **Session 68**.
- **How to Set Up & Configure:**
  - Integrated via `apps/api/src/providers/supabaseAuth.real.ts`.
  - Configured via environment variables:
    - `SUPABASE_URL="https://your-project.supabase.co"`
    - `SUPABASE_ANON_KEY="your-anon-key"`
    - `SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"`

---

### 3. Payments, Currency & Escrow Engine

#### A. Paystack Payment Engine
- **What it is in Plain Language:** Monologg's primary digital payment processor. When a client books talent, Paystack handles card payments or bank transfers in multiple African currencies (`NGN`, `GHS`, `KES`, `ZAR`) and `USD`.
- **Escrow Safeguard:** Money is held securely in **Escrow** by Monologg. The talent is only paid after the client confirms the work was completed satisfactorily.
- **Architectural Importance:** 🔴 **Critical (Core)** — Handles 100% of real money movement, escrow locking, and automated payouts to talent bank accounts.
- **Stage Introduced:** Introduced in **Phase 6** (Escrow Backend) and connected to UI in **Phase 13**.
- **How to Set Up & Configure:**
  - Integrated via `apps/api/src/providers/payment.real.ts`.
  - Configured via environment variables:
    - `PAYSTACK_SECRET_KEY="sk_live_..."` (or `sk_test_...` for development)
    - `PAYSTACK_WEBHOOK_SECRET="your-webhook-hmac-secret"`
  - Webhook URL configured in Paystack dashboard: `https://api.monologg.com/api/v1/webhooks/paystack`.

#### B. Stripe & Airwallex (Multi-Currency Stubs)
- **What it is in Plain Language:** Secondary payment backbones for international talent and clients outside Africa (e.g. US, UK, Europe).
- **Architectural Importance:** 🟢 **Supporting** — Currently stubbed in the code behind unified interfaces (`payment.stripe.ts` and `payment.airwallex.ts`) ready for full enablement when expanding globally.
- **Stage Introduced:** Introduced in **Phase 6**.
- **How to Set Up & Configure:**
  - Controlled by configuration flags in `apps/api/src/providers/index.ts`.

---

### 4. Identity Verification & AI Style-Tagging

#### A. KYC Identity Verification Provider
- **What it is in Plain Language:** The digital ID inspector. Talent upload government identification documents and a short selfie video to earn the gold "Verified Talent" badge on their public profile.
- **Architectural Importance:** 🟡 **High Importance** — Prevents impersonation and gives clients confidence that talent are real, verified professionals.
- **Stage Introduced:** Introduced in **Phase 7** (KYC & AI Tagging) and extended in **Phase 12A** (Verification Video).
- **How to Set Up & Configure:**
  - Integrated via `apps/api/src/providers/kyc.real.ts`.
  - Switch provider mode in environment variables:
    - `KYC_PROVIDER="real"` (or `"mock"` for local offline testing).
    - `KYC_API_KEY="your-kyc-provider-api-key"`.

#### B. AI Style-Tagging Engine (Computer Vision & Audio Analysis)
- **What it is in Plain Language:** An automated AI talent scout. When talent upload video headshots or audio reels, this AI analyzes their tone, expression, and voice to automatically attach tags like *"Dramatic"*, *"Corporate Voice-Over"*, or *"Comedic"*.
- **Architectural Importance:** 🟡 **High Importance** — Powers Monologg's smart search filters so clients can find exact performance styles in seconds.
- **Stage Introduced:** Introduced in **Phase 7**.
- **How to Set Up & Configure:**
  - Integrated via `apps/api/src/providers/aiTagging.real.ts`.
  - Configured via environment variables:
    - `AI_TAGGING_PROVIDER="real"`
    - `AI_SERVICE_URL="https://ai.monologg.com/analyze"`

---

### 5. Calendar, Availability & Video Calls

#### A. Google Calendar & Google Meet API Integration
- **What it is in Plain Language:** A smart concierge that syncs with talent's real Google Calendar to avoid double-booking and automatically generates a private Google Meet video link as soon as a booking is confirmed.
- **Architectural Importance:** 🟡 **High Importance** — Guarantees talent availability calculations are server-authoritative and frictionless for live video auditions or consultations.
- **Stage Introduced:** Introduced in **Phase 8** (Google Calendar Provider) and wired in **Phase 13**.
- **How to Set Up & Configure:**
  - Integrated via `apps/api/src/providers/calendar.real.ts`.
  - Uses OAuth 2.0 with AES-256-GCM encrypted refresh tokens stored in database.
  - Configured via environment variables:
    - `GOOGLE_CLIENT_ID="your-google-oauth-client-id"`
    - `GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"`
    - `GOOGLE_REDIRECT_URI="https://api.monologg.com/api/v1/calendar/google/callback"`

---

### 6. Notifications, Messaging & Queues

#### A. SendGrid Email & Twilio SMS
- **What it is in Plain Language:** Monologg's messaging postal service. **SendGrid** delivers email receipts, project invitation alerts, and password resets. **Twilio** sends urgent text message reminders directly to users' phones.
- **Architectural Importance:** 🟡 **High Importance** — Keeps clients and talent engaged with timely updates throughout the booking pipeline.
- **Stage Introduced:** Introduced in **Phase 9** (Notifications Engine).
- **How to Set Up & Configure:**
  - Integrated via `apps/api/src/providers/notify.real.ts`.
  - Configured via environment variables:
    - `SENDGRID_API_KEY="SG.your-sendgrid-key"`
    - `SENDGRID_FROM_EMAIL="notifications@monologg.com"`
    - `TWILIO_ACCOUNT_SID="AC..."`
    - `TWILIO_AUTH_TOKEN="your-twilio-token"`
    - `TWILIO_FROM_NUMBER="+1234567890"`

#### B. BullMQ & Redis Cache
- **What it is in Plain Language:** The night-shift crew and fast-memory desk. **Redis** stores temporary data in ultra-fast memory, while **BullMQ** handles heavy background jobs (like sending 500 email alerts or processing big video uploads) so the main web application never lags.
- **Architectural Importance:** 🟡 **High Importance** — Essential for system responsiveness and preventing server crashes during peak traffic.
- **Stage Introduced:** Introduced in **Phase 9** & hardened in **Phase 12**.
- **How to Set Up & Configure:**
  - Integrated via `apps/api/src/providers/cache.real.ts` and `apps/api/src/jobs/index.ts`.
  - Configured via environment variable: `REDIS_URL="redis://localhost:6379"`.

---

### 7. File Storage & Security Scanning

#### A. AWS S3 / Supabase Media Storage
- **What it is in Plain Language:** Monologg's cloud warehouse for media assets—storing high-resolution photos, audio reels, video headshots, identity documents, and downloadable Media Kit PDFs.
- **Architectural Importance:** 🔴 **Critical (Core)** — All talent portfolios and client project attachments depend on this reliable cloud storage.
- **Stage Introduced:** Introduced in **Phase 7** & expanded in **Phase 12A**.
- **How to Set Up & Configure:**
  - Integrated via `apps/api/src/providers/storage.real.ts`.
  - Configured via environment variables:
    - `STORAGE_PROVIDER="s3"` (or `"supabase"`)
    - `S3_BUCKET_NAME="monologg-media"`
    - `AWS_ACCESS_KEY_ID="your-aws-access-key"`
    - `AWS_SECRET_ACCESS_KEY="your-aws-secret-key"`

#### B. Virus & Malware Media Scanner
- **What it is in Plain Language:** The digital security guard inspecting luggage. Every time a user uploads a file, this scanner inspects it for viruses or malicious code before publishing it to the platform.
- **Architectural Importance:** 🟡 **High Importance** — Protects Monologg users and servers from malicious file uploads.
- **Stage Introduced:** Introduced in **Phase 12** (Production Hardening).
- **How to Set Up & Configure:**
  - Integrated via `apps/api/src/providers/scanner.real.ts`.
  - Configured via environment variable: `SCANNER_PROVIDER="real"` (uses ClamAV or cloud file guard API).

---

### 8. Frontend Web App & Design System

#### A. React 18, Vite 6 & TypeScript
- **What it is in Plain Language:** The building blocks of the web interface. **React** makes the pages interactive; **Vite** builds and serves the files at lightning speed; **TypeScript** prevents coding typos by enforcing strict rules.
- **Architectural Importance:** 🔴 **Critical (Core)** — Powers the entire web user experience across mobile phones, tablets, and desktop computers.
- **Stage Introduced:** **Phase 0** & **Phase 1**.
- **How to Set Up & Configure:**
  - Main web app code in `apps/web/src`.
  - Configured via `apps/web/vite.config.ts`.
  - Run web app locally: `pnpm --filter @monologg/web run dev` (runs at `http://localhost:5173`).

#### B. Tailwind CSS v4, Motion & Design Tokens
- **What it is in Plain Language:** Monologg's visual design engine. It manages Monologg's signature colors (Mono-Red for Talent, Mono-Purple for Clients), smooth dark mode contrast, responsive layouts, and springy animations.
- **Architectural Importance:** 🔴 **Critical (Core)** — Guarantees a cohesive, luxury visual identity across every screen.
- **Stage Introduced:** **Phase 0** (Tailwind/Motion) & **Phase 11** (Self-hosted tokens).
- **How to Set Up & Configure:**
  - Design tokens defined in `apps/web/src/styles/tokens.css`.
  - Interactive design system reference live at `/design-system` inside the running application.

#### C. Self-Hosted Web Fonts (General Sans & Plus Jakarta Sans)
- **What it is in Plain Language:** Custom typography built directly into the web application. Because fonts are saved directly inside the project rather than fetched from Google Fonts CDN, Monologg loads instantly and works 100% offline without relying on external servers.
- **Architectural Importance:** 🟢 **Supporting** — Enhances loading speed, typography consistency, and privacy compliance.
- **Stage Introduced:** Introduced in **Phase 11** (Design System Hardening).

---

### 9. Testing, Quality Assurance & Deployment Pipeline

#### A. Vitest Test Runner
- **What it is in Plain Language:** An automated quality inspection robot. Every time developers write code, Vitest runs over 70 automated tests checking money calculation, escrow locks, auth security, and calendar slots.
- **Architectural Importance:** 🔴 **Critical (Core)** — Prevents human error and catches bugs automatically before code is published.
- **Stage Introduced:** Introduced in **Phase 0** & expanded across all phases.
- **How to Run Tests:** `pnpm test` (or `pnpm --filter @monologg/web test`).

#### B. Playwright & Axe-Core Accessibility
- **What it is in Plain Language:** A simulated real-world visitor tester. **Playwright** opens automated Chrome, Firefox, and Safari browsers to click through booking flows, while **Axe-Core** scans screens to ensure visually impaired users can navigate using screen readers (WCAG AA compliance).
- **Architectural Importance:** 🟡 **High Importance** — Guarantees cross-browser reliability and web accessibility.
- **Stage Introduced:** Introduced in **Phase 17** (Independent QA & Accessibility Audit).
- **How to Run:** `pnpm --filter @monologg/web test:e2e`.

#### C. Docker & Docker Compose
- **What it is in Plain Language:** A standardized software shipping container. It bundles the backend server, database, and Redis together so they run identically on a developer's Mac, a Linux server, or cloud hosting.
- **Architectural Importance:** 🟡 **High Importance** — Eliminates "it works on my machine" deployment bugs.
- **Stage Introduced:** Introduced in **Phase 12**.
- **How to Use:** `docker compose up --build`.

#### D. Vercel & Railway Cloud Hosting Infrastructure
- **What it is in Plain Language:** The cloud servers hosting Monologg live on the internet. **Vercel** hosts the web frontend application for fast global delivery, while **Railway** hosts the Fastify server backend and PostgreSQL database.
- **Architectural Importance:** 🔴 **Critical (Core)** — Renders the platform accessible to real clients and talent worldwide 24/7.
- **Stage Introduced:** Introduced in **Phase 12** and automated in **Session 66**.
- **How to Configure:**
  - Vercel root directory: `monologg/apps/web`, build command: `pnpm run build`.
  - Railway project root: `monologg/apps/api`, start command: `pnpm run start`.

#### E. GitHub Actions (Continuous Integration Pipeline)
- **What it is in Plain Language:** The security gatekeeper on GitHub. Whenever a developer submits new code, GitHub Actions automatically runs typechecks, linting, Vitest suites, security vulnerability audits, and docker builds. If anything fails, it blocks the code from merging.
- **Architectural Importance:** 🟡 **High Importance** — Keeps codebase quality high and prevents broken code from ever reaching production.
- **Stage Introduced:** Introduced in **Phase 0** & expanded in **Phase 12** (`.github/workflows/monologg-ci.yml`).

---

## Environment Variables Quick-Start Master List

Below is the complete set of configuration variables required to run Monologg in production (`VITE_API_MODE=live`).

```bash
# Server & Port Configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=production
VITE_API_MODE=live

# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:password@db.railway.app:5432/monologg?sslmode=require"

# Authentication & JWT Security
JWT_SECRET="your-256-bit-jwt-secret-key"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Supabase Auth Bridge (Google OAuth & Avatars)
SUPABASE_URL="https://xyz.supabase.co"
SUPABASE_ANON_KEY="eyJhbG..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbG..."

# Paystack Escrow & Payments
PAYSTACK_SECRET_KEY="sk_live_..."
PAYSTACK_WEBHOOK_SECRET="your-hmac-sha512-webhook-secret"

# Google Calendar & Meet Integration
GOOGLE_CLIENT_ID="12345-abc.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-secret"
GOOGLE_REDIRECT_URI="https://api.monologg.com/api/v1/calendar/google/callback"

# Notifications (SendGrid & Twilio)
SENDGRID_API_KEY="SG.your-key"
SENDGRID_FROM_EMAIL="notifications@monologg.com"
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="your-token"
TWILIO_FROM_NUMBER="+1234567890"

# Redis Cache & Background Queue
REDIS_URL="redis://default:password@redis.railway.app:6379"

# S3 Media Storage
STORAGE_PROVIDER="s3"
S3_BUCKET_NAME="monologg-media-production"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
```

---

## Summary & Future Roadmap

Every tool and integration in Monologg has been deliberately chosen and built with modular interfaces (`Provider` pattern). This means if business needs change in the future (for example, switching from SendGrid to Postmark for email, or adding Stripe alongside Paystack), **only the provider file needs to be updated**—the rest of the application code remains 100% untouched.

For technical instructions on how features were built step-by-step, refer to:
- [`implementation-plan.md`](file:///Users/oyeniyiadedoyin/Downloads/figj%20monol/monologg/handoff/implementation-plan.md) — Living task status board
- [`design.md`](file:///Users/oyeniyiadedoyin/Downloads/figj%20monol/monologg/handoff/design.md) — Architectural reference & PRD status
- [`features.md`](file:///Users/oyeniyiadedoyin/Downloads/figj%20monol/monologg/handoff/features.md) — The 18-phase backend build specification
- [`log.md`](file:///Users/oyeniyiadedoyin/Downloads/figj%20monol/monologg/handoff/log.md) — File-by-file session execution log
