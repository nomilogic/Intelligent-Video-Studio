import { useRef, useState, useCallback, useEffect, useMemo, memo } from "react";
import { EditorState, EditorAction, Clip, ClipMask } from "../lib/types";
import { makeClip } from "../lib/reducer";
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
import { textContainerStyle, textElementStyle } from "../lib/text-style";
import { cn } from "@/lib/utils";
import { getShape } from "../lib/shape-library";
import { getSpecialLayer, type SpecialDef } from "../lib/special-layers";

/**
 * Build a CSS `clip-path: inset(...)` string from a TransitionMod, or
 * undefined when no edge is inset (so we don't override a clip's
 * existing border-radius / mask styling).
 */
function buildInsetClipPath(t: number, r: number, b: number, l: number): string | undefined {
  if (t <= 0 && r <= 0 && b <= 0 && l <= 0) return undefined;
  const pct = (v: number) => `${Math.max(0, Math.min(100, v * 100)).toFixed(2)}%`;
  return `inset(${pct(t)} ${pct(r)} ${pct(b)} ${pct(l)})`;
}

/**
 * Convert a Fill (solid | linear gradient | radial gradient) into a CSS
 * background string. Used by shape clips and any other paintable area.
 */
function fillToCss(fill: { kind: string; [k: string]: any } | undefined, fallback: string): string {
  if (!fill) return fallback;
  if (fill.kind === "solid") return fill.color;
  if (fill.kind === "linear") {
    const stops = fill.stops.map(([o, c]: [number, string]) => `${c} ${(o * 100).toFixed(1)}%`).join(", ");
    return `linear-gradient(${fill.angle}deg, ${stops})`;
  }
  if (fill.kind === "radial") {
    const stops = fill.stops.map(([o, c]: [number, string]) => `${c} ${(o * 100).toFixed(1)}%`).join(", ");
    return `radial-gradient(circle at ${(fill.cx * 100).toFixed(1)}% ${(fill.cy * 100).toFixed(1)}%, ${stops})`;
  }
  return fallback;
}

/**
 * CSS background recipe for a SpecialLayer preset. Mirrors the kinds in
 * `lib/special-layers.ts`. The `intensity` knob biases opacity, and the
 * primary/secondary colors come from the preset (or per-clip overrides).
 */
function specialLayerCss(def: SpecialDef, intensity: number, colorOverride?: string): React.CSSProperties {
  const i = Math.max(0, Math.min(1, intensity));
  const c1 = colorOverride || def.color;
  const c2 = def.color2 || "transparent";
  const p = def.params || {};
  const blendMode = (def.blend || "normal") as React.CSSProperties["mixBlendMode"];
  switch (def.kind) {
    case "solidTint":       return { backgroundColor: c1, opacity: i, mixBlendMode: blendMode };
    case "linearGradient":  return { background: `linear-gradient(${p.angle ?? 180}deg, ${c1}, ${c2})`, opacity: i, mixBlendMode: blendMode };
    case "radialGradient":  return { background: `radial-gradient(circle at ${(p.cx ?? 0.5) * 100}% ${(p.cy ?? 0.5) * 100}%, ${c1}, ${c2} ${(p.r ?? 0.7) * 100}%)`, opacity: i, mixBlendMode: blendMode };
    case "vignette":        return { background: `radial-gradient(ellipse at center, transparent 40%, ${c1} 100%)`, opacity: i, mixBlendMode: blendMode };
    case "lightLeak":       return { background: `radial-gradient(circle at ${(p.cx ?? 0.7) * 100}% ${(p.cy ?? 0.3) * 100}%, ${c1} 0%, transparent ${(p.r ?? 0.6) * 100}%)`, opacity: i, mixBlendMode: blendMode };
    case "lensFlare":       return { background: `radial-gradient(circle at ${(p.cx ?? 0.75) * 100}% ${(p.cy ?? 0.25) * 100}%, ${c1} 0%, transparent 8%), radial-gradient(circle at ${(p.cx ?? 0.75) * 100}% ${(p.cy ?? 0.25) * 100}%, ${c1} 0%, transparent 30%)`, opacity: i, mixBlendMode: blendMode };
    case "filmGrain":       return { backgroundImage: NOISE_SVG_BG((p.density ?? 1) * 0.9, 2, Math.min(0.9, i)), backgroundSize: "200px 200px", mixBlendMode: blendMode };
    case "scanlines":       return { backgroundImage: `repeating-linear-gradient(0deg, ${c1} 0px, ${c1} 1px, transparent 1px, transparent ${p.spacing ?? 3}px)`, opacity: i, mixBlendMode: blendMode };
    case "vScanlines":      return { backgroundImage: `repeating-linear-gradient(90deg, ${c1} 0px, ${c1} 1px, transparent 1px, transparent ${p.spacing ?? 4}px)`, opacity: i, mixBlendMode: blendMode };
    case "stripes":         return { backgroundImage: `repeating-linear-gradient(${p.angle ?? 45}deg, ${c1} 0px, ${c1} 4px, transparent 4px, transparent ${p.spacing ?? 12}px)`, opacity: i, mixBlendMode: blendMode };
    case "gridOverlay":     return { backgroundImage: `linear-gradient(${c1} 1px, transparent 1px), linear-gradient(90deg, ${c1} 1px, transparent 1px)`, backgroundSize: `${p.spacing ?? 32}px ${p.spacing ?? 32}px`, opacity: i, mixBlendMode: blendMode };
    case "colorWash":       return { background: `linear-gradient(180deg, ${c1}, ${c2})`, opacity: i, mixBlendMode: blendMode };
    case "bokeh":           return { backgroundImage: `radial-gradient(circle, ${c1} 1px, transparent 30%)`, backgroundSize: `80px 80px, 120px 120px`, opacity: i, mixBlendMode: blendMode };
    default:                return { backgroundColor: c1, opacity: i, mixBlendMode: blendMode };
  }
}

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
    const containerStyle = textContainerStyle(ts);
    const elStyle = textElementStyle(ts, fontSizeStyle);
    const curve = ts.curve || 0;

    // Curved text — render via SVG textPath along an arc. The arc's chord
    // spans the clip width, and the sagitta scales with the curve angle so
    // 0° is a flat line and ±180° is a half-circle.
    if (Math.abs(curve) >= 1 && (clip.text || "").trim().length > 0) {
      return (
        <div
          className="w-full h-full flex pointer-events-none"
          style={{
            ...containerStyle,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <CurvedText
            text={clip.text || ""}
            style={ts}
            curveDeg={curve}
            elementStyle={elStyle}
          />
        </div>
      );
    }

    return (
      <div
        className="w-full h-full flex pointer-events-none"
        style={{
          ...containerStyle,
          alignItems: "center",
          justifyContent:
            ts.align === "left" ? "flex-start" : ts.align === "right" ? "flex-end" : "center",
          overflow: "hidden",
        }}
      >
        <span style={elStyle}>{clip.text || ""}</span>
      </div>
    );
  }

  if (clip.mediaType === "shape") {
    const shape = getShape(clip.shapeKind);
    const fillCss = fillToCss(clip.fill as any, clip.color || "#ffffff");
    if (shape) {
      const stroke =
        clip.strokeColor && (clip.strokeWidth ?? 0) > 0
          ? ` stroke="${clip.strokeColor}" stroke-width="${clip.strokeWidth}" stroke-linejoin="round"`
          : "";
      // Inline the SVG so the fill string can reference a CSS gradient. We
      // use a <foreignObject>-style trick: paint the gradient on a div and
      // mask it with the SVG path. CSS gradients aren't valid SVG fills, so
      // for gradient fills we render a div behind a `mask-image` SVG.
      const isGradient = clip.fill && (clip.fill as any).kind !== "solid";
      if (isGradient) {
        const maskSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><g fill='black'>${shape.svg}</g></svg>`;
        const maskUrl = `url("data:image/svg+xml;utf8,${encodeURIComponent(maskSvg)}")`;
        return (
          <div className="w-full h-full pointer-events-none" style={{ transform: flipTransform(clip) }}>
            <div
              className="w-full h-full"
              style={{
                background: fillCss,
                WebkitMaskImage: maskUrl,
                maskImage: maskUrl,
                WebkitMaskSize: "100% 100%",
                maskSize: "100% 100%",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
              }}
            />
          </div>
        );
      }
      // Solid fill — inline SVG is simplest and handles strokes natively.
      return (
        <div
          className="w-full h-full pointer-events-none"
          style={{ transform: flipTransform(clip) }}
          dangerouslySetInnerHTML={{
            __html: `<svg width='100%' height='100%' viewBox='0 0 100 100' preserveAspectRatio='none'><g fill='${fillCss}'${stroke}>${shape.svg}</g></svg>`,
          }}
        />
      );
    }
    // Unknown shape — degrade to a solid-color filled square.
    return <div className="w-full h-full pointer-events-none" style={{ background: fillCss }} />;
  }

  if (clip.mediaType === "drawing") {
    // Drawing clip: SVG with normalized coords (0..1 → 0..100 viewBox units).
    const paths = clip.paths ?? [];
    return (
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full pointer-events-none"
        style={{ transform: flipTransform(clip) }}
      >
        {paths.map((p) => {
          if (p.points.length === 0) return null;
          const d = p.points
            .map((pt, i) => `${i === 0 ? "M" : "L"}${(pt.x * 100).toFixed(2)} ${(pt.y * 100).toFixed(2)}`)
            .join(" ");
          // Stroke width is canvas-relative; we scale to a 100-unit viewBox.
          // 1080 = canvas reference width → strokeWidth/1080*100 viewBox units.
          const sw = (p.width / 1080) * 100;
          return (
            <path
              key={p.id}
              d={d}
              fill="none"
              stroke={p.color}
              strokeOpacity={p.opacity}
              strokeWidth={sw}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              style={{ paintOrder: "stroke" }}
            />
          );
        })}
      </svg>
    );
  }

  if (clip.mediaType === "specialLayer") {
    const def = getSpecialLayer(clip.specialKind);
    const intensity = clip.specialIntensity ?? def?.intensity ?? 0.6;
    const style = def
      ? specialLayerCss(def, intensity, clip.specialColor)
      : { background: clip.specialColor || clip.color || "#ffffff", opacity: intensity };
    return <div className="w-full h-full pointer-events-none" style={style} />;
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

// Build a single canvas-sized SVG that places ONE mask-layer's source image
// at exactly the same location, scale, rotation and translate the export
// pipeline draws it (see use-export.ts → maskLayerEntries loop and
// computeMaskTargetRect). The resulting data: URL is used as a CSS mask-image
// on the media-composite wrapper so the live preview matches the exported
// frame pixel-for-pixel — including translateX/Y, scale, rotation, and the
// mask's own scale/offset/fit/opacity/invert.
function buildMaskLayerSvgUrl(
  c: { id: string },
  r: {
    x: number; y: number; width: number; height: number;
    translateX: number; translateY: number; scale: number; rotation: number;
  },
  m: ClipMask,
  canvasW: number,
  canvasH: number,
): string | null {
  if (!m.src) return null;
  const px = r.x * canvasW;
  const py = r.y * canvasH;
  const pw = r.width * canvasW;
  const ph = r.height * canvasH;
  const cx = px + pw / 2 + (r.translateX * pw) / 100;
  const cy = py + ph / 2 + (r.translateY * ph) / 100;
  const baseScale = r.scale || 1;

  // Mask placement within the clip's local box (pre-scale, pre-rotate).
  // Mirrors computeMaskTargetRect() in use-export.ts so preview = export.
  const maskScale = Math.max(0.05, m.scale ?? 1);
  const dw = pw * maskScale;
  const dh = ph * maskScale;
  const dx = -dw / 2 + (m.offsetX || 0) * pw;
  const dy = -dh / 2 + (m.offsetY || 0) * ph;

  // SVG <image> preserveAspectRatio matches the user's "fit" choice.
  const par =
    m.fit === "stretch" ? "none" : m.fit === "cover" ? "xMidYMid slice" : "xMidYMid meet";
  const opacity = Math.max(0, Math.min(1, m.opacity ?? 1));

  // Invert handling: invert all four channels so it works consistently for
  // both luminance and alpha modes (white→black and opaque→transparent).
  const filterId = `mlinv-${c.id.replace(/[^a-z0-9]/gi, "")}`;
  const filterDef = m.invert
    ? `<defs><filter id="${filterId}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="-1 0 0 0 1   0 -1 0 0 1   0 0 -1 0 1   0 0 0 -1 1"/></filter></defs>`
    : "";
  const filterAttr = m.invert ? ` filter="url(#${filterId})"` : "";

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}" preserveAspectRatio="none">` +
    filterDef +
    `<g transform="translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${(r.rotation || 0).toFixed(2)}) scale(${baseScale.toFixed(4)})"${filterAttr}>` +
    `<image href="${m.src}" x="${dx.toFixed(2)}" y="${dy.toFixed(2)}" width="${dw.toFixed(2)}" height="${dh.toFixed(2)}" preserveAspectRatio="${par}" opacity="${opacity}"/>` +
    `</g></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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
 * Renders text along a circular arc using SVG <textPath>. The arc spans the
 * width of the container; the curve angle (degrees) controls how much the
 * arc bows. Positive curve bows downward (smile), negative bows upward
 * (frown). At ±180° the text wraps a half-circle.
 */
function CurvedText({
  text,
  style,
  curveDeg,
  elementStyle,
}: {
  text: string;
  style: import("../lib/types").TextStyle;
  curveDeg: number;
  elementStyle: React.CSSProperties;
}) {
  // Use a fixed viewBox so the SVG scales with the container; consumers set
  // the SVG's CSS width/height to 100%. The arc is drawn with a normalized
  // chord of `width` pixels and a sagitta proportional to curveDeg/180.
  const W = 1000;
  const H = 1000;
  const clamped = Math.max(-180, Math.min(180, curveDeg));
  const direction = clamped >= 0 ? 1 : -1;
  const absDeg = Math.abs(clamped);
  // Sagitta: from 0 (flat) to W/2 (half-circle).
  const sagitta = (absDeg / 180) * (W / 2);
  // Compute arc radius from chord & sagitta: r = (chord^2/4 + sagitta^2)/(2*sagitta)
  const chord = W * 0.9;
  const r = sagitta < 0.5 ? 1e6 : (Math.pow(chord, 2) / 4 + Math.pow(sagitta, 2)) / (2 * sagitta);
  const cyBase = H / 2;
  // Path starts on the left of the chord and arcs to the right.
  const startX = (W - chord) / 2;
  const endX = startX + chord;
  // For a "smile" (direction=1) the arc bows downward → use sweep flag 1 and
  // the path Y starts at midline. For "frown" the arc bows upward → sweep 0.
  // Use baseline Y at middle of viewBox; large-arc flag is 0 because the
  // arc never exceeds 180° here.
  const sweep = direction === 1 ? 1 : 0;
  const y = cyBase;
  const pathD = `M ${startX} ${y} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 ${sweep} ${endX} ${y}`;
  const pathId = useMemo(() => `text-curve-${Math.random().toString(36).slice(2, 9)}`, []);
  // For an SVG textPath we can't use background-clip text gradients; instead
  // render the gradient as a real SVG <linearGradient> when enabled. Stroke
  // and shadow translate to SVG attributes.
  const grad = style.gradient;
  const stroke = style.stroke;
  const fillId = `${pathId}-grad`;
  const useGrad = grad && grad.enabled;
  // Translate elementStyle font properties for the SVG <text>.
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", overflow: "visible" }}
    >
      <defs>
        <path id={pathId} d={pathD} fill="none" />
        {useGrad && (
          <linearGradient
            id={fillId}
            x1="0%"
            y1="0%"
            x2={`${Math.cos((grad!.angle * Math.PI) / 180) * 100}%`}
            y2={`${Math.sin((grad!.angle * Math.PI) / 180) * 100}%`}
          >
            <stop offset="0%" stopColor={grad!.color1} />
            <stop offset="100%" stopColor={grad!.color2} />
          </linearGradient>
        )}
      </defs>
      <text
        fontFamily={style.fontFamily}
        fontWeight={style.fontWeight}
        fontStyle={style.italic ? "italic" : "normal"}
        textDecoration={style.underline ? "underline" : undefined}
        fill={useGrad ? `url(#${fillId})` : style.color}
        stroke={stroke && stroke.enabled && stroke.width > 0 ? stroke.color : undefined}
        strokeWidth={stroke && stroke.enabled ? stroke.width * 2 : undefined}
        paintOrder="stroke"
        style={{
          fontSize: `${(style.fontSize / 64) * 120}px`,
          letterSpacing:
            style.letterSpacing != null ? `${style.letterSpacing}px` : undefined,
          filter: elementStyle.textShadow
            ? `drop-shadow(0 2px 6px rgba(0,0,0,0.4))`
            : undefined,
        }}
      >
        <textPath
          href={`#${pathId}`}
          startOffset="50%"
          textAnchor="middle"
        >
          {text}
        </textPath>
      </text>
    </svg>
  );
}

/**
 * Inline text editor for text clips on the canvas. Activated by double-clicking
 * a text clip. Mirrors the visual style of the rendered text so the editor is
 * "in place" rather than a separate overlay. Commits on blur or Enter (without
 * Shift, which inserts a newline). Esc cancels.
 */
function TextEditor({
  clip,
  onCommit,
  onCancel,
}: {
  clip: Clip;
  onCommit: (text: string) => void;
  onCancel: () => void;
}) {
  const ts = clip.textStyle!;
  const [value, setValue] = useState(clip.text || "");
  const ref = useRef<HTMLTextAreaElement>(null);
  const autoScale = clip.textAutoScale !== false;
  const fontSizeStyle = autoScale
    ? `${ts.fontSize / 10}cqw`
    : `calc(var(--canvas-w, 100cqw) * ${ts.fontSize / 1000})`;

  // Auto-grow the textarea to match its content so the surrounding flex
  // container can keep it visually centered (matching the rendered text
  // exactly). Without this, a fixed `height: 100%` textarea would top-align
  // the caret and cause the text to "jump" upward when editing begins.
  const autosize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.select();
    autosize();
  }, [autosize]);

  useEffect(() => {
    autosize();
  }, [value, autosize]);

  const containerStyle = textContainerStyle(ts);
  const elStyle = textElementStyle(ts, fontSizeStyle);
  // While editing, we drop the SVG-curved view and the gradient-clip styling
  // (which would make the caret invisible). The text editor mirrors basic
  // typography only — full effects re-apply when editing finishes.
  return (
    <div
      className="w-full h-full flex"
      style={{
        ...containerStyle,
        alignItems: "center",
        justifyContent:
          ts.align === "left" ? "flex-start" : ts.align === "right" ? "flex-end" : "center",
        overflow: "hidden",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => onCommit(value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onCommit(value);
          }
        }}
        spellCheck={false}
        rows={1}
        className="bg-transparent border-none outline-none resize-none p-0 m-0 w-full block"
        style={{
          ...elStyle,
          // Drop gradient-clip so the caret stays visible during editing.
          background: "transparent",
          backgroundImage: undefined,
          WebkitBackgroundClip: undefined,
          WebkitTextFillColor: ts.color,
          color: ts.color,
          caretColor: ts.color,
          overflow: "hidden",
          height: "auto",
          minHeight: 0,
        }}
        data-testid={`canvas-text-editor-${clip.id}`}
      />
    </div>
  );
}

/**
 * Renders the per-clip post-effect overlays (vignette, scanlines, tint).
 * These are stacked inset divs that sit on top of the clip's media. Effects
 * that translate to CSS filters / transforms are applied at the wrapper level
 * via getEffectImpact() and are not drawn here.
 */
// Reusable inline SVG turbulence noise filter — used as a `filter:` source
// for divs that want a procedural grain texture without shipping any image
// assets. Each kind picks a different baseFrequency / octaves combo.
const NOISE_SVG_BG = (freq: number, octaves: number, alpha: number) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>` +
      `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${octaves}' stitchTiles='stitch'/>` +
      `<feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 ${alpha} 0'/></filter>` +
      `<rect width='100%' height='100%' filter='url(%23n)'/></svg>`,
  )}")`;

function EffectOverlays({ overlays }: { overlays: EffectOverlay[] }) {
  if (!overlays || overlays.length === 0) return null;
  return (
    <>
      {overlays.map((o, i) => {
        const k = o.kind;
        // ── Vignette family ───────────────────────────────────────────
        if (k === "vignette" || k === "vignetteSoft" || k === "vignetteHard" || k === "vignetteOval" || k === "vignetteCorner") {
          const dark = Math.min(0.9, 0.85 * o.intensity);
          // Each variant tweaks center transparency stop / shape / spread.
          const grad =
            k === "vignetteSoft"
              ? `radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,${dark.toFixed(2)}) 100%)`
              : k === "vignetteHard"
              ? `radial-gradient(circle at center, transparent 25%, rgba(0,0,0,${dark.toFixed(2)}) 75%)`
              : k === "vignetteOval"
              ? `radial-gradient(ellipse 70% 90% at center, transparent 30%, rgba(0,0,0,${dark.toFixed(2)}) 100%)`
              : k === "vignetteCorner"
              ? `radial-gradient(ellipse at top left, transparent 30%, rgba(0,0,0,${dark.toFixed(2)}) 100%)`
              : `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${dark.toFixed(2)}) 100%)`;
          return <div key={`v-${i}`} className="absolute inset-0 pointer-events-none" style={{ background: grad }} />;
        }
        // ── Scanlines family ─────────────────────────────────────────
        if (k === "scanlines" || k === "scanlinesThick" || k === "scanlinesVertical" || k === "scanlinesCRT") {
          const alpha = Math.min(0.6, 0.4 * o.intensity + 0.05);
          const a = alpha.toFixed(2);
          const grad =
            k === "scanlinesThick"
              ? `repeating-linear-gradient(0deg, rgba(0,0,0,${a}) 0px, rgba(0,0,0,${a}) 3px, transparent 3px, transparent 6px)`
              : k === "scanlinesVertical"
              ? `repeating-linear-gradient(90deg, rgba(0,0,0,${a}) 0px, rgba(0,0,0,${a}) 1px, transparent 1px, transparent 4px)`
              : k === "scanlinesCRT"
              ? `repeating-linear-gradient(0deg, rgba(0,0,0,${a}) 0px, rgba(0,0,0,${a}) 1px, transparent 1px, transparent 3px), repeating-linear-gradient(90deg, rgba(255,0,0,${(alpha * 0.3).toFixed(2)}) 0px, rgba(0,255,0,${(alpha * 0.3).toFixed(2)}) 1px, rgba(0,0,255,${(alpha * 0.3).toFixed(2)}) 2px, transparent 3px)`
              : `repeating-linear-gradient(0deg, rgba(0,0,0,${a}) 0px, rgba(0,0,0,${a}) 1px, transparent 1px, transparent 3px)`;
          return <div key={`s-${i}`} className="absolute inset-0 pointer-events-none mix-blend-multiply" style={{ backgroundImage: grad }} />;
        }
        // ── Tint ─────────────────────────────────────────────────────
        if (k === "tint") {
          const alpha = Math.min(0.7, 0.5 * o.intensity);
          return <div key={`t-${i}`} className="absolute inset-0 pointer-events-none mix-blend-color" style={{ backgroundColor: o.color, opacity: alpha }} />;
        }
        // ── Noise / film grain ───────────────────────────────────────
        if (k === "noise" || k === "filmGrain" || k === "filmGrainHeavy") {
          const a = k === "filmGrainHeavy" ? 0.9 * o.intensity
                  : k === "filmGrain"      ? 0.6 * o.intensity
                                            : 0.45 * o.intensity;
          const freq = k === "filmGrainHeavy" ? 1.4 : k === "filmGrain" ? 0.95 : 0.7;
          return (
            <div
              key={`n-${i}`}
              className="absolute inset-0 pointer-events-none mix-blend-overlay"
              style={{ backgroundImage: NOISE_SVG_BG(freq, 2, Math.min(0.9, a)), backgroundSize: "200px 200px" }}
            />
          );
        }
        // ── Halftone ─────────────────────────────────────────────────
        if (k === "halftone") {
          const a = (0.4 + 0.5 * o.intensity).toFixed(2);
          return (
            <div
              key={`h-${i}`}
              className="absolute inset-0 pointer-events-none mix-blend-multiply"
              style={{
                backgroundImage: `radial-gradient(circle, rgba(0,0,0,${a}) 1px, transparent 2px)`,
                backgroundSize: `${Math.round(6 + 8 * (1 - o.intensity))}px ${Math.round(6 + 8 * (1 - o.intensity))}px`,
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
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  // Active free-hand stroke while the draw tool is held. Coordinates are
  // normalized 0..1 against the canvas (NOT the clip), since drawing clips
  // currently always span the full canvas.
  const [activeStroke, setActiveStroke] = useState<{ x: number; y: number }[] | null>(null);

  // Exit inline text editing whenever the user selects something else, deletes
  // the clip being edited, or switches into crop mode.
  useEffect(() => {
    if (!editingTextId) return;
    const stillExists = state.clips.some((c) => c.id === editingTextId);
    const stillSelected = state.selectedClipIds.includes(editingTextId);
    if (!stillExists || !stillSelected || isCropping) setEditingTextId(null);
  }, [editingTextId, state.clips, state.selectedClipIds, isCropping]);

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

  // Tracks marked hidden via the eye icon in the timeline header should
  // disappear from the canvas entirely — not just dim in the timeline.
  const hiddenTrackIndices = useMemo(
    () =>
      new Set(
        state.tracks
          .map((t, i) => (t.hidden ? i : -1))
          .filter((i) => i >= 0),
      ),
    [state.tracks],
  );
  const visibleClips = useMemo(
    () =>
      state.clips
        .filter(
          (c) =>
            clipVisibleAt(c, state.currentTime) &&
            !c.hidden &&
            !hiddenTrackIndices.has(c.trackIndex),
        )
        .sort((a, b) => b.trackIndex - a.trackIndex),
    [state.clips, state.currentTime, hiddenTrackIndices],
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

  // Per-mask-layer reach: a mask at trackIndex T with depth N affects
  // clips on tracks (T-N .. T-1]. Depth 0/undefined = all tracks below.
  // Returns the CSS-mask style (already canvas-sized via SVG) that should
  // wrap a given media clip — empty object if no masks affect it.
  const clipMaskStyle = useMemo(() => {
    const W = state.canvasWidth;
    const H = state.canvasHeight;
    // Pre-resolve each visible mask layer once per render so we don't redo
    // keyframe sampling per affected clip.
    const resolvedMasks = maskLayerClips
      .map((c) => {
        const r = resolveClip(c, state.keyframes, state.currentTime);
        return r.visible ? { c, r } : null;
      })
      .filter((x): x is { c: typeof maskLayerClips[number]; r: ReturnType<typeof resolveClip> } => !!x);

    return (clip: { trackIndex: number }): React.CSSProperties => {
      if (resolvedMasks.length === 0) return {};
      const images: string[] = [];
      const modes: string[] = [];
      for (const { c, r } of resolvedMasks) {
        const depth = c.maskAffectsTracksBelow ?? 0;
        // Lower trackIndex = drawn first / underneath. A mask only ever
        // affects clips on tracks BELOW (lower index), and only within the
        // depth window if one is set.
        if (clip.trackIndex >= c.trackIndex) continue;
        if (depth > 0 && clip.trackIndex < c.trackIndex - depth) continue;
        const m = c.mask;
        if (!m || !m.src) continue;
        const url = buildMaskLayerSvgUrl(c, r, m, W, H);
        if (!url) continue;
        images.push(`url("${url}")`);
        modes.push(m.mode === "luminance" ? "luminance" : "alpha");
      }
      if (images.length === 0) return {};
      const sizes = images.map(() => "100% 100%").join(", ");
      const positions = images.map(() => "0% 0%").join(", ");
      const repeats = images.map(() => "no-repeat").join(", ");
      return {
        WebkitMaskImage: images.join(", "),
        maskImage: images.join(", "),
        WebkitMaskSize: sizes,
        maskSize: sizes,
        WebkitMaskPosition: positions,
        maskPosition: positions,
        WebkitMaskRepeat: repeats,
        maskRepeat: repeats,
        maskMode: modes.join(", ") as any,
      };
    };
  }, [maskLayerClips, state.keyframes, state.currentTime, state.canvasWidth, state.canvasHeight]);

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
        {/* Draw-tool overlay — sits on top of everything when the pen is
            active and captures pointer events into a stroke buffer. */}
        {state.tool === "draw" && (
          <div
            className="absolute inset-0 z-40 cursor-crosshair"
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width;
              const y = (e.clientY - rect.top) / rect.height;
              setActiveStroke([{ x, y }]);
            }}
            onMouseMove={(e) => {
              if (!activeStroke) return;
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width;
              const y = (e.clientY - rect.top) / rect.height;
              setActiveStroke((s) => (s ? [...s, { x, y }] : s));
            }}
            onMouseUp={() => {
              if (!activeStroke || activeStroke.length < 2) {
                setActiveStroke(null);
                return;
              }
              const brush = state.drawBrush;
              const path = {
                id: `pth_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
                color: brush.color,
                width: brush.width,
                opacity: brush.opacity,
                kind: brush.kind,
                points: activeStroke,
              };
              const newClip: Clip = makeClip({
                mediaType: "drawing",
                label: "Drawing",
                color: brush.color,
                startTime: state.currentTime,
                duration: 5,
                trackIndex: 0,
                paths: [path],
              });
              dispatch({ type: "ADD_CLIP", payload: newClip });
              setActiveStroke(null);
            }}
            onMouseLeave={() => setActiveStroke(null)}
          >
            {activeStroke && activeStroke.length > 0 && (
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="w-full h-full pointer-events-none"
              >
                <path
                  d={activeStroke
                    .map((pt, i) => `${i === 0 ? "M" : "L"}${(pt.x * 100).toFixed(2)} ${(pt.y * 100).toFixed(2)}`)
                    .join(" ")}
                  fill="none"
                  stroke={state.drawBrush.color}
                  strokeOpacity={state.drawBrush.opacity}
                  strokeWidth={(state.drawBrush.width / 1080) * 100}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}
          </div>
        )}

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
          Media-clip composite. Masks are applied PER CLIP (respecting each
          mask layer's optional `maskAffectsTracksBelow` depth setting), so a
          mask only cuts the tracks the user wants it to. Each clip whose
          track is in a mask's reach gets wrapped in a canvas-sized mask
          box; clips with no masks render directly.
        */}
        <div
          className="absolute inset-0"
          data-testid="canvas-media-composite"
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
                  transform: `translate(${pr.translateX + out.translateXPct + pFx.shakeXPct}%, ${pr.translateY + out.translateYPct + pFx.shakeYPct}%) rotate(${pr.rotation + out.rotateExtraDeg}deg) scale(${pr.scale * out.scaleMul})`,
                  mixBlendMode: prev.blendMode as any,
                  filter: combineFilterCss(pr.filterCss, pFx.extraFilter, out.blurExtra),
                  borderRadius: `${prev.borderRadius}px`,
                  transformOrigin: "center",
                  clipPath: buildInsetClipPath(out.clipInsetTop, out.clipInsetRight, out.clipInsetBottom, out.clipInsetLeft),
                  containerType: "size",
                }}
              >
                <MediaContent clip={prev} videoTime={pr.videoTime} isPlaying={false} showFullSource={false} />
                <EffectOverlays overlays={pFx.overlays} />
                {out.overlayColor && out.overlayAlpha > 0 ? (
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: out.overlayColor, opacity: out.overlayAlpha }}
                  />
                ) : null}
              </div>,
            );
          }

          // 2. The clip itself (with incoming transition + effects).
          const isEditingText = editingTextId === clip.id && clip.mediaType === "text";
          nodes.push(
            <div
              key={clip.id}
              data-testid={`canvas-clip-${clip.id}`}
              className={cn(
                "absolute overflow-hidden",
                clip.locked
                  ? "cursor-not-allowed"
                  : cropThis
                  ? "cursor-default"
                  : isEditingText
                  ? "cursor-text"
                  : "cursor-grab active:cursor-grabbing",
                isSelected && !cropThis && "outline outline-2 outline-primary outline-offset-0",
                isEditingText && "outline outline-2 outline-primary outline-offset-0 ring-2 ring-primary/30",
              )}
              style={{
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                width: `${r.width * 100}%`,
                height: `${r.height * 100}%`,
                opacity: r.opacity * incomingMod.opacityMul,
                transform: `translate(${r.translateX + incomingMod.translateXPct + fxImpact.shakeXPct}%, ${r.translateY + incomingMod.translateYPct + fxImpact.shakeYPct}%) rotate(${r.rotation + incomingMod.rotateExtraDeg}deg) scale(${r.scale * incomingMod.scaleMul})`,
                mixBlendMode: clip.blendMode as any,
                filter: combineFilterCss(r.filterCss, fxImpact.extraFilter, incomingMod.blurExtra),
                borderRadius: cropThis ? 0 : `${clip.borderRadius}px`,
                transformOrigin: "center",
                clipPath: buildInsetClipPath(incomingMod.clipInsetTop, incomingMod.clipInsetRight, incomingMod.clipInsetBottom, incomingMod.clipInsetLeft),
                containerType: "size",
                ...buildMaskStyle(clip.mask),
              }}
              onMouseDown={
                cropThis || isEditingText ? undefined : (e) => startDrag(e, clip, "move")
              }
              onDoubleClick={
                clip.mediaType === "text" && !clip.locked && !cropThis
                  ? (e) => {
                      e.stopPropagation();
                      dispatch({ type: "SELECT_CLIP", payload: clip.id });
                      setEditingTextId(clip.id);
                    }
                  : undefined
              }
            >
              {isEditingText ? (
                <TextEditor
                  clip={clip}
                  onCommit={(text) => {
                    dispatch({
                      type: "UPDATE_CLIP",
                      payload: { id: clip.id, updates: { text } },
                    });
                    setEditingTextId(null);
                  }}
                  onCancel={() => setEditingTextId(null)}
                />
              ) : (
                <MediaContent
                  clip={clip}
                  videoTime={r.videoTime}
                  isPlaying={state.isPlaying}
                  showFullSource={cropThis}
                />
              )}
              <EffectOverlays overlays={fxImpact.overlays} />
              {incomingMod.overlayColor && incomingMod.overlayAlpha > 0 ? (
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: incomingMod.overlayColor, opacity: incomingMod.overlayAlpha }}
                />
              ) : null}
            </div>,
          );

          // If any mask layer affects this clip's track, wrap its nodes in a
          // canvas-sized mask box so the cutout applies only to this clip
          // (and its transition ghost). Otherwise return the nodes directly.
          const maskStyle = clipMaskStyle(clip);
          const hasMask = !!(maskStyle as any).maskImage || !!(maskStyle as any).WebkitMaskImage;
          if (hasMask) {
            const wrapped: React.ReactNode[] = [
              <div
                key={`maskbox-${clip.id}`}
                className="absolute inset-0 pointer-events-none"
                style={maskStyle}
              >
                {/*
                  Inner content keeps default pointer-events so individual
                  clips remain selectable / draggable. The wrapper itself
                  only carries the CSS mask.
                */}
                <div className="absolute inset-0 pointer-events-auto">
                  {nodes}
                </div>
              </div>,
            ];
            return wrapped;
          }
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
          const m = clip.mask;
          // Inner image fit corresponds to the user's mask fit choice. Scale
          // and offset are baked into the wrapper so the preview overlay
          // sits exactly where the actual mask cutout will be.
          const innerScale = Math.max(0.05, m?.scale ?? 1);
          const innerOffsetX = (m?.offsetX ?? 0) * 100;
          const innerOffsetY = (m?.offsetY ?? 0) * 100;
          const objectFit: React.CSSProperties["objectFit"] =
            m?.fit === "stretch" ? "fill" : m?.fit === "cover" ? "cover" : "contain";
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
              {/*
                10% opacity preview of the mask shape — only shown while the
                video is paused so editors can see exactly where the cutout
                sits. Hidden during playback so the viewer just sees the
                clean masked composite. Inverted color/alpha are mirrored
                here so the preview matches the live cutout.
              */}
              {m?.src && !state.isPlaying && (
                <img
                  src={m.src}
                  alt=""
                  draggable={false}
                  className="absolute pointer-events-none select-none"
                  style={{
                    left: "50%",
                    top: "50%",
                    width: `${innerScale * 100}%`,
                    height: `${innerScale * 100}%`,
                    transform: `translate(calc(-50% + ${innerOffsetX}%), calc(-50% + ${innerOffsetY}%))`,
                    objectFit,
                    opacity: 0.1 * (m.opacity ?? 1),
                    filter: m.invert ? "invert(1)" : undefined,
                    mixBlendMode: "screen",
                  }}
                />
              )}
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
