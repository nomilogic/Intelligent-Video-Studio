export type MediaType = "video" | "audio" | "image" | "text" | "blank";

export type EasingType =
  | "step"
  | "linear"
  | "quadIn" | "quadOut" | "quadInOut"
  | "cubicIn" | "cubicOut" | "cubicInOut"
  | "quartIn" | "quartOut" | "quartInOut"
  | "quintIn" | "quintOut" | "quintInOut"
  | "sineIn" | "sineOut" | "sineInOut"
  | "expoIn" | "expoOut" | "expoInOut"
  | "circIn" | "circOut" | "circInOut"
  | "backIn" | "backOut" | "backInOut"
  | "elasticIn" | "elasticOut" | "elasticInOut"
  | "bounceIn" | "bounceOut" | "bounceInOut"
  | "ease" | "easeIn" | "easeOut" | "easeInOut";

export interface ClipFilters {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
  grayscale: number;
  sepia: number;
  invert: number;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  background: string;
  align: "left" | "center" | "right";
  shadow: boolean;
  italic: boolean;
  underline: boolean;
}

export type EffectType =
  | "vignette"
  | "glow"
  | "shake"
  | "scanlines"
  | "tint"
  | "blurMore";

export interface Effect {
  id: string;
  type: EffectType;
  intensity: number; // 0..1
  color?: string;    // used by tint / glow
}

export type TransitionType =
  | "none"
  | "fade"
  | "slideLeft"
  | "slideRight"
  | "slideUp"
  | "slideDown"
  | "zoom"
  | "blur"
  | "wipeLeft";

export interface ClipTransition {
  type: TransitionType;
  duration: number;
}

export type MaskMode = "luminance" | "alpha";

export interface ClipMask {
  src: string;          // image URL (data: URLs supported)
  mode: MaskMode;       // luminance = use grayscale (B/W gradients), alpha = use transparency
  invert: boolean;      // invert mask values
  fit: "stretch" | "contain" | "cover";
  scale: number;        // 0.1..3 (multiplier on top of fit)
  offsetX: number;      // -1..1 (fraction of clip width)
  offsetY: number;      // -1..1 (fraction of clip height)
  opacity: number;      // 0..1 — blends mask result with full opacity
}

export interface Clip {
  id: string;
  label: string;
  mediaType: MediaType;
  trackIndex: number;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  src?: string;
  thumbnail?: string;
  text?: string;
  textStyle?: TextStyle;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  rotation: number;
  scale: number;
  flipH: boolean;
  flipV: boolean;
  blendMode: string;
  borderRadius: number;
  preserveRatio: boolean;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  filters: ClipFilters;
  speed: number;
  animationIn: string;
  animationOut: string;
  animationInDuration: number;
  animationOutDuration: number;
  volume: number;
  muted: boolean;
  locked: boolean;
  hidden: boolean;
  color: string;
  // CapCut-style additions (optional for backward compatibility with older state)
  effects?: Effect[];
  transitionIn?: ClipTransition;
  mask?: ClipMask;
  // Text-only: when true (default), font scales with the clip box (current behavior).
  // When false, font stays at a fixed size relative to the canvas — only the box scales.
  textAutoScale?: boolean;
}

export interface Transition {
  id: string;
  fromClipId: string;
  toClipId: string;
  type: string;
  duration: number;
}

export interface Keyframe {
  id: string;
  clipId: string;
  time: number;
  property: string;
  value: number;
  easing: EasingType;
}

export interface Track {
  id: string;
  name: string;
  type: "video" | "audio" | "overlay";
  muted: boolean;
  hidden: boolean;
  locked: boolean;
}

export interface MediaAsset {
  id: string;
  name: string;
  src: string;
  mediaType: MediaType;
  duration?: number;
  thumbnail?: string;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

export type ToolMode = "select" | "blade";

export interface Marker {
  id: string;
  time: number;
  label?: string;
  color?: string;
}

export interface EditorState {
  clips: Clip[];
  transitions: Transition[];
  keyframes: Keyframe[];
  tracks: Track[];
  assets: MediaAsset[];
  markers: Marker[];
  canvasWidth: number;
  canvasHeight: number;
  duration: number;
  selectedClipIds: string[];
  currentTime: number;
  isPlaying: boolean;
  zoom: number;
  snapEnabled: boolean;
  tool: ToolMode;
  aiHistory: AIMessage[];
  background: string;
}

export interface HistoryEntry {
  past: EditorState[];
  future: EditorState[];
}

export type EditorAction =
  | { type: "SET_TIME"; payload: number }
  | { type: "TOGGLE_PLAY" }
  | { type: "SET_PLAYING"; payload: boolean }
  | { type: "SELECT_CLIP"; payload: string | null }
  | { type: "SELECT_CLIPS"; payload: string[] }
  | { type: "TOGGLE_CLIP_SELECTION"; payload: string }
  | { type: "UPDATE_CLIP"; payload: { id: string; updates: Partial<Clip> } }
  | { type: "UPDATE_CLIPS"; payload: { ids: string[]; updates: Partial<Clip> } }
  | { type: "ADD_CLIP"; payload: Clip }
  | { type: "DELETE_CLIP"; payload: string }
  | { type: "DELETE_CLIPS"; payload: string[] }
  | { type: "DUPLICATE_CLIP"; payload: string }
  | { type: "SPLIT_CLIP"; payload: { clipId: string; time: number } }
  | { type: "SPLIT_AT_PLAYHEAD" }
  | { type: "ADD_TRACK"; payload?: { type?: Track["type"]; name?: string } }
  | { type: "DELETE_TRACK"; payload: string }
  | { type: "UPDATE_TRACK"; payload: { id: string; updates: Partial<Track> } }
  | { type: "SET_DURATION"; payload: number }
  | { type: "SET_CANVAS_SIZE"; payload: { width: number; height: number } }
  | { type: "SET_ZOOM"; payload: number }
  | { type: "TOGGLE_SNAP" }
  | { type: "SET_BACKGROUND"; payload: string }
  | { type: "ADD_KEYFRAME"; payload: Omit<Keyframe, "id"> & { id?: string } }
  | { type: "UPDATE_KEYFRAME"; payload: { id: string; time?: number; value?: number; easing?: EasingType } }
  | { type: "DELETE_KEYFRAME"; payload: string }
  | { type: "DELETE_KEYFRAMES_AT"; payload: { clipId: string; time: number } }
  | { type: "ADD_TRANSITION"; payload: Omit<Transition, "id"> & { id?: string } }
  | { type: "DELETE_TRANSITION"; payload: string }
  | { type: "ADD_ASSET"; payload: MediaAsset }
  | { type: "REMOVE_ASSET"; payload: string }
  | { type: "ADD_AI_MESSAGE"; payload: AIMessage }
  | { type: "SET_TOOL"; payload: ToolMode }
  | { type: "ADD_MARKER"; payload: { time: number; label?: string; color?: string } }
  | { type: "DELETE_MARKER"; payload: string }
  | { type: "CLEAR_MARKERS" }
  | { type: "SPLIT_INTO_PARTS"; payload: { clipId: string; parts: number } }
  | { type: "SPLIT_EVERY"; payload: { clipId: string; seconds: number } }
  | { type: "RIPPLE_DELETE"; payload: string }
  | { type: "APPLY_OPERATIONS"; payload: any[] }
  | { type: "REPLACE_STATE"; payload: EditorState }
  | { type: "APPLY_TEMPLATE"; payload: { templateKey: string } }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RESET" };

export const DEFAULT_FILTERS: ClipFilters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0,
};

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 64,
  fontWeight: 700,
  color: "#ffffff",
  background: "transparent",
  align: "center",
  shadow: true,
  italic: false,
  underline: false,
};
