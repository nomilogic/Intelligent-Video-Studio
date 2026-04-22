import { useRef, useCallback } from "react";
import { Play, Pause, Square, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorState, EditorAction, Clip } from "../lib/types";
import { cn } from "@/lib/utils";

interface TimelineProps {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

const TRACK_HEIGHT = 36;
const HEADER_WIDTH = 72;
const PIXELS_PER_SECOND = 40;

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 10);
  return `${m}:${String(sec).padStart(2, "0")}.${ms}`;
}

export default function Timeline({ state, dispatch }: TimelineProps) {
  const rulerRef = useRef<HTMLDivElement>(null);
  const timelineWidth = Math.max(state.duration * PIXELS_PER_SECOND, 600);

  const handleRulerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const t = Math.max(0, Math.min(state.duration, x / PIXELS_PER_SECOND));
      dispatch({ type: "SET_TIME", payload: t });
    },
    [state.duration, dispatch]
  );

  const handleClipMouseDown = useCallback(
    (e: React.MouseEvent, clip: Clip) => {
      e.stopPropagation();
      dispatch({ type: "SELECT_CLIP", payload: clip.id });

      const startX = e.clientX;
      const origStart = clip.startTime;

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const dt = dx / PIXELS_PER_SECOND;
        dispatch({
          type: "UPDATE_CLIP",
          payload: {
            id: clip.id,
            updates: { startTime: Math.max(0, origStart + dt) },
          },
        });
      };

      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [dispatch]
  );

  // Build ruler marks
  const totalSeconds = Math.ceil(state.duration);
  const rulerMarks: number[] = [];
  for (let i = 0; i <= totalSeconds; i++) rulerMarks.push(i);

  const clipsInTrack = (trackIdx: number) =>
    state.clips.filter((c) => c.trackIndex === trackIdx);

  return (
    <div data-testid="timeline" className="flex flex-col flex-1 overflow-hidden bg-card">
      {/* Controls */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onClick={() => dispatch({ type: "TOGGLE_PLAY" })}
          data-testid="button-play"
        >
          {state.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onClick={() => {
            dispatch({ type: "SET_TIME", payload: 0 });
            if (state.isPlaying) dispatch({ type: "TOGGLE_PLAY" });
          }}
          data-testid="button-stop"
        >
          <Square className="w-3.5 h-3.5" />
        </Button>

        <span className="text-xs tabular-nums font-mono text-muted-foreground ml-1 w-20">
          {formatTime(state.currentTime)}
        </span>

        <span className="text-xs text-muted-foreground">/</span>

        <span className="text-xs tabular-nums font-mono text-muted-foreground">
          {formatTime(state.duration)}
        </span>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => dispatch({ type: "ADD_TRACK" })}
          data-testid="button-add-track"
        >
          <Plus className="w-3 h-3" /> Track
        </Button>
      </div>

      {/* Timeline body */}
      <div className="flex flex-1 overflow-auto">
        {/* Track labels */}
        <div className="shrink-0 border-r border-border bg-muted/10" style={{ width: HEADER_WIDTH }}>
          {/* Ruler spacer */}
          <div className="h-6 border-b border-border" />
          {state.tracks.map((track, i) => (
            <div
              key={i}
              className="flex items-center px-2 border-b border-border text-xs text-muted-foreground"
              style={{ height: TRACK_HEIGHT }}
            >
              <ChevronRight className="w-3 h-3 mr-1 shrink-0" />
              <span className="truncate">{track}</span>
            </div>
          ))}
        </div>

        {/* Scrollable track area */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden relative">
          <div style={{ width: timelineWidth, minWidth: "100%" }}>
            {/* Ruler */}
            <div
              ref={rulerRef}
              className="h-6 border-b border-border bg-muted/5 relative cursor-pointer select-none"
              style={{ width: timelineWidth }}
              onClick={handleRulerClick}
            >
              {rulerMarks.map((s) => (
                <div
                  key={s}
                  className="absolute top-0 flex flex-col items-start"
                  style={{ left: s * PIXELS_PER_SECOND }}
                >
                  <div
                    className="w-px bg-border"
                    style={{ height: s % 5 === 0 ? 12 : 6, marginTop: s % 5 === 0 ? 0 : 6 }}
                  />
                  {s % 5 === 0 && (
                    <span className="text-[9px] text-muted-foreground ml-0.5 leading-none tabular-nums">
                      {formatTime(s)}
                    </span>
                  )}
                </div>
              ))}

              {/* Playhead on ruler */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
                style={{ left: state.currentTime * PIXELS_PER_SECOND }}
              />
            </div>

            {/* Tracks */}
            <div className="relative" style={{ width: timelineWidth }}>
              {/* Playhead line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-primary/70 z-10 pointer-events-none"
                style={{ left: state.currentTime * PIXELS_PER_SECOND }}
              >
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full" />
              </div>

              {state.tracks.map((_, trackIdx) => (
                <div
                  key={trackIdx}
                  className="border-b border-border relative"
                  style={{ height: TRACK_HEIGHT, width: timelineWidth }}
                >
                  {/* Time grid lines */}
                  {rulerMarks
                    .filter((s) => s % 5 === 0)
                    .map((s) => (
                      <div
                        key={s}
                        className="absolute top-0 bottom-0 w-px bg-border/30"
                        style={{ left: s * PIXELS_PER_SECOND }}
                      />
                    ))}

                  {/* Clips in this track */}
                  {clipsInTrack(trackIdx).map((clip) => {
                    const isSelected = clip.id === state.selectedClipId;
                    const left = clip.startTime * PIXELS_PER_SECOND;
                    const width = clip.duration * PIXELS_PER_SECOND;
                    return (
                      <div
                        key={clip.id}
                        data-testid={`timeline-clip-${clip.id}`}
                        className={cn(
                          "absolute top-1 bottom-1 rounded overflow-hidden cursor-grab active:cursor-grabbing select-none",
                          "flex items-center px-2 text-white text-xs font-medium",
                          isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-card"
                        )}
                        style={{
                          left,
                          width: Math.max(width, 20),
                          backgroundColor: clip.color + "cc",
                          borderLeft: `2px solid ${clip.color}`,
                        }}
                        onMouseDown={(e) => handleClipMouseDown(e, clip)}
                      >
                        <span className="truncate">{clip.label}</span>
                        {width > 60 && (
                          <span className="ml-auto text-white/50 tabular-nums text-[9px] shrink-0">
                            {clip.duration.toFixed(1)}s
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
