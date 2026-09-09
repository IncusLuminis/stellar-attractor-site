/**
 * Astronav mount shim (#21) — the vanilla-TS core the `AstronavIsland` Preact
 * wrapper calls, mirroring `src/cockpit-mount.ts`.
 *
 * Responsibilities, deliberately thin:
 *   - instantiate the Phase 1 stub adapter;
 *   - mount it in the page's current locale (from the `core/i18n` store);
 *   - if the route handed over a spatial `FocusIntent`, bring the stub up in the
 *     matching "focusing <ENTITY>" state (Technical Architecture §33 deep links);
 *   - keep the stub's locale in sync with the RUS/ENG switch;
 *   - return a teardown handle.
 *
 * Framework-independent: imports the stub, the i18n store, and the `FocusIntent`
 * *type* only. No Astro runtime, no Preact, no renderer.
 */

import { getLocale, subscribe } from "../../core/i18n/store";
import type { Locale } from "../../core/i18n/types";
import type { FocusIntent } from "../../core/navigation";
import type { AstronavAdapter } from "./adapter";
import { astronavStateFromFocusIntent } from "./state";
import { createAstronavAdapter } from "./stub";

export interface AstronavMountOptions {
  /** Deep-link focus intent from the route, or `null` for the bare `/astronav`. */
  focusIntent?: FocusIntent | null;
  /** Override the initial locale (defaults to the live `core/i18n` locale). */
  locale?: Locale;
}

export interface AstronavHandle {
  readonly adapter: AstronavAdapter;
  destroy(): void;
}

/** `true` for a `focus` intent aimed at Astronav — the only kind the stub acts on. */
function isAstronavFocus(intent: FocusIntent | null | undefined): intent is FocusIntent {
  return !!intent && intent.action === "focus" && intent.system === "astronav";
}

export function mountAstronav(
  container: HTMLElement,
  options: AstronavMountOptions = {},
): AstronavHandle {
  const locale = options.locale ?? getLocale();
  const adapter = createAstronavAdapter();

  const intent = options.focusIntent ?? null;
  if (isAstronavFocus(intent)) {
    adapter.mount(container, { initialState: astronavStateFromFocusIntent(intent, locale) });
  } else {
    adapter.mount(container, { locale });
  }

  // Follow the RUS/ENG switch (cross-chunk-safe store — see core/i18n/README).
  const unsubscribe = subscribe((next) => adapter.setLocale(next));

  return {
    adapter,
    destroy(): void {
      unsubscribe();
      adapter.destroy();
    },
  };
}
