import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

// features.md Phase 10: FAQ (static) + ticket submit/list. Mock mode uses
// local fixtures and appends submissions to local state (no network, same
// seam contract as OrderRoom.tsx's sendOrderMessage); live mode hits the
// real endpoints.

async function renderPage() {
  const { HelpSupport } = await import("./HelpSupport");
  render(
    <MemoryRouter>
      <HelpSupport />
    </MemoryRouter>,
  );
}

describe("HelpSupport", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("mock mode: shows FAQ + fixture tickets with no network call, and expands an FAQ on click", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await renderPage();

    await screen.findByText("Payout hasn't arrived");
    expect(fetchMock).not.toHaveBeenCalled();

    const question = screen.getByText("When does a performer get paid?");
    expect(screen.queryByText(/funds release from escrow automatically/)).not.toBeInTheDocument();
    fireEvent.click(question);
    expect(screen.getByText(/funds release from escrow automatically/)).toBeInTheDocument();
  });

  it("mock mode: submitting a ticket appends it locally", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    vi.stubGlobal("fetch", vi.fn());

    await renderPage();
    await screen.findByText("Payout hasn't arrived");

    fireEvent.change(screen.getByPlaceholderText("Subject"), { target: { value: "Can't upload my reel" } });
    fireEvent.change(screen.getByPlaceholderText("Describe your issue…"), { target: { value: "Upload keeps failing" } });
    fireEvent.click(screen.getByText("Submit Request"));

    await screen.findByText("Can't upload my reel");
  });

  it("live mode: fetches real tickets and submits a new one via the real endpoint", async () => {
    vi.stubEnv("VITE_API_MODE", "live");

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (url.startsWith("/api/v1/support/tickets") && method === "GET") {
        return new Response(
          JSON.stringify({
            data: [{ id: "t1", subject: "Existing ticket", message: "...", status: "OPEN", createdAt: new Date().toISOString() }],
            page: 1,
            pageSize: 100,
            total: 1,
            totalPages: 1,
          }),
          { status: 200 },
        );
      }
      if (url === "/api/v1/support/tickets" && method === "POST") {
        const body = JSON.parse(init!.body as string);
        return new Response(
          JSON.stringify({ id: "t2", ...body, status: "OPEN", createdAt: new Date().toISOString() }),
          { status: 201 },
        );
      }
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderPage();
    await screen.findByText("Existing ticket");

    fireEvent.change(screen.getByPlaceholderText("Subject"), { target: { value: "Real ticket" } });
    fireEvent.change(screen.getByPlaceholderText("Describe your issue…"), { target: { value: "Real message" } });
    fireEvent.click(screen.getByText("Submit Request"));

    await screen.findByText("Real ticket");
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/support/tickets", expect.objectContaining({ method: "POST" }));
    });
  });
});
