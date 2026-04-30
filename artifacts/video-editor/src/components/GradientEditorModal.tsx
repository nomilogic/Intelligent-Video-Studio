import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Trash2, Copy } from "lucide-react";

export interface GradientStop {
  id: string;
  position: number;
  color: string;
  opacity: number;
}

export interface GradientConfig {
  kind: "linear" | "radial" | "conic" | "mesh";
  angle: number;
  stops: GradientStop[];
  cx?: number;
  cy?: number;
  animated?: boolean;
  animSpeed?: number;
}

const uid = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_GRADIENT: GradientConfig = {
  kind: "linear",
  angle: 90,
  stops: [
    { id: uid(), position: 0, color: "#6366f1", opacity: 1 },
    { id: uid(), position: 0.5, color: "#a855f7", opacity: 1 },
    { id: uid(), position: 1, color: "#ec4899", opacity: 1 },
  ],
};

const PRESETS: { name: string; config: Partial<GradientConfig> }[] = [
  { name: "Sunset", config: { kind: "linear", angle: 135, stops: [{ id: uid(), position: 0, color: "#ff6b6b", opacity: 1 }, { id: uid(), position: 0.5, color: "#ffd93d", opacity: 1 }, { id: uid(), position: 1, color: "#ff6b6b", opacity: 1 }] } },
  { name: "Ocean", config: { kind: "linear", angle: 180, stops: [{ id: uid(), position: 0, color: "#0ea5e9", opacity: 1 }, { id: uid(), position: 1, color: "#0f172a", opacity: 1 }] } },
  { name: "Aurora", config: { kind: "linear", angle: 135, stops: [{ id: uid(), position: 0, color: "#4ade80", opacity: 1 }, { id: uid(), position: 0.5, color: "#818cf8", opacity: 1 }, { id: uid(), position: 1, color: "#c084fc", opacity: 1 }] } },
  { name: "Fire", config: { kind: "radial", angle: 0, stops: [{ id: uid(), position: 0, color: "#fbbf24", opacity: 1 }, { id: uid(), position: 0.5, color: "#f97316", opacity: 1 }, { id: uid(), position: 1, color: "#7f1d1d", opacity: 1 }] } },
  { name: "Neon", config: { kind: "linear", angle: 90, stops: [{ id: uid(), position: 0, color: "#f0abfc", opacity: 1 }, { id: uid(), position: 0.5, color: "#818cf8", opacity: 1 }, { id: uid(), position: 1, color: "#22d3ee", opacity: 1 }] } },
  { name: "Gold", config: { kind: "linear", angle: 135, stops: [{ id: uid(), position: 0, color: "#92400e", opacity: 1 }, { id: uid(), position: 0.5, color: "#fbbf24", opacity: 1 }, { id: uid(), position: 1, color: "#92400e", opacity: 1 }] } },
  { name: "Monochrome", config: { kind: "linear", angle: 90, stops: [{ id: uid(), position: 0, color: "#ffffff", opacity: 1 }, { id: uid(), position: 1, color: "#000000", opacity: 1 }] } },
  { name: "Pastel", config: { kind: "linear", angle: 135, stops: [{ id: uid(), position: 0, color: "#fda4af", opacity: 1 }, { id: uid(), position: 0.5, color: "#a5f3fc", opacity: 1 }, { id: uid(), position: 1, color: "#a7f3d0", opacity: 1 }] } },
  { name: "Midnight", config: { kind: "radial", angle: 0, stops: [{ id: uid(), position: 0, color: "#1e1b4b", opacity: 1 }, { id: uid(), position: 0.5, color: "#3730a3", opacity: 1 }, { id: uid(), position: 1, color: "#0f172a", opacity: 1 }] } },
  { name: "Tropical", config: { kind: "linear", angle: 45, stops: [{ id: uid(), position: 0, color: "#06b6d4", opacity: 1 }, { id: uid(), position: 0.5, color: "#10b981", opacity: 1 }, { id: uid(), position: 1, color: "#84cc16", opacity: 1 }] } },
  { name: "Berry", config: { kind: "linear", angle: 135, stops: [{ id: uid(), position: 0, color: "#7c3aed", opacity: 1 }, { id: uid(), position: 0.5, color: "#db2777", opacity: 1 }, { id: uid(), position: 1, color: "#7c3aed", opacity: 1 }] } },
  { name: "Rainbow", config: { kind: "linear", angle: 90, stops: [{ id: uid(), position: 0, color: "#ef4444", opacity: 1 }, { id: uid(), position: 0.17, color: "#f97316", opacity: 1 }, { id: uid(), position: 0.33, color: "#eab308", opacity: 1 }, { id: uid(), position: 0.5, color: "#22c55e", opacity: 1 }, { id: uid(), position: 0.67, color: "#3b82f6", opacity: 1 }, { id: uid(), position: 0.83, color: "#8b5cf6", opacity: 1 }, { id: uid(), position: 1, color: "#ec4899", opacity: 1 }] } },
];

function buildCssGradient(cfg: GradientConfig, forPreview = true): string {
  const stops = [...cfg.stops].sort((a, b) => a.position - b.position);
  const stopStr = stops.map((s) => {
    const hex = s.color;
    const a = Math.round(s.opacity * 255).toString(16).padStart(2, "0");
    return `${hex}${a} ${(s.position * 100).toFixed(1)}%`;
  }).join(", ");

  if (cfg.kind === "radial") {
    const cx = (cfg.cx ?? 0.5) * 100;
    const cy = (cfg.cy ?? 0.5) * 100;
    return `radial-gradient(circle at ${cx}% ${cy}%, ${stopStr})`;
  } else if (cfg.kind === "conic") {
    const cx = (cfg.cx ?? 0.5) * 100;
    const cy = (cfg.cy ?? 0.5) * 100;
    return `conic-gradient(from ${cfg.angle}deg at ${cx}% ${cy}%, ${stopStr})`;
  }
  return `linear-gradient(${cfg.angle}deg, ${stopStr})`;
}

interface GradientEditorModalProps {
  initial?: GradientConfig;
  onApply: (cfg: GradientConfig) => void;
  onClose: () => void;
}

export default function GradientEditorModal({ initial, onApply, onClose }: GradientEditorModalProps) {
  const [cfg, setCfg] = useState<GradientConfig>(initial ?? DEFAULT_GRADIENT);
  const [selectedStop, setSelectedStop] = useState<string>(cfg.stops[0]?.id ?? "");
  const barRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const update = (patch: Partial<GradientConfig>) => setCfg((prev) => ({ ...prev, ...patch }));

  const updateStop = (id: string, patch: Partial<GradientStop>) => {
    setCfg((prev) => ({
      ...prev,
      stops: prev.stops.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  const addStop = () => {
    const sorted = [...cfg.stops].sort((a, b) => a.position - b.position);
    let pos = 0.5;
    if (sorted.length >= 2) {
      const mid = Math.floor(sorted.length / 2);
      pos = (sorted[mid - 1].position + sorted[mid].position) / 2;
    }
    const newStop: GradientStop = { id: uid(), position: pos, color: "#ffffff", opacity: 1 };
    setCfg((prev) => ({ ...prev, stops: [...prev.stops, newStop] }));
    setSelectedStop(newStop.id);
  };

  const removeStop = (id: string) => {
    if (cfg.stops.length <= 2) return;
    const next = cfg.stops.find((s) => s.id !== id);
    setCfg((prev) => ({ ...prev, stops: prev.stops.filter((s) => s.id !== id) }));
    if (next) setSelectedStop(next.id);
  };

  const onBarMouseDown = useCallback((e: React.MouseEvent) => {
    if (!barRef.current) return;
    isDragging.current = true;
    const rect = barRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newStop: GradientStop = { id: uid(), position: pos, color: "#ffffff", opacity: 1 };
    setCfg((prev) => ({ ...prev, stops: [...prev.stops, newStop] }));
    setSelectedStop(newStop.id);
  }, []);

  const onStopDrag = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const onMove = (me: MouseEvent) => {
      const pos = Math.max(0, Math.min(1, (me.clientX - rect.left) / rect.width));
      updateStop(id, { position: pos });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  const sel = cfg.stops.find((s) => s.id === selectedStop);
  const cssGradient = buildCssGradient(cfg);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-xl shadow-2xl w-[520px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-sm">Gradient Editor</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div
            className="w-full h-20 rounded-lg border border-border cursor-crosshair"
            style={{ background: cssGradient }}
          />

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Presets</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  title={p.name}
                  className="w-7 h-7 rounded border border-border hover:scale-110 transition-transform"
                  style={{ background: buildCssGradient({ ...DEFAULT_GRADIENT, ...p.config, stops: (p.config.stops ?? DEFAULT_GRADIENT.stops) }) }}
                  onClick={() => {
                    const newCfg = { ...cfg, ...p.config, stops: (p.config.stops ?? cfg.stops) };
                    setCfg(newCfg);
                    setSelectedStop(newCfg.stops[0]?.id ?? "");
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={cfg.kind} onValueChange={(v) => update({ kind: v as GradientConfig["kind"] })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="radial">Radial</SelectItem>
                  <SelectItem value="conic">Conic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(cfg.kind === "linear" || cfg.kind === "conic") && (
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Angle: {cfg.angle}°</Label>
                <Slider value={[cfg.angle]} min={0} max={360} step={1} onValueChange={([v]) => update({ angle: v })} />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Color Stops</Label>
            <div
              ref={barRef}
              className="relative h-10 rounded-lg border border-border cursor-crosshair overflow-visible"
              style={{ background: cssGradient }}
              onMouseDown={onBarMouseDown}
            >
              {cfg.stops.map((stop) => (
                <div
                  key={stop.id}
                  className="absolute -bottom-1 transform -translate-x-1/2 cursor-grab"
                  style={{ left: `${stop.position * 100}%` }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setSelectedStop(stop.id);
                    onStopDrag(stop.id, e);
                  }}
                >
                  <div
                    className={`w-4 h-5 border-2 rounded-sm shadow ${selectedStop === stop.id ? "border-primary scale-125" : "border-white"}`}
                    style={{ background: stop.color, opacity: stop.opacity }}
                  />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">Click bar to add stop · Drag stop to move</p>
          </div>

          {sel && (
            <div className="space-y-3 p-3 bg-muted/20 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Selected Stop</Label>
                <button onClick={() => removeStop(sel.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-3 items-center">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Color</Label>
                  <input
                    type="color"
                    value={sel.color}
                    onChange={(e) => updateStop(sel.id, { color: e.target.value })}
                    className="w-10 h-8 rounded border border-border cursor-pointer p-0"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Position: {(sel.position * 100).toFixed(0)}%</Label>
                  <Slider value={[sel.position]} min={0} max={1} step={0.01} onValueChange={([v]) => updateStop(sel.id, { position: v })} />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Opacity: {(sel.opacity * 100).toFixed(0)}%</Label>
                  <Slider value={[sel.opacity]} min={0} max={1} step={0.01} onValueChange={([v]) => updateStop(sel.id, { opacity: v })} />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={addStop}>
              <Plus className="w-3.5 h-3.5" /> Add Stop
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
              const copy: GradientConfig = {
                ...cfg,
                stops: cfg.stops.map((s) => ({ ...s, id: uid() })),
              };
              setCfg(copy);
            }}>
              <Copy className="w-3.5 h-3.5" /> Reverse
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">CSS Output</Label>
            <div className="text-[10px] font-mono text-muted-foreground bg-muted/20 rounded p-2 break-all select-all">
              {cssGradient}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => { onApply(cfg); onClose(); }}>Apply Gradient</Button>
        </div>
      </div>
    </div>
  );
}

export { buildCssGradient, DEFAULT_GRADIENT };
