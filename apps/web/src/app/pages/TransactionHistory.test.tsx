import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

// features.md Phase 10: transaction history renders real, owner-scoped data
// with a fee breakdown in live mode; mock mode uses local fixtures (new
// screen, no prior UI to preserve, but same seam contract as every other page).

async function renderPage(initialEntries = ["/transactions"]) {
  const { TransactionHistory } = await import("./TransactionHistory");
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <TransactionHistory />
    </MemoryRouter>,
  );
}

describe("TransactionHistory", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("mock mode: shows fixture transactions with no network call", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await renderPage();

    await screen.findByText("Booking ORD-001");
    expect((await screen.findAllByText("Payout")).length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("live mode: renders real fee breakdown from the API", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [
            {
              id: "txn-1",
              bookingId: "b1",
              direction: "payment",
              state: "ESCROW_HELD",
              currency: "NGN",
              baseAmount: 1_000_000,
              baseAmountFormatted: "₦10,000",
              feeAmount: 150_000,
              feeAmountFormatted: "₦1,500",
              totalAmount: 1_150_000,
              totalAmountFormatted: "₦11,500",
              providerRef: "ref-live-1",
              createdAt: new Date().toISOString(),
            },
          ],
          page: 1,
          pageSize: 100,
          total: 1,
          totalPages: 1,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await renderPage();

    expect((await screen.findAllByText("₦11,500")).length).toBeGreaterThan(0);
    // Feed cards are clean without secondary breakdown
    expect(screen.queryByText(/Base ₦10,000/)).not.toBeInTheDocument();

    // Clicking card opens modal where detailed breakdown is presented
    const card = (await screen.findByText("Booking b1")).closest("div[class*='cursor-pointer']")!;
    fireEvent.click(card);
    expect(screen.getByText("Gig Price")).toBeInTheDocument();
    expect(screen.getByText("₦10,000")).toBeInTheDocument();
    expect(screen.getByText("-₦1,500")).toBeInTheDocument();
    expect(screen.getByText("ref-live-1")).toBeInTheDocument();
  });

  it("live mode: changing the status filter re-fetches with the state query param", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ data: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await renderPage();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("Filter by status"), { target: { value: "REFUNDED" } });

    await waitFor(() => {
      const lastCallUrl = fetchMock.mock.calls[fetchMock.mock.calls.length - 1][0] as string;
      expect(lastCallUrl).toContain("state=REFUNDED");
    });
  });

  it("removes the Request Payout Withdrawal button and client safeguard CTA from the performer history view", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    await renderPage();
    await screen.findByText("Earnings & Transaction History");
    expect(screen.queryByRole("button", { name: /request payout withdrawal/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /withdraw funds/i })).not.toBeInTheDocument();
    expect(screen.getByText("Escrow Protected")).toBeInTheDocument();
    expect(screen.getByText("Automated Ledger Settlement")).toBeInTheDocument();
  });

  it("dynamically changes the hero balance when toggling Payout, Escrow, and Dispute chips", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    await renderPage();

    // Default view shows Total Platform Volume
    await screen.findByText("TOTAL PLATFORM VOLUME");

    // Click Payout chip -> reflects Total Completed Payouts
    const payoutChip = screen.getByRole("button", { name: /payout/i });
    fireEvent.click(payoutChip);
    await screen.findByText("TOTAL COMPLETED PAYOUTS");
    expect(screen.getByText("₦1,420,000")).toBeInTheDocument();
    expect(screen.getByText(/8 Completed Escrow Contracts Paid Out/i)).toBeInTheDocument();

    // Click Escrow chip -> reflects Funds Held in Escrow
    const escrowChip = screen.getByRole("button", { name: /escrow/i });
    fireEvent.click(escrowChip);
    await screen.findByText("FUNDS HELD IN ESCROW");
    expect(screen.getByText(/Active Contracts Pending Delivery/i)).toBeInTheDocument();

    // Click Dispute chip -> reflects Total Disputed & Settled Funds
    const disputeChip = screen.getByRole("button", { name: /dispute/i });
    fireEvent.click(disputeChip);
    await screen.findByText("TOTAL DISPUTED & SETTLED FUNDS");
    expect(screen.getAllByText(/Refunded to Client/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/1 In Review \(Pending\) · 1 Settled/i)).toBeInTheDocument();
  });

  it("renders human status badges: Success for Payout, Pending for Escrow, Settled/In Review for Dispute", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    await renderPage();

    await screen.findByText("Booking ORD-001");
    // Check that card badges render modern taxonomy: Success, Pending, Settled, In Review
    expect(screen.getAllByText("Success").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Settled").length).toBeGreaterThan(0);
    expect(screen.getAllByText("In Review").length).toBeGreaterThan(0);
  });

  it("modal displays plain-English breakdown and ₦0 take-home for refunded disputes", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    await renderPage();

    // Find and click on the refunded transaction card
    const refundedCard = (await screen.findByText("Booking ORD-003")).closest("div[class*='cursor-pointer']")!;
    fireEvent.click(refundedCard);

    // Modal opens with clear, jargon-free language
    expect(screen.getByText("Transaction Details")).toBeInTheDocument();
    expect(screen.getByText("Booking was cancelled. Money was refunded to the client. You received ₦0.")).toBeInTheDocument();
    expect(screen.getByText("You Receive")).toBeInTheDocument();
    expect(screen.getByText("₦0")).toBeInTheDocument();
  });

  it("client portal: renders Withdraw Funds button and enforces live projects safeguard gate", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    await renderPage(["/transactions?role=client"]);

    // 1. "Withdraw Funds" button and "Direct 24hr settlement" are rendered
    const withdrawBtn = await screen.findByRole("button", { name: /Withdraw Funds/i });
    expect(withdrawBtn).toBeInTheDocument();
    expect(screen.getByText("Direct 24hr settlement")).toBeInTheDocument();

    // 2. Click "Withdraw Funds" opens step 1: amount entry
    fireEvent.click(withdrawBtn);
    expect(await screen.findByText(/Transfer available funds to your personal bank/i)).toBeInTheDocument();
    expect(screen.getByText(/(GTBank|Access Bank Plc)/i)).toBeInTheDocument();
    expect(screen.getByText(/Funds will reach your personal account within 24 hours/i)).toBeInTheDocument();

    // 3. Click Proceed with Withdrawal opens step 2: Live Projects Safeguard Gate
    const proceedBtn = screen.getByRole("button", { name: /Proceed with Withdrawal/i });
    fireEvent.click(proceedBtn);

    expect(await screen.findByText(/live projects holding escrow/i)).toBeInTheDocument();
    expect(screen.getByText(/Nike Q1 Campaign/i)).toBeInTheDocument();
    expect(screen.getByText(/Tech Summit Compere/i)).toBeInTheDocument();
    expect(screen.getByText(/Film Auditions Jan 2025/i)).toBeInTheDocument();

    // 4. Click Move 3 Projects to Draft & Withdraw initiates withdrawal and confirms 24hr timeline
    const confirmWithdrawBtn = screen.getByRole("button", { name: /Move 3 Projects to Draft & Withdraw/i });
    fireEvent.click(confirmWithdrawBtn);

    expect(await screen.findByText("Withdrawal Initiated!")).toBeInTheDocument();
    expect(screen.getAllByText(/Within 24 Hours/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/3 Projects Moved to Draft/i)).toBeInTheDocument();
    expect(screen.getByText(/View Draft Projects/i)).toBeInTheDocument();
  });

  it("client portal: handles direct withdrawal cleanly when no active projects exist (does not show 0 projects moved or draft banner)", async () => {
    const { appStateSync } = await import("../../lib/state-sync");
    // Move all projects to draft beforehand
    const projects = appStateSync.getClientProjects();
    appStateSync.moveProjectsToDraft(projects.map((p) => p.id));

    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    await renderPage(["/transactions?role=client"]);

    const withdrawBtn = await screen.findByRole("button", { name: /Withdraw Funds/i });
    fireEvent.click(withdrawBtn);

    const proceedBtn = await screen.findByRole("button", { name: /Proceed with Withdrawal/i });
    fireEvent.click(proceedBtn);

    // Bypasses safeguard gate directly to success
    expect(await screen.findByText("Withdrawal Initiated!")).toBeInTheDocument();
    expect(screen.queryByText(/0 Projects Moved to Draft/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/find your saved projects under Drafts/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Settlement in progress:/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dashboard/i })).toBeInTheDocument();
  });
});
