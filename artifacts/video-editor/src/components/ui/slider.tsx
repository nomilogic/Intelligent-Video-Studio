import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
  /**
   * Values where the thumb snaps. In addition to any listed here, the
   * slider auto-snaps to 0 whenever 0 falls within [min, max].
   *
   * Example: opacity slider → `snapPoints={[1]}`
   *          brightness slider → `snapPoints={[100]}`
   */
  snapPoints?: number[]
  /**
   * Half-width of the snap zone, in the same units as min/max/value.
   * Defaults to step * 3 (three steps on either side of the snap point).
   */
  snapRadius?: number
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(
  (
    {
      className,
      step = 1,
      min = 0,
      max = 100,
      value,
      defaultValue,
      onValueChange,
      snapPoints,
      snapRadius,
      ...props
    },
    ref,
  ) => {
    const effectiveStep = step as number
    const radius = snapRadius ?? effectiveStep * 3

    // Build the full list of snap targets: caller-supplied + auto-zero.
    const allSnaps = React.useMemo<number[]>(() => {
      const pts: number[] = [...(snapPoints ?? [])]
      const lo = Number(min)
      const hi = Number(max)
      if (lo <= 0 && 0 <= hi && !pts.includes(0)) pts.push(0)
      return pts
    }, [snapPoints, min, max])

    const applySnap = React.useCallback(
      (v: number): number => {
        for (const pt of allSnaps) {
          if (Math.abs(v - pt) <= radius) return pt
        }
        return v
      },
      [allSnaps, radius],
    )

    const handleChange = React.useCallback(
      (vals: number[]) => {
        if (!onValueChange) return
        onValueChange(vals.map(applySnap))
      },
      [onValueChange, applySnap],
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

        {/* Tick marks at every snap point */}
        {allSnaps.map((pt) => {
          const lo = Number(min)
          const hi = Number(max)
          if (pt < lo || pt > hi) return null
          const pct = ((pt - lo) / (hi - lo)) * 100
          return (
            <span
              key={pt}
              aria-hidden="true"
              className="absolute h-2 w-px bg-primary/40 pointer-events-none"
              style={{ left: `calc(${pct}% - 0.5px)` }}
            />
          )
        })}

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
