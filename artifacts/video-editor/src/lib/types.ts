export type MediaType =
  | "video"
  | "audio"
  | "image"
  | "text"
  | "blank"
  // Adjustment-layer clip types — they don't carry source media but instead
  // affect the visual composite within their rectangle. Both fully support
  // x/y/width/height/rotation/scale/opacity keyframing like normal clips.
  | "logoBlur"     // pixel-blurs whatever sits beneath this rectangle
  | "maskLayer"    // contributes an alpha mask to the visible composite
  // Vector shape clip — fills its rect with one of ~50 SVG shapes (heart,
  // star, arrow, badge, etc). The shape kind comes from clip.shapeKind and
  // the fill from clip.fill (solid color or gradient).
  | "shape"
  // Special-overlay clip — full-canvas tinted/textured overlays like
  // light leaks, film grain, vignettes, scanlines, lens flares. Driven
  // by clip.specialKind and a few intensity knobs. Always renders on
  // top of media beneath in their track range.
  | "specialLayer";

export interface ChromaKey {
  // Enable toggle so users can adjust controls without immediately seeing the
  // result while picking a color.
  enabled: boolean;
  color: string;       // hex string e.g. "#00ff00"
  threshold: number;   // 0..1 — how close a pixel must be to `color` to drop
  smoothness: number;  // 0..1 — soft edge falloff range past the threshold
  spill: number;       // 0..1 — desaturate residual color cast on edges
}

export type EasingType =
  | "step"
  | "linear"
  | "quadIn" | "quadOut" | "quadInOut"
  | "cubicIn" | "cubicOut" | "cubicInOut"
  | "quartIn" | "quartOut" | "quartInOut"
  | "quintIn" | "quintOut" | "quintInOut"
  | "sineIn" | "sineOut" | "sineInOut"
  | "expoIn" | "expoOut" | "expoInOut"
  | "circIn" | "circOut" | "circInOut"
  | "backIn" | "backOut" | "backInOut"
  | "elasticIn" | "elasticOut" | "elasticInOut"
  | "bounceIn" | "bounceOut" | "bounceInOut"
  | "ease" | "easeIn" | "easeOut" | "easeInOut";

export interface ClipFilters {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
  grayscale: number;
  sepia: number;
  invert: number;
}

export interface TextGradient {
  enabled: boolean;
  color1: string;
  color2: string;
  /** Angle in degrees, 0 = horizontal left→right, 90 = vertical top→bottom. */
  angle: number;
}

export interface TextStroke {
  enabled: boolean;
  color: string;
  /** Stroke width in px (relative to canvas-rendered font size). */
  width: number;
}

export interface TextGlow {
  enabled: boolean;
  color: string;
  /** Glow blur radius in px. */
  blur: number;
  /** Stacked-shadow intensity 1..6 — higher = stronger neon. */
  intensity: number;
}

export interface TextShadow {
  enabled: boolean;
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
}

export interface TextBackground {
  /** Solid color, "transparent", or ignored when gradient.enabled is true. */
  color: string;
  gradient: TextGradient;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  padding: number;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  /** Legacy — solid background color or "transparent". Kept for migration. */
  background: string;
  align: "left" | "center" | "right";
  /** Legacy boolean — when true, fall back to a default soft drop shadow. */
  shadow: boolean;
  italic: boolean;
  underline: boolean;
  /** New (optional) — gradient fill applied via background-clip:text. */
  gradient?: TextGradient;
  /** New (optional) — text outline via -webkit-text-stroke. */
  stroke?: TextStroke;
  /** New (optional) — colored glow via stacked shadows. */
  glow?: TextGlow;
  /** New (optional) — fully customizable drop shadow. */
  textShadow?: TextShadow;
  /** Letter spacing in px. */
  letterSpacing?: number;
  /** Line height multiplier. */
  lineHeight?: number;
  /** Curve angle in degrees (-180..180). 0 = straight text. */
  curve?: number;
  /** New (optional) — background panel with gradient + border + radius. */
  bg?: TextBackground;
}

export type EffectType =
  // Original 6 — keep these exact strings stable for back-compat with saved
  // projects.
  | "vignette"
  | "glow"
  | "shake"
  | "scanlines"
  | "tint"
  | "blurMore"
  // Phase-2 expansion. Each one is implemented as either an extra CSS-filter
  // chunk (`buildEffectFilter`), a deterministic translate jitter
  // (`shake`-family), or an overlay paint inside the clip rect
  // (`fx.overlays`). New entries here MUST get a render branch in
  // animation.ts and use-export.ts or they're no-ops.
  | "vignetteSoft" | "vignetteHard" | "vignetteOval" | "vignetteCorner"
  | "glowWarm" | "glowCool" | "glowPulse"
  | "shakeHeavy" | "shakeSubtle" | "shakeVertical" | "shakeHorizontal"
  | "scanlinesThick" | "scanlinesVertical" | "scanlinesCRT"
  | "tintWarm" | "tintCool" | "tintSepia" | "tintDuotone"
  | "blurSoft" | "blurHeavy" | "blurMotion"
  | "chromaticAberration"
  | "pixelate" | "pixelateHeavy"
  | "glitch" | "glitchHeavy"
  | "noise" | "filmGrain" | "filmGrainHeavy"
  | "halftone"
  | "posterize" | "posterizeHeavy"
  | "invert"
  | "grayscale" | "grayscaleSoft"
  | "sepia"
  | "saturate" | "desaturate"
  | "brightness" | "darkness"
  | "contrast" | "lowContrast"
  | "hueRotate" | "hueShift90" | "hueShift180"
  | "kaleidoscope"
  | "mirrorH" | "mirrorV"
  | "edgeDetect"
  | "emboss"
  | "vintage" | "lomo" | "polaroid"
  | "neon" | "cyberpunk"
  | "matrixGreen" | "horror" | "dreamy" | "underwater";

export interface Effect {
  id: string;
  type: EffectType;
  intensity: number; // 0..1
  color?: string;    // used by tint / glow
}

export type TransitionType =
  // Original 9 — keep stable for back-compat with saved projects.
  | "none"
  | "fade"
  | "slideLeft"
  | "slideRight"
  | "slideUp"
  | "slideDown"
  | "zoom"
  | "blur"
  | "wipeLeft"
  // Phase-2 expansion — implemented in animation.ts → getTransitionMod.
  // Many are direction/parameter variants on a few shared mechanics
  // (slide, wipe, push, zoom, blur, spin, bounce). All return a
  // TransitionMod the export and preview both consume — never an animated
  // texture lookup, so they degrade gracefully with no extra assets.
  | "slideUpLeft" | "slideUpRight" | "slideDownLeft" | "slideDownRight"
  | "wipeRight" | "wipeUp" | "wipeDown"
  | "wipeDiagonalDown" | "wipeDiagonalUp"
  | "irisIn" | "irisOut"
  | "circleIn" | "circleOut"
  | "pushLeft" | "pushRight" | "pushUp" | "pushDown"
  | "zoomIn" | "zoomOut" | "zoomBlur"
  | "spin" | "spinReverse" | "spinZoom"
  | "blurHeavy" | "blurSlide"
  | "fadeBlack" | "fadeWhite" | "fadeColor"
  | "flash" | "flashColor"
  | "shakeCut"
  | "tvOff" | "tvOn"
  | "glitchCut"
  | "barnDoorH" | "barnDoorV"
  | "splitH" | "splitV"
  | "checkerboard"
  | "pixelDissolve"
  | "ripple"
  | "swirl"
  | "filmBurn"
  | "lightLeak"
  | "morph"
  | "dropDown" | "popUp"
  | "swing"
  | "elastic";

export interface ClipTransition {
  type: TransitionType;
  duration: number;
}

/**
 * Solid color or gradient fill — used by shape clips and (eventually) by
 * any future feature that wants a paintable area. Solid is `{ kind:
 * "solid", color }`; gradients store stops as `[offset(0..1), color]`
 * pairs and an angle in degrees (0 = bottom→top, 90 = left→right) for
 * linear or center+radius for radial. Renderer turns this into either a
 * CSS background string (preview) or a CanvasGradient (export).
 */
export type Fill =
  | { kind: "solid"; color: string }
  | { kind: "linear"; angle: number; stops: [number, string][] }
  | { kind: "radial"; cx: number; cy: number; r: number; stops: [number, string][] };

export type MaskMode = "luminance" | "alpha";

export interface ClipMask {
  src: string;          // image URL (data: URLs supported)
  mode: MaskMode;       // luminance = use grayscale (B/W gradients), alpha = use transparency
  invert: boolean;      // invert mask values
  fit: "stretch" | "contain" | "cover";
  scale: number;        // 0.1..3 (multiplier on top of fit)
  offsetX: number;      // -1..1 (fraction of clip width)
  offsetY: number;      // -1..1 (fraction of clip height)
  opacity: number;      // 0..1 — blends mask result with full opacity
}

export interface Clip {
  id: string;
  label: string;
  mediaType: MediaType;
  trackIndex: number;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  src?: string;
  thumbnail?: string;
  text?: string;
  textStyle?: TextStyle;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  rotation: number;
  scale: number;
  flipH: boolean;
  flipV: boolean;
  blendMode: string;
  borderRadius: number;
  preserveRatio: boolean;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  filters: ClipFilters;
  speed: number;
  animationIn: string;
  animationOut: string;
  animationInDuration: number;
  animationOutDuration: number;
  volume: number;
  muted: boolean;
  locked: boolean;
  hidden: boolean;
  color: string;
  // CapCut-style additions (optional for backward compatibility with older state)
  effects?: Effect[];
  transitionIn?: ClipTransition;
  mask?: ClipMask;
  // Text-only: when true (default), font scales with the clip box (current behavior).
  // When false, font stays at a fixed size relative to the canvas — only the box scales.
  textAutoScale?: boolean;
  // Video/image: per-clip green-screen / chroma key.
  chromaKey?: ChromaKey;
  // logoBlur clip type: blur radius in canvas-relative pixels (relative to a
  // 1080-px-wide canvas, scales with output size on export).
  blurAmount?: number;
  // maskLayer clip type: limit how many tracks BELOW this mask layer are
  // affected by it. 0 or undefined = all tracks below (current behavior).
  // 1 = only the immediately-lower track, 2 = next two, etc. Lets users
  // build per-clip cutouts without affecting unrelated tracks.
  maskAffectsTracksBelow?: number;
  // shape clip type: which shape kind from `shape-library.ts` to draw, plus
  // an optional gradient fill (defaults to solid `clip.color` when absent).
  // `strokeColor` + `strokeWidth` add an outline (strokeWidth in canvas-px
  // relative to a 1080-wide canvas, so it scales on export).
  shapeKind?: string;
  fill?: Fill;
  strokeColor?: string;
  strokeWidth?: number;
  // specialLayer clip type: which preset from `special-layers.ts` to render.
  // Optional `intensity` (0..1) and `color` overrides let users tune the
  // overlay without touching the preset definition.
  specialKind?: string;
  specialIntensity?: number;
  specialColor?: string;
}

export interface Transition {
  id: string;
  fromClipId: string;
  toClipId: string;
  type: string;
  duration: number;
}

export interface Keyframe {
  id: string;
  clipId: string;
  time: number;
  property: string;
  value: number;
  easing: EasingType;
}

export interface Track {
  id: string;
  name: string;
  type: "video" | "audio" | "overlay";
  muted: boolean;
  hidden: boolean;
  locked: boolean;
}

export interface MediaAsset {
  id: string;
  name: string;
  src: string;
  mediaType: MediaType;
  duration?: number;
  thumbnail?: string;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

export type ToolMode = "select" | "blade";

export interface Marker {
  id: string;
  time: number;
  label?: string;
  color?: string;
}

export interface EditorState {
  clips: Clip[];
  transitions: Transition[];
  keyframes: Keyframe[];
  tracks: Track[];
  assets: MediaAsset[];
  markers: Marker[];
  canvasWidth: number;
  canvasHeight: number;
  duration: number;
  selectedClipIds: string[];
  currentTime: number;
  isPlaying: boolean;
  zoom: number;
  snapEnabled: boolean;
  tool: ToolMode;
  aiHistory: AIMessage[];
  background: string;
}

export interface HistoryEntry {
  past: EditorState[];
  future: EditorState[];
}

export type EditorAction =
  | { type: "SET_TIME"; payload: number }
  | { type: "TOGGLE_PLAY" }
  | { type: "SET_PLAYING"; payload: boolean }
  | { type: "SELECT_CLIP"; payload: string | null }
  | { type: "SELECT_CLIPS"; payload: string[] }
  | { type: "TOGGLE_CLIP_SELECTION"; payload: string }
  | { type: "UPDATE_CLIP"; payload: { id: string; updates: Partial<Clip> } }
  | { type: "UPDATE_CLIPS"; payload: { ids: string[]; updates: Partial<Clip> } }
  | { type: "ADD_CLIP"; payload: Clip }
  | { type: "DELETE_CLIP"; payload: string }
  | { type: "DELETE_CLIPS"; payload: string[] }
  | { type: "DUPLICATE_CLIP"; payload: string }
  | { type: "SPLIT_CLIP"; payload: { clipId: string; time: number } }
  | { type: "SPLIT_AT_PLAYHEAD" }
  | { type: "ADD_TRACK"; payload?: { type?: Track["type"]; name?: string } }
  | { type: "DELETE_TRACK"; payload: string }
  | { type: "UPDATE_TRACK"; payload: { id: string; updates: Partial<Track> } }
  | { type: "SET_DURATION"; payload: number }
  | { type: "SET_CANVAS_SIZE"; payload: { width: number; height: number } }
  | { type: "SET_ZOOM"; payload: number }
  | { type: "TOGGLE_SNAP" }
  | { type: "SET_BACKGROUND"; payload: string }
  | { type: "ADD_KEYFRAME"; payload: Omit<Keyframe, "id"> & { id?: string } }
  | { type: "UPDATE_KEYFRAME"; payload: { id: string; time?: number; value?: number; easing?: EasingType } }
  | { type: "DELETE_KEYFRAME"; payload: string }
  | { type: "DELETE_KEYFRAMES_AT"; payload: { clipId: string; time: number } }
  | { type: "ADD_TRANSITION"; payload: Omit<Transition, "id"> & { id?: string } }
  | { type: "DELETE_TRANSITION"; payload: string }
  | { type: "ADD_ASSET"; payload: MediaAsset }
  | { type: "REMOVE_ASSET"; payload: string }
  | { type: "ADD_AI_MESSAGE"; payload: AIMessage }
  | { type: "SET_TOOL"; payload: ToolMode }
  | { type: "ADD_MARKER"; payload: { time: number; label?: string; color?: string } }
  | { type: "DELETE_MARKER"; payload: string }
  | { type: "CLEAR_MARKERS" }
  | { type: "SPLIT_INTO_PARTS"; payload: { clipId: string; parts: number } }
  | { type: "SPLIT_EVERY"; payload: { clipId: string; seconds: number } }
  | { type: "RIPPLE_DELETE"; payload: string }
  | { type: "APPLY_OPERATIONS"; payload: any[] }
  | { type: "REPLACE_STATE"; payload: EditorState }
  | { type: "APPLY_TEMPLATE"; payload: { templateKey: string } }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RESET" };

export const DEFAULT_FILTERS: ClipFilters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0,
};

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 64,
  fontWeight: 700,
  color: "#ffffff",
  background: "transparent",
  align: "center",
  shadow: true,
  italic: false,
  underline: false,
  letterSpacing: 0,
  lineHeight: 1.1,
  curve: 0,
};

/**
 * Curated list of font families. Google Fonts are loaded via a stylesheet
 * link in `index.html`; system fonts fall back to platform defaults.
 */
export interface FontOption {
  label: string;
  /** CSS font-family value (with appropriate fallbacks). */
  value: string;
  /** "google" → loaded from Google Fonts; "system" → already available. */
  source: "google" | "system";
  /** Display category for grouping in the picker. */
  category: "Sans" | "Serif" | "Display" | "Mono" | "Handwriting";
}

export const FONT_OPTIONS: FontOption[] = [
  // ── Sans (16) ───────────────────────────────────────────────────────────
  { label: "Inter", value: "Inter, system-ui, sans-serif", source: "google", category: "Sans" },
  { label: "Poppins", value: "Poppins, sans-serif", source: "google", category: "Sans" },
  { label: "Montserrat", value: "Montserrat, sans-serif", source: "google", category: "Sans" },
  { label: "Bebas Neue", value: "'Bebas Neue', sans-serif", source: "google", category: "Sans" },
  { label: "Oswald", value: "Oswald, sans-serif", source: "google", category: "Sans" },
  { label: "Anton", value: "Anton, sans-serif", source: "google", category: "Sans" },
  { label: "Archivo Black", value: "'Archivo Black', sans-serif", source: "google", category: "Sans" },
  { label: "Roboto", value: "Roboto, sans-serif", source: "google", category: "Sans" },
  { label: "Open Sans", value: "'Open Sans', sans-serif", source: "google", category: "Sans" },
  { label: "Lato", value: "Lato, sans-serif", source: "google", category: "Sans" },
  { label: "Raleway", value: "Raleway, sans-serif", source: "google", category: "Sans" },
  { label: "Work Sans", value: "'Work Sans', sans-serif", source: "google", category: "Sans" },
  { label: "Nunito", value: "Nunito, sans-serif", source: "google", category: "Sans" },
  { label: "Barlow", value: "Barlow, sans-serif", source: "google", category: "Sans" },
  { label: "Manrope", value: "Manrope, sans-serif", source: "google", category: "Sans" },
  { label: "DM Sans", value: "'DM Sans', sans-serif", source: "google", category: "Sans" },
  // ── Serif (10) ──────────────────────────────────────────────────────────
  { label: "Playfair Display", value: "'Playfair Display', serif", source: "google", category: "Serif" },
  { label: "Merriweather", value: "Merriweather, serif", source: "google", category: "Serif" },
  { label: "Lora", value: "Lora, serif", source: "google", category: "Serif" },
  { label: "Cormorant Garamond", value: "'Cormorant Garamond', serif", source: "google", category: "Serif" },
  { label: "EB Garamond", value: "'EB Garamond', serif", source: "google", category: "Serif" },
  { label: "Crimson Pro", value: "'Crimson Pro', serif", source: "google", category: "Serif" },
  { label: "Source Serif Pro", value: "'Source Serif Pro', serif", source: "google", category: "Serif" },
  { label: "Bitter", value: "Bitter, serif", source: "google", category: "Serif" },
  { label: "Roboto Slab", value: "'Roboto Slab', serif", source: "google", category: "Serif" },
  { label: "DM Serif Display", value: "'DM Serif Display', serif", source: "google", category: "Serif" },
  // ── Display (12) ────────────────────────────────────────────────────────
  { label: "Bungee", value: "Bungee, cursive", source: "google", category: "Display" },
  { label: "Press Start 2P", value: "'Press Start 2P', cursive", source: "google", category: "Display" },
  { label: "Monoton", value: "Monoton, cursive", source: "google", category: "Display" },
  { label: "Black Ops One", value: "'Black Ops One', cursive", source: "google", category: "Display" },
  { label: "Faster One", value: "'Faster One', cursive", source: "google", category: "Display" },
  { label: "Rubik Mono One", value: "'Rubik Mono One', sans-serif", source: "google", category: "Display" },
  { label: "Audiowide", value: "Audiowide, cursive", source: "google", category: "Display" },
  { label: "Bowlby One", value: "'Bowlby One', cursive", source: "google", category: "Display" },
  { label: "Russo One", value: "'Russo One', sans-serif", source: "google", category: "Display" },
  { label: "Righteous", value: "Righteous, cursive", source: "google", category: "Display" },
  { label: "Bungee Shade", value: "'Bungee Shade', cursive", source: "google", category: "Display" },
  { label: "Stardos Stencil", value: "'Stardos Stencil', cursive", source: "google", category: "Display" },
  // ── Handwriting (8) ─────────────────────────────────────────────────────
  { label: "Pacifico", value: "Pacifico, cursive", source: "google", category: "Handwriting" },
  { label: "Dancing Script", value: "'Dancing Script', cursive", source: "google", category: "Handwriting" },
  { label: "Caveat", value: "Caveat, cursive", source: "google", category: "Handwriting" },
  { label: "Permanent Marker", value: "'Permanent Marker', cursive", source: "google", category: "Handwriting" },
  { label: "Satisfy", value: "Satisfy, cursive", source: "google", category: "Handwriting" },
  { label: "Kalam", value: "Kalam, cursive", source: "google", category: "Handwriting" },
  { label: "Shadows Into Light", value: "'Shadows Into Light', cursive", source: "google", category: "Handwriting" },
  { label: "Indie Flower", value: "'Indie Flower', cursive", source: "google", category: "Handwriting" },
  // ── Mono (6) ────────────────────────────────────────────────────────────
  { label: "JetBrains Mono", value: "'JetBrains Mono', monospace", source: "google", category: "Mono" },
  { label: "Fira Code", value: "'Fira Code', monospace", source: "google", category: "Mono" },
  { label: "Source Code Pro", value: "'Source Code Pro', monospace", source: "google", category: "Mono" },
  { label: "IBM Plex Mono", value: "'IBM Plex Mono', monospace", source: "google", category: "Mono" },
  { label: "Space Mono", value: "'Space Mono', monospace", source: "google", category: "Mono" },
  { label: "Inconsolata", value: "Inconsolata, monospace", source: "google", category: "Mono" },
];
