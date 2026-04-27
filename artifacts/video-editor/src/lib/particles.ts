/**
 * Particle overlay system. Used by `mediaType: "particles"` clips.
 *
 * Both the live preview (`Canvas.tsx`) and the export pipeline
 * (`use-export.ts`) call into the same `drawParticles()` function so the
 * rendered output matches what the user sees. Each particle's birth
 * time, position, velocity, and rotation come from a deterministic
 * hash-based PRNG seeded by `(clip.id, particleIndex)` — that means the
 * simulation is stable across re-renders, restarts, and exports without
 * us having to persist per-particle state.
 */

import type { Clip } from "./types";

export type ParticleKind =
  | "snow"
  | "rain"
  | "confetti"
  | "stars"
  | "sparkles"
  | "bokeh"
  | "dust"
  | "fireflies"
  | "hearts"
  | "leaves"
  | "petals"
  | "embers"
  | "smoke"
  | "bubbles"
  | "ash";

export interface ParticleDef {
  /** Stable id used in `clip.particleKind`. Never change. */
  key: ParticleKind;
  /** Display name for the picker. */
  label: string;
  /** Single emoji thumbnail in the picker. */
  emoji: string;
  /** One-line description. */
  description: string;
  /** Sensible defaults — overridable on the clip. */
  defaults: {
    count: number;
    size: number;        // px on a 1080-wide canvas
    speed: number;       // multiplier
    color: string;
    color2?: string;
    opacity: number;     // 0..1
    spread: number;      // 0..1
    direction: NonNullable<Clip["particleDirection"]>;
    gravity: number;     // -2..2
    twinkle: number;     // 0..1
  };
}

export const PARTICLE_LIBRARY: ParticleDef[] = [
  {
    key: "snow", label: "Snow", emoji: "❄️", description: "Soft, slow-falling snowflakes drifting sideways.",
    defaults: { count: 120, size: 6, speed: 0.5, color: "#ffffff", opacity: 0.9, spread: 0.6, direction: "down", gravity: 0.5, twinkle: 0.2 },
  },
  {
    key: "rain", label: "Rain", emoji: "🌧️", description: "Long thin streaks falling fast.",
    defaults: { count: 200, size: 3, speed: 2.4, color: "#bae6fd", opacity: 0.6, spread: 0.2, direction: "down", gravity: 1.6, twinkle: 0 },
  },
  {
    key: "confetti", label: "Confetti", emoji: "🎉", description: "Colorful rectangles tumbling through frame.",
    defaults: { count: 160, size: 14, speed: 1.4, color: "#ec4899", color2: "#facc15", opacity: 1, spread: 0.9, direction: "burst", gravity: 1.2, twinkle: 0 },
  },
  {
    key: "stars", label: "Stars", emoji: "⭐", description: "Twinkling 5-point stars rising slowly.",
    defaults: { count: 80, size: 12, speed: 0.4, color: "#facc15", opacity: 1, spread: 0.7, direction: "rise", gravity: -0.4, twinkle: 0.7 },
  },
  {
    key: "sparkles", label: "Sparkles", emoji: "✨", description: "Tiny twinkles scattered across frame.",
    defaults: { count: 100, size: 8, speed: 0.6, color: "#fef3c7", opacity: 1, spread: 0.9, direction: "swirl", gravity: 0, twinkle: 0.9 },
  },
  {
    key: "bokeh", label: "Bokeh", emoji: "🔮", description: "Out-of-focus circles floating slowly.",
    defaults: { count: 50, size: 60, speed: 0.3, color: "#f9a8d4", color2: "#a5b4fc", opacity: 0.4, spread: 0.8, direction: "rise", gravity: -0.2, twinkle: 0.4 },
  },
  {
    key: "dust", label: "Dust", emoji: "🌫️", description: "Faint floating dust motes catching light.",
    defaults: { count: 90, size: 4, speed: 0.4, color: "#e7e5e4", opacity: 0.4, spread: 0.9, direction: "swirl", gravity: 0, twinkle: 0.5 },
  },
  {
    key: "fireflies", label: "Fireflies", emoji: "🪲", description: "Glowing dots drifting at night.",
    defaults: { count: 40, size: 6, speed: 0.5, color: "#a3e635", opacity: 1, spread: 0.9, direction: "swirl", gravity: 0, twinkle: 1 },
  },
  {
    key: "hearts", label: "Hearts", emoji: "💖", description: "Pink hearts floating upward.",
    defaults: { count: 60, size: 24, speed: 0.7, color: "#f43f5e", opacity: 0.95, spread: 0.7, direction: "rise", gravity: -0.6, twinkle: 0.2 },
  },
  {
    key: "leaves", label: "Leaves", emoji: "🍂", description: "Autumn leaves swaying down.",
    defaults: { count: 60, size: 18, speed: 0.6, color: "#f97316", color2: "#fbbf24", opacity: 0.95, spread: 0.8, direction: "down", gravity: 0.7, twinkle: 0 },
  },
  {
    key: "petals", label: "Petals", emoji: "🌸", description: "Cherry-blossom petals drifting.",
    defaults: { count: 70, size: 14, speed: 0.5, color: "#fbcfe8", opacity: 0.9, spread: 0.8, direction: "down", gravity: 0.5, twinkle: 0 },
  },
  {
    key: "embers", label: "Embers", emoji: "🔥", description: "Warm embers rising from a fire.",
    defaults: { count: 90, size: 5, speed: 0.9, color: "#fb923c", color2: "#facc15", opacity: 0.9, spread: 0.6, direction: "rise", gravity: -1.0, twinkle: 0.6 },
  },
  {
    key: "smoke", label: "Smoke", emoji: "💨", description: "Soft puffs rising and expanding.",
    defaults: { count: 30, size: 80, speed: 0.4, color: "#a8a29e", opacity: 0.25, spread: 0.6, direction: "rise", gravity: -0.4, twinkle: 0.3 },
  },
  {
    key: "bubbles", label: "Bubbles", emoji: "🫧", description: "Air bubbles rising in liquid.",
    defaults: { count: 70, size: 22, speed: 0.6, color: "#bae6fd", opacity: 0.55, spread: 0.7, direction: "rise", gravity: -0.8, twinkle: 0.3 },
  },
  {
    key: "ash", label: "Ash", emoji: "⚫", description: "Falling grey flecks of ash.",
    defaults: { count: 130, size: 4, speed: 0.7, color: "#57534e", opacity: 0.6, spread: 0.7, direction: "down", gravity: 0.6, twinkle: 0.2 },
  },
];

export const DEFAULT_PARTICLE_KIND: ParticleKind = "sparkles";

export function getParticleDef(key: string | undefined): ParticleDef | undefined {
  if (!key) return undefined;
  return PARTICLE_LIBRARY.find((p) => p.key === key);
}

/**
 * Resolve a clip's particle settings, falling back to the kind's defaults
 * when individual fields are unset on the clip itself.
 */
export interface ResolvedParticle {
  kind: ParticleKind;
  count: number;
  size: number;
  speed: number;
  color: string;
  color2?: string;
  opacity: number;
  spread: number;
  direction: NonNullable<Clip["particleDirection"]>;
  gravity: number;
  twinkle: number;
}

export function resolveParticleClip(clip: Clip): ResolvedParticle {
  const def = getParticleDef(clip.particleKind) ?? PARTICLE_LIBRARY[0];
  const d = def.defaults;
  return {
    kind: def.key,
    count: clamp(clip.particleCount ?? d.count, 5, 400),
    size: clamp(clip.particleSize ?? d.size, 1, 200),
    speed: clamp(clip.particleSpeed ?? d.speed, 0.05, 4),
    color: clip.particleColor ?? d.color,
    color2: clip.particleColor2 ?? d.color2,
    opacity: clamp(clip.particleOpacity ?? d.opacity, 0, 1),
    spread: clamp(clip.particleSpread ?? d.spread, 0, 1),
    direction: clip.particleDirection ?? d.direction,
    gravity: clamp(clip.particleGravity ?? d.gravity, -3, 3),
    twinkle: clamp(clip.particleTwinkle ?? d.twinkle, 0, 1),
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Cheap hash-based PRNG. Maps (seed, i) → float in [0, 1). Fully
 * deterministic — same inputs always return the same output. Used to
 * derive every particle's per-spawn properties so neither preview nor
 * export needs to persist particle state.
 */
function hash01(seed: number, i: number): number {
  let h = (seed * 374761393 + i * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) / 0xffffffff);
}

/** Simple deterministic seed derived from the clip id string. */
function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h | 1;
}

/**
 * Render the particle field for a clip into the given 2D context, sized
 * `cw` × `ch`. `tLocal` is seconds since the clip started (already
 * clamped to the clip's duration window). Both preview and export call
 * this with the same arguments so the simulation stays in sync.
 */
export function drawParticles(
  ctx: CanvasRenderingContext2D,
  resolved: ResolvedParticle,
  cw: number,
  ch: number,
  tLocal: number,
  seedKey: string,
): void {
  const seed = seedFromString(seedKey);
  const N = Math.max(1, Math.round(resolved.count));
  const baseSize = Math.max(1, resolved.size * (Math.min(cw, ch) / 1080));
  const oversize = baseSize * 2; // particle radius for spawn-edge buffering
  const speed = resolved.speed;
  // "lifespan" — how many seconds a particle lives before respawning.
  // Tuned per direction so things look natural at the default speed.
  const life = 4 / Math.max(0.2, speed);

  ctx.save();
  ctx.globalAlpha = 1; // we set per-particle alpha below
  for (let i = 0; i < N; i++) {
    // Stagger each particle's birth time so the field doesn't "pop in".
    const offset = hash01(seed, i * 7 + 1) * life;
    const tp = ((tLocal + offset) % life) / life; // 0..1 progress in lifecycle
    const baseX = hash01(seed, i * 11 + 3) * cw;
    const baseY = hash01(seed, i * 13 + 5) * ch;
    const jitter = (hash01(seed, i * 17 + 7) - 0.5) * resolved.spread;
    // Wind sway — a low-frequency sine using the particle's own seed for variation.
    const sway = Math.sin(tLocal * (0.6 + hash01(seed, i * 19 + 11) * 1.4) + i) * resolved.spread * 40;

    let x = baseX, y = baseY;
    switch (resolved.direction) {
      case "down":
        x = baseX + sway;
        y = (baseY + tp * (ch + oversize * 2) * (0.6 + speed * 0.5) + resolved.gravity * tp * tp * 200) % (ch + oversize * 2) - oversize;
        break;
      case "up":
      case "rise":
        x = baseX + sway;
        y = ((baseY - tp * (ch + oversize * 2) * (0.6 + speed * 0.5) + resolved.gravity * tp * tp * 200) % (ch + oversize * 2) + ch + oversize * 2) % (ch + oversize * 2) - oversize;
        break;
      case "left":
        x = ((baseX - tp * (cw + oversize * 2) * speed) % (cw + oversize * 2) + cw + oversize * 2) % (cw + oversize * 2) - oversize;
        y = baseY + sway * 0.4;
        break;
      case "right":
        x = (baseX + tp * (cw + oversize * 2) * speed) % (cw + oversize * 2) - oversize;
        y = baseY + sway * 0.4;
        break;
      case "burst":
        // From bottom-center expanding upward & outward, then settling down.
        {
          const ang = (hash01(seed, i * 23 + 13) - 0.5) * Math.PI * 1.6;
          const r = tp * Math.max(cw, ch) * 0.8 * speed;
          x = cw / 2 + Math.sin(ang) * r;
          y = ch * 0.95 - Math.cos(ang) * r + resolved.gravity * tp * tp * 300;
        }
        break;
      case "swirl":
      default:
        {
          const ang = tp * Math.PI * 2 + i * 0.7;
          const r = baseSize * 6 + jitter * cw * 0.3;
          x = baseX + Math.cos(ang) * r;
          y = baseY + Math.sin(ang) * r * 0.6;
        }
        break;
    }

    // Per-particle alpha — fade at the very ends of life so spawning is invisible.
    const fadeIn  = Math.min(1, tp * 6);
    const fadeOut = Math.min(1, (1 - tp) * 6);
    const twinkle = 1 - resolved.twinkle * (0.5 - 0.5 * Math.cos(tLocal * 4 + i));
    const alpha = resolved.opacity * fadeIn * fadeOut * twinkle;
    if (alpha <= 0.01) continue;

    // Pick color (alternate primary/secondary for variety).
    const useC2 = resolved.color2 && (i & 1) === 1;
    const color = useC2 ? (resolved.color2 as string) : resolved.color;

    ctx.globalAlpha = Math.min(1, alpha);
    drawSingleParticle(ctx, resolved.kind, x, y, baseSize, color, i, seed, tLocal);
  }
  ctx.restore();
}

function drawSingleParticle(
  ctx: CanvasRenderingContext2D,
  kind: ParticleKind,
  x: number,
  y: number,
  size: number,
  color: string,
  i: number,
  seed: number,
  tLocal: number,
): void {
  switch (kind) {
    case "snow":
    case "dust":
    case "ash":
    case "petals":
    case "bokeh":
    case "fireflies": {
      // Soft circle (with extra glow on fireflies/bokeh).
      const glow = kind === "fireflies" || kind === "bokeh";
      if (glow) {
        const grad = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
        grad.addColorStop(0, color);
        grad.addColorStop(1, color + "00");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, size * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "rain": {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, size * 0.8);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - size * 0.4, y + size * 4);
      ctx.stroke();
      break;
    }
    case "confetti": {
      // Tumbling rectangle — rotation derived from time for that "flutter" look.
      const rot = (i + tLocal * (1 + (i % 5))) * 1.7;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = color;
      ctx.fillRect(-size / 2, -size / 4, size, size / 2);
      ctx.restore();
      break;
    }
    case "stars":
    case "sparkles": {
      // 4-point star spike — bright + soft cross.
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(((i + tLocal * 0.5) % Math.PI) - Math.PI / 4);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.2);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color + "00");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.fillRect(-size * 1.4, -size * 0.12, size * 2.8, size * 0.24);
      ctx.fillRect(-size * 0.12, -size * 1.4, size * 0.24, size * 2.8);
      ctx.restore();
      break;
    }
    case "hearts": {
      // Heart from two arcs + a triangle.
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(size / 12, size / 12);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.bezierCurveTo(0, -2, -8, -2, -8, 4);
      ctx.bezierCurveTo(-8, 8, -4, 10, 0, 14);
      ctx.bezierCurveTo(4, 10, 8, 8, 8, 4);
      ctx.bezierCurveTo(8, -2, 0, -2, 0, 4);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "leaves": {
      // Oval leaf with rotation.
      const rot = (i + tLocal * (0.5 + (i % 3) * 0.3));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, size, size * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "embers": {
      // Glowing dot with hot core.
      const grad = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color + "00");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, size * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "smoke": {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color + "00");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "bubbles": {
      // Hollow circle with highlight.
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, size * 0.18);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha *= 0.7;
      ctx.beginPath();
      ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  // Suppress unused-var warnings for seed: we use it through hash01 at the call site.
  void seed;
}
