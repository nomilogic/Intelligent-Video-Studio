import { useState, useRef, useCallback } from "react";
import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4Target } from "mp4-muxer";
import { Muxer as WebMMuxer, ArrayBufferTarget as WebMTarget } from "webm-muxer";
import { EditorState, Clip } from "../lib/types";
import { resolveClip, clipVisibleAt } from "../lib/animation";

export const DEFAULT_FPS = 30;
export const FPS_OPTIONS = [24, 30, 60] as const;
export type FpsOption = (typeof FPS_OPTIONS)[number];

export type Resolution = "full" | "720p" | "480p" | "half";
export type ExportFormat = "webm" | "mp4" | "audio";
export type ExportMode = "quick" | "optimized";

export interface ExportConfig {
  resolution: Resolution;
  format: ExportFormat;
  fps: FpsOption;
  mode: ExportMode;
}

export interface ExportStatus {
  phase: "idle" | "loading" | "rendering" | "encoding" | "done" | "error";
  progress: number;
  errorMsg?: string;
  downloadedFile?: string;
  mode?: ExportMode;
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

function objectCoverSourceRect(
  srcW: number, srcH: number,
  cropX: number, cropY: number, cropW: number, cropH: number,
  destW: number, destH: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const cSW = srcW * cropW;
  const cSH = srcH * cropH;
  const cSX = srcW * cropX;
  const cSY = srcH * cropY;
  const srcAspect = cSW / cSH;
  const destAspect = destW / destH;
  if (srcAspect > destAspect) {
    const newSW = cSH * destAspect;
    return { sx: cSX + (cSW - newSW) / 2, sy: cSY, sw: newSW, sh: cSH };
  } else {
    const newSH = cSW / destAspect;
    return { sx: cSX, sy: cSY + (cSH - newSH) / 2, sw: cSW, sh: newSH };
  }
}

function drawClipToCanvas(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  resolved: ReturnType<typeof resolveClip>,
  mediaEl: HTMLVideoElement | HTMLImageElement | null,
  W: number,
  H: number,
  resScale: number,
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
    roundRectPath(ctx, -pw / 2, -ph / 2, pw, ph, clip.borderRadius * resScale);
    ctx.clip();
  }

  const cropX = clip.cropX ?? 0;
  const cropY = clip.cropY ?? 0;
  const cropW = clip.cropWidth ?? 1;
  const cropH = clip.cropHeight ?? 1;

  if (clip.mediaType === "video" && mediaEl instanceof HTMLVideoElement) {
    const vid = mediaEl;
    if (vid.readyState >= 2 && vid.videoWidth > 0 && vid.videoHeight > 0 && pw > 0 && ph > 0) {
      const r = objectCoverSourceRect(
        vid.videoWidth, vid.videoHeight,
        cropX, cropY, cropW, cropH,
        pw, ph,
      );
      ctx.drawImage(vid, r.sx, r.sy, r.sw, r.sh, -pw / 2, -ph / 2, pw, ph);
    } else {
      ctx.fillStyle = clip.color || "#1a1a2e";
      ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    }
  } else if (clip.mediaType === "image" && mediaEl instanceof HTMLImageElement) {
    if (mediaEl.naturalWidth > 0 && mediaEl.naturalHeight > 0 && pw > 0 && ph > 0) {
      const r = objectCoverSourceRect(
        mediaEl.naturalWidth, mediaEl.naturalHeight,
        cropX, cropY, cropW, cropH,
        pw, ph,
      );
      ctx.drawImage(mediaEl, r.sx, r.sy, r.sw, r.sh, -pw / 2, -ph / 2, pw, ph);
    }
  } else if (clip.mediaType === "text") {
    const ts = clip.textStyle!;
    const fontSize = Math.max(1, (pw * (ts.fontSize || 64)) / 1000);
    const fontStyle = ts.italic ? "italic " : "";
    const fontStr = `${fontStyle}${ts.fontWeight || 700} ${fontSize}px ${ts.fontFamily || "sans-serif"}`;

    if (ts.background && ts.background !== "transparent") {
      ctx.save();
      ctx.fillStyle = ts.background;
      ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
      ctx.restore();
    }

    ctx.font = fontStr;
    ctx.textAlign = (ts.align || "center") as CanvasTextAlign;
    ctx.textBaseline = "middle";
    ctx.fillStyle = ts.color || "#ffffff";
    if (ts.shadow) { ctx.shadowBlur = 12 * resScale; ctx.shadowColor = "rgba(0,0,0,0.6)"; }

    const padX = 8 * resScale;
    const align = ts.align || "center";
    const anchorX = align === "left" ? -pw / 2 + padX : align === "right" ? pw / 2 - padX : 0;
    const lines = (clip.text || "").split("\n");
    const lineH = fontSize * 1.1;
    lines.forEach((line, i) => {
      const lineY = (i - (lines.length - 1) / 2) * lineH;
      ctx.fillText(line, anchorX, lineY);
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

interface PreloadedMedia {
  videoEls: Map<string, HTMLVideoElement>;
  imageEls: Map<string, HTMLImageElement>;
}

async function preloadMedia(s: EditorState): Promise<PreloadedMedia> {
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
  return { videoEls, imageEls };
}

async function renderFrame(
  ctx: CanvasRenderingContext2D,
  s: EditorState,
  sortedClips: Clip[],
  media: PreloadedMedia,
  W: number,
  H: number,
  scale: number,
  time: number,
) {
  // 1. Seek visible video clips to their exact frame positions.
  for (const clip of sortedClips) {
    if (clip.mediaType !== "video" || clip.hidden) continue;
    const vid = media.videoEls.get(clip.id);
    if (!vid) continue;
    if (clipVisibleAt(clip, time)) {
      const resolved = resolveClip(clip, s.keyframes, time);
      await seekVideo(vid, resolved.videoTime);
    }
  }

  // 2. Clear and draw everything onto the offscreen canvas.
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = s.background || "#000000";
  ctx.fillRect(0, 0, W, H);

  for (const clip of sortedClips) {
    if (clip.hidden) continue;
    const resolved = resolveClip(clip, s.keyframes, time);
    if (!resolved.visible) continue;
    const mediaEl = clip.mediaType === "video"
      ? (media.videoEls.get(clip.id) ?? null)
      : clip.mediaType === "image"
        ? (media.imageEls.get(clip.id) ?? null)
        : null;
    drawClipToCanvas(ctx, clip, resolved, mediaEl, W, H, scale);
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Quick Save: Uses MediaRecorder to capture the canvas in real time.
 * Faster to start and has wide browser support, but pacing depends on render
 * speed — long renders can produce slightly uneven motion.
 */
async function exportQuick(
  s: EditorState,
  config: ExportConfig,
  cancelRef: React.MutableRefObject<boolean>,
  onProgress: (progress: number) => void,
): Promise<{ blob: Blob; ext: string }> {
  const fps = config.fps;
  const frameMs = 1000 / fps;
  const scale = computeScale(config.resolution, s.canvasWidth, s.canvasHeight);
  const W = Math.round(s.canvasWidth * scale);
  const H = Math.round(s.canvasHeight * scale);
  const TOTAL_FRAMES = Math.ceil(s.duration * fps);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const media = await preloadMedia(s);
  if (cancelRef.current) throw new Error("Cancelled");

  let mimeType: string;
  if (config.format === "mp4") {
    const mp4Types = ["video/mp4;codecs=avc1", "video/mp4;codecs=h264", "video/mp4"];
    const supported = mp4Types.find((m) => MediaRecorder.isTypeSupported(m));
    if (!supported) throw new Error("MP4 not supported by this browser. Use WebM instead.");
    mimeType = supported;
  } else {
    mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find(
      (m) => MediaRecorder.isTypeSupported(m),
    ) ?? "video/webm";
  }

  const stream = canvas.captureStream(0);
  const videoTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack & { requestFrame?: () => void };
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.start(200);

  const sortedClips = [...s.clips].sort((a, b) => b.trackIndex - a.trackIndex);
  const startMs = performance.now();

  for (let frame = 0; frame <= TOTAL_FRAMES; frame++) {
    if (cancelRef.current) break;
    const time = frame / fps;

    await renderFrame(ctx, s, sortedClips, media, W, H, scale, time);
    if (cancelRef.current) break;

    const targetMs = frame * frameMs;
    const elapsedMs = performance.now() - startMs;
    if (elapsedMs < targetMs) {
      await new Promise<void>((resolve) => setTimeout(resolve, targetMs - elapsedMs));
    }

    if (typeof videoTrack.requestFrame === "function") videoTrack.requestFrame();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    onProgress(frame / TOTAL_FRAMES);
  }

  for (const v of media.videoEls.values()) v.pause();
  recorder.stop();
  await new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });

  const ext = config.format === "mp4" ? "mp4" : "webm";
  const blob = new Blob(chunks, { type: mimeType.split(";")[0] });
  return { blob, ext };
}

/**
 * Optimized Save: Uses WebCodecs VideoEncoder + a muxer (mp4-muxer / webm-muxer).
 * Each frame is encoded with an explicit timestamp, completely decoupled from
 * real-time render speed. This produces a perfectly-paced video at the chosen
 * frame rate with the highest quality for the given bitrate.
 */
async function exportOptimized(
  s: EditorState,
  config: ExportConfig,
  cancelRef: React.MutableRefObject<boolean>,
  onProgress: (phase: "rendering" | "encoding", progress: number) => void,
): Promise<{ blob: Blob; ext: string }> {
  if (typeof (globalThis as any).VideoEncoder === "undefined" || typeof (globalThis as any).VideoFrame === "undefined") {
    throw new Error("Optimized save needs WebCodecs (Chrome/Edge). Try Quick Save instead.");
  }

  const fps = config.fps;
  const scale = computeScale(config.resolution, s.canvasWidth, s.canvasHeight);
  const W = Math.round(s.canvasWidth * scale);
  const H = Math.round(s.canvasHeight * scale);
  const TOTAL_FRAMES = Math.ceil(s.duration * fps);

  // WebCodecs requires even dimensions for most codecs.
  const codedW = W % 2 === 0 ? W : W - 1;
  const codedH = H % 2 === 0 ? H : H - 1;

  const canvas = document.createElement("canvas");
  canvas.width = codedW;
  canvas.height = codedH;
  const ctx = canvas.getContext("2d")!;

  const media = await preloadMedia(s);
  if (cancelRef.current) throw new Error("Cancelled");

  // Pixel-count based bitrate target, capped to a sensible range.
  const pixels = codedW * codedH * fps;
  const bitrate = Math.min(40_000_000, Math.max(2_000_000, Math.round(pixels * 0.15)));

  const isMp4 = config.format === "mp4";

  let muxer: Mp4Muxer<Mp4Target> | WebMMuxer<WebMTarget>;
  let target: Mp4Target | WebMTarget;
  let codec: string;
  let mimeBase: string;
  let ext: string;

  if (isMp4) {
    target = new Mp4Target();
    codec = "avc1.640028"; // H.264 High Profile, level 4.0
    muxer = new Mp4Muxer({
      target,
      video: { codec: "avc", width: codedW, height: codedH, frameRate: fps },
      fastStart: "in-memory",
    });
    mimeBase = "video/mp4";
    ext = "mp4";
  } else {
    target = new WebMTarget();
    codec = "vp09.00.10.08";
    muxer = new WebMMuxer({
      target,
      video: { codec: "V_VP9", width: codedW, height: codedH, frameRate: fps },
    });
    mimeBase = "video/webm";
    ext = "webm";
  }

  // Validate codec support and fall back if needed.
  const VideoEncoderCtor = (globalThis as any).VideoEncoder;
  let supported = await VideoEncoderCtor.isConfigSupported({ codec, width: codedW, height: codedH, bitrate, framerate: fps });
  if (!supported?.supported && isMp4) {
    codec = "avc1.42E01F"; // H.264 baseline fallback
    supported = await VideoEncoderCtor.isConfigSupported({ codec, width: codedW, height: codedH, bitrate, framerate: fps });
  }
  if (!supported?.supported && !isMp4) {
    codec = "vp8";
    supported = await VideoEncoderCtor.isConfigSupported({ codec, width: codedW, height: codedH, bitrate, framerate: fps });
  }
  if (!supported?.supported) {
    throw new Error(`This browser cannot encode ${ext.toUpperCase()} via WebCodecs. Try Quick Save.`);
  }

  let encodeError: unknown = null;
  const encoder = new VideoEncoderCtor({
    output: (chunk: any, meta: any) => {
      muxer.addVideoChunk(chunk, meta);
    },
    error: (e: unknown) => { encodeError = e; },
  });
  encoder.configure({ codec, width: codedW, height: codedH, bitrate, framerate: fps });

  const sortedClips = [...s.clips].sort((a, b) => b.trackIndex - a.trackIndex);
  const VideoFrameCtor = (globalThis as any).VideoFrame;

  for (let frame = 0; frame <= TOTAL_FRAMES; frame++) {
    if (cancelRef.current) break;
    if (encodeError) throw encodeError;
    const time = frame / fps;

    await renderFrame(ctx, s, sortedClips, media, codedW, codedH, scale, time);
    if (cancelRef.current) break;

    const timestamp = Math.round((frame * 1_000_000) / fps);
    const vf = new VideoFrameCtor(canvas, { timestamp });
    // Force a keyframe every ~2 seconds for seekability.
    const keyFrame = frame % Math.max(1, Math.round(fps * 2)) === 0;
    encoder.encode(vf, { keyFrame });
    vf.close();

    // Backpressure: don't let the queue grow without bound.
    if (encoder.encodeQueueSize > 8) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }

    onProgress("rendering", frame / TOTAL_FRAMES);
  }

  for (const v of media.videoEls.values()) v.pause();
  onProgress("encoding", 1);

  await encoder.flush();
  encoder.close();
  if (encodeError) throw encodeError;

  muxer.finalize();
  const buffer = (target as Mp4Target | WebMTarget).buffer;
  const blob = new Blob([buffer], { type: mimeBase });
  return { blob, ext };
}

export function useExport(state: EditorState) {
  const [exportStatus, setExportStatus] = useState<ExportStatus>({ phase: "idle", progress: 0 });
  const cancelRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const startVideoExport = useCallback(async (config: ExportConfig) => {
    const s = stateRef.current;
    cancelRef.current = false;
    setExportStatus({ phase: "loading", progress: 0, mode: config.mode });

    try {
      setExportStatus({ phase: "rendering", progress: 0, mode: config.mode });

      const { blob, ext } = config.mode === "optimized"
        ? await exportOptimized(s, config, cancelRef, (phase, progress) => {
            setExportStatus({ phase, progress, mode: config.mode });
          })
        : await exportQuick(s, config, cancelRef, (progress) => {
            setExportStatus({ phase: "rendering", progress, mode: config.mode });
          });

      if (cancelRef.current) { setExportStatus({ phase: "idle", progress: 0 }); return; }

      const filename = `export-${Date.now()}.${ext}`;
      downloadBlob(blob, filename);
      setExportStatus({ phase: "done", progress: 1, downloadedFile: filename, mode: config.mode });
    } catch (err: any) {
      console.error("Export error:", err);
      if (err?.message === "Cancelled") {
        setExportStatus({ phase: "idle", progress: 0 });
        return;
      }
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
      const filename = `audio-export-${Date.now()}.${ext}`;
      downloadBlob(blob, filename);
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
