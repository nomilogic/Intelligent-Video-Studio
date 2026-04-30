/**
 * Shared motion-path preset definitions and keyframe builder.
 * Used by PropertiesInspector (apply preset to existing clip) and
 * MediaPanel (bake animation into newly-added animated text layers).
 */

import type { EasingType } from "./types";

export const MOTION_PATHS = [
  { key: "none",         label: "— Select a path —" },
  // Entrances
  { key: "slide-in-l",  label: "Slide In ← Left" },
  { key: "slide-in-r",  label: "Slide In → Right" },
  { key: "slide-in-t",  label: "Slide In ↑ Top" },
  { key: "slide-in-b",  label: "Slide In ↓ Bottom" },
  { key: "pop-in",      label: "Pop In (scale)" },
  { key: "zoom-in",     label: "Zoom In" },
  { key: "tumble-in",   label: "Tumble In" },
  { key: "swoop-in-l",  label: "Swoop In Left" },
  { key: "swoop-in-r",  label: "Swoop In Right" },
  { key: "elastic-in",  label: "Elastic Bounce In" },
  { key: "flip-in-h",   label: "Flip In Horizontal" },
  { key: "flip-in-v",   label: "Flip In Vertical" },
  // Exits
  { key: "slide-out-l", label: "Slide Out → Left" },
  { key: "slide-out-r", label: "Slide Out ← Right" },
  { key: "slide-out-t", label: "Slide Out ↑ Top" },
  { key: "slide-out-b", label: "Slide Out ↓ Bottom" },
  { key: "pop-out",     label: "Pop Out (shrink)" },
  { key: "zoom-out",    label: "Zoom Out" },
  { key: "tumble-out",  label: "Tumble Out" },
  // Arcs
  { key: "arc-lr",      label: "Arc Left → Right" },
  { key: "arc-rl",      label: "Arc Right → Left" },
  { key: "arc-up",      label: "Arc Up & Over" },
  { key: "parabola",    label: "Parabola Rise" },
  { key: "cable-car",   label: "Cable Car" },
  // Loops & cycles
  { key: "circle",      label: "Circle Loop" },
  { key: "figure8",     label: "Figure-8" },
  { key: "orbit",       label: "Wide Orbit" },
  { key: "lemniscate",  label: "Lemniscate" },
  { key: "infinity",    label: "Infinity Loop" },
  { key: "spiral",      label: "Spiral Zoom Out" },
  { key: "spiral-in",   label: "Spiral Zoom In" },
  // Oscillations
  { key: "bounce",      label: "Bounce" },
  { key: "float",       label: "Float (gentle bob)" },
  { key: "pendulum",    label: "Pendulum Swing" },
  { key: "sway",        label: "Sway" },
  { key: "heartbeat-m", label: "Heartbeat" },
  { key: "breathe",     label: "Breathe (scale)" },
  { key: "jelly",       label: "Jelly Wobble" },
  { key: "rubber-band", label: "Rubber Band" },
  // Drifts
  { key: "rise",        label: "Rise Up" },
  { key: "fall",        label: "Fall Down" },
  { key: "drift-l",     label: "Drift Left" },
  { key: "drift-r",     label: "Drift Right" },
  { key: "drift-up",    label: "Drift Up + Scale" },
  { key: "drift-diag",  label: "Diagonal Drift" },
  { key: "conveyor",    label: "Conveyor Belt" },
  // Emphasis
  { key: "shake",       label: "Shake" },
  { key: "zoom-pulse",  label: "Zoom Pulse" },
  { key: "spin-cw",     label: "Spin Clockwise" },
  { key: "spin-ccw",    label: "Spin Counter-CW" },
  { key: "spin-180",    label: "Half Spin" },
  { key: "glitch",      label: "Glitch Jump" },
  { key: "earthquake",  label: "Earthquake" },
  { key: "slam-in",     label: "Slam Down" },
  { key: "slam-out",    label: "Slam Up" },
  { key: "whip-l",      label: "Whip Left" },
  { key: "whip-r",      label: "Whip Right" },
  { key: "pop-bounce",  label: "Pop Bounce" },
  { key: "drop-kick",   label: "Drop Kick" },
  { key: "yo-yo",       label: "Yo-Yo" },
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
    case "slide-in-t":  return [kf("y", t0, cy - 0.5), kf("y", pt(0.4), cy, "backOut")];
    case "slide-in-b":  return [kf("y", t0, cy + 0.5), kf("y", pt(0.4), cy, "backOut")];
    case "slide-out-l": return [kf("x", t0, cx), kf("x", pt(0.6), cx - 0.5, "quadIn")];
    case "slide-out-r": return [kf("x", t0, cx), kf("x", pt(0.6), cx + 0.5, "quadIn")];
    case "slide-out-t": return [kf("y", t0, cy), kf("y", pt(0.6), cy - 0.5, "quadIn")];
    case "slide-out-b": return [kf("y", t0, cy), kf("y", pt(0.6), cy + 0.5, "quadIn")];
    case "pop-in": return [
      kf("scale", t0, 0), kf("scale", pt(0.2), cs * 1.2, "backOut"), kf("scale", pt(0.35), cs, "sineOut"),
    ];
    case "pop-out": return [
      kf("scale", t0, cs), kf("scale", pt(0.6), cs * 1.15, "backIn"), kf("scale", t1 - 0.05, 0, "quadIn"),
    ];
    case "zoom-in": return [kf("scale", t0, 0), kf("scale", pt(0.5), cs, "quadOut")];
    case "zoom-out": return [kf("scale", t0, cs), kf("scale", pt(0.5), 0, "quadIn")];
    case "tumble-in": return [
      kf("x", t0, cx - 0.6), kf("x", pt(0.4), cx, "backOut"),
      kf("rotation", t0, cr - 180), kf("rotation", pt(0.4), cr, "backOut"),
      kf("scale", t0, 0), kf("scale", pt(0.4), cs, "backOut"),
    ];
    case "tumble-out": return [
      kf("x", t1 - 0.05, cx + 0.6, "quadIn"),
      kf("rotation", t0, cr), kf("rotation", t1 - 0.05, cr + 180, "quadIn"),
      kf("scale", pt(0.6), cs), kf("scale", t1 - 0.05, 0, "quadIn"),
    ];
    case "swoop-in-l": return [
      kf("x", t0, cx - 0.5), kf("x", pt(0.4), cx, "backOut"),
      kf("y", t0, cy + 0.2), kf("y", pt(0.4), cy, "sineOut"),
    ];
    case "swoop-in-r": return [
      kf("x", t0, cx + 0.5), kf("x", pt(0.4), cx, "backOut"),
      kf("y", t0, cy - 0.2), kf("y", pt(0.4), cy, "sineOut"),
    ];
    case "elastic-in": return [
      kf("x", t0, cx - 0.5), kf("x", pt(0.3), cx + 0.05, "backOut"),
      kf("x", pt(0.45), cx - 0.02, "sineOut"), kf("x", pt(0.55), cx, "sineOut"),
    ];
    case "flip-in-h": return [
      kf("scale", t0, 0), kf("scale", pt(0.1), 0, "linear"), kf("scale", pt(0.5), cs, "backOut"),
    ];
    case "flip-in-v": return [
      kf("scale", t0, cs * 0.01),
      kf("scale", pt(0.4), cs, "backOut"),
    ];
    case "arc-up": return [
      kf("y", t0, cy + 0.05), kf("y", pt(0.5), cy - 0.15, "sineOut"), kf("y", t1 - 0.05, cy + 0.05, "sineIn"),
      kf("x", t0, cx - 0.2), kf("x", t1 - 0.05, cx + 0.2),
    ];
    case "parabola": return [
      kf("y", t0, cy + 0.25, "quadOut"), kf("y", pt(0.5), cy - 0.1, "quadOut"), kf("y", t1 - 0.05, cy + 0.25, "quadIn"),
    ];
    case "cable-car": return [
      kf("x", t0, cx - 0.4), kf("x", t1 - 0.05, cx + 0.4, "linear"),
      kf("y", t0, cy - 0.05), kf("y", pt(0.5), cy + 0.05, "sineInOut"), kf("y", t1 - 0.05, cy - 0.05, "sineInOut"),
    ];
    case "orbit": {
      const R2 = 0.2; const steps2 = 12; const kfs2: MotionKeyframe[] = [];
      for (let i = 0; i <= steps2; i++) {
        const a = (i / steps2) * Math.PI * 2;
        kfs2.push(kf("x", pt(i / steps2), cx + Math.cos(a) * R2, "linear"));
        kfs2.push(kf("y", pt(i / steps2), cy + Math.sin(a) * R2 * 0.5, "linear"));
      }
      return kfs2;
    }
    case "lemniscate":
    case "infinity": {
      const R3 = 0.15; const steps3 = 16; const kfs3: MotionKeyframe[] = [];
      for (let i = 0; i <= steps3; i++) {
        const a = (i / steps3) * Math.PI * 2;
        const s = 1 / (1 + Math.sin(a) * Math.sin(a));
        kfs3.push(kf("x", pt(i / steps3), cx + R3 * Math.cos(a) * s, "linear"));
        kfs3.push(kf("y", pt(i / steps3), cy + R3 * 0.5 * Math.sin(2 * a) * s, "linear"));
      }
      return kfs3;
    }
    case "spiral-in": return [
      kf("scale", t0, cs * 0.5), kf("scale", t1 - 0.05, cs),
      kf("rotation", t0, cr - 360), kf("rotation", t1 - 0.05, cr),
    ];
    case "sway": return [
      kf("rotation", t0, cr - 8, "sineInOut"), kf("rotation", pt(0.5), cr + 8, "sineInOut"), kf("rotation", t1 - 0.05, cr - 8, "sineInOut"),
    ];
    case "heartbeat-m": return [
      kf("scale", t0, cs), kf("scale", pt(0.1), cs * 1.15, "quadOut"),
      kf("scale", pt(0.2), cs, "quadIn"), kf("scale", pt(0.3), cs * 1.12, "quadOut"),
      kf("scale", pt(0.4), cs, "quadIn"), kf("scale", t1 - 0.05, cs),
    ];
    case "breathe": return [
      kf("scale", t0, cs, "sineInOut"), kf("scale", pt(0.5), cs * 1.08, "sineInOut"), kf("scale", t1 - 0.05, cs, "sineInOut"),
    ];
    case "jelly": return [
      kf("scale", t0, cs), kf("scale", pt(0.1), cs * 1.25, "sineOut"),
      kf("scale", pt(0.25), cs * 0.9, "sineOut"), kf("scale", pt(0.4), cs * 1.1, "sineOut"),
      kf("scale", pt(0.55), cs * 0.95, "sineOut"), kf("scale", pt(0.7), cs * 1.04, "sineOut"),
      kf("scale", pt(0.85), cs, "sineOut"),
    ];
    case "rubber-band": return [
      kf("scale", t0, cs), kf("scale", pt(0.1), cs * 1.35, "quadOut"),
      kf("scale", pt(0.25), cs * 0.75, "quadOut"), kf("scale", pt(0.4), cs * 1.15, "quadOut"),
      kf("scale", pt(0.55), cs * 0.92, "quadOut"), kf("scale", pt(0.7), cs, "sineOut"),
    ];
    case "fall": return [kf("y", t0, cy - 0.2), kf("y", t1 - 0.05, cy + 0.05)];
    case "drift-up": return [
      kf("y", t0, cy), kf("y", t1 - 0.05, cy - 0.15, "sineInOut"),
      kf("scale", t0, cs), kf("scale", t1 - 0.05, cs * 1.05, "sineInOut"),
    ];
    case "drift-diag": return [
      kf("x", t0, cx), kf("x", t1 - 0.05, cx + 0.12, "sineInOut"),
      kf("y", t0, cy), kf("y", t1 - 0.05, cy - 0.1, "sineInOut"),
    ];
    case "conveyor": return [kf("x", t0, cx + 0.3), kf("x", t1 - 0.05, cx - 0.3, "linear")];
    case "spin-cw": return [kf("rotation", t0, cr), kf("rotation", t1 - 0.05, cr + 360, "linear")];
    case "spin-ccw": return [kf("rotation", t0, cr), kf("rotation", t1 - 0.05, cr - 360, "linear")];
    case "spin-180": return [kf("rotation", t0, cr), kf("rotation", t1 - 0.05, cr + 180, "sineInOut")];
    case "glitch": {
      const gkfs: MotionKeyframe[] = [];
      for (let i = 0; i < 8; i++) {
        const jx = (Math.random() - 0.5) * 0.04;
        const jy = (Math.random() - 0.5) * 0.02;
        gkfs.push(kf("x", pt(i / 8), cx + jx, "linear"));
        gkfs.push(kf("y", pt(i / 8), cy + jy, "linear"));
      }
      gkfs.push(kf("x", t1 - 0.05, cx, "linear"));
      gkfs.push(kf("y", t1 - 0.05, cy, "linear"));
      return gkfs;
    }
    case "earthquake": {
      const ekfs: MotionKeyframe[] = [kf("x", t0, cx, "linear")];
      for (let i = 1; i <= 20; i++) {
        const amp = 0.03 * (1 - i / 20);
        ekfs.push(kf("x", pt(i / 20), cx + (i % 2 === 0 ? amp : -amp), "linear"));
      }
      ekfs.push(kf("x", t1 - 0.05, cx, "linear"));
      return ekfs;
    }
    case "slam-in": return [
      kf("y", t0, cy - 0.8, "linear"), kf("y", pt(0.1), cy, "bounceOut"),
    ];
    case "slam-out": return [
      kf("y", t0, cy), kf("y", pt(0.9), cy + 0.8, "quadIn"),
    ];
    case "whip-l": return [
      kf("x", t0, cx), kf("x", pt(0.05), cx + 0.05, "linear"),
      kf("x", pt(0.5), cx - 0.6, "quadIn"),
    ];
    case "whip-r": return [
      kf("x", t0, cx), kf("x", pt(0.05), cx - 0.05, "linear"),
      kf("x", pt(0.5), cx + 0.6, "quadIn"),
    ];
    case "pop-bounce": return [
      kf("scale", t0, cs), kf("scale", pt(0.1), cs * 1.3, "backOut"),
      kf("scale", pt(0.2), cs * 0.85, "bounceOut"), kf("scale", pt(0.35), cs * 1.1, "backOut"),
      kf("scale", pt(0.5), cs, "sineOut"),
      kf("y", t0, cy), kf("y", pt(0.1), cy - 0.06, "quadOut"), kf("y", pt(0.2), cy, "bounceOut"),
    ];
    case "drop-kick": return [
      kf("y", t0, cy - 0.5), kf("y", pt(0.25), cy, "quadIn"),
      kf("rotation", t0, cr - 45), kf("rotation", pt(0.25), cr, "sineOut"),
      kf("scale", t0, cs * 0.7), kf("scale", pt(0.25), cs, "backOut"),
    ];
    case "yo-yo": return [
      kf("y", t0, cy), kf("y", pt(0.25), cy + 0.25, "quadIn"),
      kf("y", pt(0.5), cy, "bounceOut"), kf("y", pt(0.75), cy + 0.15, "quadIn"),
      kf("y", t1 - 0.05, cy, "bounceOut"),
    ];
    default: return [];
  }
}
