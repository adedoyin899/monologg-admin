import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("TalentDashboard — Home Balance CTA, Quick Actions & Analytics Navigation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("renders sole Withdraw Funds CTA on home balance card and navigates to Analytics via sidebar", async () => {
    const { TalentDashboard } = await import("./TalentDashboard");
    render(
      <MemoryRouter>
        <TalentDashboard />
      </MemoryRouter>,
    );

    // Initial state is the home tab
    expect(screen.getByText(/Here's what's happening with your career today\./i)).toBeInTheDocument();

    // Sole primary CTA on the balance hero is Withdraw Funds / Setup Payouts
    const withdrawBtn = screen.getByRole("button", { name: /Withdraw funds|Setup payouts/i });
    expect(withdrawBtn).toBeInTheDocument();

    // Analytics button has been removed from the balance hero
    expect(screen.queryByRole("button", { name: "View analytics" })).not.toBeInTheDocument();

    // Quick actions render without noisy badges/tags
    expect(screen.getByText("Public Storefront")).toBeInTheDocument();
    expect(screen.queryByText("3 active")).not.toBeInTheDocument();

    // Navigate to Analytics via sidebar
    const sidebarAnalyticsBtn = screen.getByRole("button", { name: "Analytics" });
    fireEvent.click(sidebarAnalyticsBtn);

    // Should render the Analytics tab and its date range selector
    await screen.findByLabelText("Analytics date range");
    expect(screen.getByText("Profile views")).toBeInTheDocument();
    expect(screen.getByText("Projects completed")).toBeInTheDocument();
    expect(screen.getByText("Average rating")).toBeInTheDocument();

    // Should NOT render Earnings tab withdrawal balance
    expect(screen.queryByText("Available for withdrawal")).not.toBeInTheDocument();
  });

  it("navigates to Earnings tab when clicking Withdraw Funds on the Home tab", async () => {
    const { TalentDashboard } = await import("./TalentDashboard");
    render(
      <MemoryRouter>
        <TalentDashboard />
      </MemoryRouter>,
    );

    const withdrawBtn = screen.getByRole("button", { name: /Withdraw funds|Setup payouts/i });
    expect(withdrawBtn).toBeInTheDocument();

    fireEvent.click(withdrawBtn);

    // Should render Earnings tab
    await screen.findByText("Available for withdrawal");

    // Should NOT render Analytics date range selector
    expect(screen.queryByLabelText("Analytics date range")).not.toBeInTheDocument();
  });
});
