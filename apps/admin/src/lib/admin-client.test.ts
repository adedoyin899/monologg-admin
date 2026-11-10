import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminClient } from "./admin-client";

describe("AdminClient", () => {
  let client: AdminClient;

  beforeEach(() => {
    client = new AdminClient("http://localhost:3000");
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal("window", {
      location: { href: "", pathname: "/" },
    });
  });

  it("attaches bearer authorization header when token is present", async () => {
    vi.mocked(localStorage.getItem).mockReturnValue("mock-token-xyz");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await client.request("/api/v1/admin/overview");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/admin/overview",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer mock-token-xyz",
        }),
      }),
    );
  });

  it("clears token on 401 session expiry response", async () => {
    vi.mocked(localStorage.getItem).mockReturnValue("expired-token");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Your session has expired. Sign in again." }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(client.request("/api/v1/admin/overview")).rejects.toThrow(
      "Your session has expired. Sign in again.",
    );

    expect(localStorage.removeItem).toHaveBeenCalledWith("monologg_admin_token");
  });

  it("throws error on 403 response", async () => {
    vi.mocked(localStorage.getItem).mockReturnValue("aal1-token");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: "Multi-factor authentication required.",
        code: "needs_mfa_challenge",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(client.request("/api/v1/admin/overview")).rejects.toThrow(
      "Multi-factor authentication required.",
    );
  });

  it("calls getOverview with query parameters formatted correctly", async () => {
    vi.mocked(localStorage.getItem).mockReturnValue("valid-token");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ cards: {}, period: {} }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await client.getOverview({
      from: "2026-01-01T00:00:00Z",
      to: "2026-01-31T23:59:59Z",
      userType: "TALENT",
      currency: "NGN",
      cohortTag: "alpha",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/admin/overview?"),
      expect.any(Object),
    );
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("from=2026-01-01T00%3A00%3A00Z");
    expect(calledUrl).toContain("to=2026-01-31T23%3A59%3A59Z");
    expect(calledUrl).toContain("userType=TALENT");
    expect(calledUrl).toContain("currency=NGN");
    expect(calledUrl).toContain("cohortTag=alpha");
  });

  it("calls getFeed with cursor pagination and group filters", async () => {
    vi.mocked(localStorage.getItem).mockReturnValue("valid-token");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ events: [], nextCursor: null }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await client.getFeed({
      cursor: "105",
      limit: 25,
      eventGroup: "bookings",
      userType: "CLIENT",
      includeTestUsers: true,
    });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("cursor=105");
    expect(calledUrl).toContain("limit=25");
    expect(calledUrl).toContain("eventGroup=bookings");
    expect(calledUrl).toContain("userType=CLIENT");
    expect(calledUrl).toContain("includeTestUsers=true");
  });
});

