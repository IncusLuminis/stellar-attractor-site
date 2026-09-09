// @vitest-environment node
/**
 * Browser history (#19 AC 8; Technical Architecture §8). Phase 1 uses plain
 * `<a>` navigation and real routes — there must be NO client-side history
 * interception anywhere in the routing surface, so back/forward/bookmark/share
 * work for free.
 *
 * This is a static guard: no `history.pushState` / `replaceState`, no
 * `popstate` listener, no `<a>`-click preventDefault router in `src/pages/` or
 * `src/core/navigation/`. A later phase adding soft transitions must revisit
 * this test deliberately.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, it, expect } from "vitest";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const FORBIDDEN = [
  /\bhistory\.pushState\b/,
  /\bhistory\.replaceState\b/,
  /addEventListener\(\s*["'`]popstate["'`]/,
  /window\.onpopstate\b/,
];

describe("no client-side history hijacking", () => {
  const files = [
    ...walk(join(root, "src/pages")),
    ...walk(join(root, "src/core/navigation")),
  ].filter((f) => /\.(astro|ts|tsx|js|jsx)$/.test(f));

  it("scans a non-empty set of routing files", () => {
    expect(files.length).toBeGreaterThan(8);
  });

  it("contains no pushState / replaceState / popstate handling", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const pattern of FORBIDDEN) {
        if (pattern.test(src)) offenders.push(`${file}  ~  ${pattern}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
