/**
 * AI Control Schema — a single export consumed by the AI assistant bar so
 * the language model has a complete, machine-readable picture of every
 * library, action and clip property it can mutate. The schema is built at
 * import time from the canonical libraries (no duplication) so adding a new
 * effect, transition, shape, special layer or template automatically shows
 * up in the AI's vocabulary.
 *
 * The shape of the exported `AI_SCHEMA` is deliberately flat and JSON-
 * friendly so it can be JSON.stringify'd into a system prompt as-is.
 */

import { EFFECT_LIBRARY, EFFECT_CATEGORIES } from "./effect-library";
import { TRANSITION_LIBRARY, TRANSITION_CATEGORIES } from "./transition-library";
import { SHAPE_LIBRARY } from "./shape-library";
import { SPECIAL_LAYERS as SPECIAL_LAYER_LIBRARY } from "./special-layers";
import { TEMPLATES } from "./templates";
import { FONT_OPTIONS } from "./types";

export interface AISchemaLibraryEntry {
  key: string;
  label: string;
  category?: string;
}

export interface AISchemaActionParam {
  name: string;
  /** TypeScript-ish type hint — `"string" | "number" | "boolean" | "Clip"
   * | "Partial<Clip>" | "EditorState"` etc. */
  type: string;
  required: boolean;
  description: string;
}

export interface AISchemaAction {
  type: string;
  description: string;
  params: AISchemaActionParam[];
}

/**
 * Reducer actions exposed to the AI. Mirror this with `lib/reducer.ts` —
 * adding a new action there should add it here too. Keep names stable;
 * the model is trained to use the exact strings.
 */
export const AI_ACTIONS: AISchemaAction[] = [
  {
    type: "ADD_CLIP",
    description: "Add a new clip to the timeline.",
    params: [
      { name: "clip", type: "Clip", required: true, description: "Full clip object — use makeClip() defaults then override." },
    ],
  },
  {
    type: "REMOVE_CLIP",
    description: "Delete a clip from the timeline.",
    params: [
      { name: "clipId", type: "string", required: true, description: "id of the clip to remove" },
    ],
  },
  {
    type: "UPDATE_CLIP",
    description: "Patch one or more properties on an existing clip.",
    params: [
      { name: "id", type: "string", required: true, description: "id of the clip to update" },
      { name: "patch", type: "Partial<Clip>", required: true, description: "Object containing only the fields to change." },
    ],
  },
  {
    type: "SELECT_CLIP",
    description: "Mark a clip as selected (drives the inspector panel).",
    params: [
      { name: "clipId", type: "string|null", required: true, description: "Clip id, or null to clear selection." },
    ],
  },
  {
    type: "ADD_EFFECT",
    description: "Add an effect to a clip's effects list.",
    params: [
      { name: "clipId", type: "string", required: true, description: "Target clip id" },
      { name: "effect", type: "Effect", required: true, description: "{ id, type, intensity, color? }" },
    ],
  },
  {
    type: "UPDATE_EFFECT",
    description: "Update one effect on a clip.",
    params: [
      { name: "clipId", type: "string", required: true, description: "Target clip id" },
      { name: "effectId", type: "string", required: true, description: "Effect id (Effect.id)" },
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
    description: "Set the incoming transition for a clip.",
    params: [
      { name: "clipId", type: "string", required: true, description: "Target clip id" },
      { name: "transition", type: "ClipTransition", required: true, description: "{ type, duration }" },
    ],
  },
  {
    type: "APPLY_TEMPLATE",
    description: "Replace the current timeline with a built-in template.",
    params: [
      { name: "templateKey", type: "string", required: true, description: `One of: ${TEMPLATES.map((t) => t.key).join(", ")}` },
    ],
  },
  {
    type: "ADD_KEYFRAME",
    description: "Insert a keyframe at the current time for a numeric property.",
    params: [
      { name: "clipId", type: "string", required: true, description: "Target clip id" },
      { name: "property", type: "string", required: true, description: "Property name: x, y, width, height, opacity, rotation, scale, etc." },
      { name: "time", type: "number", required: true, description: "Absolute time in seconds." },
      { name: "value", type: "number", required: true, description: "Numeric value at this time." },
      { name: "easing", type: "EasingType", required: false, description: "linear|easeIn|easeOut|easeInOut" },
    ],
  },
];

/** All available libraries flattened to (key, label, category) tuples. */
export const AI_SCHEMA = {
  version: 2,
  generatedAt: 0, // filled at runtime so tests can be deterministic
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
    templates: TEMPLATES.map<AISchemaLibraryEntry>((t) => ({
      key: t.key,
      label: t.name,
    })),
    fonts: FONT_OPTIONS.map((f) => f.value),
  },
  /** Subset of fields the AI is allowed to mutate via UPDATE_CLIP. Helps
   * avoid the model trying to write reserved fields like `id`. */
  clipMutableFields: [
    "label", "x", "y", "width", "height",
    "opacity", "rotation", "scale", "flipH", "flipV",
    "blendMode", "borderRadius", "preserveRatio",
    "cropX", "cropY", "cropWidth", "cropHeight",
    "filters", "speed", "color",
    "text", "textStyle", "textAutoScale",
    "animationIn", "animationOut",
    "animationInDuration", "animationOutDuration",
    "volume", "muted", "locked", "hidden",
    "effects", "transitionIn", "mask",
    "chromaKey", "blurAmount", "maskAffectsTracksBelow",
    "shapeKind", "fill", "strokeColor", "strokeWidth",
    "specialKind", "specialIntensity", "specialColor",
  ],
  actions: AI_ACTIONS,
};

/** Build a freshly-stamped copy of the schema. Useful when serializing into
 * a prompt so timestamps don't bake into module init. */
export function buildAiSchema() {
  return { ...AI_SCHEMA, generatedAt: Date.now() };
}

/** A compact human-readable Markdown summary of the schema, suitable for
 * dropping into the AI's system prompt. Generated lazily because it's
 * fairly large. */
export function buildAiSchemaMarkdown(): string {
  const lines: string[] = [];
  lines.push("# AI Control Schema");
  lines.push("");
  lines.push(`## Effects (${EFFECT_LIBRARY.length})`);
  for (const cat of EFFECT_CATEGORIES) {
    const items = EFFECT_LIBRARY.filter((e) => e.category === cat);
    if (items.length === 0) continue;
    lines.push(`### ${cat}`);
    lines.push(items.map((e) => `\`${e.type}\` — ${e.label}`).join(", "));
  }
  lines.push("");
  lines.push(`## Transitions (${TRANSITION_LIBRARY.length})`);
  for (const cat of TRANSITION_CATEGORIES) {
    const items = TRANSITION_LIBRARY.filter((t) => t.category === cat);
    if (items.length === 0) continue;
    lines.push(`### ${cat}`);
    lines.push(items.map((t) => `\`${t.type}\` — ${t.label}`).join(", "));
  }
  lines.push("");
  lines.push(`## Shapes (${SHAPE_LIBRARY.length}): ${SHAPE_LIBRARY.map((s) => s.key).join(", ")}`);
  lines.push(`## Special Layers (${SPECIAL_LAYER_LIBRARY.length}): ${SPECIAL_LAYER_LIBRARY.map((s) => s.key).join(", ")}`);
  lines.push(`## Templates (${TEMPLATES.length}): ${TEMPLATES.map((t) => t.key).join(", ")}`);
  lines.push(`## Fonts (${FONT_OPTIONS.length}): ${FONT_OPTIONS.map((f) => f.value).join(", ")}`);
  lines.push("");
  lines.push(`## Reducer actions (${AI_ACTIONS.length})`);
  for (const a of AI_ACTIONS) {
    lines.push(`- \`${a.type}\` — ${a.description}`);
  }
  return lines.join("\n");
}
