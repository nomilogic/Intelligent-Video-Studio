import type { DrawBrush } from "./types";

export interface DrawBrushPreset {
  kind: DrawBrush["kind"];
  name: string;
  width: number;
  opacity: number;
}

export const DRAW_BRUSHES: DrawBrushPreset[] = [
  { kind: "marker", name: "Marker", width: 6, opacity: 1 },
  { kind: "pencil", name: "Pencil", width: 3, opacity: 0.9 },
  { kind: "highlighter", name: "Highlighter", width: 24, opacity: 0.4 },
  { kind: "neon", name: "Neon", width: 8, opacity: 1 },
];
