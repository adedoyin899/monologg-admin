import type { Creator } from "@prisma/client";
import { prisma } from "../db/client.js";
import { kycProvider, notifyProvider } from "../providers/index.js";
import { enqueueEmailNotification } from "./notifications.js";
import type { KycData } from "../providers/kyc.interface.js";

// Identity KYC service (features.md Phase 7). This is the ONLY place that ever
// writes Creator.verification — the Verified badge reflects nothing else.
// X3: never touches Creator.styleTags. See services/aiTagging.ts for the fully
// independent style-tagging system.

export class KycCheckInProgressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KycCheckInProgressError";
  }
}

export class KycAlreadyVerifiedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KycAlreadyVerifiedError";
  }
}

/**
 * POST /creators/me/verify — starts a new identity check via KycProvider.
 * Rejects if a check is already in flight, or the creator is already verified
 * (a failed check may always be retried).
 */
export async function startKycCheck(creator: Creator, data: KycData) {
  if (creator.verification === "PROCESSING") {
    throw new KycCheckInProgressError(`Creator "${creator.id}" already has a KYC check in progress`);
  }
  if (creator.verification === "VERIFIED") {
    throw new KycAlreadyVerifiedError(`Creator "${creator.id}" is already verified`);
  }

  const { ref } = await kycProvider.startCheck(creator.id, data);

  const [, kycCheck] = await prisma.$transaction([
    prisma.creator.update({ where: { id: creator.id }, data: { verification: "PROCESSING" } }),
    prisma.kycCheck.create({
      data: { creatorId: creator.id, provider: "smile_identity", providerRef: ref, status: "PROCESSING" },
    }),
  ]);

  return kycCheck;
}

/**
 * GET /creators/me/verify — polls the provider for the latest check's current
 * status. A real Smile Identity integration would also accept a webhook; the
 * interface only exposes getStatus, so polling is the transport (features.md
 * Phase 7 spec: "webhook/poll").
 */
export async function pollKycStatus(creator: Creator) {
  const latestCheck = await prisma.kycCheck.findFirst({
    where: { creatorId: creator.id },
    orderBy: { createdAt: "desc" },
  });

  if (!latestCheck || latestCheck.status !== "PROCESSING" || !latestCheck.providerRef) {
    return { verification: creator.verification, check: latestCheck };
  }

  const status = await kycProvider.getStatus(latestCheck.providerRef);
  if (status === latestCheck.status) {
    return { verification: creator.verification, check: latestCheck };
  }

  const [updatedCreator, updatedCheck] = await prisma.$transaction([
    prisma.creator.update({ where: { id: creator.id }, data: { verification: status } }),
    prisma.kycCheck.update({ where: { id: latestCheck.id }, data: { status } }),
  ]);

  const kind = status === "VERIFIED" ? "kyc_verified" : "kyc_failed";
  await notifyProvider.inApp(creator.userId, { kind, creatorId: creator.id }).catch(() => {});
  await enqueueEmailNotification(creator.userId, kind, { creatorId: creator.id });

  return { verification: updatedCreator.verification, check: updatedCheck };
}
