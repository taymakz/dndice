import { AnimatePresence, motion } from "motion/react"

import { DieFace } from "@/components/dice-shape"
import type { RolledDie } from "@/lib/dice"
import { hashString } from "@/lib/hash"

/* ------------------------------------------------------------------ */
/* Size tiers so any number of dice fits the screen                    */
/* ------------------------------------------------------------------ */

function rollChipSize(count: number): number {
  if (count <= 12) return 56
  if (count <= 18) return 44
  return 36
}

function rand(seed: number, salt: number): number {
  const h = hashString(`${seed}:${salt}`)
  return (h % 10000) / 10000
}

/* ------------------------------------------------------------------ */
/* 2D rolled-dice view (above the three.js limit or on GL failure)     */
/* ------------------------------------------------------------------ */

interface FallbackRollsProps {
  rolls: RolledDie[]
  revealed: boolean
}

export function FallbackRolls({ rolls, revealed }: FallbackRollsProps) {
  const size = rollChipSize(rolls.length)

  return (
    <div className="no-scrollbar flex h-full w-full flex-wrap items-center justify-center gap-2 overflow-y-auto p-2">
      {rolls.map((die) => {
        const seed = hashString(String(die.id))
        const highlight =
          die.value === Number(die.type.slice(1))
            ? "max"
            : die.value === 1
              ? "min"
              : null

        return (
          <div key={die.id} style={{ perspective: 600 }}>
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.4,
                rotateX: -540 - rand(seed, 1) * 360,
                rotateY: 360 + rand(seed, 2) * 360,
              }}
              animate={{ opacity: 1, scale: 1, rotateX: 0, rotateY: 0 }}
              transition={{ type: "spring", stiffness: 80, damping: 10 }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={revealed ? `v-${die.id}` : "hidden"}
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 24 }}
                >
                  <DieFace
                    type={die.type}
                    value={revealed ? die.value : "?"}
                    className={`${
                      highlight === "max"
                        ? "[&>*]:fill-red-500/25 [&>*]:stroke-red-600 dark:[&>*]:stroke-red-400"
                        : highlight === "min"
                          ? "[&>*]:fill-red-500/20 [&>*]:stroke-red-700 dark:[&>*]:stroke-red-300"
                          : "[&>*]:fill-red-500/15 [&>*]:stroke-red-600/80 dark:[&>*]:stroke-red-400/80"
                    } [&>text]:[paint-order:stroke] [&>text]:[stroke-width:4] [&>text]:stroke-white`}
                    style={{ width: size, height: size }}
                  />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Idle hint (empty pool)                                              */
/* ------------------------------------------------------------------ */

export function IdleHint() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center opacity-60">
      <div className="rounded-full border border-dashed p-5">
        <DieFace
          type="d20"
          className="size-16 [&>*]:fill-red-500/10 [&>*]:stroke-red-500/40"
        />
      </div>
      <div>
        <p className="text-sm font-bold">هنوز تاسی ریخته نشده</p>
        <p className="text-xs text-muted-foreground">
          از منوی تنظیمات تاس انتخاب کن و «تاس بریز»!
        </p>
      </div>
    </div>
  )
}
