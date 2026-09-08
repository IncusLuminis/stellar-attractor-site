/**
 * Guards the shipped fixture entities (Story #16 — replaced/expanded by #22) and
 * the generated JSON Schema mirrors under `schemas/`.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { ENTITY_DIRS, ENTITY_TYPES, entitySchemaFor } from "../src/core/entities/schemas.ts";
import { buildReadme, buildSchemaFiles, serialize } from "../scripts/generate-schemas.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("data/ fixtures validate against their per-type schema", () => {
  for (const type of ENTITY_TYPES) {
    const dir = join(repoRoot, "data", ENTITY_DIRS[type]);
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      it(`${ENTITY_DIRS[type]}/${file}`, () => {
        const data = JSON.parse(readFileSync(join(dir, file), "utf8"));
        const result = entitySchemaFor(type).safeParse(data);
        expect(result.success, JSON.stringify(result.error?.issues, null, 2)).toBe(true);
      });
    }
  }

  it("ships at least one fixture", () => {
    const total = ENTITY_TYPES.reduce(
      (n, type) =>
        n + readdirSync(join(repoRoot, "data", ENTITY_DIRS[type])).filter((f) => f.endsWith(".json")).length,
      0,
    );
    expect(total).toBeGreaterThan(0);
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
