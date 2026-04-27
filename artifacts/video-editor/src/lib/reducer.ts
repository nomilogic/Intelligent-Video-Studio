import {
  EditorState,
  EditorAction,
  Clip,
  Track,
  Marker,
  Keyframe,
  EasingType,
  DEFAULT_FILTERS,
  DEFAULT_TEXT_STYLE,
  DEFAULT_DRAW_BRUSH,
} from "./types";
import { getTemplateByKey } from "./templates";

const HISTORY_LIMIT = 50;

const HISTORY_IGNORED_ACTIONS = new Set([
  "SET_TIME",
  "TOGGLE_PLAY",
  "SET_PLAYING",
  "SELECT_CLIP",
  "SELECT_CLIPS",
  "TOGGLE_CLIP_SELECTION",
  "SET_ZOOM",
  "TOGGLE_SNAP",
  "SET_TOOL",
  "ADD_AI_MESSAGE",
  "UNDO",
  "REDO",
]);

function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Animatable transform properties that get an automatic anchor keyframe at a
// new clip's start time. The default easing is "step" — Adobe Animate / Flash
// style. That means: until the user explicitly turns on tweening for a
// property, additional keyframes will just hold/snap, not interpolate.
const DEFAULT_KF_PROPS = ["x", "y", "width", "height", "rotation", "scale", "opacity"] as const;

function defaultClipKeyframes(clip: Clip): Keyframe[] {
  return DEFAULT_KF_PROPS.map((prop) => ({
    id: uid("kf"),
    clipId: clip.id,
    time: clip.startTime,
    property: prop,
    value: (clip as any)[prop] as number,
    easing: "easeInOut" as EasingType,
  }));
}

export function makeClip(partial: Partial<Clip> & { id?: string }): Clip {
  return {
    id: partial.id ?? uid("clip"),
    label: partial.label ?? "New Clip",
    mediaType: partial.mediaType ?? "blank",
    trackIndex: partial.trackIndex ?? 0,
    startTime: partial.startTime ?? 0,
    duration: partial.duration ?? 5,
    trimStart: partial.trimStart ?? 0,
    trimEnd: partial.trimEnd ?? 0,
    src: partial.src,
    thumbnail: partial.thumbnail,
    text: partial.text,
    textStyle: partial.textStyle ?? { ...DEFAULT_TEXT_STYLE },
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    width: partial.width ?? 1,
    height: partial.height ?? 1,
    opacity: partial.opacity ?? 1,
    rotation: partial.rotation ?? 0,
    scale: partial.scale ?? 1,
    flipH: partial.flipH ?? false,
    flipV: partial.flipV ?? false,
    blendMode: partial.blendMode ?? "normal",
    borderRadius: partial.borderRadius ?? 0,
    preserveRatio: partial.preserveRatio ?? false,
    cropX: partial.cropX ?? 0,
    cropY: partial.cropY ?? 0,
    cropWidth: partial.cropWidth ?? 1,
    cropHeight: partial.cropHeight ?? 1,
    filters: partial.filters ?? { ...DEFAULT_FILTERS },
    speed: partial.speed ?? 1,
    animationIn: partial.animationIn ?? "none",
    animationOut: partial.animationOut ?? "none",
    animationInDuration: partial.animationInDuration ?? 0.5,
    animationOutDuration: partial.animationOutDuration ?? 0.5,
    volume: partial.volume ?? 1,
    muted: partial.muted ?? false,
    locked: partial.locked ?? false,
    hidden: partial.hidden ?? false,
    color: partial.color ?? "#1f1f24",
    effects: partial.effects ?? [],
    transitionIn: partial.transitionIn ?? { type: "none", duration: 0.5 },
    chromaKey: partial.chromaKey,
    mask:
      partial.mask ??
      (partial.mediaType === "maskLayer"
        ? {
            src: "data:image/svg+xml;utf8," + encodeURIComponent(
              `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='48' fill='white'/></svg>`,
            ),
            mode: "alpha" as const,
            invert: false,
            fit: "stretch" as const,
            scale: 1,
            offsetX: 0,
            offsetY: 0,
            opacity: 1,
          }
        : undefined),
    blurAmount:
      partial.blurAmount ??
      (partial.mediaType === "logoBlur" ? 16 : undefined),
  };
}

export function makeTrack(partial: Partial<Track> & { id?: string }): Track {
  return {
    id: partial.id ?? uid("track"),
    name: partial.name ?? "Track",
    type: partial.type ?? "video",
    muted: partial.muted ?? false,
    hidden: partial.hidden ?? false,
    locked: partial.locked ?? false,
  };
}

export const initialState: EditorState = {
  clips: [],
  transitions: [],
  keyframes: [],
  tracks: [
    makeTrack({ id: "track-overlay", name: "Overlay", type: "overlay" }),
    makeTrack({ id: "track-video", name: "Video", type: "video" }),
    makeTrack({ id: "track-overlay2", name: "Overlay 2", type: "overlay" }),
  ],
  assets: [],
  markers: [],
  canvasWidth: 1080,
  canvasHeight: 1920,
  duration: 10,
  selectedClipIds: [],
  currentTime: 0,
  isPlaying: false,
  zoom: 1,
  snapEnabled: true,
  tool: "select",
  drawBrush: { ...DEFAULT_DRAW_BRUSH },
  aiHistory: [],
  background: "#000000",
};

interface RootState {
  present: EditorState;
  past: EditorState[];
  future: EditorState[];
}

export const initialRootState: RootState = {
  present: initialState,
  past: [],
  future: [],
};

function applyClipUpdate(state: EditorState, ids: string[], updates: Partial<Clip>): EditorState {
  const ensureFilters = (c: Clip): Clip => {
    let next: Clip = { ...c, ...updates };
    if (updates.filters) {
      next = { ...next, filters: { ...c.filters, ...updates.filters } };
    }
    if (updates.textStyle) {
      next = { ...next, textStyle: { ...(c.textStyle ?? DEFAULT_TEXT_STYLE), ...updates.textStyle } };
    }
    // Mask is a partial-merge as well, but `null` explicitly clears it.
    if (updates.mask === null as any) {
      const { mask: _drop, ...rest } = next;
      next = rest as Clip;
    } else if (updates.mask) {
      next = { ...next, mask: { ...(c.mask ?? {} as any), ...updates.mask } };
    }
    return next;
  };

  // When a clip's startTime changes, its keyframes (stored as absolute project
  // time) must shift by the same delta — otherwise dragging a clip on the
  // timeline leaves keyframes anchored at the old position, where they appear
  // to "vanish" because they fall outside the clip's new visible range.
  let nextKeyframes = state.keyframes;
  if (updates.startTime !== undefined) {
    const deltas = new Map<string, number>();
    for (const c of state.clips) {
      if (ids.includes(c.id)) {
        const d = (updates.startTime as number) - c.startTime;
        if (d !== 0) deltas.set(c.id, d);
      }
    }
    if (deltas.size > 0) {
      nextKeyframes = state.keyframes.map((k) =>
        deltas.has(k.clipId) ? { ...k, time: k.time + (deltas.get(k.clipId) as number) } : k,
      );
    }
  }

  // Bind transform edits to the active keyframe. When the user changes
  // x/y/width/height/rotation/scale/opacity in the inspector or by dragging
  // on the canvas, we update the keyframe at-or-before the playhead (or the
  // first keyframe if the playhead is before all of them). This makes the
  // inspector behave like Adobe / Figma — the value you see is the value
  // at the current frame, and editing it writes back to that frame.
  const TRANSFORM_KF_PROPS = ["x", "y", "width", "height", "rotation", "scale", "opacity"] as const;
  const propsToBind = TRANSFORM_KF_PROPS.filter((p) => (updates as any)[p] !== undefined);
  if (propsToBind.length > 0) {
    const cur = state.currentTime;
    const updated = [...nextKeyframes];
    for (const id of ids) {
      for (const prop of propsToBind) {
        const newVal = (updates as any)[prop] as number;
        // Indices of this clip+prop's keyframes in the updated array.
        const indices: number[] = [];
        for (let i = 0; i < updated.length; i++) {
          const k = updated[i];
          if (k.clipId === id && k.property === prop) indices.push(i);
        }
        if (indices.length === 0) continue;
        // Find keyframe at-or-before cur; fall back to the first one.
        indices.sort((a, b) => updated[a].time - updated[b].time);
        let targetIdx = indices[0];
        for (const i of indices) {
          if (updated[i].time <= cur + 0.001) targetIdx = i;
        }
        updated[targetIdx] = { ...updated[targetIdx], value: newVal };
      }
    }
    nextKeyframes = updated;
  }

  return {
    ...state,
    clips: state.clips.map((c) => (ids.includes(c.id) ? ensureFilters(c) : c)),
    keyframes: nextKeyframes,
  };
}

function splitClipAt(state: EditorState, clipId: string, time: number): EditorState {
  const idx = state.clips.findIndex((c) => c.id === clipId);
  if (idx < 0) return state;
  const orig = state.clips[idx];
  const EPS = 0.02;
  if (time <= orig.startTime + EPS || time >= orig.startTime + orig.duration - EPS) return state;
  const firstDur = time - orig.startTime;
  const first: Clip = {
    ...orig,
    duration: firstDur,
    animationOut: "none",
    animationOutDuration: 0,
  };
  const second: Clip = {
    ...orig,
    id: uid("clip"),
    startTime: time,
    duration: orig.duration - firstDur,
    trimStart: orig.trimStart + firstDur * (orig.speed || 1),
    animationIn: "none",
    animationInDuration: 0,
  };

  // ── Keyframe handling ────────────────────────────────────────────────
  // Original clip's keyframes split between first/second by their time.
  // Each half also gets an anchor keyframe at its first frame for every
  // standard transform property — so the user can immediately see the
  // diamond on the timeline and tweak from there. The anchor inherits the
  // interpolated value at the cut so the visual result is unchanged.
  const origKfs = state.keyframes.filter((k) => k.clipId === orig.id);
  const otherKfs = state.keyframes.filter((k) => k.clipId !== orig.id);
  const firstEnd = first.startTime + first.duration;

  // Resolve a property's value at an absolute time using the original
  // clip's keyframes (or the static prop as fallback).
  const resolveAt = (prop: string, atTime: number): number => {
    const propKfs = origKfs
      .filter((k) => k.property === prop)
      .sort((a, b) => a.time - b.time);
    if (propKfs.length === 0) return (orig as any)[prop] ?? 0;
    if (atTime <= propKfs[0].time) return propKfs[0].value;
    if (atTime >= propKfs[propKfs.length - 1].time) return propKfs[propKfs.length - 1].value;
    for (let i = 0; i < propKfs.length - 1; i++) {
      const a = propKfs[i];
      const b = propKfs[i + 1];
      if (atTime >= a.time && atTime <= b.time) {
        if (a.easing === "step") return a.value;
        const t = (atTime - a.time) / (b.time - a.time || 1);
        return a.value + (b.value - a.value) * t;
      }
    }
    return propKfs[0].value;
  };

  const firstKfs: Keyframe[] = [];
  const secondKfs: Keyframe[] = [];

  // Re-bucket original keyframes into first / second halves.
  for (const k of origKfs) {
    if (k.time <= firstEnd - EPS) {
      firstKfs.push({ ...k });
    } else {
      secondKfs.push({ ...k, id: uid("kf"), clipId: second.id });
    }
  }

  // Ensure each transform prop has an anchor keyframe at the first frame
  // of each half. Skip if one already exists at-or-near that time.
  const hasKfAt = (kfs: Keyframe[], prop: string, atTime: number): boolean =>
    kfs.some((k) => k.property === prop && Math.abs(k.time - atTime) < EPS);

  for (const prop of DEFAULT_KF_PROPS) {
    if (!hasKfAt(firstKfs, prop, first.startTime)) {
      firstKfs.push({
        id: uid("kf"),
        clipId: first.id,
        time: first.startTime,
        property: prop,
        value: resolveAt(prop, first.startTime),
        easing: "easeInOut",
      });
    }
    if (!hasKfAt(secondKfs, prop, second.startTime)) {
      secondKfs.push({
        id: uid("kf"),
        clipId: second.id,
        time: second.startTime,
        property: prop,
        value: resolveAt(prop, second.startTime),
        easing: "easeInOut",
      });
    }
  }

  return {
    ...state,
    clips: [...state.clips.slice(0, idx), first, second, ...state.clips.slice(idx + 1)],
    keyframes: [...otherKfs, ...firstKfs, ...secondKfs],
  };
}

function splitIntoParts(state: EditorState, clipId: string, parts: number): EditorState {
  if (parts < 2) return state;
  const orig = state.clips.find((c) => c.id === clipId);
  if (!orig) return state;
  const partDuration = orig.duration / parts;
  let s = state;
  for (let i = 1; i < parts; i++) {
    const cuts = s.clips.filter((c) => c.id === clipId || c.label === orig.label);
    // find the rightmost piece that contains the cut point
    const cutTime = orig.startTime + i * partDuration;
    const target = s.clips
      .filter(
        (c) =>
          c.startTime <= cutTime &&
          c.startTime + c.duration > cutTime &&
          (c.id === clipId || c.src === orig.src) &&
          c.trackIndex === orig.trackIndex,
      )
      .sort((a, b) => b.startTime - a.startTime)[0];
    if (target) s = splitClipAt(s, target.id, cutTime);
    void cuts;
  }
  return s;
}

function splitEvery(state: EditorState, clipId: string, seconds: number): EditorState {
  if (seconds <= 0.1) return state;
  const orig = state.clips.find((c) => c.id === clipId);
  if (!orig) return state;
  let s = state;
  let cutTime = orig.startTime + seconds;
  const end = orig.startTime + orig.duration;
  while (cutTime < end - 0.05) {
    const target = s.clips
      .filter(
        (c) =>
          c.startTime <= cutTime &&
          c.startTime + c.duration > cutTime &&
          (c.id === clipId || c.src === orig.src) &&
          c.trackIndex === orig.trackIndex,
      )
      .sort((a, b) => b.startTime - a.startTime)[0];
    if (!target) break;
    s = splitClipAt(s, target.id, cutTime);
    cutTime += seconds;
  }
  return s;
}

function rippleDelete(state: EditorState, clipId: string): EditorState {
  const target = state.clips.find((c) => c.id === clipId);
  if (!target) return state;
  const removedDur = target.duration;
  const removedEnd = target.startTime + removedDur;
  return {
    ...state,
    clips: state.clips
      .filter((c) => c.id !== clipId)
      .map((c) => {
        if (c.trackIndex === target.trackIndex && c.startTime >= removedEnd - 0.001) {
          return { ...c, startTime: Math.max(0, c.startTime - removedDur) };
        }
        return c;
      }),
    selectedClipIds: state.selectedClipIds.filter((id) => id !== clipId),
  };
}

function applyOps(state: EditorState, ops: any[]): EditorState {
  let s = state;
  for (const op of ops || []) {
    if (!op || !op.type) continue;
    const p = op.payload || {};
    switch (op.type) {
      case "addClip": {
        const c = makeClip(p);
        s = { ...s, clips: [...s.clips, c], keyframes: [...s.keyframes, ...defaultClipKeyframes(c)] };
        break;
      }
      case "moveClip":
        s = applyClipUpdate(s, [p.clipId], {
          ...(p.x !== undefined && { x: p.x }),
          ...(p.y !== undefined && { y: p.y }),
          ...(p.startTime !== undefined && { startTime: p.startTime }),
          ...(p.trackIndex !== undefined && { trackIndex: p.trackIndex }),
        });
        break;
      case "resizeClip":
        s = applyClipUpdate(s, [p.clipId], {
          ...(p.width !== undefined && { width: p.width }),
          ...(p.height !== undefined && { height: p.height }),
        });
        break;
      case "setOpacity":
        s = applyClipUpdate(s, [p.clipId], { opacity: p.opacity });
        break;
      case "setRotation":
        s = applyClipUpdate(s, [p.clipId], { rotation: p.rotation });
        break;
      case "setScale":
        s = applyClipUpdate(s, [p.clipId], { scale: p.scale });
        break;
      case "deleteClip":
        s = {
          ...s,
          clips: s.clips.filter((c) => c.id !== p.clipId),
          selectedClipIds: s.selectedClipIds.filter((id) => id !== p.clipId),
        };
        break;
      case "trimClip":
        s = applyClipUpdate(s, [p.clipId], {
          ...(p.duration !== undefined && { duration: p.duration }),
          ...(p.trimStart !== undefined && { trimStart: p.trimStart }),
          ...(p.trimEnd !== undefined && { trimEnd: p.trimEnd }),
        });
        break;
      case "setAnimation":
        s = applyClipUpdate(s, [p.clipId], {
          ...(p.animationIn !== undefined && { animationIn: p.animationIn }),
          ...(p.animationOut !== undefined && { animationOut: p.animationOut }),
          ...(p.animationInDuration !== undefined && { animationInDuration: p.animationInDuration }),
          ...(p.animationOutDuration !== undefined && { animationOutDuration: p.animationOutDuration }),
        });
        break;
      case "cropClip":
        s = applyClipUpdate(s, [p.clipId], {
          cropX: p.cropX, cropY: p.cropY, cropWidth: p.cropWidth, cropHeight: p.cropHeight,
        });
        break;
      case "setBlendMode":
        s = applyClipUpdate(s, [p.clipId], { blendMode: p.blendMode });
        break;
      case "setVolume":
        s = applyClipUpdate(s, [p.clipId], { volume: p.volume });
        break;
      case "setSpeed":
        s = applyClipUpdate(s, [p.clipId], { speed: Math.max(0.1, Math.min(8, p.speed || 1)) });
        break;
      case "flipClip":
        s = applyClipUpdate(s, [p.clipId], {
          ...(p.flipH !== undefined && { flipH: p.flipH }),
          ...(p.flipV !== undefined && { flipV: p.flipV }),
        });
        break;
      case "setFilter": {
        const filterPatch: any = {};
        ["brightness", "contrast", "saturation", "hue", "blur", "grayscale", "sepia", "invert"].forEach((k) => {
          if (p[k] !== undefined) filterPatch[k] = p[k];
        });
        s = applyClipUpdate(s, [p.clipId], { filters: filterPatch });
        break;
      }
      case "applyPreset": {
        const preset = (p.preset || "").toLowerCase();
        const patch: Partial<Clip> = {};
        if (preset === "vintage") patch.filters = { brightness: 105, contrast: 110, saturation: 70, hue: 15, blur: 0, grayscale: 0, sepia: 50, invert: 0 } as any;
        else if (preset === "noir" || preset === "bw") patch.filters = { brightness: 105, contrast: 130, saturation: 0, hue: 0, blur: 0, grayscale: 100, sepia: 0, invert: 0 } as any;
        else if (preset === "cinematic") patch.filters = { brightness: 95, contrast: 120, saturation: 110, hue: -5, blur: 0, grayscale: 0, sepia: 10, invert: 0 } as any;
        else if (preset === "vivid") patch.filters = { brightness: 105, contrast: 115, saturation: 150, hue: 0, blur: 0, grayscale: 0, sepia: 0, invert: 0 } as any;
        else if (preset === "dreamy") patch.filters = { brightness: 110, contrast: 90, saturation: 120, hue: 0, blur: 1.5, grayscale: 0, sepia: 0, invert: 0 } as any;
        else if (preset === "reset") patch.filters = { ...DEFAULT_FILTERS };
        s = applyClipUpdate(s, [p.clipId], patch);
        break;
      }
      case "setText":
        s = applyClipUpdate(s, [p.clipId], {
          ...(p.text !== undefined && { text: p.text }),
          ...(p.textStyle !== undefined && { textStyle: p.textStyle }),
        });
        break;
      case "addText": {
        const c = makeClip({
          ...p,
          mediaType: "text",
          text: p.text || "New Text",
          label: p.label || "Text",
          textStyle: { ...DEFAULT_TEXT_STYLE, ...(p.textStyle || {}) },
          color: "#8b5cf6",
          startTime: p.startTime ?? s.currentTime,
          duration: p.duration ?? 4,
          x: p.x ?? 0.1,
          y: p.y ?? 0.4,
          width: p.width ?? 0.8,
          height: p.height ?? 0.2,
          // No default fade — text appears/disappears cleanly. The user can
          // opt in via the Animations tab or AI prompt.
          animationIn: p.animationIn ?? "none",
          animationOut: p.animationOut ?? "none",
        });
        s = {
          ...s,
          clips: [...s.clips, c],
          keyframes: [...s.keyframes, ...defaultClipKeyframes(c)],
        };
        break;
      }
      case "setKeyframe": {
        const existing = s.keyframes.findIndex(
          (k) => k.clipId === p.clipId && k.time === p.time && k.property === p.property,
        );
        if (existing >= 0) {
          s = {
            ...s,
            keyframes: s.keyframes.map((k, i) =>
              i === existing ? { ...k, value: p.value, easing: p.easing || k.easing } : k,
            ),
          };
        } else {
          s = {
            ...s,
            keyframes: [
              ...s.keyframes,
              {
                id: p.id || uid("kf"),
                clipId: p.clipId,
                time: p.time,
                property: p.property,
                value: p.value,
                easing: p.easing || "easeInOut",
              },
            ],
          };
        }
        break;
      }
      case "addTransition":
        s = {
          ...s,
          transitions: [
            ...s.transitions,
            {
              id: uid("tr"),
              fromClipId: p.fromClipId,
              toClipId: p.toClipId,
              type: p.type || "fade",
              duration: p.duration || 1,
            },
          ],
        };
        break;
      case "setCanvasSize":
        s = { ...s, canvasWidth: p.width ?? s.canvasWidth, canvasHeight: p.height ?? s.canvasHeight };
        break;
      case "setDuration":
        s = { ...s, duration: p.duration ?? s.duration };
        break;
      case "setBackground":
        s = { ...s, background: p.color ?? s.background };
        break;
      case "cutClip":
      case "splitClip":
        s = splitClipAt(s, p.clipId, p.cutAt ?? p.time);
        break;
      case "duplicateClip": {
        const orig = s.clips.find((c) => c.id === p.clipId);
        if (orig) {
          const dup = makeClip({
            ...orig,
            id: uid("clip"),
            startTime: orig.startTime + orig.duration,
          });
          s = { ...s, clips: [...s.clips, dup] };
        }
        break;
      }
      case "splitIntoParts":
        s = splitIntoParts(s, p.clipId, p.parts || 2);
        break;
      case "splitEvery":
        s = splitEvery(s, p.clipId, p.seconds || 2);
        break;
      case "rippleDelete":
        s = rippleDelete(s, p.clipId);
        break;
      case "addMarker":
        s = {
          ...s,
          markers: [
            ...(s.markers || []),
            {
              id: uid("mk"),
              time: p.time ?? s.currentTime,
              label: p.label,
              color: p.color || "#fb923c",
            },
          ],
        };
        break;
    }
  }
  return s;
}

function presentReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "SET_TIME":
      return { ...state, currentTime: Math.max(0, action.payload) };
    case "TOGGLE_PLAY":
      return { ...state, isPlaying: !state.isPlaying };
    case "SET_PLAYING":
      return { ...state, isPlaying: action.payload };
    case "SELECT_CLIP":
      return {
        ...state,
        selectedClipIds: action.payload ? [action.payload] : [],
      };
    case "SELECT_CLIPS":
      return { ...state, selectedClipIds: action.payload };
    case "TOGGLE_CLIP_SELECTION":
      return {
        ...state,
        selectedClipIds: state.selectedClipIds.includes(action.payload)
          ? state.selectedClipIds.filter((id) => id !== action.payload)
          : [...state.selectedClipIds, action.payload],
      };
    case "UPDATE_CLIP":
      return applyClipUpdate(state, [action.payload.id], action.payload.updates);
    case "UPDATE_CLIPS":
      return applyClipUpdate(state, action.payload.ids, action.payload.updates);
    case "ADD_CLIP": {
      // Auto-promote to a new track when the requested track already has
      // a clip occupying [startTime, startTime + duration]. This avoids
      // accidental overlaps when the user keeps dragging media in.
      const incoming = action.payload;
      const overlaps = (a: Clip, b: Clip) =>
        a.trackIndex === b.trackIndex &&
        a.startTime < b.startTime + b.duration &&
        b.startTime < a.startTime + a.duration;
      const conflict = state.clips.some((c) => overlaps(c, incoming));
      if (!conflict) {
        return {
          ...state,
          clips: [...state.clips, incoming],
          keyframes: [...state.keyframes, ...defaultClipKeyframes(incoming)],
        };
      }
      // Find the lowest free track index that doesn't conflict in this time
      // range. Scan upward from the incoming.trackIndex.
      const occupied = new Set(
        state.clips
          .filter(
            (c) =>
              c.startTime < incoming.startTime + incoming.duration &&
              incoming.startTime < c.startTime + c.duration,
          )
          .map((c) => c.trackIndex),
      );
      let freeTrack = incoming.trackIndex;
      while (occupied.has(freeTrack)) freeTrack++;
      let nextTracks = state.tracks;
      while (nextTracks.length <= freeTrack) {
        nextTracks = [
          ...nextTracks,
          makeTrack({
            type: incoming.mediaType === "audio" ? "audio" : "video",
            name: `Track ${nextTracks.length + 1}`,
          }),
        ];
      }
      const placed: Clip = { ...incoming, trackIndex: freeTrack };
      return {
        ...state,
        tracks: nextTracks,
        clips: [...state.clips, placed],
        keyframes: [...state.keyframes, ...defaultClipKeyframes(placed)],
      };
    }
    case "DELETE_CLIP":
      return {
        ...state,
        clips: state.clips.filter((c) => c.id !== action.payload),
        selectedClipIds: state.selectedClipIds.filter((id) => id !== action.payload),
      };
    case "DELETE_CLIPS":
      return {
        ...state,
        clips: state.clips.filter((c) => !action.payload.includes(c.id)),
        selectedClipIds: state.selectedClipIds.filter((id) => !action.payload.includes(id)),
      };
    case "DUPLICATE_CLIP": {
      const orig = state.clips.find((c) => c.id === action.payload);
      if (!orig) return state;
      const dup = makeClip({
        ...orig,
        id: uid("clip"),
        startTime: orig.startTime + orig.duration,
        label: `${orig.label} copy`,
      });
      return {
        ...state,
        clips: [...state.clips, dup],
        keyframes: [...state.keyframes, ...defaultClipKeyframes(dup)],
        selectedClipIds: [dup.id],
      };
    }
    case "SPLIT_CLIP":
      return splitClipAt(state, action.payload.clipId, action.payload.time);
    case "SPLIT_AT_PLAYHEAD": {
      let s = state;
      const targets = state.selectedClipIds.length
        ? state.selectedClipIds
        : state.clips
            .filter(
              (c) =>
                state.currentTime > c.startTime &&
                state.currentTime < c.startTime + c.duration,
            )
            .map((c) => c.id);
      for (const id of targets) {
        s = splitClipAt(s, id, state.currentTime);
      }
      return s;
    }
    case "ADD_TRACK":
      return {
        ...state,
        tracks: [
          ...state.tracks,
          makeTrack({
            type: action.payload?.type ?? "video",
            name: action.payload?.name ?? `Track ${state.tracks.length + 1}`,
          }),
        ],
      };
    case "DELETE_TRACK": {
      const idx = state.tracks.findIndex((t) => t.id === action.payload);
      if (idx < 0) return state;
      return {
        ...state,
        tracks: state.tracks.filter((t) => t.id !== action.payload),
        clips: state.clips
          .filter((c) => c.trackIndex !== idx)
          .map((c) => (c.trackIndex > idx ? { ...c, trackIndex: c.trackIndex - 1 } : c)),
      };
    }
    case "UPDATE_TRACK":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload.updates } : t,
        ),
      };
    case "SET_DURATION":
      return { ...state, duration: Math.max(1, action.payload) };
    case "SET_CANVAS_SIZE":
      return { ...state, canvasWidth: action.payload.width, canvasHeight: action.payload.height };
    case "SET_ZOOM":
      return { ...state, zoom: Math.max(0.25, Math.min(4, action.payload)) };
    case "TOGGLE_SNAP":
      return { ...state, snapEnabled: !state.snapEnabled };
    case "SET_BACKGROUND":
      return { ...state, background: action.payload };
    case "ADD_KEYFRAME": {
      const kf = { ...action.payload, id: action.payload.id ?? uid("kf") };
      const existing = state.keyframes.findIndex(
        (k) => k.clipId === kf.clipId && k.time === kf.time && k.property === kf.property,
      );
      if (existing >= 0) {
        return {
          ...state,
          keyframes: state.keyframes.map((k, i) => (i === existing ? { ...k, value: kf.value } : k)),
        };
      }
      return { ...state, keyframes: [...state.keyframes, kf] };
    }
    case "UPDATE_KEYFRAME":
      return {
        ...state,
        keyframes: state.keyframes.map((k) =>
          k.id === action.payload.id ? { ...k, ...action.payload } : k,
        ),
      };
    case "DELETE_KEYFRAME":
      return { ...state, keyframes: state.keyframes.filter((k) => k.id !== action.payload) };
    case "DELETE_KEYFRAMES_AT":
      return {
        ...state,
        keyframes: state.keyframes.filter(
          (k) => !(k.clipId === action.payload.clipId && Math.abs(k.time - action.payload.time) < 0.02),
        ),
      };
    case "ADD_TRANSITION": {
      const tr = { ...action.payload, id: action.payload.id ?? uid("tr") };
      return { ...state, transitions: [...state.transitions, tr] };
    }
    case "DELETE_TRANSITION":
      return { ...state, transitions: state.transitions.filter((t) => t.id !== action.payload) };
    case "ADD_ASSET":
      return { ...state, assets: [...state.assets, action.payload] };
    case "REMOVE_ASSET":
      return { ...state, assets: state.assets.filter((a) => a.id !== action.payload) };
    case "ADD_AI_MESSAGE":
      return { ...state, aiHistory: [...state.aiHistory, action.payload].slice(-20) };
    case "SET_TOOL":
      return { ...state, tool: action.payload };
    case "SET_DRAW_BRUSH":
      return { ...state, drawBrush: { ...state.drawBrush, ...action.payload } };
    case "ADD_MARKER": {
      const m: Marker = {
        id: uid("mk"),
        time: action.payload.time,
        label: action.payload.label,
        color: action.payload.color || "#fb923c",
      };
      return { ...state, markers: [...(state.markers || []), m] };
    }
    case "DELETE_MARKER":
      return { ...state, markers: (state.markers || []).filter((m) => m.id !== action.payload) };
    case "CLEAR_MARKERS":
      return { ...state, markers: [] };
    case "SPLIT_INTO_PARTS":
      return splitIntoParts(state, action.payload.clipId, action.payload.parts);
    case "SPLIT_EVERY":
      return splitEvery(state, action.payload.clipId, action.payload.seconds);
    case "RIPPLE_DELETE":
      return rippleDelete(state, action.payload);
    case "APPLY_OPERATIONS":
      return applyOps(state, action.payload);
    case "REPLACE_STATE":
      return { ...action.payload, isPlaying: false };
    case "APPLY_TEMPLATE": {
      const tpl = getTemplateByKey(action.payload.templateKey);
      if (!tpl) return state;
      const built = tpl.build();
      return {
        ...state,
        ...built,
        // Reset the playhead and selection so the template plays cleanly.
        currentTime: 0,
        isPlaying: false,
        selectedClipIds: [],
        // Preserve user-imported assets; templates use only blank placeholders.
        assets: state.assets,
        // Preserve UI prefs that are unrelated to the project content.
        zoom: state.zoom,
        snapEnabled: state.snapEnabled,
        tool: state.tool,
        aiHistory: state.aiHistory,
      };
    }
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function rootReducer(state: RootState, action: EditorAction): RootState {
  if (action.type === "UNDO") {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, -1);
    return {
      past: newPast,
      present: { ...previous, isPlaying: false, currentTime: state.present.currentTime },
      future: [state.present, ...state.future].slice(0, HISTORY_LIMIT),
    };
  }
  if (action.type === "REDO") {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    return {
      past: [...state.past, state.present].slice(-HISTORY_LIMIT),
      present: { ...next, isPlaying: false, currentTime: state.present.currentTime },
      future: newFuture,
    };
  }

  const nextPresent = presentReducer(state.present, action);
  if (nextPresent === state.present) return state;

  if (HISTORY_IGNORED_ACTIONS.has(action.type)) {
    return { ...state, present: nextPresent };
  }

  return {
    past: [...state.past, state.present].slice(-HISTORY_LIMIT),
    present: nextPresent,
    future: [],
  };
}
