/**
 * MobileShell — BASE #32 REMOTE TERMINAL (Cockpit Interaction Prototype
 * Specification §26-27). A distinct shell, NOT a shrunken cockpit: no camera,
 * no panorama, no drag. It reuses the same shared system content component as
 * the desktop overlay (Spec §27, §39).
 */

import { buildSystemContent } from "../system/system-content";

export interface MobileShellOptions {
  root: HTMLElement;
}

export class MobileShell {
  private readonly frame: HTMLDivElement;
  private readonly terminalView: HTMLDivElement;
  private readonly systemView: HTMLDivElement;

  constructor(opts: MobileShellOptions) {
    this.frame = document.createElement("div");
    this.frame.className = "mobile-shell";

    this.terminalView = document.createElement("div");
    this.terminalView.className = "remote-terminal";
    this.terminalView.innerHTML = `
      <h1 class="remote-terminal-title">BASE #32</h1>
      <p class="remote-terminal-sub">REMOTE ACCESS</p>
      <div class="remote-terminal-section">
        <p class="remote-terminal-heading">SYSTEMS</p>
        <button type="button" class="remote-terminal-btn" data-system="astronav">[ ASTRONAVIGATION ]</button>
        <button type="button" class="remote-terminal-btn" data-system="database">[ DATABASE ]</button>
      </div>
      <div class="remote-terminal-section">
        <p class="remote-terminal-heading">STATUS</p>
        <p class="remote-terminal-line">CONNECTED</p>
        <p class="remote-terminal-line">GUEST CLEARANCE</p>
      </div>`;

    this.systemView = document.createElement("div");
    this.systemView.className = "remote-system";
    this.systemView.hidden = true;

    this.frame.append(this.terminalView, this.systemView);
    opts.root.appendChild(this.frame);

    this.terminalView.querySelectorAll<HTMLButtonElement>(".remote-terminal-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.openSystem(btn.dataset.system ?? "astronav"));
    });
  }

  private openSystem(system: string): void {
    // No camera animation on mobile (Spec §27).
    this.systemView.innerHTML = "";
    this.systemView.appendChild(buildSystemContent({ system }));

    const back = document.createElement("button");
    back.type = "button";
    back.className = "remote-system-return";
    back.textContent = "RETURN";
    back.addEventListener("click", () => this.closeSystem());
    this.systemView.appendChild(back);

    this.terminalView.hidden = true;
    this.systemView.hidden = false;
    back.focus();
  }

  private closeSystem(): void {
    this.systemView.hidden = true;
    this.systemView.innerHTML = "";
    this.terminalView.hidden = false;
  }

  destroy(): void {
    this.frame.remove();
  }
}
