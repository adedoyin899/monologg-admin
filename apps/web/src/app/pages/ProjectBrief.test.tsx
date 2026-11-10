import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

// features.md Phase 5: ProjectBrief.tsx's "Publish Project" now calls apiClient.createBrief
// in live mode, but must stay visually/behaviorally identical to the original mock-only
// prototype in the default mock mode (AnimatePresence delays the next view, so each step
// change is awaited via findBy* rather than queried synchronously).

async function renderAndFillProjectBrief() {
  const { ProjectBrief } = await import("./ProjectBrief");
  render(
    <MemoryRouter>
      <ProjectBrief />
    </MemoryRouter>,
  );

  // Step 1
  fireEvent.change(screen.getByPlaceholderText("e.g., Nike Q1 Campaign Voice-Over"), {
    target: { value: "Nike Q1 Campaign" },
  });
  fireEvent.click(screen.getByText("Commercial / Ad Campaign"));
  fireEvent.click(screen.getByText("Continue"));

  // Step 2
  await screen.findByText("Performer Requirements");
  fireEvent.click(screen.getByText("Actors"));
  fireEvent.click(screen.getByText("Continue"));

  // Step 3 — skip
  await screen.findByRole("heading", { name: "Assets" });
  fireEvent.click(screen.getByText("Continue"));

  // Step 4 — Penultimate step: Review & Agreement
  await screen.findByRole("heading", { name: "Review & Agreement" });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByText("Continue to Budget & Payment"));

  // Step 5 — Final step: Budget & Payment
  await screen.findByText("Set your project budget range to attract the right performers.");
}

describe("ProjectBrief", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("mock mode: publishing shows the success screen with no network call", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await renderAndFillProjectBrief();
    fireEvent.click(screen.getByText("Publish Project"));

    await waitFor(() => {
      expect(screen.getByText("Project Published!")).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("live mode: publishing creates a real Brief with the mapped niche enum and budget in kobo", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("/api/v1/briefs");
      const body = JSON.parse(init!.body as string);
      expect(body).toMatchObject({
        projectName: "Nike Q1 Campaign",
        projectType: "Commercial / Ad Campaign",
        nicheReq: ["ACTOR"],
        budgetAmount: 15_000_000,
        budgetCurrency: "NGN",
        // features.md Phase 14 regression: "Publish Project" must actually
        // publish (status ACTIVE) — the schema otherwise defaults new briefs
        // to DRAFT, which never appears in talent's GET /projects browse list.
        status: "ACTIVE",
      });
      return new Response(JSON.stringify({ id: "brief-new" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderAndFillProjectBrief();
    fireEvent.click(screen.getByText("Publish Project"));

    await waitFor(() => {
      expect(screen.getByText("Project Published!")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("draft edit mode: pre-fills project slots and resumes at the saved draft step", async () => {
    const { ProjectBrief } = await import("./ProjectBrief");
    render(
      <MemoryRouter initialEntries={["/brief?id=P-001"]}>
        <ProjectBrief />
      </MemoryRouter>,
    );

    // Initial draft step for P-001 is step 4 (Review & Agreement)
    expect(await screen.findByRole("heading", { name: "Review & Agreement" })).toBeInTheDocument();
    expect(screen.getByText(/Step 4 of 5/i)).toBeInTheDocument();

    // Verify prefilled slot data is presented in review card
    expect(screen.getByText("Nike Q1 Campaign")).toBeInTheDocument();
    expect(screen.getByText("Commercial / Ad Campaign")).toBeInTheDocument();
  });

  it("saving draft persists the current step and navigates back to /client", async () => {
    mockNavigate.mockClear();
    const { ProjectBrief } = await import("./ProjectBrief");
    render(
      <MemoryRouter initialEntries={["/brief?id=P-001"]}>
        <ProjectBrief />
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { name: "Review & Agreement" });

    // Click "Save Draft" in the top bar
    const saveDraftBtns = screen.getAllByRole("button", { name: /save draft/i });
    fireEvent.click(saveDraftBtns[0]!);

    expect(mockNavigate).toHaveBeenCalledWith("/client", expect.objectContaining({
      state: expect.objectContaining({ savedDraftId: "P-001", savedStep: 4 }),
    }));
  });
});
