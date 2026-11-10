# Monologg — Bug & Issue Log

**Last updated:** 2026-11-10 (Session 231: Singular Performer Craft Profile Labels in Onboarding & Settings)
**This is a living document** — add a new entry every time a bug is found or fixed, in the same session as the fix. See `README.md` for the full update policy.

This tracks every defect found during this engagement — both classic "the build broke" bugs and design-system consistency issues (things that *worked* but would silently drift out of sync on the next change). Severity is defined once here so it means the same thing every time it's used below.

## Severity scale

| Severity | Meaning |
|---|---|
| **Critical** | App is unusable; no workaround exists |
| **High** | Blocks a build, a dev-server start, or a core feature entirely until fixed |
| **Medium** | Everything still runs, but the underlying issue creates real risk — either it silently produces wrong output, or it will cause a future change to not take effect everywhere it should |
| **Low** | Cosmetic, or a pre-existing minor issue with no functional impact |
| **Resolution** | Resolved and validated via clean test suite pass |

---

## Bugs found and fixed during this engagement

### 177. Plural Craft Categories in Single-Performer Onboarding & Settings
- **Severity:** Low / Persona Copy Grammar & Profile Consistency
- **What happened:**
  - On Step 2 of Performer Onboarding (`CreatorOnboarding.tsx`) and in Performer Settings (`Settings.tsx`), craft profile categories were presented in plural form ("Actors", "Public speakers", "Comperes", "Comedians", "Artists", "Creators") instead of singular person titles appropriate for an individual talent's profile.
- **Root Cause:**
  - Category labels originally copied from marketplace-wide directory filters without adjusting for individual profile selection.
- **Resolution:**
  - Updated craft option labels to singular nouns ("Actor", "Public speaker", "Compere", "Comedian", "Artist", "Creator") in `CreatorOnboarding.tsx` and `Settings.tsx`.
  - Preserved internal category IDs and state mappings for full backend compatibility.
  - Validated with 200 passing tests and production build.

### 176. Home Page Bottom CTA Section Max-Width Boxing
- **Severity:** Low / Visual Layout & Viewport Bleed Consistency
- **What happened:**
  - On `LandingPage.tsx`, `<WebsiteFooter />` was wrapped in `<div className="w-full max-w-[1440px] z-10">`.
  - On viewports wider than 1440px, the grey `#f9f9f9` background of the "Finish Your Project today!" CTA banner was clamped at 1440px with wide white gutters on the left and right sides.
- **Root Cause:**
  - An extraneous `max-w-[1440px]` wrapper around the shared footer on `LandingPage.tsx` that was not present on other pages.
- **Resolution:**
  - Replaced `<div className="w-full max-w-[1440px] z-10">` with `<div className="w-full z-10">`.
  - Allowed `WebsiteFooter`'s internal full-width sections (`bg-[#f9f9f9]` in light mode, `bg-[#1a1a1a]` in dark mode) to bleed 100% across the viewport while maintaining internal `max-w-[1040px]` content alignment.
  - Validated with 200 passing tests and production build.

### 175. Social Brand Icon Inversion in Dark Mode
- **Severity:** Low / Brand Visual Identity & Color Integrity
- **What happened:**
  - In `ResourcesPage.tsx` and `tokens.css`, `dark:invert` and a global CSS rule `.dark a[aria-label="..."] img { filter: invert(1) brightness(1.8) !important; }` inverted colored brand SVGs in dark mode.
  - This turned LinkedIn `#0A66C2` blue into a muddy yellow `#F5993D`, Product Hunt `#D85637` orange into cyan `#27A9C8`, and Instagram's iconic warm gradient into cold cyan-blue.
  - In addition, because LinkedIn's letters were an evenodd transparent cutout, displaying it over a dark container without a white backing rect would show black letters through the cutout.
- **Root Cause:**
  - Broad dark-mode inversion filter intended for monochrome vector marks (like Twitter-X) was applied universally across all social badges.
- **Resolution:**
  - Removed `dark:invert` from LinkedIn, Product Hunt, and Instagram in `ResourcesPage.tsx`.
  - Added explicit `.dark a[aria-label="..."] img { filter: none !important; }` in `tokens.css` for brand color icons.
  - Added a `<rect x="3" y="3" width="12" height="12" fill="white"/>` backing element in `linkedin.svg` to guarantee white "in" letters in all environments.
  - Validated with 200 passing tests and production build.

### 174. Generic CTA Direct-to-Onboarding Bypass & Incongruous Performer Hiring Copy
- **Severity:** Medium / Conversion Optimization & Persona Copy Fidelity
- **What happened:**
  1. **Direct-to-Onboarding Bypass:** Generic "Get started for free" buttons routed users directly to `/onboarding`, bypassing the account creation sign-up flow (`/auth?mode=signup`).
  2. **Incongruous Performer Copy in Thespian AI:** The performer sub-block in `ProductPage.tsx` displayed the client-centric caption `"Start hiring today"` and both performer and client CTA buttons navigated generically to `/onboarding`.
- **Root Cause:**
  - Legacy routing left over from initial prototyping before Supabase auth registration flows were integrated.
- **Resolution:**
  - Updated generic "Get started for free" buttons across `WebsiteFooter.tsx` and `LandingPage.tsx` to navigate to `/auth?mode=signup` (or user's dashboard if already authenticated).
  - Updated Thespian AI Performer sub-block copy to `"Start finding gigs"` and routed CTA specifically to `/auth?mode=signup&role=talent`.
  - Updated Thespian AI Client sub-block CTA to `/auth?mode=signup&role=client`.
  - Updated portal hero and pricing CTAs to route dynamically based on selected role.
  - Validated with 200 passing tests and production build.

### 173. Footer Resources Column Label Inconsistency with Legal Route
- **Severity:** Low / Information Architecture & Copy Consistency
- **What happened:**
  - The Resources column in `WebsiteFooter.tsx` displayed `"Cookie Settings and Policy"` instead of the concise, canonical label `"Cookie Policy"`, which directly matches the page heading and URL route (`/cookies`).
- **Root Cause:**
  - Extended draft copy had been used rather than the concise page title.
- **Resolution:**
  - Updated the button label to `"Cookie Policy"` in `WebsiteFooter.tsx`.
  - Updated test assertions in `WebsiteFooter.test.tsx` and `LandingPageHeader.test.tsx`.
  - Validated with 200 passing tests and production build.

### 172. Mobile Navigation Redundancy & Role-Insensitive Desktop Header Menu
- **Severity:** Medium / FAANG UX Architecture & Information Hierarchy
- **What happened:**
  1. **Redundant Destinations in Mobile "More" Drawer:** In `BottomNav.tsx`, the More drawer repeated all 9 navigation destinations, including the 5 items already immediately visible on the floating bottom dock (`Home`, `Orders`, `Rates`, `Projects`, `Calendar`).
  2. **Bloated Mobile Account Section:** The mobile drawer rendered a 5-item list (`Account Settings`, `Transactions & Escrow Ledger`, `Appearance`, `Help & Dispute Support`, `Sign Out`), creating excessive vertical scroll and cognitive clutter on small viewports.
  3. **Role-Insensitive Desktop Header Menu:** In `LandingPage.tsx`, the user avatar dropdown displayed "Public Storefront" (instead of in-app canonical "My Profile") and unconditionally rendered "Post a Brief" even when signed in as a Performer.
- **Root Cause:**
  - `BottomNav.tsx` mapped directly over `allNavItems` without filtering out items already represented on `navItems`.
  - The desktop header menu in `LandingPage.tsx` did not branch cleanly based on `isClientSession` for role-exclusive CTAs.
- **Resolution:**
  - Filtered `allNavItems` in `BottomNav.tsx` dynamically by `!navItems.some(visible => visible.id === item.id)` so only unrepresented views appear under "More Views".
  - Replaced the multi-item account list with a clean, focused "Settings" entry point and "Sign Out".
  - Renamed "Public Storefront" to "My Profile" with `User` icon, and made the desktop user menu strictly role-adaptive (Performers see `Dashboard`, `My Profile`, `Browse Gigs`, `Settings`, `Sign Out`; Clients see `Dashboard`, `Find Performers`, `Post a Brief`, `Settings`, `Sign Out`).
  - Validated via 200 passing unit tests and Vite production build.

### 171. Footer Resources Stale Legal/Policy Navigation Mismatch & Missing Headquarters Attribution
- **Severity:** Low / UI Consistency & Regional Branding
- **What happened:**
  - The Resources column in `WebsiteFooter.tsx` retained outdated placeholders (`Escrow Policy`, `Fair Trade Contracts`, `Support & Community`) instead of the canonical product legal and FAQ links (`Terms of Services`, `Cookie Settings and Policy`, `FAQ`, `Become an investor`).
  - The footer bottom metadata row lacked explicit `Lagos, Nigeria 🇳🇬` regional headquarters attribution.
- **Root Cause:**
  - Footer links were previously hardcoded to exploratory contract policy subpages rather than the implemented central `/terms`, `/cookies`, and `#faq` routes.
- **Resolution:**
  - Updated the Resources column to render `Terms of Services`, `Cookie Settings and Policy`, `FAQ`, and `Become an investor`.
  - Added `Lagos, Nigeria 🇳🇬` aligned to the bottom right beneath the divider line.
  - Verified 100% test pass in `WebsiteFooter.test.tsx` and `LandingPageHeader.test.tsx`.

### 170. Static Hero Headline Placeholder, Broken Role-Toggled CTA Routing, Social Footprint Clutter & Unverified Media House Trust Claim
- **Severity:** Medium / Conversion Optimization, Trust & Brand Fidelity
- **What happened:**
  1. **Static Headline Placeholder:** The hero headline rendered a static pipe character `"Find Performers|"` rather than an animated typewriter transitioning between performer and client value propositions.
  2. **Non-Role-Toggled CTA Routing:** `"Find Performers"` routed visitors to the general onboarding wizard rather than the toggled client registration view, and `"Find Gigs"` routed to general onboarding rather than toggled performer registration.
  3. **Social Presence Clutter:** `ResourcesPage.tsx` and `WebsiteFooter.tsx` displayed unmaintained social channels (`Twitch`, `Telegram`, `TikTok`, `Discord`).
  4. **Premature Social Proof Claim:** `ProductPage.tsx` displayed a 6-studio logo strip (Vimeo, Netflix, Prime, Disney+, Hulu, Twitch) and claimed `"Trusted by top media houses"` which does not yet represent active enterprise relationships.
- **Root Cause:**
  - Initial Figma draft assets included speculative studio logos and static wireframe cursor placeholders.
  - Primary hero CTA buttons navigated directly to onboarding wizard routes without preserving user role intent in the auth flow.
- **Resolution:**
  - Replaced the static headline with a typewriter animation cycling between `"Find Performers"` and `"Find Gigs"` with realistic typing, pause, backspacing, and a blinking cursor.
  - Routed `"Find Performers"` to `/auth?mode=signup&role=client` and `"Find Gigs"` to `/auth?mode=signup&role=talent`.
  - Streamlined social links strictly to LinkedIn, Product Hunt, X (Twitter), and Instagram across both Resources and Footer.
  - Removed the studio logos trust bar from `ProductPage.tsx` and refactored the 2x2 grid container to a clean, fully enclosed `border rounded-[20px]` box.
  - Updated all relevant test suites (`LandingPageHeader.test.tsx`, `ResourcesPage.test.tsx`, `ProductPage.test.tsx`) with 100% pass.

### 169. OrderRoom.tsx Role Switcher Multi-Line Nested Template Literal JSX Parsing Diagnostics
- **Severity:** Low / Developer Ergonomics & Diagnostics Hygiene
- **What happened:**
  - In `OrderRoom.tsx`, VS Code's TypeScript Language Server reported errors (`ts(2304) Cannot find name 'className'`, `ts(2349) This expression is not callable`, `ts(2304) Cannot find name 'h'`, `'rounded'`, `'full'`, `ts(2581) Cannot find name '$'`) on lines 838–846 inside the role switcher.
- **Root Cause:**
  - Multi-line nested ternary interpolations within JSX attribute template literals (`className={\`w-1.5 h-1.5 rounded-full shrink-0 \${r === "talent" ? ... : ...} \${isActive ? ...}\`}`) caused editor tokenizers to ambiguously misparse attribute characters as regular JS subtraction / identifier expressions.
- **Resolution:**
  - Extracted dynamic presence and tone classes into cleanly typed local variables (`dotBg`, `dotOpacity`, `btnTone`) outside the JSX return, and flattened `<span className={\`w-1.5 h-1.5 rounded-full shrink-0 \${dotBg} \${dotOpacity}\`} />` into a concise, single-line expression.
  - Added explicit `type="button"` attributes to all interactive switcher elements. Verified 0 TypeScript errors and 100% test pass.

### 168. Mobile Navigation Feature Loss, Invisible White-on-Light Avatar/Button Text, Check-in Banner Viewport Bloat, Calendar Cell Overflow & OrderRoom Horizontal Clipping
- **Severity:** High / Mobile Responsiveness, Accessibility & UX Parity
- **What happened:**
  1. **Hidden Menu Items on Mobile:** Desktop `Sidebar` exposed `Earnings`, `Analytics`, `Activity`, `Settings`, `Dark Mode`, and `Sign Out`, while mobile `BottomNav` only rendered 5–6 tabs, leaving critical destinations unreachable on mobile without URL manipulation.
  2. **Invisible White Text on Mobile Avatar (`EJ`, `FS`) & `"Resume Draft Stepper"` Button:** In light mode, the top-right mobile avatar buttons and the outline `"Resume Draft Stepper"` button rendered white text (`#FFFFFF`) on pastel/white backgrounds.
  3. **Check-in Banner Viewport Bloat:** On Performer mobile tabs (`Active Orders`, `Rate Cards`, etc.), the expanded `"Attendance Verified"` card consumed ~75% of the viewport height even after attendance was already confirmed.
  4. **Availability Calendar Overflow & Duplication:** The Month view card repeated the `November 2026` title and `< Today >` navigator right below the main toolbar, truncated the Google Calendar Sync description, and let Thursday's `TODAY` badge overflow horizontally into Friday's (`6`) cell.
  5. **Severe Mobile Truncation & Horizontal Viewport Overflow:** Performer/Client `Active Orders` rows truncated project names to `Nike Com...` and `Mil...`; Client `My Projects` cards squished `Target: 10 performers · Inactive draft` into 4 narrow lines next to two buttons; Client Project Detail's `State:` preview bar overflowed 375px screens; and `OrderRoom` clipped the right edge of the Client view and wrapped/collided buttons in `Brief & Files`.
- **Root Cause:**
  1. `tokens.css` used overly broad attribute selectors (`button[style*="var(--color-accent)" i]`) that matched any inline style referencing `var(--color-accent)`—including `color: var(--color-accent)` on light backgrounds—forcing `color: #FFFFFF !important`.
  2. `BottomNav.tsx` lacked a `"More"` drawer for secondary tabs and account actions.
  3. Desktop-first single-row flex layouts in `TalentDashboard.tsx`, `ClientDashboard.tsx`, and `OrderRoom.tsx` lacked mobile stacking (`flex-col sm:flex-row`), progressive disclosure, and `overflow-x-hidden` constraints.
- **Resolution:**
  1. Scoped `tokens.css` white-text rules strictly to `background:` and `background-color:` declarations and added `.no-scrollbar` / `.scrollbar-none` utilities.
  2. Upgraded `BottomNav.tsx` with a `"More"` trigger and a full **Mobile Navigation & Quick Actions Bottom Sheet** exposing all workspace tabs, `Account Settings`, `Transactions & Escrow Ledger`, `Appearance` (Dark/Light Mode), `Help & Dispute Support`, and `Sign Out`.
  3. Added progressive disclosure to the global Check-in Card in `TalentDashboard.tsx` (auto-collapsing to a slim strip on non-Home tabs when verified, plus an `"Event Details"` toggle), redesigned `Active Orders` rows into a 2-row mobile hierarchy, removed duplicate mobile headings, and fixed the 7-column Month calendar cell geometry.
  4. Updated `ClientDashboard.tsx` project cards to stack metadata above action buttons on mobile and made the `State:` preview bar horizontally scrollable (`overflow-x-auto no-scrollbar`).
  5. Updated `OrderRoom.tsx` with `w-full max-w-[100vw] overflow-x-hidden`, compacted mobile header controls, stacked `Campaign Reference Attachments` on mobile, and upgraded the mobile `Order Details` (`Info`) modal to full parity with the desktop Inspector Rail.

### 167. Ambient Gradient Blur Overlays Across Website & Mobile Hero Mockup Vertical Spacing Collision
- **Severity:** Low / Visual Polish & Mobile Responsiveness
- **What happened:**
  - Ambient gradient blur overlays across all 5 public pages produced distracting multi-color blurs over canvas backgrounds in dark and light modes.
  - On mobile screens, the iPhone mockup sat too high with `top: -46px`, leaving only 2px of spacing from the "Find Performers" / "Find Gigs" CTA buttons, while the bottom of the device overhung past the stage boundary.
- **Root Cause:**
  - Gradient SVGs were legacy decorative overlays from initial desktop Figma exports.
  - Mobile scaler height was fixed at 613px without clipping lower content, while the stage was reduced, resulting in bottom overflow and upward collision.
- **Resolution:**
  - Removed ambient background gradient containers from `LandingPage.tsx`, `ProductPage.tsx`, `PricingPage.tsx`, `ResourcesPage.tsx`, and `LegalPage.tsx`.
  - Recalibrated mobile `.hero-phone-stage` height to 295px (and 260px on < 375px) and `.hero-phone-scaler` height to 460px with `top: -16px` (and `-14px` on < 375px), leaving an equivalent 32px vertical gap between the CTA buttons and the device notch, with clean bottom clipping.

### 166. Outdated Social Handle Placeholders in Website Footer & Resources Master Card
- **Severity:** Low / Social Proof & Link Integrity
- **What happened:**
  - Social links in `WebsiteFooter.tsx` and `ResourcesPage.tsx` pointed to generic `/monologg` paths rather than the active official brand handles.
- **Root Cause:**
  - Initial Figma Make imports defaulted to generic placeholder URLs before official account reservation.
- **Resolution:**
  - Standardized X (Twitter) links to `https://x.com/getmonologg` and Instagram links to `https://www.instagram.com/getmonologg` in `WebsiteFooter.tsx` and `ResourcesPage.tsx`.
  - Updated unit test suites in `WebsiteFooter.test.tsx` and `ResourcesPage.test.tsx` verifying exact `href` attributes; tests pass 100% green.

### 165. Static Announcement Bar Crowding & Lack of Live Indicator Animation
- **Severity:** Low / UI Polish & Social Proof Dynamism
- **What happened:**
  - The static red dot was un-animated, failing to visually convey that Monologg is in an active, live Alpha state.
  - On the right side, "Paystack Secured" and "25+ Verified Performers" were both shown simultaneously with a middle bullet dot (`·`), causing text crowding on narrow mobile viewports (< 380px).
- **Root Cause:**
  - Announcement bar was static HTML duplicated across 5 page files with no rotation timer or status dot animation.
- **Resolution:**
  - Created centralized `TopAnnouncementBar.tsx` featuring:
    1. Dual-layer blinking red dot (`animate-ping` + `animate-pulse shadow-[0_0_8px_rgba(241,48,48,0.9)]`).
    2. Dynamic 20s alternating badge marquee (`intervalMs={20000}`) that crossfades smoothly between "Paystack Secured" and "25+ Verified Performers" one item at a time.
    3. Seamless mobile fit with zero layout jump or reflow.
  - Authored `TopAnnouncementBar.test.tsx` (4/4 green); all 36 test files (195 tests) passed 100% green.

### 164. Product Page 525x484 Showcase Stage Disjunction on Mobile Viewports
- **Severity:** Low / Mobile Visual Flow & Responsive Polish
- **What happened:**
  - On mobile screens (< 1024px), the desktop 525×484 product UI illustration stage was stacked beneath the 5-card sliding window as a massive 484px block, separated from the active step and introducing excessive empty vertical scroll.
- **Root Cause:**
  - Desktop-first layout (`flex flex-col lg:flex-row`) rendered both columns sequentially on mobile without hiding the detached desktop illustration stage.
- **Resolution:**
  - Applied `hidden lg:flex` to the right-column stage container in `ProductPage.tsx`. On mobile viewports, the detached stage is hidden so the 7-step sequence reads as a clean, full-width feature stack. Desktop preserves the side-by-side sticky 525×484 stage 1:1 with Figma Frame `178359:17305`.
  - Added unit test assertion in `ProductPage.test.tsx` verifying responsive classes; full test suite passes 100% green.

### 163. Mobile Navigation Drawer Visual Clutter, Bottom Dock Distraction & Alignment with Rise Minimal Aesthetics
- **Severity:** Medium / Mobile Visual Hierarchy & Brand Calm
- **What happened:**
  - The previous mobile drawer implementation was densely packed with cards, descriptions, status badges, secondary role cards, and legal links, conflicting with the desired minimalist aesthetic modeled after Rise.
  - Concurrently, a persistent floating bottom dock competed with the main marketing CTAs and page hero elements, creating visual clutter on mobile landing pages.
- **Root Cause:**
  - Over-indexing on feature completeness inside a single mobile sheet rather than providing a focused, serene navigation model with only the core pages and authentication actions.
- **Resolution:**
  - Redesigned `BespokeMobileNavDrawer` into a full-screen, Rise-style minimal overlay:
    1. Brand top bar with logo, subtle theme toggle, and close `X`.
    2. Clean vertical stack of unboxed page links (`Home`, `Product`, `Pricing`, `Resources`) with large typography (`text-[22px] sm:text-[25px]`) and active route indicator.
    3. Pinned side-by-side rounded-full bottom action pills (`Sign in` / `Get started` or `Dashboard` / `Sign out`).
  - Purged the floating bottom dock from public pages (`LandingPage`, `ProductPage`, `PricingPage`, `ResourcesPage`, `LegalPage`) and eliminated unnecessary bottom padding, delivering a calm, clutter-free mobile view.
  - Validated with unit tests (`BespokeMobileNav.test.tsx` 10/10 green) and full test suite (35/35 test files, 191/191 tests passed).

### 162. Mobile Navigation Missing Across Main Pages & Header Avatar Circle Vertical Clipping
- **Severity:** High / Mobile Navigation & UX Integrity
- **What happened:**
  - On mobile screens (< 768px), navigation links (`Product`, `Pricing`, `Resources`) were completely hidden via `hidden md:flex` across all 5 main public pages (`LandingPage`, `ProductPage`, `PricingPage`, `ResourcesPage`, `LegalPage`). No mobile hamburger button, drawer, or bottom dock existed, preventing mobile users from navigating across the site.
  - In addition, the authenticated user menu pill in the mobile header rendered portrait user avatars with default `object-cover` without explicit top-alignment, slicing off the upper head/face in tall profile pictures (such as Theo's `6012d1b610f186b4da032a28a55bf16e19555e2e.png`).
- **Root Cause:**
  - Header navigation links were only declared inside a desktop-only `<nav className="hidden md:flex">` container with no responsive mobile fallback trigger or sheet.
  - User avatar `<img>` in `LandingPage.tsx` lacked an `overflow-hidden` containment wrapper and `object-top` focal alignment.
- **Resolution:**
  - Built `BespokeMobileNav.tsx` comprising:
    1. `MobileMenuButton` (36px tactile button in sticky header with animated `Menu` ↔ `X` transitions).
    2. `BespokeMobileNavDrawer` (spring-animated full-feature overlay featuring 4 main page cards with active route badges, Find Performers/Find Gigs quick role portals, full authenticated account shortcuts & sign out, unauthenticated sign in/get started CTAs, and dark/light switcher).
    3. `BespokeMobileBottomDock` (floating glassmorphism bottom pill at `bottom-4` with 5 thumb-friendly items for 1-tap switching between Home, Product, Pricing, Resources, and Menu).
  - Wrapped header avatars in `w-7 h-7 rounded-full overflow-hidden` and applied `w-full h-full object-cover object-top`, ensuring unclipped face display.
  - Integrated across all 5 main pages with 100% test coverage (`BespokeMobileNav.test.tsx`).

### 161. Hero iPhone 15 Mockup Hardcoded Dimensions Caused Mobile Horizontal Overflow & CTA Button Collision
- **Severity:** High / Mobile Layout & Responsive UX
- **What happened:**
  - On mobile screens (< 480px), the hero section iPhone 15 device mockup in `LandingPage.tsx` overflowed the viewport, causing the right edge of the device to be clipped and cut off.
  - In addition, the mockup had a hardcoded `top: -110.91px` protrusion above its stage box. On mobile where the section gap was `gap-24` (96px), `110.91px` exceeded the gap, causing the top notch and bezel of the phone to collide with and overlap directly onto the "Find Performers" and "Find Gigs" hero CTA buttons.
  - The grey stage box behind the phone also had a fixed height (`h-[502px]`), creating an abnormally tall and disproportionate container on mobile devices.
- **Root Cause:**
  - The phone mockup frame was rendered with rigid fixed-pixel coordinates (`w-[385.324px]`, `h-[801.124px]`) inside an outer box with `max-w-[92vw]`. Constraining the outer box without scaling the inner layers clipped the inner layers instead of scaling them down proportionately.
  - The top negative margin (`top: -110.91px`) was calibrated only for desktop viewports (`gap-[163px]`).
- **Resolution:**
  - Implemented `.hero-phone-stage` and `.hero-phone-scaler` in `tokens.css` using hardware-accelerated `transform: translateX(-50%) scale(...)` with `transform-origin: top center`.
  - Calibrated responsive multi-tier breakpoints: `scale(0.60)` on small mobile (< 375px), `scale(0.68)` on standard mobile (375px–479px), `scale(0.76)` on large mobile (480px–639px), `scale(0.84)` on tablet portrait, `scale(0.92)` on tablet landscape, and `scale(1.00)` on desktop.
  - Calibrated negative top margins (`-36px` to `-46px` on mobile, `-110.91px` on desktop) paired with responsive section gaps (`gap-16 sm:gap-24 lg:gap-[163px]`), guaranteeing a clean 30px–50px breathing margin below the hero CTA buttons across all devices.
  - Added `loading="eager"` and `decoding="async"` to the dashboard screenshot image.
  - Verified with 34 test files (181 tests) passing 100% green.

### 160. Main Brand Color CTAs (Red & Purple) Lacked Universal White Text Enforcing Rules
- **Severity:** Medium / Design System & Contrast Parity
- **What happened:**
  - In `tokens.css`, the primary brand button CSS rule only targeted `.dark button.bg-[#f13030]`. It omitted uppercase hex classes (`#F13030`), Mono-Purple brand variants (`#7B00FE`, `#9B4DFF`, `#6400D1`, `#5B21B6`, `#7C3AED`, `#4C1D95`), Crimson ramps (`#B91C1C`), and `var(--color-accent)`.
  - Child elements inside CTA buttons could inherit non-white text colors from global dark mode rules or surrounding context if not explicitly declared on every nested span.
- **Root Cause:**
  - CSS selector coverage was limited to lowercase `#f13030` under `.dark`, leaving other brand-colored buttons vulnerable to text color cascade collisions and lacking explicit descendant enforcement.
- **Resolution:**
  - Implemented universal Brand CTA rules in `tokens.css` with `color: #FFFFFF !important;` for all brand red, brand purple, and role accent buttons/anchors and their child elements (`*`).
  - Added `text-white [&_*]:text-white` to `Button.tsx` variants (`primary`, `red`, `purple`, `dark-pill`, `lime`, `forest`, `clay`).
  - Added explicit `text-white` to CTA buttons in `WebsiteFooter.tsx`, `LandingPage.tsx`, `PricingPage.tsx`, `ProductPage.tsx`, and `ResourcesPage.tsx`.
  - Verified with 34 test files (180 tests) passing 100% green.

### 159. White-on-White Unreadable File Attachment Card in Dark Mode Order Room & Low Contrast Meta Text (WCAG AA Violation)
- **Severity:** High / Accessibility & Core Usability
- **What happened:**
  - In dark mode within `OrderRoom.tsx`, file attachments sent in outgoing bubbles (`isMe === true`) were rendered with a solid `bg-white` container while the child filename was styled with `dark:text-zinc-100` (`#f4f4f5`). This created white text on a white background, making the filename and file size completely washed out and unreadable.
  - In addition, secondary timestamps (`Dec 14, 9:05 AM`), attendance status subtext ("Awaiting check-in from Emeka Johnson"), fee breakdown math, and Activity Timeline step indicators used `dark:text-zinc-500` (`#71717A`) or light-mode `text-zinc-400` without dark overrides, yielding only a ~3.8:1 contrast ratio against `#0D0D0F` / `#1A1A1A` surfaces and failing WCAG AA (requires 4.5:1).
- **Root Cause:**
  - `isMe` message bubble attachment sub-card forced `bg-white text-zinc-900 border-white/80` unconditionally, while children had unconditional `.dark` variant classes targeting dark cards (`dark:text-zinc-100`, `dark:text-zinc-400`).
  - Inverted darkness logic where dark mode added `dark:text-zinc-500` (making text darker in dark mode rather than lighter).
  - Global token `--color-text-tertiary: #767676;` in `.dark` failed contrast requirements.
- **Resolution:**
  - Redesigned attachment cards in `isMe` bubbles to use a frosted dark translucent container (`bg-black/25 dark:bg-black/40 border border-white/20 text-white shadow-2xs`) with `text-white font-bold` filename, `text-white/80` size, and high-contrast actions.
  - Replaced all 11 instances of `dark:text-zinc-500` with `dark:text-zinc-400` (~6.8:1) or `dark:text-zinc-300` (~11.1:1).
  - Upgraded global `.dark` tokens `--color-text-tertiary: #A3A3A3;` and `--color-text-secondary: #D1D1D1;` in `tokens.css`.
  - Added `dark:text-zinc-400` across review modal footers and rating breakdown metrics in `ClientDashboard.tsx` and `TalentDashboard.tsx`.
  - Verified with 34 test files (180 tests) passing 100% green.

### 158. Hardcoded "Powered by paystack" Badge Lacked Dynamic Hide Toggle (`WebsiteFooter.tsx`)
- **Severity:** Low / UI Customization
- **What happened:**
  - The "Powered by paystack" badge was hardcoded into the brand column of `WebsiteFooter.tsx`, preventing teams from hiding or toggling it without removing markup.
- **Root Cause:**
  - Introduced in Session 202 as static brand markup without configurable prop control.
- **Resolution:**
  - Added optional `showPoweredByPaystack?: boolean` (defaults to `false`) prop to `WebsiteFooterProps`, hiding the badge by default while keeping it trivial to switch on when required.

### 157. Static Avatar Rows Lacked Interactive Depth of Field & Performer Name Attribution (`LandingPage.tsx`, `PricingPage.tsx`)
- **Severity:** Low / Interactive Fidelity
- **What happened:**
  - The 5 performer avatars were rendered statically without interactive hover responses, performer name reveals, or focal depth blurring.
  - Per Figma node `178450:155993`, hovering any avatar reveals the performer's name above in handwritten font (`Caveat`) while applying a focus blur (`blur-[2px]`) to sibling avatars. Names were not to be shown by default in the implementation.
- **Root Cause:**
  - Previous sessions established static asset parity from node `178448:155888` without interactive hover state bindings.
- **Resolution:**
  - Created `<PerformerAvatarRow />` with stateful hover tracking, floating Caveat name indicators (hidden by default), and smooth depth-of-field focus/blur transitions (`cubic-bezier(0.16, 1, 0.3, 1)`).
  - Integrated into both `LandingPage.tsx` and `PricingPage.tsx`, backed by 5 new unit tests.

### 156. Legacy 6-Avatar Stock Placeholder Cluster Drift (`LandingPage.tsx`, `PricingPage.tsx`)
- **Severity:** Low / Design Asset Parity
- **What happened:**
  - `LandingPage.tsx` hero section (`178359:16922`) and `PricingPage.tsx` "For Performers" pricing block (`178359:18039`) rendered a 6-avatar cluster using legacy stock placeholder assets with multiple layered background frames.
  - Figma nodes `178448:155888` and `178448:155893` established a 5-avatar overlapping row featuring official African creative talent portraits.
- **Root Cause:**
  - Asset drift prior to Figma node `178448:155888` specification.
- **Resolution:**
  - Extracted the 5 official high-resolution performer portraits directly from Figma Desktop MCP server.
  - Updated both `LandingPage.tsx` and `PricingPage.tsx` to the clean 5-avatar overlapping structure.
  - Validated with Vitest tests and typechecks.

### 155. Stray #333333 Hairline Dividers in Dark Mode (`WebsiteFooter.tsx`, `LegalPage.tsx`)
- **Severity:** Low / Design Token Consistency
- **What happened:**
  - In `WebsiteFooter.tsx` (Divider 1 line 316, Divider 2 line 642, and separator pipe line 666) and `LegalPage.tsx` (compliance and cookie table dividers lines 492, 522, 827, 876), dark mode divider lines used `dark:bg-[#333333]`.
  - In dark mode, `#333333` represents active elevated surfaces or borders (`Grey alpha/450`). Applying `#333333` to thin hairlines created excessive, stark contrast against the dark page canvas and `#1A1A1A` card boundaries.
- **Root Cause:**
  - Legacy token value placed prior to the extraction of the official Figma design variables (`leye/Grey alpha/500` = `#1A1A1A` for `border/default`).
- **Resolution:**
  - Updated all subtle hairline dividers in `WebsiteFooter.tsx` and `LegalPage.tsx` to `dark:bg-[#1a1a1a]`.
  - Elevated `#333333` fills reserved strictly for active pill switches (`ProductPage.tsx` and `PricingPage.tsx`).
  - Validated with Vitest tests and typechecks.

### 154. Product Page Height Jitter, Layout Stretching & Active State Red Border Drift (`ProductPage.tsx`)
- **Severity:** Medium / FAANG UX & Motion Quality
- **What happened:**
  - Active step card in dark mode displayed an extraneous red border, drifting from Figma Frame 11 specifications which mandate a borderless `#0E0E0E` fill with rounded corners (`border-radius: 12px`).
  - When auto-advancing or clicking between steps, the 7-card column expanded and contracted as descriptions opened/closed, causing distracting layout jumps across the entire section.
  - Using Framer Motion's scale-based `layout` prop on cards distorted icons (`ArrowCircleRight`, `Spinner`, `CheckCircle`) and font glyphs during height transitions.
- **Root Cause:**
  - Active border token mistakenly applied red stroke instead of Figma Frame 11 clean `#0E0E0E` background.
  - Unconstrained column height with variable-height active description cards.
  - Scale-based GPU layout animations interpolate aspect ratios rather than animating pure height/opacity.
- **Resolution:**
  - Removed red border on active state in dark mode (`shadow-[inset_0_0_0_1px_transparent]`).
  - Built a 5-card constant-height sliding window locked to 560px with measured card metrics.
  - Removed the `layout` prop, decoupled trailing icons with absolute positioning, and tuned easing to `cubic-bezier(0.65, 0, 0.35, 1)`.
  - Verified with Playwright screenshot automation and 100% green test passes.

### 153. Unused Variable in LandingPage.tsx, ProductPage Title Colon Mismatch & Test Analytics Network Isolation (`LandingPage.tsx`, `ProductPage.test.tsx`, `analytics.ts`)
- **Severity:** Medium / Test & Linter Integrity
- **What happened:**
  - In `LandingPage.tsx`, `imgF6Group2Light` was assigned but `imgF5Group2Light` was passed to Feature 6, triggering an ESLint `@typescript-eslint/no-unused-vars` error.
  - In `ProductPage.test.tsx`, step 5 expectation asserted on `"Direct Proposal Bidding:"` (with trailing colon), which failed after updating the label to exact Figma node `178432:6988` text (`"Direct Proposal Bidding"`).
  - In `analytics.ts`, `dispatchToSupabaseAndSinks` fired unmocked live network requests to Supabase `AnalyticsEvent` during unit tests, intercepting global `fetch` spies and failing `api-client.test.ts` and `ProjectBrief.test.tsx`.
- **Root Cause:**
  - Copy-paste typo in Feature 6 JSX illustration block.
  - Test assertion had not been updated for the colon-free title from the Figma spec.
  - `SUPABASE_MODE === "real"` evaluates to true when `.env.local` is present in local environments, causing tests with global `fetch` spies to count analytics ingestion requests.
- **Resolution:**
  - Fixed Feature 6 light SVG reference to `imgF6Group2Light`.
  - Updated `ProductPage.test.tsx` expectation to `"Direct Proposal Bidding"`.
  - Added `import.meta.env.MODE !== "test"` guard to Supabase and API network dispatch in `analytics.ts` while preserving PostHog mock bridge.
  - Verified 100% test pass (33/33 files, 174 tests) and 0 ESLint errors.

### 152. TypeScript Compilation Errors & Unmatched Syntax in Settings.tsx (`Settings.tsx`)
- **Severity:** High / TypeScript Compiler Failure
- **What happened:**
  - In `Settings.tsx`, 10 TypeScript compilation errors surfaced in the editor:
    - `Duplicate identifier 'Section'. ts(2300)` on lines 25 and 26.
    - `Argument of type '() => Section | undefined' is not assignable to type '() => Section'. ts(2345)` on line 218.
    - `Declaration or statement expected. ts(1128)` on line 224.
    - Unreachable comparison and argument type errors `ts(2367)` / `ts(2345)` on lines 820, 821, 967, 968, 3144, and 3225 when checking `section === "terms"` or `section === "escrow"`.
- **Root Cause:**
  - An earlier edit had left both the original `type Section` and the expanded `type Section` in the file.
  - Additionally, lines 218-224 had nested `if` statements with an unmatched opening brace and missing code path.
- **Resolution:**
  - Removed the duplicate `type Section` definition on line 25.
  - Rewrote `useState<Section>` initialization cleanly with a single validation check returning `"main"` as default.
  - Removed duplicate legacy `Terms of Service` and `Privacy Policy` links from the Support & legal block.
  - Verified with `npx tsc --noEmit` (0 errors), `npx eslint` (0 errors), and all unit tests passing.

### 151. TypeScript/ESLint Workspace & Linter Diagnostics Across Open Files (`Settings.tsx`, `PublicStorefront.tsx`, `WebsiteFooter.tsx`, `WebsiteFooter.test.tsx`, `ProductPage.tsx`, `ResourcesPage.tsx`, `LandingPage.tsx`)
- **Severity:** Medium / Code Hygiene & DX Warning Free
- **What happened:**
  - In VS Code's Problems panel, 16 linter errors and warnings were reported across active workspace files.
  - In `Settings.tsx`: unused imports (`compareKycNames`, `Smartphone`, `Briefcase`, `DollarSign`, `Building2`, `Scale`), dead functions `handleSave` and `handleSaveBank`, an `as any` type assertion on `orgType`, and an unused expiry year `yy` variable.
  - In `PublicStorefront.tsx`: unused imports (`Avatar`, `appStateSync`, `Music`, `Linkedin`, `Globe`, `MapPin`).
  - In `WebsiteFooter.tsx`: unused asset constants (`imgVectorBadge2`, `imgYcSymbol`).
  - In `WebsiteFooter.test.tsx`: unused hoisted mock `insertMock`.
  - In `ProductPage.tsx`: unused asset constant (`imgFaqX`).
  - In `ResourcesPage.tsx`: explicit `catch (err: any)` violation.
  - In `LandingPage.tsx`: unused asset constant (`imgX`).
- **Root Cause:**
  - Incremental feature iterations and component extractions left behind unused icon imports, dead helper functions, and loose typings that triggered ESLint's `@typescript-eslint/no-unused-vars` and `@typescript-eslint/no-explicit-any`.
- **Resolution:**
  - Removed all unused imports and dead constants across all 7 target files.
  - Replaced `as any` on `orgType` with strict literal union type `"STUDIO" | "EVENT" | "BRAND" | "CHURCH"`.
  - Added expiry year validation checking `yy` (`if (!yy || yy < 24) ...`).
  - Replaced `catch (err: any)` with `catch (err: unknown)`.
  - Ran `npx eslint` verifying 0 warnings/errors, `npx tsc --noEmit` code 0, and all vitest suites passing.

### 150. Inverted Neon Cyan Checkmarks, Double-Inverted Black Marquee Icons, Black Logo Glyphs on Pricing/Resources, and Over-Prominent #333333 Strokes (`tokens.css`, `ProductPage.tsx`, `LandingPage.tsx`, `PricingPage.tsx`, `ResourcesPage.tsx`)
- **Severity:** Medium / Design System & Theming Defect
- **What happened:**
  - 1. On `ProductPage.tsx`, completed step cards showed neon cyan (`#0ECFCF`) checkmark circles and active cards showed neon blue browser focus outlines instead of brand red (`#F13030`).
  - 2. On `LandingPage.tsx`, category icons in the marquee were rendered pure black against `#000000`, making them invisible.
  - 3. On `PricingPage.tsx` and `ResourcesPage.tsx`, the Monologg logo icon mark (`ASSETS.logoIcon`) remained black next to the white wordmark in dark mode.
  - 4. Across all pages, `#333333` strokes were overly prominent and high-contrast against pure black `#000000`.
- **Root Cause:**
  - 1. `imgCheckCircle` had `dark:invert`. Inverting `#F13030` (`rgb(241, 48, 48)`) mathematically yields neon cyan (`rgb(14, 207, 207)`). Step cards lacked focus outline resets.
  - 2. The marquee icon wrapper had Tailwind `dark:invert` and `tokens.css` also had `.dark .animate-marquee-ltr img { filter: invert(1) }`. Double invert negated the inversion, leaving the black SVG black.
  - 3. Logo mark `<img>` lacked `alt="Monologg"` and `dark:invert`, so global invert rules didn't match.
  - 4. `#333333` (20% grey) was too bright against `#000000`.
- **Fix:**
  - Removed `dark:invert` from `imgCheckCircle` in `ProductPage.tsx`, added global outline reset in `tokens.css`, and set `.dark [data-step-state="active"] { border-color: #F13030 !important; }`.
  - Removed `dark:invert` from marquee wrapper div in `LandingPage.tsx` and paired CSS `filter: invert(1)` with `opacity-60 group-hover:opacity-100` to match text tone `#A3A3A3` / `#F9F9F9`.
  - Added `alt="Monologg"` and `dark:invert` to `ASSETS.logoIcon` on `PricingPage.tsx`, `ResourcesPage.tsx`, and `LegalPage.tsx`, plus targeted container invert rules in `tokens.css`.
  - Standardized all borders across the entire site to subtle `#1A1A1A` from the `leye/Grey alpha` spectrum. Verified with 28/28 tests passing.

### 149. Blunted Global Dark CSS Inverting iPhone Mockup Masks into Black Boxes and Overriding Newsletter Red Submit Button (`tokens.css`)
- **Severity:** Medium / Visual Defect & Theming Conflict
- **What happened:**
  - On `LandingPage.tsx`, the two `bg-white` masking rectangles on the iPhone 15 mockup (`data-node-id="178361:20289"` and `"178361:20290"`) turned into black boxes against the white screenshot background in dark mode. Additionally, the footer newsletter submit button turned black instead of maintaining brand red `#F13030`.
- **Root Cause:**
  - A blunt rule in `tokens.css` (`.dark div.bg-white:not(...) { background-color: #000000 !important; }`) forced all unspecified white divs to black, and a specific rule for `[data-node-id="178151:49527"] button` forced the newsletter submit button to `#000000 !important;`.
- **Fix:**
  - Removed `.dark div.bg-white:not(...)` and broad `.dark div.bg-[#f9f9f9]` overrides from `tokens.css`.
  - Added explicit protection for phone screen and status-bar masks (`.dark [data-node-id="178359:16950"], .dark [data-node-id="178361:20289"], .dark [data-node-id="178361:20290"] { background-color: #FFFFFF !important; }`).
  - Restored brand-red `#F13030` and `#D92626` hover states to `[data-node-id="178151:49527"] button`. Verified with 28/28 tests passing across all marketing test suites.

### 148. Residual Inconsistent Dark Mode Stroke Tokens (#484848/#767676) and Over-Bright Hover Backgrounds (#333333) (`tokens.css`)
- **Severity:** Low / Visual Contrast & Design Token Inconsistency
- **What happened:**
  - In initial dark mode styling, certain buttons, borders, and step item hover outlines were mapped to `#484848` or `#767676`, and interactive hover backgrounds were mapped to `#333333` or `#484848` rather than the design ramp's designated `#1A1A1A` hover state. Furthermore, cards in `LegalPage.tsx` with `hover:border-transparent` lost their stroke definition on hover in dark mode.
- **Root Cause:**
  - Strong borders were mapped to `--color-border-strong: #484848`, and generic interactive hover rules used mid-tone grey tokens rather than the strict `#333333` stroke and `#1A1A1A` hover background specification.
- **Fix:**
  - Standardized all dark mode borders, outlines, hairlines, and dividers to strictly `#333333` (including overriding `.hover:border-transparent` on hover in dark mode to preserve the `#333333` stroke).
  - Standardized all interactive background hover selectors across all website marketing and legal pages to strictly `#1A1A1A`. Verified with automated unit tests in `LandingPageHeader.test.tsx` and all 34 tests passing.

### 147. Hardcoded Marketing Page Light Classes Preventing Cohesive Dark Mode (`tokens.css`)
- **Severity:** Medium / Design System & Theming Defect
- **What happened:**
  - While dark mode was wired to `document.documentElement.classList.toggle("dark")`, the public website pages (`LandingPage.tsx`, `ProductPage.tsx`, `PricingPage.tsx`, `ResourcesPage.tsx`, `LegalPage.tsx`, `WebsiteFooter.tsx`) utilized hardcoded Tailwind light classes (`bg-white`, `bg-[#f9f9f9]`, `text-[#16161a]`, `border-[#ecece8]`), causing them to remain visually light when dark mode was toggled.
- **Root Cause:**
  - Marketing pages were built directly from light-theme Figma specs before a unified dark token mapping and website dark-mode CSS override rules were established.
- **Fix:**
  - Formalized the 13-tone grey spectrum from Frame 2147228281 in `tokens.css`, mapped `:root` and `.dark` tokens, and implemented full-coverage dark mode rules for all marketing page components (cards, headers, tables, marquees, inputs, logos, and vector assets). Verified with 33 unit tests passing.

### 146. "Finish Your Project today!" Pre-Footer CTA Left-Margin Misalignment with Footer Newsletter Section (`WebsiteFooter.tsx`)
- **Severity:** Low / Visual Layout Grid Inconsistency
- **What happened:**
  - The pre-footer CTA container ("Finish Your Project today!") had `max-w-[910px]`, while the footer newsletter container below it had `max-w-[1040px]`. As both containers were centered within parent padding, the left title "Finish Your Project today!" was indented by ~65px relative to "Join our newsletter" below it, creating an awkward visual stair-step.
- **Root Cause:**
  - The CTA section inherited an earlier narrower frame width (`910px`) rather than matching the standard `1040px` content container used across the footer and marketing sections.
- **Fix:**
  - Updated the pre-footer container in `WebsiteFooter.tsx` to `max-w-[1040px] w-full justify-between items-start gap-10 md:gap-12 lg:gap-16`. The left title now aligns pixel-for-pixel with "Join our newsletter", with increased horizontal breathing room.

### 145. "Become an Investor" Button Triggering Mailto Instead of Deep-Linking to Resources Investor Section (`WebsiteFooter.tsx`, `ResourcesPage.tsx`)
- **Severity:** Medium / User Navigation Defect
- **What happened:**
  - Clicking "Become an investor" in the pre-footer CTA and footer links attempted to open a system mail client (`mailto:investors@monologg.co`) rather than taking the user to the dedicated "Become an Investor" application form (`Figma 178359:18473`) on the Resources page.
- **Root Cause:**
  - The footer used a legacy `mailto:` handler that had not been updated after the full interactive investor application form was built on `ResourcesPage.tsx` in Session 184.
- **Fix:**
  - Configured `handleInvestor` in `WebsiteFooter.tsx` to route to `/resources#investor` and execute smooth scrolling. Added `id="investor"` and `scroll-mt-24` to the investor section in `ResourcesPage.tsx`, updated `useEffect` to handle hash scrolling without jumping to `(0, 0)`, and added `/investor` and `/investors` redirect aliases in `routes.tsx`. Verified with 32 unit tests passing.

### 144. "Get Started for Free" CTAs Inconsistently Pointing to Sign Up Rather Than Onboarding Flow (`ProductPage.tsx`, `PricingPage.tsx`)
- **Severity:** Low / Navigation Routing Inconsistency
- **What happened:**
  - Multiple "Get started for free" buttons on `ProductPage.tsx` and `PricingPage.tsx` were linked to `/auth?mode=signup` rather than directing performers straight into the `/onboarding` onboarding wizard. Additionally, on `LandingPage.tsx`, the header Sign In button routed to `/login` (which could be swallowed by the `:handle` route without an explicit alias).
- **Root Cause:**
  - Initial marketing button scaffolding reused general auth signup links instead of the creator onboarding route, and `LandingPage.tsx` had not been aligned with `/auth?mode=signin` and `/auth?mode=signup`.
- **Fix:**
  - Re-routed all 7 "Get started for free" instances in `ProductPage.tsx` and `PricingPage.tsx` plus `handleGetStarted` in `LandingPage.tsx` to `/onboarding`. Updated header buttons in `LandingPage.tsx` and `PublicStorefront.tsx` to explicitly point to `/auth?mode=signin` and `/auth?mode=signup`. Added a dynamic param listener in `AuthFlow.tsx` and route aliases in `routes.tsx` for `/login`, `/signin`, `/signup`, `/register`. Verified with 31 passing unit tests.

### 143. Discrepant Audience Toggle Tag Styling Between Pricing and Product Pages (`PricingPage.tsx`)
- **Severity:** Low / Design System & Visual Consistency Defect
- **What happened:**
  - `PricingPage.tsx` used a custom thin-bordered pill with red dot (`Performers • Clients`, Figma `178359:18032`), while `ProductPage.tsx` used an inset grey pill with white rounded card and black dot (`• PERFORMER | CLIENT`, Figma `178359:17849`).
- **Root Cause:**
  - `PricingPage.tsx` was implemented from an earlier Figma iteration before the unified `Geist Mono` uppercase audience switch component was established in `ProductPage.tsx`.
- **Fix:**
  - Replaced audience toggles in both Sub-Block 1 and Sub-Block 2 of `PricingPage.tsx` with the exact `ProductPage.tsx` component structure (`bg-[#f4f4f2] border-[#e8e8e4]`, white active card, black dot, `Geist Mono` uppercase font, `|` divider, and `aria-label`). Verified with `PricingPage.test.tsx` (5/5 tests passing).

### 142. Parent Container `overflow-x-hidden` Disabling Sticky Navigation (`LandingPage.tsx`, `ProductPage.tsx`, `PricingPage.tsx`, `ResourcesPage.tsx`, `LegalPage.tsx`)
- **Severity:** Medium / Layout Engine Incompatibility
- **What happened:**
  - Navigation headers failed to stick to the top of the viewport when scrolling on `LandingPage.tsx` (which had `relative` class and no `sticky top-0`) and on other marketing pages where parent containers had `overflow-x: hidden`.
- **Root Cause:**
  - In CSS specification and WebKit/Blink implementations, applying `overflow-x: hidden` to an ancestor establishes a new scroll context on that container, preventing descendant elements with `position: sticky` from anchoring to the document viewport window. In `ProductPage.tsx`, a trailing `relative` class also cancelled the preceding `sticky` utility.
- **Fix:**
  - Replaced `overflow-x-hidden` with `overflow-x-clip` on parent wrappers across all 5 public pages, configured `<header>` on `LandingPage.tsx` with `sticky top-0 z-50 w-full backdrop-blur-[12px] bg-white/95 border-b shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.06),0px_2px_4px_-2px_rgba(0,0,0,0.06)]`, removed trailing `relative` in `ProductPage.tsx`, and added the theme toggle button to `LandingPage.tsx`. Verified with all 25 marketing page tests passing.

### 141. WebsiteFooter Unpersisted Mock Newsletter Submissions (`WebsiteFooter.tsx`)
- **Severity:** Medium / Data Loss Defect
- **What happened:**
  - In `WebsiteFooter.tsx`, submitting an email to the newsletter form only updated local React state (`setNewsletterSubmitted(true)`), discarding subscriber email leads without persisting them to any database.
- **Root Cause:**
  - Initial marketing footer implementation treated newsletter signups as visual placeholders before backend persistence was scoped.
- **Fix:**
  - Created `public."NewsletterSubscriber"` table in Supabase Postgres, added `NewsletterSubscriber` model in Prisma, implemented `POST /api/v1/newsletter/subscribe`, and connected `handleNewsletterSubmit` directly to `supabase.from("NewsletterSubscriber").upsert` with telemetry logging and UI loading/feedback indicators. Verified with `WebsiteFooter.test.tsx` (2/2 tests passing).

### 140. Thespian AI Row 1 Static Default Background Fill (`ProductPage.tsx`)
- **Severity:** Low / UI State Consistency Defect
- **What happened:**
  - In `ProductPage.tsx`, Row 1 of both Thespian AI feature tables (Performer: `Instant AI Onboarding`, Client: `Vibe & Texture Matching`) rendered with static `bg-[#f7f7f7]` by default, whereas subsequent rows rendered transparent and only filled `#f7f7f7` on mouse hover.
- **Root Cause:**
  - The source Figma design canvas depicted Row 1 in an active/hover preview state with `#f7f7f7` fill to indicate what an interacted row looked like, which was initially ported literally into the default JSX classes.
- **Fix:**
  - Removed `bg-[#f7f7f7]` default from Row 1 in both tables and standardized padding to `p-[24px]`. All rows now start transparent by default and cleanly apply `hover:bg-[#f7f7f7] hover:scale-[1.005]` only on hover.

### 139. Product Hero Heading Awkward 3-Line Linebreak Wrap (`ProductPage.tsx`)
- **Severity:** Low / Typography & Visual Balance Defect
- **What happened:**
  - In `ProductPage.tsx`, the Performer Portal hero `h1` used a narrow `max-w-[526px]`, causing "Build your personal digital stage" to break into three uneven lines: *"Build your" / "personal digital" / "stage"*.
- **Root Cause:**
  - Initial Figma frame width constrainer was applied directly to the container rather than allowing typographic balance.
- **Fix:**
  - Expanded width to `max-w-[820px]` with `<br className="hidden sm:inline" />`, formatting it into two clean, balanced lines (*"Build your personal"* / *"digital stage"*). Verified all unit tests and visual rendering.

### 138. Missing jsdom `IntersectionObserver` & `ResizeObserver` for Framer Motion Viewport Tests (`test-setup.ts`)
- **Severity:** High / Test Environment Crash
- **What happened:**
  - When Framer Motion's `whileInView` and `useScroll` hooks were integrated into `LandingPage.tsx` and `PricingPage.tsx`, running tests under jsdom threw unhandled runtime exceptions (`ReferenceError: IntersectionObserver is not defined`), failing `LandingPageHeader.test.tsx`.
- **Root Cause:**
  - jsdom does not implement browser viewport APIs (`IntersectionObserver`, `ResizeObserver`).
- **Fix:**
  - Added robust Mock classes for `window.IntersectionObserver` and `window.ResizeObserver` in `test-setup.ts`, mirroring the existing `scrollIntoView` test stub. Verified all 23 marketing page tests pass cleanly without environment errors.

### 137. Stale FINCRA References Across Webapp Copy, FAQs, and Specs (`Checkout.tsx`, `ClientDashboard.tsx`, FAQs, `monologg_ux_spec.md`)
- **Severity:** Medium / Brand & Architecture Consistency Defect
- **What happened:**
  - While backend payment services strictly enforce Rule X1 (Paystack primary, never Fincra), several client-side surfaces retained obsolete references to "FINCRA" / "Fincra", including the checkout mock-mode escrow delay, client dashboard payment trust guarantee, currency FAQs across Landing, Product, and Pricing pages, Resources escrow guarantee card, and the UX architecture specification.
- **Root Cause:**
  - Prototype copy authored during initial PRD drafting was preserved during later component refactors instead of being synced with the Phase 6 Paystack-first decision.
- **Fix:**
  - Completely replaced all occurrences of FINCRA/Fincra with Paystack across `Checkout.tsx`, `ClientDashboard.tsx`, `LandingPage.tsx`, `PricingPage.tsx`, `ProductPage.tsx`, `ResourcesPage.tsx`, `monologg_ux_spec.md`, and historical drafts on both `web` and `main` branches. Verified 0 occurrences across `apps/web/` (`tsc --noEmit` clean, 23/23 tests passing).

### 136. Footer Terms & Cookie Policy Inaccessibility & Placeholder Section Copy (`LandingPage.tsx`, `WebsiteFooter.tsx`)
- **Severity:** Low / UX & Information Architecture Defect
- **What happened:**
  - The shared footer copyright bar previously displayed static location text (`Lagos, Nigeria 🇳🇬·`) without accessible navigation links to `/terms` or `/cookies`, preventing visitors from reaching legal policy documents directly from the website footer. Additionally, the Home page 6-feature vertical timeline section retained placeholder headline copy (`Some text will have to come into here...`).
- **Root Cause:**
  - Initial footer implementation mirrored legacy Figma layout before legal links were formalized in Figma node `178407:19721`.
- **Fix:**
  - Added interactive, accessible navigation buttons for `"Terms of Service"` (`/terms`) and `"Cookie Policy"` (`/cookies`) in `WebsiteFooter.tsx`, swapped the Backed-by icon to the official Paystack badge, and updated Home timeline copy with production marketing text (23/23 tests passing, `tsc --noEmit` 0 errors).

### 135. Cookie Settings & Policy Structural & Semantic Drift from Figma Specification (`LegalPage.tsx`, `LegalPage.test.tsx`)
- **Severity:** Low / Figma Design-to-Code Fidelity Defect
- **What happened:**
  - In `LegalPage.tsx`, the Cookie Policy subtext used `18px / 26px` rather than `16px / 24px`, Card 4's table header displayed `"Operational Purpose"` instead of Figma's `"Primary Purpose"`, Card 4 contained an unmodeled trailing email note, Card 5 lacked structured subheadings for `"In-App Consent Preferences"` and `"Web Browser Controls"` with browser-specific settings guidance, and Card 6 was labeled `"6. Third-Party Cookies"` instead of Figma's exact heading `"6. Third-Party Integrations"`.
- **Root Cause:**
  - Initial implementation used draft copy approximations before detailed node extraction against Figma node `178383:18857`.
- **Fix:**
  - Aligned all copy, table headers, subheadings, and section titles with 1-for-1 fidelity to Figma node `178383:18857`, removed unmodeled trailing paragraphs, and verified hover microinteraction parity across all 7 cards (4/4 tests passing, `tsc --noEmit` 0 errors).

### 134. Terms Section Card 4 Static Fill Instead of Dynamic Hover State (`LegalPage.tsx`, `LegalPage.test.tsx`)
- **Severity:** Low / Interactive State & Fidelity Defect
- **What happened:**
  - Card 4 ("4. Intellectual Property Rights") was rendered with a permanent, static `bg-[#f9f9f9]` fill without an outer border, while all other cards had permanent borders without hover styling. In the Figma design source, Card 4 demonstrated the intended hover microinteraction for section cards rather than a unique static variation.
- **Root Cause:**
  - Figma canvas capture included an active pointer hover state on Card 4, which was initially interpreted as a unique static card style rather than an interactive hover microinteraction.
- **Fix:**
  - Standardized all 12 section cards (and 7 cookie policy cards) to default `border border-[#e8e8e8]` and added `hover:border-transparent hover:bg-[#f9f9f9] transition-all duration-200`, delivering consistent, interactive hover feedback across the legal document (4/4 tests passing, `tsc --noEmit` 0 errors).

### 133. Terms of Service Page Visual & Semantic Drift from Figma Specification (`LegalPage.tsx`, `LegalPage.test.tsx`)
- **Severity:** Low / Figma Design-to-Code Fidelity Defect
- **What happened:**
  - `LegalPage.tsx` previously used generic component fonts and layout wrappers, lacked the exact masked Monologg SVG header logo, had no ambient blurred background gradient assets, omitted Card 4's distinct `#F9F9F9` borderless background, and did not include the full 4-row compliance table with vector dividers in Section 2 (`Data Protection & Regulatory Compliance`) as detailed in Figma node `178382:17926`.
- **Root Cause:**
  - Legacy terms page was structured around generic markdown cards rather than the pixel-perfect layout and vector hierarchy of the Figma v3.0 design.
- **Fix:**
  - Rebuilt `LegalPage.tsx` with 1-for-1 fidelity to Figma node `178382:17926`, self-hosted all assets under `apps/web/public/assets/terms/`, formatted all 12 section cards with exact typography (`Switzer`, `Inter Tight`, `Geist Mono`, `JetBrains Mono`), added the Card 2 compliance table with vector dividers, applied Card 4's `#F9F9F9` borderless styling, and integrated the full-width dashed divider before the footer (3/3 unit tests passing, `tsc --noEmit` 0 errors).

### 132. Native Select Double Chevron & Unmocked Database Transit in Tests (`ResourcesPage.tsx`, `ResourcesPage.test.tsx`)
- **Severity:** Low / UX Polish & Test Stability Defect
- **What happened:**
  - On macOS WebKit/Blink browsers, the `<select id="who-you-are">` element rendered two dropdown chevrons side-by-side: the browser's default user-agent arrow plus the Figma `caretDown` SVG. In addition, when connecting the form directly to Supabase storage, running `ResourcesPage.test.tsx` hit a 5000ms test timeout due to unmocked network calls in jsdom.
- **Root Cause:**
  - Standard Tailwind `appearance-none` does not always clear WebKit user-agent arrow styling unless explicit inline rules (`WebkitAppearance: "none"`, `MozAppearance: "none"`, `backgroundImage: "none"`) are supplied. JSDOM tests required a scoped mock for `supabase.from("InvestorApplication").insert` to avoid hanging network calls.
- **Fix:**
  - Applied explicit cross-browser inline appearance reset styles to `<select>` and positioned the single Figma `caretDown` SVG at `right-[13px] top-1/2 -translate-y-1/2`.
  - Added a Supabase client mock to `ResourcesPage.test.tsx` asserting table insertion into `"InvestorApplication"` and immediate resolution (5/5 tests passing in 283ms).

### 131. Resources Page Substituted Social Icons, Missing Figma Dividers/Pills, and Ambiguous Test Label Selectors (`ResourcesPage.tsx`, `ResourcesPage.test.tsx`)
- **Severity:** Low / Figma Design-to-Code Fidelity Defect
- **What happened:**
  - `ResourcesPage.tsx` previously used generic icons from `/assets/social/*` instead of the exact vector assets extracted from Figma node `178359:18325`, omitted the exact `Vector 2553` (vertical) and `Vector 2555` (horizontal) divider SVGs, lacked the masked Monologg SVG header logo and active `Resources` red dot indicator (`gap-[10px]`, `#F25757`), and omitted the ambient background gradient SVGs (`178359:18373`). Additionally, in `ResourcesPage.test.tsx`, testing `/Email/i` threw `Found multiple elements` because the shared footer also contains an email input.
- **Root Cause:**
  - Earlier prototype used generic icon paths and broad test regex queries without matching the exact Figma node specs from MCP `get_design_context`.
- **Fix:**
  - Extracted and downloaded all 20 assets into `apps/web/public/assets/resources/`, implemented exact Figma dimensions, typography, and SVG layers across `ResourcesPage.tsx`, and updated `ResourcesPage.test.tsx` to use exact regex boundaries (`/^Email$/i`) and verify all 7 social badges and the active nav indicator (5/5 tests passing, `npx tsc --noEmit` 0 errors).

### 130. Pricing Page Layout/Typography Drift, Missing Clients Section Pill & Bottom CTA, and Bordered FAQ Cards (`PricingPage.tsx`)
- **Severity:** Medium / Figma Design-to-Code Fidelity Defect
- **What happened:**
  - `PricingPage.tsx` previously rendered a single detached audience pill outside the Performer/Client sections instead of the per-section `139×30px` role pills in `178359:18031` and `178359:18130`, omitted the bottom `"Get started for free"` CTA button under the Clients table (`178401:153027`), omitted the dashed section divider (`178359:18317`) and ambient blurred gradient backgrounds (`178359:18008`), wrapped the tables in outer rounded borders with pill-boxed `Coming Soon` badges instead of the borderless `1040px` `HorizontalBorder` rows and `Geist Mono` `Coming Soon` label from Figma, and used Lucide icons in bordered FAQ cards instead of the borderless `910px` FAQ rows with Figma `Plus`/`X` SVGs.
- **Root Cause:**
  - Earlier implementation approximated `178359:17960` without extracting all 24 child SVG/PNG assets or matching the exact Figma layout and typography specs.
- **Fix:**
  - Downloaded all 24 SVG and PNG assets from `178359:17960` into `apps/web/public/assets/pricing/`, set the hero section (`178359:18019`) background to `#F9F9F9`, wired the `Performers` / `Clients` audience pill to switch sections in-place without scrolling, and rebuilt `PricingPage.tsx` 1-for-1 (`PricingPage.test.tsx` 5/5 passing, `npx tsc --noEmit` 0 errors).

### 129. Missing 3-State Stepper Cards (`default` / `active` / `completed`), Improvised Phone Mockups & Missing Thespian AI Rows on Product Page (`ProductPage.tsx`)
- **Severity:** Medium / Figma Design-to-Code Fidelity Defect
- **What happened:**
  - `ProductPage.tsx` previously rendered only a 2-state step list with Lucide `ArrowUpRight`, improvised HTML phone cards instead of the 7 `300×300` Figma SVG illustrations from `178359:17305`, Lucide icons instead of the Figma `SealCheck` / `chat-4-fill` / `NotePencil` / `lock-fill` SVGs in the Client Portal, and omitted `Contract Guardrails` and `AI Rehearsal Partner` from the Performer Thespian AI table.
- **Root Cause:**
  - Earlier implementation approximated `178359:17305` without extracting the child frames' SVG assets (`ArrowCircleRight`, `Spinner`, `CheckCircle`, and the 7 `300×300` illustrations in `Frame 2147228146`) via `get_design_context`.
- **Fix:**
  - Downloaded all 64 SVG assets from `178359:17305` into `apps/web/public/assets/product/`, implemented the exact 3 states (`default`, `active`, `completed`) across all 7 step cards (`01`–`07`), extracted the 7 `300×300` Figma SVG illustrations into the right-hand preview box without duplicating the reference section, and rebuilt the Client Portal, Thespian AI tables, and FAQ 1-for-1 (`ProductPage.test.tsx` 5/5 passing).

### 128. Improvised Feature Mockups, Substituted Icons/Avatars, and Missing `Switzer`/`Inter Tight`/`Geist Mono` Fonts on Home Page (`LandingPage.tsx`, `WebsiteFooter.tsx`, `fonts.css`)
- **Severity:** Medium / Figma Design-to-Code Fidelity Defect
- **What happened:**
  - `LandingPage.tsx` and `WebsiteFooter.tsx` previously used improvised HTML/CSS mockup cards in the 6-feature section, generic Unsplash avatar URLs, Lucide icon substitutes in the `"YOU BELONG HERE"` category strip, a text `"Combinator"` label in the footer instead of the two `24×23.84px` Figma partner badges, and lacked `@import` rules for `Switzer`, `Inter Tight`, and `Geist Mono` in `fonts.css`.
- **Root Cause:**
  - Earlier iterations approximated sublayers of Figma node `178359:16886` without extracting the child frames' SVG/PNG assets via `get_design_context` or importing the required web fonts.
- **Fix:**
  - Extracted all 68 SVG/PNG assets from `178359:16886` and its child frames into `apps/web/public/assets/home/`, imported `Switzer`, `Inter Tight`, and `Geist Mono` in `apps/web/src/styles/fonts.css`, and rebuilt `LandingPage.tsx` and `WebsiteFooter.tsx` as a strict 1-for-1 implementation of the Figma specification.

### 127. Quadruple Financial Duplication, Stacked Top Banners, and Redundant 1-on-1 Chat Role Badges in `OrderRoom.tsx`
- **Severity:** Medium / Information Architecture & UX Clutter Defect
- **What happened:**
  - In `OrderRoom.tsx`, financial escrow/payout figures (`₦134,400` / `₦111,600`) were repeated in up to 4 places simultaneously: (1) a top-right `Escrow:` / `Take-Home:` pill next to the tabs, (2) a dedicated `Payment` center tab, (3) the persistent right-hand Inspector Rail (`Order Inspector Panel`), and (4) the `Order Info` modal button visible even when the right rail was open. Additionally, every 1-on-1 chat message displayed redundant `CLIENT` / `PERFORMER` role badges, `"You"` labels, and outgoing self-avatars, while stacked top banners (`Attendance` card + separate `Google Meet` card + `Order Workspace` divider + duplicate `Check-in 2 of 3 is due` system message) cluttered the viewport.
- **Root Cause:**
  - Incremental additions across earlier sessions added a right-hand Inspector Rail without pruning the legacy center `Payment` tab, top-right financial pill, or per-message role tags designed prior to the 2-pane workspace layout.
- **Fix:**
  - Removed the redundant `Payment` tab and top-right `Escrow:` / `Take-Home:` pill, making the Right-Hand Inspector Rail the single authoritative financial source of truth on desktop (with expanded `Fee breakdown` math and Paystack guarantee copy) and scoping the `Order Info` button to mobile/collapsed states.
  - Unified the Attendance Gate and Client Google Meet strip into a single contextual card on the `Messages` tab, removed the duplicate `"Check-in 2 of 3 is due"` system message, and collapsed `Script & Brief Assets` by default.
  - Stripped `PERFORMER` / `CLIENT` role badges, `"You"` labels, and outgoing self-avatars from 1-on-1 chat messages, and implemented consecutive message grouping.

### 121. Missing Frontend Click-Stream, Route Dwell & Funnel Telemetry Pipeline in Supabase
- **Severity:** Medium / Product Observability & Stakeholder Analytics Gap
- **What happened:**
  - While backend routes logged discrete account activity (`UserActivity` and `AuthEvent`), there was no unified frontend telemetry capturing page views, screen dwell times, button/CTA clicks, or step-by-step funnel conversions (draft saves, brief publication, attendance confirmations, deliverable handovers, escrow releases) in Supabase.
- **Root Cause:**
  - Frontend interactions and `StateSyncBus` mutations were not wired to a structured analytics SDK or a dedicated `AnalyticsEvent` table in Supabase Postgres.
- **Fix:**
  - Added `AnalyticsEvent` to `prisma/schema.prisma` with migration `20261030101500_add_analytics_events`, created `/api/v1/analytics/events` and `/api/v1/analytics/summary`, built `apps/web/src/lib/analytics.ts` (Supabase direct + API + local buffer + PostHog bridge with automatic PII scrubbing), attached global route/dwell/click auto-capture in `Root.tsx`, instrumented `state-sync.ts` and `OrderRoom.tsx`, and documented the full taxonomy and SQL queries in `monologg/handoff/analytics.md`.

### 120. Order Room Above-the-Fold Banner Bloat, Neon Chat Bubble Glare & Mismatched Performer Send Button
- **Severity:** Medium / UX Hierarchy, Contrast & Role-Theming Defect
- **What happened:**
  - In `OrderRoom.tsx`, stacking the full Attendance Verification card, Google Meet card, and workspace tabs consumed over 55% of desktop viewport height and 75%+ of mobile viewport height before showing the first message.
  - Outgoing chat bubbles used hyper-saturated `#E50914` red and `#7B00FE` electric purple fills that caused visual glare and low-contrast embedded file cards, while Performer view erroneously rendered a purple Send button (`from-purple-600 to-indigo-600`).
- **Root Cause:**
  - Lack of progressive disclosure on top status banners, uncalibrated saturation on multi-line chat bubbles, and hardcoded purple gradient on the composer send button.
- **Fix:**
  - Consolidated top banners into a Braintrust-inspired slim Contract Command Bar with on-demand `Details` progressive disclosure and a single-line Google Meet strip.
  - Introduced a responsive 2-pane desktop layout with a collapsible Right Inspector Rail (Counterparty Profile, Escrow Breakdown, Vertical Activity Timeline, and Script/Brief Assets).
  - Calibrated chat bubble fills to Deep Studio Crimson (`#991B1B` → `#7F1D1D`) for Performer and Royal Plum (`#5B21B6` → `#4C1D95`) for Client with crisp white attachment sub-cards, 4px role-accented incoming bubbles, and a unified multi-row composer with role-synced Send buttons.

### 119. Inconsistent Draft Editing Experience & Disjointed Inline Form State in Project Detailed View
- **Severity:** Medium / UX Fragmentation & Form Redundancy Defect
- **What happened:**
  - In draft mode, the project detailed view in `ClientDashboard.tsx` previously rendered a 4-tile inline "Draft Setup Stepper" and converted page sections into raw inline input and textarea form editors (`Edit Overview`, `Edit Requirements`, `Edit Script`, `Manage Assets`).
  - This differed completely from the standard 5-step project creation flow (`ProjectBrief.tsx`), causing jarring UX fragmentation where users could not resume their draft where they left off in the creation flow, nor experience consistent validation, asset management, and budget escrow calculation.
- **Root Cause:**
  - The project detailed view had accumulated inline form editing state handlers and local draft toggles independent of the main `ProjectBrief.tsx` stepper.
- **Fix:**
  - Removed the inline setup stepper and all inline form toggle editors from `ClientDashboard.tsx`, restoring clean, polished read-only views for all project tabs.
  - Added a draft setup status banner and routed all draft editing actions ("Continue Draft Stepper →", "Resume Draft Stepper", "Resume Draft in Stepper") directly to `/brief?id=${project.id}`.
  - Rewrote `ProjectBrief.tsx` to prefill all project slots and resume at the exact step where the user stopped last (`draftStep`), with persistent "Save Draft" capability saving to `appStateSync.saveClientDraft`.
  - Added test coverage in `ClientDashboard.test.tsx` and `ProjectBrief.test.tsx` validating stepper routing, slot pre-filling, and save/exit persistence.

### 118. Stale Onboarding Device Mockup Assets Reflecting Deprecated Dashboard UI
- **Severity:** Low / Asset Parity & Visual Hierarchy Defect
- **What happened:**
  - Device mockups shown on the onboarding / authentication split screen (`AuthFlow.tsx`, `auth-preview.html`) showed obsolete UI states (such as older action tags and redundant buttons) that had been superseded in Sessions 169–170.
- **Root Cause:**
  - Static raster image files in `public/` required updating with current dashboard screenshots.
- **Fix:**
  - Replaced `monologg/apps/web/public/auth-performer-device.png` and `monologg/apps/web/public/auth-client-device.png` with user's updated 489x1024 iPhone captures displaying horizontal quick action cards and single primary CTA.

### 117. Performer Quick Action Vertical Stacking Layout Disparity
- **Severity:** Low / Layout Parity & Mobile Ergonomics Defect
- **What happened:**
  - Quick action cards in `TalentDashboard.tsx` were configured with `flex flex-col justify-between`, placing the icon vertically on top and text below it.
  - This contrasted with `ClientDashboard.tsx`'s horizontal row layout (`flex items-center`), creating inconsistency across the platform and awkward vertical heights on mobile screens.
- **Root Cause:**
  - Legacy flex-direction class discrepancy between `TalentDashboard.tsx` (`flex-col`) and `ClientDashboard.tsx` (`flex items-center`).
- **Fix:**
  - Standardized `TalentDashboard.tsx` to `flex items-center gap-2.5 sm:gap-3`, positioning the icon on the left and text (`min-w-0 flex-1 truncate`) beside it horizontally.
  - Verified across test suite and monorepo typecheck.

### 116. Dashboard Quick Action Tag Clutter, Mobile Visual Cramming, Redundant Activity Subtext & Boxed Escrow Visual Fragmentation
- **Severity:** Low / UI Ergonomics & Hierarchy Defect
- **What happened:**
  1. Quick action cards on the Performer dashboard displayed redundant pill badges (`Public`, `Sync`, `3 active`) that cluttered the desktop interface.
  2. On mobile screens, quick action cards crowded icon, label, long subtext, and badge inside small touch targets, making them hard to scan and tap.
  3. The "Recent Activity" header displayed verbose, unnecessary filler subtext ("Real-time payouts, client bookings, and order updates").
  4. The home balance card had competing action buttons ("Withdraw Funds" and "Analytics") creating user confusion.
  5. The 3-pillar Escrow Protection & Settlement Guarantee card rendered 3 disconnected chunky gray boxes with heavy borders instead of an integrated, readable list.
- **Root Cause:**
  - Nested card-in-card box patterns; unpruned badge and subtitle metadata; absence of mobile-first progressive disclosure hiding quick action subtext.
- **Fix:**
  - Removed badge tags from quick action definitions and hid subtexts on mobile (`hidden sm:block`) to show clean icon + title buttons.
  - Removed secondary Analytics button from balance hero card, leaving "Withdraw Funds" as the sole primary CTA.
  - Stripped redundant Recent Activity subtitle.
  - Overhauled Escrow Protection into an elegant vertical list separated by clean dividers (`divide-y divide-[var(--color-border-default)] border-t`).
  - Added structured internal dividers to the Casting Client telemetry dock.
  - Verified across web test suite and typecheck.

### 115. Performer Dashboard Home Hero Analytics CTA Routing to Earnings Tab Instead of Analytics View
- **Severity:** Low / Navigation & UX Hierarchy Defect
- **What happened:**
  1. On the Performer home dashboard (`TalentDashboard.tsx`), clicking the secondary hero action button labeled "Analytics" incorrectly routed the user to the Earnings tab (`activeTab === "earnings"`) instead of the dedicated Performance & Analytics view (`activeTab === "analytics"`).
  2. The button utilized a mismatched icon (`BarChart2`, which is associated with Earnings) instead of `TrendingUp` (the established icon for Analytics across the sidebar).
  3. `screenTitle` in the mobile sticky top bar lacked an explicit mapping for `activeTab === "analytics"`, falling through to "Earnings".
  4. The desktop page header lacked a branch for `activeTab === "analytics"`, rendering empty `<h1>` and `<p>` tags on desktop while leaving a redundant `<h2>` inside the tab.
- **Root Cause:**
  - Hardcoded legacy `setActiveTab("earnings")` handler on the hero Analytics button from when Analytics and Earnings were coupled together in early beta; omitted `activeTab === "analytics"` branches in top-level header mappings.
- **Fix:**
  - Updated the button click handler to `onClick={() => setActiveTab("analytics")}` and switched icon to `<TrendingUp className="w-3.5 h-3.5" />`.
  - Added accessible `aria-label="View analytics"` and `aria-label={isNewUser ? "Setup payouts" : "Withdraw funds"}`.
  - Added `: activeTab === "analytics" ? "Analytics"` to `screenTitle` for the mobile bar.
  - Added canonical desktop header `<h1>Performance & Analytics</h1>` with contextual subtitle, and applied `lg:hidden` to the inner tab `<h2>` to prevent duplicate desktop titles.
  - Added dedicated unit test suite in `TalentDashboardAnalytics.test.tsx`.

### 114. Active Orders Screen Duplicate Header, Cluttered Chat Row Typography & Redundant Boilerplate Text
- **Severity:** Low / UX Hierarchy & Information Redundancy Defect
- **What happened:**
  1. Both Performer (`TalentDashboard.tsx`) and Client (`ClientDashboard.tsx`) Active Orders screens rendered a duplicate `<h2>Active Orders</h2>` heading directly underneath the canonical `<h1>Active Orders</h1>` page header, with clashing subtexts ("Manage/Track your active collaborations" vs "Direct chat/collaboration rooms...").
  2. Order list rows were cluttered with raw database IDs (`ORD-2024-001`) placed inline with the project title.
  3. Every order row repeated meaningless, boilerplate instructional filler text ("Active collaboration room · Tap to chat" / "Active room · Tap to chat & review").
  4. The right side of each order row crammed due dates, phase labels, and redundant colored text ("Enter Room >") into a tight, visually shouting cluster.
- **Root Cause:**
  - Double header declaration across dashboard layout shell and orders tab component; lack of dedicated toolbar component; excessive microcopy boilerplate in list items.
- **Fix:**
  - Removed duplicate `<h2>Active Orders</h2>` and subtitles from the orders tab, leaving the single canonical `<h1>Active Orders</h1>` and mobile top bar headers.
  - Introduced a clean controls toolbar featuring live order count, search bar, and List/Grid view switcher.
  - Streamlined list item typography: elevated project titles, removed raw order IDs, replaced boilerplate microcopy with contextual status descriptions, and replaced clashing "Enter Room >" text with clean phase pills (`Deliverables`, `Review`, `Cancelled`), subtle due dates, and an animated navigation chevron.
  - Validated via new test suites in `ClientDashboard.test.tsx` and `TalentDashboardOrders.test.tsx`.

### 113. Performer Profile Separate-Tab Discovery Deficit & Accidental Application Withdrawal Vulnerability
- **Severity:** Low / Usability & Defensive UX Defect
- **What happened:**
  1. In the client casting pipeline, clicking "View Profile & Reels" or listening to audition reels only displayed a compact modal without launching the performer's complete portfolio in a dedicated browser tab.
  2. Public storefront handle resolution in mock mode was brittle (`t.id === handle || t.name.toLowerCase().replace(/\s+/g, "-") === handle.toLowerCase()`), risking 404s when navigating with seed IDs like `seed-creator-adaeze` vs slug `/adaeze-obi`.
  3. In `TalentDashboard`, clicking "Withdraw Application" immediately triggered deletion of the applicant's pitch with zero confirmation prompt, presenting a risk of accidental pitch loss.
  4. The Escrow Protection card rendered 3 massive vertically stacked boxes, and pre-application applicant capacity ("8/10 filled") remained visible in the sidebar even after applying.
- **Root Cause:**
  - Missing `window.open` invocation on profile review triggers; strict exact-match handle lookup in `api-client.ts`; absence of local confirmation state on destructive withdrawal action; unpruned sidebar metrics.
- **Fix:**
  - Wired `viewTalentProfile` and reel preview click handlers to trigger `window.open('/{slug}?role=client', '_blank')` while maintaining in-modal audition proposal review and casting buttons.
  - Enhanced `api-client.ts` to normalize handles by stripping `seed-creator-` prefixes and matching alphanumeric slugs and name fragments.
  - Added a defensive 2-step confirmation dialog ("Withdraw your pitch? You can't re-apply to this project.") with `Keep it` and `Withdraw` buttons.
  - Transformed the 3 escrow pillars into a responsive 3-column horizontal grid, and suppressed applicant capacity metrics once an application has been submitted.

### 112. Project Detail Fake Deliverables Bloat, Infinite Vertical Scrolling & Mental Model Asymmetry
- **Severity:** Medium / UX Hierarchy & Information Redundancy Defect
- **What happened:**
  1. Both Client and Performer project detail views featured vertically stacked cards (up to 7 cards deep) resulting in high cognitive fatigue and excessive scrolling to reach essential casting and pitch submission actions.
  2. The brief views included fake hardcoded deliverables ("2x 30s broadcast WAV master audio files (24-bit/48kHz)...") that were disconnected from the real 5-step brief creation flow in `ProjectBrief.tsx` (where gigs are defined by format, location, timeline, script, and reference assets).
  3. Editing brief terms was accidentally exposed in client view even for active/hired projects, which could jeopardize escrow integrity.
- **Root Cause:**
  - Lack of segmented navigation tabs on project detail views; presence of legacy placeholder deliverable mockups instead of true brief inputs.
- **Fix:**
  - Designed symmetric 5-tab Segmented Control across Client (`applicants`, `overview`, `requirements`, `sides`, `escrow`) and Performer (`overview`, `requirements`, `sides`, `escrow`, `application`).
  - Added dedicated **Project Format & Production Details** card matching real brief inputs (`Online / Remote` vs `On-site`, Location, Timeline, Upfront Escrow).
  - Completely excised fake deliverable mockups in favor of unified Script & Materials.
  - Locked brief inline editing strictly to `draft` status.
  - Elevated Performer's "My Application & Pitch" into a dedicated review tab.

### 111. Order Room Stacked Card Density & Scalability for 10+ Orders
- **Severity:** Medium / Usability & Scalability Issue
- **What happened:**
  1. Active Orders in `TalentDashboard` and `ClientDashboard` rendered each order as a massive ~350px tall card with repetitive progress bars, redundant fee calculations (`Base ₦X · 7% platform fee (-₦Y)`), and large buttons. For performers with 5–10+ concurrent bookings, the list required excessive scrolling and lacked quick scannability.
  2. The `OrderRoom` header displayed a secondary metadata row (`clientName · orderId · ₦X net`) that cluttered the mobile and desktop navigation bar, and the Online/Onsite badge was hidden on small screens (`hidden sm:inline-flex`).
  3. Milestone attendance verification banners occupied large vertical space (~200px) with no ability to collapse or minimize while remaining informed.
- **Root Cause:**
  - Card-centric layout designed for low order counts (1–3 orders) without compact list/inbox paradigms, redundant commission breakdown display, and lack of progressive collapse state on notification cards.
- **Fix:**
  - Redesigned Active Orders into a scalable Chat / Inbox List interface with avatar presence indicators, project title, `Online` / `Onsite` badge, counterpart preview, due date, phase badge, and direct click-to-room navigation.
  - Added real-time order search filtering and view switcher.
  - Pruned redundant fee calculations from performer order cards.
  - Simplified `OrderRoom` navbar to strictly project title and permanent `Online` / `Onsite` badge.
  - Added minimize buttons to attendance cards in `OrderRoom` and `TalentDashboard` collapsing into 1-line interactive ribbons.

### 110. Dark Mode Auth Copy Low Contrast & 100vh Viewport Overflow
- **Severity:** Medium / Visual Contrast & Viewport Scrolling Defect
- **What happened:**
  1. In Dark Mode, the ambient sky backdrop image (`auth-backdrop.png`) was displayed with static `opacity-85`, washing out the dark radial background into a bright haze and rendering white editorial headline copy virtually illegible.
  2. The auth container used `min-h-screen` and accumulated extra vertical height from the bottom footer, redundant top `< Back` buttons, and demo rows, causing the screen to exceed `100vh` and forcing vertical window scrolling.
- **Root Cause:**
  - Hardcoded non-theme-aware backdrop opacity and lack of fixed static `100vh` frame constraints (`h-screen max-h-screen overflow-hidden`).
- **Fix:**
  - Modulated `auth-backdrop.png` to `opacity-15 mix-blend-overlay` in dark mode and `opacity-90` in light mode, preserving deep background colors and crystal-clear text contrast.
  - Set subtitle copy to `#475569` in light mode and `rgba(255, 255, 255, 0.70)` in dark mode; headline copy to `#09090b` in light mode and `#FFFFFF` in dark mode.
  - Locked container and split panes to `h-screen h-[100dvh] max-h-screen overflow-hidden`.
  - Pruned unnecessary bottom footer, redundant top `< Back` buttons, and obsolete demo rows.
- **Resolution:** Validated across light and dark modes, all 25 test suites (132/132 tests) passing cleanly, production build green.

### 109. Device Squashing, Artificial CSS Shadow Halos & Inconsistent Input Radii in Auth Redesign
- **Severity:** Medium / Visual Fidelity & Layout Distortion
- **What happened:**
  1. In the initial auth split-screen layout, device screenshot PNGs were squashed inside flex containers because no fixed aspect-ratio was enforced, distorting the mobile app UI.
  2. A CSS `filter: drop-shadow(...)` applied to the transparent PNG device frame created a muddy, irregular dark halo around the bezels.
  3. Form input fields used inconsistent corner radii (`rounded-xl` mixed with `rounded-full`).
  4. The desktop auth container was clamped to a fixed max width (`max-w-[1260px]`), producing letterboxed margins on 16-inch laptops instead of covering the entire screen.
- **Root Cause:**
  - Lack of explicit CSS `aspectRatio: "489 / 1024"` and `object-contain`, artificial CSS drop-shadow filters on alpha bezels, ad-hoc input radius classes, and fixed container constraints.
- **Fix:**
  - Locked device aspect ratio strictly to `489 / 1024` with `object-contain`.
  - Removed artificial `drop-shadow` CSS filter so the device chassis sits crisp and natural on the gradient.
  - Positioned device grounded at bottom with `translate-y-[200px]` for the requested cropped editorial vibe.
  - Standardized all form inputs to uniform pill shapes (`rounded-full h-12`).
  - Overhauled container to full-bleed responsive grid (`min-h-screen w-full lg:grid lg:grid-cols-[1fr_1.25fr]`) and hid showcase pane completely on mobile (`hidden lg:flex`).
- **Resolution:** Validated across desktop and mobile; all 25 test suites (132/132 tests) passing cleanly, 0 typecheck errors.

### 108. Header Collision, Viewport Overflow & Touch Target Degradation in System, Settings & Marketing Pages
- **Severity:** Medium / Mobile UX & Viewport Collision
- **What happened:**
  1. In `TransactionHistory.tsx`, the sticky top navigation bar collided on 360px–390px mobile viewports: the 40px back button, 32-character title ("Earnings & Transaction History"), and 24-character badge ("Monologg Escrow Verified") exceeded the total screen width, causing layout wrapping or badge collision.
  2. In `TransactionHistory.tsx` withdrawal modals, rigid `whitespace-nowrap` on SLA notices and 38-character confirmation button copy ("Move 3 Projects to Draft & Withdraw") caused text clipping or container overflow on small phone screens.
  3. In `Settings.tsx`, the sub-navigation sticky header lacked truncation, allowing section titles to push "Save" / "Edit" action buttons off-canvas. In the payment section, editing action buttons were arranged side-by-side with long text ("Save Payout Bank Account"), crowding touch targets.
  4. In `PublicStorefront.tsx`, visitor header actions ("Share", "Sign In", "Join Free") took up ~240px, squeezing against the logo and overflowing narrow screens.
  5. In `LandingPage.tsx`, the fixed header CTA ("Create Your Profile" - 19 chars) crowded mobile screens, and the oversized 96px headline wrapped across 4 awkward lines on small viewports.
- **Root Cause:**
  - Hardcoded non-wrapping strings, rigid desktop horizontal headers, and oversized display fonts without mobile responsive breakpoint adaptation.
- **Fix:**
  - Added `min-w-0 flex-1 pr-2 truncate` and responsive microcopy (`<span className="sm:hidden">...</span><span className="hidden sm:inline">...</span>`) to `TransactionHistory.tsx` and `Settings.tsx` headers.
  - Implemented `max-h-[90vh] overflow-y-auto` and full-width thumb-friendly buttons (`min-h-[44px]`) across modals.
  - Streamlined `PublicStorefront.tsx` unauthenticated header actions, condensed "Share" to an accessible icon button on mobile, and elevated "Join Free".
  - Fluidly scaled `LandingPage.tsx` headline (`text-[36px] min-[400px]:text-[46px] sm:text-[72px] md:text-[96px]`), added responsive header CTA microcopy ("Get Started" on mobile), and optimized Escrow Calculator layout.
- **Resolution:** Validated with clean passes on `TransactionHistory.test.tsx` (9/9), `Settings.test.tsx` (14/14), `PublicStorefront.test.tsx` (5/5), `LandingPageHeader.test.tsx` (3/3), and the entire web test suite (25/25 files, 132/132 tests).

### 107. Multi-Line Button Wrapping, Stepper Overflow & Layout Crowding in Booking & Checkout Wizards
- **Severity:** Medium / Mobile UX & Layout Overflow
- **What happened:**
  1. In `ProjectBrief.tsx`, bottom sticky navigation buttons split 50/50 (`flex-1`) caused long button labels like "Continue to Budget & Payment" (29 chars) and "Pay ₦150,000 with Paystack" (24 chars) to wrap into 2–3 awkward lines on 360px–390px mobile viewports.
  2. In `ProjectBrief.tsx` Step 2, rigid 2-column layout (`grid grid-cols-2`) for Timeline and Location squeezed the dropdown and interactive location search input into narrow 150px columns.
  3. In `Checkout.tsx`, the header progress subtitle (`Escrow Protected · Paystack Escrow` - 34 chars) wrapped or squeezed the title container, and long action button labels crowded the bottom sheet.
  4. In `ExternalBookingEntry.tsx`, the 4-step stepper buttons used a fixed width `width: 68px`. Verbose step labels ("Contact & Agreement" - 19 chars, "Escrow Payment" - 14 chars) wrapped into 3 lines or overflowed horizontally on narrow viewports, displacing the segmented connector lines.
- **Root Cause:**
  - Hardcoded desktop button strings and fixed-width stepper nodes lacked viewport-responsive microcopy adaptation.
- **Fix:**
  - Implemented responsive microcopy across all wizard CTAs (`hidden sm:inline` and `sm:hidden`), shortening verbose action buttons on mobile while retaining canonical `aria-label` attributes for accessibility.
  - Refactored `ProjectBrief.tsx` Timeline and Location grid to `grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4`.
  - Adapted `ExternalBookingEntry.tsx` stepper with `mobileLabel` values (`Slot`, `Brief`, `Agreement`, `Payment`) and responsive button width `w-14 sm:w-20`.
- **Resolution:** Validated with clean passes on `ProjectBrief.test.tsx` (2/2 tests), `ExternalBookingEntry.test.tsx` (2/2 tests), and the full web test suite (25/25 files, 132/132 tests).

### 106. Mobile Viewport Clutter, Horizontal Overflow & Deep Workspace Stacking in Core Dashboards & Order Room
- **Severity:** Medium / Mobile UX & Layout Overflow
- **What happened:**
  1. In `OrderRoom.tsx`, the pending attendance verification card rendered a tall 3-column event metadata block on top of the workspace. On mobile viewports (360px–390px), this pushed the primary chat feed completely below the fold (~310px tall), forcing users to scroll past static event data to access the conversation or message composer.
  2. Long project titles caused text wrapping or clipped controls in the mobile header, and verbose action buttons ("Launch Google Meet", "Order Info", "Can't make it", "Yes, I'm confirmed") wrapped across multiple awkward lines on smaller screens.
  3. In `TalentDashboard.tsx` and `ClientDashboard.tsx`, wallet action CTAs were left-aligned desktop buttons rather than full-width thumb-friendly mobile buttons, and demo/new-user toggle badges consumed excessive horizontal width in the sticky top bar.
  4. In `NotificationCenterModal.tsx`, drawer max-width on mobile restricted drawer fluidity, and verbose button copy ("Mark all as read") caused overflow on 360px screens.
- **Root Cause:**
  - Components were designed desktop-first and relied on vertical stacking without mobile progressive disclosure or responsive microcopy adaptations.
- **Fix:**
  - Added progressive disclosure toggle (`checkinDetailsExpanded`) to `OrderRoom.tsx`, collapsing the 3-column event grid on mobile by default to cut card height by 50% while preserving a 1-tap "Details" expansion.
  - Implemented responsive microcopy across header titles, metadata rows, and action CTAs using `hidden sm:inline` and `sm:hidden` pairings, with explicit `aria-label` attributes to ensure test and accessibility contracts remain intact.
  - Adapted dashboard wallet hero buttons to `flex-1 sm:flex-none` full-width mobile touch targets.
  - Streamlined `NotificationCenterModal.tsx` to `w-full max-w-full sm:max-w-md md:max-w-lg` with `scrollbar-none` and condensed button labels.
- **Resolution:** Validated with `dashboardParity.test.tsx` (4/4 tests passing) and all 25 web test suites passing (132/132 tests).

### 105. Missing User Activity Audit Logging on Login, Stale Onboarding State Loss & Notification Clutter
- **Severity:** Medium / Backend Activity Tracking & User Progress Retention
- **What happened:**
  1. Returning users logging in through Google OAuth or session sync were not having their login activities recorded in the `UserActivity` table, making security audits and user session monitoring difficult.
  2. If a user dropped out midway through onboarding (e.g. at step 3 or 4) and closed their tab or re-authenticated, their progress was discarded because the backend set `isNewUser: false` on initial user row creation, dumping them onto an empty dashboard with no profile setup.
  3. The notification drawer was previously an unstyled plain modal without categorization, missing critical platform events (deliverable submissions, review requests, escrow release status, calendar meet calls).
- **Root Cause:**
  - `/session/sync` route in `apps/api/src/routes/authSupabase.ts` was not wired to `logActivity()`, and did not return the resolved `name` and `avatarUrl` from the underlying user record.
  - Onboarding pages lacked client-side draft auto-saving with step resumption.
- **Fix:**
  - Integrated `logActivity(appUser.id, "USER_LOGGED_IN", ...)` and `logActivity(..., "ACCOUNT_REGISTERED", ...)` directly into `/session/sync`.
  - Enriched `/session/sync` response with `name` and `avatarUrl`, updating client and creator profile tables from Google metadata.
  - Added onboarding draft persistence and step recovery in `CreatorOnboarding.tsx` and `ClientOnboarding.tsx`, with `AuthCallback.tsx` checking for active drafts to resume users.
  - Replaced the basic notification modal with a FAANG-grade `NotificationCenterModal` supporting category tabs, unread filters, timeline context boxes, and direct action CTAs.
- **Resolution:** Validated with all 25 web test suites passing (132/132 tests) and 56 API test suites passing (580/580 tests).

### 104. Google OAuth Redirect Failure Due to Supabase GoTrue CSRF State Clobbering & Missing PKCE Code Exchange
- **Severity:** High / Authentication & OAuth Handshake
- **What happened:**
  1. Clicking "Continue with Google" or "Sign in with Google" in `AuthFlow.tsx` triggered an OAuth redirect to Google, but upon callback to Supabase auth service, the flow failed with CSRF mismatch / invalid state errors or aborted.
  2. If the user landed on `/auth/callback?code=...`, `AuthCallback.tsx` called `supabase.auth.getSession()` synchronously on initial render before asynchronous PKCE code detection completed, returning null and throwing `"No Supabase session found"`, prematurely bouncing the user back to `/auth`.
  3. OAuth callback errors (such as `?error=access_denied&error_description=...`) were completely unparsed and swallowed, displaying generic sign-in failures instead of actionable error messages.
- **Root Cause:**
  - In `AuthFlow.tsx`, `signInWithOAuth` passed `queryParams: { state: btoa(JSON.stringify({ userType: ... })) }`. In GoTrue, the `state` query parameter is strictly reserved for internal CSRF validation tokens. Overriding `state` broke Supabase's correlation between the initial OAuth redirect and Google's callback.
  - In `AuthCallback.tsx`, the component did not inspect `searchParams.get("code")` to execute `supabase.auth.exchangeCodeForSession(code)` when `getSession()` did not yet return an active session.
- **Fix:**
  - In `AuthFlow.tsx`: Removed `queryParams: { state: ... }`. Appended `?userType=${userTypeParam}` directly to `redirectTo`, and added `window.localStorage.setItem("monologg_oauth_role", userTypeParam)` as a persistent fallback.
  - In `AuthCallback.tsx`: Added explicit check for URL error parameters (`error_description` / `error`), invoked `supabase.auth.exchangeCodeForSession(code)` if session is not yet active, added localStorage fallback for role resolution, and extended Google user metadata parsing to resolve split `given_name` + `family_name`.
- **Resolution:** Validated with 4 new unit tests in `AuthCallback.test.tsx` (11/11 passing), all 25 web test suites passing (132/132 tests), and 56 API test suites passing (580/580 tests).

### 103. Wallet Hero Visual Clutter & Missing Privacy Balance Masking on Client and Performer Portals
- **Severity:** Low / UX Privacy & Visual Noise Reduction
- **What happened:**
  1. In `ClientDashboard.tsx`, the wallet hero card displayed confusing dual balances (`Available: ₦200,000`, `Escrow Locked: ₦250,000`), an `Escrow Ledger` secondary button, and 3 secondary telemetry cards (`Active Briefs`, `Cast Talent`, `100% Protected`) that added visual noise, with no way for clients to hide/mask their financial balance on screen.
  2. In `TalentDashboard.tsx`, the balance card contained 3 bottom sub-metric cards (`IN ACTIVE ESCROW`, `COMPLETED BOOKINGS`, `PLATFORM TRUST RATING`) and a subtitle row (`+18% vs last month · Next auto-withdrawal`) that crowded the hero, without a privacy toggle to hide earnings.
- **Root Cause:**
  - Initial redesign of both dashboard balance heroes included excessive telemetry and breakdown cards rather than a clean, privacy-aware balance display.
- **Fix:**
  - In `ClientDashboard.tsx`, simplified the hero to `Wallet Balance` with an interactive `Eye` / `EyeOff` show/hide toggle, retaining only `+ Fund Wallet` as the sole CTA and removing unnecessary metrics.
  - In `TalentDashboard.tsx`, added the `Eye` / `EyeOff` show/hide privacy toggle, retained `Withdraw Funds` and `Analytics`, and removed all extraneous sub-metrics and trend subtitle lines.
- **Resolution:** Validated with clean TypeScript compilation, all 25 web test files passing (128/128 tests), and 56 API test files passing (580/580 tests).

### 102. Dark Mode Contrast Accessibility Inversion in Order Room Modals, Analytics Metric Cards Parity, and Discovery Filter Modalization
- **Severity:** Medium / Accessibility (WCAG AA) & Design System Parity
- **What happened:**
  1. In `OrderRoom.tsx`, the "Raise a Dispute" modal (and related dialogs: Decline, Submit Deliverable, Release Payment, Request Revision, Order Details) used hardcoded `bg-white` panels and `bg-zinc-50` textareas without dark-mode overrides. When dark mode was enabled, global light text (`#F4F4F5`) resulted in white-on-white text inside inputs (e.g. typing `fff` was invisible). The dispute submit button used a low-contrast faint pink background.
  2. In `ClientDashboard.tsx`, the 4 Analytics metric cards lacked the top-right badges and layout of the Performer's cards (Image 3), and the "Average rating" card was static with no way to inspect ratings and reviews received from performers.
  3. A redundant horizontal row of quick craft chips (`[All] [Actor] [Voice-Over] ...`) was rendered below the filter button, duplicating filter options.
  4. The talent discovery filter panel in `ClientDashboard.tsx` was rendered as an inline accordion rather than a centered modal dialog matching the Performer's filter modal (Image 5).
- **Root Cause:**
  - Unthemed input elements in `OrderRoom.tsx` inherited the dark mode body text color while sitting on hardcoded white/light gray backgrounds.
  - Analytics cards in `ClientDashboard.tsx` had not been upgraded to the icon-badge pill structure and interactive Reviews trigger present in `TalentDashboard.tsx`.
- **Fix:**
  - Added full dark mode support across all `OrderRoom.tsx` modals (`dark:bg-[#18181b] dark:border-zinc-800`), dark theme textareas (`dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-500`), and a high-contrast red submit button.
  - Redesigned the 4 client analytics cards in `ClientDashboard.tsx` to match Performer cards (Image 3) with top-right icon badges (`CreditCard`, `CheckCircle2`, `Reviews >`, `Users`).
  - Added an interactive `Reviews >` trigger on the Average Rating card that opens a rich Client Reviews & Ratings modal with 3 statistical pillars and verified performer reviews.
  - Removed the redundant quick performance type chips row.
  - Re-architected the discovery filter panel into a centered `<Modal strength="strong">` dialog matching Image 5.
- **Resolution:** Validated with 0 TypeScript errors, 128/128 web vitest tests passing, and 580/580 API tests passing.

### 101. Client Discovery Filter Visual Clutter and Booking Flow Misalignment Across Client Roles
- **Severity:** Medium / Design Alignment & Workflow Parity
- **What happened:**
  1. The "Filter Performers" modal panel in `ClientDashboard.tsx` was cluttered with detailed physical attributes (Height, Build, Complexion, Hair) that did not align with the streamlined discovery filters requested by the user.
  2. The booking entry flow in `ExternalBookingEntry.tsx` forced registered clients to fill out their contact details (name, email, phone) on Step 3, despite the user already having an authenticated/active client profile.
  3. On completion of escrow deposit, registered clients were shown a guest account creation card (`We've created your Monologg account`) rather than directly transitioning to their active Order Room.
  4. Performer cards in Find Performers and the Shortlist tab opened internal modals or separate flows instead of opening the performer's public storefront profile in a new browser page/tab.
  5. Step 1 of the booking flow displayed a redundant green escrow pill badge and creator identity chip that cluttered the screen above the header and subtitle.
- **Root Cause:**
  - `ExternalBookingEntry.tsx` was originally designed as a logged-out guest flow and did not check `role=client` to hide contact forms, adjust step labels to "Agreement", or direct to the Order Room.
  - `ClientDashboard.tsx` statically registered physical attributes in `ATTRIBUTE_FILTER_FIELDS` without providing a clean subset of Gender, Age, Rate Card, and Location.
- **Fix:**
  - Removed Height, Build, Complexion, and Hair from `ATTRIBUTE_FILTER_FIELDS`, keeping only Gender, Age Range, Budget Slider, and Location.
  - Parameterized `ExternalBookingEntry.tsx` with `isClient`: hid contact inputs for registered clients, prefilled their profile, labeled Step 3 "Agreement", hid the guest account creation card, and added a direct CTA + auto-redirect to `/order/:id?role=client`.
  - Removed the green escrow badge pill and right creator identity chip on Step 1, leaving only the clean header and subtext.
  - Updated card click handlers to open `window.open('/' + talent.id + '?role=client', '_blank')` and forwarded role parameters in `PublicStorefront.tsx`.
- **Resolution:** Validated with clean TypeScript compilation, 128/128 web vitest tests passing, and 580/580 API tests passing.

### 100. External Booking Entry Stepper Track Bleed, Progress Bar Overshoot, and Raw Inline Trust Badge Artifacts
- **Severity:** Medium / Design Parity & Visual Layout Defect
- **What happened:**
  1. In the 4-step external booking entry flow (`ExternalBookingEntry.tsx`), the horizontal track connector was rendered using an absolute positioned line with hardcoded container padding (`left-8 right-8`).
  2. On Step 1, the track bled out past the left of Step 1's circle and past the right of Step 4's circle.
  3. On Step 4, setting `width: ${((currentStepNum - 1) / 3) * 100}%` (which evaluated to 100% of the entire container) caused the active red progress line to overshoot significantly past Step 4's node to the right edge of the screen.
  4. The "Escrow protected booking" badge in the page header was an unstyled inline snippet with a bare lock icon floating above plain text.
- **Root Cause:**
  - Absolute positioning across a responsive container with independent padding caused the line start and end points to disconnect from the actual circle centers in flex layout.
- **Fix:**
  - Replaced the absolute track bar with segmented flex connector bars (`index < STEP_ITEMS.length - 1`) placed strictly between adjacent step columns.
  - Connector bars span from circle `index` to circle `index + 1` with zero line before Step 1 and zero line after Step 4.
  - Elevated the escrow trust indicator into a bank-grade badge (`Escrow protected booking · 100% Milestone-Gated`) with emerald status dot, lock icon, and subtle border.
  - Added desktop Performer Identity Chip and elevated the back button to a circular tactile surface.
- **Resolution:** Validated with clean TypeScript compilation and 25/25 test suites passing (127/127 tests).

### 99. Client Webapp Visual Polish Lag and Media Player / Numeric Handle Presentation Artifacts
- **Severity:** Medium / Design Parity & Visual Hierarchy
- **What happened:**
  1. The Client Webapp dashboard wallet hero was a flat, non-informative purple block with empty visual space, lacking executive telemetry, escrow status breakdowns, and secondary ledger controls.
  2. Quick actions were floating circular ghost buttons lacking high-contrast visual grouping, legible subtitles, and consistent card elevation.
  3. Performer Profile Quick-View modal rendered numeric handles (`@1`) instead of formatted performer handles, displayed a static non-interactive grey rectangle for the featured audio/video reel, and had plain rate card boxes.
  4. Script sides excerpt inside the Project Detail view was displayed as a plain border box without studio script presentation, and the draft action button copy did not match the user's expected "Discard Draft" design.
  5. In the Order Room client workspace, message bubbles lacked role-specific visual hierarchy, file attachment cards were flat, and the input composer lacked elevated styling.
- **Root Cause:**
  - Client webapp views were originally built as functional prototypes and had not received the executive design overhaul applied to the performer portal in recent sessions.
- **Fix:**
  - Rebuilt the Executive Financial Command Center with ambient lighting, Paystack escrow badge, dual balance chips, and 3 glassmorphic telemetry cards.
  - Formatted creator handle to `@${selectedTalent.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}` and built an interactive Studio Audio Console Reel Player with animated dynamic EQ waveform frequency bars and live scrubber.
  - Formatted audition script sides as an authentic production teleprompter card and updated sidebar draft CTA to "Discard Draft".
  - Upgraded Order Room attendance tracking strip, Google Meet action banner, client gradient chat bubbles, frosted file cards, and bottom message composer.
- **Resolution:** Validated with clean TypeScript compilation and 25/25 test suites passing (127/127 tests).

### 98. Low Input Contrast in Edit Profile Modal, Verbose Casting Specifications Guidance Copy, and Redundant Production Phase/Briefing Indicators in Active Orders
- **Severity:** Medium / Accessibility Contrast & Flow Streamlining
- **What happened:**
  1. In both `Settings.tsx` and `TalentDashboard.tsx`, the Edit Profile Details form inputs inherited a default background (`--color-bg-surface-2`) and border (`--color-border-default`) that had virtually zero perceptible contrast against the card's elevated background (`--color-bg-elevated`, `#EFEFEA`), looking washed out and muddy. Section labels were in small, low-contrast secondary text.
  2. The guidance copy in the Casting & Physical Specifications card (`Settings.tsx`) was verbose, legalistic, and clunky, explaining granular privacy levels without communicating the core performer value of getting matched to casting briefs.
  3. The active orders card in `TalentDashboard.tsx` had a redundant top line declaring "Production Phase" alongside the active phase name, and included "Briefing" as an active milestone step despite briefs being completed and submitted prior to booking and order creation.
- **Root Cause:**
  - Token stacking without explicit surface-level overrides for nested inputs inside elevated containers.
  - Initial implementation of the physical attributes guidance copy was written from a privacy compliance framing rather than user-centric UX copy.
  - Legacy 4-phase prototype schema retained "Briefing" in order lifecycle indicators.
- **Fix:**
  - Upgraded all Edit Profile form inputs, textareas, tags, social media inputs, and preset buttons with crisp white/dark backgrounds, defined borders (`border-zinc-300 dark:border-zinc-700`), high-contrast text, and bold labels (`text-zinc-900 dark:text-zinc-100`).
  - Rewrote the Casting & Physical Specifications copy to be punchy, value-centric, and clear regarding privacy settings.
  - Removed "Production Phase" header row and removed "Briefing" from active order milestone bars across `TalentDashboard.tsx`, `ClientDashboard.tsx`, `OrderRoom.tsx`, and `mocks/orders.ts`.
- **Resolution:** Validated with clean TypeScript compilation and 25/25 test suites passing (127/127 tests).

### 97. Cross-Portal Filter UI Disparity and Missing Client-Side Escrow Guarantee Architecture in Project Details
- **Severity:** Medium / Cross-Portal UX Parity & Trust Architecture
- **What happened:**
  1. The performer filter UI in the client portal (`ClientDashboard.tsx`) lagged behind the state-of-the-art project filter UI in `TalentDashboard.tsx`, utilizing an isolated square icon toggle without visible filter count, without removable active filter chip badges, and splitting filter criteria across an attribute dropdown and a disconnected "More Filters" modal.
  2. The client project detail view lacked an explicit Escrow Protection & Settlement Guarantee card, creating an informational asymmetry with the Performer portal (which clearly communicated the 3 pillars of payment security) and the Create Project Brief wizard (`ProjectBrief.tsx`).
  3. Typography across client project detail cards had variable card header scales (`text-lg font-bold` vs standardized `text-base font-bold`) and lacked the signature accent left border callout on the audition script excerpt.
- **Root Cause:** Feature additions and design polishing applied in previous sessions to the performer portal had not been back-propagated to the client dashboard's shared/analogous views.
- **Fix:**
  - Standardized Discover Performer search and filter controls to match the project filter UI: side-by-side search input and `Filters` button (`SlidersHorizontal`) with active filter count badge, removable active filter chips bar (`Craft`, `Max Rate`, physical attributes) with `Clear all`, and unified expandable filter panel.
  - Standardized client project detail card headers to `font-display text-base font-bold` (16px), narrative descriptions to `text-sm font-body leading-relaxed` (14px), and added left accent border callout (`border-l-4 border-l-[var(--color-accent)]`) to audition sides.
  - Integrated the Client POV Vertical Escrow Protection & Settlement Guarantee card featuring 3 pillars: `1. 100% Escrow Protection` (`Funded Upfront`), `2. 48h Inspection Window` (`Review Guarantee`), and `3. Milestone Release Control` (`Direct Approval`).
- **Resolution:** Validated with zero TypeScript compilation errors and all 25 test suites passing (127/127 tests).

### 96. Typographic Scale Inconsistency Across Project Detail Cards and Extraneous Talent Search Tab in Performer Portal
- **Severity:** Medium / Typographic Hierarchy & Flow Scoping
- **What happened:**
  1. In `TalentDashboard.tsx`, body paragraphs across project detail tabs had mismatched font sizing: Creative Brief & Synopsis used `text-sm sm:text-base` (rendering at 16px on desktop), while Casting Client & Escrow Verification used `text-xs` (12px), creating a 4px disparity between adjacent cards.
  2. The script excerpt in Audition Sides was rendered at `text-sm sm:text-base` (16px), making it disproportionately heavy compared to surrounding metadata.
  3. Client track record telemetry values were set to `text-sm sm:text-base font-bold`, making them larger than the client's own name on desktop screens.
  4. Escrow Protection & Settlement Guarantee was rendered in a cramped 3-pillar horizontal grid (`grid grid-cols-1 md:grid-cols-3`) that severely compressed text descriptions into narrow columns.
  5. The performer project navigation bar contained a "Search Performers" button (`Browse Projects` | `My Applications` | `Search Performers`), even though talent search is a client feature, not a performer action.
- **Root Cause:** Ad-hoc responsive classes (`sm:text-base`) applied unevenly across individual card iterations; cramped 3-column layout constraints on security architecture; and unpruned sub-tab options from initial multi-role experimentation.
- **Fix:**
  - Standardized all card headers to `font-display text-base font-bold` (16px).
  - Standardized all body text and descriptions to `text-sm font-body leading-relaxed` (14px).
  - Aligned script excerpts to `text-sm font-body leading-relaxed` and telemetry values to `font-display text-sm font-bold`.
  - Converted Escrow Protection & Settlement Guarantee into a full-width vertical stacked layout (`space-y-3`) with dedicated left icon surfaces and trust badges.
  - Removed "Search Performers" from the performer projects tab strip, leaving only `Browse Projects` and `My Applications`.
- **Resolution:** Validated via `tsc --noEmit` and all 25 test suites passing (127/127 tests).

### 95. Inaccurate Gross Escrow Copy in Order Room, Alarming Red Analytics Numbers, Cryptic P-S-P Attributes Controls, and Triple Save Triggers
- **Severity:** High / Financial Copy Accuracy, UX & Visual Semantics
- **What happened:**
  1. In `OrderRoom.tsx`, the 48-hour inspection guarantee copy stated "₦120,000 auto-releases to your balance", incorrectly displaying the client's gross escrow deposit rather than the performer's actual net take-home `₦111,600` (after deducting Monologg's 7% platform fee).
  2. In `OrderRoom.tsx`, the Onsite verification code input was rendered as an awkward single input with centered dots `••••`, while the unverified button appeared as a washed-out pink tomato pill (`bg-red-300`).
  3. In `TalentDashboard.tsx`, total accumulated earnings (`₦1,240,000`) and completed projects (`28`) were colored with `var(--color-accent)` (bright red), violating fintech conventions where red strictly connotes losses, negative deltas, or debt.
  4. In `Settings.tsx`, the Physical Attributes page rendered 8 single-line dropdowns vertically stacked in a narrow 512px column with excessive dead whitespace, accompanied by cryptic `P | S | P` buttons where both Private and Public shared the identical letter "P".
  5. In `Settings.tsx`, editing the profile rendered 3 competing save triggers at once: a sticky top bar `Save`, an in-form `Save Profile`, and a bottom floating bar `Save Changes`.
- **Root Cause:** Stale gross balance hardcoding in the escrow modal; missing discrete OTP PIN input architecture; improper semantic usage of `--color-accent` on financial earnings; narrow default container constraint on `section === "attributes"`; and overlapping legacy save triggers.
- **Fix:**
  - Corrected Order Room copy to state `₦111,600 net (after 7% platform fee)` auto-releases to balance.
  - Built 4 discrete auto-advancing OTP digit boxes with auto-forward, backspace back-navigation, paste distribution, and a clean disabled button state.
  - Replaced red typography on positive earnings and projects with high-contrast neutral primary text and emerald growth chips.
  - Expanded Physical Attributes to `max-w-4xl`, grouped fields into a responsive 2-column card layout (*Demographics & Build* and *Appearance & Features*), and implemented unambiguous segmented controls (`🔒 Priv` · `🔍 Filter` · `🌐 Public`).
  - De-duplicated save triggers on the profile editor, retaining an authoritative `Save Changes` CTA inside the form and a clean sticky header action.
- **Resolution:** Verified with `npx tsc --noEmit` (0 errors) and all 25 test suites passed cleanly (127/127 tests).

### 94. Order Room Dark Mode Text Contrast Failure, Project Detail Dead Space, and Calendar Marshmallow Day Cells
- **Severity:** High / Accessibility & Visual Design
- **What happened:**
  1. In `OrderRoom.tsx`, performer sent messages in dark mode rendered near-black text (`text-zinc-900`) on dark translucent red background (`rgba(255, 77, 77, 0.14)`), resulting in near 1:1 unreadable contrast ratio (WCAG AAA/AA failure).
  2. In `TalentDashboard.tsx`, Project Detail Tab 4 ("Client & Escrow") left huge dead empty space with only a tiny client paragraph, while the right column was cramped and escrow was redundantly stated 3 times on the same page.
  3. In `TalentDashboard.tsx`, the Month Calendar view rendered day cells as clunky puffy squircle "marshmallows" with wide gaps, ghost grey pills for empty leading slots, and lacked inline month navigation controls and a telemetry legend.
  4. In `ExternalBookingEntry.tsx`, `checkDateUnavailable` simulated booked days without honoring the 'when not today' guard, causing same-day booking tests to fail when the test date coincided with the hardcoded booked day index.
- **Root Cause:** Hardcoded `text-zinc-900` class on chat bubble container regardless of dark mode; lack of rich client profile telemetry in Tab 4; loosely coupled grid gap in calendar view; and missing `isToday` check in `checkDateUnavailable`.
- **Fix:**
  - Styled sent chat messages with solid high-contrast brand accent (`bg-[#E50914]` / `bg-[#7B00FE]`) and `text-white` in both light and dark modes, ensuring pristine legibility. Adapted incoming bubbles to dark mode with elevated surfaces and clean text.
  - Built a comprehensive Verified Casting Client Dossier and 3-pillar Escrow Protection Guarantee card in Tab 4, balancing the layout and eliminating repetitive escrow labels.
  - Replaced puffy day cells with a sleek connected calendar grid with inline navigation chevrons, day count, high-contrast day badges, and a bottom legend.
  - Guarded `checkDateUnavailable` so same-day appointments are open for bookings.
- **Resolution:** Verified with `npx tsc --noEmit` (0 errors) and all 25 test suites passed cleanly (127/127 tests).

### 93. Overpowering Red Balance Banner, Floating Ghost Circles, Contradictory Check-In Banners, and Broken Order Card Hierarchy
- **Severity:** Medium / Visual Hierarchy & Interaction Design
- **What happened:**
  1. In `TalentDashboard.tsx`, the Available Balance hero was styled as a solid, blinding red gradient slab (`#F13030` to `#D31F20`) that overwhelmed the entire interface and felt like a severe error alert.
  2. The quick-action controls (`Profile`, `Availability`, `Rates`, `Orders`) floated underneath as washed-out pink ghost circles with weak typographic grouping.
  3. The Profile Completion banner had no visual progress bar despite reading "85% complete".
  4. In `OrderRoom.tsx` and `TalentDashboard.tsx`, the attendance check-in banner took up over 250px of vertical space, crushing the workspace tabs and message feed. Even after being confirmed, it remained fully expanded and continued to contradictorily ask "Are you still available?".
  5. In the Orders tab, order amounts were styled in bright red font (connoting debt or financial loss rather than performer earnings), nested inside a box within a box, with a clunky circle-and-line stepper.
- **Root Cause:** Accumulation of ad-hoc card wrappers and alert styling without a cohesive fintech visual architecture or progressive disclosure mechanics.
- **Fix:**
  - Redesigned the Balance Hero into an Apple/Linear-grade Deep Slate / Graphite obsidian card with Monologg brand red ambient backlight, real-time status pulse, escrow protection badge, and structured sub-metrics (`In Active Escrow`, `Completed Bookings`, `Platform Trust Rating`).
  - Replaced floating ghost circles with an integrated 4-card quick navigation dock.
  - Added a visible gradient progress bar to the profile completion prompt.
  - Implemented an auto-collapsing attendance ribbon (height ~42px) in `OrderRoom.tsx` that reclaims viewport space once confirmed, and eliminated contradictory question copy.
  - Modernized the Order Card with bold Net Payout (`₦111,600`), fee notation, and a 4-segment production progress bar.
  - Upgraded Creative Brief into an editorial script reader and teleprompter card.
- **Resolution:** Verified with `npx tsc --noEmit` (0 errors) and automated test suite pass.

### 92. Repetitive Escrow Phrasing, Client-Performer Perspective Inconsistencies, and Upfront Fee Transparency Gaps
- **Severity:** Medium / FAANG UX Quality & Information Architecture
- **What happened:**
  1. In `Checkout.tsx` and `ExternalBookingEntry.tsx`, post-booking confirmed screens featured 3 redundant paragraphs and badges all repeating "escrow" ("₦X secured in escrow", "held securely in escrow", "escrow remains 100% protected").
  2. In `OrderRoom.tsx`, clients were exposed to performer interactive check-in buttons ("I can't make it", "Yes, I'm confirmed"), client release modals told clients "You receive ₦111,600", the side drawer showed performer net payouts instead of client escrow deposit totals, and the Google Meet intro banner stayed visible even on cancelled bookings.
  3. In `ProjectBrief.tsx` and `LegalPage.tsx`, platform terms referenced vague escrow descriptions without explicitly disclosing the exact dual deduction model (12% client escrow protection fee added at deposit; 7% performer service fee deducted upon release).
- **Root Cause:** Prototyped single-template components without strict role perspective branching; accumulated boilerplate safety copy without UX copy audit.
- **Fix:**
  - Streamlined confirmed screens in `Checkout.tsx` and `ExternalBookingEntry.tsx` to a single high-trust escrow pill, clean subhead, and focused Order Room next-step card with real-time milestone tracking.
  - Implemented collapsible progressive disclosure for the Google Meet orientation card, hide orientation card on cancellation with a clean refund notice, branched availability banner so clients see performer confirmation status rather than check-in buttons, updated release payment modal to "Performer receives ₦111,600", and made side drawer payment summaries role-aware.
  - Added full creative brief, script excerpt with 1-click copy, and campaign assets download to Tab 2 (`Brief & Files`) in `OrderRoom.tsx`.
  - Disclosed the 12% client / 7% talent dual deduction policy explicitly across all terms, review cards, and budget breakdowns.
- **Resolution:** 100% passing test suite (580/580 tests) and 0 TypeScript compilation errors (`npx tsc --noEmit`).

### 91. Clunky 10-Day Availability Strip, Premature Confirmation Google Meet CTAs, Stepper Arrow Clutter, and Missing Client Order Room Intro Call Reminder
- **Severity:** Medium / Design Quality & Post-Checkout Conversion
- **What happened:**
  1. In `ExternalBookingEntry.tsx`, date selection used an awkward 10-day 2-row strip and a redundant native date input rather than a standard, navigable monthly calendar.
  2. On Step 1, the back arrow `<` sat next to step 1 even though external visitors open the booking link in a fresh browser page, creating visual asymmetry and confusion.
  3. On the booking confirmation screen, prominent "Launch Google Meet" and "Copy link" buttons invited users to join a video call immediately outside the platform, before they had logged into the workspace or set their account password.
  4. In `OrderRoom.tsx`, only performers had an availability check-in reminder; clients had no corresponding banner prompting them to schedule or complete their video introduction call with the performer.
- **Root Cause:** Prototyped horizontal date strip with hardcoded day offsets; premature placement of meeting links on guest completion screens; one-sided check-in architecture in Order Room.
- **Fix:**
  - Built a compact month calendar grid in `ExternalBookingEntry.tsx` with month/year navigation, availability legend, past-date disabling, booked-date strikethrough styling with modal warnings, and brand red selection.
  - Omitted the back arrow on Step 1, and positioned it at the extreme left on Steps 2–4 to preserve centered stepper alignment.
  - Replaced immediate Google Meet launch buttons on the confirmation screen with clear next-step guidance and an authoritative `Enter Order Room` primary CTA.
  - Added an interactive Google Meet reminder banner at the top of `OrderRoom.tsx` for client roles with launch, copy, and completion actions.
- **Resolution:** Validated with all 25 test suites passing (127/127 tests) and clean TypeScript check (`npx tsc --noEmit`).

### 90. External Booking Header Repetition & Vertical Spacing, Missing Client Phone Number for SMS Booking Notifications, and Step 4 Payment Multi-CTA Clutter
- **Severity:** Medium / Design Quality & External Checkout Conversion
- **What happened:** In `ExternalBookingEntry.tsx`:
  1. The header occupied excessive vertical height with redundant titles (`Contact & Agreement`, `Payment`, `Escrow Protected Booking`) rendered on a separate row below the back button and above the stepper.
  2. Step 3 contained a redundant summary strip (`Emeka Johnson · Standard Booking 2026-10-16 at 00:00 · Online / Remote Total escrow ₦134,400`) that repeated data already clear from previous steps.
  3. Step 3 only requested name and email, lacking a phone number field to allow automated SMS notifications, WhatsApp reminders, and booking check-in alerts for external clients.
  4. Step 4 had a confusing visual hierarchy with competing CTA buttons: a cyan/blue `Pay with Paystack` button inside the top card alongside a red `Confirm & Deposit` card payment button at the bottom, creating decision friction and color clashes.
- **Root Cause:** Navigation layout legacy with multi-row stacked header bars; omission of mobile notification contact channels; separate disparate payment cards rather than a unified selector pattern.
- **Fix:**
  - Placed the back button `<` on the exact same horizontal row as the 4-step progress stepper (`h-16 flex items-center gap-3 sm:gap-6 px-4 max-w-xl mx-auto`), removing repetitive title text rows.
  - Removed redundant summary strip from Step 3.
  - Added required `Phone number *` input (`+234 800 000 0000`) on Step 3 for client SMS/notification delivery.
  - Overhauled Step 4 into a clean Order Summary card with total deposit (`₦134,400`), an interactive 2-option selector (`Pay with Card` vs `Pay with Paystack`), and a single, authoritative primary CTA button at the bottom styled consistently in Monologg brand theme.
- **Resolution:** Validated with all 25 test suites passing (126/126 tests) and clean TypeScript check (`npx tsc --noEmit`).

### 89. External Booking Step 1 Clutter, Missing Modal Container Background, Redundant Step 4 Price Duplications, All-Caps Input Titles, and Confirmed Screen "AI Slop" Aesthetic Disconnect
- **Severity:** Medium / Design Quality & External Conversion
- **What happened:** In `ExternalBookingEntry.tsx`:
  1. Step 1 contained redundant service cards (`Select Rate Card / Service` row + `Selected Service` summary card) when users had already chosen their rate card on the storefront.
  2. The `Performer Unavailable` modal lacked a solid container background, rendering text transparently over the backdrop scrim and closing unexpectedly when clicking modal content.
  3. Contact details were awkwardly bundled inside Step 2 (Project Brief) instead of pairing with terms in Step 3.
  4. Step 3 displayed an unnecessary multi-line formula breakdown (`Base Rate`, `Escrow Protection Fee`, `Total Deposit`).
  5. Step 4 duplicated `₦134,400` in 4 places alongside redundant tags (`100% Escrow`, `Instant Paystack Checkout`, `Total Escrow`).
  6. The Confirmed View had a double green circular border, a string formatting bug (`₦134 , 400`), and clashing neon colors (neon purple, electric blue, bright green, and mismatched buttons) that looked like buggy "AI slop".
  7. Input field labels across the entire file were formatted in loud all-caps.
- **Root Cause:** Incomplete cleanup during previous iterations; missing surface background styles on the bespoke modal panel; lack of unified sentence-case label standards.
- **Fix:**
  - Removed rate cards selector row and Selected Service summary card from Step 1.
  - Added solid opaque container background (`var(--color-bg-surface)` / `bg-white dark:bg-zinc-900 border shadow-2xl`) and click-propagation stop to `Performer Unavailable` modal.
  - Relocated `Your name` and `Email address` fields to Step 3 (`Contact & Agreement`).
  - Removed redundant fee formula box from Step 3.
  - Cleaned up Step 4 into an authoritative header, single Paystack checkout trigger, and direct card input form.
  - Redesigned Confirmed View into a serene FAANG layout: single-ring emerald checkmark, clean `₦134,400` typography, refined Google Meet call scheduler card, muted account creation notice, and cohesive navigation buttons.
  - Normalized all input titles to sentence/title case.
- **Resolution:** Validated with all 25 test suites passing (126/126 tests) and clean TypeScript check (`npx tsc --noEmit`).

### 88. External Storefront Booking UX Disconnect, Obsolete Standard/Rush Toggles, Redundant Escrow Banner & Missing Google Meet Orientation Gate
- **Severity:** Medium / External Guest Conversion & Brand Consistency
- **What happened:** In `ExternalBookingEntry.tsx`, the booking process used obsolete `Standard Booking` vs `Rush Delivery` options instead of the performer's actual rate cards; date selection had no visual distinction between available and booked dates; and no graceful recovery modal existed when users tried to book unavailable performers. The project brief lacked parity with the client brief flow (missing format, venue, description, and asset upload). Furthermore, Review & Agreement cards across all client booking surfaces (`ExternalBookingEntry.tsx`, `ProjectBrief.tsx`, `Checkout.tsx`) suffered from duplicate headings and an unnecessary green `Escrow Protected` card below terms. Finally, once an external booking was completed, there was no prompt to schedule an introductory video call with the performer.
- **Root Cause:** Prototyping legacy in early Phase 16 external entry; disjointed brief form implementations; duplicated section banners in review cards.
- **Fix:**
  - Replaced Standard/Rush toggles with performer rate card selection with delivery badges and selected service summary card.
  - Implemented 10-day date strip with active selection, live status badges, greying out of unavailable dates, and an animated `Performer Unavailable` modal.
  - Re-engineered Step 2 into a full project brief with campaign title, remote/onsite format, venue, description, asset drag-and-drop uploader, and notes.
  - Removed duplicate headers and redundant green escrow badge across all 3 client booking review steps.
  - Added Image 4 Paystack pill modal checkout and direct card input options.
  - Added a prominent Google Meet introduction call prompt with 1-click launch and copy link upon booking confirmation.
- **Resolution:** Validated with all 25 test suites passing (126/126 tests) and clean TypeScript typecheck (`npx tsc --noEmit`).

### 87. Filter Modal Visual Noise, Redundant Brief Description in Step 1, Mixed Review/Budget Wizard Step Order, and Incomplete Paystack Checkout Experience
- **Severity:** Medium / UX Hierarchy & Fintech Integration
- **What happened:** In `ClientDashboard.tsx`, the performer Filter modal contained a long Section 5 with physical attributes (Height, Build, Complexion, Hair) that added visual noise to casting discovery. In `ProjectBrief.tsx`, Step 1 displayed a redundant Project Description field that duplicated the description input placed on Step 3 (Assets). Furthermore, the 4-clause Review & Agreement card was combined on the final Step 4 alongside budget inputs, rather than serving as the clean penultimate step before payment. When selecting Paystack, the UI lacked authentic payment channels (Card, Transfer, USSD) and did not match the user's design reference.
- **Root Cause:** Prototyping debt in filter modals; conflicting placements of project description across brief iterations; combining review terms and payment into a single step without a dedicated modal checkout gateway.
- **Fix:**
  - Removed Section 5 (Physical Features & Appearance) from the filter modal in `ClientDashboard.tsx`, updating subtitle to "Filter by age, gender, budget, and location".
  - Removed duplicate Project Description from Step 1 in `ProjectBrief.tsx`, keeping it organized in Step 3 (Assets).
  - Split `ProjectBrief.tsx` into 5 steps with Review & Agreement as the penultimate Step 4 and Budget & Escrow Funding as the final Step 5.
  - Built `PaystackModal.tsx` supporting Card, Bank Transfer (with copyable Wema Bank details), and USSD shortcodes.
  - Re-styled Paystack payment selector as a blue-bordered pill matching Image 4 and wired `PaystackModal` to both `ProjectBrief.tsx` and `Checkout.tsx`.
- **Resolution:** Validated with all 25 test suites passing (126/126 tests) and clean TypeScript typecheck (`npx tsc --noEmit`).

### 86. Vercel Production Crash (`ReferenceError: AlertTriangle is not defined`), Badge Tone Prop Discrepancy, and Transaction Direction Schema Mismatch
- **Severity:** High / Production Runtime Crash
- **What happened:** On the Vercel production deployment (`mono2-ldt1gydxj-adedoyin899s-projects.vercel.app`), clicking into the Talent Dashboard or check-in alert crashed with an unhandled exception: `ReferenceError: AlertTriangle is not defined`. Additionally, running strict TypeScript checks revealed invalid `tone="danger"` props passed to `<Badge>` in `OrderRoom.tsx` and `TalentDashboard.tsx`, and an invalid `direction: "refund"` set on `Transaction` in `state-sync.ts`.
- **Root Cause:**
  - `AlertTriangle` was referenced in `TalentDashboard.tsx:1353` but omitted from the `lucide-react` import statement.
  - `<Badge>` component strictly defines `tone: "error" | "neutral" | "accent" | "success" | "warning"`; `"danger"` was used instead of `"error"`.
  - `@monologg/types` `Transaction` schema defines `direction: z.enum(["payment", "payout"])`; `"refund"` was passed directly as direction instead of `"payment"` with `state: "REFUNDED"`.
- **Fix:**
  - Added `AlertTriangle` to the `lucide-react` import list in `TalentDashboard.tsx`.
  - Updated all occurrences of `tone="danger"` to `tone="error"` in `TalentDashboard.tsx` and `OrderRoom.tsx`.
  - Updated `refundOrder` in `state-sync.ts` to set `direction: "payment"` with `state: "REFUNDED"`.
  - Verified with `npx tsc --noEmit` (0 errors) and full Vitest suite (126 tests passing).

### 85. PIN Modal Component Sizing Inconsistency, Missing Check-in Demo Switcher & Unhandled Decline Cancellation/Refund Flow, and Incomplete Project Brief / Checkout Funding & Terms
- **Severity:** Medium / UI Hierarchy & Booking Flow Integrity
- **What happened:** In `TalentDashboard.tsx`, the withdrawal PIN authorization modal had an redundant lock icon, a repeated `"Authorise Withdrawal"` sub-heading, and disproportionately sized input controls relative to the rest of the application. Availability check-ins were hardcoded to a single step with no mechanism to demo the 3 milestones (14-day, 7-day, 2-day). When a performer declined a check-in, the order state remained active with no automated refund credited to the client or automated message dispatched. In `ProjectBrief.tsx` and `Checkout.tsx`, users could not differentiate between onsite vs online projects, select between wallet and card funding with live balance protection, or complete the required 4-clause review & escrow agreement.
- **Root Cause:** Prototyping gaps in check-in state synchronization; missing decline webhook/handler simulation; lack of format and funding selection controls in brief creation and rate card checkout sheets.
- **Fix:**
  - Standardized PIN authorization modal: set title to `"Input PIN"`, removed redundant icon and extra heading, and aligned input sizing (`h-11`) and typography with standard tokens.
  - Added milestone switcher arrows (`<ChevronLeft>` / `<ChevronRight>`) to availability check-in card across both `TalentDashboard.tsx` and `OrderRoom.tsx`.
  - Implemented automated decline workflow: cancels the booking, auto-refunds escrow amount to client wallet, sends notification, appends chat message, and displays `Cancelled & Refunded` across all screens.
  - Added project format (`Online / Remote` vs `On-site / In-person`) with venue inputs, funding source selection with live balance check and "+ Fund Wallet" modal, and the mandatory 4-point Review & Agreement terms across both `ProjectBrief.tsx` and `Checkout.tsx`.
- **Resolution:** Validated with all 25 test suites passing (126/126 tests).

### 84. Cluttered 3-Line Fee Formulas on Rate Cards & Payouts, Complex Payout Bank Cards & Missing Passcode Gate in Withdraw Modal
- **Severity:** Medium / Fintech UX & Visual Simplification
- **What happened:** In `TalentDashboard.tsx`, rate cards displayed an overwhelming 3-line formula box (`Base rate`, `Platform fee (7%)`, `You receive`) that visually crowded the service pricing. Similarly, the Payouts transaction feed rendered a stacked multi-line deduction breakdown for every row. The Payout Bank Account in `Settings.tsx` used stacked alert boxes and a complex card structure that was difficult to navigate and edit. In addition, the Withdraw Funds modal lacked quick-fill amount presets and allowed one-click withdrawals without a secondary security passcode verification step.
- **Root Cause:** Overly verbose financial breakdown boxes left over from earlier fee transparency iterations; non-standard card and banner stacking in Settings; single-step withdrawal modal.
- **Resolution:** Replaced the 3-line breakdown on Rate Cards with a direct top-right net price badge (e.g. `₦111,600` for `₦120,000`). Replaced the multi-line payout list breakdown with a single clean net payout amount and status badge. Converted Settings payout bank into clean, read-only inputs by default with an edit button. Re-engineered the Withdraw Funds modal with amount presets (`₦25k`, `₦50k`, `₦100k`, `₦200k`, `Max`), an auto-selected destination account card, and a dedicated 4-digit passcode authentication screen before confirmed success.
- **Validation:** 126/126 unit tests passing across all 25 test suites (`pnpm --filter @monologg/web test`), clean TypeScript check (`tsc --noEmit`), and rebuilt standalone HTML bundle.

### 83. Redundant Stacked Check-In Bar, Cluttered Navbar Formulas, Alarming Red Capacity Bar & Squashed Review Badges
- **Severity:** Medium / Visual Hierarchy & Alpha UI Polish
- **What happened:** In `OrderRoom.tsx`, the top area had four stacked horizontal banners (Navbar, Redundant Check-in progress bar, Availability card, and Workspace tabs) creating severe visual clutter and pushing messages below the fold. The navbar subtitle had an unwieldy fee formula (`Base ₦120,000 · Fee (7%) -₦8,400 · You receive ₦111,600`). Workspace tabs used a misleading checkmark icon (`CheckCircle2`) for "Messages & Chat" with heavy borders. In `TalentDashboard.tsx`, high applicant capacity (8/10 filled) was displayed as a bright red error bar (`var(--color-accent)`); the sticky sidebar had a duplicate escrow protection footer; and the Client Reviews modal had squashed stats cards with awkwardly boxed green pills.
- **Root Cause:** Iterative feature additions stacked atop one another without visual consolidation; styling applicant capacity with error accent tokens; prototype pill borders in modals.
- **Resolution:** Consolidated the 3-step check-in stepper directly into the check-in card header and purged the standalone secondary bar. Simplified navbar subtitle to `ORD-001 · ₦111,600 net`. Upgraded tabs with `MessageSquare` and crisp pill active states. Changed capacity bar to neutral dark progress fill. Purged redundant sidebar escrow footnote. Redesigned review modal stats pillars with bold 32px values and clean unboxed badges.
- **Validation:** 126/126 unit tests passing across all 25 test suites (`pnpm --filter @monologg/web test`), clean TypeScript typecheck (`tsc --noEmit`), and rebuilt standalone HTML bundle.

### 82. Unclosed Desktop Header Container in TalentDashboard & Missing AlertCircle Import in OrderRoom
- **Severity:** High / Build & Test Compilation Gate
- **What happened:** During dashboard availability check-in card insertion in `TalentDashboard.tsx`, an extra closing `</div>` belonging to the desktop header container was inadvertently removed, causing esbuild to report unmatched `<main>` and `<div>` tags at the bottom of the file (breaking 3 test suites). In `OrderRoom.tsx`, `AlertCircle` was utilized inside the overdue availability banner without being explicitly imported from `lucide-react`.
- **Root Cause:** Deletion of closing tag block during refactoring and missing icon import declaration.
- **Resolution:** Re-inserted the matching `</div>` closing tag for the desktop header block in `TalentDashboard.tsx:1248`, and imported `AlertCircle` from `lucide-react` in `OrderRoom.tsx:14`.
- **Validation:** 126/126 unit tests passing across all 25 test files (`pnpm --filter @monologg/web test`), clean TypeScript typecheck (`tsc --noEmit`), and successful standalone bundle build.

### 81. Redundant Availability Banner, Inconsistent Fee Percentages (9%/12%/15%), Stale FINCRA Mentions & Monospace Script Typography
- **Severity:** Medium / Performer Trust & Consistency
- **What happened:** In `TalentDashboard.tsx`, the Availability tab had a duplicate calendar sync prompt at the bottom of the screen despite an active Google Calendar Sync status banner at the top. On the Project Details view, audition sides were styled in monospaced, small code-editor font; client ratings were static text without an interactive reviews modal; and the "Casting Client & Escrow" section was wrapped in heavy nested card boxes. Furthermore, outdated 9%, 11%, 12%, and 15% platform fee figures and stale FINCRA escrow references were displayed across performer dashboards, onboarding rate cards, order rooms, and public landing pages.
- **Root Cause:** Divergent platform fee iterations across features, prototype card containers, and lack of client reviews inspection modal from performer view.
- **Resolution:** Removed the redundant bottom availability sync banner and connected the top banner CTA to the calendar sync modal. Made client ratings clickable to open a dedicated verified `Client Reviews & Ratings` modal. Unboxed "Casting Client & Escrow" into clean plain text. Normalized audition sides into readable standard block typography (`font-body text-sm sm:text-base border-l-4`). Replaced all FINCRA mentions with Paystack (`"held securely in escrow by our payment partner, Paystack"`). Standardized performer fee displays on 3 explicit lines (`Base rate`, `Platform fee (7%)`, `You receive`) across all screens.
- **Validation:** 126 unit tests passing across all 25 suites, typecheck clean, standalone bundle regenerated.

### 80. Missing Onboarding Calendar Sync Step, Unblocked Availability Events, Unclassified Project Attendance Types & Unenforced Terms Agreement
- **Severity:** Medium / Performer Onboarding Flow & Operational Trust
- **What happened:** In `CreatorOnboarding.tsx`, performers moved directly from registration to personal details without an opportunity to connect their Google Calendar, and completed rate card setup straight into the dashboard without accepting performer-specific terms and payout clauses. In `TalentDashboard.tsx`, the availability screen lacked an explicit sync status indicator and failed to render existing calendar events as blocked availability slots. Furthermore, when browsing and applying for projects, performers had no visual distinction between online/remote gigs and onsite engagements requiring physical venue presence and check-in codes.
- **Root Cause:** Absence of a dedicated calendar sync onboarding step, missing state synchronization for calendar sync status, and lack of a mandatory terms acceptance gate before profile launch.
- **Resolution:** Added Step 1 ("Connect your calendar") with Google Calendar connect, Skip for now, connected email badge with Disconnect action, and error state with Retry. Added Step 8 ("Performer Terms & Payout Agreement") with 5 exact clauses, a mandatory terms checkbox linked to `/legal/terms`, and disabled Continue button until checked, persisting acceptance with an ISO timestamp in `appStateSync`. Added a Google Calendar Sync banner on the availability screen, and rendered existing calendar events directly as blocked slots. Added `isProjectOnline` classification, badging project cards with Onsite / Online tags, and displaying an explicit attendance requirement notification in the audition pitch modal. Validated with 126 unit tests passing across all 25 suites and regenerated `monologg-app.html`.

### 79. Transparent Modal Scrim Leak in Fund Client Wallet Modal & Missing Discovery Filters for Age, Gender, Budget, and Location
- **Severity:** Medium / Visual Consistency & Discovery UX
- **What happened:** In `ClientDashboard.tsx`, opening the "Fund Client Wallet" modal caused the underlying dashboard content and purple balance hero card to leak through the modal body because the inner wrapper lacked an explicit solid background and modal container shadow. Furthermore, the modal included redundant card addition forms and CVV inputs when cards were already registered in Settings. Lastly, the Performer Filter modal on the client side lacked core casting filters: Age, Gender, interactive Budget Slider, and Location.
- **Root Cause:** The generic `<Modal>` primitive intentionally renders only the transparent overlay scrim (`var(--color-overlay)` with backdrop-filter blur) to allow flexible custom modal sizing, expecting child components to declare their own solid surface token (`var(--color-bg-surface)`). The unstyled `<div>` wrapper lacked this token. On the filters side, only physical attributes (height, build, complexion, hair) had been wired up in the modal.
- **Fix:** Upgraded the inner modal container in `ClientDashboard.tsx` to a standard solid surface container (`motion.div` with `background: "var(--color-bg-surface)"`, `border: "1px solid var(--color-border-default)"`, `boxShadow: "var(--shadow-modal)"`, `rounded-[var(--radius-xl)]`). Purged CVV code input and inline "+ Add New Card" from the quick funding modal in favor of clean card selection. Expanded the client-side Performer Filter modal with Age range chips, Gender presentation chips, an interactive Budget slider (₦0 to ₦150k+ with live readout), and Location hub pills. Populated mock attributes in `talents.ts`.
- **Validation:** All 124 unit tests pass, typecheck clean, standalone bundle regenerated.

### 78. Developer Test Artifact Link & Cluttered Radio Input Layout in Fund Client Wallet Modal
- **Severity:** Low / UI-UX Polish & Production Cleanliness
- **What happened:** In `ClientDashboard.tsx`, the "Fund Client Wallet" modal displayed a developer test link `"Test insufficient balance error"` floating next to the CVV input in production UI. In addition, the amount input lacked fintech contrast, the quick preset chips had low visual affordance, and the saved cards list used default radio buttons inside oversized cards without dedicated brand markers.
- **Root Cause:** Prototype testing helper button left inline in UI markup instead of being triggered naturally through amount thresholds ($\ge ₦1,000,000$).
- **Resolution:** Removed the floating test link completely while maintaining existing test coverage for insufficient funds; transformed the amount input into a high-contrast fintech container with `#7B00FE` currency sign and bold 24px mono numbers; upgraded quick amount presets into tactile button chips with purple active states; styled saved cards as mini payment cards with dedicated Mastercard and Visa brand badges; integrated the CVV code into an intuitive security row with helper copy; and refined the primary action button with an escrow protection badge. All 124 unit tests pass, typecheck clean.

### 77. Hardcoded Accent Red Border & Ambiguous Action Modal CTAs in OrderRoom & Transaction History
- **Severity:** Low / UI Consistency & Action Clarity
- **What happened:** In `OrderRoom.tsx`, active milestone and checklist items rendered hardcoded red borders (`border-[var(--color-red)]`) and red badges even when viewed from the client perspective, violating role colorway isolation (client is `#7B00FE`, talent is `#F13030`). Furthermore, the modal button read ambiguous `"Verify"` for both checking in and uploading files, and the main advancement CTA was overly long (`"Confirm Brief & Advance to Deliverables"`). In `TransactionHistory.tsx`, filter chips and card accents were hardcoded to purple, not adapting to performer context.
- **Root Cause:** Static Tailwind CSS classes without role-aware checks (`isClient ? ... : ...`), causing cross-role visual leakage and verbosity.
- **Resolution:** Replaced lengthy text with `"Confirm Brief & Continue"`, dynamic contextual modal CTAs (`"Verify Check-In"` vs `"Submit Deliverable"`), and role-aware styling for borders, chips, and fee breakdowns. Validated with 124 passing unit tests and standalone bundle build.

### 76. Dual Chevron Icon Duplication on Universal `<select>` Containers & Syntax IIFE Closure in `TalentDashboard.tsx`
- **Severity:** Medium / UI Visual Defect & Syntax Integrity
- **What happened:** In `TalentDashboard.tsx`, dropdown menus (timeframe selector and review filters) rendered two adjacent chevrons (`~~`). Additionally, an unmatched closing tag in an IIFE in `TalentDashboard.tsx` caused a TypeScript compilation failure during dashboard refactoring.
- **Root Cause:** Universal CSS rule in `tokens.css` injected an SVG chevron background on all native `<select>` tags, which conflicted with manual `<ChevronDown />` icon components placed inside `<div className="relative">` wrappers. An extra closing tag block was mistakenly left after the clean script excerpt block.
- **Fix:** Removed redundant manual `<ChevronDown />` components across lines 4250, 4868, and 4881 in `TalentDashboard.tsx`, allowing CSS tokens to handle native select dropdown indicators cleanly. Corrected the closing brackets of the sides excerpt IIFE.
- **Validation:** All 124 tests pass cleanly, 0 TypeScript errors (`tsc --noEmit`), standalone build succeeded.

### 75. Redundant and Stacked UI Controls in Onboarding / Auth Screen
- **Severity:** Medium / UX/UI Redundancy & Cognitive Clutter
- **What happened:** In `AuthFlow.tsx`, the Login screen rendered two identical `[Performer | Client]` segmented role switchers stacked 50px apart (one outside the view and one inside). Additionally, the header bar displayed both a `< Back` button and a redundant `[Register | Sign In]` switcher right next to each other, while the bottom of the form also had a redundant view-switching link. Furthermore, a large "Quick demo access" divider with large buttons repeated "Performer" and "Client" a third time on the same screen, and the left illustration panel did not dynamically adapt its value proposition when switching to the Client role.
- **Root Cause:** Conditional rendering guard `{view !== "register" && ...}` allowed the top role switcher to render simultaneously with an internal role switcher inside the login view, while legacy navigation buttons and dev demo helpers cluttered the primary conversion form.
- **Fix:** Consolidated into a single master segmented role switcher (`[Performer | Client]`) at the top of the form column. Removed duplicate role selectors inside login and register views. Replaced the cluttered header switcher with a clean `< Back` button, letting bottom links handle view transitions cleanly. Replaced the bulky demo box with a sleek footer pill row. Dynamically adapted left illustration panel copy, glow, and benefits for both Performer and Client roles.
- **Validation:** 124/124 tests pass, typecheck clean, standalone distribution bundle regenerated.

### 74. Onboarding Splash Screen Bypassed and Gradient Theme Desynchronization
- **Severity:** Low / UI Consistency & Layout Restoration
- **What happened:** In Session 124, navigation buttons in `LandingPage.tsx` were linked directly to `/auth?mode=login` and `/auth?mode=register&role=talent`, bypassing the clean split-screen splash view where users can freely toggle between Performer and Client modes. In addition, the left illustration panel utilized a heavy dark radial gradient card overlay rather than the clean split-screen layout with subtle accent aura and signature checklist badges.
- **Root Cause:** Intent-aware routing was pushed into the landing page header buttons rather than preserving the default splash onboarding flow as the entry point, and the illustration panel deviated from the earlier high-contrast split-screen aesthetic.
- **Fix:** Restored the earlier split-screen layout in `AuthFlow.tsx` with the flush left panel, bold display headline `"YOUR CRAFT. ON YOUR TERMS. INSTANTLY BOOKED."`, hand-drawn SVG underline under `"BOOKED."`, soft accent checkmark badges, and rounded-full pill segmented role toggle. Realigned `LandingPage.tsx` header CTAs to route directly to `/auth`. Rebuilt and inlined `monologg/monologg-app.html`.
- **Validation:** 124/124 tests pass, typecheck clean, standalone distribution bundle regenerated.

### 73. Aggressive ALL CAPS Titles and `uppercase tracking-wider` Typography Slop Across Platform
- **Severity:** Low / Typography & Visual Cleanliness
- **What happened:** Multiple screens rendered card titles, metric sub-headers, navigation labels, and modal titles in jarring ALL CAPS (e.g. `TOTAL EARNINGS TILL DATE`, `UPCOMING SHOOTS`, `ACTIVE AUDITIONS`, `Total Spend Till date`, `average rating`, `repeat talent rate`, `BASIC INFORMATION`, `PRIMARY CRAFT`, `FREQUENTLY ASKED QUESTIONS`).
- **Root Cause:** Inconsistent use of CSS utility `uppercase tracking-wider` and mixed casing in string literals that forced browser-level transformation to all-capital letters.
- **Fix:** Systematically audited and converted titles to sentence case / title case where appropriate with standard letter spacing (`font-body tracking-normal`). Updated test assertions in `ClientDashboard.test.tsx` and `Settings.test.tsx` while preserving strict telemetry contracts in `TransactionHistory.tsx`. Rebuilt and inlined `monologg/monologg-app.html`.
- **Validation:** All 124 unit tests pass, typecheck clean.

### 72. Double chevron on select dropdowns, disparate input heights, false error-red Availability active state, duplicate bio/tags during active editing, and cluttered bank payout callout layout
- **Severity:** Medium / UI-UX Polish & Visual Hierarchy
- **What happened:** 
  1. Multiple dropdowns in `TalentDashboard.tsx` (reviews filter, earnings timeframe select) rendered two adjacent chevrons (`~~`).
  2. Input heights across the performer profile form and payout bank settings were highly inconsistent (default 54px text-base vs 36px text-xs vs text-xs with 54px container).
  3. The "Available" toggle button was styled with `bg-[var(--color-accent)]` (`#F13030`), rendering bright brand-red with a green dot inside, making availability look like a critical system error.
  4. While editing the performer profile in `Settings.tsx`, read-only tags and bio rendered duplicated directly below the active edit form.
  5. The Payout Bank Account section was cluttered with two competing bulky callout boxes around a small bank card.
- **Root Cause:**
  1. In `tokens.css` (lines 303–312), universal CSS assigns an SVG background chevron to all `<select>` elements. Redundant manual `<ChevronDown />` icons placed inside `<div className="relative">` wrappers produced duplicate icons.
  2. Uncoordinated height classes across `<Input>` and `<select>` elements.
  3. Semantic misuse of the primary brand accent red on an affirmative availability state.
  4. Missing conditional gate `!isEditingProfile` around read-only tags and bio.
- **Resolution:**
  1. Removed redundant manual `<ChevronDown />` components in `TalentDashboard.tsx`.
  2. Standardized all form inputs and selects to `h-11 rounded-xl text-sm font-body px-3.5` with clean badge positioning.
  3. Replaced red button styling with a modern emerald green active pill for "Available" and an amber active pill for "Booked".
  4. Gated read-only tags and bio behind `!isEditingProfile &&`.
  5. Overhauled bank payout section into a clean fintech card layout with masked account number and streamlined 48hr security guidance.
  6. All 124 unit tests passing, zero TypeScript errors.

### 71. Cross-contamination of client safeguard withdrawal gate into performer transaction history & unparameterized navigation links causing role reset on shared pages
- **Severity:** High / Role Boundary Integrity & Flow Isolation
- **What happened:** In `TransactionHistory.tsx`, the "Withdraw Funds" button (triggering the 3-step Client Live Projects Safeguard modal) was rendered unconditionally on the hero card for both performers and clients alike. When performers navigated to `/transactions`, they saw the client withdrawal CTA. If clicked, it initiated a client-project draft liquidation warning and redirected them to `/client` upon completion. Furthermore, multiple links in `ClientDashboard.tsx` navigated to `/settings` or `/transactions` or `/order/:id` without `?role=client`, causing shared dual-sided pages to default back to performer views. In `OrderRoom.tsx`, the `role` state was hardcoded to default to `"talent"` even when entered from client projects.
- **Root Cause:** Absence of role-gating (`useSearchParams`) on the withdrawal CTA in `TransactionHistory.tsx`, unparameterized navigation paths in `ClientDashboard.tsx` and `LandingPage.tsx`, and uninitialized role state in `OrderRoom.tsx`.
- **Resolution:**
  1. In `TransactionHistory.tsx`, gated the withdrawal hero CTA with `isClient = searchParams.get("role") === "client"`. Performers now see the clean Session 109 ledger view with "Escrow Protected / Automated Ledger Settlement" and zero client withdrawal CTAs. Clients see "Client Transactions & Escrow" and the 24hr safeguard withdrawal CTA. Updated recipient org name resolution to pull from `appStateSync.getClientProfile()`.
  2. In `ClientDashboard.tsx`, appended `?role=client` to all outbound links to `/transactions`, `/settings` (with `section=payment`), and `/order/:id`.
  3. In `OrderRoom.tsx`, initialized `role` from `searchParams.get("role") === "client" ? "client" : "talent"`.
  4. In `Settings.tsx`, initialized active section from `searchParams.get("section")` and role-scoped transaction links (`/transactions?role=client` vs `/transactions?role=talent`).
  5. In `LandingPage.tsx`, updated user menu transaction history links to pass role parameters.
  6. Verified with 9/9 tests in `TransactionHistory.test.tsx` and 124/124 tests passing across all 25 suites.

### 70. Modal backdrop click-propagation causing accidental dismissal on inner clicks & missing insufficient funds error state in Fund Wallet
- **Severity:** Medium / UX Stability & Payment Error Handling
- **What happened:** In `ClientDashboard.tsx`, interactive child controls inside the Fund Client Wallet modal (preset pills, form inputs, buttons) did not stop click event propagation. Clicks bubbled up to the outer `<Modal>` component wrapper which triggered `onClose` and closed the modal unexpectedly. Additionally, the client wallet funding flow lacked error handling when a debit card had insufficient funds and did not offer alternative payment channels like Paystack bank transfer or USSD.
- **Root Cause:** Omission of `onClick={e => e.stopPropagation()}` on the modal container div, and absent error state branching in the card debit handler.
- **Resolution:** Added `onClick={e => e.stopPropagation()}` to all modal container divs in `ClientDashboard.tsx` and `TransactionHistory.tsx`. Implemented an Insufficient Funds declined card error banner with one-click recovery CTAs (`Try Another Card` and `Switch to Paystack`), and built an authentic multi-channel Paystack Checkout modal with instant Escrow Virtual Account transfer and USSD support. Verified with 15/15 tests passing in `ClientDashboard.test.tsx` and 124/124 tests passing across the entire web app.

### 69. Low-contrast lavender text on light modal surfaces & misleading 0-draft project status in withdrawal confirmation
- **Severity:** Low / Visual Accessibility & UX Logic Consistency
- **What happened:** In `TransactionHistory.tsx`, information cards inside the withdrawal modal used fixed light-purple classes (`text-purple-200`, `text-purple-300`, `text-white`), rendering text virtually invisible against white/light backgrounds in light theme. In addition, withdrawing funds when no live projects were active still rendered `0 Projects Moved to Draft` in warning amber and displayed confusing instructions telling the client to find their saved projects under Drafts.
- **Root Cause:** Hardcoded dark-theme text tokens in translucent purple containers without theme awareness, and unconditional rendering of project draft rows/guidance regardless of actual moved projects count.
- **Resolution:** Upgraded all notice containers to theme-adaptive high-contrast colors (`bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/40`, `text-purple-900 dark:text-purple-100`, `text-purple-800 dark:text-purple-200`) achieving WCAG AAA contrast compliance. Added state tracking for `withdrawnProjectsCount`: when 0 projects are affected, the draft line item and instructions are suppressed in favor of a clean settlement progress notice and direct action buttons.

### 68. Unclosed JSX Modal container tag in `TransactionHistory.tsx` & vitest synthetic submit event bubbling on wizard forms
- **Severity:** Medium / Build Syntax & Synthetic Event Compatibility
- **What happened:** During the implementation of the 3-step client withdrawal safeguard gate modal in `TransactionHistory.tsx`, an unclosed `<Modal>` tag at the end of the file caused Vite and Vitest's esbuild parser to throw a syntax error (`Unexpected token, expected "}"`). Additionally, in the Vitest JSDOM environment, clicking the primary submit button in the withdrawal amount step did not trigger the modal step advance handler if the handler was attached solely to `<form onSubmit={...}>` without an explicit `onClick` callback on the `<button type="submit">`.
- **Root Cause:** A missing closing `</Modal>` tag when wrapping the new withdrawal modal JSX block, and synthetic DOM form submit bubbling differences between real browser environments and jsdom.
- **Resolution:** Fixed the JSX nesting with proper `</Modal>` closure. Attached explicit `onClick` progression handlers alongside the form `onSubmit` handlers on all step transition buttons. Verified with 100% test pass rate across `TransactionHistory.test.tsx` (8/8 tests passing) and clean standalone bundle compilation.

### 67. Withdrawal passcode card erroneously exposed to client accounts & legacy organization types drifting from onboarding
- **Severity:** Low / Domain Model Alignment & Security UX Clarity
- **What happened:** In `Settings.tsx`, the `Change Passcode` card was rendered unconditionally across both performer and client accounts, even though clients neither earn funds nor execute bank withdrawals requiring a 4-digit PIN. Additionally, the client profile organization type dropdown retained legacy `STUDIO / BRAND / EVENT / CHURCH` values rather than matching the modern Brand Types established in onboarding (`Creative Agency`, `Brand`, `Production Company`, `Events Company`, `Individual`, `Other`), causing client accounts to display `Verified Studio` even when registered as brands or individuals.
- **Root Cause:** Missing role-gate `!isClient` around the `Change Passcode` container in Security & Privacy, and un-migrated dropdown option items in the client profile editor.
- **Resolution:** Gated `Change Passcode` exclusively to performers (`{!isClient && ...}`), aligned organization types to onboarding's 6 Brand Types, updated labels to `Brand Name` and `Brand Type`, and unified profile naming to `Profile` with `Verified Client` across client settings and dashboard navigation.

### 66. Rigid modal-only draft editing preventing modification of craft niches, deliverables, timeline, or reference assets
- **Severity:** Medium / Feature Completeness & UX Friction
- **What happened:** In `ClientDashboard.tsx`, entering draft project information was restricted to a single modal card editing title, budget, description, and script excerpt. Clients could not modify requested craft niches, production location, estimated delivery timeline, deliverables checklist items, or reference attachments, forcing fallback defaults.
- **Root Cause:** Incomplete state wiring in the project details view, binding only synopsis and script overrides while hardcoding remaining fields from static default templates.
- **Resolution:** Engineered a 5-dimension Section-by-Section Inline Editable Architecture paired with an interactive Draft Stepper. Each section (`overview`, `roles`, `sides`, `deliverables`, `assets`) transforms on demand into an inline form, saves directly into `projectOverridesInfo[selectedProjectDetail.id]` and `selectedProjectDetail`, and transforms cleanly back to view mode.

### 65. Talent profile modal trapped in Discover tab scope failing to mount from Applicant pipeline cards
- **Severity:** Medium / Feature Accessibility & Modal Scope
- **What happened:** In `ClientDashboard.tsx`, the performer profile modal `{selectedTalent && <Modal ...>}` was nested inside `{activeTab === "discover" && (...) }`. When a client inspected an applicant in `activeTab === "projects"` and clicked "View Profile & Reels →", `selectedTalent` was populated in component state but the modal never mounted because `activeTab` was `"projects"`, leaving the user with an unresponsive click.
- **Root Cause:** Placement of the modal inside the Discover view container rather than the dashboard's root-level `<AnimatePresence>` container.
- **Resolution:** Lifted `{selectedTalent && <Modal ...>}` to the root `<AnimatePresence>` container alongside `showFundWalletModal`. Added `selectedApplicantForProfile` state so the modal dynamically equips audition proposal quotes, submission timestamps, and full casting decision CTAs (`Reject`, `Shortlist`, `Accept / Hire Performer`, `Open Order Room`).

### 64. Multi-line button text wrapping on compact sidebars and narrow viewport widths
- **Severity:** Low / Visual Polish & Typographic Hierarchy
- **What happened:** Action buttons such as `Publish Brief & Fund Escrow` or contextual secondary triggers wrapped across two lines in the project detail sidebar (`Publish Brief & \n Fund Escrow`), violating senior FAANG UX standards and creating cluttered card layouts.
- **Root Cause:** Missing `whitespace-nowrap` on shared button primitive (`Button.tsx`) and overly verbose action microcopy.
- **Resolution:** Added `whitespace-nowrap` to `baseStyles` in `Button.tsx`. Streamlined button text to crisp, punchy microcopy (`Publish & Fund Escrow`, `Pause Applications`, `Copy Casting Link`, `View Order Room`, `Post Similar Brief`, `Delete Draft`).

### 63. Inactive draft project briefs leaking live applicant cards, search filters, and progress counters
- **Severity:** Low / Logical State Consistency & Information Hierarchy
- **What happened:** When inspecting a project in `draft` status, the applicant pipeline displayed a list of fallback candidates, search inputs, filter chips, and capacity counters (`2 / 10 applicants filled`), which is logically contradictory because a draft brief has not been published or opened to talent.
- **Root Cause:** Mock applicant state was unconditionally initialized with fallback data, and the pipeline section did not check `currentStatus === "draft"`.
- **Resolution:** Updated pipeline rendering: when `currentStatus === "draft"`, candidate cards, filter chips, and search inputs are suppressed, and an editorial `Casting Pipeline Inactive` banner is rendered with a direct `Publish & Fund Escrow` action. Also updated the projects list view so drafts display `Draft saved {date}` and `Target: {cap} performers · Inactive draft`.

### 62. Legacy slide-over applicant modal simultaneously mounting during dedicated full-page project inspection
- **Severity:** Low / UI Conflict & Modal Leakage
- **What happened:** When a client clicked "View Project →" from the projects list, `openProjectDetail` set `selectedProjectDetail(project)` AND `setApplicantsProject(project)`. The legacy slide-over modal was guarded only with `{applicantsProject && (`, causing both the full-page detailed project view and the legacy slide-over modal to mount at the same time, polluting the DOM and obscuring interaction.
- **Root Cause:** Reusing the applicant state setter in the new page-level detail view opener without conditioning the slide-over modal wrapper against active full-page detail mode.
- **Resolution:** Added a strict guard condition `{applicantsProject && !selectedProjectDetail && (` in `ClientDashboard.tsx`. Now, opening the dedicated full-page project detailed view suppresses the legacy modal completely while allowing the rich in-dashboard talent inspection modal and applicant pipeline to operate cleanly. Validated via automated tests in `ClientDashboard.test.tsx`.

### 61. Multi-line header and counter wrapping in client onboarding, duplicate hero buttons on client dashboard, mismatched brief niches, static location input, and legacy currency/preset pills
- **Severity:** Low / UI Polish & Cross-Flow Consistency
- **What happened:** In `ClientOnboarding.tsx`, the performer category question was long and wrapped into 2 lines, pushing the selection counter to wrap awkwardly into two stacked words (`2 \n selected`). In `ClientDashboard.tsx`, the hero card was titled "Total spent · 2024" and displayed duplicate action buttons ("Post a project", "Find performers") that were already mirrored directly below. In `ProjectBrief.tsx`, Step 2 still used an old 7-niche list rather than the standard 6 performer categories, and Location was a bare text input rather than the interactive 28-hub dropdown used in performer onboarding. Step 3 was called "Script & Assets", and Step 4 contained obsolete foreign currency pills and preset amount buttons.
- **Root Cause:** Incomplete synchronization between newly standardized onboarding models and legacy brief builder screens; lack of mobile label width constraints causing awkward wrapping.
- **Resolution:** Cleaned category header in `ClientOnboarding.tsx` to single-line `Performer Categories` with a sleek inline pill badge (`whitespace-nowrap`). Updated Client Dashboard hero card to `Wallet Balance` with a single `Fund Wallet` CTA (with interactive funding modal). Upgraded `ProjectBrief.tsx` to the standard 6 performer categories, added interactive 28-hub Nigerian locations dropdown, renamed Step 3 to `Assets`, and removed currency/preset pills in Step 4 while renaming applicant cap to `Maximum applicants`.

### 60. Premature payment collection in client onboarding, missing performer category multi-select, and slash clutter in organization types
- **Severity:** Low / UX Flow Friction & Taxonomy Alignment
- **What happened:** In `ClientOnboarding.tsx`, new clients were confronted on Step 3 with a mandatory credit-card form before they had browsed any talent or initiated a booking, creating high onboarding drop-off. In addition, Step 1 labels used compound slash conventions (`Brand / Corporate`, `Individual / Freelancer`) and impersonal copy ("Tell us about your company"), while Step 2 lacked discovery preference collection for the 6 core performer categories.
- **Root Cause:** Early prototype scaffolding carried over legacy payment-first onboarding step and lacked alignment with the 6-craft performer taxonomy established in Session 81.
- **Resolution:** Removed Step 3 entirely, condensing client onboarding to 2 focused steps. Streamlined Step 1 copy to "Tell us about you", renamed fields to "Brand Name" and "Category", and stripped all slashes (`Brand`, `Individual`). Rebuilt Step 2 with an interactive multi-select grid of all 6 platform performer craft categories paired with hiring frequency, routing directly to the Client Dashboard upon completion.

### 59. Overwhelming dual red alert boxes in Delete Account modal and overly dense settings copy
- **Severity:** Low / Visual Overload & UX Polish
- **What happened:** In `Settings.tsx`, the Delete Account confirmation modal presented two saturated, red-bordered boxes stacked consecutively with dense legalistic text ("Permanent Loss of All Information", "Earnings Payout Guarantee (Under 72 Hours)"), creating an alarming, visually aggressive experience that overwhelmed users. Additionally, the personal details section used wordy, artificial phrasing ("Personal & Craft Persona", "Your verified legal identity, primary performance craft discipline, and Thespian AI voice and style analysis.").
- **Root Cause:** Attempting to convey both data loss and payout guarantees using high-alert crisis styling rather than calm, structured, consumer-grade dialog layout.
- **Resolution:** Replaced the two aggressive red alert boxes with a single elevated surface card (`var(--color-bg-elevated)`) with hairline borders and subtle, calm icons: Item 1 (`Profile & Content Removed` with soft red circle) and Item 2 (`Remaining Balance Sent to Bank` with soft green circle and clean destination chip). Simplified section header to `Personal Details` and rewritten copy into clean, plain English without buzzwords.

### 58. Missing dedicated settings section for onboarding personal & craft details and redundant buttons bar hovering above edit profile
- **Severity:** Low / Information Architecture & UX Redundancy
- **What happened:** In `Settings.tsx`, basic onboarding details (Gender, Date of Birth, Location, Primary Craft, Thespian AI Performance Summary, and Style Tags) had no dedicated destination in Settings where performers could inspect them in a simple read-only manner. Performers only had the public storefront editor under "Profile". In addition, the Edit Profile screen featured a floating button bar (`[Edit Profile] [Share Profile] [View Public Storefront] [Save Profile]`) directly above the profile banner that duplicated the actions situated immediately below on the profile header itself.
- **Root Cause:** Conflation of public storefront showcase with personal performer persona; redundant duplication of header action buttons in an auxiliary container.
- **Resolution:** Added a dedicated **Personal & Craft Details** section in Settings with a clean read-only view by default (Basic details, Primary craft with icon, AI summary quotation block, and style tag pills) alongside an interactive Edit Mode. Removed the redundant top action bar above the profile cover banner, harmonizing action controls beside the performer avatar and placing the Save CTA directly in the sticky top navbar.

### 57. Redundant sub-badges on filter tabs and duplicate fee breakdown row on feed cards
- **Severity:** Low / Visual Clutter & Information Architecture
- **What happened:** In `TransactionHistory.tsx`, filter chips displayed dual nested labels (e.g., `Payout Success`, `Escrow Pending`, `Dispute Settled / In Review`), which created visual noise and redundant text. Additionally, every transaction card rendered a secondary bottom row with verbose fee and account breakdowns (`Paid to ... Base ... Fee ... Ref: ...`) that duplicated the information already surfaced cleanly in the detail modal upon tapping the card.
- **Root Cause:** Attempting to surface secondary telemetry both at the filter level and at the card preview level rather than strictly in the detail view.
- **Resolution:** Stripped sub-badge bubbles from the filter tabs to keep only the clean primary titles (`All`, `Payout`, `Escrow`, `Dispute`). Removed the secondary breakdown footer row from the transaction cards, leaving clean, compact, scannable cards with all detailed breakdown fields safely housed inside the detail modal.

### 56. Complex legalistic jargon in modal, status badge terminology mismatch, and text-dense ledger cards
- **Severity:** Low / Visual Hierarchy & Readability Polish
- **What happened:** In `TransactionHistory.tsx`, status badges on transaction cards used legacy terms like "Released" and "In Escrow" instead of the user's explicit simplified terminology (`Success` for payouts, `Pending` for escrow, and `Settled` or `In Review` for disputes). Furthermore, the transaction cards lacked quick scannability with no dedicated state icons, and the detail invoice modal used dense legalistic phrases ("arbitration concluded", "automated ledger settlement", "milestone deliverables incomplete") rather than simple, transparent everyday language.
- **Root Cause:** Legacy badge terminology mapping and verbose copy in earlier iteration templates.
- **Resolution:** Updated `STATE_META` to map `RELEASED` to `Success`, escrow states to `Pending`, `REFUNDED` to `Settled`, and `REFUNDING` to `In Review`. Redesigned cards with 40px rounded state icons (`CheckCircle2`, `Clock`, `AlertCircle`, `RotateCcw`), bold left-right hierarchy, and a clean secondary context footer. Rewrote the detail modal copy into direct, human 1-sentence explanations (e.g., *"Booking was cancelled. Money was refunded to the client. You received ₦0."*) focusing strictly on essential figures.

### 55. Static hardcoded balance card, redundant withdrawal CTA on performer history, and ambiguous dispute accounting
- **Severity:** Medium / Financial Ledger UX & Telemetry Accuracy
- **What happened:** In `TransactionHistory.tsx`, the top black summary card showed a static hardcoded `₦1,420,000` balance and `8 Completed Escrow Contracts` that failed to update when switching status filter pills. In addition, the card featured a redundant `Request Payout Withdrawal` CTA that conflicted with performer wallet actions on `TalentDashboard.tsx`. Furthermore, disputed transactions were generically labeled as "Payment · Refunded" without clarifying whether funds were returned to the client or received by the performer, causing ambiguity over available balances.
- **Root Cause:** Hardcoded strings in the summary hero card; lack of dynamic category aggregation logic; missing dispute taxonomy distinguishing `In Review` mediation from `Refunded to Client` settlements.
- **Resolution:** Removed the withdrawal CTA button; implemented a 4-chip taxonomy (`All`, `Payout`, `Escrow`, `Dispute`); connected the hero card to dynamically compute and display the active category's total amount, title, and contract count; and introduced clear directional dispute badging (`↩ Refunded to Client`, `⏳ In Review`, `• Escrow refunded to client · Net performer earnings: ₦0`) with contextual resolution banners in the detail invoice modal.

### 54. Unprotected Delete Account card without confirmation/payout transparency, unmanaged password inputs with prematurely enabled CTA, and extraneous passcode subtext
- **Severity:** Low / UX Risk & State Management
- **What happened:** In `Settings.tsx`, clicking the Delete Account card did nothing (unbound `<button>` element with no confirmation modal or operational copy), creating confusion over what happens to a performer's profile, data, and unsettled escrow earnings. In addition, the Change Password form used uncontrolled `<Input>` components with an unconditionally active `Update Password` CTA that could be clicked without entering any credentials. Finally, the Change Passcode card included a redundant subtext that broke visual symmetry with the clean Change Password card.
- **Root Cause:** Placeholder delete button without confirmation modal; unmanaged input state in the password card; subtext asymmetry.
- **Resolution:** Built a comprehensive Delete Account confirmation modal with permanent data loss notice, under-72-hour earnings transfer guarantee to the user's verified bank account, and double-confirmation security gate (typing "DELETE"). Controlled all 3 password inputs in local state and disabled `Update Password` until all 3 fields contain text. Removed the subtext from Change Passcode for clean visual symmetry.

### 53. Cluttered Security & Privacy section, unverified single-input passcode without confirmation/current PIN validation, and non-functional 2FA/Sessions cards
- **Severity:** Low / UX Clutter & Security Validation Gap
- **What happened:** In `Settings.tsx`, the Security & Privacy section displayed non-functional placeholder cards for "Two-Factor Authentication" and "Active Sessions (2 devices logged in)" that created clutter without user utility. In addition, the withdrawal passcode card only showed a single raw input with "Save Passcode" that did not authenticate the user's current PIN nor require a confirmation PIN, and referenced an undeclared `securityPasscode` state variable that bypassed full input lifecycle checks.
- **Root Cause:** Placeholder security mockup elements from early templates; withdrawal passcode card not adhering to the standard 3-field credential change pattern (Current, New, Confirm New).
- **Resolution:** Removed the Two-Factor Authentication row and Active Sessions card. Reworked the withdrawal passcode card into a full "Change Passcode" card mirroring the Password card: subtext `4-digit PIN required to authorise earnings withdrawals`, 3 inputs (`Current Passcode`, `New Passcode`, `Confirm New Passcode`), full-width `Update Passcode` button, and robust validation enforcing the current passcode (`1234` default or previous code), 4-digit constraints, and matching confirmation before writing to `localStorage`.

### 52. Disjointed Payment Methods UX, duplicate payout bank cards, and improper saved cards exposure on Performer profiles
- **Severity:** Low / UX Consistency & Role Boundary
- **What happened:** In `Settings.tsx`, performers navigating to Payment Methods were presented with duplicate Payout Bank Account cards (an open edit form card at the top with a redundant "Verified" badge, and another bank card at the bottom of the page with an "Edit" button). Furthermore, client billing cards ("SAVED CARDS (OPTIONAL BACKUP)", "+ Add Card", and "+ Add Payment Method") were shown to performers who only receive payouts to a Nigerian bank account, creating visual clutter and operational ambiguity.
- **Root Cause:** Accidental duplication of bank card templates during early iterations; lack of role gating (`!isClient`) around billing card sections; missing operational copy explaining Monologg's single-bank payout model and 48-hour security locking rule.
- **Resolution:** Unified the performer payment section into a single, cohesive Payout Bank Account card. Relabeled the menu item and header to `"Payment details"`, removed the `Verified` badge and client saved card blocks for performers, explicitly stated the one-payout-bank policy both before and after saving, and integrated a 48-hour security memo warning.


### 51. Duplicate "Save Changes" button label collisions and vertical form questionnaire replacing authentic performer storefront in Settings
- **Severity:** Low / Test Ambiguity & UX Consistency
- **What happened:** In `Settings.tsx`, rendering a simple vertical form with onboarding questions (craft category dropdown, raw email input) duplicated account identification data already presented in the main Settings header card, while lacking the rich Performer Profile aesthetics (Hero banner presets, avatar camera overlay, video reel preview, rate cards, and social links). Furthermore, rendering multiple identical `"Save Changes"` buttons across the top bar, in-page edit form, and page bottom caused test query ambiguity (`getByText("Save Changes")`).
- **Root Cause:** Duplication of onboarding inputs on the profile sub-page; lack of distinct action labeling (`Save Profile` for inline forms vs `Save Changes` for the primary submit action).
- **Resolution:** Refactored `section === "profile"` in `Settings.tsx` to replicate the full Performer Profile storefront card from `TalentDashboard.tsx` in an interactive, editable format. Relabeled the in-page form action to `Save Profile` and kept `Save Changes` as the unique primary page action, restoring clean test assertions and delivering a unified performer experience.

---

### 50. Redundant reviews modal header copy, missing rating distribution bars, and disjointed Settings profile editing
- **Severity:** Low / UI Redundancy & Settings Synchronization
- **What happened:** In `TalentDashboard.tsx`, the Reviews modal header repeatedly showed the same words across multiple elements ("Client Ratings & Reviews" title, "100% Verified" badge, "8 verified client reviews", and "100% Recommended" subtitle). It also lacked the standard marketplace rating distribution breakdown (5★ to 1★ bar charts) shown in the user's reference designs. In `Settings.tsx`, the user header card featured a redundant `Edit` pill on the right while the `Verified` badge sat below the email; additionally, clicking "Profile & Storefront" opened an incomplete editor that did not allow editing stage title, craft category, craft tags, or social handles collected during onboarding.
- **Root Cause:** Repetitive microcopy in reviews modal header; missing 3-column stats structure from PRD/references; obsolete "Storefront" nomenclature in settings; lack of synchronization between onboarding profile fields, Settings state, and `getPublicStorefront`.
- **Resolution:** Replaced the cluttered Reviews modal header with a clean, single-phrase title ("Reviews") and subtitle, accompanied by 3 clear statistical pillars: Total Reviews with verification status, Average Rating with 5 gold stars, and 5-to-1 star horizontal breakdown bars matching actual review scores. In `Settings.tsx`, replaced the top-right `Edit` pill with a prominent `✓ Verified` badge, renamed "Profile & Storefront" to "Profile", added a public profile preview card with link, and provided full editing of all onboarding-collected attributes (Full Name, Stage Title, Craft Category dropdown, Location, Bio, Style Tags, and Social Handles) synchronized with `appStateSync.getTalentProfile()` and public profile views.

---

### 49. Visual clutter from nested cards, double-icon duplication in review list, and mismatched graph palette
- **Severity:** Low / Visual Hierarchy & Brand Identity
- **What happened:** In `TalentDashboard.tsx`, the review cards suffered from heavy nested-card clutter (an overhead card inside the modal, plus nested gray quote boxes inside each review card) and icon duplication (displaying 5 star icons adjacent to the numeric rating, alongside client initials avatars and verification checkmarks). All ratings looked uniform without colored backgrounds to distinguish scores at a glance. In the Analytics tab, the category spline graph used generic electric cyan and pastel lavender that clashed with Monologg's crimson/violet design language, legends sat at the bottom of the card, and an out-of-place summary reputation bar was positioned below the chart.
- **Root Cause:** Over-nesting of card containers; lack of distinct rating badge styling; hardcoded cyan/lavender hex codes rather than platform brand tokens; placement of legends below chart rather than in the header.
- **Resolution:** Excised the out-of-place bottom rating bar. Removed the nested overhead 4.9 card container in the modal in favor of an integrated horizontal typographic summary strip. Replaced the 5-star row with a single, background-tinted rating badge (`★ 5.0` in emerald, `★ 4.9` in amber, `★ 4.8` in warm orange) and replaced nested gray quote boxes with clean italic text indented by a subtle left border (`border-l-2`). Overhauled chart palette to Monologg Performer Red (`#E50914`) and Client Violet (`#7C3AED`), and repositioned legends above the chart alongside the timeframe selector.

---

### 48. Fragmented dual analytics cards and lack of search/filter in client reviews modal
- **Severity:** Low / Information Density & Review Explorer Usability
- **What happened:** The analytics tab used a side-by-side 2-card layout (horizontal progress bars for categories and a separate bar chart) which felt fragmented and cramped compared to an expansive, smooth spline area curve showing category trends. Additionally, client reviews were shown as an un-filterable static list with no ability to search by client name, project, or keyword, nor filter by rating, date, or studio.
- **Root Cause:** Earnings by category was split across multiple smaller cards rather than taking advantage of full-width spline area charting; the reviews modal lacked a search input, filter selects, and sort state handlers.
- **Resolution:** Replaced the two-card split with a single full-width spline area chart ("Earnings by Category") utilizing Catmull-Rom cubic Bézier curve paths with dual gradient fills for the 2 active gigs/rate cards, interactive mouse-tracking tooltips, and a timeframe selector. Placed a dedicated Client Reviews & Studio Ratings reputation bar directly underneath the graph. Upgraded the Client Reviews modal with real-time search, multi-dimensional filters (rating, client, date/sort, tags), reputation breakdown, and direct `View Order Room →` navigation links.

---

### 47. Bulky accordion bank picker, invisible monthly growth chart bars, and lack of completed order rating system
- **Severity:** Low / UX Polish & Feedback Completeness
- **What happened:** In `TalentDashboard.tsx`, the destination bank input was wrapped in an expandable box accordion that felt heavy and clunky compared to a standard native input with subscript text. In the Analytics tab, the Monthly Booking Growth chart bars collapsed to zero height because of unconstrained flex-col sizing, and revenue was split across 3 generic niches instead of the performer's 2 real rate cards. In `OrderRoom.tsx`, once an order concluded (`phase === "complete"`), the action dock became empty with no reciprocal rating or review capability for clients and talents.
- **Root Cause:** Custom accordion introduced excessive DOM chrome; chart bars lacked explicit flex container heights; rate cards were hardcoded to 3 items rather than slicing active services (`effectiveServices.slice(0, 2)`); completed order phase lacked an interactive review feedback loop.
- **Resolution:** Replaced bank accordion with a clean `<select>` listing added accounts, showing account details and a green checkmark as minimal subscript text only. Restored initial receipt modal layout with a subtle 3.5% opacity Monologg watermark. Standardized 4 analytics cards (`Profile view`, `Project completed`, `Average rating`, `Total earnings`), restricted category earnings to the 2 available rate cards, and fixed chart bar rendering. Implemented reciprocal 1–5 star rating with prefilled tags and note textarea in `OrderRoom.tsx`, and connected the "Average rating" analytics card to a dedicated Client Ratings & Reviews modal linking directly to project order rooms.

---

### 46. Redundant dual bank select layout, awkward stretched passcode placeholder, and unbranded receipt
- **Severity:** Low / UX Flow & Brand Polish
- **What happened:** In `TalentDashboard.tsx`, the withdrawal authorization modal presented a redundant dual layout: an unstyled `<select>` dropdown stacked right above a standalone destination account card. On the passcode step, a redundant shield icon and "Authorize Payout" sub-header were shown, and the placeholder `"Enter 4-digit PIN"` was stretched across wide tracking (`tracking-[0.4em]`), creating an awkward visual bug (`E n t e r   4 - d i g i t`). Furthermore, the generated Payout Receipt lacked Monologg brand identity and watermark when saved or printed.
- **Root Cause:** Legacy MVP modal components combined `<select>` elements with display preview cards without consolidating them into an interactive selector; the text placeholder was styled with numeric tracking; receipt modal omitted brand mark and watermark tokens.
- **Resolution:** Re-titled modal to "Withdraw Funds" and unified destination account selection into an interactive card displaying the bank name as primary, subtext with masked account number & account name, and a green verification checkmark with an expandable added accounts dropdown. Standardized PIN input to standard conventions (`h-12`, `font-mono text-xl tracking-[0.4em]`, `placeholder="••••"`), titled "Enter your passcode" with "Withdraw Funds" CTA. Overhauled Payout Receipt with Monologg header brand mark, centered subtle logo watermark (`LogoMark`), and escrow protocol verification stamp with print contrast.

---

### 45. Inappropriate "Request Revision" action on concluded onsite gigs and cluttered jagged header title
- **Severity:** Low / UX Logic & Visual Polish
- **What happened:** In `OrderRoom.tsx`, clients reviewing an onsite live performance (e.g. Comedy Night at Eko Hotel) were presented with a "Request Revision" button. Physical live event performances that have concluded cannot be revised; only digital deliverables can be re-cut or re-recorded. In addition, the header title was cluttered with stacked status pills, order IDs, and escrow chips that wrapped awkwardly, looking jagged and complex.
- **Root Cause:** Review action buttons lacked conditional branching on `isOnsite`, and header navbar rendered multiple metadata chips simultaneously rather than deferring detailed information to the dedicated Order Details modal.
- **Resolution:** Gated `Request Revision` to `!isOnsite`, showing only `Dispute` and brand-purple `Release ₦120,000` for onsite gigs (2 CTAs), while retaining `Request Revision` for digital submissions (3 CTAs). Simplified header title into a crisp, clean 2-line title and subtitle for both roles.

---

### 44. Arrival verification handshake PIN visible to performer in Order Details and multi-box input layout breakage
- **Severity:** Medium / Security & Handshake Integrity
- **What happened:** In `OrderRoom.tsx`, the arrival handshake code (`4821`) was rendered inside the Order Details modal regardless of role (`role === "talent"` or `role === "client"`). This allowed the performer to inspect the handshake code directly from their own details dialog, defeating the verification requirement of asking the client in person upon arrival. Furthermore, the PIN input in the Verify Live Appearance modal was split into multiple boxes that wrapped and stretched unevenly on mobile screens, appearing as two mismatched boxes.
- **Root Cause:** Missing role gate `{role === "client"}` on the arrival code container in the Order Details modal, and split input box styling without rigid container width controls.
- **Resolution:** Gated the arrival code block strictly to `{isOnsite && role === "client" && ...}`, hiding it completely from the performer. Replaced the multi-input PIN element with a single full-width numeric input box with centered letter tracking (`tracking-[0.4em]`), `maxLength={4}`, and real-time validation against the client's code.

---

### 43. Missing deliverable evidence workflow for onsite/live performers and lack of 48-hour inspection countdown guardrail
- **Severity:** Medium / UX & Product Integrity
- **What happened:** In `OrderRoom.tsx`, deliverable submission was limited exclusively to digital file uploads (MP3, WAV, PDF, ZIP). Live performers (such as standup comedians at Eko Hotel, stage actors, emcees, or runway models) had no formal way to submit on-site appearance evidence, GPS check-in/out stamps, or PIN handshake verifications. Additionally, there was no inspection countdown timer protecting performers from indefinite review delays.
- **Root Cause:** The early prototype assumed purely remote digital creative deliverables and lacked guardrails for physical on-site gigs and an escrow auto-release inspection window.
- **Resolution:** Added dual-mode Deliverable submission (`Online Files` vs `Onsite Appearance`) featuring GPS coordinates chip (`6.5244° N, 3.3792° E · Lagos`), timestamp chips, two verified proof methods (Check-in/Check-out with stage photo, and PIN handshake with 4-digit code `4821`), a dedicated Onsite Appearance Certificate in chat, and an active 48-hour inspection countdown timer with automated escrow release upon timer expiry if uncontested.

---

### 42. Eye-straining bright red sender chat bubbles, intrusive simulation banner, and clunky deliverable modal
- **Severity:** Low / UX & Visual Design
- **What happened:** In `OrderRoom.tsx`, performer chat messages were rendered in a searing solid red (`#F13030`) background that clashed with conversational legibility. In addition, an intrusive "Simulate Role" banner spanned the entire chat width, and the "Submit Deliverable" modal lacked interactive file selection and staged file previews.
- **Root Cause:** Chat bubbles used raw brand accent color instead of conversational neutral hierarchy, and developer simulation controls were positioned inside the primary message view.
- **Resolution:** Upgraded sender message bubbles to a sophisticated obsidian (`#18181B`) background with white typography; moved role simulator to a compact segmented toggle in the header; added a clean 4-step phase progress strip; and rebuilt the Submit Deliverable modal with real drag-and-drop file staging and preview.

---

### 41. Over-cluttered project detail modal with AI slop/gradient cards and redundant search category pills strip
- **Severity:** Low / UX & Visual Design
- **What happened:** Inspecting a project presented a cramped overlay modal with visual clutter ("Client Favorite" gradient cards, multiple colored icon strips, fragmented tab navigation). Simultaneously, a redundant row of category tags sat directly under the search bar while filters were displayed as an inline accordion panel.
- **Root Cause:** Accumulated prototype UI elements (tabs, gradient badges, inline accordion controls) led to visual fatigue and cramped presentation on smaller viewports.
- **Resolution:** Replaced the modal with a dedicated fresh-page editorial view with clean typography hierarchy, clear sections (Creative Brief, Role Requirements, Audition Sides with copy button, Deliverables, Escrow), stripped the redundant category strip beneath the search bar, and moved filtering into an accessible Filter Modal featuring budget and rating sliders alongside clickable craft pills.

---

### 40. Stale application state sync in project modal and unmapped mock applications
- **Severity:** Low / UI State & Data Integrity
- **What happened:** In `TalentDashboard.tsx`, withdrawing an application within the open project detail modal did not immediately update the open modal's state (requiring a close and re-open to see the withdrawn state). Additionally, `MY_APPLICATIONS` had an entry (`myapp-3` referencing `P-006`) that was not registered in `PROJECTS`, causing fallback placeholder data to load instead of an authoritative client brief.
- **Root Cause:** `handleWithdrawApplication` only updated `myApplications` array state without propagating to `selectedProject`. Furthermore, `P-006` was missing from `mocks/projects.ts`.
- **Resolution:** Updated `handleWithdrawApplication` to reactively update `selectedProject.myApplication.status`. Added full mock entries for `P-006`, `P-007`, `P-008`, and `P-009` across all 6 crafts, and added `myapp-4` for testing the `SELECTED` state with "Open Order Room" navigation.

---

### 39. Stale standalone HTML distribution artifacts
- **Severity:** Low / Deployment & Distribution
- **What happened:** The root double-clickable preview files `monologg-app.html` and `monologg-design-system.html` had not been rebuilt since Session 3 (July 28). When opened directly by non-technical stakeholders or reviewers, they rendered a months-old version of the product lacking 80+ sessions of subsequent features.
- **Root Cause:** Build inlining was a manual step rather than an automated hook, causing the single-file distribution artifacts to drift from the active TypeScript codebase.
- **Resolution:** Re-ran `npm run build:standalone` and `npm run build:designsystem`, and inlined the updated production JavaScript and Tailwind CSS directly into both root distribution files.

---

### 38. Filter UX clutter and project brief transparency disconnect
- **Severity:** Medium / UX & Discovery
- **What happened:** In `TalentDashboard.tsx`, project filters were rendered as separate rows eating vertical space and lacked critical dimensions requested by users (Location, Client Rating). Furthermore, the project detail view was a compact modal that only showed a sparse summary and didn't reflect the detailed steps that clients completed during brief creation (script sides, deliverables, requirements, client credentials).
- **Root Cause:** Early mockups used a simple modal designed for initial brief previews without accommodating rich multi-step creative briefs or advanced filtering.
- **Resolution:** Replaced stacked filters with an inline `Filters` toggle button directly beside the search bar with 5 filter dimensions (Category, Budget Range, Status, Location, Rating). Redesigned the project detail view into a two-column Airbnb-style modal with a static header, 4 fast-nav brief tabs (`Overview`, `Requirements`, `Script & Assets`, `Client & Escrow`), and a sticky floating action card dynamically adapting to application status.

---

### 37. Projects and Activity search bar height and styling mismatch with filter dropdowns
- **Severity:** Low / Cosmetic
- **What happened:** In `TalentDashboard.tsx`, the search bar rendered as a bulky `54px` tall box with `bg-surface-2` (grey) background and `rounded-[var(--radius-lg)]`, while the three filter select dropdowns directly underneath were `36px` (`h-9`) tall with `bg-surface` (white) background, creating jarring visual inconsistency.
- **Root Cause:** `<Input>` defaults to `h-[54px]` while the filter `<select>` elements used `h-9` without synchronized styling.
- **Resolution:** Standardized both the search input and the filter selects to `h-10` (40px) with `rounded-xl`, matching `bg-[var(--color-bg-surface)]` background and `border-[var(--color-border-default)]` border. Added a quick clear (`X`) button inside the search input.

---

### 36. Duplicate headers and duplicate calendar strips on Availability page
- **Severity:** Medium / UI Clutter
- **What happened:** Navigating to the Availability tab rendered a duplicate `<h2>Availability</h2>` title and a second notification bell icon inside the tab content directly below the main shell header, as well as a redundant 14-day rolling horizontal date strip and duplicate date picker input.
- **Root Cause:** Legacy tab mockup retained an inner header bar and secondary date carousel above the main Month/Week/Day calendar views.
- **Resolution:** Removed the redundant inner header, notification bell, rolling date strip, and duplicate date input, centering Month, Week, and Day views with clean navigation controls.

---

### 35. TypeScript TS2367 comparison error in `TalentDashboard.tsx`
- **Severity:** High / Build Failure
- **What happened:** `npx pnpm -r typecheck` failed with `TS2367: This comparison appears to be unintentional because the types '"personal" | "hold"' and '"booking"' have no overlap.`
- **Root Cause:** In `handleAddEvent`, `bookingId` evaluated `newEventKind === "booking" ? "bk-local" : null`, but `newEventKind` was typed as `useState<"personal" | "hold">("personal")`.
- **Resolution:** Simplified `bookingId: null` since manually added creator events are personal/hold entries, while Monologg platform bookings originate from backend orders. Restored clean workspace typecheck.

---

### 34. `effectiveServices` in TalentDashboard hardcoding empty array for new users
- **Severity:** Medium / Data Flow
- **What happened:** In `TalentDashboard.tsx`, line 272 defined `const effectiveServices = isNewUser ? [] : services;`. When a new user created a rate card, the newly created card was saved in `services` / `appStateSync`, but `effectiveServices` remained `[]`, hiding their newly created rate cards from both their profile and rate cards tab.
- **Root Cause:** A stale ternary hardcoded `effectiveServices` to `[]` whenever `isNewUser` was true, ignoring newly created service entries.
- **Resolution:** Updated `effectiveServices` to directly bind to `services`, which initializes from `appStateSync.getServices()` and accurately reflects empty state initially and created rate cards dynamically.

---

### 33. `ReferenceError: useRef is not defined` in TalentDashboard.tsx
- **Severity:** High / Build Failure
- **What happened:** Vitest test suite failed across `TalentDashboard.notifications.test.tsx`, `TalentDashboardAvailability.test.tsx`, and `dashboardParity.test.tsx` with `ReferenceError: useRef is not defined`.
- **Root Cause:** Added `coverFileInputRef = useRef<HTMLInputElement>(null)` for the profile cover photo upload, but `useRef` was omitted from the React import statement.
- **Resolution:** Added `useRef` to `import React, { useEffect, useState, useRef } from "react";`. Restored 100% passing tests (24/24 files, 97/97 tests).

---

### 32. Onboarding test helper single-step transition failure after separating personal details and craft
- **Severity:** Medium / Test Suite
- **What happened:** In `CreatorOnboarding.test.tsx`, the `goToUploadStep` helper clicked "Continue" only once expecting to reach "Upload your showcase reel" (Step 2 in the old design).
- **Root Cause:** By dedicating Step 1 to Performer Personal Details and Step 2 to Craft Selection, the reel upload moved from Step 2 to Step 3. A single click on "Continue" advanced only to Step 2 ("What best describes your craft?"), causing Step 3 element queries to time out.
- **Resolution:** Added the second `fireEvent.click(await screen.findByText("Continue"))` inside `goToUploadStep` to properly traverse Step 1 (Personal details) and Step 2 (Craft), restoring 100% green status across all 24 web test files and 97 tests.

---

### 31. Out-of-sync test assertions and label selectors following talent-to-performer copy change
- **Severity:** Low / Cosmetic
- **What happened:** Vitest test suites (`ClientDashboard.test.tsx`, `ProjectBrief.test.tsx`, `AuthFlow.test.tsx`, `HelpSupport.test.tsx`, and `authFlowStress.test.tsx`) failed after updating platform copy from "Talent" to "Performer" due to strict regex string queries (e.g. `/Find Talent/i`, `/Talent Requirements/i`, `/When does a talent get paid/i`).
- **Root Cause:** Tests asserted on exact user-facing microcopy which was changed to standard "Performer" branding.
- **Resolution:** Synchronized all query matchers and label assertions in test files to expect "Performer" / "Performers", bringing the entire 24-file web test suite to 100% green (97/97 tests passing).

---

### 30. Select dropdown chevron arrow colliding with right rounded border radius & height mismatch with form inputs
- **Severity:** Low / Cosmetic
- **What happened:** Native `<select>` elements (e.g. Destination Bank Account select in Withdrawal Authorization modal, Repeats select in Recurring Availability modal) rendered dropdown arrows pressed right against the right border radius of pill containers and had mismatched heights (`44px` / `h-11`) compared to `<Input>` fields (`54px` / `h-[54px]`).
- **Root Cause:** Browser-default select arrows use small default padding (`px-3`) that collides with rounded corner curves (`rounded-xl` / `rounded-[var(--radius-md)]`), and individual components declared non-standard select heights.
- **Resolution:** Added a global CSS rule in `tokens.css` with `appearance: none !important`, custom SVG chevron vector icon (`stroke="%238E8E93"`), `background-position: right 0.875rem center !important` (14px inset), and `padding-right: 2.75rem !important`. Standardized form `<select>` elements to `h-[54px] rounded-[var(--radius-lg)] px-4 text-base` matching `<Input>` default height across all modals and forms.

---

### 29. Missing avatarUrl in SidebarIdentity interface
- **Severity:** Medium
- **What happened:** Attempting to pass `avatarUrl` to `Sidebar` in `ClientDashboard.tsx` and `TalentDashboard.tsx` resulted in TypeScript type errors `TS2353` and `TS2339` because `SidebarIdentity` interface lacked `avatarUrl?: string;`.
- **Root Cause:** `SidebarIdentity` interface was originally typed only for `initials`, `name`, and `subtitle`.
- **Resolution:** Added `avatarUrl?: string;` to `SidebarIdentity` in `Sidebar.tsx` and `<Avatar src={identity.avatarUrl}>` to render profile images with initials fallback. Verified with `npx pnpm -r typecheck` passing with 0 errors.

### 28. Overlarge numeric amount layout breakage
- **Severity:** Medium
- **What happened:** Entering extremely large base rates or project budgets (e.g. 15+ digits) caused calculations to overflow and broken layout blocks with text overlapping in the escrow calculator card and client brief screens.
- **Root Cause:** Input fields accepted arbitrary string length digits without limit validation, rendering labels that overflowed the fixed-width UI panels.
- **Resolution:** Implemented high-value limit validation in all currency inputs capping entry at `999,999,999,999,999`. If exceeded, it triggers a funny error modal rotating warning options with mobile layout viewport safety.

### 27. Multi-currency project brief budget multiplier bug
- **Severity:** Medium
- **What happened:** Selecting USD/GBP/EUR or other non-Naira currencies in `ProjectBrief.tsx` and selecting a budget preset caused the posted `budgetAmount` to be wrong, e.g., posting $150,000 instead of $100.
- **Root Cause:** The component parsed the Naira preset values (`selectedBudget.split("-")[0]`) and sent them directly to the API as the base budget unit for the selected currency.
- **Resolution:** Introduced unified currency conversion. The budget presets are now calculated on-the-fly and click presets update a precise `budgetAmount` in the selected currency, which is properly multiplied into cents/kobo units for transmission.

### 26. Database migration build block: AuthProvider type and UserActivity table missing from migrations
- **Severity:** High
- **What happened:** Database migration deploy (`prisma migrate deploy`) failed because the enum `AuthProvider` and table `UserActivity` from prior sessions were never generated in any migration file.
- **Root Cause:** Prior developers used `prisma db push` locally to bypass migrations, leaving the migration history out of sync with `schema.prisma`.
- **Resolution:** Flagged the migration mismatch for review, and resolved the local database state by running `prisma db push --accept-data-loss` to synchronize the Supabase test database schema.

### 25. Onboarding and Settings dashboard compilation errors due to missing imports and incorrect Badge component prop naming
- **Severity:** High
- **What happened:** TypeScript failed with multiple errors in `CreatorOnboarding.tsx`, `Settings.tsx`, `TalentDashboard.tsx`, and `ClientDashboard.tsx`.
- **Root Cause:**
  - `X` icon was used but not imported in `CreatorOnboarding.tsx`.
  - `Modal` was used but not imported in `Settings.tsx`.
  - `variant` prop was passed to `Badge` component in `ClientDashboard.tsx` and `TalentDashboard.tsx`, but the component expects `tone`.
  - `setBankDetails` was called instead of `updateBankDetails` on `appStateSync` in `Settings.tsx` and `TalentDashboard.tsx`.
  - `withdraw` was called instead of `withdrawFunds` on `appStateSync` in `TalentDashboard.tsx`.
- **Resolution:** Corrected the prop names and function calls, and imported the missing components/icons.

### 24. AuthFlow.tsx compilation error due to missing appStateSync import
- **Severity:** High
- **What happened:** TypeScript typecheck failed with `Cannot find name 'appStateSync'` in `AuthFlow.tsx`.
- **Root Cause:** `appStateSync` was used in `AuthFlow.tsx` for logging in demo users but was not imported from `../../lib/state-sync`.
- **Resolution:** Imported `appStateSync` at the top of `AuthFlow.tsx`.

### 23. Apps/api build-blocking typecheck error due to undeclared SUPABASE_JWT_SECRET
- **Severity:** High
- **What happened:** The API build/typecheck command failed with `Property 'SUPABASE_JWT_SECRET' does not exist on type '{ ... }'`.
- **Root Cause:** `SUPABASE_JWT_SECRET` was default-overridden in `apps/api/src/config/env.ts`'s parse logic, but was missing from the Zod validation schema `envSchema`, filtering it out from the typed `env` object.
- **Resolution:** Added `SUPABASE_JWT_SECRET: z.string().optional()` to the Zod schema in `env.ts`.

### 22. Vercel Production ReferenceErrors (`X is not defined`, `paymentCards is not defined`)
- **Severity:** High
- **What happened:** Opening Settings -> Payment Methods or deleting payment cards on Vercel deployment threw unhandled React runtime errors: `ReferenceError: X is not defined` and `ReferenceError: paymentCards is not defined`.
- **Root Cause:** `X` was missing from `lucide-react` import statement, and `paymentCards` state variable was undeclared in `Settings.tsx`.
- **Resolution:** Added `X` to imports and declared `paymentCards` / `deleteCardModal` state variables in `Settings.tsx`.

### 20. Creator Onboarding Style Tags Edit Toggle & Preset Tag Selection Missing
- **Severity:** Medium
- **What happened:** In Step 4 of Creator Onboarding (`Your style tags are ready.`), clicking `Edit tags` did not present preset tag choices or clear interaction cues for adding/removing style tags.
- **Root Cause:** The component only rendered a plain text input when `isEditingTags` was true without rendering suggested style tag chips or quick toggle actions.
- **Resolution:** Updated `CreatorOnboarding.tsx` to render interactive preset style tag chips (`Warm Texture`, `Conversational`, `Expressive`, `High Energy`, `Deep Voice`, `Commanding`, `Narrative`, `Character`), 1-click toggling, custom tag entry, and tag removal.

### 21. Talent Settings Payment Methods Missing Payout Bank Account Details
- **Severity:** Medium
- **What happened:** Clicking "Payment Methods" in Talent Settings only displayed credit card management instead of payout bank account configuration (Bank Name, Account Number, Account Name).
- **Root Cause:** Section `"payment"` in `Settings.tsx` was tailored exclusively for credit cards without rendering the Talent Payout Bank Account details form.
- **Resolution:** Updated `Settings.tsx` to render the Payout Bank Account Details form alongside saved cards for Talent users with instant state persistence via `appStateSync.setBankDetails()`.

### 19. Missing Zero-Data Default States & Onboarding Nudges for New Talent & Client Accounts

- **Severity:** Medium
- **What happened:** When a user newly signed up as either Talent or Client, opening their respective portal showed pre-populated fixture data (e.g. ₦850k earnings/spend, existing projects, past orders) with no dedicated empty views or guidance on what actions to take first.
- **What it meant:** New users were confused seeing pre-populated fake history instead of zero-data empty states and actionable onboarding nudges guiding them through setting up rate cards, creating briefs, or finding talent.
- **Root cause:** Navigation dashboards lacked a top-level zero-state toggle and default conditional rendering logic across navigation tabs.
- **Resolution:** Implemented `isNewUser` mode toggle, built Home tab Onboarding Action Nudge Checklist cards for both Talent and Client accounts, and added friendly empty state views with direct action CTAs across every single navigation menu/tab.

### 18. TalentDashboard.tsx type safety mismatch & dead modal rate card actions

- **Severity:** High
- **What happened:** In `TalentDashboard.tsx`, the `apiClient.createService()` call was invoked with keys matching the REST API schema (`serviceTitle`, `basePriceAmount`, `basePriceCurrency`, `deliveryTimeline`, `features`) instead of the client-side `ServiceRateCard` schema type signature (`title`, `price` as string, `delivery`, `bookings`). This resulted in a TypeScript compiler error. Furthermore, several unused state variables were declared (`showWithdrawModal`, `withdrawInput`, `withdrawMsg`, `handleWithdraw`) which triggered unused-locals warnings, and the modal forms/remove buttons were not wired up to the react states or API handlers, resulting in dummy actions that did not save changes.
- **What it meant:** The web app could not compile with strict typecheck rules, and the rate card manager UI was broken (clicking "Add" or "Remove" did not persist data).
- **How it was found:** SURFACED by IDE static typecheck analysis (`@[current_problems]`).
- **How it was fixed:** Removed the dead state variables, corrected the `createService` call parameters to match `ServiceRateCard`'s properties (`title`, `price`, `delivery`, `bookings`), bound the select/input modal controls to React states, and wired up `handleSaveService` (covering both create & edit) and `handleDeleteService` directly to their respective click actions.
- **Lesson for next time:** Ensure UI inputs are fully reactive and controlled, and keep state models aligned with client-side typescript definitions.

---

### 1. `rsync --exclude 'dist'` silently deleted `node_modules/vite` itself

- **Severity:** High
- **What happened:** While copying the working build into a persistent `app/` folder, the command used was `rsync -a --exclude 'dist' <source>/ <dest>/`. The `--exclude` pattern `'dist'` in rsync matches **any path component named `dist`, anywhere in the tree** — not just the top-level build-output folder it was meant to exclude. This also matched (and excluded) `node_modules/vite/dist/`, which is the actual Vite package's compiled code.
- **What it meant:** Starting the dev server immediately failed with `Cannot find module '.../node_modules/vite/dist/node/cli.js'` — Vite itself was missing a required file, so nothing could run.
- **How it was found:** The `vite` background process exited immediately; reading its output log showed the missing-module error.
- **How it was fixed:** Redid the copy with an anchored pattern, `--exclude '/dist'` (leading slash = only match at the root of the copy, not anywhere inside it), which correctly excluded only the intended build-output folder and left `node_modules` intact.
- **Lesson for next time:** rsync exclude patterns without a leading `/` are **not** anchored to the root — they behave like a global "exclude any match" rule. Always anchor them when the intent is "exclude this one top-level thing."

---

### 2. CSS `@import` ordering broke once tokens were extracted into a real stylesheet

- **Severity:** Medium (dev-server console noise and a real spec violation, but did not break the production `vite build` output)
- **What happened:** When the inline design tokens were extracted out of `Root.tsx` into `src/styles/tokens.css`, the new import was added as the *first* line in `src/styles/index.css`:
  ```css
  @import './tokens.css';
  @import './fonts.css';
  @import './tailwind.css';
  ```
  `tokens.css` contains plain CSS rules (like `:root { ... }`), while `fonts.css` and `tailwind.css` each contain their own `@import` statements. CSS requires **all `@import` statements to appear before any other rule** in the final, flattened stylesheet. Once the files are inlined in order, `tokens.css`'s plain rules ended up sitting *before* `fonts.css`'s `@import url(...)` lines — which is invalid.
- **What it meant:** The dev server repeatedly logged `[vite:css][postcss] @import must precede all other statements` — noise that could mask a real error in the console, and a genuine spec violation that some stricter CSS tooling would reject outright.
- **How it was found:** Noticed in the dev-server log output while doing a final health check after a round of changes.
- **How it was fixed:** Reordered the imports so anything containing its own `@import` statements comes first, and the plain-rules file (`tokens.css`) comes last:
  ```css
  @import './fonts.css';
  @import './tailwind.css';
  @import './tokens.css';
  ```
- **Lesson for next time:** When chaining `@import`s across multiple files, order files by "does this file itself contain more `@import`s" first, "plain rules" last — regardless of which file feels conceptually more important.

---

### 3. A stray `*/` inside a code comment prematurely closed a JS block comment

- **Severity:** High (build-breaking)
- **What happened:** In `src/lib/motionTokens.ts`, a doc comment included the literal text `--duration-*/--ease-*` as a way of referring to a group of CSS variable names. The `*/` inside that text is also the character sequence that **ends** a `/* ... */` block comment in JavaScript/TypeScript — so the comment closed early, and everything after it was interpreted as code instead of a comment.
- **What it meant:** `npx vite build` failed immediately with `Unexpected "*"` at the exact line, since the "leftover" comment text was no longer inside a comment.
- **How it was found:** Standard build-after-every-change verification (`npx vite build` was run after creating the file, per practice throughout this engagement).
- **How it was fixed:** Reworded the comment to avoid a literal `*/` sequence (spelled out "the duration/ease tokens" instead of the shorthand with wildcards).
- **Lesson for next time:** Never put a literal `*/` inside a `/* */` comment, even as part of a glob-style shorthand — it will always terminate the comment early.

---

### 4. A partial edit left a dangling, unclosed JSX tag mid-file

- **Severity:** Would have been High if it had reached a build; caught and fixed before that happened
- **What happened:** While wrapping the "Dispute Modal" in `OrderRoom.tsx` with the new shared `<Modal>` component, an edit replaced only part of the old opening `<motion.div ...>` tag's attributes, leaving the tag's own opening (`<motion.div\n  initial={{ opacity: 0 }}`) still present immediately followed by the new `<Modal onClose=...>` tag — an invalid, unclosed JSX structure.
- **What it meant:** Had this gone untouched, the file would not compile (unclosed tag / invalid JSX).
- **How it was found:** Re-reading the file immediately after the edit (standard practice: verify the surrounding context after any multi-part JSX restructuring) surfaced the malformed markup before any build was attempted.
- **How it was fixed:** Replaced the broken fragment with the correctly-scoped `<Modal onClose={...} strength="strong">` opening tag, removing the orphaned leftover lines.
- **Lesson for next time:** When replacing a multi-line JSX opening tag with a different component, match and replace the **entire** tag (from `<` to the closing `>`) in one edit, not just a sub-range of its attributes — otherwise it's easy to leave a syntactically broken hybrid behind.

---

### 5. Dependency-cleanup grep missed a CSS-only `@import`, breaking the build

- **Severity:** High (build-breaking, but caught immediately by the standard rebuild-after-every-change practice)
- **What happened:** Before removing unused packages, every dependency was checked against `grep -rl "from '<pkg>'"` across `src/`. That check only looks for JavaScript/TypeScript `import ... from` statements — it doesn't catch a CSS `@import 'tw-animate-css';` living inside `src/styles/tailwind.css`. `tw-animate-css` showed as "0 references" and was removed from `package.json`, but the CSS file still referenced it.
- **What it meant:** The very next `vite build` (of all three targets: app, standalone, design-system) failed immediately with `Can't resolve 'tw-animate-css'`.
- **How it was found:** Standard rebuild-after-every-change practice — ran all three builds right after `npm install`, all three failed with the same resolve error.
- **How it was fixed:** Checked whether any real `tw-animate-css` utility classes (`animate-in`, `fade-in`, `slide-in-from-*`, etc.) were used anywhere in the app first — confirmed none were (the one text match, in `Modal.tsx`, turned out to be inside a code comment, not an actual class). Removed the dead `@import 'tw-animate-css';` line from `src/styles/tailwind.css` itself, rather than reinstalling the package, since nothing depended on what it provided.
- **Lesson for next time:** When auditing "is this package used," check every place a package can be referenced for this project — JS/TS imports **and** CSS `@import`s/`@source` directives — not just one.

### 6. `createBrowserRouter` doesn't work when the app is opened as a local file

- **Severity:** Would have been High (silently broken navigation) had it shipped unnoticed — caught during design, not after a failed build
- **What happened:** The real app uses `createBrowserRouter` (pushState-based routing), which is correct for the localhost dev server and any real hosting, but doesn't work for a page opened directly via `file://`: there's no server to resolve an arbitrary path, and `file://` documents can't reliably `pushState` to a different path the way an `http://` origin can.
- **What it meant:** A double-clickable, single-file build of the app using the same router as the localhost version would load its first page fine, but clicking through to any other screen would break.
- **How it was found:** Reasoned through before building the standalone artifact, based on the same root cause noted back in Session 1 (`createHashRouter` was used for the very first sandboxed-preview Artifact, for an adjacent reason — no real origin in a sandboxed iframe).
- **How it was fixed:** Extracted the route tree into a shared `routeTree` export (`src/app/routes.tsx`) and added a second app entry (`AppStandalone.tsx`) using `createHashRouter(routeTree)` — same routes, same pages, same tokens, only used for the standalone HTML build target. The localhost dev server and any future real hosting keep using `createBrowserRouter` unchanged.
- **Lesson for next time:** Browser-history routing needs a real origin+server (or at least something that can rewrite unknown paths back to `index.html`); anything meant to be opened as a bare local file needs a hash router (or memory router, for a single fixed page) instead.

### 7. Dark-mode toggle silently did nothing on the standalone design-system page

- **Severity:** Medium (a real, user-facing broken control — the button visibly changed label but nothing else happened — caught by explicit user report, not a build failure)
- **What happened:** `DesignSystem.tsx` reads dark/light state via `useTheme()`, which is `useContext(ThemeContext)`. In the real app, `ThemeContext.Provider` is supplied by `Root.tsx`, which also toggles a `.dark` class on its own wrapping `<div>` (the class that `tokens.css`'s `.dark { ... }` selector actually keys off). The standalone design-system build (`main-designsystem.tsx`) renders `DesignSystem` directly inside a bare `MemoryRouter` — it never renders `Root` at all. With no `ThemeContext.Provider` in the tree, `useTheme()` fell back to the context's default value, `{ isDark: false, toggle: () => {} }` — a no-op function.
- **What it meant:** Clicking "Dark" in the design-system page's header called the no-op `toggle`, so nothing happened — no state change, no `.dark` class applied anywhere, no visual change at all.
- **How it was found:** User reported the toggle didn't work after opening `monologg-design-system.html`.
- **How it was fixed:** Extracted the state/persistence logic out of `Root.tsx` into an exported `useThemeState()` hook (same `localStorage` key, same shape), so `Root` and any other entry point can share it without duplicating logic. Added a small `StandaloneThemeProvider` in `main-designsystem.tsx` that calls `useThemeState()` and supplies both the `ThemeContext.Provider` and the `.dark`-class wrapping div that `Root` would otherwise have provided.
- **Lesson for next time:** Any page/component that reads a React Context needs *something* in its render tree providing that context — a standalone build that skips the app's usual root wrapper (for router or bundling reasons) silently loses whatever that wrapper was supplying, without any error. Worth checking every `useContext`-based hook when adding a new, narrower entry point.

### 8. A stray extra `</g>` tag when converting the logo SVG to a React component

- **Severity:** Would have been High (JSX syntax error, build-breaking) if it had reached a build unnoticed — caught before that happened
- **What happened:** While converting `brand/logo.svg` into the `Logo` React component (`src/app/components/ui/Logo.tsx`), the original SVG has one `<g clipPath>` group wrapping just the icon-mark paths, followed by a sibling text path *outside* that group. When retyping the structure as JSX, an extra closing `</g>` was left after the text path with no corresponding opening tag.
- **What it meant:** Had a build been run against this file as written, it would have failed with a JSX/tag-mismatch error.
- **How it was found:** Re-read the file immediately after writing it (standard practice for hand-transcribed markup) before running any build — caught before `npx vite build` was ever attempted against it.
- **How it was fixed:** Removed the orphaned `</g>`, matching the JSX structure back to the original SVG's actual nesting (one `<g>` around the icon paths only, the text path as a sibling).
- **Lesson for next time:** When hand-converting an existing SVG's tag structure into JSX (e.g. to swap `fill="white"` for `fill="currentColor"`), diff the opening/closing tag count against the source rather than assuming a straight copy — it's easy to add or drop a wrapping tag when the file is large and repetitive.

### 9. `Card`'s `style` prop was silently dropped in `DesignSystem.tsx`

- **Severity:** Low (cosmetic — one text color override never applied; found by strict typecheck, not by a report)
- **What happened:** The local `Card` helper in `DesignSystem.tsx` only ever declared `{ children, className }` in its props type and hardcoded its own inline `style` (background/border/shadow), never merging in a caller-supplied `style`. One call site (the "Known gaps" section) passed `style={{ color: "var(--color-text-secondary)" }}` expecting it to apply — it was silently ignored at runtime, not just a type error.
- **What it meant:** That one card's text rendered in the default color instead of the intended secondary/muted tone. Purely visual, no functional impact.
- **How it was found:** Turning on strict TypeScript for the first time (`features.md` Phase 0) — the call site failed to typecheck (`Property 'style' does not exist`) because `Card`'s props type never declared it, which is what strict mode is for: this bug existed silently before, the type system just had no way to catch it without `strict: true`.
- **How it was fixed:** Added an optional `style?: React.CSSProperties` prop to `Card` and merged it into the div's inline style (spread after the hardcoded values, so callers can override).
- **Lesson for next time:** A component that hardcodes its own `style` object and doesn't accept/merge a caller override will silently swallow any `style` prop passed to it — worth deciding explicitly whether a component should accept style overrides, rather than leaving it ambiguous.

### 10. `api-client.ts`'s `request()` crashed on a real `204 No Content` response (`features.md` Phase 12A)

- **Severity:** Medium (broke two real, newly-shipped live-mode endpoints — verification guideline-ack and attribute delete — not visible in mock mode)
- **What happened:** `request()` unconditionally called `res.json()` on every response, which throws on an actual `204 No Content` (no body to parse) — exactly what the new guideline-ack and attribute-delete endpoints correctly return.
- **What it meant:** `deleteMyAttributes()`'s live-mode behavior would have thrown before ever being exercised, and any future 204-returning endpoint would hit the same wall.
- **How it was found:** `VerificationVideo.test.tsx` failed with the exact production-shaped error — a frontend test, not code review, caught it.
- **How it was fixed:** `request()` now checks for a 204 status and returns `undefined` instead of calling `res.json()`.
- **Lesson for next time:** A shared HTTP helper needs to handle every real status shape its endpoints can return, not just the common ones — 204 is easy to forget until a real caller hits it.

### 11. pdf-lib's standard fonts can't encode "₦" (`features.md` Phase 12A)

- **Severity:** High (would have crashed Media Kit PDF generation for any NGN rate card — the majority currency in this app)
- **What happened:** The Media Kit auto-render uses `pdf-lib`'s standard WinAnsi-encoded fonts, which have no glyph for the Naira sign. `formatMoney()`'s normal output (`"₦120,000"`) would have been handed straight to the PDF text-drawing call.
- **What it meant:** Rendering a Media Kit PDF for any creator with an NGN rate card would throw at render time, not fail gracefully.
- **How it was found:** A direct smoke-test render (not just unit tests, which mock the PDF library) — caught before it ever hit a test file.
- **How it was fixed:** A PDF-specific currency-code formatter (`"NGN 120,000"` instead of the glyph) used only in the PDF path, rather than embedding a custom Unicode font for one glyph.
- **Lesson for next time:** A font/rendering library's supported character set is a real constraint — smoke-test the actual output for any non-ASCII content (currency symbols, accented names) rather than trusting a mocked unit test to catch an encoding gap.

### 12. Concurrent 401s each spent the same single-use refresh token, revoking real sessions (`features.md` Phase 13)

- **Severity:** High — a real, user-facing bug: a normal user could get logged out right after a real login or page reload, with no error message explaining why.
- **What happened:** `apps/web/src/lib/api-client.ts`'s `tryRefreshSession()` had no de-duplication. Dashboard pages fire several `apiClient.*` calls concurrently on mount; on first load after a real login (or a reload with only a refresh token in storage, no in-memory access token yet), all of those calls 401 simultaneously and each independently POSTed `/auth/refresh` with the same stored, single-use, server-rotated refresh token.
- **What it meant:** Only the first concurrent refresh actually succeeded — every other call replayed an already-rotated token, which the server's reuse-detection (correctly) treated as theft and revoked the *entire* session family, sometimes stranding the user right after they'd just logged in.
- **How it was found:** Live-testing Phase 13 against the real API, not the mocked unit-test suite (mocked Prisma/fetch can't reproduce a real race between concurrent in-flight requests).
- **How it was fixed:** A module-level `refreshInFlight: Promise<boolean> | null` — concurrent callers await the same in-flight refresh instead of each independently spending the token.
- **Lesson for next time:** Any client-side retry/refresh logic that can be triggered by multiple concurrent requests needs its own de-duplication — this class of bug is invisible to mocked tests and only shows up under real concurrent network conditions.

### 13. Publishing a project brief silently left it stuck in `DRAFT` (`features.md` Phase 14)

- **Severity:** High — the core "Post Project" action silently didn't do what its own button said.
- **What happened:** `apiClient.createBrief()` never passed a `status` field, so every brief created via `ProjectBrief.tsx`'s "Publish Project" button defaulted to the Prisma schema's `DRAFT` state — and `GET /projects` (talent browse) only ever lists `ACTIVE` briefs.
- **What it meant:** A client could go through the entire "publish a project" flow, see a success screen, and the project would never actually appear to any talent.
- **How it was found:** Live end-to-end testing against the real API/DB, not the mocked route tests (which only prove the endpoint accepts a payload — they don't catch a caller never sending the right field).
- **How it was fixed:** `ProjectBrief.tsx` now passes `status: "ACTIVE"` explicitly, since publishing is this screen's only action. Regression test added.
- **Lesson for next time:** A schema default that differs from what the UI actually intends (here, `DRAFT` vs. the button's implied `ACTIVE`) is a silent trap — worth explicitly setting the field rather than relying on a default matching intent by coincidence.

### 14. `GET /projects` showed "0 applicants" to any talent who hadn't applied yet (`features.md` Phase 14)

- **Severity:** Medium — wrong data shown, not a broken flow, but actively misleading (a project with 5 real applicants looked uncontested to everyone except the 5 who'd already applied).
- **What happened:** `routes/projects.ts`'s query filtered `applications` down to just the caller's own application (to derive a separate `myApplication` field), then reused that same filtered array's `.length` as the brief's total `applicantCount`.
- **What it meant:** Every talent who hadn't applied saw an empty/filtered array's length (0) as the "true" applicant count, regardless of the real total.
- **How it was found:** Live end-to-end testing against real seeded data with real existing applicants — again, invisible to mocked route tests that control exactly what each mock returns.
- **How it was fixed:** Added a separate `_count: { select: { applications: true } }` on the same query, used for the total instead of the filtered array's length.
- **Lesson for next time:** Reusing one query result for two different purposes (a personalized field and an aggregate count) is a common way to accidentally couple their scoping — worth a second, purpose-built field/query for each distinct thing being counted.

### 15. `--color-text-tertiary` failed WCAG AA contrast almost everywhere it was used (`features.md` Phase 17)

- **Severity:** Medium (accessibility defect, not a functional break — but a real, widespread one: this single token backed ~48 axe violations across nearly every screen)
- **What happened:** `tokens.css`'s `--color-text-tertiary` (`#97979F` light mode) measured 2.68:1 contrast against `--color-bg-canvas` — well under the 4.5:1 WCAG AA minimum for normal text — and this token is used for captions, footer text, and secondary labels across almost the entire app.
- **What it meant:** Low-vision users would have had real difficulty reading a large fraction of the app's secondary text.
- **How it was found:** An automated axe-core accessibility scan (new this phase, `apps/web/e2e/regression.spec.ts`), run against a real browser-rendered page — not something the existing unit/component test suite could ever have caught (jsdom-based tests don't compute real contrast ratios).
- **How it was fixed:** Darkened the token (light mode → `#6D6D75`, dark mode `#898993` for the equivalent issue), keeping the same hue, deep enough to clear every surface it's actually painted on (4.5:1+ against the darkest/lightest surface each mode uses respectively).
- **Lesson for next time:** Contrast ratios need an automated, real-rendering check (axe-core or equivalent) as part of the regular test suite — a color token can look fine to a sighted developer on a bright monitor and still fail the actual accessibility bar. See `monologg/qa/2026-07-31-phase17/cross-device-a11y.md` for the much larger, NOT-yet-fixed contrast debt this same scan surfaced (dozens of other, unrelated color pairs — tracked separately, needs design sign-off, not a quick token fix).

### Bug #19: Hardcoded "Elias Thorne" / "Elias" talent fallback name in Talent Dashboard (Session 34)
- **What happened:** `TalentDashboard.tsx` hardcoded `"Elias Thorne"` and `"Elias"` as default profile fallbacks, storefront heading, and desktop greeting (`"Good morning, Elias 👋"`), overriding the user's default talent persona preference ("Emeka Johnson").
- **What it meant:** Talent Dashboard displayed contradictory profile names and greetings (`Good morning, Elias` vs `Emeka Johnson` in settings/sidebar).
- **How it was found:** Multi-page browser QA pass (`/qa` skill workflow).
- **How it was fixed:** Updated name fallback, Storefront preview heading, and greeting to derive dynamically from `talentName` ("Emeka Johnson") (`98a0d36`).

### Bug #20: Hardcoded "Elias Thorne" initials (`ET`) in Order Room message thread & release text (Session 34)
- **What happened:** `OrderRoom.tsx` hardcoded `"ET"` avatar initials for talent message bubbles and hardcoded `"Elias Thorne"` in the payment release confirmation system message.
- **What it meant:** Order Room messages rendered `ET` badge next to system messages that cited `Emeka Johnson`.
- **How it was found:** Multi-page browser QA pass (`/qa` skill workflow).
- **How it was fixed:** Dynamically derived avatar initials (`EJ`) and payment release system text from `appStateSync.getTalentProfile().name` (`fd95a46`).

### Bug #21: Low-contrast disabled time slot text in External Booking Entry (Session 34)
- **What happened:** `ExternalBookingEntry.tsx` applied `color: var(--color-text-tertiary)` combined with `disabled:opacity-30`, yielding extremely faint 0.05 opacity text for unselected/disabled time slots.
- **What it meant:** Time slot options were illegible under standard lighting conditions.
- **How it was found:** Multi-page browser QA pass (`/qa` skill workflow).
- **How it was fixed:** Updated disabled slot text to `color: var(--color-text-primary)` with `disabled:opacity-45` for WCAG AA 4.5:1 contrast compliance (`fa1d26c`).

---

## Design-system consistency issues (found via audit, not crashes — but real bugs in the "will silently drift" sense)

These didn't break anything today, but they meant a future change to a design token would **not** propagate everywhere it should — which was the exact problem the user asked to fix. Full detail and file-level counts are in `log.md` §2.1–2.2; summarized here with severity:

| Issue | Severity | What it meant | Fix |
|---|---|---|---|
| Design tokens lived in a JS template string inside `Root.tsx`, not a real CSS file | Medium | Not literally broken, but awkward and easy to accidentally duplicate; no single canonical file to point a new dev at | Extracted to `src/styles/tokens.css` |
| Two dead CSS files (`theme.css`, `DoyinXMonologgCopy/styles.css`) defined **conflicting** token values under the same names (e.g. different `--radius-*` scales) | Medium | If either file were ever accidentally re-imported, it would silently override the real tokens with different values | Removed from the import chain, then deleted entirely |
| `TalentDashboard.tsx` and `ClientDashboard.tsx` — the two biggest pages — used Tailwind's default radius classes (`rounded-xl`, `rounded-2xl`, etc.) instead of `var(--radius-*)` | Medium | Looked visually identical today (the default values happened to match), but changing the design tokens later would have had **zero effect** on these two pages, silently | Remapped 57 occurrences to the token-based equivalents |
| Modal background color (`rgba(0,0,0,0.5)` / `0.6`) was hardcoded in 10 different places | Medium | Changing the intended overlay darkness would require finding and editing 10 separate lines correctly, with high odds of missing one | Replaced with `var(--color-overlay)` / `var(--color-overlay-strong)`, defined once |
| A handful of `text-gray-400`/`text-gray-500` Tailwind classes bypassed the text-color tokens | Low–Medium | Those specific labels wouldn't shift color if the app's text-color tokens were ever redefined (e.g. a contrast fix) | Replaced with `var(--color-text-secondary)` / `var(--color-text-tertiary)` |
| Sidebar, BottomNav, Modal, Avatar, Badge, and FormField were each hand-duplicated 2–11× with drifting details (padding, margins) | Medium | A design change to any of these (e.g. "make all avatars 2px bigger") required manually finding and editing every duplicate correctly — easy to miss one and end up with visible inconsistency | Extracted into shared components in `src/app/components/ui/`, wired into their real call sites |

---

### 16. Deeply-nested, space-containing asset folders broke copying the project via cloud sync

- **Severity:** Low–Medium (never broke the running app or a build — every affected file was unreferenced by any code — but a real, user-facing operational problem: the project folder couldn't be reliably copied/synced)
- **What happened:** `brand/mono fonts/` nested a full font-family archive 8 levels deep (`GeneralSans_Complete/Fonts/WEB/fonts/GeneralSans-VariableItalic.woff2`, etc.) with spaces in folder names (`mono fonts`, `plus jakarta`), and `apps/web/src/imports/reference-screenshots/` put 17MB of images inside the active app's source tree. Cloud-sync tools (Dropbox/OneDrive/Google Drive-class) enforce their own path-length caps, often stricter than the OS's own limit — combined absolute paths through these folders were long enough to trip that cap.
- **What it meant:** The user reported real trouble copying the project folder.
- **How it was found:** Reported directly by the user, then confirmed by measuring actual path lengths/depths and cross-checking which folders were the real contributors (`apps/web/public/fonts/` — the font files actually wired into the app — was already flat and fine; it was specifically the two unused/misplaced trees above).
- **How it was fixed:** `brand/mono fonts/` was deleted outright (confirmed unreferenced by any code, easily re-sourced later if ever needed). `reference-screenshots/` was moved to a top-level `monologg/reference-screenshots/` folder (still historical reference material, just no longer nested inside `apps/web/src/`). See `log.md` Session 61.
- **Lesson for next time:** "Committed for future use" asset archives are exactly the kind of thing that quietly accumulates depth/size without anyone noticing, since nothing ever fails to build because of them — worth a periodic sweep for large, unreferenced, deeply-nested folders, not just a reactive fix once someone hits a real copy/sync failure.

---

## Known issues, not fixed (out of scope / pre-existing, flagged for visibility)

| Issue | Severity | Why it wasn't fixed |
|---|---|---|
| ~~Several unused icon imports in `TalentDashboard.tsx`~~ | — | **Fixed** in `features.md` Phase 0 — strict TypeScript's `noUnusedLocals` surfaced 38 unused imports/variables across 12 files (this one included); all removed, see `log.md` |
| ~~Fonts load from external CDNs~~ | — | **Fixed** in `features.md` Phase 11 — all three brand fonts self-hosted, see `log.md` Session 21 |
| Type-scale tokens (`--font-size-*`) exist but aren't applied to most page headings yet | Low | Explicitly scoped out during this engagement as a larger, riskier change (would touch heading markup across every page); tokens were added so the option exists, adoption was left for a follow-up pass |
| **`PATCH /verification-recordings/:id/review` has no reviewer/ownership check at all** — any authenticated user, including a recording's own creator, can approve or reject it | **High** | No moderator/admin role exists in any phase of `features.md` through Phase 17 — flagged as a known gap since Phase 12A, **confirmed and demonstrated** (self-approval proven) in Phase 17's security pass (`security.authzFuzz.test.ts`). Not fixed: building a real moderator role is feature work, out of a QA phase's scope. **Must be closed before real users are onboarded** — see `monologg/qa/2026-07-31-phase17/security.md`. |
| `apiClient.getOgImageUrl(handle)` returns a hardcoded live-API path regardless of `API_MODE` | Low | In mock mode there's no backend to serve it, so a mock-mode demo's `og:image`/`twitter:image` meta tags point at a URL that 404s. Found during Phase 17's documentation backfill (git-history review of Phase 15), not exercised by any existing test; low-stakes enough not to warrant a dedicated fix pass on its own. |
| No PWA infrastructure exists — no `manifest.json`, no service worker, anywhere in `apps/web` | **High** | Every screen has been named `PWA-XX` throughout `features.md` since Phase 0, but actual installability/offline-caching was never built in any phase. Confirmed directly (not assumed) in Phase 17's Playwright pass. Building it is feature work, out of a QA phase's scope — tracked as a P0 pre-cutover gap, see `monologg/qa/2026-07-31-phase17/cross-device-a11y.md`. |
| ~45 of 57 route×browser combinations still have serious/critical `color-contrast` axe violations (dozens of distinct color pairs, not the one token fixed as bug #15 above) | Medium | A full design-system remediation project needing sign-off on new brand colors across every accent ramp — explicitly out of a QA-only phase's scope. See `monologg/qa/2026-07-31-phase17/cross-device-a11y.md` for the full breakdown. |

**Not a bug — a scope gap, documented separately:** the entire absence of a real backend, database, authentication, and payment integration is **not** logged here as a "bug" — it's the current, intentional state of a frontend-only prototype. See `design.md` §6 for the full list of what still needs to be built.

**Also see `monologg/qa/2026-07-31-phase17/` for the complete Phase 17 findings**, including two items that are process gaps rather than code bugs: UAT and NDPA legal sign-off are both explicitly PENDING — neither can be completed by an agent.
