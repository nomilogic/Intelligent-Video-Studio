import { useState, useRef, useCallback } from "react";
import { Download, X, Loader2, Music, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { EditorState, Clip } from "../lib/types";
import { resolveClip, clipVisibleAt } from "../lib/animation";

const FPS = 30;
const FRAME_MS = 1000 / FPS;

type Resolution = "full" | "720p" | "480p" | "half";
type ExportFormat = "webm" | "mp4" | "audio";

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
  if (Math.abs(vid.currentTime - time) < 0.001) return;
  vid.currentTime = Math.max(0, time);
  await new Promise<void>((resolve) => {
    const onSeeked = () => { vid.removeEventListener("seeked", onSeeked); resolve(); };
    vid.addEventListener("seeked", onSeeked);
    setTimeout(resolve, 800);
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

function computeScale(resolution: Resolution, canvasW: number, canvasH: number): number {
  if (resolution === "full") return 1;
  if (resolution === "half") return 0.5;
  const target = resolution === "720p" ? 720 : 480;
  // Use shorter dimension as reference so portrait & landscape are consistent
  const shorter = Math.min(canvasW, canvasH);
  return Math.min(1, target / shorter);
}

interface ExportState {
  phase: "idle" | "loading" | "rendering" | "done" | "error";
  progress: number;
  errorMsg?: string;
  downloadedFile?: string;
}

interface ExportDialogProps {
  state: EditorState;
}

export default function ExportDialog({ state }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [exportState, setExportState] = useState<ExportState>({ phase: "idle", progress: 0 });
  const [resolution, setResolution] = useState<Resolution>("full");
  const [format, setFormat] = useState<ExportFormat>("webm");
  const cancelRef = useRef(false);

  const W_out = Math.round(state.canvasWidth * computeScale(resolution, state.canvasWidth, state.canvasHeight));
  const H_out = Math.round(state.canvasHeight * computeScale(resolution, state.canvasWidth, state.canvasHeight));

  const runVideoExport = useCallback(
    async () => {
      cancelRef.current = false;
      setExportState({ phase: "loading", progress: 0 });

      try {
        const scale = computeScale(resolution, state.canvasWidth, state.canvasHeight);
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
                setTimeout(resolve, 8000);
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

        // Determine mime type
        let mimeType: string;
        if (format === "mp4") {
          const mp4Types = ["video/mp4;codecs=avc1", "video/mp4;codecs=h264", "video/mp4"];
          const supported = mp4Types.find((m) => MediaRecorder.isTypeSupported(m));
          if (!supported) {
            throw new Error("MP4 is not supported by this browser. Please use WebM instead.");
          }
          mimeType = supported;
        } else {
          mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find(
            (m) => MediaRecorder.isTypeSupported(m),
          ) ?? "video/webm";
        }

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

        // Sort clips by trackIndex descending so lower-index draws on top
        const sortedClips = [...state.clips].sort((a, b) => b.trackIndex - a.trackIndex);

        for (let frame = 0; frame <= TOTAL_FRAMES; frame++) {
          if (cancelRef.current) break;

          const time = frame / FPS;

          // Background
          ctx.clearRect(0, 0, W, H);
          ctx.fillStyle = state.background || "#000000";
          ctx.fillRect(0, 0, W, H);

          // Seek all visible video clips to exact frame time before drawing
          await Promise.all(
            sortedClips
              .filter((clip) => clip.mediaType === "video" && !clip.hidden)
              .map(async (clip) => {
                const vid = videoEls.get(clip.id);
                if (!vid) return;
                const visible = clipVisibleAt(clip, time);
                if (visible) {
                  const resolved = resolveClip(clip, state.keyframes, time);
                  await seekVideo(vid, resolved.videoTime);
                }
              }),
          );

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

          // Wait one frame interval so MediaRecorder captures this frame
          await new Promise<void>((resolve) => setTimeout(resolve, FRAME_MS));
        }

        for (const vid of videoEls.values()) vid.pause();

        recorder.stop();
        await new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });

        if (cancelRef.current) {
          setExportState({ phase: "idle", progress: 0 });
          return;
        }

        const ext = format === "mp4" ? "mp4" : "webm";
        const baseMime = mimeType.split(";")[0];
        const blob = new Blob(chunks, { type: baseMime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const filename = `export-${Date.now()}.${ext}`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 30_000);

        setExportState({ phase: "done", progress: 1, downloadedFile: filename });
      } catch (err: any) {
        console.error("Export error:", err);
        setExportState({ phase: "error", progress: 0, errorMsg: err?.message ?? String(err) });
      }
    },
    [state, resolution, format],
  );

  const runAudioExport = useCallback(async () => {
    cancelRef.current = false;
    setExportState({ phase: "loading", progress: 0 });

    try {
      const TOTAL = state.duration;

      // Collect all clips that produce audio
      const audibleClips = state.clips.filter(
        (c) => !c.hidden && !c.muted && (c.mediaType === "audio" || c.mediaType === "video") && c.src,
      );

      if (audibleClips.length === 0) {
        throw new Error("No audible clips found in the timeline.");
      }

      // Create an AudioContext with a stream destination for recording
      const audioCtx = new AudioContext();
      const destination = audioCtx.createMediaStreamDestination();

      // Create media elements and connect them
      const mediaEls: Array<{ el: HTMLMediaElement; clip: Clip }> = [];

      await Promise.all(
        audibleClips.map(async (clip) => {
          const el = clip.mediaType === "video"
            ? document.createElement("video")
            : document.createElement("audio");
          el.src = clip.src!;
          el.preload = "auto";
          el.crossOrigin = "anonymous";

          await new Promise<void>((resolve) => {
            el.onloadeddata = () => resolve();
            el.onerror = () => resolve();
            setTimeout(resolve, 8000);
            el.load();
          });

          try {
            const src = audioCtx.createMediaElementSource(el);
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = clip.volume ?? 1;
            src.connect(gainNode);
            gainNode.connect(destination);
          } catch {}

          mediaEls.push({ el, clip });
        }),
      );

      // Set up MediaRecorder for audio
      const audioMime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"].find(
        (m) => MediaRecorder.isTypeSupported(m),
      ) ?? "audio/webm";

      const recorder = new MediaRecorder(destination.stream, { mimeType: audioMime });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.start(200);

      setExportState({ phase: "rendering", progress: 0 });

      // Start playback for all clips at the correct start time
      const startWallTime = audioCtx.currentTime;
      for (const { el, clip } of mediaEls) {
        el.currentTime = clip.trimStart ?? 0;
        el.playbackRate = clip.speed ?? 1;
        el.muted = false;
        el.volume = Math.max(0, Math.min(1, clip.volume ?? 1));
        // Schedule play at the clip's startTime offset
        if (clip.startTime <= 0) {
          el.play().catch(() => {});
        } else {
          setTimeout(() => {
            if (!cancelRef.current) el.play().catch(() => {});
          }, clip.startTime * 1000);
        }
      }

      // Monitor progress in real-time
      const startMs = Date.now();
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          const elapsed = (Date.now() - startMs) / 1000;
          const progress = Math.min(elapsed / TOTAL, 1);
          setExportState({ phase: "rendering", progress });
          if (cancelRef.current || elapsed >= TOTAL) {
            clearInterval(interval);
            resolve();
          }
        }, 200);
      });

      // Stop everything
      for (const { el } of mediaEls) { el.pause(); }
      recorder.stop();
      await new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });

      if (cancelRef.current) {
        setExportState({ phase: "idle", progress: 0 });
        return;
      }

      const ext = audioMime.includes("ogg") ? "ogg" : "webm";
      const blob = new Blob(chunks, { type: audioMime.split(";")[0] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = `audio-export-${Date.now()}.${ext}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 30_000);

      audioCtx.close();
      setExportState({ phase: "done", progress: 1, downloadedFile: filename });
    } catch (err: any) {
      console.error("Audio export error:", err);
      setExportState({ phase: "error", progress: 0, errorMsg: err?.message ?? String(err) });
    }
  }, [state]);

  const cancel = () => {
    cancelRef.current = true;
    setExportState({ phase: "idle", progress: 0 });
  };

  const reset = () => setExportState({ phase: "idle", progress: 0 });

  const isRunning = exportState.phase === "loading" || exportState.phase === "rendering";

  const resolutionOptions: { value: Resolution; label: string; dims: string }[] = [
    { value: "full", label: "Full Res", dims: `${state.canvasWidth}×${state.canvasHeight}` },
    { value: "720p", label: "720p", dims: `${Math.round(state.canvasWidth * computeScale("720p", state.canvasWidth, state.canvasHeight))}×${Math.round(state.canvasHeight * computeScale("720p", state.canvasWidth, state.canvasHeight))}` },
    { value: "480p", label: "480p", dims: `${Math.round(state.canvasWidth * computeScale("480p", state.canvasWidth, state.canvasHeight))}×${Math.round(state.canvasHeight * computeScale("480p", state.canvasWidth, state.canvasHeight))}` },
    { value: "half", label: "Half", dims: `${Math.round(state.canvasWidth * 0.5)}×${Math.round(state.canvasHeight * 0.5)}` },
  ];

  const videoFormatOptions: { value: ExportFormat; label: string; desc: string }[] = [
    { value: "webm", label: "WebM", desc: "Best compatibility" },
    { value: "mp4", label: "MP4", desc: "If browser supports" },
  ];

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
          <DialogTitle>Export</DialogTitle>
        </DialogHeader>

        {exportState.phase === "idle" && (
          <div className="space-y-4">
            {/* Info */}
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

            {/* Format tabs */}
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

            {/* Video-specific options */}
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

                <Button className="w-full gap-2" onClick={runVideoExport}>
                  <Download className="w-3.5 h-3.5" />
                  Export {W_out}×{H_out} · {format.toUpperCase()}
                </Button>
              </>
            )}

            {/* Audio export */}
            {format === "audio" && (
              <>
                <div className="text-xs text-muted-foreground space-y-1 bg-muted/20 rounded-md p-2.5">
                  <p>Exports all audio and video clips as a mixed audio file (WebM/Opus). Plays back in real time — takes the same time as your video duration.</p>
                </div>
                <Button className="w-full gap-2" onClick={runAudioExport}>
                  <Music className="w-3.5 h-3.5" />
                  Export Audio ({state.duration.toFixed(1)}s)
                </Button>
              </>
            )}

            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Video export renders frame-by-frame in the browser. The file downloads automatically when complete.
            </p>
          </div>
        )}

        {(exportState.phase === "loading" || exportState.phase === "rendering") && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {exportState.phase === "loading" ? "Loading media assets…" : format === "audio" ? "Recording audio…" : "Rendering frames…"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {exportState.phase === "rendering" && format !== "audio"
                    ? `${Math.round(exportState.progress * 100)}% · Frame ${Math.round(exportState.progress * Math.ceil(state.duration * FPS))} / ${Math.ceil(state.duration * FPS)}`
                    : exportState.phase === "rendering" && format === "audio"
                      ? `${Math.round(exportState.progress * 100)}% · ${(exportState.progress * state.duration).toFixed(1)}s / ${state.duration.toFixed(1)}s`
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
            {exportState.downloadedFile && (
              <p className="text-xs text-muted-foreground font-mono break-all">{exportState.downloadedFile}</p>
            )}
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
