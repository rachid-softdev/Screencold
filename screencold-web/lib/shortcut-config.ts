"use client";

export interface ShortcutEntry {
  id: string;
  label: string;
  keys: string;
  defaultKeys: string;
}

const STORAGE_KEY = "screencold-shortcuts";

export const DEFAULT_SHORTCUTS: ShortcutEntry[] = [
  { id: "command-palette", label: "Palette de commandes", keys: "mod+k", defaultKeys: "mod+k" },
  { id: "shortcuts-panel", label: "Panneau des raccourcis", keys: "?", defaultKeys: "?" },
  { id: "new-audit", label: "Nouvel audit", keys: "n", defaultKeys: "n" },
  { id: "new-campaign", label: "Nouvelle campagne", keys: "shift+n", defaultKeys: "shift+n" },
  { id: "go-dashboard", label: "Tableau de bord", keys: "g+d", defaultKeys: "g+d" },
  { id: "go-audits", label: "Audits", keys: "g+a", defaultKeys: "g+a" },
  { id: "go-campaigns", label: "Campagnes", keys: "g+c", defaultKeys: "g+c" },
  { id: "go-settings", label: "Paramètres", keys: "g+p", defaultKeys: "g+p" },
];

export function loadShortcuts(): ShortcutEntry[] {
  if (typeof window === "undefined") return DEFAULT_SHORTCUTS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SHORTCUTS;
    const parsed = JSON.parse(stored) as ShortcutEntry[];
    // Merge with defaults to handle new shortcuts added in updates
    return DEFAULT_SHORTCUTS.map((def) => {
      const custom = parsed.find((p) => p.id === def.id);
      return custom && custom.keys ? { ...def, keys: custom.keys } : def;
    });
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

export function saveShortcuts(shortcuts: ShortcutEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
}

export function resetShortcuts(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export interface ParsedShortcut {
  key: string;
  meta?: boolean;
  shift?: boolean;
  leader?: string;
}

/**
 * Converts a shortcut key string (e.g. "mod+k", "g+d", "shift+n", "?")
 * into the format expected by useKeyboardShortcuts.
 */
export function parseShortcutKeys(keys: string): ParsedShortcut {
  const parts = keys.split("+");
  const result: ParsedShortcut = { key: parts[parts.length - 1] };
  for (const p of parts.slice(0, -1)) {
    if (p === "mod") result.meta = true;
    if (p === "shift") result.shift = true;
  }
  return result;
}

/**
 * Creates a shortcut definition object for a given ShortcutEntry and handler.
 * Supports leader sequences like "g+d".
 */
export function toShortcutDef(
  entry: ShortcutEntry,
  handler: () => void
): { key: string; meta?: boolean; shift?: boolean; leader?: string; handler: () => void; allowInInputs?: boolean } {
  const parts = entry.keys.split("+");
  if (parts.length === 2 && parts[0].length === 1 && !["mod", "shift", "ctrl", "alt"].includes(parts[0])) {
    // Leader sequence: "g+d" → leader="g", key="d"
    return { key: parts[1], leader: parts[0], handler };
  }
  const parsed = parseShortcutKeys(entry.keys);
  return { ...parsed, handler, allowInInputs: parsed.key === "?" };
}
