/**
 * Cockpit camera configuration types + a runtime validator.
 *
 * This module is framework-independent and app-agnostic (Cockpit Interaction
 * Prototype Specification §32-33). It knows nothing about Astronav / Personnel /
 * Fleet content — only camera geometry and timing. The concrete values live in
 * the standalone data file `config/cockpit.json` (Spec §40.3).
 */

export interface CameraPose {
  x: number;
  y: number;
  scale: number;
}

export interface SceneConfig {
  width: number;
  height: number;
  viewBox?: string;
}

export interface BoundsConfig {
  model?: string;
  /** Scene stays at least this many times wider than the viewport. */
  minHorizontalOverflowRatio: number;
  /** Half-band of vertical travel as a fraction of viewport height. 0 = locked. */
  verticalPanRatio: number;
  maxScale: number;
}

export interface AnimationConfig {
  focusMs: number;
  returnMs: number;
  easing: string;
  arrowStepPx: number;
  arrowStepMs: number;
  nudgePx: number;
  nudgeMs: number;
  reducedMotionMs: number;
}

export interface InertiaConfig {
  enabled: boolean;
  friction: number;
  minVelocity: number;
  maxDurationMs: number;
}

export interface InteractionConfig {
  dragThresholdPx: number;
  inertia: InertiaConfig;
}

export interface ResponsiveConfig {
  compactBreakpointPx: number;
}

export interface CockpitConfig {
  version?: string;
  scene: SceneConfig;
  camera: {
    overview: CameraPose;
    targets: Record<string, CameraPose>;
    bounds: BoundsConfig;
  };
  animation: AnimationConfig;
  interaction: InteractionConfig;
  responsive: ResponsiveConfig;
}

function num(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`cockpit config: ${path} must be a finite number`);
  }
  return value;
}

function pose(value: unknown, path: string): CameraPose {
  const v = value as Record<string, unknown> | undefined;
  if (!v || typeof v !== "object") {
    throw new Error(`cockpit config: ${path} must be an object`);
  }
  const scale = num(v.scale, `${path}.scale`);
  if (scale <= 0) throw new Error(`cockpit config: ${path}.scale must be > 0`);
  return { x: num(v.x, `${path}.x`), y: num(v.y, `${path}.y`), scale };
}

/**
 * Validate an untyped object (e.g. a JSON import) into a CockpitConfig.
 * Throws with a precise path on the first problem rather than letting a bad
 * value surface later as NaN in the transform.
 */
export function parseCockpitConfig(raw: unknown): CockpitConfig {
  const r = raw as any;
  if (!r || typeof r !== "object") {
    throw new Error("cockpit config: root must be an object");
  }

  const scene: SceneConfig = {
    width: num(r.scene?.width, "scene.width"),
    height: num(r.scene?.height, "scene.height"),
    viewBox: typeof r.scene?.viewBox === "string" ? r.scene.viewBox : undefined,
  };
  if (scene.width <= 0 || scene.height <= 0) {
    throw new Error("cockpit config: scene.width and scene.height must be > 0");
  }

  const targetsRaw = r.camera?.targets ?? {};
  const targets: Record<string, CameraPose> = {};
  for (const key of Object.keys(targetsRaw)) {
    targets[key] = pose(targetsRaw[key], `camera.targets.${key}`);
  }
  if (!targets.astronav) {
    throw new Error("cockpit config: camera.targets.astronav is required");
  }

  const boundsRaw = r.camera?.bounds ?? {};
  const bounds: BoundsConfig = {
    model: typeof boundsRaw.model === "string" ? boundsRaw.model : "cover",
    minHorizontalOverflowRatio: num(
      boundsRaw.minHorizontalOverflowRatio,
      "camera.bounds.minHorizontalOverflowRatio",
    ),
    verticalPanRatio: num(boundsRaw.verticalPanRatio, "camera.bounds.verticalPanRatio"),
    maxScale: num(boundsRaw.maxScale, "camera.bounds.maxScale"),
  };
  if (bounds.minHorizontalOverflowRatio < 1) {
    throw new Error("cockpit config: camera.bounds.minHorizontalOverflowRatio must be >= 1");
  }

  const a = r.animation ?? {};
  const animation: AnimationConfig = {
    focusMs: num(a.focusMs, "animation.focusMs"),
    returnMs: num(a.returnMs, "animation.returnMs"),
    easing: typeof a.easing === "string" ? a.easing : "ease-in-out",
    arrowStepPx: num(a.arrowStepPx, "animation.arrowStepPx"),
    arrowStepMs: num(a.arrowStepMs, "animation.arrowStepMs"),
    nudgePx: num(a.nudgePx, "animation.nudgePx"),
    nudgeMs: num(a.nudgeMs, "animation.nudgeMs"),
    reducedMotionMs: num(a.reducedMotionMs, "animation.reducedMotionMs"),
  };

  const i = r.interaction ?? {};
  const inertiaRaw = i.inertia ?? {};
  const interaction: InteractionConfig = {
    dragThresholdPx: num(i.dragThresholdPx, "interaction.dragThresholdPx"),
    inertia: {
      enabled: Boolean(inertiaRaw.enabled),
      friction: typeof inertiaRaw.friction === "number" ? inertiaRaw.friction : 0.86,
      minVelocity: typeof inertiaRaw.minVelocity === "number" ? inertiaRaw.minVelocity : 0.05,
      maxDurationMs:
        typeof inertiaRaw.maxDurationMs === "number" ? inertiaRaw.maxDurationMs : 600,
    },
  };
  if (interaction.dragThresholdPx < 1) {
    throw new Error("cockpit config: interaction.dragThresholdPx must be >= 1");
  }

  const responsive: ResponsiveConfig = {
    compactBreakpointPx: num(r.responsive?.compactBreakpointPx, "responsive.compactBreakpointPx"),
  };

  return {
    version: typeof r.version === "string" ? r.version : undefined,
    scene,
    camera: {
      overview: pose(r.camera?.overview, "camera.overview"),
      targets,
      bounds,
    },
    animation,
    interaction,
    responsive,
  };
}
