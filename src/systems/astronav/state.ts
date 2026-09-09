/**
 * Astronav state helpers (#21). Pure value functions — no DOM, no renderer, no
 * `core/*` runtime imports (only the `FocusIntent` *type*, which erases at
 * build). Keeps the stub and its consumers producing identical `AstronavState`.
 */

import type { AstronavLocale, AstronavState } from "./adapter";
import type { FocusIntent } from "../../core/navigation";

/**
 * The map layers the stub knows about. Mirrors the placeholder panel's two
 * overlay lines ("LOCAL SPACE" / "COMMONWEALTH OVERLAY"); the real integration
 * (Phase 7) owns the full set (Technical Architecture §33 layer controls).
 */
export const ASTRONAV_LAYER_IDS = ["local-space", "commonwealth"] as const;

export type AstronavLayerId = (typeof ASTRONAV_LAYER_IDS)[number];

/** Human label for a layer id (system chrome — English, per #19's precedent). */
export const ASTRONAV_LAYER_LABEL: Record<AstronavLayerId, string> = {
  "local-space": "LOCAL SPACE",
  commonwealth: "COMMONWEALTH OVERLAY",
};

/** Display label for any layer id — known ids get their chrome label, unknown
 *  ids (introduced by `setState` or the Phase 7 integration) are de-slugged. */
export function layerLabel(id: string): string {
  return (
    (ASTRONAV_LAYER_LABEL as Record<string, string>)[id] ??
    id.replace(/[-_]+/g, " ").toUpperCase()
  );
}

/** A fresh "standing by" state — nothing focused, both overlays on. */
export function defaultAstronavState(locale: AstronavLocale = "en"): AstronavState {
  return {
    focusedEntityId: null,
    layers: { "local-space": true, commonwealth: true },
    locale,
  };
}

/** Deep copy so callers can't mutate the adapter's internals through a reference. */
export function cloneAstronavState(state: AstronavState): AstronavState {
  return {
    focusedEntityId: state.focusedEntityId,
    layers: { ...state.layers },
    locale: state.locale,
  };
}

/**
 * Derive the "focusing FOMALHAUT" state a deep link produces (#21; Technical
 * Architecture §33: "open Astronav / enable required layers / focus Fomalhaut").
 *
 * Only acts on a spatial `focus` intent for Astronav — any other intent yields
 * the plain default state (the caller shouldn't hand us one, but be total).
 */
export function astronavStateFromFocusIntent(
  intent: FocusIntent,
  locale: AstronavLocale = "en",
): AstronavState {
  const base = defaultAstronavState(locale);
  if (intent.action !== "focus" || intent.system !== "astronav") return base;
  return { ...base, focusedEntityId: intent.entityId };
}

/**
 * Trivial display label for an entity id: drop the `<type>.` prefix and
 * upper-case (`location.fomalhaut` → `FOMALHAUT`). The real integration
 * resolves a localized name; the stub only needs something legible.
 */
export function entityShortLabel(entityId: string): string {
  const dot = entityId.indexOf(".");
  const slug = dot === -1 ? entityId : entityId.slice(dot + 1);
  return slug.replace(/[-_]+/g, " ").toUpperCase();
}
