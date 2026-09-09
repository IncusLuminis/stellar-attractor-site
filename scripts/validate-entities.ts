/**
 * Entity validation — schema + cross-file referential integrity over the
 * universe database (Implementation Plan §4, §10; Technical Architecture §12).
 *
 * Runs as a pre-step of `npm run build` (the `prebuild` hook) and as the
 * `npm run validate:entities` standalone check, and is the core of the GitHub
 * Actions gate. Non-zero exit on any violation; a human-readable report naming
 * the file, the entity id, the field, and the problem for each one.
 *
 * WHAT IS CHECKED (Technical Architecture §12; Implementation Plan §4):
 *
 *   Per file / per entity
 *   ─────────────────────
 *   - the file is valid JSON and a JSON object                      [invalid-json / not-an-object]
 *   - `type` is one of the 11 known entity types                    [unknown-type]
 *   - the file sits in the collection dir that matches its `type`   [wrong-collection-dir]
 *   - `id` is present (a non-blank string)                          [missing-id]
 *   - the entity matches the #16 Zod schema for its collection —    [schema:<zod-path>]
 *     this is where a missing/blank `ru` or `en` translation, a
 *     malformed slug, a bad `clearance`, an unknown key, a relation
 *     with no `type`/`target`, and an inline-filename media id are
 *     caught, each reported at field level.
 *
 *   Cross-file (the checks a single-file schema cannot do — #16 left these here)
 *   ──────────────────────────────────────────────────────────────────────────
 *   - no two entities share an `id`                                 [duplicate-id]
 *   - no two entities of the same type share a `slug`               [duplicate-slug]
 *   - every `relation.target` resolves to an entity that exists     [dangling-relation]
 *   - every `media[].id` resolves (see scripts/check-media-refs.ts)  [unresolved-media-ref]
 *
 * Cross-file checks run only on entities that passed their schema (well-shaped
 * data), so their reports are never noise on top of a shape failure. `id` /
 * `slug` uniqueness is checked from the raw file so a shape-broken duplicate is
 * still caught.
 */

import { type Dirent, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { argv, exit } from "node:process";
import { fileURLToPath } from "node:url";

import {
  ENTITY_DIRS,
  ENTITY_TYPES,
  type EntityType,
  entitySchemaFor,
} from "../src/core/entities/schemas.ts";
import { buildAssetIndex, resolveMediaRef } from "./check-media-refs.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface Violation {
  /** repo-relative path to the offending file. */
  file: string;
  /** entity id, or `null` when the file has no usable id. */
  entityId: string | null;
  /** dotted field path, or `null` for a whole-file problem. */
  field: string | null;
  /** stable machine code, for tests. */
  code: string;
  /** human-readable explanation. */
  message: string;
}

export interface ValidateOptions {
  /** dir holding the per-type collection dirs (`people/`, `vessels/`, …). Default: `<repo>/data`. */
  dataDir?: string;
  /** public media dir for asset-path resolution. Default: `<repo>/public/media`. */
  mediaDir?: string;
}

export interface ValidateResult {
  violations: Violation[];
  fileCount: number;
  entityCount: number;
  mediaRefCount: number;
  formatOnlyMediaRefCount: number;
}

interface LoadedEntity {
  /** repo-relative path. */
  file: string;
  /** the collection dir's type (what the schema is picked from). */
  dirType: EntityType;
  raw: Record<string, unknown>;
  id: string | null;
  slug: string | null;
  /** `raw.type` verbatim. */
  declaredType: unknown;
  /** typed entity when the schema passed, else `null`. */
  parsed: Record<string, unknown> | null;
}

/* -------------------------------------------------------------------------- */
/*  Filesystem                                                                 */
/* -------------------------------------------------------------------------- */

/** Absolute paths of every `*.json` under `dir` (recursive). Missing dir → `[]`. */
function listJsonFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (abs: string): void => {
    let entries: Dirent[];
    try {
      entries = readdirSync(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const child = join(abs, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile() && entry.name.endsWith(".json")) out.push(child);
    }
  };
  walk(dir);
  return out.sort();
}

/* -------------------------------------------------------------------------- */
/*  Core                                                                       */
/* -------------------------------------------------------------------------- */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonBlankString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function validateEntities(options: ValidateOptions = {}): ValidateResult {
  const dataDir = options.dataDir ?? join(REPO_ROOT, "data");
  const mediaDir = options.mediaDir ?? join(REPO_ROOT, "public", "media");

  const violations: Violation[] = [];
  const loaded: LoadedEntity[] = [];
  let fileCount = 0;

  const rel = (abs: string): string => relative(REPO_ROOT, abs) || abs;

  /* ---- Load + per-file / schema checks ---------------------------------- */

  for (const type of ENTITY_TYPES) {
    const collectionDir = join(dataDir, ENTITY_DIRS[type]);
    for (const abs of listJsonFiles(collectionDir)) {
      fileCount += 1;
      const file = rel(abs);

      let raw: unknown;
      try {
        raw = JSON.parse(readFileSync(abs, "utf8"));
      } catch (error) {
        violations.push({
          file,
          entityId: null,
          field: null,
          code: "invalid-json",
          message: `file is not valid JSON: ${(error as Error).message}`,
        });
        continue;
      }

      if (!isPlainObject(raw)) {
        violations.push({
          file,
          entityId: null,
          field: null,
          code: "not-an-object",
          message: "entity file must contain a single JSON object",
        });
        continue;
      }

      const id = nonBlankString(raw.id);
      const slug = nonBlankString(raw.slug);
      const declaredType = raw.type;
      const knownType =
        typeof declaredType === "string" &&
        (ENTITY_TYPES as readonly string[]).includes(declaredType);

      if (!knownType) {
        violations.push({
          file,
          entityId: id,
          field: "type",
          code: "unknown-type",
          message:
            `\`type\` is ${JSON.stringify(declaredType)} — must be one of: ` +
            ENTITY_TYPES.join(", "),
        });
      } else if (declaredType !== type) {
        violations.push({
          file,
          entityId: id,
          field: "type",
          code: "wrong-collection-dir",
          message:
            `file is in \`data/${ENTITY_DIRS[type]}/\` (type "${type}") but declares ` +
            `\`type\`: "${declaredType as string}" — move it to \`data/${
              ENTITY_DIRS[declaredType as EntityType]
            }/\``,
        });
      }

      if (id === null) {
        violations.push({
          file,
          entityId: null,
          field: "id",
          code: "missing-id",
          message: "entity `id` is required and must be a non-blank string",
        });
      }

      // Schema validation against the collection dir's type (what `astro build` does).
      const parse = entitySchemaFor(type).safeParse(raw);
      if (!parse.success) {
        for (const issue of parse.error.issues) {
          const field = issue.path.map((seg) => String(seg)).join(".") || null;
          // Suppress the raw `type` mismatch — reported above with a clearer message.
          if (field === "type" && (!knownType || declaredType !== type)) continue;
          // Make a missing `ru`/`en` translation read at file level (Tech Arch §12).
          const locale = field && /\.(ru|en)$/.exec(field)?.[1];
          const message =
            locale && issue.code === "invalid_type"
              ? `required "${locale}" translation is missing at \`${field}\``
              : issue.message;
          violations.push({
            file,
            entityId: id,
            field,
            code: locale && issue.code === "invalid_type" ? "missing-translation" : `schema:${issue.code}`,
            message,
          });
        }
      }

      loaded.push({
        file,
        dirType: type,
        raw,
        id,
        slug,
        declaredType,
        parsed: parse.success ? (parse.data as Record<string, unknown>) : null,
      });
    }
  }

  /* ---- Cross-file: duplicate id / slug --------------------------------- */

  const groupInto = (
    map: Map<string, LoadedEntity[]>,
    key: string,
    entity: LoadedEntity,
  ): void => {
    const bucket = map.get(key);
    if (bucket) bucket.push(entity);
    else map.set(key, [entity]);
  };

  const byId = new Map<string, LoadedEntity[]>();
  const bySlug = new Map<string, LoadedEntity[]>();
  for (const entity of loaded) {
    if (entity.id) groupInto(byId, entity.id, entity);
    if (entity.slug) groupInto(bySlug, `${entity.dirType}/${entity.slug}`, entity);
  }

  for (const [id, entities] of byId) {
    if (entities.length < 2) continue;
    const files = entities.map((e) => e.file);
    for (const entity of entities) {
      violations.push({
        file: entity.file,
        entityId: id,
        field: "id",
        code: "duplicate-id",
        message: `\`id\` "${id}" is declared by ${entities.length} files: ${files.join(", ")}`,
      });
    }
  }

  for (const [key, entities] of bySlug) {
    if (entities.length < 2) continue;
    const [type, slug] = key.split("/");
    const files = entities.map((e) => e.file);
    for (const entity of entities) {
      violations.push({
        file: entity.file,
        entityId: entity.id,
        field: "slug",
        code: "duplicate-slug",
        message:
          `\`slug\` "${slug}" is used by ${entities.length} "${type}" entities: ` +
          files.join(", "),
      });
    }
  }

  /* ---- Cross-file: relation targets ----------------------------------- */

  const entityIds = new Set([...byId.keys()]);

  for (const entity of loaded) {
    if (!entity.parsed) continue;
    const relations = entity.parsed.relations;
    if (!Array.isArray(relations)) continue;
    relations.forEach((relation, index) => {
      const target = nonBlankString((relation as { target?: unknown }).target);
      if (target && !entityIds.has(target)) {
        violations.push({
          file: entity.file,
          entityId: entity.id,
          field: `relations[${index}].target`,
          code: "dangling-relation",
          message: `relation target "${target}" does not resolve to any known entity`,
        });
      }
    });
  }

  /* ---- Cross-file: media references ---------------------------------- */

  const mediaEntityIds = new Set(
    loaded.filter((e) => e.dirType === "media" && e.id).map((e) => e.id as string),
  );
  const mediaCtx = {
    mediaEntityIds,
    assetIndex: buildAssetIndex(mediaDir),
    mediaDirLabel: relative(REPO_ROOT, mediaDir) || mediaDir,
  };

  let mediaRefCount = 0;
  let formatOnlyMediaRefCount = 0;
  for (const entity of loaded) {
    if (!entity.parsed) continue;
    const media = entity.parsed.media;
    if (!Array.isArray(media)) continue;
    media.forEach((ref, index) => {
      const refId = nonBlankString((ref as { id?: unknown }).id);
      if (!refId) return;
      mediaRefCount += 1;
      const result = resolveMediaRef(refId, mediaCtx);
      if (!result.ok) {
        violations.push({
          file: entity.file,
          entityId: entity.id,
          field: `media[${index}].id`,
          code: "unresolved-media-ref",
          message: result.reason ?? `media reference "${refId}" does not resolve`,
        });
      } else if (result.formatOnly) {
        formatOnlyMediaRefCount += 1;
      }
    });
  }

  // Deterministic order: by file, then field, then code.
  violations.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      (a.field ?? "").localeCompare(b.field ?? "") ||
      a.code.localeCompare(b.code),
  );

  return {
    violations,
    fileCount,
    entityCount: loaded.length,
    mediaRefCount,
    formatOnlyMediaRefCount,
  };
}

/* -------------------------------------------------------------------------- */
/*  Reporting                                                                  */
/* -------------------------------------------------------------------------- */

export function formatReport(result: ValidateResult): string {
  const { violations } = result;
  if (violations.length === 0) {
    return `[validate-entities] OK — ${result.entityCount} entities in ${result.fileCount} files, 0 violations.`;
  }

  const lines: string[] = [
    `[validate-entities] FAIL — ${violations.length} violation(s) across ${result.entityCount} entities in ${result.fileCount} files:`,
    "",
  ];

  let currentFile = "";
  for (const v of violations) {
    if (v.file !== currentFile) {
      currentFile = v.file;
      lines.push(`  ${v.file}`);
    }
    const id = v.entityId ?? "(no id)";
    const field = v.field ? ` ${v.field}` : "";
    lines.push(`    ${id}${field} — ${v.message}  [${v.code}]`);
  }

  return lines.join("\n");
}

/* -------------------------------------------------------------------------- */
/*  CLI                                                                        */
/* -------------------------------------------------------------------------- */

function argFor(flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  return idx >= 0 ? argv[idx + 1] : undefined;
}

if (import.meta.main) {
  // `--media-only` backs `npm run check:media-refs` (Implementation Plan §3):
  // same crawl, report narrowed to media-reference resolution.
  const mediaOnly = argv.includes("--media-only");
  const full = validateEntities({
    dataDir: argFor("--data"),
    mediaDir: argFor("--media"),
  });
  const result = mediaOnly
    ? {
        ...full,
        violations: full.violations.filter((v) => v.code === "unresolved-media-ref"),
      }
    : full;

  if (result.violations.length > 0) {
    console.error(formatReport(result));
    exit(1);
  }

  console.log(formatReport(result));
  if (result.formatOnlyMediaRefCount > 0) {
    console.log(
      `[validate-entities] NOTE: ${result.formatOnlyMediaRefCount} media reference(s) ` +
        "validated by format only — real asset resolution lands with the media pipeline " +
        "(TODO in scripts/check-media-refs.ts).",
    );
  }
}
