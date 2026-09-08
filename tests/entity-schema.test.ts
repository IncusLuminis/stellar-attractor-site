/**
 * Unit tests for the universe entity schemas (Story #16).
 *
 * Covers the failure modes named in Technical Architecture §12 that are
 * *shape* concerns (cross-file referential integrity — dangling targets,
 * duplicate slugs, unresolvable media — is #18 and is intentionally not here).
 */

import { describe, expect, it } from "vitest";

import {
  ENTITY_TYPES,
  clearanceSchema,
  entitySchemaFor,
  entitySchemas,
  localizedTextSchema,
  mediaReferenceSchema,
  relationSchema,
  universeEntitySchema,
} from "../src/core/entities/schemas.ts";

const validPerson = {
  id: "person.zane",
  type: "person" as const,
  slug: "zane",
  name: { ru: "Зейн", en: "Zane" },
  shortDescription: { ru: "Исследователь", en: "Researcher" },
  clearance: "civilian" as const,
  tags: ["base-32"],
  relations: [{ type: "assigned_to", target: "station.base32" }],
  media: [{ id: "media.zane-portrait", role: "portrait" as const }],
};

describe("universeEntitySchema — valid input", () => {
  it("accepts a fully-populated entity", () => {
    expect(universeEntitySchema.safeParse(validPerson).success).toBe(true);
  });

  it("accepts the minimal required set (id, type, slug, name)", () => {
    const result = universeEntitySchema.safeParse({
      id: "science.dark-forest",
      type: "science",
      slug: "dark-forest",
      name: { ru: "Тёмный лес", en: "Dark forest" },
    });
    expect(result.success).toBe(true);
  });
});

describe("universeEntitySchema — rejected failure modes (Technical Architecture §12)", () => {
  it("rejects a missing id", () => {
    const { id, ...noId } = validPerson;
    void id;
    expect(universeEntitySchema.safeParse(noId).success).toBe(false);
  });

  it("rejects an id that does not follow <type>.<slug>", () => {
    const result = universeEntitySchema.safeParse({ ...validPerson, id: "person.someone-else" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["id"]);
  });

  it("rejects a missing `ru` translation", () => {
    const result = universeEntitySchema.safeParse({
      ...validPerson,
      name: { en: "Zane" },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.path.join(".") === "name.ru")).toBe(true);
  });

  it("rejects a missing `en` translation", () => {
    const result = universeEntitySchema.safeParse({
      ...validPerson,
      name: { ru: "Зейн" },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.path.join(".") === "name.en")).toBe(true);
  });

  it("rejects an empty-string translation", () => {
    const result = universeEntitySchema.safeParse({
      ...validPerson,
      name: { ru: "   ", en: "Zane" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid entity type", () => {
    const result = universeEntitySchema.safeParse({ ...validPerson, type: "spaceship" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed slug", () => {
    for (const slug of ["Zane", "zane_smith", "zane ", "-zane", "zane--x", "zañe"]) {
      const result = universeEntitySchema.safeParse({
        ...validPerson,
        id: `person.${slug}`,
        slug,
      });
      expect(result.success, `slug "${slug}" should be rejected`).toBe(false);
    }
  });

  it("rejects a relation with no target", () => {
    const result = universeEntitySchema.safeParse({
      ...validPerson,
      relations: [{ type: "assigned_to" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a relation with no type", () => {
    const result = universeEntitySchema.safeParse({
      ...validPerson,
      relations: [{ target: "station.base32" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown top-level key (strict)", () => {
    const result = universeEntitySchema.safeParse({ ...validPerson, rank: "specialist" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid clearance value", () => {
    const result = universeEntitySchema.safeParse({ ...validPerson, clearance: "top-secret" });
    expect(result.success).toBe(false);
  });
});

describe("LocalizedText", () => {
  it("requires both ru and en, non-empty", () => {
    expect(localizedTextSchema.safeParse({ ru: "а", en: "a" }).success).toBe(true);
    expect(localizedTextSchema.safeParse({ ru: "а", en: "" }).success).toBe(false);
    expect(localizedTextSchema.safeParse({ ru: "а" }).success).toBe(false);
    expect(localizedTextSchema.safeParse({ ru: "а", en: "a", de: "a" }).success).toBe(false);
  });
});

describe("MediaReference", () => {
  it("accepts a stable media id or path", () => {
    expect(mediaReferenceSchema.safeParse({ id: "media.zane-portrait" }).success).toBe(true);
    expect(mediaReferenceSchema.safeParse({ id: "portraits/zane" }).success).toBe(true);
  });

  it("rejects an inline filename with an asset extension", () => {
    for (const id of ["zane.png", "zane-portrait.jpg", "diagram.svg", "clip.webm", "doc.pdf"]) {
      expect(mediaReferenceSchema.safeParse({ id }).success, id).toBe(false);
    }
  });

  it("rejects an empty id", () => {
    expect(mediaReferenceSchema.safeParse({ id: "" }).success).toBe(false);
  });
});

describe("Relation", () => {
  it("requires non-empty type and target", () => {
    expect(relationSchema.safeParse({ type: "served_at", target: "location.x" }).success).toBe(true);
    expect(relationSchema.safeParse({ type: "", target: "location.x" }).success).toBe(false);
    expect(relationSchema.safeParse({ type: "served_at", target: "" }).success).toBe(false);
  });
});

describe("clearanceSchema", () => {
  it("accepts every clearance level", () => {
    for (const level of ["guest", "civilian", "authorized", "restricted", "classified"]) {
      expect(clearanceSchema.safeParse(level).success).toBe(true);
    }
  });
});

describe("entitySchemaFor — per-type type-locking", () => {
  it("pins `type` to the collection's literal", () => {
    const personSchema = entitySchemaFor("person");
    expect(personSchema.safeParse(validPerson).success).toBe(true);
    expect(personSchema.safeParse({ ...validPerson, type: "vessel", id: "vessel.zane" }).success).toBe(
      false,
    );
  });

  it("exposes a schema for all 11 entity types", () => {
    expect(Object.keys(entitySchemas).sort()).toEqual([...ENTITY_TYPES].sort());
  });
});
