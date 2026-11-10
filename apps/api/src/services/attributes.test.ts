import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/client.js", () => ({
  prisma: {
    physicalAttributes: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  },
}));

import { prisma } from "../db/client.js";
import { upsertAttributes, deleteAttributes, getOwnAttributes, publicAttributesOf } from "./attributes.js";

const prismaMock = prisma as any;

describe("Physical attributes service (features.md Phase 12A.3 — six privacy non-negotiables)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Non-Negotiable #1 & #2: optional fields, ranges not exact values", () => {
    it("a save with only ONE field set doesn't require any others", async () => {
      prismaMock.physicalAttributes.findUnique.mockResolvedValue(null);
      prismaMock.physicalAttributes.create.mockResolvedValue({ creatorId: "creator-1", heightRange: "CM_170_180" });

      await upsertAttributes("creator-1", { heightRange: "CM_170_180", consentVersion: "v1" });

      const createArgs = prismaMock.physicalAttributes.create.mock.calls[0][0];
      expect(createArgs.data.heightRange).toBe("CM_170_180");
      expect(createArgs.data.weightRange).toBeUndefined();
    });
  });

  describe("Non-Negotiable #3: default SEARCHABLE, never PUBLIC on a field's first save", () => {
    it("defaults an unspecified visibility to SEARCHABLE", async () => {
      prismaMock.physicalAttributes.findUnique.mockResolvedValue(null);
      prismaMock.physicalAttributes.create.mockResolvedValue({});

      await upsertAttributes("creator-1", { heightRange: "CM_170_180", consentVersion: "v1" });

      const data = prismaMock.physicalAttributes.create.mock.calls[0][0].data;
      expect(data.visibility.heightRange).toBe("SEARCHABLE");
    });

    it("coerces an explicit PUBLIC request down to SEARCHABLE on the field's first save", async () => {
      prismaMock.physicalAttributes.findUnique.mockResolvedValue(null);
      prismaMock.physicalAttributes.create.mockResolvedValue({});

      await upsertAttributes("creator-1", {
        heightRange: "CM_170_180",
        visibility: { heightRange: "PUBLIC" },
        consentVersion: "v1",
      });

      const data = prismaMock.physicalAttributes.create.mock.calls[0][0].data;
      expect(data.visibility.heightRange).toBe("SEARCHABLE"); // NOT PUBLIC, despite the request
    });

    it("DOES allow PUBLIC on a later, deliberate update of an already-set field", async () => {
      prismaMock.physicalAttributes.findUnique.mockResolvedValue({
        creatorId: "creator-1",
        heightRange: "CM_170_180", // already has a value — not this field's first save
        visibility: { heightRange: "SEARCHABLE" },
        consentVersion: "v1",
      });
      prismaMock.physicalAttributes.update.mockResolvedValue({});

      await upsertAttributes("creator-1", {
        heightRange: "CM_170_180",
        visibility: { heightRange: "PUBLIC" },
        consentVersion: "v1",
      });

      const data = prismaMock.physicalAttributes.update.mock.calls[0][0].data;
      expect(data.visibility.heightRange).toBe("PUBLIC");
    });

    it("a DIFFERENT field's first save still gets coerced even when the row already exists from an earlier field", async () => {
      prismaMock.physicalAttributes.findUnique.mockResolvedValue({
        creatorId: "creator-1",
        heightRange: "CM_170_180",
        weightRange: null, // never set before
        visibility: { heightRange: "PUBLIC" },
        consentVersion: "v1",
      });
      prismaMock.physicalAttributes.update.mockResolvedValue({});

      await upsertAttributes("creator-1", {
        weightRange: "KG_65_80",
        visibility: { weightRange: "PUBLIC" },
        consentVersion: "v1",
      });

      const data = prismaMock.physicalAttributes.update.mock.calls[0][0].data;
      expect(data.visibility.weightRange).toBe("SEARCHABLE"); // coerced — first save for THIS field
      expect(data.visibility.heightRange).toBe("PUBLIC"); // untouched, preserved from before
    });
  });

  describe("Non-Negotiable #4: consent version + timestamp on first save and on any consent-affecting change", () => {
    it("sets consentedAt on first save", async () => {
      prismaMock.physicalAttributes.findUnique.mockResolvedValue(null);
      prismaMock.physicalAttributes.create.mockResolvedValue({});

      await upsertAttributes("creator-1", { consentVersion: "v1" });

      const data = prismaMock.physicalAttributes.create.mock.calls[0][0].data;
      expect(data.consentVersion).toBe("v1");
      expect(data.consentedAt).toBeInstanceOf(Date);
    });

    it("re-timestamps consentedAt when consentVersion changes", async () => {
      prismaMock.physicalAttributes.findUnique.mockResolvedValue({
        creatorId: "creator-1", consentVersion: "v1", visibility: {},
      });
      prismaMock.physicalAttributes.update.mockResolvedValue({});

      await upsertAttributes("creator-1", { heightRange: "CM_170_180", consentVersion: "v2" });

      const data = prismaMock.physicalAttributes.update.mock.calls[0][0].data;
      expect(data.consentedAt).toBeInstanceOf(Date);
    });

    it("does NOT re-timestamp consentedAt on an ordinary edit under the same consent version", async () => {
      prismaMock.physicalAttributes.findUnique.mockResolvedValue({
        creatorId: "creator-1", consentVersion: "v1", visibility: {},
      });
      prismaMock.physicalAttributes.update.mockResolvedValue({});

      await upsertAttributes("creator-1", { heightRange: "CM_170_180", consentVersion: "v1" });

      const data = prismaMock.physicalAttributes.update.mock.calls[0][0].data;
      expect(data.consentedAt).toBeUndefined();
    });
  });

  describe("Non-Negotiable #5: revocable at any time, hard-delete", () => {
    it("calls a real delete, not a soft-delete/flag update", async () => {
      await deleteAttributes("creator-1");
      expect(prismaMock.physicalAttributes.deleteMany).toHaveBeenCalledWith({ where: { creatorId: "creator-1" } });
    });
  });

  describe("Non-Negotiable #6: no auto-decisions — publicAttributesOf is pure filtering, never scoring", () => {
    it("returns only PUBLIC fields, with no score/rank/match field anywhere in its output shape", () => {
      const result = publicAttributesOf({
        heightRange: "CM_170_180",
        weightRange: "KG_65_80",
        ageRange: null, build: null, complexion: null, hairColor: null, eyeColor: null,
        genderPresentation: null, shoeSize: null, shoeSizeUnit: null, distinctiveFeatures: null,
        visibility: { heightRange: "PUBLIC", weightRange: "SEARCHABLE" },
      });
      expect(result).toEqual({ heightRange: "CM_170_180" }); // weightRange omitted (SEARCHABLE, not PUBLIC)
      expect(Object.keys(result)).not.toContain("score");
      expect(Object.keys(result)).not.toContain("matchRank");
    });

    it("returns an empty object for a null row (never persisted)", () => {
      expect(publicAttributesOf(null)).toEqual({});
    });

    it("omits PRIVATE fields entirely", () => {
      const result = publicAttributesOf({
        heightRange: "CM_170_180", weightRange: null, ageRange: null, build: null, complexion: null,
        hairColor: null, eyeColor: null, genderPresentation: null, shoeSize: null, shoeSizeUnit: null,
        distinctiveFeatures: null,
        visibility: { heightRange: "PRIVATE" },
      });
      expect(result).toEqual({});
    });
  });

  describe("getOwnAttributes", () => {
    it("is a plain owner-scoped lookup", async () => {
      await getOwnAttributes("creator-1");
      expect(prismaMock.physicalAttributes.findUnique).toHaveBeenCalledWith({ where: { creatorId: "creator-1" } });
    });
  });
});
