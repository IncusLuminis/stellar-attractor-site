// @vitest-environment node
/**
 * Route file structure (#19 AC 1, 2, 7). The rendered output is validated by
 * `npm run build`; this checks the source wiring that build can't easily assert
 * in isolation — the right routes exist, entity routes are driven by the
 * resolver via `entityStaticPaths`, and 404 carries the required content.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, it, expect } from "vitest";

const pages = join(dirname(dirname(fileURLToPath(import.meta.url))), "src/pages");
const read = (p: string) => readFileSync(join(pages, p), "utf8");

const ENTITY_ROUTES = [
  "person",
  "vessel",
  "station",
  "location",
  "mission",
  "event",
  "document",
  "science",
] as const;

const SYSTEM_ROUTES = [
  "astronav",
  "fleet",
  "personnel",
  "base32",
  "missions",
  "database",
] as const;

describe("entity routes (§7)", () => {
  for (const type of ENTITY_ROUTES) {
    it(`/${type}/[slug].astro exists and is resolver-driven`, () => {
      const src = read(join(type, "[slug].astro"));
      expect(src).toMatch(/getStaticPaths\s*=\s*\(\)\s*=>\s*entityStaticPaths\(entities,\s*["'`]/);
      expect(src).toContain(`entityStaticPaths(entities, "${type}")`);
      expect(src).toContain("EntityDocument");
    });
  }
});

describe("system routes (§7)", () => {
  it("`/` (cockpit) exists", () => {
    expect(existsSync(join(pages, "index.astro"))).toBe(true);
  });

  for (const route of SYSTEM_ROUTES) {
    it(`/${route}.astro exists`, () => {
      expect(existsSync(join(pages, `${route}.astro`))).toBe(true);
    });
  }

  it("/astronav mounts the Astronav stub island (#21)", () => {
    const src = read("astronav.astro");
    expect(src).toContain("AstronavIsland");
    expect(src).toMatch(/client:(load|idle)/);
    expect(src).not.toContain("SystemPlaceholder");
  });

  it("/location/[slug] mounts the Astronav stub from the #19 focus intent (#21)", () => {
    const src = read(join("location", "[slug].astro"));
    expect(src).toContain("AstronavIsland");
    expect(src).toContain("focusIntentForEntity");
    expect(src).toContain('slot="system-mount"');
  });
});

describe("404 route (§42)", () => {
  const src = read("404.astro");

  it("is named `404.astro` so the host serves it with HTTP 404", () => {
    expect(existsSync(join(pages, "404.astro"))).toBe(true);
  });

  it('carries the in-universe "RECORD NOT FOUND" body', () => {
    expect(src).toContain("RECORD NOT FOUND");
  });

  it("links to /database and uses the [data-i18n] contract", () => {
    expect(src).toMatch(/href="\/database"/);
    expect(src).toContain("data-i18n-ru");
  });

  it("notes the host-config dependency for the 404 status code", () => {
    expect(src.toLowerCase()).toMatch(/host-config|host config/);
  });
});
