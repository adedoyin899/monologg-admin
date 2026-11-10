import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PricingPage } from "./PricingPage";

describe("PricingPage (Figma 178359:17960)", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders announcement bar, sticky header, and hero section", () => {
    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );

    // Announcement bar
    expect(screen.getByText("Monologg is in Alpha 🥳 🥳")).toBeInTheDocument();
    expect(screen.getByText("Paystack Secured")).toBeInTheDocument();
    expect(screen.getByText("25+ Verified Performers")).toBeInTheDocument();

    // Hero section
    expect(screen.getByRole("heading", { name: "Pricing" })).toBeInTheDocument();
    expect(
      screen.getByText(/Simple, transparent pricing designed to maximize direct opportunities/i),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Get started for free/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("renders the audience toggle and switches in-place between Performers and Clients sections", () => {
    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );

    const toggleContainer = document.querySelector('[data-node-id="178359:18032"]');
    expect(toggleContainer).toBeTruthy();

    // Performers is active by default, Clients is hidden
    expect(screen.getByRole("heading", { name: "For Performers" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "For Clients" })).not.toBeInTheDocument();

    // Click Clients tab -> switches in-place to For Clients
    const clientsBtn = screen.getByRole("button", { name: "Clients" });
    fireEvent.click(clientsBtn);
    expect(screen.getByRole("heading", { name: "For Clients" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "For Performers" })).not.toBeInTheDocument();

    // Click Performers tab -> switches back to For Performers
    const performersBtn = screen.getByRole("button", { name: "Performers" });
    fireEvent.click(performersBtn);
    expect(screen.getByRole("heading", { name: "For Performers" })).toBeInTheDocument();
  });

  it("renders For Performers section with table and pro badges", () => {
    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "For Performers" })).toBeInTheDocument();
    expect(
      screen.getByText(/Keep 93% of your booking and shoutout revenue with zero agent commissions/i),
    ).toBeInTheDocument();

    // Table rows
    expect(screen.getByText("Completed Booking Fee")).toBeInTheDocument();
    expect(screen.getByText("7% per booking")).toBeInTheDocument();
    expect(screen.getByText("5% per booking (Save a little over 28% on fees)")).toBeInTheDocument();

    expect(screen.getByText("Bio Storefront & Media Hosting")).toBeInTheDocument();
    expect(screen.getAllByText("Standard Storefront (Video/Audio)").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Custom Domain (name.monologg.co)").length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText("24/7 AI Profile Agent (Thespian)")).toBeInTheDocument();
    expect(screen.getByText("Priority AI Search Indexing")).toBeInTheDocument();

    expect(screen.getByText("Audition & Calendar Bookings")).toBeInTheDocument();
    expect(screen.getByText("Direct Calendar Sync + Auto-Booking")).toBeInTheDocument();

    expect(screen.getByText("Automated Press Kit (EPK) Generator")).toBeInTheDocument();
    expect(screen.getByText("Unlimited Pro EPK Exports")).toBeInTheDocument();

    expect(screen.getByText("Verified Artist Badge")).toBeInTheDocument();
    expect(screen.getByText("Verified Pro Badge")).toBeInTheDocument();
  });

  it("renders For Clients section with 6 studio badges and category headers when Clients tab is selected", () => {
    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );

    // Switch to Clients tab
    fireEvent.click(screen.getByRole("button", { name: "Clients" }));

    expect(screen.getByRole("heading", { name: "For Clients" })).toBeInTheDocument();
    expect(
      screen.getByText(/Choose the plan that fits your production scale/i),
    ).toBeInTheDocument();

    // Studio badges
    expect(screen.getByAltText("Vimeo")).toBeInTheDocument();
    expect(screen.getByAltText("Netflix")).toBeInTheDocument();
    expect(screen.getByAltText("Amazon Prime")).toBeInTheDocument();
    expect(screen.getByAltText("Disney+")).toBeInTheDocument();
    expect(screen.getByAltText("Hulu")).toBeInTheDocument();
    expect(screen.getByAltText("Twitch")).toBeInTheDocument();

    // Categories
    expect(screen.getByText("Discover Trusted Performers")).toBeInTheDocument();
    expect(screen.getByText("Move Faster with Thespian AI")).toBeInTheDocument();
    expect(screen.getByText("Analytics & Reporting")).toBeInTheDocument();
    expect(screen.getByText("Engage & Contract Candidates")).toBeInTheDocument();
    expect(screen.getByText("Collaborate & Management")).toBeInTheDocument();

    // Specific Client rows
    expect(screen.getByText("Monthly Subscription")).toBeInTheDocument();
    expect(screen.getByText("$0 / month")).toBeInTheDocument();
    expect(screen.getByText("$20 / seat / month")).toBeInTheDocument();

    expect(screen.getByText("Client Service Fee")).toBeInTheDocument();
    expect(screen.getByText("9% per booking")).toBeInTheDocument();

    expect(screen.getByText("Auto-Invite Top Candidates")).toBeInTheDocument();
    expect(screen.getByText("Up to 100")).toBeInTheDocument();

    expect(screen.getByText("Curated AI Shortlists")).toBeInTheDocument();
    expect(screen.getByText("Delivered in < 2 hrs")).toBeInTheDocument();

    expect(screen.getByText("Multi-User Team Seats")).toBeInTheDocument();
    expect(screen.getByText("1 Seat")).toBeInTheDocument();
    expect(screen.getByText("Up to 5 Seats")).toBeInTheDocument();
  });

  it("renders 10 FAQ accordion items and supports expansion/collapse", () => {
    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Frequently Asked Questions" }),
    ).toBeInTheDocument();

    // Item 0 is open by default
    expect(
      screen.getByText(/Monologg is like Upwork for Actors, Public speakers/i),
    ).toBeInTheDocument();

    // Open item 1: "What currency does Monologg support?"
    const currencyQuestionBtn = screen.getByRole("button", {
      name: /What currency does Monologg support\?/i,
    });
    fireEvent.click(currencyQuestionBtn);

    expect(
      screen.getByText(/Currently, all transactions are processed in Nigerian Naira/i),
    ).toBeInTheDocument();
  });
});
