import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { TopAnnouncementBar } from "./TopAnnouncementBar";

describe("TopAnnouncementBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the announcement banner with blinking red indicator and alpha text", () => {
    render(<TopAnnouncementBar />);

    expect(screen.getByText("Monologg is in Alpha 🥳 🥳")).toBeInTheDocument();
    expect(screen.getByTestId("announcement-red-dot")).toBeInTheDocument();
    expect(screen.getByTestId("announcement-red-dot").querySelector(".animate-ping")).toBeInTheDocument();
    expect(screen.getByTestId("announcement-red-dot").querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("initially shows Paystack Secured and hides 25+ Verified Performers", () => {
    render(<TopAnnouncementBar />);

    const paystack = screen.getByTestId("announcement-slide-paystack");
    const performers = screen.getByTestId("announcement-slide-performers");

    expect(paystack).toBeInTheDocument();
    expect(performers).toBeInTheDocument();

    expect(paystack).toHaveClass("opacity-100");
    expect(performers).toHaveClass("opacity-0");
  });

  it("rotates to 25+ Verified Performers after 20 seconds", () => {
    render(<TopAnnouncementBar />);

    const paystack = screen.getByTestId("announcement-slide-paystack");
    const performers = screen.getByTestId("announcement-slide-performers");

    expect(paystack).toHaveClass("opacity-100");
    expect(performers).toHaveClass("opacity-0");

    // Advance 20 seconds
    act(() => {
      vi.advanceTimersByTime(20000);
    });

    expect(paystack).toHaveClass("opacity-0");
    expect(performers).toHaveClass("opacity-100");

    // Advance another 20 seconds to rotate back
    act(() => {
      vi.advanceTimersByTime(20000);
    });

    expect(paystack).toHaveClass("opacity-100");
    expect(performers).toHaveClass("opacity-0");
  });

  it("supports custom intervalMs and nodeId", () => {
    const { container } = render(
      <TopAnnouncementBar intervalMs={5000} nodeId="custom-node-123" />
    );

    expect(container.firstChild).toHaveAttribute("data-node-id", "custom-node-123");

    const paystack = screen.getByTestId("announcement-slide-paystack");
    const performers = screen.getByTestId("announcement-slide-performers");

    expect(paystack).toHaveClass("opacity-100");

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(paystack).toHaveClass("opacity-0");
    expect(performers).toHaveClass("opacity-100");
  });
});
