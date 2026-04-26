import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

/**
 * Slider with built-in snapping behaviour.
 *
 * Default behaviour (when caller passes no `step`):
 *   - first stop is exactly `min` (which is usually 0),
 *   - subsequent stops increment by 2 up to `max`.
 *   This matches the project-wide UX: "snap to 0 then continuous +2 to max".
 *
 * Callers can opt out by setting `step` explicitly (eg. `step={0.01}` for
 * fractional 0..1 sliders like opacity), in which case the native Radix
 * stepping is used unchanged.
 */
type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
  /**
   * When true (default), snap values to {min, min+2, min+4, ... ≤ max} unless
   * the caller has set `step` explicitly. Pass `false` to fully opt out.
   */
  snapToTwos?: boolean
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(
  (
    {
      className,
      step,
      snapToTwos = true,
      min = 0,
      max = 100,
      value,
      defaultValue,
      onValueChange,
      ...props
    },
    ref,
  ) => {
    const stepProvided = typeof step === "number"
    const useSnap = snapToTwos && !stepProvided
    const effectiveStep = stepProvided ? (step as number) : useSnap ? 2 : 1

    // Snap helper: project a raw value onto {min, min+2, min+4, ...} ∩ [min,max].
    const snap = React.useCallback(
      (v: number): number => {
        if (!useSnap) return v
        const lo = Number(min)
        const hi = Number(max)
        const offset = v - lo
        const snapped = lo + Math.round(offset / 2) * 2
        if (snapped < lo) return lo
        if (snapped > hi) return hi
        return snapped
      },
      [useSnap, min, max],
    )

    const handleChange = React.useCallback(
      (vals: number[]) => {
        if (!onValueChange) return
        if (!useSnap) return onValueChange(vals)
        onValueChange(vals.map(snap))
      },
      [onValueChange, useSnap, snap],
    )

    return (
      <SliderPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          className,
        )}
        min={min}
        max={max}
        step={effectiveStep}
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleChange}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        {/* Render one thumb per value so the component supports range sliders too. */}
        {(value ?? defaultValue ?? [0]).map((_, i) => (
          <SliderPrimitive.Thumb
            key={i}
            className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Root>
    )
  },
)
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
