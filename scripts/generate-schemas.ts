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
 * NOTE: `z.toJSONSchema` cannot express the cross-field `id === "<type>.<slug>"`
 * refinement; the representable part (the `id` pattern) is included. Consumers
 * that need the exact rule should use the Zod schema directly.
 */

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { argv } from "node:process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { z } from "zod";

import {
  CLEARANCE_LEVELS,
  ENTITY_DIRS,
  ENTITY_TYPES,
  clearanceSchema,
  entityObjectSchemas,
  localizedTextSchema,
  mediaReferenceSchema,
  relationSchema,
  universeEntityObjectSchema,
} from "../src/core/entities/schemas.ts";

const SCHEMAS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "schemas");

type JsonSchema = Record<string, unknown>;

function toJsonSchema(schema: z.ZodType, id: string, title: string): JsonSchema {
  const out = z.toJSONSchema(schema, { target: "draft-2020-12" }) as JsonSchema;
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

function serialize(schema: JsonSchema): string {
  return `${JSON.stringify(schema, null, 2)}\n`;
}

/** README documenting each entity type's fields (AC: "short doc comment or schemas/README"). */
function buildReadme(): string {
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
| \`id\` | string | yes | \`<type>.<slug>\`, e.g. \`person.zane\`. Pattern \`^[a-z0-9-]+\\.[a-z0-9-]+$\`; the exact \`id === type + "." + slug\` rule is a Zod refinement (not in JSON Schema). |
| \`type\` | enum | yes | One of: ${ENTITY_TYPES.map((t) => `\`${t}\``).join(", ")}. |
| \`slug\` | string | yes | Lowercase, URL-safe. Pattern \`^[a-z0-9]+(?:-[a-z0-9]+)*$\`. |
| \`name\` | LocalizedText | yes | \`{ ru, en }\`, both non-empty. |
| \`shortDescription\` | LocalizedText | no | Both locales required when present. |
| \`description\` | LocalizedText | no | Both locales required when present. |
| \`media\` | MediaReference[] | no | \`{ id, role?, alt?, caption? }\`. \`id\` is a stable media id / path — an inline filename with an asset extension is rejected. |
| \`relations\` | Relation[] | no | \`{ type, target }\`, both non-empty. Target resolution across files is #18, not this schema. |
| \`clearance\` | enum | no | One of: ${CLEARANCE_LEVELS.map((c) => `\`${c}\``).join(", ")}. Presentation only for the MVP. |
| \`tags\` | string[] | no | Non-empty strings. |

Unknown top-level keys are rejected (\`additionalProperties: false\`).

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

const executedDirectly =
  argv[1] !== undefined && import.meta.url === pathToFileURL(argv[1]).href;

if (executedDirectly) {
  if (argv.includes("--check")) check();
  else generate();
}

export { SCHEMAS_DIR, buildReadme, serialize };
