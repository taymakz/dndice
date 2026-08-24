import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { Dices } from "lucide-react"

import { AnimatedNumber } from "@/components/animated-number"
import { SettingsMenu } from "@/components/settings-drawer"
import { StageView } from "@/components/dice-stage-view"
import { Button } from "@/components/ui/button"
import { useResolvedTheme } from "@/hooks/use-resolved-theme"
import {
  buildFormula,
  DIE_TYPES,
  rollDie,
  type DieType,
  type RolledDie,
} from "@/lib/dice"

interface PoolItem {
  id: number
  type: DieType
}

const MAX_DICE = 20
const SPEED_STORAGE_KEY = "dnd-roll-speed"
const POOL_STORAGE_KEY = "dnd-pool"
const MODIFIER_STORAGE_KEY = "dnd-modifier"
const DEFAULT_SPEED_MS = 2000

function readStoredSpeed(): number {
  const value = Number(localStorage.getItem(SPEED_STORAGE_KEY))
  return Number.isFinite(value) && value >= 0 && value <= 6000
    ? value
    : DEFAULT_SPEED_MS
}

function readStoredPool(): PoolItem[] {
  try {
    const raw = localStorage.getItem(POOL_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const seenIds = new Set<number>()
    const items: PoolItem[] = []
    for (const entry of parsed) {
      const type = (entry as PoolItem)?.type
      const id = (entry as PoolItem)?.id
      if (
        typeof id === "number" &&
        Number.isFinite(id) &&
        !seenIds.has(id) &&
        typeof type === "string" &&
        (DIE_TYPES as readonly string[]).includes(type)
      ) {
        seenIds.add(id)
        items.push({ id, type: type as DieType })
      }
    }
    return items
  } catch {
    return []
  }
}

function readStoredModifier(): number {
  const value = Number(localStorage.getItem(MODIFIER_STORAGE_KEY))
  return Number.isFinite(value) && value >= -20 && value <= 30 ? Math.trunc(value) : 0
}

export default function App() {
  const [pool, setPool] = React.useState<PoolItem[]>(readStoredPool)
  const [rolls, setRolls] = React.useState<RolledDie[]>([])
  const [rolling, setRolling] = React.useState(false)
  const [revealed, setRevealed] = React.useState(true)
  const [modifier, setModifier] = React.useState(readStoredModifier)
  const [rollId, setRollId] = React.useState(0)
  const [speedMs, setSpeedMs] = React.useState(readStoredSpeed)
  const theme = useResolvedTheme()

  const changeSpeed = (ms: number) => {
    localStorage.setItem(SPEED_STORAGE_KEY, String(ms))
    setSpeedMs(ms)
  }

  const nextIdRef = React.useRef(
    Math.max(0, ...pool.map((item) => item.id)) + 1
  )
  const timersRef = React.useRef<number[]>([])

  React.useEffect(() => {
    localStorage.setItem(POOL_STORAGE_KEY, JSON.stringify(pool))
  }, [pool])

  React.useEffect(() => {
    localStorage.setItem(MODIFIER_STORAGE_KEY, String(modifier))
  }, [modifier])

  const clearTimers = () => {
    for (const timer of timersRef.current) window.clearTimeout(timer)
    timersRef.current = []
  }

  React.useEffect(() => clearTimers, [])

  const addToPool = (type: DieType) => {
    setPool((current) =>
      current.length >= MAX_DICE
        ? current
        : [...current, { id: nextIdRef.current++, type }]
    )
  }

  const removeFromPool = (id: number) => {
    setPool((current) => current.filter((item) => item.id !== id))
  }

  const removeAllOfType = (type: DieType) => {
    setPool((current) => current.filter((item) => item.type !== type))
  }

  const roll = () => {
    if (pool.length === 0 || rolling) return

    clearTimers()
    setRolling(true)
    setRevealed(false)
    setRollId((id) => id + 1)
    setRolls(
      pool.map((item) => ({
        id: item.id,
        type: item.type,
        value: rollDie(item.type),
      }))
    )
    navigator.vibrate?.(25)

    // Keep the button state in sync with the dice tumble + straighten-up.
    // "صفر" speed resolves almost instantly.
    timersRef.current.push(
      window.setTimeout(() => setRevealed(true), Math.max(speedMs * 0.72, 16)),
      window.setTimeout(
        () => setRolling(false),
        speedMs === 0 ? 30 : speedMs + 450
      )
    )
  }

  const reset = () => {
    clearTimers()
    setPool([])
    setRolls([])
    setRolling(false)
    setRevealed(true)
  }

  const sum = rolls.reduce((total, die) => total + die.value, 0) + modifier
  const formula = rolls.length
    ? buildFormula(
        rolls.map((die) => die.type),
        modifier
      )
    : null

  return (
    <div className="relative mx-auto flex h-dvh max-w-md flex-col overflow-hidden px-3 pt-[max(env(safe-area-inset-top),0.5rem)] pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:px-4">
      {/* Shapes stage */}
      <section className="relative min-h-0 flex-1">
        <StageView
          rolls={rolls}
          poolTypes={pool.map((item) => item.type)}
          revealed={revealed}
          theme={theme}
          runId={rollId}
          duration={speedMs / 1000}
        />

        <AnimatePresence>
          {rolls.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center"
            >
              <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-1.5 text-center shadow-sm backdrop-blur">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    مجموع
                  </span>
                  <AnimatedNumber
                    value={sum}
                    className="text-xl leading-tight font-black tabular-nums"
                  />
                </div>
                <AnimatePresence>
                  {formula && (
                    <motion.code
                      dir="ltr"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="block text-[10px] font-semibold text-muted-foreground"
                    >
                      {formula}
                    </motion.code>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Actions */}
      <div className="mt-2 grid shrink-0 grid-cols-[1fr_auto] gap-2">
        <Button
          className="h-14 rounded-2xl text-lg font-black shadow-lg shadow-primary/25"
          disabled={rolling || pool.length === 0}
          onClick={roll}
        >
          <motion.span
            animate={rolling ? { rotate: 360 } : { rotate: 0 }}
            transition={
              rolling
                ? { repeat: Infinity, duration: 0.7, ease: "linear" }
                : { duration: 0.3 }
            }
            className="grid"
          >
            <Dices className="size-5" />
          </motion.span>
          {rolling ? "در حال چرخش…" : "تاس بریز"}
        </Button>
        <SettingsMenu
          pool={pool}
          onAdd={addToPool}
          onRemove={removeFromPool}
          onRemoveType={removeAllOfType}
          onReset={reset}
          modifier={modifier}
          onModifierChange={setModifier}
          speedMs={speedMs}
          onSpeedChange={changeSpeed}
        />
      </div>
    </div>
  )
}
