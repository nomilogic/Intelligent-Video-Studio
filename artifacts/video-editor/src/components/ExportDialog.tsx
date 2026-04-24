import { useState } from "react";
import { Download, X, Loader2, Music, Video, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { EditorState } from "../lib/types";
import {
  Resolution, ExportFormat, ExportConfig, ExportStatus, computeScale, FPS,
} from "../hooks/use-export";

interface ExportDialogProps {
  state: EditorState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportStatus: ExportStatus;
  onStart: (config: ExportConfig) => void;
  onAudioExport: () => void;
  onCancel: () => void;
  onReset: () => void;
}

export default function ExportDialog({
  state, open, onOpenChange,
  exportStatus, onStart, onAudioExport, onCancel, onReset,
}: ExportDialogProps) {
  const [resolution, setResolution] = useState<Resolution>("full");
  const [format, setFormat] = useState<ExportFormat>("webm");

  const isRunning = exportStatus.phase === "loading" || exportStatus.phase === "rendering";

  const W_out = Math.round(state.canvasWidth * computeScale(resolution, state.canvasWidth, state.canvasHeight));
  const H_out = Math.round(state.canvasHeight * computeScale(resolution, state.canvasWidth, state.canvasHeight));

  const resolutionOptions: { value: Resolution; label: string; dims: string }[] = [
    { value: "full", label: "Full Res", dims: `${state.canvasWidth}×${state.canvasHeight}` },
    {
      value: "720p", label: "720p",
      dims: `${Math.round(state.canvasWidth * computeScale("720p", state.canvasWidth, state.canvasHeight))}×${Math.round(state.canvasHeight * computeScale("720p", state.canvasWidth, state.canvasHeight))}`,
    },
    {
      value: "480p", label: "480p",
      dims: `${Math.round(state.canvasWidth * computeScale("480p", state.canvasWidth, state.canvasHeight))}×${Math.round(state.canvasHeight * computeScale("480p", state.canvasWidth, state.canvasHeight))}`,
    },
    { value: "half", label: "Half", dims: `${Math.round(state.canvasWidth * 0.5)}×${Math.round(state.canvasHeight * 0.5)}` },
  ];

  const videoFormatOptions: { value: ExportFormat; label: string; desc: string }[] = [
    { value: "webm", label: "WebM", desc: "Best compatibility" },
    { value: "mp4", label: "MP4", desc: "If browser supports" },
  ];

  const handleOpenChange = (v: boolean) => {
    if (!v && isRunning) return; // Prevent closing during export via backdrop/Esc — use Hide button
    onOpenChange(v);
    if (!v) onReset();
  };

  const totalFrames = Math.ceil(state.duration * FPS);
  const currentFrame = Math.round(exportStatus.progress * totalFrames);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
        </DialogHeader>

        {/* Idle: show configuration */}
        {exportStatus.phase === "idle" && (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Duration</span>
                <span className="tabular-nums font-medium text-foreground">{state.duration.toFixed(1)}s</span>
              </div>
              <div className="flex justify-between">
                <span>Clips</span>
                <span className="tabular-nums font-medium text-foreground">{state.clips.length}</span>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Export Type</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs transition-colors ${format !== "audio" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}
                  onClick={() => setFormat(format === "mp4" ? "mp4" : "webm")}
                >
                  <Video className="w-3.5 h-3.5 shrink-0" />
                  <span>Video</span>
                </button>
                <button
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs transition-colors ${format === "audio" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}
                  onClick={() => setFormat("audio")}
                >
                  <Music className="w-3.5 h-3.5 shrink-0" />
                  <span>Audio Only</span>
                </button>
              </div>
            </div>

            {format !== "audio" && (
              <>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Resolution</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {resolutionOptions.map((r) => (
                      <button
                        key={r.value}
                        className={`px-2 py-1.5 rounded-md border text-left text-[10px] transition-colors ${resolution === r.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"}`}
                        onClick={() => setResolution(r.value)}
                      >
                        <div className={`font-medium ${resolution === r.value ? "text-primary" : "text-foreground"}`}>{r.label}</div>
                        <div className="text-muted-foreground tabular-nums">{r.dims}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Format</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {videoFormatOptions.map((f) => (
                      <button
                        key={f.value}
                        className={`px-2 py-1.5 rounded-md border text-left text-[10px] transition-colors ${format === f.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"}`}
                        onClick={() => setFormat(f.value)}
                      >
                        <div className={`font-medium ${format === f.value ? "text-primary" : "text-foreground"}`}>{f.label}</div>
                        <div className="text-muted-foreground">{f.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <Button className="w-full gap-2" onClick={() => onStart({ resolution, format })}>
                  <Download className="w-3.5 h-3.5" />
                  Export {W_out}×{H_out} · {format.toUpperCase()}
                </Button>
              </>
            )}

            {format === "audio" && (
              <>
                <div className="text-xs text-muted-foreground bg-muted/20 rounded-md p-2.5 leading-relaxed">
                  Exports all audio and video tracks mixed together as a WebM/Opus audio file.
                  Runs in real time — takes the same duration as your video.
                </div>
                <Button className="w-full gap-2" onClick={onAudioExport}>
                  <Music className="w-3.5 h-3.5" />
                  Export Audio ({state.duration.toFixed(1)}s)
                </Button>
              </>
            )}

            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Video export renders frame-by-frame. The file downloads automatically when done.
            </p>
          </div>
        )}

        {/* Loading / Rendering */}
        {(exportStatus.phase === "loading" || exportStatus.phase === "rendering") && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {exportStatus.phase === "loading"
                    ? "Loading media assets…"
                    : format === "audio" ? "Recording audio…" : "Rendering frames…"}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {exportStatus.phase === "rendering" && format !== "audio"
                    ? `${Math.round(exportStatus.progress * 100)}% · Frame ${currentFrame} / ${totalFrames}`
                    : exportStatus.phase === "rendering" && format === "audio"
                      ? `${Math.round(exportStatus.progress * 100)}% · ${(exportStatus.progress * state.duration).toFixed(1)}s / ${state.duration.toFixed(1)}s`
                      : "Preloading video & image clips…"}
                </p>
              </div>
            </div>

            <Progress value={exportStatus.progress * 100} className="h-2" />

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => onOpenChange(false)}
                title="Close this window — the export continues in the background"
              >
                <EyeOff className="w-3 h-3" />
                Hide
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={onCancel}>
                <X className="w-3 h-3" />
                Cancel
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              You can hide this panel — the export will continue in the background.
            </p>
          </div>
        )}

        {/* Done */}
        {exportStatus.phase === "done" && (
          <div className="space-y-3 text-center py-2">
            <div className="text-2xl">✅</div>
            <p className="text-sm font-medium">Export complete!</p>
            {exportStatus.downloadedFile && (
              <p className="text-xs text-muted-foreground font-mono break-all">{exportStatus.downloadedFile}</p>
            )}
            <Button variant="outline" size="sm" className="w-full" onClick={onReset}>
              Export again
            </Button>
          </div>
        )}

        {/* Error */}
        {exportStatus.phase === "error" && (
          <div className="space-y-3 text-center py-2">
            <div className="text-2xl">⚠️</div>
            <p className="text-sm font-medium text-destructive">Export failed</p>
            <p className="text-xs text-muted-foreground font-mono break-all">{exportStatus.errorMsg}</p>
            <Button variant="outline" size="sm" className="w-full" onClick={onReset}>
              Try again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
