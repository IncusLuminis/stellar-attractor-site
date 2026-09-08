import { describe, it, expect, vi } from "vitest";
import {
  CameraController,
  easeInOutCubic,
  resolveDragIntent,
  type CameraState,
} from "../src/cockpit/camera-controller";
import { config, FakeClock } from "./helpers";

function makeController(reducedMotion = false) {
  const clock = new FakeClock();
  const applied: CameraState[] = [];
  const controller = new CameraController({
    config,
    viewport: { width: 1920, height: 1080 },
    scheduler: clock.scheduler,
    prefersReducedMotion: () => reducedMotion,
    onApply: (s) => applied.push(s),
  });
  controller.boot();
  return { clock, controller, applied, last: () => applied[applied.length - 1] };
}

describe("resolveDragIntent (Spec §11 — click vs drag)", () => {
  const threshold = config.interaction.dragThresholdPx;

  it("counts sub-threshold movement as a click", () => {
    expect(resolveDragIntent(0, 0, threshold)).toBe("click");
    expect(resolveDragIntent(threshold - 0.5, 0, threshold)).toBe("click");
    expect(resolveDragIntent(2, 2, threshold)).toBe("click");
  });

  it("counts movement at or beyond the threshold as a drag", () => {
    expect(resolveDragIntent(threshold, 0, threshold)).toBe("drag");
    expect(resolveDragIntent(0, threshold + 5, threshold)).toBe("drag");
    expect(resolveDragIntent(10, 10, threshold)).toBe("drag");
  });
});

describe("easeInOutCubic (Spec §14 — mechanical, no overshoot)", () => {
  it("is pinned at the endpoints and never leaves [0,1]", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const v = easeInOutCubic(t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("is monotonically non-decreasing (no bounce)", () => {
    let prev = -1;
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const v = easeInOutCubic(t);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });
});

describe("CameraController pointer gesture (Spec §10, §11)", () => {
  it("a tiny wobble is a click and does NOT enter MANUAL_PAN", () => {
    const { controller } = makeController();
    controller.pointerDown(1, 500, 500);
    expect(controller.pointerMove(1, 502, 501)).toBe(false);
    expect(controller.sm.state).toBe("OVERVIEW");
    expect(controller.pointerUp(1)).toBe("click");
    expect(controller.sm.state).toBe("OVERVIEW");
  });

  it("crossing the threshold enters MANUAL_PAN and pans the camera by the delta", () => {
    const { controller } = makeController();
    const startX = controller.getState().x;
    controller.pointerDown(1, 500, 500);
    controller.pointerMove(1, 440, 500); // -60px, well past threshold
    expect(controller.sm.state).toBe("MANUAL_PAN");
    expect(controller.getState().x).toBeLessThan(startX);
    expect(controller.pointerUp(1)).toBe("drag");
    expect(controller.sm.state).toBe("OVERVIEW");
  });

  it("clamps the pan to bounds — cannot drag the scene off its edge", () => {
    const { controller } = makeController();
    const b = controller.getBounds();
    controller.pointerDown(1, 0, 0);
    controller.pointerMove(1, 100_000, 0); // absurd rightward drag
    expect(controller.getState().x).toBe(b.maxX);
  });
});

describe("CameraController.stepBy — panorama arrow increment (Spec §23)", () => {
  it("pans one bounded, animated increment and settles", () => {
    const { controller, clock } = makeController();
    const startX = controller.getState().x;
    controller.stepBy(-config.animation.arrowStepPx); // "look right"
    expect(controller.getState().x).toBe(startX); // animated, not instant
    clock.advance(config.animation.arrowStepMs + 50);
    expect(controller.getState().x).toBeCloseTo(startX - config.animation.arrowStepPx, 0);
  });

  it("clamps the step to bounds — repeated steps cannot exceed the edge", () => {
    const { controller, clock } = makeController();
    for (let i = 0; i < 12; i++) {
      controller.stepBy(-config.animation.arrowStepPx);
      clock.advance(config.animation.arrowStepMs + 20);
    }
    const b = controller.getBounds();
    expect(controller.getState().x).toBe(b.minX);
  });

  it("is ignored while input is locked", () => {
    const { controller } = makeController();
    controller.focus("astronav");
    const frozen = controller.getState().x;
    controller.stepBy(-config.animation.arrowStepPx);
    expect(controller.getState().x).toBe(frozen);
  });
});

describe("CameraController automatic focus + input lock (Spec §13-15, §34)", () => {
  it("animates to the astronav target and only then activates the system", () => {
    const { controller, clock } = makeController();
    const onComplete = vi.fn();

    expect(controller.focus("astronav", onComplete)).toBe(true);
    expect(controller.sm.state).toBe("FOCUSING");
    expect(onComplete).not.toHaveBeenCalled();
    expect(controller.getActiveSystem()).toBeNull();

    clock.advance(config.animation.focusMs + 50);

    expect(onComplete).toHaveBeenCalledWith("astronav");
    expect(controller.sm.state).toBe("SYSTEM_ACTIVE");
    expect(controller.getActiveSystem()).toBe("astronav");

    const t = config.camera.targets.astronav;
    expect(controller.getState().x).toBeCloseTo(t.x, 0);
    expect(controller.getState().scale).toBeCloseTo(t.scale, 3);
  });

  it("locks manual input while FOCUSING (drag, pan, repeat focus all ignored)", () => {
    const { controller, clock } = makeController();
    controller.focus("astronav");
    const frozen = controller.getState();

    controller.panBy(200, 0);
    controller.pointerDown(2, 10, 10);
    const draggingNow = controller.pointerMove(2, 400, 10);
    expect(draggingNow).toBe(false);
    expect(controller.focus("astronav")).toBe(false); // rapid repeat click (§12)
    expect(controller.getState().x).toBe(frozen.x);

    clock.advance(config.animation.focusMs + 50);
    expect(controller.sm.state).toBe("SYSTEM_ACTIVE");
  });

  it("returns to overview from SYSTEM_ACTIVE and clears the active system", () => {
    const { controller, clock } = makeController();
    controller.focus("astronav");
    clock.advance(config.animation.focusMs + 50);

    const onReturn = vi.fn();
    expect(controller.overview(onReturn)).toBe(true);
    expect(controller.sm.state).toBe("RETURNING");
    clock.advance(config.animation.returnMs + 50);

    expect(onReturn).toHaveBeenCalled();
    expect(controller.sm.state).toBe("OVERVIEW");
    expect(controller.getActiveSystem()).toBeNull();
    expect(controller.getState().x).toBeCloseTo(config.camera.overview.x, 0);
  });

  it("overview() is rejected unless a system is active", () => {
    const { controller } = makeController();
    expect(controller.overview()).toBe(false);
    expect(controller.sm.state).toBe("OVERVIEW");
  });

  it("throws on an unknown focus target", () => {
    const { controller } = makeController();
    expect(() => controller.focus("warp-core")).toThrow(/unknown target/);
  });
});

describe("CameraController resize hardening (Spec §9, §12)", () => {
  it("re-clamps the camera when the viewport shrinks mid-pan", () => {
    const { controller } = makeController();
    controller.pointerDown(1, 0, 0);
    controller.pointerMove(1, -4000, 0); // pan hard to one edge
    controller.pointerUp(1);

    controller.setViewport(1024, 768);
    const b = controller.getBounds();
    expect(controller.getState().x).toBeGreaterThanOrEqual(b.minX - 1e-6);
    expect(controller.getState().x).toBeLessThanOrEqual(b.maxX + 1e-6);
  });

  it("resize mid-focus keeps the destination within the new bounds", () => {
    const { controller, clock } = makeController();
    controller.focus("astronav");
    clock.advance(120);
    controller.setViewport(1366, 768);
    clock.advance(config.animation.focusMs + 50);
    expect(controller.sm.state).toBe("SYSTEM_ACTIVE");
    const b = controller.getBounds();
    expect(controller.getState().x).toBeGreaterThanOrEqual(b.minX - 1e-6);
    expect(controller.getState().x).toBeLessThanOrEqual(b.maxX + 1e-6);
  });
});

describe("CameraController reduced motion (Spec §28)", () => {
  it("collapses the focus tween to an immediate jump", () => {
    const { controller } = makeController(true);
    const onComplete = vi.fn();
    controller.focus("astronav", onComplete);
    // No clock advance — reducedMotionMs is 0, so it resolves synchronously.
    expect(onComplete).toHaveBeenCalledWith("astronav");
    expect(controller.sm.state).toBe("SYSTEM_ACTIVE");
  });

  it("suppresses the first-use nudge", () => {
    const { controller, applied } = makeController(true);
    const before = applied.length;
    controller.nudge();
    expect(applied.length).toBe(before);
  });
});
