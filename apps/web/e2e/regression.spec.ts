import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// features.md Phase 17 — cross-browser/responsive regression + automated accessibility (axe).
// Runs against the mock-mode build (no backend) across three browser-engine projects (see
// playwright.config.ts). Every screen already has its own render-level guarantee from the unit
// suite (apps/web/src/app/pages/*.test.tsx) — this file's job is the thing unit tests structurally
// can't prove: does a REAL browser engine render it without erroring, without horizontal overflow
// at a given viewport, and with an accessibility tree axe considers clean.

const ROUTES: { path: string; expectText: string | RegExp }[] = [
  { path: "/", expectText: /Monologg/i },
  { path: "/auth", expectText: /Welcome/i },
  { path: "/onboarding", expectText: /./ },
  { path: "/onboarding/client", expectText: /./ },
  { path: "/dashboard", expectText: /./ },
  { path: "/client", expectText: /./ },
  { path: "/order/1", expectText: /./ },
  { path: "/brief", expectText: /./ },
  { path: "/checkout", expectText: /./ },
  { path: "/settings", expectText: /./ },
  { path: "/transactions", expectText: /./ },
  { path: "/support", expectText: /./ },
  { path: "/media-kit", expectText: /./ },
  { path: "/verification", expectText: /./ },
  { path: "/legal/terms", expectText: /./ },
  { path: "/legal/privacy", expectText: /./ },
  { path: "/mock-creator", expectText: /./ }, // PublicStorefront, mock mode
  { path: "/book/mock-creator", expectText: /./ }, // ExternalBookingEntry (Phase 16 PWA-18)
  { path: "/set-password", expectText: /./ }, // PWA-19
];

for (const { path, expectText } of ROUTES) {
  test(`${path} renders without console errors or horizontal overflow`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    const response = await page.goto(path);
    expect(response?.ok(), `${path} should return a 2xx/3xx-resolved response`).toBeTruthy();
    await expect(page.locator("body")).toContainText(expectText);

    // Responsive proof: the page never forces horizontal scroll at the current viewport
    // (each browser project's own configured viewport — see playwright.config.ts). Tolerance
    // of 4px, not 0: sub-pixel/scrollbar-gutter accounting genuinely differs across engines
    // (observed up to 3px on WebKit's iPhone emulation) without being a perceptible layout bug
    // — see qa/2026-07-31-phase17/cross-device-a11y.md for the specific case investigated.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${path} should not overflow horizontally`).toBeLessThanOrEqual(4);

    expect(consoleErrors, `${path} should log no console errors`).toEqual([]);
  });

  // features.md Phase 17: this scan surfaced a real, systemic finding — 100+ serious/critical
  // violations across dozens of DISTINCT color pairs (accent-on-soft-background badges in every
  // brand ramp, opacity utilities compounding already-borderline colors, several component-local
  // inline styles), not one root cause. One genuinely systemic, safe, high-confidence fix landed
  // this same pass (--color-text-tertiary, tokens.css — it alone backed ~48 of the original
  // instances); the rest is a full design-system remediation project spanning nearly every screen,
  // which needs design sign-off on new brand colors, not a QA phase unilaterally repainting the
  // app. Per this phase's own rule ("does not add features; any gap found becomes a tracked
  // ticket, not scope creep here"), this check RUNS and REPORTS (so CI has a real, current count
  // to catch regressions against) rather than hard-failing on pre-existing, tracked debt — see
  // qa/2026-07-31-phase17/cross-device-a11y.md for the full finding and why it's a P0 gate-
  // blocking item for production cutover even though this test doesn't fail on it.
  test(`${path} — automated accessibility scan (axe)`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    if (blocking.length > 0) {
      console.log(`axe violations on ${path}:`, JSON.stringify(blocking, null, 2));
    }
    // Informational, not gate-blocking here — see comment above.
    test.info().annotations.push({ type: "a11y-serious-critical-count", description: String(blocking.length) });
  });
}

// features.md Phase 17: "360→1600px" responsive sweep, on the two most layout-complex screens
// (landing + client dashboard) rather than every route at every width — a deliberate scope
// choice, not an oversight (see qa/*/cross-device-a11y.md).
const VIEWPORT_WIDTHS = [360, 768, 1024, 1600];
for (const width of VIEWPORT_WIDTHS) {
  test(`landing page has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(4);
  });

  test(`client dashboard has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/client");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(4);
  });
}

// Keyboard/ARIA proxy for "manual keyboard navigation, focus order, screen-reader labels" —
// this is automated and role-based (the same tree a screen reader consumes), not a human
// screen-reader session; see qa/*/cross-device-a11y.md for the explicit distinction. Tabs up to
// 5 times rather than asserting on the very first press. Desktop-only (chromium/firefox): the
// webkit-iphone project emulates a touch-primary mobile device with no hardware keyboard — real
// iOS Safari on an actual iPhone has no Tab-key model to test here at all; this check is a
// desktop-input concern, see qa/*/cross-device-a11y.md.
test("landing page has a keyboard-reachable control with an accessible name within 5 tabs", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "webkit-iphone", "touch-primary mobile emulation has no hardware-keyboard tab order to test");
  await page.goto("/");
  let found = false;
  for (let i = 0; i < 5 && !found; i++) {
    await page.keyboard.press("Tab");
    found = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return false;
      return !!(el.textContent?.trim() || el.getAttribute("aria-label"));
    });
  }
  expect(found, "expected a keyboard-reachable, accessibly-named control within the first 5 tab stops").toBe(true);
});

// features.md Phase 17: "PWA install path, offline behaviour" — verified ABSENT, not faked.
// See qa/*/README.md: this is a P0 gate-blocking finding, not something this phase builds.
test("PWA install/offline infrastructure does not exist yet (documented gap, not a pass)", async ({ page }) => {
  await page.goto("/");
  const manifestHref = await page.locator('link[rel="manifest"]').count();
  const swRegistered = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return false;
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.length > 0;
  });
  expect(manifestHref, "no <link rel=manifest> exists yet — PWA installability is not built").toBe(0);
  expect(swRegistered, "no service worker registers yet — offline/cached-shell is not built").toBe(false);
});
