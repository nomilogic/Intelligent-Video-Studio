import { EditorState, EditorAction, Clip } from './types';

export const initialState: EditorState = {
  clips: [
    {
      id: 'clip-1',
      label: 'Video 1',
      trackIndex: 0,
      startTime: 0,
      duration: 10,
      x: 0, y: 0, width: 1, height: 1,
      opacity: 1, rotation: 0, blendMode: 'normal',
      cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1,
      animationIn: 'none', animationOut: 'none',
      animationInDuration: 1, animationOutDuration: 1,
      volume: 1, color: '#3b82f6'
    },
    {
      id: 'clip-2',
      label: 'Video 2',
      trackIndex: 1,
      startTime: 5,
      duration: 8,
      x: 0, y: 0, width: 0.5, height: 0.5,
      opacity: 1, rotation: 0, blendMode: 'normal',
      cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1,
      animationIn: 'fade', animationOut: 'none',
      animationInDuration: 1, animationOutDuration: 1,
      volume: 1, color: '#8b5cf6'
    },
    {
      id: 'clip-3',
      label: 'Logo Overlay',
      trackIndex: 2,
      startTime: 2,
      duration: 6,
      x: 0.7, y: 0.05, width: 0.25, height: 0.15,
      opacity: 1, rotation: 0, blendMode: 'normal',
      cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1,
      animationIn: 'none', animationOut: 'none',
      animationInDuration: 1, animationOutDuration: 1,
      volume: 1, color: '#f59e0b'
    }
  ],
  transitions: [],
  keyframes: [],
  canvasWidth: 1920,
  canvasHeight: 1080,
  duration: 30,
  selectedClipId: null,
  currentTime: 0,
  isPlaying: false,
  tracks: ['Track 1', 'Track 2', 'Track 3']
};

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_TIME':
      return { ...state, currentTime: action.payload };
    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying };
    case 'SELECT_CLIP':
      return { ...state, selectedClipId: action.payload };
    case 'UPDATE_CLIP':
      return {
        ...state,
        clips: state.clips.map(c => c.id === action.payload.id ? { ...c, ...action.payload.updates } : c)
      };
    case 'ADD_CLIP':
      return { ...state, clips: [...state.clips, action.payload] };
    case 'DELETE_CLIP':
      return { 
        ...state, 
        clips: state.clips.filter(c => c.id !== action.payload),
        selectedClipId: state.selectedClipId === action.payload ? null : state.selectedClipId
      };
    case 'ADD_TRACK':
      return { ...state, tracks: [...state.tracks, `Track ${state.tracks.length + 1}`] };
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    case 'REPLACE_STATE':
      return { ...action.payload, isPlaying: false };
    case 'APPLY_OPERATIONS':
      let newState = { ...state };
      for (const op of action.payload) {
        if (!op || !op.type || !op.payload) continue;
        const p = op.payload;
        switch (op.type) {
          case 'addClip':
            newState.clips.push({
              id: `clip-${Date.now()}-${Math.random()}`,
              label: p.label || 'New Clip',
              trackIndex: p.trackIndex || 0,
              startTime: p.startTime || 0,
              duration: p.duration || 10,
              x: p.x || 0, y: p.y || 0, width: p.width || 1, height: p.height || 1,
              opacity: p.opacity ?? 1, rotation: p.rotation || 0, blendMode: p.blendMode || 'normal',
              cropX: p.cropX || 0, cropY: p.cropY || 0, cropWidth: p.cropWidth || 1, cropHeight: p.cropHeight || 1,
              animationIn: p.animationIn || 'none', animationOut: p.animationOut || 'none',
              animationInDuration: p.animationInDuration || 1, animationOutDuration: p.animationOutDuration || 1,
              volume: p.volume ?? 1, color: p.color || 'blue'
            });
            break;
          case 'moveClip':
            newState.clips = newState.clips.map(c => c.id === p.clipId ? { ...c, x: p.x ?? c.x, y: p.y ?? c.y, startTime: p.startTime ?? c.startTime } : c);
            break;
          case 'resizeClip':
            newState.clips = newState.clips.map(c => c.id === p.clipId ? { ...c, width: p.width ?? c.width, height: p.height ?? c.height } : c);
            break;
          case 'setOpacity':
            newState.clips = newState.clips.map(c => c.id === p.clipId ? { ...c, opacity: p.opacity ?? c.opacity } : c);
            break;
          case 'setRotation':
            newState.clips = newState.clips.map(c => c.id === p.clipId ? { ...c, rotation: p.rotation ?? c.rotation } : c);
            break;
          case 'deleteClip':
            newState.clips = newState.clips.filter(c => c.id !== p.clipId);
            if (newState.selectedClipId === p.clipId) newState.selectedClipId = null;
            break;
          case 'trimClip':
            newState.clips = newState.clips.map(c => c.id === p.clipId ? { ...c, duration: p.duration ?? c.duration } : c);
            break;
          case 'setAnimation':
            newState.clips = newState.clips.map(c => c.id === p.clipId ? { 
              ...c, 
              animationIn: p.animationIn ?? c.animationIn,
              animationOut: p.animationOut ?? c.animationOut,
              animationInDuration: p.animationInDuration ?? c.animationInDuration,
              animationOutDuration: p.animationOutDuration ?? c.animationOutDuration
            } : c);
            break;
          case 'cropClip':
            newState.clips = newState.clips.map(c => c.id === p.clipId ? {
              ...c,
              cropX: p.cropX ?? c.cropX,
              cropY: p.cropY ?? c.cropY,
              cropWidth: p.cropWidth ?? c.cropWidth,
              cropHeight: p.cropHeight ?? c.cropHeight
            } : c);
            break;
          case 'setBlendMode':
            newState.clips = newState.clips.map(c => c.id === p.clipId ? { ...c, blendMode: p.blendMode ?? c.blendMode } : c);
            break;
          case 'setVolume':
            newState.clips = newState.clips.map(c => c.id === p.clipId ? { ...c, volume: p.volume ?? c.volume } : c);
            break;
          case 'setKeyframe': {
            const existing = newState.keyframes.findIndex(k => k.clipId === p.clipId && k.time === p.time && k.property === p.property);
            if (existing >= 0) {
              newState.keyframes = newState.keyframes.map((k, i) => i === existing ? { ...k, value: p.value } : k);
            } else {
              newState.keyframes = [...newState.keyframes, {
                id: p.id || `kf-${Date.now()}`,
                clipId: p.clipId,
                time: p.time,
                property: p.property,
                value: p.value,
              }];
            }
            break;
          }
          case 'addTransition':
            newState.transitions = [...newState.transitions, {
              id: `tr-${Date.now()}`,
              fromClipId: p.fromClipId,
              toClipId: p.toClipId,
              type: p.type || 'fade',
              duration: p.duration || 1,
            }];
            break;
          case 'setCanvasSize':
            newState.canvasWidth = p.width ?? newState.canvasWidth;
            newState.canvasHeight = p.height ?? newState.canvasHeight;
            break;
          case 'setDuration':
            newState.duration = p.duration ?? newState.duration;
            break;
          case 'cutClip': {
            const idx = newState.clips.findIndex(c => c.id === p.clipId);
            if (idx >= 0) {
              const orig = newState.clips[idx];
              const cutAt = p.cutAt;
              if (cutAt > orig.startTime && cutAt < orig.startTime + orig.duration) {
                const first = { ...orig, duration: cutAt - orig.startTime };
                const second = { ...orig, id: `clip-${Date.now()}`, startTime: cutAt, duration: orig.startTime + orig.duration - cutAt };
                newState.clips = [...newState.clips.slice(0, idx), first, second, ...newState.clips.slice(idx + 1)];
              }
            }
            break;
          }
        }
      }
      return { ...newState };
    default:
      return state;
  }
}
