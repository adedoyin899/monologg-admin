import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/client.js", () => ({
  prisma: {
    calendarConnection: { upsert: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
    availabilityBlock: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    booking: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
  },
}));

import { prisma } from "../db/client.js";
import { mockCacheProvider } from "../providers/cache.mock.js";
import { MOCK_REVOKED_REFRESH_TOKEN } from "../providers/calendar.mock.js";
import { encrypt } from "../lib/encryption.js";
import {
  startGoogleConnect,
  completeGoogleConnect,
  disconnectGoogleCalendar,
  getCalendarConnectionStatus,
  pushAvailabilityToGoogle,
  getGoogleBusyTimes,
  createMeetForBooking,
  CalendarNotConnectedError,
  CalendarReconnectRequiredError,
  InvalidOAuthStateError,
} from "./calendar.js";

const prismaMock = prisma as any;

// This file exercises the REAL mock CalendarProvider (auto-selected under
// NODE_ENV=test — see providers/index.ts) and the REAL encryption module, not
// further-mocked versions of either — that's what lets these tests actually
// prove "stores an encrypted token" and "push/createMeet via mock" rather than
// just asserting against a re-mocked stand-in.
describe("Calendar sync service (features.md Phase 8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheProvider.clear();
  });

  describe("startGoogleConnect / completeGoogleConnect", () => {
    it("mints a state token, maps it to the userId, and returns Google's authUrl", async () => {
      const { authUrl } = await startGoogleConnect("user-1");
      expect(authUrl).toContain("mock.accounts.google.com");

      const state = new URL(authUrl).searchParams.get("state")!;
      expect(await mockCacheProvider.get(`calendar:oauth:${state}`)).toBe("user-1");
    });

    it("stores the refresh token ENCRYPTED — never plaintext, never logged", async () => {
      await mockCacheProvider.set("calendar:oauth:state-abc", "user-1", 600);
      prismaMock.calendarConnection.upsert.mockResolvedValue({});

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await completeGoogleConnect("state-abc", "auth-code-1");

      // The mock provider's completeConnect returns "mock_refresh_auth-code-1" —
      // that exact plaintext string must never appear in the persisted row or
      // in anything written to the console during the whole flow.
      const plaintextToken = "mock_refresh_auth-code-1";
      const upsertCall = prismaMock.calendarConnection.upsert.mock.calls[0][0];
      expect(upsertCall.create.encryptedRefreshToken).not.toContain(plaintextToken);
      expect(upsertCall.create.encryptedRefreshToken).not.toBe(plaintextToken);
      expect(upsertCall.update.encryptedRefreshToken).not.toContain(plaintextToken);

      const allLoggedText = [...logSpy.mock.calls, ...errorSpy.mock.calls].flat().map(String).join("\n");
      expect(allLoggedText).not.toContain(plaintextToken);

      logSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it("upserts by userId and clears the one-time state token", async () => {
      await mockCacheProvider.set("calendar:oauth:state-xyz", "user-2", 600);
      prismaMock.calendarConnection.upsert.mockResolvedValue({});

      const result = await completeGoogleConnect("state-xyz", "code-2");

      expect(result).toEqual({ userId: "user-2" });
      expect(prismaMock.calendarConnection.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-2" } }),
      );
      expect(await mockCacheProvider.get("calendar:oauth:state-xyz")).toBeNull();
    });

    it("rejects an invalid/expired/already-used state token", async () => {
      await expect(completeGoogleConnect("never-issued-state", "code")).rejects.toThrow(InvalidOAuthStateError);
      expect(prismaMock.calendarConnection.upsert).not.toHaveBeenCalled();
    });
  });

  describe("disconnectGoogleCalendar / getCalendarConnectionStatus", () => {
    it("disconnect flips status to REVOKED", async () => {
      prismaMock.calendarConnection.updateMany.mockResolvedValue({ count: 1 });
      await disconnectGoogleCalendar("user-1");
      expect(prismaMock.calendarConnection.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: { status: "REVOKED", revokedAt: expect.any(Date) },
      });
    });

    it("status reports not connected when no row exists", async () => {
      prismaMock.calendarConnection.findUnique.mockResolvedValue(null);
      expect(await getCalendarConnectionStatus("user-1")).toEqual({ connected: false });
    });

    it("status reports connected: false once revoked, even though a row still exists", async () => {
      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        status: "REVOKED",
        connectedAt: new Date("2026-01-01"),
        revokedAt: new Date("2026-02-01"),
      });
      const status = await getCalendarConnectionStatus("user-1");
      expect(status.connected).toBe(false);
    });
  });

  describe("pushAvailabilityToGoogle / getGoogleBusyTimes — push/read via mock", () => {
    it("pushes the block through the mock provider and writes back calendarEventId", async () => {
      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        status: "CONNECTED",
        encryptedRefreshToken: encrypt("real-looking-refresh-token"),
      });
      prismaMock.availabilityBlock.findUniqueOrThrow.mockResolvedValue({
        id: "block-1",
        date: new Date("2026-08-01"),
        slots: [{ start: "09:00", end: "13:00", booked: false }],
        calendarEventId: null,
      });
      prismaMock.availabilityBlock.update.mockResolvedValue({});

      const result = await pushAvailabilityToGoogle("user-1", "block-1");

      expect(result).toEqual({ calendarEventId: "mock_cal_event_block-1" });
      expect(prismaMock.availabilityBlock.update).toHaveBeenCalledWith({
        where: { id: "block-1" },
        data: { calendarEventId: "mock_cal_event_block-1" },
      });
    });

    it("reads real busy times back from the mock provider", async () => {
      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        status: "CONNECTED",
        encryptedRefreshToken: encrypt("real-looking-refresh-token"),
      });

      const busyTimes = await getGoogleBusyTimes("user-1", new Date("2026-08-01"));
      expect(busyTimes).toEqual([{ start: "2026-08-01T09:00:00.000Z", end: "2026-08-01T09:30:00.000Z" }]);
    });

    it("throws CalendarNotConnectedError when there's no connection at all", async () => {
      prismaMock.calendarConnection.findUnique.mockResolvedValue(null);
      await expect(getGoogleBusyTimes("user-1", new Date("2026-08-01"))).rejects.toThrow(CalendarNotConnectedError);
    });
  });

  describe("revoked access degrades gracefully (reconnect prompt)", () => {
    function connectedButRevokedOnGoogleSide() {
      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        status: "CONNECTED",
        encryptedRefreshToken: encrypt(MOCK_REVOKED_REFRESH_TOKEN),
      });
    }

    it("pushAvailabilityToGoogle: flips the connection to REVOKED and throws a reconnect-required error, not a raw crash", async () => {
      connectedButRevokedOnGoogleSide();
      prismaMock.availabilityBlock.findUniqueOrThrow.mockResolvedValue({
        id: "block-1",
        date: new Date("2026-08-01"),
        slots: [],
        calendarEventId: null,
      });
      prismaMock.calendarConnection.updateMany.mockResolvedValue({ count: 1 });

      await expect(pushAvailabilityToGoogle("user-1", "block-1")).rejects.toThrow(CalendarReconnectRequiredError);
      expect(prismaMock.calendarConnection.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: { status: "REVOKED", revokedAt: expect.any(Date) },
      });
    });

    it("getGoogleBusyTimes: same graceful reconnect-required degradation", async () => {
      connectedButRevokedOnGoogleSide();
      prismaMock.calendarConnection.updateMany.mockResolvedValue({ count: 1 });

      await expect(getGoogleBusyTimes("user-1", new Date("2026-08-01"))).rejects.toThrow(
        CalendarReconnectRequiredError,
      );
    });

    it("createMeetForBooking: revoked access degrades to null (best-effort), never throws into the caller", async () => {
      connectedButRevokedOnGoogleSide();
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({
        id: "booking-1",
        creator: { userId: "user-1" },
      });
      prismaMock.calendarConnection.updateMany.mockResolvedValue({ count: 1 });

      const result = await createMeetForBooking("booking-1");

      expect(result).toBeNull();
      expect(prismaMock.calendarConnection.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: { status: "REVOKED", revokedAt: expect.any(Date) },
      });
      expect(prismaMock.booking.update).not.toHaveBeenCalled();
    });
  });

  describe("createMeetForBooking — never-connected degrades gracefully too", () => {
    it("returns null (no meetUrl) instead of failing the booking flow when the creator hasn't connected a calendar", async () => {
      prismaMock.calendarConnection.findUnique.mockResolvedValue(null);
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({
        id: "booking-1",
        creator: { userId: "user-1" },
      });

      const result = await createMeetForBooking("booking-1");

      expect(result).toBeNull();
      expect(prismaMock.booking.update).not.toHaveBeenCalled();
    });

    it("writes a real meetUrl onto the booking when connected", async () => {
      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        status: "CONNECTED",
        encryptedRefreshToken: encrypt("real-looking-refresh-token"),
      });
      prismaMock.booking.findUniqueOrThrow.mockResolvedValue({
        id: "booking-1",
        creator: { userId: "user-1" },
      });
      prismaMock.booking.update.mockResolvedValue({});

      const result = await createMeetForBooking("booking-1");

      expect(result).toEqual({ meetUrl: "https://meet.google.com/mock-booking-" });
      expect(prismaMock.booking.update).toHaveBeenCalledWith({
        where: { id: "booking-1" },
        data: { meetUrl: "https://meet.google.com/mock-booking-" },
      });
    });
  });
});
