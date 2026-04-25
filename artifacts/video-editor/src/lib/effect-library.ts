/**
 * Catalog of all 50 effects available to clips. Each entry has:
 *
 *   - `type` — the EffectType discriminant stored on `clip.effects[i].type`.
 *   - `label` — name shown in the picker.
 *   - `category` — visual grouping in the UI.
 *   - `defaultColor` — initial color when added to a clip (only used by
 *     effects that read `effect.color` at render time, such as tint/glow).
 *
 * Renderers live in `lib/animation.ts` (`getEffectImpact`, `combineFilterCss`)
 * and are mirrored in `hooks/use-export.ts`. Adding a new entry here is a
 * UI-only change unless its `type` also gets a render branch in those
 * files — when that's the case the effect will simply have no visible
 * impact at preview/export time.
 */

import type { EffectType } from "./types";

export type EffectCategory =
  | "Vignette"
  | "Glow"
  | "Shake"
  | "Scanlines"
  | "Color"
  | "Blur"
  | "Distort"
  | "Texture"
  | "Stylized";

export interface EffectDef {
  type: EffectType;
  label: string;
  category: EffectCategory;
  defaultColor?: string;
  /** Short user-facing tooltip. */
  hint?: string;
}

export const EFFECT_LIBRARY: EffectDef[] = [
  // ── Vignette (5) ──────────────────────────────────────────────────────
  { type: "vignette",       label: "Vignette",        category: "Vignette" },
  { type: "vignetteSoft",   label: "Vignette Soft",   category: "Vignette" },
  { type: "vignetteHard",   label: "Vignette Hard",   category: "Vignette" },
  { type: "vignetteOval",   label: "Vignette Oval",   category: "Vignette" },
  { type: "vignetteCorner", label: "Corner Vignette", category: "Vignette" },
  // ── Glow (4) ──────────────────────────────────────────────────────────
  { type: "glow",      label: "Glow",       category: "Glow", defaultColor: "#ffffff" },
  { type: "glowWarm",  label: "Warm Glow",  category: "Glow", defaultColor: "#fbbf24" },
  { type: "glowCool",  label: "Cool Glow",  category: "Glow", defaultColor: "#60a5fa" },
  { type: "glowPulse", label: "Pulse Glow", category: "Glow", defaultColor: "#ec4899" },
  // ── Shake (5) ─────────────────────────────────────────────────────────
  { type: "shake",            label: "Shake",         category: "Shake" },
  { type: "shakeHeavy",       label: "Heavy Shake",   category: "Shake" },
  { type: "shakeSubtle",      label: "Subtle Shake",  category: "Shake" },
  { type: "shakeVertical",    label: "Vertical Shake",category: "Shake" },
  { type: "shakeHorizontal",  label: "Horiz Shake",   category: "Shake" },
  // ── Scanlines (4) ─────────────────────────────────────────────────────
  { type: "scanlines",         label: "Scanlines",     category: "Scanlines" },
  { type: "scanlinesThick",    label: "Thick Lines",   category: "Scanlines" },
  { type: "scanlinesVertical", label: "Vert Lines",    category: "Scanlines" },
  { type: "scanlinesCRT",      label: "CRT",           category: "Scanlines" },
  // ── Color (15) ────────────────────────────────────────────────────────
  { type: "tint",         label: "Tint",         category: "Color", defaultColor: "#ff00aa" },
  { type: "tintWarm",     label: "Warm Tint",    category: "Color", defaultColor: "#fbbf24" },
  { type: "tintCool",     label: "Cool Tint",    category: "Color", defaultColor: "#60a5fa" },
  { type: "tintSepia",    label: "Sepia Tint",   category: "Color", defaultColor: "#a16207" },
  { type: "tintDuotone",  label: "Duotone Tint", category: "Color", defaultColor: "#7c3aed" },
  { type: "invert",       label: "Invert",       category: "Color" },
  { type: "grayscale",    label: "Grayscale",    category: "Color" },
  { type: "grayscaleSoft",label: "Soft Gray",    category: "Color" },
  { type: "sepia",        label: "Sepia",        category: "Color" },
  { type: "saturate",     label: "Saturate+",    category: "Color" },
  { type: "desaturate",   label: "Desaturate",   category: "Color" },
  { type: "brightness",   label: "Brighten",     category: "Color" },
  { type: "darkness",     label: "Darken",       category: "Color" },
  { type: "contrast",     label: "Contrast+",    category: "Color" },
  { type: "lowContrast",  label: "Low Contrast", category: "Color" },
  // ── Blur (3) ──────────────────────────────────────────────────────────
  { type: "blurMore",   label: "Soft Blur",   category: "Blur" },
  { type: "blurSoft",   label: "Light Blur",  category: "Blur" },
  { type: "blurHeavy",  label: "Heavy Blur",  category: "Blur" },
  { type: "blurMotion", label: "Motion Blur", category: "Blur" },
  // ── Distort (5) ───────────────────────────────────────────────────────
  { type: "chromaticAberration", label: "Chromatic", category: "Distort" },
  { type: "pixelate",      label: "Pixelate",   category: "Distort" },
  { type: "pixelateHeavy", label: "Pixel Heavy",category: "Distort" },
  { type: "glitch",        label: "Glitch",     category: "Distort" },
  { type: "glitchHeavy",   label: "Glitch++",   category: "Distort" },
  // ── Texture (3) ───────────────────────────────────────────────────────
  { type: "noise",            label: "Noise",        category: "Texture" },
  { type: "filmGrain",        label: "Film Grain",   category: "Texture" },
  { type: "filmGrainHeavy",   label: "Heavy Grain",  category: "Texture" },
  // ── Stylized (10) ─────────────────────────────────────────────────────
  { type: "halftone",     label: "Halftone",   category: "Stylized" },
  { type: "posterize",    label: "Posterize",  category: "Stylized" },
  { type: "posterizeHeavy",label:"Posterize++",category: "Stylized" },
  { type: "hueRotate",    label: "Hue Rotate", category: "Stylized" },
  { type: "hueShift90",   label: "Hue +90°",   category: "Stylized" },
  { type: "hueShift180",  label: "Hue +180°",  category: "Stylized" },
  { type: "vintage",      label: "Vintage",    category: "Stylized" },
  { type: "lomo",         label: "Lomo",       category: "Stylized" },
  { type: "polaroid",     label: "Polaroid",   category: "Stylized" },
  { type: "neon",         label: "Neon",       category: "Stylized", defaultColor: "#ec4899" },
];

export const EFFECT_CATEGORIES: EffectCategory[] = [
  "Vignette", "Glow", "Shake", "Scanlines", "Color", "Blur", "Distort", "Texture", "Stylized",
];

export function getEffectDef(type: EffectType): EffectDef | undefined {
  return EFFECT_LIBRARY.find((e) => e.type === type);
}
