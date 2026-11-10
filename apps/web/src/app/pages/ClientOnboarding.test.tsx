import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { ClientOnboarding } from "./ClientOnboarding";
import { appStateSync } from "../../lib/state-sync";

const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("ClientOnboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Step 1 with 'Tell us about you', Brand Name, Category, and no slashes in options", () => {
    render(
      <MemoryRouter>
        <ClientOnboarding />
      </MemoryRouter>
    );

    // Title & Subtitle
    expect(screen.getByText("Tell us about you")).toBeInTheDocument();
    expect(
      screen.getByText("Help us personalize your performer discovery experience.")
    ).toBeInTheDocument();

    // Field labels
    expect(screen.getByText("Brand Name")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Website (optional)")).toBeInTheDocument();

    // Verify clean options without slashes
    expect(screen.getByText("Brand")).toBeInTheDocument();
    expect(screen.getByText("Individual")).toBeInTheDocument();
    expect(screen.queryByText(/Brand \//)).not.toBeInTheDocument();
    expect(screen.queryByText(/Individual \//)).not.toBeInTheDocument();

    // Continue is initially disabled because brand name is empty
    const continueBtn = screen.getByRole("button", { name: "Continue" });
    expect(continueBtn).toBeDisabled();

    // Entering brand name enables Continue button
    const brandInput = screen.getByPlaceholderText("e.g., RedTV, Nike, or your name");
    fireEvent.change(brandInput, { target: { value: "Nike Africa" } });
    expect(continueBtn).not.toBeDisabled();
  });

  it("navigates to Step 2 with 6 performer categories multi-select and hiring frequency", async () => {
    render(
      <MemoryRouter>
        <ClientOnboarding />
      </MemoryRouter>
    );

    // Fill Step 1
    const brandInput = screen.getByPlaceholderText("e.g., RedTV, Nike, or your name");
    fireEvent.change(brandInput, { target: { value: "RedTV Studios" } });
    fireEvent.click(screen.getByText("Brand"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 2 header
    await screen.findByText("What are you looking for?");
    expect(
      screen.getByText("Select the performers you want to discover and how often you hire.")
    ).toBeInTheDocument();

    // 6 performer categories
    expect(screen.getByText("Actors")).toBeInTheDocument();
    expect(screen.getByText("Public speakers")).toBeInTheDocument();
    expect(screen.getByText("Comperes")).toBeInTheDocument();
    expect(screen.getByText("Comedians")).toBeInTheDocument();
    expect(screen.getByText("Artists")).toBeInTheDocument();
    expect(screen.getByText("Creators")).toBeInTheDocument();

    // Multi-select test: click Comedians and Creators
    fireEvent.click(screen.getByText("Comedians"));
    fireEvent.click(screen.getByText("Creators"));
    expect(screen.getByText("3 selected")).toBeInTheDocument();

    // Hiring frequency
    expect(screen.getByText("How often will you be hiring?")).toBeInTheDocument();
    expect(screen.getByText("Weekly")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Weekly"));

    // Back button returns to Step 1
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await screen.findByText("Tell us about you");

    // Continue back to Step 2
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("What are you looking for?");

    // Step 3 (Payment) is completely removed: Clicking 'Get Started' finishes onboarding directly
    const getStartedBtn = screen.getByRole("button", { name: "Get Started" });
    expect(getStartedBtn).toBeInTheDocument();
    fireEvent.click(getStartedBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/client");
    const updatedProfile = appStateSync.getClientProfile();
    expect(updatedProfile.orgName).toBe("RedTV Studios");
    expect(updatedProfile.orgType).toBe("Brand");
    expect(updatedProfile.hiringFrequency).toBe("Weekly");
    expect(updatedProfile.targetCategories).toContain("comedians");
    expect(updatedProfile.targetCategories).toContain("creators");
  });
});
