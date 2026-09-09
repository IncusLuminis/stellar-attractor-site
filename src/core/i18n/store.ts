/**
 * Client-side locale store (#20 AC 2 & 5).
 *
 * A tiny observable holding the active locale. Framework-independent — the
 * Preact `LocaleSwitch` island and the inlined `boot` entry both consume this;
 * nothing here imports app or framework code.
 *
 * ── Why a runtime singleton, not module state (Validator #74 finding 1) ──
 * `boot.ts` is bundled + inlined into the page `<head>`; a `client:*` island
 * (`LocaleSwitch`, mounted later by #19/#26) is a SEPARATE Vite chunk. Astro/
 * Vite do not share module instances across those two graphs, so a plain
 * module-level `let current` would be instantiated twice — the island would
 * never see `boot`'s `initLocale()` result or fire `boot`'s document-sync
 * subscriber, and clicking the switch would not swap text.
 *
 * The state therefore lives on `globalThis` (=== `window` in the browser, where
 * both chunks execute) behind a shared `EventTarget`. Every accessor reads
 * `globalThis` fresh — no chunk caches its own reference. This is the same
 * problem nanostores solves; a ~30-line global is enough here and adds no dep.
 *
 * SSR note: at build time (`output: "static"`, no adapter) pages are prerendered
 * in the DEFAULT locale (`en`) and this module is never executed server-side.
 * `initLocale()` runs once on the client after hydration and swaps text only.
 */

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, isLocale, type Locale } from "./types";
import { resolveLocale, type LocaleResolution } from "./resolve";

type Listener = (locale: Locale) => void;

interface SharedLocaleState {
  locale: Locale;
  initialised: boolean;
  events: EventTarget;
}

const CHANGE_EVENT = "sa:locale-change";

declare global {
  // eslint-disable-next-line no-var
  var __saI18nStore__: SharedLocaleState | undefined;
}

/** The one shared state object — created once, then reused by every chunk. */
function shared(): SharedLocaleState {
  let state = globalThis.__saI18nStore__;
  if (!state) {
    state = { locale: DEFAULT_LOCALE, initialised: false, events: new EventTarget() };
    globalThis.__saI18nStore__ = state;
  }
  return state;
}

/* -------------------------------------------------------------------------- */
/*  Safe storage access — private windows / disabled storage throw            */
/* -------------------------------------------------------------------------- */

function readStored(storage?: Storage): string | null {
  try {
    const s = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
    return s ? s.getItem(LOCALE_STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

function writeStored(locale: Locale, storage?: Storage): void {
  try {
    const s = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
    s?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* preference simply won't persist this session */
  }
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export function getLocale(): Locale {
  return shared().locale;
}

/**
 * Set the active locale and notify subscribers (across every chunk). Persists by
 * default; pass `{ persist: false }` for a transient change. A no-op (and no
 * notification) when the locale is unchanged or invalid.
 */
export function setLocale(next: Locale, options: { persist?: boolean } = {}): void {
  const state = shared();
  if (!isLocale(next) || next === state.locale) return;
  state.locale = next;
  if (options.persist !== false && typeof window !== "undefined") {
    writeStored(next);
  }
  state.events.dispatchEvent(new CustomEvent<Locale>(CHANGE_EVENT, { detail: next }));
}

export function subscribe(listener: Listener): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<Locale>).detail);
  const { events } = shared();
  events.addEventListener(CHANGE_EVENT, handler);
  return () => events.removeEventListener(CHANGE_EVENT, handler);
}

/**
 * Resolve the preference on first client load and adopt it.
 *
 * - `?lang=ru|en` wins and is written back to `localStorage` (shareable links).
 * - otherwise a valid stored preference wins.
 * - otherwise `en`.
 *
 * Idempotent across every chunk: only the first call (anywhere) resolves; later
 * calls return the current locale. Does NOT notify subscribers — the caller
 * applies the initial locale to the DOM directly.
 */
export function initLocale(
  options: { search?: string | URLSearchParams | URL; storage?: Storage } = {},
): Locale {
  const state = shared();
  if (state.initialised) return state.locale;
  state.initialised = true;

  const search =
    options.search ?? (typeof window !== "undefined" ? window.location.search : "");

  const resolution: LocaleResolution = resolveLocale({
    search,
    stored: readStored(options.storage),
  });

  state.locale = resolution.locale;
  if (resolution.shouldPersist && typeof window !== "undefined") {
    writeStored(resolution.locale, options.storage);
  }
  return state.locale;
}

/** Test seam — reset the shared store between cases. */
export function __resetLocaleStore(): void {
  globalThis.__saI18nStore__ = {
    locale: DEFAULT_LOCALE,
    initialised: false,
    events: new EventTarget(),
  };
}
