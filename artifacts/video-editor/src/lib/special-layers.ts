/**
 * 50 "special layer" presets used by `mediaType: "specialLayer"` clips —
 * full-canvas tinted/textured overlays like light leaks, film grain,
 * vignettes, scanlines, lens flares, color grades, and gradient washes.
 *
 * Each preset compiles into either a CSS background (preview, in
 * Canvas.tsx) or a Canvas2D paint sequence (export, in use-export.ts).
 * The renderer reads `clip.specialKind` to look up the preset and uses
 * `clip.specialIntensity` (0..1, default 0.6) and optional
 * `clip.specialColor` to tweak it without editing the preset itself.
 *
 * `kind` values map to render branches in both files. Adding a new
 * `kind` requires both files to learn how to render it; reusing an
 * existing `kind` only requires a new entry here.
 */

export type SpecialKind =
  | "solidTint"          // flat color overlay at intensity opacity
  | "linearGradient"     // 2-stop linear gradient
  | "radialGradient"     // radial center-to-edge gradient
  | "vignette"           // centered radial darkening
  | "lightLeak"          // off-center colored radial bloom
  | "filmGrain"          // procedural grain noise
  | "scanlines"          // horizontal lines
  | "vScanlines"         // vertical lines
  | "lensFlare"          // bright spot + streak
  | "colorWash"          // duotone-style top→bottom 2-color wash
  | "gridOverlay"        // crossed-line grid for design layouts
  | "stripes"            // diagonal stripes
  | "bokeh";             // randomized soft circles

export interface SpecialDef {
  /** Stable id used in `clip.specialKind` and AI schema — never change. */
  key: string;
  /** Human-readable name shown in pickers. */
  name: string;
  category: "Light" | "Texture" | "Grade" | "Geometry" | "Atmosphere";
  /** Render branch in Canvas/use-export. */
  kind: SpecialKind;
  /** Default intensity 0..1 if user hasn't set one. */
  intensity: number;
  /** Primary color (gradients use this as the warm/light stop). */
  color: string;
  /** Optional secondary color (gradients use this as the cool/dark stop). */
  color2?: string;
  /** Default blend mode for the overlay (preview only — export ignores). */
  blend?: string;
  /** Free-form params bag for kinds that need extra knobs (angle, count). */
  params?: Record<string, number>;
}

export const SPECIAL_LAYERS: SpecialDef[] = [
  // ── Light (12) ────────────────────────────────────────────────────────
  { key: "lightLeakWarm",   name: "Warm Light Leak",  category: "Light", kind: "lightLeak", intensity: 0.6, color: "#ff7a3c", blend: "screen", params: { cx: 0.85, cy: 0.2, r: 0.6 } },
  { key: "lightLeakRose",   name: "Rose Leak",        category: "Light", kind: "lightLeak", intensity: 0.55, color: "#ff4d8d", blend: "screen", params: { cx: 0.1, cy: 0.8, r: 0.55 } },
  { key: "lightLeakAmber",  name: "Amber Leak",       category: "Light", kind: "lightLeak", intensity: 0.65, color: "#fbbf24", blend: "screen", params: { cx: 0.5, cy: 0.0, r: 0.7 } },
  { key: "lightLeakViolet", name: "Violet Leak",      category: "Light", kind: "lightLeak", intensity: 0.5, color: "#a855f7", blend: "screen", params: { cx: 0.0, cy: 0.5, r: 0.6 } },
  { key: "sunFlare",        name: "Sun Flare",        category: "Light", kind: "lensFlare", intensity: 0.7, color: "#fffbeb", params: { cx: 0.78, cy: 0.22 } },
  { key: "lensFlareCool",   name: "Cool Lens Flare",  category: "Light", kind: "lensFlare", intensity: 0.6, color: "#bae6fd", params: { cx: 0.2, cy: 0.3 } },
  { key: "topGlow",         name: "Top Glow",         category: "Light", kind: "linearGradient", intensity: 0.45, color: "#fef3c7", color2: "transparent", blend: "screen", params: { angle: 180 } },
  { key: "bottomGlow",      name: "Bottom Glow",      category: "Light", kind: "linearGradient", intensity: 0.45, color: "transparent", color2: "#fde68a", blend: "screen", params: { angle: 180 } },
  { key: "edgeGlowWhite",   name: "Edge Glow",        category: "Light", kind: "vignette", intensity: 0.5, color: "#ffffff", blend: "screen" },
  { key: "spotlight",       name: "Spotlight",        category: "Light", kind: "radialGradient", intensity: 0.55, color: "#ffffff", color2: "transparent", params: { cx: 0.5, cy: 0.5, r: 0.7 } },
  { key: "spotlightOff",    name: "Off-center Light", category: "Light", kind: "radialGradient", intensity: 0.5, color: "#ffffff", color2: "transparent", params: { cx: 0.3, cy: 0.4, r: 0.55 } },
  { key: "softVignette",    name: "Soft Vignette",    category: "Light", kind: "vignette", intensity: 0.5, color: "#000000" },

  // ── Texture (10) ──────────────────────────────────────────────────────
  { key: "filmGrainLight",  name: "Light Grain",      category: "Texture", kind: "filmGrain", intensity: 0.25, color: "#ffffff", params: { density: 0.5 } },
  { key: "filmGrainMed",    name: "Medium Grain",     category: "Texture", kind: "filmGrain", intensity: 0.45, color: "#ffffff", params: { density: 1.0 } },
  { key: "filmGrainHeavy",  name: "Heavy Grain",      category: "Texture", kind: "filmGrain", intensity: 0.7, color: "#ffffff", params: { density: 2.0 } },
  { key: "scanlinesThin",   name: "Thin Scanlines",   category: "Texture", kind: "scanlines", intensity: 0.4, color: "#000000", params: { spacing: 3 } },
  { key: "scanlinesThick",  name: "Thick Scanlines",  category: "Texture", kind: "scanlines", intensity: 0.6, color: "#000000", params: { spacing: 6 } },
  { key: "vScanlines",      name: "Vertical Lines",   category: "Texture", kind: "vScanlines", intensity: 0.4, color: "#000000", params: { spacing: 4 } },
  { key: "stripesDiag",     name: "Diagonal Stripes", category: "Texture", kind: "stripes", intensity: 0.3, color: "#ffffff", params: { angle: 45, spacing: 12 } },
  { key: "stripesSteep",    name: "Steep Stripes",    category: "Texture", kind: "stripes", intensity: 0.3, color: "#000000", params: { angle: 30, spacing: 18 } },
  { key: "noiseMono",       name: "Mono Noise",       category: "Texture", kind: "filmGrain", intensity: 0.5, color: "#cccccc", params: { density: 1.5 } },
  { key: "bokehSoft",       name: "Bokeh",            category: "Texture", kind: "bokeh", intensity: 0.5, color: "#ffffff", params: { count: 30, size: 0.08 } },

  // ── Grade (12) ────────────────────────────────────────────────────────
  { key: "tealOrange",      name: "Teal & Orange",    category: "Grade", kind: "colorWash", intensity: 0.45, color: "#fbbf24", color2: "#0e7490", blend: "soft-light" },
  { key: "duotoneSunset",   name: "Sunset Duotone",   category: "Grade", kind: "colorWash", intensity: 0.55, color: "#f97316", color2: "#7c3aed", blend: "soft-light" },
  { key: "duotoneOcean",    name: "Ocean Duotone",    category: "Grade", kind: "colorWash", intensity: 0.5, color: "#06b6d4", color2: "#1e3a8a", blend: "soft-light" },
  { key: "duotoneRose",     name: "Rose Duotone",     category: "Grade", kind: "colorWash", intensity: 0.5, color: "#fda4af", color2: "#9d174d", blend: "soft-light" },
  { key: "duotoneMint",     name: "Mint Duotone",     category: "Grade", kind: "colorWash", intensity: 0.5, color: "#a7f3d0", color2: "#065f46", blend: "soft-light" },
  { key: "duotoneNoir",     name: "Noir Duotone",     category: "Grade", kind: "colorWash", intensity: 0.65, color: "#e5e7eb", color2: "#000000", blend: "soft-light" },
  { key: "warmFilmTone",    name: "Warm Film",        category: "Grade", kind: "solidTint", intensity: 0.18, color: "#fbbf24", blend: "overlay" },
  { key: "coolFilmTone",    name: "Cool Film",        category: "Grade", kind: "solidTint", intensity: 0.18, color: "#0ea5e9", blend: "overlay" },
  { key: "matteBlack",      name: "Matte Black",      category: "Grade", kind: "solidTint", intensity: 0.25, color: "#000000", blend: "multiply" },
  { key: "matteWhite",      name: "Matte White",      category: "Grade", kind: "solidTint", intensity: 0.18, color: "#ffffff", blend: "screen" },
  { key: "sepiaTone",       name: "Sepia Tone",       category: "Grade", kind: "solidTint", intensity: 0.35, color: "#a16207", blend: "multiply" },
  { key: "blueShift",       name: "Blue Shift",       category: "Grade", kind: "solidTint", intensity: 0.25, color: "#3b82f6", blend: "soft-light" },

  // ── Geometry (8) ──────────────────────────────────────────────────────
  { key: "gridFine",        name: "Fine Grid",        category: "Geometry", kind: "gridOverlay", intensity: 0.25, color: "#ffffff", params: { spacing: 32 } },
  { key: "gridThick",       name: "Thick Grid",       category: "Geometry", kind: "gridOverlay", intensity: 0.4, color: "#ffffff", params: { spacing: 96 } },
  { key: "gridDark",        name: "Dark Grid",        category: "Geometry", kind: "gridOverlay", intensity: 0.4, color: "#000000", params: { spacing: 32 } },
  { key: "verticalSplit",   name: "Vertical Split",   category: "Geometry", kind: "linearGradient", intensity: 0.5, color: "#ffffff", color2: "#000000", params: { angle: 90 } },
  { key: "horizontalSplit", name: "Horizontal Split", category: "Geometry", kind: "linearGradient", intensity: 0.5, color: "#ffffff", color2: "#000000", params: { angle: 0 } },
  { key: "diagonalSplit",   name: "Diagonal Split",   category: "Geometry", kind: "linearGradient", intensity: 0.5, color: "#ffffff", color2: "#000000", params: { angle: 45 } },
  { key: "centerGlow",      name: "Center Spot",      category: "Geometry", kind: "radialGradient", intensity: 0.4, color: "#ffffff", color2: "transparent", params: { cx: 0.5, cy: 0.5, r: 0.4 } },
  { key: "cornerVignette",  name: "Corner Vignette",  category: "Geometry", kind: "radialGradient", intensity: 0.6, color: "transparent", color2: "#000000", params: { cx: 0.5, cy: 0.5, r: 0.9 } },

  // ── Atmosphere (8) ────────────────────────────────────────────────────
  { key: "fogTop",          name: "Top Fog",          category: "Atmosphere", kind: "linearGradient", intensity: 0.45, color: "#e5e7eb", color2: "transparent", blend: "screen", params: { angle: 180 } },
  { key: "fogBottom",       name: "Bottom Fog",       category: "Atmosphere", kind: "linearGradient", intensity: 0.45, color: "transparent", color2: "#e5e7eb", blend: "screen", params: { angle: 180 } },
  { key: "underwater",      name: "Underwater",       category: "Atmosphere", kind: "solidTint", intensity: 0.3, color: "#1e40af", blend: "overlay" },
  { key: "horror",          name: "Horror Tint",      category: "Atmosphere", kind: "solidTint", intensity: 0.4, color: "#450a0a", blend: "multiply" },
  { key: "neonPink",        name: "Neon Pink",        category: "Atmosphere", kind: "solidTint", intensity: 0.4, color: "#ec4899", blend: "screen" },
  { key: "matrixGreen",     name: "Matrix Green",     category: "Atmosphere", kind: "solidTint", intensity: 0.4, color: "#16a34a", blend: "screen" },
  { key: "dreamy",          name: "Dreamy",           category: "Atmosphere", kind: "radialGradient", intensity: 0.4, color: "#fbcfe8", color2: "transparent", blend: "screen", params: { cx: 0.5, cy: 0.5, r: 0.9 } },
  { key: "smoke",           name: "Smoke",            category: "Atmosphere", kind: "filmGrain", intensity: 0.35, color: "#9ca3af", params: { density: 0.7 } },
];

export const SPECIAL_CATEGORIES = ["Light", "Texture", "Grade", "Geometry", "Atmosphere"] as const;

export function getSpecialLayer(key: string | undefined): SpecialDef | null {
  if (!key) return null;
  return SPECIAL_LAYERS.find((s) => s.key === key) ?? null;
}
