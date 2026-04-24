import { useEffect, useState } from "react";
import { Undo2, Redo2, Save, ZoomIn, ZoomOut, Film, Loader2, Keyboard, Settings2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { EditorState, EditorAction } from "../lib/types";
import { useUpdateProject } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useExport } from "../hooks/use-export";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import ExportDialog from "./ExportDialog";

interface ToolbarProps {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  projectId?: number;
  canUndo: boolean;
  canRedo: boolean;
  canvasZoom: number;
  onCanvasZoomChange: (z: number) => void;
}

const SHORTCUTS: [string, string][] = [
  ["Space", "Play / Pause"],
  ["S", "Split selected at playhead"],
  ["Delete / Backspace", "Delete selected clips"],
  ["Cmd/Ctrl + Z", "Undo"],
  ["Cmd/Ctrl + Shift + Z", "Redo"],
  ["Cmd/Ctrl + D", "Duplicate selected"],
  ["+ / -", "Timeline zoom in/out"],
  ["←  /  →", "Step one frame"],
  ["Home / End", "Jump to start / end"],
  ["Shift + drag", "Resize keeping ratio"],
  ["Shift + click clip", "Multi-select"],
  ["M", "Add marker at playhead"],
  ["B", "Blade / cut tool"],
  ["V", "Select tool"],
];

const FPS_OPTIONS = [24, 25, 30, 50, 60];

export default function Toolbar({ state, dispatch, projectId, canUndo, canRedo, canvasZoom, onCanvasZoomChange }: ToolbarProps) {
  const { toast } = useToast();
  const updateProject = useUpdateProject();
  const [projectName, setProjectName] = useState("Untitled Project");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const { exportStatus, startVideoExport, startAudioExport, cancel, reset } = useExport(state);

  const isExporting = exportStatus.phase === "loading" || exportStatus.phase === "rendering";
  const exportingInBackground = isExporting && !exportDialogOpen;

  // Fire toast when export completes (whether dialog is visible or not)
  useEffect(() => {
    if (exportStatus.phase === "done") {
      toast({
        title: "Export complete!",
        description: exportStatus.downloadedFile
          ? `Downloaded: ${exportStatus.downloadedFile}`
          : "Your file has been downloaded.",
      });
    } else if (exportStatus.phase === "error") {
      toast({
        title: "Export failed",
        description: exportStatus.errorMsg ?? "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  }, [exportStatus.phase]);

  const handleSave = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);

    if (projectId) {
      updateProject.mutate(
        { id: projectId, data: { state: JSON.stringify(state), duration: state.duration } },
        {
          onSuccess: () => toast({ title: "Project saved" }),
          onError: () => toast({ title: "Save failed", variant: "destructive" }),
        },
      );
    } else {
      toast({ title: "Project exported", description: "Saved as JSON to your downloads." });
    }
  };

  return (
    <>
      <div data-testid="toolbar" className="h-12 flex items-center gap-1 px-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2 mr-2">
          <Film className="w-5 h-5 text-primary" />
          <span className="text-sm font-bold text-foreground tracking-tight">VideoAI</span>
        </div>

        <Separator orientation="vertical" className="h-6" />

        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="text-sm bg-transparent border-none focus:outline-none focus:ring-0 px-2 py-1 rounded hover:bg-muted/30 max-w-[200px]"
        />

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          data-testid="button-undo"
          title="Undo (Cmd/Ctrl+Z)"
          disabled={!canUndo}
          onClick={() => dispatch({ type: "UNDO" })}
        >
          <Undo2 className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          data-testid="button-redo"
          title="Redo (Cmd/Ctrl+Shift+Z)"
          disabled={!canRedo}
          onClick={() => dispatch({ type: "REDO" })}
        >
          <Redo2 className="w-4 h-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => onCanvasZoomChange(Math.max(0.1, parseFloat((canvasZoom - 0.25).toFixed(2))))}
          data-testid="button-zoom-out"
          title="Zoom canvas out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>

        <button
          className="text-xs text-muted-foreground w-12 text-center tabular-nums hover:text-foreground hover:bg-muted/30 rounded px-1 py-0.5"
          title="Reset canvas zoom to 100%"
          onClick={() => onCanvasZoomChange(1)}
        >
          {Math.round(canvasZoom * 100)}%
        </button>

        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => onCanvasZoomChange(Math.min(4, parseFloat((canvasZoom + 0.25).toFixed(2))))}
          data-testid="button-zoom-in"
          title="Zoom canvas in"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <span className="text-[10px] text-muted-foreground hidden md:inline">
          {state.canvasWidth}×{state.canvasHeight} · {state.clips.length} clips · {state.duration.toFixed(1)}s
        </span>

        <div className="flex-1" />

        {/* Background export progress pill — shown when dialog is hidden */}
        {exportingInBackground && (
          <button
            className="flex items-center gap-2 px-3 h-7 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs hover:bg-primary/25 transition-colors"
            onClick={() => setExportDialogOpen(true)}
            title="Click to view export progress"
          >
            <Loader2 className="w-3 h-3 animate-spin shrink-0" />
            <span className="hidden sm:inline">Exporting</span>
            <span className="tabular-nums font-medium">{Math.round(exportStatus.progress * 100)}%</span>
            <div className="w-16 hidden md:block">
              <Progress value={exportStatus.progress * 100} className="h-1.5" />
            </div>
          </button>
        )}

        {/* Keyboard Shortcuts */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8" title="Keyboard shortcuts">
              <Keyboard className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Keyboard Shortcuts</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5">
              {SHORTCUTS.map(([k, d]) => (
                <div key={k} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <span className="text-muted-foreground">{d}</span>
                  <kbd className="px-2 py-0.5 text-xs bg-muted rounded font-mono">{k}</kbd>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Project Settings */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8" title="Project settings">
              <Settings2 className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Project Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Project Name</Label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="Untitled Project"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Canvas Resolution</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Width</Label>
                    <Input
                      type="number"
                      value={state.canvasWidth}
                      onChange={(e) =>
                        dispatch({
                          type: "SET_CANVAS_SIZE",
                          payload: { width: parseInt(e.target.value) || 1920, height: state.canvasHeight },
                        })
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Height</Label>
                    <Input
                      type="number"
                      value={state.canvasHeight}
                      onChange={(e) =>
                        dispatch({
                          type: "SET_CANVAS_SIZE",
                          payload: { width: state.canvasWidth, height: parseInt(e.target.value) || 1080 },
                        })
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Frame Rate</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {FPS_OPTIONS.map((fps) => {
                    const active = (state as any).fps === fps || (!((state as any).fps) && fps === 30);
                    return (
                      <Button
                        key={fps}
                        variant={active ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 text-xs px-3"
                        onClick={() => dispatch({ type: "SET_FPS" as any, payload: fps })}
                      >
                        {fps} fps
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Duration</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step={0.5}
                    value={state.duration}
                    onChange={(e) =>
                      dispatch({ type: "SET_DURATION", payload: parseFloat(e.target.value) || 30 })
                    }
                    className="h-7 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">seconds</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Background Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={state.background}
                    onChange={(e) => dispatch({ type: "SET_BACKGROUND", payload: e.target.value })}
                    className="h-8 w-12 bg-transparent border border-border rounded cursor-pointer"
                  />
                  <span className="text-xs font-mono text-muted-foreground">{state.background}</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={updateProject.isPending}
          className="h-8 gap-1.5 text-xs"
          data-testid="button-save"
        >
          {updateProject.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save
        </Button>

        {/* Export button — opens the managed export dialog */}
        <Button
          variant="default"
          size="sm"
          className="h-8 gap-1.5 text-xs bg-primary"
          onClick={() => setExportDialogOpen(true)}
        >
          {isExporting
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Download className="w-3 h-3" />}
          Export
        </Button>
      </div>

      {/* Managed export dialog — persists between open/close so background export continues */}
      <ExportDialog
        state={state}
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        exportStatus={exportStatus}
        onStart={startVideoExport}
        onAudioExport={startAudioExport}
        onCancel={cancel}
        onReset={reset}
      />
    </>
  );
}
