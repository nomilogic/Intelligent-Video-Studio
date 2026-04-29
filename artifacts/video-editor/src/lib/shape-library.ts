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
  | "Decorative"
  | "Nature"
  | "Callouts"
  | "Frames"
  | "Compound"
  | "Lines"
  | "Animals";

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
  { key: "blob3",           name: "Blob 3",          category: "Decorative", svg: p("M62 6 C 86 10 96 32 92 58 C 88 82 68 96 44 94 C 22 92 4 74 4 52 C 4 28 18 8 38 4 C 46 2 54 4 62 6 Z") },
  { key: "blob4",           name: "Blob 4",          category: "Decorative", svg: p("M40 4 C 64 0 90 16 94 42 C 98 68 80 90 56 96 C 34 100 10 86 4 62 C -2 38 14 10 40 4 Z") },
  { key: "blobOval",        name: "Blob Oval",       category: "Decorative", svg: p("M50 8 C 78 8 96 26 96 50 C 96 74 78 92 50 92 C 22 92 4 74 4 50 C 4 26 22 8 50 8 Z") },
  { key: "splat",           name: "Splat",           category: "Decorative", svg: p("M50 2 C 58 12 72 8 76 18 C 84 14 90 22 86 30 C 96 32 98 44 90 48 C 98 54 96 66 86 68 C 90 76 84 84 76 82 C 74 92 60 94 54 86 C 50 96 38 96 34 86 C 28 94 14 92 12 82 C 4 84 -2 76 4 68 C -6 64 -4 52 4 48 C -2 42 0 30 10 30 C 6 22 12 14 20 18 C 24 8 38 12 50 2 Z") },
  { key: "filmStrip",       name: "Film Strip",      category: "Decorative", svg: `<rect x="4" y="10" width="92" height="80" rx="4"/><rect x="4" y="10" width="12" height="80" fill-opacity="0.4"/><rect x="84" y="10" width="12" height="80" fill-opacity="0.4"/><rect x="12" y="14" width="6" height="8" fill="black" fill-opacity="0.5"/><rect x="12" y="26" width="6" height="8" fill="black" fill-opacity="0.5"/><rect x="12" y="38" width="6" height="8" fill="black" fill-opacity="0.5"/><rect x="12" y="50" width="6" height="8" fill="black" fill-opacity="0.5"/><rect x="12" y="62" width="6" height="8" fill="black" fill-opacity="0.5"/><rect x="12" y="74" width="6" height="8" fill="black" fill-opacity="0.5"/><rect x="82" y="14" width="6" height="8" fill="black" fill-opacity="0.5"/><rect x="82" y="26" width="6" height="8" fill="black" fill-opacity="0.5"/><rect x="82" y="38" width="6" height="8" fill="black" fill-opacity="0.5"/><rect x="82" y="50" width="6" height="8" fill="black" fill-opacity="0.5"/><rect x="82" y="62" width="6" height="8" fill="black" fill-opacity="0.5"/><rect x="82" y="74" width="6" height="8" fill="black" fill-opacity="0.5"/>` },
  // ── Nature (16) ────────────────────────────────────────────────────────
  { key: "sun",             name: "Sun",             category: "Nature",     svg: `<circle cx="50" cy="50" r="22"/><rect x="46" y="2" width="8" height="16" rx="4"/><rect x="46" y="82" width="8" height="16" rx="4"/><rect x="2" y="46" width="16" height="8" rx="4"/><rect x="82" y="46" width="16" height="8" rx="4"/><rect x="15" y="11" width="8" height="16" rx="4" transform="rotate(45 19 19)"/><rect x="69" y="11" width="8" height="16" rx="4" transform="rotate(-45 81 19)"/><rect x="15" y="73" width="8" height="16" rx="4" transform="rotate(-45 19 81)"/><rect x="69" y="73" width="8" height="16" rx="4" transform="rotate(45 81 81)"/>` },
  { key: "sunRound",        name: "Sun Round",       category: "Nature",     svg: p("M50 4 C 56 18 70 16 78 24 C 86 32 84 44 96 50 C 84 56 86 68 78 76 C 70 84 56 82 50 96 C 44 82 30 84 22 76 C 14 68 16 56 4 50 C 16 44 14 32 22 24 C 30 16 44 18 50 4 Z") },
  { key: "moon",            name: "Moon",            category: "Nature",     svg: p("M72 10 C 50 10 30 28 30 50 C 30 72 50 90 72 90 C 58 82 50 68 50 50 C 50 32 58 18 72 10 Z") },
  { key: "crescent",        name: "Crescent",        category: "Nature",     svg: p("M68 6 C 46 6 26 24 26 50 C 26 76 46 94 68 94 C 52 84 44 68 44 50 C 44 32 52 16 68 6 Z") },
  { key: "flowerSimple",    name: "Flower Simple",   category: "Nature",     svg: `<circle cx="50" cy="50" r="14"/><ellipse cx="50" cy="22" rx="10" ry="18"/><ellipse cx="50" cy="78" rx="10" ry="18"/><ellipse cx="22" cy="50" rx="18" ry="10"/><ellipse cx="78" cy="50" rx="18" ry="10"/><ellipse cx="30" cy="30" rx="10" ry="18" transform="rotate(45 30 30)"/><ellipse cx="70" cy="30" rx="10" ry="18" transform="rotate(-45 70 30)"/><ellipse cx="30" cy="70" rx="10" ry="18" transform="rotate(-45 30 70)"/><ellipse cx="70" cy="70" rx="10" ry="18" transform="rotate(45 70 70)"/>` },
  { key: "flower5",         name: "5-Petal Flower",  category: "Nature",     svg: poly("50,50 50,6 62,42 94,30 66,56 80,92 50,70 20,92 34,56 6,30 38,42") },
  { key: "leafSimple",      name: "Leaf Simple",     category: "Nature",     svg: p("M50 8 C 82 8 92 30 92 50 C 92 72 72 90 50 90 Z") },
  { key: "leafPalm",        name: "Palm Leaf",       category: "Nature",     svg: p("M10 90 C 10 60 50 20 90 10 C 70 30 60 50 10 90 Z M 10 90 L 50 50") },
  { key: "tree",            name: "Tree",            category: "Nature",     svg: poly("50,4 70,36 60,36 78,62 64,62 96,92 4,92 36,62 22,62 40,36 30,36") },
  { key: "treeRound",       name: "Round Tree",      category: "Nature",     svg: `<rect x="42" y="68" width="16" height="26" rx="3"/><circle cx="50" cy="44" r="34"/>` },
  { key: "pine",            name: "Pine Tree",       category: "Nature",     svg: `<rect x="44" y="78" width="12" height="18" rx="2"/><polygon points="50,4 70,36 56,36 78,62 62,62 84,90 16,90 38,62 22,62 44,36 30,36"/>` },
  { key: "cactus",          name: "Cactus",          category: "Nature",     svg: p("M44 96 L 44 46 C 44 40 38 36 32 36 L 32 22 C 32 18 28 14 24 14 C 20 14 16 18 16 22 L 16 50 L 32 50 L 32 46 L 44 46 L 44 96 Z M 56 96 L 56 46 C 56 40 62 36 68 36 L 68 22 C 68 18 72 14 76 14 C 80 14 84 18 84 22 L 84 50 L 68 50 L 68 46 L 56 46 L 56 96 Z") },
  { key: "mushroom",        name: "Mushroom",        category: "Nature",     svg: `<rect x="38" y="60" width="24" height="32" rx="4"/><path d="M10 60 C 10 30 30 8 50 8 C 70 8 90 30 90 60 Z"/>` },
  { key: "cloud2",          name: "Cloud 2",         category: "Decorative", svg: p("M30 76 C 14 76 4 66 4 54 C 4 42 14 34 28 32 C 28 20 38 10 50 10 C 64 10 74 20 76 32 C 88 32 96 40 96 52 C 96 64 86 72 74 72 C 74 76 64 80 56 76 C 52 80 44 82 38 78 C 36 78 30 78 30 76 Z") },
  { key: "lightning",       name: "Lightning",       category: "Nature",     svg: poly("60,4 26,54 50,54 40,96 74,46 50,46") },
  { key: "snowflake",       name: "Snowflake",       category: "Nature",     svg: `<rect x="46" y="2" width="8" height="96" rx="4"/><rect x="2" y="46" width="96" height="8" rx="4"/><rect x="14" y="14" width="8" height="72" rx="4" transform="rotate(45 18 18)"/><rect x="14" y="14" width="8" height="72" rx="4" transform="rotate(-45 82 18)"/>` },
  // ── Callouts (12) ──────────────────────────────────────────────────────
  { key: "calloutRight",    name: "Callout Right",   category: "Callouts",   svg: p("M4 10 C 4 6 6 4 10 4 L 90 4 C 94 4 96 6 96 10 L 96 64 C 96 68 94 70 90 70 L 58 70 L 72 92 L 44 70 L 10 70 C 6 70 4 68 4 64 Z") },
  { key: "calloutLeft",     name: "Callout Left",    category: "Callouts",   svg: p("M4 10 C 4 6 6 4 10 4 L 90 4 C 94 4 96 6 96 10 L 96 64 C 96 68 94 70 90 70 L 56 70 L 28 92 L 42 70 L 10 70 C 6 70 4 68 4 64 Z") },
  { key: "calloutUp",       name: "Callout Up",      category: "Callouts",   svg: p("M4 26 C 4 22 6 20 10 20 L 36 20 L 50 4 L 64 20 L 90 20 C 94 20 96 22 96 26 L 96 88 C 96 92 94 96 90 96 L 10 96 C 6 96 4 92 4 88 Z") },
  { key: "calloutDown",     name: "Callout Down",    category: "Callouts",   svg: p("M4 12 C 4 8 6 4 10 4 L 90 4 C 94 4 96 8 96 12 L 96 74 C 96 78 94 80 90 80 L 64 80 L 50 96 L 36 80 L 10 80 C 6 80 4 78 4 74 Z") },
  { key: "thoughtBubble",   name: "Thought Bubble",  category: "Callouts",   svg: `<ellipse cx="50" cy="40" rx="44" ry="32"/><circle cx="30" cy="76" r="10"/><circle cx="18" cy="90" r="6"/>` },
  { key: "roundBubble",     name: "Round Bubble",    category: "Callouts",   svg: `<circle cx="50" cy="44" r="42"/><polygon points="50,82 30,96 70,96"/>` },
  { key: "labelLeft",       name: "Label Left",      category: "Callouts",   svg: poly("4,50 22,10 96,10 96,90 22,90") },
  { key: "labelRight",      name: "Label Right",     category: "Callouts",   svg: poly("96,50 78,10 4,10 4,90 78,90") },
  { key: "calloutStar",     name: "Star Callout",    category: "Callouts",   svg: p("M50 4 C 52 28 62 32 86 24 C 70 42 74 52 96 50 C 74 52 70 62 86 76 C 62 68 52 72 50 96 C 48 72 38 68 14 76 C 30 62 26 52 4 50 C 26 48 30 38 14 24 C 38 32 48 28 50 4 Z") },
  { key: "pinDown",         name: "Map Pin",         category: "Callouts",   svg: p("M50 96 C 50 96 14 58 14 36 C 14 18 30 4 50 4 C 70 4 86 18 86 36 C 86 58 50 96 50 96 Z M 50 44 a 12 12 0 1 0 0.1 0 Z") },
  { key: "flag",            name: "Flag",            category: "Callouts",   svg: p("M10 4 L 10 96 M 10 4 L 90 14 L 70 44 L 90 74 L 10 84") },
  { key: "cornerFold",      name: "Corner Fold",     category: "Callouts",   svg: p("M4 4 L 76 4 L 96 24 L 96 96 L 4 96 Z M 76 4 L 76 24 L 96 24") },
  // ── Frames (14) ────────────────────────────────────────────────────────
  { key: "frameSquare",     name: "Square Frame",    category: "Frames",     svg: `<rect x="4" y="4" width="92" height="92" fill="none" stroke="currentColor" stroke-width="8"/><path d="M4 4 L4 4" fill="none"/>` },
  { key: "frameRound",      name: "Round Frame",     category: "Frames",     svg: `<path d="M50 4 a46 46 0 1 0 0.1 0 Z M50 20 a30 30 0 1 1 -0.1 0 Z" fill-rule="evenodd"/>` },
  { key: "frameOval",       name: "Oval Frame",      category: "Frames",     svg: `<path d="M50 4 C 76 4 96 20 96 50 C 96 80 76 96 50 96 C 24 96 4 80 4 50 C 4 20 24 4 50 4 Z M50 20 C 72 20 80 32 80 50 C 80 68 72 80 50 80 C 28 80 20 68 20 50 C 20 32 28 20 50 20 Z" fill-rule="evenodd"/>` },
  { key: "frameStar",       name: "Star Frame",      category: "Frames",     svg: p("M50 2 C 58 26 76 28 92 16 C 82 34 86 52 98 62 C 76 60 66 72 72 94 C 56 78 44 78 28 94 C 34 72 24 60 2 62 C 14 52 18 34 8 16 C 24 28 42 26 50 2 Z M50 20 C 46 36 36 40 22 34 C 28 46 26 58 18 66 C 32 64 40 70 38 84 C 46 74 54 74 62 84 C 60 70 68 64 82 66 C 74 58 72 46 78 34 C 64 40 54 36 50 20 Z") },
  { key: "framePolaroid",   name: "Polaroid",        category: "Frames",     svg: `<rect x="6" y="6" width="88" height="88" rx="4"/><rect x="14" y="14" width="72" height="62" fill="black" fill-opacity="0.15" rx="2"/>` },
  { key: "frameTicket",     name: "Ticket",          category: "Frames",     svg: p("M4 26 C 4 8 8 4 14 4 L 86 4 C 92 4 96 8 96 26 C 88 26 88 34 96 34 L 96 66 C 88 66 88 74 96 74 L 96 92 C 96 96 92 96 86 96 L 14 96 C 8 96 4 96 4 92 L 4 74 C 12 74 12 66 4 66 L 4 34 C 12 34 12 26 4 26 Z") },
  { key: "frameHex",        name: "Hexagon Frame",   category: "Frames",     svg: p("M50 4 L 92 28 L 92 72 L 50 96 L 8 72 L 8 28 Z M 50 18 L 80 34 L 80 66 L 50 82 L 20 66 L 20 34 Z") },
  { key: "frameDiamond",    name: "Diamond Frame",   category: "Frames",     svg: p("M50 4 L 96 50 L 50 96 L 4 50 Z M 50 18 L 82 50 L 50 82 L 18 50 Z") },
  { key: "filmFrame",       name: "Film Frame",      category: "Frames",     svg: `<rect x="4" y="4" width="92" height="92" rx="4"/><rect x="4" y="4" width="12" height="92" rx="2" fill-opacity="0.3"/><rect x="84" y="4" width="12" height="92" rx="2" fill-opacity="0.3"/><rect x="10" y="10" width="4" height="6" rx="1" fill="black" fill-opacity="0.4"/><rect x="10" y="20" width="4" height="6" rx="1" fill="black" fill-opacity="0.4"/><rect x="10" y="30" width="4" height="6" rx="1" fill="black" fill-opacity="0.4"/><rect x="86" y="10" width="4" height="6" rx="1" fill="black" fill-opacity="0.4"/><rect x="86" y="20" width="4" height="6" rx="1" fill="black" fill-opacity="0.4"/><rect x="86" y="30" width="4" height="6" rx="1" fill="black" fill-opacity="0.4"/>` },
  { key: "frameScallop",    name: "Scallop Frame",   category: "Frames",     svg: p("M50 4 C 56 4 60 8 60 12 C 68 8 76 10 78 16 C 84 12 92 14 92 20 C 96 22 98 28 96 34 C 100 38 100 46 96 50 C 100 54 100 62 96 66 C 98 72 96 78 92 80 C 92 86 84 88 78 84 C 76 90 68 92 60 88 C 58 92 54 96 50 96 C 46 96 42 92 40 88 C 32 92 24 90 22 84 C 16 88 8 86 8 80 C 4 78 2 72 4 66 C 0 62 0 54 4 50 C 0 46 0 38 4 34 C 2 28 4 22 8 20 C 8 14 16 12 22 16 C 24 10 32 8 40 12 C 40 8 44 4 50 4 Z M 50 18 C 54 18 56 22 56 24 C 62 20 68 22 70 28 C 74 24 80 26 80 32 C 84 32 86 38 84 42 C 88 46 86 54 82 56 C 86 60 86 68 82 70 C 84 74 82 80 78 80 C 76 86 70 86 66 82 C 62 86 56 86 54 82 C 52 84 50 86 50 82 C 48 86 46 84 44 82 C 40 86 34 86 30 82 C 26 86 20 86 18 80 C 14 80 12 74 14 70 C 10 68 10 60 14 56 C 10 54 8 46 12 42 C 10 38 12 32 16 32 C 16 26 22 24 26 28 C 28 22 34 20 40 24 C 42 22 44 18 50 18 Z") },
  { key: "frameBow",        name: "Bow Frame",       category: "Frames",     svg: `<rect x="4" y="4" width="92" height="92" rx="6"/><rect x="14" y="14" width="72" height="72" rx="4" fill="black" fill-opacity="0.1"/><polygon points="4,4 24,4 4,24"/><polygon points="96,4 76,4 96,24"/><polygon points="4,96 24,96 4,76"/><polygon points="96,96 76,96 96,76"/>` },
  { key: "frameBracket",    name: "Bracket Frame",   category: "Frames",     svg: `<path d="M20 4 L4 4 L4 96 L20 96" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M80 4 L96 4 L96 96 L80 96" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>` },
  { key: "frameCorners",    name: "Corner Marks",    category: "Frames",     svg: `<path d="M4 30 L4 4 L30 4" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M70 4 L96 4 L96 30" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M4 70 L4 96 L30 96" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M70 96 L96 96 L96 70" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>` },
  { key: "frameDouble",     name: "Double Frame",    category: "Frames",     svg: `<rect x="4" y="4" width="92" height="92" rx="2" fill="none" stroke="currentColor" stroke-width="4"/><rect x="12" y="12" width="76" height="76" rx="2" fill="none" stroke="currentColor" stroke-width="4"/>` },
  // ── Compound (20) ──────────────────────────────────────────────────────
  { key: "target",          name: "Target",          category: "Compound",   svg: `<circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="32" fill="white" fill-opacity="0.0" stroke="currentColor" stroke-width="0"/><path d="M50 50 m-32 0 a32 32 0 1 0 64 0 a32 32 0 1 0 -64 0 Z M50 50 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0 Z" fill-rule="evenodd" fill="white" fill-opacity="0.0"/>` },
  { key: "targetRings",     name: "Target Rings",    category: "Compound",   svg: `<circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="50" cy="50" r="10"/>` },
  { key: "yin-yang",        name: "Yin Yang",        category: "Compound",   svg: p("M50 4 A46 46 0 0 1 50 96 A23 23 0 0 1 50 50 A23 23 0 0 0 50 4 Z M 50 19 a4 4 0 1 1 0 0.1 Z M 50 73 a4 4 0 1 0 0 0.1 Z") },
  { key: "puzzle",          name: "Puzzle Piece",    category: "Compound",   svg: p("M4 4 L 46 4 C 46 0 54 0 54 4 L 96 4 L 96 46 C 100 46 100 54 96 54 L 96 96 L 54 96 C 54 100 46 100 46 96 L 4 96 L 4 54 C 0 54 0 46 4 46 Z") },
  { key: "gearSimple",      name: "Gear",            category: "Compound",   svg: p("M42 4 L 42 14 C 38 16 34 18 30 22 L 22 16 L 10 28 L 16 36 C 14 40 12 44 12 50 L 4 52 L 4 66 L 14 68 C 14 72 16 76 18 80 L 12 88 L 22 96 L 30 90 C 34 92 38 94 42 96 L 44 100 L 56 100 L 58 96 C 62 94 66 92 70 90 L 78 96 L 88 88 L 82 80 C 84 76 86 72 86 68 L 96 66 L 96 52 L 88 50 C 86 44 84 40 82 36 L 88 28 L 78 16 L 70 22 C 66 18 62 16 58 14 L 58 4 Z M 50 34 a16 16 0 1 0 0.1 0 Z") },
  { key: "donut",           name: "Donut",           category: "Compound",   svg: `<path d="M50 4 a46 46 0 1 0 0.1 0 Z M50 26 a24 24 0 1 1 -0.1 0 Z" fill-rule="evenodd"/>` },
  { key: "cresDonut",       name: "Crescent Ring",   category: "Compound",   svg: `<path d="M50 4 a46 46 0 1 0 0.1 0 Z M50 26 a24 24 0 1 1 -0.1 0 Z M36 36 a28 28 0 0 0 24 28 Z" fill-rule="evenodd"/>` },
  { key: "pacman",          name: "Pac-Man",         category: "Compound",   svg: p("M50 50 L 86 20 A 44 44 0 0 1 96 50 A 44 44 0 0 1 6 50 A 44 44 0 0 1 50 6 A 44 44 0 0 1 86 80 Z") },
  { key: "semiDonut",       name: "Semi Donut",      category: "Compound",   svg: `<path d="M4 50 A46 46 0 0 1 96 50 L 74 50 A24 24 0 0 0 26 50 Z"/>` },
  { key: "crossCircle",     name: "Cross Circle",    category: "Compound",   svg: `<circle cx="50" cy="50" r="46"/><rect x="20" y="44" width="60" height="12" fill="white" fill-opacity="0.8"/><rect x="44" y="20" width="12" height="60" fill="white" fill-opacity="0.8"/>` },
  { key: "starCircle",      name: "Star Circle",     category: "Compound",   svg: `<circle cx="50" cy="50" r="46"/><polygon points="50,16 57,38 80,38 62,52 68,74 50,60 32,74 38,52 20,38 43,38" fill="white" fill-opacity="0.8"/>` },
  { key: "hexCircle",       name: "Hex Circle",      category: "Compound",   svg: `<circle cx="50" cy="50" r="46"/><polygon points="50,20 72,32 72,68 50,80 28,68 28,32" fill="white" fill-opacity="0.4"/>` },
  { key: "triCircle",       name: "Triangle Circle", category: "Compound",   svg: `<circle cx="50" cy="50" r="46"/><polygon points="50,18 82,74 18,74" fill="white" fill-opacity="0.5"/>` },
  { key: "nestedSquares",   name: "Nested Squares",  category: "Compound",   svg: `<rect x="4" y="4" width="92" height="92"/><rect x="18" y="18" width="64" height="64" fill="white" fill-opacity="0.3"/><rect x="32" y="32" width="36" height="36" fill="white" fill-opacity="0.3"/>` },
  { key: "crosshair",       name: "Crosshair",       category: "Compound",   svg: `<circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="50" cy="50" r="16" fill="none" stroke="currentColor" stroke-width="5"/><line x1="50" y1="4" x2="50" y2="30" stroke="currentColor" stroke-width="5"/><line x1="50" y1="70" x2="50" y2="96" stroke="currentColor" stroke-width="5"/><line x1="4" y1="50" x2="30" y2="50" stroke="currentColor" stroke-width="5"/><line x1="70" y1="50" x2="96" y2="50" stroke="currentColor" stroke-width="5"/>` },
  { key: "radioWaves",      name: "Radio Waves",     category: "Compound",   svg: `<circle cx="50" cy="50" r="12"/><path d="M32 32 A 26 26 0 0 1 68 68" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M68 32 A 26 26 0 0 1 32 68" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M20 20 A 42 42 0 0 1 80 80" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M80 20 A 42 42 0 0 1 20 80" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>` },
  { key: "eye",             name: "Eye",             category: "Compound",   svg: `<path d="M4 50 C 20 20 80 20 96 50 C 80 80 20 80 4 50 Z"/><circle cx="50" cy="50" r="16" fill="white" fill-opacity="0.3"/><circle cx="50" cy="50" r="8"/>` },
  { key: "dna",             name: "DNA",             category: "Compound",   svg: `<path d="M30 4 C 60 20 60 40 30 56 C 60 72 60 88 30 96" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M70 4 C 40 20 40 40 70 56 C 40 72 40 88 70 96" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><line x1="30" y1="22" x2="70" y2="18" stroke="currentColor" stroke-width="4"/><line x1="32" y1="40" x2="68" y2="36" stroke="currentColor" stroke-width="4"/><line x1="32" y1="60" x2="68" y2="64" stroke="currentColor" stroke-width="4"/><line x1="30" y1="78" x2="70" y2="82" stroke="currentColor" stroke-width="4"/>` },
  { key: "wifi",            name: "Wi-Fi",           category: "Compound",   svg: `<path d="M50 78 a6 6 0 1 0 0.1 0"/><path d="M32 60 A26 26 0 0 1 68 60" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="M18 46 A44 44 0 0 1 82 46" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="M4 32 A64 64 0 0 1 96 32" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>` },
  { key: "battery",         name: "Battery",         category: "Compound",   svg: `<rect x="4" y="20" width="82" height="60" rx="8"/><rect x="86" y="36" width="10" height="28" rx="4"/><rect x="10" y="26" width="50" height="48" rx="4" fill-opacity="0.3"/>` },
  // ── Lines (12) ─────────────────────────────────────────────────────────
  { key: "lineH",           name: "Horizontal Line", category: "Lines",      svg: `<rect x="2" y="44" width="96" height="12" rx="6"/>` },
  { key: "lineV",           name: "Vertical Line",   category: "Lines",      svg: `<rect x="44" y="2" width="12" height="96" rx="6"/>` },
  { key: "lineD1",          name: "Diagonal \\",     category: "Lines",      svg: `<line x1="4" y1="4" x2="96" y2="96" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>` },
  { key: "lineD2",          name: "Diagonal /",      category: "Lines",      svg: `<line x1="96" y1="4" x2="4" y2="96" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>` },
  { key: "dashes3",         name: "3 Dashes",        category: "Lines",      svg: `<rect x="4" y="44" width="20" height="12" rx="4"/><rect x="40" y="44" width="20" height="12" rx="4"/><rect x="76" y="44" width="20" height="12" rx="4"/>` },
  { key: "dots3H",          name: "3 Dots H",        category: "Lines",      svg: `<circle cx="20" cy="50" r="8"/><circle cx="50" cy="50" r="8"/><circle cx="80" cy="50" r="8"/>` },
  { key: "wavyLine",        name: "Wavy Line",       category: "Lines",      svg: p("M4 50 C 15 34 25 66 36 50 C 47 34 57 66 68 50 C 79 34 89 66 96 50") },
  { key: "zigzag",          name: "Zigzag",          category: "Lines",      svg: p("M4 64 L 20 36 L 36 64 L 52 36 L 68 64 L 84 36 L 96 50") },
  { key: "steps",           name: "Steps",           category: "Lines",      svg: p("M4 84 L 4 64 L 24 64 L 24 44 L 48 44 L 48 24 L 72 24 L 72 4 L 96 4") },
  { key: "spiral",          name: "Spiral",          category: "Lines",      svg: p("M50 50 C 50 44 56 40 62 44 C 68 48 68 58 62 64 C 54 72 42 72 34 64 C 24 54 24 38 36 28 C 46 20 62 18 74 26 C 88 36 92 54 84 68 C 76 82 60 88 44 84 C 26 78 16 60 20 42 C 24 22 44 8 64 12 C 86 16 98 38 96 60") },
  { key: "crossLines",      name: "Cross Lines",     category: "Lines",      svg: `<rect x="44" y="2" width="12" height="96" rx="6"/><rect x="2" y="44" width="96" height="12" rx="6"/>` },
  { key: "xLines",          name: "X Lines",         category: "Lines",      svg: `<line x1="4" y1="4" x2="96" y2="96" stroke="currentColor" stroke-width="10" stroke-linecap="round"/><line x1="96" y1="4" x2="4" y2="96" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>` },
  // ── Animals (8) ────────────────────────────────────────────────────────
  { key: "cat",             name: "Cat",             category: "Animals",    svg: `<circle cx="50" cy="56" r="36"/><polygon points="22,30 22,8 38,28"/><polygon points="78,30 78,8 62,28"/><circle cx="42" cy="52" r="4" fill="black" fill-opacity="0.5"/><circle cx="58" cy="52" r="4" fill="black" fill-opacity="0.5"/>` },
  { key: "dog",             name: "Dog",             category: "Animals",    svg: `<ellipse cx="50" cy="58" rx="36" ry="30"/><circle cx="50" cy="30" r="24"/><ellipse cx="28" cy="26" rx="12" ry="18" transform="rotate(-20 28 26)"/><ellipse cx="72" cy="26" rx="12" ry="18" transform="rotate(20 72 26)"/>` },
  { key: "bird",            name: "Bird",            category: "Animals",    svg: p("M50 20 C 30 20 10 36 10 60 C 10 80 26 96 50 96 C 74 96 90 80 90 60 C 90 36 70 20 50 20 Z M 6 38 C 6 24 18 14 30 14 L 50 20 Z M 94 38 C 94 24 82 14 70 14 L 50 20 Z M 42 60 L 58 60") },
  { key: "fish",            name: "Fish",            category: "Animals",    svg: p("M10 50 C 10 30 30 14 60 14 L 90 4 L 80 50 L 90 96 L 60 86 C 30 86 10 70 10 50 Z M 40 44 a 8 8 0 1 0 0.1 0") },
  { key: "butterfly",       name: "Butterfly",       category: "Animals",    svg: p("M50 50 C 40 30 10 10 4 26 C -4 42 20 56 50 50 Z M50 50 C 40 70 10 90 4 74 C -4 58 20 44 50 50 Z M50 50 C 60 30 90 10 96 26 C 104 42 80 56 50 50 Z M50 50 C 60 70 90 90 96 74 C 104 58 80 44 50 50 Z") },
  { key: "paw",             name: "Paw Print",       category: "Animals",    svg: `<circle cx="50" cy="60" r="26"/><circle cx="20" cy="36" r="12"/><circle cx="42" cy="22" r="12"/><circle cx="64" cy="22" r="12"/><circle cx="80" cy="36" r="12"/>` },
  { key: "rabbit",          name: "Rabbit",          category: "Animals",    svg: `<circle cx="50" cy="62" r="28"/><ellipse cx="32" cy="26" rx="12" ry="26"/><ellipse cx="68" cy="26" rx="12" ry="26"/><circle cx="42" cy="62" r="4" fill="black" fill-opacity="0.4"/><circle cx="58" cy="62" r="4" fill="black" fill-opacity="0.4"/>` },
  { key: "bear",            name: "Bear",            category: "Animals",    svg: `<circle cx="50" cy="56" r="36"/><circle cx="50" cy="36" r="22"/><circle cx="28" cy="28" r="14"/><circle cx="72" cy="28" r="14"/><ellipse cx="50" cy="46" rx="12" ry="8" fill-opacity="0.3"/>` },
];

// ── Programmatically generated shapes ─────────────────────────────────────
// Regular polygon helper (n sides)
function _rp(n: number, r = 46, cx = 50, cy = 50, startAngle = -Math.PI / 2): string {
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = startAngle + (2 * Math.PI * i) / n;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}
// Star polygon helper (n points)
function _sp(n: number, outerR = 46, innerR = 18, cx = 50, cy = 50): string {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (Math.PI * i) / n - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}
// Ring helper (outer and inner polygon)
function _ring(n: number, outerR = 46, innerR = 28): string {
  const outerPts = _rp(n, outerR).split(" ");
  const innerPts = _rp(n, innerR).split(" ");
  return `<polygon points="${outerPts.join(" ")}" fill-rule="evenodd"/><polygon points="${innerPts.join(" ")}" fill="white" fill-opacity="0.0"/>`;
}

const _GEN_POLYS: ShapeDef[] = [
  // Flat-top hexagon variants
  { key: "hexFlat",    name: "Hex Flat-Top",   category: "Geometric", svg: poly(_rp(6, 46, 50, 50, 0)) },
  { key: "hexRing",    name: "Hex Ring",        category: "Geometric", svg: `<path d="M${_rp(6, 46, 50, 50, 0).replace(/ /g, " L ")} Z M${_rp(6, 30, 50, 50, 0).replace(/ /g, " L ")} Z" fill-rule="evenodd"/>` },
  // Triangles
  { key: "triRight",   name: "Right Triangle", category: "Geometric", svg: poly("4,96 4,4 96,96") },
  { key: "triLeft",    name: "Left Triangle",  category: "Geometric", svg: poly("96,96 96,4 4,96") },
  { key: "triFlat",    name: "Flat Triangle",  category: "Basic",     svg: poly("4,30 96,30 50,96") },
  // More polygons
  { key: "poly9",      name: "9-gon",          category: "Geometric", svg: poly(_rp(9)) },
  { key: "poly11",     name: "11-gon",         category: "Geometric", svg: poly(_rp(11)) },
  { key: "poly12",     name: "12-gon",         category: "Geometric", svg: poly(_rp(12)) },
  { key: "poly13",     name: "13-gon",         category: "Geometric", svg: poly(_rp(13)) },
  { key: "poly14",     name: "14-gon",         category: "Geometric", svg: poly(_rp(14)) },
  { key: "poly16",     name: "16-gon",         category: "Geometric", svg: poly(_rp(16)) },
  { key: "poly20",     name: "20-gon",         category: "Geometric", svg: poly(_rp(20)) },
  // Stars
  { key: "star3",      name: "3-Point Star",   category: "Stars",     svg: poly(_sp(3, 46, 18)) },
  { key: "star3inner", name: "3-Star Inner",   category: "Stars",     svg: poly(_sp(3, 46, 28)) },
  { key: "star4inner", name: "4-Star Inner",   category: "Stars",     svg: poly(_sp(4, 46, 28)) },
  { key: "star5inner", name: "5-Star Deep",    category: "Stars",     svg: poly(_sp(5, 46, 12)) },
  { key: "star6inner", name: "6-Star Deep",    category: "Stars",     svg: poly(_sp(6, 46, 12)) },
  { key: "star7",      name: "7-Point Star",   category: "Stars",     svg: poly(_sp(7, 46, 20)) },
  { key: "star7inner", name: "7-Star Deep",    category: "Stars",     svg: poly(_sp(7, 46, 12)) },
  { key: "star9",      name: "9-Point Star",   category: "Stars",     svg: poly(_sp(9, 46, 20)) },
  { key: "star10",     name: "10-Point Star",  category: "Stars",     svg: poly(_sp(10, 46, 22)) },
  { key: "star10deep", name: "10-Star Deep",   category: "Stars",     svg: poly(_sp(10, 46, 14)) },
  { key: "star11",     name: "11-Point Star",  category: "Stars",     svg: poly(_sp(11, 46, 22)) },
  { key: "star12",     name: "12-Point Star",  category: "Stars",     svg: poly(_sp(12, 46, 24)) },
  { key: "star12deep", name: "12-Star Deep",   category: "Stars",     svg: poly(_sp(12, 46, 14)) },
  // Rounded polygons via squircle-like paths
  { key: "roundTri",   name: "Round Triangle", category: "Basic",     svg: p("M50 6 C 62 6 90 50 84 72 C 78 86 22 86 16 72 C 10 50 38 6 50 6 Z") },
  { key: "roundPent",  name: "Round Penta",    category: "Geometric", svg: p("M50 4 C 72 4 96 22 96 44 C 96 72 76 92 50 96 C 24 92 4 72 4 44 C 4 22 28 4 50 4 Z") },
  { key: "roundHex",   name: "Round Hex",      category: "Geometric", svg: p("M28 8 C 40 2 60 2 72 8 L 90 34 C 96 44 96 56 90 66 L 72 92 C 60 98 40 98 28 92 L 10 66 C 4 56 4 44 10 34 Z") },
  { key: "roundStar5", name: "Round 5-Star",   category: "Stars",     svg: p("M50 4 C 53 20 66 22 78 14 C 72 28 78 40 90 42 C 78 46 76 60 84 70 C 72 68 62 76 62 90 C 56 78 44 78 38 90 C 38 76 28 68 16 70 C 24 60 22 46 10 42 C 22 40 28 28 22 14 C 34 22 47 20 50 4 Z") },
];

SHAPE_LIBRARY.push(..._GEN_POLYS);

export const SHAPE_CATEGORIES: ShapeCategory[] = [
  "Basic", "Geometric", "Stars", "Arrows", "Hearts", "Symbols", "Badges", "Decorative",
  "Nature", "Callouts", "Frames", "Compound", "Lines", "Animals",
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
