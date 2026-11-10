import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

// features.md Phase 9: the notification panel (previously two hardcoded
// entries) now binds to real, per-user data in live mode, with a real
// unread count driving the bell badge. Mock mode keeps the original fixture
// content — no network — matching every other mock-mode screen.

async function renderDashboard() {
  const { TalentDashboard } = await import("./TalentDashboard");
  render(
    <MemoryRouter>
      <TalentDashboard />
    </MemoryRouter>,
  );
}

function openNotificationPanel() {
  const bells = screen.getAllByLabelText("View notifications");
  fireEvent.click(bells[0]);
}

describe("TalentDashboard notification panel", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("mock mode: shows the fixture notifications with no network call", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await renderDashboard();
    openNotificationPanel();

    await screen.findByText("New Booking Request");
    expect(screen.getByText(/Brand Agency NG requested a Commercial Voice-Over/)).toBeInTheDocument();
    expect(screen.getByText("Payment Received")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("live mode: renders real per-user notifications and reflects a real unread count", async () => {
    vi.stubEnv("VITE_API_MODE", "live");

    const fetchMock = vi.fn(async (url: string) => {
      if (url.startsWith("/api/v1/notifications?")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "n1",
                kind: "payment_released",
                payload: { bookingId: "booking-42" },
                readAt: null,
                createdAt: new Date().toISOString(),
              },
            ],
            page: 1,
            pageSize: 50,
            total: 1,
            totalPages: 1,
            unreadCount: 1,
          }),
          { status: 200 },
        );
      }
      // Every other call this page makes on mount (stats/activity/services/etc.) —
      // return an empty list so those effects settle without erroring.
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderDashboard();
    openNotificationPanel();

    await screen.findByText("Payment Received");
    expect(screen.getByText(/Booking booking-42/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/v1\/notifications\?/), expect.anything());
  });

  it("live mode: clicking an unread notification marks it read via the real endpoint", async () => {
    vi.stubEnv("VITE_API_MODE", "live");

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (url.startsWith("/api/v1/notifications?")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "n1",
                kind: "booking_created",
                payload: { bookingId: "booking-1" },
                readAt: null,
                createdAt: new Date().toISOString(),
              },
            ],
            page: 1,
            pageSize: 50,
            total: 1,
            totalPages: 1,
            unreadCount: 1,
          }),
          { status: 200 },
        );
      }
      if (url === "/api/v1/notifications/n1/read" && method === "POST") {
        return new Response(JSON.stringify({ id: "n1", readAt: new Date().toISOString() }), { status: 200 });
      }
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderDashboard();
    openNotificationPanel();

    const item = await screen.findByText("New Booking Request");
    fireEvent.click(item);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/notifications/n1/read", expect.objectContaining({ method: "POST" }));
    });
  });
});
