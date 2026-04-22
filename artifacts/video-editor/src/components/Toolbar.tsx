import { Undo2, Redo2, Save, Download, ZoomIn, ZoomOut, Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EditorState, EditorAction } from "../lib/types";
import { useUpdateProject } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ToolbarProps {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  projectId?: number;
}

export default function Toolbar({ state, dispatch, projectId }: ToolbarProps) {
  const { toast } = useToast();
  const updateProject = useUpdateProject();
  const [projectName] = useState("Untitled Project");
  const [zoom, setZoom] = useState(100);

  const handleSave = () => {
    if (!projectId) {
      toast({ title: "Project saved locally", description: "No remote project linked." });
      return;
    }
    updateProject.mutate(
      { id: projectId, data: { state: JSON.stringify(state), duration: state.duration } },
      {
        onSuccess: () => toast({ title: "Project saved" }),
        onError: () => toast({ title: "Save failed", variant: "destructive" }),
      }
    );
  };

  return (
    <div
      data-testid="toolbar"
      className="h-12 flex items-center gap-2 px-4 border-b border-border bg-card shrink-0"
    >
      <div className="flex items-center gap-2 mr-3">
        <Film className="w-5 h-5 text-primary" />
        <span className="text-sm font-semibold text-foreground tracking-tight">VideoAI</span>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <span className="text-sm text-muted-foreground font-medium mr-2">{projectName}</span>

      <Separator orientation="vertical" className="h-6" />

      <Button
        variant="ghost"
        size="icon"
        className="w-8 h-8"
        data-testid="button-undo"
        title="Undo"
        disabled
      >
        <Undo2 className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="w-8 h-8"
        data-testid="button-redo"
        title="Redo"
        disabled
      >
        <Redo2 className="w-4 h-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      <Button
        variant="ghost"
        size="icon"
        className="w-8 h-8"
        onClick={() => setZoom(z => Math.max(25, z - 25))}
        data-testid="button-zoom-out"
        title="Zoom Out"
      >
        <ZoomOut className="w-4 h-4" />
      </Button>

      <span className="text-xs text-muted-foreground w-10 text-center tabular-nums">{zoom}%</span>

      <Button
        variant="ghost"
        size="icon"
        className="w-8 h-8"
        onClick={() => setZoom(z => Math.min(200, z + 25))}
        data-testid="button-zoom-in"
        title="Zoom In"
      >
        <ZoomIn className="w-4 h-4" />
      </Button>

      <div className="flex-1" />

      <Button
        variant="outline"
        size="sm"
        onClick={handleSave}
        disabled={updateProject.isPending}
        className="h-8 gap-2 text-xs"
        data-testid="button-save"
      >
        {updateProject.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
        Save
      </Button>

      <Button
        variant="default"
        size="sm"
        className="h-8 gap-2 text-xs bg-primary"
        data-testid="button-export"
        disabled
        title="Export (coming soon)"
      >
        <Download className="w-3 h-3" />
        Export
      </Button>
    </div>
  );
}
