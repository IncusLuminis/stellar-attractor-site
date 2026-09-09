/**
 * Preact wrapper that mounts the Astronav stub as an Astro island (#21),
 * mirroring `src/components/CockpitIsland.tsx`.
 *
 * The component owns nothing but the lifecycle: on mount it calls the vanilla
 * `mountAstronav` shim, on unmount it tears it down. All panel / state / locale
 * logic lives in plain TS under `src/systems/astronav/`.
 *
 * Rendered `client:load` from `/astronav` (the stub *is* that route's content)
 * and `client:idle` from `/location/[slug]` (an additive panel below the
 * server-rendered record). `focusIntent` is a plain serializable value passed
 * from `.astro` frontmatter — see `src/core/navigation/README.md`.
 *
 * VISUAL DESIGN: semantic, unstyled — re-skinned in Phase 2/3.
 */
import { useEffect, useRef } from "preact/hooks";
import type { FocusIntent } from "../../core/navigation";
import { mountAstronav } from "./mount";

interface Props {
  focusIntent?: FocusIntent | null;
}

export default function AstronavIsland({ focusIntent = null }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const handle = mountAstronav(host, { focusIntent });
    return () => handle.destroy();
  }, []);

  return <div ref={hostRef} data-astronav-host />;
}
