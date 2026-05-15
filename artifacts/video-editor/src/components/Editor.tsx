import { useEffect, useReducer, useRef, useCallback, useState, useMemo } from "react";
import { rootReducer, initialRootState } from "@/lib/reducer";
import type { EditorAction, EditorState, Clip } from "@/lib/types";

import Toolbar from "./Toolbar";
import MediaPanel from "./MediaPanel";
import Canvas from "./Canvas";
import PropertiesInspector from "./PropertiesInspector";
import Timeline from "./Timeline";
import AIInstructionBar from "./AIInstructionBar";

export interface EditorProps {
  projectId?: number;
  initialEditorState?: EditorState;
  projectName?: string;
}

export function Editor({ projectId, initialEditorState, projectName }: EditorProps) {
  const [root, dispatch] = useReducer(
    rootReducer,
    initialEditorState
      ? { present: initialEditorState, past: [], future: [] }
      : initialRootState,
  );
  const state = root.present;
  const rafRef = useRef<number | null>(null);
  const currentTimeRef = useRef(state.currentTime);
  const durationRef = useRef(state.duration);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [isCropping, setIsCropping] = useState(false);
  const hydratedRef = useRef(false);
  const clipboardRef = useRef<Clip[]>([]);
  const [leftPanelWidth, setLeftPanelWidth] = useState(240);
  const [rightPanelWidth, setRightPanelWidth] = useState(280);
  const [timelineHeight, setTimelineHeight] = useState(320);
  const panelDragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const rightDragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const timelineDragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  // Hydrate the reducer when async-loaded state arrives later (e.g. switching
  // between projects).
  useEffect(() => {
    if (!initialEditorState || hydratedRef.current) return;
    dispatch({ type: "REPLACE_STATE", payload: initialEditorState });
    hydratedRef.current = true;
  }, [initialEditorState]);

  const playbackEnd = state.clips.length > 0
    ? Math.max(...state.clips.map((c) => c.startTime + c.duration))
    : state.duration;
  const playbackEndRef = useRef(playbackEnd);
  currentTimeRef.current = state.currentTime;
  durationRef.current = state.duration;
  playbackEndRef.current = playbackEnd;

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (panelDragRef.current) {
        const dx = e.clientX - panelDragRef.current.startX;
        const next = Math.max(48, Math.min(480, panelDragRef.current.startWidth + dx));
        setLeftPanelWidth(next);
      }
      if (rightDragRef.current) {
        const dx = rightDragRef.current.startX - e.clientX;
        const next = Math.max(180, Math.min(520, rightDragRef.current.startWidth + dx));
        setRightPanelWidth(next);
      }
      if (timelineDragRef.current) {
        const dy = timelineDragRef.current.startY - e.clientY;
        const next = Math.max(160, Math.min(600, timelineDragRef.current.startHeight + dy));
        setTimelineHeight(next);
      }
    };
    const onMouseUp = () => {
      if (panelDragRef.current || rightDragRef.current || timelineDragRef.current) {
        panelDragRef.current = null;
        rightDragRef.current = null;
        timelineDragRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    if (state.clips.length === 0) return;
    const contentEnd = Math.max(...state.clips.map((c) => c.startTime + c.duration));
    if (contentEnd > state.duration + 0.001) {
      dispatch({ type: "SET_DURATION", payload: contentEnd });
    }
  }, [state.clips, state.duration]);

  useEffect(() => {
    if (!state.isPlaying) return;
    const DISPATCH_INTERVAL_MS = 33;
    let last = performance.now();
    let lastDispatch = last;
    let pending = currentTimeRef.current;
    // Track the last value we dispatched. If the store's currentTime drifts
    // away from this between ticks, the user (or AI) seeked externally —
    // snap `pending` to the new position so playback continues from there.
    let lastDispatchedValue = pending;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      // External seek detection (e.g. clicking the ruler while playing).
      if (Math.abs(currentTimeRef.current - lastDispatchedValue) > 0.05) {
        pending = currentTimeRef.current;
        lastDispatchedValue = pending;
      }
      pending += dt;
      if (pending >= playbackEndRef.current) {
        dispatch({ type: "SET_PLAYING", payload: false });
        dispatch({ type: "SET_TIME", payload: playbackEndRef.current });
        return;
      }
      if (now - lastDispatch >= DISPATCH_INTERVAL_MS) {
        lastDispatch = now;
        lastDispatchedValue = pending;
        dispatch({ type: "SET_TIME", payload: pending });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isPlaying]);

  const dispatchTyped = useCallback((a: EditorAction) => dispatch(a), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isTyping) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); dispatchTyped({ type: "UNDO" }); }
      else if (meta && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); dispatchTyped({ type: "REDO" }); }
      else if (meta && e.key.toLowerCase() === "d") { e.preventDefault(); if (state.selectedClipIds[0]) dispatchTyped({ type: "DUPLICATE_CLIP", payload: state.selectedClipIds[0] }); }
      else if (e.key === " ") { e.preventDefault(); dispatchTyped({ type: "TOGGLE_PLAY" }); }
      else if (e.key.toLowerCase() === "s") { e.preventDefault(); dispatchTyped({ type: "SPLIT_AT_PLAYHEAD" }); }
      else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (state.selectedClipIds.length) {
          if (e.shiftKey && state.selectedClipIds[0]) {
            state.selectedClipIds.forEach((id) => dispatchTyped({ type: "RIPPLE_DELETE", payload: id }));
          } else {
            dispatchTyped({ type: "DELETE_CLIPS", payload: state.selectedClipIds });
          }
        }
      }
      else if (e.key.toLowerCase() === "v") { e.preventDefault(); dispatchTyped({ type: "SET_TOOL", payload: "select" }); }
      else if (e.key.toLowerCase() === "b" && !meta) { e.preventDefault(); dispatchTyped({ type: "SET_TOOL", payload: "blade" }); }
      else if (e.key.toLowerCase() === "m" && !meta) { e.preventDefault(); dispatchTyped({ type: "ADD_MARKER", payload: { time: state.currentTime } }); }
      else if (e.key.toLowerCase() === "j") { e.preventDefault(); dispatchTyped({ type: "SET_TIME", payload: Math.max(0, state.currentTime - 1) }); }
      else if (e.key.toLowerCase() === "k") { e.preventDefault(); dispatchTyped({ type: "SET_PLAYING", payload: false }); }
      else if (e.key.toLowerCase() === "l") { e.preventDefault(); dispatchTyped({ type: "SET_TIME", payload: Math.min(playbackEndRef.current, state.currentTime + 1) }); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); dispatchTyped({ type: "SET_TIME", payload: Math.max(0, state.currentTime - (e.shiftKey ? 1 : 1 / 30)) }); }
      else if (e.key === "ArrowRight") { e.preventDefault(); dispatchTyped({ type: "SET_TIME", payload: Math.min(playbackEndRef.current, state.currentTime + (e.shiftKey ? 1 : 1 / 30)) }); }
      else if (e.key === "Home") { e.preventDefault(); dispatchTyped({ type: "SET_TIME", payload: 0 }); }
      else if (e.key === "End") { e.preventDefault(); dispatchTyped({ type: "SET_TIME", payload: playbackEndRef.current }); }
      else if (e.key === "+" || e.key === "=") { e.preventDefault(); setCanvasZoom((z) => Math.min(4, parseFloat((z + 0.25).toFixed(2)))); }
      else if (e.key === "-" || e.key === "_") { e.preventDefault(); setCanvasZoom((z) => Math.max(0.1, parseFloat((z - 0.25).toFixed(2)))); }
      else if (e.key === "0") { e.preventDefault(); setCanvasZoom(1); }
      else if (e.key === "Escape") {
        if (isCropping) setIsCropping(false);
        else dispatchTyped({ type: "SELECT_CLIP", payload: null });
      }
      else if (meta && e.key.toLowerCase() === "c") {
        if (state.selectedClipIds.length) {
          e.preventDefault();
          clipboardRef.current = state.clips.filter((c) => state.selectedClipIds.includes(c.id));
        }
      }
      else if (meta && e.key.toLowerCase() === "v") {
        if (clipboardRef.current.length) {
          e.preventDefault();
          dispatchTyped({ type: "PASTE_CLIPS", payload: { clips: clipboardRef.current, pasteTime: state.currentTime } });
        }
      }
      else if (e.key.toLowerCase() === "c" && !meta && state.selectedClipIds.length) {
        const sel = state.clips.find((c) => state.selectedClipIds.includes(c.id));
        if (sel && (sel.mediaType === "video" || sel.mediaType === "image")) {
          e.preventDefault();
          setIsCropping((v) => !v);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.selectedClipIds, state.currentTime, state.clips, state.duration, state.zoom, dispatchTyped, isCropping]);

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      <Toolbar
        state={state}
        dispatch={dispatchTyped}
        canUndo={root.past.length > 0}
        canRedo={root.future.length > 0}
        canvasZoom={canvasZoom}
        onCanvasZoomChange={setCanvasZoom}
        projectId={projectId}
        projectName={projectName}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <MediaPanel state={state} dispatch={dispatchTyped} panelWidth={leftPanelWidth} />
        {/* Drag-resize handle */}
        <div
          className="w-1 shrink-0 bg-border/50 hover:bg-primary/40 active:bg-primary/60 cursor-col-resize transition-colors"
          onMouseDown={(e) => {
            panelDragRef.current = { startX: e.clientX, startWidth: leftPanelWidth };
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
            e.preventDefault();
          }}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden bg-neutral-600">
            <Canvas state={state} dispatch={dispatchTyped} canvasZoom={canvasZoom} onCanvasZoomChange={setCanvasZoom} isCropping={isCropping} onCroppingChange={setIsCropping} />
          </div>

          {/* Timeline resize handle */}
          <div
            className="h-1 shrink-0 bg-border/50 hover:bg-primary/40 active:bg-primary/60 cursor-row-resize transition-colors"
            onMouseDown={(e) => {
              timelineDragRef.current = { startY: e.clientY, startHeight: timelineHeight };
              document.body.style.cursor = "row-resize";
              document.body.style.userSelect = "none";
              e.preventDefault();
            }}
          />

          <div className="flex flex-col border-t border-border bg-card" style={{ height: timelineHeight }}>
            <AIInstructionBar state={state} dispatch={dispatchTyped} />
            <Timeline state={state} dispatch={dispatchTyped} />
          </div>
        </div>

        {/* Right panel resize handle */}
        <div
          className="w-1 shrink-0 bg-border/50 hover:bg-primary/40 active:bg-primary/60 cursor-col-resize transition-colors"
          onMouseDown={(e) => {
            rightDragRef.current = { startX: e.clientX, startWidth: rightPanelWidth };
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
            e.preventDefault();
          }}
        />

        <div style={{ width: rightPanelWidth }} className="shrink-0 overflow-hidden">
          <PropertiesInspector state={state} dispatch={dispatchTyped} isCropping={isCropping} onCroppingChange={setIsCropping} />
        </div>
      </div>
    </div>
  );
}

export default Editor;
