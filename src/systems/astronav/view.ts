/**
 * Astronav stub view (#21). Pure DOM — builds and updates the in-universe
 * placeholder panel from an `AstronavState`. Zero renderer / Three.js / Local
 * Bubble imports (Implementation Plan §2.3, Risk 3).
 *
 * VISUAL DESIGN: semantic, minimal, unstyled. UI_UX_Designer is parked; this is
 * re-skinned in Phase 2/3 (#24–#28). Landmarks / heading order / the layer list
 * are the load-bearing contract — appearance is not.
 *
 * System chrome ("ASTRONAVIGATION", "SYSTEM ONLINE", layer labels) stays English
 * regardless of locale, matching #19's system-chrome precedent. Only the
 * status line is localized — `setLocale` must do something visible (#21 AC).
 */

import type { AstronavLocale, AstronavState } from "./adapter";
import { ASTRONAV_LAYER_IDS, layerLabel, entityShortLabel } from "./state";

/** Status line copy, by locale. The one localized string in the stub. */
function statusLine(state: AstronavState): string {
  const { focusedEntityId, locale } = state;
  if (focusedEntityId === null) {
    return locale === "ru" ? "ОЖИДАНИЕ КОМАНДЫ" : "STANDING BY";
  }
  const label = entityShortLabel(focusedEntityId);
  return locale === "ru" ? `НАВЕДЕНИЕ НА ${label}` : `FOCUSING ${label}`;
}

function layerState(enabled: boolean, locale: AstronavLocale): string {
  if (locale === "ru") return enabled ? "ВКЛ" : "ВЫКЛ";
  return enabled ? "ON" : "OFF";
}

export interface AstronavView {
  readonly root: HTMLElement;
  render(state: AstronavState): void;
  /** Callback wired by the stub — fires when a layer toggle button is pressed. */
  onToggleLayer: ((id: string, enabled: boolean) => void) | null;
  destroy(): void;
}

/**
 * Build the panel inside `container`. Returns a handle the stub drives via
 * `render()` and tears down via `destroy()`.
 */
export function createAstronavView(container: HTMLElement): AstronavView {
  const controller = new AbortController();

  const root = container.ownerDocument.createElement("section");
  root.setAttribute("aria-label", "Astronavigation");
  root.dataset.astronavPanel = "";

  const h = container.ownerDocument.createElement("h2");
  h.textContent = "ASTRONAVIGATION";

  const online = container.ownerDocument.createElement("p");
  online.textContent = "SYSTEM ONLINE";
  online.dataset.astronavOnline = "";

  const layersList = container.ownerDocument.createElement("ul");
  layersList.setAttribute("aria-label", "Map layers");
  layersList.dataset.astronavLayers = "";

  const status = container.ownerDocument.createElement("p");
  status.setAttribute("role", "status");
  status.dataset.astronavStatus = "";

  const prototype = container.ownerDocument.createElement("p");
  prototype.textContent = "[ PROTOTYPE MODULE ]";
  prototype.dataset.astronavPrototype = "";

  root.append(h, online, layersList, status, prototype);
  container.append(root);

  const view: AstronavView = {
    root,
    onToggleLayer: null,

    render(state: AstronavState): void {
      status.textContent = statusLine(state);

      // Rebuild the layer list from state. Order: known ids first, then any
      // extra ids the real integration or a `setState` introduced.
      const known: readonly string[] = ASTRONAV_LAYER_IDS;
      const ids = [
        ...known.filter((id) => id in state.layers),
        ...Object.keys(state.layers).filter((id) => !known.includes(id)),
      ];

      layersList.replaceChildren();
      for (const id of ids) {
        const enabled = state.layers[id] === true;
        const li = container.ownerDocument.createElement("li");
        li.dataset.layerId = id;
        li.dataset.enabled = String(enabled);

        const button = container.ownerDocument.createElement("button");
        button.type = "button";
        button.dataset.astronavLayerToggle = id;
        button.setAttribute("aria-pressed", String(enabled));
        button.textContent = `${layerLabel(id)} — ${layerState(enabled, state.locale)}`;
        button.addEventListener(
          "click",
          () => view.onToggleLayer?.(id, !enabled),
          { signal: controller.signal },
        );

        li.append(button);
        layersList.append(li);
      }
    },

    destroy(): void {
      controller.abort();
      root.remove();
      view.onToggleLayer = null;
    },
  };

  return view;
}
