/**
 * Client-side mounting logic for `src/pages/hud-platform-demo.astro`
 * (IncusLuminis/assets#17 — "Integrate one external consumer").
 *
 * Lives in its own `src/hud-platform-proof/` directory rather than next to
 * the page under `src/pages/` — Astro's file-based routing treats every
 * `.ts` file under `src/pages/` as its own route/endpoint, so a sibling
 * `.ts` file there gets server-rendered/prerendered at build time too, and
 * this module's top-level `document.getElementById(...)` calls only make
 * sense in a real browser (confirmed hands-on: `astro build` failed with
 * `ReferenceError: document is not defined` while this file still lived
 * next to the page). Moving it out of `src/pages/` avoids that entirely.
 *
 * Kept as a real, fully-typed `.ts` module and imported from the page via a
 * thin `<script>import "../hud-platform-proof/hud-platform-demo.client";
 * </script>` — matching this repo's existing convention for non-trivial
 * client logic (see `src/core/i18n/boot.ts`, imported the same way from
 * `src/layouts/BaseLayout.astro`) rather than writing loose JS inline, which
 * `tsconfig.json`'s `astro/tsconfigs/strict` base would otherwise have no
 * way to typecheck sensibly (an inline `<script type="module">` with real
 * logic gets Astro's `is:inline` fallback and skips processing; a bare
 * `<script>` with loose JS instead hits a wall of `noImplicitAny` errors
 * under this repo's strict tsconfig — a real `.ts` file is the correct fix,
 * not a suppression).
 *
 * SCOPE: this file talks ONLY to the public IncusLuminis HUD Platform
 * Runtime/Registry CDN (`https://assets-4gy.pages.dev/`) via the public
 * Contract API (`new Hud(...)` + `mount()` + `setData()`). It has no
 * relationship to this site's own parked cockpit/HUD system
 * (`src/hud/`, `src/cockpit/`) and imports nothing from either.
 */

const CDN_BASE_URL = "https://assets-4gy.pages.dev/";
const RUNTIME_URL = new URL("runtime/index.js", CDN_BASE_URL).toString();

// ---------------------------------------------------------------------
// Minimal local typings for the published Runtime's public surface.
//
// There is no shipped `.d.ts` for a plain `<script>`-tag/dynamic-import
// consumer to import (the Runtime is consumed as a bare ESM bundle from the
// CDN, not as an npm dependency of this repo) — these are just enough shape
// to typecheck this file against the Contract API described in
// IncusLuminis/assets#17, not a full re-declaration of the Runtime.
// ---------------------------------------------------------------------

type Variant = "maxi" | "mini" | "micro";
type Orientation = "landscape" | "portrait";

interface ThemeSource {
  resolveVersion(theme: string, version: string): Promise<string>;
  loadManifest(theme: string, version: string): Promise<unknown>;
  assetBaseUrl(theme: string, version: string): string;
}

interface RendererRegistryInstance {
  register(engine: string, factory: () => unknown): void;
  has(engine: string): boolean;
  create(engine: string): unknown;
}

interface HudOptions {
  theme: string;
  version: string;
  variant: Variant;
  orientation: Orientation;
}

interface HudInstance {
  onError(callback: (err: Error) => void): void;
  setData(data: Record<string, unknown>): void;
  mount(el: HTMLElement): Promise<void>;
}

interface HudConstructor {
  new (
    options: HudOptions,
    deps?: { themeSource?: ThemeSource; rendererRegistry?: RendererRegistryInstance },
  ): HudInstance;
}

interface RegistryThemeSourceConstructor {
  new (baseUrl: string): ThemeSource;
}

interface RuntimeModule {
  Hud: HudConstructor;
  configureHudRuntime: (deps: {
    themeSource?: ThemeSource;
    rendererRegistry?: RendererRegistryInstance;
  }) => void;
  createDefaultRendererRegistry: () => RendererRegistryInstance;
  SvgRenderer: new () => unknown;
  CssRenderer: new () => unknown;
  // Optional: see the "FINDING" logged in main() below — as of this
  // integration the live bundle does not actually export this, despite
  // IncusLuminis/assets#42 being reported merged.
  RegistryThemeSource?: RegistryThemeSourceConstructor;
}

// ---------------------------------------------------------------------
// Registry index shape (schemaVersion 1.0, per
// https://assets-4gy.pages.dev/registry/index.json).
// ---------------------------------------------------------------------

interface RegistryVersionEntry {
  version: string;
  manifest: string;
  package: string;
}

interface RegistryThemeEntry {
  id: string;
  latest: string;
  manifest: string;
  versions: RegistryVersionEntry[];
}

interface RegistryIndex {
  schemaVersion: string;
  themes: RegistryThemeEntry[];
}

// ---------------------------------------------------------------------
// On-page log — lets a reviewer see the integration proof run without
// opening devtools; also mirrored to console.
// ---------------------------------------------------------------------

const logEl = document.getElementById("hud-demo-log");
const logLines: string[] = [];

function log(message: string, level: "info" | "error" = "info"): void {
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()}: ${message}`;
  logLines.push(line);
  if (logEl) logEl.textContent = logLines.join("\n");
  if (level === "error") console.error("[hud-platform-demo]", message);
  else console.log("[hud-platform-demo]", message);
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Two small inline-SVG data URIs so the demo's "media" slots have something
// to show without depending on a third external image host — the point of
// this proof is exercising assets-4gy.pages.dev, not adding more
// third-party surface area to verify. Not real Stellar Attractor media;
// illustrative placeholders only.
function placeholderMedia(strokeColor: string, fillColor: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">` +
    `<rect width="160" height="160" fill="#04141c"/>` +
    `<circle cx="80" cy="80" r="56" fill="none" stroke="${strokeColor}" stroke-width="3"/>` +
    `<circle cx="80" cy="80" r="24" fill="${fillColor}"/>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Sample data below is illustrative placeholder content chosen to match
// each composition's actual data-slot markup (checked against the real
// mounted HTML, not guessed) — not real Stellar Attractor entity/lore data,
// which would blur this technical proof with content work (explicitly out
// of scope for IncusLuminis/assets#17).

// hud-01 mini:landscape's markup binds exactly: title, status, media
// (objectName/mode are accepted by the Contract but unused by this
// composition's static markup — only maxi:landscape has the script that
// reads them, per the manifest's per-variant `entrypoints`).
const SAMPLE_DATA_HUD01: Record<string, unknown> = {
  title: "NGC 1300 — Barred Spiral",
  status: "LOCK ACQUIRED",
  media: placeholderMedia("#4bd8ff", "#4bd8ff"),
};

// hud-03 micro:portrait's markup binds exactly: subtitle, title, media,
// content.
const SAMPLE_DATA_HUD03: Record<string, unknown> = {
  subtitle: "FIELD NOTE // ARCHIVE",
  title: "Voyager 1 — Golden Record",
  media: placeholderMedia("#ffb84b", "#ffb84b"),
  content:
    "Illustrative placeholder copy for the HUD Platform integration proof " +
    "(IncusLuminis/assets#17). Not canonical Stellar Attractor content.",
};

/**
 * Minimal fallback ThemeSource, used only if the live Runtime bundle does
 * not export `RegistryThemeSource` (see the "FINDING" logged in `main()` —
 * confirmed missing from the published `runtime/index.js` as of this
 * integration, despite IncusLuminis/assets#42 being reported merged).
 * Implements exactly the three-method contract `ThemeResolver` calls:
 * `resolveVersion`/`loadManifest` (both async) and `assetBaseUrl` (sync,
 * called right after `loadManifest()` resolves — so the package base URL is
 * cached during `loadManifest()` for `assetBaseUrl()` to read back
 * synchronously).
 */
class MinimalRegistryThemeSource implements ThemeSource {
  #baseUrl: string;
  #indexPromise: Promise<RegistryIndex> | null = null;
  #packageBaseCache = new Map<string, string>();

  constructor(baseUrl: string) {
    this.#baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  }

  #loadIndex(): Promise<RegistryIndex> {
    if (!this.#indexPromise) {
      const indexUrl = new URL("registry/index.json", this.#baseUrl).toString();
      this.#indexPromise = fetch(indexUrl).then((res) => {
        if (!res.ok) {
          throw new Error(`Registry index fetch failed: HTTP ${res.status} (${indexUrl})`);
        }
        return res.json() as Promise<RegistryIndex>;
      });
    }
    return this.#indexPromise;
  }

  async #findVersionEntry(theme: string, version: string): Promise<RegistryVersionEntry> {
    const index = await this.#loadIndex();
    const themeEntry = index.themes.find((t) => t.id === theme);
    if (!themeEntry) {
      throw new Error(`Theme "${theme}" is not listed in the Registry index`);
    }
    const versionEntry = themeEntry.versions.find((v) => v.version === version);
    if (!versionEntry) {
      const available = themeEntry.versions.map((v) => v.version).join(", ") || "none";
      throw new Error(
        `Theme "${theme}"@${version} is not listed in the Registry (available: ${available})`,
      );
    }
    return versionEntry;
  }

  async resolveVersion(theme: string, version: string): Promise<string> {
    // This demo always requests an exact, pinned version (never "latest"),
    // matching Story #16's Published-mode pinning discipline — so
    // resolution here is an existence check against the live Registry,
    // still a real cross-origin fetch that exercises the Registry (AC 2).
    const entry = await this.#findVersionEntry(theme, version);
    return entry.version;
  }

  async loadManifest(theme: string, version: string): Promise<unknown> {
    const entry = await this.#findVersionEntry(theme, version);
    const manifestUrl = new URL(entry.manifest.replace(/^\//, ""), this.#baseUrl).toString();
    const packageUrl = new URL(entry.package.replace(/^\//, ""), this.#baseUrl).toString();
    this.#packageBaseCache.set(`${theme}@${version}`, packageUrl);
    const res = await fetch(manifestUrl);
    if (!res.ok) {
      throw new Error(`Manifest fetch failed for ${theme}@${version}: HTTP ${res.status} (${manifestUrl})`);
    }
    return res.json();
  }

  assetBaseUrl(theme: string, version: string): string {
    const cached = this.#packageBaseCache.get(`${theme}@${version}`);
    if (cached) return cached;
    // Fallback to the Registry's own path convention in case assetBaseUrl()
    // is ever called before loadManifest() for this theme/version.
    return new URL(`themes/${theme}/${version}/`, this.#baseUrl).toString();
  }
}

interface MountDemoOptions {
  containerId: string;
  theme: string;
  version: string;
  variant: Variant;
  orientation: Orientation;
  data: Record<string, unknown>;
  label: string;
}

/**
 * Mounts one Theme into one container, fully isolated from the other mount:
 * a failure here must (a) show a small in-container fallback message, (b)
 * not prevent the other Theme from mounting, and (c) not throw anywhere the
 * rest of the host page would see it. Verified hands-on during development
 * by temporarily pointing one call at a bogus theme id/version and
 * confirming both the fallback and the other Theme's successful mount in a
 * real browser, then reverted — see the PR description for
 * IncusLuminis/assets#17.
 */
async function mountDemo(options: MountDemoOptions, HudCtor: HudConstructor): Promise<void> {
  const { containerId, theme, version, variant, orientation, data, label } = options;
  const container = document.getElementById(containerId);
  if (!container) {
    log(`[${label}] container #${containerId} not found in the DOM`, "error");
    return;
  }
  try {
    const hud = new HudCtor({ theme, version, variant, orientation });
    hud.onError((err) => {
      // Contract §20.2/§20.3: post-mount setData()/resize() failures are
      // delivered here rather than thrown into host code.
      log(`[${label}] runtime error after mount: ${err.message}`, "error");
    });
    hud.setData(data); // queued pre-mount, replayed after mount() resolves (Contract §6.3)
    await hud.mount(container);
    log(`[${label}] mounted OK — ${theme}@${version} ${variant}:${orientation}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const name = err instanceof Error ? err.name : "Error";
    log(`[${label}] MOUNT FAILED (${name}): ${message}`, "error");
    // Hud.mount() removes its own scoped root from `container` on failure
    // (Contract cleanup), so `container` is empty here — safe to write a
    // container-local fallback without disturbing anything else on the page.
    container.innerHTML =
      `<p class="hud-demo-fallback">⚠ ${escapeHtml(label)} failed to mount ` +
      `(${escapeHtml(name)}: ${escapeHtml(message)}). The rest of this page, ` +
      `including the other Theme below/above, is unaffected — see ` +
      `IncusLuminis/assets#17's "a HUD failure does not break the host page" AC.</p>`;
  }
}

async function main(): Promise<void> {
  log(`Fetching Runtime bundle from ${RUNTIME_URL} …`);
  let runtimeModule: RuntimeModule;
  try {
    runtimeModule = (await import(/* @vite-ignore */ RUNTIME_URL)) as RuntimeModule;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`Runtime import FAILED: ${message}`, "error");
    log("Both Theme mounts skipped — see each container above for a fallback.", "error");
    for (const id of ["hud-demo-01", "hud-demo-03"]) {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML =
          `<p class="hud-demo-fallback">⚠ HUD Runtime failed to load from the CDN ` +
          `(${escapeHtml(message)}). Rest of page unaffected.</p>`;
      }
    }
    return;
  }
  log("Runtime bundle loaded.");

  const { Hud, configureHudRuntime, createDefaultRendererRegistry, SvgRenderer, CssRenderer, RegistryThemeSource } =
    runtimeModule;

  let themeSource: ThemeSource;
  if (typeof RegistryThemeSource === "function") {
    themeSource = new RegistryThemeSource(CDN_BASE_URL);
    log("Using the published RegistryThemeSource export from the Runtime bundle.");
  } else {
    // FINDING for IncusLuminis/assets#17's "compatibility gaps" AC: this
    // integration was briefed that RegistryThemeSource had just been
    // promoted into the Runtime (IncusLuminis/assets#42, reported merged)
    // specifically so consumers wouldn't need to reimplement a Registry
    // client. As of this integration, the live runtime/index.js bundle at
    // assets-4gy.pages.dev does NOT export it (checked its full export
    // list). Logged here rather than silently working around it, and
    // written up in the PR description. Falling back to an inline
    // implementation of the same three-method contract.
    log(
      "FINDING: RegistryThemeSource is not exported by the live runtime/index.js " +
        "(expected per IncusLuminis/assets#42). Falling back to a minimal inline " +
        "ThemeSource — see PR description for IncusLuminis/assets#17.",
      "error",
    );
    themeSource = new MinimalRegistryThemeSource(CDN_BASE_URL);
  }

  // FINDING: createDefaultRendererRegistry() only registers the
  // Platform-reserved (and, in 0.1, intentionally unsupported) engines —
  // "video"/"static"/"gadget" (each throws RendererUnsupportedError by
  // design). It does NOT register "svg"/"css", the only two working engines
  // in Platform 0.1, despite the name suggesting a ready-to-use default. An
  // external consumer must register both explicitly, as below, or every
  // mount() of a real Theme rejects with RendererUnsupportedError. Worth a
  // 0.2 naming/docs follow-up.
  const rendererRegistry = createDefaultRendererRegistry();
  rendererRegistry.register("svg", () => new SvgRenderer());
  rendererRegistry.register("css", () => new CssRenderer());

  configureHudRuntime({ themeSource, rendererRegistry });
  log("Runtime configured (ThemeSource + RendererRegistry).");

  // Two Themes, two engines, two different supported variant/orientation
  // combinations — confirmed live against the Registry before writing this
  // demo (PR description has the detail):
  //   hud-01@0.1.0 mini:landscape   — supported: true (SVG engine)
  //   hud-03@1.0.0 micro:portrait   — supported: true (CSS engine)
  // Mounted via Promise.allSettled so neither mount can block or be
  // affected by the other failing.
  await Promise.allSettled([
    mountDemo(
      {
        containerId: "hud-demo-01",
        theme: "hud-01",
        version: "0.1.0",
        variant: "mini",
        orientation: "landscape",
        data: SAMPLE_DATA_HUD01,
        label: "HUD-01 (SVG, mini:landscape)",
      },
      Hud,
    ),
    mountDemo(
      {
        containerId: "hud-demo-03",
        theme: "hud-03",
        version: "1.0.0",
        variant: "micro",
        orientation: "portrait",
        data: SAMPLE_DATA_HUD03,
        label: "HUD-03 (CSS, micro:portrait)",
      },
      Hud,
    ),
  ]);

  log("Integration proof complete.");
}

main().catch((err: unknown) => {
  // Should be unreachable (main() already catches everything meaningful),
  // but this is the last line of defense so a HUD-Platform-side failure can
  // never surface as an unhandled rejection breaking the host page.
  const message = err instanceof Error ? err.message : String(err);
  log(`Unexpected top-level failure: ${message}`, "error");
});
