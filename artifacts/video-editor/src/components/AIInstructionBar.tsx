import { useProcessInstruction } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Wand2, ChevronDown, ChevronUp } from "lucide-react";
import { EditorState, EditorAction } from "../lib/types";
import { useToast } from "@/hooks/use-toast";
import { buildAiSchemaMarkdown } from "../lib/ai-schema";

// Cache the schema once — it's static across renders.
const AI_SCHEMA_MD = buildAiSchemaMarkdown();

const QUICK_ACTIONS = [
  { label: "✨ Auto-edit", prompt: "Create a polished, professional edit. Add smooth fade transitions between adjacent clips, subtle zoom-in animation on the first clip, and a fade-out on the last clip. Add a tasteful cinematic color preset to the longest video clip." },
  { label: "🎨 Cinematic look", prompt: "Apply the cinematic preset to all video clips and add a subtle vignette feel by reducing brightness slightly on the edges." },
  { label: "📺 Vintage", prompt: "Apply the vintage filter preset to all clips for a retro film look." },
  { label: "⚫ Black & white", prompt: "Convert all video clips to black and white using the BW preset." },
  { label: "🎬 Add intro title", prompt: "Add a large bold intro title that says 'My Video' at the very start of the timeline, with a fade-in animation." },
  { label: "💫 Smooth transitions", prompt: "Add fade transitions between every pair of adjacent clips on the same track." },
  { label: "🔥 Make it punchy", prompt: "Make the edit more dynamic: increase contrast and saturation slightly on all clips, add zoom-in animations to short clips, and tighten timing where there are gaps." },
  { label: "🐢 Slow-mo last clip", prompt: "Set the last video clip to 0.5x speed for a slow motion effect." },
];

export default function AIInstructionBar({
  state,
  dispatch,
}: {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}) {
  const [instruction, setInstruction] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const processInstruction = useProcessInstruction();
  const { toast } = useToast();

  const send = (prompt: string) => {
    if (!prompt.trim()) return;
    dispatch({
      type: "ADD_AI_MESSAGE",
      payload: { id: `m-${Date.now()}`, role: "user", text: prompt, timestamp: Date.now() },
    });
    // Prepend the schema markdown so the model knows what shapes /
    // effects / transitions / templates / fonts / special layers and
    // reducer actions are available in this build.
    const enriched = `${AI_SCHEMA_MD}\n\n## User instruction\n${prompt}`;
    processInstruction.mutate(
      { data: { instruction: enriched, currentState: JSON.stringify(state) } },
      {
        onSuccess: (result) => {
          if (result.operations && result.operations.length > 0) {
            dispatch({ type: "APPLY_OPERATIONS", payload: result.operations });
          }
          dispatch({
            type: "ADD_AI_MESSAGE",
            payload: {
              id: `m-${Date.now()}-r`,
              role: "assistant",
              text: result.explanation || "Done.",
              timestamp: Date.now(),
            },
          });
          setInstruction("");
          toast({
            title: "AI applied " + (result.operations?.length || 0) + " ops",
            description: result.explanation,
          });
        },
        onError: (err) => {
          dispatch({
            type: "ADD_AI_MESSAGE",
            payload: {
              id: `m-${Date.now()}-e`,
              role: "assistant",
              text: `Error: ${err}`,
              timestamp: Date.now(),
            },
          });
          toast({
            title: "AI request failed",
            description: String(err),
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="border-b border-border bg-gradient-to-b from-muted/30 to-muted/10">
      <div className="p-2 flex flex-col gap-2">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(instruction)}
              placeholder="Tell AI what to do — e.g. 'Make the logo smaller, fade in the title, add a cinematic look'"
              className="w-full bg-background border-border pl-9 h-9 text-sm focus-visible:ring-primary"
              disabled={processInstruction.isPending}
            />
            <Sparkles className="w-4 h-4 text-primary absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <Button
            onClick={() => send(instruction)}
            disabled={processInstruction.isPending || !instruction.trim()}
            className="w-24 shrink-0 h-9 bg-primary"
          >
            {processInstruction.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <><Wand2 className="w-3.5 h-3.5 mr-1.5" /> Run</>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={() => setShowHistory((s) => !s)}
            title="Toggle history"
          >
            {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-thin">
          {QUICK_ACTIONS.map((q) => (
            <button
              key={q.label}
              onClick={() => send(q.prompt)}
              disabled={processInstruction.isPending}
              className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-background border border-border hover:border-primary/60 hover:bg-primary/10 transition-colors text-foreground/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {q.label}
            </button>
          ))}
        </div>

        {showHistory && state.aiHistory.length > 0 && (
          <div className="max-h-32 overflow-y-auto bg-background/50 border border-border rounded p-2 space-y-1.5 text-xs">
            {state.aiHistory.slice(-10).map((m) => (
              <div key={m.id} className="flex gap-2">
                <span className={m.role === "user" ? "text-primary font-semibold" : "text-emerald-400 font-semibold"}>
                  {m.role === "user" ? "You" : "AI"}:
                </span>
                <span className="text-muted-foreground flex-1">{m.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
