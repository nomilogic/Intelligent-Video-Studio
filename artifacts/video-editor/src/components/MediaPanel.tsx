import { useRef, useState } from "react";
import { Plus, Trash2, Film, Music, Image as ImageIcon, Type, Square, Sparkles, Layout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { EditorState, EditorAction, MediaAsset, DEFAULT_TEXT_STYLE } from "../lib/types";
import { makeClip } from "../lib/reducer";
import { TEMPLATES } from "../lib/templates";
import { cn } from "@/lib/utils";

const CLIP_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#f43f5e", "#06b6d4", "#f97316", "#ec4899"];

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
  const [activeTab, setActiveTab] = useState<"media" | "text" | "shapes" | "templates">("media");
  const [textInput, setTextInput] = useState("Your title here");

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
      video: { label: "Video Block", duration: 8, color: "#3b82f6", w: 1, h: 1, x: 0, y: 0 },
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

  const TEXT_PRESETS = [
    { label: "Title", text: "BIG TITLE", style: { fontSize: 120, fontWeight: 900, color: "#ffffff" } },
    { label: "Subtitle", text: "Subtitle text", style: { fontSize: 56, fontWeight: 500, color: "#e2e8f0" } },
    { label: "Caption", text: "Caption goes here", style: { fontSize: 36, fontWeight: 600, color: "#ffffff", background: "#000000aa" } },
    { label: "Lower 3rd", text: "John Doe / Founder", style: { fontSize: 42, fontWeight: 700, color: "#ffffff", background: "#0f172aee" } },
  ];

  return (
    <div data-testid="media-panel" className="w-60 flex flex-col border-r border-border bg-card shrink-0 overflow-hidden">
      <div className="flex border-b border-border">
        {[
          { key: "media" as const, label: "Media" },
          { key: "text" as const, label: "Text" },
          { key: "shapes" as const, label: "Stock" },
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

      {activeTab === "text" && (
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
          <div className="space-y-1.5">
            {TEXT_PRESETS.map((p) => (
              <button
                key={p.label}
                className="w-full p-2 rounded border border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
                onClick={() => {
                  dispatch({
                    type: "ADD_CLIP",
                    payload: makeClip({
                      label: p.label,
                      mediaType: "text",
                      text: p.text,
                      textStyle: { ...DEFAULT_TEXT_STYLE, ...p.style } as any,
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
              >
                <p
                  className="truncate"
                  style={{
                    fontSize: Math.min((p.style.fontSize || 40) / 4, 16),
                    fontWeight: p.style.fontWeight,
                    color: p.style.color,
                    background: (p.style as any).background,
                    padding: (p.style as any).background ? "2px 6px" : 0,
                    borderRadius: 4,
                    display: "inline-block",
                  }}
                >
                  {p.text}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">{p.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === "shapes" && (
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

          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Shapes</p>
          <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-2 justify-start" onClick={() => {
            dispatch({
              type: "ADD_CLIP",
              payload: makeClip({
                label: "Square",
                mediaType: "blank",
                trackIndex: Math.min(state.clips.length, state.tracks.length - 1),
                startTime: state.currentTime,
                duration: 4,
                x: 0.4, y: 0.4, width: 0.2, height: 0.2,
                color: "#ec4899",
              }),
            });
          }}>
            <Square className="w-3 h-3" /> Square
          </Button>
          <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-2 justify-start" onClick={() => {
            dispatch({
              type: "ADD_CLIP",
              payload: makeClip({
                label: "Circle",
                mediaType: "blank",
                trackIndex: Math.min(state.clips.length, state.tracks.length - 1),
                startTime: state.currentTime,
                duration: 4,
                x: 0.4, y: 0.4, width: 0.2, height: 0.2,
                borderRadius: 999,
                color: "#06b6d4",
              }),
            });
          }}>
            <div className="w-3 h-3 rounded-full bg-current" /> Circle
          </Button>

          <Separator />

          <div className="text-[10px] text-muted-foreground p-2 leading-relaxed">
            <p className="font-medium mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Pro Tip</p>
            <p>Use the AI bar at the top to generate effects, animations, transitions, and more with natural language.</p>
          </div>
        </div>
      )}

      {activeTab === "templates" && (
        <div className="flex flex-col flex-1 overflow-y-auto p-2 space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Project Templates</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Start from a ready-made layout. This <strong>replaces your current timeline</strong> — your imported media stays in the library so you can drop it into the empty slots.
          </p>
          <div className="space-y-1.5">
            {TEMPLATES.map((tpl) => {
              const aspect = tpl.canvasWidth / tpl.canvasHeight;
              const aspectLabel = aspect > 1.1 ? "16:9" : aspect < 0.9 ? "9:16" : "1:1";
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
        </div>
      )}
    </div>
  );
}
