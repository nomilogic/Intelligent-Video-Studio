export type WaveKind =
  | "ocean"
  | "audio"
  | "plasma"
  | "ripple"
  | "neon"
  | "retro"
  | "mountain"
  | "lissajous"
  | "heartbeat"
  | "interference"
  | "galaxy"
  | "northern-lights";

export interface WaveDef {
  key: WaveKind;
  label: string;
  emoji: string;
  description: string;
  defaults: {
    count: number;
    amplitude: number;
    frequency: number;
    speed: number;
    color: string;
    color2?: string;
    opacity: number;
    fill: boolean;
    direction: "horizontal" | "vertical" | "radial";
  };
}

export const WAVE_LIBRARY: WaveDef[] = [
  {
    key: "ocean",
    label: "Ocean Waves",
    emoji: "🌊",
    description: "Layered rolling ocean waves with foam effect",
    defaults: { count: 3, amplitude: 0.12, frequency: 2, speed: 0.8, color: "#0ea5e9", color2: "#0284c7", opacity: 0.85, fill: true, direction: "horizontal" },
  },
  {
    key: "audio",
    label: "Audio Wave",
    emoji: "🎵",
    description: "Classic audio waveform oscillator",
    defaults: { count: 1, amplitude: 0.35, frequency: 5, speed: 2, color: "#22d3ee", opacity: 1, fill: false, direction: "horizontal" },
  },
  {
    key: "plasma",
    label: "Plasma",
    emoji: "⚡",
    description: "Multi-frequency plasma interference pattern",
    defaults: { count: 4, amplitude: 0.08, frequency: 6, speed: 1.5, color: "#a855f7", color2: "#ec4899", opacity: 0.8, fill: true, direction: "horizontal" },
  },
  {
    key: "ripple",
    label: "Ripple",
    emoji: "💧",
    description: "Concentric ripple rings expanding outward",
    defaults: { count: 5, amplitude: 0.06, frequency: 3, speed: 1.2, color: "#38bdf8", opacity: 0.7, fill: false, direction: "radial" },
  },
  {
    key: "neon",
    label: "Neon Pulse",
    emoji: "🌟",
    description: "Glowing neon wave with sharp peaks",
    defaults: { count: 2, amplitude: 0.25, frequency: 4, speed: 1.8, color: "#f0abfc", color2: "#818cf8", opacity: 0.9, fill: false, direction: "horizontal" },
  },
  {
    key: "retro",
    label: "Retro Bars",
    emoji: "📊",
    description: "Retro equalizer bar style wave",
    defaults: { count: 1, amplitude: 0.4, frequency: 8, speed: 1.5, color: "#4ade80", color2: "#facc15", opacity: 1, fill: true, direction: "horizontal" },
  },
  {
    key: "mountain",
    label: "Mountain",
    emoji: "🏔️",
    description: "Layered mountain silhouette wave",
    defaults: { count: 4, amplitude: 0.18, frequency: 1.5, speed: 0.4, color: "#6366f1", color2: "#1e1b4b", opacity: 0.9, fill: true, direction: "horizontal" },
  },
  {
    key: "lissajous",
    label: "Lissajous",
    emoji: "🔄",
    description: "Mathematical Lissajous figure animation",
    defaults: { count: 1, amplitude: 0.45, frequency: 3, speed: 1, color: "#fb923c", opacity: 1, fill: false, direction: "radial" },
  },
  {
    key: "heartbeat",
    label: "Heartbeat",
    emoji: "❤️",
    description: "EKG-style heartbeat pulse waveform",
    defaults: { count: 1, amplitude: 0.3, frequency: 2, speed: 1.5, color: "#f43f5e", opacity: 1, fill: false, direction: "horizontal" },
  },
  {
    key: "interference",
    label: "Interference",
    emoji: "〰️",
    description: "Two waves interfering, creating beats",
    defaults: { count: 2, amplitude: 0.2, frequency: 4, speed: 1, color: "#34d399", color2: "#6ee7b7", opacity: 0.85, fill: false, direction: "horizontal" },
  },
  {
    key: "galaxy",
    label: "Galaxy Spiral",
    emoji: "🌌",
    description: "Slow-spinning galaxy-like spiral arms",
    defaults: { count: 3, amplitude: 0.3, frequency: 2.5, speed: 0.3, color: "#818cf8", color2: "#c084fc", opacity: 0.7, fill: true, direction: "radial" },
  },
  {
    key: "northern-lights",
    label: "Northern Lights",
    emoji: "🎇",
    description: "Shimmering aurora borealis curtain",
    defaults: { count: 5, amplitude: 0.15, frequency: 1.8, speed: 0.6, color: "#4ade80", color2: "#a78bfa", opacity: 0.6, fill: true, direction: "vertical" },
  },
];

export function getWaveDef(key: string | undefined): WaveDef | null {
  if (!key) return WAVE_LIBRARY[0];
  return WAVE_LIBRARY.find((w) => w.key === key) ?? WAVE_LIBRARY[0];
}

export function drawWaves(
  ctx: CanvasRenderingContext2D,
  clip: {
    waveKind?: string;
    waveCount?: number;
    waveAmplitude?: number;
    waveFrequency?: number;
    waveSpeed?: number;
    waveColor?: string;
    waveColor2?: string;
    waveOpacity?: number;
    waveFill?: boolean;
    waveDirection?: string;
  },
  currentTime: number,
  W: number,
  H: number,
): void {
  const def = getWaveDef(clip.waveKind);
  if (!def) return;
  const d = def.defaults;
  const count = clip.waveCount ?? d.count;
  const amp = (clip.waveAmplitude ?? d.amplitude) * H;
  const freq = clip.waveFrequency ?? d.frequency;
  const speed = clip.waveSpeed ?? d.speed;
  const color1 = clip.waveColor ?? d.color;
  const color2 = clip.waveColor2 ?? d.color2 ?? color1;
  const opacity = clip.waveOpacity ?? d.opacity;
  const fill = clip.waveFill ?? d.fill;
  const dir = (clip.waveDirection ?? d.direction) as "horizontal" | "vertical" | "radial";
  const t = currentTime * speed;

  ctx.save();
  ctx.globalAlpha = opacity;

  const kind = clip.waveKind ?? "ocean";

  for (let layer = 0; layer < count; layer++) {
    const frac = count === 1 ? 0.5 : layer / (count - 1);
    const phaseOffset = (layer * Math.PI * 2) / count;
    const color = interpolateHex(color1, color2, frac);

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, 3 - layer * 0.5);

    if (dir === "radial") {
      drawRadialWave(ctx, W, H, t, layer, count, amp, freq, phaseOffset, color, fill, kind);
    } else if (dir === "vertical") {
      drawVerticalWave(ctx, W, H, t, layer, count, amp, freq, phaseOffset, color, fill, kind);
    } else {
      drawHorizontalWave(ctx, W, H, t, layer, count, amp, freq, phaseOffset, color, fill, kind);
    }
  }

  ctx.restore();
}

function drawHorizontalWave(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  t: number, layer: number, count: number,
  amp: number, freq: number,
  phaseOffset: number,
  color: string, fill: boolean, kind: string,
): void {
  const baseY = H * (0.3 + (layer / Math.max(count - 1, 1)) * 0.5);
  const steps = Math.ceil(W / 2);

  ctx.beginPath();

  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * W;
    const nx = x / W;
    let y = baseY;

    if (kind === "heartbeat") {
      y = baseY + heartbeatY(nx, t, amp);
    } else if (kind === "retro") {
      const barW = W / 32;
      const barIdx = Math.floor(x / barW);
      const barH = amp * (0.4 + 0.6 * Math.abs(Math.sin(barIdx * 0.7 + t)));
      if (i === 0) ctx.moveTo(x, baseY);
      ctx.lineTo(x, baseY - barH);
      ctx.lineTo(x + barW - 1, baseY - barH);
      ctx.lineTo(x + barW - 1, baseY);
      continue;
    } else {
      y = baseY + Math.sin(nx * Math.PI * 2 * freq + t + phaseOffset) * amp;
      if (kind === "interference" && layer === 1) {
        y = baseY + Math.sin(nx * Math.PI * 2 * (freq + 0.5) + t * 0.7 + phaseOffset) * amp;
      }
    }

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  if (fill) {
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6 / count + 0.1;
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = kind === "neon" ? 3 : 2;
    if (kind === "neon") {
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function drawVerticalWave(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  t: number, layer: number, count: number,
  amp: number, freq: number,
  phaseOffset: number,
  color: string, fill: boolean, _kind: string,
): void {
  const baseX = W * (0.2 + (layer / Math.max(count - 1, 1)) * 0.6);
  const steps = Math.ceil(H / 2);

  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const y = (i / steps) * H;
    const ny = y / H;
    const x = baseX + Math.sin(ny * Math.PI * 2 * freq + t + phaseOffset) * amp;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  if (fill) {
    ctx.lineTo(0, H);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.5 / count + 0.1;
    ctx.fill();
    ctx.globalAlpha = 0.9;
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawRadialWave(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  t: number, layer: number, count: number,
  amp: number, freq: number,
  phaseOffset: number,
  color: string, fill: boolean, kind: string,
): void {
  const cx = W / 2;
  const cy = H / 2;
  const maxR = Math.min(W, H) * 0.48;
  const r = kind === "ripple"
    ? maxR * ((layer + 1 + (t * 0.5) % count) / count)
    : maxR * (0.3 + (layer / Math.max(count - 1, 1)) * 0.7);

  const steps = 120;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const ripple = Math.sin(angle * freq + t + phaseOffset) * amp * 0.5;
    const rx = (r + ripple) * (W / Math.min(W, H));
    const ry = r + ripple;
    const x = cx + Math.cos(angle) * rx;
    const y = cy + Math.sin(angle) * ry;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  if (fill) {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.3 / count + 0.05;
    ctx.fill();
    ctx.globalAlpha = 0.8;
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  if (kind === "neon") {
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function heartbeatY(nx: number, t: number, amp: number): number {
  const phase = (nx + t * 0.3) % 1;
  if (phase < 0.05) return 0;
  if (phase < 0.15) return -amp * 0.3 * Math.sin(((phase - 0.05) / 0.1) * Math.PI);
  if (phase < 0.25) return amp * 0.8 * Math.sin(((phase - 0.15) / 0.1) * Math.PI);
  if (phase < 0.35) return -amp * 0.4 * Math.sin(((phase - 0.25) / 0.1) * Math.PI);
  if (phase < 0.5) return -amp * 0.2 * Math.sin(((phase - 0.35) / 0.15) * Math.PI);
  return 0;
}

function interpolateHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bv = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bv.toString(16).padStart(2, "0")}`;
}
