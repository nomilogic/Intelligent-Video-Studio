/**
 * AI Control Schema — single source of truth consumed by the AI bar.
 * Every library, action, and mutable clip field is declared here so the
 * language model has a complete, machine-readable vocabulary.
 */

import { EFFECT_LIBRARY, EFFECT_CATEGORIES } from "./effect-library";
import { TRANSITION_LIBRARY, TRANSITION_CATEGORIES } from "./transition-library";
import { TRANSITION_PRESETS, TRANSITION_PRESET_CATEGORIES } from "./transition-presets";
import { SHAPE_LIBRARY } from "./shape-library";
import { SPECIAL_LAYERS as SPECIAL_LAYER_LIBRARY } from "./special-layers";
import { PARTICLE_LIBRARY } from "./particles";
import { TEMPLATES } from "./templates";
import { WAVE_LIBRARY } from "./waves";
import { FONT_OPTIONS } from "./types";
import { ANIMATED_MASK_PRESETS, ANIMATED_MASK_CATEGORIES } from "./mask-animations";

export interface AISchemaLibraryEntry {
  key: string;
  label: string;
  category?: string;
}

export interface AISchemaActionParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface AISchemaAction {
  type: string;
  description: string;
  params: AISchemaActionParam[];
}

export const AI_ACTIONS: AISchemaAction[] = [
  {
    type: "ADD_CLIP",
    description: "Add a new clip to the timeline. Set mediaType to one of: video, image, text, audio, blank, colorBlock, particles, wave, gradient, visualizer, shape, specialLayer, drawing, maskLayer, logoBlur.",
    params: [
      { name: "clip", type: "Clip", required: true, description: "Full clip object. Required: id (unique string starting 'clip-'), label, mediaType, trackIndex, startTime, duration, x, y, width, height." },
    ],
  },
  {
    type: "UPDATE_CLIP",
    description: "Patch one or more properties on an existing clip. Only include the fields to change.",
    params: [
      { name: "id", type: "string", required: true, description: "id of the clip to update (from current state)" },
      { name: "updates", type: "Partial<Clip>", required: true, description: "Object containing only the fields to change." },
    ],
  },
  {
    type: "DELETE_CLIP",
    description: "Delete a single clip from the timeline.",
    params: [
      { name: "payload", type: "string", required: true, description: "The clip id to delete." },
    ],
  },
  {
    type: "DELETE_CLIPS",
    description: "Delete multiple clips at once.",
    params: [
      { name: "payload", type: "string[]", required: true, description: "Array of clip ids to delete." },
    ],
  },
  {
    type: "DUPLICATE_CLIP",
    description: "Duplicate a clip (creates an offset copy).",
    params: [
      { name: "payload", type: "string", required: true, description: "Clip id to duplicate." },
    ],
  },
  {
    type: "SELECT_CLIP",
    description: "Mark a clip as selected (drives the inspector panel).",
    params: [
      { name: "payload", type: "string|null", required: true, description: "Clip id, or null to clear selection." },
    ],
  },
  {
    type: "SPLIT_CLIP",
    description: "Split a clip at a given time position into two clips.",
    params: [
      { name: "clipId", type: "string", required: true, description: "Target clip id" },
      { name: "time", type: "number", required: true, description: "Absolute time in seconds at which to split." },
    ],
  },
  {
    type: "RIPPLE_DELETE",
    description: "Delete a clip and shift all later clips on the same track left to close the gap.",
    params: [
      { name: "payload", type: "string", required: true, description: "Clip id to ripple-delete." },
    ],
  },
  {
    type: "ADD_EFFECT",
    description: "Add a visual effect to a clip's effects stack.",
    params: [
      { name: "clipId", type: "string", required: true, description: "Target clip id" },
      { name: "effect", type: "Effect", required: true, description: "{ id (unique), type (from effect library), intensity (0-1), color? }" },
    ],
  },
  {
    type: "UPDATE_EFFECT",
    description: "Update one effect on a clip.",
    params: [
      { name: "clipId", type: "string", required: true, description: "Target clip id" },
      { name: "effectId", type: "string", required: true, description: "Effect id" },
      { name: "patch", type: "Partial<Effect>", required: true, description: "Fields to change." },
    ],
  },
  {
    type: "REMOVE_EFFECT",
    description: "Remove an effect from a clip.",
    params: [
      { name: "clipId", type: "string", required: true, description: "Target clip id" },
      { name: "effectId", type: "string", required: true, description: "Effect id" },
    ],
  },
  {
    type: "SET_TRANSITION",
    description: "Set the incoming transition for a clip (plays at clip start).",
    params: [
      { name: "clipId", type: "string", required: true, description: "Target clip id" },
      { name: "transition", type: "ClipTransition", required: true, description: "{ type: string, duration: number } OR { type: 'param', duration, presetKey: string } for a parametric preset." },
    ],
  },
  {
    type: "ADD_KEYFRAME",
    description: "Insert a keyframe at a specific time for a numeric property (enables animation).",
    params: [
      { name: "clipId", type: "string", required: true, description: "Target clip id" },
      { name: "property", type: "string", required: true, description: "Property to animate: x, y, width, height, opacity, rotation, scale, etc." },
      { name: "time", type: "number", required: true, description: "Absolute time in seconds." },
      { name: "value", type: "number", required: true, description: "Numeric value at this keyframe." },
      { name: "easing", type: "EasingType", required: false, description: "linear | quadIn | quadOut | quadInOut | cubicIn | cubicOut | cubicInOut | elasticOut | bounceOut | backInOut" },
    ],
  },
  {
    type: "APPLY_TEMPLATE",
    description: "Replace the timeline with a built-in template.",
    params: [
      { name: "templateKey", type: "string", required: true, description: `One of: ${TEMPLATES.slice(0, 20).map((t) => t.key).join(", ")} … (${TEMPLATES.length} total)` },
    ],
  },
  {
    type: "ADD_TRACK",
    description: "Add a new empty track lane to the timeline.",
    params: [
      { name: "name", type: "string", required: false, description: "Optional track label." },
    ],
  },
  {
    type: "SET_DURATION",
    description: "Set the total project duration in seconds.",
    params: [
      { name: "payload", type: "number", required: true, description: "New duration in seconds." },
    ],
  },
  {
    type: "SET_CANVAS_SIZE",
    description: "Change the canvas resolution / aspect ratio.",
    params: [
      { name: "width", type: "number", required: true, description: "Canvas width in pixels." },
      { name: "height", type: "number", required: true, description: "Canvas height in pixels." },
    ],
  },
];

export const AI_SCHEMA = {
  version: 3,
  generatedAt: 0,
  libraries: {
    effects: EFFECT_LIBRARY.map<AISchemaLibraryEntry>((e) => ({
      key: e.type,
      label: e.label,
      category: e.category,
    })),
    effectCategories: EFFECT_CATEGORIES,
    transitions: TRANSITION_LIBRARY.map<AISchemaLibraryEntry>((t) => ({
      key: t.type,
      label: t.label,
      category: t.category,
    })),
    transitionCategories: TRANSITION_CATEGORIES,
    transitionPresets: TRANSITION_PRESETS.map<AISchemaLibraryEntry>((p) => ({
      key: p.key,
      label: p.label,
      category: p.category,
    })),
    transitionPresetCategories: TRANSITION_PRESET_CATEGORIES,
    shapes: SHAPE_LIBRARY.map<AISchemaLibraryEntry>((s) => ({
      key: s.key,
      label: s.name,
      category: s.category,
    })),
    specialLayers: SPECIAL_LAYER_LIBRARY.map<AISchemaLibraryEntry>((s) => ({
      key: s.key,
      label: s.name,
      category: s.category,
    })),
    particles: PARTICLE_LIBRARY.map<AISchemaLibraryEntry>((p) => ({
      key: p.key,
      label: p.label,
    })),
    waves: WAVE_LIBRARY.map<AISchemaLibraryEntry>((w) => ({
      key: w.key,
      label: w.label,
    })),
    animatedMasks: ANIMATED_MASK_PRESETS.slice(0, 100).map<AISchemaLibraryEntry>((m) => ({
      key: m.key,
      label: m.name,
      category: m.category,
    })),
    animatedMaskCategories: ANIMATED_MASK_CATEGORIES,
    templates: TEMPLATES.map<AISchemaLibraryEntry>((t) => ({
      key: t.key,
      label: t.name,
    })),
    fonts: FONT_OPTIONS.map((f) => f.value),
  },
  clipMutableFields: [
    // Transform
    "label", "x", "y", "width", "height",
    "opacity", "rotation", "scale", "flipH", "flipV",
    "blendMode", "borderRadius", "preserveRatio",
    // Crop / Visual
    "cropX", "cropY", "cropWidth", "cropHeight",
    "filters", "speed", "color",
    // Text
    "text", "textStyle", "textAutoScale",
    // Animations
    "animationIn", "animationOut",
    "animationInDuration", "animationOutDuration",
    // Audio
    "volume", "muted",
    // State
    "locked", "hidden",
    // Effects / Mask / Chroma
    "effects", "transitionIn", "mask", "animatedMask",
    "chromaKey", "blurAmount", "maskAffectsTracksBelow",
    // Shapes
    "shapeKind", "fill", "strokeColor", "strokeWidth",
    // Special Layers
    "specialKind", "specialIntensity", "specialColor",
    // Particles
    "particleKind", "particleCount", "particleSize", "particleSpeed",
    "particleColor", "particleColor2", "particleOpacity", "particleSpread",
    "particleDirection", "particleGravity", "particleTwinkle",
    // Waves
    "waveKind", "waveColor", "waveColor2", "waveAmplitude", "waveFrequency",
    "waveSpeed", "waveOpacity",
    // Gradients
    "gradientKind", "gradientStops", "gradientAngle",
    // Visualizers
    "visualizerKind", "visualizerColor", "visualizerBarCount",
    // Timing (advanced)
    "startTime", "duration", "trimStart", "trimEnd", "trackIndex",
  ],
  actions: AI_ACTIONS,
};

export function buildAiSchema() {
  return { ...AI_SCHEMA, generatedAt: Date.now() };
}

export function buildAiSchemaMarkdown(): string {
  const lines: string[] = [];
  lines.push("# AI Video Editor — Full Control Schema");
  lines.push("");
  lines.push("You are the AI engine of a professional browser-based video editor.");
  lines.push("You control every aspect of the timeline, canvas, and clips via JSON operations.");
  lines.push("");

  // ── Media types ──────────────────────────────────────────────────────────
  lines.push("## Clip mediaType values");
  lines.push("`video` `image` `text` `audio` `blank` `particles` `wave` `gradient` `visualizer` `shape` `specialLayer` `drawing` `maskLayer` `logoBlur`");
  lines.push("");

  // ── Effects ─────────────────────────────────────────────────────────────
  lines.push(`## Effects library (${EFFECT_LIBRARY.length} effects)`);
  lines.push("Add via ADD_EFFECT. Set `type` to one of:");
  for (const cat of EFFECT_CATEGORIES) {
    const items = EFFECT_LIBRARY.filter((e) => e.category === cat);
    if (items.length === 0) continue;
    lines.push(`**${cat}**: ${items.map((e) => `\`${e.type}\``).join(", ")}`);
  }
  lines.push("");

  // ── Transitions ──────────────────────────────────────────────────────────
  lines.push(`## Transitions (${TRANSITION_LIBRARY.length} standard + ${TRANSITION_PRESETS.length} presets)`);
  lines.push("Standard: " + TRANSITION_LIBRARY.map((t) => `\`${t.type}\``).join(", "));
  lines.push(`Parametric presets (use \`type:"param", presetKey\`): categories — ${TRANSITION_PRESET_CATEGORIES.join(", ")}`);
  lines.push("Sample presets: " + TRANSITION_PRESETS.slice(0, 20).map((p) => `\`${p.key}\``).join(", ") + " …");
  lines.push("");

  // ── Shapes ───────────────────────────────────────────────────────────────
  lines.push(`## Shape Library (${SHAPE_LIBRARY.length} shapes)`);
  const shapeCategories = [...new Set(SHAPE_LIBRARY.map((s) => s.category))];
  for (const cat of shapeCategories) {
    const items = SHAPE_LIBRARY.filter((s) => s.category === cat);
    lines.push(`**${cat}**: ${items.map((s) => `\`${s.key}\``).join(", ")}`);
  }
  lines.push("Shape clip: `mediaType:\"shape\"`, `shapeKind`, `fill` (solid/linear/radial gradient), `strokeColor`, `strokeWidth`");
  lines.push("");

  // ── Special Layers ────────────────────────────────────────────────────────
  lines.push(`## Special Layers / Overlays (${SPECIAL_LAYER_LIBRARY.length})`);
  lines.push("Use `mediaType:\"specialLayer\"`, set `specialKind`. Tune `specialIntensity` (0-1) and `specialColor`.");
  lines.push("Keys: " + SPECIAL_LAYER_LIBRARY.map((s) => `\`${s.key}\``).join(", "));
  lines.push("");

  // ── Particles ────────────────────────────────────────────────────────────
  lines.push(`## Particle Overlays (${PARTICLE_LIBRARY.length})`);
  lines.push(`Use \`mediaType:"particles"\`, set \`particleKind\`. Keys: ${PARTICLE_LIBRARY.map((p) => `\`${p.key}\``).join(", ")}`);
  lines.push("Tunable: `particleCount` (10-500), `particleSize` (0-1), `particleSpeed` (0-1), `particleColor`, `particleColor2`, `particleOpacity` (0-1), `particleSpread` (0-1), `particleDirection` (0-360°), `particleGravity` (-1 to 1), `particleTwinkle` (bool)");
  lines.push("");

  // ── Waves ────────────────────────────────────────────────────────────────
  lines.push(`## Wave Backgrounds (${WAVE_LIBRARY.length})`);
  lines.push(`Use \`mediaType:"wave"\`, set \`waveKind\`. Keys: ${WAVE_LIBRARY.map((w) => `\`${w.key}\``).join(", ")}`);
  lines.push("Tunable: `waveColor`, `waveColor2`, `waveAmplitude` (0-1), `waveFrequency` (0-1), `waveSpeed` (0-1), `waveOpacity` (0-1)");
  lines.push("");

  // ── Animated Masks ───────────────────────────────────────────────────────
  lines.push(`## Animated CSS Masks (${ANIMATED_MASK_PRESETS.length} presets)`);
  lines.push(`Set \`animatedMask\` on any clip. Categories: ${ANIMATED_MASK_CATEGORIES.join(", ")}`);
  lines.push("Sample keys: " + ANIMATED_MASK_PRESETS.slice(0, 15).map((m) => `\`${m.key}\``).join(", ") + " …");
  lines.push("");

  // ── Fonts ────────────────────────────────────────────────────────────────
  lines.push(`## Fonts (${FONT_OPTIONS.length})`);
  lines.push(FONT_OPTIONS.map((f) => `\`${f.value}\``).join(", "));
  lines.push("");

  // ── Templates ────────────────────────────────────────────────────────────
  lines.push(`## Templates (${TEMPLATES.length})`);
  lines.push("Apply with APPLY_TEMPLATE. Keys: " + TEMPLATES.map((t) => `\`${t.key}\``).join(", "));
  lines.push("");

  // ── Animation In/Out ─────────────────────────────────────────────────────
  lines.push("## Animation In/Out values");
  lines.push("`none` `fade` `slideLeft` `slideRight` `slideUp` `slideDown` `zoomIn` `zoomOut` `flipX` `flipY` `rotateIn` `blurIn` `bounceIn`");
  lines.push("");

  // ── Blend modes ──────────────────────────────────────────────────────────
  lines.push("## Blend modes");
  lines.push("`normal` `multiply` `screen` `overlay` `darken` `lighten` `color-dodge` `color-burn` `hard-light` `soft-light` `difference` `exclusion` `hue` `saturation` `color` `luminosity`");
  lines.push("");

  // ── Actions ──────────────────────────────────────────────────────────────
  lines.push(`## Reducer actions (${AI_ACTIONS.length})`);
  for (const a of AI_ACTIONS) {
    lines.push(`### ${a.type}`);
    lines.push(a.description);
    const params = a.params.map((p) => `  - \`${p.name}\` (${p.type}${p.required ? ", required" : ""}): ${p.description}`).join("\n");
    lines.push(params);
  }
  lines.push("");

  // ── Canvas coordinate system ─────────────────────────────────────────────
  lines.push("## Coordinate system");
  lines.push("All x/y/width/height are **0–1 fractions of the canvas** (e.g., x:0.5 = horizontal center).");
  lines.push("Canvas origin (0,0) = top-left. x:1 = right edge, y:1 = bottom edge.");
  lines.push("Clip position refers to the **top-left corner** of the clip bounding box.");
  lines.push("Common layouts: full-screen = {x:0,y:0,w:1,h:1}; lower-third = {x:0,y:0.7,w:1,h:0.15}; centered title = {x:0.05,y:0.35,w:0.9,h:0.3}");
  lines.push("");

  return lines.join("\n");
}
