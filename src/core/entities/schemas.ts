/**
 * Universe entity schemas — the single validated source of the Stellar Attractor
 * universe (Implementation Plan §1 decision 4, §4; Technical Architecture §9–13, §27).
 *
 * Framework-independent. This module imports `zod` directly (not `astro:content`)
 * so it can be consumed by:
 *   - `src/content.config.ts`      — Astro content collections (fails `astro build`)
 *   - `scripts/generate-schemas.ts` — JSON Schema mirrors under `schemas/`
 *   - `scripts/validate-entities.ts` — the CI validator (#18 fills in the body)
 *   - Vitest unit tests
 *
 * `astro` bundles the same `zod@^4.5.4` this file imports; npm dedupes them to a
 * single module instance, so schemas built here compose cleanly inside
 * `defineCollection({ schema })`.
 *
 * SCOPE (this Story, #16): entity *shape* only. Cross-file referential integrity
 * — dangling `relation.target`, duplicate slugs, unresolvable media references —
 * is #18's job and is deliberately NOT enforced here.
 */

import { z } from "zod";

/* -------------------------------------------------------------------------- */
/*  Enums / primitives                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The 11 entity types (Technical Architecture §9). Order is canonical — it drives
 * collection registration and schema-file generation.
 */
export const ENTITY_TYPES = [
  "person",
  "vessel",
  "station",
  "location",
  "astronomical-object",
  "mission",
  "event",
  "organization",
  "document",
  "media",
  "science",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export const entityTypeSchema = z.enum(ENTITY_TYPES);

/**
 * Directory under `data/` that backs each entity type. Types that are already
 * plural or uncountable (`media`, `science`) keep their name; the rest are
 * pluralised. `astronomical-object` → `astronomical-objects`.
 */
export const ENTITY_DIRS: Record<EntityType, string> = {
  person: "people",
  vessel: "vessels",
  station: "stations",
  location: "locations",
  "astronomical-object": "astronomical-objects",
  mission: "missions",
  event: "events",
  organization: "organizations",
  document: "documents",
  media: "media",
  science: "science",
};

/**
 * Clearance levels (Technical Architecture §27). MVP: presentation only —
 * `guest`-accessible renders content, everything more restrictive renders a
 * locked state. The field survives a future real auth implementation unchanged.
 */
export const CLEARANCE_LEVELS = [
  "guest",
  "civilian",
  "authorized",
  "restricted",
  "classified",
] as const;

export type Clearance = (typeof CLEARANCE_LEVELS)[number];

export const clearanceSchema = z.enum(CLEARANCE_LEVELS);

/** `slug` format: lowercase alphanumerics, single hyphens as separators. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** `id` format convention: `<type>.<slug>` (e.g. `person.zane`). */
export const ID_PATTERN = /^[a-z0-9-]+\.[a-z0-9-]+$/;

/**
 * Recognised media asset extensions. A media reference must point at a *stable
 * media id or path*, never an inline filename (Implementation Plan §4), so a
 * value ending in one of these is rejected: `"zane-portrait.png"` fails but
 * `"media.zane-portrait"` / `"portraits/zane"` pass. Shared with the JSON Schema
 * generator, which mirrors this rule as a `pattern`.
 */
export const MEDIA_ASSET_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "avif",
  "gif",
  "svg",
  "mp4",
  "webm",
  "mov",
  "m4v",
  "mp3",
  "wav",
  "ogg",
  "pdf",
] as const;

const MEDIA_FILENAME_PATTERN = new RegExp(`\\.(?:${MEDIA_ASSET_EXTENSIONS.join("|")})$`, "i");

/* -------------------------------------------------------------------------- */
/*  LocalizedText — both `ru` and `en`, both non-empty (Tech Arch §13)         */
/* -------------------------------------------------------------------------- */

export const localizedTextSchema = z
  .object({
    ru: z
      .string()
      .trim()
      .min(1, "localized text: `ru` translation is required and must be non-empty"),
    en: z
      .string()
      .trim()
      .min(1, "localized text: `en` translation is required and must be non-empty"),
  })
  .strict();

export type LocalizedText = z.infer<typeof localizedTextSchema>;

/* -------------------------------------------------------------------------- */
/*  MediaReference                                                             */
/* -------------------------------------------------------------------------- */

export const mediaReferenceSchema = z
  .object({
    /** Stable media id (`media.zane-portrait`) or repo-relative path (`portraits/zane`). */
    id: z
      .string()
      .trim()
      .min(1, "media reference `id` is required")
      .refine(
        (value) => !MEDIA_FILENAME_PATTERN.test(value),
        "media reference must be a stable media id or path, not an inline filename with an extension",
      ),
    /** Optional hint for how a system may present the asset. */
    role: z
      .enum(["portrait", "hero", "gallery", "diagram", "living-preview", "thumbnail"])
      .optional(),
    /** Localized alt text — accessibility. */
    alt: localizedTextSchema.optional(),
    /** Localized caption. */
    caption: localizedTextSchema.optional(),
  })
  // `.strict()` like every other object here: a misspelled key (`captoin`, `src`)
  // is a mistake we want the build to name, not silently drop. #22 / a later
  // Story adds fields here first if the media pipeline needs them.
  .strict();

export type MediaReference = z.infer<typeof mediaReferenceSchema>;

/* -------------------------------------------------------------------------- */
/*  Relation (Technical Architecture §10)                                      */
/* -------------------------------------------------------------------------- */

export const relationSchema = z
  .object({
    /** Verb-like relation label, e.g. `served_at`, `participated_in`. */
    type: z.string().trim().min(1, "relation `type` is required"),
    /** `id` of the target entity, e.g. `mission.exodus`. Resolution is #18's job. */
    target: z.string().trim().min(1, "relation `target` is required"),
  })
  .strict();

export type Relation = z.infer<typeof relationSchema>;

/* -------------------------------------------------------------------------- */
/*  UniverseEntity base (Implementation Plan §4 / Technical Architecture §9)    */
/* -------------------------------------------------------------------------- */

/**
 * The base object, without the `<type>.<slug>` cross-field check. `.strict()` —
 * an unknown key is a typo and must fail the build with the offending field
 * named. Per-type schemas narrow `type` to a literal; see {@link entitySchemaFor}.
 */
const universeEntityObject = z
  .object({
    /** `<type>.<slug>` — e.g. `person.zane`. */
    id: z
      .string()
      .min(1, "entity `id` is required")
      .regex(ID_PATTERN, 'entity `id` must look like "<type>.<slug>", e.g. "person.zane"'),
    /** One of the 11 entity types. */
    type: entityTypeSchema,
    /** Lowercase, URL-safe. Becomes the route segment, e.g. `/person/zane`. */
    slug: z
      .string()
      .min(1, "entity `slug` is required")
      .regex(
        SLUG_PATTERN,
        "entity `slug` must be lowercase alphanumerics separated by single hyphens",
      ),
    /** Display name — both locales required. */
    name: localizedTextSchema,
    /** One-line summary — both locales required when present. */
    shortDescription: localizedTextSchema.optional(),
    /** Full description — both locales required when present. */
    description: localizedTextSchema.optional(),
    /** Media referenced by stable id / path, never inline filenames. */
    media: z.array(mediaReferenceSchema).optional(),
    /** Typed edges to other entities. Target resolution is #18. */
    relations: z.array(relationSchema).optional(),
    /** Access metadata — presentation only for the MVP. */
    clearance: clearanceSchema.optional(),
    /** Free-form classification / search tags. */
    tags: z.array(z.string().trim().min(1, "tags must be non-empty strings")).optional(),
  })
  .strict();

/** Enforces the `id === "<type>.<slug>"` convention as a cross-field rule. */
function assertIdConvention(
  entity: { id: string; type: string; slug: string },
  ctx: z.RefinementCtx,
): void {
  const expected = `${entity.type}.${entity.slug}`;
  if (entity.id !== expected) {
    ctx.addIssue({
      code: "custom",
      path: ["id"],
      message: `entity \`id\` must equal "<type>.<slug>" — expected "${expected}", got "${entity.id}"`,
    });
  }
}

/**
 * The generic `UniverseEntity` schema — `type` is the open enum. Use this for
 * tooling that validates an entity of unknown type; use {@link entitySchemaFor}
 * for a specific collection.
 */
export const universeEntitySchema = universeEntityObject.superRefine(assertIdConvention);

export type UniverseEntity = z.infer<typeof universeEntitySchema>;

/**
 * Per-type object schema: the base object with `type` pinned to a literal. No
 * `.superRefine` wrapper, so it is still a `ZodObject` (extendable, and cleanly
 * convertible via `z.toJSONSchema`).
 */
export function entityObjectFor(type: EntityType) {
  return universeEntityObject.extend({ type: z.literal(type) });
}

/**
 * Per-type schema used by each Astro content collection: {@link entityObjectFor}
 * plus the `<type>.<slug>` id check. A `person` file declaring `"type": "vessel"`
 * fails `astro build`.
 */
export function entitySchemaFor(type: EntityType) {
  return entityObjectFor(type).superRefine(assertIdConvention);
}

type EntityObjectSchema = ReturnType<typeof entityObjectFor>;
type EntitySchema = ReturnType<typeof entitySchemaFor>;

/** Every per-type schema (with the id check), keyed by entity type. */
export const entitySchemas = Object.fromEntries(
  ENTITY_TYPES.map((type) => [type, entitySchemaFor(type)]),
) as Record<EntityType, EntitySchema>;

/**
 * Plain per-type object schemas (no `.superRefine`), keyed by type — used by the
 * JSON Schema generator, since `z.toJSONSchema` cannot represent the cross-field
 * refinement anyway (the `id` `pattern` covers the representable part).
 */
export const entityObjectSchemas = Object.fromEntries(
  ENTITY_TYPES.map((type) => [type, entityObjectFor(type)]),
) as Record<EntityType, EntityObjectSchema>;

export const universeEntityObjectSchema = universeEntityObject;
