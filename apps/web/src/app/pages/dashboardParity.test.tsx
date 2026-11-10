import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { ClientDashboard } from "./ClientDashboard";
import { TalentDashboard } from "./TalentDashboard";
import { OrderRoom } from "./OrderRoom";

// Behavioral-parity smoke tests (features.md Phase 1 acceptance): each page
// must still render the same real data it did when the data was a local
// mock constant — now sourced through api-client's default mock mode.

describe("ClientDashboard (via api-client, mock mode)", () => {
  it("renders real project data on the home tab", async () => {
    render(
      <MemoryRouter>
        <ClientDashboard />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getAllByText(/Nike Q1 Campaign/).length).toBeGreaterThan(0);
    });
  });
});

describe("TalentDashboard (via api-client, mock mode)", () => {
  it("renders real activity data on the home tab", async () => {
    render(
      <MemoryRouter>
        <TalentDashboard />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getAllByText(/Brand Agency NG/).length).toBeGreaterThan(0);
    });
  });
});

describe("OrderRoom (via api-client, mock mode)", () => {
  it("renders the real message thread for the routed order id", async () => {
    render(
      <MemoryRouter initialEntries={["/order/ORD-001"]}>
        <Routes>
          <Route path="/order/:id" element={<OrderRoom />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/Order Room created/)).toBeInTheDocument();
    });
  });

  it("renders the interactive Google Meet reminder banner for client role with launch and copy actions", async () => {
    render(
      <MemoryRouter initialEntries={["/order/ORD-001?role=client"]}>
        <Routes>
          <Route path="/order/:id" element={<OrderRoom />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/Schedule Google Meet with/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Launch Google Meet/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Copy Link/i })).toBeInTheDocument();
    });
  });
});
