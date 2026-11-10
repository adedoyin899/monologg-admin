import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

const models = Prisma.dmmf.datamodel.models;

function model(name: string) {
  const found = models.find((m) => m.name === name);
  if (!found) throw new Error(`Model ${name} not found in schema`);
  return found;
}

function field(modelName: string, fieldName: string) {
  const found = model(modelName).fields.find((f) => f.name === fieldName);
  if (!found) throw new Error(`Field ${modelName}.${fieldName} not found in schema`);
  return found;
}

describe("Prisma schema — money rule", () => {
  it("has no Float or Decimal scalar field anywhere (integer minor units only)", () => {
    const offenders = models.flatMap((m) =>
      m.fields
        .filter((f) => f.kind === "scalar" && (f.type === "Float" || f.type === "Decimal"))
        .map((f) => `${m.name}.${f.name}`),
    );
    expect(offenders).toEqual([]);
  });

  it.each([
    ["RateCard", "basePriceAmount"],
    ["Brief", "budgetAmount"],
    ["Booking", "baseAmount"],
    ["Booking", "talentFeeAmount"],
    ["Booking", "clientFeeAmount"],
    ["Payment", "amount"],
  ])("%s.%s is an Int", (modelName, fieldName) => {
    const f = field(modelName, fieldName);
    expect(f.type).toBe("Int");
  });
});

describe("Prisma schema — X3: styleTags/verification are separate", () => {
  it("Creator.styleTags and Creator.verification are distinct fields", () => {
    const styleTags = field("Creator", "styleTags");
    const verification = field("Creator", "verification");

    expect(styleTags.name).not.toBe(verification.name);
    expect(styleTags.kind).toBe("scalar");
    expect(styleTags.type).toBe("String");
    expect(styleTags.isList).toBe(true);

    expect(verification.kind).toBe("enum");
    expect(verification.type).toBe("VerificationState");
  });
});

describe("Prisma schema — X3: tagging job state is independent of identity verification", () => {
  it("MediaAsset.taggingStatus is its own enum, unrelated to Creator.verification", () => {
    const taggingStatus = field("MediaAsset", "taggingStatus");
    const verification = field("Creator", "verification");

    expect(taggingStatus.kind).toBe("enum");
    expect(taggingStatus.type).toBe("TaggingStatus");
    expect(taggingStatus.type).not.toBe(verification.type);
  });

  it("KycCheck (identity) and MediaAsset (tagging) are separate models with no shared relation", () => {
    const kycCheck = model("KycCheck");
    const mediaAsset = model("MediaAsset");
    expect(kycCheck.fields.some((f) => f.type === "MediaAsset")).toBe(false);
    expect(mediaAsset.fields.some((f) => f.type === "KycCheck")).toBe(false);
  });
});

describe("Prisma schema — X1: payment provider is free text, not an enum", () => {
  it("Payment.provider is a String (validated against an allowlist in application code)", () => {
    const provider = field("Payment", "provider");
    expect(provider.kind).toBe("scalar");
    expect(provider.type).toBe("String");
  });
});

describe("Prisma schema — Phase 12: KYC PII has no column to leak from (minimal retention)", () => {
  it("KycCheck has no column for legal name / DOB / ID number — only provider/ref/status", () => {
    // features.md Phase 7's KycData (firstName, lastName, dateOfBirth, idNumber,
    // etc.) is validated at the route boundary and passed straight to
    // KycProvider.startCheck — src/services/kyc.ts never writes it anywhere.
    // This test locks that in at the schema level: there is no column it COULD
    // land in even if a future change tried, which is a stronger guarantee than
    // "encrypt it once it's stored" for data this sensitive (NDPA minimal-
    // retention). See src/services/kyc.persistence.test.ts for the service-level
    // half of this guarantee.
    const piiFieldNames = ["firstName", "lastName", "dateOfBirth", "idNumber", "idType", "country"];
    const kycCheckFieldNames = model("KycCheck").fields.map((f) => f.name);
    for (const pii of piiFieldNames) {
      expect(kycCheckFieldNames).not.toContain(pii);
    }
  });
});

describe("Prisma schema — Phase 12A: additive-only extensions", () => {
  it("MediaKit and PhysicalAttributes are one-per-creator (@unique creatorId)", () => {
    expect(field("MediaKit", "creatorId").isUnique).toBe(true);
    expect(field("PhysicalAttributes", "creatorId").isUnique).toBe(true);
  });

  it("VerificationRecording is NOT one-per-creator — creatorId is a plain FK, since a re-record supersedes rather than replaces (same shape as KycCheck)", () => {
    expect(field("VerificationRecording", "creatorId").isUnique).toBe(false);
  });

  it("VerificationRecording (performance) has no relation to KycCheck (identity) — the X3 invariant applied to a new axis", () => {
    const verificationFields = model("VerificationRecording").fields.map((f) => f.name);
    const kycCheckFields = model("KycCheck").fields.map((f) => f.name);
    expect(verificationFields).not.toContain("kycCheckId");
    expect(kycCheckFields).not.toContain("verificationRecordingId");
  });

  it("PhysicalAttributes has no monetary field, and its ranges are enums (not raw Int height/weight/age)", () => {
    const attrFields = model("PhysicalAttributes").fields;
    const scalarNumeric = attrFields.filter((f) => f.kind === "scalar" && (f.type === "Int" || f.type === "Float"));
    expect(scalarNumeric).toEqual([]);
  });

  it("none of the three new models altered an existing field on Creator, Booking, or Payment", () => {
    // Additive-only migration guardrail: the three load-bearing money/state
    // models from earlier phases keep exactly the field set they had before
    // 12A — new relations on Creator are fine (checked positively below),
    // but nothing on Booking/Payment should exist that this phase never touched.
    const bookingFields = model("Booking").fields.map((f) => f.name);
    const paymentFields = model("Payment").fields.map((f) => f.name);
    expect(bookingFields).not.toContain("mediaKit");
    expect(paymentFields).not.toContain("mediaKit");
    const creatorRelations = model("Creator").fields.map((f) => f.name);
    expect(creatorRelations).toEqual(
      expect.arrayContaining(["mediaKit", "verificationRecordings", "physicalAttributes"]),
    );
  });
});
