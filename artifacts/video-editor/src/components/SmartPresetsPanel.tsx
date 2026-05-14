import { useState } from "react";
import { Sparkles, Zap, Check } from "lucide-react";
import { SMART_PRESETS, SMART_PRESET_CATEGORIES, type SmartPreset } from "@/lib/smart-presets";
import { Button } from "@/components/ui/button";
import type { EditorState, EditorAction } from "@/lib/types";

interface SmartPresetsPanelProps {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

export function SmartPresetsPanel({ state, dispatch }: SmartPresetsPanelProps) {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [lastApplied, setLastApplied] = useState<string | null>(null);

  const selectedClip = state.clips.find((c) => state.selectedClipIds[0] === c.id);

  const filtered = activeCategory === "All"
    ? SMART_PRESETS
    : SMART_PRESETS.filter((p) => p.category === activeCategory);

  const applyPreset = (preset: SmartPreset) => {
    dispatch({
      type: "APPLY_SMART_PRESET",
      payload: {
        clipId: selectedClip?.id,
        adjustments: preset.adjustments,
      },
    });
    setLastApplied(preset.id);
    setTimeout(() => setLastApplied(null), 1500);
  };

  const categories = ["All", ...SMART_PRESET_CATEGORIES];

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Smart Presets</p>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {selectedClip
              ? `Applying to: ${selectedClip.label}`
              : "No clip selected — adds adjustment layer"}
          </p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${activeCategory === cat ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:bg-muted/30"}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Preset grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {filtered.map((preset) => {
          const isApplied = lastApplied === preset.id;
          return (
            <button
              key={preset.id}
              className={`group relative flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-lg border text-left transition-all ${isApplied ? "border-primary bg-primary/10" : "border-border hover:border-primary/40 hover:bg-muted/20"}`}
              onClick={() => applyPreset(preset)}
              title={preset.description}
            >
              {isApplied && (
                <div className="absolute top-1 right-1">
                  <Check className="w-3 h-3 text-primary" />
                </div>
              )}
              <span className="text-base leading-none">{preset.emoji}</span>
              <span className="text-[11px] font-medium text-foreground leading-tight">{preset.label}</span>
              <span className="text-[9px] text-muted-foreground leading-tight line-clamp-2">{preset.description}</span>
            </button>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="border-t border-border/50 pt-2 space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Quick Actions</p>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-[10px] h-7 gap-1"
            onClick={() => {
              dispatch({ type: "APPLY_SMART_PRESET", payload: { clipId: selectedClip?.id, adjustments: { brightness: 100, contrast: 100, saturation: 100, hue: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0, sharpness: 0, exposure: 0, vignette: 0, grain: 0, fade: 0, clarity: 0 } } });
            }}
          >
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-[10px] h-7 gap-1"
            onClick={() => {
              dispatch({
                type: "ADD_CLIP",
                payload: {
                  id: `adj-${Date.now()}`,
                  label: "Adjustment Layer",
                  mediaType: "adjustment",
                  trackIndex: 0,
                  startTime: state.currentTime,
                  duration: Math.max(1, state.duration - state.currentTime),
                  x: state.canvasWidth / 2,
                  y: state.canvasHeight / 2,
                  width: state.canvasWidth,
                  height: state.canvasHeight,
                  opacity: 1, rotation: 0, scale: 1, flipH: false, flipV: false,
                  blendMode: "normal", borderRadius: 0, preserveRatio: false,
                  cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1,
                  filters: { brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, grayscale: 0, sepia: 0, invert: 0 },
                  speed: 1, animationIn: "none", animationOut: "none", animationInDuration: 0.5, animationOutDuration: 0.5,
                  volume: 1, muted: false, locked: false, hidden: false, color: "#000000",
                  trimStart: 0, trimEnd: 0,
                  adjustments: {},
                },
              });
            }}
          >
            <Zap className="w-3 h-3" />
            New Adj. Layer
          </Button>
        </div>
      </div>
    </div>
  );
}
