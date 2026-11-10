import { prisma } from "../db/client.js";

// Physical attributes service (features.md Phase 12A.3) — GDPR/NDPR-compliant
// casting-search data. Every rule here traces to one of the spec's SIX PRIVACY
// NON-NEGOTIABLES; each is called out by number at its point of enforcement so
// none can silently regress without the comment explaining what broke.

export const ATTRIBUTE_FIELD_NAMES = [
  "heightRange",
  "weightRange",
  "ageRange",
  "build",
  "complexion",
  "hairColor",
  "eyeColor",
  "genderPresentation",
  "shoeSize",
  "shoeSizeUnit",
] as const; // distinctiveFeatures excluded — free text, never a filter/visibility field (schema.prisma)
export type AttributeFieldName = (typeof ATTRIBUTE_FIELD_NAMES)[number];

export type VisibilityLevel = "PUBLIC" | "SEARCHABLE" | "PRIVATE";
export type VisibilityMap = Partial<Record<AttributeFieldName, VisibilityLevel>>;

export interface UpsertAttributesInput {
  heightRange?: string;
  weightRange?: string;
  ageRange?: string;
  build?: string;
  complexion?: string;
  hairColor?: string;
  eyeColor?: string;
  genderPresentation?: string;
  shoeSize?: string;
  shoeSizeUnit?: string;
  distinctiveFeatures?: string;
  visibility?: VisibilityMap;
  consentVersion: string;
}

/** Non-Negotiable #3: default is SEARCHABLE, and a field's FIRST-EVER explicit
 * value can never save as PUBLIC even if that's what was requested — it's
 * silently downgraded to SEARCHABLE instead. "First-ever" is tracked per
 * FIELD, not per row: a talent filling in height today and hair color next
 * month is each field's own first save, even though the row itself already
 * existed from the first one. Elevating to PUBLIC is only reachable as a
 * deliberate, separate, later update once the field already has a value. */
function resolveFieldVisibility(requested: VisibilityLevel | undefined, hadPriorValue: boolean): VisibilityLevel {
  const wanted = requested ?? "SEARCHABLE";
  if (!hadPriorValue && wanted === "PUBLIC") return "SEARCHABLE";
  return wanted;
}

/**
 * PUT /creators/me/attributes — partial-merge semantics despite the verb:
 * fields omitted from `input` are left exactly as they were (Non-Negotiable
 * #1, "every attribute optional/skippable... complete later" implies a
 * progressive, multi-visit fill-in flow, not "resend everything or lose it").
 * `visibility` entries merge into the existing map the same way.
 */
export async function upsertAttributes(creatorId: string, input: UpsertAttributesInput) {
  const existing = await prisma.physicalAttributes.findUnique({ where: { creatorId } });
  const existingVisibility = (existing?.visibility as VisibilityMap | undefined) ?? {};

  const fieldData: Record<string, string | null> = {};
  const visibility: VisibilityMap = { ...existingVisibility };

  for (const field of ATTRIBUTE_FIELD_NAMES) {
    const value = input[field];
    if (value === undefined) continue; // not touched by this save
    fieldData[field] = value;
    const hadPriorValue = existing ? (existing as Record<string, unknown>)[field] != null : false;
    visibility[field] = resolveFieldVisibility(input.visibility?.[field], hadPriorValue);
  }

  // Non-Negotiable #4: consent version + timestamp captured on first save AND
  // on any consent-affecting change (the version itself changing) — an
  // ordinary field edit under the SAME already-accepted version doesn't
  // re-timestamp consent that didn't change.
  const isFirstSave = !existing;
  const consentChanged = isFirstSave || input.consentVersion !== existing.consentVersion;

  if (isFirstSave) {
    return prisma.physicalAttributes.create({
      data: {
        creatorId,
        ...fieldData,
        distinctiveFeatures: input.distinctiveFeatures,
        visibility,
        consentVersion: input.consentVersion,
        consentedAt: new Date(),
      },
    });
  }

  return prisma.physicalAttributes.update({
    where: { creatorId },
    data: {
      ...fieldData,
      ...(input.distinctiveFeatures !== undefined ? { distinctiveFeatures: input.distinctiveFeatures } : {}),
      visibility,
      consentVersion: input.consentVersion,
      ...(consentChanged ? { consentedAt: new Date() } : {}),
    },
  });
}

/** Non-Negotiable #5: revocable at any time, hard-delete (right-to-erasure) —
 * not a soft-delete/archive flag. Idempotent: deleting a row that doesn't
 * exist is treated as already-erased, not an error. */
export async function deleteAttributes(creatorId: string): Promise<void> {
  await prisma.physicalAttributes.deleteMany({ where: { creatorId } });
}

export async function getOwnAttributes(creatorId: string) {
  return prisma.physicalAttributes.findUnique({ where: { creatorId } });
}

type AttributesRow = {
  [K in AttributeFieldName]: string | null;
} & { distinctiveFeatures: string | null; visibility: unknown };

/** Non-Negotiable #3/#6 enforcement point for READS: strips every field whose
 * visibility isn't PUBLIC. Used for anything a logged-out/public consumer can
 * reach (storefront, unauthenticated talent search) — SEARCHABLE fields can
 * make a talent match a filter (see filterCreatorIdsByAttributes below) but
 * are never themselves returned in a public payload ("a slim filter can
 * succeed without exposing the label"). distinctiveFeatures (free text) is
 * treated as PUBLIC-only-if-marked the same as any enum field even though
 * it's not in ATTRIBUTE_FIELD_NAMES — visibility keys are looked up by the
 * same field name regardless of the value's own type. */
export function publicAttributesOf(row: AttributesRow | null): Partial<Record<AttributeFieldName | "distinctiveFeatures", string>> {
  if (!row) return {};
  const visibility = (row.visibility as VisibilityMap) ?? {};
  const out: Partial<Record<AttributeFieldName | "distinctiveFeatures", string>> = {};
  for (const field of [...ATTRIBUTE_FIELD_NAMES, "distinctiveFeatures" as const]) {
    const value = row[field];
    if (value != null && visibility[field as AttributeFieldName] === "PUBLIC") {
      out[field] = value;
    }
  }
  return out;
}
