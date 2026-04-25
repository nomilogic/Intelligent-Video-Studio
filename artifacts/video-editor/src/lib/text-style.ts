import type { CSSProperties } from "react";
import type {
  TextStyle,
  TextGradient,
  TextStroke,
  TextGlow,
  TextShadow,
  TextBackground,
} from "./types";

/**
 * Build CSS for the gradient fill applied to text via background-clip:text.
 * Returns null if gradient is disabled.
 */
export function gradientFillStyle(g: TextGradient | undefined): CSSProperties | null {
  if (!g || !g.enabled) return null;
  return {
    backgroundImage: `linear-gradient(${g.angle}deg, ${g.color1}, ${g.color2})`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
  };
}

/**
 * Compose the text-shadow CSS from glow + drop shadow + legacy shadow flag.
 * Glow stacks N shadows of the same color at increasing radii to mimic neon.
 */
export function composeTextShadow(
  glow: TextGlow | undefined,
  shadow: TextShadow | undefined,
  legacyShadow: boolean,
): string {
  const layers: string[] = [];
  if (glow && glow.enabled) {
    const intensity = Math.max(1, Math.min(6, Math.round(glow.intensity || 3)));
    const baseBlur = Math.max(2, glow.blur || 8);
    for (let i = 1; i <= intensity; i++) {
      const blur = baseBlur * i;
      layers.push(`0 0 ${blur.toFixed(1)}px ${glow.color}`);
    }
  }
  if (shadow && shadow.enabled) {
    layers.push(
      `${shadow.offsetX || 0}px ${shadow.offsetY || 0}px ${shadow.blur || 0}px ${shadow.color}`,
    );
  }
  // Legacy: if shadow flag is on but no custom shadow defined, use a soft drop.
  if (legacyShadow && !(shadow && shadow.enabled) && !(glow && glow.enabled)) {
    layers.push("0 2px 12px rgba(0,0,0,0.6)", "0 0 4px rgba(0,0,0,0.4)");
  }
  return layers.join(", ") || "none";
}

/**
 * Build the inline style for the text container (background panel) that wraps
 * the rendered text — supports solid colors, gradient fills, border, padding,
 * and rounded corners via the new TextBackground subobject. Falls back to the
 * legacy `background` string if `bg` is not configured.
 */
export function textContainerStyle(ts: TextStyle): CSSProperties {
  const bg: TextBackground | undefined = ts.bg;
  if (!bg) {
    return {
      background: ts.background === "transparent" ? "transparent" : ts.background,
    };
  }
  let backgroundCss: string;
  if (bg.gradient && bg.gradient.enabled) {
    backgroundCss = `linear-gradient(${bg.gradient.angle}deg, ${bg.gradient.color1}, ${bg.gradient.color2})`;
  } else if (bg.color === "transparent") {
    backgroundCss = "transparent";
  } else {
    backgroundCss = bg.color;
  }
  return {
    background: backgroundCss,
    border: bg.borderWidth > 0 ? `${bg.borderWidth}px solid ${bg.borderColor}` : undefined,
    borderRadius: bg.borderRadius || 0,
    padding: bg.padding || 0,
    boxSizing: "border-box",
  };
}

/**
 * Build the inline style for the text element itself — font, color, gradient
 * fill, stroke, glow, shadow, spacing.
 */
export function textElementStyle(
  ts: TextStyle,
  fontSizeStyle: string | number,
): CSSProperties {
  const stroke: TextStroke | undefined = ts.stroke;
  const grad = gradientFillStyle(ts.gradient);
  const base: CSSProperties = {
    fontFamily: ts.fontFamily,
    fontSize: fontSizeStyle as any,
    fontWeight: ts.fontWeight,
    color: ts.color,
    textAlign: ts.align,
    fontStyle: ts.italic ? "italic" : "normal",
    textDecoration: ts.underline ? "underline" : "none",
    textShadow: composeTextShadow(ts.glow, ts.textShadow, ts.shadow),
    lineHeight: ts.lineHeight ?? 1.1,
    letterSpacing: ts.letterSpacing != null ? `${ts.letterSpacing}px` : undefined,
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  };
  if (stroke && stroke.enabled && stroke.width > 0) {
    (base as any).WebkitTextStroke = `${stroke.width}px ${stroke.color}`;
    (base as any).paintOrder = "stroke fill";
  }
  return { ...base, ...(grad || {}) };
}
