/**
 * Unit tests for the entity + relation resolver (Story #17).
 *
 * Covers the AC checklist: id resolution, type+slug resolution, missing entity,
 * forward relation resolution (resolved + unresolvable), reverse-relation
 * lookup, the URL helper, and graceful degradation (never throws on a dangling
 * target — build-time hard-failing is #18).
 *
 * The resolver is exercised over an in-memory source built from the shape
 * fixtures in `tests/fixtures/` (NOT `data/` — that is #22's territory).
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import {
  type EntityType,
  type UniverseEntity,
  entitySchemaFor,
} from "../src/core/entities/schemas.ts";
import {
  type EntitySource,
  arrayEntitySource,
  createEntityResolver,
} from "../src/core/entities/resolver.ts";
import { entityUrl, entityUrlFromRef } from "../src/core/entities/url.ts";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

/** Load named fixtures (or all of them) as validated, typed entities. */
function loadFixtures(...names: string[]): UniverseEntity[] {
  const files = names.length
    ? names
    : readdirSync(fixturesDir).filter((f) => f.endsWith(".json"));
  return files.map((file) => {
    const raw = JSON.parse(readFileSync(join(fixturesDir, file), "utf8")) as { type: EntityType };
    return entitySchemaFor(raw.type).parse(raw) as UniverseEntity;
  });
}

const makeResolver = (...names: string[]) =>
  createEntityResolver(arrayEntitySource(loadFixtures(...names)));

/* -------------------------------------------------------------------------- */

describe("entityUrl / entityUrlFromRef", () => {
  it("builds /<type>/<slug>", () => {
    expect(entityUrlFromRef("person", "zane")).toBe("/person/zane");
    expect(entityUrl({ type: "station", slug: "base32" })).toBe("/station/base32");
    expect(entityUrl({ type: "astronomical-object", slug: "fomalhaut" })).toBe(
      "/astronomical-object/fomalhaut",
    );
  });
});

describe("getById", () => {
  it("resolves an entity by its full id", async () => {
    const resolver = makeResolver();
    const zane = await resolver.getById("person.zane");
    expect(zane?.type).toBe("person");
    expect(zane?.name.en).toBe("Zane");
  });

  it("returns undefined for an unknown id", async () => {
    expect(await makeResolver().getById("person.nobody")).toBeUndefined();
  });

  it("returns undefined for a malformed id instead of throwing", async () => {
    const resolver = makeResolver();
    expect(await resolver.getById("not-an-id")).toBeUndefined();
    expect(await resolver.getById("")).toBeUndefined();
  });
});

describe("getByTypeSlug", () => {
  it("resolves an entity by type + slug", async () => {
    const base = await makeResolver().getByTypeSlug("station", "base32");
    expect(base?.id).toBe("station.base32");
  });

  it("does not confuse type and slug across types", async () => {
    const resolver = makeResolver();
    expect(await resolver.getByTypeSlug("vessel", "zane")).toBeUndefined();
    expect(await resolver.getByTypeSlug("person", "base32")).toBeUndefined();
  });
});

describe("list", () => {
  it("returns everything, or one type", async () => {
    const resolver = makeResolver();
    const all = await resolver.list();
    expect(all.length).toBeGreaterThanOrEqual(4);
    const missions = await resolver.list("mission");
    expect(missions.map((e) => e.id)).toEqual(["mission.exodus"]);
  });
});

describe("toRef", () => {
  it("produces a link-ready { id, type, slug, name, url }", async () => {
    const resolver = makeResolver();
    const zane = await resolver.getById("person.zane");
    expect(resolver.toRef(zane!)).toEqual({
      id: "person.zane",
      type: "person",
      slug: "zane",
      name: { ru: "Зейн", en: "Zane" },
      url: "/person/zane",
    });
  });
});

describe("resolveRelations — forward", () => {
  it("resolves each relation target to { id, type, slug, name, url }", async () => {
    const resolver = makeResolver();
    const zane = await resolver.getById("person.zane");
    const resolved = await resolver.resolveRelations(zane!);

    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toEqual({
      resolved: true,
      type: "assigned_to",
      target: "station.base32",
      entity: {
        id: "station.base32",
        type: "station",
        slug: "base32",
        name: { ru: "База №32", en: "Base #32" },
        url: "/station/base32",
      },
    });
  });

  it("preserves declared relation order", async () => {
    const resolver = makeResolver();
    const doc = await resolver.getById("document.first-contact-report");
    const resolved = await resolver.resolveRelations(doc!);
    expect(resolved.map((r) => r.target)).toEqual([
      "person.zane",
      "mission.ghost",
      "not a real id",
    ]);
  });

  it("marks a well-formed but missing target as not-found, without throwing", async () => {
    const resolver = makeResolver();
    const doc = await resolver.getById("document.first-contact-report");
    const resolved = await resolver.resolveRelations(doc!);

    const ghost = resolved[1];
    expect(ghost).toEqual({
      resolved: false,
      type: "concerns",
      target: "mission.ghost",
      reason: "not-found",
    });
  });

  it("marks a target that is not a <type>.<slug> id as malformed-target", async () => {
    const resolver = makeResolver();
    const doc = await resolver.getById("document.first-contact-report");
    const resolved = await resolver.resolveRelations(doc!);

    expect(resolved[2]).toEqual({
      resolved: false,
      type: "filed_under",
      target: "not a real id",
      reason: "malformed-target",
    });
  });

  it("returns [] for an entity with no relations", async () => {
    const resolver = createEntityResolver(
      arrayEntitySource([
        entitySchemaFor("science").parse({
          id: "science.dark-forest",
          type: "science",
          slug: "dark-forest",
          name: { ru: "Тёмный лес", en: "Dark forest" },
        }) as UniverseEntity,
      ]),
    );
    const s = await resolver.getById("science.dark-forest");
    expect(await resolver.resolveRelations(s!)).toEqual([]);
  });

  it("resolveRelation accepts a bare { type, target }", async () => {
    const resolver = makeResolver();
    const one = await resolver.resolveRelation({ type: "x", target: "person.zane" });
    expect(one.resolved).toBe(true);
  });
});

describe("getReverseRelations — inbound edges", () => {
  it("finds every entity that points at the queried one", async () => {
    const resolver = makeResolver();
    const inbound = await resolver.getReverseRelations("person.zane");

    // base32 (hosts), exodus (had_participant), first-contact-report (concerns)
    expect(
      inbound.map((r) => [r.from.id, r.type]).sort((a, b) => a[0].localeCompare(b[0])),
    ).toEqual([
      ["document.first-contact-report", "concerns"],
      ["mission.exodus", "had_participant"],
      ["station.base32", "hosts"],
    ]);
    for (const edge of inbound) {
      expect(edge.from.url).toBe(entityUrl(edge.from));
    }
  });

  it("accepts an entity as well as an id", async () => {
    const resolver = makeResolver();
    const base = await resolver.getById("station.base32");
    const byEntity = await resolver.getReverseRelations(base!);
    const byId = await resolver.getReverseRelations("station.base32");
    expect(byEntity).toEqual(byId);
    expect(byEntity.map((r) => [r.from.id, r.type]).sort((a, b) => a[0].localeCompare(b[0]))).toEqual(
      [
        ["mission.exodus", "departed_from"],
        ["person.zane", "assigned_to"],
      ],
    );
  });

  it("returns [] when nothing points at the entity", async () => {
    const resolver = makeResolver();
    expect(await resolver.getReverseRelations("person.zane-nonexistent")).toEqual([]);
  });

  it("does not fabricate a reverse edge from a dangling target", async () => {
    const resolver = makeResolver();
    // mission.ghost is only ever a dangling target, never a real entity
    const inbound = await resolver.getReverseRelations("mission.ghost");
    expect(inbound.map((r) => r.from.id)).toEqual(["document.first-contact-report"]);
    // ...but it still resolves to nothing when asked directly
    expect(await resolver.getById("mission.ghost")).toBeUndefined();
  });
});

describe("index caching", () => {
  it("reads the source exactly once across many queries", async () => {
    const entities = loadFixtures();
    const source: EntitySource = { all: vi.fn(() => Promise.resolve(entities)) };
    const resolver = createEntityResolver(source);

    await resolver.getById("person.zane");
    await resolver.getByTypeSlug("station", "base32");
    await resolver.getReverseRelations("person.zane");
    await resolver.resolveRelations((await resolver.getById("person.zane"))!);
    await resolver.list();

    expect(source.all).toHaveBeenCalledTimes(1);
  });
});
