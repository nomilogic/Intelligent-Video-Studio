import { useEffect, useReducer, useRef, useCallback, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { rootReducer, initialRootState } from "./lib/reducer";
import { EditorAction } from "./lib/types";

import Toolbar from "./components/Toolbar";
import MediaPanel from "./components/MediaPanel";
import Canvas from "./components/Canvas";
import PropertiesInspector from "./components/PropertiesInspector";
import Timeline from "./components/Timeline";
import AIInstructionBar from "./components/AIInstructionBar";

const queryClient = new QueryClient();

function Editor() {
  const [root, dispatch] = useReducer(rootReducer, initialRootState);
  const state = root.present;
  const rafRef = useRef<number | null>(null);
  const currentTimeRef = useRef(state.currentTime);
  const durationRef = useRef(state.duration);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [isCropping, setIsCropping] = useState(false);

  // Effective playback end = the last frame of the last clip in the timeline.
  // Falls back to state.duration when there are no clips.
  const playbackEnd = state.clips.length > 0
    ? Math.max(...state.clips.map((c) => c.startTime + c.duration))
    : state.duration;
  const playbackEndRef = useRef(playbackEnd);

  currentTimeRef.current = state.currentTime;
  durationRef.current = state.duration;
  playbackEndRef.current = playbackEnd;

  // Auto-grow project duration so it always covers the last clip on the
  // timeline — like a normal NLE. Users can still extend it further by hand
  // via the Properties Inspector for adding pure-animation tail time.
  useEffect(() => {
    if (state.clips.length === 0) return;
    const contentEnd = Math.max(...state.clips.map((c) => c.startTime + c.duration));
    if (contentEnd > state.duration + 0.001) {
      dispatch({ type: "SET_DURATION", payload: contentEnd });
    }
  }, [state.clips, state.duration]);

  // Playback loop using rAF for smoother updates.
  //
  // Performance: dispatching SET_TIME on every frame (60Hz) re-renders the
  // entire editor (Timeline + Inspector are large) which makes playback
  // visibly laggy. Native <video> elements play at their own rate independently
  // of React, so we only need to update the React playhead at ~30Hz to keep
  // the UI in sync without starving the main thread.
  useEffect(() => {
    if (!state.isPlaying) return;
    const DISPATCH_INTERVAL_MS = 33; // ~30Hz UI update rate
    let last = performance.now();
    let lastDispatch = last;
    let pending = currentTimeRef.current;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      pending += dt;
      if (pending >= playbackEndRef.current) {
        dispatch({ type: "SET_PLAYING", payload: false });
        dispatch({ type: "SET_TIME", payload: playbackEndRef.current });
        return;
      }
      if (now - lastDispatch >= DISPATCH_INTERVAL_MS) {
        lastDispatch = now;
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

      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatchTyped({ type: "UNDO" });
      } else if (meta && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        dispatchTyped({ type: "REDO" });
      } else if (meta && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (state.selectedClipIds[0]) dispatchTyped({ type: "DUPLICATE_CLIP", payload: state.selectedClipIds[0] });
      } else if (e.key === " ") {
        e.preventDefault();
        dispatchTyped({ type: "TOGGLE_PLAY" });
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        dispatchTyped({ type: "SPLIT_AT_PLAYHEAD" });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (state.selectedClipIds.length) {
          if (e.shiftKey && state.selectedClipIds[0]) {
            // Ripple delete: remove and close the gap
            state.selectedClipIds.forEach((id) => dispatchTyped({ type: "RIPPLE_DELETE", payload: id }));
          } else {
            dispatchTyped({ type: "DELETE_CLIPS", payload: state.selectedClipIds });
          }
        }
      } else if (e.key.toLowerCase() === "v") {
        e.preventDefault();
        dispatchTyped({ type: "SET_TOOL", payload: "select" });
      } else if (e.key.toLowerCase() === "b" && !meta) {
        e.preventDefault();
        dispatchTyped({ type: "SET_TOOL", payload: "blade" });
      } else if (e.key.toLowerCase() === "m" && !meta) {
        e.preventDefault();
        dispatchTyped({ type: "ADD_MARKER", payload: { time: state.currentTime } });
      } else if (e.key.toLowerCase() === "j") {
        e.preventDefault();
        dispatchTyped({ type: "SET_TIME", payload: Math.max(0, state.currentTime - 1) });
      } else if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        dispatchTyped({ type: "SET_PLAYING", payload: false });
      } else if (e.key.toLowerCase() === "l") {
        e.preventDefault();
        dispatchTyped({ type: "SET_TIME", payload: Math.min(playbackEndRef.current, state.currentTime + 1) });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        dispatchTyped({ type: "SET_TIME", payload: Math.max(0, state.currentTime - (e.shiftKey ? 1 : 1 / 30)) });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        dispatchTyped({ type: "SET_TIME", payload: Math.min(playbackEndRef.current, state.currentTime + (e.shiftKey ? 1 : 1 / 30)) });
      } else if (e.key === "Home") {
        e.preventDefault();
        dispatchTyped({ type: "SET_TIME", payload: 0 });
      } else if (e.key === "End") {
        e.preventDefault();
        dispatchTyped({ type: "SET_TIME", payload: playbackEndRef.current });
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setCanvasZoom((z) => Math.min(4, parseFloat((z + 0.25).toFixed(2))));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setCanvasZoom((z) => Math.max(0.1, parseFloat((z - 0.25).toFixed(2))));
      } else if (e.key === "0") {
        e.preventDefault();
        setCanvasZoom(1);
      } else if (e.key === "Escape") {
        if (isCropping) setIsCropping(false);
        else dispatchTyped({ type: "SELECT_CLIP", payload: null });
      } else if (e.key.toLowerCase() === "c" && !meta && state.selectedClipIds.length) {
        const sel = state.clips.find((c) => state.selectedClipIds.includes(c.id));
        if (sel && (sel.mediaType === "video" || sel.mediaType === "image")) {
          e.preventDefault();
          setIsCropping((v) => !v);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.selectedClipIds, state.currentTime, state.duration, state.zoom, dispatchTyped]);

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      <Toolbar
        state={state}
        dispatch={dispatchTyped}
        canUndo={root.past.length > 0}
        canRedo={root.future.length > 0}
        canvasZoom={canvasZoom}
        onCanvasZoomChange={setCanvasZoom}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <MediaPanel state={state} dispatch={dispatchTyped} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden bg-neutral-600">
            <Canvas state={state} dispatch={dispatchTyped} canvasZoom={canvasZoom} onCanvasZoomChange={setCanvasZoom} isCropping={isCropping} onCroppingChange={setIsCropping} />
          </div>

          <div className="flex flex-col border-t border-border bg-card" style={{ height: 320 }}>
            <AIInstructionBar state={state} dispatch={dispatchTyped} />
            <Timeline state={state} dispatch={dispatchTyped} />
          </div>
        </div>

        <PropertiesInspector state={state} dispatch={dispatchTyped} isCropping={isCropping} onCroppingChange={setIsCropping} />
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Editor />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
