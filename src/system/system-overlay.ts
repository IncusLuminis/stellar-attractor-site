/**
 * SystemOverlay — desktop HUD frame that expands/fades in after the camera
 * focus completes, wrapping the shared system content and the in-world RETURN
 * control (Cockpit Interaction Prototype Specification §19-20).
 */

import { buildSystemContent } from "./system-content";

export interface SystemOverlayOptions {
  root: HTMLElement;
  onReturn: () => void;
}

export class SystemOverlay {
  private readonly root: HTMLElement;
  private readonly onReturn: () => void;
  private el: HTMLDivElement | null = null;
  private returnBtn: HTMLButtonElement | null = null;

  constructor(opts: SystemOverlayOptions) {
    this.root = opts.root;
    this.onReturn = opts.onReturn;
  }

  get isOpen(): boolean {
    return this.el !== null;
  }

  open(system: string): void {
    if (this.el) this.close();

    const el = document.createElement("div");
    el.className = "system-overlay";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "false");
    el.setAttribute("aria-label", `${system} system`);

    const frame = document.createElement("div");
    frame.className = "system-overlay-frame";

    const header = document.createElement("div");
    header.className = "system-overlay-header";
    header.textContent = "TERMINAL ACTIVE";
    frame.appendChild(header);

    frame.appendChild(buildSystemContent({ system }));

    const ret = document.createElement("button");
    ret.type = "button";
    ret.className = "system-overlay-return";
    ret.textContent = "RETURN — BACK TO MAIN OPERATIONS";
    ret.addEventListener("click", () => this.onReturn());
    frame.appendChild(ret);
    this.returnBtn = ret;

    el.appendChild(frame);
    this.root.appendChild(el);
    this.el = el;

    // Trigger the expand/fade-in on next frame.
    requestAnimationFrame(() => el.classList.add("is-open"));
    ret.focus();
  }

  /** Disable RETURN until the return transition is valid (Spec §15). */
  setReturnEnabled(enabled: boolean): void {
    if (this.returnBtn) this.returnBtn.disabled = !enabled;
  }

  close(): void {
    if (!this.el) return;
    const el = this.el;
    this.el = null;
    this.returnBtn = null;
    el.classList.remove("is-open");
    window.setTimeout(() => el.remove(), 320);
  }
}
