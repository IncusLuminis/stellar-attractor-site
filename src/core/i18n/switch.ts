/**
 * State-preserving locale switch (#20 AC 5 & 6, Product Vision §22).
 *
 * Switching language re-renders localized TEXT only. Selected entity, cockpit
 * camera, scroll position and system/app state are never read or written here.
 *
 * `switchLocale` returns the *same* app-state object reference it was given,
 * untouched — callers that hold `AppState` (Technical Architecture §6) can pass
 * it through to make the "nothing else changed" contract explicit and testable.
 */

import { getLocale, setLocale, subscribe } from "./store";
import { applyLocaleToDocument } from "./dom";
import { otherLocale, type Locale } from "./types";

export interface SwitchLocaleOptions {
  persist?: boolean;
  /** Skip the DOM text swap (tests / non-DOM environments). */
  applyToDocument?: boolean;
}

/**
 * Set the active locale, swap visible text, and hand back `appState` unchanged.
 * @returns the identical `appState` reference (same object, same contents).
 */
export function switchLocale<T>(
  next: Locale,
  appState: T,
  options: SwitchLocaleOptions = {},
): T {
  setLocale(next, { persist: options.persist });
  if (options.applyToDocument !== false) {
    applyLocaleToDocument(next);
  }
  return appState;
}

/** Flip to the other locale, preserving `appState`. */
export function toggleLocale<T>(appState: T, options?: SwitchLocaleOptions): T {
  return switchLocale(otherLocale(getLocale()), appState, options);
}

/**
 * Keep the document's text in sync with the store for the lifetime of a page.
 * `boot.ts` calls this once after `initLocale()`. Returns the unsubscribe fn.
 */
export function bindDocumentToLocale(): () => void {
  return subscribe((locale) => applyLocaleToDocument(locale));
}
