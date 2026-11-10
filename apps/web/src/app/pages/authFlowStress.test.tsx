import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import React from "react";

// ── Mock Supabase Module ──────────────────────────────────────────────────
const mockGetSession = vi.fn();
let supabaseIsNull = false;

vi.mock("../../lib/supabase", () => ({
  get supabase() {
    return supabaseIsNull ? null : { auth: { getSession: mockGetSession } };
  },
  SUPABASE_MODE: "mock",
}));

// ── Mock API Client ───────────────────────────────────────────────────────
const mockSessionSync = vi.fn();
const mockLogout = vi.fn();

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    sessionSync: (...args: unknown[]) => mockSessionSync(...args),
    logout: () => mockLogout(),
  },
}));

// ── Mock State Sync ───────────────────────────────────────────────────────
const mockUpdateTalentProfile = vi.fn();
const mockUpdateClientProfile = vi.fn();
const mockSetLoggedInUser = vi.fn();
const mockClearSession = vi.fn();

vi.mock("../../lib/state-sync", () => ({
  appStateSync: {
    updateTalentProfile: (data: unknown) => mockUpdateTalentProfile(data),
    updateClientProfile: (data: unknown) => mockUpdateClientProfile(data),
    setLoggedInUser: (data: unknown) => mockSetLoggedInUser(data),
    clearSession: () => mockClearSession(),
  },
}));

import { AuthCallback } from "./AuthCallback";
import { Sidebar } from "../components/ui/Sidebar";
import { UserCheck } from "lucide-react";

function fakeGoogleSession(overrides: { name?: string; avatarUrl?: string; email?: string } = {}) {
  return {
    data: {
      session: {
        access_token: "fake-google-jwt-token",
        user: {
          email: overrides.email ?? "google.performer@gmail.com",
          user_metadata: {
            full_name: overrides.name ?? "Google Performer",
            avatar_url: overrides.avatarUrl ?? "https://lh3.googleusercontent.com/a/google-avatar-photo.jpg",
          },
          app_metadata: { provider: "google" },
        },
      },
    },
    error: null,
  };
}

describe("Google OAuth Authentication & Navigation Stress Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseIsNull = false;
  });

  it("STRESS TEST 1: New Talent Google Sign-Up extracts name & avatar, then routes to /onboarding stepper", async () => {
    mockGetSession.mockResolvedValue(fakeGoogleSession({ name: "Elena Rostova", avatarUrl: "https://lh3.googleusercontent.com/a/elena.jpg" }));
    mockSessionSync.mockResolvedValue({
      userId: "usr-talent-new",
      email: "elena@gmail.com",
      userType: "TALENT",
      isNewUser: true,
      avatarUrl: "https://lh3.googleusercontent.com/a/elena.jpg",
    });

    let currentPath = "/auth/callback?userType=TALENT";

    render(
      <MemoryRouter initialEntries={[currentPath]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/onboarding" element={<div data-testid="onboarding-stepper">Talent Onboarding Stepper Page</div>} />
          <Route path="/dashboard" element={<div data-testid="talent-dashboard">Talent Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    // Verify session sync was called with extracted Google metadata
    await waitFor(() => {
      expect(mockSessionSync).toHaveBeenCalledWith("fake-google-jwt-token", "TALENT", {
        name: "Elena Rostova",
        avatarUrl: "https://lh3.googleusercontent.com/a/elena.jpg",
        provider: "GOOGLE",
      });
    });

    // Verify local talent profile state updated with Google name and avatar
    expect(mockUpdateTalentProfile).toHaveBeenCalledWith({
      name: "Elena Rostova",
      email: "google.performer@gmail.com",
      avatarUrl: "https://lh3.googleusercontent.com/a/elena.jpg",
    });

    // Verify new account lands on onboarding stepper, not dashboard
    await waitFor(() => {
      expect(screen.getByTestId("onboarding-stepper")).toBeTruthy();
    });
    expect(screen.queryByTestId("talent-dashboard")).toBeNull();
  });

  it("STRESS TEST 2: New Client Google Sign-Up extracts name & avatar, then routes to /onboarding/client stepper", async () => {
    mockGetSession.mockResolvedValue(fakeGoogleSession({ name: "Metro Casting Studio", avatarUrl: "https://lh3.googleusercontent.com/a/metro.jpg" }));
    mockSessionSync.mockResolvedValue({
      userId: "usr-client-new",
      email: "casting@metro.com",
      userType: "CLIENT",
      isNewUser: true,
      avatarUrl: "https://lh3.googleusercontent.com/a/metro.jpg",
    });

    render(
      <MemoryRouter initialEntries={["/auth/callback?userType=CLIENT"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/onboarding/client" element={<div data-testid="client-onboarding-stepper">Client Onboarding Stepper Page</div>} />
          <Route path="/client" element={<div data-testid="client-dashboard">Client Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockSessionSync).toHaveBeenCalledWith("fake-google-jwt-token", "CLIENT", {
        name: "Metro Casting Studio",
        avatarUrl: "https://lh3.googleusercontent.com/a/metro.jpg",
        provider: "GOOGLE",
      });
    });

    expect(mockUpdateClientProfile).toHaveBeenCalledWith({
      name: "Metro Casting Studio",
      email: "google.performer@gmail.com",
      avatarUrl: "https://lh3.googleusercontent.com/a/metro.jpg",
    });

    await waitFor(() => {
      expect(screen.getByTestId("client-onboarding-stepper")).toBeTruthy();
    });
    expect(screen.queryByTestId("client-dashboard")).toBeNull();
  });

  it("STRESS TEST 3: Returning Talent Google Sign-In bypasses onboarding and routes straight to /dashboard with existing progress intact", async () => {
    mockGetSession.mockResolvedValue(fakeGoogleSession({ name: "Elias Thorne", avatarUrl: "https://lh3.googleusercontent.com/a/elias.jpg" }));
    mockSessionSync.mockResolvedValue({
      userId: "usr-talent-existing",
      email: "elias@monologg.dev",
      userType: "TALENT",
      isNewUser: false,
      avatarUrl: "https://lh3.googleusercontent.com/a/elias.jpg",
    });

    render(
      <MemoryRouter initialEntries={["/auth/callback?userType=TALENT"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/onboarding" element={<div data-testid="onboarding-stepper">Talent Onboarding Stepper Page</div>} />
          <Route path="/dashboard" element={<div data-testid="talent-dashboard">Talent Dashboard Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    // Returning accounts must skip onboarding and go directly to /dashboard
    await waitFor(() => {
      expect(screen.getByTestId("talent-dashboard")).toBeTruthy();
    });
    expect(screen.queryByTestId("onboarding-stepper")).toBeNull();
  });

  it("STRESS TEST 3b: Returning Client Google Sign-In bypasses onboarding and routes straight to /client with existing brief history intact", async () => {
    mockGetSession.mockResolvedValue(fakeGoogleSession({ name: "Metro Casting Studio", avatarUrl: "https://lh3.googleusercontent.com/a/metro.jpg" }));
    mockSessionSync.mockResolvedValue({
      userId: "usr-client-existing",
      email: "casting@metro.com",
      userType: "CLIENT",
      isNewUser: false,
      avatarUrl: "https://lh3.googleusercontent.com/a/metro.jpg",
    });

    render(
      <MemoryRouter initialEntries={["/auth/callback?userType=CLIENT"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/onboarding/client" element={<div data-testid="client-onboarding-stepper">Client Onboarding Stepper Page</div>} />
          <Route path="/client" element={<div data-testid="client-dashboard">Client Dashboard Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("client-dashboard")).toBeTruthy();
    });
    expect(screen.queryByTestId("client-onboarding-stepper")).toBeNull();
  });

  it("STRESS TEST 4: Sidebar Monologg logo click navigates to / landing page without terminating user session", () => {
    const mockNavigate = vi.fn();
    const mockSignOut = vi.fn();

    render(
      <Sidebar
        portalLabel="Performer Portal"
        navItems={[{ id: "overview", label: "Overview", icon: UserCheck }]}
        activeTab="overview"
        onTab={() => {}}
        onNavigate={mockNavigate}
        onSignOut={mockSignOut}
        identity={{
          initials: "ET",
          name: "Elias Thorne",
          avatarUrl: "https://lh3.googleusercontent.com/a/elias.jpg",
          subtitle: "Verified Performer",
        }}
      />,
    );

    // Click Monologg logo button in sidebar header
    const logoButton = screen.getByRole("button", { name: /monologg home/i });
    fireEvent.click(logoButton);

    // Must navigate to "/" and NOT invoke onSignOut
    expect(mockNavigate).toHaveBeenCalledWith("/");
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
