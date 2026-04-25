import { useState, useRef, useCallback } from "react";
import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4Target } from "mp4-muxer";
import { Muxer as WebMMuxer, ArrayBufferTarget as WebMTarget } from "webm-muxer";
import { EditorState, Clip, ClipMask } from "../lib/types";
import {
  resolveClip,
  clipVisibleAt,
  getActiveTransition,
  getEffectImpact,
  combineFilterCss,
  hexWithAlpha,
  NO_TRANSITION,
  NO_EFFECT_IMPACT,
  type TransitionMod,
  type EffectImpact,
} from "../lib/animation";

// Sample rate used for offline audio rendering and encoding.
const AUDIO_SAMPLE_RATE = 48000;
const AUDIO_CHANNELS = 2;
const AUDIO_BITRATE = 192_000;

function audibleClipsOf(s: EditorState): Clip[] {
  return s.clips.filter(
    (c) => !c.hidden && !c.muted && (c.mediaType === "audio" || c.mediaType === "video") && !!c.src,
  );
}

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

function computeMaskTargetRect(
  mask: ClipMask, mw: number, mh: number, pw: number, ph: number,
): { dx: number; dy: number; dw: number; dh: number } {
  const scale = Math.max(0.05, mask.scale ?? 1);
  let fitW: number;
  let fitH: number;
  if (mask.fit === "stretch") {
    fitW = pw; fitH = ph;
  } else {
    const boxAspect = pw / Math.max(1e-6, ph);
    const imgAspect = mw / Math.max(1e-6, mh);
    if (mask.fit === "contain") {
      if (imgAspect > boxAspect) { fitW = pw; fitH = pw / imgAspect; }
      else { fitH = ph; fitW = ph * imgAspect; }
    } else { // cover
      if (imgAspect > boxAspect) { fitH = ph; fitW = ph * imgAspect; }
      else { fitW = pw; fitH = pw / imgAspect; }
    }
  }
  const dw = fitW * scale;
  const dh = fitH * scale;
  const dx = -dw / 2 + (mask.offsetX || 0) * pw;
  const dy = -dh / 2 + (mask.offsetY || 0) * ph;
  return { dx, dy, dw, dh };
}

function drawClipToCanvas(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  resolved: ReturnType<typeof resolveClip>,
  mediaEl: HTMLVideoElement | HTMLImageElement | null,
  W: number,
  H: number,
  resScale: number,
  mod: TransitionMod = NO_TRANSITION,
  fx: EffectImpact = NO_EFFECT_IMPACT,
  maskCanvas: HTMLCanvasElement | null = null,
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, resolved.opacity * mod.opacityMul));
  ctx.globalCompositeOperation = (clip.blendMode || "normal") as GlobalCompositeOperation;

  // Combine base filter + effect-driven filter + transition blur.
  const combinedFilter = combineFilterCss(resolved.filterCss, fx.extraFilter, mod.blurExtra);
  const filterStr = buildCanvasFilter(combinedFilter);
  if (filterStr !== "none") ctx.filter = filterStr;

  // Set glow shadow if any glow effect contributed (we approximate by parsing
  // out the first drop-shadow from extraFilter — but ctx.filter already
  // handles drop-shadow on the drawn image, so no extra work needed here).

  const px = resolved.x * W;
  const py = resolved.y * H;
  const pw = resolved.width * W;
  const ph = resolved.height * H;
  const cx = px + pw / 2;
  const cy = py + ph / 2;

  // Combined translate: base + transition + effect shake. Each component is
  // expressed as a percentage of the clip's own width/height.
  const txPct = resolved.translateX + mod.translateXPct + fx.shakeXPct;
  const tyPct = resolved.translateY + mod.translateYPct + fx.shakeYPct;
  ctx.translate(cx + (txPct * pw) / 100, cy + (tyPct * ph) / 100);
  ctx.rotate(((resolved.rotation || 0) * Math.PI) / 180);

  const baseScale = (resolved.scale || 1) * mod.scaleMul;
  const sx = baseScale * (clip.flipH ? -1 : 1);
  const sy = baseScale * (clip.flipV ? -1 : 1);
  ctx.scale(sx, sy);

  // Wipe transition: clip the rect from one side. clipInsetRight cuts off a
  // fraction of the right edge (incoming side); clipInsetLeft cuts the left.
  if (mod.clipInsetRight > 0 || mod.clipInsetLeft > 0) {
    const left = -pw / 2 + mod.clipInsetLeft * pw;
    const right = pw / 2 - mod.clipInsetRight * pw;
    if (right > left) {
      ctx.beginPath();
      ctx.rect(left, -ph / 2, right - left, ph);
      ctx.clip();
    }
  }

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
    // Match Canvas.tsx: auto = font scales with clip width; fixed = font scales
    // with the canvas width (so the box can be resized independently).
    const autoScale = clip.textAutoScale !== false;
    const sizeRef = autoScale ? pw : W;
    const fontSize = Math.max(1, (sizeRef * (ts.fontSize || 64)) / 1000);
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

  // ─── Post-effect overlays (drawn within the clip's transform so they stay
  //      attached to the clip, including transition shifts and shake). Each
  //      overlay paints over the clip rect [-pw/2, -ph/2, pw, ph]. We reset
  //      the canvas filter to avoid double-applying drop-shadow/blur to the
  //      overlay rectangles. ────────────────────────────────────────────────
  if (fx.overlays.length > 0) {
    ctx.filter = "none";
    ctx.shadowBlur = 0;
    for (const o of fx.overlays) {
      const i = Math.max(0, Math.min(1, o.intensity));
      if (o.kind === "vignette") {
        const radius = Math.hypot(pw / 2, ph / 2);
        const grad = ctx.createRadialGradient(0, 0, radius * 0.4, 0, 0, radius);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, `rgba(0,0,0,${(0.85 * i).toFixed(3)})`);
        ctx.fillStyle = grad;
        ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
      } else if (o.kind === "scanlines") {
        const alpha = Math.min(0.6, 0.4 * i + 0.05);
        ctx.fillStyle = `rgba(0,0,0,${alpha.toFixed(3)})`;
        // Draw 1px lines every 3px (in clip-local pixels). Density tracks the
        // intensity slightly.
        const step = 3;
        for (let y = -ph / 2; y < ph / 2; y += step) {
          ctx.fillRect(-pw / 2, y, pw, 1);
        }
      } else if (o.kind === "tint") {
        const color = o.color || "#ff00aa";
        const alpha = Math.min(0.7, 0.5 * i);
        ctx.fillStyle = hexWithAlpha(color, alpha);
        ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
      }
    }
  }

  // ─── Apply per-clip mask (still inside the clip's transform, so the mask
  //      moves/rotates/scales with the clip). The caller renders this clip
  //      to a fresh per-clip offscreen canvas when a mask is present, so
  //      destination-in here only erases pixels of THIS clip — never of any
  //      other clip already drawn to the main canvas. ─────────────────────
  if (clip.mask && maskCanvas) {
    ctx.filter = "none";
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "destination-in";
    const r = computeMaskTargetRect(clip.mask, maskCanvas.width, maskCanvas.height, pw, ph);
    ctx.drawImage(maskCanvas, r.dx, r.dy, r.dw, r.dh);
  }

  ctx.restore();
}

// Render a single clip with optional mask. When a mask is present the clip is
// drawn to a per-frame offscreen canvas first so destination-in compositing
// only affects this clip's pixels, then the result is layered onto the main
// composite.
function drawClipWithMask(
  mainCtx: CanvasRenderingContext2D,
  clip: Clip,
  resolved: ReturnType<typeof resolveClip>,
  mediaEl: HTMLVideoElement | HTMLImageElement | null,
  maskCanvas: HTMLCanvasElement | null,
  W: number,
  H: number,
  resScale: number,
  mod: TransitionMod = NO_TRANSITION,
  fx: EffectImpact = NO_EFFECT_IMPACT,
) {
  if (!clip.mask || !maskCanvas) {
    drawClipToCanvas(mainCtx, clip, resolved, mediaEl, W, H, resScale, mod, fx, null);
    return;
  }
  const off = document.createElement("canvas");
  off.width = mainCtx.canvas.width;
  off.height = mainCtx.canvas.height;
  const ox = off.getContext("2d");
  if (!ox) {
    drawClipToCanvas(mainCtx, clip, resolved, mediaEl, W, H, resScale, mod, fx, null);
    return;
  }
  drawClipToCanvas(ox, clip, resolved, mediaEl, W, H, resScale, mod, fx, maskCanvas);
  mainCtx.drawImage(off, 0, 0);
}

interface PreloadedMedia {
  videoEls: Map<string, HTMLVideoElement>;
  imageEls: Map<string, HTMLImageElement>;
  // Per-clip prepared mask canvas. RGB is white; alpha encodes the mask
  // strength according to the clip's mask.mode/invert settings.
  maskEls: Map<string, HTMLCanvasElement>;
}

async function loadImageEl(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function prepareMaskCanvas(img: HTMLImageElement, mask: ClipMask): HTMLCanvasElement {
  const w = Math.max(1, img.naturalWidth || 1);
  const h = Math.max(1, img.naturalHeight || 1);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const cx = c.getContext("2d")!;
  cx.drawImage(img, 0, 0);
  const data = cx.getImageData(0, 0, w, h);
  const px = data.data;
  const opacity = Math.max(0, Math.min(1, mask.opacity ?? 1));
  for (let i = 0; i < px.length; i += 4) {
    let a: number;
    if (mask.mode === "luminance") {
      // Standard Rec.601 luminance.
      a = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    } else {
      a = px[i + 3];
    }
    if (mask.invert) a = 255 - a;
    a = a * opacity;
    px[i] = 255;
    px[i + 1] = 255;
    px[i + 2] = 255;
    px[i + 3] = Math.max(0, Math.min(255, a));
  }
  cx.putImageData(data, 0, 0);
  return c;
}

async function preloadMedia(s: EditorState): Promise<PreloadedMedia> {
  const videoEls = new Map<string, HTMLVideoElement>();
  const imageEls = new Map<string, HTMLImageElement>();
  const maskEls = new Map<string, HTMLCanvasElement>();
  await Promise.all(
    s.clips.map(async (clip) => {
      // Preload masks for any clip type.
      if (clip.mask?.src) {
        const mImg = await loadImageEl(clip.mask.src);
        if (mImg) maskEls.set(clip.id, prepareMaskCanvas(mImg, clip.mask));
      }
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
  return { videoEls, imageEls, maskEls };
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
  // 1. Seek visible video clips to their exact frame positions. Also seek the
  //    "prev clip" of any active transition to its final frame, so the
  //    outgoing ghost has real video content (not a black frame).
  for (const clip of sortedClips) {
    if (clip.mediaType !== "video" || clip.hidden) continue;
    const vid = media.videoEls.get(clip.id);
    if (!vid) continue;
    if (clipVisibleAt(clip, time)) {
      const resolved = resolveClip(clip, s.keyframes, time);
      await seekVideo(vid, resolved.videoTime);
    }
  }
  // Pre-seek prev video clips that need to be ghost-rendered.
  for (const clip of sortedClips) {
    if (clip.hidden) continue;
    const trans = getActiveTransition(clip, s.clips, time);
    if (!trans || !trans.prevClip || trans.prevClip.mediaType !== "video") continue;
    const prev = trans.prevClip;
    const vid = media.videoEls.get(prev.id);
    if (!vid) continue;
    const lastT = prev.startTime + prev.duration - 0.001;
    const pr = resolveClip(prev, s.keyframes, lastT);
    await seekVideo(vid, pr.videoTime);
  }

  // 2. Clear and draw everything onto the offscreen canvas.
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = s.background || "#000000";
  ctx.fillRect(0, 0, W, H);

  for (const clip of sortedClips) {
    if (clip.hidden) continue;
    const resolved = resolveClip(clip, s.keyframes, time);
    if (!resolved.visible) continue;

    const trans = getActiveTransition(clip, s.clips, time);
    const incomingMod = trans?.incoming ?? NO_TRANSITION;
    const fxImpact = getEffectImpact(clip, time);

    // Ghost-render the prev clip (if any) with outgoing modulation. Drawing
    // it BEFORE the current clip respects the natural z-order: the incoming
    // clip sits on top of the outgoing one within its own track lane.
    if (trans && trans.prevClip) {
      const prev = trans.prevClip;
      const lastT = prev.startTime + prev.duration - 0.001;
      const pr = resolveClip(prev, s.keyframes, lastT);
      const prevMediaEl = prev.mediaType === "video"
        ? (media.videoEls.get(prev.id) ?? null)
        : prev.mediaType === "image"
          ? (media.imageEls.get(prev.id) ?? null)
          : null;
      const pFx = getEffectImpact(prev, time);
      const prevMask = media.maskEls.get(prev.id) ?? null;
      drawClipWithMask(ctx, prev, pr, prevMediaEl, prevMask, W, H, scale, trans.outgoing, pFx);
    }

    const mediaEl = clip.mediaType === "video"
      ? (media.videoEls.get(clip.id) ?? null)
      : clip.mediaType === "image"
        ? (media.imageEls.get(clip.id) ?? null)
        : null;
    const clipMask = media.maskEls.get(clip.id) ?? null;
    drawClipWithMask(ctx, clip, resolved, mediaEl, clipMask, W, H, scale, incomingMod, fxImpact);
  }
}

/**
 * Render the timeline's audio (all audible clips with correct startTime,
 * trimStart, speed and volume) into a single AudioBuffer. Used by the
 * optimized exporter where rendering is decoupled from real time.
 */
async function renderAudioOffline(s: EditorState): Promise<AudioBuffer | null> {
  const audible = audibleClipsOf(s);
  if (audible.length === 0) return null;

  const totalSamples = Math.max(1, Math.ceil(s.duration * AUDIO_SAMPLE_RATE));

  // Decode all clip audio sources up-front using a temporary AudioContext.
  // OfflineAudioContext.decodeAudioData also works, but using a regular
  // context first is broadly compatible.
  const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const decoded = new Map<string, AudioBuffer>();
  await Promise.all(
    audible.map(async (clip) => {
      try {
        const res = await fetch(clip.src!);
        const arr = await res.arrayBuffer();
        const buf = await tempCtx.decodeAudioData(arr.slice(0));
        decoded.set(clip.id, buf);
      } catch (e) {
        console.warn("Failed to decode audio for clip", clip.id, e);
      }
    }),
  );
  try { await tempCtx.close(); } catch {}

  if (decoded.size === 0) return null;

  const offline = new OfflineAudioContext(AUDIO_CHANNELS, totalSamples, AUDIO_SAMPLE_RATE);

  for (const clip of audible) {
    const buf = decoded.get(clip.id);
    if (!buf) continue;

    const src = offline.createBufferSource();
    src.buffer = buf;
    const speed = clip.speed && clip.speed > 0 ? clip.speed : 1;
    src.playbackRate.value = speed;

    const gain = offline.createGain();
    gain.gain.value = Math.max(0, clip.volume ?? 1);

    src.connect(gain);
    gain.connect(offline.destination);

    const startWhen = Math.max(0, clip.startTime);
    const offsetIntoSource = Math.max(0, clip.trimStart ?? 0);
    // Source seconds consumed = timeline seconds * speed.
    const sourceDuration = Math.max(0, clip.duration * speed);
    try {
      src.start(startWhen, offsetIntoSource, sourceDuration);
    } catch (e) {
      console.warn("Audio source.start failed for clip", clip.id, e);
    }
  }

  return await offline.startRendering();
}

/**
 * Encode an AudioBuffer with WebCodecs and append the chunks to the muxer's
 * audio track. Must be called AFTER the muxer has been constructed with an
 * audio config, but BEFORE muxer.finalize().
 */
async function encodeAudioToMuxer(
  audioBuffer: AudioBuffer,
  muxer: Mp4Muxer<Mp4Target> | WebMMuxer<WebMTarget>,
  isMp4: boolean,
): Promise<void> {
  const AudioEncoderCtor = (globalThis as any).AudioEncoder;
  const AudioDataCtor = (globalThis as any).AudioData;
  if (!AudioEncoderCtor || !AudioDataCtor) {
    throw new Error("WebCodecs AudioEncoder is not available in this browser.");
  }

  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = Math.min(AUDIO_CHANNELS, audioBuffer.numberOfChannels);

  // mp4 -> AAC LC (mp4a.40.2). webm -> Opus.
  const codec = isMp4 ? "mp4a.40.2" : "opus";
  const supported = await AudioEncoderCtor.isConfigSupported({
    codec,
    sampleRate,
    numberOfChannels,
    bitrate: AUDIO_BITRATE,
  });
  if (!supported?.supported) {
    throw new Error(`This browser cannot encode ${isMp4 ? "AAC" : "Opus"} audio via WebCodecs.`);
  }

  let encodeError: unknown = null;
  const encoder = new AudioEncoderCtor({
    output: (chunk: any, meta: any) => {
      (muxer as any).addAudioChunk(chunk, meta);
    },
    error: (e: unknown) => { encodeError = e; },
  });
  encoder.configure({ codec, sampleRate, numberOfChannels, bitrate: AUDIO_BITRATE });

  // Pre-fetch channel data so we can interleave per chunk.
  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numberOfChannels; ch++) {
    channelData.push(audioBuffer.getChannelData(ch));
  }

  const FRAME_SIZE = 1024;
  const totalFrames = audioBuffer.length;
  for (let offset = 0; offset < totalFrames; offset += FRAME_SIZE) {
    if (encodeError) break;
    const frames = Math.min(FRAME_SIZE, totalFrames - offset);
    // WebCodecs AudioData with planar f32 expects channels concatenated in
    // sequence: [ch0_frame0..ch0_frameN, ch1_frame0..ch1_frameN].
    const planar = new Float32Array(frames * numberOfChannels);
    for (let ch = 0; ch < numberOfChannels; ch++) {
      planar.set(channelData[ch].subarray(offset, offset + frames), ch * frames);
    }

    const timestamp = Math.round((offset / sampleRate) * 1_000_000);
    const data = new AudioDataCtor({
      format: "f32-planar",
      sampleRate,
      numberOfFrames: frames,
      numberOfChannels,
      timestamp,
      data: planar,
    });
    encoder.encode(data);
    data.close();

    if (encoder.encodeQueueSize > 16) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  await encoder.flush();
  encoder.close();
  if (encodeError) throw encodeError;
}

interface RealtimeAudioMix {
  audioCtx: AudioContext;
  destination: MediaStreamAudioDestinationNode;
  start: () => void;
  stop: () => void;
}

/**
 * Set up a Web Audio graph that mixes every audible clip into a single
 * MediaStreamAudioDestinationNode. The returned `start()` triggers playback
 * of every <video>/<audio> element at its scheduled clip.startTime relative
 * to "now". The audio tracks of `destination.stream` should be added to the
 * canvas captureStream BEFORE constructing the MediaRecorder.
 */
async function setupRealtimeAudioMix(
  s: EditorState,
  cancelRef: React.MutableRefObject<boolean>,
): Promise<RealtimeAudioMix | null> {
  const audible = audibleClipsOf(s);
  if (audible.length === 0) return null;

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const destination = audioCtx.createMediaStreamDestination();
  const items: Array<{ el: HTMLMediaElement; clip: Clip; timers: ReturnType<typeof setTimeout>[] }> = [];

  await Promise.all(
    audible.map(async (clip) => {
      const el =
        clip.mediaType === "video"
          ? document.createElement("video")
          : document.createElement("audio");
      el.src = clip.src!;
      el.preload = "auto";
      el.crossOrigin = "anonymous";
      // For video clips we don't render to canvas from these elements, but
      // the browser still needs a poster/visibility-friendly state.
      (el as HTMLVideoElement).muted = false;
      el.volume = Math.max(0, Math.min(1, clip.volume ?? 1));
      await new Promise<void>((resolve) => {
        el.onloadeddata = () => resolve();
        el.onerror = () => resolve();
        setTimeout(resolve, 8000);
        el.load();
      });
      try {
        const src = audioCtx.createMediaElementSource(el);
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = Math.max(0, clip.volume ?? 1);
        src.connect(gainNode);
        gainNode.connect(destination);
      } catch (e) {
        console.warn("Failed to attach audio for clip", clip.id, e);
      }
      items.push({ el, clip, timers: [] });
    }),
  );

  function start() {
    for (const item of items) {
      const { el, clip } = item;
      try {
        el.currentTime = Math.max(0, clip.trimStart ?? 0);
        el.playbackRate = clip.speed ?? 1;
        el.muted = false;
      } catch {}
      const startMs = Math.max(0, clip.startTime) * 1000;
      const stopMs = Math.max(0, clip.startTime + clip.duration) * 1000;
      if (startMs <= 0) {
        el.play().catch(() => {});
      } else {
        item.timers.push(setTimeout(() => {
          if (cancelRef.current) return;
          el.play().catch(() => {});
        }, startMs));
      }
      item.timers.push(setTimeout(() => {
        try { el.pause(); } catch {}
      }, stopMs));
    }
  }

  function stop() {
    for (const item of items) {
      for (const t of item.timers) clearTimeout(t);
      try { item.el.pause(); } catch {}
    }
    try { audioCtx.close(); } catch {}
  }

  return { audioCtx, destination, start, stop };
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

  // Mix audio (if any audible clips) into the same MediaStream as the canvas
  // video so the recorded file contains sound. Tracks must be added BEFORE
  // constructing the MediaRecorder.
  const audioMix = await setupRealtimeAudioMix(s, cancelRef);
  if (audioMix) {
    for (const t of audioMix.destination.stream.getAudioTracks()) {
      stream.addTrack(t);
    }
  }

  const videoTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack & { requestFrame?: () => void };
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 8_000_000,
    audioBitsPerSecond: AUDIO_BITRATE,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.start(200);

  // Start audio playback as close to recorder.start as possible so audio &
  // video timelines line up. Slight desync (<50ms) is acceptable for a real-
  // time export; users wanting frame-perfect sync should use Optimized Save.
  audioMix?.start();

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
  audioMix?.stop();
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

  // Render the audio mix offline first so we know whether to add an audio
  // track to the muxer (and what its sample rate / channel count are). This
  // also lets the audio render run while the user waits for the video phase.
  let audioBuffer: AudioBuffer | null = null;
  try {
    audioBuffer = await renderAudioOffline(s);
  } catch (e) {
    console.warn("Audio rendering failed; exporting silent video.", e);
    audioBuffer = null;
  }
  if (cancelRef.current) throw new Error("Cancelled");

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
      audio: audioBuffer
        ? {
            codec: "aac",
            numberOfChannels: Math.min(AUDIO_CHANNELS, audioBuffer.numberOfChannels),
            sampleRate: audioBuffer.sampleRate,
          }
        : undefined,
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
      audio: audioBuffer
        ? {
            codec: "A_OPUS",
            numberOfChannels: Math.min(AUDIO_CHANNELS, audioBuffer.numberOfChannels),
            sampleRate: audioBuffer.sampleRate,
          }
        : undefined,
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

  // Encode and mux the pre-rendered audio buffer (if any).
  if (audioBuffer) {
    try {
      await encodeAudioToMuxer(audioBuffer, muxer, isMp4);
    } catch (e) {
      console.warn("Audio encoding failed; finalizing without sound.", e);
    }
  }

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
