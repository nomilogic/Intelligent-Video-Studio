import { useEffect, useReducer } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { editorReducer, initialState } from "./lib/reducer";

import Toolbar from "./components/Toolbar";
import MediaPanel from "./components/MediaPanel";
import Canvas from "./components/Canvas";
import PropertiesInspector from "./components/PropertiesInspector";
import Timeline from "./components/Timeline";
import AIInstructionBar from "./components/AIInstructionBar";

const queryClient = new QueryClient();

function Editor() {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  useEffect(() => {
    if (!state.isPlaying) return;

    const startTime = Date.now();
    const startCurrentTime = state.currentTime;

    const interval = window.setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const newTime = startCurrentTime + elapsed;
      if (newTime >= state.duration) {
        dispatch({ type: "TOGGLE_PLAY" });
        dispatch({ type: "SET_TIME", payload: 0 });
        clearInterval(interval);
      } else {
        dispatch({ type: "SET_TIME", payload: newTime });
      }
    }, 50);

    return () => clearInterval(interval);
  }, [state.isPlaying]);

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      <Toolbar state={state} dispatch={dispatch} />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <MediaPanel state={state} dispatch={dispatch} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 flex items-center justify-center bg-black/60 p-4 min-h-0">
            <Canvas state={state} dispatch={dispatch} />
          </div>

          <div className="flex flex-col border-t border-border bg-card" style={{ height: 280 }}>
            <AIInstructionBar state={state} dispatch={dispatch} />
            <Timeline state={state} dispatch={dispatch} />
          </div>
        </div>

        <PropertiesInspector state={state} dispatch={dispatch} />
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
