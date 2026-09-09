// @vitest-environment node
/**
 * #21 DoD / Implementation Plan §2.3 / Risk 3: the Astronav stub must import
 * **no** Local Bubble code, **no** Three.js, and **no** renderer / 3D / physics
 * library. Three.js re-enters the picture only via Local Bubble, behind the
 * `AstronavAdapter` boundary, when Phase 7 is commissioned.
 *
 * This test walks every source file under src/systems/astronav/ and fails the
 * build if such an import appears, so a later story cannot quietly regress it.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const astronavDir = fileURLToPath(new URL("../src/systems/astronav/", import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const FORBIDDEN: { label: string; re: RegExp }[] = [
  { label: "Local Bubble import", re: /\bfrom\s+["'][^"']*local[-]?bubble[^"']*["']/i },
  { label: "three.js import", re: /\bfrom\s+["']three(?:\/[^"']*)?["']/ },
  { label: "@react-three import", re: /\bfrom\s+["']@react-three\/[^"']+["']/ },
  { label: "3D / renderer library import", re: /\bfrom\s+["'](?:pixi\.js|phaser|regl|ogl|babylonjs|@babylonjs\/[^"']+)["']/ },
  { label: "WebGL/canvas physics import", re: /\bfrom\s+["'](?:cannon-es|ammojs|matter-js|rapier)["']/ },
  { label: "dynamic Local Bubble import", re: /\bimport\(\s*["'][^"']*local[-]?bubble[^"']*["']\s*\)/i },
  { label: "dynamic three.js import", re: /\bimport\(\s*["']three(?:\/[^"']*)?["']\s*\)/ },
];

describe("src/systems/astronav/ imports no renderer / Local Bubble code", () => {
  const files = walk(astronavDir).filter((f) => /\.tsx?$/.test(f));

  it("finds astronav source files to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file.slice(astronavDir.length)} is renderer-free`, () => {
      const src = readFileSync(file, "utf8");
      for (const { label, re } of FORBIDDEN) {
        expect(re.test(src), `${file} must not contain a ${label}`).toBe(false);
      }
    });
  }
});
