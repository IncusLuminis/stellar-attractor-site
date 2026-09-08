/**
 * First-use discovery (Cockpit Interaction Prototype Specification §21-22, §28).
 *
 * Signals provided:
 *   A. Cropped console at a viewport edge  — supplied by the scene layout.
 *   B. "DRAG TO LOOK AROUND" instruction    — this module.
 *   C. cursor: grab                         — CSS on the viewport.
 *   D. one-time 20-30px nudge               — CameraController.nudge(), called here.
 *
 * The hint is dismissed on the first successful drag, an explicit dismissal, or
 * opening a terminal, and never permanently obstructs the scene.
 */

import type { CameraController } from "./camera-controller";

export interface DiscoveryOptions {
  root: HTMLElement;
  controller: CameraController;
  text?: string;
  /** e.g. RU equivalent, shown under the primary line if provided. */
  secondaryText?: string;
  prefersReducedMotion?: () => boolean;
}

export class Discovery {
  private readonly el: HTMLDivElement;
  private readonly controller: CameraController;
  private readonly reducedMotion: () => boolean;
  private dismissed = false;
  private nudgeTimer: number | null = null;

  constructor(opts: DiscoveryOptions) {
    this.controller = opts.controller;
    this.reducedMotion =
      opts.prefersReducedMotion ??
      (() =>
        typeof matchMedia === "function" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches);

    this.el = document.createElement("div");
    this.el.className = "cockpit-hint";
    this.el.setAttribute("role", "status");

    const primary = document.createElement("span");
    primary.className = "cockpit-hint-primary";
    primary.textContent = opts.text ?? "DRAG TO LOOK AROUND";
    this.el.appendChild(primary);

    if (opts.secondaryText) {
      const secondary = document.createElement("span");
      secondary.className = "cockpit-hint-secondary";
      secondary.textContent = opts.secondaryText;
      this.el.appendChild(secondary);
    }

    const close = document.createElement("button");
    close.type = "button";
    close.className = "cockpit-hint-dismiss";
    close.setAttribute("aria-label", "Dismiss hint");
    close.textContent = "×";
    close.addEventListener("click", () => this.dismiss());
    this.el.appendChild(close);

    opts.root.appendChild(this.el);
  }

  /** Fire the optional one-time nudge shortly after load (Spec §21 D, §28). */
  scheduleNudge(delayMs = 900): void {
    if (this.reducedMotion()) return;
    this.nudgeTimer = window.setTimeout(() => {
      if (!this.dismissed) this.controller.nudge();
    }, delayMs);
  }

  dismiss(): void {
    if (this.dismissed) return;
    this.dismissed = true;
    if (this.nudgeTimer !== null) {
      clearTimeout(this.nudgeTimer);
      this.nudgeTimer = null;
    }
    this.el.classList.add("is-dismissed");
    // Remove from the layout entirely once faded so it can never obstruct.
    window.setTimeout(() => this.el.remove(), 400);
  }

  get isDismissed(): boolean {
    return this.dismissed;
  }

  destroy(): void {
    if (this.nudgeTimer !== null) clearTimeout(this.nudgeTimer);
    this.el.remove();
  }
}
