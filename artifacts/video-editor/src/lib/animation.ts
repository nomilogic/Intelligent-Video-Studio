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
  rotateExtraDeg: number; // extra rotation in degrees (spin/swing)
  blurExtra: number;      // extra px of CSS blur to apply
  /** Wipe inset fractions (0..1) in each direction. Apply via CSS clip-path
   *  `inset(top% right% bottom% left%)` in preview and a 2D clip rect in
   *  export. They compose so e.g. iris = all four sides inset together. */
  clipInsetTop: number;
  clipInsetRight: number;
  clipInsetBottom: number;
  clipInsetLeft: number;
  /** Optional full-screen color flash painted ON TOP of the clip during the
   *  transition. Used by fadeBlack/fadeWhite/fadeColor/flash/lightLeak/
   *  filmBurn/glitchCut/tvOff/tvOn. Empty color = no overlay. */
  overlayColor: string;
  overlayAlpha: number;   // 0..1
}

export const NO_TRANSITION: TransitionMod = {
  opacityMul: 1,
  translateXPct: 0,
  translateYPct: 0,
  scaleMul: 1,
  rotateExtraDeg: 0,
  blurExtra: 0,
  clipInsetTop: 0,
  clipInsetRight: 0,
  clipInsetBottom: 0,
  clipInsetLeft: 0,
  overlayColor: "",
  overlayAlpha: 0,
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
  // Helpers -----------------------------------------------------------------
  // Slide: incoming enters from `dx`/`dy` direction in % of clip box; outgoing
  // exits in the opposite direction. dx/dy = +1/-1.
  const slide = (dx: number, dy: number) => {
    if (side === "in") {
      m.translateXPct = dx * inv * 100;
      m.translateYPct = dy * inv * 100;
    } else {
      m.translateXPct = -dx * ip * 100;
      m.translateYPct = -dy * ip * 100;
    }
  };
  // Push: same as slide, but also fade so it visually slides into view.
  const push = (dx: number, dy: number) => {
    slide(dx, dy);
    m.opacityMul = side === "in" ? ip * 0.6 + 0.4 : inv * 0.6 + 0.4;
  };
  // Reveal-style wipe — incoming reveals from one side. side="out" hides from
  // the OPPOSITE side so the two stack into a clean swap.
  const wipe = (from: "left" | "right" | "up" | "down") => {
    if (side === "in") {
      if (from === "left")  m.clipInsetLeft   = inv;
      if (from === "right") m.clipInsetRight  = inv;
      if (from === "up")    m.clipInsetTop    = inv;
      if (from === "down")  m.clipInsetBottom = inv;
    } else {
      if (from === "left")  m.clipInsetRight  = ip;
      if (from === "right") m.clipInsetLeft   = ip;
      if (from === "up")    m.clipInsetBottom = ip;
      if (from === "down")  m.clipInsetTop    = ip;
    }
  };
  // Iris (rect-approximated circle): all four sides shrink/grow together.
  // direction "in" = open from center outward; "out" = collapse to center.
  const iris = (direction: "in" | "out") => {
    const k = direction === "in"
      ? (side === "in" ? inv * 0.5 : ip * 0.5)
      : (side === "in" ? ip   * 0.5 : inv * 0.5);
    m.clipInsetTop = m.clipInsetBottom = m.clipInsetLeft = m.clipInsetRight = k;
    m.opacityMul = side === "in" ? ip * 0.5 + 0.5 : inv * 0.5 + 0.5;
  };
  // Color overlay flash. amp 0..1 is the peak alpha at p=0.5 for flash-style,
  // monotonic for fade-to-color style.
  const colorFlash = (color: string, amp: number, monotonic: boolean) => {
    m.overlayColor = color;
    if (monotonic) {
      m.overlayAlpha = side === "in" ? inv * amp : ip * amp;
    } else {
      // Bell curve peaking at p=0.5
      m.overlayAlpha = amp * Math.sin(Math.PI * ip);
    }
  };

  switch (type) {
    // ── Original 9 ───────────────────────────────────────────────────────
    case "fade":         m.opacityMul = side === "in" ? ip : inv; break;
    case "slideLeft":    slide( 1, 0); break;
    case "slideRight":   slide(-1, 0); break;
    case "slideUp":      slide( 0, 1); break;
    case "slideDown":    slide( 0,-1); break;
    case "zoom":
      if (side === "in") { m.scaleMul = 0.7 + 0.3 * ip; m.opacityMul = ip; }
      else { m.scaleMul = 1 + 0.3 * ip; m.opacityMul = inv; }
      break;
    case "blur":
      if (side === "in") { m.blurExtra = inv * 16; m.opacityMul = ip; }
      else { m.blurExtra = ip * 16; m.opacityMul = inv; }
      break;
    case "wipeLeft":     wipe("left"); break;

    // ── Diagonal slides ─────────────────────────────────────────────────
    case "slideUpLeft":    slide( 1, 1); break;
    case "slideUpRight":   slide(-1, 1); break;
    case "slideDownLeft":  slide( 1,-1); break;
    case "slideDownRight": slide(-1,-1); break;

    // ── Wipes (4 cardinal + 2 diagonal) ─────────────────────────────────
    case "wipeRight":         wipe("right"); break;
    case "wipeUp":            wipe("up");    break;
    case "wipeDown":          wipe("down");  break;
    case "wipeDiagonalDown":
      // Approximate diagonal as combined left+top reveal.
      if (side === "in") { m.clipInsetLeft = inv; m.clipInsetTop = inv; }
      else { m.clipInsetRight = ip; m.clipInsetBottom = ip; }
      break;
    case "wipeDiagonalUp":
      if (side === "in") { m.clipInsetRight = inv; m.clipInsetTop = inv; }
      else { m.clipInsetLeft = ip; m.clipInsetBottom = ip; }
      break;

    // ── Iris / circle ────────────────────────────────────────────────────
    case "irisIn":     iris("in");  break;
    case "irisOut":    iris("out"); break;
    case "circleIn":   iris("in");  m.scaleMul = side === "in" ? 0.9 + 0.1 * ip : 1; break;
    case "circleOut":  iris("out"); m.scaleMul = side === "in" ? 1 : 0.9 + 0.1 * inv; break;

    // ── Push (slide + fade) ─────────────────────────────────────────────
    case "pushLeft":   push( 1, 0); break;
    case "pushRight":  push(-1, 0); break;
    case "pushUp":     push( 0, 1); break;
    case "pushDown":   push( 0,-1); break;

    // ── Zoom variants ────────────────────────────────────────────────────
    case "zoomIn":
      if (side === "in") { m.scaleMul = 0.4 + 0.6 * ip; m.opacityMul = ip; }
      else { m.scaleMul = 1 + 0.4 * ip; m.opacityMul = inv; }
      break;
    case "zoomOut":
      if (side === "in") { m.scaleMul = 1.6 - 0.6 * ip; m.opacityMul = ip; }
      else { m.scaleMul = 1 - 0.4 * ip; m.opacityMul = inv; }
      break;
    case "zoomBlur":
      if (side === "in") { m.scaleMul = 0.7 + 0.3 * ip; m.blurExtra = inv * 24; m.opacityMul = ip; }
      else { m.scaleMul = 1 + 0.3 * ip; m.blurExtra = ip * 24; m.opacityMul = inv; }
      break;

    // ── Spin variants ────────────────────────────────────────────────────
    case "spin":
      m.rotateExtraDeg = side === "in" ? -180 * inv : 180 * ip;
      m.opacityMul = side === "in" ? ip : inv;
      break;
    case "spinReverse":
      m.rotateExtraDeg = side === "in" ? 180 * inv : -180 * ip;
      m.opacityMul = side === "in" ? ip : inv;
      break;
    case "spinZoom":
      m.rotateExtraDeg = side === "in" ? -360 * inv : 360 * ip;
      m.scaleMul = side === "in" ? 0.4 + 0.6 * ip : 1 + 0.4 * ip;
      m.opacityMul = side === "in" ? ip : inv;
      break;

    // ── Blur variants ────────────────────────────────────────────────────
    case "blurHeavy":
      if (side === "in") { m.blurExtra = inv * 32; m.opacityMul = ip; }
      else { m.blurExtra = ip * 32; m.opacityMul = inv; }
      break;
    case "blurSlide":
      slide(1, 0);
      m.blurExtra = side === "in" ? inv * 16 : ip * 16;
      break;

    // ── Fade-to-color family ────────────────────────────────────────────
    case "fadeBlack":
      m.opacityMul = side === "in" ? ip : inv;
      colorFlash("#000000", 1.0, false);
      break;
    case "fadeWhite":
      m.opacityMul = side === "in" ? ip : inv;
      colorFlash("#ffffff", 1.0, false);
      break;
    case "fadeColor":
      m.opacityMul = side === "in" ? ip : inv;
      colorFlash("#7c3aed", 1.0, false);
      break;
    case "flash":
      m.opacityMul = side === "in" ? ip : inv;
      colorFlash("#ffffff", 0.95, false);
      break;
    case "flashColor":
      m.opacityMul = side === "in" ? ip : inv;
      colorFlash("#22d3ee", 0.85, false);
      break;

    // ── Cuts with overlays/shake ────────────────────────────────────────
    case "shakeCut": {
      const t = ip * Math.PI * 6;
      m.translateXPct = Math.sin(t) * 8 * (side === "in" ? inv : ip);
      m.translateYPct = Math.cos(t * 1.3) * 6 * (side === "in" ? inv : ip);
      m.opacityMul = side === "in" ? ip : inv;
      break;
    }
    case "tvOff":
      // Squeeze vertically to a thin line, then fade to black.
      if (side === "in") {
        m.clipInsetTop = m.clipInsetBottom = inv * 0.45;
        m.opacityMul = ip;
      } else {
        m.clipInsetTop = m.clipInsetBottom = ip * 0.45;
        m.opacityMul = inv;
        colorFlash("#000000", 0.6, false);
      }
      break;
    case "tvOn":
      if (side === "in") {
        m.clipInsetLeft = m.clipInsetRight = inv * 0.45;
        m.opacityMul = ip;
        colorFlash("#ffffff", 0.4, false);
      } else {
        m.opacityMul = inv;
      }
      break;
    case "glitchCut": {
      const t = ip * Math.PI * 8;
      m.translateXPct = Math.sin(t) * 14 * (side === "in" ? inv : ip);
      m.opacityMul = side === "in" ? ip : inv;
      colorFlash("#ec4899", 0.35, false);
      break;
    }

    // ── Barn doors / split ───────────────────────────────────────────────
    case "barnDoorH":
      // Doors meeting horizontally — incoming opens from center.
      if (side === "in") { m.clipInsetLeft = inv * 0.5; m.clipInsetRight = inv * 0.5; }
      else { m.clipInsetLeft = ip * 0.5; m.clipInsetRight = ip * 0.5; }
      break;
    case "barnDoorV":
      if (side === "in") { m.clipInsetTop = inv * 0.5; m.clipInsetBottom = inv * 0.5; }
      else { m.clipInsetTop = ip * 0.5; m.clipInsetBottom = ip * 0.5; }
      break;
    case "splitH":
      // Two halves slide apart horizontally.
      m.translateXPct = side === "in" ? 0 : ip * 100 * (Math.random() < 0.5 ? 1 : -1) * 0; // visual approx via wipe
      if (side === "in") { m.clipInsetLeft = inv * 0.5; m.clipInsetRight = inv * 0.5; }
      else { m.clipInsetLeft = ip * 0.5; m.clipInsetRight = ip * 0.5; }
      break;
    case "splitV":
      if (side === "in") { m.clipInsetTop = inv * 0.5; m.clipInsetBottom = inv * 0.5; }
      else { m.clipInsetTop = ip * 0.5; m.clipInsetBottom = ip * 0.5; }
      break;

    // ── Pattern dissolves (approx via opacity + blur) ───────────────────
    case "checkerboard":
    case "pixelDissolve":
      m.opacityMul = side === "in" ? ip : inv;
      m.blurExtra = (side === "in" ? inv : ip) * 4;
      break;

    // ── Distort wiggles ──────────────────────────────────────────────────
    case "ripple": {
      const t = ip * Math.PI * 4;
      m.scaleMul = 1 + Math.sin(t) * 0.05 * (side === "in" ? inv : ip);
      m.opacityMul = side === "in" ? ip : inv;
      break;
    }
    case "swirl":
      m.rotateExtraDeg = side === "in" ? -90 * inv : 90 * ip;
      m.scaleMul = side === "in" ? 0.85 + 0.15 * ip : 1 + 0.15 * ip;
      m.opacityMul = side === "in" ? ip : inv;
      break;
    case "morph":
      m.scaleMul = side === "in" ? 0.9 + 0.1 * ip : 1 + 0.1 * ip;
      m.opacityMul = side === "in" ? ip : inv;
      m.blurExtra = (side === "in" ? inv : ip) * 8;
      break;

    // ── Light/film overlays ──────────────────────────────────────────────
    case "filmBurn":
      m.opacityMul = side === "in" ? ip : inv;
      colorFlash("#fb923c", 0.9, false);
      break;
    case "lightLeak":
      m.opacityMul = side === "in" ? ip * 0.7 + 0.3 : inv * 0.7 + 0.3;
      colorFlash("#fbbf24", 0.7, false);
      break;

    // ── Dynamics ─────────────────────────────────────────────────────────
    case "dropDown":
      m.translateYPct = side === "in" ? -100 * inv : 100 * ip;
      m.opacityMul = side === "in" ? ip : inv;
      break;
    case "popUp":
      m.translateYPct = side === "in" ? 100 * inv : -100 * ip;
      m.opacityMul = side === "in" ? ip : inv;
      break;
    case "swing":
      m.rotateExtraDeg = side === "in" ? -25 * inv : 25 * ip;
      m.translateYPct = side === "in" ? -20 * inv : 20 * ip;
      m.opacityMul = side === "in" ? ip : inv;
      break;
    case "elastic": {
      // Overshoot + settle on the in side
      const overshoot = side === "in"
        ? 1 + (1 - Math.cos(ip * Math.PI * 2)) * 0.2 * inv
        : 1 + (1 - Math.cos(ip * Math.PI * 2)) * 0.1 * ip;
      m.scaleMul = overshoot;
      m.opacityMul = side === "in" ? ip : inv;
      break;
    }
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
  /** Optional extra rotation in degrees (mirrorH/mirrorV use 0/180 around an
   *  axis via flip; not currently used but keeps the API future-proof). */
  rotateExtraDeg?: number;
}

/**
 * Effect overlay kinds. Each `kind` MUST have a render branch in
 * `Canvas.tsx` (CSS-based for live preview) and `use-export.ts`
 * (Canvas2D paint for export). Unknown kinds are silently no-ops.
 */
export type EffectOverlayKind =
  | "vignette" | "vignetteSoft" | "vignetteHard" | "vignetteOval" | "vignetteCorner"
  | "scanlines" | "scanlinesThick" | "scanlinesVertical" | "scanlinesCRT"
  | "tint"
  | "noise" | "filmGrain" | "filmGrainHeavy"
  | "halftone";

export interface EffectOverlay {
  kind: EffectOverlayKind;
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
 * Time-based shake helper. Two independent frequencies + cross-modulation
 * so the wobble looks organic and never loops perfectly.
 */
function shakeAt(time: number, axisX: boolean, axisY: boolean, amp: number) {
  const x = axisX ? Math.sin(time * 31.7) * Math.cos(time * 17.3) * amp : 0;
  const y = axisY ? Math.cos(time * 27.1) * Math.sin(time * 13.9) * amp : 0;
  return { x, y };
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

  // Helper to push a glow-style drop-shadow stack.
  const glow = (color: string, i: number, blurBase: number, layers: number) => {
    const blur = Math.round(blurBase + 28 * i);
    for (let n = 1; n <= layers; n++) {
      const a = 0.9 / n;
      const b = blur * (0.6 + 0.5 * n);
      filters.push(`drop-shadow(0 0 ${Math.round(b)}px ${hexWithAlpha(color, a)})`);
    }
  };

  for (const fx of list) {
    const i = Math.max(0, Math.min(1, fx.intensity));
    if (i <= 0) continue;

    switch (fx.type) {
      // ── Vignette family ───────────────────────────────────────────────
      case "vignette":       overlays.push({ kind: "vignette", intensity: i }); break;
      case "vignetteSoft":   overlays.push({ kind: "vignetteSoft", intensity: i }); break;
      case "vignetteHard":   overlays.push({ kind: "vignetteHard", intensity: i }); break;
      case "vignetteOval":   overlays.push({ kind: "vignetteOval", intensity: i }); break;
      case "vignetteCorner": overlays.push({ kind: "vignetteCorner", intensity: i }); break;

      // ── Glow family ───────────────────────────────────────────────────
      case "glow":      glow(fx.color || "#ffffff", i, 8, 2); break;
      case "glowWarm":  glow(fx.color || "#fbbf24", i, 8, 2); break;
      case "glowCool":  glow(fx.color || "#60a5fa", i, 8, 2); break;
      case "glowPulse": {
        const pulse = 0.5 + 0.5 * Math.sin(time * 4);
        glow(fx.color || "#ec4899", i * pulse, 8, 3);
        break;
      }

      // ── Shake family ──────────────────────────────────────────────────
      case "shake":           { const s = shakeAt(time, true, true, 6 * i); shakeXPct += s.x; shakeYPct += s.y; break; }
      case "shakeHeavy":      { const s = shakeAt(time, true, true, 14 * i); shakeXPct += s.x; shakeYPct += s.y; break; }
      case "shakeSubtle":     { const s = shakeAt(time, true, true, 2.5 * i); shakeXPct += s.x; shakeYPct += s.y; break; }
      case "shakeVertical":   { const s = shakeAt(time, false, true, 10 * i); shakeXPct += s.x; shakeYPct += s.y; break; }
      case "shakeHorizontal": { const s = shakeAt(time, true, false, 10 * i); shakeXPct += s.x; shakeYPct += s.y; break; }

      // ── Scanlines family ──────────────────────────────────────────────
      case "scanlines":         overlays.push({ kind: "scanlines", intensity: i }); break;
      case "scanlinesThick":    overlays.push({ kind: "scanlinesThick", intensity: i }); break;
      case "scanlinesVertical": overlays.push({ kind: "scanlinesVertical", intensity: i }); break;
      case "scanlinesCRT":      overlays.push({ kind: "scanlinesCRT", intensity: i }); break;

      // ── Tint family ───────────────────────────────────────────────────
      case "tint":        overlays.push({ kind: "tint", intensity: i, color: fx.color || "#ff00aa" }); break;
      case "tintWarm":    overlays.push({ kind: "tint", intensity: i, color: fx.color || "#fbbf24" }); break;
      case "tintCool":    overlays.push({ kind: "tint", intensity: i, color: fx.color || "#60a5fa" }); break;
      case "tintSepia":   overlays.push({ kind: "tint", intensity: i, color: fx.color || "#a16207" }); break;
      case "tintDuotone": overlays.push({ kind: "tint", intensity: i, color: fx.color || "#7c3aed" }); break;

      // ── Color filters (pure CSS) ──────────────────────────────────────
      case "invert":        filters.push(`invert(${i.toFixed(3)})`); break;
      case "grayscale":     filters.push(`grayscale(${i.toFixed(3)})`); break;
      case "grayscaleSoft": filters.push(`grayscale(${(i * 0.5).toFixed(3)})`); break;
      case "sepia":         filters.push(`sepia(${i.toFixed(3)})`); break;
      case "saturate":      filters.push(`saturate(${(1 + i * 1.5).toFixed(3)})`); break;
      case "desaturate":    filters.push(`saturate(${(1 - i).toFixed(3)})`); break;
      case "brightness":    filters.push(`brightness(${(1 + i * 0.6).toFixed(3)})`); break;
      case "darkness":      filters.push(`brightness(${(1 - i * 0.6).toFixed(3)})`); break;
      case "contrast":      filters.push(`contrast(${(1 + i).toFixed(3)})`); break;
      case "lowContrast":   filters.push(`contrast(${(1 - i * 0.6).toFixed(3)})`); break;
      case "hueRotate":     filters.push(`hue-rotate(${Math.round(i * 360)}deg)`); break;
      case "hueShift90":    filters.push(`hue-rotate(${Math.round(i * 90)}deg)`); break;
      case "hueShift180":   filters.push(`hue-rotate(${Math.round(i * 180)}deg)`); break;

      // ── Blur family ───────────────────────────────────────────────────
      case "blurMore":   filters.push(`blur(${Math.round(2 + 18 * i)}px)`); break;
      case "blurSoft":   filters.push(`blur(${Math.round(1 + 6 * i)}px)`); break;
      case "blurHeavy":  filters.push(`blur(${Math.round(8 + 32 * i)}px)`); break;
      case "blurMotion": {
        // Approximate motion blur via stacked horizontal-only drop-shadows.
        const c = "rgba(255,255,255,0.0)";
        for (let n = 1; n <= 4; n++) filters.push(`drop-shadow(${(n * i * 4).toFixed(1)}px 0 ${(n * i * 2).toFixed(1)}px ${c})`);
        filters.push(`blur(${Math.round(1 + 4 * i)}px)`);
        break;
      }

      // ── Distort ───────────────────────────────────────────────────────
      case "chromaticAberration": {
        const off = 1 + i * 6;
        filters.push(`drop-shadow(${off.toFixed(1)}px 0 0 rgba(255,0,0,0.6))`);
        filters.push(`drop-shadow(-${off.toFixed(1)}px 0 0 rgba(0,255,255,0.6))`);
        break;
      }
      case "pixelate":      filters.push(`contrast(${(1 + i * 0.4).toFixed(3)})`); break; // CSS-only approximation
      case "pixelateHeavy": filters.push(`contrast(${(1 + i * 0.7).toFixed(3)}) saturate(${(1 + i * 0.6).toFixed(3)})`); break;
      case "glitch": {
        const t = time * 6;
        const j = (Math.sin(t) > 0.7 ? 1 : 0) * i;
        shakeXPct += j * 4;
        const off = 1 + i * 4;
        filters.push(`drop-shadow(${off.toFixed(1)}px 0 0 rgba(255,0,255,0.6))`);
        filters.push(`drop-shadow(-${off.toFixed(1)}px 0 0 rgba(0,255,255,0.6))`);
        break;
      }
      case "glitchHeavy": {
        const t = time * 9;
        const j = (Math.sin(t) > 0.5 ? 1 : 0) * i;
        shakeXPct += j * 12;
        const off = 2 + i * 8;
        filters.push(`drop-shadow(${off.toFixed(1)}px 0 0 rgba(255,0,255,0.8))`);
        filters.push(`drop-shadow(-${off.toFixed(1)}px 0 0 rgba(0,255,255,0.8))`);
        break;
      }

      // ── Texture overlays ──────────────────────────────────────────────
      case "noise":           overlays.push({ kind: "noise", intensity: i }); break;
      case "filmGrain":       overlays.push({ kind: "filmGrain", intensity: i }); break;
      case "filmGrainHeavy":  overlays.push({ kind: "filmGrainHeavy", intensity: i }); break;

      // ── Stylized ──────────────────────────────────────────────────────
      case "halftone":        overlays.push({ kind: "halftone", intensity: i }); break;
      case "posterize":       filters.push(`contrast(${(1 + i * 0.6).toFixed(3)}) saturate(${(1 + i * 0.4).toFixed(3)})`); break;
      case "posterizeHeavy":  filters.push(`contrast(${(1 + i * 1.2).toFixed(3)}) saturate(${(1 + i * 0.7).toFixed(3)})`); break;
      case "vintage":         filters.push(`sepia(${(0.3 * i).toFixed(3)}) contrast(${(1 + 0.15 * i).toFixed(3)}) brightness(${(1 - 0.05 * i).toFixed(3)})`); overlays.push({ kind: "tint", intensity: i * 0.4, color: "#fcd34d" }); break;
      case "lomo":            filters.push(`saturate(${(1 + 0.6 * i).toFixed(3)}) contrast(${(1 + 0.3 * i).toFixed(3)})`); overlays.push({ kind: "vignette", intensity: i }); break;
      case "polaroid":        filters.push(`brightness(${(1 + 0.05 * i).toFixed(3)}) contrast(${(1 - 0.1 * i).toFixed(3)}) saturate(${(1 - 0.2 * i).toFixed(3)})`); overlays.push({ kind: "tint", intensity: i * 0.3, color: "#fef3c7" }); break;
      case "neon":            glow(fx.color || "#ec4899", i, 4, 3); filters.push(`saturate(${(1 + 0.6 * i).toFixed(3)})`); break;
      case "cyberpunk":       filters.push(`saturate(${(1 + 0.8 * i).toFixed(3)}) contrast(${(1 + 0.3 * i).toFixed(3)}) hue-rotate(${Math.round(20 * i)}deg)`); glow("#22d3ee", i * 0.6, 4, 2); break;
      case "matrixGreen":     filters.push(`saturate(${(0.4).toFixed(3)}) hue-rotate(${Math.round(90 + 20 * i)}deg)`); overlays.push({ kind: "tint", intensity: i * 0.5, color: "#16a34a" }); break;
      case "horror":          filters.push(`saturate(${(1 - 0.5 * i).toFixed(3)}) contrast(${(1 + 0.4 * i).toFixed(3)})`); overlays.push({ kind: "tint", intensity: i * 0.4, color: "#450a0a" }); overlays.push({ kind: "vignette", intensity: i }); break;
      case "dreamy":          filters.push(`blur(${(0.5 + 1.5 * i).toFixed(1)}px) brightness(${(1 + 0.1 * i).toFixed(3)}) saturate(${(1 + 0.2 * i).toFixed(3)})`); overlays.push({ kind: "tint", intensity: i * 0.3, color: "#fbcfe8" }); break;
      case "underwater":      filters.push(`hue-rotate(${Math.round(180 * i)}deg) saturate(${(1 + 0.3 * i).toFixed(3)})`); overlays.push({ kind: "tint", intensity: i * 0.3, color: "#1e40af" }); break;

      // ── Stylized geometric (no-op for now: kaleidoscope/mirror/edgeDetect/emboss) ──
      // These need GPU shaders to do "right". We render best-effort
      // approximations so they degrade gracefully.
      case "kaleidoscope":    filters.push(`saturate(${(1 + 0.4 * i).toFixed(3)}) hue-rotate(${Math.round(time * 30 % 360)}deg)`); break;
      case "mirrorH":
      case "mirrorV":         /* True mirror needs a separate pass — leave as no-op so the picker still lists it. */ break;
      case "edgeDetect":      filters.push(`grayscale(1) contrast(${(1.5 + 1.5 * i).toFixed(3)}) brightness(${(1 + 0.4 * i).toFixed(3)})`); break;
      case "emboss":          filters.push(`grayscale(1) contrast(${(1.4).toFixed(3)})`); break;
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
