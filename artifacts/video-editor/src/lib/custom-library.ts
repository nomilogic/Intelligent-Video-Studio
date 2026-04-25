/**
 * Custom Library — user-saved presets persisted to `localStorage`.
 *
 * A preset captures a snapshot of one clip's stylistic + transform fields so
 * the user can re-stamp the same look on any new clip with one click. We
 * store ONLY presentation properties — never `src`, `startTime`, `duration`,
 * or `trackIndex` — so the preset can be applied to any media type without
 * shifting timing or breaking media references.
 *
 * The list is bounded to `MAX_PRESETS` to keep `localStorage` payloads
 * reasonable. When the list is full, saving evicts the oldest entry.
 */

import type { Clip } from "./types";

const STORAGE_KEY = "video-editor:custom-library:v1";
const MAX_PRESETS = 200;

/** Properties of a Clip that we persist into a preset. Everything that's
 * not in this list is stripped on save. */
export const PRESET_FIELDS = [
  "label",
  "mediaType",
  "text",
  "textStyle",
  "x", "y", "width", "height",
  "opacity", "rotation", "scale",
  "flipH", "flipV", "blendMode", "borderRadius",
  "preserveRatio",
  "cropX", "cropY", "cropWidth", "cropHeight",
  "filters",
  "speed",
  "animationIn", "animationOut",
  "animationInDuration", "animationOutDuration",
  "color",
  "effects",
  "transitionIn",
  "mask",
  "textAutoScale",
  "chromaKey",
  "blurAmount",
  "maskAffectsTracksBelow",
  "shapeKind",
  "fill",
  "strokeColor", "strokeWidth",
  "specialKind", "specialIntensity", "specialColor",
] as const;

export interface CustomPreset {
  id: string;
  name: string;
  /** UNIX ms when the preset was saved. Used for ordering and eviction. */
  savedAt: number;
  /** Snapshot of presentation fields from the source clip. */
  data: Partial<Clip>;
}

/** Read all saved presets from localStorage. Returns [] on any parse error. */
export function loadPresets(): CustomPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is CustomPreset =>
      p && typeof p.id === "string" && typeof p.name === "string"
        && typeof p.savedAt === "number" && p.data && typeof p.data === "object",
    );
  } catch {
    return [];
  }
}

/** Persist the entire preset list. Silently swallows quota errors so the
 * editor never crashes on a full localStorage. */
function savePresets(list: CustomPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota exceeded — silently drop */
  }
}

/** Strip a Clip down to the persistence-safe subset defined by PRESET_FIELDS. */
function snapshotClip(clip: Clip): Partial<Clip> {
  const out: Record<string, any> = {};
  for (const field of PRESET_FIELDS) {
    const v = (clip as any)[field];
    if (v !== undefined) out[field] = v;
  }
  return out;
}

/** Save a new preset. Returns the saved record (with assigned id). */
export function savePreset(name: string, sourceClip: Clip): CustomPreset {
  const list = loadPresets();
  const preset: CustomPreset = {
    id: `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || `Preset ${list.length + 1}`,
    savedAt: Date.now(),
    data: snapshotClip(sourceClip),
  };
  // Newest first; evict oldest when over cap.
  const next = [preset, ...list].slice(0, MAX_PRESETS);
  savePresets(next);
  return preset;
}

/** Delete a preset by id. Returns true if a preset was removed. */
export function deletePreset(id: string): boolean {
  const list = loadPresets();
  const next = list.filter((p) => p.id !== id);
  if (next.length === list.length) return false;
  savePresets(next);
  return true;
}

/** Rename a preset by id. Returns the updated preset or undefined. */
export function renamePreset(id: string, name: string): CustomPreset | undefined {
  const list = loadPresets();
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return undefined;
  list[idx] = { ...list[idx], name: name.trim() || list[idx].name };
  savePresets(list);
  return list[idx];
}

/** Build the partial-Clip patch to apply a preset to a target clip. The
 * patch intentionally excludes timing/track fields so the user can drop the
 * styling onto any existing clip without disturbing its place on the
 * timeline. */
export function presetToClipPatch(preset: CustomPreset): Partial<Clip> {
  const { data } = preset;
  const patch: Record<string, any> = {};
  for (const field of PRESET_FIELDS) {
    const v = (data as any)[field];
    if (v !== undefined) patch[field] = v;
  }
  return patch;
}
