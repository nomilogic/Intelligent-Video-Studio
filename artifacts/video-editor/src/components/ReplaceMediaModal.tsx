import { useRef, useState } from "react";
import { Film, Image as ImageIcon, Music, Upload, X, Sparkles, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Clip, EditorAction } from "@/lib/types";

interface ReplaceMediaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clip: Clip | null;
  dispatch: React.Dispatch<EditorAction>;
}

const KEEP_OPTIONS = [
  { key: "effects", label: "Visual Effects", icon: "✨" },
  { key: "animations", label: "Animations", icon: "🎬" },
  { key: "transitions", label: "Transitions", icon: "🔀" },
  { key: "mask", label: "Mask", icon: "🎭" },
  { key: "keyframes", label: "Keyframes", icon: "⬦" },
  { key: "transform", label: "Transform", icon: "⬛" },
  { key: "color", label: "Color/Blend", icon: "🎨" },
] as const;

type KeepKey = typeof KEEP_OPTIONS[number]["key"];

export function ReplaceMediaModal({ open, onOpenChange, clip, dispatch }: ReplaceMediaModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [keepSet, setKeepSet] = useState<Set<KeepKey>>(new Set(["effects", "animations", "transitions", "mask", "keyframes", "transform", "color"]));

  const reset = () => { setSelected(null); setPreview(null); setDragOver(false); };

  const handleFile = (file: File) => {
    setSelected(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const toggleKeep = (key: KeepKey) => {
    setKeepSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleReplace = () => {
    if (!clip || !selected || !preview) return;
    const isVideo = selected.type.startsWith("video/");
    const isAudio = selected.type.startsWith("audio/");
    const mediaType: Clip["mediaType"] = isVideo ? "video" : isAudio ? "audio" : "image";

    const updates: Partial<Clip> = { src: preview, mediaType, label: selected.name };
    if (!keepSet.has("effects")) updates.effects = [];
    if (!keepSet.has("animations")) { updates.animationIn = "none"; updates.animationOut = "none"; }
    if (!keepSet.has("mask")) updates.mask = undefined;
    if (!keepSet.has("transform")) { updates.x = clip.x; updates.y = clip.y; updates.width = clip.width; updates.height = clip.height; updates.rotation = 0; updates.scale = 1; }

    dispatch({ type: "UPDATE_CLIP", payload: { id: clip.id, updates } });
    onOpenChange(false);
    reset();
  };

  const mediaIcon = clip?.mediaType === "video" ? <Film className="w-4 h-4" /> : clip?.mediaType === "audio" ? <Music className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Replace Media
          </DialogTitle>
        </DialogHeader>

        {clip && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1.5">
            {mediaIcon}
            <span className="font-medium text-foreground truncate">{clip.label}</span>
            <span className="ml-auto text-[10px]">Replacing source only</span>
          </div>
        )}

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {preview ? (
            <div className="relative">
              {selected?.type.startsWith("video/") ? (
                <video src={preview} className="max-h-24 mx-auto rounded object-contain" muted />
              ) : selected?.type.startsWith("audio/") ? (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Music className="w-8 h-8 text-primary" />
                  <span className="text-sm font-medium">{selected.name}</span>
                </div>
              ) : (
                <img src={preview} className="max-h-24 mx-auto rounded object-contain" alt="" />
              )}
              <button
                className="absolute top-0 right-0 w-5 h-5 bg-background/80 rounded-full flex items-center justify-center hover:bg-background"
                onClick={(e) => { e.stopPropagation(); reset(); }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="py-4 space-y-1">
              <Upload className="w-6 h-6 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">Drop file or click to browse</p>
              <p className="text-[10px] text-muted-foreground/70">Video, image, or audio</p>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" className="hidden" accept="video/*,image/*,audio/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

        <Separator />

        {/* Keep options */}
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Keep from original</p>
          <div className="grid grid-cols-4 gap-1">
            {KEEP_OPTIONS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => toggleKeep(key)}
                className={`flex flex-col items-center gap-0.5 p-1.5 rounded border text-[9px] transition-colors ${
                  keepSet.has(key)
                    ? "bg-primary/20 border-primary/50 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/20"
                }`}
              >
                <span className="text-sm">{icon}</span>
                <span className="leading-tight text-center">{label}</span>
                {keepSet.has(key) && <Check className="w-2.5 h-2.5" />}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleReplace} disabled={!selected} className="w-full">
          Replace Media
        </Button>
      </DialogContent>
    </Dialog>
  );
}
