import type { EditorState, Clip, Effect, ClipTransition } from "./types";
import { DEFAULT_TEXT_STYLE, DEFAULT_FILTERS } from "./types";

export interface VideoTemplate {
  key: string;
  name: string;
  description: string;
  emoji: string;
  canvasWidth: number;
  canvasHeight: number;
  duration: number;
  background: string;
  build: () => Pick<EditorState, "clips" | "duration" | "canvasWidth" | "canvasHeight" | "background" | "tracks" | "keyframes" | "transitions" | "markers">;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function templateClip(partial: Partial<Clip>): Clip {
  return {
    id: partial.id ?? uid("clip"),
    label: partial.label ?? "Clip",
    mediaType: partial.mediaType ?? "blank",
    trackIndex: partial.trackIndex ?? 0,
    startTime: partial.startTime ?? 0,
    duration: partial.duration ?? 4,
    trimStart: 0,
    trimEnd: 0,
    text: partial.text,
    textStyle: partial.textStyle ?? { ...DEFAULT_TEXT_STYLE },
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    width: partial.width ?? 1,
    height: partial.height ?? 1,
    opacity: partial.opacity ?? 1,
    rotation: partial.rotation ?? 0,
    scale: partial.scale ?? 1,
    flipH: false,
    flipV: false,
    blendMode: partial.blendMode ?? "normal",
    borderRadius: partial.borderRadius ?? 0,
    preserveRatio: false,
    cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1,
    filters: partial.filters ?? { ...DEFAULT_FILTERS },
    speed: 1,
    animationIn: partial.animationIn ?? "fade",
    animationOut: partial.animationOut ?? "fade",
    animationInDuration: 0.5,
    animationOutDuration: 0.5,
    volume: 1,
    muted: false,
    locked: false,
    hidden: false,
    color: partial.color ?? "#1f1f24",
    effects: partial.effects ?? [],
    transitionIn: partial.transitionIn ?? { type: "none", duration: 0.5 },
  };
}

const baseTracks = [
  { id: "track-overlay", name: "Text & Overlay", type: "overlay" as const, muted: false, hidden: false, locked: false },
  { id: "track-video", name: "Main", type: "video" as const, muted: false, hidden: false, locked: false },
  { id: "track-audio", name: "Audio", type: "audio" as const, muted: false, hidden: false, locked: false },
];

export const TEMPLATES: VideoTemplate[] = [
  {
    key: "social-reel",
    name: "Social Reel",
    description: "Vertical 9:16 with intro title, 3 image slots, outro card.",
    emoji: "📱",
    canvasWidth: 1080,
    canvasHeight: 1920,
    duration: 18,
    background: "#0f0f1a",
    build() {
      const slot1: ClipTransition = { type: "slideLeft", duration: 0.4 };
      const slot2: ClipTransition = { type: "zoom", duration: 0.4 };
      const slot3: ClipTransition = { type: "fade", duration: 0.4 };
      const clips: Clip[] = [
        templateClip({
          label: "Intro Title",
          mediaType: "text",
          text: "YOUR\nTITLE",
          textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 180, fontWeight: 900, color: "#ffffff" },
          trackIndex: 0,
          startTime: 0,
          duration: 3,
          x: 0.05, y: 0.35, width: 0.9, height: 0.3,
          animationIn: "zoomIn", animationOut: "fade",
          color: "#f43f5e",
          effects: [{ id: uid("fx"), type: "glow", intensity: 0.6, color: "#f43f5e" }],
        }),
        templateClip({
          label: "Slot 1 (replace media)",
          mediaType: "blank",
          trackIndex: 1,
          startTime: 3,
          duration: 4,
          color: "#3b82f6",
        }),
        templateClip({
          label: "Slot 2 (replace media)",
          mediaType: "blank",
          trackIndex: 1,
          startTime: 7,
          duration: 4,
          color: "#8b5cf6",
          transitionIn: slot1,
        }),
        templateClip({
          label: "Slot 3 (replace media)",
          mediaType: "blank",
          trackIndex: 1,
          startTime: 11,
          duration: 4,
          color: "#10b981",
          transitionIn: slot2,
        }),
        templateClip({
          label: "Outro CTA",
          mediaType: "text",
          text: "FOLLOW\nFOR MORE",
          textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 140, fontWeight: 800, color: "#ffffff", background: "#000000cc" },
          trackIndex: 0,
          startTime: 15,
          duration: 3,
          x: 0.05, y: 0.4, width: 0.9, height: 0.2,
          animationIn: "slideUp", animationOut: "fade",
          color: "#000000",
          transitionIn: slot3,
        }),
      ];
      return {
        clips, duration: 18,
        canvasWidth: 1080, canvasHeight: 1920, background: "#0f0f1a",
        tracks: baseTracks, keyframes: [], transitions: [], markers: [],
      };
    },
  },
  {
    key: "slideshow",
    name: "Photo Slideshow",
    description: "16:9 slideshow with 4 image slots and smooth crossfades.",
    emoji: "🖼️",
    canvasWidth: 1920,
    canvasHeight: 1080,
    duration: 16,
    background: "#000000",
    build() {
      const cross: ClipTransition = { type: "fade", duration: 0.8 };
      const colors = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981"];
      const clips: Clip[] = colors.map((c, i) =>
        templateClip({
          label: `Photo ${i + 1} (replace)`,
          mediaType: "blank",
          trackIndex: 1,
          startTime: i * 4,
          duration: 4,
          color: c,
          animationIn: i === 0 ? "fade" : "none",
          animationOut: "none",
          transitionIn: i === 0 ? { type: "none", duration: 0.5 } : cross,
        }),
      );
      return {
        clips, duration: 16,
        canvasWidth: 1920, canvasHeight: 1080, background: "#000000",
        tracks: baseTracks, keyframes: [], transitions: [], markers: [],
      };
    },
  },
  {
    key: "promo",
    name: "Square Promo",
    description: "1:1 promo with bold text, glow effect and zoom transitions.",
    emoji: "✨",
    canvasWidth: 1080,
    canvasHeight: 1080,
    duration: 12,
    background: "#0a0a0f",
    build() {
      const zoom: ClipTransition = { type: "zoom", duration: 0.5 };
      const clips: Clip[] = [
        templateClip({
          label: "Hook Title",
          mediaType: "text",
          text: "SALE",
          textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 320, fontWeight: 900, color: "#fbbf24" },
          trackIndex: 0,
          startTime: 0, duration: 3,
          x: 0.05, y: 0.35, width: 0.9, height: 0.3,
          animationIn: "zoomIn", animationOut: "fade",
          color: "#fbbf24",
          effects: [{ id: uid("fx"), type: "glow", intensity: 0.8, color: "#fbbf24" }],
        }),
        templateClip({
          label: "Product Slot",
          mediaType: "blank",
          trackIndex: 1,
          startTime: 3, duration: 5,
          color: "#3b82f6",
          transitionIn: zoom,
          effects: [{ id: uid("fx"), type: "vignette", intensity: 0.5 }],
        }),
        templateClip({
          label: "Price Tag",
          mediaType: "text",
          text: "50% OFF",
          textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 220, fontWeight: 900, color: "#ffffff", background: "#dc2626" },
          trackIndex: 0,
          startTime: 8, duration: 4,
          x: 0.1, y: 0.4, width: 0.8, height: 0.2,
          animationIn: "bounce", animationOut: "fade",
          color: "#dc2626",
          transitionIn: zoom,
          effects: [{ id: uid("fx"), type: "shake", intensity: 0.3 }],
        }),
      ];
      return {
        clips, duration: 12,
        canvasWidth: 1080, canvasHeight: 1080, background: "#0a0a0f",
        tracks: baseTracks, keyframes: [], transitions: [], markers: [],
      };
    },
  },
  {
    key: "title-card",
    name: "Cinematic Title",
    description: "16:9 cinematic title card with vignette and slow fade.",
    emoji: "🎬",
    canvasWidth: 1920,
    canvasHeight: 1080,
    duration: 6,
    background: "#000000",
    build() {
      const fxs: Effect[] = [
        { id: uid("fx"), type: "vignette", intensity: 0.7 },
        { id: uid("fx"), type: "scanlines", intensity: 0.15 },
      ];
      const clips: Clip[] = [
        templateClip({
          label: "Backdrop",
          mediaType: "blank",
          trackIndex: 1,
          startTime: 0, duration: 6,
          color: "#1a1a2e",
          effects: fxs,
        }),
        templateClip({
          label: "Title",
          mediaType: "text",
          text: "A CINEMATIC\nMOMENT",
          textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 140, fontWeight: 700, color: "#ffffff" },
          trackIndex: 0,
          startTime: 0.5, duration: 5,
          x: 0.1, y: 0.35, width: 0.8, height: 0.3,
          animationIn: "fade", animationOut: "fade",
          animationInDuration: 1.2, animationOutDuration: 1.2,
          color: "#ffffff",
        }),
        templateClip({
          label: "Subtitle",
          mediaType: "text",
          text: "directed by you",
          textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 48, fontWeight: 400, color: "#a3a3a3", italic: true },
          trackIndex: 0,
          startTime: 2, duration: 4,
          x: 0.1, y: 0.62, width: 0.8, height: 0.08,
          animationIn: "fade", animationOut: "fade",
          animationInDuration: 1, animationOutDuration: 1,
          color: "#a3a3a3",
        }),
      ];
      return {
        clips, duration: 6,
        canvasWidth: 1920, canvasHeight: 1080, background: "#000000",
        tracks: baseTracks, keyframes: [], transitions: [], markers: [],
      };
    },
  },
  // ────────────────────────────────────────────────────────────────────────
  // Procedurally-built template entries (46 of them) — added in Phase 2.
  // Each entry composes the same `templateClip` + `baseTracks` building
  // blocks already used above. We define them via small factory helpers so
  // we don't repeat 50 nearly-identical objects by hand.
  // ────────────────────────────────────────────────────────────────────────
  ...buildExtendedTemplates(),
];

/**
 * Build a "title-only" template — single backdrop + single big text + a
 * subtle outro tag. Used as the basis for many of the 46 extra templates.
 */
function buildTitleTpl(opts: {
  key: string;
  name: string;
  description: string;
  emoji: string;
  width: number;
  height: number;
  duration?: number;
  bg: string;
  title: string;
  titleColor?: string;
  titleSize?: number;
  subtitle?: string;
  fxType?: "vignette" | "glow" | "tint" | "scanlines" | "shake";
  fxColor?: string;
}): VideoTemplate {
  const dur = opts.duration ?? 8;
  const fontSize =
    opts.titleSize ?? (opts.width > opts.height ? 160 : 200);
  return {
    key: opts.key,
    name: opts.name,
    description: opts.description,
    emoji: opts.emoji,
    canvasWidth: opts.width,
    canvasHeight: opts.height,
    duration: dur,
    background: opts.bg,
    build() {
      const fxs: Effect[] = opts.fxType
        ? [{ id: uid("fx"), type: opts.fxType, intensity: 0.55, color: opts.fxColor }]
        : [];
      const clips: Clip[] = [
        templateClip({
          label: "Backdrop",
          mediaType: "blank",
          trackIndex: 1,
          startTime: 0,
          duration: dur,
          color: opts.bg,
          effects: fxs,
        }),
        templateClip({
          label: "Title",
          mediaType: "text",
          text: opts.title,
          textStyle: {
            ...DEFAULT_TEXT_STYLE,
            fontSize,
            fontWeight: 900,
            color: opts.titleColor ?? "#ffffff",
          },
          trackIndex: 0,
          startTime: 0.3,
          duration: dur - 0.6,
          x: 0.05,
          y: 0.36,
          width: 0.9,
          height: 0.28,
          animationIn: "zoomIn",
          animationOut: "fade",
          animationInDuration: 0.7,
          animationOutDuration: 0.7,
          color: opts.titleColor ?? "#ffffff",
        }),
        ...(opts.subtitle
          ? [templateClip({
              label: "Subtitle",
              mediaType: "text",
              text: opts.subtitle,
              textStyle: {
                ...DEFAULT_TEXT_STYLE,
                fontSize: Math.round(fontSize * 0.32),
                fontWeight: 500,
                color: "#cbd5e1",
              },
              trackIndex: 0,
              startTime: 1,
              duration: dur - 1.5,
              x: 0.1,
              y: 0.66,
              width: 0.8,
              height: 0.08,
              animationIn: "slideUp",
              animationOut: "fade",
              color: "#cbd5e1",
            })]
          : []),
      ];
      return {
        clips,
        duration: dur,
        canvasWidth: opts.width,
        canvasHeight: opts.height,
        background: opts.bg,
        tracks: baseTracks,
        keyframes: [],
        transitions: [],
        markers: [],
      };
    },
  };
}

/**
 * Build a multi-slot slideshow template (N media slots back-to-back with
 * the same crossfade transition). Includes optional intro & outro text.
 */
function buildSlideshowTpl(opts: {
  key: string;
  name: string;
  description: string;
  emoji: string;
  width: number;
  height: number;
  bg: string;
  slots: number;
  slotDuration?: number;
  transition?: ClipTransition["type"];
  intro?: string;
  outro?: string;
  palette?: string[];
}): VideoTemplate {
  const slotDur = opts.slotDuration ?? 3;
  const palette = opts.palette ?? [
    "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
    "#10b981", "#06b6d4", "#f97316", "#a855f7",
  ];
  const introDur = opts.intro ? 2 : 0;
  const outroDur = opts.outro ? 2 : 0;
  const total = introDur + opts.slots * slotDur + outroDur;
  return {
    key: opts.key,
    name: opts.name,
    description: opts.description,
    emoji: opts.emoji,
    canvasWidth: opts.width,
    canvasHeight: opts.height,
    duration: total,
    background: opts.bg,
    build() {
      const xs: ClipTransition = { type: opts.transition ?? "fade", duration: 0.5 };
      const clips: Clip[] = [];
      if (opts.intro) {
        clips.push(templateClip({
          label: "Intro",
          mediaType: "text",
          text: opts.intro,
          textStyle: {
            ...DEFAULT_TEXT_STYLE,
            fontSize: opts.width > opts.height ? 140 : 180,
            fontWeight: 900,
            color: "#ffffff",
          },
          trackIndex: 0,
          startTime: 0,
          duration: introDur,
          x: 0.05, y: 0.4, width: 0.9, height: 0.2,
          animationIn: "zoomIn",
          animationOut: "fade",
          color: "#ffffff",
        }));
      }
      for (let i = 0; i < opts.slots; i++) {
        clips.push(templateClip({
          label: `Slot ${i + 1} (replace media)`,
          mediaType: "blank",
          trackIndex: 1,
          startTime: introDur + i * slotDur,
          duration: slotDur,
          color: palette[i % palette.length],
          animationIn: i === 0 ? "fade" : "none",
          animationOut: "none",
          transitionIn: i === 0 ? { type: "none", duration: 0.5 } : xs,
        }));
      }
      if (opts.outro) {
        clips.push(templateClip({
          label: "Outro",
          mediaType: "text",
          text: opts.outro,
          textStyle: {
            ...DEFAULT_TEXT_STYLE,
            fontSize: opts.width > opts.height ? 130 : 170,
            fontWeight: 800,
            color: "#ffffff",
            background: "#000000aa",
          },
          trackIndex: 0,
          startTime: introDur + opts.slots * slotDur,
          duration: outroDur,
          x: 0.05, y: 0.4, width: 0.9, height: 0.2,
          animationIn: "slideUp",
          animationOut: "fade",
          color: "#000000",
        }));
      }
      return {
        clips,
        duration: total,
        canvasWidth: opts.width,
        canvasHeight: opts.height,
        background: opts.bg,
        tracks: baseTracks,
        keyframes: [],
        transitions: [],
        markers: [],
      };
    },
  };
}

/**
 * Build a "lower third" template — small backdrop strip at the bottom +
 * 2 lines of text. Designed to overlay onto another video.
 */
function buildLowerThirdTpl(opts: {
  key: string;
  name: string;
  emoji: string;
  width: number;
  height: number;
  bg: string;
  primary: string;
  secondary: string;
  bgColor: string;
}): VideoTemplate {
  return {
    key: opts.key,
    name: opts.name,
    description: `Lower third overlay: ${opts.primary} / ${opts.secondary}.`,
    emoji: opts.emoji,
    canvasWidth: opts.width,
    canvasHeight: opts.height,
    duration: 6,
    background: opts.bg,
    build() {
      const clips: Clip[] = [
        templateClip({
          label: "Backdrop",
          mediaType: "blank",
          trackIndex: 1,
          startTime: 0,
          duration: 6,
          color: opts.bg,
        }),
        templateClip({
          label: "Lower-3rd Strip",
          mediaType: "blank",
          trackIndex: 0,
          startTime: 0,
          duration: 6,
          x: 0.05,
          y: 0.78,
          width: 0.5,
          height: 0.12,
          color: opts.bgColor,
          borderRadius: 8,
          animationIn: "slideLeft",
          animationOut: "slideLeft",
        }),
        templateClip({
          label: "Name",
          mediaType: "text",
          text: opts.primary,
          textStyle: {
            ...DEFAULT_TEXT_STYLE,
            fontSize: 56,
            fontWeight: 800,
            color: "#ffffff",
          },
          trackIndex: 0,
          startTime: 0.3,
          duration: 5.7,
          x: 0.07,
          y: 0.79,
          width: 0.46,
          height: 0.06,
          animationIn: "slideLeft",
          animationOut: "fade",
          color: "#ffffff",
        }),
        templateClip({
          label: "Role",
          mediaType: "text",
          text: opts.secondary,
          textStyle: {
            ...DEFAULT_TEXT_STYLE,
            fontSize: 32,
            fontWeight: 500,
            color: "#cbd5e1",
          },
          trackIndex: 0,
          startTime: 0.5,
          duration: 5.5,
          x: 0.07,
          y: 0.85,
          width: 0.46,
          height: 0.05,
          animationIn: "slideLeft",
          animationOut: "fade",
          color: "#cbd5e1",
        }),
      ];
      return {
        clips,
        duration: 6,
        canvasWidth: opts.width,
        canvasHeight: opts.height,
        background: opts.bg,
        tracks: baseTracks,
        keyframes: [],
        transitions: [],
        markers: [],
      };
    },
  };
}

/**
 * Builds the 46 extra Phase-2 templates so the user has 50 in total.
 * Mix of vertical / square / landscape covering social, marketing,
 * education, news, vlog, podcast, ecommerce and cinematic use cases.
 */
function buildExtendedTemplates(): VideoTemplate[] {
  return [
    // ── Vertical / Social Story (1080×1920) ──────────────────────────────
    buildTitleTpl({ key: "story-quote",   name: "Story Quote",       description: "Bold pull-quote on dark vertical canvas.", emoji: "💬", width: 1080, height: 1920, bg: "#0f172a", title: "“Stay\nhungry.”", titleSize: 220, subtitle: "— Steve Jobs", fxType: "vignette" }),
    buildTitleTpl({ key: "story-stat",    name: "Stat Drop",         description: "Single big-number stat for vertical socials.", emoji: "📊", width: 1080, height: 1920, bg: "#1e1b4b", title: "82%", titleSize: 600, subtitle: "of users prefer vertical video", fxType: "glow", fxColor: "#a78bfa" }),
    buildTitleTpl({ key: "story-coming",  name: "Coming Soon",       description: "Vertical tease with neon glow.", emoji: "🚀", width: 1080, height: 1920, bg: "#020617", title: "COMING\nSOON", titleColor: "#22d3ee", titleSize: 240, fxType: "glow", fxColor: "#22d3ee" }),
    buildTitleTpl({ key: "story-thanks",  name: "Thank You Card",    description: "Closing thank-you screen for socials.", emoji: "🙏", width: 1080, height: 1920, bg: "#7c2d12", title: "THANK\nYOU", titleSize: 260, subtitle: "for watching", fxType: "vignette" }),
    buildSlideshowTpl({ key: "story-3-up",  name: "3-Photo Story",   description: "9:16 story with three photo slots and slide-left cuts.", emoji: "🎞️", width: 1080, height: 1920, bg: "#000", slots: 3, slotDuration: 2.5, transition: "slideLeft", intro: "STORY", outro: "FOLLOW" }),
    buildSlideshowTpl({ key: "reel-5-up",   name: "5-Clip Reel",     description: "Fast-cut vertical reel with five clip slots.", emoji: "⚡", width: 1080, height: 1920, bg: "#0f0f1a", slots: 5, slotDuration: 1.8, transition: "zoom", intro: "WATCH", outro: "LIKE & FOLLOW" }),

    // ── Square / Instagram (1080×1080) ───────────────────────────────────
    buildTitleTpl({ key: "sq-announce",   name: "Square Announcement", description: "1:1 announcement card with bold center title.", emoji: "📣", width: 1080, height: 1080, bg: "#1d4ed8", title: "BIG\nNEWS", titleSize: 260, subtitle: "Read on for the details", fxType: "glow", fxColor: "#60a5fa" }),
    buildTitleTpl({ key: "sq-quote",      name: "Square Quote",        description: "1:1 quote card for daily inspiration posts.", emoji: "🌟", width: 1080, height: 1080, bg: "#111827", title: "“Done is\nbetter than\nperfect.”", titleSize: 130, subtitle: "— Sheryl Sandberg", fxType: "vignette" }),
    buildTitleTpl({ key: "sq-event",      name: "Event Save-the-Date", description: "1:1 event teaser with date and location.", emoji: "📅", width: 1080, height: 1080, bg: "#831843", title: "OCT 12", titleSize: 320, titleColor: "#fde68a", subtitle: "Brooklyn · 7pm", fxType: "tint", fxColor: "#831843" }),
    buildSlideshowTpl({ key: "sq-trio",   name: "Square Trio",         description: "Three-slot square slideshow with crossfade.", emoji: "🟦", width: 1080, height: 1080, bg: "#0a0a0f", slots: 3, slotDuration: 3, transition: "fade", intro: "FEATURED", outro: "SHOP" }),
    buildSlideshowTpl({ key: "sq-grid",   name: "Square 4-Up",          description: "Four square slots with bouncy zoom transitions.", emoji: "▣", width: 1080, height: 1080, bg: "#000", slots: 4, slotDuration: 2, transition: "zoom", intro: "LOOKBOOK", outro: "SWIPE UP" }),

    // ── Landscape / 16:9 (1920×1080) ─────────────────────────────────────
    buildTitleTpl({ key: "ld-cinema",     name: "Cinema Slate",        description: "16:9 cinematic title with vignette and scanlines.", emoji: "🎬", width: 1920, height: 1080, bg: "#0a0a0a", title: "CHAPTER\nONE", titleColor: "#f5f5f4", titleSize: 200, subtitle: "a film by you", fxType: "vignette" }),
    buildTitleTpl({ key: "ld-news",       name: "News Title",          description: "Breaking-news style 16:9 title screen.", emoji: "📺", width: 1920, height: 1080, bg: "#7f1d1d", title: "BREAKING\nNEWS", titleColor: "#fff", titleSize: 200, subtitle: "Live · Right now", fxType: "scanlines" }),
    buildTitleTpl({ key: "ld-tutorial",   name: "Tutorial Intro",      description: "16:9 tutorial intro with friendly subtitle.", emoji: "📚", width: 1920, height: 1080, bg: "#0f766e", title: "HOW IT\nWORKS", titleSize: 180, subtitle: "A 60-second walkthrough", fxType: "glow", fxColor: "#5eead4" }),
    buildTitleTpl({ key: "ld-vlog",       name: "Vlog Intro",          description: "Casual 16:9 vlog intro card.", emoji: "🎥", width: 1920, height: 1080, bg: "#1f2937", title: "MORNING\nROUTINE", titleSize: 170, subtitle: "Day 12 of 30", fxType: "vignette" }),
    buildTitleTpl({ key: "ld-podcast",    name: "Podcast Cover",       description: "16:9 podcast cover plate with show title.", emoji: "🎙️", width: 1920, height: 1080, bg: "#3b0764", title: "DEEP\nDIVE", titleColor: "#fde68a", titleSize: 220, subtitle: "Episode 014 · The Future of AI", fxType: "glow", fxColor: "#a855f7" }),
    buildTitleTpl({ key: "ld-stream",     name: "Stream Starting Soon", description: "Twitch-style 16:9 standby screen.", emoji: "🟣", width: 1920, height: 1080, bg: "#1e1b4b", title: "STREAM\nSTARTING\nSOON", titleColor: "#a5b4fc", titleSize: 150, subtitle: "Hang tight — we begin in a few minutes", fxType: "scanlines" }),
    buildTitleTpl({ key: "ld-ending",     name: "End Screen",          description: "16:9 ending card with thanks and CTA.", emoji: "🏁", width: 1920, height: 1080, bg: "#0f172a", title: "THANKS FOR\nWATCHING", titleSize: 150, subtitle: "Subscribe for more", fxType: "vignette" }),
    buildTitleTpl({ key: "ld-countdown",  name: "Countdown Title",     description: "16:9 launch countdown title screen.", emoji: "⏳", width: 1920, height: 1080, bg: "#0c0a09", title: "T-MINUS\n10", titleColor: "#facc15", titleSize: 220, subtitle: "Until launch", fxType: "glow", fxColor: "#facc15" }),
    buildTitleTpl({ key: "ld-product",    name: "Product Reveal",      description: "16:9 product reveal title with tint.", emoji: "📦", width: 1920, height: 1080, bg: "#082f49", title: "INTRODUCING\nAURORA", titleColor: "#fff", titleSize: 150, subtitle: "Now in beta", fxType: "tint", fxColor: "#0ea5e9" }),
    buildSlideshowTpl({ key: "ld-photo-4",  name: "16:9 Photo Story",    description: "Four-slot landscape slideshow with smooth fades.", emoji: "🖼️", width: 1920, height: 1080, bg: "#000", slots: 4, slotDuration: 3, transition: "fade", intro: "MEMORIES", outro: "THE END" }),
    buildSlideshowTpl({ key: "ld-recap",    name: "Year in Review",     description: "Six-slot landscape recap with bouncy transitions.", emoji: "🎉", width: 1920, height: 1080, bg: "#1e1b4b", slots: 6, slotDuration: 2.5, transition: "zoom", intro: "2025 RECAP", outro: "HERE'S TO 2026" }),
    buildSlideshowTpl({ key: "ld-trailer",  name: "Movie Trailer",      description: "Eight-slot landscape trailer with hard cuts.", emoji: "🎞️", width: 1920, height: 1080, bg: "#000", slots: 8, slotDuration: 1.5, transition: "fade", intro: "ONE WORLD.", outro: "COMING SOON." }),
    buildSlideshowTpl({ key: "ld-product-grid", name: "Product Showcase", description: "Five product slots with zoom transitions.", emoji: "🛍️", width: 1920, height: 1080, bg: "#fafaf9", slots: 5, slotDuration: 2.4, transition: "zoom", intro: "NEW ARRIVALS", outro: "SHOP NOW", palette: ["#fda4af", "#fcd34d", "#86efac", "#93c5fd", "#c4b5fd"] }),

    // ── Vertical Marketing (1080×1920) ───────────────────────────────────
    buildTitleTpl({ key: "v-sale",        name: "Vertical Sale",       description: "Loud vertical sale promo with red glow.", emoji: "🔥", width: 1080, height: 1920, bg: "#7f1d1d", title: "70%\nOFF", titleColor: "#fef9c3", titleSize: 600, subtitle: "Today only — ends midnight", fxType: "glow", fxColor: "#dc2626" }),
    buildTitleTpl({ key: "v-bts",         name: "Behind the Scenes",   description: "Vertical BTS title card with grain.", emoji: "🎬", width: 1080, height: 1920, bg: "#1c1917", title: "BEHIND\nTHE\nSCENES", titleSize: 200, subtitle: "Day 03 on set", fxType: "scanlines" }),
    buildTitleTpl({ key: "v-recipe",      name: "Recipe Title",        description: "Vertical recipe card with warm tone.", emoji: "🍳", width: 1080, height: 1920, bg: "#fef3c7", title: "MISO\nRAMEN", titleColor: "#7c2d12", titleSize: 240, subtitle: "Ready in 25 minutes", fxType: "tint", fxColor: "#facc15" }),
    buildTitleTpl({ key: "v-fitness",     name: "Workout Of the Day",  description: "Vertical fitness intro with bold hook.", emoji: "💪", width: 1080, height: 1920, bg: "#0c0a09", title: "20 MIN\nHIIT", titleColor: "#f97316", titleSize: 260, subtitle: "No equipment · Full body", fxType: "glow", fxColor: "#f97316" }),
    buildTitleTpl({ key: "v-real-estate", name: "Listing Reveal",      description: "Vertical real-estate listing reveal.", emoji: "🏠", width: 1080, height: 1920, bg: "#0c4a6e", title: "JUST\nLISTED", titleColor: "#fff", titleSize: 220, subtitle: "3 bd · 2 ba · $785k", fxType: "vignette" }),
    buildTitleTpl({ key: "v-meditation",  name: "Calm Meditation",     description: "Soothing vertical meditation card.", emoji: "🧘", width: 1080, height: 1920, bg: "#134e4a", title: "BREATHE", titleColor: "#a7f3d0", titleSize: 240, subtitle: "Inhale · 4 · Hold · 4 · Exhale · 4", fxType: "tint", fxColor: "#5eead4" }),

    // ── Lower Thirds (six variants, all 16:9) ────────────────────────────
    buildLowerThirdTpl({ key: "lt-name",      name: "Speaker — Name",     emoji: "🪪", width: 1920, height: 1080, bg: "#111", primary: "Jane Doe",         secondary: "Founder & CEO",   bgColor: "#1d4ed8" }),
    buildLowerThirdTpl({ key: "lt-name-red",  name: "Speaker — Bold Red", emoji: "🟥", width: 1920, height: 1080, bg: "#000", primary: "Marcus Lee",       secondary: "Lead Designer",   bgColor: "#dc2626" }),
    buildLowerThirdTpl({ key: "lt-news",      name: "News Lower-3rd",     emoji: "🟦", width: 1920, height: 1080, bg: "#000", primary: "Live: New York",   secondary: "Reporting from Brooklyn", bgColor: "#0f172a" }),
    buildLowerThirdTpl({ key: "lt-podcast",   name: "Podcast Guest",      emoji: "🎤", width: 1920, height: 1080, bg: "#1c1917", primary: "Dr. Priya Patel", secondary: "Author · Atomic Mind", bgColor: "#7c3aed" }),
    buildLowerThirdTpl({ key: "lt-vlog",      name: "Vlog Caption",       emoji: "💬", width: 1920, height: 1080, bg: "#0c0a09", primary: "Tokyo, Japan",    secondary: "Day 4 of 12",     bgColor: "#16a34a" }),
    buildLowerThirdTpl({ key: "lt-cta",       name: "Subscribe Strip",    emoji: "🔔", width: 1920, height: 1080, bg: "#000", primary: "Subscribe!",       secondary: "Hit the bell for more", bgColor: "#ef4444" }),

    // ── Cinematic / Title-Card variants ──────────────────────────────────
    buildTitleTpl({ key: "cine-noir",     name: "Film Noir Title",     description: "Black-and-white noir intro with vignette.", emoji: "🕵️", width: 1920, height: 1080, bg: "#000", title: "THE LAST\nCASE", titleColor: "#f5f5f4", titleSize: 180, subtitle: "A short film", fxType: "vignette" }),
    buildTitleTpl({ key: "cine-vhs",      name: "VHS Throwback",       description: "Retro VHS scanline title.", emoji: "📼", width: 1920, height: 1080, bg: "#1c1917", title: "REWIND\n1995", titleColor: "#fde68a", titleSize: 180, subtitle: "▶ PLAY", fxType: "scanlines" }),
    buildTitleTpl({ key: "cine-glitch",   name: "Glitch Intro",        description: "Glitchy shake intro for music videos.", emoji: "📡", width: 1920, height: 1080, bg: "#020617", title: "404", titleColor: "#22d3ee", titleSize: 380, subtitle: "// signal lost", fxType: "shake" }),
    buildTitleTpl({ key: "cine-aurora",   name: "Aurora Tint",         description: "Cool aurora-tinted title screen.", emoji: "🌌", width: 1920, height: 1080, bg: "#0f172a", title: "DREAMSCAPE", titleColor: "#a5f3fc", titleSize: 170, subtitle: "An ambient journey", fxType: "tint", fxColor: "#22d3ee" }),
    buildTitleTpl({ key: "cine-gold",     name: "Golden Hour",         description: "Warm golden-hour title with glow.", emoji: "🌅", width: 1920, height: 1080, bg: "#7c2d12", title: "GOLDEN\nHOUR", titleColor: "#fde68a", titleSize: 200, subtitle: "Sunset shoot · take one", fxType: "glow", fxColor: "#fbbf24" }),

    // ── Educational / Marketing extras (mixed orientations) ─────────────
    buildSlideshowTpl({ key: "edu-3-tip",  name: "3 Tips Slideshow",  description: "Vertical 3-tip carousel for tutorials.",      emoji: "💡", width: 1080, height: 1920, bg: "#0f172a", slots: 3, slotDuration: 3.5, transition: "slideUp", intro: "3 TIPS", outro: "WHICH TIP?" }),
    buildSlideshowTpl({ key: "edu-howto",  name: "How-To Stepper",    description: "Square 4-step how-to with hard cuts.",         emoji: "🪜", width: 1080, height: 1080, bg: "#020617", slots: 4, slotDuration: 3, transition: "slideLeft", intro: "HOW TO", outro: "TRY IT" }),
    buildTitleTpl({ key: "edu-q-and-a",   name: "Q&A Card",          description: "Square Q&A title with bold question.",         emoji: "❓", width: 1080, height: 1080, bg: "#1d4ed8", title: "Q:\nWHY VIDEO?", titleSize: 130, subtitle: "Tap to find out", fxType: "glow", fxColor: "#60a5fa" }),
    buildSlideshowTpl({ key: "promo-flash", name: "Flash Sale",       description: "Rapid-cut vertical flash-sale promo.",         emoji: "⚡", width: 1080, height: 1920, bg: "#7f1d1d", slots: 4, slotDuration: 1.2, transition: "zoom", intro: "FLASH SALE", outro: "ENDS TONIGHT" }),
    buildSlideshowTpl({ key: "promo-luxe",  name: "Luxe Reveal",      description: "Slow elegant 16:9 luxury product reveal.",     emoji: "💎", width: 1920, height: 1080, bg: "#000", slots: 3, slotDuration: 4, transition: "fade", intro: "INTRODUCING", outro: "AVAILABLE NOW", palette: ["#fde68a", "#fff", "#fcd34d"] }),
    buildTitleTpl({ key: "promo-coupon",   name: "Coupon Code",       description: "Square coupon code blast with shake.",         emoji: "🎟️", width: 1080, height: 1080, bg: "#0c0a09", title: "USE CODE\nFLOW20", titleColor: "#fde68a", titleSize: 170, subtitle: "20% off your first order", fxType: "shake" }),
    buildTitleTpl({ key: "promo-launch",   name: "Launch Day",        description: "Vertical launch-day countdown card.",          emoji: "🎉", width: 1080, height: 1920, bg: "#1e1b4b", title: "LAUNCH\nDAY", titleColor: "#fff", titleSize: 240, subtitle: "Doors open at 9am PT", fxType: "glow", fxColor: "#a855f7" }),
  ];
}

export function getTemplateByKey(key: string): VideoTemplate | undefined {
  return TEMPLATES.find((t) => t.key === key);
}
