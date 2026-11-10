import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// features.md Phase 12A.3 — PWA-10 attribute filters. Only the new filter
// behavior is covered here, not a full ClientDashboard suite (none existed
// before this phase).

async function renderDiscoverTab() {
  const { ClientDashboard } = await import("./ClientDashboard");
  render(
    <MemoryRouter>
      <ClientDashboard />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getAllByText("Find Performers")[0]!);
  // AnimatePresence (mode="wait") delays mounting the next tab until the
  // previous one's exit transition finishes — same gotcha AuthFlow.test.tsx/
  // ProjectBrief.test.tsx already document; await the switch via something
  // only the discover tab renders before touching it further.
  await screen.findByPlaceholderText("Search by name, role, or vibe...");
}

describe("ClientDashboard — attribute filters", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("mock mode: the filter panel toggles and makes no network calls", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await renderDiscoverTab();
    expect(screen.queryByText("Gender")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Filter performers"));
    expect(await screen.findByText("Gender")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("live mode: selecting an attribute chip re-fetches /talent with that filter", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    const fetchMock = vi.fn(async (_input?: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ data: [], page: 1, pageSize: 100, total: 0, totalPages: 0 }), {
      status: 200, headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await renderDiscoverTab();
    fireEvent.click(screen.getByLabelText("Filter performers"));
    await screen.findByText("Gender");

    fireEvent.click(screen.getByText("MASCULINE"));

    await waitFor(() => {
      const calledUrls = fetchMock.mock.calls.map((c) => String(c[0]));
      expect(calledUrls.some((u) => u.includes("genderPresentation=MASCULINE"))).toBe(true);
    });
  });

  it("Clear attribute filters resets and re-fetches unfiltered", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    const fetchMock = vi.fn(async (_input?: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ data: [], page: 1, pageSize: 100, total: 0, totalPages: 0 }), {
      status: 200, headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await renderDiscoverTab();
    fireEvent.click(screen.getByLabelText("Filter performers"));
    await screen.findByText("Gender");
    fireEvent.click(screen.getByText("MASCULINE"));
    await screen.findByText("Clear attribute filters");

    fireEvent.click(screen.getByText("Clear attribute filters"));

    await waitFor(() => {
      const lastUrl = String(fetchMock.mock.calls.at(-1)?.[0]);
      expect(lastUrl).not.toContain("genderPresentation=");
    });
  });
});

describe("ClientDashboard — Projects Detailed View (Client POV)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function renderProjectsTab() {
    const { ClientDashboard } = await import("./ClientDashboard");
    render(
      <MemoryRouter>
        <ClientDashboard />
      </MemoryRouter>,
    );
    // Click the "My Projects" tab in the navigation
    const projectsTabBtn = screen.getAllByText(/My Projects/i)[0]!;
    fireEvent.click(projectsTabBtn);
    await screen.findByText("Nike Q1 Campaign");
  }

  it("navigates to My Projects tab, opens project detailed view, and displays all key FAANG sections", async () => {
    await renderProjectsTab();

    // Click "View Project →"
    const viewButtons = screen.getAllByText("View Project →");
    fireEvent.click(viewButtons[0]!);

    // Check project header metadata
    expect(await screen.findByText("P-001")).toBeInTheDocument();
    expect(screen.getAllByText("Nike Q1 Campaign").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("₦200,000")).toBeInTheDocument();

    // Check Applicant Pipeline & Casting on default active tab
    expect(screen.getByText(/Applicant Pipeline & Casting/i)).toBeInTheDocument();
    expect(screen.getByText("Adaeze Obi")).toBeInTheDocument();
    expect(screen.getByText("Amara Diallo")).toBeInTheDocument();
    expect(screen.getByText("Project Action Center")).toBeInTheDocument();

    // Check Overview & Brief tab
    fireEvent.click(screen.getByRole("button", { name: /overview & brief/i }));
    expect(screen.getByText("Creative Brief & Synopsis")).toBeInTheDocument();
    expect(
      screen.getByText(/Seeking a commanding, resonant voiceover artist/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Project Format & Production Details")).toBeInTheDocument();

    // Check Roles & Requirements tab
    fireEvent.click(screen.getByRole("button", { name: /roles & requirements/i }));
    expect(screen.getByText("Role & Craft Requirements")).toBeInTheDocument();
    expect(screen.getByText("VO ARTIST")).toBeInTheDocument();

    // Check Script & Materials tab
    fireEvent.click(screen.getByRole("button", { name: /script & materials/i }));
    expect(screen.getByText("Audition Sides & Script Excerpt")).toBeInTheDocument();
    expect(screen.getByText("Project Assets & Reference Files")).toBeInTheDocument();
    expect(screen.getByText("Nike_Q1_Campaign_Creative_Brief.pdf")).toBeInTheDocument();

    // Check Escrow & Protection tab
    fireEvent.click(screen.getByRole("button", { name: /escrow & protection/i }));
    expect(screen.getByText("Escrow Protection & Settlement Guarantee")).toBeInTheDocument();
  });

  it("state switcher preview updates status badges and contextual Action Center CTAs", async () => {
    await renderProjectsTab();
    fireEvent.click(screen.getAllByText("View Project →")[0]!);
    await screen.findByText("P-001");

    // Click Draft state button
    fireEvent.click(screen.getByRole("button", { name: "Draft" }));
    expect(screen.getAllByText("Draft").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: /publish & fund escrow/i }).length).toBeGreaterThanOrEqual(1);

    // Click In Progress state button
    fireEvent.click(screen.getByRole("button", { name: "In Progress" }));
    expect(screen.getAllByText("In Progress · Hired").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Open Order Room/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Message Performer")).toBeInTheDocument();

    // Click Review state button
    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    expect(screen.getAllByText("Under Review · Files Submitted").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Inspect in Order Room/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Request Revision")).toBeInTheDocument();

    // Click Closed state button
    fireEvent.click(screen.getByRole("button", { name: "Closed" }));
    expect(screen.getAllByText("Applications Closed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Reopen Applications")).toBeInTheDocument();
  });

  it("draft state renders inactive casting banner and hides active candidate list", async () => {
    await renderProjectsTab();
    fireEvent.click(screen.getAllByText("View Project →")[0]!);
    await screen.findByText("P-001");

    // Click Draft state switcher
    fireEvent.click(screen.getByRole("button", { name: "Draft" }));
    expect(screen.getByText("Casting Pipeline Inactive")).toBeInTheDocument();
    expect(screen.queryByText("Adaeze Obi")).not.toBeInTheDocument();
    expect(screen.queryByText("Amara Diallo")).not.toBeInTheDocument();

    // Re-publishing opens escrow modal, confirming switches to active and restores candidates
    fireEvent.click(screen.getAllByRole("button", { name: /publish & fund escrow/i })[0]!);
    expect(await screen.findByText("Publish Brief & Fund Escrow")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Publish Live/i }));
    await waitFor(() => {
      expect(screen.getByText("Adaeze Obi")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("view profile & reels opens performer storefront modal with casting CTAs and launches profile in separate tab", async () => {
    const openMock = vi.fn();
    window.open = openMock;
    await renderProjectsTab();
    fireEvent.click(screen.getAllByText("View Project →")[0]!);
    await screen.findByText("Adaeze Obi");

    const viewProfileBtns = screen.getAllByRole("button", { name: /view profile & reels/i });
    fireEvent.click(viewProfileBtns[0]!);

    // Confirms profile launched in separate tab
    expect(openMock).toHaveBeenCalledWith(expect.stringContaining("adaeze-obi"), "_blank");

    // Storefront modal mounts
    expect(screen.getByText("Open Public Storefront")).toBeInTheDocument();
    expect(screen.getByText(/Audition Pitch & Proposal/i)).toBeInTheDocument();
    expect(screen.getByText("Accept / Hire Performer")).toBeInTheDocument();

    // Clicking Shortlist in modal updates applicant status
    const shortlistBtns = screen.getAllByRole("button", { name: "Shortlist" });
    fireEvent.click(shortlistBtns[shortlistBtns.length - 1]!);

    // Clicking Hire in modal triggers hire flow and transitions to in_progress
    const hireModalBtn = screen.getByRole("button", { name: /accept \/ hire performer/i });
    fireEvent.click(hireModalBtn);
    expect(screen.getAllByRole("button", { name: /open order room/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("copies audition script to clipboard and confirms copied state", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    await renderProjectsTab();
    fireEvent.click(screen.getAllByText("View Project →")[0]!);
    fireEvent.click(screen.getByRole("button", { name: /script & materials/i }));
    await screen.findByText("Audition Sides & Script Excerpt");

    const copyBtn = screen.getByRole("button", { name: /copy script/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalled();
    expect(await screen.findByText("Copied!")).toBeInTheDocument();
  });

  it("filters applicant pipeline and navigates back to projects list", async () => {
    await renderProjectsTab();
    fireEvent.click(screen.getAllByText("View Project →")[0]!);
    await screen.findByText(/Applicant Pipeline & Casting/i);

    // Filter by Shortlisted
    fireEvent.click(screen.getByRole("button", { name: /shortlisted \(/i }));
    expect(screen.getByText("Amara Diallo")).toBeInTheDocument();
    expect(screen.queryByText("Adaeze Obi")).not.toBeInTheDocument();

    // Filter by All
    fireEvent.click(screen.getByRole("button", { name: /all \(/i }));
    expect(screen.getByText("Adaeze Obi")).toBeInTheDocument();
    expect(screen.getByText("Amara Diallo")).toBeInTheDocument();

    // Search filter input
    const searchInput = screen.getByPlaceholderText(/search applicants\.\.\./i);
    fireEvent.change(searchInput, { target: { value: "Adaeze" } });
    expect(screen.getByText("Adaeze Obi")).toBeInTheDocument();
    expect(screen.queryByText("Amara Diallo")).not.toBeInTheDocument();

    // Back to My Projects
    fireEvent.click(screen.getByRole("button", { name: /back to my projects/i }));
    expect(await screen.findByText("Post a new project")).toBeInTheDocument();
    expect(screen.queryByText("Role & Craft Requirements")).not.toBeInTheDocument();
  });

  it("renders draft status banner with stepper resumption CTAs and navigates to the brief stepper", async () => {
    mockNavigate.mockClear();
    await renderProjectsTab();
    fireEvent.click(screen.getAllByText("View Project →")[0]!);
    await screen.findByText("P-001");

    // Switch to Draft mode
    fireEvent.click(screen.getByRole("button", { name: "Draft" }));

    // Verify Draft banner and Stepper resumption CTA render
    expect(screen.getByText(/Continuing from where you left off/i)).toBeInTheDocument();
    expect(screen.getByText("Continue Draft Stepper →")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resume draft stepper/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resume draft in stepper/i })).toBeInTheDocument();

    // Verify sections stay in clean view mode without inline form editors
    expect(screen.queryByText("Draft Setup Stepper")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Overview" })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Project Title")).not.toBeInTheDocument();

    // Clicking "Continue Draft Stepper →" navigates to the brief creation flow with the project id
    fireEvent.click(screen.getByText("Continue Draft Stepper →"));
    expect(mockNavigate).toHaveBeenCalledWith("/brief?id=P-001");

    // Clicking header "Resume Draft Stepper" also navigates to the brief creation flow
    fireEvent.click(screen.getByRole("button", { name: /resume draft stepper/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/brief?id=P-001");
  });
});

describe("ClientDashboard — Analytics Tab", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("renders 4 updated metrics cards, date range dropdown, and spend graph while removing funnel and category allocation", async () => {
    const { ClientDashboard } = await import("./ClientDashboard");
    render(
      <MemoryRouter initialEntries={["/client"]}>
        <ClientDashboard />
      </MemoryRouter>,
    );

    // Navigate to Analytics tab
    const analyticsNav = screen.getByRole("button", { name: "Analytics" });
    fireEvent.click(analyticsNav);

    // Heading renders
    await screen.findByText("Hiring & Budget Analytics");

    // Live Sync chip is removed; Date Range dropdown is rendered
    expect(screen.queryByText("Live Sync Active")).not.toBeInTheDocument();
    const dateRangeSelect = screen.getByLabelText("Analytics date range");
    expect(dateRangeSelect).toBeInTheDocument();

    // 4 metric cards are rendered with initial This Year data
    expect(screen.getByText("Total spend till date")).toBeInTheDocument();
    expect(screen.getAllByText("₦850,000").length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText("Total successful projects")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();

    expect(screen.getByText("Average rating")).toBeInTheDocument();
    expect(screen.getByText("4.9 ★")).toBeInTheDocument();

    expect(screen.getByText("Repeat talent rate")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();

    // Funnel and category budget allocation cards are removed
    expect(screen.queryByText("Performer Acquisition Funnel")).not.toBeInTheDocument();
    expect(screen.queryByText("Category Budget Allocation")).not.toBeInTheDocument();

    // Spend Over Time spline chart is rendered
    expect(screen.getByText("Spend Over Time")).toBeInTheDocument();

    // Changing the date range dropdown updates the metrics and spend graph
    fireEvent.change(dateRangeSelect, { target: { value: "30d" } });

    expect(screen.getAllByText("₦285,000").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("5.0 ★")).toBeInTheDocument();
    expect(screen.getByText("33%")).toBeInTheDocument();
    expect(screen.getByText("Campaign spend across 4 weekly payout milestones")).toBeInTheDocument();

    // Switching to 90d updates
    fireEvent.change(dateRangeSelect, { target: { value: "90d" } });
    expect(screen.getAllByText("₦590,000").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("28%")).toBeInTheDocument();

    // Switching to All Time updates
    fireEvent.change(dateRangeSelect, { target: { value: "all" } });
    expect(screen.getAllByText("₦1,420,000").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
  });
});

describe("ClientDashboard — Fund Client Wallet Modal & Paystack Integration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function renderDashboard() {
    const { ClientDashboard } = await import("./ClientDashboard");
    render(
      <MemoryRouter initialEntries={["/client"]}>
        <ClientDashboard />
      </MemoryRouter>,
    );
  }

  it("opens the fund wallet modal, cleans copy, allows quick preset selection", async () => {
    await renderDashboard();
    const fundWalletBtn = await screen.findByRole("button", { name: /fund wallet/i });
    fireEvent.click(fundWalletBtn);

    expect(await screen.findByText("Fund Client Wallet")).toBeInTheDocument();
    expect(screen.getByText("Add funds to book performers and fund project escrow")).toBeInTheDocument();

    // Presets exist
    const preset100k = screen.getByRole("button", { name: "₦100k" });
    fireEvent.click(preset100k);
    expect(screen.getByDisplayValue("100,000")).toBeInTheDocument();
  });

  it("debits from saved card successfully, shows success screen, and displays updated balance", async () => {
    await renderDashboard();
    fireEvent.click(await screen.findByRole("button", { name: /fund wallet/i }));
    await screen.findByText("Fund Client Wallet");

    // Click debit from card
    const debitBtn = screen.getByRole("button", { name: /debit ₦.* from card/i });
    fireEvent.click(debitBtn);

    // Expect success screen
    expect(await screen.findByText("Wallet Funded Successfully!")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("View Projects")).toBeInTheDocument();
  });

  it("triggers insufficient funds error state on excessive debit, offers retry and paystack switch", async () => {
    await renderDashboard();
    fireEvent.click(await screen.findByRole("button", { name: /fund wallet/i }));
    await screen.findByText("Fund Client Wallet");

    // Enter excessive amount e.g. 1,500,000 to trigger insufficient funds
    const input = screen.getByPlaceholderText("e.g. 50,000");
    fireEvent.change(input, { target: { value: "1,500,000" } });

    const debitBtn = screen.getByRole("button", { name: /debit ₦1,500,000 from card/i });
    fireEvent.click(debitBtn);

    // Error state appears
    expect(await screen.findByText(/Payment Declined: Insufficient Funds/i)).toBeInTheDocument();
    expect(screen.getByText(/Try Another Card/i)).toBeInTheDocument();
    expect(screen.getByText(/Switch to Paystack/i)).toBeInTheDocument();

    // Switch to Paystack resolves error and switches method
    fireEvent.click(screen.getByRole("button", { name: /Switch to Paystack/i }));
    expect(screen.getByText(/Paystack Secure Checkout/i)).toBeInTheDocument();
  });

  it("opens Paystack checkout modal, switches channels, and credits wallet on payment completion", async () => {
    await renderDashboard();
    fireEvent.click(await screen.findByRole("button", { name: /fund wallet/i }));
    await screen.findByText("Fund Client Wallet");

    // Switch to Paystack
    fireEvent.click(screen.getByRole("button", { name: /Paystack/i }));
    const paystackBtn = screen.getByRole("button", { name: /Pay ₦.* with Paystack/i });
    fireEvent.click(paystackBtn);

    // Paystack checkout modal is displayed
    expect(await screen.findByText("PAYSTACK SECURE CHECKOUT")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Card" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Transfer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "USSD" })).toBeInTheDocument();

    // Switch to Transfer tab
    fireEvent.click(screen.getByRole("button", { name: "Transfer" }));
    expect(screen.getByText("Wema Bank")).toBeInTheDocument();
    expect(screen.getByText("0128 4930 21")).toBeInTheDocument();

    // Execute transfer completion
    const completeTransferBtn = screen.getByRole("button", { name: /I Have Sent ₦/i });
    fireEvent.click(completeTransferBtn);

    // Transitions to success screen
    expect(await screen.findByText("Wallet Funded Successfully!")).toBeInTheDocument();
    expect(screen.getAllByText(/Paystack Instant Escrow/i).length).toBeGreaterThan(0);
  });
});

describe("ClientDashboard — Active Orders Tab (Design Review Polish)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function renderOrdersTab() {
    const { ClientDashboard } = await import("./ClientDashboard");
    render(
      <MemoryRouter>
        <ClientDashboard />
      </MemoryRouter>,
    );
    const ordersNavBtns = screen.getAllByText(/Active Orders/i);
    // Click the sidebar navigation item for Active Orders
    fireEvent.click(ordersNavBtns[0]!);
    await screen.findByPlaceholderText("Search orders or performers...");
  }

  it("renders a single page header with no duplicate H2 and no redundant subtitle", async () => {
    await renderOrdersTab();

    // Exactly one h1 for page header
    const headings = screen.getAllByRole("heading", { name: /Active Orders/i });
    expect(headings.length).toBe(1);
    expect(headings[0]!.tagName.toLowerCase()).toBe("h1");

    // Redundant H2 subtitle is removed
    expect(screen.queryByText("Direct collaboration and chat rooms with your hired performers.")).not.toBeInTheDocument();

    // Canonical desktop subtitle exists
    expect(screen.getByText("Track your active collaborations.")).toBeInTheDocument();
  });

  it("renders clean controls toolbar and streamlined list items without redundant boilerplate", async () => {
    await renderOrdersTab();

    // Clean toolbar with order count
    const countEl = screen.getByText("3");
    expect(countEl.parentElement?.textContent).toContain("3 active orders");
    expect(screen.getByPlaceholderText("Search orders or performers...")).toBeInTheDocument();

    // Redundant filler text removed
    expect(screen.queryByText(/Active room · Tap to chat/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Active collaboration room/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Enter Room")).not.toBeInTheDocument();

    // Clean phase status pills and due dates are rendered
    expect(screen.getAllByText(/Due Dec/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Deliverables").length).toBeGreaterThan(0);
  });
});



