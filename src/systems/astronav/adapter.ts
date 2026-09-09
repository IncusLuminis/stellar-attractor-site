/**
 * `AstronavAdapter` — the Astronavigation integration boundary (#21).
 *
 * Defined VERBATIM per Implementation Plan v0.1 §8 and Technical Architecture
 * §30. Stellar Attractor must never reach past this interface into Local Bubble
 * internals: whether the eventual implementation is an imported package, a
 * shared component, an `<iframe>`/embed or a microfrontend must not matter to
 * the rest of the app (Technical Architecture §30).
 *
 * Phase 1 ships ONE implementation of this interface — the pure-DOM stub in
 * `./stub.ts`. When Phase 7 (Epic #55, #56–#60) commissions the real
 * `localbubble-site` embed, ONLY the implementation behind this interface
 * changes; `/astronav`, `/location/[slug]`, the Phase 3 cockpit wiring and every
 * test here keep working unchanged.
 *
 * `AstronavOptions` and `AstronavState` are deliberately plain, JSON-
 * serializable value types — they cross the island prop boundary and, later, a
 * `postMessage` bridge.
 */

/** The two first-class locales (mirrors `core/i18n` `Locale`, kept local so the
 *  adapter surface has no cross-module type dependency — it is the contract a
 *  third-party embed implements). */
export type AstronavLocale = "ru" | "en";

/**
 * Serializable snapshot of the Astronav view. Round-trips through
 * `getState()` / `setState()` and is what `AppState.astronavState` holds
 * (Technical Architecture §6).
 */
export interface AstronavState {
  /** `<type>.<slug>` id of the focused entity, or `null` when nothing is focused. */
  focusedEntityId: string | null;
  /** Map-layer id → enabled. Open-ended: the real integration owns the layer set. */
  layers: Record<string, boolean>;
  /** Active display locale. */
  locale: AstronavLocale;
}

/**
 * Options passed to `mount()`. All optional — an unconfigured mount comes up in
 * the default "standing by" state.
 */
export interface AstronavOptions {
  /** Locale to come up in. Defaults to `"en"`. */
  locale?: AstronavLocale;
  /** Full initial state. Takes precedence over `locale` / `focusedEntityId`. */
  initialState?: AstronavState;
  /** Entity to focus on mount (shorthand for a one-field `initialState`). */
  focusedEntityId?: string | null;
  /** Layers to enable on mount (merged over the defaults). */
  layers?: Record<string, boolean>;
}

/**
 * The Astronavigation integration boundary. See Implementation Plan §8 /
 * Technical Architecture §30 — this shape is fixed.
 */
export interface AstronavAdapter {
  /** Attach the view to `container`. Idempotent teardown via {@link destroy}. */
  mount(container: HTMLElement, options: AstronavOptions): void;
  /** Detach: remove every listener and all DOM. Safe to call more than once. */
  destroy(): void;
  /** Focus an entity by `<type>.<slug>` id (camera move + panel open in Phase 7). */
  focusEntity(id: string): void;
  /** Toggle a map layer. */
  setLayer(id: string, enabled: boolean): void;
  /** Change the display locale. */
  setLocale(locale: AstronavLocale): void;
  /** Current serializable state. */
  getState(): AstronavState;
  /** Replace the state wholesale and re-render. */
  setState(state: AstronavState): void;
}
