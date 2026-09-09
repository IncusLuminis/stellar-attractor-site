// @vitest-environment node
/**
 * `getStaticPaths` bodies (#19 AC 1) — `entityStaticPaths` produces the expected
 * `{ params, props }` set, driven by the resolver. Exercised over the shape
 * fixtures in `tests/fixtures/` (same source the #17 resolver tests use).
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, it, expect } from "vitest";

import {
  type EntityType,
  type UniverseEntity,
  entitySchemaFor,
} from "../src/core/entities/schemas";
import { arrayEntitySource, createEntityResolver } from "../src/core/entities/resolver";
import { entityStaticPaths } from "../src/core/navigation";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

function loadFixtures(): UniverseEntity[] {
  return readdirSync(fixturesDir)
    .filter((f) => f.endsWith(".json"))
    .map((file) => {
      const raw = JSON.parse(readFileSync(join(fixturesDir, file), "utf8")) as { type: EntityType };
      return entitySchemaFor(raw.type).parse(raw) as UniverseEntity;
    });
}

const resolver = createEntityResolver(arrayEntitySource(loadFixtures()));

describe("entityStaticPaths", () => {
  it("emits one path per entity of the requested type, with the slug as the param", async () => {
    const paths = await entityStaticPaths(resolver, "person");
    expect(paths).toEqual([
      { params: { slug: "zane" }, props: { entity: expect.objectContaining({ id: "person.zane" }) } },
    ]);
  });

  it("passes the full entity through as a prop (no second lookup in the route)", async () => {
    const [path] = await entityStaticPaths(resolver, "mission");
    expect(path.props.entity.id).toBe("mission.exodus");
    expect(path.props.entity.relations?.length).toBeGreaterThan(0);
  });

  it("returns [] for a type with no entities", async () => {
    expect(await entityStaticPaths(resolver, "science")).toEqual([]);
  });

  it("every param slug round-trips through routeToSystem", async () => {
    const { routeToSystem } = await import("../src/core/navigation");
    for (const type of ["person", "station", "mission", "document"] as const) {
      for (const { params } of await entityStaticPaths(resolver, type)) {
        expect(routeToSystem(`/${type}/${params.slug}`)).toMatchObject({
          entityId: `${type}.${params.slug}`,
        });
      }
    }
  });
});
