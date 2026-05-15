import { useEffect, useRef, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Plus, Trash2, RefreshCw, Film, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { Clip, EditorAction, FrameBreakFrame } from "@/lib/types";

interface FrameEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clip: Clip | null;
  fps?: number;
  dispatch: React.Dispatch<EditorAction>;
}

interface ExtractedFrame {
  index: number;
  src: string;
  time: number;
  custom?: string;
}

export function FrameEditor({ open, onOpenChange, clip, fps = 24, dispatch }: FrameEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [extracting, setExtracting] = useState(false);
  const [displayFps, setDisplayFps] = useState(fps);
  const [zoom, setZoom] = useState(1);
  const [drawMode, setDrawMode] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalFrames = clip ? Math.ceil(clip.duration * displayFps) : 0;

  const extractFrame = useCallback(async (video: HTMLVideoElement, time: number): Promise<string> => {
    return new Promise((resolve) => {
      const cvs = document.createElement("canvas");
      cvs.width = video.videoWidth || 320;
      cvs.height = video.videoHeight || 240;
      const ctx = cvs.getContext("2d");
      video.currentTime = time;
      video.onseeked = () => {
        ctx?.drawImage(video, 0, 0);
        resolve(cvs.toDataURL("image/jpeg", 0.85));
      };
    });
  }, []);

  const extractFrames = useCallback(async () => {
    if (!clip?.src || !videoRef.current) return;
    setExtracting(true);
    const video = videoRef.current;
    const count = Math.min(Math.ceil(clip.duration * displayFps), 120);
    setFrameCount(count);
    const extracted: ExtractedFrame[] = [];
    for (let i = 0; i < count; i++) {
      const time = (clip.trimStart ?? 0) + (i / displayFps);
      try {
        const src = await extractFrame(video, time);
        const custom = clip.frameBreakFrames?.find((f) => f.frameIndex === i)?.src;
        extracted.push({ index: i, src, time, custom });
      } catch {
        extracted.push({ index: i, src: "", time, custom: undefined });
      }
    }
    setFrames(extracted);
    setExtracting(false);
  }, [clip, displayFps, extractFrame]);

  useEffect(() => {
    if (open && clip?.src && clip.mediaType === "video") {
      if (videoRef.current) videoRef.current.src = clip.src;
    }
    if (open && clip) {
      const count = Math.min(Math.ceil((clip.duration || 1) * displayFps), 120);
      const mockFrames: ExtractedFrame[] = Array.from({ length: count }, (_, i) => ({
        index: i,
        src: "",
        time: (clip.trimStart ?? 0) + i / displayFps,
        custom: clip.frameBreakFrames?.find((f) => f.frameIndex === i)?.src,
      }));
      setFrames(mockFrames);
      setFrameCount(count);
    }
  }, [open, clip, displayFps]);

  const handleReplaceFrame = (file: File, frameIndex: number) => {
    const url = URL.createObjectURL(file);
    const frame: FrameBreakFrame = { frameIndex, src: url };
    dispatch({ type: "UPDATE_FRAME_BREAK_FRAME", payload: { clipId: clip!.id, frame } });
    setFrames((prev) => prev.map((f) => f.index === frameIndex ? { ...f, custom: url } : f));
  };

  const handleResetFrame = (frameIndex: number) => {
    const frame: FrameBreakFrame = { frameIndex, src: undefined };
    dispatch({ type: "UPDATE_FRAME_BREAK_FRAME", payload: { clipId: clip!.id, frame } });
    setFrames((prev) => prev.map((f) => f.index === frameIndex ? { ...f, custom: undefined } : f));
  };

  const currentFrame = frames[selectedFrame];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-4 pt-4 pb-2 shrink-0 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Film className="w-4 h-4 text-primary" />
            Frame Editor — {clip?.label ?? "No clip"}
            <span className="ml-auto text-[10px] text-muted-foreground">{frameCount} frames @ {displayFps}fps</span>
          </DialogTitle>
        </DialogHeader>

        {/* Hidden video for extraction */}
        {clip?.src && <video ref={videoRef} className="hidden" crossOrigin="anonymous" preload="auto" />}
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Frame strip */}
          <div className="w-44 shrink-0 border-r border-border overflow-y-auto bg-muted/10 flex flex-col">
            <div className="p-2 border-b border-border shrink-0 space-y-1">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground flex-1">FPS</span>
                <select
                  value={displayFps}
                  onChange={(e) => setDisplayFps(Number(e.target.value))}
                  className="text-[10px] bg-background border border-border rounded px-1 py-0.5"
                >
                  {[12, 15, 24, 25, 30, 60].map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
              {clip?.src && clip.mediaType === "video" && (
                <Button size="sm" variant="outline" className="w-full h-6 text-[10px] gap-1" onClick={extractFrames} disabled={extracting}>
                  <RefreshCw className={`w-3 h-3 ${extracting ? "animate-spin" : ""}`} />
                  {extracting ? "Extracting…" : "Extract Frames"}
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-0.5 p-1">
              {frames.map((frame) => (
                <button
                  key={frame.index}
                  onClick={() => setSelectedFrame(frame.index)}
                  className={`relative flex-shrink-0 rounded border overflow-hidden transition-all ${
                    frame.index === selectedFrame
                      ? "border-primary ring-1 ring-primary/50"
                      : "border-border hover:border-primary/40"
                  }`}
                  style={{ aspectRatio: "16/9" }}
                >
                  {frame.custom ? (
                    <img src={frame.custom} className="w-full h-full object-cover" alt={`Frame ${frame.index}`} />
                  ) : frame.src ? (
                    <img src={frame.src} className="w-full h-full object-cover" alt={`Frame ${frame.index}`} />
                  ) : (
                    <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                      <span className="text-[8px] text-muted-foreground">{frame.index + 1}</span>
                    </div>
                  )}
                  {frame.custom && (
                    <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-primary rounded-full" />
                  )}
                  <span className="absolute bottom-0 left-0 right-0 text-center text-[8px] bg-black/50 text-white py-0.5">{frame.index + 1}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main view */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Controls */}
            <div className="px-3 py-2 border-b border-border shrink-0 flex items-center gap-2">
              <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setSelectedFrame((p) => Math.max(0, p - 1))} disabled={selectedFrame === 0}>
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span className="text-xs tabular-nums font-medium text-foreground">
                Frame {selectedFrame + 1} / {frameCount}
              </span>
              <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setSelectedFrame((p) => Math.min(frameCount - 1, p + 1))} disabled={selectedFrame >= frameCount - 1}>
                <ChevronRight className="w-3 h-3" />
              </Button>
              {currentFrame?.time !== undefined && (
                <span className="text-[10px] text-muted-foreground">@ {currentFrame.time.toFixed(3)}s</span>
              )}
              <div className="flex-1" />
              <div className="flex items-center gap-1">
                <ZoomOut className="w-3 h-3 text-muted-foreground" />
                <Slider value={[zoom]} min={0.5} max={3} step={0.25} onValueChange={([v]) => setZoom(v)} className="w-16" />
                <ZoomIn className="w-3 h-3 text-muted-foreground" />
              </div>
            </div>

            {/* Frame view */}
            <div className="flex-1 overflow-auto flex items-center justify-center bg-black/30 p-4">
              {currentFrame ? (
                <div style={{ transform: `scale(${zoom})`, transition: "transform 0.15s" }}>
                  {currentFrame.custom ? (
                    <img src={currentFrame.custom} className="max-w-full max-h-full rounded object-contain border border-primary/30" alt="" style={{ maxHeight: 300 }} />
                  ) : currentFrame.src ? (
                    <img src={currentFrame.src} className="max-w-full max-h-full rounded object-contain" alt="" style={{ maxHeight: 300 }} />
                  ) : (
                    <div className="w-64 h-36 bg-muted/30 rounded border border-border flex flex-col items-center justify-center gap-2">
                      <Film className="w-8 h-8 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Frame {selectedFrame + 1}</p>
                      <p className="text-[10px] text-muted-foreground">Click "Extract Frames" to preview</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <Film className="w-12 h-12 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Select a clip with video media</p>
                </div>
              )}
            </div>

            {/* Frame actions */}
            {currentFrame && (
              <div className="px-3 py-2 border-t border-border shrink-0 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="w-3 h-3" /> Replace Frame
                </Button>
                {currentFrame.custom && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-7 text-xs text-destructive border-destructive/30"
                    onClick={() => handleResetFrame(currentFrame.index)}
                  >
                    <Trash2 className="w-3 h-3" /> Reset Frame
                  </Button>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {currentFrame.custom ? "Custom frame override active" : "Using source frame"}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleReplaceFrame(e.target.files[0], currentFrame.index)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border shrink-0 flex items-center gap-2">
          <p className="text-[10px] text-muted-foreground">
            {clip?.frameBreakFrames?.length ?? 0} custom frame overrides. Changes apply to export.
          </p>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs"
            onClick={() => {
              if (clip) dispatch({ type: "SET_FRAME_BREAK", payload: { clipId: clip.id, enabled: true } });
              onOpenChange(false);
            }}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
