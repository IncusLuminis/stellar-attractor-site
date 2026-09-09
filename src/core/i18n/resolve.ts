/**
 * Locale resolution (#20 AC 2 & 3, Implementation Plan §7.2).
 *
 * Precedence, highest first:
 *   1. `?lang=` query param  — honoured for shareable links, and *persisted*
 *   2. stored preference     — `localStorage` (`sa:locale`)
 *   3. default               — `en`
 *
 * An invalid `?lang=` value (`?lang=fr`, `?lang=`, `?lang=EN`) is ignored and
 * resolution falls through to the next tier. Same for a corrupt stored value.
 *
 * This module is pure — no `window`, no `localStorage` access. Callers pass the
 * raw query string and the raw stored value; `store.ts` wires it to the browser.
 */

import { DEFAULT_LOCALE, LOCALE_QUERY_PARAM, isLocale, type Locale } from "./types";

export type LocaleSource = "query" | "stored" | "default";

export interface LocaleResolution {
  locale: Locale;
  source: LocaleSource;
  /** True when the resolution came from `?lang=` and should be written back. */
  shouldPersist: boolean;
}

export interface ResolveLocaleInput {
  /** `location.search` (with or without leading `?`), a `URLSearchParams`, or `URL`. */
  search?: string | URLSearchParams | URL | null;
  /** Raw value read from `localStorage` (may be `null` / garbage). */
  stored?: string | null;
  /** Override the default locale (tests). */
  fallback?: Locale;
}

/** Extract a valid `lang` param, or `null` if absent/invalid. */
export function parseLangParam(
  search: string | URLSearchParams | URL | null | undefined,
): Locale | null {
  if (search == null) return null;

  let params: URLSearchParams;
  if (search instanceof URLSearchParams) {
    params = search;
  } else if (search instanceof URL) {
    params = search.searchParams;
  } else {
    params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  }

  const raw = params.get(LOCALE_QUERY_PARAM);
  return isLocale(raw) ? raw : null;
}

export function resolveLocale(input: ResolveLocaleInput = {}): LocaleResolution {
  const fallback = input.fallback ?? DEFAULT_LOCALE;

  const fromQuery = parseLangParam(input.search);
  if (fromQuery) {
    return { locale: fromQuery, source: "query", shouldPersist: true };
  }

  if (isLocale(input.stored)) {
    return { locale: input.stored, source: "stored", shouldPersist: false };
  }

  return { locale: fallback, source: "default", shouldPersist: false };
}
