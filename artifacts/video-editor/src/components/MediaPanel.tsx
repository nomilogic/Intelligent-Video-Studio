import { useMemo, useRef, useState } from "react";
import { Plus, Trash2, Film, Music, Image as ImageIcon, Type, Square, Sparkles, Layout, Droplets, Shapes, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { EditorState, EditorAction, MediaAsset, DEFAULT_TEXT_STYLE, type TextStyle } from "../lib/types";
import { textContainerStyle, textElementStyle } from "../lib/text-style";
import { makeClip } from "../lib/reducer";
import { TEMPLATES } from "../lib/templates";
import { SHAPE_LIBRARY } from "../lib/shape-library";
import { PARTICLE_LIBRARY } from "../lib/particles";
import { SPECIAL_LAYERS } from "../lib/special-layers";
import { loadPresets, deletePreset, type CustomPreset } from "../lib/custom-library";
import { TEXT_PRESETS as ALL_TEXT_PRESETS, TEXT_PRESET_CATEGORIES, type TextPreset, type TextPresetCategory } from "../lib/text-presets";
import { buildMotionKeyframes } from "../lib/motion-paths";
import { cn } from "@/lib/utils";

const CLIP_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#f43f5e", "#06b6d4", "#f97316", "#ec4899"];

// Pre-configured animated text layers — each adds a styled text clip with
// a baked-in motion path preset applied as keyframes on the timeline.
const ANIMATED_TEXT_LAYERS: Array<{
  key: string; label: string; emoji: string; description: string; text: string;
  clipColor: string; animationIn: string; animationOut: string;
  motionPath: string; x: number; y: number; w: number; h: number;
  style: Partial<TextStyle>;
}> = [
  { key: "atl-rise-title",   label: "Rise Title",        emoji: "⬆️",  description: "Bold title that rises into frame",            text: "YOUR TITLE", clipColor: "#8b5cf6", animationIn: "slideUp",   animationOut: "fade", motionPath: "rise",       x: 0.05, y: 0.35, w: 0.9, h: 0.15, style: { fontFamily: "'Anton', sans-serif", fontSize: 140, fontWeight: 900, color: "#ffffff", align: "center", letterSpacing: 4 } },
  { key: "atl-float-quote",  label: "Floating Quote",    emoji: "💬",  description: "Italic serif quote that gently floats",        text: "Words that matter.", clipColor: "#a855f7", animationIn: "fade", animationOut: "fade", motionPath: "float", x: 0.1, y: 0.38, w: 0.8, h: 0.12, style: { fontFamily: "'Cormorant Garamond', serif", fontSize: 60, fontWeight: 300, color: "#f5f0e8", align: "center", italic: true, letterSpacing: 2 } },
  { key: "atl-neon-slide",   label: "Neon Slide",        emoji: "🌈",  description: "Neon glow text slides in from left",           text: "NEON", clipColor: "#ec4899", animationIn: "slideLeft",  animationOut: "fade", motionPath: "slide-in-l", x: 0.05, y: 0.38, w: 0.9, h: 0.15, style: { fontFamily: "'Poppins', sans-serif", fontSize: 120, fontWeight: 800, color: "#ff0099", align: "center", glow: { enabled: true, color: "#ff0099", blur: 20, intensity: 3 } } },
  { key: "atl-lower-drift",  label: "Lower-Third Drift", emoji: "📺",  description: "Lower-third caption that drifts right",        text: "Lower Third", clipColor: "#3b82f6", animationIn: "slideLeft", animationOut: "fade", motionPath: "drift-r", x: 0.03, y: 0.78, w: 0.55, h: 0.1, style: { fontFamily: "Inter, system-ui, sans-serif", fontSize: 36, fontWeight: 600, color: "#ffffff", align: "left" } },
  { key: "atl-retro-shake",  label: "Retro Shake",       emoji: "📼",  description: "Bold retro text with a shake motion",          text: "RETRO", clipColor: "#f97316", animationIn: "zoom",      animationOut: "fade", motionPath: "shake",      x: 0.05, y: 0.35, w: 0.9, h: 0.2, style: { fontFamily: "'Anton', sans-serif", fontSize: 160, fontWeight: 900, color: "#ff6b35", align: "center", letterSpacing: 6, stroke: { enabled: true, color: "#000000", width: 4 } } },
  { key: "atl-cinematic",    label: "Cinematic Title",   emoji: "🎬",  description: "Wide-letter cinematic title that arcs in",      text: "DREAMSCAPE", clipColor: "#06b6d4", animationIn: "fade", animationOut: "fade", motionPath: "arc-lr", x: 0.05, y: 0.38, w: 0.9, h: 0.15, style: { fontFamily: "'Montserrat', sans-serif", fontSize: 110, fontWeight: 700, color: "#ffffff", align: "center", letterSpacing: 14 } },
  { key: "atl-luxury",       label: "Luxury Gold",       emoji: "✨",  description: "Elegant gold serif that rises softly",         text: "LUXURY", clipColor: "#f59e0b", animationIn: "fade",     animationOut: "fade", motionPath: "drift-r",    x: 0.1, y: 0.38, w: 0.8, h: 0.15, style: { fontFamily: "'Cormorant Garamond', serif", fontSize: 100, fontWeight: 300, color: "#c9a84c", align: "center", letterSpacing: 8 } },
  { key: "atl-gradient-arc", label: "Gradient Arc",      emoji: "🌊",  description: "Gradient headline following an arc path",      text: "GRADIENT", clipColor: "#8b5cf6", animationIn: "zoom", animationOut: "fade", motionPath: "arc-lr", x: 0.05, y: 0.36, w: 0.9, h: 0.15, style: { fontFamily: "'Montserrat', sans-serif", fontSize: 130, fontWeight: 900, color: "#ffffff", align: "center", gradient: { enabled: true, color1: "#f953c6", color2: "#b91d73", angle: 90 } } },
  { key: "atl-sports-bounce",label: "Sports Bounce",     emoji: "🏆",  description: "Impact sports text that bounces in",           text: "CHAMPION", clipColor: "#f43f5e", animationIn: "zoom", animationOut: "fade", motionPath: "bounce", x: 0.05, y: 0.35, w: 0.9, h: 0.18, style: { fontFamily: "'Black Ops One', cursive", fontSize: 160, fontWeight: 900, color: "#ffffff", align: "center", italic: true, stroke: { enabled: true, color: "#000000", width: 5 } } },
  { key: "atl-social-pop",   label: "Social Pop",        emoji: "📱",  description: "Social-media gradient that zooms and pulses",  text: "TRENDING", clipColor: "#ec4899", animationIn: "zoom",  animationOut: "fade", motionPath: "zoom-pulse", x: 0.05, y: 0.38, w: 0.9, h: 0.15, style: { fontFamily: "'Poppins', sans-serif", fontSize: 100, fontWeight: 800, color: "#ffffff", align: "center", gradient: { enabled: true, color1: "#f9d823", color2: "#ee0979", angle: 135 } } },
  { key: "atl-hipop-spiral", label: "Hip-Hop Spiral",    emoji: "🎤",  description: "Bold hip-hop text with spiral entrance",       text: "FIRE", clipColor: "#f97316", animationIn: "zoom",     animationOut: "fade", motionPath: "spiral",     x: 0.05, y: 0.35, w: 0.9, h: 0.2, style: { fontFamily: "Bungee, cursive", fontSize: 130, fontWeight: 900, color: "#ffffff", align: "center", stroke: { enabled: true, color: "#ff0000", width: 6 } } },
  { key: "atl-pendulum-count",label: "Pendulum Counter", emoji: "⏱️", description: "Monospace counter with pendulum sway",         text: "00:00", clipColor: "#10b981", animationIn: "fade",   animationOut: "fade", motionPath: "pendulum",   x: 0.1, y: 0.35, w: 0.8, h: 0.15, style: { fontFamily: "'Space Mono', monospace", fontSize: 120, fontWeight: 700, color: "#00ff88", align: "center", glow: { enabled: true, color: "#00ff88", blur: 14, intensity: 2 } } },
  { key: "atl-vintage-drift", label: "Vintage Drift",    emoji: "🎞️", description: "Sepia vintage text drifting across",           text: "REMEMBER", clipColor: "#a16207", animationIn: "fade",  animationOut: "fade", motionPath: "drift-r",    x: 0.05, y: 0.38, w: 0.9, h: 0.15, style: { fontFamily: "'Playfair Display', serif", fontSize: 80, fontWeight: 700, color: "#c8b06e", align: "center", italic: true, letterSpacing: 4 } },
  { key: "atl-hand-float",   label: "Handwrite Float",   emoji: "✍️",  description: "Handwritten script that floats and fades",     text: "written with love", clipColor: "#db2777", animationIn: "fade", animationOut: "fade", motionPath: "float", x: 0.05, y: 0.40, w: 0.9, h: 0.12, style: { fontFamily: "'Dancing Script', cursive", fontSize: 72, fontWeight: 700, color: "#f9d29d", align: "center" } },
  { key: "atl-tech-slide",   label: "Tech Slide",        emoji: "💻",  description: "Glowing tech text that slides from right",     text: "> LOADING...", clipColor: "#06b6d4", animationIn: "slideLeft", animationOut: "fade", motionPath: "slide-in-r", x: 0.05, y: 0.40, w: 0.9, h: 0.12, style: { fontFamily: "Audiowide, cursive", fontSize: 72, fontWeight: 400, color: "#00ff88", align: "left", glow: { enabled: true, color: "#00ff88", blur: 12, intensity: 2 } } },
  { key: "atl-minimalist",   label: "Minimalist Float",  emoji: "◻️",  description: "Ultra-thin minimalist text floating gently",   text: "less is more", clipColor: "#64748b", animationIn: "fade", animationOut: "fade", motionPath: "float", x: 0.1, y: 0.40, w: 0.8, h: 0.1, style: { fontFamily: "'DM Sans', sans-serif", fontSize: 52, fontWeight: 300, color: "#ffffff", align: "center", letterSpacing: 10 } },
  { key: "atl-caption-rise", label: "Caption Rise",      emoji: "📖",  description: "Clean subtitle that rises to bottom third",    text: "Caption goes here", clipColor: "#3b82f6", animationIn: "slideUp", animationOut: "fade", motionPath: "rise", x: 0.05, y: 0.78, w: 0.9, h: 0.08, style: { fontFamily: "'Open Sans', sans-serif", fontSize: 32, fontWeight: 400, color: "#ffffff", align: "center", textShadow: { enabled: true, color: "#000000aa", offsetX: 1, offsetY: 1, blur: 4 } } },
  { key: "atl-circle-neon",  label: "Neon Circle",       emoji: "🔵",  description: "Neon text that traces a circular path",        text: "LOOP", clipColor: "#a855f7", animationIn: "fade", animationOut: "fade", motionPath: "circle", x: 0.3, y: 0.38, w: 0.4, h: 0.12, style: { fontFamily: "'Poppins', sans-serif", fontSize: 80, fontWeight: 800, color: "#a855f7", align: "center", glow: { enabled: true, color: "#a855f7", blur: 16, intensity: 3 } } },
  { key: "atl-figure8-title",label: "Figure-8 Title",    emoji: "∞",   description: "Bold title that traces a figure-8 path",      text: "INFINITE", clipColor: "#f59e0b", animationIn: "fade", animationOut: "fade", motionPath: "figure8", x: 0.2, y: 0.35, w: 0.6, h: 0.15, style: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 120, fontWeight: 900, color: "#fde047", align: "center", letterSpacing: 6 } },
  { key: "atl-watermark",    label: "Animated Watermark",emoji: "🔏",  description: "Subtle drifting watermark overlay",            text: "© yourbrand", clipColor: "#64748b", animationIn: "fade", animationOut: "fade", motionPath: "drift-r", x: 0.6, y: 0.88, w: 0.38, h: 0.07, style: { fontFamily: "Inter, system-ui, sans-serif", fontSize: 22, fontWeight: 400, color: "rgba(255,255,255,0.4)", align: "right", letterSpacing: 2 } },
];

interface MediaPanelProps {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

function detectMediaType(file: File): "video" | "audio" | "image" | "blank" {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("image/")) return "image";
  return "blank";
}

async function probeDuration(src: string, type: "video" | "audio"): Promise<number | undefined> {
  return new Promise((resolve) => {
    const el = document.createElement(type === "video" ? "video" : "audio") as HTMLMediaElement;
    el.preload = "metadata";
    el.src = src;
    el.onloadedmetadata = () => resolve(isFinite(el.duration) ? el.duration : undefined);
    el.onerror = () => resolve(undefined);
    setTimeout(() => resolve(undefined), 5000);
  });
}

export default function MediaPanel({ state, dispatch }: MediaPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"media" | "gallery" | "effects" | "assets" | "templates">("media");
  const [gallerySubTab, setGallerySubTab] = useState<"stock" | "saved" | "text">("stock");
  // Asset library tab state
  const [assetProvider, setAssetProvider] = useState<"giphy" | "pexels" | "iconify" | "lottie">("giphy");
  const [assetQuery, setAssetQuery] = useState("");
  const [assetResults, setAssetResults] = useState<Array<{ id: string; thumb: string; src: string; title: string; kind: "image" | "lottie" }>>([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);

  const searchAssets = async (q?: string) => {
    const query = (q ?? assetQuery).trim();
    if (!query) return;
    setAssetLoading(true);
    setAssetError(null);
    try {
      const res = await fetch(`/api/assets/search?provider=${assetProvider}&q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Search failed (${res.status})`);
      }
      const data = await res.json();
      setAssetResults(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      setAssetError(e?.message || "Search failed");
      setAssetResults([]);
    } finally {
      setAssetLoading(false);
    }
  };
  const [tplSearch, setTplSearch] = useState("");
  const [tplLimit, setTplLimit] = useState(60);
  const [tplAspect, setTplAspect] = useState<"all" | "9:16" | "1:1" | "16:9" | "4:5" | "21:9">("all");
  // Aspect classifier — must match the BULK_ASPECTS labels in templates.ts
  // so the chip filter behaves identically across hand-authored and
  // procedurally-generated templates.
  const aspectLabelOf = (w: number, h: number): "9:16" | "1:1" | "16:9" | "4:5" | "21:9" | "other" => {
    const r = w / h;
    if (Math.abs(r - 9 / 16) < 0.04) return "9:16";
    if (Math.abs(r - 1) < 0.04) return "1:1";
    if (Math.abs(r - 16 / 9) < 0.04) return "16:9";
    if (Math.abs(r - 4 / 5) < 0.04) return "4:5";
    if (Math.abs(r - 21 / 9) < 0.06) return "21:9";
    return "other";
  };
  const filteredTemplates = useMemo(() => {
    const q = tplSearch.trim().toLowerCase();
    return TEMPLATES.filter((tpl) => {
      if (tplAspect !== "all") {
        if (aspectLabelOf(tpl.canvasWidth, tpl.canvasHeight) !== tplAspect) return false;
      }
      if (!q) return true;
      return (
        tpl.name.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.key.toLowerCase().includes(q)
      );
    });
  }, [tplSearch, tplAspect]);
  const visibleTemplates = filteredTemplates.slice(0, tplLimit);
  const [textInput, setTextInput] = useState("Your title here");
  const [textPresetCategory, setTextPresetCategory] = useState<TextPresetCategory | "All">("All");
  const filteredTextPresets: TextPreset[] = textPresetCategory === "All"
    ? ALL_TEXT_PRESETS
    : ALL_TEXT_PRESETS.filter((p) => p.category === textPresetCategory);
  // `presets` is a localStorage-backed list of user-saved clip styling.
  // We re-read it whenever the Saved tab gains focus so changes from the
  // PropertiesInspector show up immediately.
  const [presets, setPresets] = useState<CustomPreset[]>(() => loadPresets());
  const refreshPresets = () => setPresets(loadPresets());

  const addAssetToTimeline = (asset: MediaAsset) => {
    const colorIdx = state.clips.length % CLIP_COLORS.length;
    const clip = makeClip({
      label: asset.name,
      mediaType: asset.mediaType,
      src: asset.src,
      thumbnail: asset.thumbnail,
      trackIndex: Math.min(state.clips.length, state.tracks.length - 1),
      startTime: state.currentTime,
      duration: asset.duration ?? (asset.mediaType === "image" ? 5 : 10),
      x: 0, y: 0, width: 1, height: 1,
      animationIn: "fade",
      animationOut: "fade",
      color: CLIP_COLORS[colorIdx],
    });
    dispatch({ type: "ADD_CLIP", payload: clip });
    dispatch({ type: "SELECT_CLIP", payload: clip.id });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      const mediaType = detectMediaType(file);
      const src = URL.createObjectURL(file);
      let duration: number | undefined;
      if (mediaType === "video" || mediaType === "audio") {
        duration = await probeDuration(src, mediaType);
      }
      const asset: MediaAsset = {
        id: `asset-${Date.now()}-${Math.random()}`,
        name: file.name.replace(/\.[^.]+$/, ""),
        src,
        mediaType: mediaType,
        duration,
      };
      dispatch({ type: "ADD_ASSET", payload: asset });
      addAssetToTimeline(asset);
    }
    e.target.value = "";
  };

  const addText = () => {
    const colorIdx = state.clips.length % CLIP_COLORS.length;
    dispatch({
      type: "ADD_CLIP",
      payload: makeClip({
        label: textInput.slice(0, 20),
        mediaType: "text",
        text: textInput,
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 72 },
        trackIndex: Math.min(state.clips.length, state.tracks.length - 1),
        startTime: state.currentTime,
        duration: 4,
        x: 0.05, y: 0.4, width: 0.9, height: 0.2,
        animationIn: "fade",
        animationOut: "fade",
        color: CLIP_COLORS[colorIdx],
      }),
    });
  };

  const addBlank = (kind: "video" | "audio" | "image") => {
    const presets = {
      video: { label: "Video Block", duration: 8, color: "#1f1f24", w: 1, h: 1, x: 0, y: 0 },
      audio: { label: "Audio Track", duration: 30, color: "#10b981", w: 1, h: 0.05, x: 0, y: 0.95 },
      image: { label: "Image", duration: 5, color: "#f59e0b", w: 0.5, h: 0.5, x: 0.25, y: 0.25 },
    };
    const p = presets[kind];
    dispatch({
      type: "ADD_CLIP",
      payload: makeClip({
        label: p.label,
        mediaType: kind === "audio" ? "audio" : "blank",
        trackIndex: Math.min(state.clips.length, state.tracks.length - 1),
        startTime: state.currentTime,
        duration: p.duration,
        x: p.x, y: p.y, width: p.w, height: p.h,
        animationIn: "fade",
        animationOut: "fade",
        color: p.color,
      }),
    });
  };

  const TEXT_PRESETS: Array<{ label: string; text: string; style: Partial<TextStyle> }> = [
    {
      label: "Title",
      text: "BIG TITLE",
      style: { fontFamily: "Inter", fontSize: 120, fontWeight: 900, color: "#ffffff" },
    },
    {
      label: "Subtitle",
      text: "Subtitle text",
      style: { fontFamily: "Inter", fontSize: 56, fontWeight: 500, color: "#e2e8f0" },
    },
    {
      label: "Caption",
      text: "Caption goes here",
      style: {
        fontFamily: "Inter",
        fontSize: 36,
        fontWeight: 600,
        color: "#ffffff",
        bg: { color: "#000000aa", gradient: { enabled: false, color1: "#000", color2: "#000", angle: 0 }, borderColor: "#fff", borderWidth: 0, borderRadius: 8, padding: 10 },
      },
    },
    {
      label: "Lower 3rd",
      text: "John Doe / Founder",
      style: {
        fontFamily: "Inter",
        fontSize: 42,
        fontWeight: 700,
        color: "#ffffff",
        bg: { color: "#0f172aee", gradient: { enabled: false, color1: "#000", color2: "#000", angle: 0 }, borderColor: "#fff", borderWidth: 0, borderRadius: 4, padding: 12 },
      },
    },
    {
      label: "Sunset Gradient",
      text: "SUNSET",
      style: {
        fontFamily: "Bebas Neue",
        fontSize: 140,
        fontWeight: 900,
        color: "#ff7a59",
        letterSpacing: 4,
        gradient: { enabled: true, color1: "#fde68a", color2: "#ec4899", angle: 90 },
      },
    },
    {
      label: "Neon Glow",
      text: "NEON",
      style: {
        fontFamily: "Bebas Neue",
        fontSize: 130,
        fontWeight: 900,
        color: "#22d3ee",
        letterSpacing: 6,
        glow: { enabled: true, color: "#22d3ee", blur: 12, intensity: 4 },
      },
    },
    {
      label: "Outlined",
      text: "OUTLINE",
      style: {
        fontFamily: "Anton",
        fontSize: 130,
        fontWeight: 900,
        color: "transparent",
        letterSpacing: 2,
        stroke: { enabled: true, color: "#ffffff", width: 3 },
      },
    },
    {
      label: "Retro",
      text: "RETRO",
      style: {
        fontFamily: "Bungee",
        fontSize: 120,
        fontWeight: 900,
        color: "#fde68a",
        letterSpacing: 4,
        textShadow: { enabled: true, color: "#7c3aed", offsetX: 6, offsetY: 6, blur: 0 },
      },
    },
    {
      label: "Chrome",
      text: "CHROME",
      style: {
        fontFamily: "Oswald",
        fontSize: 130,
        fontWeight: 900,
        color: "#cbd5e1",
        letterSpacing: 3,
        gradient: { enabled: true, color1: "#f8fafc", color2: "#475569", angle: 180 },
        stroke: { enabled: true, color: "#0f172a", width: 1.5 },
        textShadow: { enabled: true, color: "#000000aa", offsetX: 0, offsetY: 4, blur: 6 },
      },
    },
    {
      label: "Curved Smile",
      text: "ARCHED TEXT",
      style: {
        fontFamily: "Pacifico",
        fontSize: 90,
        fontWeight: 700,
        color: "#fde68a",
        curve: 60,
      },
    },
    {
      label: "Handwritten",
      text: "Handwritten Note",
      style: {
        fontFamily: "Caveat",
        fontSize: 80,
        fontWeight: 600,
        color: "#fff7ed",
        letterSpacing: 1,
        textShadow: { enabled: true, color: "#000000aa", offsetX: 0, offsetY: 2, blur: 6 },
      },
    },
    {
      label: "Badge",
      text: "BADGE",
      style: {
        fontFamily: "Inter",
        fontSize: 56,
        fontWeight: 800,
        color: "#0f172a",
        letterSpacing: 2,
        bg: {
          color: "#fde68a",
          gradient: { enabled: true, color1: "#fde68a", color2: "#f59e0b", angle: 135 },
          borderColor: "#0f172a",
          borderWidth: 3,
          borderRadius: 999,
          padding: 18,
        },
      },
    },
  ];

  return (
    <div data-testid="media-panel" className="w-60 flex flex-col border-r border-border bg-card shrink-0 overflow-hidden">
      <div className="flex border-b border-border">
        {[
          { key: "media" as const, label: "Media" },
          { key: "gallery" as const, label: "Gallery" },
          { key: "effects" as const, label: "Effects" },
          { key: "assets" as const, label: "Assets" },
          { key: "templates" as const, label: "Templates" },
        ].map((t) => (
          <button
            key={t.key}
            className={cn(
              "flex-1 text-xs font-medium py-2 transition-colors",
              activeTab === t.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "media" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="p-2 space-y-1.5">
            <Button
              size="sm"
              variant="default"
              className="w-full text-xs gap-1 h-8"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-add-media"
            >
              <Plus className="w-3 h-3" /> Import Media
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*,image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <Separator />

          <div className="px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-1">Library</p>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
            {state.assets.length === 0 && state.clips.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No media imported yet</p>
            )}
            {state.assets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer hover:bg-muted/40 group border border-transparent hover:border-border"
                onClick={() => addAssetToTimeline(asset)}
                title="Click to add to timeline"
              >
                <div className="w-8 h-8 rounded bg-black/40 shrink-0 flex items-center justify-center overflow-hidden">
                  {asset.mediaType === "video" && <Film className="w-4 h-4 text-blue-400" />}
                  {asset.mediaType === "audio" && <Music className="w-4 h-4 text-emerald-400" />}
                  {asset.mediaType === "image" && asset.src ? (
                    <img src={asset.src} alt="" className="w-full h-full object-cover" />
                  ) : asset.mediaType === "image" ? (
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-foreground">{asset.name}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">
                    {asset.mediaType}{asset.duration ? ` · ${asset.duration.toFixed(1)}s` : ""}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 opacity-0 group-hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); dispatch({ type: "REMOVE_ASSET", payload: asset.id }); }}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          <div className="p-2 space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-1 py-1">Quick Add</p>
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-2" onClick={() => addBlank("video")}>
              <Film className="w-3 h-3 text-blue-400" /> Blank Video
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-2" onClick={() => addBlank("audio")}>
              <Music className="w-3 h-3 text-emerald-400" /> Audio Track
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-2" onClick={() => addBlank("image")}>
              <ImageIcon className="w-3 h-3 text-amber-400" /> Image Layer
            </Button>
          </div>
        </div>
      )}

      {activeTab === "gallery" && (
        <div className="flex border-b border-border">
          {[
            { key: "stock" as const, label: "Stock" },
            { key: "saved" as const, label: "Saved" },
            { key: "text" as const, label: "Text" },
          ].map((t) => (
            <button
              key={t.key}
              className={cn(
                "flex-1 text-[11px] font-medium py-1.5 transition-colors",
                gallerySubTab === t.key
                  ? "text-primary border-b-2 border-primary bg-muted/20"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setGallerySubTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === "gallery" && gallerySubTab === "text" && (
        <div className="flex flex-col flex-1 overflow-y-auto p-2 space-y-2">
          <div className="space-y-1.5">
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your text..."
              className="h-8 text-xs"
            />
            <Button size="sm" variant="default" className="w-full h-8 text-xs gap-1" onClick={addText}>
              <Type className="w-3 h-3" /> Add Text
            </Button>
          </div>

          <Separator />

          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Presets</p>
          <div className="flex flex-wrap gap-1">
            {(["All", ...TEXT_PRESET_CATEGORIES] as const).map((c) => (
              <button
                key={c}
                onClick={() => setTextPresetCategory(c as TextPresetCategory | "All")}
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                  textPresetCategory === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {filteredTextPresets.map((p) => {
              const merged = { ...DEFAULT_TEXT_STYLE, ...p.style } as TextStyle;
              const previewSize = Math.min((merged.fontSize || 40) / 4, 22);
              const containerStyle = textContainerStyle(merged);
              const elStyle = textElementStyle(merged, `${previewSize}px`);
              return (
                <button
                  key={p.label}
                  className="w-full p-2 rounded border border-border hover:border-primary/50 bg-black/30 hover:bg-black/40 transition-colors text-left overflow-hidden"
                  onClick={() => {
                    dispatch({
                      type: "ADD_CLIP",
                      payload: makeClip({
                        label: p.label,
                        mediaType: "text",
                        text: p.text,
                        textStyle: merged,
                        trackIndex: Math.min(state.clips.length, state.tracks.length - 1),
                        startTime: state.currentTime,
                        duration: 4,
                        x: 0.05, y: 0.4, width: 0.9, height: 0.2,
                        animationIn: "fade",
                        animationOut: "fade",
                        color: "#8b5cf6",
                      }),
                    });
                  }}
                  data-testid={`text-preset-${p.label.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <div
                    className="flex items-center justify-center min-h-[40px] px-1"
                    style={containerStyle}
                  >
                    <span
                      className="truncate inline-block"
                      style={{
                        ...elStyle,
                        lineHeight: 1.1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.text}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{p.label}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "gallery" && gallerySubTab === "stock" && (
        <div className="flex flex-col flex-1 overflow-y-auto p-2 space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Color Blocks</p>
          <div className="grid grid-cols-4 gap-1.5">
            {CLIP_COLORS.map((color) => (
              <button
                key={color}
                className="aspect-square rounded border border-border hover:scale-105 transition-transform"
                style={{ background: color }}
                title="Add color block"
                onClick={() => {
                  dispatch({
                    type: "ADD_CLIP",
                    payload: makeClip({
                      label: "Color Block",
                      mediaType: "blank",
                      trackIndex: Math.min(state.clips.length, state.tracks.length - 1),
                      startTime: state.currentTime,
                      duration: 4,
                      x: 0.25, y: 0.25, width: 0.5, height: 0.5,
                      color,
                    }),
                  });
                }}
              />
            ))}
          </div>

          <Separator />

          {/*
            Shape Library — 50 ready-made vector shapes from
            ./lib/shape-library. Click adds a `mediaType: "shape"` clip
            with the chosen `shapeKind`; the inspector lets users tweak
            fill/stroke/gradient afterwards.
          */}
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Shapes ({SHAPE_LIBRARY.length})</p>
          <div className="grid grid-cols-5 gap-1">
            {SHAPE_LIBRARY.map((s) => (
              <button
                key={s.key}
                onClick={() => {
                  const colorIdx = state.clips.length % CLIP_COLORS.length;
                  dispatch({
                    type: "ADD_CLIP",
                    payload: makeClip({
                      label: s.name,
                      mediaType: "shape",
                      shapeKind: s.key,
                      fill: { kind: "solid", color: CLIP_COLORS[colorIdx] },
                      strokeColor: "#ffffff",
                      strokeWidth: 0,
                      trackIndex: Math.min(state.clips.length, state.tracks.length - 1),
                      startTime: state.currentTime,
                      duration: 4,
                      x: 0.4, y: 0.4, width: 0.2, height: 0.2,
                      color: CLIP_COLORS[colorIdx],
                    }),
                  });
                }}
                title={s.name}
                className="aspect-square rounded border border-border hover:bg-muted/40 hover:border-primary/40 p-1 text-foreground"
                data-testid={`shape-${s.key}`}
              >
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="xMidYMid meet"
                  className="w-full h-full"
                  // ShapeDef stores a raw inner SVG fragment (paths, polygons,
                  // etc) — drop it into a fixed 100×100 viewBox.
                  dangerouslySetInnerHTML={{ __html: `<g fill="currentColor">${s.svg}</g>` }}
                />
              </button>
            ))}
          </div>

        </div>
      )}

      {activeTab === "effects" && (
        <div className="flex flex-col flex-1 overflow-y-auto p-2 space-y-2">
          {/*
            Special Layers — 50 cinematic overlays (light leaks, grain,
            vignette, color grades, geometry overlays, atmosphere). Each
            adds a `mediaType: "specialLayer"` clip configured with the
            preset's intensity & tint color.
          */}
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Special Layers ({SPECIAL_LAYERS.length})</p>
          {/*
            Special Layers grid — name labels removed; the inspector panel
            covers all configuration once a layer is added. Hover for the
            tooltip to see the preset name + category.
          */}
          <div className="grid grid-cols-6 gap-1">
            {SPECIAL_LAYERS.map((s) => (
              <button
                key={s.key}
                onClick={() => {
                  dispatch({
                    type: "ADD_CLIP",
                    payload: makeClip({
                      label: s.name,
                      mediaType: "specialLayer",
                      specialKind: s.key,
                      specialIntensity: s.intensity,
                      specialColor: s.color,
                      blendMode: s.blend,
                      trackIndex: 0, // overlay track
                      startTime: state.currentTime,
                      duration: 5,
                      x: 0, y: 0, width: 1, height: 1,
                      color: s.color,
                    }),
                  });
                }}
                title={`${s.name} · ${s.category}`}
                className="aspect-square rounded border border-border hover:border-primary/60 hover:scale-105 transition-transform"
                style={{
                  background: `linear-gradient(135deg, ${s.color}, ${s.color}55)`,
                }}
                data-testid={`special-${s.key}`}
                aria-label={s.name}
              />
            ))}
          </div>

          <Separator />

          {/*
            Particles — animated overlays (snow, confetti, sparkles, rain,
            etc.) rendered in real time via the shared `drawParticles()`
            helper. Each picker entry adds a `mediaType: "particles"`
            clip seeded with the kind's defaults; the inspector exposes
            count / size / speed / color / direction sliders for tuning.
          */}
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Particles ({PARTICLE_LIBRARY.length})</p>
          <div className="grid grid-cols-5 gap-1">
            {PARTICLE_LIBRARY.map((p) => (
              <button
                key={p.key}
                onClick={() => {
                  dispatch({
                    type: "ADD_CLIP",
                    payload: makeClip({
                      label: p.label,
                      mediaType: "particles",
                      particleKind: p.key,
                      trackIndex: 0, // overlay track
                      startTime: state.currentTime,
                      duration: 5,
                      x: 0, y: 0, width: 1, height: 1,
                      color: p.defaults.color,
                    }),
                  });
                }}
                title={`${p.label} — ${p.description}`}
                className="aspect-square rounded border border-border hover:border-primary/60 hover:scale-105 transition-transform flex items-center justify-center text-2xl bg-background"
                data-testid={`particle-${p.key}`}
                aria-label={p.label}
              >
                <span aria-hidden="true">{p.emoji}</span>
              </button>
            ))}
          </div>

          <Separator />

          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Adjustment Layers</p>
          <p className="text-[10px] text-muted-foreground leading-snug">
            These sit on the timeline like normal clips and affect the visual composite within their rectangle. Animate position, size and rotation with keyframes.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs gap-2 justify-start"
            data-testid="add-mask-layer"
            onClick={() => {
              dispatch({
                type: "ADD_CLIP",
                payload: makeClip({
                  label: "Mask Layer",
                  mediaType: "maskLayer",
                  trackIndex: Math.min(state.clips.length, state.tracks.length - 1),
                  startTime: state.currentTime,
                  duration: 5,
                  x: 0.2, y: 0.2, width: 0.6, height: 0.6,
                  color: "#a855f7",
                }),
              });
            }}
          >
            <Shapes className="w-3 h-3" /> Mask Layer
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs gap-2 justify-start"
            data-testid="add-logo-blur"
            onClick={() => {
              dispatch({
                type: "ADD_CLIP",
                payload: makeClip({
                  label: "Logo Blur",
                  mediaType: "logoBlur",
                  trackIndex: Math.min(state.clips.length, state.tracks.length - 1),
                  startTime: state.currentTime,
                  duration: 5,
                  x: 0.7, y: 0.05, width: 0.25, height: 0.1,
                  color: "#f97316",
                  blurAmount: 16,
                }),
              });
            }}
          >
            <Droplets className="w-3 h-3" /> Logo Blur
          </Button>
          {/*
            Effects Layer — a full-frame color/grade adjustment built on
            top of the existing `specialLayer` infrastructure. We seed it
            with the "tealOrange" colorWash preset so users get a visible
            cinematic grade immediately; the inspector lets them swap the
            preset, intensity and tint colors afterwards.
          */}
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs gap-2 justify-start"
            data-testid="add-effects-layer"
            onClick={() => {
              const preset = SPECIAL_LAYERS.find((s) => s.key === "tealOrange") ?? SPECIAL_LAYERS[0];
              dispatch({
                type: "ADD_CLIP",
                payload: makeClip({
                  label: "Effects Layer",
                  mediaType: "specialLayer",
                  specialKind: preset.key,
                  specialIntensity: preset.intensity,
                  specialColor: preset.color,
                  blendMode: preset.blend,
                  trackIndex: 0,
                  startTime: state.currentTime,
                  duration: 5,
                  x: 0, y: 0, width: 1, height: 1,
                  color: preset.color,
                }),
              });
            }}
          >
            <Sparkles className="w-3 h-3" /> Effects Layer
          </Button>

          <Separator />

          {/* ── Animated Text Layers ─────────────────────────────────── */}
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Animated Text Layers ({ANIMATED_TEXT_LAYERS.length})</p>
          <p className="text-[10px] text-muted-foreground leading-snug">
            One click adds a styled text clip with motion keyframes already applied. Edit the text content in the inspector.
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {ANIMATED_TEXT_LAYERS.map((atl) => (
              <button
                key={atl.key}
                title={atl.description}
                className="relative rounded border border-border hover:border-primary/60 bg-black/40 hover:bg-black/60 transition-colors overflow-hidden text-left p-2"
                style={{ borderLeft: `3px solid ${atl.clipColor}` }}
                onClick={() => {
                  const t0 = state.currentTime;
                  const dur = 5;
                  const clipId = crypto.randomUUID();
                  dispatch({
                    type: "ADD_CLIP",
                    payload: makeClip({
                      id: clipId,
                      label: atl.label,
                      mediaType: "text",
                      text: atl.text,
                      textStyle: { ...DEFAULT_TEXT_STYLE, ...atl.style } as TextStyle,
                      animationIn: atl.animationIn,
                      animationOut: atl.animationOut,
                      trackIndex: 0,
                      startTime: t0,
                      duration: dur,
                      x: atl.x, y: atl.y, width: atl.w, height: atl.h,
                      color: atl.clipColor,
                    }),
                  });
                  if (atl.motionPath !== "none") {
                    const snapshot = { id: clipId, startTime: t0, duration: dur, x: atl.x, y: atl.y, scale: 1, rotation: 0 };
                    buildMotionKeyframes(atl.motionPath, snapshot).forEach(({ property, time, value, easing }) => {
                      dispatch({ type: "ADD_KEYFRAME", payload: { clipId, property, time, value, easing } });
                    });
                  }
                }}
                data-testid={`atl-${atl.key}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-base leading-none">{atl.emoji}</span>
                  <span className="text-[10px] font-medium text-foreground leading-tight">{atl.label}</span>
                </div>
                <p className="text-[9px] text-muted-foreground leading-snug line-clamp-2">{atl.description}</p>
              </button>
            ))}
          </div>

          <Separator />

          <div className="text-[10px] text-muted-foreground p-2 leading-relaxed">
            <p className="font-medium mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Pro Tip</p>
            <p>Use the AI bar at the top to generate effects, animations, transitions, and more with natural language.</p>
          </div>
        </div>
      )}

      {activeTab === "assets" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="p-2 space-y-2 border-b border-border">
            <div className="grid grid-cols-4 gap-1">
              {(["giphy", "pexels", "iconify", "lottie"] as const).map((p) => (
                <button
                  key={p}
                  className={cn(
                    "text-[10px] py-1 rounded border capitalize",
                    assetProvider === p
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted/40",
                  )}
                  onClick={() => {
                    setAssetProvider(p);
                    setAssetResults([]);
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                searchAssets();
              }}
              className="flex gap-1"
            >
              <input
                value={assetQuery}
                onChange={(e) => setAssetQuery(e.target.value)}
                placeholder={`Search ${assetProvider}…`}
                className="flex-1 h-7 text-xs px-2 rounded border border-border bg-background"
              />
              <button
                type="submit"
                disabled={assetLoading || !assetQuery.trim()}
                className="h-7 px-2 text-xs rounded bg-primary text-primary-foreground disabled:opacity-50"
              >
                {assetLoading ? "…" : "Go"}
              </button>
            </form>
            <p className="text-[10px] text-muted-foreground leading-snug">
              Click any result to add it to the timeline as an image clip.
              {assetProvider === "giphy" && " Requires GIPHY_API_KEY on the server."}
              {assetProvider === "pexels" && " Requires PEXELS_API_KEY on the server."}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {assetError && (
              <div className="text-[10px] text-destructive bg-destructive/10 border border-destructive/30 rounded p-2 mb-2">
                {assetError}
              </div>
            )}
            {assetResults.length === 0 && !assetLoading && !assetError && (
              <div className="text-[10px] text-muted-foreground text-center py-8">
                Search to see results.
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {assetResults.map((r) => (
                <button
                  key={r.id}
                  className="aspect-square rounded border border-border bg-muted/30 overflow-hidden hover:border-primary transition-colors group relative"
                  title={r.title}
                  onClick={() => {
                    const colorIdx = state.clips.length % CLIP_COLORS.length;
                    const clip = makeClip({
                      label: r.title || "Asset",
                      mediaType: "image",
                      src: r.src,
                      color: CLIP_COLORS[colorIdx],
                      duration: 5,
                      start: state.currentTime,
                      trackId: state.tracks[0]?.id,
                      assetKind: r.kind === "lottie" ? "lottie" : (assetProvider === "iconify" ? "icon" : undefined),
                    } as any);
                    dispatch({ type: "ADD_CLIP", payload: clip });
                  }}
                >
                  <img
                    src={r.thumb}
                    alt={r.title}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "templates" && (
          <div className="flex flex-col flex-1 overflow-y-auto p-2 space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Project Templates · {TEMPLATES.length.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Start from a ready-made layout. This <strong>replaces your current timeline</strong> — your imported media stays in the library so you can drop it into the empty slots.
            </p>
            <Input
              value={tplSearch}
              onChange={(e) => {
                setTplSearch(e.target.value);
                setTplLimit(60);
              }}
              placeholder="Search templates (sale, podcast, vertical, …)"
              className="h-7 text-xs"
              data-testid="template-search"
            />
            <div className="flex flex-wrap gap-1">
              {(["all", "9:16", "1:1", "16:9", "4:5", "21:9"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => {
                    setTplAspect(a);
                    setTplLimit(60);
                  }}
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded border transition-colors",
                    tplAspect === a
                      ? "bg-primary/20 border-primary/50 text-foreground"
                      : "bg-muted/20 border-border hover:bg-muted/40",
                  )}
                  data-testid={`template-aspect-${a}`}
                >
                  {a === "all" ? "All" : a}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {filteredTemplates.length.toLocaleString()} match{filteredTemplates.length === 1 ? "" : "es"}
              {filteredTemplates.length > visibleTemplates.length ? ` · showing ${visibleTemplates.length}` : ""}
            </p>
            <div className="space-y-1.5">
              {visibleTemplates.map((tpl) => {
                const a = aspectLabelOf(tpl.canvasWidth, tpl.canvasHeight);
                const aspectLabel = a === "other" ? `${tpl.canvasWidth}×${tpl.canvasHeight}` : a;
                return (
                  <button
                    key={tpl.key}
                    className="w-full flex items-start gap-2 p-2 rounded-md border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/40 text-left transition-colors group"
                    onClick={() => {
                      if (state.clips.length > 0) {
                        const ok = window.confirm(`Apply "${tpl.name}" template? This will replace your current timeline (your media library is kept).`);
                        if (!ok) return;
                      }
                      dispatch({ type: "APPLY_TEMPLATE", payload: { templateKey: tpl.key } });
                    }}
                    data-testid={`template-${tpl.key}`}
                    title={tpl.description}
                  >
                    <div
                      className="shrink-0 w-12 rounded bg-gradient-to-br from-primary/30 to-primary/10 border border-white/10 flex items-center justify-center text-lg"
                      style={{
                        aspectRatio: `${tpl.canvasWidth}/${tpl.canvasHeight}`,
                        maxHeight: 56,
                      }}
                    >
                      <span aria-hidden>{tpl.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Layout className="w-3 h-3 text-primary shrink-0" />
                        <span className="text-xs font-medium text-foreground truncate">{tpl.name}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{tpl.description}</p>
                      <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                        <span className="px-1 py-px rounded bg-white/5">{aspectLabel}</span>
                        <span>·</span>
                        <span>{tpl.duration}s</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {filteredTemplates.length > visibleTemplates.length ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => setTplLimit((n) => n + 60)}
                data-testid="template-load-more"
              >
                Load more ({filteredTemplates.length - visibleTemplates.length} left)
              </Button>
            ) : null}
            {filteredTemplates.length === 0 ? (
              <p className="text-[10px] text-muted-foreground italic text-center py-6">
                No templates match — try a different search or aspect ratio.
              </p>
            ) : null}
          </div>
      )}

      {activeTab === "gallery" && gallerySubTab === "saved" && (
        <div className="flex flex-col flex-1 overflow-y-auto p-2 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">My Saved Presets</p>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] px-2"
              onClick={refreshPresets}
              title="Reload from local storage"
            >
              Refresh
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground leading-snug">
            Save styling from any selected clip in the inspector's "Saved Presets" section. Click a preset here to add a fresh clip pre-styled with that look.
          </p>
          {presets.length === 0 ? (
            <div className="text-[11px] text-muted-foreground text-center py-8">
              <Bookmark className="w-5 h-5 mx-auto mb-2 opacity-40" />
              No saved presets yet.
            </div>
          ) : (
            <div className="space-y-1">
              {presets.map((p) => (
                <div
                  key={p.id}
                  className="group flex items-center gap-2 p-1.5 rounded border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-colors"
                >
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => {
                      // Drop a fresh clip carrying the preset's saved fields
                      // onto the timeline at the playhead. We seed sensible
                      // defaults (duration, position) since presets only
                      // capture styling — never timing.
                      const colorIdx = state.clips.length % CLIP_COLORS.length;
                      dispatch({
                        type: "ADD_CLIP",
                        payload: makeClip({
                          ...p.data,
                          label: p.name,
                          trackIndex: Math.min(state.clips.length, state.tracks.length - 1),
                          startTime: state.currentTime,
                          duration: 4,
                          color: p.data.color ?? CLIP_COLORS[colorIdx],
                        }),
                      });
                    }}
                    title="Add a new clip with this preset's styling"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Bookmark className="w-3 h-3 text-primary shrink-0" />
                      <span className="text-xs font-medium text-foreground truncate">{p.name}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground capitalize">
                      {p.data.mediaType ?? "clip"}
                      {p.data.shapeKind ? ` · ${p.data.shapeKind}` : ""}
                      {p.data.specialKind ? ` · ${p.data.specialKind}` : ""}
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-5 h-5 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePreset(p.id);
                      refreshPresets();
                    }}
                    title="Delete preset"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
