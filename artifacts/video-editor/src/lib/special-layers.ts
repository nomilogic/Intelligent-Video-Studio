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

  // ── Light (extended) ──────────────────────────────────────────────────
  { key: "lightLeakCyan",   name: "Cyan Leak",        category: "Light", kind: "lightLeak", intensity: 0.55, color: "#06b6d4", blend: "screen", params: { cx: 0.9, cy: 0.1, r: 0.5 } },
  { key: "lightLeakLime",   name: "Lime Leak",        category: "Light", kind: "lightLeak", intensity: 0.5, color: "#84cc16", blend: "screen", params: { cx: 0.1, cy: 0.2, r: 0.6 } },
  { key: "lightLeakGold",   name: "Gold Leak",        category: "Light", kind: "lightLeak", intensity: 0.6, color: "#f59e0b", blend: "screen", params: { cx: 0.8, cy: 0.9, r: 0.65 } },
  { key: "lightLeakIce",    name: "Ice Leak",         category: "Light", kind: "lightLeak", intensity: 0.5, color: "#bae6fd", blend: "screen", params: { cx: 0.5, cy: 0.0, r: 0.55 } },
  { key: "lightLeakMagenta",name: "Magenta Leak",     category: "Light", kind: "lightLeak", intensity: 0.55, color: "#f0abfc", blend: "screen", params: { cx: 0.15, cy: 0.85, r: 0.6 } },
  { key: "lightLeakRed",    name: "Red Leak",         category: "Light", kind: "lightLeak", intensity: 0.5, color: "#ef4444", blend: "screen", params: { cx: 0.7, cy: 0.3, r: 0.5 } },
  { key: "lightLeakGreen",  name: "Green Leak",       category: "Light", kind: "lightLeak", intensity: 0.5, color: "#22c55e", blend: "screen", params: { cx: 0.3, cy: 0.7, r: 0.55 } },
  { key: "lightLeakTeal",   name: "Teal Leak",        category: "Light", kind: "lightLeak", intensity: 0.5, color: "#14b8a6", blend: "screen", params: { cx: 0.6, cy: 0.1, r: 0.6 } },
  { key: "doubleFlare",     name: "Double Flare",     category: "Light", kind: "lensFlare", intensity: 0.65, color: "#fef9c3", params: { cx: 0.25, cy: 0.25 } },
  { key: "goldFlare",       name: "Gold Flare",       category: "Light", kind: "lensFlare", intensity: 0.7, color: "#fbbf24", params: { cx: 0.6, cy: 0.15 } },
  { key: "hotspot",         name: "Hotspot",          category: "Light", kind: "radialGradient", intensity: 0.6, color: "#ffffff", color2: "transparent", params: { cx: 0.7, cy: 0.25, r: 0.5 } },
  { key: "rimLight",        name: "Rim Light",        category: "Light", kind: "linearGradient", intensity: 0.5, color: "#ffffff", color2: "transparent", blend: "screen", params: { angle: 270 } },
  { key: "sideGlowLeft",    name: "Side Glow Left",   category: "Light", kind: "linearGradient", intensity: 0.4, color: "#fde68a", color2: "transparent", blend: "screen", params: { angle: 90 } },
  { key: "sideGlowRight",   name: "Side Glow Right",  category: "Light", kind: "linearGradient", intensity: 0.4, color: "transparent", color2: "#fde68a", blend: "screen", params: { angle: 90 } },
  { key: "haloEffect",      name: "Halo",             category: "Light", kind: "radialGradient", intensity: 0.4, color: "#fff7ed", color2: "transparent", blend: "screen", params: { cx: 0.5, cy: 0.3, r: 0.6 } },
  { key: "godRays",         name: "God Rays",         category: "Light", kind: "radialGradient", intensity: 0.5, color: "#fef3c7", color2: "transparent", blend: "screen", params: { cx: 0.5, cy: 0.0, r: 1.0 } },
  { key: "starburstFlare",  name: "Starburst",        category: "Light", kind: "lensFlare", intensity: 0.75, color: "#ffffff", params: { cx: 0.5, cy: 0.5 } },

  // ── Texture (extended) ────────────────────────────────────────────────
  { key: "scanlinesFine",   name: "Ultra Fine Lines", category: "Texture", kind: "scanlines", intensity: 0.25, color: "#000000", params: { spacing: 2 } },
  { key: "scanlinesWide",   name: "Wide Scanlines",   category: "Texture", kind: "scanlines", intensity: 0.5, color: "#000000", params: { spacing: 10 } },
  { key: "vScanlinesWide",  name: "Wide V-Lines",     category: "Texture", kind: "vScanlines", intensity: 0.35, color: "#000000", params: { spacing: 8 } },
  { key: "vScanlinesThin",  name: "Thin V-Lines",     category: "Texture", kind: "vScanlines", intensity: 0.25, color: "#000000", params: { spacing: 2 } },
  { key: "stripesBold",     name: "Bold Stripes",     category: "Texture", kind: "stripes", intensity: 0.4, color: "#ffffff", params: { angle: 45, spacing: 8 } },
  { key: "stripesHoriz",    name: "Horizontal Stripes", category: "Texture", kind: "stripes", intensity: 0.3, color: "#000000", params: { angle: 0, spacing: 14 } },
  { key: "stripesVert",     name: "Vertical Stripes", category: "Texture", kind: "stripes", intensity: 0.3, color: "#000000", params: { angle: 90, spacing: 14 } },
  { key: "grainColor",      name: "Color Grain",      category: "Texture", kind: "filmGrain", intensity: 0.4, color: "#a78bfa", params: { density: 1.2 } },
  { key: "grainSepia",      name: "Sepia Grain",      category: "Texture", kind: "filmGrain", intensity: 0.5, color: "#b45309", params: { density: 1.0 } },
  { key: "bokehLarge",      name: "Large Bokeh",      category: "Texture", kind: "bokeh", intensity: 0.6, color: "#ffffff", params: { count: 15, size: 0.15 } },
  { key: "bokehGold",       name: "Gold Bokeh",       category: "Texture", kind: "bokeh", intensity: 0.5, color: "#fbbf24", params: { count: 25, size: 0.1 } },
  { key: "bokehBlue",       name: "Blue Bokeh",       category: "Texture", kind: "bokeh", intensity: 0.5, color: "#38bdf8", params: { count: 20, size: 0.09 } },
  { key: "bokehRose",       name: "Rose Bokeh",       category: "Texture", kind: "bokeh", intensity: 0.5, color: "#fb7185", params: { count: 22, size: 0.08 } },
  { key: "bokehGreen",      name: "Green Bokeh",      category: "Texture", kind: "bokeh", intensity: 0.5, color: "#4ade80", params: { count: 18, size: 0.1 } },
  { key: "vhsNoise",        name: "VHS Noise",        category: "Texture", kind: "filmGrain", intensity: 0.6, color: "#94a3b8", params: { density: 2.5 } },
  { key: "filmScratch",     name: "Film Scratch",     category: "Texture", kind: "stripes", intensity: 0.35, color: "#ffffff", params: { angle: 90, spacing: 64 } },
  { key: "halftone",        name: "Halftone",         category: "Texture", kind: "bokeh", intensity: 0.4, color: "#000000", params: { count: 80, size: 0.025 } },
  { key: "sandStorm",       name: "Sand Storm",       category: "Texture", kind: "filmGrain", intensity: 0.55, color: "#d97706", params: { density: 3.0 } },
  { key: "staticNoise",     name: "Static Noise",     category: "Texture", kind: "filmGrain", intensity: 0.8, color: "#ffffff", params: { density: 5.0 } },
  { key: "rainGlass",       name: "Rain Glass",       category: "Texture", kind: "filmGrain", intensity: 0.3, color: "#bae6fd", params: { density: 0.8 } },

  // ── Grade (extended) ──────────────────────────────────────────────────
  { key: "duotonePurple",   name: "Purple Duotone",   category: "Grade", kind: "colorWash", intensity: 0.5, color: "#c084fc", color2: "#1e1b4b", blend: "soft-light" },
  { key: "duotoneTeal",     name: "Teal Duotone",     category: "Grade", kind: "colorWash", intensity: 0.5, color: "#2dd4bf", color2: "#134e4a", blend: "soft-light" },
  { key: "duotoneSepia",    name: "Sepia Duotone",    category: "Grade", kind: "colorWash", intensity: 0.55, color: "#d97706", color2: "#1c1917", blend: "soft-light" },
  { key: "duotoneCyan",     name: "Cyan Chrome",      category: "Grade", kind: "colorWash", intensity: 0.5, color: "#06b6d4", color2: "#0f172a", blend: "soft-light" },
  { key: "duotoneGold",     name: "Gold Rush",        category: "Grade", kind: "colorWash", intensity: 0.55, color: "#fbbf24", color2: "#78350f", blend: "soft-light" },
  { key: "duotoneCherry",   name: "Cherry",           category: "Grade", kind: "colorWash", intensity: 0.5, color: "#f43f5e", color2: "#4c0519", blend: "soft-light" },
  { key: "duotoneForest",   name: "Forest",           category: "Grade", kind: "colorWash", intensity: 0.5, color: "#4ade80", color2: "#14532d", blend: "soft-light" },
  { key: "duotoneSlate",    name: "Slate",            category: "Grade", kind: "colorWash", intensity: 0.55, color: "#94a3b8", color2: "#0f172a", blend: "soft-light" },
  { key: "duotonePeach",    name: "Peach",            category: "Grade", kind: "colorWash", intensity: 0.5, color: "#fdba74", color2: "#7f1d1d", blend: "soft-light" },
  { key: "duotoneLavender", name: "Lavender",         category: "Grade", kind: "colorWash", intensity: 0.5, color: "#c4b5fd", color2: "#1e1b4b", blend: "soft-light" },
  { key: "orangeTint",      name: "Orange Tint",      category: "Grade", kind: "solidTint", intensity: 0.2, color: "#f97316", blend: "overlay" },
  { key: "greenTint",       name: "Green Tint",       category: "Grade", kind: "solidTint", intensity: 0.2, color: "#22c55e", blend: "overlay" },
  { key: "redTint",         name: "Red Tint",         category: "Grade", kind: "solidTint", intensity: 0.2, color: "#ef4444", blend: "overlay" },
  { key: "purpleTint",      name: "Purple Tint",      category: "Grade", kind: "solidTint", intensity: 0.2, color: "#a855f7", blend: "overlay" },
  { key: "cyanTint",        name: "Cyan Tint",        category: "Grade", kind: "solidTint", intensity: 0.2, color: "#06b6d4", blend: "overlay" },
  { key: "goldTint",        name: "Gold Tint",        category: "Grade", kind: "solidTint", intensity: 0.2, color: "#eab308", blend: "overlay" },
  { key: "blackAndWhite",   name: "Black & White",    category: "Grade", kind: "solidTint", intensity: 0.9, color: "#6b7280", blend: "saturation" },
  { key: "crossProcess",    name: "Cross Process",    category: "Grade", kind: "colorWash", intensity: 0.6, color: "#10b981", color2: "#f59e0b", blend: "hard-light" },
  { key: "lomography",      name: "Lomography",       category: "Grade", kind: "colorWash", intensity: 0.55, color: "#fb923c", color2: "#7c3aed", blend: "multiply" },
  { key: "kodachrome",      name: "Kodachrome",       category: "Grade", kind: "solidTint", intensity: 0.22, color: "#fbbf24", blend: "overlay" },
  { key: "fujiFilm",        name: "Fuji Film",        category: "Grade", kind: "colorWash", intensity: 0.4, color: "#a7f3d0", color2: "#1e3a8a", blend: "soft-light" },
  { key: "instagramXpro",   name: "Instagram X-Pro",  category: "Grade", kind: "colorWash", intensity: 0.5, color: "#ec4899", color2: "#1e3a8a", blend: "soft-light" },
  { key: "bleachBypass",    name: "Bleach Bypass",    category: "Grade", kind: "solidTint", intensity: 0.4, color: "#e5e7eb", blend: "saturation" },
  { key: "colorBurn",       name: "Color Burn",       category: "Grade", kind: "solidTint", intensity: 0.4, color: "#000000", blend: "color-burn" },
  { key: "colorDodge",      name: "Color Dodge",      category: "Grade", kind: "solidTint", intensity: 0.3, color: "#ffffff", blend: "color-dodge" },

  // ── Geometry (extended) ───────────────────────────────────────────────
  { key: "gridColorWarm",   name: "Warm Grid",        category: "Geometry", kind: "gridOverlay", intensity: 0.3, color: "#f97316", params: { spacing: 48 } },
  { key: "gridColorCool",   name: "Cool Grid",        category: "Geometry", kind: "gridOverlay", intensity: 0.3, color: "#38bdf8", params: { spacing: 48 } },
  { key: "gridMicro",       name: "Micro Grid",       category: "Geometry", kind: "gridOverlay", intensity: 0.2, color: "#ffffff", params: { spacing: 16 } },
  { key: "gridMega",        name: "Mega Grid",        category: "Geometry", kind: "gridOverlay", intensity: 0.5, color: "#ffffff", params: { spacing: 192 } },
  { key: "diagonalGold",    name: "Gold Diagonal",    category: "Geometry", kind: "linearGradient", intensity: 0.5, color: "#fbbf24", color2: "#78350f", params: { angle: 135 } },
  { key: "diagonalCool",    name: "Cool Diagonal",    category: "Geometry", kind: "linearGradient", intensity: 0.5, color: "#38bdf8", color2: "#1e1b4b", params: { angle: 135 } },
  { key: "diagonalFire",    name: "Fire Diagonal",    category: "Geometry", kind: "linearGradient", intensity: 0.6, color: "#ef4444", color2: "#fbbf24", params: { angle: 45 } },
  { key: "triSplit",        name: "Tri Split",        category: "Geometry", kind: "linearGradient", intensity: 0.5, color: "#a855f7", color2: "#0ea5e9", params: { angle: 120 } },
  { key: "centerSpot",      name: "Center Spot Lg",   category: "Geometry", kind: "radialGradient", intensity: 0.5, color: "#ffffff", color2: "transparent", params: { cx: 0.5, cy: 0.5, r: 0.55 } },
  { key: "ruleThirds",      name: "Rule of Thirds",   category: "Geometry", kind: "gridOverlay", intensity: 0.2, color: "#ffffff", params: { spacing: 999, thirdLines: 1 } },
  { key: "topThird",        name: "Top Third Glow",   category: "Geometry", kind: "linearGradient", intensity: 0.4, color: "#fef3c7", color2: "transparent", blend: "screen", params: { angle: 180 } },
  { key: "bottomThird",     name: "Bottom Third Glow",category: "Geometry", kind: "linearGradient", intensity: 0.4, color: "transparent", color2: "#fef3c7", blend: "screen", params: { angle: 180 } },

  // ── Atmosphere (extended) ─────────────────────────────────────────────
  { key: "fogLeft",         name: "Left Fog",         category: "Atmosphere", kind: "linearGradient", intensity: 0.45, color: "#e5e7eb", color2: "transparent", blend: "screen", params: { angle: 90 } },
  { key: "fogRight",        name: "Right Fog",        category: "Atmosphere", kind: "linearGradient", intensity: 0.45, color: "transparent", color2: "#e5e7eb", blend: "screen", params: { angle: 90 } },
  { key: "fogFull",         name: "Full Fog",         category: "Atmosphere", kind: "solidTint", intensity: 0.35, color: "#e5e7eb", blend: "screen" },
  { key: "haze",            name: "Heat Haze",        category: "Atmosphere", kind: "filmGrain", intensity: 0.2, color: "#fef9c3", params: { density: 0.3 } },
  { key: "blizzard",        name: "Blizzard",         category: "Atmosphere", kind: "filmGrain", intensity: 0.5, color: "#e5e7eb", params: { density: 2.0 } },
  { key: "ashFall",         name: "Ash Fall",         category: "Atmosphere", kind: "filmGrain", intensity: 0.4, color: "#6b7280", params: { density: 1.5 } },
  { key: "goldDust",        name: "Gold Dust",        category: "Atmosphere", kind: "filmGrain", intensity: 0.3, color: "#fbbf24", params: { density: 1.0 } },
  { key: "neonBlue",        name: "Neon Blue",        category: "Atmosphere", kind: "solidTint", intensity: 0.4, color: "#3b82f6", blend: "screen" },
  { key: "neonGreen",       name: "Neon Green",       category: "Atmosphere", kind: "solidTint", intensity: 0.4, color: "#22c55e", blend: "screen" },
  { key: "neonPurple",      name: "Neon Purple",      category: "Atmosphere", kind: "solidTint", intensity: 0.4, color: "#a855f7", blend: "screen" },
  { key: "neonOrange",      name: "Neon Orange",      category: "Atmosphere", kind: "solidTint", intensity: 0.4, color: "#f97316", blend: "screen" },
  { key: "neonCyan",        name: "Neon Cyan",        category: "Atmosphere", kind: "solidTint", intensity: 0.4, color: "#06b6d4", blend: "screen" },
  { key: "neonYellow",      name: "Neon Yellow",      category: "Atmosphere", kind: "solidTint", intensity: 0.4, color: "#eab308", blend: "screen" },
  { key: "infrared",        name: "Infrared",         category: "Atmosphere", kind: "colorWash", intensity: 0.6, color: "#ef4444", color2: "#a7f3d0", blend: "soft-light" },
  { key: "nightVision",     name: "Night Vision",     category: "Atmosphere", kind: "solidTint", intensity: 0.5, color: "#16a34a", blend: "overlay" },
  { key: "xray",            name: "X-Ray",            category: "Atmosphere", kind: "solidTint", intensity: 0.6, color: "#6b7280", blend: "difference" },
  { key: "radioactive",     name: "Radioactive",      category: "Atmosphere", kind: "solidTint", intensity: 0.45, color: "#84cc16", blend: "screen" },
  { key: "dustMotes",       name: "Dust Motes",       category: "Atmosphere", kind: "bokeh", intensity: 0.35, color: "#fef9c3", params: { count: 40, size: 0.03 } },
  { key: "magicDust",       name: "Magic Dust",       category: "Atmosphere", kind: "bokeh", intensity: 0.45, color: "#c084fc", params: { count: 35, size: 0.04 } },
  { key: "snowfall",        name: "Snowfall",         category: "Atmosphere", kind: "bokeh", intensity: 0.5, color: "#e5e7eb", params: { count: 50, size: 0.02 } },
  { key: "apocalypse",      name: "Apocalypse",       category: "Atmosphere", kind: "colorWash", intensity: 0.6, color: "#ef4444", color2: "#1c1917", blend: "multiply" },
  { key: "synthwave",       name: "Synthwave",        category: "Atmosphere", kind: "colorWash", intensity: 0.55, color: "#f0abfc", color2: "#1e1b4b", blend: "soft-light" },
  { key: "cyberpunk",       name: "Cyberpunk",        category: "Atmosphere", kind: "colorWash", intensity: 0.55, color: "#22d3ee", color2: "#a855f7", blend: "soft-light" },
  { key: "vaporwave",       name: "Vaporwave",        category: "Atmosphere", kind: "colorWash", intensity: 0.55, color: "#f472b6", color2: "#818cf8", blend: "soft-light" },
  { key: "lofi",            name: "Lo-fi",            category: "Atmosphere", kind: "colorWash", intensity: 0.4, color: "#fde68a", color2: "#a7f3d0", blend: "soft-light" },
  { key: "retroGame",       name: "Retro Game",       category: "Atmosphere", kind: "solidTint", intensity: 0.35, color: "#4ade80", blend: "overlay" },
  { key: "polaroidFade",    name: "Polaroid Fade",    category: "Atmosphere", kind: "solidTint", intensity: 0.2, color: "#fef9c3", blend: "screen" },
  { key: "aged",            name: "Aged Film",        category: "Atmosphere", kind: "colorWash", intensity: 0.5, color: "#a16207", color2: "#1c1917", blend: "multiply" },
  { key: "burnt",           name: "Burnt Edges",      category: "Atmosphere", kind: "vignette", intensity: 0.7, color: "#78350f" },
  { key: "overexposed",     name: "Overexposed",      category: "Atmosphere", kind: "solidTint", intensity: 0.4, color: "#ffffff", blend: "screen" },
  { key: "underexposed",    name: "Underexposed",     category: "Atmosphere", kind: "solidTint", intensity: 0.5, color: "#000000", blend: "multiply" },
  { key: "summerGlow",      name: "Summer Glow",      category: "Atmosphere", kind: "radialGradient", intensity: 0.4, color: "#fef9c3", color2: "transparent", blend: "screen", params: { cx: 0.5, cy: 0.5, r: 0.8 } },
  { key: "winterChill",     name: "Winter Chill",     category: "Atmosphere", kind: "solidTint", intensity: 0.25, color: "#bae6fd", blend: "overlay" },
  { key: "desertHeat",      name: "Desert Heat",      category: "Atmosphere", kind: "solidTint", intensity: 0.3, color: "#fbbf24", blend: "overlay" },
  { key: "forestShade",     name: "Forest Shade",     category: "Atmosphere", kind: "solidTint", intensity: 0.25, color: "#14532d", blend: "overlay" },
  { key: "cityLights",      name: "City Lights",      category: "Atmosphere", kind: "bokeh", intensity: 0.5, color: "#fbbf24", params: { count: 60, size: 0.05 } },
  { key: "starField",       name: "Star Field",       category: "Atmosphere", kind: "bokeh", intensity: 0.7, color: "#ffffff", params: { count: 100, size: 0.012 } },
];

export const SPECIAL_CATEGORIES = ["Light", "Texture", "Grade", "Geometry", "Atmosphere"] as const;

export function getSpecialLayer(key: string | undefined): SpecialDef | null {
  if (!key) return null;
  return SPECIAL_LAYERS.find((s) => s.key === key) ?? null;
}
