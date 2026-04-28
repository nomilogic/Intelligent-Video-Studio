/**
 * Shared motion-path preset definitions and keyframe builder.
 * Used by PropertiesInspector (apply preset to existing clip) and
 * MediaPanel (bake animation into newly-added animated text layers).
 */

import type { EasingType } from "./types";

export const MOTION_PATHS = [
  { key: "none",       label: "— Select a path —" },
  { key: "arc-lr",     label: "Arc Left → Right" },
  { key: "arc-rl",     label: "Arc Right → Left" },
  { key: "bounce",     label: "Bounce" },
  { key: "rise",       label: "Rise Up" },
  { key: "drift-l",    label: "Drift Left" },
  { key: "drift-r",    label: "Drift Right" },
  { key: "shake",      label: "Shake" },
  { key: "circle",     label: "Circle Loop" },
  { key: "figure8",    label: "Figure-8" },
  { key: "zoom-pulse", label: "Zoom Pulse" },
  { key: "pendulum",   label: "Pendulum Swing" },
  { key: "float",      label: "Float (gentle bob)" },
  { key: "spiral",     label: "Spiral Zoom Out" },
  { key: "slide-in-l", label: "Slide In from Left" },
  { key: "slide-in-r", label: "Slide In from Right" },
];

export interface MotionKeyframe {
  property: string;
  time: number;
  value: number;
  easing: EasingType;
}

interface ClipSnapshot {
  id: string;
  startTime: number;
  duration: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export function buildMotionKeyframes(preset: string, clip: ClipSnapshot): MotionKeyframe[] {
  const t0 = clip.startTime;
  const dur = Math.max(0.5, clip.duration);
  const t1 = t0 + dur;
  const cx = clip.x, cy = clip.y, cs = clip.scale, cr = clip.rotation;
  const pt = (frac: number) => t0 + frac * dur;
  const kf = (property: string, time: number, value: number, easing: EasingType = "quadInOut"): MotionKeyframe => ({ property, time, value, easing });

  switch (preset) {
    case "arc-lr": return [
      kf("x", t0, cx - 0.3), kf("x", pt(0.5), cx), kf("x", t1 - 0.05, cx + 0.3),
      kf("y", t0, cy),        kf("y", pt(0.5), cy - 0.08), kf("y", t1 - 0.05, cy),
    ];
    case "arc-rl": return [
      kf("x", t0, cx + 0.3), kf("x", pt(0.5), cx), kf("x", t1 - 0.05, cx - 0.3),
      kf("y", t0, cy),        kf("y", pt(0.5), cy - 0.08), kf("y", t1 - 0.05, cy),
    ];
    case "bounce": return [
      kf("y", t0, cy - 0.25, "linear"), kf("y", pt(0.25), cy, "bounceOut"),
      kf("y", pt(0.5), cy - 0.12, "quadOut"), kf("y", pt(0.75), cy, "bounceOut"),
      kf("y", t1 - 0.05, cy - 0.04, "linear"),
    ];
    case "rise":    return [kf("y", t0, cy + 0.2), kf("y", t1 - 0.05, cy - 0.05)];
    case "drift-l": return [kf("x", t0, cx), kf("x", t1 - 0.05, cx - 0.15, "sineInOut")];
    case "drift-r": return [kf("x", t0, cx), kf("x", t1 - 0.05, cx + 0.15, "sineInOut")];
    case "shake": {
      const kfs: MotionKeyframe[] = [kf("x", t0, cx, "linear")];
      for (let i = 1; i <= 10; i++) kfs.push(kf("x", pt(i / 10), cx + (i % 2 === 0 ? 0.02 : -0.02), "linear"));
      kfs.push(kf("x", t1 - 0.05, cx, "linear"));
      return kfs;
    }
    case "circle": {
      const R = 0.1; const steps = 12; const kfs: MotionKeyframe[] = [];
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        kfs.push(kf("x", pt(i / steps), cx + Math.cos(a) * R, "linear"));
        kfs.push(kf("y", pt(i / steps), cy + Math.sin(a) * R * 0.55, "linear"));
      }
      return kfs;
    }
    case "figure8": {
      const R = 0.12; const steps = 16; const kfs: MotionKeyframe[] = [];
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const s = 1 / (1 + Math.sin(a) * Math.sin(a));
        kfs.push(kf("x", pt(i / steps), cx + R * Math.cos(a) * s, "linear"));
        kfs.push(kf("y", pt(i / steps), cy + R * 0.4 * Math.sin(2 * a) * s, "linear"));
      }
      return kfs;
    }
    case "zoom-pulse": return [
      kf("scale", t0, cs),              kf("scale", pt(0.25), cs * 1.15, "sineInOut"),
      kf("scale", pt(0.5), cs, "sineInOut"), kf("scale", pt(0.75), cs * 1.15, "sineInOut"),
      kf("scale", t1 - 0.05, cs, "sineInOut"),
    ];
    case "pendulum": return [
      kf("rotation", t0, cr - 12, "sineInOut"), kf("rotation", pt(0.25), cr + 12, "sineInOut"),
      kf("rotation", pt(0.5), cr - 12, "sineInOut"), kf("rotation", pt(0.75), cr + 12, "sineInOut"),
      kf("rotation", t1 - 0.05, cr, "sineInOut"),
    ];
    case "float": return [
      kf("y", t0, cy, "sineInOut"), kf("y", pt(0.25), cy - 0.03, "sineInOut"),
      kf("y", pt(0.5), cy, "sineInOut"), kf("y", pt(0.75), cy + 0.03, "sineInOut"),
      kf("y", t1 - 0.05, cy, "sineInOut"),
    ];
    case "spiral": return [
      kf("scale", t0, cs * 1.5), kf("scale", t1 - 0.05, cs * 0.7),
      kf("rotation", t0, cr),    kf("rotation", t1 - 0.05, cr + 360),
    ];
    case "slide-in-l": return [kf("x", t0, cx - 0.5), kf("x", pt(0.4), cx, "backOut")];
    case "slide-in-r": return [kf("x", t0, cx + 0.5), kf("x", pt(0.4), cx, "backOut")];
    default: return [];
  }
}
