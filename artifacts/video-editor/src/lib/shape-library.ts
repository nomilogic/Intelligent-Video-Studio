/**
 * 50 vector shapes used by `mediaType: "shape"` clips. Each shape is a
 * single SVG `<path d="...">` (or `<polygon>` / `<rect>` etc) defined in a
 * 100×100 viewBox so the renderer can scale it into any clip rectangle
 * without distortion math.
 *
 * Render path:
 *   - Live preview (Canvas.tsx): inline `<svg viewBox="0 0 100 100"
 *     preserveAspectRatio="none">` with the path, sized to the clip rect.
 *   - Export (use-export.ts): builds an SVG string at runtime, turns it
 *     into a data: URL, draws into the per-clip transform.
 *
 * Adding a new shape is data-only: append an entry here and it shows up
 * in the Shapes panel and is selectable from the Properties inspector
 * with no other code changes.
 */

export type ShapeCategory =
  | "Basic"
  | "Geometric"
  | "Stars"
  | "Arrows"
  | "Hearts"
  | "Symbols"
  | "Badges"
  | "Decorative";

export interface ShapeDef {
  /** Stable id used in `clip.shapeKind` and AI schema — never change. */
  key: string;
  /** Human-readable name shown in pickers. */
  name: string;
  category: ShapeCategory;
  /** Inner SVG markup (paths, polygons, etc), all in a 100×100 viewBox. */
  svg: string;
}

// Shorthand path-only entries to keep the list compact.
const p = (d: string): string => `<path d="${d}" />`;
const poly = (pts: string): string => `<polygon points="${pts}" />`;

export const SHAPE_LIBRARY: ShapeDef[] = [
  // ── Basic (8) ─────────────────────────────────────────────────────────
  { key: "rect",            name: "Rectangle",       category: "Basic",      svg: `<rect x="0" y="0" width="100" height="100" />` },
  { key: "rounded",         name: "Rounded Rect",    category: "Basic",      svg: `<rect x="2" y="2" width="96" height="96" rx="14" ry="14" />` },
  { key: "circle",          name: "Circle",          category: "Basic",      svg: `<circle cx="50" cy="50" r="48" />` },
  { key: "ellipse",         name: "Ellipse",         category: "Basic",      svg: `<ellipse cx="50" cy="50" rx="48" ry="32" />` },
  { key: "triangleUp",      name: "Triangle Up",     category: "Basic",      svg: poly("50,4 96,92 4,92") },
  { key: "triangleDown",    name: "Triangle Down",   category: "Basic",      svg: poly("4,8 96,8 50,96") },
  { key: "diamond",         name: "Diamond",         category: "Basic",      svg: poly("50,4 96,50 50,96 4,50") },
  { key: "squircle",        name: "Squircle",        category: "Basic",      svg: p("M50 4 C 86 4 96 14 96 50 C 96 86 86 96 50 96 C 14 96 4 86 4 50 C 4 14 14 4 50 4 Z") },
  // ── Geometric (8) ─────────────────────────────────────────────────────
  { key: "pentagon",        name: "Pentagon",        category: "Geometric",  svg: poly("50,4 96,38 78,92 22,92 4,38") },
  { key: "hexagon",         name: "Hexagon",         category: "Geometric",  svg: poly("28,6 72,6 96,50 72,94 28,94 4,50") },
  { key: "heptagon",        name: "Heptagon",        category: "Geometric",  svg: poly("50,4 89,22 96,62 72,94 28,94 4,62 11,22") },
  { key: "octagon",         name: "Octagon",         category: "Geometric",  svg: poly("30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30") },
  { key: "decagon",         name: "Decagon",         category: "Geometric",  svg: poly("50,4 78,12 95,35 95,65 78,88 50,96 22,88 5,65 5,35 22,12") },
  { key: "trapezoid",       name: "Trapezoid",       category: "Geometric",  svg: poly("20,8 80,8 96,92 4,92") },
  { key: "parallelogram",   name: "Parallelogram",   category: "Geometric",  svg: poly("20,8 96,8 80,92 4,92") },
  { key: "rhombusH",        name: "Rhombus H",       category: "Geometric",  svg: poly("4,50 30,8 96,50 70,92") },
  // ── Stars (6) ─────────────────────────────────────────────────────────
  { key: "star4",           name: "4-Star",          category: "Stars",      svg: poly("50,4 60,40 96,50 60,60 50,96 40,60 4,50 40,40") },
  { key: "star5",           name: "5-Star",          category: "Stars",      svg: poly("50,4 61,38 97,38 68,59 79,93 50,72 21,93 32,59 3,38 39,38") },
  { key: "star6",           name: "6-Star",          category: "Stars",      svg: poly("50,4 60,32 92,32 66,52 76,84 50,64 24,84 34,52 8,32 40,32") },
  { key: "star8",           name: "8-Star",          category: "Stars",      svg: poly("50,4 58,30 80,16 75,40 96,50 75,60 80,84 58,70 50,96 42,70 20,84 25,60 4,50 25,40 20,16 42,30") },
  { key: "burst",           name: "Sun Burst",       category: "Stars",      svg: poly("50,2 56,18 70,8 65,26 84,22 72,38 92,40 76,52 96,62 76,64 88,80 70,76 76,94 60,84 58,98 50,84 42,98 40,84 24,94 30,76 12,80 24,64 4,62 24,52 8,40 28,38 16,22 35,26 30,8 44,18") },
  { key: "sparkle",         name: "Sparkle",         category: "Stars",      svg: p("M50 4 C 52 35 65 48 96 50 C 65 52 52 65 50 96 C 48 65 35 52 4 50 C 35 48 48 35 50 4 Z") },
  // ── Arrows (8) ────────────────────────────────────────────────────────
  { key: "arrowRight",      name: "Arrow Right",     category: "Arrows",     svg: poly("4,38 60,38 60,18 96,50 60,82 60,62 4,62") },
  { key: "arrowLeft",       name: "Arrow Left",      category: "Arrows",     svg: poly("96,38 40,38 40,18 4,50 40,82 40,62 96,62") },
  { key: "arrowUp",         name: "Arrow Up",        category: "Arrows",     svg: poly("38,96 38,40 18,40 50,4 82,40 62,40 62,96") },
  { key: "arrowDown",       name: "Arrow Down",      category: "Arrows",     svg: poly("38,4 38,60 18,60 50,96 82,60 62,60 62,4") },
  { key: "arrowDoubleH",    name: "Double Arrow",    category: "Arrows",     svg: poly("4,50 24,30 24,42 76,42 76,30 96,50 76,70 76,58 24,58 24,70") },
  { key: "arrowReturn",     name: "Return Arrow",    category: "Arrows",     svg: p("M10 50 L 40 20 L 40 36 L 80 36 L 80 80 L 60 80 L 60 56 L 40 56 L 40 80 Z") },
  { key: "chevronRight",    name: "Chevron Right",   category: "Arrows",     svg: poly("20,12 80,50 20,88 32,88 92,50 32,12") },
  { key: "chevronLeft",     name: "Chevron Left",    category: "Arrows",     svg: poly("80,12 20,50 80,88 68,88 8,50 68,12") },
  // ── Hearts (3) ────────────────────────────────────────────────────────
  { key: "heart",           name: "Heart",           category: "Hearts",     svg: p("M50 90 C 20 70 4 50 4 30 C 4 14 16 4 30 4 C 40 4 46 10 50 18 C 54 10 60 4 70 4 C 84 4 96 14 96 30 C 96 50 80 70 50 90 Z") },
  { key: "heartBroken",     name: "Heart Broken",    category: "Hearts",     svg: p("M50 90 L 38 60 L 56 50 L 42 30 L 50 18 C 46 10 40 4 30 4 C 16 4 4 14 4 30 C 4 50 20 70 50 90 Z M50 18 C 54 10 60 4 70 4 C 84 4 96 14 96 30 C 96 50 80 70 50 90 L 60 60 L 44 50 L 56 30 Z") },
  { key: "heartOutline",    name: "Heart Outline",   category: "Hearts",     svg: `<path d="M50 90 C 20 70 4 50 4 30 C 4 14 16 4 30 4 C 40 4 46 10 50 18 C 54 10 60 4 70 4 C 84 4 96 14 96 30 C 96 50 80 70 50 90 Z M50 78 C 24 60 16 46 16 32 C 16 22 22 16 30 16 C 38 16 44 22 50 32 C 56 22 62 16 70 16 C 78 16 84 22 84 32 C 84 46 76 60 50 78 Z" fill-rule="evenodd" />` },
  // ── Symbols (8) ───────────────────────────────────────────────────────
  { key: "plus",            name: "Plus",            category: "Symbols",    svg: poly("38,4 62,4 62,38 96,38 96,62 62,62 62,96 38,96 38,62 4,62 4,38 38,38") },
  { key: "minus",           name: "Minus",           category: "Symbols",    svg: `<rect x="4" y="38" width="92" height="24" />` },
  { key: "cross",           name: "Cross (X)",       category: "Symbols",    svg: poly("18,4 50,36 82,4 96,18 64,50 96,82 82,96 50,64 18,96 4,82 36,50 4,18") },
  { key: "check",           name: "Check Mark",      category: "Symbols",    svg: poly("8,52 30,74 88,16 96,24 30,90 0,60") },
  { key: "ring",            name: "Ring",            category: "Symbols",    svg: `<path d="M50 4 a46 46 0 1 0 0.1 0 Z M50 24 a26 26 0 1 1 -0.1 0 Z" fill-rule="evenodd" />` },
  { key: "halfCircle",      name: "Half Circle",     category: "Symbols",    svg: p("M4 50 A 46 46 0 0 1 96 50 Z") },
  { key: "quarterCircle",   name: "Quarter Circle",  category: "Symbols",    svg: p("M4 96 A 92 92 0 0 1 96 4 L 4 4 Z") },
  { key: "infinity",        name: "Infinity",        category: "Symbols",    svg: p("M22 50 C 22 32 38 32 50 50 C 62 68 78 68 78 50 C 78 32 62 32 50 50 C 38 68 22 68 22 50 Z") },
  // ── Badges (4) ────────────────────────────────────────────────────────
  { key: "shield",          name: "Shield",          category: "Badges",     svg: p("M50 4 L 90 14 L 90 52 C 90 76 70 90 50 96 C 30 90 10 76 10 52 L 10 14 Z") },
  { key: "ribbon",          name: "Ribbon",          category: "Badges",     svg: poly("4,12 96,12 96,68 78,68 96,96 50,76 4,96 22,68 4,68") },
  { key: "tag",             name: "Tag",             category: "Badges",     svg: p("M4 30 L 30 4 L 96 4 L 96 70 L 70 96 L 4 96 Z M 18 18 a 6 6 0 1 1 0 0.1 Z") },
  { key: "speech",          name: "Speech Bubble",   category: "Badges",     svg: p("M4 14 C 4 8 8 4 14 4 L 86 4 C 92 4 96 8 96 14 L 96 64 C 96 70 92 74 86 74 L 50 74 L 30 92 L 30 74 L 14 74 C 8 74 4 70 4 64 Z") },
  // ── Decorative (5) ────────────────────────────────────────────────────
  { key: "blob1",           name: "Blob 1",          category: "Decorative", svg: p("M28 8 C 56 4 80 14 92 38 C 100 64 84 88 56 94 C 30 100 6 82 4 56 C 2 32 12 12 28 8 Z") },
  { key: "blob2",           name: "Blob 2",          category: "Decorative", svg: p("M50 4 C 78 6 96 30 92 56 C 88 84 64 96 40 92 C 16 88 0 64 8 38 C 14 18 30 4 50 4 Z") },
  { key: "cloud",           name: "Cloud",           category: "Decorative", svg: p("M28 70 C 12 70 4 60 4 50 C 4 38 14 30 26 30 C 28 18 38 10 52 10 C 66 10 76 22 76 32 C 90 32 96 42 96 52 C 96 64 86 70 74 70 Z") },
  { key: "leaf",            name: "Leaf",            category: "Decorative", svg: p("M4 96 C 4 50 50 4 96 4 C 96 50 50 96 4 96 Z M 20 80 L 80 20") },
  { key: "drop",            name: "Drop",            category: "Decorative", svg: p("M50 4 C 70 32 90 56 90 70 C 90 86 76 96 50 96 C 24 96 10 86 10 70 C 10 56 30 32 50 4 Z") },
];

export const SHAPE_CATEGORIES: ShapeCategory[] = [
  "Basic", "Geometric", "Stars", "Arrows", "Hearts", "Symbols", "Badges", "Decorative",
];

export function getShape(key: string | undefined): ShapeDef | null {
  if (!key) return null;
  return SHAPE_LIBRARY.find((s) => s.key === key) ?? null;
}

/**
 * Build a self-contained SVG document string for a shape at a given fill
 * and (optional) stroke. `preserveAspectRatio="none"` so the shape
 * stretches to fill the bounding box exactly — matching the clip rect.
 */
export function buildShapeSvg(
  shape: ShapeDef,
  fillCss: string,
  strokeCss?: string,
  strokeWidth: number = 0,
  defs: string = "",
): string {
  const stroke = strokeCss && strokeWidth > 0
    ? ` stroke="${strokeCss}" stroke-width="${strokeWidth}" stroke-linejoin="round"`
    : "";
  const defsBlock = defs ? `<defs>${defs}</defs>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">${defsBlock}<g fill="${fillCss}"${stroke}>${shape.svg}</g></svg>`;
}

/**
 * Build the `<defs>` content for a Fill that contains a linear or radial
 * gradient. The gradient id is always "g" so callers can reference it as
 * `url(#g)` in their fill attribute. Returns "" for solid fills.
 *
 * `fill` is intentionally typed loosely so this helper can be imported by
 * code that doesn't depend on the full Clip type.
 */
export function buildGradientDefs(fill: any): string {
  if (!fill || fill.kind === "solid") return "";
  const stops = (fill.stops || [])
    .map((s: [number, string]) =>
      `<stop offset="${(s[0] * 100).toFixed(1)}%" stop-color="${s[1]}"/>`,
    )
    .join("");
  if (fill.kind === "linear") {
    // Convert CSS-like angle (0deg = up) to an x1/y1/x2/y2 line in user units.
    const a = ((fill.angle || 0) - 90) * (Math.PI / 180);
    const cx = 50, cy = 50, r = 71;
    const x1 = (cx - Math.cos(a) * r).toFixed(2);
    const y1 = (cy - Math.sin(a) * r).toFixed(2);
    const x2 = (cx + Math.cos(a) * r).toFixed(2);
    const y2 = (cy + Math.sin(a) * r).toFixed(2);
    return `<linearGradient id="g" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="userSpaceOnUse">${stops}</linearGradient>`;
  }
  if (fill.kind === "radial") {
    const cx = ((fill.cx ?? 0.5) * 100).toFixed(2);
    const cy = ((fill.cy ?? 0.5) * 100).toFixed(2);
    const r = ((fill.r ?? 0.7) * 100).toFixed(2);
    return `<radialGradient id="g" cx="${cx}%" cy="${cy}%" r="${r}%">${stops}</radialGradient>`;
  }
  return "";
}
