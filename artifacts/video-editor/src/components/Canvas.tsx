import { useRef, useState, useCallback, useEffect, useMemo, memo } from "react";
import { EditorState, EditorAction, Clip, ClipMask } from "../lib/types";
import {
  resolveClip,
  clipVisibleAt,
  getActiveTransition,
  getEffectImpact,
  combineFilterCss,
  type EffectOverlay,
  type TransitionMod,
  NO_TRANSITION,
} from "../lib/animation";
import { cn } from "@/lib/utils";

interface CanvasProps {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  canvasZoom: number;
  onCanvasZoomChange: (z: number) => void;
  isCropping: boolean;
  onCroppingChange: (v: boolean) => void;
}

type DragMode =
  | { kind: "move"; clipId: string; startX: number; startY: number; origX: number; origY: number }
  | { kind: "resize"; clipId: string; handle: string; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number }
  | { kind: "rotate"; clipId: string; centerX: number; centerY: number; startAngle: number; origRotation: number }
  | { kind: "cropMove"; clipId: string; startX: number; startY: number; origCx: number; origCy: number }
  | { kind: "cropResize"; clipId: string; handle: string; startX: number; startY: number; origCx: number; origCy: number; origCw: number; origCh: number };

function cropStyle(clip: Clip): React.CSSProperties {
  const cw = clip.cropWidth ?? 1;
  const ch = clip.cropHeight ?? 1;
  const cx = clip.cropX ?? 0;
  const cy = clip.cropY ?? 0;
  if (cw === 1 && ch === 1 && cx === 0 && cy === 0) return {};
  // Zoom into the cropped region so it fills the container.
  const sx = 1 / Math.max(0.01, cw);
  const sy = 1 / Math.max(0.01, ch);
  return {
    transformOrigin: "top left",
    transform: `translate(${-cx * 100 * sx}%, ${-cy * 100 * sy}%) scale(${sx}, ${sy})`,
    width: "100%",
    height: "100%",
  };
}

function flipTransform(clip: Clip): string {
  return `scaleX(${clip.flipH ? -1 : 1}) scaleY(${clip.flipV ? -1 : 1})`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const v = parseInt(full || "00ff00", 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

// Per-pixel chroma key. Modifies imageData in place. Distance is computed in
// RGB; pixels within `threshold` of the key color get fully transparent;
// pixels within `threshold + smoothness` get a soft alpha falloff. `spill`
// dampens residual color cast (e.g. green tint on hair) outside the key.
function applyChromaKey(
  data: Uint8ClampedArray,
  key: [number, number, number],
  threshold: number,    // 0..1 — fraction of max RGB distance (~441)
  smoothness: number,   // 0..1
  spill: number,        // 0..1
) {
  const [kr, kg, kb] = key;
  const MAX = 441.673; // sqrt(255²·3)
  const t = threshold * MAX;
  const s = Math.max(0.0001, smoothness * MAX);
  const tMax = t + s;
  const greenKey = kg > kr && kg > kb;
  const blueKey = kb > kr && kb > kg;
  const redKey = kr > kg && kr > kb;
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - kr;
    const dg = data[i + 1] - kg;
    const db = data[i + 2] - kb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist <= t) {
      data[i + 3] = 0;
    } else if (dist < tMax) {
      const k = (dist - t) / s;
      data[i + 3] = data[i + 3] * k;
    }
    if (spill > 0 && data[i + 3] > 0) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (greenKey && g > Math.max(r, b)) {
        data[i + 1] = Math.max(r, b) + (g - Math.max(r, b)) * (1 - spill);
      } else if (blueKey && b > Math.max(r, g)) {
        data[i + 2] = Math.max(r, g) + (b - Math.max(r, g)) * (1 - spill);
      } else if (redKey && r > Math.max(g, b)) {
        data[i] = Math.max(g, b) + (r - Math.max(g, b)) * (1 - spill);
      }
    }
  }
}

// Compute a "cover"-style draw rect (source aspect preserved, fills dest).
function coverDraw(dw: number, dh: number, sw: number, sh: number) {
  const sr = sw / sh;
  const dr = dw / dh;
  if (sr > dr) {
    const h = dh;
    const w = h * sr;
    return { dx: (dw - w) / 2, dy: 0, dw: w, dh: h };
  }
  const w = dw;
  const h = w / sr;
  return { dx: 0, dy: (dh - h) / 2, dw: w, dh: h };
}

function ChromaKeyMedia({ clip, videoTime, isPlaying }: { clip: Clip; videoTime: number; isPlaying: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const ck = clip.chromaKey!;
  const [imgReady, setImgReady] = useState(0);

  // Mirror the hidden <video> to the playhead, exactly like MediaContentBase.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const target = Math.max(0, videoTime);
    const drift = Math.abs(v.currentTime - target);
    if (!isPlaying) {
      if (drift > 0.03) try { v.currentTime = target; } catch {}
    } else if (drift > 0.25) {
      try { v.currentTime = target; } catch {}
    }
  }, [videoTime, isPlaying]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = clip.speed || 1;
    v.muted = clip.muted;
    v.volume = clip.muted ? 0 : clip.volume;
    if (isPlaying) v.play().catch(() => {}); else v.pause();
  }, [isPlaying, clip.muted, clip.volume, clip.speed]);

  // Live processing loop. Resizes the canvas to its display dims (capped to
  // keep per-frame work bounded), then draws the source with object-cover
  // positioning and applies the chroma key to the visible pixels.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    let raf: number | null = null;
    let cancelled = false;
    const key = hexToRgb(ck.color);
    const draw = () => {
      if (cancelled) return;
      const src: HTMLVideoElement | HTMLImageElement | null =
        clip.mediaType === "video" ? videoRef.current : imgRef.current;
      const sw = (src as HTMLVideoElement)?.videoWidth ?? (src as HTMLImageElement)?.naturalWidth ?? 0;
      const sh = (src as HTMLVideoElement)?.videoHeight ?? (src as HTMLImageElement)?.naturalHeight ?? 0;
      const ready =
        clip.mediaType === "video"
          ? (src as HTMLVideoElement | null)?.readyState !== undefined &&
            (src as HTMLVideoElement).readyState >= 2
          : sw > 0 && sh > 0;
      if (src && ready && sw > 0 && sh > 0) {
        // Cap preview backing dimensions for performance (≈540p).
        const rect = wrapper.getBoundingClientRect();
        const cap = 540;
        const dispW = Math.max(2, rect.width || sw);
        const dispH = Math.max(2, rect.height || sh);
        const aspect = dispW / dispH;
        let cw = Math.min(cap, dispW);
        let ch = Math.round(cw / aspect);
        if (ch > cap) { ch = cap; cw = Math.round(ch * aspect); }
        if (canvas.width !== cw || canvas.height !== ch) {
          canvas.width = cw;
          canvas.height = ch;
        }
        const { dx, dy, dw, dh } = coverDraw(cw, ch, sw, sh);
        try {
          ctx.clearRect(0, 0, cw, ch);
          ctx.drawImage(src as CanvasImageSource, 0, 0, sw, sh, dx, dy, dw, dh);
          if (ck.enabled) {
            const img = ctx.getImageData(0, 0, cw, ch);
            applyChromaKey(img.data, key, ck.threshold, ck.smoothness, ck.spill);
            ctx.putImageData(img, 0, 0);
          }
        } catch {
          // Cross-origin or decoding failure — silently skip this frame.
        }
      }
      if (clip.mediaType === "video") {
        raf = requestAnimationFrame(draw);
      }
    };
    if (clip.mediaType === "video") {
      raf = requestAnimationFrame(draw);
    } else {
      // Image: render once when dependencies change (and again after load).
      draw();
    }
    return () => {
      cancelled = true;
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [
    clip.mediaType,
    clip.src,
    ck.enabled,
    ck.color,
    ck.threshold,
    ck.smoothness,
    ck.spill,
    imgReady,
  ]);

  return (
    <div ref={wrapperRef} className="w-full h-full overflow-hidden pointer-events-none" style={{ transform: flipTransform(clip) }}>
      {clip.mediaType === "video" ? (
        <video ref={videoRef} src={clip.src} muted={clip.muted} playsInline preload="auto" className="hidden" />
      ) : (
        <img
          ref={imgRef}
          src={clip.src}
          alt={clip.label}
          className="hidden"
          onLoad={() => setImgReady((n) => n + 1)}
        />
      )}
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

function MediaContentBase({ clip, videoTime, isPlaying, showFullSource = false }: { clip: Clip; videoTime: number; isPlaying: boolean; showFullSource?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Sync video element to playhead. When playing, allow drift up to 0.25s before correcting.
  // When paused, snap exactly to videoTime so scrubbing is frame-accurate.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const target = Math.max(0, videoTime);
    const drift = Math.abs(v.currentTime - target);
    if (!isPlaying) {
      if (drift > 0.03) {
        try { v.currentTime = target; } catch {}
      }
    } else if (drift > 0.25) {
      try { v.currentTime = target; } catch {}
    }
  }, [videoTime, isPlaying]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = clip.speed || 1;
    v.volume = clip.muted ? 0 : clip.volume;
    v.muted = clip.muted;
    if (isPlaying) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [isPlaying, clip.muted, clip.volume, clip.speed]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const target = Math.max(0, videoTime);
    const drift = Math.abs(a.currentTime - target);
    if (!isPlaying) {
      if (drift > 0.05) {
        try { a.currentTime = target; } catch {}
      }
    } else if (drift > 0.3) {
      try { a.currentTime = target; } catch {}
    }
  }, [videoTime, isPlaying]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.playbackRate = clip.speed || 1;
    a.volume = clip.muted ? 0 : clip.volume;
    a.muted = clip.muted;
    if (isPlaying) {
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  }, [isPlaying, clip.muted, clip.volume, clip.speed]);

  const hasCrop =
    !showFullSource && (
      (clip.cropWidth ?? 1) !== 1 ||
      (clip.cropHeight ?? 1) !== 1 ||
      (clip.cropX ?? 0) !== 0 ||
      (clip.cropY ?? 0) !== 0
    );

  if (clip.mediaType === "video" && clip.src) {
    // Per-clip chroma key takes a different render path (canvas pipeline).
    // Cropping is bypassed in the chroma path — the cover-fit is built in.
    if (clip.chromaKey?.enabled) {
      return <ChromaKeyMedia clip={clip} videoTime={videoTime} isPlaying={isPlaying} />;
    }
    return (
      <div className="w-full h-full overflow-hidden pointer-events-none" style={{ transform: flipTransform(clip) }}>
        <video
          ref={videoRef}
          src={clip.src}
          muted={clip.muted}
          playsInline
          preload="auto"
          className="block object-cover"
          style={hasCrop ? cropStyle(clip) : { width: "100%", height: "100%" }}
        />
      </div>
    );
  }

  if (clip.mediaType === "audio" && clip.src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-emerald-500/30">
        <audio ref={audioRef} src={clip.src} preload="auto" />
        <div className="text-white/80 text-xs flex flex-col items-center gap-1">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
          <span>{clip.label}</span>
        </div>
      </div>
    );
  }

  if (clip.mediaType === "image" && clip.src) {
    if (clip.chromaKey?.enabled) {
      return <ChromaKeyMedia clip={clip} videoTime={videoTime} isPlaying={isPlaying} />;
    }
    return (
      <div className="w-full h-full overflow-hidden pointer-events-none" style={{ transform: flipTransform(clip) }}>
        <img
          src={clip.src}
          alt={clip.label}
          className="block object-cover"
          style={hasCrop ? cropStyle(clip) : { width: "100%", height: "100%" }}
        />
      </div>
    );
  }

  if (clip.mediaType === "text") {
    const ts = clip.textStyle!;
    // textAutoScale: true (default) → font scales with the clip box (cqw).
    // textAutoScale: false → font stays sized to the canvas (--canvas-w),
    // so resizing the clip box only resizes the box; text size is invariant.
    const autoScale = clip.textAutoScale !== false;
    const fontSizeStyle = autoScale
      ? `${ts.fontSize / 10}cqw`
      : `calc(var(--canvas-w, 100cqw) * ${ts.fontSize / 1000})`;
    return (
      <div
        className="w-full h-full flex pointer-events-none px-2 py-1"
        style={{
          background: ts.background === "transparent" ? "transparent" : ts.background,
          alignItems: "center",
          justifyContent:
            ts.align === "left" ? "flex-start" : ts.align === "right" ? "flex-end" : "center",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            fontFamily: ts.fontFamily,
            fontSize: fontSizeStyle,
            fontWeight: ts.fontWeight,
            color: ts.color,
            textAlign: ts.align,
            fontStyle: ts.italic ? "italic" : "normal",
            textDecoration: ts.underline ? "underline" : "none",
            textShadow: ts.shadow ? "0 2px 12px rgba(0,0,0,0.6), 0 0 4px rgba(0,0,0,0.4)" : "none",
            lineHeight: 1.1,
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
          }}
        >
          {clip.text || ""}
        </span>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${clip.color}cc, ${clip.color}55)` }}
    >
      <span
        className="text-white font-semibold drop-shadow-lg truncate px-2"
        style={{ fontSize: "min(2cqw, 14px)" }}
      >
        {clip.label}
      </span>
    </div>
  );
}

// Build CSS mask styles for a clip from its ClipMask config. Works on both
// the live preview and any element this is spread onto.
function buildMaskStyle(mask: ClipMask | undefined): React.CSSProperties {
  if (!mask || !mask.src) return {};
  const fitToSize: Record<ClipMask["fit"], string> = {
    stretch: "100% 100%",
    contain: "contain",
    cover: "cover",
  };
  const baseSize = fitToSize[mask.fit] || "100% 100%";
  // Scale wraps fit by transforming via background-size when stretch, or by
  // applying a scale via mask-size for contain/cover.
  const scale = Math.max(0.05, mask.scale || 1);
  const scaledSize =
    mask.fit === "stretch"
      ? `${100 * scale}% ${100 * scale}%`
      : `calc(${scale * 100}%)`;
  // Center plus offset (offset is fraction of clip dim → percentage)
  const px = 50 + (mask.offsetX || 0) * 100;
  const py = 50 + (mask.offsetY || 0) * 100;
  const position = `${px}% ${py}%`;
  const url = `url("${mask.src}")`;
  const modeCSS = mask.mode === "luminance" ? "luminance" : "alpha";
  // CSS `mask-image` + `-webkit-mask-image` for compat. Webkit doesn't honor
  // mask-mode on older builds — but modern Chromium (Replit preview) does.
  const style: React.CSSProperties = {
    WebkitMaskImage: url,
    maskImage: url,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskSize: mask.fit === "stretch" ? scaledSize : baseSize,
    maskSize: mask.fit === "stretch" ? scaledSize : baseSize,
    WebkitMaskPosition: position,
    maskPosition: position,
    maskMode: modeCSS as any,
  };
  if (mask.invert) {
    // CSS doesn't have a built-in mask-invert. Approximate via filter on the
    // mask image is not directly supported either. We invert by composing
    // with a stacked `mask-composite: exclude` against a 100%-coverage image.
    // Practical workaround: prepend a solid-white mask layer at full size and
    // exclude the user's mask. We use `mask-image` with two layers.
    const white =
      "linear-gradient(#fff,#fff)";
    style.WebkitMaskImage = `${white}, ${url}`;
    style.maskImage = `${white}, ${url}`;
    style.WebkitMaskRepeat = "no-repeat, no-repeat";
    style.maskRepeat = "no-repeat, no-repeat";
    style.WebkitMaskSize = `100% 100%, ${mask.fit === "stretch" ? scaledSize : baseSize}`;
    style.maskSize = `100% 100%, ${mask.fit === "stretch" ? scaledSize : baseSize}`;
    style.WebkitMaskPosition = `0% 0%, ${position}`;
    style.maskPosition = `0% 0%, ${position}`;
    (style as any).maskComposite = "exclude";
    (style as any).WebkitMaskComposite = "xor";
  }
  return style;
}

// Memoize MediaContent so video/image clips don't re-render on every playhead
// tick. Native <video> elements play independently of React; re-rendering them
// 30+ times per second is pure waste and causes visible playback jitter.
const MediaContent = memo(MediaContentBase, (prev, next) => {
  if (prev.clip !== next.clip) return false;
  if (prev.isPlaying !== next.isPlaying) return false;
  if (prev.showFullSource !== next.showFullSource) return false;
  // Text clips have no native playback element — always re-render on prop changes
  // so live text/style edits show immediately, even while playing.
  if (next.clip.mediaType === "text") return false;
  // While playing, the browser advances the video natively — skip re-renders
  // triggered solely by changes in `videoTime`.
  if (next.isPlaying) return true;
  // While paused (scrubbing), only re-render when the requested time actually
  // changed enough to need a seek.
  return Math.abs(prev.videoTime - next.videoTime) < 0.001;
});

/**
 * Renders the per-clip post-effect overlays (vignette, scanlines, tint).
 * These are stacked inset divs that sit on top of the clip's media. Effects
 * that translate to CSS filters / transforms are applied at the wrapper level
 * via getEffectImpact() and are not drawn here.
 */
function EffectOverlays({ overlays }: { overlays: EffectOverlay[] }) {
  if (!overlays || overlays.length === 0) return null;
  return (
    <>
      {overlays.map((o, i) => {
        if (o.kind === "vignette") {
          // Radial gradient that fades from transparent center to dark edges.
          const dark = Math.min(0.9, 0.85 * o.intensity);
          return (
            <div
              key={`v-${i}`}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${dark.toFixed(2)}) 100%)`,
              }}
            />
          );
        }
        if (o.kind === "scanlines") {
          const alpha = Math.min(0.6, 0.4 * o.intensity + 0.05);
          return (
            <div
              key={`s-${i}`}
              className="absolute inset-0 pointer-events-none mix-blend-multiply"
              style={{
                backgroundImage: `repeating-linear-gradient(0deg, rgba(0,0,0,${alpha.toFixed(2)}) 0px, rgba(0,0,0,${alpha.toFixed(2)}) 1px, transparent 1px, transparent 3px)`,
              }}
            />
          );
        }
        if (o.kind === "tint") {
          const alpha = Math.min(0.7, 0.5 * o.intensity);
          return (
            <div
              key={`t-${i}`}
              className="absolute inset-0 pointer-events-none mix-blend-color"
              style={{
                backgroundColor: o.color,
                opacity: alpha,
              }}
            />
          );
        }
        return null;
      })}
    </>
  );
}

export default function Canvas({ state, dispatch, canvasZoom, onCanvasZoomChange, isCropping, onCroppingChange }: CanvasProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragMode | null>(null);
  const [snapGuides, setSnapGuides] = useState<{ x?: number; y?: number }>({});
  const [fitSize, setFitSize] = useState({ w: 960, h: 540 });

  // Measure available space and compute the "fit" size at zoom=1
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const ratio = state.canvasWidth / state.canvasHeight;
      if (width / height > ratio) {
        setFitSize({ w: Math.round(height * ratio), h: Math.round(height) });
      } else {
        setFitSize({ w: Math.round(width), h: Math.round(width / ratio) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [state.canvasWidth, state.canvasHeight]);

  // Ctrl+wheel → zoom canvas
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      onCanvasZoomChange(Math.max(0.1, Math.min(4, canvasZoom + delta)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [canvasZoom, onCanvasZoomChange]);

  const visibleClips = useMemo(
    () =>
      state.clips
        .filter((c) => clipVisibleAt(c, state.currentTime) && !c.hidden)
        .sort((a, b) => b.trackIndex - a.trackIndex),
    [state.clips, state.currentTime],
  );

  // Split visible clips by role: "media" clips (regular content), "maskLayer"
  // clips (contribute alpha to a wrapper around the media composite), and
  // "logoBlur" clips (overlay rectangles that blur the composite beneath
  // them via backdrop-filter). Adjustment clips render OUTSIDE the masked
  // composite so they aren't masked themselves.
  const mediaClips = useMemo(
    () => visibleClips.filter((c) => c.mediaType !== "maskLayer" && c.mediaType !== "logoBlur"),
    [visibleClips],
  );
  const maskLayerClips = useMemo(
    () => visibleClips.filter((c) => c.mediaType === "maskLayer"),
    [visibleClips],
  );
  const logoBlurClips = useMemo(
    () => visibleClips.filter((c) => c.mediaType === "logoBlur"),
    [visibleClips],
  );

  // Build composed CSS mask for the media-clip wrapper from all visible
  // mask-layer clips. Each contributes a layer; CSS additively composites
  // the alpha of all layers (matching After Effects "add" mask mode).
  const maskWrapperStyle = useMemo<React.CSSProperties>(() => {
    if (maskLayerClips.length === 0) return {};
    const images: string[] = [];
    const sizes: string[] = [];
    const positions: string[] = [];
    const repeats: string[] = [];
    const modes: string[] = [];
    for (const c of maskLayerClips) {
      const r = resolveClip(c, state.keyframes, state.currentTime);
      if (!r.visible) continue;
      const m = c.mask;
      if (!m || !m.src) continue;
      images.push(`url("${m.src}")`);
      sizes.push(`${(r.width * 100).toFixed(3)}% ${(r.height * 100).toFixed(3)}%`);
      positions.push(`${(r.x * 100).toFixed(3)}% ${(r.y * 100).toFixed(3)}%`);
      repeats.push("no-repeat");
      modes.push(m.mode === "luminance" ? "luminance" : "alpha");
    }
    if (images.length === 0) return {};
    return {
      WebkitMaskImage: images.join(", "),
      maskImage: images.join(", "),
      WebkitMaskSize: sizes.join(", "),
      maskSize: sizes.join(", "),
      WebkitMaskPosition: positions.join(", "),
      maskPosition: positions.join(", "),
      WebkitMaskRepeat: repeats.join(", "),
      maskRepeat: repeats.join(", "),
      maskMode: modes.join(", ") as any,
    };
  }, [maskLayerClips, state.keyframes, state.currentTime]);

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      dispatch({ type: "SELECT_CLIP", payload: null });
    }
  };

  const startDrag = useCallback(
    (e: React.MouseEvent, clip: Clip, mode: "move" | "rotate" | "cropMove" | string) => {
      e.stopPropagation();
      e.preventDefault();
      if (clip.locked) return;
      if (!state.selectedClipIds.includes(clip.id)) {
        dispatch({ type: "SELECT_CLIP", payload: clip.id });
      }
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Capture the RESOLVED (interpolated) rect position at the current
      // playhead, not the clip's base values. When keyframes shift the clip,
      // the on-screen rectangle is at the resolved position — so the drag
      // delta must accumulate from there to avoid a snap/jump on first move.
      const r = resolveClip(clip, state.keyframes, state.currentTime);

      if (mode === "move") {
        setDrag({
          kind: "move",
          clipId: clip.id,
          startX: e.clientX,
          startY: e.clientY,
          origX: r.x,
          origY: r.y,
        });
      } else if (mode === "rotate") {
        const cx = rect.left + (r.x + r.width / 2) * rect.width;
        const cy = rect.top + (r.y + r.height / 2) * rect.height;
        const startAngle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
        setDrag({
          kind: "rotate",
          clipId: clip.id,
          centerX: cx,
          centerY: cy,
          startAngle,
          origRotation: r.rotation,
        });
      } else if (mode === "cropMove") {
        setDrag({
          kind: "cropMove",
          clipId: clip.id,
          startX: e.clientX,
          startY: e.clientY,
          origCx: clip.cropX,
          origCy: clip.cropY,
        });
      } else if (mode.startsWith("crop:")) {
        setDrag({
          kind: "cropResize",
          clipId: clip.id,
          handle: mode.slice(5),
          startX: e.clientX,
          startY: e.clientY,
          origCx: clip.cropX,
          origCy: clip.cropY,
          origCw: clip.cropWidth,
          origCh: clip.cropHeight,
        });
      } else {
        setDrag({
          kind: "resize",
          clipId: clip.id,
          handle: mode,
          startX: e.clientX,
          startY: e.clientY,
          origX: r.x,
          origY: r.y,
          origW: r.width,
          origH: r.height,
        });
      }
    },
    [dispatch, state.selectedClipIds, state.keyframes, state.currentTime],
  );

  useEffect(() => {
    if (!drag) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Route property changes to the right destination so the on-canvas
    // transform always has a visible effect at the current playhead:
    //   1. Keyframe AT current time → update that keyframe.
    //   2. Other keyframes exist for this property (but not at this time) →
    //      add a new keyframe at the playhead. Writing the base would do
    //      nothing visible because interpolation between siblings overrides it.
    //   3. No keyframes for this property → update the clip's base value.
    const dispatchAnimatable = (clipId: string, updates: Record<string, number>) => {
      const baseUpdates: Record<string, number> = {};
      for (const [prop, value] of Object.entries(updates)) {
        const exactKf = state.keyframes.find(
          (k) =>
            k.clipId === clipId &&
            k.property === prop &&
            Math.abs(k.time - state.currentTime) < 0.02,
        );
        if (exactKf) {
          dispatch({ type: "UPDATE_KEYFRAME", payload: { id: exactKf.id, value } });
          continue;
        }
        const hasOtherKfs = state.keyframes.some(
          (k) => k.clipId === clipId && k.property === prop,
        );
        if (hasOtherKfs) {
          dispatch({
            type: "ADD_KEYFRAME",
            payload: {
              clipId,
              property: prop,
              time: state.currentTime,
              value,
              easing: "linear",
            },
          });
        } else {
          baseUpdates[prop] = value;
        }
      }
      if (Object.keys(baseUpdates).length > 0) {
        dispatch({ type: "UPDATE_CLIP", payload: { id: clipId, updates: baseUpdates as Partial<Clip> } });
      }
    };

    const onMove = (ev: MouseEvent) => {
      if (drag.kind === "move") {
        const dx = (ev.clientX - drag.startX) / rect.width;
        const dy = (ev.clientY - drag.startY) / rect.height;
        let nx = drag.origX + dx;
        let ny = drag.origY + dy;
        const clip = state.clips.find((c) => c.id === drag.clipId);
        if (!clip) return;

        const guides: { x?: number; y?: number } = {};
        if (state.snapEnabled) {
          const r = resolveClip(clip, state.keyframes, state.currentTime);
          const cw = r.width;
          const ch = r.height;
          const centerX = nx + cw / 2;
          const centerY = ny + ch / 2;
          const SNAP = 0.02;
          if (Math.abs(centerX - 0.5) < SNAP) { nx = 0.5 - cw / 2; guides.x = 0.5; }
          if (Math.abs(nx) < SNAP) { nx = 0; guides.x = 0; }
          if (Math.abs(nx + cw - 1) < SNAP) { nx = 1 - cw; guides.x = 1; }
          if (Math.abs(centerY - 0.5) < SNAP) { ny = 0.5 - ch / 2; guides.y = 0.5; }
          if (Math.abs(ny) < SNAP) { ny = 0; guides.y = 0; }
          if (Math.abs(ny + ch - 1) < SNAP) { ny = 1 - ch; guides.y = 1; }
        }
        setSnapGuides(guides);
        dispatchAnimatable(drag.clipId, { x: nx, y: ny });
      } else if (drag.kind === "resize") {
        // Anchor-based resize: the opposite edge/corner stays fixed in canvas
        // space. Without this, ratio-locked drags drift the position because
        // height was being recomputed AFTER y was set.
        const handle = drag.handle;
        const dx = (ev.clientX - drag.startX) / rect.width;
        const dy = (ev.clientY - drag.startY) / rect.height;

        const clip = state.clips.find((c) => c.id === drag.clipId);
        if (!clip) return;
        const lockRatio = ev.shiftKey || clip.preserveRatio;
        const fromCenter = ev.altKey;
        const ratio = drag.origW / drag.origH;
        const factor = fromCenter ? 2 : 1;

        // Compute new size from the dragged handle. Edge handles affect one
        // axis; corner handles affect both. Alt = scale-from-center doubles
        // the delta so both sides grow.
        let nw = drag.origW;
        let nh = drag.origH;
        if (handle.includes("e")) nw = Math.max(0.02, drag.origW + dx * factor);
        if (handle.includes("w")) nw = Math.max(0.02, drag.origW - dx * factor);
        if (handle.includes("s")) nh = Math.max(0.02, drag.origH + dy * factor);
        if (handle.includes("n")) nh = Math.max(0.02, drag.origH - dy * factor);

        if (lockRatio) {
          const isCorner = handle.length === 2;
          if (isCorner) {
            // Pick the axis that grew the most relative to its original.
            const wScale = nw / drag.origW;
            const hScale = nh / drag.origH;
            if (Math.abs(wScale - 1) >= Math.abs(hScale - 1)) {
              nh = nw / ratio;
            } else {
              nw = nh * ratio;
            }
          } else if (handle === "e" || handle === "w") {
            nh = nw / ratio;
          } else {
            nw = nh * ratio;
          }
          if (nw < 0.02) { nw = 0.02; nh = nw / ratio; }
          if (nh < 0.02) { nh = 0.02; nw = nh * ratio; }
        }

        // Anchor point — the part of the original rect that should stay put.
        // For Alt, anchor = original center (so size grows symmetrically).
        let anchorX: number;
        let anchorY: number;
        if (fromCenter) {
          anchorX = drag.origX + drag.origW / 2;
          anchorY = drag.origY + drag.origH / 2;
        } else {
          anchorX = handle.includes("w")
            ? drag.origX + drag.origW
            : handle.includes("e")
              ? drag.origX
              : drag.origX + drag.origW / 2;
          anchorY = handle.includes("n")
            ? drag.origY + drag.origH
            : handle.includes("s")
              ? drag.origY
              : drag.origY + drag.origH / 2;
        }

        // Derive new position so the anchor stays fixed.
        let nx: number;
        let ny: number;
        if (fromCenter) {
          nx = anchorX - nw / 2;
          ny = anchorY - nh / 2;
        } else {
          nx = handle.includes("w")
            ? anchorX - nw
            : handle.includes("e")
              ? anchorX
              : anchorX - nw / 2;
          ny = handle.includes("n")
            ? anchorY - nh
            : handle.includes("s")
              ? anchorY
              : anchorY - nh / 2;
        }

        dispatchAnimatable(drag.clipId, { x: nx, y: ny, width: nw, height: nh });
      } else if (drag.kind === "cropMove") {
        const clip = state.clips.find((c) => c.id === drag.clipId);
        if (!clip) return;
        const w = Math.max(0.001, clip.width);
        const h = Math.max(0.001, clip.height);
        // The cropped region is shown stretched to fill the clip box, so 1
        // unit of canvas drag ≈ 1/clipWidth source units.
        const dCx = ((ev.clientX - drag.startX) / rect.width) / w * clip.cropWidth;
        const dCy = ((ev.clientY - drag.startY) / rect.height) / h * clip.cropHeight;
        const nCx = Math.min(1 - clip.cropWidth, Math.max(0, drag.origCx + dCx));
        const nCy = Math.min(1 - clip.cropHeight, Math.max(0, drag.origCy + dCy));
        dispatch({ type: "UPDATE_CLIP", payload: { id: drag.clipId, updates: { cropX: nCx, cropY: nCy } } });
      } else if (drag.kind === "cropResize") {
        const clip = state.clips.find((c) => c.id === drag.clipId);
        if (!clip) return;
        const handle = drag.handle;
        // The crop overlay is drawn in box space: 1 box-fraction = 1 source
        // fraction (because the box renders the full source while in crop
        // mode). So we convert mouse delta to box-fraction directly.
        const dx = (ev.clientX - drag.startX) / rect.width / Math.max(0.001, clip.width);
        const dy = (ev.clientY - drag.startY) / rect.height / Math.max(0.001, clip.height);

        let cx = drag.origCx;
        let cy = drag.origCy;
        let cw = drag.origCw;
        let ch = drag.origCh;
        if (handle.includes("e")) cw = Math.max(0.05, Math.min(1 - cx, drag.origCw + dx));
        if (handle.includes("w")) {
          const nw2 = Math.max(0.05, Math.min(drag.origCx + drag.origCw, drag.origCw - dx));
          cx = drag.origCx + (drag.origCw - nw2);
          cw = nw2;
        }
        if (handle.includes("s")) ch = Math.max(0.05, Math.min(1 - cy, drag.origCh + dy));
        if (handle.includes("n")) {
          const nh2 = Math.max(0.05, Math.min(drag.origCy + drag.origCh, drag.origCh - dy));
          cy = drag.origCy + (drag.origCh - nh2);
          ch = nh2;
        }
        // Clamp into [0,1] just in case.
        cx = Math.max(0, Math.min(1 - cw, cx));
        cy = Math.max(0, Math.min(1 - ch, cy));
        dispatch({
          type: "UPDATE_CLIP",
          payload: { id: drag.clipId, updates: { cropX: cx, cropY: cy, cropWidth: cw, cropHeight: ch } },
        });
      } else if (drag.kind === "rotate") {
        const angle = (Math.atan2(ev.clientY - drag.centerY, ev.clientX - drag.centerX) * 180) / Math.PI;
        const delta = angle - drag.startAngle;
        let r = drag.origRotation + delta;
        if (ev.shiftKey) r = Math.round(r / 15) * 15;
        dispatchAnimatable(drag.clipId, { rotation: r });
      }
    };
    const onUp = () => {
      setDrag(null);
      setSnapGuides({});
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, dispatch, state.snapEnabled, state.clips, state.keyframes, state.currentTime]);

  const selectedClip = state.clips.find((c) => state.selectedClipIds.includes(c.id));

  const handles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

  const displayW = Math.round(fitSize.w * canvasZoom);
  const displayH = Math.round(fitSize.h * canvasZoom);

  const onOuterMouseDown = (e: React.MouseEvent) => {
    if (e.target === outerRef.current) {
      dispatch({ type: "SELECT_CLIP", payload: null });
    }
  };

  return (
    <div
      ref={outerRef}
      className="w-full h-full overflow-auto flex items-center justify-center"
      style={{ scrollbarGutter: "stable" }}
      onMouseDown={onOuterMouseDown}
    >
      {/* Centering wrapper — shrinks to canvas size so scroll works correctly */}
      <div style={{ minWidth: displayW, minHeight: displayH, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div
          ref={containerRef}
          data-testid="canvas-preview"
          className={cn(
            "relative overflow-hidden cursor-default select-none shadow-2xl shrink-0",
            drag?.kind === "move" && "cursor-grabbing",
          )}
          style={{
            width: displayW,
            height: displayH,
            background: state.background,
            containerType: "size",
            // Exposed for fixed-mode text sizing inside clip containers.
            ["--canvas-w" as any]: `${displayW}px`,
          }}
          onMouseDown={onCanvasMouseDown}
        >
        {/* Subtle grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "10% 10%",
          }}
        />

        {/*
          Media-clip composite, wrapped in a div whose CSS mask is the union
          of all visible mask-layer clips' alphas. When there are no mask
          layers, the wrapper has no mask and behaves transparently.
        */}
        <div
          className="absolute inset-0"
          data-testid="canvas-media-composite"
          style={maskWrapperStyle}
        >
        {mediaClips.flatMap((clip) => {
          const isSelected = state.selectedClipIds.includes(clip.id);
          const cropThis = isCropping && isSelected && (clip.mediaType === "video" || clip.mediaType === "image");
          const r = resolveClip(clip, state.keyframes, state.currentTime);
          if (!r.visible) return [];

          // Transition state: if active, also render the prev clip (frozen at
          // its last frame) underneath with the OUTGOING modulation.
          const trans = getActiveTransition(clip, state.clips, state.currentTime);
          const incomingMod = trans?.incoming ?? NO_TRANSITION;
          const fxImpact = getEffectImpact(clip, state.currentTime);

          const nodes: React.ReactNode[] = [];

          // 1. Ghost-render the prev clip during the transition window.
          if (trans && trans.prevClip) {
            const prev = trans.prevClip;
            // Resolve the prev clip at its last visible moment so we get a
            // stable "frozen final frame" to fade/slide out from.
            const lastT = prev.startTime + prev.duration - 0.001;
            const pr = resolveClip(prev, state.keyframes, lastT);
            const pFx = getEffectImpact(prev, state.currentTime);
            const out = trans.outgoing;
            nodes.push(
              <div
                key={`ghost-${prev.id}-${clip.id}`}
                aria-hidden
                data-testid={`canvas-ghost-${prev.id}`}
                className="absolute overflow-hidden pointer-events-none"
                style={{
                  left: `${pr.x * 100}%`,
                  top: `${pr.y * 100}%`,
                  width: `${pr.width * 100}%`,
                  height: `${pr.height * 100}%`,
                  opacity: pr.opacity * out.opacityMul,
                  transform: `translate(${pr.translateX + out.translateXPct + pFx.shakeXPct}%, ${pr.translateY + out.translateYPct + pFx.shakeYPct}%) rotate(${pr.rotation}deg) scale(${pr.scale * out.scaleMul})`,
                  mixBlendMode: prev.blendMode as any,
                  filter: combineFilterCss(pr.filterCss, pFx.extraFilter, out.blurExtra),
                  borderRadius: `${prev.borderRadius}px`,
                  transformOrigin: "center",
                  clipPath:
                    out.clipInsetLeft > 0
                      ? `inset(0 0 0 ${(out.clipInsetLeft * 100).toFixed(2)}%)`
                      : undefined,
                  containerType: "size",
                }}
              >
                <MediaContent clip={prev} videoTime={pr.videoTime} isPlaying={false} showFullSource={false} />
                <EffectOverlays overlays={pFx.overlays} />
              </div>,
            );
          }

          // 2. The clip itself (with incoming transition + effects).
          nodes.push(
            <div
              key={clip.id}
              data-testid={`canvas-clip-${clip.id}`}
              className={cn(
                "absolute overflow-hidden",
                clip.locked ? "cursor-not-allowed" : cropThis ? "cursor-default" : "cursor-grab active:cursor-grabbing",
                isSelected && !cropThis && "outline outline-2 outline-primary outline-offset-0",
              )}
              style={{
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                width: `${r.width * 100}%`,
                height: `${r.height * 100}%`,
                opacity: r.opacity * incomingMod.opacityMul,
                transform: `translate(${r.translateX + incomingMod.translateXPct + fxImpact.shakeXPct}%, ${r.translateY + incomingMod.translateYPct + fxImpact.shakeYPct}%) rotate(${r.rotation}deg) scale(${r.scale * incomingMod.scaleMul})`,
                mixBlendMode: clip.blendMode as any,
                filter: combineFilterCss(r.filterCss, fxImpact.extraFilter, incomingMod.blurExtra),
                borderRadius: cropThis ? 0 : `${clip.borderRadius}px`,
                transformOrigin: "center",
                clipPath:
                  incomingMod.clipInsetRight > 0
                    ? `inset(0 ${(incomingMod.clipInsetRight * 100).toFixed(2)}% 0 0)`
                    : undefined,
                containerType: "size",
                ...buildMaskStyle(clip.mask),
              }}
              onMouseDown={cropThis ? undefined : (e) => startDrag(e, clip, "move")}
            >
              <MediaContent clip={clip} videoTime={r.videoTime} isPlaying={state.isPlaying} showFullSource={cropThis} />
              <EffectOverlays overlays={fxImpact.overlays} />
            </div>,
          );

          return nodes;
        })}
        </div>

        {/*
          Logo-blur clips. Rendered ABOVE the masked composite so their
          backdrop-filter samples whatever is beneath. Each is selectable and
          draggable just like a normal clip; transforms come from the same
          keyframe pipeline as media clips.
        */}
        {logoBlurClips.map((clip) => {
          const r = resolveClip(clip, state.keyframes, state.currentTime);
          if (!r.visible) return null;
          const isSelected = state.selectedClipIds.includes(clip.id);
          const blurPx = clip.blurAmount ?? 16;
          // Scale blur to canvas size so a value tuned at 1080-wide preview
          // looks the same on smaller previews.
          const scaledBlur = (blurPx * displayW) / 1080;
          return (
            <div
              key={clip.id}
              data-testid={`canvas-clip-${clip.id}`}
              className={cn(
                "absolute",
                clip.locked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
                isSelected && "outline outline-2 outline-primary",
                !isSelected && "outline outline-1 outline-dashed outline-orange-400/70",
              )}
              style={{
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                width: `${r.width * 100}%`,
                height: `${r.height * 100}%`,
                opacity: r.opacity,
                transform: `translate(${r.translateX}%, ${r.translateY}%) rotate(${r.rotation}deg) scale(${r.scale})`,
                transformOrigin: "center",
                borderRadius: `${clip.borderRadius}px`,
                backdropFilter: `blur(${scaledBlur.toFixed(2)}px)`,
                WebkitBackdropFilter: `blur(${scaledBlur.toFixed(2)}px)`,
              }}
              onMouseDown={(e) => startDrag(e, clip, "move")}
            >
              {!isSelected && (
                <div className="absolute top-0.5 left-1 text-[10px] text-orange-200/80 pointer-events-none select-none">
                  Blur
                </div>
              )}
            </div>
          );
        })}

        {/*
          Mask-layer clips render as faint outlines + label only — they do
          not draw into the visible composite (their alpha is consumed by
          the wrapper above). They remain selectable and draggable so users
          can keyframe their position/size/rotation.
        */}
        {maskLayerClips.map((clip) => {
          const r = resolveClip(clip, state.keyframes, state.currentTime);
          if (!r.visible) return null;
          const isSelected = state.selectedClipIds.includes(clip.id);
          return (
            <div
              key={clip.id}
              data-testid={`canvas-clip-${clip.id}`}
              className={cn(
                "absolute",
                clip.locked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
                isSelected
                  ? "outline outline-2 outline-primary"
                  : "outline outline-1 outline-dashed outline-purple-400/70",
              )}
              style={{
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                width: `${r.width * 100}%`,
                height: `${r.height * 100}%`,
                transform: `translate(${r.translateX}%, ${r.translateY}%) rotate(${r.rotation}deg) scale(${r.scale})`,
                transformOrigin: "center",
              }}
              onMouseDown={(e) => startDrag(e, clip, "move")}
            >
              {!isSelected && (
                <div className="absolute top-0.5 left-1 text-[10px] text-purple-200/80 pointer-events-none select-none">
                  Mask
                </div>
              )}
            </div>
          );
        })}

        {/* Selection overlay (drawn outside clip transform so handles aren't rotated) */}
        {selectedClip && !isCropping && (() => {
          const r = resolveClip(selectedClip, state.keyframes, state.currentTime);
          if (!r.visible) return null;
          return (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                width: `${r.width * 100}%`,
                height: `${r.height * 100}%`,
                transform: `translate(${r.translateX}%, ${r.translateY}%) rotate(${r.rotation}deg) scale(${r.scale})`,
                transformOrigin: "center",
              }}
            >
              <div className="absolute inset-0 ring-2 ring-primary ring-inset" />
              {/* Resize handles */}
              {handles.map((h) => {
                const styles: Record<string, React.CSSProperties> = {
                  nw: { top: -5, left: -5, cursor: "nwse-resize" },
                  n:  { top: -5, left: "calc(50% - 5px)", cursor: "ns-resize" },
                  ne: { top: -5, right: -5, cursor: "nesw-resize" },
                  e:  { top: "calc(50% - 5px)", right: -5, cursor: "ew-resize" },
                  se: { bottom: -5, right: -5, cursor: "nwse-resize" },
                  s:  { bottom: -5, left: "calc(50% - 5px)", cursor: "ns-resize" },
                  sw: { bottom: -5, left: -5, cursor: "nesw-resize" },
                  w:  { top: "calc(50% - 5px)", left: -5, cursor: "ew-resize" },
                };
                return (
                  <div
                    key={h}
                    className="absolute w-2.5 h-2.5 bg-background border-2 border-primary rounded-sm pointer-events-auto"
                    style={styles[h]}
                    onMouseDown={(e) => startDrag(e, selectedClip, h)}
                  />
                );
              })}
              {/* Rotate handle */}
              <div
                className="absolute pointer-events-auto"
                style={{ top: -28, left: "calc(50% - 6px)", width: 12, height: 12 }}
              >
                <div
                  className="w-3 h-3 rounded-full bg-primary border-2 border-background cursor-grab"
                  style={{ cursor: "grab" }}
                  onMouseDown={(e) => startDrag(e, selectedClip, "rotate")}
                />
                <div className="absolute left-1/2 top-3 w-px h-4 bg-primary -translate-x-1/2" />
              </div>
            </div>
          );
        })()}

        {/* Crop overlay (only when cropping a video/image clip) */}
        {selectedClip && isCropping && (selectedClip.mediaType === "video" || selectedClip.mediaType === "image") && (() => {
          const r = resolveClip(selectedClip, state.keyframes, state.currentTime);
          if (!r.visible) return null;
          const cx = selectedClip.cropX;
          const cy = selectedClip.cropY;
          const cw = selectedClip.cropWidth;
          const ch = selectedClip.cropHeight;
          return (
            <div
              className="absolute"
              style={{
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                width: `${r.width * 100}%`,
                height: `${r.height * 100}%`,
                transform: `translate(${r.translateX}%, ${r.translateY}%) rotate(${r.rotation}deg) scale(${r.scale})`,
                transformOrigin: "center",
              }}
            >
              {/* Dimmed regions outside the crop rectangle */}
              <div
                className="absolute bg-black/60 pointer-events-none"
                style={{ left: 0, top: 0, right: 0, height: `${cy * 100}%` }}
              />
              <div
                className="absolute bg-black/60 pointer-events-none"
                style={{ left: 0, top: `${(cy + ch) * 100}%`, right: 0, bottom: 0 }}
              />
              <div
                className="absolute bg-black/60 pointer-events-none"
                style={{ left: 0, top: `${cy * 100}%`, width: `${cx * 100}%`, height: `${ch * 100}%` }}
              />
              <div
                className="absolute bg-black/60 pointer-events-none"
                style={{ left: `${(cx + cw) * 100}%`, top: `${cy * 100}%`, right: 0, height: `${ch * 100}%` }}
              />

              {/* Crop rectangle frame + pan area + handles */}
              <div
                className="absolute ring-2 ring-amber-400 cursor-move"
                style={{
                  left: `${cx * 100}%`,
                  top: `${cy * 100}%`,
                  width: `${cw * 100}%`,
                  height: `${ch * 100}%`,
                }}
                onMouseDown={(e) => startDrag(e, selectedClip, "cropMove")}
              >
                {/* Rule-of-thirds grid */}
                <div className="absolute inset-0 pointer-events-none" style={{
                  backgroundImage: "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
                  backgroundSize: "33.333% 33.333%",
                  backgroundPosition: "33.333% 33.333%",
                }} />
                {handles.map((h) => {
                  const styles: Record<string, React.CSSProperties> = {
                    nw: { top: -6, left: -6, cursor: "nwse-resize" },
                    n:  { top: -6, left: "calc(50% - 6px)", cursor: "ns-resize" },
                    ne: { top: -6, right: -6, cursor: "nesw-resize" },
                    e:  { top: "calc(50% - 6px)", right: -6, cursor: "ew-resize" },
                    se: { bottom: -6, right: -6, cursor: "nwse-resize" },
                    s:  { bottom: -6, left: "calc(50% - 6px)", cursor: "ns-resize" },
                    sw: { bottom: -6, left: -6, cursor: "nesw-resize" },
                    w:  { top: "calc(50% - 6px)", left: -6, cursor: "ew-resize" },
                  };
                  return (
                    <div
                      key={h}
                      className="absolute w-3 h-3 bg-amber-400 border-2 border-background rounded-sm"
                      style={styles[h]}
                      onMouseDown={(e) => startDrag(e, selectedClip, `crop:${h}`)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Crop mode toolbar */}
        {selectedClip && isCropping && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-black/80 border border-white/10 backdrop-blur-sm shadow-lg z-10 pointer-events-auto">
            <span className="text-amber-400 text-[11px] font-medium px-1">Crop Mode</span>
            <button
              className="text-[11px] text-white/80 hover:text-white px-2 py-0.5 rounded hover:bg-white/10"
              onClick={() => dispatch({ type: "UPDATE_CLIP", payload: { id: selectedClip.id, updates: { cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1 } } })}
            >Reset</button>
            <button
              className="text-[11px] text-white bg-amber-500 hover:bg-amber-400 px-2 py-0.5 rounded font-medium"
              onClick={() => onCroppingChange(false)}
            >Done (Esc)</button>
          </div>
        )}

        {/* Snap guides */}
        {snapGuides.x !== undefined && (
          <div
            className="absolute top-0 bottom-0 w-px bg-pink-500 pointer-events-none"
            style={{ left: `${snapGuides.x * 100}%` }}
          />
        )}
        {snapGuides.y !== undefined && (
          <div
            className="absolute left-0 right-0 h-px bg-pink-500 pointer-events-none"
            style={{ top: `${snapGuides.y * 100}%` }}
          />
        )}

        {state.clips.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm">
            Add clips from the media panel to begin
          </div>
        )}

        <div className="absolute bottom-2 right-3 text-white/40 text-xs font-mono tabular-nums pointer-events-none">
          {state.canvasWidth}×{state.canvasHeight} · {Math.round(canvasZoom * 100)}%
        </div>
        </div>
      </div>
    </div>
  );
}
