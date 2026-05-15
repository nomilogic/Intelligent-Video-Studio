import React, { useRef, useState, useCallback } from "react";
import type { GridSettings, Guide } from "@/lib/types";

interface GridOverlayProps {
  canvasW: number;
  canvasH: number;
  settings: GridSettings;
  guides: Guide[];
  /** Called when the user drags out a new guide from the ruler area. */
  onAddGuide?: (guide: Omit<Guide, "id">) => void;
  onUpdateGuide?: (id: string, position: number) => void;
  onRemoveGuide?: (id: string) => void;
  /** CSS scale of the canvas container (to map mouse coords). */
  scale?: number;
}

export function GridOverlay({
  canvasW, canvasH, settings, guides,
  onAddGuide, onUpdateGuide, onRemoveGuide,
  scale = 1,
}: GridOverlayProps) {
  const [dragGuide, setDragGuide] = useState<{ id: string; orientation: "h" | "v" } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const toCanvasX = (clientX: number) => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    return (clientX - rect.left) / scale;
  };
  const toCanvasY = (clientY: number) => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    return (clientY - rect.top) / scale;
  };

  const handleSvgMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragGuide || !onUpdateGuide) return;
    const pos = dragGuide.orientation === "v"
      ? Math.max(0, Math.min(1, toCanvasX(e.clientX) / canvasW))
      : Math.max(0, Math.min(1, toCanvasY(e.clientY) / canvasH));
    onUpdateGuide(dragGuide.id, pos);
  }, [dragGuide, canvasW, canvasH, onUpdateGuide]);

  const handleSvgMouseUp = useCallback(() => {
    setDragGuide(null);
  }, []);

  if (!settings.show && guides.length === 0) return null;

  // Build grid lines
  const gridLines: React.ReactElement[] = [];
  if (settings.show) {
    const cols = Math.ceil(canvasW / settings.size);
    const rows = Math.ceil(canvasH / settings.size);

    for (let i = 0; i <= cols; i++) {
      const x = i * settings.size;
      gridLines.push(
        <line key={`v${i}`} x1={x} y1={0} x2={x} y2={canvasH}
          stroke={settings.color} strokeOpacity={settings.opacity} strokeWidth={1} />,
      );
    }
    for (let i = 0; i <= rows; i++) {
      const y = i * settings.size;
      gridLines.push(
        <line key={`h${i}`} x1={0} y1={y} x2={canvasW} y2={y}
          stroke={settings.color} strokeOpacity={settings.opacity} strokeWidth={1} />,
      );
    }

    // Sub-division lines
    if (settings.subdivisions > 1) {
      const sub = settings.size / settings.subdivisions;
      const subCols = Math.ceil(canvasW / sub);
      const subRows = Math.ceil(canvasH / sub);
      for (let i = 1; i < subCols; i++) {
        if (i % settings.subdivisions === 0) continue;
        const x = i * sub;
        gridLines.push(
          <line key={`sv${i}`} x1={x} y1={0} x2={x} y2={canvasH}
            stroke={settings.color} strokeOpacity={settings.opacity * 0.35} strokeWidth={0.5} />,
        );
      }
      for (let i = 1; i < subRows; i++) {
        if (i % settings.subdivisions === 0) continue;
        const y = i * sub;
        gridLines.push(
          <line key={`sh${i}`} x1={0} y1={y} x2={canvasW} y2={y}
            stroke={settings.color} strokeOpacity={settings.opacity * 0.35} strokeWidth={0.5} />,
        );
      }
    }
  }

  // Guide lines
  const guideEls = guides.map((g) => {
    const isV = g.orientation === "v";
    const pos = isV ? g.position * canvasW : g.position * canvasH;
    return (
      <g key={g.id}>
        {isV
          ? <line x1={pos} y1={0} x2={pos} y2={canvasH}
              stroke={g.color} strokeWidth={1.5} strokeDasharray="6 4"
              onMouseDown={(e) => { e.stopPropagation(); if (!g.locked) setDragGuide({ id: g.id, orientation: "v" }); }}
              style={{ cursor: g.locked ? "default" : "ew-resize" }}
            />
          : <line x1={0} y1={pos} x2={canvasW} y2={pos}
              stroke={g.color} strokeWidth={1.5} strokeDasharray="6 4"
              onMouseDown={(e) => { e.stopPropagation(); if (!g.locked) setDragGuide({ id: g.id, orientation: "h" }); }}
              style={{ cursor: g.locked ? "default" : "ns-resize" }}
            />}
        {/* Delete handle on double-click */}
        {isV
          ? <rect x={pos - 4} y={2} width={8} height={12} fill={g.color} opacity={0.8} rx={2}
              onDoubleClick={() => onRemoveGuide?.(g.id)} style={{ cursor: "pointer" }} />
          : <rect x={2} y={pos - 4} width={12} height={8} fill={g.color} opacity={0.8} rx={2}
              onDoubleClick={() => onRemoveGuide?.(g.id)} style={{ cursor: "pointer" }} />}
      </g>
    );
  });

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 46, pointerEvents: dragGuide ? "all" : "none" }}
      width={canvasW}
      height={canvasH}
      onMouseMove={handleSvgMouseMove}
      onMouseUp={handleSvgMouseUp}
    >
      {gridLines}
      <g style={{ pointerEvents: "all" }}>
        {guideEls}
      </g>
    </svg>
  );
}

/** Panel for configuring grid settings — shown in the Toolbar grid popover. */
interface GridConfigPanelProps {
  settings: GridSettings;
  onChange: (patch: Partial<GridSettings>) => void;
  onAddGuide: (orientation: "h" | "v") => void;
  guides: Guide[];
  onClearGuides: () => void;
}

export function GridConfigPanel({ settings, onChange, onAddGuide, guides, onClearGuides }: GridConfigPanelProps) {
  const row = (label: string, children: React.ReactNode) => (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-muted-foreground shrink-0">{label}</span>
      {children}
    </div>
  );

  return (
    <div className="p-3 w-52 space-y-2.5 text-sm">
      {/* Toggles */}
      {row("Show Grid", (
        <button
          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${settings.show ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          onClick={() => onChange({ show: !settings.show })}
        >
          {settings.show ? "On" : "Off"}
        </button>
      ))}
      {row("Snap to Grid", (
        <button
          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${settings.snap ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          onClick={() => onChange({ snap: !settings.snap })}
        >
          {settings.snap ? "On" : "Off"}
        </button>
      ))}
      {row("Rulers", (
        <button
          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${settings.showRulers ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          onClick={() => onChange({ showRulers: !settings.showRulers })}
        >
          {settings.showRulers ? "On" : "Off"}
        </button>
      ))}

      {/* Size */}
      {row("Cell Size", (
        <div className="flex items-center gap-1">
          <input
            type="range" min={20} max={400} step={10} value={settings.size}
            onChange={(e) => onChange({ size: Number(e.target.value) })}
            className="w-20"
          />
          <span className="text-[10px] text-muted-foreground w-8 text-right">{settings.size}px</span>
        </div>
      ))}

      {/* Subdivisions */}
      {row("Sub-divisions", (
        <div className="flex gap-1">
          {[1, 2, 4].map((v) => (
            <button
              key={v}
              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${settings.subdivisions === v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
              onClick={() => onChange({ subdivisions: v })}
            >
              {v}×
            </button>
          ))}
        </div>
      ))}

      {/* Opacity */}
      {row("Opacity", (
        <div className="flex items-center gap-1">
          <input
            type="range" min={0.05} max={1} step={0.05} value={settings.opacity}
            onChange={(e) => onChange({ opacity: Number(e.target.value) })}
            className="w-20"
          />
          <span className="text-[10px] text-muted-foreground w-8 text-right">{Math.round(settings.opacity * 100)}%</span>
        </div>
      ))}

      {/* Color */}
      {row("Color", (
        <input type="color" value={settings.color} onChange={(e) => onChange({ color: e.target.value })} className="w-8 h-6 rounded cursor-pointer border border-border" />
      ))}

      {/* Guides */}
      <div className="border-t border-border/50 pt-2 space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Guides ({guides.length})</p>
        <div className="flex gap-1.5">
          <button onClick={() => onAddGuide("h")} className="flex-1 text-[10px] py-1 rounded border border-border text-muted-foreground hover:bg-muted/40 transition-colors">+ Horizontal</button>
          <button onClick={() => onAddGuide("v")} className="flex-1 text-[10px] py-1 rounded border border-border text-muted-foreground hover:bg-muted/40 transition-colors">+ Vertical</button>
        </div>
        {guides.length > 0 && (
          <button onClick={onClearGuides} className="w-full text-[10px] py-1 rounded border border-destructive/30 text-destructive/80 hover:bg-destructive/10 transition-colors">
            Clear all guides
          </button>
        )}
      </div>
    </div>
  );
}
