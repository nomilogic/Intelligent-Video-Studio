import { useEffect, useReducer, useRef, useCallback } from "react";
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

  currentTimeRef.current = state.currentTime;
  durationRef.current = state.duration;

  // Playback loop using rAF for smoother updates
  useEffect(() => {
    if (!state.isPlaying) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = currentTimeRef.current + dt;
      if (next >= durationRef.current) {
        dispatch({ type: "SET_PLAYING", payload: false });
        dispatch({ type: "SET_TIME", payload: 0 });
        return;
      }
      dispatch({ type: "SET_TIME", payload: next });
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
        dispatchTyped({ type: "SET_TIME", payload: Math.min(state.duration, state.currentTime + 1) });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        dispatchTyped({ type: "SET_TIME", payload: Math.max(0, state.currentTime - (e.shiftKey ? 1 : 1 / 30)) });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        dispatchTyped({ type: "SET_TIME", payload: Math.min(state.duration, state.currentTime + (e.shiftKey ? 1 : 1 / 30)) });
      } else if (e.key === "Home") {
        e.preventDefault();
        dispatchTyped({ type: "SET_TIME", payload: 0 });
      } else if (e.key === "End") {
        e.preventDefault();
        dispatchTyped({ type: "SET_TIME", payload: state.duration });
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        dispatchTyped({ type: "SET_ZOOM", payload: state.zoom + 0.25 });
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        dispatchTyped({ type: "SET_ZOOM", payload: state.zoom - 0.25 });
      } else if (e.key === "Escape") {
        dispatchTyped({ type: "SELECT_CLIP", payload: null });
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
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <MediaPanel state={state} dispatch={dispatchTyped} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-black/80 to-black/95 p-4 min-h-0 overflow-hidden">
            <Canvas state={state} dispatch={dispatchTyped} />
          </div>

          <div className="flex flex-col border-t border-border bg-card" style={{ height: 320 }}>
            <AIInstructionBar state={state} dispatch={dispatchTyped} />
            <Timeline state={state} dispatch={dispatchTyped} />
          </div>
        </div>

        <PropertiesInspector state={state} dispatch={dispatchTyped} />
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
