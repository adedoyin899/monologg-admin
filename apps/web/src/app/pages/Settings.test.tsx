import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

// features.md Phase 12: Settings.tsx's "Edit Profile" section previously never
// called the API in either mode — "Save Changes" was a 2-second toast over
// local-only state, and the avatar circle was a hardcoded "ET". These tests
// cover the fix: mock mode still makes no network calls (same invariant every
// other mock-mode screen test asserts); live mode fetches the real profile on
// mount and PATCHes it on save.

async function renderSettingsOnProfileSection() {
  const { Settings } = await import("./Settings");
  render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByText("Profile"));
  await screen.findByText("Edit Profile");
}

describe("Settings — profile section", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("mock mode: shows the Elias Thorne fixture and derives avatar initials from it, no network calls", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await renderSettingsOnProfileSection();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Emeka Johnson")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("Lagos, Nigeria")).toBeInTheDocument();
    // Initials derived from the name, not a hardcoded string.
    expect(screen.getByText("EJ")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("live mode: fetches the real profile on mount and renders it, not the mock fixture", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("/api/v1/creators/me");
      return new Response(
        JSON.stringify({ id: "creator-1", name: "Ada Lovelace", bio: "Real bio", location: "Abuja", styleTags: [], verification: "UNVERIFIED" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderSettingsOnProfileSection();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Ada Lovelace")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("Abuja")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Real bio")).toBeInTheDocument();
    // Initials update too — no longer the mock-mode "ET".
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("live mode: Save Changes PATCHes the edited fields to /api/v1/creators/me", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        expect(String(input)).toBe("/api/v1/creators/me");
        const body = JSON.parse(init.body as string);
        expect(body).toMatchObject({ name: "Renamed Talent", location: "Lagos, Nigeria" });
        return new Response(
          JSON.stringify({ id: "creator-1", name: "Renamed Talent", bio: body.bio, location: "Lagos, Nigeria", styleTags: [], verification: "UNVERIFIED" }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ id: "creator-1", name: "Emeka Johnson", bio: "bio", location: "Lagos, Nigeria", styleTags: [], verification: "UNVERIFIED" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderSettingsOnProfileSection();
    await screen.findByDisplayValue("Emeka Johnson");

    fireEvent.change(screen.getByDisplayValue("Emeka Johnson"), { target: { value: "Renamed Talent" } });
    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/creators/me", expect.objectContaining({ method: "PATCH" }));
    });
    // The avatar/initials reflect the saved name, read back from the PATCH response.
    await waitFor(() => {
      expect(screen.getByText("RT")).toBeInTheDocument();
    });
  });
});

// features.md Phase 12A.3 — the settings editor half of the six privacy
// non-negotiables (services/attributes.ts owns the rest).
describe("Settings — physical attributes section", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function renderOnAttributesSection() {
    const { Settings } = await import("./Settings");
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("Physical Attributes"));
    await screen.findByText("Save Attributes");
  }

  it("Save Attributes is disabled until the consent checkbox is checked (Non-Negotiable #4)", async () => {
    vi.stubEnv("VITE_API_MODE", undefined as unknown as string);
    vi.stubGlobal("fetch", vi.fn());

    await renderOnAttributesSection();

    expect(screen.getByText("Save Attributes").closest("button")).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByText("Save Attributes").closest("button")).not.toBeDisabled();
  });

  it("live mode: saving PUTs the consent version and any set field to the real endpoint", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") {
        expect(String(input)).toBe("/api/v1/creators/me/attributes");
        const body = JSON.parse(init.body as string);
        expect(body.heightRange).toBe("CM_170_180");
        expect(body.consentVersion).toBeTruthy();
        return new Response(JSON.stringify({ id: "attrs-1", ...body, consentedAt: "2026-01-01T00:00:00.000Z" }), {
          status: 200, headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify(null), { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderOnAttributesSection();

    fireEvent.change(screen.getByLabelText("Height"), { target: { value: "CM_170_180" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Save Attributes"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/creators/me/attributes", expect.objectContaining({ method: "PUT" }));
    });
  });

  it("live mode: Delete calls the real DELETE endpoint (Non-Negotiable #5 — revocable at any time)", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "DELETE") {
        expect(url).toBe("/api/v1/creators/me/attributes");
        return new Response(null, { status: 204 });
      }
      if (url === "/api/v1/creators/me/attributes") {
        return new Response(JSON.stringify({ id: "attrs-1", heightRange: "CM_170_180", visibility: { heightRange: "SEARCHABLE" }, consentVersion: "v1", consentedAt: "2026-01-01T00:00:00.000Z" }), {
          status: 200, headers: { "content-type": "application/json" },
        });
      }
      // Settings.tsx also fetches the creator profile on mount, independent
      // of which section is being viewed.
      return new Response(JSON.stringify({ id: "creator-1", name: "Emeka Johnson", bio: "bio", location: "Lagos, Nigeria", styleTags: [], verification: "UNVERIFIED" }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderOnAttributesSection();
    await screen.findByText("Delete all attribute data");

    fireEvent.click(screen.getByText("Delete all attribute data"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/creators/me/attributes", expect.objectContaining({ method: "DELETE" }));
    });
  });

  it("client mode: renders Client Settings with .role-client and client-specific sections", async () => {
    const { Settings } = await import("./Settings");
    render(
      <MemoryRouter initialEntries={["/settings?role=client"]}>
        <Settings />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Client Settings")).toBeInTheDocument();
    });
    expect(screen.getByText("Verified Client")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    // Physical attributes (talent-only) is omitted for client
    expect(screen.queryByText("Physical Attributes")).not.toBeInTheDocument();

    // Verify navigating to Profile displays Brand Name and Brand Type
    fireEvent.click(screen.getByText("Profile"));
    await screen.findByText("Brand Name");
    expect(screen.getByText("Brand Type")).toBeInTheDocument();

    // Go back and open Security & Privacy - verify Change Passcode is omitted for clients
    const backBtn = screen.getByRole("button", { name: /Back to settings/i });
    fireEvent.click(backBtn);
    const securityMenu = await screen.findByText("Security & Privacy");
    fireEvent.click(securityMenu);
    await screen.findByText("Change Password");
    expect(screen.queryByText("Change Passcode")).not.toBeInTheDocument();
  });
});

describe("Settings — payment details section", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("talent mode: menu item is Payment details, displays single payout bank rule, 48hr memo, and no saved cards", async () => {
    const { Settings } = await import("./Settings");
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    // Menu label is "Payment details"
    const paymentMenu = screen.getByText("Payment details");
    expect(paymentMenu).toBeInTheDocument();
    fireEvent.click(paymentMenu);

    // Section header and content render
    await screen.findByText("Payout Bank Account");
    expect(screen.getByText("Direct earnings withdrawal destination for your completed orders.")).toBeInTheDocument();

    // No "Verified" badge tag in the payout card
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();

    // Single payout bank policy is stated
    expect(screen.getByText(/You can only have one payout bank. This is how Monologg operates/i)).toBeInTheDocument();

    // 48-hour memo is stated
    expect(screen.getByText(/You can change your bank account after 48hrs/i)).toBeInTheDocument();

    // Saved cards / backup cards / + Add Payment Method are NOT rendered for performers
    expect(screen.queryByText("Saved Cards (Optional Backup)")).not.toBeInTheDocument();
    expect(screen.queryByText("+ Add Card")).not.toBeInTheDocument();
    expect(screen.queryByText("Add Payment Method")).not.toBeInTheDocument();

    // Clicking "Change Bank Account" switches to edit form
    const changeBtn = screen.getByText("Change Bank Account");
    expect(changeBtn).toBeInTheDocument();
    fireEvent.click(changeBtn);

    // Form inputs and policy/memo visible before saving
    expect(screen.getByText(/You can only have one payout bank. This is how Monologg operates/i)).toBeInTheDocument();
    expect(screen.getByText(/You can change your bank account after 48hrs/i)).toBeInTheDocument();
    expect(screen.getByText("Save Payout Bank Account")).toBeInTheDocument();
  });
});

describe("Settings — security section", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
    localStorage.clear();
  });

  it("renders Change Password and Change Passcode cards, omits 2FA and Active Sessions", async () => {
    const { Settings } = await import("./Settings");
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    const securityMenu = screen.getByText("Security & Privacy");
    expect(securityMenu).toBeInTheDocument();
    fireEvent.click(securityMenu);

    // Password card CTA is disabled until user types in all fields
    await screen.findByText("Change Password");
    const currentPwd = screen.getByPlaceholderText("Current Password");
    const newPwd = screen.getByPlaceholderText("New Password");
    const confirmPwd = screen.getByPlaceholderText("Confirm New Password");
    const updatePwdBtn = screen.getByText("Update Password");

    expect(updatePwdBtn).toBeDisabled();
    fireEvent.change(currentPwd, { target: { value: "oldpassword123" } });
    expect(updatePwdBtn).toBeDisabled();
    fireEvent.change(newPwd, { target: { value: "newpassword123" } });
    expect(updatePwdBtn).toBeDisabled();
    fireEvent.change(confirmPwd, { target: { value: "newpassword123" } });
    expect(updatePwdBtn).not.toBeDisabled();

    // 2FA and Active Sessions are removed
    expect(screen.queryByText("Two-Factor Authentication")).not.toBeInTheDocument();
    expect(screen.queryByText("Active Sessions")).not.toBeInTheDocument();
    expect(screen.queryByText("2 devices logged in")).not.toBeInTheDocument();

    // Change Passcode card - subtext removed as requested
    expect(screen.getByText("Change Passcode")).toBeInTheDocument();
    expect(screen.queryByText("4-digit PIN required to authorise earnings withdrawals")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Current Passcode")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("New Passcode")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm New Passcode")).toBeInTheDocument();
    expect(screen.getByText("Update Passcode")).toBeInTheDocument();

    // Delete Account remains
    expect(screen.getByText("Delete Account")).toBeInTheDocument();
  });

  it("handles passcode validation and updates localStorage passcode", async () => {
    localStorage.setItem("monologg_withdrawal_passcode", "1234");
    const { Settings } = await import("./Settings");
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("Security & Privacy"));
    await screen.findByText("Change Passcode");

    const currentInput = screen.getByPlaceholderText("Current Passcode");
    const newInput = screen.getByPlaceholderText("New Passcode");
    const confirmInput = screen.getByPlaceholderText("Confirm New Passcode");
    const updateBtn = screen.getByText("Update Passcode");

    // Initially disabled until all 3 inputs are 4 digits
    expect(updateBtn).toBeDisabled();

    // Wrong current passcode
    fireEvent.change(currentInput, { target: { value: "9999" } });
    fireEvent.change(newInput, { target: { value: "5678" } });
    fireEvent.change(confirmInput, { target: { value: "5678" } });
    expect(updateBtn).not.toBeDisabled();
    fireEvent.click(updateBtn);
    expect(screen.getByText("Current passcode is incorrect.")).toBeInTheDocument();

    // Correct current passcode but mismatched confirmation
    fireEvent.change(currentInput, { target: { value: "1234" } });
    fireEvent.change(confirmInput, { target: { value: "0000" } });
    fireEvent.click(updateBtn);
    expect(screen.getByText("New passcodes do not match.")).toBeInTheDocument();

    // Successful update
    fireEvent.change(confirmInput, { target: { value: "5678" } });
    fireEvent.click(updateBtn);
    expect(localStorage.getItem("monologg_withdrawal_passcode")).toBe("5678");
    expect(screen.getByText("Passcode Updated! ✓")).toBeInTheDocument();
  });

  it("opens Delete Account flow, displays data loss warning and 72-hr payout guarantees, and completes deletion", async () => {
    const { Settings } = await import("./Settings");
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("Security & Privacy"));
    await screen.findByText("Delete Account");

    // Click Delete Account button
    fireEvent.click(screen.getByText("Permanently delete your account and all data"));

    // Modal opens with information loss and 72-hr payout guarantees
    await screen.findByText("Profile & Content Removed");
    expect(screen.getByText(/Your profile, videos, client reviews, and messages will be permanently deleted/i)).toBeInTheDocument();
    expect(screen.getByText("Remaining Balance Sent to Bank")).toBeInTheDocument();
    expect(screen.getByText(/Any remaining balance will be automatically transferred to your bank within 72 hours/i)).toBeInTheDocument();

    const deleteBtn = screen.getByText("Delete My Account");
    expect(deleteBtn).toBeDisabled();

    // Typing DELETE enables button
    const confirmInput = screen.getByPlaceholderText("Type DELETE to confirm");
    fireEvent.change(confirmInput, { target: { value: "DELETE" } });
    expect(deleteBtn).not.toBeDisabled();

    // Confirm deletion
    fireEvent.click(deleteBtn);

    // Confirmation scheduled screen renders
    await screen.findByText("Account Scheduled for Deletion");
    expect(screen.getByText(/Payout window: Under 72 hours to/i)).toBeInTheDocument();
    expect(screen.getByText("Sign Out & Return to Home")).toBeInTheDocument();
  });
});

describe("Settings — personal details section and profile button cleanup", () => {
  it("renders Personal Details option and displays clean read-only info by default", async () => {
    const { Settings } = await import("./Settings");
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    // Open Personal Details
    const craftItem = screen.getByText("Personal Details");
    expect(craftItem).toBeInTheDocument();
    fireEvent.click(craftItem);

    // Verify Read-Only Mode contents
    await screen.findByText("Your basic details, craft category, and voice & performance style tags.");
    expect(screen.getByText("Basic information")).toBeInTheDocument();
    expect(screen.getByText("Female")).toBeInTheDocument();
    expect(screen.getByText("2000-05-15")).toBeInTheDocument();
    expect(screen.getByText(/Ikeja/i)).toBeInTheDocument();
    expect(screen.getByText("Primary craft")).toBeInTheDocument();
    expect(screen.getByText("Actor")).toBeInTheDocument();
    expect(screen.getByText("Thespian AI performance summary")).toBeInTheDocument();
    expect(screen.getByText("Edit Details")).toBeInTheDocument();

    // Toggle to edit mode
    fireEvent.click(screen.getByText("Edit Details"));
    await screen.findByText("Tell us about yourself");
    expect(screen.getByText("What best describes your craft?")).toBeInTheDocument();
    expect(screen.getByText("Your style tags are ready.")).toBeInTheDocument();

    // Switch gender to Male
    fireEvent.click(screen.getByRole("button", { name: "Male" }));

    // Click Save Changes
    const saveBtns = screen.getAllByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveBtns[0]);

    // Returns to read-only view with updated gender
    await screen.findByText("Your basic details, craft category, and voice & performance style tags.");
    expect(screen.getByText("Male")).toBeInTheDocument();
  });

  it("edit profile: top of profile has no redundant buttons bar", async () => {
    const { Settings } = await import("./Settings");
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    // Open Profile
    fireEvent.click(screen.getByText("Profile"));
    await screen.findByText("Share");

    // The redundant top action bar with "Preview Mode" and "Share Profile" was removed
    expect(screen.queryByText("Preview Mode")).not.toBeInTheDocument();
    expect(screen.queryByText("Share Profile")).not.toBeInTheDocument();

    // The card action cluster has clean "Preview Profile" and "Share"
    expect(screen.getByText("Preview Profile")).toBeInTheDocument();
    expect(screen.getByText("Share")).toBeInTheDocument();
  });
});

describe("Settings — client billing and payments", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("renders Billing and Payments title, omits redundant Project Briefs History, and manages cards", async () => {
    const { Settings } = await import("./Settings");
    render(
      <MemoryRouter initialEntries={["/settings?role=client"]}>
        <Settings />
      </MemoryRouter>,
    );

    // 1. Menu item is "Billing and Payments" (not "Billing & Invoicing")
    const billingMenuBtn = screen.getByRole("button", { name: "Billing and Payments" });
    expect(billingMenuBtn).toBeInTheDocument();

    // 2. Redundant "Project Briefs History" is NOT rendered
    expect(screen.queryByText("Project Briefs History")).not.toBeInTheDocument();

    // 3. Open Billing and Payments
    fireEvent.click(billingMenuBtn);
    expect(await screen.findByText("Saved Billing Cards")).toBeInTheDocument();

    // 4. Shows existing cards
    expect(screen.getByText(/4242/)).toBeInTheDocument();

    // 5. "+ Add Card" button is present and opens modal
    const addCardBtn = screen.getByRole("button", { name: /Add Card/i });
    expect(addCardBtn).toBeInTheDocument();
    fireEvent.click(addCardBtn);

    expect(await screen.findByText("Add Billing Card")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("4123 4567 8901 2345")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("MM/YY")).toBeInTheDocument();
  });
});

describe("Settings — Terms of Service and Escrow Policy (FAANG UX)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("renders Support & legal with Help Center, Terms of Service, and Escrow Policy (Privacy Policy removed)", async () => {
    const { Settings } = await import("./Settings");
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <Settings />
      </MemoryRouter>,
    );

    expect(screen.getByText("Support & legal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Help Center" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Terms of Service" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Escrow Policy" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Privacy Policy" })).not.toBeInTheDocument();
  });

  it("navigates into in-app Terms of Service view and renders structured legal clauses", async () => {
    const { Settings } = await import("./Settings");
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <Settings />
      </MemoryRouter>,
    );

    const termsBtn = screen.getByRole("button", { name: "Terms of Service" });
    fireEvent.click(termsBtn);

    expect(await screen.findByRole("heading", { name: "Terms of Service" })).toBeInTheDocument();
    expect(screen.getByText("Effective Date: October 29, 2026")).toBeInTheDocument();
    expect(screen.getByText("Eligibility & Account Responsibilities")).toBeInTheDocument();
    expect(screen.getByText("Marketplace & Booking Engagements")).toBeInTheDocument();
    expect(screen.getByText("Professional Conduct & Non-Circumvention")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /View Full Web Terms/i })).toBeInTheDocument();

    // Back button returns to main settings
    const backBtn = screen.getByRole("button", { name: "Back to settings" });
    fireEvent.click(backBtn);
    expect(await screen.findByRole("button", { name: "Terms of Service" })).toBeInTheDocument();
  });

  it("renders role-specific Client Escrow Policy for clients with 12% fee and cancellation protection", async () => {
    const { Settings } = await import("./Settings");
    render(
      <MemoryRouter initialEntries={["/settings?role=client"]}>
        <Settings />
      </MemoryRouter>,
    );

    const escrowBtn = screen.getByRole("button", { name: "Escrow Policy" });
    fireEvent.click(escrowBtn);

    expect(await screen.findByRole("heading", { name: "Client Escrow Policy" })).toBeInTheDocument();
    expect(screen.getByText("Client Escrow Protection · Paystack Secured")).toBeInTheDocument();
    expect(screen.getByText("100% Upfront Funding & Isolation")).toBeInTheDocument();
    expect(screen.getByText("48-Hour Inspection & Review Window")).toBeInTheDocument();
    expect(screen.getByText("Cancellation & Refund Protection")).toBeInTheDocument();
    expect(screen.getByText("12% Transparent")).toBeInTheDocument();
    expect(screen.getByText("Monologg Trust & Safety Assurance")).toBeInTheDocument();
  });

  it("renders role-specific Performer Escrow Policy for performers with 93% take-home and pre-funded guarantee", async () => {
    const { Settings } = await import("./Settings");
    render(
      <MemoryRouter initialEntries={["/settings?role=talent"]}>
        <Settings />
      </MemoryRouter>,
    );

    const escrowBtn = screen.getByRole("button", { name: "Escrow Policy" });
    fireEvent.click(escrowBtn);

    expect(await screen.findByRole("heading", { name: "Performer Escrow Policy" })).toBeInTheDocument();
    expect(screen.getByText("Performer Escrow Guarantee · 100% Pre-Funded")).toBeInTheDocument();
    expect(screen.getByText("Pre-Funded Gig Guarantee")).toBeInTheDocument();
    expect(screen.getByText("Verified Delivery & Attendance PIN")).toBeInTheDocument();
    expect(screen.getByText("48-Hour Auto-Release Safeguard")).toBeInTheDocument();
    expect(screen.getByText("93% Net")).toBeInTheDocument();
    expect(screen.getByText("Late Cancellation Kill-Fee Protection")).toBeInTheDocument();
  });
});

