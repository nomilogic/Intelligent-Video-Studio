/**
 * ColorGradientPicker
 * -------------------
 * Picker for a `Fill` value (solid | linear | radial gradient). Used
 * primarily by shape clips, but written generically so any other field that
 * accepts a `Fill` can reuse it.
 *
 * The component is fully controlled — caller passes in `value` and
 * `onChange`. We never mutate `value`; every change builds a fresh object so
 * React re-renders cleanly. When the user toggles between solid/linear/
 * radial we preserve the existing color stops so flipping back and forth
 * doesn't lose work.
 */

import { useId } from "react";
import type { Fill } from "../lib/types";
import { Label } from "@/components/ui/label";

interface Props {
  value: Fill | undefined;
  onChange: (next: Fill) => void;
  /** Used as a fallback solid color when `value` is undefined. */
  defaultColor?: string;
}

/** Default 2-stop gradient stops used when promoting a solid → gradient. */
const DEFAULT_STOPS: [number, string][] = [
  [0, "#ec4899"],
  [1, "#3b82f6"],
];

export default function ColorGradientPicker({ value, onChange, defaultColor = "#3b82f6" }: Props) {
  const idPrefix = useId();
  const kind = value?.kind ?? "solid";
  const solidColor = value?.kind === "solid" ? value.color : defaultColor;
  const gradientStops = value && value.kind !== "solid" ? value.stops : DEFAULT_STOPS;
  const angle = value?.kind === "linear" ? value.angle : 90;
  const radial = value?.kind === "radial"
    ? { cx: value.cx, cy: value.cy, r: value.r }
    : { cx: 0.5, cy: 0.5, r: 0.7 };

  const setKind = (newKind: Fill["kind"]) => {
    if (newKind === kind) return;
    if (newKind === "solid") {
      onChange({ kind: "solid", color: gradientStops[0]?.[1] ?? solidColor });
    } else if (newKind === "linear") {
      onChange({ kind: "linear", angle, stops: gradientStops });
    } else {
      onChange({ kind: "radial", cx: radial.cx, cy: radial.cy, r: radial.r, stops: gradientStops });
    }
  };

  const setStop = (idx: number, patch: Partial<{ offset: number; color: string }>) => {
    if (!value || value.kind === "solid") return;
    const next: [number, string][] = value.stops.map((s, i) =>
      i === idx
        ? [patch.offset ?? s[0], patch.color ?? s[1]]
        : s,
    );
    onChange({ ...value, stops: next });
  };

  const addStop = () => {
    if (!value || value.kind === "solid") return;
    // Insert at midpoint between last two stops, default white.
    const last = value.stops[value.stops.length - 1];
    const prev = value.stops[value.stops.length - 2];
    const off = prev ? (last[0] + prev[0]) / 2 : 0.5;
    const next: [number, string][] = [...value.stops, [off, "#ffffff"]];
    next.sort((a, b) => a[0] - b[0]);
    onChange({ ...value, stops: next });
  };

  const removeStop = (idx: number) => {
    if (!value || value.kind === "solid" || value.stops.length <= 2) return;
    const next = value.stops.filter((_, i) => i !== idx);
    onChange({ ...value, stops: next });
  };

  // Build a CSS background string that previews the current fill on the swatch.
  const previewCss = (() => {
    if (kind === "solid") return solidColor;
    const stopsCss = gradientStops
      .map(([o, c]) => `${c} ${(o * 100).toFixed(0)}%`)
      .join(", ");
    if (kind === "linear") return `linear-gradient(${angle}deg, ${stopsCss})`;
    return `radial-gradient(circle at ${(radial.cx * 100).toFixed(0)}% ${(radial.cy * 100).toFixed(0)}%, ${stopsCss})`;
  })();

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {(["solid", "linear", "radial"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`flex-1 text-[10px] py-1 rounded border transition-colors ${
              kind === k
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted/40"
            }`}
          >
            {k === "solid" ? "Solid" : k === "linear" ? "Linear" : "Radial"}
          </button>
        ))}
      </div>

      <div
        className="w-full h-8 rounded border border-border"
        style={{ background: previewCss }}
        title={previewCss}
      />

      {kind === "solid" && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={solidColor}
            onChange={(e) => onChange({ kind: "solid", color: e.target.value })}
            className="h-8 w-12 rounded cursor-pointer border border-border"
          />
          <input
            type="text"
            value={solidColor}
            onChange={(e) => onChange({ kind: "solid", color: e.target.value })}
            className="flex-1 h-8 px-2 text-xs font-mono bg-background border border-border rounded outline-none focus:border-primary"
          />
        </div>
      )}

      {kind === "linear" && (
        <div>
          <Label className="text-[10px] text-muted-foreground">Angle: {angle}°</Label>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={angle}
            onChange={(e) => value?.kind === "linear" && onChange({ ...value, angle: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      )}

      {kind === "radial" && (
        <div className="grid grid-cols-3 gap-1">
          {(["cx", "cy", "r"] as const).map((k) => (
            <div key={k}>
              <Label className="text-[10px] text-muted-foreground">{k.toUpperCase()}</Label>
              <input
                type="number"
                min={0}
                max={k === "r" ? 1.5 : 1}
                step={0.05}
                value={radial[k]}
                onChange={(e) =>
                  value?.kind === "radial" &&
                  onChange({ ...value, [k]: Number(e.target.value) })
                }
                className="w-full h-7 px-1 text-xs bg-background border border-border rounded"
              />
            </div>
          ))}
        </div>
      )}

      {kind !== "solid" && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground">Color Stops</Label>
            <button
              type="button"
              onClick={addStop}
              className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-muted/40"
            >
              + Add
            </button>
          </div>
          {gradientStops.map(([offset, color], idx) => (
            <div key={`${idPrefix}-${idx}`} className="flex items-center gap-1">
              <input
                type="color"
                value={color}
                onChange={(e) => setStop(idx, { color: e.target.value })}
                className="h-6 w-8 rounded cursor-pointer border border-border"
              />
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={offset}
                onChange={(e) => setStop(idx, { offset: Number(e.target.value) })}
                className="flex-1 h-6 px-1 text-xs bg-background border border-border rounded"
              />
              <button
                type="button"
                onClick={() => removeStop(idx)}
                disabled={gradientStops.length <= 2}
                className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:bg-destructive/20 hover:text-destructive disabled:opacity-30"
                title={gradientStops.length <= 2 ? "Need at least 2 stops" : "Remove stop"}
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
