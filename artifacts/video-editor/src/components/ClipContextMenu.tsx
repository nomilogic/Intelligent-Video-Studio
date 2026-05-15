/**
 * ClipContextMenu — rich right-click menu for timeline clips.
 *
 * Features:
 * - Copy / Paste (full clip)
 * - Copy Properties — inline checkbox panel to pick which fields to copy
 * - Paste Properties — apply stored style onto selected clips
 * - Cut / Duplicate
 * - Split at Playhead
 * - Lock / Unlock / Mute / Hide toggles
 * - Color label (8 colors)
 * - Ripple Delete / Delete
 */

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  Copy,
  Scissors,
  Trash2,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  ChevronRight,
  Layers,
  Clipboard,
  ClipboardPaste,
  SplitSquareHorizontal,
  Check,
  RefreshCw,
} from "lucide-react";
import type { Clip, EditorState, EditorAction } from "@/lib/types";
import { Dispatch } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClipStyle {
  transform?: Partial<Pick<Clip, "x" | "y" | "width" | "height" | "rotation" | "scale" | "flipH" | "flipV" | "preserveRatio">>;
  effects?: Clip["effects"];
  animIn?: Pick<Clip, "animationIn" | "animationInDuration">;
  animOut?: Pick<Clip, "animationOut" | "animationOutDuration">;
  transition?: Pick<Clip, "transitionIn">;
  mask?: Pick<Clip, "mask">;
  color?: Partial<Pick<Clip, "blendMode" | "opacity" | "color" | "filters">>;
  textStyle?: Pick<Clip, "textStyle">;
  speed?: Pick<Clip, "speed" | "volume" | "muted">;
}

type StyleKey = keyof ClipStyle;

const STYLE_FIELDS: { key: StyleKey; label: string; icon: string }[] = [
  { key: "transform", label: "Transform (pos/size/rot)", icon: "⬛" },
  { key: "effects", label: "Visual Effects", icon: "✨" },
  { key: "animIn", label: "Animation In", icon: "▶️" },
  { key: "animOut", label: "Animation Out", icon: "⏹️" },
  { key: "transition", label: "Transition In", icon: "🔀" },
  { key: "mask", label: "Mask", icon: "🎭" },
  { key: "color", label: "Color / Blend / Filters", icon: "🎨" },
  { key: "textStyle", label: "Text Style", icon: "🔤" },
  { key: "speed", label: "Speed / Volume", icon: "⚡" },
];

const COLOR_LABELS = [
  { value: "none", hex: "transparent", label: "None" },
  { value: "red", hex: "#ef4444", label: "Red" },
  { value: "orange", hex: "#f97316", label: "Orange" },
  { value: "yellow", hex: "#eab308", label: "Yellow" },
  { value: "green", hex: "#22c55e", label: "Green" },
  { value: "blue", hex: "#3b82f6", label: "Blue" },
  { value: "purple", hex: "#a855f7", label: "Purple" },
  { value: "pink", hex: "#ec4899", label: "Pink" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractStyle(clip: Clip): ClipStyle {
  return {
    transform: { x: clip.x, y: clip.y, width: clip.width, height: clip.height, rotation: clip.rotation, scale: clip.scale, flipH: clip.flipH, flipV: clip.flipV, preserveRatio: clip.preserveRatio },
    effects: clip.effects ? [...clip.effects] : [],
    animIn: { animationIn: clip.animationIn, animationInDuration: clip.animationInDuration },
    animOut: { animationOut: clip.animationOut, animationOutDuration: clip.animationOutDuration },
    transition: { transitionIn: clip.transitionIn },
    mask: { mask: clip.mask },
    color: { blendMode: clip.blendMode, opacity: clip.opacity, color: clip.color, filters: clip.filters },
    textStyle: { textStyle: clip.textStyle },
    speed: { speed: clip.speed, volume: clip.volume, muted: clip.muted },
  };
}

function applyStyle(base: Clip, style: ClipStyle, keys: StyleKey[]): Partial<Clip> {
  const patch: Partial<Clip> = {};
  for (const key of keys) {
    const chunk = style[key];
    if (chunk) Object.assign(patch, chunk);
  }
  return patch;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MenuItem({
  icon,
  label,
  shortcut,
  danger,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`w-full flex items-center gap-2 px-3 py-[7px] text-[13px] text-left transition-colors
        ${disabled ? "opacity-40 pointer-events-none" : ""}
        ${danger ? "hover:bg-destructive/15 text-destructive" : "hover:bg-muted/70 text-foreground"}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="w-4 h-4 flex items-center justify-center text-muted-foreground shrink-0">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-[10px] text-muted-foreground/60">{shortcut}</span>}
    </button>
  );
}

function Sep() {
  return <div className="h-px bg-border mx-1 my-0.5" />;
}

// ── Main Component ────────────────────────────────────────────────────────────

interface ClipContextMenuProps {
  x: number;
  y: number;
  clipId: string;
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  clipboardClips: Clip[];
  setClipboardClips: (clips: Clip[]) => void;
  clipStyle: ClipStyle | null;
  setClipStyle: (style: ClipStyle | null) => void;
  onClose: () => void;
}

export default function ClipContextMenu({
  x,
  y,
  clipId,
  state,
  dispatch,
  clipboardClips,
  setClipboardClips,
  clipStyle,
  setClipStyle,
  onClose,
}: ClipContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showCopyProps, setShowCopyProps] = useState(false);
  const [showPasteProps, setShowPasteProps] = useState(false);
  const [showColorLabel, setShowColorLabel] = useState(false);
  const [copyChecked, setCopyChecked] = useState<Set<StyleKey>>(
    new Set(["transform", "effects", "animIn", "animOut", "transition", "color"])
  );
  const [pasteChecked, setPasteChecked] = useState<Set<StyleKey>>(
    new Set(["effects", "animIn", "animOut", "transition", "color"])
  );

  const ctxClip = state.clips.find((c) => c.id === clipId);
  const multiSelected = state.selectedClipIds.length > 1 && state.selectedClipIds.includes(clipId);
  const selectedIds = multiSelected ? state.selectedClipIds : [clipId];
  const label = multiSelected ? `${selectedIds.length} clips` : (ctxClip?.label || "Clip");

  // GSAP appear animation
  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(ref.current,
        { opacity: 0, scale: 0.94, y: -4 },
        { opacity: 1, scale: 1, y: 0, duration: 0.14, ease: "back.out(2)" }
      );
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    setTimeout(() => {
      document.addEventListener("mousedown", handler);
      document.addEventListener("keydown", escHandler);
    }, 0);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [onClose]);

  if (!ctxClip) return null;

  // Clamp position to viewport
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  const menuW = showCopyProps || showPasteProps ? 280 : 220;
  const menuH = 420;
  const left = Math.min(x, vpW - menuW - 8);
  const top = Math.min(y, vpH - menuH - 8);

  const close = () => onClose();

  const copyFull = () => {
    const clips = state.clips.filter((c) => selectedIds.includes(c.id));
    setClipboardClips(clips);
    close();
  };

  const pasteFull = () => {
    if (!clipboardClips.length) return;
    dispatch({ type: "PASTE_CLIPS", payload: { clips: clipboardClips, pasteTime: state.currentTime } });
    close();
  };

  const cut = () => {
    const clips = state.clips.filter((c) => selectedIds.includes(c.id));
    setClipboardClips(clips);
    if (multiSelected) dispatch({ type: "DELETE_CLIPS", payload: selectedIds });
    else dispatch({ type: "DELETE_CLIP", payload: clipId });
    close();
  };

  const duplicate = () => {
    selectedIds.forEach((id) => dispatch({ type: "DUPLICATE_CLIP", payload: id }));
    close();
  };

  const splitAtPlayhead = () => {
    selectedIds.forEach((id) => {
      const c = state.clips.find((cl) => cl.id === id);
      if (c && state.currentTime > c.startTime && state.currentTime < c.startTime + c.duration) {
        dispatch({ type: "SPLIT_CLIP", payload: { clipId: id, time: state.currentTime } });
      }
    });
    close();
  };

  const toggleLock = () => {
    selectedIds.forEach((id) => {
      const c = state.clips.find((cl) => cl.id === id);
      if (c) dispatch({ type: "UPDATE_CLIP", payload: { id, updates: { locked: !c.locked } } });
    });
    close();
  };

  const toggleMute = () => {
    selectedIds.forEach((id) => {
      const c = state.clips.find((cl) => cl.id === id);
      if (c) dispatch({ type: "UPDATE_CLIP", payload: { id, updates: { muted: !c.muted } } });
    });
    close();
  };

  const toggleHide = () => {
    selectedIds.forEach((id) => {
      const c = state.clips.find((cl) => cl.id === id);
      if (c) dispatch({ type: "UPDATE_CLIP", payload: { id, updates: { hidden: !c.hidden } } });
    });
    close();
  };

  const rippleDelete = () => {
    selectedIds.forEach((id) => dispatch({ type: "RIPPLE_DELETE", payload: id }));
    close();
  };

  const deleteClips = () => {
    if (multiSelected) dispatch({ type: "DELETE_CLIPS", payload: selectedIds });
    else dispatch({ type: "DELETE_CLIP", payload: clipId });
    close();
  };

  const doCopyProps = () => {
    const style = extractStyle(ctxClip);
    // Only keep checked keys
    const filtered: ClipStyle = {};
    for (const k of copyChecked) {
      (filtered as any)[k] = (style as any)[k];
    }
    setClipStyle(filtered);
    setShowCopyProps(false);
    close();
  };

  const doPasteProps = () => {
    if (!clipStyle) return;
    const keys = Array.from(pasteChecked).filter((k) => clipStyle[k] !== undefined);
    selectedIds.forEach((id) => {
      const base = state.clips.find((c) => c.id === id);
      if (!base) return;
      const patch = applyStyle(base, clipStyle, keys);
      dispatch({ type: "UPDATE_CLIP", payload: { id, updates: patch } });
    });
    setShowPasteProps(false);
    close();
  };

  const setColorLabel = (color: string) => {
    selectedIds.forEach((id) =>
      dispatch({ type: "UPDATE_CLIP", payload: { id, updates: { colorLabel: color === "none" ? undefined : color } as any } })
    );
    close();
  };

  return (
    <div
      ref={ref}
      className="fixed z-[9999] rounded-lg border border-border bg-popover shadow-2xl overflow-hidden origin-top-left"
      style={{ left, top, width: menuW, maxHeight: menuH, overflowY: "auto" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <div className="px-3 py-2 text-[11px] text-muted-foreground border-b border-border bg-muted/30 flex items-center gap-1.5">
        <span className="font-medium text-foreground truncate">{label}</span>
        <span className="text-muted-foreground/60">{ctxClip.mediaType}</span>
      </div>

      {/* ── Copy / Paste ─────────────────────────────────── */}
      <MenuItem icon={<Copy className="w-3.5 h-3.5" />} label="Copy" shortcut="Ctrl+C" onClick={copyFull} />

      {/* Copy Properties expandable */}
      <button
        className="w-full flex items-center gap-2 px-3 py-[7px] text-[13px] hover:bg-muted/70 transition-colors"
        onClick={() => { setShowCopyProps((s) => !s); setShowPasteProps(false); }}
      >
        <span className="w-4 h-4 flex items-center justify-center text-muted-foreground shrink-0">
          <Clipboard className="w-3.5 h-3.5" />
        </span>
        <span className="flex-1">Copy Properties…</span>
        <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${showCopyProps ? "rotate-90" : ""}`} />
      </button>
      {showCopyProps && (
        <div className="bg-muted/20 border-y border-border px-3 py-2 space-y-1">
          <p className="text-[10px] text-muted-foreground mb-1.5">Select properties to copy:</p>
          {STYLE_FIELDS.map(({ key, label: fl, icon }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer py-0.5">
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${copyChecked.has(key) ? "bg-primary border-primary" : "border-border"}`}
                onClick={() => {
                  const s = new Set(copyChecked);
                  if (s.has(key)) s.delete(key); else s.add(key);
                  setCopyChecked(s);
                }}
              >
                {copyChecked.has(key) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
              </div>
              <span className="text-[11px]">{icon} {fl}</span>
            </label>
          ))}
          <button
            className="mt-1.5 w-full bg-primary text-primary-foreground text-[11px] py-1.5 rounded hover:bg-primary/90"
            onClick={doCopyProps}
          >
            Copy {copyChecked.size} propert{copyChecked.size === 1 ? "y" : "ies"}
          </button>
        </div>
      )}

      <MenuItem
        icon={<ClipboardPaste className="w-3.5 h-3.5" />}
        label="Paste"
        shortcut="Ctrl+V"
        disabled={!clipboardClips.length}
        onClick={pasteFull}
      />

      {/* Paste Properties expandable */}
      <button
        className={`w-full flex items-center gap-2 px-3 py-[7px] text-[13px] transition-colors ${!clipStyle ? "opacity-40 pointer-events-none" : "hover:bg-muted/70"}`}
        onClick={() => { setShowPasteProps((s) => !s); setShowCopyProps(false); }}
        disabled={!clipStyle}
      >
        <span className="w-4 h-4 flex items-center justify-center text-muted-foreground shrink-0">
          <RefreshCw className="w-3.5 h-3.5" />
        </span>
        <span className="flex-1">Paste Properties…</span>
        <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${showPasteProps ? "rotate-90" : ""}`} />
      </button>
      {showPasteProps && clipStyle && (
        <div className="bg-muted/20 border-y border-border px-3 py-2 space-y-1">
          <p className="text-[10px] text-muted-foreground mb-1.5">Select properties to paste:</p>
          {STYLE_FIELDS.filter(({ key }) => clipStyle[key] !== undefined).map(({ key, label: fl, icon }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer py-0.5">
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${pasteChecked.has(key) ? "bg-primary border-primary" : "border-border"}`}
                onClick={() => {
                  const s = new Set(pasteChecked);
                  if (s.has(key)) s.delete(key); else s.add(key);
                  setPasteChecked(s);
                }}
              >
                {pasteChecked.has(key) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
              </div>
              <span className="text-[11px]">{icon} {fl}</span>
            </label>
          ))}
          <button
            className="mt-1.5 w-full bg-primary text-primary-foreground text-[11px] py-1.5 rounded hover:bg-primary/90 disabled:opacity-40"
            disabled={pasteChecked.size === 0}
            onClick={doPasteProps}
          >
            Paste {pasteChecked.size} propert{pasteChecked.size === 1 ? "y" : "ies"}
          </button>
        </div>
      )}

      <Sep />

      {/* ── Edit ─────────────────────────────────────────── */}
      <MenuItem icon={<Scissors className="w-3.5 h-3.5" />} label="Cut" shortcut="Ctrl+X" onClick={cut} />
      <MenuItem icon={<Copy className="w-3.5 h-3.5" />} label="Duplicate" shortcut="Ctrl+D" onClick={duplicate} />
      <MenuItem
        icon={<SplitSquareHorizontal className="w-3.5 h-3.5" />}
        label="Split at Playhead"
        shortcut="S"
        onClick={splitAtPlayhead}
      />

      <Sep />

      {/* ── Toggles ───────────────────────────────────────── */}
      <MenuItem
        icon={ctxClip.locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
        label={ctxClip.locked ? "Unlock" : "Lock"}
        onClick={toggleLock}
      />
      <MenuItem
        icon={ctxClip.muted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        label={ctxClip.muted ? "Unmute" : "Mute"}
        onClick={toggleMute}
      />
      <MenuItem
        icon={ctxClip.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        label={ctxClip.hidden ? "Show" : "Hide"}
        onClick={toggleHide}
      />

      <Sep />

      {/* ── Color Label ───────────────────────────────────── */}
      <button
        className="w-full flex items-center gap-2 px-3 py-[7px] text-[13px] hover:bg-muted/70 transition-colors"
        onClick={() => setShowColorLabel((s) => !s)}
      >
        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          <span className="w-3 h-3 rounded-full border border-border" style={{ background: COLOR_LABELS.find((c) => c.value === (ctxClip as any).colorLabel)?.hex ?? "transparent" }} />
        </span>
        <span className="flex-1">Color Label</span>
        <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${showColorLabel ? "rotate-90" : ""}`} />
      </button>
      {showColorLabel && (
        <div className="bg-muted/20 border-y border-border px-3 py-2">
          <div className="flex gap-1.5 flex-wrap">
            {COLOR_LABELS.map(({ value, hex, label: cl }) => (
              <button
                key={value}
                title={cl}
                onClick={() => setColorLabel(value)}
                className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
                style={{
                  background: value === "none" ? "transparent" : hex,
                  borderColor: (ctxClip as any).colorLabel === value ? "#fff" : "transparent",
                  boxShadow: value === "none" ? "inset 0 0 0 1px rgba(255,255,255,0.3)" : "none",
                }}
              />
            ))}
          </div>
        </div>
      )}

      <Sep />

      {/* ── Track ─────────────────────────────────────────── */}
      <MenuItem
        icon={<Layers className="w-3.5 h-3.5" />}
        label="Move to New Track"
        onClick={() => {
          dispatch({ type: "ADD_TRACK", payload: { name: "New Track" } });
          // Move clip to the new (highest) track after it's created
          const newTrackIndex = state.tracks.length;
          selectedIds.forEach((id) =>
            dispatch({ type: "UPDATE_CLIP", payload: { id, updates: { trackIndex: newTrackIndex } } })
          );
          close();
        }}
      />

      <Sep />

      {/* ── Delete ────────────────────────────────────────── */}
      <MenuItem
        icon={<Scissors className="w-3.5 h-3.5" />}
        label="Ripple Delete"
        shortcut="Shift+Del"
        danger
        onClick={rippleDelete}
      />
      <MenuItem
        icon={<Trash2 className="w-3.5 h-3.5" />}
        label={`Delete${multiSelected ? ` (${selectedIds.length})` : ""}`}
        shortcut="Del"
        danger
        onClick={deleteClips}
      />
    </div>
  );
}
