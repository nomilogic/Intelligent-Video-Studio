/**
 * Custom Template Library — user-saved full timeline snapshots stored in
 * localStorage. Unlike custom presets (which capture a single clip's style),
 * a custom template saves the entire timeline so the user can reuse their
 * own layouts and share them with other users.
 */

import type { EditorState } from "./types";

const STORAGE_KEY = "video-editor:custom-templates:v1";
const MAX_TEMPLATES = 50;

export interface CustomTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  savedAt: number;
  /** Snapshot of EditorState fields needed to restore the template. */
  snapshot: Pick<EditorState, "clips" | "duration" | "canvasWidth" | "canvasHeight" | "background" | "tracks" | "keyframes" | "transitions" | "markers">;
}

export function loadCustomTemplates(): CustomTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is CustomTemplate =>
        t && typeof t.id === "string" && typeof t.name === "string" && t.snapshot,
    );
  } catch {
    return [];
  }
}

function persistTemplates(list: CustomTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota exceeded */
  }
}

export function saveCustomTemplate(
  name: string,
  description: string,
  emoji: string,
  state: EditorState,
): CustomTemplate {
  const list = loadCustomTemplates();
  const tpl: CustomTemplate = {
    id: `ctpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || `My Template ${list.length + 1}`,
    description: description.trim(),
    emoji: emoji || "⭐",
    savedAt: Date.now(),
    snapshot: {
      clips: state.clips,
      duration: state.duration,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      background: state.background,
      tracks: state.tracks,
      keyframes: state.keyframes,
      transitions: state.transitions,
      markers: state.markers,
    },
  };
  const next = [tpl, ...list].slice(0, MAX_TEMPLATES);
  persistTemplates(next);
  return tpl;
}

export function deleteCustomTemplate(id: string): boolean {
  const list = loadCustomTemplates();
  const next = list.filter((t) => t.id !== id);
  if (next.length === list.length) return false;
  persistTemplates(next);
  return true;
}

export function renameCustomTemplate(id: string, name: string): void {
  const list = loadCustomTemplates();
  const idx = list.findIndex((t) => t.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], name };
  persistTemplates(list);
}

// ─────── Export / Import ───────

/** Download all custom templates as a JSON file. */
export function exportCustomTemplates(): void {
  const list = loadCustomTemplates();
  const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `my-templates-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Merge imported templates from a JSON file. Returns count of imported templates. */
export async function importCustomTemplates(file: File): Promise<number> {
  const text = await file.text();
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error("Invalid JSON file."); }

  if (!Array.isArray(parsed)) throw new Error("Expected an array of templates.");

  const valid = (parsed as any[]).filter(
    (t) => t && typeof t.id === "string" && typeof t.name === "string" && t.snapshot,
  ) as CustomTemplate[];

  if (valid.length === 0) throw new Error("No valid templates found in file.");

  const existing = loadCustomTemplates();
  const existingIds = new Set(existing.map((t) => t.id));

  const newOnes = valid
    .filter((t) => !existingIds.has(t.id))
    .map((t) => ({ ...t, id: `ctpl-import-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}` }));

  const merged = [...newOnes, ...existing].slice(0, MAX_TEMPLATES);
  persistTemplates(merged);
  return newOnes.length;
}
