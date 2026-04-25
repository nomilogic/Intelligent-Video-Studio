import { useState } from "react";
import { Download, X, Loader2, Music, Video, EyeOff, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { EditorState } from "../lib/types";
import {
  Resolution, ExportFormat, ExportConfig, ExportStatus,
  ExportMode, FpsOption, FPS_OPTIONS, DEFAULT_FPS,
  computeScale,
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
  const [format, setFormat] = useState<ExportFormat>("mp4");
  const [fps, setFps] = useState<FpsOption>(DEFAULT_FPS);
  const [mode, setMode] = useState<ExportMode>("optimized");

  const isRunning = exportStatus.phase === "loading" || exportStatus.phase === "rendering" || exportStatus.phase === "encoding";

  const W_out = Math.round(state.canvasWidth * computeScale(resolution, state.canvasWidth, state.canvasHeight));
  const H_out = Math.round(state.canvasHeight * computeScale(resolution, state.canvasWidth, state.canvasHeight));

  // Helper: build "WxH" string for a Resolution key without repeating
  // the long computeScale boilerplate for every option.
  const dimsFor = (r: Resolution) => {
    const s = computeScale(r, state.canvasWidth, state.canvasHeight);
    return `${Math.round(state.canvasWidth * s)}×${Math.round(state.canvasHeight * s)}`;
  };
  const resolutionOptions: { value: Resolution; label: string; dims: string }[] = [
    { value: "full", label: "Full Res", dims: `${state.canvasWidth}×${state.canvasHeight}` },
    { value: "720p", label: "720p", dims: dimsFor("720p") },
    { value: "480p", label: "480p", dims: dimsFor("480p") },
    { value: "360p", label: "360p", dims: dimsFor("360p") },
    { value: "240p", label: "240p", dims: dimsFor("240p") },
    { value: "144p", label: "144p", dims: dimsFor("144p") },
    { value: "half", label: "Half", dims: dimsFor("half") },
    { value: "quarter", label: "Quarter", dims: dimsFor("quarter") },
  ];

  const videoFormatOptions: { value: ExportFormat; label: string; desc: string }[] = [
    { value: "mp4", label: "MP4", desc: "Universal" },
    { value: "webm", label: "WebM", desc: "Compact" },
    { value: "gif", label: "GIF", desc: "Animated, no audio" },
  ];

  const modeOptions: { value: ExportMode; label: string; desc: string; icon: typeof Zap }[] = [
    { value: "quick", label: "Quick", desc: "Faster, real-time capture", icon: Zap },
    { value: "optimized", label: "Optimized", desc: "Frame-accurate, best quality", icon: Sparkles },
  ];

  const handleOpenChange = (v: boolean) => {
    if (!v && isRunning) return;
    onOpenChange(v);
    if (!v) onReset();
  };

  const totalFrames = Math.ceil(state.duration * fps);
  const currentFrame = Math.round(exportStatus.progress * totalFrames);

  const isAudio = format === "audio";

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
              {!isAudio && (
                <div className="flex justify-between">
                  <span>Frames</span>
                  <span className="tabular-nums font-medium text-foreground">{totalFrames}</span>
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Export Type</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs transition-colors ${!isAudio ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}
                  onClick={() => setFormat(format === "audio" ? "mp4" : format)}
                >
                  <Video className="w-3.5 h-3.5 shrink-0" />
                  <span>Video</span>
                </button>
                <button
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs transition-colors ${isAudio ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}
                  onClick={() => setFormat("audio")}
                >
                  <Music className="w-3.5 h-3.5 shrink-0" />
                  <span>Audio Only</span>
                </button>
              </div>
            </div>

            {!isAudio && (
              <>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Save Mode</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {modeOptions.map((m) => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.value}
                          className={`flex flex-col items-start gap-0.5 px-2 py-2 rounded-md border text-left text-[10px] transition-colors ${mode === m.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"}`}
                          onClick={() => setMode(m.value)}
                        >
                          <div className={`flex items-center gap-1 font-medium ${mode === m.value ? "text-primary" : "text-foreground"}`}>
                            <Icon className="w-3 h-3" />
                            {m.label}
                          </div>
                          <div className="text-muted-foreground leading-tight">{m.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Frame Rate</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {FPS_OPTIONS.map((f) => (
                      <button
                        key={f}
                        className={`px-2 py-1.5 rounded-md border text-center text-[11px] transition-colors ${fps === f ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-foreground hover:bg-muted/40"}`}
                        onClick={() => setFps(f)}
                      >
                        {f} fps
                      </button>
                    ))}
                  </div>
                </div>

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

                <Button className="w-full gap-2" onClick={() => onStart({ resolution, format, fps, mode })}>
                  <Download className="w-3.5 h-3.5" />
                  {mode === "optimized" ? "Optimized Save" : "Quick Save"} · {W_out}×{H_out} · {fps}fps
                </Button>

                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {mode === "optimized"
                    ? "Encodes each frame with an exact timestamp for true frame-rate playback. Needs Chrome or Edge."
                    : "Records the canvas in real time. Wide browser support, but very long videos may pace unevenly."}
                </p>
              </>
            )}

            {isAudio && (
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
          </div>
        )}

        {/* Loading / Rendering / Encoding */}
        {(exportStatus.phase === "loading" || exportStatus.phase === "rendering" || exportStatus.phase === "encoding") && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {exportStatus.phase === "loading"
                    ? "Loading media assets…"
                    : exportStatus.phase === "encoding"
                      ? "Finalizing video file…"
                      : isAudio ? "Recording audio…" : "Rendering frames…"}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {exportStatus.phase === "rendering" && !isAudio
                    ? `${Math.round(exportStatus.progress * 100)}% · Frame ${currentFrame} / ${totalFrames}`
                    : exportStatus.phase === "rendering" && isAudio
                      ? `${Math.round(exportStatus.progress * 100)}% · ${(exportStatus.progress * state.duration).toFixed(1)}s / ${state.duration.toFixed(1)}s`
                      : exportStatus.phase === "encoding"
                        ? "Writing the muxed output…"
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
