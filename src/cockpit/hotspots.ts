/**
 * CockpitHotspots — SVG interactive geometry in the canonical 3200x1600
 * coordinate space, so hotspots stay aligned to their terminals at every
 * responsive scale (Cockpit Interaction Prototype Specification §16-17).
 *
 * Framework- and content-independent: a hotspot only carries a `system` id and
 * geometry. Activation is reported through a callback; this module never focuses
 * the camera or fetches content itself (Spec §33-34).
 */

export interface HotspotDef {
  system: string;
  /** SVG polygon points in 3200x1600 space. */
  points: string;
  label: string;
}

export type HotspotVisualState = "idle" | "hover" | "focus" | "active" | "disabled";

export interface HotspotsOptions {
  /** The <svg class="layer-hotspots"> already mounted in the scene. */
  layer: SVGSVGElement;
  defs: HotspotDef[];
  onActivate: (system: string) => void;
}

interface HotspotEntry {
  def: HotspotDef;
  group: SVGGElement;
  shape: SVGPolygonElement;
}

const SVGNS = "http://www.w3.org/2000/svg";

export class CockpitHotspots {
  private readonly entries = new Map<string, HotspotEntry>();
  private readonly onActivate: (system: string) => void;
  private enabled = true;

  constructor(opts: HotspotsOptions) {
    this.onActivate = opts.onActivate;
    for (const def of opts.defs) this.build(opts.layer, def);
  }

  private build(layer: SVGSVGElement, def: HotspotDef): void {
    const group = document.createElementNS(SVGNS, "g");
    group.classList.add("hotspot");
    group.dataset.system = def.system;

    const shape = document.createElementNS(SVGNS, "polygon");
    shape.setAttribute("points", def.points);
    shape.setAttribute("role", "button");
    shape.setAttribute("tabindex", "0");
    shape.setAttribute("aria-label", `Open ${def.label}`);
    shape.classList.add("hotspot-shape");

    const outline = document.createElementNS(SVGNS, "polygon");
    outline.setAttribute("points", def.points);
    outline.classList.add("hotspot-outline");
    outline.setAttribute("aria-hidden", "true");

    // Small terminal label revealed on hover/focus (Spec §17).
    const bbox = polygonBBox(def.points);
    const tag = document.createElementNS(SVGNS, "text");
    tag.setAttribute("x", String(bbox.cx));
    tag.setAttribute("y", String(bbox.minY - 24));
    tag.setAttribute("text-anchor", "middle");
    tag.classList.add("hotspot-label");
    tag.setAttribute("aria-hidden", "true");
    tag.textContent = `▸ ${def.label}`;

    group.append(outline, shape, tag);
    layer.appendChild(group);

    const activate = () => {
      if (!this.enabled) return;
      this.onActivate(def.system);
    };

    shape.addEventListener("pointerenter", () => this.setState(def.system, "hover"));
    shape.addEventListener("pointerleave", () => this.setState(def.system, "idle"));
    shape.addEventListener("focus", () => this.setState(def.system, "focus"));
    shape.addEventListener("blur", () => this.setState(def.system, "idle"));
    shape.addEventListener("click", activate);
    shape.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        activate();
      }
    });

    this.entries.set(def.system, { def, group, shape });
    this.setState(def.system, "idle");
  }

  setState(system: string, state: HotspotVisualState): void {
    const entry = this.entries.get(system);
    if (!entry) return;
    for (const s of ["idle", "hover", "focus", "active", "disabled"] as HotspotVisualState[]) {
      entry.group.classList.toggle(`is-${s}`, s === state);
    }
    if (state === "disabled") {
      entry.shape.setAttribute("aria-disabled", "true");
      entry.shape.setAttribute("tabindex", "-1");
    } else {
      entry.shape.removeAttribute("aria-disabled");
      entry.shape.setAttribute("tabindex", "0");
    }
  }

  /** Spec §15 — ignore hotspot activation while a transition runs. */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    for (const [system, entry] of this.entries) {
      if (!enabled) {
        this.setState(system, "disabled");
      } else if (entry.group.classList.contains("is-disabled")) {
        this.setState(system, "idle");
      }
    }
  }

  markActive(system: string | null): void {
    for (const s of this.entries.keys()) {
      this.setState(s, s === system ? "active" : this.enabled ? "idle" : "disabled");
    }
  }

  focusHotspot(system: string): void {
    this.entries.get(system)?.shape.focus();
  }

  has(system: string): boolean {
    return this.entries.has(system);
  }
}

export function polygonBBox(points: string): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  cx: number;
  cy: number;
} {
  const nums = points
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((n) => Number.isFinite(n));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i];
    const y = nums[i + 1];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

/** Build a rectangular hotspot polygon string from a terminal rect. */
export function rectPolygon(x: number, y: number, w: number, h: number): string {
  return `${x},${y} ${x + w},${y} ${x + w},${y + h} ${x},${y + h}`;
}
