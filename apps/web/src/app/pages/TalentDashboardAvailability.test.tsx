import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

async function renderDashboard() {
  const { TalentDashboard } = await import("./TalentDashboard");
  render(
    <MemoryRouter>
      <TalentDashboard />
    </MemoryRouter>,
  );
}

async function navigateToAvailabilityTab() {
  await renderDashboard();
  const buttons = screen.getAllByRole("button");
  const availBtn = buttons.find((b) => b.textContent?.trim() === "Availability");
  if (availBtn) {
    fireEvent.click(availBtn);
  }
}

describe("TalentDashboard Availability / Calendar View Stress Test", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("renders Availability tab with Month view by default and allows switching to Week and Day views", async () => {
    await navigateToAvailabilityTab();

    // Verify Month view default text
    expect(await screen.findByText("Select a date to view scheduled slots & events")).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();
    expect(screen.getByText("Mon")).toBeInTheDocument();

    // Switch to Week view
    const weekBtn = screen.getByRole("button", { name: "Week" });
    fireEvent.click(weekBtn);

    // Verify Week view grid
    expect(screen.getByText("Time")).toBeInTheDocument();
    expect(screen.getByText("11:30")).toBeInTheDocument();

    // Switch to Day view
    const dayBtn = screen.getByRole("button", { name: "Day" });
    fireEvent.click(dayBtn);

    // Verify Day view header button and time slot
    expect(screen.getAllByRole("button", { name: /Add slot/i }).length).toBeGreaterThan(0);

    // Switch back to Month view
    const monthBtn = screen.getByRole("button", { name: "Month" });
    fireEvent.click(monthBtn);
    expect(screen.getByText("Select a date to view scheduled slots & events")).toBeInTheDocument();
  });

  it("navigates period using Prev, Next, Today controls and rolling date selector strip", async () => {
    await navigateToAvailabilityTab();
    await screen.findByText("Select a date to view scheduled slots & events");

    // Click Previous period button
    const prevBtn = screen.getByRole("button", { name: "Previous period" });
    fireEvent.click(prevBtn);

    // Click Next period button
    const nextBtn = screen.getByRole("button", { name: "Next period" });
    fireEvent.click(nextBtn);

    // Click Today button
    const todayBtns = screen.getAllByRole("button", { name: /today/i });
    fireEvent.click(todayBtns[0]);

    // Click jump to today icon button
    const jumpBtn = screen.getByRole("button", { name: "Jump to today" });
    fireEvent.click(jumpBtn);
  });

  it("opens action popover when clicking a date cell in month view", async () => {
    await navigateToAvailabilityTab();
    await screen.findByText("Select a date to view scheduled slots & events");

    // Find day 15 in Month view grid
    const day15 = screen.getByText("15");
    fireEvent.click(day15);

    // Action popover should open
    await waitFor(() => {
      expect(screen.getByText(/Mark as Available/i)).toBeInTheDocument();
    });

    // Click Mark as Available
    const markAvailBtn = screen.getByText(/Mark as Available/i);
    fireEvent.click(markAvailBtn);

    // Add slot modal should open
    await waitFor(() => {
      expect(screen.getByText(/Add slot —/i)).toBeInTheDocument();
    });
  });

  it("allows adding and saving an explicit slot", async () => {
    await navigateToAvailabilityTab();
    await screen.findByText("Select a date to view scheduled slots & events");

    // Click "+ Add slot" button
    const addSlotBtns = screen.getAllByRole("button", { name: /Add slot/i });
    fireEvent.click(addSlotBtns[0]);

    // Verify Add slot modal renders
    await waitFor(() => {
      expect(screen.getByText(/Add slot —/i)).toBeInTheDocument();
    });

    // Click Save Slot
    const saveSlotBtn = screen.getByRole("button", { name: "Save Slot" });
    fireEvent.click(saveSlotBtn);
  });

  it("allows adding and saving a personal event", async () => {
    await navigateToAvailabilityTab();
    await screen.findByText("Select a date to view scheduled slots & events");

    // Click "+ Add event" button
    const addEventBtns = screen.getAllByRole("button", { name: /Add event/i });
    fireEvent.click(addEventBtns[0]);

    // Verify Add event modal renders
    await waitFor(() => {
      expect(screen.getByText(/Add event —/i)).toBeInTheDocument();
    });

    // Fill title
    const titleInput = screen.getByPlaceholderText(/e.g. Table read/i);
    fireEvent.change(titleInput, { target: { value: "Commercial Table Read" } });

    // Click Save Event
    const saveEventBtn = screen.getByRole("button", { name: "Save Event" });
    fireEvent.click(saveEventBtn);

    // Event should now be listed under Events section
    await waitFor(() => {
      expect(screen.getByText("Commercial Table Read")).toBeInTheDocument();
    });
  });

  it("opens and submits recurring availability form", async () => {
    await navigateToAvailabilityTab();
    await screen.findByText("Select a date to view scheduled slots & events");

    // Find all buttons
    const allButtons = screen.getAllByRole("button");
    const recurAddBtn = allButtons.find((b) => b.textContent?.trim() === "Add");
    if (recurAddBtn) {
      fireEvent.click(recurAddBtn);
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Recurring availability" })).toBeInTheDocument();
      });

      // Save Recurring Template
      const saveRecurBtn = screen.getByRole("button", { name: "Save Recurring Template" });
      fireEvent.click(saveRecurBtn);
    }
  });

  it("opens Google Calendar sync modal", async () => {
    await navigateToAvailabilityTab();
    await screen.findByText("Select a date to view scheduled slots & events");

    // Click Connect button
    const connectBtn = screen.getByRole("button", { name: /Connect Google Calendar|Connect/i });
    fireEvent.click(connectBtn);

    // Verify sync modal
    await waitFor(() => {
      expect(screen.getByText("Sync with Google Calendar")).toBeInTheDocument();
    });
  });
});
