export interface Clip {
  id: string;
  label: string;
  trackIndex: number;
  startTime: number;
  duration: number;
  src?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  rotation: number;
  blendMode: string;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  animationIn: string;
  animationOut: string;
  animationInDuration: number;
  animationOutDuration: number;
  volume: number;
  color: string;
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
}

export interface EditorState {
  clips: Clip[];
  transitions: Transition[];
  keyframes: Keyframe[];
  canvasWidth: number;
  canvasHeight: number;
  duration: number;
  selectedClipId: string | null;
  currentTime: number;
  isPlaying: boolean;
  tracks: string[];
}

export type EditorAction =
  | { type: 'SET_TIME'; payload: number }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SELECT_CLIP'; payload: string | null }
  | { type: 'UPDATE_CLIP'; payload: { id: string; updates: Partial<Clip> } }
  | { type: 'ADD_CLIP'; payload: Clip }
  | { type: 'DELETE_CLIP'; payload: string }
  | { type: 'ADD_TRACK' }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'APPLY_OPERATIONS'; payload: any[] }
  | { type: 'REPLACE_STATE'; payload: EditorState };
