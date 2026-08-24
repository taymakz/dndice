import * as React from "react"

import { FallbackRolls, IdleHint } from "@/components/dice-fallback"
import { DiceStage } from "@/components/dice-scene"
import {
  expandRolls,
  THREE_DICE_LIMIT,
  type StageEntry,
} from "@/lib/dice"
import type { DieType, RolledDie } from "@/lib/dice"

interface StageErrorBoundaryProps {
  fallback: React.ReactNode
  children: React.ReactNode
}

class StageErrorBoundary extends React.Component<
  StageErrorBoundaryProps,
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.warn("3D stage unavailable, using 2D fallback:", error)
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

/** Static entries representing the not-yet-rolled pool. */
function staticEntriesFromPool(types: DieType[]): StageEntry[] {
  return types.map((type, i) => ({
    key: `pool-${i}-${type}`,
    variant: type === "d100" ? ("tens" as const) : ("std" as const),
    type,
    label: "",
    highlight: null,
  }))
}

interface StageViewProps {
  rolls: RolledDie[]
  poolTypes: DieType[]
  revealed: boolean
  theme: "dark" | "light"
  runId: number
  /** Tumble duration in seconds (default 2s). */
  duration?: number
}

/**
 * Picks the right renderer:
 * - idle + empty pool   → hint
 * - idle + pool         → static three.js shapes in a fit-to-screen grid
 * - rolled, small count → three.js tumble animation
 * - rolled, large count → lightweight animated 2D shapes
 */
export function StageView({
  rolls,
  poolTypes,
  revealed,
  theme,
  runId,
  duration = 2,
}: StageViewProps) {
  const entries = React.useMemo(() => expandRolls(rolls), [rolls])
  const staticEntries = React.useMemo(
    () => staticEntriesFromPool(poolTypes),
    [poolTypes]
  )

  if (rolls.length === 0) {
    if (staticEntries.length === 0) return <IdleHint />
    return (
      <DiceStage
        entries={staticEntries}
        revealed={false}
        theme={theme}
        mode="static"
        runId={runId}
      />
    )
  }

  const twoD = <FallbackRolls rolls={rolls} revealed={revealed} />

  if (entries.length > THREE_DICE_LIMIT) {
    return twoD
  }

  return (
    <StageErrorBoundary fallback={twoD}>
      <DiceStage
        entries={entries}
        revealed={revealed}
        theme={theme}
        mode="roll"
        runId={runId}
        duration={duration}
      />
    </StageErrorBoundary>
  )
}
