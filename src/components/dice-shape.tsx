import type * as React from "react"

import { cn } from "@/lib/utils"
import type { DieType } from "@/lib/dice"

interface ShapeDef {
  points?: string
  circle?: boolean
  /** vertical center of the label inside the viewBox */
  labelY: number
}

const SHAPES: Record<DieType, ShapeDef> = {
  d4: { points: "50,8 95,86 5,86", labelY: 66 },
  d6: { points: "16,16 84,16 84,84 16,84", labelY: 50 },
  d8: { points: "50,4 96,50 50,96 4,50", labelY: 51 },
  d10: { points: "50,3 89,38 50,97 11,38", labelY: 48 },
  d12: {
    points:
      "50,4 93.8,35.8 77.2,87.2 22.8,87.2 6.2,35.8",
    labelY: 55,
  },
  d20: {
    points:
      "50,3 90.7,26.5 90.7,73.5 50,97 9.3,73.5 9.3,26.5",
    labelY: 54,
  },
  d100: { circle: true, labelY: 51 },
}

const faFormat = new Intl.NumberFormat("fa-IR")

interface DieFaceProps {
  type: DieType
  value?: number | string
  className?: string
  style?: React.CSSProperties
}

/**
 * A D&D die drawn as an inline SVG silhouette (d4 triangle … d100 circle)
 * with an optional centered value that scales with the shape.
 * Color comes from currentColor / fill & stroke utility classes.
 */
export function DieFace({ type, value, className, style }: DieFaceProps) {
  const shape = SHAPES[type]
  const text =
    typeof value === "number"
      ? faFormat.format(value)
      : (value ?? "")

  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={text ? `${type}: ${text}` : type}
      className={cn("shrink-0", className)}
      style={style}
    >
      {shape.circle ? (
        <circle cx="50" cy="50" r="47" />
      ) : (
        <polygon points={shape.points} strokeLinejoin="round" strokeWidth="7" />
      )}
      {text !== "" && (
        <text
          x="50"
          y={shape.labelY}
          textAnchor="middle"
          dominantBaseline="central"
          className={cn(
            "font-bold tabular-nums",
            String(text).length >= 3 ? "text-[30px]" : "text-[34px]"
          )}
          style={{ fontFamily: "inherit" }}
        >
          {text}
        </text>
      )}
    </svg>
  )
}
