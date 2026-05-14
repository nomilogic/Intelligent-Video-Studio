import type { AdjustmentSettings } from "./types";

export interface SmartPreset {
  id: string;
  label: string;
  description: string;
  emoji: string;
  category: "Cinematic" | "Color" | "Vintage" | "Mood" | "Stylized" | "Nature";
  adjustments: Partial<AdjustmentSettings>;
  suggestedEffects?: string[];
}

export const SMART_PRESETS: SmartPreset[] = [
  // ── Cinematic ─────────────────────────────────────────────────────────────
  {
    id: "cinematic-dark",
    label: "Cinematic Dark",
    description: "Deep shadows, pulled highlights — blockbuster drama",
    emoji: "🎬",
    category: "Cinematic",
    adjustments: { brightness: 88, contrast: 115, saturation: 80, highlights: -25, shadows: -15, fade: 8, vignette: 35, temperature: -8 },
  },
  {
    id: "cinematic-warm",
    label: "Cinematic Warm",
    description: "Warm golden tones with lifted blacks",
    emoji: "🌅",
    category: "Cinematic",
    adjustments: { brightness: 95, contrast: 108, saturation: 90, highlights: -10, shadows: 10, fade: 12, vignette: 20, temperature: 20 },
  },
  {
    id: "teal-orange",
    label: "Teal & Orange",
    description: "Hollywood blockbuster complementary grade",
    emoji: "🎥",
    category: "Cinematic",
    adjustments: { brightness: 95, contrast: 112, saturation: 105, temperature: 15, tint: -5, clarity: 10, vignette: 25 },
  },
  {
    id: "silver-lining",
    label: "Silver Lining",
    description: "Desaturated elegance — awards-season style",
    emoji: "🥈",
    category: "Cinematic",
    adjustments: { brightness: 100, contrast: 110, saturation: 55, highlights: -15, shadows: 5, fade: 15, vignette: 30 },
  },
  // ── Color ─────────────────────────────────────────────────────────────────
  {
    id: "vivid",
    label: "Vivid",
    description: "Maximum punch — pop art energy",
    emoji: "⚡",
    category: "Color",
    adjustments: { brightness: 102, contrast: 120, saturation: 150, clarity: 20, highlights: -5, temperature: 5 },
  },
  {
    id: "pastel-dream",
    label: "Pastel Dream",
    description: "Soft, washed-out pastels — indie film look",
    emoji: "🌸",
    category: "Color",
    adjustments: { brightness: 110, contrast: 85, saturation: 70, fade: 25, highlights: 15, tint: 5, temperature: 8 },
  },
  {
    id: "high-contrast",
    label: "High Contrast",
    description: "Punchy blacks and crisp whites",
    emoji: "◑",
    category: "Color",
    adjustments: { brightness: 98, contrast: 140, saturation: 95, clarity: 30, shadows: -20, highlights: -20 },
  },
  {
    id: "muted-earth",
    label: "Muted Earth",
    description: "Earthy, warm desaturation — nature documentary",
    emoji: "🌿",
    category: "Color",
    adjustments: { brightness: 98, contrast: 105, saturation: 75, temperature: 12, shadows: 8, clarity: 5, fade: 10 },
  },
  // ── Vintage ────────────────────────────────────────────────────────────────
  {
    id: "film-noir",
    label: "Film Noir",
    description: "Black and white with maximum drama",
    emoji: "🎞️",
    category: "Vintage",
    adjustments: { brightness: 95, contrast: 125, saturation: 5, highlights: -20, shadows: -25, vignette: 45, grain: 20 },
  },
  {
    id: "vintage-70s",
    label: "Vintage 70s",
    description: "Warm orange haze — Super 8 home movie",
    emoji: "📽️",
    category: "Vintage",
    adjustments: { brightness: 100, contrast: 95, saturation: 85, temperature: 30, tint: 8, fade: 22, grain: 15, vignette: 20 },
  },
  {
    id: "cross-process",
    label: "Cross Process",
    description: "Lab error turned art form — alternate chemistry",
    emoji: "🔬",
    category: "Vintage",
    adjustments: { brightness: 102, contrast: 118, saturation: 120, hue: 15, temperature: -10, tint: 15, vignette: 15 },
  },
  {
    id: "faded-memory",
    label: "Faded Memory",
    description: "Aged photo with lifted blacks and cool cast",
    emoji: "🖼️",
    category: "Vintage",
    adjustments: { brightness: 105, contrast: 88, saturation: 65, fade: 30, temperature: -5, shadows: 15, grain: 12, vignette: 15 },
  },
  // ── Mood ──────────────────────────────────────────────────────────────────
  {
    id: "golden-hour",
    label: "Golden Hour",
    description: "Magic hour warmth — sunset perfection",
    emoji: "☀️",
    category: "Mood",
    adjustments: { brightness: 105, contrast: 105, saturation: 110, temperature: 28, tint: -3, highlights: 5, shadows: 12, vignette: 10 },
  },
  {
    id: "moonlight",
    label: "Moonlight",
    description: "Cool blue night — romantic and cinematic",
    emoji: "🌙",
    category: "Mood",
    adjustments: { brightness: 85, contrast: 110, saturation: 75, temperature: -30, tint: 5, shadows: -10, vignette: 35 },
  },
  {
    id: "neon-night",
    label: "Neon Night",
    description: "City lights and cyberpunk glow",
    emoji: "🌆",
    category: "Mood",
    adjustments: { brightness: 90, contrast: 120, saturation: 130, temperature: -15, tint: -10, clarity: 15, vignette: 40 },
  },
  {
    id: "golden-summer",
    label: "Golden Summer",
    description: "Bright, airy, carefree — holiday vibes",
    emoji: "🏖️",
    category: "Mood",
    adjustments: { brightness: 112, contrast: 95, saturation: 115, temperature: 22, highlights: 8, shadows: 15, fade: 8 },
  },
  // ── Stylized ──────────────────────────────────────────────────────────────
  {
    id: "infrared",
    label: "Infrared",
    description: "False-color infrared photography look",
    emoji: "🌡️",
    category: "Stylized",
    adjustments: { brightness: 110, contrast: 115, saturation: 40, hue: 150, highlights: 20, grain: 8, vignette: 25 },
  },
  {
    id: "duotone-cool",
    label: "Duotone Cool",
    description: "Two-tone blue/cyan graphic art",
    emoji: "💙",
    category: "Stylized",
    adjustments: { brightness: 100, contrast: 130, saturation: 30, temperature: -35, tint: -10, vignette: 20 },
  },
  {
    id: "portrait-glow",
    label: "Portrait Glow",
    description: "Soft skin glow with dreamy highlights",
    emoji: "✨",
    category: "Stylized",
    adjustments: { brightness: 108, contrast: 95, saturation: 88, highlights: 15, shadows: 8, fade: 10, sharpness: -15, temperature: 10 },
  },
  {
    id: "action-sports",
    label: "Action Sports",
    description: "Punchy, high-clarity sports broadcast look",
    emoji: "🏃",
    category: "Stylized",
    adjustments: { brightness: 100, contrast: 125, saturation: 118, clarity: 25, sharpness: 20, highlights: -15, shadows: -10 },
  },
  // ── Nature ────────────────────────────────────────────────────────────────
  {
    id: "forest-green",
    label: "Forest Green",
    description: "Deep lush greens — nature documentary",
    emoji: "🌲",
    category: "Nature",
    adjustments: { brightness: 95, contrast: 108, saturation: 115, temperature: -5, tint: -8, shadows: -5, clarity: 10, vignette: 20 },
  },
  {
    id: "ocean-blue",
    label: "Ocean Blue",
    description: "Crystal-clear underwater blues",
    emoji: "🌊",
    category: "Nature",
    adjustments: { brightness: 100, contrast: 110, saturation: 120, temperature: -25, tint: 5, clarity: 15, vignette: 15 },
  },
  {
    id: "desert-sand",
    label: "Desert Sand",
    description: "Warm golden dunes and arid landscapes",
    emoji: "🏜️",
    category: "Nature",
    adjustments: { brightness: 105, contrast: 105, saturation: 90, temperature: 30, highlights: -8, fade: 12, vignette: 10 },
  },
];

export const SMART_PRESET_CATEGORIES = [...new Set(SMART_PRESETS.map((p) => p.category))] as const;

export function getSmartPreset(id: string): SmartPreset | undefined {
  return SMART_PRESETS.find((p) => p.id === id);
}
