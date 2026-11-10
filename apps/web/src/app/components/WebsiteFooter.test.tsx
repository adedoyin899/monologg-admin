import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { WebsiteFooter } from "./WebsiteFooter";
import { supabase } from "../../lib/supabase";

const { upsertMock, fromMock } = vi.hoisted(() => {
  const upsertMock = vi.fn().mockResolvedValue({ error: null });
  const insertMock = vi.fn().mockResolvedValue({ error: null });
  const fromMock = vi.fn(() => ({
    upsert: upsertMock,
    insert: insertMock,
  }));
  return { upsertMock, fromMock };
});

vi.mock("../../lib/supabase", () => {
  return {
    supabase: {
      from: fromMock,
    },
    SUPABASE_MODE: "real",
  };
});

describe("WebsiteFooter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders newsletter heading, email capture input, and hides Paystack badge by default", () => {
    render(
      <MemoryRouter>
        <WebsiteFooter />
      </MemoryRouter>,
    );

    expect(screen.getByText("Join our newsletter")).toBeInTheDocument();
    expect(
      screen.getByText(/Stay updated with our investor news and receive alerts/i),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Subscribe to newsletter/i })).toBeInTheDocument();
    expect(screen.getByText("Terms of Services")).toBeInTheDocument();
    expect(screen.getByText("Cookie Policy")).toBeInTheDocument();
    expect(screen.getByText("FAQ")).toBeInTheDocument();
    expect(screen.getAllByText("Become an investor").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Lagos, Nigeria/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/getmonologg"
    );
    expect(screen.getByRole("link", { name: "X (Twitter)" })).toHaveAttribute(
      "href",
      "https://x.com/getmonologg"
    );
    expect(screen.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
      "href",
      "https://linkedin.com/company/monologg"
    );
    expect(screen.queryByText("Tiktok")).not.toBeInTheDocument();
    expect(screen.queryByText("Discord")).not.toBeInTheDocument();
    // Powered by paystack is hidden by default via showPoweredByPaystack toggle
    expect(screen.queryByText("Powered by")).not.toBeInTheDocument();
    expect(screen.queryByText("paystack")).not.toBeInTheDocument();
  });

  it("renders Paystack badge when showPoweredByPaystack is toggled on", () => {
    render(
      <MemoryRouter>
        <WebsiteFooter showPoweredByPaystack={true} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Powered by")).toBeInTheDocument();
    expect(screen.getByText("paystack")).toBeInTheDocument();
  });

  it("submits email to Supabase NewsletterSubscriber and displays confirmation", async () => {
    render(
      <MemoryRouter>
        <WebsiteFooter />
      </MemoryRouter>,
    );

    const emailInput = screen.getByPlaceholderText("Enter your email");
    const submitBtn = screen.getByRole("button", { name: /Subscribe to newsletter/i });

    fireEvent.change(emailInput, { target: { value: "subscriber@monologg.co" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(supabase?.from).toHaveBeenCalledWith("NewsletterSubscriber");
    });

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "subscriber@monologg.co",
        status: "ACTIVE",
      }),
      { onConflict: "email" },
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Thanks for subscribing!")).toBeInTheDocument();
    });
  });

  it("aligns 'Finish Your Project today!' CTA section to 1040px container matching footer and triggers investor navigation", () => {
    const handleBecomeInvestor = vi.fn();
    render(
      <MemoryRouter>
        <WebsiteFooter onBecomeInvestor={handleBecomeInvestor} />
      </MemoryRouter>,
    );

    // Verify container has max-w-[1040px] for consistent alignment
    const ctaHeading = screen.getByText(/Finish Your/i).closest("div");
    expect(ctaHeading).toBeInTheDocument();

    const ctaContainer = screen.getByText(/Finish Your/i).closest(".max-w-\\[1040px\\]");
    expect(ctaContainer).toBeInTheDocument();

    // Verify Become an investor button exists and invokes handler
    const investorBtns = screen.getAllByRole("button", { name: /Become an investor/i });
    expect(investorBtns.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(investorBtns[0]);
    expect(handleBecomeInvestor).toHaveBeenCalled();
  });
});
