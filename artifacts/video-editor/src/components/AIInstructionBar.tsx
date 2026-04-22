import { useProcessInstruction } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2 } from "lucide-react";
import { EditorState, EditorAction } from "../lib/types";
import { useToast } from "@/hooks/use-toast";

export default function AIInstructionBar({ state, dispatch }: { state: EditorState, dispatch: React.Dispatch<EditorAction> }) {
  const [instruction, setInstruction] = useState("");
  const [explanation, setExplanation] = useState<string | null>(null);
  const processInstruction = useProcessInstruction();
  const { toast } = useToast();

  const handleSend = () => {
    if (!instruction.trim()) return;
    
    processInstruction.mutate(
      { data: { instruction, currentState: JSON.stringify(state) } },
      {
        onSuccess: (result) => {
          if (result.operations && result.operations.length > 0) {
            dispatch({ type: 'APPLY_OPERATIONS', payload: result.operations });
            setExplanation(result.explanation);
            setInstruction("");
            toast({
              title: "AI Action Applied",
              description: result.explanation,
            });
          }
        },
        onError: (err) => {
          toast({
            title: "Error processing instruction",
            description: String(err),
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <div className="p-3 border-b border-border bg-muted/20 flex flex-col gap-2">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Input 
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="E.g., 'Make the logo smaller and put it in the top right' or 'Fade in Video 1'"
            className="w-full bg-background border-border pl-10 h-10 text-sm focus-visible:ring-primary"
          />
          <Sparkles className="w-4 h-4 text-primary absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
        <Button 
          onClick={handleSend} 
          disabled={processInstruction.isPending || !instruction.trim()}
          className="w-24 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {processInstruction.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Execute'}
        </Button>
      </div>
      {explanation && (
        <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded border border-border">
          <span className="font-semibold text-primary mr-2">AI:</span>
          {explanation}
        </div>
      )}
    </div>
  );
}