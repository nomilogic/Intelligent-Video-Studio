import { useRef, useEffect, useCallback } from "react";
import type { Clip } from "../lib/types";
import { drawWaves } from "../lib/waves";

interface WavesOverlayProps {
  clip: Clip;
  currentTime: number;
}

export default function WavesOverlay({ clip, currentTime }: WavesOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const timeRef = useRef(currentTime);
  const clipRef = useRef(clip);

  timeRef.current = currentTime;
  clipRef.current = clip;

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w <= 0 || h <= 0) { rafRef.current = requestAnimationFrame(paint); return; }
    const tw = Math.round(w * dpr);
    const th = Math.round(h * dpr);
    if (canvas.width !== tw) canvas.width = tw;
    if (canvas.height !== th) canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    drawWaves(ctx, clipRef.current, timeRef.current, w, h);
    rafRef.current = requestAnimationFrame(paint);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {});
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full pointer-events-none"
      style={{ display: "block" }}
    />
  );
}
