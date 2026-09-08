/**
 * DesktopShell — the panoramic cockpit environment. Wires the framework-
 * independent cockpit modules together and enforces the Spec §34 flow:
 *
 *   hotspot activate
 *     -> navigation request
 *     -> camera.focus("astronav")
 *     -> transition complete
 *     -> setActiveSystem("astronav")   [ open SystemOverlay ]
 *
 * The camera never fetches content; the system content never drives the camera.
 */

import { CameraController, type CameraControllerOptions } from "../cockpit/camera-controller";
import type { CockpitConfig } from "../cockpit/config";
import { CockpitScene, getTerminal } from "../cockpit/scene";
import { CockpitHotspots, rectPolygon } from "../cockpit/hotspots";
import { Discovery } from "../cockpit/discovery";
import { PanoramaControls } from "../cockpit/panorama-controls";
import { SystemOverlay } from "../system/system-overlay";

export interface DesktopShellOptions {
  root: HTMLElement;
  config: CockpitConfig;
  prefersReducedMotion?: () => boolean;
  /** Test seam — forwarded to the CameraController's animation scheduler. */
  scheduler?: CameraControllerOptions["scheduler"];
}

const PRIMARY_SYSTEM = "astronav";

export class DesktopShell {
  private readonly controller: CameraController;
  private readonly scene: CockpitScene;
  private readonly hotspots: CockpitHotspots;
  private readonly discovery: Discovery;
  private readonly panorama: PanoramaControls;
  private readonly overlay: SystemOverlay;
  private readonly frame: HTMLDivElement;
  private readonly reducedMotion: () => boolean;
  private disposed = false;

  constructor(opts: DesktopShellOptions) {
    const rm =
      opts.prefersReducedMotion ??
      (() =>
        typeof matchMedia === "function" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches);
    this.reducedMotion = rm;

    this.frame = document.createElement("div");
    this.frame.className = "desktop-shell";
    opts.root.appendChild(this.frame);

    const initialViewport = {
      width: this.frame.clientWidth || window.innerWidth,
      height: this.frame.clientHeight || window.innerHeight,
    };

    // scene is assigned just below; the guard covers the constructor-time apply.
    this.controller = new CameraController({
      config: opts.config,
      viewport: initialViewport,
      prefersReducedMotion: rm,
      scheduler: opts.scheduler,
      onApply: (state) => this.scene?.applyTransform(state),
    });

    this.scene = new CockpitScene({
      root: this.frame,
      config: opts.config,
      controller: this.controller,
      onSceneClick: () => {
        /* clicks that miss a hotspot do nothing in the spike */
      },
      onFirstDrag: () => this.discovery.dismiss(),
    });

    const astro = getTerminal(PRIMARY_SYSTEM);
    this.hotspots = new CockpitHotspots({
      layer: this.scene.hotspotLayer,
      defs: [
        {
          system: PRIMARY_SYSTEM,
          points: rectPolygon(astro.x, astro.y, astro.width, astro.height),
          label: astro.label,
        },
      ],
      onActivate: (system) => this.requestSystem(system),
    });

    this.discovery = new Discovery({
      root: this.frame,
      controller: this.controller,
      text: "DRAG TO LOOK AROUND",
      secondaryText: "ОСМОТРИТЕСЬ — ПОТЯНИТЕ",
      prefersReducedMotion: rm,
    });

    this.panorama = new PanoramaControls({
      root: this.frame,
      interactionArea: this.scene.viewport,
      controller: this.controller,
      stepPx: opts.config.animation.arrowStepPx,
      onActivatePrimary: () => this.requestSystem(PRIMARY_SYSTEM),
    });

    this.overlay = new SystemOverlay({
      root: this.frame,
      onReturn: () => this.requestReturn(),
    });

    // Keep controls / hotspots in step with the state machine (input lock, §15).
    this.controller.sm.onChange(() => this.syncInputLock());

    this.controller.boot();
    this.syncInputLock();

    if (!this.reducedMotion()) this.discovery.scheduleNudge(opts.config.animation.nudgeMs);

    window.addEventListener("resize", this.onResize);
    // Escape -> return must work even when focus has moved to the RETURN button
    // (a sibling of the cockpit area, not a descendant), so it is bound at
    // document level rather than on the scoped cockpit keydown listener
    // (Spec §20, §35). Arrow-key panning stays scoped to the focused cockpit.
    document.addEventListener("keydown", this.onDocumentKeyDown);
  }

  private onResize = (): void => {
    const { width, height } = this.scene.measureViewport();
    if (width > 0 && height > 0) this.controller.setViewport(width, height);
  };

  private onDocumentKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== "Escape" || this.disposed) return;
    // Do not steal Escape from a focused editable control, if any are added later.
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (!this.controller.sm.canReturn()) return;
    e.preventDefault();
    this.requestReturn();
  };

  /** Spec §34: hotspot -> navigation request -> camera.focus -> ... */
  private requestSystem(system: string): void {
    if (this.disposed) return;
    if (!this.controller.sm.canActivateHotspot()) return; // guards rapid repeat clicks (§12, §15)
    this.discovery.dismiss();

    const started = this.controller.focus(system, (name) => {
      // transition complete -> setActiveSystem
      this.hotspots.markActive(name);
      this.overlay.open(name);
      this.syncInputLock();
    });
    if (started) this.syncInputLock();
  }

  private requestReturn(): void {
    if (this.disposed) return;
    if (!this.controller.sm.canReturn()) return;
    this.overlay.close();
    const started = this.controller.overview(() => {
      this.hotspots.markActive(null);
      this.scene.focusViewport();
      this.syncInputLock();
    });
    if (started) this.syncInputLock();
  }

  private syncInputLock(): void {
    const sm = this.controller.sm;
    const locked = sm.isInputLocked();
    this.hotspots.setEnabled(!locked && sm.canActivateHotspot());
    this.panorama.setEnabled(!locked && sm.canManualPan());
    this.overlay.setReturnEnabled(sm.canReturn());
    this.scene.viewport.classList.toggle("is-locked", locked);
    this.scene.viewport.classList.toggle("is-system-active", sm.is("SYSTEM_ACTIVE"));
  }

  destroy(): void {
    this.disposed = true;
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("keydown", this.onDocumentKeyDown);
    this.panorama.destroy();
    this.discovery.destroy();
    this.overlay.close();
    this.scene.destroy();
    this.frame.remove();
  }
}
