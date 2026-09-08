# src/core/i18n/

LocalizedText helpers, locale resolution, the client locale store, the
state-preserving RUS/ENG switch, and `hreflang` alternates. Issue #20, Phase 1 /
Epic #14. Implementation Plan §7.2 / §9; Technical Architecture §6, §13, §40;
Product Vision §22.

## Model

- **One entity, both languages.** `LocalizedText = { ru, en }` (both required,
  non-empty — enforced by the #16 schema). Locale is a *presentation
  preference*, never a second data tree. No `/data/en/…` vs `/data/ru/…`.
- **English is the default locale** (human decision 2026-09-08 — SEO reach,
  consistency with localbubble.space). Russian is fully first-class, reached via
  the toggle, `?lang=ru`, or a stored preference.

## Locale resolution — precedence

`resolve.ts` → `resolveLocale({ search, stored })`, highest priority first:

1. **`?lang=ru|en`** query param — honoured for shareable links, and **persisted**
   to `localStorage` so the shared link "sticks".
2. **stored preference** — `localStorage["sa:locale"]`.
3. **default** — `en`.

Invalid `?lang=` values (`?lang=fr`, `?lang=`, `?lang=EN`) and corrupt stored
values are ignored — resolution falls through to the next tier. The resolver is
pure; `store.ts` wires it to `window`/`localStorage` with try/catch (private
windows, disabled storage).

## SSR vs client-swap decision

**Chosen: render `en` at build, client-swaps text after hydration.**

The site is `output: "static"` with no adapter (Implementation Plan §1
decision 7) — "server-side" means build time, and there is exactly one build.
Pages prerender the **default locale** (`en`) as visible content, which is what
SEO crawlers and no-JS visitors get. Each localized field is also emitted inline
in the other locale as data attributes:

```html
<span data-i18n data-i18n-en="Base #32" data-i18n-ru="База №32">Base #32</span>
```

On the client, `boot.ts` runs once after hydration: `initLocale()` resolves the
real preference and `applyLocaleToDocument()` swaps `[data-i18n]` text + sets
`<html lang>`. For an `en` visitor this is a no-op; for a `ru` visitor it is a
text-only swap — **no layout, camera, scroll, or selection change**.

Why not prerender `/ru/` too: that is a routing decision that belongs to **#19**,
not to the i18n core, and §7.2 does not require it. If per-locale URLs are later
wanted for full RU crawl parity, `buildHreflangAlternates` and this doc are the
things to revisit. **Flagged for Product_Owner** as the one open call.

## The `[data-i18n]` contract (for #17 / #19)

Entity/route templates render the `en` value as the element's text and add:

- `data-i18n` — marker attribute (presence only)
- `data-i18n-en` — the `en` string
- `data-i18n-ru` — the `ru` string

`applyLocaleToDocument(locale)` reads `data-i18n-${locale}` into `textContent`.
Elements without both attributes are skipped.

## State-preserving switch (AC 5 & 6)

`switch.ts` → `switchLocale(next, appState)` / `toggleLocale(appState)`:

- sets the store locale, persists it, swaps visible text;
- **returns the same `appState` reference, untouched** — the "nothing else
  changed" contract is explicit and unit-tested against a mock `AppState`
  (`locale`, `currentSystem`, `selectedEntityId`, `cockpitCamera`, scroll).

## `hreflang` (AC 7)

`hreflang.ts` → `buildHreflangAlternates(url)` → `en` = clean URL, `ru` = clean
URL + `?lang=ru`, `x-default` = clean URL (→ `en`). `BaseLayout.astro` emits
one `<link rel="alternate">` per entry. Absolute hrefs need `site` in
`astro.config.mjs` (currently unset by design).

## Public API

`import { … } from "../core/i18n"` — see `index.ts`. Client island:
`import LocaleSwitch from "../core/i18n/LocaleSwitch"` (functional/unstyled; #26
owns appearance).
