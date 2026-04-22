import { EditorState, EditorAction, Clip } from "../lib/types";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2, Diamond } from "lucide-react";

interface PropertiesInspectorProps {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

const ANIMATIONS = [
  "none", "fade", "slideLeft", "slideRight", "slideUp", "slideDown",
  "zoomIn", "zoomOut", "spin", "bounce"
];

const BLEND_MODES = [
  "normal", "multiply", "screen", "overlay", "darken",
  "lighten", "hard-light", "soft-light"
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium px-3 py-2 bg-muted/10">
        {title}
      </p>
      <div className="px-3 pb-3 space-y-3">{children}</div>
    </div>
  );
}

function NumInput({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground w-16 shrink-0">{label}</Label>
      <Input
        type="number"
        value={Number(value.toFixed(3))}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-7 text-xs tabular-nums bg-muted/20 border-border"
      />
    </div>
  );
}

export default function PropertiesInspector({ state, dispatch }: PropertiesInspectorProps) {
  const clip = state.clips.find((c) => c.id === state.selectedClipId);

  const update = (updates: Partial<Clip>) => {
    if (!clip) return;
    dispatch({ type: "UPDATE_CLIP", payload: { id: clip.id, updates } });
  };

  const addKeyframe = (property: string) => {
    if (!clip) return;
    const kfId = `kf-${Date.now()}`;
    const value = (clip as any)[property] ?? 0;
    dispatch({
      type: "APPLY_OPERATIONS",
      payload: [{
        type: "setKeyframe",
        payload: { clipId: clip.id, time: state.currentTime, property, value, id: kfId }
      }]
    });
  };

  return (
    <div
      data-testid="properties-inspector"
      className="w-60 flex flex-col border-l border-border bg-card shrink-0 overflow-y-auto"
    >
      <div className="px-3 py-2 border-b border-border">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Properties</p>
      </div>

      {!clip ? (
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
          Select a clip on the canvas or timeline to inspect its properties
        </div>
      ) : (
        <div className="flex-1">
          {/* Clip Identity */}
          <Section title="Clip">
            <div className="flex items-center gap-2 mt-1">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: clip.color }} />
              <Input
                value={clip.label}
                onChange={(e) => update({ label: e.target.value })}
                className="h-7 text-xs bg-muted/20 border-border flex-1"
                data-testid="input-clip-label"
              />
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 shrink-0"
                onClick={() => dispatch({ type: "DELETE_CLIP", payload: clip.id })}
                data-testid="button-delete-clip"
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div>
                <Label className="text-muted-foreground">Start</Label>
                <Input
                  type="number" step={0.1} value={clip.startTime.toFixed(1)}
                  onChange={(e) => update({ startTime: parseFloat(e.target.value) })}
                  className="h-7 text-xs bg-muted/20 border-border mt-0.5"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">Duration</Label>
                <Input
                  type="number" step={0.1} value={clip.duration.toFixed(1)}
                  onChange={(e) => update({ duration: parseFloat(e.target.value) })}
                  className="h-7 text-xs bg-muted/20 border-border mt-0.5"
                />
              </div>
            </div>
          </Section>

          <Separator />

          {/* Position & Size */}
          <Section title="Transform">
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <Label className="text-xs text-muted-foreground">X (%)</Label>
                <Input
                  type="number" step={0.01} min={0} max={1} value={clip.x.toFixed(2)}
                  onChange={(e) => update({ x: parseFloat(e.target.value) })}
                  className="h-7 text-xs bg-muted/20 border-border mt-0.5"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Y (%)</Label>
                <Input
                  type="number" step={0.01} min={0} max={1} value={clip.y.toFixed(2)}
                  onChange={(e) => update({ y: parseFloat(e.target.value) })}
                  className="h-7 text-xs bg-muted/20 border-border mt-0.5"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">W (%)</Label>
                <Input
                  type="number" step={0.01} min={0.01} max={1} value={clip.width.toFixed(2)}
                  onChange={(e) => update({ width: parseFloat(e.target.value) })}
                  className="h-7 text-xs bg-muted/20 border-border mt-0.5"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">H (%)</Label>
                <Input
                  type="number" step={0.01} min={0.01} max={1} value={clip.height.toFixed(2)}
                  onChange={(e) => update({ height: parseFloat(e.target.value) })}
                  className="h-7 text-xs bg-muted/20 border-border mt-0.5"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <Label className="text-muted-foreground">Rotation</Label>
                <span className="tabular-nums text-foreground">{clip.rotation.toFixed(0)}°</span>
              </div>
              <Slider
                value={[clip.rotation]} min={-180} max={180} step={1}
                onValueChange={([v]) => update({ rotation: v })}
                data-testid="slider-rotation"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <Label className="text-muted-foreground flex items-center gap-1">
                  Opacity
                  <button onClick={() => addKeyframe("opacity")} title="Add keyframe">
                    <Diamond className="w-2.5 h-2.5 text-accent hover:text-primary" />
                  </button>
                </Label>
                <span className="tabular-nums text-foreground">{(clip.opacity * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[clip.opacity]} min={0} max={1} step={0.01}
                onValueChange={([v]) => update({ opacity: v })}
                data-testid="slider-opacity"
              />
            </div>
          </Section>

          <Separator />

          {/* Crop */}
          <Section title="Crop">
            <NumInput label="X" value={clip.cropX} onChange={(v) => update({ cropX: v })} />
            <NumInput label="Y" value={clip.cropY} onChange={(v) => update({ cropY: v })} />
            <NumInput label="Width" value={clip.cropWidth} onChange={(v) => update({ cropWidth: v })} />
            <NumInput label="Height" value={clip.cropHeight} onChange={(v) => update({ cropHeight: v })} />
          </Section>

          <Separator />

          {/* Appearance */}
          <Section title="Appearance">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Blend Mode</Label>
              <Select value={clip.blendMode} onValueChange={(v) => update({ blendMode: v })}>
                <SelectTrigger className="h-7 text-xs bg-muted/20 border-border" data-testid="select-blend-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLEND_MODES.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <Label className="text-muted-foreground">Volume</Label>
                <span className="tabular-nums text-foreground">{(clip.volume * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[clip.volume]} min={0} max={1} step={0.01}
                onValueChange={([v]) => update({ volume: v })}
                data-testid="slider-volume"
              />
            </div>
          </Section>

          <Separator />

          {/* Animations */}
          <Section title="Animation In">
            <div className="space-y-1.5">
              <Select value={clip.animationIn} onValueChange={(v) => update({ animationIn: v })}>
                <SelectTrigger className="h-7 text-xs bg-muted/20 border-border" data-testid="select-animation-in">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANIMATIONS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <Label className="text-muted-foreground">Duration</Label>
                  <span className="tabular-nums text-foreground">{clip.animationInDuration.toFixed(1)}s</span>
                </div>
                <Slider
                  value={[clip.animationInDuration]} min={0.1} max={5} step={0.1}
                  onValueChange={([v]) => update({ animationInDuration: v })}
                />
              </div>
            </div>
          </Section>

          <Section title="Animation Out">
            <div className="space-y-1.5">
              <Select value={clip.animationOut} onValueChange={(v) => update({ animationOut: v })}>
                <SelectTrigger className="h-7 text-xs bg-muted/20 border-border" data-testid="select-animation-out">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANIMATIONS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <Label className="text-muted-foreground">Duration</Label>
                  <span className="tabular-nums text-foreground">{clip.animationOutDuration.toFixed(1)}s</span>
                </div>
                <Slider
                  value={[clip.animationOutDuration]} min={0.1} max={5} step={0.1}
                  onValueChange={([v]) => update({ animationOutDuration: v })}
                />
              </div>
            </div>
          </Section>

          {/* Keyframes */}
          {state.keyframes.filter((k) => k.clipId === clip.id).length > 0 && (
            <>
              <Separator />
              <Section title="Keyframes">
                <div className="space-y-1">
                  {state.keyframes
                    .filter((k) => k.clipId === clip.id)
                    .map((kf) => (
                      <div
                        key={kf.id}
                        className="flex items-center justify-between text-xs text-muted-foreground bg-muted/20 px-2 py-1 rounded"
                      >
                        <span className="text-accent">{kf.property}</span>
                        <span className="tabular-nums">{formatTime(kf.time)}</span>
                        <span>{typeof kf.value === "number" ? kf.value.toFixed(2) : kf.value}</span>
                      </div>
                    ))}
                </div>
              </Section>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
