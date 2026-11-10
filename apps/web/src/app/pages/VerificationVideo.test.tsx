import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

// features.md Phase 12A.2 — the guideline-ack gate must block the upload
// button until acknowledged, and the ack call must actually hit the API in
// live mode (never silently assumed client-side).

async function renderVerification() {
  const { VerificationVideo } = await import("./VerificationVideo");
  render(
    <MemoryRouter>
      <VerificationVideo />
    </MemoryRouter>,
  );
}

describe("VerificationVideo", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("mock mode: shows the checklist and ack button with no network call", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await renderVerification();

    expect(screen.getByText("I've read the guidelines")).toBeInTheDocument();
    expect(screen.getByText(/Maximum 90 seconds/)).toBeInTheDocument();
    expect(screen.queryByText(/Upload recording/)).not.toBeInTheDocument(); // gated until ack
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("the upload CTA only appears after acknowledging (BLOCKS the record CTA until acknowledged, per spec)", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    vi.stubGlobal("fetch", vi.fn());

    await renderVerification();
    fireEvent.click(screen.getByText("I've read the guidelines"));

    await waitFor(() => {
      expect(screen.getByText(/Upload recording/)).toBeInTheDocument();
    });
  });

  it("live mode: acknowledging guidelines calls the real endpoint before unlocking upload", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      // The component also fetches GET .../verification (current status) on
      // mount — this mock has to answer both, not just the ack call.
      if (String(input) === "/api/v1/creators/me/verification/guideline-ack") {
        return new Response(null, { status: 204 });
      }
      return new Response(JSON.stringify(null), { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderVerification();
    fireEvent.click(screen.getByText("I've read the guidelines"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/creators/me/verification/guideline-ack", expect.objectContaining({ method: "POST" }));
    });
    expect(await screen.findByText(/Upload recording/)).toBeInTheDocument();
  });

  it("live mode: shows the current status badge when one exists", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ id: "rec-1", url: "x", durationSec: 45, guidelineAck: true, status: "APPROVED", reviewerNote: null }),
      { status: 200, headers: { "content-type": "application/json" } },
    )));

    await renderVerification();

    expect(await screen.findByText("Approved")).toBeInTheDocument();
  });
});
