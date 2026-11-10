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
});

