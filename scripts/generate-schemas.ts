/**
 * JSON Schema mirror generator (Implementation Plan §3).
 *
 * Emits `schemas/*.schema.json` from the Zod schemas in
 * `src/core/entities/schemas.ts` for external tooling and the CI validator (#18).
 * The Zod schemas remain the single source of truth; these files are generated
 * artefacts and are drift-checked (`npm run schemas:check`, and a Vitest test).
 *
 *   npm run schemas:generate   # (re)write schemas/*.schema.json
 *   npm run schemas:check      # exit non-zero if the files are stale
 *
 * `z.toJSONSchema` drops Zod's `.trim()` transforms and `.refine()` predicates,
 * so the raw output under-constrains string fields. `tightenJsonSchema()` below
 * re-adds every constraint JSON Schema *can* express (a non-whitespace `pattern`
 * for the trimmed non-empty fields; the asset-extension negative lookahead for
 * media ids). What still cannot be represented is listed in `schemas/README.md`
 * under "Constraints enforced by Zod / astro build but not by these mirrors".
 */

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { argv } from "node:process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import {
  CLEARANCE_LEVELS,
  ENTITY_DIRS,
  ENTITY_TYPES,
  MEDIA_ASSET_EXTENSIONS,
  clearanceSchema,
  entityObjectSchemas,
  localizedTextSchema,
  mediaReferenceSchema,
  relationSchema,
  universeEntityObjectSchema,
} from "../src/core/entities/schemas.ts";

const SCHEMAS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "schemas");

type JsonSchema = Record<string, unknown>;

/* -------------------------------------------------------------------------- */
/*  Faithful-as-JSON-Schema-allows tightening                                  */
/* -------------------------------------------------------------------------- */

/** "contains a non-whitespace character" — the representable half of `.trim().min(1)`. */
const NON_BLANK_PATTERN = "\\S";

/** Case-insensitive character class for a literal ASCII letter, else the char verbatim. */
function caseInsensitive(literal: string): string {
  return [...literal]
    .map((ch) => (/[a-z]/i.test(ch) ? `[${ch.toLowerCase()}${ch.toUpperCase()}]` : ch))
    .join("");
}

/**
 * ECMA-262 pattern mirroring `mediaReferenceSchema.id`: non-blank, no leading /
 * trailing whitespace, and not ending in a known asset extension (case-insensitive).
 */
const MEDIA_ID_PATTERN = `^(?!.*\\.(?:${MEDIA_ASSET_EXTENSIONS.map(caseInsensitive).join(
  "|",
)})$)\\S(?:.*\\S)?$`;

/**
 * True when we are visiting the `id` string of a MediaReference — i.e. `key` is
 * `"id"` and `parent` is a `properties` map that also holds `role` and `caption`
 * (the combination is unique to MediaReference, at the top level of
 * `media-reference.schema.json` and nested under `media.items` in the entity schemas).
 */
function isMediaIdNode(key: string | undefined, parent: JsonSchema | undefined): boolean {
  return key === "id" && !!parent && "role" in parent && "caption" in parent;
}

/**
 * Walk the generated schema and re-add representable constraints `z.toJSONSchema`
 * dropped. Mutates in place and returns it.
 */
function tightenJsonSchema(node: unknown, key?: string, parent?: JsonSchema): unknown {
  if (Array.isArray(node)) {
    for (const item of node) tightenJsonSchema(item, undefined, undefined);
    return node;
  }
  if (!node || typeof node !== "object") return node;

  const schema = node as JsonSchema;
  if (schema.type === "string") {
    if (isMediaIdNode(key, parent)) {
      schema.pattern = MEDIA_ID_PATTERN;
    } else if (
      typeof schema.minLength === "number" &&
      schema.minLength >= 1 &&
      typeof schema.pattern !== "string"
    ) {
      // LocalizedText `ru`/`en`, relation `type`/`target`, `tags[]` — trimmed, non-empty.
      schema.pattern = NON_BLANK_PATTERN;
    }
  }

  for (const [childKey, childValue] of Object.entries(schema)) {
    tightenJsonSchema(childValue, childKey, schema);
  }
  return node;
}

function toJsonSchema(schema: z.ZodType, id: string, title: string): JsonSchema {
  const out = z.toJSONSchema(schema, { target: "draft-2020-12" }) as JsonSchema;
  tightenJsonSchema(out);
  return { $id: `${id}.schema.json`, title, ...out };
}

/** Build every schema file's content, keyed by filename. Pure — no I/O. */
export function buildSchemaFiles(): Record<string, JsonSchema> {
  const files: Record<string, JsonSchema> = {
    "localized-text": toJsonSchema(localizedTextSchema, "localized-text", "LocalizedText"),
    "media-reference": toJsonSchema(mediaReferenceSchema, "media-reference", "MediaReference"),
    relation: toJsonSchema(relationSchema, "relation", "Relation"),
    clearance: toJsonSchema(clearanceSchema, "clearance", "Clearance"),
    "universe-entity": toJsonSchema(
      universeEntityObjectSchema,
      "universe-entity",
      "UniverseEntity (any type)",
    ),
  };

  for (const type of ENTITY_TYPES) {
    files[type] = toJsonSchema(entityObjectSchemas[type], type, `UniverseEntity — ${type}`);
  }

  return files;
}

export function serialize(schema: JsonSchema): string {
  return `${JSON.stringify(schema, null, 2)}\n`;
}

/** README documenting each entity type's fields (AC: "short doc comment or schemas/README"). */
export function buildReadme(): string {
  const typeList = ENTITY_TYPES.map((t) => `\`${t}\` → \`data/${ENTITY_DIRS[t]}/\``).join(", ");
  return `# schemas/

JSON Schema (draft 2020-12) mirrors of the Zod entity schemas in
\`src/core/entities/schemas.ts\`, emitted for external tooling and the CI
validator (#18). Implementation Plan §3.

**Generated — do not edit by hand.** Run \`npm run schemas:generate\` after
changing the Zod schemas; \`npm run schemas:check\` (and a Vitest test) fail on
drift.

## Files

| File | Mirrors |
|---|---|
| \`localized-text.schema.json\` | \`LocalizedText\` |
| \`media-reference.schema.json\` | \`MediaReference\` |
| \`relation.schema.json\` | \`Relation\` |
| \`clearance.schema.json\` | \`Clearance\` |
| \`universe-entity.schema.json\` | \`UniverseEntity\` with \`type\` as the open enum |
| \`<type>.schema.json\` | \`UniverseEntity\` with \`type\` pinned to that literal, one per entity type |

## The \`UniverseEntity\` shape (Implementation Plan §4; Technical Architecture §9–10, §13, §27)

| Field | Type | Required | Notes |
|---|---|---|---|
| \`id\` | string | yes | \`<type>.<slug>\`, e.g. \`person.zane\`. Mirror enforces \`pattern: ^[a-z0-9-]+\\.[a-z0-9-]+$\` only — see caveat 1 below. |
| \`type\` | enum | yes | One of: ${ENTITY_TYPES.map((t) => `\`${t}\``).join(", ")}. |
| \`slug\` | string | yes | Lowercase, URL-safe. \`pattern: ^[a-z0-9]+(?:-[a-z0-9]+)*$\`. |
| \`name\` | LocalizedText | yes | \`{ ru, en }\`, both present and non-blank. |
| \`shortDescription\` | LocalizedText | no | Both locales present and non-blank when the field is present. |
| \`description\` | LocalizedText | no | Both locales present and non-blank when the field is present. |
| \`media\` | MediaReference[] | no | \`{ id, role?, alt?, caption? }\`. \`id\` is a stable media id / path; the mirror \`pattern\` rejects a blank value or one ending in a known asset extension (case-insensitive): ${MEDIA_ASSET_EXTENSIONS.map((e) => `\`.${e}\``).join(", ")}. |
| \`relations\` | Relation[] | no | \`{ type, target }\`, both non-blank. Cross-file target resolution is #18, not this schema. |
| \`clearance\` | enum | no | One of: ${CLEARANCE_LEVELS.map((c) => `\`${c}\``).join(", ")}. Presentation only for the MVP. |
| \`tags\` | string[] | no | Non-blank strings. |

Unknown properties are rejected at every object level (\`additionalProperties: false\`).

"Non-blank" in the mirrors is \`minLength: 1\` plus \`pattern: "\\\\S"\` (must contain a
non-whitespace character) — the closest JSON Schema can get to Zod's
\`.trim().min(1)\`.

## Constraints enforced by Zod / \`astro build\` but not (fully) by these mirrors

JSON Schema cannot express these; a tool validating against the mirrors alone
will be more permissive than \`astro build\`. Use the Zod schema directly where
the exact rule matters.

1. **\`id\` identity.** The mirror \`pattern\` only checks \`id\` is two
   dot-separated \`[a-z0-9-]\` segments. Zod additionally requires
   \`id === \`\${type}.\${slug}\`\` exactly (a cross-field \`superRefine\`).
2. **Whitespace trimming.** Zod \`.trim()\`s every \`LocalizedText\` field,
   \`relation.type\`/\`target\`, \`media[].id\` and \`tags[]\` *before* the
   non-empty check and stores the trimmed value. The mirrors only assert the
   value is non-blank (\`pattern: "\\\\S"\`); leading/trailing whitespace inside an
   otherwise non-blank value passes the mirror (the media-\`id\` \`pattern\` is the
   exception — it also forbids leading/trailing whitespace).

## Collections

One Astro content collection per entity type, backed by JSON under \`data/\`:
${typeList}.
`;
}

function generate(): void {
  mkdirSync(SCHEMAS_DIR, { recursive: true });
  // Clear previously generated schema files (keep README, regenerated below).
  for (const f of readdirSync(SCHEMAS_DIR)) {
    if (f.endsWith(".schema.json")) rmSync(join(SCHEMAS_DIR, f));
  }
  const files = buildSchemaFiles();
  for (const [name, schema] of Object.entries(files)) {
    writeFileSync(join(SCHEMAS_DIR, `${name}.schema.json`), serialize(schema));
  }
  writeFileSync(join(SCHEMAS_DIR, "README.md"), buildReadme());
  console.log(
    `[generate-schemas] wrote ${Object.keys(files).length} schema files + README to schemas/`,
  );
}

function check(): void {
  const expected = buildSchemaFiles();
  const drift: string[] = [];
  for (const [name, schema] of Object.entries(expected)) {
    const path = join(SCHEMAS_DIR, `${name}.schema.json`);
    let actual: string;
    try {
      actual = readFileSync(path, "utf8");
    } catch {
      drift.push(`missing: schemas/${name}.schema.json`);
      continue;
    }
    if (actual !== serialize(schema)) drift.push(`stale: schemas/${name}.schema.json`);
  }
  const generatedNames = new Set(Object.keys(expected).map((n) => `${n}.schema.json`));
  for (const f of readdirSync(SCHEMAS_DIR)) {
    if (f.endsWith(".schema.json") && !generatedNames.has(f)) drift.push(`orphan: schemas/${f}`);
  }
  const readmePath = join(SCHEMAS_DIR, "README.md");
  try {
    if (readFileSync(readmePath, "utf8") !== buildReadme()) drift.push("stale: schemas/README.md");
  } catch {
    drift.push("missing: schemas/README.md");
  }

  if (drift.length > 0) {
    console.error("[generate-schemas] JSON Schema mirrors are out of date:");
    for (const d of drift) console.error(`  - ${d}`);
    console.error("Run `npm run schemas:generate` and commit the result.");
    process.exit(1);
  }
  console.log("[generate-schemas] schemas/ is up to date.");
}

if (import.meta.main) {
  if (argv.includes("--check")) check();
  else generate();
}

export { SCHEMAS_DIR };
