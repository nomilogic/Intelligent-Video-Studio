/**
 * Catalog of all 50 transitions available between adjacent clips. Each entry
 * has:
 *
 *   - `type` — the TransitionType discriminant stored on
 *     `clip.transitionIn.type`.
 *   - `label` — name shown in the picker.
 *   - `category` — visual grouping in the UI.
 *
 * Renderers live in `lib/animation.ts` (`getTransitionMod`) and are mirrored
 * in `hooks/use-export.ts` via the same TransitionMod struct. This file is
 * UI-only — adding a new entry here without a render branch will simply
 * leave the transition as a no-op at preview/export time.
 */

import type { TransitionType } from "./types";

export type TransitionCategory =
  | "Basic"
  | "Slide"
  | "Push"
  | "Wipe"
  | "Iris"
  | "Zoom"
  | "Spin"
  | "Blur"
  | "Flash"
  | "Glitch"
  | "Cinematic";

export interface TransitionDef {
  type: TransitionType;
  label: string;
  category: TransitionCategory;
}

export const TRANSITION_LIBRARY: TransitionDef[] = [
  // ── Basic (3) ─────────────────────────────────────────────────────────
  { type: "none", label: "None", category: "Basic" },
  { type: "fade", label: "Fade", category: "Basic" },
  { type: "shakeCut", label: "Shake Cut", category: "Basic" },

  // ── Slide (8) ─────────────────────────────────────────────────────────
  { type: "slideLeft",       label: "Slide ←",     category: "Slide" },
  { type: "slideRight",      label: "Slide →",     category: "Slide" },
  { type: "slideUp",         label: "Slide ↑",     category: "Slide" },
  { type: "slideDown",       label: "Slide ↓",     category: "Slide" },
  { type: "slideUpLeft",     label: "Slide ↖",     category: "Slide" },
  { type: "slideUpRight",    label: "Slide ↗",     category: "Slide" },
  { type: "slideDownLeft",   label: "Slide ↙",     category: "Slide" },
  { type: "slideDownRight",  label: "Slide ↘",     category: "Slide" },

  // ── Push (4) ──────────────────────────────────────────────────────────
  { type: "pushLeft",  label: "Push ←", category: "Push" },
  { type: "pushRight", label: "Push →", category: "Push" },
  { type: "pushUp",    label: "Push ↑", category: "Push" },
  { type: "pushDown",  label: "Push ↓", category: "Push" },

  // ── Wipe (8) ──────────────────────────────────────────────────────────
  { type: "wipeLeft",         label: "Wipe ←",       category: "Wipe" },
  { type: "wipeRight",        label: "Wipe →",       category: "Wipe" },
  { type: "wipeUp",           label: "Wipe ↑",       category: "Wipe" },
  { type: "wipeDown",         label: "Wipe ↓",       category: "Wipe" },
  { type: "wipeDiagonalDown", label: "Wipe Diag ↘",  category: "Wipe" },
  { type: "wipeDiagonalUp",   label: "Wipe Diag ↗",  category: "Wipe" },
  { type: "barnDoorH",        label: "Barn Door ↔",  category: "Wipe" },
  { type: "barnDoorV",        label: "Barn Door ↕",  category: "Wipe" },

  // ── Iris (4) ──────────────────────────────────────────────────────────
  { type: "irisIn",   label: "Iris In",    category: "Iris" },
  { type: "irisOut",  label: "Iris Out",   category: "Iris" },
  { type: "circleIn", label: "Circle In",  category: "Iris" },
  { type: "circleOut",label: "Circle Out", category: "Iris" },

  // ── Zoom (4) ──────────────────────────────────────────────────────────
  { type: "zoom",      label: "Zoom",       category: "Zoom" },
  { type: "zoomIn",    label: "Zoom In",    category: "Zoom" },
  { type: "zoomOut",   label: "Zoom Out",   category: "Zoom" },
  { type: "zoomBlur",  label: "Zoom Blur",  category: "Zoom" },

  // ── Spin (3) ──────────────────────────────────────────────────────────
  { type: "spin",        label: "Spin",         category: "Spin" },
  { type: "spinReverse", label: "Spin Reverse", category: "Spin" },
  { type: "spinZoom",    label: "Spin + Zoom",  category: "Spin" },

  // ── Blur (3) ──────────────────────────────────────────────────────────
  { type: "blur",       label: "Blur",       category: "Blur" },
  { type: "blurHeavy",  label: "Blur Heavy", category: "Blur" },
  { type: "blurSlide",  label: "Blur Slide", category: "Blur" },

  // ── Flash (5) ─────────────────────────────────────────────────────────
  { type: "fadeBlack",  label: "Fade to Black", category: "Flash" },
  { type: "fadeWhite",  label: "Fade to White", category: "Flash" },
  { type: "fadeColor",  label: "Fade Color",    category: "Flash" },
  { type: "flash",      label: "Flash",         category: "Flash" },
  { type: "flashColor", label: "Flash Color",   category: "Flash" },

  // ── Glitch / TV (3) ───────────────────────────────────────────────────
  { type: "tvOff",      label: "TV Off",     category: "Glitch" },
  { type: "tvOn",       label: "TV On",      category: "Glitch" },
  { type: "glitchCut",  label: "Glitch Cut", category: "Glitch" },

  // ── Cinematic (5) ─────────────────────────────────────────────────────
  { type: "splitH",       label: "Split ↔",   category: "Cinematic" },
  { type: "splitV",       label: "Split ↕",   category: "Cinematic" },
  { type: "checkerboard", label: "Checker",   category: "Cinematic" },
  { type: "pixelDissolve",label: "Pixel Dissolve", category: "Cinematic" },
  { type: "ripple",       label: "Ripple",    category: "Cinematic" },
  { type: "swirl",        label: "Swirl",     category: "Cinematic" },
  { type: "filmBurn",     label: "Film Burn", category: "Cinematic" },
  { type: "lightLeak",    label: "Light Leak",category: "Cinematic" },
  { type: "morph",        label: "Morph",     category: "Cinematic" },
  { type: "dropDown",     label: "Drop Down", category: "Cinematic" },
  { type: "popUp",        label: "Pop Up",    category: "Cinematic" },
  { type: "swing",        label: "Swing",     category: "Cinematic" },
  { type: "elastic",      label: "Elastic",   category: "Cinematic" },
];

export const TRANSITION_CATEGORIES: TransitionCategory[] = [
  "Basic", "Slide", "Push", "Wipe", "Iris", "Zoom",
  "Spin", "Blur", "Flash", "Glitch", "Cinematic",
];

export function getTransitionDef(type: TransitionType): TransitionDef | undefined {
  return TRANSITION_LIBRARY.find((t) => t.type === type);
}
