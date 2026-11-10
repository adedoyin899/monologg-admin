import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { findOwnCreator } from "../lib/ownership.js";
import { upsertAttributes, deleteAttributes, getOwnAttributes } from "../services/attributes.js";
import { track } from "../lib/analytics/index.js";

const HEIGHT_RANGE = ["UNDER_150CM", "CM_150_160", "CM_160_170", "CM_170_180", "CM_180_190", "OVER_190CM"] as const;
const WEIGHT_RANGE = ["UNDER_50KG", "KG_50_65", "KG_65_80", "KG_80_95", "OVER_95KG"] as const;
const AGE_RANGE = ["RANGE_18_25", "RANGE_26_35", "RANGE_36_45", "RANGE_46_55", "RANGE_56_65", "OVER_65"] as const;
const BUILD_TYPE = ["SLIM", "ATHLETIC", "AVERAGE", "CURVY", "PLUS_SIZE", "MUSCULAR"] as const;
const COMPLEXION = ["FAIR", "LIGHT", "MEDIUM", "TAN", "DARK", "DEEP"] as const;
const HAIR_COLOR = ["BLACK", "BROWN", "BLONDE", "RED", "GREY", "WHITE", "DYED_OTHER"] as const;
const EYE_COLOR = ["BROWN", "BLACK", "HAZEL", "GREEN", "BLUE", "GREY"] as const;
const GENDER_PRESENTATION = ["MASCULINE", "FEMININE", "ANDROGYNOUS", "NON_BINARY"] as const;
const SHOE_SIZE_UNIT = ["EU", "US", "UK"] as const;
const VISIBILITY_LEVEL = ["PUBLIC", "SEARCHABLE", "PRIVATE"] as const;

const ATTRIBUTE_FIELD_NAME = z.enum([
  "heightRange", "weightRange", "ageRange", "build", "complexion",
  "hairColor", "eyeColor", "genderPresentation", "shoeSize", "shoeSizeUnit", "distinctiveFeatures",
]);

// Non-Negotiable #1: every field optional/skippable — nothing in this schema
// is `.required()` except consentVersion, which isn't a physical attribute at
// all, it's the record of having gone through this screen at all.
const upsertAttributesSchema = z.object({
  heightRange: z.enum(HEIGHT_RANGE).optional(),
  weightRange: z.enum(WEIGHT_RANGE).optional(),
  ageRange: z.enum(AGE_RANGE).optional(),
  build: z.enum(BUILD_TYPE).optional(),
  complexion: z.enum(COMPLEXION).optional(),
  hairColor: z.enum(HAIR_COLOR).optional(),
  eyeColor: z.enum(EYE_COLOR).optional(),
  genderPresentation: z.enum(GENDER_PRESENTATION).optional(),
  shoeSize: z.string().max(10).optional(),
  shoeSizeUnit: z.enum(SHOE_SIZE_UNIT).optional(),
  distinctiveFeatures: z.string().max(120).optional(),
  visibility: z.record(ATTRIBUTE_FIELD_NAME, z.enum(VISIBILITY_LEVEL)).optional(),
  consentVersion: z.string().min(1),
});

export async function attributesRoutes(app: FastifyInstance): Promise<void> {
  // GET /creators/me/attributes — the owner's own full record, all visibility
  // levels included (this is the settings editor's own read, not a public one).
  app.get(
    "/api/v1/creators/me/attributes",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }
      const attributes = await getOwnAttributes(creator.id);
      return reply.send(attributes);
    },
  );

  // PUT /creators/me/attributes — partial-merge upsert (see services/attributes.ts
  // docstring for why "PUT" isn't full-replace semantics here).
  app.put(
    "/api/v1/creators/me/attributes",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }

      const parsed = upsertAttributesSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }

      const attributes = await upsertAttributes(creator.id, parsed.data);

      const visibility = (parsed.data.visibility ?? {}) as Record<string, string>;
      const visValues = Object.values(visibility);
      const publicCount = visValues.filter((v) => v === "PUBLIC").length;
      const searchableCount = visValues.filter((v) => v === "SEARCHABLE").length;
      const privateCount = visValues.filter((v) => v === "PRIVATE").length;

      const { consentVersion, visibility: _, ...fields } = parsed.data;
      const fieldCount = Object.values(fields).filter((v) => v !== undefined).length;

      void track(
        "attributes_saved",
        { fieldCount, publicCount, searchableCount, privateCount },
        { actor: "USER", actorId: request.user!.userId, source: "API" },
      ).catch(() => {});

      return reply.send(attributes);
    },
  );

  // DELETE /creators/me/attributes — Non-Negotiable #5, hard-delete, revocable
  // at any time. Idempotent: 204 whether or not a row existed.
  app.delete(
    "/api/v1/creators/me/attributes",
    { preHandler: [requireAuth, requireRole("TALENT")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const creator = await findOwnCreator(request.user!.userId);
      if (!creator) {
        return reply.status(404).send({ error: "Not Found", message: "No creator profile for this user", statusCode: 404 });
      }
      await deleteAttributes(creator.id);

      void track(
        "attributes_deleted",
        { fieldCount: 0, publicCount: 0, searchableCount: 0, privateCount: 0 },
        { actor: "USER", actorId: request.user!.userId, source: "API" },
      ).catch(() => {});

      return reply.status(204).send();
    },
  );
}
