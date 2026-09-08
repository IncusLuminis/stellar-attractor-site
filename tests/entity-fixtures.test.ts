/**
 * Guards the shape-example fixture entities (`tests/fixtures/`), any real seed
 * content that lands under `data/` (#22), and the generated JSON Schema mirrors.
 *
 * Fixtures live under `tests/fixtures/` — NOT `data/` — so they never collide
 * with #22's Content_Master seed authoring (`zane` and `base32` are both in the
 * Phase 1 seed set). The content collections build fine with empty `data/`
 * directories.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  ENTITY_DIRS,
  ENTITY_TYPES,
  type EntityType,
  entitySchemaFor,
} from "../src/core/entities/schemas.ts";
import { buildReadme, buildSchemaFiles, serialize } from "../scripts/generate-schemas.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function validateEntityFile(path: string): void {
  const data = JSON.parse(readFileSync(path, "utf8")) as { type?: string };
  expect(ENTITY_TYPES, `${path}: "type" must be a known entity type`).toContain(data.type);
  const result = entitySchemaFor(data.type as EntityType).safeParse(data);
  expect(result.success, JSON.stringify(result.error?.issues, null, 2)).toBe(true);
}

describe("tests/fixtures/ shape examples validate", () => {
  const fixturesDir = join(repoRoot, "tests", "fixtures");
  const files = readdirSync(fixturesDir).filter((f) => f.endsWith(".json"));

  it("ships at least one fixture", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(file, () => validateEntityFile(join(fixturesDir, file)));
  }
});

describe("data/ seed content (if any) validates against its per-type schema", () => {
  it("every JSON file under data/<type>/ matches that type's schema", () => {
    for (const type of ENTITY_TYPES) {
      const dir = join(repoRoot, "data", ENTITY_DIRS[type]);
      for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
        const data = JSON.parse(readFileSync(join(dir, file), "utf8"));
        const result = entitySchemaFor(type).safeParse(data);
        expect(
          result.success,
          `${ENTITY_DIRS[type]}/${file}: ${JSON.stringify(result.error?.issues, null, 2)}`,
        ).toBe(true);
      }
    }
  });
});

describe("schemas/ JSON Schema mirrors are not stale", () => {
  const schemasDir = join(repoRoot, "schemas");

  it("every generated file on disk matches the generator output", () => {
    const expected = buildSchemaFiles();
    for (const [name, schema] of Object.entries(expected)) {
      const onDisk = readFileSync(join(schemasDir, `${name}.schema.json`), "utf8");
      expect(onDisk, `schemas/${name}.schema.json is stale — run \`npm run schemas:generate\``).toBe(
        serialize(schema),
      );
    }
  });

  it("has no orphan schema files", () => {
    const generated = new Set(Object.keys(buildSchemaFiles()).map((n) => `${n}.schema.json`));
    const onDisk = readdirSync(schemasDir).filter((f) => f.endsWith(".schema.json"));
    expect(onDisk.filter((f) => !generated.has(f))).toEqual([]);
  });

  it("README is not stale", () => {
    expect(readFileSync(join(schemasDir, "README.md"), "utf8")).toBe(buildReadme());
  });
});
