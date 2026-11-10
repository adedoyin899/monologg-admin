# Monologg Design System v1.0

**Modern Marketplace Direction**  
UI References: Wise, Revolut, Spotify  
Status: Foundation for MVP rebuild  
Last Updated: 2026  

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Grid](#spacing--grid)
5. [Components](#components)
6. [Motion & Animation](#motion--animation)
7. [Patterns & Interactions](#patterns--interactions)
8. [Layout Principles](#layout-principles)
9. [Dark Mode](#dark-mode)
10. [Implementation Examples](#implementation-examples)
11. [Do's & Don'ts](#dos--donts)

---

## Design Philosophy

### Core Principles

**Not Playful, Not Rigid**  
Monologg sits in the sweet spot between playful fintech (Revolut) and serious banking (Wise). Think Spotify's balance: smart, confident, functional, with personality in the details rather than everywhere.

**Stands Out, Not Loud**  
The design should feel premium and intentional. Use the vibrant color palette strategically—not as noise, but as signals. Reserve the bright red and purple for key actions, states, and moments of emphasis.

**Product-First, Human-Centered**  
Every element exists to:
- Reduce friction (getting booked, sending briefs, checking payments)
- Clarify status (confirmed, pending, paid, in escrow)
- Build confidence (trust through clarity, not decoration)

**Consistent Across Web + Mobile**  
One design language. Responsive, but never feels "adapted." Mobile-first thinking, desktop-optimized experience.

---

## Color System

### Palette

| Color | Hex | Usage | Context |
|-------|-----|-------|---------|
| **Vibrant Red** | `#F92729` | Primary action, alerts, energy | CTAs, highlights, active states, urgency |
| **Electric Purple** | `#7700FD` | Secondary action, client surfaces | Casting briefs, payment states, secondary CTAs |
| **Deep Forest Green** | `#004F34` | Success, confirmed, trust | Paid status, confirmed bookings, success messages |
| **Marigold Gold** | `#FEBC2D` | Warning, pending, caution | Pending payments, in-escrow states, warnings |
| **Absolute Black** | `#000000` | Text, primary typography, depth | Headlines, body text, primary UI layer (use sparingly—prefer near-black) |
| **Pure White** | `#FFFFFF` | Surface, backgrounds, contrast | Card backgrounds, light surfaces (rarely used as primary—prefer off-white) |

### Semantic Usage

**Talent-Facing Surfaces (Creator App)**
- Primary accent: **Vibrant Red** (`#F92729`)
- Secondary: **Deep Forest Green** (confirmations)
- Warning/pending: **Marigold Gold** (`#FEBC2D`)

**Client-Facing Surfaces (Casting App)**
- Primary accent: **Electric Purple** (`#7700FD`)
- Secondary: **Deep Forest Green** (confirmations)
- Warning/pending: **Marigold Gold** (`#FEBC2D`)

**Shared (Website + Both Apps)**
- Status hierarchy: Green (confirm) → Gold (pending) → Red (urgent) → Purple (info)
- Neutral text: **Absolute Black** (`#000000`) at 100% for headlines, 70% for body, 50% for tertiary
- Surfaces: **Off-white** (`#F8F8F8`) instead of pure white; near-black (`#0A0A0A`) instead of pure black in dark mode

### Color Combinations (Accessibility)

All primary text + color background combinations must meet WCAG AA (4.5:1 contrast ratio):
- Black text on white/light gray: ✓ Pass
- White text on red/purple/green: ✓ Pass
- Black text on gold: ✓ Pass (7.5:1)
- Avoid pure white backgrounds; use `#F8F8F8` or `#FAFAFA` for reduced eye strain

---

## Typography

### Font Stack

**Headline Font:** Inter (900, 700, 600 weights)  
**Body Font:** Inter (500, 400, 300 weights)  
**Monospace (Data, Code):** IBM Plex Mono (400, 600)

### Type Scale

| Role | Size | Weight | Line Height | Letter Spacing | Usage |
|------|------|--------|-------------|---|---|
| **Display** | 48px | 900 | 1.1 | -0.02em | Page titles, hero headlines |
| **Headline 1** | 32px | 700 | 1.2 | -0.01em | Section headers, modal titles |
| **Headline 2** | 24px | 700 | 1.3 | 0 | Subsection headers, card titles |
| **Headline 3** | 20px | 600 | 1.4 | 0 | Component titles, strong labels |
| **Body Large** | 16px | 500 | 1.5 | 0 | Primary body text, CTA copy |
| **Body Regular** | 14px | 400 | 1.6 | 0 | Body text, descriptions, UI labels |
| **Body Small** | 12px | 400 | 1.5 | 0.02em | Helper text, captions, timestamps |
| **Mono (Data)** | 14px | 600 | 1.5 | 0.1em | Amount displays, booking IDs, codes |

### Type Hierarchy Rules

- **Headlines:** Always black/dark. Never use color for headlines except as accent underlines.
- **Body text:** 70% black (`#1A1A1A` or `rgba(0,0,0,0.7)`) on light surfaces; 85% white on dark.
- **Labels:** 50% black (`#808080` or `rgba(0,0,0,0.5)`); use color only for status labels (green=confirmed, gold=pending, red=urgent).
- **Interactive text (links, CTAs):** Use primary color (red for talent, purple for client) at 100%.

### Type Examples in Context

```
"Book the room. Get paid on time."
Headline 1 (32px, 700)

"Monologg connects creators with briefs—directly."
Body Large (16px, 500), 70% black

"Escrow balance" / "₦ 185,000"
Label (12px, 400) + Mono (20px, 600, red)

"Confirmed" ✓
Label (12px, 400) + Green (#004F34)
```

---

## Spacing & Grid

### Grid System

**Base Unit:** 4px  
**Container width (web):** 1200px max  
**Gutter (desktop):** 24px (6 base units)  
**Gutter (mobile):** 16px (4 base units)  
**Columns (desktop):** 12  
**Columns (mobile):** 4  

### Spacing Scale

| Scale | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Icon spacing, minimal gaps |
| `sm` | 8px | Compact padding, tight spacing |
| `md` | 12px | Normal internal padding |
| `lg` | 16px | Card padding, section spacing |
| `xl` | 24px | Major sections, container margins |
| `2xl` | 32px | Page margins, large section breaks |
| `3xl` | 48px | Hero spacing, major layout gaps |

### Padding Rules

- **Cards:** 16px (lg) internal padding
- **Buttons:** 12px vertical, 16px horizontal (md + lg)
- **Form inputs:** 12px vertical, 12px horizontal
- **Container margins:** 24px (xl) on desktop, 16px (lg) on mobile
- **Section spacing:** 48px (3xl) between major sections

### Margin Rules

- **Between cards:** 12px (md)
- **Between sections:** 24px–48px (xl to 3xl)
- **Around page content:** 24px (xl)
- **Mobile:** Reduce all by 25% (e.g., xl → lg equivalent on small screens)

---

## Components

### Buttons

#### Primary Button
```
Color: Vibrant Red (#F92729) on light backgrounds
Size: 48px height (large), 40px height (medium), 36px height (small)
Padding: 12px vertical, 16px horizontal
Font: Body Large (16px, 600)
Border radius: 8px
State: Default, Hover (darken 10%), Active (darken 15%), Disabled (opacity 50%)
```

**Talent App:**
- Primary CTA: Red background, white text
- Secondary CTA: Black outline, red text
- Tertiary CTA: No border, red text (30% opacity)

**Client App:**
- Primary CTA: Purple background, white text
- Secondary CTA: Black outline, purple text
- Tertiary CTA: No border, purple text (30% opacity)

#### Button Hover State
```
Transition: 150ms ease-out
Change: +10% darker, shadow +8px (0 8px 16px rgba(0,0,0,0.12))
```

#### Disabled Button
```
Opacity: 50%
Cursor: not-allowed
No hover effect
```

### Cards

```
Background: #F8F8F8 (light) or #1A1A1A (dark)
Border: None (use shadow instead)
Shadow: 0 2px 8px rgba(0,0,0,0.08)
Border radius: 12px
Padding: 16px
Transition: All 200ms ease-out
```

**Card Hover:**
```
Shadow: 0 8px 16px rgba(0,0,0,0.12)
Transform: translateY(-2px)
```

### Form Inputs

```
Height: 44px
Padding: 12px
Font: Body Regular (14px, 400)
Border: 1px solid #E0E0E0
Border radius: 8px
Background: #FAFAFA
Focus: Border color → primary color (red/purple), shadow 0 0 0 4px rgba(color, 0.1)
Transition: All 150ms ease-out
```

**Placeholder text:**
```
Color: #999999 (50% black)
Font: 14px, 400
```

**Label:**
```
Position: Above input, 12px gap
Font: Label Small (12px, 600)
Color: #000000 (black)
```

**Helper text (error/hint):**
```
Font: Body Small (12px, 400)
Color: Red (#F92729) if error, #666666 if hint
Margin top: 4px
```

### Status Badges

**Confirmed/Paid**
```
Background: #004F34 (green)
Text: White
Font: 12px, 600
Padding: 6px 12px
Border radius: 4px (sharp corners, fintech style)
```

**Pending/In Escrow**
```
Background: #FEBC2D (gold)
Text: Black
Font: 12px, 600
Padding: 6px 12px
Border radius: 4px
```

**Urgent/Action Required**
```
Background: #F92729 (red)
Text: White
Font: 12px, 600
Padding: 6px 12px
Border radius: 4px
```

**Neutral/Info**
```
Background: #E8E8E8
Text: #000000
Font: 12px, 600
Padding: 6px 12px
Border radius: 4px
```

### Modals / Sheets

```
Background: #FFFFFF (light) / #0A0A0A (dark)
Overlay: rgba(0,0,0,0.5)
Border radius: 12px (top on mobile, all corners on desktop)
Shadow: 0 20px 40px rgba(0,0,0,0.15)
Max width: 600px
Margin: 24px (xl)
```

**Close button:**
```
Position: Top right, 16px from edge
Size: 32px × 32px
Icon: ×, 16px, black
Background: Transparent
Hover: Background #F0F0F0, 200ms ease-out
```

### Dividers

```
Color: #E8E8E8 (light) / #2A2A2A (dark)
Height: 1px
Margin: 16px (lg) vertical
```

### Icons

**Principles:**
- Outline style, 2px stroke width
- 24px (default), 16px (compact), 32px (large)
- Corner radius: 2px (slight softness)
- Color: Inherit from context (black text, colored accents)

**Key icons:**
- Booking: Calendar with checkmark
- Payment: Wallet or card
- Escrow: Lock or safe
- Gig: Microphone or stage light
- Chat/message: Speech bubble
- Profile: Silhouette circle
- Menu: Three horizontal lines
- Search: Magnifying glass

---

## Motion & Animation

### Principles

**Duration:** 150ms (micro interactions), 300ms (section transitions), 500ms (modals/sheets)  
**Easing:** `ease-out` for entrances, `ease-in-out` for state changes, `ease-in` for exits  
**Avoid:** Bouncy easing (no bounce.js). Never use `ease` (linear by default).

### Core Animations

#### Micro-interactions (150ms, ease-out)
- Button hover state
- Icon state changes
- Input focus
- Badge appearance
- Hover tooltips

#### Section/Card transitions (300ms, ease-out)
- Card appear
- List item addition
- Collapse/expand
- Fade in text

#### Modal/Sheet transitions (500ms, ease-out)
- Modal enter: Slide up from bottom (mobile) or fade in from center (desktop)
- Modal exit: Slide down or fade out
- Overlay fade in/out

#### Loading states (repeating, 400ms)
```
Skeleton pulse: Opacity 0.6 → 1 → 0.6, ease-in-out
Spinner: Rotation 360deg, linear (not easing)
```

### Example Animation: Button Press

```
Hover:
  - Shadow: 0 2px 8px → 0 8px 16px (300ms)
  - Transform: translateY(0) → translateY(-2px) (300ms)
  
Click (active):
  - Transform: translateY(-2px) → translateY(0) (100ms)
  - Opacity: 1 → 0.9 (100ms)
  - Then release (300ms ease-out back to hover state)
```

### Page Transitions

**Web:**
- Fade + 200ms on between pages
- No scroll jumps; smooth scroll to top

**Mobile:**
- Slide right (back) or slide left (forward)
- 300ms ease-out
- Preserve scroll position on back

---

## Patterns & Interactions

### Role-Based Color Logic

**Creator App (Talent-Facing)**
- All primary CTAs: Red (#F92729)
- Confirmations: Green (#004F34)
- Warnings: Gold (#FEBC2D)
- Accent: Red throughout

**Client App (Casting-Facing)**
- All primary CTAs: Purple (#7700FD)
- Confirmations: Green (#004F34)
- Warnings: Gold (#FEBC2D)
- Accent: Purple throughout

**Website**
- Primary CTA: Red (if logged out) or role-appropriate if logged in
- Role picker: Both red + purple visible
- Accent: Both colors used to distinguish sides

### Data Hierarchy

**High importance (always visible, action required):**
```
Size: Headline 2 or larger (20px+)
Color: Black + colored accent
Example: "₦ 185,000 escrow", "Comedy Night — Confirmed"
```

**Medium importance (context, secondary info):**
```
Size: Body Regular (14px)
Color: 70% black
Example: "Sat · 8PM · Lagos", "Pending approval"
```

**Low importance (helper, timestamp, hint):**
```
Size: Body Small (12px)
Color: 50% black
Example: "2 hours ago", "Optional field"
```

### Empty States

```
Icon: Large (64px), 30% black
Headline: "No gigs yet" (24px, 700)
Description: "When you're booked, they'll show here." (14px, 50% black)
CTA: Primary button or link
Illustration: Optional, but prefer icon + type over full illustration
Padding: 64px top/bottom, centered
```

### Loading States

```
Option 1 (Skeleton): Gray placeholder cards, pulsing opacity
Option 2 (Spinner): 24px centered spinner, rotating indefinitely
Option 3 (Progress): Thin progress bar top of screen, 300ms increment
Use skeleton for lists, spinner for full-page, progress for file operations
```

### Confirmation / Success Patterns

**Toast (small action completed):**
```
Position: Bottom right (desktop), bottom center (mobile)
Content: Icon (✓) + text, 14px
Duration: 4 seconds, auto-dismiss
Background: Green (#004F34)
Text: White
Padding: 12px 16px
Border radius: 8px
Shadow: 0 4px 12px rgba(0,0,0,0.15)
Exit animation: Fade out 200ms
```

**Modal (major action completed):**
```
Headline: "Booking confirmed" (32px, 700)
Icon: Large checkmark (48px)
CTA: Proceed button
Duration: User dismisses or after 6 seconds auto-proceed
```

---

## Layout Principles

### Web Layout (Desktop & Tablet)

**Page structure:**
```
Header (fixed or sticky): 64px height
Content area: Max 1200px, centered, 24px gutters
Sidebar (if needed): Right-aligned, 300px, 16px margin
Footer: Optional, only on marketing site
```

**Grid:**
```
12 columns, 24px gutter
Example: Main content (8 cols) + Sidebar (4 cols)
Breakpoint: 1024px (switch to 2-col layout)
```

### Mobile Layout (320px–768px)

**Page structure:**
```
Header (sticky): 56px height
Content area: Full width, 16px margins
Bottom nav or floating action: Above content (if applicable)
```

**Spacing:**
```
All gutters: 16px (reduced from 24px)
Card margins: 8px (reduced from 12px)
Section spacing: 24px (reduced from 32–48px)
```

**Bottom sheet style:**
```
For modals on mobile: Sheet slides up from bottom, 90vh max
For navigation: Bottom tab bar, 56px, persistent
```

### Component Layout Examples

#### Booking Card (Web)
```
+─────────────────────────────────────+
│ Comedy Night                    [×]  │
│ Sat · 8PM · Lagos                    │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Contract                         │ │
│ │ [Brief text...]                  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Escrow: ₦ 185,000 [PENDING]          │
│                                      │
│ [Sign & Confirm] [Decline]           │
+─────────────────────────────────────+
```

#### Booking Card (Mobile)
```
┌─────────────────────┐
│ Comedy Night    [×] │
│ Sat · 8PM · Lagos   │
├─────────────────────┤
│ Contract            │
│ [Brief text...]     │
├─────────────────────┤
│ Escrow: ₦ 185,000   │
│ [PENDING]           │
├─────────────────────┤
│ [Sign & Confirm]    │
│ [Decline]           │
└─────────────────────┘
```

---

## Dark Mode

### Palette Swap

| Light | Dark |
|-------|------|
| #FFFFFF (pure white) | #0A0A0A (near-black) |
| #F8F8F8 (off-white) | #1A1A1A (dark gray) |
| #E8E8E8 (light gray) | #2A2A2A (medium dark) |
| #000000 (black text) | #FFFFFF (white text) |
| Colors (red, purple, green, gold) | Same (no desaturation) |

### Implementation

**CSS example:**
```
@media (prefers-color-scheme: dark) {
  body {
    background: #0A0A0A;
    color: #FFFFFF;
  }
  .card {
    background: #1A1A1A;
    border-color: #2A2A2A;
  }
}
```

### Contrast in Dark Mode

- White text on dark backgrounds: ✓ 15:1 ratio
- Color text (red/purple) on dark: ✓ Pass
- Reduce shadow intensity (use rgba with lower opacity)

---

## Implementation Examples

### Example 1: Creator App Homepage

**Hero Section:**
```
Headline: "Book the room." (48px, 900, black)
Subheadline: "Get paid on time." (32px, 700, red)
Body: "Monologg connects you directly to briefs..." (16px, 400, 70% black)
CTA: [Book a Gig] (primary button, red)

Layout:
- Desktop: 2-col grid, headline left (60%), visual right (40%)
- Mobile: Full width, stacked

Spacing:
- Hero height: 480px (desktop), 360px (mobile)
- Headline margin bottom: 24px
- Subheadline margin bottom: 16px
- Body margin bottom: 32px
```

**Gig Cards Section:**
```
Section title: "Your next gigs" (32px, 700)
Cards grid: 3-col (desktop), 1-col (mobile), 12px gap
Card content:
  - Title: "Comedy Night" (20px, 700)
  - Date/time: "Sat · 8PM · Lagos" (14px, 50% black)
  - Rate: "₦ 25,000" (16px, 600, monospace, red accent)
  - Status badge: "CONFIRMED" (green, 12px, 600)

Card interaction:
- Hover: Shadow +8px, translateY -2px
- Click: Navigate to booking detail
```

### Example 2: Booking Confirmation Modal

**Modal structure:**
```
Background: Modal overlay + white card
Title: "Booking confirmed!" (32px, 700, black)
Icon: Large checkmark (48px, green)
Details:
  - Comedy Night
  - Sat, 8PM · Lagos
  - ₦ 25,000 (via escrow)
Status: "Confirmed" (green badge)
CTA: [View Details] [New Search]

Spacing:
- Modal max-width: 600px
- Padding: 32px
- Gap between elements: 24px
- Icon margin bottom: 24px
```

### Example 3: Pending Payment Card (Client App)

```
Layout:
- Card background: #F8F8F8
- Header: "Voiceover gig — in escrow" (20px, 700)
- Subheader: "Escrow held until Feb 15" (14px, 50% black)
- Amount: "₦ 50,000" (20px, 600, monospace, purple)
- Status badge: "PENDING" (gold)
- CTA: [Release Payment] (purple button, secondary style)

States:
- Hover: Card shadow increases
- If overdue: Badge changes to red, status → "Overdue"
```

---

## Do's & Don'ts

### Design Do's

✓ **Use color purposefully.** Red/purple for action, green for confirmation, gold for pending.  
✓ **Maintain consistent spacing.** Stick to the 4px grid and spacing scale.  
✓ **Prioritize clarity over cleverness.** Fintech isn't the place for decorative flourishes.  
✓ **Test on mobile first.** All components should work at 320px width.  
✓ **Use animations to clarify, not distract.** 150–300ms for micro interactions.  
✓ **Follow type hierarchy strictly.** Reduces cognitive load, builds trust.  
✓ **Create sufficient contrast.** WCAG AA minimum (4.5:1 for all text).  

### Design Don'ts

✗ **Don't use bright colors for large surfaces.** Reserve red/purple for CTAs and accents, not backgrounds.  
✗ **Don't animate for animation's sake.** Every motion should clarify action or state.  
✗ **Don't break the grid.** Alignment matters; it signals precision and trustworthiness.  
✗ **Don't use more than 2 fonts.** Stick to Inter throughout; no serif, no script.  
✗ **Don't make text too small.** Body copy should never go below 14px on any device.  
✗ **Don't forget dark mode.** Design for both; they're equally important now.  
✗ **Don't ignore accessibility.** High contrast, clear labels, no color-alone status indicators.  
✗ **Don't overload cards with information.** More than 5 elements signals poor information hierarchy.  

---

## Design Tokens (For Developers & AI Agents)

### Colors
```
--color-red: #F92729
--color-purple: #7700FD
--color-green: #004F34
--color-gold: #FEBC2D
--color-black: #000000
--color-white: #FFFFFF
--color-off-white: #F8F8F8
--color-near-black: #0A0A0A
--color-dark-gray: #1A1A1A
--color-light-gray: #E8E8E8
--color-text-primary: rgba(0, 0, 0, 1)
--color-text-secondary: rgba(0, 0, 0, 0.7)
--color-text-tertiary: rgba(0, 0, 0, 0.5)
```

### Typography
```
--font-family-primary: "Inter", sans-serif
--font-family-mono: "IBM Plex Mono", monospace
--font-size-display: 48px
--font-size-h1: 32px
--font-size-h2: 24px
--font-size-h3: 20px
--font-size-body-large: 16px
--font-size-body: 14px
--font-size-small: 12px
--font-weight-normal: 400
--font-weight-medium: 500
--font-weight-semibold: 600
--font-weight-bold: 700
--font-weight-black: 900
```

### Spacing
```
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 12px
--spacing-lg: 16px
--spacing-xl: 24px
--spacing-2xl: 32px
--spacing-3xl: 48px
```

### Shadows
```
--shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08)
--shadow-md: 0 8px 16px rgba(0, 0, 0, 0.12)
--shadow-lg: 0 20px 40px rgba(0, 0, 0, 0.15)
--shadow-xl: 0 32px 64px rgba(0, 0, 0, 0.18)
```

### Border Radius
```
--radius-sm: 4px
--radius-md: 8px
--radius-lg: 12px
--radius-xl: 16px
```

### Transitions
```
--duration-micro: 150ms
--duration-short: 300ms
--duration-medium: 500ms
--easing-out: cubic-bezier(0.33, 0.66, 0.66, 1)
--easing-in-out: cubic-bezier(0.42, 0, 0.58, 1)
--easing-in: cubic-bezier(0.42, 0, 1, 1)
```

---

## Quality Checklist for AI Agent

When rebuilding/refining UI components, verify:

- [ ] All text meets WCAG AA contrast requirements (4.5:1 minimum)
- [ ] Buttons are exactly 48px tall (large), 40px (medium), 36px (small)
- [ ] Cards have 12px border radius and 16px internal padding
- [ ] Form inputs are 44px height with focus states
- [ ] Color usage follows role-based logic (red for talent, purple for client)
- [ ] All animations are 150ms (micro), 300ms (section), or 500ms (modal)
- [ ] Type hierarchy strictly follows the scale (no off-scale sizes)
- [ ] Spacing uses the 4px grid (all values divisible by 4)
- [ ] Icons are consistently sized (24px default, 16px compact, 32px large)
- [ ] Status badges use correct colors (green=confirmed, gold=pending, red=urgent)
- [ ] Mobile layout collapses to 1-col grid, 16px gutters, 56px header
- [ ] Dark mode palette swap is complete and tested
- [ ] All interactive elements have clear focus/hover/active states
- [ ] Loading states use skeleton or spinner (not spinner + text overlay)
- [ ] Modal/sheet animations are smooth (no janky transitions)
- [ ] Component spacing follows padding/margin rules (no ad-hoc values)

---

## References

**Design inspiration:**
- Wise: Clean grids, minimal color, high contrast
- Revolut: Vibrant accents, smooth animations, modern sans-serif
- Spotify: Role-based color, consistent spacing, motion-first approach

**Tools & Export:**
- Figma components with design tokens
- Component library (React, Vue, or native)
- CSS/SCSS variables for consistency
- Animation library (Framer Motion or custom CSS)

---

**End of Design System v1.0**  
Last reviewed: 2026  
Next review: After MVP launch  
Maintained by: Design team + Product team
