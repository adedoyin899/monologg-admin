import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { OrderRoom } from "./OrderRoom";

function renderOrderRoom(initialUrl = "/order/ORD-001") {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Routes>
        <Route path="/order/:id" element={<OrderRoom />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("OrderRoom — Senior FAANG UX/UI Redesign (Performer & Client Views)", () => {
  it("renders slim Contract Command Bar with progressive disclosure for event details", async () => {
    renderOrderRoom("/order/ORD-001");

    // Slim command bar shows confirmation prompt without bloating viewport with expanded grid by default
    expect(await screen.findByText(/Confirm attendance for/i)).toBeInTheDocument();
    expect(screen.queryByText("DATE & TIME")).not.toBeInTheDocument();

    // Clicking "Details" progressively discloses the 3-column event metadata grid
    fireEvent.click(screen.getByRole("button", { name: /^Details$/i }));
    expect(screen.getByText("DATE & TIME")).toBeInTheDocument();
    expect(screen.getByText("LOCATION")).toBeInTheDocument();

    // Clicking "Hide Details" collapses it back
    fireEvent.click(screen.getByRole("button", { name: /Hide Details/i }));
    expect(screen.queryByText("DATE & TIME")).not.toBeInTheDocument();
  });

  it("renders unified multi-row composer with integrated Submit Deliverable action for Performer and switches cleanly to Client role", async () => {
    renderOrderRoom("/order/ORD-001");

    expect(await screen.findByText(/Order Room created/i)).toBeInTheDocument();

    // Performer sees integrated Submit Deliverable button in the unified composer toolbar
    expect(screen.getByRole("button", { name: /Submit Deliverable/i })).toBeInTheDocument();

    // Switch to Client role via header switcher
    fireEvent.click(screen.getByRole("button", { name: /^Client$/i }));

    // Client sees Performer Attendance Verification in command bar and compact Google Meet bar
    expect(screen.getByText("Performer Attendance Verification")).toBeInTheDocument();
    expect(screen.getByText(/Schedule Google Meet with/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Launch Google Meet/i })).toBeInTheDocument();
  });

  it("renders the desktop Contextual Inspector Rail with Activity Timeline, Fee Breakdown, and Script Assets, and toggles visibility", async () => {
    renderOrderRoom("/order/ORD-001?role=client");

    const inspector = await screen.findByLabelText("Order Inspector Panel");
    expect(inspector).toBeInTheDocument();
    expect(screen.getByText("Activity Timeline")).toBeInTheDocument();
    expect(screen.getByText("Script & Brief Assets")).toBeInTheDocument();

    // No redundant Payment tab or top-bar Escrow/Take-Home pill duplicating the right rail
    expect(screen.queryByRole("button", { name: /^Payment$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Escrow:$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Take-Home:$/i)).not.toBeInTheDocument();

    // No redundant "You" label on outgoing 1-on-1 chat messages
    expect(screen.queryByText(/^You$/)).not.toBeInTheDocument();

    // Expand fee math in inspector rail
    fireEvent.click(screen.getByRole("button", { name: /Fee breakdown/i }));
    expect(screen.getByText("Escrow fee (12%)")).toBeInTheDocument();
    expect(screen.getByText("Total deposit")).toBeInTheDocument();

    // Toggle inspector rail closed and open
    fireEvent.click(screen.getByRole("button", { name: /Hide Inspector Panel/i }));
    expect(screen.queryByLabelText("Order Inspector Panel")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Show Inspector Panel/i }));
    expect(screen.getByLabelText("Order Inspector Panel")).toBeInTheDocument();
  });

  it("submits deliverable, transitions to 48h Review window, and allows Client to release escrow and submit rating", async () => {
    renderOrderRoom("/order/ORD-001");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Submit Deliverable/i })).toBeInTheDocument();
    });

    // Open Submit Deliverable modal and submit
    fireEvent.click(screen.getByRole("button", { name: /Submit Deliverable/i }));
    expect(await screen.findByText(/Starts the 48-hour client review window/i)).toBeInTheDocument();

    const submitButtons = screen.getAllByRole("button", { name: /^Submit Deliverable$/i });
    fireEvent.click(submitButtons[submitButtons.length - 1]!);

    // Phase advances to Review with 48h countdown
    expect(await screen.findByText(/48-hour inspection window started/i)).toBeInTheDocument();

    // Switch to Client to inspect and release escrow
    fireEvent.click(screen.getByRole("button", { name: /^Client$/i }));
    expect(screen.getByText("Inspection window active")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Release ₦120,000/i }));
    expect(await screen.findByText("Release Payment?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Confirm Release/i }));

    // Payment released and reciprocal rating dock appears
    expect(await screen.findByText(/Rate your experience with/i)).toBeInTheDocument();
  });

  it("opens mobile Order Info modal with full Inspector Rail parity (Counterparty Profile & Role-Accurate Escrow/Take-Home)", async () => {
    renderOrderRoom("/order/ORD-001");

    const infoBtn = await screen.findByRole("button", { name: /Order Info/i });
    fireEvent.click(infoBtn);

    expect(await screen.findByText("Order Details")).toBeInTheDocument();
    expect(screen.getAllByText("Verified Client").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("₦111,600").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Platform fee (7%)")).toBeInTheDocument();
  });
});

