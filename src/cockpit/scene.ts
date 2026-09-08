/**
 * CockpitScene — builds the layered DOM/SVG scene, applies the camera transform
 * via CSS custom properties, and translates Pointer Events into CameraController
 * calls (Cockpit Interaction Prototype Specification §5-7, §10, §14, §31).
 *
 * Placeholder artwork is drawn entirely in code (SVG shapes + gradients +
 * labelled rectangles) on the canonical `0 0 3200 1600` canvas (Spec §29).
 * No image assets are loaded — that is Media_keeper's job for a later phase.
 */

import type { CameraController, CameraState } from "./camera-controller";
import type { CockpitConfig } from "./config";

export interface TerminalRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  /** Colour hint for the placeholder screen. */
  tint: string;
}

/**
 * Prototype-only placeholder terminal layout on the 3200x1600 canvas.
 * ASTRONAV sits right-of-centre so that at the overview it is only partially
 * inside a 1920-wide viewport (Spec §6). SENSORS sits far right so part of a
 * console is always cropped at the viewport edge as a discovery cue (Spec §21A).
 */
export const SCENE_TERMINALS: TerminalRect[] = [
  { id: "comms", x: 120, y: 620, width: 360, height: 520, label: "COMMS", tint: "#1f6f7a" },
  { id: "helm", x: 720, y: 780, width: 720, height: 560, label: "HELM CONTROL", tint: "#22515f" },
  { id: "lifesupport", x: 1180, y: 470, width: 360, height: 360, label: "LIFE SUPPORT", tint: "#2a4a44" },
  { id: "astronav", x: 1740, y: 470, width: 400, height: 620, label: "ASTRONAVIGATION", tint: "#2f6f8f" },
  { id: "engineering", x: 2280, y: 560, width: 380, height: 520, label: "ENGINEERING", tint: "#5a4a2a" },
  { id: "sensors", x: 2820, y: 640, width: 300, height: 520, label: "SENSORS", tint: "#3a3a5a" },
];

export function getTerminal(id: string): TerminalRect {
  const t = SCENE_TERMINALS.find((x) => x.id === id);
  if (!t) throw new Error(`scene: unknown terminal "${id}"`);
  return t;
}

const SVGNS = "http://www.w3.org/2000/svg";

function el<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

export interface SceneOptions {
  root: HTMLElement;
  config: CockpitConfig;
  controller: CameraController;
  /** Called when a pointer gesture that started on the scene ended as a click. */
  onSceneClick?: (clientX: number, clientY: number) => void;
  /** Called the first time a real drag completes (Spec §22 — hint dismissal). */
  onFirstDrag?: () => void;
}

export class CockpitScene {
  readonly viewport: HTMLDivElement;
  readonly scene: HTMLDivElement;
  readonly hotspotLayer: SVGSVGElement;

  private readonly controller: CameraController;
  private readonly cfg: CockpitConfig;
  private readonly opts: SceneOptions;
  private resizeObserver: ResizeObserver | null = null;
  private firstDragSeen = false;

  constructor(opts: SceneOptions) {
    this.opts = opts;
    this.controller = opts.controller;
    this.cfg = opts.config;

    this.viewport = document.createElement("div");
    this.viewport.className = "cockpit-viewport";
    this.viewport.tabIndex = 0;
    this.viewport.setAttribute("role", "application");
    this.viewport.setAttribute("aria-label", "Base 32 cockpit — drag or use arrow keys to look around");

    this.scene = document.createElement("div");
    this.scene.className = "cockpit-scene";
    this.scene.style.width = `${this.cfg.scene.width}px`;
    this.scene.style.height = `${this.cfg.scene.height}px`;

    this.scene.appendChild(this.buildBackgroundLayer());
    this.scene.appendChild(this.buildDecorativeHudLayer());
    this.hotspotLayer = this.buildHotspotLayer();
    this.scene.appendChild(this.hotspotLayer);
    this.scene.appendChild(this.buildForegroundLayer());

    this.viewport.appendChild(this.scene);
    opts.root.appendChild(this.viewport);

    this.attachPointer();
    this.attachResize();
    this.applyTransform(this.controller.getState());
  }

  /** Write the camera state into CSS custom properties (Spec §7). */
  applyTransform(state: CameraState): void {
    this.scene.style.setProperty("--camera-x", `${state.x}px`);
    this.scene.style.setProperty("--camera-y", `${state.y}px`);
    this.scene.style.setProperty("--camera-scale", `${state.scale}`);
  }

  measureViewport(): { width: number; height: number } {
    const r = this.viewport.getBoundingClientRect();
    return { width: r.width, height: r.height };
  }

  focusViewport(): void {
    this.viewport.focus();
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.viewport.remove();
  }

  // ---- layers --------------------------------------------------------

  private layerSvg(className: string): SVGSVGElement {
    const svg = el("svg", {
      viewBox: this.cfg.scene.viewBox ?? `0 0 ${this.cfg.scene.width} ${this.cfg.scene.height}`,
      preserveAspectRatio: "xMidYMid slice",
      "aria-hidden": "true",
    });
    svg.classList.add("cockpit-layer", className);
    return svg;
  }

  private buildBackgroundLayer(): SVGSVGElement {
    const svg = this.layerSvg("layer-background");
    const defs = el("defs", {});
    defs.innerHTML = `
      <linearGradient id="sa-bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#04121c"/>
        <stop offset="0.55" stop-color="#02090f"/>
        <stop offset="1" stop-color="#01050a"/>
      </linearGradient>
      <radialGradient id="sa-viewport-glow" cx="0.5" cy="0.38" r="0.7">
        <stop offset="0" stop-color="#0a2e3f" stop-opacity="0.9"/>
        <stop offset="1" stop-color="#02090f" stop-opacity="0"/>
      </radialGradient>`;
    svg.appendChild(defs);
    svg.appendChild(el("rect", { x: 0, y: 0, width: 3200, height: 1600, fill: "url(#sa-bg)" }));
    // Canopy "window" onto starfield.
    svg.appendChild(el("rect", { x: 240, y: 60, width: 2720, height: 430, rx: 40, fill: "#00050b" }));
    svg.appendChild(el("rect", { x: 240, y: 60, width: 2720, height: 430, rx: 40, fill: "url(#sa-viewport-glow)" }));
    for (let i = 0; i < 90; i++) {
      const cx = 260 + Math.round(2680 * ((i * 97) % 100) / 100);
      const cy = 80 + Math.round(390 * ((i * 53) % 100) / 100);
      const r = (i % 7 === 0) ? 2.4 : 1.2;
      svg.appendChild(el("circle", { cx, cy, r, fill: "#bfefff", "fill-opacity": (i % 5 === 0 ? 0.9 : 0.5) }));
    }
    // Canopy frame ribs.
    for (const x of [600, 1000, 1400, 1800, 2200, 2600]) {
      svg.appendChild(el("line", { x1: x, y1: 60, x2: x, y2: 490, stroke: "#0c3547", "stroke-width": 6 }));
    }
    return svg;
  }

  private buildDecorativeHudLayer(): SVGSVGElement {
    const svg = this.layerSvg("layer-hud");
    // Restrained ambient HUD — most of it is static (Implementation Plan §6).
    svg.appendChild(el("rect", { x: 40, y: 40, width: 3120, height: 1520, rx: 18, fill: "none", stroke: "#123", "stroke-width": 2 }));
    for (const cx of [160, 3040]) {
      svg.appendChild(el("circle", { cx, cy: 800, r: 90, fill: "none", stroke: "#1b5566", "stroke-width": 3, "stroke-dasharray": "6 10" }));
    }
    const scan = el("line", { x1: 240, y1: 275, x2: 2960, y2: 275, stroke: "#164b5a", "stroke-width": 2 });
    scan.classList.add("hud-scanline");
    svg.appendChild(scan);
    svg.appendChild(el("text", { x: 260, y: 540, fill: "#3f8ea0", "font-size": 22, "font-family": "monospace", "letter-spacing": 4 })).textContent =
      "BASE #32 — FORWARD OPERATIONS DECK";
    return svg;
  }

  private buildHotspotLayer(): SVGSVGElement {
    const svg = el("svg", {
      viewBox: this.cfg.scene.viewBox ?? `0 0 ${this.cfg.scene.width} ${this.cfg.scene.height}`,
      preserveAspectRatio: "xMidYMid slice",
    });
    svg.classList.add("cockpit-layer", "layer-hotspots");
    svg.setAttribute("aria-label", "Cockpit systems");

    // Placeholder terminal bodies (decorative — the interactive geometry is the
    // <polygon> added by the hotspots module, aligned to the astronav rect).
    for (const t of SCENE_TERMINALS) {
      const g = el("g", {});
      g.classList.add("terminal-body");
      g.dataset.terminal = t.id;
      g.appendChild(el("rect", { x: t.x, y: t.y, width: t.width, height: t.height, rx: 16, fill: "#050d14", stroke: "#0f3a48", "stroke-width": 3 }));
      g.appendChild(el("rect", { x: t.x + 22, y: t.y + 22, width: t.width - 44, height: t.height - 96, rx: 8, fill: t.tint, "fill-opacity": 0.35, stroke: "#1c6076", "stroke-width": 2 }));
      const label = el("text", { x: t.x + t.width / 2, y: t.y + t.height - 30, fill: "#6fc7d8", "font-size": 26, "font-family": "monospace", "text-anchor": "middle", "letter-spacing": 3 });
      label.textContent = t.label;
      g.appendChild(label);
      svg.appendChild(g);
    }
    return svg;
  }

  private buildForegroundLayer(): SVGSVGElement {
    const svg = this.layerSvg("layer-foreground");
    // Dashboard lip along the bottom — reads as "inside the cockpit".
    const path = el("path", {
      d: "M0,1600 L0,1360 C 700,1250 2500,1250 3200,1360 L3200,1600 Z",
      fill: "#02080d",
      stroke: "#0c3242",
      "stroke-width": 4,
    });
    svg.appendChild(path);
    for (let x = 120; x < 3200; x += 180) {
      svg.appendChild(el("circle", { cx: x, cy: 1470, r: 6, fill: "#123f4d" }));
    }
    return svg;
  }

  // ---- pointer wiring (Spec §10, §31) --------------------------------

  private attachPointer(): void {
    const vp = this.viewport;

    vp.addEventListener("pointerdown", (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      if (this.controller.sm.isInputLocked()) return;
      vp.setPointerCapture(e.pointerId);
      this.controller.pointerDown(e.pointerId, e.clientX, e.clientY);
      vp.classList.add("is-grabbing");
    });

    vp.addEventListener("pointermove", (e: PointerEvent) => {
      const dragging = this.controller.pointerMove(e.pointerId, e.clientX, e.clientY);
      if (dragging) e.preventDefault();
    });

    const end = (e: PointerEvent) => {
      if (vp.hasPointerCapture?.(e.pointerId)) vp.releasePointerCapture(e.pointerId);
      vp.classList.remove("is-grabbing");
      const intent = this.controller.pointerUp(e.pointerId);
      if (intent === "drag") {
        if (!this.firstDragSeen) {
          this.firstDragSeen = true;
          this.opts.onFirstDrag?.();
        }
      } else {
        this.opts.onSceneClick?.(e.clientX, e.clientY);
      }
    };
    vp.addEventListener("pointerup", end);
    vp.addEventListener("pointercancel", (e: PointerEvent) => {
      vp.classList.remove("is-grabbing");
      this.controller.pointerCancel(e.pointerId);
    });
  }

  private attachResize(): void {
    const push = () => {
      const { width, height } = this.measureViewport();
      if (width > 0 && height > 0) {
        this.controller.setViewport(width, height);
        this.applyTransform(this.controller.getState());
      }
    };
    if (typeof ResizeObserver === "function") {
      this.resizeObserver = new ResizeObserver(push);
      this.resizeObserver.observe(this.viewport);
    } else {
      window.addEventListener("resize", push);
    }
    push();
  }
}
