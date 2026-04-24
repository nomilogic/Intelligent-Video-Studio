import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import {
  Play, Pause, Square, Plus, ChevronRight, Scissors, Magnet,
  Eye, EyeOff, Volume2, VolumeX, Lock, Unlock, Trash2, SkipBack, SkipForward,
  MousePointer2, Flag, ZoomIn, ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorState, EditorAction, Clip } from "../lib/types";
import { cn } from "@/lib/utils";
import Waveform from "./Waveform";

interface TimelineProps {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

const TRACK_HEIGHT = 48;
const HEADER_WIDTH = 140;
const BASE_PIXELS_PER_SECOND = 40;
const FPS = 30;

function formatTime(s: number, withFrames = false): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  if (withFrames) {
    const f = Math.round((s % 1) * FPS);
    return `${m}:${String(sec).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
  }
  const ms = Math.round((s % 1) * 10);
  return `${m}:${String(sec).padStart(2, "0")}.${ms}`;
}

type DragState =
  | { kind: "move"; clipId: string; startX: number; startY: number; origStart: number; origTrack: number }
  | { kind: "resize-l"; clipId: string; startX: number; origStart: number; origDuration: number; origTrim: number; speed: number }
  | { kind: "resize-r"; clipId: string; startX: number; origDuration: number }
  | { kind: "playhead"; startX: number; origTime: number };

export default function Timeline({ state, dispatch }: TimelineProps) {
  const rulerRef = useRef<HTMLDivElement>(null);
  const trackAreaRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [snapTarget, setSnapTarget] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const PPS = BASE_PIXELS_PER_SECOND * state.zoom;
  const timelineWidth = Math.max(state.duration * PPS, 600);
  const isBlade = state.tool === "blade";

  const handleRulerDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const t = Math.max(0, Math.min(state.duration, x / PPS));
      if (e.shiftKey) {
        dispatch({ type: "ADD_MARKER", payload: { time: t } });
        return;
      }
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
    (state.markers || []).forEach((m) => pts.push(m.time));
    return pts;
  }, [state.clips, state.currentTime, state.duration, state.markers]);

  const trySnap = useCallback(
    (t: number, exclude?: string): number => {
      void exclude;
      if (!state.snapEnabled) return t;
      const SNAP_PX = 8;
      const bestDist = SNAP_PX / PPS;
      let best = t;
      let bestD = bestDist;
      for (const p of snapPoints) {
        const d = Math.abs(p - t);
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
      setSnapTarget(best !== t ? best : null);
      return best;
    },
    [snapPoints, state.snapEnabled, PPS],
  );

  // Returns the sorted siblings on a given track (excluding the moving clip)
  const trackSiblings = useCallback(
    (excludeId: string, trackIdx: number) =>
      state.clips
        .filter((c) => c.id !== excludeId && c.trackIndex === trackIdx)
        .sort((a, b) => a.startTime - b.startTime),
    [state.clips],
  );

  // Clamp a clip's startTime so it never overlaps siblings — snaps to nearest free edge
  const resolveNoOverlap = useCallback(
    (movingId: string, newTrack: number, desiredStart: number, clipDuration: number): number => {
      const siblings = trackSiblings(movingId, newTrack);
      let start = Math.max(0, desiredStart);
      // Iterate until stable (handles cascading conflicts)
      for (let pass = 0; pass < siblings.length; pass++) {
        let changed = false;
        for (const sib of siblings) {
          const sibEnd = sib.startTime + sib.duration;
          const myEnd = start + clipDuration;
          if (start < sibEnd - 0.001 && myEnd > sib.startTime + 0.001) {
            // Overlap: snap to whichever edge is closer to the desired position
            const snapLeft = Math.max(0, sib.startTime - clipDuration);
            const snapRight = sibEnd;
            start = Math.abs(desiredStart - snapLeft) <= Math.abs(desiredStart - snapRight)
              ? snapLeft
              : snapRight;
            changed = true;
          }
        }
        if (!changed) break;
      }
      return start;
    },
    [trackSiblings],
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
        const newTrack = Math.max(0, Math.min(state.tracks.length - 1, drag.origTrack + dTrack));
        const snapped = trySnap(drag.origStart + dt, drag.clipId);
        const movingClip = state.clips.find((c) => c.id === drag.clipId);
        const clipDur = movingClip?.duration ?? 1;
        const newStart = resolveNoOverlap(drag.clipId, newTrack, snapped, clipDur);
        dispatch({
          type: "UPDATE_CLIP",
          payload: {
            id: drag.clipId,
            updates: { startTime: newStart, trackIndex: newTrack },
          },
        });
      } else if (drag.kind === "resize-r") {
        const dx = ev.clientX - drag.startX;
        const rawDuration = Math.max(0.1, drag.origDuration + dx / PPS);
        const clip = state.clips.find((c) => c.id === drag.clipId);
        if (!clip) return;
        const snappedEnd = trySnap(clip.startTime + rawDuration, drag.clipId);
        // Cap right edge at the start of the nearest clip to the right on the same track
        const nextClip = trackSiblings(drag.clipId, clip.trackIndex)
          .find((s) => s.startTime >= clip.startTime);
        const maxEnd = nextClip ? nextClip.startTime : Infinity;
        const clampedEnd = Math.min(snappedEnd, maxEnd);
        dispatch({
          type: "UPDATE_CLIP",
          payload: { id: drag.clipId, updates: { duration: Math.max(0.1, clampedEnd - clip.startTime) } },
        });
      } else if (drag.kind === "resize-l") {
        const dx = ev.clientX - drag.startX;
        const dt = dx / PPS;
        let newStart = trySnap(drag.origStart + dt, drag.clipId);
        const maxStart = drag.origStart + drag.origDuration - 0.1;
        // Cap left edge at the end of the nearest clip to the left on the same track
        const siblings = trackSiblings(drag.clipId, 
          state.clips.find((c) => c.id === drag.clipId)?.trackIndex ?? 0);
        const prevClip = [...siblings]
          .reverse()
          .find((s) => s.startTime + s.duration <= drag.origStart + 0.001);
        const minStart = prevClip ? prevClip.startTime + prevClip.duration : 0;
        newStart = Math.max(minStart, Math.min(maxStart, newStart));
        const deltaTimeline = newStart - drag.origStart;
        const newDuration = drag.origDuration - deltaTimeline;
        // Adjust trimStart so the source plays from the correct frame after trimming the head.
        const newTrim = Math.max(0, drag.origTrim + deltaTimeline * drag.speed);
        dispatch({
          type: "UPDATE_CLIP",
          payload: {
            id: drag.clipId,
            updates: { startTime: newStart, duration: newDuration, trimStart: newTrim },
          },
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
  }, [drag, dispatch, PPS, state.duration, state.tracks.length, state.clips, trySnap, resolveNoOverlap, trackSiblings]);

  const handleClipMouseDown = (e: React.MouseEvent, clip: Clip) => {
    e.stopPropagation();
    if (clip.locked) return;
    if (isBlade) {
      const rect = trackAreaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left + (trackAreaRef.current?.scrollLeft ?? 0);
      const t = x / PPS;
      // Convert to absolute time in seconds from the track area's left
      // Actually, x already includes scrollLeft offset; it's an absolute position
      // within the timeline content (which is what we want).
      dispatch({ type: "SPLIT_CLIP", payload: { clipId: clip.id, time: t } });
      return;
    }
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
      origTrim: clip.trimStart || 0,
      speed: clip.speed || 1,
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
  const majorEvery = state.zoom < 0.4 ? 30 : state.zoom < 0.8 ? 10 : state.zoom < 2 ? 5 : 1;
  const showFrames = state.zoom >= 4;
  const rulerMarks: number[] = [];
  for (let i = 0; i <= totalSeconds; i++) rulerMarks.push(i);

  const clipsInTrack = (trackIdx: number) =>
    state.clips.filter((c) => c.trackIndex === trackIdx);

  const stepFrame = (dir: 1 | -1) => {
    dispatch({ type: "SET_TIME", payload: state.currentTime + dir * (1 / FPS) });
  };

  const setTool = (t: "select" | "blade") => dispatch({ type: "SET_TOOL", payload: t });

  return (
    <div data-testid="timeline" className="flex flex-col flex-1 overflow-hidden bg-card">
      {/* Controls */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => stepFrame(-1)} title="Previous frame (←)">
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
        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => stepFrame(1)} title="Next frame (→)">
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

        <span className="text-xs tabular-nums font-mono text-foreground ml-2 w-24 bg-muted/30 px-2 py-0.5 rounded text-center">
          {formatTime(state.currentTime, true)}
        </span>
        <span className="text-xs text-muted-foreground">/</span>
        <span className="text-xs tabular-nums font-mono text-muted-foreground">
          {formatTime(state.duration)}
        </span>

        <div className="w-px h-5 bg-border mx-2" />

        {/* Tool toggle */}
        <div className="flex rounded border border-border overflow-hidden">
          <button
            className={cn(
              "px-2 py-1 text-xs flex items-center gap-1.5 transition-colors",
              state.tool === "select" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/40",
            )}
            onClick={() => setTool("select")}
            title="Select tool (V)"
          >
            <MousePointer2 className="w-3 h-3" /> Select
          </button>
          <button
            className={cn(
              "px-2 py-1 text-xs flex items-center gap-1.5 transition-colors border-l border-border",
              state.tool === "blade" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/40",
            )}
            onClick={() => setTool("blade")}
            title="Blade tool — click any clip to split (B)"
            data-testid="button-blade"
          >
            <Scissors className="w-3 h-3" /> Blade
          </button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => dispatch({ type: "SPLIT_AT_PLAYHEAD" })}
          title="Split at playhead (S)"
          data-testid="button-split"
        >
          <Scissors className="w-3.5 h-3.5" /> Split @
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => dispatch({ type: "ADD_MARKER", payload: { time: state.currentTime } })}
          title="Add marker at playhead (M)"
        >
          <Flag className="w-3.5 h-3.5" /> Marker
        </Button>

        <Button
          variant={state.snapEnabled ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => dispatch({ type: "TOGGLE_SNAP" })}
          title="Snap to clips/markers/playhead"
        >
          <Magnet className="w-3.5 h-3.5" /> Snap
        </Button>

        <div className="flex-1" />

        {/* Zoom controls */}
        <div className="flex items-center gap-1.5 mr-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6"
            onClick={() => dispatch({ type: "SET_ZOOM", payload: Math.max(0.1, state.zoom / 1.4) })}
            title="Zoom out (-)"
          >
            <ZoomOut className="w-3 h-3" />
          </Button>
          <input
            type="range"
            min={0.1}
            max={10}
            step={0.05}
            value={state.zoom}
            onChange={(e) => dispatch({ type: "SET_ZOOM", payload: parseFloat(e.target.value) })}
            className="w-24 h-1 accent-primary"
            title={`Zoom ${state.zoom.toFixed(1)}x`}
          />
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6"
            onClick={() => dispatch({ type: "SET_ZOOM", payload: Math.min(10, state.zoom * 1.4) })}
            title="Zoom in (+)"
          >
            <ZoomIn className="w-3 h-3" />
          </Button>
          <span className="text-[10px] text-muted-foreground tabular-nums w-9">
            {state.zoom.toFixed(1)}x
          </span>
        </div>

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
          {state.tracks.map((track, i) => {
            void i;
            return (
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
            );
          })}
        </div>

        {/* Scrollable track area */}
        <div
          ref={trackAreaRef}
          className={cn(
            "flex-1 overflow-x-auto overflow-y-auto relative",
            isBlade && "cursor-crosshair",
          )}
          onMouseMove={(e) => {
            const rect = trackAreaRef.current?.getBoundingClientRect();
            if (!rect) return;
            const scrollLeft = trackAreaRef.current?.scrollLeft ?? 0;
            const x = e.clientX - rect.left + scrollLeft;
            setHoverTime(Math.max(0, x / PPS));
          }}
          onMouseLeave={() => setHoverTime(null)}
        >
          <div style={{ width: timelineWidth, minWidth: "100%" }}>
            {/* Ruler */}
            <div
              ref={rulerRef}
              className="h-7 border-b border-border bg-muted/5 relative cursor-pointer select-none sticky top-0 z-20 backdrop-blur"
              style={{ width: timelineWidth }}
              onMouseDown={handleRulerDown}
              title="Click to scrub. Shift+click to add marker."
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
                        {showFrames ? formatTime(s, true) : formatTime(s)}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Frame ticks when zoomed in */}
              {showFrames &&
                Array.from({ length: Math.ceil(state.duration * FPS) }).map((_, idx) => {
                  const t = idx / FPS;
                  if (idx % FPS === 0) return null;
                  return (
                    <div
                      key={`f-${idx}`}
                      className="absolute top-3 w-px bg-border/40"
                      style={{ left: t * PPS, height: 4 }}
                    />
                  );
                })}

              {/* Markers */}
              {(state.markers || []).map((m) => (
                <div
                  key={m.id}
                  className="absolute top-0 bottom-0 z-10 group/marker"
                  style={{ left: m.time * PPS }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    dispatch({ type: "DELETE_MARKER", payload: m.id });
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "SET_TIME", payload: m.time });
                  }}
                  title={`${m.label || "Marker"} @ ${formatTime(m.time, true)} (right-click to delete)`}
                >
                  <Flag
                    className="w-2.5 h-2.5 -translate-x-px"
                    style={{ color: m.color || "#fb923c", fill: m.color || "#fb923c" }}
                  />
                  <div
                    className="absolute top-3 bottom-0 w-px"
                    style={{ background: (m.color || "#fb923c") + "80" }}
                  />
                </div>
              ))}

              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
                style={{ left: state.currentTime * PPS }}
              >
                <div className="absolute -top-1 -left-[5px] w-3 h-3 bg-primary rotate-45" />
              </div>

              {/* Hover blade indicator */}
              {isBlade && hoverTime !== null && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none"
                  style={{ left: hoverTime * PPS }}
                />
              )}
            </div>

            {/* Tracks */}
            <div className="relative" style={{ width: timelineWidth }}>
              {/* Marker lines extend through tracks */}
              {(state.markers || []).map((m) => (
                <div
                  key={`line-${m.id}`}
                  className="absolute top-0 bottom-0 w-px z-10 pointer-events-none"
                  style={{ left: m.time * PPS, background: (m.color || "#fb923c") + "55" }}
                />
              ))}

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

              {/* Hover blade in tracks */}
              {isBlade && hoverTime !== null && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-500/70 z-20 pointer-events-none"
                  style={{ left: hoverTime * PPS }}
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
                    const isAudioWave =
                      (clip.mediaType === "audio" || clip.mediaType === "video") && clip.src;
                    return (
                      <div
                        key={clip.id}
                        data-testid={`timeline-clip-${clip.id}`}
                        className={cn(
                          "absolute top-1 bottom-1 rounded overflow-hidden select-none group",
                          clip.locked
                            ? "cursor-not-allowed"
                            : isBlade
                              ? "cursor-crosshair"
                              : "cursor-grab active:cursor-grabbing",
                          isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-card z-10",
                        )}
                        style={{
                          left,
                          width,
                          backgroundColor: clip.color + "cc",
                          borderLeft: `3px solid ${clip.color}`,
                        }}
                        onMouseDown={(e) => handleClipMouseDown(e, clip)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: "SELECT_CLIP", payload: clip.id });
                        }}
                      >
                        {/* Image thumbnail backdrop */}
                        {clip.mediaType === "image" && clip.src && (
                          <div
                            className="absolute inset-0 opacity-50"
                            style={{
                              backgroundImage: `url(${clip.src})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }}
                          />
                        )}

                        {/* Audio waveform */}
                        {isAudioWave && width > 24 && (
                          <div className="absolute inset-x-0 bottom-0 top-4 pointer-events-none opacity-80">
                            <Waveform
                              src={clip.src!}
                              width={Math.floor(width)}
                              height={Math.max(8, TRACK_HEIGHT - 16)}
                              color={clip.mediaType === "audio" ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.4)"}
                              trimStart={clip.trimStart}
                              duration={clip.duration * (clip.speed || 1)}
                              sourceDuration={
                                clip.mediaType === "audio" || clip.mediaType === "video"
                                  ? undefined
                                  : undefined
                              }
                            />
                          </div>
                        )}

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
                        <div className="px-2 h-full flex items-center text-white text-[11px] font-medium pointer-events-none relative z-[1]">
                          {clip.mediaType === "text" && <span className="mr-1 opacity-70">T</span>}
                          {clip.mediaType === "audio" && <span className="mr-1 opacity-70">♪</span>}
                          {clip.mediaType === "video" && <span className="mr-1 opacity-70">▶</span>}
                          {clip.mediaType === "image" && <span className="mr-1 opacity-70">▣</span>}
                          {clip.muted && <VolumeX className="w-2.5 h-2.5 mr-1 opacity-70" />}
                          <span className="truncate drop-shadow">{clip.label}</span>
                          {width > 80 && (
                            <span className="ml-auto text-white/70 tabular-nums text-[9px] shrink-0 drop-shadow">
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
                    title={`${tr.type} ${tr.duration}s — click to remove`}
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
