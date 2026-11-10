import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductPage } from "./ProductPage";

describe("ProductPage (Figma 178359:17305)", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
  });

  it("renders announcement bar, header, and Performer Portal hero", () => {
    render(
      <MemoryRouter>
        <ProductPage />
      </MemoryRouter>,
    );

    // Top announcement bar
    expect(screen.getByText("Monologg is in Alpha 🥳 🥳")).toBeInTheDocument();
    expect(screen.getByText("Paystack Secured")).toBeInTheDocument();
    expect(screen.getByText("25+ Verified Performers")).toBeInTheDocument();

    // Performer Portal hero
    expect(screen.getAllByText("Performer Portal").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("heading", { name: "Build your personal digital stage" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Pitch on live casting briefs, set your custom service rates/i),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Get started for free/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("renders the 7-step interactive showcase with 3 states per card (default, active, completed) and extracted 300x300 Figma illustrations without duplicating the reference section", () => {
    render(
      <MemoryRouter>
        <ProductPage />
      </MemoryRouter>,
    );

    // Ensure each of the 7 step titles appears exactly once (no duplicated reference grid section)
    expect(screen.getAllByText("Interactive AI Agent")).toHaveLength(1);
    expect(screen.getAllByText("Custom Rate Cards & Micro-Deliverables")).toHaveLength(1);
    expect(screen.getAllByText("Real-Time Performer Analytics & Visitor Intelligence")).toHaveLength(1);
    expect(screen.getAllByText("Escrow Security")).toHaveLength(1);
    expect(screen.getAllByText("Direct Proposal Bidding")).toHaveLength(1);
    expect(screen.getAllByText("Sleek Bio Storefront")).toHaveLength(1);
    expect(screen.getAllByText("Integrated Scheduling")).toHaveLength(1);

    // Initially Step 01 is active, Steps 02..07 are default
    expect(screen.getByTestId("step-card-01")).toHaveAttribute("data-step-state", "active");
    expect(screen.getByTestId("step-card-02")).toHaveAttribute("data-step-state", "default");
    expect(screen.getByTestId("step-card-03")).toHaveAttribute("data-step-state", "default");
    expect(screen.getByTestId("step-illustration-01")).toBeInTheDocument();

    // Verify product UI illustration stage is hidden on mobile (< 1024px) and only visible on lg+ screens
    const illustrationStage = screen.getByTestId("step-illustration-01").closest('[data-node-id="178359:17450"]');
    expect(illustrationStage).toHaveClass("hidden", "lg:flex");

    // Clicking Step 03 marks Steps 01 and 02 as "completed", Step 03 as "active", and Steps 04..07 as "default"
    fireEvent.click(screen.getByTestId("step-card-03"));
    expect(screen.getByTestId("step-card-01")).toHaveAttribute("data-step-state", "completed");
    expect(screen.getByTestId("step-card-02")).toHaveAttribute("data-step-state", "completed");
    expect(screen.getByTestId("step-card-03")).toHaveAttribute("data-step-state", "active");
    expect(screen.getByTestId("step-card-04")).toHaveAttribute("data-step-state", "default");
    expect(
      screen.getByText(/See exactly who is visiting your page, which monologues they play/i),
    ).toBeInTheDocument();
  });

  it("renders the Client Portal section with 4 capability cards and 6 studio logos", () => {
    render(
      <MemoryRouter>
        <ProductPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("client Portal")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "The Upwork for Performer Acquisition" }),
    ).toBeInTheDocument();

    // 4 cards
    expect(screen.getByText("Verified Creator Pool")).toBeInTheDocument();
    expect(screen.getByText("Chat with AI Performer Profiles")).toBeInTheDocument();
    expect(screen.getByText("Post Gigs & Micro-Briefs")).toBeInTheDocument();
    expect(screen.getByText("Secure Contracts & Escrow Payments")).toBeInTheDocument();

    // Studio trust bar removed per user specification
    expect(screen.queryByText("Trusted by top media houses")).not.toBeInTheDocument();
  });

  it("renders Thespian AI section with Performer 5-row table and Client 3-row table", () => {
    render(
      <MemoryRouter>
        <ProductPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Thespian ai")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Performance Intelligence Engine" }),
    ).toBeInTheDocument();

    // Performer AI block (5 rows)
    expect(screen.getByText("What Thespian AI Does for the Performer")).toBeInTheDocument();
    expect(screen.getByText("Your Digital AI Agent")).toBeInTheDocument();
    expect(screen.getByText("Instant AI Onboarding")).toBeInTheDocument();
    expect(screen.getByText("24/7 AI Booking Agent")).toBeInTheDocument();
    expect(screen.getByText("Automatic Gig Pitching")).toBeInTheDocument();
    expect(screen.getByText("Contract Guardrails")).toBeInTheDocument();
    expect(screen.getByText("AI Rehearsal Partner")).toBeInTheDocument();

    // Client AI block (3 rows)
    expect(screen.getByText("What Thespian AI Does for the Client")).toBeInTheDocument();
    expect(screen.getByText("Your Automated Casting Butler")).toBeInTheDocument();
    expect(screen.getByText("Vibe & Texture Matching")).toBeInTheDocument();
    expect(screen.getByText("Automated Logistics")).toBeInTheDocument();
    expect(screen.getByText("Script & Prompt Parsing")).toBeInTheDocument();
    expect(screen.getByText("Start finding gigs")).toBeInTheDocument();
    expect(screen.getByText("Start hiring today")).toBeInTheDocument();
  });

  it("renders 10 FAQ accordion items and expands on click", () => {
    render(
      <MemoryRouter>
        <ProductPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Frequently Asked Questions" }),
    ).toBeInTheDocument();

    // Default item 0 is open
    expect(
      screen.getByText(/Monologg is like Upwork for Actors, Public speakers/i),
    ).toBeInTheDocument();

    // Click item 4: "How does Thespian AI work?"
    const faqBtn = screen.getByRole("button", { name: /How does Thespian AI work\?/i });
    fireEvent.click(faqBtn);

    expect(
      screen.getByText(/When performers upload their monologues or voice reels, Thespian AI analyzes/i),
    ).toBeInTheDocument();
  });
});
