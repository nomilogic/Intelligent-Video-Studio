import { Clip } from "./types";

export type SplitKind = "simple" | "rhythm" | "ai" | "template";

export interface SplitPreset {
  key: string;
  label: string;
  category: string;
  kind: SplitKind;
  emoji: string;
  description: string;
  /** Given clip duration, return array of cut times (0..duration, exclusive of 0 and duration) */
  cuts: (duration: number, opts?: { bpm?: number; beats?: number }) => number[];
  /** Optional: automatically apply transition key after each cut */
  transitionKey?: string;
  /** Optional: effect to apply to alternate pieces */
  effectCycle?: string[];
}

// ─── Utility ────────────────────────────────────────────────────────────────
function linspace(from: number, to: number, n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [(from + to) / 2];
  return Array.from({ length: n }, (_, i) => from + (i / (n - 1)) * (to - from));
}
function range(start: number, stop: number, step: number): number[] {
  const r: number[] = [];
  for (let v = start; v < stop; v += step) r.push(v);
  return r;
}
function fib(max: number): number[] {
  const seq = [1, 1];
  while (true) { const n = seq[seq.length - 1] + seq[seq.length - 2]; if (n > max * 100) break; seq.push(n); }
  const scale = max / seq[seq.length - 1];
  return seq.map((v) => v * scale).filter((v) => v > 0 && v < max);
}
function golden(duration: number, n = 6): number[] {
  const phi = 1.6180339887;
  const times: number[] = [];
  let t = duration / phi;
  for (let i = 0; i < n && t < duration - 0.1; i++) {
    times.push(t);
    t += duration / Math.pow(phi, i + 2);
  }
  return times.filter((v) => v < duration - 0.1).sort((a, b) => a - b);
}
function jitter(times: number[], amount: number, duration: number): number[] {
  return times.map((t) => Math.max(0.1, Math.min(duration - 0.1, t + (Math.random() - 0.5) * amount * 2)));
}

// ─── 200 Split Presets ───────────────────────────────────────────────────────
export const SPLIT_PRESETS: SplitPreset[] = [
  // ── Simple even splits ──────────────────────────────────────────────────
  { key: "halves", label: "Halves", category: "Even", kind: "simple", emoji: "½", description: "Cut exactly in half", cuts: (d) => [d / 2] },
  { key: "thirds", label: "Thirds", category: "Even", kind: "simple", emoji: "⅓", description: "3 equal pieces", cuts: (d) => [d / 3, (d * 2) / 3] },
  { key: "quarters", label: "Quarters", category: "Even", kind: "simple", emoji: "¼", description: "4 equal pieces", cuts: (d) => linspace(0, d, 5).slice(1, -1) },
  { key: "fifths", label: "Fifths", category: "Even", kind: "simple", emoji: "⅕", description: "5 equal pieces", cuts: (d) => linspace(0, d, 6).slice(1, -1) },
  { key: "sixths", label: "Sixths", category: "Even", kind: "simple", emoji: "⅙", description: "6 equal pieces", cuts: (d) => linspace(0, d, 7).slice(1, -1) },
  { key: "eighths", label: "Eighths", category: "Even", kind: "simple", emoji: "⅛", description: "8 equal pieces", cuts: (d) => linspace(0, d, 9).slice(1, -1) },
  { key: "tenths", label: "Tenths", category: "Even", kind: "simple", emoji: "🔢", description: "10 equal pieces", cuts: (d) => linspace(0, d, 11).slice(1, -1) },
  { key: "twelfths", label: "Twelfths", category: "Even", kind: "simple", emoji: "12", description: "12 equal pieces", cuts: (d) => linspace(0, d, 13).slice(1, -1) },
  { key: "sixteenths", label: "Sixteenths", category: "Even", kind: "simple", emoji: "16", description: "16 equal pieces", cuts: (d) => linspace(0, d, 17).slice(1, -1) },
  { key: "twentyfourths", label: "24 Parts", category: "Even", kind: "simple", emoji: "24", description: "24 equal pieces", cuts: (d) => linspace(0, d, 25).slice(1, -1) },

  // ── Time-based ──────────────────────────────────────────────────────────
  { key: "every-1s", label: "Every 1s", category: "Time-Based", kind: "simple", emoji: "1s", description: "Cut every second", cuts: (d) => range(1, d, 1) },
  { key: "every-2s", label: "Every 2s", category: "Time-Based", kind: "simple", emoji: "2s", description: "Cut every 2 seconds", cuts: (d) => range(2, d, 2) },
  { key: "every-3s", label: "Every 3s", category: "Time-Based", kind: "simple", emoji: "3s", description: "Cut every 3 seconds", cuts: (d) => range(3, d, 3) },
  { key: "every-5s", label: "Every 5s", category: "Time-Based", kind: "simple", emoji: "5s", description: "Cut every 5 seconds", cuts: (d) => range(5, d, 5) },
  { key: "every-10s", label: "Every 10s", category: "Time-Based", kind: "simple", emoji: "10s", description: "Cut every 10 seconds", cuts: (d) => range(10, d, 10) },
  { key: "every-15s", label: "Every 15s", category: "Time-Based", kind: "simple", emoji: "15s", description: "Cut every 15 seconds", cuts: (d) => range(15, d, 15) },
  { key: "every-30s", label: "Every 30s", category: "Time-Based", kind: "simple", emoji: "30s", description: "Cut every 30 seconds", cuts: (d) => range(30, d, 30) },
  { key: "every-half-sec", label: "Every 0.5s", category: "Time-Based", kind: "simple", emoji: "½s", description: "Rapid fire: every half second", cuts: (d) => range(0.5, d, 0.5) },

  // ── Rhythm / BPM ────────────────────────────────────────────────────────
  { key: "bpm-beat", label: "On Every Beat", category: "Rhythm", kind: "rhythm", emoji: "♩", description: "Cut on every beat (set BPM)", cuts: (d, o = {}) => range(60 / (o.bpm ?? 120), d, 60 / (o.bpm ?? 120)) },
  { key: "bpm-2beat", label: "Every 2 Beats", category: "Rhythm", kind: "rhythm", emoji: "♪", description: "Cut every 2 beats", cuts: (d, o = {}) => range(120 / (o.bpm ?? 120), d, 120 / (o.bpm ?? 120)) },
  { key: "bpm-4beat", label: "Every 4 Beats (Bar)", category: "Rhythm", kind: "rhythm", emoji: "♫", description: "Cut every bar (4 beats)", cuts: (d, o = {}) => range(240 / (o.bpm ?? 120), d, 240 / (o.bpm ?? 120)) },
  { key: "bpm-8beat", label: "Every 8 Beats", category: "Rhythm", kind: "rhythm", emoji: "🎵", description: "Cut every 8 beats (2 bars)", cuts: (d, o = {}) => range(480 / (o.bpm ?? 120), d, 480 / (o.bpm ?? 120)) },
  { key: "bpm-half", label: "Half-Beat", category: "Rhythm", kind: "rhythm", emoji: "𝅗𝅥", description: "Cut on every half beat", cuts: (d, o = {}) => range(30 / (o.bpm ?? 120), d, 30 / (o.bpm ?? 120)) },
  { key: "bpm-triplet", label: "Triplets", category: "Rhythm", kind: "rhythm", emoji: "3️⃣", description: "Cut on triplet subdivisions", cuts: (d, o = {}) => range((60 / (o.bpm ?? 120)) * 2 / 3, d, (60 / (o.bpm ?? 120)) * 2 / 3) },
  { key: "downbeat", label: "Downbeats Only", category: "Rhythm", kind: "rhythm", emoji: "⬇", description: "First beat of each bar", cuts: (d, o = {}) => range(240 / (o.bpm ?? 120), d, 240 / (o.bpm ?? 120)) },

  // ── Mathematical ────────────────────────────────────────────────────────
  { key: "fibonacci", label: "Fibonacci", category: "Mathematical", kind: "simple", emoji: "🐚", description: "Cuts at Fibonacci intervals (feels natural)", cuts: (d) => fib(d) },
  { key: "golden-ratio", label: "Golden Ratio", category: "Mathematical", kind: "simple", emoji: "Φ", description: "Cuts following the golden ratio", cuts: (d) => golden(d, 5) },
  { key: "powers-of-2", label: "Powers of 2", category: "Mathematical", kind: "simple", emoji: "²", description: "Cuts at 1s, 2s, 4s, 8s...", cuts: (d) => [1, 2, 4, 8, 16, 32].filter((v) => v < d) },
  { key: "prime-beats", label: "Prime Beats", category: "Mathematical", kind: "simple", emoji: "P", description: "Cuts at prime-number seconds (2, 3, 5, 7...)", cuts: (d) => [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47].filter((v) => v < d) },
  { key: "exponential", label: "Exponential Ease-In", category: "Mathematical", kind: "simple", emoji: "📈", description: "Cuts speed up exponentially", cuts: (d) => Array.from({ length: 6 }, (_, i) => d * (1 - Math.pow(2, -(i + 1)))).filter((v) => v > 0.1 && v < d - 0.1) },
  { key: "logarithmic", label: "Logarithmic Ease-Out", category: "Mathematical", kind: "simple", emoji: "📉", description: "Cuts slow down logarithmically", cuts: (d) => Array.from({ length: 6 }, (_, i) => d * Math.log(i + 2) / Math.log(8)).filter((v) => v > 0 && v < d) },
  { key: "sine-wave", label: "Sine Wave", category: "Mathematical", kind: "simple", emoji: "〜", description: "Cuts follow a sine curve", cuts: (d) => Array.from({ length: 8 }, (_, i) => (d / 2) * (1 + Math.sin((i / 8) * Math.PI * 2 - Math.PI / 2))).filter((v) => v > 0.1 && v < d - 0.1).sort((a, b) => a - b) },
  { key: "acceleration", label: "Accelerate Cuts", category: "Mathematical", kind: "simple", emoji: "🚀", description: "Cuts get faster and faster", cuts: (d) => { const times: number[] = []; let t = d * 0.5, step = t * 0.5; while (t < d - 0.1 && step > 0.1) { times.push(t); t += step; step *= 0.6; } return times; } },
  { key: "deceleration", label: "Decelerate Cuts", category: "Mathematical", kind: "simple", emoji: "🛑", description: "Cuts get slower and slower", cuts: (d) => { const times: number[] = []; let t = 0, step = d * 0.1; while (t + step < d - 0.1) { t += step; times.push(t); step *= 1.5; } return times; } },

  // ── Random / Chaos ──────────────────────────────────────────────────────
  { key: "random-3", label: "Random 3 Cuts", category: "Random", kind: "simple", emoji: "🎲", description: "3 cuts at random positions", cuts: (d) => [d * 0.2 + Math.random() * d * 0.2, d * 0.45 + Math.random() * d * 0.15, d * 0.65 + Math.random() * d * 0.2] },
  { key: "random-5", label: "Random 5 Cuts", category: "Random", kind: "simple", emoji: "🎰", description: "5 cuts at random positions", cuts: (d) => jitter(linspace(0, d, 6).slice(1, -1), d * 0.06, d) },
  { key: "random-8", label: "Random 8 Cuts", category: "Random", kind: "simple", emoji: "🎯", description: "8 cuts at semi-random positions", cuts: (d) => jitter(linspace(0, d, 9).slice(1, -1), d * 0.04, d) },
  { key: "controlled-chaos", label: "Controlled Chaos", category: "Random", kind: "simple", emoji: "🌪", description: "Random cuts weighted to the first half", cuts: (d) => { const n = Math.floor(4 + Math.random() * 4); return Array.from({ length: n }, () => d * 0.1 + Math.random() * d * 0.8).sort((a, b) => a - b); } },
  { key: "burst-start", label: "Burst at Start", category: "Random", kind: "simple", emoji: "💥", description: "Many rapid cuts at the beginning then calm", cuts: (d) => [...range(d * 0.05, d * 0.4, d * 0.07), d * 0.6, d * 0.8] },
  { key: "burst-end", label: "Burst at End", category: "Random", kind: "simple", emoji: "🎆", description: "Calm start then rapid cuts at the end", cuts: (d) => [d * 0.25, d * 0.5, ...range(d * 0.65, d - 0.1, d * 0.07)] },
  { key: "burst-middle", label: "Burst in Middle", category: "Random", kind: "simple", emoji: "🔥", description: "Rapid cuts around the middle", cuts: (d) => [d * 0.2, ...range(d * 0.4, d * 0.65, d * 0.06), d * 0.8] },

  // ── Cinematic / Narrative ────────────────────────────────────────────────
  { key: "three-act", label: "3-Act Structure", category: "Narrative", kind: "simple", emoji: "🎭", description: "Setup / Confrontation / Resolution", cuts: (d) => [d * 0.25, d * 0.75] },
  { key: "five-act", label: "5-Act Structure", category: "Narrative", kind: "simple", emoji: "🎬", description: "Exposition/Rising/Climax/Falling/Resolution", cuts: (d) => [d * 0.2, d * 0.4, d * 0.6, d * 0.8] },
  { key: "hook-body-cta", label: "Hook / Body / CTA", category: "Narrative", kind: "simple", emoji: "📣", description: "Social: Hook (0-3s) / Main body / Call to action", cuts: (d) => [Math.min(3, d * 0.15), Math.max(d - Math.min(5, d * 0.15), d * 0.8)] },
  { key: "cold-open", label: "Cold Open", category: "Narrative", kind: "simple", emoji: "❄", description: "Quick cold open (10%) then main content", cuts: (d) => [d * 0.1, d * 0.5] },
  { key: "cliffhanger", label: "Cliffhanger", category: "Narrative", kind: "simple", emoji: "😱", description: "Build then cut at peak tension (~80%)", cuts: (d) => [d * 0.8] },
  { key: "in-medias-res", label: "In Medias Res", category: "Narrative", kind: "simple", emoji: "⚡", description: "Start at the action, cut back to beginning at 30%", cuts: (d) => [d * 0.3, d * 0.7] },
  { key: "bookend", label: "Bookend", category: "Narrative", kind: "simple", emoji: "📚", description: "Similar intro and outro with meat in between", cuts: (d) => [d * 0.15, d * 0.85] },
  { key: "parallel-edit", label: "Parallel Cut", category: "Narrative", kind: "simple", emoji: "↔", description: "4 equal sections for cross-cutting between two stories", cuts: (d) => linspace(0, d, 5).slice(1, -1) },

  // ── Social Media ─────────────────────────────────────────────────────────
  { key: "tiktok-hooks", label: "TikTok Hooks", category: "Social Media", kind: "simple", emoji: "🎵", description: "Cuts at 1s, 3s, 7s, 15s for viral retention", cuts: (d) => [1, 3, 7, 15].filter((v) => v < d) },
  { key: "instagram-reel", label: "Instagram Reel", category: "Social Media", kind: "simple", emoji: "📸", description: "Optimal for 15–30s reels: 4 scenes", cuts: (d) => [d * 0.25, d * 0.5, d * 0.75] },
  { key: "youtube-shorts", label: "YouTube Shorts", category: "Social Media", kind: "simple", emoji: "▶", description: "5 scenes in 60s: every 12 seconds", cuts: (d) => range(12, d, 12) },
  { key: "twitter-clips", label: "Twitter/X Clips", category: "Social Media", kind: "simple", emoji: "𝕏", description: "3 punchy scenes for 30s clips", cuts: (d) => [d / 3, (d * 2) / 3] },
  { key: "linkedin-pro", label: "LinkedIn Video", category: "Social Media", kind: "simple", emoji: "💼", description: "Professional: intro, 3 points, outro", cuts: (d) => [d * 0.12, d * 0.35, d * 0.6, d * 0.85] },
  { key: "story-15s", label: "Story (15s, 3 cuts)", category: "Social Media", kind: "simple", emoji: "⏱", description: "3 cuts at 5/8/12s for 15s stories", cuts: (_d) => [5, 8, 12] },
  { key: "story-30s", label: "Story (30s, 5 cuts)", category: "Social Media", kind: "simple", emoji: "📲", description: "Story format for 30s", cuts: (_d) => [6, 12, 18, 22, 26] },
  { key: "reels-trending", label: "Trending Reel Edit", category: "Social Media", kind: "simple", emoji: "🔥", description: "Viral pacing: fast intro, slow middle, fast outro", cuts: (d) => [d * 0.05, d * 0.1, d * 0.15, d * 0.5, d * 0.8, d * 0.88, d * 0.94] },

  // ── Montage Styles ───────────────────────────────────────────────────────
  { key: "quick-montage", label: "Quick Montage", category: "Montage", kind: "simple", emoji: "⚡", description: "Fast-paced montage: cuts every 1.5s", cuts: (d) => range(1.5, d, 1.5) },
  { key: "slow-montage", label: "Slow Montage", category: "Montage", kind: "simple", emoji: "🌊", description: "Slow & cinematic: 5s scenes", cuts: (d) => range(5, d, 5) },
  { key: "sports-highlight", label: "Sports Highlight", category: "Montage", kind: "simple", emoji: "🏆", description: "Sports reel pacing: cuts every 2s", cuts: (d) => range(2, d, 2), transitionKey: "flash" },
  { key: "music-video", label: "Music Video", category: "Montage", kind: "rhythm", emoji: "🎤", description: "Beat-synced music video pacing (120BPM default)", cuts: (d, o = {}) => range(60 / (o.bpm ?? 120), d, 60 / (o.bpm ?? 120)) },
  { key: "photo-slideshow", label: "Photo Slideshow", category: "Montage", kind: "simple", emoji: "🖼", description: "Ken Burns: 4s per slide", cuts: (d) => range(4, d, 4) },
  { key: "travel-vlog", label: "Travel Vlog", category: "Montage", kind: "simple", emoji: "✈", description: "Travel b-roll pacing: 3s scenes", cuts: (d) => range(3, d, 3) },
  { key: "cooking-tutorial", label: "Cooking Tutorial", category: "Montage", kind: "simple", emoji: "👨‍🍳", description: "Recipe format: 6 equal steps", cuts: (d) => linspace(0, d, 7).slice(1, -1) },
  { key: "workout-reel", label: "Workout Reel", category: "Montage", kind: "simple", emoji: "💪", description: "High-energy: cut every 2.5s", cuts: (d) => range(2.5, d, 2.5), transitionKey: "zoom" },
  { key: "fashion-lookbook", label: "Fashion Lookbook", category: "Montage", kind: "simple", emoji: "👗", description: "Style transitions every 2s", cuts: (d) => range(2, d, 2) },
  { key: "product-reveal", label: "Product Reveal", category: "Montage", kind: "simple", emoji: "🎁", description: "5 angles: tease, wide, detail, detail2, close", cuts: (d) => [d * 0.15, d * 0.35, d * 0.55, d * 0.75] },

  // ── Transition-Enhanced ──────────────────────────────────────────────────
  { key: "whip-pan-3", label: "Whip Pan (3 cuts)", category: "Transitions", kind: "simple", emoji: "💫", description: "3 fast cuts with whip pan feel", cuts: (d) => [d * 0.33, d * 0.66], transitionKey: "swipe-right" },
  { key: "dissolve-halves", label: "Slow Dissolve", category: "Transitions", kind: "simple", emoji: "🌫", description: "Gentle dissolve at midpoint", cuts: (d) => [d / 2], transitionKey: "cross-dissolve" },
  { key: "jump-cut-burst", label: "Jump Cut Burst", category: "Transitions", kind: "simple", emoji: "🔀", description: "6 fast jump cuts", cuts: (d) => linspace(0, d, 7).slice(1, -1), transitionKey: "hard-cut" },
  { key: "smash-cut", label: "Smash Cut Series", category: "Transitions", kind: "simple", emoji: "💢", description: "Impact cuts at high-energy moments", cuts: (d) => [d * 0.2, d * 0.45, d * 0.7] },
  { key: "j-cut-series", label: "J-Cut Series", category: "Transitions", kind: "simple", emoji: "🎧", description: "Audio leads video cut (5 scenes)", cuts: (d) => linspace(0, d, 6).slice(1, -1) },
  { key: "l-cut-series", label: "L-Cut Series", category: "Transitions", kind: "simple", emoji: "🔉", description: "Video leads audio (5 scenes)", cuts: (d) => linspace(0, d, 6).slice(1, -1) },
  { key: "wipe-series", label: "Wipe Transitions", category: "Transitions", kind: "simple", emoji: "➡", description: "4 scenes with wipe transitions", cuts: (d) => linspace(0, d, 5).slice(1, -1), transitionKey: "wipe-right" },
  { key: "zoom-series", label: "Zoom Series", category: "Transitions", kind: "simple", emoji: "🔍", description: "5 scenes with zoom transitions", cuts: (d) => linspace(0, d, 6).slice(1, -1), transitionKey: "zoom-in" },
  { key: "spin-cuts", label: "Spin Cuts", category: "Transitions", kind: "simple", emoji: "🌀", description: "Cuts with rotation transitions", cuts: (d) => linspace(0, d, 5).slice(1, -1), transitionKey: "spin" },
  { key: "glitch-series", label: "Glitch Cuts", category: "Transitions", kind: "simple", emoji: "📺", description: "Glitchy transition cuts", cuts: (d) => jitter(linspace(0, d, 7).slice(1, -1), 0.1, d), transitionKey: "glitch" },

  // ── Geometric / Symmetry ─────────────────────────────────────────────────
  { key: "palindrome", label: "Palindrome", category: "Geometric", kind: "simple", emoji: "🪞", description: "Symmetric cut pattern (mirrors itself)", cuts: (d) => { const half = linspace(0, d / 2, 4).slice(1, -1); return [...half, ...half.map((t) => d - t)].sort((a, b) => a - b); } },
  { key: "chiasmus", label: "Chiasmus", category: "Geometric", kind: "simple", emoji: "✕", description: "Cross-structure: ABBA pattern (4 cuts)", cuts: (d) => [d * 0.2, d * 0.4, d * 0.6, d * 0.8] },
  { key: "fractal-4", label: "Fractal 4x", category: "Geometric", kind: "simple", emoji: "❄", description: "Self-similar cuts at 4 levels", cuts: (d) => { const out: number[] = [d / 2]; [4, 8, 16].forEach((n) => { for (let i = 1; i < n; i += 2) out.push((d * i) / n); }); return out.filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b); } },
  { key: "triangle-wave", label: "Triangle Wave", category: "Geometric", kind: "simple", emoji: "△", description: "Cuts follow a triangle wave pattern", cuts: (d) => Array.from({ length: 7 }, (_, i) => { const phase = i / 6; return d * (phase < 0.5 ? phase * 2 : 2 - phase * 2); }).filter((v) => v > 0.1 && v < d - 0.1).sort((a, b) => a - b) },
  { key: "spiral", label: "Spiral", category: "Geometric", kind: "simple", emoji: "🌀", description: "Cuts following a logarithmic spiral in time", cuts: (d) => Array.from({ length: 8 }, (_, i) => d * (1 - Math.pow(0.7, i + 1))).filter((v) => v < d - 0.1).sort((a, b) => a - b) },

  // ── Emotional Pacing ─────────────────────────────────────────────────────
  { key: "tension-build", label: "Tension Builder", category: "Emotional", kind: "simple", emoji: "😰", description: "Cuts accelerate to build anxiety", cuts: (d) => { const times: number[] = []; let step = d * 0.2; let t = step; while (t < d - 0.05) { times.push(t); step = step * 0.75; t += step; } return times; } },
  { key: "release", label: "Release / Relief", category: "Emotional", kind: "simple", emoji: "😌", description: "Rapid cuts then one long breath", cuts: (d) => [d * 0.1, d * 0.2, d * 0.3, d * 0.4, d * 0.5] },
  { key: "dread", label: "Dread (slow)", category: "Emotional", kind: "simple", emoji: "😨", description: "Very slow cuts for unease", cuts: (d) => [d * 0.35, d * 0.7] },
  { key: "euphoria", label: "Euphoria (fast)", category: "Emotional", kind: "simple", emoji: "🤩", description: "Fast joyful cuts", cuts: (d) => range(1, d, 1) },
  { key: "melancholy", label: "Melancholy", category: "Emotional", kind: "simple", emoji: "💙", description: "Long fades, minimal cuts", cuts: (d) => [d * 0.4, d * 0.75] },
  { key: "nostalgia", label: "Nostalgia", category: "Emotional", kind: "simple", emoji: "📷", description: "Golden-ratio cuts with slow pacing", cuts: (d) => golden(d, 3) },
  { key: "suspense", label: "Suspense", category: "Emotional", kind: "simple", emoji: "🎭", description: "Long pause then burst of cuts", cuts: (d) => [d * 0.7, d * 0.78, d * 0.85, d * 0.92] },
  { key: "joy", label: "Joy / Celebration", category: "Emotional", kind: "simple", emoji: "🎉", description: "Energetic even cuts", cuts: (d) => linspace(0, d, 9).slice(1, -1) },

  // ── Advanced Cinematic ───────────────────────────────────────────────────
  { key: "kubrick-center", label: "Kubrick Symmetry", category: "Cinematic", kind: "simple", emoji: "🎥", description: "2/3 establishing, 1/3 resolution", cuts: (d) => [d * 0.66] },
  { key: "tarantino-reverse", label: "Non-Linear (Tarantino)", category: "Cinematic", kind: "simple", emoji: "🎬", description: "3-act structure reversed: end, beginning, middle", cuts: (d) => [d * 0.35, d * 0.65] },
  { key: "russian-montage", label: "Russian Montage", category: "Cinematic", kind: "simple", emoji: "🔧", description: "Eisenstein-style ideological cuts (5 equal)", cuts: (d) => linspace(0, d, 6).slice(1, -1) },
  { key: "french-new-wave", label: "French New Wave", category: "Cinematic", kind: "simple", emoji: "🥐", description: "Irregular jump cuts like Godard", cuts: (d) => jitter([d * 0.2, d * 0.45, d * 0.55, d * 0.8], d * 0.08, d) },
  { key: "match-cut", label: "Match Cut", category: "Cinematic", kind: "simple", emoji: "🎯", description: "Visual match at 50%: cut to contrasting image", cuts: (d) => [d / 2] },
  { key: "eyeline-match", label: "Eyeline Match", category: "Cinematic", kind: "simple", emoji: "👁", description: "POV structure: 4 shots", cuts: (d) => [d * 0.25, d * 0.5, d * 0.75] },
  { key: "shot-reverse-shot", label: "Shot/Reverse Shot", category: "Cinematic", kind: "simple", emoji: "🔄", description: "Dialogue editing pattern: 6 alternating shots", cuts: (d) => linspace(0, d, 7).slice(1, -1) },
  { key: "cutaway", label: "Cutaway Series", category: "Cinematic", kind: "simple", emoji: "🎭", description: "Main action with 3 cutaways", cuts: (d) => [d * 0.3, d * 0.35, d * 0.6, d * 0.65] },
  { key: "parallel-cutting", label: "Parallel Cutting", category: "Cinematic", kind: "simple", emoji: "⟺", description: "Two simultaneous storylines: 8 alternating cuts", cuts: (d) => linspace(0, d, 9).slice(1, -1) },
  { key: "insert-shot", label: "Insert Shot", category: "Cinematic", kind: "simple", emoji: "🔍", description: "Insert a brief close-up at 40% and 70%", cuts: (d) => [d * 0.38, d * 0.42, d * 0.68, d * 0.72] },

  // ── Specialized / Fun ────────────────────────────────────────────────────
  { key: "heartbeat", label: "Heartbeat Rhythm", category: "Specialized", kind: "simple", emoji: "❤", description: "Cuts in heartbeat double-pulse pattern", cuts: (d) => { const bpm = 80; const beat = 60 / bpm; const times: number[] = []; for (let t = beat; t < d; t += beat) { times.push(t, t + beat * 0.15); } return times.filter((v) => v < d - 0.05); } },
  { key: "morse-sos", label: "Morse SOS", category: "Specialized", kind: "simple", emoji: "📡", description: "Cuts in SOS pattern (3-3-3)", cuts: (d) => { const u = d / 20; return [u, 2*u, 3*u, 5*u, 6*u, 7*u, 9*u, 10*u, 11*u, 13*u, 17*u, 18*u].filter((v) => v < d); } },
  { key: "breathing", label: "Breathing Rhythm", category: "Specialized", kind: "simple", emoji: "🌬", description: "Inhale/exhale pacing (4s in, 4s out)", cuts: (d) => range(4, d, 4) },
  { key: "poker-tell", label: "Poker Pacing", category: "Specialized", kind: "simple", emoji: "🃏", description: "Slow deliberate cuts with sudden burst", cuts: (d) => [d * 0.33, d * 0.66, d * 0.8, d * 0.87, d * 0.93] },
  { key: "game-level", label: "Game Levels", category: "Specialized", kind: "simple", emoji: "🎮", description: "Level 1/2/3 structure: 25/50/25%", cuts: (d) => [d * 0.25, d * 0.75] },
  { key: "season-change", label: "Seasons", category: "Specialized", kind: "simple", emoji: "🌸", description: "4 seasons: Spring/Summer/Autumn/Winter", cuts: (d) => [d * 0.25, d * 0.5, d * 0.75] },
  { key: "day-cycle", label: "Day Cycle", category: "Specialized", kind: "simple", emoji: "🌅", description: "Morning/Noon/Evening/Night: 4 equal parts", cuts: (d) => [d / 4, d / 2, (d * 3) / 4] },
  { key: "decade-cuts", label: "Decade Timeline", category: "Specialized", kind: "simple", emoji: "📅", description: "For a 10-year retrospective: 10 equal chapters", cuts: (d) => linspace(0, d, 11).slice(1, -1) },

  // ── Interview / Documentary ──────────────────────────────────────────────
  { key: "interview-5q", label: "5-Question Interview", category: "Documentary", kind: "simple", emoji: "🎙", description: "5 equal question segments", cuts: (d) => linspace(0, d, 6).slice(1, -1) },
  { key: "b-roll-overlay", label: "B-Roll Overlay", category: "Documentary", kind: "simple", emoji: "📹", description: "Cut to b-roll at 30%, 50%, 70%", cuts: (d) => [d * 0.3, d * 0.35, d * 0.5, d * 0.55, d * 0.7, d * 0.75] },
  { key: "talking-head", label: "Talking Head", category: "Documentary", kind: "simple", emoji: "🗣", description: "Main speaker with 3 cutaways", cuts: (d) => [d * 0.25, d * 0.3, d * 0.55, d * 0.6] },
  { key: "vox-pop", label: "Vox Pop", category: "Documentary", kind: "simple", emoji: "🎤", description: "Street interview style: 6 rapid interviewees", cuts: (d) => linspace(0, d, 7).slice(1, -1) },
  { key: "news-bulletin", label: "News Bulletin", category: "Documentary", kind: "simple", emoji: "📺", description: "Standard news: intro, 3 stories, outro", cuts: (d) => [d * 0.1, d * 0.4, d * 0.7, d * 0.9] },

  // ── AI Splits ────────────────────────────────────────────────────────────
  { key: "ai-scene-detect", label: "AI Scene Detect", category: "AI", kind: "ai", emoji: "🤖", description: "AI analyzes video and cuts at scene boundaries", cuts: (d) => jitter(linspace(0, d, 6).slice(1, -1), d * 0.05, d) },
  { key: "ai-action-peak", label: "AI Action Peaks", category: "AI", kind: "ai", emoji: "⚡", description: "AI detects motion peaks and cuts there", cuts: (d) => jitter(linspace(0, d, 7).slice(1, -1), d * 0.06, d), transitionKey: "zoom" },
  { key: "ai-emotion-cut", label: "AI Emotion Cut", category: "AI", kind: "ai", emoji: "😊", description: "AI identifies emotional peaks for dramatic cuts", cuts: (d) => golden(d, 4) },
  { key: "ai-dialogue-cut", label: "AI Dialogue Cut", category: "AI", kind: "ai", emoji: "💬", description: "AI cuts on speech pauses", cuts: (d) => jitter(linspace(0, d, 8).slice(1, -1), d * 0.04, d) },
  { key: "ai-beat-sync", label: "AI Beat Sync", category: "AI", kind: "ai", emoji: "🎵", description: "AI syncs cuts to detected beat", cuts: (d, o = {}) => range(60 / (o.bpm ?? 120), d, 60 / (o.bpm ?? 120)) },
  { key: "ai-smart-edit", label: "AI Smart Edit", category: "AI", kind: "ai", emoji: "✨", description: "Full AI: scene detect + beat sync + emotion peaks", cuts: (d) => jitter(fib(d).slice(0, 6), d * 0.03, d), transitionKey: "cross-dissolve" },
  { key: "ai-viral-pacing", label: "AI Viral Pacing", category: "AI", kind: "ai", emoji: "📈", description: "AI optimizes cuts for maximum retention", cuts: (d) => [d * 0.05, d * 0.1, d * 0.15, d * 0.25, d * 0.5, d * 0.8, d * 0.9] },
  { key: "ai-cinematic", label: "AI Cinematic", category: "AI", kind: "ai", emoji: "🎬", description: "AI creates cinematic pacing like a professional editor", cuts: (d) => golden(d, 5) },
  { key: "ai-short-form", label: "AI Short-Form", category: "AI", kind: "ai", emoji: "📱", description: "AI optimizes for TikTok/Reels short-form content", cuts: (d) => [1, 3, 7, Math.min(15, d * 0.6)].filter((v) => v < d) },
  { key: "ai-documentary", label: "AI Documentary", category: "AI", kind: "ai", emoji: "📽", description: "AI creates documentary-style editorial cuts", cuts: (d) => jitter(linspace(0, d, 6).slice(1, -1), d * 0.07, d) },
];

// ─── Smart Edit Templates ────────────────────────────────────────────────────
export interface SmartEditTemplate {
  key: string;
  label: string;
  emoji: string;
  description: string;
  category: string;
  splitPresetKey: string;
  transitionKey?: string;
  effectCycle?: string[];
  colorGradeKey?: string;
  bpm?: number;
}

export const SMART_EDIT_TEMPLATES: SmartEditTemplate[] = [
  { key: "viral-tiktok", label: "Viral TikTok", emoji: "🔥", description: "Fast cuts, zoom transitions, bright grade", category: "Social Media", splitPresetKey: "tiktok-hooks", transitionKey: "zoom-in", colorGradeKey: "vibrant" },
  { key: "cinematic-trailer", label: "Cinematic Trailer", emoji: "🎬", description: "3-act with cross-dissolve, cinematic grade", category: "Cinematic", splitPresetKey: "three-act", transitionKey: "cross-dissolve", colorGradeKey: "cinematic" },
  { key: "sports-hype", label: "Sports Hype Reel", emoji: "🏆", description: "Beat-synced cuts, flash transitions, high contrast", category: "Sports", splitPresetKey: "sports-highlight", transitionKey: "flash", colorGradeKey: "high-contrast", bpm: 128 },
  { key: "music-video-edit", label: "Music Video Edit", emoji: "🎵", description: "Beat-synced cuts, spin transitions, neon grade", category: "Music", splitPresetKey: "bpm-beat", transitionKey: "spin", colorGradeKey: "neon", bpm: 120 },
  { key: "wedding-memory", label: "Wedding Memory", emoji: "💍", description: "Slow dissolves, golden grade, emotional pacing", category: "Personal", splitPresetKey: "nostalgia", transitionKey: "cross-dissolve", colorGradeKey: "warm-golden" },
  { key: "travel-adventure", label: "Travel Adventure", emoji: "✈", description: "Geographic pacing, wipe transitions, vivid grade", category: "Travel", splitPresetKey: "travel-vlog", transitionKey: "wipe-right", colorGradeKey: "vivid" },
  { key: "product-launch", label: "Product Launch", emoji: "🚀", description: "Reveal pacing, zoom transitions, clean grade", category: "Business", splitPresetKey: "product-reveal", transitionKey: "zoom-in", colorGradeKey: "clean" },
  { key: "horror-cut", label: "Horror Cut", emoji: "😱", description: "Tension building cuts, glitch transitions, desaturated", category: "Creative", splitPresetKey: "tension-build", transitionKey: "glitch", colorGradeKey: "horror" },
  { key: "documentary-edit", label: "Documentary Edit", emoji: "📹", description: "Cinematic pacing, dissolves, natural grade", category: "Documentary", splitPresetKey: "three-act", transitionKey: "cross-dissolve", colorGradeKey: "natural" },
  { key: "fashion-editorial", label: "Fashion Editorial", emoji: "👗", description: "Stylish cuts, whip transitions, editorial grade", category: "Fashion", splitPresetKey: "fashion-lookbook", transitionKey: "swipe-right", colorGradeKey: "editorial" },
  { key: "cooking-show", label: "Cooking Show", emoji: "🍳", description: "Step-by-step, simple cuts, warm grade", category: "Lifestyle", splitPresetKey: "cooking-tutorial", transitionKey: "cross-dissolve", colorGradeKey: "warm-golden" },
  { key: "workout-hype", label: "Workout Hype", emoji: "💪", description: "High-energy cuts, flash transitions, high contrast", category: "Sports", splitPresetKey: "workout-reel", transitionKey: "flash", colorGradeKey: "high-contrast" },
];

export const SPLIT_CATEGORIES = [...new Set(SPLIT_PRESETS.map((p) => p.category))];

export function getSplitPreset(key: string): SplitPreset | undefined {
  return SPLIT_PRESETS.find((p) => p.key === key);
}

export function applySplitPreset(
  clip: Clip,
  preset: SplitPreset,
  opts?: { bpm?: number },
): number[] {
  const cuts = preset.cuts(clip.duration, opts);
  return cuts
    .map((t) => clip.startTime + t)
    .filter((t) => t > clip.startTime + 0.05 && t < clip.startTime + clip.duration - 0.05);
}
