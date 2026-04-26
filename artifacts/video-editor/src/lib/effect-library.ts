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
  | "Stylized"
  | "Cinematic"
  | "ColorGrade"
  | "Light"
  | "ArtStyle"
  | "Retro";

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

  // ── Phase-3: 100 new looks ────────────────────────────────────────────
  // Cinematic LUTs (20)
  { type: "tealOrange",     label: "Teal & Orange",   category: "Cinematic" },
  { type: "bleachBypass",   label: "Bleach Bypass",   category: "Cinematic" },
  { type: "goldenHour",     label: "Golden Hour",     category: "Cinematic" },
  { type: "moonlight",      label: "Moonlight",       category: "Cinematic" },
  { type: "sunset",         label: "Sunset",          category: "Cinematic" },
  { type: "desert",         label: "Desert",          category: "Cinematic" },
  { type: "arctic",         label: "Arctic",          category: "Cinematic" },
  { type: "jungle",         label: "Jungle",          category: "Cinematic" },
  { type: "noir",           label: "Noir",            category: "Cinematic" },
  { type: "highKey",        label: "High Key",        category: "Cinematic" },
  { type: "lowKey",         label: "Low Key",         category: "Cinematic" },
  { type: "mutedRetro",     label: "Muted Retro",     category: "Cinematic" },
  { type: "kodakChrome",    label: "Kodachrome",      category: "Cinematic" },
  { type: "polaroid79",     label: "Polaroid '79",    category: "Cinematic" },
  { type: "filmKodak",      label: "Film Kodak",      category: "Cinematic" },
  { type: "kodakGold",      label: "Kodak Gold",      category: "Cinematic" },
  { type: "ektarVibrant",   label: "Ektar Vibrant",   category: "Cinematic" },
  { type: "portra",         label: "Portra",          category: "Cinematic" },
  { type: "ektachromeBlue", label: "Ektachrome Blue", category: "Cinematic" },
  { type: "vhs",            label: "VHS",             category: "Cinematic" },

  // Color grades (20)
  { type: "warmBoost",   label: "Warm Boost",   category: "ColorGrade" },
  { type: "coolShade",   label: "Cool Shade",   category: "ColorGrade" },
  { type: "amberGlow",   label: "Amber Glow",   category: "ColorGrade" },
  { type: "magentaShift",label: "Magenta Shift",category: "ColorGrade" },
  { type: "greenLift",   label: "Green Lift",   category: "ColorGrade" },
  { type: "skyBlue",     label: "Sky Blue",     category: "ColorGrade" },
  { type: "redShift",    label: "Red Shift",    category: "ColorGrade" },
  { type: "oliveTone",   label: "Olive Tone",   category: "ColorGrade" },
  { type: "mintFresh",   label: "Mint Fresh",   category: "ColorGrade" },
  { type: "roseGold",    label: "Rose Gold",    category: "ColorGrade" },
  { type: "peachSoft",   label: "Peach Soft",   category: "ColorGrade" },
  { type: "matcha",      label: "Matcha",       category: "ColorGrade" },
  { type: "navyDeep",    label: "Navy Deep",    category: "ColorGrade" },
  { type: "coralPop",    label: "Coral Pop",    category: "ColorGrade" },
  { type: "emeraldDeep", label: "Emerald Deep", category: "ColorGrade" },
  { type: "rubyRich",    label: "Ruby Rich",    category: "ColorGrade" },
  { type: "amethystHaze",label: "Amethyst Haze",category: "ColorGrade" },
  { type: "topazWarm",   label: "Topaz Warm",   category: "ColorGrade" },
  { type: "onyxDeep",    label: "Onyx Deep",    category: "ColorGrade" },
  { type: "ivoryClean",  label: "Ivory Clean",  category: "ColorGrade" },

  // Light / atmosphere (15)
  { type: "morningHaze", label: "Morning Haze", category: "Light" },
  { type: "fogDense",    label: "Fog Dense",    category: "Light" },
  { type: "mistLight",   label: "Mist Light",   category: "Light" },
  { type: "rainAmbient", label: "Rain Ambient", category: "Light" },
  { type: "dustyAir",    label: "Dusty Air",    category: "Light" },
  { type: "sunBeams",    label: "Sun Beams",    category: "Light" },
  { type: "starryNight", label: "Starry Night", category: "Light" },
  { type: "neonNight",   label: "Neon Night",   category: "Light" },
  { type: "blueHour",    label: "Blue Hour",    category: "Light" },
  { type: "magicHour",   label: "Magic Hour",   category: "Light" },
  { type: "backlitGlow", label: "Backlit Glow", category: "Light", defaultColor: "#fff7d6" },
  { type: "rimLight",    label: "Rim Light",    category: "Light", defaultColor: "#ffffff" },
  { type: "softGlow",    label: "Soft Glow",    category: "Light", defaultColor: "#fef3c7" },
  { type: "hardGlow",    label: "Hard Glow",    category: "Light", defaultColor: "#ffffff" },
  { type: "candleLight", label: "Candle Light", category: "Light", defaultColor: "#fbbf24" },

  // Stylized art (20)
  { type: "anime",        label: "Anime",        category: "ArtStyle" },
  { type: "comicBook",    label: "Comic Book",   category: "ArtStyle" },
  { type: "oilPaint",     label: "Oil Paint",    category: "ArtStyle" },
  { type: "watercolor",   label: "Watercolor",   category: "ArtStyle" },
  { type: "pencilSketch", label: "Pencil Sketch",category: "ArtStyle" },
  { type: "inkDrawing",   label: "Ink Drawing",  category: "ArtStyle" },
  { type: "popArt",       label: "Pop Art",      category: "ArtStyle" },
  { type: "mosaic",       label: "Mosaic",       category: "ArtStyle" },
  { type: "cartoon",      label: "Cartoon",      category: "ArtStyle" },
  { type: "manga",        label: "Manga",        category: "ArtStyle" },
  { type: "gameboy",      label: "Game Boy",     category: "ArtStyle" },
  { type: "console",      label: "Console",      category: "ArtStyle" },
  { type: "arcade",       label: "Arcade",       category: "ArtStyle" },
  { type: "pixel8",       label: "8-bit",        category: "ArtStyle" },
  { type: "pixel16",      label: "16-bit",       category: "ArtStyle" },
  { type: "hologram",     label: "Hologram",     category: "ArtStyle", defaultColor: "#22d3ee" },
  { type: "disco",        label: "Disco",        category: "ArtStyle" },
  { type: "rainbow",      label: "Rainbow",      category: "ArtStyle" },
  { type: "psychedelic",  label: "Psychedelic",  category: "ArtStyle" },
  { type: "infrared",     label: "Infrared",     category: "ArtStyle" },

  // Distort (10)
  { type: "waveWarp",     label: "Wave Warp",    category: "Distort" },
  { type: "rippleStrong", label: "Ripple Strong",category: "Distort" },
  { type: "vortex",       label: "Vortex",       category: "Distort" },
  { type: "earthquake",   label: "Earthquake",   category: "Distort" },
  { type: "wobble",       label: "Wobble",       category: "Distort" },
  { type: "drunkard",     label: "Drunkard",     category: "Distort" },
  { type: "heatwave",     label: "Heatwave",     category: "Distort" },
  { type: "fishEye",      label: "Fish Eye",     category: "Distort" },
  { type: "bubbleLens",   label: "Bubble Lens",  category: "Distort" },
  { type: "twirl",        label: "Twirl",        category: "Distort" },

  // Retro / textures (15)
  { type: "paperGrain",     label: "Paper Grain",     category: "Retro" },
  { type: "bokehSparkle",   label: "Bokeh Sparkle",   category: "Retro" },
  { type: "confettiTint",   label: "Confetti Tint",   category: "Retro" },
  { type: "glitter",        label: "Glitter",         category: "Retro" },
  { type: "rainOverlay",    label: "Rain Overlay",    category: "Retro" },
  { type: "snowOverlay",    label: "Snow Overlay",    category: "Retro" },
  { type: "fireGlow",       label: "Fire Glow",       category: "Retro", defaultColor: "#f97316" },
  { type: "emberPulse",     label: "Ember Pulse",     category: "Retro", defaultColor: "#ef4444" },
  { type: "smokeHaze",      label: "Smoke Haze",      category: "Retro" },
  { type: "fogOverlay",     label: "Fog Overlay",     category: "Retro" },
  { type: "starsOverlay",   label: "Stars Overlay",   category: "Retro" },
  { type: "meteorTrail",    label: "Meteor Trail",    category: "Retro" },
  { type: "cometTail",      label: "Comet Tail",      category: "Retro" },
  { type: "auroraBorealis", label: "Aurora Borealis", category: "Retro", defaultColor: "#22d3ee" },
  { type: "vintage70s",     label: "Vintage 70s",     category: "Retro" },
];

export const EFFECT_CATEGORIES: EffectCategory[] = [
  "Vignette", "Glow", "Shake", "Scanlines", "Color", "Blur", "Distort", "Texture", "Stylized",
  "Cinematic", "ColorGrade", "Light", "ArtStyle", "Retro",
];

export function getEffectDef(type: EffectType): EffectDef | undefined {
  return EFFECT_LIBRARY.find((e) => e.type === type);
}
