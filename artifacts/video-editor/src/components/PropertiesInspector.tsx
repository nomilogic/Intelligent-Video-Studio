import { EditorState, EditorAction, Clip, DEFAULT_FILTERS, EasingType } from "../lib/types";
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
      <div className="flex justify-between text-xs">
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
        <span className={`tabular-nums ${hasKeyframe ? "text-yellow-400" : "text-foreground"}`}>
          {value.toFixed(value < 1 && value > -1 ? 2 : 1)}{suffix}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
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
                <input type="color" value={state.background} onChange={(e) => dispatch({ type: "SET_BACKGROUND", payload: e.target.value })} className="h-7 w-full bg-transparent border border-border rounded" />
              </div>
            </div>
          </Section>
          <Separator />
          <Section title="Aspect Ratio Presets">
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: "16:9 1080p", w: 1920, h: 1080 },
                { label: "16:9 4K", w: 3840, h: 2160 },
                { label: "9:16 TikTok", w: 1080, h: 1920 },
                { label: "9:16 Reels", w: 1080, h: 1920 },
                { label: "1:1 Square", w: 1080, h: 1080 },
                { label: "4:5 IG Post", w: 1080, h: 1350 },
                { label: "2:3 Pinterest", w: 1000, h: 1500 },
                { label: "3:4 Portrait", w: 1080, h: 1440 },
                { label: "21:9 Cinema", w: 2560, h: 1080 },
                { label: "2.39 Ultrawide", w: 2390, h: 1000 },
                { label: "4:3 Classic", w: 1440, h: 1080 },
                { label: "5:4 Photo", w: 1280, h: 1024 },
                { label: "YT Short", w: 1080, h: 1920 },
                { label: "FB Cover", w: 1640, h: 924 },
              ].map((r) => {
                const active = state.canvasWidth === r.w && state.canvasHeight === r.h;
                return (
                  <Button
                    key={r.label}
                    variant={active ? "secondary" : "outline"}
                    size="sm"
                    className="h-7 text-[10px] px-1.5"
                    onClick={() => dispatch({ type: "SET_CANVAS_SIZE", payload: { width: r.w, height: r.h } })}
                  >
                    {r.label}
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
            <TabsTrigger value="effects" className="text-[10px]">Effects</TabsTrigger>
            <TabsTrigger value="anim" className="text-[10px]">Anim</TabsTrigger>
            {clip.mediaType === "text" && <TabsTrigger value="text" className="text-[10px]">Text</TabsTrigger>}
            {clip.mediaType !== "text" && <TabsTrigger value="audio" className="text-[10px]">Audio</TabsTrigger>}
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

                {(clip.mediaType === "video" || clip.mediaType === "image") && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase">Canvas Fit</Label>
                    <div className="grid grid-cols-2 gap-1">
                      <Button
                        variant="outline" size="sm" className="h-7 text-[10px]"
                        title="Stretch to fill canvas (ignores aspect ratio)"
                        onClick={() => update({ x: 0, y: 0, width: 1, height: 1 })}
                      >
                        Stretch Fill
                      </Button>
                      <Button
                        variant="outline" size="sm" className="h-7 text-[10px]"
                        title="Scale to cover canvas, maintaining aspect ratio (may overflow)"
                        onClick={() => {
                          const s = 1 / Math.min(clip.width, clip.height);
                          const nw = clip.width * s;
                          const nh = clip.height * s;
                          update({ x: (1 - nw) / 2, y: (1 - nh) / 2, width: nw, height: nh });
                        }}
                      >
                        Scale Fill
                      </Button>
                      <Button
                        variant="outline" size="sm" className="h-7 text-[10px]"
                        title="Scale to fit inside canvas, maintaining aspect ratio"
                        onClick={() => {
                          const s = 1 / Math.max(clip.width, clip.height);
                          const nw = clip.width * s;
                          const nh = clip.height * s;
                          update({ x: (1 - nw) / 2, y: (1 - nh) / 2, width: nw, height: nh });
                        }}
                      >
                        Scale Fit
                      </Button>
                      <Button
                        variant="outline" size="sm" className="h-7 text-[10px]"
                        title="Center at original proportion (50% of canvas)"
                        onClick={() => {
                          const ratio = clip.width / clip.height;
                          const nw = Math.min(0.8, ratio >= 1 ? 0.8 : 0.8 * ratio);
                          const nh = nw / ratio;
                          update({ x: (1 - nw) / 2, y: (1 - nh) / 2, width: nw, height: nh, rotation: 0, scale: 1 });
                        }}
                      >
                        Original Ratio
                      </Button>
                    </div>
                  </div>
                )}

                <NumPair label="Border Radius" value={clip.borderRadius} min={0} max={64} step={1} suffix="px" onChange={(v) => update({ borderRadius: v })} />
              </Section>

              <Separator />

              <SplitSection clip={clip} dispatch={dispatch} />
            </TabsContent>

            <TabsContent value="effects" className="m-0">
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
            </TabsContent>

            <TabsContent value="anim" className="m-0">
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
                <Section title="Text">
                  <textarea
                    value={clip.text || ""}
                    onChange={(e) => update({ text: e.target.value })}
                    className="w-full text-xs p-2 bg-muted/20 border border-border rounded resize-none"
                    rows={3}
                    placeholder="Enter text..."
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Font Size</Label>
                      <Input type="number" value={clip.textStyle?.fontSize || 64} onChange={(e) => update({ textStyle: { ...clip.textStyle!, fontSize: parseInt(e.target.value) || 64 } })} className="h-7 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Weight</Label>
                      <Select value={String(clip.textStyle?.fontWeight || 700)} onValueChange={(v) => update({ textStyle: { ...clip.textStyle!, fontWeight: parseInt(v) } })}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[300, 400, 500, 600, 700, 800, 900].map((w) => (
                            <SelectItem key={w} value={String(w)} className="text-xs">{w}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Color</Label>
                      <input type="color" value={clip.textStyle?.color || "#ffffff"} onChange={(e) => update({ textStyle: { ...clip.textStyle!, color: e.target.value } })} className="h-7 w-full rounded border border-border" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">BG</Label>
                      <input type="color" value={clip.textStyle?.background === "transparent" ? "#000000" : clip.textStyle?.background || "#000000"} onChange={(e) => update({ textStyle: { ...clip.textStyle!, background: e.target.value } })} className="h-7 w-full rounded border border-border" />
                    </div>
                  </div>
                  <Select value={clip.textStyle?.align || "center"} onValueChange={(v: any) => update({ textStyle: { ...clip.textStyle!, align: v } })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["left", "center", "right"].map((a) => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1.5">
                    <Button variant={clip.textStyle?.italic ? "secondary" : "outline"} size="sm" className="h-7 text-xs flex-1 italic" onClick={() => update({ textStyle: { ...clip.textStyle!, italic: !clip.textStyle?.italic } })}>I</Button>
                    <Button variant={clip.textStyle?.underline ? "secondary" : "outline"} size="sm" className="h-7 text-xs flex-1 underline" onClick={() => update({ textStyle: { ...clip.textStyle!, underline: !clip.textStyle?.underline } })}>U</Button>
                    <Button variant={clip.textStyle?.shadow ? "secondary" : "outline"} size="sm" className="h-7 text-xs flex-1" onClick={() => update({ textStyle: { ...clip.textStyle!, shadow: !clip.textStyle?.shadow } })}>
                      <Wand2 className="w-3 h-3 mr-1" /> Shadow
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => update({ textStyle: { ...clip.textStyle!, background: "transparent" } })}>Transparent BG</Button>
                </Section>
              </TabsContent>
            )}
          </div>
        </Tabs>
      )}
    </div>
  );
}
