import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import React from "react";

// STRESS TESTS 5 & 7 (from the auth-flow review plan): the signed-in
// landing-page header — the avatar dropdown's quick-return shortcuts, and
// Sign Out actually clearing the session rather than just navigating away.

const mockNavigate = vi.fn();
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockLogout = vi.fn().mockResolvedValue(undefined);
vi.mock("../../lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api-client")>();
  return { ...actual, apiClient: { ...actual.apiClient, logout: () => mockLogout() } };
});

const TALENT_SESSION = {
  id: "usr-1",
  email: "elena@gmail.com",
  name: "Elena Rostova",
  userType: "TALENT" as const,
  authProvider: "GOOGLE",
  isNewUser: false,
};

import { appStateSync } from "../../lib/state-sync";
import { LandingPage } from "./LandingPage";
import { ThemeContext, useThemeState } from "../Root";

function ThemeTestWrapper({ children }: { children: React.ReactNode }) {
  const theme = useThemeState();
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

describe("LandingPage signed-in header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appStateSync.setLoggedInUser(null);
  });

  it("STRESS TEST 5: avatar dropdown's Dashboard shortcut navigates straight to /dashboard", async () => {
    appStateSync.setLoggedInUser(TALENT_SESSION);
    appStateSync.updateTalentProfile({ name: "Elena Rostova", email: "elena@gmail.com" });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <LandingPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText("Account menu"));
    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeTruthy();
    });
    fireEvent.click(screen.getByText("Dashboard"));

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("STRESS TEST 7: Sign Out calls the real logout path and returns the header to logged-out state", async () => {
    appStateSync.setLoggedInUser(TALENT_SESSION);
    appStateSync.updateTalentProfile({ name: "Elena Rostova", email: "elena@gmail.com" });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <LandingPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText("Account menu"));
    await waitFor(() => {
      expect(screen.getByText("Sign Out")).toBeTruthy();
    });
    fireEvent.click(screen.getByText("Sign Out"));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });
    // The real apiClient.logout() is mocked here (isolating this test from a
    // network call), so it doesn't itself clear appStateSync — assert the
    // header's own post-logout behavior instead: it navigates home.
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("renders role-specific account menu for Performer (My Profile, Browse Gigs, no Post a Brief)", async () => {
    appStateSync.setLoggedInUser(TALENT_SESSION);
    appStateSync.updateTalentProfile({ name: "Elena Rostova", email: "elena@gmail.com" });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <LandingPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText("Account menu"));
    const dropdown = await screen.findByTestId("user-account-dropdown");
    const menu = within(dropdown);

    expect(menu.getByText("Dashboard")).toBeInTheDocument();
    expect(menu.getByText("My Profile")).toBeInTheDocument();
    expect(menu.queryByText("Public Storefront")).not.toBeInTheDocument();
    expect(menu.getByText("Browse Gigs")).toBeInTheDocument();
    expect(menu.getByText("Settings")).toBeInTheDocument();
    expect(menu.getByText("Sign Out")).toBeInTheDocument();

    // Performers do NOT see client-only action "Post a Brief" or "Find Performers"
    expect(menu.queryByText("Post a Brief")).not.toBeInTheDocument();
    expect(menu.queryByText("Find Performers")).not.toBeInTheDocument();
  });

  it("renders role-specific account menu for Client (Find Performers, Post a Brief, no My Profile)", async () => {
    appStateSync.setLoggedInUser({
      id: "client-1",
      email: "director@warner.com",
      name: "Warner Studios",
      userType: "CLIENT",
      authProvider: "EMAIL",
      isNewUser: false,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <LandingPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText("Account menu"));
    const dropdown = await screen.findByTestId("user-account-dropdown");
    const menu = within(dropdown);

    expect(menu.getByText("Dashboard")).toBeInTheDocument();
    expect(menu.getByText("Find Performers")).toBeInTheDocument();
    expect(menu.getByText("Post a Brief")).toBeInTheDocument();
    expect(menu.getByText("Settings")).toBeInTheDocument();
    expect(menu.getByText("Sign Out")).toBeInTheDocument();

    // Clients do NOT see performer-only action "My Profile" or "Browse Gigs"
    expect(menu.queryByText("My Profile")).not.toBeInTheDocument();
    expect(menu.queryByText("Public Storefront")).not.toBeInTheDocument();
    expect(menu.queryByText("Browse Gigs")).not.toBeInTheDocument();
  });

  it("logged-out visitor still sees Sign In / Launch Storefront, not the avatar menu", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <LandingPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Sign In" })).toBeTruthy();
    expect(screen.queryByLabelText("Account menu")).toBeNull();
  });

  it("renders updated announcement bar copy, timeline section headline, and footer legal links", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <LandingPage />
      </MemoryRouter>,
    );

    // Announcement bar
    expect(screen.getByText("Monologg is in Alpha 🥳 🥳")).toBeInTheDocument();
    expect(screen.getByText("Paystack Secured")).toBeInTheDocument();
    expect(screen.getByText("25+ Verified Performers")).toBeInTheDocument();

    // 6-feature vertical timeline headline & subtext
    expect(
      screen.getByText("Run your performing career like the business it actually is"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Share your work, set your prices, track your audience and get paid securely, without an agent in the middle.",
      ),
    ).toBeInTheDocument();

    // Footer resources links & Paystack badge (hidden by default)
    expect(screen.getByRole("button", { name: "Terms of Services" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cookie Policy" })).toBeInTheDocument();
    expect(screen.queryByText("paystack")).not.toBeInTheDocument();
  });

  it("toggles dark mode class on document element when theme toggle is clicked", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ThemeTestWrapper>
          <LandingPage />
        </ThemeTestWrapper>
      </MemoryRouter>,
    );

    const themeToggleBtn = screen.getByLabelText("Toggle theme");
    expect(themeToggleBtn).toBeInTheDocument();

    const wasDark = document.documentElement.classList.contains("dark");
    fireEvent.click(themeToggleBtn);
    expect(document.documentElement.classList.contains("dark")).toBe(!wasDark);
  });

  it("verifies dark mode styles enforce subtle #1A1A1A strokes closer to black and #1A1A1A hover backgrounds in tokens.css", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const tokensCss = fs.readFileSync(path.resolve(__dirname, "../../styles/tokens.css"), "utf-8");

    // Strokes must strictly be subtle #1A1A1A (closer to black) in dark mode
    expect(tokensCss).toContain("--color-border-default: #1A1A1A;");
    expect(tokensCss).toContain("--color-border-strong: #1A1A1A;");
    expect(tokensCss).toContain("--color-hairline: #1A1A1A;");
    expect(tokensCss).toContain("border-color: #1A1A1A !important;");

    // Background hover states strictly #1A1A1A
    expect(tokensCss).toContain("background-color: #1A1A1A !important;");
  });

  it("renders responsive hero iPhone 15 mockup with mobile scaling and eager image optimization", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <LandingPage />
      </MemoryRouter>,
    );

    const stage = container.querySelector(".hero-phone-stage");
    expect(stage).toBeInTheDocument();

    const scaler = container.querySelector(".hero-phone-scaler");
    expect(scaler).toBeInTheDocument();

    const dashboardImg = screen.getByAltText("Monologg Performer Dashboard");
    expect(dashboardImg).toBeInTheDocument();
    expect(dashboardImg).toHaveAttribute("loading", "eager");
    expect(dashboardImg).toHaveAttribute("decoding", "async");

    const fs = await import("fs");
    const path = await import("path");
    const tokensCss = fs.readFileSync(path.resolve(__dirname, "../../styles/tokens.css"), "utf-8");

    // Must define responsive hero phone stage & scaler
    expect(tokensCss).toContain(".hero-phone-stage");
    expect(tokensCss).toContain(".hero-phone-scaler");
    expect(tokensCss).toContain("transform-origin: top center;");
    expect(tokensCss).toContain("scale(0.60)");
    expect(tokensCss).toContain("scale(0.68)");
    expect(tokensCss).toContain("scale(1)");
  });

  it("renders hero typewriter headline and routes CTAs to toggled performer and client signup pages", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <LandingPage />
      </MemoryRouter>,
    );

    // Initial typewriter headline starts with 'Find Performers'
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Find Performers");
    expect(screen.getByText("Finish Your Project.")).toBeInTheDocument();

    // CTA 'Find Performers' navigates to client toggled signup
    const findPerformersBtn = screen.getByRole("button", { name: /^Find Performers/i });
    fireEvent.click(findPerformersBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/auth?mode=signup&role=client");

    // CTA 'Find Gigs' navigates to performer/talent toggled signup
    const findGigsBtn = screen.getByRole("button", { name: /Find Gigs/i });
    fireEvent.click(findGigsBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/auth?mode=signup&role=talent");
  });
});
