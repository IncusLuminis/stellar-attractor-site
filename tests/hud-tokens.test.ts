// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Issue #24 — HUD token wiring. hud.css is plumbing: it layers `--hud-*` role
 * names on the shared SA palette and must never fork or re-declare `--sa-*`,
 * never inline a raw colour, and keep its motion slots in sync with
 * config/cockpit.json. These checks fail the build if a later story regresses
 * that contract.
 */

const hudCss = readFileSync(
  fileURLToPath(new URL("../src/hud/hud.css", import.meta.url)),
  "utf8",
);
const sharedCss = readFileSync(
  fileURLToPath(new URL("../shared/style/stellar-attractor.css", import.meta.url)),
  "utf8",
);
const cockpitConfig = JSON.parse(
  readFileSync(fileURLToPath(new URL("../config/cockpit.json", import.meta.url)), "utf8"),
);

/** hud.css with comments removed — literals only matter in real declarations. */
const code = hudCss.replace(/\/\*[\s\S]*?\*\//g, "");

const COLOUR_ROLES = [
  "--hud-bg", "--hud-bg-soft", "--hud-backdrop",
  "--hud-line", "--hud-line-bright", "--hud-line-dim", "--hud-line-faint",
  "--hud-accent", "--hud-glow",
  "--hud-text", "--hud-text-dim", "--hud-muted",
  "--hud-ok", "--hud-caution", "--hud-warning", "--hud-alert",
  "--hud-font",
];

describe("src/hud/hud.css — token wiring (issue #24)", () => {
  it("imports the shared token layer via the #15 re-export path", () => {
    expect(hudCss).toMatch(/@import\s+["']\.\.\/styles\/tokens\.css["']/);
  });

  it("does not @import the generated stylesheet directly", () => {
    expect(code).not.toMatch(/@import[^;]*stellar-attractor\.css/);
  });

  it("never assigns a --sa-* token (reads with var() only, no fork)", () => {
    expect(code.match(/--sa-[a-z0-9-]+\s*:/gi) ?? []).toEqual([]);
  });

  it("has no hard-coded hex colours", () => {
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("has no hard-coded rgb()/rgba()/hsl() colours", () => {
    expect(code).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/i);
  });

  it("has no hard-coded font-family literal (uses var(--hud-font)/var(--sa-font-mono))", () => {
    expect(code).not.toMatch(/font-family\s*:\s*(?!var\()\S/i);
  });

  it("defines every --hud-* colour/font role and resolves it to a token", () => {
    for (const role of COLOUR_ROLES) {
      const m = code.match(new RegExp(`${role}\\s*:\\s*([^;]+);`));
      expect(m, `${role} must be defined`).toBeTruthy();
      expect(m![1].trim(), `${role} must reference a --sa-* / --hud-* token`).toMatch(
        /^var\(--(?:sa|hud)-/,
      );
    }
  });

  it("includes a prefers-reduced-motion section", () => {
    expect(hudCss).toMatch(/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/);
  });

  it("ships a working reduced-motion example that is neutralised in the media block", () => {
    expect(hudCss).toMatch(/@keyframes\s+hud-pulse/);
    const media = hudCss.slice(hudCss.indexOf("@media (prefers-reduced-motion"));
    expect(media).toMatch(/\.hud-pulse[\s\S]*animation:\s*none/);
  });

  it("keeps motion token slots in sync with config/cockpit.json", () => {
    const a = cockpitConfig.animation;
    const pairs: Array<[string, number]> = [
      ["--hud-duration-fast", a.arrowStepMs],
      ["--hud-duration-return", a.returnMs],
      ["--hud-duration-focus", a.focusMs],
      ["--hud-duration-ambient", a.nudgeMs],
      ["--hud-duration-reduced", a.reducedMotionMs],
    ];
    for (const [name, ms] of pairs) {
      expect(hudCss, `${name} should be ${ms}ms`).toMatch(
        new RegExp(`${name}\\s*:\\s*${ms}ms\\b`),
      );
    }
    expect(hudCss.replace(/\s+/g, "")).toContain(
      `--hud-easing-mechanical:${a.easing.replace(/\s+/g, "")}`,
    );
  });
});

describe("shared/style/stellar-attractor.css — generated, not touched by #24", () => {
  it("still exposes the --sa-* tokens hud.css maps onto", () => {
    for (const t of [
      "--sa-colors-panel-bg", "--sa-colors-cyan-deep", "--sa-colors-cyan-bright",
      "--sa-colors-text-main", "--sa-colors-text-faint", "--sa-colors-orange",
      "--sa-colors-red", "--sa-colors-green", "--sa-colors-yellow", "--sa-font-mono",
    ]) {
      expect(sharedCss).toContain(t);
    }
  });
});
