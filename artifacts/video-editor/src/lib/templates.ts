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
    color: partial.color ?? "#3b82f6",
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
];

export function getTemplateByKey(key: string): VideoTemplate | undefined {
  return TEMPLATES.find((t) => t.key === key);
}
