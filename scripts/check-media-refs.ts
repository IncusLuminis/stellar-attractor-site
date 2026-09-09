/**
 * Media-reference resolution (Implementation Plan §3, §4; Technical Architecture §12).
 *
 * Split out of `validate-entities.ts` — which imports and calls it — so the
 * "does this media reference point at something real?" rule lives in one place
 * and can also be run on its own (`npm run check:media-refs`).
 *
 * A `MediaReference.id` (already shape-checked by the #16 Zod schema: non-blank,
 * not an inline filename with an asset extension) resolves when it is EITHER:
 *
 *   1. a **media-entity reference** — the id starts with `media.` (unambiguously a
 *      reference to the `media` entity type, whose ids are `media.<slug>`). It
 *      MUST match a real `data/media/` entity id exactly. A near-miss the #16
 *      schema still accepts as a `media.id` (`media.Ghost_Portrait` — capital,
 *      underscore) is a typo, and is reported as unresolved — it does NOT fall
 *      through to the asset-path branch.
 *   2. an **asset path** — any other value: a repo-relative path under
 *      `public/media/` that matches an actual file there (with or without an
 *      extension appended).
 *
 * TODO(media-pipeline): real asset resolution for asset-path refs depends on the
 * media pipeline / manifest that is not in the repo yet (`public/media/` holds
 * only `.gitkeep`). Until real assets land, an otherwise well-formed asset-path
 * ref is accepted "by format only" and counted — the run prints a NOTE — rather
 * than failing every seed entity that carries a portrait. A `media.` ref is
 * always fully resolved (check 1) because that is a cross-file check we can do
 * today.
 */

import { type Dirent, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { MEDIA_ASSET_EXTENSIONS } from "../src/core/entities/schemas.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** A ref beginning with this prefix is meant to be a `media` entity reference. */
const MEDIA_ENTITY_PREFIX = "media.";

const ASSET_EXTENSION = new RegExp(`\\.(?:${MEDIA_ASSET_EXTENSIONS.join("|")})$`, "i");

export interface MediaRefContext {
  /** ids of every `type: "media"` entity in the data set. */
  mediaEntityIds: ReadonlySet<string>;
  /** posix-relative file paths under the public media dir (no dotfiles); empty until assets land. */
  assetIndex: ReadonlySet<string>;
  /** repo-relative display path of the public media dir, for messages. */
  mediaDirLabel: string;
}

export interface MediaRefResult {
  ok: boolean;
  /** why it did not resolve — present iff `!ok`. */
  reason?: string;
  /** resolved on format alone; real asset check deferred (see file-level TODO). */
  formatOnly?: boolean;
}

/**
 * Recursively index real files under `dir` as posix-relative paths. Dotfiles
 * (`.gitkeep`) are skipped. A missing dir yields an empty set.
 */
export function buildAssetIndex(dir: string): Set<string> {
  const out = new Set<string>();
  const walk = (abs: string, rel: string): void => {
    let entries: Dirent[];
    try {
      entries = readdirSync(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(join(abs, entry.name), childRel);
      else out.add(childRel);
    }
  };
  walk(dir, "");
  return out;
}

/** Resolve one media reference id against the data set + public assets. */
export function resolveMediaRef(id: string, ctx: MediaRefContext): MediaRefResult {
  const value = id.trim();

  if (!value) {
    return { ok: false, reason: "media reference id is blank" };
  }
  if (value.startsWith("/") || value.includes("\\") || value.split("/").includes("..")) {
    return {
      ok: false,
      reason: `media reference "${value}" is not a well-formed media id or repo-relative path`,
    };
  }
  if (ASSET_EXTENSION.test(value)) {
    return {
      ok: false,
      reason:
        `media reference "${value}" must be a stable media id or path, ` +
        "not a filename with an asset extension",
    };
  }

  // A ref that starts with `media.` is unambiguously a media-entity reference and
  // must resolve to a real `data/media/` entity — no fall-through to asset paths,
  // so a typo the #16 schema still accepts (`media.Ghost_Portrait`) is caught.
  if (value.startsWith(MEDIA_ENTITY_PREFIX)) {
    return ctx.mediaEntityIds.has(value)
      ? { ok: true }
      : {
          ok: false,
          reason: `media reference "${value}" does not match any \`data/media/\` entity id`,
        };
  }

  // Asset-path style ref.
  if (ctx.assetIndex.size > 0) {
    const hit = [...ctx.assetIndex].some(
      (path) => path === value || path.startsWith(`${value}.`),
    );
    return hit
      ? { ok: true }
      : {
          ok: false,
          reason: `media reference "${value}" matches no asset under ${ctx.mediaDirLabel}/`,
        };
  }

  return { ok: true, formatOnly: true };
}

export { MEDIA_ENTITY_PREFIX, ASSET_EXTENSION, REPO_ROOT };

/*
 * This module is a pure library. The Implementation Plan §3 `scripts/check-media-refs.ts`
 * command surface is `npm run check:media-refs`, which runs
 * `validate-entities.ts --media-only` — one loader, no circular import.
 */
