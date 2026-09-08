/**
 * Preact wrapper that mounts the framework-independent cockpit into the page as
 * an Astro island (Implementation Plan §1 decision 3, §2.1).
 *
 * The component owns nothing but the lifecycle: on mount it calls the vanilla
 * `mountCockpit` shim, on unmount it tears it down. All camera / scene / hotspot
 * / shell logic lives in plain TS under src/cockpit/, src/shells/, src/system/.
 *
 * Rendered with `client:idle` from src/pages/index.astro, so the ~4 KB Preact
 * runtime plus the cockpit chunk load only on the cockpit route and only once
 * the browser is idle — a plain content route ships zero JS.
 */
import { useEffect, useRef } from "preact/hooks";
import { mountCockpit } from "../cockpit-mount";

export default function CockpitIsland() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const handle = mountCockpit(host);
    return () => handle.destroy();
  }, []);

  return <div ref={hostRef} class="cockpit-root" data-cockpit-host />;
}
