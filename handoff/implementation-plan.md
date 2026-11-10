# Monologg — Implementation Plan (Living Document)

**Last updated:** 2026-11-10 (Session 231: Singular Performer Craft Profile Labels in Onboarding & Settings)
**Status:** All 18 phases of `features.md` (0–17) + Phase 12B Supabase Auth + Phase 12C Withdrawal OTP Gate + Sessions 39–174 + Session 180 Order Room FAANG UX Overhaul + Sessions 181–184 1-for-1 Figma Home, Product, Pricing & Resources Pages + Session 185 Investor Application Storage & Chevron Fix + Session 186 1-for-1 Figma Terms of Service Page + Session 187 Terms Card Hover Microinteraction Parity + Session 188 1-for-1 Figma Cookie Settings & Policy Implementation + Session 189 Home Timeline Copy, System-Wide Alpha Announcement Bar & Footer Legal Links + Session 190 Full FINCRA Deprecation & Paystack Replacement Across Webapp, Specs & Main Branch + Session 191 FAANG-Grade Web Motion & Micro-Interactions Across Landing, Product & Pricing Pages + Session 192 Product Page Headline 2-Line Formatting & Continuous Rolling Spinner Animation + Session 193 Thespian AI Performer & Client Table Rows Hover-Only Background Fill + Session 194 Newsletter Email Signup Supabase Storage & Website Deployment to Main Branch + Session 195 Fixed Sticky Navigation Headers & Unified Performer/Client Audience Toggle Tags Across All Public Pages + Session 196 Universal "Get Started for Free" Onboarding Routing & Sign In / Sign Up Deep-Link Toggles + Session 197 "Become an Investor" Section Deep-Linking, CTA Section Alignment & Global Button Link Audit + Session 198 Cohesive Website Dark Mode & Design Token Alignment from Frame 2147228281 + Session 199 Strict Dark Mode Strokes #333333 and Background Hover States #1A1A1A Across All Website Pages Including Legal + Session 200 1-to-1 Cohesive Dark/Light Mode Using Frame 2147228281 `leye/Grey alpha` Spectrum & Complete Marketing Suite Cleanup + Session 201 Subtle #1A1A1A Strokes Closer to Black, Slower Marquee with Icon Tone Parity, White Logo Marks & Red Step Badges + Session 202 Website Footer Copy Update to "Powered by paystack" + Session 203 In-App Terms of Service, Role-Adaptive Escrow Policies in Settings, Cookie Policy Header Alignment & Mobile Typography Polish + Session 204 Resolution of All Linter and Workspace Problems Across Open Files + Session 205 Fix Duplicate Section Type & Malformed State Initializer in Settings.tsx + Session 206 1-to-1 Dark Mode Implementation & 7-Step Sequence Reorder for Product & Landing Pages + Session 207 Product Page Selected State Figma Parity & 5-Card Constant-Height Sliding Window + Session 208 Dark Mode Design Token Harmonization & Divider Parity + Session 209 Monologg Figma Screen & Component Generator Plugin + Session 210 Hero & Pricing 5-Avatar Creative Talent Asset Parity from Figma 178448:155888 & 178448:155893 + Session 211 Interactive Avatar Row with Caveat Handwritten Names & Focus Blur from Figma 178450:155993 + Session 212 Configurable Hide Toggle for "Powered by paystack" Badge in WebsiteFooter + Session 213 Comprehensive Dark Mode Contrast Audit across Order Room, Performer & Client Dashboards (WCAG AA) + Session 214 Universal White Text on Brand Color CTAs in Light & Dark Modes + Session 215 Hero iPhone Mockup Responsive Mobile Optimization & Scaling + Session 216 Bespoke Mobile Navigation Architecture Across Main Pages & Header Avatar Alignment + Session 217 Minimal Rise-Style Full-Screen Mobile Navigation Overlay & Clutter Removal + Session 218 Product Page 7-Step Interactive Showcase Product UI Stage Responsive Mobile Hide + Session 219 Blinking Announcement Red Dot & 20s Alternating Marquee Badges + Session 220 Official Social Links Update to @getmonologg in Footer & Resources + Session 221 Website Gradient Backgrounds Removal & Mobile Hero Phone Stage Geometry Polish + Session 222 Comprehensive Mobile Responsiveness, Progressive Disclosure & Navigation Parity Overhaul Across Performer, Client & Order Room Views + Session 223 OrderRoom Role Switcher JSX Template Literal Simplification & Parser Fix + Session 224 Hero Typewriter Effect, Role-Toggled Sign-up Routing, Social Platforms Cleanup & Media House Trust Bar Removal + Session 225 Footer Resources Column Alignment, Social Links Finalization & Lagos Nigeria Regional Branding + Session 226 Mobile Navigation Streamlining & Role-Adaptive Account Menu FAANG UX Polish + Session 227 Footer Resources Label Alignment: Cookie Policy Parity + Session 228 'Get Started for Free' Signup Routing & Thespian AI Performer/Client Action Parity + Session 229 Brand Color Preservation on Social Badges Across Light & Dark Mode + Session 230 Home Page Bottom CTA Banner Full-Width Bleed Alignment + Session 231 Singular Performer Craft Profile Labels in Onboarding & Settings.

---

## ✅ Done

### Session 231 — Singular Performer Craft Profile Labels in Onboarding & Settings
- [x] **Performer Onboarding Craft Step 2 (`CreatorOnboarding.tsx`)**:
  - Updated `NICHE_CATEGORIES` labels from plural to singular: `Actor`, `Public speaker`, `Compere`, `Comedian`, `Artist`, `Creator`.
  - Preserved internal category IDs and state synchronization mappings.
- [x] **Performer Settings Alignment (`Settings.tsx`, `Settings.test.tsx`)**:
  - Updated `CRAFT_CATEGORIES` in `Settings.tsx` to match singular labels for the primary craft profile picker.
  - Updated test assertions in `Settings.test.tsx` (`"Actor"`).
- [x] **Verification**:
  - Full test suite: 36 test files, 200 tests passing green (`npm test -- --run`).
  - TypeScript typecheck: 0 errors (`npm run typecheck`).
  - Vite production build: Succeeded in 2.73s (`npm run build`).

### Session 230 — Home Page Bottom CTA Banner Full-Width Bleed Alignment
- [x] **Footer Container Full-Width Bleed (`LandingPage.tsx`)**:
  - Removed artificial `max-w-[1440px]` constraint from the `<WebsiteFooter />` wrapper on `LandingPage.tsx` (`<div className="w-full z-10">`).
  - Allowed the grey CTA banner (`bg-[#f9f9f9]` in light mode, `bg-[#1a1a1a]` in dark mode) to fill 100% of the screen width edge-to-edge on desktop/wide screens without side gutters.
- [x] **Verification**:
  - Full test suite: 36 test files, 200 tests passing green (`npm test -- --run`).
  - TypeScript typecheck: 0 errors (`npm run typecheck`).
  - Vite production build: Succeeded in 3.15s (`npm run build`).

### Session 229 — Brand Color Preservation on Social Badges Across Light & Dark Mode
- [x] **Social Badges Inversion Removal (`ResourcesPage.tsx`)**:
  - Removed `dark:invert` utility class from `LinkedIn`, `Product Hunt`, and `Instagram` `<img>` elements.
  - Kept `dark:invert` exclusively on monochrome `Twitter-X` badge so the glyph renders white on dark backgrounds.
- [x] **Tokens & Global Styles Parity (`tokens.css`)**:
  - Restricted `filter: invert(1) brightness(1.8) !important` to monochrome social icons (`Twitter-X`, `Twitch`, `Telegram`, `TikTok`).
  - Added explicit `filter: none !important` rule for brand-colored icons (`LinkedIn`, `Product Hunt`, `Instagram`) in dark mode.
- [x] **LinkedIn SVG Letter Knockout Fidelity (`linkedin.svg`)**:
  - Added `<rect x="3" y="3" width="12" height="12" fill="white"/>` behind the `#0A66C2` evenodd cutout path in `linkedin.svg` to guarantee white "in" letters against both light and dark parent containers.
- [x] **Verification**:
  - Full test suite: 36 test files, 200 tests passing green (`npm test -- --run`).
  - TypeScript typecheck: 0 errors (`npm run typecheck`).
  - Vite production build: Succeeded in 2.72s (`npm run build`).

### Session 228 — 'Get Started for Free' Signup Routing & Thespian AI Performer/Client Action Parity
- [x] **Universal 'Get started for free' Direct Sign-Up Routing (`WebsiteFooter.tsx`, `LandingPage.tsx`)**:
  - Replaced legacy `navigate("/onboarding")` with `navigate("/auth?mode=signup")` (or direct dashboard navigation if already authenticated) across `WebsiteFooter.tsx` and `LandingPage.tsx`.
- [x] **Thespian AI Audience-Toggled Action Parity & Copy Update (`ProductPage.tsx`)**:
  - Performer Sub-block: Replaced `"Start hiring today"` with `"Start finding gigs"` and routed button to `/auth?mode=signup&role=talent`.
  - Client Sub-block: Retained `"Start hiring today"` and routed button to `/auth?mode=signup&role=client`.
  - Portal Hero CTAs: Routed Performer Portal to `/auth?mode=signup&role=talent` and Client Portal to `/auth?mode=signup&role=client`.
- [x] **Pricing Page Audience-Toggled Routing (`PricingPage.tsx`)**:
  - Hero and table CTA buttons dynamically route to `/auth?mode=signup&role=talent` or `/auth?mode=signup&role=client` based on audience selection.
- [x] **Verification**:
  - Full test suite: 36 test files, 200 tests passing green (`npm test -- --run`).
  - TypeScript typecheck: 0 errors (`npm run typecheck`).
  - Vite production build: Succeeded in 3.08s (`npm run build`).

### Session 227 — Footer Resources Label Alignment: Cookie Policy Parity
- [x] **Footer Resources Column Alignment (`WebsiteFooter.tsx`)**:
  - Updated the button label from `"Cookie Settings and Policy"` to `"Cookie Policy"` to match canonical legal page naming and `/cookies` URL routing.
- [x] **Verification**:
  - Full test suite: 36 test files, 200 tests passing green (`npm test -- --run`).
  - TypeScript typecheck: 0 errors (`npm run typecheck`).
  - Vite production build: Succeeded in 2.96s (`npm run build`).

### Session 226 — Mobile Navigation Streamlining & Role-Adaptive Account Menu FAANG UX Polish
- [x] **Role-Adaptive User Account Menu (`LandingPage.tsx`)**:
  - Replaced "Public Storefront" with "My Profile" with `User` icon.
  - Performer sees strictly `Dashboard`, `My Profile`, `Browse Gigs`, `Settings`, `Sign Out` (removed `Post a Brief`).
  - Client sees strictly `Dashboard`, `Find Performers`, `Post a Brief`, `Settings`, `Sign Out` (removed `My Profile`).
- [x] **Mobile Navigation "More" Sheet Redundancy Removal (`BottomNav.tsx`)**:
  - Filtered destinations to only display unrepresented views (`unrepresentedNavItems`) not already pinned to the bottom dock.
  - Simplified multi-item account section into a direct `Settings` button and `Sign Out`.
  - Maintained dynamic "More" pill highlight whenever a secondary unrepresented view is active.
- [x] **Verification**:
  - Full test suite: 36 test files, 200 tests passing green (`npm test -- --run`).
  - TypeScript typecheck: 0 errors (`npm run typecheck`).
  - Vite production build: Succeeded in 2.67s (`npm run build`).

### Session 225 — Footer Resources Column Alignment, Social Links Finalization & Lagos Nigeria Regional Branding
- [x] **Footer Resources Column Restructuring (`WebsiteFooter.tsx`)**:
  - Replaced legacy items with `Terms of Services`, `Cookie Settings and Policy`, `FAQ`, and `Become an investor`.
- [x] **Footer Bottom Bar Location Branding (`WebsiteFooter.tsx`)**:
  - Replaced duplicate bottom legal links with `Lagos, Nigeria 🇳🇬` aligned to the bottom right beneath the divider.
- [x] **Social Invariant Enforcement**:
  - Confirmed TikTok and Discord remain removed; LinkedIn, Instagram, X, and Product Hunt are active.
- [x] **Verification**:
  - Full test suite: 36 test files, 198 tests passing green (`npm test -- --run`).
  - TypeScript typecheck: 0 errors (`tsc --noEmit`).
  - Vite production build: Succeeded in 2.74s (`npm run build`).

### Session 224 — Hero Typewriter Effect, Role-Toggled Sign-up Routing, Social Platforms Cleanup & Media House Trust Bar Removal
- [x] **Hero Headline Typewriter Animation (`LandingPage.tsx`)**:
  - Replaced static `"Find Performers|"` with dynamic typewriter loop alternating between `"Find Performers"` and `"Find Gigs"`, featuring realistic typing cadence (90ms), pause (2200ms), deletion (45ms), and pulsing cursor `|`.
  - Added semantic `aria-label` for screen reader accessibility.
- [x] **CTA Routing to Role-Toggled Registration**:
  - `"Find Performers"` routes unauthenticated visitors to `/auth?mode=signup&role=client` (or `/client` if authenticated).
  - `"Find Gigs"` routes unauthenticated visitors to `/auth?mode=signup&role=talent` (or `/dashboard` if authenticated).
- [x] **Social Platforms Cleanup (`ResourcesPage.tsx`, `WebsiteFooter.tsx`)**:
  - Retained strictly LinkedIn, Product Hunt, X (Twitter), and Instagram across Resources and Footer; removed Twitch, Telegram, TikTok, and Discord.
  - Updated `ResourcesPage.test.tsx` assertions to verify only approved platforms are rendered.
- [x] **Media House Trust Bar Removal (`ProductPage.tsx`)**:
  - Removed the 6 studio logos (Vimeo, Netflix, Prime, Disney+, Hulu, Twitch) and `"Trusted by top media houses"` banner.
  - Formatted the 2x2 feature grid box into a fully enclosed `rounded-[20px] border` container.
  - Updated `ProductPage.test.tsx` to assert `"Trusted by top media houses"` is not in the document.
- [x] **Verification**:
  - Full test suite: 36 test files, 198 tests passing green (`npm test -- --run`).
  - TypeScript typecheck: 0 errors (`tsc --noEmit`).
  - Vite production build: Succeeded in 2.98s (`npm run build`).

### Session 223 — OrderRoom Role Switcher JSX Template Literal Simplification & Parser Fix
- [x] **Disambiguate JSX Template Interpolations in `OrderRoom.tsx`**:
  - Replaced multi-line nested template literals in the role switcher with cleanly scoped helper variables (`dotBg`, `dotOpacity`, `btnTone`), removing any risk of JSX parser tokenization errors.
  - Added explicit `type="button"` attributes to header control buttons.
- [x] **Verification**:
  - TypeScript compilation: 0 errors (`npx tsc --noEmit`).
  - Vite production build: succeeded (`npm run build`).
  - Unit tests: passed (`npm test -- --run`).

### Session 222 — Comprehensive Mobile Responsiveness, Progressive Disclosure & Navigation Parity Overhaul Across Performer, Client & Order Room Views
- [x] **CSS Accent Selector Fix (`tokens.css`)**:
  - Scoped `button[style*="..."]` and `a[style*="..."]` white-text rules strictly to `background:` and `background-color:` declarations so buttons using `color: var(--color-accent)` on light backgrounds (mobile top-bar avatars `EJ`/`FS` and `"Resume Draft Stepper"` pill button) remain legible in light mode.
  - Added `.no-scrollbar` and `.scrollbar-none` utility classes.
- [x] **Mobile Navigation Parity (`BottomNav.tsx`, `Sidebar.tsx`)**:
  - Added a `"More"` (`LayoutGrid`) button and full **Mobile Navigation & Quick Actions Bottom Sheet** to `BottomNav`, giving mobile users 1-tap access to all desktop sidebar tabs (`Earnings`, `Analytics`, `Recent Activity`, `My Profile`, `Shortlist`, etc.) plus `Account Settings`, `Transactions & Escrow Ledger`, `Appearance` (Dark/Light Mode toggle), `Help & Dispute Support`, and `Sign Out`.
- [x] **Performer Dashboard Mobile UX (`TalentDashboard.tsx`)**:
  - Added progressive disclosure to the global Availability Check-in Card (auto-collapses to a slim verified strip on non-Home tabs when confirmed; includes `"Event Details"` toggle when expanded).
  - Redesigned `Active Orders` chat/list rows so project titles and status summaries never truncate to `Nike Com...` or `Mil...` on mobile.
  - Fixed `Availability` Calendar tab: removed `truncate` on Google Calendar Sync description, removed duplicate `November 2026` + `< Today >` header inside Month view card, and redesigned 7-column Month calendar cells so `Today` never overflows into adjacent day cells.
- [x] **Client Dashboard Mobile UX (`ClientDashboard.tsx`)**:
  - Replaced duplicate mobile `<h2>My Projects</h2>` header with project count summary; stacked project card footer (`flex-col sm:flex-row`) so `Target: 10 performers · Inactive draft` and action buttons (`Resume Draft` + `View Project →`) never squish into a 4-line column.
  - Wrapped the Project Detail `State:` preview bar in `overflow-x-auto max-w-full no-scrollbar`.
  - Applied responsive 2-row layout to Client `Active Orders` list rows.
- [x] **Order Room Mobile Workspace (`OrderRoom.tsx`)**:
  - Prevented horizontal viewport overflow (`w-full max-w-[100vw] overflow-x-hidden` on root and `min-w-0 overflow-x-hidden` on workspace container).
  - Compacted mobile header controls and moved `Online`/`Onsite` badge to the subtitle row on `< sm` so `{orderTitle}` has room to breathe.
  - Fixed `Brief & Files` tab `Copy Script` button wrapping and stacked `Campaign Reference Attachments` with a full-width mobile `Download` button.
  - Upgraded mobile `Order Details` (`Info`) modal with Counterparty Profile summary and role-accurate Escrow Deposit (`₦134,400`) / Net Take-Home (`₦111,600`) card.
- [x] **Verification**:
  - Vitest test suite: 36 test files, 197 tests passing 100% green (`npm test -- --run`).
  - TypeScript compilation: 0 errors (`npx tsc --noEmit`).

### Session 221 — Website Gradient Backgrounds Removal & Mobile Hero Phone Stage Geometry Polish
- [x] **Website Ambient Gradient Blurs Removal**:
  - Removed ambient background gradient layers from all 5 marketing pages: `LandingPage.tsx`, `ProductPage.tsx`, `PricingPage.tsx`, `ResourcesPage.tsx`, and `LegalPage.tsx`.
  - Removed unused SVG asset imports/constants across all 5 files.
  - Ensured consistent, solid, high-contrast canvas surfaces across both dark and light modes.
- [x] **Mobile Hero Stage & Phone Mockup Geometry**:
  - Reduced `.hero-phone-stage` height on mobile (< 375px: 260px, 375px: 295px, 480px: 340px, 640px: 395px, 768px: 440px).
  - Scaled and clipped `.hero-phone-scaler` height to 460px on mobile, hiding lower activity items ("FilmCraft Lagos") and keeping the mockup flush with the stage bottom.
  - Positioned `.hero-phone-scaler` `top: -16px` (and `-14px` on small devices), leaving ~32px of equivalent spacing between the CTA buttons and the top notch of the device.
  - Maintained 100% pixel-perfect desktop specification (502px stage, -110.91px top, 613px scaler, scale 1).
- [x] **Verification**:
  - Vitest test suite: 36 test files, 195 tests passing 100% green (`npm test -- --run`).
  - TypeScript compilation: 0 errors (`npx tsc --noEmit`).

### Session 220 — Official Social Links Update to @getmonologg in Footer & Resources
- [x] **Website Footer (`WebsiteFooter.tsx`)**:
  - Updated Instagram link target to `https://www.instagram.com/getmonologg`.
  - Updated X (Twitter) link target to `https://x.com/getmonologg`.
- [x] **Resources Hub (`ResourcesPage.tsx`)**:
  - Updated Twitter-X circular badge target to `https://x.com/getmonologg`.
  - Updated Instagram circular badge target to `https://www.instagram.com/getmonologg`.
- [x] **Verification**:
  - Updated `WebsiteFooter.test.tsx` verifying exact `href` attributes (4/4 tests passed).
  - Updated `ResourcesPage.test.tsx` verifying exact `href` attributes (5/5 tests passed).
  - TypeScript compilation: 0 errors (`npx tsc --noEmit`).

### Session 219 — Blinking Announcement Red Dot & 20s Alternating Marquee Badges
- [x] **Component Architecture (`TopAnnouncementBar.tsx`)**:
  - Implemented high-visibility blinking red indicator dot with dual ping (`animate-ping`) and glowing pulse (`animate-pulse shadow-[0_0_8px_rgba(241,48,48,0.9)]`).
  - Implemented 20-second alternating marquee (`intervalMs={20000}`) that smoothly crossfades between **Paystack Secured** and **25+ Verified Performers** one item at a time with vertical translation.
  - Removed clutter bullet divider (`·`) and optimized mobile display fitting cleanly beside "Monologg is in Alpha 🥳 🥳".
  - Integrated across `LandingPage.tsx`, `ProductPage.tsx`, `PricingPage.tsx`, `ResourcesPage.tsx`, and `LegalPage.tsx`.
- [x] **Verification**:
  - Authored `TopAnnouncementBar.test.tsx` (4/4 tests passed).
  - Verified `LandingPageHeader.test.tsx`, `ProductPage.test.tsx`, `PricingPage.test.tsx`, `ResourcesPage.test.tsx`, and `LegalPage.test.tsx` (30/30 tests passed).
  - Full test suite: 36 test files (195 tests) passed 100% green.
  - TypeScript compilation: 0 errors (`npx tsc --noEmit`).

### Session 218 — Product Page 7-Step Interactive Showcase Product UI Stage Responsive Mobile Hide
- [x] **Responsive Stage Visibility (`ProductPage.tsx`)**:
  - Configured right-column product UI illustration stage (`data-node-id="178359:17450"`) with `hidden lg:flex`.
  - Hides the detached 484px stage on mobile viewports (< 1024px), eliminating scroll disjunction beneath the 5-card sliding window.
  - Retains desktop side-by-side sticky 525×484 stage layout on screens >= 1024px with 1:1 Figma Frame `178359:17305` fidelity.
- [x] **Verification**:
  - Updated `ProductPage.test.tsx` verifying responsive `hidden lg:flex` classes and DOM illustration presence (5/5 tests passed).
  - Validated TypeScript: `npx tsc --noEmit` passed with 0 errors.

### Session 217 — Minimal Rise-Style Full-Screen Mobile Navigation Overlay & Clutter Removal
- [x] **Rise-Style Opened Mobile Navigation Architecture (`BespokeMobileNav.tsx`)**:
  - Transformed `BespokeMobileNavDrawer` into a full-screen viewport modal overlay (`fixed inset-0 z-50 md:hidden bg-white dark:bg-[#121316] text-[#1a1a1a] dark:text-[#f5f5f5] flex flex-col justify-between`) matching the Rise reference design.
  - Top bar (`h-[68px]`): Monologg SVG brand logo on the left, subtle theme toggle icon, and clean `X` close icon on the right with border hairline (`border-b border-[#e8e8e8]/60 dark:border-white/5`).
  - Vertical Navigation Stack: Clean, unboxed text links for **Home** (`/`), **Product** (`/product`), **Pricing** (`/pricing`), and **Resources** (`/resources`) with `text-[22px] sm:text-[25px] font-semibold tracking-[-0.01em]` and `gap-8 sm:gap-10` spacing; active route indicated by brand red `#f13030` text and red glowing dot.
  - Pinned Dual Bottom Action Pills (`h-[52px]`):
    - Left pill: `Sign in` (or `Dashboard` if authenticated) in charcoal dark container `bg-[#22242a] dark:bg-[#22242a] hover:bg-[#2c2f37] border border-[#2d3037] text-white font-bold rounded-full`.
    - Right pill: `Get started` (or `Sign out` if authenticated) in brand red `bg-[#f13030] hover:bg-[#d31f20] text-white font-bold rounded-full shadow-md`.
- [x] **Page Cleanup & Clutter Removal**:
  - Removed `BespokeMobileBottomDock` and eliminated `pb-20 md:pb-0` bottom padding from `LandingPage.tsx`, `ProductPage.tsx`, `PricingPage.tsx`, `ResourcesPage.tsx`, and `LegalPage.tsx`.
  - Maintained `BespokeMobileBottomDock` export in `BespokeMobileNav.tsx` for backwards compatibility.
- [x] **Verification**:
  - Updated `BespokeMobileNav.test.tsx` (10/10 tests passed).
  - Validated `LandingPageHeader.test.tsx` (7/7 tests passed).
  - Ran full test suite: 35 test files (191 tests) passing 100% green.
  - TypeScript compilation: 0 errors (`npx tsc --noEmit`).

### Session 216 — Bespoke Mobile Navigation Architecture Across Main Pages & Header Avatar Alignment
- [x] **Bespoke Mobile Navigation Suite (`BespokeMobileNav.tsx`)**:
  - Implemented `MobileMenuButton` with tactile hit area, ARIA states (`aria-label`, `aria-expanded`), and animated rotation transition between `Menu` and `X` icons.
  - Implemented `BespokeMobileNavDrawer` with spring entrance animation, frosted glass backdrop (`backdrop-blur-2xl bg-white/98 dark:bg-[#000000]/98`), and scroll locking.
  - Added high-contrast navigation cards for the 4 main pages (`Home`, `Product`, `Pricing`, `Resources`) with active state badges, descriptions, and pulsating indicator.
  - Added quick role portals: **Find Performers** (`/client`) and **Find Gigs** (`/dashboard`).
  - Added authenticated user profile card with unclipped avatar, role tag, and direct shortcuts to `Dashboard`, `Storefront`, `Settings`, `Support`, and `Sign Out`.
  - Added unauthenticated primary CTAs: `Sign In to Account` and high-contrast `Get Started for Free`.
  - Added Light/Dark mode switcher and legal links (`Terms`, `Privacy`, `Cookies`).
  - Implemented `BespokeMobileBottomDock` floating pill at `bottom-4` (`md:hidden`) with animated indicator (`layoutId="active-mobile-dock-pill"`) for 1-tap thumb navigation across main pages.
- [x] **Page Integration & Header Avatar Fix**:
  - Aligned header user avatars in `LandingPage.tsx` with `w-7 h-7 rounded-full overflow-hidden` and `object-cover object-top`, eliminating vertical head clipping.
  - Integrated mobile navigation suite across `LandingPage.tsx`, `ProductPage.tsx`, `PricingPage.tsx`, `ResourcesPage.tsx`, and `LegalPage.tsx`.
  - Added responsive padding (`pb-20 md:pb-0`) to footer wrappers to ensure content clearance above the floating bottom dock.
- [x] **Verification**:
  - Authored `BespokeMobileNav.test.tsx` (10/10 tests passed).
  - Validated `LandingPageHeader.test.tsx` (7/7 tests passed).
  - Full test suite: 35 test files (191 tests) passed 100% green.
  - TypeScript compilation: 0 errors (`npx tsc --noEmit`).

### Session 215 — Hero iPhone Mockup Responsive Mobile Optimization & Scaling
- [x] **Responsive Scaling Architecture in `tokens.css`**:
  - Implemented `.hero-phone-stage` with responsive height scale: `330px` (< 375px), `370px` (375px–479px), `410px` (480px–639px), `445px` (640px–767px), `476px` (768px–1023px), `502px` (>= 1024px).
  - Implemented `.hero-phone-scaler` using hardware-accelerated `transform: translateX(-50%) scale(...)` with `transform-origin: top center`: `scale(0.60)`, `scale(0.68)`, `scale(0.76)`, `scale(0.84)`, `scale(0.92)`, `scale(1.00)` across respective breakpoints.
  - Eliminated horizontal viewport overflow and awkward side-clipping on all mobile screen widths (320px–480px).
  - Eliminated vertical collision between the phone bezel and the hero "Find Performers" / "Find Gigs" CTA buttons by calibrating top offset to `-36px` to `-46px` on mobile with `gap-16 sm:gap-24 lg:gap-[163px]`, maintaining a clean 30px–50px breathing margin.
- [x] **Component Integration & Asset Optimization (`LandingPage.tsx`)**:
  - Connected `.hero-phone-stage` and `.hero-phone-scaler` to the mockup container.
  - Added `loading="eager"` and `decoding="async"` to the hero performer dashboard screenshot (`aea552544bf22223a0a369404407ee0f5488aa63.png`).
- [x] **Verification**:
  - Updated `LandingPageHeader.test.tsx` verifying scaler classes and responsive CSS rules.
  - TypeScript compilation: 0 errors (`npx tsc --noEmit`).
  - Unit & Integration Test Suite: 34 test files (181 tests) passing 100% green.

### Session 214 — Universal White Text Enforcement on Main Brand Color CTAs (Red & Purple) in Light & Dark Modes
- [x] **Universal CSS Rules in `tokens.css`**:
  - Enforced `color: #FFFFFF !important;` across all brand red (`#F13030`, `#D31F20`, `#D92626`, `#B91C1C`, `#991B1B`), brand purple (`#7B00FE`, `#9B4DFF`, `#6400D1`, `#5B21B6`, `#7C3AED`, `#4C1D95`), and role accent (`var(--color-accent)`) buttons and anchors.
  - Added wildcard child selector rules (`button.bg-[brand] *`, `a.bg-[brand] *`, `button[style*="..."] *`) ensuring all nested spans, text blocks, and SVG icons remain `#FFFFFF`.
  - Added dark mode state rules preserving saturated brand fills and pure white text without color inversion or bleeding.
- [x] **Core Component Updates (`Button.tsx`)**:
  - Enhanced `variant="primary"` with `text-white [&_*]:text-white`.
  - Enhanced `red`, `purple`, `dark-pill`, `lime`, `forest`, and `clay` variants with `[&_*]:text-white`.
- [x] **Page Audit & Class Alignment**:
  - `WebsiteFooter.tsx`: Added explicit `text-white` to the primary "Get started for free" button and newsletter CTA.
  - `LandingPage.tsx`: Added explicit `text-white` to header "Sign up free" and hero "Find Performers" CTAs.
  - `ProductPage.tsx`: Added explicit `text-white` to Performer and Client section "Get started for free" CTAs.
  - `PricingPage.tsx`: Added explicit `text-white` to "Get started for free" CTAs across pricing cards.
  - `ResourcesPage.tsx`: Added explicit `text-white` to the application submission CTA.
- [x] **Verification**:
  - TypeScript compilation: 0 errors (`npx tsc --noEmit`).
  - Unit & Integration Test Suite: 34 test files (180 tests) passing 100% green.

### Session 213 — Comprehensive Dark Mode Contrast Audit across Order Room, Performer & Client Dashboards (WCAG AA)
- [x] **Primary Defect Resolution — Attachment Cards in Message Bubbles (`OrderRoom.tsx`)**:
  - Replaced solid white card background with frosted dark translucent container `bg-black/25 dark:bg-black/40 border border-white/20 text-white shadow-2xs` inside outgoing `isMe` bubbles.
  - Made filename `text-white font-bold`, file size `text-white/80 font-mono`, icon wrapper `bg-white/20 text-white`, and download button `text-white/90 hover:text-white hover:bg-white/20`.
  - Upgraded onsite appearance evidence cards inside `isMe` bubbles to matching frosted high-contrast styling.
- [x] **Order Room Dark Mode Contrast Elevation (`OrderRoom.tsx`)**:
  - Replaced all 11 instances of `dark:text-zinc-500` (which previously produced failing ~3.8:1 contrast) with `dark:text-zinc-400` (~6.8:1) or `dark:text-zinc-300` (~11.1:1).
  - Message timestamps: `text-zinc-400 dark:text-zinc-400 font-mono`.
  - Remote/Onsite switcher & Performer/Client switcher: inactive tabs styled with `dark:text-zinc-400 dark:hover:text-zinc-200`.
  - Workspace tabs (Messages vs Brief & Files): inactive tab styled with `dark:text-zinc-400 dark:hover:text-zinc-100` and `dark:text-zinc-400` icon.
  - Attendance gate notification bar: `text-zinc-500 dark:text-zinc-300` for check-in notification and metadata grid labels ("EVENT", "DATE & TIME", "LOCATION").
  - Contextual Inspector Rail: updated "Location", "Avg. Response", "ESCROW DEPOSIT", fee breakdown items, timeline step numbers ("Upcoming"), and full brief action link to `dark:text-zinc-400` / `dark:text-zinc-300`.
  - Composer dock: updated trust micro-pill and dispute button to `dark:text-zinc-400`.
- [x] **Global Token Enhancements (`tokens.css`)**:
  - Upgraded `.dark` `--color-text-tertiary: #A3A3A3;` (from `#767676`) and `--color-text-secondary: #D1D1D1;`.
  - Elevated dark mode form placeholder text to `#A3A3A3`.
- [x] **Client & Performer Dashboards (`ClientDashboard.tsx`, `TalentDashboard.tsx`)**:
  - Updated review modal footers and rating breakdown pillars to `text-zinc-500 dark:text-zinc-400`.
- [x] **Verification & Test Suite**:
  - `npx tsc --noEmit`: 0 errors.
  - `npx eslint`: 0 errors on modified files.
  - All 34 test files (180 tests) passing 100% green.

### Session 212 — Configurable Hide Toggle for "Powered by paystack" Badge in WebsiteFooter
- [x] **Footer Component (`WebsiteFooter.tsx`)**:
  - Added `showPoweredByPaystack?: boolean` prop defaulting to `false`.
  - Conditionalized badge rendering `{showPoweredByPaystack && (...)}`.
- [x] **Tests & Regression Pass**:
  - Updated `WebsiteFooter.test.tsx` and `LandingPageHeader.test.tsx`.
  - Verified 34 test files, 180 tests passing 100% green.

### Session 211 — Interactive Avatar Row with Caveat Handwritten Names & Focus Blur (Figma 178450:155993)
- [x] **Font & Design Token Foundations**:
  - Added Google Fonts import for `Caveat:wght@400;500;600;700` and `Caveat+Brush` to `fonts.css`.
  - Added `--font-handwritten: 'Caveat', 'Caveat Brush', cursive;` and `.font-caveat` utility to `tokens.css`.
  - Added preconnect links in `index.html` for Google Fonts CDN.
- [x] **Reusable Component (`PerformerAvatarRow.tsx`)**:
  - Implemented 5 performers (Theo, Olayinka, Deborah, Bolu, Gloria) matching Figma nodes `178450:156007` & `178450:156023`.
  - Built floating name slot with `Caveat` typography, hidden by default (`opacity-0`) to prevent vertical layout reflow.
  - On hover/focus, active performer's name appears (`opacity-100 translate-y-0 scale-100`), active avatar elevates (`scale-[1.08] z-30 filter-none`), while siblings blur (`blur-[2px] opacity-60 scale-[0.98]`).
  - Fluid easing using `cubic-bezier(0.16, 1, 0.3, 1)` with 300ms duration.
- [x] **Page Integration (`LandingPage.tsx` & `PricingPage.tsx`)**:
  - Integrated `<PerformerAvatarRow />` into Landing Page hero and Pricing Page "For Performers" blocks.
  - Cleaned up unused legacy avatar constants and resolved lint warnings.
- [x] **Verification & Tests**:
  - Authored comprehensive test suite `PerformerAvatarRow.test.tsx` (5 unit tests).
  - All 34 test files (179 tests) passing 100% green.
  - `npx tsc --noEmit` and `npx eslint`: 0 errors.

### Session 210 — Hero & Pricing 5-Avatar Creative Talent Asset Parity (Figma 178448:155888 & 178448:155893)
- [x] **Asset Extraction via Figma Desktop MCP Server**:
  - Downloaded 5 high-resolution performer portrait assets to `/assets/home/` and `/assets/pricing/`:
    `6012d1b610f186b4da032a28a55bf16e19555e2e.png` (Bolu Olatunji),
    `7e479fe931474f554d58db81abed255122f1de16.png` (Deborah Ojengbede),
    `27c7ee29f5252ea64f624a3fdfd8fa27d463ea10.png` (Gloria Sido),
    `ce41249745f3e585f8d80fb1ce07d7acc7524c76.png` (Theo Olayanju),
    `89a561d69a1da9e8f1cff844db5a81f524163118.png` (Olayinka Olaseni).
- [x] **LandingPage.tsx 5-Avatar Parity**:
  - Replaced legacy 6-avatar stacked markup with 1-to-1 Figma node `178448:155888` structure (`size-[46.457px]`, `mr-[-15px]`, `dark:border-[#1a1a1a]`).
- [x] **PricingPage.tsx 5-Avatar Parity**:
  - Updated "For Performers" pricing header to the exact 5-avatar overlapping row from Figma node `178448:155893`.
- [x] **Quality Gate**:
  - `npx tsc --noEmit`: 0 errors.
  - Vitest test suites (33 test files, 174 tests): 100% passing.

### Session 209 — Monologg Figma Screen & Component Generator Plugin
- [x] **Native Figma Plugin Package (`monologg/tools/figma-plugin/`)**:
  - `manifest.json`: Figma Design plugin definition with clean local sandboxing.
  - `ui.html`: Dark mode generator dialog with screen selectors, token options, and page targets.
  - `code.js`: Complete Plugin API script generating Frame 11 Product showcase, Mobile Bio Storefront (390px), Order Room & Escrow workspace, and Design Tokens swatches.
  - `README.md`: Step-by-step import instructions.
- [x] **Quality Gate**:
  - `npx tsc --noEmit`: 0 errors.
  - Vitest test suites: 100% passing.

### Session 208 — Dark Mode Design Token Harmonization & Divider Parity
- [x] **WebsiteFooter.tsx Hairline Token Parity**:
  - Replaced `dark:bg-[#333333]` with canonical Figma hairline token `dark:bg-[#1a1a1a]` (`border/default`, `178151:49533` & `178151:49781`).
  - Updated pipe separator between Terms of Service and Cookie Policy to `dark:text-[#1a1a1a]`.
- [x] **LegalPage.tsx Hairline Token Parity**:
  - Replaced `dark:bg-[#333333]` with `dark:bg-[#1a1a1a]` in all compliance table and cookie summary table dividers (lines 492, 522, 827, 876).
- [x] **Workspace Diagnostics & Editor Sync Verification**:
  - Validated that `Settings.tsx` and `PublicStorefront.tsx` have zero syntax or TypeScript errors on disk (`pnpm typecheck` exits code 0).
  - Confirmed Frame 11 active card styling (`#0E0E0E` borderless) with zero red outline.
- [x] **Quality Gate**:
  - `pnpm typecheck`: 0 errors across all 3 packages.
  - `npx eslint`: 0 errors, 0 warnings on modified files.
  - Vitest test suites (33 files, 174 tests): 100% passing.

### Session 207 — Product Page Selected State Figma Parity & 5-Card Constant-Height Sliding Window
- [x] **Figma Frame 11 Parity for Selected Card**:
  - Removed red border on active state in dark mode (`background: #0E0E0E; border-radius: 12px;` with zero stroke).
  - Maintained subtle hairline borders on inactive cards (`#e8e8e8` light / `#1a1a1a` dark).
- [x] **5-Card Constant-Height Sliding Window**:
  - Implemented dynamic card measurement via `useLayoutEffect` and `ResizeObserver`.
  - Locked showcase height to constant 560px without layout jumps or page height shifts.
  - Active step advances smoothly, fading out upper cards as they slide out of view.
- [x] **Elimination of Text and Icon Distortion**:
  - Removed scale-based Framer Motion `layout` prop on cards that caused vector icons and typography to stretch.
  - Decoupled trailing status icons with absolute positioning.
  - Applied smooth `cubic-bezier(0.65, 0, 0.35, 1)` easing curve with 0.8s duration.
- [x] **Quality Gate**:
  - `npx tsc --noEmit`: 0 errors.
  - `npx eslint`: 0 errors, 0 warnings.
  - Vitest test suites (33 files, 174 tests): 100% passing.

### Session 206 — 1-to-1 Dark Mode Implementation & 7-Step Sequence Reorder for Product & Landing Pages (Figma 178432:6988 & 178423:1897)
- [x] **Asset Extraction via Local Figma Dev Mode MCP Server**:
  - Downloaded 38 dark mode SVG assets for `ProductPage.tsx` into `monologg/apps/web/public/assets/product/`.
  - Downloaded 31 dark mode SVG assets for `LandingPage.tsx` into `monologg/apps/web/public/assets/home/`.
  - Verified non-zero byte size on all assets.
- [x] **ProductPage.tsx 7-Step Sequence Reorder & Dark Mode (`178432:6988`)**:
  - Reordered list items strictly to: `01` Sleek Bio Storefront, `02` Custom Rate Cards & Micro-Deliverables, `03` Real-Time Performer Analytics & Visitor Intelligence, `04` Escrow Security, `05` Direct Proposal Bidding, `06` Integrated Scheduling, `07` Interactive AI Agent.
  - Rebuilt `StepIllustration` with the 7 dark mode SVG illustrations extracted from Figma.
  - Aligned card tokens: active card `bg-[#f9f9f9] dark:bg-[#0e0e0e]` with white arrow circle right in dark mode; completed card with red checkmark; default card with `#bababa` spinner.
  - Stage container: `bg-[#f9f9f9] dark:bg-[#1a1a1a] rounded-[20px]`.
- [x] **LandingPage.tsx 6-Feature Dark Mode 1-to-1 Implementation (`178423:1897`)**:
  - Implemented `DualImg` helper component for pure CSS dark/light mode asset switching.
  - Mapped all 6 vertical timeline features to their respective dark mode multi-layer illustrations.
  - Aligned vertical line track to `dark:bg-[#1a1a1a]` with gradient thumb `dark:from-[#484848] dark:to-[#aeaeae]`.
- [x] **Quality Gate**:
  - `npx tsc --noEmit`: 0 errors.
  - `npx eslint`: 0 errors, 0 warnings.
  - Vitest test suites across entire project (33 test files, 174 tests): 100% passing.
  - Isolated analytics network dispatch during automated unit tests (`src/lib/analytics.ts`).

### Session 205 — Fix Duplicate Section Type & Malformed State Initializer in Settings.tsx
- [x] **Settings.tsx Compilation Fix**:
  - Removed duplicate `type Section` declaration (line 25).
  - Resolved nested broken `if` statement and unmatched brace in `useState<Section>` initialization.
  - Removed duplicate legacy external links in Support & legal section.
  - Verified `npx tsc --noEmit` and `npx eslint` pass with 0 errors.
  - All 25 unit tests green.

### Session 204 — Resolution of All Linter and Workspace Problems Across Open Files
- [x] **Settings.tsx Cleanup**:
  - Removed unused imports: `compareKycNames`, `Smartphone`, `Briefcase`, `DollarSign`, `Building2`, `Scale`.
  - Removed dead functions: `handleSave` and `handleSaveBank`.
  - Replaced `as any` casting on `orgType` with strict literal union type.
  - Validated card expiry year `yy` (`if (!yy || yy < 24) ...`).
- [x] **PublicStorefront.tsx Cleanup**:
  - Removed unused imports: `Avatar`, `appStateSync`, `Music`, `Linkedin`, `Globe`, `MapPin`.
- [x] **WebsiteFooter.tsx & WebsiteFooter.test.tsx Cleanup**:
  - Removed unused asset constants `imgVectorBadge2` and `imgYcSymbol`.
  - Removed unused hoisted mock `insertMock`.
- [x] **ProductPage.tsx, ResourcesPage.tsx & LandingPage.tsx Cleanup**:
  - Removed unused `imgFaqX` from `ProductPage.tsx`.
  - Replaced `catch (err: any)` with `catch (err: unknown)` in `ResourcesPage.tsx`.
  - Removed unused `imgX` from `LandingPage.tsx`.
- [x] **Automated Testing & Quality Gate**:
  - `npx eslint` on all 10 target files: 0 errors, 0 warnings.
  - `npx tsc --noEmit`: 0 errors.
  - Vitest test suites: 100% passing (21/21 tests).

### Session 203 — In-App Terms of Service, Role-Adaptive Escrow Policies in Settings, Cookie Policy Header Alignment & Mobile Typography Polish
- [x] **In-App Terms of Service Subview in Settings**:
  - Added `"terms"` and `"escrow"` to `Section` union type with deep-link support (`?section=terms`).
  - Implemented structured in-app view with 6 core legal clauses, effective date indicator, and link out to full web legal document.
- [x] **Role-Adaptive Escrow Policy in Settings**:
  - Replaced `Privacy Policy` with `Escrow Policy` in the Support & legal menu block.
  - Implemented Client Escrow Terms (`CLIENT_ESCROW_TERMS`) for clients detailing 100% upfront lock, 48-hr inspection, 12% fee, refund policy, and dispute freezing.
  - Implemented Performer Escrow Terms (`PERFORMER_ESCROW_TERMS`) for performers detailing pre-funded guarantee, attendance PIN, 48-hr auto-release, 93% net take-home, and 50% kill-fee.
  - Added 3-metric highlight dock and Trust & Safety guarantee card.
- [x] **Cookie Policy Header & Responsiveness Alignment**:
  - Changed `Cookie Settings & Policy` header to `Cookie Policy` in `LegalPage.tsx` with responsive `text-3xl sm:text-5xl md:text-[64px]`.
  - Added responsive padding and border radii to `CARD_CLASSES` (`p-5 sm:p-6 md:p-[24px]`).
- [x] **Automated Testing & Quality Gate**:
  - Added 4 unit tests in `Settings.test.tsx` verifying support navigation, terms rendering, client escrow rules, and performer escrow rules.
  - All 46 tests passing across marketing and settings test suites.
  - Zero TypeScript compiler errors (`npx tsc --noEmit`).

### Session 202 — Website Footer Copy Update to "Powered by paystack"
- [x] **Footer Copy Standardization Across All Pages**:
  - In `WebsiteFooter.tsx`, updated the Paystack association copy from `"Backed by"` to `"Powered by"`.
  - Maintained `Inter Tight` 14px typography and verified responsive alignment alongside the Paystack 4-cyan-bar SVG icon and bold lowercase `paystack` brand name.
- [x] **Automated Test Coverage**:
  - Added assertions in `WebsiteFooter.test.tsx` verifying `"Powered by"` and `"paystack"` are both present in the rendered DOM.
- [x] **Quality Gate**:
  - All 28 tests passing across all 6 marketing test suites.
  - Zero TypeScript compiler errors (`npx tsc --noEmit`) in `apps/web`.

### Session 201 — Subtle #1A1A1A Strokes Closer to Black, Slower Marquee with Icon Tone Parity, White Logo Marks & Red Step Badges
- [x] **Marquee Animation Slowdown & Icon Tone Balance**:
  - Slowed marquee animation from 28s to 60s in `tokens.css` for an elegant, readable pace.
  - Removed wrapper `dark:invert` to resolve double inversion; updated `.dark .animate-marquee-ltr img` to `filter: invert(1)` with `opacity-60 group-hover:opacity-100 transition-opacity` to perfectly match `#A3A3A3` text resting tone and `#F9F9F9` hover state.
- [x] **Monologg Logo Icon Glyph Pure White on Pricing & Resources**:
  - Added `alt="Monologg"` and `dark:invert` to `ASSETS.logoIcon` across `PricingPage.tsx`, `ResourcesPage.tsx`, and `LegalPage.tsx`.
  - Expanded `tokens.css` selectors for header and footer logo icon masks to guarantee both icon mark and wordmark invert together into pure white in dark mode.
- [x] **Product 7-Step Checkmarks & Active Outline Brand Red**:
  - Removed `dark:invert` from `imgCheckCircle` in `ProductPage.tsx` so the SVG renders in native Monologg brand red (`#F13030`) instead of neon cyan.
  - Eliminated browser default neon blue outline rings via global focus reset in `tokens.css` and `outline-none focus:outline-none focus-visible:outline-none` on all 7 step cards.
  - Enforced `.dark [data-step-state="active"] { border-color: #F13030 !important; }` in `tokens.css`.
- [x] **Universal Subtle Strokes Closer to Black (`#1A1A1A`) Across All Pages**:
  - Standardized `--color-hairline`, `--color-border-default`, and `--color-border-strong` to `#1A1A1A` in `tokens.css`.
  - Replaced all explicit `dark:border-[#333333]` classes with `dark:border-[#1a1a1a]` across `LandingPage.tsx`, `ProductPage.tsx`, `PricingPage.tsx`, `ResourcesPage.tsx`, `LegalPage.tsx`, and `WebsiteFooter.tsx`.
  - Updated unit test assertions in `LandingPageHeader.test.tsx` to verify `#1A1A1A` subtle stroke.
- [x] **Automated Verification**:
  - 28/28 tests passing across all 6 marketing test suites (`LandingPageHeader.test.tsx`, `PricingPage.test.tsx`, `ProductPage.test.tsx`, `ResourcesPage.test.tsx`, `LegalPage.test.tsx`, `WebsiteFooter.test.tsx`).
  - Zero TypeScript compiler errors (`npx tsc --noEmit`) in `apps/web`.

### Session 200 — 1-to-1 Cohesive Dark/Light Mode Using Frame 2147228281 `leye/Grey alpha` Spectrum & Complete Marketing Suite Cleanup
- [x] **Systematic 1-to-1 Token Migration Across All Pages**:
  - `LandingPage.tsx`: Root background, header, marquee, timeline, stage preview box, 6 feature boxes, and FAQ cards migrated to explicit Tailwind light/dark tokens (`#1a1a1a` / `#f9f9f9`, `#767676` / `#a3a3a3`, `#e8e8e8` / `#333333`, `#f9f9f9` / `#1a1a1a`).
  - `ProductPage.tsx`: Full migration of Performer Portal 7-step interactive showcase, stage preview box, Client Portal 2x2 grid, Thespian AI role-toggle tables, and 10 FAQ accordions.
  - `PricingPage.tsx`: Full migration of hero section, audience selector `• PERFORMER | CLIENT`, comparison tables, studio badges, and FAQ accordions.
  - `ResourcesPage.tsx`: Full migration of Section 4 Master card, support pills, contact bar, social badges with `dark:invert`, and Section 5 "Become an Investor" form.
  - `LegalPage.tsx`: Full migration of 12 Terms cards, 7 Cookie cards, summary table, and dividers using standard `CARD_CLASSES` (`border-[#e8e8e8] dark:border-[#333333] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a]`).
  - `WebsiteFooter.tsx`: Full migration of CTA banner, newsletter form, social links, legal dividers, and footer branding.
- [x] **Destructive Global CSS Overrides Eliminated (`tokens.css`)**:
  - Removed `.dark div.bg-white:not(...)` rule to prevent white status bar masks on the iPhone 15 mockup (`178361:20289`, `178361:20290`) from inverting to black.
  - Removed `.dark [data-node-id="178151:49527"] button` rule to restore brand-red `#F13030` and `#D92626` hover state to the newsletter submit button.
  - Removed `.dark div.bg-[#f9f9f9]` rule that was overwriting explicit `dark:bg-[#1a1a1a]` elevated surfaces.
  - Added explicit protection for phone screen and status-bar masks: `.dark [data-node-id="178359:16950"], .dark [data-node-id="178361:20289"], .dark [data-node-id="178361:20290"] { background-color: #FFFFFF !important; }`.
- [x] **Verification & Quality Gate**:
  - 28/28 tests passing across all 6 marketing test suites (`LandingPageHeader.test.tsx`, `PricingPage.test.tsx`, `ProductPage.test.tsx`, `ResourcesPage.test.tsx`, `LegalPage.test.tsx`, `WebsiteFooter.test.tsx`).
  - 0 TypeScript compiler errors (`npx tsc --noEmit`) in `monologg/apps/web`.

### Session 199 — Strict Dark Mode Strokes #333333 and Background Hover States #1A1A1A Across All Website Pages Including Legal
- [x] **Stroke & Border Standardization to `#333333`**:
  - `tokens.css`: Updated `--color-border-strong` to `#333333` (matching `--color-border-default` and `--color-hairline`).
  - Standardized all borders, dividers, table lines, secondary button outlines, theme toggle buttons, social link pills, and dropdown containers in dark mode to strictly `border-color: #333333 !important;`.
  - Enforced that hover states with `hover:border-transparent` or `hover:border-[#16161a]` on legal cards and buttons retain `#333333` stroke in dark mode.
- [x] **Background Hover State Refinement to `#1A1A1A`**:
  - `tokens.css`: Standardized all interactive background hover selectors across the website to `background-color: #1A1A1A !important;` (replacing any residual `#333333`, `#484848`, or `#262626` hover values).
  - Applied across all 12 Legal Terms cards, 7 Cookie Settings cards, compliance and cookie table rows, product 7-step cards, secondary buttons, theme toggles, social icons, dropdown menu items, and footer newsletter buttons.
- [x] **Verification & Quality Gate**:
  - Authored dedicated unit test in `LandingPageHeader.test.tsx` verifying `#333333` strokes and `#1A1A1A` hover backgrounds in `tokens.css`.
  - All 34 unit tests passing across all 7 test suites.
  - Zero TypeScript compiler errors (`npx tsc --noEmit`) in both `apps/web` and `apps/api`.
- [x] **Frame 2147228281 Palette Architecture (`tokens.css`)**:
  - Integrated the 13-tone grey spectrum (`#000000`, `#1A1A1A`, `#333333`, `#484848`, `#767676`, `#A3A3A3`, `#BABABA`, `#D1D1D1`, `#E8E8E8`, `#F5F5F5`, `#F7F7F7`, `#F8F8F8`, `#F9F9F9`) across light mode (`:root`) and dark mode (`.dark`).
- [x] **Comprehensive Website Dark Mode Coverage**:
  - Configured high-contrast `#000000` canvas, `#1A1A1A` primary surfaces, and `#333333` elevated containers.
  - Formatted `#F9F9F9` primary titles, `#BABABA` secondary body text, and `#767676` captions.
  - Handled sticky headers, audience toggles, marquee fade masks, 7-step showcase cards, comparison tables, investor form inputs, pre-footer CTA, and footer.
  - Inverted logos and dark vector icons with `filter: invert(1) brightness(1.8)`.
- [x] **Verification & Quality Gate**:
  - Added unit test in `LandingPageHeader.test.tsx` verifying dark mode toggle state.
  - 33/33 unit tests passing across all 7 test suites.
  - 0 TypeScript compiler errors in both `apps/web` and `apps/api`.

### Session 197 — "Become an Investor" Section Deep-Linking, CTA Section Alignment & Global Button Link Audit
- [x] **"Become an Investor" Routing to `/resources#investor`**:
  - `WebsiteFooter.tsx`: Updated `handleInvestor` to navigate to `/resources#investor` and perform smooth scroll to `#investor`.
  - `ResourcesPage.tsx`: Added `id="investor"` and `scroll-mt-24` to section `178359:18473`. Added hash detection and smooth scroll in `useEffect` and `hashchange` listener.
  - `routes.tsx`: Added `/investor` and `/investors` redirect aliases to `/resources#investor`.
- [x] **Alignment & Spacing for "Finish Your Project today!" CTA Section**:
  - `WebsiteFooter.tsx`: Updated pre-footer CTA container from `max-w-[910px]` to `max-w-[1040px] w-full justify-between items-start gap-10 md:gap-12 lg:gap-16`.
  - Aligned "Finish Your Project today!" directly to the left boundary of "Join our newsletter", providing balanced, senior FAANG visual hierarchy and spacing.
- [x] **Global Button Link Audit & Defensive Routes**:
  - `LandingPage.tsx`: Connected Hero "Find Performers" to `/client` (or `/onboarding/client`), "Find Gigs" to `/dashboard` (or `/onboarding`), and user menu "Post a Brief" to `/brief`.
  - `routes.tsx`: Added defensive redirect routes for `/search` -> `/client`, `/gigs` -> `/dashboard`, and `/post-gig` -> `/brief`.
- [x] **Verification & Quality Gate**:
  - 32/32 unit tests passing across all 7 test suites (`LandingPageHeader.test.tsx`, `PricingPage.test.tsx`, `ProductPage.test.tsx`, `ResourcesPage.test.tsx`, `LegalPage.test.tsx`, `WebsiteFooter.test.tsx`, `AuthFlow.test.tsx`).
  - Zero TypeScript compiler errors (`npx tsc --noEmit`) in both `monologg/apps/web` and `monologg/apps/api`.

### Session 196 — Universal "Get Started for Free" Onboarding Routing & Sign In / Sign Up Deep-Link Toggles
- [x] **"Get Started for Free" Buttons Directed to `/onboarding`**:
  - `ProductPage.tsx`: Updated all 4 "Get started for free" buttons (Performer Portal hero, 7-step showcase, Thespian AI performer, and Thespian AI client) to navigate to `/onboarding`.
  - `PricingPage.tsx`: Updated all 3 "Get started for free" buttons (Hero, Under Performers table, and Under Clients table) to navigate to `/onboarding`.
  - `LandingPage.tsx`: Updated `handleGetStarted` (passed to footer) to navigate to `/onboarding`.
- [x] **"Sign In" and "Sign Up" Deep-Link Routing**:
  - `LandingPage.tsx`: Updated header "Sign In" button to navigate to `/auth?mode=signin` and "Sign up free" button to navigate to `/auth?mode=signup`.
  - `PublicStorefront.tsx`: Updated header "Sign In" buttons to `/auth?mode=signin` and "Join Free" button to `/auth?mode=signup`.
  - Confirmed `ProductPage.tsx`, `PricingPage.tsx`, `ResourcesPage.tsx`, and `LegalPage.tsx` already navigate to `/auth?mode=signin` and `/auth?mode=signup`.
- [x] **Dynamic Param Synchronization in `AuthFlow.tsx`**:
  - Added `useEffect` listening to `searchParams` to update `view` between `"login"` and `"register"` and `role` dynamically.
- [x] **Route Aliases in `routes.tsx`**:
  - Added `/login` and `/signin` redirects to `/auth?mode=signin`.
  - Added `/signup` and `/register` redirects to `/auth?mode=signup`.
- [x] **Verification**:
  - 31/31 unit tests passing across 7 suites (`LandingPageHeader.test.tsx`, `PricingPage.test.tsx`, `ProductPage.test.tsx`, `ResourcesPage.test.tsx`, `LegalPage.test.tsx`, `WebsiteFooter.test.tsx`, `AuthFlow.test.tsx`). 0 errors on `npx tsc --noEmit`.

### Session 195 — Fixed Sticky Navigation Headers & Unified Performer/Client Audience Toggle Tags Across All Public Pages
- [x] **Universal Fixed / Sticky Navigation (`LandingPage.tsx`, `ProductPage.tsx`, `PricingPage.tsx`, `ResourcesPage.tsx`, `LegalPage.tsx`)**:
  - Replaced `overflow-x-hidden` with `overflow-x-clip` on parent containers across all 5 public pages to prevent WebKit/Blink scroll container creation from overriding window-level `position: sticky`.
  - Updated `<header>` on `LandingPage.tsx` from `relative ... max-w-[1440px] z-20` to `sticky top-0 w-full z-50 backdrop-blur-[12px] bg-white/95 border-b border-[#ecece8] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.06),0px_2px_4px_-2px_rgba(0,0,0,0.06)] px-4 sm:px-8 lg:px-[64px]`.
  - Removed trailing `.relative` override on `ProductPage.tsx` `<header>` and unified `z-50`.
  - Standardized header shadow and `z-50` across `PricingPage.tsx`, `ResourcesPage.tsx`, and `LegalPage.tsx`.
- [x] **Theme Toggle Parity (`LandingPage.tsx`)**:
  - Added theme toggle button (`ASSETS.themeToggle` moon icon) with `useTheme()` hook from `../Root` to the Landing page header right-side controls, achieving identical header feature set across all public marketing pages.
- [x] **Unified Performer & Client Audience Toggle Tags (`PricingPage.tsx`)**:
  - Replaced the thin-bordered red-dot pill (`Performers • Clients`) in Sub-Blocks 1 and 2 of `PricingPage.tsx` with the exact `• PERFORMER | CLIENT` grey rounded-full pill design from `ProductPage.tsx` (`bg-[#f4f4f2]`, white active card, black dot, `Geist Mono` uppercase font, `|` divider, and accessible `aria-label`).
- [x] **Verification & Quality Gate**:
  - All 25 marketing page tests passing across 6 test suites (`LandingPageHeader.test.tsx`, `PricingPage.test.tsx`, `ProductPage.test.tsx`, `ResourcesPage.test.tsx`, `LegalPage.test.tsx`, `WebsiteFooter.test.tsx`).
  - Zero TypeScript compiler errors (`npx tsc --noEmit`) in both `apps/web` and `apps/api`.

### Session 194 — Newsletter Email Signup Supabase Storage & Website Deployment to Main Branch
- [x] **Supabase Storage for Email Signups (`public."NewsletterSubscriber"`)**:
  - Created `public."NewsletterSubscriber"` table in Supabase Postgres with `id`, `email` (unique), `source`, `status`, `metadata`, `createdAt`, `updatedAt`, and RLS policies.
- [x] **Prisma & Backend Ingestion (`schema.prisma`, `routes/newsletter.ts`)**:
  - Added `model NewsletterSubscriber` in `apps/api/prisma/schema.prisma` and generated Prisma Client.
  - Implemented `POST /api/v1/newsletter/subscribe` and `GET /api/v1/newsletter/subscribers` (with CSV export support `?format=csv`).
- [x] **Frontend Ingestion & UI Feedback (`WebsiteFooter.tsx`, `api-client.ts`, `routes.tsx`)**:
  - Connected `handleNewsletterSubmit` in `WebsiteFooter.tsx` directly to `supabase.from("NewsletterSubscriber").upsert(...)`, API client fallback, and `waitlist_submitted` telemetry.
  - Added submitting spinner, disabled button states, `"Thanks for subscribing!"` feedback, and `#newsletter` hash anchor scroll.
  - Added `/newsletter`, `/subscribe`, `/waitlist` redirect routes to `/#newsletter`.
- [x] **Quality Gate & Testing**:
  - Created `WebsiteFooter.test.tsx` (2/2 tests passing). All 25 marketing page tests passing. 0 errors on `npx tsc --noEmit` across both `apps/web` and `apps/api`.

### Session 193 — Thespian AI Performer & Client Table Rows Hover-Only Background Fill
- [x] **Thespian AI Row 1 Hover-Only Refactoring (`ProductPage.tsx`)**:
  - Removed default static `bg-[#f7f7f7]` from Performer Table Row 1 (`Instant AI Onboarding`, `178359:17863`) and aligned padding to `p-[24px]` so it starts transparent and only fills `#f7f7f7` with `hover:scale-[1.005]` on hover.
  - Removed default static `bg-[#f7f7f7]` from Client Table Row 1 (`Vibe & Texture Matching`, `178359:17925`) and aligned padding to `p-[24px]` so it starts transparent and only fills `#f7f7f7` with `hover:scale-[1.005]` on hover.
- [x] **Verification**:
  - All 5 tests in `ProductPage.test.tsx` pass. All 23 tests across marketing test suite pass. 0 errors on `npx tsc --noEmit`.

### Session 192 — Product Page Headline 2-Line Formatting & Continuous Rolling Spinner Animation
- [x] **Performer Portal Heading 2-Line Formatting (`ProductPage.tsx`)**:
  - Expanded `max-w-[526px]` to `max-w-[820px]` and added `<br className="hidden sm:inline" />` ensuring headline balances into exactly two lines: `"Build your personal"` on line 1 and `"digital stage"` on line 2.
- [x] **Animated Rolling Spinner Micro-Interaction (`ProductPage.tsx`)**:
  - Bound rayed spinner icon (`imgSpinner`) in default step cards to continuous 3s linear rotation (`animate={{ rotate: 360 }}`).
- [x] **Verification**:
  - All 5 tests in `ProductPage.test.tsx` pass. 0 errors on `npx tsc --noEmit`.

### Session 191 — FAANG-Grade Web Motion & Micro-Interactions Across Landing, Product & Pricing Pages
- [x] **Home Hero Left-to-Right Scrolling Marquee (`LandingPage.tsx`, `tokens.css`)**:
  - Implemented `@keyframes marquee-ltr` with 28s linear infinite loop, hover pause, edge fade white gradients, and category pill micro-interactions.
- [x] **Timeline Scroll Bar Fill & Feature Viewport Entrance (`LandingPage.tsx`)**:
  - Attached Framer Motion `useScroll` + `scaleY` to the vertical 2px timeline line, filling dynamically from top to bottom.
  - Animated feature blocks into view with `whileInView={{ opacity: 1, y: 0 }}` and preview image card hover lift (`whileHover={{ y: -6 }}`).
- [x] **Product Page 7-Step Showcase & Thespian AI Interactions (`ProductPage.tsx`)**:
  - Added fluid card layout animations with expanding active step descriptions, spring pop checkmarks, and stage crossfade.
  - Built an in-place `PERFORMER | CLIENT` role toggle for Thespian AI with smooth transitions and zero page scroll.
  - Applied `#f7f7f7` hover fill and subtle scale across all rows on both Performer and Client tables.
- [x] **Pricing Page Blur-In Comparison Table Rows (`PricingPage.tsx`)**:
  - Implemented horizontal row entrance animation dissolving blur (`blur(6px)` to `blur(0px)`) with staggered delays (`idx * 0.03`) and hover highlight.
- [x] **Universal Fluid FAQ Accordions (`LandingPage.tsx`, `ProductPage.tsx`, `PricingPage.tsx`)**:
  - Upgraded FAQ accordion items across all 3 pages with `AnimatePresence` height & opacity transitions and 45° spring icon rotation (+ to ×).
- [x] **Test Polyfills & Verification (`test-setup.ts`)**:
  - Polyfilled `window.IntersectionObserver` and `window.ResizeObserver` for jsdom.
  - Verified 23/23 tests passing and 0 TypeScript errors (`npx tsc --noEmit`).

### Session 190 — Full FINCRA Deprecation & Paystack Replacement Across Webapp, Specs & Main Branch
- [x] **Complete Elimination of FINCRA across `apps/web`**:
  - Replaced FINCRA with Paystack in `Checkout.tsx`, `ClientDashboard.tsx`, `LandingPage.tsx`, `PricingPage.tsx`, `ProductPage.tsx`, and `ResourcesPage.tsx`.
  - Cleaned up all 11 references in `monologg_ux_spec.md` and historical drafts.
  - Standardized announcement bar emoji spacing to `"Monologg is in Alpha 🥳 🥳"` across all 5 public pages and unit tests.
- [x] **Main Branch Parity & Synchronization**:
  - Applied the FINCRA-to-Paystack changes to `main` branch, verified build and tests, and pushed to `origin/main`.
- [x] **Zero TypeScript Errors & Clean Test Suite**:
  - Confirmed 0 errors on `npx tsc --noEmit` and all 23/23 tests passing.

### Session 189 — Home Timeline Copy, System-Wide Alpha Announcement Bar & Footer Legal Links
- [x] **Home 6-Feature Section Copy Updates (`LandingPage.tsx`)**:
  - Replaced temporary placeholder copy with user-specified headline `"Run your performing career like the business it actually is"` and subtext `"Share your work, set your prices, track your audience and get paid securely, without an agent in the middle."`.
- [x] **System-Wide Announcement Bar Copy Updates**:
  - Standardized all 5 website pages (`LandingPage.tsx`, `ProductPage.tsx`, `PricingPage.tsx`, `ResourcesPage.tsx`, `LegalPage.tsx`) with left status pill `"Monologg is in Alpha 🥳🥳"` and right metric `"Paystack Secured · 25+ Verified Performers"`.
- [x] **Shared Website Footer Legal Accessibility & Paystack Badge (`WebsiteFooter.tsx`)**:
  - Added direct interactive buttons for `"Terms of Service"` (`/terms`) and `"Cookie Policy"` (`/cookies`) in the bottom copyright bar (`178407:19721`).
  - Swapped `"Backed by"` badges to official Paystack 4-bar SVG icon and bold wordmark.
- [x] **Unit Testing & Verification**:
  - Updated and passed unit tests in `LandingPageHeader.test.tsx`, `ProductPage.test.tsx`, `PricingPage.test.tsx`, and `ResourcesPage.test.tsx` (23/23 tests passing).
  - Confirmed 0 TypeScript errors across `apps/web` and `apps/api`.

### Session 188 — 1-for-1 Figma Cookie Settings & Policy Implementation & Microinteractions
- [x] **1-for-1 Cookie Policy Fidelity (`LegalPage.tsx`)**:
  - Aligned hero subtext typography to `Inter Tight` 16px / 24px (`tracking-[0.48px]`, `664px` max width) matching Figma node `178383:18937`.
  - Converted Card 3 and Card 4 headings to semantic `<h2>` elements with exact typography (`Switzer` 18px Medium).
  - Aligned Card 4 table columns (`Cookie Identifier`, `Category`, `Primary Purpose`, `Duration`, `type`), bounding `Vector 2553` / `#e8e8e8` dividers, and removed extraneous unmodeled trailing note.
  - Implemented Card 5 structured subheadings (`In-App Consent Preferences`, `Web Browser Controls` with Chrome, Firefox, Safari, Edge paths, and trailing note).
  - Aligned Card 6 heading to exact Figma copy `6. Third-Party Integrations`.
  - Standardized all 7 cards with `CARD_CLASSES` (`border border-[#e8e8e8] hover:border-transparent hover:bg-[#f9f9f9] transition-all duration-200`) providing the hover microinteraction demonstrated in Figma Card 2.
- [x] **Unit Testing & TypeScript Gate (`LegalPage.test.tsx`)**:
  - Expanded test suite asserting 7-card hover microinteractions, exact table headers, subheadings, and integrations title (4/4 passing, `tsc --noEmit` 0 errors across `apps/web` and `apps/api`).

### Session 187 — Terms & Legal Section Card Hover Microinteraction Parity
- [x] **Section Card Hover Microinteraction (`LegalPage.tsx`)**:
  - Implemented unified `CARD_CLASSES` styling (`border border-[#e8e8e8] border-solid hover:border-transparent hover:bg-[#f9f9f9] transition-all duration-200`) across all 12 Terms section cards and 7 Cookie Policy section cards.
  - Converted Card 4 from static `#f9f9f9` fill to default bordered state with active hover highlight matching Figma variant intentions.
- [x] **Test Verification (`LegalPage.test.tsx`)**:
  - Added test validating all 12 section cards carry the responsive hover transition classes (4/4 passing, `tsc --noEmit` 0 errors).

### Session 186 — Strict 1-for-1 Figma Terms of Service Page Implementation & Local Assets
- [x] **Extracted & Self-Hosted All Terms SVG Assets (`apps/web/public/assets/terms/*`)**:
  - Populated static vector assets locally in `apps/web/public/assets/terms/`: header masked Monologg SVG logo, theme toggle SVG, ambient blurred background gradient SVGs, dashed horizontal divider SVG, and vector dividers.
- [x] **1-for-1 Terms of Service Page Implementation (`apps/web/src/app/pages/LegalPage.tsx`)**:
  - Rebuilt announcement bar (`178382:17927`) and sticky header (`178382:17939`) with exact typography, masked SVG logo, and unaccented nav links.
  - Implemented ambient background gradient blurs (`178382:17974`) and Hero header (`178382:17985`) with status pill, `Switzer` 64px Medium title, and `Inter Tight` subtext.
  - Implemented all 12 Section Cards (`178385:19525`), including Card 2's structured compliance table with uppercase `Geist Mono` headers & dividers, and Card 4's borderless `#F9F9F9` background.
  - Positioned full-width `dashed-divider.svg` separator before `<WebsiteFooter />`.
  - Verified `LegalPage.test.tsx` (3/3 passing) and `npx tsc --noEmit` across `apps/web` and `apps/api` (0 errors).

### Session 185 — Investor Dropdown Chevron Fix & Supabase Backend Storage Integration
- [x] **Eliminated Native Browser Double Chevron (`ResourcesPage.tsx`)**:
  - Reset native WebKit/Blink dropdown arrows on `<select>` using explicit inline styles `style={{ WebkitAppearance: "none", MozAppearance: "none", appearance: "none", backgroundImage: "none" }}` with `pl-[13px] pr-[36px]`.
  - Positioned the custom Figma vector `caretDown` SVG (`16×16px`) at `right-[13px] top-1/2 -translate-y-1/2 pointer-events-none`.
- [x] **Created Supabase Backend Schema & Storage (`public."InvestorApplication"`)**:
  - Executed SQL on Supabase Postgres creating table `public."InvestorApplication"` with columns `id`, `firstName`, `lastName`, `email`, `phone`, `investorRole`, `message`, `status` (`'PENDING'`), `createdAt`, and `updatedAt`.
  - Configured Row-Level Security (RLS) policies allowing guest insert (`TO anon, authenticated, service_role WITH CHECK (true)`) and read access.
  - Added `model InvestorApplication` to `apps/api/prisma/schema.prisma` and generated the Prisma client.
  - Dispatched PostgREST reload notification (`NOTIFY pgrst, 'reload schema'`).
- [x] **Wired Form Ingestion & Telemetry (`ResourcesPage.tsx`)**:
  - Connected `handleInvestorSubmit` directly to `supabase.from("InvestorApplication").insert(payload)`.
  - Dispatched `trackEvent("waitlist_submitted", { type: "investor_application", ... })`.
  - Added loading spinner button state (`Submitting Application...`), button disabled state during submission, and failure alert banner.
- [x] **Verified Unit Tests & TypeScript (`ResourcesPage.test.tsx`)**:
  - Added Supabase mock in `ResourcesPage.test.tsx` ensuring fast deterministic tests.
  - Verified 5/5 unit tests passing and `npx tsc --noEmit` 0 errors across `apps/web` and `apps/api`.

### Session 184 — Strict 1-for-1 Figma Resources Page Implementation, Terms & Support Cards, Social Avatars & Investor Form
- [x] **Extracted & Self-Hosted All 20 Figma Resources Page Assets (`apps/web/public/assets/resources/*`)**:
  - Downloaded all 20 static SVG assets from Figma node `178359:18325` (Monologg masked logo & theme toggle SVG, ambient blurred gradient background SVGs, `gavel.svg`, `question.svg`, vertical divider `vector-2553.svg`, horizontal divider `vector-2555.svg`, bottom bar `gmail.svg`, 7 social badges for `LinkedIn`, `Product Hunt`, `Twitter-X`, `Twitch`, `Telegram`, `TikTok`, `Instagram`, dropdown `caret-down.svg`, and `arrow-right.svg`).
- [x] **1-for-1 Resources Page Implementation (`apps/web/src/app/pages/ResourcesPage.tsx`)**:
  - Rebuilt Header (`Resources` active link with `8px` red dot and `#F25757` text), ambient blurred gradient background (`178359:18373`), master Resources card (`1000px` width with `Terms of Service` and `Support & Community` badges, 2×2 grid with `Vector 2553` vertical lines and `Vector 2555` horizontal divider, `#F9F9F9` bottom bar with `hello@monologg.co` link and 7 circular social badges), and the 2-column "Become an Investor" section (`RAISING SOON!`, `48px` `Switzer` heading, and `530px` interactive application form card with all inputs and `Submit Application` CTA button), plus the shared `<WebsiteFooter />`.
  - Verified `ResourcesPage.test.tsx` (5/5 passing) and `npx tsc --noEmit` (0 errors).

### Session 183 — Strict 1-for-1 Figma Pricing Page Implementation, Performer & Client Comparison Tables & Extracted SVG/PNG Assets
- [x] **Extracted & Self-Hosted All 24 Figma Pricing Page Assets (`apps/web/public/assets/pricing/*`)**:
  - Downloaded all 24 static SVG and PNG assets from Figma node `178359:17960` (Monologg masked logo, theme toggle SVG, ambient blurred gradient background SVGs, `ArrowRight` SVG, 6 composite performer PNG avatar stacks, 6 studio badge SVGs, dashed horizontal divider SVG, and FAQ `Plus`/`X` SVGs).
- [x] **1-for-1 Pricing Page Implementation (`apps/web/src/app/pages/PricingPage.tsx`)**:
  - Rebuilt Header (`Pricing` active link with `8px` red dot and `#F25757` text), Hero (`#F9F9F9` background, `Switzer` `64px` `"Pricing"`, `Inter Tight` `18px` subtitle, `Get started for free` button), and in-place tab switching between **For Performers** (role pill, 6 overlapping composite performer avatars, `Switzer` `48px` heading, `1040px` 3-column table with 9 rows and borderless `Geist Mono` `Coming Soon` indicator, bottom CTA button) and **For Clients** (role pill, 6 overlapping studio logo badges, `Switzer` `48px` heading, `1040px` 3-column table with all 23 rows including 5 `#F9F9F9` category headers, bottom CTA button), plus the dashed divider, borderless 10-item FAQ accordion, and `<WebsiteFooter />`.
  - Verified `PricingPage.test.tsx` (5/5 passing) and `npx tsc --noEmit` (0 errors).

### Session 182 — Strict 1-for-1 Figma Product Page Implementation, 3-State Step Cards & Extracted 7-Step Illustrations
- [x] **Extracted & Self-Hosted All 64 Figma Product Page Assets (`apps/web/public/assets/product/*`)**:
  - Downloaded all 64 SVG assets from Figma node `178359:17305` (header logo & theme icon, `ArrowCircleRight` / `Spinner` / `CheckCircle` step state icons, all 7 `300×300` phone illustrations, Client Portal icons & 6 studio logos, Thespian AI dividers, and FAQ `Plus`/`X` icons).
- [x] **3-State Stepper Cards & 7 Extracted Illustrations (`apps/web/src/app/pages/ProductPage.tsx`)**:
  - Applied the 3 card states (`default` with `#bababa` text & `Spinner` SVG, `active` with `#f9f9f9` card, `ArrowCircleRight` SVG, `#16161a` title & `#6d6d75` description, and `completed` with `#333333` text & red `CheckCircle` SVG) across all 7 steps (`01`–`07`).
  - Extracted the 7 `300×300` Figma SVG illustrations from `Frame 2147228146` into the right-hand `525×484px` preview stage without duplicating the reference section underneath.
- [x] **1-for-1 Client Portal, Thespian AI Tables & FAQ (`ProductPage.tsx`, `ProductPage.test.tsx`)**:
  - Rebuilt Client Portal (`1000px` 2×2 grid + 6 overlapping media house logos), Thespian AI (Performer 5-row table + Client 3-row table), and 10-item borderless FAQ accordion (`ProductPage.test.tsx` 5/5 passing, `npx tsc --noEmit` 0 errors).

### Session 181 — Strict 1-for-1 Figma Home Page Implementation, Real SVG/PNG Assets & Typography
- [x] **Extracted & Self-Hosted All 68 Figma Home Page Assets (`apps/web/public/assets/home/*`)**:
  - Downloaded all SVG and PNG assets from Figma node `178359:16886` (Monologg header/footer logos, 6 hero avatar stacks, iPhone 15 frame & screen mockup, 6 category SVG icons, dashed divider, all 6 `300×300` feature illustrations, FAQ `Plus`/`X` icons, and footer `Backed by` badges).
- [x] **Typography Alignment (`apps/web/src/styles/fonts.css`)**:
  - Loaded `Switzer` (Fontshare) and `Inter Tight` + `Geist Mono` (Google Fonts) in `fonts.css` to render all Figma display, body, and mono styles accurately.
- [x] **1-for-1 `LandingPage.tsx` & `WebsiteFooter.tsx` Implementation**:
  - Rebuilt `LandingPage.tsx` and `WebsiteFooter.tsx` to match every section, spacing, font family/size/weight, and vector asset of `178359:16886` without improvised mockup cards or icon substitutions.
  - Verified `LandingPageHeader.test.tsx` (3/3 passing) and `npx tsc --noEmit` (0 errors).

### Session 180 — Order Room FAANG UX & Information Architecture Overhaul
- [x] **Eliminated Financial & Tab Duplication (`OrderRoom.tsx`)**:
  - Removed the redundant `Payment` tab (`workspaceTab === "escrow"`) and top-bar `Escrow: ₦134,400` / `Take-Home: ₦111,600` pill that duplicated the static right-hand Inspector Rail.
  - Streamlined workspace navigation to two focused tabs: `Messages` and `Brief & Files`.
  - Upgraded the Right-Hand Inspector Rail's Escrow/Payout card (`Fee breakdown` / `Hide math`) with complete line-item totals (`Total deposit` / `You receive`) and Paystack 48h auto-release guarantee note.
  - Scoped the header `Order Info` modal button to mobile/tablet (`lg:hidden`) or when the desktop inspector rail is hidden.
- [x] **Unified Contextual Command Bar & Progressive Disclosure (`OrderRoom.tsx`)**:
  - Merged the Attendance Check-in Gate and Client Google Meet bar into a single unified card container (rendered only on the `Messages` tab) to eliminate stacked top banners.
  - Removed the duplicate `"Check-in 2 of 3 is due on Tue 14 Oct."` system pill from the chat stream and removed the redundant `Order Workspace · ORD-003` divider.
  - Collapsed `Script & Brief Assets` in the right rail by default (`railScriptExpanded = false`).
- [x] **1-on-1 Chat Stream Clean Sweep (`OrderRoom.tsx`)**:
  - Removed redundant `PERFORMER` and `CLIENT` role badges and `"You"` labels from 1-on-1 chat bubbles.
  - Removed self-avatars on outgoing messages and added consecutive message grouping by sender.
- [x] **Quality Gate & Testing (`OrderRoom.test.tsx`)**:
  - Updated `OrderRoom.test.tsx` to verify the streamlined IA and progressive disclosure (9/9 tests passing across `OrderRoom.test.tsx`, `dashboardParity.test.tsx`, and `x3CopyAudit.test.ts`; `npx tsc --noEmit` 0 errors).

### Session 174 — Supabase-First Product Analytics, Delegated Click Tracking & Stakeholder Telemetry
- [x] **Supabase `AnalyticsEvent` Schema & RLS Migration (`schema.prisma`, `20261030101500_add_analytics_events/migration.sql`)**:
  - Added `AnalyticsEvent` model with indexes on `eventName`, `category`, `userId`, and `sessionId` plus RLS append-only insert policy for Supabase client ingestion.
- [x] **Backend Ingestion & Stakeholder Summary Endpoints (`apps/api/src/routes/analytics.ts`, `analytics.test.ts`)**:
  - Built `POST /api/v1/analytics/events` (single/batch ingestion + recursive PII scrubbing) and `GET /api/v1/analytics/summary` (category, role, top events, and conversion funnel aggregation).
- [x] **Unified Frontend Analytics SDK & PostHog Bridge (`apps/web/src/lib/analytics.ts`, `analytics.test.ts`)**:
  - Defined 44+ canonical events across 10 categories in `ANALYTICS_TAXONOMY`, with Supabase direct insert, API fallback, 500-event local ring buffer, and zero-config `window.posthog` forwarding.
- [x] **Global Delegated Click Tracking & Funnel Instrumentation (`Root.tsx`, `state-sync.ts`, `OrderRoom.tsx`)**:
  - Automatic `session_started`, `page_viewed`, `page_leave` (`durationMs`), `theme_toggled`, and delegated `ui_click`/`cta_clicked` capture in `Root.tsx` plus explicit funnel milestones across `state-sync.ts` and `OrderRoom.tsx`.
- [x] **Stakeholder Analytics Reference (`handoff/analytics.md`)**:
  - Documented full taxonomy, KPI dictionary, privacy guardrails, and ready-to-run Supabase SQL queries.

### Session 173 — Order Room UX/UI Overhaul (Upwork / Fiverr / Braintrust Inspired)
- [x] **Slim Progressive-Disclosure Contract Command Bar (`OrderRoom.tsx`)**:
  - Replaced tall stacked attendance and video call cards with a sleek single-row Contract Command Bar (`Gate 2/3`, inline `I'm confirmed` / `Can't make it` buttons, and on-demand `Details` / `Hide Details` toggle for event metadata).
  - Streamlined Client Google Meet prompt into a single-line progressive-disclosure bar (`Launch Google Meet`, `Copy Link`, `Mark Done`, `Dismiss`).
- [x] **Calibrated High-Contrast Purple & Red Chat System (`OrderRoom.tsx`)**:
  - Updated Performer outgoing bubbles to Deep Studio Crimson (`#991B1B` → `#7F1D1D`) and Client outgoing bubbles to Royal Plum (`#5B21B6` → `#4C1D95`) for WCAG AAA legibility without neon glare.
  - Styled incoming bubbles with role-colored 4px left accent bars, sender name + `Performer` / `Client` role badges, and high-contrast white file attachment sub-cards.
- [x] **Responsive 2-Pane Desktop Workspace & Inspector Rail (`OrderRoom.tsx`)**:
  - Added collapsible Right Contextual Inspector Rail (`lg+`) with Counterparty Profile card, Escrow/Net Take-Home summary with expandable fee math, Upwork-style vertical `Activity Timeline`, and collapsible `Script & Brief Assets`.
- [x] **Unified Multi-Row Composer Dock (`OrderRoom.tsx`)**:
  - Integrated `Submit Deliverable` / `Enter Code & Verify` quick-action pills directly inside a unified multi-row composer toolbar and synced the `Send` button color to Performer Red (`#B91C1C`) vs. Client Purple (`#5B21B6`).
- [x] **Quality Gate & Automated Tests (`OrderRoom.test.tsx`, `dashboardParity.test.tsx`)**:
  - Created `OrderRoom.test.tsx` (4/4 passing) and verified `dashboardParity.test.tsx` (4/4 passing) with 0 TypeScript errors.

### Session 172 — Client Project Edit Phase Stepper Unification & Draft Slot Prefill Resumption
- [x] **Client Project Edit Stepper Unification (`ClientDashboard.tsx`)**:
  - Removed disparate inline 4-tile Draft Setup Stepper and all inline section editing forms (`Edit Overview`, `Edit Requirements`, `Edit Script`, `Manage Assets`).
  - Restored clean view mode across Overview, Roles & Requirements, Audition Sides & Script, and Project Assets.
  - Implemented sleek Draft Brief Setup status banner with "Continue Draft Stepper →" CTA (`navigate('/brief?id=...')`).
  - Added "Resume Draft Stepper" in header, "Resume Draft in Stepper" in sidebar Action Center, and "Resume Draft" secondary card action in My Projects list.
- [x] **Draft Slot Prefill & Resumption Stepper (`ProjectBrief.tsx`, `routes.tsx`)**:
  - Added `/brief/:id` routing support alongside `/brief?id=...`.
  - Hydrated all project slots (name, type, format, location, niches, timeline, synopsis, script sides, attached files, applicant cap, budget) from existing draft project.
  - Resumed starting step directly at the user's last saved progress (`draftStep` / `savedStep`).
  - Integrated Audition Sides & Script Excerpt and attached reference files management into Step 3 ("Assets").
  - Implemented persistent "Save Draft" in header and footer across all steps via `appStateSync.saveClientDraft(...)`, redirecting smoothly to `/client`.
- [x] **Type Safety & Data Architecture (`clientProject.ts`, `clientProjects.ts`, `state-sync.ts`)**:
  - Extended `ClientProjectSchema` with optional draft metadata slots.
  - Implemented `getClientProject` and `saveClientDraft` in `StateSyncBus` with local storage persistence and mock boundary re-exports.
- [x] **Quality Gate & Automated Tests**:
  - Updated `ClientDashboard.test.tsx` (17/17 passing) to verify draft status banner and stepper navigation.
  - Added draft prefill, step resumption, and save draft tests in `ProjectBrief.test.tsx` (4/4 passing).
  - Verified 0 type errors across monorepo (`npm run typecheck`) and 720/720 tests passing green (`npm test`).
- [x] **Device Mockup Refresh (`public/auth-performer-device.png`, `public/auth-client-device.png`)**:
  - Replaced device mockup assets on the onboarding/auth desktop hero split-screen (`AuthFlow.tsx`, `auth-preview.html`) with latest user-provided mobile captures.
  - Performer mockup displays updated horizontal quick actions, single "Withdraw Funds" primary CTA, and recent gig activity.
  - Client mockup displays ₦850,000 balance, horizontal quick actions, and project feeds.
- [x] **Quality Gate**:
  - Verified 489x1024 native resolution and transparency; ran `authFlowStress.test.tsx` (5/5 passing).

### Session 170 — Performer Dashboard Horizontal Quick Action Layout Parity
- [x] **Horizontal Quick Action Row Architecture (`TalentDashboard.tsx`)**:
  - Converted Performer quick action cards (`Public Storefront`, `Availability`, `Rate Cards`, `Active Orders`) from vertical column stack to horizontal row layout (`flex items-center gap-2.5 sm:gap-3`).
  - Positioned icon on the left with text (`label` and `sub`) placed beside it horizontally, establishing 100% parity with `ClientDashboard.tsx`.
  - Added `min-w-0 flex-1 truncate` to prevent text distortion on narrow screens.
- [x] **Quality & Regression Check**:
  - Verified 0 typecheck errors; `TalentDashboardAnalytics.test.tsx` passing.

### Session 169 — Dashboard Quick Actions Tag Removal, Mobile Icon+Title Ergonomics, Activity Subtext Pruning & Escrow List Dividers
- [x] **Quick Actions Tag Removal & Mobile Icon+Title Ergonomics (`TalentDashboard.tsx`, `ClientDashboard.tsx`)**:
  - Removed cluttering badges (`Public`, `Sync`, `3 active`) from quick action cards.
  - On mobile screens (`< sm`), hid verbose subtitles (`hidden sm:block`) so cards present cleanly with icon and title only.
- [x] **Hero Balance CTA Simplification (`TalentDashboard.tsx`)**:
  - Removed secondary Analytics button from balance hero card, leaving "Withdraw Funds" as the single primary action.
- [x] **Recent Activity Header Subtext Pruning (`TalentDashboard.tsx`)**:
  - Removed redundant filler text ("Real-time payouts, client bookings, and order updates") below Recent Activity.
- [x] **Escrow Protection & Verification Divider List Layout (`TalentDashboard.tsx`, `ClientDashboard.tsx`)**:
  - Re-architected 3 escrow guarantee boxes into a clean stacked list separated by dividers (`divide-y divide-[var(--color-border-default)] border-t border-[var(--color-border-default)]`).
  - Elevated Casting Client & Escrow Verification telemetry stats with divided container and border separator.
- [x] **Automated Testing & Quality Gate**:
  - Updated `TalentDashboardAnalytics.test.tsx` verifying sole Withdraw CTA, badge-free quick actions, and sidebar analytics routing.
  - Verified 0 type errors across monorepo; 27/27 web tests and 56/56 API tests green (718/718 total tests passing).

### Session 168 — Performer Home Analytics CTA Routing & Header Hierarchy Parity
- [x] **Home Hero Analytics Routing Fix (`TalentDashboard.tsx`)**:
  - Re-routed balance card Analytics button from `setActiveTab("earnings")` to `setActiveTab("analytics")`.
  - Replaced `<BarChart2 />` with `<TrendingUp />` icon to align with the sidebar navigation identity.
  - Added accessible `aria-label="View analytics"` and `aria-label={isNewUser ? "Setup payouts" : "Withdraw funds"}`.
- [x] **Header & Screen Title Hierarchy Harmonization (`TalentDashboard.tsx`)**:
  - Mapped `activeTab === "analytics" ? "Analytics"` in `screenTitle` for the mobile sticky top bar.
  - Added dedicated desktop `<h1>Performance & Analytics</h1>` header and contextual subtitle.
  - Updated desktop `earnings` header title to clean `"Earnings"` (removing legacy `"Earnings & Analytics"` text).
  - Added `lg:hidden` to the inner tab `<h2>` in the Analytics view to avoid double desktop headers.
- [x] **Automated Testing & Validation**:
  - Created `TalentDashboardAnalytics.test.tsx` verifying hero button routing to Analytics and Earnings tabs respectively.
  - Verified `npm run typecheck`: 0 errors monorepo-wide.
  - Verified full test suites: 27/27 web test files (138/138 tests) and 56/56 API test files (580/580 tests) — **718/718 tests passing**.

### Session 167 — Active Orders Screen Header Deduplication, Streamlined Chat Hierarchy & Design Polish
- [x] **Header Deduplication & Information Hierarchy (`TalentDashboard.tsx`, `ClientDashboard.tsx`)**:
  - Removed duplicate `<h2>Active Orders</h2>` and secondary subtexts from the orders tab container.
  - Preserved single canonical desktop `<h1>Active Orders</h1>` and mobile top bar headers.
  - Implemented clean controls toolbar featuring live order count indicator (`3 active orders` / `Showing X of Y orders`), search input, and view toggle.
- [x] **Streamlined Chat / List Row Item Architecture (`TalentDashboard.tsx`, `ClientDashboard.tsx`)**:
  - Enhanced breathing room with `p-4 sm:p-5` padding and generous row spacing.
  - Standardized 44px–48px avatar circles with bottom-right presence indicators.
  - Stripped repetitive boilerplate copy ("Active collaboration room · Tap to chat", "Active room · Tap to chat & review").
  - Replaced technical order IDs with clean project title + format pill badge (`Online` / `Onsite`).
  - Redesigned right-side status column with rounded phase badge pills (`Deliverables`, `Review`, `Cancelled`), subtle due date, and animated chevron arrow (removing clashing "Enter Room >" duplicate colored text).
- [x] **Test & Quality Validation**:
  - Added test suite in `ClientDashboard.test.tsx` verifying single header, clean toolbar, and streamlined list items.
  - Created `TalentDashboardOrders.test.tsx` for performer view parity.
  - Verified `npm run typecheck`: 0 errors.
  - Verified `npm test`: 26/26 web test files passing (136/136 tests).

### Session 166 — Separate-Tab Talent Profile Discovery, 3-Column Escrow Grid & Action Deduplication
- [x] **Separate-Tab Talent Profile Discovery (`ClientDashboard.tsx`, `ClientDashboard.test.tsx`)**:
  - `viewTalentProfile` triggers `window.open('/{slug}?role=client', '_blank')` to launch the talent's storefront in a new tab for deep inspection.
  - Keeps in-modal audition proposal and fast casting controls active in the primary client window.
  - Updated applicant card action CTA with `ExternalLink` icon (`View Profile & Reels ↗`).
  - Added "Open in new tab ↗" shortcut to the Featured Audio / Video Reel header and wired reel preview clicks to open the profile in a new tab.
  - Added unit test assertion in `ClientDashboard.test.tsx` verifying separate-tab window launch.
- [x] **Resilient Public Storefront Handle Resolution (`api-client.ts`)**:
  - Normalized mock handle lookup to strip `seed-creator-` prefixes, match alphanumeric slugs, and match case-insensitive name fragments.
- [x] **Responsive 3-Column Escrow Layout (`TalentDashboard.tsx`)**:
  - Converted the Escrow Protection & Settlement Guarantee card from 3 vertically stacked boxes into a clean 3-column horizontal grid (`grid grid-cols-1 md:grid-cols-3 gap-3`).
  - Slashes over 400px of scrolling while maintaining all 3 trust pillars (`1. Locked Upfront`, `2. 48h Auto-Release`, `3. Direct Payout`).
- [x] **Information Hierarchy & Sidebar Deduplication (`TalentDashboard.tsx`, `ClientDashboard.tsx`)**:
  - Shortened tab label `My Application & Pitch` to `My Application` with status badge to prevent tab bar overflow.
  - Suppressed pre-application capacity stats (`Applicant Capacity 8/10 filled`) in performer sidebar once application is submitted.
  - Condensed client sidebar escrow box into an elegant 1-line trust pill (`100% Escrow Protected · 24/7 Casting Concierge`).
  - Streamlined on-site gig instructions to only show check-in code guidance when physical attendance is required.
- [x] **Application Withdrawal 2-Step Safety Confirmation (`TalentDashboard.tsx`)**:
  - Replaced immediate unconfirmed withdrawal action with a safe 2-step confirmation dialog to prevent accidental pitch deletion.
- [x] **Test & Quality Validation**:
  - Verified `npm run typecheck`: 0 errors.
  - Verified full test suite: 25/25 web test files (132/132 tests passing), 56/56 api test files (580/580 tests passing) — **712/712 total tests passing**.

### Session 165 — FAANG UX/UI Project Details Redesign & Client/Performer Flow Symmetry
- [x] **Quick Demo Links Restored (`AuthFlow.tsx`, `auth-preview.html`)**:
  - Restored clean 1-click Performer & Client demo access buttons on both login and register screens.
- [x] **Performer Project Detail Harmonization (`TalentDashboard.tsx`)**:
  - Replaced stacked cards with 5 segmented tabs (`overview`, `requirements`, `sides`, `escrow`, `application`).
  - Added dedicated **Project Format & Production Details** card (Format [Online vs On-site], Location, Timeline, Escrow).
  - Merged Audition Sides and Project Reference Files; dropped fake hardcoded deliverables.
  - Added spacious, dedicated "My Application & Pitch" review tab for applied projects.
  - Pruned redundant sidebar blocks to create a clean, sticky client info overview.
- [x] **Client Project Detail Harmonization (`ClientDashboard.tsx`)**:
  - Replaced 7 stacked vertical cards with matching 5 segmented tabs (`applicants`, `overview`, `requirements`, `sides`, `escrow`).
  - `applicants` default for active/in-progress projects for immediate casting actions without scrolling.
  - Added dedicated **Project Format & Production Details** card matching the performer view.
  - Merged Audition Sides and Project Assets in Tab 4 (`sides`) with zero fake deliverables.
  - Preserved contract escrow integrity: locked inline editing to `currentStatus === "draft"`.
  - Updated Draft Stepper into 4 clickable tiles (`Overview`, `Roles`, `Audition Sides`, `Materials`) switching tabs directly.
  - Wired Action Center CTAs ("Review Applicants", "Edit Brief Info") to active tab state.
- [x] **Test & Quality Validation**:
  - Updated `ClientDashboard.test.tsx` to validate tabbed flow and real brief fields.
  - Verified `npm run typecheck`: 0 errors.
  - Verified full test suite: 25/25 web files (132/132 tests), 56/56 api files (580/580 tests) — **712/712 tests passing cleanly**.

### Session 164 — Order Room Header Simplification, Card Minimization & Scalable Chat/Inbox Orders Interface
- [x] **Order Room Header Simplification (`OrderRoom.tsx`)**:
  - Pruned secondary subtitle row (`clientName · orderId · ₦X net/escrow`).
  - Preserved only project title and `Online` / `Onsite` badge, making badge visible on all screen sizes (`inline-flex`).
- [x] **Attendance & Confirmation Card Minimization**:
  - Added minimize button (`Minus` icon) to pending and confirmed attendance check-in cards in `OrderRoom.tsx`.
  - Added minimize button (`Minus` icon) to the top check-in card in `TalentDashboard.tsx`.
  - Collapses cards into a sleek 1-line ribbon with quick `Confirm` and `Expand` actions.
  - Removed redundant `Base ₦...` subtext from the dashboard card.
- [x] **Scalable Chat / Inbox Orders Interface (`TalentDashboard.tsx` & `ClientDashboard.tsx`)**:
  - Re-engineered Active Orders from tall stacked cards into a compact, scalable chat/inbox list capable of scaling to 10–20+ order rooms without infinite scrolling.
  - Added counterpart avatar with initials and active collaboration presence indicator dot.
  - Displayed project title, `Online` / `Onsite` badge, order ID, counterpart snippet, due date, and phase badge.
  - Pruned redundant fee calculation / discount breakdown (`Base ₦X · 7% platform fee (-₦Y)`).
  - Integrated real-time Search filter bar and View Mode switcher (Chat List [default] vs Detailed Cards).
- [x] **Automated Test & Type Validation**:
  - Verified full test suite: 25/25 files (132/132 tests passing cleanly).
  - Verified typecheck: 0 errors across all 3 workspace projects.

### Session 163 — Auth Flow 100vh Static Height Lock, Light/Dark Mode Contrast & Element Pruning
- [x] **Light & Dark Mode Copy Color & Contrast Enhancement**:
  - Showcase Subtitle: Explicit `#475569` in light mode, `rgba(255, 255, 255, 0.70)` in dark mode.
  - Showcase Headline: Deep obsidian `#09090b` in light mode, pure crisp `#FFFFFF` in dark mode.
  - Backdrop Clouds: Dynamically modulated to `opacity-15 mix-blend-overlay` in dark mode (preventing washed-out background) and `opacity-90` in light mode.
- [x] **Fixed & Static 100vh Viewport Height**:
  - Container locked to `h-screen h-[100dvh] max-h-screen w-full overflow-hidden`.
  - Both split panes locked to `h-full max-h-screen overflow-hidden` with zero window scrolling.
- [x] **Pruned Non-Essential Elements**:
  - Removed bottom footer (`© 2026 Monologg Privacy Terms`) to save 60px+ vertical height.
  - Removed top `< Back` buttons on Register and Login views, utilizing standard switch links.
  - Removed redundant quick demo rows from splash and login forms.
- [x] **Automated Test Validation**:
  - Verified full test suite: 25/25 files (132/132 tests passing cleanly).
  - Verified typecheck: 0 errors across all 3 workspace projects.
  - Verified production build: completed in 2.59s with 0 errors.

### Session 162 — Full-Bleed 16-Inch Responsive Auth Redesign with Cropped Editorial Device Showcase
- [x] **High-Resolution Device Mockup Integration**:
  - Replaced device mockup assets with user's crisp high-resolution screenshots: `auth-performer-device.png` and `auth-client-device.png`.
  - Added ambient atmospheric sky overlay: `auth-backdrop.png`.
- [x] **Full-Bleed 16-Inch Responsive Split Layout (`AuthFlow.tsx`)**:
  - Overhauled container into a responsive split grid (`min-h-screen w-full flex flex-col lg:grid lg:grid-cols-[1fr_1.25fr]`) spanning full viewport width without letterboxing on 16-inch displays.
- [x] **Cropped Editorial Device Presentation**:
  - Locked aspect ratio strictly to `489 / 1024` with `object-contain` to eliminate device squashing.
  - Positioned the device grounded at the bottom with `translate-y-[200px]` for the cropped editorial visual vibe.
  - Removed artificial CSS `filter: drop-shadow(...)` halo, preserving natural chassis edges against the ambient gradient.
- [x] **Harmonized Pill Input Ergonomics & Role Styling**:
  - Standardized all text, email, password, and code inputs to pill shapes (`rounded-full h-12`).
  - Aligned action buttons to native role brand colors (`#F13030` Performer-red and `#7B00FE` Client-purple).
  - Maintained Google OAuth, terms links, and demo switchers.
- [x] **Unhighlighted Casual Flow Editorial Copy**:
  - Client POV: `Lets help you` / `Find performers, Finish your project`
  - Performer POV: `lets help you` / `Find gigs, finish your project`
- [x] **Seamless Mobile Degradation**:
  - Hid showcase pane on mobile screens (`hidden lg:flex`), allowing the auth form to expand cleanly with centered thumb ergonomics.
- [x] **Automated Test & Typecheck Validation**:
  - Verified `AuthFlow.test.tsx` and `authFlowStress.test.tsx`.
  - Validated full test suite: 25/25 files (132/132 tests passing cleanly).
  - Validated typecheck: 0 errors across all 3 workspace projects.

### Session 161 — Tranche 3: System & Marketing Surfaces FAANG Mobile Responsiveness & Layout Refinement
- [x] **Transaction & Earnings Ledger Polish (`TransactionHistory.tsx`)**:
  - Resolved 360px top bar collision: added `min-w-0 flex-1 pr-2 truncate` to title container, responsive title microcopy (`Transactions` on mobile vs full title on desktop), and condensed badge to `Verified` on mobile.
  - Scaled hero balance font size (`text-2xl min-[400px]:text-3xl sm:text-4xl`) and enabled edge-to-edge category chips scrolling (`-mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none`).
  - Added `max-h-[90vh] overflow-y-auto` and `p-5 sm:p-6` to Withdrawal, Safeguard Gate, and Success confirmation modals; removed rigid `whitespace-nowrap` on SLA notices and made action buttons ergonomic (`min-h-[44px]`).
- [x] **Account Settings & KYC Management (`Settings.tsx`)**:
  - Added `min-w-0 flex-1` and `truncate` to sticky section title in settings header.
  - Refactored Personal Details intro card to responsive flex direction with full-width button on mobile.
  - Refined craft category buttons (`min-h-[96px] sm:min-h-[110px] p-3 sm:p-4`) with scaled icons (`w-6 h-6 sm:w-7 sm:h-7`).
  - Converted bank editing buttons to `flex-col sm:flex-row` with full-width buttons.
  - Added `max-h-[90vh] overflow-y-auto` and `p-5 sm:p-6` to Add Card, Share, and Delete Account modals; adjusted live credit card preview tracking for small phone screens.
- [x] **Public Performer Storefront (`PublicStorefront.tsx`)**:
  - Streamlined visitor header actions (`px-4 sm:px-5`), condensed "Share" to icon-only on mobile with `aria-label="Share profile link"`, hid secondary "Sign In" on mobile while elevating "Join Free".
  - Adjusted avatar size (`w-20 h-20 sm:w-28 sm:h-28`), cover banner height (`h-36 sm:h-52`), and made "Share Profile" a full-width mobile button.
  - Enhanced rate card "Book Now" buttons with minimum 44px touch targets (`min-h-[44px] h-11 sm:h-10`).
- [x] **Platform Landing Page (`LandingPage.tsx`)**:
  - Adjusted sticky header padding (`px-4 sm:px-6 md:px-16`) and CTA microcopy (`Get Started` on mobile vs `Create Your Profile`).
  - Fluidly scaled oversized headline (`text-[36px] min-[400px]:text-[46px] sm:text-[72px] md:text-[96px] leading-[0.94]`).
  - Optimized Escrow Calculator card padding (`p-4 min-[400px]:p-6 md:p-8`), currency dropdown, and input widths.
  - Harmonized section vertical paddings (`py-16 sm:py-24`) and made conversion CTAs full-width on mobile.
- [x] **Automated Test Validation**:
  - Validated `TransactionHistory.test.tsx` (9/9 passed).
  - Validated `Settings.test.tsx` (14/14 passed).
  - Validated `PublicStorefront.test.tsx` (5/5 passed).
  - Validated `LandingPageHeader.test.tsx` (3/3 passed).
  - Validated full test suite: 25/25 files (132/132 tests passing cleanly).
  - Validated typecheck: 0 errors.

### Session 160 — Tranche 2: Booking & Checkout Wizards FAANG Mobile Responsiveness & Stepper Adaptation
- [x] **Client Project Brief Wizard Mobile Polish (`ProjectBrief.tsx`)**:
  - Optimized bottom sticky CTA bar microcopy on mobile (`Continue` vs `Continue to Budget & Payment`, `Pay ₦X` vs `Pay ₦X with Paystack`, `Publish` vs `Publish Project`) preventing 3-line wrapping.
  - Made Timeline and Location grid responsive (`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4`).
- [x] **Client Checkout Sheet Mobile Polish (`Checkout.tsx`)**:
  - Condensed header progress subtitle to `<span className="sm:hidden">Escrow Protected</span>`.
  - Expanded candidate slot hours grid to `grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6`.
  - Added responsive microcopy for Step 1 review button, Paystack button, and encryption footnote.
- [x] **External Visitor Booking Entry Stepper & Wizard Overhaul (`ExternalBookingEntry.tsx`)**:
  - Overhauled 4-step stepper with `mobileLabel` values (`Slot`, `Brief`, `Agreement`, `Payment`) and responsive node button widths (`w-14 sm:w-20`), eliminating horizontal overflow.
  - Added responsive microcopy across all 4 steps with canonical `aria-label` attributes (`Continue to Project Brief` $\rightarrow$ `Continue`, `Continue to Contact & Agreement` $\rightarrow$ `Continue to Agreement`, `Pay ₦X with Paystack` $\rightarrow$ `Pay ₦X`, `Confirm & Deposit ₦X` $\rightarrow$ `Deposit ₦X`).
  - Condensed security footnote to `256-bit SSL · Paystack Escrow` on mobile.
- [x] **Automated Test Validation**:
  - Validated `ProjectBrief.test.tsx` (2/2 passed) and `ExternalBookingEntry.test.tsx` (2/2 passed).
  - Validated full test suite: 25/25 files (132/132 tests passing cleanly).
  - Validated typecheck: 0 errors.

### Session 159 — Tranche 1: Core Workspaces & Dashboards FAANG Mobile Responsiveness & Progressive Disclosure
- [x] **Order Room Mobile Workspace Overhaul (`OrderRoom.tsx`)**:
  - Implemented responsive truncation for project title (`max-w-[130px] xs:max-w-[190px] sm:max-w-none`) and condensed order ID metadata on `< sm`.
  - Added progressive disclosure toggle (`checkinDetailsExpanded`, "Details" / "Hide") for pending attendance verification card, collapsing multi-column event cards by default on mobile to reveal chat feed.
  - Streamlined Google Meet banner padding and copy, with responsive action CTA microcopy (`Launch Google Meet` on desktop, `Launch Meet` on mobile with accessible `aria-label`).
  - Optimized 4-digit PIN verification boxes and modal padding for small mobile viewports (360px–390px).
- [x] **Performer Command Center Mobile Polish (`TalentDashboard.tsx`)**:
  - Refined mobile top bar padding, truncation, and icon-only demo toggle pill on `< sm`.
  - Shortened "Escrow Protected Payouts" badge to "Protected" on mobile.
  - Adapted "Withdraw Funds" and "Analytics" CTAs to full-width flex items on mobile for thumb ergonomics.
- [x] **Client Executive Command Center Mobile Polish (`ClientDashboard.tsx`)**:
  - Refined mobile top bar padding, truncation, and compact demo toggle.
  - Shortened "Paystack Secured" badge to "Secured" on mobile.
  - Expanded "Fund Wallet" CTA to full width on mobile viewports.
- [x] **FAANG Notification Center Mobile Adaptation (`NotificationCenterModal.tsx`)**:
  - Set drawer to fluid full-width on mobile (`w-full max-w-full sm:max-w-md md:max-w-lg`).
  - Condensed "Mark all as read" button to "Mark all" on mobile.
  - Applied `scrollbar-none` to horizontal category filter pills.
- [x] **Automated Test Validation**:
  - Validated `dashboardParity.test.tsx` (4/4 passing).
  - Validated all 25 web test files (132/132 tests passing cleanly).

### Session 158 — Backend User Profile Activity Tracking, Google Info Sync, Onboarding Progress Resumption & FAANG UX Notification Center
- [x] **Backend User Activity Tracking & Profile Enrichment (`authSupabase.ts`)**:
  - Integrated `logActivity` from `services/activity.ts` into `/session/sync` endpoint.
  - Automatically writes `ACCOUNT_REGISTERED` and `USER_LOGGED_IN` activities with IP, user-agent, and auth provider.
  - Automatically synchronizes Google name and avatar to `Creator` and `Client` profiles on login.
  - Returns `name`, `avatarUrl`, and `isNewUser` in `/session/sync` response.
- [x] **Onboarding Draft Persistence & Progress Resumption**:
  - Extended `AuthUser` in `api-client.ts` with `name` and `avatarUrl`.
  - Added draft storage and restoration in `CreatorOnboarding.tsx` (`monologg_creator_onboarding_draft`).
  - Added draft storage and restoration in `ClientOnboarding.tsx` (`monologg_client_onboarding_draft`).
  - Updated `AuthCallback.tsx` to detect in-progress drafts and route users back to onboarding to resume.
- [x] **FAANG UX Notification Center (`NotificationCenterModal.tsx`)**:
  - Built slide-out drawer with blur backdrop, spring animations, and theme-adaptive tokens.
  - Category filtering tabs: `All`, `Action Required` (with badge), `Order Room`, `Escrow & Payments`, `Applications/Casting`, `System`.
  - Unread toggle filter (`Filter` button).
  - Rich notification cards with actor avatars, role chips, timestamps, timeline context boxes, and Naira amounts.
  - Inline action CTA buttons (`Review Deliverable`, `Review Audition`, `View Escrow Ledger`, `Join Google Meet ↗`).
  - Integrated into both `ClientDashboard.tsx` and `TalentDashboard.tsx`.
- [x] **Automated Test Validation**:
  - Validated typecheck (0 errors across `packages/types`, `apps/api`, `apps/web`).
  - Validated 25 web test files (132/132 tests) and 56 API test files (580/580 tests).

### Session 157 — Google OAuth Flow Resolution: PKCE Code Exchange, CSRF State Fix & Resilient Role Routing
- [x] **Supabase GoTrue CSRF State Clean-Up (`AuthFlow.tsx`)**:
  - Removed `queryParams: { state: ... }` override from `signInWithOAuth` call to preserve Supabase's internal CSRF/PKCE correlation tokens.
  - Passed `userType` directly in `redirectTo` (`${appUrl}/auth/callback?userType=${userTypeParam}`).
  - Added localStorage role caching (`monologg_oauth_role`) as a defensive fallback.
- [x] **Authorization Code Exchange & Error Handling (`AuthCallback.tsx`)**:
  - Added explicit check for URL OAuth error params (`error_description` / `error`) with actionable user-facing messages.
  - Implemented PKCE authorization code exchange via `supabase.auth.exchangeCodeForSession(code)` when `getSession()` does not yield an active session on mount.
  - Fallback role retrieval from `localStorage` if URL query parameter is absent.
  - Expanded Google metadata parsing to support `given_name` + `family_name` combinations.
- [x] **Automated Test Validation**:
  - Added 4 unit tests in `AuthCallback.test.tsx` (11/11 passing).
  - Validated typecheck (0 errors across `packages/types`, `apps/api`, `apps/web`).
  - Validated 25 web test files (132/132 tests) and 56 API test files (580/580 tests).

### Session 156 — Client & Performer Wallet Balance Hero Simplification with Show/Hide Toggle
- [x] **Client Portal Wallet Balance Simplification (`ClientDashboard.tsx`)**:
  - Replaced title `WALLET & ESCROW BALANCE` with `Wallet Balance`.
  - Added interactive show/hide icon toggle (`Eye` / `EyeOff`) that masks balance as `••••••••`.
  - Restricted hero CTAs strictly to `+ Fund Wallet` (removed `Escrow Ledger`).
  - Purged redundant secondary metrics (right 3 telemetry cards and available/escrow locked chips) into a clean, focused executive hero.
- [x] **Performer Portal Available Balance Simplification (`TalentDashboard.tsx`)**:
  - Kept title `Available Balance` with pulse indicator and added interactive show/hide icon toggle (`Eye` / `EyeOff`) to mask balance.
  - Kept `Withdraw Funds` and `Analytics` action CTAs.
  - Removed bottom 3 sub-metric cards (`In Active Escrow`, `Completed Bookings`, `Platform Trust Rating`) and trend subtitle line.
- [x] **Automated Test Validation**:
  - Validated typecheck (0 errors) and all 25 web test files (128/128 tests passing).

### Session 155 — Dark Mode Text Accessibility, Client Analytics Performer Parity, and Filter Modal Dialog
- [x] **Dark Mode Text Accessibility in Order Room Modals (`OrderRoom.tsx`)**:
  - Fixed white-on-white text contrast failure when typing in textarea fields in dark mode.
  - Added theme-adaptive classes (`dark:bg-[#18181b] dark:border-zinc-800 dark:text-zinc-100`) across all modals: Dispute modal, Decline modal, Submit Deliverable modal, Release Payment modal, Request Revision modal, and Order Details modal.
  - Explicitly styled textareas (`border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500`).
  - Upgraded Dispute submit CTA to high-contrast red (`bg-red-600 hover:bg-red-700 text-white font-semibold`).
  - Fixed review rating textareas and onsite PIN code boxes for dark mode parity.
- [x] **Client Analytics Metric Cards Parity (`ClientDashboard.tsx`)**:
  - Re-styled the 4 analytics metric cards to match the Performer's cards layout, padding, header/icon-pill, and typography (Image 3).
  - Configured top-right icon pills: CreditCard ("Total spend till date"), CheckCircle2 ("Total successful projects"), Users ("Repeat talent rate").
- [x] **Clickable Average Rating & Client Reviews Modal (`ClientDashboard.tsx`)**:
  - Configured "Average rating" card with interactive `Reviews >` pill button.
  - Added `showClientReviewsModal` displaying 3 statistical summary pillars (Total Reviews, Average Rating with 5-star cluster, and Rating Distribution breakdown).
  - Displayed 4 verified performer reviews with avatar initials, craft roles, timestamps, and authentic testimonials.
- [x] **Removed Bottom Performance Type Chips (`ClientDashboard.tsx`)**:
  - Removed redundant `NICHES.map(...)` chip buttons below the filter button.
- [x] **Talent Discovery Filter Modal Dialog (`ClientDashboard.tsx`)**:
  - Converted the inline filter accordion into a centered `<Modal strength="strong">` dialog matching Image 5.
  - Structured filters cleanly: Craft Role / Category, Budget Rate Card Slider, Gender, Age Range, and Location.
  - Retained "Clear attribute filters" and "Show Performers ({filteredTalents.length})" actions.
- [x] **Automated Test Validation**:
  - Validated typecheck (0 errors) and all 25 web test files (128/128 tests passing).

### Session 154 — Streamlined Booking Header, Client Portal External Booking Alignment, and Filter Attributes Cleanup
- [x] **Streamlined Booking Entry Header (`ExternalBookingEntry.tsx`)**:
  - Removed green escrow chip pill and right creator identity chip on Step 1, leaving only clean `<h1>Book {creator?.name}</h1>` and subtitle `<p>Select your event date and preferred performer time slot.</p>`.
  - Harmonized typography and header copy across steps 1 through 5.
- [x] **Client Role Booking Alignment (`ExternalBookingEntry.tsx`)**:
  - Detected `isClient = searchParams.get("role") === "client"`.
  - Prefilled registered client contact identity (`name`, `email`, `phone`).
  - Step 3 displays only the `Service agreement & escrow terms` card for clients (contact form hidden), with mandatory agreement checkbox.
  - Step label updated to `Agreement` (stepper) and `Continue to Agreement` (Step 2 CTA button).
  - Step 5 hides guest account creation card for clients and provides direct CTA plus auto-redirect to `/order/:id?role=client`.
- [x] **Discovery Filters Cleanup (`ClientDashboard.tsx`)**:
  - Removed physical attributes: Height, Build, Complexion, Hair.
  - Retained clean filter set: Category / Craft Role, Budget Rate Card Slider (`₦0` to `₦150k+`), Gender (`genderPresentation`: MASCULINE, FEMININE, ANDROGYNOUS, NON_BINARY), Age Range, and Location.
  - Updated `ClientDashboard.test.tsx` assertions to validate Gender / MASCULINE filter queries.
- [x] **External Profile Navigation (`ClientDashboard.tsx`, `PublicStorefront.tsx`, `api-client.ts`)**:
  - Performer card click in Find Performers and Shortlist opens public profile in new window/tab (`window.open('/' + talent.id + '?role=client', '_blank')`).
  - Forwarded `role=client` from `PublicStorefront.tsx` Book Now into `/book/:creatorId`.
  - Expanded mock resolution in `api-client.ts` to support all performers in `mocks.TALENTS`.
  - Added vitest test in `ExternalBookingEntry.test.tsx` covering the client booking flow.

### Session 153 — External Booking Entry Stepper Precision Alignment, Progress Bar Overflow Bug Fix, and High-Trust Escrow Header Visual Upgrade
- [x] **Stepper Precision Layout Architecture (`ExternalBookingEntry.tsx`)**:
  - Replaced absolute positioned track (`left-8 right-8` with container percentage width) with flex-based segmented connector bars rendered strictly between adjacent steps (`index < STEP_ITEMS.length - 1`).
  - Fixed progress bar overflow bug where line extended to the left of Step 1 and overshot significantly past Step 4.
  - Connector bars now span perfectly from circle `index` to circle `index + 1` with `mt-[13px] sm:mt-[15px]` vertical alignment to circle equator.
  - Preserved glowing halo ring on active step (`ring-4 ring-[var(--color-accent-soft)] ring-offset-2`) matching user screenshot reference.
  - Preserved solid brand circle with `Check` icon on completed steps with 300ms ease transitions.
  - Formatted step labels below nodes with refined tracking and status-driven color hierarchy.
- [x] **Circular Back Button Polish (`ExternalBookingEntry.tsx`)**:
  - Upgraded back button to a refined circular surface (`bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800`), crisp hairline border, and interactive scale states.
- [x] **High-Trust Escrow Header & Performer Identity (`ExternalBookingEntry.tsx`)**:
  - Elevated bare text escrow badge into a bank-grade trust badge with pulsing emerald indicator and milestone protection note (`Escrow protected booking · 100% Milestone-Gated`).
  - Added desktop Performer Identity Chip with avatar initial, verified badge shield, and craft category.
  - Preserved exact text strings for 100% vitest suite compatibility (`Book {creator?.name}`, `Select your event date and preferred performer time slot.`, `Continue to Project Brief`).

### Session 152 — Client Webapp 5-Screen Executive Polish & Modernization
- [x] **Screen 1: Dashboard Home Overview & Executive Wallet Hero (`ClientDashboard.tsx`)**:
  - Replaced plain purple block with Executive Financial Command Center (`bg-gradient-to-br from-[#1C0E35] via-[#2A1052] to-[#150727]`) featuring Paystack Secured badge, large `₦450,000` balance, dual balance chips (Available vs Escrow Locked), Fund Wallet CTA, and 3 glassmorphic telemetry cards (Active Briefs, Cast Talent, 100% Protected).
  - Upgraded Client Onboarding & Action Nudges card with progress tracker, step counter, active client badge, and 4 hover-elevated tiles.
  - Rebuilt Quick Actions as an integrated 4-card Quick-Action Hub Bar with soft icon containers and descriptive subtitles.
  - Modernized Recent Activity feed with semantic icon surfaces and subtle hover animations.
- [x] **Screen 2: Performer Profile Quick-View Modal (`ClientDashboard.tsx`)**:
  - Replaced flat header banner with studio mesh gradient, ambient lighting, and circular frosted close button.
  - Upgraded creator identity with formatted stage handle (`@adaeze.obi`), glowing avatar ring, online status dot, verified shield, and gold star rating pill (`★ 4.9 (48)`).
  - Transformed flat media box into an interactive Studio Audio Console Reel Player with animated dynamic EQ waveform bars, interactive play/pause playback state, showreel metadata badges, and live scrubber.
  - Elevated standard storefront rate cards for "Standard Master" (with 48h delivery pill and WAV specs) and "Rush 24h Turnaround" (with ⚡ Priority badge and expedited delivery specs).
  - Modernized Shortlist and Book Now action buttons.
- [x] **Screen 3: Project Detailed View & Action Center (`ClientDashboard.tsx`)**:
  - Elevated Project Header Banner with editorial typography, niche badges, and live status pills.
  - Polished Draft Setup Stepper with progress indicator ("5/5 Sections Ready") and 5 interactive step tiles with hover lift and emerald ready badges.
  - Transformed Audition Sides into a studio teleprompter reader block with monospace styling and copy confirmation.
  - Enhanced deliverables milestone list and project asset attachments with filetype icons, file sizes, and crisp Preview/Download buttons.
  - Modernized Inactive Casting Pipeline private draft banner and Project Action Center sidebar with prominent escrow figure, capacity meter, and Discard Draft option.
- [x] **Screen 4: Hiring & Budget Analytics (`ClientDashboard.tsx`)**:
  - Elevated 4 KPI Metric Cards ("Total spend till date", "Total successful projects", "Average rating" with gold star, and "Repeat talent rate") with bold display typography, trend subtitles, and hover lift.
  - Modernized Spend Over Time Spline Area Chart with high-contrast header, purple legend chip, smooth gradient fill, clean grid dashed lines, and interactive tooltip hover states.
- [x] **Screen 5: Order Room Client Workspace (`OrderRoom.tsx`)**:
  - Modernized Performer Attendance Verification strip with soft purple badge, due date, bold emerald `₦134,400` escrow figure, and 3 structured event metadata cards.
  - Upgraded Video Introduction Call action banner with soft purple styling, camera icon surface, primary Google Meet button, copy link, and mark as done toggle.
  - Elevated Workspace Tabs with soft pill switcher.
  - Upgraded chat thread with high-contrast purple gradient client bubbles (`bg-gradient-to-br from-[#7B00FE] to-[#6000D0] text-white shadow-md border border-purple-500/30`), frosted file attachment cards, and clean timestamps.
  - Modernized bottom message composer with rounded input, gradient send button, and trust guarantee escrow footer.

### Session 151 — Edit Profile Form Contrast Resolution, Casting Specifications UX Copy Polish, and Order Lifecycle Phase Redundancy Cleanup
- [x] **Edit Profile Details Form Contrast Resolution (`Settings.tsx` & `TalentDashboard.tsx`)**:
  - Upgraded inputs (`Performer Name`, `Stage Title`, `Location`, `Add a new tag`, and 6 social media handles: IG, YT, TT, X, IN, SP) with crisp white/dark background, defined border (`border-zinc-300 dark:border-zinc-700`), high-contrast text, and `shadow-2xs`.
  - Upgraded `Performer Bio & Summary` textarea with high-contrast background and borders.
  - Replaced low-contrast label colors with `text-xs font-bold uppercase tracking-wider mb-1.5 font-body text-zinc-900 dark:text-zinc-100`.
  - Upgraded Availability Status buttons with rich emerald and amber active treatments and crisp contrast inactive states.
  - Upgraded Banner Theme Preset buttons and custom banner upload button with elevated contrast.
- [x] **Casting & Physical Specifications UX Copy Polish (`Settings.tsx`)**:
  - Replaced verbose disclaimer with empowering, concise copy explaining the three privacy controls (Private, Searchable, Public) and performer role matching value.
- [x] **Order Lifecycle Phase Redundancy Cleanup (`TalentDashboard.tsx`, `ClientDashboard.tsx`, `OrderRoom.tsx`, `mocks/orders.ts`)**:
  - Removed redundant "Production Phase" card header and duplicate phase label from active orders in `TalentDashboard.tsx`.
  - Removed obsolete "Briefing" step from the active order progress bar, leaving a clean 3-phase milestone bar: `Deliverables` → `Review` → `Complete` in both `TalentDashboard.tsx` and `ClientDashboard.tsx`.
  - Removed "Briefing" from `PHASES` constant in `OrderRoom.tsx` so the workspace lifecycle is consistently Deliverables, Review & Inspection, and Complete & Payout.
  - Updated `mocks/orders.ts` so `ORD-003` begins in `Deliverables`.

### Session 150 — Client-Performer Feature Parity, Performer Filter UI Alignment, and Client Project Detail Escrow Architecture
- [x] **Performer Filter UI Alignment (`ClientDashboard.tsx`)**:
  - Replaced legacy icon toggle with side-by-side search input and `Filters` button (`SlidersHorizontal className="w-4 h-4"` and active counter badge).
  - Added active filter chips bar displaying removable pills for active Craft, Maximum Rate Card (`Max Rate: ₦...`), and Physical Attributes (`Height`, `Build`, `Complexion`, `Hair`, `Presentation`, `Age`, `Location`) with `Clear all` reset button.
  - Rebuilt expandable Filter Panel with categories for Category/Craft, Maximum Rate Card Slider (0 to ₦150k+), Physical Attributes (`ATTRIBUTE_FILTER_FIELDS`), Demographics (Age Range and Locations), with `Clear attribute filters` reset and `Show Performers ({filteredTalents.length})` CTA.
  - Retained fast-access horizontal scrolling Niche pills for quick one-tap category filtering.
- [x] **Client Project Detailed View Architectural & Typographic Alignment (`ClientDashboard.tsx`)**:
  - Enhanced Project Header Banner with dynamic format telemetry (`Globe` for remote/online vs `MapPin` for on-site), Project Type badge (`Commercial / Brief`), and `100% Escrow Funded` badge.
  - Standardized card headers to `font-display text-base font-bold` (16px) across Creative Brief & Synopsis, Role & Craft Requirements, Audition Sides & Script Excerpt, Deliverables & Licensing Milestones, Project Assets & Reference Files, and Applicant Pipeline & Casting.
  - Standardized narrative body copy and descriptions to `text-sm font-body leading-relaxed` (14px).
  - Enhanced Audition Sides excerpt callout with signature left accent border (`border-l-4 border-l-[var(--color-accent)]`).
  - Integrated **Escrow Protection & Settlement Guarantee (Client POV Vertical Layout)** card:
    - Dedicated left emerald icon surfaces (`Shield`, `Clock`, `CheckCircle2`), step titles (`1. 100% Escrow Protection`, `2. 48h Inspection Window`, `3. Milestone Release Control`), trust badges (`Funded Upfront`, `Review Guarantee`, `Direct Approval`), and client-tailored escrow security copy.

### Session 149 — Vertical Escrow Protection Layout, Project Detail Typographic Scale Standardization, and Performer Projects Tab Cleanup
- [x] **Vertical Escrow Protection & Settlement Guarantee (`TalentDashboard.tsx`)**:
  - Replaced cramped 3-pillar horizontal card grid with a clean vertical stacked card layout (`space-y-3`).
  - Added dedicated emerald icon surfaces for each pillar (`Shield`, `Clock`, `CheckCircle2`), step titles (`1. Locked Upfront`, `2. 48h Auto-Release`, `3. Direct Payout`), and contextual status chips (`100% Funded`, `Guaranteed Window`, `Instant Disbursement`).
  - Full-width narrative descriptions with comfortable readability and consistent typography.
- [x] **Project Detail Typographic Scale Standardization (`TalentDashboard.tsx`)**:
  - Harmonized card headers to `font-display text-base font-bold` (16px) across Creative Brief, Deliverables, Role Requirements, Audition Sides, and Casting Client.
  - Standardized all body text and narrative descriptions to `text-sm font-body leading-relaxed` (14px), removing oversized `text-sm sm:text-base` (16px) and undersized `text-xs` (12px).
  - Aligned script excerpt quote in Audition Sides to `text-sm font-body leading-relaxed`.
  - Standardized Casting Client telemetry values from `text-sm sm:text-base font-bold` to crisp `font-display text-sm font-bold`.
- [x] **Performer Projects Sub-tab Cleanup (`TalentDashboard.tsx`)**:
  - Removed "Search Performers" button from performer portal project navigation tab strip (`Browse Projects` | `My Applications`).
  - Pruned dead directory search state and removed dormant performer search view.

### Session 148 — Submit Deliverable & Live Appearance Verification Overhaul, Financial Metric Semantics, Physical Attributes 2-Column Responsive Layout, and Edit Profile Save Action De-duplication
- [x] **Submit Deliverable Modal (Digital Files Mode - `OrderRoom.tsx`)**:
  - Added drag & drop file upload with visual boundary feedback (`isDraggingFile`).
  - Added rich selected-file card with file type iconography, file size, pulsing green `Ready for delivery` status badge, and `Replace` / `Remove` actions.
  - Corrected inspection window copy: states `₦111,600 net` (after 7% platform fee) auto-releases to balance instead of inaccurate ₦120,000.
- [x] **Verify Live Appearance Modal (Onsite Gig Mode - `OrderRoom.tsx`)**:
  - Built 4 discrete auto-advancing OTP digit boxes with auto-forward, backspace back-navigation, and paste support.
  - Added real-time PIN validation against `CLIENT_GENERATED_PIN` ("4821") with emerald success badge.
  - Eliminated washed-out disabled pink button; implemented clean disabled button state (`bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 cursor-not-allowed`) transitioning to vivid Monologg crimson CTA on verification.
- [x] **Performer Performance & Analytics Tab (`TalentDashboard.tsx`)**:
  - Fixed fintech color semantics: eradicated alarming bright red typography on accumulated positive performer income (`₦1,240,000`) and completed projects (`28`), restoring them to high-contrast neutral text with emerald growth badges.
  - Added subtle top-right telemetry badges (Eye, CheckCircle2, DollarSign) across metric cards.
  - Refined `Reviews →` link hover micro-interactions and changed tooltip total to high-contrast primary text.
- [x] **Physical Attributes Screen (`Settings.tsx`)**:
  - Expanded container to `max-w-4xl` and organized 8 fields into a 2-column responsive layout grouped by *Demographics & Build* and *Appearance & Features*.
  - Replaced ambiguous `P | S | P` buttons with clear segmented controls (`🔒 Priv` · `🔍 Filter` · `🌐 Public`).
  - Elevated consent checkbox card and styled Save Attributes with clean disabled state.
- [x] **Edit Profile / Storefront Editor (`Settings.tsx` & `TalentDashboard.tsx`)**:
  - Eliminated confusing triple-redundant save triggers; standardized on `Save Changes` CTA inside the form and clean header action.
  - Corrected Rate Card prices from alarming red text (`var(--color-accent)`) to high-contrast neutral (`var(--color-text-primary)`).

### Session 147 — Dark Mode Chat Contrast Fix, Project Detail Client Dossier & Escrow Security Overhaul, and Calendar Grid Architecture
- [x] **Order Room Dark Mode Contrast & Message Bubbles (`OrderRoom.tsx`)**:
  - Replaced dark translucent red with solid brand accent (`bg-[#E50914]` / `bg-[#7B00FE]`) and high-contrast `text-white` for sent messages, eliminating black-on-dark-red contrast failure in dark mode.
  - Made incoming messages adapt with high contrast across light (`bg-white text-zinc-900 border-zinc-200`) and dark (`dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700`) modes.
  - High-contrast attachment preview cards with white text and clean hover states.
  - Elevated `Submit Deliverable` CTA into an action button with gradient glow.
- [x] **Project Detail Client Dossier & 3-Pillar Escrow Security Protocol (`TalentDashboard.tsx`)**:
  - Replaced empty dead space in Tab 4 with a rich Verified Casting Client Dossier, 4-metric track record telemetry dock (18 funded projects, 4.9 rating, <2h release speed, 100% escrow secured), and client bio.
  - Built a 3-pillar Escrow Protection & Settlement Guarantee card (100% Upfront, 48h Auto-Release, Direct Payout) and eliminated 3x repetitive mentions of escrow.
  - Modernized right column with bold Net Payout, fee breakdown, and audition spots remaining indicator.
- [x] **Availability Month Calendar Grid Architecture (`TalentDashboard.tsx`)**:
  - Replaced clunky puffy marshmallow day cells with a sleek connected calendar grid container.
  - Added inline month navigation chevrons, days-of-month count, crisp high-contrast day cells, today badge, and interactive legend bar.
- [x] **External Booking Date Availability (`ExternalBookingEntry.tsx`)**:
  - Fixed bug in `checkDateUnavailable` to honor the 'when not today' logic so same-day appointments and tests succeed reliably.

### Session 146 — Comprehensive UI/UX & Visual Hierarchy Overhaul Across Performer Dashboard and Order Room
- [x] **Performer Dashboard Deep Slate Fintech Balance Hero (`TalentDashboard.tsx`)**:
  - Replaced solid bright red hero banner with a modern deep slate / graphite obsidian card with ambient brand red backlight, status pulse dot, and `Escrow Protected Payouts` trust badge.
  - Implemented high-contrast `₦148,000` metric, `+18% vs last month` trend indicator, and tactile `Withdraw Funds` CTA.
  - Added structured sub-metrics breakdown: `In Active Escrow (₦120,000)`, `Completed Bookings (8 projects)`, and `Platform Trust Rating (100% Clean)`.
- [x] **Quick-Action Structured Navigation Dock (`TalentDashboard.tsx`)**:
  - Replaced 4 floating pink ghost circles with a cohesive 4-card navigation dock (`Public Storefront`, `Availability`, `Rate Cards`, `Active Orders`) with hover micro-interactions and contextual status tags.
- [x] **Recent Activity Apple Wallet Feed (`TalentDashboard.tsx`)**:
  - Upgraded transaction rows with contextual colored icon surfaces, clear hierarchy (client, service, timestamp, amount), and interactive hover indicators.
- [x] **Profile Completion Progress Bar (`TalentDashboard.tsx`)**:
  - Replaced plain pink box with an onboarding card featuring an 85% gradient progress bar and clean action button.
- [x] **Orders Tab Order Card Redesign (`TalentDashboard.tsx`)**:
  - Replaced alarming red amount with bold Net Payout (`₦111,600`) and subtle fee note (`Base ₦120,000 · 7% platform fee (-₦8,400)`).
  - Modernized the 4-phase progress tracker into a clean segmented bar (`Briefing` ✓, `Deliverables` Active, `Review`, `Complete`).
  - Integrated attendance gate status into a clean single-row status strip.
- [x] **OrderRoom Progressive Disclosure Attendance Ribbon (`OrderRoom.tsx`)**:
  - Eliminated the 250px vertical block and contradictory "Are you still available?" question on confirmed milestones.
  - Implemented an auto-collapsing status ribbon (height ~42px) with `Attendance Confirmed` badge and interactive `View Details` toggle.
  - Retained clean, high-contrast action card for unconfirmed check-ins.
- [x] **Editorial Creative Brief & Teleprompter Card (`OrderRoom.tsx`)**:
  - Upgraded dialogue script excerpt into a broadcast script reader with estimated read time (~18s), 1-click script copy, polished campaign asset download card, and deliverables specs.

### Session 145 — Comprehensive UI/UX Audit & Sweep Across Client and Performer Web Apps
- [x] **OrderRoom Progressive Disclosure & Layout Balance (`OrderRoom.tsx`)**:
  - Implemented collapsible/minimizable progressive disclosure toggle (`clientIntroCollapsed`) on the Google Meet orientation card for clients.
  - Automatically hidden the orientation card when a booking is cancelled, replacing it with a clean single-row refund notice.
- [x] **Role Perspective Correction in OrderRoom (`OrderRoom.tsx`)**:
  - Replaced the performer availability check-in buttons on the client view with a dedicated, non-interactive "Performer Attendance Status" milestone bar.
  - Dynamically rendered navbar amounts: `₦134,400 in escrow` for client vs `₦111,600 net` for performer.
  - Corrected Release Payment modal copy to "Performer receives ₦111,600" so clients are not told "You receive".
  - Refined side drawer payment breakdown dynamically to show "Escrow deposit summary" for clients (Base + 12% protection fee = ₦134,400) and "Payout summary" for performers (Base - 7% platform fee = ₦111,600).
- [x] **Brief & Files Parity (`OrderRoom.tsx`)**:
  - Added full parity view showing the client's creative brief & scope, full dialogue script with 1-click `Copy Script` button, downloadable campaign assets (`Nike_Campaign_Brief_v2.pdf`), deliverables checklist, and workflow timeline.
- [x] **Decluttering Confirmed Screens (`Checkout.tsx`, `ExternalBookingEntry.tsx`)**:
  - Purged 3+ redundant mentions of "escrow" and verbose run-on paragraphs on the booking confirmed views.
  - Polished FAANG-grade trust signals with a single escrow pill, concise subtitle, and focused Order Room next-step card.
- [x] **Upfront Fee Transparency Across Flow (`Checkout.tsx`, `ExternalBookingEntry.tsx`, `ProjectBrief.tsx`, `LegalPage.tsx`)**:
  - Explicitly stated the dual deduction platform model across all Review & Service Agreement terms: 12% client escrow protection fee added at deposit; 7% performer service fee deducted upon payout.
  - Updated `ProjectBrief.tsx` Step 5 payment card to show Base Budget, 12% Escrow Fee, and Total Escrow Deposit.
- [x] **Testing & Verification**:
  - All 56 test files and 580 tests passed (`npm test` 100% clean).
  - TypeScript compiled with 0 errors (`npx tsc --noEmit`).

### Session 144 — UI/UX Hierarchy Cleanup: OrderRoom, Checkout Confirmation, Workspace Tabs
- [x] Redesigned OrderRoom availability banner, shortened workspace tab labels, and refreshed Checkout confirmation screen.
- [x] **Compact Month Calendar with Navigation (`ExternalBookingEntry.tsx`)**:
  - Replaced the horizontal 10-day strip and date input with a full interactive month calendar card.
  - Month and year navigation header (`October 2026`) with `<` (prev) and `>` (next) buttons (blocking past month navigation).
  - Clear availability legend (`Date available` emerald dot vs `Booked / Unavailable` line-through).
  - 7-column Monday-first week grid with padded blanks. Past days disabled; booked dates (Sundays, 18th, 20th, 25th) marked with strikethrough styling and clicking them triggers the solid `Performer Unavailable` modal.
  - High-contrast selection in Monologg brand red (`#E50914`).
  - Tactile selected date status strip connecting the calendar directly to open performer slots below.
- [x] **Centered Stepper with Extreme-Left Back Arrow (`ExternalBookingEntry.tsx`)**:
  - Omitted back arrow completely on Step 1 since external visitor booking opens in a fresh browser page.
  - On Steps 2–4, pinned back arrow `<` at extreme left (`absolute left-4 top-1/2 -translate-y-1/2`), keeping the 4-step progress stepper centered across the navbar.
- [x] **Confirmed Screen UX & Direct Order Room Routing (`ExternalBookingEntry.tsx`)**:
  - Removed confusing immediate "Launch Google Meet" and "Copy link" buttons from the post-checkout confirmation screen.
  - Clarified that the video intro call takes place inside the dedicated Order Room workspace where a reminder banner is waiting.
  - Provided primary CTA `Enter Order Room` routing directly to `/order/:id?role=client`.
- [x] **Client Google Meet Reminder Banner (`OrderRoom.tsx`)**:
  - Added an interactive introductory call reminder banner at the top of the Order Room for client roles (matching performer check-in style).
  - Includes `Launch Google Meet`, `Copy Link`, and `Mark as Done` status actions with 100% escrow protection reassurance.
- [x] **Testing & Verification**:
  - Updated `dashboardParity.test.tsx` to assert the client Google Meet reminder banner in `OrderRoom`.
  - All 25 test suites passing (127/127 tests) with 0 TypeScript compilation errors.

### Session 142 — External Booking Header & Stepper Line Unification, Step 3 Phone Notification Input & Hierarchy Refinement, and Step 4 Payment 2-Option Selector with Single Unified CTA
- [x] **Single-Row Header & Stepper (`ExternalBookingEntry.tsx`)**:
  - Unified the back navigation button `<` and the 4-step progress stepper onto a single horizontal row (`h-16 flex items-center gap-3 sm:gap-6 px-4 max-w-xl mx-auto`).
  - Purged duplicate second header text row (`Contact & Agreement`, `Payment`, `Escrow Protected Booking`), eliminating redundant titles and saving ~40px of vertical space.
- [x] **Step 1 Direct Performer Booking Heading (`ExternalBookingEntry.tsx`)**:
  - Placed `Book ${creator?.name ?? "Performer"}` with a clean `Escrow protected booking` trust badge directly in the Step 1 view above the date picker.
- [x] **Step 3 Booking Summary Removal & Phone Number Addition (`ExternalBookingEntry.tsx`)**:
  - Removed top booking summary strip (`Emeka Johnson · Standard Booking 2026-10-16 at 00:00 · Online / Remote Total escrow ₦134,400`) from Step 3.
  - Added required `Phone number *` input (`phone` state, placeholder `+234 800 000 0000`, validation requirement, and contextNote compilation) for booking updates and SMS notifications.
  - Refined visual hierarchy: clean `Contact & Agreement` headline, `Your contact details` card, `Service agreement & escrow terms` card, and a single `Proceed to Payment` action button.
- [x] **Step 4 2-Option Payment Selector & Single Unified CTA (`ExternalBookingEntry.tsx`)**:
  - Replaced multi-section clutter with a clean Order Summary card showing total deposit (`₦134,400`) and green `100% Escrow Protected` badge.
  - Built an intuitive 2-option radio selector: `Pay with Card` vs `Pay with Paystack` with active state indicators and contextual subtexts.
  - Dynamically rendered card fields or Paystack channel breakdown depending on active choice.
  - Eliminated competing blue button; provided exactly ONE primary CTA button at the bottom styled in platform brand color: `Pay ₦134,400 with Paystack` or `Confirm & Deposit ₦134,400`.
- [x] **Testing & Verification**:
  - Updated `ExternalBookingEntry.test.tsx` with phone input simulation and validated single CTA button progression.
  - All 126 unit tests passing across all 25 test suites (`npm test`).
  - Clean TypeScript typecheck with 0 errors (`npx tsc --noEmit`).

### Session 141 — External Storefront Booking FAANG UX Sweep: Rate Card Clutter Removal, Solid Modal Background, Step 3 Contact & Agreement, Payment Redundancy Cleanup, No All-Caps Titles, and Confirmed View Redesign
- [x] **Step 1 Clutter Removal (`ExternalBookingEntry.tsx`)**:
  - Removed the rate cards selector row and the Selected Service summary card from Step 1.
  - Dedicated Step 1 exclusively to `Event date` (tactile 10-day availability strip) and `Performer slots` (hour slots grid).
- [x] **Solid Modal Container Background (`ExternalBookingEntry.tsx`)**:
  - Wrapped `Performer Unavailable` modal dialog content in an opaque elevated container (`bg-white dark:bg-zinc-900 border shadow-2xl`) with `onClick={e => e.stopPropagation()}` to prevent backdrop click closure and eliminate text transparency.
- [x] **Contact Information Relocated to Step 3 (`ExternalBookingEntry.tsx`)**:
  - Moved `Your name` and `Email address` fields out of Step 2 (Project Brief) into Step 3.
  - Step 3 is now `Contact & Agreement`, pairing client contact details with the 4-point Service Agreement and mandatory terms checkbox.
- [x] **Redundant Fee Breakdown Formula Removal (`ExternalBookingEntry.tsx`)**:
  - Removed the `Base Rate ₦120,000`, `Escrow Protection Fee (12%) +₦14,400`, `Total Deposit ₦134,400` calculation box from Step 3.
  - Replaced with a clean, high-trust single-line summary with total escrow amount.
- [x] **Payment Redundancy Cleanup (Image 4) (`ExternalBookingEntry.tsx`)**:
  - Eliminated repetitive `₦134,400` tags and redundant escrow badges from Step 4.
  - Cleaned up into an authoritative header, streamlined Paystack gateway trigger (`Pay with Paystack` button opening `PaystackModal`), and direct debit/credit card input form.
- [x] **Confirmed Screen FAANG Redesign (Image 5) (`ExternalBookingEntry.tsx`)**:
  - Eliminated awkward double green border in favor of a crisp, single-ring emerald checkmark badge.
  - Fixed typography whitespace bug (`₦134 , 400` -> `₦134,400`) and removed clashing neon purple/blue colors.
  - Redesigned the Google Meet introduction card with subtle neutral borders, unified button styles, and live copy link feedback.
  - Refined account creation memo and navigation buttons.
- [x] **Purged All-Caps Input Titles (`ExternalBookingEntry.tsx`)**:
  - Converted all input labels and section titles across all steps from all-caps to clean sentence/title case.
- [x] **Testing & Verification**:
  - Updated `ExternalBookingEntry.test.tsx` to validate Step 2 -> Step 3 progression and assertions.
  - All 126 unit tests passing across all 25 test suites (`npm test`).
  - Clean TypeScript typecheck with 0 errors (`npx tsc --noEmit`).

### Session 140 — External Storefront Booking Overhaul, Rate Card Integration, Event Date & Performer Slots Availability with Unavailable Modal, 4-Step Parity Brief & Service Agreement, Image 4 Paystack Checkout, Google Meet Intro Call Prompt, and Redundant Escrow Header Cleanup
- [x] **Rate Card Selection replacing Standard/Rush (`ExternalBookingEntry.tsx`)**:
  - Removed obsolete Standard Booking (₦120,000) / Rush Delivery (₦180,000) toggles.
  - Replaced with performer rate cards selector with live cards, delivery badges, and Selected Service summary card.
- [x] **Event Date & Performer Slots Availability with Modal (`ExternalBookingEntry.tsx`)**:
  - Renamed labels to `EVENT DATE` and `PERFORMER SLOTS`.
  - Added tactile 10-day date strip with active selection, live status badges, and greying out of unavailable dates.
  - Unavailable dates and non-open slots are disabled from selection.
  - Built `Performer Unavailable` modal triggered if user attempts to select an unavailable date or proceed without open slots.
- [x] **Project Brief with Client Creation Parity (`ExternalBookingEntry.tsx`)**:
  - Added Project Name / Campaign Title input.
  - Added Project Format (`Online / Remote` vs `On-site / In-person` with Event Venue / Location input when onsite).
  - Added Project Description textarea matching Image 2.
  - Added drag & drop / click to upload file box for scripts and assets (PDF, DOC, TXT, MP3, MP4 max 50MB) matching Image 2.
  - Added Additional Notes for Performers textarea matching Image 2.
  - Added Your Name and Email Address guest client contact inputs with account setup reassurance.
- [x] **Service Agreement (Review & Agreement — Step 3) (`ExternalBookingEntry.tsx`)**:
  - Clean booking overview card with performer, service, event date, slot, format, venue, and fee breakdown.
  - 4 mandatory protection clauses (Escrow Protection, Performer Verification, Cancellation & Refund Policy, On-Site Attendance) and mandatory agreement checkbox.
- [x] **Redundant Escrow Badge & Duplicate Heading Cleanup (`ExternalBookingEntry.tsx`, `ProjectBrief.tsx`, `Checkout.tsx`)**:
  - Removed duplicate `Review & Agreement` and subtitle from inside the terms card.
  - Removed redundant green `Escrow Protected` card below the terms card across all 3 client booking flows per Image 4 feedback.
- [x] **Escrow Payment with Image 4 Paystack Gateway & Direct Card (`ExternalBookingEntry.tsx`)**:
  - Added blue-bordered Paystack pill button matching Image 4 with `PaystackModal` integration for Card, Bank Transfer, and USSD.
  - Added direct debit/credit card input form for external users who prefer typing card details directly.
- [x] **Google Meet Introduction Call Scheduler Prompt (`ExternalBookingEntry.tsx`)**:
  - Rendered prominent Google Meet card on booking confirmation view with `Launch Google Meet` 1-click button and `Copy Meeting Link` button with copied feedback state.
- [x] **Testing & Validation**:
  - Updated `ExternalBookingEntry.test.tsx` for 4-step flow and Google Meet prompt.
  - All 126 unit tests passing across all 25 test suites (`npm test`).
  - Clean TypeScript compilation with 0 errors (`npx tsc --noEmit`).

### Session 139 — Filter Physical Attributes Removal, Step 1 Brief Description Removal, 5-Step Project Brief with Penultimate Review, and Image 4 Paystack Modal Integration
- [x] **Filter Physical Features & Appearance Removal (`ClientDashboard.tsx`)**:
  - Removed Section 5 ("Physical Features & Appearance": Height, Build, Complexion, Hair) from the performer `More Filters Modal` matching Image 1.
  - Updated the modal subtitle to "Filter by age, gender, budget, and location".
- [x] **Step 1 Project Description Removal (`ProjectBrief.tsx`)**:
  - Removed the duplicate `FormField label="Project Description"` from Step 1 of the brief creation wizard matching Image 2.
  - Retained Project Description on Step 3 (Assets) per Session 138 user request.
- [x] **5-Step Project Brief Wizard with Penultimate Review & Agreement (`ProjectBrief.tsx`, `ProjectBrief.test.tsx`)**:
  - Split brief creation into 5 steps (`STEPS = ["Project Details", "Requirements", "Assets", "Review & Agreement", "Budget & Payment"]`).
  - Placed Review & Agreement on Step 4 as the penultimate step with mandatory terms checkbox (Escrow Protection, Performer Verification, Cancellation & Refund Policy, On-Site Attendance).
  - Placed Budget & Escrow Payment on Step 5 as the final step.
  - Updated test helper `renderAndFillProjectBrief` to step through the 5 steps and verify publish execution.
- [x] **Authentic Paystack Modal & Image 4 UI Integration (`PaystackModal.tsx`, `ProjectBrief.tsx`, `Checkout.tsx`)**:
  - Created authentic `PaystackModal.tsx` supporting Card, Bank Transfer (with copyable virtual Wema Bank account), and USSD shortcodes with processing spinner.
  - Re-styled Paystack payment selector as a blue-bordered pill matching Image 4 (`#0052FF` border, purple shield check icon, bold Paystack, Card/Transfer/USSD subtitle).
  - Integrated `PaystackModal` directly into Step 5 of `ProjectBrief.tsx` and Step 3 of `Checkout.tsx`, enabling clients to pay directly via Paystack and automatically return to finish up with confirmed project publication or booking confirmation.
- [x] **Quality Assurance & Verification**:
  - All 126 unit tests passing across all 25 test suites (`npm test`).
  - Clean TypeScript typecheck with 0 errors (`npx tsc --noEmit`).

### Session 138 — Vercel AlertTriangle Runtime Fix, Badge Tone & Transaction Schema Typing, Dedicated Review Step in Rate Card Checkout, and Project Description on Assets Step
- [x] **Vercel Crash Fix & TypeScript Strict Type Resolution**:
  - Added `AlertTriangle` to `lucide-react` imports in `TalentDashboard.tsx`, fixing runtime `ReferenceError: AlertTriangle is not defined` on Vercel deployment.
  - Replaced unsupported `tone="danger"` with `tone="error"` in `TalentDashboard.tsx` and `OrderRoom.tsx` (lines 761, 859).
  - Fixed `direction: "refund"` in `state-sync.ts:444` to valid `direction: "payment"` with `state: "REFUNDED"`.
  - Verified `npx tsc --noEmit` exits with 0 errors.
- [x] **Dedicated Review & Agreement Step in Rate Card Booking Flow (`Checkout.tsx`)**:
  - Expanded `CheckoutStep` union with `"review"`.
  - Added 3-step progress bar in header: `Booking Details` -> `Review & Agreement` -> `Payment`.
  - Transformed `summary` CTA into `"Continue to Review & Agreement"`.
  - Built dedicated `review` step with:
    - Booking overview recap card (performer details, delivery, total escrow, campaign title, format, venue, funding method).
    - Review & Agreement card with 4 mandatory protection clauses and agreement checkbox.
    - Escrow Protection trust banner.
    - Insufficient wallet balance alert with quick fund button.
    - Conditional CTA: `"Authorize & Pay ... from Wallet"` (instant debit) or `"Proceed to Card Payment"`.
    - Integrated bidirectional back navigation (`payment` -> `review` -> `summary`).
- [x] **Project Description on Assets Page (`ProjectBrief.tsx`)**:
  - In Step 3 (Assets), added `FormField label="Project Description"` with responsive textarea matching the provided UI reference.
  - Kept state synchronized with `description` across both Step 1 and Step 3.
- [x] **Withdrawal PIN Modal UI Polish (`TalentDashboard.tsx`)**:
  - Modal title updated to `"Input PIN"` on passcode step.
  - Removed redundant lock icon and sub-heading.
  - Standardized PIN input height/size (`h-11`) with consistent fonts, tracking, and button sizes.
- [x] **Availability Check-in Carousel & Auto-Refund Decline Flow (`TalentDashboard.tsx`, `OrderRoom.tsx`, `state-sync.ts`)**:
  - Added left/right milestone switcher arrows (`<ChevronLeft>` and `<ChevronRight>`) to cycle between 14-day/Booked, 7-day, and 2-day check-in milestones for easy demoing.
  - Performer decline flow: when performer clicks "I can't make it" and confirms decline, booking is cancelled immediately.
  - Auto-refund: credited ₦120,000 back to the client's Monologg wallet balance automatically.
  - Notification & chat dispatch: automated cancellation message sent to client and recorded in order chat feed.
  - Order status reflects `Cancelled & Refunded` across check-in banner, header badges, active orders, and Order Room.
- [x] **Client Project Creation Format, Escrow Funding Source & Agreement (`ProjectBrief.tsx`, `ProjectBrief.test.tsx`)**:
  - Step 1: Added project format selector (`Online / Remote` vs `On-site / In-person` with venue/city location input when onsite).
  - Step 4: Added funding source selector (`Monologg Wallet Balance` vs `Paystack Card`) with live balance check and insufficient funds alert banner.
  - Added quick "+ Fund Wallet" Paystack modal with preset chips (`₦50,000`, `₦100,000`, `₦200,000`).
  - Added mandatory 4-clause Review & Agreement card with required checkbox:
    - Escrow Protection (100% held securely in Paystack escrow)
    - Performer Verification (3 separate check-ins)
    - Cancellation & Refund Policy (refund minus capped NGN 5,000 fee)
    - On-Site Attendance (4-digit verification code)
    - `[ ] I agree to the Terms of Service, Escrow Policy, and Processing Fee Terms. (Mandatory)`
  - Wallet balance deducted upon project publish if wallet funding selected.
- [x] **Rate Card Booking Streamlined Project Details & Review Agreement (`Checkout.tsx`)**:
  - Added streamlined project details collection (Title, Online/Onsite, Venue, Notes).
  - Added funding source selection (`Wallet Balance` vs `Paystack Card`) with insufficient balance check and quick fund modal.
  - Added mandatory 4-clause Review & Agreement card with required checkbox.
  - Instant direct wallet payment flow with escrow confirmation.
  - Enabled searching talents and booking their rate cards directly within `TalentDashboard.tsx`.
- [x] **Quality Assurance & Verification**:
  - 126/126 unit tests passing across all 25 test suites (`npm test -- --run`).

### Session 136 — Rate Cards & Payouts Net Value Simplification, Input-Based Payout Bank & 2-Step Passcode-Gated Withdraw Modal
- [x] **Rate Cards & Payouts Net Value Display (`TalentDashboard.tsx`)**:
  - Removed confusing 3-line formula breakdown boxes (`Base rate`, `Platform fee (7%)`, `You receive`) from all Rate Cards.
  - Rate Cards top-right badge directly displays the exact single net take-home value after 7% platform fee deduction (e.g., `₦111,600` for `₦120,000` base, `₦74,400` for `₦80,000` base).
  - Simplified storefront rate card preview and Add Service modal live preview to show only the net take-home rate.
  - Payouts list simplified: removed `Base: ₦450,000`, `Platform fee (7%): -₦31,500`, and `You receive: ₦418,500` multi-line formulas from every row. Replaced with single bold net payout amount (e.g. `₦418,500`) and status badge (`Paid`).
  - Simplified Receipt modal to display "Payout Amount Received".
- [x] **Payout Bank Account Input-Based Redesign (`Settings.tsx`)**:
  - Replaced disjointed card UI and stacked alert banners with a clean input-based layout.
  - Read-only by default: Bank Name, Account Number (10 digits, mono font), Account Name, and optional Phone number displayed as clean read-only input fields with a primary "Change Bank Account" button.
  - Editing mode: Selecting "Change Bank Account" unlocks the bank selector, account input with simulated Paystack lookup, and Save / Cancel actions.
  - Preserved platform policy copy and 48hr security memo in subtle helper notes, satisfying all required test assertions.
- [x] **Withdraw Funds Modal 2-Step Flow with Presets (`TalentDashboard.tsx`)**:
  - Amount entry with `₦` prefix and quick-fill example preset buttons (`₦25,000`, `₦50,000`, `₦100,000`, `₦200,000`, `Max`).
  - Clean, auto-selected destination bank account card with `Building2` icon, bank name, masked account number, account holder name, and green `Auto-Selected` checkmark badge.
  - 2-Step Passcode Flow: Clicking "Proceed to Withdraw ₦X" transitions to 4-digit PIN authentication validated against stored passcode (`localStorage.getItem("monologg_withdrawal_passcode") || "1234"`).
  - Withdrawal Success Screen: Confirmation screen with checkmark, exact withdrawn amount, destination bank details, and "Done" button.
- [x] **Quality Assurance, TypeScript Validation & Standalone Bundle Regeneration**:
  - 126/126 unit tests passing across all 25 test suites (`pnpm --filter @monologg/web test`).
  - Zero TypeScript compilation errors (`tsc --noEmit`).
  - Recompiled standalone production bundle and updated `monologg/monologg-app.html`.

### Session 135 — FAANG Visual Hierarchy Polish for OrderRoom, Project Tabs, Applicant Capacity & Client Reviews Modal
- [x] **OrderRoom Header & Availability Check-in Consolidation (`OrderRoom.tsx`)**:
  - Eliminated the redundant secondary stacked bar (`Check-in progress: Check-in 2 of 3 ... Booked / 7 days / 2 days`) that created 4 stacked layers on top of chat.
  - Integrated the 3-step check-in stepper (`Booked`, `7 days`, `2 days`) with status states (`Done`, `Due`, `Upcoming`) directly into the header of the Availability Check-in Card.
  - Simplified OrderRoom navbar subtitle to clean, high-density metadata (`ORD-001 · ₦111,600 net` for performer or `₦120,000 in escrow` for client) and `Remote`/`On-site` badge, replacing the cluttered inline fee formula.
  - Cleaned up segmented workspace tabs with semantic `MessageSquare` icon (replacing `CheckCircle2`), crisp elevated white pill active state (`bg-white dark:bg-zinc-900 shadow-xs text-zinc-900 font-semibold`), and standardized icon + label alignment.
- [x] **TalentDashboard FAANG UI/UX Cleanup (`TalentDashboard.tsx`)**:
  - Availability check-in card metadata grid normalized to `text-xs uppercase tracking-wider font-semibold text-zinc-400` with `font-display text-lg sm:text-xl` title.
  - Project Details segmented tabs cleaned up with monochromatic icons (`FileText`, `Users`, `Layers`, `ShieldCheck`), uniform padding, and crisp active states.
  - Applicant capacity bar converted from alarming bright red (`var(--color-accent)`) to neutral dark fill (`bg-zinc-800 dark:bg-zinc-200`) on subtle track.
  - Purged duplicate escrow footnote (`100% Escrow Protected · Direct Bank Payout`) at the bottom of the sticky sidebar, consolidating security messaging under the compensation breakdown.
  - Client Reviews Modal statistics cards (`Average Rating`, `Completed Projects`, `Escrow Reliability`) redesigned with balanced proportions, bold `text-3xl` numbers, and unboxed pills (`100% Funded`, `Instant Payout`), removing awkward double green borders.
  - Orders list 3-step milestone progress indicator refined with clean typography and badges.
- [x] **Testing, Build & Quality Assurance**:
  - 126/126 tests passing across all 25 test suites (`pnpm --filter @monologg/web test`).
  - Clean TypeScript typecheck (`tsc --noEmit`).
  - Standalone distribution bundle recompiled and updated in `monologg/monologg-app.html` (1.66 MB).
- [x] **Project Details & Status Pages Segmented Tabs Architecture (`TalentDashboard.tsx`)**:
  - Replaced deep vertical scrolling in `selectedProject` view with Airbnb / Binance / Upwork-style segmented horizontal tabs:
    - `Overview & Brief`: Synopsis, compensation breakdown, timeline, location, deliverables checklist, reference assets.
    - `Roles & Requirements`: Character traits, craft category, performance tags, age range.
    - `Audition Sides & Script`: Readable audition excerpt block, dialogue sides with character cues, one-click copy sides button.
    - `Client & Escrow`: Client profile badge with clickable rating and reviews modal, production company credentials, Paystack escrow protection explanation.
  - Sticky compensation sidebar with 3-line fee breakdown, applicant capacity, and contextual action center buttons across all 6 project states.
- [x] **Order Room UX Overhaul & Workspaces for Performer and Client (`OrderRoom.tsx`)**:
  - Replaced crowded feed with clean segmented workspace tabs:
    - `Messages & Chat`: System notices, direct messaging, file attachments, and audit trail.
    - `Order Brief & Deliverables`: Project synopsis, live checklist, milestone delivery upload, and review gates.
    - `Payment & Escrow`: Escrow balance summary, 3-line fee breakdown, release timeline, and rating cards.
  - Added contextual action docks adapted for Performer (deliverable submission, attendance check-in) and Client (approval, release escrow, request revision).
  - Preserved mandatory Paystack escrow guarantee footer unchanged: `"Funds are held securely in escrow by our payment partner, Paystack and auto-release 48 hours after delivery or upon client approval."`.
- [x] **Automated Availability Check-in Protocol (`state-sync.ts`, `TalentDashboard.tsx`, `OrderRoom.tsx`)**:
  - Implemented 3 milestone check-ins with offsets defined as constants (`CHECKIN_OFFSETS`): `Booked` (immediate at booking), `7 days` (7 days before event), `2 days` (2 days before event). Past dates are automatically skipped.
  - Added interactive check-in card at the top of the talent dashboard and order room:
    - Heading: `"Are you still available?"`.
    - Event details: Event name, date & time, location ("Remote" or venue address), client name.
    - Payout rate: `"You receive ₦X"` (base rate minus 7%).
    - Primary action: `"Yes, I'm confirmed"`, transitioning to `badge-confirmed` with `"Thanks, we've told {Client name}."` and `"Next check-in: {date}"`.
    - Overdue warning state: Warning tone with `"Confirm now. {Client name} has been told you haven't confirmed yet."`.
    - Secondary action: `"I can't make it"`, opening decline modal (`modal-decline-confirm`): Title `"Cancel this booking?"`, body `"The client will be refunded and you won't be paid. Cancelling affects your rating and visibility on Monologg."`, buttons `"Keep booking"` (primary) and `"Yes, cancel booking"` (destructive outline).
  - Added 3-step progress indicators on booking cards in the Orders list and Order Room header (Booked, 7 days, 2 days with Done, Due, Missed states, plus subline e.g. `"Check-in 2 of 3 · due Tue 14 Oct"`).
  - Injected real-time system notices in the Order Room chat:
    - `"You confirmed your availability (check-in 2 of 3)."`
    - `"Check-in 2 of 3 is due on Tue 14 Oct."`
    - `"Attendance confirmed with the client's code."`
- [x] **Talent KYC / Settings — Payout Bank Account Step (`payoutBanks.ts`, `Settings.tsx`)**:
  - Built comprehensive `NIGERIAN_BANKS` catalog of 20 Nigerian commercial banks and fintechs (OPay, Wema/ALAT, Zenith, GTBank, Access, First Bank, UBA, Kuda, Moniepoint, PalmPay, etc.) with real-time text search filter.
  - 10-digit account number with simulated Paystack account name lookup in a read-only field.
  - Account ownership validation using `compareKycNames()` token-based matching ignoring case and word order against performer KYC profile name.
  - Distinct lookup states:
    - `looking_up`: Animated skeleton loader (`"Looking up account name via Paystack…"`).
    - `name_matches`: Emerald card with `badge-verified` and `"Name matches your KYC details"`.
    - `name_mismatch`: Inline error `"This account name doesn't match your KYC name. Use an account in your own name."`.
    - `lookup_failed`: Error message with `"Retry"` button.
  - Added helper text: `"Withdrawals go to this account."`.
  - Save button (`"Save Payout Bank Account"`) enabled only when name matches KYC.
  - Added optional `"Phone number"` field with helper text: `"Optional. If you miss a confirmation, only a Monologg team member will call you."`.
  - Retained 100% compliance with string assertions in `Settings.test.tsx` (`"Payout Bank Account"`, `"One Payout Bank Account"`, `"You can change your bank account after 48hrs"`, `"Change Bank Account"`, etc.).
- [x] **Withdraw Sheet & Payout Account Change Request (`TalentDashboard.tsx`, `Settings.tsx`)**:
  - Transformed withdrawal modal into a modern withdraw sheet with amount defaulting to full available balance and a read-only destination account card showing bank name, account name, and masked number (`•••• 6789`) with no direct typing.
  - Primary action: `"Withdraw ₦X"`.
  - Success state: `"Withdrawal requested"` showing amount and account.
  - Text link `"Change payout account"` opening change request form with the same Paystack name-match check.
  - Status card: `"Under review. We'll notify you when it's approved."` with `under_review`, `approved`, and `rejected` states (with reason and `"Try again"` button). While under review, withdrawals continue using the existing verified account.
- [x] **Testing, Build & Quality Assurance**:
  - 126/126 tests passing across all 25 test suites (`pnpm --filter @monologg/web test`).
  - Clean TypeScript typecheck (`tsc --noEmit`).
  - Production bundle compiled with `pnpm --filter @monologg/web build:standalone`.
- [x] **Performer Terms Agreement & Step Reordering (`CreatorOnboarding.tsx`, `CreatorOnboarding.test.tsx`)**:
  - Reordered onboarding sequence so Google Calendar sync is Step 7 and Performer Terms Agreement is Step 8.
  - Removed document/shield header icon from Step 8.
  - Converted boxed agreement cards into a clean, unboxed stacked list with bold emphasis titles (`Service Fee`, `Payout Verification`, `Milestone Confirmations`, `Attendance Code`, `Account Standing`).
  - Added 3-line fee breakdown (`Base rate`, `Platform fee (7%)`, `You receive`) to onboarding rate cards.
  - Updated unit test helper in `CreatorOnboarding.test.tsx` to handle the revised step navigation, passing all 5 tests.
- [x] **Availability Calendar Sync Redundancy Resolution (`TalentDashboard.tsx`, `TalentDashboardAvailability.test.tsx`)**:
  - Removed redundant bottom Google Calendar sync card from the Availability tab.
  - Wired top banner "Connect Google Calendar" button to open `showSyncModal` and trigger calendar sync.
  - Updated unit test matcher in `TalentDashboardAvailability.test.tsx` to pass cleanly.
- [x] **Project Details Page Upgrades & Client Ratings Modal (`TalentDashboard.tsx`)**:
  - Made client rating badge (`★ 4.9 (18 reviews)`) and client row clickable to open a verified Client Reviews & Ratings modal (`showClientReviewsModal`).
  - Modal displays verified performer reviews for the casting client, average rating, and Paystack escrow guarantee.
  - Unboxed "Casting Client & Escrow" section into clean text layout without outer card containers or nested boxes.
  - Restyled "Audition Sides & Script Excerpt" from monospace/small font to standard readable block text (`font-body text-sm sm:text-base border-l-4`).
- [x] **Standardized Paystack Escrow Explainer Across Platform**:
  - Replaced all instances of `FINCRA` with `Paystack` across performer-facing screens, auth screens, footer, order rooms, and landing pages (`AuthFlow.tsx`, `LandingPage.tsx`, `OrderRoom.tsx`, `TalentDashboard.tsx`, `currency.ts`).
  - Escrow wording standardized: `"held securely in escrow by our payment partner, Paystack"`.
  - Updated currency limit error text in `currency.ts` to `"Even Paystack has limits."`.
- [x] **Performer 3-Line Fee Breakdown Standardization**:
  - Enforced 3-line fee breakdown (`Base rate`, `Platform fee (7%)`, `You receive`) across:
    - Rate Card preview (Profile tab)
    - Rates tab and Add/Edit Rate Card modal
    - Project Details compensation card
    - Active order cards in Orders tab
    - Recent Payouts list rows and Payout Receipt modal in Earnings tab
    - Order Room header and payment modals
  - Removed all 9%, 11%, 12%, and 15% references from performer-facing screens.
- [x] **Testing & Standalone Distribution Rebuilding**:
  - All 126 unit tests passing across all 25 test files (`pnpm --filter @monologg/web test`).
  - Clean TypeScript compilation with 0 errors (`tsc --noEmit`).
  - Re-compiled standalone production bundle and updated `monologg/monologg-app.html` (1.63 MB).

### Session 132 — Performer Calendar Sync, Onsite/Online Project Badging & Mandatory Terms Agreement
- [x] **Talent Onboarding — "Connect your calendar" Step (`CreatorOnboarding.tsx`, `state-sync.ts`)**:
  - Inserted Step 1 right after sign-up and before personal details.
  - Title: `"Connect your calendar"`.
  - Body: `"Bookings appear on your calendar automatically, and we only offer slots when you're free."`.
  - Buttons: Primary `"Connect Google Calendar"` button with Google logo and `"Skip for now"` secondary link.
  - States: Connected state displays a connected badge with user account email and a `"Disconnect"` link; Error state renders an alert with retry button (`RefreshCw`).
  - Integrated with `appStateSync.setCalendarSync(...)` and `appStateSync.getCalendarSync()`.
- [x] **Availability Screen Sync Status & Blocked Calendar Slots (`TalentDashboard.tsx`)**:
  - Added a Google Calendar Sync status banner at the top of the availability screen (`activeTab === "calendar"`) showing real-time sync status (`Connected` with account email + Disconnect action, or `Not connected` with Connect Google Calendar action).
  - Rendered existing calendar events (`dayDetail.events`) as blocked slots (`Blocked Slot · Google Calendar Event` / `Calendar Event`) in the day's slot schedule with visual "Busy" markers.
  - Strictly preserved availability slots for event times only without adding verification call slot types.
- [x] **Onsite vs. Online Project Badging & Application Warning (`TalentDashboard.tsx`)**:
  - Created `isProjectOnline()` helper function to distinguish remote/digital projects from physical gigs.
  - Added `Online` / `Onsite` badge on project cards in the project browse feed.
  - Added `Online Project` / `Onsite Project` badge in the Project Detail view header alongside project type and location.
  - In State 4 ("Ready to Pitch"), added a high-visibility notification callout informing the performer whether the project is 100% remote/online or requires physical attendance at the venue (linking to the 4-digit check-in attendance code requirement).
- [x] **Mandatory Performer Terms & Payout Agreement Step (`CreatorOnboarding.tsx`, `state-sync.ts`)**:
  - Added Step 8 at the end of onboarding after rate cards and before profile publication.
  - Title: `"Performer Terms & Payout Agreement"`.
  - Rendered the 5 mandatory clauses as a stacked list with bold labels:
    - **Service Fee:** Monologg deducts a 7% platform fee from all completed bookings before settlement.
    - **Payout Verification:** Payouts are routed directly to your verified bank account (OPay, Wema, Zenith, etc.) matching your KYC full legal name. Any payout account changes are subject to review.
    - **Milestone Confirmations:** You agree to respond to automated availability prompts (sent via email and/or platform alerts at 3 times prior to each event).
    - **Attendance Code:** On-site payouts require entering the client's 4-digit check-in code upon physical arrival.
    - **Account Standing:** Unconfirmed gigs or no-shows directly degrade your performer rating and visibility on the platform.
  - Checkbox: `"I agree to the Performer Terms of Service (Mandatory)"` with link to `/legal/terms`.
  - `"Continue"` button remains disabled until the box is checked.
  - Acceptance is stored with an ISO timestamp via `appStateSync.setPerformerAgreement(true)`.
- [x] **Quality Assurance & Standalone Distribution Rebuilding**:
  - Updated unit test helper `goToUploadStep` in `CreatorOnboarding.test.tsx` to handle the new calendar step.
  - Added 2 new unit test suites verifying calendar sync connect/disconnect and mandatory agreement checkbox behavior.
  - All 126 unit tests passing across all 25 test suites (`pnpm --filter @monologg/web test`).
  - Clean TypeScript compilation with 0 errors (`tsc --noEmit`).
  - Regenerated standalone single-file distribution bundle in `monologg/monologg-app.html` (1.61 MB).

### Session 131 — Solid Modal Standard, Saved Cards Streamlining & Client Performer Filters Overhaul
- [x] **Enforce Solid Modal Surface Standard (`ClientDashboard.tsx`)**:
  - Replaced unstyled transparent wrapper in `showFundWalletModal` with standard `motion.div` modal container (`background: var(--color-bg-surface)`, `border: 1px solid var(--color-border-default)`, `boxShadow: var(--shadow-modal)`, `rounded-[var(--radius-xl)]`, `max-h-[90vh] overflow-y-auto`).
  - Eliminates background bleed-through from the underlying dashboard hero card.
- [x] **Streamline Saved Cards & Purge Inline Form / CVV (`ClientDashboard.tsx`)**:
  - Removed CVV verification input and inline "+ Add New Card" form since card management belongs strictly in Settings.
  - Rendered saved cards as sleek selectable cards with brand badges (Mastercard/Visa), masked digits, expiry metadata, and checkmark selection state.
  - Preserved zero-card fallback and insufficient funds error recovery flows.
- [x] **Performer Filter Modal Overhaul: Age, Gender, Budget Slider & Location (`ClientDashboard.tsx`)**:
  - Added filter taxonomy for Age Range (`All`, `18-25`, `26-35`, `36-45`, `46-55`, `56-65`, `65+`), Gender Presentation (`All`, `Female`, `Male`, `Non-Binary`, `Androgynous`), Budget Range Slider (₦0 Any to ₦150k+ with live readout), and Location Hubs (`All`, `Lagos`, `Abuja`, `Port Harcourt`, `Ibadan`, `Kano`, `Enugu`, `Accra`).
  - Preserved all physical features (Height, Build, Complexion, Hair) with responsive wrapping.
  - Added active filter count pill indicator on "More Filters" button.
  - Updated client-side filter computation (`filteredTalents`) across all criteria.
- [x] **Mock Fixture Attributes (`mocks/talents.ts`)**:
  - Populated attributes on all 6 mock talents to ensure filtering works seamlessly in mock/demo mode.
- [x] **Distribution Rebuilding & Quality Assurance**:
  - 124/124 tests passing across all 25 test suites (`npm test`).
  - 0 TypeScript compiler errors (`tsc --noEmit`).
  - Standalone single-file bundle `monologg/monologg-app.html` rebuilt and inlined (1.59 MB).

### Session 130 — Fund Client Wallet UX/UI Polish & Fintech Streamlining
- [x] **Developer Artifacts & Test Link Removal (`ClientDashboard.tsx`)**:
  - Removed floating developer text link `"Test insufficient balance error"` from next to CVV input.
  - Insufficient balance handling is natively verified by amount thresholds ($\ge ₦1,000,000$).
- [x] **Fintech High-Contrast Amount Input & Tactile Preset Chips (`ClientDashboard.tsx`)**:
  - Currency indicator styled with `#7B00FE`, bold 24px mono text, and sentence-case labels.
  - Quick amount presets (`₦50k`, `₦100k`, `₦250k`, `₦500k`) upgraded into tactile buttons with client purple active state.
- [x] **Mini Payment Card List & Dedicated Card Brand Badges (`ClientDashboard.tsx`)**:
  - Saved cards rendered as sleek fintech payment cards with Mastercard and Visa visual logos, masked last 4 numbers, clean expiry text, and default pill badges.
- [x] **Integrated CVV Security Row (`ClientDashboard.tsx`)**:
  - Streamlined CVV input into a security verification row with lock icon and 3-digit helper copy.
- [x] **Primary Action CTA & Escrow Trust Notes (`ClientDashboard.tsx`)**:
  - Upgraded action button to sleek `#7B00FE` button with lock icon and FINCRA 256-bit encryption trust footer.
- [x] **Distribution Rebuilding & Quality Assurance**:
  - 124/124 tests passing across all 25 test suites (`npm test`).
  - 0 TypeScript compiler errors (`npx tsc --noEmit`).
  - Standalone single-file executable `monologg/monologg-app.html` rebuilt and inlined (1.59 MB).

### Session 129 — Performer Web App FAANG UX/UI Polish & Cleanup across 5 Core Screens
- [x] **Universal Dual Chevron Bug Resolution (`TalentDashboard.tsx`)**:
  - Removed manual `<ChevronDown />` components on lines 4250, 4868, and 4881 across timeframe select and review filters, letting CSS tokens handle native dropdown arrow cleanly.
- [x] **Reviews Modal UX & Hierarchy Polish (`TalentDashboard.tsx`)**:
  - Standardized search inputs and select heights to `h-9 text-xs rounded-xl`.
  - Polished rating distribution bars in Pillar 3 with aligned counts.
  - Ensured Order Room links preserve role context with `?role=talent`.
  - Upgraded card backgrounds and borders to semantic CSS variables (`var(--color-bg-elevated)`, `var(--color-border-default)`).
- [x] **Earnings by Category Chart Typography & Layout (`TalentDashboard.tsx`)**:
  - Aligned timeframe dropdown, legends, metric chips, and rotated Y-axis typography.
- [x] **Edit Profile Standardized Sizing & Availability Pill Selector (`Settings.tsx` & `TalentDashboard.tsx`)**:
  - Standardized form inputs across name, stage title, location, and social media to `h-11 rounded-xl text-sm font-body px-3.5`.
  - Clean left social badges (`IG`, `YT`, `TT`, `X`, `IN`, `SP`) and matching `h-11` tag input with Add button.
  - Replaced misleading red "Available" button with emerald active pill (pulsing green dot) and amber "Booked" pill.
  - Purged duplicate read-only tags and bio rendered underneath active edit form.
- [x] **Fintech Card Hierarchy for Payout Bank Account (`Settings.tsx`)**:
  - Replaced cluttered callout sandwich with sleek fintech card with bank icon, bold bank name, masked account number, and verified status.
  - Preserved strict test assertions: `"You can only have one payout bank. This is how Monologg operates"`, `"You can change your bank account after 48hrs"`, and `"Save Payout Bank Account"`.
- [x] **Project Detail View & 6 Lifecycle States (`TalentDashboard.tsx`)**:
  - Cleaned up sides script excerpt (stripped duplicate `"Sides / Script Excerpt:\n"` prefix).
  - Polished metadata row, compensation card, applicant progress bar, and all status banners (`APPLIED`, `SHORTLISTED`, `SELECTED`, `REJECTED`, `WITHDRAWN`, pitch form).
  - Ensured Order Room navigation passes `?role=talent`.
- [x] **Distribution Rebuilding & Quality Assurance**:
  - 124/124 tests pass across all 25 test suites (`npm test`).
  - 0 TypeScript compiler errors (`npx tsc --noEmit`).
  - Standalone single-file bundle `monologg/monologg-app.html` rebuilt and inlined (1.66 MB).
- [x] **OrderRoom Action Button & CTA Conciseness Polish (`OrderRoom.tsx`)**:
  - Replaced bulky button label `"Confirm Brief & Advance to Deliverables"` with concise `"Confirm Brief & Continue"`.
  - Replaced ambiguous generic `"Verify"` modal action button with contextual, clear actions: `"Verify Check-In"` (onsite check-in) and `"Submit Deliverable"` (milestone upload).
  - Fixed hardcoded red highlight borders and badge backgrounds to dynamically respect role context (`rgba(241, 48, 48, 0.18)` / `var(--color-red-soft)` for performer, `rgba(123, 0, 254, 0.18)` / `var(--color-purple-soft)` for client).
- [x] **TransactionHistory Role-Aware Hierarchy & Copy (`TransactionHistory.tsx`)**:
  - Injected root `.role-client` and `.role-talent` classes.
  - Aligned financial hero card glow (purple for client, red for talent) and title accent color (`#9B4DFF` vs `#F13030`).
  - Standardized active filter chips to client purple (`#7B00FE`) and performer red (`#F13030`).
  - Adapted ledger fee breakdown and explanation copy: `"Total Released"` for client vs `"You Receive"` for performer, with tailored plain-English escrow and refund descriptions.
- [x] **Distribution & Quality Assurance**:
  - Rebuilt and inlined standalone distribution `monologg/monologg-app.html` (1.66 MB).
  - 124/124 tests passing across all 25 test suites (`npm test`).
  - 0 TypeScript compiler errors (`npx tsc --noEmit`).
- [x] **Universal Dual Chevron Bug Resolution (`TalentDashboard.tsx`)**:
  - Removed manual `<ChevronDown />` components on lines 4250, 4868, and 4881 across timeframe select and review filters, letting CSS tokens handle native dropdown arrow cleanly.
- [x] **Reviews Modal UX & Hierarchy Polish (`TalentDashboard.tsx`)**:
  - Standardized search inputs and select heights to `h-9 text-xs rounded-xl`.
  - Polished rating distribution bars in Pillar 3 with aligned counts.
  - Ensured Order Room links preserve role context with `?role=talent`.
- [x] **Earnings by Category Chart Typography & Layout (`TalentDashboard.tsx`)**:
  - Aligned timeframe dropdown, legends, metric chips, and rotated Y-axis typography.
- [x] **Edit Profile Standardized Sizing & Availability Pill Selector (`Settings.tsx` & `TalentDashboard.tsx`)**:
  - Standardized form inputs across name, stage title, location, and social media to `h-11 rounded-xl text-sm font-body px-3.5`.
  - Clean left social badges (`IG`, `YT`, `TT`, `X`, `IN`, `SP`) and matching `h-11` tag input with Add button.
  - Replaced misleading red "Available" button with emerald active pill (pulsing green dot) and amber "Booked" pill.
  - Purged duplicate read-only tags and bio rendered underneath active edit form.
- [x] **Fintech Card Hierarchy for Payout Bank Account (`Settings.tsx`)**:
  - Replaced cluttered callout sandwich with sleek fintech card with bank icon, bold bank name, masked account number, and verified status.
  - Preserved strict test assertions: `"You can only have one payout bank. This is how Monologg operates"`, `"You can change your bank account after 48hrs"`, and `"Save Payout Bank Account"`.
- [x] **Project Detail View & 6 Lifecycle States (`TalentDashboard.tsx`)**:
  - Cleaned up audition sides script excerpt, stripping redundant `"Sides / Script Excerpt:\n"` prefix, adding clipboard copy with "Copied!" feedback and monospace typography.
  - Polished banners and CTAs across all 6 application statuses (`APPLIED`, `SHORTLISTED`, `SELECTED`, `REJECTED`, `WITHDRAWN`, pitch form).
  - Ensured Order Room CTA in `SELECTED` state navigates with `?role=talent`.
- [x] **Standalone HTML Distribution & Quality Verification**:
  - Inlined freshly compiled bundle into `monologg/monologg-app.html` (1.66 MB).
  - 124/124 tests passing across all 25 test suites (`npm test`), 0 TypeScript compiler errors.

### Session 126 — Elimination of Redundant Auth & Onboarding UI Elements for Performer and Client
- [x] **Prune Duplicate Role Switchers (`AuthFlow.tsx`)**:
  - Removed duplicate `[Performer | Client]` segmented control inside `view === "login"` that was stacked 50px below the master role switcher.
  - Removed duplicate `"I'm joining as"` role selector inside `view === "register"`.
  - Master pill switcher remains positioned cleanly at top of form column across all auth states.
- [x] **Elimination of Cramped Duplicate Navigation Controls (`AuthFlow.tsx`)**:
  - Removed redundant `[Register | Sign In]` mini-pill from the header bar on login and register screens that clashed with `< Back`.
  - Standardized on clean bottom toggle links (`"Already have an account? Sign in"` / `"New here? Create free account"`).
- [x] **Subtle Quick Demo Helper Row (`AuthFlow.tsx`)**:
  - Replaced oversized "Quick demo access" divider and large paired buttons with a discreet, clean bottom row (`"Quick demo: [Performer] [Client]"`).
- [x] **Role-Tailored Hero Benefits & Visual Styling for Performer and Client (`AuthFlow.tsx`)**:
  - Desktop illustration and mobile banners dynamically switch between Performer (Crimson `#F13030`, performer-specific value props) and Client (Purple `#7B00FE`, client-specific value props).
- [x] **Distribution Rebuilding & Test Verification (`monologg-app.html`)**:
  - Inlined freshly compiled standalone bundle into `monologg/monologg-app.html` (1.59 MB).
  - 124/124 tests passing across 25 suites (`npm test`), 0 TypeScript compiler errors.

### Session 125 — Restoration of Earlier Split-Screen Onboarding Layout for Performer and Client
- [x] **Split-Screen Desktop Illustration Panel Restoration (`AuthFlow.tsx`)**:
  - Restored full-height left panel layout with `background: var(--color-bg-elevated)` and `border-r border-[var(--color-hairline)]`.
  - Restored display headline: `"YOUR CRAFT. ON YOUR TERMS. INSTANTLY BOOKED."` with dynamic role-accent color scoping and hand-drawn SVG underline under `"BOOKED."`.
  - Restored subtitle and 4 checklist items with soft accent rounded pill badges (`bg-[var(--color-accent-soft)]`) and accent checkmark icons:
    - Free to join — zero subscription fees
    - Proprietary Thespian AI vibe scanner in 30s
    - Get paid the same day deliverables are approved
    - Full FINCRA escrow protection on every booking
- [x] **Pill Role Switcher Restoration (`AuthFlow.tsx`)**:
  - Restored signature rounded-full segmented pill toggle (`rounded-full bg-[var(--color-bg-surface-2)] border border-[var(--color-hairline)] p-1`).
  - Active highlights: Performer (`bg-[#F13030] text-white shadow-md`), Client (`bg-[#7B00FE] text-white shadow-md`).
- [x] **Splash Screen UX & CTAs Alignment (`AuthFlow.tsx`, `LandingPage.tsx`)**:
  - Restored `"Welcome to Monologg."` display headline with period and subtitle `"Sign in or create a free Performer/Client account to continue."`.
  - Restored dual rounded-full pill buttons: `"Create Free Account"` (`variant={role === "talent" ? "red" : "purple"}`) and `"Sign In"` (`variant="outline-pill"`).
  - Aligned landing page header CTAs ("Sign In" and "Create Your Profile") to navigate directly to `/auth` onboarding screen.
- [x] **Standalone HTML Distribution & Test Verification**:
  - Re-compiled standalone bundle (`build:standalone`) and inlined fresh bundle into `monologg/monologg-app.html` (1.66 MB).
  - All 124 unit tests passing across all 25 test suites (`npm test`).
  - 0 TypeScript compiler errors (`npx tsc --noEmit`).

### Session 123 — Elimination of ALL CAPS Titles & Typography Normalization Across Web Platform
- [x] **Elimination of `uppercase tracking-wider` Across All Screens**:
  - Converted card titles, section headings, sub-labels, and modal headers from ALL CAPS to sentence case with natural letter spacing (`font-body tracking-normal`).
- [x] **Dashboard Cards and Metric Labels Normalization**:
  - Performer Dashboard metrics: `Total earnings till date`, `Upcoming shoots`, `Active auditions`.
  - Client Dashboard metrics: `Total spend till date`, `Total successful projects`, `Average rating`, `Repeat talent rate`.
- [x] **Settings & Navigation Polish**:
  - Section headers: `Account`, `Appearance`, `Support & legal`.
  - Personal details read-only cards: `Basic information`, `Primary craft`, `Thespian AI performance summary`, `Style & profile tags`.
- [x] **Order Room & Help & Support Headings**:
  - Order Room: `Escrow protected`, `Project phases`, `Payment summary`, `Participants`.
  - Help & Support: `Frequently asked questions`, `Contact support`, `Your requests`.
- [x] **Test Contract Synchronization**:
  - Updated test assertions in `ClientDashboard.test.tsx` and `Settings.test.tsx` to match sentence case.
- [x] **Distribution Rebuilding & Quality Assurance**:
  - Rebuilt standalone single-file executable `monologg/monologg-app.html` (1.65 MB).
  - All 124 unit tests passing across all 25 suites (`npm test`).
  - 0 TypeScript compiler errors (`npx tsc --noEmit`).

### Session 122 — Performer Web App UI/UX Visual Upgrade & Hierarchy Polish
- [x] **Double Chevron Removal on Dropdowns (`TalentDashboard.tsx`)**:
  - Eliminated redundant manual `<ChevronDown />` icons inside relative select wrappers across the Reviews Modal and Earnings Category chart.
- [x] **Universal Form Input Height & Font Sizing Alignment**:
  - Standardized all profile and payout bank inputs to consistent `h-11 rounded-xl text-sm font-body px-3.5`.
  - Social media inputs updated with clean centered badges and `h-11 rounded-xl pl-11 text-sm font-body`.
  - Tag input and Add button unified to matching `h-11 rounded-xl`.
- [x] **Availability Pill Selector Redesign**:
  - Replaced error-red `bg-[var(--color-accent)]` with emerald green active state for "Available" and amber active state for "Booked".
- [x] **Profile Redundancy Purge & Duplicate Bio/Tags Elimination**:
  - Prevented duplicate read-only tags and bio from displaying beneath active edit form (`!isEditingProfile`).
  - Streamlined 4 competing Save buttons to clean top-bar Save and bottom card Save/Cancel.
- [x] **Fintech Payout Bank Account Overhaul (`Settings.tsx`)**:
  - Replaced bulky stacked callout boxes with a sleek bank card, bold title, masked account number, and clear 48-hour security memo while preserving all unit test assertions.
- [x] **Project Detail View & 6 Lifecycle States Polish (`TalentDashboard.tsx`)**:
  - Audition sides script excerpt stripped of redundant header copy.
  - Verified visual hierarchy and contextual actions for `APPLIED`, `SHORTLISTED`, `SELECTED`, `REJECTED`, `WITHDRAWN`, and pitch form.
  - Order Room button correctly routes with `?role=talent`.
- [x] **Distribution Rebuilding & Quality Assurance**:
  - 124/124 tests passing across all 25 test suites.
  - 0 TypeScript errors (`npx tsc --noEmit`).
  - Rebuilt and inlined `monologg/monologg-app.html` (1.65 MB).
- [x] **Comprehensive Historical Audit Across Sessions 112–120**:
  - Validated that Client Onboarding (S112), Brief Builder (S113), Client Projects detailed lifecycle & inline editing (S114–S116), Client Analytics spend spline (S117), Billing & Payments card management (S118), and Fund Client Wallet (S120) are strictly encapsulated in the client domain.
- [x] **Cross-Contamination Elimination in `TransactionHistory.tsx`**:
  - Removed client-side "Withdraw Funds" CTA from the performer earnings ledger.
  - Performer view (`!isClient`) renders clean Session 109 state: "Earnings & Transaction History", "Escrow Protected / Automated Ledger Settlement" badge, and 0 client withdrawal buttons. Payouts remain strictly managed from verified bank wallet modals on `TalentDashboard.tsx`.
  - Client view (`isClient`) renders "Client Transactions & Escrow", dynamic client volume metrics, and the purple "Withdraw Funds" CTA with the 24hr settlement safeguard gate.
  - Updated withdrawal recipient logic to resolve client profile organization/brand name dynamically from `appStateSync.getClientProfile()`.
- [x] **Parameter-Preserved Routing Across Shared Dual-Sided Pages**:
  - `ClientDashboard.tsx`: Deep-links to Settings updated to `/settings?role=client&section=payment`. Links to Transaction History updated to `/transactions?role=client`. All 14 Order Room links updated to append `?role=client`.
  - `OrderRoom.tsx`: Initialized `role` state from `searchParams.get("role") === "client" ? "client" : "talent"`.
  - `Settings.tsx`: Initialized active section from `searchParams.get("section")` for deep-linking. Separated transaction links in Account list (`/transactions?role=client` vs `/transactions?role=talent`).
  - `LandingPage.tsx`: User menu links updated to preserve role parameters.
- [x] **Unit & Integration Test Pass Rate & Distribution Rebuilding**:
  - Updated `TransactionHistory.test.tsx` with initial route entries (9/9 passing).
  - 124/124 tests passing across all 25 test suites (`npm test`).
  - 0 TypeScript compiler errors (`npx tsc --noEmit`).
  - Re-compiled standalone Vite production bundle (`build:standalone`) and inlined into `monologg/monologg-app.html` (1.65 MB).

### Session 120 — Client Escrow Safeguard Modal UX Cleanup, Fund Client Wallet Overhaul, Saved Card with Insufficient Funds Error State, and Full Paystack Checkout Integration
- [x] **Client Escrow Safeguard Modal UX Polish (`TransactionHistory.tsx`)**:
  - Removed visual noise and uppercase badge from modal header; kept clean warning icon and title `You have {N} live projects holding escrow`.
  - Replaced repetitive badges on each row with banking-style project detail view: title, niche, applicant count, and locked hold amount.
  - Simplified reassurance box to clean, single-line copy: `Your project drafts and auditions stay safe. Briefs, sides, and pitches are preserved so you can republish anytime. Withdrawals reach your bank within 24 hours.`
  - Added click stop-propagation on modal dialog containers to prevent unwanted dismissals.
- [x] **Fund Client Wallet Modal Overhaul (`ClientDashboard.tsx`)**:
  - Simplified modal subtitle to `Add funds to book performers and fund project escrow`.
  - Added quick amount preset pills (`₦50k`, `₦100k`, `₦250k`, `₦500k`) and formatted input with currency adornment.
  - Provided 2 clean payment methods: **Saved Card** and **Paystack**.
- [x] **Saved Card Flow & Insufficient Funds Error State**:
  - Displayed saved cards with radio selection, brand logos, last 4 digits, expiry, cardholder name, and Default badge.
  - Included inline `+ Add New Card` form with automatic card brand detection (Mastercard, Visa, Verve), number grouping, MM/YY expiry, CVV, and cardholder name.
  - Implemented realistic Insufficient Funds error state with clear explanation and two recovery paths: `Try Another Card` and `Switch to Paystack`.
- [x] **Paystack Integration Checkout Modal**:
  - Implemented authentic Paystack branded checkout modal with cyan header `#0BA4DB`, merchant name (`Monologg Creative`), email, and amount.
  - 3 checkout channels: **Card**, **Bank Transfer** (with dedicated virtual account, 1-click copy, and timer), and **USSD** dial code.
  - On payment authorization: credited wallet balance, dispatched in-app notification to `appStateSync`, displayed floating toast notification, and transitioned to success screen.
- [x] **100% Test Pass Rate & Distribution Inlining**:
  - Added 4 new tests in `ClientDashboard.test.tsx` (all 15 passing).
  - 124/124 tests passing across all 25 test suites (`npm test`).
  - 0 TypeScript errors (`tsc --noEmit`).
  - Standalone single-file bundle re-compiled and inlined into `monologg/monologg-app.html` (1.57 MB).

### Session 119 — Client Withdrawal Accessibility, WCAG AAA Contrast Refinement, Single-Line Copy & Context-Aware Zero-Draft Direct Settlement
- [x] **Accessibility & Contrast Restoration (`TransactionHistory.tsx`)**:
  - Replaced low-contrast light purple/white text combinations with WCAG AAA compliant deep violet tokens (`text-purple-900 dark:text-purple-100` headings, `text-purple-800 dark:text-purple-200` descriptions) on `bg-purple-50 dark:bg-purple-950/30` cards.
  - Enhanced Withdrawable Balance indicator contrast with `text-purple-700 dark:text-purple-300 font-bold`.
- [x] **Copy Refinement & No Double-Line Text Enforcement**:
  - Step 1: Subtitle streamlined to `Transfer available funds to your personal bank`; balance subtext to `Available wallet and released escrow balance`; 24-hr notice to `Funds will reach your personal account within 24 hours.`.
  - Step 2: Clear, jargon-free safeguard notice; button text simplified to `Cancel & Keep Live` with `whitespace-nowrap`.
  - Step 3: Subtitle trimmed to single line; all buttons and table rows wrapped in `whitespace-nowrap`.
- [x] **Zero-Draft Direct Settlement Logic**:
  - When withdrawing with 0 active projects, suppressed misleading `0 Projects Moved to Draft` warning row and drafts guidance box, replacing with clean `Settlement in progress` confirmation and direct `Dashboard` CTA.
- [x] **100% Test Pass Rate & Distribution Rebuild**:
  - 120/120 tests passing across 25 suites; clean typecheck; re-inlined into `monologg/monologg-app.html`.

### Session 118 — Billing and Payments Card Management, Direct Debit from Card for Escrow & Projects, Client 24hr Withdrawal Flow with Live Projects Safeguard Gate
- [x] **Title & Navigation Clean-up (`Settings.tsx`)**:
  - Renamed `Billing & Invoicing` section title and account menu label to `Billing and Payments`.
  - Removed obsolete `Project Briefs History` item from the client account menu.
- [x] **Interactive Billing Cards System (`Settings.tsx` & `state-sync.ts`)**:
  - Engineered functional `+ Add Card` / `+ Add Corporate Billing Card` workflow: real-time card preview (dynamic brand badge: Mastercard, Visa, Verve), formatted card number spacing, MM/YY expiration, 3-digit CVV masking, cardholder name, and optional default card toggle.
  - Implemented card management operations: Set as Default card, Delete Card modal with confirmation and protective guardrails against deleting the active default card without a replacement.
  - Added full persistent storage syncing in `appStateSync` (`BillingCard` model, `getBillingCards`, `addBillingCard`, `setDefaultBillingCard`, `deleteBillingCard`).
- [x] **Direct Debit from Saved Card for Projects & Escrow (`Checkout.tsx` & `ClientDashboard.tsx`)**:
  - In `Checkout.tsx`: Implemented saved card selector with 3-digit CVV security verification code authorization for immediate project/booking escrow payment, with option to enter and save a new card.
  - In `ClientDashboard.tsx`: Integrated saved card payment option with CVV verification into the `Fund Escrow Wallet` modal.
  - Added dedicated **`Publish Brief & Fund Escrow`** modal when publishing draft briefs from the Draft Stepper, Inactive Spotlight, or Action Center: supports funding via Escrow Balance or direct Debit from Card (with CVV authorization), transitioning the brief to Active.
- [x] **Client 24hr Withdrawal Experience & Live Projects Safeguard Gate (`TransactionHistory.tsx`)**:
  - Replaced static telemetry badge on the hero balance card with an active **`Withdraw Funds`** button and `Direct 24hr settlement` badge.
  - Implemented a 3-step modal flow:
    - **Step 1 (Amount & Destination):** Amount input (with quick 25%, 50%, Max buttons), preselected primary bank account (`GTBank · •••• 6789`), 24hr settlement speed notification.
    - **Step 2 (Live Projects Safeguard Gate):** When the client has active projects (`Nike Q1 Campaign`, `Tech Summit Compere`, `Film Auditions Jan 2025`), the safeguard gate blocks premature liquidation and informs the client that active projects will move to **Draft** status to release escrow funds. Reassures them that drafts can be reposted anytime via `Publish & Fund Escrow`.
    - **Step 3 (Settlement Confirmation):** Success state displaying estimated arrival time, transferred amount, destination account, and a detailed list of projects moved to draft with direct deep link back to client projects.
- [x] **Standalone HTML Rebuilt & 100% Test Pass Rate**:
  - Inlined compiled bundle into `monologg/monologg-app.html`.
  - 119/119 unit/integration tests passing across 25 test files.
  - 0 TypeScript compiler errors.
- [x] **Client Analytics 4 Cards Metric Realignment (`ClientDashboard.tsx`)**:
  - Replaced escrow/applicant cards with the 4 user-specified core metrics:
    1. `Total Spend Till date`: dynamically scales with selected period (`₦285,000` / `₦590,000` / `₦850,000` / `₦1,420,000`).
    2. `Total successful projects`: brief completion milestones (`2` / `3` / `4` / `6`).
    3. `average rating`: performer reciprocal score (`5.0 ★` / `4.9 ★`).
    4. `repeat talent rate`: talent retention metric (`33%` / `28%` / `25%` / `30%`).
- [x] **Date Range Dropdown**:
  - Substituted the static `Live Sync Active` chip with an interactive date range dropdown (`Last 30 days`, `Last 90 days`, `This Year`, `All time`).
  - Dropdown selection recalculates all 4 metrics and adjusts graph time periods and point plots in real time.
- [x] **Spend Spline Area Graph**:
  - Purged `Category Budget Allocation` and `Performer Acquisition Funnel` cards.
  - Implemented responsive SVG `Spend Over Time` spline area graph with purple gradient fill (`#7C3AED` to transparent), dashed Y-axis grid lines with ₦ currency ticks, X-axis milestone ticks, and interactive data point hover tooltips.
- [x] **Client Settings Profile & Brand Types Alignment (`Settings.tsx`)**:
  - Aligned Organization Type options with Onboarding Brand Types (`Creative Agency`, `Brand`, `Production Company`, `Events Company`, `Individual`, `Other`).
  - Renamed labels to `Brand Name` and `Brand Type`.
  - Unified profile naming to `Profile` and badge to `Verified Client`.
  - Renamed dashboard action nudge to `Profile`.
- [x] **Client Security Passcode Removal (`Settings.tsx`)**:
  - Completely removed the `Change Passcode` card for client mode (`!isClient`).
- [x] **Testing & Standalone Distribution Rebuilding**:
  - 13/13 tests passing in `Settings.test.tsx`; 11/11 tests passing in `ClientDashboard.test.tsx`; 117/117 web test suite passing.
  - Clean TypeScript typecheck (`tsc --noEmit`).
  - Standalone distribution `monologg-app.html` rebuilt and inlined (1.58 MB).

### Session 116 — Section-by-Section Inline Editable Architecture, Guided Draft Stepper, Semantic State Colors & Alpha UI Simplification
- [x] **Section-by-Section Inline Editable Architecture (`ClientDashboard.tsx`)**:
  - Replaced rigid modal editor with dedicated inline form toggles for all 5 project brief sections: Overview & Synopsis, Role & Craft Requirements, Audition Sides & Script Excerpt, Deliverables & Milestones, and Project Assets & Reference Files.
  - Section 1 (Overview & Synopsis): Editable title, budget, location, timeline, and synopsis textarea; saves to `selectedProjectDetail` and `projectOverridesInfo`.
  - Section 2 (Role Requirements): Multi-select craft category toggle pills (`VO_ARTIST`, `ACTOR`, `COMPERE`, `COMEDIAN`, `SPEAKER_PASTOR`, `CREATOR`) and performer guidelines textarea.
  - Section 3 (Audition Sides): Textarea for sides script excerpt with one-click clipboard copy.
  - Section 4 (Deliverables): Interactive milestone checklist with add item input, inline edit, and item deletion.
  - Section 5 (Reference Assets): Asset list with preview, download, remove, and attach new file form.
  - Seamless toggle between view and edit modes with "Save" and "Cancel" triggers.
- [x] **Guided Draft Stepper Bar**:
  - Prominently rendered when `currentStatus === "draft"`.
  - 5 step tiles (`01 Overview`, `02 Roles`, `03 Sides`, `04 Milestones`, `05 Assets`) with completion status badge (`5/5 Sections Ready`), smooth section scrolling, and inline editor activation.
  - Direct `Publish & Fund Escrow` action in the stepper header.
- [x] **Semantic Status Colors & Typographic Polish**:
  - Semantic status switcher colors (`draft`: Zinc-700, `active`: Emerald-600, `in_progress`: Monologg Purple `#7C3AED`, `review`: Amber-600, `completed`: Emerald-600, `closed`: Zinc-600).
  - Semantic status pill badges with distinct icons and borders across all 6 lifecycle states.
  - Unified typography hierarchy and single-line button microcopy without line breaks.
- [x] **Testing & Standalone Distribution Rebuilding**:
  - Added unit test cases in `ClientDashboard.test.tsx` (all 10 tests passing; 116/116 tests passing across all 25 suites).
  - 100% clean TypeScript compilation (`tsc --noEmit`).
  - Standalone single-file distribution `monologg-app.html` rebuilt and inlined (1.50 MB).

### Session 115 — Senior FAANG UX Audit & Refinement: Multi-Line Button Wrapping Elimination, Per-State Redundancy Purge & Draft Inactive Banner, Storefront Casting Modal with Direct Accept/Reject/Shortlist Actions
- [x] **Global Button Text Wrapping Elimination**:
  - Added `whitespace-nowrap` to `baseStyles` in `Button.tsx`. Guaranteed that all buttons across the application render on a single line with crisp typography.
  - Streamlined action center button copy: `Publish & Fund Escrow`, `Pause Applications`, `Copy Casting Link`, `View Order Room`, `Inspect in Order Room`, `Post Similar Brief`, `Delete Draft`.
- [x] **Purged Redundant & Inconsistent Lifecycle State Information**:
  - Draft mode: Suppressed candidate pipeline cards, applicant search, and filter tabs; replaced with a clean `Casting Pipeline Inactive` banner with explanation and `Publish & Fund Escrow` action.
  - Formatted projects list view items in draft mode to display `Draft saved {date}` and `Target: {cap} performers · Inactive draft` rather than misleading `Posted {date}` and `2/10 applicants`.
  - Removed duplicate state badge in top navigation bar (`STATE: [Draft] ... [Draft]`).
  - Formatted metadata header row dynamically across all 6 lifecycle states.
  - Disabled active hiring actions in non-active states (`in_progress`, `review`, `completed`, `closed`), displaying `Casting Concluded`.
- [x] **Universal Performer Storefront Profile & Casting Modal**:
  - Lifted talent modal from discover tab scope to root `<AnimatePresence>` container, making it globally mountable from applicant cards.
  - Displayed creator identity (avatar, verified badge, rating ★ 4.9, role, location, style tags).
  - Added `Open Public Storefront` button with `ExternalLink` icon linking directly to `/:handle`.
  - Displayed audition pitch proposal callout card with submission date and status badge.
  - Embedded audio/video reel preview player and storefront rate cards.
  - Provided direct casting CTAs: `Reject` / `Move to Shortlist`, `Shortlist`, and `Accept / Hire Performer` (or `Open Order Room` when hired).
- [x] **Testing & Distribution Rebuilding**:
  - Updated `ClientDashboard.test.tsx` (all 9 tests passing; 115/115 tests passing across all 25 suites).
  - Clean TypeScript compilation (`tsc --noEmit`).
  - Standalone single-file distribution `monologg-app.html` rebuilt and inlined (1.55 MB).

### Session 114 — Client Projects FAANG Detailed View: 6 Lifecycle States (Draft, Active, In Progress, Review, Completed, Closed), Creative Synopsis, Role & Craft Requirements, Audition Sides with One-Click Copy, Deliverables Checklist, Assets Management & Full Applicant Pipeline
- [x] **Full Information Parity with Performer Project Detail View**:
  - Implemented complete editorial layout in `ClientDashboard.tsx` when inspecting a project brief from "My Projects".
  - Section hierarchy: Creative Brief & Synopsis, Role & Craft Requirements (niches + guidelines), Audition Sides & Script Excerpt (code container + copy action), Deliverables & Licensing Milestones, Project Assets & Reference Files (with preview/download triggers), and Applicant Pipeline & Casting Review.
- [x] **6 Distinct Project Lifecycle States**:
  - Engineered distinct contextual views, state banners, and Project Action Center CTAs across `draft`, `active`, `in_progress`, `review`, `completed`, and `closed`.
  - Added Interactive State Preview Switcher for instantaneous 1-click state review.
  - Hired performer spotlight banner in `in_progress` with direct `Open Order Room (ORD-001) →` CTA.
  - 48-hour deliverables inspection countdown banner in `review`.
- [x] **FAANG Applicant Pipeline & Casting Review**:
  - Interactive status filter chips: `All ({n})`, `Shortlisted ({n})`, `Selected ({n})`, `Applied ({n})`, `Rejected ({n})`.
  - Real-time search filter across candidate name, role, location, and pitch quote.
  - Rich applicant cards with verified badge, rate, italic pitch quote, in-dashboard talent modal trigger (`View Profile & Reels →`), and contextual action buttons (`Shortlist`, `Reject`, `Select / Hire`, `Open Order Room →`).
- [x] **Desktop Header Hierarchy Calming & Defect Guarding**:
  - Hid global desktop page title when `selectedProjectDetail` is open so the detailed project view takes full focus.
  - Guarded legacy slide-over applicant modal (`!selectedProjectDetail`) so it does not mount over the dedicated page.
- [x] **Testing & Distribution Rebuilding**:
  - Authored unit test suite in `ClientDashboard.test.tsx` (all 7 tests passing; 113/113 tests passing across all 25 suites).
  - TypeScript compilation 100% clean (`tsc --noEmit`).
  - Re-compiled standalone bundle (`build:standalone`) and inlined into `monologg/monologg-app.html` (1.48 MB).

### Session 113 — UI Simplification: Single-Line Performer Categories, Client Dashboard Wallet Balance & Single CTA, 6-Category Brief Builder, Interactive Hub Location Picker, Assets Step Renaming, and Maximum Applicants Clean-up
- [x] **Client Onboarding Categories Header Clean-up**:
  - Replaced wrapping title with single-line uppercase title: **`Performer Categories`**.
  - Replaced clumsy multiline counter with a sleek inline pill badge (`{selectedCategories.length} selected`), avoiding line breaks.
- [x] **Client Dashboard Wallet Balance Card & Sole CTA**:
  - Replaced `TOTAL SPENT · 2024` with **`Wallet Balance`** (`WALLET BALANCE` in tracking-wider mono).
  - Maintained single CTA button on card: **`Fund Wallet`** (`<Plus /> Fund Wallet`), removing duplicate buttons.
  - Built interactive `FundWalletModal` with instant presets (₦50k, ₦100k, ₦250k, ₦500k) and custom amount input, syncing via `appStateSync.fundWallet`.
- [x] **Project Brief Builder 6 Performer Categories Parity & Copy Standardization**:
  - Aligned Step 2 with the 6 standard performer categories (`Actors`, `Public speakers`, `Comperes`, `Comedians`, `Artists`, `Creators`).
  - Standardized all client brief copy to "performer".
  - Upgraded Location to an interactive searchable dropdown containing 28 Nigerian entertainment hubs matching performer onboarding.
- [x] **Assets Step Renaming**:
  - Renamed Step 3 to **`Assets`** in stepper and screen title.
- [x] **Budget & Publish Simplification**:
  - Removed currency pill selector and preset pill buttons, locking budget to clean Naira input with client purple range slider.
  - Renamed applicant cap to **`Maximum applicants`** in field label, helper text, and Project Summary card.
- [x] **Testing & Distribution Validation**:
  - Updated `ProjectBrief.test.tsx` (all 109 tests across 25 files passing).
  - Verified 100% clean TypeScript typecheck (`tsc --noEmit`).
  - Regenerated standalone single-file distribution `monologg/monologg-app.html` (1.44 MB).

### Session 112 — Client Onboarding Modernization: 2-Step Stepper, Clean Brand & Category Labels (Slashes Removed), 6 Performer Craft Multi-Select, and Payment Step Removal
- [x] **Step 1 Copy & Label Modernization**:
  - Replaced "Tell us about your company" with "Tell us about you" / *"Help us personalize your performer discovery experience."*
  - Renamed field labels to **`Brand Name`** and **`Category`**.
  - Removed slashes from all category choices (`Brand` and `Individual` instead of `Brand / Corporate` and `Individual / Freelancer`).
- [x] **Step 2 Performer Discovery Preferences**:
  - Added multi-select 6 craft category card grid (`Actors`, `Public speakers`, `Comperes`, `Comedians`, `Artists`, `Creators`) with selected count and checkmarks.
  - Retained clean single-select hiring frequency selector (*"How often will you be hiring?"*).
  - Wired direct completion with `Get Started` button syncing client profile to `appStateSync.updateClientProfile`.
- [x] **Elimination of Step 3 (Payment Method)**:
  - Removed the premature card collection step, reducing stepper from 3 steps to 2.
- [x] **Testing & Distribution Validation**:
  - Created `ClientOnboarding.test.tsx` (2/2 tests passing).
  - Re-compiled standalone bundle and updated `monologg-app.html` (1.44 MB).

### Session 111 — Personal Details Nomenclature Simplification, Intro Copy Rework, and FAANG Delete Account Modal Redesign
- [x] **Section Naming Simplification**:
  - Renamed Settings Account menu item and top navigation bar label to **`Personal Details`** (clean 2-word name matching user specification).
  - Renamed section footer CTA to **`Edit Personal Details`**.
- [x] **Introductory Copy Rework**:
  - Renamed header from `Personal & Craft Persona` to **`Personal Details`**.
  - Replaced verbose jargon with simple, plain English: *"Your basic details, craft category, and voice & performance style tags."*
- [x] **FAANG Delete Account Modal Redesign**:
  - Replaced two aggressive red outline boxes with a single elevated surface card (`var(--color-bg-elevated)`) with hairline borders.
  - Item 1 (`Profile & Content Removed`): Clean soft red trash icon, stating profile, videos, client reviews, and messages will be permanently deleted and cannot be recovered.
  - Item 2 (`Remaining Balance Sent to Bank`): Clean soft green clock icon, confirming remaining funds will transfer to bank (`Payout to: GTBank •••• 6789`) within 72 hours.
  - Clean `DELETE` confirmation typing validation and simplified scheduled deletion screen.
- [x] **Testing & Distribution Regeneration**:
  - Updated all test assertions in `Settings.test.tsx` (13/13 passing, 0 TypeScript errors).
  - Rebuilt standalone distribution bundle and inlined into `monologg-app.html` (1.44 MB).

### Session 110 — Dedicated Settings Option for Personal & Craft Details (Read-Only Default with Interactive Edit Mode) and Redundant Profile Action Buttons Removal
- [x] **Dedicated Settings Section ("Personal & Craft Details")**:
  - Added `Personal & Craft Details` with `Sparkles` icon to Settings Account list for talent, distinct from the storefront Profile.
  - Kept simple, calm read-only layout by default displaying Basic Information (Gender, Date of Birth, Location), Primary Craft (with icon & discipline badge), and Thespian AI Performance Persona (quote block summary and style tags).
  - Provided interactive Edit Mode mirroring onboarding designs with Gender toggle pills, Date of Birth calendar input, Location selector, 6-discipline craft grid, Performance summary editor with Reset action, and full tag manager (remove, suggested additions, custom input).
- [x] **Redundant Profile Buttons Removal**:
  - Removed the floating duplicate action bar (`[Edit Profile] [Share Profile] [View Public Storefront] [Save Profile]`) that hovered on top of the profile editor.
  - Profile cover photo now starts cleanly at the top of the content area.
  - Card actions unified beside the avatar: `[Preview Profile / Edit Profile]`, `[Share]`, and `[Public Storefront]`.
  - Save button anchored in the top sticky navigation header for persistent accessibility.
- [x] **Testing & Distribution Validation**:
  - Added unit test suite in `Settings.test.tsx` (13/13 passing, 107/107 total suite passing across all 24 test suites).
  - Clean TypeScript typecheck (`tsc --noEmit`).
  - Re-compiled standalone bundle and inlined into `monologg-app.html` (1.50 MB).

### Session 109 — Minimalist Filter Taxonomy Chips & Clutter-Free Ledger Feed Cards
- [x] **Minimalist Filter Tabs**:
  - Removed sub-badge bubbles from all filter tabs (`All 3`, `Success`, `Pending`, `Settled / In Review`).
  - Chips now render cleanly with only their primary title: `All`, `Payout`, `Escrow`, `Dispute`.
  - Removed sub-badge telemetry text and separator dot from hero card header.
- [x] **Clutter-Free Transaction Feed Cards**:
  - Removed the entire secondary breakdown row (`Paid to ... Base ... Fee ... Ref: ...`) from transaction cards.
  - Retained clean high-hierarchy layout: Circular state icon, Booking ID, Type & relative time on the left; bold amount and status badge (`Success`, `Pending`, `Settled`, `In Review`) on the right.
- [x] **Modal Detail Inspection**:
  - Kept complete breakdown inside the Transaction Details Modal (Gig Price, Platform Fee, You Receive, Destination/Bank, Date, and plain-English explanation).
- [x] **Testing & Distribution Validation**:
  - Validated with 7/7 tests in `TransactionHistory.test.tsx`, 105/105 tests across all 24 test suites, clean typecheck, and rebuilt `monologg-app.html`.

### Session 108 — Status Taxonomy Simplification, Scannable Card Hierarchy, and Jargon-Free Transaction Details Modal
- [x] **Status Taxonomy Simplification**:
  - Payout: Status badge badged as **`Success`** (`RELEASED`).
  - Escrow: Status badge badged as **`Pending`** (`ESCROW_HELD`, `AUTHORIZED`, `INITIATED`).
  - Dispute: Status badge badged as **`Settled`** (`REFUNDED`) or **`In Review`** (`REFUNDING`).
  - Maintained complete 1:1 parity between filter chip sub-badges (`Success`, `Pending`, `Settled / In Review`) and the card badges.
- [x] **Scannable Card Information Hierarchy**:
  - Implemented 40px rounded state icons (`CheckCircle2`, `Clock`, `AlertCircle`, `RotateCcw`) in prominent left position alongside bold Booking IDs.
  - Aligned high-contrast bold amounts with directional symbols (`+`, `↩`, `⏳`) and status chips on the right.
  - Separated secondary details into a bottom strip featuring 1-line plain-English status explanations and clean base/fee/ref breakdown.
- [x] **Jargon-Free Transaction Details Modal**:
  - Removed confusing arbitration/legal terminology.
  - Added simple, human 1-sentence explanations for all 4 states.
  - Focused the details table strictly on necessary parameters: Booking ID, Type, Gig Price, Platform Fee, You Receive (`₦0` for refunded disputes), Reference/Bank, and Date.
- [x] **Testing & Distribution**:
  - Extended `TransactionHistory.test.tsx` with 7/7 passing unit tests; 100% clean typecheck; all 24 test suites passing (105/105 tests).
  - Re-compiled standalone distribution `monologg-app.html` (1.49 MB).

### Session 107 — Performer Payout Withdrawal CTA Removal, Dynamic Filter-Reflective Balance Card, and FAANG Dispute & Escrow Status UX
- [x] **Payout Withdrawal CTA Removal**: Removed `<Button variant="red">Request Payout Withdrawal</Button>` from the performer's earnings summary card in `TransactionHistory.tsx`.
- [x] **FAANG Dispute & Escrow Status Architecture**:
  - Implemented clear accounting status distinction between `In Review` (quarantined/pending mediation) and `Settled` (either refunded to client with ₦0 net earnings to performer, or paid out to performer).
  - Added directional badges (`↩ Refunded to Client`, `⏳ In Review`, `+ Released`).
  - Added contextual dispute resolution outcome banners inside the transaction detail/invoice modal.
- [x] **4-Status Filter Taxonomy**: Replaced flat status list with 4 high-level categories: `All` (All 3), `Payout` (Success), `Escrow` (Pending), `Dispute` (Settled / In Review).
- [x] **Dynamic Filter-Reflective Balance Card**: Connected hero black balance card to calculate and render the active category's total Naira balance, title, and contract breakdown in real time.
- [x] **Seed Fixtures & Data Sync**: Enriched `TRANSACTIONS` with 8 completed payouts totaling exactly ₦1,420,000, active escrow holdings, and dispute fixtures; merged seed items into `state-sync.ts`.
- [x] **Testing & Distribution**: Added unit test suite in `TransactionHistory.test.tsx` (5/5 passing, 103/103 total suite passing), 100% clean typecheck, and inlined `monologg-app.html`.

### Session 106 — Delete Account Flow with 72-Hour Earnings Guarantee & Data Loss Notice, Disabled Password CTA, and Passcode Subtext Removal
- [x] **Delete Account Flow & Modal Architecture**: Wired the Delete Account card to open a confirmation modal with clear stakes:
  - Permanent loss of all account information, profile storefront, media reels, portfolio assets, client reviews, and messages.
  - Guaranteed transfer of all remaining wallet balances and eligible escrow earnings to verified bank account under 72 hours.
  - Verified bank destination confirmation pill (`bankDetails.bankName •••• ${last4}`).
  - Double confirmation gate requiring typing `"DELETE"` to enable the destructive button.
  - Informational scheduled deletion screen with clear 72-hour payout window and return-to-home sign-out transition.
- [x] **Disabled Change Password CTA**: Managed `currentPassword`, `newPassword`, and `confirmPassword` in local state; kept `Update Password` disabled until all 3 fields contain text.
- [x] **Change Passcode Subtext Cleanliness**: Removed `4-digit PIN required to authorise earnings withdrawals` to establish clean aesthetic parity with the Change Password card.
- [x] **Testing & Distribution Validation**: Added comprehensive test cases in `Settings.test.tsx` (101/101 tests passing across 24 test suites), clean typecheck, rebuilt standalone distribution `monologg-app.html`.

### Session 105 — Security & Privacy Simplification: 2FA & Active Sessions Removal, Change Passcode Card Overhaul
- [x] **Two-Factor Authentication Removal**: Removed the 2FA toggle row and bottom hairline divider from the Change Password card.
- [x] **Active Sessions Removal**: Removed the "Active Sessions / 2 devices logged in" card to eliminate non-functional device management clutter.
- [x] **Change Passcode Card Architecture**: Reworked the withdrawal passcode card into a full visual mirror of Change Password:
  - Header: `Change Passcode` with subtext `4-digit PIN required to authorise earnings withdrawals`.
  - 3 Inputs: `Current Passcode`, `New Passcode`, and `Confirm New Passcode` with numeric 4-digit constraints.
  - Action Button: `Update Passcode` (disabled until all 3 inputs are 4 digits).
- [x] **Validation & Cross-Screen Compatibility**: Implemented verification against existing passcode in `localStorage.getItem("monologg_withdrawal_passcode") || "1234"`, match validation, error reporting, and live sync with `TalentDashboard.tsx` withdrawal gate.
- [x] **Testing & Distribution Validation**: Added unit test suite in `Settings.test.tsx` (100/100 tests passing across 24 test suites), clean typecheck, rebuilt standalone distribution `monologg-app.html`.

### Session 104 — Settings Payment Details Overhaul, Single Payout Bank Enforcement, 48-Hour Security Memo, and Performer Saved Cards Removal
- [x] **Menu & Header Label Alignment**: Renamed menu item in Account list to `"Payment details"` and header title to `"Payment details"`.
- [x] **Simplified Header Copy**: Heading `Payout Bank Account`, subtitle `Direct earnings withdrawal destination for your completed orders.`, removed `Verified` badge.
- [x] **One Payout Bank Policy Enforcement**: Stated clearly both before saving (edit mode) and after saving (saved view): *"You can only have one payout bank. This is how Monologg operates — all earnings withdrawals from your completed orders and milestones are routed directly to this single verified account."*
- [x] **48-Hour Security Memo**: Integrated callout banner both before and after saving: *"Security Memo: You can change your bank account after 48hrs. Any change locks bank modifications for 48 hours to protect your funds."*
- [x] **Performer Saved Cards & Duplicate Card Removal**: Removed `"SAVED CARDS (OPTIONAL BACKUP)"`, card list, `+ Add Payment Method`, and duplicate bottom bank card for performers (`!isClient`), while preserving billing cards for clients (`isClient`).
- [x] **Test & Distribution Validation**: Added test coverage in `Settings.test.tsx` (98/98 tests passing across 24 test files), typecheck clean, standalone `monologg-app.html` rebuilt (1.41MB).

### Session 103 — Full Performer Profile Storefront Duplicate in Editable Format for Settings Profile Page
- [x] **Storefront Layout Duplication in Settings**: Replaced generic vertical questionnaire with full "My Profile" storefront card (`max-w-4xl mx-auto`).
- [x] **Hero Cover Banner**: Implemented gradient theme presets (Crimson Studio, Noir Velvet, Amber Gold, Velvet Plum) and custom cover image upload with pill trigger.
- [x] **Avatar & Verified Badges**: Added camera upload trigger with fallback initials (`EJ`, `AL`, `RT`) and `✓ Verified Performer` badge.
- [x] **Performer Identity & Availability**: Displayed Performer Name, Stage Title, Location with map pin, and live availability toggle (Available vs Booked).
- [x] **Social Links Row**: Clickable badges for Instagram, YouTube, TikTok, Twitter/X, LinkedIn, Spotify, and `+ Social` button.
- [x] **Embedded In-Place Profile Editor**: Interactive inputs for Name, Stage Title, Location, Availability, Bio, Style Tags (add/remove), 6 social media handles, and theme presets.
- [x] **Live Previews**: Profile tags chips, About the Performer bio, Featured Audition Reel preview with play modal, and active booking rate cards.
- [x] **Modals Integration**: Connected `WatchPerformanceReelModal`, `UploadPerformanceReelModal`, and interactive Share Profile modal.
- [x] **No Onboarding Redundancy**: Removed raw craft category dropdown and email inputs from profile sub-page; account data remains cleanly accessible in main Settings header card.
- [x] **Testing & Distribution**: 24/24 test files passing (97/97 tests), typecheck clean, standalone `monologg-app.html` rebuilt (1.40MB).

### Session 102 — Reviews Modal Analytics Pillar Overhaul, Redundant Copy Cleanup, Settings Header Verified Pill, and Onboarding-Aligned Profile Editor
- [x] **Reviews Modal Heading & Copy Redundancy Cleanup**: Removed repeated mentions of "Verified", "Client Reviews", and "100%" across modal title, subtitle, and badges.
- [x] **Three Analytics Pillars (Reference Images 3 & 4)**:
  - Pillar 1: Total Reviews count (`8`), `✓ 100% Verified` badge, `Zero disputes filed` subtext.
  - Pillar 2: Average Rating (`4.9`), 5 gold stars (`★★★★★`), `Across completed orders` subtext.
  - Pillar 3: 5★ to 1★ horizontal bar chart with percentages and counts (5★: 62.5% [5], 4★: 37.5% [3], 3★: 0%, 2★: 0%, 1★: 0%).
- [x] **Streamlined Reviews Filter Bar & Cards**:
  - Combined search input and rating/sort dropdowns into a unified, non-cluttered control strip.
  - Filter tag pills row with dynamic result counts and reset action.
  - Review cards with circular client avatar initials, project subtitle, colored rating pill, clean quote, compliment badge, and `View Order Room →` action.
- [x] **Settings User Header Card**:
  - Replaced top-right `Edit` button pill with prominent `✓ Verified` badge.
  - Removed duplicate verified badge from below the email.
- [x] **Rename "Profile & Storefront" to "Profile" and Synchronize Onboarding Data**:
  - Renamed menu item in Account list to `Profile`.
  - Added comprehensive editor for onboarding collected information: Full Name, Stage Title, Craft Category dropdown (Actors, Public speakers, Comperes, Comedians, Artists, Creators), Location, Bio, Craft Tags (with interactive add/remove), and Social Handles.
  - Added public profile link preview banner (`monologg.co/emeka-johnson`) with direct "View Profile" link.
  - Synchronized mock `getPublicStorefront` with `appStateSync.getTalentProfile()` so edits immediately update public profile.
- [x] **Standalone HTML Distribution Updated**: Re-compiled standalone bundle and inlined into `monologg/monologg-app.html` (1.38MB).
- [x] **Verification**: 24/24 test files passing (97/97 tests), monorepo typecheck clean (0 errors), build clean.

### Session 101 — UI/UX Overhaul of Analytics & Client Reviews: Card Hierarchy, Colored Rating Badges, Brand Complementary Graph, and Clutter Removal
- [x] **Remove Bottom Reputation Bar**: Completely excised the out-of-place rating bar below the chart.
- [x] **Eliminate Overhead 4.9 Inner Card Box**: Converted the nested box in the reviews modal into an integrated, horizontal typographic summary strip.
- [x] **Clear Visual Hierarchy & Colored Rating Badges**:
  - Replaced repetitive star icon rows with single, background-tinted rating pills (`★ 5.0` in emerald, `★ 4.9` in amber, `★ 4.8` in warm orange).
  - Clean card structure: Client name + project subtitle on left; colored badge + date on right.
- [x] **Remove Nested Quote Card Boxes**: Formatted feedback text as an authentic italic quote with a subtle left accent line (`border-l-2`), removing inner gray card nesting.
- [x] **Complementary Monologg Brand Graph Palette**:
  - Colored Gig 1 (Feature Film Audition, 68%) with Monologg Performer Red (`#E50914`).
  - Colored Gig 2 (Commercial Voice-Over, 32%) with Monologg Client Violet (`#7C3AED`).
  - Updated curves, gradients, hover dots, and interactive tooltips to match.
- [x] **Move Graph Legends Above the Chart**: Placed legends in the header row next to the timeframe selector; removed bottom legend row.
- [x] **Clean Metric Cards**: Polished top 4 cards with consistent padding, subtle borders, and an intuitive "Reviews →" clickable affordance on Card 3.
- [x] **Standalone HTML Distribution Updated**: Re-compiled and inlined into `monologg/monologg-app.html`.
- [x] **Verification**: 24/24 test files passing (97/97 tests), monorepo typecheck clean (0 errors), build clean.
- [x] **Single Full-Width Spline Area Graph ("Earnings by Category")**:
  - Replaced the two-card split with one unified, responsive cubic Bézier spline area chart modeled after the Room Engagement reference.
  - Placed directly underneath the 4 metric cards (`Profile view`, `Project completed`, `Average rating`, `Total earnings`).
  - Displays the 2 active gigs/rate cards: Feature Film Audition (Blue `#0284c7`, 68%) and Commercial Voice-Over (Purple `#c084fc`, 32%).
  - Integrated interactive mouse-tracking hover states with vertical guide lines, highlight circles, and a floating data tooltip.
  - Added timeframe dropdown (`Last 6 months`, `Last 3 months`, `Past year`) and horizontal dashed grid lines with Y/X-axis ticks.
- [x] **Client Reviews & Studio Ratings Reputation Bar**:
  - Positioned directly underneath the single graph card.
  - Displays the 4.9★ rating badge, verified client count, and quick filter tag buttons (`All`, `5 Stars`, `Exceptional delivery`).
  - Directly launches the Client Reviews modal with preset filters on click.
- [x] **Searchable & Filterable Client Reviews Explorer Modal**:
  - Upgraded modal layout with reputation score overview (4.9★, 100% Recommended, Zero Disputes).
  - Real-time search input (`reviewSearch`) across client name, project, review note, and tags.
  - Multi-dimensional filters: Rating dropdown (`All`, `5 Stars`, `4 Stars`), Client dropdown (`All Clients` + dynamic list), and Date/Rating sort (`Newest First`, `Oldest First`, `Highest Rating`, `Lowest Rating`).
  - Compliment tag pills (`All`, `Exceptional delivery`, `Fast turnaround`, `Creative & professional`, `Great collaborator`).
  - Dynamic result counter and "Clear all filters" button.
  - Clean review cards with avatar initials, verified badge, gold stars, review quote, and direct `View Order Room →` navigation.
  - Clean empty state with "Reset All Filters" CTA.
- [x] **Standalone HTML Distribution Updated**: Rebuilt and inlined into `monologg/monologg-app.html` (1.38MB).
- [x] **Verification**: All 24 test files passing (97/97 tests), monorepo typecheck clean (0 errors), build clean.

### Session 99 — Bank Input Subscript Polish, 3-5% Receipt Watermark, 4 Analytics Cards & 2-Gig Breakdown, and Reciprocal Order Rating System
- [x] **Destination Bank Input Subscript Polish**:
  - Replaced custom accordion card with native `<select>` dropdown listing added accounts (`ADDED_BANK_ACCOUNTS`).
  - Added clean subscript text only: green checkmark (`CheckCircle2`), masked account number (`•••• {last4}`), and account holder name.
- [x] **Payout Receipt Modal Restored with 3–5% Watermark**:
  - Restored initial clean receipt modal layout (green checkmark, amount card, table breakdown).
  - Centered Monologg logo watermark (`LogoMark`) at 3.5% opacity (`opacity-[0.035] print:opacity-[0.04]`).
- [x] **Analytics Tab 4 Cards & 2-Gig Breakdown**:
  - Four top cards strictly configured: `Profile view`, `Project completed`, `Average rating`, `Total earnings`.
  - Earnings by Category chart updated to show only the 2 available rate cards/gigs with progress bars.
  - Fixed Monthly Booking Growth chart bar heights with explicit flex constraints.
- [x] **Reciprocal Rating System for Completed Orders**:
  - Built interactive 1–5 star rating in `OrderRoom.tsx` for `phase === "complete"`.
  - Added prefilled description chips (`CLIENT_RATING_TAGS` / `TALENT_RATING_TAGS`) and optional note textarea.
  - Stored reviews in `localStorage` under `monologg_order_review_${orderId}_${role}` and synced client reviews to `monologg_performer_reviews`.
- [x] **Client Ratings & Reviews Modal with Direct Project Navigation**:
  - Made "Average rating" analytics card clickable to open the Client Ratings & Reviews modal.
  - Displayed ratings, tags, notes, and direct `View Order Room →` links navigating to `/order/:id`.
- [x] **Standalone HTML Distribution Updated**: Rebuilt `monologg/monologg-app.html` (1.37MB).
- [x] **Verification**: All 24 test files passing (97/97 tests), monorepo typecheck clean (0 errors), build clean.

### Session 98 — Withdrawal Flow Polish: "Withdraw Funds" Modal, Added Accounts Selector, Standard Passcode Convention, and Monologg Watermarked Receipt
- [x] **Withdraw Funds Modal & Added Accounts Selector**:
  - Set Step 1 modal title to `"Withdraw Funds"`.
  - Replaced redundant dual `<select>` and static preview card with a unified destination bank account selector.
  - Selected account input card displays bank name as primary, subtext with masked account number & name, and green checkmark.
  - Clicking selector expands dropdown list to pick from added accounts (`Access Bank Plc`, `GTBank`, `Zenith Bank Plc`) with instant state synchronization.
- [x] **Standardized 4-Digit Passcode Input & Clean Copy**:
  - Modal title set to `"Enter your passcode"`.
  - Removed shield icon and `"Authorize Payout"` header.
  - Cleaned copy: `"Enter your 4-digit passcode to withdraw ₦{withdrawAmount} to {bankName}."`
  - Applied standard PIN input convention: `h-12`, `font-mono text-xl tracking-[0.4em]`, `placeholder="••••"`, centered text, `maxLength={4}`, `inputMode="numeric"`.
  - Primary CTA set to `"Withdraw Funds"`.
  - Direct transition to receipt modal upon passcode entry without browser alerts.
- [x] **Monologg Branded Receipt with Watermark**:
  - Official header with Monologg brand mark (`LogoMark`), `"MONOLOGG"` wordmark, `"Official Receipt"` badge, and reference code.
  - Centered subtle Monologg logo watermark (`LogoMark`) behind receipt body and amount card with high-contrast print support (`print:opacity-15`).
  - Added official Monologg Escrow Protocol Guarantee verification stamp.
  - Save / Print receipt action via `window.print()`.
- [x] **Standalone HTML Distribution Updated**: Rebuilt `monologg/monologg-app.html` (1.35MB) with freshly inlined bundle.
- [x] **Verification**: All 24 test files passing (97/97 tests), monorepo typecheck clean (0 errors), build clean.

### Session 97 — Order Room UX Polish: Conditional Revisions Gate, 3/2 CTA Hierarchy in Brand Color, and Clean Minimal Header Title
- [x] **Conditional Revision Gate**: Gated "Request Revision" so it only renders for digital file submissions (`!isOnsite`) and is hidden for verified live onsite appearances (`isOnsite`).
- [x] **3/2 CTA Hierarchy in Brand Color**:
  - Onsite gig (2 CTAs): Secondary outline `Dispute` + primary `Release ₦120,000` in solid brand purple (`var(--color-purple)`).
  - Online gig (3 CTAs): Secondary `Request Revision` in neutral fill + tertiary outline `Dispute` + primary `Release ₦120,000` in solid brand purple (`var(--color-purple)`).
  - Release Payment modal confirm button updated to solid brand purple.
- [x] **Clean Minimal Header Title**: Removed crowded badges (`[ORD-001]`, `[Phase 3: Review]`, `· 🔒 ₦120,000 in escrow · 📍 Onsite`) from navbar; formatted clean 2-line title and counterparty subtitle.
- [x] **Standalone HTML Distribution Updated**: Rebuilt `monologg/monologg-app.html` (1.4MB).
- [x] **Verification**: All 24 test files passing (97/97 tests), monorepo typecheck clean (0 errors), build clean.

### Session 96 — Order Room UX Refinement: Single-Box 4-Digit Verification, "Verify" CTA, Streamlined Auto-Presence Banner, Responsive Order Details Phases, and Client-Only Handshake Code
- [x] **Verify Live Appearance Modal Streamlined**:
  - Replaced inner venue location and arrival time cards with a single presence auto-verification chip: `"Presence auto-verified: Your venue location and arrival timestamp are automatically recorded for proof of attendance."`
  - Replaced split/multi-digit inputs with a single 4-digit input box with `maxLength={4}`, `inputMode="numeric"`, `placeholder="••••"`, monospace styling, and centered letter tracking.
  - Set primary modal CTA button strictly to `"Verify"`.
- [x] **Order Details Modal Overhaul**:
  - Redesigned Project Phases into responsive, standalone cards with phase number/checkmark pill, clear phase title, status chip (`Completed`, `In Progress` / countdown, `Upcoming`), and concise descriptions.
  - Consolidated redundant budget rows into an uncluttered Payment Summary block.
  - **Handshake Security Gate:** Gated arrival handshake code to `{isOnsite && role === "client" && ...}`, ensuring the performer never sees the code in their details view.
- [x] **Standalone HTML Distribution Updated**: Rebuilt `monologg/monologg-app.html` (1.4MB).
- [x] **Verification**: All 24 test files passing (97/97 tests), monorepo typecheck clean (0 errors), build clean.

### Session 92 — Onsite Live Gig Evidence Guardrail, Dual Deliverables Modal (Online vs. Onsite), Check-In & PIN Handshake Proof, and 48-Hour Inspection Auto-Release Timer
- [x] **Dual Deliverables Submission Modal**: Introduced segmented tabs for `Online Digital Files` (with drag & drop and staged file card) and `Onsite Live Appearance` proof.
- [x] **Onsite Live Appearance Verification**:
  - Live GPS coordinates chip (`6.5244° N, 3.3792° E · Lagos`) and arrival timestamp badge (`7:52 PM, Today`).
  - **Check-in & Check-out Method (Recommended):** GPS verified presence, arrival badge, interactive check-out toggle, and stage photo attachment option.
  - **PIN Handshake Method (High-Value):** 4-digit code display (`[ 4 ] [ 8 ] [ 2 ] [ 1 ]`) for client contact entry on site.
- [x] **Onsite Appearance Certificate in Chat**: Inserts a rich verified live performance certificate into the message thread upon submission.
- [x] **Live 48-Hour Inspection Auto-Release Countdown Timer**:
  - Activated during `Review` phase with live ticking countdown (`⏱ 47h 58m 20s`).
  - Automatically transfers escrow funds to performer upon timer expiry if uncontested.
  - Client actions to approve & release early, request revisions, or raise dispute.
  - Fast-forward button for instant demo evaluation.
- [x] **Client Revision Workflow**: Modal for client to submit adjustment notes, automatically pausing review timer and returning phase to Deliverables.
- [x] **Standalone HTML Distribution Updated**: Rebuilt `monologg/monologg-app.html` (1.42MB).
- [x] **Verification**: All 24 test files passing (97/97 tests), monorepo typecheck clean (0 errors), build clean.

### Session 91 — Order Room Visual Simplification, Executive Dark Chat Bubbles, Phase Milestones Stepper, and Interactive Submit Deliverable Modal Overhaul
- [x] **Executive Chat Bubbles & Calm Contrast**: Replaced eye-straining solid red sender bubbles with modern executive obsidian (`#18181B`) bubbles with clean white typography and soft shadows; client bubbles rendered as crisp elevated surface cards with subtle borders.
- [x] **Header Navigation & Discreet Role Simulator**: Cleaned header into a sleek white navbar with project title, `ORD-001` badge, and escrow status; removed the clunky full-width "Simulate Role" banner and placed a compact segmented toggle in the header.
- [x] **Phase Milestones Stepper**: Added a clean 4-step progress bar (`Briefing` → `Deliverables` → `Review` → `Complete`) providing immediate visual lifecycle status.
- [x] **Upgraded Deliverables Action Dock**: Replaced the alarming pink card with a clean white deliverable status card and primary action button.
- [x] **Interactive Submit Deliverable Modal**: Built a modern modal with drag & drop file dropzone, hidden real file input, rich File Preview Card, submission notes textarea, and 100% escrow reassurance note. Submitting smoothly advances order phase to Review.
- [x] **Standalone HTML Distribution Updated**: Rebuilt `monologg/monologg-app.html` (1.40MB) with inlined bundle.
- [x] **Verification**: All 24 test files passing (97/97 tests), monorepo typecheck clean (0 errors), build clean.

### Session 90 — Dedicated Fresh Page for Project Details, Clean Editorial Hierarchy, Search Filter Modal with Sliders & Clickable Craft Pills
- [x] **Fresh Page for Project Details**: Replaced popup modal dialog with an uncluttered, full-page editorial view when clicking into any project from discovery or applications.
- [x] **Editorial Content Hierarchy**: Removed tacky "Client Favorite" gradient card, colored icon badges, and AI slop. Structured clean sections for Creative Brief & Synopsis, Role Requirements with craft pills, Audition Sides with monospace box and 1-click "Copy Script", Deliverables & Schedule, and quiet Casting Client & Escrow verification.
- [x] **Sticky Action Sidebar**: Kept a focused right-hand action column with prominent fixed escrow rate, capacity meter, status-driven action center (pitch withdrawal, order room entry, or pitch submission), and 100% escrow protection guarantee.
- [x] **Clean Search Bar (Tags Stripped)**: Removed the category tag pill strip directly under the search bar to prevent visual noise.
- [x] **Project Filter Modal**:
  - Replaced inline accordion with a dedicated modal triggered by the `Filters` button with an active filter badge.
  - Interactive clickable pills for craft categories (`All Roles`, `Voice-Over`, `Actor`, `Model`, `Presenter / Host`, `Comedian`, `Musician`).
  - Budget range slider with live feedback (`₦0` to `₦600,000+` in `₦25,000` steps).
  - Client rating slider with live feedback (`0.0 ★` to `5.0 ★` in `0.1` steps).
  - Location and Status clickable chips with "Reset All" and "Show {N} Projects" actions.
- [x] **Standalone HTML Distribution Updated**: Rebuilt `monologg/monologg-app.html` with new inlined production bundle (1.39MB).
- [x] **Verification**: All 24 test files passing (97/97 tests), monorepo typecheck clean (0 errors), build clean.

### Session 89 — Airbnb-Style Fast Category Pills, Multi-Status Action Center Polish, Enriched 6-Craft Mock Projects Catalog, and Reactive Pitch State
- [x] **Airbnb-Style Category Quick Pills Strip**: Introduced horizontal category filter pill carousel (`All Roles`, `Voice-Over`, `Actor`, `Model`, `Presenter / Host`, `Comedian`, `Musician`) right below search and filter bar for instant 1-click filtering.
- [x] **Refined Multi-Status Action Center**:
  - `SELECTED`: Emerald celebration banner + primary CTA `Open Order Room` navigating to `/order/ORD-001`.
  - `SHORTLISTED`: Shortlist badge + informative review notice + `Withdraw Pitch` button.
  - `APPLIED`: Application badge + pitch quote + `Withdraw Pitch` button.
  - `REJECTED`: Empathetic non-blocking status guidance.
  - `WITHDRAWN`: Clean withdrawn state notice.
  - Immediate reactive state update on pitch withdrawal without needing to exit or reopen modal.
- [x] **Enriched 6-Craft Mock Projects & Applications**: Populated mock catalog with `P-006` (Radio Drama VO, REJECTED), `P-007` (Fashion Week Model, SELECTED via `myapp-4`), `P-008` (Afrobeats Jingle Musician), and `P-009` (Corporate Gala Comedian), guaranteeing every category, location, and status dimension has live preview records.
- [x] **Seamless "My Applications" Inspection Merge**: Merged catalog project briefs with individual performer applications, ensuring complete creative briefs, sides, and deliverables render when clicking any application card.
- [x] **Standalone HTML Distribution Updated**: Rebuilt `monologg/monologg-app.html` and `monologg/monologg-design-system.html` with all new features.
- [x] **Verification**: All 24 test files passing (97/97 tests), monorepo typecheck clean (0 errors).

### Session 88 — Standalone Single-File Distribution Regeneration (monologg-app.html & monologg-design-system.html) to Latest Production Build
- [x] **Production Bundle Rebuild**: Executed `npm run build:standalone` and `npm run build:designsystem` generating updated JS and CSS artifacts incorporating all Sessions 1–87 enhancements.
- [x] **Inlined HTML Regeneration**: Regenerated self-contained `monologg/monologg-app.html` (1.36MB) and `monologg/monologg-design-system.html` (320.4KB) with embedded script and styles, completely eliminating dependencies on dev servers or local asset servers.
- [x] **Feature Completeness in Standalone**: Double-clicking `monologg-app.html` now opens the complete, latest experience (5-dimension filter bar, Airbnb project detail view with Client Favorite banner and brief quick scan strip, availability calendar with right-click actions and Monologg LogoMark icons, video player modal, and profile completion gate).
- [x] **Verification**: All 24 test files passing (97/97 tests), monorepo typecheck clean (0 errors).

### Session 87 — Inline 5-Dimension Filter Bar Beside Search, Airbnb-Style Project Detail View with Fast Brief Tabs & Sticky Floating Action Card, and Unified Applications Inspection
- [x] **Inline 5-Dimension Project Filter Bar**: Replaced separate stacked dropdown selectors with an inline `Filters` toggle button (`h-10`, `rounded-xl`, badge counter) positioned directly beside the search bar. Expandable filter panel supports Category (6 roles), Budget Range (Under ₦100k, ₦100k–₦300k, Over ₦300k), Status (Open, Applied, Closed), Location (Lagos, Abuja, Remote), and Rating (4.8+ ★, 4.5+ ★, 4.0+ ★), accompanied by active filter chips and clear-all action.
- [x] **Enriched Project Brief Types & Mock Data**: Extended `ProjectSchema` with `location`, `clientRating`, `clientReviews`, `description`, `timeline`, `deliverables`, `scriptSample`, `additionalNotes`, and `escrowProtected`. Populated full realistic creative briefs across Nike VO, Nollywood Feature Film, Fintech Explainer, and Tech Summit Compere mock entries.
- [x] **Airbnb-Style Project Detail View**: Redesigned project modal into a spacious `max-w-5xl rounded-[28px]` two-column experience with static sticky header (client name, verified badge, `★ 4.9`, location, title), left fast-nav tabs (`Overview`, `Requirements`, `Script & Assets`, `Client & Escrow`), screenplay sides display in monospace screenplay card, and escrow guarantee breakdown.
- [x] **Sticky Floating Reservation & Dynamic Action Card**: Built right-column floating card with budget display (`₦200,000 Fixed Escrow Rate`), applicant capacity meter, escrow protection seal, and dynamic status-dependent CTAs (Already Applied with pitch quote & withdraw, Applications Closed, Profile Completion Gate checklist, or Ready to Apply audition pitch form).
- [x] **Unified My Applications Inspection**: Hooked My Applications cards to launch the identical rich Airbnb project view, allowing performers to effortlessly scan complete client briefs and check their submission status in one cohesive interface.
- [x] **Airbnb Visual Hierarchy Polish**: Added "Client Favorite" trust and social proof banner with rating and completed hires, "Brief at a Glance" 3-item icon strip (Craft & Role Fit, Production Window, 100% Escrow), one-click "Copy Sides" script action, and transparent "Compensation & Payout Breakdown" in the right floating card.
- [x] **Verification**: Zero TypeScript errors across all workspace packages (`packages/types`, `apps/api`, `apps/web`); 100% test pass (24/24 files, 97/97 tests).

### Session 86 — Public Profile 2-Card & 5XL Width Parity, Availability Page Double-Header/Calendar Cleanup with Right-Click Context Menu & Monologg Event Icon, Projects Search Bar Consistency
- [x] **Public Storefront 2-Card Cap**: Removed third rate card from `mocks/publicStorefront.ts`, capping rate cards strictly to 2 (`Feature Film Audition` ₦120,000, `Commercial Voice-Over` ₦45,000).
- [x] **Public Profile Width Parity**: Replaced `max-w-2xl` container in `PublicStorefront.tsx` with `max-w-5xl mx-auto px-4 py-6 lg:px-8 lg:py-8` matching creator profile structure and eliminating narrow "tab view" styling.
- [x] **Availability Double-Header & Double-Calendar Cleanup**: Eliminated duplicate `Availability` heading and redundant notification bell inside tab view; eliminated redundant 14-day rolling date strip and redundant date picker input.
- [x] **Calendar Right-Click Context Menu & Left-Click Inspection**: Left-clicking selects date and loads that day's schedule below the calendar; right-clicking (`onContextMenu`) launches custom floating menu with actions: "Mark as Available", "Mark as Unavailable", "Add Custom Slot", "Add Event".
- [x] **Calendar Visual State Distinction**: Unavailable days styled with grey canvas background, dashed borders, and `UNAVAILABLE` tag; open days remain clean with neutral styling and no dots/colors; Monologg bookings prominently display the official `LogoMark` crimson icon.
- [x] **Projects & Activity Search Bar Sizing Consistency**: Standardized Projects tab search input and dropdown selects to matching `h-10` (40px) height with `rounded-xl` and surface background, adding an interactive clear search (`X`) button.
- [x] **Verification**: All 24 web test files (97/97 tests) and all 56 API test files (580/580 tests) pass 100%; zero TypeScript errors across all workspace projects.

### Session 85 — Upload Modal Polish, 2-Card CTA Cleanup, Video Player Modal, Rate Card Redesign & Public Profile Parity
- [x] **Upload Modal Copy & Chip Polish**: Streamlined copy ("Upload a video showcase of your craft", "Click or drag video reel here", "MP4 or QuickTime · Max 90s · Up to 150MB"), removed redundant "Choose Video File" chip, and cleaned checklist.
- [x] **Rate Cards 2-Card Button Removal**: Header button beside the notification bell shows "Add Rate Card" only when 1 card exists, and is completely hidden once 2 cards are created.
- [x] **Reduced-Height Featured Reel**: Reduced height from tall aspect ratio to a sleek widescreen preview container (`h-48 sm:h-56 md:h-60`).
- [x] **Custom Video Player Modal (`WatchPerformanceReelModal.tsx`)**: Standalone modal playing performance reel with custom controls: Play/Pause, scrubber with time position (`00:18 / 01:30`), volume toggle, replay, fullscreen, and "Replace Reel" action button.
- [x] **Rate Cards Card Redesign on Profile**: Retitled section to "Rate Cards", removed Edit and Book buttons, placed an edit icon button in the top-right where the price was, and positioned the base rate price cleanly at the bottom.
- [x] **Public Storefront Profile Parity**: Redesigned `PublicStorefront.tsx` with cover banner, badges, social presence, bio, reduced-height reel with `WatchPerformanceReelModal`, and prominent "Book Now" CTA on rate cards.
- [x] **Verification**: All 24 test files passing, 97/97 tests passing (100% green), 0 TypeScript errors.

### Session 84 — Creator Profile Overhaul: Application Gate, In-Page Editing, Rate Cards Cap, Socials, Cover Banner & Performance Reel Modal
- [x] **Profile Completion Application Gate**: Creators must complete their Bio (>10 chars), Location, at least 1 Rate Card, and Featured Performance Reel before applying to projects. Gated modal with live 4-point checklist and direct link to profile.
- [x] **De-clutter Profile**: Removed Media Kit and Verification Video sections from the creator profile storefront tab.
- [x] **Rate Cards Limit & Adaptive CTA**: Enforced max 2 rate cards across onboarding and profile. Rate cards header CTA hidden for new users (0 cards), displays "Add Rate Card" once 1 card exists, and disables when 2 cards exist.
- [x] **In-Page Profile Editing**: Direct on-page editing mode on My Profile updating Bio, Stage Title, Location, Availability toggle, Tags, and Socials, syncing immediately with `Settings.tsx`.
- [x] **Social Media Presence**: Sleek Linktree/Upwork-style icon row supporting Instagram, YouTube, X, TikTok, Spotify, LinkedIn, and Website with custom handles and URLs.
- [x] **Customizable Cover Banner**: Replaced static header with customizable banner supporting user image uploads (JPG/PNG/WebP) and 4 curated studio gradient presets.
- [x] **Standalone "Upload Performance Reel" Modal**: Modal titled "Upload Performance Reel" with framing checklist and 150MB file size limit, omitting the verification block.
- [x] **Verification**: 24/24 test files passing, 97/97 tests passing (100% green).

### Session 82 — Onboarding Stepper Step 1 Restructuring, Clean Location/DOB & Auth Role Copy Streamlining
- [x] **Step 1: Personal Details Dedicated**: Separated personal details into the first onboarding step (`CreatorOnboarding.tsx`) matching design typography ("Tell us about yourself" / "Enter your basic details to personalize your profile.").
- [x] **Strict Binary Gender**: Restricted gender options strictly to `Female` and `Male` in a high-contrast 2-button grid.
- [x] **Date of Birth Calendar**: Provided interactive calendar input and popover while completely removing redundant age badge and age calculation display.
- [x] **Clean Location Dropdown**: Stripped away `NIGERIA`, `Verified Hub`, `Popular Entertainment Hubs` titles, and `Select` badges. Titled field `Location`, placeholder `Search location...`, rendering clean city names (`Ikeja`, `Lekki`, `Abuja`, etc.) while intelligently filtering across states as the user types.
- [x] **Step 2: Craft Selection**: Dedicated step for craft selection ("What best describes your craft?" / "Select your primary craft to personalize your profile.") with the 6 core categories.
- [x] **Auth Role Copy Streamlining**: Updated role switcher buttons and pills in `AuthFlow.tsx` to strictly `Performer` and `Client` (no slashes, no alternate titles).
- [x] **Test Alignment**: Updated `CreatorOnboarding.test.tsx` helper to traverse both Step 1 and Step 2 before testing Step 3 reel upload.
- [x] **Verification**: Web typecheck clean (0 errors); all 24 test files and 97 tests passing (100%).

### Session 81 — Performer Onboarding Overhaul & Storefront-to-Profile Modernization
- [x] **6 Craft Categories**: Replaced 8 niches in `CreatorOnboarding.tsx` with the 6 core categories from design (Actors, Public speakers, Comperes, Comedians, Artists, Creators).
- [x] **Performer Personal Essentials**: Added gender selector (`Female`, `Male`, `Non-Binary`, `Prefer not to say`), interactive date-of-birth mini-calendar picker with dynamic age calculation, and Nigerian location picker with auto-suggest for 28+ entertainment hubs.
- [x] **Strict Anti-AI Policy**: Implemented anti-AI warning banner on reel upload screen prohibiting AI-generated/cloned content and duplicated work with account ban warning and certification checkbox.
- [x] **AI Summary & Deletable Tag Suggestions**: Added editable Thespian AI performance summary in rich textarea with refine/reset controls, direct tag removal (`X`), and individual deletion of unwanted suggested tags.
- [x] **Rate Card Overhaul (Alpha Limit: 2)**: Added "Set your rate cards" header, `{count}/2 Rate Cards` limit badge, service description with "Refine with Thespian AI", Naira-only (`₦ NGN`) base pricing, delivery timeline, and `"Preview My Profile"` CTA.
- [x] **Storefront-to-Profile Nomenclature**: Replaced all user-visible "storefront" terminology with "profile" across `TalentDashboard.tsx`, `ClientDashboard.tsx`, `LandingPage.tsx`, and `Settings.tsx`.
- [x] **Verification**: Monorepo typecheck 0 errors; Vitest suite passing 100% (24/24 files, 97/97 tests).

### Session 80 — Platform-Wide Copy Standardization: Talent to Performer
- [x] **Client Platform Copy Updates**: Replaced all user-visible "talent" copy with "performer" across `ClientDashboard.tsx`, `ClientOnboarding.tsx`, and `ProjectBrief.tsx` (`Find Performers` tabs, `Performers Hired` metrics, `Performer Acquisition Funnel`, `Shortlisted Performers`, `Filter Performers by Physical Features`, `Performer Requirements`).
- [x] **Performer Platform Copy Updates**: Updated portal labels, headlines, action banners, and empty states across `TalentDashboard.tsx`, `OrderRoom.tsx`, `Checkout.tsx`, `AuthFlow.tsx`, `Settings.tsx`, `HelpSupport.tsx`, `SetPassword.tsx`, `ExternalBookingEntry.tsx`, `PublicStorefront.tsx`, `MediaKitManagement.tsx`, and `DesignSystem.tsx` (`Performer Portal`, `New Creative Performer`, `Complete your Performer Setup`, counterpart labels `Performer`).
- [x] **Test Suite Synchronization**: Updated test fixtures and assertions across `ClientDashboard.test.tsx`, `ProjectBrief.test.tsx`, `AuthFlow.test.tsx`, `HelpSupport.test.tsx`, and `authFlowStress.test.tsx` ensuring 100% test pass.
- [x] **Verification**: Zero TypeScript errors (`npx pnpm -r typecheck`), web tests passing (24/24 files, 97/97 tests), API tests passing (56/56 files, 580/580 tests).

### Session 72 — Universal Select Dropdown Chevron, Inset Padding & Form Input Height Standardization
- [x] **Global Select Dropdown Styling**: Added universal CSS rule in `tokens.css` forcing `appearance: none`, custom vector SVG chevron down icon, `background-position: right 0.875rem center` (14px inset), and `padding-right: 2.75rem`.
- [x] **Form Input & Select Height Standardization**: Standardized `<select>` dropdown heights across form modals and pages (`Withdrawal Authorization`, `Recurring Availability`, `Add Service`, `Settings`, `Project Brief`, `Client Dashboard`) to match `<Input>` height `54px` (`h-[54px] rounded-[var(--radius-lg)] px-4 text-base`).
- [x] **Input Overlay Alignment**: Updated inline currency dropdown select positioning (`right-3.5 pl-2.5 pr-8`) and date picker input calendar icon (`right-3 pr-9`) in `TalentDashboard.tsx` and `CreatorOnboarding.tsx`.
- [x] **Verification**: Ran `npx pnpm -r typecheck` (0 errors) and Vitest suite (24 test files, 97/97 tests passed 100%).

### Session 71 — Talent Availability Page UI Overhaul based on Inspiration Screenshots
- [x] **Header & Navigation Toolbar**: Built top header bar with `< Prev >`, `Today`, `< Next >` navigation controls, Month/Year title, 3-view switcher (`Month | Week | Day`), and date picker input with calendar icon (`Calendar`).
- [x] **14-Day Rolling Date Selector**: Implemented horizontal date pill strip (`Wed, Aug 19`, `Thu, Aug 20`, `Fri, Aug 21 (Active Red)`...) with active solid Mono-Red accent styling and scrollable container.
- [x] **Enhanced Month View Grid**: Built 7-day grid with day numbers, dot indicators, event previews, and active solid red date pill selection.
- [x] **7-Day Week View Grid**: Implemented 7-column time-grid layout (Monday – Sunday), 8:00 AM – 8:00 PM time axis, red horizontal current time line with live time pill (`11:30`), colored event blocks placed in grid cells, and click-to-view/add popovers (matching Image 3 inspiration).
- [x] **1-Day Day View Grid**: Implemented single-column time-grid layout with hourly rows, red current time line, full-width event cards, and event detail popovers (matching Image 4 inspiration).
- [x] **Interactive Modals & Popovers**: Built `actionPopover` modal ("Mark as Available", "Mark as Unavailable", "Add Event") and `selectedEventModal` detail modal (Title, Date, Time, Venue, Description, Delete `Trash2` action) matching Images 2 & 4 inspiration.
- [x] **Dedicated Stress Test Suite**: Built `TalentDashboardAvailability.test.tsx` verifying Month view, 7-column Week view, 1-column Day view, period navigation controls, date cell popover actions, explicit slot creation/deletion, personal event creation/deletion, recurring availability form, and Google Calendar sync modal.
- [x] **Verification**: Ran `npx pnpm -r typecheck` (0 errors) and Vitest suite (24 test files, 97/97 tests passed 100%).

### Session 69 — Comprehensive Non-Technical Tools & Integrations Handoff Guide
- [x] **Non-Technical Tools Guide (`tools.md`)**: Authored `monologg/handoff/tools.md` explaining all 22+ tools, third-party integrations, services, APIs, setup steps, introduced phases, and architectural importance using real-world analogies (hotel architecture).
- [x] **Environment Variables Master Reference**: Created complete production environment variable setup reference table in `tools.md`.
- [x] **Handoff Index Update**: Updated `monologg/handoff/README.md` to integrate `tools.md` into the index, reading order, and document maintenance rules.

### Session 68 — Google OAuth Architecture Review, End-to-End Stress Testing & Navigation Verification
- [x] **End-to-End Stress Test Suite**: Built `apps/web/src/app/pages/authFlowStress.test.tsx` verifying Google signup/login metadata extraction, onboarding stepper routing vs direct dashboard routing, profile state sync, and persistent-session logo navigation.
- [x] **Backend Sync Verification**: Confirmed `POST /api/v1/auth/session/sync` persistence on `User`, `Creator`, and `Client` Prisma models with `AuthEvent` logging.
- [x] **Verification**: Workspace typecheck (`0 errors`), web tests (`22/22 files, 86/86 tests passed`), and API tests (`56/56 files, 579/579 tests passed`).

### Session 67 — bg.svg Background Pattern & Hover-to-Reveal Spotlight Integration
- [x] **Asset Deployment**: Deployed `/bg.svg` vector pattern asset into `apps/web/public/bg.svg`.
- [x] **Interactive Canvas Upgrade**: Configured `WebGLHeroCanvas.tsx` to tile `/bg.svg` canvas pattern with ambient scroll pulse + mouse hover spotlight reveal.
- [x] **Page Integration**: Applied `<WebGLHeroCanvas>` to Hero, Escrow Calculator, Final CTA, and Footer sections on `LandingPage.tsx` and `AuthFlow.tsx`.
- [x] **Verification**: Ran `npx pnpm -r typecheck` (0 errors) and web unit test suite (`21/21 files, 82/82 tests passed`).

### Session 66 — Google Auth Identity Sync, Avatar Display, Logo Navigation & Hand-Off Updates
- [x] **Google OAuth Profile Sync**: Synced Google user photo `avatarUrl` and full name across `LoggedInUserSession`, `state-sync.ts`, and `api-client.ts`.
- [x] **Sidebar Avatar Display**: Rendered Google avatar photo in `<Avatar src={identity.avatarUrl}>` with initials fallback in `Sidebar.tsx`, `ClientDashboard.tsx`, and `TalentDashboard.tsx`.
- [x] **Persistent-Session Logo Navigation**: Ensured clicking the Monologg logo navigates to `/` (Landing Page) while preserving active logged-in user session state.
- [x] **Sign Out Behavior**: Verified Sign Out clears session state via `apiClient.logout()` and redirects to `/` in logged-out mode.
- [x] **Verification**: Ran `npx pnpm -r typecheck` (0 errors) and web unit test suite (`21/21 files, 82/82 tests passed`).

### Session 65 — GitHub Repository Front Page & Vercel Deployment Configuration Cleanup
- [x] **Root README**: Created comprehensive root `README.md` for GitHub repository landing page display.
- [x] **Automated Vercel Deployment**: Created root `vercel.json` and `package.json` pointing Vercel directly to `@monologg/web` build output.
- [x] **Workspace Cleanup**: Deleted redundant root `Vector map.svg` asset and moved design documents into `monologg/reference-docs/`.

### Session 64 — Account Activity Log Service & Repository Status Check
- [x] **Activity Service**: Created `monologg/apps/api/src/services/activity.ts` defining `ActivityAction` union type and best-effort `logActivity` helper for `UserActivity` database model.
- [x] **Verification**: Executed workspace typecheck (`npx pnpm -r typecheck`) across `packages/types`, `apps/api`, and `apps/web` passing 100% clean.
- [x] **Handoff Sync**: Synced Sessions 61–64 details across all 5 handoff living documents.

### Session 63 — Signed-in Header Menu, Google OAuth Avatars & Onboarding Routing
- [x] **Signed-in Landing Header**: Rendered signed-in avatar/initials dropdown with 4 role-aware navigation shortcuts (Dashboard, Media Kit/Post a Project, Transactions, Settings) and Sign Out.
- [x] **Sign Out Fix**: Fixed `apiClient.logout()` to clear local state sync and fixed Sidebar Sign Out button to invoke full logout path.
- [x] **Google Avatar Persistence**: Added `avatarUrl` field to Creator/Client schema, migrated database, and synced Google OAuth avatar photos across session sync and settings.
- [x] **Onboarding Routing**: Routed new OAuth/OTP users to onboarding steppers (`/onboarding` / `/onboarding/client`) while sending returning accounts directly to dashboard.

### Session 62 — AuthFlow UI Redundancy Cleanup & Real Google OAuth
- [x] **Auth UI Streamlining**: Cleaned up redundant mode toggle buttons on registration screen.
- [x] **Real Google OAuth**: Integrated `supabase.auth.signInWithOAuth` flow replacing simulated modal.

### Session 61 — Deep Unused Asset Tree Relocation
- [x] **Path Length Cleanup**: Deleted unreferenced `monologg/brand/mono fonts/` tree and relocated `apps/web/src/imports/reference-screenshots/` to `monologg/reference-screenshots/`.

### Session 60 — Manual Currency Input, Auto-Expanding Sliders & Currency Conversion
- [x] **Shared Currency Utility**: Created unified `currency.ts` helper with stable exchange rates, currency conversion methods, and added rotating `getRandomLimitError` warnings for overlarge amounts.
- [x] **Limit Warning Modals**: Added validation modals to the Escrow Calculator (`LandingPage.tsx`) and Project Brief Stepper (`ProjectBrief.tsx`) budget inputs, triggering when values exceed `999,999,999,999,999` in any currency.
- [x] **Escrow Calculator**: Refactored `LandingPage.tsx` to shift manual input to the top contract total display, keep slider values read-only, and dynamically scale slider max limits.
- [x] **Mobile Responsiveness Polish**: Scaled stats columns, stacked email forms on mobile (<480px), shortened card header titles and CTA text, and scaled carousel talent cards down dynamically to prevent clipping.
- [x] **Project Brief Stepper**: Added manual text input, auto-expanding range slider, dynamic presets matching selected currency, and currency conversion. Fixed bug where non-Naira brief budget was posted with incorrect values.
- [x] **Creator Onboarding & Talent Dashboard**: Updated base price input form to automatically convert rate card values when selecting a new currency.
- [x] **Verification**: Web typecheck (`tsc --noEmit`) and Vitest test suite (21 test files, 78 tests passing 100%) passed successfully.

### Session 59 — Interactive Multi-Currency Dropdown Selector & Multi-Currency Input Support
- [x] **Escrow Calculator Multi-Currency Selector**: Built an interactive currency dropdown supporting `NGN`, `USD`, `GBP`, `EUR`, `GHS`, `KES`, and `ZAR` with flag icons and automatic price re-calculation.
- [x] **Project Brief Multi-Currency Buttons**: Added multi-currency pill selection row to `ProjectBrief.tsx` Step 4 budget view.
- [x] **Verification**: Web typecheck (`tsc --noEmit`), Vitest test suite (21 test files, 78 tests passing 100%), and Vite production build (`dist/assets` compiled in 2.11s) verified clean.

### Session 58 — Focused Active Node & Inactive Flag Beacons Map UX
- [x] **Clutter-Free Map UX Overhaul**: Rendered active focus node as a bold Mono-Red pill card (`bg-[#F13030]`) with animated radar pulse, while rendering inactive nodes as sleek 32px circular flag beacon pins with `opacity-60` and hover tooltips.
- [x] **Eliminated Badge Overlap**: Completely solved card overlap across West/East Africa (Lagos, Accra, Nairobi).
- [x] **Verification**: Web typecheck (`tsc --noEmit`), Vitest test suite (21 test files, 78 tests passing 100%), and Vite production build (`dist/assets` compiled in 2.11s) verified clean.

### Session 57 — High-Resolution Dot-Matrix Vector Map Asset Integration
- [x] **Dot-Matrix Vector Map Asset Integration**: Copied high-resolution `Vector map.svg` asset into `monologg/apps/web/public/vector-map.svg`.
- [x] **VectorWorldMap Component Overhaul**: Rendered `/vector-map.svg` dot matrix world map with dark mode inverted styling matching Inspiration Image 2.
- [x] **Precise Location Pin Coordinates**: Calibrated geographic location pin coordinates for Lagos, Accra, Nairobi, Johannesburg, London, and New York.
- [x] **Verification**: Web typecheck (`tsc --noEmit`), Vitest test suite (21 test files, 78 tests passing 100%), and Vite production build (`dist/assets` compiled in 2.08s) verified clean.

### Session 56 — Client Purple Role Theme, Vector World Map SVG & Hero Card Contrast
- [x] **Client Role Theme Scope**: Updated `OrderRoom.tsx` container class and styles to dynamically switch to Mono-Purple (`#7B00FE`) when simulating Client role.
- [x] **AuthFlow Upgrades**: Removed shield icon, upgraded headline to all-caps with SVG line emphasis ("YOUR CRAFT. ON YOUR TERMS. INSTANTLY BOOKED."), added WebGL grid reveal canvas to left panel background, and dynamically adapted page theme when switching roles.
- [x] **Vector World Map SVG**: Replaced dot grid canvas with `VectorWorldMap` rendering SVG continent landmass outlines (North America, South America, Europe, Africa, Asia, Australia) with custom stroke/fill control and location pin badges.
- [x] **Dashboard Hero Card Contrast & Home Tab Clean-up**: Upgraded hero money amount text (`₦148,000` / `₦850,000`) to crisp white (`#FFFFFF`) with lighter brand red (`#FFECEC`) and purple (`#F1E9FF`) washes. Removed stat preview cluster card from Home tab (moved to Analytics tab).
- [x] **Talent Roster Headline Extension**: Extended headline to `"Discover & Book Top Performing Artists Instantly"`.
- [x] **Verification**: Web typecheck (`tsc --noEmit`), Vitest test suite (21 test files, 78 tests passing 100%), and Vite production build (`dist/assets` compiled in 2.06s) verified clean.

### Session 55 — Map Redesign, Dark Mode Card Fixes & Hero Reveal Revert
- [x] **SVG Dot-Matrix World Map**: Built DotMatrixWorldMap component with SVG landmass dot matrix and country flag pin markers (🇳🇬, 🇬🇭, 🇰🇪, 🇿🇦, 🇬🇧, 🇺🇸) matching Attachments 1 & 2.
- [x] **Reverted Hero Grid Reveal & Added Footer Reveal**: Reverted WebGL grid reveal to status quo subtle opacity (`0.25`) and added matching grid reveal to footer.
- [x] **Dark Mode White Card & Input Fixes**: Fixed hero waitlist input form pill in dark mode (`#16161A`, `#F5F5F0`) and replaced hardcoded text classes in AuthFlow left panel with CSS variables.
- [x] **Sticky Navigation Header & Base Invite Link**: Fixed top header sticky behavior and updated copied share invite link to copy `window.location.origin` (directing visitors straight to landing page).
- [x] **Dashboard Analytics Organization**: Moved Analytics quick action to dedicated Analytics tab and placed Orders in Quick Actions.
- [x] **Verification**: Web typecheck (`tsc --noEmit`), Vitest test suite (21 test files, 78 tests passing 100%), and Vite production build (`dist/assets` compiled in 2.09s) verified clean.

### Session 54 — Sci-Fi Radar Trust Map & App-Wide Overhaul
- [x] **Working Copy Link Button**: Added `Copy` button to waitlist invite pill with clipboard copy and 2.5s "Copied!" checkmark feedback.
- [x] **Sci-Fi Interactive Global Radar Map**: Replaced static testimonials with an interactive Sci-Fi Radar Map of Africa & Global Hubs (Lagos, Accra, Nairobi, Joburg, London, NY) featuring glowing pulse nodes and popping performer cards.
- [x] **Hero Red Squiggle & Enhanced Grid Reveal**: Added SVG hand-drawn red squiggle underline beneath `"INSTANTLY BOOKED"` and enhanced `WebGLHeroCanvas` hover grid contrast (`0.75` max opacity).
- [x] **Carousel Edge Fade Masks & Slower Drift**: Added left/right gradient mask overlays (`from-[var(--color-bg-surface-2)] via-transparent to-[var(--color-bg-surface-2)]`) and set `45s` Framer Motion duration.
- [x] **Interactive QR Code Scan Modal**: Added `QRCodeModal` overlay triggered by floating QR badge.
- [x] **App-Wide Navigation View Redesign**: Overhauled Rate Cards, Availability, Shortlist, Activity, Analytics, Earnings/Transactions, Projects, Order Room, Verification Video, and Settings across Client and Talent web apps.
- [x] **Verification**: Web typecheck (`tsc --noEmit`), Vitest test suite (21 test files, 78 tests passing 100%), and Vite production build (`dist/assets` compiled in 2.29s) verified clean.

### Session 53 — Targeted UI Polish, Dark Mode Fixes & Talent Carousel
- [x] **Primary Red + Outlined Secondary CTA Pair**: Fixed side-by-side CTA button pair in final conversion section.
- [x] **Dark Mode Contrast Fix Across Cards**: Replaced white card backgrounds in dark mode with dark surface containers (`#16161A`, `#26262E`) and high-contrast text (`#F5F5F0`, `#A6A6B0`) across Step cards, FAQ accordion, and talent cards.
- [x] **Auto-Looping 7-Talent Carousel**: Built an infinite horizontal auto-scrolling Framer Motion talent carousel with 7 artist profiles.
- [x] **Clean Hero Background & Hover Blueprint Grid**: Reworked `WebGLHeroCanvas.tsx` to default to a plain background and reveal an architectural blueprint grid on hover.
- [x] **Wise-Style Auth / Sign-Up Page Overhaul**: Reworked `AuthFlow.tsx` with segmented role switcher (`Talent / Creator` vs `Client / Employer`), rounded-full inputs, and high-contrast dark/light mode copy.
- [x] **Verification**: Web typecheck (`tsc --noEmit`), Vitest test suite (21 test files, 78 tests passing 100%), and Vite production build (`dist/assets` compiled in 2.08s) verified clean.

### Session 52 — Monologg Brand Identity Remix & Oversized Logotype Footer
- [x] **Monologg Native Brand Palette**: Replaced Wise green tokens with Monologg Mono-Red (`#F13030`), Mono-Purple (`#7B00FE`), soft washes, and clean neutrals (`#F8F8F6`, `#16161A`, `#0D0D0F`).
- [x] **Dark Mode & WCAG AA Contrast**: Audited dark mode contrast variables in `tokens.css` ensuring >= 4.5:1 text contrast on dark cards, accordions, and inputs.
- [x] **Oversized 8Returns/Lumos Logotype Footer**: Built an edge-to-edge "MONOLOGG" display typography footer in `LandingPage.tsx` with contact email, multi-column navigation links, social links with external arrows (`↗`), and certification badges (`NDPA Compliant`, `FINCRA Escrow Verified`).
- [x] **Unified Typography Hierarchy**: Standardized base body text at `16px` across all sections with responsive mobile font scales.
- [x] **Monologg Copy Alignment**: Replaced Wise terms with `"MONOLOGG ESCROW PROTOCOL"`, `"PROPRIETARY THESPIAN AI SCANNER"`, and `"FINCRA SECURED ESCROW LOCK"`.
- [x] **Verification**: Web typecheck (`tsc --noEmit`), Vitest test suite (21 test files, 78 tests passing 100%), and Vite production build (`dist/assets` compiled in 2.11s) verified clean.

### Session 51 — Hyper-Design & Wise Design System Overhaul
- [x] **Wise & Hyer Design Tokens**: Integrated Wise Forest Ink (`#163300`), Lime Voltage (`#9fe870`), Linen Mist (`#e2f6d5`), Fog (`#e8ebe6`), Charcoal (`#454745`), and Hyer Clay Ember (`#bc7155`) tokens in `tokens.css`. Added Google Fonts import for Inter 900 heavy display typography and DM Sans in `fonts.css`.
- [x] **WebGL Ambient Hero Canvas**: Created `WebGLHeroCanvas.tsx` for mouse/scroll-reactive particle mesh animations in the Hero.
- [x] **Hyper-Design Luxury Scale Landing Page**: Reworked `LandingPage.tsx` with architectural block display type (Wise Sans / Inter 900 at 105px display scale), Wise Escrow Calculator card (`WiseBookingCalculator`), 3D tilt talent cards with audio player preview, 3-step workflow, creator testimonial mosaic grid, FAQ accordion, and floating QR app download badge.
- [x] **Wise-Style Button & Layout Matrix**: Extended `Button.tsx` with `lime`, `forest`, `outline-pill`, and `clay` variants; updated `DesignSystem.tsx` with Web vs Mobile layout breakdown matrix.
- [x] **Verification**: Web typecheck (`tsc --noEmit`), Vitest suite (21 test files, 78 tests passing 100%), and Vite production build (`dist/assets` compiled in 2.10s) verified clean.

### Session 50 — QA Master Sweep & Compilation Fixes
- [x] **API Zod Schema Fixed**: Added `SUPABASE_JWT_SECRET` to the Zod schema in `env.ts` to prevent Fastify crash and typecheck compile errors.
- [x] **Database Schema Synced & Seeded**: Ran `prisma db push --accept-data-loss` to sync database with the schema and successfully ran seed data.
- [x] **Web Compilation Errors Resolved**: Fixed missing imports (`X` icon in `CreatorOnboarding`, `Modal` in `Settings`, `appStateSync` in `AuthFlow`), corrected `Badge` component props from `variant` to `tone`, fixed `appStateSync` method name mismatches (`setBankDetails` -> `updateBankDetails`, `withdraw` -> `withdrawFunds`), and resolved type compatibility mismatches.
- [x] **Verification**: Workspace passes `tsc --noEmit` and Vitest unit test suite (100% green: 577 API, 78 Web).

### Session 40 — Fix ReferenceErrors, Calendar Tabs Copy & Auth Demo Routing
- [x] **Production ReferenceErrors Fixed**: Imported missing `X` icon from `lucide-react` and declared `paymentCards` / `deleteCardModal` state variables in `Settings.tsx` to fix Vercel runtime crashes.
- [x] **Availability Calendar Tabs & Copy**: Updated calendar switcher tabs to `"Month"`, `"Week"`, `"Day"` and condensed helper text to single responsive line: `"Click a day to see and edit everything scheduled — an unconfigured day is open across normal hours by default."`.
- [x] **Auth Demo Routing**: Updated Talent and Client demo buttons in `AuthFlow.tsx` to set `localStorage.setItem("monologg_is_new_user", "false")` and route directly to default regular user dashboards (Emeka Johnson / FilmCraft Studios).
- [x] **Verification**: Vitest Web test suite 100% passing (21 test files, 78 tests). Vite production build: 2129 modules transformed cleanly.

### Session 39 — Platform Stress Testing, Bug Fixes & Withdrawal / Auth UX Overhauls
- [x] **Creator Onboarding Style Tags Editing**: Enhanced Step 4 tag editing (`CreatorOnboarding.tsx`) with preset performance style tags (`Warm Texture`, `Conversational`, `Expressive`, `High Energy`, `Deep Voice`, `Commanding`, `Narrative`, `Character`), 1-click toggling, custom tag creation, and tag removal.
- [x] **Settings Payment Methods**: Integrated Payout Bank Account Details editor (Bank Name, Account Number, Account Name) into section `"payment"` of `Settings.tsx` for Talent users with instant state synchronization via `appStateSync.setBankDetails()`.
- [x] **Withdrawal Authorization Flow Overhaul**: Refactored `WithdrawalModal` (`TalentDashboard.tsx`) into a clean 2-step process: **Step 1: Amount (₦) + Destination Bank Account Selector** -> **Step 2: 4-Digit Security Passcode Verification** -> **Instant Payout & Receipt**. Completely removed email OTP clutter.
- [x] **Streamlined Auth UI**: Cleaned up `AuthFlow.tsx` by removing redundant Magic Link / Email OTP secondary buttons, highlighting Google Sign-In as primary, and refining Email/Password login/register layouts.
- [x] **Verification**: Vitest Web test suite 100% passing (21 test files, 78 tests).

### Session 49 — Phase 12C: Withdrawal Email OTP Gate
- [x] Added `WithdrawalRequestStatus` enum, `WithdrawalRequest` model, `WithdrawalOtp` model (`codeHash`, `expiresAt`, `attempts`, `verifiedAt`), and relations on `User` model.
- [x] Created additive SQL migration `20260803010000_phase12c_withdrawal_otp`.
- [x] Added `WITHDRAWAL_OTP_MODE` (`mock` | `live`) config flag to `env.ts` and `.env.example`.
- [x] Implemented core withdrawal service (`apps/api/src/services/withdrawals.ts`) with `crypto.randomInt` code generation, Argon2id hashing, rate limiting (3/10m per withdrawal, 5/1h per user, 60s cooldown), 10-minute expiry, 5-attempt lockout, and generic error leakage protection.
- [x] Created server routes `POST /api/v1/withdrawals`, `POST /api/v1/withdrawals/:id/otp/request`, `POST /api/v1/withdrawals/:id/otp/verify`, `POST /api/v1/withdrawals/:id/release` (security gated with 409 Conflict if unverified), and `GET /api/v1/dev/withdrawals/:id/otp` (dev helper).
- [x] Added withdrawal methods to `api-client.ts` (`initiateWithdrawal`, `requestWithdrawalOtp`, `verifyWithdrawalOtp`, `getDevWithdrawalOtp`).
- [x] Integrated 2-step OTP flow into the Withdrawal modal in `TalentDashboard.tsx` (amount/passcode input -> 6-digit OTP verification UI with copy, countdown, and resend link).
- [x] Written comprehensive test suite `apps/api/src/routes/withdrawals.test.ts` (12 tests covering crypto, Argon2id storage, happy path verify/release, 5-attempt lockout, 10m expiry, rate limits, generic errors, and release security gating). Verified 100% passing across API (577 tests) and Web (78 tests).
- [x] Extended `User` model with `supabaseUserId` (nullable, unique), extended `AuthProvider` enum (`MAGIC_LINK`, `EMAIL_OTP`), and added `AuthEvent` audit table.
- [x] Created additive SQL migration `20260803000000_phase12b_supabase_auth`.
- [x] Configured Supabase environment variables schema (`SUPABASE_MODE`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`) in `apps/api/src/config/env.ts` and `.env.example` files.
- [x] Implemented `SupabaseAuthProvider` interface and provider seam (`mock` and `real` implementations using HS256 JWT verification).
- [x] Built server routes `POST /api/v1/auth/session/sync` (verifies Supabase token, links/creates User, issues app JWT, writes `AuthEvent`, sends notifications) and `POST /api/v1/auth/otp/request` (rate-limited 1 req/60s).
- [x] Built web client Supabase singleton `apps/web/src/lib/supabase.ts` (null in ALL-MOCK mode) and `AuthCallback.tsx` route handler.
- [x] Updated `AuthFlow.tsx` with real Google OAuth redirect trigger, expandable Magic Link form, Email OTP request + 6-digit verification code screen.
- [x] Written comprehensive test coverage (API: `authSupabase.test.ts`, Web: `supabaseKeyCheck.test.ts`, `AuthCallback.test.tsx`). Verified 100% passing across API (565 tests) and Web (78 tests).
- [x] Added `isNewUser` mode toggles on Talent and Client dashboards for testing zero-data states.
- [x] Built interactive Onboarding Action Nudges Checklist card on Talent Home tab.
- [x] Built interactive Onboarding Action Nudges Checklist card on Client Home tab.
- [x] Built zero balance / zero spend hero states and zero activity states on Talent & Client Home tabs.
- [x] Built dedicated empty state views with descriptive copy and action CTAs across all Talent navigation tabs (Rate Cards, Availability/Calendar, Projects, Orders, Activity, Earnings, Analytics).
- [x] Built dedicated empty state views with descriptive copy and action CTAs across all Client navigation tabs (Discover, Projects, Orders, Shortlist, Activity, Analytics).
- [x] Verified full unit test suite passing cleanly (19 test suites, 72 tests).

### Phase 1 — Get the product running
- [x] Extract and identify real source code from the four Figma Make export zips
- [x] Assemble a runnable app (`index.html`, `src/main.tsx`, app-mode `vite.config.ts`) — original export was library-mode only
- [x] Install dependencies
- [x] Publish a one-off shareable static preview (Artifact)
- [x] Stand up a persistent local dev server at `http://localhost:5173` (`app/`, `npm run dev`)

### Phase 2 — Design system audit + remediation
- [x] Full audit: token usage consistency, duplicated components, radius/color/motion drift
- [x] Extract design tokens from an inline JS string (`Root.tsx`) into a real stylesheet, `src/styles/tokens.css`
- [x] Retire and delete two dead/conflicting CSS files (`theme.css`, `DoyinXMonologgCopy/styles.css`)
- [x] Centralize motion durations/eases (`src/lib/motionTokens.ts`)
- [x] Centralize modal scrim color (`--color-overlay` / `--color-overlay-strong`)
- [x] Fix untokenized radius classes in `TalentDashboard.tsx` (41) and `ClientDashboard.tsx` (16)
- [x] Fix `text-gray-*` bypasses of the text-color tokens
- [x] Build 6 shared components (`Modal`, `Avatar`, `Badge`, `FormField`, `Sidebar`, `BottomNav`) and wire them into every real call site
- [x] Build a live, self-updating `/design-system` documentation route
- [x] Build a standalone, shareable static build of the design-system page (`npm run build:designsystem`)

### Phase 3 — File cleanup
- [x] Remove dead/placeholder files from `app/` (confirmed with user first)
- [x] Remove original export zips + `.DS_Store` from the parent folder (confirmed with user first)
- [x] Verify build stayed byte-identical after each cleanup round

### Phase 4 — Handoff documentation
- [x] `design.md` — product, stack, and design-system reference
- [x] `log.md` — chronological implementation record
- [x] `bug.md` — defect log with severity
- [x] `process.md` — plain-language walkthrough
- [x] `README.md` + `implementation-plan.md` — living-document index and status board

### Phase 5 — Standalone builds + dependency cleanup
- [x] Diagnose why `index.html`/`design-system.html` didn't open outside the dev server (Vite source shells, not runnable files)
- [x] Add a hash-router build target (`AppStandalone.tsx`, `createHashRouter`, `vite.config.standalone.ts`) so the app works with no server
- [x] Build and inline both into single self-contained files: `monologg-app.html`, `monologg-design-system.html` (project root)
- [x] Audit all 26 dependencies against real usage; remove 20 unused packages + `vite-plugin-dts`; keep `vite` (confirmed with user — needed for localhost + rebuilds)
- [x] Fix the CSS-only `tw-animate-css` import the dependency-usage grep missed (see `bug.md` #5)
- [x] Verify all three build targets + dev server still work after cleanup; regenerate the two standalone HTML files

### Phase 6 — File structure reorganization
- [x] Survey entire tree; split findings into confirmed-dead vs. judgment calls
- [x] Delete confirmed-dead files (`.DS_Store`s, 4 orphaned parent-level config files with no `package.json` to run them)
- [x] Confirm with user before touching anything ambiguous (unused screenshots, old draft doc, renaming/README)
- [x] Rename `dev-preview/` → `app/`
- [x] Move unused logo PNGs into a labeled `brand/` folder
- [x] Move 18 unreferenced Figma screenshots into `app/src/imports/reference-screenshots/`
- [x] Move 3 superseded design/spec drafts into `app/src/imports/historical-drafts/`
- [x] Add a root-level `README.md` for wayfinding (technical + non-technical)
- [x] Update every `dev-preview` reference across `handoff/*.md` to `app`
- [x] Rebuild all three targets + smoke-test dev server to confirm the rename broke nothing; regenerate the two standalone HTML files

### Phase 7 — Dark-mode toggle fix (standalone design-system page)
- [x] Diagnose why the toggle silently did nothing (no `ThemeContext.Provider` in the standalone entry's render tree)
- [x] Extract theme state/persistence into a shared `useThemeState()` hook (`Root.tsx`)
- [x] Add a `StandaloneThemeProvider` to `main-designsystem.tsx` reusing the hook
- [x] Rebuild + sanity-check all three targets; regenerate `monologg-design-system.html`

### Phase 8 — Landing page visual rework
- [x] Read both user-supplied style-reference files (`saaswebskill.skill`, `saaswebskill2.skill`) in full
- [x] Synthesize a distinct visual system: borrow the *mechanics* (gradient atmosphere, hard-offset shadows, bento layout, mono eyebrows), not the literal colors/fonts of either reference
- [x] Add additive-only tokens to `tokens.css` (`--gradient-brand*`, `--shadow-cutout*`) — nothing existing changed value
- [x] Extend `Avatar.tsx` with an optional photo (`src`) prop, backward compatible
- [x] Rebuild `LandingPage.tsx`: hero mockup + gradient atmosphere, photo social-proof cluster, bento feature grid, 3D-style icon tiles, full-bleed photography section, real testimonial photos — all existing copy retained
- [x] Rebuild all three targets + regenerate `monologg-app.html`; open for user review

### Phase 9 — Pushed to git
- [x] Diagnosed and restored an accidental drift (`imports/` had ended up outside `app/src/`) before committing
- [x] Restructured locally into a `monologg/` subfolder so the project can share a repo with unrelated existing content without collision
- [x] Initialized git, merged with the existing history at `github.com/adedoyin899/mono2` (kept, didn't overwrite), added a scoped `.gitignore` (`node_modules`, `dist*`, `.vite`, `.DS_Store`)
- [x] Set up a dedicated deploy key (`id_ed25519_mono2`, write access, this repo only) and pushed

### Phase 10 — Full-stack build-out scope review
- [x] Read `features.md` (the consolidated backend + new-features PRD, 18 phases, 0–17) in full
- [x] Confirmed the new monorepo structure nests under `monologg/` (not the true repo root, to stay separate from the unrelated content) and moved `New features.md` → `handoff/features.md`
- [x] Updated `implementation-plan.md`, `design.md`, `log.md` to reflect the new phase of work — this pass

### `features.md` Phase 0 — Repo tooling (done, reviewed below)
- [x] Committed the UI-complete prototype as an explicit baseline (safety-net diff point) before any tooling changes
- [x] Added strict TypeScript (`tsconfig.json`) — surfaced and fixed 38 pre-existing issues (mostly dead icon imports; one real bug, see `bug.md` #9) once the missing `@types/react`/`@types/react-dom`/`@types/node` packages were installed
- [x] Added ESLint (flat config, `typescript-eslint` + React hooks/refresh plugins) and Prettier — lint is a CI gate (0 errors required; warnings are visible but non-blocking), format is available but not yet enforced (codebase predates it, not bulk-reformatted)
- [x] Added Vitest + a real placeholder test suite against the existing `cn()` utility (not a vacuous assertion)
- [x] Added `typecheck`/`lint`/`format`/`format:check`/`test` npm scripts
- [x] Added GitHub Actions CI (`.github/workflows/monologg-ci.yml`, at the true repo root — the only place Actions looks — path-scoped to `monologg/**` so it doesn't fire on the unrelated project sharing this repo) running `typecheck → lint → test → build`, blocking on failure
- [x] Added `CONTRIBUTING.md` and updated `README.md` with the new commands and CI description
- [x] Verified all four gates green locally before committing

### `features.md` Phase 1 — Monorepo restructure + api-client seam
- [x] Converted to pnpm workspaces: `apps/web` (moved from `app/` via `git mv`, preserves history), `apps/api` (empty scaffold), `packages/types` (shared zod schemas/DTOs)
- [x] Fixed a real pre-existing bug surfaced along the way: `apps/web`'s `react`/`react-dom` were declared as optional `peerDependencies` (a library-mode leftover) instead of real `dependencies`, now corrected
- [x] Built `apps/web/src/lib/api-client.ts` — one typed seam, every function mocked by default; added `VITE_API_MODE=mock|live` (`.env.example`)
- [x] Moved every domain-entity mock constant (talents, projects, orders, stats, activity, services, availability, order messages, shortlist) into `apps/web/src/mocks/`, typed against `@monologg/types`; left static UI copy/config (marketing copy, form dropdown options, weekday labels) local, since that's not "mock data standing in for a backend" — see `log.md` for the exact boundary
- [x] Refactored `ClientDashboard.tsx`, `TalentDashboard.tsx`, `OrderRoom.tsx` to load all domain data through `apiClient`, zero visual change (production CSS build hash unchanged)
- [x] Added a grep-based test enforcing the boundary (no file under `src/app` imports `../mocks` directly) and DOM-parity tests (React Testing Library) proving each refactored page still renders the same real data
- [x] Added `api-client.test.ts` covering both `VITE_API_MODE` paths (mock returns fixtures; live calls `fetch('/api/v1/...')`, mocked transport, including an error-response path)
- [x] Updated CI to install/typecheck/lint/test/build via `pnpm` from the new workspace root
- [x] Verified all three build targets green, CSS byte-identical across all of them, dev server + both standalone HTML files regenerated

### `features.md` Phase 2 — Database schema, Prisma, migrations, seed
- [x] Implemented a 15-model database schema in `prisma/schema.prisma` mapping all domain concepts (Users, Creators, Clients, Bookings, RateCards, AvailabilityBlocks, Payments, Messages, etc.).
- [x] Resolved conflicts X1 (Paystack/Stripe/Airwallex, no Fincra), X2 (11% talent / 15% client platform fee variables), and X3 (Fully separate `styleTags` AI tagging and `verification` KYC status columns).
- [x] Configured multi-connection URL system: pooled connection `DATABASE_URL` for the client runtime, and session pooler `DIRECT_URL` for DDL migrations.
- [x] Generated database schema migration `20260728221646_init` and applied it to Supabase Postgres instance.
- [x] Created idempotent `prisma/seed.ts` seeding all 6 mock creators, 4 client projects, 8 rate cards, 4 briefs, plus one booking for each of the 6 booking states with exact fee calculations.
- [x] Verified seeded database entries in manual integration tests against Supabase.

### `features.md` Phase 3 — Backend scaffold, config, and provider interfaces (all mocked)
- [x] Scaffolded the Fastify backend application structure under `apps/api/src`.
- [x] Added validated environment loader `src/config/env.ts` with strict Zod parsing, failing fast on start with clear exit message if required vars are missing.
- [x] Centralized fee math in `src/services/fees.ts` checking defaults against custom config, unit-tested without rounding drift (money minor units rule).
- [x] Defined TypeScript interfaces for all five external provider boundaries: `PaymentProvider`, `KycProvider`, `AiTaggingProvider`, `CalendarProvider`, and `NotifyProvider`.
- [x] Created mock implementations (`*.mock.ts`) and real stubs (`*.real.ts`) for all 5 providers, integrated via a provider selection registry module.
- [x] Configured request logging (pino/pino-pretty), CORS, security headers (helmet), and rate limiting.
- [x] Implemented `GET /api/v1/health` verifying database connectivity.
- [x] Wrote automated test suite covering fees, environment validation, health check, and mock provider resolution.

### `features.md` Phase 4 — Real authentication
- [x] Backend built in a separate tool ("antigravity") from this plan/`features.md`, then audited and completed in this session (Session 14): `services/auth.ts` (argon2id, JWT issue/verify, refresh-token hashing), `routes/auth.ts` (all 7 endpoints — register/login/refresh/logout/verify-email/forgot-password/reset-password), `middlewares/auth.ts` (`requireAuth`/`requireRole`/`requireOwner`), `providers/cache.*` (refresh-token denylist + verify/reset TTLs, mock in-memory + real Redis).
- [x] Fixed a real bug found in review: `requireOwner` returned the non-standard status `444` instead of `404` on a missing owned resource.
- [x] Closed test-gate gaps: verify-email/reset-password/logout endpoint tests, rate-limit tests (login + forgot-password), a real sanitized-logs test (replacing a placeholder assertion), `requireOwner`'s missing `client`-scope tests, and a full register→verify-email→login→protected-route→refresh→logout integration test. 91 `apps/api` tests passing.
- [x] Wired the client half (`features.md` spec item 6, previously entirely missing): `api-client.ts` gained `register`/`login`/`logout`/`forgotPassword`/`isAuthenticated`, attaches the access token to every live-mode request, and retries once on a 401 via a silent refresh. `AuthFlow.tsx` calls these instead of just navigating locally. A new `RequireAuth` guard wraps the six protected routes — a no-op in the default `mock` mode, real gating only in `live` mode.
- [x] Verified in a real browser (headless Chromium), not just the test suite: mock-mode register/login navigate correctly, protected routes stay directly reachable with no login, zero console errors.
- [x] Fixed a real, pre-existing `apps/web` test-infrastructure gap surfaced by the new tests: `@testing-library/react`'s per-test DOM cleanup was never registering (no `test.globals: true`), so `render()` output silently accumulated across tests in a file. Fixed once in `test-setup.ts`.
- [x] Re-verified the full baseline: `typecheck`/`lint`/`test`/`build` green across both packages, production CSS hash unchanged.

### `features.md` Phase 5 — Core domain endpoints
- [x] Built all 7 resources: `creators` (profile + presigned media upload, styleTags/verification read-only by omission), `rate-cards`/`availability` (owner-scoped CRUD), `briefs` (client-owned CRUD, added a `status` field the original schema didn't have since the resource needs one to be meaningful), `talent` (public discovery — niche/tag/location/price filters, paginated), `bookings` (create with server-computed fees + guarded state machine, list/get/cancel), `order-rooms` (participant-scoped messages). New `StorageProvider` seam (mock local-disk + real S3-compatible stub).
- [x] Caught two response-shape gaps before they reached the frontend: `/rate-cards` and `/briefs` initially returned raw Prisma rows instead of the display-mapped shapes `apps/web`'s types expect — fixed with the same mapping pattern already used for `/talent`/`/bookings`.
- [x] Deliberate scope boundary: 4 api-client methods (stats ×2, activity, shortlist) have no backing resource in this phase's spec and stay mock-only; `getAvailability()`'s UI consumer also stays mock since the real `AvailabilityBlock` shape is genuinely different from the mock's weekly grid (already flagged in `@monologg/types` as superseded by Phase 13) — the real `/availability` endpoint itself is built and tested regardless.
- [x] `Talent`/`ServiceRateCard`/`OrderMessage.id` changed `number` → `string` (they mirror real cuid ids). Found and fixed a real pre-existing bug during the fallout from that change: both dashboards' order-card clicks hardcoded `navigate("/order/1")` regardless of which order was clicked.
- [x] Client wiring: 6 `api-client` methods flipped to live (unwrapping the new pagination envelope via a `requestList()` helper, one generous page rather than building pagination UI as a side effect); added `createBrief`/`sendOrderMessage`; wired `ProjectBrief.tsx`'s publish and `OrderRoom.tsx`'s send-message to them in live mode, unchanged in mock mode.
- [x] Caught a real CSS regression before it shipped — the first one in this whole engagement: a test fixture's fake id `"order-1"` collided with Tailwind's `order-{n}` utility class and leaked into the production bundle. Renamed the fixture; confirmed the CSS hash is byte-identical to baseline again.
- [x] Live-Supabase integration tests for real owner-scoping, fee persistence, and pagination against the seeded data (same non-CI-gated pattern as Phases 2/4).
- [x] Verified in a real browser: shortlist toggling, rate-card editing, sending an Order Room message, and a full project-brief publish — zero console errors, zero visual change.
- [x] Re-verified the full baseline: `typecheck`/`lint`/`test`/`build` green across all three packages (172 tests), CSS hash confirmed byte-identical.

### `features.md` Phase 6 — Payment & escrow integration
- [x] `PaymentProvider.real` — genuine Paystack implementation (initialize/verify/refund/HMAC-SHA512 webhook verification); `payment.stripe.ts`/`payment.airwallex.ts` stub the same interface for later regions. Real payouts (`releaseFunds`) throw a descriptive, flagged error: Paystack transfers need a `recipient_code` from creator bank details, which no phase through Phase 6 collects — a real, documented gap, not an oversight.
- [x] Ledger-based escrow: `POST /bookings/:id/pay` charges `base+clientFee` and never advances `BookingState`; only the signature-verified `POST /webhooks/paystack` sets `ESCROW_LOCKED`. No endpoint anywhere lets a client-side callback advance state on its own.
- [x] Idempotency without a generic key-store table: `Payment.providerRef` is `@unique`; `PaymentEvent` gained `eventId` + a `@@unique([paymentId, type, eventId])` constraint so a replayed webhook hits a DB unique-violation and no-ops; release/refund atomically claim the transition via conditional `updateMany` before calling the provider (two new transient `PaymentStatus` values, `RELEASING`/`REFUNDING`, make the claim window observable and rollback-able on provider failure).
- [x] Full booking money-lifecycle routes: `POST /:id/pay`, `PATCH /:id/deliver`, `PATCH /:id/approve` (releases escrow, base−11% to the talent), `PATCH /:id/dispute`, `POST /:id/refund`.
- [x] Tests (highest-coverage, money path): escrow ledger/fee-split math; idempotent webhook replay; unsigned/tampered webhook rejected; client-callback-never-advances-state (authority); concurrency (two simultaneous webhooks, two simultaneous releases — no double-pay); grep-equivalent allowlist assertions that `Payment.provider` is never `"fincra"`.
- [x] Live-Supabase e2e integration test: real checkout → webhook → `ESCROW_LOCKED` → deliver → approve → `PAYMENT_RELEASED` with correct fee splits, replay-safety, and a full refund path — all against the real seeded Supabase project (`prisma/phase6.integration.test.ts`).
- [x] Fixed a latent cross-file race in the live-DB integration suite, surfaced (not caused) by adding a third live-DB test file: Vitest ran integration files in parallel by default, letting a row-count-idempotency check in one file race against in-flight bookings from another. Fixed with `fileParallelism: false` in `vitest.integration.config.ts` — these files share one live database and were never isolated from each other.
- [x] **Known, deliberately-left-open gap:** `Checkout.tsx` is not wired to any of this — still the scripted 2.5s delay, still says "FINCRA" three times. Phase 6's kickoff was API-only scope; asked explicitly whether to fold the frontend rewiring in now, and the answer was to leave it and log the gap instead (this entry, plus `log.md` Session 16) rather than silently carry a known acceptance-criteria gap forward.
- [x] Re-verified the full baseline: `apps/api` typecheck/tests green (186 unit + 16 live-DB integration tests); `apps/web` untouched this phase.

### `features.md` Phase 7 — KYC (Smile Identity) + AI style-tagging as two independent systems
- [x] `KycProvider`/`AiTaggingProvider` real+mock implementations; `Creator.verification` (KYC) and `Creator.styleTags` (AI) kept fully independent columns/code paths (X3) — locked in with a schema test proving `KycCheck` has no name/DOB/ID-number column, i.e. PII is never persisted at all.
- [x] Known, deliberately-left-open gap: no "start identity verification" UI form exists — the endpoints are real and tested, but no screen in the original design collects the legal name/DOB/ID fields `KycProvider.startCheck` needs; building one is new UI scope, not a wiring pass. See `log.md` Session 17.

### `features.md` Phase 8 — Google Calendar sync (provider layer) + Phase 9 — Notifications backend
- [x] `CalendarProvider` real OAuth (encrypted refresh token), `getBusyTimes`/`createMeet`; provider-layer only by kickoff design — no `apps/web` screen calls any of it yet, rich availability UX deferred to Phase 13. See `log.md` Session 18.
- [x] Real notifications backend — in-app + queued email/SMS with retry/backoff, per-user preferences (`NotificationPreference`). `Settings.tsx`'s preferences toggle UI stayed unwired at the time (closed in Phase 17's a11y pass with a proper `aria-label`, still not backend-wired). See `log.md` Session 19.

### `features.md` Phase 10 — System screens (transaction history, help & support, terms/privacy)
- [x] Four PRD SYS-01–04 screens shipped for real: transaction history (owner-scoped, fee breakdown), help & support (FAQ + ticket submit/list), versioned Terms/Privacy pages, terms acceptance recorded with version+timestamp at registration. Terms/Privacy content explicitly flagged in-page as a legal-review-pending draft. See `log.md` Session 20.

### `features.md` Phase 11 — Design-token adoption + font self-hosting
- [x] Swapped every exact-match literal px type size to its token across 4 files; added (not yet consumed) font-weight/line-height tokens. Self-hosted all 3 brand fonts (11 `@font-face` rules, `font-display: swap`), dropped both CDN dependencies, added preload links. Backfilled into `log.md` as Session 21 (see `README.md`'s living-document policy — this phase originally shipped with no entry).

### `features.md` Phase 12 — Hardening (security, testing, observability, deployment)
- [x] Security: CSP tightened to `default-src 'none'`, pino log redaction, production DB-URL cross-check, proved (not assumed) no CSRF surface and no KYC PII persistence, `pnpm audit` now CI-blocking with 2 reviewed/allowlisted exceptions.
- [x] Testing: per-file coverage thresholds on money/auth/state modules; new cross-cutting hardening test file; first continuous-state e2e test (book→pay→webhook→deliver→approve against one stateful mock).
- [x] Observability: `x-request-id`, `/ready`, `/metrics`, optional Sentry (no-op without `SENTRY_DSN`). Deployment: both Dockerfiles + `docker-compose.yml` (reviewed line-by-line; no Docker daemon available to build locally that session — CI's `docker` job is the real acceptance check). See `log.md` Session 22.

### `features.md` Phase 12A — Media Kit, Verification Video, Physical Attributes
- [x] Three additive extensions: auto-rendered Media Kit PDF (`pdf-lib`, with an upload-override mode), server-authoritative verification-video duration check (a real hand-written ISO-BMFF/MP4 box parser, not an ffprobe wrapper), and Physical Attributes with all six PRD privacy non-negotiables (optional fields, ranges not raw numbers, SEARCHABLE-default, versioned consent, hard-delete, no auto-scoring). Reviewer decisions on verification videos flagged as a known gap (no moderator role exists) — **this is the same gap Phase 17 later confirmed and demonstrated as a real security finding (self-approval), still open.** See `log.md` Session 23.

### `features.md` Phase 13 — Rich availability calendar & time-slot booking (FA-1)
- [x] Server-authoritative `getOpenSlots`/`bookSlot` (Postgres advisory-lock-serialized, race-safe), default-free rule, recurring + exact-date `AvailabilityBlock`s, new `CalendarEvent` model. `Checkout.tsx` and `TalentDashboard.tsx` wired to real slots for the first time — the Phase 6 "Checkout not wired" gap noted above is closed as of this phase.
- [x] Real bug found + fixed via live testing: a concurrent-refresh-token race in `api-client.ts` (concurrent 401s each independently spending the same single-use refresh token, triggering reuse-detection and revoking the session) — fixed with a shared in-flight refresh promise. See `log.md` Session 24.

### `features.md` Phase 14 — Project applications, two-sided + applicant cap (FA-2, FA-4)
- [x] `Application` model (DB-unique per briefId+creatorId), advisory-lock-enforced applicant cap (same pattern as Phase 13's slot booking), full apply/shortlist/reject/select/withdraw lifecycle, selection converts straight into a real booking via the existing `createBooking` path.
- [x] Two real bugs found + fixed via live testing: `createBrief()` never set `status`, so published briefs silently stayed `DRAFT` and never appeared in browse; `GET /projects`'s applicant count reused a caller-filtered array's length instead of a true count, showing "0 applicants" to anyone who hadn't applied yet. See `log.md` Session 25.

### `features.md` Phase 15 — Public marketplace profile / shareable link (FA-3)
- [x] `monologg.co/[handle]` (currently the creator's cuid, not a real slug — flagged) renders fully logged-out with real prices/media/badges; client-side Open Graph/Twitter meta injection (no SSR, so real crawler bots won't see it — an explicitly flagged, out-of-scope tradeoff). `ExternalBookingEntry.tsx` shipped as an intentional Phase-16 placeholder stub. See `log.md` Session 26.

### `features.md` Phase 16 — External-visitor booking + deferred account + escrow-first (FA-5)
- [x] The flagship flow: logged-out guest picks a service/slot, funds escrow, gets a `User`+`Client` auto-created from checkout info (surfaced only once escrow is confirmed, never before — `TODO(conflict:X7)`), and lands in their new dashboard via an emailed set-password/magic-link (reusing `POST /auth/reset-password`, not a parallel mechanism).
- [x] Closed a real, pre-existing gap while at it: the order room previously never checked `Booking.state` at all — chat is now gated on `ESCROW_LOCKED` globally (internal bookings too, not just this flow). Slot-hold expiry (X5, confirmed 30 min) is lazy (checked inside `getOpenSlots`), no cron job. See `log.md` Session 27.

### `features.md` Phase 17 — QA, security & UAT (production gate)
- [x] Independent verification pass — Playwright cross-browser/a11y suite, security authorization-fuzz test, amount-tampering regression test, real-DB concurrency test, NDPA data inventory, UAT script. Fixed one systemic a11y bug (contrast token + missing labels); found and documented (not fixed — out of scope) a P0/P1 security gap and the missing PWA infrastructure. **This phase's own gate is open, not closed — see the Status note at the top of this file and `monologg/qa/2026-07-31-phase17/README.md` for the full PENDING list.** See `log.md` Session 28.

### `features.md` Phase 22 — Code & Structural Review via `/review` (Session 36)
- [x] Executed `/review` workflow: audited recent code diffs, caught and fixed open-slots range check interval flaw in `ExternalBookingEntry.tsx` (`202d621`), verified 100% Vitest test suite pass (19/19 files, 72/72 tests green), logged Eng Review audit, and cleared Review Readiness Dashboard. See `log.md` Session 36.

---

## 🔄 In Progress

- [ ] **Living-document discipline itself.** Ongoing habit, not a one-time task — every future change to the app should also move a checkbox here and add a line to `log.md`, in the same session.

---

## ✅ Full-stack build-out — all phases done (see `features.md` for complete specs)

`features.md` was the authoritative, dependency-ordered backlog for this whole build-out; every phase in it is now built. **Phases were built in dependency order, one at a time, with tests as a gate and a stop-for-review between phases** — the discipline that got this list to all-done, not a rule that stops mattering now. The Phase 17 gate above is what actually decides production-readiness — treat every checkbox below as "built," not as "shippable."

**⚠️ Known conflicts** (see `features.md` §1) — **all resolved**: payment provider is Paystack/Stripe/Airwallex, not FINCRA (X1, resolved Phase 6 backend; `Checkout.tsx`'s copy resolved Phase 13). Fees are 11% talent / 15% client, not 9%/12% (X2, resolved Phase 3). "Thespian AI" is style-tagging only, identity KYC fully separate (X3, resolved Phase 7, backend + UI copy). Applicant cap hard-closes first-come with manual client selection (X4, resolved Phase 14). External-checkout slot hold expires after 30 min, as config (X5, resolved Phase 16). `TODO(conflict:X7)` — a new one from Phase 16, not in the original PRD list: the guest account-materialization timing reconciliation (see that phase's Done entry above) — resolved, documented in code, not open.

### Infrastructure spine (Phases 0–12)
- [x] **Phase 0** — Repo tooling: CI, lint/prettier/strict TypeScript, `CONTRIBUTING.md` — done, see the Done section above; git itself was already done in Phase 9
- [x] **Phase 1** — Monorepo restructure (`monologg/apps/web`, `monologg/apps/api`, `monologg/packages/types`, pnpm workspaces) + typed `api-client` seam, `VITE_API_MODE=mock|live` — done, see the Done section above
- [x] **Phase 2** — Postgres schema via Prisma, migrations, seed data reproducing today's mock fixtures
- [x] **Phase 3** — Fastify backend scaffold, validated env config, provider-interface pattern (every external dependency mocked by default)
- [x] **Phase 4** — Real authentication: JWT access + rotating refresh, argon2id, protected routes, auth middleware — done, see the Done section above
- [x] **Phase 5** — Core domain endpoints (profiles, rate cards, availability, briefs, bookings, order rooms) behind the api-client seam — done, see the Done section above
- [x] **Phase 6** — Payment/escrow integration, Paystack-first, webhook-authoritative, idempotent — done, see the Done section above (`Checkout.tsx` frontend wiring closed in Phase 13)
- [x] **Phase 7** — KYC (Smile Identity) + AI style-tagging as two independent systems — done, see the Done section above and `log.md` Session 17
- [x] **Phase 8** — Google Calendar sync + real Meet links — done, provider layer only by kickoff design; see the Done section above and `log.md` Session 18
- [x] **Phase 9** — Notifications backend (email/SMS/in-app) — done, see the Done section above and `log.md` Session 19
- [x] **Phase 10** — System screens: transaction history, help/support, terms/privacy (PRD SYS-01–04) — done, see the Done section above and `log.md` Session 20
- [x] **Phase 11** — Design-token adoption everywhere + font self-hosting — done, see the Done section above; backfilled `log.md` Session 21
- [x] **Phase 12** — Hardening: security (OWASP pass, NDPA), test coverage, observability, deployment — done, see the Done section above and `log.md` Session 22
- [x] **Phase 12A** — Media Kit, Verification Video, Physical Attributes — done, see the Done section above and `log.md` Session 23

### New feature areas (Phases 13–16, built on the spine above)
- [x] **Phase 13** — Rich availability calendar & time-slot booking (default-free rule, server-authoritative `getOpenSlots`) — done, see the Done section above and `log.md` Session 24
- [x] **Phase 14** — Two-sided project applications with a server-enforced applicant cap; new talent "Projects" nav item — done, see the Done section above and `log.md` Session 25
- [x] **Phase 15** — Public, logged-out marketplace profile at `/[handle]` with Open Graph previews — done, see the Done section above and `log.md` Session 26
- [x] **Phase 16** — Flagship: external-visitor booking, escrow-first, deferred account creation from checkout info — done, see the Done section above and `log.md` Session 27

### Production gate
- [x] **Phase 17** — Independent QA, security/pen-test, load testing, and UAT — done as an automated/documentary pass; **the human sign-off itself is still PENDING** (see the Status note at the top of this file, and `monologg/qa/2026-07-31-phase17/`). See the Done section above and `log.md` Session 28.

---

## How to use this file

- **Starting a task:** move its line from "Not started" to "In Progress," with a one-line note on who/when if useful.
- **Finishing a task:** move it to "Done," under the phase it belongs to (add a new phase heading if it doesn't fit an existing one).
- **New scope discovered:** add it to "Not started" rather than letting it live only in a conversation — if it's not here, the next person won't know about it.
- Always pair a checkbox move with a `log.md` entry (the "why/how") — this file only tracks the "what/status."
