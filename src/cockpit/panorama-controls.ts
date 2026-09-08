/**
 * PanoramaControls — visible ◀ ▶ buttons plus keyboard navigation, as an
 * accessible non-drag alternative (Cockpit Interaction Prototype Specification
 * §23, §35).
 *
 * Keyboard is active ONLY while the cockpit interaction area (or a control /
 * hotspot inside it) is focused — no global browser-key hijacking (§35).
 */

import type { CameraController } from "./camera-controller";

export interface PanoramaControlsOptions {
  /** Container the ◀ ▶ buttons are appended to (usually the viewport wrapper). */
  root: HTMLElement;
  /** The element whose focus-within gates keyboard handling. */
  interactionArea: HTMLElement;
  controller: CameraController;
  stepPx: number;
  /** Enter/Space on the focused hotspot is handled by the hotspot itself; this
   *  is the fallback "activate the astronav terminal" when the bare area has focus. */
  onActivatePrimary?: () => void;
}

export class PanoramaControls {
  private readonly opts: PanoramaControlsOptions;
  private readonly left: HTMLButtonElement;
  private readonly right: HTMLButtonElement;
  private readonly keyHandler: (e: KeyboardEvent) => void;

  constructor(opts: PanoramaControlsOptions) {
    this.opts = opts;

    const bar = document.createElement("div");
    bar.className = "panorama-controls";

    this.left = this.makeButton("◀", "Look left", () => this.step(-1));
    this.right = this.makeButton("▶", "Look right", () => this.step(1));
    bar.append(this.left, this.right);
    opts.root.appendChild(bar);

    this.keyHandler = (e: KeyboardEvent) => this.onKeyDown(e);
    opts.interactionArea.addEventListener("keydown", this.keyHandler);
  }

  private makeButton(glyph: string, label: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "panorama-control";
    b.textContent = glyph;
    b.setAttribute("aria-label", label);
    b.addEventListener("click", onClick);
    return b;
  }

  private step(direction: -1 | 1): void {
    // Camera x is negative when looking right, so "look right" is a negative dx.
    this.opts.controller.stepBy(-direction * this.opts.stepPx);
  }

  private onKeyDown(e: KeyboardEvent): void {
    const ctrl = this.opts.controller;
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        this.step(-1);
        break;
      case "ArrowRight":
        e.preventDefault();
        this.step(1);
        break;
      // Escape -> return is handled at document level by DesktopShell, because
      // once the SystemOverlay opens, focus moves to the RETURN button which is
      // a sibling of the cockpit interaction area, not a descendant, so a keydown
      // there never reaches this scoped listener (Spec §20, §35).
      case "Enter":
      case " ":
      case "Spacebar": {
        const t = e.target as HTMLElement | null;
        // Let the hotspot / button handle its own activation.
        if (t && (t.classList.contains("hotspot-shape") || t.tagName === "BUTTON")) return;
        if (ctrl.sm.canActivateHotspot()) {
          e.preventDefault();
          this.opts.onActivatePrimary?.();
        }
        break;
      }
    }
  }

  setEnabled(enabled: boolean): void {
    this.left.disabled = !enabled;
    this.right.disabled = !enabled;
  }

  destroy(): void {
    this.opts.interactionArea.removeEventListener("keydown", this.keyHandler);
  }
}
