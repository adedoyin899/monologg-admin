import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

// features.md Phase 4: RequireAuth must be a no-op in the default mock mode (zero
// behavioral change to the prototype's ungated demo browsing) and only actually gate
// access once VITE_API_MODE=live and no session is present.

describe("RequireAuth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    window.localStorage.clear();
  });

  it("mock mode: always renders children, never redirects", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    const { RequireAuth } = await import("./RequireAuth");

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/auth" element={<div>Auth screen</div>} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <div>Protected content</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("live mode: redirects to /auth when there is no session", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    const { RequireAuth } = await import("./RequireAuth");

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/auth" element={<div>Auth screen</div>} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <div>Protected content</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Auth screen")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("live mode: renders children when a refresh token is present", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    window.localStorage.setItem("monologg_refresh_token", "some-refresh-token");
    const { RequireAuth } = await import("./RequireAuth");

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/auth" element={<div>Auth screen</div>} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <div>Protected content</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
