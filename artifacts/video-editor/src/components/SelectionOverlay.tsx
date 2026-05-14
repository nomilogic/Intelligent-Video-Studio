import { useRef, useState, useCallback } from "react";
import type { Clip } from "@/lib/types";

interface Rect { x: number; y: number; w: number; h: number; }
interface Point { x: number; y: number; }

interface SelectionOverlayProps {
  tool: "rect-select" | "lasso" | "magic-wand";
  clips: Clip[];
  currentTime: number;
  canvasW: number;
  canvasH: number;
  /** Called with IDs of clips whose canvas bounds overlap the selection. */
  onSelect: (clipIds: string[]) => void;
  /** CSS scale factor of the canvas container. */
  scale?: number;
}

/** Return clips active at this time whose canvas rect overlaps the given region. */
function clipsInRegion(clips: Clip[], time: number, region: Rect): string[] {
  return clips
    .filter((c) => {
      if (c.hidden) return false;
      if (time < c.startTime || time > c.startTime + c.duration) return false;
      // Approximate canvas bounds (not accounting for rotation/transform)
      const cx = c.x - c.width / 2;
      const cy = c.y - c.height / 2;
      const cw = c.width;
      const ch = c.height;
      return cx < region.x + region.w && cx + cw > region.x &&
             cy < region.y + region.h && cy + ch > region.y;
    })
    .map((c) => c.id);
}

/** Return clips of the same mediaType as the clicked clip. */
function clipsOfSameType(clips: Clip[], time: number, point: Point): string[] {
  const hit = clips.find((c) => {
    if (c.hidden) return false;
    if (time < c.startTime || time > c.startTime + c.duration) return false;
    const cx = c.x - c.width / 2;
    const cy = c.y - c.height / 2;
    return point.x >= cx && point.x <= cx + c.width && point.y >= cy && point.y <= cy + c.height;
  });
  if (!hit) return [];
  return clips.filter((c) => c.mediaType === hit.mediaType && !c.hidden).map((c) => c.id);
}

/** Check if a point is inside a polygon using ray-casting. */
function pointInPolygon(pt: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if (((yi > pt.y) !== (yj > pt.y)) && (pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

/** Return clips whose center is inside the lasso polygon. */
function clipsInLasso(clips: Clip[], time: number, poly: Point[]): string[] {
  if (poly.length < 3) return [];
  return clips.filter((c) => {
    if (c.hidden) return false;
    if (time < c.startTime || time > c.startTime + c.duration) return false;
    return pointInPolygon({ x: c.x, y: c.y }, poly);
  }).map((c) => c.id);
}

export function SelectionOverlay({ tool, clips, currentTime, canvasW, canvasH, onSelect, scale = 1 }: SelectionOverlayProps) {
  const overlayRef = useRef<SVGSVGElement>(null);
  const [rectDrag, setRectDrag] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [lassoPoints, setLassoPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const toCanvas = (e: React.MouseEvent): Point => {
    const rect = overlayRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const pt = toCanvas(e);
    if (tool === "rect-select") {
      setRectDrag({ startX: pt.x, startY: pt.y, endX: pt.x, endY: pt.y });
    } else if (tool === "lasso") {
      setLassoPoints([pt]);
      setIsDrawing(true);
    } else if (tool === "magic-wand") {
      const ids = clipsOfSameType(clips, currentTime, pt);
      onSelect(ids);
    }
  }, [tool, clips, currentTime, onSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pt = toCanvas(e);
    if (tool === "rect-select" && rectDrag) {
      setRectDrag((d) => d ? { ...d, endX: pt.x, endY: pt.y } : null);
    } else if (tool === "lasso" && isDrawing) {
      setLassoPoints((pts) => [...pts, pt]);
    }
  }, [tool, rectDrag, isDrawing]);

  const handleMouseUp = useCallback(() => {
    if (tool === "rect-select" && rectDrag) {
      const rx = Math.min(rectDrag.startX, rectDrag.endX);
      const ry = Math.min(rectDrag.startY, rectDrag.endY);
      const rw = Math.abs(rectDrag.endX - rectDrag.startX);
      const rh = Math.abs(rectDrag.endY - rectDrag.startY);
      if (rw > 4 || rh > 4) {
        onSelect(clipsInRegion(clips, currentTime, { x: rx, y: ry, w: rw, h: rh }));
      }
      setRectDrag(null);
    } else if (tool === "lasso" && isDrawing) {
      onSelect(clipsInLasso(clips, currentTime, lassoPoints));
      setLassoPoints([]);
      setIsDrawing(false);
    }
  }, [tool, rectDrag, isDrawing, lassoPoints, clips, currentTime, onSelect]);

  // Compute displayed rect
  let rx = 0, ry = 0, rw = 0, rh = 0;
  if (rectDrag) {
    rx = Math.min(rectDrag.startX, rectDrag.endX);
    ry = Math.min(rectDrag.startY, rectDrag.endY);
    rw = Math.abs(rectDrag.endX - rectDrag.startX);
    rh = Math.abs(rectDrag.endY - rectDrag.startY);
  }

  const lassoDString = lassoPoints.length > 1
    ? `M ${lassoPoints[0].x} ${lassoPoints[0].y} ` + lassoPoints.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ") + " Z"
    : "";

  const cursor = tool === "rect-select" ? "crosshair" : tool === "lasso" ? "crosshair" : "cell";

  return (
    <svg
      ref={overlayRef}
      className="absolute inset-0"
      style={{ zIndex: 50, cursor }}
      width={canvasW}
      height={canvasH}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Rect selection */}
      {rectDrag && rw > 2 && rh > 2 && (
        <rect x={rx} y={ry} width={rw} height={rh}
          fill="rgba(99,179,237,0.15)" stroke="#63b3ed" strokeWidth={1.5} strokeDasharray="5 3" />
      )}

      {/* Lasso selection */}
      {lassoPoints.length > 1 && (
        <path d={lassoDString}
          fill="rgba(99,179,237,0.15)" stroke="#63b3ed" strokeWidth={1.5} strokeDasharray="5 3" />
      )}

      {/* Magic wand cursor indicator */}
      {tool === "magic-wand" && (
        <text x={12} y={24} fontSize={18} fill="rgba(255,255,255,0.6)">✦</text>
      )}
    </svg>
  );
}
