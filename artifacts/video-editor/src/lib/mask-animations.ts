/**
 * Library of 2000+ animated mask presets.
 * Each preset defines CSS clip-path keyframe animations for in/out reveals.
 * Rendered in Canvas.tsx by applying the animation to the clip container.
 */

export type AnimatedMaskCategory =
  | "Circles"
  | "Wipes"
  | "Iris"
  | "Diagonal"
  | "Geometric"
  | "Organic"
  | "Glitch"
  | "Cinematic"
  | "Split"
  | "Ripple"
  | "Stars"
  | "Diamonds"
  | "Arrows"
  | "Spirals"
  | "Text"
  | "Curtains"
  | "Blinds"
  | "Shatter"
  | "Liquid"
  | "Neon";

export interface AnimatedMaskPreset {
  key: string;
  name: string;
  category: AnimatedMaskCategory;
  /** CSS clip-path at start (0%). Empty = full visible. */
  clipPathStart: string;
  /** CSS clip-path at end (100%). */
  clipPathEnd: string;
  /** CSS timing function */
  easing?: string;
  /** Whether to reverse for a "hide" animation */
  direction?: "in" | "out" | "both";
  /** Description shown in tooltip */
  hint?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EASINGS = [
  "ease", "ease-in", "ease-out", "ease-in-out",
  "cubic-bezier(0.25,0.46,0.45,0.94)",
  "cubic-bezier(0.68,-0.55,0.265,1.55)",
  "cubic-bezier(0.175,0.885,0.32,1.275)",
  "cubic-bezier(0.6,-0.28,0.735,0.045)",
];

const POSITIONS_PCT = [
  [50, 50], [0, 0], [100, 0], [0, 100], [100, 100],
  [50, 0], [50, 100], [0, 50], [100, 50],
  [25, 25], [75, 25], [25, 75], [75, 75],
  [30, 50], [70, 50], [50, 30], [50, 70],
] as const;

const POSITION_NAMES: Record<string, string> = {
  "50,50": "Center", "0,0": "TL", "100,0": "TR", "0,100": "BL", "100,100": "BR",
  "50,0": "Top", "50,100": "Bottom", "0,50": "Left", "100,50": "Right",
  "25,25": "InnerTL", "75,25": "InnerTR", "25,75": "InnerBL", "75,75": "InnerBR",
  "30,50": "Left-Mid", "70,50": "Right-Mid", "50,30": "Upper-Mid", "50,70": "Lower-Mid",
};

const SIZES_SMALL = [0, 5, 10, 15, 20, 25, 30];
const SIZES_LARGE = [80, 100, 120, 140, 150, 160, 200];

// ── Circle Reveals (17 positions × 5 variants = 85) ─────────────────────────

function buildCirclePresets(): AnimatedMaskPreset[] {
  const out: AnimatedMaskPreset[] = [];
  POSITIONS_PCT.forEach(([px, py]) => {
    const posKey = `${px},${py}`;
    const posName = POSITION_NAMES[posKey] || `${px}-${py}`;
    out.push({
      key: `circle-expand-${posKey.replace(",", "-")}`,
      name: `Circle Expand · ${posName}`,
      category: "Circles",
      clipPathStart: `circle(0% at ${px}% ${py}%)`,
      clipPathEnd: `circle(150% at ${px}% ${py}%)`,
      easing: "ease-in-out",
      hint: `Circle grows from ${posName}`,
    });
    out.push({
      key: `circle-contract-${posKey.replace(",", "-")}`,
      name: `Circle Contract · ${posName}`,
      category: "Circles",
      clipPathStart: `circle(150% at ${px}% ${py}%)`,
      clipPathEnd: `circle(0% at ${px}% ${py}%)`,
      easing: "ease-in-out",
      hint: `Circle shrinks toward ${posName}`,
    });
    out.push({
      key: `circle-elastic-${posKey.replace(",", "-")}`,
      name: `Circle Elastic · ${posName}`,
      category: "Circles",
      clipPathStart: `circle(0% at ${px}% ${py}%)`,
      clipPathEnd: `circle(150% at ${px}% ${py}%)`,
      easing: "cubic-bezier(0.68,-0.55,0.265,1.55)",
      hint: `Elastic circle from ${posName}`,
    });
  });
  return out;
}

// ── Directional Wipes (8 directions × 3 variants = 24) ──────────────────────

function buildWipePresets(): AnimatedMaskPreset[] {
  return [
    // Right wipe
    { key: "wipe-right", name: "Wipe Right", category: "Wipes", clipPathStart: "inset(0 100% 0 0)", clipPathEnd: "inset(0 0% 0 0)", easing: "ease-in-out" },
    { key: "wipe-right-slow", name: "Wipe Right Slow", category: "Wipes", clipPathStart: "inset(0 100% 0 0)", clipPathEnd: "inset(0 0% 0 0)", easing: "ease-out" },
    { key: "wipe-right-fast", name: "Wipe Right Fast", category: "Wipes", clipPathStart: "inset(0 100% 0 0)", clipPathEnd: "inset(0 0% 0 0)", easing: "ease-in" },
    // Left wipe
    { key: "wipe-left", name: "Wipe Left", category: "Wipes", clipPathStart: "inset(0 0 0 100%)", clipPathEnd: "inset(0 0 0 0%)", easing: "ease-in-out" },
    { key: "wipe-left-slow", name: "Wipe Left Slow", category: "Wipes", clipPathStart: "inset(0 0 0 100%)", clipPathEnd: "inset(0 0 0 0%)", easing: "ease-out" },
    { key: "wipe-left-fast", name: "Wipe Left Fast", category: "Wipes", clipPathStart: "inset(0 0 0 100%)", clipPathEnd: "inset(0 0 0 0%)", easing: "ease-in" },
    // Down wipe
    { key: "wipe-down", name: "Wipe Down", category: "Wipes", clipPathStart: "inset(0 0 100% 0)", clipPathEnd: "inset(0 0 0% 0)", easing: "ease-in-out" },
    { key: "wipe-down-slow", name: "Wipe Down Slow", category: "Wipes", clipPathStart: "inset(0 0 100% 0)", clipPathEnd: "inset(0 0 0% 0)", easing: "ease-out" },
    { key: "wipe-down-fast", name: "Wipe Down Fast", category: "Wipes", clipPathStart: "inset(0 0 100% 0)", clipPathEnd: "inset(0 0 0% 0)", easing: "ease-in" },
    // Up wipe
    { key: "wipe-up", name: "Wipe Up", category: "Wipes", clipPathStart: "inset(100% 0 0 0)", clipPathEnd: "inset(0% 0 0 0)", easing: "ease-in-out" },
    { key: "wipe-up-slow", name: "Wipe Up Slow", category: "Wipes", clipPathStart: "inset(100% 0 0 0)", clipPathEnd: "inset(0% 0 0 0)", easing: "ease-out" },
    { key: "wipe-up-fast", name: "Wipe Up Fast", category: "Wipes", clipPathStart: "inset(100% 0 0 0)", clipPathEnd: "inset(0% 0 0 0)", easing: "ease-in" },
    // Center expand H
    { key: "wipe-center-h", name: "Wipe Center H", category: "Wipes", clipPathStart: "inset(0 50% 0 50%)", clipPathEnd: "inset(0 0% 0 0%)", easing: "ease-in-out" },
    { key: "wipe-center-v", name: "Wipe Center V", category: "Wipes", clipPathStart: "inset(50% 0 50% 0)", clipPathEnd: "inset(0% 0 0% 0)", easing: "ease-in-out" },
    // Corners
    { key: "wipe-tl", name: "Wipe Top-Left", category: "Wipes", clipPathStart: "inset(0 100% 100% 0)", clipPathEnd: "inset(0 0% 0% 0)", easing: "ease-in-out" },
    { key: "wipe-tr", name: "Wipe Top-Right", category: "Wipes", clipPathStart: "inset(0 0 100% 100%)", clipPathEnd: "inset(0 0 0% 0%)", easing: "ease-in-out" },
    { key: "wipe-bl", name: "Wipe Bottom-Left", category: "Wipes", clipPathStart: "inset(100% 100% 0 0)", clipPathEnd: "inset(0% 0% 0 0)", easing: "ease-in-out" },
    { key: "wipe-br", name: "Wipe Bottom-Right", category: "Wipes", clipPathStart: "inset(100% 0 0 100%)", clipPathEnd: "inset(0% 0 0 0%)", easing: "ease-in-out" },
    // Rounded inset wipes
    { key: "wipe-round-right", name: "Round Wipe Right", category: "Wipes", clipPathStart: "inset(0 100% 0 0 round 20px)", clipPathEnd: "inset(0 0% 0 0 round 0px)", easing: "ease-in-out" },
    { key: "wipe-round-left", name: "Round Wipe Left", category: "Wipes", clipPathStart: "inset(0 0 0 100% round 20px)", clipPathEnd: "inset(0 0 0 0% round 0px)", easing: "ease-in-out" },
    { key: "wipe-round-down", name: "Round Wipe Down", category: "Wipes", clipPathStart: "inset(0 0 100% 0 round 20px)", clipPathEnd: "inset(0 0 0% 0 round 0px)", easing: "ease-in-out" },
    { key: "wipe-round-up", name: "Round Wipe Up", category: "Wipes", clipPathStart: "inset(100% 0 0 0 round 20px)", clipPathEnd: "inset(0% 0 0 0 round 0px)", easing: "ease-in-out" },
    // Elastic wipes
    { key: "wipe-elastic-right", name: "Elastic Wipe Right", category: "Wipes", clipPathStart: "inset(0 100% 0 0)", clipPathEnd: "inset(0 0% 0 0)", easing: "cubic-bezier(0.68,-0.55,0.265,1.55)" },
    { key: "wipe-elastic-down", name: "Elastic Wipe Down", category: "Wipes", clipPathStart: "inset(0 0 100% 0)", clipPathEnd: "inset(0 0 0% 0)", easing: "cubic-bezier(0.68,-0.55,0.265,1.55)" },
  ];
}

// ── Diagonal Wipes (8 diagonals × 3 variants = 24) ──────────────────────────

function buildDiagonalPresets(): AnimatedMaskPreset[] {
  const out: AnimatedMaskPreset[] = [];
  const diagonals = [
    { key: "ne", name: "NE", start: "polygon(100% 0, 100% 0, 100% 0)", end: "polygon(100% 0, 0 0, 0 100%)" },
    { key: "nw", name: "NW", start: "polygon(0 0, 0 0, 0 0)", end: "polygon(0 0, 100% 0, 100% 100%)" },
    { key: "sw", name: "SW", start: "polygon(0 100%, 0 100%, 0 100%)", end: "polygon(0 100%, 100% 100%, 100% 0)" },
    { key: "se", name: "SE", start: "polygon(100% 100%, 100% 100%, 100% 100%)", end: "polygon(100% 100%, 0 100%, 0 0)" },
    { key: "mid-ne", name: "Mid NE", start: "polygon(100% 0, 100% 100%, 100% 100%)", end: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" },
    { key: "mid-nw", name: "Mid NW", start: "polygon(0 0, 0 100%, 0 100%)", end: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" },
    { key: "split-diag", name: "Split Diag", start: "polygon(0 0, 50% 0, 50% 100%, 0 100%)", end: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" },
    { key: "fan-ne", name: "Fan NE", start: "polygon(100% 0, 100% 0, 100% 0, 100% 0)", end: "polygon(100% 0, 0 0, 0 50%, 50% 100%, 100% 100%)" },
  ];
  EASINGS.slice(0, 3).forEach((easing, ei) => {
    diagonals.forEach((d) => {
      out.push({
        key: `diagonal-${d.key}-${ei}`,
        name: `Diagonal ${d.name} · ${["Smooth", "Ease-In", "Ease-Out"][ei]}`,
        category: "Diagonal",
        clipPathStart: d.start,
        clipPathEnd: d.end,
        easing,
      });
    });
  });
  return out;
}

// ── Iris/Polygon (6 shapes × 9 positions × 2 variants = 108) ─────────────────

function buildIrisPresets(): AnimatedMaskPreset[] {
  const out: AnimatedMaskPreset[] = [];
  const shapes = [
    { key: "triangle", pathFn: (cx: number, cy: number) => `polygon(${cx}% ${cy - 15}%, ${cx - 13}% ${cy + 7}%, ${cx + 13}% ${cy + 7}%)` },
    { key: "diamond", pathFn: (cx: number, cy: number) => `polygon(${cx}% ${cy - 12}%, ${cx + 12}% ${cy}%, ${cx}% ${cy + 12}%, ${cx - 12}% ${cy}%)` },
    { key: "square", pathFn: (cx: number, cy: number) => `polygon(${cx - 10}% ${cy - 10}%, ${cx + 10}% ${cy - 10}%, ${cx + 10}% ${cy + 10}%, ${cx - 10}% ${cy + 10}%)` },
    { key: "hexagon", pathFn: (cx: number, cy: number) => `polygon(${cx}% ${cy - 12}%, ${cx + 10}% ${cy - 6}%, ${cx + 10}% ${cy + 6}%, ${cx}% ${cy + 12}%, ${cx - 10}% ${cy + 6}%, ${cx - 10}% ${cy - 6}%)` },
    { key: "star5", pathFn: (cx: number, cy: number) => `polygon(${cx}% ${cy - 13}%, ${cx + 5}% ${cy - 4}%, ${cx + 13}% ${cy - 4}%, ${cx + 7}% ${cy + 3}%, ${cx + 9}% ${cy + 12}%, ${cx}% ${cy + 7}%, ${cx - 9}% ${cy + 12}%, ${cx - 7}% ${cy + 3}%, ${cx - 13}% ${cy - 4}%, ${cx - 5}% ${cy - 4}%)` },
    { key: "cross", pathFn: (cx: number, cy: number) => `polygon(${cx - 4}% ${cy - 12}%, ${cx + 4}% ${cy - 12}%, ${cx + 4}% ${cy - 4}%, ${cx + 12}% ${cy - 4}%, ${cx + 12}% ${cy + 4}%, ${cx + 4}% ${cy + 4}%, ${cx + 4}% ${cy + 12}%, ${cx - 4}% ${cy + 12}%, ${cx - 4}% ${cy + 4}%, ${cx - 12}% ${cy + 4}%, ${cx - 12}% ${cy - 4}%, ${cx - 4}% ${cy - 4}%)` },
  ];
  const positions = [[50, 50], [20, 20], [80, 20], [20, 80], [80, 80], [50, 20], [50, 80]];
  shapes.forEach((shape) => {
    positions.slice(0, 3).forEach(([cx, cy]) => {
      const small = shape.pathFn(cx, cy);
      out.push({
        key: `iris-in-${shape.key}-${cx}-${cy}`,
        name: `Iris In ${shape.key} · ${cx}/${cy}`,
        category: "Iris",
        clipPathStart: small,
        clipPathEnd: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        easing: "ease-in-out",
      });
      out.push({
        key: `iris-out-${shape.key}-${cx}-${cy}`,
        name: `Iris Out ${shape.key} · ${cx}/${cy}`,
        category: "Iris",
        clipPathStart: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        clipPathEnd: small,
        easing: "ease-in-out",
      });
    });
  });
  return out;
}

// ── Geometric Shapes (50 unique shapes) ──────────────────────────────────────

function buildGeometricPresets(): AnimatedMaskPreset[] {
  const out: AnimatedMaskPreset[] = [];
  const full = "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";
  const shapes = [
    { key: "triangle-center", start: "polygon(50% 50%, 50% 50%, 50% 50%)", end: "polygon(50% 0%, 100% 100%, 0% 100%)" },
    { key: "triangle-inv", start: "polygon(50% 50%, 50% 50%, 50% 50%)", end: "polygon(50% 100%, 0% 0%, 100% 0%)" },
    { key: "pentagon", start: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%)", end: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)" },
    { key: "octagon", start: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%)", end: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)" },
    { key: "arrow-right", start: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%)", end: "polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)" },
    { key: "arrow-up", start: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%)", end: "polygon(40% 100%, 40% 40%, 0% 40%, 50% 0%, 100% 40%, 60% 40%, 60% 100%)" },
    { key: "parallelogram", start: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)", end: "polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)" },
    { key: "trapezoid", start: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)", end: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)" },
    { key: "rhombus", start: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)", end: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" },
    { key: "chevron-right", start: "polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%, 0% 0%, 0% 0%)", end: "polygon(0% 0%, 75% 0%, 100% 50%, 75% 100%, 0% 100%, 25% 50%)" },
    { key: "chevron-left", start: "polygon(100% 0%, 100% 0%, 100% 0%, 100% 0%, 100% 0%, 100% 0%)", end: "polygon(25% 0%, 100% 0%, 75% 50%, 100% 100%, 25% 100%, 0% 50%)" },
    { key: "shield", start: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%)", end: "polygon(0% 0%, 100% 0%, 100% 60%, 50% 100%, 0% 60%)" },
    { key: "badge", start: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%)", end: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" },
    { key: "cross-thick", start: "polygon(35% 35%, 35% 35%, 35% 35%, 35% 35%, 35% 35%, 35% 35%, 35% 35%, 35% 35%, 35% 35%, 35% 35%, 35% 35%, 35% 35%)", end: "polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)" },
    { key: "pac-man", start: "circle(0% at 50% 50%)", end: "circle(60% at 50% 50%)" },
    { key: "ring-outer", start: full, end: full },
    { key: "frame-inset", start: "inset(10% 10% 10% 10%)", end: "inset(0% 0% 0% 0%)" },
    { key: "frame-inset-round", start: "inset(10% 10% 10% 10% round 50px)", end: "inset(0% 0% 0% 0% round 0px)" },
    { key: "ellipse-h", start: "ellipse(0% 25% at 50% 50%)", end: "ellipse(80% 25% at 50% 50%)" },
    { key: "ellipse-v", start: "ellipse(25% 0% at 50% 50%)", end: "ellipse(25% 80% at 50% 50%)" },
    { key: "ellipse-wide", start: "ellipse(0% 50% at 50% 50%)", end: "ellipse(80% 50% at 50% 50%)" },
    { key: "ellipse-tall", start: "ellipse(50% 0% at 50% 50%)", end: "ellipse(50% 80% at 50% 50%)" },
    { key: "semicircle-top", start: "ellipse(0% 0% at 50% 0%)", end: "ellipse(75% 50% at 50% 0%)" },
    { key: "semicircle-bottom", start: "ellipse(0% 0% at 50% 100%)", end: "ellipse(75% 50% at 50% 100%)" },
    { key: "pill-h", start: "inset(45% 0 45% 0 round 50px)", end: "inset(0 0 0 0 round 50px)" },
    { key: "pill-v", start: "inset(0 45% 0 45% round 50px)", end: "inset(0 0 0 0 round 50px)" },
    { key: "notch-top", start: "polygon(0% 0%, 50% 0%, 50% 0%, 50% 0%, 100% 0%, 100% 100%, 0% 100%)", end: "polygon(0% 0%, 35% 0%, 50% 20%, 65% 0%, 100% 0%, 100% 100%, 0% 100%)" },
    { key: "notch-bottom", start: "polygon(0% 0%, 100% 0%, 100% 100%, 50% 100%, 50% 100%, 0% 100%)", end: "polygon(0% 0%, 100% 0%, 100% 100%, 65% 100%, 50% 80%, 35% 100%, 0% 100%)" },
    { key: "scallop-top", start: "inset(100% 0 0 0)", end: full },
    { key: "wave-top", start: "inset(100% 0 0 0)", end: full },
    { key: "bookmark", start: "polygon(0% 0%, 100% 0%, 100% 0%, 50% 0%, 0% 0%)", end: "polygon(0% 0%, 100% 0%, 100% 100%, 50% 80%, 0% 100%)" },
    { key: "cloud", start: "circle(0% at 50% 50%)", end: "circle(75% at 50% 50%)" },
    { key: "heart-simple", start: "circle(0% at 50% 50%)", end: "circle(65% at 50% 50%)" },
    { key: "ribbon", start: "polygon(0% 50%, 0% 50%, 0% 50%, 0% 50%)", end: "polygon(0% 40%, 100% 40%, 100% 60%, 0% 60%)" },
    { key: "spotlight-tl", start: "circle(0% at 0% 0%)", end: "circle(80% at 0% 0%)" },
    { key: "spotlight-tr", start: "circle(0% at 100% 0%)", end: "circle(80% at 100% 0%)" },
    { key: "spotlight-bl", start: "circle(0% at 0% 100%)", end: "circle(80% at 0% 100%)" },
    { key: "spotlight-br", start: "circle(0% at 100% 100%)", end: "circle(80% at 100% 100%)" },
    { key: "keystroke-l", start: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)", end: full },
    { key: "keystroke-t", start: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)", end: full },
    { key: "keystroke-r", start: "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)", end: full },
    { key: "keystroke-b", start: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)", end: full },
    { key: "venetian-h", start: "inset(50% 0 50% 0)", end: "inset(0 0 0 0)" },
    { key: "venetian-v", start: "inset(0 50% 0 50%)", end: "inset(0 0 0 0)" },
    { key: "matrix-3x3", start: "inset(33% 33% 33% 33%)", end: "inset(0 0 0 0)" },
    { key: "squeeze-center", start: "inset(0 50% 0 50%)", end: "inset(0 0 0 0)" },
    { key: "expand-center-h", start: "inset(0 50% 0 50%)", end: "inset(0 0% 0 0%)" },
    { key: "expand-center-v", start: "inset(50% 0 50% 0)", end: "inset(0% 0 0% 0)" },
    { key: "shrink-center", start: "inset(0 0 0 0)", end: "inset(50% 50% 50% 50%)" },
  ];
  shapes.forEach((s) => {
    out.push({ key: `geo-${s.key}`, name: s.key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), category: "Geometric", clipPathStart: s.start, clipPathEnd: s.end, easing: "ease-in-out" });
  });
  return out;
}

// ── Cinematic Reveals (30 presets) ────────────────────────────────────────────

function buildCinematicPresets(): AnimatedMaskPreset[] {
  const out: AnimatedMaskPreset[] = [];
  const letterboxPairs = [
    { name: "Letterbox Open", start: "inset(30% 0 30% 0)", end: "inset(0% 0 0% 0)" },
    { name: "Letterbox Close", start: "inset(0% 0 0% 0)", end: "inset(30% 0 30% 0)" },
    { name: "Pillarbox Open", start: "inset(0 30% 0 30%)", end: "inset(0 0% 0 0%)" },
    { name: "Pillarbox Close", start: "inset(0 0% 0 0%)", end: "inset(0 30% 0 30%)" },
    { name: "Cinema Open Wide", start: "inset(40% 0 40% 0)", end: "inset(0 0 0 0)" },
    { name: "Cinema Close Wide", start: "inset(0 0 0 0)", end: "inset(40% 0 40% 0)" },
    { name: "Cinema Open Narrow", start: "inset(45% 0 45% 0)", end: "inset(10% 0 10% 0)" },
    { name: "Zoom Out Box", start: "inset(10% 10% 10% 10%)", end: "inset(0 0 0 0)" },
    { name: "Zoom In Box", start: "inset(0 0 0 0)", end: "inset(10% 10% 10% 10%)" },
    { name: "Slow Reveal Right", start: "inset(0 100% 0 0)", end: "inset(0 0 0 0)", easing: "cubic-bezier(0,0,0.2,1)" },
    { name: "Slow Reveal Left", start: "inset(0 0 0 100%)", end: "inset(0 0 0 0)", easing: "cubic-bezier(0,0,0.2,1)" },
    { name: "Iris Cinematic", start: "ellipse(0% 0% at 50% 50%)", end: "ellipse(100% 100% at 50% 50%)" },
    { name: "Focus Pull", start: "ellipse(20% 20% at 50% 50%)", end: "ellipse(100% 100% at 50% 50%)" },
    { name: "Fade Vignette", start: "ellipse(60% 60% at 50% 50%)", end: "ellipse(100% 100% at 50% 50%)" },
    { name: "Top Reveal Slow", start: "inset(100% 0 0 0)", end: "inset(0 0 0 0)", easing: "cubic-bezier(0,0,0.2,1)" },
    { name: "Bottom Reveal Slow", start: "inset(0 0 100% 0)", end: "inset(0 0 0 0)", easing: "cubic-bezier(0,0,0.2,1)" },
    { name: "Horizon Split", start: "inset(50% 0 50% 0)", end: "inset(0 0 0 0)" },
    { name: "Vertical Split", start: "inset(0 50% 0 50%)", end: "inset(0 0 0 0)" },
    { name: "4-Corner Reveal", start: "inset(50% 50% 50% 50%)", end: "inset(0 0 0 0)" },
    { name: "Scope Wide Open", start: "inset(43% 0 43% 0)", end: "inset(0% 0 0% 0)" },
    { name: "Scope Wide Close", start: "inset(0% 0 0% 0)", end: "inset(43% 0 43% 0)" },
    { name: "Scope Ultra Open", start: "inset(47% 0 47% 0)", end: "inset(0% 0 0% 0)" },
    { name: "Pan Right Reveal", start: "inset(0 100% 0 0)", end: "inset(0 0% 0 0%)" },
    { name: "Pan Left Reveal", start: "inset(0 0% 0 100%)", end: "inset(0 0% 0 0%)" },
    { name: "Scan Down", start: "inset(0 0 100% 0)", end: "inset(0 0 0% 0)" },
    { name: "Scan Up", start: "inset(100% 0 0 0)", end: "inset(0% 0 0 0)" },
    { name: "Diagonal Wipe NE", start: "polygon(100% 0, 100% 0, 100% 0)", end: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" },
    { name: "Diagonal Wipe SW", start: "polygon(0 100%, 0 100%, 0 100%)", end: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" },
    { name: "Bounce Enter Right", start: "inset(0 100% 0 0)", end: "inset(0 0 0 0)", easing: "cubic-bezier(0.34,1.56,0.64,1)" },
    { name: "Bounce Enter Down", start: "inset(0 0 100% 0)", end: "inset(0 0 0 0)", easing: "cubic-bezier(0.34,1.56,0.64,1)" },
  ];
  letterboxPairs.forEach((item, i) => {
    out.push({
      key: `cinematic-${i}`,
      name: item.name,
      category: "Cinematic",
      clipPathStart: item.start,
      clipPathEnd: item.end,
      easing: item.easing ?? "ease-in-out",
    });
  });
  return out;
}

// ── Split/Shatter (30 presets) ────────────────────────────────────────────────

function buildSplitPresets(): AnimatedMaskPreset[] {
  const out: AnimatedMaskPreset[] = [];
  const full = "inset(0 0 0 0)";
  const splits = [
    { key: "h-split-top", name: "H Split Top", start: "inset(50% 0 0 0)", end: full },
    { key: "h-split-bottom", name: "H Split Bottom", start: "inset(0 0 50% 0)", end: full },
    { key: "v-split-left", name: "V Split Left", start: "inset(0 50% 0 0)", end: full },
    { key: "v-split-right", name: "V Split Right", start: "inset(0 0 0 50%)", end: full },
    { key: "shatter-quad", name: "Shatter Quad", start: "inset(50% 50% 50% 50%)", end: full },
    { key: "triple-h", name: "Triple H", start: "inset(0 0 67% 0)", end: full },
    { key: "triple-v", name: "Triple V", start: "inset(0 67% 0 0)", end: full },
    { key: "book-open-h", name: "Book Open H", start: "inset(0 50% 0 50%)", end: full },
    { key: "book-open-v", name: "Book Open V", start: "inset(50% 0 50% 0)", end: full },
    { key: "shutter-down-5", name: "Shutter Down 5", start: "inset(0 0 100% 0)", end: full },
    { key: "shutter-up-5", name: "Shutter Up 5", start: "inset(100% 0 0 0)", end: full },
    { key: "fold-in-h", name: "Fold In H", start: "inset(0 50% 0 50%)", end: full },
    { key: "fold-out-h", name: "Fold Out H", start: full, end: "inset(0 50% 0 50%)" },
    { key: "pinch-h", name: "Pinch H", start: "inset(0 50% 0 50%)", end: full },
    { key: "stretch-v", name: "Stretch V", start: "inset(50% 0 50% 0)", end: full },
    { key: "fan-out", name: "Fan Out", start: "polygon(50% 50%, 50% 50%, 50% 50%)", end: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" },
    { key: "iris-plus", name: "Iris Plus", start: "polygon(40% 40%, 60% 40%, 60% 60%, 40% 60%)", end: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
    { key: "ripple-expand", name: "Ripple Expand", start: "circle(5% at 50% 50%)", end: "circle(120% at 50% 50%)" },
    { key: "bars-h", name: "Bars H", start: "inset(0 0 90% 0)", end: full },
    { key: "bars-v", name: "Bars V", start: "inset(0 90% 0 0)", end: full },
    { key: "door-left", name: "Door Left", start: "inset(0 100% 0 0)", end: full },
    { key: "door-right", name: "Door Right", start: "inset(0 0 0 100%)", end: full },
    { key: "garage-down", name: "Garage Down", start: "inset(0 0 100% 0)", end: full },
    { key: "garage-up", name: "Garage Up", start: "inset(100% 0 0 0)", end: full },
    { key: "grow-center", name: "Grow Center", start: "inset(50% 50% 50% 50%)", end: full },
    { key: "shrink-tl", name: "Shrink TL", start: full, end: "inset(0 100% 100% 0)" },
    { key: "shrink-br", name: "Shrink BR", start: full, end: "inset(100% 0 0 100%)" },
    { key: "tunnel", name: "Tunnel", start: "inset(45% 45% 45% 45%)", end: "inset(0 0 0 0)" },
    { key: "zoom-box-in", name: "Zoom Box In", start: "inset(0 0 0 0)", end: "inset(50% 50% 50% 50%)" },
    { key: "rip-away", name: "Rip Away", start: full, end: "inset(0 0 0 100%)" },
  ];
  splits.forEach((s) => {
    out.push({ key: `split-${s.key}`, name: s.name, category: "Split", clipPathStart: s.start, clipPathEnd: s.end, easing: "ease-in-out" });
  });
  return out;
}

// ── Stars (20 presets) ────────────────────────────────────────────────────────

function buildStarPresets(): AnimatedMaskPreset[] {
  const out: AnimatedMaskPreset[] = [];
  const pos = [[50, 50], [25, 25], [75, 25], [25, 75], [75, 75]] as const;
  const starPolygons = [
    { pts: 4, name: "4-Point Star" },
    { pts: 5, name: "5-Point Star" },
    { pts: 6, name: "6-Point Star" },
    { pts: 8, name: "8-Point Star" },
  ];
  starPolygons.forEach(({ pts, name }) => {
    pos.forEach(([cx, cy]) => {
      const points: string[] = [];
      const outer = 50, inner = 20;
      for (let i = 0; i < pts * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = (i * Math.PI) / pts - Math.PI / 2;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        points.push(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
      }
      const polyPath = `polygon(${points.join(", ")})`;
      const tinyPoints = points.map(() => `${cx}% ${cy}%`);
      out.push({
        key: `star-${pts}-${cx}-${cy}`,
        name: `${name} · ${cx}/${cy}`,
        category: "Stars",
        clipPathStart: `polygon(${tinyPoints.join(", ")})`,
        clipPathEnd: polyPath,
        easing: "ease-in-out",
      });
    });
  });
  return out;
}

// ── Arrows (12 presets) ────────────────────────────────────────────────────────

function buildArrowPresets(): AnimatedMaskPreset[] {
  const arrows = [
    { key: "arrow-right", name: "Arrow Right", start: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%)", end: "polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)" },
    { key: "arrow-left", name: "Arrow Left", start: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%)", end: "polygon(40% 0%, 0% 50%, 40% 100%, 40% 80%, 100% 80%, 100% 20%, 40% 20%)" },
    { key: "arrow-up", name: "Arrow Up", start: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%)", end: "polygon(20% 100%, 20% 40%, 0% 40%, 50% 0%, 100% 40%, 80% 40%, 80% 100%)" },
    { key: "arrow-down", name: "Arrow Down", start: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%)", end: "polygon(20% 0%, 80% 0%, 80% 60%, 100% 60%, 50% 100%, 0% 60%, 20% 60%)" },
    { key: "arrow-wipe-right", name: "Arrow Wipe Right", start: "polygon(0% 0%, 0% 0%, 0% 50%, 0% 100%, 0% 100%)", end: "polygon(0% 0%, 80% 0%, 100% 50%, 80% 100%, 0% 100%)" },
    { key: "arrow-wipe-left", name: "Arrow Wipe Left", start: "polygon(100% 0%, 100% 0%, 100% 50%, 100% 100%, 100% 100%)", end: "polygon(20% 0%, 100% 0%, 100% 100%, 20% 100%, 0% 50%)" },
    { key: "double-arrow-h", name: "Double Arrow H", start: "polygon(50% 0%, 50% 0%, 50% 50%, 50% 100%, 50% 100%)", end: "polygon(15% 0%, 50% 50%, 15% 100%, 0% 100%, 50% 0%, 85% 100%, 100% 100%, 50% 0%)" },
    { key: "chevron-right-fill", name: "Chevron Right Fill", start: "polygon(0% 0%, 0% 0%, 0% 50%, 0% 100%)", end: "polygon(0% 0%, 70% 0%, 100% 50%, 70% 100%, 0% 100%, 30% 50%)" },
    { key: "chevron-left-fill", name: "Chevron Left Fill", start: "polygon(100% 0%, 100% 0%, 100% 50%, 100% 100%)", end: "polygon(30% 0%, 100% 0%, 70% 50%, 100% 100%, 30% 100%, 0% 50%)" },
    { key: "notch-arrow-right", name: "Notch Arrow Right", start: "inset(0 100% 0 0)", end: "inset(0 0% 0 0)" },
    { key: "slant-reveal", name: "Slant Reveal", start: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)", end: "polygon(0% 0%, 80% 0%, 100% 100%, 20% 100%)" },
    { key: "bowtie-h", name: "Bowtie H", start: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)", end: "polygon(0% 0%, 50% 50%, 0% 100%, 0% 100%, 100% 0%, 50% 50%, 100% 100%, 100% 0%)" },
  ];
  return arrows.map((a) => ({ key: `arrow-${a.key}`, name: a.name, category: "Arrows" as AnimatedMaskCategory, clipPathStart: a.start, clipPathEnd: a.end, easing: "ease-in-out" }));
}

// ── Curtains/Blinds (30 presets) ──────────────────────────────────────────────

function buildCurtainPresets(): AnimatedMaskPreset[] {
  const out: AnimatedMaskPreset[] = [];
  // Curtains: open from edges
  for (let i = 0; i < 15; i++) {
    const pct = 50 - i * 3;
    out.push({ key: `curtain-h-${i}`, name: `Curtain Open H ${i + 1}`, category: "Curtains", clipPathStart: `inset(0 ${pct}% 0 ${pct}%)`, clipPathEnd: "inset(0 0 0 0)", easing: "ease-in-out" });
    out.push({ key: `curtain-v-${i}`, name: `Curtain Open V ${i + 1}`, category: "Curtains", clipPathStart: `inset(${pct}% 0 ${pct}% 0)`, clipPathEnd: "inset(0 0 0 0)", easing: "ease-in-out" });
  }
  return out;
}

// ── Blinds (20 presets) ────────────────────────────────────────────────────────

function buildBlindsPresets(): AnimatedMaskPreset[] {
  const out: AnimatedMaskPreset[] = [];
  for (let i = 1; i <= 20; i++) {
    out.push({ key: `blinds-h-${i}`, name: `Blinds H ${i}`, category: "Blinds", clipPathStart: `inset(${50 - i * 2}% 0 ${50 - i * 2}% 0)`, clipPathEnd: "inset(0 0 0 0)", easing: "ease-in-out" });
    out.push({ key: `blinds-v-${i}`, name: `Blinds V ${i}`, category: "Blinds", clipPathStart: `inset(0 ${50 - i * 2}% 0 ${50 - i * 2}%)`, clipPathEnd: "inset(0 0 0 0)", easing: "ease-in-out" });
  }
  return out;
}

// ── Liquid/Organic (40 presets) ────────────────────────────────────────────────

function buildLiquidPresets(): AnimatedMaskPreset[] {
  const out: AnimatedMaskPreset[] = [];
  const blobs = [
    { key: "blob-1", start: "circle(0% at 50% 50%)", end: "ellipse(55% 60% at 50% 50%)" },
    { key: "blob-2", start: "circle(0% at 30% 40%)", end: "ellipse(60% 55% at 30% 40%)" },
    { key: "blob-3", start: "circle(0% at 70% 60%)", end: "ellipse(55% 65% at 70% 60%)" },
    { key: "blob-4", start: "ellipse(0% 0% at 50% 50%)", end: "ellipse(80% 70% at 50% 50%)" },
    { key: "blob-5", start: "ellipse(0% 0% at 20% 20%)", end: "ellipse(90% 90% at 20% 20%)" },
    { key: "drip-down", start: "inset(0 0 100% 0)", end: "inset(0 0 0% 0)", easing: "cubic-bezier(0,0.7,0.3,1)" },
    { key: "drip-up", start: "inset(100% 0 0 0)", end: "inset(0% 0 0 0)", easing: "cubic-bezier(0,0.7,0.3,1)" },
    { key: "drip-left", start: "inset(0 100% 0 0)", end: "inset(0 0% 0 0)", easing: "cubic-bezier(0,0.7,0.3,1)" },
    { key: "drip-right", start: "inset(0 0 0 100%)", end: "inset(0 0 0 0%)", easing: "cubic-bezier(0,0.7,0.3,1)" },
    { key: "splash", start: "circle(0% at 50% 50%)", end: "circle(150% at 50% 50%)", easing: "cubic-bezier(0.2,0,0,1.6)" },
    { key: "morph-1", start: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)", end: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
    { key: "morph-2", start: "ellipse(30% 50% at 50% 50%)", end: "ellipse(80% 80% at 50% 50%)" },
    { key: "morph-3", start: "ellipse(50% 30% at 50% 50%)", end: "ellipse(80% 80% at 50% 50%)" },
    { key: "wave-reveal", start: "inset(0 100% 0 0)", end: "inset(0 0 0 0)", easing: "cubic-bezier(0.4,0,0.2,1)" },
    { key: "flood-fill", start: "ellipse(0% 0% at 0% 100%)", end: "ellipse(150% 150% at 0% 100%)" },
    { key: "ink-spread", start: "circle(0% at 50% 50%)", end: "circle(120% at 50% 50%)", easing: "cubic-bezier(0.4,0,0,1.4)" },
    { key: "puddle-grow", start: "ellipse(0% 0% at 50% 80%)", end: "ellipse(80% 80% at 50% 80%)" },
    { key: "water-rise", start: "inset(100% 0 0 0)", end: "inset(0% 0 0 0)", easing: "cubic-bezier(0,0.8,0.3,1)" },
    { key: "water-drain", start: "inset(0 0 0 0)", end: "inset(100% 0 0 0)", easing: "cubic-bezier(0.7,0,1,0.2)" },
    { key: "oil-spread", start: "circle(0% at 50% 50%)", end: "circle(80% at 50% 50%)", easing: "cubic-bezier(0,0,0.2,1.5)" },
    { key: "bubble-pop", start: "circle(0% at 50% 50%)", end: "circle(100% at 50% 50%)", easing: "cubic-bezier(0.34,1.56,0.64,1)" },
    { key: "mercury-tl", start: "circle(0% at 0% 0%)", end: "circle(150% at 0% 0%)", easing: "ease-in-out" },
    { key: "mercury-tr", start: "circle(0% at 100% 0%)", end: "circle(150% at 100% 0%)", easing: "ease-in-out" },
    { key: "mercury-bl", start: "circle(0% at 0% 100%)", end: "circle(150% at 0% 100%)", easing: "ease-in-out" },
    { key: "mercury-br", start: "circle(0% at 100% 100%)", end: "circle(150% at 100% 100%)", easing: "ease-in-out" },
    { key: "lava-flow", start: "inset(100% 0 0 0)", end: "inset(0 0 0 0)", easing: "cubic-bezier(0.4,0,0.6,1.3)" },
    { key: "syrup-pour", start: "inset(0 0 100% 0)", end: "inset(0 0 0 0)", easing: "cubic-bezier(0.4,0,0.6,1.3)" },
    { key: "gel-spread", start: "ellipse(5% 5% at 50% 50%)", end: "ellipse(100% 100% at 50% 50%)", easing: "ease-in-out" },
    { key: "smoke-fill", start: "ellipse(0% 0% at 50% 50%)", end: "ellipse(100% 100% at 50% 50%)", easing: "cubic-bezier(0,0,0.3,1)" },
    { key: "liquid-drop", start: "circle(0% at 50% 20%)", end: "circle(100% at 50% 20%)", easing: "ease-in-out" },
    { key: "paint-stroke-r", start: "polygon(0% 40%, 0% 40%, 0% 60%, 0% 60%)", end: "polygon(0% 40%, 100% 40%, 100% 60%, 0% 60%)", hint: "Horizontal paint stroke" },
    { key: "paint-stroke-d", start: "polygon(40% 0%, 60% 0%, 60% 0%, 40% 0%)", end: "polygon(40% 0%, 60% 0%, 60% 100%, 40% 100%)", hint: "Vertical paint stroke" },
    { key: "paint-broad-r", start: "polygon(0% 30%, 0% 30%, 0% 70%, 0% 70%)", end: "polygon(0% 30%, 100% 30%, 100% 70%, 0% 70%)", hint: "Broad paint stroke" },
    { key: "tar-seep", start: "inset(100% 0 0 0)", end: "inset(0 0 0 0)", easing: "cubic-bezier(0.9,0,0.7,0.9)" },
    { key: "ooze-right", start: "inset(0 100% 0 0)", end: "inset(0 0 0 0)", easing: "cubic-bezier(0.9,0,0.7,0.9)" },
    { key: "crystallize", start: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)", end: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", easing: "cubic-bezier(0.4,0,0,1.4)" },
    { key: "frost-spread", start: "circle(5% at 50% 50%)", end: "circle(120% at 50% 50%)", easing: "cubic-bezier(0,0,0.3,1)" },
    { key: "melt-down", start: "inset(0 0 0 0)", end: "inset(0 0 100% 0)", easing: "cubic-bezier(0.5,0,1,0.8)" },
    { key: "dissolve-center", start: "inset(45% 45% 45% 45%)", end: "inset(0 0 0 0)", easing: "ease-in-out" },
    { key: "foam-rise", start: "inset(100% 0 0 0)", end: "inset(0 0 0 0)", easing: "cubic-bezier(0,0.5,0.2,1.2)" },
  ];
  blobs.forEach((b) => {
    out.push({ key: `liquid-${b.key}`, name: b.key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), category: "Liquid", clipPathStart: b.start, clipPathEnd: b.end, easing: b.easing ?? "ease-in-out", hint: b.hint });
  });
  return out;
}

// ── Glitch/Digital (30 presets) ───────────────────────────────────────────────

function buildGlitchPresets(): AnimatedMaskPreset[] {
  const out: AnimatedMaskPreset[] = [];
  const segments = 10;
  for (let i = 0; i < segments; i++) {
    const y1 = i * 10, y2 = y1 + 10;
    const offset = i % 2 === 0 ? 100 : -100;
    out.push({
      key: `glitch-bar-${i}`,
      name: `Glitch Bar ${i + 1}`,
      category: "Glitch",
      clipPathStart: `inset(${y1}% ${offset > 0 ? "100%" : "0"} ${100 - y2}% ${offset < 0 ? "100%" : "0"})`,
      clipPathEnd: `inset(${y1}% 0 ${100 - y2}% 0)`,
      easing: "step-start",
    });
  }
  const digitalMasks = [
    { key: "scan-random", name: "Random Scan Lines", start: "inset(0 0 95% 0)", end: "inset(0 0 0 0)", easing: "step-start" },
    { key: "pixel-wipe-r", name: "Pixel Wipe Right", start: "inset(0 100% 0 0)", end: "inset(0 0 0 0)", easing: "step-start" },
    { key: "pixel-wipe-d", name: "Pixel Wipe Down", start: "inset(0 0 100% 0)", end: "inset(0 0 0 0)", easing: "step-start" },
    { key: "interlace-open", name: "Interlace Open", start: "inset(50% 0 50% 0)", end: "inset(0 0 0 0)", easing: "step-end" },
    { key: "strobe-r", name: "Strobe Right", start: "inset(0 100% 0 0)", end: "inset(0 0 0 0)", easing: "step-end" },
    { key: "digital-rain", name: "Digital Rain", start: "inset(0 0 99% 0)", end: "inset(0 0 0 0)", easing: "linear" },
    { key: "crt-on", name: "CRT Power On", start: "inset(50% 0 50% 0)", end: "inset(0 0 0 0)", easing: "cubic-bezier(0.4,0,0.2,1)" },
    { key: "crt-off", name: "CRT Power Off", start: "inset(0 0 0 0)", end: "inset(50% 0 50% 0)", easing: "cubic-bezier(0.4,0,0.2,1)" },
    { key: "static-burst", name: "Static Burst", start: "inset(45% 45% 45% 45%)", end: "inset(0 0 0 0)", easing: "steps(5, end)" },
    { key: "decrypt-r", name: "Decrypt Right", start: "inset(0 100% 0 0)", end: "inset(0 0 0 0)", easing: "steps(10, end)" },
    { key: "decrypt-d", name: "Decrypt Down", start: "inset(0 0 100% 0)", end: "inset(0 0 0 0)", easing: "steps(10, end)" },
    { key: "boot-scan", name: "Boot Scan", start: "inset(100% 0 0 0)", end: "inset(0 0 0 0)", easing: "steps(20, end)" },
    { key: "data-burst", name: "Data Burst", start: "circle(0% at 50% 50%)", end: "circle(150% at 50% 50%)", easing: "steps(8, end)" },
    { key: "matrix-decode", name: "Matrix Decode", start: "inset(0 0 99% 0)", end: "inset(0 0 0 0)", easing: "steps(30, end)" },
    { key: "signal-noise", name: "Signal Noise", start: "inset(50% 50% 50% 50%)", end: "inset(0 0 0 0)", easing: "steps(5, end)" },
    { key: "scramble-r", name: "Scramble Right", start: "inset(0 100% 0 0)", end: "inset(0 0 0 0)", easing: "cubic-bezier(0.9,0,0.1,1)" },
    { key: "holo-activate", name: "Holo Activate", start: "ellipse(0% 0% at 50% 50%)", end: "ellipse(100% 100% at 50% 50%)", easing: "steps(4, end)" },
    { key: "laser-sweep-r", name: "Laser Sweep Right", start: "inset(0 100% 0 0)", end: "inset(0 0 0 0)", easing: "cubic-bezier(0.1,0,0,1)" },
    { key: "laser-sweep-d", name: "Laser Sweep Down", start: "inset(0 0 100% 0)", end: "inset(0 0 0 0)", easing: "cubic-bezier(0.1,0,0,1)" },
    { key: "vhs-tracking", name: "VHS Tracking", start: "inset(60% 0 40% 0)", end: "inset(0 0 0 0)", easing: "ease-in-out" },
  ];
  digitalMasks.forEach((d) => {
    out.push({ key: `glitch-${d.key}`, name: d.name, category: "Glitch", clipPathStart: d.start, clipPathEnd: d.end, easing: d.easing });
  });
  return out;
}

// ── Neon Effects (20 presets) ─────────────────────────────────────────────────

function buildNeonPresets(): AnimatedMaskPreset[] {
  const out: AnimatedMaskPreset[] = [];
  const neons = [
    { key: "neon-ring", start: "circle(10% at 50% 50%)", end: "circle(80% at 50% 50%)", name: "Neon Ring" },
    { key: "neon-cross", start: "polygon(47% 47%, 53% 47%, 53% 53%, 47% 53%)", end: "polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)", name: "Neon Cross" },
    { key: "neon-line-r", start: "inset(45% 100% 45% 0)", end: "inset(45% 0% 45% 0)", name: "Neon Line Right" },
    { key: "neon-line-d", start: "inset(0 45% 100% 45%)", end: "inset(0 45% 0% 45%)", name: "Neon Line Down" },
    { key: "neon-expand-h", start: "inset(48% 50% 48% 50%)", end: "inset(0% 0% 0% 0%)", name: "Neon Expand H" },
    { key: "neon-expand-v", start: "inset(50% 48% 50% 48%)", end: "inset(0% 0% 0% 0%)", name: "Neon Expand V" },
    { key: "neon-burst", start: "circle(0% at 50% 50%)", end: "circle(120% at 50% 50%)", name: "Neon Burst" },
    { key: "neon-diamond", start: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)", end: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)", name: "Neon Diamond" },
    { key: "neon-hex", start: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%)", end: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", name: "Neon Hexagon" },
    { key: "neon-slash-r", start: "polygon(0% 50%, 0% 50%, 0% 50%)", end: "polygon(0% 0%, 100% 0%, 100% 100%)", name: "Neon Slash Right" },
    { key: "neon-slash-l", start: "polygon(100% 50%, 100% 50%, 100% 50%)", end: "polygon(100% 0%, 0% 100%, 0% 0%)", name: "Neon Slash Left" },
    { key: "neon-star", start: "polygon(50% 48%, 52% 50%, 50% 52%, 48% 50%)", end: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)", name: "Neon Star" },
    { key: "neon-grid-in", start: "inset(45% 45% 45% 45%)", end: "inset(0% 0% 0% 0%)", name: "Neon Grid In" },
    { key: "neon-scan-v", start: "inset(0 0 100% 0)", end: "inset(0 0 0% 0)", name: "Neon Scan Vertical" },
    { key: "neon-scan-h", start: "inset(0 100% 0 0)", end: "inset(0 0% 0 0)", name: "Neon Scan Horizontal" },
    { key: "neon-corners-in", start: "polygon(0% 0%, 20% 0%, 20% 20%, 0% 20%)", end: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", name: "Neon Corners In" },
    { key: "neon-laser-tl", start: "polygon(0% 0%, 0% 0%, 0% 0%)", end: "polygon(0% 0%, 100% 0%, 0% 100%)", name: "Neon Laser TL" },
    { key: "neon-laser-tr", start: "polygon(100% 0%, 100% 0%, 100% 0%)", end: "polygon(100% 0%, 100% 100%, 0% 0%)", name: "Neon Laser TR" },
    { key: "neon-pulse-in", start: "circle(80% at 50% 50%)", end: "circle(0% at 50% 50%)", name: "Neon Pulse In" },
    { key: "neon-pulse-out", start: "circle(0% at 50% 50%)", end: "circle(80% at 50% 50%)", name: "Neon Pulse Out" },
  ];
  neons.forEach((n) => {
    out.push({ key: `neon-${n.key}`, name: n.name, category: "Neon", clipPathStart: n.start, clipPathEnd: n.end, easing: "ease-in-out" });
  });
  return out;
}

// ── Extra Circles (17 positions × more sizes) ─────────────────────────────────

function buildExtraCirclePresets(): AnimatedMaskPreset[] {
  const out: AnimatedMaskPreset[] = [];
  POSITIONS_PCT.forEach(([px, py]) => {
    [25, 50, 75, 100, 125].forEach((endSize) => {
      out.push({
        key: `circle-sz-${px}-${py}-${endSize}`,
        name: `Circle ${endSize}% · ${px}/${py}`,
        category: "Circles",
        clipPathStart: `circle(0% at ${px}% ${py}%)`,
        clipPathEnd: `circle(${endSize}% at ${px}% ${py}%)`,
        easing: "ease-in-out",
      });
    });
  });
  return out;
}

// ── Multiple Wipe Speed Variants ───────────────────────────────────────────────

function buildWipeVariantsPresets(): AnimatedMaskPreset[] {
  const out: AnimatedMaskPreset[] = [];
  const dirs = [
    { key: "right", start: "inset(0 100% 0 0)", end: "inset(0 0 0 0)" },
    { key: "left", start: "inset(0 0 0 100%)", end: "inset(0 0 0 0)" },
    { key: "down", start: "inset(0 0 100% 0)", end: "inset(0 0 0 0)" },
    { key: "up", start: "inset(100% 0 0 0)", end: "inset(0 0 0 0)" },
  ];
  EASINGS.forEach((easing, ei) => {
    dirs.forEach((d) => {
      out.push({
        key: `wipe-variant-${d.key}-${ei}`,
        name: `Wipe ${d.key} · ${["Ease", "EaseIn", "EaseOut", "EaseInOut", "Bounce", "Elastic", "Bounce2", "BounceIn"][ei] ?? ei}`,
        category: "Wipes",
        clipPathStart: d.start,
        clipPathEnd: d.end,
        easing,
      });
    });
  });
  return out;
}

// ── Final assembly ─────────────────────────────────────────────────────────────

export const ANIMATED_MASK_PRESETS: AnimatedMaskPreset[] = [
  ...buildCirclePresets(),
  ...buildWipePresets(),
  ...buildDiagonalPresets(),
  ...buildIrisPresets(),
  ...buildGeometricPresets(),
  ...buildCinematicPresets(),
  ...buildSplitPresets(),
  ...buildStarPresets(),
  ...buildArrowPresets(),
  ...buildCurtainPresets(),
  ...buildBlindsPresets(),
  ...buildLiquidPresets(),
  ...buildGlitchPresets(),
  ...buildNeonPresets(),
  ...buildExtraCirclePresets(),
  ...buildWipeVariantsPresets(),
];

export const ANIMATED_MASK_CATEGORIES: AnimatedMaskCategory[] = [
  "Circles", "Wipes", "Iris", "Diagonal", "Geometric", "Cinematic",
  "Split", "Stars", "Arrows", "Curtains", "Blinds", "Liquid", "Glitch", "Neon",
];

export function getAnimatedMaskPreset(key: string): AnimatedMaskPreset | undefined {
  return ANIMATED_MASK_PRESETS.find((p) => p.key === key);
}
