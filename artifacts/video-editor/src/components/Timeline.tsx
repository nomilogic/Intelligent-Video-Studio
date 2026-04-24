import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import {
  Play, Pause, Square, Plus, ChevronRight, Scissors, Magnet,
  Eye, EyeOff, Volume2, VolumeX, Lock, Unlock, Trash2, SkipBack, SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorState, EditorAction, Clip } from "../lib/types";
import { cn } from "@/lib/utils";

interface TimelineProps {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

const TRACK_HEIGHT = 44;
const HEADER_WIDTH = 140;
const BASE_PIXELS_PER_SECOND = 40;

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 10);
  return `${m}:${String(sec).padStart(2, "0")}.${ms}`;
}

type DragState =
  | { kind: "move"; clipId: string; startX: number; startY: number; origStart: number; origTrack: number }
  | { kind: "resize-l"; clipId: string; startX: number; origStart: number; origDuration: number }
  | { kind: "resize-r"; clipId: string; startX: number; origDuration: number }
  | { kind: "playhead"; startX: number; origTime: number };

export default function Timeline({ state, dispatch }: TimelineProps) {
  const rulerRef = useRef<HTMLDivElement>(null);
  const trackAreaRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [snapTarget, setSnapTarget] = useState<number | null>(null);

  const PPS = BASE_PIXELS_PER_SECOND * state.zoom;
  const timelineWidth = Math.max(state.duration * PPS, 600);

  const handleRulerDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const t = Math.max(0, Math.min(state.duration, x / PPS));
      dispatch({ type: "SET_TIME", payload: t });
      setDrag({ kind: "playhead", startX: e.clientX, origTime: t });
    },
    [state.duration, dispatch, PPS],
  );

  const snapPoints = useMemo(() => {
    const pts: number[] = [0, state.currentTime, state.duration];
    state.clips.forEach((c) => {
      pts.push(c.startTime);
      pts.push(c.startTime + c.duration);
    });
    return pts;
  }, [state.clips, state.currentTime, state.duration]);

  const trySnap = useCallback(
    (t: number, exclude?: string): number => {
      if (!state.snapEnabled) return t;
      const SNAP_PX = 8;
      let bestDist = SNAP_PX / PPS;
      let best = t;
      const filtered = exclude
        ? snapPoints.filter((_, i) => {
            // remove the excluded clip's points
            return true;
          })
        : snapPoints;
      for (const p of filtered) {
        if (Math.abs(p - t) < bestDist) {
          bestDist = Math.abs(p - t);
          best = p;
        }
      }
      setSnapTarget(best !== t ? best : null);
      return best;
    },
    [snapPoints, state.snapEnabled, PPS],
  );

  useEffect(() => {
    if (!drag) return;
    const onMove = (ev: MouseEvent) => {
      const rect = trackAreaRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (drag.kind === "playhead") {
        const dx = ev.clientX - drag.startX;
        const dt = dx / PPS;
        const t = Math.max(0, Math.min(state.duration, drag.origTime + dt));
        dispatch({ type: "SET_TIME", payload: t });
      } else if (drag.kind === "move") {
        const dx = ev.clientX - drag.startX;
        const dy = ev.clientY - drag.startY;
        const dt = dx / PPS;
        const dTrack = Math.round(dy / TRACK_HEIGHT);
        const newStart = Math.max(0, trySnap(drag.origStart + dt, drag.clipId));
        const newTrack = Math.max(
          0,
          Math.min(state.tracks.length - 1, drag.origTrack + dTrack),
        );
        dispatch({
          type: "UPDATE_CLIP",
          payload: {
            id: drag.clipId,
            updates: { startTime: newStart, trackIndex: newTrack },
          },
        });
      } else if (drag.kind === "resize-r") {
        const dx = ev.clientX - drag.startX;
        const newDuration = Math.max(0.1, drag.origDuration + dx / PPS);
        const clip = state.clips.find((c) => c.id === drag.clipId);
        if (!clip) return;
        const snapped = trySnap(clip.startTime + newDuration, drag.clipId);
        dispatch({
          type: "UPDATE_CLIP",
          payload: { id: drag.clipId, updates: { duration: Math.max(0.1, snapped - clip.startTime) } },
        });
      } else if (drag.kind === "resize-l") {
        const dx = ev.clientX - drag.startX;
        const dt = dx / PPS;
        let newStart = trySnap(drag.origStart + dt, drag.clipId);
        const maxStart = drag.origStart + drag.origDuration - 0.1;
        newStart = Math.max(0, Math.min(maxStart, newStart));
        const newDuration = drag.origDuration - (newStart - drag.origStart);
        dispatch({
          type: "UPDATE_CLIP",
          payload: { id: drag.clipId, updates: { startTime: newStart, duration: newDuration } },
        });
      }
    };
    const onUp = () => {
      setDrag(null);
      setSnapTarget(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, dispatch, PPS, state.duration, state.tracks.length, state.clips, trySnap]);

  const handleClipMouseDown = (e: React.MouseEvent, clip: Clip) => {
    e.stopPropagation();
    if (clip.locked) return;
    if (e.shiftKey) {
      dispatch({ type: "TOGGLE_CLIP_SELECTION", payload: clip.id });
    } else {
      dispatch({ type: "SELECT_CLIP", payload: clip.id });
    }
    setDrag({
      kind: "move",
      clipId: clip.id,
      startX: e.clientX,
      startY: e.clientY,
      origStart: clip.startTime,
      origTrack: clip.trackIndex,
    });
  };

  const handleResizeLeft = (e: React.MouseEvent, clip: Clip) => {
    e.stopPropagation();
    if (clip.locked) return;
    setDrag({
      kind: "resize-l",
      clipId: clip.id,
      startX: e.clientX,
      origStart: clip.startTime,
      origDuration: clip.duration,
    });
  };

  const handleResizeRight = (e: React.MouseEvent, clip: Clip) => {
    e.stopPropagation();
    if (clip.locked) return;
    setDrag({
      kind: "resize-r",
      clipId: clip.id,
      startX: e.clientX,
      origDuration: clip.duration,
    });
  };

  const totalSeconds = Math.ceil(state.duration);
  const majorEvery = state.zoom < 0.5 ? 10 : state.zoom < 1.5 ? 5 : 1;
  const rulerMarks: number[] = [];
  for (let i = 0; i <= totalSeconds; i++) rulerMarks.push(i);

  const clipsInTrack = (trackIdx: number) =>
    state.clips.filter((c) => c.trackIndex === trackIdx);

  const stepFrame = (dir: 1 | -1) => {
    dispatch({ type: "SET_TIME", payload: state.currentTime + dir * (1 / 30) });
  };

  return (
    <div data-testid="timeline" className="flex flex-col flex-1 overflow-hidden bg-card">
      {/* Controls */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => stepFrame(-1)} title="Previous frame">
          <SkipBack className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onClick={() => dispatch({ type: "TOGGLE_PLAY" })}
          data-testid="button-play"
          title="Play / Pause (Space)"
        >
          {state.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => stepFrame(1)} title="Next frame">
          <SkipForward className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onClick={() => {
            dispatch({ type: "SET_TIME", payload: 0 });
            dispatch({ type: "SET_PLAYING", payload: false });
          }}
          data-testid="button-stop"
          title="Stop"
        >
          <Square className="w-3 h-3" />
        </Button>

        <span className="text-xs tabular-nums font-mono text-foreground ml-2 w-20 bg-muted/30 px-2 py-0.5 rounded">
          {formatTime(state.currentTime)}
        </span>
        <span className="text-xs text-muted-foreground">/</span>
        <span className="text-xs tabular-nums font-mono text-muted-foreground">
          {formatTime(state.duration)}
        </span>

        <div className="w-px h-5 bg-border mx-2" />

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => dispatch({ type: "SPLIT_AT_PLAYHEAD" })}
          title="Split at playhead (S)"
          data-testid="button-split"
        >
          <Scissors className="w-3.5 h-3.5" /> Split
        </Button>

        <Button
          variant={state.snapEnabled ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => dispatch({ type: "TOGGLE_SNAP" })}
          title="Snap to clips/playhead"
        >
          <Magnet className="w-3.5 h-3.5" /> Snap
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => dispatch({ type: "ADD_TRACK" })}
          data-testid="button-add-track"
        >
          <Plus className="w-3 h-3" /> Track
        </Button>
      </div>

      {/* Timeline body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track labels */}
        <div className="shrink-0 border-r border-border bg-muted/10 overflow-hidden" style={{ width: HEADER_WIDTH }}>
          <div className="h-7 border-b border-border" />
          {state.tracks.map((track, i) => (
            <div
              key={track.id}
              className="flex items-center gap-1 px-2 border-b border-border text-xs group hover:bg-muted/30"
              style={{ height: TRACK_HEIGHT }}
            >
              <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />
              <span className="truncate flex-1 text-foreground/80">{track.name}</span>
              <button
                className="opacity-50 hover:opacity-100"
                onClick={() => dispatch({ type: "UPDATE_TRACK", payload: { id: track.id, updates: { hidden: !track.hidden } } })}
                title={track.hidden ? "Show track" : "Hide track"}
              >
                {track.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
              <button
                className="opacity-50 hover:opacity-100"
                onClick={() => dispatch({ type: "UPDATE_TRACK", payload: { id: track.id, updates: { muted: !track.muted } } })}
                title={track.muted ? "Unmute" : "Mute"}
              >
                {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              </button>
              <button
                className="opacity-50 hover:opacity-100"
                onClick={() => dispatch({ type: "UPDATE_TRACK", payload: { id: track.id, updates: { locked: !track.locked } } })}
                title={track.locked ? "Unlock" : "Lock"}
              >
                {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </button>
              <button
                className="opacity-0 group-hover:opacity-50 hover:!opacity-100"
                onClick={() => dispatch({ type: "DELETE_TRACK", payload: track.id })}
                title="Delete track"
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>

        {/* Scrollable track area */}
        <div ref={trackAreaRef} className="flex-1 overflow-x-auto overflow-y-auto relative">
          <div style={{ width: timelineWidth, minWidth: "100%" }}>
            {/* Ruler */}
            <div
              ref={rulerRef}
              className="h-7 border-b border-border bg-muted/5 relative cursor-pointer select-none sticky top-0 z-20 backdrop-blur"
              style={{ width: timelineWidth }}
              onMouseDown={handleRulerDown}
            >
              {rulerMarks.map((s) => {
                const isMajor = s % majorEvery === 0;
                return (
                  <div
                    key={s}
                    className="absolute top-0 flex flex-col items-start"
                    style={{ left: s * PPS }}
                  >
                    <div
                      className={cn(isMajor ? "bg-muted-foreground" : "bg-border")}
                      style={{ width: 1, height: isMajor ? 14 : 6, marginTop: isMajor ? 0 : 8 }}
                    />
                    {isMajor && (
                      <span className="text-[9px] text-muted-foreground ml-0.5 leading-none tabular-nums">
                        {formatTime(s)}
                      </span>
                    )}
                  </div>
                );
              })}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
                style={{ left: state.currentTime * PPS }}
              >
                <div className="absolute -top-1 -left-[5px] w-3 h-3 bg-primary rotate-45" />
              </div>
            </div>

            {/* Tracks */}
            <div className="relative" style={{ width: timelineWidth }}>
              {/* Playhead line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-primary/60 z-10 pointer-events-none"
                style={{ left: state.currentTime * PPS }}
              />

              {/* Snap target indicator */}
              {snapTarget !== null && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-pink-500 z-10 pointer-events-none"
                  style={{ left: snapTarget * PPS }}
                />
              )}

              {state.tracks.map((track, trackIdx) => (
                <div
                  key={track.id}
                  className={cn(
                    "border-b border-border relative",
                    track.hidden && "opacity-40",
                  )}
                  style={{ height: TRACK_HEIGHT, width: timelineWidth }}
                >
                  {rulerMarks
                    .filter((s) => s % majorEvery === 0)
                    .map((s) => (
                      <div
                        key={s}
                        className="absolute top-0 bottom-0 w-px bg-border/30"
                        style={{ left: s * PPS }}
                      />
                    ))}

                  {clipsInTrack(trackIdx).map((clip) => {
                    const isSelected = state.selectedClipIds.includes(clip.id);
                    const left = clip.startTime * PPS;
                    const width = Math.max(clip.duration * PPS, 16);
                    const clipKeyframes = state.keyframes.filter((k) => k.clipId === clip.id);
                    return (
                      <div
                        key={clip.id}
                        data-testid={`timeline-clip-${clip.id}`}
                        className={cn(
                          "absolute top-1 bottom-1 rounded overflow-hidden select-none group",
                          clip.locked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
                          isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-card z-10",
                        )}
                        style={{
                          left,
                          width,
                          backgroundColor: clip.color + "cc",
                          borderLeft: `3px solid ${clip.color}`,
                        }}
                        onMouseDown={(e) => handleClipMouseDown(e, clip)}
                      >
                        {/* Left resize handle */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/40 z-10"
                          onMouseDown={(e) => handleResizeLeft(e, clip)}
                          title="Trim start"
                        />
                        {/* Right resize handle */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/40 z-10"
                          onMouseDown={(e) => handleResizeRight(e, clip)}
                          title="Trim end"
                        />

                        {/* Content */}
                        <div className="px-2 h-full flex items-center text-white text-xs font-medium pointer-events-none">
                          {clip.mediaType === "text" && <span className="mr-1 opacity-70">T</span>}
                          {clip.mediaType === "audio" && <span className="mr-1 opacity-70">♪</span>}
                          <span className="truncate">{clip.label}</span>
                          {width > 80 && (
                            <span className="ml-auto text-white/50 tabular-nums text-[9px] shrink-0">
                              {clip.duration.toFixed(1)}s
                            </span>
                          )}
                        </div>

                        {/* Keyframe markers */}
                        {clipKeyframes.map((kf) => {
                          const localPx = (kf.time - clip.startTime) * PPS;
                          if (localPx < 0 || localPx > width) return null;
                          return (
                            <div
                              key={kf.id}
                              className="absolute bottom-0 w-1.5 h-1.5 bg-yellow-300 rotate-45 -translate-x-1/2"
                              style={{ left: localPx }}
                              title={`${kf.property} = ${kf.value}`}
                            />
                          );
                        })}

                        {/* Animation in/out indicators */}
                        {clip.animationIn !== "none" && (
                          <div
                            className="absolute top-0 bottom-0 left-1.5 bg-gradient-to-r from-white/30 to-transparent pointer-events-none"
                            style={{ width: Math.min(clip.animationInDuration * PPS, width / 3) }}
                          />
                        )}
                        {clip.animationOut !== "none" && (
                          <div
                            className="absolute top-0 bottom-0 right-1.5 bg-gradient-to-l from-white/30 to-transparent pointer-events-none"
                            style={{ width: Math.min(clip.animationOutDuration * PPS, width / 3) }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Transitions overlay */}
              {state.transitions.map((tr) => {
                const from = state.clips.find((c) => c.id === tr.fromClipId);
                const to = state.clips.find((c) => c.id === tr.toClipId);
                if (!from || !to) return null;
                const overlapStart = Math.max(from.startTime, to.startTime);
                const left = overlapStart * PPS;
                const width = tr.duration * PPS;
                const top = Math.min(from.trackIndex, to.trackIndex) * TRACK_HEIGHT + 4;
                return (
                  <div
                    key={tr.id}
                    className="absolute h-2 bg-pink-500/80 rounded pointer-events-auto cursor-pointer"
                    style={{ left, width, top, marginTop: TRACK_HEIGHT - 8 }}
                    title={`${tr.type} ${tr.duration}s`}
                    onClick={() => dispatch({ type: "DELETE_TRANSITION", payload: tr.id })}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
