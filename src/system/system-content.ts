/**
 * Shared placeholder system content (Cockpit Interaction Prototype Specification
 * §18). The SAME component is used by the desktop SystemOverlay and the mobile
 * RemoteTerminal — the two shells differ, the system content does not
 * (Spec §27, §39 failure condition: "mobile/desktop architecture becomes
 * tightly coupled").
 *
 * This is a prototype stub. It has no real map, no data, no Local Bubble.
 */

export interface SystemContentOptions {
  system: string;
}

const PLACEHOLDER: Record<string, string[]> = {
  astronav: [
    "ASTRONAVIGATION",
    "SYSTEM ONLINE",
    "LOCAL SPACE",
    "COMMONWEALTH OVERLAY",
    "[ PROTOTYPE MODULE ]",
  ],
  database: [
    "DATABASE INDEX",
    "SYSTEM ONLINE",
    "RECORDS: — ",
    "[ PROTOTYPE MODULE ]",
  ],
};

export function buildSystemContent(opts: SystemContentOptions): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "system-content";
  wrap.dataset.system = opts.system;

  const lines = PLACEHOLDER[opts.system] ?? [
    opts.system.toUpperCase(),
    "SYSTEM ONLINE",
    "[ PROTOTYPE MODULE ]",
  ];

  for (const [i, text] of lines.entries()) {
    const row = document.createElement("div");
    row.className = i === 0 ? "system-content-title" : "system-content-line";
    row.textContent = text;
    wrap.appendChild(row);
  }

  const note = document.createElement("p");
  note.className = "system-content-note";
  note.textContent =
    "Placeholder interface — Phase 0 spike. Real Astronavigation content is out of scope (Spec §2, §18).";
  wrap.appendChild(note);

  return wrap;
}
