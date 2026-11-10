import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

async function renderOrdersTab() {
  const { TalentDashboard } = await import("./TalentDashboard");
  render(
    <MemoryRouter>
      <TalentDashboard />
    </MemoryRouter>,
  );
  const ordersNavBtns = screen.getAllByText(/Active Orders/i);
  fireEvent.click(ordersNavBtns[0]!);
  await screen.findByPlaceholderText("Search orders or clients...");
}

describe("TalentDashboard — Active Orders Tab (Design Review Polish)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("renders a single page header with no duplicate H2 and no redundant subtitle", async () => {
    await renderOrdersTab();

    // Exactly one h1 for page header
    const headings = screen.getAllByRole("heading", { name: /Active Orders/i });
    expect(headings.length).toBe(1);
    expect(headings[0]!.tagName.toLowerCase()).toBe("h1");

    // Redundant H2 subtitle is removed
    expect(screen.queryByText("Direct chat rooms for all your live project collaborations.")).not.toBeInTheDocument();

    // Canonical desktop subtitle exists
    expect(screen.getByText("Manage your active collaborations.")).toBeInTheDocument();
  });

  it("renders clean controls toolbar and streamlined list items without redundant boilerplate", async () => {
    await renderOrdersTab();

    // Clean toolbar with order count
    const countEl = screen.getByText("3");
    expect(countEl.parentElement?.textContent).toContain("3 active orders");
    expect(screen.getByPlaceholderText("Search orders or clients...")).toBeInTheDocument();

    // Redundant filler text removed
    expect(screen.queryByText(/Active collaboration room · Tap to chat/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Enter Room")).not.toBeInTheDocument();

    // Clean phase status pills and due dates are rendered
    expect(screen.getAllByText(/Due Dec/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Deliverables").length).toBeGreaterThan(0);
  });

  it("opens the mobile More navigation drawer exposing unrepresented destinations and simplified settings", async () => {
    await renderOrdersTab();

    const moreBtn = screen.getByRole("button", { name: /More navigation options/i });
    fireEvent.click(moreBtn);

    const dialog = await screen.findByRole("dialog", { name: /Mobile navigation menu/i });
    expect(dialog).toBeInTheDocument();

    const drawer = within(dialog);

    // Section headers and quick actions
    expect(drawer.getByText("More Views")).toBeInTheDocument();
    expect(drawer.getByRole("button", { name: /^Settings$/i })).toBeInTheDocument();

    // Contains only views that are NOT already in the bottom dock
    expect(drawer.getByText("My Profile")).toBeInTheDocument();
    expect(drawer.getByText("Earnings")).toBeInTheDocument();
    expect(drawer.getByText("Analytics")).toBeInTheDocument();
    expect(drawer.getByText("Recent Activity")).toBeInTheDocument();

    // Dock destinations are not duplicated in the More Views list
    // (Orders, Home/Dashboard, Rate Cards, Availability, Projects are dock items)
    expect(drawer.queryByText("Transactions & Escrow Ledger")).not.toBeInTheDocument();
    expect(drawer.queryByText("Help & Dispute Support")).not.toBeInTheDocument();
    expect(drawer.getByRole("button", { name: /Sign Out/i })).toBeInTheDocument();
  });
});
