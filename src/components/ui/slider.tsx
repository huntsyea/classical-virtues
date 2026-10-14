"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
  /**
   * Human-readable value for screen readers (e.g. "1:05 of 3:30").
   * Applied to the focusable thumb, where assistive tech reads it.
   */
  "aria-valuetext"?: string
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(
  (
    {
      className,
      "aria-label": ariaLabel,
      "aria-valuetext": ariaValueText,
      ...props
    },
    ref
  ) => (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "group/slider relative flex w-full touch-none select-none items-center py-3 data-[disabled]:opacity-60",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-[3px] w-full grow overflow-hidden bg-[var(--input)]">
        <SliderPrimitive.Range className="absolute h-full bg-foreground" />
      </SliderPrimitive.Track>
      {/* 14px visible thumb; the ::before pseudo-element extends the hit area to 44px */}
      <SliderPrimitive.Thumb
        aria-label={ariaLabel}
        aria-valuetext={ariaValueText}
        className="relative block h-3.5 w-3.5 rounded-full bg-foreground transition-transform before:absolute before:-inset-[15px] before:content-[''] hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[disabled]:pointer-events-none"
      />
    </SliderPrimitive.Root>
  )
)
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
