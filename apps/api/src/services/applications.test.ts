import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/client.js", () => ({
  prisma: {
    brief: { findUnique: vi.fn(), update: vi.fn() },
    application: { create: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    creator: { findUnique: vi.fn() },
    $executeRaw: vi.fn().mockResolvedValue(undefined),
    $transaction: vi.fn((arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(prismaMock))),
  },
}));

vi.mock("../providers/index.js", () => ({
  notifyProvider: { inApp: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("./booking.js", () => ({
  createBooking: vi.fn(),
}));

import { prisma } from "../db/client.js";
import { notifyProvider } from "../providers/index.js";
import { createBooking } from "./booking.js";
import {
  applyToBrief,
  shortlistApplication,
  rejectApplication,
  withdrawApplication,
  selectApplication,
  assertLegalApplicationTransition,
  BriefNotFoundError,
  BriefNotOpenError,
  ApplicationsClosedError,
  DuplicateApplicationError,
  IllegalApplicationTransitionError,
  NotApplicationOwnerError,
  NotApplicantError,
} from "./applications.js";

const prismaMock = prisma as any;
const notifyProviderMock = notifyProvider as any;
const createBookingMock = createBooking as any;

describe("Application state machine (features.md Phase 14, FA-2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("assertLegalApplicationTransition", () => {
    it("allows APPLIED to jump straight to SELECTED (no shortlist required)", () => {
      expect(() => assertLegalApplicationTransition("APPLIED", "SELECTED")).not.toThrow();
    });
    it("allows the documented transitions", () => {
      expect(() => assertLegalApplicationTransition("APPLIED", "SHORTLISTED")).not.toThrow();
      expect(() => assertLegalApplicationTransition("SHORTLISTED", "SELECTED")).not.toThrow();
      expect(() => assertLegalApplicationTransition("SHORTLISTED", "REJECTED")).not.toThrow();
      expect(() => assertLegalApplicationTransition("APPLIED", "WITHDRAWN")).not.toThrow();
    });
    it("rejects any transition out of a terminal state", () => {
      expect(() => assertLegalApplicationTransition("SELECTED", "REJECTED")).toThrow(IllegalApplicationTransitionError);
      expect(() => assertLegalApplicationTransition("REJECTED", "SHORTLISTED")).toThrow(IllegalApplicationTransitionError);
      expect(() => assertLegalApplicationTransition("WITHDRAWN", "APPLIED")).toThrow(IllegalApplicationTransitionError);
    });
  });

  // ---------------------------------------------------------------------------
  // Cap enforcement — a stateful in-memory fake stands in for the transaction
  // client, the same tradeoff services/availability.test.ts's bookSlot tests
  // already document: this proves the check-then-write LOGIC is correct when
  // properly serialized (sequential calls), which is exactly what
  // pg_advisory_xact_lock guarantees for real concurrent callers in
  // production — the lock itself is a Postgres guarantee, not application
  // logic, and isn't re-provable against a mocked Prisma client. What IS
  // asserted here: the lock is actually taken ($executeRaw), and once the cap
  // is hit, every subsequent call — even ones that would have raced past a
  // naive check-then-write — correctly sees the flip and is rejected.
  // ---------------------------------------------------------------------------
  describe("applyToBrief — cap enforcement (X4)", () => {
    function makeCappedBrief(applicantCap: number | null) {
      const state = {
        id: "brief-1",
        status: "ACTIVE" as const,
        applicationsOpen: true,
        applicantCap,
        projectName: "Nike Q1 Campaign",
        client: { userId: "user-client-1" },
      };
      const applications: Array<{ id: string; briefId: string; creatorId: string; status: string; pitch: string | null }> = [];

      prismaMock.brief.findUnique.mockImplementation(async () => ({ ...state }));
      prismaMock.brief.update.mockImplementation(async ({ data }: any) => {
        Object.assign(state, data);
        return { ...state };
      });
      prismaMock.application.create.mockImplementation(async ({ data }: any) => {
        if (applications.some((a) => a.creatorId === data.creatorId)) {
          const err = new Error("Unique constraint failed") as Error & { code: string };
          err.code = "P2002";
          throw err;
        }
        const row = { id: `app-${applications.length + 1}`, briefId: state.id, status: "APPLIED", pitch: data.pitch ?? null, ...data };
        applications.push(row);
        return row;
      });
      prismaMock.application.count.mockImplementation(async () => applications.length);
      prismaMock.creator.findUnique.mockImplementation(async ({ where: { id } }: any) => ({ id, name: `Creator ${id}` }));

      return { state, applications };
    }

    it("exactly N applications succeed against a cap of N; the (N+1)th is rejected with 'applications closed'", async () => {
      makeCappedBrief(2);

      await expect(applyToBrief("brief-1", "creator-1")).resolves.toMatchObject({ status: "APPLIED" });
      await expect(applyToBrief("brief-1", "creator-2")).resolves.toMatchObject({ status: "APPLIED" });
      await expect(applyToBrief("brief-1", "creator-3")).rejects.toThrow(ApplicationsClosedError);

      // applicationsOpen flips exactly once — the instant the cap is met.
      expect(prismaMock.brief.update).toHaveBeenCalledTimes(1);
      expect(prismaMock.brief.update).toHaveBeenCalledWith({ where: { id: "brief-1" }, data: { applicationsOpen: false } });
    });

    it("takes the advisory lock on every attempt, including the one that ultimately gets rejected", async () => {
      makeCappedBrief(1);
      await applyToBrief("brief-1", "creator-1");
      await applyToBrief("brief-1", "creator-2").catch(() => {});
      expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(2);
    });

    it("an uncapped brief (applicantCap: null) never closes", async () => {
      makeCappedBrief(null);
      await applyToBrief("brief-1", "creator-1");
      await applyToBrief("brief-1", "creator-2");
      await applyToBrief("brief-1", "creator-3");
      expect(prismaMock.brief.update).not.toHaveBeenCalled();
    });

    it("duplicate application (same creator, same brief) is rejected", async () => {
      makeCappedBrief(5);
      await applyToBrief("brief-1", "creator-1");
      await expect(applyToBrief("brief-1", "creator-1")).rejects.toThrow(DuplicateApplicationError);
    });

    it("rejects applying to a brief that isn't ACTIVE", async () => {
      const { state } = makeCappedBrief(5);
      state.status = "DRAFT" as any;
      await expect(applyToBrief("brief-1", "creator-1")).rejects.toThrow(BriefNotOpenError);
    });

    it("rejects applying to a brief that doesn't exist", async () => {
      prismaMock.brief.findUnique.mockResolvedValue(null);
      await expect(applyToBrief("nope", "creator-1")).rejects.toThrow(BriefNotFoundError);
    });

    it("notifies the client on every application, and separately when the cap is reached", async () => {
      makeCappedBrief(1);
      await applyToBrief("brief-1", "creator-1");

      expect(notifyProviderMock.inApp).toHaveBeenCalledWith("user-client-1", expect.objectContaining({ kind: "application_received" }));
      expect(notifyProviderMock.inApp).toHaveBeenCalledWith("user-client-1", expect.objectContaining({ kind: "applications_closed" }));
    });

    it("does NOT send the cap-reached notification while still under cap", async () => {
      makeCappedBrief(5);
      await applyToBrief("brief-1", "creator-1");

      expect(notifyProviderMock.inApp).toHaveBeenCalledWith("user-client-1", expect.objectContaining({ kind: "application_received" }));
      expect(notifyProviderMock.inApp).not.toHaveBeenCalledWith("user-client-1", expect.objectContaining({ kind: "applications_closed" }));
    });
  });

  // ---------------------------------------------------------------------------
  // Owner-scoped status transitions
  // ---------------------------------------------------------------------------
  function mockOwnedApplication(overrides: Partial<{ status: string; clientUserId: string; creatorUserId: string }> = {}) {
    const application = {
      id: "app-1",
      briefId: "brief-1",
      creatorId: "creator-1",
      status: overrides.status ?? "APPLIED",
      pitch: null,
      brief: { id: "brief-1", projectName: "Nike Q1 Campaign", clientId: "client-1", client: { userId: overrides.clientUserId ?? "user-client-1" } },
      creator: { id: "creator-1", userId: overrides.creatorUserId ?? "user-talent-1" },
    };
    prismaMock.application.findUnique.mockResolvedValue(application);
    prismaMock.application.update.mockImplementation(async ({ data }: any) => ({ ...application, ...data }));
    return application;
  }

  describe("shortlistApplication", () => {
    it("transitions APPLIED -> SHORTLISTED and notifies the applicant", async () => {
      mockOwnedApplication({ status: "APPLIED" });
      const result = await shortlistApplication("app-1", "user-client-1");
      expect(result.status).toBe("SHORTLISTED");
      expect(notifyProviderMock.inApp).toHaveBeenCalledWith("user-talent-1", expect.objectContaining({ kind: "application_shortlisted" }));
    });

    it("403s (throws NotApplicationOwnerError) for a non-owner", async () => {
      mockOwnedApplication({ status: "APPLIED", clientUserId: "user-client-OTHER" });
      await expect(shortlistApplication("app-1", "user-client-1")).rejects.toThrow(NotApplicationOwnerError);
    });

    it("rejects shortlisting an already-terminal application", async () => {
      mockOwnedApplication({ status: "REJECTED" });
      await expect(shortlistApplication("app-1", "user-client-1")).rejects.toThrow(IllegalApplicationTransitionError);
    });
  });

  describe("rejectApplication", () => {
    it("transitions to REJECTED and notifies the applicant", async () => {
      mockOwnedApplication({ status: "SHORTLISTED" });
      const result = await rejectApplication("app-1", "user-client-1");
      expect(result.status).toBe("REJECTED");
      expect(notifyProviderMock.inApp).toHaveBeenCalledWith("user-talent-1", expect.objectContaining({ kind: "application_rejected" }));
    });

    it("403s for a non-owner", async () => {
      mockOwnedApplication({ status: "APPLIED", clientUserId: "user-client-OTHER" });
      await expect(rejectApplication("app-1", "user-client-1")).rejects.toThrow(NotApplicationOwnerError);
    });
  });

  describe("withdrawApplication", () => {
    it("lets the applicant withdraw their own application", async () => {
      const application = { id: "app-1", status: "APPLIED", creator: { userId: "user-talent-1" } };
      prismaMock.application.findUnique.mockResolvedValue(application);
      prismaMock.application.update.mockResolvedValue({ ...application, status: "WITHDRAWN" });

      const result = await withdrawApplication("app-1", "user-talent-1");
      expect(result.status).toBe("WITHDRAWN");
    });

    it("rejects a non-applicant trying to withdraw someone else's application", async () => {
      prismaMock.application.findUnique.mockResolvedValue({ id: "app-1", status: "APPLIED", creator: { userId: "user-talent-OTHER" } });
      await expect(withdrawApplication("app-1", "user-talent-1")).rejects.toThrow(NotApplicantError);
    });
  });

  describe("selectApplication", () => {
    it("creates a real booking, transitions to SELECTED, closes the brief, and auto-rejects the rest of the pool", async () => {
      mockOwnedApplication({ status: "SHORTLISTED" });
      createBookingMock.mockResolvedValue({ id: "booking-1", state: "PENDING_PAYMENT" });
      prismaMock.application.findMany.mockResolvedValue([
        { id: "app-2", creator: { userId: "user-talent-2" } },
        { id: "app-3", creator: { userId: "user-talent-3" } },
      ]);

      const result = await selectApplication("app-1", "user-client-1", {
        rateCardId: "rc-1",
        baseAmount: 100_000,
        currency: "NGN",
        slotDate: new Date("2026-09-01"),
        slotStart: "10:00",
        slotEnd: "11:00",
      });

      expect(createBookingMock).toHaveBeenCalledWith(
        expect.objectContaining({ creatorId: "creator-1", clientId: "client-1", rateCardId: "rc-1" }),
      );
      // createBooking always creates in PENDING_PAYMENT (services/booking.ts) —
      // the mock here just returns that state, matching Phase 14's own acceptance line.
      expect(result.booking).toEqual({ id: "booking-1", state: "PENDING_PAYMENT" });
      expect(result.application.status).toBe("SELECTED");

      // The rest of the pool is auto-rejected and notified "not selected".
      expect(prismaMock.application.update).toHaveBeenCalledWith({ where: { id: "app-2" }, data: { status: "REJECTED" } });
      expect(prismaMock.application.update).toHaveBeenCalledWith({ where: { id: "app-3" }, data: { status: "REJECTED" } });
      expect(notifyProviderMock.inApp).toHaveBeenCalledWith("user-talent-2", expect.objectContaining({ kind: "application_not_selected" }));
      expect(notifyProviderMock.inApp).toHaveBeenCalledWith("user-talent-3", expect.objectContaining({ kind: "application_not_selected" }));
      expect(notifyProviderMock.inApp).toHaveBeenCalledWith("user-talent-1", expect.objectContaining({ kind: "application_selected" }));
    });

    it("403s for a non-owner", async () => {
      mockOwnedApplication({ status: "APPLIED", clientUserId: "user-client-OTHER" });
      await expect(
        selectApplication("app-1", "user-client-1", { rateCardId: "rc-1", baseAmount: 1, currency: "NGN", slotDate: new Date(), slotStart: "10:00", slotEnd: "11:00" }),
      ).rejects.toThrow(NotApplicationOwnerError);
      expect(createBookingMock).not.toHaveBeenCalled();
    });

    it("rejects selecting an already-terminal application", async () => {
      mockOwnedApplication({ status: "REJECTED" });
      await expect(
        selectApplication("app-1", "user-client-1", { rateCardId: "rc-1", baseAmount: 1, currency: "NGN", slotDate: new Date(), slotStart: "10:00", slotEnd: "11:00" }),
      ).rejects.toThrow(IllegalApplicationTransitionError);
      expect(createBookingMock).not.toHaveBeenCalled();
    });
  });
});
