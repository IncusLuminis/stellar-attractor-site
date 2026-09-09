// @vitest-environment node
/**
 * Route ↔ system map (#19 AC 5). `routeToSystem` / `systemForEntity` over the
 * data-driven `ENTITY_TYPE_SYSTEM` table.
 */
import { describe, it, expect } from "vitest";

import {
  routeToSystem,
  systemForEntity,
  routeForEntity,
  ENTITY_TYPE_SYSTEM,
  SYSTEM_ROUTE_PATH,
  SYSTEM_IDS,
} from "../src/core/navigation";
import { ENTITY_TYPES } from "../src/core/entities/schemas";

describe("routeToSystem — entity routes", () => {
  it("maps the §7 examples", () => {
    expect(routeToSystem("/person/zane")).toEqual({
      system: "personnel",
      entityId: "person.zane",
    });
    expect(routeToSystem("/location/fomalhaut")).toEqual({
      system: "astronav",
      entityId: "location.fomalhaut",
    });
  });

  it("maps every entity type to its table entry", () => {
    for (const type of ENTITY_TYPES) {
      expect(routeToSystem(`/${type}/some-slug`)).toEqual({
        system: ENTITY_TYPE_SYSTEM[type],
        entityId: `${type}.some-slug`,
      });
    }
  });

  it("accepts a full URL and ignores query + hash", () => {
    expect(routeToSystem("https://stellar.test/vessel/stellar-nomad?lang=ru#top")).toEqual({
      system: "fleet",
      entityId: "vessel.stellar-nomad",
    });
  });

  it("tolerates a trailing slash", () => {
    expect(routeToSystem("/mission/exodus/")).toEqual({
      system: "missions",
      entityId: "mission.exodus",
    });
  });

  it("rejects a malformed slug", () => {
    expect(routeToSystem("/person/Not_A_Slug")).toBeNull();
    expect(routeToSystem("/person/")).toBeNull();
  });
});

describe("routeToSystem — bare system routes", () => {
  it("maps `/` to the cockpit with no entity", () => {
    expect(routeToSystem("/")).toEqual({ system: "cockpit", entityId: null });
  });

  it("maps each system route", () => {
    for (const system of SYSTEM_IDS) {
      expect(routeToSystem(SYSTEM_ROUTE_PATH[system])).toEqual({ system, entityId: null });
    }
  });
});

describe("routeToSystem — non-routes", () => {
  it("returns null for unknown paths", () => {
    expect(routeToSystem("/nope")).toBeNull();
    expect(routeToSystem("/nope/nope")).toBeNull();
    expect(routeToSystem("/person/zane/extra")).toBeNull();
    expect(routeToSystem("")).toBeNull();
  });
});

describe("systemForEntity / routeForEntity", () => {
  it("resolves an entity in hand to its system + id", () => {
    expect(
      systemForEntity({ type: "person", id: "person.zane", slug: "zane" }),
    ).toEqual({ system: "personnel", entityId: "person.zane" });
  });

  it("routeForEntity is the inverse of routeToSystem for entity routes", () => {
    const entity = { type: "location", id: "location.fomalhaut", slug: "fomalhaut" } as const;
    const url = routeForEntity(entity);
    expect(url).toBe("/location/fomalhaut");
    expect(routeToSystem(url)).toEqual({
      system: "astronav",
      entityId: "location.fomalhaut",
    });
  });
});

describe("table integrity", () => {
  it("covers every entity type", () => {
    expect(Object.keys(ENTITY_TYPE_SYSTEM).sort()).toEqual([...ENTITY_TYPES].sort());
  });

  it("only maps to real system ids", () => {
    for (const system of Object.values(ENTITY_TYPE_SYSTEM)) {
      expect(SYSTEM_IDS).toContain(system);
    }
  });
});
