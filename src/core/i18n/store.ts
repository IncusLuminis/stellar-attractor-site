/**
 * Client-side locale store (#20 AC 2 & 5).
 *
 * A tiny observable holding the active locale. Framework-independent — the
 * Preact `LocaleSwitch` island and the `boot` entry both consume this; nothing
 * here imports app or framework code.
 *
 * SSR note: at build time (`output: "static"`, no adapter) pages are prerendered
 * in the DEFAULT locale (`en`). `initLocale()` runs once on the client after
 * hydration, resolves the real preference (`?lang=` > stored > `en`) and — only
 * if it differs — swaps the visible text via `dom.applyLocaleToDocument`. See
 * `README.md` for why "render en, client-swap" over prerendering `/ru/`.
 */

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, isLocale, type Locale } from "./types";
import { resolveLocale, type LocaleResolution } from "./resolve";

type Listener = (locale: Locale) => void;

let current: Locale = DEFAULT_LOCALE;
let initialised = false;
const listeners = new Set<Listener>();

/* -------------------------------------------------------------------------- */
/*  Safe storage access — private windows / disabled storage throw            */
/* -------------------------------------------------------------------------- */

function readStored(storage?: Storage): string | null {
  try {
    return (storage ?? window.localStorage).getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(locale: Locale, storage?: Storage): void {
  try {
    (storage ?? window.localStorage).setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* preference simply won't persist this session */
  }
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export function getLocale(): Locale {
  return current;
}

/**
 * Set the active locale and notify subscribers. Persists by default; pass
 * `{ persist: false }` for a transient change (e.g. previewing).
 * A no-op (and no notification) when the locale is unchanged.
 */
export function setLocale(next: Locale, options: { persist?: boolean } = {}): void {
  if (!isLocale(next) || next === current) return;
  current = next;
  if (options.persist !== false && typeof window !== "undefined") {
    writeStored(next);
  }
  for (const listener of listeners) listener(next);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Resolve the preference on first client load and adopt it.
 *
 * - `?lang=ru|en` wins and is written back to `localStorage` (shareable links).
 * - otherwise a valid stored preference wins.
 * - otherwise `en`.
 *
 * Idempotent: only the first call resolves; later calls return the current
 * locale. Does NOT notify subscribers (there is no "previous" locale to diff on
 * a fresh page) — the caller applies the initial locale to the DOM directly.
 */
export function initLocale(
  options: { search?: string | URLSearchParams | URL; storage?: Storage } = {},
): Locale {
  if (initialised) return current;
  initialised = true;

  const search =
    options.search ?? (typeof window !== "undefined" ? window.location.search : "");

  const resolution: LocaleResolution = resolveLocale({
    search,
    stored: readStored(options.storage),
  });

  current = resolution.locale;
  if (resolution.shouldPersist && typeof window !== "undefined") {
    writeStored(resolution.locale, options.storage);
  }
  return current;
}

/** Test seam — reset module state between cases. */
export function __resetLocaleStore(): void {
  current = DEFAULT_LOCALE;
  initialised = false;
  listeners.clear();
}
