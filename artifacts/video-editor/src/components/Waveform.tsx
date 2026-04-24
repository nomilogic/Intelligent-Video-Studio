import { useEffect, useRef, useState } from "react";

const peakCache = new Map<string, number[]>();
const inflightCache = new Map<string, Promise<number[] | null>>();

async function computePeaks(src: string, samples: number): Promise<number[] | null> {
  const cacheKey = `${src}::${samples}`;
  const cached = peakCache.get(cacheKey);
  if (cached) return cached;
  if (inflightCache.has(cacheKey)) return inflightCache.get(cacheKey)!;

  const p = (async () => {
    try {
      const res = await fetch(src);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      const AC: typeof AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      const ctx = new AC();
      const audioBuf = await ctx.decodeAudioData(buf);
      const channel = audioBuf.getChannelData(0);
      const blockSize = Math.max(1, Math.floor(channel.length / samples));
      const peaks: number[] = [];
      for (let i = 0; i < samples; i++) {
        let max = 0;
        const start = i * blockSize;
        const end = Math.min(channel.length, start + blockSize);
        for (let j = start; j < end; j++) {
          const v = Math.abs(channel[j]);
          if (v > max) max = v;
        }
        peaks.push(max);
      }
      try { ctx.close(); } catch {}
      peakCache.set(cacheKey, peaks);
      return peaks;
    } catch {
      return null;
    } finally {
      inflightCache.delete(cacheKey);
    }
  })();

  inflightCache.set(cacheKey, p);
  return p;
}

interface WaveformProps {
  src: string;
  width: number;
  height: number;
  color?: string;
  trimStart?: number;
  duration?: number;
  sourceDuration?: number;
}

export default function Waveform({
  src,
  width,
  height,
  color = "rgba(255,255,255,0.55)",
  trimStart = 0,
  duration,
  sourceDuration,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const targetSamples = Math.min(800, Math.max(60, Math.round(width / 2)));

  useEffect(() => {
    let cancelled = false;
    computePeaks(src, targetSamples).then((p) => {
      if (!cancelled) setPeaks(p);
    });
    return () => {
      cancelled = true;
    };
  }, [src, targetSamples]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (!peaks || peaks.length === 0) {
      // Placeholder thin line
      ctx.fillStyle = color;
      ctx.fillRect(0, height / 2 - 0.5, width, 1);
      return;
    }

    // Map: visible portion of source to render
    const total = sourceDuration ?? peaks.length;
    const startFrac = total > 0 ? trimStart / total : 0;
    const endFrac =
      total > 0 && duration !== undefined
        ? Math.min(1, (trimStart + duration) / total)
        : 1;
    const startIdx = Math.floor(startFrac * peaks.length);
    const endIdx = Math.max(startIdx + 1, Math.floor(endFrac * peaks.length));

    const visiblePeaks = peaks.slice(startIdx, endIdx);
    const step = Math.max(1, Math.floor(visiblePeaks.length / Math.max(1, width)));
    const mid = height / 2;

    ctx.fillStyle = color;
    for (let x = 0; x < width; x++) {
      const idx = Math.floor((x / width) * visiblePeaks.length);
      let max = 0;
      for (let k = 0; k < step; k++) {
        const v = visiblePeaks[idx + k] ?? 0;
        if (v > max) max = v;
      }
      const h = Math.max(1, max * height * 0.9);
      ctx.fillRect(x, mid - h / 2, 1, h);
    }
  }, [peaks, width, height, color, trimStart, duration, sourceDuration]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: "block", pointerEvents: "none" }}
      aria-hidden
    />
  );
}
