# src/hud/

SVG/CSS HUD component library (HudFrame, HudCorners, HudReticle, …) plus
`hud.css`, the token & primitive layer that feeds it. Implementation Plan §3, §6;
Technical Architecture §19–20. Built across Phase 2 (#24–#28).

- **#24 (this story)** — `hud.css`: wire `--hud-*` role names onto the shared
  SA palette, reserve motion token slots, provide the `prefers-reduced-motion`
  scaffold. **No components.**
- #25 — the SVG HUD components.
- #26 — shared non-HUD UI (buttons, panels, alerts).
- #27 — animation / terminal-transition conventions (owns the final motion values).
- #28 — the written visual-grammar reference (`docs/visual-grammar.md`).

---

## 1. Token pipeline — `shared/style` is generated, do not hand-edit

```
shared/style/SA_styles.json          <- source of truth (edit here)
  │  shared/tools/gen_SA_styles.py     (THE generator: JSON -> CSS + Python)
  ▼
shared/style/stellar-attractor.css   <- GENERATED output. "Auto-generated. Do
  │  shared/style/hud_style_tokens.py     not edit manually." Both are output of
  │                                       gen_SA_styles.py — regenerate, never
  │                                       patch (hud_style_tokens.py is NOT a
  │                                       generator despite the name).
  ▼
src/styles/tokens.css                <- #15 in-app re-export:
  │                                      @import "../../shared/style/stellar-attractor.css"
  ▼
src/hud/hud.css                      <- imports tokens.css, adds ONLY --hud-*
  ▼
src/layouts/BaseLayout.astro         <- imports hud.css globally (:root scope)
```

`hud.css` **must not**:

- `@import` `stellar-attractor.css` directly (go through `tokens.css`);
- assign any `--sa-*` custom property (read with `var()` only);
- contain a raw `#hex`, `rgb()`, `rgba()` or `hsl()` colour, or a literal
  `font-family`.

If the HUD genuinely needs a colour the SA palette lacks, add it to
`shared/style/SA_styles.json`, regenerate `stellar-attractor.css` **and**
`hud_style_tokens.py` by running `shared/tools/gen_SA_styles.py`, and record the
addition in §2 below — **do not** hardcode it in `hud.css`. (The repo-root
`README.md` and `src/styles/tokens.css` cite the same generator.)

> #24 added **no** new palette values. Every `--hud-*` colour role maps onto a
> token that already existed in `SA_styles.json`.

`tests/hud-tokens.test.ts` enforces all of the above on every build.

---

## 2. HUD role → `--sa-*` token mapping

The stable contract for #25/#26/#27: components reference `--hud-*`, never
`--sa-*` or raw values. Reviewed by UI_UX_Designer (light gate — confirm the
role↔token pairing; the tokens themselves are not changing).

### Colour roles

| `--hud-*` role      | `--sa-*` source                | Value                     | Intended use |
|---------------------|--------------------------------|---------------------------|--------------|
| `--hud-bg`          | `--sa-colors-panel-bg`         | `#00080e`                 | Panel / frame interior fill |
| `--hud-bg-soft`     | `--sa-colors-panel-bg-soft`    | `rgba(0, 12, 20, 0.72)`   | Translucent overlay panels, floating controls |
| `--hud-backdrop`    | `--sa-colors-bg`               | `#02070d`                 | Deepest page background behind the HUD |
| `--hud-line`        | `--sa-colors-cyan-deep`        | `#22c7f3`                 | Primary frame stroke (`HudFrame` outer) |
| `--hud-line-bright` | `--sa-colors-cyan-bright`      | `#8ffcff`                 | Emphasised / active / focused edge |
| `--hud-line-dim`    | `--sa-colors-cyan`             | `#5af0ff`                 | Secondary inner frame |
| `--hud-line-faint`  | `--sa-colors-cyan-soft`        | `rgba(90, 240, 255, 0.28)`| Micro-grid / tertiary lines |
| `--hud-accent`      | `--sa-colors-cyan-bright`      | `#8ffcff`                 | Reticle / marker / target fill |
| `--hud-glow`        | `--sa-colors-cyan-soft`        | `rgba(90, 240, 255, 0.28)`| `drop-shadow` / bloom colour |
| `--hud-text`        | `--sa-colors-text-main`        | `#d8fbff`                 | Primary readout text |
| `--hud-text-dim`    | `--sa-colors-text-dim`         | `#9fc7d4`                 | Body / secondary readout |
| `--hud-muted`       | `--sa-colors-text-faint`       | `#6f9faa`                 | Labels, captions, metadata |
| `--hud-ok`          | `--sa-colors-green`            | `#52ff9a`                 | Nominal / online status |
| `--hud-caution`     | `--sa-colors-yellow`           | `#ffd85a`                 | Advisory status |
| `--hud-warning`     | `--sa-colors-orange`           | `#ff9c52`                 | Warning status |
| `--hud-alert`       | `--sa-colors-red`              | `#ff5f7f`                 | Alert / fault status (`HudAlert`) |
| `--hud-font`        | `--sa-font-mono`               | `Menlo, Consolas, "Roboto Mono", monospace` | All HUD typography |

Matches the Technical Architecture §19 example: `--hud-bg` → `--sa-colors-panel-bg`,
`--hud-line` → `--sa-colors-cyan-deep`, `--hud-text` → `--sa-colors-text-main`,
`--hud-muted` → `--sa-colors-text-faint`, `--hud-warning` → `--sa-colors-orange`,
plus `--hud-alert` → `--sa-colors-red` from the issue AC.

### Structural scalars (design-system decisions — Technical Architecture §19)

Not colours/opacity/fonts, so they have no `--sa-*` source; centralised here so
components never inline them.

| Token                     | Value   | Note |
|---------------------------|---------|------|
| `--hud-line-width`        | `1px`   | Default stroke |
| `--hud-line-width-frame`  | `2.4px` | Outer frame (matches `.sa-frame-outer` in the shared CSS) |
| `--hud-line-width-accent` | `1.2px` | Accent / marker stroke |
| `--hud-radius`            | `4px`   | Technical Architecture §19 example value |
| `--hud-radius-sharp`      | `0px`   | Squared corners (current cockpit default) |
| `--hud-opacity-frame`     | `0.95`  | Outer frame stroke opacity |
| `--hud-opacity-line`      | `0.48`  | Inner frame stroke opacity |
| `--hud-opacity-line-faint`| `0.18`  | Micro-grid opacity |
| `--hud-opacity-fill`      | `0.82`  | Accent fill opacity |
| `--hud-opacity-disabled`  | `0.35`  | Disabled control opacity |

### Motion token slots — **provisional, #27 owns the final values**

#24 only reserves the names so #25/#26 have something stable to target. Values
mirror `config/cockpit.json` → `animation.*` and the Cockpit Interaction
Prototype Specification §14 (400–800 ms, controlled mechanical easing, no
overshoot / bounce / spring). `tests/hud-tokens.test.ts` asserts they stay in
sync with `config/cockpit.json`.

| Token                       | Value                          | Provenance |
|-----------------------------|--------------------------------|------------|
| `--hud-easing-mechanical`   | `cubic-bezier(0.4, 0.0, 0.2, 1)` | `config/cockpit.json` `animation.easing` |
| `--hud-duration-micro`      | `160ms`                        | `src/styles/cockpit.css` hover/idle baseline |
| `--hud-duration-fast`       | `340ms`                        | `config` `animation.arrowStepMs` |
| `--hud-duration-return`     | `560ms`                        | `config` `animation.returnMs` |
| `--hud-duration-focus`      | `620ms`                        | `config` `animation.focusMs` |
| `--hud-duration-ambient`    | `900ms`                        | `config` `animation.nudgeMs` — ambient loops |
| `--hud-duration-reduced`    | `0ms`                          | `config` `animation.reducedMotionMs` |
| `--hud-anim-duration`       | `var(--hud-duration-focus)`    | reduced-motion-aware; flips to `--hud-duration-reduced` |
| `--hud-anim-duration-fast`  | `var(--hud-duration-fast)`     | reduced-motion-aware |
| `--hud-transition-duration` | `var(--hud-duration-micro)`    | reduced-motion-aware |

### Primitive hooks (not components)

| Class | Effect |
|-------|--------|
| `.hud` | `position: relative`, `--hud-font`, `--hud-text` |
| `.hud-dim` / `.hud-muted` | text colour |
| `.hud-signal-{ok,caution,warning,alert}` | sets one `--hud-signal` var a component reads |
| `.hud-pulse` | worked reduced-motion example (§3) |
| `.hud-animated` | generic hook #25/#27 neutralise under reduced motion |

---

## 3. `prefers-reduced-motion` scaffold

One place handles reduced motion for the whole HUD layer. A component in
#25/#26/#27 opts in one of two ways:

**(a) Duration-driven** — drive every `transition` / `animation` duration from
the reduced-motion-aware vars, never the raw `--hud-duration-*` slots:

```css
.hud-scanner-sweep {
  transition: transform var(--hud-anim-duration) var(--hud-easing-mechanical);
}
```

Under `prefers-reduced-motion: reduce`, `hud.css` sets
`--hud-anim-duration` (and `-fast`, and `--hud-transition-duration`) to
`--hud-duration-reduced` (`0ms`) at `:root`, so the transition collapses with no
per-component code.

**(b) Decorative keyframes** — add the animation to the `.hud-animated` hook (or
your own selector) and let the media block stop it. Working example shipped in
`hud.css`:

```css
@keyframes hud-pulse {
  0%, 100% { opacity: var(--hud-opacity-line-faint); }
  50%      { opacity: var(--hud-opacity-frame); }
}
.hud-pulse { animation: hud-pulse var(--hud-duration-ambient) var(--hud-easing-mechanical) infinite; }

@media (prefers-reduced-motion: reduce) {
  .hud-animated,
  .hud-pulse { animation: none; transition: none; }
}
```

The generic hook resets **motion only** — with the animation removed `.hud-pulse`
reverts to its default opacity and stays legible. A component whose animation
carried real information (a transform that reveals state, say) provides its own
resting end-state inside this media block — that is #25/#27's job, not a value
baked into the shared hook.

---

## 4. Phase 0 style catalogue — the known refactor

Audit of token-equivalent literals currently hardcoded in the Phase 0 styling,
for #25 / #26 to migrate. **#24 does not migrate these** (PO: "the known Phase 0
style refactor" belongs with the component work) — it only catalogues them.

`src/system/system-overlay.ts` and the rest of `src/system/*` carry **no inline
style literals** — they set layout classes only. `src/cockpit/scene.ts` is the
one exception: it builds the backdrop SVG with ~20 hard-coded hex colours — but
that is **placeholder programmer-art**, replaced by real cockpit artwork before
Phase 2 ships, so it is deliberately excluded from tokenisation (see §4c). The
migratable catalogue is therefore all in `src/styles/cockpit.css`.

### 4a. Exact token matches — safe mechanical swap (do in #25/#26)

| Location (`cockpit.css`) | Literal | Replace with | Risk |
|--------------------------|---------|--------------|------|
| `.panorama-control` background | `rgba(0, 12, 20, 0.72)` | `var(--sa-colors-panel-bg-soft)` / `var(--hud-bg-soft)` | none — identical value |
| `.remote-terminal-btn` background | `rgba(0, 12, 20, 0.72)` | `var(--sa-colors-panel-bg-soft)` / `var(--hud-bg-soft)` | none — identical value |
| `.system-overlay-frame` transition timing | `cubic-bezier(0.4, 0, 0.2, 1)` | `var(--hud-easing-mechanical)` | none — same curve (needs `cockpit.css` to import `hud.css`) |

### 4b. Near-matches — needs a design decision (flag on #25)

| Location | Literal | Nearest token | Decision needed |
|----------|---------|---------------|-----------------|
| `.cockpit-viewport` background | `#01040a` | `--sa-colors-bg` `#02070d` | Deliberately darker than page bg? If not, → `--hud-backdrop`. |
| `.cockpit-hint` background | `rgba(0, 12, 20, 0.82)` | `--sa-colors-panel-bg-soft` (α 0.72) | Same hue, different alpha — promote an `--hud-scrim` token or accept `--hud-bg-soft`. |
| `.system-overlay` background | `rgba(1, 5, 10, 0.55)` | `--sa-colors-bg` `#02070d` | Modal scrim — wants a dedicated `--hud-scrim` token (new `SA_styles.json` value). |
| hotspot hover/focus/active fills | `rgba(90, 240, 255, 0.1 / 0.16 / 0.85)` | `--sa-colors-cyan` `#5af0ff` = `rgb(90,240,255)` | Cyan at ad-hoc alphas → an `--hud-state-*` interaction-tint scale (#26 UI states). |
| `.panorama-control:hover` background | `rgba(34, 199, 243, 0.24)` | `--sa-colors-cyan-deep` `#22c7f3` = `rgb(34,199,243)` | Same → interaction-tint scale. |
| `.system-overlay-frame` box-shadow | `rgba(34, 199, 243, 0.35)` | `--sa-colors-cyan-deep` | Glow colour → `--hud-glow` (currently cyan-soft); reconcile in #25. |
| frame `drop-shadow` glows in shared CSS `.sa-frame-outer` / `.sa-accent` | `rgba(90,240,255, 0.45–0.55)` | `--sa-colors-cyan-soft` | Same family — `--hud-glow` once #25 restyles frames. |
| `.remote-terminal-section` border-top | `rgba(34, 199, 243, 0.28)` | `--sa-colors-cyan-deep` at α | interaction/border-tint scale. (`.remote-terminal-btn` already uses `var(--sa-colors-cyan-deep)`.) |

### 4c. Stays cockpit-specific — do NOT migrate

- **`src/cockpit/scene.ts` backdrop SVG** (~20 hex literals: panel `tint`s,
  gradient stops, grid/console strokes, star fills) — **placeholder art**, not
  design-system colour. Real cockpit artwork replaces it; do not tokenise.
- `@keyframes hud-scan` + `.hud-scanline` — a HUD ambient primitive; **#25**
  should lift it into `hud.css` as `HudScanner`, but the timing (`6s`) is a
  cockpit tuning value, not a token.
- `.cockpit-viewport` / `.cockpit-scene` / `.cockpit-layer` geometry, `cursor`,
  `touch-action`, `will-change`, `--camera-*` — pure cockpit mechanics.
- Transition **durations** `140ms / 160ms / 300ms / 320ms` on cockpit
  micro-interactions — #27 decides which fold into `--hud-duration-*` vs. stay
  local. Catalogued here as the #27 input.
- `font-size` values (`30px`, `34px`, `22px`, `14px`, `12px`, `11px`),
  `letter-spacing` (`3px`, `4px`, `6px`, `0.12em`) — typography scale, **#28**
  territory (`docs/visual-grammar.md`), not this story.
- `min-width` / `max-width` / padding on `.system-overlay-frame`,
  `.mobile-shell` — layout, not tokens.

### Follow-up notes to file

- **#25**: apply 4a swaps; lift `.hud-scanline` → `HudScanner`; resolve the
  `--hud-glow` vs. `cyan-deep` box-shadow question; decide `.cockpit-viewport`
  background.
- **#26**: define the interaction-tint scale for the 4b hover/focus/active/border
  cyan-at-alpha cases; migrate `.panorama-control`, `.remote-terminal-btn`,
  `.system-overlay-return` button styling onto shared UI + `--hud-*`.
- **#27**: fold cockpit transition durations into the `--hud-duration-*` scale
  where they belong; finalise the provisional motion values in §2.
- **`shared/style` (new tokens, needs Designer sign-off)**: `--hud-scrim`
  (modal/hint backdrop) and an interaction-tint scale are the two values the
  Phase 0 catalogue shows the palette is missing.
