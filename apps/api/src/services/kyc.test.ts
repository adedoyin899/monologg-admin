import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/client.js", () => ({
  prisma: {
    creator: { update: vi.fn() },
    kycCheck: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../providers/index.js", () => ({
  kycProvider: { startCheck: vi.fn(), getStatus: vi.fn() },
  notifyProvider: { email: vi.fn(), sms: vi.fn(), inApp: vi.fn() },
}));

import { prisma } from "../db/client.js";
import { kycProvider, notifyProvider } from "../providers/index.js";
import {
  startKycCheck,
  pollKycStatus,
  KycCheckInProgressError,
  KycAlreadyVerifiedError,
} from "./kyc.js";

const prismaMock = prisma as any;
const kycProviderMock = kycProvider as any;
const notifyProviderMock = notifyProvider as any;

const KYC_DATA = {
  firstName: "Ada",
  lastName: "Lovelace",
  dateOfBirth: "1992-04-15",
  country: "NG",
  idType: "NIN",
  idNumber: "12345678901",
};

function creator(overrides: Partial<{ id: string; userId: string; verification: string }> = {}) {
  return { id: "creator-1", userId: "user-1", verification: "UNVERIFIED", ...overrides } as any;
}

describe("KYC service (features.md Phase 7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifyProviderMock.inApp.mockResolvedValue(undefined);
  });

  describe("startKycCheck", () => {
    it("starts a check, sets PROCESSING, and stores the KycCheck row", async () => {
      kycProviderMock.startCheck.mockResolvedValue({ ref: "mock_kyc_creator-1_1" });
      prismaMock.$transaction.mockResolvedValue([
        { id: "creator-1", verification: "PROCESSING" },
        { id: "check-1", creatorId: "creator-1", provider: "smile_identity", providerRef: "mock_kyc_creator-1_1", status: "PROCESSING" },
      ]);

      const result = await startKycCheck(creator(), KYC_DATA);

      expect(kycProviderMock.startCheck).toHaveBeenCalledWith("creator-1", KYC_DATA);
      expect(result).toMatchObject({ status: "PROCESSING", providerRef: "mock_kyc_creator-1_1" });
    });

    it("rejects starting a second check while one is already PROCESSING", async () => {
      await expect(startKycCheck(creator({ verification: "PROCESSING" }), KYC_DATA)).rejects.toThrow(
        KycCheckInProgressError,
      );
      expect(kycProviderMock.startCheck).not.toHaveBeenCalled();
    });

    it("rejects starting a check for an already-verified creator", async () => {
      await expect(startKycCheck(creator({ verification: "VERIFIED" }), KYC_DATA)).rejects.toThrow(
        KycAlreadyVerifiedError,
      );
      expect(kycProviderMock.startCheck).not.toHaveBeenCalled();
    });

    it("Phase 12 (NDPA minimal retention): never persists any field of KycData — only provider/ref/status", async () => {
      kycProviderMock.startCheck.mockResolvedValue({ ref: "mock_kyc_creator-1_1" });
      prismaMock.$transaction.mockResolvedValue([
        { id: "creator-1", verification: "PROCESSING" },
        { id: "check-1", status: "PROCESSING" },
      ]);

      await startKycCheck(creator(), KYC_DATA);

      // The provider (which stores/forwards it for the real check) receives the
      // full KycData — that's the intended, sole destination for it.
      expect(kycProviderMock.startCheck).toHaveBeenCalledWith("creator-1", KYC_DATA);

      // Our own DB write must not contain any of it.
      expect(prismaMock.kycCheck.create).toHaveBeenCalledTimes(1);
      const createArgs = prismaMock.kycCheck.create.mock.calls[0][0];
      for (const piiField of Object.keys(KYC_DATA)) {
        expect(createArgs.data).not.toHaveProperty(piiField);
      }
      expect(createArgs.data).toMatchObject({
        creatorId: "creator-1",
        provider: "smile_identity",
        providerRef: "mock_kyc_creator-1_1",
        status: "PROCESSING",
      });
    });

    it("allows retrying after a FAILED check", async () => {
      kycProviderMock.startCheck.mockResolvedValue({ ref: "mock_kyc_creator-1_2" });
      prismaMock.$transaction.mockResolvedValue([
        { id: "creator-1", verification: "PROCESSING" },
        { id: "check-2", status: "PROCESSING" },
      ]);

      await expect(startKycCheck(creator({ verification: "FAILED" }), KYC_DATA)).resolves.toBeDefined();
      expect(kycProviderMock.startCheck).toHaveBeenCalled();
    });
  });

  describe("pollKycStatus", () => {
    it("returns the current state without writing anything if the provider still says PROCESSING", async () => {
      prismaMock.kycCheck.findFirst.mockResolvedValue({
        id: "check-1",
        status: "PROCESSING",
        providerRef: "ref-1",
      });
      kycProviderMock.getStatus.mockResolvedValue("PROCESSING");

      const result = await pollKycStatus(creator({ verification: "PROCESSING" }));

      expect(result.verification).toBe("PROCESSING");
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("transitions PROCESSING -> VERIFIED and sets the badge, notifying the creator", async () => {
      prismaMock.kycCheck.findFirst.mockResolvedValue({
        id: "check-1",
        status: "PROCESSING",
        providerRef: "mock_kyc_creator-1_1",
      });
      kycProviderMock.getStatus.mockResolvedValue("VERIFIED");
      prismaMock.$transaction.mockResolvedValue([
        { id: "creator-1", userId: "user-1", verification: "VERIFIED" },
        { id: "check-1", status: "VERIFIED" },
      ]);

      const result = await pollKycStatus(creator({ verification: "PROCESSING" }));

      expect(result.verification).toBe("VERIFIED");
      expect(notifyProviderMock.inApp).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ kind: "kyc_verified" }),
      );
      // Separation (X3): this write only ever touches verification — never styleTags.
      expect(prismaMock.creator.update).toHaveBeenCalledWith({
        where: { id: "creator-1" },
        data: { verification: "VERIFIED" },
      });
      const creatorUpdateCall = prismaMock.creator.update.mock.calls[0][0];
      expect(creatorUpdateCall.data).not.toHaveProperty("styleTags");
    });

    it("transitions PROCESSING -> FAILED without setting the badge", async () => {
      prismaMock.kycCheck.findFirst.mockResolvedValue({
        id: "check-1",
        status: "PROCESSING",
        providerRef: "mock_kyc_fail_creator-1_1",
      });
      kycProviderMock.getStatus.mockResolvedValue("FAILED");
      prismaMock.$transaction.mockResolvedValue([
        { id: "creator-1", userId: "user-1", verification: "FAILED" },
        { id: "check-1", status: "FAILED" },
      ]);

      const result = await pollKycStatus(creator({ verification: "PROCESSING" }));

      expect(result.verification).toBe("FAILED");
      expect(notifyProviderMock.inApp).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ kind: "kyc_failed" }),
      );
    });

    it("is a no-op when there is no check yet", async () => {
      prismaMock.kycCheck.findFirst.mockResolvedValue(null);

      const result = await pollKycStatus(creator());

      expect(result.verification).toBe("UNVERIFIED");
      expect(kycProviderMock.getStatus).not.toHaveBeenCalled();
    });
  });
});
