import { useState, useRef, useCallback } from "react";
import { Download, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { EditorState, Clip } from "../lib/types";
import { resolveClip, clipVisibleAt } from "../lib/animation";

const FPS = 30;
const FRAME_MS = 1000 / FPS;

function buildCanvasFilter(filterCss: string): string {
  return filterCss || "none";
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

async function seekVideo(vid: HTMLVideoElement, time: number) {
  if (Math.abs(vid.currentTime - time) < 0.05) return;
  vid.currentTime = Math.max(0, time);
  await new Promise<void>((resolve) => {
    const onSeeked = () => { vid.removeEventListener("seeked", onSeeked); resolve(); };
    vid.addEventListener("seeked", onSeeked);
    setTimeout(resolve, 600);
  });
}

function drawClipToCanvas(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  resolved: ReturnType<typeof resolveClip>,
  mediaEl: HTMLVideoElement | HTMLImageElement | null,
  W: number,
  H: number,
) {
  ctx.save();

  ctx.globalAlpha = Math.max(0, Math.min(1, resolved.opacity));
  ctx.globalCompositeOperation = (clip.blendMode || "normal") as GlobalCompositeOperation;

  const filterStr = buildCanvasFilter(resolved.filterCss);
  if (filterStr !== "none") ctx.filter = filterStr;

  const px = resolved.x * W;
  const py = resolved.y * H;
  const pw = resolved.width * W;
  const ph = resolved.height * H;
  const cx = px + pw / 2;
  const cy = py + ph / 2;

  ctx.translate(cx + resolved.translateX * pw / 100, cy + resolved.translateY * ph / 100);
  ctx.rotate(((resolved.rotation || 0) * Math.PI) / 180);

  const sx = (resolved.scale || 1) * (clip.flipH ? -1 : 1);
  const sy = (resolved.scale || 1) * (clip.flipV ? -1 : 1);
  ctx.scale(sx, sy);

  if (clip.borderRadius > 0) {
    roundRectPath(ctx, -pw / 2, -ph / 2, pw, ph, clip.borderRadius);
    ctx.clip();
  }

  if (clip.mediaType === "video" && mediaEl instanceof HTMLVideoElement) {
    const vid = mediaEl;
    const cropX = clip.cropX ?? 0;
    const cropY = clip.cropY ?? 0;
    const cropW = clip.cropWidth ?? 1;
    const cropH = clip.cropHeight ?? 1;
    const sw = vid.videoWidth * cropW;
    const sh = vid.videoHeight * cropH;
    const ssx = vid.videoWidth * cropX;
    const ssy = vid.videoHeight * cropY;
    if (vid.readyState >= 2 && sw > 0 && sh > 0) {
      ctx.drawImage(vid, ssx, ssy, sw, sh, -pw / 2, -ph / 2, pw, ph);
    } else {
      ctx.fillStyle = clip.color || "#1a1a2e";
      ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    }
  } else if (clip.mediaType === "image" && mediaEl instanceof HTMLImageElement) {
    const cropX = clip.cropX ?? 0;
    const cropY = clip.cropY ?? 0;
    const cropW = clip.cropWidth ?? 1;
    const cropH = clip.cropHeight ?? 1;
    const sw = mediaEl.naturalWidth * cropW;
    const sh = mediaEl.naturalHeight * cropH;
    const ssx = mediaEl.naturalWidth * cropX;
    const ssy = mediaEl.naturalHeight * cropY;
    if (sw > 0 && sh > 0) {
      ctx.drawImage(mediaEl, ssx, ssy, sw, sh, -pw / 2, -ph / 2, pw, ph);
    }
  } else if (clip.mediaType === "text") {
    const ts = clip.textStyle!;
    const fontSize = ts.fontSize || 64;
    const fontStyle = ts.italic ? "italic " : "";
    ctx.font = `${fontStyle}${ts.fontWeight || 700} ${fontSize}px ${ts.fontFamily || "sans-serif"}`;
    ctx.textAlign = (ts.align || "center") as CanvasTextAlign;
    ctx.textBaseline = "middle";

    const lines = (clip.text || "").split("\n");
    const lineH = fontSize * 1.2;
    const totalH = lines.length * lineH;

    if (ts.background && ts.background !== "transparent") {
      ctx.save();
      ctx.font = `${fontStyle}${ts.fontWeight || 700} ${fontSize}px ${ts.fontFamily || "sans-serif"}`;
      const maxW = Math.max(...lines.map((l) => ctx.measureText(l).width));
      const pad = fontSize * 0.3;
      ctx.fillStyle = ts.background;
      ctx.fillRect(-maxW / 2 - pad, -totalH / 2 - pad, maxW + pad * 2, totalH + pad * 2);
      ctx.restore();
    }

    ctx.fillStyle = ts.color || "#ffffff";
    if (ts.shadow) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = "rgba(0,0,0,0.6)";
    }
    if (ts.underline) {
      // Canvas doesn't support underline natively; skip for now
    }

    lines.forEach((line, i) => {
      const lineY = (i - (lines.length - 1) / 2) * lineH;
      ctx.fillText(line, 0, lineY);
    });
  } else {
    ctx.fillStyle = clip.color || "#3b82f6";
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = `600 ${Math.max(12, Math.min(pw * 0.08, 24))}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(clip.label, 0, 0);
  }

  ctx.restore();
}

interface ExportState {
  phase: "idle" | "loading" | "rendering" | "done" | "error";
  progress: number;
  errorMsg?: string;
}

interface ExportDialogProps {
  state: EditorState;
}

export default function ExportDialog({ state }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [exportState, setExportState] = useState<ExportState>({ phase: "idle", progress: 0 });
  const cancelRef = useRef(false);

  const runExport = useCallback(
    async (scale: number) => {
      cancelRef.current = false;
      setExportState({ phase: "loading", progress: 0 });

      try {
        const W = Math.round(state.canvasWidth * scale);
        const H = Math.round(state.canvasHeight * scale);
        const TOTAL = state.duration;
        const TOTAL_FRAMES = Math.ceil(TOTAL * FPS);

        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d")!;

        // Preload all media assets
        const videoEls = new Map<string, HTMLVideoElement>();
        const imageEls = new Map<string, HTMLImageElement>();

        await Promise.all(
          state.clips.map(async (clip) => {
            if (!clip.src) return;
            if (clip.mediaType === "video") {
              const v = document.createElement("video");
              v.src = clip.src;
              v.crossOrigin = "anonymous";
              v.preload = "auto";
              v.muted = true;
              await new Promise<void>((resolve) => {
                v.onloadeddata = () => resolve();
                v.onerror = () => resolve();
                setTimeout(resolve, 5000);
                v.load();
              });
              videoEls.set(clip.id, v);
            } else if (clip.mediaType === "image") {
              const img = new Image();
              img.crossOrigin = "anonymous";
              await new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
                img.src = clip.src!;
              });
              imageEls.set(clip.id, img);
            }
          }),
        );

        if (cancelRef.current) {
          setExportState({ phase: "idle", progress: 0 });
          return;
        }

        // Pick best supported mime
        const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find(
          (m) => MediaRecorder.isTypeSupported(m),
        ) ?? "video/webm";

        const stream = canvas.captureStream(FPS);
        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 8_000_000,
        });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        recorder.start(200);

        setExportState({ phase: "rendering", progress: 0 });

        // Sort clips by trackIndex descending so higher-index draws last (behind lower-index)
        const sortedClips = [...state.clips].sort((a, b) => b.trackIndex - a.trackIndex);

        // Track which videos are currently playing
        const playingVideos = new Set<string>();

        for (let frame = 0; frame <= TOTAL_FRAMES; frame++) {
          if (cancelRef.current) break;

          const time = frame / FPS;

          // Background
          ctx.clearRect(0, 0, W, H);
          ctx.fillStyle = state.background || "#000000";
          ctx.fillRect(0, 0, W, H);

          // Manage video playback — seek/play/pause as clips enter and exit
          for (const clip of sortedClips) {
            if (clip.mediaType !== "video") continue;
            const vid = videoEls.get(clip.id);
            if (!vid) continue;

            const visible = clipVisibleAt(clip, time) && !clip.hidden;
            const resolved = resolveClip(clip, state.keyframes, time);

            if (visible) {
              const targetVT = resolved.videoTime;
              if (!playingVideos.has(clip.id)) {
                // First frame this clip is visible — seek to correct position
                await seekVideo(vid, targetVT);
                vid.play().catch(() => {});
                playingVideos.add(clip.id);
              } else {
                // Drift correction: if we're more than 0.15s off, re-seek
                const drift = Math.abs(vid.currentTime - targetVT);
                if (drift > 0.15) {
                  await seekVideo(vid, targetVT);
                }
              }
            } else {
              if (playingVideos.has(clip.id)) {
                vid.pause();
                playingVideos.delete(clip.id);
              }
            }
          }

          // Render clips
          for (const clip of sortedClips) {
            if (clip.hidden) continue;
            const resolved = resolveClip(clip, state.keyframes, time);
            if (!resolved.visible) continue;

            const mediaEl =
              clip.mediaType === "video"
                ? (videoEls.get(clip.id) ?? null)
                : clip.mediaType === "image"
                  ? (imageEls.get(clip.id) ?? null)
                  : null;

            drawClipToCanvas(ctx, clip, resolved, mediaEl, W, H);
          }

          setExportState({ phase: "rendering", progress: frame / TOTAL_FRAMES });

          // Throttle to FPS so MediaRecorder captures each frame
          await new Promise<void>((resolve) => setTimeout(resolve, FRAME_MS));
        }

        // Stop all video elements
        for (const vid of videoEls.values()) vid.pause();

        recorder.stop();
        await new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
        });

        if (cancelRef.current) {
          setExportState({ phase: "idle", progress: 0 });
          return;
        }

        const blob = new Blob(chunks, { type: mimeType.split(";")[0] });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `export-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 30_000);

        setExportState({ phase: "done", progress: 1 });
      } catch (err: any) {
        console.error("Export error:", err);
        setExportState({ phase: "error", progress: 0, errorMsg: err?.message ?? String(err) });
      }
    },
    [state],
  );

  const cancel = () => {
    cancelRef.current = true;
    setExportState({ phase: "idle", progress: 0 });
  };

  const reset = () => setExportState({ phase: "idle", progress: 0 });

  const isRunning = exportState.phase === "loading" || exportState.phase === "rendering";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && isRunning) return;
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="h-8 gap-1.5 text-xs bg-primary">
          <Download className="w-3 h-3" />
          Export
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Export Video</DialogTitle>
        </DialogHeader>

        {exportState.phase === "idle" && (
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
              <div className="flex justify-between">
                <span>Format</span>
                <span className="font-medium text-foreground">WebM (browser-encoded)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                Full Resolution — {state.canvasWidth}×{state.canvasHeight}
              </div>
              <Button className="w-full gap-2" onClick={() => runExport(1)}>
                <Download className="w-3.5 h-3.5" />
                Export {state.canvasWidth}×{state.canvasHeight}
              </Button>
              <Button variant="outline" className="w-full gap-2 text-xs" onClick={() => runExport(0.5)}>
                <Download className="w-3.5 h-3.5" />
                Export Half-Res {Math.round(state.canvasWidth * 0.5)}×{Math.round(state.canvasHeight * 0.5)}
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Export renders your timeline frame-by-frame in the browser. The video file will download
              automatically when complete. Export time approximately equals video duration.
            </p>
          </div>
        )}

        {(exportState.phase === "loading" || exportState.phase === "rendering") && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {exportState.phase === "loading" ? "Loading media assets…" : "Rendering frames…"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {exportState.phase === "rendering"
                    ? `${Math.round(exportState.progress * 100)}% · Frame ${Math.round(exportState.progress * Math.ceil(state.duration * FPS))} / ${Math.ceil(state.duration * FPS)}`
                    : "Preloading video & image clips"}
                </p>
              </div>
            </div>

            <Progress value={exportState.progress * 100} className="h-2" />

            <Button variant="outline" size="sm" className="w-full gap-2" onClick={cancel}>
              <X className="w-3 h-3" /> Cancel
            </Button>
          </div>
        )}

        {exportState.phase === "done" && (
          <div className="space-y-3 text-center py-2">
            <div className="text-2xl">✅</div>
            <p className="text-sm font-medium">Export complete!</p>
            <p className="text-xs text-muted-foreground">Your .webm file has been downloaded.</p>
            <Button variant="outline" size="sm" className="w-full" onClick={reset}>
              Export again
            </Button>
          </div>
        )}

        {exportState.phase === "error" && (
          <div className="space-y-3 text-center py-2">
            <div className="text-2xl">⚠️</div>
            <p className="text-sm font-medium text-destructive">Export failed</p>
            <p className="text-xs text-muted-foreground font-mono break-all">{exportState.errorMsg}</p>
            <Button variant="outline" size="sm" className="w-full" onClick={reset}>
              Try again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
