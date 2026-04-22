import { useRef, useState } from "react";
import { Plus, Trash2, Film, Music, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EditorState, EditorAction, Clip } from "../lib/types";
import { cn } from "@/lib/utils";

const CLIP_COLORS = [
  "#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#f43f5e", "#06b6d4", "#f97316"
];

interface MediaPanelProps {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

export default function MediaPanel({ state, dispatch }: MediaPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"media" | "properties">("media");

  const addClip = (file: File) => {
    const id = `clip-${Date.now()}`;
    const colorIdx = state.clips.length % CLIP_COLORS.length;
    const newClip: Clip = {
      id,
      label: file.name.replace(/\.[^.]+$/, ""),
      trackIndex: Math.min(state.clips.length, state.tracks.length - 1),
      startTime: 0,
      duration: 10,
      src: URL.createObjectURL(file),
      x: 0, y: 0, width: 1, height: 1,
      opacity: 1, rotation: 0, blendMode: "normal",
      cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1,
      animationIn: "fade", animationOut: "fade",
      animationInDuration: 0.5, animationOutDuration: 0.5,
      volume: 1,
      color: CLIP_COLORS[colorIdx],
    };
    dispatch({ type: "ADD_CLIP", payload: newClip });
    dispatch({ type: "SELECT_CLIP", payload: id });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(addClip);
    e.target.value = "";
  };

  const removeClip = (id: string) => {
    dispatch({ type: "DELETE_CLIP", payload: id });
  };

  return (
    <div
      data-testid="media-panel"
      className="w-56 flex flex-col border-r border-border bg-card shrink-0 overflow-hidden"
    >
      <div className="flex border-b border-border">
        <button
          className={cn(
            "flex-1 text-xs font-medium py-2 transition-colors",
            activeTab === "media"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab("media")}
        >
          Media
        </button>
        <button
          className={cn(
            "flex-1 text-xs font-medium py-2 transition-colors",
            activeTab === "properties"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab("properties")}
        >
          Assets
        </button>
      </div>

      {activeTab === "media" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="p-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs gap-1 h-8"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-add-media"
            >
              <Plus className="w-3 h-3" /> Add Media
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

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {state.clips.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">
                No media added yet
              </p>
            )}
            {state.clips.map((clip) => (
              <div
                key={clip.id}
                data-testid={`clip-media-${clip.id}`}
                className={cn(
                  "flex items-center gap-2 p-2 rounded text-xs cursor-pointer group transition-colors",
                  state.selectedClipId === clip.id
                    ? "bg-primary/20 border border-primary/40"
                    : "hover:bg-muted/50 border border-transparent"
                )}
                onClick={() => dispatch({ type: "SELECT_CLIP", payload: clip.id })}
              >
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: clip.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-foreground">{clip.label}</div>
                  <div className="text-muted-foreground">{clip.duration.toFixed(1)}s</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={(e) => { e.stopPropagation(); removeClip(clip.id); }}
                  data-testid={`button-remove-clip-${clip.id}`}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          <div className="p-2 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider px-1 py-1">Quick Add</p>
            {[
              { icon: Film, label: "Blank Video", duration: 10, color: "#3b82f6" },
              { icon: Music, label: "Audio Track", duration: 30, color: "#10b981" },
              { icon: Image, label: "Image Layer", duration: 5, color: "#f59e0b" },
            ].map(({ icon: Icon, label, duration, color }) => (
              <Button
                key={label}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs h-7 gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  const id = `clip-${Date.now()}`;
                  dispatch({
                    type: "ADD_CLIP",
                    payload: {
                      id,
                      label,
                      trackIndex: Math.min(state.clips.length, state.tracks.length - 1),
                      startTime: state.currentTime,
                      duration,
                      x: 0, y: 0, width: 1, height: 1,
                      opacity: 1, rotation: 0, blendMode: "normal",
                      cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1,
                      animationIn: "fade", animationOut: "fade",
                      animationInDuration: 0.5, animationOutDuration: 0.5,
                      volume: 1,
                      color,
                    },
                  });
                }}
              >
                <Icon className="w-3 h-3" /> {label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {activeTab === "properties" && (
        <div className="flex-1 overflow-y-auto p-3 text-xs text-muted-foreground">
          <div className="space-y-2">
            <div className="p-3 rounded border border-border bg-muted/20">
              <p className="font-medium text-foreground mb-1">Canvas</p>
              <div className="grid grid-cols-2 gap-1">
                <span>Width</span><span className="text-right tabular-nums">{state.canvasWidth}px</span>
                <span>Height</span><span className="text-right tabular-nums">{state.canvasHeight}px</span>
                <span>Duration</span><span className="text-right tabular-nums">{state.duration.toFixed(1)}s</span>
                <span>Clips</span><span className="text-right tabular-nums">{state.clips.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
