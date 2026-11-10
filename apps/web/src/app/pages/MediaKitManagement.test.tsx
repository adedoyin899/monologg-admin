import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

// features.md Phase 12A.1 — PWA-20. Mirrors the mock/live pattern every other
// screen's own test file uses (see Settings.test.tsx, ProjectBrief.test.tsx).

async function renderMediaKit() {
  const { MediaKitManagement } = await import("./MediaKitManagement");
  render(
    <MemoryRouter>
      <MediaKitManagement />
    </MemoryRouter>,
  );
}

describe("MediaKitManagement", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("mock mode: shows AUTO status with no network calls", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await renderMediaKit();

    await waitFor(() => {
      expect(screen.getByText("Currently showing: Auto")).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("live mode: fetches real status and Regenerate calls the real endpoint", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST" && String(input) === "/api/v1/creators/me/media-kit/regenerate") {
        return new Response(JSON.stringify({ creatorId: "creator-1", mode: "AUTO", uploadUrl: null, uploadSizeBytes: null, autoVersion: 2, autoLastRenderedAt: "2026-01-01T00:00:00.000Z" }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({ creatorId: "creator-1", mode: "AUTO", uploadUrl: null, uploadSizeBytes: null, autoVersion: 1, autoLastRenderedAt: null }), { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderMediaKit();
    await screen.findByText("Currently showing: Auto");

    fireEvent.click(screen.getByText("Regenerate from profile"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/creators/me/media-kit/regenerate", expect.objectContaining({ method: "POST" }));
    });
  });

  it("live mode: shows 'Your upload' and a Revert button when mode is UPLOAD", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ creatorId: "creator-1", mode: "UPLOAD", uploadUrl: "local://x", uploadSizeBytes: 2_000_000, autoVersion: 1, autoLastRenderedAt: null }),
      { status: 200, headers: { "content-type": "application/json" } },
    )));

    await renderMediaKit();

    await waitFor(() => {
      expect(screen.getByText("Currently showing: Your upload")).toBeInTheDocument();
    });
    expect(screen.getByText("Revert to auto-generated")).toBeInTheDocument();
  });
});
