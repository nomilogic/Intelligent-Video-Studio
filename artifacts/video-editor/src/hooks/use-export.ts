import { useState, useRef, useCallback } from "react";
import { EditorState, Clip } from "../lib/types";
import { resolveClip, clipVisibleAt } from "../lib/animation";

export const FPS = 30;
export const FRAME_MS = 1000 / FPS;

export type Resolution = "full" | "720p" | "480p" | "half";
export type ExportFormat = "webm" | "mp4" | "audio";

export interface ExportConfig {
  resolution: Resolution;
  format: ExportFormat;
}

export interface ExportStatus {
  phase: "idle" | "loading" | "rendering" | "done" | "error";
  progress: number;
  errorMsg?: string;
  downloadedFile?: string;
}

export function computeScale(resolution: Resolution, canvasW: number, canvasH: number): number {
  if (resolution === "full") return 1;
  if (resolution === "half") return 0.5;
  const target = resolution === "720p" ? 720 : 480;
  const shorter = Math.min(canvasW, canvasH);
  return Math.min(1, target / shorter);
}

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
    if (ts.shadow) { ctx.shadowBlur = 12; ctx.shadowColor = "rgba(0,0,0,0.6)"; }
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

export function useExport(state: EditorState) {
  const [exportStatus, setExportStatus] = useState<ExportStatus>({ phase: "idle", progress: 0 });
  const cancelRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const startVideoExport = useCallback(async (config: ExportConfig) => {
    const s = stateRef.current;
    cancelRef.current = false;
    setExportStatus({ phase: "loading", progress: 0 });

    try {
      const scale = computeScale(config.resolution, s.canvasWidth, s.canvasHeight);
      const W = Math.round(s.canvasWidth * scale);
      const H = Math.round(s.canvasHeight * scale);
      const TOTAL = s.duration;
      const TOTAL_FRAMES = Math.ceil(TOTAL * FPS);

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      const videoEls = new Map<string, HTMLVideoElement>();
      const imageEls = new Map<string, HTMLImageElement>();

      await Promise.all(
        s.clips.map(async (clip) => {
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

      if (cancelRef.current) { setExportStatus({ phase: "idle", progress: 0 }); return; }

      let mimeType: string;
      if (config.format === "mp4") {
        const mp4Types = ["video/mp4;codecs=avc1", "video/mp4;codecs=h264", "video/mp4"];
        const supported = mp4Types.find((m) => MediaRecorder.isTypeSupported(m));
        if (!supported) throw new Error("MP4 is not supported by this browser. Please use WebM instead.");
        mimeType = supported;
      } else {
        mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find(
          (m) => MediaRecorder.isTypeSupported(m),
        ) ?? "video/webm";
      }

      // captureStream(0) = demand mode — no automatic capture.
      // We call videoTrack.requestFrame() explicitly AFTER each confirmed draw,
      // so the recorder never captures mid-seek or stale frames.
      const stream = canvas.captureStream(0);
      const videoTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack & { requestFrame?: () => void };
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.start(200);

      setExportStatus({ phase: "rendering", progress: 0 });

      const sortedClips = [...s.clips].sort((a, b) => b.trackIndex - a.trackIndex);

      // Real-time reference point for pacing. Each frame is pushed at its target
      // real-world time so the output plays back at exactly FPS.
      const exportStartMs = performance.now();

      for (let frame = 0; frame <= TOTAL_FRAMES; frame++) {
        if (cancelRef.current) break;
        const time = frame / FPS;

        // 1. Seek all visible video clips to their exact frame positions.
        //    Sequential per-clip to avoid browser decoder contention.
        for (const clip of sortedClips) {
          if (clip.mediaType !== "video" || clip.hidden) continue;
          const vid = videoEls.get(clip.id);
          if (!vid) continue;
          if (clipVisibleAt(clip, time)) {
            const resolved = resolveClip(clip, s.keyframes, time);
            await seekVideo(vid, resolved.videoTime);
          }
        }

        if (cancelRef.current) break;

        // 2. Clear and draw everything onto the offscreen canvas.
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = s.background || "#000000";
        ctx.fillRect(0, 0, W, H);

        for (const clip of sortedClips) {
          if (clip.hidden) continue;
          const resolved = resolveClip(clip, s.keyframes, time);
          if (!resolved.visible) continue;
          const mediaEl = clip.mediaType === "video"
            ? (videoEls.get(clip.id) ?? null)
            : clip.mediaType === "image"
              ? (imageEls.get(clip.id) ?? null)
              : null;
          drawClipToCanvas(ctx, clip, resolved, mediaEl, W, H);
        }

        // 3. Pace: wait until the frame's target real-world timestamp so the
        //    resulting video plays at the correct speed.
        const targetMs = frame * FRAME_MS;
        const elapsedMs = performance.now() - exportStartMs;
        if (elapsedMs < targetMs) {
          await new Promise<void>((resolve) => setTimeout(resolve, targetMs - elapsedMs));
        }

        // 4. Push the fully-drawn frame into the MediaRecorder stream.
        if (typeof videoTrack.requestFrame === "function") {
          videoTrack.requestFrame();
        }

        // Yield to the event loop so the frame is flushed before we proceed.
        await new Promise<void>((resolve) => setTimeout(resolve, 0));

        setExportStatus({ phase: "rendering", progress: frame / TOTAL_FRAMES });
      }

      for (const vid of videoEls.values()) vid.pause();
      recorder.stop();
      await new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });

      if (cancelRef.current) { setExportStatus({ phase: "idle", progress: 0 }); return; }

      const ext = config.format === "mp4" ? "mp4" : "webm";
      const blob = new Blob(chunks, { type: mimeType.split(";")[0] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = `export-${Date.now()}.${ext}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setExportStatus({ phase: "done", progress: 1, downloadedFile: filename });
    } catch (err: any) {
      console.error("Export error:", err);
      setExportStatus({ phase: "error", progress: 0, errorMsg: err?.message ?? String(err) });
    }
  }, []);

  const startAudioExport = useCallback(async () => {
    const s = stateRef.current;
    cancelRef.current = false;
    setExportStatus({ phase: "loading", progress: 0 });

    try {
      const TOTAL = s.duration;
      const audibleClips = s.clips.filter(
        (c) => !c.hidden && !c.muted && (c.mediaType === "audio" || c.mediaType === "video") && c.src,
      );

      if (audibleClips.length === 0) throw new Error("No audible clips found in the timeline.");

      const audioCtx = new AudioContext();
      const destination = audioCtx.createMediaStreamDestination();
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

      const audioMime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"].find(
        (m) => MediaRecorder.isTypeSupported(m),
      ) ?? "audio/webm";

      const recorder = new MediaRecorder(destination.stream, { mimeType: audioMime });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.start(200);

      setExportStatus({ phase: "rendering", progress: 0 });

      for (const { el, clip } of mediaEls) {
        el.currentTime = clip.trimStart ?? 0;
        el.playbackRate = clip.speed ?? 1;
        el.muted = false;
        el.volume = Math.max(0, Math.min(1, clip.volume ?? 1));
        if (clip.startTime <= 0) {
          el.play().catch(() => {});
        } else {
          setTimeout(() => { if (!cancelRef.current) el.play().catch(() => {}); }, clip.startTime * 1000);
        }
      }

      const startMs = Date.now();
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          const elapsed = (Date.now() - startMs) / 1000;
          const progress = Math.min(elapsed / TOTAL, 1);
          setExportStatus({ phase: "rendering", progress });
          if (cancelRef.current || elapsed >= TOTAL) { clearInterval(interval); resolve(); }
        }, 200);
      });

      for (const { el } of mediaEls) { el.pause(); }
      recorder.stop();
      await new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });

      if (cancelRef.current) { setExportStatus({ phase: "idle", progress: 0 }); return; }

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
      setExportStatus({ phase: "done", progress: 1, downloadedFile: filename });
    } catch (err: any) {
      console.error("Audio export error:", err);
      setExportStatus({ phase: "error", progress: 0, errorMsg: err?.message ?? String(err) });
    }
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    setExportStatus({ phase: "idle", progress: 0 });
  }, []);

  const reset = useCallback(() => {
    setExportStatus({ phase: "idle", progress: 0 });
  }, []);

  return { exportStatus, startVideoExport, startAudioExport, cancel, reset };
}
