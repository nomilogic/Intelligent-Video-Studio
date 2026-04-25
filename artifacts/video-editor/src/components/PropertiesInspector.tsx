import { EditorState, EditorAction, Clip, ClipMask, DEFAULT_FILTERS, EasingType, Effect, EffectType, TransitionType, FONT_OPTIONS, type TextStyle, type TextGradient, type TextStroke, type TextGlow, type TextShadow, type TextBackground, type Fill } from "../lib/types";
import { EFFECT_LIBRARY as EFFECT_CATALOG, EFFECT_CATEGORIES } from "../lib/effect-library";
import { TRANSITION_LIBRARY as TRANSITION_CATALOG, TRANSITION_CATEGORIES } from "../lib/transition-library";
import { SHAPE_LIBRARY } from "../lib/shape-library";
import { SPECIAL_LAYERS } from "../lib/special-layers";
import { savePreset, loadPresets, deletePreset, type CustomPreset } from "../lib/custom-library";
import ColorGradientPicker from "./ColorGradientPicker";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Trash2, Diamond, Copy, FlipHorizontal2, FlipVertical2, Eye, EyeOff,
  Lock, Unlock, RotateCcw, Volume2, VolumeX, Wand2, Scissors, Crop,
  Activity, Minus, Link2, Link2Off,
  // Canvas-fit / alignment iconography
  Maximize2, Minimize2, Move, Square,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  Layers,
} from "lucide-react";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { resolveClip, interpolateKeyframes } from "../lib/animation";

interface PropertiesInspectorProps {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  isCropping?: boolean;
  onCroppingChange?: (v: boolean) => void;
}

const ANIMATIONS = [
  "none", "fade", "slideLeft", "slideRight", "slideUp", "slideDown",
  "zoomIn", "zoomOut", "spin", "bounce",
];

// Transitions and Effects are imported from the canonical libraries.
// `TRANSITION_CATALOG` (50) → ./lib/transition-library
// `EFFECT_CATALOG` (50) → ./lib/effect-library
//
// We keep the local names short for the JSX below but alias to the imports.
const TRANSITIONS = TRANSITION_CATALOG.map((t) => ({ value: t.type, label: t.label, category: t.category }));
const EFFECT_LIBRARY = EFFECT_CATALOG;

const BLEND_MODES = [
  "normal", "multiply", "screen", "overlay", "darken",
  "lighten", "hard-light", "soft-light", "color-dodge", "color-burn", "difference", "exclusion",
];

const FILTER_PRESETS = [
  { name: "None", key: "reset" },
  { name: "Cinematic", key: "cinematic" },
  { name: "Vivid", key: "vivid" },
  { name: "Vintage", key: "vintage" },
  { name: "B&W", key: "bw" },
  { name: "Dreamy", key: "dreamy" },
];

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/10">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{title}</p>
        {action}
      </div>
      <div className="px-3 pb-3 pt-2 space-y-2.5">{children}</div>
    </div>
  );
}

function EditableNumber({
  value, min, max, step, onChange, suffix = "", className = "",
}: {
  value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; suffix?: string; className?: string;
}) {
  const format = (v: number) => v.toFixed(v < 1 && v > -1 ? 2 : 1);
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? format(value);
  const commit = () => {
    if (draft == null) return;
    const parsed = parseFloat(draft);
    if (Number.isFinite(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      if (clamped !== value) onChange(clamped);
    }
    setDraft(null);
  };
  return (
    <div className="flex items-center gap-0.5">
      <input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => {
          setDraft(format(value));
          requestAnimationFrame(() => e.target.select());
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setDraft(null);
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            const dir = e.key === "ArrowUp" ? 1 : -1;
            const mult = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
            const next = Math.max(min, Math.min(max, value + dir * step * mult));
            setDraft(null);
            onChange(next);
          }
        }}
        className={`tabular-nums bg-transparent border border-transparent hover:border-border focus:border-primary focus:bg-background rounded px-1 py-0 text-right text-xs w-14 outline-none transition-colors ${className}`}
      />
      {suffix && <span className="text-muted-foreground text-xs select-none">{suffix}</span>}
    </div>
  );
}

function NumPair({
  label, value, min, max, step, onChange, onKeyframe, hasKeyframe, isAtKeyframe,
  tweened, onToggleTween, suffix = "",
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; onKeyframe?: () => void;
  hasKeyframe?: boolean; isAtKeyframe?: boolean;
  tweened?: boolean; onToggleTween?: () => void;
  suffix?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <Label className="text-muted-foreground flex items-center gap-1">
          {label}
          {onToggleTween && (
            <button
              onClick={onToggleTween}
              title={tweened ? "Tween ON — animates between keyframes. Click to turn off." : "Tween OFF — values hold/snap between keyframes. Click to animate."}
              className={`rounded px-0.5 py-0.5 transition-colors ${
                tweened ? "hover:bg-emerald-400/20" : "hover:bg-muted/40"
              }`}
            >
              {tweened
                ? <Activity className="w-3 h-3 text-emerald-400" />
                : <Minus className="w-3 h-3 text-muted-foreground/60" />}
            </button>
          )}
        </Label>
        <EditableNumber
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={onChange}
          suffix={suffix}
          className={hasKeyframe ? "text-yellow-400" : "text-foreground"}
        />
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

// Built-in mask presets, organized by category. Each preset is a small SVG
// data URL. "alpha" mode masks use white-on-transparent shapes (the alpha
// channel drives visibility). "luminance" mode masks use grayscale (white =
// fully visible, black = fully hidden, mid-grey = partial transparency) and
// are the right choice for any gradient / feathered / blend mask.
type MaskPreset = { label: string; src: string; mode: ClipMask["mode"]; group: string };

// Helper to build a small SVG and wrap as a data: URL.
const svg = (inner: string): string =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>${inner}</svg>`,
  );

// Reusable gradient defs (kept as fragments because each <defs> needs a
// unique id within its own SVG document).
const linGrad = (id: string, x1: number, y1: number, x2: number, y2: number, stops: string) =>
  `<linearGradient id='${id}' x1='${x1}' y1='${y1}' x2='${x2}' y2='${y2}'>${stops}</linearGradient>`;
const radGrad = (id: string, cx: number, cy: number, r: number, stops: string) =>
  `<radialGradient id='${id}' cx='${cx}%' cy='${cy}%' r='${r}%'>${stops}</radialGradient>`;

const MASK_PRESETS: MaskPreset[] = [
  // ── Shapes (alpha) ─────────────────────────────────────────────────
  {
    label: "Circle",
    mode: "alpha",
    group: "Shapes",
    src: svg(`<circle cx='50' cy='50' r='48' fill='white'/>`),
  },
  {
    label: "Rounded",
    mode: "alpha",
    group: "Shapes",
    src: svg(`<rect x='4' y='4' width='92' height='92' rx='18' fill='white'/>`),
  },
  {
    label: "Heart",
    mode: "alpha",
    group: "Shapes",
    src: svg(
      `<path d='M50 88 L12 50 C-4 34 14 8 36 22 L50 36 L64 22 C86 8 104 34 88 50 Z' fill='white'/>`,
    ),
  },
  {
    label: "Star",
    mode: "alpha",
    group: "Shapes",
    src: svg(
      `<polygon points='50,5 61,38 96,38 68,58 78,92 50,72 22,92 32,58 4,38 39,38' fill='white'/>`,
    ),
  },
  {
    label: "Diamond",
    mode: "alpha",
    group: "Shapes",
    src: svg(`<polygon points='50,4 96,50 50,96 4,50' fill='white'/>`),
  },
  {
    label: "Hexagon",
    mode: "alpha",
    group: "Shapes",
    src: svg(`<polygon points='25,8 75,8 96,50 75,92 25,92 4,50' fill='white'/>`),
  },

  // ── Gradients (luminance, B/W) ─────────────────────────────────────
  {
    label: "Fade ↓",
    mode: "luminance",
    group: "Gradients",
    src: svg(
      `<defs>${linGrad("g", 0, 0, 0, 1, `<stop offset='0' stop-color='white'/><stop offset='1' stop-color='black'/>`)}</defs><rect width='100' height='100' fill='url(%23g)'/>`,
    ),
  },
  {
    label: "Fade ↑",
    mode: "luminance",
    group: "Gradients",
    src: svg(
      `<defs>${linGrad("g", 0, 1, 0, 0, `<stop offset='0' stop-color='white'/><stop offset='1' stop-color='black'/>`)}</defs><rect width='100' height='100' fill='url(%23g)'/>`,
    ),
  },
  {
    label: "Fade →",
    mode: "luminance",
    group: "Gradients",
    src: svg(
      `<defs>${linGrad("g", 0, 0, 1, 0, `<stop offset='0' stop-color='white'/><stop offset='1' stop-color='black'/>`)}</defs><rect width='100' height='100' fill='url(%23g)'/>`,
    ),
  },
  {
    label: "Fade ←",
    mode: "luminance",
    group: "Gradients",
    src: svg(
      `<defs>${linGrad("g", 1, 0, 0, 0, `<stop offset='0' stop-color='white'/><stop offset='1' stop-color='black'/>`)}</defs><rect width='100' height='100' fill='url(%23g)'/>`,
    ),
  },
  {
    label: "Diag ↘",
    mode: "luminance",
    group: "Gradients",
    src: svg(
      `<defs>${linGrad("g", 0, 0, 1, 1, `<stop offset='0' stop-color='white'/><stop offset='1' stop-color='black'/>`)}</defs><rect width='100' height='100' fill='url(%23g)'/>`,
    ),
  },
  {
    label: "Diag ↙",
    mode: "luminance",
    group: "Gradients",
    src: svg(
      `<defs>${linGrad("g", 1, 0, 0, 1, `<stop offset='0' stop-color='white'/><stop offset='1' stop-color='black'/>`)}</defs><rect width='100' height='100' fill='url(%23g)'/>`,
    ),
  },
  {
    label: "Mid Grey",
    mode: "luminance",
    group: "Gradients",
    src: svg(`<rect width='100' height='100' fill='#808080'/>`),
  },
  {
    label: "Light Grey",
    mode: "luminance",
    group: "Gradients",
    src: svg(`<rect width='100' height='100' fill='#bfbfbf'/>`),
  },

  // ── Feathered (luminance, soft edges) ──────────────────────────────
  {
    label: "Soft Circle",
    mode: "luminance",
    group: "Feathered",
    src: svg(
      `<defs>${radGrad("g", 50, 50, 50, `<stop offset='0.45' stop-color='white'/><stop offset='1' stop-color='black'/>`)}</defs><rect width='100' height='100' fill='url(%23g)'/>`,
    ),
  },
  {
    label: "Soft Spot",
    mode: "luminance",
    group: "Feathered",
    src: svg(
      `<defs>${radGrad("g", 50, 50, 35, `<stop offset='0' stop-color='white'/><stop offset='0.7' stop-color='%23404040'/><stop offset='1' stop-color='black'/>`)}</defs><rect width='100' height='100' fill='url(%23g)'/>`,
    ),
  },
  {
    label: "Soft Rect",
    mode: "luminance",
    group: "Feathered",
    src: svg(
      `<defs><filter id='b' x='-20%' y='-20%' width='140%' height='140%'><feGaussianBlur stdDeviation='8'/></filter></defs><rect width='100' height='100' fill='black'/><rect x='12' y='12' width='76' height='76' fill='white' filter='url(%23b)'/>`,
    ),
  },
  {
    label: "Radial",
    mode: "luminance",
    group: "Feathered",
    src: svg(
      `<defs>${radGrad("g", 50, 50, 50, `<stop offset='0' stop-color='white'/><stop offset='1' stop-color='black'/>`)}</defs><rect width='100' height='100' fill='url(%23g)'/>`,
    ),
  },
  {
    label: "Vignette",
    mode: "luminance",
    group: "Feathered",
    src: svg(
      `<defs>${radGrad("g", 50, 50, 65, `<stop offset='0.55' stop-color='white'/><stop offset='1' stop-color='black'/>`)}</defs><rect width='100' height='100' fill='url(%23g)'/>`,
    ),
  },
  {
    label: "Inv Vignette",
    mode: "luminance",
    group: "Feathered",
    src: svg(
      `<defs>${radGrad("g", 50, 50, 65, `<stop offset='0.45' stop-color='black'/><stop offset='1' stop-color='white'/>`)}</defs><rect width='100' height='100' fill='url(%23g)'/>`,
    ),
  },

  // ── Half / Blend (luminance, half visible, soft transition) ────────
  {
    label: "Half ↑",
    mode: "luminance",
    group: "Half / Blend",
    src: svg(
      `<defs>${linGrad("g", 0, 0, 0, 1, `<stop offset='0.45' stop-color='white'/><stop offset='0.55' stop-color='black'/>`)}</defs><rect width='100' height='100' fill='url(%23g)'/>`,
    ),
  },
  {
    label: "Half ↓",
    mode: "luminance",
    group: "Half / Blend",
    src: svg(
      `<defs>${linGrad("g", 0, 0, 0, 1, `<stop offset='0.45' stop-color='black'/><stop offset='0.55' stop-color='white'/>`)}</defs><rect width='100' height='100' fill='url(%23g)'/>`,
    ),
  },
  {
    label: "Half ←",
    mode: "luminance",
    group: "Half / Blend",
    src: svg(
      `<defs>${linGrad("g", 0, 0, 1, 0, `<stop offset='0.45' stop-color='white'/><stop offset='0.55' stop-color='black'/>`)}</defs><rect width='100' height='100' fill='url(%23g)'/>`,
    ),
  },
  {
    label: "Half →",
    mode: "luminance",
    group: "Half / Blend",
    src: svg(
      `<defs>${linGrad("g", 0, 0, 1, 0, `<stop offset='0.45' stop-color='black'/><stop offset='0.55' stop-color='white'/>`)}</defs><rect width='100' height='100' fill='url(%23g)'/>`,
    ),
  },
  {
    label: "Soft Half ↓",
    mode: "luminance",
    group: "Half / Blend",
    src: svg(
      `<defs>${linGrad("g", 0, 0, 0, 1, `<stop offset='0.1' stop-color='black'/><stop offset='0.9' stop-color='white'/>`)}</defs><rect width='100' height='100' fill='url(%23g)'/>`,
    ),
  },
  {
    label: "Soft Half →",
    mode: "luminance",
    group: "Half / Blend",
    src: svg(
      `<defs>${linGrad("g", 0, 0, 1, 0, `<stop offset='0.1' stop-color='black'/><stop offset='0.9' stop-color='white'/>`)}</defs><rect width='100' height='100' fill='url(%23g)'/>`,
    ),
  },
  {
    label: "Center Band",
    mode: "luminance",
    group: "Half / Blend",
    src: svg(
      `<defs>${linGrad("g", 0, 0, 0, 1, `<stop offset='0' stop-color='black'/><stop offset='0.35' stop-color='white'/><stop offset='0.65' stop-color='white'/><stop offset='1' stop-color='black'/>`)}</defs><rect width='100' height='100' fill='url(%23g)'/>`,
    ),
  },
  {
    label: "Edge Fade",
    mode: "luminance",
    group: "Half / Blend",
    src: svg(
      `<defs>${linGrad("g", 0, 0, 1, 0, `<stop offset='0' stop-color='black'/><stop offset='0.25' stop-color='white'/><stop offset='0.75' stop-color='white'/><stop offset='1' stop-color='black'/>`)}</defs><rect width='100' height='100' fill='url(%23g)'/>`,
    ),
  },
];

// Group order for rendering presets in the inspector.
const MASK_GROUP_ORDER = ["Shapes", "Gradients", "Feathered", "Half / Blend"];

const DEFAULT_MASK: ClipMask = {
  src: "",
  mode: "alpha",
  invert: false,
  fit: "contain",
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  opacity: 1,
};

/**
 * Icon-based row of mask-fit options. The same component is reused by
 * the universal Canvas Fit & Align section (where it sets the clip's
 * `objectFit`-equivalent positioning) and by MaskSection (where it
 * configures `ClipMask.fit`). Pure UI — the parent decides what each
 * button does.
 */
function FitIconRow({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; Icon: React.ComponentType<{ className?: string }> }[];
}) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            title={o.label}
            data-testid={`fit-${o.value}`}
            className={`flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-md border text-[9px] transition-colors ${
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted/40"
            }`}
          >
            <o.Icon className="w-3.5 h-3.5" />
            <span className="leading-none">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * 3×3 alignment grid. The handler receives a horizontal/vertical pair
 * ("left|center|right" × "top|middle|bottom") so the parent can apply it
 * to whatever properties make sense (clip rect for canvas-align, mask
 * offset for mask-align).
 */
function AlignmentGrid({
  onAlign,
  testIdPrefix,
}: {
  onAlign: (h: "left" | "center" | "right", v: "top" | "middle" | "bottom") => void;
  testIdPrefix: string;
}) {
  const cells: { h: "left" | "center" | "right"; v: "top" | "middle" | "bottom"; Icon: any; label: string }[] = [
    { h: "left", v: "top", Icon: AlignStartVertical, label: "Top-Left" },
    { h: "center", v: "top", Icon: AlignStartHorizontal, label: "Top" },
    { h: "right", v: "top", Icon: AlignStartVertical, label: "Top-Right" },
    { h: "left", v: "middle", Icon: AlignStartVertical, label: "Left" },
    { h: "center", v: "middle", Icon: AlignCenterHorizontal, label: "Center" },
    { h: "right", v: "middle", Icon: AlignEndVertical, label: "Right" },
    { h: "left", v: "bottom", Icon: AlignEndVertical, label: "Bottom-Left" },
    { h: "center", v: "bottom", Icon: AlignEndHorizontal, label: "Bottom" },
    { h: "right", v: "bottom", Icon: AlignEndVertical, label: "Bottom-Right" },
  ];
  return (
    <div className="grid grid-cols-3 gap-1">
      {cells.map((c, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onAlign(c.h, c.v)}
          title={c.label}
          data-testid={`${testIdPrefix}-${c.h}-${c.v}`}
          className="aspect-square flex items-center justify-center rounded-md border border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <c.Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}

/**
 * Universal Canvas Fit & Align — appears on every transformable clip
 * (video, image, text, color block, mask layer, blur layer, etc). Lets
 * the user snap-fill, snap-fit, stretch, reset, or align the clip's
 * bounding rect to the canvas with a single click. All actions write
 * to the same x/y/width/height the keyframe pipeline reads, so the
 * preview + export stay consistent.
 */
function CanvasFitAlignSection({
  clip, dispatch,
}: {
  clip: Clip;
  dispatch: React.Dispatch<EditorAction>;
}) {
  const update = (updates: Partial<Clip>) =>
    dispatch({ type: "UPDATE_CLIP", payload: { id: clip.id, updates } });

  // Fit actions write x/y/width/height in canvas-relative units (0..1).
  // Aspect-aware fits (Fill/Fit) need the clip's intrinsic aspect ratio
  // so they don't distort. We use the current width/height ratio as a
  // proxy when there's no source media (good enough for color/text/mask
  // boxes); for media clips this matches what the user sees.
  const aspect = clip.width > 0 && clip.height > 0 ? clip.width / clip.height : 1;

  const fillCanvas = () => update({ x: 0, y: 0, width: 1, height: 1 });
  const fitCanvas = () => {
    // contain: keep aspect, fill the smaller side
    if (aspect >= 1) {
      const h = 1 / aspect;
      update({ x: 0, y: (1 - h) / 2, width: 1, height: h });
    } else {
      const w = aspect;
      update({ x: (1 - w) / 2, y: 0, width: w, height: 1 });
    }
  };
  const coverCanvas = () => {
    // cover: keep aspect, fill the larger side (one dim crops)
    if (aspect >= 1) {
      const w = 1;
      const h = w / aspect;
      // Center vertically; if h > 1, the overflow is the cropped portion.
      update({ x: 0, y: (1 - h) / 2, width: 1, height: h });
    } else {
      const h = 1;
      const w = h * aspect;
      update({ x: (1 - w) / 2, y: 0, width: w, height: 1 });
    }
  };
  const resetSize = () => {
    // half-canvas centered — sensible default
    update({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 });
  };

  const align = (h: "left" | "center" | "right", v: "top" | "middle" | "bottom") => {
    const w = clip.width;
    const ht = clip.height;
    const x = h === "left" ? 0 : h === "right" ? 1 - w : (1 - w) / 2;
    const y = v === "top" ? 0 : v === "bottom" ? 1 - ht : (1 - ht) / 2;
    update({ x, y });
  };

  return (
    <Section title="Canvas Fit & Align">
      <FitIconRow
        value=""
        onChange={(v) => {
          if (v === "fill") fillCanvas();
          else if (v === "fit") fitCanvas();
          else if (v === "cover") coverCanvas();
          else if (v === "reset") resetSize();
        }}
        options={[
          { value: "fill", label: "Fill", Icon: Maximize2 },
          { value: "fit", label: "Fit", Icon: Minimize2 },
          { value: "cover", label: "Cover", Icon: Square },
          { value: "reset", label: "Reset", Icon: Move },
        ]}
      />
      <div className="space-y-1">
        <div className="text-[9px] uppercase tracking-wide text-muted-foreground/80">
          Snap to canvas
        </div>
        <AlignmentGrid onAlign={align} testIdPrefix="canvas-align" />
      </div>
      <p className="text-[9px] text-muted-foreground leading-snug">
        Fill stretches edge-to-edge. Fit/Cover preserve aspect (Fit shows the whole clip, Cover crops to fill). Snap moves the clip while keeping its current size.
      </p>
    </Section>
  );
}

function MaskSection({
  clip, dispatch,
}: {
  clip: Clip;
  dispatch: React.Dispatch<EditorAction>;
}) {
  const m = clip.mask;
  const setMask = (patch: Partial<ClipMask> | null) => {
    if (patch === null) {
      // Clear the mask entirely.
      dispatch({ type: "UPDATE_CLIP", payload: { id: clip.id, updates: { mask: null as any } } });
      return;
    }
    const next: ClipMask = { ...DEFAULT_MASK, ...(m ?? {}), ...patch };
    dispatch({ type: "UPDATE_CLIP", payload: { id: clip.id, updates: { mask: next } } });
  };
  const onUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setMask({ src: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };
  return (
    <Section title="Mask" action={
      m ? (
        <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => setMask(null)} title="Remove mask">
          <Trash2 className="w-3 h-3" />
        </Button>
      ) : undefined
    }>
      {!m ? (
        <p className="text-[10px] text-muted-foreground">Pick a preset or upload an image. Black is hidden, white is visible — grey gradients give partial transparency.</p>
      ) : null}
      {MASK_GROUP_ORDER.map((group) => {
        const items = MASK_PRESETS.filter((p) => p.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group} className="space-y-1">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground/80">{group}</div>
            <div className="grid grid-cols-4 gap-1">
              {items.map((p) => {
                const active = m?.src === p.src;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setMask({ src: p.src, mode: p.mode })}
                    className={`group relative aspect-square rounded border ${active ? "border-primary" : "border-white/10 hover:border-white/30"} bg-black/40 overflow-hidden`}
                    title={`${p.label} (${p.mode})`}
                    data-testid={`mask-preset-${p.label}`}
                  >
                    <img src={p.src} alt={p.label} className="w-full h-full object-contain pointer-events-none" />
                    <span className="absolute bottom-0 inset-x-0 text-[8px] leading-3 text-white/80 bg-black/50 text-center truncate">
                      {p.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <label className="block">
        <span className="text-[10px] text-muted-foreground">Custom image</span>
        <input
          type="file"
          accept="image/*"
          className="block w-full text-[10px] mt-0.5 file:mr-2 file:px-2 file:py-1 file:rounded file:border-0 file:bg-muted/40 file:text-xs"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.currentTarget.value = "";
          }}
        />
      </label>
      {m && (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <Label className="text-[10px] text-muted-foreground">Mode</Label>
              <Select value={m.mode} onValueChange={(v: any) => setMask({ mode: v })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alpha" className="text-xs">Alpha (transparency)</SelectItem>
                  <SelectItem value="luminance" className="text-xs">Luminance (B/W)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Fit</Label>
              <FitIconRow
                value={m.fit}
                onChange={(v) => setMask({ fit: v as any })}
                options={[
                  { value: "stretch", label: "Stretch", Icon: Maximize2 },
                  { value: "contain", label: "Fit", Icon: Minimize2 },
                  { value: "cover", label: "Cover", Icon: Square },
                  { value: "stretch", label: "Fill", Icon: Move },
                ].slice(0, 3)}
              />
            </div>
          </div>
          <NumPair label="Scale" value={m.scale} min={0.1} max={3} step={0.05} onChange={(v) => setMask({ scale: v })} />
          <NumPair label="Offset X" value={m.offsetX} min={-1} max={1} step={0.01} onChange={(v) => setMask({ offsetX: v })} />
          <NumPair label="Offset Y" value={m.offsetY} min={-1} max={1} step={0.01} onChange={(v) => setMask({ offsetY: v })} />
          <NumPair label="Opacity" value={m.opacity} min={0} max={1} step={0.05} onChange={(v) => setMask({ opacity: v })} />
          <Button
            variant={m.invert ? "secondary" : "outline"}
            size="sm"
            className="w-full h-7 text-xs"
            onClick={() => setMask({ invert: !m.invert })}
          >
            {m.invert ? "Inverted" : "Invert mask"}
          </Button>
          {/*
            Mask depth — ONLY meaningful on a Mask Layer clip itself
            (clip.mediaType === "maskLayer"), where it controls how many
            tracks beneath this layer the cutout reaches. 0 = "all
            tracks below" (legacy behaviour). N = "the N tracks directly
            beneath only". Other clips with a mask field (per-clip mask
            on a video, etc) ignore this — their mask only affects that
            single clip by definition.
          */}
          {clip.mediaType === "maskLayer" && (
            <div className="space-y-1 pt-1 border-t border-border/40">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-muted-foreground" />
                <Label className="text-[10px] text-muted-foreground">
                  Affects tracks below
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  max={20}
                  step={1}
                  value={clip.maskAffectsTracksBelow ?? 0}
                  onChange={(e) => {
                    const n = Math.max(0, Math.min(20, Math.floor(Number(e.target.value) || 0)));
                    dispatch({
                      type: "UPDATE_CLIP",
                      payload: { id: clip.id, updates: { maskAffectsTracksBelow: n } },
                    });
                  }}
                  className="h-7 text-xs w-16"
                  data-testid="mask-depth-input"
                />
                <span className="text-[10px] text-muted-foreground">
                  {(clip.maskAffectsTracksBelow ?? 0) === 0
                    ? "all tracks below"
                    : `next ${clip.maskAffectsTracksBelow} track${(clip.maskAffectsTracksBelow ?? 0) === 1 ? "" : "s"}`}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground leading-snug">
                Set to 0 to mask everything underneath. Set to a number to limit the cutout to just the N tracks directly below this mask (e.g. 1 only cuts the track right beneath it).
              </p>
            </div>
          )}
        </>
      )}
    </Section>
  );
}

function EffectsSection({
  clip, dispatch,
}: {
  clip: Clip;
  dispatch: React.Dispatch<EditorAction>;
}) {
  const effects = clip.effects ?? [];
  const writeEffects = (next: Effect[]) => {
    dispatch({ type: "UPDATE_CLIP", payload: { id: clip.id, updates: { effects: next } } });
  };
  const addEffect = (type: EffectType) => {
    if (effects.some((e) => e.type === type)) return; // one of each kind
    const def = EFFECT_LIBRARY.find((e) => e.type === type);
    const eff: Effect = {
      id: `fx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      intensity: 0.5,
      ...(def?.defaultColor ? { color: def.defaultColor } : {}),
    };
    writeEffects([...effects, eff]);
  };
  const removeEffect = (id: string) => writeEffects(effects.filter((e) => e.id !== id));
  const updateEffect = (id: string, patch: Partial<Effect>) =>
    writeEffects(effects.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  return (
    <Section title="Visual Effects" action={
      effects.length > 0 ? (
        <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => writeEffects([])} title="Clear all effects">
          <RotateCcw className="w-3 h-3" />
        </Button>
      ) : undefined
    }>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {EFFECT_CATEGORIES.map((cat) => {
          const items = EFFECT_LIBRARY.filter((e) => e.category === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat} className="space-y-1">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{cat}</p>
              <div className="grid grid-cols-3 gap-1">
                {items.map((e) => {
                  const active = effects.some((ef) => ef.type === e.type);
                  return (
                    <Button
                      key={e.type}
                      variant={active ? "secondary" : "outline"}
                      size="sm"
                      className={`h-7 text-[10px] ${active ? "bg-primary/20 border-primary/50" : ""}`}
                      onClick={() => active ? removeEffect(effects.find((ef) => ef.type === e.type)!.id) : addEffect(e.type)}
                      data-testid={`effect-toggle-${e.type}`}
                    >
                      {e.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {effects.length === 0 && (
        <p className="text-[10px] text-muted-foreground">Tap an effect to add it. Stack as many as you like.</p>
      )}
      {effects.map((eff) => {
        const def = EFFECT_LIBRARY.find((e) => e.type === eff.type);
        const supportsColor = eff.type === "tint" || eff.type === "glow";
        return (
          <div key={eff.id} className="rounded-md border border-white/10 bg-black/20 p-1.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-white/80">{def?.label ?? eff.type}</span>
              <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => removeEffect(eff.id)} title="Remove">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
            <NumPair
              label="Intensity"
              value={eff.intensity}
              min={0} max={1} step={0.05}
              onChange={(v) => updateEffect(eff.id, { intensity: v })}
            />
            {supportsColor && (
              <div className="flex items-center gap-1.5">
                <Label className="text-[10px] text-muted-foreground w-14">Color</Label>
                <Input
                  type="color"
                  value={eff.color || "#ffffff"}
                  onChange={(e) => updateEffect(eff.id, { color: e.target.value })}
                  className="h-6 w-10 p-0.5 cursor-pointer"
                />
              </div>
            )}
          </div>
        );
      })}
    </Section>
  );
}

/**
 * ShapeSection — inspector panel for `mediaType === "shape"` clips.
 * Lets the user pick which of the 50 SHAPE_LIBRARY shapes to render and
 * controls fill (solid/linear/radial gradient via ColorGradientPicker)
 * plus stroke color/width.
 */
function ShapeSection({
  clip,
  dispatch,
}: {
  clip: Clip;
  dispatch: React.Dispatch<EditorAction>;
}) {
  const update = (updates: Partial<Clip>) =>
    dispatch({ type: "UPDATE_CLIP", payload: { id: clip.id, updates } });
  const fill: Fill = clip.fill ?? { kind: "solid", color: "#3b82f6" };
  return (
    <Section title="Shape">
      <Label className="text-[10px] text-muted-foreground">Shape</Label>
      <div className="grid grid-cols-6 gap-1 max-h-44 overflow-y-auto pr-1">
        {SHAPE_LIBRARY.map((s) => (
          <button
            key={s.key}
            onClick={() => update({ shapeKind: s.key })}
            className={`aspect-square rounded border p-1 text-foreground hover:bg-muted/40 ${
              clip.shapeKind === s.key ? "border-primary bg-primary/15" : "border-border"
            }`}
            title={s.name}
          >
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full"
              dangerouslySetInnerHTML={{ __html: `<g fill="currentColor">${s.svg}</g>` }}
            />
          </button>
        ))}
      </div>

      <Label className="text-[10px] text-muted-foreground mt-2 block">Fill</Label>
      <ColorGradientPicker value={fill} onChange={(next) => update({ fill: next })} />

      <Label className="text-[10px] text-muted-foreground mt-2 block">Stroke</Label>
      <div className="flex items-center gap-2">
        <Input
          type="color"
          value={clip.strokeColor ?? "#ffffff"}
          onChange={(e) => update({ strokeColor: e.target.value })}
          className="h-7 w-12 p-0.5 cursor-pointer"
        />
        <NumPair
          label="Width"
          value={clip.strokeWidth ?? 0}
          min={0}
          max={20}
          step={0.5}
          suffix="px"
          onChange={(v) => update({ strokeWidth: v })}
        />
      </div>
    </Section>
  );
}

/**
 * SpecialLayerSection — inspector panel for `mediaType === "specialLayer"`
 * clips. Lets the user swap presets (light leak / grain / vignette / etc),
 * tune intensity, and recolor the overlay tint.
 */
function SpecialLayerSection({
  clip,
  dispatch,
}: {
  clip: Clip;
  dispatch: React.Dispatch<EditorAction>;
}) {
  const update = (updates: Partial<Clip>) =>
    dispatch({ type: "UPDATE_CLIP", payload: { id: clip.id, updates } });
  // Group presets by category for easier scanning.
  const cats = Array.from(new Set(SPECIAL_LAYERS.map((s) => s.category)));
  return (
    <Section title="Special Layer">
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {cats.map((cat) => (
          <div key={cat} className="space-y-1">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{cat}</p>
            <div className="grid grid-cols-2 gap-1">
              {SPECIAL_LAYERS.filter((s) => s.category === cat).map((s) => (
                <button
                  key={s.key}
                  onClick={() => update({
                    specialKind: s.key,
                    specialIntensity: s.intensity,
                    specialColor: s.color,
                    label: s.name,
                  })}
                  className={`text-[10px] px-1.5 py-1 rounded border text-left truncate ${
                    clip.specialKind === s.key
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-foreground hover:bg-muted/40"
                  }`}
                  title={s.name}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <NumPair
        label="Intensity"
        value={clip.specialIntensity ?? 0.6}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => update({ specialIntensity: v })}
      />
      <div className="flex items-center gap-2">
        <Label className="text-[10px] text-muted-foreground w-14">Color</Label>
        <Input
          type="color"
          value={clip.specialColor ?? "#ffffff"}
          onChange={(e) => update({ specialColor: e.target.value })}
          className="h-7 w-12 p-0.5 cursor-pointer"
        />
      </div>
    </Section>
  );
}

/**
 * SavedPresetsSection — save the current clip's styling/transform as a
 * named preset to localStorage, then re-apply or delete later. Surfaces
 * the user's "custom library" in the inspector itself so it travels
 * with the selected clip.
 */
function SavedPresetsSection({
  clip,
  dispatch,
}: {
  clip: Clip;
  dispatch: React.Dispatch<EditorAction>;
}) {
  const [presets, setPresets] = useState<CustomPreset[]>(() => loadPresets());
  const [name, setName] = useState("");

  const refresh = () => setPresets(loadPresets());

  const onSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    savePreset(trimmed, clip);
    setName("");
    refresh();
  };

  const onApply = (p: CustomPreset) => {
    dispatch({ type: "UPDATE_CLIP", payload: { id: clip.id, updates: p.data } });
  };

  const onDelete = (id: string) => {
    deletePreset(id);
    refresh();
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Preset name…"
          className="h-7 text-xs"
        />
        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={onSave} disabled={!name.trim()}>
          Save
        </Button>
      </div>
      {presets.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">No presets saved. Save the current clip's styling to reuse later.</p>
      ) : (
        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
          {presets.map((p) => (
            <div key={p.id} className="flex items-center gap-1 rounded border border-border bg-muted/20 px-1.5 py-1">
              <button
                onClick={() => onApply(p)}
                className="flex-1 text-left text-[11px] truncate hover:text-primary"
                title="Apply preset to this clip"
              >
                {p.name}
              </button>
              <button
                onClick={() => onDelete(p.id)}
                className="text-[10px] text-muted-foreground hover:text-destructive px-1"
                title="Delete preset"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChromaKeySection({
  clip,
  dispatch,
}: {
  clip: Clip;
  dispatch: React.Dispatch<EditorAction>;
}) {
  const ck = clip.chromaKey ?? {
    enabled: false,
    color: "#00ff21",
    threshold: 0.18,
    smoothness: 0.12,
    spill: 0.4,
  };
  const setCk = (patch: Partial<typeof ck>) => {
    dispatch({
      type: "UPDATE_CLIP",
      payload: { id: clip.id, updates: { chromaKey: { ...ck, ...patch } } },
    });
  };
  return (
    <Section
      title="Green Screen / Chroma Key"
      action={
        <Button
          variant={ck.enabled ? "secondary" : "ghost"}
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => setCk({ enabled: !ck.enabled })}
          data-testid="toggle-chromakey"
        >
          {ck.enabled ? "On" : "Off"}
        </Button>
      }
    >
      <div className="flex items-center gap-2">
        <Label className="text-[10px] text-muted-foreground w-14">Key Color</Label>
        <input
          type="color"
          value={ck.color}
          onChange={(e) => setCk({ color: e.target.value })}
          className="h-7 w-10 bg-transparent border border-border rounded cursor-pointer"
          data-testid="chromakey-color"
        />
        <Input
          type="text"
          value={ck.color}
          onChange={(e) => setCk({ color: e.target.value })}
          className="h-7 text-[10px] flex-1 font-mono"
        />
      </div>
      <div className="grid grid-cols-3 gap-1">
        {[
          { label: "Green", color: "#00ff21" },
          { label: "Blue", color: "#0033ff" },
          { label: "Black", color: "#000000" },
        ].map((p) => (
          <Button
            key={p.label}
            variant="outline"
            size="sm"
            className="h-6 text-[10px]"
            onClick={() => setCk({ color: p.color })}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <NumPair
        label="Threshold"
        value={ck.threshold}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => setCk({ threshold: v })}
      />
      <NumPair
        label="Smoothness"
        value={ck.smoothness}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => setCk({ smoothness: v })}
      />
      <NumPair
        label="Spill Suppress"
        value={ck.spill}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => setCk({ spill: v })}
      />
      <p className="text-[10px] text-muted-foreground leading-snug">
        Pick the background color (or a swatch). Threshold sets which pixels become transparent; smoothness softens the edges; spill suppresses leftover color cast on the subject.
      </p>
    </Section>
  );
}

function LogoBlurSection({
  clip,
  dispatch,
}: {
  clip: Clip;
  dispatch: React.Dispatch<EditorAction>;
}) {
  const blur = clip.blurAmount ?? 16;
  return (
    <Section title="Blur Region">
      <NumPair
        label="Blur Amount"
        value={blur}
        min={0}
        max={80}
        step={1}
        suffix="px"
        onChange={(v) =>
          dispatch({ type: "UPDATE_CLIP", payload: { id: clip.id, updates: { blurAmount: v } } })
        }
      />
      <NumPair
        label="Border Radius"
        value={clip.borderRadius}
        min={0}
        max={64}
        step={1}
        suffix="px"
        onChange={(v) =>
          dispatch({ type: "UPDATE_CLIP", payload: { id: clip.id, updates: { borderRadius: v } } })
        }
      />
      <p className="text-[10px] text-muted-foreground leading-snug">
        Drops a blurred rectangle on top of the composite — handy for hiding logos, faces or text. Animate position and size with keyframes (Basic tab) to track moving objects.
      </p>
    </Section>
  );
}

function SplitSection({
  clip, dispatch,
}: {
  clip: Clip;
  dispatch: React.Dispatch<EditorAction>;
}) {
  const [parts, setParts] = useState(4);
  const [every, setEvery] = useState(2);
  return (
    <Section title="Split">
      <div className="space-y-1.5">
        <Button
          variant="default"
          size="sm"
          className="w-full h-7 text-xs gap-1.5"
          onClick={() => dispatch({ type: "SPLIT_AT_PLAYHEAD" })}
          title="Split at playhead (S)"
        >
          <Scissors className="w-3 h-3" /> Split at playhead
        </Button>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={2}
            max={64}
            value={parts}
            onChange={(e) => setParts(Math.max(2, Math.min(64, parseInt(e.target.value) || 2)))}
            className="h-7 text-xs w-14"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs flex-1"
            onClick={() => dispatch({ type: "SPLIT_INTO_PARTS", payload: { clipId: clip.id, parts } })}
            title="Split selected clip into N equal pieces"
          >
            Split into {parts} parts
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={0.2}
            step={0.5}
            value={every}
            onChange={(e) => setEvery(Math.max(0.2, parseFloat(e.target.value) || 1))}
            className="h-7 text-xs w-14"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs flex-1"
            onClick={() => dispatch({ type: "SPLIT_EVERY", payload: { clipId: clip.id, seconds: every } })}
            title="Split selected clip every N seconds"
          >
            Split every {every}s
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => dispatch({ type: "RIPPLE_DELETE", payload: clip.id })}
          title="Delete clip and close the gap (Shift+Del)"
        >
          <Trash2 className="w-3 h-3 mr-1" /> Ripple delete
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed pt-1">
        Tip: Use the AI bar to "split clip at scenes", "split into 5 highlights", or "cut every 2 seconds for a montage".
      </p>
    </Section>
  );
}

const TRANSFORM_PROPS = new Set(["x", "y", "width", "height", "rotation", "scale", "opacity"]);
const FILTER_PROPS = new Set([
  "brightness", "contrast", "saturation", "hue", "blur", "grayscale", "sepia", "invert",
]);

export default function PropertiesInspector({ state, dispatch, isCropping = false, onCroppingChange }: PropertiesInspectorProps) {
  const clip = state.clips.find((c) => state.selectedClipIds.includes(c.id));
  const [activeTab, setActiveTab] = useState<string>("basic");

  const update = (updates: Partial<Clip>) => {
    if (!clip) return;
    dispatch({ type: "UPDATE_CLIP", payload: { id: clip.id, updates } });
  };

  // Resolved clip values at the current playhead time (respects any existing keyframes)
  const resolved = clip ? resolveClip(clip, state.keyframes, state.currentTime) : null;

  const addKeyframe = (property: string) => {
    if (!clip) return;
    // Capture the live (interpolated) value at current time so the keyframe matches what you see
    const baseValue =
      (resolved as any)?.[property] ??
      (clip.filters as any)[property] ??
      (clip as any)[property] ??
      0;
    const value = interpolateKeyframes(state.keyframes, clip.id, property, state.currentTime, baseValue) ?? baseValue;
    // Inherit the property's existing tween state so adding a keyframe doesn't
    // silently turn animation on. If no keyframes exist yet for this property,
    // default to "step" (Adobe Animate / Flash style — explicit opt-in).
    const existing = state.keyframes.find((k) => k.clipId === clip.id && k.property === property);
    const easing: EasingType = existing ? existing.easing : "easeInOut";
    dispatch({
      type: "ADD_KEYFRAME",
      payload: { clipId: clip.id, time: state.currentTime, property, value, easing },
    });

    // Open the Transform panel and activate the select / transform tool so the
    // user can immediately drag the canvas handles to refine the keyframe.
    if (TRANSFORM_PROPS.has(property)) {
      setActiveTab("basic");
    } else if (FILTER_PROPS.has(property)) {
      setActiveTab("effects");
    } else if (property === "volume") {
      setActiveTab("audio");
    }
    if (state.tool !== "select") {
      dispatch({ type: "SET_TOOL", payload: "select" });
    }
    // Make sure the clip stays selected so the transform handles render on the canvas
    if (!state.selectedClipIds.includes(clip.id)) {
      dispatch({ type: "SELECT_CLIP", payload: clip.id });
    }
  };

  // Returns true if this property has ANY keyframes for the selected clip
  const hasKf = (property: string) => clip
    ? state.keyframes.some((k) => k.clipId === clip.id && k.property === property)
    : false;

  // Returns true if a keyframe exists at EXACTLY the current playhead time
  const isAtKf = (property: string) => clip
    ? state.keyframes.some((k) => k.clipId === clip.id && k.property === property && Math.abs(k.time - state.currentTime) < 0.02)
    : false;

  // Tween state for a property = "is this property animated between keyframes?"
  // A property is "tweened" when its keyframes use a smooth easing (NOT "step").
  // New keyframes default to "easeInOut" so animation is on by default; the user
  // can flip the toggle to "step" to make values hold/snap instead.
  const isTweened = (property: string) => clip
    ? state.keyframes.some(
        (k) => k.clipId === clip.id && k.property === property && k.easing !== "step",
      )
    : false;

  // Toggle tweening for ALL keyframes of a given property on the selected clip.
  // OFF -> easing "step" (hold/snap, no animation)
  // ON  -> easing "easeInOut" (smooth interpolation)
  const toggleTween = (property: string) => {
    if (!clip) return;
    const kfs = state.keyframes.filter((k) => k.clipId === clip.id && k.property === property);
    if (kfs.length === 0) return;
    const turningOn = !isTweened(property);
    const nextEasing: EasingType = turningOn ? "easeInOut" : "step";
    for (const kf of kfs) {
      dispatch({ type: "UPDATE_KEYFRAME", payload: { id: kf.id, easing: nextEasing } });
    }
  };

  const setFilter = (key: keyof typeof DEFAULT_FILTERS, value: number) => {
    if (!clip) return;
    update({ filters: { ...clip.filters, [key]: value } as any });
  };

  // Live value at the current playhead time (interpolated from keyframes if any exist)
  const liveVal = (property: string, base: number) =>
    clip ? (interpolateKeyframes(state.keyframes, clip.id, property, state.currentTime, base) ?? base) : base;

  // True if any keyframe for this clip exists at the current playhead time (within ±20ms)
  const isAtKfTime = clip
    ? state.keyframes.some((k) => k.clipId === clip.id && Math.abs(k.time - state.currentTime) < 0.02)
    : false;

  // Smart update for animatable clip properties:
  // - if a keyframe already exists at the playhead → update that keyframe's value
  // - otherwise → update the base clip property
  const updateAnimatable = (property: string, value: number) => {
    if (!clip) return;
    if (isAtKf(property)) {
      const kf = state.keyframes.find(
        (k) => k.clipId === clip.id && k.property === property && Math.abs(k.time - state.currentTime) < 0.02,
      );
      if (kf) dispatch({ type: "UPDATE_KEYFRAME", payload: { id: kf.id, value } });
    } else {
      update({ [property]: value } as Partial<Clip>);
    }
  };

  // Smart update for filter properties (same logic, stored as flat KF property names)
  const updateFilter = (fp: keyof typeof DEFAULT_FILTERS, value: number) => {
    if (!clip) return;
    if (isAtKf(fp)) {
      const kf = state.keyframes.find(
        (k) => k.clipId === clip.id && k.property === fp && Math.abs(k.time - state.currentTime) < 0.02,
      );
      if (kf) dispatch({ type: "UPDATE_KEYFRAME", payload: { id: kf.id, value } });
    } else {
      update({ filters: { ...clip.filters, [fp]: value } as any });
    }
  };

  return (
    <div
      data-testid="properties-inspector"
      className="w-72 flex flex-col border-l border-border bg-card shrink-0 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {clip ? "Inspector" : "Properties"}
        </p>
        {clip && (
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => dispatch({ type: "DUPLICATE_CLIP", payload: clip.id })} title="Duplicate">
              <Copy className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => update({ hidden: !clip.hidden })} title={clip.hidden ? "Show" : "Hide"}>
              {clip.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => update({ locked: !clip.locked })} title={clip.locked ? "Unlock" : "Lock"}>
              {clip.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </Button>
            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => dispatch({ type: "DELETE_CLIP", payload: clip.id })} title="Delete">
              <Trash2 className="w-3 h-3 text-destructive" />
            </Button>
          </div>
        )}
      </div>

      {!clip ? (
        <div className="flex-1 overflow-y-auto">
          <Section title="Project">
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Label className="w-16 text-muted-foreground">Width</Label>
                <Input type="number" value={state.canvasWidth} onChange={(e) => dispatch({ type: "SET_CANVAS_SIZE", payload: { width: parseInt(e.target.value) || 1920, height: state.canvasHeight } })} className="h-7 text-xs" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-16 text-muted-foreground">Height</Label>
                <Input type="number" value={state.canvasHeight} onChange={(e) => dispatch({ type: "SET_CANVAS_SIZE", payload: { width: state.canvasWidth, height: parseInt(e.target.value) || 1080 } })} className="h-7 text-xs" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-16 text-muted-foreground">Duration</Label>
                <Input type="number" step={0.5} value={state.duration} onChange={(e) => dispatch({ type: "SET_DURATION", payload: parseFloat(e.target.value) || 30 })} className="h-7 text-xs" />
                <span className="text-muted-foreground">s</span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-16 text-muted-foreground">BG</Label>
                <input
                  type="color"
                  value={state.background.startsWith("#") ? state.background : "#000000"}
                  onChange={(e) => dispatch({ type: "SET_BACKGROUND", payload: e.target.value })}
                  className="h-7 w-12 bg-transparent border border-border rounded shrink-0"
                />
                <Input
                  value={state.background}
                  onChange={(e) => dispatch({ type: "SET_BACKGROUND", payload: e.target.value })}
                  className="h-7 text-[10px] font-mono"
                  placeholder="#000 or linear-gradient(...)"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Gradient Presets</Label>
                <div className="grid grid-cols-4 gap-1 mt-1">
                  {[
                    "linear-gradient(135deg, #0f172a, #1e3a8a)",
                    "linear-gradient(135deg, #7c3aed, #ec4899)",
                    "linear-gradient(135deg, #f59e0b, #ef4444)",
                    "linear-gradient(135deg, #10b981, #06b6d4)",
                    "linear-gradient(180deg, #fde68a, #f59e0b)",
                    "linear-gradient(180deg, #1e293b, #0ea5e9)",
                    "radial-gradient(circle at 30% 20%, #6366f1, #0f172a)",
                    "radial-gradient(circle at 50% 50%, #ec4899, #1e1b4b)",
                  ].map((g) => (
                    <button
                      key={g}
                      onClick={() => dispatch({ type: "SET_BACKGROUND", payload: g })}
                      className="aspect-square rounded border border-border hover:scale-105 transition-transform"
                      style={{ background: g }}
                      title={g}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Section>
          <Separator />
          <Section title="Aspect Ratio Presets">
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: "16:9", w: 1920, h: 1080 },
                { label: "9:16", w: 1080, h: 1920 },
                { label: "1:1", w: 1080, h: 1080 },
                { label: "4:5", w: 1080, h: 1350 },
                { label: "2:3", w: 1000, h: 1500 },
                { label: "3:4", w: 1080, h: 1440 },
                { label: "21:9", w: 2560, h: 1080 },
                { label: "4:3", w: 1440, h: 1080 },
                { label: "5:4", w: 1280, h: 1024 },
              ].map((r) => {
                const active = state.canvasWidth === r.w && state.canvasHeight === r.h;
                const ratio = r.w / r.h;
                const maxDim = 22;
                const boxW = ratio >= 1 ? maxDim : maxDim * ratio;
                const boxH = ratio >= 1 ? maxDim / ratio : maxDim;
                return (
                  <Button
                    key={r.label}
                    variant="ghost"
                    size="sm"
                    className={`h-14 flex flex-col items-center justify-center gap-1 px-1.5 border ${active ? "border-foreground" : "border-transparent"}`}
                    onClick={() => dispatch({ type: "SET_CANVAS_SIZE", payload: { width: r.w, height: r.h } })}
                    title={`${r.label} (${r.w}×${r.h})`}
                  >
                    <div
                      className={`border-[1.5px] rounded-[2px] ${active ? "border-foreground" : "border-muted-foreground"}`}
                      style={{ width: `${boxW}px`, height: `${boxH}px` }}
                    />
                    <span className="text-[10px] leading-none">{r.label}</span>
                  </Button>
                );
              })}
            </div>
            <div className="flex gap-1.5 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] flex-1"
                onClick={() => dispatch({ type: "SET_CANVAS_SIZE", payload: { width: state.canvasHeight, height: state.canvasWidth } })}
                title="Swap width/height"
              >
                ↔ Rotate Canvas
              </Button>
            </div>
          </Section>
          <Separator />
          <Section title="Markers">
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {(state.markers || []).length === 0 && (
                <p className="text-[10px] text-muted-foreground">No markers. Press M or Shift+click ruler.</p>
              )}
              {(state.markers || [])
                .sort((a, b) => a.time - b.time)
                .map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-[10px] bg-muted/30 px-2 py-1 rounded group">
                    <div className="w-2 h-2 rounded-sm" style={{ background: m.color || "#fb923c" }} />
                    <button
                      className="flex-1 text-left tabular-nums hover:text-primary"
                      onClick={() => dispatch({ type: "SET_TIME", payload: m.time })}
                    >
                      {m.label || "Marker"} · {m.time.toFixed(2)}s
                    </button>
                    <button
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => dispatch({ type: "DELETE_MARKER", payload: m.id })}
                    >
                      <Trash2 className="w-2.5 h-2.5 text-destructive" />
                    </button>
                  </div>
                ))}
            </div>
            {(state.markers || []).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-full text-[10px]"
                onClick={() => dispatch({ type: "CLEAR_MARKERS" })}
              >
                Clear all markers
              </Button>
            )}
          </Section>
          <div className="px-3 py-3 text-[10px] text-muted-foreground space-y-0.5">
            <p className="font-medium text-foreground">Shortcuts</p>
            <p>Space play · S split · B blade · V select</p>
            <p>M marker · J/K/L scrub · ←/→ frame</p>
            <p>Shift+Del ripple · ⌘D duplicate · ⌘Z undo</p>
          </div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          {isAtKfTime && (
            <div className="mx-2 mt-2 px-2 py-1 rounded bg-yellow-400/15 border border-yellow-400/40 flex items-center gap-1.5">
              <Diamond className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />
              <p className="text-[10px] text-yellow-300 leading-tight">
                <span className="font-semibold">Keyframe mode</span> — slider changes update the keyframe at {state.currentTime.toFixed(2)}s
              </p>
            </div>
          )}
          <TabsList className="grid grid-cols-4 mx-2 mt-2 h-8">
            <TabsTrigger value="basic" className="text-[10px]">Basic</TabsTrigger>
            <TabsTrigger value="effects" className="text-[10px]">
              {clip.mediaType === "maskLayer" ? "Mask" : clip.mediaType === "logoBlur" ? "Blur" : "Effects"}
            </TabsTrigger>
            <TabsTrigger value="anim" className="text-[10px]">Anim</TabsTrigger>
            {clip.mediaType === "text" && <TabsTrigger value="text" className="text-[10px]">Text</TabsTrigger>}
            {(clip.mediaType === "video" || clip.mediaType === "audio") && (
              <TabsTrigger value="audio" className="text-[10px]">Audio</TabsTrigger>
            )}
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="basic" className="m-0">
              <Section title="Clip">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: clip.color }} />
                  <Input value={clip.label} onChange={(e) => update({ label: e.target.value })} className="h-7 text-xs" data-testid="input-clip-label" />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Start</Label>
                    <Input type="number" step={0.1} value={clip.startTime.toFixed(1)} onChange={(e) => update({ startTime: parseFloat(e.target.value) })} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Duration</Label>
                    <Input type="number" step={0.1} value={clip.duration.toFixed(1)} onChange={(e) => update({ duration: parseFloat(e.target.value) })} className="h-7 text-xs" />
                  </div>
                </div>
              </Section>

              {/*
                Shape & Special-Layer editors. Only render when the clip
                actually carries one of those mediaTypes — otherwise stay
                out of the way for plain video / image / text clips.
              */}
              {clip.mediaType === "shape" && (
                <>
                  <Separator />
                  <ShapeSection clip={clip} dispatch={dispatch} />
                </>
              )}
              {clip.mediaType === "specialLayer" && (
                <>
                  <Separator />
                  <SpecialLayerSection clip={clip} dispatch={dispatch} />
                </>
              )}

              <Separator />

              <Section title="Saved Presets">
                <SavedPresetsSection clip={clip} dispatch={dispatch} />
              </Section>

              <Separator />

              <Section title="Transform" action={
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => update({ preserveRatio: !clip.preserveRatio })}
                    title={clip.preserveRatio ? "Aspect ratio is locked — drag handles preserve W:H. Click to unlock." : "Lock aspect ratio so resize keeps W:H. Hold Shift while dragging for one-off lock."}
                    className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                      clip.preserveRatio
                        ? "bg-amber-400/20 border-amber-400/60 text-amber-300"
                        : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    {clip.preserveRatio ? <Link2 className="w-3 h-3" /> : <Link2Off className="w-3 h-3" />}
                    Ratio
                  </button>
                  <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => update({ x: 0, y: 0, width: 1, height: 1, rotation: 0, scale: 1 })} title="Reset transform">
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </div>
              }>
                <NumPair label="X" value={liveVal("x", clip.x)} min={-1} max={2} step={0.01} onChange={(v) => updateAnimatable("x", v)} onKeyframe={() => addKeyframe("x")} hasKeyframe={hasKf("x")} isAtKeyframe={isAtKf("x")} tweened={isTweened("x")} onToggleTween={() => toggleTween("x")} />
                <NumPair label="Y" value={liveVal("y", clip.y)} min={-1} max={2} step={0.01} onChange={(v) => updateAnimatable("y", v)} onKeyframe={() => addKeyframe("y")} hasKeyframe={hasKf("y")} isAtKeyframe={isAtKf("y")} tweened={isTweened("y")} onToggleTween={() => toggleTween("y")} />
                <NumPair label="W" value={liveVal("width", clip.width)} min={0.01} max={2} step={0.01} onChange={(v) => {
                  if (clip.preserveRatio) {
                    const ratio = clip.width / Math.max(0.001, clip.height);
                    const cx = clip.x + clip.width / 2;
                    const cy = clip.y + clip.height / 2;
                    const nh = v / ratio;
                    update({ width: v, height: nh, x: cx - v / 2, y: cy - nh / 2 });
                  } else {
                    updateAnimatable("width", v);
                  }
                }} onKeyframe={() => addKeyframe("width")} hasKeyframe={hasKf("width")} isAtKeyframe={isAtKf("width")} tweened={isTweened("width")} onToggleTween={() => toggleTween("width")} />
                <NumPair label="H" value={liveVal("height", clip.height)} min={0.01} max={2} step={0.01} onChange={(v) => {
                  if (clip.preserveRatio) {
                    const ratio = clip.width / Math.max(0.001, clip.height);
                    const cx = clip.x + clip.width / 2;
                    const cy = clip.y + clip.height / 2;
                    const nw = v * ratio;
                    update({ width: nw, height: v, x: cx - nw / 2, y: cy - v / 2 });
                  } else {
                    updateAnimatable("height", v);
                  }
                }} onKeyframe={() => addKeyframe("height")} hasKeyframe={hasKf("height")} isAtKeyframe={isAtKf("height")} tweened={isTweened("height")} onToggleTween={() => toggleTween("height")} />

                <NumPair label="Rotation" value={liveVal("rotation", clip.rotation)} min={-180} max={180} step={1} suffix="°" onChange={(v) => updateAnimatable("rotation", v)} onKeyframe={() => addKeyframe("rotation")} hasKeyframe={hasKf("rotation")} isAtKeyframe={isAtKf("rotation")} tweened={isTweened("rotation")} onToggleTween={() => toggleTween("rotation")} />
                <NumPair label="Scale" value={liveVal("scale", clip.scale)} min={0.1} max={3} step={0.05} suffix="x" onChange={(v) => updateAnimatable("scale", v)} onKeyframe={() => addKeyframe("scale")} hasKeyframe={hasKf("scale")} isAtKeyframe={isAtKf("scale")} tweened={isTweened("scale")} onToggleTween={() => toggleTween("scale")} />
                <NumPair label="Opacity" value={liveVal("opacity", clip.opacity)} min={0} max={1} step={0.01} onChange={(v) => updateAnimatable("opacity", v)} onKeyframe={() => addKeyframe("opacity")} hasKeyframe={hasKf("opacity")} isAtKeyframe={isAtKf("opacity")} tweened={isTweened("opacity")} onToggleTween={() => toggleTween("opacity")} />

                <div className="flex gap-1.5">
                  <Button variant={clip.flipH ? "secondary" : "outline"} size="sm" className="h-7 text-xs flex-1" onClick={() => update({ flipH: !clip.flipH })}>
                    <FlipHorizontal2 className="w-3 h-3 mr-1" /> Flip H
                  </Button>
                  <Button variant={clip.flipV ? "secondary" : "outline"} size="sm" className="h-7 text-xs flex-1" onClick={() => update({ flipV: !clip.flipV })}>
                    <FlipVertical2 className="w-3 h-3 mr-1" /> Flip V
                  </Button>
                </div>

                <NumPair label="Border Radius" value={clip.borderRadius} min={0} max={64} step={1} suffix="px" onChange={(v) => update({ borderRadius: v })} />
              </Section>

              <Separator />

              {/*
                Universal Canvas Fit & Align — works on every transformable
                clip (video, image, text, color block, mask layer, blur,
                shape, etc). Replaces the old video/image-only "Canvas
                Fit" buttons with icon-based fit options + a 3×3
                alignment grid so anyone can snap-fill or snap-align in
                one click, regardless of clip type.
              */}
              <CanvasFitAlignSection clip={clip} dispatch={dispatch} />

              <Separator />

              <SplitSection clip={clip} dispatch={dispatch} />
            </TabsContent>

            <TabsContent value="effects" className="m-0">
              {/*
                Adjustment-clip types replace the standard Effects panel with
                their own focused editor (Mask Layer or Blur Region). Regular
                media/text clips get the full Effects + Mask + Filters stack,
                with Green Screen surfaced for video/image only.
              */}
              {clip.mediaType === "maskLayer" && (
                <>
                  <MaskSection clip={clip} dispatch={dispatch} />
                  <Separator />
                  <div className="px-3 py-3 text-[10px] text-muted-foreground leading-snug">
                    This mask layer cuts out the visible composite of all media beneath it. Use the Basic tab to keyframe its position, size, rotation and scale; the cutout shape will animate along with the clip rectangle.
                  </div>
                </>
              )}
              {clip.mediaType === "logoBlur" && (
                <>
                  <LogoBlurSection clip={clip} dispatch={dispatch} />
                  <Separator />
                  <div className="px-3 py-3 text-[10px] text-muted-foreground leading-snug">
                    Use the Basic tab to keyframe X / Y / W / H to track moving logos and faces.
                  </div>
                </>
              )}
              {clip.mediaType !== "maskLayer" && clip.mediaType !== "logoBlur" && (
              <>
              <EffectsSection clip={clip} dispatch={dispatch} />
              {(clip.mediaType === "video" || clip.mediaType === "image") && (
                <>
                  <Separator />
                  <ChromaKeySection clip={clip} dispatch={dispatch} />
                </>
              )}
              <MaskSection clip={clip} dispatch={dispatch} />

              <Separator />

              <Section title="Filter Presets">
                <div className="grid grid-cols-3 gap-1.5">
                  {FILTER_PRESETS.map((p) => (
                    <Button
                      key={p.key}
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => dispatch({ type: "APPLY_OPERATIONS", payload: [{ type: "applyPreset", payload: { clipId: clip.id, preset: p.key } }] })}
                    >
                      {p.name}
                    </Button>
                  ))}
                </div>
              </Section>

              <Separator />

              <Section title="Color & Filters" action={
                <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => update({ filters: { ...DEFAULT_FILTERS } })} title="Reset">
                  <RotateCcw className="w-3 h-3" />
                </Button>
              }>
                <NumPair label="Brightness" value={liveVal("brightness", clip.filters.brightness)} min={0} max={200} step={1} suffix="%" onChange={(v) => updateFilter("brightness", v)} onKeyframe={() => addKeyframe("brightness")} hasKeyframe={hasKf("brightness")} isAtKeyframe={isAtKf("brightness")} tweened={isTweened("brightness")} onToggleTween={() => toggleTween("brightness")} />
                <NumPair label="Contrast" value={liveVal("contrast", clip.filters.contrast)} min={0} max={200} step={1} suffix="%" onChange={(v) => updateFilter("contrast", v)} onKeyframe={() => addKeyframe("contrast")} hasKeyframe={hasKf("contrast")} isAtKeyframe={isAtKf("contrast")} tweened={isTweened("contrast")} onToggleTween={() => toggleTween("contrast")} />
                <NumPair label="Saturation" value={liveVal("saturation", clip.filters.saturation)} min={0} max={200} step={1} suffix="%" onChange={(v) => updateFilter("saturation", v)} onKeyframe={() => addKeyframe("saturation")} hasKeyframe={hasKf("saturation")} isAtKeyframe={isAtKf("saturation")} tweened={isTweened("saturation")} onToggleTween={() => toggleTween("saturation")} />
                <NumPair label="Hue" value={liveVal("hue", clip.filters.hue)} min={-180} max={180} step={1} suffix="°" onChange={(v) => updateFilter("hue", v)} onKeyframe={() => addKeyframe("hue")} hasKeyframe={hasKf("hue")} isAtKeyframe={isAtKf("hue")} tweened={isTweened("hue")} onToggleTween={() => toggleTween("hue")} />
                <NumPair label="Blur" value={liveVal("blur", clip.filters.blur)} min={0} max={20} step={0.5} suffix="px" onChange={(v) => updateFilter("blur", v)} onKeyframe={() => addKeyframe("blur")} hasKeyframe={hasKf("blur")} isAtKeyframe={isAtKf("blur")} tweened={isTweened("blur")} onToggleTween={() => toggleTween("blur")} />
                <NumPair label="Grayscale" value={liveVal("grayscale", clip.filters.grayscale)} min={0} max={100} step={1} suffix="%" onChange={(v) => updateFilter("grayscale", v)} onKeyframe={() => addKeyframe("grayscale")} hasKeyframe={hasKf("grayscale")} isAtKeyframe={isAtKf("grayscale")} tweened={isTweened("grayscale")} onToggleTween={() => toggleTween("grayscale")} />
                <NumPair label="Sepia" value={liveVal("sepia", clip.filters.sepia)} min={0} max={100} step={1} suffix="%" onChange={(v) => updateFilter("sepia", v)} onKeyframe={() => addKeyframe("sepia")} hasKeyframe={hasKf("sepia")} isAtKeyframe={isAtKf("sepia")} tweened={isTweened("sepia")} onToggleTween={() => toggleTween("sepia")} />
                <NumPair label="Invert" value={liveVal("invert", clip.filters.invert)} min={0} max={100} step={1} suffix="%" onChange={(v) => updateFilter("invert", v)} onKeyframe={() => addKeyframe("invert")} hasKeyframe={hasKf("invert")} isAtKeyframe={isAtKf("invert")} tweened={isTweened("invert")} onToggleTween={() => toggleTween("invert")} />
              </Section>

              <Separator />

              <Section title="Blend">
                <Select value={clip.blendMode} onValueChange={(v) => update({ blendMode: v })}>
                  <SelectTrigger className="h-7 text-xs" data-testid="select-blend-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BLEND_MODES.map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Section>

              <Separator />

              <Section title="Crop" action={
                <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => update({ cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1 })} title="Reset crop">
                  <RotateCcw className="w-3 h-3" />
                </Button>
              }>
                {(clip.mediaType === "video" || clip.mediaType === "image") && onCroppingChange && (
                  <Button
                    variant={isCropping ? "secondary" : "outline"}
                    size="sm"
                    className={`h-7 w-full text-xs ${isCropping ? "bg-amber-500/30 hover:bg-amber-500/40 text-amber-100 border-amber-400/60" : ""}`}
                    onClick={() => onCroppingChange(!isCropping)}
                    title="Toggle on-canvas crop tool (C)"
                  >
                    <Crop className="w-3 h-3 mr-1.5" />
                    {isCropping ? "Exit Crop Mode" : "Crop on Canvas"}
                  </Button>
                )}
                <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Crop className="w-3 h-3" /> Zoom into a region (0–1 fractions of source).</p>
                <NumPair label="Crop X" value={clip.cropX} min={0} max={0.95} step={0.01} onChange={(v) => update({ cropX: Math.min(v, 1 - clip.cropWidth) })} />
                <NumPair label="Crop Y" value={clip.cropY} min={0} max={0.95} step={0.01} onChange={(v) => update({ cropY: Math.min(v, 1 - clip.cropHeight) })} />
                <NumPair label="Crop W" value={clip.cropWidth} min={0.05} max={1} step={0.01} onChange={(v) => update({ cropWidth: Math.min(v, 1 - clip.cropX) })} />
                <NumPair label="Crop H" value={clip.cropHeight} min={0.05} max={1} step={0.01} onChange={(v) => update({ cropHeight: Math.min(v, 1 - clip.cropY) })} />
                <div className="grid grid-cols-3 gap-1">
                  <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => update({ cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1 })}>Full</Button>
                  <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => update({ cropX: 0.125, cropY: 0, cropWidth: 0.75, cropHeight: 1 })}>Center 3:4</Button>
                  <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => update({ cropX: 0.21, cropY: 0, cropWidth: 0.5625, cropHeight: 1 })}>9:16</Button>
                </div>
              </Section>
              </>
              )}
            </TabsContent>

            <TabsContent value="anim" className="m-0">
              <Section title="Transition In">
                <Select
                  value={(clip.transitionIn?.type ?? "none") as string}
                  onValueChange={(v) => update({ transitionIn: { type: v as TransitionType, duration: clip.transitionIn?.duration ?? 0.5 } })}
                >
                  <SelectTrigger className="h-7 text-xs" data-testid="select-transition-in">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {TRANSITION_CATEGORIES.map((cat) => {
                      const items = TRANSITIONS.filter((t) => t.category === cat);
                      if (items.length === 0) return null;
                      return (
                        <div key={cat}>
                          <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-muted-foreground">{cat}</div>
                          {items.map((t) => (
                            <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                          ))}
                        </div>
                      );
                    })}
                  </SelectContent>
                </Select>
                <NumPair
                  label="Duration"
                  value={clip.transitionIn?.duration ?? 0.5}
                  min={0.1} max={3} step={0.1} suffix="s"
                  onChange={(v) => update({ transitionIn: { type: clip.transitionIn?.type ?? "none", duration: v } })}
                />
                <p className="text-[10px] text-muted-foreground">
                  Blends with the previous clip on the same track during the first {(clip.transitionIn?.duration ?? 0.5).toFixed(1)}s.
                </p>
              </Section>

              <Separator />

              <Section title="Animation In">
                <Select value={clip.animationIn} onValueChange={(v) => update({ animationIn: v })}>
                  <SelectTrigger className="h-7 text-xs" data-testid="select-animation-in">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANIMATIONS.map((a) => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                <NumPair label="Duration" value={clip.animationInDuration} min={0.1} max={5} step={0.1} suffix="s" onChange={(v) => update({ animationInDuration: v })} />
              </Section>

              <Separator />

              <Section title="Animation Out">
                <Select value={clip.animationOut} onValueChange={(v) => update({ animationOut: v })}>
                  <SelectTrigger className="h-7 text-xs" data-testid="select-animation-out">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANIMATIONS.map((a) => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                <NumPair label="Duration" value={clip.animationOutDuration} min={0.1} max={5} step={0.1} suffix="s" onChange={(v) => update({ animationOutDuration: v })} />
              </Section>

              <Separator />

              <Section title="Speed">
                <NumPair label="Playback" value={clip.speed} min={0.25} max={4} step={0.05} suffix="x" onChange={(v) => update({ speed: v })} />
                <div className="grid grid-cols-4 gap-1">
                  {[0.5, 1, 1.5, 2].map((s) => (
                    <Button key={s} variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => update({ speed: s })}>{s}x</Button>
                  ))}
                </div>
              </Section>

              {state.keyframes.filter((k) => k.clipId === clip.id).length > 0 && (
                <>
                  <Separator />
                  <Section title="Keyframes">
                    <div className="space-y-1 max-h-52 overflow-y-auto">
                      {state.keyframes
                        .filter((k) => k.clipId === clip.id)
                        .sort((a, b) => a.time - b.time)
                        .map((kf) => (
                          <div key={kf.id} className="bg-muted/30 rounded overflow-hidden group">
                            <div className="flex items-center gap-1.5 px-2 py-1 text-[10px]">
                              <Diamond className="w-2.5 h-2.5 text-yellow-400 fill-current shrink-0" />
                              <span className="text-yellow-300 font-medium min-w-[56px]">{kf.property}</span>
                              <button
                                className="tabular-nums text-muted-foreground hover:text-primary"
                                title="Jump to this keyframe"
                                onClick={() => dispatch({ type: "SET_TIME", payload: kf.time })}
                              >
                                {kf.time.toFixed(2)}s
                              </button>
                              <span className="tabular-nums text-foreground ml-auto">
                                {typeof kf.value === "number" ? kf.value.toFixed(2) : kf.value}
                              </span>
                              <button
                                className="opacity-0 group-hover:opacity-100 ml-1"
                                onClick={() => dispatch({ type: "DELETE_KEYFRAME", payload: kf.id })}
                                title="Delete keyframe"
                              >
                                <Trash2 className="w-2.5 h-2.5 text-destructive" />
                              </button>
                            </div>
                            <div className="px-2 pb-1.5">
                              <Select
                                value={kf.easing || "quadInOut"}
                                onValueChange={(v) =>
                                  dispatch({
                                    type: "UPDATE_KEYFRAME",
                                    payload: { id: kf.id, easing: v as EasingType },
                                  })
                                }
                              >
                                <SelectTrigger className="h-5 text-[9px] bg-muted/40 border-0 px-1.5 gap-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="text-xs max-h-52">
                                  {([
                                    ["─── Linear", null],
                                    ["Linear", "linear"],
                                    ["─── Quadratic", null],
                                    ["Quad In", "quadIn"],
                                    ["Quad Out", "quadOut"],
                                    ["Quad In-Out", "quadInOut"],
                                    ["─── Cubic", null],
                                    ["Cubic In", "cubicIn"],
                                    ["Cubic Out", "cubicOut"],
                                    ["Cubic In-Out", "cubicInOut"],
                                    ["─── Quartic", null],
                                    ["Quart In", "quartIn"],
                                    ["Quart Out", "quartOut"],
                                    ["Quart In-Out", "quartInOut"],
                                    ["─── Sinusoidal", null],
                                    ["Sine In", "sineIn"],
                                    ["Sine Out", "sineOut"],
                                    ["Sine In-Out", "sineInOut"],
                                    ["─── Exponential", null],
                                    ["Expo In", "expoIn"],
                                    ["Expo Out", "expoOut"],
                                    ["Expo In-Out", "expoInOut"],
                                    ["─── Back (overshoot)", null],
                                    ["Back In", "backIn"],
                                    ["Back Out", "backOut"],
                                    ["Back In-Out", "backInOut"],
                                    ["─── Elastic", null],
                                    ["Elastic In", "elasticIn"],
                                    ["Elastic Out", "elasticOut"],
                                    ["Elastic In-Out", "elasticInOut"],
                                    ["─── Bounce", null],
                                    ["Bounce In", "bounceIn"],
                                    ["Bounce Out", "bounceOut"],
                                    ["Bounce In-Out", "bounceInOut"],
                                  ] as [string, string | null][]).map(([label, value]) =>
                                    value === null ? (
                                      <div key={label} className="px-2 py-0.5 text-[9px] text-muted-foreground font-medium tracking-wider">
                                        {label}
                                      </div>
                                    ) : (
                                      <SelectItem key={value} value={value} className="text-xs">
                                        {label}
                                      </SelectItem>
                                    ),
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1 leading-relaxed">
                      Drag diamonds on timeline to reposition · right-click to delete
                    </p>
                  </Section>
                </>
              )}
            </TabsContent>

            <TabsContent value="audio" className="m-0">
              <Section title="Volume">
                <NumPair label="Volume" value={clip.volume} min={0} max={1} step={0.01} onChange={(v) => update({ volume: v })} onKeyframe={() => addKeyframe("volume")} hasKeyframe={hasKf("volume")} isAtKeyframe={isAtKf("volume")} />
                <Button
                  variant={clip.muted ? "secondary" : "outline"}
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={() => update({ muted: !clip.muted })}
                >
                  {clip.muted ? <VolumeX className="w-3 h-3 mr-1" /> : <Volume2 className="w-3 h-3 mr-1" />}
                  {clip.muted ? "Unmute" : "Mute"}
                </Button>
              </Section>
            </TabsContent>

            {clip.mediaType === "text" && (
              <TabsContent value="text" className="m-0">
                <TextStylePanel clip={clip} update={update} />
              </TabsContent>
            )}
          </div>
        </Tabs>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Text styling panel — fonts, gradients, stroke, glow, shadow, curve, bg
// ────────────────────────────────────────────────────────────────────────────

const DEFAULT_GRADIENT: TextGradient = {
  enabled: true,
  color1: "#ff7a59",
  color2: "#7c3aed",
  angle: 90,
};
const DEFAULT_BG_GRADIENT: TextGradient = {
  enabled: true,
  color1: "#0f172a",
  color2: "#1e3a8a",
  angle: 135,
};
const DEFAULT_STROKE: TextStroke = { enabled: true, color: "#000000", width: 2 };
const DEFAULT_GLOW: TextGlow = { enabled: true, color: "#22d3ee", blur: 8, intensity: 3 };
const DEFAULT_SHADOW: TextShadow = {
  enabled: true,
  color: "#000000cc",
  offsetX: 0,
  offsetY: 4,
  blur: 12,
};
const DEFAULT_BG: TextBackground = {
  color: "transparent",
  gradient: { enabled: false, color1: "#0f172a", color2: "#1e3a8a", angle: 135 },
  borderColor: "#ffffff",
  borderWidth: 0,
  borderRadius: 12,
  padding: 12,
};

function TextStylePanel({
  clip,
  update,
}: {
  clip: Clip;
  update: (updates: Partial<Clip>) => void;
}) {
  const ts = clip.textStyle!;
  const setTs = (patch: Partial<TextStyle>) =>
    update({ textStyle: { ...ts, ...patch } });
  const grad = ts.gradient || { ...DEFAULT_GRADIENT, enabled: false };
  const stroke = ts.stroke || { ...DEFAULT_STROKE, enabled: false };
  const glow = ts.glow || { ...DEFAULT_GLOW, enabled: false };
  const shadow = ts.textShadow || { ...DEFAULT_SHADOW, enabled: false };
  const bg = ts.bg || DEFAULT_BG;

  return (
    <>
      <Section title="Content">
        <textarea
          key={clip.id}
          value={clip.text || ""}
          onChange={(e) => update({ text: e.target.value })}
          className="w-full text-xs p-2 bg-muted/20 border border-border rounded resize-none"
          rows={3}
          placeholder="Enter text..."
          data-testid="text-content-input"
        />
        <div className="flex items-center gap-2 rounded border border-white/10 bg-black/20 px-2 py-1.5">
          <input
            id="text-auto-scale"
            type="checkbox"
            className="w-3.5 h-3.5 accent-primary"
            checked={clip.textAutoScale !== false}
            onChange={(e) => update({ textAutoScale: e.target.checked })}
            data-testid="text-auto-scale-toggle"
          />
          <label htmlFor="text-auto-scale" className="text-[10px] flex-1 cursor-pointer">
            <span className="font-medium">Resize scales text</span>
            <span className="block text-muted-foreground">
              {clip.textAutoScale !== false
                ? "Text grows/shrinks with the box."
                : "Only the box resizes; text stays the same size."}
            </span>
          </label>
        </div>
      </Section>

      <Section title="Font">
        <Select value={ts.fontFamily} onValueChange={(v) => setTs({ fontFamily: v })}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {(["Sans", "Serif", "Display", "Handwriting", "Mono"] as const).map((cat) => (
              <div key={cat}>
                <div className="px-2 py-1 text-[9px] uppercase tracking-widest text-muted-foreground sticky top-0 bg-popover">
                  {cat}
                </div>
                {FONT_OPTIONS.filter((f) => f.category === cat).map((f) => (
                  <SelectItem key={f.value} value={f.value} className="text-xs">
                    <span style={{ fontFamily: f.value }}>{f.label}</span>
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <Label className="text-[10px] text-muted-foreground">Size</Label>
            <Input
              type="number"
              value={ts.fontSize || 64}
              onChange={(e) => setTs({ fontSize: parseInt(e.target.value) || 64 })}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Weight</Label>
            <Select
              value={String(ts.fontWeight || 700)}
              onValueChange={(v) => setTs({ fontWeight: parseInt(v) })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[300, 400, 500, 600, 700, 800, 900].map((w) => (
                  <SelectItem key={w} value={String(w)} className="text-xs">
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <Label className="text-[10px] text-muted-foreground">Letter Spacing</Label>
            <Input
              type="number"
              value={ts.letterSpacing ?? 0}
              step={0.5}
              onChange={(e) => setTs({ letterSpacing: parseFloat(e.target.value) || 0 })}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Line Height</Label>
            <Input
              type="number"
              value={ts.lineHeight ?? 1.1}
              step={0.05}
              onChange={(e) => setTs({ lineHeight: parseFloat(e.target.value) || 1.1 })}
              className="h-7 text-xs"
            />
          </div>
        </div>
        <Select value={ts.align || "center"} onValueChange={(v: any) => setTs({ align: v })}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["left", "center", "right"].map((a) => (
              <SelectItem key={a} value={a} className="text-xs">
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1.5">
          <Button
            variant={ts.italic ? "secondary" : "outline"}
            size="sm"
            className="h-7 text-xs flex-1 italic"
            onClick={() => setTs({ italic: !ts.italic })}
          >
            I
          </Button>
          <Button
            variant={ts.underline ? "secondary" : "outline"}
            size="sm"
            className="h-7 text-xs flex-1 underline"
            onClick={() => setTs({ underline: !ts.underline })}
          >
            U
          </Button>
        </div>
      </Section>

      <Section title="Fill">
        <div className="flex items-center gap-2">
          <Label className="text-[10px] text-muted-foreground w-12">Color</Label>
          <input
            type="color"
            value={ts.color || "#ffffff"}
            onChange={(e) => setTs({ color: e.target.value })}
            className="h-7 w-10 rounded border border-border"
          />
          <Input
            type="text"
            value={ts.color || "#ffffff"}
            onChange={(e) => setTs({ color: e.target.value })}
            className="h-7 text-[10px] flex-1 font-mono"
          />
        </div>
        <ToggleHeader
          label="Gradient Fill"
          enabled={!!grad.enabled}
          onToggle={(v) =>
            setTs({ gradient: v ? { ...DEFAULT_GRADIENT, ...grad, enabled: true } : { ...grad, enabled: false } })
          }
        />
        {grad.enabled && (
          <GradientControls
            grad={grad}
            onChange={(g) => setTs({ gradient: g })}
          />
        )}
      </Section>

      <Section title="Stroke">
        <ToggleHeader
          label="Outline"
          enabled={!!stroke.enabled}
          onToggle={(v) =>
            setTs({ stroke: v ? { ...DEFAULT_STROKE, ...stroke, enabled: true } : { ...stroke, enabled: false } })
          }
        />
        {stroke.enabled && (
          <>
            <div className="flex items-center gap-2">
              <Label className="text-[10px] text-muted-foreground w-12">Color</Label>
              <input
                type="color"
                value={stroke.color}
                onChange={(e) => setTs({ stroke: { ...stroke, color: e.target.value } })}
                className="h-7 w-10 rounded border border-border"
              />
              <Input
                type="text"
                value={stroke.color}
                onChange={(e) => setTs({ stroke: { ...stroke, color: e.target.value } })}
                className="h-7 text-[10px] flex-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Width: {stroke.width}px</Label>
              <Slider
                value={[stroke.width]}
                min={0}
                max={20}
                step={0.5}
                onValueChange={([v]) => setTs({ stroke: { ...stroke, width: v } })}
                className="mt-1"
              />
            </div>
          </>
        )}
      </Section>

      <Section title="Glow">
        <ToggleHeader
          label="Neon Glow"
          enabled={!!glow.enabled}
          onToggle={(v) =>
            setTs({ glow: v ? { ...DEFAULT_GLOW, ...glow, enabled: true } : { ...glow, enabled: false } })
          }
        />
        {glow.enabled && (
          <>
            <div className="flex items-center gap-2">
              <Label className="text-[10px] text-muted-foreground w-12">Color</Label>
              <input
                type="color"
                value={glow.color}
                onChange={(e) => setTs({ glow: { ...glow, color: e.target.value } })}
                className="h-7 w-10 rounded border border-border"
              />
              <Input
                type="text"
                value={glow.color}
                onChange={(e) => setTs({ glow: { ...glow, color: e.target.value } })}
                className="h-7 text-[10px] flex-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Blur: {glow.blur}px</Label>
              <Slider
                value={[glow.blur]}
                min={1}
                max={40}
                step={1}
                onValueChange={([v]) => setTs({ glow: { ...glow, blur: v } })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Intensity: {glow.intensity}</Label>
              <Slider
                value={[glow.intensity]}
                min={1}
                max={6}
                step={1}
                onValueChange={([v]) => setTs({ glow: { ...glow, intensity: v } })}
                className="mt-1"
              />
            </div>
          </>
        )}
      </Section>

      <Section title="Drop Shadow">
        <ToggleHeader
          label="Shadow"
          enabled={!!shadow.enabled}
          onToggle={(v) =>
            setTs({ textShadow: v ? { ...DEFAULT_SHADOW, ...shadow, enabled: true } : { ...shadow, enabled: false } })
          }
        />
        {shadow.enabled && (
          <>
            <div className="flex items-center gap-2">
              <Label className="text-[10px] text-muted-foreground w-12">Color</Label>
              <input
                type="color"
                value={shadow.color.length > 7 ? shadow.color.slice(0, 7) : shadow.color}
                onChange={(e) => setTs({ textShadow: { ...shadow, color: e.target.value } })}
                className="h-7 w-10 rounded border border-border"
              />
              <Input
                type="text"
                value={shadow.color}
                onChange={(e) => setTs({ textShadow: { ...shadow, color: e.target.value } })}
                className="h-7 text-[10px] flex-1 font-mono"
              />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <Label className="text-[10px] text-muted-foreground">X</Label>
                <Input
                  type="number"
                  value={shadow.offsetX}
                  onChange={(e) =>
                    setTs({ textShadow: { ...shadow, offsetX: parseInt(e.target.value) || 0 } })
                  }
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Y</Label>
                <Input
                  type="number"
                  value={shadow.offsetY}
                  onChange={(e) =>
                    setTs({ textShadow: { ...shadow, offsetY: parseInt(e.target.value) || 0 } })
                  }
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Blur</Label>
                <Input
                  type="number"
                  value={shadow.blur}
                  onChange={(e) =>
                    setTs({ textShadow: { ...shadow, blur: parseInt(e.target.value) || 0 } })
                  }
                  className="h-7 text-xs"
                />
              </div>
            </div>
          </>
        )}
      </Section>

      <Section title="Curve">
        <Label className="text-[10px] text-muted-foreground">Bend: {ts.curve ?? 0}°</Label>
        <Slider
          value={[ts.curve ?? 0]}
          min={-180}
          max={180}
          step={1}
          onValueChange={([v]) => setTs({ curve: v })}
          className="mt-1"
        />
        <p className="text-[10px] text-muted-foreground leading-snug">
          0° = straight. Positive bends down (smile), negative bends up (frown). At ±180° text wraps half a circle.
        </p>
      </Section>

      <Section title="Background">
        <div className="flex items-center gap-2">
          <Label className="text-[10px] text-muted-foreground w-12">Fill</Label>
          <input
            type="color"
            value={bg.color === "transparent" ? "#000000" : bg.color}
            onChange={(e) => setTs({ bg: { ...bg, color: e.target.value } })}
            className="h-7 w-10 rounded border border-border"
            disabled={bg.gradient.enabled}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] flex-1"
            onClick={() => setTs({ bg: { ...bg, color: "transparent" } })}
          >
            None
          </Button>
        </div>
        <ToggleHeader
          label="Gradient BG"
          enabled={bg.gradient.enabled}
          onToggle={(v) =>
            setTs({
              bg: {
                ...bg,
                gradient: v ? { ...DEFAULT_BG_GRADIENT, ...bg.gradient, enabled: true } : { ...bg.gradient, enabled: false },
              },
            })
          }
        />
        {bg.gradient.enabled && (
          <GradientControls
            grad={bg.gradient}
            onChange={(g) => setTs({ bg: { ...bg, gradient: g } })}
          />
        )}
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <Label className="text-[10px] text-muted-foreground">Padding</Label>
            <Input
              type="number"
              value={bg.padding}
              onChange={(e) => setTs({ bg: { ...bg, padding: parseInt(e.target.value) || 0 } })}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Radius</Label>
            <Input
              type="number"
              value={bg.borderRadius}
              onChange={(e) => setTs({ bg: { ...bg, borderRadius: parseInt(e.target.value) || 0 } })}
              className="h-7 text-xs"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 items-end">
          <div>
            <Label className="text-[10px] text-muted-foreground">Border</Label>
            <input
              type="color"
              value={bg.borderColor}
              onChange={(e) => setTs({ bg: { ...bg, borderColor: e.target.value } })}
              className="h-7 w-full rounded border border-border"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Width</Label>
            <Input
              type="number"
              value={bg.borderWidth}
              onChange={(e) => setTs({ bg: { ...bg, borderWidth: parseInt(e.target.value) || 0 } })}
              className="h-7 text-xs"
            />
          </div>
        </div>
      </Section>
    </>
  );
}

function ToggleHeader({
  label,
  enabled,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-[11px] font-medium">{label}</Label>
      <Button
        size="sm"
        variant={enabled ? "secondary" : "outline"}
        className="h-6 px-2 text-[10px]"
        onClick={() => onToggle(!enabled)}
      >
        {enabled ? "On" : "Off"}
      </Button>
    </div>
  );
}

function GradientControls({
  grad,
  onChange,
}: {
  grad: TextGradient;
  onChange: (g: TextGradient) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <Label className="text-[10px] text-muted-foreground">Color 1</Label>
          <input
            type="color"
            value={grad.color1}
            onChange={(e) => onChange({ ...grad, color1: e.target.value })}
            className="h-7 w-full rounded border border-border"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Color 2</Label>
          <input
            type="color"
            value={grad.color2}
            onChange={(e) => onChange({ ...grad, color2: e.target.value })}
            className="h-7 w-full rounded border border-border"
          />
        </div>
      </div>
      <div>
        <Label className="text-[10px] text-muted-foreground">Angle: {grad.angle}°</Label>
        <Slider
          value={[grad.angle]}
          min={0}
          max={360}
          step={5}
          onValueChange={([v]) => onChange({ ...grad, angle: v })}
          className="mt-1"
        />
      </div>
      <div
        className="h-6 rounded border border-border"
        style={{
          background: `linear-gradient(${grad.angle}deg, ${grad.color1}, ${grad.color2})`,
        }}
      />
    </>
  );
}
