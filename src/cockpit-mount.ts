/**
 * Cockpit mount shim — the Phase 0 `src/main.ts` harness, folded into the Astro
 * app as a plain function the island calls.
 *
 * Responsibilities are deliberately thin (Spec §26, Implementation Plan §2.2):
 *   - load the standalone camera config (config/cockpit.json)
 *   - pick DesktopShell vs MobileShell by a behavioural breakpoint
 *   - swap shells if the viewport crosses that breakpoint
 *   - return a teardown handle so the island can clean up on unmount
 *
 * This file is framework-independent vanilla TS. It is NOT under src/cockpit/
 * (it wires shells together and is app-specific), but like everything under
 * src/cockpit/ it imports nothing from `astro:*` or any Astro runtime.
 * Everything reusable lives under src/cockpit/ and src/system/.
 */

import "./styles/cockpit.css";
import rawConfig from "../config/cockpit.json";
import { parseCockpitConfig } from "./cockpit/config";
import { DesktopShell } from "./shells/desktop-shell";
import { MobileShell } from "./shells/mobile-shell";

export interface CockpitHandle {
  destroy(): void;
}

type Mode = "desktop" | "mobile";

const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function mountCockpit(mount: HTMLElement): CockpitHandle {
  const config = parseCockpitConfig(rawConfig);

  // `?shell=mobile` / `?shell=desktop` forces a shell for QA and the §37
  // usability test on hardware whose width does not naturally cross the
  // breakpoint.
  const forcedShell = new URLSearchParams(location.search).get("shell");

  const currentMode = (): Mode => {
    if (forcedShell === "mobile" || forcedShell === "desktop") return forcedShell;
    return window.innerWidth <= config.responsive.compactBreakpointPx
      ? "mobile"
      : "desktop";
  };

  let mode: Mode | null = null;
  let shell: DesktopShell | MobileShell | null = null;

  const render = (next: Mode): void => {
    if (next === mode) return;
    shell?.destroy();
    mount.innerHTML = "";
    mode = next;
    shell =
      next === "desktop"
        ? new DesktopShell({ root: mount, config, prefersReducedMotion })
        : new MobileShell({ root: mount });
    document.body.dataset.mode = next;
  };

  render(currentMode());

  let resizeRaf = 0;
  const onResize = (): void => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => render(currentMode()));
  };
  window.addEventListener("resize", onResize);

  return {
    destroy(): void {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(resizeRaf);
      shell?.destroy();
      shell = null;
      mode = null;
      mount.innerHTML = "";
      delete document.body.dataset.mode;
    },
  };
}
