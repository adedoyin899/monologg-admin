import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db/client.js";
import { paginationQuerySchema, paginate, toSkipTake } from "../lib/pagination.js";
import { nicheLabel, initials, formatMoney } from "../lib/display.js";
import { publicAttributesOf, type AttributeFieldName, type VisibilityMap } from "../services/attributes.js";

const NICHE_VALUES = ["ACTOR", "VO_ARTIST", "COMEDIAN", "COMPERE", "SPEAKER_PASTOR", "MUSICIAN", "CONTENT_CREATOR"] as const;

// features.md Phase 12A.3 — attribute filter values, kept identical to
// routes/attributes.ts's own enum lists (single source would mean importing
// across a route-to-route boundary; small, stable, casting-industry enums —
// duplication here is the same tradeoff Phase 5's NICHE_VALUES already made).
const HEIGHT_RANGE = ["UNDER_150CM", "CM_150_160", "CM_160_170", "CM_170_180", "CM_180_190", "OVER_190CM"] as const;
const WEIGHT_RANGE = ["UNDER_50KG", "KG_50_65", "KG_65_80", "KG_80_95", "OVER_95KG"] as const;
const AGE_RANGE = ["RANGE_18_25", "RANGE_26_35", "RANGE_36_45", "RANGE_46_55", "RANGE_56_65", "OVER_65"] as const;
const BUILD_TYPE = ["SLIM", "ATHLETIC", "AVERAGE", "CURVY", "PLUS_SIZE", "MUSCULAR"] as const;
const COMPLEXION = ["FAIR", "LIGHT", "MEDIUM", "TAN", "DARK", "DEEP"] as const;
const HAIR_COLOR = ["BLACK", "BROWN", "BLONDE", "RED", "GREY", "WHITE", "DYED_OTHER"] as const;
const EYE_COLOR = ["BROWN", "BLACK", "HAZEL", "GREEN", "BLUE", "GREY"] as const;
const GENDER_PRESENTATION = ["MASCULINE", "FEMININE", "ANDROGYNOUS", "NON_BINARY"] as const;

const discoveryQuerySchema = paginationQuerySchema.extend({
  niche: z.enum(NICHE_VALUES).optional(),
  tag: z.string().optional(),
  location: z.string().optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  heightRange: z.enum(HEIGHT_RANGE).optional(),
  weightRange: z.enum(WEIGHT_RANGE).optional(),
  ageRange: z.enum(AGE_RANGE).optional(),
  build: z.enum(BUILD_TYPE).optional(),
  complexion: z.enum(COMPLEXION).optional(),
  hairColor: z.enum(HAIR_COLOR).optional(),
  eyeColor: z.enum(EYE_COLOR).optional(),
  genderPresentation: z.enum(GENDER_PRESENTATION).optional(),
});

const ATTRIBUTE_QUERY_KEYS = [
  "heightRange", "weightRange", "ageRange", "build", "complexion", "hairColor", "eyeColor", "genderPresentation",
] as const satisfies readonly AttributeFieldName[];

// Public talent discovery (features.md Phase 5) — no auth required. Fields with no
// real backing yet (rating/reviews — no review system exists in any phase's schema;
// available — no real availability-computation exists until Phase 13) are honest
// placeholders (0 / true), not fabricated data, and documented as such.
export async function talentRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/api/v1/talent",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = discoveryQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          statusCode: 400,
        });
      }
      const query = parsed.data;

      const where: Prisma.CreatorWhereInput = {
        ...(query.niche ? { niche: query.niche } : {}),
        ...(query.tag ? { styleTags: { has: query.tag } } : {}),
        ...(query.location ? { location: { contains: query.location, mode: "insensitive" } } : {}),
        ...(query.minPrice !== undefined || query.maxPrice !== undefined
          ? {
              rateCards: {
                some: {
                  basePriceAmount: {
                    ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
                    ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
                  },
                },
              },
            }
          : {}),
      };

      // features.md Phase 12A.3 search rule: "a talent is a candidate for an
      // attribute filter ONLY when that field's visibility != PRIVATE." Applied
      // in application code, not a Prisma JSON-path query, deliberately: the
      // visibility map's keys are dynamic (any of 8 attribute fields), and
      // this codebase has no live-DB CI gate to exercise a JSON-path query
      // against real Postgres before every commit (see apps/api/README.md's
      // "test:integration isn't CI-gated" note) — application-layer filtering
      // is fully covered by the fast, mocked-Prisma unit-test gate instead.
      // Known tradeoff: when any attribute filter is active, pagination runs
      // AFTER this in-memory filter rather than being pushed into the DB
      // query's skip/take — correct at this app's current talent-pool scale,
      // not the shape a real large-scale directory would want.
      const activeAttributeFilters = ATTRIBUTE_QUERY_KEYS.filter((key) => query[key] !== undefined);
      const hasAttributeFilters = activeAttributeFilters.length > 0;

      let talents: ReturnType<typeof mapCreatorToTalent>[];
      let total: number;

      if (hasAttributeFilters) {
        const candidates = await prisma.creator.findMany({
          where,
          orderBy: { name: "asc" },
          include: { rateCards: { orderBy: { basePriceAmount: "asc" }, take: 1 }, physicalAttributes: true },
        });

        const matching = candidates.filter((creator) => {
          const attrs = creator.physicalAttributes;
          if (!attrs) return false;
          const visibility = (attrs.visibility as VisibilityMap) ?? {};
          return activeAttributeFilters.every((field) => {
            if (visibility[field] === "PRIVATE" || !visibility[field]) return false; // absent = not yet set, never a match
            return (attrs as unknown as Record<string, unknown>)[field] === query[field];
          });
        });

        total = matching.length;
        const { skip, take } = toSkipTake(query);
        talents = matching.slice(skip, skip + take).map(mapCreatorToTalent);
      } else {
        const { skip, take } = toSkipTake(query);
        const [creators, count] = await Promise.all([
          prisma.creator.findMany({
            where,
            skip,
            take,
            orderBy: { name: "asc" },
            include: { rateCards: { orderBy: { basePriceAmount: "asc" }, take: 1 }, physicalAttributes: true },
          }),
          prisma.creator.count({ where }),
        ]);
        talents = creators.map(mapCreatorToTalent);
        total = count;
      }

      return reply.send(paginate(talents, total, query));
    },
  );
}

function mapCreatorToTalent(
  creator: Prisma.CreatorGetPayload<{ include: { rateCards: true; physicalAttributes: true } }>,
) {
  const cheapest = creator.rateCards[0];
  return {
    id: creator.id,
    name: creator.name,
    role: nicheLabel(creator.niche),
    location: creator.location,
    price: cheapest ? formatMoney(cheapest.basePriceAmount, cheapest.basePriceCurrency) : "Contact for pricing",
    tags: creator.styleTags,
    verified: creator.verification === "VERIFIED",
    rating: 0,
    reviews: 0,
    available: true,
    avatar: initials(creator.name),
    // features.md Phase 12A.3: PUBLIC-visibility attributes only — a talent
    // that matched a SEARCHABLE-visibility filter still shows up in the list
    // above (via `where`/the in-memory filter), but the field's actual value
    // never appears here unless its visibility is PUBLIC ("a slim filter can
    // succeed without exposing the label").
    attributes: publicAttributesOf(
      creator.physicalAttributes as unknown as Parameters<typeof publicAttributesOf>[0],
    ),
  };
}

