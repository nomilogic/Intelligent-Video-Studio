import type { Clip, ClipFilters, EasingType, Keyframe } from "./types";

export function easeFn(t: number, type: EasingType): number {
  switch (type) {
    case "linear":
      return t;
    case "easeIn":
      return t * t;
    case "easeOut":
      return 1 - (1 - t) * (1 - t);
    case "easeInOut":
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case "ease":
    default:
      return t * t * (3 - 2 * t);
  }
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

  const anim = getEntryExitState(clip, time);

  const videoTime =
    (localTime(clip, time) + clip.trimStart) * (clip.speed || 1);

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
    filterCss: buildFilterCss(clip.filters),
    visible,
    videoTime,
  };
}
