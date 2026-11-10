import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

// features.md Phase 7: CreatorOnboarding.tsx's "Thespian AI" step must reflect
// REAL job state (queued -> tagging -> done/failed) in live mode — not a fixed
// timer — and must never claim identity verification (X3: that's a fully
// separate KYC system). Mock mode preserves the original timed simulation
// (no network), matching every other mock-mode screen in this codebase.

async function renderOnboarding() {
  const { CreatorOnboarding } = await import("./CreatorOnboarding");
  const { container } = render(
    <MemoryRouter>
      <CreatorOnboarding />
    </MemoryRouter>,
  );
  return container;
}

async function goToUploadStep(container: HTMLElement) {
  // Step 1: personal details has defaults; continue.
  fireEvent.click(await screen.findByText("Continue"));

  // Step 2: craft is pre-selected ("actor"); continue.
  fireEvent.click(await screen.findByText("Continue"));

  // Step 3: select a file.
  await screen.findByText("Upload your showcase reel");
  const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(["reel-bytes"], "reel.mp4", { type: "video/mp4" });
  fireEvent.change(fileInput, { target: { files: [file] } });

  // Authentic performance checkbox
  const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
  if (checkbox && !checkbox.checked) {
    fireEvent.click(checkbox);
  }

  fireEvent.click(await screen.findByText("Upload & Analyse"));
}

async function goToCalendarStep(container: HTMLElement) {
  await goToUploadStep(container);
  await waitFor(
    () => {
      expect(screen.getByText("Your style tags are ready.")).toBeInTheDocument();
    },
    { timeout: 5000 },
  );
  fireEvent.click(screen.getByText("Looks great, continue"));
  await screen.findByText("Set your rate cards");
  fireEvent.click(screen.getByText("Continue"));
  await screen.findByText("Connect your calendar");
}

describe("CreatorOnboarding — AI style tagging (features.md Phase 7)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("mock mode: never claims identity verification, and makes no network calls", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const container = await renderOnboarding();
    await goToUploadStep(container);

    await screen.findByText("Thespian AI is analysing your reel to generate style tags…");
    expect(screen.queryByText(/verification/i)).not.toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByText("Your style tags are ready.")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
    expect(screen.queryByText(/verification is confirmed/i)).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  }, 15000);

  it("live mode: drives the processing view from real job state (queued -> tagging -> done), not a fixed timer", async () => {
    vi.stubEnv("VITE_API_MODE", "live");

    let mediaPollCount = 0;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (url === "/api/v1/creators/me/media/presign" && method === "POST") {
        return new Response(JSON.stringify({ uploadUrl: "/api/v1/uploads/local/tok1", mediaAssetId: "media-1" }), {
          status: 201,
        });
      }
      if (url === "/api/v1/uploads/local/tok1" && method === "PUT") {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      if (url === "/api/v1/creators/me/media/media-1/confirm" && method === "POST") {
        return new Response(JSON.stringify({ id: "media-1", taggingStatus: "TAGGING" }), { status: 202 });
      }
      if (url === "/api/v1/creators/me/media/media-1" && method === "GET") {
        mediaPollCount += 1;
        const taggingStatus = mediaPollCount < 2 ? "TAGGING" : "DONE";
        return new Response(JSON.stringify({ id: "media-1", taggingStatus }), { status: 200 });
      }
      if (url === "/api/v1/creators/me" && method === "GET") {
        return new Response(
          JSON.stringify({ id: "creator-1", styleTags: ["Cinematic", "Bold"], verification: "UNVERIFIED" }),
          { status: 200 },
        );
      }
      throw new Error(`Unhandled fetch in test: ${method} ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const container = await renderOnboarding();
    await goToUploadStep(container);

    await screen.findByText("Thespian AI is analysing your reel to generate style tags…");

    await waitFor(
      () => {
        expect(screen.getByText("Your style tags are ready.")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Real tags came from the polled job + profile fetch, not the hardcoded mock list.
    expect(screen.getByText("Cinematic")).toBeInTheDocument();
    expect(screen.getByText("Bold")).toBeInTheDocument();
    expect(screen.queryByText("Warm Texture")).not.toBeInTheDocument();

    // The real endpoints were actually driven — this is job-state-driven, not a timer.
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/creators/me/media/presign", expect.anything());
    expect(mediaPollCount).toBeGreaterThanOrEqual(2);
  });

  it("live mode: a FAILED job offers a retry path, never a verified badge", async () => {
    vi.stubEnv("VITE_API_MODE", "live");

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (url === "/api/v1/creators/me/media/presign" && method === "POST") {
        return new Response(JSON.stringify({ uploadUrl: "/api/v1/uploads/local/tok1", mediaAssetId: "media-1" }), {
          status: 201,
        });
      }
      if (url === "/api/v1/uploads/local/tok1" && method === "PUT") {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      if (url === "/api/v1/creators/me/media/media-1/confirm" && method === "POST") {
        return new Response(JSON.stringify({ id: "media-1", taggingStatus: "TAGGING" }), { status: 202 });
      }
      if (url === "/api/v1/creators/me/media/media-1" && method === "GET") {
        return new Response(JSON.stringify({ id: "media-1", taggingStatus: "FAILED" }), { status: 200 });
      }
      throw new Error(`Unhandled fetch in test: ${method} ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const container = await renderOnboarding();
    await goToUploadStep(container);

    await waitFor(
      () => {
        expect(screen.getByText("Style tagging didn't complete.")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
    expect(screen.getByText("Try again")).toBeInTheDocument();
    expect(screen.queryByText(/verified/i)).not.toBeInTheDocument();
  });

  it("talent onboarding: calendar step renders title, body, Google Calendar button, skip, and connection states", async () => {
    const container = await renderOnboarding();
    await goToCalendarStep(container);

    // Verify step 7 title and body
    expect(screen.getByText("Connect your calendar")).toBeInTheDocument();
    expect(
      screen.getByText("Bookings appear on your calendar automatically, and we only offer slots when you're free."),
    ).toBeInTheDocument();

    // Verify primary button and skip link
    const connectBtn = screen.getByText("Connect Google Calendar");
    expect(connectBtn).toBeInTheDocument();
    const skipLink = screen.getByText("Skip for now");
    expect(skipLink).toBeInTheDocument();

    // Click connect Google Calendar
    fireEvent.click(connectBtn);

    // Wait for connected badge and email
    await waitFor(() => {
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });
    expect(screen.getByText("Disconnect")).toBeInTheDocument();

    // Disconnect
    fireEvent.click(screen.getByText("Disconnect"));
    expect(screen.getByText("Connect Google Calendar")).toBeInTheDocument();
  });

  it("talent onboarding: mandatory agreement step renders 5 exact clauses, mandatory checkbox, and disables continue until checked", async () => {
    const container = await renderOnboarding();
    await goToCalendarStep(container);

    // Step 7: Skip calendar
    fireEvent.click(screen.getByText("Skip for now"));

    // Step 8: Performer Terms & Payout Agreement
    await screen.findByText("Performer Terms & Payout Agreement");

    // Verify all 5 clauses exactly as written
    expect(screen.getByText(/Monologg deducts a 7% platform fee from all completed bookings before settlement/i)).toBeInTheDocument();
    expect(screen.getByText(/Payouts are routed directly to your verified bank account \(OPay, Wema, Zenith, etc\.\) matching your KYC full legal name/i)).toBeInTheDocument();
    expect(screen.getByText(/You agree to respond to automated availability prompts \(sent via email and\/or platform alerts at 3 times prior to each event\)/i)).toBeInTheDocument();
    expect(screen.getByText(/On-site payouts require entering the client's 4-digit check-in code upon physical arrival/i)).toBeInTheDocument();
    expect(screen.getByText(/Unconfirmed gigs or no-shows directly degrade your performer rating and visibility on the platform/i)).toBeInTheDocument();

    // Verify Checkbox and (Mandatory)
    expect(screen.getByText("(Mandatory)")).toBeInTheDocument();
    const termsLink = screen.getByText("Performer Terms of Service");
    expect(termsLink).toBeInTheDocument();
    expect(termsLink.closest("a")).toHaveAttribute("href", "/legal/terms");

    // Continue button must be disabled until checked
    const continueBtn = screen.getByRole("button", { name: "Continue" });
    expect(continueBtn).toBeDisabled();

    // Check the box
    const termsBox = screen.getByRole("checkbox");
    fireEvent.click(termsBox);
    expect(continueBtn).not.toBeDisabled();
  });
});
