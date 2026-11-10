import { defineConfig, devices } from "@playwright/test";

// features.md Phase 17 — QA gate: "cross-device/browser/responsive 360→1600px, iOS Safari +
// Android Chrome + desktop." No physical devices exist in this environment; this is the agreed
// substitute — a real automated browser-engine matrix (Chromium, WebKit, Firefox; WebKit here is
// a genuine macOS WebKit build, a materially closer Safari proxy than headless-Chrome-pretending-
// to-be-Safari) run against the app in mock mode (VITE_API_MODE unset — no backend needed, matches
// the "all-mock" regression leg). Not literally an iPhone/Android device — see qa/*/README.md for
// the explicit scope note.
export default defineConfig({
  testDir: ".",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4321",
    trace: "retain-on-failure",
  },
  webServer: {
    // Serves the already-built `dist/` (features.md Phase 17 doesn't rebuild on every run —
    // `pnpm run build` is its own regression-gate step, run separately).
    command: "npx vite preview --port 4321 --strictPort",
    cwd: "..",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Real macOS WebKit — the closest available proxy to iOS Safari without a physical device.
      name: "webkit-iphone",
      use: { ...devices["iPhone 13"] },
    },
    {
      name: "firefox-desktop",
      use: { ...devices["Desktop Firefox"] },
    },
  ],
});
