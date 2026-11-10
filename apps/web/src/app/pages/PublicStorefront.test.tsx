import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

// features.md Phase 15 (FA-3): the public marketplace profile at
// monologg.co/[handle] must render fully logged out (no auth guard, no
// session state needed) and must never leak private data (booking, message,
// or contact details) even by accident — everything shown comes straight
// from GET /creators/:id/public, which is itself scoped server-side.

async function renderAt(path: string) {
  const { PublicStorefront } = await import("./PublicStorefront");
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:handle" element={<PublicStorefront />} />
      </Routes>
    </MemoryRouter>,
  );
}

const LIVE_PROFILE = {
  id: "creator-1",
  name: "Adaeze Obi",
  niche: "VO_ARTIST",
  nicheLabel: "Voice-Over Artist",
  location: "Lagos",
  bio: "Warm, multilingual voice artist.",
  styleTags: ["Warm", "Multilingual"],
  verified: true,
  celebrityBadge: true,
  media: [{ id: "media-1", kind: "VIDEO", url: "https://cdn.example/reel.mp4", durationSec: 30 }],
  rateCards: [
    { id: "rc-1", title: "Voice-Over Session", price: "₦28,000", basePriceAmount: 2_800_000, basePriceCurrency: "NGN", delivery: "Same Day" },
  ],
};

describe("PublicStorefront", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
    document.title = "";
    document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]').forEach((el) => el.remove());
  });

  it("mock mode: renders the fixture storefront with no network call, requiring no auth/session state", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await renderAt("/mock-creator");

    await screen.findByText("Emeka Johnson");
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Celebrity")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("live mode: shows the full public storefront with prices, and never leaks private data", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("/api/v1/creators/creator-1/public");
      return new Response(JSON.stringify(LIVE_PROFILE), { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderAt("/creator-1");

    await screen.findByText("Adaeze Obi");
    expect(screen.getByText("Voice-Over Artist · Lagos")).toBeInTheDocument();
    expect(screen.getByText("₦28,000")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Celebrity")).toBeInTheDocument();

    // Guardrail: nothing on the page exposes private fields — no email
    // address, password, or phone number. ("Booking"/"Book Now" are the
    // page's own legitimate service-purchase copy, not a leak — the real
    // no-private-data guarantee is that the component renders ONLY fields
    // from the already public-scoped API response, proven server-side in
    // apps/api's routes/creators.test.ts.)
    const bodyText = document.body.textContent ?? "";
    expect(bodyText).not.toContain("@monologg.dev");
    expect(bodyText.toLowerCase()).not.toContain("password");
    expect(bodyText).not.toMatch(/\+?\d{10,}/); // no phone-number-shaped string
  });

  it("live mode: sets document.title and Open Graph / Twitter meta tags for link previews", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(LIVE_PROFILE), { status: 200, headers: { "content-type": "application/json" } })));

    await renderAt("/creator-1");
    await screen.findByText("Adaeze Obi");

    await waitFor(() => {
      expect(document.title).toContain("Adaeze Obi");
    });
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute("content")).toContain("Adaeze Obi");
    expect(document.querySelector('meta[property="og:description"]')?.getAttribute("content")).toBe("Warm, multilingual voice artist.");
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute("content")).toBe("/api/v1/creators/creator-1/og-image.svg");
    expect(document.querySelector('meta[property="og:type"]')?.getAttribute("content")).toBe("profile");
    expect(document.querySelector('meta[name="twitter:card"]')?.getAttribute("content")).toBe("summary_large_image");
  });

  it("live mode: 'Book Now' routes into the external booking flow with the creator and service carried through", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/public")) {
          return new Response(JSON.stringify(LIVE_PROFILE), { status: 200, headers: { "content-type": "application/json" } });
        }
        if (url.endsWith("/rate-cards")) {
          return new Response(JSON.stringify(LIVE_PROFILE.rateCards), { status: 200, headers: { "content-type": "application/json" } });
        }
        if (url.includes("/open-slots")) {
          return new Response(JSON.stringify({ date: "2026-08-10", openSlots: [] }), { status: 200, headers: { "content-type": "application/json" } });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    const { PublicStorefront } = await import("./PublicStorefront");
    const { ExternalBookingEntry } = await import("./ExternalBookingEntry");
    render(
      <MemoryRouter initialEntries={["/creator-1"]}>
        <Routes>
          <Route path="/:handle" element={<PublicStorefront />} />
          <Route path="/book/:creatorId" element={<ExternalBookingEntry />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText("Adaeze Obi");
    fireEvent.click(screen.getByRole("button", { name: /Book Now/i }));

    // features.md Phase 16 (FA-5): PWA-18's real flow now lives here — the
    // slot-picker step, logged out, is what the "Book Now" CTA opens into.
    await screen.findByText("Book Adaeze Obi");
  });

  it("shows a not-found state for a handle that doesn't resolve to a creator", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "Not Found" }), { status: 404 })));

    await renderAt("/does-not-exist");

    await screen.findByText(/Profile not found/i);
  });
});
