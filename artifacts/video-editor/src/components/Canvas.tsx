import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { EditorState, EditorAction, Clip } from "../lib/types";
import { resolveClip, clipVisibleAt } from "../lib/animation";
import { cn } from "@/lib/utils";

interface CanvasProps {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

type DragMode =
  | { kind: "move"; clipId: string; startX: number; startY: number; origX: number; origY: number }
  | { kind: "resize"; clipId: string; handle: string; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number }
  | { kind: "rotate"; clipId: string; centerX: number; centerY: number; startAngle: number; origRotation: number };

function cropStyle(clip: Clip): React.CSSProperties {
  const cw = clip.cropWidth ?? 1;
  const ch = clip.cropHeight ?? 1;
  const cx = clip.cropX ?? 0;
  const cy = clip.cropY ?? 0;
  if (cw === 1 && ch === 1 && cx === 0 && cy === 0) return {};
  // Zoom into the cropped region so it fills the container.
  const sx = 1 / Math.max(0.01, cw);
  const sy = 1 / Math.max(0.01, ch);
  return {
    transformOrigin: "top left",
    transform: `translate(${-cx * 100 * sx}%, ${-cy * 100 * sy}%) scale(${sx}, ${sy})`,
    width: "100%",
    height: "100%",
  };
}

function flipTransform(clip: Clip): string {
  return `scaleX(${clip.flipH ? -1 : 1}) scaleY(${clip.flipV ? -1 : 1})`;
}

function MediaContent({ clip, videoTime, isPlaying }: { clip: Clip; videoTime: number; isPlaying: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Sync video element to playhead. When playing, allow drift up to 0.25s before correcting.
  // When paused, snap exactly to videoTime so scrubbing is frame-accurate.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const target = Math.max(0, videoTime);
    const drift = Math.abs(v.currentTime - target);
    if (!isPlaying) {
      if (drift > 0.03) {
        try { v.currentTime = target; } catch {}
      }
    } else if (drift > 0.25) {
      try { v.currentTime = target; } catch {}
    }
  }, [videoTime, isPlaying]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = clip.speed || 1;
    v.volume = clip.muted ? 0 : clip.volume;
    v.muted = clip.muted;
    if (isPlaying) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [isPlaying, clip.muted, clip.volume, clip.speed]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const target = Math.max(0, videoTime);
    const drift = Math.abs(a.currentTime - target);
    if (!isPlaying) {
      if (drift > 0.05) {
        try { a.currentTime = target; } catch {}
      }
    } else if (drift > 0.3) {
      try { a.currentTime = target; } catch {}
    }
  }, [videoTime, isPlaying]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.playbackRate = clip.speed || 1;
    a.volume = clip.muted ? 0 : clip.volume;
    a.muted = clip.muted;
    if (isPlaying) {
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  }, [isPlaying, clip.muted, clip.volume, clip.speed]);

  const hasCrop =
    (clip.cropWidth ?? 1) !== 1 ||
    (clip.cropHeight ?? 1) !== 1 ||
    (clip.cropX ?? 0) !== 0 ||
    (clip.cropY ?? 0) !== 0;

  if (clip.mediaType === "video" && clip.src) {
    return (
      <div className="w-full h-full overflow-hidden pointer-events-none" style={{ transform: flipTransform(clip) }}>
        <video
          ref={videoRef}
          src={clip.src}
          muted={clip.muted}
          playsInline
          preload="auto"
          className="block object-cover"
          style={hasCrop ? cropStyle(clip) : { width: "100%", height: "100%" }}
        />
      </div>
    );
  }

  if (clip.mediaType === "audio" && clip.src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-emerald-500/30">
        <audio ref={audioRef} src={clip.src} preload="auto" />
        <div className="text-white/80 text-xs flex flex-col items-center gap-1">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
          <span>{clip.label}</span>
        </div>
      </div>
    );
  }

  if (clip.mediaType === "image" && clip.src) {
    return (
      <div className="w-full h-full overflow-hidden pointer-events-none" style={{ transform: flipTransform(clip) }}>
        <img
          src={clip.src}
          alt={clip.label}
          className="block object-cover"
          style={hasCrop ? cropStyle(clip) : { width: "100%", height: "100%" }}
        />
      </div>
    );
  }

  if (clip.mediaType === "text") {
    const ts = clip.textStyle!;
    return (
      <div
        className="w-full h-full flex pointer-events-none px-2 py-1"
        style={{
          background: ts.background === "transparent" ? "transparent" : ts.background,
          alignItems: "center",
          justifyContent:
            ts.align === "left" ? "flex-start" : ts.align === "right" ? "flex-end" : "center",
        }}
      >
        <span
          style={{
            fontFamily: ts.fontFamily,
            fontSize: `${ts.fontSize / 10}cqw`,
            fontWeight: ts.fontWeight,
            color: ts.color,
            textAlign: ts.align,
            fontStyle: ts.italic ? "italic" : "normal",
            textDecoration: ts.underline ? "underline" : "none",
            textShadow: ts.shadow ? "0 2px 12px rgba(0,0,0,0.6), 0 0 4px rgba(0,0,0,0.4)" : "none",
            lineHeight: 1.1,
            wordBreak: "break-word",
          }}
        >
          {clip.text}
        </span>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${clip.color}cc, ${clip.color}55)` }}
    >
      <span
        className="text-white font-semibold drop-shadow-lg truncate px-2"
        style={{ fontSize: "min(2cqw, 14px)" }}
      >
        {clip.label}
      </span>
    </div>
  );
}

export default function Canvas({ state, dispatch }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragMode | null>(null);
  const [snapGuides, setSnapGuides] = useState<{ x?: number; y?: number }>({});

  const visibleClips = useMemo(
    () =>
      state.clips
        .filter((c) => clipVisibleAt(c, state.currentTime) && !c.hidden)
        .sort((a, b) => a.trackIndex - b.trackIndex),
    [state.clips, state.currentTime],
  );

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      dispatch({ type: "SELECT_CLIP", payload: null });
    }
  };

  const startDrag = useCallback(
    (e: React.MouseEvent, clip: Clip, mode: "move" | string) => {
      e.stopPropagation();
      e.preventDefault();
      if (clip.locked) return;
      if (!state.selectedClipIds.includes(clip.id)) {
        dispatch({ type: "SELECT_CLIP", payload: clip.id });
      }
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (mode === "move") {
        setDrag({
          kind: "move",
          clipId: clip.id,
          startX: e.clientX,
          startY: e.clientY,
          origX: clip.x,
          origY: clip.y,
        });
      } else if (mode === "rotate") {
        const cx = rect.left + (clip.x + clip.width / 2) * rect.width;
        const cy = rect.top + (clip.y + clip.height / 2) * rect.height;
        const startAngle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
        setDrag({
          kind: "rotate",
          clipId: clip.id,
          centerX: cx,
          centerY: cy,
          startAngle,
          origRotation: clip.rotation,
        });
      } else {
        setDrag({
          kind: "resize",
          clipId: clip.id,
          handle: mode,
          startX: e.clientX,
          startY: e.clientY,
          origX: clip.x,
          origY: clip.y,
          origW: clip.width,
          origH: clip.height,
        });
      }
    },
    [dispatch, state.selectedClipIds],
  );

  useEffect(() => {
    if (!drag) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const onMove = (ev: MouseEvent) => {
      if (drag.kind === "move") {
        const dx = (ev.clientX - drag.startX) / rect.width;
        const dy = (ev.clientY - drag.startY) / rect.height;
        let nx = drag.origX + dx;
        let ny = drag.origY + dy;
        const clip = state.clips.find((c) => c.id === drag.clipId);
        if (!clip) return;

        const guides: { x?: number; y?: number } = {};
        if (state.snapEnabled) {
          const cw = clip.width;
          const ch = clip.height;
          const centerX = nx + cw / 2;
          const centerY = ny + ch / 2;
          const SNAP = 0.02;
          if (Math.abs(centerX - 0.5) < SNAP) { nx = 0.5 - cw / 2; guides.x = 0.5; }
          if (Math.abs(nx) < SNAP) { nx = 0; guides.x = 0; }
          if (Math.abs(nx + cw - 1) < SNAP) { nx = 1 - cw; guides.x = 1; }
          if (Math.abs(centerY - 0.5) < SNAP) { ny = 0.5 - ch / 2; guides.y = 0.5; }
          if (Math.abs(ny) < SNAP) { ny = 0; guides.y = 0; }
          if (Math.abs(ny + ch - 1) < SNAP) { ny = 1 - ch; guides.y = 1; }
        }
        setSnapGuides(guides);
        dispatch({
          type: "UPDATE_CLIP",
          payload: { id: drag.clipId, updates: { x: nx, y: ny } },
        });
      } else if (drag.kind === "resize") {
        const dx = (ev.clientX - drag.startX) / rect.width;
        const dy = (ev.clientY - drag.startY) / rect.height;
        let { origX: nx, origY: ny, origW: nw, origH: nh } = drag;
        if (drag.handle.includes("e")) nw = Math.max(0.02, drag.origW + dx);
        if (drag.handle.includes("w")) {
          nw = Math.max(0.02, drag.origW - dx);
          nx = drag.origX + (drag.origW - nw);
        }
        if (drag.handle.includes("s")) nh = Math.max(0.02, drag.origH + dy);
        if (drag.handle.includes("n")) {
          nh = Math.max(0.02, drag.origH - dy);
          ny = drag.origY + (drag.origH - nh);
        }
        if (ev.shiftKey) {
          const ratio = drag.origW / drag.origH;
          nh = nw / ratio;
        }
        dispatch({
          type: "UPDATE_CLIP",
          payload: { id: drag.clipId, updates: { x: nx, y: ny, width: nw, height: nh } },
        });
      } else if (drag.kind === "rotate") {
        const angle = (Math.atan2(ev.clientY - drag.centerY, ev.clientX - drag.centerX) * 180) / Math.PI;
        const delta = angle - drag.startAngle;
        let r = drag.origRotation + delta;
        if (ev.shiftKey) r = Math.round(r / 15) * 15;
        dispatch({ type: "UPDATE_CLIP", payload: { id: drag.clipId, updates: { rotation: r } } });
      }
    };
    const onUp = () => {
      setDrag(null);
      setSnapGuides({});
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, dispatch, state.snapEnabled, state.clips]);

  const selectedClip = state.clips.find((c) => state.selectedClipIds.includes(c.id));

  const handles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

  return (
    <div className="relative flex items-center justify-center w-full h-full overflow-hidden">
      <div
        ref={containerRef}
        data-testid="canvas-preview"
        className={cn(
          "relative overflow-hidden cursor-default select-none shadow-2xl",
          drag?.kind === "move" && "cursor-grabbing",
        )}
        style={{
          aspectRatio: `${state.canvasWidth} / ${state.canvasHeight}`,
          width: "min(100%, calc((100vh - 220px) * " + state.canvasWidth + " / " + state.canvasHeight + "))",
          maxWidth: "100%",
          maxHeight: "100%",
          background: state.background,
          containerType: "size",
        }}
        onMouseDown={onCanvasMouseDown}
      >
        {/* Subtle grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "10% 10%",
          }}
        />

        {visibleClips.map((clip) => {
          const isSelected = state.selectedClipIds.includes(clip.id);
          const r = resolveClip(clip, state.keyframes, state.currentTime);
          if (!r.visible) return null;
          return (
            <div
              key={clip.id}
              data-testid={`canvas-clip-${clip.id}`}
              className={cn(
                "absolute overflow-hidden",
                clip.locked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
                isSelected && "outline outline-2 outline-primary outline-offset-0",
              )}
              style={{
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                width: `${r.width * 100}%`,
                height: `${r.height * 100}%`,
                opacity: r.opacity,
                transform: `translate(${r.translateX}%, ${r.translateY}%) rotate(${r.rotation}deg) scale(${r.scale})`,
                mixBlendMode: clip.blendMode as any,
                filter: r.filterCss,
                borderRadius: `${clip.borderRadius}px`,
                transformOrigin: "center",
                containerType: "size",
              }}
              onMouseDown={(e) => startDrag(e, clip, "move")}
            >
              <MediaContent clip={clip} videoTime={r.videoTime} isPlaying={state.isPlaying} />
            </div>
          );
        })}

        {/* Selection overlay (drawn outside clip transform so handles aren't rotated) */}
        {selectedClip && (() => {
          const r = resolveClip(selectedClip, state.keyframes, state.currentTime);
          if (!r.visible) return null;
          return (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                width: `${r.width * 100}%`,
                height: `${r.height * 100}%`,
                transform: `translate(${r.translateX}%, ${r.translateY}%) rotate(${r.rotation}deg) scale(${r.scale})`,
                transformOrigin: "center",
              }}
            >
              <div className="absolute inset-0 ring-2 ring-primary ring-inset" />
              {/* Resize handles */}
              {handles.map((h) => {
                const styles: Record<string, React.CSSProperties> = {
                  nw: { top: -5, left: -5, cursor: "nwse-resize" },
                  n:  { top: -5, left: "calc(50% - 5px)", cursor: "ns-resize" },
                  ne: { top: -5, right: -5, cursor: "nesw-resize" },
                  e:  { top: "calc(50% - 5px)", right: -5, cursor: "ew-resize" },
                  se: { bottom: -5, right: -5, cursor: "nwse-resize" },
                  s:  { bottom: -5, left: "calc(50% - 5px)", cursor: "ns-resize" },
                  sw: { bottom: -5, left: -5, cursor: "nesw-resize" },
                  w:  { top: "calc(50% - 5px)", left: -5, cursor: "ew-resize" },
                };
                return (
                  <div
                    key={h}
                    className="absolute w-2.5 h-2.5 bg-background border-2 border-primary rounded-sm pointer-events-auto"
                    style={styles[h]}
                    onMouseDown={(e) => startDrag(e, selectedClip, h)}
                  />
                );
              })}
              {/* Rotate handle */}
              <div
                className="absolute pointer-events-auto"
                style={{ top: -28, left: "calc(50% - 6px)", width: 12, height: 12 }}
              >
                <div
                  className="w-3 h-3 rounded-full bg-primary border-2 border-background cursor-grab"
                  style={{ cursor: "grab" }}
                  onMouseDown={(e) => startDrag(e, selectedClip, "rotate")}
                />
                <div className="absolute left-1/2 top-3 w-px h-4 bg-primary -translate-x-1/2" />
              </div>
            </div>
          );
        })()}

        {/* Snap guides */}
        {snapGuides.x !== undefined && (
          <div
            className="absolute top-0 bottom-0 w-px bg-pink-500 pointer-events-none"
            style={{ left: `${snapGuides.x * 100}%` }}
          />
        )}
        {snapGuides.y !== undefined && (
          <div
            className="absolute left-0 right-0 h-px bg-pink-500 pointer-events-none"
            style={{ top: `${snapGuides.y * 100}%` }}
          />
        )}

        {state.clips.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm">
            Add clips from the media panel to begin
          </div>
        )}

        <div className="absolute bottom-2 right-3 text-white/40 text-xs font-mono tabular-nums pointer-events-none">
          {state.canvasWidth}×{state.canvasHeight}
        </div>
      </div>
    </div>
  );
}
