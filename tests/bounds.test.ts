import { describe, it, expect } from "vitest";
import {
  clamp,
  clampCamera,
  computeBounds,
  minScaleForViewport,
} from "../src/cockpit/camera-controller";
import { config } from "./helpers";

const scene = { width: config.scene.width, height: config.scene.height };
const boundsOpts = {
  minHorizontalOverflowRatio: config.camera.bounds.minHorizontalOverflowRatio,
  verticalPanRatio: config.camera.bounds.verticalPanRatio,
  maxScale: config.camera.bounds.maxScale,
};

// Spec §25 — the four viewport sizes the prototype must not break bounds at.
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
];

describe("clamp", () => {
  it("clamps within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("returns the midpoint when the range is inverted", () => {
    expect(clamp(999, 10, 0)).toBe(5);
  });
});

describe("minScaleForViewport", () => {
  it("keeps the scene wider than the viewport by the configured overflow ratio", () => {
    for (const vp of VIEWPORTS) {
      const s = minScaleForViewport(scene, vp, boundsOpts.minHorizontalOverflowRatio);
      const shownSceneWidth = vp.width / s;
      expect(shownSceneWidth).toBeLessThanOrEqual(
        scene.width / boundsOpts.minHorizontalOverflowRatio + 1e-6,
      );
    }
  });
});

describe("computeBounds (Spec §9, §25)", () => {
  it("never lets the scaled scene be smaller than the viewport", () => {
    for (const vp of VIEWPORTS) {
      const b = computeBounds(scene, vp, config.camera.overview.scale, boundsOpts);
      expect(scene.width * b.scale).toBeGreaterThan(vp.width);
      expect(scene.height * b.scale).toBeGreaterThanOrEqual(vp.height);
    }
  });

  it("produces a non-empty horizontal pan range at every tested viewport", () => {
    for (const vp of VIEWPORTS) {
      const b = computeBounds(scene, vp, config.camera.overview.scale, boundsOpts);
      expect(b.maxX).toBeGreaterThan(b.minX);
      expect(b.maxX).toBe(0);
      expect(b.minX).toBeLessThan(0);
    }
  });

  it("clamps the requested scale to [minScale, maxScale]", () => {
    const tiny = computeBounds(scene, { width: 1920, height: 1080 }, 0.1, boundsOpts);
    expect(tiny.scale).toBeGreaterThan(0.1);
    const huge = computeBounds(scene, { width: 1920, height: 1080 }, 99, boundsOpts);
    expect(huge.scale).toBe(boundsOpts.maxScale);
  });

  it("does not hardcode boundary values — they scale with the viewport", () => {
    const a = computeBounds(scene, { width: 1024, height: 768 }, 1, boundsOpts);
    const b = computeBounds(scene, { width: 1920, height: 1080 }, 1, boundsOpts);
    expect(a.minX).not.toBe(b.minX);
  });

  it("recomputes correctly when the viewport changes (resize)", () => {
    let b = computeBounds(scene, { width: 1920, height: 1080 }, 1, boundsOpts);
    const wide = clampCamera({ x: -5000, y: 0, scale: 1 }, b);
    expect(wide.x).toBe(b.minX);

    b = computeBounds(scene, { width: 1366, height: 768 }, 1, boundsOpts);
    const reclamped = clampCamera(wide, b);
    expect(reclamped.x).toBeGreaterThanOrEqual(b.minX);
    expect(reclamped.x).toBeLessThanOrEqual(b.maxX);
  });
});

describe("clampCamera", () => {
  it("keeps x/y inside bounds and adopts the bounds scale", () => {
    const b = computeBounds(scene, { width: 1920, height: 1080 }, 1, boundsOpts);
    const out = clampCamera({ x: 9999, y: -9999, scale: 1 }, b);
    expect(out.x).toBe(b.maxX);
    expect(out.y).toBe(b.minY);
    expect(out.scale).toBe(b.scale);
  });

  it("keeps the configured astronav target within its own bounds", () => {
    const t = config.camera.targets.astronav;
    const b = computeBounds(scene, { width: 1920, height: 1080 }, t.scale, boundsOpts);
    const clamped = clampCamera(t, b);
    expect(clamped.x).toBeCloseTo(t.x, 5);
    expect(clamped.y).toBeCloseTo(t.y, 5);
  });
});
