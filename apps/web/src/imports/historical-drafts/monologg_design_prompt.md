# Monologg — Design System & Build Prompt
## Detailed Design Brief for AI-Assisted UI Build
### Feed this document into your design-to-code tool (e.g. Google Antigravity, v0, Lovable, Figma AI)

---

> **How to use this document:**
> This is a structured, opinionated design prompt. Feed it whole into a design-to-code tool, or section-by-section per screen. Every decision below is deliberate — do not substitute defaults. Where Antigravity naming conventions are specified, use them exactly.

---

## PART 1: BRAND IDENTITY & DESIGN TOKENS

### 1.1 Brand Direction

Monologg must feel like the intersection of a **premium talent agency** and a **modern fintech app**. Think: the confidence of an IMDbPro profile, the transactional clarity of Stripe, and the warmth of a professional creator platform. The visual language should say "your career belongs here" to a Lagos-based comedian and a Hollywood casting director simultaneously.

**Aesthetic Direction:** Cinematic dark-mode primary with high-contrast cream and gold accents. Not a generic "dark app" — this dark feels like the moment before the curtain rises. Warm, intentional, earned.

**Typography Direction:** A strong display serif for headlines (authority, craft) paired with a clean geometric sans for UI (clarity, modernity). The pairing should feel like a film title card meets a well-designed contract.

**Signature Element:** The Thespian AI Verified badge — a custom-drawn spotlight/shield mark in animated gold on a dark background. Every time it appears it should feel like a moment of recognition. This is the emotional centrepiece of the creator's identity on the platform.

---

### 1.2 Color Tokens

```
/* ── PRIMARY BACKGROUNDS ── */
--color-bg-canvas:        #0D0D0F    /* Near-black canvas — main app background */
--color-bg-surface:       #161618    /* Card surfaces, drawers, modals */
--color-bg-elevated:      #1E1E22    /* Elevated states — active cards, input backgrounds */
--color-bg-overlay:       rgba(13,13,15,0.92)  /* Full-screen overlays */

/* ── BRAND ACCENT — GOLD ── */
--color-gold-primary:     #C9A84C    /* Primary accent — CTAs, highlights, active states */
--color-gold-light:       #E2C47A    /* Hover state, light text on dark backgrounds */
--color-gold-muted:       #7A6230    /* Disabled/muted accent, decorative borders */
--color-gold-glow:        rgba(201,168,76,0.15) /* Subtle ambient glow for verified states */

/* ── TEXT HIERARCHY ── */
--color-text-primary:     #F0EDE4    /* Warm off-white — primary body text */
--color-text-secondary:   #9E9B93    /* Supporting text, labels, captions */
--color-text-tertiary:    #5C5A55    /* Placeholders, disabled text */
--color-text-inverse:     #0D0D0F    /* Dark text on gold/light backgrounds */

/* ── SEMANTIC STATES ── */
--color-success:          #3ECF8E    /* Escrow locked / verified / available */
--color-warning:          #F5A623    /* Caution states, processing, pending */
--color-error:            #FF4D4F    /* Destructive errors, payment failures */
--color-info:             #4A9EFF    /* Informational banners, tips */

/* ── BORDERS & DIVIDERS ── */
--color-border-default:   #2A2A2E    /* Subtle card borders */
--color-border-active:    #C9A84C    /* Active / focused element borders */
--color-border-error:     #FF4D4F    /* Error state field borders */

/* ── VERIFIED / ESCROW SPECIAL ── */
--color-verified-bg:      rgba(62,207,142,0.10)
--color-escrow-locked:    #3ECF8E
--color-escrow-progress:  #C9A84C
--color-escrow-released:  #4A9EFF
```

---

### 1.3 Typography Tokens

```
/* ── DISPLAY FACE — Headlines, Screen Titles ── */
--font-display:           'DM Serif Display', Georgia, serif
/* Use for: Hero headlines, screen titles, creator name on storefront */
/* Weights: 400 (Regular) only — this face is used large, weight comes from size */

/* ── BODY FACE — UI, Labels, Body Copy ── */
--font-body:              'Inter', system-ui, sans-serif
/* Use for: All UI labels, body text, form inputs, navigation */
/* Weights: 400 (Regular), 500 (Medium), 600 (SemiBold) */

/* ── MONO — Prices, Codes, Technical Values ── */
--font-mono:              'JetBrains Mono', 'Courier New', monospace
/* Use for: Prices, OTP fields, file sizes, card numbers */
/* Weight: 400 only */

/* ── TYPE SCALE ── */
--text-display-xl:   font-size: 40px; line-height: 1.1; letter-spacing: -0.02em; font-family: var(--font-display);
--text-display-lg:   font-size: 32px; line-height: 1.15; letter-spacing: -0.015em; font-family: var(--font-display);
--text-display-md:   font-size: 24px; line-height: 1.2; letter-spacing: -0.01em; font-family: var(--font-display);
--text-heading-lg:   font-size: 20px; line-height: 1.3; font-weight: 600; font-family: var(--font-body);
--text-heading-md:   font-size: 17px; line-height: 1.35; font-weight: 600; font-family: var(--font-body);
--text-heading-sm:   font-size: 15px; line-height: 1.4; font-weight: 600; font-family: var(--font-body);
--text-body-lg:      font-size: 16px; line-height: 1.5; font-weight: 400; font-family: var(--font-body);
--text-body-md:      font-size: 14px; line-height: 1.5; font-weight: 400; font-family: var(--font-body);
--text-body-sm:      font-size: 13px; line-height: 1.45; font-weight: 400; font-family: var(--font-body);
--text-label:        font-size: 12px; line-height: 1.4; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; font-family: var(--font-body);
--text-caption:      font-size: 11px; line-height: 1.4; font-weight: 400; font-family: var(--font-body);
--text-price:        font-size: 22px; line-height: 1.2; font-weight: 400; font-family: var(--font-mono);
```

---

### 1.4 Spacing & Layout Tokens

```
/* ── SPACING SCALE ── */
--space-1:   4px
--space-2:   8px
--space-3:   12px
--space-4:   16px
--space-5:   20px
--space-6:   24px
--space-8:   32px
--space-10:  40px
--space-12:  48px
--space-16:  64px

/* ── BORDER RADIUS ── */
--radius-sm:   4px    /* Pill chips, small badges */
--radius-md:   8px    /* Input fields, small cards */
--radius-lg:   12px   /* Main cards, rate card surfaces */
--radius-xl:   16px   /* Drawers, bottom sheets */
--radius-full:  9999px /* Pills, avatars, toggle switches */

/* ── SHADOWS ── */
--shadow-card:     0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
--shadow-drawer:   0 -4px 24px rgba(0,0,0,0.6);
--shadow-elevated: 0 4px 16px rgba(0,0,0,0.5);
--shadow-gold:     0 0 20px rgba(201,168,76,0.25);  /* Used on verified badge */

/* ── VIEWPORT BREAKPOINTS ── */
--bp-mobile:  375px    /* Primary PWA design target */
--bp-tablet:  768px    /* Intermediate */
--bp-desktop: 1440px   /* Marketing site + desktop adaptive views */

/* ── LAYOUT GRID (Mobile) ── */
Column count: 4 columns
Gutter: 16px
Margin: 20px (left/right)
Max content width: 335px on 375px viewport

/* ── LAYOUT GRID (Desktop) ── */
Column count: 12 columns
Gutter: 24px
Margin: 80px (left/right)
Max content width: 1280px
```

---

### 1.5 Motion & Animation Tokens

```
/* ── DURATION ── */
--duration-fast:    150ms   /* Micro-interactions: button press, toggle */
--duration-normal:  250ms   /* Most transitions: drawer open, card expand */
--duration-slow:    400ms   /* Screen transitions, page-level animations */
--duration-ai:      1800ms  /* Thespian AI shimmer loop */

/* ── EASING ── */
--ease-out:         cubic-bezier(0.0, 0.0, 0.2, 1)    /* Elements entering */
--ease-in:          cubic-bezier(0.4, 0.0, 1, 1)      /* Elements leaving */
--ease-spring:      cubic-bezier(0.34, 1.56, 0.64, 1) /* Bouncy confirms, badge reveal */
--ease-standard:    cubic-bezier(0.4, 0.0, 0.2, 1)    /* Default */

/* ── REDUCED MOTION ── */
@media (prefers-reduced-motion: reduce) {
  /* Replace all animations with instant opacity/visibility toggles */
  /* The pulsing skeleton on PWA-04 must still show; remove pulse, keep shimmer static */
}
```

---

## PART 2: COMPONENT LIBRARY (Design System Atoms)

### 2.1 Buttons

**Naming (Antigravity-ready):**

```
btn-primary         Background: --color-gold-primary | Text: --color-text-inverse
                    Height: 52px | Border-radius: --radius-md | Font: --text-heading-sm
                    Hover: --color-gold-light | Active: scale(0.98) | Disabled: opacity 0.35

btn-secondary       Background: --color-bg-elevated | Text: --color-text-primary
                    Border: 1px solid --color-border-default
                    Hover: border-color: --color-border-active

btn-ghost           Background: transparent | Text: --color-gold-primary
                    Underline on hover

btn-destructive     Background: --color-error at 10% | Text: --color-error
                    Border: 1px solid --color-error

btn-disabled        Any button in disabled state: opacity 0.35, cursor: not-allowed
                    DO NOT rely on colour change alone — add disabled attribute

btn-outline-hover   Secondary button in hover state (for Antigravity state naming)

btn-icon            44×44px minimum. Icon centred. Same variant naming as above.
```

---

### 2.2 Input Fields

```
input-default       Background: --color-bg-elevated
                    Border: 1px solid --color-border-default
                    Border-radius: --radius-md
                    Height: 52px | Padding: 0 16px
                    Font: --text-body-lg | Color: --color-text-primary
                    Placeholder color: --color-text-tertiary

input-focused       Border-color: --color-border-active
                    Box-shadow: 0 0 0 3px var(--color-gold-glow)

input-error         Border-color: --color-border-error
                    Add error icon (right side) + error text below in --color-error

input-disabled      Background: --color-bg-surface | opacity: 0.5

textarea-default    Same as input-default | min-height: 100px | padding: 12px 16px | resize: vertical

input-price         Prefix "$" in --color-text-secondary | font-family: --font-mono
```

---

### 2.3 Cards

```
card-creator-storefront
    Background: --color-bg-surface
    Border: 1px solid --color-border-default
    Border-radius: --radius-lg
    Padding: 16px
    Shadow: --shadow-card
    Contents: [Avatar 48px circle] [Name --text-heading-md] [Niche tag] [Vibe pills] [Price] [btn-primary "View Profile"]

card-rate-card
    Background: --color-bg-elevated
    Border: 1px solid --color-border-default (left-border-accent: 3px solid --color-gold-primary)
    Border-radius: --radius-lg
    Padding: 20px
    Contents: [Service Title --text-heading-md] [Price --text-price] [Delivery --text-body-sm in --color-text-secondary] [btn-primary "Book Now"]
    Active/hover: border-color: --color-border-active, shadow: --shadow-gold

card-niche-select
    Background: --color-bg-elevated
    Border: 1px solid --color-border-default
    Border-radius: --radius-lg
    Padding: 20px 16px
    Contents: [Icon 32px in --color-gold-muted] [Label --text-heading-sm]
    Selected state: border: 2px solid --color-gold-primary | background: var(--color-gold-glow) | checkmark icon (top-right)

card-paystack-payment
    Background: --color-bg-surface
    Border: 1px solid --color-border-default
    Border-radius: --radius-xl (bottom sheet)
    Shadow: --shadow-drawer
    Contains all payment form elements
```

---

### 2.4 Badges & Tags

```
badge-thespian-verified
    Background: --color-verified-bg
    Border: 1px solid --color-success
    Border-radius: --radius-full
    Padding: 4px 10px
    Contents: [Spotlight/shield SVG icon 14px in --color-success] [Text "Thespian Verified" --text-label in --color-success]
    On storefront: larger display variant — 18px icon, text-body-sm

badge-processing
    Background: rgba(245,166,35,0.1)
    Border: 1px solid --color-warning
    Animated: shimmer sweep left-to-right on background
    Contents: [Spinner 14px --color-warning] ["Verifying..." --text-label in --color-warning]

badge-available
    Dot (8px circle --color-success) + "Available" --text-body-sm
    
badge-busy
    Dot (8px circle --color-error) + "Fully Booked" --text-body-sm

tag-vibe-chip
    Background: --color-bg-elevated
    Border: 1px solid --color-border-default
    Border-radius: --radius-full
    Padding: 4px 12px
    Font: --text-body-sm
    Color: --color-text-secondary

tag-filter-active
    Background: --color-gold-primary
    Color: --color-text-inverse
    Same shape as tag-vibe-chip
```

---

### 2.5 Progress & Timeline Components

```
progress-onboarding-dots
    Container: horizontal row, centred
    Active dot: 8px circle --color-gold-primary
    Inactive dot: 6px circle --color-border-default
    Spacing: --space-2 between dots
    Animate active → next: cross-fade

progress-escrow-bar (PWA-13 top-anchored)
    Full-width sticky container
    Background: --color-bg-surface
    Border-bottom: 1px solid --color-border-default
    Padding: 12px 20px

    Three steps, connected by line:
    Step container: [Icon circle 32px] [Label --text-label below]
    
    Locked (Step 1):
        Icon: 🔒 on --color-success background
        Label: "Escrow Locked"
        Connector line to Step 2: filled --color-success
    
    Deliverables (Step 2):
        Inactive: grey circle | Active: 📦 on --color-gold-primary
        Label: "Deliverables Provided"
        Connector line: grey → fills --color-gold-primary when active
    
    Released (Step 3):
        Inactive: grey circle | Active: ✅ on --color-escrow-released
        Label: "Payment Released"
    
    Connector lines: 2px height, flex-grow between steps
    
    Animate step activation: icon scales 1.0 → 1.2 → 1.0 (spring easing)
    Connector fills with a left-to-right sweep animation (500ms --ease-out)
```

---

### 2.6 Upload Component

```
upload-dropzone
    Container:
        Background: --color-bg-elevated
        Border: 2px dashed --color-border-default
        Border-radius: --radius-lg
        Min-height: 180px
        Display: flex, column, centred
    
    Idle state:
        Icon: upload SVG 40px in --color-text-tertiary
        Primary text: "Drag and drop here, or tap to browse" --text-body-md --color-text-secondary
        Secondary text: format/size info --text-body-sm --color-text-tertiary
    
    Drag-over state:
        Border-color: --color-border-active
        Background: --color-gold-glow
        Icon colour: --color-gold-primary
    
    File-selected state:
        Replace drag zone contents with:
        [Thumbnail/waveform preview 80px] [File name --text-body-md] [File size --text-caption --color-text-secondary] ["Remove" btn-ghost small]
        Border: 1px solid --color-success
        Background: --color-verified-bg
    
    Error state (wrong format / too large):
        Border: 1px solid --color-border-error
        Error message inline below zone
```

---

### 2.7 Chat / Order Room Components

```
bubble-sent
    Background: --color-gold-primary (10% opacity) with --color-gold-muted border
    Alignment: right
    Border-radius: 16px 16px 4px 16px
    Max-width: 75% of container
    Padding: 10px 14px
    Font: --text-body-md --color-text-primary

bubble-received
    Background: --color-bg-elevated
    Border: 1px solid --color-border-default
    Alignment: left
    Border-radius: 16px 16px 16px 4px
    Same dimensions as bubble-sent

bubble-system
    No background
    Alignment: centred
    Font: --text-body-sm --color-text-tertiary
    Margin: 8px auto
    Text in italics

voice-player
    Background: --color-bg-elevated
    Border: 1px solid --color-border-default
    Border-radius: --radius-md
    Padding: 10px 14px
    Contents: [Play/Pause icon] [Waveform SVG visualization] [Duration --text-mono]
    Play icon color: --color-gold-primary

attachment-tile
    Background: --color-bg-elevated
    Border: 1px solid --color-border-default
    Border-radius: --radius-md
    Padding: 12px
    Contents: [File-type icon] [File name --text-body-sm] [File size --text-caption] [Download icon]

input-compose-bar
    Background: --color-bg-surface
    Border-top: 1px solid --color-border-default
    Padding: 12px 16px
    Contents: [text input flex-grow] [attach icon btn-icon] [voice-record icon btn-icon] [send btn-icon --color-gold-primary]
    Sticky bottom: true
```

---

### 2.8 Bottom Sheet / Drawer

```
drawer-base
    Position: fixed, bottom 0, width 100%
    Background: --color-bg-surface
    Border-radius: --radius-xl --radius-xl 0 0
    Shadow: --shadow-drawer
    Padding-top: 12px (for drag handle)
    
    Drag handle:
        Width: 40px, height: 4px
        Background: --color-border-default
        Border-radius: --radius-full
        Margin: 0 auto 16px

    Animate: translateY(100%) → translateY(0) | duration: --duration-normal | ease: --ease-out

Overlay (behind drawer):
    Background: --color-bg-overlay
    Animate: opacity 0 → 1 | duration: --duration-normal
    Tap to dismiss where appropriate
```

---

### 2.9 Navigation Bar

```
nav-bottom
    Position: fixed, bottom 0
    Background: --color-bg-surface
    Border-top: 1px solid --color-border-default
    Height: 64px (+ safe-area-inset-bottom)
    Display: flex, row, space-around, centred

    nav-item (default):
        Icon: 24px, color: --color-text-tertiary
        Label: --text-caption, color: --color-text-tertiary
        Min width: 48px

    nav-item (active):
        Icon color: --color-gold-primary
        Label color: --color-gold-primary
        Active indicator: 3px wide pill above icon (--color-gold-primary)

nav-top (desktop/marketing):
    Background: --color-bg-canvas (with backdrop-filter: blur(12px) on scroll)
    Border-bottom: 1px solid --color-border-default (appears on scroll)
    Height: 64px
    Logo: left, 140px wide
    Links: centred, --text-body-md --color-text-secondary | hover: --color-text-primary
    CTAs: right-aligned, btn-ghost + btn-primary
```

---

## PART 3: SCREEN-BY-SCREEN BUILD SPECIFICATIONS

> All screens use dark mode as default. Mobile-first (375px). Auto-layout mandatory. Antigravity-compatible naming used throughout.

---

### SCREEN: WEB-01 / WEB-02 — Landing Page (Waitlist State)

```
LAYOUT: Single-column, full-viewport hero. Sections stack vertically.

── SECTION: nav-top ──
[Monologg wordmark — DM Serif Display 22px] .... [Sign In — btn-ghost]

── SECTION: hero ──
Background: radial-gradient from --color-gold-glow (centre-top) over --color-bg-canvas
Padding: 80px 20px (mobile: 48px 20px)

[Eyebrow label: "Now in Verification Queue" — --text-label --color-gold-primary]
[H1: "Your next booking is 3 clicks away." — --text-display-xl --font-display]
[Subheadline: body copy — --text-body-lg --color-text-secondary, max-width: 540px]

[Waitlist Widget — card surface]
  Input: input-default placeholder "Enter your email address"
  CTA: btn-primary full-width "Join the Verification Queue"
  
[Post-submit state — replaces widget, animate with fade+slide-up]
  Headline: "You're in." — --text-display-md --font-display --color-gold-primary
  Body: "You are #347 in the Verification Queue."
  Sub: "Share your link to climb the roster."
  [Referral link chip: pill background --color-bg-elevated, monospace URL, copy icon]
  CTA: btn-secondary "Copy my place link"

── SECTION: value-props (3-column grid, mobile: 1 column) ──
3 feature cards (card-feature, matching card-creator-storefront style)
Each: [Gold icon 32px] [Title --text-heading-md] [Body --text-body-md --color-text-secondary]

── SECTION: niche-preview-grid ──
Label: "Built for every performing creative" — --text-label
2×4 grid of niche icons with labels (same as PWA-02 niche cards, smaller scale)

── FOOTER ──
Background: --color-bg-surface
[Copyright] [Terms] [Privacy] [Contact] — --text-body-sm --color-text-tertiary
```

---

### SCREEN: PWA-01 — Welcome / Register / Sign In

```
── PWA-01a: SPLASH ──
Background: --color-bg-canvas
Full-screen centred layout

[Monologg wordmark — DM Serif Display 36px, --color-text-primary, centred]
[Tagline — --text-body-lg --color-text-secondary, centred]

Spacer: 40px

[btn-primary full-width: "Create Account"]
Space: 16px
[btn-secondary full-width: "Sign In"]
Space: 24px
[Text link centred: "Continue as Client" --text-body-sm --color-gold-primary]

Logo/wordmark animation on load: fade in from 0 opacity + translateY(12px) → 0 over 400ms

── PWA-01b: REGISTER ──
Layout: scrollable, padding 20px
Header: Back chevron (top-left) | "Create your account" --text-display-md | Subheading below

[Progress dots: Step 0 of 4 — or omit if treated as pre-flow]

Form fields (all input-default, 16px gap between):
1. Full Name (input-default)
2. Email Address (input-default, type="email")
3. Password (input-default, type="password", show/hide toggle icon right)

[Role selector — pill toggle, full-width]
  Two options: "Talent / Creator" | "Client / Employer"
  Active: --color-gold-primary background, --color-text-inverse text
  Inactive: --color-bg-elevated background
  Border: 1px solid --color-border-default on container

[Terms checkbox + linked text — --text-body-sm --color-text-secondary]

[btn-primary full-width: "Create Account" — margin-top: 24px]
[Text link centred: "Already have an account? Sign In" — --text-body-sm --color-gold-primary]

── PWA-01c: SIGN IN ──
Same layout as register, simplified:
[Email input] [Password input with show/hide] [btn-primary "Sign In"]
[Forgot password? — right-aligned text link --text-body-sm]
[Divider] [Create Account link]
```

---

### SCREEN: PWA-02 — Niche Selection

```
Layout: padding 20px, progress indicator top, content below

[Progress: --progress-onboarding-dots — 4 dots, dot 1 active]
[Back chevron — top-left]

[Title: "What best describes your craft?" — --text-display-md --font-display]
[Subtitle: supporting copy — --text-body-md --color-text-secondary, margin-top: 8px]

[Niche Grid — 2-column, 12px gap]
8 tiles total (card-niche-select):
Row 1: [Actor] [Voice-Over Artist]
Row 2: [Comedian] [Compere / Host]
Row 3: [Speaker / Pastor] [Musician]
Row 4: [Content Creator] [Streamer]

Each tile: 160px (or 50% - 6px) wide | auto height, min 88px
Icon: custom SVG per niche, 32px, centered | Label below: --text-heading-sm
Selected state: 2px --color-gold-primary border + checkmark SVG (top-right corner 16px)

[Divider: 1px --color-border-default, margin: 16px 0]
[Secondary niche toggle: "Add a secondary category (optional)"]
  → Expands same grid below on tap, with "Secondary" label above

[Sticky bottom: btn-primary full-width "Continue" — disabled until selection made]
  Padding bottom: 16px + safe-area-inset-bottom
```

---

### SCREEN: PWA-03 — Media Upload Panel

```
Layout: padding 20px, progress indicator top

[Progress: dot 2 active]
[Back chevron]

[Title: "Upload your showcase reel" — --text-display-md]
[Dynamic subtitle based on niche — --text-body-md --color-text-secondary]

[upload-dropzone — full width, 200px min-height]
(see component spec above)

[Format guidance — below zone, --text-caption --color-text-tertiary centred]

[Selected file state — replaces zone contents as per component spec]

[Helper text: "Your reel is processed securely..." — --text-body-sm --color-text-tertiary, centred, margin-top: 12px]

[Sticky bottom: btn-primary full-width "Upload & Analyse" — disabled until file selected]
```

---

### SCREEN: PWA-04 — Thespian AI Processing

```
Layout: full-screen, no scrolling, no navigation

Background: --color-bg-canvas with very subtle animated gold particle system
(or: a simple radial pulse emanating from centre — 1 animated ring, do not overdo)

Centred content (vertical flex, middle of screen):

[Monologg wordmark small — 20px, top of content block]

[AI Processing Illustration]
  Circular frame 120px diameter
  Background: subtle gradient from --color-bg-elevated to --color-bg-surface
  Border: 2px solid --color-gold-muted, pulsing to --color-gold-primary (1.8s loop)
  Inside: custom "M" logomark or waveform animation
  
[Skeleton shimmer bar below illustration — 200px wide, 4px tall, --color-bg-elevated with shimmer]

[Primary copy: "Thespian AI is reviewing your performance parameters for quasi-KYC registration…"
  — --text-body-lg --color-text-secondary, centred, max-width: 280px]

[Timer copy: "This usually takes 15–45 seconds. Stay with us."
  — --text-body-sm --color-text-tertiary, centred, margin-top: 8px]

[After 60s: fade in text link "Taking longer than expected — skip for now?"
  — --text-body-sm --color-gold-primary, centred, margin-top: 24px]
  [Below: "Skip — I'll complete verification later" — btn-ghost]

NO back button during processing. No bottom nav. Full focus state.
```

---

### SCREEN: PWA-05 — AI Complete: Tags + Verified Badge

```
Layout: padding 20px, scroll if content overflows, progress dot 3 active

[Back chevron — optional, leads back to re-upload warning modal]

[Verified Badge — SIGNATURE ELEMENT]
  Container: centred, margin-bottom: 24px
  Circle background: --color-verified-bg, 80px diameter
  Icon: custom spotlight/shield SVG, 40px, --color-success
  Animation on enter: scale(0) → scale(1.1) → scale(1.0) with spring easing, 500ms
  Gold ring pulse: 0 0 0 8px rgba(62,207,142,0.0) → 0 0 0 0px, then 0 0 0 20px... (once only)

[Label below badge: "Thespian AI Verified" — badge-thespian-verified component, centred]

[Title: "Your verification is confirmed." — --text-display-md --font-display, centred]
[Subtitle — --text-body-md --color-text-secondary, centred]

[Section: "Your performance profile" — --text-label, margin-top: 24px]
[Tags row — wrapping flex, gap: 8px]
Auto-generated tags as tag-vibe-chip components, 3–5 chips
Example: "Warm Texture" · "Conversational" · "Expressive" · "High Energy"

["Edit tags" — btn-ghost small, below tag row]
  → Opens modal/drawer with editable chip list + text input to add custom tags

[Divider: 24px space]

[btn-primary full-width: "Looks great, continue"]
[btn-ghost centred below: "Re-upload my reel"]
```

---

### SCREEN: PWA-06 — Rate Card Creation

```
Layout: scrollable, padding 20px, progress dot 4 active

[Title: "Set your booking rates" — --text-display-md]
[Subtitle — --text-body-md --color-text-secondary]

[Rate card form block — repeatable]
  Container: card-rate-card style but in edit mode
  Background: --color-bg-elevated | Border-left: 3px solid --color-gold-primary
  Border-radius: --radius-lg | Padding: 16px

  [Service Title: input-default | Label: "Booking Service Title"]
  [Base Price: input-price | Currency prefix "$"]
  [Delivery Timeline: styled select | Options: Same Day / 24 Hours / 2–3 Days / 1 Week / Custom]
  [Description: textarea-default | Label: "Short description (optional)" | 120 char counter]
  
  [Bottom of card: "Remove this service" — btn-ghost small --color-error, right-aligned]

[Gap: 16px]
[Add more: btn-secondary full-width "+ Add another service"]

[Gap: 24px]

[Live preview section — collapsible, below form]
  Label: "Preview" — --text-label
  Shows card-rate-card component rendering in real time as user types
  Background: slightly different shade to show it's "preview mode"

[Sticky bottom: btn-primary full-width "Preview My Storefront"]
  Disabled if no complete card exists
```

---

### SCREEN: PWA-07 — Public Storefront Profile (Mobile)

```
Layout: scrollable single column

── HERO HEADER ──
Background: linear-gradient(180deg, --color-bg-elevated 0%, --color-bg-canvas 100%)
Padding: 24px 20px 20px

[Top row: "< Back" or share icon — right-aligned, btn-icon]
[Creator profile photo — circular 80px, bordered 2px --color-gold-primary]
[Name — --text-display-md --font-display, margin-top: 12px]
[Niche label — --text-body-md --color-text-secondary]
[badge-thespian-verified — inline below niche]
[Availability badge: badge-available or badge-busy]

── VIBE TAGS ──
Horizontal scroll row, padding: 0 20px
tag-vibe-chip components (not interactive on public view)

── BIO ──
Padding: 0 20px
[Bio text — --text-body-md --color-text-secondary]
[Show more / Collapse toggle if >3 lines]

── SHOWCASE REEL ──
Padding: 0 20px, section label: --text-label "Showcase Reel"
Video player: full-width, 16:9, --radius-lg, custom controls using brand colours
Audio player (VO artists): waveform player, full-width
Thumbnail: first frame (video) or waveform thumbnail (audio)

── RATE CARDS ──
Section label: "Book Me" — --text-label, padding: 0 20px
Vertically stacked card-rate-card components

Bottom of storefront:
[Share link: "Copy booking link" — btn-secondary full-width]

Creator-only overlay (when creator views own profile):
[Floating btn-primary bottom-right: "Edit Profile" — FAB style, 52px circle]
```

---

### SCREEN: PWA-08 — Scheduling Dashboard

```
Layout: scrollable, padding 20px

[Back chevron] [Title: "Set your availability" — --text-heading-lg]
[Subtitle — --text-body-md --color-text-secondary]

── CALENDAR WEEK VIEW ──
7-day horizontal row, full width, gap: 4px
Each day tile: flex-column, centred
  Day abbrev: "Mon" — --text-label
  Date: "14" — --text-heading-md
  Slot count indicator dot: green (slots set) | grey (no slots)
  Tap to expand

── TIME SLOT DRAWER (bottom sheet on day tap) ──
Drawer: drawer-base component
Header: "Available hours — [Day Name]"
Hour grid: 8AM–10PM
  Each hour block: 44px height, full width
  Inactive: --color-bg-elevated, --text-body-sm --color-text-tertiary
  Active (tapped): --color-gold-primary (10% bg) + gold border, --color-gold-primary text
  Toggle on tap

[Save hours for this day: btn-primary inside drawer]
[Remove all slots: btn-ghost --color-error, below save]

── SYNC SECTION ──
Divider + Section label: "Calendar Sync"
[Sync status badge] [btn-secondary: "Connect your calendar"]

── SAVE ──
[btn-primary full-width: "Save Availability"]
[Success toast: "Availability saved" — slides up from bottom, 2.5s duration]
```

---

### SCREEN: PWA-09 — Client Project Brief Form

```
Layout: scrollable, padding 20px

[Back chevron] [Title: "What do you need?" — --text-display-md]
[Subtitle — --text-body-md --color-text-secondary]

Form fields:
[Project Name: input-default]
[Project Type: styled select dropdown]
[Talent Category Needed: multi-select pill grid — same niche tiles as PWA-02 but compact, allow multiple]
[Attach Script/Brief: upload-dropzone variant — compact 100px height, document-only]
[Budget Range: range slider]
  Slider: custom styled, gold thumb, track fills left in --color-gold-primary
  Below: "[Min]  ←————→  [Max]" with manual input fields either side
[Engagement Type: radio button group, pill style — "Remote" / "In-Person" / "Either"]

[btn-primary full-width: "Find Matching Talent" — margin-top: 24px]
[btn-ghost centred: "Save as draft"]
```

---

### SCREEN: PWA-10 — Casting Directory Feed (Mobile)

```
Layout: sticky search+filter header, scrollable list below

── STICKY HEADER ──
Background: --color-bg-canvas (backdrop blur on scroll)
[Search bar: input-default style, search icon left, "Search by name, niche, or keyword…"]
[Filter row: horizontal scroll]
  [Filter icon btn + active count badge] [pill chips: "Actor" "VO" "Comedian" ...] [Sort icon btn]

── TALENT CARDS LIST ──
Padding: 0 20px
Gap: 12px between cards

card-creator-storefront (full-width on mobile):
  [Left: avatar 56px circle] [Right column: name, niche, vibe tags row, price "from $X", availability dot]
  Bottom: [btn-secondary full-width "View Profile"]
  
Skeleton loader (3 ghost cards during load):
  Same card shape, all content replaced with shimmer blocks

── LOAD MORE ──
[btn-ghost centred: "Load more talent"] or infinite scroll trigger
[Results count — --text-body-sm --color-text-tertiary, above first card]

── PWA-10D DESKTOP VARIANT ──
Left sidebar (25%): filter panel (non-scroll, all filters visible)
Right main (75%): 3-column card grid
Hover state: card lifts (--shadow-elevated) + "Book Now" CTA appears
```

---

### SCREEN: PWA-11 — Calendar Slot Selection

```
Layout: scrollable below sticky creator header

── CREATOR MINI-HEADER ──
Sticky, --color-bg-surface, border-bottom
[Avatar 40px] [Creator name --text-heading-sm] [Service selected — --text-body-sm --color-gold-primary]
[btn-ghost small: "Change service"]

── CALENDAR ──
Monthly view, full-width
Navigation: [< Prev Month] [Month Year -- --text-heading-md] [Next Month >]
Date grid: 7 columns
  Available date: --color-text-primary, tap target 44px
  Unavailable: --color-text-tertiary, strikethrough
  Selected: circle background --color-gold-primary, --color-text-inverse
  Today: underline or dot

── TIME SLOTS DRAWER (on date tap) ──
drawer-base
Header: "Available slots — [Selected Date]"
Time pills: 2-column grid
  Available slot: tag-vibe-chip style but larger, tappable
  Selected slot: tag-filter-active style
[Confirm slot: btn-primary "Confirm [Time]" inside drawer]

── BOOKING SUMMARY ──
card surface, padding 16px
[Line: Service name — --text-body-md]
[Line: Date + time — --text-body-md --color-gold-primary]
[Divider]
[Line: Base price — --text-body-md --- --text-price]
[Line: Escrow processing (12%) — --text-body-sm --color-text-secondary --- --text-price]
[Divider]
[Line: TOTAL — --text-heading-md bold --- --text-price --color-text-primary]
[Escrow note — --text-body-sm --color-text-tertiary, with shield icon]

[btn-primary full-width: "Proceed to Payment"]
```

---

### SCREEN: PWA-12 — Paystack Payment Gateway

```
Layout: drawer-base (bottom sheet) sliding up over PWA-11

── DRAWER HEADER ──
[Drag handle]
[Title: "Secure Escrow Payment" -- --text-heading-lg]
[Paystack trust mark: logo + "Protected by Paystack Escrow" -- --text-body-sm --color-text-secondary]

── ESCROW EXPLANATION CHIP ──
Background: --color-verified-bg | Border: 1px solid --color-success | Border-radius: --radius-md
[Shield icon --color-success] ["Your funds are held safely until delivery is confirmed." --text-body-sm]

── PAYMENT TABS ──
Tab switcher (pill style, full-width):
["Pay by Card"] ["Pay by Bank Transfer"]
Active tab: --color-gold-primary background, --color-text-inverse

── CARD FORM (default tab) ──
[Card number: input-default, card icon right, format as XXXX XXXX XXXX XXXX]
[Name on Card: input-default]
[Row: [Expiry MM/YY] [CVV with ? tooltip icon]]

── BANK TRANSFER (second tab) ──
[Bank selector dropdown]
[Account number input]
[Account name: auto-populated on valid account]

── SECURITY BADGES ROW ──
Centred, horizontal: [SSL padlock] [Paystack logo] [PCI badge]
--text-caption --color-text-tertiary below: "256-bit SSL encrypted · Paystack regulated"

── ORDER SUMMARY (collapsible) ──
[Expandable row: "Order Summary" -- total price shown collapsed]
Expanded: shows itemised breakdown from PWA-11

[btn-primary full-width: "Pay & Lock Escrow"]
Processing state: spinner + "Securing your escrow…" copy
```

---

### SCREEN: PWA-13 — Order Room + Escrow Progress Bar

```
Layout: three zones — sticky top bar, scrollable chat, sticky bottom compose

── TOP: ESCROW PROGRESS BAR ──
(See progress-escrow-bar component spec)
Below bar: collapsible booking summary chip
  [Creator name] [Service] [Booking date] [Amount] [Expand ↕]

── MIDDLE: CHAT AREA ──
Scrollable, padding 16px 20px
Full height between top bar and compose bar

Message types (auto-layout column, gap 8px):
  bubble-sent / bubble-received / bubble-system / voice-player / attachment-tile

Timestamps: --text-caption --color-text-tertiary, shown every 30 min or on tap

Read receipts: double tick icon, --color-gold-primary when seen

── BOTTOM: COMPOSE BAR ──
(See input-compose-bar component spec)

── CREATOR CTA (appears after escrow locked) ──
Floating above compose bar:
[btn-primary full-width: "Mark as Delivered"]
Background: --color-bg-surface, border-top: 1px solid --color-border-default
Padding: 12px 20px

── CLIENT CTA (appears after creator marks delivered) ──
Same position as creator CTA:
[btn-primary full-width: "Approve & Release Payment" — --color-success background]
[btn-ghost below: "Raise a dispute" — --color-error]
```

---

## PART 4: ANTIGRAVITY LAYER NAMING REFERENCE

> All layers in Figma must follow this naming convention exactly for Antigravity parsing.

### Buttons
```
btn-primary
btn-primary-disabled
btn-primary-loading
btn-secondary
btn-secondary-hover
btn-ghost
btn-ghost-hover
btn-destructive
btn-outline-hover
btn-icon-default
btn-icon-active
```

### Cards
```
card-creator-storefront
card-creator-storefront-hover
card-rate-card
card-rate-card-hover
card-rate-card-selected
card-niche-select
card-niche-select-selected
card-paystack-payment
card-feature
card-booking-summary
```

### Badges & Indicators
```
badge-thespian-verified
badge-thespian-verified-large
badge-processing
badge-available
badge-busy
badge-filter-active
badge-notification-count
tag-vibe-chip
tag-filter-chip
tag-filter-active
```

### Inputs
```
input-default
input-focused
input-error
input-disabled
input-price
input-search
textarea-default
textarea-focused
textarea-error
select-default
select-open
select-option-hover
select-option-selected
```

### Navigation
```
nav-bottom-default
nav-item-default
nav-item-active
nav-top-default
nav-top-scrolled
nav-tab-default
nav-tab-active
```

### Progress & Timeline
```
progress-dots-1of4
progress-dots-2of4
progress-dots-3of4
progress-dots-4of4
progress-escrow-step-inactive
progress-escrow-step-active
progress-escrow-step-complete
progress-escrow-connector-inactive
progress-escrow-connector-active
progress-upload-bar
```

### Layout Containers
```
drawer-base
drawer-header
overlay-default
overlay-payment
chat-container
chat-compose-bar
section-header
page-header
sticky-top
safe-area-bottom
```

### Media
```
upload-dropzone-idle
upload-dropzone-hover
upload-dropzone-selected
upload-dropzone-error
video-player-default
audio-player-default
thumbnail-card
```

### Chat / Order Room
```
bubble-sent
bubble-received
bubble-system
voice-player
attachment-tile
```

### Screens (top-level frames)
```
WEB-01-desktop-waitlist
WEB-02-mobile-waitlist
WEB-03-desktop-live
PWA-01a-splash
PWA-01b-register
PWA-01c-signin
PWA-02-niche-selection
PWA-03-media-upload
PWA-04-ai-processing
PWA-05-ai-complete
PWA-06-rate-cards
PWA-07-storefront-mobile
PWA-07D-storefront-desktop
PWA-08-scheduling
PWA-09-brief-form
PWA-10-directory-mobile
PWA-10D-directory-desktop
PWA-11-calendar-checkout
PWA-12-payment-gateway
PWA-13-order-room
```

---

## PART 5: INTERACTION STATES MATRIX

| Component | Default | Hover | Active/Pressed | Focused | Disabled | Loading | Error | Success |
|---|---|---|---|---|---|---|---|---|
| btn-primary | Gold bg | Gold-light bg | Scale 0.98 | Gold ring | Opacity 0.35 | Spinner + copy | — | Checkmark |
| input-default | Grey border | — | — | Gold border + glow | Opacity 0.5 | — | Red border | — |
| card-niche-select | Default border | Border lighten | Gold border | Gold border | — | — | — | Gold border + check |
| upload-dropzone | Dashed grey | Dashed gold + glow | — | Gold ring | — | Progress bar | Red border | Green border |
| nav-item | Grey icon | — | Scale 0.95 | — | — | — | — | Gold + indicator |
| card-rate-card | Default | Gold shadow | — | — | — | — | — | — |
| progress-escrow-step | Grey | — | — | — | — | — | — | Coloured + icon |

---

## PART 6: ACCESSIBILITY IMPLEMENTATION CHECKLIST

```
□ All interactive elements: minimum 44×44px tap target
□ Colour contrast: all body text ≥ 4.5:1 against background
□ Colour contrast: large text / icons ≥ 3:1
□ Focus rings: visible gold ring on all focusable elements (3px, --color-gold-glow)
□ Disabled states: NOT colour-only — use opacity + disabled attribute
□ Error states: associated to input via aria-describedby
□ Images: all img elements have alt text; decorative SVGs have aria-hidden="true"
□ Form labels: all inputs have explicit <label> or aria-label
□ Verified badge: not conveyed by colour alone — includes icon + text label
□ Escrow progress: not conveyed by colour alone — includes numbered steps + text
□ Voice messages: show duration; keyboard-playable (spacebar / enter on focus)
□ System messages in order room: aria-live="polite" region
□ Modals/drawers: focus trapped while open; returns on close
□ Loading states: aria-busy="true" on containers during load
□ Skeleton screens: aria-label="Loading content"
□ Animations: prefers-reduced-motion respected — all animations toggled off
□ Bottom navigation: role="navigation" aria-label="Main navigation"
□ Page titles: each screen has unique <title> tag
□ Landmark regions: <main>, <nav>, <header>, <footer> used correctly
```

---

## PART 7: RESPONSIVE BEHAVIOUR RULES

### Mobile (375px) — Default Design Target
- All components designed here first
- Bottom nav, bottom sheets, full-width CTAs
- Single column layouts
- Touch-first interactions (tap, swipe, drag)

### Tablet (768px) — Transitional
- Bottom nav transitions to sidebar (collapsed icon-only)
- Directory: 2-column card grid
- Drawers expand to 60% width, right-aligned
- Calendar: wider day view

### Desktop (1440px) — Adaptive Views (PWA-07D, PWA-10D)
- Top navigation replaces bottom nav
- Sidebar filter panel on directory
- Storefront: left-right two-column split
- Rate cards: 2-column grid
- Chat room: fixed-height panel, no full-scroll

### Minimum Touch Targets
- All buttons, links, interactive elements: 44×44px regardless of viewport

---

*End of Monologg Design System & Build Prompt v1.0*
*This document is formatted for direct ingestion by Google Antigravity, v0.dev, Lovable, or any design-to-code system.*
*Cross-reference with monologg_ux_spec.md for flow logic, microcopy, error states, and empty states.*
```
