import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

// features.md Phase 16 (FA-5): PWA-18, the logged-out external booking flow.
// The visitor never sees a "sign up" step — this exercises the full step
// sequence (slot → summary/escrow explainer → context note → name/email →
// payment → confirmed) and confirms it calls the unauthenticated guest-
// checkout endpoints, never the session-gated ones.

const PROFILE = {
  id: "creator-1",
  name: "Adaeze Obi",
  niche: "VO_ARTIST",
  nicheLabel: "Voice-Over Artist",
  location: "Lagos",
  bio: "Warm, multilingual voice artist.",
  styleTags: [],
  verified: true,
  celebrityBadge: false,
  media: [],
  rateCards: [
    { id: "rc-1", title: "Voice-Over Session", price: "₦1,000", basePriceAmount: 100_000, basePriceCurrency: "NGN", delivery: "Same Day" },
  ],
};
const RATE_CARDS = PROFILE.rateCards;

async function renderFlow(initialEntry = "/book/creator-1?rateCard=rc-1") {
  const { ExternalBookingEntry } = await import("./ExternalBookingEntry");
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/book/:creatorId" element={<ExternalBookingEntry />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ExternalBookingEntry (PWA-18)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("walks a logged-out visitor through every step and calls only the unauthenticated guest-checkout endpoints", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    const calledUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        calledUrls.push(url);
        // No Authorization header should ever be sent — there's no session yet.
        const headers = new Headers(init?.headers);
        expect(headers.has("Authorization")).toBe(false);

        if (url.endsWith("/public")) {
          return new Response(JSON.stringify(PROFILE), { status: 200, headers: { "content-type": "application/json" } });
        }
        if (url.endsWith("/rate-cards")) {
          return new Response(JSON.stringify(RATE_CARDS), { status: 200, headers: { "content-type": "application/json" } });
        }
        if (url.includes("/open-slots")) {
          return new Response(JSON.stringify({ date: "2026-08-10", openSlots: [{ start: "00:00", end: "23:59" }] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (url.endsWith("/public/bookings")) {
          return new Response(
            JSON.stringify({
              id: "booking-guest-1",
              creatorId: "creator-1",
              clientId: "client-guest-1",
              rateCardId: "rc-1",
              baseAmount: 100_000,
              currency: "NGN",
              talentFeeAmount: 11_000,
              clientFeeAmount: 15_000,
              slotDate: "2026-08-10",
              slotStart: "08:00",
              slotEnd: "09:00",
              state: "PENDING_PAYMENT",
              origin: "PUBLIC_LINK",
            }),
            { status: 201, headers: { "content-type": "application/json" } },
          );
        }
        if (url.endsWith("/booking-guest-1/pay")) {
          return new Response(JSON.stringify({ checkoutUrl: "https://pay.example/x", providerRef: "ref-guest-1", status: "INITIATED" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (url.endsWith("/webhooks/paystack")) {
          return new Response(JSON.stringify({ received: true, processed: true }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    await renderFlow();

    // Step 1: Event Date & Performer Slot picker.
    await screen.findByText("Book Adaeze Obi");
    fireEvent.click(await screen.findByRole("button", { name: "08:00" }));
    fireEvent.click(screen.getByRole("button", { name: /Continue to Project Brief/i }));

    // Step 2: Project Brief.
    await screen.findByRole("heading", { name: "Project Brief" });
    fireEvent.click(screen.getByRole("button", { name: /Continue to Contact & Agreement/i }));

    // Step 3: Contact & Agreement (Client Name, Email, Phone & Service Agreement).
    await screen.findByRole("heading", { name: "Contact & Agreement" });
    fireEvent.change(screen.getByPlaceholderText("Your full name"), { target: { value: "Jamie Guest" } });
    fireEvent.change(screen.getByPlaceholderText("you@company.com"), { target: { value: "jamie@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("+234 800 000 0000"), { target: { value: "08012345678" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Proceed to Payment/i }));

    // Step 4: Payment.
    await screen.findByRole("heading", { name: "Payment" });
    fireEvent.click(screen.getByRole("button", { name: /Confirm & Deposit/i }));

    // Step 5: Confirmed, with Google Meet prompt & account surfacing copy.
    await screen.findByText("Booking Confirmed!", {}, { timeout: 3000 });
    expect(screen.getByText(/We've created your Monologg account/i)).toBeInTheDocument();
    expect(screen.getByText("jamie@example.com")).toBeInTheDocument();
    expect(screen.getByText(/Schedule Google Meet with Adaeze Obi/i)).toBeInTheDocument();

    expect(calledUrls.some((u) => u.endsWith("/public/bookings"))).toBe(true);
    expect(calledUrls.some((u) => u.endsWith("/booking-guest-1/pay"))).toBe(true);
    expect(calledUrls.every((u) => !u.includes("/api/v1/bookings"))).toBe(true); // never the authenticated route
  });

  it("client booking flow: renders clean header without escrow pill, only Agreement in step 3 without contact inputs, and transitions towards Order Room", async () => {
    vi.stubEnv("VITE_API_MODE", "live");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/public")) {
          return new Response(JSON.stringify(PROFILE), { status: 200, headers: { "content-type": "application/json" } });
        }
        if (url.endsWith("/rate-cards")) {
          return new Response(JSON.stringify(RATE_CARDS), { status: 200, headers: { "content-type": "application/json" } });
        }
        if (url.includes("/open-slots")) {
          return new Response(JSON.stringify({ date: "2026-08-10", openSlots: [{ start: "00:00", end: "23:59" }] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (url.endsWith("/public/bookings")) {
          return new Response(
            JSON.stringify({
              id: "booking-client-1",
              creatorId: "creator-1",
              clientId: "usr-002",
              rateCardId: "rc-1",
              baseAmount: 100_000,
              currency: "NGN",
              talentFeeAmount: 11_000,
              clientFeeAmount: 15_000,
              slotDate: "2026-08-10",
              slotStart: "08:00",
              slotEnd: "09:00",
              state: "PENDING_PAYMENT",
              origin: "PUBLIC_LINK",
            }),
            { status: 201, headers: { "content-type": "application/json" } },
          );
        }
        if (url.endsWith("/booking-client-1/pay")) {
          return new Response(JSON.stringify({ checkoutUrl: "https://pay.example/x", providerRef: "ref-client-1", status: "INITIATED" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (url.endsWith("/webhooks/paystack")) {
          return new Response(JSON.stringify({ received: true, processed: true }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    await renderFlow("/book/creator-1?rateCard=rc-1&role=client");

    // Step 1: Clean header without escrow chip
    await screen.findByText("Book Adaeze Obi");
    expect(screen.queryByText(/Escrow protected booking/i)).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "08:00" }));
    fireEvent.click(screen.getByRole("button", { name: /Continue to Project Brief/i }));

    // Step 2: Project Brief -> Button says Continue to Agreement
    await screen.findByRole("heading", { name: "Project Brief" });
    const continueBtn = screen.getByRole("button", { name: /Continue to Agreement/i });
    expect(continueBtn).toBeInTheDocument();
    fireEvent.click(continueBtn);

    // Step 3: Only Agreement (No contact input fields)
    await screen.findByRole("heading", { name: "Agreement" });
    expect(screen.queryByPlaceholderText("Your full name")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("you@company.com")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Proceed to Payment/i }));

    // Step 4: Escrow Payment
    await screen.findByRole("heading", { name: "Payment" });
    fireEvent.click(screen.getByRole("button", { name: /Confirm & Deposit/i }));

    // Step 5: Confirmed -> No guest account message, Enter Order Room is available
    await screen.findByText("Booking Confirmed!", {}, { timeout: 3000 });
    expect(screen.queryByText(/We've created your Monologg account/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Enter Order Room/i })).toBeInTheDocument();
  });
});
