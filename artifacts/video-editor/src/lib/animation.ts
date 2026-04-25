import type { Clip, ClipFilters, ClipTransition, EasingType, Effect, Keyframe, TransitionType } from "./types";
import TWEEN from "@tweenjs/tween.js";

const E = TWEEN.Easing;

const EASING_MAP: Record<string, (t: number) => number> = {
  linear:       E.Linear.None,
  quadIn:       E.Quadratic.In,
  quadOut:      E.Quadratic.Out,
  quadInOut:    E.Quadratic.InOut,
  cubicIn:      E.Cubic.In,
  cubicOut:     E.Cubic.Out,
  cubicInOut:   E.Cubic.InOut,
  quartIn:      E.Quartic.In,
  quartOut:     E.Quartic.Out,
  quartInOut:   E.Quartic.InOut,
  quintIn:      E.Quintic.In,
  quintOut:     E.Quintic.Out,
  quintInOut:   E.Quintic.InOut,
  sineIn:       E.Sinusoidal.In,
  sineOut:      E.Sinusoidal.Out,
  sineInOut:    E.Sinusoidal.InOut,
  expoIn:       E.Exponential.In,
  expoOut:      E.Exponential.Out,
  expoInOut:    E.Exponential.InOut,
  circIn:       E.Circular.In,
  circOut:      E.Circular.Out,
  circInOut:    E.Circular.InOut,
  backIn:       E.Back.In,
  backOut:      E.Back.Out,
  backInOut:    E.Back.InOut,
  elasticIn:    E.Elastic.In,
  elasticOut:   E.Elastic.Out,
  elasticInOut: E.Elastic.InOut,
  bounceIn:     E.Bounce.In,
  bounceOut:    E.Bounce.Out,
  bounceInOut:  E.Bounce.InOut,
  // Legacy aliases
  ease:         E.Quadratic.InOut,
  easeIn:       E.Quadratic.In,
  easeOut:      E.Quadratic.Out,
  easeInOut:    E.Quadratic.InOut,
};

export function easeFn(t: number, type: EasingType): number {
  // "step" = no tween: hold the previous keyframe's value until the next
  // keyframe time is reached, then snap. Matches Adobe Animate / Flash
  // behavior when a property has no motion tween enabled.
  if (type === "step") return t >= 1 ? 1 : 0;
  const fn = EASING_MAP[type] ?? E.Quadratic.InOut;
  return fn(Math.max(0, Math.min(1, t)));
}

export function clipVisibleAt(clip: Clip, time: number): boolean {
  return time >= clip.startTime && time < clip.startTime + clip.duration;
}

export function localTime(clip: Clip, time: number): number {
  return Math.max(0, time - clip.startTime);
}

export function progressInClip(clip: Clip, time: number): number {
  if (clip.duration <= 0) return 0;
  return Math.max(0, Math.min(1, localTime(clip, time) / clip.duration));
}

interface AnimationState {
  opacityMul: number;
  translateX: number;
  translateY: number;
  scale: number;
  rotateExtra: number;
}

export function getEntryExitState(clip: Clip, time: number): AnimationState {
  const t = localTime(clip, time);
  const remaining = clip.duration - t;

  let opacityMul = 1;
  let translateX = 0;
  let translateY = 0;
  let scale = 1;
  let rotateExtra = 0;

  if (clip.animationIn !== "none" && t < clip.animationInDuration) {
    const p = easeFn(t / clip.animationInDuration, "easeOut");
    const inv = 1 - p;
    switch (clip.animationIn) {
      case "fade":
        opacityMul *= p;
        break;
      case "slideLeft":
        translateX = inv * 100;
        opacityMul *= p;
        break;
      case "slideRight":
        translateX = -inv * 100;
        opacityMul *= p;
        break;
      case "slideUp":
        translateY = inv * 100;
        opacityMul *= p;
        break;
      case "slideDown":
        translateY = -inv * 100;
        opacityMul *= p;
        break;
      case "zoomIn":
        scale = 0.4 + 0.6 * p;
        opacityMul *= p;
        break;
      case "zoomOut":
        scale = 1.6 - 0.6 * p;
        opacityMul *= p;
        break;
      case "spin":
        rotateExtra = (1 - p) * 180;
        opacityMul *= p;
        break;
      case "bounce":
        scale = 0.6 + Math.sin(p * Math.PI) * 0.5;
        opacityMul *= p;
        break;
    }
  }

  if (clip.animationOut !== "none" && remaining < clip.animationOutDuration) {
    const p = easeFn(1 - remaining / clip.animationOutDuration, "easeIn");
    const inv = 1 - p;
    switch (clip.animationOut) {
      case "fade":
        opacityMul *= inv;
        break;
      case "slideLeft":
        translateX = -p * 100;
        opacityMul *= inv;
        break;
      case "slideRight":
        translateX = p * 100;
        opacityMul *= inv;
        break;
      case "slideUp":
        translateY = -p * 100;
        opacityMul *= inv;
        break;
      case "slideDown":
        translateY = p * 100;
        opacityMul *= inv;
        break;
      case "zoomIn":
        scale = 1 + p * 0.6;
        opacityMul *= inv;
        break;
      case "zoomOut":
        scale = 1 - p * 0.6;
        opacityMul *= inv;
        break;
      case "spin":
        rotateExtra = p * 180;
        opacityMul *= inv;
        break;
      case "bounce":
        scale = 1 - Math.sin(p * Math.PI) * 0.4;
        opacityMul *= inv;
        break;
    }
  }

  return { opacityMul, translateX, translateY, scale, rotateExtra };
}

export function interpolateKeyframes(
  keyframes: Keyframe[],
  clipId: string,
  property: string,
  time: number,
  fallback: number,
): number | null {
  const kfs = keyframes
    .filter((k) => k.clipId === clipId && k.property === property)
    .sort((a, b) => a.time - b.time);
  if (kfs.length === 0) return null;
  if (time <= kfs[0].time) return kfs[0].value;
  if (time >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (time >= a.time && time <= b.time) {
      const t = (time - a.time) / (b.time - a.time);
      const eased = easeFn(t, b.easing || "linear");
      return a.value + (b.value - a.value) * eased;
    }
  }
  return fallback;
}

export interface ResolvedClip {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  rotation: number;
  scale: number;
  translateX: number;
  translateY: number;
  filterCss: string;
  visible: boolean;
  videoTime: number;
}

export function buildFilterCss(filters: ClipFilters): string {
  return [
    `brightness(${filters.brightness}%)`,
    `contrast(${filters.contrast}%)`,
    `saturate(${filters.saturation}%)`,
    `hue-rotate(${filters.hue}deg)`,
    filters.blur > 0 ? `blur(${filters.blur}px)` : "",
    filters.grayscale > 0 ? `grayscale(${filters.grayscale}%)` : "",
    filters.sepia > 0 ? `sepia(${filters.sepia}%)` : "",
    filters.invert > 0 ? `invert(${filters.invert}%)` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function resolveClip(
  clip: Clip,
  keyframes: Keyframe[],
  time: number,
): ResolvedClip {
  const visible = clipVisibleAt(clip, time) && !clip.hidden;

  const x = interpolateKeyframes(keyframes, clip.id, "x", time, clip.x) ?? clip.x;
  const y = interpolateKeyframes(keyframes, clip.id, "y", time, clip.y) ?? clip.y;
  const width = interpolateKeyframes(keyframes, clip.id, "width", time, clip.width) ?? clip.width;
  const height = interpolateKeyframes(keyframes, clip.id, "height", time, clip.height) ?? clip.height;
  const opacityKf = interpolateKeyframes(keyframes, clip.id, "opacity", time, clip.opacity);
  const rotationKf = interpolateKeyframes(keyframes, clip.id, "rotation", time, clip.rotation);
  const scaleKf = interpolateKeyframes(keyframes, clip.id, "scale", time, clip.scale);

  const opacity = opacityKf ?? clip.opacity;
  const rotation = rotationKf ?? clip.rotation;
  const scale = scaleKf ?? clip.scale;

  // Interpolate filter properties (stored as flat keyframe property names)
  const filters = {
    brightness: interpolateKeyframes(keyframes, clip.id, "brightness", time, clip.filters.brightness) ?? clip.filters.brightness,
    contrast: interpolateKeyframes(keyframes, clip.id, "contrast", time, clip.filters.contrast) ?? clip.filters.contrast,
    saturation: interpolateKeyframes(keyframes, clip.id, "saturation", time, clip.filters.saturation) ?? clip.filters.saturation,
    hue: interpolateKeyframes(keyframes, clip.id, "hue", time, clip.filters.hue) ?? clip.filters.hue,
    blur: interpolateKeyframes(keyframes, clip.id, "blur", time, clip.filters.blur) ?? clip.filters.blur,
    grayscale: interpolateKeyframes(keyframes, clip.id, "grayscale", time, clip.filters.grayscale) ?? clip.filters.grayscale,
    sepia: interpolateKeyframes(keyframes, clip.id, "sepia", time, clip.filters.sepia) ?? clip.filters.sepia,
    invert: interpolateKeyframes(keyframes, clip.id, "invert", time, clip.filters.invert) ?? clip.filters.invert,
  };

  const anim = getEntryExitState(clip, time);

  // videoTime maps timeline time -> source media time.
  // trimStart is already in SOURCE seconds (offset into the file).
  // localTime is in TIMELINE seconds; multiply by speed to convert to source seconds.
  const videoTime = clip.trimStart + localTime(clip, time) * (clip.speed || 1);

  return {
    x,
    y,
    width,
    height,
    opacity: Math.max(0, Math.min(1, opacity * anim.opacityMul)),
    rotation: rotation + anim.rotateExtra,
    scale: scale * anim.scale,
    translateX: anim.translateX,
    translateY: anim.translateY,
    filterCss: buildFilterCss(filters),
    visible,
    videoTime,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Transitions
// A "transitionIn" lives on a clip and modulates the first `duration` seconds
// of that clip. If a previous clip on the same track ends within ~50ms before
// this clip starts, that prev clip is also re-rendered during the window with
// the OUTGOING side of the same transition, so the two clips visually blend.
// ─────────────────────────────────────────────────────────────────────────────

export interface TransitionMod {
  opacityMul: number;     // multiplied into clip opacity
  translateXPct: number;  // percent of clip width
  translateYPct: number;  // percent of clip height
  scaleMul: number;       // multiplied into clip scale
  blurExtra: number;      // extra px of CSS blur to apply
  clipInsetRight: number; // wipe — fraction (0..1) inset from the right
  clipInsetLeft: number;  // wipe — fraction (0..1) inset from the left
}

export const NO_TRANSITION: TransitionMod = {
  opacityMul: 1,
  translateXPct: 0,
  translateYPct: 0,
  scaleMul: 1,
  blurExtra: 0,
  clipInsetRight: 0,
  clipInsetLeft: 0,
};

export function getTransitionForClip(clip: Clip): ClipTransition {
  return clip.transitionIn ?? { type: "none", duration: 0.5 };
}

/**
 * Find the prev clip on the same track that ends just before `clip` starts.
 * Returns null if no such clip exists (or distance > 50ms).
 */
export function findPrevClipOnTrack(allClips: Clip[], clip: Clip): Clip | null {
  let best: Clip | null = null;
  let bestEnd = -Infinity;
  for (const c of allClips) {
    if (c.id === clip.id) continue;
    if (c.trackIndex !== clip.trackIndex) continue;
    const end = c.startTime + c.duration;
    if (end <= clip.startTime + 0.05 && end > bestEnd) {
      bestEnd = end;
      best = c;
    }
  }
  if (!best) return null;
  // Only consider it adjacent if the gap is small (<= 0.1s).
  if (clip.startTime - bestEnd > 0.1) return null;
  return best;
}

/**
 * Compute the transition modulation for the incoming or outgoing side of a
 * transition. Progress p is in [0, 1] across the transition window.
 *   side = "in"  → modulates the upcoming (current) clip
 *   side = "out" → modulates the previous (outgoing) clip
 */
export function getTransitionMod(
  type: TransitionType,
  p: number,
  side: "in" | "out",
): TransitionMod {
  const m: TransitionMod = { ...NO_TRANSITION };
  if (type === "none") return m;
  const ip = Math.max(0, Math.min(1, p));
  const inv = 1 - ip;
  switch (type) {
    case "fade":
      m.opacityMul = side === "in" ? ip : inv;
      break;
    case "slideLeft":
      // incoming enters from the right, outgoing exits to the left
      m.translateXPct = side === "in" ? inv * 100 : -ip * 100;
      break;
    case "slideRight":
      m.translateXPct = side === "in" ? -inv * 100 : ip * 100;
      break;
    case "slideUp":
      m.translateYPct = side === "in" ? inv * 100 : -ip * 100;
      break;
    case "slideDown":
      m.translateYPct = side === "in" ? -inv * 100 : ip * 100;
      break;
    case "zoom":
      // incoming starts small and grows; outgoing grows past 1 and fades
      if (side === "in") { m.scaleMul = 0.7 + 0.3 * ip; m.opacityMul = ip; }
      else { m.scaleMul = 1 + 0.3 * ip; m.opacityMul = inv; }
      break;
    case "blur":
      if (side === "in") { m.blurExtra = inv * 16; m.opacityMul = ip; }
      else { m.blurExtra = ip * 16; m.opacityMul = inv; }
      break;
    case "wipeLeft":
      // incoming reveals from the right, outgoing is masked off from the left
      if (side === "in") m.clipInsetRight = inv;
      else m.clipInsetLeft = ip;
      break;
  }
  return m;
}

/**
 * Returns the transition state for `clip` at `time`, or null if not in a
 * transition window.
 *   `incoming` = mod to apply to clip itself (it's coming IN).
 *   `outgoing` = mod to apply to the prev clip on the same track (going OUT).
 *   `prevClip` = the prev clip to also render during the window, or null.
 */
export function getActiveTransition(
  clip: Clip,
  allClips: Clip[],
  time: number,
): { incoming: TransitionMod; outgoing: TransitionMod; prevClip: Clip | null; progress: number } | null {
  const tr = getTransitionForClip(clip);
  if (tr.type === "none" || tr.duration <= 0) return null;
  const local = time - clip.startTime;
  if (local < 0 || local > tr.duration) return null;
  const p = local / tr.duration;
  const eased = easeFn(p, "easeInOut");
  const prev = findPrevClipOnTrack(allClips, clip);
  return {
    incoming: getTransitionMod(tr.type, eased, "in"),
    outgoing: getTransitionMod(tr.type, eased, "out"),
    prevClip: prev,
    progress: eased,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Effects
// Effects are stacked per-clip and contribute to: extra CSS filter, extra
// transform shake, and extra overlay layers (vignette / scanlines / tint).
// The renderer uses these helpers to keep behavior identical between the
// preview canvas and the export pipeline.
// ─────────────────────────────────────────────────────────────────────────────

export interface EffectImpact {
  shakeXPct: number; // additional translateX as % of clip width
  shakeYPct: number; // additional translateY as % of clip height
  extraFilter: string; // appended to the clip's filter CSS
  overlays: EffectOverlay[]; // drawn on top of the clip content
}

export interface EffectOverlay {
  kind: "vignette" | "scanlines" | "tint";
  intensity: number;
  color?: string;
}

export const NO_EFFECT_IMPACT: EffectImpact = {
  shakeXPct: 0,
  shakeYPct: 0,
  extraFilter: "",
  overlays: [],
};

export function effectsOf(clip: Clip): Effect[] {
  return clip.effects ?? [];
}

/**
 * Compute combined effect impact for a clip at the given time. Time-driven
 * effects (shake) use absolute time so the wobble is deterministic across
 * preview & export.
 */
export function getEffectImpact(clip: Clip, time: number): EffectImpact {
  const list = effectsOf(clip);
  if (list.length === 0) return NO_EFFECT_IMPACT;

  let shakeXPct = 0;
  let shakeYPct = 0;
  const filters: string[] = [];
  const overlays: EffectOverlay[] = [];

  for (const fx of list) {
    const i = Math.max(0, Math.min(1, fx.intensity));
    if (i <= 0) continue;
    switch (fx.type) {
      case "shake": {
        // Smooth pseudo-random wobble with two frequencies so it doesn't loop.
        const t = time;
        shakeXPct += Math.sin(t * 31.7) * Math.cos(t * 17.3) * 6 * i;
        shakeYPct += Math.cos(t * 27.1) * Math.sin(t * 13.9) * 6 * i;
        break;
      }
      case "glow": {
        // Drop-shadow gives a glow halo. Scaled to intensity.
        const color = fx.color || "#ffffff";
        const blur = Math.round(8 + 32 * i);
        // 2 stacked drop-shadows for a richer glow
        filters.push(`drop-shadow(0 0 ${blur}px ${hexWithAlpha(color, 0.9)})`);
        filters.push(`drop-shadow(0 0 ${Math.round(blur * 1.6)}px ${hexWithAlpha(color, 0.5)})`);
        break;
      }
      case "blurMore": {
        filters.push(`blur(${Math.round(2 + 18 * i)}px)`);
        break;
      }
      case "vignette":
        overlays.push({ kind: "vignette", intensity: i });
        break;
      case "scanlines":
        overlays.push({ kind: "scanlines", intensity: i });
        break;
      case "tint":
        overlays.push({ kind: "tint", intensity: i, color: fx.color || "#ff00aa" });
        break;
    }
  }
  return { shakeXPct, shakeYPct, extraFilter: filters.join(" "), overlays };
}

/** Combine the base filter CSS with any effect-driven additions. */
export function combineFilterCss(baseCss: string, extra: string, blurExtra: number): string {
  const parts: string[] = [];
  if (baseCss && baseCss !== "none") parts.push(baseCss);
  if (extra) parts.push(extra);
  if (blurExtra > 0) parts.push(`blur(${blurExtra.toFixed(1)}px)`);
  return parts.join(" ") || "none";
}

function hexWithAlpha(hex: string, alpha: number): string {
  // Allow already-rgba/hsl strings to pass through unchanged.
  if (!hex.startsWith("#")) return hex;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export { hexWithAlpha };
