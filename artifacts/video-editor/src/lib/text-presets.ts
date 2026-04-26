/**
 * 100 text presets — combinations of font, weight, color, gradient, glow,
 * stroke and shadow. Each preset is a `Partial<TextStyle>` that gets merged
 * over `DEFAULT_TEXT_STYLE` when the user clicks it in the MediaPanel.
 *
 * Layout: presets are grouped into categories so the picker can show them in
 * sections. Add new entries to the bottom of `TEXT_PRESETS` — index drives
 * the visual order.
 */

import type { TextStyle } from "./types";

export type TextPresetCategory =
  | "Title"
  | "Gradient"
  | "Neon"
  | "Outlined"
  | "Retro"
  | "Shadow"
  | "Handwriting"
  | "Bold"
  | "Minimal"
  | "Fancy";

export interface TextPreset {
  label: string;
  text: string;
  category: TextPresetCategory;
  style: Partial<TextStyle>;
}

/* ───────────────────────────── helpers ──────────────────────────────── */

const grad = (color1: string, color2: string, angle = 90) => ({
  enabled: true,
  color1,
  color2,
  angle,
});

const glow = (color: string, blur = 12, intensity = 4) => ({
  enabled: true,
  color,
  blur,
  intensity,
});

const stroke = (color: string, width = 3) => ({ enabled: true, color, width });

const shadow = (
  color: string,
  offsetX: number,
  offsetY: number,
  blur: number,
) => ({ enabled: true, color, offsetX, offsetY, blur });

/* ───────────────────────────── presets ──────────────────────────────── */

export const TEXT_PRESETS: TextPreset[] = [
  // ── Title (10) ──────────────────────────────────────────────────────
  { label: "Big Title",   text: "BIG TITLE",   category: "Title",
    style: { fontFamily: "Inter, sans-serif", fontSize: 140, fontWeight: 900, color: "#ffffff", letterSpacing: 2 } },
  { label: "Hero",        text: "HERO HEADLINE", category: "Title",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 160, fontWeight: 900, color: "#ffffff", letterSpacing: 6 } },
  { label: "Subtitle",    text: "Subtitle",    category: "Title",
    style: { fontFamily: "Inter, sans-serif", fontSize: 56, fontWeight: 500, color: "#e2e8f0" } },
  { label: "Caption",     text: "Caption goes here", category: "Title",
    style: { fontFamily: "Inter, sans-serif", fontSize: 36, fontWeight: 600, color: "#ffffff" } },
  { label: "Eyebrow",     text: "EYEBROW",     category: "Title",
    style: { fontFamily: "Inter, sans-serif", fontSize: 28, fontWeight: 700, color: "#fbbf24", letterSpacing: 8 } },
  { label: "Display",     text: "Display",     category: "Title",
    style: { fontFamily: "Playfair Display, serif", fontSize: 120, fontWeight: 900, color: "#ffffff" } },
  { label: "Quote",       text: '"Quote here"', category: "Title",
    style: { fontFamily: "Lora, serif", fontSize: 80, fontWeight: 600, italic: true, color: "#f5f5f4" } },
  { label: "Tag Line",    text: "Tag line.",   category: "Title",
    style: { fontFamily: "Manrope, sans-serif", fontSize: 48, fontWeight: 400, color: "#cbd5e1" } },
  { label: "Section",     text: "SECTION 01",  category: "Title",
    style: { fontFamily: "Oswald, sans-serif", fontSize: 64, fontWeight: 700, color: "#ffffff", letterSpacing: 4 } },
  { label: "Number Big",  text: "01",          category: "Title",
    style: { fontFamily: "Anton, sans-serif", fontSize: 240, fontWeight: 900, color: "#fbbf24" } },

  // ── Gradient (15) ───────────────────────────────────────────────────
  { label: "Sunset",      text: "SUNSET",      category: "Gradient",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 150, fontWeight: 900, color: "#ff7a59", letterSpacing: 4, gradient: grad("#fde68a", "#ec4899", 90) } },
  { label: "Ocean",       text: "OCEAN",       category: "Gradient",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 150, fontWeight: 900, color: "#3b82f6", letterSpacing: 4, gradient: grad("#06b6d4", "#1e40af", 90) } },
  { label: "Forest",      text: "FOREST",      category: "Gradient",
    style: { fontFamily: "Anton, sans-serif", fontSize: 130, fontWeight: 900, color: "#22c55e", gradient: grad("#a3e635", "#15803d", 180) } },
  { label: "Lavender",    text: "LAVENDER",    category: "Gradient",
    style: { fontFamily: "Inter, sans-serif", fontSize: 100, fontWeight: 800, color: "#a78bfa", gradient: grad("#c4b5fd", "#7c3aed", 135) } },
  { label: "Coral Reef",  text: "CORAL",       category: "Gradient",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 140, fontWeight: 900, color: "#fb7185", gradient: grad("#fda4af", "#dc2626", 90) } },
  { label: "Mint Bloom",  text: "MINT",        category: "Gradient",
    style: { fontFamily: "Poppins, sans-serif", fontSize: 110, fontWeight: 800, color: "#10b981", gradient: grad("#86efac", "#059669", 90) } },
  { label: "Galaxy",      text: "GALAXY",      category: "Gradient",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 150, fontWeight: 900, color: "#a78bfa", letterSpacing: 4, gradient: grad("#22d3ee", "#9333ea", 135) } },
  { label: "Tropical",    text: "TROPICAL",    category: "Gradient",
    style: { fontFamily: "Anton, sans-serif", fontSize: 120, fontWeight: 900, color: "#22d3ee", gradient: grad("#fef08a", "#0ea5e9", 90) } },
  { label: "Berry",       text: "BERRY",       category: "Gradient",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 140, fontWeight: 900, color: "#a21caf", gradient: grad("#f0abfc", "#86198f", 90) } },
  { label: "Lemon",       text: "LEMON",       category: "Gradient",
    style: { fontFamily: "Anton, sans-serif", fontSize: 130, fontWeight: 900, color: "#facc15", gradient: grad("#fef08a", "#ca8a04", 180) } },
  { label: "Rose Gold",   text: "ROSÉ",        category: "Gradient",
    style: { fontFamily: "Playfair Display, serif", fontSize: 120, fontWeight: 700, color: "#fda4af", gradient: grad("#fbcfe8", "#a16207", 90) } },
  { label: "Ice",         text: "ICE",         category: "Gradient",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 150, fontWeight: 900, color: "#bfdbfe", gradient: grad("#ffffff", "#3b82f6", 180) } },
  { label: "Fire",        text: "FIRE",        category: "Gradient",
    style: { fontFamily: "Anton, sans-serif", fontSize: 150, fontWeight: 900, color: "#f97316", gradient: grad("#facc15", "#dc2626", 90) } },
  { label: "Aurora",      text: "AURORA",      category: "Gradient",
    style: { fontFamily: "Inter, sans-serif", fontSize: 110, fontWeight: 800, color: "#22d3ee", gradient: grad("#a3e635", "#22d3ee", 135) } },
  { label: "Pastel",      text: "PASTEL",      category: "Gradient",
    style: { fontFamily: "Quicksand, sans-serif", fontSize: 110, fontWeight: 700, color: "#fda4af", gradient: grad("#fbcfe8", "#a5b4fc", 90) } },

  // ── Neon (12) ───────────────────────────────────────────────────────
  { label: "Neon Cyan",   text: "NEON",        category: "Neon",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 140, fontWeight: 900, color: "#22d3ee", letterSpacing: 6, glow: glow("#22d3ee", 14, 5) } },
  { label: "Neon Pink",   text: "PINK",        category: "Neon",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 140, fontWeight: 900, color: "#ec4899", letterSpacing: 6, glow: glow("#ec4899", 14, 5) } },
  { label: "Neon Lime",   text: "LIME",        category: "Neon",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 140, fontWeight: 900, color: "#a3e635", letterSpacing: 6, glow: glow("#a3e635", 14, 5) } },
  { label: "Neon Purple", text: "GLOW",        category: "Neon",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 140, fontWeight: 900, color: "#c084fc", letterSpacing: 6, glow: glow("#a855f7", 14, 6) } },
  { label: "Neon Orange", text: "VIBE",        category: "Neon",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 140, fontWeight: 900, color: "#fb923c", letterSpacing: 6, glow: glow("#f97316", 14, 5) } },
  { label: "Neon Red",    text: "ALERT",       category: "Neon",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 140, fontWeight: 900, color: "#f87171", letterSpacing: 6, glow: glow("#dc2626", 16, 6) } },
  { label: "Soft Glow",   text: "SOFT",        category: "Neon",
    style: { fontFamily: "Inter, sans-serif", fontSize: 110, fontWeight: 800, color: "#fef3c7", glow: glow("#fbbf24", 20, 3) } },
  { label: "Hologram",    text: "HOLO",        category: "Neon",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 140, fontWeight: 900, color: "#67e8f9", letterSpacing: 8, glow: glow("#0ea5e9", 18, 6) } },
  { label: "Cyberpunk",   text: "CYBER",       category: "Neon",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 150, fontWeight: 900, color: "#f0abfc", letterSpacing: 6, glow: glow("#22d3ee", 16, 5), gradient: grad("#f0abfc", "#22d3ee", 90) } },
  { label: "Plasma",      text: "PLASMA",      category: "Neon",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 150, fontWeight: 900, color: "#a855f7", letterSpacing: 4, glow: glow("#ec4899", 18, 6) } },
  { label: "Toxic",       text: "TOXIC",       category: "Neon",
    style: { fontFamily: "Anton, sans-serif", fontSize: 140, fontWeight: 900, color: "#a3e635", letterSpacing: 4, glow: glow("#65a30d", 14, 5) } },
  { label: "Frost",       text: "FROST",       category: "Neon",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 140, fontWeight: 900, color: "#dbeafe", letterSpacing: 6, glow: glow("#3b82f6", 16, 5) } },

  // ── Outlined (10) ───────────────────────────────────────────────────
  { label: "Outline White", text: "OUTLINE",   category: "Outlined",
    style: { fontFamily: "Anton, sans-serif", fontSize: 150, fontWeight: 900, color: "transparent", letterSpacing: 2, stroke: stroke("#ffffff", 3) } },
  { label: "Outline Black", text: "BOLD",      category: "Outlined",
    style: { fontFamily: "Anton, sans-serif", fontSize: 150, fontWeight: 900, color: "transparent", letterSpacing: 2, stroke: stroke("#000000", 3) } },
  { label: "Outline + Fill", text: "FILL",     category: "Outlined",
    style: { fontFamily: "Anton, sans-serif", fontSize: 150, fontWeight: 900, color: "#fbbf24", letterSpacing: 2, stroke: stroke("#000000", 4) } },
  { label: "Thin Outline", text: "thin",       category: "Outlined",
    style: { fontFamily: "Inter, sans-serif", fontSize: 100, fontWeight: 300, color: "transparent", stroke: stroke("#ffffff", 1) } },
  { label: "Double Stroke",text: "DOUBLE",     category: "Outlined",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 150, fontWeight: 900, color: "#ffffff", letterSpacing: 4, stroke: stroke("#0f172a", 6) } },
  { label: "Sticker",     text: "STICKER",     category: "Outlined",
    style: { fontFamily: "Anton, sans-serif", fontSize: 130, fontWeight: 900, color: "#ffffff", letterSpacing: 2, stroke: stroke("#ec4899", 6), textShadow: shadow("#000000aa", 0, 6, 0) } },
  { label: "Comic",       text: "POW!",        category: "Outlined",
    style: { fontFamily: "Bangers, sans-serif", fontSize: 160, fontWeight: 900, color: "#fde047", letterSpacing: 4, stroke: stroke("#000000", 5) } },
  { label: "Hollow",      text: "HOLLOW",      category: "Outlined",
    style: { fontFamily: "Oswald, sans-serif", fontSize: 130, fontWeight: 700, color: "transparent", letterSpacing: 6, stroke: stroke("#ffffff", 2) } },
  { label: "Cartoon",     text: "TOON",        category: "Outlined",
    style: { fontFamily: "Bangers, sans-serif", fontSize: 160, fontWeight: 900, color: "#22d3ee", letterSpacing: 2, stroke: stroke("#0f172a", 6) } },
  { label: "Outline Pink",text: "ROSE",        category: "Outlined",
    style: { fontFamily: "Anton, sans-serif", fontSize: 140, fontWeight: 900, color: "transparent", stroke: stroke("#ec4899", 3) } },

  // ── Retro (10) ──────────────────────────────────────────────────────
  { label: "Retro Pop",   text: "RETRO",       category: "Retro",
    style: { fontFamily: "Bungee, sans-serif", fontSize: 130, fontWeight: 900, color: "#fde68a", letterSpacing: 4, textShadow: shadow("#7c3aed", 6, 6, 0) } },
  { label: "70s Funk",    text: "FUNK",        category: "Retro",
    style: { fontFamily: "Pacifico, cursive", fontSize: 130, fontWeight: 700, color: "#f97316", textShadow: shadow("#7c2d12", 4, 4, 0) } },
  { label: "VHS",         text: "1985",        category: "Retro",
    style: { fontFamily: "VT323, monospace", fontSize: 160, fontWeight: 700, color: "#22d3ee", letterSpacing: 4, textShadow: shadow("#ec4899", 3, 3, 0) } },
  { label: "Synthwave",   text: "WAVES",       category: "Retro",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 150, fontWeight: 900, color: "#f0abfc", letterSpacing: 8, gradient: grad("#f0abfc", "#22d3ee", 180), glow: glow("#a21caf", 16, 6) } },
  { label: "Boombox",     text: "BOOM",        category: "Retro",
    style: { fontFamily: "Anton, sans-serif", fontSize: 140, fontWeight: 900, color: "#fbbf24", textShadow: shadow("#dc2626", 5, 5, 0), stroke: stroke("#000000", 3) } },
  { label: "Marquee",     text: "MARQUEE",     category: "Retro",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 130, fontWeight: 900, color: "#fde047", letterSpacing: 4, glow: glow("#ef4444", 12, 4) } },
  { label: "Diner",       text: "DINER",       category: "Retro",
    style: { fontFamily: "Pacifico, cursive", fontSize: 130, fontWeight: 700, color: "#fb7185", glow: glow("#f43f5e", 14, 4) } },
  { label: "Disco",       text: "DISCO",       category: "Retro",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 150, fontWeight: 900, color: "#fbbf24", letterSpacing: 6, gradient: grad("#fde047", "#a21caf", 180), glow: glow("#fbbf24", 14, 5) } },
  { label: "Polaroid",    text: "Polaroid",    category: "Retro",
    style: { fontFamily: "Caveat, cursive", fontSize: 90, fontWeight: 600, color: "#1f2937" } },
  { label: "Western",     text: "WESTERN",     category: "Retro",
    style: { fontFamily: "Playfair Display, serif", fontSize: 130, fontWeight: 900, color: "#fcd34d", stroke: stroke("#7c2d12", 4) } },

  // ── Shadow (10) ─────────────────────────────────────────────────────
  { label: "Drop Shadow", text: "SHADOW",      category: "Shadow",
    style: { fontFamily: "Inter, sans-serif", fontSize: 130, fontWeight: 900, color: "#ffffff", textShadow: shadow("#000000aa", 0, 6, 12) } },
  { label: "Long Shadow", text: "LONG",        category: "Shadow",
    style: { fontFamily: "Anton, sans-serif", fontSize: 140, fontWeight: 900, color: "#ffffff", textShadow: shadow("#0f172a", 12, 12, 0) } },
  { label: "3D",          text: "3D",          category: "Shadow",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 200, fontWeight: 900, color: "#ec4899", textShadow: shadow("#7c2d12", 8, 8, 0) } },
  { label: "Soft Shadow", text: "Soft",        category: "Shadow",
    style: { fontFamily: "Inter, sans-serif", fontSize: 100, fontWeight: 600, color: "#ffffff", textShadow: shadow("#000000aa", 0, 12, 30) } },
  { label: "Hard Shadow", text: "HARD",        category: "Shadow",
    style: { fontFamily: "Anton, sans-serif", fontSize: 140, fontWeight: 900, color: "#fde047", textShadow: shadow("#000000", 4, 4, 0) } },
  { label: "Float",       text: "FLOAT",       category: "Shadow",
    style: { fontFamily: "Inter, sans-serif", fontSize: 110, fontWeight: 800, color: "#ffffff", textShadow: shadow("#0ea5e9aa", 0, 18, 24) } },
  { label: "Letterpress", text: "PRESS",       category: "Shadow",
    style: { fontFamily: "Inter, sans-serif", fontSize: 120, fontWeight: 900, color: "#1f2937", textShadow: shadow("#ffffff66", 0, 1, 0) } },
  { label: "Glow Shadow", text: "GLOW",        category: "Shadow",
    style: { fontFamily: "Inter, sans-serif", fontSize: 130, fontWeight: 800, color: "#ffffff", textShadow: shadow("#ec489966", 0, 0, 30) } },
  { label: "Blueprint",   text: "BLUEPRINT",   category: "Shadow",
    style: { fontFamily: "Inter, sans-serif", fontSize: 90, fontWeight: 700, color: "#dbeafe", textShadow: shadow("#1e40af", 2, 2, 0) } },
  { label: "Engraved",    text: "ENGRAVED",    category: "Shadow",
    style: { fontFamily: "Playfair Display, serif", fontSize: 110, fontWeight: 900, color: "#cbd5e1", textShadow: shadow("#000000", 0, 2, 0) } },

  // ── Handwriting (10) ────────────────────────────────────────────────
  { label: "Note",        text: "Just a note", category: "Handwriting",
    style: { fontFamily: "Caveat, cursive", fontSize: 90, fontWeight: 600, color: "#fff7ed" } },
  { label: "Signature",   text: "Signed",      category: "Handwriting",
    style: { fontFamily: "Dancing Script, cursive", fontSize: 110, fontWeight: 700, color: "#ffffff" } },
  { label: "Calligraphy", text: "Beautiful",   category: "Handwriting",
    style: { fontFamily: "Great Vibes, cursive", fontSize: 120, fontWeight: 400, color: "#fbbf24" } },
  { label: "Marker",      text: "MARKER",      category: "Handwriting",
    style: { fontFamily: "Permanent Marker, cursive", fontSize: 110, fontWeight: 400, color: "#0f172a" } },
  { label: "Cursive Pop", text: "Hello!",      category: "Handwriting",
    style: { fontFamily: "Pacifico, cursive", fontSize: 110, fontWeight: 700, color: "#ec4899" } },
  { label: "Sketch",      text: "Sketchy",     category: "Handwriting",
    style: { fontFamily: "Caveat, cursive", fontSize: 90, fontWeight: 600, color: "#0f172a" } },
  { label: "Quote Mark",  text: '"in quotes"', category: "Handwriting",
    style: { fontFamily: "Caveat, cursive", fontSize: 110, fontWeight: 700, italic: true, color: "#ffffff" } },
  { label: "Casual",      text: "Casual",      category: "Handwriting",
    style: { fontFamily: "Caveat, cursive", fontSize: 90, fontWeight: 500, color: "#fbbf24", textShadow: shadow("#000000aa", 0, 2, 6) } },
  { label: "Polished",    text: "Polished",    category: "Handwriting",
    style: { fontFamily: "Great Vibes, cursive", fontSize: 130, fontWeight: 400, color: "#ffffff", textShadow: shadow("#000000aa", 0, 4, 8) } },
  { label: "Crayon",      text: "Crayon",      category: "Handwriting",
    style: { fontFamily: "Permanent Marker, cursive", fontSize: 110, fontWeight: 400, color: "#dc2626", letterSpacing: 2 } },

  // ── Bold (10) ───────────────────────────────────────────────────────
  { label: "Heavy",       text: "HEAVY",       category: "Bold",
    style: { fontFamily: "Archivo Black, sans-serif", fontSize: 150, fontWeight: 900, color: "#ffffff" } },
  { label: "Black Italic",text: "ITALIC",      category: "Bold",
    style: { fontFamily: "Archivo Black, sans-serif", fontSize: 130, fontWeight: 900, italic: true, color: "#fbbf24" } },
  { label: "Stretched",   text: "WIDE",        category: "Bold",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 150, fontWeight: 900, color: "#ffffff", letterSpacing: 16 } },
  { label: "Stacked",     text: "STACK",       category: "Bold",
    style: { fontFamily: "Anton, sans-serif", fontSize: 130, fontWeight: 900, color: "#ffffff", lineHeight: 0.85 } },
  { label: "Condensed",   text: "CONDENSED",   category: "Bold",
    style: { fontFamily: "Oswald, sans-serif", fontSize: 100, fontWeight: 700, color: "#ffffff", letterSpacing: 1 } },
  { label: "Breakfast",   text: "BREAKFAST",   category: "Bold",
    style: { fontFamily: "Anton, sans-serif", fontSize: 110, fontWeight: 900, color: "#fbbf24", textShadow: shadow("#0f172a", 4, 4, 0) } },
  { label: "Brand",       text: "BRAND",       category: "Bold",
    style: { fontFamily: "Inter, sans-serif", fontSize: 110, fontWeight: 900, color: "#ffffff", letterSpacing: 4 } },
  { label: "Slab",        text: "SLAB",        category: "Bold",
    style: { fontFamily: "Roboto Slab, serif", fontSize: 130, fontWeight: 900, color: "#ffffff" } },
  { label: "Mono Bold",   text: "console",     category: "Bold",
    style: { fontFamily: "JetBrains Mono, monospace", fontSize: 80, fontWeight: 700, color: "#a3e635" } },
  { label: "Allcaps Tag", text: "ALL CAPS",    category: "Bold",
    style: { fontFamily: "Inter, sans-serif", fontSize: 60, fontWeight: 900, color: "#fbbf24", letterSpacing: 12 } },

  // ── Minimal (10) ────────────────────────────────────────────────────
  { label: "Light",       text: "Light",       category: "Minimal",
    style: { fontFamily: "Inter, sans-serif", fontSize: 100, fontWeight: 300, color: "#ffffff" } },
  { label: "Thin Line",   text: "thin line",   category: "Minimal",
    style: { fontFamily: "Inter, sans-serif", fontSize: 80, fontWeight: 200, color: "#e2e8f0", letterSpacing: 4 } },
  { label: "Mono Line",   text: "// code",     category: "Minimal",
    style: { fontFamily: "JetBrains Mono, monospace", fontSize: 60, fontWeight: 400, color: "#22d3ee" } },
  { label: "Notice",      text: "Note",        category: "Minimal",
    style: { fontFamily: "Inter, sans-serif", fontSize: 50, fontWeight: 500, color: "#94a3b8" } },
  { label: "Whisper",     text: "whisper",     category: "Minimal",
    style: { fontFamily: "Lora, serif", fontSize: 70, fontWeight: 300, italic: true, color: "#cbd5e1" } },
  { label: "Tag",         text: "TAG",         category: "Minimal",
    style: { fontFamily: "Inter, sans-serif", fontSize: 36, fontWeight: 700, color: "#0f172a", letterSpacing: 3 } },
  { label: "Date",        text: "01.01.2025",  category: "Minimal",
    style: { fontFamily: "Inter, sans-serif", fontSize: 40, fontWeight: 500, color: "#94a3b8", letterSpacing: 2 } },
  { label: "Spacious",    text: "S P A C E",   category: "Minimal",
    style: { fontFamily: "Inter, sans-serif", fontSize: 80, fontWeight: 200, color: "#ffffff", letterSpacing: 24 } },
  { label: "Underline",   text: "underlined",  category: "Minimal",
    style: { fontFamily: "Inter, sans-serif", fontSize: 80, fontWeight: 500, color: "#ffffff", underline: true } },
  { label: "Bullet",      text: "• item",      category: "Minimal",
    style: { fontFamily: "Inter, sans-serif", fontSize: 50, fontWeight: 400, color: "#cbd5e1" } },

  // ── Fancy (13) ──────────────────────────────────────────────────────
  { label: "Chrome",      text: "CHROME",      category: "Fancy",
    style: { fontFamily: "Oswald, sans-serif", fontSize: 130, fontWeight: 900, color: "#cbd5e1", letterSpacing: 3, gradient: grad("#f8fafc", "#475569", 180), stroke: stroke("#0f172a", 1.5), textShadow: shadow("#000000aa", 0, 4, 6) } },
  { label: "Gold Foil",   text: "GOLD",        category: "Fancy",
    style: { fontFamily: "Playfair Display, serif", fontSize: 140, fontWeight: 900, color: "#fbbf24", gradient: grad("#fef3c7", "#a16207", 90), stroke: stroke("#7c2d12", 2) } },
  { label: "Silver",      text: "SILVER",      category: "Fancy",
    style: { fontFamily: "Oswald, sans-serif", fontSize: 130, fontWeight: 700, color: "#e2e8f0", gradient: grad("#f1f5f9", "#64748b", 180) } },
  { label: "Copper",      text: "COPPER",      category: "Fancy",
    style: { fontFamily: "Anton, sans-serif", fontSize: 130, fontWeight: 900, color: "#ea580c", gradient: grad("#fed7aa", "#9a3412", 180) } },
  { label: "Marble",      text: "MARBLE",      category: "Fancy",
    style: { fontFamily: "Playfair Display, serif", fontSize: 140, fontWeight: 700, color: "#f8fafc", gradient: grad("#f8fafc", "#94a3b8", 135) } },
  { label: "Ink Splash",  text: "INK",         category: "Fancy",
    style: { fontFamily: "Permanent Marker, cursive", fontSize: 150, fontWeight: 400, color: "#0f172a", textShadow: shadow("#475569", 6, 6, 12) } },
  { label: "Curved",      text: "ARCHED",      category: "Fancy",
    style: { fontFamily: "Pacifico, cursive", fontSize: 90, fontWeight: 700, color: "#fde68a", curve: 60 } },
  { label: "Curved Frown",text: "CURVED",      category: "Fancy",
    style: { fontFamily: "Pacifico, cursive", fontSize: 90, fontWeight: 700, color: "#a3e635", curve: -60 } },
  { label: "Y2K",         text: "Y2K",         category: "Fancy",
    style: { fontFamily: "Bebas Neue, sans-serif", fontSize: 180, fontWeight: 900, color: "#22d3ee", letterSpacing: 8, gradient: grad("#22d3ee", "#a855f7", 180), glow: glow("#22d3ee", 14, 4) } },
  { label: "Glassy",      text: "GLASS",       category: "Fancy",
    style: { fontFamily: "Inter, sans-serif", fontSize: 130, fontWeight: 800, color: "#dbeafeaa", textShadow: shadow("#3b82f666", 0, 4, 12) } },
  { label: "Sticker Pop", text: "POP",         category: "Fancy",
    style: { fontFamily: "Bangers, sans-serif", fontSize: 160, fontWeight: 900, color: "#fde047", stroke: stroke("#000000", 6), textShadow: shadow("#dc2626", 4, 4, 0) } },
  { label: "Vibrant",     text: "VIBRANT",     category: "Fancy",
    style: { fontFamily: "Anton, sans-serif", fontSize: 130, fontWeight: 900, color: "#22d3ee", gradient: grad("#fde047", "#ec4899", 90), glow: glow("#a855f7", 12, 4) } },
  { label: "Ethereal",    text: "ethereal",    category: "Fancy",
    style: { fontFamily: "Great Vibes, cursive", fontSize: 130, fontWeight: 400, color: "#dbeafe", glow: glow("#60a5fa", 18, 4) } },
];

export const TEXT_PRESET_CATEGORIES: TextPresetCategory[] = [
  "Title", "Gradient", "Neon", "Outlined", "Retro", "Shadow", "Handwriting", "Bold", "Minimal", "Fancy",
];
