/**
 * Tests for the CI entity validator (Story #18).
 *
 * Every failure mode named in Technical Architecture §12 / Implementation Plan §4
 * has a broken fixture under `tests/fixtures/validate-entities/<case>/data/` and
 * an assertion here that the validator catches it. One end-to-end test spawns the
 * real `node scripts/validate-entities.ts` CLI to prove the exit codes and the
 * human-readable report.
 *
 * Fixtures live under `tests/fixtures/validate-entities/` (nested, so
 * `entity-fixtures.test.ts`'s top-level scan ignores them) and never under
 * `data/`, so they do not touch `astro build` or #22's seed authoring.
 */

import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildAssetIndex,
  resolveMediaRef,
  type MediaRefContext,
} from "../scripts/check-media-refs.ts";
import {
  formatReport,
  validateEntities,
  type Violation,
} from "../scripts/validate-entities.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const casesDir = join(repoRoot, "tests", "fixtures", "validate-entities");

/** Run the validator against a fixture case dir and return the violation codes. */
function run(fixtureCase: string): { violations: Violation[]; codes: string[] } {
  const result = validateEntities({ dataDir: join(casesDir, fixtureCase, "data") });
  return { violations: result.violations, codes: result.violations.map((v) => v.code) };
}

describe("validateEntities — clean fixture", () => {
  it("passes a well-formed, mutually-consistent data set with 0 violations", () => {
    const result = validateEntities({ dataDir: join(casesDir, "clean", "data") });
    expect(result.violations).toEqual([]);
    expect(result.entityCount).toBe(2);
  });

  it("passes the repo's own (empty) data/ directory", () => {
    const result = validateEntities();
    expect(result.violations).toEqual([]);
  });
});

describe("validateEntities — Technical Architecture §12 failure modes", () => {
  it("catches a missing entity id", () => {
    const { violations, codes } = run("missing-id");
    expect(codes).toContain("missing-id");
    expect(violations.find((v) => v.code === "missing-id")?.field).toBe("id");
  });

  it("catches a duplicate id", () => {
    const { violations, codes } = run("duplicate-id");
    expect(codes).toContain("duplicate-id");
    // reported on every file that shares the id
    expect(violations.filter((v) => v.code === "duplicate-id")).toHaveLength(2);
  });

  it("catches a duplicate slug within a type", () => {
    const { codes } = run("duplicate-slug");
    expect(codes).toContain("duplicate-slug");
  });

  it("scopes slug uniqueness to the DECLARED type, not the crawl directory", () => {
    // A misfiled `station` file in data/people/ sharing a slug with a real
    // `person` must NOT be reported as a duplicate slug (regression: keyed on dir).
    const falsePositive = run("slug-scope");
    expect(falsePositive.codes).toContain("wrong-collection-dir");
    expect(falsePositive.codes).not.toContain("duplicate-slug");

    // Two genuine same-`type` entities misfiled into different dirs MUST still clash.
    const missed = run("slug-scope-split");
    expect(missed.codes).toContain("duplicate-slug");
    expect(missed.codes).not.toContain("duplicate-id");
    expect(missed.violations.find((v) => v.code === "duplicate-slug")?.message).toMatch(
      /"station" entities/,
    );
  });

  it("catches an unknown entity type", () => {
    const { violations, codes } = run("unknown-type");
    expect(codes).toContain("unknown-type");
    expect(violations.find((v) => v.code === "unknown-type")?.message).toMatch(/must be one of/);
  });

  it("catches a file in the wrong collection directory", () => {
    const { violations, codes } = run("wrong-dir");
    expect(codes).toContain("wrong-collection-dir");
    expect(violations.find((v) => v.code === "wrong-collection-dir")?.message).toMatch(
      /data\/stations/,
    );
  });

  it("catches a relation target that does not resolve", () => {
    const { violations, codes } = run("dangling-relation");
    expect(codes).toContain("dangling-relation");
    const v = violations.find((x) => x.code === "dangling-relation");
    expect(v?.field).toBe("relations[0].target");
    expect(v?.message).toMatch(/station\.ghost/);
  });

  it("catches a missing required translation", () => {
    const { violations } = run("missing-translation");
    const translation = violations.find((v) => v.field === "name.ru");
    expect(translation).toBeDefined();
    expect(translation?.code).toBe("missing-translation");
    expect(translation?.message).toMatch(/required.+"ru".+translation.+missing/i);
  });

  it("catches a media reference that does not resolve", () => {
    const { violations, codes } = run("unresolved-media-entity");
    expect(codes).toContain("unresolved-media-ref");
    expect(violations.find((v) => v.code === "unresolved-media-ref")?.message).toMatch(
      /media\.ghost-portrait/,
    );
  });

  it("catches a malformed media reference (inline filename with extension)", () => {
    const { violations } = run("bad-media-format");
    const media = violations.find((v) => (v.field ?? "").includes("media"));
    expect(media).toBeDefined();
    expect(media?.message).toMatch(/extension|filename/i);
  });

  it("catches a typo'd media-entity id instead of accepting it format-only", () => {
    // `media.Ghost_Portrait` — capital + underscore. The #16 Zod schema accepts it
    // as a media.id; it must NOT fall through to the asset-path branch (regression).
    const { violations, codes } = run("media-entity-typo");
    expect(codes).toContain("unresolved-media-ref");
    expect(violations.find((v) => v.code === "unresolved-media-ref")?.message).toMatch(
      /media\.Ghost_Portrait.+data\/media/,
    );
  });

  it("catches a file that is not valid JSON", () => {
    const { codes } = run("invalid-json");
    expect(codes).toContain("invalid-json");
  });
});

describe("formatReport", () => {
  it("names the file, entity id, field and reason for each violation", () => {
    const result = validateEntities({ dataDir: join(casesDir, "dangling-relation", "data") });
    const report = formatReport(result);
    expect(report).toMatch(/FAIL/);
    expect(report).toContain("data/people/loner.json");
    expect(report).toContain("person.loner");
    expect(report).toContain("relations[0].target");
    expect(report).toMatch(/\[dangling-relation\]/);
  });

  it("reports OK with 0 violations for the clean fixture", () => {
    const result = validateEntities({ dataDir: join(casesDir, "clean", "data") });
    expect(formatReport(result)).toMatch(/OK — 2 entities/);
  });
});

describe("resolveMediaRef — asset-path resolution", () => {
  const base = (over: Partial<MediaRefContext> = {}): MediaRefContext => ({
    mediaEntityIds: new Set<string>(),
    assetIndex: new Set<string>(),
    mediaDirLabel: "public/media",
    ...over,
  });

  it("resolves a media-entity id only when the entity exists", () => {
    expect(resolveMediaRef("media.zane", base({ mediaEntityIds: new Set(["media.zane"]) })).ok).toBe(
      true,
    );
    expect(resolveMediaRef("media.zane", base()).ok).toBe(false);
  });

  it("never falls a `media.` ref through to the format-only asset-path branch", () => {
    // Even with an empty asset index (the format-only path), a `media.` typo fails.
    for (const typo of ["media.Ghost_Portrait", "media.zane portrait", "media."]) {
      const result = resolveMediaRef(typo, base());
      expect(result.ok, typo).toBe(false);
      expect(result.formatOnly, typo).toBeUndefined();
    }
  });

  it("resolves an asset path against a populated asset index", () => {
    const ctx = base({ assetIndex: new Set(["portraits/zane.webp"]) });
    expect(resolveMediaRef("portraits/zane", ctx).ok).toBe(true);
    expect(resolveMediaRef("portraits/missing", ctx).ok).toBe(false);
  });

  it("accepts a well-formed asset path by format only when no assets are present yet", () => {
    const result = resolveMediaRef("portraits/zane", base());
    expect(result.ok).toBe(true);
    expect(result.formatOnly).toBe(true);
  });

  it("rejects a filename with an asset extension and unsafe paths", () => {
    expect(resolveMediaRef("zane.png", base()).ok).toBe(false);
    expect(resolveMediaRef("/abs/path", base()).ok).toBe(false);
    expect(resolveMediaRef("../escape", base()).ok).toBe(false);
  });

  it("buildAssetIndex ignores dotfiles and a missing directory", () => {
    expect(buildAssetIndex(join(repoRoot, "public", "media")).size).toBe(0);
    expect(buildAssetIndex(join(repoRoot, "does", "not", "exist")).size).toBe(0);
  });
});

describe("validate-entities CLI (scripts/validate-entities.ts)", () => {
  const script = join(repoRoot, "scripts", "validate-entities.ts");

  it("exits 0 and prints an OK report on the clean fixture", () => {
    const out = execFileSync("node", [script, "--data", join(casesDir, "clean", "data")], {
      encoding: "utf8",
    });
    expect(out).toMatch(/\[validate-entities\] OK/);
  });

  it("exits non-zero and prints a FAIL report on a broken fixture", () => {
    expect(() =>
      execFileSync("node", [script, "--data", join(casesDir, "dangling-relation", "data")], {
        encoding: "utf8",
        stdio: "pipe",
      }),
    ).toThrow();

    try {
      execFileSync("node", [script, "--data", join(casesDir, "dangling-relation", "data")], {
        encoding: "utf8",
        stdio: "pipe",
      });
      throw new Error("expected a non-zero exit");
    } catch (error) {
      const err = error as { status?: number; stderr?: string };
      expect(err.status).toBe(1);
      expect(err.stderr).toMatch(/dangling-relation/);
    }
  });
});
