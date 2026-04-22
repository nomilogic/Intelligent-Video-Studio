import { useRef, useState, useCallback } from "react";
import { EditorState, EditorAction, Clip } from "../lib/types";
import { cn } from "@/lib/utils";

interface CanvasProps {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

const CLIP_VISIBLE_AT_TIME = (clip: Clip, time: number) =>
  time >= clip.startTime && time < clip.startTime + clip.duration;

export default function Canvas({ state, dispatch }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    clipId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const getCanvasRect = () => containerRef.current?.getBoundingClientRect();

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      dispatch({ type: "SELECT_CLIP", payload: null });
    }
  };

  const handleClipMouseDown = useCallback(
    (e: React.MouseEvent, clip: Clip) => {
      e.stopPropagation();
      dispatch({ type: "SELECT_CLIP", payload: clip.id });

      const rect = getCanvasRect();
      if (!rect) return;

      setDragging({
        clipId: clip.id,
        startX: e.clientX,
        startY: e.clientY,
        origX: clip.x,
        origY: clip.y,
      });

      const onMouseMove = (ev: MouseEvent) => {
        if (!rect) return;
        const dx = (ev.clientX - e.clientX) / rect.width;
        const dy = (ev.clientY - e.clientY) / rect.height;
        dispatch({
          type: "UPDATE_CLIP",
          payload: {
            id: clip.id,
            updates: {
              x: Math.max(0, Math.min(1 - clip.width, clip.x + dx)),
              y: Math.max(0, Math.min(1 - clip.height, clip.y + dy)),
            },
          },
        });
      };

      const onMouseUp = () => {
        setDragging(null);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [dispatch]
  );

  const visibleClips = state.clips;
  const selectedClip = state.clips.find((c) => c.id === state.selectedClipId);

  return (
    <div className="relative flex items-center justify-center w-full h-full overflow-hidden">
      <div
        ref={containerRef}
        data-testid="canvas-preview"
        className={cn(
          "relative bg-black overflow-hidden cursor-default select-none",
          dragging && "cursor-grabbing"
        )}
        style={{
          aspectRatio: `${state.canvasWidth} / ${state.canvasHeight}`,
          width: "min(100%, calc(100vh * 16 / 9 * 0.55))",
          boxShadow: "0 0 0 1px hsl(var(--border)), 0 4px 24px rgba(0,0,0,0.6)",
        }}
        onClick={handleCanvasClick}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "10% 10%",
          }}
        />

        {/* Clips */}
        {visibleClips.map((clip) => {
          const isSelected = clip.id === state.selectedClipId;
          return (
            <div
              key={clip.id}
              data-testid={`canvas-clip-${clip.id}`}
              className={cn(
                "absolute flex items-center justify-center rounded-sm overflow-hidden",
                "cursor-grab active:cursor-grabbing transition-[outline] duration-100",
                isSelected && "outline outline-2 outline-primary"
              )}
              style={{
                left: `${clip.x * 100}%`,
                top: `${clip.y * 100}%`,
                width: `${clip.width * 100}%`,
                height: `${clip.height * 100}%`,
                opacity: clip.opacity,
                transform: `rotate(${clip.rotation}deg)`,
                mixBlendMode: clip.blendMode as any,
                background: `linear-gradient(135deg, ${clip.color}cc, ${clip.color}66)`,
              }}
              onMouseDown={(e) => handleClipMouseDown(e, clip)}
            >
              {/* Clip content */}
              <div className="flex flex-col items-center gap-0.5 p-1 pointer-events-none">
                <span
                  className="text-white font-semibold drop-shadow-lg truncate max-w-full px-1"
                  style={{ fontSize: `clamp(8px, ${clip.width * 2}vw, 14px)` }}
                >
                  {clip.label}
                </span>
                {clip.animationIn !== "none" && (
                  <span
                    className="text-white/60 uppercase tracking-widest"
                    style={{ fontSize: `clamp(6px, ${clip.width}vw, 9px)` }}
                  >
                    {clip.animationIn} in
                  </span>
                )}
              </div>

              {/* Selection handles */}
              {isSelected && (
                <>
                  {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos) => (
                    <div
                      key={pos}
                      className={cn("absolute w-2.5 h-2.5 bg-primary rounded-full border-2 border-background", pos)}
                    />
                  ))}
                </>
              )}
            </div>
          );
        })}

        {/* Empty state */}
        {state.clips.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">
            Add clips to begin compositing
          </div>
        )}

        {/* Time indicator */}
        <div className="absolute bottom-1 right-2 text-white/40 text-xs font-mono tabular-nums">
          {formatTime(state.currentTime)} / {formatTime(state.duration)}
        </div>
      </div>
    </div>
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 10);
  return `${m}:${String(sec).padStart(2, "0")}.${ms}`;
}
