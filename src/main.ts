/**
 * Throwaway harness entry point for the Phase 0 cockpit spike.
 *
 * Responsibilities kept deliberately thin (Spec §26, Implementation Plan §2.2):
 *   - load the standalone camera config (config/cockpit.json)
 *   - pick DesktopShell vs MobileShell by a behavioural breakpoint
 *   - swap shells if the viewport crosses that breakpoint
 *
 * Everything reusable lives under src/cockpit/ and src/system/.
 */

import "./style.css";
import rawConfig from "../config/cockpit.json";
import { parseCockpitConfig } from "./cockpit/config";
import { DesktopShell } from "./shells/desktop-shell";
import { MobileShell } from "./shells/mobile-shell";

const config = parseCockpitConfig(rawConfig);
const mount = document.getElementById("app");
if (!mount) throw new Error("harness: #app mount point missing");

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Mode = "desktop" | "mobile";

// `?shell=mobile` / `?shell=desktop` forces a shell for QA and the §37 usability
// test on hardware whose width does not naturally cross the breakpoint.
const forcedShell = new URLSearchParams(location.search).get("shell");

function currentMode(): Mode {
  if (forcedShell === "mobile" || forcedShell === "desktop") return forcedShell;
  return window.innerWidth <= config.responsive.compactBreakpointPx ? "mobile" : "desktop";
}

let mode: Mode | null = null;
let shell: DesktopShell | MobileShell | null = null;

function render(next: Mode): void {
  if (next === mode) return;
  shell?.destroy();
  mount!.innerHTML = "";
  mode = next;
  shell =
    next === "desktop"
      ? new DesktopShell({ root: mount!, config, prefersReducedMotion })
      : new MobileShell({ root: mount! });
  document.body.dataset.mode = next;
}

render(currentMode());

let resizeRaf = 0;
window.addEventListener("resize", () => {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => render(currentMode()));
});
