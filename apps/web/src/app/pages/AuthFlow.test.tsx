import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CURRENT_TERMS_VERSION } from "@monologg/types";

// features.md Phase 4: AuthFlow.tsx is wired to real endpoints via api-client, but must
// stay visually/behaviorally identical to the original mock-only prototype in the default
// mock mode. These tests exercise the actual component, not api-client in isolation.
//
// AnimatePresence (mode="wait") delays mounting the next view until the previous one's
// exit transition finishes, so every view switch is awaited via findBy* rather than
// queried synchronously right after the triggering click.

async function renderAuthFlow() {
  const { AuthFlow } = await import("./AuthFlow");
  render(
    <MemoryRouter initialEntries={["/auth"]}>
      <Routes>
        <Route path="/auth" element={<AuthFlow />} />
        <Route path="/onboarding" element={<div>Talent onboarding</div>} />
        <Route path="/onboarding/client" element={<div>Client onboarding</div>} />
        <Route path="/dashboard" element={<div>Talent dashboard</div>} />
        <Route path="/client" element={<div>Client dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AuthFlow", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("mock mode: registering as talent navigates to talent onboarding (no visual change)", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    await renderAuthFlow();

    fireEvent.click(screen.getByText("Create Free Account"));
    fireEvent.change(await screen.findByPlaceholderText("Full Name"), {
      target: { value: "Ada Lovelace" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email Address"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Create Password (min. 8 chars)"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByText(/I agree to the/).closest("label")!.querySelector("div")!);

    fireEvent.click(screen.getByText("Create My Performer Profile"));

    await waitFor(() => {
      expect(screen.getByText("Talent onboarding")).toBeInTheDocument();
    });
  });

  it("Terms of Service / Privacy Policy links point to the real, versioned legal pages", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    await renderAuthFlow();

    fireEvent.click(screen.getByText("Create Free Account"));
    await screen.findByPlaceholderText("Full Name");

    expect(screen.getByText("Terms of Service").closest("a")).toHaveAttribute("href", "/legal/terms");
    expect(screen.getByText("Privacy Policy").closest("a")).toHaveAttribute("href", "/legal/privacy");
  });

  it("live mode: registering sends the required, versioned terms acceptance to the backend", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    // register() immediately logs the new account in (see api-client.ts) to
    // establish a real session, so the mock needs a real /login response too
    // — not just /register's — or the second call resolves to `undefined`.
    const fetchMock = vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
      if (String(url).includes("/register")) {
        return new Response(
          JSON.stringify({ userId: "new-user", email: "ada@example.com", userType: "TALENT", emailVerified: false }),
          { status: 201, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          accessToken: "test-access-token",
          refreshToken: "test-refresh-token",
          user: { userId: "new-user", email: "ada@example.com", userType: "TALENT", name: "Ada Lovelace" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    await renderAuthFlow();

    fireEvent.click(screen.getByText("Create Free Account"));
    fireEvent.change(await screen.findByPlaceholderText("Full Name"), { target: { value: "Ada Lovelace" } });
    fireEvent.change(screen.getByPlaceholderText("Email Address"), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Create Password (min. 8 chars)"), { target: { value: "password123" } });
    fireEvent.click(screen.getByText(/I agree to the/).closest("label")!.querySelector("div")!);
    fireEvent.click(screen.getByText("Create My Performer Profile"));

    await waitFor(() => {
      expect(screen.getByText("Talent onboarding")).toBeInTheDocument();
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body.acceptedTermsVersion).toBe(CURRENT_TERMS_VERSION);
  });

  it("mock mode: signing in with a 'client' email navigates to the client dashboard", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    await renderAuthFlow();

    fireEvent.click(screen.getByText("Sign In"));
    fireEvent.change(await screen.findByPlaceholderText("Email Address"), {
      target: { value: "someone@client.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(screen.getByText("Client dashboard")).toBeInTheDocument();
    });
  });

  it("live mode: shows the server's error message on invalid login instead of navigating", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ message: "Invalid email or password" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    await renderAuthFlow();

    fireEvent.click(screen.getByText("Sign In"));
    fireEvent.change(await screen.findByPlaceholderText("Email Address"), {
      target: { value: "wrong@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
    });
    expect(screen.queryByText("Talent dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Client dashboard")).not.toBeInTheDocument();
  });

  it("Google OAuth: clicking Continue with Google without Supabase configured shows a real error, not a fake login", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    // This machine's apps/web/.env.local carries real Supabase dev credentials
    // (needed for the actual app to do real Google sign-in) — explicitly blank
    // them out here so this test exercises the "Supabase not configured" path
    // it's actually named for, regardless of what's in the local dev env.
    vi.stubEnv("VITE_SUPABASE_URL", undefined as unknown as string);
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", undefined as unknown as string);
    await renderAuthFlow();

    fireEvent.click(screen.getByText("Create Free Account"));
    fireEvent.click(await screen.findByRole("button", { name: /Continue with Google/i }));

    await waitFor(() => {
      expect(screen.getByText("Google Sign-In isn't configured in this environment yet.")).toBeInTheDocument();
    });
    expect(screen.queryByText("Talent onboarding")).not.toBeInTheDocument();
  });
});
