/**
 * CameraController — owns camera position, scale, bounds, drag state,
 * transitions and focus targets (Cockpit Interaction Prototype Specification
 * §8, §9, §13-15, §33). It must NOT know about Personnel / Astronav / Fleet
 * data or localization — it only ever receives a target *name* and looks the
 * pose up in the injected config.
 *
 * Nothing in this file imports app or framework code. The pure helpers
 * (`computeBounds`, `clampCamera`, `resolveDragIntent`, `easeInOutCubic`) are
 * exported for unit testing.
 */

import type { CameraPose, CockpitConfig } from "./config";
import { CockpitStateMachine } from "./state-machine";

export interface CameraState {
  x: number;
  y: number;
  scale: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface CameraBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  /** The scale actually applied after viewport-driven clamping. */
  scale: number;
}

export type DragIntent = "drag" | "click";

// --------------------------------------------------------------------------
// Pure helpers (unit-tested)
// --------------------------------------------------------------------------

export function clamp(value: number, min: number, max: number): number {
  if (min > max) return (min + max) / 2;
  return value < min ? min : value > max ? max : value;
}

/**
 * The minimum scale at which the scene still overflows the viewport enough for
 * panning to be useful (Spec §6, §25) and still fully covers it vertically.
 */
export function minScaleForViewport(
  scene: Size,
  viewport: Size,
  minHorizontalOverflowRatio: number,
): number {
  const horizontal = (viewport.width * minHorizontalOverflowRatio) / scene.width;
  const vertical = viewport.height / scene.height;
  return Math.max(horizontal, vertical);
}

/**
 * Compute clamp bounds for the camera translate from scene size, viewport size
 * and requested scale. No hardcoded per-viewport numbers (Spec §9).
 * `transform-origin` is the scene's top-left corner.
 */
export function computeBounds(
  scene: Size,
  viewport: Size,
  requestedScale: number,
  opts: { minHorizontalOverflowRatio: number; verticalPanRatio: number; maxScale: number },
): CameraBounds {
  const minScale = minScaleForViewport(scene, viewport, opts.minHorizontalOverflowRatio);
  const scale = clamp(requestedScale, minScale, Math.max(minScale, opts.maxScale));

  const scaledW = scene.width * scale;
  const scaledH = scene.height * scale;

  let minX: number;
  let maxX: number;
  if (scaledW <= viewport.width) {
    minX = maxX = (viewport.width - scaledW) / 2;
  } else {
    minX = viewport.width - scaledW;
    maxX = 0;
  }

  let minY: number;
  let maxY: number;
  if (scaledH <= viewport.height) {
    minY = maxY = (viewport.height - scaledH) / 2;
  } else {
    const centeredY = (viewport.height - scaledH) / 2;
    const band = opts.verticalPanRatio * viewport.height;
    minY = Math.max(viewport.height - scaledH, centeredY - band);
    maxY = Math.min(0, centeredY + band);
  }

  return { minX, maxX, minY, maxY, scale };
}

export function clampCamera(state: CameraState, bounds: CameraBounds): CameraState {
  return {
    x: clamp(state.x, bounds.minX, bounds.maxX),
    y: clamp(state.y, bounds.minY, bounds.maxY),
    scale: bounds.scale,
  };
}

/**
 * Decide whether a pointer gesture was a click or a drag (Spec §11). This is
 * critical: terminals are clickable objects inside a draggable scene, so a
 * sub-threshold wobble on a terminal must still count as a click.
 */
export function resolveDragIntent(
  dx: number,
  dy: number,
  thresholdPx: number,
): DragIntent {
  return Math.hypot(dx, dy) >= thresholdPx ? "drag" : "click";
}

/** Controlled mechanical easing — monotonic, no overshoot / bounce (Spec §14). */
export function easeInOutCubic(t: number): number {
  const c = clamp(t, 0, 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

// --------------------------------------------------------------------------
// Controller
// --------------------------------------------------------------------------

export interface CameraControllerOptions {
  config: CockpitConfig;
  viewport: Size;
  /** Called on every applied camera state — the harness writes CSS vars here. */
  onApply: (state: CameraState) => void;
  /** Test seam. Defaults to the real scheduler / clock. */
  scheduler?: {
    raf: (cb: (t: number) => void) => number;
    caf: (h: number) => void;
    now: () => number;
  };
  /** Test seam — defaults to matchMedia when present. */
  prefersReducedMotion?: () => boolean;
}

const defaultScheduler = {
  raf:
    typeof requestAnimationFrame === "function"
      ? requestAnimationFrame.bind(globalThis)
      : (cb: (t: number) => void) => setTimeout(() => cb(Date.now()), 16) as unknown as number,
  caf:
    typeof cancelAnimationFrame === "function"
      ? cancelAnimationFrame.bind(globalThis)
      : (h: number) => clearTimeout(h),
  now: () => (typeof performance !== "undefined" ? performance.now() : Date.now()),
};

export class CameraController {
  readonly sm = new CockpitStateMachine("BOOT");

  private readonly cfg: CockpitConfig;
  private readonly scene: Size;
  private readonly onApply: (state: CameraState) => void;
  private readonly scheduler: NonNullable<CameraControllerOptions["scheduler"]>;
  private readonly reducedMotion: () => boolean;

  private viewport: Size;
  private state: CameraState;
  private bounds: CameraBounds;

  private activeTween: number | null = null;
  private tweenTo: CameraState | null = null;
  private tweenDoneCb: (() => void) | null = null;

  // Pointer / drag session
  private pointerId: number | null = null;
  private pointerStart = { x: 0, y: 0 };
  private pointerLast = { x: 0, y: 0, t: 0 };
  private camAtPointerStart: CameraState = { x: 0, y: 0, scale: 1 };
  private dragging = false;
  private velocity = { x: 0, y: 0 };

  private activeSystem: string | null = null;
  private nudgeUsed = false;

  constructor(opts: CameraControllerOptions) {
    this.cfg = opts.config;
    this.scene = { width: this.cfg.scene.width, height: this.cfg.scene.height };
    this.onApply = opts.onApply;
    this.viewport = { ...opts.viewport };
    this.scheduler = opts.scheduler ?? defaultScheduler;
    this.reducedMotion =
      opts.prefersReducedMotion ??
      (() =>
        typeof matchMedia === "function" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches);

    const ov = this.cfg.camera.overview;
    this.bounds = this.recalcBounds(ov.scale);
    this.state = clampCamera({ ...ov }, this.bounds);
  }

  // ---- lifecycle -------------------------------------------------------

  /** BOOT -> OVERVIEW. Applies the initial camera state. */
  boot(): void {
    this.sm.send("READY");
    this.snapTo(clampCamera({ ...this.cfg.camera.overview }, this.bounds));
  }

  getState(): CameraState {
    return { ...this.state };
  }

  getBounds(): CameraBounds {
    return { ...this.bounds };
  }

  getActiveSystem(): string | null {
    return this.activeSystem;
  }

  // ---- viewport / resize --------------------------------------------------

  setViewport(width: number, height: number): void {
    this.viewport = { width, height };
    // Re-clamp any in-flight tween destination and the current position so a
    // resize mid-drag / mid-focus cannot leave the scene out of bounds (Spec §9, §12).
    if (this.tweenTo) {
      this.tweenTo = clampCamera(this.tweenTo, this.recalcBounds(this.tweenTo.scale));
    }
    this.apply({ ...this.state });
    if (this.dragging && this.pointerId !== null) {
      // Rebase the drag so the scene doesn't jump under the pointer.
      this.pointerStart = { x: this.pointerLast.x, y: this.pointerLast.y };
      this.camAtPointerStart = { ...this.state };
    }
  }

  private recalcBounds(scale: number): CameraBounds {
    return computeBounds(this.scene, this.viewport, scale, {
      minHorizontalOverflowRatio: this.cfg.camera.bounds.minHorizontalOverflowRatio,
      verticalPanRatio: this.cfg.camera.bounds.verticalPanRatio,
      maxScale: this.cfg.camera.bounds.maxScale,
    });
  }

  // ---- manual pan -------------------------------------------------------

  panBy(dx: number, dy: number): void {
    if (this.sm.isInputLocked()) return;
    this.apply(
      clampCamera({ x: this.state.x + dx, y: this.state.y + dy, scale: this.state.scale }, this.bounds),
    );
  }

  panTo(x: number, y: number): void {
    if (this.sm.isInputLocked()) return;
    this.apply(clampCamera({ x, y, scale: this.state.scale }, this.bounds));
  }

  /** Arrow / panorama-control step: one bounded, animated increment (Spec §23). */
  stepBy(dx: number): void {
    if (this.sm.isInputLocked() || !this.sm.canManualPan()) return;
    const dest = clampCamera(
      { x: this.state.x + dx, y: this.state.y, scale: this.state.scale },
      this.bounds,
    );
    this.tween(dest, this.cfg.animation.arrowStepMs);
  }

  // ---- pointer drag (Spec §10, §11, §12, §31) --------------------------

  pointerDown(pointerId: number, clientX: number, clientY: number): void {
    if (this.sm.isInputLocked()) return;
    this.cancelTween();
    this.pointerId = pointerId;
    this.pointerStart = { x: clientX, y: clientY };
    this.pointerLast = { x: clientX, y: clientY, t: this.scheduler.now() };
    this.camAtPointerStart = { ...this.state };
    this.dragging = false;
    this.velocity = { x: 0, y: 0 };
  }

  /** Returns true once the gesture has crossed the drag threshold. */
  pointerMove(pointerId: number, clientX: number, clientY: number): boolean {
    if (this.pointerId !== pointerId || this.sm.isInputLocked()) return this.dragging;

    const dx = clientX - this.pointerStart.x;
    const dy = clientY - this.pointerStart.y;

    if (!this.dragging) {
      if (resolveDragIntent(dx, dy, this.cfg.interaction.dragThresholdPx) === "click") {
        return false;
      }
      this.dragging = true;
      this.sm.send("DRAG_START");
    }

    const now = this.scheduler.now();
    const dt = Math.max(1, now - this.pointerLast.t);
    this.velocity = {
      x: (clientX - this.pointerLast.x) / dt,
      y: (clientY - this.pointerLast.y) / dt,
    };
    this.pointerLast = { x: clientX, y: clientY, t: now };

    // Only a transform update per move — no layout reads (Spec §31).
    this.apply(
      clampCamera(
        {
          x: this.camAtPointerStart.x + dx,
          y: this.camAtPointerStart.y + dy,
          scale: this.state.scale,
        },
        this.bounds,
      ),
    );
    return true;
  }

  /** Ends the gesture. Returns whether it was a click or a drag (Spec §11). */
  pointerUp(pointerId: number): DragIntent {
    if (this.pointerId !== pointerId) return "click";
    const wasDragging = this.dragging;
    this.pointerId = null;
    this.dragging = false;

    if (!wasDragging) return "click";

    this.sm.send("DRAG_END");
    this.startInertia();
    return "drag";
  }

  pointerCancel(pointerId: number): void {
    if (this.pointerId !== pointerId) return;
    this.pointerId = null;
    if (this.dragging) {
      this.dragging = false;
      this.sm.send("DRAG_END");
    }
  }

  private startInertia(): void {
    const cfg = this.cfg.interaction.inertia;
    if (!cfg.enabled) return;
    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    if (speed < cfg.minVelocity) return;
    if (this.reducedMotion()) return;

    let vx = this.velocity.x * 16; // px per ~frame
    let vy = this.velocity.y * 16;
    const start = this.scheduler.now();

    const step = () => {
      if (this.sm.state !== "OVERVIEW") return;
      const elapsed = this.scheduler.now() - start;
      if (elapsed > cfg.maxDurationMs) return;
      vx *= cfg.friction;
      vy *= cfg.friction;
      if (Math.hypot(vx, vy) < 0.4) return;
      const next = clampCamera(
        { x: this.state.x + vx, y: this.state.y + vy, scale: this.state.scale },
        this.bounds,
      );
      // Soft boundary stop (Spec §12).
      if (next.x === this.state.x) vx = 0;
      if (next.y === this.state.y) vy = 0;
      this.apply(next);
      this.activeTween = this.scheduler.raf(step);
    };
    this.activeTween = this.scheduler.raf(step);
  }

  // ---- automatic focus / return (Spec §13, §14, §15, §34) --------------

  /**
   * Focus a named target. The controller does not fetch content — it only
   * animates and, on completion, hands control back via `onFocusComplete`.
   */
  focus(name: string, onFocusComplete?: (name: string) => void): boolean {
    if (!this.sm.canActivateHotspot()) return false;
    const pose = this.cfg.camera.targets[name];
    if (!pose) throw new Error(`camera focus: unknown target "${name}"`);
    if (!this.sm.send("FOCUS")) return false;

    const destBounds = this.recalcBounds(pose.scale);
    const dest = clampCamera(poseToState(pose), destBounds);
    this.tween(dest, this.cfg.animation.focusMs, () => {
      this.bounds = destBounds;
      this.sm.send("TRANSITION_END"); // FOCUSING -> SYSTEM_ACTIVE
      this.activeSystem = name;
      onFocusComplete?.(name);
    });
    return true;
  }

  /** Return the camera to overview (Spec §20). */
  overview(onReturnComplete?: () => void): boolean {
    if (!this.sm.canReturn()) return false;
    if (!this.sm.send("RETURN")) return false;

    const ov = this.cfg.camera.overview;
    const destBounds = this.recalcBounds(ov.scale);
    const dest = clampCamera(poseToState(ov), destBounds);
    this.tween(dest, this.cfg.animation.returnMs, () => {
      this.bounds = destBounds;
      this.sm.send("TRANSITION_END"); // RETURNING -> OVERVIEW
      this.activeSystem = null;
      onReturnComplete?.();
    });
    return true;
  }

  // ---- first-use nudge (Spec §21 D) -----------------------------------

  /** One-time ~20-30px nudge and back. No-op if reduced motion or already used. */
  nudge(): void {
    if (this.nudgeUsed || this.reducedMotion() || this.sm.state !== "OVERVIEW") return;
    this.nudgeUsed = true;
    const px = this.cfg.animation.nudgePx;
    const origin = { ...this.state };
    const out = clampCamera(
      { x: this.state.x - px, y: this.state.y, scale: this.state.scale },
      this.bounds,
    );
    this.tween(out, this.cfg.animation.nudgeMs / 2, () => {
      this.tween(origin, this.cfg.animation.nudgeMs / 2);
    });
  }

  // ---- tween plumbing -------------------------------------------------

  private tween(dest: CameraState, durationMs: number, done?: () => void): void {
    this.cancelTween();

    const duration = this.reducedMotion()
      ? this.cfg.animation.reducedMotionMs
      : durationMs;

    if (duration <= 0) {
      this.tweenTo = dest;
      this.apply(dest);
      this.finishTween(done);
      return;
    }

    const from = { ...this.state };
    const start = this.scheduler.now();
    this.tweenTo = dest;
    this.tweenDoneCb = done ?? null;

    const frame = () => {
      const now = this.scheduler.now();
      const p = clamp((now - start) / duration, 0, 1);
      const e = easeInOutCubic(p);
      const target = this.tweenTo ?? dest;
      const next: CameraState = {
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        scale: from.scale + (target.scale - from.scale) * e,
      };
      this.apply(next);
      if (p >= 1) {
        this.finishTween(this.tweenDoneCb ?? undefined);
        return;
      }
      this.activeTween = this.scheduler.raf(frame);
    };
    this.activeTween = this.scheduler.raf(frame);
  }

  private finishTween(done?: () => void): void {
    this.activeTween = null;
    const dest = this.tweenTo;
    this.tweenTo = null;
    this.tweenDoneCb = null;
    if (dest) this.apply(dest);
    done?.();
  }

  private cancelTween(): void {
    if (this.activeTween !== null) {
      this.scheduler.caf(this.activeTween);
      this.activeTween = null;
    }
    this.tweenTo = null;
    this.tweenDoneCb = null;
  }

  private snapTo(state: CameraState): void {
    this.cancelTween();
    this.apply(state);
  }

  private apply(state: CameraState): void {
    // Recompute bounds for the (possibly mid-tween interpolated) scale and clamp
    // every applied frame, so a scale change or a viewport change underneath an
    // in-flight tween can never drift the scene out of bounds (Spec §9, §12, §15).
    const b = this.recalcBounds(state.scale);
    this.bounds = b;
    this.state = clampCamera(state, b);
    this.onApply(this.getState());
  }
}

function poseToState(pose: CameraPose): CameraState {
  return { x: pose.x, y: pose.y, scale: pose.scale };
}
