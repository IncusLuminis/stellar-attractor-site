/**
 * `StubAstronavAdapter` — the Phase 1 implementation of {@link AstronavAdapter}
 * (#21). Pure DOM/TS placeholder.
 *
 * ZERO imports of Local Bubble, Three.js, or any renderer library
 * (Implementation Plan §2.3, Risk 3 — enforced by
 * `tests/astronav-no-renderer-imports.test.ts`). It renders the in-universe
 * placeholder panel and tracks a serializable `AstronavState`; it moves no
 * camera and draws no map.
 *
 * Lifecycle contract (Implementation Plan §8, Technical Architecture §5): a
 * shell can `mount` → drive → `destroy` this repeatedly with no leak, so the
 * Phase 3 cockpit focus → activate → return wiring (#32) needs no stub change.
 */

import type { AstronavAdapter, AstronavLocale, AstronavOptions, AstronavState } from "./adapter";
import { cloneAstronavState, defaultAstronavState } from "./state";
import { createAstronavView, type AstronavView } from "./view";

export class StubAstronavAdapter implements AstronavAdapter {
  #state: AstronavState = defaultAstronavState();
  #view: AstronavView | null = null;

  mount(container: HTMLElement, options: AstronavOptions = {}): void {
    // Re-mount defensively: tear any previous view down first.
    this.destroy();

    this.#state = options.initialState
      ? cloneAstronavState(options.initialState)
      : {
          ...defaultAstronavState(options.locale ?? "en"),
          focusedEntityId: options.focusedEntityId ?? null,
        };

    if (options.layers) {
      this.#state.layers = { ...this.#state.layers, ...options.layers };
    }

    this.#view = createAstronavView(container);
    this.#view.onToggleLayer = (id, enabled) => this.setLayer(id, enabled);
    this.#render();
  }

  destroy(): void {
    this.#view?.destroy();
    this.#view = null;
  }

  focusEntity(id: string): void {
    this.#state.focusedEntityId = id;
    this.#render();
  }

  setLayer(id: string, enabled: boolean): void {
    this.#state.layers = { ...this.#state.layers, [id]: enabled };
    this.#render();
  }

  setLocale(locale: AstronavLocale): void {
    this.#state.locale = locale;
    this.#render();
  }

  getState(): AstronavState {
    return cloneAstronavState(this.#state);
  }

  setState(state: AstronavState): void {
    this.#state = cloneAstronavState(state);
    this.#render();
  }

  #render(): void {
    this.#view?.render(this.#state);
  }
}

/** Factory — the sanctioned way to obtain the Phase 1 adapter. */
export function createAstronavAdapter(): AstronavAdapter {
  return new StubAstronavAdapter();
}
