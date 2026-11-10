import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ResourcesPage } from "./ResourcesPage";
import { supabase } from "../../lib/supabase";

vi.mock("../../lib/supabase", () => {
  const insertMock = vi.fn().mockResolvedValue({ error: null });
  const fromMock = vi.fn(() => ({
    insert: insertMock,
  }));
  return {
    supabase: {
      from: fromMock,
    },
    SUPABASE_MODE: "real",
  };
});

describe("ResourcesPage (Figma 178359:18325)", () => {
  it("renders the 1-for-1 Resources Page layout with announcement bar and header", () => {
    render(
      <MemoryRouter>
        <ResourcesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Monologg is in Alpha 🥳 🥳")).toBeInTheDocument();
    expect(screen.getByText("Paystack Secured")).toBeInTheDocument();
    expect(screen.getByText("25+ Verified Performers")).toBeInTheDocument();
  });

  it("renders the master resources card with Terms of Service, Escrow Guarantee, and Helpdesk sections", () => {
    render(
      <MemoryRouter>
        <ResourcesPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("button", { name: /Terms of Service/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Escrow Guarantee Policy")).toBeInTheDocument();
    expect(screen.getAllByText("Fair Trade Contracts").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: /Support & Community/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("24/7 Creator Helpdesk")).toBeInTheDocument();
    expect(screen.getByText("Onboarding & EPK Guides")).toBeInTheDocument();
    expect(screen.getAllByText("hello@monologg.co").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the 'Become an Investor' section and allows form submission", async () => {
    render(
      <MemoryRouter>
        <ResourcesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("RAISING SOON!")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Become an Investor" })).toBeInTheDocument();
    expect(screen.getByText(/Follow our investor updates/i)).toBeInTheDocument();

    const investorSection = document.getElementById("investor");
    expect(investorSection).toBeInTheDocument();
    expect(investorSection).toHaveClass("scroll-mt-24");

    const firstNameInput = screen.getByLabelText(/First Name/i);
    const lastNameInput = screen.getByLabelText(/Last Name/i);
    const emailInput = screen.getByLabelText(/^Email$/i);
    const phoneInput = screen.getByLabelText(/phone no/i);
    const submitBtn = screen.getByRole("button", { name: /Submit Application/i });

    const roleSelect = screen.getByLabelText(/Please tell us who you are/i);

    fireEvent.change(firstNameInput, { target: { value: "Ade" } });
    fireEvent.change(lastNameInput, { target: { value: "Oyeniyi" } });
    fireEvent.change(emailInput, { target: { value: "ade@example.com" } });
    fireEvent.change(phoneInput, { target: { value: "+2348012345678" } });
    fireEvent.change(roleSelect, { target: { value: "Angel Investor" } });

    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Thank you for your interest!/i)).toBeInTheDocument();
    expect(supabase?.from).toHaveBeenCalledWith("InvestorApplication");
  });

  it("renders only the 4 approved social platform badges (LinkedIn, Product Hunt, X, IG) in the bottom bar", () => {
    render(
      <MemoryRouter>
        <ResourcesPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("LinkedIn")).toHaveAttribute("href", "https://linkedin.com/company/monologg");
    expect(screen.getByLabelText("Product Hunt")).toHaveAttribute("href", "https://www.producthunt.com/products/monologg");
    expect(screen.getByLabelText("Twitter-X")).toHaveAttribute("href", "https://x.com/getmonologg");
    expect(screen.getByLabelText("Instagram")).toHaveAttribute("href", "https://www.instagram.com/getmonologg");

    // Hidden / removed platforms
    expect(screen.queryByLabelText("Twitch")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Telegram")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("TikTok")).not.toBeInTheDocument();
  });

  it("renders the active Resources pill indicator in the header", () => {
    render(
      <MemoryRouter>
        <ResourcesPage />
      </MemoryRouter>,
    );

    const activePill = screen.getAllByText("Resources")[0];
    expect(activePill).toHaveClass("text-[#f25757]");
  });
});
