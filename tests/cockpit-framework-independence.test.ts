// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Implementation Plan §2.2 / §3 and issue #15 AC: the modules under src/cockpit/
 * are plain vanilla TypeScript and must survive the spike into production
 * unchanged. They must not couple to Astro — no `astro:*` virtual modules, no
 * import of the `astro` runtime, no `.astro` component, no Preact/JSX.
 *
 * This test fails the build if any such import appears under src/cockpit/, so
 * later stories cannot quietly regress the boundary.
 */

const cockpitDir = fileURLToPath(new URL("../src/cockpit/", import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const FORBIDDEN: { label: string; re: RegExp }[] = [
  { label: "astro: virtual module", re: /\bfrom\s+["']astro:[^"']+["']/ },
  { label: "astro runtime import", re: /\bfrom\s+["']astro(?:\/[^"']*)?["']/ },
  { label: "@astrojs/* import", re: /\bfrom\s+["']@astrojs\/[^"']+["']/ },
  { label: ".astro component import", re: /\bfrom\s+["'][^"']+\.astro["']/ },
  { label: "preact import", re: /\bfrom\s+["']preact(?:\/[^"']*)?["']/ },
  { label: "dynamic astro: import", re: /\bimport\(\s*["']astro:[^"']+["']\s*\)/ },
];

describe("src/cockpit/ framework independence", () => {
  const files = walk(cockpitDir).filter((f) => /\.tsx?$/.test(f));

  it("finds cockpit source files to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file.slice(cockpitDir.length)} has no framework imports`, () => {
      const src = readFileSync(file, "utf8");
      for (const { label, re } of FORBIDDEN) {
        expect(re.test(src), `${file} must not contain ${label}`).toBe(false);
      }
    });
  }
});
