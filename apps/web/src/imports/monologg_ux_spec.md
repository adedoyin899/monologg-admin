# Monologg — UX Architecture Specification
## Version 1.0 | Beta Launch (v1.4.0 PRD Alignment)
### Prepared for: Lead UI/UX Designer & Product Design Team

---

> **Document Purpose:** This is the complete UX specification for Monologg — a brief-to-booking pipeline for performing arts and the creator economy. Every screen, flow, state, and word of microcopy is defined here. This document is annotation-ready for Figma and handoff-ready for developers.

---

## TABLE OF CONTENTS

1. [Product & Audience Summary](#1-product--audience-summary)
2. [Information Architecture (IA)](#2-information-architecture)
3. [Navigation Structure](#3-navigation-structure)
4. [User Flows](#4-user-flows)
5. [Screen-by-Screen Breakdown](#5-screen-by-screen-breakdown)
6. [Microcopy Master Table](#6-microcopy-master-table)
7. [Error States](#7-error-states)
8. [Empty States](#8-empty-states)
9. [Loading & Transition States](#9-loading--transition-states)
10. [Structural Recommendations](#10-structural-recommendations)

---

## 1. PRODUCT & AUDIENCE SUMMARY

| Attribute | Detail |
|---|---|
| **Product Name** | Monologg |
| **Product Type** | PWA (Progressive Web App) — Mobile-first; Desktop adaptive |
| **Industry** | Performing Arts / Creator Economy / Marketplace |
| **Core Problem** | Creators lose 20%+ income to intermediaries; clients waste weeks on static portfolio review with no instant scheduling or payment lock-in |
| **Solution** | Unified brief-to-booking pipeline: Verified talent profiles → AI analysis → Rate cards → Scheduling → Escrow payment → Order room |
| **Delivery Target** | Q3 2026 |

### Primary Users

| User Type | Who They Are | Tech Comfort | Core Goal |
|---|---|---|---|
| **Talent (Creator)** | Actors, Comedians, VO Artists, Comperes, Pastors, Musicians, Streamers | Mid–High | Build a bookable storefront, get discovered, receive payment |
| **Client (Employer)** | Casting leads, brand agencies, event coordinators, church admins | Mid | Find verified talent, post a brief, secure booking with payment |

### The Core 4 Talent Niches (Primary Launch)
1. Actors — monologue reels, film/TV audition bookings
2. Comedians — live sets, corporate bookings
3. Voice-Over Artists — voice demos, remote studio sessions
4. Comperes — hosting reels, live event emcee bookings

### Extended Creator Niches (Inclusive Architecture)
Pastors / Public Speakers, Musicians, Content Creators, Streamers

### UX Vocabulary Rule
- ❌ "Add Cast Role Title" → ✅ "Add Booking Service Title"
- ❌ "Upload Audition Tape" → ✅ "Upload Performance / Showcase Reel"
- All labels must be niche-agnostic unless the creator's specific niche is selected

---

## 2. INFORMATION ARCHITECTURE

### 2.1 Full Sitemap

```
MONOLOGG
│
├── PUBLIC MARKETING SITE (Web)
│   ├── WEB-01 / WEB-02  Landing Page — Waitlist State (Desktop + Mobile)
│   └── WEB-03           Landing Page — Live Portal State (Desktop)
│
├── AUTH LAYER
│   ├── PWA-01a  Welcome / Splash
│   ├── PWA-01b  Register (Creator or Client)
│   ├── PWA-01c  Sign In
│   └── PWA-01d  Forgot Password
│
├── CREATOR ONBOARDING (First-time, sequential)
│   ├── PWA-02   Niche Selection (Core 4 + Extended grid)
│   ├── PWA-03   Media Upload (Showcase Reel / Demo)
│   ├── PWA-04   Thespian AI Processing State
│   ├── PWA-05   AI Complete — Tags + Verified Badge
│   ├── PWA-06   Rate Card Creation
│   └── [→ PWA-07  Creator Storefront Profile — their own view]
│
├── CREATOR DASHBOARD (Ongoing)
│   ├── PWA-07   Creator Storefront Profile (public-facing preview)
│   ├── PWA-07D  Creator Storefront — Desktop Adaptive
│   ├── PWA-08   Scheduling Dashboard (availability calendar)
│   ├── PWA-13   Order Room (active bookings/chat)
│   └── SETTINGS
│       ├── SET-01  Profile & Bio Settings
│       ├── SET-02  Rate Card Management
│       ├── SET-03  Media Management (replace/add reels)
│       ├── SET-04  Payout Settings
│       └── SET-05  Notification Preferences
│
├── CLIENT FLOW
│   ├── PWA-09   Project Brief Creation
│   ├── PWA-10   Casting Directory Feed (talent discovery)
│   ├── PWA-10D  Casting Directory Feed — Desktop Adaptive
│   ├── PWA-11   Calendar Slot Selection / Checkout Sheet
│   ├── PWA-12   Paystack Payment Gateway / Escrow Deposit
│   └── PWA-13   Order Room (shared with creator, per booking)
│
├── SHARED / SYSTEM SCREENS
│   ├── SYS-01   Notification Centre
│   ├── SYS-02   Transaction History
│   ├── SYS-03   Help & Support
│   └── SYS-04   Terms / Privacy
│
└── DESIGN SYSTEM (Figma Page 1)
    └── SYS-TOKENS  Brand tokens, typography, icons, color variables
```

### 2.2 Screen Registry (PRD Code Mapping)

| PRD Code | Screen Name | User Type | Priority |
|---|---|---|---|
| WEB-01 | Landing — Waitlist (Desktop) | Public | P0 |
| WEB-02 | Landing — Waitlist (Mobile) | Public | P0 |
| WEB-03 | Landing — Live Portal (Desktop) | Public | P0 |
| PWA-01 | Welcome + Register + Sign In | Both | P0 |
| PWA-02 | Niche Selection Board | Creator | P0 |
| PWA-03 | Media Upload Panel | Creator | P0 |
| PWA-04 | Thespian AI Processing State | Creator | P0 |
| PWA-05 | AI Complete — Tags + Verified Badge | Creator | P0 |
| PWA-06 | Rate Card Creation Settings | Creator | P0 |
| PWA-07 | Public Storefront Profile (Mobile) | Creator / Client | P0 |
| PWA-07D | Public Storefront Profile (Desktop) | Creator / Client | P1 |
| PWA-08 | Scheduling Dashboard | Creator | P0 |
| PWA-09 | Client Project Brief Form | Client | P0 |
| PWA-10 | Casting Directory Feed (Mobile) | Client | P0 |
| PWA-10D | Casting Directory Feed (Desktop) | Client | P1 |
| PWA-11 | Calendar Slot / Checkout Sheet | Client | P0 |
| PWA-12 | Paystack Payment + Escrow Overlay | Client | P0 |
| PWA-13 | Order Room + Escrow Progress Bar | Both | P0 |
| SET-01–05 | Settings Screens | Both | P1 |
| SYS-01–04 | System Screens | Both | P2 |

---

## 3. NAVIGATION STRUCTURE

### 3.1 Recommendation: Bottom Navigation Bar (Mobile PWA)

**Why Bottom Nav over Top Nav or Sidebar:**
- Mobile-first PWA — thumb reach is critical; bottom nav is the industry standard for app-like experiences
- 4–5 destinations maximum keeps cognitive load low
- Matches user mental models from Instagram, TikTok, Fiverr apps that creators already use

### 3.2 Creator Bottom Nav (Post-Onboarding)

| Tab | Icon | Screen |
|---|---|---|
| Home | House | Creator Dashboard / Storefront Preview |
| Bookings | Calendar | Order Rooms / Active Projects |
| Discover | Search | Casting Directory (see who's hiring) |
| Inbox | Bell | Notification Centre |
| Profile | Person | Settings + Profile Management |

### 3.3 Client Bottom Nav (Post-Registration)

| Tab | Icon | Screen |
|---|---|---|
| Home | House | Client Dashboard |
| Find Talent | Search | Casting Directory Feed |
| Projects | Briefcase | Posted Briefs + Active Orders |
| Inbox | Bell | Notification Centre |
| Account | Person | Settings |

### 3.4 Desktop Top Navigation (Portal / Landing)

```
[MONOLOGG logo]    [Find Talent]  [Post a Project]  [How it Works]    [Sign In] [Launch Your Storefront →]
```

### 3.5 Onboarding Navigation
- No bottom nav during onboarding (linear flow)
- Progress indicator at top: stepped dots or percentage bar
- Back chevron top-left only; no skip unless explicitly noted

---

## 4. USER FLOWS

### 4.1 Flow A — Creator Onboarding & Storefront Launch

```
[App Open]
    │
    ▼
[PWA-01a: Welcome/Splash]
    │
    ├─── "Create Account" ──▶ [PWA-01b: Registration Form]
    │                              │
    │                         Fill name, email, password
    │                              │
    │                    ┌─────────┴──────────┐
    │                    │                    │
    │              [Email exists]      [Email valid]
    │                    │                    │
    │              Error toast         OTP sent to email
    │                    │                    │
    │              [Stay on form]      [OTP Verify screen]
    │                                         │
    │                                  ┌──────┴──────┐
    │                                  │             │
    │                           [OTP correct]  [OTP wrong]
    │                                  │             │
    │                           [PWA-02: Niche]   Retry (×3)
    │                                             Then → Support
    │
    └─── "Sign In" ──▶ [PWA-01c: Sign In]
                            │
                       ┌────┴────┐
                       │         │
                  [Valid]    [Invalid]
                       │         │
                  ┌────┤    Error message
                  │    │
           [New user?] │
            → Redirect  │
            to Register  ▼
                    [Check user type]
                         │
               ┌─────────┴─────────┐
               │                   │
          [Creator]            [Client]
          (if incomplete          ↓
           onboarding)      [Client Dashboard]
               │
    ┌──────────▼───────────┐
    │                      │
[New → PWA-02]    [Returning → PWA-07 Dashboard]

──── CREATOR ONBOARDING (Linear) ────

[PWA-02: Niche Selection]
    │
    Select 1 primary niche (required)
    + optional secondary (can skip)
    │
    ▼
[PWA-03: Media Upload]
    │
    ├── Drag/drop or file browser
    ├── Video (.mp4/.mov) or Audio (.mp3/.wav) based on niche
    ├── Max 150MB
    │
    ┌──────┴──────────┐
    │                 │
[Valid file]    [Invalid/oversized]
    │                 │
    ▼            Error inline, re-upload
[PWA-04: Thespian AI Processing]
    │
    Skeleton loader + animated pulse
    AI analysis runs in background (15–45s)
    │
    ┌──────┴──────────┐
    │                 │
[AI success]    [AI timeout/error]
    │                 │
    ▼            Skip option shown + manual tags
[PWA-05: Tags + Verified Badge]
    │
    Review auto-tags, edit if needed
    Confirm → "Looks great"
    │
    ▼
[PWA-06: Rate Card Creation]
    │
    Add at least 1 service (required to proceed)
    ├── Service Title
    ├── Base Price
    └── Delivery Timeline
    │
    [Add another?] ──▶ repeats card form
    │
    "Preview My Storefront" ──▶
    │
    ▼
[PWA-07: Public Storefront Preview]
    │
    "Go Live / Publish" ──▶
    │
    ▼
[PWA-08: Scheduling Setup prompt]
    │
    [Set availability] or [Skip for now]
    │
    ▼
[Creator Dashboard / Home]
```

---

### 4.2 Flow B — Client: Post a Brief & Book Talent

```
[Client registered + signed in]
    │
    ▼
[Client Dashboard]
    │
    ├── "Post a Project" ──▶
    │
    ▼
[PWA-09: Project Brief Form]
    │
    Fill: Project Name, Type, Niche filter, Script upload, Budget
    │
    "Find Matching Talent" ──▶
    │
    ▼
[PWA-10: Casting Directory Feed]
    │
    Browse talent cards
    Filter by: Niche, Vibe Tags, Price, Location
    │
    Tap a talent card ──▶
    │
    ▼
[PWA-07: Creator Storefront Profile]
    │
    Review: Bio, tags, reels, rate cards, availability
    │
    "Book This Creator" ──▶
    │
    ▼
[PWA-11: Calendar Slot Selection]
    │
    View open time slots
    Select date + time ──▶
    │
    ▼
[PWA-11b: Booking Confirmation Sheet]
    Rate card selected + time slot confirmed
    Shows: Base rate + 12% escrow fee
    │
    "Proceed to Payment" ──▶
    │
    ▼
[PWA-12: Paystack Payment + Escrow]
    │
    ┌─────┴──────────┐
    │                │
[Payment OK]   [Payment failed]
    │                │
    ▼           Error + retry options
[Order Room PWA-13 created]
    │
    Both parties notified
    Escrow bar: [Locked] → [Deliverables] → [Released]
    │
    ▼
[PWA-13: Order Room]
    │
    ├── Chat / file share
    ├── Voice message playback
    ├── System milestone notifications
    │
    [Creator delivers] ──▶ Client reviews ──▶
    │
    ┌─────┴──────────┐
    │                │
[Approve]       [Dispute]
    │                │
Payment released  Support escalation
    │
    ✓ Booking complete
    Talent receives base rate – 9% engine fee
```

---

### 4.3 Flow C — Settings & Profile Management

```
[Any screen: tap Profile tab]
    │
    ▼
[Settings Home]
    │
    ├── Edit Profile & Bio ──▶ [SET-01]
    │       Update name, bio, location, social links
    │       Save ──▶ Success toast
    │
    ├── Manage Rate Cards ──▶ [SET-02]
    │       Add / Edit / Delete services
    │       Toggle card visibility (active/inactive)
    │
    ├── Media Management ──▶ [SET-03]
    │       Replace primary reel
    │       Add secondary clips
    │       (Re-triggers Thespian AI if primary reel replaced)
    │
    ├── Payout Settings ──▶ [SET-04]
    │       Add/update bank account or mobile money
    │
    └── Notifications ──▶ [SET-05]
            Toggle: New bookings, Messages, Payment updates
```

---

### 4.4 Flow D — Error Recovery

```
Network lost mid-flow:
    │
    ▼
[Offline toast appears at bottom]
"No connection. We'll save your progress."
    │
    ▼
[When connection restores]
Auto-resume OR "Continue where you left off" banner

──────────────────────────────────────

Session expired:
    │
    ▼
[Overlay modal: "Your session has ended"]
"For your security, we signed you out."
[Sign In Again] button
    │
    ▼
Redirect to PWA-01c, form pre-filled with email

──────────────────────────────────────

Payment failure during checkout:
    │
    ▼
[Inline error on PWA-12]
Booking slot is held for 10 minutes
"Retry Payment" / "Change payment method"
    │
    If slot expires → [Slot released, return to PWA-11]
```

---

## 5. SCREEN-BY-SCREEN BREAKDOWN

---

### WEB-01 / WEB-02 — Landing Page (Waitlist State)

| Attribute | Detail |
|---|---|
| **Purpose** | Build pre-launch waitlist; communicate value proposition |
| **Viewport** | WEB-01: Desktop 1440px / WEB-02: Mobile 375px |
| **State** | Waitlist Mode Active |

**Key UI Elements:**
- Hero headline + subheadline
- Email capture widget (inline input + CTA button)
- Post-submission state: inline queue position display
  → "You are #347 in the Verification Queue. Share your link to climb the roster."
- Shareable referral link (auto-generated)
- Feature highlight section (3 value pillars)
- Social proof / category previews (Actor, VO, Comedian, Compere tiles)
- Footer: terms, privacy, contact

**Primary Action:** Submit email to join waitlist
**Secondary Actions:** Share referral link, scroll to learn more
**Navigation:** Marketing top nav only (no app bottom nav)

---

### WEB-03 — Landing Page (Live Portal State)

| Attribute | Detail |
|---|---|
| **Purpose** | Convert public visitors into creators or clients |
| **Viewport** | Desktop 1440px |
| **State** | Post-launch, app live |

**Key UI Elements:**
- Same hero layout as WEB-01/02 (Evergreen layout)
- Email widget REPLACED by two CTAs:
  - Primary: "Post a Project / Find Talent" → routes to Directory
  - Secondary: "Launch Your Storefront" → routes to Creator Onboarding
- Directory preview / talent carousel (social proof)
- Feature sections unchanged

**Primary Action:** "Post a Project / Find Talent"
**Secondary Action:** "Launch Your Storefront"

---

### PWA-01 — Welcome, Register & Sign In

| Attribute | Detail |
|---|---|
| **Purpose** | Authenticate users; branch to Creator or Client journey |
| **Viewport** | Mobile 375px |

**Welcome / Splash (PWA-01a):**
- Monologg wordmark centred
- Tagline
- "Create Account" (primary btn) + "Sign In" (secondary link)
- "Continue as Client" (tertiary text link)

**Register (PWA-01b):**
- Full Name input
- Email input
- Password input (with show/hide toggle)
- "I am: Talent / Client" toggle (two-option pill selector) — visible immediately
- Terms consent checkbox + link
- "Create Account" CTA
- "Already have an account? Sign In" link

**Sign In (PWA-01c):**
- Email input
- Password input
- "Sign In" CTA
- "Forgot password?" link
- "Create Account" link

**Primary Action:** "Create Account" / "Sign In"
**Secondary Actions:** Forgot password, switch between Register/Sign In

---

### PWA-02 — Niche Selection Board

| Attribute | Detail |
|---|---|
| **Purpose** | Personalize the creator's entire profile, upload UI, and field labels based on their primary craft |
| **Viewport** | Mobile 375px |

**Key UI Elements:**
- Progress indicator (Step 1 of 4)
- Heading + subheading
- Visual grid of niche cards (2-column, icon + label):
  - Row 1: Actor | Voice-Over Artist
  - Row 2: Comedian | Compere
  - Row 3: Speaker / Pastor | Musician
  - Row 4: Content Creator | Streamer
- Selected card: highlighted border state + checkmark
- "Primary niche" is required (only 1)
- Optional: "Also add a secondary niche?" toggle below grid
- "Continue" CTA (disabled until selection made)

**Primary Action:** Select niche → "Continue"
**Secondary Action:** Add secondary niche
**Navigation:** Back chevron (top left) → PWA-01b

---

### PWA-03 — Media Upload Panel

| Attribute | Detail |
|---|---|
| **Purpose** | Capture the creator's primary showcase reel or audio demo for Thespian AI analysis |
| **Viewport** | Mobile 375px |

**Key UI Elements:**
- Progress indicator (Step 2 of 4)
- Upload container: dashed-border drag zone with upload icon
- Accepted formats shown dynamically by niche:
  - VO Artists: "MP3, WAV, M4A — up to 150MB"
  - All others: "MP4, MOV, AVI — up to 150MB"
- File browser button
- Once file selected: file name, file size, thumbnail/waveform preview
- Remove/replace file option
- "Upload & Analyse" CTA

**Primary Action:** Upload file → "Upload & Analyse"
**Secondary Actions:** Remove file, browse alternative
**Navigation:** Back → PWA-02

---

### PWA-04 — Thespian AI Processing State

| Attribute | Detail |
|---|---|
| **Purpose** | Communicate active background AI analysis with reassurance; prevent abandonment |
| **Viewport** | Mobile 375px |

**Key UI Elements:**
- Full-screen focused state (no nav distractions)
- Animated logo / AI processing indicator (pulsing skeleton or branded wave animation)
- Primary microcopy: "Thespian AI is reviewing your performance parameters for quasi-KYC registration..."
- Sub-text: estimated time "This usually takes 15–45 seconds."
- Progress shimmer animation on media file thumbnail
- No "skip" shown initially; if >60s elapsed → show "Taking longer than expected — skip for now?" text link

**Primary Action:** Wait (passive screen)
**Navigation:** No back button during active processing

---

### PWA-05 — AI Complete: Tags + Verified Badge

| Attribute | Detail |
|---|---|
| **Purpose** | Show creator their AI-generated profile attributes; confirm verification; build confidence before storefront creation |
| **Viewport** | Mobile 375px |

**Key UI Elements:**
- Verified badge (prominent, branded — e.g. shield or checkmark icon in accent colour)
- "Thespian AI Verified" label beneath badge
- Auto-generated vibe tags displayed as pill chips:
  - Example set: "Warm Texture · Conversational Vibe · Expressive · High Energy"
- Edit tags section: small "Edit tags" link to add/remove chips (free text + suggested)
- Profile thumbnail from uploaded media
- "Looks great, continue →" CTA (primary)
- "Redo my upload" link (secondary)

**Primary Action:** "Looks great, continue →" → PWA-06
**Secondary Action:** Edit tags; redo upload → PWA-03

---

### PWA-06 — Rate Card Creation

| Attribute | Detail |
|---|---|
| **Purpose** | Enable creators to set up purchasable services with pricing; these become the core transactional units of their storefront |
| **Viewport** | Mobile 375px |

**Key UI Elements:**
- Progress indicator (Step 3 of 4)
- Instructional sub-heading
- Rate card form (first card open by default):
  - "Booking Service Title" text input
  - "Base Price" numeric input with currency selector (prefix symbol)
  - "Delivery Timeline" dropdown (Same day / 24 hours / 2–3 days / 1 week / Custom)
  - "Description" text area (optional, char counter)
- "+ Add another service" button (adds new collapsible card form below)
- Preview of card (right-aligned or below as live card mockup)
- "Preview My Storefront" CTA (requires ≥1 complete card)

**Primary Action:** "Preview My Storefront"
**Secondary Action:** Add another service, edit/delete existing cards

---

### PWA-07 — Public Storefront Profile (Mobile)

| Attribute | Detail |
|---|---|
| **Purpose** | The creator's live, public-facing booking page — their link-in-bio destination |
| **Viewport** | Mobile 375px |

**Key UI Elements:**
- Profile photo / avatar (circular, large)
- Creator name + primary niche label
- Verified badge inline
- AI vibe tags as pill row
- Short bio text
- Primary reel player (inline video or audio player)
- Rate cards stacked vertically (Stan-style):
  - Each card: Service Title | Base Price | Delivery | "Book Now" button
- Availability indicator: "Available for bookings" / "Currently booked" status
- Share / copy link icon (top right)
- Creator's view: "Edit Profile" button visible; Client's view: hidden

**Primary Action (Client):** "Book Now" on a rate card
**Primary Action (Creator):** "Edit Profile"
**Secondary Actions:** Share profile, view full reel, scroll to next card

---

### PWA-07D — Public Storefront Profile (Desktop)

| Attribute | Detail |
|---|---|
| **Purpose** | Desktop-adaptive version of storefront with side-by-side layout |
| **Viewport** | Desktop 1440px |

**Layout change from mobile:**
- Left column (40%): Profile photo, bio, tags, availability, share
- Right column (60%): Reel player (larger), rate cards in 2-column grid
- Booking drawer opens on right side instead of bottom sheet

---

### PWA-08 — Scheduling Dashboard

| Attribute | Detail |
|---|---|
| **Purpose** | Creators define their bookable hours by day and time; this drives what clients see in PWA-11 |
| **Viewport** | Mobile 375px |

**Key UI Elements:**
- Week view calendar (Mon–Sun row)
- Tap a day to expand time slot selector (drawer from bottom)
- Time slot selector: hour blocks (8AM–10PM), tap to toggle active/inactive
- Visual indicator: active slots shown in accent colour
- Sync status badge: "Synced with Google Calendar" / "Manual mode"
- "Save Availability" CTA
- "Sync External Calendar" link (optional integration)
- Weekly hours summary below calendar

**Primary Action:** "Save Availability"
**Secondary Action:** Sync calendar

---

### PWA-09 — Client Project Brief Form

| Attribute | Detail |
|---|---|
| **Purpose** | Clients define what they need; this scopes the directory results they see |
| **Viewport** | Mobile 375px |

**Key UI Elements:**
- Form header
- Project Name input
- Project Type dropdown (Film / Commercial / Event / Podcast / Corporate / Other)
- Niche Requirements multi-select pills (mirrors creator categories)
- Script / Asset file upload area (PDF, DOC, MP4 accepted; max 25MB)
- Budget scale slider ($50 – $10,000+) with manual input fallback
- Location preference toggle: "Remote" / "In-person" / "Both"
- "Find Matching Talent" CTA

**Primary Action:** "Find Matching Talent"
**Secondary Actions:** Save draft, attach file, adjust budget

---

### PWA-10 — Casting Directory Feed (Mobile)

| Attribute | Detail |
|---|---|
| **Purpose** | Talent discovery interface; clients browse and filter verified creators |
| **Viewport** | Mobile 375px |

**Key UI Elements:**
- Search field (top, sticky)
- Filter pill row (horizontally scrollable):
  - Niche: Actor | VO | Comedian | Compere | Pastor | Musician | Streamer
  - Vibe: Warm | Dramatic | High Energy | Conversational
  - Price: Under $100 | $100–$500 | $500+
  - Location: Near me | Remote | Global
- Active filter count badge on "Filter" icon button
- Talent card grid (1-column list on mobile):
  - Profile photo + name
  - Primary niche + verified badge
  - 2–3 vibe tags
  - Starting price
  - Availability dot (green = available)
  - "View Profile" CTA
- "Sort by" option (Relevance / Price: low–high / Most Booked)
- Infinite scroll / load more

**Primary Action:** Tap a talent card → PWA-07
**Secondary Actions:** Adjust filters, sort results

---

### PWA-10D — Casting Directory Feed (Desktop)

| Attribute | Detail |
|---|---|
| **Purpose** | Desktop-adaptive directory with richer grid |
| **Viewport** | Desktop 1440px |

**Layout change:**
- Sidebar filter panel (left 25%) — persistent, not horizontal pills
- Talent card grid: 3-column card layout
- Hover state on card: quick preview of reel + "Book Now" CTA

---

### PWA-11 — Calendar Slot Selection / Checkout Sheet

| Attribute | Detail |
|---|---|
| **Purpose** | Client selects specific booking date/time from creator's available slots; begins checkout flow |
| **Viewport** | Mobile 375px |

**Key UI Elements:**
- Creator mini-profile header (photo, name, service selected)
- Monthly calendar view with available dates highlighted
- Tap date → time slots expand in bottom drawer
- Selected slot confirmation chip
- Booking summary:
  - Service title
  - Date + time
  - Base price
  - + 12% escrow processing fee (itemised)
  - **Total**
- "Proceed to Payment" CTA

**Primary Action:** "Proceed to Payment"
**Secondary Actions:** Change date, change service, go back

---

### PWA-12 — Paystack Payment Gateway & Escrow Overlay

| Attribute | Detail |
|---|---|
| **Purpose** | Secure payment completion; funds go into escrow (not directly to creator) |
| **Viewport** | Mobile 375px (overlay/drawer) |

**Key UI Elements:**
- Drawer header: "Secure Escrow Payment"
- Paystack branding / trust mark
- Escrow explanation: "Your payment is held securely until delivery is confirmed."
- Payment options tabs: Card | Bank Transfer
- Card input fields: Card number, Name on card, Expiry, CVV
- Bank routing option (for Paystack-supported banks)
- Order summary sidebar (collapsed on mobile; expandable):
  - Base rate: $XXX
  - Escrow processing fee (12%): $XX
  - Total: $XXX
- Security badges row (SSL, Paystack, escrow icon)
- "Pay & Lock Escrow" CTA

**Primary Action:** "Pay & Lock Escrow"
**Secondary Actions:** Change payment method, expand order summary, cancel

---

### PWA-13 — Order Room + Escrow Progress Bar

| Attribute | Detail |
|---|---|
| **Purpose** | Unified workspace for creator + client to communicate and track project milestones; the escrow bar anchors the transaction lifecycle |
| **Viewport** | Mobile 375px |

**Key UI Elements:**
- Sticky top: Escrow milestone progress bar
  - Step 1: 🔒 Escrow Locked (filled)
  - Step 2: 📦 Deliverables Provided (filled when creator marks complete)
  - Step 3: ✅ Payment Released (filled when client approves)
- Booking summary collapse bar (tap to expand: creator, service, date, amounts)
- Chat interface:
  - Message bubbles (sent right, received left)
  - Voice message player (waveform + play/pause/timer)
  - Document attachment tiles (file name + download icon)
  - System notification messages (grey, centred):
    "Escrow locked by [Client Name] — 14 Jun 2026"
    "Deliverables marked as provided by [Creator Name] — 16 Jun 2026"
- Message input bar (bottom sticky):
  - Text field
  - Attach file icon
  - Voice record icon
  - Send button
- Creator action: "Mark as Delivered" CTA (appears when ready)
- Client action: "Approve Delivery & Release Payment" CTA (appears after creator marks delivered)
- "Raise a Dispute" text link (subtle, at bottom)

**Primary Action (Creator):** "Mark as Delivered"
**Primary Action (Client):** "Approve Delivery & Release Payment"
**Secondary Actions:** Send message, attach file, record voice note, raise dispute

---

## 6. MICROCOPY MASTER TABLE

### WEB-01 / WEB-02 — Landing Page (Waitlist)

| Element | Copy |
|---|---|
| **Page Title** | Monologg — Book World-Class Talent, Directly |
| **Hero Headline** | Your next booking is 3 clicks away. |
| **Hero Subheadline** | The world's first brief-to-booking pipeline for performing arts and the creator economy. No agents. No waiting. No guesswork. |
| **CTA (Waitlist)** | Join the Verification Queue |
| **Input Placeholder** | Enter your email address |
| **Post-Submit Headline** | You're in. |
| **Post-Submit Body** | You are #347 in the Verification Queue. Share your personal link to climb the roster and unlock early access. |
| **Share CTA** | Copy my place link |
| **Feature 1 Label** | Verified Talent |
| **Feature 1 Body** | Every creator on Monologg passes Thespian AI — our automated performance verification engine. |
| **Feature 2 Label** | 3-Click Booking |
| **Feature 2 Body** | Browse profiles, pick a slot, pay into escrow. Done. |
| **Feature 3 Label** | Secure Escrow Payments |
| **Feature 3 Body** | Funds are held safely until the job is done. No risk for either party. |

---

### WEB-03 — Landing Page (Live Portal)

| Element | Copy |
|---|---|
| **Primary CTA** | Post a Project / Find Talent |
| **Secondary CTA** | Launch Your Storefront |
| **CTA Sub-label (Primary)** | Browse verified creators ready to book |
| **CTA Sub-label (Secondary)** | Get booked without the agent |

---

### PWA-01 — Welcome / Register / Sign In

| Screen | Element | Copy |
|---|---|---|
| **Splash** | Tagline | The booking engine for serious creatives. |
| **Splash** | Primary CTA | Create Account |
| **Splash** | Secondary Link | Sign In |
| **Register** | Screen Title | Create your account |
| **Register** | Subheading | Join thousands of verified talents and clients. |
| **Register** | Full Name label | Full Name |
| **Register** | Full Name placeholder | e.g. Adaeze Okafor |
| **Register** | Email label | Email Address |
| **Register** | Email placeholder | you@example.com |
| **Register** | Password label | Password |
| **Register** | Password helper | Minimum 8 characters, include a number |
| **Register** | Role toggle label | I am joining as… |
| **Register** | Role option 1 | Talent / Creator |
| **Register** | Role option 2 | Client / Employer |
| **Register** | Terms copy | By creating an account you agree to our Terms of Service and Privacy Policy. |
| **Register** | Primary CTA | Create Account |
| **Register** | Sign in prompt | Already have an account? Sign In |
| **Sign In** | Screen Title | Welcome back. |
| **Sign In** | Email label | Email Address |
| **Sign In** | Password label | Password |
| **Sign In** | Primary CTA | Sign In |
| **Sign In** | Forgot link | Forgot your password? |
| **Sign In** | Register prompt | New here? Create your account |

---

### PWA-02 — Niche Selection

| Element | Copy |
|---|---|
| **Screen Title** | What best describes your craft? |
| **Subheading** | Pick your primary focus. This shapes your profile, your media requirements, and how clients find you. |
| **Progress label** | Step 1 of 4 |
| **Grid label — Actor** | Actor |
| **Grid label — VO** | Voice-Over Artist |
| **Grid label — Comedian** | Comedian |
| **Grid label — Compere** | Compere / Host |
| **Grid label — Speaker** | Speaker / Pastor |
| **Grid label — Musician** | Musician |
| **Grid label — Creator** | Content Creator |
| **Grid label — Streamer** | Streamer |
| **Secondary niche toggle** | Also add a secondary category (optional) |
| **Primary CTA** | Continue |
| **Disabled CTA tooltip** | Select a category to continue |

---

### PWA-03 — Media Upload

| Element | Copy |
|---|---|
| **Screen Title** | Upload your showcase reel |
| **Subheading (video niche)** | Drop your best performance clip. This is what clients see first. |
| **Subheading (VO niche)** | Upload your voice demo. This is the first thing clients will hear. |
| **Drop zone label** | Drag and drop here, or tap to browse |
| **Accepted formats (video)** | MP4, MOV, AVI — up to 150MB |
| **Accepted formats (audio)** | MP3, WAV, M4A — up to 150MB |
| **File selected label** | Ready to analyse |
| **Progress label** | Step 2 of 4 |
| **Primary CTA** | Upload & Analyse |
| **Remove link** | Remove file |
| **Helper text** | Your reel is processed securely. It won't be shared without your approval. |

---

### PWA-04 — Thespian AI Processing

| Element | Copy |
|---|---|
| **Primary Copy** | Thespian AI is reviewing your performance parameters for quasi-KYC registration… |
| **Supporting copy** | This usually takes 15–45 seconds. Stay with us. |
| **Extended wait (>60s)** | Taking longer than expected — skip for now? |
| **Skip link** | Skip — I'll complete verification later |

---

### PWA-05 — AI Complete

| Element | Copy |
|---|---|
| **Badge label** | Thespian AI Verified |
| **Success headline** | Your verification is confirmed. |
| **Supporting copy** | Here's how Thespian AI reads your performance style. You can refine these tags anytime. |
| **Tags section label** | Your performance profile |
| **Edit tags link** | Edit tags |
| **Primary CTA** | Looks great, continue |
| **Redo link** | Re-upload my reel |

---

### PWA-06 — Rate Card Creation

| Element | Copy |
|---|---|
| **Screen Title** | Set your booking rates |
| **Subheading** | Define the services clients can book directly from your storefront. Be specific — it converts better. |
| **Progress label** | Step 3 of 4 |
| **Service Title label** | Booking Service Title |
| **Service Title placeholder** | e.g. 60-Second Commercial VO, 30-Min MC Set, Full Feature Monologue |
| **Base Price label** | Base Price |
| **Base Price placeholder** | 0.00 |
| **Delivery Timeline label** | Typical Delivery |
| **Description label** | Short description (optional) |
| **Description placeholder** | What's included? What should clients expect? |
| **Add card CTA** | + Add another service |
| **Primary CTA** | Preview My Storefront |
| **Disabled CTA tooltip** | Add at least one complete service to continue |

---

### PWA-07 — Storefront Profile

| Element | Copy |
|---|---|
| **Availability — active** | ✅ Available for bookings |
| **Availability — busy** | 🔴 Currently fully booked |
| **Verified badge** | Thespian Verified |
| **Rate card CTA** | Book Now |
| **Rate card starting label** | Starting from |
| **Rate card delivery label** | Delivery: |
| **Share button tooltip** | Copy booking link |
| **Creator edit CTA** | Edit Profile |
| **Reel section label** | Showcase Reel |

---

### PWA-08 — Scheduling Dashboard

| Element | Copy |
|---|---|
| **Screen Title** | Set your availability |
| **Subheading** | Tell clients when you're open to bookings. You can update this anytime. |
| **Day toggle label** | Tap a day to set your hours |
| **No slots set** | Not available |
| **Slots active** | {X} time slots active |
| **Sync status — synced** | Synced with Google Calendar |
| **Sync status — manual** | Manual mode |
| **Sync CTA** | Connect your calendar |
| **Save CTA** | Save Availability |
| **Success toast** | Availability saved |

---

### PWA-09 — Client Brief Form

| Element | Copy |
|---|---|
| **Screen Title** | What do you need? |
| **Subheading** | Tell us about your project. We'll surface the best-matched verified talents. |
| **Project Name label** | Project Name |
| **Project Name placeholder** | e.g. Brand Campaign, Annual Gala Host, Podcast Intro VO |
| **Project Type label** | Project Type |
| **Niche Requirements label** | Talent Category Needed |
| **Script Upload label** | Attach Script or Brief (optional) |
| **Script Upload helper** | PDF, DOC, MP4 — max 25MB |
| **Budget label** | Budget Range |
| **Budget helper** | This is shared with talent to filter responses |
| **Location label** | Engagement Type |
| **Location option 1** | Remote |
| **Location option 2** | In-Person |
| **Location option 3** | Either |
| **Primary CTA** | Find Matching Talent |
| **Save draft link** | Save as draft |

---

### PWA-10 — Casting Directory

| Element | Copy |
|---|---|
| **Screen Title** | Find Your Talent |
| **Search placeholder** | Search by name, niche, or keyword… |
| **Filter label** | Filter |
| **Active filter badge** | {X} active |
| **Sort label** | Sort by |
| **Sort options** | Best Match · Price: Low to High · Most Booked |
| **Talent card — available** | ✅ Available |
| **Talent card — busy** | Fully Booked |
| **Talent card CTA** | View Profile |
| **Results count** | {X} verified creators found |
| **No results** | No creators match your current filters. |

---

### PWA-11 — Calendar Checkout Sheet

| Element | Copy |
|---|---|
| **Screen Title** | Select your booking slot |
| **Subheading** | Pick a date and time that works for your project. |
| **Available date label** | Available |
| **Unavailable date label** | Unavailable |
| **No slots on date** | No slots available on this date. |
| **Booking summary label** | Booking Summary |
| **Fee breakdown — base** | Service fee |
| **Fee breakdown — escrow** | Escrow processing (12%) |
| **Fee total label** | Total charged today |
| **Escrow note** | Your payment is held securely in escrow until delivery is confirmed. |
| **Primary CTA** | Proceed to Payment |

---

### PWA-12 — Paystack Payment

| Element | Copy |
|---|---|
| **Drawer Title** | Secure Escrow Payment |
| **Security label** | Protected by Paystack Escrow |
| **Escrow note** | Your funds are held safely until you confirm delivery. You won't be charged until you tap Pay. |
| **Card tab** | Pay by Card |
| **Bank tab** | Pay by Bank Transfer |
| **Card number label** | Card Number |
| **Card number placeholder** | 0000 0000 0000 0000 |
| **Name on card label** | Name on Card |
| **Expiry label** | Expiry |
| **CVV label** | CVV |
| **CVV helper** | 3 digits on back of card |
| **Primary CTA** | Pay & Lock Escrow |
| **Security badges alt text** | SSL Secured · Paystack Escrow · PCI Compliant |
| **Processing state** | Securing your escrow… |

---

### PWA-13 — Order Room

| Element | Copy |
|---|---|
| **Progress Step 1** | 🔒 Escrow Locked |
| **Progress Step 2** | 📦 Deliverables Provided |
| **Progress Step 3** | ✅ Payment Released |
| **System message — locked** | Escrow secured by {Client Name} — {date} |
| **System message — delivered** | {Creator Name} has marked this project as delivered — {date} |
| **System message — released** | Payment of ${amount} has been released to {Creator Name} — {date} |
| **Creator CTA** | Mark as Delivered |
| **Client CTA** | Approve & Release Payment |
| **Dispute link** | Raise a dispute |
| **Message placeholder** | Type a message… |
| **Voice record tooltip** | Hold to record |
| **Attach tooltip** | Attach file |

---

## 7. ERROR STATES

### Form Validation Errors

| Screen | Error Scenario | Headline | Body Copy | Recovery CTA |
|---|---|---|---|---|
| PWA-01b | Email already registered | This email is taken. | An account with this email already exists. Want to sign in instead? | Sign In |
| PWA-01b | Invalid email format | Check your email. | That doesn't look like a valid email address. | (inline, no CTA needed) |
| PWA-01b | Password too short | Password is too short. | Use at least 8 characters, including one number. | (inline) |
| PWA-01c | Wrong credentials | Couldn't sign you in. | Your email or password doesn't match our records. Please try again. | Try Again |
| PWA-01c | Account not found | No account found. | We couldn't find an account with that email. Have you registered yet? | Create Account |
| PWA-06 | Missing service title | Name this service. | Every rate card needs a service title before you can save it. | (inline) |
| PWA-06 | Price is zero | Set a price. | Add a base price for this service. You can offer free services by setting $0 with a note. | (inline) |
| PWA-09 | Brief submitted without name | Name your project. | Add a project name so matching talent know what you need. | (inline) |
| PWA-12 | Card number invalid | Check your card number. | That doesn't look right. Double-check the 16-digit number on your card. | (inline) |
| PWA-12 | Expired card | This card has expired. | The expiry date on this card has passed. Use a different card. | Use Different Card |
| PWA-12 | CVV mismatch | Security code incorrect. | The CVV you entered doesn't match this card. It's usually 3 digits on the back. | (inline) |

---

### Network / Connection Errors

| Screen | Error Scenario | Headline | Body Copy | Recovery CTA |
|---|---|---|---|---|
| Any | No internet connection | You're offline. | Check your connection. We've saved your progress and will resume automatically. | Retry |
| PWA-03 | Upload fails mid-transfer | Upload interrupted. | Your reel didn't fully transfer. Check your connection and try again. | Retry Upload |
| PWA-04 | AI analysis times out (>90s) | Analysis is taking longer than expected. | Thespian AI is under heavy load. You can skip now and complete verification later from your profile. | Skip for Now / Retry |
| PWA-12 | Payment gateway unreachable | Payment couldn't connect. | Our payment gateway is temporarily unavailable. Your booking slot is held for 10 minutes. | Retry Payment |
| PWA-13 | Message failed to send | Message not sent. | Your message didn't go through. Check your connection and try again. | Tap to Retry |

---

### Permission / Session Errors

| Screen | Error Scenario | Headline | Body Copy | Recovery CTA |
|---|---|---|---|---|
| Any | Session expired | Your session ended. | For your security, we signed you out after a period of inactivity. | Sign Back In |
| PWA-10 | Unauthenticated user tries to book | Sign in to book. | You need a Monologg account to book a creator. It only takes a minute to set up. | Create Account / Sign In |
| PWA-08 | Calendar sync fails | Calendar couldn't connect. | We weren't able to sync with your calendar. Check your permissions and try again. | Try Again |
| PWA-07 | Profile not found (bad link) | This profile doesn't exist. | The storefront link you followed is no longer active or may have moved. | Browse All Talent |

---

### Payment Errors

| Screen | Error Scenario | Headline | Body Copy | Recovery CTA |
|---|---|---|---|---|
| PWA-12 | Insufficient funds | Payment declined. | Your card issuer declined this payment. This is usually a funds issue — try a different card or contact your bank. | Try Another Card |
| PWA-12 | Payment declined (generic) | Payment wasn't processed. | Something went wrong on the payment end. Your booking slot is held for 10 more minutes. | Retry Payment |
| PWA-12 | Slot expired during retry | This time slot is no longer available. | Your reserved slot expired while the payment was pending. Please select a new time. | Pick a New Slot |
| PWA-13 | Escrow release fails | Payment release failed. | We couldn't release payment right now. Our team has been notified and will resolve this within 24 hours. | Contact Support |

---

## 8. EMPTY STATES

### First-Time User Empty States

| Screen | Visual Description | Headline | Supporting Copy | CTA |
|---|---|---|---|---|
| **PWA-07 (creator, no rate cards)** | Illustration of a blank card with a plus icon | Your storefront is empty. | Add at least one booking service so clients can find and hire you. | Add a Service |
| **PWA-08 (no availability set)** | Illustration of a calendar with no highlighted dates | You haven't set any hours yet. | Clients can't book you until you open up some availability. This takes under 2 minutes. | Set My Hours |
| **PWA-13 (creator, no orders yet)** | Illustration of an empty inbox / letter | No bookings yet. | When a client books you, your order room will appear here. Keep your storefront sharp to attract your first booking. | Improve My Profile |
| **PWA-13 (client, no projects yet)** | Illustration of a blank briefcase | Nothing booked yet. | Post a project brief and we'll match you with verified talent instantly. | Post a Project |
| **SYS-01 (no notifications)** | Illustration of a quiet bell | All quiet here. | You'll see booking requests, messages, and payment updates here. | Explore Talent |

---

### Zero-Result Search / Filter States

| Screen | Filter Scenario | Headline | Supporting Copy | CTA |
|---|---|---|---|---|
| **PWA-10** | No talent matches all filters | No results found. | No verified creators match all your current filters. Try widening your search. | Clear All Filters |
| **PWA-10** | Filter combo too narrow | Too specific? | Only {X} creators match this combination. Try removing one filter to see more. | Remove a Filter |
| **PWA-10** | New niche with no talent yet | Coming soon. | We're actively verifying talent in this category. Be first to know when they're live. | Join Waitlist |
| **PWA-09** | No brief drafts | No saved briefs. | Any project brief you save as a draft will appear here. | Start a New Brief |

---

## 9. LOADING & TRANSITION STATES

| Screen | Loading State | Loading Copy | Post-Action Transition |
|---|---|---|---|
| **PWA-01b (register)** | Full-button spinner on CTA | "Creating your account…" | → Brief success state → PWA-02 |
| **PWA-03 (upload)** | Progress bar (0–100%) inside drop zone | "Uploading your reel… {X}%" | "Upload complete. Analysing now…" → PWA-04 |
| **PWA-04 (AI)** | Full-screen pulsing skeleton + shimmer wave | "Thespian AI is reviewing your performance parameters for quasi-KYC registration…" | Fade to PWA-05 with verified badge reveal animation |
| **PWA-10 (directory)** | Skeleton card list (3 ghost cards) | (no copy, skeleton only) | Cards fade in with stagger animation |
| **PWA-11 (calendar load)** | Calendar skeleton (grey date grid) | "Loading availability…" | Calendar tiles populate with colour |
| **PWA-12 (payment)** | Full overlay spinner | "Securing your escrow…" | Success: green checkmark + "Escrow locked. Your order room is ready." → PWA-13 |
| **PWA-13 (mark delivered)** | Button spinner | "Notifying client…" | System message appears in chat: "{Creator} has marked this as delivered" |
| **PWA-13 (release payment)** | Button spinner | "Releasing payment…" | System message: "Payment released to {Creator}." Progress bar fills to Step 3. |
| **Settings save** | Inline spinner on Save button | "Saving…" | Toast (bottom): "Changes saved" |
| **Any network retry** | Retry button spinner | "Trying again…" | Either success state or new error state |

---

## 10. STRUCTURAL RECOMMENDATIONS

### 10.1 Navigation Pattern

**Recommendation: Bottom tab bar (mobile) + Top nav (desktop/marketing site)**

Justification: This is a mobile-first PWA targeting creators who live on their phones. Bottom navigation matches the mental models of the apps they already use daily (Instagram, WhatsApp, Fiverr). The 5-tab structure gives access to all key areas with one thumb tap. On desktop, a top nav is the standard expectation for a marketing/portal page and does not conflict.

---

### 10.2 Screens at Risk of Drop-Off

| Screen | Risk | Recommendation |
|---|---|---|
| **PWA-04 (Thespian AI)** | High — any delay over 30s causes anxiety and abandonment | Add real-time microcopy that changes every 10s; show skip at 60s; never show a raw spinner with no copy |
| **PWA-06 (Rate Cards)** | Medium — creators freeze on pricing decisions | Provide price range suggestions based on niche ("Actors in your region typically charge $80–$250 per session") |
| **PWA-12 (Payment)** | High — payment screens lose trust if they feel generic | Paystack branding, SSL badge, escrow explanation all must be above the fold; do not hide behind scroll |
| **PWA-02 (Niche Grid)** | Low-medium — "Extended Creator" users may not see themselves | Ensure Streamer, Pastor, Content Creator tiles are visible without scrolling on 375px viewport |

---

### 10.3 Flows That Could Be Simplified or Merged

| Current | Issue | Recommendation |
|---|---|---|
| PWA-01a (Splash) → PWA-01b (Register) | Unnecessary hop if user intent is already clear | On direct link entry (e.g. "Launch Your Storefront" from WEB-03), skip splash and land directly on Register pre-set to "Talent" |
| PWA-11 (Calendar) is a separate screen from PWA-07 (Storefront) | Context shift between "viewing" and "booking" | Open calendar as a bottom sheet overlay on PWA-07 rather than full navigation; reduces back-stack depth |
| PWA-04 → PWA-05 feel like two separate screens for one event | Could cause a "loading then landing" jolt | Transition them as one continuous screen using animation: AI processing at top, results reveal at bottom when complete |

---

### 10.4 Progressive Disclosure Opportunities

| Screen | What to Disclose Progressively |
|---|---|
| **PWA-06 (Rate Cards)** | Show only one card form by default; reveal "+ Add another service" only after first card is complete |
| **PWA-09 (Brief Form)** | Show script upload and location preference only after Project Type is selected |
| **PWA-11 (Calendar)** | Show time slots only after a date is tapped; do not pre-expand all days |
| **PWA-12 (Payment)** | Show bank transfer option only after card tab is selected (avoid overwhelming with both forms at once) |
| **PWA-13 (Order Room)** | Collapse booking summary by default; expand on tap |
| **Settings screens** | Group advanced settings (payout, integrations) under a "More" disclosure toggle; surface name/bio/rate cards first |

---

### 10.5 Accessibility Considerations

| Screen | Consideration |
|---|---|
| **PWA-02 (Niche Grid)** | Each grid tile must have an accessible label, not just an icon. Focus state must be clearly visible. |
| **PWA-03 (Media Upload)** | Drag-and-drop must have a keyboard-accessible fallback (file browser button always visible) |
| **PWA-04 (AI Processing)** | Animated pulse must respect `prefers-reduced-motion`; provide text-only loading state as fallback |
| **PWA-07 (Storefront)** | Video reel player must support captions. Audio players must have a visible play/pause state accessible via keyboard. |
| **PWA-12 (Payment)** | All payment input fields must have explicit `<label>` associations; CVV field must explain what it is (not just a tooltip) |
| **PWA-13 (Order Room)** | Voice messages must show a duration indicator and be keyboard-playable. System messages should use `aria-live` regions. |
| **PWA-10 (Directory)** | Filter pills must be keyboard-navigable and show clear focus rings. Active filter count must be announced to screen readers. |
| **All CTAs** | Minimum tap target 44×44px. Disabled states must not rely on colour alone — use opacity + cursor change. |
| **Colour contrast** | All body text must meet WCAG AA (4.5:1). Verified badge and escrow progress bar colours must not convey state by colour alone (add icons/labels). |
| **Error states** | All inline errors must be associated to their input field via `aria-describedby`. Never place error copy below a fold. |

---

### 10.6 Onboarding Efficiency Target

The entire Creator onboarding flow (PWA-01 → PWA-07 live storefront) should be completable in under 5 minutes on a standard mobile connection, assuming:
- File upload: <150MB at 10Mbps ≈ 2 minutes max
- Thespian AI: 15–45 seconds
- Rate card creation: 1–2 minutes

Design implication: every field in the onboarding sequence should be essential. Nothing optional should be required. Optional fields (bio, secondary niche, description) should be clearly marked and skippable.

---

*End of Monologg UX Architecture Specification v1.0*
*All screen codes align with PRD v1.4.0 Artboard Scoping Table*
*This document should be used as the primary annotation reference for Figma and developer handoff*
